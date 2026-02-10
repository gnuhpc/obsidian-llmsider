/**
 * Base translation types
 */

export interface MessageActionsTranslation {
  toggleDiffRendering: string;
  applyChanges: string;
  copyAsMarkdown: string;
  generateNewNote: string;
  insertAtCursor: string;
  updateNoteTitle: string;
  copyMessage: string;
  editAndResend: string;
  editMessage: string;
  regenerate: string;
}

export interface BaseTranslationKeys {
  // Plugin info
  pluginName: string;
  pluginDescription: string;

  // Chat interface
  chatPlaceholder: string;
  sendMessage: string;
  abortGeneration: string;
  clearChat: string;

  // Message actions
  messageActions: MessageActionsTranslation;

  // Settings
  settings: string;
  providers: string;
  addProvider: string;
  editProvider: string;
  deleteProvider: string;
  providerName: string;
  providerType: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: string;
  maxTokens: string;
  save: string;
  cancel: string;
  delete: string;
}
