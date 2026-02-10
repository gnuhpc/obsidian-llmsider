/**
 * Settings page translation types
 */

export interface ToolCategoriesTranslation {
  // Core Functionality
  fileSystem: string;
  editor: string;
  noteManagement: string;
  search: string;
  utility: string;
  // Web Functionality
  webContent: string;
  searchEngines: string;
  // Financial Markets - Primary
  stock: string;
  financial: string;
  futures: string;
  bonds: string;
  options: string;
  funds: string;
  forex: string;
  crypto: string;
  // Financial Markets - Advanced
  derivatives: string;
  microstructure: string;
  credit: string;
  international: string;
  // Economic & Industry
  macro: string;
  industry: string;
  commodity: string;
  // Analysis & Insights
  news: string;
  sentiment: string;
  esg: string;
  risk: string;
  technical: string;
  // Others
  weather: string;
  entertainment: string;
  other: string;
}

export interface ToolManagementTranslation {
  title: string;
  description: string;
  builtInToolsTitle: string;
  builtInToolsDescription: string;
  mcpToolsTitle: string;
  mcpToolsDescription: string;
  noMCPTools: string;

  // Status text
  enabled: string;
  disabled: string;

  // Category toggle notification
  builtInToolsInCategoryToggled: string;

  // Global batch actions
  enableAllTools: string;
  enableAllToolsDesc: string;
  disableAllTools: string;
  disableAllToolsDesc: string;
  resetAllPermissions: string;
  resetAllPermissionsDesc: string;
  exportPermissions: string;
  exportPermissionsDesc: string;
  importPermissions: string;
  importPermissionsDesc: string;

  // Built-in tools batch actions
  enableAllBuiltIn: string;
  enableAllBuiltInDesc: string;
  disableAllBuiltIn: string;
  disableAllBuiltInDesc: string;
  resetBuiltIn: string;
  resetBuiltInDesc: string;

  // Batch action success notifications
  allBuiltInToolsEnabled: string;
  allBuiltInToolsDisabled: string;

  // MCP tools batch actions
  enableAllMCP: string;
  enableAllMCPDesc: string;
  disableAllMCP: string;
  disableAllMCPDesc: string;
  resetMCP: string;
  resetMCPDesc: string;
}

export interface SettingsPageTranslation {
  title: string;
  llmProviders: string;
  addNewProvider: string;
  configuredProviders: string;
  advancedSettings: string;
  autocompletionSettings: string;
  language: string;
  languageDesc: string;
  maxChatHistory: string;
  maxChatHistoryDesc: string;

  // Section titles
  connectionsAndModels: string;
  addNewConnection: string;
  configuredConnectionsAndModels: string;
  uiSettings: string;
  defaultConversationMode: string;
  defaultConversationModeDesc: string;
  builtInTools: string;
  mcpSettings: string;

  // Provider details
  modelLabel: string;
  apiKeyLabel: string;
  baseUrlLabel: string;
  regionLabel: string;
  maxTokensLabel: string;
  temperatureLabel: string;
  displayNameLabel: string;
  apiKeyConfigured: string;
  apiKeyNotSet: string;
  checkmark: string;

  // Provider card
  defaultBadge: string;
  details: string;
  viewDetails: string;

  // Provider actions
  editProvider: string;
  copyProvider: string;
  deleteProvider: string;
  saveChanges: string;
  closeButton: string;

  // Provider types
  openaiProvider: string;
  anthropicProvider: string;
  qwenProvider: string;
  compatibleProvider: string;
  azureOpenaiProvider: string;
  ollamaProvider: string;
  geminiProvider: string;
  groqProvider: string;

  // Provider-specific labels
  deploymentNameLabel: string;
  apiVersionLabel: string;

  // Empty states
  noProvidersConfigured: string;
  noBuiltInTools: string;
  noMCPServersConfigured: string;

  // Checkboxes & toggles
  enabled: string;
  supportsVision: string;
  enableTool: string;

  // MCP related
  mcpManagerNotInitialized: string;
  noServersConnected: string;
  connectedMCPTools: string;
  configuredMCPServers: string;
  viewInputSchema: string;
  mcpDescription: string;
  deleteMCPServer: string;
  deleteMCPServerTitle: string;
  deleteMCPServerConfirm: string;
  deleteMCPServerWarning: string;
  deleteMCPServerCancelBtn: string;
  deleteMCPServerDeleteBtn: string;
  autoStart: string;
  manualStart: string;
  showTools: string;
  connect: string;
  disconnect: string;
  autoConnect: string;
  manualConnect: string;
  mcpAutoConnectChanged: string;

  // Model management
  models: string;
  addModel: string;
  addModelButton: string;
  toolsAvailable: string;
  toolCount: string;

  // Built-in tool categories
  categories: ToolCategoriesTranslation;

  // Quick Chat settings
  quickChat: string;

  // Other settings
  otherSettings: string;
  updateNotifications: string;
  updateNotificationsDesc: string;
  checkForUpdates: string;
  checkingForUpdates: string;
  updateAvailable: string;
  noUpdateAvailable: string;
  updateCheckFailed: string;

  // Web Search Settings
  webSearchSettings: string;
  webSearchSettingsDesc: string;
  searchBackend: string;
  searchBackendDesc: string;
  googleBackend: string;
  serpapiBackend: string;
  tavilyBackend: string;
  googleApiKey: string;
  googleApiKeyDesc: string;
  googleSearchEngineId: string;
  googleSearchEngineIdDesc: string;
  serpapiKey: string;
  serpapiKeyDesc: string;
  tavilyApiKey: string;
  tavilyApiKeyDesc: string;

  // Tool Management
  toolManagement: ToolManagementTranslation;
}
