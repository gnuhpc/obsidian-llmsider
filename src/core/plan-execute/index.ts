/**
 * Mastra-Enhanced Plan-Execute Framework
 * 
 * A comprehensive plan-execute framework that leverages Mastra's capabilities for:
 * - Structured plan generation using LLMs
 * - DAG-based parallel execution
 * - Loop expansion and reduce operations
 * - Conditional branching
 * - Comprehensive error handling and retry logic
 * - Execution tracing and monitoring
 * - Zod-based validation at every step
 * 
 * @example
 * ```typescript
 * import { createPlanExecutor, Planner } from './core/plan-execute';
 * 
 * // Create executor with tools
 * const executor = createPlanExecutor(tools);
 * 
 * // Create planner with Mastra agent
 * const planner = createMastraPlanner(mastraAgent, tools);
 * 
 * // Generate plan
 * const plan = await planner.generatePlanFromTask('Fetch weather for multiple cities');
 * 
 * // Execute plan
 * const { context, trace } = await executor.execute(plan, { cities: ['NYC', 'LA'] });
 * ```
 */

// ============================================================================
// Core Exports
// ============================================================================

export * from './types';
export * from './utils';
export * from './graph-executor';
export * from './planner';

// ============================================================================
// Convenience Imports
// ============================================================================

import { DynamicGraphExecutor } from './graph-executor';
import { Planner, createMastraPlanner, MastraLLMAdapter } from './planner';
import {
	Tool,
	Plan,
	PlanStep,
	ExecTrace,
	ExecutionOptions,
	AnyObject,
} from './types';
import { Logger } from '../../utils/logger';

// ============================================================================
// Unified Plan Executor
// ============================================================================

/**
 * PlanExecutor provides a unified interface for executing plans
 * Combines planning and execution capabilities
 */
export class PlanExecutor {
	private executor: DynamicGraphExecutor;
	private planner: Planner | null = null;
	
	constructor(
		tools: Record<string, Tool>,
		planner?: Planner
	) {
		this.executor = new DynamicGraphExecutor(tools);
		this.planner = planner || null;
	}
	
	/**
	 * Set the planner for automatic plan generation
	 */
	setPlanner(planner: Planner): void {
		this.planner = planner;
	}
	
	/**
	 * Execute a plan directly
	 */
	async execute(
		plan: Plan,
		inputContext: AnyObject = {},
		options: Partial<ExecutionOptions> = {}
	): Promise<{ context: AnyObject; trace: ExecTrace }> {
		Logger.debug('[PlanExecutor] Executing plan:', plan.plan || 'unnamed plan');
		return this.executor.run(plan, inputContext, options);
	}
	
	/**
	 * Generate and execute a plan from a natural language task
	 */
	async executeTask(
		task: string,
		inputContext: AnyObject = {},
		options: Partial<ExecutionOptions> & {
			planOptions?: {
				executionMode?: 'sequential' | 'dag';
				hint?: string;
				maxSteps?: number;
			};
		} = {}
	): Promise<{ plan: Plan; context: AnyObject; trace: ExecTrace }> {
		if (!this.planner) {
			throw new Error('No planner configured. Set a planner using setPlanner() or execute a plan directly.');
		}
		
		Logger.debug('[PlanExecutor] Generating plan for task:', task);
		
		// Generate plan
		const plan = await this.planner.generatePlanFromTask(task, options.planOptions);
		
		Logger.debug('[PlanExecutor] Plan generated, executing...');
		
		// Execute plan
		const { context, trace } = await this.executor.run(plan, inputContext, options);
		
		return { plan, context, trace };
	}
	
	/**
	 * Update tools (useful when tool set changes dynamically)
	 */
	updateTools(tools: Record<string, Tool>): void {
		this.executor = new DynamicGraphExecutor(tools);
		if (this.planner) {
			this.planner.updateTools(tools);
		}
	}
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a complete PlanExecutor with Mastra integration
 */
export function createPlanExecutor(
	tools: Record<string, Tool>,
	options?: {
		mastraAgent?: any;
		plannerConfig?: {
			schemaHint?: string;
			debug?: boolean;
			maxRetries?: number;
			temperature?: number;
			additionalContext?: string;
		};
	}
): PlanExecutor {
	let planner: Planner | undefined;
	
	if (options?.mastraAgent) {
		planner = createMastraPlanner(
			options.mastraAgent,
			tools,
			options.plannerConfig
		);
	}
	
	return new PlanExecutor(tools, planner);
}

/**
 * Create a standalone DynamicGraphExecutor (no planning, just execution)
 */
export function createGraphExecutor(
	tools: Record<string, Tool>
): DynamicGraphExecutor {
	return new DynamicGraphExecutor(tools);
}

/**
 * Create a standalone Planner (no execution, just planning)
 */
export { createMastraPlanner };

// ============================================================================
// Tool Registry Helper
// ============================================================================

/**
 * ToolRegistry manages a collection of tools with validation
 */
export class ToolRegistry {
	private tools: Map<string, Tool> = new Map();
	
	/**
	 * Register a tool
	 */
	register(tool: Tool): void {
		if (this.tools.has(tool.id)) {
			Logger.warn(`[ToolRegistry] Overwriting existing tool: ${tool.id}`);
		}
		this.tools.set(tool.id, tool);
		Logger.debug(`[ToolRegistry] Registered tool: ${tool.id}`);
	}
	
	/**
	 * Register multiple tools at once
	 */
	registerAll(tools: Tool[]): void {
		for (const tool of tools) {
			this.register(tool);
		}
	}
	
	/**
	 * Unregister a tool
	 */
	unregister(toolId: string): boolean {
		const deleted = this.tools.delete(toolId);
		if (deleted) {
			Logger.debug(`[ToolRegistry] Unregistered tool: ${toolId}`);
		}
		return deleted;
	}
	
	/**
	 * Get a tool by ID
	 */
	get(toolId: string): Tool | undefined {
		return this.tools.get(toolId);
	}
	
	/**
	 * Check if a tool exists
	 */
	has(toolId: string): boolean {
		return this.tools.has(toolId);
	}
	
	/**
	 * Get all tools as a record
	 */
	getAll(): Record<string, Tool> {
		const record: Record<string, Tool> = {};
		for (const [id, tool] of this.tools.entries()) {
			record[id] = tool;
		}
		return record;
	}
	
	/**
	 * Get all tool IDs
	 */
	getIds(): string[] {
		return Array.from(this.tools.keys());
	}
	
	/**
	 * Get count of registered tools
	 */
	count(): number {
		return this.tools.size;
	}
	
	/**
	 * Clear all tools
	 */
	clear(): void {
		this.tools.clear();
		Logger.debug('[ToolRegistry] Cleared all tools');
	}
	
	/**
	 * Create a PlanExecutor with the current tools
	 */
	createExecutor(mastraAgent?: any): PlanExecutor {
		return createPlanExecutor(this.getAll(), {
			mastraAgent,
		});
	}
}

// ============================================================================
// Sample Tools for Testing
// ============================================================================

/**
 * Sample tools for demonstration and testing
 */
export const sampleTools: Record<string, Tool> = {
	fetch_page_content: {
		id: 'fetch_page_content',
		description: 'Fetch page content from a URL',
		inputSchema: {
			url: { type: 'string', description: 'URL to fetch' },
		},
		outputSchema: {
			url: { type: 'string' },
			content: { type: 'string' },
		},
		execute: async ({ url }: { url: string }) => {
			// Mock implementation
			return {
				url,
				content: `<html>Mock content for ${url}</html>`,
			};
		},
	},
	
	summarize_text: {
		id: 'summarize_text',
		description: 'Summarize text using LLM',
		inputSchema: {
			text: { type: 'string', description: 'Text to summarize' },
		},
		outputSchema: {
			summary: { type: 'string' },
		},
		execute: async ({ text }: { text: string }) => {
			// Mock implementation
			return {
				summary: `Summary: ${text.substring(0, 100)}...`,
			};
		},
	},
	
	sentiment_analysis: {
		id: 'sentiment_analysis',
		description: 'Analyze sentiment of text',
		inputSchema: {
			text: { type: 'string', description: 'Text to analyze' },
		},
		outputSchema: {
			score: { type: 'number', description: 'Sentiment score (-1 to 1)' },
			label: { type: 'string', description: 'Sentiment label' },
		},
		execute: async ({ text }: { text: string }) => {
			// Mock implementation
			const score = Math.random() * 2 - 1;
			const label = score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral';
			return { score, label };
		},
	},
};

// ============================================================================
// Sample Plans for Testing
// ============================================================================

/**
 * Sample plans for demonstration and testing
 */
export const samplePlans = {
	sequential: {
		version: '1.0' as const,
		execution: 'sequential' as const,
		plan: 'Sequential: fetch a URL and summarize',
		steps: [
			{
				id: 'fetch_news_1',
				tool: 'fetch_page_content',
				input: { url: '{{input.url}}' },
				output: 'page1',
			},
			{
				id: 'summarize_1',
				tool: 'summarize_text',
				input: { text: '{{page1.content}}' },
				output: 'summary1',
			},
		],
	} as Plan,
	
	parallel: {
		version: '1.0' as const,
		execution: 'dag' as const,
		plan: 'Parallel: fetch multiple URLs and analyze',
		steps: [
			{
				id: 'fetch_1',
				tool: 'fetch_page_content',
				input: { url: '{{input.urls[0]}}' },
				output: 'page1',
			},
			{
				id: 'fetch_2',
				tool: 'fetch_page_content',
				input: { url: '{{input.urls[1]}}' },
				output: 'page2',
			},
			{
				id: 'analyze_1',
				tool: 'sentiment_analysis',
				input: { text: '{{page1.content}}' },
				depends_on: ['fetch_1'],
				output: 'sentiment1',
			},
			{
				id: 'analyze_2',
				tool: 'sentiment_analysis',
				input: { text: '{{page2.content}}' },
				depends_on: ['fetch_2'],
				output: 'sentiment2',
			},
		],
	} as Plan,
	
	loop: {
		version: '1.0' as const,
		execution: 'sequential' as const,
		plan: 'Loop: fetch and analyze multiple URLs',
		steps: [
			{
				id: 'fetch_all',
				type: 'loop' as const,
				over: 'input.urls',
				as: 'url',
				step: {
					id: 'fetch_item',
					tool: 'fetch_page_content',
					input: { url: '{{url}}' },
					output: 'fetched',
				},
				output: 'pages',
			},
			{
				id: 'analyze_all',
				type: 'loop' as const,
				over: 'pages',
				as: 'page',
				step: {
					id: 'analyze_item',
					tool: 'sentiment_analysis',
					input: { text: '{{page.content}}' },
					output: 'sentiment',
				},
				output: 'sentiments',
			},
		],
	} as Plan,
};

// ============================================================================
// Demo Function
// ============================================================================

/**
 * Demo function showing how to use the framework
 */
export async function demo(): Promise<void> {
	Logger.debug('=== Plan-Execute Framework Demo ===\n');
	
	// Create executor with sample tools
	const executor = createPlanExecutor(sampleTools);
	
	// Execute sequential plan
	Logger.debug('1. Sequential Plan:');
	const result1 = await executor.execute(
		samplePlans.sequential,
		{ input: { url: 'https://example.com' } }
	);
	Logger.debug('Result:', result1.context);
	Logger.debug('Trace:', result1.trace.statistics);
	Logger.debug('');
	
	// Execute parallel plan
	Logger.debug('2. Parallel Plan (DAG):');
	const result2 = await executor.execute(
		samplePlans.parallel,
		{ input: { urls: ['https://a.com', 'https://b.com'] } }
	);
	Logger.debug('Result:', result2.context);
	Logger.debug('Trace:', result2.trace.statistics);
	Logger.debug('');
	
	// Execute loop plan
	Logger.debug('3. Loop Plan:');
	const result3 = await executor.execute(
		samplePlans.loop,
		{ input: { urls: ['https://1.com', 'https://2.com', 'https://3.com'] } }
	);
	Logger.debug('Result:', result3.context);
	Logger.debug('Trace:', result3.trace.statistics);
	Logger.debug('');
	
	Logger.debug('=== Demo Complete ===');
}
