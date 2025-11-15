/**
 * Tool Execution Utilities
 * 
 * This module provides utilities for tool execution, parameter validation,
 * input mapping, and argument cleaning in the plan-execute workflow.
 */

import { Logger } from '../../utils/logger';

/**
 * Tool execution utilities for the Plan-Execute framework
 */
export class ToolExecutionUtils {
	/**
	 * Execute a single tool with validation
	 */
	static async executeTool(
		toolName: string,
		args: any,
		pluginGetToolManager: () => any,
		validateToolParameters: (toolName: string, args: any) => Promise<{valid: boolean, error?: string, suggestion?: string}>
	): Promise<any> {
		Logger.debug('Attempting to execute tool:', { toolName, args });

		// Validate parameters before execution
		const validation = await validateToolParameters(toolName, args);
		if (!validation.valid) {
			const errorMessage = validation.error + (validation.suggestion ? `. ${validation.suggestion}` : '');
			throw new Error(errorMessage);
		}

		// Get unified tool manager
		const toolManager = pluginGetToolManager();
		if (!toolManager) {
			throw new Error('Tool Manager not available');
		}

		// Get tool info for better logging
		const toolInfo = await toolManager.getToolInfo(toolName);
		Logger.debug('Tool info:', toolInfo);

		try {
			// Execute tool using unified tool manager
			Logger.debug(`Executing ${toolInfo.source} tool: ${toolName} from ${toolInfo.server || 'core'}`);
			const toolResult = await toolManager.executeTool(toolName, args);
			Logger.debug('Tool execution result:', toolResult);

			if (!toolResult.success) {
				throw new Error(toolResult.error || 'Tool execution failed');
			}

			// Return the complete result object, not just the inner result
			return toolResult;
		} catch (error) {
			Logger.error('Tool execution error:', error);
			throw error;
		}
	}

	/**
	 * Validate tool parameters against schema
	 */
	static async validateToolParameters(
		toolName: string,
		args: any,
		pluginGetToolManager: () => any,
		i18n: any
	): Promise<{valid: boolean, error?: string, suggestion?: string}> {
		try {
			const toolManager = pluginGetToolManager();
			if (!toolManager) {
				return {valid: false, error: 'Tool Manager not available'};
			}

			// Get tool information
			const toolInfo = await toolManager.getToolInfo(toolName);
			if (!toolInfo.exists) {
				const availableTools = await toolManager.getAllTools();
				return {
					valid: false,
					error: `工具 "${toolName}" 不存在。这个工具名称可能是错误的或者不在可用工具列表中。`,
					suggestion: `请只使用以下可用工具之一: ${availableTools.map((t: any) => t.name).join(', ')}。请仔细检查工具名称的拼写，确保使用的是实际存在的工具。`
				};
			}

			// Get tool schema for validation
			const tool = await toolManager.getTool(toolName);
			if (!tool || !tool.inputSchema) {
				return {valid: true}; // No schema to validate against
			}

			const schema = tool.inputSchema;
			const requiredParams = schema.required || [];
			const availableParams = Object.keys(schema.properties || {});

			// Check for missing required parameters
			const missingRequired = requiredParams.filter((param: string) => !(param in args));
			if (missingRequired.length > 0) {
				const paramDescriptions = missingRequired.map((param: string) => {
					const propSchema = schema.properties[param];
					const desc = propSchema?.description ? ` (${propSchema.description})` : '';
					return `${param}${desc}`;
				});

				return {
					valid: false,
					error: `缺少必需参数: ${missingRequired.join(', ')}`,
					suggestion: `请提供: ${paramDescriptions.join(', ')}`
				};
			}

			// Check for unknown parameters
			const unknownParams = Object.keys(args).filter(param => !availableParams.includes(param));
			if (unknownParams.length > 0) {
				return {
					valid: false,
					error: `未知参数: ${unknownParams.join(', ')}`,
					suggestion: `支持的参数: ${availableParams.join(', ')}`
				};
			}

			return {valid: true};
		} catch (error) {
			return {
				valid: false,
				error: `${i18n.t('errors.parameterValidationFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Map raw string input to appropriate parameter object based on tool's input schema
	 */
	static async mapInputForTool(
		toolName: string,
		rawInput: string,
		pluginGetToolManager: () => any
	): Promise<any> {
		try {
			const toolManager = pluginGetToolManager();
			if (!toolManager) {
				Logger.warn('No tool manager available, using fallback mapping');
				return { input: rawInput };
			}

			// Get tool schema from tool manager
			const tool = await toolManager.getTool(toolName);
			if (!tool || !tool.inputSchema || !tool.inputSchema.properties) {
				Logger.warn(`No schema found for tool ${toolName}, using fallback mapping`);
				return { input: rawInput };
			}

			const properties = tool.inputSchema.properties;
			const required = tool.inputSchema.required || [];

			Logger.debug(`Tool ${toolName} schema:`, { properties, required });

			// Strategy 0: Try to parse as key-value pairs 
			// Format: "key1: value1, key2: value2, ..." or "key1: value1"
			const parseKeyValuePairs = (input: string): any | null => {
				Logger.debug(`Attempting to parse key-value pairs from: "${input}"`);
				
				// Match pattern: word: value, word: value, ...
				// Updated regex to handle values that may contain spaces and commas
				const pairs = input.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^,]+?)(?=,\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:|$)/g);
				Logger.debug(`Found pairs:`, pairs);
				
				if (!pairs) return null;
				
				const result: any = {};
				for (const pair of pairs) {
					const match = pair.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)/);
					if (match) {
						const key = match[1];
						const value = match[2].trim();
						
						// Convert value if it's a number
						const numValue = Number(value);
						result[key] = isNaN(numValue) ? value : numValue;
						
						Logger.debug(`Parsed pair: ${key} = "${value}"`);
					}
				}
				
				Logger.debug(`Parsed result:`, result);
				
				// Validate that parsed keys exist in tool schema
				const parsedKeys = Object.keys(result);
				const validKeys = parsedKeys.filter(key => properties[key]);
				
				Logger.debug(`Valid keys: ${validKeys.length}/${parsedKeys.length}`);
				
				if (validKeys.length === parsedKeys.length && parsedKeys.length > 0) {
					Logger.debug(`Parsed key-value pairs:`, result);
					return result;
				} else {
					Logger.warn(`Some parsed keys not found in schema, falling back to original logic`);
					Logger.warn(`Schema properties:`, Object.keys(properties));
					Logger.warn(`Parsed keys:`, parsedKeys);
					return null;
				}
			};
			
			const parsedParams = parseKeyValuePairs(rawInput);
			if (parsedParams) {
				return parsedParams;
			}

			// Strategy 1: If there's only one required parameter, use it
			if (required.length === 1) {
				const paramName = required[0];
				Logger.debug(`Using single required parameter: ${paramName}`);
				return { [paramName]: rawInput };
			}

			// Strategy 2: Look for common parameter names that match the input
			const commonParamNames = ['query', 'text', 'message', 'input', 'value', 'data'];
			for (const paramName of commonParamNames) {
				if (properties[paramName]) {
					Logger.debug(`Using common parameter name: ${paramName}`);
					return { [paramName]: rawInput };
				}
			}

			// Strategy 3: If there are multiple required parameters, try to find the most likely one
			if (required.length > 1) {
				// Look for parameters that might accept string input
				for (const paramName of required) {
					const paramSchema = properties[paramName];
					if (paramSchema && (paramSchema.type === 'string' || !paramSchema.type)) {
						Logger.debug(`Using first string-type required parameter: ${paramName}`);
						return { [paramName]: rawInput };
					}
				}
				
				// Fallback to first required parameter
				const firstRequired = required[0];
				Logger.debug(`Using first required parameter as fallback: ${firstRequired}`);
				return { [firstRequired]: rawInput };
			}

			// Strategy 4: Fallback - use 'input' as parameter name
			Logger.debug(`Using fallback parameter name: input`);
			return { input: rawInput };
		} catch (error) {
			Logger.error('Error mapping input for tool:', error);
			return { input: rawInput };
		}
	}

	/**
	 * Clean tool arguments to remove unnecessary prefixes or formatting
	 */
	static cleanToolArguments(
		toolName: string,
		input: any,
		cleanGeneratedContent: (content: string) => string
	): any {
		if (!input || typeof input !== 'object') {
			return input;
		}

		// Clone input to avoid mutation
		const cleanedInput = { ...input };

		// For str_replace tool, clean the old_str parameter
		if (toolName === 'str_replace') {
			if (cleanedInput.old_str && typeof cleanedInput.old_str === 'string') {
				const originalOldStr = cleanedInput.old_str;
				cleanedInput.old_str = cleanGeneratedContent(cleanedInput.old_str);
				
				if (cleanedInput.old_str !== originalOldStr) {
					Logger.debug('Cleaned old_str parameter');
					Logger.debug('Original length:', originalOldStr.length);
					Logger.debug('Cleaned length:', cleanedInput.old_str.length);
					Logger.debug('Removed prefixes/intro text');
				}
			}
			
			// Also clean new_str if it has similar issues
			if (cleanedInput.new_str && typeof cleanedInput.new_str === 'string') {
				const originalNewStr = cleanedInput.new_str;
				cleanedInput.new_str = cleanGeneratedContent(cleanedInput.new_str);
				
				if (cleanedInput.new_str !== originalNewStr) {
					Logger.debug('Cleaned new_str parameter');
				}
			}
		}

		// For create tool, clean the file_text parameter
		if (toolName === 'create') {
			if (cleanedInput.file_text && typeof cleanedInput.file_text === 'string') {
				const originalFileText = cleanedInput.file_text;
				cleanedInput.file_text = cleanGeneratedContent(cleanedInput.file_text);
				
				if (cleanedInput.file_text !== originalFileText) {
					Logger.debug('Cleaned file_text parameter');
					Logger.debug('Original length:', originalFileText.length);
					Logger.debug('Cleaned length:', cleanedInput.file_text.length);
				}
			}
		}

		// For insert tool, clean the insert_content parameter
		if (toolName === 'insert') {
			if (cleanedInput.insert_content && typeof cleanedInput.insert_content === 'string') {
				const originalContent = cleanedInput.insert_content;
				cleanedInput.insert_content = cleanGeneratedContent(cleanedInput.insert_content);
				
				if (cleanedInput.insert_content !== originalContent) {
					Logger.debug('Cleaned insert_content parameter');
				}
			}
		}

		// For append tool, clean the append_content parameter
		if (toolName === 'append') {
			if (cleanedInput.append_content && typeof cleanedInput.append_content === 'string') {
				const originalContent = cleanedInput.append_content;
				cleanedInput.append_content = cleanGeneratedContent(cleanedInput.append_content);
				
				if (cleanedInput.append_content !== originalContent) {
					Logger.debug('Cleaned append_content parameter');
				}
			}
		}

		return cleanedInput;
	}

	/**
	 * Estimate tokens for tool execution
	 */
	static estimateTokensForToolExecution(
		toolName: string,
		toolInput: any,
		actionContent: string,
		TokenManager: any
	): number {
		// Base tokens for the action structure
		const actionTokens = TokenManager.estimateTokensForText(actionContent);

		// Additional tokens based on tool type
		let toolSpecificTokens = 0;
		switch (toolName.toLowerCase()) {
			case 'fetch_html':
			case 'read_url':
				// Web fetching typically returns large content
				toolSpecificTokens = 3000;
				break;
			case 'create':
			case 'create_file':
				// File creation with content generation
				toolSpecificTokens = 2000;
				break;
			case 'search':
			case 'grep_search':
				// Search results can be substantial
				toolSpecificTokens = 1500;
				break;
			case 'read_file':
				// Reading files can return large content
				toolSpecificTokens = 2500;
				break;
			default:
				// Default estimation for other tools
				toolSpecificTokens = 1000;
		}

		// Add tokens for input parameters
		const inputTokens = typeof toolInput === 'string' ?
			TokenManager.estimateTokensForText(toolInput) :
			TokenManager.estimateTokensForText(JSON.stringify(toolInput));

		return actionTokens + toolSpecificTokens + inputTokens + 500; // 500 buffer
	}
}
