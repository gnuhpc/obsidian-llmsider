/**
 * 中文杂项翻译 - 包含多个小模块
 */

// 工具参数名称
export const zhParameterNames = {
  url: '网址',
  path: '路径',
  file_path: '文件路径',
  filePath: '文件路径',
  content: '内容',
  file_text: '文件内容',
  query: '查询',
  search: '搜索',
  text: '文本',
  input: '输入',
  output: '输出'
};

// 工具调用提示器界面
export const zhToolCallPrompter = {
  statusCalling: '调用中',
  statusExecuting: '执行中',
  statusCompleted: '完成',
  statusFailed: '失败',
  hasOutputContent: '有输出内容',
  parametersTitle: '调用参数',
  errorTitle: '错误信息',
  resultsTitle: '执行结果',
  startTime: '开始',
  endTime: '结束',
  inProgress: '进行中'
};

// 自动补全设置
export const zhAutocomplete = {
  enabled: '启用自动补全',
  enabledDesc: '在写作时启用 AI 驱动的文本补全建议',
  model: '补全模型',
  modelDesc: '为自动补全选择特定模型（留空使用默认模型）',
  useDefaultModel: '使用默认模型',
  granularity: '补全粒度',
  granularityDesc: '选择补全建议的长度',
  tone: '语气',
  toneDesc: '设置补全建议的语气',
  tonePlaceholder: '例如：正式、随意、专业',
  domain: '专业领域',
  domainDesc: '指定用于上下文感知补全的专业领域',
  domainPlaceholder: '例如：技术、学术、创作',
  customPrompt: '自定义提示词',
  customPromptDesc: '直接编写补全约束，会追加到自动补全提示词中',
  customPromptPlaceholder: '例如：保持我的写作风格；避免套话；优先给出简洁、有信息量的续写',
  triggerDelay: '触发延迟',
  triggerDelayDesc: '显示建议前的延迟时间(毫秒)',
  maxSuggestions: '候选数量',
  maxSuggestionsDesc: '每次生成的补全候选数量（1-3个），可使用上下箭头切换',

  // 颗粒度选项
  word: '单词',
  phrase: '短语',
  shortSentence: '短句',
  longSentence: '长句',

  // 提示消息
  doubleTapTab: '双击 Tab 键补全, Esc 键关闭',
  completionEnabled: '自动补全已启用',
  completionDisabled: '自动补全已禁用'
};

// Quick Chat 设置
export const zhQuickChat = {
  enabled: '启用快聊',
  enabledDesc: '选中文本时显示浮动输入框以便快速进行 AI 交互',
  enableDiffPreview: '启用差异预览',
  enableDiffPreviewDesc: '应用快聊的更改时显示差异预览',
  enabledNotice: '快聊已启用!按 {key} 使用它。',
  disabledNotice: '快聊已禁用'
};

// 自动总结设置和界面
export const zhAutoSummarize = {
  settingName: '打开笔记时自动总结',
  settingDesc: '打开新笔记时显示确认对话框以总结笔记内容',
  enabled: '自动总结已启用',
  disabled: '自动总结已禁用',
  modalTitle: '总结笔记?',
  modalDescription: '是否需要总结"{noteName}"的内容?',
  dontAskFor24Hours: '24小时内不再询问',
  dontAskFor24HoursDesc: '24小时内跳过确认对话框',
  chatViewNotFound: '未找到聊天视图。请先打开聊天视图。',
  promptNotFound: '未找到总结提示词',
  failed: '总结笔记失败'
};

// 选择弹窗
export const zhSelectionPopup = {
  showAddToContextButton: '显示"添加到上下文"按钮',
  showAddToContextButtonDesc: '选中文本时显示按钮以添加文本到聊天上下文'
};

// 命令
export const zhCommands = {
  openQuickChat: '打开快聊',
  quickChatDisabled: '快聊已禁用。请在设置中启用它。',
  unableToAccessEditor: '无法访问编辑器视图'
};

// Quick Chat UI
export const zhQuickChatUI = {
  buttonLabel: '快聊',
  inputPlaceholder: '✨ 询问 AI 帮助... (按回车提交，ESC 关闭)',
  inputPlaceholderContinue: '✨ 继续对话或接受 (✓) / 拒绝 (✕) 更改',
  loadingPlaceholder: '⏳ 生成中...',
  loadingPrompts: '加载提示词中...',
  failedToLoadPrompts: '加载提示词失败',
  quickActionsAvailable: '快捷操作 (共 {count} 项)',
  quickActionsMatching: '快捷操作 (匹配 {count} 项)',
  noMatchingPrompts: '未找到匹配的提示词',
  chatInputPlaceholder: '添加上下文 (@)，内置提示词 (/)',
  editModePlaceholder: '告诉我如何修改笔记...',
  accept: '接受',
  acceptChanges: '接受更改',
  copy: '复制',
  copyToClipboard: '复制到剪贴板',
  reject: '拒绝',
  rejectChanges: '拒绝更改',
  insertBefore: '插入到选中块之前',
  insertAfter: '插入到选中块之后',
  recentPrompts: '最近使用',
  customPrompts: '自定义提示词',
  builtInPrompts: '内置操作',
  addToBuiltIn: '添加到内置提示词'
};

// Mermaid 图表
export const zhMermaid = {
  clickToRender: '📊 点击渲染 Mermaid 图表',
  rendering: '⏳ 渲染中...',
  hideDiagram: '🔼 隐藏图表',
  renderError: '❌ 渲染 Mermaid 图表失败',
  retry: '🔄 重试',
  clickToEnlarge: '点击放大查看',
  clickOutsideToClose: '点击外部关闭',
  mouseWheelZoom: '滚轮缩放',
  dragToView: '拖动查看'
};

// 向量数据库
export const zhVectorDatabase = {
  dimensionChanged: '向量数据库维度已更改。请使用新的嵌入模型重建索引。',
  dimensionMismatch: '向量数据库维度不匹配。请在设置中重建索引。',
  databaseCorrupted: '向量数据库已损坏并已自动重置。请重建索引。',
  rebuildRequired: '需要重建索引'
};

export const zhContextSettings = {
  autoReference: '点选自动引用',
  autoReferenceDesc: '选中文本时自动切换为选中文本，取消选择或切换笔记时自动切回当前笔记',
  autoReferenceEnabledNotice: '已启用点选自动引用 - 将根据选择和当前笔记自动切换上下文',
  autoReferenceDisabledNotice: '已禁用点选自动引用',
  includeExtrasWithContext: '上下文存在时包含历史/向量',
  includeExtrasWithContextDesc: '当已有上下文时，同时包含对话历史和向量搜索结果',
  includeExtrasEnabledNotice: '已启用上下文额外内容（历史/向量）',
  includeExtrasDisabledNotice: '已禁用上下文额外内容'
};
