import { setIcon } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { MCPHandler } from '../handlers/mcp-handler';
import type { ToolPermissionHandler } from '../handlers/tool-permission-handler';
import { MCPServerCard } from '../components/mcp-server-card';
import { MCPServerDetails } from '../components/mcp-server-details';

/**
 * MCPSettingsRenderer
 * Handles rendering of MCP Settings section including:
 * - MCP Settings section header and search
 * - MCP Servers list with filtering
 * - MCP Actions (toggle all servers)
 * - MCP Status display
 * - MCP Batch Actions (enable/disable/reset all MCP tools)
 * - MCP Tool Management section
 * - MCP Tools Management (tools by server)
 * - MCP Tools Actions
 * - MCP Controls (inline editor wrapper)
 */
export class MCPSettingsRenderer {
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;
	private mcpHandler: MCPHandler;
	private toolPermissionHandler: ToolPermissionHandler;
	private mcpServerCard: MCPServerCard;
	private mcpServerDetails: MCPServerDetails;

	constructor(
		plugin: LLMSiderPlugin,
		i18n: I18nManager,
		mcpHandler: MCPHandler,
		toolPermissionHandler: ToolPermissionHandler,
		mcpServerCard: MCPServerCard,
		mcpServerDetails: MCPServerDetails
	) {
		this.plugin = plugin;
		this.i18n = i18n;
		this.mcpHandler = mcpHandler;
		this.toolPermissionHandler = toolPermissionHandler;
		this.mcpServerCard = mcpServerCard;
		this.mcpServerDetails = mcpServerDetails;
	}

	/**
	 * Main entry point - renders the complete MCP Settings section
	 */
	renderMCPSettings(containerEl: HTMLElement): void {
		// MCP Settings Section header (outside border)
		const mcpHeader = containerEl.createEl('h2', { text: this.i18n.t('settingsPage.mcpSettings') });
		mcpHeader.style.marginTop = '20px';
		mcpHeader.style.marginBottom = '12px';
		mcpHeader.style.fontSize = '16px';
		mcpHeader.style.fontWeight = '600';
		
		// 使用统一的 settings-section-container 样式 - 包含筛选器和按钮
		const mcpContainer = containerEl.createDiv({ cls: 'llmsider-settings-section-container llmsider-mcp-container' });

		// Top controls row (inside border): search input and action buttons
		const topControlsRow = mcpContainer.createDiv({ cls: 'llmsider-builtin-tools-header-container' });
		topControlsRow.style.display = 'flex';
		topControlsRow.style.alignItems = 'center';
		topControlsRow.style.justifyContent = 'space-between';
		topControlsRow.style.marginBottom = '16px';
		topControlsRow.style.marginTop = '0';
		topControlsRow.style.gap = '12px';
		
		// Search input (left side)
		const searchInput = topControlsRow.createEl('input', {
			type: 'text',
			placeholder: this.i18n.t('ui.searchMCPServers') || 'Filter MCP servers...',
			cls: 'llmsider-builtin-tools-search-input'
		});
		searchInput.style.flex = '1';
		searchInput.style.padding = '8px 12px';
		searchInput.style.borderRadius = '4px';
		searchInput.style.border = '1px solid var(--background-modifier-border)';
		searchInput.style.background = 'var(--background-primary)';
		
		// Action buttons container (right side)
		const actionsContainer = topControlsRow.createDiv({ cls: 'llmsider-builtin-tools-actions' });
		actionsContainer.style.display = 'flex';
		actionsContainer.style.gap = '8px';
		actionsContainer.style.alignItems = 'center';
		this.renderMCPActions(actionsContainer);
		
		// Server list container
		const serversListContainer = mcpContainer.createDiv({ cls: 'llmsider-mcp-servers-list-container' });

		// Store search input reference for filtering
		let currentFilterText = '';

		// Render MCP servers with current filter
		this.renderMCPServersList(serversListContainer, currentFilterText);
		
		// Add search input event listener
		searchInput.addEventListener('input', (e) => {
			currentFilterText = (e.target as HTMLInputElement).value;
			serversListContainer.empty();
			this.renderMCPServersList(serversListContainer, currentFilterText);
		});

		// Controls section (import/export, connection controls, settings) - moved to bottom
		// NOTE: renderInlineMCPEditor is called from the parent settings.ts
	}

	/**
	 * Renders the MCP servers list with optional filtering
	 */
	renderMCPServersList(container: HTMLElement, filterText: string = ''): void {
		// Get MCP Manager state
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			container.createEl('p', { 
				text: this.i18n.t('settingsPage.mcpManagerNotInitialized'),
				cls: 'llmsider-mcp-status-error'
			});
			return;
		}

		const state = mcpManager.getState();
		const serverConfigs = state.serversConfig.mcpServers;
		const connectedServers = state.connectedServers;
		let serverIds = Object.keys(serverConfigs);

		// Filter servers if search text provided
		if (filterText) {
			const lowerFilter = filterText.toLowerCase();
			serverIds = serverIds.filter(serverId => 
				serverId.toLowerCase().includes(lowerFilter)
			);
		}

		// Show no results message if nothing matches
		if (filterText && serverIds.length === 0) {
			const noResultsState = container.createDiv({ cls: 'llmsider-mcp-empty-state' });
			noResultsState.style.padding = '20px';
			noResultsState.style.textAlign = 'center';
			noResultsState.style.background = 'var(--background-secondary)';
			noResultsState.style.borderRadius = '4px';
			noResultsState.createEl('p', {
				text: this.i18n.t('ui.noMatchingServers') || 'No matching MCP servers found',
				cls: 'llmsider-empty-text'
			}).style.color = 'var(--text-muted)';
			return;
		}

		// Server cards grid - tool details row is part of the grid
		if (serverIds.length > 0) {
			const serversGrid = container.createDiv({ cls: 'llmsider-mcp-servers-grid' });
			
			// Tool details row - full width, shown below the clicked card's row, part of grid
			const toolDetailsRow = serversGrid.createDiv({ cls: 'llmsider-mcp-tool-details-row' });
			toolDetailsRow.style.display = 'none';
			toolDetailsRow.style.gridColumn = '1 / -1'; // Span all columns
			toolDetailsRow.style.order = '9999'; // Initially at the end
			
			serverIds.forEach((serverId, index) => {
				const serverConfig = serverConfigs[serverId];
				const isConnected = connectedServers.has(serverId);
				const health = mcpManager.getServerHealth(serverId);
				// Get all tools and filter by server
				const allTools = mcpManager.getAllAvailableTools();
				const tools = allTools.filter((tool: any) => tool.server === serverId);
				
				this.mcpServerCard.render(serversGrid, serverId, serverConfig, isConnected, health, tools, mcpManager, toolDetailsRow, index);
			});
		} else {
			const emptyState = container.createDiv({ cls: 'llmsider-mcp-empty-state' });
			emptyState.createEl('p', { 
				text: this.i18n.t('settingsPage.noMCPServersConfigured'),
				cls: 'llmsider-empty-text'
			});
		}
	}

	/**
	 * Renders the MCP Actions section (toggle all servers)
	 */
	renderMCPActions(container: HTMLElement): void {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			return;
		}

		// "Enable/Disable All" toggle switch
		const actionRow = container.createDiv({ cls: 'llmsider-mcp-action-row' });
		actionRow.style.display = 'flex';
		actionRow.style.alignItems = 'center';
		actionRow.style.gap = '8px';

		const label = actionRow.createEl('span', { text: this.i18n.t('ui.toggleAllServers') || 'All Servers' });
		label.style.fontSize = '14px';
		label.style.color = 'var(--text-normal)';

		const state = mcpManager.getState();
		const serverIds = Object.keys(state.serversConfig.mcpServers);
		const allEnabled = serverIds.every(id => mcpManager.isServerEnabled(id));

		const toggleSwitch = actionRow.createEl('label', { cls: 'llmsider-toggle-switch' });
		const checkbox = toggleSwitch.createEl('input', { type: 'checkbox' });
		checkbox.checked = allEnabled;
		toggleSwitch.createEl('span', { cls: 'llmsider-toggle-slider' });

		checkbox.addEventListener('change', async () => {
			const enable = checkbox.checked;
			for (const serverId of serverIds) {
				await mcpManager.setServerEnabled(serverId, enable);
			}
			await this.plugin.saveSettings();
		});
	}

	/**
	 * Renders the MCP Status display
	 */
	renderMCPStatus(container: HTMLElement): void {
		container.empty();
		
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			container.createEl('p', { 
				text: this.i18n.t('settingsPage.mcpManagerNotInitialized'),
				cls: 'llmsider-mcp-status-error'
			});
			return;
		}

		const connectedServers = mcpManager.getConnectedServers();
		const statusEl = container.createEl('div', { cls: 'llmsider-mcp-status-info' });
		
		if (connectedServers.length === 0) {
			statusEl.createEl('span', { 
				text: this.i18n.t('settingsPage.noServersConnected'),
				cls: 'llmsider-mcp-status-disconnected'
			});
		} else {
			statusEl.createEl('span', { 
				text: `🟢 ${connectedServers.length} server(s) connected`,
				cls: 'llmsider-mcp-status-connected'
			});
		}

		// List connected servers
		if (connectedServers.length > 0) {
			const serverList = container.createEl('ul', { cls: 'llmsider-mcp-server-list' });
			connectedServers.forEach(serverId => {
				const listItem = serverList.createEl('li');
				listItem.createEl('span', { text: `📡 ${serverId}` });
			});
		}
	}

	/**
	 * Renders batch actions for MCP tools (enable/disable/reset all MCP tools)
	 */
	renderMCPBatchActions(container: HTMLElement): void {
		const actionsContainer = container.createDiv({ cls: 'llmsider-mcp-batch-actions' });

		const enableMCPBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-enable-mcp-btn',
			title: this.i18n.t('settingsPage.toolManagement.enableAllMCPDesc')
		});
		enableMCPBtn.innerHTML = '🔧';
		enableMCPBtn.onclick = () => this.toolPermissionHandler.enableAllMCPTools();

		const disableMCPBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-disable-mcp-btn',
			title: this.i18n.t('settingsPage.toolManagement.disableAllMCPDesc')
		});
		disableMCPBtn.innerHTML = '🚫';
		disableMCPBtn.onclick = () => this.toolPermissionHandler.disableAllMCPTools();

		const resetMCPBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-reset-mcp-btn',
			title: this.i18n.t('settingsPage.toolManagement.resetMCPDesc')
		});
		resetMCPBtn.innerHTML = '🔄';
		resetMCPBtn.onclick = () => this.toolPermissionHandler.resetMCPToolPermissions();
	}

	/**
	 * Renders the Tool Management section header with inline batch actions
	 */
	renderMCPToolManagement(container: HTMLElement): void {
		const toolManagementSection = container.createDiv({ cls: 'llmsider-mcp-tool-management-section' });

		// Section header with inline layout - title and buttons on same line
		const toolManagementHeader = toolManagementSection.createDiv({ cls: 'llmsider-mcp-tool-management-header llmsider-inline-header' });
		toolManagementHeader.style.display = 'flex';
		toolManagementHeader.style.alignItems = 'center';
		toolManagementHeader.style.justifyContent = 'space-between';

		// Title section
		const titleSection = toolManagementHeader.createDiv({ cls: 'llmsider-tool-title-section' });
		titleSection.createEl('h3', { text: this.i18n.t('settingsPage.toolManagement.title'), cls: 'llmsider-mcp-tool-management-title' });

		// Inline batch actions (only enable, disable, reset - no import/export) - aligned to the right
		const inlineBatchActions = toolManagementHeader.createDiv({ cls: 'llmsider-tool-inline-batch-actions' });
		inlineBatchActions.style.marginLeft = 'auto';
		this.renderInlineGlobalBatchActions(inlineBatchActions);

		// Description moved below the header
		const descriptionSection = toolManagementSection.createDiv({ cls: 'llmsider-tool-description-section' });
		descriptionSection.createEl('p', {
			text: this.i18n.t('settingsPage.toolManagement.description'),
			cls: 'llmsider-mcp-tool-management-desc'
		});

		// NOTE: Built-in Tools Section is rendered by builtInToolsRenderer elsewhere
		// This method only renders the Tool Management header and description
	}

	/**
	 * Renders the MCP Tools Management section (tools grouped by server)
	 */
	renderMCPToolsManagement(container: HTMLElement): void {
		const mcpToolsSection = container.createDiv({ cls: 'llmsider-mcp-tools-section' });

		// MCP Tools Section header
		const mcpHeader = mcpToolsSection.createDiv({ cls: 'llmsider-tool-section-header' });
		const mcpHeaderContent = mcpHeader.createDiv({ cls: 'llmsider-tool-header-content' });
		mcpHeaderContent.createEl('h4', {
			text: this.i18n.t('settingsPage.toolManagement.mcpToolsTitle'),
			cls: 'llmsider-tool-section-title'
		});
		mcpHeaderContent.createEl('p', {
			text: this.i18n.t('settingsPage.toolManagement.mcpToolsDescription'),
			cls: 'llmsider-tool-section-desc'
		});

		// MCP Tools batch actions
		const mcpBatchActions = mcpHeader.createDiv({ cls: 'llmsider-section-batch-actions' });
		this.renderMCPBatchActions(mcpBatchActions);

		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			mcpToolsSection.createEl('p', {
				text: this.i18n.t('settingsPage.mcpManagerNotInitialized'),
				cls: 'llmsider-mcp-status-error'
			});
			return;
		}

		// Get all available tools (unfiltered)
		const allTools = mcpManager.getAllAvailableTools();
		const state = mcpManager.getState();
		const connectedServers = state.connectedServers;

		if (allTools.length === 0) {
			const emptyState = mcpToolsSection.createDiv({ cls: 'llmsider-mcp-tool-empty' });
			emptyState.createEl('p', {
				text: this.i18n.t('settingsPage.toolManagement.noMCPTools'),
				cls: 'llmsider-empty-text'
			});
			return;
		}

		// Group tools by server
		const toolsByServer = new Map<string, typeof allTools>();
		allTools.forEach(tool => {
			if (!toolsByServer.has(tool.server)) {
				toolsByServer.set(tool.server, []);
			}
			toolsByServer.get(tool.server)!.push(tool);
		});

		// Server cards grid (similar to built-in tools)
		const serverGrid = mcpToolsSection.createDiv({ cls: 'llmsider-builtin-category-grid' });
		
		// State tracking
		let activeServer: string | null = null;
		let detailsContainer: HTMLElement | null = null;

		toolsByServer.forEach((tools, serverId) => {
			this.mcpServerDetails.renderServerCard(serverGrid, serverId, tools, mcpManager, connectedServers.has(serverId), (expanded, cardElement) => {
				if (expanded) {
					// Collapse previously active server
					if (activeServer && activeServer !== serverId && detailsContainer) {
						detailsContainer.remove();
						detailsContainer = null;
					}
					
					activeServer = serverId;
					// Create details container after the card
					detailsContainer = createDiv({ cls: 'llmsider-builtin-tools-details-container' });
					// Insert after the card element
					if (cardElement.nextSibling) {
						serverGrid.insertBefore(detailsContainer, cardElement.nextSibling);
					} else {
						serverGrid.appendChild(detailsContainer);
					}
					this.mcpServerDetails.renderServerDetails(detailsContainer, serverId, tools, mcpManager, mcpManager.isServerEnabled(serverId));
				} else {
					// Collapse current server
					if (detailsContainer) {
						detailsContainer.remove();
						detailsContainer = null;
					}
					activeServer = null;
				}
			});
		});
	}

	/**
	 * Renders MCP tools action buttons (enable/disable/reset all MCP tools)
	 */
	renderMCPToolsActions(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.gap = '8px';
		container.style.alignItems = 'center';

		// Enable all MCP tools
		const enableAllBtn = container.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-icon-btn',
			title: this.i18n.t('settingsPage.toolManagement.enableAllMCPDesc')
		});
		enableAllBtn.innerHTML = '✓';
		enableAllBtn.onclick = () => this.toolPermissionHandler.enableAllMCPTools();

		// Disable all MCP tools
		const disableAllBtn = container.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-icon-btn',
			title: this.i18n.t('settingsPage.toolManagement.disableAllMCPDesc')
		});
		disableAllBtn.innerHTML = '✕';
		disableAllBtn.onclick = () => this.toolPermissionHandler.disableAllMCPTools();

		// Reset MCP tools
		const resetBtn = container.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-icon-btn',
			title: this.i18n.t('settingsPage.toolManagement.resetMCPDesc')
		});
		resetBtn.innerHTML = '↻';
		resetBtn.onclick = () => this.toolPermissionHandler.resetMCPToolPermissions();
	}

	/**
	 * Renders inline global batch actions (enable/disable/reset all tools)
	 * Used in the Tool Management header
	 */
	renderInlineGlobalBatchActions(container: HTMLElement): void {
		const actionsContainer = container.createDiv({ cls: 'llmsider-inline-batch-actions' });
		actionsContainer.style.display = 'flex';
		actionsContainer.style.gap = '8px';
		actionsContainer.style.alignItems = 'center';

		// Enable all tools
		const enableAllBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-enable-all-btn',
			title: this.i18n.t('settingsPage.toolManagement.enableAllToolsDesc')
		});
		enableAllBtn.innerHTML = '✓';
		enableAllBtn.onclick = () => this.toolPermissionHandler.enableAllTools();

		// Disable all tools
		const disableAllBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-disable-all-btn',
			title: this.i18n.t('settingsPage.toolManagement.disableAllToolsDesc')
		});
		disableAllBtn.innerHTML = '✕';
		disableAllBtn.onclick = () => this.toolPermissionHandler.disableAllTools();

		// Reset all permissions
		const resetAllBtn = actionsContainer.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-reset-all-btn',
			title: this.i18n.t('settingsPage.toolManagement.resetAllPermissionsDesc')
		});
		resetAllBtn.innerHTML = '↻';
		resetAllBtn.onclick = () => this.toolPermissionHandler.resetAllPermissions();
	}

}
