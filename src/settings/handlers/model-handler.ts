import { App, Notice } from 'obsidian';
import LLMSiderPlugin from '../../main';
import { LLMConnection, LLMModel } from '../../types';
import { ModelModal } from '../../ui/model-modal';
import { I18nManager } from '../../i18n/i18n-manager';

/**
 * Handles Model CRUD operations
 */
export class ModelHandler {
	constructor(
		private app: App,
		private plugin: LLMSiderPlugin,
		private i18n: I18nManager,
		private onUpdate: () => void
	) {}

	async showAddModelModal(connection: LLMConnection): Promise<void> {
		const modal = new ModelModal(
			this.app,
			this.plugin,
			connection,
			async (model: LLMModel) => {
				// If this is set as default, clear other defaults for this connection
				if (model.isDefault) {
					this.plugin.settings.models.forEach(m => {
						if (m.connectionId === connection.id && m.id !== model.id) {
							m.isDefault = false;
						}
					});
				}
				
				// Add new model
				this.plugin.settings.models.push(model);
				await this.plugin.saveSettings();
				await this.plugin.reinitializeProviders();
				
				this.onUpdate(); // Refresh UI
			}
		);
		modal.open();
	}

	async editModel(model: LLMModel, index: number): Promise<void> {
		const connection = this.plugin.settings.connections.find(c => c.id === model.connectionId);
		if (!connection) {
			new Notice(this.i18n.t('notifications.settings.connectionNotFound'));
			return;
		}

		const modal = new ModelModal(
			this.app,
			this.plugin,
			connection,
			async (updatedModel: LLMModel) => {
				// If this is set as default, clear other defaults for this connection
				if (updatedModel.isDefault) {
					this.plugin.settings.models.forEach(m => {
						if (m.connectionId === connection.id && m.id !== updatedModel.id) {
							m.isDefault = false;
						}
					});
				}
				
				// Find and update the model
				const modelIndex = this.plugin.settings.models.findIndex(m => m.id === updatedModel.id);
				if (modelIndex !== -1) {
					this.plugin.settings.models[modelIndex] = updatedModel;
					await this.plugin.saveSettings();
					await this.plugin.reinitializeProviders();
					
					this.onUpdate(); // Refresh UI
				}
			},
			model // Pass existing model for editing
		);
		modal.open();
	}

	async deleteModel(model: LLMModel, index: number): Promise<void> {
		const confirmed = confirm(`Are you sure you want to delete the model "${model.name}"?`);
		if (confirmed) {
			// Find and remove the model
			const modelIndex = this.plugin.settings.models.findIndex(m => m.id === model.id);
			if (modelIndex !== -1) {
				this.plugin.settings.models.splice(modelIndex, 1);
				await this.plugin.saveSettings();
				await this.plugin.reinitializeProviders();
				
				new Notice(`Model "${model.name}" deleted`);
				this.onUpdate(); // Refresh UI
			}
		}
	}
}
