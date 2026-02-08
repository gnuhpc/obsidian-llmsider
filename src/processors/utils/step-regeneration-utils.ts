import { Logger } from '../../utils/logger';
import { PlaceholderReplacementError } from './placeholder-utils';

/**
 * Execution result interface
 */
interface ExecutionResult {
	step_id: string;
	tool: string;
	input: unknown;
	tool_result?: unknown;
	tool_name?: string;
	tool_args?: unknown;
	success?: boolean;
	reason?: string;
	timestamp?: string | number;
	step_index?: number;
	tool_error?: unknown;
	observation?: string;
	step_reason?: string;
}

/**
 * Step regeneration utility functions
 */
export class StepRegenerationUtils {
	/**
	 * Intelligently regenerate a step based on error type analysis
	 */
	static async intelligentlyRegenerateStep(
		originalStep: unknown,
		stepIndex: number,
		error: Error,
		executionResults: ExecutionResult[],
		getProvider: () => any,
		getToolManager: () => any,
		abortSignal?: AbortSignal
	): Promise<unknown> {
		Logger.debug('Intelligently regenerating step:', { originalStep, error: error.message });

		// Analyze error type and determine strategy
		const errorMessage = error.message.toLowerCase();
		
		// Strategy 1: Parameter issues
		if (errorMessage.includes('parameter') || errorMessage.includes('required') || errorMessage.includes('validation')) {
			return await StepRegenerationUtils.generateFixedParameterStep(
				originalStep,
				stepIndex,
				error,
				'Parameter validation failed, generating fixed parameters',
				executionResults,
				getProvider,
				getToolManager,
				abortSignal
			);
		}

		// Strategy 2: Tool not available - suggest alternative
		if (errorMessage.includes('not found') || errorMessage.includes('unavailable') || errorMessage.includes('api key')) {
			// Try to find alternative tool
			const toolManager = getToolManager();
			const currentTool = (originalStep as any)?.tool;
			const availableTools = toolManager?.getAvailableTools() || [];
			
			// Simple heuristic: find similar tool name
			const alternativeTool = availableTools.find((t: string) => 
				t !== currentTool && t.toLowerCase().includes(currentTool?.toLowerCase() || '')
			);

			if (alternativeTool) {
				return await StepRegenerationUtils.generateAlternativeStep(
					originalStep,
					stepIndex,
					alternativeTool,
					`Original tool ${currentTool} is unavailable, using ${alternativeTool} instead`,
					executionResults,
					getProvider,
					getToolManager,
					abortSignal
				);
			}
		}

		// Fallback: Just return the original step
		Logger.warn('Could not determine regeneration strategy, returning original step');
		return originalStep;
	}

	/**
	 * Generate a step with fixed parameters
	 */
	static async generateFixedParameterStep(
		originalStep: unknown,
		stepIndex: number,
		error: Error,
		reasoning: string,
		executionResults: ExecutionResult[],
		getProvider: () => any,
		getToolManager: () => any,
		abortSignal?: AbortSignal
	): Promise<unknown> {
		Logger.debug('Generating fixed parameter step:', { reasoning, error: error.message });

		const provider = getProvider();
		if (!provider) {
			throw new Error('No active AI provider available');
		}

		// Build regeneration prompt
		const prompt = `The following step failed due to parameter issues:

Original step: ${JSON.stringify(originalStep, null, 2)}

Error: ${error.message}

Previous execution results:
${JSON.stringify(executionResults.slice(-3), null, 2)}

Please generate a corrected version of this step with valid parameters.
Return ONLY a JSON object matching the original step structure with corrected parameters.

Do not include markdown code blocks or explanations, just the JSON.`;

		// Call AI to fix parameters
		const messages = [{
			id: Date.now().toString(),
			role: 'user' as const,
			content: prompt,
			timestamp: Date.now()
		}];

		try {
			let response = '';
			await provider.sendStreamingMessage(messages, (chunk: any) => {
				if (chunk.delta) {
					response += chunk.delta;
				}
			}, abortSignal);

			// Parse response
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const regeneratedStep = JSON.parse(jsonMatch[0]);
				// 保留原始步骤的依赖关系，确保retry不影响步骤间的依赖
				if ((originalStep as any)?.dependencies) {
					regeneratedStep.dependencies = (originalStep as any).dependencies;
				}
				return regeneratedStep;
			}
		} catch (err) {
			Logger.error('Failed to generate fixed parameter step:', err);
		}

		// Fallback: return original
		return originalStep;
	}

	/**
	 * Generate a step using an alternative tool
	 */
	static async generateAlternativeStep(
		originalStep: unknown,
		stepIndex: number,
		alternativeTool: string,
		reasoning: string,
		executionResults: ExecutionResult[],
		getProvider: () => any,
		getToolManager: () => any,
		abortSignal?: AbortSignal
	): Promise<unknown> {
		Logger.debug('Generating alternative step:', { alternativeTool, reasoning });

		const provider = getProvider();
		if (!provider) {
			throw new Error('No active AI provider available');
		}

		// Build regeneration prompt
		const prompt = `The following step needs to use an alternative tool:

Original step: ${JSON.stringify(originalStep, null, 2)}

Alternative tool to use: ${alternativeTool}

Reasoning: ${reasoning}

Previous execution results:
${JSON.stringify(executionResults.slice(-3), null, 2)}

Please generate a new step using the tool "${alternativeTool}" to achieve the same goal.
Return ONLY a JSON object with step_id, tool, input, and reason fields.

Do not include markdown code blocks or explanations, just the JSON.`;

		// Call AI to generate alternative
		const messages = [{
			id: Date.now().toString(),
			role: 'user' as const,
			content: prompt,
			timestamp: Date.now()
		}];

		try {
			let response = '';
			await provider.sendStreamingMessage(messages, (chunk: any) => {
				if (chunk.delta) {
					response += chunk.delta;
				}
			}, abortSignal);

			// Parse response
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const regeneratedStep = JSON.parse(jsonMatch[0]);
				// 保留原始步骤的依赖关系，确保retry不影响步骤间的依赖
				if ((originalStep as any)?.dependencies) {
					regeneratedStep.dependencies = (originalStep as any).dependencies;
				}
				return regeneratedStep;
			}
		} catch (err) {
			Logger.error('Failed to generate alternative step:', err);
		}

		// Fallback: return original
		return originalStep;
	}

	/**
	 * Regenerate a step that failed due to placeholder errors
	 */
	static async regenerateStepForPlaceholderError(
		originalStep: unknown,
		stepIndex: number,
		error: PlaceholderReplacementError,
		executionResults: ExecutionResult[],
		getProvider: () => any,
		abortSignal?: AbortSignal
	): Promise<unknown> {
		Logger.debug('Regenerating step for placeholder error:', { error });

		const provider = getProvider();
		if (!provider) {
			throw new Error('No active AI provider available');
		}

		// Build context for regeneration
		const previousResults = executionResults
			.filter(result => result.step_index! < stepIndex)
			.map(result => {
				const resultData = result.tool_result || {};
				return {
					step_id: result.step_id,
					tool_name: result.tool_name || result.tool,
					available_fields: Object.keys(resultData as object),
					sample_data: JSON.stringify(resultData).substring(0, 300)
				};
			});

		// Build regeneration prompt
		const prompt = `A step failed due to placeholder error:

Original step: ${JSON.stringify(originalStep, null, 2)}

Error: ${error.message}
Failed placeholder: ${error.placeholder}
Available fields: ${error.availableFields.join(', ')}

Previous execution results:
${JSON.stringify(previousResults, null, 2)}

Please generate a corrected version of this step that:
1. Uses correct field names from the available fields
2. OR generates content directly instead of using placeholders

Return ONLY a JSON object matching the original step structure.
Do not include markdown code blocks or explanations, just the JSON.`;

		// Call AI to regenerate
		const messages = [{
			id: Date.now().toString(),
			role: 'user' as const,
			content: prompt,
			timestamp: Date.now()
		}];

		try {
			let response = '';
			await provider.sendStreamingMessage(messages, (chunk: any) => {
				if (chunk.delta) {
					response += chunk.delta;
				}
			}, abortSignal);

			// Parse response
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const regeneratedStep = JSON.parse(jsonMatch[0]);
				// 保留原始步骤的依赖关系，确保retry不影响步骤间的依赖
				if ((originalStep as any)?.dependencies) {
					regeneratedStep.dependencies = (originalStep as any).dependencies;
				}
				return regeneratedStep;
			}
		} catch (err) {
			Logger.error('Failed to regenerate step:', err);
		}

		// Fallback: return original
		return originalStep;
	}
}
