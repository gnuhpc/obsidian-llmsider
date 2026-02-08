/**
 * 中文翻译 - 主入口
 * 从各个子模块导入并合并翻译
 */

import { zhBase } from './base';
import { zhErrors } from './errors';
import { zhSuccess } from './success';
import { zhUI } from './ui';
import { zhMCP } from './mcp';
import { zhBuiltInPrompts } from './built-in-prompts';
import { 
  zhParameterNames, 
  zhToolCallPrompter, 
  zhAutocomplete, 
  zhQuickChat,
  zhAutoSummarize,
  zhSelectionPopup,
  zhCommands,
  zhQuickChatUI,
  zhMermaid,
  zhVectorDatabase
} from './misc';
import { common } from './common';
import { zhSettings } from './settings';
import { zhPlanexecute } from './plan-execute';
import { zhTools } from './tools';
import { zhStatus } from './status';

export const zh = {
  // 基础翻译
  ...zhBase,

  // 设置页面
  settingsPage: zhSettings.settingsPage,

  // ChatView
  chatView: zhUI.chatView,

  // Plan-Execute 框架
  planExecute: zhPlanexecute.planExecute,

  // 工具翻译
  tools: zhTools,


  // 错误消息
  errors: zhErrors,

  // 成功消息
  success: zhSuccess,

  // 通用UI元素
  common,

  // UI元素
  ui: zhUI,

  // MCP消息
  mcp: zhMCP,

  // 工具参数名称
  parameterNames: zhParameterNames,

  // 工具调用提示器
  toolCallPrompter: zhToolCallPrompter,

  // 自动补全
  autocomplete: zhAutocomplete,

  // Quick Chat
  quickChat: zhQuickChat,

  // 自动总结
  autoSummarize: zhAutoSummarize,

  // 选择弹窗
  selectionPopup: zhSelectionPopup,

  // 命令
  commands: zhCommands,

  // Quick Chat UI
  quickChatUI: zhQuickChatUI,

  // Mermaid 图表
  mermaid: zhMermaid,

  // 向量数据库
  vectorDatabase: zhVectorDatabase,

  // 内置提示词
  builtInPrompts: zhBuiltInPrompts,

  // 状态消息
  status: zhStatus,

  // 通知消息（在顶层导出以便直接访问）
  notifications: zhSettings.notifications
};
