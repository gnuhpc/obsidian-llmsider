import { App, Modal, Notice } from 'obsidian';
import { I18nManager } from '../i18n/i18n-manager';

export interface UpdateInfo {
	currentVersion: string;
	latestVersion: string;
	releaseUrl: string;
	changelog?: string;
}

export class UpdateConfirmModal extends Modal {
	private updateInfo: UpdateInfo;
	private onConfirm: () => Promise<void>;
	private i18n: I18nManager;

	constructor(
		app: App,
		i18n: I18nManager,
		updateInfo: UpdateInfo,
		onConfirm: () => Promise<void>
	) {
		super(app);
		this.i18n = i18n;
		this.updateInfo = updateInfo;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('llmsider-update-modal');

		contentEl.createEl('h2', { text: this.i18n.t('ui.updateAvailableTitle') });

		const infoContainer = contentEl.createDiv('update-info-container');
		
		infoContainer.createDiv({ 
			text: `${this.i18n.t('ui.currentVersion')}: ${this.updateInfo.currentVersion}`,
			cls: 'update-version-info'
		});
		
		infoContainer.createDiv({ 
			text: `${this.i18n.t('ui.latestVersion')}: ${this.updateInfo.latestVersion}`,
			cls: 'update-version-info update-latest-version'
		});

		if (this.updateInfo.changelog) {
			const changelogContainer = contentEl.createDiv('update-changelog-container');
			changelogContainer.createEl('h3', { text: this.i18n.t('ui.releaseNotes') });
			const changelogContent = changelogContainer.createDiv('update-changelog-content');
			changelogContent.innerHTML = this.updateInfo.changelog;
		}

		contentEl.createDiv({ 
			text: this.i18n.t('ui.updateConfirmMessage'),
			cls: 'update-confirm-message'
		});

		const warningEl = contentEl.createDiv('update-warning');
		warningEl.createSpan({ text: '⚠️ ' });
		warningEl.createSpan({ text: this.i18n.t('ui.updateWarning') });

		const buttonContainer = contentEl.createDiv('modal-button-container');

		const cancelButton = buttonContainer.createEl('button', { 
			text: this.i18n.t('ui.cancel'),
			cls: 'mod-cancel'
		});
		cancelButton.addEventListener('click', () => {
			this.close();
		});

		const viewReleaseButton = buttonContainer.createEl('button', { 
			text: this.i18n.t('ui.viewRelease'),
		});
		viewReleaseButton.addEventListener('click', () => {
			window.open(this.updateInfo.releaseUrl, '_blank');
		});

		const confirmButton = buttonContainer.createEl('button', { 
			text: this.i18n.t('ui.updateNow'),
			cls: 'mod-cta'
		});
		confirmButton.addEventListener('click', async () => {
			confirmButton.disabled = true;
			confirmButton.setText(this.i18n.t('ui.updating'));
			
			try {
				await this.onConfirm();
				this.close();
			} catch (error) {
				confirmButton.disabled = false;
				confirmButton.setText(this.i18n.t('ui.updateNow'));
				new Notice(this.i18n.t('ui.updateFailed') + ': ' + error);
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
