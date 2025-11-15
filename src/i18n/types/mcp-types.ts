/**
 * MCP (Model Context Protocol) translation types
 */

export interface MCPTranslation {
  // MCP Server management
  serverName: string;
  serverUrl: string;
  serverStatus: string;
  serverConnected: string;
  serverDisconnected: string;
  serverError: string;
  connectServer: string;
  disconnectServer: string;
  addServer: string;
  removeServer: string;
  configureServer: string;

  // MCP Tools
  availableTools: string;
  toolName: string;
  toolDescription: string;
  toolParameters: string;
  toolSchema: string;
  invokeTool: string;
  toolInvoked: string;
  toolFailed: string;

  // MCP Resources
  availableResources: string;
  resourceUri: string;
  resourceType: string;
  resourceContent: string;
  accessResource: string;
  resourceAccessed: string;
  resourceFailed: string;

  // MCP Prompts
  availablePrompts: string;
  promptName: string;
  promptDescription: string;
  promptArguments: string;
  usePrompt: string;
  promptUsed: string;
  promptFailed: string;

  // Connection settings
  connectionType: string;
  transportType: string;
  stdioTransport: string;
  sseTransport: string;
  commandPath: string;
  commandArgs: string;
  environmentVars: string;
  autoConnect: string;
  autoReconnect: string;

  // Server configuration
  serverConfig: string;
  serverCommand: string;
  serverArgs: string;
  serverEnv: string;
  workingDirectory: string;
  timeout: string;

  // Status messages
  connecting: string;
  connected: string;
  disconnecting: string;
  disconnected: string;
  reconnecting: string;
  connectionFailed: string;
  connectionLost: string;
  connectionRestored: string;

  // Error messages
  serverNotFound: string;
  toolNotFound: string;
  resourceNotFound: string;
  promptNotFound: string;
  invalidConfiguration: string;
  initializationFailed: string;
  communicationError: string;
  timeoutError: string;

  // Tool execution
  executingTool: string;
  toolExecuted: string;
  toolExecutionFailed: string;
  toolPermissionRequired: string;
  toolPermissionGranted: string;
  toolPermissionDenied: string;

  // Resource access
  accessingResource: string;
  resourceAccessFailed: string;
  resourcePermissionRequired: string;

  // Capabilities
  capabilities: string;
  supportsTools: string;
  supportsResources: string;
  supportsPrompts: string;
  supportsLogging: string;

  // Logging
  logLevel: string;
  logMessage: string;
  viewLogs: string;
  clearLogs: string;

  // Notifications
  serverStarted: string;
  serverStopped: string;
  toolAdded: string;
  toolRemoved: string;
  resourceAdded: string;
  resourceRemoved: string;
}
