/**
 * Settings page translations
 */

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
		noModelsAvailable: 'API 未返回模型。请手动输入。',
		loadingModels: '正在加载可用模型...',
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

		// 内置工具分类
		categories: {
			// 核心功能
			fileManagement: '文件管理',
			fileSystem: '文件系统',
			editor: '编辑器',
			noteManagement: '笔记管理',
			search: '搜索',
			utility: '实用工具',
			// 网络功能
			webContent: '网页内容',
			searchEngines: '搜索引擎',
			// 金融市场 - 主要
			stock: '股票市场',
			financial: '财务数据',
			futures: '期货市场',
			bonds: '债券市场',
			options: '期权市场',
			funds: '基金市场',
			forex: '外汇市场',
			crypto: '加密货币',
			// 金融市场 - 高级
			derivatives: '衍生品',
			microstructure: '市场微观结构',
			credit: '信用分析',
			alternative: '另类数据',
			international: '国际市场',
			// 经济与行业
			macro: '宏观经济',
			industry: '行业数据',
			commodity: '商品详情',
			// 分析与洞察
			news: '新闻资讯',
			sentiment: '市场情绪',
			esg: 'ESG数据',
			risk: '风险管理',
			technical: '技术分析',
			// 其他
			weather: '天气环境',
			entertainment: '娱乐消费',
			other: '其他'
		},

		// 快聊设置
		quickChat: '快聊',

		// 其他设置
		otherSettings: '其他设置',
		requireConfirmationForTools: '工具执行确认',
		requireConfirmationForToolsDesc: '执行MCP工具和内置工具前需要确认',
		autoExecuteDesc: '调用此工具时自动执行，无需确认',

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
		googleSearchEngineId: '搜索引擎ID',
		googleSearchEngineIdDesc: 'Google可编程搜索引擎的自定义搜索引擎ID。',
		serpapiKey: 'SerpAPI密钥',
		serpapiKeyDesc: 'SerpAPI的API密钥。从serpapi.com获取。',
		tavilyApiKey: 'Tavily API密钥',
		tavilyApiKeyDesc: 'Tavily AI搜索的API密钥。从tavily.com获取（含免费额度）。',

		// 向量数据库设置
		vectorDatabase: {
			title: '搜索增强',
			titleWithStats: '搜索增强（{files}篇笔记，{chunks}个向量，{size}）',
			sectionTitle: '搜索增强设置',
			description: '配置使用 Orama 向量数据库的本地语义搜索。这将启用基于 AI 的笔记库上下文检索功能。',
			
			// 启用/禁用
			enableSemanticSearch: '开启搜索增强',
			enableSemanticSearchDesc: '启用基于向量嵌入的本地语义搜索',
			
			// 相似笔记
			showSimilarNotes: '显示相似笔记',
			showSimilarNotesDesc: '基于语义相似度在笔记底部显示相关文档',
			
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
			
			// 向量化进度状态
			scanning: '扫描中...',
			processingFile: '处理文件 {current}/{total}',
			indexingChunk: '索引块 {current}/{total}',
			indexingProgress: '{percentage}% ({status})',
			finalizing: '100% (完成)',
			
			// 状态消息
			syncSuccess: '向量索引同步成功',
			rebuildSuccess: '向量索引重建成功',
			rebuildFullSuccess: '完整重建完成',
			notInitialized: '向量数据库未初始化',
			syncFailed: '索引同步失败',
			rebuildFailed: '索引重建失败',
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
			builtInToolsInCategoryToggled: '{category} 分类已{status}',

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

			// MCP工具批量操作
			enableAllMCP: '启用所有MCP工具',
			enableAllMCPDesc: '启用所有MCP工具',
			disableAllMCP: '禁用所有MCP工具',
			disableAllMCPDesc: '禁用所有MCP工具',
			resetMCP: '重置MCP工具',
			resetMCPDesc: '将MCP工具权限重置为默认状态'
		},
		
		// MCP设置操作
		allMCPServersEnabled: '所有MCP服务器已启用',
		allMCPServersDisabled: '所有MCP服务器已禁用'
	},
	
	// 通知消息
	notifications: {
		// 向量数据库
		vectorDatabase: {
			loaded: '向量数据库已加载',
			initFailed: '向量数据库初始化失败。请查看控制台了解详情。',
			updatingIndex: '正在更新索引（扫描变化）...',
			updateFailed: '索引更新失败。请查看控制台了解详情。',
			rebuildingIndex: '正在从头重建整个索引...',
			rebuildFailed: '完整重建失败。请查看控制台了解详情。',
			rebuildComplete: '完整重建完成：已索引 {chunks} 个块（{duration}秒）',
			indexingPaused: '索引已暂停',
			indexingResumed: '索引已恢复',
			// 索引进度状态
			clearingDatabase: '正在清空数据库...',
			findingDeletedChunks: '正在查找已删除的块...',
			applyingChanges: '正在应用更改到数据库...',
			indexingChunks: '正在索引块...',
			generatingEmbeddings: '正在生成向量（批次 {current}/{total}）',
			savingMetadata: '正在保存元数据...'
		},
		// 插件相关
		plugin: {
			reloading: '🔧 正在重载插件...',
			reloadSuccess: '✅ 插件重载成功！',
			reloadFailed: '❌ 插件重载失败：{error}',
			loadFailed: '加载 LLMSider 插件失败。请查看控制台了解详情。'
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
			exportFailed: '导出配置失败：{error}'
		}
	}
};
