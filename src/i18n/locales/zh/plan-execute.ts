/**
 * Plan-Execute framework translations
 */

export const zhPlanexecute = {planExecute: {
		generating: '正在生成执行计划...',
		regenerating: '正在重新生成步骤...',
		executingStep: '正在执行',
		stepCompleted: '第 {step} 步执行完成',
		allStepsCompleted: '已完成',
		generatingAnswer: '正在生成最终答案...',
		generatingAnswerProgress: '正在生成最终答案... ({characters} 字符)',
		processingBatch: '正在处理第 {index} 批内容...',
		stopped: 'Plan-Execute 流程已被用户停止',
		maxIterationsReached: '已达到最大迭代次数,为防止无限循环已停止执行',
		toggleMarkdown: '切换 Markdown 渲染',
		showMarkdown: '渲染为 Markdown',
		showPlainText: '显示纯文本',

		// Graph Execution Mode
		graphExecution: {
			title: '图执行模式',
			step: '步骤',
			layer: '层',
			layerStart: '起始',
			dependsOn: '依赖于',
			statusPending: '等待',
			statusRunning: '执行中',
			statusSuccess: '成功',
			statusFailed: '失败',
			statusSkipped: '跳过',
			dynamicStepTitle: '动态步骤确认',
			willExecute: '即将执行',
			tools: '个工具',
			parallelNotice: '这些工具将并行执行以提高效率',
			progress: '进度',
			completed: '已完成',
			confirm: '确认执行',
			cancel: '取消'
		},

		// Tracker UI
		tracker: {
			title: '执行计划',
			planTitle: '计划',
			historyBadge: '历史记录',
			stepTitle: '步骤 {index}：{title}',
			stepLabel: '步骤 {index}',
			stepResult: '步骤{step}结果:',
			layer: '层级',
			dependsOn: '依赖于：',
			
			// Error handling actions
			errorActions: {
				title: '步骤失败',
				skip: '跳过',
				retry: '重试',
				regenerate: '重新生成并重试',
				skipping: '跳过中...',
				retrying: '重试中...',
				regenerating: '重新生成中...'
			},
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
			stoppedByUser: '执行已被用户停止',
			placeholderErrorPrefix: '占位符替换失败：',
			placeholderNotFound: 'Placeholder {placeholder} not found.',
			placeholderFieldMissing: 'Field "{field}" does not exist in step{stepNum} result.',
			availableFields: 'Available fields:',
			suggestRegenerate: '请重新生成步骤使用正确的字段名，或跳过此步骤。',
			placeholderReplacementFailed: '占位符 {placeholder} 替换失败。\n\n可用的字段: {availableFields}\n\n请重新生成步骤使用正确的字段名，或跳过此步骤。'
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
			executingStepNumber: '正在执行步骤 {step}/{total}...',
			stepExecutionSuccess: '步骤 {step} 执行成功',
			stepExecutionFailed: '步骤 {step} 执行失败: {error}',
			stepValidation: '正在验证步骤参数和要求...',
			stepTimeout: '步骤执行超时',
			stepSkipped: '由于条件限制跳过步骤',
			stepRetrying: '正在重试步骤执行...',
			allStepsCompleted: '执行完成',
			executionInterrupted: '执行被用户或系统中断',
			stepCancelled: '步骤已取消',
			stepRegeneratedReady: '✅ 步骤已重新生成，准备执行...'
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
			result: '结果',
			aiWantsToExecuteTools: 'AI 想要执行工具',
			toolsToExecute: '待执行工具',
			approveAndExecute: '批准并执行',
			cancel: '取消',
			retry: '重试',
			skip: '跳过',
			regenerateAndRetry: '重新生成并重试',
			copyParameters: '复制参数',
			copyResult: '复制结果',
			clickToViewParameters: '点击查看参数',
			clickToViewDetails: '点击查看详情',
			rawJson: '原始 JSON',
			formatted: '格式化',
			executing: '执行中...',
			completed: '已完成',
			failed: '失败',
			folders: '文件夹',
			files: '文件',
			emptyDirectory: '(空目录)'
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

		// 规划代理提示词 - 重构版，结构更清晰，去除冗余
		planningPrompt: {
			role: 'Role',
			roleDescription: '你是一个规划 Agent，负责为用户请求生成工具调用计划。',
			rules: 'Rules',
			
			// 第一部分：核心规划要求
			rule1: '[基础] 仅生成工具执行计划 - 不要直接回答',
			rule2: '[结构] 每个步骤需要：tool、input、outputSchema、reason、step_id',
			rule2a: '  • tool: 可用工具列表中的确切工具名称',
			rule2b: '  • input: 符合工具 inputSchema 的 JSON 对象',
			rule2c: '  • outputSchema: 必须完全复制工具定义中的 outputSchema（关键）',
			rule2d: '  • reason: 简要说明为什么需要此步骤',
			
			// 第二部分：输出模式要求（合并自 rule3, rule4, rule6, rule10）
			rule3: '[输出模式] 每个步骤必须有 outputSchema 字段（从工具定义复制）',
			rule3a: '  • 必须是对象：{"type": "object", "properties": {"results": {...}}}',
			rule3b: '  • ❌ 严禁：{"type": "array"} - 数组必须包装在对象中',
			
			// 第三部分：数据引用格式（合并自 rule6）
			rule4: '[数据引用 - 关键] ⚠️ 必须使用格式：{{stepN.fieldName}}',
			rule4a: '  • ✅ 正确：{{step1.results}}、{{step2.content}}',
			rule4b: '  • ❌ 禁止：{{step1.output.results}}、{{step1.output}}（严禁使用 .output 层）',
			rule4c: '  • 💡 始终直接引用字段名，由工具处理数组迭代',
			rule4d: '  • 💡 示例：如果工具返回 {results: [...]}, 使用 {{stepN.results}}',
			
			// 第四部分：文件操作（合并自 rule5, rule7）
			rule5: '[文件操作] 始终使用 "path" 参数（相对于 Vault 根目录）',
			rule5a: '  • 示例："笔记/报告.md"、"项目/计划.md"',
			rule5b: '  • 读取现有文件前先使用 "view" 工具 - 不要假设内容',
			rule5c: '  • ❌ 禁止：使用绝对路径，如 /Users/username/...',
			rule5d: '  • 💡 即使在 Windows 上也请使用正斜杠 (/) 作为路径分隔符',
			
			// 第五部分：网页内容工作流（合并自 rule8, rule8a, rule8b）
			rule6: '[网页工作流 - 强制] ⚠️ 搜索工具后必须立即跟随 fetch_web_content',
			rule6a: '  • ✅ 必须：任何使用搜索工具的步骤（duckduckgo_*、google_*、tavily_*、baidu_*、news、tickers等）',
			rule6b: '  • ✅ 必须：下一步必须是 fetch_web_content 使用搜索结果',
      rule6c: '  • ✅ 正确的 fetch 输入：{"urls": "{{stepN.results}}"} 或 {"urls": "{{stepN}}"}',
      rule6d: '  • ❌ 禁止：直接使用搜索结果进行分析而不经过 fetch_web_content',
      rule6e: '  • 💡 fetch_web_content 工具会自动从结果对象中提取 url/link/href 字段',
      rule6f: '  • 💡 完整流程：search → fetch_web_content(urls={{stepN.results}}) → generate_content',
      rule6g: '  • ❌ 错误：search → create（缺少 fetch 步骤）',
      rule6h: '  • 🚨 关键：如果工具返回了 URL，你必须去抓取它们。仅靠摘要是不够的。',
      rule6i: '  • 🚨 关键：系统不会自动修正缺失的 fetch 步骤，你必须在计划中包含它们！',
      rule6j: '  • 🚨 绝对禁止：search_tool -> generate_content (必须中间插入 fetch_web_content)',
			
			// 第六部分：内容生成模式（合并自 rule8c-f）
			rule7: '[内容生成] 可以使用占位符直接组合文件内容',
			rule7a: '  • ✅ 允许：create_file(file_text="# 报告\n\n## 数据\n{{step1.results}}\n\n## 分析\n{{step2.content}}")',
			rule7b: '  • ✅ 允许：在 file_text 中直接引用和组合多个步骤的输出',
			rule7c: '  • 💡 提示：对于复杂的内容合成，可以选择使用 generate_content 工具',
			rule7d: '  • 💡 generate_content 适用于需要 LLM 分析/总结/转换数据的场景',
			rule7e: '  • 💡 简单的格式化/拼接可以直接在 create_file 中完成',
			rule7f: '  • ⚠️ 记住：始终使用 {{stepN.fieldName}} 格式进行引用',
			
			// 第七部分：日期参数（来自 rule11）
			rule8: '[日期参数] 对于日期/时间参数，始终先使用 get_current_time',
			rule8a: '  • 需要日期的工具：get_stock_historical_data、get_economic_calendar等',
			rule8b: '  • 流程：step1: get_current_time(calculate_dates=true) → step2: 使用 {{step1.current_date}}',
			rule8c: '  • 可用字段：current_date、date_minus_7、date_minus_14、date_minus_30',
			rule8d: '  • 禁止硬编码日期，如 "2024-12-09"',
			rule8e: '  • 💡 对于“昨天”、“上周”等，请基于 current_date 计算',
			rule8e2: '  • 💡 如果工具接受 start_date/end_date，请确保 end_date >= start_date',
			rule8f: '  • 💡 时区由系统自动处理',
			
			// 第八部分：搜索多样性（来自 rule9）
			rule9: '[搜索多样性] 多次搜索时使用不同搜索引擎',
			rule9a: '  • 轮换引擎：duckduckgo → baidu → bing → google → tavily',
			rule9b: '  • 避免重复使用同一引擎',
			
			// 输出格式规范
			outputFormat: '输出格式',
			outputFormatDesc: '仅输出纯JSON（无markdown、无代码块、无说明）',
			planExample: '然后依次执行每个步骤：',
			
			// Obsidian 上下文
			obsidianVaultContext: 'Obsidian Vault 上下文',
			vaultContextDescription: '这是一个 Obsidian 插件环境。当使用文件创建工具时：',
			vaultRule1: '- 必须提供 "path" 参数，指定相对于 Vault 根目录的文件路径',
			vaultRule2: '- 文件路径示例：',
			vaultExample1: '  - "今日天气.md" (Vault 根目录下)',
			vaultExample2: '  - "日记/2024-01-01.md" (在日记文件夹下)',
			vaultExample3: '  - "项目/工作计划.md" (在项目文件夹下)',
			
			// 章节标题
			availableTools: '可用工具',
			userQuestion: '用户问题',
			generatePlanAndExecute: '生成执行计划并开始执行：',
			
			// 最终检查清单
			finalChecklistHeader: '最终检查清单',
			finalChecklist: `提交前验证：
✓ 每个步骤都有 "outputSchema" 字段
✓ 输出是纯 JSON（无 markdown）
✓ 搜索步骤后跟 fetch 步骤
✓ 数据引用使用 {{stepN.fieldName}} (严禁使用 .output)
✓ 文件路径相对于 Vault 根目录
✓ 日期参数使用 get_current_time`,
			
			// 模板占位符
			templateToolName: '<工具名>',
			templateInputContent: '<输入内容>',
			templateStepReason: '<为什么要调用这个工具>',
			templateDependentInput: '{"param": "{{step1.fieldName}}"}',
			templateCallReason: '<调用原因>',
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
		requirement1: '**使用用户问题的语言回复**（中文问题用中文回答，英文问题用英文回答）',
		requirement2: '基于工具执行结果提供准确、有用的回答',
		requirement3: '直接回答用户问题,不需要显示执行过程',
		requirement4: '如果工具结果不足以完全回答问题,请诚实说明',
		requirement5: '回答应该自然、流畅,就像正常对话一样',
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
		generateContent: '生成内容',
		executing: '正在执行',
		defaultGenerateTask: '生成内容',
		contentGenerationSuccess: '内容生成成功',
		pathMissing: '文件路径缺失',
		aiUnavailable: 'AI服务不可用',
		foundResults: '找到 {count} 个执行结果',
		hasWebContent: '包含网页内容',
		noWebContent: '无网页内容',
		promptCompleted: '提示词完成 ({length} 字符)',
		contentProcessed: '内容已处理 ({length} 字符)',
		finalLength: '内容生成完成! 最终长度: {length} 字符',
		validationFailed: '计划参数验证失败，请检查工具调用参数',
		parameterValidationPassed: '{count} 个步骤参数验证通过',
		parameterValidationFailed: '参数验证失败',
		parameterCorrectionTask: '任务：修正工具参数',
		parameterIssuesToFix: '需要修正的参数问题',
		relevantToolRequirements: '相关工具参数要求',
		parameterCorrectionRequirements: '要求',
		parameterCorrectionInstructions: '只需要输出修正后的参数，保持原计划步骤和工具不变。\n**重要：请确保修正结果包含该工具的所有必需参数，但不要修改已经正确的参数。**\n**特别注意：如果原始计划中的 path 参数是正确的文件路径，请不要将其替换为示例值。**',
		parameterCorrectionFormat: '严格按照以下JSON格式输出修正结果：',
		unreplacedStepPlaceholder: '参数包含未替换的步骤占位符: {placeholders}',
		ensurePreviousStepsCompleted: '确保前面的步骤已执行完成并提供了所需的数据，或替换为具体的参数值',
		noExecutionResults: '无执行结果',
		unknownTool: '未知工具',
		executionSuccess: '成功',
		executionFailure: '失败',
		noContent: '无内容',
		contentGenerationTask: '任务: 生成文件内容',
		contentAppendTask: '任务: 为文件 {filePath} 生成追加内容',
		insertTaskDescription: '任务：为文件 {path} 生成插入内容',
		replaceTaskDescription: '任务：为文件 {path} 生成替换内容',
		contentGenerationInstructions: '根据以下信息生成文件的具体内容:',
		contentAppendInstructions: '根据以下信息生成追加到文件的内容:',
		insertInstructions: '根据以下信息，为文件生成要插入的内容：',
		replaceInstructions: '根据以下信息，为文件生成要替换的新内容：',
		generateInsertContent: '现在请直接输出要**插入到文件中**的内容（从第一行正文开始，不要任何说明性前缀）：',
		generateReplaceContent: '现在请直接输出要**替换的新内容**（从第一行正文开始，不要任何说明性前缀）：',
		generateAppendContent: '现在请生成要追加到文件末尾的内容：',
		currentStepPurpose: '当前步骤目的',
		userTaskSection: '用户原始任务',
		noUserTask: '无任务描述',
		fileInformationSection: '文件信息',
		filePath: '文件路径: {path}',
		fileGoal: '目标: {goal}',
		toolType: '工具类型: {tool}',
		defaultGoal: '生成文件内容',
		previousResultsSection: '前序步骤执行结果',
		contextInformationSection: '上下文信息',
		previousStepOutputsSection: '前序步骤输出',
		requirementsSection: '要求',
		taskSection: '任务',
		generateContentInstructions: '请根据以上信息生成内容。直接输出内容即可，不要添加额外的解释或包装。',
		webContentSection: 'Web 内容（如有）',
		noWebContentMessage: '无 Web 内容',
		requirement1: '**使用用户问题的语言生成内容**（中文问题用中文，英文问题用英文）',
		requirement2: '如果有 Web 内容，请完整整理并格式化为 Markdown（保持原文语言或按用户要求翻译）',
		requirement3: '**必须包含原文的所有内容**,不要省略任何重要信息',
		requirement4: '保持内容的结构和章节层次',
		requirement5: '移除不必要的HTML标签和样式信息',
		requirement6: '确保内容易于阅读和理解',
		requirement7: '**不要截断内容**,请提供完整内容',
		requirement8: '直接输出文件内容,不要添加任何解释性文字',
		generateCompleteContent: '请生成文件的**完整内容**:'
	},

	// 状态指示器
	status: {
		waiting: '等待中',
		inProgress: '进行中',
		completed: '已完成',
		failed: '失败',
		stopped: '已停止',
		timeout: '超时',
		// 工具执行状态消息
		fetchingWebContent: '正在获取 {count} 个网页内容...',
		fetchingWebContentGeneric: '正在获取网页内容...',
		andMore: '... 及其他 {count} 个',
		source: '来源: {source}',
		generatingContent: '正在生成内容...',
		task: '任务: {task}',
		dataPlaceholder: '[数据]',
		searching: '正在搜索...',
		searchQuery: '搜索: {query}',
		searchingFiles: '正在搜索文件...',
		readingFile: '正在读取文件...',
		executing: '正在执行...',
		waitingForPreviousStep: '等待上一步骤完成...',
		stepOutput: '第 {step} 步的输出',
		stepOutputPath: '第 {step} 步的输出: {path}'
	},

	// 任务状态
	taskStatus: {
		completed: '成功',
		failed: '失败',
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
	},

	// 计划验证消息
	validation: {
		autoFixedTitle: '计划已自动修复',
		failedTitle: '计划验证失败',
		autoFixedChanges: '自动修复的问题:',
		errors: '错误',
		warnings: '警告',
		regenerate: '重新生成计划',
		regeneratePlan: '重新生成计划',
		actionRequired: '需要操作',
		regenerateHint: '由于计划验证失败，请重新生成计划。错误信息将自动发送给 AI 以改进计划。',
		ignoreAndContinue: '忽略警告继续',
		cancel: '取消'
	}
}
};
