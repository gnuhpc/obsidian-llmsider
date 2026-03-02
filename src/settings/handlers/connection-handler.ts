import { App, Notice } from 'obsidian';
import LLMSiderPlugin from '../../main';
import { LLMConnection } from '../../types';
import { ConnectionModal } from '../../ui/connection-modal';
import { I18nManager } from '../../i18n/i18n-manager';

/**
 * Handles Connection CRUD operations
 */
export class ConnectionHandler {
	constructor(
		private app: App,
		private plugin: LLMSiderPlugin,
		private i18n: I18nManager,
		private onUpdate: () => void
	) {}

	async showAddConnectionModal(type?: 'openai' | 'anthropic' | 'qwen' | 'free-qwen' | 'free-deepseek' | 'free-gemini' | 'openai-compatible' | 'siliconflow' | 'kimi' | 'azure-openai' | 'ollama' | 'gemini' | 'groq' | 'hugging-chat' | 'github-copilot' | 'xai' | 'openrouter' | 'opencode'): Promise<void> {
		const modal = new ConnectionModal(
			this.app,
			this.plugin,
			async (connection: LLMConnection) => {
				// Add new connection
				this.plugin.settings.connections.push(connection);
				// Optimize: Save only the new connection instead of full settings save
				await this.plugin.configDb.saveConnection(connection);
				await this.plugin.reinitializeProviders();
				
				// Start GitHub token monitoring if applicable
				await this.plugin.startGitHubTokenMonitoring(connection);
				
				this.onUpdate(); // Refresh UI
			},
			undefined, // no existing connection
			type // preset type
		);
		
		// Open the modal
		modal.open();
	}

	async editConnection(connection: LLMConnection, index: number): Promise<void> {
		const modal = new ConnectionModal(
			this.app,
			this.plugin,
			async (updatedConnection: LLMConnection) => {
				// Update connection
				const connIndex = this.plugin.settings.connections.findIndex(c => c.id === updatedConnection.id);
				if (connIndex !== -1) {
					this.plugin.settings.connections[connIndex] = updatedConnection;
					// Optimize: Save only the updated connection instead of full settings save
					await this.plugin.configDb.saveConnection(updatedConnection);
					await this.plugin.reinitializeProviders();
					
					// Restart GitHub token monitoring if applicable (in case enabled status changed)
					await this.plugin.startGitHubTokenMonitoring(updatedConnection);
					
					this.onUpdate(); // Refresh UI
				}
			},
			connection // Pass existing connection for editing
		);
		modal.open();
	}

	async deleteConnection(connection: LLMConnection, index: number): Promise<void> {
		const confirmed = confirm(`Are you sure you want to delete the connection "${connection.name}"? This will also delete all associated models.`);
		if (confirmed) {
			// Stop GitHub token monitoring if applicable
			this.plugin.stopGitHubTokenMonitoring(connection.id);
			
			// Remove connection
			const connIndex = this.plugin.settings.connections.findIndex(c => c.id === connection.id);
			if (connIndex !== -1) {
				this.plugin.settings.connections.splice(connIndex, 1);
			}
			
			// Remove all models associated with this connection
			this.plugin.settings.models = this.plugin.settings.models.filter(
				m => m.connectionId !== connection.id
			);
			
			// Optimize: Delete only the connection (cascade deletes models) instead of full settings save
			await this.plugin.configDb.deleteConnection(connection.id);
			await this.plugin.reinitializeProviders();
			
			new Notice(this.i18n.t('notifications.settingsHandlers.connectionDeleted', { name: connection.name }) || `Connection "${connection.name}" deleted`);
			this.onUpdate(); // Refresh UI
		}
	}
}
