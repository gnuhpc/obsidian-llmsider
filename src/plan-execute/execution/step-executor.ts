import { Logger } from '../../utils/logger';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { PlanCheckProcessor } from '../plan-check-processor';

/**
 * StepExecutor - 负责执行计划步骤
 * 从 plan-execute-processor.ts 提取，用于减少主文件大小
 */
export class StepExecutor {
	constructor(
		private i18n: I18nManager,
		private planCheckProcessor: PlanCheckProcessor,
		private getPlanSteps: () => any[],
		private getCurrentStepIndex: () => number,
		private setCurrentStepIndex: (index: number) => void,
		private getIsManualStepManagement: () => boolean,
		private setIsManualStepManagement: (value: boolean) => void,
		private getIsAborted: () => boolean,
		private getAbortController: () => AbortController | null,
		private executeStepAndWaitForCompletionFn: (step: any, stepIndex: number, reuseIndicator?: boolean) => Promise<void>,
		private markRemainingStepsAsCancelledFn: (startIndex: number) => void,
		private updateStaticPlanStepStatusFn: (stepId: string, status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped', result?: string, errorMsg?: string) => void,
		private updateStepProgressIndicatorFn: (progressElement: HTMLElement, status: 'preparing' | 'executing' | 'completed' | 'failed' | 'cancelled', message?: string, outputContent?: string, toolName?: string) => void,
		private getStepProgressIndicators: () => Map<string, HTMLElement>,
		private isFileCreationToolFn: (toolName: string) => boolean
	) {}

	/**
	 * Execute plan steps sequentially, one by one with per-step parameter validation
	 * CRITICAL: This method ensures strict sequential execution with early exit on failure
	 */
	async executeStepsSequentially(): Promise<void> {
		Logger.debug('🚀 Starting sequential step execution...');

		const planSteps = this.getPlanSteps();
		if (!planSteps || planSteps.length === 0) {
			Logger.warn('No plan steps to execute');
			return;
		}

		// Reset step index
		this.setCurrentStepIndex(0);
		// Enable manual step management to prevent processAction from automatically advancing steps
		this.setIsManualStepManagement(true);

		try {
			// Execute each step sequentially with individual parameter validation
			for (let i = 0; i < planSteps.length; i++) {
				// Check if aborted before each step
				if (this.getIsAborted() || this.getAbortController()?.signal.aborted) {
					Logger.debug('Step execution aborted at step', i + 1);
					// Update remaining steps as cancelled
					this.markRemainingStepsAsCancelledFn(i);
					return;
				}

				const step = planSteps[i];
				this.setCurrentStepIndex(i);

				Logger.debug(`===== Executing step ${i + 1}/${planSteps.length} =====`);
				Logger.debug(`Step details:`, step);

				// Force hide validation indicator before step execution
				if (this.planCheckProcessor.isValidationIndicatorVisible()) {
					Logger.debug('Force hiding validation indicator before step execution');
					this.planCheckProcessor.forceHideValidationIndicatorImmediate();
				}

				// Execute this step and wait for completion (with per-step validation)
				// CRITICAL: Any error thrown here will stop the entire execution
				try {
					await this.executeStepAndWaitForCompletionFn(step, i);
					Logger.debug(`===== Step ${i + 1} completed successfully =====`);
				} catch (stepError) {
					Logger.error(`===== Step ${i + 1} FAILED =====`);
					Logger.error('Error:', stepError);
					
					// Mark remaining steps as cancelled (starting from the NEXT step after the failed one)
					this.markRemainingStepsAsCancelledFn(i + 1);
					
					// CRITICAL: Stop execution immediately - don't throw error, just return
					// This ensures the finally block runs to clean up, but doesn't continue the loop
					Logger.debug('Stopping execution due to step failure');
					return;
				}
			}

			Logger.debug('===== All steps completed successfully =====');

		} finally {
			// Force hide any remaining validation indicator when execution ends
			if (this.planCheckProcessor.isValidationIndicatorVisible()) {
				Logger.debug('Force hiding validation indicator after execution ends');
				this.planCheckProcessor.forceHideValidationIndicatorImmediate();
			}

			// Reset manual step management mode
			this.setIsManualStepManagement(false);
		}
	}

	/**
	 * Mark remaining steps as cancelled when execution stops early
	 */
	markRemainingStepsAsCancelled(startIndex: number): void {
		const planSteps = this.getPlanSteps();
		Logger.debug(`Marking steps ${startIndex + 1} to ${planSteps.length} as cancelled`);
		
		for (let i = startIndex; i < planSteps.length; i++) {
			const step = planSteps[i];
			
			// Update static plan step status
			this.updateStaticPlanStepStatusFn(step.step_id, 'cancelled');
			
			// If there's a progress indicator for this step, mark it as cancelled
			const stepProgressIndicator = this.getStepProgressIndicators().get(step.step_id);
			if (stepProgressIndicator) {
				this.updateStepProgressIndicatorFn(
					stepProgressIndicator,
					'cancelled',
					this.i18n.t('planExecute.status.cancelled')
				);
			}
		}
	}

	/**
	 * Execute data gathering steps (excluding file creation tools)
	 */
	async executeDataGatheringSteps(): Promise<void> {
		Logger.debug('Starting data gathering step execution...');
		
		const planSteps = this.getPlanSteps();
		if (!planSteps || planSteps.length === 0) {
			Logger.warn('No plan steps to execute');
			return;
		}

		// Filter out file creation steps
		const dataGatheringSteps = planSteps.filter(step => 
			!this.isFileCreationToolFn(step.tool)
		);

		Logger.debug(`Found ${dataGatheringSteps.length} data gathering steps out of ${planSteps.length} total steps`);

		// Enable manual step management to prevent processAction from automatically advancing steps
		this.setIsManualStepManagement(true);

		// Execute each data gathering step sequentially
		for (let i = 0; i < dataGatheringSteps.length; i++) {
			// Check if aborted before each step
			if (this.getIsAborted() || this.getAbortController()?.signal.aborted) {
				Logger.debug('Data gathering step execution aborted at step', i + 1);
				return;
			}

			const step = dataGatheringSteps[i];
			// Find original index in planSteps for progress tracking
			const originalIndex = planSteps.findIndex(s => s.step_id === step.step_id);
			this.setCurrentStepIndex(originalIndex);

			Logger.debug(`Executing data gathering step ${i + 1}/${dataGatheringSteps.length}:`, step);

			// Execute this step and wait for completion
			await this.executeStepAndWaitForCompletionFn(step, originalIndex);
			
			Logger.debug(`Data gathering step ${i + 1} completed successfully`);
		}

		Logger.debug('All data gathering steps completed successfully');
		// Reset manual step management mode
		this.setIsManualStepManagement(false);
	}

	/**
	 * Execute file creation steps normally without modification
	 */
	async executeFileCreationSteps(): Promise<void> {
		Logger.debug('Starting file creation step execution...');
		
		const planSteps = this.getPlanSteps();
		if (!planSteps || planSteps.length === 0) {
			return;
		}

		// Filter file creation steps
		const fileCreationSteps = planSteps.filter(step => 
			this.isFileCreationToolFn(step.tool)
		);

		if (fileCreationSteps.length === 0) {
			Logger.debug('No file creation steps found');
			return;
		}

		Logger.debug(`Found ${fileCreationSteps.length} file creation steps`);

		// Enable manual step management to prevent processAction from automatically advancing steps
		this.setIsManualStepManagement(true);

		// Execute each file creation step sequentially without modification
		for (let i = 0; i < fileCreationSteps.length; i++) {
			// Check if aborted before each step
			if (this.getIsAborted() || this.getAbortController()?.signal.aborted) {
				Logger.debug('File creation step execution aborted at step', i + 1);
				return;
			}

			const step = fileCreationSteps[i];
			// Find original index in planSteps for progress tracking
			const originalIndex = planSteps.findIndex(s => s.step_id === step.step_id);
			this.setCurrentStepIndex(originalIndex);

			Logger.debug(`Executing file creation step ${i + 1}/${fileCreationSteps.length}:`, step);

			// Execute this step normally without any modification
			await this.executeStepAndWaitForCompletionFn(step, originalIndex);
			
			Logger.debug(`File creation step ${i + 1} completed successfully`);
		}

		Logger.debug('All file creation steps completed successfully');
		// Reset manual step management mode
		this.setIsManualStepManagement(false);
	}
}
