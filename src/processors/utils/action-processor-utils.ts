import { Logger } from '../../utils/logger';
import { I18nManager } from '../../i18n/i18n-manager';

/**
 * Virtual tool definition for generate_content
 * This is not a real tool but a special instruction for the LLM to generate content
 */
export const GENERATE_CONTENT_VIRTUAL_TOOL = {
	name: 'generate_content',
	description: 'Generate content using LLM based on provided prompt and context',
	category: 'generation' as const,
	inputSchema: {
		type: 'object',
		properties: {
			prompt: {
				type: 'string',
				description: 'The generation prompt/task for the LLM'
			},
			context: {
				type: 'string',
				description: 'Optional context or reference data for generation'
			},
			task: {
				type: 'string',
				description: 'Alternative to prompt - the task description'
			}
		}
	},
	outputSchema: {
		type: 'string',
		description: 'Generated content from LLM as plain text',
		example: 'This is the generated content based on the prompt...'
	}
};

/**
 * Action processor utility functions
 */
export class ActionProcessorUtils {
	/**
	 * Extract step ID from action content
	 */
	static extractStepId(
		actionContent: string,
		planSteps: any[],
		currentStepIndex: number
	): { stepId: string; stepIndex: number } {
		let stepId: string | null = null;
		let stepIndex = -1;

		// Enhanced step_id extraction with multiple patterns
		const stepIdPatterns = [
			/step_id=["']([^"']+)["']/,                    // step_id="step1"
			/<action[^>]*step_id=["']([^"']+)["']/,       // <action step_id="step1">
			/<action[^>]*?\s+step_id=["']([^"']+)["']/,   // <action ... step_id="step1">
			/\bstep_id:\s*["']([^"']+)["']/,              // step_id: "step1"
			/\b(step\d+)\b/i                              // step1, step2, etc.
		];

		for (const pattern of stepIdPatterns) {
			const match = actionContent.match(pattern);
			if (match) {
				stepId = match[1];
				Logger.debug('Extracted step_id:', stepId, 'using pattern:', pattern.source);
				break;
			}
		}

		// If no step_id found, use current step index
		if (!stepId && planSteps.length > 0) {
			if (currentStepIndex < planSteps.length) {
				stepId = planSteps[currentStepIndex].step_id;
				stepIndex = currentStepIndex;
				Logger.debug('Using current step index:', currentStepIndex, 'stepId:', stepId);
			} else {
				stepId = `step${currentStepIndex + 1}`;
				Logger.debug('Created fallback step_id:', stepId);
			}
		} else if (stepId) {
			// Find the step index for the extracted stepId
			stepIndex = planSteps.findIndex(step => step.step_id === stepId);
			if (stepIndex >= 0) {
				Logger.debug('Found step index:', stepIndex, 'for stepId:', stepId);
			}
		}

		return { stepId: stepId || `step_unknown_${Date.now()}`, stepIndex };
	}

	/**
	 * Parse action content to extract tool name and arguments
	 */
	static parseActionContent(
		actionContent: string,
		i18n: I18nManager
	): { toolName: string; args: unknown; isGenerateContent?: boolean } {
		Logger.debug('Parsing action content:', actionContent.substring(0, 200));

		// Check for generate_content format first
		if (actionContent.includes('<generate_content>')) {
			const promptMatch = actionContent.match(/<prompt>([\s\S]*?)<\/prompt>/);
			const contextMatch = actionContent.match(/<context>([\s\S]*?)<\/context>/);
			
			if (promptMatch) {
				const prompt = promptMatch[1].trim();
				const context = contextMatch ? contextMatch[1].trim() : '';
				
				return {
					toolName: 'generate_content',
					args: { prompt, context },
					isGenerateContent: true
				};
			}
		}

		// Try MCP format
		if (actionContent.includes('<use_mcp_tool>')) {
			const toolNameMatch = actionContent.match(/<tool_name>([\s\S]*?)<\/tool_name>/);
			const argsMatch = actionContent.match(/<arguments>([\s\S]*?)<\/arguments>/);

			if (toolNameMatch && argsMatch) {
				const toolName = toolNameMatch[1].trim();
				const argsStr = argsMatch[1].trim();

				try {
					const args = JSON.parse(argsStr);
					return { toolName, args, isGenerateContent: false };
				} catch (e) {
					Logger.error('Failed to parse MCP arguments:', e);
					throw new Error(i18n.t('errors.invalidArguments'));
				}
			}
		}

		// Try JSON format
		try {
			const jsonMatch = actionContent.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				return {
					toolName: parsed.tool || parsed.tool_name || 'unknown',
					args: parsed.input || parsed.arguments || parsed.args || {}
				};
			}
		} catch (e) {
			Logger.error('Failed to parse action JSON:', e);
		}

		throw new Error(i18n.t('errors.invalidActionFormat'));
	}

	/**
	 * Create error observation from execution error
	 */
	static createErrorObservation(
		error: Error,
		i18n: I18nManager
	): { observation: string; guidedObservation: string } {
		const errorMessage = error.message || i18n.t('errors.unknownError');

		const observation = `${i18n.t('planExecute.executionError')}: ${errorMessage}`;
		
		// Create guided observation with suggestions
		let guidedObservation = observation;
		
		// Add suggestions based on error type
		if (errorMessage.toLowerCase().includes('not found')) {
			guidedObservation += `\n\n${i18n.t('planExecute.suggestions.toolNotFound')}`;
		} else if (errorMessage.toLowerCase().includes('parameter')) {
			guidedObservation += `\n\n${i18n.t('planExecute.suggestions.parameterError')}`;
		} else if (errorMessage.toLowerCase().includes('timeout')) {
			guidedObservation += `\n\n${i18n.t('planExecute.suggestions.timeout')}`;
		}

		return { observation, guidedObservation };
	}
}
