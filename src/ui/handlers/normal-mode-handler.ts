import { ChatMessage, ChatSession, ResolvedSkill } from '../../types';
import { INormalModeHandler } from '../types/chat-view-interfaces';
import ObsidianLLMSider from '../../main';
import { I18nManager } from '../../i18n/i18n-manager';
import { Logger } from '../../utils/logger';
import { conversationLogger } from '../../utils/conversation-logger';
import { StreamManager } from '../../core/stream-manager';
import { MessageManager } from '../message-manager';
import { MessageRenderer } from '../message-renderer';
import { ContextManager } from '../../core/context-manager';
import { AgentFactory } from '../../core/agent/agent-factory';
import { NormalModeAgent } from '../../core/agent/normal-mode-agent';
import { MemoryManager } from '../../core/agent/memory-manager';

/**
 * Handler for Normal conversation mode
 * Uses Mastra NormalModeAgent for AI interactions
 */
export class NormalModeHandler implements INormalModeHandler {
	private plugin: ObsidianLLMSider;
	private i18n: I18nManager;
	private streamManager: StreamManager;
	private messageManager: MessageManager;
	private messageRenderer: MessageRenderer;
	private contextManager: ContextManager;
	
	// Agent state
	private normalModeAgent: NormalModeAgent | null = null;
	private sharedMemoryManager: MemoryManager | null = null;
	private agentProvider: string | null = null;
	private agentModel: string | null = null;
	
	// UI elements
	private messageContainer: HTMLElement;
	
	constructor(
		plugin: ObsidianLLMSider,
		i18n: I18nManager,
		streamManager: StreamManager,
		messageManager: MessageManager,
		messageRenderer: MessageRenderer,
		contextManager: ContextManager,
		messageContainer: HTMLElement
	) {
		this.plugin = plugin;
		this.i18n = i18n;
		this.streamManager = streamManager;
		this.messageManager = messageManager;
		this.messageRenderer = messageRenderer;
		this.contextManager = contextManager;
		this.messageContainer = messageContainer;
	}

	/**
	 * Execute Normal mode conversation
	 */
	async execute(params: {
		userMessage: ChatMessage;
		currentSession: ChatSession;
		provider: any; // BaseProvider interface
		stepIndicatorsEl: HTMLElement | null;
		memoryContext: string;
		memoryMessages: ChatMessage[];
		memoryEnabled: boolean;
		updateStepIndicator: (el: HTMLElement, step: string, status: string) => void;
		prepareMessages: (
			userMessage: ChatMessage,
			stepIndicatorsEl: HTMLElement | null,
			memoryContext: string,
			memoryMessages: ChatMessage[],
			memoryEnabled: boolean,
			routedSkill?: ResolvedSkill | null
		) => Promise<any[]>;
		autoGenerateSessionTitle: (userMessage: ChatMessage, assistantMessage: ChatMessage) => Promise<void>;
		removeStepIndicators: (el: HTMLElement | null) => void;
	}): Promise<void> {
		const {
			userMessage,
			currentSession,
			provider,
			stepIndicatorsEl,
			memoryContext,
			memoryMessages,
			memoryEnabled,
			updateStepIndicator,
			prepareMessages,
			autoGenerateSessionTitle,
			removeStepIndicators
		} = params;
		
		Logger.debug('[NormalModeHandler] Using Mastra Normal Mode Agent');
		
		try {
			// Initialize shared memory manager if not already done
			if (!this.sharedMemoryManager) {
				Logger.debug('[NormalModeHandler] Initializing shared Memory Manager...');
				this.sharedMemoryManager = await AgentFactory.createSharedMemoryManager(
					this.plugin,
					this.i18n
				);
				Logger.debug('[NormalModeHandler] Shared Memory Manager initialized');
			}
			
			// Get current provider and model
			const currentProvider = provider.getProviderName();
			const currentModel = provider.getModelName();
			
			// Create or reuse Normal Mode Agent
			// Recreate if: 1) agent doesn't exist, 2) session changed, 3) provider/model changed
			const needsRecreate = !this.normalModeAgent 
				|| this.normalModeAgent.getThreadId() !== currentSession.id
				|| this.agentProvider !== currentProvider
				|| this.agentModel !== currentModel;
			
			if (needsRecreate) {
				Logger.debug('[NormalModeHandler] Creating Normal Mode Agent:', {
					session: currentSession.id,
					provider: currentProvider,
					model: currentModel,
					reason: !this.normalModeAgent ? 'new' : 
						this.normalModeAgent.getThreadId() !== currentSession.id ? 'session-change' :
						'provider-or-model-change'
				});
				
				this.normalModeAgent = await AgentFactory.createAgent({
					plugin: this.plugin,
					i18n: this.i18n,
					mode: 'normal',
					memoryManager: this.sharedMemoryManager,
					threadId: currentSession.id,
					resourceId: this.plugin.getResourceId(),
					contextManager: this.contextManager
				}) as NormalModeAgent;
				
				// Update tracked provider/model
				this.agentProvider = currentProvider;
				this.agentModel = currentModel;
				
				Logger.debug('[NormalModeHandler] Normal Mode Agent created');
			}
			
			// Start streaming controller
			const streamController = this.streamManager.startStreaming();
			const streamStartTime = Date.now();
			
			// Incremental rendering state
			let thinkingContent = '';
			let answerContent = '';
			let workingMessageEl: HTMLElement | null = null;
			let standaloneMultiTurnEl: HTMLElement | null = null;
			let isMultiTurnVisualizationActive = false;
			let hasAssignedResponseTimestamp = false;
			type MultiTurnEntry = {
				kind: 'llm' | 'tool' | 'system';
				turn: number;
				title: string;
				content: string;
				success?: boolean;
			};
			const multiTurnTranscript: MultiTurnEntry[] = [];
			const runningToolEntryMap = new Map<string, MultiTurnEntry>();
			let currentTurn = 0;
			let currentTurnLlmEntry: MultiTurnEntry | null = null;
			const buildRunningToolKey = (turn: number, toolRound: number, toolCallIndex: number, toolName: string): string =>
				`${turn || 0}:${toolRound || 0}:${toolCallIndex || 0}:${toolName || 'unknown'}`;
			const pushInitialUserTask = (task: string) => {
				if (!task.trim()) return;
				if (multiTurnTranscript.some(entry => entry.title === '用户任务')) return;
				multiTurnTranscript.push({
					kind: 'system',
					turn: 0,
					title: '用户任务',
					content: task.trim(),
				});
			};

			const ensureWorkingMessageElement = () => {
				if (workingMessageEl || !assistantMessage) return;
				if (stepIndicatorsEl) {
					removeStepIndicators(stepIndicatorsEl);
				}
				this.messageManager.addMessageToUI(assistantMessage, currentSession);
				this.messageManager.scrollToBottom();
				workingMessageEl = this.messageRenderer.findMessageElement(assistantMessage.id);
				Logger.debug('[NormalModeHandler] Created message element for streaming');
			};

			const escapeHtml = (value: string) =>
				value
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');

			const renderMultiTurnProgressPanel = () => {
				const rows = multiTurnTranscript.map(entry => {
					const typeClass = entry.kind === 'tool'
						? (entry.success === false ? 'is-failed' : 'is-success')
						: entry.kind === 'system'
							? 'is-system'
							: 'is-llm';
					return `
						<div class="llmsider-multiturn-row ${typeClass}">
							<div class="llmsider-multiturn-row-title">第 ${entry.turn} 轮 · ${escapeHtml(entry.title)}</div>
							<div class="llmsider-multiturn-row-content">${escapeHtml(entry.content || '(无内容)')}</div>
						</div>
					`;
				}).join('');

				if (!standaloneMultiTurnEl) {
					standaloneMultiTurnEl = document.createElement('div');
					standaloneMultiTurnEl.className = 'llmsider-multiturn-standalone';
					this.messageContainer.appendChild(standaloneMultiTurnEl);
				}

				standaloneMultiTurnEl.innerHTML = `
					<div class="llmsider-multiturn-panel is-standalone">
						<div class="llmsider-multiturn-panel-title">执行中：多轮对话</div>
						<div class="llmsider-multiturn-panel-body">
							${rows}
						</div>
					</div>
				`;
			};

			const removeStandaloneMultiTurnPanel = () => {
				if (standaloneMultiTurnEl) {
					standaloneMultiTurnEl.remove();
					standaloneMultiTurnEl = null;
				}
			};
			const formatToolSource = (source: string | undefined): string => {
				if (!source) return 'UNKNOWN';
				if (source.startsWith('skill:')) return `SKILL(${source.slice(6) || 'unknown'})`;
				if (source.startsWith('built-in:')) return `内置工具(${source.slice(9) || 'unknown'})`;
				if (source.startsWith('mcp:')) return `MCP(${source.slice(4) || 'unknown'})`;
				return source.toUpperCase();
			};
			
			// Create assistant message
			const assistantMessage: ChatMessage = {
				id: `${Date.now()}-${Math.random()}`,
				role: 'assistant',
				content: '',
				timestamp: Date.now(),
				metadata: {
					provider: provider.getProviderName(),
					model: provider.getModelName(),
					llmStartTimestamp: userMessage.timestamp
				}
			};
			
			// Throttled scroll function
			let lastScrollTime = 0;
			const scrollThrottleMs = 300;
			const throttledScroll = () => {
				const now = Date.now();
				if (now - lastScrollTime > scrollThrottleMs) {
					this.messageManager.scrollToBottom();
					lastScrollTime = now;
				}
			};
			
			// Helper function to strip memory markers
			const stripMemoryMarkers = (content: string): string => {
				// Remove complete markers
				let cleaned = content.replace(/\[MEMORY_UPDATE\][\s\S]*?\[\/MEMORY_UPDATE\]/g, '');
				// Truncate at incomplete marker
				const incompleteMarkerIndex = cleaned.indexOf('[MEMORY_UPDATE]');
				if (incompleteMarkerIndex !== -1) {
					cleaned = cleaned.substring(0, incompleteMarkerIndex);
				}
				return cleaned.trim();
			};

			const rawUserInput = typeof userMessage.content === 'string' ? userMessage.content : '';
			const followUpGoal = typeof userMessage.metadata?.guidedInitialGoal === 'string'
				? userMessage.metadata.guidedInitialGoal.trim()
				: '';
			const routingInput = (userMessage.metadata?.isFollowUpMessage && followUpGoal) ? followUpGoal : rawUserInput;
			if (userMessage.metadata?.isFollowUpMessage && followUpGoal) {
				Logger.debug('[NormalModeHandler] Follow-up message detected, routing with original goal anchor');
			}
			let routedSkill: ResolvedSkill | null = null;
			try {
				const skillManager = this.plugin.getSkillManager();
				if (skillManager && skillManager.isSkillUsageEnabled(currentSession) && skillManager.getInvocableSkills(currentSession).length > 0) {
					routedSkill = await skillManager.routeSkillForInputWithModel(routingInput, provider, currentSession);
				}
			} catch (e) {
				Logger.warn('[NormalModeHandler] Failed to route skill before preparing messages:', e);
			}
			
			// Prepare messages with memory context
			const messages = await prepareMessages(
				userMessage,
				stepIndicatorsEl,
				memoryContext,
				memoryMessages,
				memoryEnabled,
				routedSkill
			);

			// Resolve normal mode tools: skills are routed separately as logic containers.
			// The concrete callable tool set still consists of built-in and MCP tools.
			let normalTools: import('../../tools/unified-tool-manager').UnifiedTool[] | undefined;
			const activeExecutionSkill = this.plugin.getSkillManager()?.getEffectiveSkill(currentSession) || routedSkill;
			try {
				const skillManager = this.plugin.getSkillManager();
				const toolManager = this.plugin.getToolManager();
				if (toolManager) {
					const allTools = await toolManager.getAllTools();

					if (!skillManager || !skillManager.isSkillUsageEnabled(currentSession)) {
						normalTools = allTools.filter(tool => tool.name !== 'run_local_command');
						normalTools = normalTools.length > 0 ? normalTools : undefined;
						if (normalTools) {
							Logger.debug(`[NormalModeHandler] Normal mode exposes ${normalTools.length} tool(s):`, normalTools.map(t => t.name));
						}
					} else {
						const invocableSkills = skillManager.getInvocableSkills(currentSession);
						if (invocableSkills.length === 0) {
							normalTools = allTools.filter(tool => tool.name !== 'run_local_command');
							normalTools = normalTools.length > 0 ? normalTools : undefined;
							if (normalTools) {
								Logger.debug(`[NormalModeHandler] No invocable skills active, falling back to ${normalTools.length} tool(s):`, normalTools.map(t => t.name));
							}
						} else {
							normalTools = skillManager.filterToolsForSession(allTools, currentSession, routingInput, routedSkill);

							if (normalTools.length > 0) {
								if (routedSkill) {
									Logger.debug(`[NormalModeHandler] Routed skill "${routedSkill.name}" resolved ${normalTools.length} callable tool(s):`, normalTools.map(t => t.name));
								} else {
									Logger.debug('[NormalModeHandler] No skill routed; resolved general callable tool set:', normalTools.map(t => t.name));
								}
							} else {
								normalTools = undefined;
							}
						}
					}
				}
			} catch (e) {
				Logger.warn('[NormalModeHandler] Failed to resolve normal mode tools:', e);
			}

			// Execute normal mode agent
			Logger.debug('[NormalModeHandler] Executing agent with messages');
			const enableSuperpower = (currentSession.guidedModeEnabled ?? this.plugin.settings.guidedModeEnabled) === true;
			if (enableSuperpower) {
				pushInitialUserTask((userMessage.metadata?.isFollowUpMessage && followUpGoal) ? followUpGoal : rawUserInput);
			}
			await this.normalModeAgent.execute({
				messages,
				normalTools,
				enableSuperpower,
				activeSkill: activeExecutionSkill,
				onCompactionStart: () => {
					// Update indicator to show "context compacting"
					if (workingMessageEl) {
						const textEl = workingMessageEl.querySelector('.tool-indicator-text');
						if (textEl) {
							textEl.textContent = this.plugin.i18n.t('ui.contextCompacting');
							this.messageManager.scrollToBottom();
						}
					}
				},
				onCompactionComplete: () => {
					// Update step indicator to active state (waiting for AI response)
					if (stepIndicatorsEl) {
						updateStepIndicator(stepIndicatorsEl, 'ai-response', 'active');
					}
				},
				onStream: (chunk: any) => {
					if (streamController.signal.aborted) return;
					if (!hasAssignedResponseTimestamp && assistantMessage) {
						assistantMessage.timestamp = Date.now();
						hasAssignedResponseTimestamp = true;
					}

					if (enableSuperpower && typeof chunk === 'object' && chunk?.eventType) {
						switch (chunk.eventType) {
								case 'multi_turn_turn_start': {
									isMultiTurnVisualizationActive = true;
									currentTurn = Number(chunk.turn) || (currentTurn + 1);
									currentTurnLlmEntry = {
										kind: 'llm',
										turn: currentTurn,
										title: '模型计划',
										content: '（等待模型输出）',
									};
									runningToolEntryMap.clear();
									renderMultiTurnProgressPanel();
									return;
								}
								case 'multi_turn_tool_calls': {
									const names = Array.isArray(chunk.toolItems) && chunk.toolItems.length > 0
										? chunk.toolItems
											.map((item: any) => `${item.name} [${formatToolSource(item.source)}]`)
											.join(', ')
										: Array.isArray(chunk.toolNames)
											? chunk.toolNames.join(', ')
											: '未知工具';
									if (currentTurnLlmEntry && !currentTurnLlmEntry.content.trim()) {
										currentTurnLlmEntry.content = `计划调用工具：${names}`;
										multiTurnTranscript.push(currentTurnLlmEntry);
									}
									multiTurnTranscript.push({
										kind: 'tool',
										turn: currentTurn || 1,
										title: '工具调用',
									content: names,
								});
								renderMultiTurnProgressPanel();
								return;
							}
								case 'multi_turn_tool_result': {
									const toolName = String(chunk.toolName || 'unknown');
									const key = buildRunningToolKey(
										Number(chunk.turn) || currentTurn || 1,
										Number(chunk.toolRound) || 0,
										Number(chunk.toolCallIndex) || 0,
										toolName
									);
									const sourceLabel = formatToolSource(chunk.toolSource);
									const existingEntry = runningToolEntryMap.get(key);
									if (existingEntry) {
										existingEntry.title = `工具结果 · ${toolName} [${sourceLabel}]`;
										existingEntry.content = String(chunk.details || '');
										existingEntry.success = chunk.success !== false;
										runningToolEntryMap.delete(key);
									} else {
										multiTurnTranscript.push({
											kind: 'tool',
											turn: currentTurn || 1,
											title: `工具结果 · ${toolName} [${sourceLabel}]`,
											content: String(chunk.details || ''),
											success: chunk.success !== false,
										});
									}
								renderMultiTurnProgressPanel();
								return;
							}
							case 'multi_turn_tool_start': {
								const toolName = String(chunk.toolName || 'unknown');
								const sourceLabel = formatToolSource(chunk.toolSource);
								const turn = Number(chunk.turn) || currentTurn || 1;
								const toolRound = Number(chunk.toolRound) || 0;
								const toolCallIndex = Number(chunk.toolCallIndex) || 0;
								const totalToolCalls = Number(chunk.totalToolCalls) || 0;
								const key = buildRunningToolKey(turn, toolRound, toolCallIndex, toolName);
								const progressSuffix = totalToolCalls > 0 && toolCallIndex > 0
									? `（${toolCallIndex}/${totalToolCalls}）`
									: '';
								const runningEntry: MultiTurnEntry = {
									kind: 'tool',
									turn,
									title: `工具执行中 · ${toolName} [${sourceLabel}] ${progressSuffix}`.trim(),
									content: '正在执行，等待结果...',
								};
								runningToolEntryMap.set(key, runningEntry);
								multiTurnTranscript.push(runningEntry);
								renderMultiTurnProgressPanel();
								return;
							}
							case 'multi_turn_recovery': {
								multiTurnTranscript.push({
									kind: 'system',
									turn: currentTurn || 1,
									title: `恢复轮次 ${chunk.recoveryRound || ''}`.trim(),
									content: String(chunk.reason || '继续执行'),
								});
								renderMultiTurnProgressPanel();
								return;
							}
							case 'multi_turn_score_update': {
								const successText = chunk.previousStepSuccess === true
									? '上一步执行：成功'
									: chunk.previousStepSuccess === false
										? '上一步执行：失败'
										: '上一步执行：待确认';
								const scoreText = `当前分数：${chunk.score ?? '-'} / 100`;
								const expectedText = `下一步成功预期：${chunk.expectedScoreIfSuccess ?? '-'} / 100`;
								const nextStep = String(chunk.nextStep || '继续执行');
								const reason = String(chunk.reason || '');
								multiTurnTranscript.push({
									kind: 'system',
									turn: currentTurn || 1,
									title: '评分更新',
									content: `${successText}\n${scoreText}\n${expectedText}\n下一步：${nextStep}${reason ? `\n原因：${reason}` : ''}`,
								});
								renderMultiTurnProgressPanel();
								return;
							}
							default:
								break;
						}
					}
					
					// Handle streaming response - support both string (old format) and object (new format)
					const delta = typeof chunk === 'string' ? chunk : chunk.delta;
					const metadata = typeof chunk === 'object' ? chunk.metadata : undefined;
					const hasImages = chunk.images && Array.isArray(chunk.images) && chunk.images.length > 0;
					
						// Skip if no content and no images
						if (!delta && !hasImages) return;
						
						// Add message bubble on first chunk for regular streaming.
						// Multi-turn executions use standalone visualization and defer bubble creation to completion.
						if (!isMultiTurnVisualizationActive) {
							ensureWorkingMessageElement();
						}
					
					// Handle images if present
					if (hasImages) {
						Logger.debug('[NormalModeHandler] Received images in stream:', chunk.images.length);
						if (assistantMessage) {
							assistantMessage.metadata = assistantMessage.metadata || {};
							assistantMessage.metadata.generatedImages = chunk.images;
							Logger.debug('[NormalModeHandler] Updated message metadata with streaming images');
							
							// Immediately re-render to show images
							if (workingMessageEl) {
								const contentEl = workingMessageEl.querySelector('.llmsider-message-content') as HTMLElement;
								if (contentEl) {
									contentEl.empty();
									this.messageRenderer.renderAssistantMessage(workingMessageEl, contentEl, assistantMessage);
									Logger.debug('[NormalModeHandler] Re-rendered message with images in stream');
								}
							}
						}
					}
					
					// Only process text delta if it exists
					if (!delta) return;
					
					// Accumulate content based on type
					if (metadata?.type === 'thinking') {
						thinkingContent += delta;
						} else {
							answerContent += delta;
							if (currentTurnLlmEntry) {
								if (currentTurnLlmEntry.content === '（等待模型输出）') {
									currentTurnLlmEntry.content = '';
								}
								if (!multiTurnTranscript.includes(currentTurnLlmEntry)) {
									multiTurnTranscript.push(currentTurnLlmEntry);
								}
								currentTurnLlmEntry.content += delta;
							}
						}
					
					// Build complete display content (used when not in multi-turn panel mode)
					let displayContent = '';
					
					// Add thinking section with callout (if exists) - expanded by default
					if (thinkingContent) {
						displayContent += '> [!tip] 思考过程\n';
						displayContent += '> ' + thinkingContent.split('\n').join('\n> ') + '\n\n';
					}
					
					// Add answer section
					if (answerContent) {
						displayContent += answerContent;
					}
					
					// Update message content
					if (assistantMessage) {
						assistantMessage.content = displayContent;
					}
					
					// Render to UI
					if (workingMessageEl) {
						if (isMultiTurnVisualizationActive) {
							renderMultiTurnProgressPanel();
							throttledScroll();
							return;
						}

						const contentEl = workingMessageEl.querySelector('.llmsider-message-content');
						if (contentEl) {
							const cleanedContent = stripMemoryMarkers(displayContent);
							
							// If we have actual content, switch from thinking indicator to normal rendering
							if (cleanedContent.trim()) {
								const thinkingCard = contentEl.querySelector('.llmsider-plan-execute-tool-indicator');
								if (thinkingCard) {
									thinkingCard.remove();
								}
								this.messageRenderer.updateStreamingContent(contentEl as HTMLElement, cleanedContent);
							}
							// Otherwise keep the thinking indicator visible
							throttledScroll();
						}
					}
				},
				onComplete: async (fullResponse: string, responseData?: any) => {
					Logger.debug('[NormalModeHandler] Agent completed, response length:', fullResponse.length);
					// Fallback for non-streaming providers or empty stream callbacks.
					if (!hasAssignedResponseTimestamp && assistantMessage) {
						assistantMessage.timestamp = Date.now();
						hasAssignedResponseTimestamp = true;
					}
					const streamDuration = Date.now() - streamStartTime;
					if (assistantMessage.metadata) {
						assistantMessage.metadata.llmDurationMs = streamDuration;
					}

					const executionSummary = responseData?.executionSummary;
					const awaitingToolConfirmation =
						enableSuperpower === false &&
						responseData?.awaitingToolConfirmation === true &&
						Array.isArray(responseData?.pendingToolCalls) &&
						responseData.pendingToolCalls.length > 0;
					if (assistantMessage) {
						assistantMessage.metadata = assistantMessage.metadata || {};
						if (executionSummary) {
							assistantMessage.metadata.executionSummary = executionSummary;
						}
						if (enableSuperpower) {
							assistantMessage.metadata.multiTurnTranscript = multiTurnTranscript.map(entry => ({
								turn: entry.turn,
								kind: entry.kind,
								title: entry.title,
								content: entry.content,
								success: entry.success,
							}));
							assistantMessage.metadata.isMultiTurnConversation =
								((executionSummary?.autoTurns || 1) > 1) || multiTurnTranscript.length > 1;
						} else {
							assistantMessage.metadata.multiTurnTranscript = [];
							assistantMessage.metadata.isMultiTurnConversation = false;
						}
						if (awaitingToolConfirmation) {
							assistantMessage.metadata.isGuidedQuestion = true;
							assistantMessage.metadata.requiresToolConfirmation = true;
							assistantMessage.metadata.suggestedToolCalls = responseData.pendingToolCalls;
							assistantMessage.metadata.interactiveGuidedCard = true;
							assistantMessage.metadata.isStreaming = false;
							if (activeExecutionSkill) {
								assistantMessage.metadata.toolExecutionSkill = {
									id: activeExecutionSkill.id,
									name: activeExecutionSkill.name,
									rootPath: activeExecutionSkill.rootPath,
								};
							}
						}
					}
					
					// Flush any pending streaming updates
					if (workingMessageEl) {
						const contentEl = workingMessageEl.querySelector('.llmsider-message-content') as HTMLElement;
						if (contentEl) {
							this.messageRenderer.flushStreamingContent(contentEl);
						}
					}
					
					// Images are already handled in onStream, so we only log here
					if (responseData?.images && Array.isArray(responseData.images) && responseData.images.length > 0) {
						Logger.debug('[NormalModeHandler] Images already rendered in stream:', responseData.images.length);
					}
					
					// Remove step indicators after completion
					removeStepIndicators(stepIndicatorsEl);
					removeStandaloneMultiTurnPanel();
					
					// Update assistant message with formatted content (including thinking callout)
						if (assistantMessage) {
							const isMultiTurnConversation = !!assistantMessage.metadata?.isMultiTurnConversation;
							if (awaitingToolConfirmation) {
								const toolNames = (responseData?.pendingToolCalls || [])
									.map((call: any) => call?.function?.name || call?.toolName)
									.filter((name: unknown): name is string => typeof name === 'string' && name.length > 0);
								const toolList = toolNames.length > 0 ? `（${toolNames.join(', ')}）` : '';
								assistantMessage.content = `检测到工具调用请求${toolList}，请确认后执行。`;
							} else if (isMultiTurnConversation) {
							const cleanedFinal = stripMemoryMarkers(fullResponse || answerContent || '');
							const executionSummaryMeta = assistantMessage.metadata?.executionSummary;
							const score = Number(executionSummaryMeta?.completionScore ?? 0);
							const contentSuggestsDone = /(任务已完成|任务完成|已成功|成功创建|已保存|task completed|successfully created|saved)/i
								.test(cleanedFinal || '');
							const completed = executionSummaryMeta?.completed !== false
								|| score >= 95
								|| contentSuggestsDone;
							const summaryTitle = completed ? '任务完成总结' : '任务执行结果（未完成）';
							assistantMessage.content = `### ${summaryTitle}\n\n${cleanedFinal || '任务已执行完成。'}`;
						} else {
							// Build final display content with thinking section
							let finalContent = '';
							if (thinkingContent) {
								finalContent += '> [!tip]- 思考过程\n';
								finalContent += '> ' + thinkingContent.split('\n').join('\n> ') + '\n\n';
							}
							if (answerContent) {
								finalContent += answerContent;
							}
							assistantMessage.content = finalContent || fullResponse;
						}
					}
					
					// Process Action mode responses for diff rendering.
					// Skip for multi-turn messages to avoid overriding the final transcript panel rendering.
					if (!assistantMessage.metadata?.multiTurnTranscript?.length && !awaitingToolConfirmation) {
						await this.messageManager.processActionModeResponse(
							assistantMessage,
							fullResponse,
							'action',
							this.contextManager
						);
					}

					// Create message element only after final content is determined,
					// avoiding an empty placeholder bubble before tool-confirmation cards.
						if (!workingMessageEl) {
							const hasRenderableTextContent = typeof assistantMessage.content === 'string'
								? assistantMessage.content.trim().length > 0
								: Array.isArray(assistantMessage.content) && assistantMessage.content.length > 0;
							const shouldRenderMessage =
								hasRenderableTextContent ||
								awaitingToolConfirmation ||
								Boolean(assistantMessage?.metadata?.generatedImages?.length);
							if (shouldRenderMessage) {
								ensureWorkingMessageElement();
							}
					}
					
					// Update working message element to final state
					if (workingMessageEl) {
						// Check if we have images or need to re-render for tool calls
						const needsRerender = 
							(assistantMessage?.metadata?.generatedImages && assistantMessage.metadata.generatedImages.length > 0) ||
							this.messageRenderer.containsToolCallXML(answerContent || fullResponse) ||
							((assistantMessage?.metadata?.multiTurnTranscript?.length || 0) > 0) ||
							awaitingToolConfirmation;
							
						if (needsRerender) {
							const contentEl = workingMessageEl.querySelector('.llmsider-message-content') as HTMLElement;
							if (contentEl) {
								contentEl.empty();
								this.messageRenderer.renderAssistantMessage(workingMessageEl, contentEl, assistantMessage);
								Logger.debug('[NormalModeHandler] Re-rendered message with images/tool calls');
							}
						}

						workingMessageEl.dataset.messageId = assistantMessage.id;
						this.messageRenderer.addMessageActions(workingMessageEl, assistantMessage);
						if (awaitingToolConfirmation) {
							const existingPreparingIndicators = workingMessageEl.querySelectorAll('.llmsider-guided-confirmation-pending');
							existingPreparingIndicators.forEach(el => el.remove());

							const preparingIndicator = workingMessageEl.createDiv({
								cls: 'llmsider-plan-execute-tool-indicator llmsider-guided-confirmation-pending'
							});
							preparingIndicator.createDiv({
								cls: 'tool-indicator-text',
								text: this.plugin.i18n.t('ui.preparingTools') || 'Preparing tool confirmation...'
							});
						}
					}
					
					// Update session
					currentSession.messages.push(assistantMessage);
					await this.plugin.updateChatSession(currentSession.id, {
						messages: currentSession.messages
					});

					if (awaitingToolConfirmation) {
						window.dispatchEvent(new CustomEvent('llmsider-render-guided-card', {
							detail: { messageId: assistantMessage.id, message: assistantMessage }
						}));
					}
					
					// Auto-generate session title
					await autoGenerateSessionTitle(userMessage, assistantMessage);
					
					// Log conversation
					await conversationLogger.logConversation(
						currentSession.id,
						this.plugin.settings.activeProvider,
						this.plugin.getActiveModelName(),
						userMessage,
						fullResponse,
						undefined,
						streamDuration
					);
					
					// Reset streaming state
					this.streamManager.resetButtonStates();
					this.messageRenderer.resetXmlBuffer();
				},
				onError: (error: Error) => {
					removeStandaloneMultiTurnPanel();
					Logger.error('[NormalModeHandler] Agent error:', error);
					throw error; // Re-throw to be caught by outer catch block
				},
				abortController: streamController
			});
			
			Logger.debug('[NormalModeHandler] Agent execution completed');
		} catch (error) {
			Logger.error('[NormalModeHandler] Execution failed:', error);
			// Reset streaming state on error
			this.streamManager.resetButtonStates();			
			// Remove step indicators on error
			if (stepIndicatorsEl) {
				removeStepIndicators(stepIndicatorsEl);
			}
						throw error; // Re-throw to be handled by caller
		}
	}
	
	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		this.normalModeAgent = null;
		this.sharedMemoryManager = null;
		this.agentProvider = null;
		this.agentModel = null;
	}
}
