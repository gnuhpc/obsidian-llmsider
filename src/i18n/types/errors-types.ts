/**
 * Error messages translation types
 */

export interface ErrorsTranslation {
  // General errors
  unknownError: string;
  networkError: string;
  timeoutError: string;
  permissionDenied: string;
  notFound: string;
  alreadyExists: string;
  invalidInput: string;
  invalidFormat: string;
  operationFailed: string;

  // API errors
  apiKeyMissing: string;
  apiKeyInvalid: string;
  apiRequestFailed: string;
  apiRateLimitExceeded: string;
  apiQuotaExceeded: string;
  apiUnauthorized: string;
  apiForbidden: string;
  apiServerError: string;

  // File errors
  fileNotFound: string;
  fileReadError: string;
  fileWriteError: string;
  fileDeleteError: string;
  filePermissionError: string;
  fileFormatError: string;
  fileTooLarge: string;
  directoryNotFound: string;
  directoryNotEmpty: string;

  // Provider errors
  providerNotConfigured: string;
  providerConnectionFailed: string;
  providerAuthFailed: string;
  providerNotSupported: string;
  modelNotAvailable: string;
  modelNotSupported: string;

  // Tool errors
  toolNotFound: string;
  toolExecutionFailed: string;
  toolParameterMissing: string;
  toolParameterInvalid: string;
  toolPermissionRequired: string;
  toolNotAvailable: string;

  // MCP errors
  mcpConnectionFailed: string;
  mcpServerNotFound: string;
  mcpToolNotFound: string;
  mcpResourceNotFound: string;
  mcpInitializationFailed: string;
  mcpCommunicationError: string;

  // Chat errors
  messageGenerationFailed: string;
  contextTooLarge: string;
  streamingError: string;
  abortedByUser: string;

  // Settings errors
  settingsSaveFailed: string;
  settingsLoadFailed: string;
  invalidConfiguration: string;
  configurationMissing: string;

  // Validation errors
  requiredFieldMissing: string;
  invalidEmail: string;
  invalidUrl: string;
  invalidNumber: string;
  valueTooSmall: string;
  valueTooLarge: string;
  invalidLength: string;

  // Plan-Execute errors
  planGenerationFailed: string;
  planExecutionFailed: string;
  stepExecutionFailed: string;
  invalidPlanFormat: string;

  // Import/Export errors
  importFailed: string;
  exportFailed: string;
  invalidFileFormat: string;
  corruptedData: string;

  // Authentication errors
  authenticationRequired: string;
  authenticationFailed: string;
  sessionExpired: string;
  invalidCredentials: string;

  // Database errors
  databaseError: string;
  databaseConnectionFailed: string;
  queryFailed: string;
  transactionFailed: string;

  // Note management errors
  noteCreationFailed: string;
  noteUpdateFailed: string;
  noteDeletionFailed: string;
  noteNotFound: string;

  // Search errors
  searchFailed: string;
  invalidSearchQuery: string;
  noSearchResults: string;

  // Clipboard errors
  clipboardAccessDenied: string;
  clipboardReadFailed: string;
  clipboardWriteFailed: string;
}
