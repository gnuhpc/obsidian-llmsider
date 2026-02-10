/**
 * Vector Database Types
 * 向量数据库相关类型定义
 */

/**
 * Vector database interface
 * 向量数据库通用接口
 */
export interface IVectorDatabase {
  initialize(): Promise<void>;
  add(chunks: ChunkMetadata[]): Promise<void>;
  update(chunks: ChunkMetadata[]): Promise<void>;
  delete(chunkIds: string[]): Promise<void>;
  query(queryText: string, topK: number): Promise<DocItem[]>;
  searchByVector(queryVector: number[], topK: number, term?: string): Promise<DocItem[]>;
  count(): Promise<number>;
  clear(): Promise<void>;
  rebuild(): Promise<void>;
  exists(chunkId: string): Promise<boolean>;
  getByIds(chunkIds: string[]): Promise<ChunkMetadata[]>;
  shutdown(): Promise<void>;
}

/**
 * Chunk metadata for tracking document chunks
 * 用于跟踪文档块的元数据
 */
export interface ChunkMetadata {
  /** Unique ID for the chunk: filePath::chunkIndex */
  id: string;
  /** File path relative to vault root */
  filePath: string;
  /** Index of this chunk within the file */
  chunkIndex: number;
  /** Hash of the chunk content for change detection */
  contentHash: string;
  /** Text content of the chunk */
  content: string;
  /** Timestamp when chunk was created/updated */
  timestamp: number;
  /** Optional precomputed embedding vector (if provided, skips embedding generation) */
  embedding?: number[];
}

/**
 * Document item returned from semantic search
 * 语义搜索返回的文档项
 */
export interface DocItem {
  /** Chunk ID */
  id: string;
  /** File path */
  filePath: string;
  /** Chunk index */
  chunkIndex: number;
  /** Chunk content */
  content: string;
  /** Similarity score (0-1) */
  score: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Chunking strategy
 * 分块策略
 */
export type ChunkingStrategy = 'character' | 'semantic';

/**
 * Vector database settings
 * 向量数据库设置
 */
export interface VectorSettings {
  /** Whether local semantic search is enabled */
  enabled: boolean;
  /** Whether to show similar notes at the bottom of notes */
  showSimilarNotes: boolean;
  /** Whether to automatically search for context when sending messages */
  autoSearchEnabled: boolean;
  /** Whether to suggest related files during editing */
  suggestRelatedFiles: boolean;
  /** Timeout in milliseconds for showing file suggestions */
  suggestionTimeout: number;
  /** Path to vector database storage */
  storagePath: string;
  /** Index name for Vectra */
  indexName: string;
  /** Chunking strategy: 'character' (fixed-size) or 'semantic' (Parsedoc) */
  chunkingStrategy: ChunkingStrategy;
  /** Chunk size in characters (for character strategy) */
  chunkSize: number;
  /** Chunk overlap in characters (for character strategy) */
  chunkOverlap: number;
  /** Number of results to return in searches */
  topK: number;
  /** Embedding model ID - format: connectionId::modelId (remote API only) */
  embeddingModelId: string;
}

/**
 * Default vector settings
 */
export const DEFAULT_VECTOR_SETTINGS: VectorSettings = {
  enabled: false,
  showSimilarNotes: true, // Show similar notes by default when vector DB is enabled
  autoSearchEnabled: false,
  suggestRelatedFiles: false,
  suggestionTimeout: 5000,
  storagePath: 'plugins/obsidian-llmsider/vector-data', // Will be prefixed with vault.configDir
  indexName: 'vault-semantic-index',
  chunkingStrategy: 'character',
  chunkSize: 1000,
  chunkOverlap: 100,
  topK: 5,
  embeddingModelId: '' // User must select from Connection-Model (remote API only)
};

/**
 * Chunk size constraints
 */
export const CHUNK_SIZE_MIN = 100;
export const CHUNK_SIZE_MAX = 5000;
export const CHUNK_OVERLAP_MIN = 0;
export const CHUNK_OVERLAP_MAX = 1000;

/**
 * Indexing status
 * 索引状态
 */
export interface IndexingStatus {
  /** Whether indexing is in progress */
  isIndexing: boolean;
  /** Last indexing timestamp */
  lastIndexTime: number;
  /** Total chunks indexed */
  totalChunks: number;
  /** Number of files indexed */
  totalFiles: number;
  /** Any error message */
  error?: string;
}
