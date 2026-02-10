import { ChatMessage } from '../../types';
import LLMSiderPlugin from '../../main';
import { ContextManager } from '../../core/context-manager';
import { ToolExecutionManager } from '../../tools/tool-execution-manager';
import { Logger } from '../../utils/logger';

/**
 * Memory Context returned by initialization
 */
export interface MemoryContext {
	memoryContext: string;
	memoryMessages: ChatMessage[] | null;
	memoryEnabled: boolean;
}

/**
 * Callbacks for MemoryCoordinator
 */
export interface MemoryCoordinatorCallbacks {
	getCurrentSession: () => any | null;
	getSharedMemoryManager: () => any | null;
	setSharedMemoryManager: (manager: any | null) => void;
	getProvider: () => any | null;
}

/**
 * MemoryCoordinator
 * 
 * Unified manager for all Memory-related logic:
 * - Memory initialization for conversations
 * - Memory marker stripping from content
 * - Memory context management
 */
export class MemoryCoordinator {
	constructor(
		private plugin: LLMSiderPlugin,
		private contextManager: ContextManager,
		private toolExecutionManager: ToolExecutionManager,
		private callbacks: MemoryCoordinatorCallbacks
	) {}

	/**
	 * Strip memory update markers from content for display
	 * Markers are processed separately but should not be shown to users
	 * 
	 * During streaming, also truncate at the start of MEMORY_UPDATE to prevent
	 * flickering as the marker is gradually received
	 * 
	 * If content only contains memory markers, returns a friendly message
	 */
	public stripMemoryMarkers(content: string): string {
		const originalContent = content;
		
		// First, remove complete markers
		let cleaned = content.replace(/\[MEMORY_UPDATE\][\s\S]*?\[\/MEMORY_UPDATE\]/g, '');
		
		// Then, truncate at incomplete marker start to prevent flickering during streaming
		const incompleteMarkerIndex = cleaned.indexOf('[MEMORY_UPDATE]');
		if (incompleteMarkerIndex !== -1) {
			cleaned = cleaned.substring(0, incompleteMarkerIndex);
		}
		
		cleaned = cleaned.trim();
		
		// If content is now empty but original had memory markers, show friendly message
		if (!cleaned && originalContent.includes('[MEMORY_UPDATE]')) {
			return this.plugin.i18n.getCurrentLanguage() === 'zh' 
				? '✓ 已记住您提供的信息' 
				: '✓ Information saved to memory';
		}
		
		return cleaned;
	}

	/**
	 * Initialize memory for conversation
	 * Returns memory context, messages, and enabled status
	 */
	public async initializeMemoryForConversation(userMessage: ChatMessage): Promise<MemoryContext> {
		Logger.debug('[Memory] Starting memory initialization...');
		let memoryContext = '';
		let memoryMessages: ChatMessage[] | null = null;
		let memoryEnabled = false; // Track if Memory is actually enabled
		
		// Check if ANY memory feature is enabled
		const isAnyMemoryEnabled = this.plugin.settings.memorySettings.enableWorkingMemory 
			|| this.plugin.settings.memorySettings.enableConversationHistory 
			|| this.plugin.settings.memorySettings.enableSemanticRecall;
		
		if (!isAnyMemoryEnabled) {
			Logger.debug('[Memory] ❌ All Memory features disabled, skipping initialization');
			return { memoryContext, memoryMessages, memoryEnabled };
		}

		try {
			Logger.debug('[Memory] Getting memory manager...');
			const memoryManager = await this.plugin.getMemoryManager();
			
			if (!memoryManager) {
				Logger.warn('[Memory] Memory manager not available, skipping memory initialization');
				return { memoryContext, memoryMessages, memoryEnabled };
			}

			const currentSession = this.callbacks.getCurrentSession();
			if (!currentSession) {
				Logger.warn('[Memory] No current session, skipping memory initialization');
				return { memoryContext, memoryMessages, memoryEnabled };
			}

			const resourceId = this.plugin.getResourceId();
			const threadId = currentSession.id;
			
			Logger.debug(`[Memory] Creating thread for session: ${threadId}, resource: ${resourceId}`);
			
			// Ensure thread exists for this session (with error handling)
			try {
				await memoryManager.createThreadSimple({ resourceId, threadId });
			} catch (threadError) {
				Logger.warn('[Memory] Failed to create thread, continuing without thread context:', threadError);
			}
			
			// Query working memory to include in context
			try {
				const memory = await memoryManager.createMemorySimple({
					resourceId,
					threadId,
					enableWorkingMemory: this.plugin.settings.memorySettings.enableWorkingMemory,
					conversationHistoryCount: this.plugin.settings.memorySettings.conversationHistoryLimit || 10
				});
				
				// Mark Memory as enabled (successfully created)
				memoryEnabled = true;
				Logger.debug('[Memory] ✅ Memory enabled and initialized');
				
				// Only query conversation history if it's enabled
				if (this.plugin.settings.memorySettings.enableConversationHistory) {
					Logger.debug('[Memory] 🔍 Calling memory.query() with:', { threadId, resourceId });
					
					try {
						const result = await memory.query({
							threadId,
							resourceId,
							threadConfig: {
								workingMemory: { 
									enabled: this.plugin.settings.memorySettings.enableWorkingMemory, 
									scope: this.plugin.settings.memorySettings.workingMemoryScope 
								}
							}
						});
						
						Logger.debug('[Memory] 📊 Query result type:', typeof result);
						Logger.debug('[Memory] 📊 Query result keys:', result ? Object.keys(result) : 'null');
						Logger.debug('[Memory] 📊 Messages count:', result?.messages?.length || 0);
						
						// Store memory messages for use in prepareMessages
						// Convert Mastra ModelMessage to ChatMessage format
						if (result?.messages && result.messages.length > 0) {
							memoryMessages = result.messages.map((msg: any, idx: number) => ({
								id: msg.id || `memory-${idx}-${Date.now()}`,
								role: msg.role,
								content: msg.content,
								timestamp: msg.timestamp || Date.now(),
								metadata: msg.metadata
							}));
							Logger.debug('[Memory] 💾 Saved memory messages for context:', memoryMessages.length);
						} else {
							Logger.debug('[Memory] ℹ️  No conversation history yet (new thread or first message)');
						}
					} catch (queryError) {
						Logger.error('[Memory] ❌ Failed to query memory:', queryError);
						Logger.warn('[Memory] Continuing without conversation history');
					}
				} else {
					Logger.debug('[Memory] ℹ️  Conversation history disabled, skipping query');
				}
				
				// Get working memory separately (query() doesn't return it) - only if working memory is enabled
				if (this.plugin.settings.memorySettings.enableWorkingMemory) {
					try {
						const workingMemory = await memory.getWorkingMemory({ threadId, resourceId });
						if (workingMemory) {
							memoryContext = workingMemory;
							Logger.debug('[Memory] 📝 Retrieved working memory from resource:', {
								resourceId,
								length: memoryContext.length,
								preview: memoryContext.slice(0, 200)
							});
						} else {
							Logger.debug('[Memory] ℹ️  No working memory found for resource:', resourceId);
						}
					} catch (wmError) {
						Logger.warn('[Memory] ⚠️  Failed to get working memory:', wmError);
					}
				} else {
					Logger.debug('[Memory] ℹ️  Working memory disabled');
				}
				
				Logger.debug(`[Memory] ✅ Memory initialized successfully for session: ${threadId}, resource: ${resourceId}`);

				// Update ToolExecutionManager with memory context for conversation history
				if (this.toolExecutionManager && memoryManager && threadId) {
					try {
						this.toolExecutionManager.setMemoryContext(memoryManager, threadId);
						Logger.debug('[Memory] 🔧 Updated ToolExecutionManager with memory context');
					} catch (toolError) {
						Logger.warn('[Memory] ⚠️ Failed to update ToolExecutionManager:', toolError);
					}
				}

				// Update Provider with memory context for conversation history
				const provider = this.callbacks.getProvider();
				Logger.debug('[Memory] 🔍 About to update Provider...', {
					hasProvider: !!provider,
					hasMemoryManager: !!memoryManager,
					threadId,
					providerConstructorName: provider?.constructor?.name
				});
				if (provider && memoryManager && threadId) {
					try {
						provider.updateMemoryContext(memoryManager, threadId);
						Logger.debug('[Memory] 🔧 Updated Provider with memory context');
					} catch (providerError) {
						Logger.warn('[Memory] ⚠️ Failed to update Provider:', providerError);
					}
				} else {
					Logger.warn('[Memory] ⚠️ Cannot update Provider - missing requirements:', {
						hasProvider: !!provider,
						hasMemoryManager: !!memoryManager,
						hasThreadId: !!threadId
					});
				}
			} catch (memoryError) {
				Logger.error('[Memory] ❌ Failed to initialize memory:', memoryError);
				Logger.warn('[Memory] Continuing without memory support');
				memoryEnabled = false;
			}
		} catch (error) {
			Logger.error('[Memory] ❌ Failed to initialize memory:', error);
			if (error instanceof Error) {
				Logger.error('[Memory] Error details:', {
					name: error.name,
					message: error.message,
					stack: error.stack?.split('\n').slice(0, 3).join('\n')
				});
			}
			// Continue without memory - non-critical feature
		}

		return { memoryContext, memoryMessages, memoryEnabled };
	}
}
