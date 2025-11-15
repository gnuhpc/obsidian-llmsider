/**
 * English UI elements and interface text
 */
export const enUI = {
  toggleAgentMode: 'Toggle Agent Mode',
  conversationMode: 'Conversation Mode',
  normalMode: 'Normal Mode',
  guidedMode: 'Guided Mode',
  agentMode: 'Agent Mode',
  normalModeDesc: 'Basic Q&A',
  guidedModeDesc: 'Step-by-step guided questioning',
  agentModeDesc: 'Autonomous tool use',
  chatHistory: 'Chat History',
  newChat: 'New Chat',
  settings: 'Settings',
  moreOptions: 'More Options',
  addContext: 'Add Context',
  sendMessage: 'Send Message',
  stopGenerating: 'Stop Generating',
  clearChat: 'Clear Current Chat',
  openSettings: 'Open Settings',
  attachFile: 'Attach File or Context',
  agentModeEnabled: 'Agent Mode (Enabled)',
  agentModeDisabled: 'Agent Mode (Disabled)',
  selectProvider: 'Select Model',
  manageTools: 'Built-in Tools',
  manageMCPServers: 'Manage MCP Servers',
  toggleLocalContextSearch: 'Toggle Local Context Search',
  localContextSearchEnabled: 'Local context search enabled',
  localContextSearchDisabled: 'Local context search disabled',
  vectorDBNotInitialized: 'Vector database not initialized',
  noVectorDataAvailable: 'No vector data available. Please sync or rebuild the index first.',
  builtInToolsHeader: 'Built-in Tools',
  allBuiltInTools: 'All Built-in Tools',
  noBuiltInToolsAvailable: 'No built-in tools available',
  searchTools: 'Search tools...',
  noMatchingTools: 'No matching tools found',
  toolEnabled: 'Enabled',
  toolDisabled: 'Disabled',
  mcpServersHeader: 'MCP Servers',
  allMCPServers: 'All MCP Servers',
  noMCPServersConfiguredInDropdown: 'No MCP servers configured',
  searchMCPServers: 'Filter MCP servers...',
  noMatchingServers: 'No matching MCP servers found',
  
  // Context menu options
  currentNoteContent: 'Current Note Content',
  currentNoteContentDesc: 'Include current note',
  includeSelection: 'Include Selection',
  includeSelectionDesc: 'Include selected text',
  includeDirectory: 'Include Directory',
  includeDirectoryDesc: 'Include all files in folder',
  includeFileDirectory: 'Include Files and Directories',
  includeFileDirectoryDesc: 'Browse and select files or folders',
  smartSearchNotes: 'Smart Note Search',
  smartSearchNotesDesc: 'Find relevant notes using semantic search',
  includeWebpageContent: 'Fetch Current Webpage Content',
  includeWebpageContentDesc: 'Get content from current webpage',
  fetchingWebpageContent: 'Fetching webpage content...',
  webpageContentFetched: 'Webpage content added to context',
  webpageContentFetchFailed: 'Failed to fetch webpage content',
  webpageUrlAdded: 'Webpage URL added to context',
  noWebpageFound: 'No open webpage found. Please open a webpage first.',
  characters: 'characters',
  
  // Smart search modal
  searchNotesPlaceholder: 'Enter keywords to search notes...',
  search: 'Search',
  searching: 'Searching...',
  addToContext: 'Add to Conversation',
  cancel: 'Cancel',
  save: 'Save',
  pleaseEnterSearchQuery: 'Please enter search keywords',
  searchError: 'Search failed, please try again',
  noSearchResults: 'No relevant notes found',
  relevance: 'Relevance',
  searchResultCount: 'Found {count} relevant notes',
  pleaseSelectNotes: 'Please select notes to add',
  addedNotesToContext: 'Added {count} notes to conversation',
  failedToAddNotes: 'Failed to add {count} notes',
  openNote: 'Open Note',
  fileNotFound: 'File not found',
  
  // Guided mode tool execution
  executingTool: 'Executing tool...',
  toolExecuted: 'Tool executed',
  toolExecutionFailed: 'Tool execution failed',
  continueWithoutTools: 'Continue without tools',
  
  // Tool result and continuation
  toolResultTitle: 'Tool Execution Result',
  continueQuestion: 'Continue guided conversation?',
  continueWithSuggestions: 'Continue with suggestions',
  endGuidedMode: 'End guided mode',
  guidedModeEnded: 'Guided mode ended. You can chat normally or start a new guided conversation anytime.',
  generationStopped: 'Generation stopped',
  
  // Guided options UI
  selectOption: 'Please select an option:',
  selectOptionDesc: 'Choose one of the following options to continue',
  submitSelection: 'Submit Selection',
  
  // Tool execution
  toolExecutedSuccessfully: 'Tool executed successfully',
  
  // Context warnings
  contextAddedWithHistory: 'Tip: For isolated operation on this text, consider starting a new conversation for better results',
  addModelForComparison: 'Compare with Other Models',
  
  // Welcome message
  welcomeTitle: 'Activate your notes with AI.',
  welcomeSubtitle: 'Ask questions, perform intelligent operations, unleash the infinite possibilities of your notes.',
  noProvidersWarning: '⚠️ No AI provider configured. Please configure a provider in settings.',
  
  // Hugging Face Local Models
  huggingFaceLocalModelsTitle: '✨ Hugging Face Local Models',
  huggingFaceLocalModelsDesc: 'This connection type runs embedding models locally using Transformers.js. No API key required!',
  huggingFaceLocalModelsBrowserRun: '• Models run entirely in your browser',
  huggingFaceLocalModelsWebGPU: '• Supports WebGPU acceleration',
  huggingFaceLocalModelsEmbeddingOnly: '• Only embedding models are supported',
  
  // Connection Modal
  editConnection: 'Edit Connection',
  addNewConnection: 'Add New Connection',
  connectionType: 'Connection Type:',
  connectionName: 'Connection Name:',
  connectionNamePlaceholder: 'e.g., My OpenAI Account',
  apiKey: 'API Key:',
  apiKeyPlaceholder: 'Enter your API key',
  organizationIdOptional: 'Organization ID (Optional):',
  organizationIdPlaceholder: 'org-xxxxxxxx',
  azureEndpoint: 'Azure Endpoint:',
  azureEndpointPlaceholder: 'https://your-resource.openai.azure.com',
  azureEndpointNote: 'e.g., https://your-resource.openai.azure.com',
  deploymentName: 'Deployment Name:',
  deploymentNamePlaceholder: 'your-deployment-name',
  apiVersionOptional: 'API Version (Optional):',
  apiVersionPlaceholder: '2024-02-15-preview',
  apiVersionNote: 'e.g., 2024-02-15-preview',
  ollamaServerUrl: 'Ollama Server URL:',
  ollamaServerUrlPlaceholder: 'http://localhost:11434/v1',
  ollamaServerUrlNote: 'Default: http://localhost:11434/v1',
  regionOptional: 'Region (Optional):',
  regionPlaceholder: 'us-central1',
  regionNote: 'e.g., us-central1',
  regionAlibabaNote: 'Alibaba Cloud region',
  regionAlibabaPlaceholder: 'cn-beijing',
  baseUrl: 'Base URL:',
  baseUrlPlaceholder: 'https://api.example.com/v1',
  baseUrlNote: 'Custom OpenAI-compatible endpoint',
  connectionNameRequired: 'Connection name is required',
  apiKeyRequired: 'API key is required',
  azureEndpointRequired: 'Azure endpoint URL is required',
  deploymentNameRequired: 'Deployment name is required for Azure OpenAI',
  baseUrlRequired: 'Base URL is required for {type} connections',
  connectionSaved: 'Connection "{name}" saved successfully',
  failedToSaveConnection: 'Failed to save connection',
  
  // Model Card Display
  model: 'Model',
  dimension: 'Dimension',
  temp: 'Temp',
  maxTokens: 'Max Tokens',
  
  // Context Manager
  addedToContext: 'Added {type} "{name}" to context',
  contentTruncated: ' (content truncated)',
  failedToReadFile: 'Failed to read file "{name}"',
  fileTypeDocument: 'Document',
  fileTypeSpreadsheet: 'Spreadsheet',
  fileTypePresentation: 'Presentation',
  fileTypeText: 'Text File',
  fileTypeMarkdown: 'Markdown',
  fileTypeImage: 'Image',
  fileTypeFile: 'File',
  
  // Note Creation
  creatingNote: 'Creating note...',
  createdNote: 'Created note: {title}',
  failedToGenerateNote: 'Failed to generate new note: {error}',
  generatedFrom: 'Generated from LLMSider on {date}',
  
  // Selection
  addedSelectionToContext: '✓ Added to context ({length} chars)',
  
  // Similar Notes
  similarNotes: {
    title: 'Similar Notes',
    titleWithCount: 'Similar Notes ({count})',
    noSimilarNotes: 'No similar notes found',
    loading: 'Finding similar notes...',
    error: 'Failed to find similar notes',
    openNote: 'Open note',
    openInNewPane: 'Open in new pane',
    copyUrl: 'Copy Obsidian URL',
    similarity: 'Similarity'
  },
  
  // Debug Settings
  enableDebugLogging: 'Enable Debug Logging',
  enableDebugLoggingDesc: 'Enable detailed debug logging to the console for troubleshooting. Useful for development and debugging issues.'
} as const;
