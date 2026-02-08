/**
 * JSON utility functions for sanitizing and parsing JSON strings
 */
export class JSONUtils {
	/**
	 * Sanitize JSON string by removing problematic characters
	 * Handles control characters, partial JSON, and common malformations
	 */
	static sanitizeJSONString(str: string): string {
		if (!str) return str;

		let sanitized = str
			// Remove null bytes
			.replace(/\0/g, '')
			// Remove vertical tabs
			.replace(/\v/g, '')
			// Remove form feeds
			.replace(/\f/g, '')
			// Remove backspaces
			.replace(/\b/g, '')
			// Normalize line breaks to \n
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n')
			// Remove control characters (except \n and \t)
			.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

		return sanitized;
	}

	/**
	 * Fix extra closing braces in malformed JSON
	 * Handles cases where LLM adds extra } at the end
	 */
	static fixExtraClosingBraces(str: string): string {
		let fixed = str.trim();
		
		// Count opening and closing braces
		let openCount = (fixed.match(/\{/g) || []).length;
		let closeCount = (fixed.match(/\}/g) || []).length;
		
		// If there are extra closing braces, remove them from the end
		while (closeCount > openCount && fixed.endsWith('}')) {
			fixed = fixed.slice(0, -1).trim();
			closeCount = (fixed.match(/\}/g) || []).length;
		}
		
		return fixed;
	}

	/**
	 * Escape newlines within JSON string values
	 * Handles cases where string values contain unescaped newlines
	 */
	static escapeNewlinesInJSONStrings(str: string): string {
		// Match string values in JSON (between quotes)
		// This regex handles escaped quotes within strings
		return str.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
			// Escape newlines within the matched string
			const escaped = content.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
			return `"${escaped}"`;
		});
	}
}
