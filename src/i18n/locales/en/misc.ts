/**
 * English miscellaneous translations - Contains multiple small modules
 */

// Tool parameter names
export const enParameterNames = {
  url: 'URL',
  path: 'Path',
  file_path: 'File Path',
  filePath: 'File Path',
  content: 'Content',
  file_text: 'File Content',
  query: 'Query',
  search: 'Search',
  text: 'Text',
  input: 'Input',
  output: 'Output'
};

// Tool call prompter UI
export const enToolCallPrompter = {
  statusCalling: 'Calling',
  statusExecuting: 'Executing',
  statusCompleted: 'Completed',
  statusFailed: 'Failed',
  hasOutputContent: 'Has output content',
  parametersTitle: 'Call Parameters',
  errorTitle: 'Error Message',
  resultsTitle: 'Execution Results',
  startTime: 'Start',
  endTime: 'End',
  inProgress: 'In Progress'
};

// Autocompletion settings
export const enAutocomplete = {
  enabled: 'Enable Autocomplete',
  enabledDesc: 'Enable AI-powered text completion suggestions while writing',
  granularity: 'Completion Granularity',
  granularityDesc: 'Choose the length of completion suggestions',
  tone: 'Tone',
  toneDesc: 'Set the tone for completion suggestions',
  domain: 'Domain',
  domainDesc: 'Specify a professional domain for context-aware completions',
  triggerDelay: 'Trigger Delay',
  triggerDelayDesc: 'Delay in milliseconds before showing suggestions',
  maxSuggestions: 'Max Suggestions',
  maxSuggestionsDesc: 'Number of completion candidates to generate (1-3), use up/down arrows to switch',
  
  // Granularity options
  word: 'Word',
  phrase: 'Phrase',
  shortSentence: 'Short Sentence',
  longSentence: 'Long Sentence',
  
  // Prompts
  doubleTapTab: 'Double-tap Tab to complete, Esc to dismiss',
  completionEnabled: 'Autocomplete enabled',
  completionDisabled: 'Autocomplete disabled'
};

// Quick Chat settings
export const enQuickChat = {
  enabled: 'Enable Quick Chat',
  enabledDesc: 'Show floating input box on text selection for quick AI interactions',
  showOnSelection: 'Show on Selection',
  showOnSelectionDesc: 'Automatically show Quick Chat when text is selected',
  enableDiffPreview: 'Enable Diff Preview',
  enableDiffPreviewDesc: 'Show diff preview when applying Quick Chat changes',
  enabledNotice: 'Quick Chat enabled! Press {key} to use it.',
  disabledNotice: 'Quick Chat disabled',
  showQuickChatButton: 'Show Quick Chat Button',
  showQuickChatButtonDesc: 'Display Quick Chat button when text is selected'
};

// Selection popup
export const enSelectionPopup = {
  showAddToContextButton: 'Show "Add to Context" Button',
  showAddToContextButtonDesc: 'Display button to add selected text to chat context'
};

// Commands
export const enCommands = {
  openQuickChat: 'Open Quick Chat',
  quickChatDisabled: 'Quick Chat is disabled. Please enable it in settings.',
  unableToAccessEditor: 'Unable to access editor view'
};

// Quick Chat UI
export const enQuickChatUI = {
  buttonLabel: 'Quick Chat',
  inputPlaceholder: '✨ Ask AI for help... (Enter to submit, ESC to close)',
  inputPlaceholderContinue: '✨ Continue the conversation or accept (✓) / reject (✕) changes',
  loadingPlaceholder: '⏳ Generating...',
  quickActionsAvailable: 'Quick Actions ({count} available)',
  quickActionsMatching: 'Quick Actions (matching {count})',
  noMatchingPrompts: 'No matching prompts found',
  chatInputPlaceholder: 'Add context (@), built-in prompts (#)',
  editModePlaceholder: 'Tell me how to modify the note...'
};

// Mermaid diagrams
export const enMermaid = {
  clickToRender: '📊 Click to render Mermaid diagram',
  rendering: '⏳ Rendering...',
  hideDiagram: '🔼 Hide diagram',
  renderError: '❌ Failed to render Mermaid diagram',
  retry: '🔄 Retry',
  clickToEnlarge: 'Click to enlarge',
  clickOutsideToClose: 'Click outside to close',
  mouseWheelZoom: 'Mouse wheel to zoom',
  dragToView: 'Drag to pan'
};

// Vector database
export const enVectorDatabase = {
  dimensionChanged: 'Vector database dimension changed. Please rebuild the index with the new embedding model.',
  databaseCorrupted: 'Vector database was corrupted and has been automatically reset. Please rebuild the index.',
  rebuildRequired: 'Rebuild required'
};
