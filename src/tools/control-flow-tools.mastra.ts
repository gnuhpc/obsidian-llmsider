/**
 * Control Flow Tools - Mastra Format
 * Provides loop and conditional execution capabilities for agent execution
 */

import { z } from 'zod';
import { Logger } from '../utils/logger';
import { createMastraTool } from './tool-converter';
import type { MastraTool } from './mastra-tool-types';

/**
 * Shared functions injected from built-in-tools.ts
 */
let executeTool: (name: string, args: unknown) => Promise<unknown>;

/**
 * Set shared functions for this module
 */
export function setSharedFunctions(functions: {
	executeTool: (name: string, args: unknown) => Promise<unknown>;
}) {
	executeTool = functions.executeTool;
}

/**
 * for_each tool - Executes a tool multiple times over an array
 * 
 * This is a meta-tool that enables looping in agent plans.
 * It takes an array of items and executes a specified tool for each item.
 */
export const forEachTool: MastraTool = createMastraTool({
  category: 'utility',
	id: 'for_each',
	description: `Execute a tool repeatedly for each item in an array. This enables dynamic looping over the collection.

**CRITICAL USAGE PATTERN**:
- Use this when you need to perform the same operation on multiple items
- The number of iterations is determined at runtime based on the array length
- Each iteration receives the current item as context

**Common Use Cases**:
1. Moving files to folders based on dynamic categorization
2. Processing search results one by one
3. Batch operations where item count is unknown at planning time

**Example**: Organize files into dynamically determined categories
\`\`\`json
{
  "step_id": "step3",
  "tool": "for_each",
  "input": {
    "items": "{{step2.output.categories}}",
    "tool_name": "move_note",
    "tool_input": {
      "source_paths": "{{item.files}}",
      "target_folder": "{{item.folder}}"
    }
  },
  "reason": "Move files to their categorized folders",
  "dependencies": ["step2"]
}
\`\`\`

**Template Variables**:
- Use {{item}} to reference the current iteration item
- Use {{item.field}} to access object fields
- Use {{index}} to get the current iteration index (0-based)`,
	
	inputSchema: z.object({
		items: z.union([z.array(z.any()), z.string()])
			.describe('Array of items to iterate over, or a template string like "{{step2.output.categories}}" that resolves to an array'),
		tool_name: z.string()
			.describe('Name of the tool to execute for each item'),
		tool_input: z.record(z.any())
			.describe('Input parameters for the tool. Use {{item}} to reference current item, {{item.field}} for object fields, {{index}} for iteration index')
	}),
	
	outputSchema: z.array(z.object({}).passthrough())
		.describe('Array of results from executing the tool for each item'),

	execute: async ({ context }) => {
		const { items, tool_name, tool_input } = context;

		Logger.debug('[for_each] Executing loop', {
			tool_name,
			itemsCount: Array.isArray(items) ? items.length : 'not an array'
		});

		if (!Array.isArray(items)) {
			throw new Error('for_each requires an array of items');
		}

		if (!executeTool) {
			throw new Error('Tool executor not initialized for for_each');
		}

		const results = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			
			// Resolve tool_input template variables with current item
			const resolvedToolInput = resolveForEachInput(tool_input as Record<string, unknown>, item, i);
			
			try {
				Logger.debug(`[for_each] Iteration ${i + 1}/${items.length}: Executing ${tool_name}`);
				const result = await executeTool(tool_name, resolvedToolInput);
				results.push(result);
			} catch (error) {
				Logger.error(`[for_each] Iteration ${i + 1} failed:`, error);
				results.push({
					error: error instanceof Error ? error.message : String(error),
					failed: true
				});
			}
		}

		return results;
	}
});

/**
 * Resolve for_each tool_input by replacing {{item}} and {{index}} placeholders
 * Ported from MastraAgent.ts to support direct execution
 */
function resolveForEachInput(
	toolInput: Record<string, unknown>,
	item: any,
	index: number
): Record<string, unknown> {
	const resolved: Record<string, unknown> = {};
	
	for (const [key, value] of Object.entries(toolInput)) {
		if (typeof value === 'string') {
			// Check if the value is ONLY a template (e.g., "{{item.files}}" or "{{item}}")
			const itemFieldMatch = value.match(/^\{\{item\.([^}]+)\}\}$/);
			if (itemFieldMatch) {
				const field = itemFieldMatch[1];
				if (typeof item === 'object' && item !== null && field in item) {
					resolved[key] = item[field];
					continue;
				}
			}
			
			const itemMatch = value.match(/^\{\{item\}\}$/);
			if (itemMatch) {
				resolved[key] = item;
				continue;
			}
			
			// Otherwise, perform string replacement for templates embedded in strings
			let resolvedValue = value;
			
			// Replace {{index}}
			resolvedValue = resolvedValue.replace(/\{\{index\}\}/g, String(index));
			
			// Replace {{item.field}} patterns (embedded in string)
			resolvedValue = resolvedValue.replace(/\{\{item\.([^}]+)\}\}/g, (match, field) => {
				if (typeof item === 'object' && item !== null && field in item) {
					const fieldValue = item[field];
					return typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue);
				}
				return match;
			});
			
			// Replace {{item}} (embedded in string)
			if (resolvedValue.includes('{{item}}')) {
				if (typeof item === 'string') {
					resolvedValue = resolvedValue.replace(/\{\{item\}\}/g, item);
				} else {
					resolvedValue = resolvedValue.replace(/\{\{item\}\}/g, JSON.stringify(item));
				}
			}
			
			resolved[key] = resolvedValue;
		} else if (Array.isArray(value)) {
			// Recursively resolve templates in arrays
			resolved[key] = value.map(arrayItem => {
				if (typeof arrayItem === 'string') {
					// Check if array item is ONLY a template
					const itemFieldMatch = arrayItem.match(/^\{\{item\.([^}]+)\}\}$/);
					if (itemFieldMatch) {
						const field = itemFieldMatch[1];
						if (typeof item === 'object' && item !== null && field in item) {
							return item[field];
						}
					}
					
					const itemMatch = arrayItem.match(/^\{\{item\}\}$/);
					if (itemMatch) {
						return item;
					}
					
					// Perform string replacement for embedded templates
					let resolvedArrayItem = arrayItem;
					resolvedArrayItem = resolvedArrayItem.replace(/\{\{index\}\}/g, String(index));
					resolvedArrayItem = resolvedArrayItem.replace(/\{\{item\.([^}]+)\}\}/g, (match, field) => {
						if (typeof item === 'object' && item !== null && field in item) {
							const fieldValue = item[field];
							return typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue);
						}
						return match;
					});
					if (resolvedArrayItem.includes('{{item}}')) {
						if (typeof item === 'string') {
							resolvedArrayItem = resolvedArrayItem.replace(/\{\{item\}\}/g, item);
						} else {
							resolvedArrayItem = resolvedArrayItem.replace(/\{\{item\}\}/g, JSON.stringify(item));
						}
					}
					return resolvedArrayItem;
				} else if (typeof arrayItem === 'object' && arrayItem !== null) {
					return resolveForEachInput(arrayItem as Record<string, unknown>, item, index);
				}
				return arrayItem;
			});
		} else if (typeof value === 'object' && value !== null) {
			// Recursively resolve templates in nested objects
			resolved[key] = resolveForEachInput(value as Record<string, unknown>, item, index);
		} else {
			resolved[key] = value;
		}
	}
	
	return resolved;
}
