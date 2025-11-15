import { Logger } from '../../utils/logger';
import { FormatUtils } from '../utils/format-utils';
import { I18nManager } from '../../i18n/i18n-manager';

/**
 * PromptBuilder - 负责构建各种提示词
 * 从 plan-execute-processor.ts 提取，用于减少主文件大小
 */
export class PromptBuilder {
	constructor(
		private i18n: I18nManager,
		private getAvailableToolsDescriptionFn: () => Promise<string>
	) {}

	/**
	 * Build Plan-Execute prompt based on phase
	 */
	async buildPlanExecutePrompt(
		userQuery: string, 
		phase: 'plan' | 'execute' = 'plan', 
		executionResults?: any[]
	): Promise<string> {
		const startTime = Date.now();
		Logger.debug('⏱️ [START] buildPlanExecutePrompt for phase:', phase, new Date().toISOString());

		if (phase === 'plan') {
			const toolsStartTime = Date.now();
			Logger.debug('⏱️ [START] Getting available tools description...', new Date().toISOString());
			const availableTools = await this.getAvailableToolsDescriptionFn();
			const toolsEndTime = Date.now();
			Logger.debug(`⏱️ [END] Getting available tools took ${toolsEndTime - toolsStartTime}ms`);
			Logger.debug(`Available tools length: ${availableTools.length} characters`);
			
			const buildPromptStartTime = Date.now();
			Logger.debug('⏱️ [START] Building plan phase prompt...', new Date().toISOString());
			const prompt = this.buildPlanPhasePrompt(userQuery, availableTools);
			const buildPromptEndTime = Date.now();
			Logger.debug(`⏱️ [END] Building plan phase prompt took ${buildPromptEndTime - buildPromptStartTime}ms`);
			
			const endTime = Date.now();
			Logger.debug(`⏱️ [TOTAL] buildPlanExecutePrompt completed in ${endTime - startTime}ms`);
			return prompt;
		} else {
			// Execute phase is now handled by sequential step execution
			// This method is kept for backward compatibility but should not be used
			Logger.warn('buildPlanExecutePrompt with execute phase is deprecated. Use buildSimpleFinalAnswerPrompt instead.');
			const finalPrompt = await this.buildSimpleFinalAnswerPrompt(userQuery, executionResults || []);
			return finalPrompt;
		}
	}

	/**
	 * Build Plan Agent prompt - responsible for tool call planning
	 */
	buildPlanPhasePrompt(userQuery: string, availableTools: string): string {
		const startTime = Date.now();
		Logger.debug('⏱️ [START] buildPlanPhasePrompt...', new Date().toISOString());
		Logger.debug(`User query length: ${userQuery.length}, Available tools length: ${availableTools.length}`);
		
		const result = `# ${this.i18n.t('planExecute.planningPrompt.role')}
${this.i18n.t('planExecute.planningPrompt.roleDescription')}

# ${this.i18n.t('planExecute.planningPrompt.rules')}
1. ${this.i18n.t('planExecute.planningPrompt.rule1')}
2. ${this.i18n.t('planExecute.planningPrompt.rule2')}
${this.i18n.t('planExecute.planningPrompt.rule2a')}
${this.i18n.t('planExecute.planningPrompt.rule2b')}
${this.i18n.t('planExecute.planningPrompt.rule2c')}
${this.i18n.t('planExecute.planningPrompt.rule2d')}
3. ${this.i18n.t('planExecute.planningPrompt.rule3')}
4. ${this.i18n.t('planExecute.planningPrompt.rule4')}
5. ${this.i18n.t('planExecute.planningPrompt.rule5')}
${this.i18n.t('planExecute.planningPrompt.rule5a')}
${this.i18n.t('planExecute.planningPrompt.rule5b')}
${this.i18n.t('planExecute.planningPrompt.rule5c')}
${this.i18n.t('planExecute.planningPrompt.rule5d')}
6. ${this.i18n.t('planExecute.planningPrompt.rule6')}
${this.i18n.t('planExecute.planningPrompt.rule6a')}
${this.i18n.t('planExecute.planningPrompt.rule6b')}
${this.i18n.t('planExecute.planningPrompt.rule6c')}
${this.i18n.t('planExecute.planningPrompt.rule6d')}
${this.i18n.t('planExecute.planningPrompt.rule6e')}
7. ${this.i18n.t('planExecute.planningPrompt.rule7')}
${this.i18n.t('planExecute.planningPrompt.rule7a')}
${this.i18n.t('planExecute.planningPrompt.rule7b')}
${this.i18n.t('planExecute.planningPrompt.rule7c')}
${this.i18n.t('planExecute.planningPrompt.rule7d')}
8. **优先使用内置 insert 工具**: 当需要向现有文件添加内容时，优先使用 \`insert\` 工具而不是 \`create\` 或 \`append\` 工具。insert 工具允许在文件的指定行号插入内容，提供更精确的控制。参数包括: path (文件路径), insert_line (插入位置的行号，0表示文件开头), new_str (要插入的内容)。
9. **网页内容需要处理和润色**: 使用 \`fetch_web_content\` 获取网页内容后，原始内容通常包含大量HTML标签、导航链接、广告等无关信息。在将内容插入笔记前，应该添加一个内容提炼和格式化的步骤，提取关键信息并以 Markdown 格式呈现。可以使用占位符 \`{{stepN.output.content}}\` 引用前一步的网页内容，系统会自动对其进行智能处理和格式化。
10. **⚠️ 严格使用可用工具列表**: 你只能使用下面"Available Tools"部分列出的工具。绝对不要创造、发明或猜测工具名称。如果你尝试使用不存在的工具，执行将失败。请仔细检查工具名称的拼写，确保与可用工具列表完全一致。如果需要的功能没有对应的工具，请使用现有工具的组合来实现目标。
11. **🚫 不要添加写草稿步骤**: 在制定执行计划时，不要添加"写草稿"、"生成草稿"、"创建初稿"等中间步骤。你应该直接生成最终内容并写入文件。不需要先写草稿再修改，直接一步到位生成高质量的最终内容即可。避免使用诸如"assistant_draft_generation"等不存在的工具。
12. **📝 str_replace 工具使用规范 - 极其重要**:
   - **old_str 必须从原文精确提取**: \`old_str\` 参数必须是文件中实际存在的**原始文本**，不能修改、不能添加行号、不能重写或改写。使用 \`read_file\` 工具读取文件后，必须从读取结果中**原样复制**需要替换的部分作为 \`old_str\`。
   - **禁止修改 old_str**: 绝对不要对 \`old_str\` 进行任何修改，包括：❌ 添加行号前缀（如 "1→"、"2→"）、❌ 添加引导文本（如 "以下是内容："）、❌ 重新格式化、❌ 改写内容、❌ 只复制部分内容。必须**完整且精确**地复制原文。
   - **全文替换使用 create 工具**: 如果需要替换文件的**全部内容**或**大部分内容**，不要使用 \`str_replace\`，而应该使用 \`create\` 工具并设置 \`override: true\` 参数来覆盖原文件。这样更高效且不易出错。
   - **示例 - 正确用法**:
     \`\`\`
     步骤1: 使用 read_file 读取文件
     步骤2: 使用 str_replace，old_str 使用 {{step1.output}} 引用原文（系统会自动清理格式）
     \`\`\`
   - **示例 - 全文替换用法**:
     \`\`\`
     步骤1: 使用 create 工具，设置 path: "文件路径", file_text: "新的完整内容", override: true
     // 不需要先 read_file，直接创建并覆盖
     \`\`\`
13. **📄 create 工具的 override 参数**: \`create\` 工具支持 \`override\` 参数（布尔值）。当 \`override: true\` 时，如果文件已存在会直接覆盖；当 \`override: false\` 或不设置时（默认），如果文件存在会自动生成新文件名（如 file-1.md, file-2.md）。需要更新现有文件的全部内容时，使用 \`create\` + \`override: true\` 比 \`str_replace\` 更合适。

# ${this.i18n.t('planExecute.planningPrompt.outputFormat')}
<plan>
{
  "steps": [
    {
      "step_id": "step1",
      "tool": "${this.i18n.t('planExecute.planningPrompt.templateToolName')}",
      "input": "${this.i18n.t('planExecute.planningPrompt.templateInputContent')}",
      "reason": "${this.i18n.t('planExecute.planningPrompt.templateStepReason')}"
    },
    {
      "step_id": "step2",
      "tool": "${this.i18n.t('planExecute.planningPrompt.templateToolName')}",
      "input": ${this.i18n.t('planExecute.planningPrompt.templateDependentInput')},
      "reason": "${this.i18n.t('planExecute.planningPrompt.templateCallReason')}"
    }
  ]
}
</plan>

${this.i18n.t('planExecute.planningPrompt.planExample')}
<action step_id="step1">
<use_mcp_tool>
<tool_name>${this.i18n.t('planExecute.planningPrompt.exampleToolName')}</tool_name>
<arguments>{"${this.i18n.t('planExecute.planningPrompt.exampleParamName')}":"${this.i18n.t('planExecute.planningPrompt.exampleParamValue')}"}</arguments>
</use_mcp_tool>
</action>

# ${this.i18n.t('planExecute.planningPrompt.obsidianVaultContext')}
${this.i18n.t('planExecute.planningPrompt.vaultContextDescription')}
${this.i18n.t('planExecute.planningPrompt.vaultRule1')}
${this.i18n.t('planExecute.planningPrompt.vaultRule2')}
${this.i18n.t('planExecute.planningPrompt.vaultExample1')}
${this.i18n.t('planExecute.planningPrompt.vaultExample2')}
${this.i18n.t('planExecute.planningPrompt.vaultExample3')}

# ${this.i18n.t('planExecute.planningPrompt.availableTools')}
${availableTools}

# ${this.i18n.t('planExecute.planningPrompt.userQuestion')}
${userQuery}

${this.i18n.t('planExecute.planningPrompt.generatePlanAndExecute')}`;
		
		const endTime = Date.now();
		Logger.debug(`⏱️ [END] buildPlanPhasePrompt completed in ${endTime - startTime}ms, result length: ${result.length} characters`);
		return result;
	}

	/**
	 * Build simplified final answer prompt (no Execution Trace)
	 */
	async buildSimpleFinalAnswerPrompt(userQuery: string, executionResults: any[]): Promise<string> {
		// Enhanced safe JSON serialization with depth limiting
		const safeJsonStringify = (obj: any, space?: number): string => {
			const seen = new WeakSet();
			const maxDepth = 10; // Limit recursion depth
			const maxStringLength = 1000; // Limit string length

			const replacer = (key: string, value: any, currentDepth = 0): any => {
				// Limit recursion depth
				if (currentDepth > maxDepth) {
					return '[Max Depth Reached]';
				}

				// Skip circular references
				if (typeof value === 'object' && value !== null) {
					if (seen.has(value)) {
						return '[Circular Reference]';
					}
					seen.add(value);
				}

				// Skip functions
				if (typeof value === 'function') {
					return '[Function]';
				}

				// Truncate very long strings
				if (typeof value === 'string' && value.length > maxStringLength) {
					return value.substring(0, maxStringLength) + '...[truncated]';
				}

				// Skip problematic DOM and React elements
				if (typeof value === 'object' && value !== null) {
					if (value.constructor) {
						const constructorName = value.constructor.name;
						if (constructorName === 'HTMLElement' || constructorName.includes('Element')) {
							return '[DOM Element]';
						}
					}
					if (value._owner || value._store || value.$$typeof) {
						return '[React Component]';
					}
					// Skip very large objects
					if (Object.keys(value).length > 50) {
						return '[Large Object - ' + Object.keys(value).length + ' keys]';
					}
				}

				return value;
			};

			try {
				return JSON.stringify(obj, replacer, space);
			} catch (error) {
				Logger.error('JSON stringify error:', error);
				return JSON.stringify({
					error: 'Failed to serialize execution results',
					message: error instanceof Error ? error.message : 'Unknown error',
					resultCount: Array.isArray(obj?.executions) ? obj.executions.length : 'unknown'
				}, null, space);
			}
		};

		// Simplified execution results - only include essential data
		const simplifiedResults = executionResults.map((result, index) => {
			try {
				return {
					step: index + 1,
					step_id: result.step_id || `step_${index + 1}`,
					tool: result.tool_name || 'unknown',
					success: result.success !== false,
					result_summary: FormatUtils.summarizeToolResult(result.tool_result),
					timestamp: result.timestamp || Date.now()
				};
			} catch (error) {
				return {
					step: index + 1,
					error: 'Failed to process result',
					message: error instanceof Error ? error.message : 'Unknown error'
				};
			}
		});

		const executionsJson = safeJsonStringify({
			executions: simplifiedResults
		}, 2);

		return `# ${this.i18n.t('planExecute.finalAnswerPrompt.role')}
${this.i18n.t('planExecute.finalAnswerPrompt.roleDescription')}

# ${this.i18n.t('planExecute.finalAnswerPrompt.input')}
${this.i18n.t('planExecute.finalAnswerPrompt.toolExecutionResults')}
${executionsJson}

# ${this.i18n.t('planExecute.finalAnswerPrompt.rules')}
1. ${this.i18n.t('planExecute.finalAnswerPrompt.requirement1')}
2. ${this.i18n.t('planExecute.finalAnswerPrompt.requirement2')}
3. ${this.i18n.t('planExecute.finalAnswerPrompt.requirement3')}
4. ${this.i18n.t('planExecute.finalAnswerPrompt.requirement4')}

# ${this.i18n.t('planExecute.finalAnswerPrompt.originalUserQuestion')}
${userQuery}

${this.i18n.t('planExecute.finalAnswerPrompt.answerBasedOnResults')}`;
	}

	/**
	 * Build content generation prompt for file creation tools
	 * Enhanced version from main processor with support for different tool types
	 */
	async buildContentGenerationPrompt(
		step: any, 
		filePath: string, 
		contentTemplate: string, 
		toolName: string,
		originalUserQuery: string,
		planSteps: any[],
		buildCollectedInformationFn: () => string,
		buildExecutionContextFn: () => string
	): Promise<string> {
		let taskDescription: string;
		let instructions: string;
		
		if (toolName === 'create') {
			taskDescription = this.i18n.t('planExecute.contentGeneration.contentGenerationTask');
			instructions = this.i18n.t('planExecute.contentGeneration.contentGenerationInstructions');
		} else if (toolName === 'insert') {
			taskDescription = `任务：为文件 ${filePath} 生成插入内容`;
			instructions = '根据以下信息，为文件生成要插入的内容：';
		} else if (toolName === 'str_replace' || toolName === 'sed') {
			taskDescription = `任务：为文件 ${filePath} 生成替换内容`;
			instructions = '根据以下信息，为文件生成要替换的新内容：';
		} else {
			taskDescription = this.i18n.t('planExecute.contentGeneration.contentAppendTask', { filePath });
			instructions = this.i18n.t('planExecute.contentGeneration.contentAppendInstructions');
		}

		// Check if this is the final create step
		const currentStepIndex = planSteps.findIndex(s => s.step_id === step.step_id);
		const isFinalCreateStep = currentStepIndex === planSteps.length - 1 && toolName === 'create';

		if (isFinalCreateStep) {
			// For final create step: focus on original user task with collected info as supporting context
			const collectedInfoSection = buildCollectedInformationFn();
			
			return `# ${taskDescription}

Your primary goal is to complete the following user task:

## ${this.i18n.t('planExecute.contentGeneration.userTaskSection', { defaultValue: 'User\'s Original Task' })}
${originalUserQuery || this.i18n.t('planExecute.contentGeneration.noUserTask', { defaultValue: 'No task description available' })}

${collectedInfoSection}

## ${this.i18n.t('planExecute.contentGeneration.fileInformationSection')}
- ${this.i18n.t('planExecute.contentGeneration.filePath', { path: filePath })}
- ${this.i18n.t('planExecute.contentGeneration.fileGoal', { goal: step.reason || this.i18n.t('planExecute.contentGeneration.defaultGoal') })}
- ${this.i18n.t('planExecute.contentGeneration.toolType', { tool: toolName })}

## ${this.i18n.t('planExecute.contentGeneration.requirementsSection')}
${instructions}

1. ${this.i18n.t('planExecute.contentGeneration.requirement1')}
2. ${this.i18n.t('planExecute.contentGeneration.requirement2')}
3. ${this.i18n.t('planExecute.contentGeneration.requirement3')}
4. ${this.i18n.t('planExecute.contentGeneration.requirement4')}
5. ${this.i18n.t('planExecute.contentGeneration.requirement5')}
6. ${this.i18n.t('planExecute.contentGeneration.requirement6')}
7. ${this.i18n.t('planExecute.contentGeneration.requirement7')}

${this.i18n.t('planExecute.contentGeneration.generateCompleteContent')}`;
		} else {
			// For other steps (preparation): prioritize step purpose and user task
			const executionContextSection = buildExecutionContextFn();
			
			return `# ${taskDescription}

## ${this.i18n.t('planExecute.contentGeneration.currentStepPurpose', { defaultValue: 'Current Step Purpose' })}
${step.reason || this.i18n.t('planExecute.contentGeneration.defaultGoal')}

## ${this.i18n.t('planExecute.contentGeneration.userTaskSection', { defaultValue: 'User\'s Original Task' })}
${originalUserQuery || this.i18n.t('planExecute.contentGeneration.noUserTask', { defaultValue: 'No task description available' })}

${executionContextSection}

## ${this.i18n.t('planExecute.contentGeneration.fileInformationSection')}
- ${this.i18n.t('planExecute.contentGeneration.filePath', { path: filePath })}
- ${this.i18n.t('planExecute.contentGeneration.toolType', { tool: toolName })}

## ${this.i18n.t('planExecute.contentGeneration.requirementsSection')}
${instructions}

1. ${this.i18n.t('planExecute.contentGeneration.requirement1')}
2. ${this.i18n.t('planExecute.contentGeneration.requirement2')}
3. ${this.i18n.t('planExecute.contentGeneration.requirement3')}
4. ${this.i18n.t('planExecute.contentGeneration.requirement4')}
5. ${this.i18n.t('planExecute.contentGeneration.requirement5')}
6. ${this.i18n.t('planExecute.contentGeneration.requirement6')}
7. ${this.i18n.t('planExecute.contentGeneration.requirement7')}

${toolName === 'create'
	? this.i18n.t('planExecute.contentGeneration.generateCompleteContent')
	: toolName === 'insert'
	? '现在请直接输出要**插入到文件中**的内容（从第一行正文开始，不要任何说明性前缀）：'
	: (toolName === 'str_replace' || toolName === 'sed')
	? '现在请直接输出要**替换的新内容**（从第一行正文开始，不要任何说明性前缀）：'
	: this.i18n.t('planExecute.contentGeneration.generateAppendContent')}`;
		}
	}
}
