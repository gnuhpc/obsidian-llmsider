/**
 * Mastra-Enhanced Plan-Execute Framework - Dynamic Graph Executor
 * 
 * This module implements a sophisticated DAG (Directed Acyclic Graph) executor
 * that supports:
 * - Parallel execution of independent steps
 * - Loop expansion (static and dynamic)
 * - Conditional branching
 * - Reduce operations
 * - Retry logic with exponential backoff
 * - Comprehensive execution tracing
 * - Timeout handling
 * - Zod validation of inputs/outputs
 */

import { z } from 'zod';
import { Logger } from '../../utils/logger';
import {
	AnyObject,
	Plan,
	PlanStep,
	ToolStep,
	LoopStep,
	ParallelStep,
	ReduceStep,
	ConditionalStep,
	FinalStep,
	Tool,
	GraphNode,
	NodeFn,
	ExecTrace,
	ExecTraceEntry,
	ExecutionOptions,
	PlanSchema,
} from './types';
import {
	deepClone,
	substituteVars,
	resolvePath,
	setPath,
	validatePlan,
	validateDependencies,
	expandLoop,
	evaluateCondition,
	withTimeout,
	measureTime,
	generateId,
	createDetailedError,
} from './utils';

// ============================================================================
// SimpleGraph - Minimal DAG Implementation
// ============================================================================

/**
 * SimpleGraph manages a DAG of nodes and executes them in topological order
 * with support for parallel execution of independent nodes
 */
class SimpleGraph {
	private nodes: Map<string, GraphNode> = new Map();
	
	addNode(node: GraphNode): void {
		if (this.nodes.has(node.id)) {
			throw new Error(`Duplicate node ID: ${node.id}`);
		}
		this.nodes.set(node.id, node);
	}
	
	/**
	 * Execute all nodes in topological order with parallelization
	 */
	async run(
		context: AnyObject,
		options: ExecutionOptions,
		trace: ExecTrace
	): Promise<void> {
		const nodes = Array.from(this.nodes.values());
		
		while (nodes.some((n) => !n.executed)) {
			// Find nodes that are ready to execute (all dependencies met)
			const ready = nodes.filter(
				(n) => !n.executed && n.deps.every((depId) => this.nodes.get(depId)?.executed)
			);
			
			if (ready.length === 0) {
				// No ready nodes means deadlock (cyclic dependencies)
				const unexecuted = nodes.filter((n) => !n.executed).map((n) => n.id);
				throw new Error(`Deadlock detected. Unexecuted nodes: ${unexecuted.join(', ')}`);
			}
			
			// Execute ready nodes in parallel (respecting concurrency limit)
			await this.executeNodesInParallel(ready, context, options, trace);
		}
	}
	
	/**
	 * Execute multiple nodes in parallel with concurrency control
	 */
	private async executeNodesInParallel(
		nodes: GraphNode[],
		context: AnyObject,
		options: ExecutionOptions,
		trace: ExecTrace
	): Promise<void> {
		const concurrency = options.concurrency || 4;
		const queue = [...nodes];
		const executing: Promise<void>[] = [];
		
		const executeNext = async (): Promise<void> => {
			if (queue.length === 0) return;
			
			const node = queue.shift()!;
			await this.executeNode(node, context, options, trace);
		};
		
		// Start initial batch
		for (let i = 0; i < Math.min(concurrency, nodes.length); i++) {
			executing.push(executeNext());
		}
		
		// Chain remaining nodes
		while (queue.length > 0) {
			await Promise.race(executing);
			executing.push(executeNext());
		}
		
		// Wait for all to complete
		await Promise.all(executing);
	}
	
	/**
	 * Execute a single node with retry logic, timeout, and tracing
	 */
	private async executeNode(
		node: GraphNode,
		context: AnyObject,
		options: ExecutionOptions,
		trace: ExecTrace
	): Promise<void> {
		const entry: ExecTraceEntry = {
			nodeId: node.id,
			stepId: node.metadata?.originalStepId,
			status: 'running',
			startTime: new Date().toISOString(),
			retryCount: 0,
			toolName: node.metadata?.toolName,
		};
		
		trace.entries.push(entry);
		
		// Call lifecycle callback
		options.onNodeStart?.(node.id);
		
		let attempt = 0;
		const maxRetries = options.maxRetries || 2;
		
		while (attempt <= maxRetries) {
			try {
				// Check for abort signal
				if (options.abortController?.signal.aborted) {
					entry.status = 'cancelled';
					entry.endTime = new Date().toISOString();
					node.executed = true;
					return;
				}
				
				// Validate input if schema provided
				if (node.metadata?.inputSchema) {
					const validation = node.metadata.inputSchema.safeParse(context);
					if (!validation.success) {
						throw new Error(
							`Input validation failed for node ${node.id}: ${JSON.stringify(validation.error.format())}`
						);
					}
				}
				
				// Execute with timeout
				const timeoutMs = options.defaultTimeoutMs || 30000;
				const { result, durationMs } = await measureTime(async () =>
					await withTimeout(
						async () => await node.fn(context),
						timeoutMs,
						`Node ${node.id} timed out after ${timeoutMs}ms`
					)
				);
				
				// Record success
				entry.status = 'success';
				entry.endTime = new Date().toISOString();
				entry.durationMs = durationMs;
				entry.output = result;
				entry.retryCount = attempt;
				
				node.executed = true;
				
				// Call lifecycle callback
				options.onNodeComplete?.(node.id, result);
				
				return;
				
			} catch (error) {
				attempt++;
				const errorMessage = error instanceof Error ? error.message : String(error);
				
				Logger.warn(`[GraphExecutor] Node ${node.id} failed (attempt ${attempt}/${maxRetries + 1}):`, errorMessage);
				
				if (attempt <= maxRetries) {
					// Exponential backoff
					const backoffMs = 100 * Math.pow(2, attempt - 1);
					await new Promise((resolve) => setTimeout(resolve, backoffMs));
					continue;
				}
				
				// Max retries exceeded
				entry.status = 'failed';
				entry.endTime = new Date().toISOString();
				entry.error = errorMessage;
				entry.retryCount = attempt - 1;
				
				node.executed = true; // Mark as executed (failed) to prevent deadlock
				
				// Call lifecycle callback
				options.onNodeError?.(node.id, errorMessage);
				
				throw new Error(createDetailedError(`Node execution failed: ${node.id}`, {
					stepId: node.metadata?.originalStepId,
					toolName: node.metadata?.toolName,
					error,
				}));
			}
		}
	}
}

// ============================================================================
// DynamicGraphExecutor - Main Executor Class
// ============================================================================

/**
 * DynamicGraphExecutor converts a Plan into a DAG and executes it with:
 * - Automatic parallelization of independent steps
 * - Loop expansion (both static and dynamic)
 * - Conditional branching
 * - Map-reduce operations
 * - Comprehensive error handling and retry logic
 * - Execution tracing for debugging and monitoring
 */
export class DynamicGraphExecutor {
	private tools: Record<string, Tool>;
	private nodeSchemas: Record<string, z.ZodSchema<any>>;
	
	constructor(
		tools: Record<string, Tool>,
		nodeSchemas: Record<string, z.ZodSchema<any>> = {}
	) {
		this.tools = tools;
		this.nodeSchemas = nodeSchemas;
	}
	
	/**
	 * Execute a plan with DAG-based execution
	 */
	async run(
		plan: Plan,
		inputContext: AnyObject = {},
		options: Partial<ExecutionOptions> = {}
	): Promise<{ context: AnyObject; trace: ExecTrace }> {
		// Validate plan structure
		const validation = validatePlan(plan);
		if (!validation.success) {
			throw new Error(
				`Invalid plan: ${validation.errors?.map((e) => `${e.path}: ${e.message}`).join('; ')}`
			);
		}
		
		// Validate dependencies
		const depValidation = validateDependencies(plan.steps);
		if (!depValidation.success) {
			throw new Error(
				`Invalid dependencies: ${depValidation.errors?.map((e) => `${e.path}: ${e.message}`).join('; ')}`
			);
		}
		
		// Initialize execution trace
		const trace: ExecTrace = {
			planId: options.planId || generateId('plan'),
			executionMode: plan.execution || 'dag',
			startedAt: new Date().toISOString(),
			entries: [],
		};
		
		// Deep clone input context to avoid mutations
		const context: AnyObject = deepClone(inputContext);
		
		// Build execution graph
		const graph = new SimpleGraph();
		const nodes = this.planToNodes(plan, context);
		
		Logger.debug('[DynamicGraphExecutor] Built graph with', nodes.length, 'nodes');
		
		for (const node of nodes) {
			graph.addNode(node);
		}
		
		// Execute graph
		const fullOptions: ExecutionOptions = {
			maxRetries: 2,
			defaultTimeoutMs: 30000,
			concurrency: 4,
			enableTrace: true,
			...options,
		};
		
		try {
			await graph.run(context, fullOptions, trace);
			
			trace.finishedAt = new Date().toISOString();
			trace.totalDurationMs = new Date(trace.finishedAt).getTime() - new Date(trace.startedAt).getTime();
			
			// Calculate statistics
			trace.statistics = {
				totalSteps: trace.entries.length,
				successfulSteps: trace.entries.filter((e) => e.status === 'success').length,
				failedSteps: trace.entries.filter((e) => e.status === 'failed').length,
				skippedSteps: trace.entries.filter((e) => e.status === 'skipped').length,
				cancelledSteps: trace.entries.filter((e) => e.status === 'cancelled').length,
			};
			
			if (fullOptions.enableTrace) {
				trace.contextSnapshot = deepClone(context);
			}
			
			Logger.debug('[DynamicGraphExecutor] Execution completed successfully');
			
			return { context, trace };
			
		} catch (error) {
			trace.finishedAt = new Date().toISOString();
			Logger.error('[DynamicGraphExecutor] Execution failed:', error);
			throw error;
		}
	}
	
	/**
	 * Convert a Plan into a list of GraphNodes for DAG execution
	 */
	private planToNodes(plan: Plan, context: AnyObject, parentDeps: string[] = []): GraphNode[] {
		const nodes: GraphNode[] = [];
		let nodeCounter = 0;
		
		const processStep = (step: PlanStep, inheritedDeps: string[] = []): string[] => {
			const stepDeps = Array.from(
				new Set([...(inheritedDeps || []), ...(step.depends_on || [])])
			);
			
			// Handle different step types
			if ('tool' in step && step.tool) {
				// ToolStep
				return [this.addToolNode(step as ToolStep, stepDeps, nodes)];
			}
			
			if ('type' in step) {
				switch (step.type) {
					case 'loop':
						return this.addLoopNodes(step as LoopStep, stepDeps, context, nodes);
					
					case 'parallel':
						return this.addParallelNodes(step as ParallelStep, stepDeps, context, nodes);
					
					case 'reduce':
						return this.addReduceNode(step as ReduceStep, stepDeps, context, nodes);
					
					case 'conditional':
						return this.addConditionalNode(step as ConditionalStep, stepDeps, context, nodes);
					
					case 'final':
						return this.addFinalNode(step as FinalStep, stepDeps, nodes);
				}
			}
			
			Logger.warn('[DynamicGraphExecutor] Unknown step type:', step);
			return [];
		};
		
		// Process all top-level steps
		for (const step of plan.steps) {
			processStep(step, []);
		}
		
		return nodes;
	}
	
	/**
	 * Add a tool execution node to the graph
	 */
	private addToolNode(step: ToolStep, deps: string[], nodes: GraphNode[]): string {
		const nodeId = step.id;
		const tool = this.tools[step.tool];
		
		if (!tool) {
			throw new Error(`Unknown tool: ${step.tool}`);
		}
		
		const fn: NodeFn = async (context: AnyObject) => {
			const params = substituteVars(step.input || {}, context) as AnyObject;
			const result = await tool.execute(params, context);
			
			// Save result to context
			if (step.output) {
				setPath(context, step.output, result);
			} else {
				setPath(context, step.id, result);
			}
			
			return result;
		};
		
		const node: GraphNode = {
			id: nodeId,
			fn,
			deps,
			executed: false,
			metadata: {
				originalStepId: step.id,
				toolName: step.tool,
				inputSchema: this.nodeSchemas[step.id],
			},
		};
		
		nodes.push(node);
		return nodeId;
	}
	
	/**
	 * Add loop nodes (expand loop into multiple nodes)
	 */
	private addLoopNodes(
		step: LoopStep,
		deps: string[],
		context: AnyObject,
		nodes: GraphNode[]
	): string[] {
		const array = resolvePath(context, step.over);
		
		if (Array.isArray(array)) {
			// Static expansion: array is known at plan time
			return this.addStaticLoopNodes(step, array, deps, context, nodes);
		} else {
			// Dynamic expansion: array will be resolved at runtime
			return this.addDynamicLoopNode(step, deps, nodes);
		}
	}
	
	private addStaticLoopNodes(
		step: LoopStep,
		array: unknown[],
		deps: string[],
		context: AnyObject,
		nodes: GraphNode[]
	): string[] {
		const childIds: string[] = [];
		
		for (let i = 0; i < array.length; i++) {
			const item = array[i];
			const iterContext = { ...context, [step.as]: item };
			const iterId = `${step.id}_iter_${i}`;
			
			// Clone inner step with iteration-specific ID
			const innerStep = deepClone(step.step) as ToolStep;
			innerStep.id = iterId;
			innerStep.input = substituteVars(innerStep.input || {}, iterContext) as AnyObject;
			
			const childId = this.addToolNode(innerStep, deps, nodes);
			childIds.push(childId);
		}
		
		// Add aggregator node
		const aggId = step.output || `${step.id}_agg`;
		const aggFn: NodeFn = async (context: AnyObject) => {
			const results: unknown[] = [];
			for (let i = 0; i < array.length; i++) {
				const iterId = `${step.id}_iter_${i}`;
				const result = resolvePath(context, iterId);
				results.push(result);
			}
			setPath(context, aggId, results);
			return results;
		};
		
		nodes.push({
			id: aggId,
			fn: aggFn,
			deps: childIds.length ? childIds : deps,
			executed: false,
			metadata: { originalStepId: step.id },
		});
		
		return [aggId];
	}
	
	private addDynamicLoopNode(step: LoopStep, deps: string[], nodes: GraphNode[]): string[] {
		const dynId = `${step.id}_dynamic`;
		
		const fn: NodeFn = async (context: AnyObject) => {
			const array = resolvePath(context, step.over) as unknown[];
			if (!Array.isArray(array)) {
				throw new Error(`Loop source ${step.over} is not an array`);
			}
			
			const results: unknown[] = [];
			const tool = this.tools[(step.step as ToolStep).tool];
			
			if (!tool) {
				throw new Error(`Unknown tool: ${(step.step as ToolStep).tool}`);
			}
			
			// Execute loop items with concurrency control
			const concurrency = step.concurrency || 1;
			const queue = [...array];
			const executing: Promise<void>[] = [];
			
			const executeNext = async (): Promise<void> => {
				if (queue.length === 0) return;
				
				const item = queue.shift()!;
				const iterContext = { ...context, [step.as]: item };
				const params = substituteVars((step.step as ToolStep).input || {}, iterContext) as AnyObject;
				const result = await tool.execute(params, iterContext);
				results.push(result);
			};
			
			// Start initial batch
			for (let i = 0; i < Math.min(concurrency, array.length); i++) {
				executing.push(executeNext());
			}
			
			// Chain remaining items
			while (queue.length > 0) {
				await Promise.race(executing);
				executing.push(executeNext());
			}
			
			await Promise.all(executing);
			
			const outputKey = step.output || step.id;
			setPath(context, outputKey, results);
			return results;
		};
		
		nodes.push({
			id: dynId,
			fn,
			deps,
			executed: false,
			metadata: { originalStepId: step.id },
		});
		
		return [dynId];
	}
	
	/**
	 * Add parallel nodes
	 */
	private addParallelNodes(step: ParallelStep, deps: string[], context: AnyObject, nodes: GraphNode[]): string[] {
		const childIds: string[] = [];
		
		for (const childStep of step.steps) {
			const ids = this.planToNodes({ steps: [childStep] } as Plan, context, deps);
			childIds.push(...ids.map((n) => n.id));
			nodes.push(...ids);
		}
		
		if (step.output) {
			// Add aggregator node
			const aggId = step.output;
			const aggFn: NodeFn = async (context: AnyObject) => {
				const results: AnyObject = {};
				for (const childId of childIds) {
					results[childId] = resolvePath(context, childId);
				}
				setPath(context, aggId, results);
				return results;
			};
			
			nodes.push({
				id: aggId,
				fn: aggFn,
				deps: childIds.length ? childIds : deps,
				executed: false,
				metadata: { originalStepId: step.id },
			});
			
			return [aggId];
		}
		
		return childIds;
	}
	
	/**
	 * Add reduce node
	 */
	private addReduceNode(
		step: ReduceStep,
		deps: string[],
		context: AnyObject,
		nodes: GraphNode[]
	): string[] {
		const nodeId = step.id;
		
		const fn: NodeFn = async (context: AnyObject) => {
			const array = resolvePath(context, step.input) as unknown[];
			if (!Array.isArray(array)) {
				throw new Error(`Reduce input ${step.input} is not an array`);
			}
			
			const results: unknown[] = [];
			
			for (const item of array) {
				const iterContext = { ...context, [step.as]: item };
				
				if (typeof step.reducer === 'string') {
					// Simple tool reducer
					const tool = this.tools[step.reducer];
					if (!tool) {
						throw new Error(`Unknown reducer tool: ${step.reducer}`);
					}
					const result = await tool.execute({ item }, iterContext);
					results.push(result);
				} else {
					// ToolStep reducer
					const reducerStep = step.reducer as ToolStep;
					const tool = this.tools[reducerStep.tool];
					if (!tool) {
						throw new Error(`Unknown reducer tool: ${reducerStep.tool}`);
					}
					const params = substituteVars(reducerStep.input || {}, iterContext) as AnyObject;
					const result = await tool.execute(params, iterContext);
					results.push(result);
				}
			}
			
			setPath(context, step.output, results);
			return results;
		};
		
		nodes.push({
			id: nodeId,
			fn,
			deps,
			executed: false,
			metadata: { originalStepId: step.id },
		});
		
		return [nodeId];
	}
	
	/**
	 * Add conditional node
	 */
	private addConditionalNode(
		step: ConditionalStep,
		deps: string[],
		context: AnyObject,
		nodes: GraphNode[]
	): string[] {
		const nodeId = step.id;
		
		const fn: NodeFn = async (context: AnyObject) => {
			const condition = evaluateCondition(step.condition, context);
			const branch = condition ? step.then : (step.otherwise || []);
			
			// Execute branch steps sequentially
			for (const branchStep of branch) {
				const branchNodes = this.planToNodes({ steps: [branchStep] } as Plan, context);
				for (const node of branchNodes) {
					await node.fn(context);
					node.executed = true;
				}
			}
		};
		
		nodes.push({
			id: nodeId,
			fn,
			deps,
			executed: false,
			metadata: { originalStepId: step.id },
		});
		
		return [nodeId];
	}
	
	/**
	 * Add final node
	 */
	private addFinalNode(step: FinalStep, deps: string[], nodes: GraphNode[]): string[] {
		const nodeId = step.id;
		
		const fn: NodeFn = async (context: AnyObject) => {
			if (!step.function) return;
			
			const tool = this.tools[step.function];
			if (!tool) {
				throw new Error(`Unknown final function: ${step.function}`);
			}
			
			const params = substituteVars(step.input || {}, context) as AnyObject;
			const result = await tool.execute(params, context);
			
			const outputKey = step.output || step.id;
			setPath(context, outputKey, result);
			return result;
		};
		
		nodes.push({
			id: nodeId,
			fn,
			deps,
			executed: false,
			metadata: { originalStepId: step.id },
		});
		
		return [nodeId];
	}
}
