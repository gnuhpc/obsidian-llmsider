import { ChatMode, ConversationMode, CHAT_VIEW_TYPE, LLMConnection, LLMModel } from '../types';
import { Logger } from './../utils/logger';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';
import { Notice } from 'obsidian';
import { categoryMap, getCategoryIcon, getCategoryDisplayName } from '../settings';

export class UIBuilder {
	private plugin: LLMSiderPlugin;
	private containerEl: HTMLElement;
	private i18n: I18nManager;

	constructor(plugin: LLMSiderPlugin, containerEl: HTMLElement) {
		this.plugin = plugin;
		this.containerEl = containerEl;
		this.i18n = plugin.getI18nManager()!;
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
	} {
		const container = this.containerEl;
		container.addClass('llmsider-chat-container');

		// Header - simpler style like Copilot
		this.buildHeader(container);

		// Messages container
		const messageContainer = container.createDiv({ cls: 'llmsider-messages' });

		// Input container at bottom
		const inputComponents = this.buildInputContainer(container);

		return {
			messageContainer,
			...inputComponents
		};
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
		historyBtn.onclick = () => this.handleShowHistory();

	// Settings button
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

		// Context display area (above input)
		const contextDisplay = inputContainer.createDiv({ cls: 'llmsider-context-display' });
		contextDisplay.style.display = 'none'; // Initially hidden

		// Main input wrapper with modern design
		const inputWrapper = inputContainer.createDiv({ cls: 'llmsider-input-wrapper' });

		// Text input area (full width at top)
		const inputElement = inputWrapper.createEl('textarea', {
			cls: 'llmsider-input',
			attr: {
				placeholder: this.i18n.t('chatPlaceholder'),
				rows: '1'
			}
		}) as HTMLTextAreaElement;

		// Button row (below text input)
		const buttonRow = inputWrapper.createDiv({ cls: 'llmsider-button-row' });

		// Left side - Control buttons (📎, agent)
		const leftButtons = buttonRow.createDiv({ cls: 'llmsider-button-row-left' });

		// Attach/Context button
		const attachBtn = leftButtons.createEl('button', {
			cls: 'llmsider-input-btn',
			title: this.i18n.t('ui.attachFile')
		});
		attachBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
		</svg>`;
		attachBtn.onclick = () => this.handleShowContextOptions();

		// Conversation mode selector (replaces agent toggle)
		const modeSelectorBtn = this.buildModeSelector(leftButtons);

		// Tools management button (next to mode selector)
		const toolsManagerBtn = this.buildToolsManager(leftButtons);

		// MCP Server management button (next to tools manager)
		const mcpManagerBtn = this.buildMCPManager(leftButtons);

		// Local Context Search toggle button
		const contextSearchBtn = this.buildContextSearchToggle(leftButtons);

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
		}) as HTMLSelectElement;
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
		sendButton.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
			<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
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
		this.updateContextSearchButton(toggleBtn);
		
		// Handle button click to toggle
		toggleBtn.onclick = async (e) => {
			e.stopPropagation();
			
			// Check if there's data available
			const vectorDBManager = this.plugin.getVectorDBManager();
			if (!vectorDBManager) {
				new Notice(this.i18n.t('ui.vectorDBNotInitialized') || 'Vector database not initialized');
				return;
			}
			
			const status = vectorDBManager.getStatus();
			if (status.totalChunks === 0) {
				new Notice(this.i18n.t('ui.noVectorDataAvailable') || 'No vector data available. Please sync or rebuild the index first.');
				return;
			}
			
			// Toggle auto-search setting (not the main enabled setting)
			const newState = !this.plugin.settings.vectorSettings.autoSearchEnabled;
			this.plugin.settings.vectorSettings.autoSearchEnabled = newState;
			await this.plugin.saveSettings();
			
			// Update button appearance
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
	 * Update Context Search button appearance
	 */
	private updateContextSearchButton(button?: HTMLElement): void {
		const btn = button || this.containerEl.querySelector('.llmsider-context-search-btn') as HTMLElement;
		if (!btn) return;
		
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
		if (!isInitialized) {
			// Vector DB not loaded yet - button disabled
			btn.classList.add('disabled');
			btn.classList.remove('enabled');
			btn.style.opacity = '0.3';
			btn.style.cursor = 'not-allowed';
			btn.title = this.i18n.t('ui.vectorDBNotInitialized') || 'Vector database not initialized';
		} else if (!hasData) {
			// Vector DB loaded but no data - button disabled
			btn.classList.add('disabled');
			btn.classList.remove('enabled');
			btn.style.opacity = '0.3';
			btn.style.cursor = 'not-allowed';
			btn.title = this.i18n.t('ui.noVectorDataAvailable') || 'No vector data available. Please sync or rebuild the index first.';
		} else if (autoSearchEnabled) {
			// Vector DB loaded with data and auto-search enabled
			btn.classList.add('enabled');
			btn.classList.remove('disabled');
			btn.style.opacity = '1';
			btn.style.cursor = 'pointer';
			btn.title = this.i18n.t('ui.localContextSearchEnabled') || 'Local context search enabled';
		} else {
			// Vector DB loaded with data but auto-search disabled
			btn.classList.remove('enabled');
			btn.classList.add('disabled');
			btn.style.opacity = '0.5';
			btn.style.cursor = 'pointer';
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
		
		// Only show in 'guided' and 'agent' modes
		const shouldShow = mode === 'guided' || mode === 'agent';
		
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
		
		// Only show in 'guided' and 'agent' modes
		// (we always show it in these modes, even if no tools configured yet)
		const shouldShow = mode === 'guided' || mode === 'agent';
		
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
		
		// Position dropdown ABOVE button
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'fixed';
		dropdown.style.left = `${buttonRect.left}px`;
		dropdown.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`;
		dropdown.style.zIndex = '99999';
		
		// Import built-in tools with localization
		const { getAllBuiltInTools } = require('../tools/built-in-tools');
		const allBuiltInTools = getAllBuiltInTools({ i18n: this.i18n, asArray: true });
		
		// Group built-in tools by category
		const toolsByCategory = new Map<string, any[]>();
		allBuiltInTools.forEach((tool: any) => {
			const category = tool.category || 'other';
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
					await this.toggleAllBuiltInTools(enabled, allBuiltInTools);
					dropdown.remove();
					this.showToolsDropdown(button);
				}
			);
			globalToggle.appendChild(globalSwitch);
			
			// Built-in tools permissions
			const builtInTools = this.plugin.settings.builtInToolsPermissions || {};
			
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
				
				toolsByCategory.forEach((tools, category) => {
					// Filter tools based on search text
					const filteredTools = filterText 
						? tools.filter((tool: any) => 
							tool.name.toLowerCase().includes(filterText.toLowerCase()) ||
							(tool.description && tool.description.toLowerCase().includes(filterText.toLowerCase()))
						)
						: tools;
					
					// Skip category if no matching tools
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
						await this.toggleCategoryTools(category, tools, enabled);
						dropdown.remove();
						this.showToolsDropdown(button);
					}
				);
				categoryHeader.appendChild(categorySwitch);
				
				// Expanded content with tools list
				const expandedContent = categoryCard.createDiv({ cls: 'llmsider-mcp-expanded-content' });
				expandedContent.style.display = 'none';
				
				// Tools list
				const toolsList = expandedContent.createDiv({ cls: 'llmsider-mcp-tools-list' });
				filteredTools.forEach((tool: any) => {
					const toolItem = toolsList.createDiv({ cls: 'llmsider-mcp-tool-item' });
					
					// Tool indicator dot
					const toolDot = toolItem.createDiv({ cls: 'tool-dot' });
					
					// Tool info
					const toolInfo = toolItem.createDiv({ cls: 'tool-info' });
					const toolName = toolInfo.createDiv({ cls: 'tool-name' });
					toolName.textContent = tool.name;
					
					if (tool.description) {
						const toolDesc = toolInfo.createDiv({ cls: 'tool-description' });
						toolDesc.textContent = tool.description;
					}
					
				
				// Tool toggle switch
				const toolId = (tool as any).id || tool.name;
				const permission = builtInTools[toolId];
				const isToolEnabled = permission === undefined ? true : permission === true;
				const toolSwitch = this.createToggleSwitch(
					isToolEnabled,
					async (enabled) => {
						if (!this.plugin.settings.builtInToolsPermissions) {
							this.plugin.settings.builtInToolsPermissions = {};
						}
						this.plugin.settings.builtInToolsPermissions[toolId] = enabled;
						await this.plugin.saveSettings();
						const statusText = enabled ? this.i18n.t('ui.toolEnabled') : this.i18n.t('ui.toolDisabled');
						new Notice(`Tool "${tool.name}" ${statusText}`);
						// Refresh dropdown to sync all switches
						dropdown.remove();
						this.showToolsDropdown(button);
					}
				);
				toolItem.appendChild(toolSwitch);					// Set initial dot color
					toolDot.style.background = isToolEnabled ? 'var(--interactive-accent)' : 'var(--text-muted)';
				});
				
				// Toggle expansion
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
		
		// Position dropdown ABOVE button
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'fixed';
		dropdown.style.left = `${buttonRect.left}px`;
		dropdown.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`;
		dropdown.style.zIndex = '99999';
		
		// Get MCP Manager
		const mcpManager = this.plugin.getMCPManager();
		
		// Get all tools and group by server
		const allMCPTools = mcpManager ? mcpManager.getAllAvailableTools() : [];
		const toolsByServer = new Map<string, typeof allMCPTools>();
		allMCPTools.forEach((tool: any) => {
			if (!toolsByServer.has(tool.server)) {
				toolsByServer.set(tool.server, []);
			}
			toolsByServer.get(tool.server)!.push(tool);
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
			
			// Header with title and global toggle in one line
			const headerRow = serversContainer.createDiv({ cls: 'llmsider-tools-header-row' });
			const mcpHeader = headerRow.createDiv({ cls: 'llmsider-tools-section-header' });
			mcpHeader.textContent = this.i18n.t('ui.mcpServersHeader');
			
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
			
			// Individual servers with their tools
			toolsByServer.forEach((tools, serverId) => {
				const serverStatus = mcpManager!.getServerStatus(serverId);
				const canExpand = serverStatus === 'connected' && tools.length > 0;
				
				// Server card - add connection status class
				const serverCard = serversContainer.createDiv({ cls: 'llmsider-mcp-server-card' });
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
				
				// Server name container (removed status icon)
				const serverNameContainer = serverInfo.createDiv({ cls: 'llmsider-mcp-server-name' });
				const displayName = serverNameContainer.createDiv({ cls: 'mcp-server-display-name' });
				displayName.textContent = serverId;
				
				const serverIdText = serverNameContainer.createDiv({ cls: 'mcp-server-id' });
				serverIdText.textContent = serverId;
				
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
						
						new Notice(`Server "${serverId}" ${enabled ? 'enabled and connected' : 'disabled and disconnected'}`);
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
					tools.forEach((tool: any) => {
						const toolItem = toolsList.createDiv({ cls: 'llmsider-mcp-tool-item' });
						
						// Tool indicator dot
						const toolDot = toolItem.createDiv({ cls: 'tool-dot' });
						
						// Tool info
						const toolInfo = toolItem.createDiv({ cls: 'tool-info' });
						const toolName = toolInfo.createDiv({ cls: 'tool-name' });
						toolName.textContent = tool.name;
						
						if (tool.description) {
							const toolDesc = toolInfo.createDiv({ cls: 'tool-description' });
							toolDesc.textContent = tool.description;
						}
						
						// Tool enable/disable switch
						const toolSwitch = this.createToggleSwitch(
							mcpManager!.isToolEnabled(serverId, tool.name),
							async (enabled) => {
								await mcpManager!.setToolEnabled(serverId, tool.name, enabled);
								new Notice(`Tool "${tool.name}" ${enabled ? 'enabled' : 'disabled'}`);
								// Update UI without closing dropdown
								const dotColor = enabled ? 'var(--interactive-accent)' : 'var(--text-muted)';
								toolDot.style.background = dotColor;
							}
						);
						toolItem.appendChild(toolSwitch);
						
						// Set initial dot color based on enabled state
						const isToolEnabled = mcpManager!.isToolEnabled(serverId, tool.name);
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
	private createToggleSwitch(isEnabled: boolean, onChange: (enabled: boolean) => Promise<void>): HTMLElement {
		const switchContainer = document.createElement('div');
		switchContainer.className = 'llmsider-tools-switch-container';
		
		const switchEl = switchContainer.createDiv({ cls: `llmsider-tools-switch ${isEnabled ? 'active' : ''}` });
		const switchThumb = switchEl.createDiv({ cls: 'llmsider-tools-switch-thumb' });
		
		switchEl.onclick = async (e) => {
			e.stopPropagation();
			const newState = !switchEl.hasClass('active');
			await onChange(newState);
			
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
	private areAllBuiltInToolsEnabled(allTools: any[]): boolean {
		const builtInTools = this.plugin.settings.builtInToolsPermissions || {};
		const result = allTools.every((tool: any) => {
			const toolId = tool.id || tool.name;
			const permission = builtInTools[toolId];
			return permission === undefined ? true : permission === true;
		});
		Logger.debug('areAllBuiltInToolsEnabled:', result, 'permissions:', builtInTools);
		return result;
	}
	
	/**
	 * Toggle all built-in tools
	 */
	private async toggleAllBuiltInTools(enabled: boolean, allTools: any[]): Promise<void> {
		if (!this.plugin.settings.builtInToolsPermissions) {
			this.plugin.settings.builtInToolsPermissions = {};
		}
		
		allTools.forEach((tool: any) => {
			const toolId = tool.id || tool.name;
			this.plugin.settings.builtInToolsPermissions[toolId] = enabled;
		});
		
		await this.plugin.saveSettings();
		const statusText = enabled ? this.i18n.t('ui.toolEnabled') : this.i18n.t('ui.toolDisabled');
		new Notice(`${this.i18n.t('ui.allBuiltInTools')} ${statusText}`);
	}
	
	/**
	 * Check if all tools in a category are enabled
	 */
	private areAllCategoryToolsEnabled(tools: any[]): boolean {
		const builtInTools = this.plugin.settings.builtInToolsPermissions || {};
		return tools.every((tool: any) => {
			const toolId = tool.id || tool.name;
			const permission = builtInTools[toolId];
			return permission === undefined ? true : permission === true;
		});
	}
	
	/**
	 * Toggle all tools in a category
	 */
	private async toggleCategoryTools(category: string, tools: any[], enabled: boolean): Promise<void> {
		if (!this.plugin.settings.builtInToolsPermissions) {
			this.plugin.settings.builtInToolsPermissions = {};
		}
		
		tools.forEach((tool: any) => {
			const toolId = tool.id || tool.name;
			this.plugin.settings.builtInToolsPermissions[toolId] = enabled;
		});
		
		await this.plugin.saveSettings();
		const statusText = enabled ? this.i18n.t('ui.toolEnabled') : this.i18n.t('ui.toolDisabled');
		const categoryName = this.getCategoryDisplayName(category);
		new Notice(`${categoryName} ${statusText}`);
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
		
		new Notice(`All MCP servers ${enabled ? 'enabled and connected' : 'disabled and disconnected'}`);
	}

	/**
	 * Build conversation mode selector (Normal / Guided / Agent)
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
			this.showModeDropdown(modeBtn);
		};
		
		return modeSelector;
	}
	
	/**
	 * Get SVG icon for conversation mode
	 */
	private getModeIconSVG(mode: ConversationMode): string {
		const svgs = {
			normal: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
			</svg>`,
			guided: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<circle cx="12" cy="12" r="6"></circle>
				<circle cx="12" cy="12" r="2"></circle>
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

	/**
	 * Show mode selection dropdown
	 */
	private showModeDropdown(button: HTMLElement): void {
		// Remove existing dropdown if any
		document.querySelectorAll('.llmsider-mode-dropdown').forEach(el => el.remove());
		
		// Close other menus (mutual exclusion)
		document.querySelectorAll('.llmsider-tools-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-mcp-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-provider-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-context-menu').forEach(el => el.remove());
		
		// Create dropdown
		const dropdown = document.body.createDiv({ cls: 'llmsider-mode-dropdown' });
		
		// Position dropdown ABOVE button
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'fixed';
		dropdown.style.left = `${buttonRect.left}px`;
		dropdown.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`; // Position above button
		dropdown.style.zIndex = '99999';
		
		// Mode options
		const modes: Array<{ value: ConversationMode; label: string; description: string }> = [
			{
				value: 'normal',
				label: this.i18n.t('ui.normalMode'),
				description: this.i18n.t('ui.normalModeDesc')
			},
			{
				value: 'guided',
				label: this.i18n.t('ui.guidedMode'),
				description: this.i18n.t('ui.guidedModeDesc')
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
				btn.classList.remove('mode-guided', 'mode-agent');
				btn.classList.add('mode-normal');
				break;
			case 'guided':
				title = this.i18n.t('ui.guidedMode');
				btn.classList.remove('mode-normal', 'mode-agent');
				btn.classList.add('mode-guided');
				break;
			case 'agent':
				title = this.i18n.t('ui.agentMode');
				btn.classList.remove('mode-normal', 'mode-guided');
				btn.classList.add('mode-agent');
				break;
		}
		
		btn.innerHTML = `<span class="mode-icon">${this.getModeIconSVG(mode)}</span>`;
		btn.title = title;
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
		
		// Icon for provider/model - sparkle/AI icon
		const providerIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M12 3l2.5 7.5L22 13l-7.5 2.5L12 23l-2.5-7.5L2 13l7.5-2.5L12 3z"/>
			<path d="M6 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>
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
		
		// Position dropdown ABOVE button
		const buttonRect = button.getBoundingClientRect();
		dropdown.style.position = 'fixed';
		dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
		dropdown.style.bottom = `${window.innerHeight - buttonRect.top + 8}px`;
		dropdown.style.zIndex = '99999';
		
		// Get providers from settings
		const connections = this.plugin.settings.connections || [];
		const models = this.plugin.settings.models || [];
		const activeProvider = this.plugin.settings.activeProvider;
		
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
			const connectionModels = models.filter((m: LLMModel) => m.connectionId === connection.id && m.enabled);
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
			// Update the hidden select element for compatibility
			selectElement.value = providerId;
			
			// Trigger change event on the select element
			const event = new Event('change', { bubbles: true });
			selectElement.dispatchEvent(event);
			
			// Update button appearance
			this.updateProviderButton();
		} catch (error) {
			Logger.error('Failed to change provider:', error);
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
	updateModeButton(currentMode?: any): void {
		// Update Agent button state in all locations (for compatibility)
		this.updateAgentButton();
		this.updateAgentButtonInProviderRow();
		this.updateAgentButtonInControlsRow();
		this.updateAgentButtonInline();
		// Update mode selector button
		this.updateModeSelectorButton();
	}
	
	/**
	 * Update Provider button appearance (public method)
	 */
	updateProviderButtonPublic(): void {
		this.updateProviderButton();
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
			// Save to SQLite instead of settings
			await this.plugin.configDb.setConfigValue('conversationMode', mode);
			
			// Update in-memory settings for current session
			this.plugin.settings.conversationMode = mode;
			// Update legacy agentMode for backward compatibility
			this.plugin.settings.agentMode = (mode === 'agent');

			// Update button appearance
			this.updateModeSelectorButton();
			
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
		window.dispatchEvent(new CustomEvent('llmsider-show-history'));
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

			// Construct prompt for title generation
			const titlePrompt = `Based on the following conversation, generate a concise, descriptive title that captures the main topic or question. The title should be:
- Maximum 10 Chinese characters OR 30 English letters/numbers
- Clear and informative
- Return ONLY the title, no quotes or additional text

User: ${userMessage.substring(0, 200)}
Assistant: ${assistantMessage.substring(0, 300)}`;

			const titleMessages = [{
				id: 'title-gen-' + Date.now(),
				role: 'user' as const,
				content: titlePrompt,
				timestamp: Date.now()
			}];

			// Generate title using AI
			let titleContent = '';
			await provider.sendStreamingMessage(titleMessages, (chunk) => {
				if (chunk.delta) {
					titleContent += chunk.delta;
				}
			});

			if (!titleContent.trim()) {
				return 'Untitled';
			}

			// Clean up the generated title
			let generatedTitle = titleContent.trim()
				.replace(/^["']|["']$/g, '') // Remove quotes
				.replace(/\n/g, ' ') // Replace newlines with spaces
				.trim();

			// Apply smart length limit: 10 Chinese chars OR 30 English/numbers
			let chineseCount = 0;
			let englishCount = 0;
			let result = '';
			
			for (const char of generatedTitle) {
				if (/[\u4e00-\u9fa5]/.test(char)) {
					// Chinese character
					if (chineseCount + englishCount >= 10 && chineseCount > 0) break;
					chineseCount++;
				} else if (/[a-zA-Z0-9]/.test(char)) {
					// English letter or number
					if (englishCount >= 30 || (chineseCount > 0 && chineseCount + englishCount >= 10)) break;
					englishCount++;
				}
				result += char;
			}

			generatedTitle = result.trim() || generatedTitle.substring(0, 30);
			Logger.debug('Generated session title:', generatedTitle);
			
			return generatedTitle || 'Untitled';
		} catch (error) {
			Logger.error('Failed to generate session name:', error);
			return 'Untitled';
		}
	}

	/**
	 * Update context search button state (public method for external calls)
	 */
	public refreshContextSearchButton(): void {
		this.updateContextSearchButton();
	}
}