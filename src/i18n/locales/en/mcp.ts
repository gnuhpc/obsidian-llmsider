/**
 * English MCP (Model Context Protocol) translations
 */
export const enMCP = {
  // Connection status
  connected: 'Connected',
  disconnected: 'Disconnected',
  serverDisconnected: 'Server disconnected',

  // Connection messages
  serverConnected: '✅ MCP server "{server}" connected successfully',
  serverConnectionFailed: '❌ MCP server "{server}" connection failed: {error}',
  connectingServers: 'Connecting to MCP servers: {servers}',
  allServersConnected: '🎉 All MCP servers connected successfully ({connected}/{total})',
  partialServersConnected: '⚠️ Some MCP servers connected ({connected}/{total})',
  noServersConnected: '❌ MCP server connection failed (0/{total})',

  // Error messages and help text
  networkConnectionFailed: 'Network connection failed - Please check MCP server connection status',
  permissionDenied: 'Insufficient permissions - Please check tool permission settings',
  parameterError: 'Parameter error - {error}',
  helpNetworkCheck: '💡 Suggestion: Check if MCP server is running and network connection is normal',
  helpPermissionCheck: '💡 Suggestion: Enable permissions for this tool in settings',
  helpParameterCheck: '💡 Suggestion: Check if tool parameter format is correct',
  helpGeneral: '💡 View console for detailed error information',

  // MCP configuration interface
  configuration: {
    title: 'MCP Server Configuration',
    description: 'Configure MCP servers using Claude Desktop JSON format. Click the gear icon to edit configuration.',
    requireConfirmation: 'Tool execution requires confirmation',
    requireConfirmationDesc: 'Ask for confirmation before executing MCP tools',
    importFromClaude: 'Import from Claude Desktop',
    exportToClaude: 'Export to Claude Desktop',
    editConfiguration: 'Edit Configuration',
    closeEditor: 'Close Editor'
  }
} as const;
