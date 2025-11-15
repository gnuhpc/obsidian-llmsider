/**
 * Miscellaneous translation types (autocomplete, quick chat, etc.)
 */

export interface AutocompleteTranslation {
  // Autocomplete settings
  enabled: string;
  disabled: string;
  enableAutocomplete: string;
  autocompleteDelay: string;
  autocompleteTriggerLength: string;
  maxSuggestions: string;

  // Suggestions
  suggestion: string;
  suggestions: string;
  noSuggestions: string;
  loadingSuggestions: string;
  acceptSuggestion: string;
  rejectSuggestion: string;

  // Trigger types
  manualTrigger: string;
  autoTrigger: string;
  triggerCharacter: string;
}

export interface QuickChatTranslation {
  // Quick chat interface
  title: string;
  placeholder: string;
  send: string;
  cancel: string;
  clear: string;

  // Quick actions
  quickActions: string;
  summarize: string;
  explain: string;
  translate: string;
  improve: string;
  fix: string;
  completeText: string;

  // Context
  useSelection: string;
  useFile: string;
  useWorkspace: string;
  noContext: string;

  // Status
  processing: string;
  completed: string;
  error: string;
}

export interface BuiltInPromptsTranslation {
  // Category names
  general: string;
  coding: string;
  writing: string;
  analysis: string;
  learning: string;

  // General prompts
  summarizeText: string;
  explainConcept: string;
  translateText: string;
  brainstorm: string;
  
  // Coding prompts
  reviewCode: string;
  explainCode: string;
  optimizeCode: string;
  findBugs: string;
  writeTests: string;
  addComments: string;
  refactorCode: string;

  // Writing prompts
  improveWriting: string;
  checkGrammar: string;
  makeItConcise: string;
  expandText: string;
  changeStyle: string;

  // Analysis prompts
  analyzeProsAndCons: string;
  identifyPatterns: string;
  compareContrast: string;
  extractKeyPoints: string;

  // Learning prompts
  explainLikeImFive: string;
  createAnalogy: string;
  generateExamples: string;
  breakDown: string;
}

export interface SessionTranslation {
  // Session management
  newSession: string;
  loadSession: string;
  saveSession: string;
  deleteSession: string;
  renameSession: string;
  duplicateSession: string;
  exportSession: string;
  importSession: string;

  // Session info
  sessionName: string;
  sessionDate: string;
  messageCount: string;
  sessionSize: string;

  // Session list
  recentSessions: string;
  allSessions: string;
  noSessions: string;
  searchSessions: string;

  // Session actions
  clearHistory: string;
  confirmClear: string;
  sessionCleared: string;
}

export interface NotificationTranslation {
  // Notification types
  success: string;
  error: string;
  warning: string;
  info: string;

  // Actions
  dismiss: string;
  dismissAll: string;
  viewDetails: string;
  retry: string;

  // Settings
  enableNotifications: string;
  notificationDuration: string;
  notificationPosition: string;
}

export interface MiscTranslation {
  // Autocomplete
  autocomplete: AutocompleteTranslation;

  // Quick chat
  quickChat: QuickChatTranslation;

  // Built-in prompts
  builtInPrompts: BuiltInPromptsTranslation;

  // Session management
  session: SessionTranslation;

  // Notifications
  notification: NotificationTranslation;

  // Keyboard shortcuts
  shortcuts: string;
  viewShortcuts: string;
  customizeShortcuts: string;

  // Theme
  theme: string;
  lightTheme: string;
  darkTheme: string;
  autoTheme: string;

  // Language
  language: string;
  selectLanguage: string;

  // Updates
  updateAvailable: string;
  updateNow: string;
  updateLater: string;
  checkForUpdates: string;

  // Debug
  debugMode: string;
  viewLogs: string;
  exportLogs: string;
  clearLogs: string;

  // Privacy
  privacyPolicy: string;

  // About
  aboutPlugin: string;
  version: string;
  releaseNotes: string;
  reportIssue: string;
  documentation: string;
}
