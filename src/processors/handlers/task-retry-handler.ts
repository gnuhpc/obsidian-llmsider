import { Logger } from '../../utils/logger';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { Task } from '../plan-execute-tracker';

/**
 * TaskRetryHandler - 负责处理任务重试、再生成和跳过
 * 从 plan-execute-processor.ts 提取，用于减少主文件大小
 */
export class TaskRetryHandler {
	constructor(
		private i18n: I18nManager,
		private getPlanSteps: () => unknown[],
		private getPlanTasks: () => Task[],
		private getStepFailureInfo: () => Map<string, unknown>,
		private setCurrentStepIndex: (index: number) => void,
		private getIsAborted: () => boolean,
		private getAbortController: () => AbortController | null,
		private getOriginalUserQuery: () => string,
		private getExecutionResults: () => unknown[],
		private getPendingToolFailure: () => unknown,
		private setPendingToolFailure: (value: unknown) => void,
		private executeStepAndWaitForCompletionFn: (step: unknown, stepIndex: number, reuseIndicator?: boolean) => Promise<void>,
		private generateFinalAnswerFn: (userQuery: string) => Promise<void>,
		private markRemainingStepsAsCancelledFn: (startIndex: number) => void,
		private updatePlanTrackerFn: () => void,
		private updateStaticPlanStepStatusFn: (stepId: string, status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped', result?: string, errorMsg?: string) => void,
		private incrementCompletedStepsFn: () => void,
		private intelligentlyRegenerateStepFn: (originalStep: unknown, stepIndex: number, error: Error) => Promise<unknown>
	) {}

	/**
	 * Handle task retry action (execute same step again)
	 */
	async handleTaskRetry(taskId: string): Promise<void> {
		Logger.debug('Retrying task:', taskId);
		
		const planSteps = this.getPlanSteps();
		// Find the step and its index
		const stepIndex = planSteps.findIndex(step => step.step_id === taskId);
		if (stepIndex === -1) {
			Logger.error('Cannot find step for taskId:', taskId);
			return;
		}

		const step = planSteps[stepIndex];
		
		// Reset task status to pending
		const task = this.getPlanTasks().find(t => t.id === taskId);
		if (task) {
			task.status = 'pending';
			task.error = undefined;
			task.toolCalls = [];
			this.updatePlanTrackerFn();
		}

		// Execute the step again and continue with remaining steps if successful
		try {
			await this.executeStepAndWaitForCompletionFn(step, stepIndex, true);
			Logger.debug('Retry successful, continuing with remaining steps...');
			
			// Continue executing remaining steps
			await this.continueExecutionFromStep(stepIndex + 1);
		} catch (error) {
			Logger.error('Retry execution failed:', error);
		}
	}

	/**
	 * Continue execution from a specific step index
	 */
	async continueExecutionFromStep(startIndex: number): Promise<void> {
		const planSteps = this.getPlanSteps();
		Logger.debug(`Continuing execution from step ${startIndex + 1}/${planSteps.length}`);
		
		// Check if there are remaining steps to execute
		if (startIndex >= planSteps.length) {
			Logger.debug('No remaining steps to execute');
			// All steps completed, generate final answer
			await this.generateFinalAnswerFn(this.getOriginalUserQuery());
			return;
		}
		
		// Execute remaining steps sequentially
		for (let i = startIndex; i < planSteps.length; i++) {
			// Check if aborted before each step
			if (this.getIsAborted() || this.getAbortController()?.signal.aborted) {
				Logger.debug('Execution aborted at step', i + 1);
				return;
			}

			const step = planSteps[i];
			this.setCurrentStepIndex(i);

			Logger.debug(`Executing step ${i + 1}/${planSteps.length}:`, step.tool);

			try {
				await this.executeStepAndWaitForCompletionFn(step, i, false);
				Logger.debug(`Step ${i + 1} completed successfully`);
			} catch (stepError) {
				Logger.error(`Step ${i + 1} FAILED:`, stepError);
				
				// Mark remaining steps as cancelled
				this.markRemainingStepsAsCancelledFn(i + 1);
				
				// Stop execution on error
				Logger.debug('Stopping execution due to step failure');
				return;
			}
		}

		Logger.debug('All remaining steps completed successfully');
		
		// Generate final answer after all steps complete
		await this.generateFinalAnswerFn(this.getOriginalUserQuery());
	}

	/**
	 * Handle task regenerate and retry action (intelligently regenerate step with AI based on error type)
	 */
	async handleTaskRegenerateAndRetry(taskId: string): Promise<void> {
		Logger.debug('Intelligently regenerating and retrying task:', taskId);
		
		const planSteps = this.getPlanSteps();
		// Find the step and its index
		const stepIndex = planSteps.findIndex(step => step.step_id === taskId);
		if (stepIndex === -1) {
			Logger.error('Cannot find step for taskId:', taskId);
			return;
		}

		const step = planSteps[stepIndex];
		const failureInfo = this.getStepFailureInfo().get(taskId);
		
		// Reset task status to pending
		const task = this.getPlanTasks().find(t => t.id === taskId);
		if (task) {
			task.status = 'pending';
			task.error = undefined;
			task.toolCalls = [];
			this.updatePlanTrackerFn();
		}

		try {
			// Check if we have failure info
			if (!failureInfo) {
				Logger.error('No failure info found for step:', taskId);
				if (task) {
					task.status = 'error';
					task.error = 'Cannot regenerate: no failure information available';
					this.updatePlanTrackerFn();
				}
				return;
			}

			// Use AI to analyze the error and determine the best course of action
			const regeneratedStep = await this.intelligentlyRegenerateStepFn(step, stepIndex, failureInfo);
			
			if (regeneratedStep) {
				// Update the steps array with regenerated step
				planSteps[stepIndex] = regeneratedStep;
				
				// Update task title and description
				if (task) {
					task.title = regeneratedStep.tool;
					task.description = regeneratedStep.reason;
				}
				
				// Execute the regenerated step
				await this.executeStepAndWaitForCompletionFn(regeneratedStep, stepIndex, true);
				Logger.debug('Regenerated step executed successfully, continuing with remaining steps...');
				
				// Continue executing remaining steps
				await this.continueExecutionFromStep(stepIndex + 1);
			} else {
				Logger.error('Step regeneration returned null');
				if (task) {
					task.status = 'error';
					task.error = 'Failed to regenerate step';
					this.updatePlanTrackerFn();
				}
			}
		} catch (error) {
			Logger.error('Regenerate and retry failed:', error);
			if (task) {
				task.status = 'error';
				task.error = error instanceof Error ? error.message : 'Unknown error during regeneration';
				this.updatePlanTrackerFn();
			}
		}
	}

	/**
	 * Handle task skip action (mark as completed and continue)
	 */
	async handleTaskSkip(taskId: string): Promise<void> {
		Logger.debug('Skipping task:', taskId);
		
		const planSteps = this.getPlanSteps();
		// Find the step and its index
		const stepIndex = planSteps.findIndex(step => step.step_id === taskId);
		if (stepIndex === -1) {
			Logger.error('Cannot find step for taskId:', taskId);
			return;
		}

		const step = planSteps[stepIndex];
		const task = this.getPlanTasks().find(t => t.id === taskId);
		
		// Mark task as skipped (use distinct status)
		if (task) {
			task.status = 'skipped';
			task.result = this.i18n.t('planExecute.tracker.skippedByUser');
			task.timestamp = new Date().toLocaleString();
			this.updatePlanTrackerFn();
		}

		// Record skipped execution with previous step results
		// Get the previous successful result to pass to next step
		const executionResults = this.getExecutionResults();
		const previousResults = executionResults.filter(r => r.success && r.step_index < stepIndex);
		const lastSuccessResult = previousResults.length > 0 ? previousResults[previousResults.length - 1] : null;
		
		executionResults.push({
			step_id: step.step_id,
			step_index: stepIndex,
			tool_name: step.tool,
			tool_args: step.input,
			tool_result: { 
				success: false, 
				skipped: true,
				// Pass previous result if available so next step can use it
				previousResult: lastSuccessResult?.tool_result
			},
			step_reason: step.reason || '',
			success: false,
			timestamp: new Date().toISOString()
		});

		// If there's a pending tool failure, resolve it with 'skip' action
		// This allows the execution loop to continue
		const pendingToolFailure = this.getPendingToolFailure();
		if (pendingToolFailure && pendingToolFailure.stepId === taskId) {
			Logger.debug('Resolving pendingToolFailure with skip action');
			pendingToolFailure.resolve('skip');
			this.setPendingToolFailure(null);
		}

		// Continue with next step
		Logger.debug('Continuing to next step after skip');
		
		// Mark step as skipped so it shows with distinct icon
		this.updateStaticPlanStepStatusFn(step.step_id, 'skipped');
		this.incrementCompletedStepsFn();
	}
}
