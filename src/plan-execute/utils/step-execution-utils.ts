import { Logger } from '../../utils/logger';
import { PlaceholderReplacementError } from './placeholder-utils';
import { ToolCall } from '../plan-execute-tracker';

/**
 * Step Execution Utilities
 * 
 * Handles step execution sub-tasks including placeholder error handling,
 * content generation coordination, and tool completion waiting.
 */
export class StepExecutionUtils {
	/**
	 * Handle placeholder replacement error with user interaction
	 * Returns the action user chose: 'retry', 'regenerate', or 'skip'
	 */
	static async handlePlaceholderError(
		error: PlaceholderReplacementError,
		step: any,
		stepIndex: number,
		planTasks: any[],
		updateStaticPlanStatus: (stepId: string, status: string, reason?: string, error?: string) => void,
		createToolIndicator: () => HTMLElement,
		updateToolIndicator: (phase: string, toolName: string, args: any, observation?: string) => void,
		updateStepProgress: (indicator: HTMLElement, phase: string, message: string) => void,
		currentStepProgressIndicator: HTMLElement | null,
		currentToolIndicator: HTMLElement | null,
		i18n: any
	): Promise<{
		action: 'retry' | 'regenerate' | 'skip';
		errorMessage: string;
		guidedObservation: string;
	}> {
		Logger.error(`Placeholder replacement failed:`, error);
		
		// Create error message
		const errorMessage = `${i18n.t('planExecute.placeholderError.title')}: ${error.message}`;
		const guidedObservation = `占位符 ${error.placeholder} 替换失败。\n\n可用的字段: ${error.availableFields.join(', ')}\n\n请重新生成步骤使用正确的字段名，或跳过此步骤。`;
		
		// Add toolCall entry for error display in expanded details
		const task = planTasks.find(t => t.id === step.step_id);
		if (task) {
			const toolCallInfo: any = {
				id: Date.now().toString(),
				toolName: step.tool,
				toolType: 'builtin',
				parameters: step.input,
				error: errorMessage,
				timestamp: new Date().toISOString(),
				duration: 0
			};
			
			if (!task.toolCalls) {
				task.toolCalls = [];
			}
			task.toolCalls.push(toolCallInfo);
			
			// Set task status to error
			task.status = 'error';
			task.error = errorMessage;
			Logger.debug('Added placeholder error to task toolCalls for display');
		}
		
		// Update static plan status to failed WITH the error message
		updateStaticPlanStatus(step.step_id, 'failed', undefined, errorMessage);
		
		// Create tool indicator if it doesn't exist yet
		if (!currentToolIndicator) {
			currentToolIndicator = createToolIndicator();
		}
		
		// Show tool execution card with error
		updateToolIndicator('error', step.tool, step.input, guidedObservation);
		
		// Update step progress indicator to show error
		if (currentStepProgressIndicator) {
			updateStepProgress(currentStepProgressIndicator, 'failed', `⚠️ ${errorMessage}`);
		}
		
		// Create a pending promise for user action
		Logger.debug('Creating pendingToolFailure object for placeholder error');
		const userAction = await new Promise<'retry' | 'regenerate' | 'skip'>((resolve) => {
			// This will be resolved by external user action handler
			(window as any).__pendingPlaceholderErrorResolve = resolve;
		});
		
		Logger.debug('User chose action for placeholder error:', userAction);
		
		return { action: userAction, errorMessage, guidedObservation };
	}

	/**
	 * Parse step input from string to object if needed
	 */
	static parseStepInput(
		stepInput: any,
		toolName: string,
		sanitizeJSON: (json: string) => string,
		i18n: any
	): any {
		Logger.debug(`======= PARSING STEP INPUT =======`);
		Logger.debug(`Tool: ${toolName}`);
		Logger.debug(`Input type:`, typeof stepInput);
		Logger.debug(`Input preview:`, 
			typeof stepInput === 'string' ? stepInput.substring(0, 200) : JSON.stringify(stepInput).substring(0, 200));

		// If stepInput is a JSON string, parse it
		if (typeof stepInput === 'string') {
			Logger.debug(`stepInput is a string (length: ${stepInput.length}), attempting to parse...`);
			
			try {
				// First attempt: try parsing as-is
				const parsed = JSON.parse(stepInput);
				if (typeof parsed === 'object' && parsed !== null) {
					Logger.debug(`Successfully parsed stepInput from string to object`);
					return parsed;
				}
			} catch (parseError) {
				Logger.warn(`First parse attempt failed:`, parseError);
				
				// Second attempt: sanitize the JSON string first
				try {
					Logger.debug(`Attempting to sanitize JSON string...`);
					const sanitized = sanitizeJSON(stepInput);
					const parsed = JSON.parse(sanitized);
					if (typeof parsed === 'object' && parsed !== null) {
						Logger.debug(`Successfully parsed stepInput after sanitization`);
						Logger.debug(`Parsed object keys:`, Object.keys(parsed));
						return parsed;
					}
				} catch (sanitizeError) {
					Logger.error(`Sanitization and parsing failed:`, sanitizeError);
					// If we still can't parse it, this is a critical error for content generation tools
					if (toolName === 'create' || toolName === 'append') {
						const errorMsg = `Cannot parse step input as JSON for ${toolName} tool. This is required for content generation. Error: ${sanitizeError instanceof Error ? sanitizeError.message : String(sanitizeError)}`;
						Logger.error(`${errorMsg}`);
						throw new Error(errorMsg);
					}
					// For other tools, continue with string - will be handled later
				}
			}
		}
		
		return stepInput;
	}

	/**
	 * Wait for tool execution to complete with timeout
	 * Returns wait count or throws timeout error
	 */
	static async waitForToolCompletion(
		isExecutingToolGetter: () => boolean,
		isAbortedGetter: () => boolean,
		stepIndex: number,
		maxWaitSeconds: number = 60
	): Promise<number> {
		let waitCount = 0;
		const maxWaitCount = (maxWaitSeconds * 1000) / 50; // Convert seconds to 50ms intervals
		
		while (isExecutingToolGetter()) {
			waitCount++;
			Logger.debug(`[Wait ${waitCount}/${maxWaitCount}] Waiting for tool execution to complete for step ${stepIndex + 1}...`);
			
			// Use shorter polling interval for better responsiveness
			await new Promise(resolve => setTimeout(resolve, 50));

			// Check abort during waiting
			if (isAbortedGetter()) {
				Logger.debug('Step execution aborted during tool execution wait');
				throw new Error('ABORTED');
			}
			
			// Safety check: prevent infinite loop
			if (waitCount > maxWaitCount) {
				throw new Error(`TIMEOUT:${maxWaitSeconds}`);
			}
		}
		
		return waitCount;
	}

	/**
	 * Normalize step input after all processing
	 */
	static normalizeStepInput(
		stepInput: any,
		toolName: string,
		mapInputForTool: (tool: string, input: string) => Promise<any>
	): Promise<any> {
		// Handle different input formats (after content generation)
		if (typeof stepInput === 'string') {
			Logger.warn(`stepInput is still a string after all processing! Length: ${stepInput.length}`);
			Logger.debug(`String preview:`, stepInput.substring(0, 200));
			
			// Last resort: try to parse as JSON
			try {
				stepInput = JSON.parse(stepInput);
				Logger.debug(`Emergency parse successful, got object with keys:`, Object.keys(stepInput || {}));
			} catch (parseError) {
				// If parsing fails, map it to the appropriate parameter for the tool
				Logger.error(`Final parse attempt failed:`, parseError);
				Logger.debug(`Using mapInputForTool as last resort`);
				return mapInputForTool(toolName, stepInput);
			}
		} else if (!stepInput || typeof stepInput !== 'object') {
			// If input is null, undefined, or not an object, create empty object
			Logger.warn(`stepInput is null/undefined/not-object (type: ${typeof stepInput}), creating empty object`);
			stepInput = {};
		} else {
			// stepInput is already an object - this is the expected path
			Logger.debug(`stepInput is correctly an object with keys:`, Object.keys(stepInput));
		}
		
		Logger.debug(`Final processed input for ${toolName}:`, stepInput);
		Logger.debug(`Final input type:`, typeof stepInput);
		Logger.debug(`Final input keys:`, Object.keys(stepInput || {}));
		Logger.debug(`======= END NORMALIZATION =======`);
		
		return Promise.resolve(stepInput);
	}

	/**
	 * Check if tool should generate content
	 */
	static isContentGenerationTool(toolName: string): boolean {
		return ['create', 'append', 'insert', 'str_replace', 'sed'].includes(toolName);
	}

	/**
	 * Create action content for tool execution
	 */
	static createActionContent(stepId: string, toolName: string, stepInput: any): string {
		return `<action step_id="${stepId}">
<use_mcp_tool>
<tool_name>${toolName}</tool_name>
<arguments>${JSON.stringify(stepInput)}</arguments>
</use_mcp_tool>
</action>`;
	}

	/**
	 * Record skipped execution result for placeholder error
	 */
	static createSkippedExecutionResult(
		step: any,
		stepIndex: number,
		error: PlaceholderReplacementError,
		executionResults: any[]
	): any {
		// Get previous successful result for potential fallback
		const lastSuccessResult = executionResults.find((r, idx) => {
			return idx < stepIndex && r.success === true;
		});
		
		return {
			step_id: step.step_id,
			step_index: stepIndex,
			tool_name: step.tool,
			tool_args: step.input,
			tool_result: { 
				success: false,
				skipped: true,
				error: error.message,
				placeholder: error.placeholder,
				availableFields: error.availableFields,
				previousResult: lastSuccessResult?.tool_result
			},
			step_reason: step.reason || '',
			success: false,
			timestamp: new Date().toISOString()
		};
	}

	/**
	 * Record failed execution result
	 */
	static createFailedExecutionResult(
		step: any,
		stepIndex: number,
		errorMessage: string
	): any {
		return {
			step_id: step.step_id,
			step_index: stepIndex,
			tool_name: step.tool,
			tool_args: step.input,
			tool_result: { success: false, error: errorMessage },
			step_reason: step.reason || '',
			success: false,
			timestamp: new Date().toISOString()
		};
	}
}
