/**
 * Normal Mode Agent - Simple Q&A with optional built-in tools
 * 
 * This agent extends MastraAgent to provide simple conversational capabilities
 * with optional built-in tool execution. It focuses on:
 * - Direct Q&A responses
 * - Automatic Memory management (Working Memory + Conversation History)
 * - Semantic recall of relevant past conversations
 * - Streaming responses
 * 
 * Key differences from Plan-Execute Agent:
 * - Tools are not bound at initialization; eligible built-in tools can be
 *   passed per request through execute({ normalTools })
 * - No planning: direct LLM call
 * - Simpler prompts: focus on conversation quality
 * 
 * This replaces the manual Memory management in chat-view.ts normal mode.
 */

import { Logger } from '../../utils/logger';
import LLMSiderPlugin from '../../main';
import { ChatMessage, ResolvedSkill } from '../../types';
import { I18nManager } from '../../i18n/i18n-manager';
import { MastraAgent, MastraAgentConfig } from './mastra-agent';
import { MemoryManager } from './memory-manager';
import type { ContextManager } from '../context-manager';
import { TokenManager } from '../../utils/token-manager';
import { UnifiedTool } from '../../tools/unified-tool-manager';
import { TaskCompletionAssessment, TaskCompletionGuard, TaskLanguage } from './task-completion-guard';

const RUN_LOCAL_COMMAND_TOOL = 'run_local_command';

interface RoundProgressAssessment {
	previousStepSuccess: boolean | null;
	updatedScore: number;
	taskCompleted: boolean;
	completionReason: string;
	nextStep: string;
	expectedScoreIfSuccess: number;
}

/**
 * Configuration for Normal Mode Agent
 */
export interface NormalModeAgentConfig extends Omit<MastraAgentConfig, 'tools'> {
	/** Optional: Override default system prompt */
	systemPrompt?: string;
	/** Context manager for dynamic context generation */
	contextManager?: ContextManager;
	/** StreamingManager (inherited from parent) */
	streamingManager?: any;
	/** Debug mode flag */
	debug?: boolean;
}

/**
 * Options for executing normal mode conversation
 */
export interface NormalModeExecuteOptions {
	/** User messages to process */
	messages: ChatMessage[];
	/** Superpower toggle: when false, run a single-turn response without autonomous multi-turn loops. */
	enableSuperpower?: boolean;
	/** Abort controller for cancellation */
	abortController?: AbortController;
	/** Tools to expose to the LLM in normal mode. */
	normalTools?: UnifiedTool[];
	/** Routed or active skill for this request, if any. */
	activeSkill?: ResolvedSkill | null;
	/** Callback for streaming updates */
	onStream?: (chunk: unknown) => void;
	/** Callback for complete response */
	onComplete?: (response: string, responseData?: unknown) => void;
	/** Callback for errors */
	onError?: (error: Error) => void;
	/** Callback when compaction starts */
	onCompactionStart?: () => void;
	/** Callback when compaction completes */
	onCompactionComplete?: () => void;
}

/**
 * NormalModeAgent - Extends MastraAgent for simple Q&A mode
 * 
 * This agent provides conversational AI without tool execution,
 * while still leveraging Mastra's Memory capabilities:
 * - Working Memory: User preferences and context
 * - Conversation History: Past messages
 * - Semantic Recall: Relevant historical context
 * 
 * Usage:
 * ```typescript
 * const agent = new NormalModeAgent({
 *   plugin,
 *   i18n,
 *   name: 'Normal Chat',
 *   memoryManager: sharedMemoryManager,
 *   threadId: sessionId
 * });
 * 
 * await agent.initialize();
 * 
 * await agent.execute({
 *   messages: chatMessages,
 *   onStream: (chunk) => updateUI(chunk),
 *   abortController: controller
 * });
 * ```
 */
export class NormalModeAgent extends MastraAgent {
	private systemPrompt: string;
	
	constructor(config: NormalModeAgentConfig) {
		// Call parent constructor without tools
		super({
			...config,
			tools: {}, // No tools in normal mode
			name: config.name || 'Normal Mode Agent',
			instructions: '', // Will be set after initialization
		});
		
		// Context manager is inherited from MastraAgent base class
		// No need to redeclare it here
		
		// Set base system prompt (context will be added dynamically during execution)
		this.systemPrompt = config.systemPrompt || this.buildDefaultSystemPrompt();
		
		Logger.debug('[NormalModeAgent] Initialized with config:', {
			name: config.name,
			hasMemoryManager: !!config.memoryManager,
			hasContextManager: !!config.contextManager,
			threadId: config.threadId,
			resourceId: config.resourceId
		});
	}
	
	/**
	 * Initialize the agent
	 * Must be called before execute()
	 */
	async initialize(config?: NormalModeAgentConfig): Promise<void> {
		try {
			Logger.debug('[NormalModeAgent] Starting initialization...');
			
			// Build instructions with system prompt
			const instructions = this.systemPrompt;
			
			// Initialize parent agent with instructions
			await super.initialize({
				...config,
				tools: {}, // Explicitly no tools
				name: config?.name || 'Normal Mode Agent',
				instructions,
			} as any);
			
			Logger.debug('[NormalModeAgent] Initialization complete');
		} catch (error) {
			Logger.error('[NormalModeAgent] Initialization failed:', error);
			throw error;
		}
	}
	
	/**
	 * Execute normal mode conversation
	 * 
	 * This method:
	 * 1. Retrieves relevant memory (working memory + semantic recall)
	 * 2. Builds conversation prompt
	 * 3. Calls LLM with streaming
	 * 4. Updates memory automatically
	 */
	async execute(options: NormalModeExecuteOptions): Promise<void> {
		try {
			Logger.debug('[NormalModeAgent] Starting execution with', options.messages.length, 'messages');

			const userLanguage = TaskCompletionGuard.detectUserLanguage(options.messages);
			const isChineseSession = userLanguage === 'zh';
			const originalUserGoal = this.extractOriginalUserGoal(options.messages);
			const exposeCurrentTimeTool = this.shouldExposeCurrentTimeTool(options.messages);
			let effectiveNormalTools = (options.normalTools || []).filter(tool => {
				if (!options.activeSkill && tool.name === RUN_LOCAL_COMMAND_TOOL) {
					return false;
				}
				if (!exposeCurrentTimeTool && tool.name === 'get_current_time') {
					return false;
				}
				return true;
			});
			if (!exposeCurrentTimeTool && (options.normalTools || []).some(tool => tool.name === 'get_current_time')) {
				Logger.debug('[NormalModeAgent] Hiding get_current_time for this session (not explicitly requested)');
			}
			
		// Validate that we have a provider
		const provider = (this as any).provider;
		if (!provider) {
			throw new Error('No active LLM provider configured');
		}			// Get memory manager
			const memoryManager = (this as any).memoryManager as MemoryManager;
			const memory = (this as any).memory;
			const threadId = (this as any).threadId;
			const resourceId = (this as any).resourceId;
			
		// Phase 1: Retrieve Memory context
		let memoryContext = '';
		if (memoryManager && memory && threadId) {
			try{
				
				// Get working memory directly from memory instance
				try {
					const workingMemory = await memory.getWorkingMemory({ threadId, resourceId });
					if (workingMemory) {
						memoryContext += `# Working Memory (User Context)\n${workingMemory}\n\n`;
					}
				} catch (wmError) {
					Logger.warn('[NormalModeAgent] Failed to get working memory:', wmError);
				}
				
				Logger.debug('[NormalModeAgent] Memory context retrieved');
			} catch (error) {
				Logger.warn('[NormalModeAgent] Failed to retrieve memory context:', error);
				// Continue without memory context
			}
		}			// Phase 2: Build conversation messages with dynamic context
			// Get context from ContextManager if available
			let contextPrompt = '';
				if (this.contextManager) {
				try {
					const providerName = (this as any).provider?.getProviderName?.();
					const modelName = (this as any).provider?.getModelName?.();
					contextPrompt = await this.contextManager.generateContextPrompt(undefined, modelName, false, providerName);
					if (contextPrompt) {
						Logger.debug('[NormalModeAgent] Generated context prompt:', {
							contextLength: contextPrompt.length,
							preview: contextPrompt.substring(0, 100),
							modelName
						});
					}
				} catch (error) {
					Logger.warn('[NormalModeAgent] Failed to generate context prompt:', error);
				}
				}

				const hasInjectedContext = contextPrompt.trim().length > 0;
				const userExplicitlyRequestsDiscovery = this.shouldKeepDiscoveryTools(options.messages);
				if (hasInjectedContext && !userExplicitlyRequestsDiscovery) {
					const beforeCount = effectiveNormalTools.length;
					effectiveNormalTools = effectiveNormalTools.filter(
						tool => tool.name !== 'list_notes' && tool.name !== 'read_note',
					);
					if (beforeCount !== effectiveNormalTools.length) {
						Logger.debug('[NormalModeAgent] Context already injected; hiding discovery tools list_notes/read_note for this turn');
					}
				}
				
				// Combine memory context, file context, and system prompt into ONE system message
				// Pass as systemMessage parameter (not in messages array) to avoid 400 Bad Request
			
			// First, check if options.messages contains a system message (which may include vector search context)
			const passedSystemMessage = options.messages.find(msg => msg.role === 'system');
			let baseSystemPrompt = this.systemPrompt;
			
			// If a system message was passed in (from ChatView with vector search), use its content as base
			if (passedSystemMessage && typeof passedSystemMessage.content === 'string') {
				baseSystemPrompt = passedSystemMessage.content;
			}
			
			let combinedSystemMessage = baseSystemPrompt;
			
			// Prepend memory context if available
			if (memoryContext) {
				combinedSystemMessage = `${memoryContext}\n\n${combinedSystemMessage}`;
			}
			
			// Append file context if available (and not already in passed system message)
			if (contextPrompt && !combinedSystemMessage.includes(contextPrompt)) {
				combinedSystemMessage = `${combinedSystemMessage}\n\n${contextPrompt}`;
			}

			if (effectiveNormalTools && effectiveNormalTools.length > 0) {
				const toolLines = effectiveNormalTools.map(tool => `- ${tool.name}: ${tool.description || 'No description provided'}`);
				const completionGuardInstructions = TaskCompletionGuard.buildExecutionGuardInstructions(
					options.messages,
					effectiveNormalTools,
					'normal',
				);
				combinedSystemMessage = `${combinedSystemMessage}

You may use tools when they are genuinely needed to answer the user accurately or complete an action.
- Prefer answering directly when no tool is needed.
- When a tool is needed, call only the exact tool names listed below.
- Never invent tool names or parameters.
- For create, save, write, or update requests, do not stop until you have either:
  1. completed the requested operation with an available tool, or
  2. clearly stated that completion is blocked because the required write-capable tool is unavailable or a truly required parameter is missing.
- Do not ask the user to confirm work that you can complete autonomously with available tools.
- For write/create/save requests, avoid optional preference follow-up questions (style/length/audience) when reasonable defaults can be applied.
- When missing details are inferable, apply sensible defaults and execute first, then report what defaults were used.
- For write/create/save requests, only consider the task complete after an actual write operation succeeds; explicitly report success in the final response (for example: "created/saved").
- After each tool result, check whether the original request is fully completed before deciding to stop.
	- Do NOT call "get_current_time" unless the user explicitly asks for current date/time, or the task explicitly requires a real timestamp.
	- Keep output language consistent with user language. If the user writes in Chinese, all tool-related replies and final replies must stay in Chinese.
	- Always keep the original user goal in focus across every autonomous turn: "${originalUserGoal}".
	- If referenced note context is already provided in the prompt, do not re-run discovery calls like list_notes/read_note unless the user explicitly asks to browse or re-open notes.
	- If referenced file/folder content is already injected in the prompt, do NOT call run_local_command for redundant read/list commands (for example: obsidian read, obsidian list, cat, ls) unless the user explicitly asks to refresh/reload/re-read content.

	${completionGuardInstructions}

Available tools:
${toolLines.join('\n')}`;
			}
			
		// Only include user/assistant messages in the conversationMessages array
		// Filter out any system messages from options.messages to avoid conflicts
		// Also filter out messages with empty content to avoid API errors
		let conversationMessages = options.messages.filter(msg => {
			if (msg.role === 'system') return false;
			
			// Check if message has valid content
			if (typeof msg.content === 'string') {
				return msg.content.trim().length > 0;
			} else if (Array.isArray(msg.content)) {
				// For multimodal messages, check if there's at least one valid content item
				return msg.content.length > 0 && msg.content.some(item => {
					if (item.type === 'text') return item.text && item.text.trim().length > 0;
					if (item.type === 'image') return true; // Images are always valid
					return false;
				});
			}
			
			return false; // Filter out messages with no content
		});
		
		// Phase 2.5: Pre-send conversation compaction (if enabled)
		const plugin = (this as any).plugin as LLMSiderPlugin;
		if (plugin.settings.memorySettings.enableCompaction && options.onCompactionStart) {
			try {
				// Calculate total tokens
				const contextTokens = TokenManager.estimateTokensForContext(combinedSystemMessage);
				const messageTokens = TokenManager.estimateTokensForMessages(conversationMessages);
				const totalTokens = contextTokens + messageTokens;
				
				const threshold = plugin.settings.memorySettings.compactionThreshold || 65536;
				
				Logger.debug('[NormalModeAgent] Token check:', {
					totalTokens,
					threshold,
					contextTokens,
					messageTokens
				});
				
				if (totalTokens > threshold) {
					Logger.debug('[NormalModeAgent] Token threshold exceeded, starting pre-send compaction...');
					
					// Notify UI that compaction is starting
					if (options.onCompactionStart) {
						options.onCompactionStart();
					}
					
					// Perform compaction
					conversationMessages = await this.compactConversationMessages(
						conversationMessages,
						plugin.settings.memorySettings
					);
					
					// Update persistent memory with compacted messages
					if (memoryManager && threadId) {
						await memoryManager.saveMessages(threadId, resourceId, conversationMessages);
						Logger.debug('[NormalModeAgent] Persistent memory updated with compacted messages');
					}
					
					// Notify UI that compaction is complete
					if (options.onCompactionComplete) {
						options.onCompactionComplete();
					}
					
					Logger.debug('[NormalModeAgent] Pre-send compaction complete, new message count:', conversationMessages.length);
				}
			} catch (error) {
				Logger.error('[NormalModeAgent] Pre-send compaction failed:', error);
				// Continue with uncompacted messages
			}
		}
		
		// Phase 2.7: Add file base64 data to last user message (for free-deepseek/free-qwen)
		const providerName = (this as any).provider?.getProviderName?.();
		const shouldIncludeFiles = providerName && 
			(providerName.includes('free-deepseek') || providerName.includes('free-qwen'));
		
		if (shouldIncludeFiles && this.contextManager) {
			try {
				const fileContexts = this.contextManager.getCurrentNoteContext();
				const filesWithBase64 = fileContexts.filter(ctx => 
					ctx.metadata?.imageData?.base64 && ctx.metadata?.imageData?.mediaType
				);
				
				if (filesWithBase64.length > 0 && conversationMessages.length > 0) {
					const lastUserMsgIndex = conversationMessages.length - 1;
					const lastMsg = conversationMessages[lastUserMsgIndex];
					
					// Convert string content to multimodal array
					if (typeof lastMsg.content === 'string') {
						const textContent = lastMsg.content;
						const multimodalContent: any[] = [{ type: 'text', text: textContent }];
						
						// Add file base64 data
						filesWithBase64.forEach(ctx => {
							const base64Data = ctx.metadata.imageData.base64;
							const mediaType = ctx.metadata.imageData.mediaType;
							
							multimodalContent.push({
								type: 'file',
								file_url: {
									url: `data:${mediaType};base64,${base64Data}`
								},
								filename: ctx.name
							});
							
							Logger.debug('[NormalModeAgent] Added file to message:', {
								filename: ctx.name,
								mediaType,
								base64Length: base64Data.length
							});
						});
						
						conversationMessages[lastUserMsgIndex] = {
							...lastMsg,
							content: multimodalContent
						};
						
						Logger.info(`[NormalModeAgent] Added ${filesWithBase64.length} files to last user message`);
					}
				}
			} catch (error) {
				Logger.warn('[NormalModeAgent] Failed to add files to message:', error);
			}
		}
		
		// Phase 3: Call LLM with streaming and use the shared completion guard
			let fullResponse = '';
			const accumulatedImages: any[] = [];
			let collectedToolCalls: any[] = [];
			let currentMessages = [...conversationMessages];
			let toolRound = 0;
			let recoveryRound = 0;
			const configuredMaxAutoTurns = Number(plugin?.settings?.superMaxAutoTurns ?? 50);
			const MAX_AUTO_TURNS = Number.isFinite(configuredMaxAutoTurns)
				? Math.max(1, Math.min(200, Math.floor(configuredMaxAutoTurns)))
				: 50;
			const MAX_BASIC_TOOL_TURNS = 8;
			const MAX_RECOVERY_TURNS = 2;
			const toolManager = plugin?.getToolManager?.();
			let exitReason: 'completed' | 'guard_stop' | 'max_turns' | 'awaiting_confirmation' = 'max_turns';
			let pendingToolConfirmationCalls: any[] = [];
			let hasWriteSuccess = false;
			let lastWriteSuccessSignal = '';
			let lastCompletionScore = 0;
			let latestExecutionEvidence = '';
			let lastPlannedStep = isChineseSession ? '初始化：理解原始任务并确认可用工具。' : 'Initialize: understand original task and available tools.';
			let lastExpectedSuccessScore = 20;
			let lastCompletionReason = '';
			let lastNextStepHint = '';
			const enableSuperpower = options.enableSuperpower === true;

			Logger.info('[NormalModeAgent] 🎯 Calling LLM with streaming...');

			if (threadId && provider.setThreadId) {
				provider.setThreadId(threadId);
			}

			const runStreamingTurn = async (messagesForTurn: ChatMessage[]): Promise<void> => {
				let responseStarted = false;
				fullResponse = '';
				collectedToolCalls = [];

				try {
					await provider.sendStreamingMessage(
						messagesForTurn,
						(chunk: any) => {
							if (chunk?.toolCalls && Array.isArray(chunk.toolCalls) && chunk.toolCalls.length > 0) {
								collectedToolCalls.push(...chunk.toolCalls);
							}

							const textContent = chunk.content || chunk.delta;
							if (textContent) {
								if (!responseStarted) {
									responseStarted = true;
								}

								fullResponse += textContent;
							}

							if (chunk.images && Array.isArray(chunk.images)) {
								Logger.debug('[NormalModeAgent] Received images in chunk:', chunk.images.length);
								accumulatedImages.push(...chunk.images);
							}

							if (options.onStream) {
								options.onStream({
									delta: textContent || '',
									content: textContent || '',
									images: accumulatedImages.length > 0 ? [...accumulatedImages] : undefined,
									toolCalls: chunk?.toolCalls,
								});
							}
						},
						options.abortController?.signal,
						effectiveNormalTools,
						combinedSystemMessage
					);
				} catch (error) {
					Logger.error('[NormalModeAgent] Streaming failed, attempting non-streaming fallback:', error);

					const message = error instanceof Error ? error.message : String(error);
					const llmError = (error as any).llmError as { code?: string; message?: string } | undefined;
					const shouldFallback = message.includes('AI_APICallError') ||
						message.includes('Bad Request') ||
						llmError?.code === 'HTTP_400' ||
						llmError?.code === 'UNKNOWN_ERROR';

					if (!shouldFallback) {
						throw error;
					}

					const response = await provider.sendMessage(
						messagesForTurn,
						effectiveNormalTools,
						combinedSystemMessage
					);

					fullResponse = response.content || '';
					collectedToolCalls = response.toolCalls || [];

					if (response.images && Array.isArray(response.images)) {
						accumulatedImages.push(...response.images);
					}

					if (options.onStream && fullResponse) {
						options.onStream({
							delta: fullResponse,
							content: fullResponse,
							images: response.images,
							toolCalls: collectedToolCalls,
						});
					}
				}
			};

			const hasCallableTools = (effectiveNormalTools?.length ?? 0) > 0;
			const autoTurnLimit = enableSuperpower
				? MAX_AUTO_TURNS
				: (hasCallableTools ? MAX_BASIC_TOOL_TURNS : 1);
			for (let autoTurn = 1; autoTurn <= autoTurnLimit; autoTurn++) {
				Logger.debug(`[NormalModeAgent] Auto turn ${autoTurn} starting`);
				if (enableSuperpower && options.onStream) {
					options.onStream({
						eventType: 'multi_turn_turn_start',
						turn: autoTurn,
					});
				}
				await runStreamingTurn(currentMessages);

				if (collectedToolCalls.length > 0) {
					if (!enableSuperpower) {
						Logger.debug('[NormalModeAgent] Superpower disabled; tool calls detected, waiting for explicit user confirmation.');
						pendingToolConfirmationCalls = [...collectedToolCalls];
						exitReason = 'awaiting_confirmation';
						lastCompletionScore = 0;
						break;
					}
					toolRound += 1;
					Logger.debug(`[NormalModeAgent] Tool round ${toolRound}: executing ${collectedToolCalls.length} tool call(s)...`);
					const toolMetaByName = new Map(
						(effectiveNormalTools || []).map(tool => [tool.name, { source: tool.source, server: tool.server }]),
					);
					const getToolSourceTag = (toolName: string): string => {
						if (options.activeSkill && toolName === RUN_LOCAL_COMMAND_TOOL) {
							return `skill:${options.activeSkill.name || options.activeSkill.id || 'unknown'}`;
						}
						const meta = toolMetaByName.get(toolName);
						if (meta?.source === 'mcp') {
							return meta.server ? `mcp:${meta.server}` : 'mcp:unknown';
						}
						if (meta?.source === 'built-in') {
							return `built-in:${toolName}`;
						}
						return options.activeSkill
							? `skill:${options.activeSkill.name || options.activeSkill.id || 'unknown'}`
							: `built-in:${toolName}`;
					};
					if (options.onStream) {
						const toolItems = collectedToolCalls
							.map(toolCall => {
								const name = toolCall?.function?.name || toolCall?.toolName;
								if (!name || typeof name !== 'string') {
									return null;
								}
								return {
									name,
									source: getToolSourceTag(name),
								};
							})
							.filter((item): item is { name: string; source: string } => !!item);
						options.onStream({
							eventType: 'multi_turn_tool_calls',
							turn: autoTurn,
							toolRound,
							toolNames: collectedToolCalls
								.map(toolCall => toolCall?.function?.name || toolCall?.toolName)
								.filter((name: unknown): name is string => typeof name === 'string' && name.length > 0),
							toolItems,
						});
					}
					const toolResults: string[] = [];

					for (let toolIndex = 0; toolIndex < collectedToolCalls.length; toolIndex++) {
						const toolCall = collectedToolCalls[toolIndex];
						try {
							const functionName = toolCall?.function?.name || toolCall?.toolName;
							const rawArgs = toolCall?.function?.arguments ?? toolCall?.arguments ?? '{}';
							if (!functionName || !toolManager) {
								continue;
							}
							if (options.onStream) {
								options.onStream({
									eventType: 'multi_turn_tool_start',
									turn: autoTurn,
									toolRound,
									toolCallIndex: toolIndex + 1,
									totalToolCalls: collectedToolCalls.length,
									toolName: functionName,
									toolSource: getToolSourceTag(functionName),
								});
							}
							if (functionName === RUN_LOCAL_COMMAND_TOOL && !options.activeSkill) {
								const blockedMsg = isChineseSession
									? '工具 run_local_command 未被允许：仅可在 skill 上下文中调用。'
									: 'Tool run_local_command is not allowed outside skill context.';
								toolResults.push(`- ${functionName}: ERROR: ${blockedMsg}`);
								if (options.onStream) {
									options.onStream({
										eventType: 'multi_turn_tool_result',
										turn: autoTurn,
										toolRound,
										toolCallIndex: toolIndex + 1,
										toolName: functionName,
										toolSource: getToolSourceTag(functionName),
										success: false,
										details: blockedMsg,
									});
								}
								continue;
							}
							if (functionName === 'get_current_time' && !exposeCurrentTimeTool) {
								const blockedMsg = isChineseSession
									? '工具 get_current_time 未被允许：用户未明确请求时间信息。'
									: 'Tool get_current_time is not allowed: user did not explicitly request time information.';
								toolResults.push(`- ${functionName}: ERROR: ${blockedMsg}`);
								if (options.onStream) {
									options.onStream({
										eventType: 'multi_turn_tool_result',
										turn: autoTurn,
										toolRound,
										toolCallIndex: toolIndex + 1,
										toolName: functionName,
										toolSource: getToolSourceTag(functionName),
										success: false,
										details: blockedMsg,
									});
								}
								continue;
							}

							let parsedArgs: unknown = {};
							if (typeof rawArgs === 'string') {
								parsedArgs = rawArgs.trim() ? JSON.parse(rawArgs) : {};
							} else {
								parsedArgs = rawArgs || {};
							}

								const result = await toolManager.executeTool(functionName, parsedArgs, {
									skill: options.activeSkill ?? null,
									skillRootPath: options.activeSkill?.rootPath,
									allowDisabledBuiltInTools:
										options.activeSkill && effectiveNormalTools?.some(tool => tool.name === RUN_LOCAL_COMMAND_TOOL)
											? [RUN_LOCAL_COMMAND_TOOL]
											: [],
								});
							const failureDetails = !result.success
								? JSON.stringify({
									error: result.error || this.t('ui.multiTurnToolExecutionFailed', {}, 'Tool execution failed'),
									result: result.result,
								}, null, 2)
								: '';
								const renderedResult = result.success
									? this.serializeForModel(result.result)
									: `ERROR DETAILS:\n${this.truncateText(failureDetails, 2000)}`;
							toolResults.push(`- ${functionName}: ${renderedResult}`);
							if (this.isWriteOperationSuccess(functionName, parsedArgs, result)) {
								hasWriteSuccess = true;
								lastWriteSuccessSignal = this.extractWriteSuccessSignal(functionName, parsedArgs);
							}
							if (options.onStream) {
									options.onStream({
										eventType: 'multi_turn_tool_result',
										turn: autoTurn,
										toolRound,
										toolCallIndex: toolIndex + 1,
										toolName: functionName,
										toolSource: getToolSourceTag(functionName),
										success: result.success,
										details: result.success
											? renderedResult.slice(0, 400)
										: (result.error || this.t('ui.multiTurnToolExecutionFailed', {}, 'Tool execution failed')),
								});
							}
						} catch (toolError) {
							const msg = toolError instanceof Error ? toolError.message : String(toolError);
							toolResults.push(`- ${toolCall?.function?.name || this.t('ui.multiTurnUnknownToolName', {}, 'unknown_tool')}: ERROR: ${this.truncateText(msg, 600)}`);
							if (options.onStream) {
									options.onStream({
										eventType: 'multi_turn_tool_result',
										turn: autoTurn,
										toolRound,
										toolCallIndex: toolIndex + 1,
										toolName: toolCall?.function?.name || this.t('ui.multiTurnUnknownToolName', {}, 'unknown_tool'),
										toolSource: getToolSourceTag(toolCall?.function?.name || ''),
										success: false,
										details: msg,
									});
							}
						}
					}

					currentMessages = [
						...currentMessages,
						{
							id: `assistant-tool-calls-${Date.now()}-${toolRound}`,
							role: 'assistant',
							content: fullResponse || this.t('ui.multiTurnToolCallsRequested', {}, 'Tool calls requested.'),
							timestamp: Date.now(),
						},
						{
							id: `tool-results-${Date.now()}-${toolRound}`,
							role: 'user',
							content: isChineseSession
								? `原始用户目标：${originalUserGoal}

当前会话链摘要：
${this.buildSessionChainSummary(currentMessages)}

工具执行结果：
${toolResults.join('\n')}

请继续执行并严格遵循：
- 全程使用中文回答，不要切换英文。
- 优先继续调用可用工具，直到原始任务真正完成。
- 若已完成，直接给出最终完成结果，并明确写入成功（如“已创建/已保存”）。
- 若未完成且还需要工具，立刻继续调用，不要询问可选偏好问题。
- 若确实阻塞，明确说明具体阻塞点和缺失能力。`
								: `Original user goal: ${originalUserGoal}

Session chain summary:
${this.buildSessionChainSummary(currentMessages)}

Tool execution results:
${toolResults.join('\n')}

Continue execution with these rules:
- Keep language consistent with user language.
- Continue calling available tools until the original task is truly completed.
- If completed, provide the final result and explicitly confirm write success.
- If not completed and tools are still needed, call them immediately.
- If blocked, clearly state the concrete blocker and missing capability.`,
							timestamp: Date.now(),
						},
					];
					latestExecutionEvidence = this.truncateText(toolResults.join('\n'), 3000);
					continue;
				}

				if (!enableSuperpower) {
					// Superpower disabled:
					// - still allow matched tools to run in prior turns
					// - once no more tool calls are requested, finish immediately
					exitReason = 'completed';
					lastCompletionScore = 100;
					break;
				}

				const completionResolution = TaskCompletionGuard.resolveNextStep({
					messages: options.messages,
					tools: effectiveNormalTools || [],
					responseText: fullResponse,
					mode: 'normal',
					pendingToolCalls: 0,
				});
				const modelAssessment = await this.evaluateCompletionWithModel({
					provider,
					language: userLanguage,
					originalGoal: originalUserGoal,
					responseText: fullResponse,
					tools: effectiveNormalTools || [],
					hasWriteSuccess,
				});
				const finalAssessment = this.mergeAssessments(completionResolution.assessment, modelAssessment);
				const roundProgress = await this.evaluateRoundProgressWithModel({
					provider,
					language: userLanguage,
					originalGoal: originalUserGoal,
					currentScore: lastCompletionScore,
					lastPlannedStep,
					lastExpectedSuccessScore,
					responseText: fullResponse,
					latestEvidence: latestExecutionEvidence,
					tools: effectiveNormalTools || [],
					hasWriteSuccess,
				});
				lastCompletionScore = roundProgress.updatedScore;
				lastPlannedStep = roundProgress.nextStep || lastPlannedStep;
				lastExpectedSuccessScore = roundProgress.expectedScoreIfSuccess || lastExpectedSuccessScore;
				lastCompletionReason = roundProgress.completionReason || '';
				lastNextStepHint = roundProgress.nextStep || '';
				latestExecutionEvidence = this.truncateText(fullResponse || latestExecutionEvidence, 3000);

				if (options.onStream) {
					options.onStream({
						eventType: 'multi_turn_score_update',
						turn: autoTurn,
						score: lastCompletionScore,
						previousStepSuccess: roundProgress.previousStepSuccess,
						nextStep: roundProgress.nextStep,
						expectedScoreIfSuccess: roundProgress.expectedScoreIfSuccess,
						reason: roundProgress.completionReason,
					});
				}
				Logger.debug('[NormalModeAgent] Completion assessment:', {
					heuristic: completionResolution.assessment,
					model: modelAssessment,
					final: finalAssessment,
					roundProgress,
				});

				const shouldContinue = !roundProgress.taskCompleted && finalAssessment.status !== 'blocked';

				if (!shouldContinue) {
					exitReason = 'completed';
					break;
				}

				const recoveryInstruction = TaskCompletionGuard.buildRecoveryInstruction({
					messages: options.messages,
					tools: effectiveNormalTools || [],
					mode: 'normal',
					assessment: finalAssessment,
				});

				if (!recoveryInstruction || recoveryRound >= MAX_RECOVERY_TURNS) {
					Logger.warn('[NormalModeAgent] Completion guard stopped auto-recovery:', {
						recoveryRound,
						assessment: finalAssessment,
					});
					exitReason = 'guard_stop';
					break;
				}

				recoveryRound += 1;
				Logger.debug(`[NormalModeAgent] Recovery round ${recoveryRound}: requesting another autonomous turn`);
				if (options.onStream) {
					options.onStream({
						eventType: 'multi_turn_recovery',
						turn: autoTurn,
						recoveryRound,
						reason: finalAssessment?.reason || 'incomplete',
					});
				}
				currentMessages = [
					...currentMessages,
					{
						id: `assistant-recovery-${Date.now()}-${recoveryRound}`,
						role: 'assistant',
						content: fullResponse || this.t('ui.multiTurnNoResponseContent', {}, 'No response content.'),
						timestamp: Date.now(),
					},
					{
						id: `user-recovery-${Date.now()}-${recoveryRound}`,
						role: 'user',
						content: isChineseSession
							? `原始用户目标：${originalUserGoal}
当前会话链摘要：
${this.buildSessionChainSummary(currentMessages)}

当前完成度评分：${lastCompletionScore}/100
上一步计划：${lastPlannedStep}
下一步建议：${roundProgress.nextStep}
该步成功预期分数：${roundProgress.expectedScoreIfSuccess}/100

补充约束：请继续自主执行并使用中文，不要偏离原始任务，不要提可选偏好问题，优先完成写入操作。

${recoveryInstruction}`
							: `Original user goal: ${originalUserGoal}
Session chain summary:
${this.buildSessionChainSummary(currentMessages)}

Current completion score: ${lastCompletionScore}/100
Previous planned step: ${lastPlannedStep}
Suggested next step: ${roundProgress.nextStep}
Expected score if next step succeeds: ${roundProgress.expectedScoreIfSuccess}/100

Additional constraints: continue autonomously, stay focused on original task, avoid optional preference questions, and prioritize actual write completion.

${recoveryInstruction}`,
						timestamp: Date.now(),
					},
				];
			}

			if (exitReason !== 'completed' && hasWriteSuccess) {
				exitReason = 'completed';
				if (!fullResponse || !fullResponse.trim() || fullResponse.trim() === '(无内容)') {
					fullResponse = isChineseSession
						? `已完成写入并保存。${lastWriteSuccessSignal || ''}`.trim()
						: `Write operation completed successfully. ${lastWriteSuccessSignal || ''}`.trim();
				}
			}

			if (exitReason !== 'completed') {
				const isWriteLikeGoal = /write|save|创建|写入|保存|生成.*笔记|创建.*笔记/i.test(originalUserGoal);
				const scoreSuggestsDone = lastCompletionScore >= 95;
				const nextStepSuggestsDone = /^(none|none\s*\(task completed\)|task completed|completed|已完成|任务完成|无需继续|无)$/i
					.test((lastNextStepHint || '').trim());
				const reasonSuggestsDone = /(task completed|completed|已完成|任务完成|写入成功|保存成功|成功创建|successfully created|saved)/i
					.test(lastCompletionReason || '');
				const allowComplete = !isWriteLikeGoal || hasWriteSuccess;

				if (allowComplete && scoreSuggestsDone && (nextStepSuggestsDone || reasonSuggestsDone)) {
					exitReason = 'completed';
					if (!fullResponse || !fullResponse.trim() || fullResponse.trim() === '(无内容)') {
						fullResponse = isChineseSession
							? '任务已完成，结果已成功写入目标笔记。'
							: 'Task completed successfully and results were written to the target note.';
					}
				}
			}

			if (exitReason === 'max_turns') {
				const language = TaskCompletionGuard.detectUserLanguage(options.messages);
				fullResponse = language === 'zh'
					? '任务未完成：已达到自动执行轮次上限。当前流程仍在尝试工具调用，未完成最终写入。请调整可用工具后重试。'
					: 'Task not completed: the autonomous turn limit was reached before final write completion. Please adjust available tools and retry.';
			}
			
		// Phase 4: Memory is handled automatically by Mastra Agent
		// The underlying Mastra agent saves messages automatically during execution
		// No manual memory updates needed here
		
		const executionSummary = {
			autoTurns: Math.max(toolRound + recoveryRound + 1, 1),
			toolRounds: toolRound,
			recoveryRounds: recoveryRound,
			completed: exitReason === 'completed',
			exitReason,
			completionScore: lastCompletionScore,
		};

		// Call onComplete callback with response and execution summary
		if (options.onComplete) {
			const finalResponse: any = {
				content: fullResponse,
				executionSummary,
				awaitingToolConfirmation: exitReason === 'awaiting_confirmation',
				pendingToolCalls: pendingToolConfirmationCalls,
			};

			// For image generation, pass images through StreamingResponse format
			if (accumulatedImages.length > 0) {
				Logger.debug('[NormalModeAgent] Passing', accumulatedImages.length, 'images to onComplete');
				finalResponse.images = accumulatedImages;
			}

			options.onComplete(fullResponse, finalResponse);
		}
			
		} catch (error) {
			Logger.error('[NormalModeAgent] Execution failed:', error);
			
			// Call onError callback
			if (options.onError) {
				options.onError(error as Error);
			}
			
			throw error;
		}
	}
	
	/**
	 * Translate helper for i18n strings used by autonomous multi-turn prompts.
	 */
	private t(key: string, params: Record<string, string | number> = {}, fallback = ''): string {
		const i18n = (this as any).i18n as I18nManager | undefined;
		if (!i18n) {
			return fallback;
		}
		try {
			const translated = i18n.t(key, params);
			return translated || fallback;
		} catch {
			return fallback;
		}
	}

	private shouldExposeCurrentTimeTool(messages: ChatMessage[]): boolean {
		const lastUserMessage = [...messages]
			.reverse()
			.find(msg => msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim().length > 0);
		const text = (typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '').toLowerCase();
		if (!text) {
			return false;
		}
		return /当前时间|现在几点|现在时间|时间戳|timestamp|time now|current time|current date|what time|today's date|what date/.test(text);
	}

	private shouldKeepDiscoveryTools(messages: ChatMessage[]): boolean {
		const lastUserMessage = [...messages]
			.reverse()
			.find(msg => msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim().length > 0);
		const text = (typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '').toLowerCase();
		if (!text) {
			return false;
		}
		return /列出|查看目录|浏览|list notes|list files|read note|打开笔记|读取笔记|查看笔记/.test(text);
	}

	private extractOriginalUserGoal(messages: ChatMessage[]): string {
		const metadataAnchoredGoal = messages
			.filter(msg => msg.role === 'user')
			.map(msg => (typeof msg.metadata?.guidedInitialGoal === 'string' ? msg.metadata.guidedInitialGoal.trim() : ''))
			.find(goal => goal.length > 0);
		if (metadataAnchoredGoal) {
			return metadataAnchoredGoal;
		}

		const anchoredByContent = messages
			.filter((msg): msg is ChatMessage & { content: string } => msg.role === 'user' && typeof msg.content === 'string')
			.map(msg => {
				const match = msg.content.match(/(?:原始任务目标|Original task goal)\s*[:：]\s*(.+)/i);
				return match?.[1]?.trim() || '';
			})
			.find(goal => goal.length > 0);
		if (anchoredByContent) {
			return anchoredByContent;
		}

		const firstUser = messages.find(msg => msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim().length > 0);
		return (typeof firstUser?.content === 'string' ? firstUser.content.trim() : '') || this.t('ui.multiTurnUnknownUserGoal', {}, 'unknown goal');
	}

	private buildSessionChainSummary(messages: ChatMessage[], maxItems = 8): string {
		const items = messages
			.filter(msg => msg.role === 'user' || msg.role === 'assistant')
			.slice(-maxItems)
			.map((msg, idx) => {
				const role = msg.role === 'user' ? '用户' : '助手';
				const content = typeof msg.content === 'string'
					? this.truncateText(msg.content.replace(/\s+/g, ' ').trim(), 160)
					: '[non-text]';
				return `${idx + 1}. ${role}: ${content}`;
			});
		return items.join('\n') || '1. 用户: [empty]';
	}

	private truncateText(input: string, maxChars: number): string {
		if (input.length <= maxChars) {
			return input;
		}
		const omitted = input.length - maxChars;
		return `${input.slice(0, maxChars)}\n...[truncated ${omitted} chars]`;
	}

	private serializeForModel(value: unknown, maxChars = 6000): string {
		let raw = '';
		try {
			raw = typeof value === 'string' ? value : JSON.stringify(value);
		} catch {
			raw = String(value);
		}
		return this.truncateText(raw, maxChars);
	}

	private isWriteOperationSuccess(functionName: string, parsedArgs: unknown, result: { success: boolean }): boolean {
		if (!result.success) {
			return false;
		}
		const writeLikeToolNames = new Set([
			'create_note',
			'write_note',
			'append_note',
			'update_note',
			'create_file',
			'write_file',
			'append_file',
			'str_replace',
			RUN_LOCAL_COMMAND_TOOL,
		]);
		if (!writeLikeToolNames.has(functionName)) {
			return false;
		}
		if (functionName !== RUN_LOCAL_COMMAND_TOOL) {
			return true;
		}

		const command = this.extractCommandFromArgs(parsedArgs).toLowerCase();
		if (!command) {
			return false;
		}
		return /(>\s*["']?[^"'\n]+|>>\s*["']?[^"'\n]+|cat\s+>\s*|cat\s+>>\s*|tee\s+|echo\s+.+>\s*|touch\s+|sed\s+-i\s+)/.test(command);
	}

	private extractWriteSuccessSignal(functionName: string, parsedArgs: unknown): string {
		if (functionName !== RUN_LOCAL_COMMAND_TOOL) {
			return '';
		}
		const command = this.extractCommandFromArgs(parsedArgs);
		if (!command) {
			return '';
		}
		const pathMatch = command.match(/["']([^"']+\.md)["']/) || command.match(/>\s*([^\s]+\.md)/);
		if (pathMatch?.[1]) {
			return `目标文件：${pathMatch[1]}`;
		}
		return '';
	}

	private extractCommandFromArgs(parsedArgs: unknown): string {
		if (!parsedArgs || typeof parsedArgs !== 'object') {
			return '';
		}
		const candidate = (parsedArgs as Record<string, unknown>).command;
		return typeof candidate === 'string' ? candidate : '';
	}

	private mergeAssessments(
		heuristic: TaskCompletionAssessment,
		modelAssessment: TaskCompletionAssessment | null,
	): TaskCompletionAssessment {
		if (!modelAssessment) {
			return heuristic;
		}
		if (heuristic.status === 'blocked') {
			return heuristic;
		}
		if (modelAssessment.status === 'blocked') {
			return modelAssessment;
		}
		return modelAssessment;
	}

	private async evaluateCompletionWithModel(params: {
		provider: any;
		language: TaskLanguage;
		originalGoal: string;
		responseText: string;
		tools: UnifiedTool[];
		hasWriteSuccess: boolean;
	}): Promise<TaskCompletionAssessment | null> {
		const { provider, language, originalGoal, responseText, tools, hasWriteSuccess } = params;
		const evaluatorSystem = `You are a strict task-completion judge.
Return JSON only with shape: {"status":"completed|blocked|incomplete","score":0-100,"reason":"short reason"}.
Scoring rules:
- 85-100: task fully completed.
- 60-84: mostly complete but still missing non-trivial action.
- 0-59: incomplete or blocked.
- For write/create/save requests: only mark completed when write success is explicit.`;
		const evaluatorUser = language === 'zh'
			? `请评估任务是否完成，并打分。
原始目标：
${this.truncateText(originalGoal, 500)}

模型本轮回复：
${this.truncateText(responseText || '(无内容)', 2500)}

可用工具：
${tools.map(t => t.name).join(', ') || '(none)'}

写入成功信号（来自工具执行）：
${hasWriteSuccess ? 'yes' : 'no'}`
			: `Evaluate task completion and score it.
Original goal:
${this.truncateText(originalGoal, 500)}

Current model response:
${this.truncateText(responseText || '(empty)', 2500)}

Available tools:
${tools.map(t => t.name).join(', ') || '(none)'}

Write success signal from tool execution:
${hasWriteSuccess ? 'yes' : 'no'}`;

		try {
			const judgeResponse = await provider.sendMessage(
				[
					{
						id: `judge-${Date.now()}`,
						role: 'user',
						content: evaluatorUser,
						timestamp: Date.now(),
					},
				],
				undefined,
				evaluatorSystem,
			);
			const raw = (judgeResponse?.content || '').trim();
			const jsonText = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
			const parsed = JSON.parse(jsonText) as { status?: string; score?: number; reason?: string };
			const status = parsed.status === 'completed' || parsed.status === 'blocked' || parsed.status === 'incomplete'
				? parsed.status
				: 'incomplete';
			const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0;
			const reason = typeof parsed.reason === 'string' && parsed.reason.trim()
				? parsed.reason.trim()
				: 'model-evaluator-no-reason';
			return { status, score, reason };
		} catch (error) {
			Logger.warn('[NormalModeAgent] Model completion evaluation failed, fallback to heuristic', error);
			return null;
		}
	}

	private async evaluateRoundProgressWithModel(params: {
		provider: any;
		language: TaskLanguage;
		originalGoal: string;
		currentScore: number;
		lastPlannedStep: string;
		lastExpectedSuccessScore: number;
		responseText: string;
		latestEvidence: string;
		tools: UnifiedTool[];
		hasWriteSuccess: boolean;
	}): Promise<RoundProgressAssessment> {
		const {
			provider,
			language,
			originalGoal,
			currentScore,
			lastPlannedStep,
			lastExpectedSuccessScore,
			responseText,
			latestEvidence,
			tools,
			hasWriteSuccess,
		} = params;

		const evaluatorSystem = `You are a strict execution-progress judge for autonomous task completion.
Return JSON only:
{
  "previousStepSuccess": true|false|null,
  "updatedScore": 0-100,
  "taskCompleted": true|false,
  "completionReason": "short reason",
  "nextStep": "one concrete next action",
  "expectedScoreIfSuccess": 0-100
}
Rules:
- Judge whether previous planned step succeeded based on latest evidence/response.
- Update score from currentScore; do not jump unrealistically.
- For write/create/save tasks, taskCompleted=true only when write success is explicit.
- nextStep must be concrete and actionable, not generic.`;

		const evaluatorUser = language === 'zh'
			? `请评估当前执行轮次并输出JSON。
原始任务：
${this.truncateText(originalGoal, 500)}

当前分数：${currentScore}
上一步计划：${this.truncateText(lastPlannedStep, 300)}
上一步成功后的预期分数：${lastExpectedSuccessScore}

本轮模型回复：
${this.truncateText(responseText || '(无内容)', 2500)}

最新执行证据（工具结果/上下文）：
${this.truncateText(latestEvidence || '(无)', 2500)}

可用工具：
${tools.map(t => t.name).join(', ') || '(none)'}

写入成功信号：
${hasWriteSuccess ? 'yes' : 'no'}`
			: `Assess current execution round and output JSON.
Original task:
${this.truncateText(originalGoal, 500)}

Current score: ${currentScore}
Previous planned step: ${this.truncateText(lastPlannedStep, 300)}
Expected score if previous step succeeded: ${lastExpectedSuccessScore}

Current model response:
${this.truncateText(responseText || '(empty)', 2500)}

Latest evidence (tool results/context):
${this.truncateText(latestEvidence || '(none)', 2500)}

Available tools:
${tools.map(t => t.name).join(', ') || '(none)'}

Write success signal:
${hasWriteSuccess ? 'yes' : 'no'}`;

		const fallback: RoundProgressAssessment = {
			previousStepSuccess: null,
			updatedScore: Math.max(0, Math.min(100, currentScore)),
			taskCompleted: false,
			completionReason: language === 'zh' ? '模型评分失败，使用保守回退。' : 'Model scoring failed; using conservative fallback.',
			nextStep: language === 'zh' ? '继续调用与目标最相关的可用工具。' : 'Continue with the most relevant available tool call.',
			expectedScoreIfSuccess: Math.min(100, Math.max(currentScore + 10, currentScore)),
		};

		try {
			const judgeResponse = await provider.sendMessage(
				[
					{
						id: `judge-round-${Date.now()}`,
						role: 'user',
						content: evaluatorUser,
						timestamp: Date.now(),
					},
				],
				undefined,
				evaluatorSystem,
			);
			const raw = (judgeResponse?.content || '').trim();
			const jsonText = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
			const parsed = JSON.parse(jsonText) as Partial<RoundProgressAssessment>;

			const updatedScore = typeof parsed.updatedScore === 'number'
				? Math.max(0, Math.min(100, Math.round(parsed.updatedScore)))
				: fallback.updatedScore;
			const expectedScoreIfSuccess = typeof parsed.expectedScoreIfSuccess === 'number'
				? Math.max(updatedScore, Math.min(100, Math.round(parsed.expectedScoreIfSuccess)))
				: Math.max(updatedScore, fallback.expectedScoreIfSuccess);
			const nextStep = typeof parsed.nextStep === 'string' && parsed.nextStep.trim().length > 0
				? parsed.nextStep.trim()
				: fallback.nextStep;
			const completionReason = typeof parsed.completionReason === 'string' && parsed.completionReason.trim().length > 0
				? parsed.completionReason.trim()
				: fallback.completionReason;
			const previousStepSuccess = parsed.previousStepSuccess === true
				? true
				: parsed.previousStepSuccess === false
					? false
					: null;
			const taskCompleted = parsed.taskCompleted === true && (hasWriteSuccess || !/write|save|创建|写入|保存/i.test(originalGoal));

			return {
				previousStepSuccess,
				updatedScore,
				taskCompleted,
				completionReason,
				nextStep,
				expectedScoreIfSuccess,
			};
		} catch (error) {
			Logger.warn('[NormalModeAgent] Round progress evaluation failed, fallback', error);
			return fallback;
		}
	}

	/**
	 * Build default system prompt for normal mode
	 * This provides basic conversational guidance; tool instructions are appended
	 * dynamically when execute() receives normalTools.
	 */
	private buildDefaultSystemPrompt(): string {
		return `You are a helpful AI assistant integrated into Obsidian, a note-taking and knowledge management application.

Your role is to:
- Answer questions clearly and accurately
- Help users understand concepts and ideas
- Provide thoughtful analysis and insights
- Maintain context across the conversation
- Remember user preferences and past discussions

Guidelines:
1. Be concise but thorough - match response length to question complexity
2. Use markdown formatting when helpful (headings, lists, code blocks)
3. If you remember relevant past conversations, reference them naturally
4. If user preferences are known, respect them in your responses
5. If uncertain, say so clearly rather than guessing
6. Use the user's preferred language (match their input language)

Current context and user preferences are provided in the working memory above.
Relevant past conversations may be included for context.

Remember: You're having a natural conversation - be helpful, clear, and personable.`;
	}
	
	/**
	 * Set custom system prompt
	 * Call before initialize() to take effect
	 */
	setSystemPrompt(prompt: string): void {
		this.systemPrompt = prompt;
		Logger.debug('[NormalModeAgent] System prompt updated');
	}
	
	/**
	 * Get current system prompt
	 */
	getSystemPrompt(): string {
		return this.systemPrompt;
	}
}
