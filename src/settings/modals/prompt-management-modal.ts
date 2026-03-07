import { App, Modal } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import { PromptTemplate } from '../../types';

/**
 * Modal for creating and editing custom prompts.
 */
export class PromptManagementModal extends Modal {
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;
	private prompt: PromptTemplate | null;
	private promptType: 'chat' | 'speed-reading';
	private onSaveCallback: () => Promise<void>;

	private titleInput: HTMLInputElement | null = null;
	private descriptionInput: HTMLTextAreaElement | null = null;
	private contentInput: HTMLTextAreaElement | null = null;
	private errorEl: HTMLElement | null = null;
	private saveButton: HTMLButtonElement | null = null;

	constructor(
		app: App,
		plugin: LLMSiderPlugin,
		i18n: I18nManager,
		prompt: PromptTemplate | null,
		promptType: 'chat' | 'speed-reading' = 'chat',
		onSaveCallback: () => Promise<void>
	) {
		super(app);
		this.plugin = plugin;
		this.i18n = i18n;
		this.prompt = prompt;
		this.promptType = promptType;
		this.onSaveCallback = onSaveCallback;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('llmsider-prompt-modal');
		this.modalEl.addClass('llmsider-prompt-modal-shell');

		const title = this.prompt
			? this.i18n.t('settingsPage.promptManagement.editPromptTitle')
			: this.i18n.t('settingsPage.promptManagement.createPromptTitle');

		contentEl.createEl('h2', {
			text: title,
			cls: 'llmsider-prompt-modal-title'
		});

		this.errorEl = contentEl.createDiv({ cls: 'llmsider-prompt-error is-hidden' });

		const form = contentEl.createDiv({ cls: 'llmsider-prompt-form' });

		this.titleInput = this.createTextInput(
			form,
			this.i18n.t('settingsPage.promptManagement.promptName'),
			this.i18n.t('settingsPage.promptManagement.promptNameDesc'),
			this.i18n.t('settingsPage.promptManagement.promptNamePlaceholder'),
			this.prompt?.title || ''
		);

		this.descriptionInput = this.createTextAreaInput(
			form,
			this.i18n.t('settingsPage.promptManagement.promptDescription'),
			this.i18n.t('settingsPage.promptManagement.promptDescriptionDesc'),
			this.i18n.t('settingsPage.promptManagement.promptDescriptionPlaceholder'),
			this.prompt?.description || '',
			3,
			'llmsider-prompt-description-input'
		);

		this.contentInput = this.createTextAreaInput(
			form,
			this.i18n.t('settingsPage.promptManagement.promptContent'),
			this.i18n.t('settingsPage.promptManagement.promptContentDesc'),
			this.i18n.t('settingsPage.promptManagement.promptContentPlaceholder'),
			this.prompt?.content || '',
			8,
			'llmsider-prompt-content-input'
		);

		const footer = contentEl.createDiv({ cls: 'llmsider-prompt-modal-actions' });
		const cancelButton = footer.createEl('button', {
			text: this.i18n.t('settingsPage.promptManagement.cancel'),
			attr: { type: 'button' }
		});
		cancelButton.addEventListener('click', () => {
			this.close();
		});

		this.saveButton = footer.createEl('button', {
			text: this.prompt
				? this.i18n.t('settingsPage.promptManagement.saveChanges')
				: this.i18n.t('settingsPage.promptManagement.createPrompt'),
			cls: 'mod-cta llmsider-prompt-save-btn',
			attr: { type: 'button' }
		});
		this.saveButton.addEventListener('click', () => {
			void this.savePrompt();
		});

		[this.titleInput, this.descriptionInput, this.contentInput].forEach((input) => {
			input?.addEventListener('input', () => {
				this.clearError();
			});
		});
		window.setTimeout(() => this.titleInput?.focus(), 0);
	}

	onClose(): void {
		this.contentEl.empty();
		this.contentEl.removeClass('llmsider-prompt-modal');
		this.modalEl.removeClass('llmsider-prompt-modal-shell');
	}

	private createTextInput(
		container: HTMLElement,
		label: string,
		description: string,
		placeholder: string,
		value: string
	): HTMLInputElement {
		const field = this.createFieldShell(container, label, description);
		const input = field.createEl('input', {
			type: 'text',
			placeholder,
			cls: 'llmsider-prompt-field-input'
		});
		input.value = value;
		return input;
	}

	private createTextAreaInput(
		container: HTMLElement,
		label: string,
		description: string,
		placeholder: string,
		value: string,
		rows: number,
		extraClass = ''
	): HTMLTextAreaElement {
		const field = this.createFieldShell(container, label, description);
		const input = field.createEl('textarea', {
			placeholder,
			cls: `llmsider-prompt-field-input llmsider-prompt-field-textarea ${extraClass}`.trim()
		});
		input.value = value;
		input.rows = rows;
		return input;
	}

	private createFieldShell(container: HTMLElement, label: string, description: string): HTMLElement {
		const field = container.createDiv({ cls: 'llmsider-prompt-field' });
		field.createEl('label', {
			text: label,
			cls: 'llmsider-prompt-field-label'
		});
		field.createEl('p', {
			text: description,
			cls: 'llmsider-prompt-field-description'
		});
		return field;
	}

	private async savePrompt(): Promise<void> {
		if (!this.titleInput || !this.contentInput) {
			return;
		}

		const title = this.titleInput.value.trim();
		const description = this.descriptionInput?.value.trim() || '';
		const content = this.contentInput.value.trim();

		if (!title) {
			this.showError(this.i18n.t('settingsPage.promptManagement.errorEmptyTitle'));
			return;
		}

		if (!content) {
			this.showError(this.i18n.t('settingsPage.promptManagement.errorEmptyContent'));
			return;
		}

		this.setSavingState(true);

		try {
			if (this.prompt) {
				await this.plugin.configDb.updatePrompt(this.prompt.id, {
					title,
					description,
					content
				});
			} else {
				const newPrompt: PromptTemplate = {
					id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
					title,
					description,
					content,
					isBuiltIn: false,
					order: 9999,
					type: this.promptType
				};
				await this.plugin.configDb.createPrompt(newPrompt);
			}

			await this.onSaveCallback();
			this.close();
		} catch (error) {
			console.error('Error saving prompt:', error);
			this.showError(this.i18n.t('settingsPage.promptManagement.errorSaving'));
		} finally {
			this.setSavingState(false);
		}
	}

	private setSavingState(isSaving: boolean): void {
		if (this.saveButton) {
			this.saveButton.disabled = isSaving;
			this.saveButton.toggleClass('is-loading', isSaving);
		}
	}

	private clearError(): void {
		if (!this.errorEl) {
			return;
		}

		this.errorEl.empty();
		this.errorEl.addClass('is-hidden');
	}

	private showError(message: string): void {
		if (!this.errorEl) {
			return;
		}

		this.errorEl.empty();
		this.errorEl.removeClass('is-hidden');
		this.errorEl.createEl('p', { text: message });
	}
}
