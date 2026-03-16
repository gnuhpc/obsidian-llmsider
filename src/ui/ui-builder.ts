import { ChatMode, ConversationMode, CHAT_VIEW_TYPE, LLMConnection, LLMModel, BuiltInTool, MCPTool } from '../types';
import { Logger } from './../utils/logger';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';
import { Modal, Notice, setIcon } from 'obsidian';
import { categoryMap, getCategoryIcon, getCategoryDisplayName } from '../settings';
import { ToolPermissionHandler } from '../settings/handlers/tool-permission-handler';
import { TOOL_CATEGORIES } from '../types/tool-categories';

class SuperpowerEnableNoticeModal extends Modal {
	private resolved = false;
	private dontRemind = false;

	constructor(
		app: any,
		private i18n: I18nManager,
		private onResolve: (result: { confirmed: boolean; dontRemind: boolean }) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass('llmsider-superpower-notice-modal');
		contentEl.empty();

		contentEl.createEl('h3', {
			text: this.i18n.t('ui.superpowerEnableNoticeTitle') || '开启超能力',
		});

		contentEl.createEl('p', {
			text: this.i18n.t('ui.superpowerEnableNoticeBody')
				|| '超能力会根据你的任务自动产生多轮 AI 对话。即使中间出错，AI 也会尝试自行纠正直到最终生成结果。该模式会消耗更多 token。',
		});

		const checkboxRow = contentEl.createDiv({ cls: 'llmsider-setting-item' });
		const checkbox = checkboxRow.createEl('input', { type: 'checkbox' });
		checkbox.style.marginRight = '8px';
		checkbox.onchange = () => {
			this.dontRemind = checkbox.checked;
		};
		checkboxRow.createEl('label', {
			text: this.i18n.t('ui.superpowerEnableNoticeDontRemind') || '下次开启不再提醒',
		});

		const buttonRow = contentEl.createDiv({ cls: 'llmsider-modal-buttons' });
		buttonRow.style.display = 'flex';
		buttonRow.style.justifyContent = 'flex-end';
		buttonRow.style.gap = '8px';
		buttonRow.style.marginTop = '16px';

		const cancelBtn = buttonRow.createEl('button', {
			text: this.i18n.t('ui.superpowerEnableNoticeCancel') || '取消',
		});
		cancelBtn.onclick = () => {
			this.resolve(false);
			this.close();
		};

		const confirmBtn = buttonRow.createEl('button', {
			text: this.i18n.t('ui.superpowerEnableNoticeConfirm') || '继续开启',
		});
		confirmBtn.addClass('mod-cta');
		confirmBtn.onclick = () => {
			this.resolve(true);
			this.close();
		};
	}

	onClose(): void {
		if (!this.resolved) {
			this.resolve(false);
		}
		this.contentEl.empty();
	}

	private resolve(confirmed: boolean): void {
		if (this.resolved) return;
		this.resolved = true;
		this.onResolve({ confirmed, dontRemind: this.dontRemind });
	}
}

export class UIBuilder {
	private plugin: LLMSiderPlugin;
	private containerEl: HTMLElement;
	private i18n: I18nManager;
	private isExecutingCallback: (() => boolean) | null = null;
	private toolPermissionHandler: ToolPermissionHandler;
	private lastRowWrapped = false;
	private lastWrapWidth: number | null = null;
	private applyResponsiveClasses?: () => void;

	constructor(plugin: LLMSiderPlugin, containerEl: HTMLElement, toolPermissionHandler?: ToolPermissionHandler) {
		this.plugin = plugin;
		this.containerEl = containerEl;
		this.i18n = plugin.getI18nManager()!;
		// If handler is provided, use it. Otherwise create a new one with no-op update callback
		this.toolPermissionHandler = toolPermissionHandler || new ToolPermissionHandler(plugin, this.i18n, () => { });

		// Initialize speed reading drawer with container
		// Use a longer timeout to ensure everything is loaded
		setTimeout(() => {
			const speedReadingManager = this.plugin.getSpeedReadingManager();
			Logger.debug('[SpeedReading] UIBuilder constructor - manager exists:', !!speedReadingManager);
			if (speedReadingManager) {
				Logger.debug('[SpeedReading] Initializing drawer with container');
				speedReadingManager.initializeDrawer(containerEl);
			}
		}, 100);
	}

	/**
	 * Set callback to check if execution is in progress
	 */
	public setIsExecutingCallback(callback: () => boolean): void {
		this.isExecutingCallback = callback;
	}

	/**
	 * Check if execution is in progress
	 */
	private isExecuting(): boolean {
		return this.isExecutingCallback?.() || false;
	}

	/**
	 * Build the main chat interface
	 */
	buildChatInterface(): {
		messageContainer: HTMLElement;
		inputContainer: HTMLElement;
		inputElement: HTMLTextAreaElement;
		sendButton: HTMLElement;
		stopButton: HTMLElement;
		providerSelect: HTMLSelectElement;
		contextDisplay: HTMLElement;
		heroContainer: HTMLElement;
	} {
		const container = this.containerEl;
		container.addClass('llmsider-chat-container');
		this.setupResponsiveClasses(container);

		// Header - simpler style like Copilot
		this.buildHeader(container);

		// Messages container
		const messageContainer = container.createDiv({ cls: 'llmsider-messages' });

		// Hero Section (initially hidden, controlled by ChatView)
		const heroContainer = this.buildHeroSection(messageContainer);

		// Input container at bottom
		const inputComponents = this.buildInputContainer(container);

		return {
			messageContainer,
			...inputComponents,
			heroContainer
		};
	}

	/**
	 * Build Hero section for empty state
	 */
	private buildHeroSection(container: HTMLElement): HTMLElement {
		const hero = container.createDiv({ cls: 'llmsider-hero' });

		const iconContainer = hero.createDiv({ cls: 'llmsider-hero-icon' });
		const iconEl = iconContainer.createDiv({ cls: 'llmsider-hero-icon-inner' });
		setIcon(iconEl, 'star');

		hero.createEl('h2', { text: this.i18n.t('ui.heroTitle'), cls: 'llmsider-hero-title' });
		hero.createEl('p', { text: this.i18n.t('ui.heroSubtitle'), cls: 'llmsider-hero-subtitle' });

		return hero;
	}

	private setupResponsiveClasses(container: HTMLElement): void {
		const applyClasses = (width: number) => {
			if (width <= 0) {
				container.toggleClass('llmsider-narrow', false);
				container.toggleClass('llmsider-compact', false);
				container.toggleClass('llmsider-row-wrapped', false);
				this.lastRowWrapped = false;
				this.lastWrapWidth = null;
				return;
			}
			container.toggleClass('llmsider-narrow', width <= 360);
			container.toggleClass('llmsider-compact', width <= 260);

			const leftButtons = container.querySelector('.llmsider-button-row-left') as HTMLElement | null;
			const rightButtons = container.querySelector('.llmsider-button-row-right') as HTMLElement | null;

			if (leftButtons && rightButtons) {
				const leftTop = leftButtons.offsetTop;
				const rightTop = rightButtons.offsetTop;
				const delta = Math.abs(leftTop - rightTop);
				const rowsSplit = delta > 6;
				const unwrapBuffer = 24;
				let shouldWrap = rowsSplit;
				if (rowsSplit) {
					if (this.lastWrapWidth === null || width < this.lastWrapWidth) {
						this.lastWrapWidth = width;
					}
				} else if (this.lastRowWrapped) {
					if (this.lastWrapWidth !== null && width < this.lastWrapWidth + unwrapBuffer) {
						shouldWrap = true;
					} else {
						this.lastWrapWidth = null;
					}
				} else {
					this.lastWrapWidth = null;
				}
				this.lastRowWrapped = shouldWrap;
				container.toggleClass('llmsider-row-wrapped', shouldWrap);
				Logger.debug('[UI] responsive wrap check', {
					width,
					leftTop,
					rightTop,
					delta,
					rowsSplit,
					lastWrapWidth: this.lastWrapWidth,
					unwrapBuffer,
					shouldWrap
				});
			}
		};

		applyClasses(container.clientWidth);
		this.applyResponsiveClasses = () => applyClasses(container.clientWidth);

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			const width = entry?.contentRect?.width ?? container.clientWidth;
			applyClasses(width);
		});

		observer.observe(container);
		(container as any)._llmsiderResizeObserver = observer;

		requestAnimationFrame(() => {
			applyClasses(container.clientWidth);
		});

		setTimeout(() => {
			applyClasses(container.clientWidth);
		}, 300);

		setTimeout(() => {
			applyClasses(container.clientWidth);
		}, 1000);
	}

	/**
	 * Build header with title and action buttons
	 */
	private buildHeader(container: HTMLElement): void {
		const header = container.createDiv({ cls: 'llmsider-header' });

		// Editable session name title
		const titleSection = header.createDiv({ cls: 'llmsider-title-section' });
		const sessionNameEl = titleSection.createEl('h3', {
			text: 'Chat',
			cls: 'llmsider-title llmsider-session-name',
			attr: {
				'contenteditable': 'true',
				'spellcheck': 'false',
				'title': 'Click to edit session name'
			}
		});

		// Handle session name editing
		sessionNameEl.addEventListener('blur', () => {
			const newName = sessionNameEl.textContent?.trim() || 'Chat';
			this.handleSessionNameChange(newName);
		});

		sessionNameEl.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				sessionNameEl.blur();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				// Restore original name
				this.updateSessionNameDisplay();
				sessionNameEl.blur();
			}
		});

		// Action buttons container (no longer includes mode toggle)
		const actionsContainer = header.createDiv({ cls: 'llmsider-header-actions' });

		// Clear chat button (before new chat)
		const clearChatBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-header-btn',
			title: this.i18n.t('ui.clearChat')
		});
		clearChatBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="3 6 5 6 21 6"></polyline>
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
		</svg>`;
		clearChatBtn.onclick = () => this.handleClearChat();

		// New chat button
		const newChatBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-header-btn',
			title: this.i18n.t('ui.newChat')
		});
		newChatBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="12" y1="5" x2="12" y2="19"></line>
			<line x1="5" y1="12" x2="19" y2="12"></line>
		</svg>`;
		newChatBtn.onclick = () => this.handleNewChat();

		// History button
		const historyBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-header-btn',
			title: this.i18n.t('ui.chatHistory')
		});
		historyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="12" cy="12" r="10"></circle>
		<polyline points="12 6 12 12 16 14"></polyline>
	</svg>`;
		historyBtn.onclick = () => {
			Logger.debug('📜 History button clicked');
			this.handleShowHistory();
		};	// Settings button
		const settingsBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-header-btn',
			title: this.i18n.t('ui.openSettings')
		});
		settingsBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<line x1="4" y1="21" x2="4" y2="14"></line>
		<line x1="4" y1="10" x2="4" y2="3"></line>
		<line x1="12" y1="21" x2="12" y2="12"></line>
		<line x1="12" y1="8" x2="12" y2="3"></line>
		<line x1="20" y1="21" x2="20" y2="16"></line>
		<line x1="20" y1="12" x2="20" y2="3"></line>
		<line x1="1" y1="14" x2="7" y2="14"></line>
		<line x1="9" y1="8" x2="15" y2="8"></line>
		<line x1="17" y1="16" x2="23" y2="16"></line>
	</svg>`;
		settingsBtn.onclick = () => this.handleOpenSettings();

		// ==================================================================================
		// 🔧 DEBUG: Reload Plugin Button (Temporary - for development convenience)
		// ==================================================================================
		// TODO: Remove this button before production release
		// This button is added to help developers quickly reload the plugin during debugging
		// without manually disabling and re-enabling it in the Community Plugins settings
		// ==================================================================================
		const reloadBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-header-btn',
			title: '🔧 DEBUG: Reload Plugin (Temporary)'
		});
		reloadBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<polyline points="23 4 23 10 17 10"></polyline>
		<polyline points="1 20 1 14 7 14"></polyline>
		<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
	</svg>`;
		reloadBtn.onclick = () => this.handleReloadPlugin();
		// ==================================================================================
		// End of DEBUG section
		// ==================================================================================
	}

	/**
	 * Build Agent mode toggle button
	 */
	private buildModeToggle(container: HTMLElement): HTMLElement {
		// Agent mode toggle button (same style as other header buttons)
		const agentBtn = container.createEl('button', {
			cls: 'llmsider-header-btn llmsider-agent-btn',
			title: this.i18n.t('ui.toggleAgentMode')
		});

		// Set initial state
		this.updateAgentButton(agentBtn);

		// Handle button click
		agentBtn.onclick = async () => {
			await this.handleAgentToggle(!this.plugin.settings.agentMode);
		};

		return agentBtn;
	}

	/**
	 * Build input container with all input elements
	 */
	private buildInputContainer(container: HTMLElement): {
		inputContainer: HTMLElement;
		inputElement: HTMLTextAreaElement;
		sendButton: HTMLElement;
		stopButton: HTMLElement;
		providerSelect: HTMLSelectElement;
		contextDisplay: HTMLElement;
	} {
		const inputContainer = container.createDiv({ cls: 'llmsider-input-container' });

		const contextHintRow = inputContainer.createDiv({ cls: 'llmsider-context-hint-row' });

		// Context display area (above input)
		const contextDisplay = contextHintRow.createDiv({ cls: 'llmsider-context-display' });
		contextDisplay.style.display = 'none'; // Initially hidden


		// Main input wrapper with modern design
		const inputWrapper = inputContainer.createDiv({ cls: 'llmsider-input-wrapper' });

		const resizeHandle = inputWrapper.createDiv({ cls: 'llmsider-input-resize-handle' });

		const optimizeStatus = inputWrapper.createDiv({
			cls: 'llmsider-optimize-status',
			text: this.i18n.t('ui.optimizingPrompt') || 'Optimizing prompt...'
		});
		optimizeStatus.style.display = 'none';

		// Text input area (full width at top)
		const inputElement = inputWrapper.createEl('textarea', {
			cls: 'llmsider-input',
			attr: {
				placeholder: this.i18n.t('chatPlaceholder'),
				rows: '1'
			}
		});

		let isResizing = false;
		let startY = 0;
		let startHeight = 0;
		const minHeight = 60;
		const maxHeight = 500;

		resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
			isResizing = true;
			startY = e.clientY;
			startHeight = inputElement.offsetHeight;
			document.body.style.userSelect = 'none';
			document.body.style.cursor = 'ns-resize';
			e.preventDefault();
			e.stopPropagation();
		});

		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing) return;
			const deltaY = startY - e.clientY;
			const newHeight = Math.min(Math.max(startHeight + deltaY, minHeight), maxHeight);
			inputElement.style.height = `${newHeight}px`;
			inputElement.style.minHeight = `${newHeight}px`;
			inputElement.style.maxHeight = `${newHeight}px`;
		};

		const handleMouseUp = () => {
			if (isResizing) {
				isResizing = false;
				document.body.style.userSelect = '';
				document.body.style.cursor = '';
			}
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		// Button row (below text input)
		const buttonRow = inputWrapper.createDiv({ cls: 'llmsider-button-row' });

		// Left side - Control buttons (📎, agent)
		const leftButtons = buttonRow.createDiv({ cls: 'llmsider-button-row-left' });

		// Attach/Context button
		const attachBtn = leftButtons.createEl('button', {
			cls: 'llmsider-input-btn llmsider-attach-context-btn',
			title: this.i18n.t('ui.attachFile')
		});
		attachBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
		</svg>`;
		attachBtn.onclick = () => this.handleShowContextOptions();

		// Debug: Log Add context button styles
		setTimeout(() => {
			const attachStyles = window.getComputedStyle(attachBtn);
			Logger.debug('[Button Debug] Add context button:', {
				width: attachStyles.width,
				height: attachStyles.height,
				padding: attachStyles.padding,
				border: attachStyles.border,
				boxSizing: attachStyles.boxSizing,
				display: attachStyles.display,
				classes: attachBtn.className
			});
		}, 100);

		// Conversation mode selector (replaces agent toggle)
		const modeSelectorBtn = this.buildModeSelector(leftButtons);

		// Skill selector
		this.buildSkillSelector(leftButtons);

		// Tools management button (next to mode selector)
		const toolsManagerBtn = this.buildToolsManager(leftButtons);

		// MCP Server management button (next to tools manager)
		const mcpManagerBtn = this.buildMCPManager(leftButtons);

		// Local Context Search toggle button
		const contextSearchBtn = this.buildContextSearchToggle(leftButtons);

		// Speed Reading button
		const speedReadingBtn = this.buildSpeedReadingButton(leftButtons);

		// Optimize Prompt button
		const optimizePromptBtn = this.buildOptimizePromptButton(inputWrapper, inputElement);

		// Right side - Provider, Send/Stop buttons
		const rightButtons = buttonRow.createDiv({ cls: 'llmsider-button-row-right' });

		// Provider selector (custom dropdown button instead of native select)
		const providerSelectorContainer = rightButtons.createDiv({ cls: 'llmsider-provider-selector' });
		const providerBtn = providerSelectorContainer.createEl('button', {
			cls: 'llmsider-provider-btn',
			title: this.i18n.t('ui.selectProvider') || 'Select Provider'
		});

		// Create a hidden select element for compatibility with existing code
		const providerSelect = providerSelectorContainer.createEl('select', {
			cls: 'llmsider-model-select-dropdown'
		});
		providerSelect.style.display = 'none'; // Hide the native select

		// Initialize provider button text
		this.updateProviderButton(providerBtn);

		// Handle button click to show dropdown
		providerBtn.onclick = (e) => {
			e.stopPropagation();
			this.showProviderDropdown(providerBtn, providerSelect);
		};

		// Send button
		const sendButton = rightButtons.createEl('button', {
			cls: 'llmsider-send-button',
			title: this.i18n.t('ui.sendMessage')
		});
		sendButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M12 19V5"></path>
			<polyline points="6 11 12 5 18 11"></polyline>
		</svg>`;

		// Stop button (initially hidden)
		const stopButton = rightButtons.createEl('button', {
			cls: 'llmsider-stop-button',
			title: this.i18n.t('ui.stopGenerating')
		});
		stopButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
			<rect x="6" y="6" width="12" height="12" rx="2"></rect>
		</svg>`;
		stopButton.style.display = 'none';

		return {
			inputContainer,
			inputElement,
			sendButton,
			stopButton,
			providerSelect,
			contextDisplay
		};
	}

	/**
	 * Build Tools Manager button
	 */
	private buildToolsManager(container: HTMLElement): HTMLElement {
		const toolsManager = container.createDiv({ cls: 'llmsider-tools-manager' });

		// Tools button with dropdown
		const toolsBtn = toolsManager.createEl('button', {
			cls: 'llmsider-tools-btn',
			title: this.i18n.t('ui.manageTools') || 'Manage Tools'
		});

		// Set initial state - visibility and appearance
		this.updateToolsButton(toolsBtn);

		// Handle button click to show dropdown
		toolsBtn.onclick = (e) => {
			e.stopPropagation();
			this.showToolsDropdown(toolsBtn);
		};

		return toolsManager;
	}

	/**
	 * Build MCP Server Manager button
	 */
	private buildMCPManager(container: HTMLElement): HTMLElement {
		const mcpManager = container.createDiv({ cls: 'llmsider-mcp-manager' });

		// MCP Server button with dropdown
		const mcpBtn = mcpManager.createEl('button', {
			cls: 'llmsider-mcp-btn',
			title: this.i18n.t('ui.manageMCPServers') || 'Manage MCP Servers'
		});

		// Set initial state - visibility and appearance
		this.updateMCPButton(mcpBtn);

		// Handle button click to show dropdown
		mcpBtn.onclick = (e) => {
			e.stopPropagation();
			this.showMCPDropdown(mcpBtn);
		};

		return mcpManager;
	}

	/**
	 * Build Local Context Search toggle button
	 */
	private buildContextSearchToggle(container: HTMLElement): HTMLElement {
		const contextSearchToggle = container.createDiv({ cls: 'llmsider-context-search-toggle' });

		// Context Search toggle button
		const toggleBtn = contextSearchToggle.createEl('button', {
			cls: 'llmsider-context-search-btn',
			title: this.i18n.t('ui.toggleLocalContextSearch') || 'Toggle Local Context Search'
		});

		// Set initial state
		Logger.debug('[ContextSearch] Button initialization - autoSearchEnabled from settings:', this.plugin.settings.vectorSettings.autoSearchEnabled);
		this.updateContextSearchButton(toggleBtn);

		// Handle button click to toggle
		toggleBtn.onclick = async (e) => {
			e.stopPropagation();

			Logger.debug('[ContextSearch] Button clicked, current state:', this.plugin.settings.vectorSettings.autoSearchEnabled);

			// Check if button is actually disabled (not just styled as disabled)
			const vectorDBManager = this.plugin.getVectorDBManager();
			if (!vectorDBManager) {
				new Notice(this.i18n.t('ui.vectorDBNotInitialized') || 'Vector database not initialized');
				return;
			}

			// Check if database is initialized
			if (!vectorDBManager.isSystemInitialized()) {
				new Notice(this.i18n.t('ui.vectorDBNotInitialized') || 'Vector database not initialized');
				return;
			}

			const status = vectorDBManager.getStatus();
			if (status.totalChunks === 0) {
				new Notice(this.i18n.t('ui.noVectorDataAvailable') || 'No vector data available. Please sync or rebuild the index first.');
				return;
			}

			// Toggle auto-search setting
			const newState = !this.plugin.settings.vectorSettings.autoSearchEnabled;
			Logger.debug('[ContextSearch] Toggling state from', this.plugin.settings.vectorSettings.autoSearchEnabled, 'to', newState);
			this.plugin.settings.vectorSettings.autoSearchEnabled = newState;

			// Use lightweight save method to avoid triggering provider reset
			await this.plugin.saveVectorSettingsOnly();
			Logger.debug('[ContextSearch] Settings saved, new state:', this.plugin.settings.vectorSettings.autoSearchEnabled);

			// Update button appearance AFTER save completes
			this.updateContextSearchButton(toggleBtn);

			// Show notice
			new Notice(
				newState
					? this.i18n.t('ui.localContextSearchEnabled') || 'Local context search enabled'
					: this.i18n.t('ui.localContextSearchDisabled') || 'Local context search disabled'
			);
		};

		return contextSearchToggle;
	}

	/**
	 * Build Speed Reading button
	 */
	private buildSpeedReadingButton(container: HTMLElement): HTMLElement {
		// Speed Reading button - use same class as other input buttons
		const speedReadBtn = container.createEl('button', {
			cls: 'llmsider-input-btn',
			title: this.i18n.t('ui.speedReading') || 'Speed Reading'
		});

		// Smart Reading icon - Book with sparkles/intelligence
		const readingIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
			<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
			<path d="M8 7h8"></path>
			<path d="M8 11h8"></path>
			<path d="M2 6l2-2 2 2"></path>
			<path d="M2 12l2-2 2 2"></path>
			<path d="M2 18l2-2 2 2"></path>
		</svg>`;

		speedReadBtn.innerHTML = `${readingIcon}`;

		// Handle button click
		speedReadBtn.onclick = async (e) => {
			e.stopPropagation();

			Logger.debug('[SpeedReading] Button clicked');

			const speedReadingManager = this.plugin.getSpeedReadingManager();
			Logger.debug('[SpeedReading] Manager exists:', !!speedReadingManager);

			if (!speedReadingManager) {
				new Notice(this.i18n.t('ui.speedReadingNotInit'));
				return;
			}

			speedReadingManager.initializeDrawer(this.containerEl);

			Logger.debug('[SpeedReading] Calling processActiveNote');
			await speedReadingManager.processActiveNote();
		};

		// Debug: Log Speed Reading button styles
		setTimeout(() => {
			const speedStyles = window.getComputedStyle(speedReadBtn);
			Logger.debug('[Button Debug] Speed Reading button:', {
				width: speedStyles.width,
				height: speedStyles.height,
				padding: speedStyles.padding,
				border: speedStyles.border,
				boxSizing: speedStyles.boxSizing,
				display: speedStyles.display,
				classes: speedReadBtn.className
			});
		}, 100);

		return speedReadBtn;
	}

	/**
	 * Build Optimize Prompt button
	 */
	private buildOptimizePromptButton(container: HTMLElement, inputElement: HTMLTextAreaElement): HTMLElement {
		// Optimize Prompt button inside the textarea shell
		const optimizePromptBtn = container.createEl('button', {
			cls: 'llmsider-input-btn llmsider-optimize-prompt-btn',
			title: this.i18n.t('ui.optimizePromptTooltip') || 'Optimize Prompt',
			attr: {
				type: 'button'
			}
		});

		// Sparkle/magic wand icon for optimization
		const optimizeIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M12 3l2.5 7.5L22 13l-7.5 2.5L12 23l-2.5-7.5L2 13l7.5-2.5L12 3z"/>
			<path d="M6 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>
		</svg>`;

		optimizePromptBtn.innerHTML = `${optimizeIcon}`;

		// Prevent focus jump on first click inside Obsidian webview.
		optimizePromptBtn.onmousedown = (e) => {
			e.preventDefault();
			e.stopPropagation();
		};

		// Handle button click
		optimizePromptBtn.onclick = async (e) => {
			e.preventDefault();
			e.stopPropagation();

			Logger.debug('[OptimizePrompt] Button clicked');

			inputElement.dispatchEvent(new CustomEvent('llmsider-optimize-prompt'));
		};

		return optimizePromptBtn;
	}

	/**
	 * Update Context Search button appearance
	 */
	private updateContextSearchButton(button?: HTMLElement): void {
		const btn = button || this.containerEl.querySelector('.llmsider-context-search-btn') as HTMLElement;
		if (!btn) {
			Logger.debug('[ContextSearch] updateContextSearchButton: button not found');
			return;
		}

		// Use autoSearchEnabled for button state (not the main enabled setting)
		const autoSearchEnabled = this.plugin.settings.vectorSettings.autoSearchEnabled;

		// Check if vector DB is initialized (loaded)
		const vectorDBManager = this.plugin.getVectorDBManager();
		let isInitialized = false;
		let hasData = false;

		if (vectorDBManager) {
			isInitialized = vectorDBManager.isSystemInitialized();
			if (isInitialized) {
				const status = vectorDBManager.getStatus();
				hasData = status.totalChunks > 0;
			}
		}

		// Database search icon
		const searchIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="11" cy="11" r="8"></circle>
			<path d="m21 21-4.35-4.35"></path>
			<path d="M11 8a3 3 0 0 0-3 3"></path>
		</svg>`;

		// Update button appearance based on state
		if (!isInitialized || !hasData) {
			// Vector DB not ready - show as disabled but don't block clicks
			// (clicks will be handled by onclick check)
			btn.classList.add('disabled');
			btn.classList.remove('enabled');
			btn.style.opacity = '0.3';
			btn.style.cursor = '';  // Use CSS default cursor (pointer)
			btn.style.removeProperty('pointer-events'); // Allow clicks for better UX (notice will show)

			if (!isInitialized) {
				btn.title = this.i18n.t('ui.vectorDBNotInitialized') || 'Vector database not initialized';
			} else {
				btn.title = this.i18n.t('ui.noVectorDataAvailable') || 'No vector data available. Please sync or rebuild the index first.';
			}
		} else if (autoSearchEnabled) {
			// Vector DB loaded with data and auto-search enabled
			btn.classList.add('enabled');
			btn.classList.remove('disabled');
			btn.style.opacity = '';  // Remove inline style to use CSS
			btn.style.cursor = '';   // Remove inline style to use CSS
			btn.style.removeProperty('pointer-events'); // Allow clicks when enabled
			btn.title = this.i18n.t('ui.localContextSearchEnabled') || 'Local context search enabled';
		} else {
			// Vector DB loaded with data but auto-search disabled
			btn.classList.remove('enabled');
			btn.classList.add('disabled');
			btn.style.opacity = '0.5';
			btn.style.cursor = '';  // Remove inline style to use CSS default (pointer)
			btn.style.removeProperty('pointer-events'); // Allow clicks to toggle
			btn.title = this.i18n.t('ui.localContextSearchDisabled') || 'Local context search disabled';
		}

		btn.innerHTML = `<span class="context-search-icon">${searchIcon}</span>`;
	}

	/**
	 * Update MCP button appearance and visibility
	 */
	private updateMCPButton(button?: HTMLElement): void {
		const btn = button || this.containerEl.querySelector('.llmsider-mcp-btn') as HTMLElement;
		if (!btn) return;

		// Get current mode
		const mode = this.plugin.settings.conversationMode;

		// Show in normal/agent modes.
		const shouldShow = mode === 'normal' || mode === 'agent';

		if (shouldShow) {
			btn.style.display = '';
		} else {
			btn.style.display = 'none';
			return;
		}

		// MCP Server icon (server/database icon)
		const mcpIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
			<rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
			<line x1="6" y1="6" x2="6.01" y2="6"></line>
			<line x1="6" y1="18" x2="6.01" y2="18"></line>
		</svg>`;

		btn.innerHTML = `<span class="mcp-icon">${mcpIcon}</span>`;
	}

	/**
	 * Update Tools button appearance and visibility
	 */
	private updateToolsButton(button?: HTMLElement): void {
		const btn = button || this.containerEl.querySelector('.llmsider-tools-btn') as HTMLElement;
		if (!btn) return;

		// Get current mode
		const mode = this.plugin.settings.conversationMode;

		// Show in normal/agent modes.
		const shouldShow = mode === 'normal' || mode === 'agent';

		if (shouldShow) {
			btn.style.display = '';
		} else {
			btn.style.display = 'none';
			return;
		}

		// Tools icon
		const toolsIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
		</svg>`;

		btn.innerHTML = `<span class="tools-icon">${toolsIcon}</span>`;
	}

	/**
	 * Show tools management dropdown
	 */
	private showToolsDropdown(button: HTMLElement): void {
		// Remove existing dropdown if any
		document.querySelectorAll('.llmsider-tools-dropdown').forEach(el => el.remove());

		// Close other menus (mutual exclusion)
		document.querySelectorAll('.llmsider-mode-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-provider-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-mcp-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-context-menu').forEach(el => el.remove());

		// Create dropdown (use same class as MCP dropdown for consistent styling)
		const dropdown = document.body.createDiv({ cls: 'llmsider-mcp-dropdown' });

		// Position dropdown with smart placement
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'fixed';
		dropdown.style.zIndex = '99999';

		// Vertical positioning
		const spaceAbove = buttonRect.top;
		const spaceBelow = window.innerHeight - buttonRect.bottom;
		const dropdownMaxHeight = 450; // Match CSS max-height

		if (spaceAbove >= dropdownMaxHeight || spaceAbove > spaceBelow) {
			dropdown.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`;
			dropdown.style.top = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceAbove - 16)}px`;
		} else {
			dropdown.style.top = `${buttonRect.bottom + 8}px`;
			dropdown.style.bottom = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`;
		}

		// Horizontal positioning
		const dropdownWidth = 340; // Match CSS width
		if (buttonRect.left + dropdownWidth > window.innerWidth) {
			dropdown.style.left = 'auto';
			dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
		} else {
			dropdown.style.left = `${buttonRect.left}px`;
			dropdown.style.right = 'auto';
		}

		// Import built-in tools with localization
		const { getAllBuiltInTools } = require('../tools/built-in-tools');
		const allBuiltInToolsUnfiltered = getAllBuiltInTools({ i18n: this.i18n, asArray: true });

		// Filter out hidden categories (like 'meta' for control flow tools) and system tools
		const HIDDEN_CATEGORIES = ['meta'];
		const HIDDEN_SYSTEM_TOOLS = ['get_timedate', 'get_current_time', 'for_each', 'run_local_command', 'run_local_cmd'];

		const allBuiltInTools = allBuiltInToolsUnfiltered.filter((tool: unknown) => {
			const t = tool as BuiltInTool;
			const category = t.category || 'other';
			const toolId = t.id || t.name;
			return !HIDDEN_CATEGORIES.includes(category) && !HIDDEN_SYSTEM_TOOLS.includes(toolId);
		});

		// Group built-in tools by category
		const toolsByCategory = new Map<string, unknown[]>();
		allBuiltInTools.forEach((tool: unknown) => {
			const category = (tool as BuiltInTool).category || 'other';
			if (!toolsByCategory.has(category)) {
				toolsByCategory.set(category, []);
			}
			toolsByCategory.get(category)!.push(tool);
		});

		// Built-in Tools Section Header
		if (toolsByCategory.size > 0) {
			const categoriesContainer = dropdown.createDiv({ cls: 'llmsider-tools-categories' });

			// Header with title, search input and global toggle
			const headerRow = categoriesContainer.createDiv({ cls: 'llmsider-tools-header-row' });
			const builtInHeader = headerRow.createDiv({ cls: 'llmsider-tools-section-header' });
			builtInHeader.textContent = this.i18n.t('ui.builtInToolsHeader');

			// Search input
			const searchContainer = categoriesContainer.createDiv({ cls: 'llmsider-tools-search-container' });
			const searchInput = searchContainer.createEl('input', {
				type: 'text',
				placeholder: this.i18n.t('ui.searchTools'),
				cls: 'llmsider-tools-search-input'
			});

			// Global toggle for all built-in tools
			const globalToggle = headerRow.createDiv({ cls: 'llmsider-tools-global-toggle' });
			const globalLabel = globalToggle.createDiv({ cls: 'tools-label' });
			globalLabel.textContent = this.i18n.t('ui.allBuiltInTools');

			const globalSwitch = this.createToggleSwitch(
				this.areAllBuiltInToolsEnabled(allBuiltInTools),
				async (enabled) => {
					if (this.isExecuting()) {
						new Notice(this.i18n.t('ui.cannotModifyToolsDuringExecution') || 'Cannot modify tools during execution');
						return false;
					}
					const result = await this.toggleAllBuiltInTools(enabled, allBuiltInTools);
					if (result !== false) {
						dropdown.remove();
						this.showToolsDropdown(button);
					}
					return result;
				}
			);
			globalToggle.appendChild(globalSwitch);

			// Built-in tools permissions
			// const builtInTools = this.plugin.settings.builtInToolsPermissions || {};

			// Container for categories (will be filtered)
			const categoriesListContainer = categoriesContainer.createDiv({ cls: 'llmsider-tools-categories-list' });

			// No results message (hidden by default)
			const noResultsMsg = categoriesContainer.createDiv({ cls: 'llmsider-tools-no-results' });
			noResultsMsg.textContent = this.i18n.t('ui.noMatchingTools');
			noResultsMsg.style.display = 'none';

			// Function to render category cards
			const renderCategoryCards = (filterText: string = '') => {
				categoriesListContainer.empty();
				let hasVisibleTools = false;

				// Sort categories by the order in TOOL_CATEGORIES
				const sortedCategories = Array.from(toolsByCategory.entries()).sort((a, b) => {
					const indexA = TOOL_CATEGORIES.findIndex(cat => cat.key === a[0]);
					const indexB = TOOL_CATEGORIES.findIndex(cat => cat.key === b[0]);

					// If category not in TOOL_CATEGORIES, push to end
					const posA = indexA === -1 ? TOOL_CATEGORIES.length : indexA;
					const posB = indexB === -1 ? TOOL_CATEGORIES.length : indexB;

					return posA - posB;
				});

				sortedCategories.forEach(([category, tools]) => {
					// Filter tools based on search text
					const filteredTools = filterText
						? tools.filter((tool: unknown) =>
							(tool as BuiltInTool).name.toLowerCase().includes(filterText.toLowerCase()) ||
							((tool as BuiltInTool).description && (tool as BuiltInTool).description.toLowerCase().includes(filterText.toLowerCase()))
						)
						: tools;					// Skip category if no matching tools
					if (filteredTools.length === 0) return;
					hasVisibleTools = true;

					const categoryCard = categoriesListContainer.createDiv({ cls: 'llmsider-mcp-server-card' });
					const categoryHeader = categoryCard.createDiv({ cls: 'llmsider-mcp-server-header' });

					// Expand button
					const expandBtn = categoryHeader.createDiv({ cls: 'llmsider-mcp-expand-btn' });
					expandBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="6 4 10 8 6 12"></polyline>
				</svg>`;

					// Category info container
					const categoryInfo = categoryHeader.createDiv({ cls: 'llmsider-mcp-server-info' });

					// Category icon (using wrench icon to match the theme)
					const categoryIcon = categoryInfo.createDiv({ cls: 'llmsider-mcp-status-icon' });
					categoryIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="var(--interactive-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>`;

					// Category name
					const categoryNameContainer = categoryInfo.createDiv({ cls: 'llmsider-mcp-server-name' });
					const displayName = categoryNameContainer.createDiv({ cls: 'mcp-server-display-name' });
					displayName.textContent = this.getCategoryDisplayName(category);				// Tool count badge
					const toolBadge = categoryHeader.createDiv({ cls: 'llmsider-mcp-tool-badge' });
					toolBadge.textContent = `${tools.length}`;

					// Category toggle switch
					const categorySwitch = this.createToggleSwitch(
						this.areAllCategoryToolsEnabled(tools),
						async (enabled) => {
							const result = await this.toggleCategoryTools(category, tools, enabled);
							if (result !== false) {
								dropdown.remove();
								this.showToolsDropdown(button);
							}
							return result;
						}
					);
					categoryHeader.appendChild(categorySwitch);

					// Expanded content with tools list
					const expandedContent = categoryCard.createDiv({ cls: 'llmsider-mcp-expanded-content' });
					expandedContent.style.display = 'none';

					// Tools list
					const toolsList = expandedContent.createDiv({ cls: 'llmsider-mcp-tools-list' });
					filteredTools.forEach((tool: unknown) => {
						const toolItem = toolsList.createDiv({ cls: 'llmsider-mcp-tool-item' });

						// Tool indicator dot
						const toolDot = toolItem.createDiv({ cls: 'tool-dot' });

						// Tool info
						const toolInfo = toolItem.createDiv({ cls: 'tool-info' });
						const toolName = toolInfo.createDiv({ cls: 'tool-name' });
						toolName.textContent = (tool as BuiltInTool).name;

						if ((tool as BuiltInTool).description) {
							const toolDesc = toolInfo.createDiv({ cls: 'tool-description' });
							toolDesc.textContent = (tool as BuiltInTool).description;
						}


						// Tool toggle switch
						const toolId = (tool as BuiltInTool & { id?: string }).id || (tool as BuiltInTool).name;
						const isToolEnabled = this.toolPermissionHandler.isBuiltInToolEnabled(toolId);

						// Add tooltip to show tool status on hover
						const statusTooltip = isToolEnabled
							? this.i18n.t('settingsPage.toolEnabledTooltip')
							: this.i18n.t('settingsPage.toolDisabledTooltip');
						toolItem.setAttribute('title', statusTooltip);

						const toolSwitch = this.createToggleSwitch(
							isToolEnabled,
							async (enabled) => {
								Logger.debug(`[ToolToggle] Toggling ${(tool as BuiltInTool).name} to ${enabled}`);
								const result = await this.toolPermissionHandler.toggleBuiltInTool(toolId, enabled);
								if (result !== false) {
									Logger.debug(`[ToolToggle] Toggle successful, updating UI without closing dropdown`);
									// Update the tooltip and dot color without refreshing dropdown
									const statusText = enabled ? this.i18n.t('ui.toolEnabled') : this.i18n.t('ui.toolDisabled');
									const newTooltip = enabled
										? this.i18n.t('settingsPage.toolEnabledTooltip')
										: this.i18n.t('settingsPage.toolDisabledTooltip');
									toolItem.setAttribute('title', newTooltip);
									toolDot.style.background = enabled ? 'var(--interactive-accent)' : 'var(--text-muted)';

									// Show notice
									Logger.debug(`[ToolToggle] Showing notice: ${(tool as BuiltInTool).name}: ${statusText}`);
									new Notice(`${(tool as BuiltInTool).name}: ${statusText}`, 3000);
								}
								return result;
							}
						);
						toolItem.appendChild(toolSwitch);					// Set initial dot color
						toolDot.style.background = isToolEnabled ? 'var(--interactive-accent)' : 'var(--text-muted)';
					});				// Toggle expansion
					let isExpanded = false;
					const toggleExpansion = () => {
						isExpanded = !isExpanded;
						if (isExpanded) {
							expandedContent.style.display = 'block';
							expandBtn.addClass('expanded');
							categoryCard.addClass('expanded');
						} else {
							expandedContent.style.display = 'none';
							expandBtn.removeClass('expanded');
							categoryCard.removeClass('expanded');
						}
					};

					expandBtn.onclick = (e) => {
						e.stopPropagation();
						toggleExpansion();
					};

					// Make entire header clickable for expansion
					categoryHeader.style.cursor = 'pointer';
					categoryHeader.onclick = (e) => {
						if (!(e.target as HTMLElement).closest('.llmsider-tools-switch-container')) {
							toggleExpansion();
						}
					};
				});

				// Show/hide no results message
				if (hasVisibleTools) {
					noResultsMsg.style.display = 'none';
				} else {
					noResultsMsg.style.display = 'block';
				}
			};

			// Initial render
			renderCategoryCards();

			// Add search input event listener
			searchInput.addEventListener('input', (e) => {
				const filterText = (e.target as HTMLInputElement).value;
				renderCategoryCards(filterText);
			});
		}

		// Show message if no tools
		if (toolsByCategory.size === 0) {
			const emptyNote = dropdown.createDiv({ cls: 'llmsider-tools-empty-note' });
			emptyNote.textContent = this.i18n.t('ui.noBuiltInToolsAvailable');
		}

		// Add to document
		document.body.appendChild(dropdown);

		// Close dropdown when clicking outside
		const closeHandler = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node) && !button.contains(e.target as Node)) {
				dropdown.remove();
				document.removeEventListener('click', closeHandler);
			}
		};
		setTimeout(() => {
			document.addEventListener('click', closeHandler);
		}, 10);
	}

	/**
	 * Show MCP Server management dropdown
	 */
	private showMCPDropdown(button: HTMLElement): void {
		// Remove existing dropdown if any
		document.querySelectorAll('.llmsider-mcp-dropdown').forEach(el => el.remove());

		// Close other menus (mutual exclusion)
		document.querySelectorAll('.llmsider-mode-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-provider-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-tools-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-context-menu').forEach(el => el.remove());

		// Create dropdown
		const dropdown = document.body.createDiv({ cls: 'llmsider-mcp-dropdown' });

		// Position dropdown with smart placement
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'fixed';
		dropdown.style.zIndex = '99999';

		// Vertical positioning
		const spaceAbove = buttonRect.top;
		const spaceBelow = window.innerHeight - buttonRect.bottom;
		const dropdownMaxHeight = 450; // Match CSS max-height

		if (spaceAbove >= dropdownMaxHeight || spaceAbove > spaceBelow) {
			dropdown.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`;
			dropdown.style.top = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceAbove - 16)}px`;
		} else {
			dropdown.style.top = `${buttonRect.bottom + 8}px`;
			dropdown.style.bottom = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`;
		}

		// Horizontal positioning
		const dropdownWidth = 340; // Match CSS width
		if (buttonRect.left + dropdownWidth > window.innerWidth) {
			dropdown.style.left = 'auto';
			dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
		} else {
			dropdown.style.left = `${buttonRect.left}px`;
			dropdown.style.right = 'auto';
		}

		// Get MCP Manager
		const mcpManager = this.plugin.getMCPManager();

		// Get all tools and group by server
		const allMCPTools = mcpManager ? mcpManager.getAllAvailableTools() : [];
		const toolsByServer = new Map<string, MCPTool[]>();
		allMCPTools.forEach((tool: unknown) => {
			const mcpTool = tool as MCPTool;
			if (!toolsByServer.has(mcpTool.server)) {
				toolsByServer.set(mcpTool.server, []);
			}
			toolsByServer.get(mcpTool.server)!.push(mcpTool);
		});

		// Get all configured servers (including disconnected ones)
		const mcpState = mcpManager ? mcpManager.getState() : null;
		const allConfiguredServers = mcpState ? Object.keys(mcpState.serversConfig.mcpServers) : [];

		// Add servers that have no tools (disconnected or disabled)
		allConfiguredServers.forEach(serverId => {
			if (!toolsByServer.has(serverId)) {
				toolsByServer.set(serverId, []);
			}
		});

		// MCP Servers Section
		if (toolsByServer.size > 0) {
			const serversContainer = dropdown.createDiv({ cls: 'llmsider-tools-categories' });

			// Header with title, search input and global toggle
			const headerRow = serversContainer.createDiv({ cls: 'llmsider-tools-header-row' });
			const mcpHeader = headerRow.createDiv({ cls: 'llmsider-tools-section-header' });
			mcpHeader.textContent = this.i18n.t('ui.mcpServersHeader');

			// Search input
			const searchContainer = serversContainer.createDiv({ cls: 'llmsider-tools-search-container' });
			const searchInput = searchContainer.createEl('input', {
				type: 'text',
				placeholder: this.i18n.t('ui.searchTools') || 'Search tools...',
				cls: 'llmsider-tools-search-input'
			});

			// Global toggle for all MCP servers
			const globalServerToggle = headerRow.createDiv({ cls: 'llmsider-tools-global-toggle' });
			const globalServerLabel = globalServerToggle.createDiv({ cls: 'tools-label' });
			globalServerLabel.textContent = this.i18n.t('ui.allMCPServers');

			const globalServerSwitch = this.createToggleSwitch(
				this.areAllMCPServersEnabled(mcpManager!),
				async (enabled) => {
					await this.toggleAllMCPServers(enabled, mcpManager!);
					dropdown.remove();
					this.showMCPDropdown(button);
				}
			);
			globalServerToggle.appendChild(globalServerSwitch);

			// Container for servers (will be filtered)
			const serversListContainer = serversContainer.createDiv({ cls: 'llmsider-tools-categories-list' });

			// No results message (hidden by default)
			const noResultsMsg = serversContainer.createDiv({ cls: 'llmsider-tools-no-results' });
			noResultsMsg.textContent = this.i18n.t('ui.noMatchingTools');
			noResultsMsg.style.display = 'none';

			// Function to render server cards
			const renderServerCards = (filterText: string = '') => {
				serversListContainer.empty();
				let hasVisibleTools = false;

				toolsByServer.forEach((tools, serverId) => {
					// Filter tools based on search text
					const filteredTools = filterText
						? tools.filter((tool: unknown) =>
							(tool as MCPTool).name.toLowerCase().includes(filterText.toLowerCase()) ||
							((tool as MCPTool).description && (tool as MCPTool).description.toLowerCase().includes(filterText.toLowerCase()))
						)
						: tools;

					// Also match server name
					const serverMatches = serverId.toLowerCase().includes(filterText.toLowerCase());

					// Determine which tools to show
					let toolsToShow = filteredTools;
					if (serverMatches && filterText && filteredTools.length === 0) {
						// If server matches but no tools match, show all tools
						toolsToShow = tools;
					}

					// If no tools to show and server doesn't match, skip
					if (toolsToShow.length === 0 && !serverMatches) return;

					hasVisibleTools = true;

					const serverStatus = mcpManager!.getServerStatus(serverId);
					const canExpand = serverStatus === 'connected' && toolsToShow.length > 0;

					// Server card - add connection status class
					const serverCard = serversListContainer.createDiv({ cls: 'llmsider-mcp-server-card' });
					if (serverStatus === 'connected') {
						serverCard.addClass('mcp-server-connected');
					} else {
						serverCard.addClass('mcp-server-disconnected');
					}

					const serverHeader = serverCard.createDiv({ cls: 'llmsider-mcp-server-header' });

					// Expand button (only visible if can expand)
					const expandBtn = serverHeader.createDiv({ cls: 'llmsider-mcp-expand-btn' });
					if (canExpand) {
						expandBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6 4 10 8 6 12"></polyline>
						</svg>`;
					}

					// Server info container
					const serverInfo = serverHeader.createDiv({ cls: 'llmsider-mcp-server-info' });

					// Server name
					const displayName = serverInfo.createDiv({ cls: 'mcp-server-display-name' });
					displayName.textContent = serverId;

					// Tool count badge
					const toolBadge = serverHeader.createDiv({ cls: 'llmsider-mcp-tool-badge' });
					toolBadge.textContent = `${tools.length}`;
					if (tools.length === 0) {
						toolBadge.addClass('no-tools');
					}

					// Server switch
					// Display state: connected (actually connected) or autoConnect (configured to auto-connect)
					const isConnected = serverStatus === 'connected';
					const isAutoConnect = mcpManager!.getServerAutoConnect(serverId);
					const switchState = isConnected || isAutoConnect;

					const serverSwitch = this.createToggleSwitch(
						switchState,
						async (enabled) => {
							// Update autoConnect setting
							await mcpManager!.setServerAutoConnect(serverId, enabled);

							// Also connect/disconnect immediately
							if (enabled) {
								if (!isConnected) {
									await mcpManager!.connectServer(serverId);
								}
							} else {
								if (isConnected) {
									await mcpManager!.disconnectServer(serverId);
								}
							}

							const noticeKey = enabled ? 'serverEnabledConnected' : 'serverDisabledDisconnected';
							new Notice(this.plugin.getI18nManager()?.t(`notifications.uiBuilder.${noticeKey}`, { serverId }) || `Server "${serverId}" ${enabled ? 'enabled and connected' : 'disabled and disconnected'}`);
							dropdown.remove();
							this.showMCPDropdown(button);
						}
					);
					serverHeader.appendChild(serverSwitch);

					// Expanded content (only for connected servers with tools)
					if (canExpand) {
						const expandedContent = serverCard.createDiv({ cls: 'llmsider-mcp-expanded-content' });
						expandedContent.style.display = 'none';

						// Tools list
						const toolsList = expandedContent.createDiv({ cls: 'llmsider-mcp-tools-list' });
						toolsToShow.forEach((tool: unknown) => {
							const toolItem = toolsList.createDiv({ cls: 'llmsider-mcp-tool-item' });

							// Tool indicator dot
							const toolDot = toolItem.createDiv({ cls: 'tool-dot' });

							// Tool info
							const toolInfo = toolItem.createDiv({ cls: 'tool-info' });
							const toolName = toolInfo.createDiv({ cls: 'tool-name' });
							toolName.textContent = (tool as MCPTool).name;

							if ((tool as MCPTool).description) {
								const toolDesc = toolInfo.createDiv({ cls: 'tool-description' });
								toolDesc.textContent = (tool as MCPTool).description;
							}

							// Tool enable/disable switch
							const toolSwitch = this.createToggleSwitch(
								mcpManager!.isToolEnabled(serverId, (tool as MCPTool).name),
								async (enabled) => {
									await mcpManager!.setToolEnabled(serverId, (tool as MCPTool).name, enabled);
									const statusText = enabled ? 'enabled' : 'disabled';
									new Notice(`${(tool as MCPTool).name}: ${statusText}`, 3000);
									// Update UI without closing dropdown
									const dotColor = enabled ? 'var(--interactive-accent)' : 'var(--text-muted)';
									toolDot.style.background = dotColor;
								}
							);
							toolItem.appendChild(toolSwitch);

							// Set initial dot color based on enabled state
							const isToolEnabled = mcpManager!.isToolEnabled(serverId, (tool as MCPTool).name);
							toolDot.style.background = isToolEnabled ? 'var(--interactive-accent)' : 'var(--text-muted)';
						});

						// Toggle expansion
						let isExpanded = false;
						const toggleExpansion = () => {
							isExpanded = !isExpanded;
							if (isExpanded) {
								expandedContent.style.display = 'block';
								expandBtn.addClass('expanded');
								serverCard.addClass('expanded');
							} else {
								expandedContent.style.display = 'none';
								expandBtn.removeClass('expanded');
								serverCard.removeClass('expanded');
							}
						};

						expandBtn.onclick = (e) => {
							e.stopPropagation();
							toggleExpansion();
						};

						// Make entire header clickable for expansion
						serverHeader.style.cursor = 'pointer';
						serverHeader.onclick = (e) => {
							if (!(e.target as HTMLElement).closest('.llmsider-tools-switch-container')) {
								toggleExpansion();
							}
						};
					}
				});

				// Show/hide no results message
				if (hasVisibleTools) {
					noResultsMsg.style.display = 'none';
				} else {
					noResultsMsg.style.display = 'block';
				}
			};

			// Initial render
			renderServerCards();

			// Add search input event listener
			searchInput.addEventListener('input', (e) => {
				const filterText = (e.target as HTMLInputElement).value;
				renderServerCards(filterText);
			});
		}

		// Show message if no servers
		if (toolsByServer.size === 0) {
			const emptyNote = dropdown.createDiv({ cls: 'llmsider-tools-empty-note' });
			emptyNote.textContent = this.i18n.t('ui.noMCPServersConfiguredInDropdown');
		}

		// Add to document
		document.body.appendChild(dropdown);

		// Close dropdown when clicking outside
		const closeHandler = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node) && !button.contains(e.target as Node)) {
				dropdown.remove();
				document.removeEventListener('click', closeHandler);
			}
		};
		setTimeout(() => {
			document.addEventListener('click', closeHandler);
		}, 10);
	}

	/**
	 * Create a toggle switch element
	 */
	private createToggleSwitch(isEnabled: boolean, onChange: (enabled: boolean) => Promise<boolean | void>): HTMLElement {
		const switchContainer = document.createElement('div');
		switchContainer.className = 'llmsider-tools-switch-container';

		const switchEl = switchContainer.createDiv({ cls: `llmsider-tools-switch ${isEnabled ? 'active' : ''}` });
		const switchThumb = switchEl.createDiv({ cls: 'llmsider-tools-switch-thumb' });

		switchEl.onclick = async (e) => {
			e.stopPropagation();

			// Check if execution is in progress
			if (this.isExecuting()) {
				new Notice(this.i18n.t('ui.cannotModifyToolsDuringExecution') || 'Cannot modify tools during execution');
				return;
			}

			const newState = !switchEl.hasClass('active');
			const result = await onChange(newState);

			// If result is explicitly false, do not update UI (operation failed/cancelled)
			if (result === false) {
				return;
			}

			if (newState) {
				switchEl.addClass('active');
			} else {
				switchEl.removeClass('active');
			}
		};

		return switchContainer;
	}

	/**
	 * Get category display name with i18n
	 */
	private getCategoryDisplayName(category: string): string {
		return getCategoryDisplayName(category, this.i18n);
	}

	/**
	 * Check if all built-in tools are enabled
	 */
	private areAllBuiltInToolsEnabled(allTools: unknown[]): boolean {
		const result = allTools.every((tool: unknown) => {
			const toolId = (tool as { id?: string; name: string }).id || (tool as { name: string }).name;
			return this.toolPermissionHandler.isBuiltInToolEnabled(toolId);
		});
		Logger.debug('areAllBuiltInToolsEnabled:', result);
		return result;
	}

	/**
	 * Toggle all built-in tools
	 */
	private async toggleAllBuiltInTools(enabled: boolean, allTools: unknown[]): Promise<boolean> {
		if (enabled) {
			return await this.toolPermissionHandler.enableAllBuiltInTools();
		} else {
			await this.toolPermissionHandler.disableAllBuiltInTools();
			return true;
		}
	}

	/**
	 * Check if a category should be shown as enabled
	 * Returns true if at least one tool in the category is enabled
	 * This matches the logic in Settings page (builtin-tools-renderer.ts)
	 */
	private areAllCategoryToolsEnabled(tools: unknown[]): boolean {
		// Category is considered enabled if at least one tool is enabled
		return tools.some((tool: unknown) => {
			const toolId = (tool as { id?: string; name: string }).id || (tool as { name: string }).name;
			return this.toolPermissionHandler.isBuiltInToolEnabled(toolId);
		});
	}

	/**
	 * Toggle all tools in a category
	 */
	private async toggleCategoryTools(category: string, tools: unknown[], enabled: boolean): Promise<boolean> {
		return await this.toolPermissionHandler.toggleCategoryTools(category, tools, enabled);
	}

	/**
	 * Check if all MCP servers are enabled
	 */
	private areAllMCPServersEnabled(mcpManager: any): boolean {
		const mcpState = mcpManager ? mcpManager.getState() : null;
		const allConfiguredServers = mcpState ? Object.keys(mcpState.serversConfig.mcpServers) : [];

		if (allConfiguredServers.length === 0) return false;

		// Check if all configured servers are either connected or have autoConnect enabled
		return allConfiguredServers.every(serverId => {
			const serverStatus = mcpManager.getServerStatus(serverId);
			const isConnected = serverStatus === 'connected';
			const isAutoConnect = mcpManager.getServerAutoConnect(serverId);
			return isConnected || isAutoConnect;
		});
	}

	/**
	 * Toggle all MCP servers
	 */
	private async toggleAllMCPServers(enabled: boolean, mcpManager: any): Promise<void> {
		const mcpState = mcpManager ? mcpManager.getState() : null;
		const allConfiguredServers = mcpState ? Object.keys(mcpState.serversConfig.mcpServers) : [];

		for (const serverId of allConfiguredServers) {
			// Update autoConnect setting
			await mcpManager.setServerAutoConnect(serverId, enabled);

			// Also connect/disconnect immediately
			const serverStatus = mcpManager.getServerStatus(serverId);
			const isConnected = serverStatus === 'connected';

			if (enabled) {
				if (!isConnected) {
					await mcpManager.connectServer(serverId, { suppressNotification: true });
				}
			} else {
				if (isConnected) {
					await mcpManager.disconnectServer(serverId);
				}
			}
		}

		const noticeKey = enabled ? 'allMCPServersEnabledConnected' : 'allMCPServersDisabledDisconnected';
		new Notice(this.plugin.getI18nManager()?.t(`notifications.uiBuilder.${noticeKey}`) || `All MCP servers ${enabled ? 'enabled and connected' : 'disabled and disconnected'}`);
	}

	/**
	 * Build conversation mode selector with a separate guided toggle.
	 */
	private buildModeSelector(container: HTMLElement): HTMLElement {
		const modeSelector = container.createDiv({ cls: 'llmsider-mode-selector' });

		// Mode button with dropdown
		const modeBtn = modeSelector.createEl('button', {
			cls: 'llmsider-mode-btn',
			title: this.i18n.t('ui.conversationMode')
		});

		// Set initial state
		this.updateModeSelectorButton(modeBtn);

		// Handle button click to show dropdown
		modeBtn.onclick = (e) => {
			e.stopPropagation();
			if (this.isExecuting()) {
				new Notice(this.i18n.t('ui.cannotChangeModeDuringExecution') || 'Cannot change mode during execution');
				return;
			}
			this.showModeDropdown(modeBtn);
		};

		const guidedBtn = modeSelector.createEl('button', {
			cls: 'llmsider-mode-btn llmsider-guided-toggle-btn',
			title: this.i18n.t('ui.guidedMode')
		});

		this.updateGuidedToggleButton(guidedBtn);

		guidedBtn.onclick = async (e) => {
			e.stopPropagation();
			if (this.isExecuting()) {
				new Notice(this.i18n.t('ui.cannotChangeModeDuringExecution') || 'Cannot change mode during execution');
				return;
			}
			await this.handleGuidedToggle();
		};

		return modeSelector;
	}

	private buildSkillSelector(container: HTMLElement): HTMLElement {
		const skillSelector = container.createDiv({ cls: 'llmsider-mode-selector llmsider-skill-selector' });

		const skillBtn = skillSelector.createEl('button', {
			cls: 'llmsider-mode-btn llmsider-skill-btn',
			title: this.i18n.t('ui.activeSkill') || 'Active Skill'
		});

		this.updateSkillSelectorButton(skillBtn);

		skillBtn.onclick = (e) => {
			e.stopPropagation();
			if (this.isExecuting()) {
				new Notice(this.i18n.t('ui.cannotChangeSkillDuringExecution') || 'Cannot change skill during execution');
				return;
			}
			this.showSkillDropdown(skillBtn);
		};

		return skillSelector;
	}

	/**
	 * Get SVG icon for conversation mode
	 */
	private getModeIconSVG(mode: ConversationMode): string {
		const svgs = {
			normal: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
			</svg>`,
			agent: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="6" y="8" width="12" height="12" rx="2"/>
				<circle cx="9" cy="12" r="1" fill="currentColor"/>
				<circle cx="15" cy="12" r="1" fill="currentColor"/>
				<path d="M9 16h6"/>
				<path d="M12 8V5"/>
				<circle cx="12" cy="4" r="1" fill="currentColor"/>
			</svg>`
		};
		return svgs[mode];
	}

	private getGuidedToggleIconSVG(enabled: boolean): string {
		if (enabled) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="9"></circle>
				<text x="12" y="12" text-anchor="middle" dominant-baseline="central" fill="currentColor" stroke="none" font-size="12" font-weight="700" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif">S</text>
			</svg>`;
		}

		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="9"></circle>
			<text x="12" y="12" text-anchor="middle" dominant-baseline="central" fill="currentColor" stroke="none" font-size="12" font-weight="700" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif">S</text>
			<line x1="4" y1="4" x2="20" y2="20"></line>
		</svg>`;
	}

	/**
	 * Show mode selection dropdown
	 */
	private showModeDropdown(button: HTMLElement): void {
		// Remove existing dropdown if any
		document.querySelectorAll('.llmsider-mode-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-skill-dropdown').forEach(el => el.remove());

		// Close other menus (mutual exclusion)
		document.querySelectorAll('.llmsider-tools-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-mcp-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-provider-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-context-menu').forEach(el => el.remove());

		// Create dropdown
		const dropdown = document.body.createDiv({ cls: 'llmsider-mode-dropdown' });

		// Position dropdown with smart placement
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'fixed';
		dropdown.style.zIndex = '99999';

		// Vertical positioning
		const spaceAbove = buttonRect.top;
		const spaceBelow = window.innerHeight - buttonRect.bottom;
		const dropdownMaxHeight = 300; // Estimated max height

		if (spaceAbove >= dropdownMaxHeight || spaceAbove > spaceBelow) {
			dropdown.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`;
			dropdown.style.top = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceAbove - 16)}px`;
		} else {
			dropdown.style.top = `${buttonRect.bottom + 8}px`;
			dropdown.style.bottom = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`;
		}

		// Horizontal positioning
		const dropdownWidth = 200; // Min width from CSS
		if (buttonRect.left + dropdownWidth > window.innerWidth) {
			dropdown.style.left = 'auto';
			dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
		} else {
			dropdown.style.left = `${buttonRect.left}px`;
			dropdown.style.right = 'auto';
		}
		dropdown.style.zIndex = '99999';

		// Mode options
		const modes: Array<{ value: ConversationMode; label: string; description: string }> = [
			{
				value: 'normal',
				label: this.i18n.t('ui.normalMode'),
				description: this.i18n.t('ui.normalModeDesc')
			},
			{
				value: 'agent',
				label: this.i18n.t('ui.agentMode'),
				description: this.i18n.t('ui.agentModeDesc')
			}
		];

		// Create option buttons
		modes.forEach(mode => {
			const option = dropdown.createDiv({ cls: 'llmsider-mode-option' });

			if (this.plugin.settings.conversationMode === mode.value) {
				option.addClass('active');
			}

			option.innerHTML = `
				<div class="mode-icon">${this.getModeIconSVG(mode.value)}</div>
				<div class="mode-info">
					<div class="mode-label">${mode.label}</div>
					<div class="mode-description">${mode.description}</div>
				</div>
			`;

			option.onclick = async () => {
				await this.handleModeChange(mode.value);
				dropdown.remove();
			};
		});

		// Close dropdown when clicking outside
		const closeHandler = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node) && !button.contains(e.target as Node)) {
				dropdown.remove();
				document.removeEventListener('click', closeHandler);
			}
		};
		setTimeout(() => {
			document.addEventListener('click', closeHandler);
		}, 10);
	}

	private showSkillDropdown(button: HTMLElement): void {
		document.querySelectorAll('.llmsider-mode-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-skill-dropdown').forEach(el => el.remove());

		document.querySelectorAll('.llmsider-tools-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-mcp-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-provider-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-context-menu').forEach(el => el.remove());

		const dropdown = document.body.createDiv({ cls: 'llmsider-mcp-dropdown llmsider-skill-dropdown' });
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'fixed';
		dropdown.style.zIndex = '99999';

		const spaceAbove = buttonRect.top;
		const spaceBelow = window.innerHeight - buttonRect.bottom;
		const dropdownMaxHeight = 450;

		if (spaceAbove >= dropdownMaxHeight || spaceAbove > spaceBelow) {
			dropdown.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`;
			dropdown.style.top = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceAbove - 16)}px`;
		} else {
			dropdown.style.top = `${buttonRect.bottom + 8}px`;
			dropdown.style.bottom = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`;
		}

		const dropdownWidth = 340;
		if (buttonRect.left + dropdownWidth > window.innerWidth) {
			dropdown.style.left = 'auto';
			dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
		} else {
			dropdown.style.left = `${buttonRect.left}px`;
			dropdown.style.right = 'auto';
		}

		const skillManager = this.plugin.getSkillManager();
		if (!skillManager) {
			const emptyNote = dropdown.createDiv({ cls: 'llmsider-tools-empty-note' });
			emptyNote.textContent = this.i18n.t('ui.skillManagerNotInitialized') || 'Skill manager is not initialized';
		} else {
			const currentSession = this.plugin.getChatView()?.getCurrentSession() || null;
			const skills = skillManager.listSkills();
			const effectiveSkill = skillManager.getEffectiveSkill(currentSession);

			const skillsContainer = dropdown.createDiv({ cls: 'llmsider-tools-categories' });
			const headerRow = skillsContainer.createDiv({ cls: 'llmsider-tools-header-row' });
			const skillsHeader = headerRow.createDiv({ cls: 'llmsider-tools-section-header' });
			skillsHeader.textContent = this.i18n.t('ui.allSkills') || 'All Skills';

			if (skills.length > 0) {
				const globalToggle = headerRow.createDiv({ cls: 'llmsider-tools-global-toggle' });

				const globalSwitch = this.createToggleSwitch(
					this.areAllSkillsEnabled(skills, skillManager),
					async (enabled) => {
						await this.plugin.setAllLocalSkillsEnabled(enabled);
						this.updateSkillSelectorButton(button);
						dropdown.remove();
						this.showSkillDropdown(button);
					}
				);
				globalToggle.appendChild(globalSwitch);
			}

			if (skills.length === 0) {
				const emptyNote = skillsContainer.createDiv({ cls: 'llmsider-tools-empty-note' });
				emptyNote.textContent = this.i18n.t('ui.noSkillsAvailable') || 'No skills available';
			} else {
				const searchContainer = skillsContainer.createDiv({ cls: 'llmsider-tools-search-container' });
				const searchInput = searchContainer.createEl('input', {
					type: 'text',
					placeholder: this.i18n.t('ui.searchSkills') || 'Search skills...',
					cls: 'llmsider-tools-search-input'
				});

				const skillsListContainer = skillsContainer.createDiv({ cls: 'llmsider-mcp-tools-list' });
				const noResultsMsg = skillsContainer.createDiv({ cls: 'llmsider-tools-no-results' });
				noResultsMsg.textContent = this.i18n.t('ui.noMatchingSkills') || 'No matching skills found';
				noResultsMsg.style.display = 'none';

				const renderSkillList = (filterText: string = '') => {
					skillsListContainer.empty();
					const normalizedFilter = filterText.trim().toLowerCase();
					const filteredSkills = normalizedFilter
						? skills.filter(skill => skill.name.toLowerCase().includes(normalizedFilter)
							|| skill.id.toLowerCase().includes(normalizedFilter)
							|| (skill.description || '').toLowerCase().includes(normalizedFilter))
						: skills;

					if (filteredSkills.length === 0) {
						noResultsMsg.style.display = 'block';
						return;
					}

					noResultsMsg.style.display = 'none';

					filteredSkills.forEach(skill => {
						const skillItem = skillsListContainer.createDiv({ cls: 'llmsider-mcp-tool-item llmsider-skill-item' });
						const skillDot = skillItem.createDiv({ cls: 'tool-dot' });
						const skillInfo = skillItem.createDiv({ cls: 'tool-info' });
						const skillName = skillInfo.createDiv({ cls: 'tool-name' });

						const isEnabled = skillManager.isSkillEnabled(skill.id);
						const detailParts: string[] = [];
						if (effectiveSkill?.id === skill.id) {
							detailParts.push(this.i18n.t('ui.skillsSwitchOn') || 'Skills On');
						}
						if (skill.description) {
							detailParts.push(skill.description);
						} else {
							detailParts.push(skill.id);
						}

						skillName.textContent = skill.name;
						const skillDesc = skillInfo.createDiv({ cls: 'tool-description' });
						skillDesc.textContent = detailParts.join(' · ');
						skillItem.setAttribute('title', `${skill.name} (${isEnabled
							? (this.i18n.t('ui.skillEnabled') || 'Enabled')
							: (this.i18n.t('ui.skillDisabled') || 'Disabled')})`);

						const skillSwitch = this.createToggleSwitch(
							isEnabled,
							async (enabled) => {
								await this.plugin.setLocalSkillEnabled(skill.id, enabled);
								this.updateSkillSelectorButton(button);
								dropdown.remove();
								this.showSkillDropdown(button);
							}
						);
						skillItem.appendChild(skillSwitch);
						skillDot.style.background = isEnabled ? 'var(--interactive-accent)' : 'var(--text-muted)';
					});
				};

				renderSkillList();
				searchInput.addEventListener('input', (e) => {
					renderSkillList((e.target as HTMLInputElement).value);
				});
			}
		}

		const closeHandler = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node) && !button.contains(e.target as Node)) {
				dropdown.remove();
				document.removeEventListener('click', closeHandler);
			}
		};
		setTimeout(() => {
			document.addEventListener('click', closeHandler);
		}, 10);
	}

	private areAllSkillsEnabled(skills: Array<{ id: string }>, skillManager: { isSkillEnabled(skillId: string): boolean }): boolean {
		return skills.length > 0 && skills.every(skill => skillManager.isSkillEnabled(skill.id));
	}

	/**
	 * Update mode selector button appearance
	 */
	private updateModeSelectorButton(button?: HTMLElement): void {
		const btn = button || this.containerEl.querySelector('.llmsider-mode-btn') as HTMLElement;
		if (!btn) return;

		const mode = this.plugin.settings.conversationMode;

		let title = '';

		switch (mode) {
			case 'normal':
				title = this.i18n.t('ui.normalMode');
				btn.classList.remove('mode-agent');
				btn.classList.add('mode-normal');
				break;
			case 'agent':
				title = this.i18n.t('ui.agentMode');
				btn.classList.remove('mode-normal');
				btn.classList.add('mode-agent');
				break;
		}

		btn.innerHTML = `<span class="mode-icon">${this.getModeIconSVG(mode)}</span>`;
		btn.title = title;
	}

	private isGuidedEnabled(): boolean {
		const currentSession = this.plugin.getChatView()?.getCurrentSession() || null;
		if (currentSession?.guidedModeEnabled !== undefined) {
			return currentSession.guidedModeEnabled;
		}

		return this.plugin.settings.guidedModeEnabled;
	}

	private updateGuidedToggleButton(button?: HTMLElement): void {
		const btn = button || this.containerEl.querySelector('.llmsider-guided-toggle-btn') as HTMLElement;
		if (!btn) return;

		const isAgentMode = this.plugin.settings.conversationMode === 'agent';
		const enabled = this.isGuidedEnabled();

		btn.classList.toggle('is-active', enabled && !isAgentMode);
		btn.classList.toggle('is-disabled', isAgentMode);
		btn.innerHTML = `<span class="mode-icon">${this.getGuidedToggleIconSVG(enabled && !isAgentMode)}</span>`;

		if (isAgentMode) {
			btn.title = this.i18n.t('ui.guidedModeDesc') || 'Guided mode is only available in normal mode';
			btn.setAttribute('aria-disabled', 'true');
		} else {
			btn.title = enabled ? this.i18n.t('ui.guidedMode') : this.i18n.t('ui.guidedModeDesc');
			btn.removeAttribute('aria-disabled');
		}
	}

	private updateSkillSelectorButton(button?: HTMLElement): void {
		const btn = button || this.containerEl.querySelector('.llmsider-skill-btn') as HTMLElement;
		if (!btn) return;

		const currentSession = this.plugin.getChatView()?.getCurrentSession() || null;
		const skillManager = this.plugin.getSkillManager();
		const skillsEnabled = !!skillManager?.isSkillUsageEnabled(currentSession);
		const hasEnabledSkills = !!skillManager?.hasEnabledSkills();
		const activeSkill = skillsEnabled ? skillManager?.getEffectiveSkill(currentSession) : null;

		btn.innerHTML = `<span class="mode-icon">${this.getSkillIconSVG(skillsEnabled)}</span>`;
		btn.title = skillsEnabled
			? (activeSkill
				? `${this.i18n.t('ui.skillsSwitchOn') || 'Skills On'}: ${activeSkill.name}`
				: (this.i18n.t('ui.skillsSwitchOn') || 'Skills On'))
			: hasEnabledSkills
				? (this.i18n.t('ui.skillsSwitchOff') || 'Skills Off')
				: `${this.i18n.t('ui.skillsSwitchOff') || 'Skills Off'}: ${this.i18n.t('ui.noSkillsAvailable') || 'No skills available'}`;
		btn.toggleClass('has-skill', skillsEnabled);
		btn.toggleClass('skill-disabled', !skillsEnabled);
	}

	private getSkillIconSVG(enabled: boolean): string {
		if (!enabled) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="7" width="18" height="10" rx="5"></rect>
				<circle cx="8" cy="12" r="3" fill="currentColor" stroke="none"></circle>
			</svg>`;
		}

		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="3" y="7" width="18" height="10" rx="5"></rect>
			<circle cx="16" cy="12" r="3" fill="currentColor" stroke="none"></circle>
		</svg>`;
	}

	/**
	 * Update provider selector button appearance
	 */
	private updateProviderButton(button?: HTMLElement): void {
		const btn = button || this.containerEl.querySelector('.llmsider-provider-btn') as HTMLElement;
		if (!btn) return;

		const activeProvider = this.plugin.settings.activeProvider;
		let providerText = 'Select Model';

		if (activeProvider) {
			// Try to get provider display name
			if (activeProvider.includes('::')) {
				const [connectionId, modelId] = activeProvider.split('::');
				const connection = this.plugin.settings.connections.find((c: LLMConnection) => c.id === connectionId);
				const model = this.plugin.settings.models.find((m: LLMModel) => m.id === modelId && m.connectionId === connectionId);
				if (model && model.name) {
					providerText = model.name;
				} else if (modelId) {
					providerText = modelId;
				}
			} else {
				// Legacy provider
				const provider = this.plugin.getProvider(activeProvider);
				if (provider) {
					providerText = (provider as any).displayName || activeProvider;
				}
			}
		}

		// Icon for provider/model - CPU/chip icon
		const providerIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
		<rect x="9" y="9" width="6" height="6"/>
		<line x1="9" y1="1" x2="9" y2="4"/>
		<line x1="15" y1="1" x2="15" y2="4"/>
		<line x1="9" y1="20" x2="9" y2="23"/>
		<line x1="15" y1="20" x2="15" y2="23"/>
		<line x1="20" y1="9" x2="23" y2="9"/>
		<line x1="20" y1="14" x2="23" y2="14"/>
		<line x1="1" y1="9" x2="4" y2="9"/>
		<line x1="1" y1="14" x2="4" y2="14"/>
	</svg>`;

		btn.innerHTML = `
			<span class="provider-icon">${providerIcon}</span>
			<span class="provider-text">${providerText}</span>
			<span class="provider-arrow">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
			</span>
		`;
		btn.title = this.i18n.t('ui.selectProvider') || 'Select Provider';
		requestAnimationFrame(() => {
			this.applyResponsiveClasses?.();
		});
	}

	/**
	 * Show provider selection dropdown
	 */
	private showProviderDropdown(button: HTMLElement, selectElement: HTMLSelectElement): void {
		// Remove existing dropdown if any
		document.querySelectorAll('.llmsider-provider-dropdown').forEach(el => el.remove());

		// Close other menus (mutual exclusion)
		document.querySelectorAll('.llmsider-mode-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-context-menu').forEach(el => el.remove());

		// Create dropdown
		const dropdown = document.body.createDiv({ cls: 'llmsider-provider-dropdown' });

		// Position dropdown with smart placement
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'fixed';
		dropdown.style.zIndex = '99999';

		// Vertical positioning
		const spaceAbove = buttonRect.top;
		const spaceBelow = window.innerHeight - buttonRect.bottom;
		const dropdownMaxHeight = 400; // Match CSS max-height

		if (spaceAbove >= dropdownMaxHeight || spaceAbove > spaceBelow) {
			dropdown.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`;
			dropdown.style.top = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceAbove - 16)}px`;
		} else {
			dropdown.style.top = `${buttonRect.bottom + 8}px`;
			dropdown.style.bottom = 'auto';
			dropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`;
		}

		// Horizontal positioning (Right aligned by default)
		const dropdownWidth = 280; // Match CSS width
		if (buttonRect.right >= dropdownWidth) {
			dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
			dropdown.style.left = 'auto';
		} else {
			dropdown.style.left = `${buttonRect.left}px`;
			dropdown.style.right = 'auto';
		}

		// Get providers from settings
		const connections = this.plugin.settings.connections || [];
		const models = this.plugin.settings.models || [];
		const activeProvider = this.plugin.settings.activeProvider;

		Logger.debug('[UI] showProviderDropdown - Total models:', models.length);
		Logger.debug('[UI] showProviderDropdown - Models:', models.map(m => ({ id: m.id, name: m.name, connectionId: m.connectionId, enabled: m.enabled })));

		if (connections.length === 0 || models.length === 0) {
			const emptyOption = dropdown.createDiv({ cls: 'llmsider-provider-option provider-empty' });

			const infoDiv = emptyOption.createDiv({ cls: 'provider-info' });
			infoDiv.createDiv({ cls: 'provider-label', text: 'No providers configured' });
			infoDiv.createDiv({ cls: 'provider-description', text: 'Add a provider in settings' });

			// Add to document
			document.body.appendChild(dropdown);

			// Auto-close after 2 seconds
			setTimeout(() => dropdown.remove(), 2000);
			return;
		}

		// Create provider options grouped by connection
		connections.forEach((connection: LLMConnection) => {
			if (!connection.enabled) return;
			const connectionModels = models.filter((m: LLMModel) => m.connectionId === connection.id && m.enabled);
			Logger.debug(`[UI] Connection ${connection.id} (${connection.name}) - enabled models:`, connectionModels.length, 'of', models.filter((m: LLMModel) => m.connectionId === connection.id).length);
			if (connectionModels.length === 0) return;

			// Add connection header if there are multiple connections
			if (connections.length > 1) {
				const header = dropdown.createDiv({ cls: 'llmsider-provider-group-header' });
				header.textContent = connection.name || connection.id;
			}

			connectionModels.forEach((model: LLMModel) => {
				const providerId = `${connection.id}::${model.id}`;
				const isActive = providerId === activeProvider;

				const option = dropdown.createDiv({ cls: 'llmsider-provider-option' });
				if (isActive) {
					option.addClass('active');
				}

				// Create icon element
				const iconDiv = option.createDiv({ cls: 'provider-icon' });
				iconDiv.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<path d="M12 6v6l4 2"></path>
				</svg>`;

				// Create info element
				const infoDiv = option.createDiv({ cls: 'provider-info' });
				infoDiv.createDiv({ cls: 'provider-label', text: model.name || model.id });
				infoDiv.createDiv({ cls: 'provider-description', text: connection.name });

				option.onclick = async () => {
					await this.handleProviderChange(providerId, selectElement);
					dropdown.remove();
				};
			});
		});

		// Add to document
		document.body.appendChild(dropdown);

		// Close dropdown when clicking outside
		const closeHandler = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node) && !button.contains(e.target as Node)) {
				dropdown.remove();
				document.removeEventListener('click', closeHandler);
			}
		};
		setTimeout(() => {
			document.addEventListener('click', closeHandler);
		}, 10);
	}

	/**
	 * Handle provider change
	 */
	private async handleProviderChange(providerId: string, selectElement: HTMLSelectElement): Promise<void> {
		try {
			Logger.debug('[UIBuilder] handleProviderChange called:', providerId);

			// Ensure the option exists in the select element before setting value
			// This is necessary because the select is hidden and may not have all options populated
			if (!Array.from(selectElement.options).some(opt => opt.value === providerId)) {
				const option = selectElement.createEl('option', { value: providerId });
				option.selected = true;
				Logger.debug('[UIBuilder] Created new option for:', providerId);
			}

			// Update the hidden select element for compatibility
			selectElement.value = providerId;
			Logger.debug('[UIBuilder] Updated select element value:', selectElement.value);

			// Trigger change event on the select element
			const event = new Event('change', { bubbles: true });
			selectElement.dispatchEvent(event);
			Logger.debug('[UIBuilder] Dispatched change event');

			// Update button appearance
			this.updateProviderButton();
			Logger.debug('[UIBuilder] Updated provider button');
		} catch (error) {
			Logger.error('[UIBuilder] Failed to change provider:', error);
		}
	}

	/**
	 * Build Agent mode toggle button inline (in input wrapper) - DEPRECATED, kept for compatibility
	 */
	private buildModeToggleInline(container: HTMLElement): HTMLElement {
		// Now just calls buildModeSelector for compatibility
		return this.buildModeSelector(container);
	}

	/**
	 * Build clear chat button inline (in input wrapper)
	 */
	private buildClearChatButtonInline(container: HTMLElement): HTMLElement {
		// Clear chat button (styled for inline use)
		const clearBtn = container.createEl('button', {
			cls: 'llmsider-clear-chat-btn-inline',
			title: 'Clear current chat'
		});

		clearBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="3 6 5 6 21 6"></polyline>
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
		</svg>`;

		// Handle button click
		clearBtn.onclick = async () => {
			await this.handleClearChat();
		};

		return clearBtn;
	}

	/**
	 * Update Agent button state inline
	 */
	updateAgentButtonInline(agentBtn?: HTMLElement): void {
		const button = agentBtn || this.containerEl.querySelector('.llmsider-agent-btn-inline') as HTMLElement;
		if (button) {
			const isAgentMode = this.plugin.settings.agentMode;

			// Update tooltip based on mode
			button.title = isAgentMode ? this.i18n.t('ui.agentModeEnabled') : this.i18n.t('ui.agentModeDisabled');

			// Update icon and style based on mode
			if (isAgentMode) {
				// Robot head with antenna - Agent mode enabled
				button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="6" y="8" width="12" height="12" rx="2"/>
					<circle cx="9" cy="12" r="1" fill="currentColor"/>
					<circle cx="15" cy="12" r="1" fill="currentColor"/>
					<path d="M9 16h6"/>
					<path d="M12 8V5"/>
					<circle cx="12" cy="4" r="1" fill="currentColor"/>
				</svg>`;
				button.classList.add('agent-active');
			} else {
				// Robot head with slash - Agent mode disabled
				button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="6" y="8" width="12" height="12" rx="2"/>
					<circle cx="9" cy="12" r="1" fill="currentColor"/>
					<circle cx="15" cy="12" r="1" fill="currentColor"/>
					<path d="M9 16h6"/>
					<line x1="4" y1="4" x2="20" y2="20" stroke-width="2"/>
				</svg>`;
				button.classList.remove('agent-active');
			}
		}
	}

	/**
	 * Build Agent mode toggle button in controls row
	 */
	private buildModeToggleInControlsRow(container: HTMLElement): HTMLElement {
		// Agent mode toggle button (styled for controls row)
		const agentBtn = container.createEl('button', {
			cls: 'llmsider-agent-btn-controls-row',
			title: this.i18n.t('ui.toggleAgentMode')
		});

		// Set initial state
		this.updateAgentButtonInControlsRow(agentBtn);

		// Handle button click
		agentBtn.onclick = async () => {
			await this.handleAgentToggle(!this.plugin.settings.agentMode);
		};

		return agentBtn;
	}

	/**
	 * Build clear chat button in controls row
	 */
	private buildClearChatButtonInControlsRow(container: HTMLElement): HTMLElement {
		// Clear chat button (styled for controls row)
		const clearBtn = container.createEl('button', {
			cls: 'llmsider-clear-chat-btn-controls-row',
			title: 'Clear current chat'
		});

		clearBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="3 6 5 6 21 6"></polyline>
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
		</svg>`;

		// Handle button click
		clearBtn.onclick = async () => {
			await this.handleClearChat();
		};

		return clearBtn;
	}

	/**
	 * Update Agent button state in controls row
	 */
	updateAgentButtonInControlsRow(agentBtn?: HTMLElement): void {
		const button = agentBtn || this.containerEl.querySelector('.llmsider-agent-btn-controls-row') as HTMLElement;
		if (button) {
			const isAgentMode = this.plugin.settings.agentMode;

			// Update tooltip based on mode
			button.title = isAgentMode ? this.i18n.t('ui.agentModeEnabled') : this.i18n.t('ui.agentModeDisabled');

			// Update icon and style based on mode
			if (isAgentMode) {
				// Robot head with antenna - Agent mode enabled
				button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="6" y="8" width="12" height="12" rx="2"/>
					<circle cx="9" cy="12" r="1" fill="currentColor"/>
					<circle cx="15" cy="12" r="1" fill="currentColor"/>
					<path d="M9 16h6"/>
					<path d="M12 8V5"/>
					<circle cx="12" cy="4" r="1" fill="currentColor"/>
				</svg>`;
				button.classList.add('agent-active');
			} else {
				// Robot head with slash - Agent mode disabled
				button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="6" y="8" width="12" height="12" rx="2"/>
					<circle cx="9" cy="12" r="1" fill="currentColor"/>
					<circle cx="15" cy="12" r="1" fill="currentColor"/>
					<path d="M9 16h6"/>
					<line x1="4" y1="4" x2="20" y2="20" stroke-width="2"/>
				</svg>`;
				button.classList.remove('agent-active');
			}
		}
	}

	/**
	 * Build clear chat button in provider row (legacy)
	 */
	private buildClearChatButton(container: HTMLElement): HTMLElement {
		// Clear chat button (styled for provider row)
		const clearBtn = container.createEl('button', {
			cls: 'llmsider-clear-chat-btn-provider-row',
			title: 'Clear current chat'
		});

		clearBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="3 6 5 6 21 6"></polyline>
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
		</svg>`;

		// Handle button click
		clearBtn.onclick = async () => {
			await this.handleClearChat();
		};

		return clearBtn;
	}

	/**
	 * Handle clear chat action
	 */
	private async handleClearChat(): Promise<void> {
		// Dispatch event to be handled by ChatView
		window.dispatchEvent(new CustomEvent('llmsider-clear-chat'));
	}

	/**
	 * Build Agent mode toggle button in provider row
	 */
	private buildModeToggleInProviderRow(container: HTMLElement): HTMLElement {
		// Agent mode toggle button (styled for provider row)
		const agentBtn = container.createEl('button', {
			cls: 'llmsider-agent-btn-provider-row',
			title: this.i18n.t('ui.toggleAgentMode')
		});

		// Set initial state
		this.updateAgentButtonInProviderRow(agentBtn);

		// Handle button click
		agentBtn.onclick = async () => {
			await this.handleAgentToggle(!this.plugin.settings.agentMode);
		};

		return agentBtn;
	}

	/**
	 * Update Agent button state in provider row
	 */
	updateAgentButtonInProviderRow(agentBtn?: HTMLElement): void {
		const button = agentBtn || this.containerEl.querySelector('.llmsider-agent-btn-provider-row') as HTMLElement;
		if (button) {
			const isAgentMode = this.plugin.settings.agentMode;

			// Update tooltip based on mode
			button.title = isAgentMode ? this.i18n.t('ui.agentModeEnabled') : this.i18n.t('ui.agentModeDisabled');

			// Update icon and style based on mode
			if (isAgentMode) {
				// Robot head with antenna - Agent mode enabled
				button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="6" y="8" width="12" height="12" rx="2"/>
					<circle cx="9" cy="12" r="1" fill="currentColor"/>
					<circle cx="15" cy="12" r="1" fill="currentColor"/>
					<path d="M9 16h6"/>
					<path d="M12 8V5"/>
					<circle cx="12" cy="4" r="1" fill="currentColor"/>
				</svg>`;
				button.classList.add('agent-active');
			} else {
				// Robot head with slash - Agent mode disabled
				button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="6" y="8" width="12" height="12" rx="2"/>
					<circle cx="9" cy="12" r="1" fill="currentColor"/>
					<circle cx="15" cy="12" r="1" fill="currentColor"/>
					<path d="M9 16h6"/>
					<line x1="4" y1="4" x2="20" y2="20" stroke-width="2"/>
				</svg>`;
				button.classList.remove('agent-active');
			}
		}
	}

	/**
	 * Update Agent button appearance (replaces updateModeButton)
	 */
	updateModeButton(currentMode?: unknown): void {
		// Update Agent button state in all locations (for compatibility)
		this.updateAgentButton();
		this.updateAgentButtonInProviderRow();
		this.updateAgentButtonInControlsRow();
		this.updateAgentButtonInline();
		// Update mode selector button
		this.updateModeSelectorButton();
		this.updateGuidedToggleButton();
	}

	/**
	 * Update Provider button appearance (public method)
	 */
	updateProviderButtonPublic(): void {
		this.updateProviderButton();
	}

	updateSkillButtonPublic(): void {
		this.updateSkillSelectorButton();
	}

	updateContextSearchButtonPublic(): void {
		this.updateContextSearchButton();
	}

	updateAgentButton(agentBtn?: HTMLElement): void {
		const button = agentBtn || this.containerEl.querySelector('.llmsider-agent-btn') as HTMLElement;
		if (button) {
			const isAgentMode = this.plugin.settings.agentMode;

			// Update tooltip based on mode
			button.title = isAgentMode ? this.i18n.t('ui.agentModeEnabled') : this.i18n.t('ui.agentModeDisabled');

			// Update icon and style based on mode
			if (isAgentMode) {
				// Robot head with antenna - Agent mode enabled
				button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="6" y="8" width="12" height="12" rx="2"/>
					<circle cx="9" cy="12" r="1" fill="currentColor"/>
					<circle cx="15" cy="12" r="1" fill="currentColor"/>
					<path d="M9 16h6"/>
					<path d="M12 8V5"/>
					<circle cx="12" cy="4" r="1" fill="currentColor"/>
				</svg>`;
				button.classList.add('agent-active');
			} else {
				// Robot head with slash - Agent mode disabled
				button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="6" y="8" width="12" height="12" rx="2"/>
					<circle cx="9" cy="12" r="1" fill="currentColor"/>
					<circle cx="15" cy="12" r="1" fill="currentColor"/>
					<path d="M9 16h6"/>
					<line x1="4" y1="4" x2="20" y2="20" stroke-width="2"/>
				</svg>`;
				button.classList.remove('agent-active');
			}
		}
	}

	/**
	 * Handle conversation mode change
	 */
	private async handleModeChange(mode: ConversationMode): Promise<void> {
		try {
			// Check if using Free Qwen and switching to Agent mode
			if (mode === 'agent' && this.plugin.getActiveProvider()) {
				const providerName = this.plugin.getActiveProvider()!.constructor.name;
				if (providerName === 'FreeQwenProviderImpl') {
					// Show warning about tool calling limitations
					const warningMessage = this.i18n.t('ui.freeQwenToolCallWarning');
					new Notice(warningMessage, 8000);
					Logger.warn('[Free Qwen] Switching to', mode, 'mode - tool calling may not work properly');
				}
			}

			// Save to SQLite instead of settings
			await this.plugin.configDb.setConfigValue('conversationMode', mode);

			// Update in-memory settings for current session
			this.plugin.settings.conversationMode = mode;
			// Update legacy agentMode for backward compatibility
			this.plugin.settings.agentMode = (mode === 'agent');

			const currentSession = this.plugin.getChatView()?.getCurrentSession() || null;
			if (currentSession) {
				currentSession.conversationMode = mode;
				await this.plugin.updateChatSession(currentSession.id, {
					conversationMode: mode,
				});
			}

			// Update button appearance
			this.updateModeSelectorButton();
			this.updateGuidedToggleButton();

			// Update Tools button visibility based on new mode
			this.updateToolsButton();

			// Update MCP button visibility based on new mode
			this.updateMCPButton();

			// Dispatch event to notify other components
			window.dispatchEvent(new CustomEvent('llmsider-mode-changed', {
				detail: { mode: mode, agentMode: mode === 'agent' }
			}));

			Logger.debug(`Conversation mode changed to: ${mode}, saved to SQLite`);
		} catch (error) {
			Logger.error('Failed to change conversation mode:', error);
		}
	}

	private async handleGuidedToggle(): Promise<void> {
		try {
			if (this.plugin.settings.conversationMode === 'agent') {
				new Notice(this.i18n.t('ui.guidedModeDesc') || 'Guided mode is only available in normal mode');
				return;
			}

			const currentSession = this.plugin.getChatView()?.getCurrentSession() || null;
			const nextEnabled = !this.isGuidedEnabled();

			if (nextEnabled) {
				const dismissed = (await this.plugin.configDb.getConfig('superpowerEnableNoticeDismissed')) === 'true';
				if (!dismissed) {
					const decision = await new Promise<{ confirmed: boolean; dontRemind: boolean }>((resolve) => {
						new SuperpowerEnableNoticeModal(this.plugin.app, this.i18n, resolve).open();
					});

					if (decision.dontRemind) {
						await this.plugin.configDb.setConfig('superpowerEnableNoticeDismissed', 'true');
					}
					if (!decision.confirmed) {
						return;
					}
				}
			}

			await this.plugin.configDb.setGuidedModeEnabled(nextEnabled);
			this.plugin.settings.guidedModeEnabled = nextEnabled;

			if (currentSession) {
				currentSession.guidedModeEnabled = nextEnabled;
				await this.plugin.updateChatSession(currentSession.id, {
					guidedModeEnabled: nextEnabled,
				});
			}

			this.updateGuidedToggleButton();
			window.dispatchEvent(new CustomEvent('llmsider-guided-mode-changed', {
				detail: { enabled: nextEnabled }
			}));
		} catch (error) {
			Logger.error('Failed to toggle guided mode:', error);
		}
	}

	/**
	 * Handle Agent mode toggle - DEPRECATED, kept for compatibility
	 */
	private async handleAgentToggle(enabled: boolean): Promise<void> {
		// Convert to new mode system
		const newMode: ConversationMode = enabled ? 'agent' : 'normal';
		await this.handleModeChange(newMode);
	}

	/**
	 * Event handlers that need to be implemented by the main ChatView
	 */
	private async handleNewChat(): Promise<void> {
		// This will be handled by the main ChatView class
		window.dispatchEvent(new CustomEvent('llmsider-new-chat'));
	}

	private handleShowHistory(): void {
		// This will be handled by the main ChatView class
		Logger.debug('📜 Dispatching llmsider-show-history event');
		window.dispatchEvent(new CustomEvent('llmsider-show-history'));
		Logger.debug('📜 Event dispatched');
	}

	private handleOpenSettings(): void {
		// Open settings
		//@ts-ignore
		this.plugin.app.setting.open();
		//@ts-ignore
		this.plugin.app.setting.openTabById(this.plugin.manifest.id);
	}

	// ==================================================================================
	// 🔧 DEBUG: Reload Plugin Handler (Temporary - for development convenience)
	// ==================================================================================
	// TODO: Remove this method before production release
	// This method provides a quick way to reload the plugin during development
	// It's equivalent to disabling and re-enabling the plugin in settings
	// ==================================================================================
	private async handleReloadPlugin(): Promise<void> {
		try {
			Logger.debug('🔧 DEBUG: Reloading plugin...');

			// Show loading notice
			const notice = new Notice(this.plugin.i18n.t('notifications.plugin.reloading'), 0);

			// Close all plugin views first to avoid duplicate views
			this.plugin.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);

			// Small delay to ensure views are closed
			await new Promise(resolve => setTimeout(resolve, 100));

			// Unload the plugin
			await (this.plugin.app as any).plugins.disablePlugin(this.plugin.manifest.id);

			// Small delay to ensure clean unload
			await new Promise(resolve => setTimeout(resolve, 100));

			// Reload the plugin
			await (this.plugin.app as any).plugins.enablePlugin(this.plugin.manifest.id);

			// Update notice
			notice.hide();
			new Notice(this.plugin.i18n.t('notifications.plugin.reloadSuccess'), 3000);

			Logger.debug('🔧 DEBUG: Plugin reloaded successfully');
		} catch (error) {
			Logger.error('🔧 DEBUG: Failed to reload plugin:', error);
			new Notice(this.plugin.i18n.t('notifications.plugin.reloadFailed', { error: error instanceof Error ? error.message : String(error) }), 5000);
		}
	}
	// ==================================================================================
	// End of DEBUG section
	// ==================================================================================

	private handleShowContextOptions(): void {
		// This will be handled by the main ChatView class
		window.dispatchEvent(new CustomEvent('llmsider-show-context-options'));
	}

	/**
	 * Update session name display in header
	 */
	updateSessionNameDisplay(sessionName?: string): void {
		const sessionNameEl = this.containerEl.querySelector('.llmsider-session-name') as HTMLElement;
		if (sessionNameEl) {
			const name = sessionName || this.getCurrentSessionName();
			sessionNameEl.textContent = name;
		}
	}

	/**
	 * Get current session name
	 */
	private getCurrentSessionName(): string {
		const currentSession = this.plugin.settings.chatSessions[0];
		return currentSession?.name || 'Untitled';
	}

	/**
	 * Handle session name change
	 */
	private async handleSessionNameChange(newName: string): Promise<void> {
		const currentSession = this.plugin.settings.chatSessions[0];
		if (currentSession && newName !== currentSession.name) {
			// Limit to 8 characters
			const truncatedName = newName.substring(0, 8);
			await this.plugin.updateChatSession(currentSession.id, { name: truncatedName });
			this.updateSessionNameDisplay(truncatedName);
			Logger.debug('Session name updated to:', truncatedName);
		}
	}

	/**
	 * Generate session name from first user message
	 */
	async generateSessionNameFromMessage(userMessage: string, assistantMessage: string): Promise<string> {
		try {
			const provider = this.plugin.getActiveProvider();
			if (!provider) {
				Logger.warn('No active provider, using default title');
				return 'Untitled';
			}

			// Check if current model is an image-only generation model
			// These models don't support text chat, so we skip title generation
			const currentModel = provider.getModelName?.() || '';
			Logger.debug('[TitleGen] Checking model for image-only detection:', currentModel);

			const isImageOnlyModel =
				currentModel.includes('qwen-image-plus') ||
				currentModel.includes('qwen-image') ||
				currentModel.includes('wanx') ||
				currentModel.includes('flux-') ||
				currentModel.includes('dall-e') ||
				currentModel.includes('stable-diffusion') ||
				currentModel.includes('midjourney');

			Logger.debug('[TitleGen] Is image-only model?', isImageOnlyModel);

			if (isImageOnlyModel) {
				Logger.info('[TitleGen] ✅ Skipping title generation for image-only model:', currentModel);
				return 'Image Generation';
			}

			// Construct prompt for title generation - ONLY use user's initial question
			// Do NOT include assistant's response to avoid generating title based on execution results
			const titlePrompt = `Based on the following user question, generate a concise, descriptive title that captures the main topic or intent. The title should be:
- 8-15 Chinese characters OR 20-40 English letters
- Clear and informative
- Reflect what the user is asking about, not the answer content
- Return ONLY the title, no quotes or additional text

User Question: ${userMessage.substring(0, 300)}`;

			const titleMessages = [{
				id: 'title-gen-' + Date.now(),
				role: 'user' as const,
				content: titlePrompt,
				timestamp: Date.now()
			}];

			// Generate title using AI - explicitly pass undefined for tools and empty system message
			// to avoid triggering plan generation or tool list prompts
			// Also use a systemMessage to bypass image generation for image models
			let titleContent = '';
			const bypassImageGeneration = 'Generate only text response, no images.';
			await provider.sendStreamingMessage(
				titleMessages,
				(chunk) => {
					if (chunk.delta) {
						// Skip thinking content during streaming
						if (chunk.metadata?.type !== 'thinking') {
							titleContent += chunk.delta;
						}
					}
				},
				undefined, // signal
				undefined, // tools
				bypassImageGeneration // systemMessage to prevent image generation
			);

			if (!titleContent.trim()) {
				return 'Untitled';
			}

			// Clean up the generated title
			let generatedTitle = titleContent.trim();

			// Remove thinking callout sections if any leaked through
			// Pattern works for both collapsed [!tip]- and expanded [!tip] formats
			generatedTitle = generatedTitle.replace(/^>\s*\[!\w+\][^\n]*思考[^\n]*\n(>\s*[^\n]*\n)*\n*/gm, '');
			generatedTitle = generatedTitle.replace(/^(>\s*[^\n]*\n)+\n*/m, '');

			// Remove quotes and clean up
			generatedTitle = generatedTitle
				.replace(/^["']|["']$/g, '') // Remove quotes
				.replace(/\n/g, ' ') // Replace newlines with spaces
				.trim();

			Logger.debug('Generated session title:', generatedTitle);

			return generatedTitle || 'Untitled';
		} catch (error) {
			Logger.error('Failed to generate session name:', error);
			return 'Untitled';
		}
	}
}
