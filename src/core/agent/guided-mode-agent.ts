/**
 * Guided Mode Agent - guided-assist conversation with tool confirmation
 * 
 * This agent extends MastraAgent to provide interactive guided-assist conversations:
 * - AI asks clarifying questions with options
 * - Tools require user confirmation before execution
 * - Automatic Memory management (Working Memory + Conversation History)
 * - Semantic recall of relevant past conversations
 * 
 * Key differences from Normal Mode Agent:
 * - Tools enabled: availableTools passed to agent
 * - Tool confirmation: requires user approval before execution
 * - Guided prompts: uses clarifying questions and options
 * 
 * Key differences from Plan-Execute Agent:
 * - No planning: direct conversation flow
 * - Interactive: user confirms each tool
 * - Simpler: no multi-step orchestration
 * 
 * ## Mastra Tool Integration
 * 
 * All tools in this system use the Mastra format (defined in mastra-tool-types.ts):
 * 
 * ```typescript
 * interface MastraTool {
 *   id: string;                              // Tool identifier
 *   description: string;                     // What the tool does
 *   inputSchema: z.ZodTypeAny;              // Zod schema for input validation
 *   outputSchema?: z.ZodTypeAny;            // Zod schema for output structure
 *   execute: (params: {
 *     context: z.infer<TInput>;             // Validated input parameters
 *     runtimeContext?: unknown;
 *     tracingContext?: unknown;
 *     abortSignal?: AbortSignal;
 *   }) => Promise<TOutput>;
 *   category?: string;
 * }
 * ```
 * 
 * ### Tool Execution Flow:
 * 
 * 1. **LLM suggests tool**: Provider returns tool calls with name and arguments
 * 2. **User confirmation**: `onToolSuggestion` callback prompts user
 * 3. **Tool execution**: `plugin.toolManager.executeTool(name, args)`
 *    - UnifiedToolManager handles routing to correct tool
 *    - For Mastra tools: args are wrapped as `{ context: args }` by tool-converter
 *    - Tool's execute() receives validated context via Zod schema
 * 4. **Result handling**: Success/error added to conversation history
 * 5. **Continue loop**: AI responds to tool results or suggests next tool
 * 
 * ### Creating Mastra Tools:
 * 
 * Use `createMastraTool` helper from tool-converter.ts:
 * 
 * ```typescript
 * export const myTool = createMastraTool({
 *   id: 'my_tool',
 *   description: 'Does something useful',
 *   inputSchema: z.object({
 *     param1: z.string().describe('First parameter'),
 *     param2: z.number().optional().describe('Optional number')
 *   }).describe('Tool input parameters'),
 *   outputSchema: z.object({
 *     result: z.string().describe('Operation result')
 *   }).describe('Tool output structure'),
 *   execute: async ({ context }) => {
 *     // context is validated and typed
 *     const { param1, param2 } = context;
 *     return { result: `Processed ${param1}` };
 *   }
 * });
 * ```
 * 
 * This replaces the manual tool confirmation in guided-mode-processor.ts.
 */

import { Logger } from '../../utils/logger';
import LLMSiderPlugin from '../../main';
import { ChatMessage } from '../../types';
import { I18nManager } from '../../i18n/i18n-manager';
import { MastraAgent, MastraAgentConfig } from './mastra-agent';
import { MemoryManager } from './memory-manager';
import { TokenManager } from '../../utils/token-manager';
import { UnifiedTool } from '../../tools/unified-tool-manager';
import { TaskCompletionGuard } from './task-completion-guard';

/**
 * Configuration for the guided-assist agent
 */
export interface GuidedModeAgentConfig extends Omit<MastraAgentConfig, 'instructions'> {
	/** Available tools for the agent */
	tools: Record<string, UnifiedTool>;
	/** Optional: Override default system prompt */
	systemPrompt?: string;
	/** Callback when AI suggests a tool (returns true if user confirms) */
	onToolSuggestion?: (toolCall: any) => Promise<boolean>;
}

/**
 * Options for executing the guided-assist conversation
 */
export interface GuidedModeExecuteOptions {
	/** User messages to process */
	messages: ChatMessage[];
	/** Original user goal captured when guided mode started */
	guidedInitialGoal?: string;
	/** Abort controller for cancellation */
	abortController?: AbortController;
	/** Callback for streaming updates */
	onStream?: (chunk: string) => void;
	/** Callback for tool suggestions (before execution) */
	onToolSuggested?: (toolCalls: any[]) => void;
	/** Callback for tool execution results */
	onToolExecuted?: (toolName: string, result: any) => void;
	/** Callback for tool execution errors (returns action to take) */
	onToolError?: (toolName: string, error: string) => Promise<'skip' | 'retry' | 'regenerate'>;
	/** Callback for complete response */
	onComplete?: (response: string) => void;
	/** Callback for errors */
	onError?: (error: Error) => void;
	/** Callback when compaction starts */
	onCompactionStart?: () => void;
	/** Callback when compaction completes */
	onCompactionComplete?: () => void;
}

/**
 * GuidedModeAgent - Extends MastraAgent for the guided-assist flow
 * 
 * This agent provides conversational AI with tool capabilities,
 * requiring user confirmation before tool execution:
 * - Working Memory: User preferences and context
 * - Conversation History: Past messages
 * - Semantic Recall: Relevant historical context
 * - Tool Confirmation: User approves each tool call
 * 
 * Usage:
 * ```typescript
 * const agent = new GuidedModeAgent({
 *   plugin,
 *   i18n,
 *   name: 'Guided Assistant',
 *   tools: availableTools,
 *   memoryManager: sharedMemoryManager,
 *   threadId: sessionId,
 *   onToolSuggestion: async (toolCall) => {
 *     // Show confirmation UI
 *     return await showToolConfirmationDialog(toolCall);
 *   }
 * });
 * 
 * await agent.initialize();
 * 
 * await agent.execute({
 *   messages: chatMessages,
 *   onStream: (chunk) => updateUI(chunk),
 *   onToolSuggested: (toolCalls) => showToolCards(toolCalls),
 *   abortController: controller
 * });
 * ```
 */
export class GuidedModeAgent extends MastraAgent {
	private systemPrompt: string;
	private onToolSuggestion?: (toolCall: any) => Promise<boolean>;
	private availableTools: Record<string, UnifiedTool>;
	
	constructor(config: GuidedModeAgentConfig) {
		// Call parent constructor with tools
		super({
			...config,
			tools: config.tools,
			name: config.name || 'Guided Assist Agent',
			instructions: '', // Will be set after initialization
		});
		
		this.availableTools = config.tools;
		this.onToolSuggestion = config.onToolSuggestion;
		
		// Set system prompt (will be used in instructions)
		this.systemPrompt = config.systemPrompt || this.buildDefaultSystemPrompt();
		
		Logger.debug('[GuidedModeAgent] Initialized with config:', {
			name: config.name,
			toolsCount: Object.keys(config.tools).length,
			hasMemoryManager: !!config.memoryManager,
			hasToolSuggestionCallback: !!config.onToolSuggestion,
			threadId: config.threadId,
			resourceId: config.resourceId
		});
	}
	
	/**
	 * Initialize the agent
	 * Must be called before execute()
	 */
	async initialize(config: MastraAgentConfig): Promise<void> {
		try {
			Logger.debug('[GuidedModeAgent] Starting initialization...');
			
			// Build instructions with system prompt
			const instructions = this.systemPrompt;
			
			// Initialize parent agent with instructions and tools
			await super.initialize({
				...config,
				tools: this.availableTools,
				name: config?.name || 'Guided Assist Agent',
				instructions,
			});
			
			Logger.debug('[GuidedModeAgent] Initialization complete');
		} catch (error) {
			Logger.error('[GuidedModeAgent] Initialization failed:', error);
			throw error;
		}
	}
	
	/**
	 * Detect the language of a text message
	 * Returns 'en' for English, 'zh' for Chinese
	 */
	private detectUserLanguage(text: string): 'en' | 'zh' {
		if (!text || text.trim().length === 0) return 'en'; // Default to English
		
		// If it contains any Chinese characters, assume Chinese
		if (/[\u4e00-\u9fa5]/.test(text)) {
			return 'zh';
		}
		
		return 'en'; // Default to English
	}

	private buildGuidedGoalAnchor(goal: string, userLanguage: 'en' | 'zh'): string {
		if (userLanguage === 'zh') {
			return `# 引导目标锚点
初始用户目标：${goal}

强制规则：
- 你后续的每一步提问、选项、工具调用和总结都必须直接服务这个初始目标。
- 即使用户后续只回复一个短句、点击某个选项，或讨论局部细节，也要把它理解为推进这个初始目标，而不是开启新任务。
- 不要被后续枝节带偏；如果用户输入看起来偏离目标，应把对话重新拉回到如何完成这个初始目标。
- 只有当用户明确表示要更换任务、放弃当前任务或开启全新目标时，才允许脱离这个初始目标。`;
		}

		return `# Guided Goal Anchor
Original user goal: ${goal}

Mandatory rules:
- Every follow-up question, option, tool call, and summary must directly advance this original goal.
- If the user later replies with a short answer, clicks an option, or discusses a detail, interpret it as progress on the same goal rather than a new task.
- Do not drift into side topics. If later input appears off-track, steer the conversation back to completing the original goal.
- Only leave this goal if the user explicitly says they want to switch tasks, abandon it, or start a brand-new objective.`;
	}

	private getToolCallName(toolCall: any): string {
		return toolCall?.function?.name || toolCall?.name || '';
	}

	/**
	 * Execute the guided-assist conversation
	 * 
	 * This method:
	 * 1. Retrieves relevant memory (working memory + semantic recall)
	 * 2. Calls LLM with streaming
	 * 3. If AI suggests tools, asks for user confirmation
	 * 4. Executes confirmed tools
	 * 5. Continues conversation with tool results (Looping until no more tools)
	 * 6. Updates memory automatically
	 */
	async execute(options: GuidedModeExecuteOptions): Promise<void> {
		try {
			Logger.debug('[GuidedModeAgent] Starting execution with', options.messages.length, 'messages');
			
			// Validate that we have a provider
			const provider = (this as any).provider;
			if (!provider) {
				throw new Error('No active LLM provider configured');
			}
			
			// Get memory manager
			const memoryManager = (this as any).memoryManager as MemoryManager;
			const memory = (this as any).memory;
			const threadId = (this as any).threadId;
			const resourceId = (this as any).resourceId;
			const plugin = (this as any).plugin as LLMSiderPlugin;
			
			// Set thread ID on provider for session management (e.g. Free Qwen)
			if (threadId && provider.setThreadId) {
				provider.setThreadId(threadId);
			}

			// Phase 1: Retrieve Memory context (working memory + conversation history)
			let memoryContext = '';
			let conversationHistory: ChatMessage[] = [];
			if (memoryManager && memory && threadId) {
				try {
					Logger.debug('[GuidedModeAgent] Retrieving memory context...');
					
					// Get working memory directly from memory instance
					try {
						const workingMemory = await memory.getWorkingMemory({ threadId, resourceId });
						if (workingMemory) {
							memoryContext += `# Working Memory (User Context)\n${workingMemory}\n\n`;
							Logger.debug('[GuidedModeAgent] Working memory retrieved');
						}
					} catch (wmError) {
						Logger.warn('[GuidedModeAgent] Failed to get working memory:', wmError);
					}
					
					// Get conversation history from MemoryManager's persistent storage
					try {
						if (memoryManager && plugin.settings.memorySettings.enableConversationHistory) {
							// Read conversation history directly from MemoryManager's storage
							const storedMessages = await memoryManager.getConversationMessages(threadId);
							
							if (storedMessages && storedMessages.length > 0) {
								// Convert stored messages to ChatMessage format
								conversationHistory = storedMessages.map((msg: any, idx: number) => ({
									id: msg.id || `memory-${idx}-${Date.now()}`,
									role: msg.role,
									content: msg.content,
									timestamp: msg.timestamp || Date.now(),
									metadata: msg.metadata
								}));
								
								// Apply history limit
								const limit = plugin.settings.memorySettings.conversationHistoryLimit || 10;
								if (conversationHistory.length > limit) {
									conversationHistory = conversationHistory.slice(-limit);
									Logger.debug('[GuidedModeAgent] Truncated conversation history to', limit, 'messages');
								} else {
									Logger.debug('[GuidedModeAgent] Retrieved conversation history from storage:', conversationHistory.length, 'messages');
								}
							} else {
								Logger.debug('[GuidedModeAgent] No conversation history found (new conversation)');
							}
						} else {
							Logger.debug('[GuidedModeAgent] Conversation history disabled');
						}
					} catch (historyError) {
						Logger.warn('[GuidedModeAgent] Failed to get conversation history:', historyError);
					}
					
					Logger.debug('[GuidedModeAgent] Memory context retrieved');
				} catch (error) {
					Logger.warn('[GuidedModeAgent] Failed to retrieve memory context:', error);
					// Continue without memory context
				}
			}
			
			// Phase 2: Build conversation messages
			// Extract system messages from options.messages (e.g. context from ChatView)
			let externalSystemContent = options.messages
				.filter(msg => msg.role === 'system')
				.map(msg => {
					if (typeof msg.content === 'string') return msg.content;
					if (Array.isArray(msg.content)) {
						return msg.content
							.filter(c => c.type === 'text')
							.map(c => (c as any).text)
							.join('\n');
					}
					return '';
				})
				.join('\n\n');

			// Clean up external system content to remove conflicting instructions
			// ChatView sends a full system prompt including "Basic Q&A mode" instructions
			// We only want the Context part
			if (externalSystemContent.includes('Context Information:')) {
				const contextIndex = externalSystemContent.indexOf('Context Information:');
				externalSystemContent = externalSystemContent.substring(contextIndex);
				
				// Remove the trailing "Remember:" block if present to avoid conflicting instructions
				const rememberIndex = externalSystemContent.lastIndexOf('Remember: Always respond to the user');
				if (rememberIndex > 0) {
					externalSystemContent = externalSystemContent.substring(0, rememberIndex);
				}
				
				Logger.debug('[GuidedModeAgent] Extracted context from system message:', externalSystemContent.length, 'chars');
			} else if (externalSystemContent.includes('## Related Content from Your Vault')) {
				// Fallback if Context Information header is missing but vector search exists
				const vectorIndex = externalSystemContent.indexOf('## Related Content from Your Vault');
				externalSystemContent = externalSystemContent.substring(vectorIndex);
				Logger.debug('[GuidedModeAgent] Extracted vector context from system message');
			} else {
				// If no context markers found, discard the external prompt to avoid conflicts
				// (unless it's very short, which might mean it's a custom error message or something)
				if (externalSystemContent.length > 500) { // Arbitrary threshold for "full system prompt"
					Logger.debug('[GuidedModeAgent] Discarding generic system prompt (no context found)');
					externalSystemContent = '';
				}
			}

			// Detect user's current language from the latest message
			const userMessages = options.messages.filter(m => m.role === 'user');
			const latestUserMessage = userMessages[userMessages.length - 1];
			const userLanguage = latestUserMessage ? this.detectUserLanguage(
				typeof latestUserMessage.content === 'string' 
					? latestUserMessage.content 
					: latestUserMessage.content.map(c => c.type === 'text' ? (c as any).text : '').join(' ')
			) : 'en';
			
			Logger.debug('[GuidedModeAgent] Detected user language:', userLanguage);

			// Add explicit language instruction to the system message
			let systemLanguageInstruction = '';
			if (userLanguage === 'en') {
				systemLanguageInstruction = '\n\n**CRITICAL LANGUAGE REQUIREMENT**: The user is communicating in ENGLISH. You MUST respond EXCLUSIVELY in ENGLISH. Do NOT use any other language.';
			} else if (userLanguage === 'zh') {
				systemLanguageInstruction = '\n\n**关键语言要求**：用户使用中文交流。你必须仅使用中文进行回复。严禁使用其他语言。';
			}

			const guidedGoalInstruction = options.guidedInitialGoal?.trim()
				? this.buildGuidedGoalAnchor(options.guidedInitialGoal.trim(), userLanguage)
				: '';

			// Combine memory context, internal system prompt, and external system messages
			const combinedSystemMessage = [
				memoryContext,
				this.systemPrompt,
				externalSystemContent,
				guidedGoalInstruction,
				systemLanguageInstruction,
				TaskCompletionGuard.buildExecutionGuardInstructions(
					options.messages,
					Object.values(this.availableTools),
					'guided',
				),
			].filter(Boolean).join('\n\n');
			
			// Build message list: conversation history + current user message
			// Filter out system messages from options.messages as they are handled separately in combinedSystemMessage
			const currentMessages = options.messages.filter(msg => msg.role !== 'system');
			
			// If we retrieved history from storage, we only need the latest message(s) from options.messages
			// (which are the ones not yet in storage)
			const newMessages = conversationHistory.length > 0 
				? currentMessages.filter(msg => !conversationHistory.some(h => h.id === msg.id))
				: currentMessages;

			let allMessages = [...conversationHistory, ...newMessages];
			let conversationMessages = allMessages.filter(msg => {
				// Check if message has valid content
				if (typeof msg.content === 'string') {
					return msg.content.trim().length > 0;
				} else if (Array.isArray(msg.content)) {
					return msg.content.length > 0 && msg.content.some(item => {
						if (item.type === 'text') return item.text && item.text.trim().length > 0;
						if (item.type === 'image') return true;
						return false;
					});
				}
				
				return false;
			});
			
			// Phase 2.5: Pre-send conversation compaction (if enabled)
			if (plugin.settings.memorySettings.enableCompaction) {
				try {
					// Calculate total tokens
					const contextTokens = TokenManager.estimateTokensForContext(combinedSystemMessage);
					const messageTokens = TokenManager.estimateTokensForMessages(conversationMessages);
					const totalTokens = contextTokens + messageTokens;
					
					const threshold = plugin.settings.memorySettings.compactionThreshold || 65536;
					
					Logger.debug('[GuidedModeAgent] Token check:', {
						totalTokens,
						threshold,
						contextTokens,
						messageTokens
					});
					
					if (totalTokens > threshold) {
						Logger.debug('[GuidedModeAgent] Token threshold exceeded, starting pre-send compaction...');
						
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
							Logger.debug('[GuidedModeAgent] Persistent memory updated with compacted messages');
						}
						
						// Notify UI that compaction is complete
						if (options.onCompactionComplete) {
							options.onCompactionComplete();
						}
						
						Logger.debug('[GuidedModeAgent] Pre-send compaction complete, new message count:', conversationMessages.length);
					}
				} catch (error) {
					Logger.error('[GuidedModeAgent] Pre-send compaction failed:', error);
					// Continue with uncompacted messages
				}
			}
			
			// Phase 3: Execution Loop (Handle chained tool calls)
			let fullResponse = '';
			let turnCount = 0;
			const MAX_TURNS = 5; // Prevent infinite loops
			
			Logger.debug('[GuidedModeAgent] Starting execution loop...');
			Logger.debug('[GuidedModeAgent] System message length:', combinedSystemMessage.length);
			Logger.debug('[GuidedModeAgent] Conversation messages count:', conversationMessages.length);
			Logger.debug('[GuidedModeAgent] Available tools count:', Object.keys(this.availableTools).length);
			
			while (turnCount < MAX_TURNS) {
				turnCount++;
				Logger.debug(`[GuidedModeAgent] Execution turn ${turnCount}`);
				
				let turnResponse = '';
				let responseStarted = false;
				let detectedToolCalls: any[] = [];
				let streamingCompleted = false;
				
				await provider.sendStreamingMessage(
					conversationMessages,
					(chunk: any) => {
						// Handle streaming chunks
						if (chunk.delta) {
							if (!responseStarted) {
								responseStarted = true;
								Logger.debug('[GuidedModeAgent] Streaming response started');
							}
							
							turnResponse += chunk.delta;
							
							// 在流式过程中继续传递文本内容，不管是否有工具调用
							// 这样可以让用户看到 AI 的解释文本
							if (options.onStream) {
								options.onStream(chunk.delta);
							}
						}
						
						// 静默收集工具调用，不在流式过程中触发回调
						if (chunk.toolCalls && chunk.toolCalls.length > 0) {
							detectedToolCalls = [...chunk.toolCalls];
						}
						
						// 标记流式是否完成
						if (chunk.isComplete) {
							streamingCompleted = true;
						}
					},
					options.abortController?.signal,
					Object.values(this.availableTools),
					combinedSystemMessage
				);
				
				// 流式完成后，统一处理工具调用
				streamingCompleted = true;
				
				fullResponse += turnResponse;
				
				// If the AI decided to call a tool but didn't provide an explanation (empty text),
				// we should generate a generic explanation to avoid empty message bubbles in the UI.
				if (!turnResponse.trim() && detectedToolCalls.length > 0) {
					const toolNames = detectedToolCalls.map(t => t.function?.name || t.name);
					let genericExplanation = "";
					
					if (toolNames.includes('fetch_web_content')) {
						genericExplanation = plugin.i18n.t('ui.fetchingWebContent');
					} else {
						const namesStr = toolNames.join(', ');
						genericExplanation = plugin.i18n.t('ui.usingTools', { tools: namesStr });
					}
					
					Logger.debug('[GuidedModeAgent] Empty text response with tools detected. Injecting explanation:', genericExplanation);
					
					turnResponse = genericExplanation;
					fullResponse += genericExplanation;
					
					// Stream this injected text to the UI so the bubble isn't empty
					if (options.onStream) {
						options.onStream(genericExplanation);
					}
				}
				
				// If no tool calls, consult the shared completion guard before stopping
				if (detectedToolCalls.length === 0) {
					const completionResolution = TaskCompletionGuard.resolveNextStep({
						messages: options.messages,
						tools: Object.values(this.availableTools),
						responseText: turnResponse,
						mode: 'guided',
						pendingToolCalls: 0,
					});
					Logger.debug('[GuidedModeAgent] Completion assessment:', completionResolution.assessment);

					if (!completionResolution.shouldContinue) {
						Logger.debug('[GuidedModeAgent] No tool calls in this turn, finishing execution');
						break;
					}

					if (!completionResolution.recoveryInstruction) {
						Logger.warn('[GuidedModeAgent] Completion guard requested continuation without a recovery instruction');
						break;
					}

					Logger.debug('[GuidedModeAgent] Completion guard requested another guided turn');
					conversationMessages.push({
						role: 'assistant',
						content: turnResponse || '',
					} as any);
					conversationMessages.push({
						role: 'user',
						content: completionResolution.recoveryInstruction,
					} as any);
					continue;
				}
				
				// Handle tool calls
				Logger.debug('[GuidedModeAgent] AI suggested', detectedToolCalls.length, 'tool(s)');
				Logger.debug('[GuidedModeAgent] Streaming completed:', streamingCompleted);

				const validToolCalls = detectedToolCalls.filter(toolCall => {
					const toolName = this.getToolCallName(toolCall);
					return Boolean(toolName) && Boolean(this.availableTools[toolName]);
				});
				const invalidToolCalls = detectedToolCalls.filter(toolCall => {
					const toolName = this.getToolCallName(toolCall);
					return !toolName || !this.availableTools[toolName];
				});

				if (invalidToolCalls.length > 0) {
					const invalidToolNames = invalidToolCalls
						.map(toolCall => this.getToolCallName(toolCall) || 'unknown')
						.join(', ');
					const allowedToolNames = Object.keys(this.availableTools).join(', ') || 'none';
					Logger.warn('[GuidedModeAgent] Ignoring unavailable tool calls:', {
						invalidToolNames,
						allowedToolNames,
					});

					let unavailableToolInstruction = '';
					if (userLanguage === 'zh') {
						unavailableToolInstruction = `你刚才请求了当前会话不可用的工具：${invalidToolNames}。当前真正可用的工具只有：${allowedToolNames}。严禁调用未出现在可用工具列表中的工具；如果没有合适工具，就直接继续引导用户。`;
					} else {
						unavailableToolInstruction = `You requested unavailable tools: ${invalidToolNames}. The only tools available in this conversation are: ${allowedToolNames}. Do not call tools outside that list; if no valid tool fits, continue by guiding the user without tools.`;
					}

					conversationMessages.push({
						role: 'user',
						content: unavailableToolInstruction,
					} as any);
				}

				if (validToolCalls.length === 0) {
					Logger.debug('[GuidedModeAgent] No valid tool calls remain after availability filtering');
					if (invalidToolCalls.length > 0) {
						continue;
					}
					break;
				}
				
				// 流式完成后，统一通知 UI 显示工具卡片
				// 此时 turnResponse 中的文本内容已经显示完毕
				if (options.onToolSuggested && streamingCompleted) {
					Logger.debug('[GuidedModeAgent] Notifying UI about tool suggestions after streaming completed');
					options.onToolSuggested(validToolCalls);
				}
				
				// Add the assistant's message (with tool calls) to history for the next turn
				// This ensures the LLM knows it asked for a tool
				conversationMessages.push({
					role: 'assistant',
					content: turnResponse || '' // Content might be empty if it's just a tool call
				} as any);
				
				let toolsExecuted = false;
				
				// Process each tool call
				for (const toolCall of validToolCalls) {
					try {
						// Ask for user confirmation
						let confirmed = true;
						if (this.onToolSuggestion) {
							confirmed = await this.onToolSuggestion(toolCall);
						}
						
						if (!confirmed) {
							Logger.debug('[GuidedModeAgent] User declined tool:', toolCall.function?.name || toolCall.name);
							
							// Add rejection message to history so AI knows
							conversationMessages.push({
								role: 'user',
								content: `User declined to execute tool: ${toolCall.function?.name || toolCall.name}`
							} as any);
							continue;
						}
						
						// Execute the tool
						// For Mastra tools: The tool manager internally handles the { context: args } wrapping
						// The tool converter (convertBuiltInToolToMastra) automatically extracts context in execute()
						const toolName = toolCall.function?.name || toolCall.name;
						const toolArgs = typeof toolCall.function?.arguments === 'string'
							? JSON.parse(toolCall.function.arguments)
							: (toolCall.function?.arguments || toolCall.arguments || {});
						
						Logger.debug('[GuidedModeAgent] Executing tool:', toolName, 'with args:', toolArgs);
						
						let shouldRetry = true;
						while (shouldRetry) {
							shouldRetry = false; // Default to no retry
							
							// Execute via UnifiedToolManager which handles both Mastra and legacy tools
							// Mastra tools receive args as { context: toolArgs } internally via tool-converter.ts
							const result = await plugin.toolManager.executeTool(toolName, toolArgs);
							
							if (result.success) {
								Logger.debug('[GuidedModeAgent] Tool executed successfully:', toolName);
								toolsExecuted = true;
								
								// Notify UI about tool execution
								if (options.onToolExecuted) {
									options.onToolExecuted(toolName, result.result);
								}
								
								// Add tool result message
								const toolResultContent = typeof result.result === 'string' 
									? result.result 
									: JSON.stringify(result.result, null, 2);
								
								// Create language-specific instruction
								let languageInstruction = '';
								if (userLanguage === 'en') {
									languageInstruction = '\n\n**CRITICAL LANGUAGE REQUIREMENT**: The user is communicating in ENGLISH. Even if the tool results above are in another language (like Chinese), you MUST synthesize the information and respond EXCLUSIVELY in ENGLISH. Do NOT use any other language in your final response.';
								} else if (userLanguage === 'zh') {
									languageInstruction = '\n\n**关键语言要求**：用户使用中文交流。即使上方的工具执行结果包含其他语言（如英文），你也必须将信息整合并仅使用中文进行回复。在最终回复中严禁使用其他语言。';
								}
								
								conversationMessages.push({
									role: 'user',
									content: `Tool ${toolName} executed successfully. Result:\n${toolResultContent}${languageInstruction}\n\nPlease follow this format for your response:
1. First, write a brief execution summary message (1 sentence)
2. Then provide the next step or guidance based on this result with options if needed.

Make sure the execution summary is natural and describes what was accomplished.`
								} as any);
								
							} else {
								Logger.error('[GuidedModeAgent] Tool execution failed:', toolName, result.error);
								
								// Notify UI about tool execution failure
								if (options.onToolExecuted) {
									options.onToolExecuted(toolName, { error: result.error, success: false });
								}
								
								// Handle error with user interaction if callback provided
								let action: 'skip' | 'retry' | 'regenerate' = 'skip';
								
								// Define languageInstruction for error handling
								let languageInstruction = '';
								if (userLanguage === 'en') {
									languageInstruction = '\n\n**CRITICAL LANGUAGE REQUIREMENT**: Respond EXCLUSIVELY in ENGLISH.';
								} else if (userLanguage === 'zh') {
									languageInstruction = '\n\n**关键语言要求**：仅使用中文回复。';
								}
								
								if (options.onToolError) {
									action = await options.onToolError(toolName, result.error);
								}
								
								if (action === 'retry') {
									Logger.debug('[GuidedModeAgent] User chose to retry tool:', toolName);
									shouldRetry = true;
								} else if (action === 'regenerate') {
									// Regenerate means we want the AI to rethink its strategy
									// We add the error message and let the loop continue, effectively "regenerating" the response
									conversationMessages.push({
										role: 'user',
										content: `Tool ${toolName} execution failed. Error: ${result.error}. Please try a different approach or tool.${languageInstruction}`
									} as any);
								} else {
									// Skip - just record the error and move on
									conversationMessages.push({
										role: 'user',
										content: `Tool ${toolName} execution failed. Error: ${result.error}${languageInstruction}`
									} as any);
								}
							}
						}
					} catch (error) {
						Logger.error('[GuidedModeAgent] Error processing tool call:', error);
						const toolName = toolCall.function?.name || toolCall.name || 'unknown';
						
						if (options.onToolExecuted) {
							options.onToolExecuted(toolName, { 
								error: error instanceof Error ? error.message : String(error), 
								success: false 
							});
						}
					}
				}
				
				// If no tools were executed (all declined), we might want to stop or let AI respond to declination
				// For now, we continue the loop so AI can respond to the results (or rejections)
				if (!toolsExecuted && validToolCalls.length > 0) {
					Logger.debug('[GuidedModeAgent] No tools were executed (all declined or failed)');
				}
				
				// Loop continues to get AI's response to the tool results
			}
			
			// Phase 4: Memory is handled automatically by Mastra Agent
			Logger.debug('[GuidedModeAgent] Memory handling delegated to Mastra Agent');
			
			// Call onComplete callback
			if (options.onComplete) {
				options.onComplete(fullResponse);
			}
			
			Logger.debug('[GuidedModeAgent] Execution completed successfully');
			
		} catch (error) {
			Logger.error('[GuidedModeAgent] Execution failed:', error);
			
			// Call onError callback
			if (options.onError) {
				options.onError(error as Error);
			}
			
			throw error;
		}
	}
	
	/**
	 * Build the default system prompt for the guided-assist flow
	 * This provides interactive guidance with clarifying questions
	 * 
	 * Note: All tools are now in Mastra format with Zod schemas:
	 * - inputSchema: Zod schema defining tool parameters
	 * - outputSchema: Zod schema defining expected output structure
	 * - execute: async ({ context, runtimeContext, abortSignal }) => result
	 *   where context contains the validated input parameters
	 */
	private buildDefaultSystemPrompt(): string {
		const availableToolNames = Object.keys(this.availableTools);
		const toolsList = availableToolNames.map(name => {
			const tool = this.availableTools[name];
			
			// Tools are now in Mastra format with:
			// - id: string (tool identifier)
			// - description: string
			// - inputSchema: Zod schema (z.object({...}))
			// - outputSchema?: Zod schema
			// - execute: async ({ context }) => result
			
			// UnifiedTool uses standard inputSchema and outputSchema properties
			const inputSchema = tool.inputSchema;
			const outputSchema = tool.outputSchema;
			
			let toolDesc = `## ${name}\n${tool.description || ''}\n`;
			
			// Add input parameters from UnifiedTool's JSON Schema format
			if (inputSchema && typeof inputSchema === 'object' && 'type' in inputSchema && inputSchema.type === 'object') {
				const schema = inputSchema as { type: string; properties?: Record<string, any>; required?: string[] };
				
				if (schema.properties && Object.keys(schema.properties).length > 0) {
					toolDesc += '\n### Parameters:\n';
					const required = schema.required || [];
					
					Object.entries(schema.properties).forEach(([paramName, paramSchema]: [string, any]) => {
						const isRequired = required.includes(paramName);
						const requiredLabel = isRequired ? ' (required)' : ' (optional)';
						const type = paramSchema.type || 'any';
						const desc = paramSchema.description || '';
						toolDesc += `  - ${paramName}${requiredLabel}: ${type}${desc ? ' - ' + desc : ''}\n`;
					});
				}
			}
			
			// Add output schema
			if (outputSchema) {
				toolDesc += '\n### Output Format:\n';
				
				// Check if outputSchema is a Zod schema (has _def property)
				if ((outputSchema as any)._def) {
					const zodDef = (outputSchema as any)._def;
					const zodDesc = zodDef.description;
					if (zodDesc) {
						toolDesc += `${zodDesc}\n`;
					}
					
					// Handle different Zod types
					const typeName = zodDef.typeName;
					
					if (typeName === 'ZodObject') {
						toolDesc += 'Returns: object\n';
						const shape = zodDef.shape();
						if (shape && typeof shape === 'object') {
							toolDesc += '\nExample Output:\n{\n';
							Object.entries(shape).forEach(([fieldName, fieldZod]: [string, any]) => {
								const fieldDesc = (fieldZod as any)._def?.description || '';
								const fieldType = (fieldZod as any)._def?.typeName || 'any';
								toolDesc += `  "${fieldName}": ${fieldDesc ? `// ${fieldDesc}` : `// ${fieldType}`}\n`;
							});
							toolDesc += '}\n';
						}
					} else if (typeName === 'ZodArray') {
						toolDesc += 'Returns: array';
						const elementType = zodDef.type;
						if ((elementType as any)?._def) {
							const elemTypeName = (elementType as any)._def.typeName;
							const elemDesc = (elementType as any)._def.description;
							if (elemTypeName === 'ZodString') {
								toolDesc += ' of string';
								if (elemDesc) {
									toolDesc += ` (${elemDesc})`;
								}
							} else if (elemTypeName === 'ZodObject') {
								toolDesc += ' of object\n';
								const shape = (elementType as any)._def.shape();
								if (shape && typeof shape === 'object') {
									toolDesc += '\nExample Output:\n[\n  {\n';
									Object.entries(shape).forEach(([fieldName, fieldZod]: [string, any]) => {
										const fieldDesc = (fieldZod as any)._def?.description || '';
										toolDesc += `    "${fieldName}": ${fieldDesc ? `// ${fieldDesc}` : ''}\n`;
									});
									toolDesc += '  }\n]\n';
								}
							} else {
								toolDesc += ` of ${elemTypeName}`;
							}
						}
						toolDesc += '\n';
					} else if (typeName === 'ZodString') {
						toolDesc += 'Returns: string\n';
					} else if (typeName === 'ZodNumber') {
						toolDesc += 'Returns: number\n';
					} else if (typeName === 'ZodBoolean') {
						toolDesc += 'Returns: boolean\n';
					} else {
						toolDesc += `Returns: ${typeName}\n`;
					}
				} 
				// Fallback to JSON Schema format
				else if ((outputSchema as any).type) {
					if ((outputSchema as any).description) {
						toolDesc += `${(outputSchema as any).description}\n`;
					}
					
					if ((outputSchema as any).type === 'object' && (outputSchema as any).properties) {
						toolDesc += 'Returns object with fields:\n';
						Object.entries((outputSchema as any).properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
							const fieldType = (fieldSchema as any).type || 'any';
							const fieldDesc = (fieldSchema as any).description || '';
							toolDesc += `  - ${fieldName}: ${fieldType}${fieldDesc ? ' - ' + fieldDesc : ''}\n`;
							
							// If field is an array with nested object properties, show them
							if (fieldType === 'array' && (fieldSchema as any).items?.type === 'object' && (fieldSchema as any).items?.properties) {
								toolDesc += `    Array items contain:\n`;
								Object.entries((fieldSchema as any).items.properties).forEach(([itemFieldName, itemFieldSchema]: [string, any]) => {
									const itemFieldType = (itemFieldSchema as any).type || 'any';
									const itemFieldDesc = (itemFieldSchema as any).description || '';
									toolDesc += `      • ${itemFieldName}: ${itemFieldType}${itemFieldDesc ? ' - ' + itemFieldDesc : ''}\n`;
								});
							}
						});
					} else if ((outputSchema as any).type === 'array' && (outputSchema as any).items) {
						toolDesc += `Returns: array\n`;
						if ((outputSchema as any).items.type === 'object' && (outputSchema as any).items.properties) {
							toolDesc += 'Array items contain:\n';
							Object.entries((outputSchema as any).items.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
								const fieldType = (fieldSchema as any).type || 'any';
								const fieldDesc = (fieldSchema as any).description || '';
								toolDesc += `  - ${fieldName}: ${fieldType}${fieldDesc ? ' - ' + fieldDesc : ''}\n`;
							});
						}
					} else if ((outputSchema as any).type === 'string') {
						toolDesc += `Returns: string\n`;
					}
				}
			}
			
			return toolDesc;
		}).join('\n\n');
		
		return `<role>
You are an AI assistant in **Guided Assist** - an interactive, step-by-step assistant integrated into Obsidian.
Your goal is to help the user achieve the original intent with the minimum necessary friction.
Break work into steps only when that helps completion. Ask follow-up questions only when they are truly necessary. If the intent is already clear enough, act or answer directly.
</role>
<language_instruction>
**CRITICAL**: You MUST respond in the SAME language as the user's **LATEST** message.
- **Rule 1**: If the user's LATEST message is in English, your ENTIRE response MUST be in English.
- **Rule 2**: If the user's LATEST message is in Chinese, your ENTIRE response MUST be in Chinese.
- **Rule 3**: IGNORE the language of previous conversation history. Only the latest user message matters.
- **Rule 4**: IGNORE the language of tool results. If tool results are in English but the user asked in Chinese, you MUST translate/summarize them in Chinese.
- **Rule 5**: Do NOT mix languages. Do not use English for options if the user asked in Chinese, and vice versa.
</language_instruction>
<primary_objective>
- Stay tightly focused on completing the user's intent.
- Measure every turn against one question: "Does this move the user closer to completion?"
- If the goal is already achieved, stop asking follow-up questions and give the completed result or a concise completion update.
- Do not keep the conversation open artificially once the task is done.
</primary_objective>
<response_logic>
You must choose one of two response types for every turn:

### Type 1: Provide Options (Decision Point)
Use this only when you need user input that is genuinely required, or when there are multiple meaningful ways to proceed.
1.  **Brief Context**: One sentence acknowledging the situation.
2.  **Guiding Question**: Ask what the user wants to do.
3.  **Options**: Provide 2-4 clickable options using \`➤CHOICE:\`.

### Type 2: Execute Tool (Action Point)
Use this when the user's intent is clear enough and a tool can move the task forward.
1.  **Explanation**: One sentence explaining what you are about to do.
2.  **Tool Call**: Execute the tool (ONLY if the required information is NOT already available in the 'Context Information' section).
3.  **Follow-up**: After the tool result, either finish the task if the intent is satisfied, or ask for the single next missing decision.
</response_logic>

<goal_discipline>
- The first user prompt in the guided flow defines the primary objective.
- Later questions, options, and tool usage must stay centered on that objective unless the user explicitly changes it.
- Do not let option clicks or short follow-up replies silently redefine the task.
- Do not expand the scope on your own.
- Prefer completing the current objective over exploring side branches.
</goal_discipline>

<clarification_policy>
- Ask a follow-up question only if a required parameter is missing and cannot be safely inferred from:
  1. the user's latest request,
  2. prior guided turns,
  3. the existing context,
  4. obvious sensible defaults.
- Ask for one missing thing at a time.
- Do not ask broad "what do you want?" style questions if the user already stated a concrete task.
- If a reasonable default exists, use it and proceed.
</clarification_policy>

<completion_policy>
- Continuously judge whether the user's original intent has already been achieved.
- If yes, provide the result and stop.
- Do not ask another question merely to keep the guided flow going.
- After a successful tool result, prefer synthesizing and finishing over opening a new decision loop unless the next user choice is actually required.
</completion_policy>

<tool_policy>
- First analyze the user's intent and the currently available tools.
- If no tool is needed, answer directly in guided style.
- If tools are available and useful, use them only when they clearly advance the user's goal.
- If no relevant tool is available, continue guiding without pretending that a tool is required.
- Never require a tool call just because tools exist.
</tool_policy>

<critical_workflow name="Search & Research">
**Trigger**: User asks for latest info, news, or specific topics.

**Process**:

**Step 1 - Search for URLs**:
- **PREFERRED**: Call \`enhanced_search\` for comprehensive multi-engine results with better quality.
- Fallback: Use \`web_search\` only if \`enhanced_search\` is not available.
- Explain: "I will search for [topic]..."

**Step 2 - Present Results & Ask for Confirmation**:
- Show a brief summary of the search results (titles/snippets if available).
- **Ask the user** if they would like to fetch the full content of the most relevant pages to provide a deeper analysis.
- Provide options (Type 1) like "Fetch top results", "Search for something else", or "Summarize based on snippets only".

**Step 3 - Fetch Content (Only if confirmed)**:
- If user chooses to fetch, call \`fetch_web_content\` with the selected URLs.
- Pass URLs as an array: \`{"url": ["url1", "url2", "url3"]}\`.

**Step 4 - Synthesize**:
- Once content is fetched, read and analyze the actual page content.
- Summarize key findings and provide next options.
</critical_workflow>

<workflow name="Content Creation">
**Trigger**: User wants to write a note, summary, or article.
**Process**:
1.  **Clarify**: Ask about format, tone, or specific requirements (Type 1).
2.  **Draft**: Generate the content.
3.  **Save**: Ask where to save it or use \`create\` tool if location is known/confirmed.
</workflow>

<rules>
### Context Prioritization Rules
1. **Check Context First**: Before calling any tool to read notes, files, or search results, ALWAYS check the 'Context Information' section at the end of this prompt.
2. **Avoid Redundant Calls**: If the file content or information needed to answer the user's request is already present in the context, use it directly to provide Type 1 Options or generate content.
3. **Exception**: Only call a 'read' tool if the context explicitly states it is truncated or if you need a more up-to-date version of a file that you know has changed.

### Formatting Rules
1. **Option Format**:
   \`\`\`text
   ➤CHOICE:SINGLE
   ➤CHOICE: Option 1
   ➤CHOICE: Option 2
   \`\`\`
2. **Tool Call Rules**:
   - **Explanation First**: Always explain *why* you are calling a tool before calling it.
   - **No Empty Responses**: Never send an empty message.
   - **No Fake Calls**: Never say "I will call X" without actually generating the tool call.
3. **Question Discipline**:
   - Ask the fewest questions needed to complete the task.
   - Avoid repeated clarification if the answer is already available from context or earlier turns.
   - Do not ask a new question after the user's intent has been satisfied.

### Anti-Patterns (Common Mistakes)
*   ❌ **Do NOT** call a tool to read a file if its content is already in the 'Context Information' section.
*   ❌ **Do NOT** output raw JSON arrays of URLs (e.g., \`[{"url": "..."}]\`) as text.
*   ❌ **Do NOT** fetch web content automatically without asking the user first in the Search workflow.
*   ❌ **Do NOT** ask "Is this okay?" without providing \`➤CHOICE\` options.
*   ❌ **Do NOT** loop endlessly; if you have enough info, act.
*   ❌ **Do NOT** keep asking exploratory questions after the user intent is already fulfilled.
*   ❌ **Do NOT** drift into side tasks that are not necessary for completing the current goal.
</rules>

<example>
**User**: "What's the latest news about Tesla?"

**You (Step 1)**: "I will search for latest Tesla news..."
[Call enhanced_search]

**You (Step 2)**: "I found several interesting links about Tesla's recent developments. Would you like me to fetch the full content of these pages for a detailed summary?
➤CHOICE:SINGLE
➤CHOICE: Fetch and summarize top results
➤CHOICE: Just give me a quick summary from snippets
➤CHOICE: Search for something else"

**You (Step 3)**: (If user chose fetch) "I am fetching the content now..."
[Call fetch_web_content with URL array]
</example>

<available_tools>
${toolsList}
</available_tools>`;
	}
	
	/**
	 * Set custom system prompt
	 * Call before initialize() to take effect
	 */
	setSystemPrompt(prompt: string): void {
		this.systemPrompt = prompt;
		Logger.debug('[GuidedModeAgent] System prompt updated');
	}
	
	/**
	 * Get current system prompt
	 */
	getSystemPrompt(): string {
		return this.systemPrompt;
	}
	
	/**
	 * Set tool suggestion callback
	 * This allows dynamic configuration of tool confirmation UI
	 */
	setToolSuggestionCallback(callback: (toolCall: any) => Promise<boolean>): void {
		this.onToolSuggestion = callback;
		Logger.debug('[GuidedModeAgent] Tool suggestion callback updated');
	}
}
