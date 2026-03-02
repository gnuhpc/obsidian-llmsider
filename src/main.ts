import { Plugin, WorkspaceLeaf, Notice, MarkdownView, TFile, requestUrl } from 'obsidian';
import { Logger } from './utils/logger';
// Force rebuild timestamp update
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
import { ReadingViewQuickChatHandler } from './completion/reading-view-quick-chat';
import { createInlineCompletionExtension } from './completion/inline-completion';
import { createCompletionKeymap } from './completion/completion-keymap';
import { ConfigDatabase } from './utils/config-db';
import { BUILT_IN_PROMPTS, getBuiltInPrompts } from './data/built-in-prompts';
import { MCPManager } from './mcp/mcp-manager';
import { UnifiedToolManager } from './tools/unified-tool-manager';
import { setApp, initializeBuiltInTools } from './tools/built-in-tools';
import { I18nManager, i18n } from './i18n/i18n-manager';
import { UpdateConfirmModal, UpdateInfo } from './ui/update-confirm-modal';
import { SelectionPopup } from './ui/selection-popup';
import { SelectionToolbar } from './ui/selection-toolbar';
import { VectorDBManager } from './vector';
import { SimilarNotesViewManager } from './ui/similar-notes-manager';
import { memoryMonitor } from './utils/memory-monitor';
import { OpenCodeServerManager } from './utils/opencode-server-manager';

type UpdateCheckResult = {
	hasUpdate: boolean;
	latestVersion: string;
	currentVersion: string;
	releaseTag?: string;
	releaseUrl?: string;
	changelog?: string;
	error?: string;
};

export default class LLMSiderPlugin extends Plugin {
	settings!: LLMSiderSettings;
	providers: Map<string, BaseLLMProvider> = new Map();
	state!: PluginState;
	fileReferenceSuggest!: FileReferenceSuggest;
	inlineCompletionHandler?: InlineCompletionHandler;
	inlineQuickChatHandler?: InlineQuickChatHandler;
	readingViewQuickChatHandler?: ReadingViewQuickChatHandler;
	configDb!: ConfigDatabase;
	mcpManager!: MCPManager;
	toolManager!: UnifiedToolManager;
	i18n!: I18nManager;
	selectionPopup?: SelectionPopup;
	selectionToolbar?: SelectionToolbar;
	vectorDBManager?: VectorDBManager;
	similarNotesManager?: SimilarNotesViewManager;
	speedReadingManager?: import('./features/speed-reading').SpeedReadingManager;
	githubTokenRefreshService?: unknown; // GitHubTokenRefreshService
	opencodeServerManager?: OpenCodeServerManager;
	private isSaving = false;
	private memoryManager?: import('./core/agent/memory-manager').MemoryManager;
	private lastAutoAddedNotePath?: string;
	private updateCheckIntervalId?: number;

	async onload() {
		Logger.debug('Loading LLMSider plugin...');

		// Initialize plugin state
		this.state = {
			isLoaded: false,
			isLoadingSession: false,
			providerStatuses: {}
		};

		try {
			// Get vault path
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const vaultPath = (this.app.vault.adapter as any).basePath || '';

			// Initialize configuration database
			this.configDb = new ConfigDatabase(vaultPath, this.app.vault.adapter, this.app.vault);

			try {
				await this.configDb.initialize();

				// Initialize speed reading database table
				const { SpeedReadingManager } = await import('./features/speed-reading');
				await SpeedReadingManager.initializeDatabase(this.configDb);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);

				// Check if it's a WASM memory error
				if (errorMsg.includes('Out of memory') || errorMsg.includes('Cannot allocate Wasm memory')) {
					Logger.error('[LLMSider] SQLite WASM initialization failed due to memory constraints');
					new Notice(this.i18n.t('ui.memoryInitFailed'), 10000);
					throw new Error('SQLite WASM initialization failed: Out of memory. Please restart Obsidian and try again.');
				}
				throw error;
			}			// Set vault path for conversation logger (enables log migration)
			const { ConversationLogger } = await import('./utils/conversation-logger');
			ConversationLogger.getInstance().setVaultPath(vaultPath);

			// Load settings first
			await this.loadSettings();

			// Initialize logger with debug setting
			const { Logger } = await import('./utils/logger');
			Logger.setDebugEnabled(this.settings.enableDebugLogging);
			Logger.debug('[LoadSettings] After Logger init - vectorSettings.autoSearchEnabled:', this.settings.vectorSettings.autoSearchEnabled);

			// Run migrations for data fixes
			await this.runMigrations();

			// Clean up old vector data files
			await this.cleanupVectorDataFiles();

			// Initialize i18n system with detected or saved language
			// Use the global singleton instance
			this.i18n = i18n;
			// Try to get Obsidian's locale setting
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

			// Schedule update checks
			this.scheduleUpdateChecks();

			// Register language change listener to update built-in prompts translations
			this.i18n.onLanguageChange((language) => {
				Logger.debug(`Language changed to ${language}, updating built-in prompts translations...`);
				this.configDb.updateBuiltInPromptsTranslations();
			});

			// Initialize providers
			await this.initializeProviders();

			await this.initializeSpeedReadingManager();
			
			// Initialize MCP Manager
			await this.initializeMCPManager();

			// Initialize GitHub Token Refresh Service
			await this.initializeGitHubTokenRefreshService();

			// Register file-open event listener
			this.registerEvent(
				this.app.workspace.on('file-open', async (file) => {
					if (this.similarNotesManager && file) {
						this.similarNotesManager.onFileOpen(file);
					}
					
					if (this.settings.contextSettings?.autoReference && file && file.extension === 'md') {
						const chatView = this.getChatView();
						if (chatView && (chatView as any).contextManager) {
							const contextManager = (chatView as any).contextManager;

							contextManager.clearContext();
							await contextManager.addFileToContext(file);
							this.lastAutoAddedNotePath = file.path;
							
							if ((chatView as any).updateContextDisplay) {
								(chatView as any).updateContextDisplay();
							}
						}
					}
				})
			);

			// Only initialize Vector Database if explicitly enabled OR if memory features need it
			// This reduces startup memory usage
			if (this.settings.vectorSettings.enabled ||
				this.settings.memorySettings.enableSemanticRecall) {
				Logger.debug('Starting vector database initialization in background...');
				this.initializeVectorDB().catch(error => {
					Logger.error('Background vector DB initialization failed:', error);
				});

				// Removed: Automatic file indexing to prevent startup vector generation storms
				// Users can manually rebuild/sync index when needed via settings
				// this.registerFileEventListeners();
				Logger.debug('Automatic file indexing disabled to prevent startup vector generation');
			} else {
				Logger.debug('Vector database initialization skipped (not enabled)');
			}

			// Initialize file reference suggest
			this.fileReferenceSuggest = new FileReferenceSuggest(this);
			this.registerEditorSuggest(this.fileReferenceSuggest);
			Logger.debug('File reference suggest registered');

			// Initialize autocomplete suggest (always initialize handler and register extension)
			// The handler itself will check settings.autocomplete.enabled
			Logger.debug('Initializing autocomplete handler...');
			this.inlineCompletionHandler = new InlineCompletionHandler(this);

			Logger.debug('Registering autocomplete CodeMirror extensions...');
			this.registerEditorExtension([
				createInlineCompletionExtension(),
				createCompletionKeymap(this.inlineCompletionHandler),
				EditorView.updateListener.of((update) => {
					if (update.docChanged && this.inlineCompletionHandler) {
						this.inlineCompletionHandler.handleDocumentChange(update.view);
					}
				})
			]);

			if (this.settings.autocomplete.enabled) {
				Logger.debug('✅ Inline autocomplete enabled!');
				Logger.debug('💡 Press Tab to accept, Escape to cancel');
			} else {
				Logger.debug('Autocomplete is disabled in settings (handler initialized but inactive)');
			}

			// Initialize quick chat (always initialize handler)
			Logger.debug('Initializing Quick Chat handler...');
			this.inlineQuickChatHandler = new InlineQuickChatHandler(this);
			this.readingViewQuickChatHandler = new ReadingViewQuickChatHandler(this);

			// Register state fields and keymap for quick chat
			const { quickChatState, diffPreviewState, createDiffKeymap } = await import('./completion/inline-quick-chat');
			this.registerEditorExtension([
				quickChatState,
				diffPreviewState,
				createDiffKeymap(this.inlineQuickChatHandler)
			]);

			if (this.settings.inlineQuickChat.enabled) {
				Logger.debug('✅ Quick Chat enabled!');
				Logger.debug('💡 Press ' + this.settings.inlineQuickChat.triggerKey + ' to open quick chat');
			} else {
				Logger.debug('Quick Chat is disabled in settings (handler initialized but inactive)');
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

			// Initialize selection toolbar
			this.selectionToolbar = new SelectionToolbar(this);
			Logger.debug('Selection toolbar initialized');

			// Add settings tab
			this.addSettingTab(new LLMSiderSettingTab(this.app, this));

			// Defer chat view initialization until workspace is ready
			this.app.workspace.onLayoutReady(() => {
				this.activateChatView();
			});

			// Load jsMind library globally (for speed reading feature)
			await this.loadJsMindLibrary();

			// Initialize memory monitoring
			await this.initializeMemoryMonitoring();

			// Initialize OpenCode server monitoring if OpenCode connections exist
			await this.initializeOpenCodeMonitoring();

			this.state.isLoaded = true;
			// Note: Vector database searches will be enabled after initial session loads
			// to prevent startup vector generation

			Logger.debug('LLMSider plugin loaded successfully');

		} catch (error) {
			Logger.error('Failed to load LLMSider plugin:', error);
			new Notice(this.i18n.t('notifications.plugin.loadFailed'));
		}
	}

	/**
	 * Load jsMind library globally (like webchat loads it in HTML)
	 * This ensures window.jsMind is available before any speed reading modals open
	 */
	private async loadJsMindLibrary(): Promise<void> {
		Logger.debug('[Plugin] Loading jsMind library...');

		// Check if already loaded
		if (window.jsMind) {
			Logger.debug('[Plugin] jsMind already loaded');
			return;
		}

		try {
			// jsMind CSS is now bundled in styles.css, remove any old CDN links
			const oldCssLinks = document.querySelectorAll('link[href*="jsmind.css"]');
			oldCssLinks.forEach(link => {
				Logger.debug('[Plugin] Removing old jsMind CSS link:', link.getAttribute('href'));
				link.remove();
			});
			Logger.debug('[Plugin] jsMind CSS bundled with plugin styles');

			// Load JS
			const jsUrl = 'https://unpkg.com/jsmind@0.8.5/es6/jsmind.js';
			const existingScript = document.querySelector(`script[src="${jsUrl}"]`);

			if (existingScript) {
				Logger.debug('[Plugin] jsMind script tag already exists, waiting for load...');
				// Wait for it to load
				const maxWait = 10000; // 10 seconds
				const startTime = Date.now();
				while (!window.jsMind && (Date.now() - startTime) < maxWait) {
					await new Promise(resolve => setTimeout(resolve, 100));
				}
				if (!window.jsMind) {
					throw new Error('jsMind failed to load within timeout');
				}
				Logger.debug('[Plugin] jsMind loaded successfully');
				return;
			}

			// Load the script
			await new Promise<void>((resolve, reject) => {
				const script = document.createElement('script');
				script.src = jsUrl;
				script.type = 'module';

				script.onload = async () => {
					// Wait a bit for the global to be set
					await new Promise(resolve => setTimeout(resolve, 100));
					if (!window.jsMind) {
						reject(new Error('jsMind global not available after script load'));
					} else {
						Logger.debug('[Plugin] jsMind loaded successfully');
						resolve();
					}
				};

				script.onerror = () => {
					reject(new Error('Failed to load jsMind script'));
				};

				document.head.appendChild(script);
			});
		} catch (error) {
			Logger.error('[Plugin] Failed to load jsMind library:', error);
			// Don't throw - allow plugin to load even if jsMind fails
			// Speed reading will show error when trying to use mind map
		}
	}

	async onunload() {
		Logger.debug('Unloading LLMSider plugin...');

		if (this.updateCheckIntervalId) {
			window.clearInterval(this.updateCheckIntervalId);
			this.updateCheckIntervalId = undefined;
		}

		// Stop memory monitoring
		memoryMonitor.stopMonitoring();

		// Stop OpenCode server monitoring
		if (this.opencodeServerManager) {
			try {
				this.opencodeServerManager.stopMonitoring();
				await this.opencodeServerManager.stopServer();
				Logger.debug('OpenCode server monitoring and server stopped');
			} catch (error) {
				Logger.error('Error stopping OpenCode:', error);
			}
		}

		// Cleanup Memory Manager
		if (this.memoryManager) {
			try {
				this.memoryManager.dispose();
				Logger.debug('Memory Manager cleaned up');
			} catch (error) {
				Logger.error('Error cleaning up Memory Manager:', error);
			}
		}

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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(this.githubTokenRefreshService as any).stopAll();
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

		// Shutdown Vector DB Manager and clear references
		if (this.vectorDBManager) {
			try {
				await this.vectorDBManager.shutdown();
				this.vectorDBManager = undefined; // Clear reference to allow GC
				Logger.debug('Vector DB Manager cleaned up');
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

		// Clean up selection toolbar
		if (this.selectionToolbar) {
			this.selectionToolbar.destroy();
			this.selectionToolbar = undefined;
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


		// Clear providers
		this.providers.clear();

		Logger.debug('LLMSider plugin unloaded');
	}

	private scheduleUpdateChecks(): void {
		if (!this.settings.updateSettings?.notifyUpdates) {
			return;
		}

		const oneDayMs = 24 * 60 * 60 * 1000;
		this.checkForUpdatesIfNeeded(true).catch(error => {
			Logger.debug('[UpdateCheck] Initial check failed:', error);
		});

		this.updateCheckIntervalId = window.setInterval(() => {
			this.checkForUpdatesIfNeeded(false).catch(error => {
				Logger.debug('[UpdateCheck] Scheduled check failed:', error);
			});
		}, oneDayMs);
	}

	private async checkForUpdatesIfNeeded(force: boolean): Promise<void> {
		if (!this.settings.updateSettings?.notifyUpdates) {
			return;
		}

		const oneDayMs = 24 * 60 * 60 * 1000;
		const now = Date.now();
		const lastChecked = this.settings.updateSettings.lastCheckedAt || 0;

		if (!force && now - lastChecked < oneDayMs) {
			return;
		}

		await this.checkForUpdates();
		this.settings.updateSettings.lastCheckedAt = now;
		await this.saveSettings();
	}

	private async checkForUpdates(): Promise<void> {
		const result = await this.checkForUpdatesWithResult();
		await this.promptForUpdateIfAvailable(result, false);
	}

	/**
	 * Check for updates and return the result (for settings UI)
	 */
	async checkForUpdatesWithResult(): Promise<UpdateCheckResult> {
		const currentVersion = this.normalizeVersion(this.manifest?.version || '0.0.0');
		try {
			const response = await requestUrl({
				url: 'https://api.github.com/repos/gnuhpc/obsidian-llmsider/releases/latest',
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json'
				}
			});
			const latestTag = response?.json?.tag_name || response?.json?.name;
			if (!latestTag) {
				return { hasUpdate: false, latestVersion: currentVersion, currentVersion };
			}

			const latestVersion = this.normalizeVersion(latestTag);
			const hasUpdate = this.isNewerVersion(latestVersion, currentVersion);
			const releaseUrl = response?.json?.html_url || `https://github.com/gnuhpc/obsidian-llmsider/releases/tag/${latestTag}`;
			const changelog = typeof response?.json?.body === 'string' ? response.json.body : undefined;
			return {
				hasUpdate,
				latestVersion,
				currentVersion,
				releaseTag: latestTag,
				releaseUrl,
				changelog
			};
		} catch (error) {
			Logger.debug('[UpdateCheck] Failed to check releases:', error);
			return { hasUpdate: false, latestVersion: currentVersion, currentVersion, error: String(error) };
		}
	}

	async promptForUpdateIfAvailable(result: UpdateCheckResult, forcePrompt: boolean): Promise<boolean> {
		if (!result.hasUpdate) {
			return false;
		}

		const shouldPrompt = forcePrompt
			|| this.settings.updateSettings.lastNotifiedVersion !== result.latestVersion;

		if (!shouldPrompt) {
			return false;
		}

		this.settings.updateSettings.lastNotifiedVersion = result.latestVersion;
		await this.saveSettings();

		const updateInfo: UpdateInfo = {
			currentVersion: result.currentVersion,
			latestVersion: result.latestVersion,
			releaseUrl: result.releaseUrl || 'https://github.com/gnuhpc/obsidian-llmsider/releases',
			changelog: result.changelog
		};

		const modal = new UpdateConfirmModal(this.app, this.i18n, updateInfo, async () => {
			await this.performUpdate(result.latestVersion, result.releaseTag);
		});
		modal.open();
		return true;
	}

	private normalizeVersion(version: string): string {
		return version.replace(/^v/i, '').split('-')[0].trim();
	}

	private isNewerVersion(latest: string, current: string): boolean {
		const latestParts = latest.split('.').map((part) => parseInt(part, 10) || 0);
		const currentParts = current.split('.').map((part) => parseInt(part, 10) || 0);
		const length = Math.max(latestParts.length, currentParts.length);
		for (let i = 0; i < length; i += 1) {
			const latestValue = latestParts[i] ?? 0;
			const currentValue = currentParts[i] ?? 0;
			if (latestValue > currentValue) return true;
			if (latestValue < currentValue) return false;
		}
		return false;
	}

	async downloadAndInstallUpdate(version: string, releaseTag?: string): Promise<void> {
		const pluginId = this.manifest?.id || 'llmsider';
		const pluginDir = this.manifest?.dir || (this.app.vault.configDir + '/plugins/' + pluginId);
		const downloadTag = releaseTag || version;
		
		const downloadUrl = `https://github.com/gnuhpc/obsidian-llmsider/releases/download/${downloadTag}`;
		const filesToDownload = ['main.js', 'manifest.json', 'styles.css'];
		
		Logger.info(`[Update] Downloading version ${downloadTag}`);

		try {
			if (!await this.app.vault.adapter.exists(pluginDir)) {
				await this.app.vault.adapter.mkdir(pluginDir);
				Logger.debug(`[Update] Created plugin directory: ${pluginDir}`);
			}
		} catch (error) {
			Logger.error('[Update] Failed to create plugin directory:', error);
			throw new Error(`Failed to create plugin directory: ${error}`);
		}
		
		for (const filename of filesToDownload) {
			try {
				const url = `${downloadUrl}/${filename}`;
				Logger.debug(`[Update] Downloading ${filename} from ${url}`);
				
				const response = await requestUrl({
					url,
					method: 'GET'
				});
				
				if (response.status !== 200) {
					throw new Error(`Failed to download ${filename}: HTTP ${response.status}`);
				}
				
				const content = filename === 'manifest.json' 
					? JSON.stringify(response.json, null, 2)
					: (typeof response.text === 'string' ? response.text : new TextDecoder().decode(response.arrayBuffer));
				
				const filepath = `${pluginDir}/${filename}`;
				await this.app.vault.adapter.write(filepath, content);
				
				Logger.debug(`[Update] Successfully downloaded and saved ${filename}`);
			} catch (error) {
				Logger.error(`[Update] Failed to download ${filename}:`, error);
				throw new Error(`Failed to download ${filename}: ${error}`);
			}
		}
		
		Logger.info(`[Update] Successfully downloaded all files for version ${downloadTag}`);
		new Notice(this.i18n.t('ui.updateDownloaded'));
	}

	async reloadPlugin(): Promise<void> {
		const pluginId = this.manifest?.id || 'llmsider';
		
		try {
			Logger.info('[Update] Reloading plugin...');
			
			await (this.app as any).plugins.disablePlugin(pluginId);
			await new Promise(resolve => setTimeout(resolve, 500));
			await (this.app as any).plugins.enablePlugin(pluginId);
			
			Logger.info('[Update] Plugin reloaded successfully');
			new Notice(this.i18n.t('ui.updateCompleted'));
		} catch (error) {
			Logger.error('[Update] Failed to reload plugin:', error);
			new Notice(this.i18n.t('ui.reloadFailed'));
			throw error;
		}
	}

	async performUpdate(version: string, releaseTag?: string): Promise<void> {
		try {
			await this.downloadAndInstallUpdate(version, releaseTag);
			
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			await this.reloadPlugin();
		} catch (error) {
			Logger.error('[Update] Update failed:', error);
			throw error;
		}
	}

	async loadSettings() {
		// Load settings structure from SQLite database
		this.settings = Object.assign({}, DEFAULT_SETTINGS);

		try {
			// Load new architecture: connections and models
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.settings.connections = await this.configDb.getConnections() as any;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.settings.models = await this.configDb.getModels() as any;
			this.settings.activeConnectionId = await this.configDb.getActiveConnectionId() || '';
			this.settings.activeModelId = await this.configDb.getActiveModelId() || '';

			this.settings.activeProvider = await this.configDb.getActiveProvider() || '';
			this.settings.agentMode = await this.configDb.getAgentMode();

			// Load conversation mode settings
			this.settings.defaultConversationMode = await this.configDb.getDefaultConversationMode();
			this.settings.conversationMode = await this.configDb.getConversationMode();
			// Sync legacy agentMode
			this.settings.agentMode = (this.settings.conversationMode === 'agent');
			Logger.debug(`Loaded conversation mode from SQLite: ${this.settings.conversationMode}`);

			// Load advanced settings
			this.settings.enableDebugLogging = await this.configDb.getEnableDebugLogging();
			this.settings.isFirstLaunch = await this.configDb.getIsFirstLaunch();

			// Load chat sessions
			this.settings.chatSessions = await this.configDb.getAllChatSessions();
			this.settings.nextSessionId = await this.configDb.getNextSessionId();

			// Load i18n settings
			this.settings.i18n = await this.configDb.getI18nSettings();

			// Load autocomplete settings
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.settings.autocomplete = await this.configDb.getAutocompleteSettings() as any;

			// Load inline quick chat settings
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.settings.inlineQuickChat = await this.configDb.getInlineQuickChatSettings() as any;

			// Load selection popup settings
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.settings.selectionPopup = await this.configDb.getSelectionPopupSettings() as any;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.settings.contextSettings = await this.configDb.getContextSettings() as any;
			// Load google search settings
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.settings.googleSearch = await this.configDb.getGoogleSearchSettings() as any;

			// Load vector database settings
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.settings.vectorSettings = await this.configDb.getVectorSettings() as any;
			console.log('[LLMSider] vectorSettings.autoSearchEnabled loaded from DB:', this.settings.vectorSettings.autoSearchEnabled);

			// Load Memory settings
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.settings.memorySettings = await this.configDb.getMemorySettings() as any;

			this.settings.updateSettings = {
				notifyUpdates: await this.configDb.getUpdateNotificationsEnabled(),
				lastCheckedAt: await this.configDb.getUpdateLastCheckedAt(),
				lastNotifiedVersion: await this.configDb.getUpdateLastNotifiedVersion()
			};

			// Built-in tool permissions are now managed directly in ConfigDatabase
			// No need to load into settings - queries go directly to database for real-time state
			Logger.debug('[LoadSettings] Tool permissions managed in database (tool_settings table)');

			// Ensure system tools are always enabled
			const systemTools = ['get_timedate'];
			systemTools.forEach(toolName => {
				this.configDb.setBuiltInToolEnabled(toolName, true);
			});

			// Load other settings
			this.settings.showSidebar = await this.configDb.getShowSidebar();
			this.settings.sidebarPosition = await this.configDb.getSidebarPosition();
			this.settings.debugMode = await this.configDb.getDebugMode();
			this.settings.enableDiffRenderingInActionMode = await this.configDb.getEnableDiffRendering();

			// Load tool selection limits
			this.settings.maxBuiltInToolsSelection = await this.configDb.getMaxBuiltInToolsSelection();
			this.settings.maxMCPToolsSelection = await this.configDb.getMaxMCPToolsSelection();

			// Load plan execution mode
			this.settings.planExecutionMode = await this.configDb.getPlanExecutionMode();

			// NOTE: Custom prompts are loaded after i18n initialization
			// See initializeCustomPrompts() call after i18n.initialize() in onload()
			// to ensure built-in prompts have proper translations

			// Load MCP settings (serverPermissions from DB, serversConfig from mcp-config.json)
			this.settings.mcpSettings = {
				serversConfig: await this.configDb.loadMCPConfig(),
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				serverPermissions: await this.configDb.getMCPServerPermissions() as any,
				enableToolSuggestions: await this.configDb.getMCPEnableToolSuggestions(),
				enableResourceBrowsing: await this.configDb.getMCPEnableResourceBrowsing(),
			};

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
		// builtInToolsPermissions removed - now managed in database only
		if (!this.settings.i18n) this.settings.i18n = DEFAULT_SETTINGS.i18n;
		if (typeof this.settings.i18n.initialized === 'undefined') {
			this.settings.i18n.initialized = false;
		}

		// Check if this is first launch
		const isFirstLaunchValue = await this.configDb.getConfigValue('isFirstLaunch');
		this.settings.isFirstLaunch = isFirstLaunchValue === null ? true : (isFirstLaunchValue === 'true');

		// Initialize built-in tools permissions in database on first launch
		if (this.settings.isFirstLaunch) {
			Logger.debug('First launch detected, initializing default tool permissions in database');
			const { getAllBuiltInTools } = require('./tools/built-in-tools');
			const { getDefaultBuiltInToolsPermissions } = require('./tools/built-in-tools-config');
			const allTools = getAllBuiltInTools({ asArray: true });
			const defaultPermissions = getDefaultBuiltInToolsPermissions(allTools);

			// Save default permissions to database (using new tool_settings table)
			let initCount = 0;
			for (const [toolName, enabled] of Object.entries(defaultPermissions)) {
				this.configDb.setBuiltInToolEnabled(toolName, enabled as boolean);
				initCount++;
			}

			Logger.debug(`Default permissions initialized in database: ${initCount} tools`);

			// Mark as no longer first launch
			this.settings.isFirstLaunch = false;
			await this.configDb.setConfigValue('isFirstLaunch', 'false');
		} else {
			Logger.debug('Not first launch - tool permissions already in database');
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
			// Migration 1: Add showSimilarNotes field to existing vectorSettings
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

	/**
	 * Clean up old and corrupted vector data files
	 */
	async cleanupVectorDataFiles() {
		Logger.debug('Cleaning up old vector data files...');

		try {
			const vectorDataPath = `${this.app.vault.configDir}/plugins/obsidian-llmsider/vector-data`;

			// Check if directory exists
			const exists = await this.app.vault.adapter.exists(vectorDataPath);
			if (!exists) {
				Logger.debug('Vector data directory does not exist, skipping cleanup');
				return;
			}

			// List all files in the directory
			const files = await this.app.vault.adapter.list(vectorDataPath);

			let deletedCount = 0;
			for (const file of files.files) {
				const fileName = file.split('/').pop() || '';

				// Delete files with .corrupted or .old-dimension suffix
				if (fileName.includes('.corrupted-') || fileName.includes('.old-dimension-')) {
					try {
						await this.app.vault.adapter.remove(file);
						deletedCount++;
						Logger.debug('Deleted old vector file:', fileName);
					} catch (error) {
						Logger.error('Failed to delete vector file:', fileName, error);
					}
				}
			}

			if (deletedCount > 0) {
				Logger.debug(`Cleaned up ${deletedCount} old vector data file(s)`);
			} else {
				Logger.debug('No old vector data files to clean up');
			}
		} catch (error) {
			Logger.error('Error cleaning up vector data files:', error);
			// Don't throw - cleanup is best effort
		}
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const currentConnections = await this.configDb.getConnections() as any[];
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const currentConnectionIds = new Set(currentConnections.map((c: any) => c.id)); for (const connection of this.settings.connections) {
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const currentModels = await this.configDb.getModels() as any[];
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const currentModelIds = new Set(currentModels.map((m: any) => m.id)); for (const model of this.settings.models) {
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

				// Save conversation mode settings
				await this.configDb.setConversationMode(this.settings.conversationMode);
				await this.configDb.setDefaultConversationMode(this.settings.defaultConversationMode);

				// Save advanced settings
				await this.configDb.setEnableDebugLogging(this.settings.enableDebugLogging);
				await this.configDb.setIsFirstLaunch(this.settings.isFirstLaunch);

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

				await this.configDb.setNextSessionId(this.settings.nextSessionId);				// Save i18n settings
				await this.configDb.setI18nSettings(this.settings.i18n);

				// Save autocomplete settings
				await this.configDb.setAutocompleteSettings(this.settings.autocomplete);

				// Save inline quick chat settings
				await this.configDb.setInlineQuickChatSettings(this.settings.inlineQuickChat);

				// Save selection popup settings
				await this.configDb.setSelectionPopupSettings(this.settings.selectionPopup);

				await this.configDb.setContextSettings(this.settings.contextSettings);

				// Save google search settings
				await this.configDb.setGoogleSearchSettings(this.settings.googleSearch);

				// Save vector database settings
				await this.configDb.setVectorSettings(this.settings.vectorSettings);

				// Save Memory settings
				await this.configDb.setMemorySettings(this.settings.memorySettings);

				// Built-in tool permissions are saved directly to database via ConfigDB methods
				// No need to save from settings - they're managed in tool_settings table

			// Save other settings
			await this.configDb.setShowSidebar(this.settings.showSidebar);
			await this.configDb.setSidebarPosition(this.settings.sidebarPosition);
			await this.configDb.setDebugMode(this.settings.debugMode);
			await this.configDb.setEnableDiffRendering(this.settings.enableDiffRenderingInActionMode);
			await this.configDb.setUpdateNotificationsEnabled(this.settings.updateSettings.notifyUpdates);
			await this.configDb.setUpdateLastCheckedAt(this.settings.updateSettings.lastCheckedAt);
			await this.configDb.setUpdateLastNotifiedVersion(this.settings.updateSettings.lastNotifiedVersion);

				// Save tool selection limits
				await this.configDb.setMaxBuiltInToolsSelection(this.settings.maxBuiltInToolsSelection);
				await this.configDb.setMaxMCPToolsSelection(this.settings.maxMCPToolsSelection);

				// Save MCP settings (serverPermissions to DB, serversConfig stays in mcp-config.json)
				await this.configDb.setMCPServerPermissions(this.settings.mcpSettings.serverPermissions);
				await this.configDb.setMCPEnableToolSuggestions(this.settings.mcpSettings.enableToolSuggestions);
				await this.configDb.setMCPEnableResourceBrowsing(this.settings.mcpSettings.enableResourceBrowsing);

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

			// Tool manager uses ConfigDatabase directly, no need to update settings
			// Permissions are queried in real-time from database

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
	 * Save vector settings only without triggering provider reinitialization
	 * Used for lightweight UI state changes like toggling auto-search
	 */
	async saveVectorSettingsOnly(): Promise<void> {
		try {
			Logger.debug('[SaveVectorSettings] Saving vectorSettings.autoSearchEnabled:', this.settings.vectorSettings.autoSearchEnabled);
			await this.configDb.setVectorSettings(this.settings.vectorSettings);
			Logger.debug('[SaveVectorSettings] Vector settings saved successfully');
		} catch (error) {
			Logger.error('Failed to save vector settings:', error);
			throw error;
		}
	}

	/**
	 * Initialize custom prompts with built-in prompts if none exist
	 */
	private async initializeCustomPrompts(): Promise<void> {
		// Load all prompts from database (now that i18n is ready)
		this.settings.customPrompts = await this.configDb.getAllPrompts();
		Logger.debug(`Loaded ${this.settings.customPrompts.length} prompts from database`);

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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.githubTokenRefreshService as any).setOnTokenRefreshed(async (
				connectionId: string,
				githubToken: string,
				copilotToken: string,
				tokenExpiry: number
			) => {
				Logger.debug(`Token refreshed for connection: ${connectionId}, updating database...`);
				Logger.debug(`New token expiry: ${new Date(tokenExpiry).toISOString()}`);

				// Find and update connection in database
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const connections = await this.configDb.getConnections() as any[];
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const connection = connections.find((c: any) => c.id === connectionId);

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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const connections = await this.configDb.getConnections() as any[];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const copilotConnections = connections.filter((c: any) => c.type === 'github-copilot' && c.enabled);

			Logger.debug(`Found ${copilotConnections.length} enabled GitHub Copilot connection(s)`);

			for (const connection of copilotConnections) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(this.githubTokenRefreshService as any).startMonitoring(connection);
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async startGitHubTokenMonitoring(connection: any) {
		if (!this.githubTokenRefreshService || connection.type !== 'github-copilot') {
			return;
		}

		if (connection.enabled) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.githubTokenRefreshService as any).startMonitoring(connection);
			Logger.debug(`Started token monitoring for: ${connection.name}`);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.githubTokenRefreshService as any).stopMonitoring(connection.id);
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this.githubTokenRefreshService as any).stopMonitoring(connectionId);
		Logger.debug(`Stopped token monitoring for connection: ${connectionId}`);
	}

	private async initializeMCPManager() {
		try {
			Logger.debug('Initializing MCP Manager...');

			// Create MCP Manager instance
			this.mcpManager = new MCPManager(this.configDb, this.i18n, this.settings.debugMode);

			// Initialize the manager
			await this.mcpManager.initialize();

			// Initialize built-in tools with App instance, settings getter, and plugin instance
			setApp(this.app, () => this.settings, this);

			// Load Mastra built-in tools
			await initializeBuiltInTools();
			Logger.debug('Built-in tools initialized');

			// Create unified tool manager with MCP manager and ConfigDatabase
			Logger.debug('[InitMCP] Creating UnifiedToolManager with ConfigDatabase');
			this.toolManager = new UnifiedToolManager(this.mcpManager, this.configDb);

			// Set global tool executor for built-in tools (like for_each)
			const { setToolExecutor } = await import('./tools/built-in-tools');
			setToolExecutor(async (name, args) => {
				const result = await this.toolManager.executeTool(name, args);
				if (!result.success) {
					throw new Error(result.error || 'Tool execution failed');
				}
				return result.result;
			});

			// Load saved permissions
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
				new Notice(this.i18n.t('notifications.mcp.serverError', { serverId, error: error.message }));
			}); this.mcpManager.on('tools-updated', (tools) => {
				Logger.debug(`MCP Tools updated: ${tools.length} tools available`);
			});

			// Auto-connect servers based on autoConnect setting
			setTimeout(() => {
				Logger.debug('Auto-connecting MCP servers based on autoConnect setting...');
				this.mcpManager.connectAutoConnectServers().catch(error => {
					Logger.error('Failed to auto-connect MCP servers:', error);
				});
			}, 2000); // Delay to ensure plugin is fully loaded

			Logger.debug('MCP Manager initialized successfully');
		} catch (error) {
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

			// Update UI to reflect vector DB initialization in all open chat views
			// Do this BEFORE similar notes initialization to ensure it happens even if similar notes fails
			try {
				const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
				leaves.forEach(leaf => {
					const chatView = leaf.view as any;
					if (chatView && chatView.uiBuilder && typeof chatView.uiBuilder.updateContextSearchButtonPublic === 'function') {
						chatView.uiBuilder.updateContextSearchButtonPublic();
					}
				});
			} catch (error) {
				Logger.error('Failed to update context search button:', error);
			}

			// Initialize similar notes manager if enabled
			if (this.settings.vectorSettings.showSimilarNotes && this.vectorDBManager) {
				try {
					Logger.debug('Initializing similar notes view manager...');

					const { SimilarNotesViewManager } = await import('./ui/similar-notes-manager');
					this.similarNotesManager = new SimilarNotesViewManager(
						this,
						this.app.workspace
					);

				// Removed: Auto-trigger for currently open file to prevent startup vector generation
				// const activeFile = this.app.workspace.getActiveFile();
				// if (activeFile) {
				// 	Logger.debug('Triggering similar notes for currently open file:', activeFile.path);
				// 	this.similarNotesManager.onFileOpen(activeFile);
				// }

					Logger.debug('Similar notes view manager initialized (auto-trigger disabled to prevent startup vector generation)');
				} catch (error) {
					Logger.error('Failed to initialize similar notes manager:', error);
					// Don't throw - similar notes is optional
				}
			}

			// Show subtle notice that vector DB is ready
			new Notice(this.i18n.t('notifications.vectorDatabase.loaded'), 2000);
		} catch (error) {
			Logger.error('Failed to initialize vector database:', error);
			new Notice(this.i18n.t('notifications.vectorDatabase.initFailed'));
			// Don't throw error - vector DB is optional functionality
		}
	}

	private async initializeSpeedReadingManager(): Promise<void> {
		if (this.speedReadingManager) {
			return;
		}
		try {
			const { SpeedReadingManager } = await import('./features/speed-reading');
			this.speedReadingManager = new SpeedReadingManager(this);
			Logger.debug('Speed Reading Manager initialized');
		} catch (error) {
			Logger.error('Failed to initialize speed reading manager:', error);
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
			name: 'Add Selected Text to Context',
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
			editorCallback: (editor, view) => {
				if (this.inlineQuickChatHandler && this.settings.inlineQuickChat.enabled) {
					// Get the CodeMirror 6 editor view
					const editorView = this.getEditorViewFromMarkdownView(view as any);
					if (editorView) {
						this.inlineQuickChatHandler.show(editorView);
					} else {
						new Notice(this.i18n.t('commands.unableToAccessEditor'));
					}
				} else {
					new Notice(this.i18n.t('commands.quickChatDisabled'));
				}
			},
			hotkeys: [
				{
					modifiers: this.settings.inlineQuickChat.triggerKey.split('+').slice(0, -1) as any,
					key: this.settings.inlineQuickChat.triggerKey.split('+').pop() || '/'
				}
			]
		});
	}

	public getEditorViewFromMarkdownView(view: any): any | null {
		const editor = view?.editor;
		const candidates = [
			editor?.cm,
			editor?.cm6,
			editor?.view,
			editor?.cm?.view,
			editor?.cm?.editorView
		];
		for (const candidate of candidates) {
			if (candidate && typeof candidate.dispatch === 'function' && candidate.state) {
				return candidate;
			}
		}
		return null;
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
					new Notice(this.i18n.t('notifications.context.addedToContext', { preview: result.context?.preview || 'Added' }));

					// Update context display in chat view
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					if ((chatView as any).updateContextDisplay) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
					new Notice(this.i18n.t('notifications.context.addedToContext', { preview: result.context?.preview || 'Added' }));

					// Update context display in chat view
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					if ((chatView as any).updateContextDisplay) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(chatView as any).updateContextDisplay();
					}					// Optionally activate the chat view
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
		new Notice(this.i18n.t('notifications.provider.modeSwitchingReplaced'));
	}

	async switchProvider(providerId: string) {
		if (!this.providers.has(providerId)) {
			// Parse providerId to get connection and model
			const [connectionId, modelId] = providerId.split('::');
			const connection = this.settings.connections.find(c => c.id === connectionId);
			const model = this.settings.models.find(m => m.id === modelId);
			const displayName = connection && model ? `${connection.name} - ${model.name}` : providerId;
			new Notice(this.i18n.t('notifications.provider.notAvailable', { displayName }));
			return;
		}

		this.settings.activeProvider = providerId;
		await this.saveSettings();

		// Parse providerId to get connection and model for display name
		const [connectionId, modelId] = providerId.split('::');
		const connection = this.settings.connections.find(c => c.id === connectionId);
		const model = this.settings.models.find(m => m.id === modelId);
		const displayName = connection && model ? `${connection.name} - ${model.name}` : providerId;
		new Notice(this.i18n.t('notifications.provider.switchedTo', { displayName }));

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

	/**
	 * Get provider for a specific model ID
	 */
	getProviderByModelId(modelId: string): BaseLLMProvider | null {
		const model = this.settings.models.find(m => m.id === modelId && m.enabled);
		if (!model) {
			return null;
		}

		const { ProviderFactory } = require('./utils/provider-factory');
		const providerId = ProviderFactory.generateProviderId(
			model.connectionId,
			model.id
		);

		return this.providers.get(providerId) || null;
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
	 * Get configured providers (connection + model) regardless of initialization
	 */
	getConfiguredProvidersWithNames(): Array<{ id: string; name: string; connectionId?: string; modelId?: string }> {
		const { ProviderFactory } = require('./utils/provider-factory');
		const providers: Array<{ id: string; name: string; connectionId?: string; modelId?: string }> = [];

		const combinations = ProviderFactory.getValidProviderCombinations(
			this.settings.connections,
			this.settings.models
		);

		for (const { connection, model } of combinations) {
			providers.push({
				id: ProviderFactory.generateProviderId(connection.id, model.id),
				name: ProviderFactory.getProviderDisplayName(connection, model),
				connectionId: connection.id,
				modelId: model.id
			});
		}

		return providers;
	}

	hasConfiguredProviders(): boolean {
		return this.getConfiguredProvidersWithNames().length > 0;
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

			// Debug log the connection object
			Logger.debug(`Fetching models for connection:`, {
				id: connection.id,
				name: connection.name,
				type: connection.type,
				hasApiKey: !!connection.apiKey,
				hasBaseUrl: !!connection.baseUrl
			});

			// For embedding-only connections, return empty list as they don't support chat models
			if (connection.type === 'local') {
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
		Logger.debug('[Main] setActiveConnectionAndModel called:', { connectionId, modelId });

		this.settings.activeConnectionId = connectionId;
		this.settings.activeModelId = modelId;

		// Update legacy activeProvider for compatibility
		const { ProviderFactory } = require('./utils/provider-factory');
		const providerId = ProviderFactory.generateProviderId(connectionId, modelId);
		this.settings.activeProvider = providerId;

		Logger.debug('[Main] Generated provider ID:', providerId);

		// Ensure provider is initialized for this combination
		if (!this.providers.has(providerId)) {
			Logger.debug('[Main] Provider not found in cache, initializing...');
			const connection = this.settings.connections.find(c => c.id === connectionId);
			const model = this.settings.models.find(m => m.id === modelId);

			Logger.debug('[Main] Found connection:', !!connection, 'Found model:', !!model);
			if (model) {
				Logger.debug('[Main] Model details:', {
					id: model.id,
					name: model.name,
					modelName: model.modelName,
					enabled: model.enabled,
					connectionId: model.connectionId
				});
			}

			if (connection && model) {
				try {
					const { provider } = ProviderFactory.createProviderWithId(
						connection,
						model,
						this.toolManager
					);
					this.providers.set(providerId, provider);
					Logger.debug(`[Main] Successfully initialized provider: ${providerId}`);
				} catch (error) {
					Logger.error(`[Main] Failed to initialize provider ${providerId}:`, error);
					throw new Error(`Failed to initialize provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
				}
			} else {
				throw new Error('Connection or model not found');
			}
		}

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
			mode: 'ask', // Default mode for compatibility
			conversationMode: this.settings.conversationMode // Save current conversation mode
		};

		this.settings.chatSessions.unshift(session);

		// Directly create in database instead of saving all settings
		await this.configDb.createChatSession(session);
		// Only update nextSessionId in config
		await this.configDb.setNextSessionId(this.settings.nextSessionId);
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
			// Directly update database instead of saving all settings
			await this.configDb.updateChatSession(this.settings.chatSessions[sessionIndex]);
		}
	}

	async deleteChatSession(sessionId: string): Promise<void> {
		this.settings.chatSessions = this.settings.chatSessions.filter(s => s.id !== sessionId);
		// Directly delete from database instead of saving all settings
		await this.configDb.deleteChatSession(sessionId);
	}

	getChatSession(sessionId: string): ChatSession | null {
		return this.settings.chatSessions.find(s => s.id === sessionId) || null;
	}

	// Debug and logging methods
	debug(message: string, ...args: unknown[]) {
		if (this.settings.debugMode) {
			Logger.debug(`${message}`, ...args);
		}
	}

	logError(error: unknown, context?: string) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const err = error as any;
		const errorMessage = context ? `${context}: ${err.message || error}` : err.message || error;
		Logger.error(`${errorMessage}`, error);

		this.state.lastError = {
			code: err.code || 'UNKNOWN_ERROR',
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
			new Notice(this.i18n.t('notifications.vectorDatabase.initFailed'));
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
			new Notice(this.i18n.t('notifications.vectorDatabase.initFailed'));
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
			new Notice(this.i18n.t('notifications.vectorDatabase.notInitialized'));
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
		container.createEl('h2', { text: this.i18n.t('ui.vectorDatabaseStatus') });

		const statusDiv = container.createDiv({ cls: 'vector-status' });
		statusDiv.style.whiteSpace = 'pre-line';
		statusDiv.textContent = message;

		const closeBtn = container.createEl('button', { text: this.i18n.t('ui.closeButton') });
		closeBtn.onclick = () => modal.remove();

		// Close on background click
		modal.onclick = (e) => {
			if (e.target === modal) modal.remove();
		};
	}

	// MCP Command Methods
	private async connectAllMCPServers(): Promise<void> {
		if (!this.mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotInitialized'));
			return;
		}

		try {
			await this.mcpManager.connectAllServers();
			const connectedServers = this.mcpManager.getConnectedServers();
			new Notice(this.i18n.t('notifications.mcp.connectedToServers', { count: connectedServers.length }));
		} catch (error) {
			Logger.error('Failed to connect to MCP servers:', error);
			new Notice(this.i18n.t('notifications.mcp.connectionFailedCheck'));
		}
	}

	private async disconnectAllMCPServers(): Promise<void> {
		if (!this.mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotInitialized'));
			return;
		}

		try {
			await this.mcpManager.disconnectAllServers();
			new Notice(this.i18n.t('notifications.mcp.disconnectAllSuccess'));
		} catch (error) {
			Logger.error('Failed to disconnect from MCP servers:', error);
			new Notice(this.i18n.t('notifications.mcp.disconnectError'));
		}
	}

	private async listMCPTools(): Promise<void> {
		if (!this.mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotInitialized'));
			return;
		}

		try {
			const tools = await this.mcpManager.listAllTools();

			if (tools.length === 0) {
				new Notice(this.i18n.t('notifications.mcp.noToolsAvailable'));
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

			const closeBtn = container.createEl('button', { text: this.i18n.t('ui.closeButton') });
			closeBtn.onclick = () => modal.remove();

			// Close on background click
			modal.onclick = (e) => {
				if (e.target === modal) modal.remove();
			};

		} catch (error) {
			Logger.error('Failed to list MCP tools:', error);
			new Notice(this.i18n.t('notifications.mcp.listToolsFailed'));
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

	/**
	 * Get or create the memory manager for Mastra agents
	 */
	async getMemoryManager(): Promise<import('./core/agent/memory-manager').MemoryManager> {
		if (!this.memoryManager) {
			Logger.debug('[Plugin] 🚀 Initializing memory manager (first time)...');

			const { MemoryManager } = await import('./core/agent/memory-manager');

			const config = {
				enableWorkingMemory: this.settings.memorySettings.enableWorkingMemory,
				workingMemoryScope: this.settings.memorySettings.workingMemoryScope,
				enableConversationHistory: this.settings.memorySettings.enableConversationHistory,
				conversationHistoryLimit: this.settings.memorySettings.conversationHistoryLimit || 10,
				enableSemanticRecall: this.settings.memorySettings.enableSemanticRecall,
				semanticRecallLimit: this.settings.memorySettings.semanticRecallLimit || 5,
				semanticRecallScope: 'resource' as const, // Search across all conversations
			}; Logger.debug('[Plugin] Memory manager config:', config);

			this.memoryManager = new MemoryManager(this, config);
			await this.memoryManager.initialize();

			Logger.debug('[Plugin] ✅ Memory manager initialized and ready');
		} else {
			Logger.debug('[Plugin] ✅ Returning existing memory manager instance');
		}
		return this.memoryManager;
	}

	/**
	 * Get resource ID for memory scoping
	 * This identifies the current vault/user for memory persistence
	 */
	getResourceId(): string {
		const { generateResourceId } = require('./core/agent/memory-manager');
		const resourceId = generateResourceId(this);
		Logger.debug('[Plugin] Resource ID generated:', resourceId);
		return resourceId;
	}

	// Public method to check if a tool should auto-execute
	shouldToolAutoExecute(toolName: string): boolean {
		// Check tool-specific setting
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

	// Public method to access Speed Reading Manager
	getSpeedReadingManager(): import('./features/speed-reading').SpeedReadingManager | null {
		return this.speedReadingManager || null;
	}

	/**
	 * Initialize memory monitoring system
	 */
	private async initializeMemoryMonitoring(): Promise<void> {
		try {
			// Register cleanup callbacks		// 1. Clear conversation caches
			if (this.memoryManager) {
				memoryMonitor.registerCleanup(async () => {
					// Removed debug log to reduce noise
					this.memoryManager?.clearCache();
				});
			}

			// 2. Clean up old logs
			memoryMonitor.registerCleanup(async () => {
				// Removed debug log to reduce noise
				const { ConversationLogger } = await import('./utils/conversation-logger');
				await ConversationLogger.getInstance().cleanupOldLogs(30);
			});

			// 3. Clean up old conversations
			if (this.memoryManager) {
				memoryMonitor.registerCleanup(async () => {
					// Removed debug log to reduce noise
					await this.memoryManager?.cleanupOldConversations(30);
				});
			}

			// 4. Clean up old vector documents
			if (this.vectorDBManager) {
				memoryMonitor.registerCleanup(async () => {
					// Removed debug log to reduce noise
					const oramaManager = this.vectorDBManager?.getOramaManager();
					if (oramaManager) {
						await oramaManager.cleanupOldDocuments(90);
					}
				});
			}

			// 5. Clean up DeepSeek WASM instances
			memoryMonitor.registerCleanup(async () => {
				// Removed debug log to reduce noise
				const { cleanupDeepSeekHash } = await import('./utils/deepseek-hash');
				cleanupDeepSeekHash();
			});

			// Set thresholds based on settings (optional, use defaults for now)
			memoryMonitor.setThresholds({
				warning: 80,  // 80% heap usage
				critical: 90  // 90% heap usage
			});

			// Start monitoring (check every 2 minutes)
			memoryMonitor.startMonitoring(2 * 60 * 1000);

			// Removed info log to reduce noise
		} catch (error) {
			Logger.error('[MemoryMonitoring] Failed to initialize:', error);
		}
	}

	private async initializeOpenCodeMonitoring(): Promise<void> {
		try {
			const hasOpenCodeConnection = this.settings.connections.some(
				c => c.type === 'opencode' && c.enabled
			);

			if (hasOpenCodeConnection) {
				this.opencodeServerManager = new OpenCodeServerManager();
				await this.opencodeServerManager.checkAndNotify();
				await this.opencodeServerManager.startMonitoring();
				Logger.info('[OpenCode] Server monitoring initialized');
			}
		} catch (error) {
			Logger.error('[OpenCode] Failed to initialize monitoring:', error);
		}
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
