/**
 * Plan Validator - 计划验证器
 * 
 * 目的: 在执行前验证计划的正确性，捕获常见错误
 * 
 * 验证项:
 * 1. 模板引用的步骤是否存在
 * 2. 模板引用的字段是否符合工具输出 schema
 * 3. 工具依赖关系是否正确 (如 URL 工具后必须跟 fetch_web_content)
 * 4. 参数类型是否匹配
 * 
 * 注意: 不再使用硬编码的工具契约，直接从工具的 outputSchema 读取
 */

import { Logger } from '../utils/logger';
import { GENERATE_CONTENT_VIRTUAL_TOOL } from '../processors/utils/action-processor-utils';

/**
 * 计划步骤接口 (兼容 AgentStep)
 */
interface PlanStep {
	id?: string;        // AgentStep uses 'id'
	step_id?: string;   // Plan format uses 'step_id'
	tool: string;
	input: unknown;
	outputSchema?: {    // ✅ NEW: outputSchema field
		type: string;
		properties?: Record<string, unknown>;
		items?: unknown;
		description?: string;
	};
	reason?: string;
	status?: string;    // AgentStep has status field
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
	suggestions: string[];
}

/**
 * 验证错误接口
 */
export interface ValidationError {
	stepId: string;
	errorType: 'missing_step' | 'invalid_field' | 'missing_dependency' | 'type_mismatch' | 'schema_pattern_violation' | 'unknown_tool';  // ✅ NEW: added unknown_tool
	message: string;
	suggestion?: string;
	field?: string;     // ✅ NEW: optional field to specify which field has error
}

/**
 * 验证警告接口
 */
export interface ValidationWarning {
	stepId: string;
	warningType: 'unknown_tool' | 'unknown_field' | 'inefficient_pattern';
	message: string;
}

/**
 * 计划验证器类
 */
export class PlanValidator {
	// Static field to store tools map - set by MastraAgent before validation
	private static toolsMap: Record<string, any> | null = null;
	
	/**
	 * Set tools map for validation (called by MastraAgent)
	 */
	static setToolsMap(tools: Record<string, any>): void {
		this.toolsMap = tools;
	}

	private static normalizeToolName(toolName: string): string {
		if (toolName === 'create' && this.toolsMap && this.toolsMap['create_file']) {
			return 'create_file';
		}
		return toolName;
	}
	
	/**
	 * Get tool's outputSchema if available
	 */
	private static getToolOutputSchema(toolName: string): any {
		// 优先检查虚拟工具
		if (toolName === GENERATE_CONTENT_VIRTUAL_TOOL.name) {
			return GENERATE_CONTENT_VIRTUAL_TOOL.outputSchema;
		}

		if (!this.toolsMap || !this.toolsMap[toolName]) {
			return null;
		}

		const schema = this.toolsMap[toolName].outputSchema || null;

		return schema;
	}

	/**
	 * Get tool's inputSchema if available
	 */
	private static getToolInputSchema(toolName: string): any {
		// 优先检查虚拟工具
		if (toolName === GENERATE_CONTENT_VIRTUAL_TOOL.name) {
			return GENERATE_CONTENT_VIRTUAL_TOOL.inputSchema;
		}

		if (!this.toolsMap || !this.toolsMap[toolName]) {
			return null;
		}
		return this.toolsMap[toolName].inputSchema || null;
	}
	
	/**
	 * Check if tool returns URL list based on outputSchema
	 * Detects patterns like: results: array of URLs, urls: array, etc.
	 */
	private static isURLListTool(toolName: string): boolean {
		// fetch_web_content itself is NOT a URL list tool (it consumes URLs, doesn't produce them for fetching)
		if (toolName === 'fetch_web_content') {
			return false;
		}

		// Explicitly exclude tickertick_search_tickers as it returns ticker symbols, not URLs
		if (toolName === 'tickertick_search_tickers') {
			return false;
		}

		const tool = this.toolsMap?.[toolName];
		const isMCP = tool && (tool as any).source === 'mcp';

		// ✅ NEW: MCP 工具不强制检查依赖，除非有明确的 schema
		if (isMCP) {
			const outputSchema = this.getToolOutputSchema(toolName);
			if (!outputSchema) return false;
		}

		// Built-in web search tools that return URLs (must be followed by fetch_web_content)
		const BUILTIN_WEB_SEARCH_TOOLS = [
			'web_search',
			'enhanced_search',
			'baidu_search',
			'bing_search',
			'duckduckgo_text_search',
			'duckduckgo_news_search',
			'duckduckgo_image_search',
			'duckduckgo_video_search',
			'wikipedia_search',
			'tavily_search',
			'get_yahoo_finance_news_search'
		];

		// First check if it's a known built-in web search tool
		if (BUILTIN_WEB_SEARCH_TOOLS.includes(toolName)) {
			return true;
		}

		// Heuristic: Any tool with "search" in the name is likely a search tool that returns URLs
		const lowerName = toolName.toLowerCase();
		if (lowerName.includes('search') && !isMCP) {
			return true;
		}

		const outputSchema = this.getToolOutputSchema(toolName);
		if (!outputSchema) return false;
		
		// Check if output has 'results' field that is an array
		if (outputSchema.type === 'object' && outputSchema.properties) {
			const resultsField = outputSchema.properties.results;
			if (resultsField && resultsField.type === 'array') {
				// ✅ MCP 工具需要更严格的检查，确保描述中包含 URL 相关关键字
				// 且工具名称包含 search 或 web，避免对普通新闻/列表工具误判
				if (isMCP) {
					const desc = JSON.stringify(resultsField).toLowerCase();
					const hasUrl = desc.includes('url') || desc.includes('link') || desc.includes('href');
					return hasUrl && (lowerName.includes('search') || lowerName.includes('web'));
				}
				return true;
			}
		}
		
		// Check if output is directly an array type (like web_search, enhanced_search)
		if (outputSchema.type === 'array') {
			// Check description for URL-related keywords
			const description = outputSchema.description || '';
			const lowerDesc = description.toLowerCase();
			if (lowerDesc.includes('url') || lowerDesc.includes('link')) {
				// 对于 MCP 工具，同样要求名称包含 search 或 web
				if (isMCP) {
					return lowerName.includes('search') || lowerName.includes('web');
				}
				return true;
			}
		}
		
		// Check description for URL-related keywords
		const description = outputSchema.description || '';
		const lowerDesc = description.toLowerCase();
		if ((lowerDesc.includes('url') || lowerDesc.includes('link')) && 
		    (lowerDesc.includes('list') || lowerDesc.includes('array'))) {
			// 对于 MCP 工具，同样要求名称包含 search 或 web
			if (isMCP) {
				return lowerName.includes('search') || lowerName.includes('web');
			}
			return true;
		}
		
		return false;
	}
	
	/**
	 * Get standard output field from schema (e.g., 'results', 'content', 'path')
	 */
	private static getStandardOutputField(toolName: string): string | null {
		const outputSchema = this.getToolOutputSchema(toolName);
		if (!outputSchema || outputSchema.type !== 'object' || !outputSchema.properties) {
			return null;
		}
		
		// Common standard fields in order of preference
		const standardFields = ['results', 'content', 'data', 'output', 'path', 'value'];
		
		for (const field of standardFields) {
			if (outputSchema.properties[field]) {
				return field;
			}
		}
		
		// If no standard field found, return first property
		const firstField = Object.keys(outputSchema.properties)[0];
		return firstField || null;
	}
	
	/**
	 * 验证 outputSchema 是否有效
	 * 支持 object, array, string 三种类型
	 * 也支持 anyOf, oneOf, allOf 等 JSON Schema 组合器
	 */
	private static validateOutputSchemaPattern(step: PlanStep): ValidationError[] {
		const errors: ValidationError[] = [];
		const stepId = step.step_id || step.id || 'unknown';
		
		// ✅ NEW: MCP 工具不检查 output schema，保持通用性
		const tool = this.toolsMap?.[step.tool];
		if (tool && (tool as any).source === 'mcp') {
			return errors;
		}

		// 检查是否有 outputSchema
		if (!step.outputSchema) {
			errors.push({
				stepId,
				errorType: 'schema_pattern_violation',
				field: 'outputSchema',
				message: 'Missing outputSchema - Every step MUST include outputSchema (Pattern 2 requirement)',
				suggestion: 'Add outputSchema: {"type": "object", "properties": {"results": {...} OR "content": {...}}}'
			});
			return errors;
		}
		
		// 检查是否使用了 JSON Schema 组合器 (anyOf, oneOf, allOf)
		const hasCombiners = 'anyOf' in step.outputSchema || 
		                     'oneOf' in step.outputSchema || 
		                     'allOf' in step.outputSchema;
		
		// 如果使用了组合器，跳过 type 检查（这是合法的 JSON Schema）
		if (hasCombiners) {
			return errors;
		}
		
		// 检查 outputSchema.type 是否为有效类型 (object, array, string)
		const validTypes = ['object', 'array', 'string'];
		if (!validTypes.includes(step.outputSchema.type)) {
			errors.push({
				stepId,
				errorType: 'schema_pattern_violation',
				field: 'outputSchema.type',
				message: `Invalid outputSchema.type="${step.outputSchema.type}" - MUST be one of: ${validTypes.join(', ')}`,
				suggestion: 'Use "object", "array", or "string" based on the tool definition'
			});
		}
		
		// 检查是否有 properties (仅针对 object 类型)
		if (step.outputSchema.type === 'object' && !step.outputSchema.properties) {
			errors.push({
				stepId,
				errorType: 'schema_pattern_violation',
				field: 'outputSchema.properties',
				message: 'Missing properties in outputSchema - Object type MUST have properties defined',
				suggestion: 'Add properties: {"type": "object", "properties": {"results": {...} OR "content": {...}}}'
			});
		}
		
		return errors;
	}
	
	/**
	 * 验证完整计划
	 */
	static validatePlan(steps: PlanStep[]): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];
		const suggestions: string[] = [];
		
		// 构建步骤 ID 映射 (兼容 id 和 step_id)
		const stepMap = new Map<string, PlanStep>();
		for (const step of steps) {
			const stepId = step.step_id || step.id || '';
			if (stepId) {
				stepMap.set(stepId, step);
			}
		}
		
		// 验证每个步骤
		for (let i = 0; i < steps.length; i++) {
			const step = steps[i];
			step.tool = this.normalizeToolName(step.tool);
			
			// ✅ NEW: 验证 outputSchema 是否遵循模式2（对象包装）
			const schemaErrors = this.validateOutputSchemaPattern(step);
			errors.push(...schemaErrors);
			
			// 验证模板引用
			const templateErrors = this.validateTemplateReferences(step, stepMap);
			errors.push(...templateErrors);

			// 验证输入类型匹配
			const typeErrors = this.validateInputTypes(step, stepMap);
			errors.push(...typeErrors);
			
			// 验证工具依赖
			const { errors: depErrors, warnings: depWarnings } = this.validateToolDependencies(step, steps, i);
			errors.push(...depErrors);
			warnings.push(...depWarnings);
			
			// ✅ NEW: 验证工具是否存在
			const existenceErrors = this.validateToolExistence(step);
			errors.push(...existenceErrors);
			
			// 检查工具 Schema（只在没有 outputSchema 时警告）
			const toolWarnings = this.checkMissingSchema(step);
			warnings.push(...toolWarnings);
		}
		
		// 生成建议
		if (errors.length > 0) {
			suggestions.push('发现 ' + errors.length + ' 个错误，建议修复后再执行');
		}
		if (warnings.length > 0) {
			suggestions.push('发现 ' + warnings.length + ' 个警告，可能影响执行效果');
		}
		
		return {
			valid: errors.length === 0,
			errors,
			warnings,
			suggestions
		};
	}
	
	/**
	 * 验证模板引用
	 */
	private static validateTemplateReferences(
		step: PlanStep,
		stepMap: Map<string, PlanStep>
	): ValidationError[] {
		const errors: ValidationError[] = [];
		const inputStr = JSON.stringify(step.input);
		
		// 匹配所有模板引用: {{stepN.fieldName}} 或 {{stepN.output.fieldName}}
		// 支持可选的 .output 层以保持兼容性
		const templateRegex = /\{\{(step\d+)(?:\.output)?(?:\.([.\w\[\]]+))?\}\}/g;
		let match;
		
		while ((match = templateRegex.exec(inputStr)) !== null) {
			const [fullMatch, referencedStepId, fieldPath] = match;
			
			// 检查引用的步骤是否存在
			const referencedStep = stepMap.get(referencedStepId);
			if (!referencedStep) {
				errors.push({
					stepId: step.step_id || step.id || '',
					errorType: 'missing_step',
					message: `引用了不存在的步骤: ${referencedStepId}`,
					suggestion: `请检查步骤 ID 是否正确，当前计划中的步骤: ${Array.from(stepMap.keys()).join(', ')}`
				});
				continue;
			}
			
			// 🆕 使用 outputSchema 验证字段引用
			if (fieldPath) {
				const referencedTool = referencedStep.tool;

				// ✅ NEW: MCP 工具不检查字段引用，保持通用性
				const tool = this.toolsMap?.[referencedTool];
				if (tool && (tool as any).source === 'mcp') {
					continue;
				}

				const outputSchema = this.getToolOutputSchema(referencedTool);
				
				// 🔥 特殊处理：如果工具直接返回数组（如新闻/搜索工具），不应该有字段路径
				if (outputSchema && outputSchema.type === 'array') {
					// 常见错误：{{step1.output.results}} 但工具直接返回数组
					if (fieldPath === 'results' || fieldPath === 'urls' || fieldPath === 'links' || fieldPath === 'items') {
						errors.push({
							stepId: step.step_id || step.id || '',
							errorType: 'invalid_field',
							message: `工具 "${referencedTool}" 直接返回数组，不需要 .${fieldPath} 字段`,
							suggestion: `请修改为: {{${referencedStepId}}}`
						});
					}
				}
				// 处理对象类型的 outputSchema
				else if (outputSchema && outputSchema.type === 'object' && outputSchema.properties) {
					// 提取第一级字段名（忽略数组索引和嵌套路径）
					const firstLevelField = fieldPath.split(/[.\[]]/)[0];
					
					// 检查字段是否存在于 outputSchema.properties
					if (!outputSchema.properties[firstLevelField]) {
						const availableFields = Object.keys(outputSchema.properties).join(', ');
						errors.push({
							stepId: step.step_id || step.id || '',
							errorType: 'invalid_field',
							message: `工具 "${referencedTool}" 的输出中没有字段 "${firstLevelField}"`,
							suggestion: `可用字段: ${availableFields}。建议使用: {{${referencedStepId}.${availableFields.split(',')[0].trim()}}}`
						});
					}
				}
				// 如果没有 outputSchema，不报错（只在 checkUnknownTool 中警告）
			}
		}
		
		return errors;
	}

	/**
	 * 验证输入参数类型是否匹配
	 */
	private static validateInputTypes(
		step: PlanStep,
		stepMap: Map<string, PlanStep>
	): ValidationError[] {
		const errors: ValidationError[] = [];
		const stepId = step.step_id || step.id || '';

		// ✅ NEW: MCP 工具不检查输入类型，保持通用性
		const currentTool = this.toolsMap?.[step.tool];
		if (currentTool && (currentTool as any).source === 'mcp') {
			return errors;
		}

		const inputSchema = this.getToolInputSchema(step.tool);

		if (!inputSchema || !inputSchema.properties) {
			return errors;
		}

		const input = step.input as Record<string, any>;
		
		if (!input || typeof input !== 'object') {
			return errors;
		}
		
		for (const [key, value] of Object.entries(input)) {
			// 检查字段是否存在于 inputSchema
			if (!inputSchema.properties[key]) {
				// 忽略未知字段的警告，因为有些工具可能有动态参数
				continue;
			}

			const expectedType = inputSchema.properties[key].type;
			
			// 检查是否是模板引用
			if (typeof value === 'string' && value.match(/\{\{step\d+(?:\.output)?(?:\..+)?\}\}/)) {
				const match = /\{\{(step\d+)(?:\.output)?(?:\.([.\w\[\]]+))?\}\}/.exec(value);
				if (match) {
					const [_, referencedStepId, fieldPath] = match;
					const referencedStep = stepMap.get(referencedStepId);
					
					if (referencedStep) {
						const referencedTool = referencedStep.tool;
						const outputSchema = this.getToolOutputSchema(referencedTool);
						
						if (outputSchema) {
							let actualType = 'unknown';
							
							if (outputSchema.type === 'array') {
								actualType = 'array';
							} else if (outputSchema.type === 'object' && outputSchema.properties) {
								if (fieldPath) {
									const firstLevelField = fieldPath.split(/[.\[]]/)[0];
									if (outputSchema.properties[firstLevelField]) {
										actualType = outputSchema.properties[firstLevelField].type;
									}
								} else {
									actualType = 'object';
								}
							}
							
							// 如果类型已知且不匹配
							if (actualType !== 'unknown' && expectedType && actualType !== expectedType) {
								// 特殊情况：如果期望是 array 但实际是 string，可能是 JSON 字符串，暂时允许
								// 特殊情况：如果期望是 string 但实际是 object/array，可能是序列化，暂时允许
								if (expectedType === 'string' && (actualType === 'object' || actualType === 'array')) {
									continue;
								}
								
								errors.push({
									stepId,
									errorType: 'type_mismatch',
									field: key,
									message: `参数 "${key}" 期望类型 "${expectedType}"，但引用的 "${referencedStepId}" 输出字段类型为 "${actualType}"`,
									suggestion: `请确保数据类型匹配，或者使用转换工具`
								});
							}
						}
					}
				}
			}
		}
		
		return errors;
	}
	
	/**
	 * 验证工具依赖关系
	 */
	private static validateToolDependencies(
		step: PlanStep,
		allSteps: PlanStep[],
		currentIndex: number
	): { errors: ValidationError[], warnings: ValidationWarning[] } {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];
		const stepId = step.step_id || step.id || '';
		
		// 🆕 规则: URL 列表工具后必须有 fetch_web_content 消费它
		if (this.isURLListTool(step.tool)) {
			// 查找后续步骤中是否有 fetch_web_content 引用了当前步骤
			let consumerFound = false;
			
			for (let i = currentIndex + 1; i < allSteps.length; i++) {
				const nextStep = allSteps[i];
				if (nextStep.tool === 'fetch_web_content') {
					const inputStr = JSON.stringify(nextStep.input);
					// 检查是否引用了当前步骤（支持多种引用模式）
					// 例如: {{step1}}, {{step1.results}}, {{step1.results[0].url}}, {{step1[0]}}
					if (inputStr.includes(`{{${stepId}.`) || 
					    inputStr.includes(`{{${stepId}}}`) ||
					    inputStr.includes(`{{${stepId}[`)) {
						consumerFound = true;
						break;
					}
				}
			}
			
			if (!consumerFound) {
				// 获取标准字段和 outputSchema 用于构建建议
				const standardField = this.getStandardOutputField(step.tool);
				const outputSchema = this.getToolOutputSchema(step.tool);
				
				let suggestedRef: string;
				if (outputSchema && outputSchema.type === 'array') {
					// 数组类型建议
					suggestedRef = `{{${stepId}}}`;
				} else if (standardField) {
					// 对象类型建议
					suggestedRef = `{{${stepId}.${standardField}}}`;
				} else {
					// 默认建议
					suggestedRef = `{{${stepId}}}`;
				}
				
				// ✅ 强制执行：所有返回 URL 列表的工具（包括 MCP、News、Ticker）都必须有 fetch_web_content
				errors.push({
					stepId,
					errorType: 'missing_dependency',
					message: `工具 "${step.tool}" 返回 URL 列表，后续必须有 fetch_web_content 步骤来获取内容`,
					suggestion: `在后续步骤添加: fetch_web_content(urls=${suggestedRef})`
				});
			}
		}
		
		return { errors, warnings };
	}
	
	/**
	 * 验证工具是否存在
	 */
	private static validateToolExistence(step: PlanStep): ValidationError[] {
		const errors: ValidationError[] = [];
		const stepId = step.step_id || step.id || 'unknown';
		
		// 优先检查虚拟工具
		if (step.tool === GENERATE_CONTENT_VIRTUAL_TOOL.name) {
			return errors;
		}

		// 如果没有设置 toolsMap，无法验证，跳过
		if (!this.toolsMap) {
			return errors;
		}

		// 检查工具是否存在
		if (!this.toolsMap[step.tool]) {
			errors.push({
				stepId,
				errorType: 'unknown_tool',
				message: `Unknown or disabled tool: "${step.tool}"`,
				suggestion: 'Please use only available tools listed in the prompt'
			});
		}
		
		return errors;
	}

	/**
	 * 检查工具是否有 Schema 定义
	 */
	private static checkMissingSchema(step: PlanStep): ValidationWarning[] {
		const warnings: ValidationWarning[] = [];
		const stepId = step.step_id || step.id || '';
		
		// 如果工具不存在（已被 validateToolExistence 捕获），这里不再警告
		if (this.toolsMap && !this.toolsMap[step.tool] && step.tool !== GENERATE_CONTENT_VIRTUAL_TOOL.name) {
			return warnings;
		}
		
		// 检查工具是否有 outputSchema（包括虚拟工具）
		const outputSchema = this.getToolOutputSchema(step.tool);
		
		// 如果工具没有 outputSchema，给出警告
		if (!outputSchema) {
			// ✅ NEW: MCP 工具通常没有 outputSchema，不检查它们以保持通用性
			const tool = this.toolsMap?.[step.tool];
			if (tool && (tool as any).source === 'mcp') {
				return warnings;
			}

			warnings.push({
				stepId,
				warningType: 'unknown_tool',
				message: `Tool "${step.tool}" has no outputSchema defined, cannot validate field references`
			});
		}
		
		return warnings;
	}
	
	/**
	 * 格式化验证结果为可读文本
	 */
	static formatValidationResult(result: ValidationResult): string {
		const lines: string[] = [];
		
		lines.push('=== 计划验证结果 ===');
		lines.push('');
		
		if (result.valid) {
			lines.push('✅ 计划验证通过');
		} else {
			lines.push('❌ 计划验证失败');
		}
		
		if (result.errors.length > 0) {
			lines.push('');
			lines.push('错误:');
			for (const error of result.errors) {
				lines.push(`  [${error.stepId}] ${error.message}`);
				if (error.suggestion) {
					lines.push(`    建议: ${error.suggestion}`);
				}
			}
		}
		
		if (result.warnings.length > 0) {
			lines.push('');
			lines.push('警告:');
			for (const warning of result.warnings) {
				lines.push(`  [${warning.stepId}] ${warning.message}`);
			}
		}
		
		if (result.suggestions.length > 0) {
			lines.push('');
			lines.push('建议:');
			for (const suggestion of result.suggestions) {
				lines.push(`  • ${suggestion}`);
			}
		}
		
		return lines.join('\n');
	}
	
	/**
	 * 尝试自动修复计划中的常见错误
	 */
	static autoFixPlan(steps: PlanStep[]): { fixed: boolean; steps: PlanStep[]; changes: string[] } {
		const fixedSteps = JSON.parse(JSON.stringify(steps)) as PlanStep[];
		const changes: string[] = [];
		let fixed = false;
		
		// 构建步骤映射 (兼容 id 和 step_id)
		const stepMap = new Map<string, PlanStep>();
		for (const step of fixedSteps) {
			const stepId = step.step_id || step.id || '';
			if (stepId) {
				stepMap.set(stepId, step);
			}
		}

		// 🆕 自动插入缺失的 fetch_web_content 步骤 - 已移除，改为由 Prompt 指导 LLM 生成
		// The auto-insertion logic has been removed to rely on the LLM generating the correct plan based on prompts.
		// Validation errors in validateToolDependencies will still catch missing steps.
		
		// 🆕 尝试修复模板引用（使用动态 outputSchema）
		for (const step of fixedSteps) {
			const stepId = step.step_id || step.id || '';
			const inputStr = JSON.stringify(step.input);
			
			// Pass 1: Remove redundant .output layer
			const outputLayerRegex = /\{\{(step\d+)\.output(?:\.([.\w\[\]]+))?\}\}/g;
			let currentInputStr = inputStr.replace(outputLayerRegex, (match, stepId, fieldPath) => {
				fixed = true;
				return fieldPath ? `{{${stepId}.${fieldPath}}}` : `{{${stepId}}}`;
			});
			
			if (currentInputStr !== inputStr) {
				changes.push(`${stepId}: 移除了模板中冗余的 .output 层`);
			}

			// Pass 2: Fix invalid field names
			const templateRegex = /\{\{(step\d+)\.([.\w\[\]]+)\}\}/g;
			let finalInputStr = currentInputStr;
			let match;
			
			while ((match = templateRegex.exec(currentInputStr)) !== null) {
				const [fullMatch, referencedStepId, fieldPath] = match;
				const referencedStep = stepMap.get(referencedStepId);
				
				if (referencedStep) {
					const referencedTool = referencedStep.tool;
					
					// 🆕 使用动态方法获取标准字段
					const standardField = this.getStandardOutputField(referencedTool);
					const outputSchema = this.getToolOutputSchema(referencedTool);
					
					// 提取第一级字段（忽略数组索引和嵌套路径）
					const firstLevelField = fieldPath.split(/[.\[]]/)[0];
					
					// 检查字段是否有效
					if (outputSchema && outputSchema.type === 'object' && outputSchema.properties) {
						const validFields = Object.keys(outputSchema.properties);
						
						// 如果字段不存在于 schema 中，尝试修复为标准字段
						if (!validFields.includes(firstLevelField) && standardField) {
							const correctRef = `{{${referencedStepId}.${standardField}}}`;
							finalInputStr = finalInputStr.replace(fullMatch, correctRef);
							
							changes.push(`${stepId}: ${fullMatch} → ${correctRef} (字段 "${firstLevelField}" 不存在，改为标准字段 "${standardField}")`);
							fixed = true;
							
							Logger.info(`[PlanValidator] 自动修复: ${stepId} 的字段引用从 "${fullMatch}" 改为 "${correctRef}"`);
						}
					}
				}
			}
			
			if (finalInputStr !== inputStr) {
				step.input = JSON.parse(finalInputStr);
			}
		}
		
		return { fixed, steps: fixedSteps, changes };
	}
}
