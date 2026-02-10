import { Logger } from '../../utils/logger';

/**
 * Validation utilities for tool parameters and action content
 */
export class ValidationUtils {
	/**
	 * Check if MCP tool call content is complete
	 * Used to determine if we've received the full tool call or if it's still streaming
	 */
	static isActionContentComplete(content: string): boolean {
		// MCP format requires </tool_call> closing tag
		if (!content.includes('</tool_call>')) {
			return false;
		}

		// Check if JSON is complete by counting braces
		const openBraces = (content.match(/\{/g) || []).length;
		const closeBraces = (content.match(/\}/g) || []).length;

		return openBraces === closeBraces && openBraces > 0;
	}

	/**
	 * Validate tool parameters before execution
	 * Returns { valid: boolean, error?: string }
	 */
	static validateToolParameters(toolName: string, parameters: any, toolDefinition?: any): { valid: boolean; error?: string } {
		if (!parameters || typeof parameters !== 'object') {
			return { valid: false, error: 'Parameters must be an object' };
		}

		// If no tool definition, skip validation
		if (!toolDefinition) {
			return { valid: true };
		}

		// Check required parameters
		const required = toolDefinition.inputSchema?.required || [];
		for (const param of required) {
			if (!(param in parameters)) {
				return { valid: false, error: `Missing required parameter: ${param}` };
			}
		}

		// Check parameter types if schema is available
		const properties = toolDefinition.inputSchema?.properties || {};
		for (const [key, value] of Object.entries(parameters)) {
			const propSchema = properties[key];
			if (!propSchema) {
				Logger.warn(`Unknown parameter: ${key} for tool ${toolName}`);
				continue;
			}

			// Basic type checking
			const expectedType = propSchema.type;
			const actualType = Array.isArray(value) ? 'array' : typeof value;

			if (expectedType && expectedType !== actualType) {
				return { 
					valid: false, 
					error: `Parameter ${key} has wrong type: expected ${expectedType}, got ${actualType}` 
				};
			}
		}

		return { valid: true };
	}

	/**
	 * Helper function to get nested property from object using path
	 */
	static getNestedValue(obj: any, path: string): any {
		if (!path) return obj;

		// Handle simple property access first
		if (obj.hasOwnProperty(path)) {
			return obj[path];
		}

		// Convert array bracket notation to dot notation
		// e.g., "results[0].url" -> "results.0.url"
		//       "data[1].items[2].name" -> "data.1.items.2.name"
		const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');

		// For dot-notation paths like "results.0.location"
		return normalizedPath.split('.').reduce((current, key) => {
			if (current === undefined || current === null) return undefined;
			return current[key];
		}, obj);
	}

	/**
	 * Check if error is related to token limits
	 */
	static isTokenLimitError(error: unknown): boolean {
		if (!error) return false;

		const errorMessage = (error as any).message || (error as any).toString() || '';
		const errorString = errorMessage.toLowerCase();

		// Common token limit error patterns
		const tokenLimitPatterns = [
			'token count',
			'exceeds the limit',
			'model_max_prompt_tokens_exceeded',
			'context_length_exceeded',
			'maximum context length',
			'token limit',
			'prompt too long',
			'input too long',
			'context window'
		];

		return tokenLimitPatterns.some(pattern => errorString.includes(pattern));
	}

	/**
	 * Check if a tool is used for file creation
	 */
	static isFileCreationTool(toolName: string): boolean {
		const fileCreationTools = [
			'create',
			'create_file',
			'write_file',
			'str_replace',
			'insert',
			'append_file'
		];
		return fileCreationTools.some(tool => toolName.toLowerCase().includes(tool));
	}

	/**
	 * Convert text content to HTML (basic markdown support)
	 */
	static convertToHTML(content: string): string {
		if (!content) return '';

		// Basic markdown to HTML conversion
		let html = content;

		// Convert headers
		html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
		html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
		html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

		// Convert bold
		html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

		// Convert italic
		html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

		// Convert links
		html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

		// Convert line breaks
		html = html.replace(/\n/g, '<br>');

		return html;
	}

	/**
	 * Determine tool type based on tool name
	 */
	static determineToolType(toolName: string): 'mcp' | 'builtin' | 'api' {
		// MCP tools have specific patterns
		if (toolName.includes('_mcp_') || toolName.startsWith('mcp_')) {
			return 'mcp';
		}

	// Built-in tools
	const builtinTools = [
		'view', 'create', 'str_replace', 'insert', 'list_directory',
		'append_file', 'undo_edit',
		'search', 'semantic_search', 'grep_search'
	];		if (builtinTools.includes(toolName)) {
			return 'builtin';
		}

		// Default to API for external tools
		return 'api';
	}
}
