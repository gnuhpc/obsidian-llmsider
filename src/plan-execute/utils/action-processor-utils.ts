import { Logger } from '../../utils/logger';
import { ChatMessage, ToolCall } from '../../types';
import { PlaceholderReplacementError } from './placeholder-utils';

/**
 * Action Processor Utilities
 * 
 * Handles core action processing logic including step ID extraction,
 * MCP parsing, error handling, and observation management.
 */
export class ActionProcessorUtils {
	/**
	 * Extract step_id from action content using multiple patterns
	 */
	static extractStepId(
		actionContent: string,
		currentStepIndex: number,
		planSteps: any[]
	): { stepId: string | null; stepIndex: number } {
		let stepId: string | null = null;
		let stepIndex: number = -1;
		
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
		
		// If no step_id found, try to determine by current execution progress
		if (!stepId && planSteps.length > 0) {
			// Use currentStepIndex to determine which step we're executing
			if (currentStepIndex < planSteps.length) {
				stepId = planSteps[currentStepIndex].step_id;
				stepIndex = currentStepIndex;
				Logger.debug('Using current step index:', currentStepIndex, 'stepId:', stepId);
			} else {
				// Create a fallback step_id if we're beyond the planned steps
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
		
		if (stepId) {
			Logger.debug('Processing step:', stepId, 'at index:', stepIndex);
		} else {
			Logger.warn('Could not extract or determine step_id from action content:', actionContent.substring(0, 200));
		}
		
		return { stepId, stepIndex };
	}

	/**
	 * Parse action content and extract tool name and arguments
	 * Supports MCP format, incomplete MCP, and simple JSON format
	 */
	static parseActionContent(
		actionContent: string,
		sanitizeJSON: (json: string) => string,
		parseIncompleteMCP: (content: string) => { toolName: string; args: any } | null,
		currentStepIndex: number,
		planSteps: any[],
		i18n: any
	): { toolName: string; args: any } {
		Logger.debug('Processing complete action content:', JSON.stringify(actionContent));
		Logger.debug('Action content length:', actionContent.length);

		let toolName: string;
		let args: any;

		// First try to parse complete MCP format: <use_mcp_tool><tool_name>...</tool_name><arguments>...</arguments></use_mcp_tool>
		const mcpMatch = actionContent.match(/<use_mcp_tool>[\s\S]*?<tool_name>\s*([\s\S]*?)\s*<\/tool_name>[\s\S]*?<arguments>\s*([\s\S]*?)\s*<\/arguments>[\s\S]*?<\/use_mcp_tool>/);

		if (mcpMatch) {
			toolName = mcpMatch[1].trim();
			Logger.debug('Extracted tool name from complete MCP:', JSON.stringify(toolName));

			try {
				// Clean and sanitize the JSON arguments
				const rawArgs = mcpMatch[2].trim();
				Logger.debug('Raw MCP arguments:', rawArgs.substring(0, 200) + '...');

				// Handle empty arguments case
				if (!rawArgs || rawArgs === '{}' || rawArgs === '') {
					args = {};
				} else {
					const cleanedArgs = sanitizeJSON(rawArgs);
					Logger.debug('Cleaned MCP arguments:', cleanedArgs.substring(0, 200) + '...');
					args = JSON.parse(cleanedArgs);
				}
			} catch (parseError) {
				Logger.error('Failed to parse MCP arguments:', parseError);
				throw new Error(`${i18n.t('errors.parseError')}: ${parseError instanceof Error ? parseError.message : i18n.t('errors.unknownError')}`);
			}
		} else {
			// Try to parse incomplete MCP format (missing closing tags due to streaming)
			const incompleteMcpMatch = parseIncompleteMCP(actionContent);
			if (incompleteMcpMatch) {
				toolName = incompleteMcpMatch.toolName;
				args = incompleteMcpMatch.args;
				Logger.debug('Extracted from incomplete MCP:', { toolName, args });
			} else {
				// Fallback to simple JSON format: {"tool":"工具名","args":{}} or {"tool":"工具名","input":{}}
				Logger.debug('Trying simple JSON format for action content');
				try {
					const cleanedContent = sanitizeJSON(actionContent);
					const actionData = JSON.parse(cleanedContent);
					toolName = actionData.tool;
					// Support both "args" and "input" field names
					args = actionData.args || actionData.input || {};
				} catch (parseError) {
					Logger.error('Failed to parse action JSON:', parseError);
					throw new Error(`${i18n.t('errors.parseError')}: ${parseError instanceof Error ? parseError.message : i18n.t('errors.unknownError')}`);
				}
			}
		}

		Logger.debug('Final parsed values:', { toolName, args });

		if (!toolName) {
			Logger.error('Tool name is empty after parsing.');
			Logger.debug('Action content that failed to parse:', actionContent.substring(0, 500));

			// Use fallback tool name based on step info
			const fallbackToolName = planSteps[currentStepIndex]?.tool || 'unknown';
			if (fallbackToolName && fallbackToolName !== 'unknown') {
				Logger.debug('Using tool name from current step:', fallbackToolName);
				toolName = fallbackToolName;
				args = args || {};
			} else {
				throw new Error(i18n.t('errors.missingToolName'));
			}
		}

		return { toolName, args };
	}

	/**
	 * Handle tool execution error and create guided observation
	 */
	static createErrorObservation(
		toolName: string,
		errorMessage: string,
		i18n: any
	): { observation: string; guidedObservation: string } {
		const observation = `${i18n.t('status.toolFailed')} ${toolName}: ${errorMessage}`;

		// If it's a parameter validation error, provide guidance for the AI
		let guidedObservation = observation;
		if (errorMessage.includes('缺少必需参数') || errorMessage.includes('未知参数')) {
			guidedObservation += `\n\n请根据工具定义重新调用，确保提供正确的参数。`;
		}

		// If it's a non-existent tool error, provide stronger guidance
		if (errorMessage.includes('不存在')) {
			guidedObservation += `\n\n⚠️ 重要提示：你正在尝试使用一个不存在的工具。请仔细查看可用工具列表，只使用列表中明确存在的工具。不要创造或猜测工具名称。如果需要完成类似的功能，请使用现有工具的组合来实现。`;
		}

		// Add specific guidance for TextEditorTools initialization error
		if (errorMessage.includes('TextEditorTools not initialized')) {
			guidedObservation += `\n\n系统错误：文件编辑工具未正确初始化，请检查插件配置。`;
		}

		return { observation, guidedObservation };
	}

	/**
	 * Create regeneration error for step regeneration context
	 */
	static createRegenerationError(
		errorMessage: string,
		toolName: string,
		stepId: string
	): PlaceholderReplacementError {
		const regenerationError = new PlaceholderReplacementError(
			errorMessage,
			'', // No specific placeholder
			[],
			toolName,
			stepId || 'unknown'
		);
		regenerationError.name = 'ToolExecutionError';
		return regenerationError;
	}

	/**
	 * Create structured system message for tool result
	 */
	static createToolResultMessage(
		structuredPromptManager: any,
		stepId: string | null,
		stepIndex: number,
		toolName: string,
		result: any,
		status: 'success' | 'error',
		observation: string
	): any {
		return structuredPromptManager.createStructuredToolResultMessage(
			stepId || `step_${stepIndex}`,
			toolName,
			result,
			status,
			observation
		);
	}

	/**
	 * Create observation message for conversation
	 */
	static createObservationMessage(
		observation: string,
		toolName: string,
		result: any,
		error?: string
	): ChatMessage {
		return {
			id: Date.now().toString(),
			role: 'assistant' as const,
			content: `<observation>${observation}</observation>`,
			timestamp: Date.now(),
			metadata: {
				phase: 'observation',
				toolName: toolName,
				toolResult: result,
				toolError: error
			}
		};
	}

	/**
	 * Record skipped execution result
	 */
	static createSkippedExecutionResult(
		stepId: string | null,
		stepIndex: number,
		toolName: string,
		args: any,
		result: any,
		errorMessage: string,
		guidedObservation: string,
		planSteps: any[],
		executionResults: any[]
	): any {
		// Get previous successful result for potential fallback
		const lastSuccessResult = executionResults.find((r, idx) => {
			return idx < stepIndex && r.success === true;
		});
		
		// Record FAILED execution result with skipped flag for final answer generation
		return {
			step_id: stepId,
			step_index: stepIndex,
			tool_name: toolName,
			tool_args: args,
			tool_result: {
				...result,
				skipped: true,
				previousResult: lastSuccessResult?.tool_result
			},
			tool_error: errorMessage,
			observation: guidedObservation,
			step_reason: planSteps[stepIndex]?.reason || '', // Include step purpose
			success: false, // IMPORTANT: Mark as failed
			timestamp: Date.now()
		};
	}

	/**
	 * Record successful execution result
	 */
	static createSuccessExecutionResult(
		stepId: string | null,
		stepIndex: number,
		toolName: string,
		args: any,
		result: any,
		observation: string,
		planSteps: any[]
	): any {
		return {
			step_id: stepId,
			step_index: stepIndex,
			tool_name: toolName,
			tool_args: args,
			tool_result: result,
			tool_error: null, // No error for successful execution
			observation: observation,
			step_reason: planSteps[stepIndex]?.reason || '', // Include step purpose for final answer
			success: true, // IMPORTANT: Mark as successful
			timestamp: Date.now()
		};
	}

	/**
	 * Add tool call to task tracker
	 */
	static addToolCallToTask(
		planTasks: any[],
		stepId: string | null,
		recordId: string,
		toolName: string,
		args: any,
		result?: any,
		error?: string
	): void {
		if (!stepId) return;
		
		const task = planTasks.find(t => t.id === stepId);
		if (task) {
			const toolCallInfo: any = {
				id: recordId,
				toolName: toolName,
				toolType: 'builtin',
				parameters: args,
				response: result,
				error: error,
				timestamp: new Date().toISOString(),
				duration: 0
			};
			
			if (!task.toolCalls) {
				task.toolCalls = [];
			}
			task.toolCalls.push(toolCallInfo);
			
			if (error) {
				task.status = 'error';
				Logger.debug('⚠️ Set task status to ERROR due to tool failure');
			}
			
			Logger.debug('Added tool call to task:', { 
				taskId: stepId, 
				toolName, 
				hasError: !!error,
				toolCallsCount: task.toolCalls.length 
			});
		}
	}

	/**
	 * Format regenerated step content for processing
	 */
	static formatRegeneratedStepContent(regeneratedStep: any): string {
		return `\n<tool_call>\n${JSON.stringify({
			tool: regeneratedStep.tool,
			input: regeneratedStep.input
		}, null, 2)}\n</tool_call>\n`;
	}
}
