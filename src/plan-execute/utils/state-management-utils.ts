/**
 * State management utilities for Plan-Execute step tracking
 * Handles step status updates, progress tracking, and UI synchronization
 */

import { Logger } from '../../utils/logger';
import { SvgIcons } from '../../utils/svg-icons';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { Task, TaskStatus } from '../plan-execute-tracker';
import type { PlanExecuteTracker } from '../plan-execute-tracker';

export class StateManagementUtils {
	/**
	 * Mark a step as completed with full state updates
	 */
	static markStepCompleted(
		stepId: string,
		outputContent: string | undefined,
		planTracker: PlanExecuteTracker | null,
		stepProgressIndicators: Map<string, HTMLElement>,
		currentStepIndex: number,
		i18n: I18nManager,
		updateStaticPlanStepStatus: (stepId: string, status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped', result?: string, errorMsg?: string) => void,
		incrementCompletedSteps: () => void,
		updatePlanProgress: () => void,
		updateStepProgressIndicator: (indicator: HTMLElement, status: 'preparing' | 'executing' | 'completed' | 'failed' | 'cancelled', message: string, output?: string) => void
	): void {
		Logger.debug(`===== Marking step as completed =====`);
		Logger.debug(`Step ID: ${stepId}`);
		Logger.debug(`Current stepIndex: ${currentStepIndex}`);

		// Skip updating individual progress indicators when using PlanExecuteTracker
		if (planTracker) {
			Logger.debug('Skipping markStepCompleted individual indicator (using PlanExecuteTracker)');
			// Still update the static plan and progress
			updateStaticPlanStepStatus(stepId, 'completed');
			incrementCompletedSteps();
			updatePlanProgress();
			Logger.debug('===== Step marked as completed =====');
			return;
		}

		Logger.debug(`Available indicators:`, Array.from(stepProgressIndicators.keys()));

		// CRITICAL: Get the correct step progress indicator for this specific step
		const stepProgressIndicator = stepProgressIndicators.get(stepId);

		// Update the step's own progress indicator
		if (stepProgressIndicator) {
			Logger.debug(`Found progress indicator for step ${stepId}, updating to completed`);
			updateStepProgressIndicator(
				stepProgressIndicator,
				'completed',
				i18n.t('planExecute.stepExecution.stepExecutionSuccess', { step: (currentStepIndex + 1).toString() }),
				outputContent
			);
		} else {
			Logger.warn(`No progress indicator found for stepId: ${stepId}`);
		}

		// CRITICAL: Also update the static plan todo item
		Logger.debug(`Updating static plan for step ${stepId}`);
		updateStaticPlanStepStatus(stepId, 'completed');

		// Increment completed steps counter
		incrementCompletedSteps();

		// Update plan progress after step completion
		updatePlanProgress();

		Logger.debug('===== Step marked as completed =====');
	}

	/**
	 * Mark a step as failed with error handling
	 */
	static markStepFailed(
		stepId: string,
		errorMessage: string | undefined,
		outputContent: string | undefined,
		planTracker: PlanExecuteTracker | null,
		stepProgressIndicators: Map<string, HTMLElement>,
		i18n: I18nManager,
		updateStaticPlanStepStatus: (stepId: string, status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped', result?: string, errorMsg?: string) => void,
		updatePlanProgress: () => void,
		updateStepProgressIndicator: (indicator: HTMLElement, status: 'preparing' | 'executing' | 'completed' | 'failed' | 'cancelled', message: string, output?: string) => void
	): void {
		// Skip updating individual progress indicators when using PlanExecuteTracker
		if (planTracker) {
			Logger.debug('Skipping markStepFailed individual indicator (using PlanExecuteTracker)');
			// Still update the static plan and progress
			updateStaticPlanStepStatus(stepId, 'failed', undefined, errorMessage);
			updatePlanProgress();
			return;
		}

		// IMPORTANT: Get the correct step progress indicator for this specific step
		const stepProgressIndicator = stepProgressIndicators.get(stepId);

		// Update the step's own progress indicator
		if (stepProgressIndicator) {
			const failureMessage = errorMessage ? `❌ ${i18n.t('status.executionFailed')}: ${errorMessage}` : `❌ ${i18n.t('status.stepFailed')}`;
			const failureOutput = outputContent || errorMessage || i18n.t('status.stepFailed');

			updateStepProgressIndicator(
				stepProgressIndicator,
				'failed',
				failureMessage,
				failureOutput
			);
		} else {
			Logger.warn(`No progress indicator found for stepId: ${stepId}`);
		}

		// IMPORTANT: Also update the static plan todo item with error message
		updateStaticPlanStepStatus(stepId, 'failed', undefined, errorMessage);

		// Update plan progress after step failure
		updatePlanProgress();
	}

	/**
	 * Update static plan step status for both new and old trackers
	 */
	static updateStaticPlanStepStatus(
		stepId: string,
		status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped',
		result: string | undefined,
		errorMsg: string | undefined,
		planTracker: PlanExecuteTracker | null,
		planTasks: Task[],
		messageContainer: HTMLElement,
		updatePlanTracker: () => void,
		updateTodoItemStatus: (todoItem: HTMLElement, status: 'in-progress' | 'completed' | 'failed', errorMessage?: string) => void
	): void {
		Logger.debug(`===== Updating static plan step status =====`);
		Logger.debug(`Step ID: ${stepId}, Status: ${status}`);

		// If using NEW tracker, update task status and re-render
		if (planTracker && planTasks.length > 0) {
			Logger.debug(`Using NEW tracker, updating task status`);

			// Find the task in the stored tasks array
			const task = planTasks.find(t => t.id === stepId);
			if (!task) {
				Logger.warn(`Could not find task for stepId: ${stepId}`);
				Logger.debug('Available task IDs:', planTasks.map(t => t.id));
				return;
			}

			// Map status to TaskStatus
			let newStatus: TaskStatus;
			switch (status) {
				case 'executing':
					newStatus = 'in-progress';
					// Set timestamp when step starts executing
					task.timestamp = new Date().toLocaleString();
					break;
				case 'completed':
					newStatus = 'completed';
					// Update timestamp when completed
					task.timestamp = new Date().toLocaleString();
					// Set result if provided
					if (result) {
						task.result = result;
					}
					break;
				case 'skipped':
					newStatus = 'skipped';
					// Update timestamp when skipped
					task.timestamp = new Date().toLocaleString();
					// Set result to indicate skipped
					if (result) {
						task.result = result;
					}
					break;
				case 'failed':
				case 'cancelled':
					newStatus = 'error';
					// Update timestamp when failed
					task.timestamp = new Date().toLocaleString();
					// Set error message if provided
					if (errorMsg) {
						task.error = errorMsg;
					}
					break;
				default:
					Logger.warn(`Unknown status: ${status}`);
					return;
			}

			Logger.debug(`Updating task ${stepId} from "${task.status}" to "${newStatus}" at ${task.timestamp}`);

			// Update the task status
			task.status = newStatus;

			// Re-render the tracker with updated tasks
			updatePlanTracker();

			Logger.debug(`===== NEW tracker updated successfully =====`);
			return;
		}

		// Fallback to OLD method if NEW tracker not available
		Logger.debug(`Falling back to OLD tracker method`);

		// Find the static todo item in the execution plan
		const todoItem = messageContainer.querySelector(`[data-step-id="${stepId}"]`) as HTMLElement;
		if (!todoItem) {
			Logger.warn(`Could not find static plan item for stepId: ${stepId}`);
			// Debug: List all existing step IDs to help with troubleshooting
			const allItems = messageContainer.querySelectorAll('[data-step-id]');
			Logger.debug('Available step IDs:', Array.from(allItems).map(item => item.getAttribute('data-step-id')));
			return;
		}

		// Update checkbox based on status
		switch (status) {
			case 'executing':
				updateTodoItemStatus(todoItem, 'in-progress');
				break;
			case 'completed':
				updateTodoItemStatus(todoItem, 'completed');
				break;
			case 'failed':
			case 'cancelled':
				updateTodoItemStatus(todoItem, 'failed', errorMsg);
				break;
		}

		Logger.debug(`===== Static plan step status updated =====`);
	}

	/**
	 * Increment completed steps counter
	 */
	static incrementCompletedSteps(currentStepIndex: number, planStepsLength: number): number {
		const previousIndex = currentStepIndex;
		// Move to next step for future actions
		const newIndex = currentStepIndex + 1;
		Logger.debug(`===== Incremented step counter =====`);
		Logger.debug(`Previous index: ${previousIndex}, New index: ${newIndex}`);
		Logger.debug(`Total steps: ${planStepsLength}`);
		Logger.debug(`===== Step counter incremented =====`);
		return newIndex;
	}

	/**
	 * Update plan progress indicator UI
	 */
	static updatePlanProgress(
		messageContainer: HTMLElement,
		planSteps: any[],
		currentStepIndex: number,
		i18n: I18nManager,
		getCurrentStep: () => any | null
	): void {
		Logger.debug(`===== Updating plan progress =====`);

		const planElement = messageContainer.querySelector('.llmsider-plan-phase');
		if (!planElement) {
			Logger.warn('Plan element not found');
			return;
		}

		const totalSteps = planSteps.length;
		const completedSteps = messageContainer.querySelectorAll('.plan-todo-item.completed').length;
		const inProgressSteps = messageContainer.querySelectorAll('.plan-todo-item.in-progress').length;
		const failedSteps = messageContainer.querySelectorAll('.plan-todo-item.failed').length;

		Logger.debug(`Progress stats:`, {
			total: totalSteps,
			completed: completedSteps,
			inProgress: inProgressSteps,
			failed: failedSteps,
			currentStepIndex
		});

		// Update or create progress indicator
		let progressEl = planElement.querySelector('.plan-progress-indicator') as HTMLElement;
		if (!progressEl) {
			const headerEl = planElement.querySelector('.plan-execute-header');
			if (headerEl) {
				progressEl = headerEl.createDiv({ cls: 'plan-progress-indicator' });
				Logger.debug('Created new progress indicator');
			}
		}

		if (progressEl) {
			const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
			const currentStepDisplay = Math.min(currentStepIndex + 1, totalSteps);

			Logger.debug(`Progress calculation:`, {
				progressPercent,
				currentStepDisplay,
				formula: `${completedSteps}/${totalSteps} = ${progressPercent}%`
			});

			// Enhanced progress display with current step info
			let statusText = '';
			if (completedSteps === totalSteps && totalSteps > 0) {
				// Hide the completion notification - just return without showing anything
				Logger.debug('All steps completed, hiding progress indicator');
				return;
			} else if (inProgressSteps > 0) {
				const currentStep = getCurrentStep();
				if (currentStep) {
					statusText = i18n.t('planExecute.progress.executingCurrentStep', {
						tool: currentStep.tool,
						step: currentStepDisplay.toString(),
						total: totalSteps.toString()
					});
				} else {
					statusText = i18n.t('planExecute.progress.executingInProgress', {
						step: currentStepDisplay.toString(),
						total: totalSteps.toString()
					});
				}
			} else if (failedSteps > 0) {
				statusText = `❌ ${i18n.t('planExecute.progress.failedStepsWithCompleted', {
					failed: failedSteps.toString(),
					completed: completedSteps.toString()
				})}`;
			} else {
				statusText = i18n.t('planExecute.progress.preparingNextStep', {
					step: currentStepDisplay.toString(),
					total: totalSteps.toString()
				});
			}

			Logger.debug('Status text:', statusText);

			progressEl.innerHTML = `
				<div class="progress-text">${statusText}</div>
				<div class="progress-numbers">${completedSteps}/${totalSteps} ${i18n.t('planExecute.status.completed')} (${progressPercent}%)</div>
				<div class="progress-bar">
					<div class="progress-fill" style="width: ${progressPercent}%"></div>
					${inProgressSteps > 0 ? '<div class="progress-pulse"></div>' : ''}
				</div>
			`;

			// Add celebration effect when all completed
			if (completedSteps === totalSteps && totalSteps > 0) {
				progressEl.classList.add('all-completed');
				// Hide the step count when all steps are completed to avoid redundancy
				const stepCountEl = planElement.querySelector('.plan-step-count') as HTMLElement;
				if (stepCountEl) {
					stepCountEl.style.display = 'none';
				}
				// Auto-scroll to show completion
				setTimeout(() => {
					progressEl.scrollIntoView({
						behavior: 'smooth',
						block: 'center'
					});
				}, 500);
			}

			Logger.debug(`===== Plan progress updated =====`);
		}
	}

	/**
	 * Get current step information
	 */
	static getCurrentStep(currentStepIndex: number, planSteps: any[]): any | null {
		if (currentStepIndex >= 0 && currentStepIndex < planSteps.length) {
			return planSteps[currentStepIndex];
		}
		return null;
	}

	/**
	 * Check if all steps are completed
	 */
	static areAllStepsCompleted(messageContainer: HTMLElement, planSteps: any[]): boolean {
		const completedSteps = messageContainer.querySelectorAll('.plan-todo-item.completed').length;
		return completedSteps >= planSteps.length;
	}

	/**
	 * Clear previous in-progress states
	 */
	static clearPreviousInProgressStates(messageContainer: HTMLElement): void {
		const inProgressItems = messageContainer.querySelectorAll('.plan-todo-item.in-progress');
		inProgressItems.forEach(item => {
			item.classList.remove('in-progress');
			const checkbox = item.querySelector('.plan-todo-checkbox') as HTMLElement;
			if (checkbox && checkbox.innerHTML === SvgIcons.loader()) {
				checkbox.innerHTML = SvgIcons.checkbox(); // Reset to unchecked
			}
		});
	}

	/**
	 * Advance to next step in execution
	 */
	static advanceToNextStep(
		currentStepIndex: number,
		planSteps: any[],
		updatePlanProgress: () => void
	): number {
		if (currentStepIndex < planSteps.length - 1) {
			// Move to next step
			const newIndex = currentStepIndex + 1;
			Logger.debug('Advanced to next step, currentStepIndex:', newIndex);

			// Optional: Pre-mark next step as ready to execute
			if (newIndex < planSteps.length) {
				const nextStep = planSteps[newIndex];
				if (nextStep && nextStep.step_id) {
					Logger.debug('Next step ready:', nextStep.step_id, nextStep.tool);
				}
			}

			// Update progress display
			updatePlanProgress();
			return newIndex;
		} else {
			Logger.debug('All steps completed, currentStepIndex:', currentStepIndex);
			// Update progress display
			updatePlanProgress();
			return currentStepIndex;
		}
	}
}
