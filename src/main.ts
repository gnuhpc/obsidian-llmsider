import { Plugin, WorkspaceLeaf, Notice, MarkdownView } from 'obsidian';
import { Logger } from './utils/logger';
import { EditorView } from '@codemirror/view';
import {
	LLMSiderSettings,
	DEFAULT_SETTINGS,
	CHAT_VIEW_TYPE,
	ChatSession,
	PluginState,
	LLMConnection
} from './types';
import { LLMSiderSettingTab } from './settings';
import { ChatView } from './ui/chat-view';
import { OpenAIProviderImpl } from './providers/openai-provider';
import { AnthropicProviderImpl } from './providers/anthropic-provider';
import { OpenAICompatibleProviderImpl } from './providers/openai-compatible-provider';
import { QwenProviderImpl } from './providers/qwen-provider';
import { BaseLLMProvider } from './providers/base-provider';
import { FileReferenceSuggest } from './completion/file-reference-suggest';
import { InlineCompletionHandler } from './completion/inline-completion-handler';
import { InlineQuickChatHandler } from './completion/inline-quick-chat';
import { createInlineCompletionExtension } from './completion/inline-completion';
import { createCompletionKeymap } from './completion/completion-keymap';
import { ConfigDatabase } from './utils/config-db';
import { BUILT_IN_PROMPTS, getBuiltInPrompts } from './data/built-in-prompts';
import { MCPManager } from './mcp/mcp-manager';
import { UnifiedToolManager } from './tools/unified-tool-manager';
import { setApp } from './tools/built-in-tools';
import { I18nManager, i18n } from './i18n/i18n-manager';
import { SelectionPopup } from './ui/selection-popup';
import { VectorDBManager } from './vector';
import { SimilarNotesViewManager } from './ui/similar-notes-manager';

export default class LLMSiderPlugin extends Plugin {
	settings!: LLMSiderSettings;
	providers: Map<string, BaseLLMProvider> = new Map();
	state!: PluginState;
	fileReferenceSuggest!: FileReferenceSuggest;
	inlineCompletionHandler?: InlineCompletionHandler;
	inlineQuickChatHandler?: InlineQuickChatHandler;
	configDb!: ConfigDatabase;
	mcpManager!: MCPManager;
	toolManager!: UnifiedToolManager;
	i18n!: I18nManager;
	selectionPopup?: SelectionPopup;
	vectorDBManager?: VectorDBManager;
	similarNotesManager?: SimilarNotesViewManager;
	githubTokenRefreshService?: any; // GitHubTokenRefreshService
	private isSaving = false;

	async onload() {
		Logger.debug('Loading LLMSider plugin...');

		// Initialize plugin state
		this.state = {
			isLoaded: false,
			providerStatuses: {}
		};

		try {
			// Get vault path
			const vaultPath = (this.app.vault.adapter as any).basePath || '';
			
			// Initialize configuration database
			this.configDb = new ConfigDatabase(vaultPath, this.app.vault.adapter);
			await this.configDb.initialize();

			// Set vault path for conversation logger (enables log migration)
			const { ConversationLogger } = await import('./utils/conversation-logger');
			ConversationLogger.getInstance().setVaultPath(vaultPath);

			// Load settings first
			await this.loadSettings();

			// Initialize logger with debug setting
			const { Logger } = await import('./utils/logger');
			Logger.setDebugEnabled(this.settings.enableDebugLogging);

			// Run migrations for data fixes
			await this.runMigrations();

			// Initialize i18n system with detected or saved language
			// Use the global singleton instance
			this.i18n = i18n;
			// Try to get Obsidian's locale setting
			const obsidianLocale = (this.app as any).locale ||
			                      localStorage.getItem('language') ||
			                      navigator.language;
			await this.i18n.initialize(obsidianLocale);

			// If this is first time (not initialized), detect language and save it
			if (!this.settings.i18n.initialized) {
				const detectedLang = this.i18n.getCurrentLanguage();
				this.settings.i18n.language = detectedLang;
				this.settings.i18n.initialized = true;
				await this.saveSettings();
				Logger.debug('First time startup: detected and saved language:', detectedLang, 'from locale:', obsidianLocale);
			} else {
				// Use saved language preference
				this.i18n.setLanguage(this.settings.i18n.language);
				Logger.debug('Using saved language preference:', this.settings.i18n.language);
			}
			Logger.debug('I18n system initialized with language:', this.i18n.getCurrentLanguage());
			
			// Initialize built-in prompts AFTER i18n is ready to ensure translations are loaded
			// This must happen after i18n.initialize() but before other components that might use prompts
			this.configDb.initializeBuiltInPrompts();
			await this.initializeCustomPrompts();
			
			// Register language change listener to update built-in prompts translations
			this.i18n.onLanguageChange((language) => {
				Logger.debug(`Language changed to ${language}, updating built-in prompts translations...`);
				this.configDb.updateBuiltInPromptsTranslations();
			});

			// Initialize providers
			await this.initializeProviders();

			// Initialize MCP Manager
			await this.initializeMCPManager();

			// Initialize GitHub Token Refresh Service
			await this.initializeGitHubTokenRefreshService();

		// Initialize Vector Database Manager (async, non-blocking)
		// Don't await - let it load in background
		if (this.settings.vectorSettings.enabled) {
			Logger.debug('Starting vector database initialization in background...');
			this.initializeVectorDB().catch(error => {
				Logger.error('Background vector DB initialization failed:', error);
			});
		} else {
			Logger.debug('Vector database disabled in settings');
		}

		// Register file change listeners for automatic indexing
		this.registerFileEventListeners();

			// Initialize file reference suggest
			this.fileReferenceSuggest = new FileReferenceSuggest(this);
			this.registerEditorSuggest(this.fileReferenceSuggest);
			Logger.debug('File reference suggest registered');

			// Initialize autocomplete suggest if enabled
			Logger.debug('Checking autocomplete settings:', {
				enabled: this.settings.autocomplete.enabled,
				granularity: this.settings.autocomplete.granularity,
				triggerDelay: this.settings.autocomplete.triggerDelay
			});

			if (this.settings.autocomplete.enabled) {
				Logger.debug('========================================');
				Logger.debug('Autocomplete is ENABLED, initializing...');
				
				// Use inline completion (like GitHub Copilot)
				Logger.debug('Creating InlineCompletionHandler...');
				this.inlineCompletionHandler = new InlineCompletionHandler(this);
				
				Logger.debug('Registering CodeMirror extensions...');
				this.registerEditorExtension([
					createInlineCompletionExtension(),
					createCompletionKeymap(this.inlineCompletionHandler),
					EditorView.updateListener.of((update) => {
						if (update.docChanged && this.inlineCompletionHandler) {
							this.inlineCompletionHandler.handleDocumentChange(update.view);
						}
					})
				]);
				Logger.debug('✅ Inline autocomplete registered successfully!');
				Logger.debug('💡 Type 2+ characters and wait 500ms to see inline suggestions');
				Logger.debug('💡 Press Tab to accept, Escape to cancel');
				
				Logger.debug('========================================');
			} else {
				Logger.debug('Autocomplete is DISABLED, skipping initialization');
			}

			// Initialize quick chat if enabled
			if (this.settings.inlineQuickChat.enabled) {
				Logger.debug('Quick Chat is ENABLED, initializing...');
				this.inlineQuickChatHandler = new InlineQuickChatHandler(this);
				
				// Register state fields and keymap for quick chat
				const { quickChatState, diffPreviewState, createDiffKeymap } = await import('./completion/inline-quick-chat');
				this.registerEditorExtension([
					quickChatState,
					diffPreviewState,
					createDiffKeymap(this.inlineQuickChatHandler)
				]);
				
				Logger.debug('✅ Quick Chat initialized successfully!');
				Logger.debug('💡 Press ' + this.settings.inlineQuickChat.triggerKey + ' to open quick chat');
				Logger.debug('💡 Press Tab to accept diff, Esc to reject');
			} else {
				Logger.debug('Quick Chat is DISABLED');
			}

			// Register views (check if not already registered)
			try {
				this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this));
			} catch (error) {
				Logger.debug('View already registered, skipping registration');
			}

			// Add ribbon icon
			this.addRibbonIcon('message-circle', 'Open LLMSider Chat', () => {
				this.activateChatView();
			});

		// Register commands
		this.registerCommands();

		// Register context menu
		this.registerContextMenu();

		// Initialize selection popup
		this.selectionPopup = new SelectionPopup(this.app, this);
		Logger.debug('Selection popup initialized');

		// Add settings tab
		this.addSettingTab(new LLMSiderSettingTab(this.app, this));			// Defer chat view initialization until workspace is ready
			this.app.workspace.onLayoutReady(() => {
				this.activateChatView();
			});

			this.state.isLoaded = true;
			Logger.debug('LLMSider plugin loaded successfully');

		} catch (error) {
			Logger.error('Failed to load LLMSider plugin:', error);
			new Notice(this.i18n.t('notifications.plugin.loadFailed'));
		}
	}

	async onunload() {
		Logger.debug('Unloading LLMSider plugin...');
		
		// Cleanup Similar Notes Manager
		if (this.similarNotesManager) {
			try {
				this.similarNotesManager.onunload();
				Logger.debug('Similar Notes Manager cleaned up');
			} catch (error) {
				Logger.error('Error cleaning up Similar Notes Manager:', error);
			}
		}
		
		// Shutdown GitHub Token Refresh Service
		if (this.githubTokenRefreshService) {
			try {
				this.githubTokenRefreshService.stopAll();
				Logger.debug('GitHub Token Refresh Service stopped');
			} catch (error) {
				Logger.error('Error stopping GitHub Token Refresh Service:', error);
			}
		}
		
		// Shutdown MCP Manager
		if (this.mcpManager) {
			try {
				await this.mcpManager.shutdown();
			} catch (error) {
				Logger.error('Error shutting down MCP Manager:', error);
			}
		}

		// Shutdown Vector DB Manager
		if (this.vectorDBManager) {
			try {
				await this.vectorDBManager.shutdown();
			} catch (error) {
				Logger.error('Error shutting down Vector DB Manager:', error);
			}
		}

	// Clean up database connection
	if (this.configDb) {
		this.configDb.close();
	}
	
	// Clean up selection popup
	if (this.selectionPopup) {
		this.selectionPopup.destroy();
		this.selectionPopup = undefined;
	}
	
	// Clean up file reference suggest
	if (this.fileReferenceSuggest) {
		this.fileReferenceSuggest.destroy();
	}		// Clean up inline completion handler
		if (this.inlineCompletionHandler) {
			this.inlineCompletionHandler = undefined;
	}
	
	// Clean up quick chat handler
	if (this.inlineQuickChatHandler) {
		this.inlineQuickChatHandler = undefined;
	}		// Clean up views
		this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);
		
		// Clear providers
		this.providers.clear();
		
		Logger.debug('LLMSider plugin unloaded');
	}

	async loadSettings() {
		// Load settings structure from SQLite database
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
		
		try {
			// Load new architecture: connections and models
			this.settings.connections = await this.configDb.getConnections();
			this.settings.models = await this.configDb.getModels();
			this.settings.activeConnectionId = await this.configDb.getActiveConnectionId() || '';
			this.settings.activeModelId = await this.configDb.getActiveModelId() || '';

			this.settings.activeProvider = await this.configDb.getActiveProvider() || '';
			this.settings.agentMode = await this.configDb.getAgentMode();
			
			// Load default conversation mode from SQLite
			const savedDefaultMode = await this.configDb.getConfigValue('defaultConversationMode');
			if (savedDefaultMode && (savedDefaultMode === 'normal' || savedDefaultMode === 'guided' || savedDefaultMode === 'agent')) {
				this.settings.defaultConversationMode = savedDefaultMode as 'normal' | 'guided' | 'agent';
			}
			
			// Load conversation mode from SQLite (user preference persisted across restarts)
			const savedMode = await this.configDb.getConfigValue('conversationMode');
			if (savedMode && (savedMode === 'normal' || savedMode === 'guided' || savedMode === 'agent')) {
				this.settings.conversationMode = savedMode as 'normal' | 'guided' | 'agent';
				// Sync legacy agentMode
				this.settings.agentMode = (savedMode === 'agent');
				Logger.debug(`Loaded conversation mode from SQLite: ${savedMode}`);
			} else {
				// Use default if not saved
				this.settings.conversationMode = this.settings.defaultConversationMode;
				Logger.debug(`No saved conversation mode, using default: ${this.settings.defaultConversationMode}`);
			}
			
			// Load debug logging setting
			const savedDebugLogging = await this.configDb.getConfigValue('enableDebugLogging');
			if (savedDebugLogging !== null) {
				this.settings.enableDebugLogging = savedDebugLogging === 'true';
			}
			
			// Load chat sessions
			this.settings.chatSessions = await this.configDb.getAllChatSessions();
			this.settings.maxChatHistory = await this.configDb.getMaxChatHistory();
			this.settings.nextSessionId = await this.configDb.getNextSessionId();
			
			// Load i18n settings
			this.settings.i18n = await this.configDb.getI18nSettings();
			
			// Load autocomplete settings
			this.settings.autocomplete = await this.configDb.getAutocompleteSettings();
			
			// Load inline quick chat settings
			this.settings.inlineQuickChat = await this.configDb.getInlineQuickChatSettings();
			
			// Load selection popup settings
			this.settings.selectionPopup = await this.configDb.getSelectionPopupSettings();
			
			// Load google search settings
			this.settings.googleSearch = await this.configDb.getGoogleSearchSettings();
			
			// Load vector database settings
			this.settings.vectorSettings = await this.configDb.getVectorSettings();

			// Load built-in tool permissions
			this.settings.builtInToolsPermissions = await this.configDb.getBuiltInToolPermissions();
			
			// Load other settings
			this.settings.showSidebar = await this.configDb.getShowSidebar();
			this.settings.sidebarPosition = await this.configDb.getSidebarPosition();
			this.settings.debugMode = await this.configDb.getDebugMode();
			this.settings.enableDiffRenderingInActionMode = await this.configDb.getEnableDiffRendering();
			
			// Load custom prompts from database
			this.settings.customPrompts = await this.configDb.getAllPrompts();
			
			// Load MCP settings (serverPermissions from DB, serversConfig from mcp-config.json)
			this.settings.mcpSettings = {
				serversConfig: await this.configDb.loadMCPConfig(),
				serverPermissions: await this.configDb.getMCPServerPermissions(),
				enableToolSuggestions: await this.configDb.getMCPEnableToolSuggestions(),
				enableResourceBrowsing: await this.configDb.getMCPEnableResourceBrowsing(),
			};
			
			// Load tool confirmation setting (unified for both MCP and built-in tools)
			this.settings.requireConfirmationForTools = await this.configDb.getMCPRequireConfirmationForTools();
			
			// Load tool auto-execute settings
			this.settings.toolAutoExecute = await this.configDb.getToolAutoExecute();
			
			Logger.debug('Settings loaded from database successfully');
			
			// Debug: Log GitHub Copilot connections
			const githubCopilotConnections = this.settings.connections.filter(c => c.type === 'github-copilot');
			if (githubCopilotConnections.length > 0) {
				Logger.debug('Found GitHub Copilot connections:', githubCopilotConnections.map(c => ({
					id: c.id,
					name: c.name,
					hasGithubToken: !!c.githubToken,
					hasCopilotToken: !!c.copilotToken,
					tokenExpiry: c.tokenExpiry ? new Date(c.tokenExpiry).toISOString() : 'none'
				})));
			}
		} catch (error) {
			Logger.error('Failed to load settings from database:', error);
			Logger.error('========================================');
			Logger.error('ERROR: Cannot load settings from database!');
			Logger.error('========================================');
			Logger.error('');
			Logger.error('The database may be corrupted or inaccessible.');
			Logger.error('Using default settings instead.');
			Logger.error('');
			Logger.error('========================================');
			
			// Use defaults if database fails
			this.settings = Object.assign({}, DEFAULT_SETTINGS);
		}
		
		// Ensure settings have all required properties
		if (!this.settings.chatSessions) this.settings.chatSessions = [];
		if (!this.settings.customPrompts) this.settings.customPrompts = [];
		if (!this.settings.builtInToolsPermissions) this.settings.builtInToolsPermissions = {};
		if (!this.settings.i18n) this.settings.i18n = DEFAULT_SETTINGS.i18n;
		if (typeof this.settings.i18n.initialized === 'undefined') {
			this.settings.i18n.initialized = false;
		}
		
		// Check if this is first launch
		const isFirstLaunchValue = await this.configDb.getConfigValue('isFirstLaunch');
		this.settings.isFirstLaunch = isFirstLaunchValue === null ? true : (isFirstLaunchValue === 'true');
		
		// Initialize built-in tools permissions on first launch OR if permissions are empty
		const hasPermissions = Object.keys(this.settings.builtInToolsPermissions).length > 0;
		if (this.settings.isFirstLaunch || !hasPermissions) {
			Logger.debug('First launch or empty permissions detected, initializing default tool permissions');
			const { getAllBuiltInTools } = require('./tools/built-in-tools');
			const { getDefaultBuiltInToolsPermissions } = require('./tools/built-in-tools-config');
			const allTools = getAllBuiltInTools({ asArray: true });
			this.settings.builtInToolsPermissions = getDefaultBuiltInToolsPermissions(allTools);
			
			Logger.debug('Default permissions initialized:', this.settings.builtInToolsPermissions);
			
			// Mark as no longer first launch
			this.settings.isFirstLaunch = false;
			await this.configDb.setConfigValue('isFirstLaunch', 'false');
			await this.saveSettings();
		}

		// Note: Built-in prompts initialization moved to after i18n initialization
		// See initializeCustomPrompts() call after i18n.initialize() in onload()
	}

	/**
	 * Run data migrations to fix any issues from previous versions
	 */
	async runMigrations() {
		Logger.debug('Running data migrations...');

		try {
			// Migration 1: Fix HuggingFace models that have isEmbedding = false
			let fixedCount = 0;
			for (const model of this.settings.models) {
				const connection = this.settings.connections.find(c => c.id === model.connectionId);

				// If it's a HuggingFace connection and the model is NOT marked as embedding
				if (connection && connection.type === 'huggingface' && !model.isEmbedding) {
					Logger.debug(`Fixing HuggingFace model: ${model.name} (${model.id})`);
					model.isEmbedding = true;

					// If embedding dimension is not set, try to infer it (default to 384 for common models)
					if (!model.embeddingDimension) {
						model.embeddingDimension = 384; // Common dimension for small embedding models
						Logger.debug(`Set default embedding dimension to 384 for model: ${model.name}`);
					}

					fixedCount++;
				}
			}

			if (fixedCount > 0) {
				Logger.debug(`Fixed ${fixedCount} HuggingFace model(s), saving changes...`);
				await this.saveSettings();
				new Notice(`Automatically fixed ${fixedCount} HuggingFace model(s) to be embedding models`, 5000);
			} else {
				Logger.debug('No HuggingFace models needed fixing');
			}

			// Migration 2: Add showSimilarNotes field to existing vectorSettings
			if (typeof this.settings.vectorSettings.showSimilarNotes === 'undefined') {
				Logger.debug('Adding showSimilarNotes field to vectorSettings');
				this.settings.vectorSettings.showSimilarNotes = true; // Default to enabled
				this.settings.vectorSettings.autoSearchEnabled = false;
				this.settings.vectorSettings.suggestRelatedFiles = this.settings.vectorSettings.suggestRelatedFiles ?? false;
				this.settings.vectorSettings.suggestionTimeout = this.settings.vectorSettings.suggestionTimeout ?? 5000;
				await this.saveSettings();
				Logger.debug('Similar Notes feature settings added and saved');
			}
		} catch (error) {
			Logger.error('Error running migrations:', error);
			// Don't throw - migrations are best effort
		}

		Logger.debug('Data migrations completed');
	}

	async saveSettings() {
		// Prevent recursive calls
		if (this.isSaving) {
			Logger.debug('Save already in progress, skipping...');
			return;
		}
		
		this.isSaving = true;
		try {
			// Save all configuration to database
			try {
				//Logger.debug('Starting database save process...');
				
				// Save connections
				const currentConnections = await this.configDb.getConnections();
				const currentConnectionIds = new Set(currentConnections.map(c => c.id));
				
				for (const connection of this.settings.connections) {
					await this.configDb.saveConnection(connection);
				}
				
				// Remove deleted connections
				for (const currentConn of currentConnections) {
					const stillExists = this.settings.connections.some(c => c.id === currentConn.id);
					if (!stillExists) {
						// Models will be deleted automatically due to CASCADE
						await this.configDb.deleteConnection(currentConn.id);
					}
				}

				// Save models
				const currentModels = await this.configDb.getModels();
				const currentModelIds = new Set(currentModels.map(m => m.id));
				
				for (const model of this.settings.models) {
					await this.configDb.saveModel(model);
				}
				
				// Remove deleted models
				for (const currentModel of currentModels) {
					const stillExists = this.settings.models.some(m => m.id === currentModel.id);
					if (!stillExists) {
						await this.configDb.deleteModel(currentModel.id);
					}
				}

				// Save active connection and model
				await this.configDb.setActiveConnectionId(this.settings.activeConnectionId);
				await this.configDb.setActiveModelId(this.settings.activeModelId);

				// Save basic config
				await this.configDb.setActiveProvider(this.settings.activeProvider);
				await this.configDb.setAgentMode(this.settings.agentMode);
				
				// Save conversation mode
				await this.configDb.setConfigValue('conversationMode', this.settings.conversationMode);
				
				// Save default conversation mode
				await this.configDb.setConfigValue('defaultConversationMode', this.settings.defaultConversationMode);
				
				// Save debug logging setting
				await this.configDb.setConfigValue('enableDebugLogging', this.settings.enableDebugLogging.toString());
				
				// Save chat sessions
				const currentSessions = await this.configDb.getAllChatSessions();
				const currentSessionIds = new Set(currentSessions.map(s => s.id));
				
				// Update or create sessions
				for (const session of this.settings.chatSessions) {
					if (currentSessionIds.has(session.id)) {
						await this.configDb.updateChatSession(session);
					} else {
						await this.configDb.createChatSession(session);
					}
				}
				
				// Remove sessions that no longer exist
				for (const currentSession of currentSessions) {
					const stillExists = this.settings.chatSessions.some(s => s.id === currentSession.id);
					if (!stillExists) {
						await this.configDb.deleteChatSession(currentSession.id);
					}
				}
				
				await this.configDb.setMaxChatHistory(this.settings.maxChatHistory);
				await this.configDb.setNextSessionId(this.settings.nextSessionId);
				
				// Save i18n settings
				await this.configDb.setI18nSettings(this.settings.i18n);
				
				// Save autocomplete settings
				await this.configDb.setAutocompleteSettings(this.settings.autocomplete);
				
				// Save inline quick chat settings
				await this.configDb.setInlineQuickChatSettings(this.settings.inlineQuickChat);
				
				// Save selection popup settings
				await this.configDb.setSelectionPopupSettings(this.settings.selectionPopup);
				
				// Save google search settings
				await this.configDb.setGoogleSearchSettings(this.settings.googleSearch);
				
				// Save vector database settings
				await this.configDb.setVectorSettings(this.settings.vectorSettings);
				
				// Save built-in tool permissions
				await this.configDb.setBuiltInToolPermissions(this.settings.builtInToolsPermissions);
				
				// Save other settings
				await this.configDb.setShowSidebar(this.settings.showSidebar);
				await this.configDb.setSidebarPosition(this.settings.sidebarPosition);
				await this.configDb.setDebugMode(this.settings.debugMode);
				await this.configDb.setEnableDiffRendering(this.settings.enableDiffRenderingInActionMode);
				
				// Save MCP settings (serverPermissions to DB, serversConfig stays in mcp-config.json)
				await this.configDb.setMCPServerPermissions(this.settings.mcpSettings.serverPermissions);
				await this.configDb.setMCPEnableToolSuggestions(this.settings.mcpSettings.enableToolSuggestions);
				await this.configDb.setMCPEnableResourceBrowsing(this.settings.mcpSettings.enableResourceBrowsing);
				
				// Save tool confirmation setting (unified for both MCP and built-in tools)
				await this.configDb.setMCPRequireConfirmationForTools(this.settings.requireConfirmationForTools);
				
				// Save tool auto-execute settings
				await this.configDb.setToolAutoExecute(this.settings.toolAutoExecute);
				
				Logger.debug('All settings saved to database successfully');
				
			} catch (error) {
				Logger.error('Failed to save config to database:', error);
				const errorMessage = error instanceof Error ? error.message : String(error);
				const errorStack = error instanceof Error ? error.stack : undefined;
				Logger.error('Error details:', errorMessage, errorStack);
				throw error; // Don't fallback to JSON anymore - SQLite is required
			}
			
			// Reinitialize providers when settings change
			await this.initializeProviders();

			// Update tool manager settings for permission filtering
			if (this.toolManager) {
				this.toolManager.setSettings(this.settings);
			}

			// Inline completion is always active when autocomplete is enabled
			// No need to reinitialize since it's registered as CodeMirror extension
			Logger.debug('Autocomplete state:', {
				enabled: this.settings.autocomplete.enabled,
				handlerExists: !!this.inlineCompletionHandler
			});

			// Reinitialize quick chat handler when settings change
			if (this.settings.inlineQuickChat.enabled && !this.inlineQuickChatHandler) {
				Logger.debug('Quick Chat enabled, initializing handler...');
				this.inlineQuickChatHandler = new InlineQuickChatHandler(this);
			} else if (!this.settings.inlineQuickChat.enabled && this.inlineQuickChatHandler) {
				Logger.debug('Quick Chat disabled, cleaning up handler...');
				this.inlineQuickChatHandler = undefined;
			}
			
			// Notify chat view that providers have changed
			const chatLeaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
			if (chatLeaves.length > 0) {
				const chatView = chatLeaves[0].view as ChatView;
				chatView.onProviderChanged();
			}
		} finally {
			this.isSaving = false;
		}
	}

	/**
	 * Initialize custom prompts with built-in prompts if none exist
	 */
	private async initializeCustomPrompts(): Promise<void> {
		// Get built-in prompts with i18n support (i18n should be initialized by now)
		const builtInPrompts = getBuiltInPrompts();
		
		// Check if custom prompts are already initialized (contains built-in prompts)
		const hasBuiltInPrompts = this.settings.customPrompts.some(prompt => prompt.isBuiltIn);
		
		// If no built-in prompts exist, initialize with them
		if (!hasBuiltInPrompts && this.settings.customPrompts.length === 0) {
			Logger.debug('Initializing custom prompts with built-in prompts...');
			this.settings.customPrompts = [...builtInPrompts];
			
			// Save the prompts to database to persist the initialization
			for (const prompt of builtInPrompts) {
				try {
					await this.configDb.createPrompt(prompt);
				} catch (error) {
					Logger.warn('Failed to create built-in prompt:', prompt.id, error);
				}
			}
			Logger.debug(`Initialized ${builtInPrompts.length} built-in prompts`);
		} else if (!hasBuiltInPrompts && this.settings.customPrompts.length > 0) {
			// User has custom prompts but no built-in ones, add built-in prompts
			Logger.debug('Adding built-in prompts to existing custom prompts...');
			this.settings.customPrompts.push(...builtInPrompts);
			
			// Save the prompts to database
			for (const prompt of builtInPrompts) {
				try {
					await this.configDb.createPrompt(prompt);
				} catch (error) {
					Logger.warn('Failed to create built-in prompt:', prompt.id, error);
				}
			}
			Logger.debug(`Added ${builtInPrompts.length} built-in prompts to existing custom prompts`);
		} else {
			Logger.debug(`Found ${this.settings.customPrompts.length} existing custom prompts, skipping initialization`);
		}
	}

	private async initializeProviders() {
		// Clear existing providers
		this.providers.clear();

		// Track if we need to save settings due to ID generation
		let needsSave = false;

		// Use new architecture: Connection + Model
		const { ProviderFactory } = await import('./utils/provider-factory');
		const { getActiveConnectionAndModel } = await import('./utils/provider-migration');

		// Get all valid combinations of connections and models
		const validCombinations = ProviderFactory.getValidProviderCombinations(
			this.settings.connections,
			this.settings.models
		);

		// Logger.debug(`Initializing ${validCombinations.length} provider(s) from connections and models`);

		// Create providers from valid combinations
		for (const { connection, model } of validCombinations) {
			try {
				const { provider, providerId } = ProviderFactory.createProviderWithId(
					connection,
					model,
					this.toolManager
				);

				// Add provider to map
				this.providers.set(providerId, provider);

				// Update status
				this.state.providerStatuses[providerId] = {
					provider: providerId,
					lastChecked: Date.now()
				};

				// Logger.debug(`✓ Initialized provider: ${ProviderFactory.getProviderDisplayName(connection, model)}`);
			} catch (error) {
				const providerId = ProviderFactory.generateProviderId(connection.id, model.id);
				Logger.error(`✗ Failed to initialize provider ${providerId}:`, error);
				
				this.state.providerStatuses[providerId] = {
					provider: providerId,
					lastChecked: Date.now(),
					error: {
						code: 'INITIALIZATION_ERROR',
						message: error instanceof Error ? error.message : 'Unknown error',
						provider: providerId,
						retryable: true,
						timestamp: Date.now()
					}
				};
			}
		}

		// Validate active provider using new architecture
		const { connection, model } = getActiveConnectionAndModel(
			this.settings.connections,
			this.settings.models,
			this.settings.activeConnectionId,
			this.settings.activeModelId
		);

		if (connection && model) {
			const newProviderId = ProviderFactory.generateProviderId(connection.id, model.id);
			if (this.providers.has(newProviderId)) {
				Logger.debug(`Active provider: ${ProviderFactory.getProviderDisplayName(connection, model)}`);
				this.settings.activeProvider = newProviderId;
			} else {
				Logger.warn('Active connection/model combination not available');
				// Set first available provider as active
				const enabledProviders = this.getAvailableProviders();
				if (enabledProviders.length > 0) {
					await this.setActiveProvider(enabledProviders[0]);
					Logger.debug(`Switched to available provider: ${enabledProviders[0]}`);
				} else {
					Logger.warn('No enabled providers available');
				}
			}
		} else {
			Logger.warn('No active connection or model selected');
			// Set first available provider as active
			const enabledProviders = this.getAvailableProviders();
			if (enabledProviders.length > 0) {
				await this.setActiveProvider(enabledProviders[0]);
				Logger.debug(`Auto-selected first provider: ${enabledProviders[0]}`);
			}
		}

		// Validate providers in background (non-blocking)
		this.validateProvidersInBackground();
	}

	/**
	 * Public method to reinitialize providers after settings changes
	 */
	async reinitializeProviders(): Promise<void> {
		Logger.debug('Reinitializing providers...');
		await this.initializeProviders();
		Logger.debug('Providers reinitialized');
	}

	private async initializeGitHubTokenRefreshService() {
		try {
			Logger.debug('Initializing GitHub Token Refresh Service...');

			// Dynamically import to avoid circular dependencies
			const { GitHubTokenRefreshService } = await import('./auth/github-token-refresh-service');
			this.githubTokenRefreshService = new GitHubTokenRefreshService();

			// Set callback to update tokens in database when refreshed
			this.githubTokenRefreshService.setOnTokenRefreshed(async (
				connectionId: string,
				githubToken: string,
				copilotToken: string,
				tokenExpiry: number
			) => {
				Logger.debug(`Token refreshed for connection: ${connectionId}, updating database...`);
				Logger.debug(`New token expiry: ${new Date(tokenExpiry).toISOString()}`);
				
				// Find and update connection in database
				const connections = await this.configDb.getConnections();
				const connection = connections.find(c => c.id === connectionId);
				
				if (connection) {
					// Update all token-related fields
					connection.githubToken = githubToken;
					connection.copilotToken = copilotToken;
					connection.tokenExpiry = tokenExpiry; // ✅ Update expiry time in database
					connection.updated = Date.now();
					
					await this.configDb.saveConnection(connection);
					Logger.debug(`✅ Token and expiry time updated in database for connection: ${connection.name}`);
					Logger.debug(`Database record now shows expiry at: ${new Date(connection.tokenExpiry).toISOString()}`);
				} else {
					Logger.warn(`⚠️ Connection ${connectionId} not found in database, skipping update`);
				}
			});

			// Start monitoring all GitHub Copilot connections
			const connections = await this.configDb.getConnections();
			const copilotConnections = connections.filter(c => c.type === 'github-copilot' && c.enabled);
			
			Logger.debug(`Found ${copilotConnections.length} enabled GitHub Copilot connection(s)`);
			
			for (const connection of copilotConnections) {
				this.githubTokenRefreshService.startMonitoring(connection);
				Logger.debug(`Started token refresh monitoring for: ${connection.name}`);
			}

			Logger.debug('GitHub Token Refresh Service initialized');
		} catch (error) {
			Logger.error('Failed to initialize GitHub Token Refresh Service:', error);
		}
	}

	/**
	 * Start/restart token refresh monitoring for a GitHub Copilot connection
	 * Call this after creating or updating a GitHub Copilot connection
	 */
	async startGitHubTokenMonitoring(connection: any) {
		if (!this.githubTokenRefreshService || connection.type !== 'github-copilot') {
			return;
		}

		if (connection.enabled) {
			this.githubTokenRefreshService.startMonitoring(connection);
			Logger.debug(`Started token monitoring for: ${connection.name}`);
		} else {
			this.githubTokenRefreshService.stopMonitoring(connection.id);
			Logger.debug(`Stopped token monitoring for disabled connection: ${connection.name}`);
		}
	}

	/**
	 * Stop token refresh monitoring for a connection
	 * Call this before deleting a GitHub Copilot connection
	 */
	stopGitHubTokenMonitoring(connectionId: string) {
		if (!this.githubTokenRefreshService) {
			return;
		}

		this.githubTokenRefreshService.stopMonitoring(connectionId);
		Logger.debug(`Stopped token monitoring for connection: ${connectionId}`);
	}

	private async initializeMCPManager() {
		try {
			Logger.debug('Initializing MCP Manager...');

			// Create MCP Manager instance
			this.mcpManager = new MCPManager(this.configDb, this.i18n, this.settings.debugMode);

		// Initialize the manager
		await this.mcpManager.initialize();

		// Initialize built-in tools with App instance and settings getter
		setApp(this.app, () => this.settings);

		// Create unified tool manager with MCP manager and settings (file editing tools are now part of built-in tools)
		this.toolManager = new UnifiedToolManager(this.mcpManager, this.settings);			// Load saved permissions
			if (this.settings.mcpSettings.serverPermissions) {
				const permissions = this.settings.mcpSettings.serverPermissions;
				Object.entries(permissions).forEach(([serverId, serverPermissions]) => {
					this.mcpManager.setServerPermissions(serverId, serverPermissions);
				});
				Logger.debug('Loaded MCP server permissions');
			}
			
			// Set up event handlers
			this.mcpManager.on('server-connected', (serverId) => {
				Logger.debug(`MCP Server connected: ${serverId}`);
				// Note: MCP Manager already shows connection success notification
			});

			this.mcpManager.on('server-disconnected', (serverId) => {
				Logger.debug(`MCP Server disconnected: ${serverId}`);
			});

			this.mcpManager.on('server-error', (serverId, error) => {
				Logger.error(`MCP Server error for ${serverId}:`, error);
				new Notice(`MCP Server "${serverId}" error: ${error.message}`);
			});

		this.mcpManager.on('tools-updated', (tools) => {
			Logger.debug(`MCP Tools updated: ${tools.length} tools available`);
		});

		// Auto-connect servers based on autoConnect setting
		setTimeout(() => {
			Logger.debug('Auto-connecting MCP servers based on autoConnect setting...');
			this.mcpManager.connectAutoConnectServers().catch(error => {
				Logger.error('Failed to auto-connect MCP servers:', error);
			});
		}, 2000); // Delay to ensure plugin is fully loaded
		
		Logger.debug('MCP Manager initialized successfully');		} catch (error) {
			Logger.error('Failed to initialize MCP Manager:', error);
			// Don't throw error - MCP is optional functionality
		}
	}

	private async initializeVectorDB() {
		try {
			Logger.debug('Initializing vector database in background...');

			// Create Vector DB Manager instance with connection/model accessors
			this.vectorDBManager = new VectorDBManager(
				this.app.vault,
				this.settings.vectorSettings,
				this.toolManager,
				(connectionId: string) => this.settings.connections.find(c => c.id === connectionId),
				(modelId: string) => this.settings.models.find(m => m.id === modelId),
				this.i18n
			);

			// Set connection update callback for token refresh
			this.vectorDBManager.setConnectionUpdateCallback(async (updatedConnection: LLMConnection) => {
				const connIndex = this.settings.connections.findIndex(c => c.id === updatedConnection.id);
				if (connIndex >= 0) {
					this.settings.connections[connIndex] = updatedConnection;
					await this.saveSettings();
					Logger.debug(`Updated connection ${updatedConnection.id} with refreshed token`);
				}
			});

			// Initialize the manager (may take time if loading large index)
			await this.vectorDBManager.initialize();

			Logger.debug('Vector database initialized successfully (background)');
			
			// Log similar notes settings for debugging
			Logger.debug('Similar notes settings:', {
				showSimilarNotes: this.settings.vectorSettings.showSimilarNotes,
				vectorDBExists: !!this.vectorDBManager
			});
			
			// Initialize similar notes manager if enabled
			if (this.settings.vectorSettings.showSimilarNotes && this.vectorDBManager) {
				Logger.debug('Initializing similar notes view manager...');
				this.similarNotesManager = new SimilarNotesViewManager(
					this,
					this.app.workspace
				);
				
				// Register file-open event listener
				this.registerEvent(
					this.app.workspace.on('file-open', (file) => {
						if (this.similarNotesManager && file) {
							this.similarNotesManager.onFileOpen(file);
						}
					})
				);
				
				// Trigger for currently open file if any
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					Logger.debug('Triggering similar notes for currently open file:', activeFile.path);
					this.similarNotesManager.onFileOpen(activeFile);
				}
				
				Logger.debug('Similar notes view manager initialized');
			}
			
			// Show subtle notice that vector DB is ready
			new Notice(this.i18n.t('notifications.vectorDatabase.loaded'), 2000);

			// Update context search button state in chat view
			const chatView = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0]?.view as any;
			if (chatView && typeof chatView.refreshContextSearchButton === 'function') {
				chatView.refreshContextSearchButton();
			}
		} catch (error) {
			Logger.error('Failed to initialize vector database:', error);
			new Notice(this.i18n.t('notifications.vectorDatabase.initFailed'));
			// Don't throw error - vector DB is optional functionality
		}
	}

	private validateProvidersInBackground() {
		// Provider validation has been disabled for debugging
	}

	private registerCommands() {
		// Open chat command
		this.addCommand({
			id: 'open-chat',
			name: 'Open Chat',
			callback: () => this.activateChatView()
		});

		// Switch mode command
		this.addCommand({
			id: 'switch-mode',
			name: 'Switch Chat Mode',
			callback: () => this.switchChatMode()
		});

		// Add selected text to context command
		this.addCommand({
			id: 'add-selected-text-to-context',
			name: 'Add Selected Text to LLMSider Context',
			callback: () => this.addSelectedTextToContext()
		});

		// Model switching commands (using connection + model architecture)
		this.settings.models.forEach(model => {
			if (model.enabled && model.id) {
				const connection = this.settings.connections.find(c => c.id === model.connectionId);
				if (connection && connection.enabled) {
					const displayName = `${connection.name} - ${model.name}`;
					const providerId = `${connection.id}::${model.id}`;
					this.addCommand({
						id: `switch-to-${providerId}`,
						name: `Switch to ${displayName}`,
						callback: () => this.switchProvider(providerId)
					});
				}
			}
		});

		// MCP Commands
		this.addCommand({
			id: 'mcp-connect-all',
			name: 'Connect All MCP Servers',
			callback: () => this.connectAllMCPServers()
		});

		this.addCommand({
			id: 'mcp-disconnect-all',
			name: 'Disconnect All MCP Servers',
			callback: () => this.disconnectAllMCPServers()
		});

		this.addCommand({
			id: 'mcp-list-tools',
			name: 'List Available MCP Tools',
			callback: () => this.listMCPTools()
		});

		// Vector Database Commands
		this.addCommand({
			id: 'vector-sync-index',
			name: 'Sync Vector Database Index',
			callback: () => this.syncVectorIndex()
		});

		this.addCommand({
			id: 'vector-rebuild-index',
			name: 'Rebuild Vector Database Index',
			callback: () => this.rebuildVectorIndex()
		});

		this.addCommand({
			id: 'vector-show-status',
			name: 'Show Vector Database Status',
			callback: () => this.showVectorStatus()
		});

		// Quick Chat command
		this.addCommand({
			id: 'inline-quick-chat',
			name: this.i18n.t('commands.openQuickChat'),
			hotkeys: [{ modifiers: ['Mod'], key: '/' }],
			editorCallback: (editor, view) => {
				if (this.inlineQuickChatHandler && this.settings.inlineQuickChat.enabled) {
					// Get the CodeMirror 6 editor view
					const editorView = (view as any).editor?.cm;
					if (editorView) {
						this.inlineQuickChatHandler.show(editorView);
					} else {
						new Notice(this.i18n.t('commands.unableToAccessEditor'));
					}
				} else {
					new Notice(this.i18n.t('commands.quickChatDisabled'));
				}
			}
		});
	}

	private registerContextMenu() {
		// Register editor context menu
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				// Check if there's selected text
				const selectedText = editor.getSelection();
				if (selectedText && selectedText.trim()) {
					menu.addItem((item) => {
						item
							.setTitle('Add to LLMSider Context')
							.setIcon('message-circle')
							.onClick(() => {
								this.addSelectedTextToContext();
							});
					});
				}
			})
		);

		// Also register file-menu for right-clicking in reading mode
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file, source, view) => {
				// Check if there's selected text
				const selection = window.getSelection();
				if (selection && selection.toString().trim()) {
					menu.addItem((item) => {
						item
							.setTitle('Add to LLMSider Context')
							.setIcon('message-circle')
							.onClick(() => {
								this.addSelectedTextToContext();
							});
					});
				}
			})
		);
	}

	private async addSelectedTextToContext() {
		try {
			// Get chat view and its context manager
			const chatView = this.getChatView();
			if (!chatView) {
				new Notice(this.i18n.t('notifications.chat.openFirst'));
				return;
			}

			// Use the context manager from the chat view
			const contextManager = (chatView as any).contextManager;
			if (!contextManager) {
				new Notice(this.i18n.t('notifications.chat.contextManagerNotAvailable'));
				return;
			}

			// First try to get selected text directly from different sources
			let selectedText = '';
			
			// Method 1: Try from active markdown view editor
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const editor = (activeView as any).editor;
				if (editor && editor.getSelection) {
					selectedText = editor.getSelection();
				}
			}
			
			// Method 2: Try from window selection
			if (!selectedText) {
				const selection = window.getSelection();
				if (selection && selection.toString().trim()) {
					selectedText = selection.toString().trim();
				}
			}

			// If we have selected text, add it directly to context
			if (selectedText && selectedText.trim()) {
				const result = await contextManager.addTextToContext(selectedText.trim());
				
				if (result.success) {
					new Notice(`Added selected text to context: ${result.context?.preview || 'Added'}`);
					
					// Update context display in chat view
					if ((chatView as any).updateContextDisplay) {
						(chatView as any).updateContextDisplay();
					}
					
					// Optionally activate the chat view
					this.activateChatView();
				} else {
					new Notice(result.message);
				}
			} else {
				// Fallback to the context manager's method
				const result = await contextManager.includeSelectedText();
				
				if (result.success) {
					new Notice(`Added selected text to context: ${result.context?.preview || 'Added'}`);
					
					// Update context display in chat view
					if ((chatView as any).updateContextDisplay) {
						(chatView as any).updateContextDisplay();
					}
					
					// Optionally activate the chat view
					this.activateChatView();
				} else {
					new Notice(result.message);
				}
			}
		} catch (error) {
			Logger.error('Error adding selected text to context:', error);
			new Notice(this.i18n.t('notifications.chat.addContextFailed'));
		}
	}

	getChatView(): ChatView | null {
		const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
		if (leaves.length > 0) {
			return leaves[0].view as ChatView;
		}
		return null;
	}

	async activateChatView() {
		try {
			const { workspace } = this.app;

			// Check if workspace is ready
			if (!workspace || !workspace.layoutReady) {
				Logger.warn('Workspace not ready for chat view activation, deferring...');
				setTimeout(() => this.activateChatView(), 1000);
				return;
			}

			let leaf: WorkspaceLeaf | null = null;
			const leaves = workspace.getLeavesOfType(CHAT_VIEW_TYPE);

			if (leaves.length > 0) {
				// Chat view already exists, activate it
				leaf = leaves[0];
			} else {
				// Create new chat view with better error handling
				try {
					// Try to get the main leaf first
					const mainLeaf = workspace.getLeaf(false);
					if (mainLeaf) {
						// Split from the main leaf
						leaf = workspace.getLeaf('split', 'vertical');
					} else {
						// Fallback: try to create a new leaf
						leaf = workspace.getLeaf(true);
					}

					if (!leaf) {
						// Last resort: try right sidebar
						leaf = workspace.getRightLeaf(false);
					}

					if (leaf) {
						await leaf.setViewState({ type: CHAT_VIEW_TYPE });
					} else {
						throw new Error('Failed to create workspace leaf');
					}
				} catch (error) {
					Logger.error('Error creating chat view leaf:', error);
					new Notice(this.i18n.t('notifications.chat.openFailed'));
					return;
				}
			}

			if (leaf) {
				// Activate the leaf
				workspace.revealLeaf(leaf);
				this.state.activeView = CHAT_VIEW_TYPE;
			} else {
				Logger.error('No leaf available for chat view');
				new Notice(this.i18n.t('notifications.chat.createFailed'));
			}
		} catch (error) {
			Logger.error('Error in activateChatView:', error);
			new Notice(this.i18n.t('notifications.chat.activationFailed'));
		}
	}

	async switchChatMode() {
		// Mode switching is no longer supported - Agent mode is controlled via settings
		new Notice('Mode switching has been replaced with Agent mode toggle in settings');
	}

	async switchProvider(providerId: string) {
		if (!this.providers.has(providerId)) {
			// Parse providerId to get connection and model
			const [connectionId, modelId] = providerId.split('::');
			const connection = this.settings.connections.find(c => c.id === connectionId);
			const model = this.settings.models.find(m => m.id === modelId);
			const displayName = connection && model ? `${connection.name} - ${model.name}` : providerId;
			new Notice(`Provider ${displayName} is not available`);
			return;
		}

		this.settings.activeProvider = providerId;
		await this.saveSettings();
		
		// Parse providerId to get connection and model for display name
		const [connectionId, modelId] = providerId.split('::');
		const connection = this.settings.connections.find(c => c.id === connectionId);
		const model = this.settings.models.find(m => m.id === modelId);
		const displayName = connection && model ? `${connection.name} - ${model.name}` : providerId;
		new Notice(`Switched to ${displayName} provider`);

		// Update chat view if open
		const chatLeaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
		if (chatLeaves.length > 0) {
			const chatView = chatLeaves[0].view as ChatView;
			chatView.onProviderChanged();
		}
	}

	// Provider management methods
	getActiveProvider(): BaseLLMProvider | null {
		// Get provider from connection + model
		if (this.settings.activeConnectionId && this.settings.activeModelId) {
			const { ProviderFactory } = require('./utils/provider-factory');
			const providerId = ProviderFactory.generateProviderId(
				this.settings.activeConnectionId,
				this.settings.activeModelId
			);
			
			if (this.providers.has(providerId)) {
				return this.providers.get(providerId) || null;
			}
		}
		
		// If no active provider or it doesn't exist, auto-select first available
		const availableProviders = this.getAvailableProviders();
		if (availableProviders.length > 0) {
			const firstProvider = availableProviders[0];
			this.setActiveProvider(firstProvider);
			return this.providers.get(firstProvider) || null;
		}
		
		return null;
	}

	getProvider(name: string): BaseLLMProvider | null {
		return this.providers.get(name) || null;
	}

	/**
	 * Get current active model name (for metadata)
	 */
	getActiveModelName(): string {
		if (this.settings.activeConnectionId && this.settings.activeModelId) {
			const model = this.settings.models.find(m => m.id === this.settings.activeModelId);
			if (model) {
				return model.modelName;
			}
		}

		return 'unknown';
	}

	getAvailableProviders(): string[] {
		// Return all initialized provider IDs
		return Array.from(this.providers.keys());
	}

	/**
	 * Get available providers with display names for UI
	 */
	getAvailableProvidersWithNames(): Array<{ id: string; name: string; connectionId?: string; modelId?: string }> {
		const { ProviderFactory } = require('./utils/provider-factory');
		const providers: Array<{ id: string; name: string; connectionId?: string; modelId?: string }> = [];

		// Get providers from new architecture
		for (const connection of this.settings.connections) {
			if (!connection.enabled) continue;
			
			const models = this.settings.models.filter(m => 
				m.connectionId === connection.id && m.enabled
			);
			
			for (const model of models) {
				const providerId = ProviderFactory.generateProviderId(connection.id, model.id);
				if (this.providers.has(providerId)) {
					providers.push({
						id: providerId,
						name: ProviderFactory.getProviderDisplayName(connection, model),
						connectionId: connection.id,
						modelId: model.id
					});
				}
			}
		}

		return providers;
	}

	/**
	 * Set active provider by ID
	 */
	async setActiveProvider(providerId: string): Promise<void> {
		const { ProviderFactory } = require('./utils/provider-factory');
		
		// Parse the provider ID to extract connection and model IDs
		const parsed = ProviderFactory.parseProviderId(providerId);
		if (parsed) {
			this.settings.activeConnectionId = parsed.connectionId;
			this.settings.activeModelId = parsed.modelId;
			this.settings.activeProvider = providerId; // Keep for compatibility
			await this.saveSettings();
		} else {
			Logger.error('Invalid provider ID format:', providerId);
		}
	}

	/**
	 * Get available connections for UI
	 */
	getAvailableConnections(): Array<{ id: string; name: string; type: string; enabled: boolean }> {
		return this.settings.connections.map(conn => ({
			id: conn.id,
			name: conn.name,
			type: conn.type,
			enabled: conn.enabled
		}));
	}

	/**
	 * Get available models for a connection
	 */
	getModelsForConnection(connectionId: string): Array<{ id: string; name: string; modelName: string; enabled: boolean; isDefault: boolean }> {
		return this.settings.models
			.filter(m => m.connectionId === connectionId)
			.map(model => ({
				id: model.id,
				name: model.name,
				modelName: model.modelName,
				enabled: model.enabled,
				isDefault: model.isDefault || false
			}));
	}

	/**
	 * Fetch available model names from the API for a specific connection
	 * This calls the provider's listModels() method to get actual available models
	 */
	async fetchAvailableModelsForConnection(connectionId: string): Promise<string[]> {
		try {
			const connection = this.settings.connections.find(c => c.id === connectionId);
			if (!connection) {
				Logger.error(`Connection not found: ${connectionId}`);
				return [];
			}

			// For embedding-only connections, return empty list as they don't support chat models
			if (['huggingface', 'local'].includes(connection.type)) {
				Logger.debug(`Connection type ${connection.type} is for embedding models only, skipping model listing`);
				return [];
			}

			// Create a temporary provider instance to call listModels()
			const { ProviderFactory } = await import('./utils/provider-factory');
			
			// Create a temporary model config just for listing models
			const tempModel = {
				id: 'temp',
				name: 'temp',
				connectionId: connection.id,
				modelName: 'temp',
				maxTokens: 4096,
				temperature: 0.7,
				enabled: true,
				created: Date.now(),
				updated: Date.now()
			};

			const provider = ProviderFactory.createProvider(connection, tempModel, this.toolManager);
			
			// Call the provider's listModels method
			const models = await provider.listModels();
			Logger.debug(`Fetched ${models.length} models for connection ${connection.name}:`, models);
			
			return models;
		} catch (error) {
			Logger.error('Error fetching models for connection:', error);
			return [];
		}
	}

	/**
	 * Set active connection and model
	 */
	async setActiveConnectionAndModel(connectionId: string, modelId: string): Promise<void> {
		this.settings.activeConnectionId = connectionId;
		this.settings.activeModelId = modelId;
		
		// Update legacy activeProvider for compatibility
		const { ProviderFactory } = require('./utils/provider-factory');
		this.settings.activeProvider = ProviderFactory.generateProviderId(connectionId, modelId);
		
		await this.saveSettings();
		
		// Notify UI
		const chatLeaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
		if (chatLeaves.length > 0) {
			const chatView = chatLeaves[0].view as ChatView;
			chatView.onProviderChanged();
		}
	}

	// Chat session management
	async createChatSession(name?: string): Promise<ChatSession> {
		// Get the current nextSessionId and increment it
		const sessionId = this.settings.nextSessionId.toString();
		this.settings.nextSessionId++;

		const session: ChatSession = {
			id: sessionId,
			name: name || 'Untitled', // Default to Untitled, will be updated from first message
			messages: [],
			created: Date.now(),
			updated: Date.now(),
			provider: this.settings.activeProvider,
			mode: 'ask' // Default mode for compatibility
		};

		this.settings.chatSessions.unshift(session);

		// Limit chat history
		if (this.settings.chatSessions.length > this.settings.maxChatHistory) {
			this.settings.chatSessions = this.settings.chatSessions.slice(0, this.settings.maxChatHistory);
		}

		await this.saveSettings();
		return session;
	}

	async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
		const sessionIndex = this.settings.chatSessions.findIndex(s => s.id === sessionId);
		if (sessionIndex >= 0) {
			this.settings.chatSessions[sessionIndex] = {
				...this.settings.chatSessions[sessionIndex],
				...updates,
				updated: Date.now()
			};
			await this.saveSettings();
		}
	}

	async deleteChatSession(sessionId: string): Promise<void> {
		this.settings.chatSessions = this.settings.chatSessions.filter(s => s.id !== sessionId);
		await this.saveSettings();
	}

	getChatSession(sessionId: string): ChatSession | null {
		return this.settings.chatSessions.find(s => s.id === sessionId) || null;
	}

	// Debug and logging methods
	debug(message: string, ...args: any[]) {
		if (this.settings.debugMode) {
			Logger.debug(`${message}`, ...args);
		}
	}

	logError(error: any, context?: string) {
		const errorMessage = context ? `${context}: ${error.message || error}` : error.message || error;
		Logger.error(`${errorMessage}`, error);
		
		this.state.lastError = {
			code: error.code || 'UNKNOWN_ERROR',
			message: errorMessage,
			retryable: false,
			timestamp: Date.now()
		};
	}

	// Get plugin status for debugging
	getStatus() {
		return {
			isLoaded: this.state.isLoaded,
			activeProvider: this.settings.activeProvider,
			availableProviders: this.getAvailableProviders(),
			providerStatuses: this.state.providerStatuses,
			chatSessions: this.settings.chatSessions.length,
			lastError: this.state.lastError
		};
	}

	// Vector Database Command Methods
	private async syncVectorIndex(): Promise<void> {
		if (!this.vectorDBManager) {
			new Notice('Vector database not initialized. Enable it in settings first.');
			return;
		}

		try {
			await this.vectorDBManager.syncIndex();
		} catch (error) {
			Logger.error('Failed to sync vector index:', error);
		}
	}

	private async rebuildVectorIndex(): Promise<void> {
		if (!this.vectorDBManager) {
			new Notice('Vector database not initialized. Enable it in settings first.');
			return;
		}

		// Confirm rebuild operation
		const confirmed = confirm('This will rebuild the entire vector database index. This may take a while. Continue?');
		if (!confirmed) {
			return;
		}

		try {
			await this.vectorDBManager.rebuildIndex();
		} catch (error) {
			Logger.error('Failed to rebuild vector index:', error);
		}
	}

	private async showVectorStatus(): Promise<void> {
		if (!this.vectorDBManager) {
			new Notice('Vector database not initialized. Enable it in settings first.');
			return;
		}

		const status = this.vectorDBManager.getStatus();
		
		const message = [
			'Vector Database Status:',
			`- Total Chunks: ${status.totalChunks}`,
			`- Total Files: ${status.totalFiles}`,
			`- Indexing: ${status.isIndexing ? 'In Progress' : 'Idle'}`,
			`- Last Sync: ${status.lastIndexTime ? new Date(status.lastIndexTime).toLocaleString() : 'Never'}`
		].join('\n');

		// Create a modal to show status
		const modal = document.body.createDiv({ cls: 'modal' });
		modal.style.display = 'flex';
		
		const container = modal.createDiv({ cls: 'modal-content' });
		container.createEl('h2', { text: 'Vector Database Status' });
		
		const statusDiv = container.createDiv({ cls: 'vector-status' });
		statusDiv.style.whiteSpace = 'pre-line';
		statusDiv.textContent = message;
		
		const closeBtn = container.createEl('button', { text: 'Close' });
		closeBtn.onclick = () => modal.remove();
		
		// Close on background click
		modal.onclick = (e) => {
			if (e.target === modal) modal.remove();
		};
	}

	// MCP Command Methods
	private async connectAllMCPServers(): Promise<void> {
		if (!this.mcpManager) {
			new Notice('MCP Manager not initialized');
			return;
		}

		try {
			await this.mcpManager.connectAllServers();
			const connectedServers = this.mcpManager.getConnectedServers();
			new Notice(`Connected to ${connectedServers.length} MCP servers`);
		} catch (error) {
			Logger.error('Failed to connect to MCP servers:', error);
			new Notice('Failed to connect to some MCP servers. Check console for details.');
		}
	}

	private async disconnectAllMCPServers(): Promise<void> {
		if (!this.mcpManager) {
			new Notice('MCP Manager not initialized');
			return;
		}

		try {
			await this.mcpManager.disconnectAllServers();
			new Notice('Disconnected from all MCP servers');
		} catch (error) {
			Logger.error('Failed to disconnect from MCP servers:', error);
			new Notice('Error disconnecting from MCP servers. Check console for details.');
		}
	}

	private async listMCPTools(): Promise<void> {
		if (!this.mcpManager) {
			new Notice('MCP Manager not initialized');
			return;
		}

		try {
			const tools = await this.mcpManager.listAllTools();
			
			if (tools.length === 0) {
				new Notice('No MCP tools available. Make sure servers are connected.');
				return;
			}

			// Create a simple modal to show tools
			const modal = document.body.createDiv({ cls: 'modal' });
			modal.style.display = 'flex';
			
			const container = modal.createDiv({ cls: 'modal-content' });
			container.createEl('h2', { text: `Available MCP Tools (${tools.length})` });
			
			const toolsList = container.createDiv({ cls: 'mcp-tools-list' });
			
			tools.forEach(tool => {
				const toolItem = toolsList.createDiv({ cls: 'mcp-tool-item' });
				toolItem.createEl('h4', { text: tool.name });
				toolItem.createEl('p', { text: `Server: ${tool.server}` });
				if (tool.description) {
					toolItem.createEl('p', { text: tool.description });
				}
			});
			
			const closeBtn = container.createEl('button', { text: 'Close' });
			closeBtn.onclick = () => modal.remove();
			
			// Close on background click
			modal.onclick = (e) => {
				if (e.target === modal) modal.remove();
			};
			
		} catch (error) {
			Logger.error('Failed to list MCP tools:', error);
			new Notice('Failed to list MCP tools. Check console for details.');
		}
	}

	// Public method to access MCP Manager (for use by other components)
	getMCPManager(): MCPManager | null {
		return this.mcpManager || null;
	}

	// Public method to access Tool Manager (for use by other components)
	getToolManager(): UnifiedToolManager | null {
		return this.toolManager || null;
	}

	// Public method to access I18n Manager (for use by other components)
	getI18nManager(): I18nManager | null {
		return this.i18n || null;
	}

	// Public method to check if a tool should auto-execute
	shouldToolAutoExecute(toolName: string): boolean {
		// If global confirmation is disabled, all tools auto-execute
		if (!this.settings.requireConfirmationForTools) {
			return true;
		}
		
		// Otherwise check tool-specific setting
		return this.settings.toolAutoExecute[toolName] ?? false;
	}
	
	// Public method to set tool auto-execute preference
	async setToolAutoExecute(toolName: string, autoExecute: boolean): Promise<void> {
		this.settings.toolAutoExecute[toolName] = autoExecute;
		await this.saveSettings();
	}

// Public method to access Vector DB Manager (for use by other components)
getVectorDBManager(): VectorDBManager | null {
return this.vectorDBManager || null;
}

/**
 * Register file change event listeners for automatic indexing
 */
private registerFileEventListeners(): void {
// Listen for file creation
this.registerEvent(
this.app.vault.on('create', async (file) => {
if (!this.vectorDBManager || !this.settings.vectorSettings.enabled) {
return;
}
// Queue file for indexing (with debouncing)
await this.vectorDBManager.queueFileIndex(file.path);
})
);

// Listen for file modification
this.registerEvent(
this.app.vault.on('modify', async (file) => {
if (!this.vectorDBManager || !this.settings.vectorSettings.enabled) {
return;
}
// Queue file for re-indexing (with debouncing)
await this.vectorDBManager.queueFileIndex(file.path);
})
);

// Listen for file deletion
this.registerEvent(
this.app.vault.on('delete', async (file) => {
if (!this.vectorDBManager || !this.settings.vectorSettings.enabled) {
return;
}
// Queue file for removal (with debouncing)
await this.vectorDBManager.queueFileRemoval(file.path);
})
);

// Listen for file rename
this.registerEvent(
this.app.vault.on('rename', async (file, oldPath) => {
if (!this.vectorDBManager || !this.settings.vectorSettings.enabled) {
return;
}
// Remove old path and index new path
await this.vectorDBManager.queueFileRemoval(oldPath);
await this.vectorDBManager.queueFileIndex(file.path);
})
);

Logger.debug('File change listeners registered for automatic indexing');
}
}
