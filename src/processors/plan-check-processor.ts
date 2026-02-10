import { ChatMessage } from '../types';
import { Logger } from '../utils/logger';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';

interface PlanStep {
	step_id: string;
	tool: string;
	input: any;
	reason?: string;
	path?: string;
	[key: string]: any;
}

interface ToolSchema {
	properties?: Record<string, any>;
	required?: string[];
	description?: string;
	type?: string;
	[key: string]: any;
}

interface ToolSchemaInfo {
	schema: ToolSchema;
	source: string;
	server: string;
}

/**
 * Plan Check Processor - validates tool parameters before execution
 * Ensures that tool calls in the plan have correct parameters according to tool schemas
 */
export class PlanCheckProcessor {
	private plugin: LLMSiderPlugin;
	private messageContainer: HTMLElement;
	private i18n: I18nManager;

	// State management
	private currentCheckIndicator: HTMLElement | null = null;
	private conversationMessages: ChatMessage[] = [];
	
	// Track timeout IDs for cleanup
	private hideIndicatorTimeouts: number[] = [];

	constructor(plugin: LLMSiderPlugin, messageContainer: HTMLElement) {
		this.plugin = plugin;
		this.messageContainer = messageContainer;
		this.i18n = plugin.getI18nManager()!;
	}
	
	/**
	 * Cleanup all pending timeouts to prevent memory leaks
	 */
	public cleanup(): void {
		Logger.debug('[PlanCheckProcessor] Cleaning up pending timeouts...');
		for (const timeoutId of this.hideIndicatorTimeouts) {
			window.clearTimeout(timeoutId);
		}
		this.hideIndicatorTimeouts = [];
		
		if (this.currentCheckIndicator) {
			this.currentCheckIndicator.remove();
			this.currentCheckIndicator = null;
		}

		// Clear references
		this.conversationMessages = [];
	}

	/**
	 * Validate plan steps and their tool parameters using LLM
	 */
	async validatePlanSteps(planSteps: PlanStep[], conversationMessages: ChatMessage[]): Promise<{
		isValid: boolean;
		validatedSteps?: PlanStep[];
		issues?: Array<{
			stepId: string;
			toolName: string;
			issue: string;
			suggestion: string;
		}>;
		correctedPlan?: PlanStep[];
	}> {
		Logger.debug('Starting plan validation for', planSteps.length, 'steps');

		this.conversationMessages = conversationMessages;

		// Show validation indicator
		this.showValidationIndicator('正在验证计划参数...');

		try {
			// Get tool schemas for validation
			const toolSchemas = await this.getToolSchemas();

			// Analyze each step for parameter correctness
			const validationResults = await this.analyzeStepParameters(planSteps, toolSchemas);

			this.updateValidationIndicator('analyzing', '正在分析参数问题...');

			// If there are issues, use LLM to fix them
			if (validationResults.issues.length > 0) {
				Logger.debug('Found', validationResults.issues.length, 'parameter issues');

				this.updateValidationIndicator('correcting', `发现 ${validationResults.issues.length} 个参数问题，正在修正...`);

				const correctionResult = await this.correctPlanWithLLM(planSteps, validationResults.issues, toolSchemas);

				if (correctionResult.success) {
					this.updateValidationIndicator('completed', `已修正 ${validationResults.issues.length} 个参数问题，验证通过`);

					// Hide indicator immediately after correction success to avoid showing it after step completion
					// Reduced delay to prevent interference with step execution
					const timeoutId = window.setTimeout(() => {
						this.hideValidationIndicator();
						// Remove from tracking array
						const index = this.hideIndicatorTimeouts.indexOf(timeoutId);
						if (index > -1) {
							this.hideIndicatorTimeouts.splice(index, 1);
						}
					}, 800);
					this.hideIndicatorTimeouts.push(timeoutId);

					return {
						isValid: true,
						validatedSteps: correctionResult.correctedSteps,
						issues: validationResults.issues,
						correctedPlan: correctionResult.correctedSteps
					};
				} else {
					this.updateValidationIndicator('error', `参数修正失败: ${correctionResult.error}`);

					const timeoutId = window.setTimeout(() => {
						this.hideValidationIndicator();
						// Remove from tracking array
						const index = this.hideIndicatorTimeouts.indexOf(timeoutId);
						if (index > -1) {
							this.hideIndicatorTimeouts.splice(index, 1);
						}
					}, 1000);
					this.hideIndicatorTimeouts.push(timeoutId);

					return {
						isValid: false,
						issues: validationResults.issues
					};
				}
			} else {
				Logger.debug('No parameter issues found');
				this.updateValidationIndicator('completed', this.i18n.t('planExecute.contentGeneration.parameterValidationPassed', { count: planSteps.length.toString() }));

				// Hide indicator after a shorter delay
				setTimeout(() => this.hideValidationIndicator(), 1000);

				return {
					isValid: true,
					validatedSteps: planSteps
				};
			}

		} catch (error) {
			Logger.error('Error validating plan:', error);
			this.updateValidationIndicator('error', this.i18n.t('common.planValidationFailed') + ': ' + (error instanceof Error ? error.message : this.i18n.t('common.unknownError')));

			return {
				isValid: false,
				issues: [{
					stepId: 'validation_error',
					toolName: 'unknown',
					issue: '验证过程出错',
					suggestion: '请重新生成计划'
				}]
			};
		}
	}

	/**
	 * Get available tool schemas for validation
	 */
	private async getToolSchemas(): Promise<Map<string, ToolSchemaInfo>> {
		const toolManager = this.plugin.getToolManager();
		if (!toolManager) {
			throw new Error('Tool Manager not available');
		}

		const allTools = await toolManager.getAllTools();
		const schemas = new Map<string, ToolSchemaInfo>();

		for (const tool of allTools) {
			if (tool.inputSchema) {
				schemas.set(tool.name, {
					schema: tool.inputSchema,
					source: tool.source,
					server: tool.server
				});
			}
		}

		Logger.debug('Loaded schemas for', schemas.size, 'tools');
		return schemas;
	}

	/**
	 * Analyze step parameters against tool schemas
	 */
	private async analyzeStepParameters(planSteps: PlanStep[], toolSchemas: Map<string, ToolSchemaInfo>): Promise<{
		issues: Array<{
			stepId: string;
			toolName: string;
			issue: string;
			suggestion: string;
		}>;
	}> {
		const issues: Array<{
			stepId: string;
			toolName: string;
			issue: string;
			suggestion: string;
		}> = [];

		for (const step of planSteps) {
			const toolName = step.tool;
			const toolSchema = toolSchemas.get(toolName);

			if (!toolSchema) {
				issues.push({
					stepId: step.step_id,
					toolName: toolName,
					issue: `工具 "${toolName}" 不存在`,
					suggestion: `可用工具: ${Array.from(toolSchemas.keys()).join(', ')}`
				});
				continue;
			}

			// Validate parameters against schema
			const validation = this.validateParameters(step.input, toolSchema.schema);
			if (!validation.valid) {
				issues.push({
					stepId: step.step_id,
					toolName: toolName,
					issue: validation.error || this.i18n.t('planExecute.contentGeneration.parameterValidationFailed'),
					suggestion: validation.suggestion || this.i18n.t('errors.parameterValidationFailed')
				});
			}
		}

		return { issues };
	}

	/**
	 * Validate parameters against tool schema
	 */
	private validateParameters(input: any, schema: ToolSchema): {
		valid: boolean;
		error?: string;
		suggestion?: string;
	} {
		if (!schema || !schema.properties) {
			return { valid: true }; // No schema to validate against
		}

		const requiredParams = schema.required || [];
		const availableParams = Object.keys(schema.properties);

		// Check for unreplaced placeholders first
		const placeholderCheck = this.checkForUnreplacedPlaceholders(input);
		if (!placeholderCheck.valid) {
			return placeholderCheck;
		}

		// Parse input if it's a string
		let params: any;
		if (typeof input === 'string') {
			try {
				params = JSON.parse(input);
			} catch {
				// If not JSON, treat as single parameter
				if (requiredParams.length === 1) {
					params = { [requiredParams[0]]: input };
				} else {
					return {
						valid: false,
						error: '参数格式错误，应为JSON格式',
						suggestion: '使用JSON格式: {"参数名": "参数值"}'
					};
				}
			}
		} else if (typeof input === 'object') {
			params = input;
		} else {
			params = {};
		}

		// Check for missing required parameters
		const missingRequired = requiredParams.filter((param: string) => !(param in params));
		if (missingRequired.length > 0) {
			const paramDescriptions = missingRequired.map((param: string) => {
				const propSchema = schema.properties[param];
				const desc = propSchema?.description ? ` (${propSchema.description})` : '';
				return `${param}${desc}`;
			});

			return {
				valid: false,
				error: `缺少必需参数: ${missingRequired.join(', ')}`,
				suggestion: `请提供: ${paramDescriptions.join(', ')}`
			};
		}

		// Check for unknown parameters
		const unknownParams = Object.keys(params).filter(param => !availableParams.includes(param));
		if (unknownParams.length > 0) {
			return {
				valid: false,
				error: `未知参数: ${unknownParams.join(', ')}`,
				suggestion: `支持的参数: ${availableParams.join(', ')}`
			};
		}

		return { valid: true };
	}

	/**
	 * Use LLM to correct plan parameters
	 */
	private async correctPlanWithLLM(
		originalSteps: PlanStep[],
		issues: Array<{stepId: string; toolName: string; issue: string; suggestion: string}>,
		toolSchemas: Map<string, ToolSchemaInfo>
	): Promise<{
		success: boolean;
		correctedSteps?: PlanStep[];
		error?: string;
	}> {
		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			return { success: false, error: 'No AI provider available' };
		}

		// Build correction prompt
		const correctionPrompt = this.buildCorrectionPrompt(originalSteps, issues, toolSchemas);

		// Prepare messages for correction
		const correctionMessages: ChatMessage[] = [
			...this.conversationMessages,
			{
				id: Date.now().toString(),
				role: 'user' as const,
				content: correctionPrompt,
				timestamp: Date.now(),
				metadata: {}
			}
		];

		try {
			let correctionResponse = '';

			// Stream correction from LLM (no live display, just collect response)
			await provider.sendStreamingMessage(correctionMessages, (chunk) => {
				if (chunk.delta) {
					correctionResponse += chunk.delta;
					// Update indicator with simple progress message instead of streaming content
					if (correctionResponse.length % 100 === 0) {
						this.updateValidationIndicator('correcting', `正在修正参数... (处理中)`);
					}
				}
			});

			// Parse parameter corrections
			const corrections = this.parseParameterCorrections(correctionResponse);

			if (corrections && corrections.length > 0) {
				// Apply corrections to original steps
				const correctedSteps = this.applyParameterCorrections(originalSteps, corrections);
				Logger.debug('Successfully corrected', corrections.length, 'parameter issues');
				return {
					success: true,
					correctedSteps: correctedSteps
				};
			} else {
				return {
					success: false,
					error: '无法解析参数修正结果'
				};
			}

		} catch (error) {
			Logger.error('Error in LLM correction:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : '修正过程出错'
			};
		}
	}

	/**
	 * Build prompt for LLM to correct plan parameters
	 */
	private buildCorrectionPrompt(
		originalSteps: PlanStep[],
		issues: Array<{stepId: string; toolName: string; issue: string; suggestion: string}>,
		toolSchemas: Map<string, ToolSchemaInfo>
	): string {
		// Build only the problematic tools' schemas for focused correction
		const problematicTools = new Set(issues.map(issue => issue.toolName));
		const relevantToolSchemas = Array.from(toolSchemas.entries())
			.filter(([toolName]) => problematicTools.has(toolName))
			.map(([toolName, toolInfo]) => {
				const schema = toolInfo.schema;
				const required = schema.required || [];
				const properties = schema.properties || {};

				const paramDescriptions = Object.entries(properties).map(([name, prop]: [string, any]) => {
					const isRequired = required.includes(name) ? ' (必需)' : ' (可选)';
					const type = prop.type ? ` [${prop.type}]` : '';
					const desc = prop.description ? ` - ${prop.description}` : '';
					return `    ${name}${isRequired}${type}${desc}`;
				});

				return `${toolName}:
${paramDescriptions.join('\n')}${toolName === 'sed' ? '\n    注意：sed脚本语法为JavaScript风格，使用 () 分组和 $1 引用，例如 s/<h1>(.*)<\\/h1>/[h1]$1[\\/h1]/g' : ''}`;
			});

		// Build focused issue descriptions
		const issueDescriptions = issues.map(issue => {
			const stepLabel = this.i18n.t('planExecute.tracker.stepLabel', { index: issue.stepId });
			return `${stepLabel}: ${issue.issue}`;
		});

		return `# ${this.i18n.t('planExecute.contentGeneration.parameterCorrectionTask')}

## ${this.i18n.t('planExecute.contentGeneration.parameterIssuesToFix')}
${issueDescriptions.join('\n')}

## ${this.i18n.t('planExecute.contentGeneration.relevantToolRequirements')}
${relevantToolSchemas.join('\n\n')}

## ${this.i18n.t('planExecute.contentGeneration.parameterCorrectionRequirements')}
${this.i18n.t('planExecute.contentGeneration.parameterCorrectionInstructions')}

${this.i18n.t('planExecute.contentGeneration.parameterCorrectionFormat')}

\`\`\`json
{
  "corrections": [
    {
      "step_id": "step1",
      "corrected_input": {"需要修正的参数名": "修正后的值"}
    }
  ]
}
\`\`\`

注意：只包含需要修正的参数，不要包含已经正确的参数。

修正结果：`;
	}

	/**
	 * Parse parameter corrections from LLM response
	 */
	private parseParameterCorrections(response: string): Array<{step_id: string; corrected_input: any}> | null {
		try {
			// Extract JSON from response
			const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
			let jsonString = '';
			
			if (!jsonMatch) {
				// Try to find JSON without code blocks
				const directJsonMatch = response.match(/\{[\s\S]*"corrections"[\s\S]*\]/);
				if (!directJsonMatch) {
					Logger.error('No corrections JSON found in response');
					return null;
				}
				jsonString = directJsonMatch[0];
			} else {
				jsonString = jsonMatch[1];
			}

			// Try to parse with multiple strategies
			try {
				// First attempt: try parsing as-is with standard JSON.parse
				const correctionData = JSON.parse(jsonString);
				return correctionData.corrections || null;
			} catch (firstError) {
				Logger.debug('First parse attempt failed, trying with manual extraction...');
				Logger.debug('JSON string length:', jsonString.length);
				Logger.debug('JSON string preview:', jsonString.substring(0, 200));
				
				// Second attempt: Manually extract corrections array using bracket matching
				// This is more robust for very long multi-line strings with nested structures
				try {
					const corrections: Array<{step_id: string; corrected_input: any}> = [];
					
					// Find the corrections array - use a more flexible pattern
					const correctionsArrayMatch = jsonString.match(/"corrections"\s*:\s*\[/);
					if (!correctionsArrayMatch) {
						Logger.error('Could not find corrections array start');
						Logger.error('JSON string:', jsonString.substring(0, 500));
						return null;
					}
					
					// Find the start position of the array content
					const arrayStartPos = correctionsArrayMatch.index! + correctionsArrayMatch[0].length;
					
					// Extract content from array start position
					const restOfString = jsonString.substring(arrayStartPos);
					Logger.debug('Array content preview:', restOfString.substring(0, 200));
					
					// Find each correction object by matching balanced braces
					let depth = 0;
					let currentObj = '';
					let inString = false;
					let escapeNext = false;
					
					for (let i = 0; i < restOfString.length; i++) {
						const char = restOfString[i];
						
						// Handle string escaping
						if (escapeNext) {
							currentObj += char;
							escapeNext = false;
							continue;
						}
						
						if (char === '\\') {
							currentObj += char;
							escapeNext = true;
							continue;
						}
						
						// Track if we're inside a string
						if (char === '"') {
							inString = !inString;
							currentObj += char;
							continue;
						}
						
						// Only count braces outside of strings
						if (!inString) {
							if (char === '{') {
								depth++;
								currentObj += char;
							} else if (char === '}') {
								currentObj += char;
								depth--;
								
								// When we close the top-level object, we have a complete correction
								if (depth === 0 && currentObj.trim()) {
									try {
										const correctionObj = JSON.parse(currentObj.trim());
										if (correctionObj.step_id && correctionObj.corrected_input) {
											corrections.push({
												step_id: correctionObj.step_id,
												corrected_input: correctionObj.corrected_input
											});
											Logger.debug(`Successfully extracted correction for ${correctionObj.step_id} using brace matching`);
										}
									} catch (parseError) {
										Logger.error('Failed to parse individual correction object:', parseError);
										Logger.error('Object content preview:', currentObj.substring(0, 200));
									}
									currentObj = '';
								}
							} else if (char === ']') {
								// End of array, stop processing
								break;
							} else {
								currentObj += char;
							}
						} else {
							currentObj += char;
						}
					}
					
					if (corrections.length > 0) {
						Logger.debug(`Successfully extracted ${corrections.length} corrections using brace matching`);
						return corrections;
					}
					
					Logger.warn('Brace matching found no valid corrections');
					return null;
					
				} catch (secondError) {
					Logger.error('Manual extraction attempt failed:', secondError);
					return null;
				}
			}

		} catch (error) {
			Logger.error('Error parsing parameter corrections:', error);
			return null;
		}
	}

	/**
	 * Apply parameter corrections to original steps
	 */
	private applyParameterCorrections(
		originalSteps: PlanStep[],
		corrections: Array<{step_id: string; corrected_input: any}>
	): PlanStep[] {
		// Create a map of corrections for quick lookup
		const correctionMap = new Map();
		corrections.forEach(correction => {
			correctionMap.set(correction.step_id, correction.corrected_input);
		});

		// Apply corrections to original steps
		const correctedSteps = originalSteps.map(step => {
			if (correctionMap.has(step.step_id)) {
				const correctedInput = correctionMap.get(step.step_id);
				Logger.debug(`Applying correction to step ${step.step_id}:`, {
					original: step.input,
					corrected: correctedInput
				});

				// Smart parameter merging: preserve original valid parameters
				const finalInput = { ...step.input }; // Start with original parameters

				// Only apply corrections for parameters that actually need fixing
				Object.keys(correctedInput).forEach(param => {
					const correctedValue = correctedInput[param];
					const originalValue = step.input?.[param];

					// Special handling for path parameter - don't replace valid paths with examples
					if (param === 'path') {
						if (!originalValue || originalValue.trim() === '') {
							// Only use corrected path if original is missing/empty
							finalInput.path = correctedValue;
						} else if (correctedValue.includes('example') || correctedValue.includes('file.txt')) {
							// Don't replace valid paths with obvious example values
							Logger.debug(`Keeping original path "${originalValue}" instead of example "${correctedValue}"`);
							finalInput.path = originalValue;
						} else {
							// Use corrected path if it seems valid
							finalInput.path = correctedValue;
						}
					} else {
						// For other parameters, use the corrected value
						finalInput[param] = correctedValue;
					}
				});

				// Special handling for file operations that still need path parameter
				if (['sed', 'str_replace', 'view', 'create'].includes(step.tool) && !finalInput.path) {
					// Try to infer path from step reason or other context
					const pathFromReason = this.extractPathFromText(step.reason || '');
					if (pathFromReason) {
						Logger.debug(`Inferred missing path parameter from step reason: ${pathFromReason}`);
						finalInput.path = pathFromReason;
					}
				}

				return {
					...step,
					input: finalInput
				};
			}
			return step;
		});

		Logger.debug('Applied corrections to', corrections.length, 'steps');
		return correctedSteps;
	}

	/**
	 * Extract file path from text description
	 */
	private extractPathFromText(text: string): string | null {
		if (!text) return null;

		// Look for various path patterns commonly used in Chinese and English
		const pathPatterns = [
			// Chinese patterns with file extensions
			/文件\s*[""]([^""]+\.md)[""]|文件\s*["']([^"']+\.md)["']/g,
			/文件\s*([^\s，。！？]+\.md)/g,
			// English patterns
			/file\s*["']([^"']+\.md)["']/gi,
			/file\s*([^\s,.!?]+\.md)/gi,
			// Direct markdown file references
			/["']([^"']+\.md)["']/g,
			/([^\s，。！？]+\.md)(?=[\s，。！？]|$)/g,
			// Special case for Chinese filenames
			/([^\s:"'，。！？]+：[^\s:"'，。！？]+\.md)/g,
		];

		for (const pattern of pathPatterns) {
			const matches = [...text.matchAll(pattern)];
			for (const match of matches) {
				// Find the first non-empty capture group
				const path = match[1] || match[2];
				if (path && path.trim()) {
					const cleanPath = path.trim().replace(/^["']|["']$/g, '');
					Logger.debug(`Extracted path from text "${text}": ${cleanPath}`);
					return cleanPath;
				}
			}
		}

		return null;
	}

	/**
	 * Show validation indicator
	 */
	private showValidationIndicator(message: string): void {
		this.currentCheckIndicator = this.messageContainer.createDiv({
			cls: 'llmsider-plan-execute-phase llmsider-plan-check-phase'
		});

		const headerEl = this.currentCheckIndicator.createDiv({ cls: 'plan-execute-header' });
		headerEl.innerHTML = `
			<span class="plan-execute-icon">🔍</span>
			<span class="plan-execute-title">${this.i18n.t('common.planValidation')}</span>
		`;

		const contentEl = this.currentCheckIndicator.createDiv({ cls: 'plan-execute-content' });
		contentEl.innerHTML = `
			<div class="plan-check-status">${message}</div>
		`;

		this.scrollToBottom();
	}

	/**
	 * Update validation indicator
	 */
	private updateValidationIndicator(
		status: 'analyzing' | 'correcting' | 'completed' | 'error',
		message: string
	): void {
		if (!this.currentCheckIndicator) return;

		const iconEl = this.currentCheckIndicator.querySelector('.plan-execute-icon') as HTMLElement;
		const statusEl = this.currentCheckIndicator.querySelector('.plan-check-status') as HTMLElement;

		if (!iconEl || !statusEl) return;

		let icon = '🔍';
		let statusClass = '';

		switch (status) {
			case 'analyzing':
				icon = '📊';
				statusClass = 'status-analyzing';
				break;
			case 'correcting':
				icon = '🔧';
				statusClass = 'status-correcting';
				break;
			case 'completed':
				icon = '✅';
				statusClass = 'status-completed';
				break;
			case 'error':
				icon = '❌';
				statusClass = 'status-error';
				break;
		}

		iconEl.textContent = icon;
		statusEl.textContent = message;

		// Update CSS classes
		this.currentCheckIndicator.className = `llmsider-plan-execute-phase llmsider-plan-check-phase ${statusClass}`;

		this.scrollToBottom();
	}

	/**
	 * Hide validation indicator
	 */
	private hideValidationIndicator(): void {
		if (this.currentCheckIndicator) {
			this.currentCheckIndicator.remove();
			this.currentCheckIndicator = null;
		}
	}

	/**
	 * Scroll to bottom
	 */
	private scrollToBottom(): void {
		this.messageContainer.scrollTo({
			top: this.messageContainer.scrollHeight,
			behavior: 'smooth'
		});
	}

/**
 * Check for unreplaced placeholders in parameters
 */
private checkForUnreplacedPlaceholders(input: unknown): {
valid: boolean;
error?: string;
suggestion?: string;
} {
// Handle undefined/null input
if (input === undefined || input === null) {
return { valid: true };
}

const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

// Check for unreplaced step placeholders like <step1_longitude>, <step2_latitude>
const stepPlaceholderPattern = /<step\d+_\w+>/g;
const stepMatches = inputStr.match(stepPlaceholderPattern);

		if (stepMatches) {
			return {
				valid: false,
				error: this.i18n.t('planExecute.contentGeneration.unreplacedStepPlaceholder', { placeholders: stepMatches.join(', ') }),
				suggestion: this.i18n.t('planExecute.contentGeneration.ensurePreviousStepsCompleted')
			};
		}	// Check for other placeholders but with improved filtering
	// Only match patterns that look like actual placeholders: <word_word> or <word>
	// Exclude: HTML tags, comparisons (< >), SQL types, mathematical expressions
	const placeholderPattern = /<[a-zA-Z_][a-zA-Z0-9_]*>/g;
	const potentialMatches = inputStr.match(placeholderPattern);

	if (potentialMatches) {
		// Filter out common HTML tags and schema type hints
		const validHtmlTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'a', 'img', 'br', 'hr', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'strong', 'em', 'b', 'i', 'u'];
		// Expand schema types to include partial matches and common variations
		const schemaTypes = ['string', 'str', 'strin', 'int', 'integer', 'float', 'double', 'bool', 'boolean', 'array', 'arr', 'map', 'object', 'obj', 'row', 'text', 'varchar', 'char'];

		const invalidPlaceholders = potentialMatches.filter(match => {
			const content = match.slice(1, -1); // Remove < and >

			// Allow HTML tags (with or without /)
			const tagName = content.replace(/^\//, '').toLowerCase();
			if (validHtmlTags.includes(tagName)) {
				return false;
			}

			// Allow closing HTML tags
			if (content.startsWith('/')) {
				return false;
			}

			// Allow schema type hints (case insensitive, partial match)
			const contentLower = content.toLowerCase();
			for (const schemaType of schemaTypes) {
				// Check if content is a schema type or starts with a schema type
				if (contentLower === schemaType || contentLower.startsWith(schemaType)) {
					Logger.debug(`Ignoring schema type placeholder: ${match} (matches ${schemaType})`);
					return false;
				}
			}

			return true; // This is likely a real placeholder
		});

		if (invalidPlaceholders.length > 0) {
			return {
				valid: false,
				error: `参数包含未替换的占位符: ${invalidPlaceholders.join(', ')}`,
				suggestion: '请提供具体的参数值替换占位符'
			};
		}
	}return { valid: true };
}

	/**
	 * Force hide validation indicator (called when all steps complete)
	 */
	forceHideValidationIndicator(): void {
		if (this.currentCheckIndicator) {
			Logger.debug('Force hiding validation indicator');
			this.currentCheckIndicator.remove();
			this.currentCheckIndicator = null;
		}
	}

	/**
	 * Force hide validation indicator immediately with cleanup
	 */
	forceHideValidationIndicatorImmediate(): void {
		// Clear any pending timeout
		if (this.currentCheckIndicator) {
			Logger.debug('Force hiding validation indicator immediately');
			// Cancel any pending animation frames or timeouts that might re-show the indicator
			this.currentCheckIndicator.style.display = 'none';
			this.currentCheckIndicator.remove();
			this.currentCheckIndicator = null;
		}
	}

	/**
	 * Check if validation indicator is currently showing
	 */
	isValidationIndicatorVisible(): boolean {
		return this.currentCheckIndicator !== null;
	}
}
