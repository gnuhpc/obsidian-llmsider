/**
 * English base translations - Plugin metadata and basic info
 */
export const enBase = {
  // Plugin info
  pluginName: 'LLMSider',
  pluginDescription: 'AI Assistant for Obsidian with advanced chat and automation capabilities',

  // Chat interface
  chatPlaceholder: 'Type your message here...',
  sendMessage: 'Send Message',
  abortGeneration: 'Abort Generation',
  clearChat: 'Clear Chat',

  // Message actions
  messageActions: {
    toggleDiffRendering: 'Toggle Diff Rendering',
    applyChanges: 'Apply Changes',
    copyAsMarkdown: 'Copy as Markdown',
    generateNewNote: 'Generate New Note',
    copyMessage: 'Copy Message',
    editAndResend: 'Edit and Resend'
  },

  // Settings
  settings: 'Settings',
  providers: 'AI Providers',
  addProvider: 'Add Provider',
  editProvider: 'Edit Provider',
  deleteProvider: 'Delete Provider',
  providerName: 'Provider Name',
  providerType: 'Provider Type',
  apiKey: 'API Key',
  baseUrl: 'Base URL',
  model: 'Model',
  temperature: 'Temperature',
  maxTokens: 'Max Tokens',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete'
} as const;
