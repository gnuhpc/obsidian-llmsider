import { Logger } from '../../utils/logger';

/**
 * JSON utility functions for Plan-Execute processor
 * Handles JSON sanitization, parsing, and error recovery
 */
export class JSONUtils {
	/**
	 * Sanitize JSON string by removing/escaping problematic characters
	 */
	static sanitizeJSONString(jsonStr: string): string {
		// Remove any leading/trailing whitespace
		let cleaned = jsonStr.trim();

		// If string doesn't start with { or [, it might be malformed
		if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
			// Try to find the JSON part (using dotall matching with [\s\S])
			const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
			if (jsonMatch) {
				cleaned = jsonMatch[1];
			}
		}

		// Fix extra closing braces/brackets that cause parsing errors
		cleaned = this.fixExtraClosingBraces(cleaned);

		// Replace problematic characters that commonly cause JSON parsing issues
		cleaned = cleaned
			// Remove any non-printable control characters except for allowed whitespace
			.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
			// Remove trailing commas before closing braces/brackets
			.replace(/,(\s*[}\]])/g, '$1');

		// Try to fix line breaks in JSON strings more carefully
		try {
			// First attempt to parse - if it works, return as is
			JSON.parse(cleaned);
			return cleaned;
		} catch (firstError) {
			// If parsing fails, try to fix common issues
			Logger.debug('First parse failed, attempting to fix JSON');

			// Escape unescaped line breaks inside strings
			cleaned = this.escapeNewlinesInJSONStrings(cleaned);

			try {
				// Test the fixed version
				JSON.parse(cleaned);
				return cleaned;
			} catch (secondError) {
				Logger.error('Unable to fix JSON:', { original: jsonStr, cleaned, firstError, secondError });
				// Return the cleaned version anyway, let the original error handling deal with it
				return cleaned;
			}
		}
	}

	/**
	 * Fix extra closing braces/brackets in JSON
	 */
	static fixExtraClosingBraces(jsonStr: string): string {
		let result = jsonStr;
		let braceCount = 0;
		let bracketCount = 0;
		let inString = false;
		let escapeNext = false;

		for (let i = 0; i < result.length; i++) {
			const char = result[i];

			if (escapeNext) {
				escapeNext = false;
				continue;
			}

			if (char === '\\') {
				escapeNext = true;
				continue;
			}

			if (char === '"') {
				inString = !inString;
				continue;
			}

			if (!inString) {
				if (char === '{') {
					braceCount++;
				} else if (char === '}') {
					braceCount--;
					// If we have negative brace count, we have extra closing braces
					if (braceCount < 0) {
						// Truncate at this point
						result = result.substring(0, i);
						break;
					}
					// If brace count is 0 and we started with {, we have complete JSON
					if (braceCount === 0 && result.trim().startsWith('{')) {
						result = result.substring(0, i + 1);
						break;
					}
				} else if (char === '[') {
					bracketCount++;
				} else if (char === ']') {
					bracketCount--;
					// If we have negative bracket count, we have extra closing brackets
					if (bracketCount < 0) {
						// Truncate at this point
						result = result.substring(0, i);
						break;
					}
					// If bracket count is 0 and we started with [, we have complete JSON
					if (bracketCount === 0 && result.trim().startsWith('[')) {
						result = result.substring(0, i + 1);
						break;
					}
				}
			}
		}

		return result;
	}

	/**
	 * Escape newlines inside JSON string values
	 */
	static escapeNewlinesInJSONStrings(jsonStr: string): string {
		let result = '';
		let inString = false;
		let escapeNext = false;

		for (let i = 0; i < jsonStr.length; i++) {
			const char = jsonStr[i];

			if (escapeNext) {
				result += char;
				escapeNext = false;
				continue;
			}

			if (char === '\\') {
				result += char;
				escapeNext = true;
				continue;
			}

			if (char === '"') {
				inString = !inString;
				result += char;
				continue;
			}

			if (inString) {
				// Inside a string, escape special characters
				if (char === '\n') {
					result += '\\n';
				} else if (char === '\r') {
					result += '\\r';
				} else if (char === '\t') {
					result += '\\t';
				} else {
					result += char;
				}
			} else {
				result += char;
			}
		}

		return result;
	}

	/**
	 * Try to parse JSON with fallback strategies
	 */
	static parseJSONWithFallback(jsonStr: string): any {
		try {
			return JSON.parse(jsonStr);
		} catch (error) {
			// Try sanitized version
			const sanitized = this.sanitizeJSONString(jsonStr);
			return JSON.parse(sanitized);
		}
	}
}
