/**
 * Status messages translation types
 */

export interface StatusTranslation {
  // Connection status
  connecting: string;
  connected: string;
  disconnecting: string;
  disconnected: string;
  reconnecting: string;
  connectionLost: string;
  connectionRestored: string;

  // Processing status
  initializing: string;
  processing: string;
  analyzing: string;
  generating: string;
  executing: string;
  completed: string;
  cancelled: string;
  failed: string;
  retrying: string;

  // Loading states
  loading: string;
  loadingData: string;
  loadingModel: string;
  loadingTools: string;
  loadingSettings: string;

  // Saving states
  saving: string;
  saved: string;
  saveFailed: string;
  autoSaving: string;

  // File operations status
  readingFile: string;
  writingFile: string;
  deletingFile: string;
  movingFile: string;
  copyingFile: string;
  fileOperationComplete: string;

  // API status
  sendingRequest: string;
  waitingForResponse: string;
  receivingData: string;
  requestComplete: string;
  requestFailed: string;

  // Tool execution status
  preparingTool: string;
  executingTool: string;
  toolComplete: string;
  toolFailed: string;

  // Search status
  searching: string;
  searchComplete: string;
  searchFailed: string;
  noResults: string;
  foundResults: string;

  // Import/Export status
  importing: string;
  importComplete: string;
  importFailed: string;
  exporting: string;
  exportComplete: string;
  exportFailed: string;

  // Validation status
  validating: string;
  validationPassed: string;
  validationFailed: string;

  // Authentication status
  authenticating: string;
  authenticated: string;
  authenticationFailed: string;
  loggingOut: string;
  loggedOut: string;

  // Sync status
  syncing: string;
  syncComplete: string;
  syncFailed: string;
  upToDate: string;

  // Provider status
  providerReady: string;
  providerBusy: string;
  providerError: string;
  providerUnavailable: string;

  // Model status
  modelLoading: string;
  modelReady: string;
  modelError: string;

  // MCP status
  mcpConnecting: string;
  mcpConnected: string;
  mcpDisconnected: string;
  mcpError: string;
  mcpReady: string;

  // Stream status
  streamStarted: string;
  streamEnded: string;
  streamError: string;

  // Queue status
  queued: string;
  inQueue: string;
  queueEmpty: string;

  // Progress indicators
  preparingTask: string;
  taskInProgress: string;
  taskComplete: string;
  taskFailed: string;

  // System status
  systemReady: string;
  systemBusy: string;
  systemError: string;
  systemMaintenance: string;
}
