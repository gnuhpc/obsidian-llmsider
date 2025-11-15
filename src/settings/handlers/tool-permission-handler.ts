import { Notice } from 'obsidian';
import LLMSiderPlugin from '../../main';
import { getAllBuiltInTools, BuiltInTool } from '../../tools/built-in-tools';
import { I18nManager } from '../../i18n/i18n-manager';

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

	async setBuiltInToolEnabled(toolName: string, enabled: boolean): Promise<void> {
		this.plugin.configDb.setBuiltInToolEnabled(toolName, enabled);
		await this.plugin.saveSettings();
	}

	async toggleCategoryTools(category: string, tools: any[], enabled: boolean): Promise<void> {
		for (const tool of tools) {
			const toolId = tool.id || tool.name;
			this.plugin.configDb.setBuiltInToolEnabled(toolId, enabled);
		}
		await this.plugin.saveSettings();
		this.onUpdate();
	}

	async toggleBuiltInTool(toolName: string, enabled: boolean): Promise<void> {
		this.plugin.configDb.setBuiltInToolEnabled(toolName, enabled);
		await this.plugin.saveSettings();
	}

	async enableAllBuiltInTools(): Promise<void> {
		const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];

		allBuiltInTools.forEach(tool => {
			const toolId = (tool as any).id || tool.name;
			this.plugin.configDb.setBuiltInToolEnabled(toolId, true);
		});

		await this.plugin.saveSettings();
		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.toolManagement.allBuiltInToolsEnabled'));
	}

	async disableAllBuiltInTools(): Promise<void> {
		const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];

		allBuiltInTools.forEach(tool => {
			const toolId = (tool as any).id || tool.name;
			this.plugin.configDb.setBuiltInToolEnabled(toolId, false);
		});

		await this.plugin.saveSettings();
		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.toolManagement.allBuiltInToolsDisabled'));
	}

	async resetBuiltInToolPermissions(): Promise<void> {
		const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];
		const { getDefaultBuiltInToolsPermissions } = require('../../tools/built-in-tools-config');

		const defaultPermissions = getDefaultBuiltInToolsPermissions(allBuiltInTools);
		
		allBuiltInTools.forEach(tool => {
			const toolId = (tool as any).id || tool.name;
			const enabled = defaultPermissions[toolId] !== false;
			this.plugin.configDb.setBuiltInToolEnabled(toolId, enabled);
		});

		await this.plugin.saveSettings();
		this.onUpdate();
		new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolPermissionsReset'));
	}

	// MCP tool permissions
	async enableAllMCPTools(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const allTools = mcpManager.getAllAvailableTools();
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
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const allTools = mcpManager.getAllAvailableTools();
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
			const permissions = {
				builtInTools: this.plugin.settings.builtInToolsPermissions,
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
			console.error('Failed to export tool permissions:', error);
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

				// Apply imported permissions
				this.plugin.settings.builtInToolsPermissions = permissions.builtInTools;
				this.plugin.settings.mcpSettings.serverPermissions = permissions.mcpTools;

				await this.plugin.saveSettings();
				this.onUpdate();
				new Notice(this.i18n.t('notifications.settings.toolPermissionsImported'));
			} catch (error) {
				console.error('Failed to import tool permissions:', error);
				new Notice(this.i18n.t('notifications.settings.toolPermissionsImportFailed'));
			}
		};

		input.click();
	}
}
