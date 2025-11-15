import type { ChatMessage } from '../../types';
import { Logger } from '../../utils/logger';
import type { PlaceholderReplacementError } from './placeholder-utils';

/**
 * Step Regeneration Utilities
 * 
 * Provides intelligent step regeneration capabilities:
 * - Error analysis to determine repair strategy
 * - Parameter fixing for validation errors
 * - Alternative tool selection for service failures
 * - Placeholder error recovery
 */
export class StepRegenerationUtils {
	/**
	 * Intelligently regenerate a failed step by analyzing the error and choosing appropriate strategy
	 * 
	 * @param originalStep - The step that failed
	 * @param stepIndex - Index of the failed step
	 * @param error - The error that caused the failure
	 * @param executionResults - Results from previous steps for context
	 * @param getProvider - Function to get active AI provider
	 * @param getToolManager - Function to get tool manager
	 * @param abortSignal - Abort signal for cancellation
	 * @returns Regenerated step with fixed parameters or alternative tool
	 */
	static async intelligentlyRegenerateStep(
		originalStep: any,
		stepIndex: number,
		error: Error,
		executionResults: any[],
		getProvider: () => any,
		getToolManager: () => any,
		abortSignal?: AbortSignal
	): Promise<any> {
		Logger.debug('===== Intelligently regenerating step =====');
		Logger.debug('Original step:', originalStep);
		Logger.debug('Error:', error);

		try {
			// Get available tool definitions for alternative tool search
			const toolManager = getToolManager();
			const availableTools = await toolManager?.getAllTools() || [];
			const toolNames = availableTools.map((t: any) => t.name).join(', ');

			// Build error analysis prompt
			const analysisPrompt = `你是一个智能错误分析助手。当前执行计划中的某个步骤失败了，你需要分析错误类型并决定最佳修复策略。

## 失败的步骤信息

**步骤ID**: ${originalStep.step_id}
**工具名称**: ${originalStep.tool}
**执行原因**: ${originalStep.reason || '未提供'}
**输入参数**: ${JSON.stringify(originalStep.input, null, 2)}

## 错误信息

**错误类型**: ${error.constructor.name}
**错误消息**: ${error.message}
**完整错误**: ${error.toString()}

## 可用的替代工具

${toolNames}

## 决策要求

请分析这个错误，判断应该采取哪种修复策略：

**策略1: fix_parameters** - 修复参数问题
- 适用场景：参数格式错误、参数验证失败、字段引用错误、类型不匹配等
- 修复方式：重新生成正确的工具调用参数

**策略2: find_alternative** - 寻找替代工具
- 适用场景：API密钥缺失、外部服务不可用、网络连接失败、认证失败等
- 修复方式：寻找功能相似的替代工具（例如：Google搜索失败 → 使用DuckDuckGo搜索）

## 输出格式

请**只**输出一个有效的JSON对象，格式如下：

{
  "strategy": "fix_parameters" | "find_alternative",
  "reasoning": "你的分析理由（简短说明为什么选择这个策略）",
  "alternative_tool": "替代工具名称（仅当strategy=find_alternative时需要，从上述可用工具列表中选择）"
}

请直接输出JSON，不要用\`\`\`json包裹。`;

			Logger.debug('Analysis prompt:', analysisPrompt);

			// Call AI to analyze the error
			const provider = getProvider();
			if (!provider) {
				throw new Error('No active AI provider available for error analysis');
			}

			const messages: ChatMessage[] = [
				{
					id: `analyze-${Date.now()}`,
					role: 'user',
					content: analysisPrompt,
					timestamp: Date.now()
				}
			];

			let analysisText = '';

			await provider.sendStreamingMessage(
				messages,
				(chunk: any) => {
					if (chunk.delta) {
						analysisText += chunk.delta;
					}
				},
				abortSignal
			);

			analysisText = analysisText.trim();
			Logger.debug('AI analysis response:', analysisText);

			// Parse the analysis result
			let analysis: { strategy: string; reasoning: string; alternative_tool?: string };
			try {
				// Try to extract JSON from the response
				const jsonMatch = analysisText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
				if (jsonMatch) {
					analysis = JSON.parse(jsonMatch[1]);
				} else {
					analysis = JSON.parse(analysisText);
				}
			} catch (parseError) {
				Logger.error('Failed to parse analysis result, defaulting to fix_parameters');
				analysis = {
					strategy: 'fix_parameters',
					reasoning: 'Failed to parse AI analysis, attempting parameter fix'
				};
			}

			Logger.debug('Analysis result:', analysis);

			// Execute strategy based on AI decision
			if (analysis.strategy === 'find_alternative' && analysis.alternative_tool) {
				// Strategy 2: Find alternative tool
				return await StepRegenerationUtils.generateAlternativeStep(
					originalStep,
					stepIndex,
					analysis.alternative_tool,
					analysis.reasoning,
					executionResults,
					getProvider,
					getToolManager,
					abortSignal
				);
			} else {
				// Strategy 1: Fix parameters (default)
				return await StepRegenerationUtils.generateFixedParameterStep(
					originalStep,
					stepIndex,
					error,
					analysis.reasoning,
					executionResults,
					getProvider,
					getToolManager,
					abortSignal
				);
			}

		} catch (error) {
			Logger.error('Intelligent regeneration failed:', error);
			throw error;
		}
	}

	/**
	 * Generate a step with fixed parameters
	 */
	static async generateFixedParameterStep(
		originalStep: any,
		stepIndex: number,
		error: Error,
		reasoning: string,
		executionResults: any[],
		getProvider: () => any,
		getToolManager: () => any,
		abortSignal?: AbortSignal
	): Promise<any> {
		Logger.debug('Generating step with fixed parameters...');

		// Get tool definition for signature info
		const toolManager = getToolManager();
		const allTools = await toolManager?.getAllTools() || [];
		const toolDef = allTools.find((t: any) => t.name === originalStep.tool);
		const toolSignature = toolDef ? JSON.stringify(toolDef.inputSchema, null, 2) : 'Tool signature not available';

		// Build context for parameter fixing
		const previousResults = executionResults
			.filter(result => result.step_index < stepIndex)
			.map(result => {
				const resultData = result.tool_result?.result || result.tool_result || {};
				return {
					step_id: result.step_id,
					tool_name: result.tool_name,
					available_fields: Object.keys(resultData),
					sample_data: JSON.stringify(resultData).substring(0, 300)
				};
			});

		const fixPrompt = `你是一个参数修复助手。用户的执行计划中有一个步骤因为参数问题失败，需要你重新生成正确的参数。

## 失败的步骤信息

**步骤ID**: ${originalStep.step_id}
**工具名称**: ${originalStep.tool}
**执行原因**: ${originalStep.reason || '未提供'}
**原始输入**: ${JSON.stringify(originalStep.input, null, 2)}

## 错误信息

**错误类型**: ${error.constructor.name}
**错误消息**: ${error.message}

## 工具签名（必须遵守）

\`\`\`json
${toolSignature}
\`\`\`

## 之前步骤的执行结果（供参考）

${JSON.stringify(previousResults, null, 2)}

## 修复要求

**AI分析**: ${reasoning}

请根据工具签名和错误信息，重新生成正确的步骤参数。确保：
1. 参数类型与工具签名匹配
2. 必需参数都已提供
3. 参数值格式正确
4. 如果需要引用之前步骤的结果，使用正确的字段名

## 输出格式

请**只**输出一个有效的JSON对象，不要包含任何其他文字、解释或markdown标记：

{
  "step_id": "${originalStep.step_id}",
  "tool": "${originalStep.tool}",
  "input": {
    "参数名": "参数值"
  },
  "reason": "为什么要执行这个步骤"
}

请直接输出JSON，不要用\`\`\`json包裹。`;

		Logger.debug('Fix parameter prompt:', fixPrompt);

		const provider = getProvider();
		if (!provider) {
			throw new Error('No active AI provider available');
		}

		const messages: ChatMessage[] = [
			{
				id: `fix-param-${Date.now()}`,
				role: 'user',
				content: fixPrompt,
				timestamp: Date.now()
			}
		];

		let fixedStepText = '';

		await provider.sendStreamingMessage(
			messages,
			(chunk: any) => {
				if (chunk.delta) {
					fixedStepText += chunk.delta;
				}
			},
			abortSignal
		);

		fixedStepText = fixedStepText.trim();
		Logger.debug('Fixed step response:', fixedStepText);

		// Parse the fixed step
		let fixedStep: any;
		try {
			const jsonMatch = fixedStepText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
			if (jsonMatch) {
				fixedStep = JSON.parse(jsonMatch[1]);
			} else {
				fixedStep = JSON.parse(fixedStepText);
			}
		} catch (parseError) {
			Logger.error('Failed to parse fixed step:', parseError);
			throw new Error(`Failed to parse fixed step: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
		}

		Logger.debug('Generated fixed step:', fixedStep);
		return fixedStep;
	}

	/**
	 * Generate a step using an alternative tool
	 */
	static async generateAlternativeStep(
		originalStep: any,
		stepIndex: number,
		alternativeTool: string,
		reasoning: string,
		executionResults: any[],
		getProvider: () => any,
		getToolManager: () => any,
		abortSignal?: AbortSignal
	): Promise<any> {
		Logger.debug('Generating step with alternative tool:', alternativeTool);

		// Get tool definition for the alternative tool
		const toolManager = getToolManager();
		const allTools = await toolManager?.getAllTools() || [];
		const toolDef = allTools.find((t: any) => t.name === alternativeTool);
		if (!toolDef) {
			throw new Error(`Alternative tool not found: ${alternativeTool}`);
		}
		const toolSignature = JSON.stringify(toolDef.inputSchema, null, 2);

		// Build context
		const previousResults = executionResults
			.filter(result => result.step_index < stepIndex)
			.map(result => {
				const resultData = result.tool_result?.result || result.tool_result || {};
				return {
					step_id: result.step_id,
					tool_name: result.tool_name,
					available_fields: Object.keys(resultData),
					sample_data: JSON.stringify(resultData).substring(0, 300)
				};
			});

		const alternativePrompt = `你是一个工具替换助手。用户的执行计划中有一个步骤因为外部服务不可用而失败，需要你使用替代工具重新生成这个步骤。

## 原始失败的步骤

**步骤ID**: ${originalStep.step_id}
**原工具**: ${originalStep.tool}
**执行原因**: ${originalStep.reason || '未提供'}
**原始输入**: ${JSON.stringify(originalStep.input, null, 2)}

## 替代工具信息

**新工具名称**: ${alternativeTool}
**工具签名**: 
\`\`\`json
${toolSignature}
\`\`\`

## 之前步骤的执行结果（供参考）

${JSON.stringify(previousResults, null, 2)}

## 替换要求

**AI分析**: ${reasoning}

请使用替代工具 \`${alternativeTool}\` 重新生成这个步骤，确保：
1. 新步骤达到与原步骤相同的目标
2. 参数符合新工具的签名要求
3. 合理转换原有的输入参数到新工具的参数格式

## 输出格式

请**只**输出一个有效的JSON对象，不要包含任何其他文字、解释或markdown标记：

{
  "step_id": "${originalStep.step_id}",
  "tool": "${alternativeTool}",
  "input": {
    "参数名": "参数值"
  },
  "reason": "为什么要使用这个替代工具执行这个步骤"
}

请直接输出JSON，不要用\`\`\`json包裹。`;

		Logger.debug('Alternative tool prompt:', alternativePrompt);

		const provider = getProvider();
		if (!provider) {
			throw new Error('No active AI provider available');
		}

		const messages: ChatMessage[] = [
			{
				id: `alternative-${Date.now()}`,
				role: 'user',
				content: alternativePrompt,
				timestamp: Date.now()
			}
		];

		let alternativeStepText = '';

		await provider.sendStreamingMessage(
			messages,
			(chunk: any) => {
				if (chunk.delta) {
					alternativeStepText += chunk.delta;
				}
			},
			abortSignal
		);

		alternativeStepText = alternativeStepText.trim();
		Logger.debug('Alternative step response:', alternativeStepText);

		// Parse the alternative step
		let alternativeStep: any;
		try {
			const jsonMatch = alternativeStepText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
			if (jsonMatch) {
				alternativeStep = JSON.parse(jsonMatch[1]);
			} else {
				alternativeStep = JSON.parse(alternativeStepText);
			}
		} catch (parseError) {
			Logger.error('Failed to parse alternative step:', parseError);
			throw new Error(`Failed to parse alternative step: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
		}

		Logger.debug('Generated alternative step:', alternativeStep);
		return alternativeStep;
	}

	/**
	 * Regenerate a step that failed due to placeholder errors
	 * Calls AI to fix the step based on available fields and context
	 */
	static async regenerateStepForPlaceholderError(
		originalStep: any,
		stepIndex: number,
		error: PlaceholderReplacementError,
		executionResults: any[],
		getProvider: () => any,
		abortSignal?: AbortSignal
	): Promise<any> {
		Logger.debug('===== Regenerating step for placeholder error =====');
		Logger.debug('Original step:', originalStep);
		Logger.debug('Error:', error);

		try {
			// Build context for regeneration
			const previousResults = executionResults
				.filter(result => result.step_index < stepIndex)
				.map(result => {
					const resultData = result.tool_result?.result || result.tool_result || {};
					return {
						step_id: result.step_id,
						tool_name: result.tool_name,
						available_fields: Object.keys(resultData),
						sample_data: JSON.stringify(resultData).substring(0, 300)
					};
				});

			// Build regeneration prompt with clearer field guidance
			const requestedField = error.placeholder.match(/\{\{step\d+\.output\.(\w+)\}\}/)?.[1] || '未知';
			
			// Show a sample of actual data to help understand structure
			let actualDataPreview = '';
			const sourceStepSummary = previousResults.find(r => r.step_id === error.stepId);
			if (sourceStepSummary) {
				actualDataPreview = sourceStepSummary.sample_data;
			}
			
			const regenerationPrompt = `你是一个计划修复助手。用户的执行计划中有一个步骤因为占位符错误而失败，需要你重新生成这个步骤。

## 失败的步骤信息

**步骤ID**: ${originalStep.step_id}
**工具名称**: ${originalStep.tool}
**原因**: ${originalStep.reason || '未提供'}
**原始输入**: ${JSON.stringify(originalStep.input, null, 2)}

## 错误详情

**失败的占位符**: ${error.placeholder}
**尝试引用的字段**: \`${requestedField}\` （这个字段不存在！）
**来源步骤**: ${error.stepId}
**来源工具**: ${error.toolName}

## ⚠️ 该步骤实际可用的字段

${error.availableFields.length > 0 ? error.availableFields.join(', ') : '(无可用字段)'}

## 实际数据结构示例（前800字符）

\`\`\`json
${actualDataPreview}
\`\`\`

## 重要提示

1. **不要再使用 \`${requestedField}\` 字段** - 它不存在！
2. **从"实际可用的字段"中选择正确的字段**
3. **最佳方案**: 如果原步骤需要多步骤数据聚合，考虑**直接在当前步骤中生成完整内容**，而不是使用占位符引用
4. 对于 \`create\` 工具，建议让 LLM 直接生成完整的 \`file_text\` 内容，而不是拼接占位符

## 推荐的修复策略

**策略A（推荐）**: 移除占位符，让步骤直接生成/包含所需的完整内容
**策略B**: 修正占位符，使用正确的字段名（从上述"实际可用的字段"中选择）

## 之前步骤的执行结果（供参考）

${JSON.stringify(previousResults, null, 2)}

## 输出格式

请**只**输出一个有效的JSON对象，不要包含任何其他文字、解释或markdown标记。格式如下：

{
  "step_id": "${originalStep.step_id}",
  "tool": "工具名称",
  "input": {
    "参数名": "参数值（优先使用完整内容，少用占位符）"
  },
  "reason": "为什么要执行这个步骤"
}

请直接输出JSON，不要用\`\`\`json包裹。`;

			Logger.debug('Regeneration prompt:', regenerationPrompt);

			// Call AI to regenerate the step
			const provider = getProvider();
			if (!provider) {
				throw new Error('No active AI provider available for step regeneration');
			}

			// Create a temporary message for the regeneration request
			const messages: ChatMessage[] = [
				{
					id: `regenerate-${Date.now()}`,
					role: 'user',
					content: regenerationPrompt,
					timestamp: Date.now()
				}
			];

			let regeneratedStepText = '';

			// Stream the response from AI
			await provider.sendStreamingMessage(
				messages,
				(chunk: any) => {
					if (chunk.delta) {
						regeneratedStepText += chunk.delta;
					}
				},
				abortSignal
			);

			regeneratedStepText = regeneratedStepText.trim();
			Logger.debug('Full AI response:', regeneratedStepText);

			// Try to extract JSON from the response
			let regeneratedStep: any;

			// First, try to parse directly
			try {
				regeneratedStep = JSON.parse(regeneratedStepText);
			} catch (directParseError) {
				Logger.warn('Direct parse failed, trying to extract JSON...');
				
				// Try to extract JSON from markdown code blocks
				const jsonMatch = regeneratedStepText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
				if (jsonMatch) {
					regeneratedStepText = jsonMatch[1].trim();
				}

				// Try to find JSON object boundaries
				const jsonObjectMatch = regeneratedStepText.match(/\{[\s\S]*\}/);
				if (jsonObjectMatch) {
					regeneratedStepText = jsonObjectMatch[0];
				}

				try {
					regeneratedStep = JSON.parse(regeneratedStepText);
				} catch (extractParseError) {
					Logger.error('Failed to parse regenerated step:', extractParseError);
					Logger.error('Response text:', regeneratedStepText);
					throw new Error(`AI返回的内容无法解析为有效的JSON: ${extractParseError instanceof Error ? extractParseError.message : String(extractParseError)}`);
				}
			}

			// Validate the regenerated step
			if (!regeneratedStep.tool || !regeneratedStep.input) {
				throw new Error('重新生成的步骤缺少必需字段（tool或input）');
			}

			// Ensure step_id is preserved
			regeneratedStep.step_id = originalStep.step_id;

			Logger.debug('Successfully regenerated step:', regeneratedStep);
			return regeneratedStep;

		} catch (error) {
			Logger.error('Step regeneration failed:', error);
			throw new Error(`步骤重新生成失败: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
