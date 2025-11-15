/**
 * Validation utilities for Plan-Execute processor
 * Handles validation checks and type determinations
 */
export class ValidationUtils {
	/**
	 * Check if a tool is used for file creation
	 */
	static isFileCreationTool(toolName: string): boolean {
		const fileCreationTools = ['create', 'create_file', 'write_file', 'save_file'];
		return fileCreationTools.includes(toolName.toLowerCase());
	}

	/**
	 * Determine tool type based on tool name
	 * Returns 'mcp' for MCP tools, 'builtin' for built-in tools, 'api' for others
	 */
	static determineToolType(toolName: string): 'mcp' | 'builtin' | 'api' {
		// Check if it's an MCP tool (starts with mcp_ prefix)
		if (toolName.startsWith('mcp_')) {
			return 'mcp';
		}
		
		// Check common built-in tools
		const builtInTools = [
			'read_file', 'write_file', 'list_files', 'search_files',
			'execute_code', 'vault_search', 'note_create', 'note_update',
			'editor_insert', 'editor_replace'
		];
		
		if (builtInTools.includes(toolName)) {
			return 'builtin';
		}
		
		// Default to API (web search, etc.)
		return 'api';
	}

	/**
	 * Check if an error is a token limit error
	 * Detects various token/context limit error patterns
	 */
	static isTokenLimitError(error: any): boolean {
		if (!error) return false;

		const errorMessage = error.message || error.toString() || '';
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
	 * Convert basic markdown to HTML
	 * Simple conversion for bold, italic, code, and line breaks
	 */
	static convertToHTML(content: string): string {
		if (!content) return '';
		
		return content
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
			.replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
			.replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
			.replace(/\n/g, '<br>'); // Line breaks
	}

	/**
	 * Validate if a string is valid JSON
	 */
	static isValidJSON(str: string): boolean {
		try {
			JSON.parse(str);
			return true;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Check if value is a plain object (not array, not null)
	 */
	static isPlainObject(value: any): boolean {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}

	/**
	 * Check if a file path is absolute
	 */
	static isAbsolutePath(path: string): boolean {
		if (!path) return false;
		// Check for common absolute path patterns
		return path.startsWith('/') || /^[a-zA-Z]:[\\\/]/.test(path);
	}

	/**
	 * Validate tool name format
	 * Tool names should be alphanumeric with underscores, optionally prefixed with mcp_
	 */
	static isValidToolName(toolName: string): boolean {
		if (!toolName || typeof toolName !== 'string') return false;
		
		// Allow alphanumeric, underscores, and optional mcp_ prefix
		const pattern = /^(mcp_)?[a-zA-Z][a-zA-Z0-9_]*$/;
		return pattern.test(toolName);
	}

	/**
	 * Check if a string contains XML-like tags
	 */
	static containsXMLTags(content: string): boolean {
		if (!content) return false;
		return /<[a-zA-Z][^>]*>/.test(content);
	}

	/**
	 * Validate step ID format
	 * Step IDs should follow the pattern: step_1, step_2, etc.
	 */
	static isValidStepId(stepId: string): boolean {
		if (!stepId || typeof stepId !== 'string') return false;
		return /^step_\d+$/.test(stepId);
	}
}
