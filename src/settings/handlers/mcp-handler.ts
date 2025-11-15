import { App, Notice, Modal } from 'obsidian';
import LLMSiderPlugin from '../../main';
import { I18nManager } from '../../i18n/i18n-manager';
import { Logger } from '../../utils/logger';

/**
 * Handles MCP (Model Context Protocol) operations
 */
export class MCPHandler {
	constructor(
		private app: App,
		private plugin: LLMSiderPlugin,
		private i18n: I18nManager,
		private onUpdate: () => void,
		private onUpdateCards: () => Promise<void>
	) {}

	async enableAllMCPServers(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const state = mcpManager.getState();
		const serverConfigs = state.serversConfig.mcpServers;
		const serverIds = Object.keys(serverConfigs);

		for (const serverId of serverIds) {
			await mcpManager.setServerAutoConnect(serverId, true);
			// Also connect if not already connected
			if (!state.connectedServers.has(serverId)) {
				try {
					await mcpManager.connectServer(serverId);
				} catch (error) {
					// Continue with other servers even if one fails
					Logger.error(`Failed to connect ${serverId}:`, error);
				}
			}
		}

		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.allMCPServersEnabled') || 'All MCP servers enabled');
	}

	async disableAllMCPServers(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const state = mcpManager.getState();
		const serverConfigs = state.serversConfig.mcpServers;
		const serverIds = Object.keys(serverConfigs);

		for (const serverId of serverIds) {
			await mcpManager.setServerAutoConnect(serverId, false);
			// Also disconnect if currently connected
			if (state.connectedServers.has(serverId)) {
				try {
					await mcpManager.disconnectServer(serverId);
				} catch (error) {
					// Continue with other servers even if one fails
					Logger.error(`Failed to disconnect ${serverId}:`, error);
				}
			}
		}

		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.allMCPServersDisabled') || 'All MCP servers disabled');
	}

	async toggleMCPServerConnection(serverId: string, isCurrentlyConnected: boolean): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return;
		}

		// Find the server card
		const serverCard = document.querySelector(`[data-server-id="${serverId}"]`) as HTMLElement;
		if (!serverCard) return;
		
		const connectBtn = serverCard.querySelector('.llmsider-mcp-action-btn.llmsider-connect-btn, .llmsider-mcp-action-btn.llmsider-disconnect-btn') as HTMLButtonElement;
		
		if (connectBtn) {
			connectBtn.disabled = true;
			connectBtn.style.opacity = '0.5';
			connectBtn.style.cursor = 'not-allowed';
			
			// Show loading spinner in button
			connectBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
				<path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
			</svg>`;
		}

		// Show connecting/disconnecting notice
		const progressNotice = new Notice(
			this.i18n.t(isCurrentlyConnected ? 'notifications.mcp.disconnecting' : 'notifications.mcp.connecting', { serverId }), 
			0
		);

		try {
			if (isCurrentlyConnected) {
				await mcpManager.disconnectServer(serverId);
				// Manually update permission state without triggering reconnection
				const permissions = mcpManager.getState().serverPermissions;
				if (permissions[serverId]) {
					permissions[serverId].serverEnabled = false;
					permissions[serverId].lastUpdated = Date.now();
					await this.plugin.saveSettings();
				}
				progressNotice.hide();
				new Notice(this.i18n.t('notifications.mcp.disconnected', { serverId }));
			} else {
				await mcpManager.connectServer(serverId);
				progressNotice.hide();
				new Notice(this.i18n.t('notifications.mcp.connected', { serverId }));
			}
		} catch (error) {
			progressNotice.hide();
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			new Notice(
				this.i18n.t(
					isCurrentlyConnected ? 'notifications.mcp.disconnectionFailed' : 'notifications.mcp.connectionFailed',
					{ serverId, error: errorMsg }
				)
			);
			Logger.error(`Failed to ${isCurrentlyConnected ? 'disconnect' : 'connect'} ${serverId}:`, error);
		}
	}

	async deleteMCPServer(serverId: string): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return;
		}

		// Show confirmation dialog
		const confirmed = await new Promise<boolean>((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText(this.i18n.t('settingsPage.deleteMCPServerTitle') || 'Delete MCP Server');
			modal.contentEl.createEl('p', { 
				text: this.i18n.t('settingsPage.deleteMCPServerConfirm', { serverId }) || `Are you sure you want to delete "${serverId}"?`,
				cls: 'llmsider-modal-text'
			});
			modal.contentEl.createEl('p', { 
				text: this.i18n.t('settingsPage.deleteMCPServerWarning') || 'This will remove the server configuration. If the server is currently connected, it will be disconnected first.',
				cls: 'llmsider-modal-warning'
			});

			const buttonContainer = modal.contentEl.createDiv({ cls: 'llmsider-modal-buttons' });
			
			const cancelBtn = buttonContainer.createEl('button', {
				text: this.i18n.t('settingsPage.deleteMCPServerCancelBtn') || 'Cancel',
				cls: 'llmsider-modal-cancel-btn'
			});
			cancelBtn.onclick = () => {
				modal.close();
				resolve(false);
			};

			const deleteBtn = buttonContainer.createEl('button', {
				text: this.i18n.t('settingsPage.deleteMCPServerDeleteBtn') || 'Delete',
				cls: 'llmsider-modal-delete-btn'
			});
			deleteBtn.style.cssText = `
				background: var(--color-red);
				color: white;
			`;
			deleteBtn.onclick = () => {
				modal.close();
				resolve(true);
			};

			modal.open();
		});

		if (!confirmed) {
			return;
		}

		try {
			// Disconnect if connected
			const state = mcpManager.getState();
			if (state.connectedServers.has(serverId)) {
				await mcpManager.disconnectServer(serverId);
			}

			// Remove server from config
			await mcpManager.removeServer(serverId);
			await this.plugin.saveSettings();
			
			new Notice(this.i18n.t('notifications.mcp.serverDeleted', { serverId }));
			this.onUpdate();
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			new Notice(this.i18n.t('notifications.mcp.deleteFailed', { serverId, error: errorMsg }));
			Logger.error(`Failed to delete server ${serverId}:`, error);
		}
	}

	async testMCPServerConnection(serverId: string): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return;
		}

		try {
			const health = mcpManager.getServerHealth(serverId);
			if (health) {
				const statusText = health.status === 'healthy' ? 
					'✅ Connection healthy' : 
					health.status === 'degraded' ? 
						`⚠️ Connection degraded: ${health.errors.join('; ')}` :
						`❌ Connection unhealthy: ${health.errors.join('; ')}`;
				
				new Notice(statusText);
			} else {
				new Notice(this.i18n.t('notifications.mcp.noHealthInfo'));
			}
		} catch (error) {
			new Notice(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async showMCPServerTools(serverId: string): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return;
		}

		try {
			const tools = await mcpManager.getToolsByServer(serverId);
			
			if (tools.length === 0) {
				new Notice(`No tools available from ${serverId}`);
				return;
			}

			// Show tools in a modal - implementation continues in settings.ts
			// This method contains extensive UI code that should remain in the main class
			// for now, as it's tightly coupled with the modal rendering logic
		} catch (error) {
			new Notice(`Failed to get tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async importMCPConfig(): Promise<void> {
		// Create file input for importing Claude Desktop config
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			try {
				const text = await file.text();
				const config = JSON.parse(text);
				
				const mcpManager = this.plugin.getMCPManager();
				if (mcpManager) {
					await mcpManager.importConfig(config);
					await this.plugin.saveSettings();
					new Notice(this.i18n.t('notifications.mcp.configImported'));
					this.onUpdate();
				}
			} catch (error) {
				new Notice(this.i18n.t('notifications.mcp.importFailed', { 
					error: error instanceof Error ? error.message : 'Unknown error' 
				}));
			}
		};

		input.click();
	}

	async exportMCPConfig(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return;
		}

		try {
			const config = await mcpManager.exportConfig();
			const jsonString = JSON.stringify(config, null, 2);
			
			// Create download
			const blob = new Blob([jsonString], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = 'mcp-servers-config.json';
			a.click();
			
			URL.revokeObjectURL(url);
			new Notice(this.i18n.t('notifications.mcp.configExported'));
		} catch (error) {
			new Notice(this.i18n.t('notifications.mcp.exportFailed', { 
				error: error instanceof Error ? error.message : 'Unknown error' 
			}));
		}
	}

	async connectAllMCPServers(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return;
		}

		try {
			await mcpManager.connectAllServers();
			new Notice(this.i18n.t('notifications.mcp.connectingAll'));
			// Update all cards without full page refresh
			setTimeout(() => this.onUpdateCards(), 1000);
		} catch (error) {
			new Notice(this.i18n.t('notifications.mcp.connectionFailed', { 
				error: error instanceof Error ? error.message : 'Unknown error'
			}));
		}
	}

	async disconnectAllMCPServers(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return;
		}

		try {
			await mcpManager.disconnectAllServers();
			new Notice(this.i18n.t('notifications.mcp.disconnectedAll'));
			// Update all cards without full page refresh
			await this.onUpdateCards();
		} catch (error) {
			new Notice(`Failed to disconnect from servers: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
