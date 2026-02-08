/**
 * Tool Converter - Converts LLMSider UnifiedTool to Mastra Tool format
 * 
 * This module handles the conversion between LLMSider's tool format and
 * Mastra's tool format, including JSON Schema to Zod schema conversion.
 */

import { z } from 'zod';
import { createTool } from '@mastra/core';
import { Logger } from '../../utils/logger';
import { UnifiedTool } from '../../tools/unified-tool-manager';

/**
 * Simplified JSON Schema type for tool input
 */
interface JSONSchemaProperty {
	type: string;
	description?: string;
	enum?: string[];
	items?: JSONSchemaProperty;
	properties?: Record<string, JSONSchemaProperty>;
	required?: string[];
}

interface JSONSchema {
	type: string;
	properties?: Record<string, JSONSchemaProperty>;
	required?: string[];
}

/**
 * Convert JSON Schema to Zod Schema
 * 
 * This function converts a JSON Schema definition to a Zod schema that
 * Mastra can use for tool input validation.
 */
export function jsonSchemaToZod(jsonSchema: JSONSchema): z.ZodTypeAny {
	if (!jsonSchema || !jsonSchema.properties) {
		Logger.debug('[ToolConverter] Empty schema, returning empty object schema');
		return z.object({});
	}
	
	const zodFields: Record<string, z.ZodTypeAny> = {};
	
	for (const [key, prop] of Object.entries(jsonSchema.properties)) {
		try {
			zodFields[key] = convertPropertyToZod(prop);
			
			// Handle optional fields
			if (!jsonSchema.required?.includes(key)) {
				zodFields[key] = zodFields[key].optional();
			}
		} catch (error) {
			Logger.error(`[ToolConverter] Failed to convert property ${key}:`, error);
			zodFields[key] = z.any();
		}
	}
	
	return z.object(zodFields);
}

/**
 * Convert a single JSON Schema property to Zod type
 */
function convertPropertyToZod(prop: JSONSchemaProperty): z.ZodTypeAny {
	let zodType: z.ZodTypeAny;
	
	switch (prop.type) {
		case 'string':
			zodType = z.string();
			if (prop.enum) {
				// Convert enum to Zod enum
				zodType = z.enum(prop.enum as [string, ...string[]]);
			}
			break;
			
		case 'number':
		case 'integer':
			zodType = z.number();
			break;
			
		case 'boolean':
			zodType = z.boolean();
			break;
			
		case 'array':
			if (prop.items) {
				const itemSchema = convertPropertyToZod(prop.items);
				zodType = z.array(itemSchema);
			} else {
				zodType = z.array(z.any());
			}
			break;
			
		case 'object':
			if (prop.properties) {
				const nestedSchema: Record<string, z.ZodTypeAny> = {};
				for (const [nestedKey, nestedProp] of Object.entries(prop.properties)) {
					nestedSchema[nestedKey] = convertPropertyToZod(nestedProp);
					if (!prop.required?.includes(nestedKey)) {
						nestedSchema[nestedKey] = nestedSchema[nestedKey].optional();
					}
				}
				zodType = z.object(nestedSchema);
			} else {
				zodType = z.object({});
			}
			break;
			
		default:
			Logger.warn(`[ToolConverter] Unknown type ${prop.type}, using z.any()`);
			zodType = z.any();
	}
	
	// Add description if available
	if (prop.description) {
		zodType = zodType.describe(prop.description);
	}
	
	return zodType;
}

/**
 * Convert LLMSider UnifiedTool to Mastra Tool format
 * 
 * Note: The execute function will be provided by the caller with access to UnifiedToolManager
 * 
 * @param unifiedTool - The LLMSider UnifiedTool to convert
 * @param toolExecutor - Function to execute the tool (provided by caller)
 * @returns Mastra-compatible tool definition
 */
export function convertToMastraTool(
	unifiedTool: UnifiedTool,
	toolExecutor: (name: string, args: unknown) => Promise<unknown>
) {
	try {
		// Convert JSON Schema to Zod Schema
		const zodSchema = jsonSchemaToZod(unifiedTool.inputSchema as JSONSchema);
		
		// Use actual createTool from @mastra/core
		const mastraTool = createTool({
			id: unifiedTool.name,
			description: unifiedTool.description,
			inputSchema: zodSchema,
			execute: async ({ context }) => {
				try {
					// Use the provided executor function
					const result = await toolExecutor(unifiedTool.name, context);
					return result;
				} catch (error) {
					Logger.error(`[ToolConverter] Tool execution failed: ${unifiedTool.name}`, error);
					throw error;
				}
			},
		});
		
		// Preserve source and outputSchema for validator
		(mastraTool as any).source = unifiedTool.source;
		(mastraTool as any).outputSchema = unifiedTool.outputSchema;
		
		return mastraTool;
		
	} catch (error) {
		Logger.error(`[ToolConverter] Failed to convert tool ${unifiedTool.name}:`, error);
		throw new Error(`Failed to convert tool ${unifiedTool.name}: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Batch convert multiple tools from LLMSider format to Mastra format
 * 
 * @param tools - Record of UnifiedTools to convert
 * @returns Record of Mastra-compatible tools
 */
export function convertToolsToMastraFormat(
	tools: Record<string, UnifiedTool>,
	toolExecutor: (name: string, args: unknown) => Promise<unknown>
): Record<string, ReturnType<typeof convertToMastraTool>> {
	const mastraTools: Record<string, ReturnType<typeof convertToMastraTool>> = {};
	const errors: Array<{ name: string; error: unknown }> = [];
	
	for (const [name, tool] of Object.entries(tools)) {
		try {
			mastraTools[name] = convertToMastraTool(tool, toolExecutor);
		} catch (error) {
			Logger.error(`[ToolConverter] Failed to convert tool ${name}:`, error);
			errors.push({ name, error });
		}
	}
	
	if (errors.length > 0) {
		Logger.warn(`[ToolConverter] ${errors.length} tools failed to convert:`, 
			errors.map(e => e.name).join(', '));
	}
	
	return mastraTools;
}

/**
 * Validate a Zod schema with sample data
 * Useful for testing and debugging tool conversions
 */
export function validateZodSchema(schema: z.ZodTypeAny, data: unknown): {
	success: boolean;
	data?: unknown;
	error?: z.ZodError;
} {
	try {
		const result = schema.parse(data);
		return { success: true, data: result };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { success: false, error };
		}
		throw error;
	}
}
