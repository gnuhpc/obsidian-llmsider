/**
 * Built-in Tool to Mastra Tool Converter
 * 
 * This module provides utilities to convert legacy BuiltInTool format
 * to the new Mastra Tool format with Zod schemas.
 */

import { z } from 'zod';
import { Logger } from '../utils/logger';
import { BuiltInTool, MastraTool } from './mastra-tool-types';

/**
 * JSON Schema property interface for conversion
 */
interface JSONSchemaProperty {
	type: string;
	description?: string;
	enum?: string[];
	items?: JSONSchemaProperty;
	properties?: Record<string, JSONSchemaProperty>;
	required?: string[];
	oneOf?: JSONSchemaProperty[];
	anyOf?: JSONSchemaProperty[];
	default?: unknown;
	minimum?: number;
	maximum?: number;
	format?: string;
}

/**
 * Convert JSON Schema to Zod Schema
 * Handles various JSON Schema types and constructs
 */
export function jsonSchemaToZod(jsonSchema: {
	type: string;
	properties?: Record<string, JSONSchemaProperty>;
	required?: string[];
}): z.ZodTypeAny {
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
	
	// Handle oneOf (union types)
	if (prop.oneOf) {
		const schemas = prop.oneOf.map(p => convertPropertyToZod(p));
		zodType = z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
		if (prop.description) {
			zodType = zodType.describe(prop.description);
		}
		return zodType;
	}
	
	// Handle anyOf (similar to oneOf for our purposes)
	if (prop.anyOf) {
		const schemas = prop.anyOf.map(p => convertPropertyToZod(p));
		zodType = z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
		if (prop.description) {
			zodType = zodType.describe(prop.description);
		}
		return zodType;
	}
	
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
			if (prop.minimum !== undefined) {
				zodType = (zodType as z.ZodNumber).min(prop.minimum);
			}
			if (prop.maximum !== undefined) {
				zodType = (zodType as z.ZodNumber).max(prop.maximum);
			}
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
				zodType = z.object({}).passthrough();
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
	
	// Add default value if available
	if (prop.default !== undefined) {
		zodType = zodType.default(prop.default);
	}
	
	return zodType;
}

/**
 * Convert BuiltInTool to MastraTool format
 * 
 * @param builtInTool - The legacy BuiltInTool to convert
 * @returns MastraTool compatible with Mastra's createTool
 */
export function convertBuiltInToolToMastra(builtInTool: BuiltInTool): MastraTool {
	try {
		// Convert JSON Schema to Zod Schema
		const inputSchema = jsonSchemaToZod(builtInTool.inputSchema as {
			type: string;
			properties?: Record<string, JSONSchemaProperty>;
			required?: string[];
		});
		
		// Convert output schema if provided
		let outputSchema: z.ZodTypeAny | undefined;
		if (builtInTool.outputSchema && typeof builtInTool.outputSchema === 'object') {
			try {
				outputSchema = jsonSchemaToZod(builtInTool.outputSchema as {
					type: string;
					properties?: Record<string, JSONSchemaProperty>;
					required?: string[];
				});
			} catch (error) {
				Logger.warn(`[ToolConverter] Failed to convert output schema for ${builtInTool.name}, skipping`, error);
			}
		}
		
		// Create the Mastra tool
		const mastraTool: MastraTool = {
			id: builtInTool.name,
			description: builtInTool.description,
			inputSchema: inputSchema,
			outputSchema: outputSchema,
			execute: async ({ context, runtimeContext, tracingContext, abortSignal }) => {
				try {
					// Call the original execute function
					// The context is already validated by Zod at this point
					const result = await builtInTool.execute(context);
					return result;
				} catch (error) {
					Logger.error(`[ToolConverter] Tool execution failed: ${builtInTool.name}`, error);
					throw error;
				}
			},
			category: builtInTool.category,
		};
		
		return mastraTool;
		
	} catch (error) {
		Logger.error(`[ToolConverter] Failed to convert tool ${builtInTool.name}:`, error);
		throw new Error(`Failed to convert tool ${builtInTool.name}: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Batch convert multiple BuiltInTools to MastraTools
 * 
 * @param tools - Array or record of BuiltInTools to convert
 * @returns Record of MastraTools
 */
export function convertBuiltInToolsToMastra(
	tools: BuiltInTool[] | Record<string, BuiltInTool>
): Record<string, MastraTool> {
	const mastraTools: Record<string, MastraTool> = {};
	const errors: Array<{ name: string; error: unknown }> = [];
	
	const toolArray = Array.isArray(tools) ? tools : Object.values(tools);
	
	for (const tool of toolArray) {
		try {
			mastraTools[tool.name] = convertBuiltInToolToMastra(tool);
		} catch (error) {
			Logger.error(`[ToolConverter] Failed to convert tool ${tool.name}:`, error);
			errors.push({ name: tool.name, error });
		}
	}
	
	if (errors.length > 0) {
		Logger.warn(`[ToolConverter] ${errors.length} tools failed to convert:`, 
			errors.map(e => e.name).join(', '));
	}
	
	Logger.info(`[ToolConverter] Successfully converted ${Object.keys(mastraTools).length} tools to Mastra format`);
	
	return mastraTools;
}

/**
 * Create a Mastra tool directly from parameters
 * This is a helper function for creating new tools in Mastra format
 */
export function createMastraTool<TInput extends z.ZodTypeAny>(params: {
	id?: string;
	name?: string;
	description: string;
	inputSchema: TInput;
	outputSchema?: z.ZodTypeAny;
	execute: (params: {
		context: z.infer<TInput>;
		runtimeContext?: unknown;
		tracingContext?: unknown;
		abortSignal?: AbortSignal;
	}) => Promise<unknown>;
	category?: string;
}): MastraTool<TInput> {
	const id = params.id || params.name;
	if (!id) {
		throw new Error('Tool must have an id or name');
	}
	return {
		id: id,
		description: params.description,
		inputSchema: params.inputSchema,
		outputSchema: params.outputSchema,
		execute: params.execute,
		category: params.category,
	};
}
