import { Notice } from 'obsidian';
import { I18nManager } from '../../i18n/i18n-manager';
import { getMCPServerIcon } from '../utils/mcp-utils';
import { ToolPermissionHandler } from '../handlers/tool-permission-handler';
import LLMSiderPlugin from '../../main';

/**
 * MCPServerDetails component handles rendering of MCP server cards and details
 * Used in the tool management section
 */
export class MCPServerDetails {
	private i18n: I18nManager;
	private toolButtonControls: ToolButtonControls;
	private plugin: LLMSiderPlugin;
	private onDisplay: () => void;
	private toolPermissionHandler: ToolPermissionHandler;

	constructor(
		i18n: I18nManager,
		toolButtonControls: ToolButtonControls,
		plugin: LLMSiderPlugin,
		onDisplay: () => void,
		toolPermissionHandler: ToolPermissionHandler
	) {
		this.i18n = i18n;
		this.toolButtonControls = toolButtonControls;
		this.plugin = plugin;
		this.onDisplay = onDisplay;
		this.toolPermissionHandler = toolPermissionHandler;
	}

	/**
	 * Render server card (compact version for tool management)
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	renderServerCard(
		container: HTMLElement,
		serverId: string,
		tools: unknown[],
		mcpManager: unknown,
		isConnected: boolean,
		onToggleExpand: (expanded: boolean, cardElement: HTMLElement) => void
	): void {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mcpMgr = mcpManager as any;
		const serverCard = container.createDiv({ cls: 'llmsider-builtin-category-card' });
		
		// Server icon
		const iconContainer = serverCard.createDiv({ cls: 'llmsider-category-icon-container' });
		iconContainer.innerHTML = getMCPServerIcon(serverId);
		
		// Server info
		const serverInfo = serverCard.createDiv({ cls: 'llmsider-category-info' });
		
		const serverName = serverInfo.createEl('h3', {
			text: serverId,
			cls: 'llmsider-category-name'
		});
		
		// Connection status badge
		const statusBadge = serverInfo.createEl('span', {
			cls: `llmsider-mcp-status-badge ${isConnected ? 'connected' : 'disconnected'}`,
			text: isConnected ? this.i18n.t('mcp.connected') : this.i18n.t('mcp.serverDisconnected')
		});
		
		// Auto-connect indicator
		const isAutoConnect = mcpMgr.getServerAutoConnect(serverId);
		const autoConnectBadge = serverInfo.createEl('span', {
			cls: `llmsider-mcp-autoconnect-badge ${isAutoConnect ? 'enabled' : 'disabled'}`,
			text: isAutoConnect ? '⚡ Auto' : '○ Manual'
		});
		autoConnectBadge.style.cssText = `
			display: inline-block;
			padding: 2px 6px;
			font-size: 11px;
			border-radius: 3px;
			margin-left: 6px;
			background: ${isAutoConnect ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'};
			color: ${isAutoConnect ? 'var(--text-on-accent)' : 'var(--text-muted)'};
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
		`;
		
		// Click handler for autoConnect badge
		autoConnectBadge.addEventListener('click', async (e) => {
			e.stopPropagation();
			const currentState = mcpMgr.getServerAutoConnect(serverId);
		const newState = !currentState;
		
		try {
			await mcpMgr.setServerAutoConnect(serverId, newState);				// Update badge appearance
				autoConnectBadge.textContent = newState ? '⚡ Auto' : '○ Manual';
				autoConnectBadge.style.background = newState ? 'var(--interactive-accent)' : 'var(--background-modifier-border)';
				autoConnectBadge.style.color = newState ? 'var(--text-on-accent)' : 'var(--text-muted)';
				
				if (newState) {
					autoConnectBadge.removeClass('disabled');
				autoConnectBadge.addClass('enabled');
			} else {
				autoConnectBadge.removeClass('enabled');
				autoConnectBadge.addClass('disabled');
			}
				
			if (newState) {
				new Notice(this.i18n.t('notifications.settingsHandlers.autoConnectEnabled', { server: serverId }));
			} else {
				new Notice(this.i18n.t('notifications.settingsHandlers.autoConnectDisabled', { server: serverId }));
				}
		} catch (error) {
			new Notice(this.i18n.t('notifications.settingsHandlers.testFailed', { error: error instanceof Error ? error.message : 'Unknown error' }));
			}
		});
		
		// Add hover effect
		autoConnectBadge.addEventListener('mouseenter', () => {
			autoConnectBadge.style.opacity = '0.8';
		});
		autoConnectBadge.addEventListener('mouseleave', () => {
			autoConnectBadge.style.opacity = '1';
		});
		
		// Tool count with icon
		const toolCount = serverInfo.createEl('span', {
			cls: 'llmsider-category-count'
		});
		toolCount.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
			<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
		</svg><span style="vertical-align: middle;">${tools.length}</span>`;
		
		// Server toggle
		const toggleContainer = serverCard.createDiv({ cls: 'llmsider-category-toggle-container' });
		
		// Display state
		const serverStatus = mcpMgr.getServerStatus(serverId);
		const isServerConnected = serverStatus === 'connected';
		const switchState = isServerConnected || isAutoConnect;
		
		const toggleSwitch = toggleContainer.createDiv({ cls: `llmsider-toggle-switch ${switchState ? 'active' : ''}` });
		const toggleThumb = toggleSwitch.createDiv({ cls: 'llmsider-toggle-thumb' });
		
		toggleSwitch.addEventListener('click', async (e) => {
			e.stopPropagation();
			const newState = !toggleSwitch.hasClass('active');
			
			// Show loading state
			toggleSwitch.style.opacity = '0.5';
			toggleSwitch.style.cursor = 'not-allowed';
			
			try {
				// Update autoConnect setting
				await mcpMgr.setServerAutoConnect(serverId, newState);
				
				// Also connect/disconnect immediately
				if (newState) {
					if (!isServerConnected) {
						await mcpMgr.connectServer(serverId);
					}
				} else {
					if (isServerConnected) {
						await mcpMgr.disconnectServer(serverId);
					}
				}
				
				if (newState) {
					toggleSwitch.addClass('active');
				} else {
				toggleSwitch.removeClass('active');
			}
			
			if (newState) {
				new Notice(this.i18n.t('notifications.settingsHandlers.serverEnabled', { server: serverId }));
			} else {
				new Notice(this.i18n.t('notifications.settingsHandlers.serverDisabled', { server: serverId }));
			}				// Refresh the display
				setTimeout(() => this.onDisplay(), 500);
		} catch (error) {
			new Notice(this.i18n.t('notifications.settingsHandlers.testFailed', { error: error instanceof Error ? error.message : 'Unknown error' }));
		} finally {
				// Restore switch state
				toggleSwitch.style.opacity = '1';
				toggleSwitch.style.cursor = 'pointer';
			}
		});
		
		// Click to expand/collapse
		let isExpanded = false;
		serverCard.addEventListener('click', (e) => {
			if ((e.target as HTMLElement).closest('.llmsider-category-toggle-container')) {
				return;
			}
			
			isExpanded = !isExpanded;
			if (isExpanded) {
				serverCard.addClass('active');
			} else {
				serverCard.removeClass('active');
			}
			onToggleExpand(isExpanded, serverCard);
		});
	}

	/**
	 * Render server details (expanded view with tools)
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	renderServerDetails(
		container: HTMLElement,
		serverId: string,
		tools: unknown[],
		mcpManager: unknown,
		serverEnabled: boolean
	): void {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mcpMgr = mcpManager as any;
		// Auto-connect toggle at the top
		const autoConnectContainer = container.createDiv({ cls: 'llmsider-server-autoconnect-container' });
		autoConnectContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: var(--background-secondary); border-radius: 4px;';
		
		const autoConnectLabel = autoConnectContainer.createEl('span', {
			text: this.i18n.t('settingsPage.autoConnectOnStartup'),
			cls: 'llmsider-autoconnect-label'
		});
		autoConnectLabel.style.cssText = 'font-size: 13px; font-weight: 500; color: var(--text-normal);';
		
		const isAutoConnect = mcpMgr.getServerAutoConnect(serverId);
		const autoConnectToggleLabel = autoConnectContainer.createEl('label', { cls: 'llmsider-mcp-toggle-label-compact' });
		autoConnectToggleLabel.style.cssText = 'display: inline-flex; align-items: center; cursor: pointer; gap: 8px;';
		
		const autoConnectCheckbox = autoConnectToggleLabel.createEl('input', { 
			type: 'checkbox',
			cls: 'llmsider-mcp-toggle-input'
		});
		autoConnectCheckbox.checked = isAutoConnect;
		autoConnectCheckbox.style.display = 'none';
		
		const autoConnectSlider = autoConnectToggleLabel.createEl('span', { cls: 'llmsider-mcp-toggle-slider' });
		autoConnectSlider.style.cssText = `
			position: relative;
			width: 38px;
			height: 20px;
			background: ${isAutoConnect ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'};
			border-radius: 10px;
			transition: background 0.2s;
			cursor: pointer;
		`;
		
		const autoConnectKnob = autoConnectSlider.createEl('span');
		autoConnectKnob.style.cssText = `
			position: absolute;
			top: 2px;
			left: ${isAutoConnect ? '20px' : '2px'};
			width: 16px;
			height: 16px;
			background: white;
			border-radius: 50%;
			transition: left 0.2s;
		`;
		
		autoConnectCheckbox.addEventListener('change', async () => {
			const newState = autoConnectCheckbox.checked;
			try {
				await mcpMgr.setServerAutoConnect(serverId, newState);
				
				// Update UI
				autoConnectSlider.style.background = newState ? 'var(--interactive-accent)' : 'var(--background-modifier-border)';
				autoConnectKnob.style.left = newState ? '20px' : '2px';
				
			if (newState) {
				new Notice(this.i18n.t('notifications.settingsHandlers.autoConnectEnabled', { server: serverId }));
			} else {
				new Notice(this.i18n.t('notifications.settingsHandlers.autoConnectDisabled', { server: serverId }));
				}
		} catch (error) {
			new Notice(this.i18n.t('notifications.settingsHandlers.testFailed', { error: error instanceof Error ? error.message : 'Unknown error' }));
			// Revert checkbox state
				autoConnectCheckbox.checked = !newState;
			}
		});
		
		// Details header
		const detailsHeader = container.createDiv({ cls: 'llmsider-builtin-tools-details-header' });
		detailsHeader.createEl('h4', {
			text: this.i18n.t('settingsPage.toolManagement.availableTools'),
			cls: 'llmsider-builtin-tools-details-title'
		});
		
		// Tools list
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		tools.forEach((tool: any) => {
			const isToolEnabled = mcpMgr.getToolEnabled(serverId, tool.name);
			const requireConfirmation = mcpMgr.getToolRequireConfirmation(serverId, tool.name);
			
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
				isToolEnabled && serverEnabled,
				requireConfirmation,
				async (enabled) => {
					// Check limit when enabling
					if (enabled) {
						const currentCount = this.toolPermissionHandler.countEnabledMCPTools();
						const maxLimit = this.plugin.settings.maxMCPToolsSelection;
						if (currentCount >= maxLimit) {
							new Notice(this.i18n.t('settingsPage.toolManagement.mcpToolsLimitReached', {
								limit: maxLimit.toString()
							}));
							return;
						}
					}
					
				mcpMgr.setToolEnabled(serverId, tool.name, enabled);
				await this.plugin.saveSettings();
					new Notice(this.i18n.t('settingsPage.toolManagement.toolToggled', {
						name: tool.name,
						status: enabled ? this.i18n.t('settingsPage.toolManagement.enabled') : this.i18n.t('settingsPage.toolManagement.disabled')
					}));
				},
			async (requireConfirm) => {
					mcpMgr.setToolRequireConfirmation(serverId, tool.name, requireConfirm);
				}
			);
		});
	}
}
