/**
 * Orama Vector Adapter for Mastra Memory
 * 
 * This adapter bridges the existing Orama vector database implementation
 * with Mastra's Memory system, allowing semantic recall functionality.
 */

import { MastraVector } from '@mastra/core/vector';
import type { 
	CreateIndexParams, 
	UpsertVectorParams, 
	QueryVectorParams, 
	IndexStats,
	QueryResult,
	DescribeIndexParams,
	DeleteIndexParams,
	UpdateVectorParams,
	DeleteVectorParams
} from '@mastra/core/vector';
import type { ChunkMetadata } from '../../vector/types';
import type { IVectorDatabase } from '../../vector/types';
import { OramaManager } from '../../vector/oramaManager';
import { Logger } from '../../utils/logger';

/**
 * Adapter that extends Mastra's MastraVector using OramaManager
 */
export class OramaVectorAdapter extends MastraVector {
	declare id: string; // Declared on parent class
	private oramaManager: OramaManager;
	private indexPrefix: string = 'memory_'; // Prefix for memory indexes

	constructor(oramaManager: OramaManager, id: string = 'orama-memory-vector') {
		super();
		// @ts-ignore - id is set on parent class
		this.id = id;
		this.oramaManager = oramaManager;
		Logger.debug('[OramaVectorAdapter] Initialized with id:', id);
	}

	/**
	 * Create a new vector index in Orama
	 */
	async createIndex(params: CreateIndexParams): Promise<void> {
		const fullIndexName = this.getFullIndexName(params.indexName);
		Logger.debug(`[OramaVectorAdapter] Creating index: ${fullIndexName} (${params.dimension}D)`);
		
		// Orama automatically creates indexes when upserting
		// Just validate the dimension matches
		const oramaDimension = (this.oramaManager as any).embeddingDimension;
		if (!oramaDimension) {
			Logger.error('[OramaVectorAdapter] Orama dimension not initialized');
			throw new Error('Orama embedding dimension not initialized');
		}
		if (params.dimension !== oramaDimension) {
			Logger.warn(`[OramaVectorAdapter] Dimension mismatch: requested ${params.dimension}D, but Orama is configured for ${oramaDimension}D`);
		}
		
		// No-op - Orama creates indexes automatically
		Logger.debug(`[OramaVectorAdapter] Index will be created on first upsert`);
	}

	/**
	 * Upsert vectors into Orama
	 * Passes precomputed vectors to avoid redundant embedding generation
	 */
	async upsert(params: UpsertVectorParams): Promise<string[]> {
		const fullIndexName = this.getFullIndexName(params.indexName);
		Logger.debug(`[OramaVectorAdapter] Upserting ${params.vectors.length} vectors to ${fullIndexName}`);

		const { vectors, metadata, ids } = params;
		const chunks: ChunkMetadata[] = [];

		for (let i = 0; i < vectors.length; i++) {
			const id = ids?.[i] || `mem_${Date.now()}_${i}`;
			const meta = metadata?.[i] || {};
			
			// Extract content from metadata if available
			const content = meta.text || meta.content || meta.message || '';
			
			chunks.push({
				id,
				filePath: `${fullIndexName}/${id}`, // Use filePath to store index info
				chunkIndex: 0,
				contentHash: this.hashContent(content),
				content,
				timestamp: Date.now(),
				embedding: vectors[i] // Pass precomputed vector to avoid re-generation
			});
		}

		try {
			// Use Orama's add method with precomputed embeddings
			// This avoids redundant embedding generation (performance optimization)
			await this.oramaManager.add(chunks);
			
			const generatedIds = chunks.map(c => c.id);
			Logger.debug(`[OramaVectorAdapter] Upserted ${generatedIds.length} vectors successfully (with precomputed embeddings)`);
			return generatedIds;
		} catch (error) {
			Logger.error(`[OramaVectorAdapter] Failed to upsert vectors:`, error);
			throw error;
		}
	}

	/**
	 * Query vectors from Orama using direct vector search
	 * Now uses OramaManager's searchByVector() method for efficient pure vector search
	 */
	async query(params: QueryVectorParams): Promise<QueryResult[]> {
		const fullIndexName = this.getFullIndexName(params.indexName);
		const topK = params.topK || 10;
		
		Logger.debug(`[OramaVectorAdapter] Querying ${fullIndexName} for top ${topK} results`);

		try {
			// Use direct vector search with the provided query vector
			if (!params.queryVector || !Array.isArray(params.queryVector)) {
				Logger.error('[OramaVectorAdapter] Invalid query vector provided');
				return [];
			}

			// Perform vector search using OramaManager's searchByVector method
			const results = await this.oramaManager.searchByVector(params.queryVector, topK);

			// Filter results to only include items from this index
			const filtered = results
				.filter(result => result.filePath.startsWith(fullIndexName))
				.map(result => ({
					id: result.id,
					score: result.score || 0,
					metadata: {
						text: result.content,
						content: result.content,
						timestamp: (result.metadata as any)?.timestamp,
						filePath: result.filePath,
						chunkIndex: result.chunkIndex
					}
				}));

			Logger.debug(`[OramaVectorAdapter] Found ${filtered.length} results`);
			return filtered;
		} catch (error) {
			Logger.error(`[OramaVectorAdapter] Query failed:`, error);
			return [];
		}
	}

	/**
	 * List all indexes (not fully supported by Orama)
	 */
	async listIndexes(): Promise<string[]> {
		Logger.debug('[OramaVectorAdapter] Listing indexes (limited support)');
		// Orama doesn't support multiple indexes in one DB
		// Return a placeholder
		return [this.indexPrefix + 'default'];
	}

	/**
	 * Describe an index
	 */
	async describeIndex(params: DescribeIndexParams): Promise<IndexStats> {
		const fullIndexName = this.getFullIndexName(params.indexName);
		Logger.debug(`[OramaVectorAdapter] Describing index: ${fullIndexName}`);

		try {
			const count = await this.oramaManager.count();
			const dimension = (this.oramaManager as any).embeddingDimension;
			
			if (!dimension) {
				Logger.error('[OramaVectorAdapter] Orama dimension not initialized');
				throw new Error('Orama embedding dimension not initialized');
			}

			return {
				dimension,
				count,
				metric: 'cosine' // Orama uses cosine similarity
			};
		} catch (error) {
			Logger.error(`[OramaVectorAdapter] Failed to describe index:`, error);
			throw error;
		}
	}

	/**
	 * Delete an index (clears all vectors)
	 */
	async deleteIndex(params: DeleteIndexParams): Promise<void> {
		const fullIndexName = this.getFullIndexName(params.indexName);
		Logger.debug(`[OramaVectorAdapter] Deleting index: ${fullIndexName}`);
		
		// Orama doesn't support selective deletion by prefix
		// We would need to implement this by querying all IDs and deleting them
		Logger.warn('[OramaVectorAdapter] Index deletion not fully implemented - use clear() to remove all');
	}

	/**
	 * Update a vector (not supported - Orama requires full document replacement)
	 */
	async updateVector(params: UpdateVectorParams): Promise<void> {
		Logger.warn('[OramaVectorAdapter] updateVector not implemented - Orama requires full document replacement');
		throw new Error('updateVector not supported by Orama adapter');
	}

	/**
	 * Delete a vector
	 */
	async deleteVector(params: DeleteVectorParams): Promise<void> {
		Logger.debug(`[OramaVectorAdapter] Deleting vector: ${params.id}`);
		
		try {
			await this.oramaManager.delete([params.id]);
			Logger.debug(`[OramaVectorAdapter] Vector deleted successfully`);
		} catch (error) {
			Logger.error(`[OramaVectorAdapter] Failed to delete vector:`, error);
			throw error;
		}
	}

	// Helper methods

	/**
	 * Get full index name with prefix
	 */
	private getFullIndexName(indexName: string): string {
		if (indexName.startsWith(this.indexPrefix)) {
			return indexName;
		}
		return `${this.indexPrefix}${indexName}`;
	}

	/**
	 * Hash content for deduplication
	 */
	private hashContent(content: string): string {
		// Simple hash function
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return hash.toString(36);
	}
}
