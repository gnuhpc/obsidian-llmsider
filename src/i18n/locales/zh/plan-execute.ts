/**
 * Plan-Execute framework translations
 */

export const zhPlanexecute = {planExecute: {
		generating: '正在生成执行计划...',
		regenerating: '正在重新生成步骤...',
		executingStep: '正在执行第 {step} 步，共 {total} 步',
		stepCompleted: '第 {step} 步执行完成',
		allStepsCompleted: '已完成',
		generatingAnswer: '正在生成最终答案...',
		generatingAnswerProgress: '正在生成最终答案... ({characters} 字符)',
		stopped: 'Plan-Execute 流程已被用户停止',
		maxIterationsReached: '已达到最大迭代次数，为防止无限循环已停止执行',

		// Tracker UI
		tracker: {
			title: '执行计划',
			planTitle: '计划',
			historyBadge: '历史记录',
			stepTitle: '步骤 {index}：{title}',
			progressText: '已完成 {completed}/{total}',
			statusPending: '待执行',
			statusInProgress: '执行中',
			statusCompleted: '已完成',
			statusSkipped: '已跳过',
			statusError: '错误',
			skippedByUser: '已被用户跳过',
			regenerateRetry: '重新生成并重试',
			retry: '重试',
			skip: '跳过',
			showDetails: '显示详情',
			hideDetails: '隐藏详情',
			executionFailed: '计划执行失败',
			inProgress: '{count} 执行中',
			failed: '{count} 失败',
			executingPlan: '正在执行计划...',
			toolIndex: '工具 {index}',
			request: '请求',
			response: '响应',
			error: '错误',
			copyRequest: '复制请求',
			copyResponse: '复制响应',
			copyError: '复制错误',
			retryTooltip: '重新执行此步骤',
			skipTooltip: '跳过此步骤并继续',
			regenerateRetryTooltip: '重新生成步骤内容并重试',
			stopped: '已停止',
			stoppedByUser: '执行已被用户停止'
		},

		// 执行计划相关
		executionPlanGeneration: {
			analyzing: '正在分析请求并生成执行计划...',
			buildingPlan: '正在构建包含步骤的执行计划...',
			planGenerated: '计划已生成',
			planGenerationFailed: '执行计划生成失败',
			invalidPlan: '生成的计划无效或格式错误',
			planTooLong: '执行计划过长，正在简化...',
			planValidation: '正在验证执行计划结构...',
			planExecution: '开始执行计划实施...'
		},

		// 步骤执行相关
		stepExecution: {
			preparingStep: '正在准备执行步骤...',
			preparingStepIcon: '🔄 正在准备执行...',
			stepLabel: '步骤{step}:',
			executingStepNumber: '正在执行第 {step} 步，共 {total} 步...',
			stepExecutionSuccess: '第 {step} 步执行成功',
			stepExecutionFailed: '第 {step} 步执行失败：{error}',
			stepValidation: '正在验证步骤参数和要求...',
			stepTimeout: '步骤执行超时',
			stepSkipped: '由于条件限制跳过步骤',
			stepRetrying: '正在重试步骤执行...',
			allStepsCompleted: '执行完成',
			executionInterrupted: '执行被用户或系统中断',
			stepCancelled: '步骤已取消'
		},

		// 工具执行相关
		toolExecution: {
			preparingTool: '正在准备工具执行...',
			executingTool: '正在执行工具：{toolName}',
			toolName: '工具 {toolName}',
			toolExecutionSuccess: '工具 {toolName} 执行成功',
			toolExecutionFailed: '工具 {toolName} 执行失败：{error}',
			toolNotFound: '工具 {toolName} 未找到或不可用',
			toolTimeout: '工具执行超时',
			toolParameterError: '工具 {toolName} 参数无效',
			toolPermissionDenied: '工具 {toolName} 权限被拒绝'
		},
		
		// 工具卡片状态标签
		toolCardStatus: {
			awaitingApproval: '等待批准',
			executing: '执行中',
			regenerating: '重新生成中',
			completed: '已完成',
			failed: '失败'
		},
		
		// 工具卡片UI标签
		toolCardLabels: {
			parameters: '参数',
			parameterCount: '{count} 个参数',
			parametersCount: '{count} 个参数',
			aiWantsToExecuteTools: 'AI 想要执行工具',
			toolsToExecute: '待执行工具',
			approveAndExecute: '批准并执行',
			cancel: '取消',
			executing: '执行中...',
			completed: '已完成',
			failed: '失败'
		},

		// 占位符错误处理
		placeholderError: {
			title: '占位符替换失败',
			regenerateAndTry: '重新生成并重试',
			retrying: '正在重试...'
		},

		// 答案生成相关
		answerGeneration: {
			generatingFinalAnswer: '正在基于执行结果生成最终答案...',
			guidingFinalAnswer: '检测到工具执行结果，正在引导生成最终答案...',
			answerGenerated: '答案已生成',
			answerGenerationFailed: '最终答案生成失败',
			summaryGeneration: '正在生成执行摘要...',
			resultCompilation: '正在编译执行结果...'
		},

		// 规划代理提示
		planningPrompt: {
			role: 'Role',
			roleDescription: '你是一个规划 Agent，负责为用户请求生成工具调用计划。',
			rules: 'Rules',
			rule1: '不要直接回答用户问题。',
			rule2: '你的任务是输出工具调用计划，包括：',
			rule2a: '   - 需要调用哪些工具',
			rule2b: '   - 工具调用顺序',
			rule2c: '   - 每步调用的输入',
			rule2d: '   - 每步的原因',
			rule3: '每个步骤必须有唯一的 "step_id"，以便后续追踪。',
			rule4: '输出必须严格按照指定的 XML 格式。',
			rule5: '**重要：对于涉及文件操作的工具（如 create、create_file、sed、str_replace 等），必须在输入中提供所有必需参数，包括相对于 Obsidian Vault 根目录的路径。**',
			rule5a: '   - 使用 "path" 参数指定文件路径',
			rule5b: '   - 路径格式：如 "笔记/天气报告.md" 或 "项目/计划.md"',
			rule5c: '   - 不要使用绝对路径，只使用相对于 Vault 的路径',
			rule5d: '   - 检查工具参数列表中标记为 "(必需)" 的参数，确保全部包含在输入中',
			rule6: '**占位符格式：当步骤需要引用前面步骤的输出结果时，请使用以下统一格式：**',
			rule6a: '   - {{step1.output.content}} - 引用第1步输出的content字段',
			rule6b: '   - {{step2.output.transformedText}} - 引用第2步输出的transformedText字段',
			rule6c: '   - {{stepN.output.fieldName}} - 通用格式，N为步骤编号，fieldName为字段名',
			rule6d: '   - 常用字段：content、text、transformedText、location、longitude、latitude、results',
			rule6d2: '   - **list_file_directory 输出**：使用 {{stepN.output.listing.files}} 引用文件数组，{{stepN.output.listing.folders}} 引用文件夹数组，或使用 {{stepN.output.listing}} 引用整个列表对象',
			rule6e: '   - 示例：{"content": "{{step2.output.transformedText}}"}',
			rule6f: '   - **日期计算字段**：使用get_current_time工具并设置calculate_dates=true时，可用字段包括：date_minus_7、date_minus_14、date_minus_30（分别表示7/14/30天前的日期，格式YYYY-MM-DD）',
			rule7: '**关键：当用户提到本地文件、现有文件或引用文件内容时（例如"基于X.md"、"参考该文件"、"使用来自...的内容"），您必须：**',
			rule7a: '   - 首先使用"view"工具读取被引用的文件内容',
			rule7b: '   - 然后在后续步骤中使用该内容',
			rule7c: '   - 示例：如果用户说"基于notes.md写一篇文章"，您的第一步必须是view("notes.md")',
			rule7d: '   - 绝不要在没有使用view工具读取的情况下假设文件内容',
			outputFormat: 'Output Format',
			planExample: '然后依次执行每个步骤：',
			obsidianVaultContext: 'Obsidian Vault Context',
			vaultContextDescription: '这是一个 Obsidian 插件环境。当使用文件创建工具时：',
			vaultRule1: '- 必须提供 "path" 参数，指定相对于 Vault 根目录的文件路径',
			vaultRule2: '- 文件路径示例：',
			vaultExample1: '  - "今日天气.md" (Vault 根目录下)',
			vaultExample2: '  - "日记/2024-01-01.md" (在日记文件夹下)',
			vaultExample3: '  - "项目/工作计划.md" (在项目文件夹下)',
			availableTools: 'Available Tools',
			userQuestion: 'User Question',
			generatePlanAndExecute: '请首先生成执行计划，然后开始执行第一步：',
			// 模板占位符
			templateToolName: '<工具名>',
			templateInputContent: '<输入内容>',
			templateStepReason: '<为什么要调用这个工具>',
			templateDependentInput: '{"param": "{{step1.output.fieldName}}"}',
			templateCallReason: '<调用原因>',
			// 动作示例占位符
			exampleToolName: '工具名',
			exampleParamName: '参数名',
			exampleParamValue: '参数值'
		},

	// 最终答案提示
	finalAnswerPrompt: {
		role: 'Role',
		roleDescription: '你是一个智能助手,负责根据工具执行结果回答用户问题。',
		input: '输入',
		toolExecutionResults: '工具执行结果:',
		rules: 'Rules',
		requirement1: '基于工具执行结果提供准确、有用的回答',
		requirement2: '直接回答用户问题,不需要显示执行过程',
		requirement3: '如果工具结果不足以完全回答问题,请诚实说明',
		requirement4: '回答应该自然、流畅,就像正常对话一样',
		originalUserQuestion: 'Original User Question',
		answerBasedOnResults: '请基于上述工具执行结果直接回答用户问题:',
		// 简洁最终答案的新键
		header: '请提供一个简洁的最终答案来回应用户的原始任务。',
		originalTask: '用户原始任务:',
		executionSummary: '执行摘要:',
		purpose: '目的',
		error: '错误',
		unknownError: '未知错误',
		noDescription: '无描述',
		success: '✅ 成功',
		failed: '❌ 失败',
		basedOnResults: '基于以上执行结果,请总结:',
		summaryPoint1: '1. 完成了什么',
		summaryPoint2: '2. 用户的任务是否成功完成',
		summaryPoint3: '3. 有哪些重要发现或输出',
		summaryPoint4: '4. 如果适用,下一步该做什么',
		keepConcise: '请保持答案简洁明了。'
	},

	// 内容生成阶段
	contentGeneration: {
		parsing: '解析中',
		analyzing: '分析中',
		preparing: '准备中',
		connecting: '连接中',
		connected: '已连接',
		generating: '生成中',
		processing: '处理中',
		completed: '已完成',
		error: '错误',
		parseParameters: '正在解析参数...',
		analyzeTemplate: '正在分析模板',
		analyzeResults: '正在分析结果...',
		buildPrompt: '正在构建提示词...',
		connectAI: '正在连接AI...',
		aiConnected: 'AI连接成功',
		generatingContent: '正在生成内容...',
		cleanContent: '正在清理内容...',
		contentCompleted: '内容生成完成',
		generationFailed: '生成失败',
		pathMissing: '缺少文件路径',
		aiUnavailable: 'AI服务不可用',
		foundResults: '找到 {count} 个执行结果',
		hasWebContent: '包含网页内容',
		noWebContent: '无网页内容',
		promptCompleted: '提示词完成 ({length} 字符)',
		contentProcessed: '内容已处理 ({length} 字符)',
		finalLength: '内容生成完成! 最终长度: {length} 字符',
		validationFailed: '计划参数验证失败,请检查工具调用参数',
		parameterValidationPassed: '{count} 个步骤参数验证通过',
		parameterValidationFailed: '参数验证失败',
		noExecutionResults: '暂无执行结果',
		unknownTool: '未知工具',
		executionSuccess: '成功',
		executionFailure: '失败',
		noContent: '无内容',
		contentGenerationTask: '任务: 生成文件内容',
		contentAppendTask: '任务: 为文件 {filePath} 生成追加内容',
		contentGenerationInstructions: '根据以下信息生成文件的具体内容:',
		contentAppendInstructions: '根据以下信息生成追加到文件的内容:',
		currentStepPurpose: '当前步骤目的',
		userTaskSection: '用户原始任务',
		noUserTask: '无任务描述',
		fileInformationSection: '文件信息',
		filePath: '文件路径: {path}',
		fileGoal: '目标: {goal}',
		toolType: '工具类型: {tool}',
		defaultGoal: '生成文件内容',
		previousResultsSection: '前序步骤执行结果',
		webContentSection: '网页内容 (如果有)',
		noWebContentMessage: '无网页内容',
		requirementsSection: '要求',
		requirement1: '如果有网页内容,请**完整翻译**为中文并以Markdown格式整理',
		requirement2: '**必须包含原文的所有内容**,不要省略任何重要信息',
		requirement3: '保持内容的结构和章节层次',
		requirement4: '移除不必要的HTML标签和样式信息',
		requirement5: '确保内容易于阅读和理解',
		requirement6: '**不要截断内容**,请提供完整的翻译',
		requirement7: '直接输出文件内容,不要添加任何解释性文字',
		generateCompleteContent: '请生成文件的**完整内容**:',
		generateAppendContent: '请生成要**追加到文件末尾的内容**:'
	},

	// 状态指示器
	status: {
		waiting: '等待中',
		inProgress: '进行中',
		completed: '已完成',
		failed: '失败',
		stopped: '已停止',
		timeout: '超时'
	},

	// 进度消息
	progress: {
		stepProgress: '步骤 {current}/{total} ({percentage}%)',
		overallProgress: '总体进度: {percentage}%',
		timeElapsed: '已用时间: {time}',
		estimatedRemaining: '预计剩余时间: {time}',
		executingCurrentStep: '执行中: {tool} (步骤 {step}/{total})',
		executingInProgress: '进行中 (步骤 {step}/{total})',
		preparingNextStep: '准备执行步骤 {step}/{total}',
		failedStepsWithCompleted: '{failed} 个步骤失败, {completed} 个已完成'
	}
}
};
