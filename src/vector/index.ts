/**
 * Vector Database Module Exports
 * 向量数据库模块统一导出
 */

export { VectorDBManager } from './vectorDBManager';
export { OramaManager } from './oramaManager';
export { ChunkMetaStore } from './chunkMetaStore';
export { IndexSyncManager, type SyncResult } from './indexSync';
export { SemanticSearchManager } from './semanticSearch';
export { SemanticChunker } from './semanticChunker';
export type {
  VectorSettings,
  ChunkMetadata,
  DocItem,
  IndexingStatus,
  IVectorDatabase,
  ChunkingStrategy
} from './types';
export { DEFAULT_VECTOR_SETTINGS } from './types';
