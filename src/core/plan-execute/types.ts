/**
 * Mastra-Enhanced Plan-Execute Framework - Core Types
 * 
 * This module defines the core type system for the plan-execute framework,
 * leveraging Zod for runtime validation and TypeScript for compile-time safety.
 */

import { z } from 'zod';

// ============================================================================
// Base Types
// ============================================================================

export type AnyObject = Record<string, unknown>;

// ============================================================================
// Plan DSL Schemas with Zod Validation
// ============================================================================

/**
 * Base step schema - common fields for all step types
 */
export const BaseStepSchema = z.object({
	id: z.string().min(1, 'Step ID is required'),
	description: z.string().optional(),
	depends_on: z.array(z.string()).optional().default([]),
	timeout_ms: z.number().min(0).optional(),
	retry_count: z.number().min(0).max(5).optional().default(0),
});

/**
 * Tool step - executes a single tool
 */
export const ToolStepSchema = BaseStepSchema.extend({
	type: z.literal('tool').optional().default('tool'),
	tool: z.string().min(1, 'Tool name is required'),
	input: z.record(z.unknown()).optional().default({}),
	output: z.string().optional(), // Name to save result into context
});

/**
 * Loop step - iterates over an array and executes a step for each item
 * Note: step field uses z.any() to avoid circular reference, validated at runtime
 */
export const LoopStepSchema = BaseStepSchema.extend({
	type: z.literal('loop'),
	over: z.string().min(1, 'Loop source path is required'), // Path to array in context
	as: z.string().min(1, 'Loop variable name is required'), // Loop variable name
	step: z.any(), // Inner step (recursive) - validated separately to avoid circular ref
	output: z.string().optional(), // Aggregated output name
	concurrency: z.number().min(1).max(10).optional().default(1), // Parallel execution limit
});

/**
 * Parallel step - executes multiple steps in parallel
 * Note: steps field uses z.array(z.any()) to avoid circular reference, validated at runtime
 */
export const ParallelStepSchema = BaseStepSchema.extend({
	type: z.literal('parallel'),
	steps: z.array(z.any()).min(1, 'At least one parallel step required'),
	output: z.string().optional(), // Optional aggregated output
});

/**
 * Reduce step - map-reduce pattern over an array
 */
export const ReduceStepSchema = BaseStepSchema.extend({
	type: z.literal('reduce'),
	input: z.string().min(1, 'Reduce input path is required'), // Path to array
	as: z.string().min(1, 'Item variable name is required'), // Item variable
	reducer: z.union([
		z.any(), // ToolStep - validated separately
		z.string().min(1), // Tool name for simple reduction
	]),
	output: z.string().min(1, 'Reduce output name is required'),
});

/**
 * Conditional step - if-then-else branching
 * Note: then/otherwise fields use z.array(z.any()) to avoid circular reference, validated at runtime
 */
export const ConditionalStepSchema = BaseStepSchema.extend({
	type: z.literal('conditional'),
	condition: z.string().min(1, 'Condition expression is required'),
	then: z.array(z.any()).min(1),
	otherwise: z.array(z.any()).optional(),
});

/**
 * Final step - produces final output (often calls LLM for summarization)
 */
export const FinalStepSchema = BaseStepSchema.extend({
	type: z.literal('final'),
	function: z.string().optional(), // Function/tool name
	input: z.record(z.unknown()).optional(),
	output: z.string().optional(),
});

/**
 * Union of all step types
 * Note: Using z.any() with discriminated union validation to avoid circular reference
 */
export const PlanStepSchema = z.any();

/**
 * Complete plan schema
 */
export const PlanSchema = z.object({
	version: z.literal('1.0').default('1.0'),
	plan: z.string().optional(), // Human-readable plan summary
	execution: z.enum(['sequential', 'dag', 'graph']).default('sequential'),
	steps: z.array(PlanStepSchema).min(1, 'At least one step is required'),
	estimated_tokens: z.number().optional(),
	created_at: z.string().optional(),
});

// ============================================================================
// TypeScript Types (manually defined to avoid circular reference)
// ============================================================================

export type BaseStep = z.infer<typeof BaseStepSchema>;
export type ToolStep = z.infer<typeof ToolStepSchema>;

export interface LoopStep extends BaseStep {
	type: 'loop';
	over: string;
	as: string;
	step: PlanStep;
	output?: string;
	concurrency?: number;
}

export interface ParallelStep extends BaseStep {
	type: 'parallel';
	steps: PlanStep[];
	output?: string;
}

export interface ReduceStep extends BaseStep {
	type: 'reduce';
	input: string;
	as: string;
	reducer: ToolStep | string;
	output: string;
}

export interface ConditionalStep extends BaseStep {
	type: 'conditional';
	condition: string;
	then: PlanStep[];
	otherwise?: PlanStep[];
}

export type FinalStep = z.infer<typeof FinalStepSchema>;

export type PlanStep =
	| ToolStep
	| LoopStep
	| ParallelStep
	| ReduceStep
	| ConditionalStep
	| FinalStep;

export type Plan = z.infer<typeof PlanSchema>;

// ============================================================================
// Tool Interface
// ============================================================================

/**
 * Tool definition - compatible with both MCP tools and built-in tools
 */
export const ToolSchema = z.object({
	id: z.string().min(1),
	name: z.string().optional(),
	description: z.string().optional(),
	inputSchema: z.record(z.unknown()).optional(),
	outputSchema: z.record(z.unknown()).optional(),
});

export type Tool = z.infer<typeof ToolSchema> & {
	execute: (params: AnyObject, context?: AnyObject) => Promise<unknown> | unknown;
};

// ============================================================================
// Execution Trace Types
// ============================================================================

/**
 * Execution trace entry for a single node/step
 */
export const ExecTraceEntrySchema = z.object({
	nodeId: z.string(),
	stepId: z.string().optional(), // Original step ID (before loop expansion)
	status: z.enum(['pending', 'running', 'success', 'failed', 'skipped', 'cancelled']),
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	durationMs: z.number().optional(),
	error: z.string().optional(),
	input: z.unknown().optional(),
	output: z.unknown().optional(),
	retryCount: z.number().default(0),
	toolName: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export type ExecTraceEntry = z.infer<typeof ExecTraceEntrySchema>;

/**
 * Complete execution trace
 */
export const ExecTraceSchema = z.object({
	planId: z.string().optional(),
	executionMode: z.enum(['sequential', 'dag', 'graph']),
	startedAt: z.string(),
	finishedAt: z.string().optional(),
	totalDurationMs: z.number().optional(),
	entries: z.array(ExecTraceEntrySchema),
	contextSnapshot: z.record(z.unknown()).optional(),
	statistics: z.object({
		totalSteps: z.number(),
		successfulSteps: z.number(),
		failedSteps: z.number(),
		skippedSteps: z.number(),
		cancelledSteps: z.number(),
	}).optional(),
});

export type ExecTrace = z.infer<typeof ExecTraceSchema>;

// ============================================================================
// Executor Options
// ============================================================================

/**
 * Options for plan execution
 */
export const ExecutionOptionsSchema = z.object({
	planId: z.string().optional(),
	maxRetries: z.number().min(0).max(5).default(2),
	defaultTimeoutMs: z.number().min(0).default(30000),
	concurrency: z.number().min(1).max(10).default(4),
	enableTrace: z.boolean().default(true),
	abortController: z.any().optional(), // AbortController - cannot be validated by Zod
	onNodeStart: z.function().args(z.string()).returns(z.void()).optional(),
	onNodeComplete: z.function().args(z.string(), z.unknown()).returns(z.void()).optional(),
	onNodeError: z.function().args(z.string(), z.string()).returns(z.void()).optional(),
});

export type ExecutionOptions = Omit<z.infer<typeof ExecutionOptionsSchema>, 'abortController'> & {
	abortController?: AbortController;
};

// ============================================================================
// Graph Node Types (for DAG execution)
// ============================================================================

/**
 * Node function type - executes a single node in the graph
 */
export type NodeFn = (context: AnyObject) => Promise<unknown> | unknown;

/**
 * Graph node for DAG execution
 */
export interface GraphNode {
	id: string;
	fn: NodeFn;
	deps: string[];
	executed: boolean;
	metadata?: {
		originalStepId?: string;
		toolName?: string;
		loopIndex?: number;
		inputSchema?: z.ZodSchema<unknown>;
	};
}

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * Validation result for plan or step validation
 */
export interface ValidationResult {
	success: boolean;
	errors?: Array<{
		path: string;
		message: string;
	}>;
	warnings?: Array<{
		path: string;
		message: string;
	}>;
}

// ============================================================================
// Export all schemas for runtime validation
// ============================================================================

export const Schemas = {
	BaseStep: BaseStepSchema,
	ToolStep: ToolStepSchema,
	LoopStep: LoopStepSchema,
	ParallelStep: ParallelStepSchema,
	ReduceStep: ReduceStepSchema,
	ConditionalStep: ConditionalStepSchema,
	FinalStep: FinalStepSchema,
	PlanStep: PlanStepSchema,
	Plan: PlanSchema,
	Tool: ToolSchema,
	ExecTraceEntry: ExecTraceEntrySchema,
	ExecTrace: ExecTraceSchema,
	ExecutionOptions: ExecutionOptionsSchema,
};
