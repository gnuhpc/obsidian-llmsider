/**
 * Vector Database Manager
 * 向量数据库统一管理器 - 整合所有向量相关功能
 */

import { Notice, Vault, TFile } from 'obsidian';
import { Logger } from './../utils/logger';
import { OramaManager } from './oramaManager';
import { ChunkMetaStore } from './chunkMetaStore';
import { IndexSyncManager, SyncResult, ProgressCallback } from './indexSync';
import { SemanticSearchManager } from './semanticSearch';
import { VectorSettings, DocItem, IndexingStatus } from './types';
import { LLMConnection, LLMModel } from '../types';
import { UnifiedToolManager } from '../tools/unified-tool-manager';
import type { I18nManager } from '../i18n/i18n-manager';

/**
 * Main Vector Database Manager
 */
export class VectorDBManager {
  private vault: Vault;
  private settings: VectorSettings;
  private oramaManager: OramaManager | null = null;
  private metaStore: ChunkMetaStore | null = null;
  private indexSync: IndexSyncManager | null = null;
  private semanticSearch: SemanticSearchManager | null = null;
  private isInitialized: boolean = false;
  private toolManager: UnifiedToolManager;
  private getConnection: (connectionId: string) => LLMConnection | undefined;
  private getModel: (modelId: string) => LLMModel | undefined;
  private currentProgress: { percentage: number; current: number; total: number } | null = null;
  private progressCallback: ProgressCallback | null = null;
  private modelLoadProgressCallback: ((progress: number, message: string) => void) | null = null;
  private statsUpdateCallback: (() => void) | null = null;
  private i18n: I18nManager;

  constructor(
    vault: Vault,
    settings: VectorSettings,
    toolManager: UnifiedToolManager,
    getConnection: (connectionId: string) => LLMConnection | undefined,
    getModel: (modelId: string) => LLMModel | undefined,
    i18n: I18nManager
  ) {
    this.vault = vault;
    this.settings = settings;
    this.toolManager = toolManager;
    this.getConnection = getConnection;
    this.getModel = getModel;
    this.i18n = i18n;
  }

  /**
   * Set callback for model loading progress (deprecated - no longer needed for remote API only)
   */
  setModelLoadProgressCallback(callback: ((progress: number, message: string) => void) | null): void {
    this.modelLoadProgressCallback = callback;
    // No longer needed for remote API
  }

  /**
   * Set connection update callback for token refresh
   */
  setConnectionUpdateCallback(callback: ((connection: LLMConnection) => Promise<void>) | null): void {
    if (this.oramaManager) {
      this.oramaManager.setConnectionUpdateCallback(callback);
    }
  }

  /**
   * Initialize the vector database system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      Logger.warn('Already initialized');
      return;
    }

    try {
      Logger.debug('Initializing vector database system...');

      // Parse embedding model ID (format: connectionId::modelId)
      const { connection, model } = this.parseEmbeddingModelId();

      // Calculate absolute storage path relative to vault
      const vaultBasePath = (this.vault.adapter as any).basePath || '';
      const absoluteStoragePath = this.settings.storagePath.startsWith('/')
        ? this.settings.storagePath
        : `${vaultBasePath}/${this.settings.storagePath}`;

      // Initialize Orama Manager (remote API only)
      this.oramaManager = new OramaManager(
        absoluteStoragePath,
        this.settings.indexName,
        this.toolManager,
        connection,
        model,
        this.i18n
      );

      await this.oramaManager.initialize();

      // Initialize Meta Store - store in plugin directory for consistency
      const metaFilePath = `${this.settings.storagePath}/vector-meta.json`;
      Logger.debug(`Using meta file path: ${metaFilePath}`);
      this.metaStore = new ChunkMetaStore(this.vault, metaFilePath);
      await this.metaStore.load();

      // Initialize Index Sync Manager
      this.indexSync = new IndexSyncManager(
        this.vault,
        this.oramaManager,
        this.metaStore,
        this.settings,
        this.i18n
      );

      // Initialize Semantic Search Manager
      this.semanticSearch = new SemanticSearchManager(this.oramaManager);

      this.isInitialized = true;

      Logger.debug('Vector database system initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Parse embedding model ID to get connection and model
   */
  private parseEmbeddingModelId(): { connection: LLMConnection | null; model: LLMModel | null } {
    if (!this.settings.embeddingModelId) {
      return { connection: null, model: null };
    }

    const parts = this.settings.embeddingModelId.split('::');
    if (parts.length !== 2) {
      Logger.warn('Invalid embedding model ID format:', this.settings.embeddingModelId);
      return { connection: null, model: null };
    }

    const [connectionId, modelId] = parts;
    const connection = this.getConnection(connectionId);
    const model = this.getModel(modelId);

    if (!connection || !model) {
      Logger.warn('Connection or model not found for embedding model ID:', this.settings.embeddingModelId);
      return { connection: null, model: null };
    }

    return { connection, model };
  }

  /**
   * Shutdown the vector database system
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      Logger.debug('Shutting down vector database system...');

      // Save metadata
      if (this.metaStore) {
        await this.metaStore.save();
      }

      // Shutdown Orama
      if (this.oramaManager) {
        await this.oramaManager.shutdown();
      }

      this.isInitialized = false;
      Logger.debug('Vector database system shutdown complete');
    } catch (error) {
      Logger.error('Error during shutdown:', error);
    }
  }

  /**
   * Perform semantic search
   */
  async search(query: string, topK?: number): Promise<DocItem[]> {
    this.ensureInitialized();

    const k = topK || this.settings.topK;
    return this.semanticSearch!.searchLocal(query, k);
  }

  /**
   * Format search results for LLM context
   */
  formatSearchResults(results: DocItem[]): string {
    this.ensureInitialized();
    return this.semanticSearch!.formatForLLMContext(results);
  }

  /**
   * Get relevance summary for UI
   */
  getRelevanceSummary(results: DocItem[]): string {
    this.ensureInitialized();
    return this.semanticSearch!.getRelevanceSummary(results);
  }

  /**
   * Sync the index (differential update)
   */
  async syncIndex(onProgress?: ProgressCallback): Promise<SyncResult> {
    this.ensureInitialized();

    try {
      new Notice(this.i18n.t('notifications.vectorDatabase.updatingIndex'));
      
      // Create wrapper callback to track progress
      const progressWrapper: ProgressCallback = (progress) => {
        // Store current progress state
        const percentage = progress.totalFiles > 0 
          ? Math.floor((progress.currentFileIndex / progress.totalFiles) * 100)
          : 0;
        this.currentProgress = {
          percentage,
          current: progress.currentFileIndex,
          total: progress.totalFiles
        };
        
        // Call both the UI callback and any stored callback
        if (onProgress) onProgress(progress);
        if (this.progressCallback) this.progressCallback(progress);
      };
      
      const result = await this.indexSync!.diffAndSync(progressWrapper);
      
      // Clear progress when done
      this.currentProgress = null;
      
      const message = `Index updated: +${result.added} ~${result.updated} -${result.deleted} (${(result.duration / 1000).toFixed(1)}s)`;
      new Notice(message);

      if (result.errors.length > 0) {
        Logger.warn('Update completed with errors:', result.errors);
      }

      return result;
    } catch (error) {
      // Clear progress on error
      this.currentProgress = null;
      new Notice(this.i18n.t('notifications.vectorDatabase.updateFailed'));
      throw error;
    }
  }

  /**
   * Rebuild the entire index
   */
  async rebuildIndex(onProgress?: ProgressCallback): Promise<SyncResult> {
    this.ensureInitialized();

    try {
      new Notice(this.i18n.t('notifications.vectorDatabase.rebuildingIndex'));
      
      // Create wrapper callback to track progress
      const progressWrapper: ProgressCallback = (progress) => {
        let percentage = 0;
        let current = 0;
        let total = 1;
        
        if (progress.phase === 'processing') {
          percentage = progress.totalFiles > 0 
            ? Math.floor((progress.currentFileIndex / progress.totalFiles) * 80)
            : 0;
          current = progress.currentFileIndex;
          total = progress.totalFiles;
        } else if (progress.phase === 'indexing') {
          const baseProgress = 80;
          const indexProgress = progress.totalChunks && progress.currentChunk
            ? Math.floor((progress.currentChunk / progress.totalChunks) * 15)
            : 0;
          percentage = baseProgress + indexProgress;
          current = progress.currentChunk || 0;
          total = progress.totalChunks || 1;
        } else if (progress.phase === 'finalizing') {
          percentage = 95;
          current = total = 1;
        }
        
        // Store current progress state
        this.currentProgress = { percentage, current, total };
        
        // Call both the UI callback and any stored callback
        if (onProgress) onProgress(progress);
        if (this.progressCallback) this.progressCallback(progress);
      };
      
      const result = await this.indexSync!.rebuildIndex(progressWrapper);
      
      // Clear progress when done
      this.currentProgress = null;
      
      const message = this.i18n.t('notifications.vectorDatabase.rebuildComplete', {
        chunks: result.added.toString(),
        duration: (result.duration / 1000).toFixed(1)
      });
      new Notice(message);

      if (result.errors.length > 0) {
        Logger.warn('Full rebuild completed with errors:', result.errors);
      }

      // Trigger stats update after rebuild completes
      this.triggerStatsUpdate();

      return result;
    } catch (error) {
      // Clear progress on error
      this.currentProgress = null;
      new Notice(this.i18n.t('notifications.vectorDatabase.rebuildFailed'));
      throw error;
    }
  }

  /**
   * Get indexing status
   */
  getStatus(): IndexingStatus {
    if (!this.isInitialized || !this.metaStore || !this.indexSync) {
      return {
        isIndexing: false,
        lastIndexTime: 0,
        totalChunks: 0,
        totalFiles: 0
      };
    }

    const allChunks = this.metaStore.getAll();
    const uniqueFiles = new Set(allChunks.map(c => c.filePath));

    return {
      isIndexing: this.indexSync.isSyncInProgress(),
      lastIndexTime: this.indexSync.getLastSyncTime(),
      totalChunks: allChunks.length,
      totalFiles: uniqueFiles.size
    };
  }

  /**
   * Pause indexing operation
   */
  pauseIndexing(): void {
    if (this.indexSync) {
      this.indexSync.pauseIndexing();
    }
  }

  /**
   * Resume indexing operation
   */
  resumeIndexing(): void {
    if (this.indexSync) {
      this.indexSync.resumeIndexing();
    }
  }

  /**
   * Check if indexing is paused
   */
  isPausedState(): boolean {
    if (this.indexSync) {
      return this.indexSync.isPausedState();
    }
    return false;
  }

  /**
   * Set progress callback for UI updates
   */
  setProgressCallback(callback: ProgressCallback | null): void {
    this.progressCallback = callback;
    // If there's current progress and a new callback is set, immediately notify
    if (this.currentProgress && callback) {
      // Reconstruct a progress object from stored state
      const progress = {
        currentFile: '',
        currentFileIndex: this.currentProgress.current,
        totalFiles: this.currentProgress.total,
        phase: 'processing' as const
      };
      callback(progress);
    }
  }

  /**
   * Get current progress state
   */
  getCurrentProgress(): { percentage: number; current: number; total: number } | null {
    return this.currentProgress;
  }

  /**
   * Set stats update callback for UI updates
   */
  setStatsUpdateCallback(callback: (() => void) | null): void {
    this.statsUpdateCallback = callback;
  }

  /**
   * Trigger stats update callback
   */
  private triggerStatsUpdate(): void {
    if (this.statsUpdateCallback) {
      this.statsUpdateCallback();
    }
  }

  /**
   * Update settings
   */
  async updateSettings(settings: VectorSettings): Promise<void> {
    const wasEnabled = this.settings.enabled;

    this.settings = settings;

    // Handle initialization/shutdown based on enabled state
    if (settings.enabled && !wasEnabled) {
      await this.initialize();
    } else if (!settings.enabled && wasEnabled) {
      await this.shutdown();
    }
  }

  /**
   * Check if system is initialized
   */
  public isSystemInitialized(): boolean {
    return this.isInitialized;
  }



  /**
   * Ensure system is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Vector database system is not initialized');
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalChunks: number;
    totalFiles: number;
    diskSizeKB: number;
  }> {
    if (!this.isInitialized || !this.metaStore || !this.oramaManager) {
      return {
        totalChunks: 0,
        totalFiles: 0,
        diskSizeKB: 0
      };
    }

    try {
      // Get total chunks count from Orama
      const totalChunks = await this.oramaManager.count();
      
      // Get unique files count from meta store
      const allChunks = this.metaStore.getAll();
      const uniqueFiles = new Set(allChunks.map(c => c.filePath));
      
      // Calculate disk size of database file
      let diskSizeKB = 0;
      // Remove leading ./ from storagePath for vault.adapter.stat()
      const storagePath = this.settings.storagePath.replace(/^\.\//, '');
      const dbPath = `${storagePath}/${this.settings.indexName}.json`;
      try {
        const stat = await this.vault.adapter.stat(dbPath);
        if (stat && stat.size) {
          diskSizeKB = Math.round(stat.size / 1024);
        }
      } catch (error) {
        Logger.warn('Could not get database file size:', error);
      }

      Logger.debug(`Stats: chunks=${totalChunks}, files=${uniqueFiles.size}, size=${diskSizeKB}KB, path=${dbPath}`);

      return {
        totalChunks,
        totalFiles: uniqueFiles.size,
        diskSizeKB
      };
    } catch (error) {
      Logger.error('Error getting stats:', error);
      return {
        totalChunks: 0,
        totalFiles: 0,
        diskSizeKB: 0
      };
    }
  }
  
  /**
   * Get OramaManager instance (for debugging)
   */
  getOramaManager(): OramaManager | null {
    return this.oramaManager || null;
  }

  /**
   * Get IndexSyncManager instance (for automatic indexing)
   */
  getIndexSync(): IndexSyncManager | null {
    return this.indexSync || null;
  }

  /**
   * Queue a file for indexing with debouncing
   */
  private indexQueue: Map<string, number> = new Map();
  private readonly DEBOUNCE_DELAY = 1000; // 1 second

  async queueFileIndex(filePath: string): Promise<void> {
    const existing = this.indexQueue.get(filePath);
    if (existing) {
      window.clearTimeout(existing);
    }
    
    const timeout = window.setTimeout(async () => {
      try {
        const file = this.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile && file.extension === 'md') {
          await this.indexSync?.indexFile(file);
          // Trigger stats update after file indexing completes (no notification)
          this.triggerStatsUpdate();
        }
      } catch (error) {
        Logger.error(`Failed to index file ${filePath}:`, error);
      } finally {
        this.indexQueue.delete(filePath);
      }
    }, this.DEBOUNCE_DELAY);
    
    this.indexQueue.set(filePath, timeout);
  }

  /**
   * Queue a file for removal with debouncing
   */
  async queueFileRemoval(filePath: string): Promise<void> {
    const existing = this.indexQueue.get(filePath);
    if (existing) {
      window.clearTimeout(existing);
    }
    
    const timeout = window.setTimeout(async () => {
      try {
        await this.indexSync?.removeFile(filePath);
        // Trigger stats update after file removal completes (no notification)
        this.triggerStatsUpdate();
      } catch (error) {
        Logger.error(`Failed to remove file ${filePath}:`, error);
      } finally {
        this.indexQueue.delete(filePath);
      }
    }, this.DEBOUNCE_DELAY);
    
    this.indexQueue.set(filePath, timeout);
  }
}
