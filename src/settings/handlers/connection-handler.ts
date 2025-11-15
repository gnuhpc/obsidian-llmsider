import { App, Notice } from 'obsidian';
import LLMSiderPlugin from '../../main';
import { LLMConnection } from '../../types';
import { ConnectionModal } from '../../ui/connection-modal';

/**
 * Handles Connection CRUD operations
 */
export class ConnectionHandler {
	constructor(
		private app: App,
		private plugin: LLMSiderPlugin,
		private onUpdate: () => void
	) {}

	async showAddConnectionModal(type?: 'openai' | 'anthropic' | 'qwen' | 'openai-compatible' | 'azure-openai' | 'ollama' | 'gemini' | 'groq' | 'huggingface' | 'github-copilot'): Promise<void> {
		const modal = new ConnectionModal(
			this.app,
			this.plugin,
			async (connection: LLMConnection) => {
				// Add new connection
				this.plugin.settings.connections.push(connection);
				await this.plugin.saveSettings();
				await this.plugin.reinitializeProviders();
				
				// Start GitHub token monitoring if applicable
				await this.plugin.startGitHubTokenMonitoring(connection);
				
				this.onUpdate(); // Refresh UI
			}
		);
		
		// Open the modal
		modal.open();
		
		// Pre-select type if provided
		if (type) {
			// Wait a bit for modal to render, then set the type
			setTimeout(() => {
				const typeDropdown = modal.contentEl.querySelector('.llmsider-connection-form select') as HTMLSelectElement;
				if (typeDropdown) {
					typeDropdown.value = type;
					typeDropdown.dispatchEvent(new Event('change'));
				}
			}, 50);
		}
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
					await this.plugin.saveSettings();
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
			
			await this.plugin.saveSettings();
			await this.plugin.reinitializeProviders();
			
			new Notice(`Connection "${connection.name}" deleted`);
			this.onUpdate(); // Refresh UI
		}
	}
}
