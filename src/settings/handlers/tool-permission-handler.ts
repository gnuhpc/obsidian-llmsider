import { Notice } from 'obsidian';
import { Logger } from '../../utils/logger';
import LLMSiderPlugin from '../../main';
import { getAllBuiltInTools, BuiltInTool } from '../../tools/built-in-tools';
import { I18nManager } from '../../i18n/i18n-manager';

// System tools that are always enabled and hidden from UI
// These tools don't count towards the tool limit
const HIDDEN_SYSTEM_TOOLS = ['get_timedate'];

/**
 * Handles tool permission management for both built-in and MCP tools
 */
export class ToolPermissionHandler {
	constructor(
		private plugin: LLMSiderPlugin,
		private i18n: I18nManager,
		private onUpdate: () => void
	) {}

	// Built-in tool permissions
	isBuiltInToolEnabled(toolName: string): boolean {
		return this.plugin.configDb.isBuiltInToolEnabled(toolName);
	}

	/**
	 * Count currently enabled built-in tools (excluding system tools)
	 */
	countEnabledBuiltInTools(): number {
		const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];
		let count = 0;
		allBuiltInTools.forEach(tool => {
			const toolId = (tool as unknown).id || tool.name;
			// Skip hidden system tools - they don't count towards limit
			if (HIDDEN_SYSTEM_TOOLS.includes(toolId)) {
				return;
			}
			if (this.plugin.configDb.isBuiltInToolEnabled(toolId)) {
				count++;
			}
		});
		return count;
	}

	/**
	 * Check if enabling a tool would exceed the limit
	 */
	canEnableBuiltInTool(): boolean {
		const currentCount = this.countEnabledBuiltInTools();
		const maxLimit = this.plugin.settings.maxBuiltInToolsSelection;
		return currentCount < maxLimit;
	}

	async setBuiltInToolEnabled(toolName: string, enabled: boolean): Promise<boolean> {
		// Check limit when enabling
		if (enabled && !this.canEnableBuiltInTool()) {
			new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolsLimitReached', {
				limit: this.plugin.settings.maxBuiltInToolsSelection.toString()
			}));
			return false;
		}
		
		this.plugin.configDb.setBuiltInToolEnabled(toolName, enabled);
		await this.plugin.saveSettings();
		this.onUpdate();
		return true;
	}

	async toggleCategoryTools(category: string, tools: unknown[], enabled: boolean): Promise<boolean> {
		if (enabled) {
			// Check if enabling all tools in category would exceed limit
			const currentCount = this.countEnabledBuiltInTools();
			const maxLimit = this.plugin.settings.maxBuiltInToolsSelection;
			const toolsToEnable = tools.filter(tool => {
				const toolId = tool.id || tool.name;
				return !this.plugin.configDb.isBuiltInToolEnabled(toolId);
			});
			
			if (currentCount + toolsToEnable.length > maxLimit) {
				new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolsCategoryLimitExceeded', {
					category: category,
					limit: maxLimit.toString(),
					current: currentCount.toString(),
					additional: toolsToEnable.length.toString()
				}));
				return false;
			}
		}
		
		for (const tool of tools) {
			const toolId = tool.id || tool.name;
			this.plugin.configDb.setBuiltInToolEnabled(toolId, enabled);
		}
		await this.plugin.saveSettings();
		this.onUpdate();
		return true;
	}

	async toggleBuiltInTool(toolName: string, enabled: boolean): Promise<boolean> {
		return await this.setBuiltInToolEnabled(toolName, enabled);
	}

	async enableAllBuiltInTools(): Promise<boolean> {
		const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];
		const maxLimit = this.plugin.settings.maxBuiltInToolsSelection;

		// Filter tools that need to be enabled
		const toolsToEnable = allBuiltInTools.filter(tool => {
			const toolId = (tool as unknown).id || tool.name;
			return !this.plugin.configDb.isBuiltInToolEnabled(toolId);
		});

		// Check if enabling all would exceed limit
		const currentCount = this.countEnabledBuiltInTools();
		if (currentCount + toolsToEnable.length > maxLimit) {
			new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolsLimitReached', {
				limit: maxLimit.toString()
			}));
			return false;
		}

		allBuiltInTools.forEach(tool => {
			const toolId = (tool as unknown).id || tool.name;
			this.plugin.configDb.setBuiltInToolEnabled(toolId, true);
		});

		await this.plugin.saveSettings();
		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.toolManagement.allBuiltInToolsEnabled'));
		return true;
	}

	async disableAllBuiltInTools(): Promise<boolean> {
		const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];

		allBuiltInTools.forEach(tool => {
			const toolId = (tool as unknown).id || tool.name;
			this.plugin.configDb.setBuiltInToolEnabled(toolId, false);
		});

		await this.plugin.saveSettings();
		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.toolManagement.allBuiltInToolsDisabled'));
		return true;
	}

	async resetBuiltInToolPermissions(): Promise<void> {
		const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];
		const { getDefaultBuiltInToolsPermissions } = require('../../tools/built-in-tools-config');

		const defaultPermissions = getDefaultBuiltInToolsPermissions(allBuiltInTools);
		const maxLimit = this.plugin.settings.maxBuiltInToolsSelection;
		
		// Count tools to be enabled
		let toolsToEnableCount = 0;
		allBuiltInTools.forEach(tool => {
			const toolId = (tool as unknown).id || tool.name;
			if (HIDDEN_SYSTEM_TOOLS.includes(toolId)) return;
			if (defaultPermissions[toolId] !== false) {
				toolsToEnableCount++;
			}
		});

		if (toolsToEnableCount > maxLimit) {
			new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolsLimitReached', {
				limit: maxLimit.toString()
			}));
			return;
		}
		
		allBuiltInTools.forEach(tool => {
			const toolId = (tool as unknown).id || tool.name;
			const enabled = defaultPermissions[toolId] !== false;
			this.plugin.configDb.setBuiltInToolEnabled(toolId, enabled);
		});

		await this.plugin.saveSettings();
		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolPermissionsReset'));
	}

	// MCP tool permissions
	/**
	 * Count currently enabled MCP tools
	 */
	countEnabledMCPTools(): number {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return 0;

		const allTools = mcpManager.getAllAvailableTools();
		let count = 0;
		allTools.forEach(tool => {
			if (mcpManager.isToolEnabled(tool.server, tool.name)) {
				count++;
			}
		});
		return count;
	}

	/**
	 * Check if enabling MCP tools would exceed the limit
	 */
	canEnableMCPTools(additionalCount: number = 1): boolean {
		const currentCount = this.countEnabledMCPTools();
		const maxLimit = this.plugin.settings.maxMCPToolsSelection;
		return currentCount + additionalCount <= maxLimit;
	}

	async enableAllMCPTools(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const allTools = mcpManager.getAllAvailableTools();
		const maxLimit = this.plugin.settings.maxMCPToolsSelection;
		
		// Check if enabling all would exceed limit
		if (allTools.length > maxLimit) {
			new Notice(this.i18n.t('settingsPage.toolManagement.mcpToolsLimitExceeded', {
				limit: maxLimit.toString(),
				total: allTools.length.toString()
			}));
			return;
		}

		const serverIds = new Set(allTools.map(tool => tool.server));

		serverIds.forEach(serverId => {
			mcpManager.setServerEnabled(serverId, true);
			const serverTools = allTools.filter(tool => tool.server === serverId);
			serverTools.forEach(tool => {
				mcpManager.setToolEnabled(serverId, tool.name, true);
			});
		});

		await this.saveToolPermissions();
		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.toolManagement.allMCPToolsEnabled'));
	}

	async disableAllMCPTools(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const allTools = mcpManager.getAllAvailableTools();
		const serverIds = new Set(allTools.map(tool => tool.server));

		serverIds.forEach(serverId => {
			mcpManager.setServerEnabled(serverId, false);
		});

		await this.saveToolPermissions();
		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.toolManagement.allMCPToolsDisabled'));
	}

	async resetMCPToolPermissions(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const allTools = mcpManager.getAllAvailableTools();
		const maxLimit = this.plugin.settings.maxMCPToolsSelection;

		if (allTools.length > maxLimit) {
			new Notice(this.i18n.t('settingsPage.toolManagement.mcpToolsLimitExceeded', {
				limit: maxLimit.toString(),
				total: allTools.length.toString()
			}));
			return;
		}

		const serverIds = new Set(allTools.map(tool => tool.server));

		serverIds.forEach(serverId => {
			mcpManager.setServerEnabled(serverId, true);
			const serverTools = allTools.filter(tool => tool.server === serverId);
			serverTools.forEach(tool => {
				mcpManager.setToolEnabled(serverId, tool.name, true);
			});
		});

		this.plugin.settings.mcpSettings.serverPermissions = {};
		await this.saveToolPermissions();
		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.toolManagement.mcpToolPermissionsReset'));
	}

	// Combined operations
	async enableAllTools(): Promise<void> {
		// Enable Built-in Tools
		await this.enableAllBuiltInTools();

		// Enable MCP Tools
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const allTools = mcpManager.getAllAvailableTools();
		const maxLimit = this.plugin.settings.maxMCPToolsSelection;

		if (allTools.length > maxLimit) {
			new Notice(this.i18n.t('settingsPage.toolManagement.mcpToolsLimitExceeded', {
				limit: maxLimit.toString(),
				total: allTools.length.toString()
			}));
			return;
		}

		const serverIds = new Set(allTools.map(tool => tool.server));

		serverIds.forEach(serverId => {
			mcpManager.setServerEnabled(serverId, true);
			const serverTools = allTools.filter(tool => tool.server === serverId);
			serverTools.forEach(tool => {
				mcpManager.setToolEnabled(serverId, tool.name, true);
			});
		});

		await this.saveToolPermissions();
		this.onUpdate();
		new Notice(this.i18n.t('notifications.settings.allToolsEnabled'));
	}

	async disableAllTools(): Promise<void> {
		// Disable Built-in Tools
		await this.disableAllBuiltInTools();

		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const allTools = mcpManager.getAllAvailableTools();
		const serverIds = new Set(allTools.map(tool => tool.server));

		serverIds.forEach(serverId => {
			mcpManager.setServerEnabled(serverId, false);
		});

		await this.saveToolPermissions();
		this.onUpdate();
		new Notice(this.i18n.t('notifications.settings.allToolsDisabled'));
	}

	async resetToolPermissions(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const allTools = mcpManager.getAllAvailableTools();
		const maxLimit = this.plugin.settings.maxMCPToolsSelection;

		if (allTools.length > maxLimit) {
			new Notice(this.i18n.t('settingsPage.toolManagement.mcpToolsLimitExceeded', {
				limit: maxLimit.toString(),
				total: allTools.length.toString()
			}));
			return;
		}

		const serverIds = new Set(allTools.map(tool => tool.server));

		serverIds.forEach(serverId => {
			mcpManager.setServerEnabled(serverId, true);
			const serverTools = allTools.filter(tool => tool.server === serverId);
			serverTools.forEach(tool => {
				mcpManager.setToolEnabled(serverId, tool.name, true);
			});
		});

		this.plugin.settings.mcpSettings.serverPermissions = {};
		await this.saveToolPermissions();
		this.onUpdate();
		new Notice(this.i18n.t('notifications.settings.toolPermissionsReset'));
	}

	async resetAllPermissions(): Promise<void> {
		await this.resetBuiltInToolPermissions();
		await this.resetToolPermissions();
		new Notice(this.i18n.t('notifications.settings.allToolPermissionsReset'));
	}

	// Helper methods
	private async saveToolPermissions(): Promise<void> {
		await this.plugin.saveSettings();
	}

	async exportToolPermissions(): Promise<void> {
		try {
			// Collect built-in tool permissions from database
			const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];
			const builtInToolsPermissions: Record<string, boolean> = {};
			allBuiltInTools.forEach(tool => {
				const toolId = (tool as any).id || tool.name;
				builtInToolsPermissions[toolId] = this.plugin.configDb.isBuiltInToolEnabled(toolId);
			});
			
			const permissions = {
				builtInTools: builtInToolsPermissions,
				mcpTools: this.plugin.settings.mcpSettings.serverPermissions,
				exportedAt: new Date().toISOString(),
				version: '1.0'
			};

			const jsonString = JSON.stringify(permissions, null, 2);
			const blob = new Blob([jsonString], { type: 'application/json' });
			const url = URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = `llmsider-tool-permissions-${new Date().toISOString().split('T')[0]}.json`;
			a.click();

			URL.revokeObjectURL(url);
			new Notice(this.i18n.t('notifications.settings.toolPermissionsExported'));
		} catch (error) {
			Logger.error('Failed to export tool permissions:', error);
			new Notice(this.i18n.t('notifications.settings.toolPermissionsExportFailed'));
		}
	}

	async importToolPermissions(): Promise<void> {
		// Create file input
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		
		input.onchange = async (e: any) => {
			const file = e.target.files[0];
			if (!file) return;

			try {
				const text = await file.text();
				const permissions = JSON.parse(text);

				// Validate structure
				if (!permissions.builtInTools || !permissions.mcpTools) {
					throw new Error('Invalid permissions file structure');
				}

				// Check Built-in Tools Limit
				const builtInLimit = this.plugin.settings.maxBuiltInToolsSelection;
				const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];
				let builtInCount = 0;
				
				allBuiltInTools.forEach(tool => {
					const toolId = (tool as any).id || tool.name;
					if (HIDDEN_SYSTEM_TOOLS.includes(toolId)) return;
					
					// Check if enabled in imported permissions (default to false if missing)
					if (permissions.builtInTools[toolId]) {
						builtInCount++;
					}
				});

				if (builtInCount > builtInLimit) {
					new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolsLimitReached', {
						limit: builtInLimit.toString()
					}));
					return;
				}

				// Check MCP Tools Limit
				const mcpLimit = this.plugin.settings.maxMCPToolsSelection;
				const mcpManager = this.plugin.getMCPManager();
				
				if (mcpManager) {
					const allMcpTools = mcpManager.getAllAvailableTools();
					let mcpCount = 0;
					
					for (const tool of allMcpTools) {
						const serverId = tool.server;
						const toolName = tool.name;
						const serverPerms = permissions.mcpTools[serverId];
						
						// Replicate isToolEnabled logic
						let isEnabled = true; // Default enabled
						if (serverPerms) {
							if (!serverPerms.enabled) {
								isEnabled = false;
							} else if (serverPerms.tools && serverPerms.tools[toolName] === false) {
								isEnabled = false;
							}
						}
						
						if (isEnabled) mcpCount++;
					}

					if (mcpCount > mcpLimit) {
						new Notice(this.i18n.t('settingsPage.toolManagement.mcpToolsLimitExceeded', {
							limit: mcpLimit.toString(),
							total: mcpCount.toString()
						}));
						return;
					}
				}

				// Apply imported permissions to database
				for (const [toolName, enabled] of Object.entries(permissions.builtInTools)) {
					this.plugin.configDb.setBuiltInToolEnabled(toolName, enabled as boolean);
				}
				
				// Apply MCP permissions
				this.plugin.settings.mcpSettings.serverPermissions = permissions.mcpTools;
				await this.plugin.saveSettings();
				this.onUpdate();
				new Notice(this.i18n.t('notifications.settings.toolPermissionsImported'));
			} catch (error) {
				Logger.error('Failed to import tool permissions:', error);
				new Notice(this.i18n.t('notifications.settings.toolPermissionsImportFailed'));
			}
		};

		input.click();
	}
}
