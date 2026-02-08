import { App, Modal, Setting } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import { PromptTemplate } from '../../types';

/**
 * Modal for creating and editing custom prompts
 */
export class PromptManagementModal extends Modal {
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;
	private prompt: PromptTemplate | null;
	private onSaveCallback: () => Promise<void>;
	
	private titleInput: HTMLInputElement | null = null;
	private descriptionInput: HTMLTextAreaElement | null = null;
	private contentInput: HTMLTextAreaElement | null = null;

	constructor(
		app: App,
		plugin: LLMSiderPlugin,
		i18n: I18nManager,
		prompt: PromptTemplate | null,
		onSaveCallback: () => Promise<void>
	) {
		super(app);
		this.plugin = plugin;
		this.i18n = i18n;
		this.prompt = prompt;
		this.onSaveCallback = onSaveCallback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('llmsider-prompt-modal');

		// Modal title
		const title = this.prompt 
			? this.i18n.t('settingsPage.promptManagement.editPromptTitle')
			: this.i18n.t('settingsPage.promptManagement.createPromptTitle');
		
		contentEl.createEl('h2', { text: title });

		// Title input
		new Setting(contentEl)
			.setName(this.i18n.t('settingsPage.promptManagement.promptName'))
			.setDesc(this.i18n.t('settingsPage.promptManagement.promptNameDesc'))
			.addText(text => {
				this.titleInput = text.inputEl;
				text
					.setPlaceholder(this.i18n.t('settingsPage.promptManagement.promptNamePlaceholder'))
					.setValue(this.prompt?.title || '')
					.inputEl.style.width = '100%';
			});

		// Description input
		new Setting(contentEl)
			.setName(this.i18n.t('settingsPage.promptManagement.promptDescription'))
			.setDesc(this.i18n.t('settingsPage.promptManagement.promptDescriptionDesc'))
			.addTextArea(text => {
				this.descriptionInput = text.inputEl;
				text
					.setPlaceholder(this.i18n.t('settingsPage.promptManagement.promptDescriptionPlaceholder'))
					.setValue(this.prompt?.description || '');
				text.inputEl.rows = 3;
				text.inputEl.style.width = '100%';
			});

		// Content input
		const contentSetting = new Setting(contentEl)
			.setName(this.i18n.t('settingsPage.promptManagement.promptContent'))
			.setDesc(this.i18n.t('settingsPage.promptManagement.promptContentDesc'));
		
		const contentContainer = contentSetting.controlEl.createDiv({ cls: 'llmsider-prompt-content-container' });
		this.contentInput = contentContainer.createEl('textarea', {
			placeholder: this.i18n.t('settingsPage.promptManagement.promptContentPlaceholder'),
			cls: 'llmsider-prompt-content-input'
		});
		this.contentInput.value = this.prompt?.content || '';
		this.contentInput.rows = 12;
		this.contentInput.style.width = '100%';
		this.contentInput.style.fontFamily = 'monospace';

		// Placeholder info
		const infoDiv = contentContainer.createDiv({ cls: 'llmsider-prompt-info' });
		infoDiv.createEl('p', { 
			text: this.i18n.t('settingsPage.promptManagement.promptContentInfo'),
			cls: 'setting-item-description'
		});

		// Button container
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		
		// Cancel button
		const cancelButton = buttonContainer.createEl('button', { 
			text: this.i18n.t('settingsPage.promptManagement.cancel')
		});
		cancelButton.addEventListener('click', () => {
			this.close();
		});

		// Save button
		const saveButton = buttonContainer.createEl('button', { 
			text: this.prompt 
				? this.i18n.t('settingsPage.promptManagement.saveChanges')
				: this.i18n.t('settingsPage.promptManagement.createPrompt'),
			cls: 'mod-cta'
		});
		saveButton.addEventListener('click', async () => {
			await this.savePrompt();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Save the prompt
	 */
	private async savePrompt(): Promise<void> {
		if (!this.titleInput || !this.contentInput) return;

		const title = this.titleInput.value.trim();
		const description = this.descriptionInput?.value.trim() || '';
		const content = this.contentInput.value.trim();

		// Validation
		if (!title) {
			// Show error
			this.showError(this.i18n.t('settingsPage.promptManagement.errorEmptyTitle'));
			return;
		}

		if (!content) {
			this.showError(this.i18n.t('settingsPage.promptManagement.errorEmptyContent'));
			return;
		}

		try {
			if (this.prompt) {
				// Update existing prompt
				await this.plugin.configDb.updatePrompt(this.prompt.id, {
					title,
					description,
					content
				});
			} else {
				// Create new prompt
				const newPrompt: PromptTemplate = {
					id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
					title,
					description,
					content,
					isBuiltIn: false,
					order: 9999
				};
				await this.plugin.configDb.createPrompt(newPrompt);
			}

			// Call the callback to refresh the list
			await this.onSaveCallback();
			
			this.close();
		} catch (error) {
			console.error('Error saving prompt:', error);
			this.showError(this.i18n.t('settingsPage.promptManagement.errorSaving'));
		}
	}

	/**
	 * Show error message
	 */
	private showError(message: string): void {
		const { contentEl } = this;
		
		// Remove existing error
		const existingError = contentEl.querySelector('.llmsider-prompt-error');
		if (existingError) {
			existingError.remove();
		}

		// Add new error
		const errorDiv = contentEl.createDiv({ cls: 'llmsider-prompt-error' });
		errorDiv.createEl('p', { text: message });
		
		// Auto-remove after 3 seconds
		setTimeout(() => {
			errorDiv.remove();
		}, 3000);
	}
}
