/**
 * Memory Manager for Mastra Agents
 * 
 * This module provides a centralized memory management system for Mastra agents,
 * supporting working memory, conversation history, and semantic recall.
 * 
 * Note: Currently using in-memory storage (no persistence) due to compatibility
 * issues with native storage modules in Electron/Obsidian environment.
 * Memory will be preserved during the Obsidian session but lost on restart.
 * 
 * ## Memory Processors
 * 
 * You can use custom processors to filter, transform, and compact messages before
 * they're sent to the LLM. See memory-processors.ts for available processors:
 * 
 * - ConversationCompactor: Intelligently summarizes old messages when token threshold exceeded
 * - ConversationOnlyFilter: Keeps only user/assistant messages
 * - RecentMessagesFilter: Truncates to N most recent messages
 * 
 * Example usage:
 * ```typescript
 * import { ConversationCompactor } from './memory-processors';
 * import { openai } from '@ai-sdk/openai';
 * 
 * const memory = new Memory({
 *   processors: [
 *     new ConversationCompactor({
 *       tokenThreshold: 8000,
 *       targetTokens: 4000,
 *       preserveRecentCount: 4,
 *       modelProvider: () => openai('gpt-4o-mini'),
 *     }),
 *   ],
 * });
 * ```
 */

import { Memory } from '@mastra/memory';
import { Logger } from '../../utils/logger';
import { z } from 'zod';
import LLMSiderPlugin from '../../main';
import { OramaVectorAdapter } from './orama-vector-adapter';
import { OramaStorageAdapter } from './orama-storage-adapter';

/**
 * Working memory template for user preferences and context
 * This template structures what information the agent should remember
 * about users across conversations.
 */
export const DEFAULT_WORKING_MEMORY_TEMPLATE = `# User Profile

## Personal Information
- Name:
- Preferences:
- Communication Style:

## Conversation Context
- Current Topic:
- Active Tasks:
- Important Notes:

## Agent Behavior
- Tool Preferences:
- Response Style:
- Language Preference:

## Session State
- Last Discussed:
- Open Questions:
- Follow-up Items:
`;

/**
 * Structured working memory schema as an alternative to template
 * Use this for type-safe, structured memory access
 */
export const workingMemorySchema = z.object({
	personalInfo: z.object({
		name: z.string().optional(),
		preferences: z.array(z.string()).optional(),
		communicationStyle: z.string().optional(),
	}).optional(),
	
	conversationContext: z.object({
		currentTopic: z.string().optional(),
		activeTasks: z.array(z.string()).optional(),
		importantNotes: z.array(z.string()).optional(),
	}).optional(),
	
	agentBehavior: z.object({
		toolPreferences: z.array(z.string()).optional(),
		responseStyle: z.string().optional(),
		languagePreference: z.string().optional(),
	}).optional(),
	
	sessionState: z.object({
		lastDiscussed: z.string().optional(),
		openQuestions: z.array(z.string()).optional(),
		followUpItems: z.array(z.string()).optional(),
	}).optional(),
});

export type WorkingMemoryData = z.infer<typeof workingMemorySchema>;

/**
 * Configuration options for memory
 */
export interface MemoryConfig {
	/** Storage location for memory database */
	storagePath?: string;
	
	/** Enable working memory (persistent user info) */
	enableWorkingMemory?: boolean;
	
	/** Working memory scope: 'thread' for per-conversation, 'resource' for per-user */
	workingMemoryScope?: 'thread' | 'resource';
	
	/** Use template (markdown) or schema (JSON) for working memory */
	workingMemoryMode?: 'template' | 'schema';
	
	/** Custom working memory template (if mode is 'template') */
	workingMemoryTemplate?: string;
	
	/** Enable conversation history (recent messages) */
	enableConversationHistory?: boolean;
	
	/** Number of recent messages to include */
	conversationHistoryLimit?: number;
	
	/** Enable conversation compaction */
	enableCompaction?: boolean;
	
	/** Token threshold to trigger compaction */
	compactionThreshold?: number;
	
	/** Target token count after compaction */
	compactionTarget?: number;
	
	/** Number of recent messages to preserve unmodified */
	compactionPreserveCount?: number;
	
	/** Model to use for compaction (connectionId::modelId) */
	compactionModel?: string;
	
	/** Enable semantic recall (vector search of past messages) */
	enableSemanticRecall?: boolean;
	
	/** Number of semantically relevant messages to recall */
	semanticRecallLimit?: number;
	
	/** Semantic recall scope: 'thread' for per-conversation, 'resource' for all user threads */
	semanticRecallScope?: 'thread' | 'resource';
	
	/** Embedding model ID for semantic recall (connectionId::modelId format, uses vector DB model if empty) */
	embeddingModelId?: string;
}

/**
 * Memory Manager Class
 * 
 * Provides a centralized interface for creating and managing Mastra Memory
 * instances with consistent configuration across all agents.
 */
export class MemoryManager {
	private plugin: LLMSiderPlugin;
	private config: Required<MemoryConfig>;
	private initialized: boolean = false;

	constructor(plugin: LLMSiderPlugin, config?: MemoryConfig) {
		this.plugin = plugin;
		
		// Read configuration from plugin settings
		const memorySettings = plugin.settings.memorySettings;
		
		// Default configuration (use plugin settings as defaults)
		this.config = {
			storagePath: this.getDefaultStoragePath(),
			enableWorkingMemory: memorySettings.enableWorkingMemory,
			workingMemoryScope: memorySettings.workingMemoryScope,
			workingMemoryMode: 'template',
			workingMemoryTemplate: DEFAULT_WORKING_MEMORY_TEMPLATE,
			enableConversationHistory: memorySettings.enableConversationHistory,
			conversationHistoryLimit: memorySettings.conversationHistoryLimit,
			enableCompaction: memorySettings.enableCompaction,
			compactionThreshold: memorySettings.compactionThreshold,
			compactionTarget: memorySettings.compactionTarget,
			compactionPreserveCount: memorySettings.compactionPreserveCount,
			compactionModel: memorySettings.compactionModel,
			enableSemanticRecall: memorySettings.enableSemanticRecall,
			semanticRecallLimit: memorySettings.semanticRecallLimit,
			semanticRecallScope: 'resource', // Search across all user conversations
			embeddingModelId: memorySettings.embeddingModelId,
			...config,
		};
		
		// Logger.debug('[MemoryManager] Initialized with settings');
	}

	/**
	 * Get default storage path in plugin data directory
	 */
	private getDefaultStoragePath(): string {
		// Use plugin's data directory for memory storage
		const basePath = (this.plugin.app.vault.adapter as any).basePath || '';
		const pluginDir = `${basePath}/.obsidian/plugins/obsidian-llmsider`;
		return `${pluginDir}/agent-memory.db`;
	}

	/**
	 * Initialize the memory manager
	 * Sets the initialized flag - storage is handled by Memory class defaults
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}
		
		this.initialized = true;
	}	/**
	 * Create a Memory instance for an agent
	 * 
	 * @param threadId - Unique identifier for the conversation thread (e.g., chat session ID)
	 * @param resourceId - Unique identifier for the user/resource (e.g., user ID or vault path)
	 * @param customConfig - Optional configuration overrides
	 * @returns Configured Memory instance
	 */
	async createMemory(
		threadId: string,
		resourceId?: string,
		customConfig?: Partial<MemoryConfig>
	): Promise<Memory> {
		if (!this.initialized) {
			await this.initialize();
		}

		// Merge custom config with defaults
		const config = {
			...this.config,
			...customConfig,
		};

		// Build memory options - storage and options are at top level
		const memoryOptions: any = {
			options: {},
		};

		// Configure Orama storage adapter (MUST be at top level, not inside options)
		// ONLY if semantic recall is enabled or vector DB is explicitly requested
		let storageConfigured = false;
		
		// Skip Vector DB initialization if semantic recall is disabled to avoid unnecessary delays
		const needsVectorDB = config.enableSemanticRecall;
		
		if (needsVectorDB) {
			try {
				// Wait for vectorDBManager to be ready (max 5 seconds)
				let vectorDBManager = this.plugin.getVectorDBManager();
				if (!vectorDBManager) {
					const maxWaitTime = 5000;
					const startTime = Date.now();
					
					while (!vectorDBManager && (Date.now() - startTime) < maxWaitTime) {
						await new Promise(resolve => setTimeout(resolve, 100));
						vectorDBManager = this.plugin.getVectorDBManager();
					}
					
					if (!vectorDBManager) {
						Logger.warn('[MemoryManager] Vector DB Manager not ready after timeout');
					}
				}
				
				if (vectorDBManager) {
					const oramaManager = vectorDBManager.getOramaManager();
					if (oramaManager) {
						// Get memory storage directory (same directory as plugin data)
						const basePath = (this.plugin.app.vault.adapter as any).basePath || '';
						const memoryStoragePath = `${basePath}/.obsidian/plugins/obsidian-llmsider/memory-data`;
						
						// Create Orama storage adapter with persistence and add to TOP LEVEL (not in options)
						const storageAdapter = new OramaStorageAdapter(oramaManager, memoryStoragePath);
						memoryOptions.storage = storageAdapter;
						storageConfigured = true;
					}
				}
			} catch (error) {
				Logger.error('[MemoryManager] Failed to setup Orama storage adapter:', error);
			}
		}
		
		// CRITICAL FIX: Provide in-memory storage adapter as fallback if Orama storage failed
		// This prevents the "Memory requires a storage provider" error
		if (!storageConfigured) {
			// Create minimal in-memory storage adapter that satisfies Mastra's requirements
			const threadsMap = new Map();
			const messagesMap = new Map();
			const workingMemoryMap = new Map();
			const resourceWorkingMemoryMap = new Map();
			const resourcesMap = new Map();
			
			const inMemoryStorage: any = {
				// Required properties for Mastra Memory
				name: 'InMemoryStorage',
				supports: {
					selectByIncludeResourceScope: true,
					resourceWorkingMemory: true,
				},
				
				// Storage maps
				threads: threadsMap,
				messages: messagesMap,
				workingMemory: workingMemoryMap,
				
				// Resource working memory interface
				resourceWorkingMemory: {
					async update({ resourceId, workingMemory }: { resourceId: string; workingMemory: string }) {
						resourceWorkingMemoryMap.set(resourceId, workingMemory);
					},
					async get({ resourceId }: { resourceId: string }) {
						return resourceWorkingMemoryMap.get(resourceId) || null;
					}
				},
				
				// Thread management
				async getThreadById({ threadId }: { threadId: string }) {
					return threadsMap.get(threadId) || null;
				},
				async createThread(params: any) {
					const thread = {
						id: params.threadId || `thread-${Date.now()}`,
						threadId: params.threadId || `thread-${Date.now()}`,
						resourceId: params.resourceId,
						title: params.title || 'Untitled',
						metadata: params.metadata || {},
						createdAt: new Date(),
						updatedAt: new Date(),
					};
					threadsMap.set(thread.id, thread);
					threadsMap.set(thread.threadId, thread);
					return thread;
				},
				async saveThread({ thread }: { thread: any }) {
					thread.updatedAt = new Date();
					threadsMap.set(thread.id, thread);
					if (thread.threadId) {
						threadsMap.set(thread.threadId, thread);
					}
					return thread;
				},
				async updateThread({ id, title, metadata }: { id: string; title: string; metadata: any }) {
					const thread = threadsMap.get(id);
					if (!thread) {
						throw new Error(`Thread ${id} not found`);
					}
					thread.title = title;
					thread.metadata = metadata;
					thread.updatedAt = new Date();
					return thread;
				},
				async deleteThread({ threadId }: { threadId: string }) {
					threadsMap.delete(threadId);
					// Clean up messages for this thread
					for (const [key, messages] of messagesMap.entries()) {
						if (key === threadId) {
							messagesMap.delete(key);
						}
					}
				},
				async getThreadsByResourceId({ resourceId }: { resourceId: string }) {
					const threads = Array.from(threadsMap.values()).filter(
						(t: any) => t.resourceId === resourceId
					);
					return threads;
				},
				async validateThreadIsOwnedByResource({ threadId, resourceId }: { threadId: string; resourceId: string }) {
					const thread = threadsMap.get(threadId);
					if (!thread) {
						return false;
					}
					return thread.resourceId === resourceId;
				},
				
				// Message management
				async saveMessages({ messages }: { threadId?: string; messages: any[] }) {
					for (const message of messages) {
						if (!messagesMap.has(message.threadId)) {
							messagesMap.set(message.threadId, []);
						}
						const existing = messagesMap.get(message.threadId)!;
						existing.push(message);
					}
					return messages;
				},
				async getMessages({ threadId, limit }: { threadId: string; limit?: number }) {
					const messages = messagesMap.get(threadId) || [];
					return limit ? messages.slice(-limit) : messages;
				},
				async listMessages(params: any) {
					const messages = messagesMap.get(params.threadId) || [];
					return {
						messages: params.perPage ? messages.slice(0, params.perPage) : messages,
						total: messages.length,
						page: params.page || 0,
						perPage: params.perPage || messages.length,
						hasMore: false,
					};
				},
				async updateMessages({ messages }: { messages: any[] }) {
					for (const message of messages) {
						const threadMessages = messagesMap.get(message.threadId);
						if (threadMessages) {
							const index = threadMessages.findIndex((m: any) => m.id === message.id);
							if (index !== -1) {
								threadMessages[index] = message;
							}
						}
					}
					return messages;
				},
				async deleteMessages(messageIds: string[]) {
					for (const [threadId, messages] of messagesMap.entries()) {
						const filtered = messages.filter((m: any) => !messageIds.includes(m.id));
						messagesMap.set(threadId, filtered);
					}
				},
				
				// Working memory (thread-scoped)
				async updateWorkingMemory({ threadId, workingMemory }: { threadId: string; workingMemory: string }) {
					workingMemoryMap.set(threadId, workingMemory);
				},
				async getWorkingMemory({ threadId }: { threadId: string }) {
					return workingMemoryMap.get(threadId) || null;
				},
				
				// Resource management
				async getResourceById({ resourceId }: { resourceId: string }) {
					if (!resourcesMap.has(resourceId)) {
						const resource = {
							id: resourceId,
							workingMemory: '',
							metadata: {},
							createdAt: new Date(),
							updatedAt: new Date(),
						};
						resourcesMap.set(resourceId, resource);
						return resource;
					}
					return resourcesMap.get(resourceId);
				},
				async updateResource({ resourceId, workingMemory, metadata }: { resourceId: string; workingMemory?: string; metadata?: any }) {
					let resource = resourcesMap.get(resourceId);
					if (!resource) {
						resource = {
							id: resourceId,
							workingMemory: workingMemory || '',
							metadata: metadata || {},
							createdAt: new Date(),
							updatedAt: new Date(),
						};
					} else {
						if (workingMemory !== undefined) {
							resource.workingMemory = workingMemory;
						}
						if (metadata !== undefined) {
							resource.metadata = { ...resource.metadata, ...metadata };
						}
						resource.updatedAt = new Date();
					}
					resourcesMap.set(resourceId, resource);
					return resource;
				},
				async saveResource({ resource }: { resource: any }) {
					resourcesMap.set(resource.id, resource);
					return resource;
				},
				
				// Utility methods
				async init() {},
				// In-memory storage initialized
				selectByIncludeResourceScope() {
					return {
						supportsResourceScope: true,
						supportsThreadScope: true,
					};
				},
			};
			
			memoryOptions.storage = inMemoryStorage;
			Logger.debug('[MemoryManager] ✅ In-memory storage adapter configured');
		}

		// Configure working memory (inside options)
		if (config.enableWorkingMemory) {
			memoryOptions.options.workingMemory = {
				enabled: true,
				scope: config.workingMemoryScope,
			};

			// Use template or schema mode
			if (config.workingMemoryMode === 'template') {
				memoryOptions.options.workingMemory.template = config.workingMemoryTemplate;
			} else {
				memoryOptions.options.workingMemory.schema = workingMemorySchema;
			}
		}

		// Configure conversation history (inside options)
		if (config.enableConversationHistory) {
			memoryOptions.options.lastMessages = config.conversationHistoryLimit;
			
			// Configure conversation compaction processor if enabled
			if (config.enableCompaction) {
				try {
					const { ConversationCompactor } = require('./memory-processors');
					
					// Get model for compaction
					let compactionModelProvider = null;
					const compactionModelId = config.compactionModel;
					
					if (compactionModelId) {
						// Parse connectionId::modelId
						const [connId, modelId] = compactionModelId.split('::');
						
						// Find connection and model config
						const connection = this.plugin.settings.connections.find(c => c.id === connId);
						const modelConfig = this.plugin.settings.models.find(m => m.id === modelId);
						
						if (connection && modelConfig && connection.enabled && modelConfig.enabled) {
							try {
								// Get provider for this connection/model
								const { ProviderFactory } = require('../../utils/provider-factory');
								const providerId = ProviderFactory.generateProviderId(connection.id, modelConfig.id);
								const provider = this.plugin.getProvider(providerId);
								
								if (provider) {
									// Create a function that returns the AI SDK model
									compactionModelProvider = () => (provider as any).model;
									Logger.debug('[MemoryManager] 📝 Compaction model configured:', compactionModelId);
								}
							} catch (error) {
								Logger.error('[MemoryManager] ❌ Failed to get compaction model provider:', error);
							}
						}
					}
					
					// If no model specified or failed to get, use first available enabled model
					if (!compactionModelProvider) {
						const firstConnection = this.plugin.settings.connections.find(c => c.enabled);
						if (firstConnection) {
							const firstModel = this.plugin.settings.models.find(
								m => m.connectionId === firstConnection.id && m.enabled && !m.isEmbedding
							);
							
							if (firstModel) {
								try {
									const { ProviderFactory } = require('../../utils/provider-factory');
									const providerId = ProviderFactory.generateProviderId(firstConnection.id, firstModel.id);
									const provider = this.plugin.getProvider(providerId);
									
									if (provider) {
										compactionModelProvider = () => (provider as any).model;
										Logger.debug('[MemoryManager] 📝 Using first available model for compaction:', 
											`${firstConnection.name} - ${firstModel.name}`);
									}
								} catch (error) {
									Logger.error('[MemoryManager] ❌ Failed to get first available model:', error);
								}
							}
						}
					}
					
					if (compactionModelProvider) {
						// Create ConversationCompactor processor
						const compactor = new ConversationCompactor({
							tokenThreshold: config.compactionThreshold || 65536,
							targetTokens: config.compactionTarget || 4000,
							preserveRecentCount: config.compactionPreserveCount || 4,
							modelProvider: compactionModelProvider,
						});
						
						// Add processor to memory options
						if (!memoryOptions.processors) {
							memoryOptions.processors = [];
						}
						memoryOptions.processors.push(compactor);
						
						Logger.debug('[MemoryManager] ✅ Conversation compaction enabled', {
							threshold: config.compactionThreshold,
							target: config.compactionTarget,
							preserve: config.compactionPreserveCount,
						});
					} else {
						Logger.warn('[MemoryManager] ⚠️  No model available for compaction, disabling');
					}
				} catch (error) {
					Logger.error('[MemoryManager] ❌ Failed to setup conversation compaction:', error);
					// Continue without compaction
				}
			}
		}

		// Configure semantic recall with independent vector storage
		// PATCHED: Mastra Memory now supports function-based embedders via our patch
		// See patches/@mastra+memory+0.15.11.patch
		// NOTE: Memory System uses its own vector storage, independent from Search Enhancement
		if (config.enableSemanticRecall) {
			try {
				// Get vectorDBManager for Orama (used as storage layer, not configuration source)
				const vectorDBManager = this.plugin.getVectorDBManager();
				if (vectorDBManager) {
					const oramaManager = vectorDBManager.getOramaManager();
					if (oramaManager) {
						// Create Orama vector adapter
						const vectorAdapter = new OramaVectorAdapter(oramaManager, 'llmsider-memory-vector');
						
						// Use configured embedding model
						const embeddingModelId = config.embeddingModelId;
						
						if (!embeddingModelId) {
							Logger.error('[MemoryManager] ❌ No embedding model configured for semantic recall');
							Logger.warn('[MemoryManager] ⚠️  Semantic recall will be disabled due to missing embedding model');
						}
						
					// Create embedder function that uses OramaManager
					// With our patch, Mastra Memory now accepts plain functions as embedders
					const embedder = async (text: string): Promise<number[]> => {
						try {
							// Check if OramaManager has connection and model configured
							if (!(oramaManager as any).connection || !(oramaManager as any).model) {
								Logger.warn('[MemoryManager] ⚠️  Orama embedding not ready, returning zero vector');
								const dimension = (oramaManager as any).embeddingDimension;
								if (!dimension) {
									throw new Error('Orama embedding dimension not initialized');
								}
								return new Array(dimension).fill(0);
							}
							// generateEmbeddings expects an array and returns array of embeddings
							const embeddings = await (oramaManager as any).generateEmbeddings([text]);
							return embeddings[0]; // Return first (and only) embedding
						} catch (error) {
							Logger.error('[MemoryManager] ❌ Failed to generate embedding:', error);
							// Return zero vector on error to prevent Memory initialization failure
							const dimension = (oramaManager as any).embeddingDimension;
							if (!dimension) {
								throw new Error('Orama embedding dimension not initialized');
							}
							return new Array(dimension).fill(0);
						}
					};						// Configure semantic recall with vector store and embedder
						memoryOptions.vector = vectorAdapter;
						memoryOptions.embedder = embedder;
						memoryOptions.options.semanticRecall = {
							enabled: true,
							limit: config.semanticRecallLimit,
							scope: config.semanticRecallScope,
						};
						
						Logger.debug('[MemoryManager] 🎯 Semantic recall enabled with Orama vector store and embedder', { embeddingModelId });
					} else {
						Logger.warn('[MemoryManager] ⚠️  Orama Manager not available, semantic recall disabled');
					}
				} else {
					Logger.warn('[MemoryManager] ⚠️  Vector DB Manager not available, semantic recall disabled');
				}
			} catch (error) {
				Logger.error('[MemoryManager] ❌ Failed to setup vector store for semantic recall:', error);
				// Continue without semantic recall
			}
		}

		// Verify memoryOptions structure before creating Memory instance
		Logger.debug('[MemoryManager] 🔍 Final memoryOptions structure:', {
			hasStorage: !!memoryOptions.storage,
			storageType: memoryOptions.storage?.constructor?.name || 'undefined',
			hasOptions: !!memoryOptions.options,
			workingMemoryEnabled: memoryOptions.options?.workingMemory?.enabled,
			conversationHistoryLimit: memoryOptions.options?.lastMessages,
			semanticRecallEnabled: !!memoryOptions.options?.ragIntegration
		});
		
		// Log full memoryOptions keys to debug what's being passed
		Logger.debug('[MemoryManager] 🔍 memoryOptions keys:', Object.keys(memoryOptions));
		Logger.debug('[MemoryManager] 🔍 memoryOptions.options keys:', memoryOptions.options ? Object.keys(memoryOptions.options) : 'none');

		const memory = new Memory(memoryOptions);
		
		Logger.debug('[MemoryManager] Memory instance created successfully');
		Logger.debug('[MemoryManager] 🔍 Memory instance storage check (before manual assignment):', {
			hasStorage: !!(memory as any).storage,
			storageType: (memory as any).storage?.constructor?.name || 'undefined'
		});
		
		// WORKAROUND: If Memory constructor didn't properly assign storage, do it manually
		if (memoryOptions.storage && !(memory as any).storage) {
			Logger.warn('[MemoryManager] ⚠️  Memory constructor did not assign storage, fixing manually...');
			(memory as any).storage = memoryOptions.storage;
			Logger.debug('[MemoryManager] ✅ Storage manually assigned:', {
				hasStorage: !!(memory as any).storage,
				storageType: (memory as any).storage?.constructor?.name || 'undefined'
			});
		}
		
		// Additional check: Ensure storage has resourceWorkingMemory property
		if ((memory as any).storage) {
			Logger.debug('[MemoryManager] 🔍 Storage feature check:', {
				hasResourceWorkingMemory: !!(memory as any).storage.resourceWorkingMemory,
				resourceWorkingMemoryType: typeof (memory as any).storage.resourceWorkingMemory,
				storageKeys: Object.keys((memory as any).storage)
			});
		}
		
		// Initialize storage if it has an init method
		if (memoryOptions.storage?.init) {
			await memoryOptions.storage.init();
		}
		
		return memory;
	}

	/**
	 * Create or retrieve a thread for memory storage
	 * 
	 * @param threadId - Unique thread identifier
	 * @param resourceId - Unique resource identifier
	 * @param title - Thread title (optional)
	 * @param initialMemory - Initial working memory content (optional)
	 */
	async createThread(
		memory: Memory,
		threadId: string,
		resourceId?: string,
		title?: string,
		initialMemory?: string
	): Promise<any> {
		Logger.debug('[MemoryManager] 🧵 Creating thread...');
		try {
			const threadOptions: any = {
				threadId,
				title: title || `Thread ${threadId}`,
			};

			Logger.debug('[MemoryManager] Thread options:', {
				threadId,
				title: threadOptions.title,
				resourceId: resourceId || '(none)',
				hasInitialMemory: !!initialMemory
			});

			if (resourceId) {
				threadOptions.resourceId = resourceId;
			}

			// Set initial working memory if provided
			if (initialMemory) {
				threadOptions.metadata = {
					workingMemory: initialMemory,
				};
				Logger.debug('[MemoryManager] Initial memory length:', initialMemory.length);
			}

			const thread = await memory.createThread(threadOptions);
			
			Logger.debug('[MemoryManager] ✅ Thread created successfully:', {
				threadId,
				resourceId: resourceId || '(none)',
				hasInitialMemory: !!initialMemory,
			});

			return thread;
		} catch (error) {
			Logger.error('[MemoryManager] ❌ Failed to create thread:', error);
			if (error instanceof Error) {
				Logger.error('[MemoryManager] Thread creation error details:', {
					name: error.name,
					message: error.message,
					threadId,
					resourceId: resourceId || '(none)'
				});
			}
			throw error;
		}
	}

	/**
	 * Update working memory for a thread
	 */
	async updateWorkingMemory(
		memory: Memory,
		threadId: string,
		resourceId: string | undefined,
		content: string
	): Promise<void> {
		try {
			await memory.updateWorkingMemory({
				threadId,
				resourceId,
				workingMemory: content,
			});

			Logger.debug('[MemoryManager] Working memory updated:', { threadId, resourceId });
		} catch (error) {
			Logger.error('[MemoryManager] Failed to update working memory:', error);
			throw error;
		}
	}

	/**
	 * Get working memory for a thread
	 */
	async getWorkingMemory(
		memory: Memory,
		threadId: string,
		resourceId?: string
	): Promise<string | null> {
		try {
			// Implementation depends on Mastra API
			// This is a placeholder - check actual Mastra memory API
			Logger.debug('[MemoryManager] Getting working memory:', { threadId, resourceId });
			return null; // Placeholder
		} catch (error) {
			Logger.error('[MemoryManager] Failed to get working memory:', error);
			return null;
		}
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<MemoryConfig>): void {
		this.config = {
			...this.config,
			...config,
		};
		// Logger.debug('[MemoryManager] Configuration updated:', config);
	}

	/**
	 * Get current configuration
	 */
	getConfig(): Required<MemoryConfig> {
		return { ...this.config };
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		// Logger.debug('[MemoryManager] Disposing resources');
		
		// Clear conversation cache to free memory
		this.clearCache();
		
		// Clear configuration
		this.config = null as any;
		
		// Clear plugin reference
		this.plugin = null as any;
		
		this.initialized = false;
		// Logger.debug('[MemoryManager] All resources disposed');
	}

	// ========== Simplified API for chat-view.ts ==========

	/**
	 * Simplified API: Create memory with object parameter
	 * This is a convenience method for common usage patterns
	 */
	async createMemorySimple(options: {
		resourceId: string;
		threadId: string;
		enableWorkingMemory?: boolean;
		conversationHistoryCount?: number;
		semanticRecallCount?: number;
		title?: string;
	}): Promise<Memory> {
		// Logger.debug('[MemoryManager] Simplified API: createMemorySimple called');
		// Logger.debug('[MemoryManager] Options:', options);

		// Create memory instance using the full API
		// Explicitly pass enableConversationHistory to ensure it's applied
		const memory = await this.createMemory(
			options.threadId,
			options.resourceId,
			{
				enableWorkingMemory: options.enableWorkingMemory ?? true,
				enableConversationHistory: options.conversationHistoryCount !== undefined && options.conversationHistoryCount > 0,
				conversationHistoryLimit: options.conversationHistoryCount ?? 10,
				enableSemanticRecall: options.semanticRecallCount !== undefined && options.semanticRecallCount > 0,
				semanticRecallLimit: options.semanticRecallCount ?? 5,
			}
		);

		// CRITICAL: Ensure thread exists in storage before returning memory
		// This prevents "No thread found" errors when calling memory.query()
		try {
			const existingThread = await memory.getThreadById({ threadId: options.threadId });
			if (!existingThread) {
				// Logger.debug('[MemoryManager] Thread does not exist, creating it now...');
				await memory.createThread({
					threadId: options.threadId,
					resourceId: options.resourceId,
					title: options.title || `Session ${options.threadId}`,
				});
				// Logger.debug('[MemoryManager] Thread created in storage');
			} else {
				// Logger.debug('[MemoryManager] Thread already exists in storage');
			}
		} catch (error) {
			Logger.warn('[MemoryManager] ⚠️  Failed to ensure thread exists:', error);
			// Continue anyway - query() will handle missing thread gracefully
		}

		// Logger.debug('[MemoryManager] Simplified API: Memory created');
		return memory;
	}

	/**
	 * Simplified API: Create thread with object parameter
	 * This method just ensures the manager is initialized
	 */
	async createThreadSimple(options: {
		resourceId: string;
		threadId: string;
		title?: string;
	}): Promise<void> {
		// Logger.debug('[MemoryManager] Simplified API: createThreadSimple called');
		// Logger.debug('[MemoryManager] Options:', options);

		if (!this.initialized) {
			await this.initialize();
		}

		// Initialize memory path for conversation history
		if (!this.memoryPath) {
			const basePath = (this.plugin.app.vault.adapter as any).basePath || '';
			this.memoryPath = `${basePath}/.obsidian/plugins/obsidian-llmsider/memory-data`;
		}

		// Ensure conversations directory exists for conversation history
		const fs = require('fs');
		const conversationsDir = `${this.memoryPath}/conversations`;
		if (!fs.existsSync(conversationsDir)) {
			fs.mkdirSync(conversationsDir, { recursive: true });
		}

		// Try to create thread in vector storage if available (for semantic recall)
		const vectorDBManager = this.plugin.getVectorDBManager();
		if (vectorDBManager) {
			try {
				const oramaManager = vectorDBManager.getOramaManager();
				if (oramaManager) {
					// Get memory storage directory
					const memoryStoragePath = `${this.memoryPath}`;
					
					// Create storage adapter
					const storageAdapter = new OramaStorageAdapter(oramaManager, memoryStoragePath);
					await storageAdapter.init(); // Ensure storage is initialized

					// Check if thread already exists
					const existingThread = await storageAdapter.getThreadById({ threadId: options.threadId });
					if (!existingThread) {
						// Create the thread in storage
						await storageAdapter.createThread({
							threadId: options.threadId,
							resourceId: options.resourceId,
							title: options.title || `Session ${options.threadId}`,
						});
						// Logger.debug('[MemoryManager] Thread created in vector storage:', options.threadId);
					} else {
						// Logger.debug('[MemoryManager] Thread already exists in vector storage:', options.threadId);
					}
				}
			} catch (error) {
				// Logger.debug('[MemoryManager] Could not create thread in vector storage (conversation history will still work):', error);
			}
		} else {
			// Logger.debug('[MemoryManager] Vector DB not available, thread will use file-based conversation history only');
		}

		// Logger.debug('[MemoryManager] Simplified API: Thread initialization complete');
	}

	// ========== Conversation History Management ==========

	private memoryPath: string = '';
	private defaultThreadId: string = 'default';
	// LRU缓存 - 最多缓存20个会话，避免重复读取文件
	private conversationCache: Map<string, {
		data: Array<{
			role: string;
			content: string;
			toolCalls?: unknown[];
			timestamp: number;
			threadId: string;
		}>;
		timestamp: number;
	}> = new Map();
	private readonly MAX_CACHE_SIZE = 20;
	private readonly MAX_MESSAGES_PER_SESSION = 200; // 单个会话最多保留200条消息
	private readonly CACHE_TTL = 5 * 60 * 1000; // 缓存5分钟

	/**
	 * Get conversation messages for a specific thread
	 * This reads directly from persistent storage (JSON file)
	 */
	async getConversationMessages(threadId: string): Promise<Array<{
		id?: string;
		role: string;
		content: string;
		toolCalls?: unknown[];
		timestamp: number;
		metadata?: unknown;
	}>> {
		try {
			// Logger.debug('[MemoryManager] Getting conversation messages for thread:', threadId);
			
			// Get conversation file path
			const conversationPath = this.getConversationPath(threadId);
			
			// Load conversations from file
			const conversations = await this.loadConversations(conversationPath);
			
			// Logger.debug('[MemoryManager] Retrieved conversation messages');
			
			return conversations;
		} catch (error) {
			Logger.error('[MemoryManager] Failed to get conversation messages:', error);
			return [];
		}
	}

	/**
	 * Get messages for a thread (compatible with MastraAgent)
	 */
	async getMessages(threadId: string, resourceId?: string): Promise<any[]> {
		return this.getConversationMessages(threadId);
	}

	/**
	 * Save messages for a thread (compatible with MastraAgent)
	 * This overwrites the existing messages
	 */
	async saveMessages(threadId: string, resourceId: string, messages: any[]): Promise<void> {
		try {
			const conversationPath = this.getConversationPath(threadId);
			
			// Ensure each message has the correct threadId
			const messagesWithThreadId = messages.map(msg => ({
				...msg,
				threadId: threadId
			}));
			
			await this.saveConversations(conversationPath, messagesWithThreadId);
		} catch (error) {
			Logger.error('[MemoryManager] Failed to save messages:', error);
			throw error;
		}
	}

	/**
	 * Add a conversation message to history
	 */
	async addConversationMessage(
		message: { role: string; content: string; toolCalls?: unknown[] },
		threadId?: string
	): Promise<void> {
		try {
			const effectiveThreadId = threadId || this.defaultThreadId;
			if (!effectiveThreadId) {
				Logger.warn('[MemoryManager] No threadId provided for conversation message, skipping');
				return;
			}

			// Logger.debug('[MemoryManager] Adding conversation message');

			// Get conversation file path
			const conversationPath = this.getConversationPath(effectiveThreadId);

			// Load existing conversations
			const conversations = await this.loadConversations(conversationPath);

			// Add new message with timestamp
			conversations.push({
				role: message.role,
				content: message.content,
				toolCalls: message.toolCalls,
				timestamp: Date.now(),
				threadId: effectiveThreadId
			});

			// Save updated conversations
			await this.saveConversations(conversationPath, conversations);

			// Logger.debug('[MemoryManager] Conversation message added successfully');
		} catch (error) {
			Logger.error('[MemoryManager] Failed to add conversation message:', error);
		}
	}

	/**
	 * Get conversation history
	 */
	async getConversationHistory(
		threadId?: string,
		limit?: number
	): Promise<Array<{ role: string; content: string; timestamp: number; toolCalls?: unknown[] }>> {
		try {
			const effectiveThreadId = threadId || this.defaultThreadId;
			if (!effectiveThreadId) {
				Logger.warn('[MemoryManager] No threadId provided for conversation history, returning empty');
				return [];
			}

			// Logger.debug('[MemoryManager] Getting conversation history');

			const conversationPath = this.getConversationPath(effectiveThreadId);
			const conversations = await this.loadConversations(conversationPath);

			// Apply limit if specified (return most recent messages)
			if (limit && limit > 0) {
				const recentMessages = conversations.slice(-limit);
				// Logger.debug('[MemoryManager] Returning limited conversation history');
				return recentMessages;
			}

			// Logger.debug('[MemoryManager] Returning full conversation history');
			return conversations;
		} catch (error) {
			Logger.error('[MemoryManager] Failed to get conversation history:', error);
			return [];
		}
	}

	/**
	 * Get conversation file path for a thread
	 */
	private getConversationPath(threadId: string): string {
		// Initialize memory path if not set
		if (!this.memoryPath) {
			const basePath = (this.plugin.app.vault.adapter as any).basePath || '';
			this.memoryPath = `${basePath}/.obsidian/plugins/obsidian-llmsider/memory-data`;
		}
		return `${this.memoryPath}/conversations/${threadId}.json`;
	}

	/**
	 * Load conversations from file using Node.js fs module
	 * With LRU cache to avoid repeated file reads
	 */
	private async loadConversations(path: string): Promise<Array<{
		role: string;
		content: string;
		toolCalls?: unknown[];
		timestamp: number;
		threadId: string;
	}>> {
		try {
			// Extract thread ID from path for cache key
			const threadId = path.split('/').pop()?.replace('.json', '') || 'unknown';

			// Check cache first
				const cached = this.conversationCache.get(threadId);
				if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
					return cached.data;
				}			const fs = require('fs');

			// Check if file exists using Node.js fs
			if (!fs.existsSync(path)) {
				// Logger.debug('[MemoryManager] Conversation file does not exist, returning empty array:', path);
				return [];
			}

			// Read file using Node.js fs
			const content = await fs.promises.readFile(path, 'utf8');
			
			// Try to parse JSON
			let conversations;
			try {
				conversations = JSON.parse(content);
			} catch (parseError) {
				Logger.warn('[MemoryManager] JSON parse failed, attempting to repair corrupted file:', path);
				
				// Try to repair by removing trailing garbage
				const trimmedContent = content.trim();
				
				// Find the last valid closing bracket
				let lastValidBracket = -1;
				let bracketCount = 0;
				for (let i = 0; i < trimmedContent.length; i++) {
					if (trimmedContent[i] === '[') bracketCount++;
					if (trimmedContent[i] === ']') {
						bracketCount--;
						if (bracketCount === 0) {
							lastValidBracket = i;
							break;
						}
					}
				}
				
				if (lastValidBracket > 0) {
					const repairedContent = trimmedContent.substring(0, lastValidBracket + 1);
					try {
						conversations = JSON.parse(repairedContent);
						Logger.info('[MemoryManager] Successfully repaired corrupted JSON file');
						
						// Save the repaired version
						await fs.promises.writeFile(path, JSON.stringify(conversations, null, 2), 'utf8');
					} catch (repairError) {
						Logger.error('[MemoryManager] Failed to repair JSON, backing up and returning empty array');
						
						// Backup corrupted file
						const backupPath = path.replace('.json', `.corrupted-${Date.now()}.json`);
						await fs.promises.writeFile(backupPath, content, 'utf8');
						
						// Reset to empty array
						await fs.promises.writeFile(path, '[]', 'utf8');
						return [];
					}
				} else {
					Logger.error('[MemoryManager] Could not repair JSON, backing up and returning empty array');
					
					// Backup corrupted file
					const backupPath = path.replace('.json', `.corrupted-${Date.now()}.json`);
					await fs.promises.writeFile(backupPath, content, 'utf8');
					
					// Reset to empty array
					await fs.promises.writeFile(path, '[]', 'utf8');
					return [];
				}
			}

			if (!Array.isArray(conversations)) {
				Logger.warn('[MemoryManager] Invalid conversation file format, returning empty array');
				return [];
			}

			// Update cache with LRU eviction
			this.updateCache(threadId, conversations);

			return conversations;
		} catch (error) {
			Logger.error('[MemoryManager] Failed to load conversations:', error);
			return [];
		}
	}

	/**
	 * Save conversations to file using Node.js fs module
	 * With message limit and cache update
	 */
	private async saveConversations(path: string, conversations: Array<{
		role: string;
		content: string;
		toolCalls?: unknown[];
		timestamp: number;
		threadId: string;
	}>): Promise<void> {
		try {
			const fs = require('fs');
			const dirPath = path.substring(0, path.lastIndexOf('/'));

			// Extract thread ID from path
			const threadId = path.split('/').pop()?.replace('.json', '') || 'unknown';

			// 限制消息数量 - 只保留最新的N条消息
			let limitedConversations = conversations;
			if (conversations.length > this.MAX_MESSAGES_PER_SESSION) {
				const removed = conversations.length - this.MAX_MESSAGES_PER_SESSION;
				limitedConversations = conversations.slice(-this.MAX_MESSAGES_PER_SESSION);
				// Logger.debug(`[MemoryManager] Trimmed ${removed} old messages from session ${threadId}`);
			}

			// Ensure directory exists using Node.js fs (more reliable than vault.adapter)
			if (!fs.existsSync(dirPath)) {
				fs.mkdirSync(dirPath, { recursive: true });
			}

			// Write conversations to file using Node.js fs
			const content = JSON.stringify(limitedConversations, null, 2);
			await fs.promises.writeFile(path, content, 'utf8');

			// Update cache after successful save
			this.updateCache(threadId, limitedConversations);

			// Logger.debug('[MemoryManager] Conversations saved successfully');
		} catch (error) {
			Logger.error('[MemoryManager] Failed to save conversations:', error);
			throw error;
		}
	}

	/**
	 * Set default thread ID for conversation history operations
	 */
	setDefaultThreadId(threadId: string): void {
		this.defaultThreadId = threadId;
	}

	/**
	 * Clear conversation history for a thread using Node.js fs module
	 */
	async clearConversationHistory(threadId?: string): Promise<void> {
		try {
			const fs = require('fs');
			const effectiveThreadId = threadId || this.defaultThreadId;
			if (!effectiveThreadId) {
				Logger.warn('[MemoryManager] No threadId provided for clearing history');
				return;
			}

			const conversationPath = this.getConversationPath(effectiveThreadId);

			// Remove from cache
			this.conversationCache.delete(effectiveThreadId);

			// Check and delete using Node.js fs
			if (fs.existsSync(conversationPath)) {
				await fs.promises.unlink(conversationPath);
				// Logger.debug('[MemoryManager] Conversation history cleared:', effectiveThreadId);
			} else {
				// Logger.debug('[MemoryManager] No conversation history to clear:', effectiveThreadId);
			}
		} catch (error) {
			Logger.error('[MemoryManager] Failed to clear conversation history:', error);
		}
	}

	/**
	 * Update cache with LRU eviction
	 */
	private updateCache(threadId: string, data: Array<{
		role: string;
		content: string;
		toolCalls?: unknown[];
		timestamp: number;
		threadId: string;
	}>): void {
		// Implement LRU: delete oldest entry if cache is full
		if (this.conversationCache.size >= this.MAX_CACHE_SIZE) {
			let oldestKey: string | null = null;
			let oldestTime = Date.now();

			for (const [key, value] of this.conversationCache.entries()) {
				if (value.timestamp < oldestTime) {
					oldestTime = value.timestamp;
					oldestKey = key;
				}
			}

			if (oldestKey) {
				this.conversationCache.delete(oldestKey);
				// Logger.debug('[MemoryManager] Evicted oldest cache entry:', oldestKey);
			}
		}

		// Add or update cache entry
		this.conversationCache.set(threadId, {
			data,
			timestamp: Date.now()
		});
	}

	/**
	 * Clear all caches (useful for memory cleanup)
	 */
	clearCache(): void {
		this.conversationCache.clear();
	}

	/**
	 * Cleanup old conversation files (older than specified days)
	 */
	async cleanupOldConversations(daysToKeep: number = 30): Promise<number> {
		try {
			const fs = require('fs');
			const path = require('path');

			if (!this.memoryPath) {
				Logger.warn('[MemoryManager] Memory path not initialized');
				return 0;
			}

				const conversationsDir = `${this.memoryPath}/conversations`;
				if (!fs.existsSync(conversationsDir)) {
					return 0;
				}			const files = await fs.promises.readdir(conversationsDir);
			const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
			let deletedCount = 0;

			for (const file of files) {
				if (!file.endsWith('.json')) continue;

				const filePath = path.join(conversationsDir, file);
				const stats = await fs.promises.stat(filePath);

				// Delete if older than cutoff
				if (stats.mtimeMs < cutoffTime) {
					await fs.promises.unlink(filePath);
					const threadId = file.replace('.json', '');
					this.conversationCache.delete(threadId);
					deletedCount++;
					// Logger.debug('[MemoryManager] Deleted old conversation:', file);
				}
			}

			if (deletedCount > 0) {
				Logger.info(`[MemoryManager] Cleaned up ${deletedCount} old conversations`);
			}

			return deletedCount;
		} catch (error) {
			Logger.error('[MemoryManager] Failed to cleanup old conversations:', error);
			return 0;
		}
	}
}

/**
 * Helper function to generate a resource ID based on the vault
 * This ensures memory is scoped to the current vault/user
 */
export function generateResourceId(plugin: LLMSiderPlugin): string {
	// Use vault path or name as resource identifier
	const vaultName = plugin.app.vault.getName();
	const vaultPath = (plugin.app.vault.adapter as any).basePath || '';

	// Create a stable identifier for this vault
	const resourceId = `vault:${vaultName}:${vaultPath.split('/').pop() || 'default'}`;
	Logger.debug('[MemoryManager] Generated resource ID:', resourceId);
	return resourceId;
}
