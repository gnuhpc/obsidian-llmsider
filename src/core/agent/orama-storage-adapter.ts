/**
 * Orama Storage Adapter for Mastra Memory
 * 
 * This adapter bridges OramaManager to Mastra's MastraStorage interface,
 * allowing Orama to be used as the storage backend for Memory.
 */

import { Logger } from '../../utils/logger';
import { OramaManager } from '../../vector/oramaManager';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Thread data structure for memory storage
 */
export interface StorageThread {
	id: string;
	resourceId?: string;
	title?: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Message data structure for memory storage
 */
export interface StorageMessage {
	id: string;
	threadId: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
	metadata?: Record<string, unknown>;
	createdAt: Date;
}

/**
 * Orama Storage Adapter
 * 
 * Implements Mastra's storage interface using Orama as the backend.
 * Stores threads and messages as documents in Orama's vector database.
 */
/**
 * Resource data structure for working memory
 */
export interface StorageResource {
	id: string;
	workingMemory?: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export class OramaStorageAdapter {
	private oramaManager: OramaManager;
	private storagePath: string;
	
	// Static caches shared across all adapter instances for persistence
	private static threadsCache: Map<string, StorageThread> = new Map();
	private static messagesCache: Map<string, StorageMessage> = new Map();
	private static resourcesCache: Map<string, StorageResource> = new Map();
	private static isLoaded: boolean = false;

	// Mastra Memory requires a 'supports' object to check storage capabilities
	public readonly supports = {
		selectByIncludeResourceScope: true,
		resourceWorkingMemory: true,
	};

	// Mastra Memory also requires a 'name' property for error messages
	public readonly name = 'OramaStorageAdapter';

	constructor(oramaManager: OramaManager, storagePath: string) {
		this.oramaManager = oramaManager;
		this.storagePath = storagePath;
		Logger.debug('[OramaStorage] Adapter initialized');
	}

	/**
	 * Get persistence file path for working memory (resources)
	 */
	private getWorkingMemoryPath(): string {
		return path.join(this.storagePath, 'working-memory.json');
	}

	/**
	 * Get persistence file path for conversation history (threads and messages)
	 */
	private getConversationHistoryPath(): string {
		return path.join(this.storagePath, 'conversation-history.json');
	}

	/**
	 * Load persisted data from disk (separated into working memory and conversation history)
	 */
	private async loadPersistedData(): Promise<void> {
		if (OramaStorageAdapter.isLoaded) {
			Logger.debug('[OramaStorage] Data already loaded, skipping');
			return;
		}

		// Load working memory (resources)
		try {
			const workingMemoryPath = this.getWorkingMemoryPath();
			const data = await fs.readFile(workingMemoryPath, 'utf-8');
			const parsed = JSON.parse(data);

			// Restore resources
			if (parsed.resources) {
				for (const [id, resource] of Object.entries(parsed.resources as Record<string, any>)) {
					OramaStorageAdapter.resourcesCache.set(id, {
						...resource,
						createdAt: new Date(resource.createdAt),
						updatedAt: new Date(resource.updatedAt),
					});
				}
			}

			Logger.debug('[OramaStorage] Loaded working memory data:', {
				resources: OramaStorageAdapter.resourcesCache.size,
			});
		} catch (error: any) {
			if (error.code === 'ENOENT') {
				Logger.debug('[OramaStorage] No working memory data found, starting fresh');
			} else {
				Logger.error('[OramaStorage] Failed to load working memory data:', error);
			}
		}

		// Load conversation history (threads and messages)
		try {
			const conversationHistoryPath = this.getConversationHistoryPath();
			const data = await fs.readFile(conversationHistoryPath, 'utf-8');
			const parsed = JSON.parse(data);

			// Restore threads
			if (parsed.threads) {
				for (const [id, thread] of Object.entries(parsed.threads as Record<string, any>)) {
					OramaStorageAdapter.threadsCache.set(id, {
						...thread,
						createdAt: new Date(thread.createdAt),
						updatedAt: new Date(thread.updatedAt),
					});
				}
			}

			// Restore messages
			if (parsed.messages) {
				for (const [id, message] of Object.entries(parsed.messages as Record<string, any>)) {
					OramaStorageAdapter.messagesCache.set(id, {
						...message,
						createdAt: new Date(message.createdAt),
					});
				}
			}

			Logger.debug('[OramaStorage] Loaded conversation history data:', {
				threads: OramaStorageAdapter.threadsCache.size,
				messages: OramaStorageAdapter.messagesCache.size,
			});
		} catch (error: any) {
			if (error.code === 'ENOENT') {
				Logger.debug('[OramaStorage] No conversation history data found, starting fresh');
			} else {
				Logger.error('[OramaStorage] Failed to load conversation history data:', error);
			}
		}

		OramaStorageAdapter.isLoaded = true;
	}

	/**
	 * Persist data to disk (separated into working memory and conversation history)
	 */
	private async persistData(): Promise<void> {
		try {
			// Ensure directory exists
			await fs.mkdir(this.storagePath, { recursive: true });

			// Persist working memory (resources) to separate file
			const workingMemoryPath = this.getWorkingMemoryPath();
			const workingMemoryData = {
				resources: Object.fromEntries(OramaStorageAdapter.resourcesCache),
			};
			await fs.writeFile(workingMemoryPath, JSON.stringify(workingMemoryData, null, 2), 'utf-8');
			Logger.debug('[OramaStorage] Working memory persisted to:', workingMemoryPath);

			// Persist conversation history (threads and messages) to separate file
			const conversationHistoryPath = this.getConversationHistoryPath();
			const conversationHistoryData = {
				threads: Object.fromEntries(OramaStorageAdapter.threadsCache),
				messages: Object.fromEntries(OramaStorageAdapter.messagesCache),
			};
			await fs.writeFile(conversationHistoryPath, JSON.stringify(conversationHistoryData, null, 2), 'utf-8');
			Logger.debug('[OramaStorage] Conversation history persisted to:', conversationHistoryPath);
		} catch (error) {
			Logger.error('[OramaStorage] Failed to persist data:', error);
		}
	}

	/**
	 * Initialize storage (required by Mastra Memory)
	 * Load persisted data from disk
	 */
	async init(): Promise<void> {
		await this.loadPersistedData();
		Logger.debug('[OramaStorage] Storage initialized');
	}

	/**
	 * Create a new thread
	 */
	async createThread(params: {
		threadId?: string;
		resourceId?: string;
		title?: string;
		metadata?: Record<string, unknown>;
	}): Promise<StorageThread> {
		const threadId = params.threadId || `thread-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		const now = new Date();

		const thread: StorageThread = {
			id: threadId,
			resourceId: params.resourceId,
			title: params.title,
			metadata: params.metadata || {},
			createdAt: now,
			updatedAt: now,
		};

		// Store in cache
		OramaStorageAdapter.threadsCache.set(threadId, thread);
		await this.persistData();

		Logger.debug('[OramaStorage] Thread created:', {
			id: threadId,
			resourceId: params.resourceId,
			title: params.title
		});

		return thread;
	}

	/**
	 * Get thread by ID
	 */
	async getThreadById(params: { threadId: string }): Promise<StorageThread | null> {
		const thread = OramaStorageAdapter.threadsCache.get(params.threadId);
		
		if (!thread) {
			Logger.debug('[OramaStorage] Thread not found:', params.threadId);
			return null;
		}

		return thread;
	}

	/**
	 * Save thread (create or update)
	 */
	async saveThread(params: { thread: StorageThread }): Promise<StorageThread> {
		const now = new Date();
		const thread: StorageThread = {
			...params.thread,
			updatedAt: now,
			createdAt: params.thread.createdAt || now,
		};

		OramaStorageAdapter.threadsCache.set(thread.id, thread);
		await this.persistData();

		Logger.debug('[OramaStorage] Thread saved:', {
			id: thread.id,
			resourceId: thread.resourceId,
		});

		return thread;
	}

	/**
	 * Update thread metadata
	 */
	async updateThread(params: {
		id: string;
		title: string;
		metadata: Record<string, unknown>;
	}): Promise<StorageThread> {
		const existing = OramaStorageAdapter.threadsCache.get(params.id);
		
		if (!existing) {
			throw new Error(`Thread ${params.id} not found`);
		}

		const updated: StorageThread = {
			...existing,
			title: params.title,
			metadata: params.metadata,
			updatedAt: new Date(),
		};

		OramaStorageAdapter.threadsCache.set(params.id, updated);

		Logger.debug('[OramaStorage] Thread updated:', {
			id: params.id,
			title: params.title,
		});

		return updated;
	}

	/**
	 * Delete thread
	 */
	async deleteThread(params: { threadId: string }): Promise<void> {
		OramaStorageAdapter.threadsCache.delete(params.threadId);
		
		// Also delete associated messages
		const messagesToDelete = Array.from(OramaStorageAdapter.messagesCache.entries())
			.filter(([_, msg]) => msg.threadId === params.threadId)
			.map(([id]) => id);
		
		for (const id of messagesToDelete) {
			OramaStorageAdapter.messagesCache.delete(id);
		}

		Logger.debug('[OramaStorage] Thread deleted:', {
			threadId: params.threadId,
			messagesDeleted: messagesToDelete.length,
		});
	}

	/**
	 * Get threads by resource ID
	 */
	async getThreadsByResourceId(params: {
		resourceId: string;
		orderBy?: 'createdAt' | 'updatedAt';
		sortDirection?: 'ASC' | 'DESC';
	}): Promise<StorageThread[]> {
		const threads = Array.from(OramaStorageAdapter.threadsCache.values())
			.filter(t => t.resourceId === params.resourceId);

		// Sort threads
		const orderBy = params.orderBy || 'createdAt';
		const sortDirection = params.sortDirection || 'DESC';
		
		threads.sort((a, b) => {
			const aTime = a[orderBy].getTime();
			const bTime = b[orderBy].getTime();
			return sortDirection === 'ASC' ? aTime - bTime : bTime - aTime;
		});

		Logger.debug('[OramaStorage] Found threads:', {
			resourceId: params.resourceId,
			count: threads.length
		});

		return threads;
	}

	/**
	 * Get threads by resource ID (simple version, used by Memory 0.15.x)
	 */
	async getThreadsByResourceIdPaginated(params: {
		resourceId: string;
		page?: number;
		perPage?: number;
		orderBy?: 'createdAt' | 'updatedAt';
		sortDirection?: 'ASC' | 'DESC';
	}): Promise<{
		threads: StorageThread[];
		hasMore: boolean;
		total: number;
		page: number;
		perPage: number;
	}> {
		const result = await this.listThreadsByResourceId({
			resourceId: params.resourceId,
			page: params.page,
			perPage: params.perPage,
			orderBy: params.orderBy ? {
				field: params.orderBy,
				direction: params.sortDirection,
			} : undefined,
		});
		
		return {
			threads: result.threads,
			hasMore: result.hasMore,
			total: result.total,
			page: result.page,
			perPage: result.perPage === false ? result.total : result.perPage,
		};
	}

	/**
	 * List threads by resource ID with pagination (Mastra Memory interface)
	 */
	async listThreadsByResourceId(params: {
		resourceId: string;
		page?: number;
		perPage?: number | false;
		orderBy?: { field?: 'createdAt' | 'updatedAt'; direction?: 'ASC' | 'DESC' };
	}): Promise<{
		threads: StorageThread[];
		hasMore: boolean;
		total: number;
		page: number;
		perPage: number | false;
	}> {
		const allThreads = await this.getThreadsByResourceId({
			resourceId: params.resourceId,
			orderBy: params.orderBy?.field || 'createdAt',
			sortDirection: params.orderBy?.direction || 'DESC',
		});

		const total = allThreads.length;
		const page = params.page || 0;
		const perPage = params.perPage === false ? false : (params.perPage || 100);

		// If perPage is false, return all threads
		if (perPage === false) {
			return {
				threads: allThreads,
				hasMore: false,
				total,
				page: 0,
				perPage: false,
			};
		}

		const start = page * perPage;
		const end = start + perPage;
		const threads = allThreads.slice(start, end);
		const hasMore = end < total;

		return {
			threads,
			hasMore,
			total,
			page,
			perPage,
		};
	}

	/**
	 * Save messages to storage (Mastra Memory interface)
	 * 
	 * IMPORTANT: This method must return the messages in the EXACT same format
	 * as received, because Memory.saveMessages() expects the returned messages
	 * to be in MastraDBMessage format for further processing.
	 */
	async saveMessages(params: {
		messages: any[];
	}): Promise<{ messages: any[] }> {
		for (const msg of params.messages) {
			// Extract role from the message
			const role = msg.role || 'user';

			// Store in our internal cache for retrieval
			// We store a simplified version for our own use
			let content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
			if (typeof msg.content === 'string') {
				content = msg.content;
			} else if (msg.content?.content) {
				content = msg.content.content;
			} else if (msg.content?.parts) {
				content = msg.content.parts;
			} else if (msg.content) {
				content = JSON.stringify(msg.content);
			} else {
				content = '';
			}

			const storageMessage: StorageMessage = {
				id: msg.id,
				threadId: msg.threadId,
				role: role as 'user' | 'assistant' | 'system' | 'tool',
				content,
				metadata: msg.metadata || {},
				createdAt: msg.createdAt || new Date(),
			};

			OramaStorageAdapter.messagesCache.set(msg.id, storageMessage);
		}

		await this.persistData();

		Logger.debug('[OramaStorage] Saved messages:', {
			count: params.messages.length,
			threadId: params.messages[0]?.threadId,
			firstMessageRole: params.messages[0]?.role,
		});

		// WORKAROUND for Memory 0.15.11 bug:
		// Memory.saveMessages (format='v1') does: new MessageList().add(await result, "memory")
		// This expects result to be a message array, not { messages: [...] }
		// Even though the interface says Promise<{ messages: [...] }>, Memory 0.15.11
		// doesn't unwrap it before passing to MessageList.add()
		// So we return the array directly (type cast to satisfy TypeScript)
		return params.messages as any;
	}

	/**
	 * Get messages by thread ID (simple version)
	 */
	async getMessagesByThreadId(params: {
		threadId: string;
		limit?: number;
		offset?: number;
	}): Promise<StorageMessage[]> {
		let messages = Array.from(OramaStorageAdapter.messagesCache.values())
			.filter(m => m.threadId === params.threadId)
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

		// Apply pagination
		if (params.offset !== undefined) {
			messages = messages.slice(params.offset);
		}
		if (params.limit !== undefined) {
			messages = messages.slice(0, params.limit);
		}

		Logger.debug('[OramaStorage] Retrieved messages:', {
			threadId: params.threadId,
			count: messages.length
		});

		return messages;
	}

	/**
	 * Get messages (alias for listMessages, used by Mastra Memory 0.15.x)
	 */
	async getMessages(params: {
		threadId: string;
		resourceId?: string;
		include?: Array<{
			id: string;
			threadId?: string;
			withPreviousMessages?: number;
			withNextMessages?: number;
		}>;
		limit?: number;
		offset?: number;
		filter?: {
			dateRange?: {
				start?: Date;
				end?: Date;
			};
		};
		orderBy?: string;
		sortDirection?: 'ASC' | 'DESC';
	}): Promise<any[]> {
		const result = await this.listMessages({
			threadId: params.threadId,
			resourceId: params.resourceId,
			include: params.include,
			perPage: params.limit || 40,
			page: params.offset ? Math.floor(params.offset / (params.limit || 40)) : 0,
			filter: params.filter,
			orderBy: params.orderBy ? {
				field: params.orderBy as 'createdAt' | 'updatedAt',
				direction: params.sortDirection || 'ASC',
			} : undefined,
		});
		return result.messages;
	}

	/**
	 * Get messages paginated (alias for listMessages, used by Mastra Memory 0.15.x)
	 */
	async getMessagesPaginated(params: {
		threadId: string;
		resourceId?: string;
		include?: Array<{
			id: string;
			threadId?: string;
			withPreviousMessages?: number;
			withNextMessages?: number;
		}>;
		perPage?: number | false;
		page?: number;
		filter?: {
			dateRange?: {
				start?: Date;
				end?: Date;
			};
		};
		orderBy?: {
			field?: 'createdAt' | 'updatedAt';
			direction?: 'ASC' | 'DESC';
		};
	}): Promise<{
		messages: any[];
		pagination: {
			total: number;
			page: number;
			perPage: number | false;
			hasMore: boolean;
		};
	}> {
		const result = await this.listMessages(params);
		return {
			messages: result.messages,
			pagination: {
				total: result.total,
				page: result.page,
				perPage: result.perPage,
				hasMore: result.hasMore,
			},
		};
	}

	/**
	 * List messages with full Mastra Memory interface
	 */
	async listMessages(params: {
		threadId: string;
		resourceId?: string;
		include?: Array<{
			id: string;
			threadId?: string;
			withPreviousMessages?: number;
			withNextMessages?: number;
		}>;
		perPage?: number | false;
		page?: number;
		filter?: {
			dateRange?: {
				start?: Date;
				end?: Date;
			};
		};
		orderBy?: {
			field?: 'createdAt' | 'updatedAt';
			direction?: 'ASC' | 'DESC';
		};
	}): Promise<{
		messages: any[];
		total: number;
		page: number;
		perPage: number | false;
		hasMore: boolean;
	}> {
		// Get all messages for the thread
		let messages = Array.from(OramaStorageAdapter.messagesCache.values())
			.filter(m => m.threadId === params.threadId);

		// Apply date filter if provided
		if (params.filter?.dateRange) {
			const { start, end } = params.filter.dateRange;
			if (start) {
				messages = messages.filter(m => m.createdAt >= start);
			}
			if (end) {
				messages = messages.filter(m => m.createdAt <= end);
			}
		}

		// Sort messages
		const direction = params.orderBy?.direction || 'ASC';
		messages.sort((a, b) => {
			const aTime = a.createdAt.getTime();
			const bTime = b.createdAt.getTime();
			return direction === 'ASC' ? aTime - bTime : bTime - aTime;
		});

		// Handle include parameter for context messages
		if (params.include && params.include.length > 0) {
			const includedIds = new Set<string>();
			const messageArray = messages;

			for (const inc of params.include) {
				const msgIndex = messageArray.findIndex(m => m.id === inc.id);
				if (msgIndex !== -1) {
					includedIds.add(inc.id);

					// Add previous messages
					const prevCount = inc.withPreviousMessages || 0;
					for (let i = Math.max(0, msgIndex - prevCount); i < msgIndex; i++) {
						includedIds.add(messageArray[i].id);
					}

					// Add next messages
					const nextCount = inc.withNextMessages || 0;
					for (let i = msgIndex + 1; i < Math.min(messageArray.length, msgIndex + 1 + nextCount); i++) {
						includedIds.add(messageArray[i].id);
					}
				}
			}

			messages = messages.filter(m => includedIds.has(m.id));
		}

		const total = messages.length;
		const page = params.page || 0;
		const perPage = params.perPage === false ? false : (params.perPage || 40);

		// Apply pagination
		let paginatedMessages = messages;
		let hasMore = false;

		if (perPage !== false) {
			const start = page * perPage;
			const end = start + perPage;
			paginatedMessages = messages.slice(start, end);
			hasMore = end < total;
		}

		// Convert to Mastra DB format
		const dbMessages = paginatedMessages.map(m => ({
			id: m.id,
			threadId: m.threadId,
			role: m.role,
			content: {
				content: typeof m.content === 'string' ? m.content : '',
				parts: Array.isArray(m.content) ? m.content : [],
			},
			metadata: m.metadata,
			createdAt: m.createdAt,
		}));

		Logger.debug('[OramaStorage] Listed messages:', {
			threadId: params.threadId,
			total,
			returned: dbMessages.length,
		});

		return {
			messages: dbMessages,
			total,
			page,
			perPage,
			hasMore,
		};
	}

	/**
	 * Update messages (Mastra Memory interface)
	 */
	async updateMessages(params: {
		messages: Array<Partial<StorageMessage> & { id: string }>;
	}): Promise<any[]> {
		const updated: any[] = [];

		for (const update of params.messages) {
			const existing = OramaStorageAdapter.messagesCache.get(update.id);
			if (existing) {
				const updatedMessage = {
					...existing,
					...update,
				};
				OramaStorageAdapter.messagesCache.set(update.id, updatedMessage);
				updated.push(updatedMessage);
			}
		}

		await this.persistData();

		await this.persistData();

		Logger.debug('[OramaStorage] Updated messages:', {
			count: updated.length,
		});

		return updated;
	}

	/**
	 * Delete messages by IDs
	 */
	async deleteMessages(messageIds: string[]): Promise<void> {
		for (const id of messageIds) {
			OramaStorageAdapter.messagesCache.delete(id);
		}
		await this.persistData();

		Logger.debug('[OramaStorage] Deleted messages:', {
			count: messageIds.length
		});
	}

	/**
	 * Get resource by ID (for resource-scoped working memory)
	 */
	async getResourceById(params: { resourceId: string }): Promise<StorageResource | null> {
		const resource = OramaStorageAdapter.resourcesCache.get(params.resourceId);
		
		if (!resource) {
			// Create a new resource if it doesn't exist
			const newResource: StorageResource = {
				id: params.resourceId,
				workingMemory: '',
				metadata: {},
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			OramaStorageAdapter.resourcesCache.set(params.resourceId, newResource);
			return newResource;
		}

		return resource;
	}

	/**
	 * Save resource (for resource-scoped working memory)
	 */
	async saveResource(params: { resource: StorageResource }): Promise<StorageResource> {
		const now = new Date();
		const resource: StorageResource = {
			...params.resource,
			updatedAt: now,
			createdAt: params.resource.createdAt || now,
		};

		OramaStorageAdapter.resourcesCache.set(resource.id, resource);

		Logger.debug('[OramaStorage] Resource saved:', {
			id: resource.id,
		});

		return resource;
	}

	/**
	 * Update resource (for resource-scoped working memory)
	 */
	async updateResource(params: {
		resourceId: string;
		workingMemory?: string;
		metadata?: Record<string, unknown>;
	}): Promise<StorageResource> {
		let resource = OramaStorageAdapter.resourcesCache.get(params.resourceId);
		
		if (!resource) {
			// Create new resource if it doesn't exist
			resource = {
				id: params.resourceId,
				workingMemory: params.workingMemory || '',
				metadata: params.metadata || {},
				createdAt: new Date(),
				updatedAt: new Date(),
			};
		} else {
			// Update existing resource
			resource = {
				...resource,
				workingMemory: params.workingMemory !== undefined ? params.workingMemory : resource.workingMemory,
				metadata: params.metadata !== undefined ? { ...resource.metadata, ...params.metadata } : resource.metadata,
				updatedAt: new Date(),
			};
		}

		OramaStorageAdapter.resourcesCache.set(params.resourceId, resource);
		await this.persistData();

		Logger.debug('[OramaStorage] Resource updated:', {
			resourceId: params.resourceId,
			hasWorkingMemory: !!params.workingMemory
		});

		return resource;
	}

	/**
	 * Validate thread is owned by resource
	 */
	async validateThreadIsOwnedByResource(params: {
		threadId: string;
		resourceId: string;
	}): Promise<boolean> {
		const thread = await this.getThreadById({ threadId: params.threadId });
		
		if (!thread) {
			return false;
		}

		return thread.resourceId === params.resourceId;
	}

	/**
	 * Check storage feature support (required by Mastra Memory)
	 * Returns feature flags indicating which storage capabilities are supported
	 */
	selectByIncludeResourceScope(): {
		supportsResourceScope: boolean;
		supportsThreadScope: boolean;
	} {
		// Our storage adapter supports both resource and thread scoping
		return {
			supportsResourceScope: true,
			supportsThreadScope: true
		};
	}

	/**
	 * Clear all storage (for testing)
	 */
	async clear(): Promise<void> {
		OramaStorageAdapter.threadsCache.clear();
		OramaStorageAdapter.messagesCache.clear();
		Logger.debug('[OramaStorage] Storage cleared');
	}
}
