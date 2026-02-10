import { Logger } from '../../utils/logger';
import { PlaceholderUtils } from './placeholder-utils';

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
 * Step execution utility functions
 */
export class StepExecutionUtils {
	/**
	 * Parse step input from various formats
	 */
	static parseStepInput(
		input: unknown,
		toolName: string,
		sanitizeJSON: (json: string) => string,
		i18n: any
	): unknown {
		if (typeof input === 'string') {
			try {
				const sanitized = sanitizeJSON(input);
				return JSON.parse(sanitized);
			} catch (error) {
				Logger.warn(`Failed to parse step input for ${toolName}:`, error);
				return input;
			}
		}

		return input;
	}

	/**
	 * Check if a tool is a content generation tool
	 */
	static isContentGenerationTool(toolName: string): boolean {
		const contentTools = [
			'create',
			'create_file',
			'write_file',
			'update_file',
			'append_file',
			'str_replace'
		];

		return contentTools.some(tool => toolName.toLowerCase().includes(tool));
	}

	/**
	 * Check if a step is a content generation step (LLM-based, not a tool)
	 */
	static isContentGenerationStep(step: any): boolean {
		return step?.step_type === 'generate_content' || 
		       step?.tool === 'generate_content' || 
		       step?.tool === 'create_content' ||
		       step?.tool === 'content_generation';
	}

	/**
	 * Normalize step input based on tool type
	 */
	static async normalizeStepInput(
		stepInput: unknown,
		toolName: string,
		mapInputForTool: (toolName: string, input: string) => Promise<unknown>
	): Promise<unknown> {
		// If input is a string and tool accepts structured input, map it
		if (typeof stepInput === 'string') {
			return await mapInputForTool(toolName, stepInput);
		}

		return stepInput;
	}

	/**
	 * Create action content for execution
	 */
	static createActionContent(
		stepId: string,
		toolName: string,
		input: unknown,
		isGenerateContent: boolean = false
	): string {
		if (isGenerateContent) {
			// Create generate_content format
			const inputObj = input as any;
			const prompt = inputObj?.prompt || '';
			const context = inputObj?.context || '';
			
			return `<action step_id="${stepId}">
<generate_content>
<prompt>${prompt}</prompt>
${context ? `<context>${context}</context>` : ''}
</generate_content>
</action>`;
		} else {
			// Create MCP format action content
			return `<action step_id="${stepId}">
<use_mcp_tool>
<tool_name>${toolName}</tool_name>
<arguments>${JSON.stringify(input, null, 2)}</arguments>
</use_mcp_tool>
</action>`;
		}
	}

	/**
	 * Wait for tool completion with timeout
	 */
	static async waitForToolCompletion(
		isExecutingTool: { value: boolean },
		maxWaitTime: number = 30000
	): Promise<number> {
		const checkInterval = 100; // Check every 100ms
		let waitCount = 0;
		const maxChecks = maxWaitTime / checkInterval;

		while (isExecutingTool.value && waitCount < maxChecks) {
			await new Promise(resolve => setTimeout(resolve, checkInterval));
			waitCount++;

			if (waitCount % 10 === 0) {
				Logger.debug(`Waiting for tool completion: ${waitCount * checkInterval}ms elapsed`);
			}
		}

		if (waitCount >= maxChecks) {
			Logger.warn(`Tool execution timeout after ${maxWaitTime}ms`);
		}

		return waitCount;
	}
}
