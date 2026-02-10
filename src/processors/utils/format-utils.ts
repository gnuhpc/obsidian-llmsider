import { Logger } from '../../utils/logger';
import { ContentCleaner } from './content-cleaner';

/**
 * Formatting utilities for tool results, prompts, and display
 */
export class FormatUtils {
	/**
	 * Build collected information section for context
	 */
	static buildCollectedInformationSection(executionResults: any[], planSteps: any[]): string {
		if (executionResults.length === 0) {
			return '';
		}

		const infoLines = executionResults
			.filter(result => result.success && result.tool_result)
			.map((result, idx) => {
				const toolResult = result.tool_result;
				const summary = this.summarizeToolResult(toolResult, result.tool_name);
				return `${idx + 1}. ${result.step_reason || result.tool_name}: ${summary}`;
			});

		if (infoLines.length === 0) {
			return '';
		}

		return `## 已收集的信息\n\n${infoLines.join('\n\n')}\n\n`;
	}

	/**
	 * Build execution context section showing all steps and results
	 */
	static buildExecutionContextSection(planSteps: any[], executionResults: any[]): string {
		if (executionResults.length === 0) {
			return '';
		}

		const contextLines = executionResults.map((result, idx) => {
			const status = result.success ? '✅' : '❌';
			const toolName = result.tool_name || 'unknown';
			const reason = result.step_reason || 'No reason provided';
			
			let resultSummary = '';
			if (result.success && result.tool_result) {
				resultSummary = this.summarizeToolResult(result.tool_result, toolName);
			} else if (!result.success) {
				resultSummary = result.error || 'Execution failed';
			}

			return `**Step ${idx + 1}** ${status} \`${toolName}\`\n- Reason: ${reason}\n- Result: ${resultSummary}`;
		});

		return `## Execution Context\n\n${contextLines.join('\n\n')}\n\n`;
	}

	/**
	 * Extract web content from tool results (for context building)
	 */
	static extractWebContentFromResults(executionResults: any[]): string {
		const webContents = executionResults
			.filter(result => result.tool_name === 'fetch_web_content' && result.success && result.tool_result)
			.map(result => {
				const toolResult = result.tool_result;
				const content = toolResult.result?.content || toolResult.content || '';
				return ContentCleaner.processWebContent(content);
			})
			.filter(content => content.length > 0);

		return webContents.join('\n\n---\n\n');
	}

	/**
	 * Summarize tool result for display
	 */
	static summarizeToolResult(toolResult: any, toolName: string): string {
		if (!toolResult) {
			return 'No result';
		}

		// Handle MCP-style tool results with content array
		if (toolResult.content && Array.isArray(toolResult.content)) {
			const textContent = toolResult.content
				.filter((item: any) => item.type === 'text')
				.map((item: any) => item.text)
				.join('\n');
			
			if (textContent) {
				return this.truncateText(textContent, 200);
			}
		}

		// Handle result field
		const result = toolResult.result || toolResult;

		// For search results, show count and first few titles
		if (result.results && Array.isArray(result.results)) {
			const count = result.results.length;
			const titles = result.results
				.slice(0, 3)
				.map((r: any) => r.title || r.name || 'Untitled')
				.join(', ');
			return `Found ${count} results: ${titles}${count > 3 ? '...' : ''}`;
		}

		// For string results, truncate
		if (typeof result === 'string') {
			return this.truncateText(result, 200);
		}

		// For objects, show keys
		if (typeof result === 'object' && result !== null) {
			const keys = Object.keys(result);
			return `Object with keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
		}

		return String(result);
	}

	/**
	 * Parse incomplete MCP format from streaming response
	 */
	static parseIncompleteMCP(text: string): { toolName: string; toolArgs: any } | null {
		try {
			// Try to extract tool name from <tool_call> tag
			const toolNameMatch = text.match(/<tool_call>\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
			if (!toolNameMatch) {
				return null;
			}

			const toolName = toolNameMatch[1];

			// Try to extract arguments from <tool_call> tag
			const argsMatch = text.match(/<tool_call>\s*\{[^}]*"arguments"\s*:\s*(\{[\s\S]*)/);
			if (!argsMatch) {
				return { toolName, toolArgs: {} };
			}

			// Try to parse the arguments JSON (may be incomplete)
			const argsText = argsMatch[1];
			let toolArgs: any = {};

			try {
				toolArgs = JSON.parse(argsText);
			} catch (e) {
				// If parsing fails, try to extract partial data
				Logger.debug('Incomplete arguments JSON, attempting partial parse');
			}

			return { toolName, toolArgs };
		} catch (error) {
			Logger.error('Error parsing incomplete MCP:', error);
			return null;
		}
	}

	/**
	 * Format tool result for observation injection
	 */
	static formatToolResult(toolName: string, toolResult: any): string {
		let formattedResult = '';

		// Handle MCP-style tool results
		if (toolResult.content && Array.isArray(toolResult.content)) {
			const textContent = toolResult.content
				.filter((item: any) => item.type === 'text')
				.map((item: any) => item.text)
				.join('\n');
			formattedResult = textContent;
		} else if (toolResult.result) {
			formattedResult = typeof toolResult.result === 'string' 
				? toolResult.result 
				: JSON.stringify(toolResult.result, null, 2);
		} else {
			formattedResult = JSON.stringify(toolResult, null, 2);
		}

		return formattedResult;
	}

	/**
	 * Truncate text to specified length
	 */
	static truncateText(text: string, maxLength: number): string {
		if (!text || text.length <= maxLength) {
			return text;
		}
		return text.substring(0, maxLength) + '...';
	}

	/**
	 * Format execution results for final answer prompt
	 */
	static formatExecutionResultsForPrompt(executionResults: any[]): string {
		return executionResults
			.filter(result => result.success)
			.map((result, idx) => {
				const toolResult = result.tool_result;
				const formattedResult = this.formatToolResult(result.tool_name, toolResult);
				return `**Step ${idx + 1}**: ${result.step_reason || result.tool_name}\n${formattedResult}`;
			})
			.join('\n\n---\n\n');
	}

	/**
	 * Format output for display in UI
	 */
	static formatOutputForDisplay(output: any): string {
		if (typeof output === 'string') {
			return output;
		}
		if (typeof output === 'number' || typeof output === 'boolean') {
			return String(output);
		}
		if (output === null || output === undefined) {
			return '';
		}
		return JSON.stringify(output, null, 2);
	}

	/**
	 * Format parameters for display in UI
	 */
	static formatParametersForDisplay(params: any): string {
		if (!params || typeof params !== 'object') {
			return String(params);
		}
		
		const entries = Object.entries(params)
			.map(([key, value]) => {
				const displayValue = typeof value === 'string' && value.length > 100
					? value.substring(0, 100) + '...'
					: JSON.stringify(value);
				return `• ${key}: ${displayValue}`;
			});
		
		return entries.join('\n');
	}

	/**
	 * Helper function to escape special regex characters
	 */
	static escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
