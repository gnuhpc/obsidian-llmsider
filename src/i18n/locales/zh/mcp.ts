/**
 * 中文 MCP (Model Context Protocol) 相关翻译
 */
export const zhMCP = {
  // 连接状态
  connected: '已连接',
  disconnected: '未连接',
  serverDisconnected: '服务器已断开',

  // 连接消息
  serverConnected: '✅ MCP 服务器 "{server}" 连接成功',
  serverConnectionFailed: '❌ MCP 服务器 "{server}" 连接失败: {error}',
  connectingServers: '正在连接 MCP 服务器: {servers}',
  allServersConnected: '🎉 所有 MCP 服务器连接成功 ({connected}/{total})',
  partialServersConnected: '⚠️ 部分 MCP 服务器连接成功 ({connected}/{total})',
  noServersConnected: '❌ MCP 服务器连接失败 (0/{total})',

  // 错误消息和帮助文本
  networkConnectionFailed: '网络连接失败 - 请检查MCP服务器连接状态',
  permissionDenied: '权限不足 - 请检查工具权限设置',
  parameterError: '参数错误 - {error}',
  helpNetworkCheck: '💡 建议: 检查MCP服务器是否正在运行，网络连接是否正常',
  helpPermissionCheck: '💡 建议: 在设置中启用此工具的权限',
  helpParameterCheck: '💡 建议: 检查工具参数格式是否正确',
  helpGeneral: '💡 查看控制台获取详细错误信息',

  // MCP 配置界面
  configuration: {
    title: 'MCP 服务器配置',
    description: '使用 Claude Desktop JSON 格式配置 MCP 服务器。点击齿轮图标编辑配置。',
    requireConfirmation: '工具执行需要确认',
    requireConfirmationDesc: '执行 MCP 工具前询问确认',
    importFromClaude: '从 Claude Desktop 导入',
    exportToClaude: '导出到 Claude Desktop',
    editConfiguration: '编辑配置',
    closeEditor: '关闭编辑器'
  }
};
