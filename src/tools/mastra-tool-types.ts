/**
 * Mastra Tool Types Definition
 * 
 * This module defines the types compatible with Mastra's createTool function.
 * It provides TypeScript interfaces that match Mastra's expected tool format.
 */

import { z } from 'zod';

/**
 * Mastra Tool definition
 * Compatible with tools created using createTool from @mastra/core/tools
 */
export interface MastraTool<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = unknown> {
	/** Unique identifier for the tool */
	id: string;
	
	/** Description of what the tool does - used by agents to decide when to use it */
	description: string;
	
	/** Zod schema defining expected input parameters */
	inputSchema: TInput;
	
	/** Optional Zod schema defining expected output structure */
	outputSchema?: z.ZodTypeAny;
	
	/** Tool execution function */
	execute: (params: {
		context: z.infer<TInput>;
		runtimeContext?: unknown;
		tracingContext?: unknown;
		abortSignal?: AbortSignal;
	}) => Promise<TOutput>;
	
	/** Optional category for grouping tools */
	category?: string;
}

/**
 * Helper type to infer input type from a Mastra tool
 */
export type MastraToolInput<T extends MastraTool> = T extends MastraTool<infer I> ? z.infer<I> : never;

/**
 * Helper type to infer output type from a Mastra tool
 */
export type MastraToolOutput<T extends MastraTool> = T extends MastraTool<unknown, infer O> ? O : never;

/**
 * Legacy BuiltInTool interface (for backward compatibility)
 * Will be deprecated once migration is complete
 */
export interface BuiltInTool {
	name: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: Record<string, unknown>;
		required: string[];
	};
	outputSchema?: unknown;
	execute: (args: unknown) => Promise<unknown>;
	category?: string;
}
