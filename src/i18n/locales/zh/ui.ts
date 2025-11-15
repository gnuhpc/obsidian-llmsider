/**
 * 中文 UI 元素和界面文本
 */
export const zhUI = {
  toggleAgentMode: '切换智能代理模式',
  conversationMode: '对话模式',
  normalMode: '普通模式',
  guidedMode: '引导模式',
  agentMode: '智能代理模式',
  normalModeDesc: '基础问答',
  guidedModeDesc: '一步步引导提问',
  agentModeDesc: '自主使用工具',
  chatHistory: '聊天历史',
  newChat: '新建聊天',
  settings: '设置',
  moreOptions: '更多选项',
  addContext: '添加上下文',
  sendMessage: '发送消息',
  stopGenerating: '停止生成',
  clearChat: '清空当前聊天',
  openSettings: '打开设置',
  attachFile: '附加文件或上下文',
  agentModeEnabled: '智能代理模式（已启用）',
  agentModeDisabled: '智能代理模式（已禁用）',
  selectProvider: '选择模型',
  manageTools: '内置工具',
  manageMCPServers: '管理 MCP 服务器',
  toggleLocalContextSearch: '切换本地上下文搜索',
  localContextSearchEnabled: '本地上下文搜索已启用',
  localContextSearchDisabled: '本地上下文搜索已禁用',
  vectorDBNotInitialized: '向量数据库未初始化',
  noVectorDataAvailable: '没有可用的向量数据。请先同步或重建索引。',
  builtInToolsHeader: '内置工具',
  allBuiltInTools: '所有内置工具',
  noBuiltInToolsAvailable: '没有可用的内置工具',
  searchTools: '搜索工具...',
  noMatchingTools: '未找到匹配的工具',
  toolEnabled: '已启用',
  toolDisabled: '已禁用',
  mcpServersHeader: 'MCP 服务器',
  allMCPServers: '所有 MCP 服务器',
  noMCPServersConfiguredInDropdown: '未配置 MCP 服务器',
  searchMCPServers: '筛选 MCP 服务器...',
  noMatchingServers: '未找到匹配的 MCP 服务器',
  
  // 上下文菜单选项
  currentNoteContent: '当前笔记内容',
  currentNoteContentDesc: '包含当前笔记',
  includeSelection: '包含选择',
  includeSelectionDesc: '包含选中的文本',
  includeDirectory: '包含目录',
  includeDirectoryDesc: '包含文件夹中的所有文件',
  includeFileDirectory: '包含文件和目录',
  includeFileDirectoryDesc: '浏览并选择文件或文件夹',
  smartSearchNotes: '智能搜索笔记',
  smartSearchNotesDesc: '使用语义搜索查找相关笔记',
  includeWebpageContent: '获取当前网页内容',
  includeWebpageContentDesc: '从当前网页获取内容',
  fetchingWebpageContent: '正在获取网页内容...',
  webpageContentFetched: '网页内容已添加到上下文',
  webpageContentFetchFailed: '获取网页内容失败',
  webpageUrlAdded: '已添加网页 URL 到上下文',
  noWebpageFound: '未找到打开的网页。请先打开一个网页。',
  characters: '字符',
  
  // Smart search modal
  searchNotesPlaceholder: '输入关键词搜索笔记...',
  search: '搜索',
  searching: '搜索中...',
  addToContext: '添加到对话',
  cancel: '取消',
  save: '保存',
  pleaseEnterSearchQuery: '请输入搜索关键词',
  searchError: '搜索失败，请重试',
  noSearchResults: '未找到相关笔记',
  relevance: '相关度',
  searchResultCount: '找到 {count} 个相关笔记',
  pleaseSelectNotes: '请选择要添加的笔记',
  addedNotesToContext: '已添加 {count} 个笔记到对话',
  failedToAddNotes: '{count} 个笔记添加失败',
  openNote: '打开笔记',
  fileNotFound: '文件未找到',
  
  // Guided mode tool execution
  executingTool: '正在执行工具...',
  toolExecuted: '工具已执行',
  toolExecutionFailed: '工具执行失败',
  continueWithoutTools: '不使用工具继续',
  
  // Tool result and continuation
  toolResultTitle: '工具执行结果',
  continueQuestion: '是否继续引导对话？',
  continueWithSuggestions: '继续获取建议',
  endGuidedMode: '结束引导模式',
  guidedModeEnded: '引导模式已结束。您可以正常聊天或随时开始新的引导对话。',
  generationStopped: '已停止生成',
  
  // Guided options UI
  selectOption: '请选择一个选项：',
  selectOptionDesc: '选择以下选项之一以继续',
  submitSelection: '提交选择',
  
  // Tool execution
  toolExecutedSuccessfully: '工具执行成功',
  
  // Context warnings
  contextAddedWithHistory: '提示：如需对此文本单独操作，建议开始新对话以获得更好效果',
  addModelForComparison: '与其他模型对比',
  
  // Welcome message
  welcomeTitle: '让 AI 激活你的笔记。',
  welcomeSubtitle: '随时提问，智能操作，释放笔记的无限可能。',
  noProvidersWarning: '⚠️ 未配置 AI 提供商。请在设置中配置提供商。',
  
  // Hugging Face 本地模型
  huggingFaceLocalModelsTitle: '✨ Hugging Face 本地模型',
  huggingFaceLocalModelsDesc: '此连接类型使用 Transformers.js 在本地运行 embedding 模型。无需 API 密钥！',
  huggingFaceLocalModelsBrowserRun: '• 模型完全在浏览器中运行',
  huggingFaceLocalModelsWebGPU: '• 支持 WebGPU 加速',
  huggingFaceLocalModelsEmbeddingOnly: '• 仅支持 embedding 模型',
  
  // 连接模态框
  editConnection: '编辑连接',
  addNewConnection: '添加新连接',
  connectionType: '连接类型：',
  connectionName: '连接名称：',
  connectionNamePlaceholder: '例如：我的 OpenAI 账号',
  apiKey: 'API 密钥：',
  apiKeyPlaceholder: '请输入你的 API 密钥',
  organizationIdOptional: '组织 ID（可选）：',
  organizationIdPlaceholder: 'org-xxxxxxxx',
  azureEndpoint: 'Azure 端点：',
  azureEndpointPlaceholder: 'https://your-resource.openai.azure.com',
  azureEndpointNote: '例如：https://your-resource.openai.azure.com',
  deploymentName: '部署名称：',
  deploymentNamePlaceholder: 'your-deployment-name',
  apiVersionOptional: 'API 版本（可选）：',
  apiVersionPlaceholder: '2024-02-15-preview',
  apiVersionNote: '例如：2024-02-15-preview',
  ollamaServerUrl: 'Ollama 服务器地址：',
  ollamaServerUrlPlaceholder: 'http://localhost:11434/v1',
  ollamaServerUrlNote: '默认：http://localhost:11434/v1',
  regionOptional: '区域（可选）：',
  regionPlaceholder: 'us-central1',
  regionNote: '例如：us-central1',
  regionAlibabaNote: '阿里云区域',
  regionAlibabaPlaceholder: 'cn-beijing',
  baseUrl: '基础 URL：',
  baseUrlPlaceholder: 'https://api.example.com/v1',
  baseUrlNote: '自定义 OpenAI 兼容端点',
  connectionNameRequired: '连接名称为必填项',
  apiKeyRequired: 'API 密钥为必填项',
  azureEndpointRequired: 'Azure 端点 URL 为必填项',
  deploymentNameRequired: 'Azure OpenAI 需要部署名称',
  baseUrlRequired: '{type} 连接需要基础 URL',
  connectionSaved: '连接 "{name}" 保存成功',
  failedToSaveConnection: '保存连接失败',
  
  // 模型卡片显示
  model: '模型',
  dimension: '维度',
  temp: '温度',
  maxTokens: '最大令牌数',
  
  // 上下文管理器
  addedToContext: '已添加 {type} "{name}" 到上下文',
  contentTruncated: '（内容已截断）',
  failedToReadFile: '读取文件 "{name}" 失败',
  fileTypeDocument: '文档',
  fileTypeSpreadsheet: '表格',
  fileTypePresentation: '演示文稿',
  fileTypeText: '文本文件',
  fileTypeMarkdown: 'Markdown',
  fileTypeImage: '图片',
  fileTypeFile: '文件',
  
  // 笔记创建
  creatingNote: '正在创建笔记...',
  createdNote: '已创建笔记：{title}',
  failedToGenerateNote: '生成新笔记失败：{error}',
  generatedFrom: '由 LLMSider 生成于 {date}',
  
  // 选择
  addedSelectionToContext: '✓ 已添加到上下文（{length} 字符）',
  
  // 相似笔记
  similarNotes: {
    title: '相似笔记',
    titleWithCount: '相似笔记（{count}）',
    noSimilarNotes: '未找到相似笔记',
    loading: '正在查找相似笔记...',
    error: '查找相似笔记失败',
    openNote: '打开笔记',
    openInNewPane: '在新面板中打开',
    copyUrl: '复制 Obsidian 链接',
    similarity: '相似度'
  },
  
  // 调试设置
  enableDebugLogging: '开启调试日志',
  enableDebugLoggingDesc: '在控制台启用详细的调试日志输出，用于故障排查。对开发和调试问题很有帮助。'
};
