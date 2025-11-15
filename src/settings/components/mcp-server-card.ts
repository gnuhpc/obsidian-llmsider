import { Notice } from 'obsidian';
import { I18nManager } from '../../i18n/i18n-manager';
import { getMCPServerIcon } from '../utils/mcp-utils';
import { MCPHandler } from '../handlers/mcp-handler';
import { ToolButtonControls } from './tool-button-controls';
import LLMSiderPlugin from '../../main';

/**
 * MCPServerCard component handles rendering of MCP server cards
 * Used in the main MCP settings section
 */
export class MCPServerCard {
	private i18n: I18nManager;
	private mcpHandler: MCPHandler;
	private toolButtonControls: ToolButtonControls;
	private plugin: LLMSiderPlugin;

	constructor(
		i18n: I18nManager,
		mcpHandler: MCPHandler,
		toolButtonControls: ToolButtonControls,
		plugin: LLMSiderPlugin
	) {
		this.i18n = i18n;
		this.mcpHandler = mcpHandler;
		this.toolButtonControls = toolButtonControls;
		this.plugin = plugin;
	}

	/**
	 * Render MCP server card with connection controls
	 */
	render(
		container: HTMLElement,
		serverId: string,
		serverConfig: any,
		isConnected: boolean,
		health: { lastCheck: number; status: 'healthy' | 'degraded' | 'unhealthy'; errors: string[] } | null,
		tools: any[],
		mcpManager: any,
		toolDetailsRow: HTMLElement,
		cardIndex: number = 0
	): void {
		const card = container.createDiv({ cls: 'llmsider-mcp-server-card' });
		card.setAttribute('data-server-id', serverId);
		card.style.order = String(cardIndex * 2);
		
		// Add connection status class
		if (isConnected) {
			card.addClass('mcp-server-connected');
		} else {
			card.addClass('mcp-server-disconnected');
		}

		const cardContent = card.createDiv({ cls: 'llmsider-mcp-card-content' });
		const topRow = cardContent.createDiv({ cls: 'llmsider-mcp-card-top' });

		// Server icon with delete button overlay
		this.renderIconWithDelete(topRow, serverId, serverConfig);
		
		// Server name
		this.renderServerInfo(topRow, serverId);
		
		// Mode toggle (auto/manual)
		this.renderModeToggle(topRow, serverId, mcpManager);
		
		// Action buttons row
		this.renderActionButtons(topRow, serverId, isConnected, tools, mcpManager, card, toolDetailsRow);
	}

	/**
	 * Render server icon with delete button overlay
	 */
	private renderIconWithDelete(topRow: HTMLElement, serverId: string, serverConfig: any): void {
		const iconContainer = topRow.createDiv({ cls: 'llmsider-mcp-icon-container' });
		
		const serverIcon = iconContainer.createDiv({ cls: 'llmsider-mcp-server-icon' });
		serverIcon.innerHTML = getMCPServerIcon(serverConfig);
		
		const deleteIcon = iconContainer.createDiv({ cls: 'llmsider-mcp-delete-icon' });
		deleteIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
		deleteIcon.title = this.i18n.t('settingsPage.deleteMCPServer') || 'Delete server';
		deleteIcon.addEventListener('click', async (e) => {
			e.stopPropagation();
			await this.mcpHandler.deleteMCPServer(serverId);
		});
	}

	/**
	 * Render server name and info
	 */
	private renderServerInfo(topRow: HTMLElement, serverId: string): void {
		const infoContainer = topRow.createDiv({ cls: 'llmsider-mcp-info-container' });
		infoContainer.createEl('h3', { 
			text: serverId,
			cls: 'llmsider-mcp-card-name'
		});
	}

	/**
	 * Render mode toggle (auto/manual)
	 */
	private renderModeToggle(topRow: HTMLElement, serverId: string, mcpManager: any): void {
		const isAutoConnect = mcpManager.getServerAutoConnect(serverId);
		const modeToggle = topRow.createEl('button', {
			cls: 'llmsider-mcp-mode-toggle',
			title: isAutoConnect ? 
				this.i18n.t('settingsPage.autoStart') || 'Auto start' : 
				this.i18n.t('settingsPage.manualStart') || 'Manual start'
		});
		
		// Zap icon for auto, Hand icon for manual
		const zapIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
		const handIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>`;
		
		modeToggle.innerHTML = isAutoConnect ? zapIcon : handIcon;
		
		modeToggle.addEventListener('click', async (e) => {
			e.stopPropagation();
			const currentState = mcpManager.getServerAutoConnect(serverId);
			const newState = !currentState;
			await mcpManager.setServerAutoConnect(serverId, newState);
			
			// Update icon
			modeToggle.innerHTML = newState ? zapIcon : handIcon;
			modeToggle.title = newState ? 
				this.i18n.t('settingsPage.autoStart') || 'Auto start' : 
				this.i18n.t('settingsPage.manualStart') || 'Manual start';
			
			new Notice(this.i18n.t('settingsPage.mcpAutoConnectChanged', { 
				server: serverId, 
				status: newState ? this.i18n.t('settingsPage.autoConnect') : this.i18n.t('settingsPage.manualConnect') 
			}) || `${serverId} will ${newState ? 'auto-connect' : 'not auto-connect'} on startup`);
		});
	}

	/**
	 * Render action buttons (tools, connect/disconnect)
	 */
	private renderActionButtons(
		topRow: HTMLElement,
		serverId: string,
		isConnected: boolean,
		tools: any[],
		mcpManager: any,
		card: HTMLElement,
		toolDetailsRow: HTMLElement
	): void {
		const actionsRow = topRow.createDiv({ cls: 'llmsider-mcp-card-actions' });

		// Tools button (only when connected and has tools)
		if (isConnected && tools.length > 0) {
			this.renderToolsButton(actionsRow, serverId, tools, mcpManager, card, toolDetailsRow);
		}

		// Connect/Disconnect button
		this.renderConnectionButton(actionsRow, serverId, isConnected);
	}

	/**
	 * Render tools button
	 */
	private renderToolsButton(
		actionsRow: HTMLElement,
		serverId: string,
		tools: any[],
		mcpManager: any,
		card: HTMLElement,
		toolDetailsRow: HTMLElement
	): void {
		const toolsBtn = actionsRow.createEl('button', {
			cls: 'llmsider-mcp-action-btn llmsider-tools-btn',
			title: this.i18n.t('settingsPage.showTools') || 'Tools'
		});
		toolsBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
		
		toolsBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			const gridContainer = card.parentElement;
			if (!gridContainer) return;
			
			const currentToolDetailsRow = gridContainer.querySelector('.llmsider-mcp-tool-details-row') as HTMLElement;
			if (!currentToolDetailsRow) return;
			
			// Check if this server's tools are currently visible
			const currentlyVisible = currentToolDetailsRow.style.display === 'block' && 
				currentToolDetailsRow.getAttribute('data-server-id') === serverId;
			
			// Clear and hide tool details row
			currentToolDetailsRow.innerHTML = '';
			currentToolDetailsRow.style.display = 'none';
			
			// If clicking the same card, just hide; otherwise show new tools
			if (!currentlyVisible) {
				currentToolDetailsRow.setAttribute('data-server-id', serverId);
				
				// Get all cards and set order
				const allCards = gridContainer.querySelectorAll('.llmsider-mcp-server-card');
				const allCardsArray = Array.from(allCards);
				const cardIndex = allCardsArray.indexOf(card);
				
				// Reset all cards to their natural order
				allCardsArray.forEach((c, idx) => {
					(c as HTMLElement).style.order = String(idx * 2);
				});
				
				// Set tool details row order
				currentToolDetailsRow.style.order = String(cardIndex * 2 + 1);
				
				// Render tools
				this.renderTools(currentToolDetailsRow, serverId, tools, mcpManager);
				
				currentToolDetailsRow.style.display = 'block';
			}
		});
	}

	/**
	 * Render connection button
	 */
	private renderConnectionButton(actionsRow: HTMLElement, serverId: string, isConnected: boolean): void {
		const connectionBtn = actionsRow.createEl('button', {
			cls: `llmsider-mcp-action-btn ${isConnected ? 'llmsider-disconnect-btn' : 'llmsider-connect-btn'}`,
			title: isConnected ? 
				this.i18n.t('settingsPage.disconnect') || 'Disconnect' : 
				this.i18n.t('settingsPage.connect') || 'Connect'
		});
		
		connectionBtn.innerHTML = isConnected ?
			`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>` :
			`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
		
		connectionBtn.addEventListener('click', async () => {
			await this.mcpHandler.toggleMCPServerConnection(serverId, isConnected);
		});
	}

	/**
	 * Render tools in the details row
	 */
	private renderTools(
		container: HTMLElement,
		serverId: string,
		tools: any[],
		mcpManager: any
	): void {
		tools.forEach((tool) => {
			const isToolEnabled = mcpManager.getToolEnabled(serverId, tool.name);
			const requireConfirmation = mcpManager.getToolRequireConfirmation(serverId, tool.name);
			
			// Modern tool card
			const toolItem = container.createDiv({ cls: 'llmsider-modern-tool-card' });
			toolItem.style.cssText = `
				position: relative !important;
				overflow: hidden !important;
				border-radius: 8px !important;
				border: 1px solid var(--background-modifier-border) !important;
				background: var(--background-primary) !important;
				padding: 16px !important;
				transition: all 0.2s ease !important;
				margin-bottom: 12px !important;
				display: block !important;
				width: 100% !important;
				box-sizing: border-box !important;
			`;
			
			toolItem.addEventListener('mouseenter', () => {
				toolItem.style.borderColor = 'var(--interactive-accent)';
				toolItem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
			});
			toolItem.addEventListener('mouseleave', () => {
				toolItem.style.borderColor = 'var(--background-modifier-border)';
				toolItem.style.boxShadow = 'none';
			});

			// Main content container
			const mainContent = toolItem.createDiv({ cls: 'llmsider-modern-tool-main' });
			mainContent.style.cssText = 'display: flex !important; align-items: start !important; justify-content: space-between !important; gap: 16px !important;';

			// Left side: Tool info
			const toolInfo = mainContent.createDiv({ cls: 'llmsider-modern-tool-info' });
			toolInfo.style.cssText = 'flex: 1 !important; min-width: 0 !important;';

			const toolName = toolInfo.createEl('h3', { text: tool.name });
			toolName.style.cssText = 'margin: 0 0 4px 0 !important; font-size: 14px !important; font-weight: 600 !important; color: var(--text-normal) !important;';

			if (tool.description) {
				const toolDesc = toolInfo.createEl('p', { text: tool.description });
				toolDesc.style.cssText = 'margin: 0 !important; font-size: 13px !important; line-height: 1.5 !important; color: var(--text-muted) !important;';
			}

			// Tool schema info (collapsible)
			if (tool.inputSchema) {
				const schemaToggle = toolInfo.createEl('details', { cls: 'llmsider-mcp-tool-schema' });
				schemaToggle.style.cssText = 'margin-top: 12px;';
				schemaToggle.createEl('summary', { text: this.i18n.t('settingsPage.viewInputSchema') });
				const schemaContent = schemaToggle.createEl('pre', { cls: 'llmsider-mcp-tool-schema-content' });
				schemaContent.textContent = JSON.stringify(tool.inputSchema, null, 2);
			}

			// Right side: Controls
			const controlsContainer = mainContent.createDiv({ cls: 'llmsider-modern-tool-controls' });
			controlsContainer.style.cssText = 'display: flex !important; flex-direction: column !important; gap: 10px !important; flex-shrink: 0 !important;';

			// Use helper method to create button controls
			this.toolButtonControls.create(
				controlsContainer,
				isToolEnabled,
				requireConfirmation,
				async (enabled) => {
					mcpManager.setToolEnabled(serverId, tool.name, enabled);
					await this.plugin.saveSettings();
					new Notice(this.i18n.t('settingsPage.toolManagement.toolToggled', {
						name: tool.name,
						status: enabled ? this.i18n.t('settingsPage.toolManagement.enabled') : this.i18n.t('settingsPage.toolManagement.disabled')
					}));
				},
				async (requireConfirm) => {
					mcpManager.setToolRequireConfirmation(serverId, tool.name, requireConfirm);
				}
			);
		});
	}
}
