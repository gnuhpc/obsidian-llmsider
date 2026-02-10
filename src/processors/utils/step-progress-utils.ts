import { I18nManager } from '../../i18n/i18n-manager';

/**
 * Step progress indicator utility functions
 */
export class StepProgressUtils {
	/**
	 * Create step progress indicator
	 */
	static createStepProgressIndicator(
		stepId: string,
		stepIndex: number,
		totalSteps: number,
		planSteps: any[],
		messageContainer: HTMLElement,
		i18n: I18nManager,
		scrollToBottom: () => void
	): HTMLElement {
		const indicator = messageContainer.createDiv({
			cls: 'llmsider-step-progress-indicator',
			attr: { 'data-step-id': stepId }
		});

		const step = planSteps[stepIndex];
		const toolName = step?.tool || 'unknown';
		const timestamp = new Date().toLocaleTimeString();
		const headerEl = indicator.createDiv({ cls: 'step-progress-header' });
		headerEl.innerHTML = `
			<span class="step-progress-icon">⚙️</span>
			<span class="step-progress-title">${i18n.t('planExecute.executingStep', {
				current: stepIndex + 1,
				total: totalSteps,
				tool: toolName
			})}</span>
			<span class="step-progress-timestamp">${timestamp}</span>
		`;

		const progressBar = indicator.createDiv({ cls: 'step-progress-bar' });
		const progress = ((stepIndex + 1) / totalSteps) * 100;
		progressBar.innerHTML = `
			<div class="step-progress-fill" style="width: ${progress}%"></div>
		`;

		scrollToBottom();
		return indicator;
	}

	/**
	 * Update step progress indicator
	 */
	static updateStepProgressIndicator(
		indicator: HTMLElement,
		status: 'preparing' | 'executing' | 'completed' | 'failed' | 'cancelled',
		message: string | undefined,
		outputContent: string | undefined,
		toolName: string | undefined,
		planTracker: any,
		i18n: any,
		formatOutputForDisplay: (content: any) => string,
		scrollToBottom: () => void
	): void {
		const iconEl = indicator.querySelector('.step-progress-icon') as HTMLElement;
		const titleEl = indicator.querySelector('.step-progress-title') as HTMLElement;

		if (status === 'completed') {
			if (iconEl) iconEl.textContent = '✓';
			indicator.classList.add('completed');
		} else if (status === 'failed') {
			if (iconEl) iconEl.textContent = '✗';
			indicator.classList.add('failed');
		}

		if (message && titleEl) {
			titleEl.textContent = message;
		}
	}
}
