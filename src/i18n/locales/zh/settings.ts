/**
 * Settings page translations
 */
import { ZH_CATEGORY_TRANSLATIONS } from '../../category-translations';

export const zhSettings = {settingsPage: {
		title: 'LLMSider 设置',
		llmProviders: 'LLM 提供商',
		addNewProvider: '添加新提供商',
		configuredProviders: '已配置的提供商',
		advancedSettings: '高级设置',
		autocompletionSettings: '自动补全设置',
		language: '语言',
		languageDesc: '选择界面语言',
		maxChatHistory: '最大聊天历史',
		maxChatHistoryDesc: '保留的最大聊天会话数量',

		// 章节标题
		connectionsAndModels: '连接与模型',
		addNewConnection: '添加新连接',
		configuredConnectionsAndModels: '已配置的连接和模型',
		uiSettings: '界面设置',
		defaultConversationMode: '默认对话模式',
		defaultConversationModeDesc: '选择开始新对话时的默认对话模式',
		builtInTools: '内置工具',
		mcpSettings: 'MCP（模型上下文协议）设置',

		// 提供商详情
		modelLabel: '模型',
		apiKeyLabel: 'API密钥',
		baseUrlLabel: '基础URL',
		regionLabel: '区域',
		maxTokensLabel: '最大令牌数',
		temperatureLabel: '温度',
		displayNameLabel: '显示名称',
		apiKeyConfigured: '••••••••',
		apiKeyNotSet: '未设置',
		checkmark: '✓',

		// 提供商卡片
		defaultBadge: '默认',
		details: '详情',
		viewDetails: '查看详情',

		// 提供商操作
		editProvider: '编辑提供商设置',
		copyProvider: '复制提供商配置',
		deleteProvider: '删除提供商',
		saveChanges: '保存更改',
		closeButton: '×',

	// 提供商类型
	openaiProvider: 'OpenAI',
	anthropicProvider: 'Anthropic',
	qwenProvider: 'Qwen',
	compatibleProvider: '兼容模式',
	azureOpenaiProvider: 'Azure OpenAI',
	ollamaProvider: 'Ollama',
	geminiProvider: 'Gemini',
	groqProvider: 'Groq',

	// 提供商特定标签
	deploymentNameLabel: '部署名称',
	apiVersionLabel: 'API版本',

	// GitHub Copilot 认证
	githubCopilotAuth: {
		title: '🔒 GitHub Copilot 认证',
		description: 'GitHub Copilot 需要 GitHub 身份认证。点击下方按钮开始 OAuth 授权流程。',
		alreadyAuthenticated: '✅ 已通过 GitHub 认证',
		authenticateButton: '使用 GitHub 认证',
		reauthenticateButton: '重新认证',
		authenticatingButton: '正在认证...',
		pleaseVisit: '请访问',
		andEnterCode: '并输入代码：',
		copyCodeButton: '复制代码',
		codeCopied: '✓ 已复制！',
		successfullyAuthenticated: '✅ 成功认证为',
		authenticationFailed: '认证失败',
		pleaseAuthenticateFirst: '请先通过 GitHub 认证',
		retryAuthentication: '重试认证'
	},		// 空状态
		noProvidersConfigured: '尚未配置提供商。请使用上方按钮添加您的第一个提供商。',
		noBuiltInTools: '没有可用的内置工具',
		noMCPServersConfigured: '尚未配置MCP服务器。请使用下方的JSON编辑器添加服务器。',

		// 复选框与开关
		enabled: '已启用',
		supportsVision: '支持视觉',
		supportsVisionTooltip: '如果模型支持图片理解（视觉能力），请开启此项',
	enableTool: '启用工具',
	requireConfirmation: '调用确认',
	toolWillRequireConfirmation: '调用此工具时将显示确认对话框',
	toolEnabled: '已启用',
	toolDisabled: '已禁用',
	toolEnabledTooltip: '工具已启用，可以使用',
	toolDisabledTooltip: '工具已禁用，不可使用',
	confirmationRequired: '需确认',
	autoExecute: '自动执行',
	confirmationRequiredTooltip: '执行此工具前显示确认对话框',
	autoExecuteTooltip: '自动执行此工具，无需确认',		// MCP相关
		mcpManagerNotInitialized: '⚠️ MCP管理器未初始化',
		noServersConnected: '🔴 没有服务器连接',
		connectedMCPTools: '已连接的MCP工具',
		configuredMCPServers: '已配置的MCP服务器',
	viewInputSchema: '查看输入模式',
	mcpDescription: '管理你的模型上下文协议服务器连接',
	saveConfiguration: '保存配置',
	validateJSON: '验证 JSON',
	deleteMCPServer: '删除服务器',
		deleteMCPServerTitle: '删除 MCP 服务器',
		deleteMCPServerConfirm: '确定要删除 "{serverId}" 吗？',
		deleteMCPServerWarning: '这将删除服务器配置。如果服务器当前已连接，将先断开连接。',
		deleteMCPServerCancelBtn: '取消',
		deleteMCPServerDeleteBtn: '删除',
	autoStart: '自动启动',
	manualStart: '手动启动',
	showTools: '显示工具',
	connect: '连接',
	disconnect: '断开连接',
	autoConnect: '自动连接',
	manualConnect: '不自动连接',
	autoConnectOnStartup: '启动时自动连接',
	mcpAutoConnectChanged: '服务器 "{serverId}" 将在启动时{status}',
	autoConnectEnabled: '自动连接',
	autoConnectDisabled: '不自动连接',	// 模型管理
		models: '模型',
		addModel: '添加模型',
		addModelButton: '添加模型',
		editModel: '编辑 {connectionName} 的模型',
		addModelToConnection: '向 {connectionName} 添加模型',
		toolsAvailable: '个可用工具',
		toolCount: '工具',
		
		// 模型对话框
		modelNameLabel: '模型：',
		customModelName: '自定义模型名称：',
		customModelOption: '自定义（手动输入）',
		selectModelHint: '选择一个模型或选择"自定义"手动输入任何模型名称。',
		searchModelHint: '输入以搜索模型或输入自定义模型名称',
		searchOrSelectModel: '搜索或输入模型名称...',
		noModelsFound: '未找到模型',
		useCustomModel: '使用自定义模型',
		noModelsAvailable: 'API 未返回模型。请手动输入。',
		loadingModels: '正在加载可用模型...',
		loadingModelDetails: '正在加载模型详情...',
		modelDetails: '模型详情',
		modelName: '模型名称',
		organization: '组织',
		description: '描述',
		createTime: '创建时间',
		updateTime: '更新时间',
		modelType: '模型类型',
		taskType: '任务类型',
		supportedLanguages: '支持语言',
		contextLength: '上下文长度',
		pricing: '价格',
		outputModalities: '输出模式',
		imageGenerationSupported: '此模型支持图像生成！',
		maxInputLength: '最大输入长度',
		maxOutputLength: '最大输出长度',
		supportsFunctionCall: '支持函数调用',
		yes: '是',
		no: '否',
		noDetailsAvailable: '模型详情不可用',
		failedToLoadDetails: '加载模型详情失败',
		modelNamePlaceholder: '例如：qwen3-max',
		displayNamePlaceholder: '例如：通义千问3-Max用于研究',
		embeddingModelLabel: 'Embedding 模型：',
		embeddingModelTooltip: '仅对兼容 OpenAI Embedding API 的模型启用',
		embeddingModelWarning: '⚠️ 仅对具有 OpenAI 兼容 embedding API 的模型启用（例如 text-embedding-3-small、text-embedding-v3）',
		embeddingModelDesc: '如果这是一个 embedding 模型则启用（例如 text-embedding-3-small）',
		embeddingDimensionLabel: 'Embedding 维度：',
		embeddingDimensionDesc: 'Embedding 向量的维度（必须是正整数）',
		embeddingDimensionPlaceholder: '例如：1536',
		embeddingDimensionRequired: 'Embedding 模型必须填写维度',
		embeddingDimensionInvalid: 'Embedding 维度必须是正整数',
		setAsDefaultLabel: '设为默认：',
		modelNameRequired: '请选择或输入模型名称',
		displayNameRequired: '显示名称是必需的',
		modelNameRequiredInput: '模型名称是必需的',
		modelSavedSuccess: '模型 {name} 保存成功',
		modelSaveFailed: '保存模型失败',

	// 内置工具分类 - 从中心化定义自动生成
categories: ZH_CATEGORY_TRANSLATIONS,	// 快聊设置
	quickChat: '快聊',

	// 上下文设置
	contextSettings: '上下文设置',

	// 其他设置
	otherSettings: '其他设置',
	updateNotifications: '更新提醒',
	updateNotificationsDesc: '发现新版本时提醒（通过 BRAT 升级）',
	checkForUpdates: '检查更新',
	checkingForUpdates: '正在检查更新...',
	updateAvailable: '发现新版本：v{version}',
	noUpdateAvailable: '当前已是最新版本 (v{version})',
	updateCheckFailed: '检查更新失败',
		autoExecuteDesc: '调用时自动执行此工具，无需确认',
		maxBuiltInToolsSelection: '最大内置工具数',
		maxBuiltInToolsSelectionDesc: '可启用的内置工具最大数量（默认：64）。警告：启用超过64个工具可能会导致AI响应变慢、Token消耗增加，并可能诱发AI幻觉。',
		maxMCPToolsSelection: '最大MCP工具数',
		maxMCPToolsSelectionDesc: '可启用的MCP工具最大数量（默认：64）。警告：启用超过64个工具可能会导致AI响应变慢、Token消耗增加，并可能诱发AI幻觉。',
		planExecutionMode: '计划执行模式',
		planExecutionModeDesc: '选择Agent模式下的计划执行方式。顺序模式按步骤依次执行,简单直观。DAG模式使用静态计划并行执行独立步骤,速度更快。',
		planExecutionModeSequential: '顺序执行 - 逐步进行',
		planExecutionModeDAG: 'DAG执行 - 静态并行',
		planExecutionModeChanged: '计划执行模式已更改为:{mode}',
		
		// 实验性功能
		experimentalFeatures: '实验性功能',

		// 网络搜索设置
		webSearchSettings: '网络搜索设置',
		webSearchSettingsDesc: '配置网络搜索工具的搜索后端和API凭据',
		searchBackend: '搜索后端',
		searchBackendDesc: '选择要使用的搜索服务。',
		googleBackend: 'Google自定义搜索',
		serpapiBackend: 'SerpAPI',
		tavilyBackend: 'Tavily AI搜索',
		googleApiKey: 'Google API密钥',
		googleApiKeyDesc: 'Google自定义搜索的API密钥。从Google Cloud Console获取。',
		googleApiKeyPlaceholder: '输入您的 Google API 密钥',
		googleSearchEngineId: '搜索引擎ID',
		googleSearchEngineIdDesc: 'Google可编程搜索引擎的自定义搜索引擎ID。',
		googleSearchEngineIdPlaceholder: '输入您的搜索引擎 ID',
		serpapiKey: 'SerpAPI密钥',
		serpapiKeyDesc: 'SerpAPI的API密钥。从serpapi.com获取。',
		serpapiKeyPlaceholder: '输入您的 SerpAPI 密钥',
		tavilyApiKey: 'Tavily API密钥',
		tavilyApiKeyDesc: 'Tavily AI搜索的API密钥。从tavily.com获取（含免费额度）。',
		tavilyApiKeyPlaceholder: '输入您的 Tavily API 密钥',

		// Memory 系统设置
		memory: {
			title: 'Memory 系统',
			description: 'AI 记忆管理设置，提供工作记忆、对话历史和语义召回功能',
			
			// Working Memory
			enableWorkingMemory: '启用工作记忆',
			enableWorkingMemoryDesc: '存储用户个人信息和偏好，跨对话持久化',
			workingMemoryScope: '工作记忆范围',
			workingMemoryScopeDesc: '选择记忆的存储范围',
			scopeResource: '资源级别（全局）',
			scopeThread: '线程级别（单会话）',
			
			// Conversation History
			enableConversationHistory: '启用对话历史',
			enableConversationHistoryDesc: '保存最近的对话内容，提供上下文连续性',
			conversationHistoryLimit: '对话历史条数',
			conversationHistoryLimitDesc: '保留的最大对话消息数量（默认：10）',
			
			// Conversation Compaction
			enableCompaction: '启用对话压缩',
			enableCompactionDesc: '当对话历史过长时，使用智能摘要自动压缩对话，减少 Token 使用',
			compactionThreshold: '压缩触发阈值（Token 数）',
			compactionThresholdDesc: '当对话超过此 Token 数时触发压缩（默认：65536）',
			compactionTarget: '压缩目标 Token 数',
			compactionTargetDesc: '压缩后的对话约保持此 Token 数（默认：4000）',
			compactionPreserveCount: '保留最近消息数',
			compactionPreserveCountDesc: '压缩时保留最近的多少条消息不压缩（默认：4）',
			compactionModel: '压缩模型',
			compactionModelDesc: '用于生成对话摘要的模型（留空则使用第一个可用模型）',
			selectCompactionModel: '使用第一个可用模型',
			requiresModel: '对话压缩需要至少配置一个模型。',
			
			// Semantic Recall

			
			// Embedding Model
			embeddingModel: 'Embedding 模型',
			embeddingModelDesc: '用于语义召回的 Embedding 模型',
			selectEmbeddingModel: '请选择 Embedding 模型',

			
			// Status messages
			settingsSaved: 'Memory 设置已保存',
			settingsSaveFailed: '保存 Memory 设置失败：{error}',
			requiresVectorDB: '语义召回需要向量数据库支持。请先启用搜索增强功能。',
			requiresEmbeddingModel: '语义召回需要配置 Embedding 模型。'
		},

		// 向量数据库设置
		vectorDatabase: {
			title: '搜索增强',
			titleWithStats: '搜索增强（{files}篇笔记，{chunks}个向量，{size}）',
			sectionTitle: '搜索增强设置',
			description: '配置使用 Orama 向量数据库的本地语义搜索。这将启用基于 AI 的笔记库上下文检索功能。',
			
			// 启用/禁用
			enableSemanticSearch: '开启增强搜索',
			enableSemanticSearchDesc: '开启后将对笔记进行后台 Embedding 化，支持语义搜索和相似笔记功能',
			
			// 相似笔记
			showSimilarNotes: '显示相似笔记',
			showSimilarNotesDesc: '基于语义相似度在笔记底部显示相关文档',
			similarNotesHideByDefault: '默认隐藏相似笔记',
			similarNotesHideByDefaultDesc: '默认隐藏相似笔记，仅在鼠标悬停时显示。这样可以保持笔记界面整洁，同时保持快速访问。',
			
			// 统计信息显示
			statsFiles: '文件',
			statsChunks: '块',
			statsFormat: '{files} {filesLabel} · {chunks} {chunksLabel} · {size}',
			statsLoading: '加载中...',
			
			// Embedding 模型（仅远程 API）
			embeddingModel: 'Embedding 模型',
			embeddingModelDesc: '选择用于生成向量嵌入的模型（仅支持远程 API）',
			selectModel: '选择模型...',

			// 更新消息
			updateSuccess: '索引已更新',
			
			// 分块策略
			chunkingStrategy: '分块策略',
			chunkingStrategyDesc: '选择如何将文档分割为索引块',
			strategyCharacter: '字符分块（固定大小）',
			strategySemantic: '语义分块（结构感知）',
			
			// 字符策略参数
			chunkSize: '分块大小',
			chunkSizeDesc: '每个块的字符数（默认：1000，范围：100-5000）',
			chunkOverlap: '分块重叠',
			chunkOverlapDesc: '相邻块之间重叠的字符数（默认：100，必须小于分块大小）',
			
			// 分块策略说明
			chunkingStrategyInfo: '语义分块：根据文档结构（标题、段落）自动分割，保持语义连贯性，无需额外配置，适合结构化文档。\n字符分块：按固定字符数切分，需手动配置大小和重叠，适合对分块粒度有精确要求的场景。',
			semanticInfo: '语义分块会根据文档结构（标题、段落）自动分割，保持内容的语义连贯性。无需配置分块大小和重叠。',
			characterInfo: '字符分块按固定字符数切分文档。需要手动配置分块大小和重叠字符数，适合对分块粒度有精确要求的场景。',
			
			// 搜索结果
			searchResults: '搜索结果数',
			searchResultsDesc: '搜索时返回的相似块数量（默认：5）',
			contextExcerptLength: '上下文摘录长度',
			contextExcerptLengthDesc: '发送给大模型的每个上下文摘录的最大字符长度。较短的摘录可以减少 token 使用，同时保持相关性。设置为 0 则发送完整块内容。（默认：500）',
			
			// 相关文件建议
			suggestRelatedFiles: '建议相关文件',
			suggestRelatedFilesDesc: '添加文件到上下文时，基于语义相似度自动建议其他相关文件。建议的文件将以灰色显示，5秒内可点击确认添加。',
			suggestionTimeout: '建议超时时间',
			suggestionTimeoutDesc: '建议文件自动消失前的等待时间（毫秒，默认：5000）',
			
			// 存储
			storagePath: '存储路径',
			storagePathDesc: '向量数据库文件的存储路径（相对于笔记库根目录）',
			indexName: '索引名称',
			indexNameDesc: '向量索引的名称',
			
			// 操作
			syncIndex: '同步索引',
			rebuildIndex: '重建索引',
			updateIndex: '更新索引（差异）',
			updateIndexDesc: '扫描笔记库变化，仅更新修改过的文件（差异同步）',
			rebuildIndexFull: '重建索引（完整）',
			rebuildIndexFullDesc: '清空并从头完整重建索引（完整重建）',
			showStatus: '显示状态',
			syncing: '同步中...',
			rebuilding: '重建中...',
			pauseIndexing: '暂停',
			resumeIndexing: '继续',
			indexingPaused: '索引已暂停',
			indexingResumed: '索引已恢复',
			
			// 向量化进度状态
			scanning: '扫描中...',
			processingFile: '处理文件 {current}/{total}',
			indexingChunk: '索引块 {current}/{total}',
			indexingProgress: '{percentage}% ({status})',
			finalizing: '100% (完成)',
			preparing: '准备中...',
			
			// 状态消息
			syncSuccess: '向量索引同步成功',
			rebuildSuccess: '向量索引重建成功',
			rebuildFullSuccess: '完整重建完成',
			notInitialized: '向量数据库未初始化',
			syncFailed: '索引同步失败',
			rebuildFailed: '索引重建失败',
			rebuildFailedWithError: '向量索引重建失败：{error}。这可能导致搜索结果不完整。请检查你的 Embedding 模型设置并重试。',
			embeddingGenerationFailed: '生成 Embedding 失败。请验证你的 Embedding 模型配置正确且 API 可访问。',
			statusFailed: '获取状态失败',
			disabledInSettings: '向量数据库已禁用。请先在设置中启用它。',
			initializing: '正在初始化向量数据库...',
			initFailed: '向量数据库初始化失败',
			reinitializing: '正在使用新模型重新初始化...',
			reinitializeSuccess: '向量数据库重新初始化成功',
			reinitializeFailed: '重新初始化失败',
			rebuildReminder: '记得在使用向量搜索功能前重建索引。',
			
			// 模型更改确认
			modelChangeTitle: 'Embedding 模型已更改',
			modelChangeWarning: '更改 Embedding 模型需要重建向量索引。如果现在不重建，增强搜索等基于向量的功能可能会因维度不匹配而无法正常工作。',
			modelChangeQuestion: '是否现在就重建索引?',
			rebuildNow: '立即重建',
			rebuildLater: '稍后',
			
			// 状态显示
			statusTitle: '索引状态：',
			totalChunks: '• 总块数：{count}',
			totalFiles: '• 总文件数：{count}',
			lastSync: '• 上次同步：{time}',
			neverSynced: '从未',
			indexing: '• 正在索引：{status}',
			indexingYes: '是',
			indexingNo: '否',
			error: '• 错误：{error}'
		},

		// 工具管理
		toolManagement: {
			title: '工具权限管理',
			description: '控制哪些工具可以被AI执行。被禁用的工具将不可用。',
			builtInToolsTitle: '内置工具',
			builtInToolsDescription: 'LLMSider插件提供的内置工具，这些工具始终可用。',
			mcpToolsTitle: '已连接的MCP工具',
			mcpToolsDescription: '由模型上下文协议服务器提供的工具。连接到MCP服务器以查看可用工具。',
			noMCPTools: '没有可用的MCP工具。请连接到MCP服务器以查看可用工具。',
			
			// 状态文本
			enabled: '已启用',
			disabled: '已禁用',
			
			// 分类切换提示
			builtInToolsInCategoryToggled: '{category} 分类{status}',

			// 全局批量操作
			enableAllTools: '启用所有工具',
			enableAllToolsDesc: '启用所有内置和MCP工具',
			disableAllTools: '禁用所有工具',
			disableAllToolsDesc: '禁用所有内置和MCP工具',
			resetAllPermissions: '重置所有权限',
			resetAllPermissionsDesc: '将所有工具权限重置为默认状态',
			exportPermissions: '导出权限',
			exportPermissionsDesc: '将当前工具权限导出到文件',
			importPermissions: '导入权限',
			importPermissionsDesc: '从文件导入工具权限',

			// 内置工具批量操作
			enableAllBuiltIn: '启用所有内置工具',
			enableAllBuiltInDesc: '启用所有内置工具',
			disableAllBuiltIn: '禁用所有内置工具',
			disableAllBuiltInDesc: '禁用所有内置工具',
			resetBuiltIn: '重置内置工具',
			resetBuiltInDesc: '将内置工具权限重置为默认状态',
			
			// 批量操作成功提示
			allBuiltInToolsEnabled: '所有内置工具已启用',
			allBuiltInToolsDisabled: '所有内置工具已禁用',
			builtInToolPermissionsReset: '内置工具权限已重置为默认状态',

			// MCP工具批量操作
			enableAllMCP: '启用所有MCP工具',
			enableAllMCPDesc: '启用所有MCP工具',
			disableAllMCP: '禁用所有MCP工具',
			disableAllMCPDesc: '禁用所有MCP工具',
			resetMCP: '重置MCP工具',
			resetMCPDesc: '将MCP工具权限重置为默认状态',
			
			// 工具选择限制
			builtInToolsLimitReached: '无法启用更多工具。已达到 {limit} 个内置工具的最大限制。',
			mcpToolsLimitReached: '无法启用更多工具。已达到 {limit} 个MCP工具的最大限制。',
			builtInToolsCategoryLimitExceeded: '无法启用 {category} 分类中的所有工具。当前：{current}，将添加：{additional}，限制：{limit}。',
			mcpToolsLimitExceeded: '无法启用所有MCP工具。总计：{total}，限制：{limit}。',
			toolLimitWarning: '启用超过64个工具可能会导致AI响应变慢、Token消耗增加，并可能诱发AI幻觉。'
		},
		
		// MCP设置操作
		allMCPServersEnabled: '所有MCP服务器已启用',
		allMCPServersDisabled: '所有MCP服务器已禁用',
		
		// Prompt Management
		promptManagement: {
			title: 'Prompt 管理',
			description: '管理你的内置和自定义 Prompt 模板',
			searchPlaceholder: '搜索 Prompt...',
			addPrompt: '添加 Prompt',
			builtInPrompts: '内置 Prompt',
			customPrompts: '自定义 Prompt',
			builtInBadge: '内置',
			noPromptsLoaded: '没有加载的 Prompt',
			noPromptsFound: '未找到匹配的 Prompt',
			
			// Actions
			duplicatePrompt: '复制 Prompt',
			editPrompt: '编辑 Prompt',
			deletePrompt: '删除 Prompt',
			
			// Modal
			createPromptTitle: '创建新 Prompt',
			editPromptTitle: '编辑 Prompt',
			promptName: 'Prompt 名称',
			promptNameDesc: 'Prompt 的简短描述性名称',
			promptNamePlaceholder: '例如：总结会议记录',
			promptDescription: '描述',
			promptDescriptionDesc: '可选的 Prompt 功能描述',
			promptDescriptionPlaceholder: '例如：创建包含行动项的会议记录结构化摘要',
			promptContent: 'Prompt 内容',
			promptContentDesc: 'Prompt 模板。使用 {} 作为用户输入的占位符。',
			promptContentPlaceholder: '例如：总结以下会议记录："{}"',
			promptContentInfo: '提示：在需要插入选中文本或用户输入的位置使用 {}',

			// Buttons
			cancel: '取消',
			confirm: '确认',
			saveChanges: '保存更改',
			createPrompt: '创建',

			// Messages
			promptDuplicated: 'Prompt 已复制：{name}',
			promptDeleted: 'Prompt 已删除：{name}',
			confirmDelete: '确定要删除 "{name}" 吗？此操作无法撤销。',

			// Errors
			errorEmptyTitle: 'Prompt 名称不能为空',
			errorEmptyContent: 'Prompt 内容不能为空',
			errorNoManager: 'Prompt 管理器不可用',
			errorSaving: '保存 Prompt 失败，请重试。'
		}
	},
	
	// 通知消息
	notifications: {
		// 向量数据库
	vectorDatabase: {
		loaded: '向量数据库已加载',
		initFailed: '向量数据库初始化失败。请查看控制台了解详情。',
		notInitialized: '向量数据库未初始化。请先在设置中启用它。',
		updatingIndex: '正在更新索引（扫描变化）...',
		updateFailed: '索引更新失败。请查看控制台了解详情。',
		rebuildingIndex: '正在从头重建整个索引...',
		rebuildFailed: '完整重建失败。请查看控制台了解详情。',
		rebuildComplete: '完整重建完成：已索引 {chunks} 个块（{duration}秒）',
		rebuildCompleteWithStats: '✅ 重建完成！{files} 个文件，{chunks} 个块已索引。大小：{size}。耗时：{duration}秒',
		indexingPaused: '索引已暂停',
		indexingResumed: '索引已恢复',
		// 索引进度状态
		clearingDatabase: '正在清空数据库...',
		findingDeletedChunks: '正在查找已删除的块...',
		applyingChanges: '正在应用更改到数据库...',
		indexingChunks: '正在索引块...',
		generatingEmbeddings: '正在生成向量（批次 {current}/{total}）',
		savingMetadata: '正在保存元数据...',
		savingDatabase: '正在保存数据库...',
		// 验证消息
		chunkSizeMin: '块大小至少为 {min}',
		chunkSizeMax: '块大小不能超过 {max}',
		chunkOverlapAdjusted: '块重叠已调整为 {overlap}（必须小于块大小）',
		chunkOverlapMin: '块重叠至少为 {min}',
		chunkOverlapMax: '块重叠不能超过 {max}',
		chunkOverlapLimit: '块重叠必须小于块大小（{chunkSize}）'
	},
		// 插件相关
		plugin: {
			reloading: '🔧 正在重载插件...',
			reloadSuccess: '✅ 插件重载成功！',
			reloadFailed: '❌ 插件重载失败：{error}',
			loadFailed: '加载 LLMSider 插件失败。请查看控制台了解详情。',
			updateAvailable: '发现新版本 v{version}，请打开 BRAT 插件点击升级。'
		},
		// 聊天相关
		chat: {
			openFirst: '请先打开 LLMSider 聊天窗口',
			contextManagerNotAvailable: '上下文管理器不可用',
			addContextFailed: '添加选中文本到上下文失败',
			openFailed: '打开聊天视图失败。请尝试使用侧边栏图标或命令面板。',
			createFailed: '无法创建聊天视图。请尝试使用侧边栏图标。',
			activationFailed: '聊天视图激活失败。请查看控制台了解详情。'
		},
		// 设置相关
		settings: {
			connectionNotFound: '未找到连接',
			allToolsEnabled: '所有工具已启用',
			allToolsDisabled: '所有工具已禁用',
			toolPermissionsReset: '工具权限已重置为默认值',
			allToolPermissionsReset: '所有工具权限已重置为默认值',
			toolPermissionsExported: '工具权限导出成功',
			exportPermissionsFailed: '导出权限失败：{error}',
			importPermissionsFailed: '导入权限失败：{error}'
		},
		// MCP相关
		mcp: {
			managerNotAvailable: 'MCP 管理器不可用',
			noHealthInfo: '没有可用的健康信息',
			configPlaceholder: '输入 JSON 格式的 MCP 配置...',
			configSaved: 'MCP 配置保存成功',
			connecting: '正在连接到 {serverId}...',
			disconnecting: '正在断开 {serverId}...',
			connected: '✓ 已连接到 {serverId}',
			disconnected: '✓ 已断开 {serverId}',
			connectionFailed: '连接服务器失败：{error}',
			autoConnectUpdateFailed: '更新自动连接失败：{error}',
			configImported: 'MCP 配置导入成功',
			configExported: 'MCP 配置导出成功',
			connectingAll: '正在连接所有 MCP 服务器...',
			disconnectedAll: '已断开所有 MCP 服务器',
			validJsonConfig: '✓ 有效的 JSON 配置，包含 {count} 个服务器',
			invalidJsonSyntax: '❌ 无效的 JSON 语法：{error}',
			invalidJson: '无效的 JSON：{error}',
			configurationError: '❌ 配置错误：{error}',
			importFailed: '导入配置失败：{error}',
			exportFailed: '导出配置失败：{error}',
			serverDeleted: 'MCP 服务器 "{serverId}" 已删除',
			deleteFailed: '删除服务器 "{serverId}" 失败：{error}',
			managerNotInitialized: 'MCP 管理器未初始化',
			connectedToServers: '已连接到 {count} 个 MCP 服务器',
			connectionFailedCheck: '部分 MCP 服务器连接失败。请查看控制台了解详情。',
			disconnectAllSuccess: '已断开所有 MCP 服务器',
			disconnectError: '断开 MCP 服务器时出错。请查看控制台了解详情。',
			noToolsAvailable: '没有可用的 MCP 工具。请确保服务器已连接。',
			listToolsFailed: '获取 MCP 工具列表失败。请查看控制台了解详情。',
			serverError: 'MCP 服务器 "{serverId}" 错误：{error}'
		},
		// 提供商相关
		provider: {
			modeSwitchingReplaced: '模式切换已被设置中的 Agent 模式切换取代',
			notAvailable: '提供商 {displayName} 不可用',
			switchedTo: '已切换到 {displayName} 提供商',

		},
		// 上下文相关
		context: {
			addedToContext: '已添加选中文本到上下文：{preview}',
			filesTooLarge: '上下文文件过大，已截断以适应 token 限制。',
			noTextSelected: '未选择文本。请先选择一些文本，然后重试。',
			noActiveNote: '未找到活动笔记。请确保笔记已打开并处于活动状态。',
			noTextProvided: '未提供要添加到上下文的文本',
			noActiveTab: '未找到活动标签页。请先打开一个 epub 书籍。',
			noEpubFound: '在活动标签页中未找到打开的 epub 书籍。请先打开一个 epub 书籍。',
			epubPageEmpty: 'epub 页面似乎是空的。',
			epubExtractFailed: '从 epub 页面提取内容失败'
		},
		// 文件操作
		file: {
			noActiveFile: '没有活动文件',
			fileAlreadyExists: '文件已存在',
			noteTitleUpdated: '笔记标题已更新为：{title}',
			failedToUpdateTitle: '更新笔记标题失败'
		},
		// 会话相关
		session: {
			noChatHistory: '没有可用的聊天历史',
			sessionLoaded: '已加载聊天会话：{name}'
		},
	// Diff处理器相关
	diff: {
		noActiveNote: '未找到活动笔记以应用更改。',
		appliedImprovements: '已对 "{filename}" 应用改进',
		applyFailed: '应用更改失败：{error}',
		copiedToClipboard: '内容已复制到剪贴板',
		copyFailed: '复制到剪贴板失败',
		contentTooShort: '内容太短，无法生成笔记',
		noAIProvider: '没有可用的 AI 提供商',
		generatingTitle: '正在生成笔记标题...'
	},
	// UI相关
	ui: {
		onlyUserMessagesEditable: '只能编辑用户消息',
		noTextContentToEdit: '没有可编辑的文本内容',
		noActiveSession: '没有活动会话',
		messageNotFound: '消息未找到',
		failedToEditMessage: '编辑消息失败',
		errorProcessingDroppedItem: '处理拖放项目时出错：{error}',
		unableToProcessDroppedItem: '无法处理拖放项目',
		failedToAddText: '添加文本失败：{error}',
		externalFoldersNotSupported: '不支持外部文件夹',
		unsupportedFileType: '不支持的文件类型：{ext}',
		failedToReadFile: '读取文件失败',
		imageCopiedToVault: '图片已复制到库：{path}',
		failedToCopyImage: '复制图片到库失败',
		failedToAddFile: '添加文件失败：{error}',
		addedFile: '已添加文件：{name}',
		processingDirectory: '正在处理目录 "{name}"...',
		errorProcessingDirectory: '处理目录时出错：{error}',
		failedToProcessDirectory: '处理目录失败：{error}',
		noDirectorySelected: '未选择目录',
		tokenLimitExceeded: '已超过 token 限制。正在截断对话历史以适应限制。',
		approachingTokenLimit: '接近 token 限制。如果遇到问题，请考虑开始新聊天。',
		pleaseOpenChatFirst: '请先打开 LLMSider 聊天',
		contextManagerNotAvailable: '上下文管理器不可用',
		errorAddingTextToContext: '添加文本到上下文时出错',
		selectedTextAddedToContext: '选中文本已添加到聊天上下文',
		quickChatNotInitialized: '快速聊天未初始化',
		editorNotReady: '编辑器未就绪',
		errorOpeningQuickChat: '打开快速聊天时出错'
	},
	// 工具相关
	tools: {
		textReplaced: '已在 {file} 中替换文本（{count} 处匹配{plural}）',
		fileCreatedNew: '已创建文件：{file}',
		fileOverridden: '已覆盖文件：{file}',
		contentInserted: '已在 {file} 中插入内容',
		sedApplied: '已对 {file} 应用 sed（{count} 行已更改）',
		contentAppended: '已向 {file} 追加内容',
		lineBeyondLength: '第 {line} 行超出文件长度（{count} 行）',
		fileAlreadyExists: '文件已存在，正在创建：{path}',
		templateNotFound: '未找到模板文件：{template}，仅使用提供的内容',
		autoOpeningFile: '未找到活动编辑器。自动打开最近文件：{file}',
		undoSuccessful: '在 {file} 中撤销成功',
		redoSuccessful: '在 {file} 中重做成功',
		noteMoved: '已将 "{file}" 移动到 "{folder}"',
		notesMoved: '已将 {count} 个笔记移动到 "{folder}"',
		noteRenamed: '已重命名为 "{name}"',
		notePermanentlyDeleted: '已永久删除 "{file}"',
		noteMovedToTrash: '已将 "{file}" 移至回收站',
		notesMerged: '已将 "{source}" 合并到 "{target}"',
		notesMergedAndDeleted: '已将 "{source}" 合并到 "{target}" 并删除源文件',
		noteCopied: '已复制到 "{file}"',
		noteDuplicated: '已创建副本："{name}"'
	},
	// 设置处理器相关
	settingsHandlers: {
		testFailed: '测试失败：{error}',
		noToolsAvailable: '{server} 没有可用工具',
		failedToGetTools: '获取工具失败：{error}',
		failedToDisconnect: '断开服务器连接失败：{error}',
		connectionDeleted: '连接 "{name}" 已删除',
		modelDeleted: '模型 "{name}" 已删除',
		autoConnectEnabled: '{server} 已启用自动连接',
		autoConnectDisabled: '{server} 已禁用自动连接',
		serverEnabled: '服务器 {server} 已启用',
		serverDisabled: '服务器 {server} 已禁用',
		invalidVectorDimension: '向量维度无效。使用默认值：{dimension}',
		invalidMaxResults: '最大结果数无效。使用默认值：{count}',
		invalidMinSimilarity: '最小相似度无效。使用默认值：{value}',
		invalidChunkSize: '块大小无效。使用默认值：{size}',
		invalidChunkOverlap: '块重叠无效。使用默认值：{overlap}',
		chunkSizeMin: '块大小必须至少为 {min}',
		chunkSizeMax: '块大小不能超过 {max}',
		chunkOverlapAdjusted: '块重叠已调整为 {overlap}（必须小于块大小）',
		chunkOverlapMin: '块重叠必须至少为 {min}',
		chunkOverlapMax: '块重叠不能超过 {max}',
		chunkOverlapLimit: '块重叠必须小于块大小（{size}）',
		noMCPToolsAvailable: '没有可用的 MCP 工具',
		failedToListTools: '列出工具失败：{error}',
		failedToLoadMCPConfig: '加载 MCP 配置失败：{error}',
		languageChanged: '语言已更改为{language}',
		connectionEnabled: '连接 "{name}" 已启用',
		connectionDisabled: '连接 "{name}" 已禁用'
	},
	// 消息渲染器相关
	messageRenderer: {
		generatingNote: '正在从内容生成笔记...',
		noteGenerated: '笔记已生成：{title}',
		errorGeneratingNote: '生成笔记时出错',
		applyingContent: '正在应用内容到笔记...',
		contentApplied: '内容已应用到：{file}',
		errorApplyingContent: '应用内容时出错',
		creatingNote: '正在创建笔记...',
		noteCreated: '笔记已创建：{title}',
		errorCreatingNote: '创建笔记时出错：{error}',
		openingResource: '正在打开资源...',
		resourceOpened: '资源已打开',
		errorOpeningResource: '打开资源时出错：{error}',
		addingToContext: '正在添加到上下文...',
		resourceAdded: '资源已添加到上下文',
		errorAddingResource: '添加资源时出错：{error}',
		contentTooShort: '内容太短，无法生成笔记',
		cannotGenerateFromWorkingIndicator: '无法从工作指示器生成笔记',
		noAIProviderForNote: '没有可用的 AI 提供者',
		generatingNoteTitle: '正在生成笔记标题...',
		noActiveNoteToApply: '未找到活动笔记来应用更改',
		noContentToApply: '没有内容可应用',
		cannotApplyWorkingIndicator: '无法应用工作指示器',
		appliedToEntireFile: '已将更改应用到整个文件 "{file}"',
		appliedToSelectedText: '已将更改应用到 "{file}" 中的选中文本',
		appliedChanges: '已将更改应用到 {file}',
		failedToApply: '应用更改失败：{error}',
		addedMCPResource: '已将 MCP 资源添加到上下文：{name}',
		failedToAddMCPResource: '添加 MCP 资源到上下文失败',
		noActiveEditor: '未找到活动编辑器',
		insertedAtCursor: '已插入到光标位置',
		failedToInsert: '插入到光标失败'
	},
	// UI构建器相关
	uiBuilder: {
		serverEnabledConnected: '服务器 "{serverId}" 已启用并连接',
		serverDisabledDisconnected: '服务器 "{serverId}" 已禁用并断开',
		allMCPServersEnabledConnected: '所有 MCP 服务器已启用并连接',
		allMCPServersDisabledDisconnected: '所有 MCP 服务器已禁用并断开'
	}
}
};
