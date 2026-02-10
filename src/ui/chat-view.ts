/* eslint-disable @typescript-eslint/no-explicit-any */
import { ItemView, WorkspaceLeaf, Notice, TFile, setIcon } from "obsidian";
import { Logger } from "./../utils/logger";
import {
	CHAT_VIEW_TYPE,
	ChatMessage,
	ChatMode,
	ChatSession,
	LLMConnection,
	LLMModel,
} from "../types";
import { UnifiedTool } from "../tools/unified-tool-manager";
import { TokenManager } from "../utils/token-manager";
import LLMSiderPlugin from "../main";
import { MessageRenderer } from "./message-renderer";
import { DiffProcessor } from "../utils/diff-processor";
import { ContextManager } from "../core/context-manager";
import { InputHandler } from "./input-handler";
import { MastraPlanExecuteProcessor } from "../core/agent/mastra-plan-execute-processor";
import { ToolExecutionManager } from "../tools/tool-execution-manager";
import { NormalModeAgent } from "../core/agent/normal-mode-agent";
import { GuidedModeAgent } from "../core/agent/guided-mode-agent";
import { AgentFactory } from "../core/agent/agent-factory";
import { MemoryManager } from "../core/agent/memory-manager";
import { UIBuilder } from "./ui-builder";
import { MessageManager } from "./message-manager";
import { SessionManager } from "../core/session-manager";
import { StreamManager } from "../core/stream-manager";
import { I18nManager } from "../i18n/i18n-manager";
import { ToolResultCard, ToolResultData } from "./tool-result-card";
import { conversationLogger } from "../utils/conversation-logger";
import { ProviderTabsManager } from "./provider-tabs";
import {
	SuggestedFilesManager,
	SuggestedFile,
} from "./suggested-files-manager";
import { SuggestionsCoordinator } from "./suggestions/suggestions-coordinator";
import { UICoordinator } from "./ui-coordinator";
import { ChatViewEventManager } from "./events/chat-view-event-manager";
import { SessionHandler } from "./session/session-handler";
import { ProviderCoordinator } from "./provider/provider-coordinator";
import { ErrorRenderer } from "./error-renderer";
import { ToolPermissionHandler } from "../settings/handlers/tool-permission-handler";
import { ErrorActionPanel } from "./error-action-panel";
import { NormalModeHandler } from "./handlers/normal-mode-handler";
import { AgentModeHandler } from "./handlers/agent-mode-handler";
import { GuidedModeHandler } from "./handlers/guided-mode-handler";
import { ConversationOrchestrator } from "./orchestrator/conversation-orchestrator";
import { MemoryCoordinator } from "./memory/memory-coordinator";
import { ToolCoordinator } from "./tools/tool-coordinator";
import { MessagePreparationService } from "./messages/message-preparation-service";
import { GuidedModeUIRenderer } from "./guided/guided-mode-ui-renderer";
import { GuidedModeOrchestrator } from "./guided/guided-mode-orchestrator";
import {
	GuidedModeStreamCallbacks,
	IStreamState,
} from "./guided/guided-mode-stream-callbacks";
import {
	GuidedModeToolCallbacks,
	IToolCallbackState,
} from "./guided/guided-mode-tool-callbacks";

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
	heroContainer!: HTMLElement;
	suggestionPillsContainer!: HTMLElement;
	inputHint!: HTMLElement;

	// Manager components
	private uiBuilder: UIBuilder;
	private messageRenderer: MessageRenderer;
	private diffProcessor: DiffProcessor;
	private contextManager: ContextManager;
	private messageManager!: MessageManager;
	private sessionManager!: SessionManager;
	private streamManager!: StreamManager;
	private inputHandler!: InputHandler;
	private mastraPlanExecuteProcessor!: MastraPlanExecuteProcessor;
	private toolExecutionManager!: ToolExecutionManager;
	private providerTabsManager!: ProviderTabsManager;
	private suggestedFilesManager!: SuggestedFilesManager;
	private suggestionsCoordinator!: SuggestionsCoordinator;
	private uiCoordinator!: UICoordinator;
	private eventManager!: ChatViewEventManager;
	private normalModeHandler!: NormalModeHandler;
	private agentModeHandler!: AgentModeHandler;
	private guidedModeHandler!: GuidedModeHandler;
	private conversationOrchestrator!: ConversationOrchestrator;
	private sessionHandler!: SessionHandler;
	private providerCoordinator!: ProviderCoordinator;
	private memoryCoordinator!: MemoryCoordinator;
	private toolCoordinator!: ToolCoordinator;
	private messagePreparationService!: MessagePreparationService;
	private guidedModeUIRenderer!: GuidedModeUIRenderer;
	private guidedModeOrchestrator!: GuidedModeOrchestrator;

	// Mastra Agent components for normal/guided modes
	private normalModeAgent: NormalModeAgent | null = null;
	private guidedModeAgent: GuidedModeAgent | null = null;
	private sharedMemoryManager: MemoryManager | null = null;

	// Track provider/model used by agents to detect changes
	private agentProvider: string | null = null;
	private agentModel: string | null = null;

	// Track stopped message IDs to prevent updates after stop
	private stoppedMessageIds: Set<string> = new Set();

	// Language change listener
	private languageChangeListener?: (language: string) => void;

	/**
	 * Check if any execution is in progress (streaming, plan-execute, or guided mode)
	 */
	public isExecuting(): boolean {
		return this.streamManager?.getIsStreaming() || false;
	}

	constructor(leaf: WorkspaceLeaf, plugin: LLMSiderPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.i18n = plugin.getI18nManager()!;

		// Initialize core components
		const toolPermissionHandler = new ToolPermissionHandler(
			plugin,
			this.i18n,
			() => { }
		);
		this.uiBuilder = new UIBuilder(
			plugin,
			this.containerEl,
			toolPermissionHandler
		);
		this.messageRenderer = new MessageRenderer(this.app, plugin);
		this.diffProcessor = new DiffProcessor(this.app, plugin);
		this.contextManager = new ContextManager(
			this.app,
			plugin.getMCPManager() || undefined,
			plugin.getI18nManager() || undefined
		);
	}

	getViewType(): string {
		return CHAT_VIEW_TYPE;
	}

	getDisplayText() {
		return this.i18n.t("pluginName") + " Chat";
	}

	getIcon(): string {
		return "message-circle";
	}

	async onOpen() {
		this.containerEl.empty();

		// Clear context manager on view open/reload to prevent stale context
		// This ensures a clean state after plugin reload or view reopen
		Logger.debug("Clearing context manager on view open");
		this.contextManager.clearContext();

		// Set execution check callback for UIBuilder
		this.uiBuilder.setIsExecutingCallback(() => this.isExecuting());

		// Build UI using UIBuilder
		const uiComponents = this.uiBuilder.buildChatInterface();
		this.messageContainer = uiComponents.messageContainer;
		this.inputContainer = uiComponents.inputContainer;
		this.inputElement = uiComponents.inputElement;
		this.sendButton = uiComponents.sendButton;
		this.stopButton = uiComponents.stopButton;
		this.providerSelect = uiComponents.providerSelect;
		this.contextDisplay = uiComponents.contextDisplay;
		this.heroContainer = uiComponents.heroContainer;
		this.suggestionPillsContainer = uiComponents.suggestionPillsContainer;
		this.inputHint = uiComponents.inputHint;

		// Initialize provider tabs manager (will be inserted dynamically)
		const tabsWrapperEl = this.containerEl.createDiv();
		this.providerTabsManager = new ProviderTabsManager(
			this.plugin,
			tabsWrapperEl
		);

		// Initialize suggested files manager
		this.suggestedFilesManager = new SuggestedFilesManager(
			this.app,
			this.plugin
		);

		// Initialize suggestions coordinator
		this.suggestionsCoordinator = new SuggestionsCoordinator(
			this.app,
			this.plugin,
			this.contextManager,
			this.suggestedFilesManager
		);

		// Initialize UI coordinator
		this.uiCoordinator = new UICoordinator({
			plugin: this.plugin,
			messageContainer: this.messageContainer,
			contextDisplay: this.contextDisplay,
			inputElement: this.inputElement,
			sendButton: this.sendButton,
			stopButton: this.stopButton,
			contextManager: this.contextManager,
			suggestionsCoordinator: this.suggestionsCoordinator,
			i18n: this.i18n,
		});

		// Initialize managers with actual UI elements
		this.messageManager = new MessageManager(
			this.plugin,
			this.messageContainer,
			this.messageRenderer,
			this.diffProcessor
		);

		this.sessionManager = new SessionManager(
			this.plugin,
			this.messageContainer
		);

		this.streamManager = new StreamManager(
			this.sendButton,
			this.stopButton,
			this.inputElement
		);
		this.streamManager.setStopHandler(() => this.handleStopStreaming());

		// Initialize NormalModeHandler
		this.normalModeHandler = new NormalModeHandler(
			this.plugin,
			this.i18n,
			this.streamManager,
			this.messageManager,
			this.messageRenderer,
			this.contextManager,
			this.messageContainer
		);

		// Initialize tool execution manager
		this.toolExecutionManager = new ToolExecutionManager(
			this.plugin,
			this.messageContainer
		);

		// Initialize plan-execute processor
		this.mastraPlanExecuteProcessor = new MastraPlanExecuteProcessor(
			this.plugin,
			this.toolExecutionManager,
			this.messageContainer,
			this.contextManager
		);

		// Set up callbacks for plan-execute processor
		this.mastraPlanExecuteProcessor.setPlanCreatedCallback(
			(planData: unknown, tasks: unknown[]) => {
				this.handlePlanCreated(planData, tasks);
			}
		);

		// Initialize AgentModeHandler
		this.agentModeHandler = new AgentModeHandler(
			this.plugin,
			this.streamManager,
			this.mastraPlanExecuteProcessor
		);

		// Initialize GuidedModeHandler
		this.guidedModeHandler = new GuidedModeHandler(
			this.plugin,
			this.handleGuidedMode.bind(this)
		);

		// Initialize ConversationOrchestrator
		this.conversationOrchestrator = new ConversationOrchestrator(
			this.plugin,
			this.normalModeHandler,
			this.agentModeHandler,
			this.guidedModeHandler
		);

		// Initialize SessionHandler
		this.sessionHandler = new SessionHandler(
			this.plugin,
			this.sessionManager,
			this.contextManager,
			this.messageManager,
			this.streamManager,
			this.uiBuilder,
			this.mastraPlanExecuteProcessor,
			this.messageContainer,
			() => this.currentSession,
			(session) => {
				this.currentSession = session;
			},
			() => this.updateContextDisplay(),
			() => this.clearAllSuggestions(),
			() => this.refreshUIState(),
			(userMessage) => this.getAIResponse(userMessage)
		);

		// Initialize ProviderCoordinator
		this.providerCoordinator = new ProviderCoordinator(
			this.plugin,
			this.messageRenderer,
			this.messageManager,
			this.streamManager,
			this.providerTabsManager,
			this.messageContainer,
			() => this.currentSession,
			() => this.messagePreparationService.getSystemPrompt()
		);

		// Initialize MemoryCoordinator
		this.memoryCoordinator = new MemoryCoordinator(
			this.plugin,
			this.contextManager,
			this.toolExecutionManager,
			{
				getCurrentSession: () => this.currentSession,
				getSharedMemoryManager: () => this.sharedMemoryManager,
				setSharedMemoryManager: (manager) => {
					this.sharedMemoryManager = manager;
				},
				getProvider: () => this.plugin.getActiveProvider(),
			}
		);

		// Initialize ToolCoordinator
		this.toolCoordinator = new ToolCoordinator(
			this.plugin,
			this.toolExecutionManager,
			this.i18n,
			{
				getCurrentSession: () => this.currentSession,
			}
		);

		// Initialize MessagePreparationService
		this.messagePreparationService = new MessagePreparationService(
			this.plugin,
			this.contextManager,
			this.toolCoordinator,
			this.uiBuilder,
			{
				getCurrentSession: () => this.currentSession,
				updateStepIndicator: this.updateStepIndicator.bind(this),
				displayVectorSearchResults: this.displayVectorSearchResults.bind(this),
				updateSession: (sessionId, updates) =>
					this.plugin.updateChatSession(sessionId, updates),
				updateSessionNameDisplay: (name) =>
					this.uiBuilder.updateSessionNameDisplay(name),
			}
		);

		// Initialize GuidedModeUIRenderer
		this.guidedModeUIRenderer = new GuidedModeUIRenderer(
			this.plugin,
			this.messageRenderer,
			this.messageManager,
			this.memoryCoordinator,
			{
				getCurrentSession: () => this.currentSession,
				updateSession: (updates) =>
					this.plugin.updateChatSession(this.currentSession!.id, updates),
				handleSendMessage: this.handleSendMessage.bind(this),
				handleGuidedResponse: this.handleGuidedResponse.bind(this),
				getStoppedMessageIds: () => this.stoppedMessageIds,
			}
		);

		// Initialize GuidedModeOrchestrator
		this.guidedModeOrchestrator = new GuidedModeOrchestrator(
			this.messageRenderer,
			this.i18n,
			{
				getCurrentMessages: () => this.currentSession?.messages || [],
				addMessageToUI: (message) => this.messageManager.addMessageToUI(message),
				startGuidedConversationWithMastra:
					this.startGuidedConversationWithMastra.bind(this),
				handleGuidedResponseWithMastra:
					this.handleGuidedResponseWithMastra.bind(this),
				getAIResponse: this.getAIResponse.bind(this),
			}
		);
		this.inputHandler = new InputHandler(
			this.app,
			this.plugin,
			this.contextManager,
			this.inputElement,
			this.sendButton,
			this.providerSelect,
			this.contextDisplay,
			this.inputContainer,
			this.containerEl // Pass the main view container
		);

		// Initialize and set up callbacks
		await this.inputHandler.initialize();
		this.inputHandler.setChatView(this); // Set reference to ChatView for isExecuting check
		this.inputHandler.setOnSendMessage((content) =>
			this.handleSendMessage(content)
		);
		this.inputHandler.updateProviderSelect();
		this.uiBuilder.updateProviderButtonPublic(); // Update provider button display

		// Set up session loading callback
		this.sessionManager.setOnSessionLoadedCallback((session) =>
			this.sessionHandler.handleSessionLoaded(session)
		);

		// Initialize session and render messages
		await this.sessionHandler.initializeSession();

		this.updateContextDisplay();
		this.updateHeroVisibility();

		// Initialize event manager with callbacks
		this.eventManager = new ChatViewEventManager({
			onNewChat: async () => await this.sessionHandler.handleNewChat(),
			onShowHistory: () => this.sessionManager.showChatHistory(),
			onShowContextOptions: () => this.inputHandler?.showContextOptions(),
			onClearChat: async () =>
				await this.sessionHandler.handleClearCurrentChat(),
			onEditMessage: (messageId: string) =>
				this.messageManager.handleEditMessage(
					messageId,
					undefined,
					this.currentSession,
					this.inputElement
				),
			onRegenerateResponse: async (messageId: string) =>
				await this.sessionHandler.handleRegenerateResponse(messageId),
			onDiffReprocess: (messageId: string) =>
				this.handleDiffReprocess(messageId),
			onRenderGuidedCard: (messageId: string) =>
				this.handleRenderGuidedCard(messageId),
			onAgentModeChanged: (agentMode: boolean) =>
				this.handleAgentModeChange(agentMode),
			onModeChanged: (mode: string) => {
				/* No special handling needed */
			},
			onAddProviderForMessage: (
				messageId: string,
				triggerButton?: HTMLElement
			) =>
				this.providerCoordinator.handleAddProviderForMessage(
					messageId,
					triggerButton
				),
			onProviderTabSwitched: async (messageId: string, provider: string) =>
				await this.providerCoordinator.handleProviderTabSwitched(
					messageId,
					provider
				),
			onProviderTabRemoved: async (messageId: string, provider: string) =>
				await this.providerCoordinator.handleProviderTabRemoved(
					messageId,
					provider
				),
		});
		this.eventManager.setup();

		// Set up language change listener
		const languageChangeListener = (language: string) => {
			// Refresh the UI when language changes
			setTimeout(() => {
				this.onOpen(); // Rebuild the entire UI
			}, 100);
		};
		this.i18n.onLanguageChange(languageChangeListener);

		// Delayed initialization to ensure DOM is ready
		setTimeout(() => {
			this.messageManager.scrollToBottom();
			this.messageManager.refreshMessageActions(this.currentSession);
			this.messageManager.refreshDiffRendering(this.currentSession);
		}, 300);
	}

	async onClose() {
		// Clean up event manager
		if (this.eventManager) {
			this.eventManager.cleanup();
		}

		// Clean up conversation orchestrator
		if (this.conversationOrchestrator) {
			this.conversationOrchestrator.cleanup();
		}
		
		// Clean up mastra plan execute processor
		if (this.mastraPlanExecuteProcessor) {
			// Stop any ongoing execution and dispose resources
			this.mastraPlanExecuteProcessor.stop();
			this.mastraPlanExecuteProcessor.dispose();
		}

		// Clean up suggestions
		this.clearAllSuggestions();

		// Clean up language change listener
		if (this.languageChangeListener) {
			this.i18n.offLanguageChange(this.languageChangeListener);
			this.languageChangeListener = undefined;
		}

		// Clean up input handler
		if (this.inputHandler) {
			this.inputHandler.destroy();
		}
		
		// Clean up memory manager references
		this.sharedMemoryManager = null;
		this.normalModeAgent = null;
		this.guidedModeAgent = null;
		
		// Clear the container
		this.containerEl.empty();
	}

	/**
	 * Update hero section visibility based on message count
	 */
	private updateHeroVisibility(): void {
		if (this.heroContainer && this.suggestionPillsContainer && this.inputHint) {
			const hasMessages = this.currentSession && this.currentSession.messages.length > 0;
			if (hasMessages) {
				this.heroContainer.style.display = 'none';
				this.suggestionPillsContainer.style.display = 'none';
				this.inputHint.style.display = 'none';
			} else {
				this.heroContainer.style.display = 'flex';
				this.suggestionPillsContainer.style.display = 'flex';
				this.inputHint.style.display = 'block';
			}
		}
	}

	/**
	 * Clear all active suggestions
	 */
	private clearAllSuggestions(): void {
		this.suggestionsCoordinator.clearAllSuggestions();
	}

	/**
	 * Handle sending a new message
	 */
	private async handleSendMessage(
		content: string,
		metadata?: Record<string, unknown>
	) {
		if (!this.currentSession) return;

		// Create user message
		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			role: "user",
			content: content,
			timestamp: Date.now(),
			metadata: {
				provider: this.plugin.settings.activeProvider,
				...metadata,
			},
		};

		// Add to UI and session
		this.messageManager.addMessageToUI(userMessage, this.currentSession);
		this.messageManager.scrollToBottom();

		this.currentSession.messages.push(userMessage);
		await this.plugin.updateChatSession(this.currentSession.id, {
			messages: this.currentSession.messages,
		});

		this.updateHeroVisibility();

		// Get AI response
		await this.getAIResponse(userMessage);
	}

	/**
	 * Get AI response using providers and tools
	 */
	private async getAIResponse(userMessage: ChatMessage) {
		Logger.debug("🎬 [ChatView] ========== getAIResponse CALLED ==========");
		Logger.debug("🎬 [ChatView] userMessage:", userMessage);
		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			await this.messageManager.addMessage(
				{
					id: Date.now().toString(),
					role: "system",
					content: this.i18n.t("errors.noProvider"),
					timestamp: Date.now(),
				},
				this.currentSession
			);
			return;
		}

		// Initialize memory for all conversation modes using MemoryCoordinator
		const { memoryContext, memoryMessages, memoryEnabled } =
			await this.memoryCoordinator.initializeMemoryForConversation(userMessage);

		// Declare variables outside try-catch for error handling access
		let assistantMessage: ChatMessage | null = null;
		let workingMessageEl: HTMLElement | null = null;
		let stepIndicatorsEl: HTMLElement | null = null;

		try {
			// Create assistant message and UI element early, before prepareMessages
			// This ensures we have a UI element to show errors if prepareMessages fails
			assistantMessage = {
				id: Date.now().toString(),
				role: "assistant",
				content: "",
				timestamp: Date.now(),
				metadata: {
					provider: this.plugin.settings.activeProvider,
					model: this.plugin.getActiveModelName(),
					tokens: 0,
				},
			};

			// Check if auto-search is enabled (not just vector DB loaded)
			const isVectorSearchEnabled =
				this.plugin.settings.vectorSettings.autoSearchEnabled;

			// Always create step indicators for Normal Mode to show "等待大模型回复"
			// Will show vector search step only if enabled
			stepIndicatorsEl = this.createStepIndicators();

			// Don't add message to UI yet - wait for first streaming chunk
			// This prevents showing an empty message box before content arrives
			workingMessageEl = null;

			// Use ConversationOrchestrator to route the conversation
			const handled = await this.conversationOrchestrator.routeConversation({
				userMessage,
				currentSession: this.currentSession,
				provider,
				assistantMessage,
				workingMessageEl,
				stepIndicatorsEl,
				memoryContext,
				memoryMessages,
				memoryEnabled,
				updateStepIndicator: this.updateStepIndicator.bind(this),
				prepareMessages: this.messagePreparationService.prepareMessages.bind(
					this.messagePreparationService
				),
				autoGenerateSessionTitle:
					this.messagePreparationService.autoGenerateSessionTitle.bind(
						this.messagePreparationService
					),
				removeStepIndicators: this.removeStepIndicators.bind(this),
			});

			if (handled) {
				Logger.debug("[ChatView] Conversation routed and handled successfully");
				return; // Exit - handler managed everything
			}

			// Fall through to fallback implementation if not handled
			Logger.warn(
				"[ChatView] Conversation not handled by orchestrator, using fallback implementation"
			);

			// ============================================================
			// Original Normal/Guided Mode Implementation (Fallback)
			// ============================================================

			Logger.debug("🎬 [ChatView] Entering Fallback Implementation");

			// Get conversation mode and available tools
			const conversationMode =
				this.plugin.settings.conversationMode || "normal";

			// Get available tools (only in Agent conversation mode)
			let availableTools: any[] = [];
			if (conversationMode === "agent") {
				try {
					availableTools =
						(await this.plugin.getToolManager()?.getAllTools()) || [];
					Logger.debug(
						"Available tools for agent mode:",
						availableTools.length
					);
				} catch (error) {
					Logger.error("Failed to get available tools:", error);
				}
			}

			// Prepare messages for fallback implementation
			const messages = await this.messagePreparationService.prepareMessages(
				userMessage,
				stepIndicatorsEl,
				memoryContext,
				memoryMessages,
				memoryEnabled
			);

			// Start streaming
			const streamController = this.streamManager.startStreaming();
			let accumulatedContent = "";
			let totalTokens = 0;
			let collectedToolCalls: unknown[] = [];
			const streamStartTime = Date.now();

			// Extract system message from messages array for provider
			const systemMessage = messages.find((m) => m.role === "system");
			const conversationMessages = messages.filter((m) => m.role !== "system");
			const systemPrompt = (systemMessage?.content as string) || "";

			// Throttle UI updates during streaming to improve perceived streaming performance
			let lastUIUpdateTime = 0;
			const UI_UPDATE_INTERVAL = 100; // Update UI every 100ms max
			let pendingUpdate = false;
			let chunkCount = 0;
			let thinkingContent = "";
			let answerContent = "";

			// Set thread ID on provider for session management (e.g. Free Qwen)
			if (this.currentSession?.id && provider.setThreadId) {
				provider.setThreadId(this.currentSession.id);
			}

			await provider.sendStreamingMessage(
				conversationMessages,
				(chunk) => {
					if (streamController.signal.aborted) return;

					if (chunk.delta) {
						chunkCount++;

						// Accumulate content based on type
						if (chunk.metadata?.type === "thinking") {
							thinkingContent += chunk.delta;
						} else {
							answerContent += chunk.delta;
						}

						// Build complete display content
						let displayContent = "";

						// Add thinking section with callout (if exists) - expanded by default
						if (thinkingContent) {
							displayContent += "> [!tip] 思考过程\n";
							displayContent +=
								"> " + thinkingContent.split("\n").join("\n> ") + "\n\n";
						}

						// Add answer section
						if (answerContent) {
							displayContent += answerContent;
						}

						accumulatedContent = displayContent;
						if (assistantMessage) {
							assistantMessage.content = accumulatedContent;
						}

						// Remove thinking indicator on first chunk
						if (chunkCount === 1 && workingMessageEl) {
							const contentEl = workingMessageEl.querySelector(
								".llmsider-message-content"
							);
							if (contentEl) {
								const thinkingCard = contentEl.querySelector(
									".llmsider-plan-execute-tool-indicator"
								);
								if (thinkingCard) {
									Logger.debug(
										"🎬 [ChatView] Removing thinking indicator on first chunk"
									);
									thinkingCard.remove();
								}
								contentEl.empty();
								Logger.debug("🎬 [ChatView] First chunk - contentEl cleared");
							}
						}

						// Throttle UI updates: only update every 100ms to avoid excessive re-renders
						const now = Date.now();
						const contentEl = workingMessageEl?.querySelector(
							".llmsider-message-content"
						);
						if (contentEl) {
							const shouldUpdate =
								now - lastUIUpdateTime >= UI_UPDATE_INTERVAL ||
								chunkCount === 1;

							if (chunkCount <= 5) {
								Logger.debug(
									`🎬 [ChatView] Chunk #${chunkCount} | shouldUpdate: ${shouldUpdate} | accumulatedLength: ${accumulatedContent.length} | timeSinceLastUpdate: ${now - lastUIUpdateTime}ms`
								);
							}

							if (shouldUpdate) {
								// Update immediately for first chunk or after throttle interval
								lastUIUpdateTime = now;
								pendingUpdate = false;
								const displayContent =
									this.memoryCoordinator.stripMemoryMarkers(accumulatedContent);

								if (chunkCount <= 5) {
									Logger.debug(
										`🎬 [ChatView] Updating UI with content (${displayContent.length} chars): "${displayContent.substring(0, 30)}..."`
									);
								}

								this.messageRenderer.updateStreamingContent(
									contentEl as HTMLElement,
									displayContent
								);
								requestAnimationFrame(() => {
									this.messageManager.scrollToBottom();
								});
							} else if (!pendingUpdate) {
								// Schedule a delayed update
								pendingUpdate = true;
								setTimeout(
									() => {
										if (contentEl && accumulatedContent) {
											lastUIUpdateTime = Date.now();
											pendingUpdate = false;
											const displayContent =
												this.memoryCoordinator.stripMemoryMarkers(
													accumulatedContent
												);
											this.messageRenderer.updateStreamingContent(
												contentEl as HTMLElement,
												displayContent
											);
											requestAnimationFrame(() => {
												this.messageManager.scrollToBottom();
											});
										}
									},
									UI_UPDATE_INTERVAL - (now - lastUIUpdateTime)
								);
							}
						}
					}

					if (chunk.isComplete && chunk.usage) {
						totalTokens = chunk.usage.totalTokens;
					}

					// Collect tool calls if present
					if (chunk.toolCalls && chunk.toolCalls.length > 0) {
						collectedToolCalls = chunk.toolCalls;
					}
				},
				streamController.signal,
				conversationMode === "agent" && availableTools.length > 0
					? availableTools
					: undefined,
				systemPrompt
			);

			const streamDuration = Date.now() - streamStartTime;

			// Check if stream failed (empty response indicates network error)
			if (accumulatedContent.trim() === "" && collectedToolCalls.length === 0) {
				Logger.debug("Empty response detected - treating as network error");
				throw new Error("Failed to fetch: Empty response from server");
			}

			// Build final display content with thinking section - expanded by default
			let finalContent = "";
			if (thinkingContent) {
				finalContent += "> [!tip] 思考过程\n";
				finalContent +=
					"> " + thinkingContent.split("\n").join("\n> ") + "\n\n";
			}
			if (answerContent) {
				finalContent += answerContent;
			}

			// Strip memory markers from final displayed content
			const displayContent = this.memoryCoordinator.stripMemoryMarkers(
				finalContent || accumulatedContent
			);
			if (assistantMessage) {
				assistantMessage.content = displayContent;
			} // Process Action mode responses for diff rendering (only in normal/guided mode, not agent mode)
			if (conversationMode !== "agent") {
				await this.messageManager.processActionModeResponse(
					assistantMessage,
					displayContent,
					"action", // Always treat as action mode when not in agent conversation mode
					this.contextManager
				);
			}

			// Process tool calls (only in Agent conversation mode)
			if (conversationMode === "agent") {
				await this.toolCoordinator.processToolCalls(
					{ toolCalls: collectedToolCalls },
					accumulatedContent,
					availableTools
				);
			}

			// Update final message metadata
			if (assistantMessage.metadata) {
				assistantMessage.metadata.tokens = totalTokens;
				// No need to delete isWorking since we don't use it anymore
			}

			// Update working message element to final state
			if (workingMessageEl) {
				workingMessageEl.dataset.messageId = assistantMessage.id;
				// Only add message actions when not in agent conversation mode
				if (conversationMode !== "agent") {
					this.messageRenderer.addMessageActions(
						workingMessageEl,
						assistantMessage
					);
				}
			}

			// Update session
			if (this.currentSession) {
				this.currentSession.messages.push(assistantMessage);
				await this.plugin.updateChatSession(this.currentSession.id, {
					messages: this.currentSession.messages,
				});

				// Auto-generate session title after first round (unified for all modes)
				await this.messagePreparationService.autoGenerateSessionTitle(
					userMessage,
					assistantMessage
				);

				// Save conversation to memory (for all modes except agent, which handles memory internally)
				if (conversationMode !== "agent") {
					// Check if ANY memory feature is enabled
					const isAnyMemoryEnabled =
						this.plugin.settings.memorySettings.enableWorkingMemory ||
						this.plugin.settings.memorySettings.enableConversationHistory ||
						this.plugin.settings.memorySettings.enableSemanticRecall;

					if (!isAnyMemoryEnabled) {
						Logger.debug(
							`[Memory] All Memory features disabled, skipping save (mode: ${conversationMode})`
						);
					} else {
						Logger.debug(
							`[Memory] Saving conversation to memory (mode: ${conversationMode})...`
						);
						try {
							const memoryManager = await this.plugin.getMemoryManager();
							if (!memoryManager) {
								Logger.warn(
									"[Memory] Memory manager not available, skipping save"
								);
							} else {
								const resourceId = this.plugin.getResourceId();
								const threadId = this.currentSession.id;

								Logger.debug(
									`[Memory] Creating memory instance for thread: ${threadId}`
								);

								// Save user message and assistant response to memory
								const memory = await memoryManager.createMemorySimple({
									resourceId,
									threadId,
									enableWorkingMemory:
										this.plugin.settings.memorySettings.enableWorkingMemory,
									conversationHistoryCount:
										this.plugin.settings.memorySettings
											.conversationHistoryLimit || 10,
									semanticRecallCount:
										this.plugin.settings.memorySettings.semanticRecallLimit ||
										5,
								});

								Logger.debug("[Memory] Memory instance created");

								// Add messages to memory thread (only if conversation history is enabled)
								if (
									this.plugin.settings.memorySettings.enableConversationHistory
								) {
									Logger.debug(
										"[Memory] Adding messages to conversation history..."
									);
									const userContent =
										typeof userMessage.content === "string"
											? userMessage.content
											: JSON.stringify(userMessage.content);

									// CRITICAL: Use undefined for 'type' to let Mastra detect v1 format correctly
									// If we pass 'text', it will be treated as v2 which causes format errors
									await memory.addMessage({
										threadId,
										resourceId,
										role: "user",
										type: undefined as any, // Force v1 format detection
										content: userContent,
									});

									Logger.debug(
										"[Memory] User message saved, adding assistant message..."
									);

									await memory.addMessage({
										threadId,
										resourceId,
										role: "assistant",
										type: undefined as any, // Force v1 format detection
										content: accumulatedContent,
									});

									Logger.debug(
										`[Memory] ✅ Conversation saved successfully: thread=${threadId}, user_length=${userContent.length}, assistant_length=${accumulatedContent.length}`
									);
								} else {
									Logger.debug(
										"[Memory] ℹ️  Conversation history disabled, skipping addMessage"
									);
								}

								// Check if AI included memory updates in response (new format) - only if working memory is enabled
								if (this.plugin.settings.memorySettings.enableWorkingMemory) {
									const memoryUpdateMatch = accumulatedContent.match(
										/\[MEMORY_UPDATE\]([\s\S]*?)\[\/MEMORY_UPDATE\]/
									);
									if (memoryUpdateMatch) {
										const memoryUpdate = memoryUpdateMatch[1].trim();
										Logger.debug(
											"[Memory] 🧠 Found memory update in AI response:",
											memoryUpdate
										);

										try {
											// Update working memory with the new information
											await memory.updateWorkingMemory({
												threadId,
												resourceId,
												workingMemory: memoryUpdate,
											});
											Logger.debug(
												"[Memory] ✅ Working memory updated successfully"
											);
										} catch (updateError) {
											Logger.error(
												"[Memory] ❌ Failed to update working memory:",
												updateError
											);
										}
									}
								} else {
									Logger.debug(
										"[Memory] ℹ️  Working memory disabled, skipping memory update check"
									);
								}
							}
						} catch (error) {
							Logger.error(
								"[Memory] ❌ Failed to save conversation to memory:",
								error
							);
							if (error instanceof Error) {
								Logger.error("[Memory] Save error details:", {
									name: error.name,
									message: error.message,
									stack: error.stack?.split("\n").slice(0, 3).join("\n"),
								});
							}
							// Non-critical - continue execution
						}
					}
				} else {
					Logger.debug("[Memory] Agent mode - memory handled by MastraAgent");
				}
			}

			// Log conversation in Normal Mode (not in Agent or Guided mode)
			if (conversationMode === "normal" && this.currentSession) {
				await conversationLogger.logConversation(
					this.currentSession.id,
					this.plugin.settings.activeProvider,
					this.plugin.getActiveModelName(),
					userMessage,
					accumulatedContent,
					totalTokens > 0
						? {
							promptTokens: 0, // Not available from streaming
							completionTokens: 0,
							totalTokens: totalTokens,
						}
						: undefined,
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
			Logger.debug("========== ERROR CAUGHT ==========");
			Logger.debug(
				"Error type:",
				error instanceof Error ? "Error" : typeof error
			);
			Logger.debug("Error name:", error instanceof Error ? error.name : "N/A");
			Logger.debug(
				"Error message:",
				error instanceof Error ? error.message : String(error)
			);
			Logger.debug("workingMessageEl exists?", !!workingMessageEl);
			Logger.debug("assistantMessage exists?", !!assistantMessage);

			this.streamManager.resetButtonStates();
			this.messageRenderer.resetXmlBuffer();

			if (error instanceof Error && error.name === "AbortError") {
				Logger.debug("Stream was aborted by user");
				// Remove step indicators on abort
				this.removeStepIndicators(stepIndicatorsEl);
				return;
			}

			Logger.error("Error in AI response:", error);

			// Ensure message is added to UI if not already (for error display)
			if (!workingMessageEl && assistantMessage) {
				this.messageManager.addMessageToUI(
					assistantMessage,
					this.currentSession
				);
				this.messageManager.scrollToBottom();
				workingMessageEl = this.messageRenderer.findMessageElement(
					assistantMessage.id
				);
			}

			// Check if it's a validation error that is handled by StreamingIndicatorManager
			const isValidationError = error instanceof Error && 
				(error.message.includes('Plan validation failed') || 
				 (error as any).validationResult);

			if (isValidationError) {
				Logger.debug('[ChatView] Plan validation failed - removing working message as UI is handled by StreamingIndicatorManager');
				if (workingMessageEl) {
					workingMessageEl.remove();
				}
				// Also remove from session messages to keep history clean
				if (this.currentSession && assistantMessage) {
					const messageIndex = this.currentSession.messages.findIndex(
						(m) => m.id === assistantMessage!.id
					);
					if (messageIndex !== -1) {
						this.currentSession.messages.splice(messageIndex, 1);
					}
				}
				return; 
			}

			// Use unified error renderer
			if (workingMessageEl) {
				ErrorRenderer.renderErrorInMessage(
					workingMessageEl,
					error,
					this.i18n,
					async () => {
						// Remove the error message element
						if (workingMessageEl) {
							workingMessageEl.remove();
						}

						// Remove the failed message from session
						if (this.currentSession && assistantMessage) {
							const messageIndex = this.currentSession.messages.findIndex(
								(m) => m.id === assistantMessage!.id
							);
							if (messageIndex > -1) {
								this.currentSession.messages.splice(messageIndex, 1);
							}
						}

						// Retry the request
						Logger.debug("[ChatView] Retrying request...");
						await this.getAIResponse(userMessage);
					}
				);
			} else {
				Logger.error(
					"[ChatView] workingMessageEl is null! Cannot show error UI."
				);
			}

			this.plugin.logError(error, "Chat message failed");
			Logger.debug("========== ERROR HANDLING COMPLETE ==========");

			// Remove step indicators on error
			this.removeStepIndicators(stepIndicatorsEl);
		}
	}

	/**
	 * Auto-generate session title after first conversation round (if title is still 'Untitled')
	 * This is called from all conversation modes (normal, agent, guided)
	 */
	private async autoGenerateSessionTitle(
		userMessage: ChatMessage,
		assistantMessage: ChatMessage
	): Promise<void> {
		if (!this.currentSession) {
			Logger.debug("[TitleGen] No current session, skipping");
			return;
		}

		// Count only user and assistant messages, excluding system messages, tool messages, etc.
		const conversationMessages = this.currentSession.messages.filter(
			(m) => m.role === "user" || m.role === "assistant"
		);

		Logger.debug("[TitleGen] Session name:", this.currentSession.name);
		Logger.debug(
			"[TitleGen] Conversation messages count:",
			conversationMessages.length
		);
		Logger.debug(
			"[TitleGen] Total messages count:",
			this.currentSession.messages.length
		);
		Logger.debug(
			"[TitleGen] Message roles:",
			this.currentSession.messages.map((m) => m.role).join(", ")
		);

		// Only generate title after first round (2 messages: 1 user + 1 assistant)
		if (
			conversationMessages.length === 2 &&
			this.currentSession.name === "Untitled"
		) {
			// Run title generation in background without blocking
			const sessionId = this.currentSession.id;
			const currentSession = this.currentSession;

			// Don't await - let it run in background
			(async () => {
				try {
					const userContent =
						typeof userMessage.content === "string"
							? userMessage.content
							: JSON.stringify(userMessage.content);
					let assistantContent =
						typeof assistantMessage.content === "string"
							? assistantMessage.content
							: JSON.stringify(assistantMessage.content);

					// Extract final answer by removing thinking sections
					assistantContent =
						this.messagePreparationService.extractFinalAnswer(assistantContent);
					Logger.debug(
						"[TitleGen] Assistant content length (after removing thinking):",
						assistantContent.length
					);

					const sessionName =
						await this.uiBuilder.generateSessionNameFromMessage(
							userContent,
							assistantContent
						);

					Logger.debug("[TitleGen] ✓ Generated title:", sessionName);

					// Update session title
					await this.plugin.updateChatSession(sessionId, { name: sessionName });
					if (currentSession === this.currentSession) {
						currentSession.name = sessionName;
						this.uiBuilder.updateSessionNameDisplay(sessionName);
						Logger.debug("[TitleGen] ✓ Session title updated in UI");
					} else {
						Logger.debug("[TitleGen] ⚠️ Session changed, not updating UI");
					}
				} catch (error) {
					Logger.error(
						"[TitleGen] ❌ Failed to auto-generate session title:",
						error
					);
				}
			})();
		}
	}

	/**
	 * Handle Guided Mode conversation - delegates to GuidedModeOrchestrator
	 */
	private async handleGuidedMode(
		userMessage: ChatMessage,
		messages: ChatMessage[]
	): Promise<void> {
		return this.guidedModeOrchestrator.handleGuidedMode(userMessage, messages);
	}

	/**
	 * Start new guided conversation - delegates to GuidedModeOrchestrator
	 */
	private async startGuidedConversation(
		userMessage: ChatMessage,
		messages: ChatMessage[]
	): Promise<void> {
		return this.guidedModeOrchestrator.startGuidedConversation(
			userMessage,
			messages
		);
	}

	/**
	 * Handle user response to guided question - delegates to GuidedModeOrchestrator
	 */
	private async handleGuidedResponse(
		userMessage: ChatMessage,
		messages: ChatMessage[]
	): Promise<void> {
		return this.guidedModeOrchestrator.handleGuidedResponse(
			userMessage,
			messages
		);
	}

	/**
	  /**
	   * Handle Agent mode change and manage MCP connections
	   */
	private async handleAgentModeChange(agentMode: boolean): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			Logger.debug("MCP Manager not available");
			return;
		}

		try {
			if (agentMode) {
				// Agent mode enabled - connect auto-connect servers
				Logger.debug("Agent mode enabled, connecting MCP servers...");
				await mcpManager.connectAutoConnectServers();
			} else {
				// Agent mode disabled - disconnect all servers
				Logger.debug("Agent mode disabled, disconnecting MCP servers...");
				await mcpManager.disconnectAllServers();
			}
		} catch (error) {
			Logger.error(
				"Error handling MCP connections during Agent mode change:",
				error
			);
		}
	}

	/**
	 * Handle stop streaming
	 */
	private handleStopStreaming() {
		this.streamManager.stopStreaming();
	}

	/**
	 * Handle new chat creation
	 */
	/**
	 * Handle diff reprocess event
	 */
	private handleDiffReprocess(messageId: string): void {
		if (this.currentSession) {
			const message = this.currentSession.messages.find(
				(msg) => msg.id === messageId
			);
			if (
				message &&
				message.metadata?.hasJSDiff &&
				message.metadata?.diffResult
			) {
				const messageEl = document.querySelector(
					`[data-message-id="${messageId}"]`
				);
				if (messageEl) {
					const contentEl = messageEl.querySelector(
						".llmsider-message-content"
					) as HTMLElement;
					if (contentEl) {
						this.diffProcessor.renderJSDiffVisualization(
							contentEl,
							message.metadata.diffResult,
							message.metadata.originalContent!,
							message.metadata.modifiedContent!
						);
					}
				}
			}
		}
	}

	/**
	 * Handle render guided card event
	 */
	private handleRenderGuidedCard(messageId: string): void {
		if (this.currentSession) {
			const message = this.currentSession.messages.find(
				(msg) => msg.id === messageId
			);
			if (message?.metadata?.isGuidedQuestion) {
				// When reloading from session, mark as reloaded so options/tools are disabled
				this.guidedModeUIRenderer.renderGuidedCard(message, true);
			}
		}
	}

	/**
	 * Handle provider tab switched event
	 */
	/**
	 * Update context display
	 */
	private updateContextDisplay(): void {
		this.uiCoordinator.updateContextDisplay();
	}

	/**
	 * Show context content in a modal
	 */
	public showContextModal(title: string, content: string, type?: string): void {
		this.uiCoordinator.showContextModal(title, content, type);
	}

	/**
	 * Render suggested files with gray/pending styling
	 */
	private renderSuggestedFiles(container: HTMLElement): void {
		this.suggestionsCoordinator.renderSuggestedFiles(container);
	}

	/**
	 * Add suggestions for related files
	 */
	async showSuggestionsForFile(file: TFile): Promise<void> {
		await this.suggestionsCoordinator.showSuggestionsForFile(file);
	}

	/**
	   * Handle session loaded from history
	  /**
	   * Refresh UI state after session changes
	   */
	private refreshUIState(): void {
		this.uiCoordinator.refreshUIState();
		this.updateHeroVisibility();

		// Update provider select if needed
		if (this.inputHandler) {
			this.inputHandler.updateProviderSelect();
		}
	}

	// Public methods for external access

	/**
	 * Add file reference to context
	 */
	public async addFileReference(file: TFile): Promise<void> {
		try {
			// Pass model name to ensure proper token limits for file extraction
			const provider = this.plugin.getActiveProvider();
			const modelName = provider?.getModelName();
			const result = await this.contextManager.addFileToContext(
				file,
				modelName
			);

			if (result.success) {
				this.updateContextDisplay();
				let message = result.message;
				if (
					result.note?.metadata?.extractedImages &&
					result.note.metadata.extractedImages.length > 0
				) {
					message += ` (includes ${result.note.metadata.extractedImages.length} image(s))`;
				}
				new Notice(message);

				// Show suggestions for related files
				await this.showSuggestionsForFile(file);
			} else {
				const i18n = this.plugin.getI18nManager();
				new Notice(
					i18n?.t("notifications.chatView.failedToAddFile", {
						message: result.message,
					}) || `Failed to add file: ${result.message}`
				);
			}
		} catch (error) {
			Logger.error("Error adding file reference:", error);
			const i18n = this.plugin.getI18nManager();
			new Notice(
				i18n?.t("notifications.chatView.failedToAddFileReference") ||
				"Failed to add file reference"
			);
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

		// Reset agent to force re-initialization with new provider
		if (this.mastraPlanExecuteProcessor) {
			this.mastraPlanExecuteProcessor.resetAgent();
		}
	}

	// Agent 模式不需要 final answer - handleFinalAnswerMessage 方法已删除
	// 所有执行结果通过工具执行过程直接显示

	/**
	 * Handle plan created - save plan data to session for restoration
	 */
	private async handlePlanCreated(
		planData: unknown,
		tasks: unknown[],
		executionMode?: "dag" | "sequential"
	): Promise<void> {
		if (!this.currentSession) {
			Logger.debug("No current session to save plan data");
			return;
		}

		Logger.debug("Saving plan data to session:", {
			stepsCount: (planData as any).steps?.length,
			tasksCount: tasks.length,
			executionMode,
		});

		// Create a plan message to persist in session
		const planMessage: ChatMessage = {
			id: "plan-" + Date.now().toString(),
			role: "assistant",
			content: JSON.stringify(planData),
			timestamp: Date.now(),
			metadata: {
				phase: "plan",
				isPlanExecuteMode: true,
				internalMessage: false, // This should be displayed
				planTasks: JSON.parse(JSON.stringify(tasks)), // Save tasks for reload
				executionMode: executionMode || "dag", // Save execution mode for restoration
			},
		};

		// Add to session and save
		this.currentSession.messages.push(planMessage);
		await this.plugin.updateChatSession(this.currentSession.id, {
			messages: this.currentSession.messages,
		});

		Logger.debug("Plan data saved to session for restoration");

		// Auto-generate session title for agent mode after plan is created
		// Find the user message that triggered this plan (the last user message)
		const lastUserMessage = [...this.currentSession.messages]
			.reverse()
			.find((m) => m.role === "user");

		if (lastUserMessage) {
			// Generate a summary of the plan for title generation
			let planSummary = "";
			try {
				if (tasks && tasks.length > 0) {
					const taskDescriptions = (tasks as any[])
						.map((t, i) => `${i + 1}. ${t.title || t.tool || "Task"}`)
						.join("; ");
					planSummary = `计划：${taskDescriptions}`;
				} else {
					planSummary = JSON.stringify(planData).substring(0, 200);
				}
			} catch (error) {
				Logger.error("Failed to generate plan summary for title:", error);
				planSummary = "Agent 计划已创建";
			}

			await this.messagePreparationService.autoGenerateSessionTitle(
				lastUserMessage,
				planMessage
			);
		}
	}

	/**
	 * Handle clearing the current chat
	 */
	/**
	 * Handle provider tab change
	 */
	/**
	 * Create step indicators for AI response process
	 * Returns container element that can be updated during the process
	 */
	private createStepIndicators(): HTMLElement {
		return this.uiCoordinator.createStepIndicators();
	}

	/**
	 * Update step indicator state
	 */
	private updateStepIndicator(
		container: HTMLElement | null,
		stepName: string,
		state: "pending" | "active" | "completed"
	) {
		this.uiCoordinator.updateStepIndicator(container, stepName, state);
	}

	/**
	 * Display vector search results summary
	 */
	private displayVectorSearchResults(
		container: HTMLElement | null,
		results: any[]
	) {
		this.uiCoordinator.displayVectorSearchResults(container, results);
	}

	/**
	 * Remove step indicators
	 */
	private removeStepIndicators(container: HTMLElement | null) {
		this.uiCoordinator.removeStepIndicators(container);
	}

	/**
	 * Refresh context search button state (called after vector DB initialization)
	 */
	public refreshContextSearchButton(): void {
		this.uiCoordinator.refreshContextSearchButton();
	}

	/**
	 * Start guided conversation using Mastra framework
	 */
	private async startGuidedConversationWithMastra(
		userMessage: ChatMessage,
		messages: ChatMessage[]
	): Promise<void> {
		const flowStartTime = Date.now();
		Logger.debug(
			"[GuidedMode-Mastra] ========== START startGuidedConversationWithMastra =========="
		);
		Logger.debug(
			"[GuidedMode-Mastra] Flow start timestamp:",
			new Date().toISOString()
		);
		Logger.debug("[GuidedMode-Mastra] Session ID:", this.currentSession?.id);
		Logger.debug(
			"[GuidedMode-Mastra] User message preview:",
			typeof userMessage.content === "string"
				? userMessage.content.substring(0, 150)
				: JSON.stringify(userMessage.content).substring(0, 150)
		);
		Logger.debug(
			"[GuidedMode-Mastra] Message history length:",
			messages.length
		);

		let stepIndicatorsEl: HTMLElement | null = null;

		try {
			// Initialize shared memory manager if not already done
			if (!this.sharedMemoryManager) {
				Logger.debug(
					"[GuidedMode-Mastra] Initializing shared Memory Manager..."
				);
				this.sharedMemoryManager = await AgentFactory.createSharedMemoryManager(
					this.plugin,
					this.i18n
				);
				Logger.debug("[GuidedMode-Mastra] ✓ Shared Memory Manager initialized");
			}

			// Get available tools
			const toolsInitTime = Date.now();
			const allTools = await this.plugin.toolManager.getAllTools();
			const toolsMap: Record<string, any> = {};
			allTools.forEach((tool) => {
				toolsMap[tool.name] = tool;
			});
			Logger.debug(
				"[GuidedMode-Mastra] ✓ Tools available:",
				Object.keys(toolsMap).length,
				"| Time:",
				Date.now() - toolsInitTime,
				"ms"
			);

			// Get current provider and model
			const provider = this.plugin.getActiveProvider();
			if (!provider) {
				throw new Error("No active provider configured");
			}
			const currentProvider = provider.getProviderName();
			const currentModel = provider.getModelName();

			// Create or reuse Guided Mode Agent
			// Recreate if: 1) agent doesn't exist, 2) session changed, 3) provider/model changed
			const needsRecreate =
				!this.guidedModeAgent ||
				this.guidedModeAgent.getThreadId() !== this.currentSession?.id ||
				this.agentProvider !== currentProvider ||
				this.agentModel !== currentModel;

			if (needsRecreate) {
				Logger.debug("[GuidedMode-Mastra] Creating Guided Mode Agent:", {
					session: this.currentSession?.id,
					provider: currentProvider,
					model: currentModel,
					reason: !this.guidedModeAgent
						? "new"
						: this.guidedModeAgent.getThreadId() !== this.currentSession?.id
							? "session-change"
							: "provider-or-model-change",
				});

				this.guidedModeAgent = (await AgentFactory.createAgent({
					plugin: this.plugin,
					i18n: this.i18n,
					mode: "guided",
					memoryManager: this.sharedMemoryManager,
					threadId: this.currentSession?.id,
					resourceId: this.plugin.getResourceId(),
					tools: toolsMap,
					onToolSuggestion: async (toolCall: any) => {
						// Show tool confirmation UI and wait for user response
						Logger.debug(
							"[GuidedMode-Mastra] Tool suggested, waiting for user confirmation:",
							toolCall.function?.name || toolCall.name
						);

						// Pause streaming UI to allow interaction (e.g. Add Context)
						this.streamManager.pauseStreaming();

						// Return a Promise that resolves when user approves/rejects
						return new Promise<boolean>((resolve) => {
							// Find the most recent assistant message element (the one being streamed)
							// We can't use messageId here because it's defined later in the code
							const allMessages = document.querySelectorAll(
								".llmsider-message.llmsider-assistant"
							);
							const messageEl = allMessages[
								allMessages.length - 1
							] as HTMLElement;

							if (!messageEl) {
								Logger.warn(
									"Parent message element not found, auto-approving tool"
								);
								this.streamManager.resumeStreaming();
								resolve(true);
								return;
							}

							Logger.debug(
								"[GuidedMode-Mastra] Found message element for tool card"
							);

							// Clear any loading indicator from the message content
							const contentEl = messageEl.querySelector(
								".llmsider-message-content"
							);
							if (contentEl) {
								contentEl.classList.remove("llmsider-working-indicator");
								const existingDots = contentEl.querySelector(
									".llmsider-typing-dots"
								);
								if (existingDots) existingDots.remove();
							}

							const toolName =
								toolCall.function?.name || toolCall.name || "Unknown Tool";

							// Parse tool arguments
							let toolParameters: Record<string, unknown> = {};
							try {
								if (toolCall.function?.arguments) {
									toolParameters =
										typeof toolCall.function.arguments === "string"
											? JSON.parse(toolCall.function.arguments)
											: toolCall.function.arguments;
								} else if (toolCall.arguments) {
									toolParameters =
										typeof toolCall.arguments === "string"
											? JSON.parse(toolCall.arguments)
											: toolCall.arguments;
								} else if (toolCall.input) {
									toolParameters = toolCall.input;
								}
							} catch (error) {
								Logger.error("Failed to parse tool parameters:", error);
								toolParameters = { error: "Failed to parse parameters" };
							}

							// Create tool card for confirmation
							const toolCardEl = document.createElement("div");
							toolCardEl.className = "llmsider-tool-card-message";

							// Find the absolute last tool card or indicator to maintain chronological order
							const chatMessagesContainer = messageEl.closest('.llmsider-messages');
							let insertAfter: Element = messageEl;

							Logger.debug('[onToolSuggestion] Processing tool:', toolName);
							Logger.debug('[onToolSuggestion] Current message element:', messageEl);

							if (chatMessagesContainer) {
							// Collect elements that come AFTER the current message (in document order)
							// to find the correct insertion point within this message's flow
							let nextEl = messageEl.nextElementSibling;
							const toolCardsAfterMessage: Element[] = [];
							const indicatorsAfterMessage: Element[] = [];
							const followUpMessagesAfterMessage: HTMLElement[] = [];
							
							// Walk through siblings until we hit another main message (not a tool card, indicator, or follow-up)
							while (nextEl) {
								if (nextEl.classList.contains('llmsider-tool-card-message')) {
									toolCardsAfterMessage.push(nextEl);
								} else if (nextEl.classList.contains('llmsider-plan-execute-tool-indicator')) {
									indicatorsAfterMessage.push(nextEl);
								} else if (nextEl.classList.contains('llmsider-message') && 
										   (nextEl as HTMLElement).dataset.isFollowUp === 'true') {
									followUpMessagesAfterMessage.push(nextEl as HTMLElement);
								} else if (nextEl.classList.contains('llmsider-message')) {
									// Hit another main message, stop looking
									break;
								}
								nextEl = nextEl.nextElementSibling;
							}

							Logger.debug(`[onToolSuggestion] Found ${toolCardsAfterMessage.length} cards, ${indicatorsAfterMessage.length} indicators, ${followUpMessagesAfterMessage.length} follow-up messages after current message`);

							const lastFollowUpMessage = followUpMessagesAfterMessage[followUpMessagesAfterMessage.length - 1];
							const lastToolCard = toolCardsAfterMessage[toolCardsAfterMessage.length - 1];
							const lastIndicator = indicatorsAfterMessage[indicatorsAfterMessage.length - 1];

							if (lastToolCard) Logger.debug('[onToolSuggestion] Last tool card:', (lastToolCard as HTMLElement).dataset.toolName);
							if (lastIndicator) Logger.debug('[onToolSuggestion] Last indicator found:', lastIndicator);
							if (lastFollowUpMessage) Logger.debug('[onToolSuggestion] Last follow-up message found:', (lastFollowUpMessage as HTMLElement).dataset.messageId);

							// Priority: follow-up message > indicator > tool card > initial message
							if (lastFollowUpMessage) {
								insertAfter = lastFollowUpMessage;
								Logger.debug('[ToolCard] Inserting after last follow-up message in this flow');
							} else if (lastToolCard && lastIndicator) {
								if (lastIndicator.compareDocumentPosition(lastToolCard) & Node.DOCUMENT_POSITION_PRECEDING) {
									insertAfter = lastIndicator;
									Logger.debug('[ToolCard] Inserting after last indicator (global)');
								} else {
									insertAfter = lastToolCard;
									Logger.debug('[ToolCard] Inserting after last tool card (global)');
								}
							} else if (lastToolCard) {
								insertAfter = lastToolCard;
								Logger.debug('[ToolCard] Inserting after last tool card (global)');
							} else if (lastIndicator) {
								insertAfter = lastIndicator;
								Logger.debug('[ToolCard] Inserting after last indicator (global)');
							} else {
								insertAfter = messageEl;
								Logger.debug('[ToolCard] No existing tool flow, inserting after message');
							}
						}

							Logger.debug(`[onToolSuggestion] Final insertion: ${toolName} after`, insertAfter);
							insertAfter.insertAdjacentElement("afterend", toolCardEl);
							Logger.debug(`[onToolSuggestion] Tool card inserted, now in DOM:`, toolCardEl);

							// Extract current message content for description
							const messageContentEl = messageEl.querySelector(
								".llmsider-message-content"
							);
							const currentContent = messageContentEl?.textContent || "";

							// Render tool card with approve/cancel callbacks
							new ToolResultCard(
								toolCardEl,
								{
									toolName: toolName,
									status: "pending",
									parameters: toolParameters,
									timestamp: new Date(),
									description: currentContent,
								},
								async () => {
									// Approve callback - show executing state and resolve promise
									// Resume streaming UI
									this.streamManager.resumeStreaming();

									toolCardEl.empty();
									new ToolResultCard(toolCardEl, {
										toolName: toolName,
										status: "executing",
										parameters: toolParameters,
										timestamp: new Date(),
									});
									await new Promise((r) => setTimeout(r, 100)); // Small delay to show animation
									resolve(true);
								},
								() => {
									// Cancel callback - remove card and reject
									// Resume streaming UI
									this.streamManager.resumeStreaming();

									toolCardEl.remove();
									resolve(false);
								}
							);
						});
					},
				})) as GuidedModeAgent;

				// Update tracked provider/model
				this.agentProvider = currentProvider;
				this.agentModel = currentModel;

				Logger.debug("[GuidedMode-Mastra] Guided Mode Agent created");
			}

			// Start streaming controller
			const streamController = this.streamManager.startStreaming();

			// Check if auto-search is enabled (not just vector DB loaded)
			const isVectorSearchEnabled =
				this.plugin.settings.vectorSettings.autoSearchEnabled;

			// Create step indicators (always show for consistency)
			stepIndicatorsEl = this.createStepIndicators();

			// Note: Vector search is already handled by prepareMessages in handleSendMessage
			// We just need to update the UI to show the AI response step
			if (stepIndicatorsEl) {
				// If vector search was enabled, mark it as completed (since it was done in prepareMessages)
				if (isVectorSearchEnabled) {
					this.updateStepIndicator(
						stepIndicatorsEl,
						"vector-search",
						"completed"
					);
				}
			}

			// Create placeholder message (will be added to UI when first chunk arrives)
			const messageId = Date.now().toString();
			const assistantMessage: ChatMessage = {
				id: messageId,
				role: "assistant",
				content: "",
				timestamp: Date.now(),
				metadata: {
					isGuidedQuestion: true,
					guidedStepNumber: 1,
					isStreaming: true,
				},
			};

			// Don't add to UI yet - will be added when first chunk arrives
			let suggestedTools: any[] = [];

			// Create stream callback state
			const streamState: IStreamState = {
				chunkCount: 0,
				lastChunkTime: Date.now(),
				accumulatedContent: "",
				workingMessageEl: null,
				followUpMessageEl: null,
				isFollowUpResponse: false,
				stepIndicatorsEl: stepIndicatorsEl,
				toolPlaceholders: new Map(),
			};

			// Create tool callback state
			const toolState: IToolCallbackState = {
				assistantMessage,
				workingMessageEl: null,
				followUpMessageEl: null,
				isFollowUpResponse: false,
				accumulatedContent: "",
				stepIndicatorsEl: stepIndicatorsEl,
				toolAnalysisTimer: null,
			};

			// Create stream callbacks handler
			const streamCallbacks = new GuidedModeStreamCallbacks({
				messageRenderer: this.messageRenderer,
				messageManager: this.messageManager,
				memoryCoordinator: this.memoryCoordinator,
				guidedModeUIRenderer: this.guidedModeUIRenderer,
				getCurrentSession: () => this.currentSession,
				updateStepIndicator: (
					el: HTMLElement,
					step: string,
					status: "pending" | "active" | "completed"
				) => {
					if (streamState.stepIndicatorsEl) {
						this.updateStepIndicator(el, step, status);
					}
				},
				removeStepIndicators: () => {
					if (
						streamState.stepIndicatorsEl &&
						streamState.stepIndicatorsEl.parentElement
					) {
						streamState.stepIndicatorsEl.remove();
					}
					streamState.stepIndicatorsEl = null;
				},
			});
			// Create tool callbacks handler
			const toolCallbacks = new GuidedModeToolCallbacks({
				memoryCoordinator: this.memoryCoordinator,
				messageRenderer: this.messageRenderer,
				guidedModeUIRenderer: this.guidedModeUIRenderer,
				sharedMemoryManager: this.sharedMemoryManager,
				plugin: this.plugin,
				getCurrentSession: () => this.currentSession,
				updateStepIndicator: (tool: string) => {
					if (toolState.stepIndicatorsEl) {
						this.updateStepIndicator(
							toolState.stepIndicatorsEl,
							tool,
							"completed"
						);
					}
				},
				removeStepIndicators: () => {
					if (
						toolState.stepIndicatorsEl &&
						toolState.stepIndicatorsEl.parentElement
					) {
						toolState.stepIndicatorsEl.remove();
						toolState.stepIndicatorsEl = null;
					}
				},
				scrollToBottom: () => this.messageManager.scrollToBottom(),
				getThreadId: () => this.guidedModeAgent.getThreadId(),
				handleSendMessage: (message: string) => this.handleSendMessage(message),
			});

			// Execute guided mode agent
			const agentExecuteStartTime = Date.now();
			Logger.debug(
				"[GuidedMode-Mastra] ▶▶▶ Calling guidedModeAgent.execute() ▶▶▶"
			);
			Logger.debug(
				"[GuidedMode-Mastra] Agent execute start timestamp:",
				new Date().toISOString()
			);
			Logger.debug("[GuidedMode-Mastra] Messages count:", messages.length);
			Logger.debug(
				"[GuidedMode-Mastra] Last message preview:",
				messages[messages.length - 1]?.content?.toString().substring(0, 100)
			);
			await this.guidedModeAgent.execute({
				messages,
				abortController: streamController,
				onToolError: async (toolName: string, error: string) => {
					return new Promise<"skip" | "retry" | "regenerate">((resolve) => {
						// Create a mock step for the error panel
						const mockStep: any = {
							id: `tool-${Date.now()}`,
							title: `Tool Execution: ${toolName}`,
							status: "failed",
							error: error,
						};

						// Find the last message element to attach the panel to
						const messageElements = this.messageContainer.querySelectorAll(
							".llmsider-chat-message"
						);
						const lastMessageEl =
							messageElements.length > 0
								? (messageElements[messageElements.length - 1] as HTMLElement)
								: this.messageContainer;

						const panel = new ErrorActionPanel(this.messageContainer, {
							step: mockStep,
							stepIndex: 0,
							i18n: this.plugin.i18n,
							targetEl: lastMessageEl,
							onAction: (action) => {
								resolve(action);
							},
						});
						panel.show();
					});
				},
				onStream: streamCallbacks.createOnStreamCallback(
					streamState,
					assistantMessage,
					messageId,
					agentExecuteStartTime,
					streamController
				),
				onToolSuggested: (toolCalls: any[]) => {
					// Replace placeholders with actual tool cards
					streamState.toolPlaceholders.forEach((placeholder) => {
						placeholder.classList.add('llmsider-tool-placeholder-fade-out');
						setTimeout(() => placeholder.remove(), 300);
					});
					streamState.toolPlaceholders.clear();

					// Sync accumulated content from streamState to toolState
					// This ensures pre-tool explanation text (accumulated via onStream) is available
					toolState.accumulatedContent = streamState.accumulatedContent;
					toolState.workingMessageEl = streamState.workingMessageEl;

					return toolCallbacks.createOnToolSuggestedCallback(toolState)(toolCalls);
				},
				onToolExecuted: async (toolName: string, result: any) => {
					// Call the tool executed handler which modifies toolState
					// (sets isFollowUpResponse = true, resets followUpMessageEl, etc.)
					await toolCallbacks.createOnToolExecutedCallback(toolState)(
						result,
						toolName,
						undefined
					);

					// Sync modified state FROM toolState TO streamState
					Logger.debug('[onToolExecuted] Syncing state from toolState to streamState:', {
						isFollowUpResponse: toolState.isFollowUpResponse,
						hasWaitingIndicator: !!toolState.waitingIndicatorEl,
						chunkCount: toolState.chunkCount
					});
					streamState.workingMessageEl = toolState.workingMessageEl;
					streamState.followUpMessageEl = toolState.followUpMessageEl;
					streamState.isFollowUpResponse = toolState.isFollowUpResponse;
					streamState.accumulatedContent = toolState.accumulatedContent;
					streamState.waitingIndicatorEl = toolState.waitingIndicatorEl;
					streamState.chunkCount = toolState.chunkCount;
					streamState.lastChunkTime = toolState.lastChunkTime;
				},

				onComplete: async (fullResponse: string) => {
					const completeTime = Date.now();
					Logger.debug(
						"[GuidedMode-Mastra] ========== ✅ onComplete TRIGGERED =========="
					);
					Logger.debug(
						"[GuidedMode-Mastra] Timestamp:",
						new Date().toISOString()
					);
					Logger.debug(
						"[GuidedMode-Mastra] Full response length:",
						fullResponse.length
					);
					Logger.debug(
						"[GuidedMode-Mastra] Total time since agent.execute():",
						completeTime - agentExecuteStartTime,
						"ms"
					);
					Logger.debug(
						"[GuidedMode-Mastra] Has follow-up message element:",
						!!streamState.followUpMessageEl
					);

					// Remove step indicators after completion
					if (
						streamState.stepIndicatorsEl &&
						streamState.stepIndicatorsEl.parentElement
					) {
						streamState.stepIndicatorsEl.remove();
					}
					// Check for tool_code blocks in the response (some models like Qwen return tools in this format)
					const toolCodeMatch = fullResponse.match(
						/```tool_code\s*\n([\s\S]*?)\n```/
					);
					if (toolCodeMatch && toolCodeMatch[1]) {
						Logger.debug(
							"[GuidedMode-Mastra] 🔧 Detected tool_code block in response"
						);
						try {
							const toolJson = JSON.parse(toolCodeMatch[1].trim());
							Logger.debug("[GuidedMode-Mastra] Parsed tool call:", toolJson);

							// Clean the content to remove the tool_code block before updating UI
							const cleanedContent = fullResponse
								.replace(/```tool_code\s*\n[\s\S]*?\n```/g, "")
								.trim();
							assistantMessage.content = cleanedContent;

							// Mark streaming as complete so tool cards can render immediately
							if (assistantMessage.metadata) {
								assistantMessage.metadata.isStreaming = false;
							}

							// Update UI with cleaned content
							if (streamState.workingMessageEl) {
								const questionContent =
									streamState.workingMessageEl.querySelector(
										".llmsider-guided-question-content"
									) as HTMLElement;
								if (questionContent) {
									let displayContent =
										this.memoryCoordinator.stripMemoryMarkers(cleanedContent);
									displayContent =
										this.guidedModeUIRenderer.removeOptionsFromContent(
											displayContent
										);
									this.messageRenderer.updateStreamingContent(
										questionContent,
										displayContent
									);
								}
							}

							// Convert to OpenAI-style tool call format and store in metadata
							const toolCalls = [
								{
									function: {
										name: toolJson.tool,
										arguments: JSON.stringify(toolJson.parameters || {}),
									},
								},
							];

							// Manually render tool cards using the existing infrastructure
							Logger.debug(
								"[GuidedMode-Mastra] Rendering tool cards for parsed tool"
							);
							if (assistantMessage.metadata) {
								assistantMessage.metadata.suggestedToolCalls = toolCalls;
								assistantMessage.metadata.requiresToolConfirmation = true;
								assistantMessage.metadata.toolCalls = toolCalls;
							}

							// Trigger UI update to show tool cards
							await this.guidedModeUIRenderer.updateGuidedMessageUI(
								assistantMessage
							);

							// Don't save message yet - it will be saved after tool execution
							Logger.debug(
								"[GuidedMode-Mastra] Tool code detected, waiting for tool execution before saving"
							);
							return;
						} catch (error) {
							Logger.error(
								"[GuidedMode-Mastra] Failed to parse tool_code:",
								error
							);
							// Continue with normal flow if parsing fails
						}
					}

					// Cleanup: Remove any remaining thinking indicators (especially from follow-up that didn't stream text)
					// This fixes the issue where "Thinking..." stays visible if the agent returns no text after tool execution
					const remainingIndicators = document.querySelectorAll(
						".llmsider-plan-execute-tool-indicator"
					);
					remainingIndicators.forEach((indicator) => {
						// Check if it's the follow-up indicator (has the specific data attribute)
						if (indicator.querySelector("[data-followup-streaming-content]")) {
							Logger.debug(
								"[GuidedMode-Mastra] Removing leftover thinking indicator"
							);
							indicator.remove();
						}
					});

					// Clear tool analysis timer if it's running
					if (toolState.toolAnalysisTimer) {
						clearTimeout(toolState.toolAnalysisTimer);
						toolState.toolAnalysisTimer = null;
						Logger.debug(
							"[GuidedMode-Mastra] 🎯 Cleared tool analysis timer in onComplete"
						);
					}

					assistantMessage.content = fullResponse;
					assistantMessage.metadata!.isStreaming = false;

					// If we have a follow-up message element, process and save it
					if (streamState.followUpMessageEl) {
						Logger.debug(
							"[GuidedMode-Mastra] Processing follow-up message, content length:",
							streamState.accumulatedContent.length
						);

						// Extract options from the accumulated content
						// More flexible regex that handles various whitespace and newline scenarios
						const lines = streamState.accumulatedContent.split("\n");
						let options: string[] = [];
						let isMultiSelect = false;

						// Find mode marker (SINGLE or MULTIPLE)
						for (const line of lines) {
							if (/➤CHOICE:\s*SINGLE\s*$/i.test(line.trim())) {
								isMultiSelect = false;
								Logger.debug("[GuidedMode-Mastra] Found SINGLE mode marker");
								break;
							} else if (/➤CHOICE:\s*MULTIPLE\s*$/i.test(line.trim())) {
								isMultiSelect = true;
								Logger.debug("[GuidedMode-Mastra] Found MULTIPLE mode marker");
								break;
							}
						}

						// Extract option lines (those starting with ➤CHOICE: followed by content)
						for (const line of lines) {
							const trimmed = line.trim();
							// Match lines like: ➤CHOICE: 1. xxx or ➤CHOICE: xxx
							if (
								trimmed.startsWith("➤CHOICE:") &&
								!trimmed.match(/➤CHOICE:\s*(SINGLE|MULTIPLE)\s*$/i)
							) {
								const optionText = trimmed.replace(/^➤CHOICE:\s*/, "").trim();
								if (optionText.length > 0) {
									options.push(optionText);
								}
							}
						}

						Logger.debug(
							"[GuidedMode-Mastra] Extracted options:",
							options.length,
							options
						);

						// Create a message object for the follow-up (with or without options)
						const followUpMessage: ChatMessage = {
							id:
								streamState.followUpMessageEl.getAttribute("data-message-id") ||
								`followup-${Date.now()}`,
							role: "assistant",
							content: streamState.accumulatedContent,
							timestamp: Date.now(),
							metadata: {
								isGuidedQuestion: true,
								isFollowUpMessage: true,
								guidedOptions: options.length > 0 ? options : undefined,
								isMultiSelect: isMultiSelect,
							},
						};

						// Save follow-up message to session
						if (this.currentSession) {
							this.currentSession.messages.push(followUpMessage);
						}

						// Save follow-up message to Memory system
						if (this.sharedMemoryManager && this.guidedModeAgent) {
							try {
								const threadId = this.guidedModeAgent.getThreadId();
								await this.sharedMemoryManager.addConversationMessage(
									{
										role: "assistant",
										content:
											typeof followUpMessage.content === "string"
												? followUpMessage.content
												: JSON.stringify(followUpMessage.content),
									},
									threadId || undefined
								);
								Logger.debug(
									"[GuidedMode-Mastra] Follow-up message saved to Memory"
								);
							} catch (error) {
								Logger.warn(
									"[GuidedMode-Mastra] Failed to save follow-up message to Memory:",
									error
								);
							}
						}

						// Render options if found
						if (options.length > 0) {
							Logger.debug(
								"[GuidedMode-Mastra] Found options in follow-up:",
								options
							);
							const cardContainer = streamState.followUpMessageEl.querySelector(
								".llmsider-guided-card-container"
							) as HTMLElement;
							if (cardContainer) {
								this.guidedModeUIRenderer.renderGuidedOptions(
									cardContainer,
									followUpMessage,
									false
								);
								// Scroll to bottom after options are rendered
								this.messageManager.scrollToBottom();
							}
						}
					} else {
						// CRITICAL: Update guided message UI to render guided card structure
						// This ensures proper rendering of tool cards, options, etc.
						// Force re-rendering to extract options from content (including numbered lists)
						Logger.debug(
							"[GuidedMode-Mastra] Stream complete, forcing guided card re-render to extract options"
						);
						this.guidedModeUIRenderer.renderGuidedCard(assistantMessage, false);
					}

					// Update UI actions
					const targetElement =
						streamState.followUpMessageEl || streamState.workingMessageEl;
					if (targetElement) {
						this.messageRenderer.addMessageActions(
							targetElement,
							assistantMessage
						);
					}

					// Update session
					if (this.currentSession) {
						// Check if assistant message is already in session (added in onToolSuggested)
						const assistantMessageExists = this.currentSession.messages.some(
							(m) => m.id === assistantMessage.id
						);
						if (!assistantMessageExists) {
							Logger.debug(
								"[GuidedMode-Mastra] 💾 Saving assistant message to session (onComplete)..."
							);
							this.currentSession.messages.push(assistantMessage);
						} else {
							Logger.debug(
								"[GuidedMode-Mastra] ⚠️ Assistant message already in session (from onToolSuggested)"
							);
						}

						await this.plugin.updateChatSession(this.currentSession.id, {
							messages: this.currentSession.messages,
						});

						// Auto-generate session title (will check if conditions are met)
						await this.messagePreparationService.autoGenerateSessionTitle(
							userMessage,
							assistantMessage
						);
					}

					// Reset streaming state
					this.streamManager.resetButtonStates();
				},
				onError: (error: Error) => {
					Logger.error(
						"[GuidedMode-Mastra] ❌ Agent onError callback triggered ❌"
					);
					Logger.error(
						"[GuidedMode-Mastra] Error type:",
						error.constructor.name
					);
					Logger.error("[GuidedMode-Mastra] Error message:", error.message);
					Logger.error("[GuidedMode-Mastra] Error stack:", error.stack);
					throw error;
				},
			});

			Logger.debug(
				"[GuidedMode-Mastra] Guided conversation completed successfully"
			);
		} catch (error) {
			Logger.error(
				"[GuidedMode-Mastra] ❌❌❌ CRITICAL ERROR in guided conversation ❌❌❌"
			);
			
			// Remove step indicators on error
			if (stepIndicatorsEl && stepIndicatorsEl.parentElement) {
				stepIndicatorsEl.remove();
			}
			
			Logger.error(
				"[GuidedMode-Mastra] Error type:",
				error instanceof Error ? error.constructor.name : typeof error
			);
			Logger.error(
				"[GuidedMode-Mastra] Error message:",
				error instanceof Error ? error.message : String(error)
			);
			Logger.error(
				"[GuidedMode-Mastra] Error stack:",
				error instanceof Error ? error.stack : "No stack trace"
			);
			Logger.error("[GuidedMode-Mastra] Error object:", error);
			throw error;
		}
	}

	/**
	 * Handle guided response using Mastra framework
	 */
	private async handleGuidedResponseWithMastra(
		userMessage: ChatMessage,
		messages: ChatMessage[]
	): Promise<void> {
		const startTime = Date.now();
		Logger.debug(
			"[GuidedMode-Mastra] ========== START handleGuidedResponseWithMastra =========="
		);
		Logger.debug("[GuidedMode-Mastra] Timestamp:", new Date().toISOString());
		Logger.debug(
			"[GuidedMode-Mastra] User message content preview:",
			typeof userMessage.content === "string"
				? userMessage.content.substring(0, 100)
				: JSON.stringify(userMessage.content).substring(0, 100)
		);

		// Reuse the same logic as startGuidedConversationWithMastra
		// since both are conversational turns
		await this.startGuidedConversationWithMastra(userMessage, messages);

		const duration = Date.now() - startTime;
		Logger.debug(
			"[GuidedMode-Mastra] ========== END handleGuidedResponseWithMastra =========="
		);
		Logger.debug("[GuidedMode-Mastra] Total duration:", duration, "ms");
	}

	/**
	 * Public API: Get context manager
	 */
	public getContextManager(): ContextManager {
		return this.contextManager;
	}

	/**
	 * Public API: Send a message programmatically
	 */
	public async sendMessage(content: string): Promise<void> {
		this.inputElement.value = content;
		await this.inputHandler["handleSendMessage"]();
	}
}
