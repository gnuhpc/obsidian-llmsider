import { ItemView, WorkspaceLeaf, Notice, TFile, setIcon } from 'obsidian';
import { Logger } from './../utils/logger';
import { CHAT_VIEW_TYPE, ChatMessage, ChatMode, ChatSession, LLMConnection, LLMModel } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';
import { TokenManager } from '../utils/token-manager';
import LLMSiderPlugin from '../main';
import { MessageRenderer } from './message-renderer';
import { DiffProcessor } from '../utils/diff-processor';
import { ContextManager } from '../core/context-manager';
import { InputHandler } from './input-handler';
import { PlanExecuteProcessor } from '../plan-execute/plan-execute-processor';
import { GuidedModeProcessor } from '../processors/guided-mode-processor';
import { ToolExecutionManager } from '../tools/tool-execution-manager';
import { UIBuilder } from './ui-builder';
import { MessageManager } from './message-manager';
import { SessionManager } from '../core/session-manager';
import { StreamManager } from '../core/stream-manager';
import { I18nManager } from '../i18n/i18n-manager';
import { ToolResultCard, ToolResultData } from './tool-result-card';
import { conversationLogger } from '../utils/conversation-logger';
import { ProviderTabsManager } from './provider-tabs';
import { SuggestedFilesManager, SuggestedFile } from './suggested-files-manager';

export class ChatView extends ItemView {
	plugin: LLMSiderPlugin;
	i18n: I18nManager;
	currentSession: ChatSession | null = null;

	// UI Elements
	messageContainer!: HTMLElement;
	inputContainer!: HTMLElement;
	inputElement!: HTMLTextAreaElement;
	sendButton!: HTMLElement;
	stopButton!: HTMLElement;
	providerSelect!: HTMLSelectElement;
	contextDisplay!: HTMLElement;

	// Manager components
	private uiBuilder: UIBuilder;
	private messageRenderer: MessageRenderer;
	private diffProcessor: DiffProcessor;
	private contextManager: ContextManager;
	private messageManager!: MessageManager;
	private sessionManager!: SessionManager;
	private streamManager!: StreamManager;
	private inputHandler!: InputHandler;
	private planExecuteProcessor!: PlanExecuteProcessor;
	private guidedModeProcessor!: GuidedModeProcessor;
	private toolExecutionManager!: ToolExecutionManager;
	private providerTabsManager!: ProviderTabsManager;
	private suggestedFilesManager!: SuggestedFilesManager;
	
	// Suggested files tracking
	private activeSuggestions: Map<string, { timeout: number; element: HTMLElement }> = new Map();

	// Event listener cleanup
	private uiEventListeners: Map<string, (event: any) => void> = new Map();
	private languageChangeListener?: (language: string) => void;
	
	// Track stopped message IDs to prevent updates after stop
	private stoppedMessageIds: Set<string> = new Set();

	constructor(leaf: WorkspaceLeaf, plugin: LLMSiderPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.i18n = plugin.getI18nManager()!;

		// Initialize core components
		this.uiBuilder = new UIBuilder(plugin, this.containerEl);
		this.messageRenderer = new MessageRenderer(this.app, plugin);
		this.diffProcessor = new DiffProcessor(this.app, plugin);
		this.contextManager = new ContextManager(this.app, plugin.getMCPManager() || undefined, plugin.getI18nManager() || undefined);
	}

	getViewType(): string {
		return CHAT_VIEW_TYPE;
	}

	getDisplayText() {
		return this.i18n.t('pluginName') + ' Chat';
	}

	getIcon(): string {
		return 'message-circle';
	}

	async onOpen() {
		this.containerEl.empty();

		// Clear context manager on view open/reload to prevent stale context
		// This ensures a clean state after plugin reload or view reopen
		Logger.debug('Clearing context manager on view open');
		this.contextManager.clearContext();

		// Build UI using UIBuilder
		const uiComponents = this.uiBuilder.buildChatInterface();
		this.messageContainer = uiComponents.messageContainer;
		this.inputContainer = uiComponents.inputContainer;
		this.inputElement = uiComponents.inputElement;
		this.sendButton = uiComponents.sendButton;
		this.stopButton = uiComponents.stopButton;
		this.providerSelect = uiComponents.providerSelect;
		this.contextDisplay = uiComponents.contextDisplay;

		// Initialize provider tabs manager (will be inserted dynamically)
		const tabsWrapperEl = this.containerEl.createDiv();
		this.providerTabsManager = new ProviderTabsManager(this.plugin, tabsWrapperEl);

		// Initialize suggested files manager
		this.suggestedFilesManager = new SuggestedFilesManager(
			this.app,
			this.plugin
		);

		// Initialize managers with actual UI elements
		this.messageManager = new MessageManager(
			this.plugin,
			this.messageContainer,
			this.messageRenderer,
			this.diffProcessor
		);

		this.sessionManager = new SessionManager(this.plugin, this.messageContainer);

		this.streamManager = new StreamManager(
			this.sendButton,
			this.stopButton,
			this.inputElement
		);
		this.streamManager.setStopHandler(() => this.handleStopStreaming());

		this.toolExecutionManager = new ToolExecutionManager(this.plugin, this.messageContainer);
		this.planExecuteProcessor = new PlanExecuteProcessor(this.plugin, this.toolExecutionManager, this.messageContainer);
		this.guidedModeProcessor = new GuidedModeProcessor(this.plugin, this.messageContainer);

		// Set up Final Answer callback for streaming display
		this.planExecuteProcessor.setFinalAnswerCallback((message: ChatMessage) => {
			this.handleFinalAnswerMessage(message);
		});

		// Set up Plan Created callback for saving plan data
		this.planExecuteProcessor.setPlanCreatedCallback((planData: any, tasks: any[]) => {
			this.handlePlanCreated(planData, tasks);
		});

		this.inputHandler = new InputHandler(
			this.app,
			this.plugin,
			this.contextManager,
			this.inputElement,
			this.sendButton,
			this.providerSelect,
			this.contextDisplay,
			this.inputContainer
		);

		// Initialize and set up callbacks
		await this.inputHandler.initialize();
		this.inputHandler.setOnSendMessage((content) => this.handleSendMessage(content));
		this.inputHandler.updateProviderSelect();
		this.uiBuilder.updateProviderButtonPublic(); // Update provider button display

		// Set up session loading callback
		this.sessionManager.setOnSessionLoadedCallback((session) => this.handleSessionLoaded(session));

		// Initialize session and render messages
		await this.initializeSession();
		
		this.updateContextDisplay();
		this.setupUIEventListeners();

		// Set up language change listener
		this.languageChangeListener = (language: string) => {
			// Refresh the UI when language changes
			setTimeout(() => {
				this.onOpen(); // Rebuild the entire UI
			}, 100);
		};
		this.i18n.onLanguageChange(this.languageChangeListener);

		// Delayed initialization to ensure DOM is ready
		setTimeout(() => {
			this.messageManager.scrollToBottom();
			this.messageManager.refreshMessageActions(this.currentSession);
			this.messageManager.refreshDiffRendering(this.currentSession);
		}, 300);
	}

	async onClose() {
		this.cleanupEventListeners();

		// Clean up suggestions
		this.clearAllSuggestions();

		// Clean up language change listener
		if (this.languageChangeListener) {
			this.i18n.offLanguageChange(this.languageChangeListener);
			this.languageChangeListener = undefined;
		}

		this.inputHandler?.destroy();
		this.containerEl.empty();
	}

	/**
	 * Clear all active suggestions
	 */
	private clearAllSuggestions(): void {
		this.activeSuggestions.forEach((suggestion) => {
			clearTimeout(suggestion.timeout);
		});
		this.activeSuggestions.clear();
	}

	/**
	 * Initialize session using SessionManager
	 */
	private async initializeSession() {
		this.currentSession = await this.sessionManager.initializeSession();
		this.messageManager.renderMessages(this.currentSession);
		
		// Update session name in header
		this.uiBuilder.updateSessionNameDisplay(this.currentSession.name);
	}

	/**
	 * Handle sending a new message
	 */
	private async handleSendMessage(content: string, metadata?: Record<string, any>) {
		if (!this.currentSession) return;

		// Create user message
		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			role: 'user',
			content: content,
			timestamp: Date.now(),
			metadata: {
				provider: this.plugin.settings.activeProvider,
				...metadata
			}
		};

		// Add to UI and session
		this.messageManager.addMessageToUI(userMessage, this.currentSession);
		this.messageManager.scrollToBottom();

		this.currentSession.messages.push(userMessage);
		await this.plugin.updateChatSession(this.currentSession.id, {
			messages: this.currentSession.messages
		});

		// Get AI response
		await this.getAIResponse(userMessage);
	}

	/**
	 * Get AI response using providers and tools
	 */
	private async getAIResponse(userMessage: ChatMessage) {
		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			await this.messageManager.addMessage({
				id: Date.now().toString(),
				role: 'system',
				content: this.i18n.t('errors.noProvider'),
				timestamp: Date.now()
			}, this.currentSession);
			return;
		}

		// Declare variables outside try-catch for error handling access
		let assistantMessage: ChatMessage | null = null;
		let workingMessageEl: HTMLElement | null = null;
		let stepIndicatorsEl: HTMLElement | null = null;

		try {
			// Check if auto-search is enabled (not just vector DB loaded)
			const isVectorSearchEnabled = this.plugin.settings.vectorSettings.autoSearchEnabled;
			
			// Create step indicators if vector search is enabled
			if (isVectorSearchEnabled) {
				stepIndicatorsEl = this.createStepIndicators();
			}
			
			// Prepare messages for LLM (this includes vector search if enabled)
			const messages = await this.prepareMessages(userMessage, stepIndicatorsEl);
			
			// Check conversation mode and route accordingly
			const conversationMode = this.plugin.settings.conversationMode || 'normal';
			
			// Route to Guided Mode
			if (conversationMode === 'guided') {
				await this.handleGuidedMode(userMessage, messages);
				return;
			}

			// Get available tools using unified tool manager - only in Agent mode
			// NOTE: This is called on EVERY message send, ensuring the latest enabled/disabled tool list is used
			let availableTools: UnifiedTool[] = [];
			if (this.plugin.settings.agentMode || conversationMode === 'agent') {
				try {
					const toolManager = this.plugin.getToolManager();
					if (toolManager) {
						availableTools = await toolManager.getAllTools();
						Logger.debug(`⚡ Real-time tool fetch: ${availableTools.length} enabled tools for this request`);
						Logger.debug('Retrieved tools for Agent mode:', availableTools.map(t => ({ name: t.name, schemaType: t.inputSchema?.type })));
					}
				} catch (error) {
					Logger.warn('Failed to get tools:', error);
				}
			} else {
				Logger.debug('Non-Agent mode: No tools will be provided to the LLM');
			}

			// Check if we should use plan-execute framework (only if agent mode is enabled)
			if (this.plugin.settings.agentMode && this.shouldUsePlanExecuteFramework(userMessage.content as string, availableTools)) {
				// Start streaming mode with stop button for plan-execute
				const streamController = this.streamManager.startStreaming();

				// Set up stop handler for plan-execute
				this.streamManager.setStopHandler(() => {
					Logger.debug('Plan-Execute stopped by user');
					this.planExecuteProcessor.stop();
					this.streamManager.resetButtonStates();
				});

				try {
					await this.planExecuteProcessor.startPlanExecuteFlow(userMessage.content as string, messages, streamController);
				} finally {
					// Always reset button states when plan-execute completes or fails
					this.streamManager.resetButtonStates();
				}
				return;
			}

			// Start streaming response
			assistantMessage = {
				id: Date.now().toString(),
				role: 'assistant',
				content: '',
				timestamp: Date.now(),
				metadata: {
					provider: this.plugin.settings.activeProvider,
					model: this.plugin.getActiveModelName(),
					tokens: 0
				}
			};

			// Add empty message with three dots loading indicator (same as Guided Mode)
			this.messageManager.addMessageToUI(assistantMessage, this.currentSession);
			this.messageManager.scrollToBottom();

			workingMessageEl = this.messageRenderer.findMessageElement(assistantMessage.id);
			
			// Update step indicator to active for AI response
			this.updateStepIndicator(stepIndicatorsEl, 'ai-response', 'active');
			
			// Add three dots loading indicator to the empty message
			if (workingMessageEl) {
				const contentEl = workingMessageEl.querySelector('.llmsider-message-content');
				if (contentEl) {
					contentEl.classList.add('llmsider-working-indicator');
					contentEl.empty();
					
					const dotsContainer = contentEl.createEl('div', { cls: 'llmsider-typing-dots' });
					const middleDot = dotsContainer.createEl('span', { cls: 'llmsider-typing-dot' });
					middleDot.style.cssText = `
						display: inline-block;
						width: 8px;
						height: 8px;
						border-radius: 50%;
						background: var(--text-muted);
						animation: typing 1.4s infinite both;
						animation-delay: 0.2s;
					`;
				}
			}

			// Start streaming
			const streamController = this.streamManager.startStreaming();
			let accumulatedContent = '';
			let totalTokens = 0;
			let collectedToolCalls: any[] = [];
			const streamStartTime = Date.now();

			// Extract system message from messages array for provider
			const systemMessage = messages.find(m => m.role === 'system');
			const conversationMessages = messages.filter(m => m.role !== 'system');
			const systemPrompt = systemMessage?.content as string || '';

			await provider.sendStreamingMessage(conversationMessages, (chunk) => {
				if (streamController.signal.aborted) return;

				// Clear three dots loading indicator on first chunk
				if (chunk.delta && accumulatedContent === '' && workingMessageEl) {
					const contentEl = workingMessageEl.querySelector('.llmsider-message-content');
					if (contentEl) {
						// Remove working indicator and clear dots
						contentEl.classList.remove('llmsider-working-indicator');
						const existingDots = contentEl.querySelector('.llmsider-typing-dots');
						if (existingDots) {
							existingDots.remove();
						}
						contentEl.empty();
					}
				}

				if (chunk.delta) {
					accumulatedContent += chunk.delta;
					if (assistantMessage) {
						assistantMessage.content = accumulatedContent;
					}

					// Update streaming content
					const contentEl = workingMessageEl?.querySelector('.llmsider-message-content');
					if (contentEl) {
						this.messageRenderer.updateStreamingContent(contentEl as HTMLElement, accumulatedContent);
						// Auto-scroll to bottom during streaming with throttling
						this.messageManager.scrollToBottom();
					}
				}

				if (chunk.isComplete && chunk.usage) {
					totalTokens = chunk.usage.totalTokens;
				}

				// Collect tool calls if present
				if (chunk.toolCalls && chunk.toolCalls.length > 0) {
					collectedToolCalls = chunk.toolCalls;
				}
			}, streamController.signal, this.plugin.settings.agentMode && availableTools.length > 0 ? availableTools : undefined, systemPrompt);

			const streamDuration = Date.now() - streamStartTime;

			// Check if stream failed (empty response indicates network error)
			if (accumulatedContent.trim() === '' && collectedToolCalls.length === 0) {
				Logger.debug('Empty response detected - treating as network error');
				throw new Error('Failed to fetch: Empty response from server');
			}

			// Process Action mode responses for diff rendering (only when agent mode is disabled)
			if (!this.plugin.settings.agentMode) {
				await this.messageManager.processActionModeResponse(
					assistantMessage,
					accumulatedContent,
					'action', // Always treat as action mode when agent mode is disabled
					this.contextManager
				);
			}

			// Process tool calls (only in Agent mode)
			if (this.plugin.settings.agentMode) {
				await this.processToolCalls({ toolCalls: collectedToolCalls }, accumulatedContent, availableTools);
			}

			// Update final message metadata
			if (assistantMessage.metadata) {
				assistantMessage.metadata.tokens = totalTokens;
				// No need to delete isWorking since we don't use it anymore
			}

			// Update working message element to final state
			if (workingMessageEl) {
				workingMessageEl.dataset.messageId = assistantMessage.id;
				// Only add message actions when agent mode is disabled
				if (!this.plugin.settings.agentMode) {
					this.messageRenderer.addMessageActions(workingMessageEl, assistantMessage);
				}
			}

			// Update session
			if (this.currentSession) {
				this.currentSession.messages.push(assistantMessage);
				await this.plugin.updateChatSession(this.currentSession.id, {
					messages: this.currentSession.messages
				});

				// Auto-generate session name after first round of conversation (first AI response)
				// Count only user and assistant messages, excluding system messages
				const conversationMessages = this.currentSession.messages.filter(
					m => m.role === 'user' || m.role === 'assistant'
				);
				if (conversationMessages.length === 2 && this.currentSession.name === 'Untitled') {
					const firstUserMessage = conversationMessages.find(m => m.role === 'user');
					const firstAssistantMessage = conversationMessages.find(m => m.role === 'assistant');
					
					if (firstUserMessage && firstAssistantMessage) {
						const sessionName = await this.uiBuilder.generateSessionNameFromMessage(
							firstUserMessage.content as string,
							firstAssistantMessage.content as string
						);
						await this.plugin.updateChatSession(this.currentSession.id, { name: sessionName });
						this.currentSession.name = sessionName;
						this.uiBuilder.updateSessionNameDisplay(sessionName);
						Logger.debug('Auto-generated session name after first round:', sessionName);
					}
				}
			}

			// Log conversation in Normal Mode (not in Agent or Guided mode)
			if (conversationMode === 'normal' && this.currentSession) {
				await conversationLogger.logConversation(
					this.currentSession.id,
					this.plugin.settings.activeProvider,
					this.plugin.getActiveModelName(),
					userMessage,
					accumulatedContent,
					totalTokens > 0 ? {
						promptTokens: 0, // Not available from streaming
						completionTokens: 0,
						totalTokens: totalTokens
					} : undefined,
					streamDuration,
					collectedToolCalls.length > 0 ? collectedToolCalls : undefined
				);
			}

			// Reset streaming state
			this.streamManager.resetButtonStates();
			this.messageRenderer.resetXmlBuffer();
			
			// Remove step indicators after completion
			this.removeStepIndicators(stepIndicatorsEl);

		} catch (error) {
			Logger.debug('========== ERROR CAUGHT ==========');
			Logger.debug('Error type:', error instanceof Error ? 'Error' : typeof error);
			Logger.debug('Error name:', error instanceof Error ? error.name : 'N/A');
			Logger.debug('Error message:', error instanceof Error ? error.message : String(error));
			Logger.debug('workingMessageEl exists?', !!workingMessageEl);
			Logger.debug('assistantMessage exists?', !!assistantMessage);
			
			this.streamManager.resetButtonStates();
			this.messageRenderer.resetXmlBuffer();

			if (error instanceof Error && error.name === 'AbortError') {
				Logger.debug('Stream was aborted by user');
				// Remove step indicators on abort
				this.removeStepIndicators(stepIndicatorsEl);
				return;
			}

			Logger.error('Error in AI response:', error);
			
			// Remove loading indicator from the working message
			Logger.debug('Attempting to remove loading indicator...');
			if (workingMessageEl) {
				Logger.debug('workingMessageEl found, proceeding with error UI');
				const contentEl = workingMessageEl.querySelector('.llmsider-message-content');
				Logger.debug('contentEl found?', !!contentEl);
				if (contentEl) {
					Logger.debug('Removing working indicator class...');
					contentEl.classList.remove('llmsider-working-indicator');
					const dotsEl = contentEl.querySelector('.llmsider-typing-dots');
					Logger.debug('dotsEl found?', !!dotsEl);
					if (dotsEl) {
						Logger.debug('Removing dots element...');
						dotsEl.remove();
					}
					
					// Show error UI in the message
					Logger.debug('Emptying contentEl and creating error UI...');
					contentEl.empty();
					const errorContainer = contentEl.createDiv({ cls: 'llmsider-error-message' });
					
					const iconContainer = errorContainer.createDiv({ cls: 'llmsider-error-icon' });
					setIcon(iconContainer, 'alert-circle');
					
					const errorContent = errorContainer.createDiv({ cls: 'llmsider-error-content' });
					
					// Determine error type and message
					Logger.debug('Determining error type...');
					let errorTitle = '';
					let errorMessage = '';
					let showRetry = true;
					
					if (error instanceof Error) {
						Logger.debug('Error is Error instance, checking message:', error.message);
						// Network errors
						if (error.message.includes('Failed to fetch') || 
						    error.message.includes('fetch failed') ||
						    error.message.includes('NetworkError') ||
						    error.message.includes('net::ERR_FAILED')) {
							errorTitle = this.i18n.t('errors.aiServiceConnectionFailed');
							errorMessage = this.i18n.t('errors.aiServiceConnectionFailedDetail');
						}
						// Timeout errors
						else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
							errorTitle = this.i18n.t('errors.aiServiceTimeout');
							errorMessage = this.i18n.t('errors.aiServiceTimeoutDetail');
						}
						// Rate limit errors
						else if (error.message.includes('rate limit') || error.message.includes('429')) {
							errorTitle = this.i18n.t('errors.aiServiceRateLimitExceeded');
							errorMessage = this.i18n.t('errors.aiServiceRateLimitExceededDetail');
						}
						// Authentication errors
						else if (error.message.includes('401') || error.message.includes('403') || 
						         error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
							errorTitle = this.i18n.t('errors.aiServiceAuthFailed');
							errorMessage = this.i18n.t('errors.aiServiceAuthFailedDetail');
							showRetry = false;
						}
						// Other errors
						else {
							errorTitle = this.i18n.t('errors.unknownError');
							errorMessage = error.message;
						}
					} else {
						errorTitle = this.i18n.t('errors.unknownError');
						errorMessage = this.i18n.t('errors.unknownError');
					}
					
					Logger.debug('Final error UI - Title:', errorTitle, 'Message:', errorMessage, 'ShowRetry:', showRetry);
					
					errorContent.createEl('div', { 
						cls: 'llmsider-error-title',
						text: errorTitle
					});
					
					errorContent.createEl('div', { 
						cls: 'llmsider-error-description',
						text: errorMessage
					});
					
					// Add retry button
					Logger.debug('Creating error UI elements...');
					if (showRetry) {
						Logger.debug('Adding retry button...');
						const actionsContainer = errorContainer.createDiv({ cls: 'llmsider-error-actions' });
						
						const retryBtn = actionsContainer.createEl('button', {
							cls: 'llmsider-error-retry-btn',
							text: this.i18n.t('common.retry') || 'Retry'
						});
						
						retryBtn.onclick = async () => {
							// Remove the error message element
							if (workingMessageEl) {
								workingMessageEl.remove();
							}
							
							// Remove the failed message from session
							if (this.currentSession && assistantMessage) {
								const messageIndex = this.currentSession.messages.findIndex(m => m.id === assistantMessage!.id);
								if (messageIndex > -1) {
									this.currentSession.messages.splice(messageIndex, 1);
								}
							}
							
							// Retry the request
							Logger.debug('Retrying request...');
							await this.getAIResponse(userMessage);
						};
					}
					Logger.debug('Error UI creation complete');
				} else {
					Logger.error('contentEl not found in workingMessageEl!');
				}
			} else {
				Logger.error('workingMessageEl is null! Cannot show error UI.');
			}

			this.plugin.logError(error, 'Chat message failed');
			Logger.debug('========== ERROR HANDLING COMPLETE ==========');
			
			// Remove step indicators on error
			this.removeStepIndicators(stepIndicatorsEl);
		}
	}

	/**
	 * Process tool calls from AI response
	 */
	private async processToolCalls(streamingResult: any, accumulatedContent: string, availableTools: UnifiedTool[]) {
		// Process native tool calls first
		if (streamingResult?.toolCalls && Array.isArray(streamingResult.toolCalls)) {
			// Handle native tool calls through the tool execution manager
			Logger.debug('Processing native tool calls:', streamingResult.toolCalls.length);
		}

		// Always check for MCP tool calls in AI response content
		if (availableTools.length > 0) {
			const toolCalls = this.parseXMLToolCalls(accumulatedContent);
			if (toolCalls.length > 0) {
				Logger.debug('Processing MCP tool calls:', toolCalls.length);
				// Tool execution would be handled by the tool execution manager
			}
		}
	}

	/**
	 * Parse XML tool calls from content
	 */
	private parseXMLToolCalls(content: string): Array<{tool: string, parameters: any}> {
		const toolCalls: Array<{tool: string, parameters: any}> = [];

		// Parse MCP wrapper format
		const xmlToolRegex = /<use_mcp_tool>([\s\S]*?)<\/use_mcp_tool>/g;
		let xmlMatch;

		while ((xmlMatch = xmlToolRegex.exec(content)) !== null) {
			const toolContent = xmlMatch[1];
			const toolNameMatch = toolContent.match(/<tool_name>(.*?)<\/tool_name>/);

			if (toolNameMatch) {
				const toolName = toolNameMatch[1].trim();
				let parameters: any = {};

				const argumentsMatch = toolContent.match(/<arguments>([\s\S]*?)<\/arguments>/);
				if (argumentsMatch) {
					try {
						parameters = JSON.parse(argumentsMatch[1].trim());
					} catch {
						parameters = { input: argumentsMatch[1].trim() };
					}
				}

				toolCalls.push({ tool: toolName, parameters });
			}
		}

		return toolCalls;
	}

	/**
	 * Prepare messages for LLM
	 */
	private async prepareMessages(userMessage: ChatMessage, stepIndicatorsEl: HTMLElement | null = null): Promise<ChatMessage[]> {
		const messages: ChatMessage[] = [];

		// Add system message
		const systemPrompt = await this.getSystemPrompt();
		
		// Add local vector search context if auto-search is enabled
		let vectorSearchContext = '';
		if (this.plugin.settings.vectorSettings.autoSearchEnabled) {
			// Update step indicator to active
			this.updateStepIndicator(stepIndicatorsEl, 'vector-search', 'active');
			
			const vectorDBManager = this.plugin.getVectorDBManager();
			if (vectorDBManager && vectorDBManager.isSystemInitialized()) {
				try {
					const status = vectorDBManager.getStatus();
					if (status.totalChunks > 0) {
						// Extract query from user message
						const query = typeof userMessage.content === 'string' 
							? userMessage.content 
							: '';
						
						if (query) {
							Logger.debug('Performing local vector search for:', query);
							const results = await vectorDBManager.search(query);
							
							if (results.length > 0) {
								vectorSearchContext = `\n\n## Related Content from Your Vault\n\n${vectorDBManager.formatSearchResults(results)}`;
								Logger.debug(`Added ${results.length} vector search results to context`);
							}
						}
					}
				} catch (error) {
					Logger.error('Vector search failed:', error);
				}
			}
			
			// Mark vector search as completed
			this.updateStepIndicator(stepIndicatorsEl, 'vector-search', 'completed');
		}
		
		const systemMessage: ChatMessage = {
			id: 'system-' + Date.now(),
			role: 'system',
			content: systemPrompt + vectorSearchContext,
			timestamp: Date.now()
		};

		// Add recent chat history (start with more messages, will be truncated if needed)
		let chatHistory: ChatMessage[] = [];
		if (this.currentSession) {
			// Start with more messages, token management will truncate if needed
			chatHistory = this.currentSession.messages.slice(-20); // Increased from 10 to 20
		}

		// Prepare initial message list
		messages.push(systemMessage);
		messages.push(...chatHistory);

		// Handle multimodal content if present
		const imageData = this.contextManager.getImageDataForMultimodal();
		let finalUserMessage = userMessage;

		if (imageData.length > 0) {
			const provider = this.plugin.getActiveProvider();
			if (!provider?.supportsVision()) {
				throw new Error('Current provider does not support image analysis');
			}

			// Create multimodal content
			const multimodalContent: any[] = [];
			if (userMessage.content && typeof userMessage.content === 'string') {
				multimodalContent.push({ type: 'text', text: userMessage.content });
			}

			imageData.forEach(image => {
				multimodalContent.push({
					type: 'image',
					source: {
						type: 'base64',
						media_type: image.mediaType,
						data: image.base64
					}
				});
			});

			finalUserMessage = { ...userMessage, content: multimodalContent };
		}

		messages.push(finalUserMessage);

		// Apply token management - this will truncate if needed
		const contextPrompt = systemPrompt;

		// Get available tools for token estimation (only in Agent mode)
		let availableTools: any[] = [];
		if (this.plugin.settings.agentMode) {
			try {
				const toolManager = this.plugin.getToolManager();
				if (toolManager) {
					availableTools = await toolManager.getAllTools();
				}
			} catch (error) {
				Logger.warn('Failed to get tools for token estimation:', error);
			}
		}

		// Check if token limit is exceeded and handle it
		if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, availableTools)) {
			Logger.warn('Token limit exceeded, applying token management');

			// Show warning to user
			new Notice('Token limit exceeded. Truncating conversation history to fit within limits.', 5000);

			// Get truncated messages (this will preserve the most recent messages and user input)
			const truncatedMessages = TokenManager.truncateMessagesToFitTokens(messages, contextPrompt, availableTools);

			// Log the truncation for debugging
			Logger.debug('Message truncation applied:', {
				originalCount: messages.length,
				truncatedCount: truncatedMessages.length,
				originalTokens: TokenManager.estimateTokensForMessages(messages),
				truncatedTokens: TokenManager.estimateTokensForMessages(truncatedMessages)
			});

			return truncatedMessages;
		}

		// Log token usage for monitoring
		const totalTokens = TokenManager.estimateTokensForMessages(messages) +
			TokenManager.estimateTokensForContext(contextPrompt) +
			TokenManager.estimateTokensForTools(availableTools);

		Logger.debug('Token usage:', {
			totalTokens: TokenManager.formatTokenUsage(totalTokens),
			warningLevel: TokenManager.getTokenWarningLevel(totalTokens),
			messageCount: messages.length
		});

		// Show warning if approaching limits
		const warningLevel = TokenManager.getTokenWarningLevel(totalTokens);
		if (warningLevel === 'warning') {
			new Notice('Approaching token limit. Consider starting a new chat if you encounter issues.', 4000);
		}

		return messages;
	}

	/**
	 * Get system prompt for current mode
	 */
	private async getSystemPrompt(): Promise<string> {
		const basePrompt = `You are an AI assistant integrated into Obsidian, a note-taking app.`;

		const directoryBestPractices = `

CRITICAL: Content First, Operations Last
When creating or modifying notes:
1. **FOCUS ON CONTENT FIRST**: Ask about what the user wants (structure, format, fields)
2. Generate/show the content for user review and confirmation
3. **ONLY AFTER content is confirmed**, then handle file operations:
   - If user wants to check directories/files: call list_directory({directoryPath: ""}) - this is READ-ONLY, no creation
   - Present directory options to user
   - Wait for user to choose location
   - Then create/modify the file with create() tool

IMPORTANT: list_directory is for VIEWING ONLY - it shows both folders AND files but does NOT create anything!
Only use create() tool to actually create files/folders.

**CRITICAL: ALWAYS Reuse Existing Directories - Creating New Directories is RARE!**
- When list_directory shows existing directories and files, you MUST STRONGLY prefer reusing existing directories
- **Default behavior: Use existing directories** - Creating new directories should be the EXCEPTION, not the norm
- **ABSOLUTE RULE: Use EXACT directory names from list_directory result - NO modifications allowed!**
  * ✅ If listing shows "Template", use "Template/" (exact match)
  * ✅ If listing shows "模板", use "模板/" (exact Chinese name)
  * ✅ If listing shows "Book", use "Book/" (capital B matches listing)
  * ✗ If listing shows "Template", DO NOT use "Templates/" (different name!)
  * ✗ If listing shows "模板", DO NOT use "Template/" (translation not allowed!)
  * ✗ DO NOT change case: "Book" ≠ "book", "Template" ≠ "template"
  * ✗ DO NOT pluralize/singularize existing names
- Before even THINKING about "新建目录", thoroughly check if an existing directory can work:
  * Consider semantic similarity: "日记" can use "Daily/", "工作" can use "Work/" or "Projects/"
  * But always use the EXACT name from the listing!
- **ONLY suggest "新建目录" if ALL of these are true:**
  1. User EXPLICITLY asked to create a new directory/folder in their request, OR
  2. NO existing directory is semantically suitable for the content type, AND
  3. The content represents a genuinely new category not covered by existing directories
- When checking for similar directories, understand semantic similarity but ALWAYS use exact names:
  * "Template" and "模板" both mean templates - use whichever exists (exact name!)
  * "Book" and "book" are the same semantically but use the exact case from listing
- Note: list_directory returns BOTH folders and files, so you can see the full directory structure

**PRIORITY ORDER when presenting options:**
1. Most relevant existing directory with EXACT name (explain why it fits)
2. Second relevant existing directory with EXACT name (if applicable)
3. ONLY if truly necessary: "新建目录" (explain why existing ones don't work)

Example workflow:
User: "Create a reading template"
Step 1: Ask about template structure/content (NOT about filename or location!)
Step 2: Generate and show the template content
Step 3: After user confirms content is good
Step 4: If needed, call list_directory({directoryPath: ""}) to show existing directories and files
Step 5: Check listing result shows: ["Template", "模板", "Book", "Daily"]
   - Analyze and ask: "保存到哪里？Template/ (适合模板) / 模板/ (中文模板目录) / Book/ (适合读书相关)"
   - Use EXACT names: "Template" not "Templates", "模板" not "Template"
   - DO NOT automatically include "新建目录" unless user asked for it or no directory fits
Step 6: After user chooses, MUST call create({path: "ChosenDirectory/filename.md", content: "..."})
   - If user chose "Template", path must be "Template/filename.md" (exact match!)
Step 7: Wait for create() tool result before concluding

**After calling list_directory, you MUST continue with asking user for location and then call create()!**
**DO NOT stop after listing directories/files - that's just step 4, you need to finish steps 5-6!**
**File operations (where to save, what to name) come LAST, after content is ready!**`;

		let modePrompt = '';
		if (this.plugin.settings.agentMode) {
			// Agent mode: use plan-execute system with tools
			modePrompt = `You're in Agent mode - you have access to various tools and should use the plan-execute framework for complex tasks.

CRITICAL: You MUST use the available tools. Do not just describe what you would do - actually call the tools!

For weather queries about New Mexico:
1. IMMEDIATELY call get-forecast tool with location "Albuquerque, NM"
2. IMMEDIATELY call get-alerts tool with location "New Mexico"
3. Only after getting the data, provide your response

DO NOT say "I will get data" - ACTUALLY GET THE DATA by calling the tools first!

IMPORTANT: When users ask about "latest", "recent", "current", or time-sensitive information:
1. FIRST call the get_current_date tool to get the current date
2. Use this date information to provide accurate, time-aware responses
3. For example: "latest news", "recent updates", "what's new", "今天", "最新的", etc.

CRITICAL: Avoid Redundant Web Content Fetching
**Before fetching web page content, ALWAYS check conversation history first:**
1. **Check if the URL has been fetched before** in this conversation
2. **If the URL appears in previous messages with content**, DO NOT fetch it again
3. **Reuse the previously fetched content** from conversation history
4. **Only fetch if:**
   - The URL has never been fetched in this conversation, OR
   - Previous fetch failed or returned incomplete data, OR
   - User explicitly asks to refresh/refetch the content
5. **Look for these indicators in conversation history:**
   - Tool execution results from fetch_web_content, fetch_url, or similar tools
   - Messages containing "Successfully fetched content from [URL]"
   - Previous responses that include content from the URL
6. **Example - DO NOT DO THIS:**
   Message 1: [fetch_web_content called for https://example.com, got content]
   Message 3: User asks follow-up question about the article
   You: [fetch_web_content for https://example.com again] ← WRONG! Content already available!
7. **Example - CORRECT behavior:**
   Message 1: [fetch_web_content called for https://example.com, got content]
   Message 3: User asks follow-up question
   You: [Use the content from Message 1 to answer] ← CORRECT!

**Remember: Web fetching takes time and resources - avoid redundant fetches by checking history first!**

The tools are real and functional - you must use them!
${directoryBestPractices}

IMPORTANT RESPONSE STYLE:
- Always provide direct answers without preamble, introductions, or meta-commentary
- Do NOT start responses with phrases like "我来帮你...", "我将为你...", "让我..." etc.
- Do NOT end with summaries, suggestions for further action, or closing remarks
- For any task (writing, expanding, modifying, explaining), output the actual result immediately
- Avoid unnecessary framing language - just deliver the requested content directly`;
		} else {
			// Basic Q&A mode: provide helpful responses with action buttons
			modePrompt = `You're in basic Q&A mode - provide helpful, informative responses to user questions. When the user references files or provides context, make sure to use that information to provide relevant answers.

If the user asks you to modify or work with files mentioned in the context, provide specific suggestions or show what the modified content should look like.
${directoryBestPractices}

IMPORTANT RESPONSE STYLE:
- Always provide direct answers without preamble, introductions, or meta-commentary
- Do NOT start responses with phrases like "我来帮你...", "我将为你...", "让我..." etc.
- Do NOT end with summaries, suggestions for further action, or closing remarks
- For any task (writing, expanding, modifying, explaining), output the actual result immediately
- Avoid unnecessary framing language - just deliver the requested content directly`;
		}

		// Get available tools and add them to the system prompt
		const toolsInfo = await this.getAvailableToolsInfo();

		// Add context from ContextManager (will auto-refresh file contents)
		const contextPrompt = await this.contextManager.generateContextPrompt();

		return `${basePrompt}

${modePrompt}

${toolsInfo}

Context Information:
${contextPrompt}

Remember: Always respond to the user. If you use tools, explain what you're doing. If you can't use tools, explain what you would do with them.`;
	}

	private async getAvailableToolsInfo(): Promise<string> {
		// Only provide tool information in Agent mode
		if (!this.plugin.settings.agentMode) {
			return "AVAILABLE TOOLS: None (Agent mode is disabled)";
		}

		try {
			const toolManager = this.plugin.getToolManager();
			if (!toolManager) {
				return "AVAILABLE TOOLS: None";
			}

			const tools = await toolManager.getAllTools();
			if (tools.length === 0) {
				return "AVAILABLE TOOLS: None";
			}

			let toolsInfo = "AVAILABLE TOOLS:\n";

			// Group tools by source
			const builtInTools = tools.filter(t => t.source === 'built-in' && !t.server);
			const fileEditingTools = tools.filter(t => t.source === 'built-in' && t.server === 'file-editing');
			const mcpTools = tools.filter(t => t.source === 'mcp');

			if (builtInTools.length > 0) {
				toolsInfo += "\nBuilt-in Tools:\n";
				builtInTools.forEach(tool => {
					toolsInfo += `- ${tool.name}: ${tool.description}\n`;
				});
			}

			if (fileEditingTools.length > 0) {
				toolsInfo += "\nFile Editing Tools:\n";
				fileEditingTools.forEach(tool => {
					toolsInfo += `- ${tool.name}: ${tool.description}\n`;
				});
			}

			if (mcpTools.length > 0) {
				// Group MCP tools by server
				const mcpByServer = mcpTools.reduce((acc, tool) => {
					const server = tool.server || 'unknown';
					if (!acc[server]) acc[server] = [];
					acc[server].push(tool);
					return acc;
				}, {} as Record<string, typeof mcpTools>);

				toolsInfo += "\nMCP Tools (External Services):\n";
				Object.entries(mcpByServer).forEach(([server, serverTools]) => {
					toolsInfo += `\nFrom ${server} server:\n`;
					serverTools.forEach(tool => {
						toolsInfo += `- ${tool.name}: ${tool.description}\n`;
					});
				});
			}

			toolsInfo += `\nTotal: ${tools.length} tools available\n`;

			return toolsInfo;
		} catch (error) {
			Logger.warn('Failed to get tools info for system prompt:', error);
			return "AVAILABLE TOOLS: Error retrieving tool information";
		}
	}

	/**
	 * Handle Guided Mode conversation
	 */
	private async handleGuidedMode(userMessage: ChatMessage, messages: ChatMessage[]): Promise<void> {
		Logger.debug('Starting Guided Mode conversation');
		
		try {
			// Check if this is a response to a guided question
			const lastMessage = messages[messages.length - 2]; // -2 because last is current user message
			const isGuidedResponse = lastMessage?.metadata?.isGuidedQuestion;
			
			if (isGuidedResponse) {
				// User is responding to a guided question
				await this.handleGuidedResponse(userMessage, messages);
			} else {
				// Start new guided conversation
				await this.startGuidedConversation(userMessage, messages);
			}
		} catch (error) {
			Logger.error('Error in guided mode:', error);
			await this.messageManager.addMessage({
				id: Date.now().toString(),
				role: 'system',
				content: `Error in guided mode: ${(error as Error).message || 'Unknown error'}`,
				timestamp: Date.now()
			}, this.currentSession);
		}
	}
	
	/**
	 * Start new guided conversation
	 */
	/**
	 * Start new guided conversation
	 */
	private async startGuidedConversation(userMessage: ChatMessage, messages: ChatMessage[]): Promise<void> {
		Logger.debug('Starting new guided conversation');
		
		// Start streaming mode with stop button
		const streamController = this.streamManager.startStreaming();

		// Create placeholder message for streaming with fixed ID
		const messageId = Date.now().toString();
		
		// Set up stop handler for guided mode
		this.streamManager.setStopHandler(() => {
			Logger.debug('Guided mode stopped by user');
			
			// Remove loading indicator immediately
			const messageEl = this.messageRenderer.findMessageElement(messageId);
			if (messageEl) {
				const contentEl = messageEl.querySelector('.llmsider-message-content');
				if (contentEl) {
					contentEl.classList.remove('llmsider-working-indicator');
					const dotsEl = contentEl.querySelector('.llmsider-typing-dots');
					if (dotsEl) {
						dotsEl.remove();
					}
					
					// Show stopped message with icon
					contentEl.empty();
					const stoppedDiv = contentEl.createDiv({ cls: 'llmsider-stopped-message' });
					
					const iconContainer = stoppedDiv.createDiv({ cls: 'llmsider-stopped-icon' });
					setIcon(iconContainer, 'pause-circle');
					
					stoppedDiv.createSpan({ 
						text: this.i18n.t('ui.generationStopped') || '已停止生成',
						cls: 'llmsider-stopped-text'
					});
				}
			}
			
			this.streamManager.resetButtonStates();
		});
		
		try {
			// Get available tools (both built-in and MCP)
			const tools = await this.plugin.toolManager.getAllTools();
			Logger.debug('Available tools for guided mode:', tools.length);
			
			const streamingMessage: ChatMessage = {
				id: messageId,
				role: 'assistant',
				content: '',
				timestamp: Date.now(),
				metadata: {
					isGuidedQuestion: true,
					guidedStepNumber: 1,
					isStreaming: true
				}
			};
			
			// Add placeholder to UI
			this.messageManager.addMessageToUI(streamingMessage, this.currentSession);
			this.messageManager.scrollToBottom();
			
			// Verify the element was created
			const streamingEl = this.messageRenderer.findMessageElement(messageId);
			if (!streamingEl) {
				Logger.error('Failed to create streaming message element!', messageId);
			} else {
				Logger.debug('Streaming message element created successfully:', messageId);
				Logger.debug('Element data-message-id:', streamingEl.getAttribute('data-message-id'));
				
				// Add three dots loading indicator to the empty streaming message
				const contentEl = streamingEl.querySelector('.llmsider-message-content');
				if (contentEl) {
					Logger.debug('Adding three dots to content element for messageId:', messageId);
					contentEl.classList.add('llmsider-working-indicator');
					
					// Clear any existing content first
					contentEl.empty();
					
					const dotsContainer = contentEl.createEl('div', { cls: 'llmsider-typing-dots' });
					const middleDot = dotsContainer.createEl('span', { cls: 'llmsider-typing-dot' });
					middleDot.style.cssText = `
						display: inline-block;
						width: 8px;
						height: 8px;
						border-radius: 50%;
						background: var(--text-muted);
						animation: typing 1.4s infinite both;
						animation-delay: 0.2s;
					`;
					
					Logger.debug('Three dots added successfully');
				} else {
					Logger.error('Content element not found in streaming message!');
				}
			}
			
			// Get AI's first guiding question with streaming
			const guidedMessage = await this.guidedModeProcessor.startGuidedConversation(
				userMessage.content as string,
				messages,
				tools,
				(updatedMessage) => {
					// Check if streaming was stopped
					if (streamController.signal.aborted) {
						Logger.debug('Stream aborted, ignoring update');
						return;
					}
					// Stream update callback - update UI in real-time
					this.updateGuidedMessageUI(updatedMessage);
				},
				messageId, // Pass the predefined message ID
				streamController.signal // Pass abort signal
			);
			
			// Check if aborted before processing result
			if (streamController.signal.aborted) {
				Logger.debug('Stream was aborted, skipping result processing');
				return;
			}
			
			if (guidedMessage) {
				// No need to modify guidedMessage.id, it's already correct
				guidedMessage.metadata!.isStreaming = false;
				await this.updateGuidedMessageUI(guidedMessage);
				
				// Save to session
				if (this.currentSession) {
					this.currentSession.messages.push(guidedMessage);
					await this.plugin.updateChatSession(this.currentSession.id, {
						messages: this.currentSession.messages
					});
					
					// Log conversation in Guided Mode
					await conversationLogger.logConversation(
						this.currentSession.id,
						this.plugin.settings.activeProvider,
						this.plugin.getActiveModelName(),
						userMessage,
						typeof guidedMessage.content === 'string' ? guidedMessage.content : JSON.stringify(guidedMessage.content),
						undefined, // usage info not available from streaming in guided mode
						undefined, // duration not tracked here
						guidedMessage.metadata?.suggestedToolCalls
					);
				}
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				Logger.debug('Guided conversation was aborted by user');
				return;
			}
			
			Logger.error('Error in guided conversation:', error);
			// The error is already handled in GuidedModeProcessor
			// No need to throw, just log it
		} finally {
			// Always reset button states when guided mode completes or fails
			this.streamManager.resetButtonStates();
		}
	}
	
	/**
	 * Handle user response to guided question
	 */
	private async handleGuidedResponse(userMessage: ChatMessage, messages: ChatMessage[]): Promise<void> {
		Logger.debug('Handling guided response');
		
		// Start streaming mode with stop button
		const streamController = this.streamManager.startStreaming();

		// Create placeholder message for streaming with fixed ID
		const messageId = Date.now().toString();

		// Set up stop handler for guided mode
		this.streamManager.setStopHandler(() => {
			Logger.debug('Guided mode stopped by user');
			
			// Mark this message as stopped to prevent further updates
			this.stoppedMessageIds.add(messageId);
			
			// Remove loading indicator immediately
			const messageEl = this.messageRenderer.findMessageElement(messageId);
			if (messageEl) {
				const contentEl = messageEl.querySelector('.llmsider-message-content');
				if (contentEl) {
					contentEl.classList.remove('llmsider-working-indicator');
					const dotsEl = contentEl.querySelector('.llmsider-typing-dots');
					if (dotsEl) {
						dotsEl.remove();
					}
					
					// Show stopped message with icon
					contentEl.empty();
					const stoppedDiv = contentEl.createDiv({ cls: 'llmsider-stopped-message' });
					
					const iconContainer = stoppedDiv.createDiv({ cls: 'llmsider-stopped-icon' });
					setIcon(iconContainer, 'pause-circle');
					
					stoppedDiv.createSpan({ 
						text: this.i18n.t('ui.generationStopped') || '已停止生成',
						cls: 'llmsider-stopped-text'
					});
				}
			}
			
			this.streamManager.resetButtonStates();
		});
		
		try {
			// Get available tools (both built-in and MCP)
			const tools = await this.plugin.toolManager.getAllTools();
			
			const streamingMessage: ChatMessage = {
				id: messageId,
				role: 'assistant',
				content: '',
				timestamp: Date.now(),
				metadata: {
					isGuidedQuestion: true,
					isStreaming: true
				}
			};
			
			// Add placeholder to UI
			this.messageManager.addMessageToUI(streamingMessage, this.currentSession);
			this.messageManager.scrollToBottom();
			
			// Verify the element was created
			const streamingEl = this.messageRenderer.findMessageElement(messageId);
			if (!streamingEl) {
				Logger.error('Failed to create streaming message element!', messageId);
			} else {
				Logger.debug('Streaming message element created successfully:', messageId);
				Logger.debug('Element data-message-id:', streamingEl.getAttribute('data-message-id'));
				
				// Add three dots loading indicator to the empty streaming message
				const contentEl = streamingEl.querySelector('.llmsider-message-content');
				if (contentEl) {
					Logger.debug('Adding three dots to content element for messageId:', messageId);
					contentEl.classList.add('llmsider-working-indicator');
					
					// Clear any existing content first
					contentEl.empty();
					
					const dotsContainer = contentEl.createEl('div', { cls: 'llmsider-typing-dots' });
					const middleDot = dotsContainer.createEl('span', { cls: 'llmsider-typing-dot' });
					middleDot.style.cssText = `
						display: inline-block;
						width: 8px;
						height: 8px;
						border-radius: 50%;
						background: var(--text-muted);
						animation: typing 1.4s infinite both;
						animation-delay: 0.2s;
					`;
					
					Logger.debug('Three dots added successfully');
				} else {
					Logger.error('Content element not found in streaming message!');
				}
			}
			
			// Get next question or final answer with streaming
			const guidedMessage = await this.guidedModeProcessor.processGuidedResponse(
				userMessage.content as string,
				messages,
				tools,
				(updatedMessage) => {
					// Check if streaming was stopped
					if (streamController.signal.aborted) {
						Logger.debug('Stream aborted, ignoring update');
						return;
					}
					// Stream update callback - update UI in real-time
					this.updateGuidedMessageUI(updatedMessage);
				},
				messageId, // Pass the predefined message ID
				streamController.signal // Pass abort signal
			);
			
			// Check if aborted before processing result
			if (streamController.signal.aborted) {
				Logger.debug('Stream was aborted, skipping result processing');
				return;
			}
			
			if (guidedMessage) {
				// Final check before updating - verify stop message isn't already shown
				const messageEl = this.messageRenderer.findMessageElement(messageId);
				if (messageEl) {
					const contentEl = messageEl.querySelector('.llmsider-message-content');
					if (contentEl && contentEl.querySelector('.llmsider-stopped-message')) {
						Logger.debug('Stop message already shown, skipping final update');
						return;
					}
				}
				
				// No need to modify guidedMessage.id, it's already correct
				guidedMessage.metadata!.isStreaming = false;
				await this.updateGuidedMessageUI(guidedMessage);
				
				// Save to session
				if (this.currentSession) {
					this.currentSession.messages.push(guidedMessage);
					await this.plugin.updateChatSession(this.currentSession.id, {
						messages: this.currentSession.messages
					});
					
					// Log conversation in Guided Mode
					await conversationLogger.logConversation(
						this.currentSession.id,
						this.plugin.settings.activeProvider,
						this.plugin.getActiveModelName(),
						userMessage,
						typeof guidedMessage.content === 'string' ? guidedMessage.content : JSON.stringify(guidedMessage.content),
						undefined, // usage info not available from streaming in guided mode
						undefined, // duration not tracked here
						guidedMessage.metadata?.suggestedToolCalls
					);
				}
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				Logger.debug('Guided response was aborted by user');
				// Keep the stopped message ID in the set - don't remove it
				return;
			}
			
			Logger.error('Error in guided response:', error);
			// The error is already handled in GuidedModeProcessor
			// No need to throw, just log it
		} finally {
			// Always reset button states when guided mode completes or fails
			this.streamManager.resetButtonStates();
			
			// Clean up stopped message ID after processing completes (success or error)
			// Note: Keep it during abort to ensure no late updates
			if (!streamController.signal.aborted) {
				// Only remove if not aborted - if aborted, we want to keep blocking updates
				setTimeout(() => {
					this.stoppedMessageIds.delete(messageId);
				}, 1000); // 1 second delay to catch any late-arriving updates
			}
		}
	}
	
	/**
	 * Update guided message UI in real-time during streaming
	 */
	private async updateGuidedMessageUI(message: ChatMessage): Promise<void> {
		// FIRST: Check if this message has been stopped - prevent ALL updates
		if (this.stoppedMessageIds.has(message.id)) {
			Logger.debug('Message', message.id, 'has been stopped, skipping ALL updates');
			return;
		}
		
		/*
		Logger.debug('updateGuidedMessageUI called:', {
			id: message.id,
			contentLength: (message.content as string)?.length || 0,
			hasOptions: !!message.metadata?.guidedOptions,
			optionCount: message.metadata?.guidedOptions?.length || 0,
			isStreaming: message.metadata?.isStreaming
		});
		*/
		
		let messageEl = this.messageRenderer.findMessageElement(message.id);
		
		if (!messageEl) {
			Logger.error('Message element not found for ID:', message.id);
			Logger.error('Searching for element with selector:', `[data-message-id="${message.id}"]`);
			
			// Debug: list all message elements
			const allMessages = document.querySelectorAll('[data-message-id]');
			Logger.error('All message elements in DOM:', Array.from(allMessages).map(el => el.getAttribute('data-message-id')));
			
			Logger.warn('Message element not found, creating new element for ID:', message.id);
			// If element doesn't exist, create it
			this.messageManager.addMessageToUI(message, this.currentSession);
			messageEl = this.messageRenderer.findMessageElement(message.id);
			
			if (!messageEl) {
				Logger.error('Failed to create message element even after addMessageToUI!');
				return;
			}
		} else {
			// Logger.debug('Message element found successfully');
		}
		
		// Check if message has been stopped - if so, don't update it
		const contentEl = messageEl.querySelector('.llmsider-message-content');
		if (contentEl && contentEl.querySelector('.llmsider-stopped-message')) {
			Logger.debug('Message has been stopped, skipping update');
			return;
		}
		
		// Update existing message
		if (message.metadata?.isGuidedQuestion) {
			this.renderGuidedCard(message);
			// Use double requestAnimationFrame to ensure all DOM operations complete
			// This prevents the jumping effect in guided mode
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					this.messageManager.scrollToBottom();
				});
			});
		} else {
			// Regular message update
			// Pass isStreaming flag to disable mermaid placeholders during streaming
			const isStreaming = message.metadata?.isStreaming ?? false;
			this.messageRenderer.updateMessageContent(message.id, message.content as string, isStreaming);
			// Single requestAnimationFrame is sufficient for regular updates
			requestAnimationFrame(() => {
				this.messageManager.scrollToBottom();
			});
		}
	}
	
	/**
	 * Render or update the guided card UI
	 */
	private renderGuidedCard(message: ChatMessage, isReloaded: boolean = false): void {
		// Logger.debug('renderGuidedCard called:', {
		// 	id: message.id,
		// 	contentLength: (message.content as string)?.length || 0,
		// 	hasOptions: !!message.metadata?.guidedOptions,
		// 	optionCount: message.metadata?.guidedOptions?.length || 0,
		// 	isReloaded
		// });
		
		const messageEl = this.messageRenderer.findMessageElement(message.id);
		if (!messageEl) {
			Logger.warn('Message element not found in renderGuidedCard!');
			return;
		}
		
		const hasActualContent = message.content && (message.content as string).length > 0;
		const hasToolCalls = message.metadata?.requiresToolConfirmation && message.metadata?.suggestedToolCalls;
		
		// If no content yet AND no tool calls, keep the three dots loading indicator and return early
		// Don't render the card UI until we have content or tool calls
		if (!hasActualContent && !hasToolCalls) {
			Logger.debug('No content yet, keeping loading indicator');
			return;
		}
		
		// Now we have content or tool calls, remove the loading indicator
		const contentEl = messageEl.querySelector('.llmsider-message-content');
		if (contentEl) {
			contentEl.classList.remove('llmsider-working-indicator');
			const existingDots = contentEl.querySelector('.llmsider-typing-dots');
			if (existingDots) {
				existingDots.remove();
			}
		}
		
		// Add special class and hide actions
		messageEl.addClass('llmsider-guided-question-message');
		
		const originalContent = messageEl.querySelector('.llmsider-message-content');
		if (originalContent) {
			(originalContent as HTMLElement).style.display = 'none';
		}
		
		// Keep hover actions visible - users should be able to copy/generate notes
		// Action buttons will appear on hover over the message
		
		// Check if card container already exists
		let cardContainer = messageEl.querySelector('.llmsider-guided-card-container') as HTMLElement;
		
		if (!cardContainer) {
			// Create new card container
			cardContainer = messageEl.createDiv({ cls: 'llmsider-guided-card-container' });
		}
		
		// Update or create question section
		let questionSection = cardContainer.querySelector('.llmsider-guided-question-section') as HTMLElement;
		
		if (!questionSection) {
			questionSection = cardContainer.createDiv({ cls: 'llmsider-guided-question-section' });
		}
		
		// Update question content
		let questionContent = questionSection.querySelector('.llmsider-guided-question-content') as HTMLElement;
		
		if (!questionContent) {
			questionContent = questionSection.createDiv({ cls: 'llmsider-guided-question-content' });
		}
		
		const contentText = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
		const cleanedContent = this.removeOptionsFromContent(contentText);
		
		// Clear and re-render content
		questionContent.empty();
		this.messageRenderer.renderMarkdownContentPublic(questionContent, cleanedContent);
		
		// Hide question section if there's no meaningful content or if there are tool calls
		// (tool calls will show the description in their own cards)
		if (cleanedContent.trim().length === 0 || 
		    (message.metadata?.requiresToolConfirmation && message.metadata?.suggestedToolCalls)) {
			questionSection.style.display = 'none';
		} else {
			questionSection.style.display = 'block';
		}
		
		// Handle tool calls if present - render as independent cards after this message
		if (message.metadata?.requiresToolConfirmation && message.metadata?.suggestedToolCalls) {
			this.renderGuidedToolCallsAsIndependent(message, isReloaded);
		}
		
		// Handle options if present
		if (message.metadata?.guidedOptions && message.metadata.guidedOptions.length > 0) {
			this.renderGuidedOptions(cardContainer, message, isReloaded);
		}
	}
	
	/**
	 * Render guided tool calls as independent card messages (not inside AI message)
	 */
	private renderGuidedToolCallsAsIndependent(message: ChatMessage, isReloaded: boolean = false): void {
		Logger.debug('renderGuidedToolCallsAsIndependent called');
		
		const toolCalls = message.metadata!.suggestedToolCalls as any[];
		const actionDescription = typeof message.content === 'string' ? message.content : '';
		
		// Find the parent message element to insert cards after it
		const messageEl = this.messageRenderer.findMessageElement(message.id);
		if (!messageEl) {
			Logger.warn('Parent message element not found, cannot insert tool cards');
			return;
		}
		
		// Track the last inserted element to maintain correct order for multiple tool calls
		let lastInsertedElement: Element = messageEl;
		
		toolCalls.forEach((toolCall) => {
			const toolName = toolCall.name || toolCall.function?.name || 'Unknown Tool';
			
			// Parse tool arguments for display
			let toolParameters: Record<string, any> = {};
			try {
				if (toolCall.function?.arguments) {
					toolParameters = typeof toolCall.function.arguments === 'string' 
						? JSON.parse(toolCall.function.arguments) 
						: toolCall.function.arguments;
				} else if (toolCall.arguments) {
					toolParameters = typeof toolCall.arguments === 'string' 
						? JSON.parse(toolCall.arguments) 
						: toolCall.arguments;
				} else if (toolCall.input) {
					toolParameters = toolCall.input;
				}
			} catch (error) {
				Logger.error('Failed to parse tool parameters:', error);
				toolParameters = { error: 'Failed to parse parameters' };
			}
			
			// Create independent tool card container
			const toolCardEl = document.createElement('div');
			toolCardEl.className = 'llmsider-tool-card-message';
			
			// Insert card after the last inserted element to maintain order
			// First card goes after message, second after first card, etc.
			lastInsertedElement.insertAdjacentElement('afterend', toolCardEl);
			lastInsertedElement = toolCardEl; // Update for next iteration
			
			// If reloaded, create a read-only card with 'success' status (no approve/cancel buttons)
			if (isReloaded) {
				new ToolResultCard(toolCardEl, {
					toolName: toolName,
					status: 'success', // Show as completed
					parameters: toolParameters,
					timestamp: new Date(),
					description: actionDescription
				});
			} else {
				// Create the tool approval card with pending status
				new ToolResultCard(toolCardEl, {
					toolName: toolName,
					status: 'pending',
					parameters: toolParameters,
					timestamp: new Date(),
					description: actionDescription
				}, async () => {
					// Approve callback - execute the tool
					await this.executeToolWithCard(toolCardEl, toolCall, message);
				}, () => {
					// Cancel callback - remove the card
					toolCardEl.remove();
				});
			}
		});
	}
	
	/**
	 * Render or update guided tool calls (for tool confirmation) - DEPRECATED
	 * Use renderGuidedToolCallsAsIndependent instead
	 */
	private renderGuidedToolCalls(cardContainer: HTMLElement, message: ChatMessage, isReloaded: boolean = false): void {
		Logger.debug('renderGuidedToolCalls called');
		
		// Check if tools section already exists
		let toolsSection = cardContainer.querySelector('.llmsider-guided-tools-section') as HTMLElement;
		
		if (!toolsSection) {
			toolsSection = cardContainer.createDiv({ cls: 'llmsider-guided-tools-section' });
		} else {
			// Clear existing tools
			toolsSection.empty();
		}
		
		const toolCalls = message.metadata!.suggestedToolCalls as any[];
		const actionDescription = typeof message.content === 'string' ? message.content : '';
		
		toolCalls.forEach((toolCall) => {
			const toolName = toolCall.name || toolCall.function?.name || 'Unknown Tool';
			
			// Parse tool arguments for display
			let toolParameters: Record<string, any> = {};
			try {
				if (toolCall.function?.arguments) {
					toolParameters = typeof toolCall.function.arguments === 'string' 
						? JSON.parse(toolCall.function.arguments) 
						: toolCall.function.arguments;
				} else if (toolCall.arguments) {
					toolParameters = typeof toolCall.arguments === 'string' 
						? JSON.parse(toolCall.arguments) 
						: toolCall.arguments;
				} else if (toolCall.input) {
					toolParameters = toolCall.input;
				}
			} catch (error) {
				Logger.error('Failed to parse tool parameters:', error);
				toolParameters = { error: 'Failed to parse parameters' };
			}
			
			// Create card container for this tool
			const toolCardContainer = toolsSection.createDiv({ cls: 'llmsider-tool-card-wrapper' });
			
			// If reloaded, create a read-only card with 'success' status (no approve/cancel buttons)
			if (isReloaded) {
				new ToolResultCard(toolCardContainer, {
					toolName: toolName,
					status: 'success', // Show as completed
					parameters: toolParameters,
					timestamp: new Date(),
					description: actionDescription
				});
			} else {
				// Create the tool approval card with pending status
				new ToolResultCard(toolCardContainer, {
					toolName: toolName,
					status: 'pending',
					parameters: toolParameters,
					timestamp: new Date(),
					description: actionDescription
				}, async () => {
					// Approve callback - execute the tool
					await this.executeToolWithCard(toolCardContainer, toolCall, message);
				}, () => {
					// Cancel callback - remove the card
					toolCardContainer.remove();
				});
			}
		});
	}
	
	/**
	 * Render or update guided options
	 */
	private renderGuidedOptions(cardContainer: HTMLElement, message: ChatMessage, isReloaded: boolean = false): void {
		// Check if options section already exists
		let optionsSection = cardContainer.querySelector('.llmsider-guided-options-section') as HTMLElement;
		
		if (!optionsSection) {
			optionsSection = cardContainer.createDiv({ cls: 'llmsider-guided-options-section' });
		}
		
		// Clear existing options if any
		let optionsContainer = optionsSection.querySelector('.llmsider-guided-options') as HTMLElement;
		
		if (optionsContainer) {
			optionsContainer.empty();
		} else {
			optionsContainer = optionsSection.createDiv({ cls: 'llmsider-guided-options' });
		}
		
		const i18n = this.plugin.getI18nManager();
		const options = message.metadata!.guidedOptions as string[];
		
		// Get multi-select mode from metadata (set by AI)
		const isMultiSelect = message.metadata!.isMultiSelect || false;
		const selectedOptions = new Set<number>();
		
		options.forEach((option, index) => {
			const optionCard = optionsContainer.createDiv({
				cls: 'llmsider-guided-option-card'
			});
			
			// If reloaded, mark all options as disabled
			if (isReloaded) {
				optionCard.addClass('disabled');
			}
			
			// Add multi-select class if applicable
			if (isMultiSelect) {
				optionCard.addClass('multi-select-mode');
			}
			
			// Number badge or checkbox
			const badge = optionCard.createEl('div', {
				cls: 'llmsider-guided-option-number',
				text: (index + 1).toString()
			});
			
			// Checkmark icon (hidden by default)
			const checkmark = optionCard.createDiv({
				cls: 'llmsider-guided-option-checkmark'
			});
			setIcon(checkmark, 'check');
			
			// Content
			const content = optionCard.createDiv({ cls: 'llmsider-guided-option-content' });
			
			const parts = option.split(' - ');
			const title = parts[0];
			const desc = parts.length > 1 ? parts.slice(1).join(' - ') : '';
			
			content.createEl('div', {
				cls: 'llmsider-guided-option-title',
				text: title
			});
			
			if (desc) {
				content.createEl('div', {
					cls: 'llmsider-guided-option-desc',
					text: desc
				});
			}
			
			// Only add click handler if streaming is complete AND not reloaded
			if (!message.metadata?.isStreaming && !isReloaded) {
				if (isMultiSelect) {
					// Multi-select mode: toggle selection
					optionCard.onclick = () => {
						if (selectedOptions.has(index)) {
							selectedOptions.delete(index);
							optionCard.removeClass('selected');
						} else {
							selectedOptions.add(index);
							optionCard.addClass('selected');
						}
					};
				} else {
					// Single-select mode: original behavior
					let isProcessing = false;
					
					optionCard.onclick = async () => {
						if (isProcessing) return;
						
						isProcessing = true;
						optionCard.addClass('selected');
						optionsContainer.querySelectorAll('.llmsider-guided-option-card').forEach(card => {
							card.addClass('disabled');
							(card as HTMLElement).onclick = null;
						});
						
						// Check for special options
						if (option === i18n?.t('ui.endGuidedMode') || option === 'End guided mode') {
							const endMessage: ChatMessage = {
								id: Date.now().toString(),
								role: 'assistant',
								content: i18n?.t('ui.guidedModeEnded') || 'Guided mode ended.',
								timestamp: Date.now()
							};
							
							this.messageManager.addMessageToUI(endMessage, this.currentSession);
							
							if (this.currentSession) {
								this.currentSession.messages.push(endMessage);
								await this.plugin.updateChatSession(this.currentSession.id, {
									messages: this.currentSession.messages
								});
							}
							return;
						}
						
						if (option === i18n?.t('ui.continueWithSuggestions') || option === 'Continue with AI suggestions') {
							const userMessage: ChatMessage = {
								id: Date.now().toString(),
								role: 'user',
								content: 'Please continue with the next suggestions.',
								timestamp: Date.now()
							};
							
							if (this.currentSession) {
								this.currentSession.messages.push(userMessage);
								await this.plugin.updateChatSession(this.currentSession.id, {
									messages: this.currentSession.messages
								});
							}
							
							await this.handleGuidedResponse(userMessage, this.currentSession?.messages || []);
							return;
						}
						
						// Send selected option
						await this.handleSendMessage(title, {
							isGuidedOption: true,
							guidedStep: message.metadata?.guidedStepNumber
						});
					};
				}
			}
		});
		
		// Add submit button for multi-select mode
		if (isMultiSelect && !message.metadata?.isStreaming && !isReloaded) {
			const submitContainer = optionsSection.createDiv({ cls: 'llmsider-guided-options-submit' });
			const submitBtn = submitContainer.createEl('button', {
				cls: 'llmsider-guided-submit-btn',
				text: i18n?.t('ui.submitSelection') || 'Submit Selection'
			});
			
			submitBtn.onclick = async () => {
				if (selectedOptions.size === 0) return;
				
				// Disable all options and submit button
				optionsContainer.querySelectorAll('.llmsider-guided-option-card').forEach(card => {
					card.addClass('disabled');
					(card as HTMLElement).onclick = null;
				});
				submitBtn.disabled = true;
				submitBtn.addClass('disabled');
				
				// Build selected options text
				const selectedTitles = Array.from(selectedOptions)
					.map(index => {
						const option = options[index];
						const parts = option.split(' - ');
						return parts[0];
					})
					.join(', ');
				
				// Send selected options
				await this.handleSendMessage(selectedTitles, {
					isGuidedOption: true,
					guidedStep: message.metadata?.guidedStepNumber
				});
			};
		}
	}
	
	/**
	 * Add guided message with options to UI
	 */
	private async addGuidedMessageToUI(message: ChatMessage): Promise<void> {
		// Add to UI
		this.messageManager.addMessageToUI(message, this.currentSession);
		
		// Add to session
		if (this.currentSession) {
			this.currentSession.messages.push(message);
			await this.plugin.updateChatSession(this.currentSession.id, {
				messages: this.currentSession.messages
			});
		}
		
		const messageEl = this.messageRenderer.findMessageElement(message.id);
		if (!messageEl) return;
		
	// If message has tool calls requiring confirmation, render tool approval cards
	if (message.metadata?.requiresToolConfirmation && message.metadata?.suggestedToolCalls) {
		const toolsContainer = messageEl.createDiv({ cls: 'llmsider-guided-tools' });
		const toolCalls = message.metadata.suggestedToolCalls as any[];
		
		// Get action description from message content
		const actionDescription = typeof message.content === 'string' 
			? message.content 
			: '';
		
		toolCalls.forEach((toolCall) => {
			const toolName = toolCall.name || toolCall.function?.name || 'Unknown Tool';
			
			// Parse tool arguments for display
			let toolParameters: Record<string, any> = {};
			if (toolCall.function?.arguments) {
				toolParameters = typeof toolCall.function.arguments === 'string' 
					? JSON.parse(toolCall.function.arguments) 
					: toolCall.function.arguments;
			} else if (toolCall.arguments) {
				toolParameters = typeof toolCall.arguments === 'string' 
					? JSON.parse(toolCall.arguments) 
					: toolCall.arguments;
			} else if (toolCall.input) {
				toolParameters = toolCall.input;
			}
			
			// Create card container
			const cardContainer = toolsContainer.createDiv();
			
			// Create the tool approval card with pending status
			new ToolResultCard(cardContainer, {
				toolName: toolName,
				status: 'pending',
				parameters: toolParameters,
				timestamp: new Date(),
				description: actionDescription // 添加动作描述
			}, async () => {
				// Approve callback - execute the tool
				await this.executeToolWithCard(cardContainer, toolCall, message);
			}, () => {
				// Cancel callback - remove the card
				cardContainer.remove();
			});
		});
	}		// If message has options, render them as cards
		if (message.metadata?.isGuidedQuestion && message.metadata?.guidedOptions) {
			// Add a special class for guided questions
			messageEl.addClass('llmsider-guided-question-message');
			
			// Hide the original message content (it will be shown in the card)
			const originalContent = messageEl.querySelector('.llmsider-message-content');
			if (originalContent) {
				(originalContent as HTMLElement).style.display = 'none';
			}
			
			// Keep hover actions visible for guided question messages
			// Users should be able to copy the question or generate notes
			// The action buttons will appear on hover over the message
			
			// Create a single card container for both question and options
			const cardContainer = messageEl.createDiv({ cls: 'llmsider-guided-card-container' });
			
			// Question section (gray background at top)
			const questionSection = cardContainer.createDiv({ cls: 'llmsider-guided-question-section' });
			
			// Render the question content using markdown
			const questionContent = questionSection.createDiv({ cls: 'llmsider-guided-question-content' });
			const contentText = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
			
			// Remove the numbered list items from the question content
			// Only show the question/instruction part before the options
			const cleanedContent = this.removeOptionsFromContent(contentText);
			this.messageRenderer.renderMarkdownContentPublic(questionContent, cleanedContent);
			
			// Hide question section if there's no meaningful content
			if (cleanedContent.trim().length === 0) {
				questionSection.style.display = 'none';
			}
			
			// Options section (white background with option cards)
			const optionsSection = cardContainer.createDiv({ cls: 'llmsider-guided-options-section' });
			
			// Create option cards directly without title/description
			const optionsContainer = optionsSection.createDiv({ cls: 'llmsider-guided-options' });
			
			// Get i18n manager for later use
			const i18n = this.plugin.getI18nManager();
			
			const options = message.metadata.guidedOptions as string[];
			options.forEach((option, index) => {
				const optionCard = optionsContainer.createDiv({
					cls: 'llmsider-guided-option-card'
				});
				
				// Number badge (shown by default)
				const numberBadge = optionCard.createEl('div', {
					cls: 'llmsider-guided-option-number',
					text: (index + 1).toString()
				});
				
				// Checkmark icon (hidden by default, shown when selected)
				const checkmark = optionCard.createDiv({
					cls: 'llmsider-guided-option-checkmark'
				});
				setIcon(checkmark, 'check');
				
				// Content
				const content = optionCard.createDiv({ cls: 'llmsider-guided-option-content' });
				
				// Split option into title and description if it contains " - "
				const parts = option.split(' - ');
				const title = parts[0];
				const desc = parts.length > 1 ? parts.slice(1).join(' - ') : '';
				
				content.createEl('div', {
					cls: 'llmsider-guided-option-title',
					text: title
				});
				
				if (desc) {
					content.createEl('div', {
						cls: 'llmsider-guided-option-desc',
						text: desc
					});
				}
				
				// Prevent multiple clicks
				let isProcessing = false;
				
				optionCard.onclick = async () => {
					// Prevent duplicate clicks
					if (isProcessing) {
						Logger.debug('Option already being processed, ignoring click');
						return;
					}
					
					isProcessing = true;
					
					// Mark as selected and disable all cards
					optionCard.addClass('selected');
					optionsContainer.querySelectorAll('.llmsider-guided-option-card').forEach(card => {
						card.addClass('disabled');
						// Remove onclick handler to prevent any further clicks
						(card as HTMLElement).onclick = null;
					});
					
					// Check if user wants to end guided mode
					if (option === i18n?.t('ui.endGuidedMode') || option === 'End guided mode') {
						// Send a final message
						const endMessage: ChatMessage = {
							id: Date.now().toString(),
							role: 'assistant',
							content: i18n?.t('ui.guidedModeEnded') || 'Guided mode ended. You can continue chatting normally or start a new guided conversation anytime.',
							timestamp: Date.now()
						};
						
						this.messageManager.addMessageToUI(endMessage, this.currentSession);
						
						if (this.currentSession) {
							this.currentSession.messages.push(endMessage);
							await this.plugin.updateChatSession(this.currentSession.id, {
								messages: this.currentSession.messages
							});
						}
						return;
					}
					
					// Check if user wants to continue with AI suggestions after tool execution
					if (option === i18n?.t('ui.continueWithSuggestions') || option === 'Continue with AI suggestions') {
						// Send the tool result to AI and continue guided conversation
						const userMessage: ChatMessage = {
							id: Date.now().toString(),
							role: 'user',
							content: 'Please continue with the next suggestions.',
							timestamp: Date.now()
						};
						
						// Add user message to session
						if (this.currentSession) {
							this.currentSession.messages.push(userMessage);
							await this.plugin.updateChatSession(this.currentSession.id, {
								messages: this.currentSession.messages
							});
						}
						
						// Continue with guided conversation
						await this.handleGuidedResponse(userMessage, this.currentSession?.messages || []);
						return;
					}
					
					// Send the selected option as user's response
					await this.handleSendMessage(title, {
						isGuidedOption: true,
						guidedStep: message.metadata?.guidedStepNumber
					});
				};
			});
		}
		
		this.messageManager.scrollToBottom();
	}

	/**
	 * Remove option lines (with ➤CHOICE: prefix) from content, keeping only the question/instruction
	 * Regular numbered lists in markdown content are preserved
	 */
	private removeOptionsFromContent(content: string): string {
		const lines = content.split('\n');
		const cleanedLines: string[] = [];
		
		for (const line of lines) {
			// Check if this line is a ➤CHOICE line (option, MULTI, or SINGLE marker)
			const isOptionLine = /^\s*➤CHOICE:\s*(\d+\.\s+|MULTI\s*$|SINGLE\s*$)/i.test(line);
			
			if (isOptionLine) {
				// Skip this line (it's an option or mode marker)
				continue;
			}
			
			// Keep all other lines, including regular numbered lists
			cleanedLines.push(line);
		}
		
		// Join lines and trim trailing whitespace
		return cleanedLines.join('\n').trim();
	}

	/**
	 * Execute a tool in guided mode after user confirmation
	 */
	private async executeGuidedTool(toolCall: any, guidedMessage: ChatMessage, buttonElement?: HTMLButtonElement): Promise<void> {
		Logger.debug('Executing guided mode tool:', toolCall);
		
		try {
			const toolName = toolCall.name || toolCall.function?.name;
			
			// Parse tool arguments - handle different formats
			let toolArgs: any = {};
			if (toolCall.function?.arguments) {
				// Format: { function: { name: '...', arguments: '...' } }
				toolArgs = typeof toolCall.function.arguments === 'string' 
					? JSON.parse(toolCall.function.arguments) 
					: toolCall.function.arguments;
			} else if (toolCall.arguments) {
				// Format: { name: '...', arguments: '...' }
				toolArgs = typeof toolCall.arguments === 'string' 
					? JSON.parse(toolCall.arguments) 
					: toolCall.arguments;
			} else if (toolCall.input) {
				// Format: { toolName: '...', input: {...} }
				toolArgs = toolCall.input;
			}
			
			Logger.debug('Parsed tool args:', toolArgs);
			
			// Execute the tool using tool manager
			const executionResult = await this.plugin.toolManager.executeTool(toolName, toolArgs);
			
			// Update button to show result (if button provided)
			if (buttonElement) {
				if (executionResult.error) {
					buttonElement.classList.add('failed');
					buttonElement.classList.remove('executing');
					buttonElement.innerHTML = `
						<span class="llmsider-guided-tool-icon">❌</span>
						<span class="llmsider-guided-tool-name">${toolName} failed</span>
					`;
				} else {
					buttonElement.classList.add('completed');
					buttonElement.classList.remove('executing');
					buttonElement.innerHTML = `
						<span class="llmsider-guided-tool-icon">✅</span>
						<span class="llmsider-guided-tool-name">${toolName} completed</span>
					`;
				}
			}
			
			// Format result content for AI and display
			let resultContent = '';
			let displayContent = '';
			
			if (executionResult.error) {
				resultContent = `Error: ${executionResult.error}`;
				displayContent = `❌ **Error**\n\n${executionResult.error}`;
			} else if (executionResult.result) {
				// Format for AI
				if (typeof executionResult.result === 'string') {
					resultContent = executionResult.result;
					displayContent = resultContent;
				} else if (Array.isArray(executionResult.result)) {
					resultContent = executionResult.result.map((item: any) => 
						typeof item === 'object' && item.type === 'text' ? item.text : String(item)
					).join('\n');
					displayContent = resultContent;
				} else {
					// For object results, format nicely for display
					resultContent = JSON.stringify(executionResult.result, null, 2);
					
					// Parse common tool result formats
					const result = executionResult.result;
					if (result.success !== undefined && result.message) {
						// Format: { success: true, message: "...", content: "..." }
						displayContent = `✅ **${result.message}**`;
						if (result.content) {
							displayContent += `\n\n\`\`\`\n${result.content}\n\`\`\``;
						}
						if (result.path) {
							displayContent += `\n\n📁 Path: \`${result.path}\``;
						}
					} else {
						// Fallback: show JSON in code block
						displayContent = `\`\`\`json\n${resultContent}\n\`\`\``;
					}
				}
			} else {
				resultContent = 'Tool executed successfully (no result)';
				displayContent = '✅ Tool executed successfully';
			}
			
			// Show tool result to user using the card component
			const i18n = this.plugin.getI18nManager();
			
			// Parse tool arguments for display
			let toolParameters: Record<string, any> = {};
			if (toolCall.function?.arguments) {
				toolParameters = typeof toolCall.function.arguments === 'string' 
					? JSON.parse(toolCall.function.arguments) 
					: toolCall.function.arguments;
			} else if (toolCall.arguments) {
				toolParameters = typeof toolCall.arguments === 'string' 
					? JSON.parse(toolCall.arguments) 
					: toolCall.arguments;
			} else if (toolCall.input) {
				toolParameters = toolCall.input;
			}
			
			// Create a message container for the tool result card
			const toolResultMessage: ChatMessage = {
				id: Date.now().toString(),
				role: 'assistant',
				content: JSON.stringify({
					toolName: toolName,
					status: executionResult.error ? 'error' : 'success',
					parameters: toolParameters,
					result: executionResult.result,
					error: executionResult.error,
					timestamp: new Date()
				}),
				timestamp: Date.now(),
				metadata: {
					toolResult: true
				}
			};
			
			this.messageManager.addMessageToUI(toolResultMessage, this.currentSession);
			
			if (this.currentSession) {
				this.currentSession.messages.push(toolResultMessage);
				await this.plugin.updateChatSession(this.currentSession.id, {
					messages: this.currentSession.messages
				});
			}
			
			// Let AI decide next steps based on tool result
			// Send tool result back to AI for analysis and next action determination
			const allMessages = this.currentSession?.messages || [];
			await this.handleGuidedResponse(toolResultMessage, allMessages);
			
		} catch (error) {
			Logger.error('Error executing guided tool:', error);
			
			const errorMsg = error instanceof Error ? error.message : String(error);
			
			// Update button to show error (if button provided)
			if (buttonElement) {
				buttonElement.classList.add('failed');
				buttonElement.classList.remove('executing');
				const toolName = toolCall.name || toolCall.function?.name || 'tool';
				buttonElement.innerHTML = `
					<span class="llmsider-guided-tool-icon">❌</span>
					<span class="llmsider-guided-tool-name">${toolName} failed</span>
				`;
			}
			
			// Show error in chat
			const errorMessage: ChatMessage = {
				id: Date.now().toString(),
				role: 'assistant',
				content: `Error executing tool: ${errorMsg}`,
				timestamp: Date.now(),
				metadata: {
					hasError: true
				}
			};
			
			this.messageManager.addMessageToUI(errorMessage, this.currentSession);
			
			if (this.currentSession) {
				this.currentSession.messages.push(errorMessage);
				await this.plugin.updateChatSession(this.currentSession.id, {
					messages: this.currentSession.messages
				});
			}
		}
	}

	/**
	 * Execute a tool with card status updates
	 */
	private async executeToolWithCard(cardContainer: HTMLElement, toolCall: any, guidedMessage: ChatMessage): Promise<void> {
		Logger.debug('Executing tool with card:', toolCall);
		
		try {
			const toolName = toolCall.name || toolCall.function?.name;
			
			// Parse tool arguments - handle different formats
			let toolArgs: any = {};
			if (toolCall.function?.arguments) {
				toolArgs = typeof toolCall.function.arguments === 'string' 
					? JSON.parse(toolCall.function.arguments) 
					: toolCall.function.arguments;
			} else if (toolCall.arguments) {
				toolArgs = typeof toolCall.arguments === 'string' 
					? JSON.parse(toolCall.arguments) 
					: toolCall.arguments;
			} else if (toolCall.input) {
				toolArgs = toolCall.input;
			}
			
			// Show loading indicator before execution
			cardContainer.empty();
			const loadingEl = cardContainer.createDiv({ cls: 'llmsider-tool-loading' });
			const dotsContainer = loadingEl.createDiv({ cls: 'llmsider-typing-dots' });
			const middleDot = dotsContainer.createEl('span', { cls: 'llmsider-typing-dot' });
			middleDot.style.cssText = `
				width: 8px;
				height: 8px;
				border-radius: 50%;
				background: var(--text-muted);
				animation: typing 1.4s infinite both;
				animation-delay: 0.2s;
			`;
			
			// Small delay to show loading animation
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Update card to executing status
			cardContainer.empty();
			new ToolResultCard(cardContainer, {
				toolName: toolName,
				status: 'executing',
				parameters: toolArgs,
				timestamp: new Date()
			});
			
		// Execute the tool
		const toolManager = this.plugin.getToolManager();
		if (!toolManager) {
			throw new Error('Tool manager not available');
		}
		const result = await toolManager.executeTool(toolName, toolArgs);
		
		// Check if tool execution failed
		if (result.success === false) {
			const errorMsg = result.error || 'Tool execution failed';
			throw new Error(errorMsg);
		}
		
		// Update card to success status
		cardContainer.empty();
		const actionDescription = typeof guidedMessage.content === 'string' ? guidedMessage.content : '';
		new ToolResultCard(cardContainer, {
			toolName: toolName,
			status: 'success',
			parameters: toolArgs,
			result: result,
			timestamp: new Date(),
			description: actionDescription // 保留工具执行目的描述
		});			// Add tool result to messages (for AI context only, NOT displayed in UI)
			const i18n = this.plugin.getI18nManager();
			
			// Format tool result for AI to understand
			let toolResultContent = `${i18n?.t('ui.toolExecutedSuccessfully') || 'Tool executed successfully'}: ${toolName}\n\n`;
			
			// Add tool result in a structured format
			if (result.result) {
				// If result has a structured result field, format it nicely
				if (typeof result.result === 'object') {
					toolResultContent += `**Result:**\n\`\`\`json\n${JSON.stringify(result.result, null, 2)}\n\`\`\``;
				} else {
					toolResultContent += `**Result:** ${result.result}`;
				}
			} else if (typeof result === 'object') {
				// If the result itself is an object, format it
				toolResultContent += `**Result:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
			} else {
				toolResultContent += `**Result:** ${result}`;
			}
			
			const toolResultMessage: ChatMessage = {
				id: Date.now().toString(),
				role: 'assistant',
				content: toolResultContent,
				timestamp: Date.now(),
				metadata: {
					toolResult: true,
					toolName: toolName,
					toolExecutions: [{
						id: Date.now().toString(),
						toolName: toolName,
						parameters: toolArgs,
						result: result,
						status: 'completed',
						timestamp: Date.now()
					}],
					// Mark as internal message - don't render in UI
					internalMessage: true
				}
			};
			
			// Add to session messages for AI context, but DON'T add to UI
			// The ToolResultCard above is the only UI representation needed
			if (this.currentSession) {
				this.currentSession.messages.push(toolResultMessage);
				await this.plugin.updateChatSession(this.currentSession.id, {
					messages: this.currentSession.messages
				});
			}
			
			// Let AI decide next steps based on tool result
			// Send tool result back to AI for analysis and next action determination
			const allMessages = this.currentSession?.messages || [];
			await this.handleGuidedResponse(toolResultMessage, allMessages);
			
		} catch (error) {
			Logger.error('Error executing tool with card:', error);
			
			const errorMsg = error instanceof Error ? error.message : String(error);
			const toolName = toolCall.name || toolCall.function?.name;
			
			// Parse parameters again for error card
			let toolArgs: any = {};
			if (toolCall.function?.arguments) {
				toolArgs = typeof toolCall.function.arguments === 'string' 
					? JSON.parse(toolCall.function.arguments) 
					: toolCall.function.arguments;
			} else if (toolCall.arguments) {
				toolArgs = typeof toolCall.arguments === 'string' 
					? JSON.parse(toolCall.arguments) 
					: toolCall.arguments;
			} else if (toolCall.input) {
				toolArgs = toolCall.input;
			}
			
			// Update card to error status with three action buttons
			cardContainer.empty();
			const i18n = this.plugin.getI18nManager();
			new ToolResultCard(cardContainer, {
				toolName: toolName,
				status: 'error',
				parameters: toolArgs,
				error: errorMsg,
				timestamp: new Date(),
				// Three buttons for error handling
				onRegenerateAndRetry: async () => {
					Logger.debug('User chose: Regenerate and Retry for Guided mode tool');
					// For Guided mode, regeneration is simpler - just ask AI to try again with corrected parameters
					// Update card to show regenerating status
					cardContainer.empty();
					new ToolResultCard(cardContainer, {
						toolName: toolName,
						status: 'executing',
						parameters: toolArgs,
						timestamp: new Date()
					});
					
					// Send error context back to AI for regeneration
					const regenerationPrompt = `上一次工具执行失败了。工具名称：${toolName}，错误信息：${errorMsg}。请分析错误原因，调整参数后重新调用工具。`;
					await this.handleSendMessage(regenerationPrompt);
				},
				onRetry: async () => {
					Logger.debug('User chose: Retry for Guided mode tool');
					// Retry callback - execute again with same parameters
					await this.executeToolWithCard(cardContainer, toolCall, guidedMessage);
				},
				onSkip: async () => {
					Logger.debug('User chose: Skip for Guided mode tool');
					// Update card to show skipped status (keep error state)
					cardContainer.empty();
					new ToolResultCard(cardContainer, {
						toolName: toolName,
						status: 'error',
						parameters: toolArgs,
						error: `${errorMsg} (${i18n?.t('common.skip') || '已跳过'})`,
						timestamp: new Date()
					});
					
					// Send skip context to AI
					const skipMessage = `工具 ${toolName} 执行失败已被跳过。错误：${errorMsg}。请继续后续步骤或提供替代方案。`;
					await this.handleSendMessage(skipMessage);
				},
				regenerateAndRetryButtonText: i18n?.t('common.regenerateAndRetry') || '重新生成并重试',
				retryButtonText: i18n?.t('common.retry') || '重试',
				skipButtonText: i18n?.t('common.skip') || '跳过'
			});
			
			// Note: Error is already shown in the tool card above, no need to show a separate error message
			// This keeps the UI clean and avoids redundant error information
		}
	}

	/**
	 * Determine if query should use plan-execute framework
	 */
	private shouldUsePlanExecuteFramework(_content: string, availableTools: UnifiedTool[]): boolean {
		// Always use plan-execute framework when agent mode is enabled and tools are available
		return this.plugin.settings.agentMode && availableTools.length > 0;
	}

	/**
	 * Handle Agent mode change and manage MCP connections
	 */
	private async handleAgentModeChange(agentMode: boolean): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			Logger.debug('MCP Manager not available');
			return;
		}

		try {
			if (agentMode) {
				// Agent mode enabled - connect auto-connect servers
				Logger.debug('Agent mode enabled, connecting MCP servers...');
				await mcpManager.connectAutoConnectServers();
			} else {
				// Agent mode disabled - disconnect all servers
				Logger.debug('Agent mode disabled, disconnecting MCP servers...');
				await mcpManager.disconnectAllServers();
			}
		} catch (error) {
			Logger.error('Error handling MCP connections during Agent mode change:', error);
		}
	}

	/**
	 * Handle stop streaming
	 */
	private handleStopStreaming() {
		this.streamManager.stopStreaming();
	}

	/**
	 * Set up UI event listeners
	 */
	private setupUIEventListeners(): void {
		this.cleanupEventListeners();

		// New chat event
		const newChatHandler = async () => {
			Logger.debug('New chat button clicked - starting new session process');

			// Clear context first
			Logger.debug('Clearing context manager');
			this.contextManager.clearContext();
			this.updateContextDisplay();

			// Create new session
			Logger.debug('Creating new session via sessionManager');
			const oldSession = this.currentSession;
			this.currentSession = await this.sessionManager.newChat();
			Logger.debug('New session created:', {
				oldSessionId: oldSession?.id,
				newSessionId: this.currentSession?.id,
				newSessionMessages: this.currentSession?.messages?.length || 0
			});

			// Update session name in header
			this.uiBuilder.updateSessionNameDisplay(this.currentSession.name);

			// Keep current conversation mode (already loaded from SQLite on startup)
			// No need to apply defaultConversationMode - user's preference is already persisted
			Logger.debug('Using current conversation mode:', this.plugin.settings.conversationMode);
			
			// Update mode selector UI to reflect current mode
			window.dispatchEvent(new CustomEvent('llmsider-conversation-mode-changed', { 
				detail: { mode: this.plugin.settings.conversationMode } 
			}));

			// Clear and re-render messages
			Logger.debug('Rendering messages for new session');
			this.messageManager.renderMessages(this.currentSession);

			// Force refresh UI state after new session creation
			Logger.debug('Refreshing UI state');
			this.refreshUIState();

			Logger.debug('New chat process completed with mode:', this.plugin.settings.conversationMode);
		};
		this.uiEventListeners.set('llmsider-new-chat', newChatHandler);
		window.addEventListener('llmsider-new-chat', newChatHandler);

		// Show history event
		const showHistoryHandler = () => this.sessionManager.showChatHistory();
		this.uiEventListeners.set('llmsider-show-history', showHistoryHandler);
		window.addEventListener('llmsider-show-history', showHistoryHandler);

		// Show context options event
		const showContextHandler = () => this.inputHandler?.showContextOptions();
		this.uiEventListeners.set('llmsider-show-context-options', showContextHandler);
		window.addEventListener('llmsider-show-context-options', showContextHandler);

		// Agent mode change event
		const agentModeChangeHandler = (event: any) => {
			const { agentMode } = event.detail;
			Logger.debug('Agent mode changed:', agentMode);

			// Handle MCP server connections based on Agent mode
			this.handleAgentModeChange(agentMode);

			// Refresh message actions for all existing messages
			if (this.currentSession) {
				this.messageManager.refreshMessageActions(this.currentSession);
			}
		};
		this.uiEventListeners.set('llmsider-agent-mode-changed', agentModeChangeHandler);
		window.addEventListener('llmsider-agent-mode-changed', agentModeChangeHandler);
		
		// Mode changed event (for the new ConversationMode selector)
		const modeChangedHandler = (event: any) => {
			const { mode } = event.detail;
			Logger.debug('Conversation mode changed:', mode);
			// No special handling needed currently, mode is already saved in settings
		};
		this.uiEventListeners.set('llmsider-mode-changed', modeChangedHandler);
		window.addEventListener('llmsider-mode-changed', modeChangedHandler);

		// Add provider for message comparison event
		const addProviderForMessageHandler = (event: any) => {
			const { messageId, triggerButton } = event.detail;
			Logger.debug('Add provider for message:', messageId);
			this.handleAddProviderForMessage(messageId, triggerButton);
		};
		this.uiEventListeners.set('llmsider-add-provider-for-message', addProviderForMessageHandler);
		window.addEventListener('llmsider-add-provider-for-message', addProviderForMessageHandler);

		// Clear chat event
		const clearChatHandler = async () => {
			await this.handleClearCurrentChat();
		};
		this.uiEventListeners.set('llmsider-clear-chat', clearChatHandler);
		window.addEventListener('llmsider-clear-chat', clearChatHandler);

		// Edit message event
		const editMessageHandler = (event: any) => {
			const { messageId, message } = event.detail;
			this.messageManager.handleEditMessage(messageId, message, this.currentSession, this.inputElement);
		};
		this.uiEventListeners.set('llmsider-edit-message', editMessageHandler);
		window.addEventListener('llmsider-edit-message', editMessageHandler);

		// Diff reprocess event
		const diffReprocessHandler = (event: any) => {
			const { messageId, contentEl } = event.detail;
			if (this.currentSession) {
				const message = this.currentSession.messages.find(msg => msg.id === messageId);
				if (message && message.metadata?.hasJSDiff && message.metadata?.diffResult) {
					this.diffProcessor.renderJSDiffVisualization(
						contentEl,
						message.metadata.diffResult,
						message.metadata.originalContent!,
						message.metadata.modifiedContent!
					);
				}
			}
		};
		this.uiEventListeners.set('llmsider-reprocess-diff', diffReprocessHandler);
		window.addEventListener('llmsider-reprocess-diff', diffReprocessHandler);

		// Render guided card event (for reloaded guided messages)
		const renderGuidedCardHandler = (event: any) => {
			const { message } = event.detail;
			if (message?.metadata?.isGuidedQuestion) {
				setTimeout(() => {
					// When reloading from session, mark as reloaded so options/tools are disabled
					this.renderGuidedCard(message, true);
				}, 100); // Delay to ensure DOM is ready
			}
		};
		this.uiEventListeners.set('llmsider-render-guided-card', renderGuidedCardHandler);
		window.addEventListener('llmsider-render-guided-card', renderGuidedCardHandler);

// Provider tab switched event
const providerTabSwitchedHandler = async (event: any) => {
const { messageId, providerKey } = event.detail;
Logger.debug('Provider tab switched:', messageId, providerKey);

// Only save the session, do NOT change the global active provider
// This keeps the provider selector independent from tab switching
if (this.currentSession) {
await this.plugin.updateChatSession(this.currentSession.id, {
messages: this.currentSession.messages,
updated: Date.now()
});
}
};
		this.uiEventListeners.set('llmsider-provider-tab-switched', providerTabSwitchedHandler);
		window.addEventListener('llmsider-provider-tab-switched', providerTabSwitchedHandler);

		// Provider tab removed event
		const providerTabRemovedHandler = async (event: any) => {
			const { messageId, providerKey } = event.detail;
			Logger.debug('Provider tab removed:', messageId, providerKey);
			if (this.currentSession) {
				await this.plugin.updateChatSession(this.currentSession.id, {
					messages: this.currentSession.messages,
					updated: Date.now()
				});
			}
		};
		this.uiEventListeners.set('llmsider-provider-tab-removed', providerTabRemovedHandler);
		window.addEventListener('llmsider-provider-tab-removed', providerTabRemovedHandler);
	}

	/**
	 * Clean up event listeners
	 */
	private cleanupEventListeners(): void {
		this.uiEventListeners.forEach((handler, eventName) => {
			window.removeEventListener(eventName, handler);
		});
		this.uiEventListeners.clear();
	}

	/**
	 * Update context display
	 */
	private updateContextDisplay(): void {
		if (!this.contextDisplay) return;

		this.contextDisplay.innerHTML = '';

		if (!this.contextManager.hasContext()) {
			this.contextDisplay.style.display = 'none';
			return;
		}

		this.contextDisplay.style.display = 'block';
		const contextContainer = this.contextDisplay.createDiv({ cls: 'llmsider-context-container' });

		// Display note contexts
		const noteContexts = this.contextManager.getCurrentNoteContext();
		noteContexts.forEach((noteContext) => {
			const contextTag = contextContainer.createEl('span', { cls: 'llmsider-context-tag' });

			// Create icon container with SVG
			const iconContainer = contextTag.createEl('span', { cls: 'llmsider-context-icon' });
			
			// Determine icon based on type
			let svgIcon = '';
			if (noteContext.type === 'image') {
				// Image icon
				svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<circle cx="8.5" cy="8.5" r="1.5"></circle>
					<polyline points="21 15 16 10 5 21"></polyline>
				</svg>`;
			} else if (noteContext.type === 'document') {
				// Document icon
				svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
					<polyline points="14 2 14 8 20 8"></polyline>
					<line x1="16" y1="13" x2="8" y2="13"></line>
					<line x1="16" y1="17" x2="8" y2="17"></line>
					<polyline points="10 9 9 9 8 9"></polyline>
				</svg>`;
			} else {
				// Default file icon
				svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
					<polyline points="14 2 14 8 20 8"></polyline>
				</svg>`;
			}
			
			iconContainer.innerHTML = svgIcon;
			contextTag.createEl('span', { cls: 'llmsider-context-name', text: noteContext.name });

			const removeBtn = contextTag.createEl('button', {
				cls: 'llmsider-context-remove',
				text: '×',
				title: 'Remove note context'
			});

			removeBtn.onclick = () => {
				this.contextManager.removeNoteContext(noteContext.name);
				this.updateContextDisplay();
			};
		});

		// Display selected text contexts
		const selectedTextContexts = this.contextManager.getSelectedTextContexts();
		selectedTextContexts.forEach((selectedTextContext, index) => {
			const contextTag = contextContainer.createEl('span', { cls: 'llmsider-context-tag' });

			// Scissors icon for selected text
			const iconContainer = contextTag.createEl('span', { cls: 'llmsider-context-icon' });
			iconContainer.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="6" cy="6" r="3"></circle>
				<circle cx="6" cy="18" r="3"></circle>
				<line x1="20" y1="4" x2="8.12" y2="15.88"></line>
				<line x1="14.47" y1="14.48" x2="20" y2="20"></line>
				<line x1="8.12" y1="8.12" x2="12" y2="12"></line>
			</svg>`;
			
			// Show index if multiple selections
			const displayText = selectedTextContexts.length > 1 
				? `${index + 1}. ${selectedTextContext.preview}`
				: selectedTextContext.preview;
			
			contextTag.createEl('span', {
				cls: 'llmsider-context-name',
				text: displayText,
				title: selectedTextContext.text
			});

			const removeBtn = contextTag.createEl('button', {
				cls: 'llmsider-context-remove',
				text: '×',
				title: 'Remove selected text'
			});

			removeBtn.onclick = () => {
				this.contextManager.removeSelectedTextContext(index);
				this.updateContextDisplay();
			};
		});

		// Display suggested files (in pending state)
		this.renderSuggestedFiles(contextContainer);
	}

	/**
	 * Render suggested files with gray/pending styling
	 */
	private renderSuggestedFiles(container: HTMLElement): void {
		// Clear existing suggested elements from container if they exist
		this.activeSuggestions.forEach((suggestion, key) => {
			if (suggestion.element && suggestion.element.parentElement === container) {
				clearTimeout(suggestion.timeout);
				suggestion.element.remove();
			}
		});
		// Note: We don't clear the map here as new suggestions may come in

		// Only show suggestions from activeSuggestions map
		this.activeSuggestions.forEach((suggestion, filePath) => {
			const suggestionTag = container.createEl('span', { 
				cls: 'llmsider-context-tag llmsider-suggested-tag'
			});

			// Create icon container with SVG (suggestion icon)
			const iconContainer = suggestionTag.createEl('span', { cls: 'llmsider-context-icon' });
			iconContainer.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
				<line x1="9" y1="10" x2="15" y2="10"></line>
				<line x1="12" y1="7" x2="12" y2="13"></line>
			</svg>`;

			// Get filename from path
			const fileName = filePath.split('/').pop() || filePath;
			
			suggestionTag.createEl('span', { 
				cls: 'llmsider-context-name', 
				text: fileName,
				title: `Suggested: ${filePath}`
			});

			const removeBtn = suggestionTag.createEl('button', {
				cls: 'llmsider-context-remove',
				text: '×',
				title: 'Dismiss suggestion'
			});

			removeBtn.onclick = (e) => {
				e.stopPropagation();
				this.dismissSuggestion(filePath);
			};

			// Click on the tag to confirm the suggestion
			suggestionTag.onclick = () => {
				this.confirmSuggestion(filePath);
			};

			suggestionTag.style.cursor = 'pointer';
			suggestionTag.title = 'Click to add this file to context';

			// Update the element reference in the map
			suggestion.element = suggestionTag;
		});
	}

	/**
	 * Add suggestions for related files
	 */
	async showSuggestionsForFile(file: TFile): Promise<void> {
		if (!this.suggestedFilesManager.isEnabled()) {
			return;
		}

		try {
			const suggestions = await this.suggestedFilesManager.findRelatedFiles(file, 3);
			
			if (suggestions.length === 0) {
				return;
			}

			Logger.debug('Found suggestions:', suggestions.map(s => s.file.path));

			// Add each suggestion with timeout
			suggestions.forEach(suggestion => {
				this.addSuggestion(suggestion);
			});

			// Update display to show suggestions
			this.updateContextDisplay();
		} catch (error) {
			Logger.error('Error getting suggestions:', error);
		}
	}

	/**
	 * Add a single suggestion with auto-dismiss timeout
	 */
	private addSuggestion(suggestion: SuggestedFile): void {
		const filePath = suggestion.file.path;

		// Don't suggest files already in context
		const existingContexts = this.contextManager.getCurrentNoteContext();
		if (existingContexts.some(ctx => ctx.filePath === filePath)) {
			return;
		}

		// Don't re-add if already suggested
		if (this.activeSuggestions.has(filePath)) {
			return;
		}

		// Create timeout for auto-dismiss
		const timeout = window.setTimeout(() => {
			this.dismissSuggestion(filePath);
		}, this.suggestedFilesManager.getSuggestionTimeout());

		// Store suggestion with timeout reference and placeholder element
		this.activeSuggestions.set(filePath, {
			timeout,
			element: document.createElement('span') // Placeholder, will be replaced in render
		});
	}

	/**
	 * Confirm a suggestion by adding it to context
	 */
	private async confirmSuggestion(filePath: string): Promise<void> {
		const suggestion = this.activeSuggestions.get(filePath);
		if (!suggestion) return;

		// Clear timeout
		clearTimeout(suggestion.timeout);

		// Remove from suggestions
		this.activeSuggestions.delete(filePath);

		// Find the file
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			// Add to context
			await this.addFileReference(file);
		}

		// Update display
		this.updateContextDisplay();
	}

	/**
	 * Dismiss a suggestion without adding to context
	 */
	private dismissSuggestion(filePath: string): void {
		const suggestion = this.activeSuggestions.get(filePath);
		if (!suggestion) return;

		// Clear timeout
		clearTimeout(suggestion.timeout);

		// Remove from suggestions
		this.activeSuggestions.delete(filePath);

		// Update display
		this.updateContextDisplay();
	}

	/**
	 * Handle session loaded from history
	 */
	private handleSessionLoaded(session: ChatSession): void {
		Logger.debug('handleSessionLoaded - session loaded:', session.id);

		// Clear context first when switching sessions
		// This prevents stale context from previous sessions or after plugin reload
		Logger.debug('Clearing context manager for session switch');
		this.contextManager.clearContext();

		// Clear any active suggestions
		this.clearAllSuggestions();

		// Update current session
		this.currentSession = session;

		// Update session name in header
		this.uiBuilder.updateSessionNameDisplay(session.name);

		// Re-render messages for the loaded session
		this.messageManager.renderMessages(this.currentSession);

		// Refresh UI state
		this.refreshUIState();

		// Update context display (will show no context after clearing)
		this.updateContextDisplay();

		// Refresh message actions and diff rendering
		setTimeout(() => {
			this.messageManager.scrollToBottom();
			this.messageManager.refreshMessageActions(this.currentSession);
			this.messageManager.refreshDiffRendering(this.currentSession);
		}, 100);

		Logger.debug('Session loaded and UI refreshed');
	}

	/**
	 * Refresh UI state after session changes
	 */
	private refreshUIState(): void {
		Logger.debug('refreshUIState - starting UI refresh');

		// Reset input element state
		if (this.inputElement) {
			Logger.debug('refreshUIState - resetting input element');
			this.inputElement.disabled = false;
			this.inputElement.placeholder = 'Type your message...';
		} else {
			Logger.debug('refreshUIState - WARNING: inputElement not found');
		}

		// Reset button states
		if (this.sendButton) {
			Logger.debug('refreshUIState - showing send button');
			this.sendButton.style.display = 'block';
		} else {
			Logger.debug('refreshUIState - WARNING: sendButton not found');
		}

		if (this.stopButton) {
			Logger.debug('refreshUIState - hiding stop button');
			this.stopButton.style.display = 'none';
		} else {
			Logger.debug('refreshUIState - WARNING: stopButton not found');
		}

		// Update mode button if exists (no longer needed for agent mode)
		// this.uiBuilder.updateModeButton(this.currentMode);

		// Update provider select if needed
		if (this.inputHandler) {
			Logger.debug('refreshUIState - updating provider select');
			this.inputHandler.updateProviderSelect();
		} else {
			Logger.debug('refreshUIState - WARNING: inputHandler not found');
		}

		// Force focus to input after state refresh
		setTimeout(() => {
			if (this.inputElement) {
				Logger.debug('refreshUIState - focusing input element');
				this.inputElement.focus();
			}
		}, 100);

		Logger.debug('UI state refreshed after session change');
	}

	// Public methods for external access

	/**
	 * Add file reference to context
	 */
	public async addFileReference(file: TFile): Promise<void> {
		try {
			const result = await this.contextManager.addFileToContext(file);

			if (result.success) {
				this.updateContextDisplay();
				let message = result.message;
				if (result.note?.metadata?.extractedImages && result.note.metadata.extractedImages.length > 0) {
					message += ` (includes ${result.note.metadata.extractedImages.length} image(s))`;
				}
				new Notice(message);

				// Show suggestions for related files
				await this.showSuggestionsForFile(file);
			} else {
				new Notice(`Failed to add file: ${result.message}`);
			}
		} catch (error) {
			Logger.error('Error adding file reference:', error);
			new Notice('Failed to add file reference');
		}
	}

	/**
	 * Refresh all messages
	 */
	public refreshAllMessages() {
		this.messageManager.renderMessages(this.currentSession);
	}

	/**
	 * Update provider select when providers change
	 */
	onProviderChanged() {
		this.inputHandler?.updateProviderSelect();
		this.uiBuilder.updateProviderButtonPublic(); // Update provider button display
	}

	/**
	 * Handle Final Answer message from Plan-Execute processor
	 */
	private handleFinalAnswerMessage(message: ChatMessage): void {
		this.plugin.debug('[ChatView] Handling Final Answer message:', {
			id: message.id,
			isStreaming: message.metadata?.isStreaming,
			contentLength: message.content.length
		});

		// Check if this is a new message or update to existing
		if (this.currentSession) {
			const existingMessageIndex = this.currentSession.messages.findIndex(m => m.id === message.id);

			if (existingMessageIndex >= 0) {
				// Update existing message in session
				this.currentSession.messages[existingMessageIndex] = { ...message };
			} else {
				// Add new message to session
				this.currentSession.messages.push({ ...message });
				Logger.debug('Added new Final Answer message to session');
			}
		}

		// Use streaming update method instead of addMessageToUI
		this.messageManager.updateStreamingMessage(message, this.currentSession);

		// If streaming is complete, save the session
		if (!message.metadata?.isStreaming && this.currentSession) {
			Logger.debug('Final Answer streaming complete, saving session');
			this.plugin.updateChatSession(this.currentSession.id, {
				messages: this.currentSession.messages
			}).catch(error => {
				Logger.error('Error saving session after Final Answer:', error);
			});
		}
	}

	/**
	 * Handle plan created - save plan data to session for restoration
	 */
	private async handlePlanCreated(planData: any, tasks: any[]): Promise<void> {
		if (!this.currentSession) {
			Logger.debug('No current session to save plan data');
			return;
		}

		Logger.debug('Saving plan data to session:', {
			stepsCount: planData.steps?.length,
			tasksCount: tasks.length
		});

		// Create a plan message to persist in session
		const planMessage: ChatMessage = {
			id: 'plan-' + Date.now().toString(),
			role: 'assistant',
			content: JSON.stringify(planData),
			timestamp: Date.now(),
			metadata: {
				phase: 'plan',
				isPlanExecuteMode: true,
				internalMessage: false, // This should be displayed
				planTasks: JSON.parse(JSON.stringify(tasks)) as any // Save tasks for reload
			}
		};

		// Add to session and save
		this.currentSession.messages.push(planMessage);
		await this.plugin.updateChatSession(this.currentSession.id, {
			messages: this.currentSession.messages
		});

		Logger.debug('Plan data saved to session for restoration');
	}

	/**
	 * Handle clearing the current chat
	 */
	private async handleClearCurrentChat(): Promise<void> {
		if (!this.currentSession) {
			Logger.debug('No current session to clear');
			return;
		}

		Logger.debug('Clearing current chat session:', this.currentSession.id);

		// Stop any ongoing streaming or execution before clearing
		Logger.debug('Stopping any ongoing streaming before clearing chat');
		this.handleStopStreaming();
		
		// Stop Plan-Execute processor if running
		if (this.planExecuteProcessor) {
			Logger.debug('Stopping Plan-Execute processor before clearing chat');
			this.planExecuteProcessor.stop();
		}

		// Explicitly reset button states to ensure UI is correct
		Logger.debug('Resetting button states after stopping');
		this.streamManager.resetButtonStates();

		// Clear the messages from the current session
		this.currentSession.messages = [];

		// Clear the UI
		this.messageManager.renderMessages(this.currentSession);

		// Save the updated session
		await this.plugin.updateChatSession(this.currentSession.id, {
			messages: [],
			updated: Date.now()
		});

		Logger.debug('Current chat cleared successfully');
	}

	/**
	 * Handle provider tab change
	 */
	/**
	 * Handle add provider for specific message comparison
	 */
	private async handleAddProviderForMessage(messageId: string, triggerButton?: HTMLElement): Promise<void> {
		if (!this.currentSession) {
			new Notice('No active session');
			return;
		}

		Logger.debug('Add provider for message:', messageId);
		
		// Find the target assistant message
		const targetMessage = this.currentSession.messages.find(m => m.id === messageId);
		if (!targetMessage || targetMessage.role !== 'assistant') {
			new Notice('Message not found or not an assistant message');
			return;
		}
		
		// Find the message index
		const messageIndex = this.currentSession.messages.findIndex(m => m.id === messageId);

		// Show provider selection dropdown near the trigger button
		this.providerTabsManager.showAddProviderModal(async (selectedProvider: string) => {
			await this.addProviderResponseForMessage(targetMessage, messageIndex, selectedProvider);
		}, triggerButton);
	}

	/**
	 * Add a new provider response to an existing assistant message
	 */
	private async addProviderResponseForMessage(
		targetMessage: ChatMessage,
		messageIndex: number,
		selectedProvider: string
	): Promise<void> {
		if (!this.currentSession) return;

		Logger.debug('Adding provider response for message:', targetMessage.id, 'provider:', selectedProvider);

		// Store current provider's content if not already stored
		if (!targetMessage.providerResponses) {
			targetMessage.providerResponses = {};
			// Store the original content as the first provider response
			const originalProvider = targetMessage.metadata?.provider || this.currentSession.provider;
			if (originalProvider) {
				targetMessage.providerResponses[originalProvider] = {
					content: targetMessage.content,
					timestamp: targetMessage.timestamp,
					tokens: targetMessage.metadata?.tokens,
					model: targetMessage.metadata?.model
				};
				targetMessage.activeProvider = originalProvider;
			}
		}

		// Check if this provider already has a response
		if (targetMessage.providerResponses[selectedProvider]) {
			new Notice('This provider already has a response for this message');
			return;
		}

		// Get all messages up to (but not including) the target assistant message
		const conversationHistory = this.currentSession.messages.slice(0, messageIndex);
		
		// Find the last user message
		const lastUserMessage = conversationHistory.filter(m => m.role === 'user').pop();
		if (!lastUserMessage) {
			new Notice('No user message found before this assistant message');
			return;
		}

		// Initialize providerResponses if not exists
		if (!targetMessage.providerResponses) {
			targetMessage.providerResponses = {};
			// Store the original content as the first provider response
			const originalProvider = targetMessage.metadata?.provider || this.currentSession.provider;
			if (originalProvider) {
				targetMessage.providerResponses[originalProvider] = {
					content: targetMessage.content,
					timestamp: targetMessage.timestamp,
					tokens: targetMessage.metadata?.tokens,
					model: targetMessage.metadata?.model
				};
				targetMessage.activeProvider = originalProvider;
			}
		}

// Get the message element first (before modifying data)
const messageEl = document.querySelector(`[data-message-id="${targetMessage.id}"]`);
if (!messageEl) {
	Logger.error('Message element not found:', targetMessage.id);
	return;
}

// Get content element
const contentEl = messageEl.querySelector('.llmsider-message-content');
if (!contentEl) {
	Logger.error('Content element not found before rendering tabs');
	return;
}

// Create placeholder response for the new provider
targetMessage.providerResponses[selectedProvider] = {
	content: '', // Empty content, will be filled with streaming
	timestamp: Date.now()
};

// Set active provider to the new one
targetMessage.activeProvider = selectedProvider;

// First, render tabs at the top of contentEl (this will handle the new tab)
this.messageRenderer.renderProviderTabsForMessage(messageEl as HTMLElement, targetMessage);

// Now the tab is rendered, but we need to show loading in the content area
// Remove all children EXCEPT the tabs container
const tabsContainer = contentEl.querySelector('.llmsider-message-provider-tabs');
const children = Array.from(contentEl.children);
children.forEach(child => {
	if (child !== tabsContainer) {
		child.remove();
	}
});

// Add loading indicator in the content area (AFTER tabs)
// Use the same three-dot animation style as single provider
const dotsContainer = (contentEl as HTMLElement).createEl('div', { cls: 'llmsider-typing-dots' });
const middleDot = dotsContainer.createEl('span', { cls: 'llmsider-typing-dot' });
middleDot.style.cssText = `
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--text-muted);
	animation: typing 1.4s infinite both;
	animation-delay: 0.2s;
`;

		// Temporarily switch provider
		const originalProvider = this.currentSession.provider;
		const originalActiveConnectionId = this.plugin.settings.activeConnectionId;
		const originalActiveModelId = this.plugin.settings.activeModelId;
		
		// Parse and set the new provider
		if (selectedProvider.includes('::')) {
			const [connectionId, modelId] = selectedProvider.split('::');
			this.plugin.settings.activeConnectionId = connectionId;
			this.plugin.settings.activeModelId = modelId;
		}
		this.currentSession.provider = selectedProvider;

		// Start streaming mode with stop button
		const streamController = this.streamManager.startStreaming();
		
		// Set up stop handler - must call stopStreaming() to actually abort
		this.streamManager.setStopHandler(() => {
			Logger.debug('Multi-provider stream stopped by user');
			
			// Clear loading indicator if it's still showing
			const currentContentEl = messageEl.querySelector('.llmsider-message-content');
			if (currentContentEl) {
				// Remove the typing dots container (same as single provider)
				const dotsContainer = currentContentEl.querySelector('.llmsider-typing-dots');
				if (dotsContainer) {
					dotsContainer.remove();
				}
			}
			
			this.streamManager.stopStreaming();
		});

		try {
			// Get the provider instance
			const provider = this.plugin.getActiveProvider();
			if (!provider) {
				new Notice('Failed to get provider instance');
				return;
			}

			// Build the messages for the provider
			const systemPrompt = await this.getSystemPrompt();
			
			// Prepare conversation history without system message (will be passed separately)
			const conversationMessages = conversationHistory.map((msg, idx) => ({
				id: msg.id || `temp-${idx}`,
				role: msg.role,
				content: msg.content,
				timestamp: msg.timestamp || Date.now(),
				metadata: msg.metadata
			}));

			// Accumulated content for streaming
			let accumulatedContent = '';

		// Use streaming API with proper abort signal
		await provider.sendStreamingMessage(conversationMessages, (chunk) => {
			// Check if streaming was stopped
			if (streamController.signal.aborted) return;

			// Clear loading indicator on first chunk
			if (chunk.delta && accumulatedContent === '') {
				const currentContentEl = messageEl.querySelector('.llmsider-message-content');
				if (currentContentEl) {
					currentContentEl.classList.remove('llmsider-working-indicator');
					// Remove the typing dots container, keep the tabs!
					const dotsContainer = currentContentEl.querySelector('.llmsider-typing-dots');
					if (dotsContainer) {
						dotsContainer.remove();
					}
				}
			}

				if (chunk.delta) {
					accumulatedContent += chunk.delta;
					
					// Update the provider response content
					targetMessage.providerResponses![selectedProvider].content = accumulatedContent;

					// Update the UI with streaming content
					const currentContentEl = messageEl.querySelector('.llmsider-message-content');
					if (currentContentEl) {
						this.messageRenderer.updateStreamingContent(currentContentEl as HTMLElement, accumulatedContent);
					}
				}
			}, streamController.signal, undefined, systemPrompt);

			// Update final response
			targetMessage.providerResponses[selectedProvider] = {
				content: accumulatedContent,
				timestamp: Date.now()
			};

			// Save the session
			await this.plugin.updateChatSession(this.currentSession.id, {
				messages: this.currentSession.messages,
				updated: Date.now()
			});

			Logger.debug(`Response from ${this.getProviderLabel(selectedProvider)} completed`);
		} catch (error) {
			Logger.error('Error getting provider response:', error);
			
			// Handle abort error gracefully
			if (error instanceof Error && error.name === 'AbortError') {
				Logger.debug('Multi-provider stream was aborted by user');
				// Keep partial content if any was received
				if (targetMessage.providerResponses![selectedProvider].content) {
					// Save partial result
					await this.plugin.updateChatSession(this.currentSession.id, {
						messages: this.currentSession.messages,
						updated: Date.now()
					});
				} else {
					// Remove the empty response
					delete targetMessage.providerResponses[selectedProvider];
					// Re-render to remove the failed tab
					this.messageManager.renderMessages(this.currentSession);
				}
				return;
			}
			
			// Remove the failed response
			delete targetMessage.providerResponses[selectedProvider];
			// Re-render to remove the failed tab
			this.messageManager.renderMessages(this.currentSession);
			
			if (error instanceof Error) {
				new Notice(`Error: ${error.message}`);
			} else {
				new Notice('Failed to get response from provider');
			}
		} finally {
			// Always reset button states when streaming completes or fails
			this.streamManager.resetButtonStates();
			
			// Restore original provider settings
			this.currentSession.provider = originalProvider;
			this.plugin.settings.activeConnectionId = originalActiveConnectionId;
			this.plugin.settings.activeModelId = originalActiveModelId;
		}
	}

	/**
	 * Get human-readable label for a provider
	 */
	private getProviderLabel(provider: string): string {
		if (provider.includes('::')) {
			const [connectionId, modelId] = provider.split('::');
			const connection = this.plugin.settings.connections?.find((c: LLMConnection) => c.id === connectionId);
			const model = this.plugin.settings.models?.find((m: LLMModel) => m.id === modelId && m.connectionId === connectionId);
			if (model && connection) {
				return `${connection.name}: ${model.name}`;
			}
		}
		// Fallback to provider type name
		return provider.charAt(0).toUpperCase() + provider.slice(1);
	}

	/**
	 * Update provider tabs UI
	 */
	private updateProviderTabs(): void {
		if (!this.providerTabsManager || !this.currentSession) return;
		
		// Remove any existing tabs container first
		const existingTabs = this.messageContainer.querySelector('.llmsider-provider-tabs-container');
		if (existingTabs) {
			existingTabs.remove();
		}
	}

	/**
	 * Create step indicators for AI response process
	 * Returns container element that can be updated during the process
	 */
	private createStepIndicators(): HTMLElement {
		const container = this.messageContainer.createDiv({ cls: 'llmsider-step-indicators' });
		
		// Check if auto-search is enabled (not just vector DB loaded)
		const isVectorSearchEnabled = this.plugin.settings.vectorSettings.autoSearchEnabled;
		
		// Step 1: Vector Search (only if enabled)
		if (isVectorSearchEnabled) {
			const vectorStep = container.createDiv({ cls: 'llmsider-step-indicator pending' });
			vectorStep.dataset.step = 'vector-search';
			
			const vectorIcon = vectorStep.createDiv({ cls: 'llmsider-step-icon' });
			setIcon(vectorIcon, 'sparkles');
			
			vectorStep.createDiv({ 
				cls: 'llmsider-step-text',
				text: this.i18n.t('common.searchingLocalContext')
			});
		}
		
		// Step 2: AI Response
		const aiStep = container.createDiv({ cls: 'llmsider-step-indicator pending' });
		aiStep.dataset.step = 'ai-response';
		
		const aiIcon = aiStep.createDiv({ cls: 'llmsider-step-icon' });
		setIcon(aiIcon, 'bot');
		
		aiStep.createDiv({ 
			cls: 'llmsider-step-text',
			text: this.i18n.t('common.waitingForAIResponse')
		});
		
		return container;
	}

	/**
	 * Update step indicator state
	 */
	private updateStepIndicator(container: HTMLElement | null, stepName: string, state: 'pending' | 'active' | 'completed') {
		if (!container) return;
		
		const stepEl = container.querySelector(`[data-step="${stepName}"]`) as HTMLElement;
		if (!stepEl) return;
		
		// Remove all state classes
		stepEl.classList.remove('pending', 'active', 'completed');
		
		// Add new state class
		stepEl.classList.add(state);
		
		// Update icon for completed state
		if (state === 'completed') {
			const iconEl = stepEl.querySelector('.llmsider-step-icon') as HTMLElement;
			if (iconEl) {
				iconEl.empty();
				setIcon(iconEl, 'check-circle');
			}
		}
	}

	/**
	 * Remove step indicators
	 */
	private removeStepIndicators(container: HTMLElement | null) {
		if (container && container.parentElement) {
			container.remove();
		}
	}

	/**
	 * Refresh context search button state (called after vector DB initialization)
	 */
	public refreshContextSearchButton(): void {
		if (this.uiBuilder) {
			this.uiBuilder.refreshContextSearchButton();
		}
	}
}
