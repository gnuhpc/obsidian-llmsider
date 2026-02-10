import { ChatMessage, ChatSession } from '../../types';
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
			memoryEnabled: boolean
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
			
			// Create assistant message
			const assistantMessage: ChatMessage = {
				id: `${Date.now()}-${Math.random()}`,
				role: 'assistant',
				content: '',
				timestamp: Date.now(),
				metadata: {
					provider: provider.getProviderName(),
					model: provider.getModelName()
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
			
			// Prepare messages with memory context
			const messages = await prepareMessages(
				userMessage,
				stepIndicatorsEl,
				memoryContext,
				memoryMessages,
				memoryEnabled
			);
			
			// Execute normal mode agent
			Logger.debug('[NormalModeHandler] Executing agent with messages');
			await this.normalModeAgent.execute({
				messages,
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
					
					// Handle streaming response - support both string (old format) and object (new format)
					const delta = typeof chunk === 'string' ? chunk : chunk.delta;
					const metadata = typeof chunk === 'object' ? chunk.metadata : undefined;
					const hasImages = chunk.images && Array.isArray(chunk.images) && chunk.images.length > 0;
					
					// Skip if no content and no images
					if (!delta && !hasImages) return;
					
					// Add message to UI on first chunk (text or images)
					if (!workingMessageEl && assistantMessage) {
						// Remove step indicators as soon as we start receiving content
						if (stepIndicatorsEl) {
							removeStepIndicators(stepIndicatorsEl);
						}

						this.messageManager.addMessageToUI(assistantMessage, currentSession);
						this.messageManager.scrollToBottom();
						workingMessageEl = this.messageRenderer.findMessageElement(assistantMessage.id);
						Logger.debug('[NormalModeHandler] Created message element for streaming');
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
					}
					
					// Build complete display content (only when content changes)
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
					
					// Update assistant message with formatted content (including thinking callout)
					if (assistantMessage) {
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
					
					// Process Action mode responses for diff rendering
					await this.messageManager.processActionModeResponse(
						assistantMessage,
						fullResponse,
						'action',
						this.contextManager
					);
					
					// Update working message element to final state
					if (workingMessageEl) {
						// Check if we have images or need to re-render for tool calls
						const needsRerender = 
							(assistantMessage?.metadata?.generatedImages && assistantMessage.metadata.generatedImages.length > 0) ||
							this.messageRenderer.containsToolCallXML(answerContent || fullResponse);
							
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
					}
					
					// Update session
					currentSession.messages.push(assistantMessage);
					await this.plugin.updateChatSession(currentSession.id, {
						messages: currentSession.messages
					});
					
					// Auto-generate session title
					await autoGenerateSessionTitle(userMessage, assistantMessage);
					
					// Log conversation
					const streamDuration = Date.now() - streamStartTime;
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
