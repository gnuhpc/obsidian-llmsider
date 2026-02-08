/**
 * Mastra-Enhanced Plan-Execute Framework - Planner
 * 
 * This module implements the Planner that generates execution plans using Mastra agents.
 * It integrates with Mastra's LLM capabilities to create structured plans from natural
 * language tasks.
 */

import { Logger } from '../../utils/logger';
import { Plan, PlanSchema, Tool, AnyObject } from './types';
import { validatePlan } from './utils';

// ============================================================================
// LLM Client Interface (compatible with Mastra)
// ============================================================================

/**
 * Generic LLM client interface - can be implemented by various LLM providers
 * Compatible with Mastra's agent.generate() pattern
 */
export interface LLMClient {
	/**
	 * Generate a completion from the LLM
	 * @param prompt - The prompt to send to the LLM
	 * @param options - Optional generation parameters
	 * @returns The generated text (should be valid JSON for plan generation)
	 */
	generate(prompt: string, options?: {
		temperature?: number;
		maxTokens?: number;
		stopSequences?: string[];
		responseFormat?: 'json' | 'text';
	}): Promise<string>;
}

// ============================================================================
// Planner Configuration
// ============================================================================

export interface PlannerConfig {
	/** LLM client for plan generation */
	llm: LLMClient;
	
	/** Available tools (used to build tool descriptions for the LLM) */
	tools: Record<string, Tool>;
	
	/** Custom schema hint for plan generation */
	schemaHint?: string;
	
	/** Enable debug logging */
	debug?: boolean;
	
	/** Maximum retries for plan generation */
	maxRetries?: number;
	
	/** Plan generation temperature (0-2) */
	temperature?: number;
	
	/** Additional context for plan generation */
	additionalContext?: string;
}

// ============================================================================
// Planner Class
// ============================================================================

/**
 * Planner generates execution plans from natural language tasks using LLMs
 * 
 * Key features:
 * - Converts natural language to structured Plan JSON
 * - Validates generated plans using Zod schemas
 * - Retries on invalid plans
 * - Supports both sequential and DAG execution modes
 * - Integrates with Mastra agents seamlessly
 */
export class Planner {
	private llm: LLMClient;
	private tools: Record<string, Tool>;
	private schemaHint: string;
	private debug: boolean;
	private maxRetries: number;
	private temperature: number;
	private additionalContext: string;
	
	constructor(config: PlannerConfig) {
		this.llm = config.llm;
		this.tools = config.tools;
		this.debug = config.debug ?? false;
		this.maxRetries = config.maxRetries ?? 3;
		this.temperature = config.temperature ?? 0.3;
		this.additionalContext = config.additionalContext ?? '';
		
		// Build schema hint from available tools
		this.schemaHint = config.schemaHint || this.buildSchemaHint();
	}
	
	/**
	 * Generate a plan from a natural language task
	 */
	async generatePlanFromTask(
		task: string,
		options?: {
			executionMode?: 'sequential' | 'dag' | 'graph';
			hint?: string;
			maxSteps?: number;
		}
	): Promise<Plan> {
		const executionMode = options?.executionMode || 'sequential';
		const maxSteps = options?.maxSteps || 10;
		const customHint = options?.hint || '';
		
		let attempt = 0;
		let lastError: Error | null = null;
		
		while (attempt < this.maxRetries) {
			attempt++;
			
			try {
				if (this.debug) {
					Logger.debug(`[Planner] Attempt ${attempt}/${this.maxRetries} to generate plan`);
				}
				
				// Build the prompt
				const prompt = this.buildPlanPrompt(task, executionMode, maxSteps, customHint);
				
				// Generate plan JSON from LLM
				const rawResponse = await this.llm.generate(prompt, {
					temperature: this.temperature,
					responseFormat: 'json',
				});
				
				// Parse JSON response
				const planJson = this.parseJsonResponse(rawResponse);
				
				// Validate plan structure
				const validation = validatePlan(planJson);
				if (!validation.success) {
					throw new Error(
						`Plan validation failed: ${validation.errors?.map((e) => `${e.path}: ${e.message}`).join('; ')}`
					);
				}
				
				// Cast to Plan type (validated by Zod)
				const plan = PlanSchema.parse(planJson);
				
				if (this.debug) {
					Logger.debug('[Planner] Successfully generated plan:', plan);
				}
				
				return plan;
				
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				Logger.warn(`[Planner] Attempt ${attempt} failed:`, lastError.message);
				
				if (attempt < this.maxRetries) {
					// Wait before retry (exponential backoff)
					const backoffMs = 500 * Math.pow(2, attempt - 1);
					await new Promise((resolve) => setTimeout(resolve, backoffMs));
				}
			}
		}
		
		throw new Error(
			`Failed to generate valid plan after ${this.maxRetries} attempts. Last error: ${lastError?.message}`
		);
	}
	
	/**
	 * Build the prompt for plan generation
	 */
	private buildPlanPrompt(
		task: string,
		executionMode: 'sequential' | 'dag' | 'graph',
		maxSteps: number,
		customHint: string
	): string {
		const toolDescriptions = this.buildToolDescriptions();
		
		const prompt = `You are an expert AI planner. Your task is to create a detailed execution plan for the following task.

# Task
${task}

# Available Tools
${toolDescriptions}

# Plan Requirements
- Generate a JSON plan object that follows the schema below
- Execution mode: ${executionMode}
- Maximum steps: ${maxSteps}
- Each step should have a unique ID
- For ${executionMode === 'dag' ? 'DAG mode, specify dependencies using depends_on field' : 'sequential mode, steps will execute in order'}
- Use variable substitution syntax: {{variable}} for exact replacement, \${variable} for inline interpolation
- Ensure all tool parameters are properly specified

# Plan Schema
${this.schemaHint}

${customHint ? `# Additional Context\n${customHint}\n` : ''}

${this.additionalContext ? `# System Context\n${this.additionalContext}\n` : ''}

# Output Format
Return ONLY valid JSON matching the Plan schema. No markdown, no explanations, just JSON.

Example:
{
  "version": "1.0",
  "execution": "sequential",
  "plan": "A brief description of the plan",
  "steps": [
    {
      "id": "step1",
      "tool": "tool_name",
      "input": {"param": "value"},
      "output": "result_variable"
    }
  ]
}

Generate the plan now:`;
		
		return prompt;
	}
	
	/**
	 * Build tool descriptions for the prompt
	 */
	private buildToolDescriptions(): string {
		const descriptions: string[] = [];
		
		for (const [id, tool] of Object.entries(this.tools)) {
			const desc = [
				`## ${id}`,
				tool.description || 'No description',
			];
			
			if (tool.inputSchema) {
				desc.push('Input parameters:', JSON.stringify(tool.inputSchema, null, 2));
			}
			
			descriptions.push(desc.join('\n'));
		}
		
		return descriptions.join('\n\n');
	}
	
	/**
	 * Build schema hint describing the Plan structure
	 */
	private buildSchemaHint(): string {
		return `
Plan {
  version: "1.0" (required)
  execution: "sequential" | "dag" | "graph" (default: "sequential")
  plan: string (optional human-readable description)
  steps: Step[] (required, min 1)
}

Step Types:

1. ToolStep (most common):
{
  id: string (required, unique)
  type: "tool" (optional, default)
  tool: string (required, tool name)
  input: object (optional, tool parameters)
  output: string (optional, variable name to store result)
  depends_on: string[] (optional, for DAG mode)
  description: string (optional)
}

2. LoopStep (iterate over array):
{
  id: string
  type: "loop"
  over: string (path to array in context)
  as: string (loop variable name)
  step: ToolStep (step to execute for each item)
  output: string (optional, aggregated results)
  concurrency: number (optional, 1-10)
  depends_on: string[] (optional)
}

3. ParallelStep (execute steps in parallel):
{
  id: string
  type: "parallel"
  steps: Step[] (steps to execute in parallel)
  output: string (optional, aggregated results)
  depends_on: string[] (optional)
}

4. ReduceStep (map-reduce pattern):
{
  id: string
  type: "reduce"
  input: string (path to array)
  as: string (item variable name)
  reducer: string | ToolStep (tool to apply to each item)
  output: string (required, result variable)
  depends_on: string[] (optional)
}

5. ConditionalStep (if-then-else):
{
  id: string
  type: "conditional"
  condition: string (expression to evaluate)
  then: Step[] (steps if true)
  otherwise: Step[] (optional, steps if false)
  depends_on: string[] (optional)
}

6. FinalStep (final output, often LLM call):
{
  id: string
  type: "final"
  function: string (optional, tool/function name)
  input: object (optional)
  output: string (optional)
  depends_on: string[] (optional)
}
`;
	}
	
	/**
	 * Parse JSON response from LLM (handles markdown code blocks)
	 */
	private parseJsonResponse(raw: string): unknown {
		let cleaned = raw.trim();
		
		// Remove markdown code blocks if present
		const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
		if (codeBlockMatch) {
			cleaned = codeBlockMatch[1].trim();
		}
		
		// Remove any leading/trailing text
		const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			cleaned = jsonMatch[0];
		}
		
		try {
			return JSON.parse(cleaned);
		} catch (error) {
			throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}\nRaw: ${raw}`);
		}
	}
	
	/**
	 * Update available tools (useful when tool set changes)
	 */
	updateTools(tools: Record<string, Tool>): void {
		this.tools = tools;
		this.schemaHint = this.buildSchemaHint();
	}
	
	/**
	 * Set additional context for plan generation
	 */
	setAdditionalContext(context: string): void {
		this.additionalContext = context;
	}
}

// ============================================================================
// Mastra LLM Client Adapter
// ============================================================================

/**
 * Adapter for Mastra's Agent to implement LLMClient interface
 * This allows using Mastra agents as the LLM backend for planning
 */
export class MastraLLMAdapter implements LLMClient {
	constructor(private agent: any) {}  // Mastra Agent instance
	
	async generate(prompt: string, options?: {
		temperature?: number;
		maxTokens?: number;
		responseFormat?: 'json' | 'text';
	}): Promise<string> {
		// Call Mastra agent's generate method
		const response = await this.agent.generate(prompt, {
			temperature: options?.temperature,
			maxTokens: options?.maxTokens,
			// Mastra agents typically return structured responses
		});
		
		// Extract text from response
		if (typeof response === 'string') {
			return response;
		}
		
		// Handle Mastra's response format
		if (response && typeof response === 'object') {
			if ('text' in response) {
				return response.text;
			}
			if ('content' in response) {
				return response.content;
			}
			// If response is already JSON, stringify it
			return JSON.stringify(response);
		}
		
		throw new Error('Invalid response from Mastra agent');
	}
}

// ============================================================================
// Export Helper Functions
// ============================================================================

/**
 * Create a Planner instance with Mastra agent
 */
export function createMastraPlanner(
	mastraAgent: any,
	tools: Record<string, Tool>,
	config?: Partial<PlannerConfig>
): Planner {
	const llmClient = new MastraLLMAdapter(mastraAgent);
	
	return new Planner({
		llm: llmClient,
		tools,
		...config,
	});
}
