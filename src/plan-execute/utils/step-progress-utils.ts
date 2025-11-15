import { Logger } from '../../utils/logger';
import { SvgIcons } from '../../utils/svg-icons';
import type { I18nManager } from '../../i18n/i18n-manager';

/**
 * Step Progress UI Utils - utilities for creating and updating step progress indicators
 */
export class StepProgressUtils {
	/**
	 * Create a standalone progress indicator for current step execution
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
		const progressElement = messageContainer.createDiv({
			cls: 'llmsider-plan-execute-phase llmsider-step-progress-phase'
		});

		// Create header with step info
		const headerEl = progressElement.createDiv({ cls: 'plan-execute-header' });
		const currentStep = planSteps[stepIndex];

		headerEl.innerHTML = `
			<span class="plan-execute-icon step-checkbox">${SvgIcons.checkbox()}</span>
			<span class="plan-execute-title">${i18n.t('planExecute.stepExecution.executingStepNumber', { step: (stepIndex + 1).toString(), total: totalSteps.toString() })}: ${currentStep?.tool || i18n.t('status.executingStep')}</span>
			<div class="step-progress-bar">
				<div class="step-progress-fill" style="width: ${((stepIndex + 1) / totalSteps) * 100}%"></div>
			</div>
		`;

		// Create content area for step details
		const contentEl = progressElement.createDiv({ cls: 'plan-execute-content' });
		if (currentStep) {
			contentEl.innerHTML = `
				<div class="step-info">
					<div class="step-reason"><span class="step-label">${i18n.t('planExecute.planningPrompt.rule2d')}:</span> ${currentStep.reason}</div>
				</div>
				<div class="step-status">${i18n.t('planExecute.stepExecution.preparingStep')}</div>
			`;
		}

		// Create collapsible output section (initially hidden)
		const outputSection = progressElement.createDiv({ cls: 'step-output-section collapsed' });
		
		// Output header (clickable to toggle)
		const outputHeader = outputSection.createDiv({ cls: 'step-output-header' });
		outputHeader.innerHTML = `
			<span class="output-toggle-icon">${SvgIcons.chevronRight()}</span>
			<span class="output-title">${i18n.t('planExecute.toolExecution.toolName', { toolName: currentStep?.tool || i18n.t('status.executingStep') })}</span>
			<span class="output-status">${i18n.t('planExecute.status.waiting')}</span>
		`;
		
		// Output content (hidden by default)
		const outputContent = outputSection.createDiv({ cls: 'step-output-content' });
		outputContent.innerHTML = `<div class="output-placeholder">${i18n.t('planExecute.stepExecution.allStepsCompleted')}</div>`;
		
		// Add click handler to toggle output section
		outputHeader.addEventListener('click', () => {
			const isCollapsed = outputSection.classList.contains('collapsed');
			if (isCollapsed) {
				outputSection.classList.remove('collapsed');
				outputSection.classList.add('expanded');
				outputHeader.querySelector('.output-toggle-icon')!.innerHTML = SvgIcons.chevronDown();
			} else {
				outputSection.classList.remove('expanded');
				outputSection.classList.add('collapsed');
				outputHeader.querySelector('.output-toggle-icon')!.innerHTML = SvgIcons.chevronRight();
			}
		});

		scrollToBottom();
		return progressElement;
	}

	/**
	 * Update step progress indicator with current status
	 */
	static updateStepProgressIndicator(
		progressElement: HTMLElement,
		status: 'preparing' | 'executing' | 'completed' | 'failed' | 'cancelled',
		message: string | undefined,
		outputContent: string | undefined,
		toolName: string | undefined,
		planTracker: any,
		i18n: I18nManager,
		formatOutputForDisplay: (content: string) => string,
		scrollToBottom: () => void
	): void {
		// Skip updating individual progress indicators when using PlanExecuteTracker
		if (planTracker) {
			Logger.debug(`Skipping individual progress indicator update (using PlanExecuteTracker)`);
			return;
		}

		const statusEl = progressElement.querySelector('.step-status') as HTMLElement;
		const iconEl = progressElement.querySelector('.plan-execute-icon') as HTMLElement;
		const outputStatusEl = progressElement.querySelector('.output-status') as HTMLElement;
		const outputContentEl = progressElement.querySelector('.step-output-content') as HTMLElement;
		const outputTitleEl = progressElement.querySelector('.output-title') as HTMLElement;

		if (!statusEl || !iconEl) return;

		let iconSvg = SvgIcons.checkbox(); // Empty checkbox
		let statusText = message || '';
		let statusClass = '';
		let outputStatus = i18n.t('planExecute.status.waiting');

		switch (status) {
			case 'preparing':
				iconSvg = SvgIcons.clock(); // Clock icon for preparing
				statusText = message || i18n.t('planExecute.stepExecution.preparingStep');
				statusClass = 'status-preparing';
				outputStatus = i18n.t('planExecute.status.inProgress');
				break;
			case 'executing':
				iconSvg = SvgIcons.loader(); // Loading icon for executing
				statusText = message || i18n.t('status.executingTool');
				statusClass = 'status-executing';
				outputStatus = i18n.t('planExecute.status.inProgress');
				break;
			case 'completed':
				iconSvg = SvgIcons.checkedBox(); // Checkmark
				statusText = message || i18n.t('planExecute.status.completed');
				statusClass = 'status-completed';
				outputStatus = i18n.t('planExecute.status.completed');

				// Update output title to show success
				if (outputTitleEl && toolName) {
					outputTitleEl.textContent = i18n.t('planExecute.toolExecution.toolExecutionSuccess', { toolName });
				}

				// Update output content when completed
				if (outputContent && outputContentEl) {
					// Remove placeholder and add actual output
					outputContentEl.innerHTML = `
						<div class="output-result">
							<div class="output-timestamp">${i18n.t('planExecute.status.completed')}: ${new Date().toLocaleTimeString()}</div>
							<div class="output-data">${formatOutputForDisplay(outputContent)}</div>
						</div>
					`;

					// Update output header to show there's content
					if (outputStatusEl) {
						outputStatusEl.textContent = i18n.t('toolCallPrompter.hasOutputContent');
						outputStatusEl.classList.add('has-content');
					}
				}
				break;
			case 'failed':
				iconSvg = SvgIcons.cross();
				statusText = message || i18n.t('planExecute.status.failed');
				statusClass = 'status-failed';
				outputStatus = i18n.t('planExecute.status.failed');

				// Update output title to show failure
				if (outputTitleEl && toolName) {
					outputTitleEl.textContent = i18n.t('planExecute.toolExecution.toolExecutionFailed', {
						toolName,
						error: message || i18n.t('errors.unknownError')
					});
				}

				// Update output content when failed
				if (outputContent && outputContentEl) {
					outputContentEl.innerHTML = `
						<div class="output-error">
							<div class="output-timestamp">${i18n.t('planExecute.status.failed')}: ${new Date().toLocaleTimeString()}</div>
							<div class="error-message">${formatOutputForDisplay(outputContent)}</div>
						</div>
					`;

					// Update output header to show there's error content
					if (outputStatusEl) {
						outputStatusEl.textContent = i18n.t('planExecute.status.failed');
						outputStatusEl.classList.add('has-error');
					}
				}
				break;
			case 'cancelled':
				iconSvg = SvgIcons.pause();
				statusText = message || i18n.t('planExecute.stepExecution.stepCancelled');
				statusClass = 'status-cancelled';
				outputStatus = i18n.t('planExecute.stepExecution.stepCancelled');
				break;
		}

		iconEl.innerHTML = iconSvg;
		statusEl.textContent = statusText;
		
		// Update output status
		if (outputStatusEl) {
			outputStatusEl.textContent = outputStatus;
		}
		
		// Update CSS classes
		progressElement.className = `llmsider-plan-execute-phase llmsider-step-progress-phase ${statusClass}`;
		
		// Hide step status and output section if there's a tool card
		// Tool card provides better visualization of execution details
		const toolCardsContainer = progressElement.querySelector('.step-tool-cards');
		if (toolCardsContainer && toolCardsContainer.children.length > 0) {
			// Hide the step status when tool card is present (tool card shows more detail)
			if (statusEl) {
				statusEl.style.display = 'none';
			}
			
			// Also hide the output section since tool card already shows the result
			const outputSectionEl = progressElement.querySelector('.step-output-section') as HTMLElement;
			if (outputSectionEl) {
				outputSectionEl.style.display = 'none';
			}
		}
		
		scrollToBottom();
	}
}
