/**
 * Settings page translations
 */
import { EN_CATEGORY_TRANSLATIONS } from '../../category-translations';

export const enSettings = {settingsPage: {
		title: 'LLMSider Settings',
		llmProviders: 'LLM Providers',
		addNewProvider: 'Add New Provider',
		configuredProviders: 'Configured Providers',
		advancedSettings: 'Advanced Settings',
		autocompletionSettings: 'Auto-completion Settings',
		language: 'Language',
		languageDesc: 'Select the language for the interface',
		maxChatHistory: 'Max Chat History',
		maxChatHistoryDesc: 'Maximum number of chat sessions to keep',

		// Section titles
		connectionsAndModels: 'Connections & Models',
		addNewConnection: 'Add New Connection',
		configuredConnectionsAndModels: 'Configured Connections and Models',
		uiSettings: 'UI Settings',
		defaultConversationMode: 'Default Conversation Mode',
		defaultConversationModeDesc: 'Select the default conversation mode when starting a new chat session',
		builtInTools: 'Built-in Tools',
		mcpSettings: 'MCP (Model Context Protocol) Settings',

		// Provider details
		modelLabel: 'Model',
		apiKeyLabel: 'API Key',
		baseUrlLabel: 'Base URL',
		regionLabel: 'Region',
		maxTokensLabel: 'Max Tokens',
		temperatureLabel: 'Temperature',
		displayNameLabel: 'Display Name',
		apiKeyConfigured: '••••••••',
		apiKeyNotSet: 'Not set',
		checkmark: '✓',

		// Provider card
		defaultBadge: 'DEFAULT',
		details: 'Details',
		viewDetails: 'View Details',

		// Provider actions
		editProvider: 'Edit provider settings',
		copyProvider: 'Copy provider configuration',
		deleteProvider: 'Delete provider',
		saveChanges: 'Save Changes',
		closeButton: '×',

	// Provider types
	openaiProvider: 'OpenAI',
	anthropicProvider: 'Anthropic',
	qwenProvider: 'Qwen',
	compatibleProvider: 'Compatible',
	azureOpenaiProvider: 'Azure OpenAI',
	ollamaProvider: 'Ollama',
	geminiProvider: 'Gemini',
	groqProvider: 'Groq',

	// Provider-specific labels
	deploymentNameLabel: 'Deployment Name',
	apiVersionLabel: 'API Version',

	// GitHub Copilot Authentication
	githubCopilotAuth: {
		title: '🔒 GitHub Copilot Authentication',
		description: 'GitHub Copilot requires GitHub authentication. Click the button below to start the OAuth flow.',
		alreadyAuthenticated: '✅ Already authenticated with GitHub',
		authenticateButton: 'Authenticate with GitHub',
		reauthenticateButton: 'Re-authenticate',
		authenticatingButton: 'Authenticating...',
		pleaseVisit: 'Please visit',
		andEnterCode: 'and enter code:',
		copyCodeButton: 'Copy Code',
		codeCopied: '✓ Copied!',
		successfullyAuthenticated: '✅ Successfully authenticated as',
		authenticationFailed: 'Authentication failed',
		pleaseAuthenticateFirst: 'Please authenticate with GitHub first',
		retryAuthentication: 'Retry Authentication'
	},		// Empty states
		noProvidersConfigured: 'No providers configured yet. Add your first provider using the buttons above.',
		noBuiltInTools: 'No built-in tools available',
		noMCPServersConfigured: 'No MCP servers configured yet. Use the JSON editor below to add servers.',

	// Checkboxes & toggles
	enabled: 'Enabled',
	supportsVision: 'Supports Vision',
	supportsVisionTooltip: 'Enable this if the model supports image understanding (vision)',
enableTool: 'Enable Tool',
requireConfirmation: 'Require Confirmation',
toolWillRequireConfirmation: 'Tool will show confirmation dialog when called',
toolEnabled: 'Enabled',
toolDisabled: 'Disabled',
toolEnabledTooltip: 'Tool is enabled and available for use',
toolDisabledTooltip: 'Tool is disabled and will not be available',
confirmationRequired: 'Confirm',
autoExecute: 'Auto',
confirmationRequiredTooltip: 'Show confirmation dialog before executing this tool',
autoExecuteTooltip: 'Execute this tool automatically without confirmation',	// MCP related
		mcpManagerNotInitialized: '⚠️ MCP Manager not initialized',
		noServersConnected: '🔴 No servers connected',
		connectedMCPTools: 'Connected MCP Tools',
		configuredMCPServers: 'Configured MCP Servers',
	viewInputSchema: 'View Input Schema',
	mcpDescription: 'Manage your Model Context Protocol server connections',
	saveConfiguration: 'Save Configuration',
	validateJSON: 'Validate JSON',
	deleteMCPServer: 'Delete server',
		deleteMCPServerTitle: 'Delete MCP Server',
		deleteMCPServerConfirm: 'Are you sure you want to delete "{serverId}"?',
		deleteMCPServerWarning: 'This will remove the server configuration. If the server is currently connected, it will be disconnected first.',
		deleteMCPServerCancelBtn: 'Cancel',
		deleteMCPServerDeleteBtn: 'Delete',
	autoStart: 'Auto start',
	manualStart: 'Manual start',
	showTools: 'Show tools',
	connect: 'Connect',
	disconnect: 'Disconnect',
	autoConnect: 'auto-connect',
	manualConnect: 'not auto-connect',
	autoConnectOnStartup: 'Auto Connect on Startup',
	mcpAutoConnectChanged: 'Server "{serverId}" will {status} on startup',
	autoConnectEnabled: 'auto-connect',
	autoConnectDisabled: 'not auto-connect',	// Model management
		models: 'Models',
		addModel: 'Add Model',
		addModelButton: 'Add Model',
		editModel: 'Edit Model for {connectionName}',
		addModelToConnection: 'Add Model to {connectionName}',
		toolsAvailable: 'tools available',
		toolCount: 'tools',
		
		// Model modal
		modelNameLabel: 'Model:',
		customModelName: 'Custom Model Name:',
		customModelOption: 'Custom (enter manually)',
		selectModelHint: 'Select a model or choose "Custom" to enter any model name manually.',
		searchModelHint: 'Type to search models or enter a custom model name',
		searchOrSelectModel: 'Search or enter model name...',
		noModelsFound: 'No models found',
		useCustomModel: 'Use custom model',
		noModelsAvailable: 'No models returned from API. Please enter manually.',
		loadingModels: 'Loading available models...',
		loadingModelDetails: 'Loading model details...',
		modelDetails: 'Model Details',
		modelName: 'Model Name',
		organization: 'Organization',
		description: 'Description',
		createTime: 'Created',
		updateTime: 'Updated',
		modelType: 'Model Type',
		taskType: 'Task Type',
		supportedLanguages: 'Supported Languages',
		contextLength: 'Context Length',
		pricing: 'Pricing',
		outputModalities: 'Output Modalities',
		imageGenerationSupported: 'This model supports image generation!',
		maxInputLength: 'Max Input Length',
		maxOutputLength: 'Max Output Length',
		supportsFunctionCall: 'Supports Function Call',
		yes: 'Yes',
		no: 'No',
		noDetailsAvailable: 'Model details not available',
		failedToLoadDetails: 'Failed to load model details',
		modelNamePlaceholder: 'e.g., gpt-4-turbo',
		displayNamePlaceholder: 'e.g., GPT-4 for Research',
		embeddingModelLabel: 'Embedding Model:',
		embeddingModelTooltip: 'Only enable for OpenAI-compatible embedding API models',
		embeddingModelWarning: '⚠️ Only enable for models with OpenAI-compatible embedding API (e.g., text-embedding-3-small, text-embedding-v3)',
		embeddingModelDesc: 'Enable if this is an embedding model (e.g., text-embedding-3-small)',
		embeddingDimensionLabel: 'Embedding Dimension:',
		embeddingDimensionDesc: 'The dimension of the embedding vectors (must be a positive integer)',
		embeddingDimensionPlaceholder: 'e.g., 1536',
		embeddingDimensionRequired: 'Embedding dimension is required for embedding models',
		embeddingDimensionInvalid: 'Embedding dimension must be a positive integer',
		setAsDefaultLabel: 'Set as Default:',
		modelNameRequired: 'Please select or enter a model name',
		displayNameRequired: 'Display name is required',
		modelNameRequiredInput: 'Model name is required',
		modelSavedSuccess: 'Model "{name}" saved successfully',
		modelSaveFailed: 'Failed to save model',

		// Built-in tool categories
		// Categories - auto-generated from central definition
		categories: EN_CATEGORY_TRANSLATIONS,

		// Quick Chat settings
		quickChat: 'Quick Chat',

		// Other settings
		otherSettings: 'Other Settings',
		autoExecuteDesc: 'Automatically execute this tool without confirmation when called',
		maxBuiltInToolsSelection: 'Max Built-in Tools',
		maxBuiltInToolsSelectionDesc: 'Maximum number of built-in tools that can be enabled (default: 64). Warning: Enabling more than 64 tools may slow down AI response, increase token consumption, and potentially cause AI hallucinations.',
		maxMCPToolsSelection: 'Max MCP Tools',
		maxMCPToolsSelectionDesc: 'Maximum number of MCP tools that can be enabled (default: 64). Warning: Enabling more than 64 tools may slow down AI response, increase token consumption, and potentially cause AI hallucinations.',
		planExecutionMode: 'Plan Execution Mode',
		planExecutionModeDesc: 'Choose how plans are executed in Agent mode. Sequential executes steps one by one (simple & reliable). DAG executes independent steps in parallel with static plan (faster).',
		planExecutionModeSequential: 'Sequential - Step by Step',
		planExecutionModeDAG: 'DAG - Static Parallel',
		planExecutionModeChanged: 'Plan execution mode changed to: {mode}',
		
		// Experimental Features
		experimentalFeatures: 'Experimental Features',

		// Google Search Settings
		webSearchSettings: 'Web Search Settings',
		webSearchSettingsDesc: 'Configure search backends and API keys for web search functionality',
		searchBackend: 'Search Backend',
		searchBackendDesc: 'Select the search service to use.',
		googleBackend: 'Google Custom Search',
		serpapiBackend: 'SerpAPI',
		tavilyBackend: 'Tavily AI Search',
		googleApiKey: 'Google API Key',
		googleApiKeyDesc: 'API key for Google Custom Search. Get it from Google Cloud Console.',
		googleApiKeyPlaceholder: 'Enter your Google API key',
		googleSearchEngineId: 'Search Engine ID',
		googleSearchEngineIdDesc: 'Custom Search Engine ID from Google Programmable Search Engine.',
		googleSearchEngineIdPlaceholder: 'Enter your Search Engine ID',
		serpapiKey: 'SerpAPI Key',
		serpapiKeyDesc: 'API key for SerpAPI. Get it from serpapi.com.',
		serpapiKeyPlaceholder: 'Enter your SerpAPI key',
		tavilyApiKey: 'Tavily API Key',
		tavilyApiKeyDesc: 'API key for Tavily AI Search. Get it from tavily.com (free tier available).',
		tavilyApiKeyPlaceholder: 'Enter your Tavily API key',

		// Memory System Settings
		memory: {
			title: 'Memory System',
			description: 'AI memory management settings for working memory, conversation history, and semantic recall',
			
			// Working Memory
			enableWorkingMemory: 'Enable Working Memory',
			enableWorkingMemoryDesc: 'Store user personal information and preferences, persisted across conversations',
			workingMemoryScope: 'Working Memory Scope',
			workingMemoryScopeDesc: 'Choose the storage scope for memory',
			scopeResource: 'Resource Level (Global)',
			scopeThread: 'Thread Level (Single Session)',
			
			// Conversation History
			enableConversationHistory: 'Enable Conversation History',
			enableConversationHistoryDesc: 'Save recent conversation content for context continuity',
			conversationHistoryLimit: 'Conversation History Limit',
			conversationHistoryLimitDesc: 'Maximum number of conversation messages to retain (default: 10)',
			
			// Conversation Compaction
			enableCompaction: 'Enable Conversation Compaction',
			enableCompactionDesc: 'Automatically compress long conversation histories using intelligent summarization to reduce token usage',
			compactionThreshold: 'Compaction Threshold (Tokens)',
			compactionThresholdDesc: 'Trigger compaction when conversation exceeds this token count (default: 65536)',
			compactionTarget: 'Target Tokens After Compaction',
			compactionTargetDesc: 'Compress conversation to approximately this token count (default: 4000)',
			compactionPreserveCount: 'Preserve Recent Messages',
			compactionPreserveCountDesc: 'Keep this many recent messages unmodified during compaction (default: 4)',
			compactionModel: 'Compaction Model',
			compactionModelDesc: 'Model used for generating conversation summaries (leave empty to use first available model)',
			selectCompactionModel: 'Use First Available Model',
			requiresModel: 'Compaction requires at least one model configuration.',
			
			// Semantic Recall

			
			// Embedding Model
			embeddingModel: 'Embedding Model',
			embeddingModelDesc: 'Embedding model for semantic recall',
			selectEmbeddingModel: 'Please select an Embedding Model',

			
			// Status messages
			settingsSaved: 'Memory settings saved',
			settingsSaveFailed: 'Failed to save Memory settings: {error}',
			requiresVectorDB: 'Semantic recall requires vector database support. Please enable Search Enhancement first.',
			requiresEmbeddingModel: 'Semantic recall requires an embedding model configuration.'
		},

		// Vector Database Settings
		vectorDatabase: {
			title: 'Search Enhancement',
			titleWithStats: 'Search Enhancement ({files} notes, {chunks} vectors, {size})',
			sectionTitle: 'Search Enhancement Settings',
			description: 'Configure local semantic search using Orama vector database. This enables AI-powered context retrieval from your vault.',
			
			// Enable/Disable
			enableSemanticSearch: 'Enable Enhanced Search',
			enableSemanticSearchDesc: 'When enabled, notes will be embedded in the background to support semantic search and similar notes features',
			
			// Similar Notes
			showSimilarNotes: 'Show Similar Notes',
			showSimilarNotesDesc: 'Display similar notes at the bottom of each note based on semantic similarity',
			similarNotesHideByDefault: 'Hide Similar Notes by Default',
			similarNotesHideByDefaultDesc: 'Hide similar notes by default, only show on hover. This keeps your notes clean while maintaining quick access.',
			
			// Stats Display
			statsFiles: 'files',
			statsChunks: 'chunks',
			statsFormat: '{files} {filesLabel} · {chunks} {chunksLabel} · {size}',
			statsLoading: 'Loading...',
			
			// Embedding Model (Remote API only)
			embeddingModel: 'Embedding Model',
			embeddingModelDesc: 'Select the embedding model for generating vector embeddings (remote API only)',
			selectModel: 'Select a model...',

			// Update messages
			updateSuccess: 'Index updated',
			
			// Chunking Strategy
			chunkingStrategy: 'Chunking Strategy',
			chunkingStrategyDesc: 'Choose how documents are split into chunks for indexing',
			strategyCharacter: 'Character-based (Fixed size)',
			strategySemantic: 'Semantic (Structure-aware)',
			
			// Character Strategy Parameters
			chunkSize: 'Chunk Size',
			chunkSizeDesc: 'Number of characters per chunk (default: 1000, range: 100-5000)',
			chunkOverlap: 'Chunk Overlap',
			chunkOverlapDesc: 'Number of overlapping characters between chunks (default: 100, must be less than chunk size)',
			
			// Chunking Strategy Info
			chunkingStrategyInfo: 'Semantic Chunking: Automatically splits by document structure (headings, paragraphs), preserving semantic coherence, no configuration needed, ideal for structured documents. Character Chunking: Splits by fixed character count, requires manual configuration of size and overlap, suitable for scenarios requiring precise chunk granularity.',
			semanticInfo: 'Semantic chunking automatically splits documents by structure (headings, paragraphs), preserving semantic coherence. No need to configure chunk size and overlap.',
			characterInfo: 'Character chunking splits documents by fixed character count. Requires manual configuration of chunk size and overlap, suitable for scenarios requiring precise chunk granularity.',
			
			// Search Results
			searchResults: 'Search Results',
			searchResultsDesc: 'Number of similar chunks to return in search results (default: 5)',
			contextExcerptLength: 'Context Excerpt Length',
			contextExcerptLengthDesc: 'Maximum length of each context excerpt sent to LLM in characters. Shorter excerpts reduce token usage while maintaining relevance. Set to 0 to send full chunk content. (default: 500)',
			
			// Related Files Suggestion
			suggestRelatedFiles: 'Suggest Related Files',
			suggestRelatedFilesDesc: 'When adding files to context, automatically suggest other semantically related files. Suggested files will appear in gray and can be clicked within 5 seconds to confirm.',
			suggestionTimeout: 'Suggestion Timeout',
			suggestionTimeoutDesc: 'Time in milliseconds before suggested files automatically disappear (default: 5000)',
			
			// Storage
			storagePath: 'Storage Path',
			storagePathDesc: 'Path to store vector database files (relative to vault root)',
			indexName: 'Index Name',
			indexNameDesc: 'Name for the vector index',
			
			// Actions
			syncIndex: 'Sync Index',
			rebuildIndex: 'Rebuild Index',
			updateIndex: 'Update Index (Diff)',
			updateIndexDesc: 'Scan vault for changes and update only modified files (differential sync)',
			rebuildIndexFull: 'Rebuild Index (Full)',
			rebuildIndexFullDesc: 'Clear and rebuild entire index from scratch (full rebuild)',
			showStatus: 'Show Status',
			syncing: 'Syncing...',
			rebuilding: 'Rebuilding...',
			pauseIndexing: 'Pause',
			resumeIndexing: 'Resume',
			indexingPaused: 'Indexing paused',
			indexingResumed: 'Indexing resumed',
			
			// Vectorization progress statuses
			scanning: 'Scanning...',
			processingFile: 'Processing file {current}/{total}',
			indexingChunk: 'Indexing chunk {current}/{total}',
			indexingProgress: '{percentage}% ({status})',
			finalizing: '100% (Complete)',
			preparing: 'Preparing...',
			
			// Status Messages
			syncSuccess: 'Vector index synced successfully',
			rebuildSuccess: 'Vector index rebuilt successfully',
			rebuildFullSuccess: 'Full rebuild complete',
			notInitialized: 'Vector database not initialized',
			syncFailed: 'Failed to sync index',
			rebuildFailed: 'Failed to rebuild index',
			rebuildFailedWithError: 'Failed to rebuild vector index: {error}. This may cause incomplete search results. Please check your embedding model settings and try again.',
			embeddingGenerationFailed: 'Failed to generate embeddings. Please verify your embedding model is properly configured and the API is accessible.',
			statusFailed: 'Failed to get status',
			disabledInSettings: 'Vector database is disabled. Please enable it first.',
			initializing: 'Initializing vector database...',
			initFailed: 'Failed to initialize vector database',
			reinitializing: 'Reinitializing with new embedding model...',
			reinitializeSuccess: 'Vector database reinitialized successfully',
			reinitializeFailed: 'Failed to reinitialize',
			rebuildReminder: 'Remember to rebuild the index before using vector search features.',
			
			// Model change confirmation
			modelChangeTitle: 'Embedding Model Changed',
			modelChangeWarning: 'Changing the embedding model requires rebuilding the vector index. If you don\'t rebuild now, enhanced search and other vector-based features may not work properly due to dimension mismatch.',
			modelChangeQuestion: 'Do you want to rebuild the index now?',
			rebuildNow: 'Rebuild Now',
			rebuildLater: 'Later',
			
			// Status Display
			statusTitle: 'Index Status:',
			totalChunks: '• Total chunks: {count}',
			totalFiles: '• Total files: {count}',
			lastSync: '• Last sync: {time}',
			neverSynced: 'Never',
			indexing: '• Indexing: {status}',
			indexingYes: 'Yes',
			indexingNo: 'No',
			error: '• Error: {error}'
		},

		// Tool Management
		toolManagement: {
			title: 'Tool Permissions Management',
			description: 'Control which tools can be executed by the AI. Disabled tools will not be available for use.',
			builtInToolsTitle: 'Built-in Tools',
			builtInToolsDescription: 'Built-in tools provided by the LLMSider plugin. These tools are always available.',
			mcpToolsTitle: 'Connected MCP Tools',
			mcpToolsDescription: 'Tools provided by Model Context Protocol servers. Connect to MCP servers to see available tools.',
			noMCPTools: 'No MCP tools available. Connect to MCP servers to see available tools.',
			
			// Status text
			enabled: 'enabled',
			disabled: 'disabled',
			
			// Category toggle notification
			builtInToolsInCategoryToggled: '{category} category {status}',

			// Global batch actions
			enableAllTools: 'Enable All Tools',
			enableAllToolsDesc: 'Enable all built-in and MCP tools',
			disableAllTools: 'Disable All Tools',
			disableAllToolsDesc: 'Disable all built-in and MCP tools',
			resetAllPermissions: 'Reset All Permissions',
			resetAllPermissionsDesc: 'Reset all tool permissions to default state',
			exportPermissions: 'Export Permissions',
			exportPermissionsDesc: 'Export current tool permissions to file',
			importPermissions: 'Import Permissions',
			importPermissionsDesc: 'Import tool permissions from file',

			// Built-in tools batch actions
			enableAllBuiltIn: 'Enable All Built-in',
			enableAllBuiltInDesc: 'Enable all built-in tools',
			disableAllBuiltIn: 'Disable All Built-in',
			disableAllBuiltInDesc: 'Disable all built-in tools',
			resetBuiltIn: 'Reset Built-in',
			resetBuiltInDesc: 'Reset built-in tool permissions to default',
			
			// Batch action success notifications
			allBuiltInToolsEnabled: 'All built-in tools enabled',
			allBuiltInToolsDisabled: 'All built-in tools disabled',
			builtInToolPermissionsReset: 'Built-in tool permissions reset to default',

			// MCP tools batch actions
			enableAllMCP: 'Enable All MCP',
			enableAllMCPDesc: 'Enable all MCP tools',
			disableAllMCP: 'Disable All MCP',
			disableAllMCPDesc: 'Disable all MCP tools',
			resetMCP: 'Reset MCP',
			resetMCPDesc: 'Reset MCP tool permissions to default',
			
			// Tool selection limits
			builtInToolsLimitReached: 'Cannot enable more tools. Maximum limit of {limit} built-in tools reached.',
			mcpToolsLimitReached: 'Cannot enable more tools. Maximum limit of {limit} MCP tools reached.',
			builtInToolsCategoryLimitExceeded: 'Cannot enable all tools in {category}. Current: {current}, would add {additional}, limit: {limit}.',
			mcpToolsLimitExceeded: 'Cannot enable all MCP tools. Total: {total}, limit: {limit}.',
			toolLimitWarning: 'Enabling more than 64 tools may slow down AI response, increase token consumption, and potentially cause AI hallucinations.'
		},
		
		// MCP Settings actions
		allMCPServersEnabled: 'All MCP servers enabled',
		allMCPServersDisabled: 'All MCP servers disabled',

		// Prompt Management
		promptManagement: {
			title: 'Prompt Management',
			description: 'Manage your built-in and custom prompt templates',
			searchPlaceholder: 'Search prompts...',
			addPrompt: 'Add Prompt',
			builtInPrompts: 'Built-in Prompts',
			customPrompts: 'Custom Prompts',
			builtInBadge: 'BUILT-IN',
			noPromptsLoaded: 'No prompts loaded',
			noPromptsFound: 'No prompts found matching your search',
			
			// Actions
			duplicatePrompt: 'Duplicate prompt',
			editPrompt: 'Edit prompt',
			deletePrompt: 'Delete prompt',
			
			// Modal
			createPromptTitle: 'Create New Prompt',
			editPromptTitle: 'Edit Prompt',
			promptName: 'Prompt Name',
			promptNameDesc: 'A short, descriptive name for the prompt',
			promptNamePlaceholder: 'e.g., Summarize Meeting Notes',
			promptDescription: 'Description',
			promptDescriptionDesc: 'Optional description of what this prompt does',
			promptDescriptionPlaceholder: 'e.g., Creates a structured summary of meeting notes with action items',
			promptContent: 'Prompt Content',
			promptContentDesc: 'The prompt template. Use {} as a placeholder for user input.',
			promptContentPlaceholder: 'e.g., Summarize the following meeting notes: "{}"',
			promptContentInfo: 'Tip: Use {} where you want the selected text or user input to be inserted',
			
			// Buttons
			cancel: 'Cancel',
			confirm: 'Confirm',
			saveChanges: 'Save Changes',
			createPrompt: 'Create',
			
			// Messages
			promptDuplicated: 'Prompt duplicated: {name}',
			promptDeleted: 'Prompt deleted: {name}',
			confirmDelete: 'Are you sure you want to delete "{name}"? This action cannot be undone.',
			
			// Errors
			errorEmptyTitle: 'Prompt name cannot be empty',
			errorEmptyContent: 'Prompt content cannot be empty',
			errorNoManager: 'Prompt manager is not available',
			errorSaving: 'Failed to save prompt. Please try again.'
		}
	},

	// Plan-Execute framework
	planExecute: {
		generating: 'Generating execution plan...',
		regenerating: 'Regenerating step...',
		executingStep: 'Executing step {step} of {total}',
		stepCompleted: 'Step {step} completed successfully',
		allStepsCompleted: 'Complete',
		generatingAnswer: 'Generating final answer...',
		generatingAnswerProgress: 'Generating final answer... ({characters} characters)',
		stopped: 'Plan-Execute process stopped by user',
		maxIterationsReached: 'Maximum iterations reached, stopped to prevent infinite loop',

		// Tracker UI
		tracker: {
			title: 'Execution Plan',
			planTitle: 'Plan',
			historyBadge: 'History',
			stepTitle: 'Step {index}: {title}',
			progressText: '{completed} of {total} completed',
			statusPending: 'Pending',
			statusInProgress: 'In Progress',
			statusCompleted: 'Completed',
			statusSkipped: 'Skipped',
			statusError: 'Error',
			regenerateRetry: 'Regenerate & Retry',
			retry: 'Retry',
			skip: 'Skip',
			showDetails: 'Show Details',
			hideDetails: 'Hide Details',
			executionFailed: 'Plan execution failed',
			inProgress: '{count} in progress',
			failed: '{count} failed',
			executingPlan: 'Executing plan...',
			toolIndex: 'Tool {index}',
			request: 'Request',
			response: 'Response',
			error: 'Error',
			copyRequest: 'Copy request',
			copyResponse: 'Copy response',
			copyError: 'Copy error',
			retryTooltip: 'Retry this step',
			skipTooltip: 'Skip this step and continue',
			regenerateRetryTooltip: 'Regenerate step content and retry',
			stopped: 'Stopped',
			stoppedByUser: 'Execution stopped by user',
			skippedByUser: 'Skipped by user'
		},

		// Execution plan related
		executionPlanGeneration: {
			analyzing: 'Analyzing request and generating execution plan...',
			buildingPlan: 'Building execution plan with steps...',
			planGenerated: 'Plan ready',
			planGenerationFailed: 'Failed to generate execution plan',
			invalidPlan: 'Generated plan is invalid or malformed',
			planTooLong: 'Execution plan is too long, simplifying...',
			planValidation: 'Validating execution plan structure...',
			planExecution: 'Starting execution plan implementation...'
		},

		// Step execution related
		stepExecution: {
			preparingStep: 'Preparing to execute step...',
			preparingStepIcon: '🔄 Preparing to execute...',
			stepLabel: 'Step {step}:',
			executingStepNumber: 'Executing step {step} of {total}...',
			stepExecutionSuccess: 'Step {step} executed successfully',
			stepExecutionFailed: 'Step {step} execution failed: {error}',
			stepValidation: 'Validating step parameters and requirements...',
			stepTimeout: 'Step execution timed out',
			stepSkipped: 'Step skipped due to conditions',
			stepRetrying: 'Retrying step execution...',
			allStepsCompleted: 'Execution complete',
			executionInterrupted: 'Execution interrupted by user or system',
			stepCancelled: 'Step cancelled'
		},

		// Tool execution related
		toolExecution: {
			preparingTool: 'Preparing tool for execution...',
			executingTool: 'Executing tool: {toolName}',
			toolName: 'Tool {toolName}',
			toolExecutionSuccess: 'Tool {toolName} executed successfully',
			toolExecutionFailed: 'Tool {toolName} execution failed: {error}',
			toolNotFound: 'Tool {toolName} not found or unavailable',
			toolTimeout: 'Tool execution timed out',
			toolParameterError: 'Invalid parameters for tool {toolName}',
			toolPermissionDenied: 'Permission denied for tool {toolName}'
		},
		
		// Tool card status labels
		toolCardStatus: {
			awaitingApproval: 'Awaiting Approval',
			executing: 'Executing',
			regenerating: 'Regenerating',
			completed: 'Completed',
			failed: 'Failed'
		},
		
		// Tool card UI labels
		toolCardLabels: {
			parameters: 'Parameters',
			parameterCount: '{count} parameter',
			parametersCount: '{count} parameters',
			aiWantsToExecuteTools: 'AI wants to execute tools',
			toolsToExecute: 'TOOLS TO EXECUTE',
			approveAndExecute: 'Approve & Execute',
			cancel: 'Cancel',
			executing: 'Executing...',
			completed: 'Completed',
			failed: 'Failed'
		},

		// Placeholder error handling
		placeholderError: {
			title: 'Placeholder Replacement Failed',
			regenerateAndTry: 'Regenerate and Try',
			retrying: 'Retrying...'
		},

		// Answer generation related
		answerGeneration: {
			generatingFinalAnswer: 'Generating final answer based on execution results...',
			guidingFinalAnswer: 'Detected tool execution results, guiding to generate final answer...',
			answerGenerated: 'Answer ready',
			answerGenerationFailed: 'Failed to generate final answer',
			summaryGeneration: 'Generating execution summary...',
			resultCompilation: 'Compiling execution results...'
		},

		// Planning agent prompts
		planningPrompt: {
			role: 'Role',
			roleDescription: 'You are a planning agent responsible for generating tool call plans for user requests.',
			rules: 'Rules',
			rule1: 'Do not directly answer user questions.',
			rule2: 'Your task is to output tool call plans, including:',
			rule2a: '- Which tools to call',
			rule2b: '- Tool call sequence',
			rule2c: '- Input for each step call',
			rule2d: '- Reason for each step',
			rule3: 'Each step must have a unique "step_id" for subsequent tracking.',
			rule4: 'Output must strictly follow the specified XML format.',
			rule5: '**Important: For tools involving file operations (such as create, create_file, sed, str_replace, etc.), you must provide all required parameters including a path relative to the Obsidian Vault root directory in the input.**',
			rule5a: '- Use "path" parameter to specify file path',
			rule5b: '- Path format: such as "Notes/Weather Report.md" or "Project/Plan.md"',
			rule5c: '- Do not use absolute paths, only use paths relative to Vault',
			rule5d: '- Check tool parameter list for parameters marked as "(必需)" and ensure all are included in input',
			rule6: '**Placeholder Format: When a step needs to reference output from previous steps, use the following unified format:**',
			rule6a: '- {{step1.output.content}} - Reference the content field from step 1 output',
			rule6b: '- {{step2.output.transformedText}} - Reference the transformedText field from step 2 output',
			rule6c: '- {{stepN.output.fieldName}} - Generic format, N is step number, fieldName is field name',
			rule6d: '- Common fields: content, text, transformedText, location, longitude, latitude, results',
			rule6d2: '- **list_file_directory output**: Use {{stepN.output.listing.files}} for file array, {{stepN.output.listing.folders}} for folder array, or {{stepN.output.listing}} for the entire listing object',
			rule6e: '- Example: {"content": "{{step2.output.transformedText}}"}',
			rule6f: '- **Date Calculation Fields**: When using get_current_time tool with calculate_dates=true, available fields include: date_minus_7, date_minus_14, date_minus_30 (dates for 7/14/30 days ago in YYYY-MM-DD format)',
			rule7: '**Critical: When user mentions local files, existing files, or references to file content (e.g., "based on X.md", "reference the file", "use the content from"), you MUST:**',
			rule7a: '- First use "view" tool to read the referenced file content',
			rule7b: '- Then use that content in subsequent steps',
			rule7c: '- Example: If user says "write an article based on notes.md", your first step must be view("notes.md")',
			rule7d: '- Never assume file content without reading it first with the view tool',
			outputFormat: 'Output Format',
			planExample: 'Then execute each step in sequence:',
			obsidianVaultContext: 'Obsidian Vault Context',
			vaultContextDescription: 'This is an Obsidian plugin environment. When using file creation tools:',
			vaultRule1: '- Must provide "path" parameter, specifying file path relative to Vault root directory',
			vaultRule2: '- File path examples:',
			vaultExample1: '  - "Today\'s Weather.md" (in Vault root directory)',
			vaultExample2: '  - "Diary/2024-01-01.md" (in diary folder)',
			vaultExample3: '  - "Project/Work Plan.md" (in project folder)',
			availableTools: 'Available Tools',
			userQuestion: 'User Question',
			generatePlanAndExecute: 'Please first generate an execution plan, then start executing the first step:',
			// Template placeholders
			templateToolName: '<tool_name>',
			templateInputContent: '<input_content>',
			templateStepReason: '<reason_for_calling_this_tool>',
			templateDependentInput: '{"param": "{{step1.output.fieldName}}"}',
			templateCallReason: '<call_reason>',
			// Action example placeholders
			exampleToolName: 'tool_name',
			exampleParamName: 'param_name',
			exampleParamValue: 'param_value'
		},

		// Final answer prompts
	finalAnswerPrompt: {
		role: 'Role',
		roleDescription: 'You are an intelligent assistant responsible for answering user questions based on tool execution results.',
		input: 'Input',
		toolExecutionResults: 'Tool execution results:',
		rules: 'Rules',
		requirement1: 'Provide accurate and useful answers based on tool execution results',
		requirement2: 'Answer user questions directly, no need to show execution process',
		requirement3: 'If tool results are insufficient to fully answer the question, please state this honestly',
		requirement4: 'Answers should be natural and fluent, like normal conversation',
		originalUserQuestion: 'Original User Question',
		answerBasedOnResults: 'Please answer the user question directly based on the above tool execution results:',
		// New keys for concise final answer
		header: 'Please provide a concise final answer that addresses the user\'s original task.',
		originalTask: 'Original User Task:',
		executionSummary: 'Execution Summary:',
		purpose: 'Purpose',
		error: 'Error',
		unknownError: 'Unknown error',
		noDescription: 'No description',
		success: '✅ Success',
		failed: '❌ Failed',
		basedOnResults: 'Based on the execution results above, please summarize:',
		summaryPoint1: '1. What was accomplished',
		summaryPoint2: '2. Whether the user\'s task was completed successfully',
		summaryPoint3: '3. Any important findings or outputs',
summaryPoint4: '4. Next steps if applicable',
keepConcise: 'Keep your answer focused and concise.'
}
},

// Notification messages
notifications: {
	// Vector database
	vectorDatabase: {
		loaded: 'Vector database loaded',
		initFailed: 'Failed to initialize vector database. Check console for details.',
		notInitialized: 'Vector database not initialized. Enable it in settings first.',
		updatingIndex: 'Updating index (scanning for changes)...',
		updateFailed: 'Index update failed. Check console for details.',
		indexingInProgress: 'Indexing already in progress, please wait...',
		rebuildingIndex: 'Rebuilding entire index from scratch...',
		rebuildFailed: 'Full rebuild failed. Check console for details.',
		rebuildComplete: 'Full rebuild complete: {chunks} chunks indexed ({duration}s)',
		rebuildCompleteWithStats: '✅ Rebuild complete! {files} files, {chunks} chunks indexed. Size: {size}. Duration: {duration}s',
		indexingPaused: 'Indexing paused',
		indexingResumed: 'Indexing resumed',
		// Index progress statuses
		clearingDatabase: 'Clearing database...',
		findingDeletedChunks: 'Finding deleted chunks...',
		applyingChanges: 'Applying changes to database...',
		indexingChunks: 'Indexing chunks...',
		generatingEmbeddings: 'Generating embeddings (batch {current}/{total})',
		savingMetadata: 'Saving metadata...',
		savingDatabase: 'Saving database...',
		// Validation messages
		chunkSizeMin: 'Chunk size must be at least {min}',
		chunkSizeMax: 'Chunk size cannot exceed {max}',
		chunkOverlapAdjusted: 'Chunk overlap adjusted to {overlap} (must be less than chunk size)',
		chunkOverlapMin: 'Chunk overlap must be at least {min}',
		chunkOverlapMax: 'Chunk overlap cannot exceed {max}',
		chunkOverlapLimit: 'Chunk overlap must be less than chunk size ({chunkSize})'
	},
	// Plugin related
	plugin: {
		reloading: '🔧 Reloading plugin...',
		reloadSuccess: '✅ Plugin reloaded successfully!',
		reloadFailed: '❌ Failed to reload plugin: {error}',
		loadFailed: 'Failed to load LLMSider plugin. Check console for details.'
	},
	// Chat related
	chat: {
		openFirst: 'Please open LLMSider chat first',
		contextManagerNotAvailable: 'Context manager not available',
		addContextFailed: 'Failed to add selected text to context',
		openFailed: 'Failed to open chat view. Please try the ribbon icon or command palette.',
		createFailed: 'Unable to create chat view. Try using the ribbon icon.',
		activationFailed: 'Chat view activation failed. Check console for details.'
	},
	// Settings related
	settings: {
		connectionNotFound: 'Connection not found',
		allToolsEnabled: 'All tools enabled',
		allToolsDisabled: 'All tools disabled',
		toolPermissionsReset: 'Tool permissions reset to defaults',
		allToolPermissionsReset: 'All tool permissions reset to defaults',
		toolPermissionsExported: 'Tool permissions exported successfully',
		exportPermissionsFailed: 'Failed to export permissions: {error}',
		importPermissionsFailed: 'Failed to import permissions: {error}'
	},
	// MCP related
	mcp: {
		managerNotAvailable: 'MCP Manager not available',
		noHealthInfo: 'No health information available',
		configPlaceholder: 'Enter MCP configuration in JSON format...',
		configSaved: 'MCP configuration saved successfully',
		connecting: 'Connecting to {serverId}...',
		disconnecting: 'Disconnecting from {serverId}...',
		connected: '✓ Connected to {serverId}',
		disconnected: '✓ Disconnected from {serverId}',
		connectionFailed: 'Failed to connect to servers: {error}',
		autoConnectUpdateFailed: 'Failed to update auto-connect: {error}',
		configImported: 'MCP configuration imported successfully',
		configExported: 'MCP configuration exported successfully',
		connectingAll: 'Connecting to all MCP servers...',
		disconnectedAll: 'Disconnected from all MCP servers',
		validJsonConfig: '✓ Valid JSON configuration with {count} server(s)',
		invalidJsonSyntax: '❌ Invalid JSON syntax: {error}',
		invalidJson: 'Invalid JSON: {error}',
		configurationError: '❌ Configuration error: {error}',
		importFailed: 'Failed to import configuration: {error}',
		exportFailed: 'Failed to export configuration: {error}',
		serverDeleted: 'MCP server "{serverId}" deleted',
		deleteFailed: 'Failed to delete server "{serverId}": {error}',
		managerNotInitialized: 'MCP Manager not initialized',
		connectedToServers: 'Connected to {count} MCP servers',
		connectionFailedCheck: 'Failed to connect to some MCP servers. Check console for details.',
		disconnectAllSuccess: 'Disconnected from all MCP servers',
		disconnectError: 'Error disconnecting from MCP servers. Check console for details.',
		noToolsAvailable: 'No MCP tools available. Make sure servers are connected.',
		listToolsFailed: 'Failed to list MCP tools. Check console for details.',
		serverError: 'MCP Server "{serverId}" error: {error}'
	},
	// Provider related
	provider: {
		modeSwitchingReplaced: 'Mode switching has been replaced with Agent mode toggle in settings',
		notAvailable: 'Provider {displayName} is not available',
		switchedTo: 'Switched to {displayName} provider',

	},
	// Context related
	context: {
		addedToContext: 'Added selected text to context: {preview}',
		filesTooLarge: 'Context files are too large and have been truncated to fit token limits.',
		noTextSelected: 'No text selected. Please select some text first and try again.',
		noActiveNote: 'No active note found. Please make sure a note is open and active.',
		noTextProvided: 'No text provided to add to context',
		noActiveTab: 'No active tab found. Please open an epub book first.',
		noEpubFound: 'No open epub book found in the active tab. Please open an epub book first.',
		epubPageEmpty: 'The epub page appears to be empty.',
		epubExtractFailed: 'Failed to extract content from epub page'
	},
	// File operations
	file: {
		noActiveFile: 'No active file',
		fileAlreadyExists: 'File already exists',
		noteTitleUpdated: 'Note title updated to: {title}',
		failedToUpdateTitle: 'Failed to update note title'
	},
	// Session related
	session: {
		noChatHistory: 'No chat history available',
		sessionLoaded: 'Loaded chat session: {name}'
	},
	// Diff processor related
	diff: {
		noActiveNote: 'No active note found to apply changes to.',
		appliedImprovements: 'Applied improvements to "{filename}"',
		applyFailed: 'Failed to apply changes: {error}',
		copiedToClipboard: 'Content copied to clipboard',
		copyFailed: 'Failed to copy to clipboard',
		contentTooShort: 'Content too short to generate note',
		noAIProvider: 'No AI provider available',
		generatingTitle: 'Generating note title...'
	},
	// UI related
	ui: {
		onlyUserMessagesEditable: 'Only user messages can be edited',
		noTextContentToEdit: 'No text content to edit',
		noActiveSession: 'No active session',
		messageNotFound: 'Message not found',
		failedToEditMessage: 'Failed to edit message',
		errorProcessingDroppedItem: 'Error processing dropped item: {error}',
		unableToProcessDroppedItem: 'Unable to process dropped item',
		failedToAddText: 'Failed to add text: {error}',
		externalFoldersNotSupported: 'External folders are not supported',
		unsupportedFileType: 'Unsupported file type: {ext}',
		failedToReadFile: 'Failed to read file',
		imageCopiedToVault: 'Image copied to vault: {path}',
		failedToCopyImage: 'Failed to copy image to vault',
		failedToAddFile: 'Failed to add file: {error}',
		addedFile: 'Added file: {name}',
		processingDirectory: 'Processing directory "{name}"...',
		errorProcessingDirectory: 'Error processing directory: {error}',
		failedToProcessDirectory: 'Failed to process directory: {error}',
		noDirectorySelected: 'No directory selected',
		tokenLimitExceeded: 'Token limit exceeded. Truncating conversation history to fit within limits.',
		approachingTokenLimit: 'Approaching token limit. Consider starting a new chat if you encounter issues.',
		pleaseOpenChatFirst: 'Please open LLMSider chat first',
		contextManagerNotAvailable: 'Context manager not available',
		errorAddingTextToContext: 'Error adding text to context',
		selectedTextAddedToContext: 'Selected text added to chat context',
		quickChatNotInitialized: 'Quick Chat is not initialized',
		editorNotReady: 'Editor not ready',
		errorOpeningQuickChat: 'Error opening Quick Chat'
	},
	// Tools related
	tools: {
		textReplaced: 'Text replaced in {file} ({count} occurrence{plural})',
		fileCreatedNew: 'Created file: {file}',
		fileOverridden: 'Overrode file: {file}',
		contentInserted: 'Content inserted in {file}',
		sedApplied: 'Sed applied to {file} ({count} lines changed)',
		contentAppended: 'Content appended to {file}',
		lineBeyondLength: 'Line {line} is beyond file length ({count} lines)',
		fileAlreadyExists: 'File already exists, creating: {path}',
		templateNotFound: 'Template file not found: {template}, using provided content only',
		autoOpeningFile: 'No active editor found. Auto-opening most recent file: {file}',
		undoSuccessful: 'Undo successful in {file}',
		redoSuccessful: 'Redo successful in {file}',
		noteMoved: 'Moved "{file}" to "{folder}"',
		notesMoved: 'Moved {count} notes to "{folder}"',
		noteRenamed: 'Renamed to "{name}"',
		notePermanentlyDeleted: 'Permanently deleted "{file}"',
		noteMovedToTrash: 'Moved "{file}" to trash',
		notesMerged: 'Merged "{source}" into "{target}"',
		notesMergedAndDeleted: 'Merged "{source}" into "{target}" and deleted source',
		noteCopied: 'Copied to "{file}"',
		noteDuplicated: 'Created duplicate: "{name}"'
	},
	// Settings handlers related
	settingsHandlers: {
		testFailed: 'Test failed: {error}',
		noToolsAvailable: 'No tools available from {server}',
		failedToGetTools: 'Failed to get tools: {error}',
		failedToDisconnect: 'Failed to disconnect from servers: {error}',
		connectionDeleted: 'Connection "{name}" deleted',
		modelDeleted: 'Model "{name}" deleted',
		autoConnectEnabled: 'Auto-connect enabled for {server}',
		autoConnectDisabled: 'Auto-connect disabled for {server}',
		serverEnabled: 'Server {server} enabled',
		serverDisabled: 'Server {server} disabled',
		invalidVectorDimension: 'Invalid vector dimension. Using default: {dimension}',
		invalidMaxResults: 'Invalid max results. Using default: {count}',
		invalidMinSimilarity: 'Invalid min similarity. Using default: {value}',
		invalidChunkSize: 'Invalid chunk size. Using default: {size}',
		invalidChunkOverlap: 'Invalid chunk overlap. Using default: {overlap}',
		chunkSizeMin: 'Chunk size must be at least {min}',
		chunkSizeMax: 'Chunk size cannot exceed {max}',
		chunkOverlapAdjusted: 'Chunk overlap adjusted to {overlap} (must be less than chunk size)',
		chunkOverlapMin: 'Chunk overlap must be at least {min}',
		chunkOverlapMax: 'Chunk overlap cannot exceed {max}',
		chunkOverlapLimit: 'Chunk overlap must be less than chunk size ({size})',
		noMCPToolsAvailable: 'No MCP tools available',
		failedToListTools: 'Failed to list tools: {error}',
		failedToLoadMCPConfig: 'Failed to load MCP configuration: {error}',
		languageChanged: 'Language changed to {language}',
		connectionEnabled: 'Connection "{name}" enabled',
		connectionDisabled: 'Connection "{name}" disabled'
	},
	// Message renderer related
	messageRenderer: {
		generatingNote: 'Generating note from content...',
		noteGenerated: 'Note generated: {title}',
		errorGeneratingNote: 'Error generating note',
		applyingContent: 'Applying content to note...',
		contentApplied: 'Content applied to: {file}',
		errorApplyingContent: 'Error applying content',
		creatingNote: 'Creating note...',
		noteCreated: 'Note created: {title}',
		errorCreatingNote: 'Error creating note: {error}',
		openingResource: 'Opening resource...',
		resourceOpened: 'Resource opened',
		errorOpeningResource: 'Error opening resource: {error}',
		addingToContext: 'Adding to context...',
		resourceAdded: 'Resource added to context',
		errorAddingResource: 'Error adding resource: {error}',
		contentTooShort: 'Content too short to generate note',
		cannotGenerateFromWorkingIndicator: 'Cannot generate note from working indicator',
		noAIProviderForNote: 'No AI provider available',
		generatingNoteTitle: 'Generating note title...',
		noActiveNoteToApply: 'No active note found to apply changes to',
		noContentToApply: 'No content to apply',
		cannotApplyWorkingIndicator: 'Cannot apply working indicator',
		appliedToEntireFile: 'Applied changes to entire file "{file}"',
		appliedToSelectedText: 'Applied changes to selected text in "{file}"',
		appliedChanges: 'Applied changes to {file}',
		failedToApply: 'Failed to apply changes: {error}',
		addedMCPResource: 'Added MCP resource to context: {name}',
		failedToAddMCPResource: 'Failed to add MCP resource to context',
		noActiveEditor: 'No active editor found',
		insertedAtCursor: 'Inserted at cursor position',
		failedToInsert: 'Failed to insert at cursor'
	},
	// UI Builder related
	uiBuilder: {
		serverEnabledConnected: 'Server "{serverId}" enabled and connected',
		serverDisabledDisconnected: 'Server "{serverId}" disabled and disconnected',
		allMCPServersEnabledConnected: 'All MCP servers enabled and connected',
		allMCPServersDisabledDisconnected: 'All MCP servers disabled and disconnected'
	}
}
};
