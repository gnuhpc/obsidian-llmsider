import { Logger } from '../../utils/logger';

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
 * Custom error for placeholder replacement failures
 */
export class PlaceholderReplacementError extends Error {
	constructor(
		message: string,
		public placeholder: string,
		public availableFields: string[],
		public toolName: string,
		public stepId: string
	) {
		super(message);
		this.name = 'PlaceholderReplacementError';
	}
}

/**
 * Placeholder utility functions for Plan-Execute processor
 * Handles placeholder detection, parsing, and value replacement
 */
export class PlaceholderUtils {
	/**
	 * Replace placeholders in input (supports strings, objects, arrays)
	 */
	static replacePlaceholders(input: unknown, executionResults: ExecutionResult[]): unknown {
		Logger.debug('Starting replacement', {
			inputType: typeof input,
			isArray: Array.isArray(input),
			availableResults: executionResults.length
		});

		// Handle null/undefined
		if (input === null || input === undefined) {
			return input;
		}

		// Handle objects recursively
		if (typeof input === 'object' && !Array.isArray(input)) {
			return this.replacePlaceholdersInObject(input as Record<string, unknown>, executionResults);
		}

		// Handle arrays recursively
		if (Array.isArray(input)) {
			return this.replacePlaceholdersInArray(input, executionResults);
		}

		// Handle strings
		if (typeof input === 'string') {
			return this.replacePlaceholdersInString(input, executionResults);
		}

		// Primitive types (number, boolean, etc.) - return as-is
		return input;
	}

	/**
	 * Replace placeholders in an object
	 */
	private static replacePlaceholdersInObject(obj: Record<string, unknown>, executionResults: ExecutionResult[]): unknown {
		const result: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				try {
					result[key] = this.replacePlaceholders(obj[key], executionResults);
				} catch (error) {
					Logger.error(`Error processing key "${key}":`, error);
					throw error;
				}
			}
		}
		return result;
	}

	/**
	 * Replace placeholders in an array
	 */
	private static replacePlaceholdersInArray(arr: unknown[], executionResults: ExecutionResult[]): unknown[] {
		return arr.map((item, index) => {
			try {
				return this.replacePlaceholders(item, executionResults);
			} catch (error) {
				Logger.error(`Error processing array index ${index}:`, error);
				throw error;
			}
		});
	}

	/**
	 * Replace placeholders in a string
	 */
	private static replacePlaceholdersInString(str: string, executionResults: ExecutionResult[]): string {
		// Pattern: {{stepN.fieldName}} (Direct Access) or {{stepN.output.fieldName}} (Backward Compatibility)
		// match[1]: step number, match[2]: first part (output/result or fieldName), match[3]: remaining path
		const placeholderRegex = /\{\{step(\d+)(?:\.([^.}]+))?(?:\.([^}]+))?\}\}/g;
		const matches = [...str.matchAll(placeholderRegex)];

		Logger.debug('Found', matches.length, 'placeholders in string');

		if (matches.length === 0) {
			return str;
		}

		// If string contains only ONE placeholder and nothing else, return the value directly
		// This allows returning complex types (objects, arrays) instead of stringifying them
		if (matches.length === 1 && str.trim() === matches[0][0]) {
			Logger.debug('String contains only placeholder, returning raw value');
			return this.resolveSinglePlaceholder(matches[0], executionResults) as string;
		}

		// For multiple placeholders or mixed content, replace in string
		// This requires converting values to strings
		let result = str;
		for (const match of matches) {
			try {
				const value = this.resolveSinglePlaceholder(match, executionResults);
				const stringValue = this.valueToString(value);
				result = result.replace(match[0], stringValue);
			} catch (error) {
				Logger.error('Error replacing placeholder:', match[0], error);
				throw error;
			}
		}

		return result;
	}

	/**
	 * Resolve a single placeholder match to its value
	 */
	private static resolveSinglePlaceholder(match: RegExpMatchArray, executionResults: ExecutionResult[]): unknown {
		const fullMatch = match[0];
		const stepNum = parseInt(match[1]);
		const part1 = match[2];
		const part2 = match[3];

		Logger.debug('Resolving:', {
			placeholder: fullMatch,
			stepNum,
			part1,
			part2
		});

		// Find the execution result for this step
		const stepResult = this.findStepResult(stepNum, executionResults);
		if (!stepResult) {
			throw new PlaceholderReplacementError(
				`No execution result found for step${stepNum}`,
				fullMatch,
				[],
				'unknown',
				`step${stepNum}`
			);
		}

		// Extract the value
		const value = this.extractValueFromStepResult(stepResult, part1, part2);
		
		if (value === undefined) {
			// Value not found - provide helpful error
			this.throwPlaceholderNotFoundError(fullMatch, stepNum, stepResult, propertyPath);
		}

		return value;
	}

	/**
	 * Find execution result for a step number
	 * If the step was skipped, automatically find the most recent successful step before it
	 */
	private static findStepResult(stepNum: number, executionResults: ExecutionResult[]): ExecutionResult | null {
		const matchingResults = executionResults.filter(result => {
			return result.step_id === `step${stepNum}` || result.step_index === stepNum - 1;
		});

		if (matchingResults.length === 0) {
			return null;
		}

		// Get the last successful result, or the last result as fallback
		const successfulResult = matchingResults.reverse().find(result => result.success === true);
		const stepResult = successfulResult || matchingResults[matchingResults.length - 1];
		
		// If the step was skipped, find the most recent successful step before it
		if (stepResult && (stepResult.tool_result as { skipped?: boolean })?.skipped === true) {
			Logger.debug(`Step ${stepNum} was skipped, looking for previous successful step`);
			
		// Find all results before this step that were successful
		const previousSuccessfulResults = executionResults.filter(result => {
			const resultIndex = result.step_index;
			const currentIndex = stepResult.step_index;
			return resultIndex !== undefined && currentIndex !== undefined && resultIndex < currentIndex && result.success === true;
		});		if (previousSuccessfulResults.length > 0) {
			// Return the most recent successful result
			const fallbackResult = previousSuccessfulResults[previousSuccessfulResults.length - 1];
			Logger.debug(`Using result from step ${(fallbackResult.step_index ?? 0) + 1} as fallback`);
			return fallbackResult;
			} else {
				Logger.warn(`No previous successful steps found for skipped step ${stepNum}`);
				return null;
			}
		}
		
		return stepResult;
	}

	/**
	 * Extract value from step result based on source type and property path
	 */
	private static extractValueFromStepResult(stepResult: ExecutionResult, part1?: string, part2?: string): unknown {
		let value: unknown;

		// Determine the property path based on part1 and part2
		// Supports both Direct Access: {{step1.fieldName}} and Backward Compatibility: {{step1.output.fieldName}}
		let propertyPath: string | undefined;
		let isExplicitSource = false;
		
		if (part1 === 'output' || part1 === 'result' || part1 === 'tool_result') {
			propertyPath = part2;
			isExplicitSource = true;
		} else {
			// Direct access: {{step1.fieldName}} or {{step1}}
			// If part2 exists, it means we have something like {{step1.field1.field2}}
			// but our regex captured part1=field1, part2=field2
			propertyPath = part1 ? (part2 ? `${part1}.${part2}` : part1) : undefined;
		}

		if (!isExplicitSource || part1 === 'output' || part1 === 'result') {
			if (stepResult.tool_result) {
				let resultData = (stepResult.tool_result as { result?: unknown }).result || stepResult.tool_result;
				
				// CRITICAL: If resultData is a JSON string, parse it first
				// This handles tools that return JSON.stringify() output
				if (typeof resultData === 'string') {
					try {
						resultData = JSON.parse(resultData);
						Logger.debug('✅ Parsed JSON string from tool result');
					} catch (e) {
						// Not valid JSON, keep as string
						Logger.debug('Tool result is string but not valid JSON, keeping as-is');
					}
				}
				
				// Extract JSON from content array if present
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				if ((resultData as any).content?.[0]?.type === 'text' && typeof (resultData as any).content[0].text === 'string') {
					try {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						resultData = JSON.parse((resultData as any).content[0].text);
					} catch (e) {
						// Keep original
					}
				}
				
				// Return entire result if no property path
				if (!propertyPath) {
					value = resultData;
				}
				// For primitives, return the value itself
				else if (typeof resultData === 'string' || typeof resultData === 'number' || typeof resultData === 'boolean') {
					value = resultData;
				}
				// Navigate nested properties
				else {
					// Smart handling of "result." prefix in property path
					// If the path starts with "result." but there's no nested "result" field,
					// try accessing the field directly (removing "result." prefix)
					let actualPath = propertyPath;
					
					if (propertyPath.startsWith('result.') && 
					    typeof resultData === 'object' && 
					    resultData !== null &&
					    !('result' in resultData)) {
						// Remove "result." prefix and try again
						const pathWithoutPrefix = propertyPath.substring(7); // Remove "result."
						Logger.debug(`Property path starts with "result." but no nested result field found. Trying without prefix: ${pathWithoutPrefix}`);
						actualPath = pathWithoutPrefix;
					}
					
					value = this.getNestedValue(resultData, actualPath);
					
					// Smart fallback for .content field
					if (value === undefined && propertyPath === 'content') {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						value = (resultData as any).raw_content 
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							|| (resultData as any).results?.[0]?.raw_content 
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							|| (resultData as any).results?.[0]?.content;
					}
					
					// Smart fallback for common field aliases
					if (value === undefined && propertyPath) {
						const fieldAliases: Record<string, string[]> = {
							// URL field aliases - different tools use different names
							'link': ['href', 'url'],
							'href': ['link', 'url'],
							'url': ['link', 'href'],
							// Content field aliases
							'content': ['text', 'body', 'raw_content'],
							'text': ['content', 'body'],
							// Title field aliases
							'title': ['name', 'heading'],
							'name': ['title']
						};
						
						// Extract the last field name from the path (e.g., "results[0].link" -> "link")
						const lastFieldMatch = propertyPath.match(/\.?([^.\[\]]+)(?:\[\d+\])?$/);
						const lastField = lastFieldMatch ? lastFieldMatch[1] : propertyPath;
						
						// Try aliases for this field
						if (fieldAliases[lastField]) {
							Logger.debug(`Field "${lastField}" not found, trying aliases:`, fieldAliases[lastField]);
							
							for (const alias of fieldAliases[lastField]) {
								// Replace last field name with alias
								const aliasPath = propertyPath.replace(new RegExp(`\\.?${lastField}(?=\\[|$)`), `.${alias}`);
								Logger.debug(`Trying alias path: ${aliasPath}`);
								
								value = this.getNestedValue(resultData, aliasPath);
								if (value !== undefined) {
									Logger.debug(`✅ Found value using alias "${alias}"`);
									break;
								}
							}
						}
					}
				}
			}
		} else if (part1 === 'tool_result') {
			value = propertyPath 
				? this.getNestedValue(stepResult.tool_result, propertyPath)
				: stepResult.tool_result;
		}

		// Fallback: try tool_args
		if (value === undefined && stepResult.tool_args) {
			value = propertyPath
				? this.getNestedValue(stepResult.tool_args, propertyPath)
				: stepResult.tool_args;
		}

		return value;
	}

	/**
	 * Get nested value from object using dot notation and array indices
	 * Examples: "results[0].link", "data.items[2].name"
	 */
	private static getNestedValue(obj: unknown, path: string): unknown {
		if (!path) return obj;
		
		const parts = path.split('.');
		let current = obj;
		
		for (const part of parts) {
			if (current === null || current === undefined) {
				return undefined;
			}
			
			// Handle array index notation: results[0]
			const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);
			if (arrayMatch) {
				const key = arrayMatch[1];
				const index = parseInt(arrayMatch[2]);
				current = (current as any)[key]?.[index];
			} else {
				current = (current as any)[part];
			}
		}
		
		return current;
	}

	/**
	 * Convert a value to string for placeholder replacement in strings
	 */
	private static valueToString(value: unknown): string {
		if (typeof value === 'string') {
			return value;
		}
		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}
		if (value === null || value === undefined) {
			return '';
		}
		// For objects/arrays, stringify them
		return JSON.stringify(value, null, 2);
	}

	/**
	 * Throw a helpful error when placeholder value not found
	 */
	private static throwPlaceholderNotFoundError(
		placeholder: string,
		stepNum: number,
		stepResult: ExecutionResult | null,
		propertyPath?: string
	): never {
		if (!stepResult) {
			throw new PlaceholderReplacementError(
				`Placeholder ${placeholder} not found. Step ${stepNum} result not found.`,
				placeholder,
				[],
				'unknown',
				`step${stepNum}`
			);
		}
		const resultData = (stepResult.tool_result as { result?: unknown })?.result || stepResult.tool_result || {};
		
		// Try to extract JSON from content array
		let actualData = resultData;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if ((resultData as any).content?.[0]?.type === 'text' && typeof (resultData as any).content[0].text === 'string') {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				actualData = JSON.parse((resultData as any).content[0].text);
			} catch (e) {
				// Keep original
			}
		}
		
		const availableFields = this.getAvailableFieldsRecursive(actualData);
		
		// Enhanced error message with available fields preview
		Logger.error('❌ Placeholder resolution failed:', {
			placeholder,
			requestedField: propertyPath,
			stepId: stepResult.step_id,
			toolName: stepResult.tool_name,
			availableFields: availableFields.slice(0, 10), // Show first 10 fields
			totalFieldCount: availableFields.length
		});
		
		// Show sample of actual data structure
		Logger.error('📊 Result data structure preview:', 
			JSON.stringify(actualData, null, 2).substring(0, 500) + '...');
		
		throw new PlaceholderReplacementError(
			`Placeholder ${placeholder} not found. Field "${propertyPath}" does not exist in step${stepNum} result. Available fields: ${availableFields.slice(0, 5).join(', ')}${availableFields.length > 5 ? '...' : ''}`,
			placeholder,
			availableFields,
			stepResult.tool_name ?? 'unknown',
			stepResult.step_id
		);
	}

	/**
	 * Get all available fields recursively from an object
	 */
	private static getAvailableFieldsRecursive(obj: unknown, prefix = '', maxDepth = 3, currentDepth = 0): string[] {
		const fields: string[] = [];
		
		if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') {
		return fields;
	}
	
	for (const key in obj) {
		if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
		
		const fullPath = prefix ? `${prefix}.${key}` : key;
		fields.push(fullPath);			const value = (obj as any)[key];
			
			// Handle arrays
			if (Array.isArray(value) && value.length > 0) {
				fields.push(`${fullPath}[0]`);
				const nestedFields = this.getAvailableFieldsRecursive(value[0], `${fullPath}[0]`, maxDepth, currentDepth + 1);
				fields.push(...nestedFields);
			}
			// Handle nested objects
			else if (typeof value === 'object' && value !== null) {
				const nestedFields = this.getAvailableFieldsRecursive(value, fullPath, maxDepth, currentDepth + 1);
				fields.push(...nestedFields);
			}
		}
		
		return fields;
	}

	/**
	 * Check if a string contains any placeholders
	 */
	static containsPlaceholders(text: string): boolean {
		if (!text || typeof text !== 'string') return false;
		const placeholderRegex = /\{\{step\d+\.(output|result|tool_result)(?:\.[^}]+)?\}\}/;
		return placeholderRegex.test(text);
	}

	/**
	 * Extract all placeholder references from text
	 */
	static extractPlaceholders(text: string): string[] {
		if (!text || typeof text !== 'string') return [];
		const placeholderRegex = /\{\{step(\d+)\.(output|result|tool_result)(?:\.([^}]+))?\}\}/g;
		const matches = [...text.matchAll(placeholderRegex)];
		return matches.map(m => m[0]);
	}

	/**
	 * Get step numbers referenced in placeholders
	 */
	static getReferencedSteps(text: string): number[] {
		if (!text || typeof text !== 'string') return [];
		const placeholderRegex = /\{\{step(\d+)\./g;
		const matches = [...text.matchAll(placeholderRegex)];
		return [...new Set(matches.map(m => parseInt(m[1])))].sort((a, b) => a - b);
	}
}
