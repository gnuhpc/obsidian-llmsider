/**
 * Normal Mode Agent - Simple Q&A without tools
 * 
 * This agent extends MastraAgent to provide simple conversational capabilities
 * without tool execution. It focuses on:
 * - Direct Q&A responses
 * - Automatic Memory management (Working Memory + Conversation History)
 * - Semantic recall of relevant past conversations
 * - Streaming responses
 * 
 * Key differences from Plan-Execute Agent:
 * - No tools: tools = []
 * - No planning: direct LLM call
 * - Simpler prompts: focus on conversation quality
 * 
 * This replaces the manual Memory management in chat-view.ts normal mode.
 */

import { Logger } from '../../utils/logger';
import LLMSiderPlugin from '../../main';
import { ChatMessage } from '../../types';
import { I18nManager } from '../../i18n/i18n-manager';
import { MastraAgent, MastraAgentConfig } from './mastra-agent';
import { MemoryManager } from './memory-manager';
import type { ContextManager } from '../context-manager';
import { TokenManager } from '../../utils/token-manager';
import type { CoreMessage } from '@mastra/core';

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
	/** Abort controller for cancellation */
	abortController?: AbortController;
	/** Callback for streaming updates */
	onStream?: (chunk: string) => void;
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
		
	// Phase 3: Call LLM with streaming
		let fullResponse = '';
		let responseStarted = false;
		const accumulatedImages: any[] = [];
		Logger.info('[NormalModeAgent] 🎯 Calling LLM with streaming...');
		
		// Set thread ID on provider for session management (e.g. Free Qwen)

		if (threadId && provider.setThreadId) {
			provider.setThreadId(threadId);
		}

		await provider.sendStreamingMessage(
				conversationMessages,
				(chunk: any) => {
					// Handle streaming chunks - support both new (content) and old (delta) formats
					const textContent = chunk.content || chunk.delta;
					if (textContent) {
						if (!responseStarted) {
							responseStarted = true;
						}
						
						fullResponse += textContent;
					}
					
					// Accumulate images from chunks
					if (chunk.images && Array.isArray(chunk.images)) {
						Logger.debug('[NormalModeAgent] Received images in chunk:', chunk.images.length);
						accumulatedImages.push(...chunk.images);
					}
					
					// Call onStream callback - pass chunk with both text and accumulated images
					if (options.onStream) {
						const streamChunk = {
							delta: textContent || '',
							content: textContent || '',
							images: accumulatedImages.length > 0 ? [...accumulatedImages] : undefined
						};
						options.onStream(streamChunk);
					}
				},
				options.abortController?.signal,
				undefined, // tools
				combinedSystemMessage // systemMessage parameter
			);
			
		// Phase 4: Memory is handled automatically by Mastra Agent
		// The underlying Mastra agent saves messages automatically during execution
		// No manual memory updates needed here
		
		// Call onComplete callback with response and images
		if (options.onComplete) {
			// For image generation, pass images through StreamingResponse format
			if (accumulatedImages.length > 0) {
				Logger.debug('[NormalModeAgent] Passing', accumulatedImages.length, 'images to onComplete');
				// Create a final response object with images
				const finalResponse: any = {
					content: fullResponse,
					images: accumulatedImages
				};
				options.onComplete(fullResponse, finalResponse);
			} else {
				options.onComplete(fullResponse);
			}
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
	 * Build default system prompt for normal mode
	 * This provides basic conversational guidelines without tool instructions
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
