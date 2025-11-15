import { I18nManager } from '../../i18n/i18n-manager';

/**
 * Formatting utilities for Plan-Execute processor
 * Handles text formatting, truncation, and display preparation
 */
export class FormatUtils {
	/**
	 * Truncate text for preview display
	 */
	static truncateText(text: string, maxLength: number): string {
		if (!text) return '';
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}

	/**
	 * Format output content for display with HTML escaping and truncation
	 */
	static formatOutputForDisplay(outputContent: string, i18n: I18nManager): string {
		if (!outputContent) return i18n.t('common.noOutputContent');

		// If content is very long, truncate it and add a "show more" indicator
		const maxLength = 1000;
		let formattedContent = outputContent;

		// Convert newlines to HTML breaks for better display
		formattedContent = formattedContent.replace(/\n/g, '<br>');

		// If content is too long, truncate it
		if (formattedContent.length > maxLength) {
			formattedContent = formattedContent.substring(0, maxLength) + `<br><span class="output-truncated">${i18n.t('common.outputTruncated')}</span>`;
		}
		
		// Escape HTML entities to prevent XSS (but allow <br> tags)
		formattedContent = formattedContent
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/&lt;br&gt;/g, '<br>')
			.replace(/&lt;span class="output-truncated"&gt;/g, '<span class="output-truncated">')
			.replace(/&lt;\/span&gt;/g, '</span>');
		
		return formattedContent;
	}

	/**
	 * Format tool parameters for display with tool-specific formatting
	 */
	static formatParametersForDisplay(toolName: string, params: any, i18n: I18nManager): string {
		if (!params || typeof params !== 'object') {
			return String(params || '');
		}

		// Handle different tool types with specific formatting
		switch (toolName.toLowerCase()) {
			case 'fetch_html':
			case 'read_url':
				if (params.url) {
					return `${i18n.t('common.url')}: ${params.url}`;
				}
				break;

			case 'create':
			case 'create_file':
			case 'write_file':
				const parts = [];
				if (params.path) {
					parts.push(`${i18n.t('planExecute.contentGeneration.filePath', { path: params.path })}`);
				}
				if (params.file_text || params.content) {
					const content = params.file_text || params.content;
					const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
					parts.push(`${i18n.t('planExecute.contentGeneration.defaultGoal')}: ${preview}`);
				}
				return parts.join('\n');

			case 'search':
			case 'grep_search':
				if (params.query) {
					return `${i18n.t('tools.textSearchReplace.name')}: ${params.query}`;
				}
				break;

			case 'read_file':
				if (params.filePath || params.file_path) {
					return `${i18n.t('planExecute.contentGeneration.filePath', { path: (params.filePath || params.file_path) })}`;
				}
				break;

			case 'replace_string_in_file':
				const replaceParts = [];
				if (params.filePath) {
					replaceParts.push(`${i18n.t('tools.viewFile.name')}: ${params.filePath}`);
				}
				if (params.oldString) {
					const oldPreview = params.oldString.length > 30 ? params.oldString.substring(0, 30) + '...' : params.oldString;
					replaceParts.push(`${i18n.t('tools.textSearchReplace.description')}: ${oldPreview}`);
				}
				return replaceParts.join('\n');

			default:
				// Generic formatting for unknown tools
				const entries = Object.entries(params);
				if (entries.length === 0) {
					return i18n.t('planExecute.contentGeneration.noContent');
				}
				
				return entries.map(([key, value]) => {
					let displayValue: string;
					if (typeof value === 'string') {
						displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
					} else if (typeof value === 'object') {
						displayValue = JSON.stringify(value);
					} else {
						displayValue = String(value);
					}

					// Use parameter name directly without i18n translation
					// Tools parameter names should not be translated for clarity and consistency
					return `${key}: ${displayValue}`;
				}).join('\n');
		}
		
		// Fallback for cases where no specific formatting was returned
		return JSON.stringify(params, null, 2);
	}

	/**
	 * Format tool result for display
	 */
	static formatToolResult(toolResult: any): string {
		if (!toolResult) return '';

		// Handle string results
		if (typeof toolResult === 'string') {
			return toolResult;
		}

		// Handle object results with content array (Anthropic format)
		if (toolResult.content && Array.isArray(toolResult.content)) {
			return toolResult.content
				.map((item: any) => item.text || item.content || JSON.stringify(item))
				.join('\n');
		}

		// Handle object results with result field
		if (toolResult.result) {
			return this.formatToolResult(toolResult.result);
		}

		// Handle object results with output field
		if (toolResult.output) {
			return this.formatToolResult(toolResult.output);
		}

		// Handle objects - stringify them
		if (typeof toolResult === 'object') {
			return JSON.stringify(toolResult, null, 2);
		}

		return String(toolResult);
	}

	/**
	 * Escape HTML special characters
	 */
	static escapeHtml(text: string): string {
		if (!text) return '';
		
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * Format JSON with indentation
	 */
	static formatJSON(obj: any, indent = 2): string {
		try {
			return JSON.stringify(obj, null, indent);
		} catch (e) {
			return String(obj);
		}
	}

	/**
	 * Format duration in milliseconds to human-readable string
	 */
	static formatDuration(ms: number): string {
		if (ms < 1000) {
			return `${Math.round(ms)}ms`;
		}
		
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) {
			return `${seconds}s`;
		}
		
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}

	/**
	 * Format timestamp to readable date/time string
	 */
	static formatTimestamp(timestamp: number | Date): string {
		const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
		return date.toLocaleString();
	}

	/**
	 * Convert bytes to human-readable size
	 */
	static formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		
		return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
	}

	/**
	 * Format list of items as bulleted list
	 */
	static formatList(items: string[], bullet = '•'): string {
		return items.map(item => `${bullet} ${item}`).join('\n');
	}

	/**
	 * Format execution results for prompt context
	 * Converts execution history into formatted text for LLM consumption
	 */
	static formatExecutionResultsForPrompt(
		executionResults: any[],
		i18n: any,
		maxStringLength = 500
	): string {
		if (!executionResults || executionResults.length === 0) {
			return i18n?.t('planExecute.contentGeneration.noExecutionResults') || 'No execution results yet.';
		}

		return executionResults.map((result, index) => {
			const toolName = result.tool_name || i18n?.t('planExecute.contentGeneration.unknownTool') || 'unknown';
			const status = result.tool_error 
				? i18n?.t('planExecute.contentGeneration.executionFailure') || 'FAILED'
				: i18n?.t('planExecute.contentGeneration.executionSuccess') || 'SUCCESS';
			const content = result.observation || result.tool_result?.content || i18n?.t('planExecute.contentGeneration.noContent') || 'No content';
			
			// Return formatted result matching original format
			const stepLabel = i18n?.t('planExecute.stepExecution.executingStepNumber', { 
				step: (index + 1).toString(), 
				total: '1' 
			}) || `Step ${index + 1}`;
			
			const truncatedContent = content.length > maxStringLength 
				? content.substring(0, maxStringLength) + '...' 
				: content;
			
			return `### ${stepLabel}: ${toolName} (${status})\n${truncatedContent}`;
		}).join('\n\n');
	}

	/**
	 * Add line numbers to code
	 */
	static addLineNumbers(code: string): string {
		const lines = code.split('\n');
		const digits = String(lines.length).length;
		
		return lines
			.map((line, i) => {
				const lineNum = String(i + 1).padStart(digits, ' ');
				return `${lineNum} | ${line}`;
			})
			.join('\n');
	}

	/**
	 * Highlight text matches (simple version, returns HTML)
	 */
	static highlightMatches(text: string, searchTerm: string): string {
		if (!searchTerm) return this.escapeHtml(text);
		
		const escaped = this.escapeHtml(text);
		const regex = new RegExp(this.escapeRegExp(searchTerm), 'gi');
		
		return escaped.replace(regex, match => `<mark>${match}</mark>`);
	}

	/**
	 * Escape regex special characters
	 */
	static escapeRegExp(text: string): string {
		return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	/**
	 * Summarize tool result into a concise string
	 * Extracts key information from various result formats
	 */
	static summarizeToolResult(toolResult: any): string {
		if (!toolResult) return 'No result';

		try {
			const result = toolResult.result || toolResult;

			if (typeof result === 'string') {
				return result.length > 200 ? result.substring(0, 200) + '...' : result;
			}

			if (typeof result === 'object') {
				// Extract key information based on common patterns
				if (result.content) {
					const content = Array.isArray(result.content) ? result.content[0] : result.content;
					if (typeof content === 'string') {
						return content.length > 200 ? content.substring(0, 200) + '...' : content;
					}
				}

				if (result.text) {
					return result.text.length > 200 ? result.text.substring(0, 200) + '...' : result.text;
				}

				// For structured results, provide a summary
				const keys = Object.keys(result);
				return `Object with keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
			}

			return String(result).substring(0, 200);
		} catch (error) {
			return `Error summarizing result: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}

	/**
	 * Parse incomplete MCP (Model Context Protocol) action content
	 * Attempts to extract tool name and arguments even from malformed XML/JSON
	 */
	static parseIncompleteMCP(actionContent: string): { toolName: string; args: any } | null {
		try {
			// Try to extract tool name even if closing tags are missing
			const toolNameMatch = actionContent.match(/<tool_name>\s*([\s\S]*?)\s*(?:<\/tool_name>|$)/);
			if (!toolNameMatch) {
				return null;
			}

			const toolName = toolNameMatch[1].trim();
			if (!toolName) {
				return null;
			}

			// Try to extract arguments, even if incomplete
			let args = {};
			const argsMatch = actionContent.match(/<arguments>\s*([\s\S]*?)(?:<\/arguments>|$)/);
			if (argsMatch) {
				let rawArgs = argsMatch[1].trim();

				if (rawArgs && rawArgs !== '' && rawArgs !== '{}') {
					try {
						// Clean up the JSON by removing any XML tags that might be included
						rawArgs = rawArgs.replace(/<\/use_mcp_tool>[\s\S]*$/g, '').trim();

						// Try to complete incomplete JSON
						let fixedArgs = rawArgs;

						// If it doesn't end with } and looks like JSON, try to complete it
						if (rawArgs.startsWith('{') && !rawArgs.endsWith('}')) {
							// Simple completion - just add closing brace
							fixedArgs = rawArgs + '}';
						}

						// If it still doesn't parse, try more aggressive completion
						try {
							args = JSON.parse(fixedArgs);
						} catch (stillFailedError) {
							// JSON completion failed, using empty args
							args = {};
						}
					} catch (parseError) {
						// Failed to parse incomplete arguments, using empty args
						args = {};
					}
				}
			}

			return { toolName, args };

		} catch (error) {
			return null;
		}
	}

	/**
	 * Build collected information section for prompt context
	 * Formats execution results into a readable section showing what information was gathered
	 */
	static buildCollectedInformationSection(executionResults: any[], planSteps: any[]): string {
		if (executionResults.length === 0) {
			return '';
		}

		let infoSection = `## Collected Information\n\n`;
		infoSection += `The following information was collected through preparation steps:\n\n`;

		// Only include completed steps with actual results
		executionResults.forEach((result, index) => {
			if (result.tool_error) {
				return; // Skip failed steps
			}

			const stepNumber = index + 1;
			const toolName = result.tool_name || 'Unknown Tool';
			
			// Find the corresponding plan step for purpose/reason
			const planStep = planSteps.find(s => s.step_id === result.step_id);
			const purpose = planStep?.reason || 'Information gathering';

			infoSection += `### ${toolName} (${purpose})\n`;
			
			// Include the actual collected data
			if (result.observation) {
				infoSection += `${result.observation}\n\n`;
			} else if (result.tool_result) {
				const resultData = result.tool_result;
				if (typeof resultData === 'string') {
					infoSection += `${resultData}\n\n`;
				} else if (typeof resultData === 'object') {
					// For structured data, format it nicely
					if (resultData.result) {
						if (typeof resultData.result === 'string') {
							infoSection += `${resultData.result}\n\n`;
						} else {
							infoSection += `${JSON.stringify(resultData.result, null, 2)}\n\n`;
						}
					} else {
						infoSection += `${JSON.stringify(resultData, null, 2)}\n\n`;
					}
				}
			}
		});

		return infoSection;
	}

	/**
	 * Build execution context section showing all planned steps and their execution status
	 * Provides comprehensive overview of the execution flow for prompt context
	 */
	static buildExecutionContextSection(planSteps: any[], executionResults: any[]): string {
		if (planSteps.length === 0) {
			return '';
		}

		let contextSection = `## Execution Plan Context\n\n`;
		contextSection += `The following steps were planned and executed to accomplish your task:\n\n`;

		// Include all steps with their purposes and execution results
		planSteps.forEach((planStep, index) => {
			const stepNumber = index + 1;
			const stepId = planStep.step_id;
			const toolName = planStep.tool;
			const purpose = planStep.reason || 'No purpose specified';
			
			// Find the execution result for this step
			const executionResult = executionResults.find(r => r.step_id === stepId);
			const hasResult = !!executionResult;
			const status = hasResult 
				? (executionResult.tool_error ? '❌ Failed' : '✅ Completed')
				: '⏳ Pending';

			contextSection += `### Step ${stepNumber}: ${toolName}\n`;
			contextSection += `**Purpose**: ${purpose}\n`;
			contextSection += `**Status**: ${status}\n`;
			
			if (hasResult) {
				if (executionResult.tool_error) {
					contextSection += `**Error**: ${executionResult.tool_error}\n`;
				} else if (executionResult.observation) {
					// Include complete observation without truncation
					contextSection += `**Result**: ${executionResult.observation}\n`;
				} else if (executionResult.tool_result) {
					// Format tool result without truncation
					const result = executionResult.tool_result;
					if (typeof result === 'string') {
						contextSection += `**Result**: ${result}\n`;
					} else if (typeof result === 'object') {
						contextSection += `**Result**: ${JSON.stringify(result, null, 2)}\n`;
					}
				}
			}
			
			contextSection += `\n`;
		});

		return contextSection;
	}

	/**
	 * Extract web content from execution results
	 * Searches through results to find content fetched from web URLs
	 */
	static extractWebContentFromResults(executionResults: any[]): string | null {
		for (const result of executionResults) {
			if (result.tool_name && (result.tool_name.includes('fetch') || result.tool_name.includes('read_url'))) {
				if (result.tool_result?.result?.content) {
					return result.tool_result.result.content;
				}
				if (typeof result.tool_result?.result === 'string') {
					return result.tool_result.result;
				}
			}
		}
		return null;
	}
}
