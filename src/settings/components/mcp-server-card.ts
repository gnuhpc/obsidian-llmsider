import { Notice } from 'obsidian';
import { I18nManager } from '../../i18n/i18n-manager';
import { getMCPServerIcon } from '../utils/mcp-utils';
import { MCPHandler } from '../handlers/mcp-handler';
import { ToolButtonControls } from './tool-button-controls';
import { ToolPermissionHandler } from '../handlers/tool-permission-handler';
import LLMSiderPlugin from '../../main';
import { Logger } from '../../utils/logger';

/**
 * MCPServerCard component handles rendering of MCP server cards
 * Used in the main MCP settings section
 */
export class MCPServerCard {
	private i18n: I18nManager;
	private mcpHandler: MCPHandler;
	private toolButtonControls: ToolButtonControls;
	private plugin: LLMSiderPlugin;
	private toolPermissionHandler: ToolPermissionHandler;

	constructor(
		i18n: I18nManager,
		mcpHandler: MCPHandler,
		toolButtonControls: ToolButtonControls,
		plugin: LLMSiderPlugin,
		toolPermissionHandler: ToolPermissionHandler
	) {
		this.i18n = i18n;
		this.mcpHandler = mcpHandler;
		this.toolButtonControls = toolButtonControls;
		this.plugin = plugin;
		this.toolPermissionHandler = toolPermissionHandler;
	}

	/**
	 * Render MCP server card with connection controls
	 */
	render(
		container: HTMLElement,
		serverId: string,
		serverConfig: unknown,
		isConnected: boolean,
		health: { lastCheck: number; status: 'healthy' | 'degraded' | 'unhealthy'; errors: string[] } | null,
		tools: unknown[],
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
		this.renderServerInfo(topRow, serverId, isConnected, tools.length);

		// Mode toggle (auto/manual)
		this.renderModeToggle(topRow, serverId, mcpManager);

		// Action buttons row
		this.renderActionButtons(topRow, serverId, isConnected, tools, mcpManager, card, toolDetailsRow);
	}

	/**
	 * Render server icon with delete button overlay
	 */
	private renderIconWithDelete(topRow: HTMLElement, serverId: string, serverConfig: unknown): void {
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
	private renderServerInfo(topRow: HTMLElement, serverId: string, isConnected: boolean, toolCount: number): void {
		const infoContainer = topRow.createDiv({ cls: 'llmsider-mcp-info-container' });

		// Name row
		const displayName = serverId.length > 23 ? serverId.substring(0, 23) + '...' : serverId;
		infoContainer.createEl('div', {
			text: displayName,
			cls: 'llmsider-mcp-card-name',
			title: serverId // Show full name on hover
		});

		// Stats/Chips row
		const statsRow = infoContainer.createDiv({ cls: 'llmsider-mcp-card-stats-row' });
		statsRow.createEl('span', {
			text: `${toolCount} ${this.i18n.t('settingsPage.toolCount')}`,
			cls: 'llmsider-settings-card-chip'
		});

		statsRow.createEl('span', {
			text: isConnected ? this.i18n.t('mcp.connected') : this.i18n.t('mcp.serverDisconnected'),
			cls: `llmsider-settings-card-chip ${isConnected ? 'is-success' : 'is-muted'}`
		});
	}

	/**
	 * Render mode toggle (auto/manual)
	 */
	private renderModeToggle(topRow: HTMLElement, serverId: string, mcpManager: any): void {
		const toggleContainer = topRow.createDiv({
			cls: 'llmsider-category-toggle',
			attr: { title: this.i18n.t('settingsPage.autoStart') || 'Auto start' }
		});
		const toggleSwitch = toggleContainer.createDiv({ cls: 'llmsider-toggle-switch' });
		toggleSwitch.createDiv({ cls: 'llmsider-toggle-thumb' });

		const isAutoConnect = mcpManager.getServerAutoConnect(serverId);
		if (isAutoConnect) {
			toggleSwitch.addClass('active');
		}

		toggleSwitch.addEventListener('click', async (e) => {
			e.stopPropagation();
			const currentState = toggleSwitch.hasClass('active');
			const newState = !currentState;

			await mcpManager.setServerAutoConnect(serverId, newState);

			if (newState) {
				toggleSwitch.addClass('active');
			} else {
				toggleSwitch.removeClass('active');
			}

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
		tools: unknown[],
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
		tools: unknown[],
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
		tools: unknown[],
		mcpManager: any
	): void {
		const detailHeader = container.createDiv({ cls: 'llmsider-settings-detail-header' });
		const detailCopy = detailHeader.createDiv({ cls: 'llmsider-settings-detail-copy' });
		detailCopy.createEl('h4', {
			text: serverId,
			cls: 'llmsider-settings-detail-title'
		});
		detailCopy.createEl('p', {
			text: this.i18n.t('settingsPage.toolManagement.availableTools'),
			cls: 'llmsider-settings-detail-caption'
		});
		detailHeader.createEl('span', {
			text: `${tools.length} ${this.i18n.t('settingsPage.toolCount')}`,
			cls: 'llmsider-settings-detail-count'
		});

		const toolsGrid = container.createDiv({ cls: 'llmsider-settings-tool-grid' });

		tools.forEach((tool) => {
			const typedTool = tool as { name: string; description?: string; inputSchema?: Record<string, unknown> };
			const isToolEnabled = mcpManager.getToolEnabled(serverId, typedTool.name);
			const requireConfirmation = mcpManager.getToolRequireConfirmation(serverId, typedTool.name);
			Logger.debug(`Rendering tool ${typedTool.name}: enabled=${isToolEnabled}, requireConfirmation=${requireConfirmation}`);

			this.renderToolCard(
				toolsGrid,
				typedTool,
				isToolEnabled,
				requireConfirmation,
				async (enabled) => {
					if (enabled && !this.toolPermissionHandler.canEnableMCPTools()) {
						new Notice(this.i18n.t('settingsPage.toolManagement.mcpToolsLimitReached', {
							limit: this.plugin.settings.maxMCPToolsSelection.toString()
						}));
						return false;
					}

					mcpManager.setToolEnabled(serverId, typedTool.name, enabled);
					await this.plugin.saveSettings();
					new Notice(this.i18n.t('settingsPage.toolManagement.toolToggled', {
						name: typedTool.name,
						status: enabled ? this.i18n.t('settingsPage.toolManagement.enabled') : this.i18n.t('settingsPage.toolManagement.disabled')
					}));
					return true;
				},
				async (requireConfirm) => {
					mcpManager.setToolRequireConfirmation(serverId, typedTool.name, requireConfirm);
				}
			);
		});
	}

	private renderToolCard(
		container: HTMLElement,
		tool: { name: string; description?: string; inputSchema?: Record<string, unknown> },
		isToolEnabled: boolean,
		requireConfirmation: boolean,
		onEnableChange: (enabled: boolean) => Promise<boolean>,
		onConfirmationChange: (requireConfirm: boolean) => Promise<void>
	): void {
		const toolItem = container.createDiv({ cls: 'llmsider-settings-tool-card' });
		const mainContent = toolItem.createDiv({ cls: 'llmsider-settings-tool-card-main' });
		const toolInfo = mainContent.createDiv({ cls: 'llmsider-settings-tool-card-info' });

		toolInfo.createEl('h3', { text: tool.name, cls: 'llmsider-settings-tool-card-title' });

		if (tool.description) {
			toolInfo.createEl('p', {
				text: tool.description,
				cls: 'llmsider-settings-tool-card-desc'
			});
		}

		if (tool.inputSchema) {
			const schemaToggle = toolInfo.createEl('details', { cls: 'llmsider-mcp-tool-schema' });
			schemaToggle.createEl('summary', { text: this.i18n.t('settingsPage.viewInputSchema') });
			const schemaContent = schemaToggle.createEl('pre', { cls: 'llmsider-mcp-tool-schema-content' });
			schemaContent.textContent = JSON.stringify(tool.inputSchema, null, 2);
		}

		const controlsContainer = mainContent.createDiv({ cls: 'llmsider-settings-tool-card-actions' });
		this.toolButtonControls.create(
			controlsContainer,
			isToolEnabled,
			requireConfirmation,
			onEnableChange,
			onConfirmationChange
		);
	}
}
