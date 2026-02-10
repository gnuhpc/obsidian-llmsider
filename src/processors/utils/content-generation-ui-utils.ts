import { I18nManager } from '../../i18n/i18n-manager';
import { SvgIcons } from '../../utils/svg-icons';

/**
 * Content generation UI utility functions
 */
export class ContentGenerationUIUtils {
	/**
	 * Create content generation indicator for visual progress
	 */
	static createContentGenerationIndicator(
		messageContainer: HTMLElement,
		i18n: I18nManager
	): HTMLElement {
		const indicator = messageContainer.createDiv({
			cls: 'llmsider-content-generation-indicator'
		});

		const timestamp = new Date().toLocaleTimeString();
		const headerEl = indicator.createDiv({ cls: 'content-gen-header' });
		headerEl.innerHTML = `
			<span class="content-gen-icon">${SvgIcons.loader()}</span>
			<span class="content-gen-title">${i18n.t('planExecute.contentGeneration.preparing')}</span>
			<span class="content-gen-timestamp">${timestamp}</span>
		`;

		const progressEl = indicator.createDiv({ cls: 'content-gen-progress' });
		progressEl.innerHTML = `
			<div class="content-gen-phase">${i18n.t('planExecute.contentGeneration.parsing')}</div>
			<div class="content-gen-message"></div>
		`;

		// Add expandable content preview section
		const previewEl = indicator.createDiv({ cls: 'content-gen-preview' });
		previewEl.innerHTML = `
			<details class="content-gen-details">
				<summary>${i18n.t('planExecute.contentGeneration.preview')}</summary>
				<div class="content-gen-preview-content"></div>
			</details>
		`;

		return indicator;
	}

	/**
	 * Update content generation indicator
	 */
	static updateContentGenerationIndicator(
		indicator: HTMLElement,
		phase: 'parsing' | 'analyzing' | 'preparing' | 'connecting' | 'connected' | 'generating' | 'processing' | 'completed' | 'error',
		message: string,
		messageContainer: HTMLElement,
		i18n: I18nManager,
		generatedContent?: string
	): void {
		const phaseEl = indicator.querySelector('.content-gen-phase') as HTMLElement;
		const messageEl = indicator.querySelector('.content-gen-message') as HTMLElement;
		const iconEl = indicator.querySelector('.content-gen-icon') as HTMLElement;
		const titleEl = indicator.querySelector('.content-gen-title') as HTMLElement;

		// Update phase
		if (phaseEl) {
			phaseEl.textContent = i18n.t(`planExecute.contentGeneration.${phase}`);
		}

		// Update message
		if (messageEl) {
			messageEl.textContent = message;
		}

		// Update icon and title based on phase
		if (phase === 'completed') {
			if (iconEl) iconEl.innerHTML = '✅';
			if (titleEl) titleEl.textContent = i18n.t('planExecute.contentGeneration.completed');
			indicator.classList.add('completed');
		} else if (phase === 'error') {
			if (iconEl) iconEl.innerHTML = '❌';
			if (titleEl) titleEl.textContent = i18n.t('planExecute.contentGeneration.error');
			indicator.classList.add('error');
		} else if (phase === 'generating') {
			if (iconEl) iconEl.innerHTML = SvgIcons.loader();
			if (titleEl) titleEl.textContent = i18n.t('planExecute.contentGeneration.generating');
		}

		// Update preview content if provided
		if (generatedContent) {
			const previewContentEl = indicator.querySelector('.content-gen-preview-content') as HTMLElement;
			if (previewContentEl) {
				previewContentEl.textContent = generatedContent;
			}
		}
	}
}
