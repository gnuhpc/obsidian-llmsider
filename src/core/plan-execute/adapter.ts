/**
 * Integration Adapter for Mastra Plan-Execute Framework
 * 
 * This module provides an adapter layer that bridges the new Mastra-enhanced
 * plan-execute framework with the existing MastraPlanExecuteProcessor.
 * 
 * It handles conversion between:
 * - Old AgentPlan/AgentStep format <-> New Plan/PlanStep format
 * - Old Task format <-> New ExecTraceEntry format
 * - Tool format differences
 */

import { Logger } from '../../utils/logger';
import {
	Plan,
	PlanStep,
	ToolStep,
	ExecTrace,
	ExecTraceEntry,
	Tool,
	AnyObject,
} from './types';
import {
	AgentPlan,
	AgentStep,
	AgentToolCall,
} from '../agent/mastra-agent';
import { Task } from '../../processors/plan-execute-tracker';
import { UnifiedTool } from '../../tools/unified-tool-manager';

// ============================================================================
// Format Converters
// ============================================================================

/**
 * Convert new Plan format to old AgentPlan format
 */
export function convertPlanToAgentPlan(plan: Plan): AgentPlan {
	return {
		id: plan.created_at || `plan_${Date.now()}`,
		steps: plan.steps.map((step, index) => convertStepToAgentStep(step, index)),
		estimatedTokens: plan.estimated_tokens,
	};
}

/**
 * Convert old AgentPlan format to new Plan format
 */
export function convertAgentPlanToPlan(agentPlan: AgentPlan): Plan {
	return {
		version: '1.0',
		execution: 'sequential', // Legacy plans are sequential
		plan: `Agent plan ${agentPlan.id}`,
		steps: agentPlan.steps.map(convertAgentStepToStep),
		estimated_tokens: agentPlan.estimatedTokens,
		created_at: new Date().toISOString(),
	};
}

/**
 * Convert new PlanStep to old AgentStep format
 */
export function convertStepToAgentStep(step: PlanStep, index: number): AgentStep {
	// Extract tool name from different step types
	let toolName = 'unknown';
	let input: AnyObject = {};
	let dependencies: string[] = [];
	
	if ('tool' in step && step.tool) {
		toolName = step.tool;
		input = step.input || {};
	} else if ('type' in step) {
		switch (step.type) {
			case 'loop':
				toolName = 'loop_executor';
				input = {
					over: step.over,
					as: step.as,
					step: step.step,
					concurrency: step.concurrency,
				};
				break;
			case 'parallel':
				toolName = 'parallel_executor';
				input = { steps: step.steps };
				break;
			case 'reduce':
				toolName = 'reduce_executor';
				input = {
					input: step.input,
					as: step.as,
					reducer: step.reducer,
				};
				break;
			case 'conditional':
				toolName = 'conditional_executor';
				input = {
					condition: step.condition,
					then: step.then,
					otherwise: step.otherwise,
				};
				break;
			case 'final':
				toolName = step.function || 'final_executor';
				input = step.input || {};
				break;
		}
	}
	
	if (step.depends_on) {
		dependencies = step.depends_on;
	}
	
	return {
		id: step.id,
		tool: toolName,
		input,
		reason: step.description || `Step ${index + 1}: ${toolName}`,
		status: 'pending',
		dependencies,
	};
}

/**
 * Convert old AgentStep to new PlanStep format
 */
export function convertAgentStepToStep(agentStep: AgentStep): PlanStep {
	// For most cases, AgentStep maps to ToolStep
	const step: ToolStep = {
		id: agentStep.id,
		tool: agentStep.tool,
		input: agentStep.input as AnyObject,
		description: agentStep.reason,
		depends_on: agentStep.dependencies,
	};
	
	// If there's a result, include output field
	if (agentStep.result !== undefined) {
		step.output = `${agentStep.id}_result`;
	}
	
	return step;
}

/**
 * Convert ExecTraceEntry to Task format (for UI)
 */
export function convertTraceEntryToTask(entry: ExecTraceEntry, planStep: PlanStep): Task {
	// Map status
	let taskStatus: Task['status'] = 'pending';
	switch (entry.status) {
		case 'pending':
			taskStatus = 'pending';
			break;
		case 'running':
			taskStatus = 'in-progress';
			break;
		case 'success':
			taskStatus = 'completed';
			break;
		case 'failed':
			taskStatus = 'error';
			break;
		case 'skipped':
			taskStatus = 'skipped';
			break;
		case 'cancelled':
			// Map cancelled to skipped (closest match in TaskStatus)
			taskStatus = 'skipped';
			break;
	}
	
	// Extract tool name
	const toolName = entry.toolName || ('tool' in planStep ? planStep.tool : undefined);
	
	// Build task
	const task: Task = {
		id: entry.nodeId,
		title: planStep.description || `Step: ${toolName}`,
		description: planStep.description,
		status: taskStatus,
		toolName: toolName,
		timestamp: entry.startTime,
	};
	
	// Add result if available
	if (entry.output !== undefined) {
		task.result = typeof entry.output === 'string'
			? entry.output
			: JSON.stringify(entry.output, null, 2).substring(0, 500);
	}
	
	// Add error if failed
	if (entry.error) {
		task.error = entry.error;
	}
	
	return task;
}

/**
 * Convert AgentStep to Task format (for existing UI)
 */
export function convertAgentStepToTask(step: AgentStep): Task {
	// Map status
	let taskStatus: Task['status'] = 'pending';
	switch (step.status) {
		case 'pending':
			taskStatus = 'pending';
			break;
		case 'executing':
			taskStatus = 'in-progress';
			break;
		case 'completed':
			taskStatus = 'completed';
			break;
		case 'failed':
			taskStatus = 'error';
			break;
		case 'cancelled':
			// Map cancelled to skipped (closest match in TaskStatus)
			taskStatus = 'skipped';
			break;
	}
	
	const task: Task = {
		id: step.id,
		title: step.reason || `Step: ${step.tool}`,
		description: step.reason,
		status: taskStatus,
		toolName: step.tool,
	};
	
	// Add result if available
	if (step.result !== undefined) {
		task.result = typeof step.result === 'string'
			? step.result
			: JSON.stringify(step.result, null, 2).substring(0, 500);
	}
	
	// Add error if failed
	if (step.error) {
		task.error = step.error;
	}
	
	// Add tool calls if available
	if (step.toolCalls && step.toolCalls.length > 0) {
		task.toolCalls = step.toolCalls.map(convertAgentToolCallToTaskToolCall);
	}
	
	return task;
}

/**
 * Convert AgentToolCall to Task's expected format
 */
function convertAgentToolCallToTaskToolCall(toolCall: AgentToolCall): any {
	return {
		id: toolCall.id,
		toolName: toolCall.toolName,
		toolType: toolCall.toolType,
		parameters: toolCall.parameters,
		response: toolCall.response,
		error: toolCall.error,
		timestamp: toolCall.timestamp,
		startTime: toolCall.startTime,
		duration: toolCall.duration,
		reason: toolCall.reason,
	};
}

/**
 * Convert UnifiedTool to framework Tool
 */
export function convertUnifiedToolToTool(unifiedTool: UnifiedTool): Tool {
	return {
		id: unifiedTool.name,
		name: unifiedTool.name,
		description: unifiedTool.description,
		inputSchema: unifiedTool.inputSchema,
		outputSchema: undefined, // UnifiedTool doesn't have output schema
		execute: async (params: AnyObject, context?: AnyObject) => {
			// UnifiedTool has different interface - this is a bridge
			// Actual implementation should be provided by the calling code
			// For now, return params as passthrough
			Logger.warn('[Adapter] UnifiedTool conversion needs proper implementation');
			return params;
		},
	};
}

/**
 * Convert multiple UnifiedTools to Tools record
 */
export function convertUnifiedTools(unifiedTools: Record<string, UnifiedTool>): Record<string, Tool> {
	const tools: Record<string, Tool> = {};
	for (const [id, unifiedTool] of Object.entries(unifiedTools)) {
		tools[id] = convertUnifiedToolToTool(unifiedTool);
	}
	return tools;
}

// ============================================================================
// Execution Adapter
// ============================================================================

/**
 * ExecutionAdapter wraps the new framework to work with existing code
 */
export class ExecutionAdapter {
	/**
	 * Execute a plan in the old AgentPlan format and return results in old format
	 */
	static async executeAgentPlan(
		agentPlan: AgentPlan,
		tools: Record<string, Tool>,
		inputContext: AnyObject = {},
		options?: {
			onStepExecuted?: (step: AgentStep) => void;
			abortController?: AbortController;
		}
	): Promise<{
		context: AnyObject;
		updatedSteps: AgentStep[];
		trace: ExecTrace;
	}> {
		// Import executor (dynamic to avoid circular deps)
		const { DynamicGraphExecutor } = await import('./graph-executor');
		
		// Convert AgentPlan to Plan
		const plan = convertAgentPlanToPlan(agentPlan);
		
		// Create executor
		const executor = new DynamicGraphExecutor(tools);
		
		// Execute with callbacks
		const { context, trace } = await executor.run(plan, inputContext, {
			abortController: options?.abortController,
			onNodeComplete: (nodeId: string, result: unknown) => {
				// Find corresponding agent step and update it
				const agentStep = agentPlan.steps.find((s) => s.id === nodeId);
				if (agentStep && options?.onStepExecuted) {
					agentStep.status = 'completed';
					agentStep.result = result;
					options.onStepExecuted(agentStep);
				}
			},
			onNodeError: (nodeId: string, error: string) => {
				// Find corresponding agent step and update it
				const agentStep = agentPlan.steps.find((s) => s.id === nodeId);
				if (agentStep && options?.onStepExecuted) {
					agentStep.status = 'failed';
					agentStep.error = error;
					options.onStepExecuted(agentStep);
				}
			},
		});
		
		// Update agent steps from trace
		const updatedSteps = agentPlan.steps.map((step) => {
			const entry = trace.entries.find((e) => e.nodeId === step.id);
			if (entry) {
				step.status = entry.status === 'success' ? 'completed' : 
				             entry.status === 'failed' ? 'failed' :
				             entry.status === 'running' ? 'executing' :
				             entry.status === 'cancelled' ? 'cancelled' : 'pending';
				step.result = entry.output;
				step.error = entry.error;
			}
			return step;
		});
		
		return {
			context,
			updatedSteps,
			trace,
		};
	}
	
	/**
	 * Convert execution trace to Task list for UI
	 */
	static convertTraceToTasks(trace: ExecTrace, plan: Plan): Task[] {
		return trace.entries.map((entry) => {
			// Find corresponding plan step
			const planStep = plan.steps.find((s) => s.id === entry.stepId || s.id === entry.nodeId);
			if (!planStep) {
				// Create dummy step
				return {
					id: entry.nodeId,
					title: entry.toolName || 'Unknown step',
					status: entry.status === 'success' ? 'completed' : 
					        entry.status === 'failed' ? 'error' : 'pending',
					toolName: entry.toolName,
				};
			}
			return convertTraceEntryToTask(entry, planStep);
		});
	}
}

// ============================================================================
// Helper Functions for Migration
// ============================================================================

/**
 * Check if a plan is in old AgentPlan format
 */
export function isAgentPlan(obj: unknown): obj is AgentPlan {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'id' in obj &&
		'steps' in obj &&
		Array.isArray((obj as any).steps) &&
		!('version' in obj)  // New plans have version field
	);
}

/**
 * Check if a plan is in new Plan format
 */
export function isPlan(obj: unknown): obj is Plan {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'version' in obj &&
		'steps' in obj &&
		Array.isArray((obj as any).steps)
	);
}

/**
 * Safely convert any plan format to new Plan format
 */
export function normalizePlan(plan: AgentPlan | Plan): Plan {
	if (isPlan(plan)) {
		return plan;
	}
	if (isAgentPlan(plan)) {
		return convertAgentPlanToPlan(plan);
	}
	throw new Error('Unknown plan format');
}

/**
 * Log migration statistics
 */
export function logMigrationStats(trace: ExecTrace): void {
	Logger.info('[Migration] Execution Statistics:', {
		mode: trace.executionMode,
		totalSteps: trace.statistics?.totalSteps,
		successful: trace.statistics?.successfulSteps,
		failed: trace.statistics?.failedSteps,
		duration: trace.totalDurationMs ? `${trace.totalDurationMs}ms` : 'N/A',
	});
}
