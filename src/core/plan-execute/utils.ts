/**
 * Mastra-Enhanced Plan-Execute Framework - Utility Functions
 * 
 * This module provides utility functions for context manipulation,
 * variable substitution, and plan validation.
 */

import { AnyObject, Plan, PlanSchema, PlanStep, ValidationResult } from './types';
import { Logger } from '../../utils/logger';

// ============================================================================
// Context Path Resolution
// ============================================================================

/**
 * Resolve a path in an object (supports dot notation and array indices)
 * Examples:
 *   resolvePath({a: {b: [1, 2, 3]}}, 'a.b[0]') => 1
 *   resolvePath({user: {name: 'John'}}, 'user.name') => 'John'
 */
export function resolvePath(obj: AnyObject, path: string): unknown {
	if (!path) return undefined;
	
	// Convert array notation to dot notation: a[0].b -> a.0.b
	const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
	const tokens = normalizedPath.split('.').filter(Boolean);
	
	let current: unknown = obj;
	for (const token of tokens) {
		if (current == null) return undefined;
		if (typeof current !== 'object') return undefined;
		current = (current as AnyObject)[token];
	}
	
	return current;
}

/**
 * Set a value at a path in an object (creates intermediate objects as needed)
 * Examples:
 *   setPath({}, 'a.b.c', 42) => {a: {b: {c: 42}}}
 */
export function setPath(obj: AnyObject, path: string, value: unknown): void {
	if (!path) return;
	
	const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
	const tokens = normalizedPath.split('.').filter(Boolean);
	
	let current: AnyObject = obj;
	for (let i = 0; i < tokens.length - 1; i++) {
		const token = tokens[i];
		if (!(token in current) || typeof current[token] !== 'object' || current[token] === null) {
			current[token] = {};
		}
		current = current[token] as AnyObject;
	}
	
	const lastToken = tokens[tokens.length - 1];
	current[lastToken] = value;
}

// ============================================================================
// Deep Cloning
// ============================================================================

/**
 * Deep clone an object (using JSON serialization for simplicity)
 * Note: Does not preserve functions, undefined, or circular references
 */
export function deepClone<T>(value: T): T {
	if (value === undefined) return undefined as T;
	if (value === null) return null as T;
	
	try {
		return JSON.parse(JSON.stringify(value));
	} catch (error) {
		Logger.warn('[Utils] Failed to deep clone value, returning shallow copy:', error);
		return value;
	}
}

// ============================================================================
// Variable Substitution
// ============================================================================

/**
 * Substitute variables in a template using context values
 * Supports two syntaxes:
 *   1. {{path}} - for exact replacement (entire value)
 *   2. ${path} - for inline string interpolation
 * 
 * Examples:
 *   substituteVars('{{user.name}}', {user: {name: 'John'}}) => 'John'
 *   substituteVars('Hello ${user.name}!', {user: {name: 'John'}}) => 'Hello John!'
 *   substituteVars({url: '{{baseUrl}}/api'}, {baseUrl: 'https://api.com'}) 
 *     => {url: 'https://api.com/api'}
 */
export function substituteVars(template: unknown, context: AnyObject): unknown {
	if (template == null) return template;
	
	// Handle string templates
	if (typeof template === 'string') {
		// Check for exact replacement: {{path}}
		const exactMatch = template.match(/^{{\s*(.+?)\s*}}$/);
		if (exactMatch) {
			const value = resolvePath(context, exactMatch[1]);
			return value;
		}
		
		// Handle inline replacements: ${path}
		return template.replace(/\$\{([^}]+)\}/g, (_, pathExpr) => {
			const value = resolvePath(context, pathExpr.trim());
			return value == null ? '' : String(value);
		});
	}
	
	// Handle array templates
	if (Array.isArray(template)) {
		return template.map((item) => substituteVars(item, context));
	}
	
	// Handle object templates
	if (typeof template === 'object') {
		const result: AnyObject = {};
		for (const key of Object.keys(template)) {
			result[key] = substituteVars((template as AnyObject)[key], context);
		}
		return result;
	}
	
	// Return primitives as-is
	return template;
}

// ============================================================================
// Plan Validation
// ============================================================================

/**
 * Validate a plan structure using Zod schema
 */
export function validatePlan(plan: unknown): ValidationResult {
	const result = PlanSchema.safeParse(plan);
	
	if (result.success) {
		return { success: true };
	}
	
	// Extract error details from Zod error
	const errors = result.error.errors.map((err) => ({
		path: err.path.join('.'),
		message: err.message,
	}));
	
	return {
		success: false,
		errors,
	};
}

/**
 * Validate step dependencies to ensure no cycles
 */
export function validateDependencies(steps: PlanStep[]): ValidationResult {
	const errors: Array<{ path: string; message: string }> = [];
	const stepIds = new Set(steps.map((s) => s.id));
	
	// Check all dependencies exist
	for (const step of steps) {
		if (!step.depends_on) continue;
		
		for (const depId of step.depends_on) {
			if (!stepIds.has(depId)) {
				errors.push({
					path: `steps.${step.id}.depends_on`,
					message: `Dependency '${depId}' does not exist`,
				});
			}
		}
	}
	
	// Check for cycles using DFS
	const visited = new Set<string>();
	const inStack = new Set<string>();
	
	const hasCycle = (stepId: string): boolean => {
		if (inStack.has(stepId)) return true;
		if (visited.has(stepId)) return false;
		
		visited.add(stepId);
		inStack.add(stepId);
		
		const step = steps.find((s) => s.id === stepId);
		if (step?.depends_on) {
			for (const depId of step.depends_on) {
				if (hasCycle(depId)) return true;
			}
		}
		
		inStack.delete(stepId);
		return false;
	};
	
	for (const step of steps) {
		if (hasCycle(step.id)) {
			errors.push({
				path: `steps.${step.id}`,
				message: `Circular dependency detected involving step '${step.id}'`,
			});
		}
	}
	
	return {
		success: errors.length === 0,
		errors: errors.length > 0 ? errors : undefined,
	};
}

// ============================================================================
// Loop Expansion Helpers
// ============================================================================

/**
 * Expand a loop step into multiple individual steps
 * This is used for static loop expansion when the array is known at plan time
 */
export function expandLoop(
	loopStep: PlanStep,
	array: unknown[],
	context: AnyObject
): PlanStep[] {
	if (!('type' in loopStep) || loopStep.type !== 'loop') {
		return [loopStep];
	}
	
	const expanded: PlanStep[] = [];
	
	for (let i = 0; i < array.length; i++) {
		const item = array[i];
		const itemContext = { ...context, [loopStep.as]: item };
		
		// Create a unique ID for this iteration
		const iterationId = `${loopStep.id}_iter_${i}`;
		
		// Clone and customize the inner step
		const innerStep = deepClone(loopStep.step);
		if (typeof innerStep === 'object' && innerStep !== null) {
			(innerStep as any).id = iterationId;
			(innerStep as any).input = substituteVars((innerStep as any).input, itemContext);
		}
		
		expanded.push(innerStep);
	}
	
	return expanded;
}

// ============================================================================
// Condition Evaluation
// ============================================================================

/**
 * Evaluate a condition expression in the context of current state
 * SECURITY: Uses Function constructor instead of eval for better control
 * 
 * Supported operators: ==, !=, <, >, <=, >=, &&, ||, !, in
 * Examples:
 *   evaluateCondition('${count} > 10', {count: 15}) => true
 *   evaluateCondition('${status} == "active"', {status: 'active'}) => true
 */
export function evaluateCondition(condition: string, context: AnyObject): boolean {
	try {
		// First substitute variables
		const substituted = substituteVars(condition, context) as string;
		
		// Create a safe evaluation function
		// This is safer than eval() but still requires trusted input
		const func = new Function('context', `
			with (context) {
				return Boolean(${substituted});
			}
		`);
		
		return func(context);
	} catch (error) {
		Logger.warn('[Utils] Failed to evaluate condition:', condition, error);
		return false;
	}
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Format an error for user display
 */
export function formatError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return String(error);
}

/**
 * Create a detailed error message with context
 */
export function createDetailedError(
	message: string,
	context: {
		stepId?: string;
		toolName?: string;
		error?: unknown;
	}
): string {
	const parts = [message];
	
	if (context.stepId) {
		parts.push(`Step: ${context.stepId}`);
	}
	if (context.toolName) {
		parts.push(`Tool: ${context.toolName}`);
	}
	if (context.error) {
		parts.push(`Error: ${formatError(context.error)}`);
	}
	
	return parts.join('\n');
}

// ============================================================================
// Timing Utilities
// ============================================================================

/**
 * Run a function with a timeout
 */
export async function withTimeout<T>(
	fn: () => Promise<T>,
	timeoutMs: number,
	timeoutError = 'Operation timed out'
): Promise<T> {
	return Promise.race([
		fn(),
		new Promise<T>((_, reject) => 
			setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
		),
	]);
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
	fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
	const start = Date.now();
	const result = await fn();
	const durationMs = Date.now() - start;
	return { result, durationMs };
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique ID for plans, traces, etc.
 */
export function generateId(prefix = ''): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 9);
	return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}
