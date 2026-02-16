// Core type definitions for LLMSider plugin

import type { ToolCategory } from './types/tool-categories';

// ============================================================================
// LLM Provider Interfaces (New Architecture: Connection + Model)
// ============================================================================

/**
 * LLM Connection - Manages API connection information
 * One connection can have multiple models
 */
export interface LLMConnection {
  id: string;                 // Unique identifier
  name: string;               // Display name
  type: 'openai' | 'anthropic' | 'qwen' | 'free-qwen' | 'free-deepseek' | 'free-gemini' | 'openai-compatible' | 'siliconflow' | 'azure-openai' | 'ollama' | 'gemini' | 'groq' | 'xai' | 'local' | 'github-copilot' | 'hugging-chat' | 'openrouter' | 'opencode';
  apiKey: string;             // API key (not required for github-copilot) - For hugging-chat, this is the hf-chat cookie value or base64 encoded username=xxx&password=xxx; For free-gemini, this is __Secure-1PSID and __Secure-1PSIDTS separated by |
  baseUrl?: string;           // Base URL (required for openai-compatible, ollama)
  organizationId?: string;    // Organization ID (OpenAI)
  region?: string;            // Region (Azure OpenAI, Qwen)
  deploymentName?: string;    // Deployment name (Azure OpenAI)
  apiVersion?: string;        // API version (Azure OpenAI)
  // GitHub Copilot specific fields
  githubToken?: string;       // GitHub access token (for github-copilot)
  copilotToken?: string;      // Copilot API token (obtained from GitHub token)
  tokenExpiry?: number;       // Token expiry timestamp
  // Proxy configuration
  proxyEnabled?: boolean;     // Whether to use proxy for this connection
  proxyType?: 'socks5' | 'http' | 'https'; // Proxy type
  proxyHost?: string;         // Proxy host (e.g., 127.0.0.1)
  proxyPort?: number;         // Proxy port (e.g., 1080)
  proxyAuth?: boolean;        // Whether proxy requires authentication
  proxyUsername?: string;     // Proxy username (if auth required)
  proxyPassword?: string;     // Proxy password (if auth required)
  enabled: boolean;           // Whether this connection is enabled
  created: number;            // Creation timestamp
  updated: number;            // Last update timestamp
}

/**
 * LLM Model - Model-specific configuration
 * Each model is associated with a connection
 */
export interface LLMModel {
  id: string;                 // Unique identifier
  name: string;               // Display name
  connectionId: string;       // Parent connection ID
  modelName: string;          // Actual model name (e.g., gpt-4, claude-3-sonnet)
  maxTokens: number;          // Maximum tokens
  temperature: number;        // Temperature
  topP?: number;              // Top P sampling
  enabled: boolean;           // Whether this model is enabled
  supportsVision?: boolean;   // Vision support (for compatible providers)
  outputModalities?: string[]; // Output modalities (e.g., ['text', 'image'] for image generation)
  isEmbedding?: boolean;      // Whether this is an embedding model
  embeddingDimension?: number; // Embedding dimension (only for embedding models)
  isDefault?: boolean;        // Whether this is the default model for the connection
  created: number;            // Creation timestamp
  updated: number;            // Last update timestamp
}

// ============================================================================
// Legacy Provider Interfaces (Deprecated - For backward compatibility)
// ============================================================================

export interface LLMProvider {
  id: string; // Unique identifier for the provider instance
  name: string;
  displayName?: string; // Custom name set by user
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  enabled: boolean;
  supportsVision?: boolean; // Manual override for vision support
}

export interface OpenAIProvider extends LLMProvider {
  name: 'openai';
  organizationId?: string;
}

export interface AnthropicProvider extends LLMProvider {
  name: 'anthropic';
  version?: string;
}

export interface OpenAICompatibleProvider extends LLMProvider {
  name: 'openai-compatible';
  baseUrl: string; // Required for OpenAI-compatible models
  endpoint?: string;
  supportsVision?: boolean; // Manual override for vision support
}

export interface QwenProvider extends LLMProvider {
  name: 'qwen';
  region?: string; // Alibaba Cloud region
}

export interface FreeQwenProvider extends LLMProvider {
  name: 'free-qwen';
  // apiKey here is actually tongyi_sso_ticket or login_aliyunid_ticket
}

export interface FreeGeminiProvider extends LLMProvider {
  name: 'free-gemini';
  // apiKey here is actually __Secure-1PSID|__Secure-1PSIDTS (separated by |)
  // Proxy configuration
  proxyEnabled?: boolean;
  proxyType?: 'socks5' | 'http' | 'https';
  proxyHost?: string;
  proxyPort?: number;
  proxyAuth?: boolean;
  proxyUsername?: string;
  proxyPassword?: string;
}

export interface AzureOpenAIProvider extends LLMProvider {
  name: 'azure-openai';
  baseUrl: string; // Required: Azure endpoint URL
  deploymentName: string; // Required: Azure deployment name
  apiVersion?: string; // API version (e.g., 2024-02-15-preview)
}

export interface OllamaProvider extends LLMProvider {
  name: 'ollama';
  baseUrl: string; // Required: Ollama server URL (e.g., http://localhost:11434)
}

export interface GeminiProvider extends LLMProvider {
  name: 'gemini';
  region?: string; // Optional: Google Cloud region
}

export interface GroqProvider extends LLMProvider {
  name: 'groq';
  baseUrl?: string; // Optional: Custom endpoint
}

export interface XAIProvider extends LLMProvider {
  name: 'xai';
  baseUrl?: string; // Optional: Custom endpoint
}

export type ProviderType = OpenAIProvider | AnthropicProvider | OpenAICompatibleProvider | QwenProvider | FreeQwenProvider | FreeGeminiProvider | AzureOpenAIProvider | OllamaProvider | GeminiProvider | GroqProvider | XAIProvider;

// ============================================================================
// Chat & Message Interfaces
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// Content types for multimodal support
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string; // base64 encoded image data
  };
}

export type MessageContent = TextContent | ImageContent;

export interface ToolCallExecution {
  id: string;
  toolName: string;
  server?: string;
  parameters: unknown;
  result?: unknown;
  error?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: number;
  executionTime?: number; // milliseconds
  // Enhanced logging for tool execution indicators
  requestData?: {
    method: string;
    params: unknown;
    timestamp: number;
    source: 'user' | 'system' | 'auto'; // Request source
  };
  responseData?: {
    result: unknown;
    error?: unknown;
    timestamp: number;
    statusCode?: number;
    metadata?: unknown;
  };
  // UI display information
  displayStatus?: 'detecting' | 'executing' | 'completed' | 'failed';
  progressPercent?: number;
  displayMessage?: string;
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  server?: string;
  request: {
    method: string;
    parameters: unknown;
    timestamp: number;
    messageId?: string; // Associated chat message ID
    source: 'user' | 'system' | 'auto';
  };
  response?: {
    result: unknown;
    error?: unknown;
    timestamp: number;
    executionTime: number;
    statusCode?: number;
    metadata?: unknown;
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  displayData?: {
    phase: 'detection' | 'executing' | 'completed' | 'failed';
    message: string;
    progress?: { current: number; total: number };
    icon?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string | MessageContent[]; // Support both text and multimodal content
  timestamp: number;
  // Multi-provider responses for assistant messages
  providerResponses?: {
    [providerKey: string]: { // providerKey format: "connectionId::modelId"
      content: string | MessageContent[];
      timestamp: number;
      tokens?: number;
      model?: string;
    };
  };
  activeProvider?: string; // Currently displayed provider for this message
  metadata?: {
    provider?: string;
    model?: string;
    tokens?: number;
    context?: string;
    mode?: 'ask' | 'action';
    action?: string;
    source?: string;
    isWorking?: boolean; // For working indicator messages
    isStreaming?: boolean; // For streaming content updates
    hasUnifiedDiff?: boolean; // For Action mode messages with diff visualization
    originalContent?: string; // Original content before modification
    modifiedContent?: string; // Modified content after changes
    unifiedDiff?: string; // Generated unified diff text
    hasEnhancedDiff?: boolean; // For enhanced diff rendering
    hasJSDiff?: boolean; // For JSDiff rendering using jsdiff library
    diffResult?: unknown; // Enhanced diff result object
    hasMultipleReferences?: boolean; // Whether multiple file references are present (disables diff/apply)
    // MCP-related metadata
    mcpTool?: string; // Name of MCP tool associated with this message
    mcpServer?: string; // MCP server that provided the tool
    mcpResourceUri?: string; // URI of MCP resource referenced
    toolStatus?: string; // Status of MCP tool execution
    toolResult?: unknown; // Result of MCP tool execution
    toolError?: unknown; // Error from MCP tool execution
    mcpError?: boolean; // Whether this is an MCP error message
    errorType?: string; // Type of error that occurred
    errorCategory?: string; // Category of error (network, permission, parameter, etc.)
    // Enhanced tool call data persistence
    toolExecutions?: ToolCallExecution[]; // Persistent tool execution results
    toolCallsInProgress?: boolean; // Whether tool calls are currently being executed
    isToolResultMessage?: boolean; // Whether this message displays tool results
    isToolContext?: boolean; // Whether this is a tool context message
    parentMessageId?: string; // Parent message ID for tool context
    isSystemResponse?: boolean; // Whether this is a system response message
    followsToolExecution?: boolean; // Whether this follows tool execution
    originalAssistantMessageId?: string; // Original assistant message ID
    // Generated images metadata (for image generation models)
    generatedImages?: GeneratedImage[]; // Images generated by the assistant
    // Tool execution display metadata
    isToolDetection?: boolean; // Whether this is a tool detection message
    toolNames?: string[]; // Names of tools detected
    toolCount?: number; // Number of tools detected
    isToolExecution?: boolean; // Whether this is a tool execution message
    executionStatus?: 'running' | 'completed' | 'failed'; // Status of tool execution
    currentIndex?: number; // Current tool index being executed
    totalCount?: number; // Total number of tools to execute
    isToolExecutionResult?: boolean; // Whether this is a tool execution result message
    toolName?: string; // Name of the tool for execution messages
    parameters?: Record<string, any>; // Parameters passed to tool (for tool result messages)
    resultMessage?: string; // Result message for tool execution
    // Plan-Execute framework metadata
    phase?: 'plan' | 'thought' | 'action' | 'observation' | 'final_answer' | 'system_reminder'; // Plan-Execute phase
    error?: string; // Error message for failed phases
    // Additional tool-related metadata
    isFollowUpMessage?: boolean; // Whether this is a follow-up message after tool execution
    toolCalls?: unknown[]; // Tool calls array for Mastra Memory storage
    isSuccess?: boolean; // Whether tool execution was successful
    isSystemMessage?: boolean; // Whether this is a system-generated message
    attachments?: {
      filename: string;
      fileType: string;
      buffer?: ArrayBuffer; // Raw file data for images
    }[];
    // Plan-Execute related metadata
    planExecuteState?: PlanExecuteState;
    isPlanExecuteMode?: boolean;
    planExecutePhases?: PlanExecutePhase[];
    planTasks?: unknown[]; // Saved plan tasks for reload reconstruction
    executionMode?: 'sequential' | 'dag'; // Execution mode for plan-execute framework
    // Guided mode metadata
    isGuidedQuestion?: boolean; // Whether this is a guided mode question from AI
    guidedOptions?: string[]; // Available options for user to choose
    isMultiSelect?: boolean; // Whether options allow multiple selection
    guidedStepNumber?: number; // Current step number in guided flow
    guidedContext?: string; // Context/state for current guided conversation
    // Guided mode tool support
    suggestedToolCalls?: unknown[]; // Tools suggested by AI in guided mode
    requiresToolConfirmation?: boolean; // Whether user needs to confirm tool execution
    toolExecutionApproved?: boolean; // Whether user approved the tool execution
    isPreToolExplanation?: boolean; // Whether this is explanation text before tool execution
    toolsToExecute?: string[]; // Names of tools that will be executed after this explanation
    // Error handling
    hasError?: boolean; // Whether this message contains an error
    // Internal messages (not displayed in UI)
    internalMessage?: boolean; // Whether this is an internal message for AI context only
  };
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  created: number;
  updated: number;
  provider: string;
  mode: 'ask' | 'action';
  conversationMode?: ConversationMode; // Save conversation mode (normal/guided/agent) for this session
}

// ============================================================================
// Plan-Execute Model Interfaces
// ============================================================================

export interface PlanExecutePhase {
  type: 'question' | 'plan' | 'thought' | 'action' | 'observation' | 'final_answer';
  content: string;
  timestamp: number;
  metadata?: {
    toolName?: string;
    toolArgs?: unknown;
    toolResult?: unknown;
    error?: string;
    index?: number;
  };
}

export interface PlanExecuteState {
  question?: string;
  plan?: string;
  phases: PlanExecutePhase[];
  currentPhase?: PlanExecutePhase;
  isComplete: boolean;
  finalAnswer?: string;
  isActive: boolean; // Whether this message is currently in Plan-Execute mode
}

export interface PlanExecuteIndicatorState {
  phase: 'plan' | 'thought' | 'action_intent' | 'action_executing' | 'observation' | 'final_answer';
  content?: string;
  toolName?: string;
  toolArgs?: unknown;
  result?: unknown;
  error?: string;
  progress?: { current: number; total: number };
}

// ============================================================================
// UI & Interaction Interfaces
// ============================================================================

export type ChatMode = 'ask' | 'action';

/**
 * Conversation Mode - different interaction patterns
 * - normal: Basic Q&A mode without tools
 * - agent: Autonomous agent mode with plan-execute framework
 * - guided: Interactive guided mode with step-by-step questions and options
 */
export type ConversationMode = 'normal' | 'agent' | 'guided';

// ============================================================================
// Prompt Template Interfaces
// ============================================================================

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  description?: string; // Made optional to handle database queries
  isBuiltIn: boolean;
  order: number;
  lastUsed?: number; // Optional timestamp of last usage
  searchKeywords?: string[]; // For cross-language search (optional)
  usageCount?: number; // Number of times the prompt has been used
  pinned?: boolean;
  isUserModified?: boolean;
  isDeleted?: boolean;
}

// ============================================================================
// MCP (Model Context Protocol) Interfaces - Claude Desktop Compatible
// ============================================================================

// Claude Desktop MCP Server Configuration Format
export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  // WebSocket connections (not standard in Claude Desktop but supported)
  url?: string;
  // Auto-connection setting for individual servers
  autoConnect?: boolean;
  // Runtime status (not persisted in JSON)
  status?: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError?: string;
  lastConnected?: number;
}

// Claude Desktop compatible MCP configuration
export interface MCPServersConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

// Extended server info for runtime management
export interface MCPServerRuntime extends MCPServerConfig {
  id: string; // Server name/key
  name: string; // Display name (same as id for Claude Desktop compatibility)
  enabled: boolean; // Runtime enable/disable
  connectionType: 'websocket' | 'stdio' | 'streamable-http';
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: unknown;
  server: string; // Server ID that provides this tool
  enabled?: boolean; // Whether this tool is enabled for use
}

// Built-in tools interface
export interface BuiltInTool {
  id?: string; // Optional identifier (defaults to name if not provided)
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  outputSchema?: unknown; // JSON Schema for output, following same format as MCP tools
  category: ToolCategory;
  enabled?: boolean; // Whether this tool is enabled for use
}

export interface MCPToolPermission {
  serverId: string;
  toolName: string;
  enabled: boolean;
  lastModified: number;
}

export interface MCPServerPermissions {
  serverId: string;
  serverEnabled: boolean; // Whether the entire server is enabled
  toolPermissions: Record<string, boolean>; // tool name -> enabled
  lastUpdated: number;
}

export interface MCPClientState {
  serversConfig: MCPServersConfig; // Claude Desktop compatible config
  connectedServers: Set<string>;
  availableTools: MCPTool[];
  serverPermissions: Record<string, MCPServerPermissions>; // serverId -> permissions
  lastUpdate: number;
}

// MCP Protocol Message Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface MCPError extends Error {
  code?: number;
  data?: unknown;
}

export interface ConnectionOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
}

export interface STDIOConnectionOptions extends ConnectionOptions {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  url: string | null;
  command?: string;
  connecting: boolean;
  lastError?: string;
  retryAttempt?: number;
}

// ============================================================================
// Settings & Configuration
// ============================================================================

export interface LLMSiderSettings {
  // New architecture: Connection + Model
  connections: LLMConnection[];
  models: LLMModel[];
  activeConnectionId: string;
  activeModelId: string;

  // Active provider ID (format: connectionId::modelId)
  activeProvider: string;

  // UI preferences
  agentMode: boolean; // Deprecated: kept for migration, use conversationMode instead
  conversationMode: ConversationMode; // Current conversation mode
  defaultConversationMode: ConversationMode; // Default conversation mode when starting new chat
  showSidebar: boolean;
  sidebarPosition: 'left' | 'right';

  // Internationalization settings
  i18n: {
    language: 'en' | 'zh'; // Only supported languages: English and Chinese
    initialized: boolean; // Whether language has been detected/set for first time
  };

  // Chat history
  chatSessions: ChatSession[];
  maxChatHistory: number;
  nextSessionId: number; // Auto-incrementing session ID counter

  // Custom prompts
  customPrompts: PromptTemplate[];

  // MCP configuration - Claude Desktop compatible
  mcpSettings: {
    serversConfig: MCPServersConfig; // Direct Claude Desktop JSON format
    serverPermissions: Record<string, MCPServerPermissions>; // Tool permissions
    enableToolSuggestions: boolean;
    enableResourceBrowsing: boolean;
  };

  // Built-in tools permissions
  // @deprecated - Now managed directly in database (tool_settings table), kept for backward compatibility
  builtInToolsPermissions: Record<string, boolean>; // tool name -> enabled (default all true)
  
  // Tool auto-execution settings (for both built-in and MCP tools)
  toolAutoExecute: Record<string, boolean>; // tool name -> auto-execute without confirmation
  
  isFirstLaunch: boolean; // Whether this is the first time launching the plugin

  // Autocomplete settings
  autocomplete: {
    enabled: boolean; // Global toggle for autocomplete
    modelId?: string; // Specific model ID for autocompletion (if not set, use default model)
    granularity: 'phrase' | 'short-sentence' | 'long-sentence'; // Completion length
    tone: string; // Writing tone (formal, casual, professional, friendly)
    domain: string; // Domain/field for context (technical, academic, creative, general)
    triggerDelay: number; // Delay before triggering completion (ms)
    maxSuggestions: number; // Maximum number of suggestions
  };

  // Quick Chat settings (like Notion AI)
  inlineQuickChat: {
    enabled: boolean; // Global toggle for quick chat
    triggerKey: string; // Keyboard shortcut to trigger (default: 'Ctrl+/')
    showOnSelection: boolean; // Automatically show Quick Chat button when text is selected
    enableDiffPreview: boolean; // Show inline diff for replacements
  };

  // Selection Popup settings
  selectionPopup: {
    showAddToContext: boolean; // Show "Add to Context" button when text is selected
  };

  // Context settings
  contextSettings: {
    autoReference: boolean;
    includeExtrasWithContext: boolean;
  };

  // Update check settings
  updateSettings: {
    notifyUpdates: boolean; // Notify when new version is available
    lastCheckedAt: number; // Timestamp of last update check
    lastNotifiedVersion: string; // Last version notified to user
  };

  // Google Search settings
  googleSearch: {
    searchBackend: 'google' | 'serpapi' | 'tavily'; // Selected search backend
    googleApiKey?: string; // Google Custom Search API key
    googleSearchEngineId?: string; // Google Custom Search Engine ID
    serpapiKey?: string; // SerpAPI key
    tavilyApiKey?: string; // Tavily API key
  };

  // Memory System settings
  memorySettings: {
    enableWorkingMemory: boolean; // Enable working memory (user preferences, personal info)
    workingMemoryScope: 'resource' | 'thread'; // Working memory scope: resource (global) or thread (per session)
    enableConversationHistory: boolean; // Enable conversation history for context continuity
    conversationHistoryLimit: number; // Maximum number of conversation messages to retain (default: 10)
    // Conversation Compaction Settings
    enableCompaction: boolean; // Enable intelligent conversation history compaction
    compactionThreshold: number; // Token threshold to trigger compaction (default: 65536)
    compactionTarget: number; // Target token count after compaction (default: 4000)
    compactionPreserveCount: number; // Number of recent messages to preserve unmodified (default: 4)
    compactionModel: string; // Model to use for summarization - format: connectionId::modelId
    enableSemanticRecall: boolean; // Enable semantic recall based on vector similarity
    semanticRecallLimit: number; // Maximum number of similar conversations to return (default: 5)
    embeddingModelId: string; // Embedding model ID for semantic recall - format: connectionId::modelId (required when semantic recall is enabled)
  };

  // Vector Database settings
  vectorSettings: {
    enabled: boolean; // Whether to load vector database on startup (search enhancement)
    showSimilarNotes: boolean; // Whether to show similar notes at the bottom of notes
    similarNotesCollapsed: boolean; // Whether similar notes section is collapsed by default
    similarNotesHideByDefault: boolean; // Whether to hide similar notes by default until hover
    autoSearchEnabled: boolean; // Whether to automatically search local notes during chat
    suggestRelatedFiles: boolean; // Whether to suggest related files when adding context
    suggestionTimeout: number; // Timeout in milliseconds before suggested file disappears (default: 5000)
    storagePath: string; // Path to vector database storage
    indexName: string; // Index name for Vectra
    chunkingStrategy: 'character' | 'semantic'; // Chunking strategy
    chunkSize: number; // Chunk size in characters (for character strategy)
    chunkOverlap: number; // Chunk overlap in characters (for character strategy)
    topK: number; // Number of results to return in searches
    embeddingModelId: string; // Embedding model ID - format: connectionId::modelId (remote API only)
    contextExcerptLength: number; // Maximum length of context excerpts sent to LLM (default: 500 characters, 0 = send full content)
  };

  // Advanced settings
  debugMode: boolean;
  enableDiffRenderingInActionMode: boolean; // Toggle for diff rendering in action mode messages
  enableDebugLogging: boolean; // Enable debug logging to console for troubleshooting
  maxBuiltInToolsSelection: number; // Maximum number of built-in tools that can be enabled (default: 64)
  maxMCPToolsSelection: number; // Maximum number of MCP tools that can be enabled (default: 64)
  planExecutionMode: 'sequential' | 'dag'; // Plan execution mode: sequential (default) or dag (parallel)
}

// ============================================================================
// Error & Status Interfaces
// ============================================================================

export interface LLMError {
  code: string;
  message: string;
  provider?: string;
  details?: unknown;
  retryable: boolean;
  timestamp: number;
}

export interface ProviderStatus {
  provider: string;
  lastChecked: number;
  error?: LLMError;
  usage?: {
    requestsToday: number;
    tokensToday: number;
    costsToday?: number;
  };
}

// ============================================================================
// Event & Callback Interfaces
// ============================================================================

export interface LLMSiderEvents {
  'message-sent': (message: ChatMessage) => void;
  'message-received': (message: ChatMessage) => void;
  'provider-changed': (providerId: string) => void;
  'mode-changed': (mode: ChatMode) => void;
  'error-occurred': (error: LLMError) => void;
}

// ============================================================================
// API Response Interfaces
// ============================================================================

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolCallResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export interface GeneratedImage {
	type: 'image_url';
	image_url: {
		url: string; // Base64 data URL
	};
}
export interface StreamingResponse {
  delta: string;
  isComplete: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
  images?: GeneratedImage[];
}


export interface LLMResponse {
	content: string;
	model: string;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error';
	metadata?: Record<string, unknown>;
	toolCalls?: ToolCall[];
	images?: GeneratedImage[]; // Generated images for image generation models

  isLoaded: boolean;
  isLoadingSession?: boolean;
  activeView?: string;
  currentSession?: string;
  providerStatuses: Record<string, ProviderStatus>;
  lastError?: LLMError;
}

// ============================================================================
// Constants and Enums
// ============================================================================

export const CHAT_VIEW_TYPE = 'llmsider-chat-view';
export const ACTION_MODAL_TYPE = 'llmsider-action-modal';

export const DEFAULT_SETTINGS: LLMSiderSettings = {
  // New architecture
  connections: [],
  models: [],
  activeConnectionId: '',
  activeModelId: '',
  activeProvider: '', // Format: connectionId::modelId
  
  agentMode: false, // Deprecated: kept for migration
  conversationMode: 'normal', // Default to normal Q&A mode
  defaultConversationMode: 'normal', // Default conversation mode when starting new chat
  showSidebar: true,
  sidebarPosition: 'right',
  i18n: {
    language: 'en', // Default to English, will be auto-detected on first load
    initialized: false, // Will be set to true after first language detection
  },
  chatSessions: [],
  maxChatHistory: 50,
  nextSessionId: 1, // Start auto-incrementing from 1
  customPrompts: [],
  mcpSettings: {
    serversConfig: {
      mcpServers: {}
    },
    serverPermissions: {},
    enableToolSuggestions: true,
    enableResourceBrowsing: true,
  },
  builtInToolsPermissions: {}, // Will be initialized on first launch
  toolAutoExecute: {}, // Tool-specific auto-execute settings
  isFirstLaunch: true, // Will be set to false after first initialization
  autocomplete: {
    enabled: false, // Default disabled for first-time installation
    granularity: 'phrase',
    tone: 'professional',
    domain: 'general',
    triggerDelay: 500,
    maxSuggestions: 1
  },
  inlineQuickChat: {
    enabled: false, // Default disabled for first-time installation
    triggerKey: 'Mod+/',
    showOnSelection: false, // Auto-enabled when Quick Chat is enabled
    enableDiffPreview: true, // Default enabled for diff preview
  },
  selectionPopup: {
    showAddToContext: true, // Show "Add to Context" button by default
  },
  contextSettings: {
    autoReference: true,
    includeExtrasWithContext: false
  },
  updateSettings: {
    notifyUpdates: true,
    lastCheckedAt: 0,
    lastNotifiedVersion: ''
  },
  googleSearch: {
    searchBackend: 'google', // Default to Google Custom Search
    googleApiKey: '',
    googleSearchEngineId: '',
    serpapiKey: '',
    tavilyApiKey: ''
  },
  memorySettings: {
    enableWorkingMemory: true, // Enable working memory by default
    workingMemoryScope: 'resource', // Default to resource level (global)
    enableConversationHistory: true, // Enable conversation history by default
    conversationHistoryLimit: 10, // Keep last 10 messages
    // Conversation Compaction defaults
    enableCompaction: true, // Enable compaction by default
    compactionThreshold: 65536, // Trigger compaction when conversation exceeds 65536 tokens
    compactionTarget: 4000, // Compress to ~4000 tokens
    compactionPreserveCount: 4, // Keep 4 most recent messages unmodified
    compactionModel: '', // Empty = use default model from first available connection
    enableSemanticRecall: false, // Disabled by default (requires vector DB)
    semanticRecallLimit: 5, // Return top 5 similar conversations
    embeddingModelId: '', // Empty = use same model as vector DB, or specify connectionId::modelId
  },
  vectorSettings: {
    enabled: false, // Default disabled - whether to load vector DB on startup
    showSimilarNotes: true, // Show similar notes by default when vector DB is enabled
    similarNotesCollapsed: false, // Default expanded - similar notes section starts expanded
    similarNotesHideByDefault: false, // Default visible - don't hide until hover
    autoSearchEnabled: false, // Default disabled - whether to auto-search during chat
    suggestRelatedFiles: false, // Default disabled - suggest related files when adding context
    suggestionTimeout: 5000, // Default 5 seconds before suggestion disappears
    storagePath: 'plugins/obsidian-llmsider/vector-data', // Will be prefixed with vault.configDir
    indexName: 'vault-semantic-index',
    chunkingStrategy: 'semantic', // Default to semantic chunking
    chunkSize: 1000,
    chunkOverlap: 100,
    topK: 5,
    embeddingModelId: '', // User must select from Connection-Model (remote API only)
    contextExcerptLength: 500 // Default 500 characters per excerpt
  },
  debugMode: false,
  enableDiffRenderingInActionMode: false, // Default to disabled
  enableDebugLogging: false, // Default to disabled - enable debug logging for troubleshooting
  maxBuiltInToolsSelection: 64, // Maximum number of built-in tools that can be enabled
  maxMCPToolsSelection: 64, // Maximum number of MCP tools that can be enabled
  planExecutionMode: 'sequential', // Default to sequential execution mode
};

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ProviderConfig<T extends ProviderType = ProviderType> = {
  [K in T['name']]: Extract<T, { name: K }>;
};

// ============================================================================
// Text Editor Tools Interfaces
// ============================================================================

export interface ViewArgs {
  path: string;
  view_range?: [number, number]; // [start_line, end_line], end_line -1 means to end
}

export interface StringReplaceArgs {
  path: string;
  old_str: string;
  new_str: string;
}

export interface CreateArgs {
  path: string;
  file_text: string;
  stream_mode?: boolean; // Enable streaming mode - create file first, then allow updates
  placeholder_content?: string; // Optional placeholder content for stream mode
}

export interface InsertArgs {
  path: string;
  insert_line: number; // 0-based line number
  new_str: string;
}

export interface UndoEditArgs {
  path: string;
}

export interface FileEditResult {
  success: boolean;
  message: string;
  content?: string;
  error?: string;
}

export interface EditCommand {
  name: 'view' | 'str_replace' | 'create' | 'insert' | 'undo_edit';
  args: ViewArgs | StringReplaceArgs | CreateArgs | InsertArgs | UndoEditArgs;
}

export interface FileHistoryEntry {
  content: string;
  timestamp: number;
  operation: string;
}
