/**
 * Index Sync Module
 * 索引同步模块 - 负责扫描 Vault、分块、计算差异并同步到向量数据库
 */

import { Vault, TFile, Notice } from 'obsidian';
import { Logger } from './../utils/logger';
import { ChunkMetaStore } from './chunkMetaStore';
import { ChunkMetadata, VectorSettings, IVectorDatabase } from './types';
import { SemanticChunker } from './semanticChunker';
import type { I18nManager } from '../i18n/i18n-manager';

/**
 * Result of a sync operation
 */
export interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
  duration: number;
}

/**
 * Progress callback for sync/rebuild operations
 */
export type ProgressCallback = (progress: {
  currentFile: string;
  currentFileIndex: number;
  totalFiles: number;
  currentChunk?: number;
  totalChunks?: number;
  phase: 'scanning' | 'processing' | 'indexing' | 'finalizing';
}) => void;

/**
 * Index Sync Manager
 */
export class IndexSyncManager {
  private vault: Vault;
  private vectorDB: IVectorDatabase;
  private metaStore: ChunkMetaStore;
  private settings: VectorSettings;
  private isSyncing: boolean = false;
  private isPaused: boolean = false;
  private lastSyncTime: number = 0;
  private semanticChunker: SemanticChunker;
  private i18n: I18nManager;

  constructor(
    vault: Vault,
    vectorDB: IVectorDatabase,
    metaStore: ChunkMetaStore,
    settings: VectorSettings,
    i18n: I18nManager
  ) {
    this.vault = vault;
    this.vectorDB = vectorDB;
    this.metaStore = metaStore;
    this.settings = settings;
    this.i18n = i18n;
    this.semanticChunker = new SemanticChunker();
  }

  /**
   * Check if currently syncing
   */
  public isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get last sync time
   */
  public getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Pause indexing operation
   */
  public pauseIndexing(): void {
    this.isPaused = true;
  }

  /**
   * Resume indexing operation
   */
  public resumeIndexing(): void {
    this.isPaused = false;
  }

  /**
   * Check if indexing is paused
   */
  public isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Perform full diff and sync
   */
  async diffAndSync(onProgress?: ProgressCallback): Promise<SyncResult> {
    // Allow stopping and restarting - don't throw error if already syncing
    // if (this.isSyncing) {
    //   throw new Error('Sync already in progress');
    // }

    this.isSyncing = true;
    const startTime = Date.now();
    const result: SyncResult = {
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      duration: 0
    };

    try {
      Logger.debug('Starting diff and sync...');

      // Step 1: Scan all markdown files in vault
      onProgress?.({ currentFile: '', currentFileIndex: 0, totalFiles: 0, phase: 'scanning' });
      const files = this.vault.getMarkdownFiles();
      Logger.debug(`Found ${files.length} markdown files`);

      // Step 2: Track which chunks should exist
      const expectedChunks = new Set<string>();
      const chunksToAdd: ChunkMetadata[] = [];
      const chunksToUpdate: ChunkMetadata[] = [];

      // Step 3: Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          onProgress?.({
            currentFile: file.path,
            currentFileIndex: i + 1,
            totalFiles: files.length,
            phase: 'processing'
          });
          
          const fileChunks = await this.processFile(file);
          
          for (const chunk of fileChunks) {
            expectedChunks.add(chunk.id);
            
            // Check if chunk exists in meta store
            const existingMeta = this.metaStore.get(chunk.id);
            
            if (!existingMeta) {
              // New chunk
              chunksToAdd.push(chunk);
              this.metaStore.set(chunk.id, chunk);
            } else if (existingMeta.contentHash !== chunk.contentHash) {
              // Modified chunk
              chunksToUpdate.push(chunk);
              this.metaStore.set(chunk.id, chunk);
            }
            // else: unchanged chunk, do nothing
          }
        } catch (error) {
          const errorMsg = `Failed to process file ${file.path}: ${error}`;
          Logger.error('[IndexSync]', errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Step 4: Find deleted chunks
      onProgress?.({
        currentFile: this.i18n.t('notifications.vectorDatabase.findingDeletedChunks'),
        currentFileIndex: files.length,
        totalFiles: files.length,
        phase: 'processing'
      });
      
      const allStoredChunks = this.metaStore.getAll();
      const chunksToDelete: string[] = [];

      for (const storedChunk of allStoredChunks) {
        if (!expectedChunks.has(storedChunk.id)) {
          chunksToDelete.push(storedChunk.id);
          this.metaStore.delete(storedChunk.id);
        }
      }

      // Step 5: Apply changes to ChromaDB
      onProgress?.({
        currentFile: this.i18n.t('notifications.vectorDatabase.applyingChanges'),
        currentFileIndex: files.length,
        totalFiles: files.length,
        phase: 'indexing'
      });
      
      if (chunksToAdd.length > 0) {
        await this.vectorDB.add(chunksToAdd);
        result.added = chunksToAdd.length;
      }

      if (chunksToUpdate.length > 0) {
        await this.vectorDB.update(chunksToUpdate);
        result.updated = chunksToUpdate.length;
      }

      if (chunksToDelete.length > 0) {
        await this.vectorDB.delete(chunksToDelete);
        result.deleted = chunksToDelete.length;
      }

      // Step 6: Save metadata
      onProgress?.({
        currentFile: this.i18n.t('notifications.vectorDatabase.savingMetadata'),
        currentFileIndex: files.length,
        totalFiles: files.length,
        phase: 'finalizing'
      });
      
      await this.metaStore.save();

      this.lastSyncTime = Date.now();
      result.duration = Date.now() - startTime;

      Logger.debug('Sync completed:', result);
      return result;

    } catch (error) {
      const errorMsg = `Sync failed: ${error}`;
      Logger.error('[IndexSync]', errorMsg);
      result.errors.push(errorMsg);
      throw error;
    } finally {
      this.isSyncing = false;
      this.isPaused = false;
    }
  }

  /**
   * Rebuild entire index from scratch
   */
  async rebuildIndex(onProgress?: ProgressCallback): Promise<SyncResult> {
    // Allow stopping and restarting - don't throw error if already syncing
    // if (this.isSyncing) {
    //   throw new Error('Sync already in progress');
    // }

    this.isSyncing = true;
    const startTime = Date.now();
    const result: SyncResult = {
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      duration: 0
    };

    try {
      Logger.debug('Starting full rebuild...');

      // Enable batch mode to reduce persistence frequency (critical for performance)
      if (this.vectorDB && 'setBatchMode' in this.vectorDB) {
        (this.vectorDB as unknown).setBatchMode(true);
        Logger.debug('Batch mode enabled for rebuild - will reduce persistence frequency');
      }

      // Step 1: Clear ChromaDB collection
      onProgress?.({ currentFile: this.i18n.t('notifications.vectorDatabase.clearingDatabase'), currentFileIndex: 0, totalFiles: 0, phase: 'scanning' });
      await this.vectorDB.rebuild();

      // Step 2: Clear meta store
      this.metaStore.clear();

      // Step 3: Scan and index all files
      const files = this.vault.getMarkdownFiles();
      const allChunks: ChunkMetadata[] = [];
      
      Logger.debug(`Processing ${files.length} files...`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          onProgress?.({
            currentFile: file.path,
            currentFileIndex: i + 1,
            totalFiles: files.length,
            phase: 'processing'
          });
          
          const fileChunks = await this.processFile(file);
          allChunks.push(...fileChunks);
          
          // Update meta store
          fileChunks.forEach(chunk => {
            this.metaStore.set(chunk.id, chunk);
          });
          
          // Small delay every 10 files to allow UI updates
          if ((i + 1) % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        } catch (error) {
          const errorMsg = `Failed to process file ${file.path}: ${error}`;
          Logger.error('[IndexSync]', errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Step 4: Add all chunks to ChromaDB
      if (allChunks.length > 0) {
        Logger.debug(`Indexing ${allChunks.length} chunks...`);
        
        // Add in batches to avoid overwhelming the API
        const batchSize = 100;
        for (let i = 0; i < allChunks.length; i += batchSize) {
          // Check if paused - wait until resumed
          while (this.isPaused) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          const batch = allChunks.slice(i, i + batchSize);
          const batchStartIndex = i;
          
          Logger.debug(`Adding batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allChunks.length/batchSize)} (${batch.length} chunks)...`);
          
          // Set up embedding progress callback for this batch
          if (this.vectorDB && 'setEmbeddingProgressCallback' in this.vectorDB) {
            (this.vectorDB as unknown).setEmbeddingProgressCallback((embBatchCurrent: number, embBatchTotal: number) => {
              // Calculate overall progress including embedding batches
              // Each chunk batch may have multiple embedding batches
              const chunksProcessedSoFar = batchStartIndex;
              const estimatedCurrentChunk = chunksProcessedSoFar + Math.floor((embBatchCurrent / embBatchTotal) * batch.length);
              
              // Logger.debug(`Embedding progress: batch ${embBatchCurrent}/${embBatchTotal}, overall chunk: ${estimatedCurrentChunk}/${allChunks.length}`);
              
              onProgress?.({
                currentFile: this.i18n.t('notifications.vectorDatabase.generatingEmbeddings', {
                  current: embBatchCurrent.toString(),
                  total: embBatchTotal.toString()
                }),
                currentFileIndex: files.length,
                totalFiles: files.length,
                currentChunk: estimatedCurrentChunk,
                totalChunks: allChunks.length,
                phase: 'indexing'
              });
            });
          }
          
          // Add batch (this includes embedding generation - most time consuming)
          await this.vectorDB.add(batch);
          result.added += batch.length;
          
          // Clear the callback after batch is done
          if (this.vectorDB && 'setEmbeddingProgressCallback' in this.vectorDB) {
            (this.vectorDB as unknown).setEmbeddingProgressCallback(null);
          }
          
          Logger.debug(`Batch ${Math.floor(i/batchSize) + 1} added successfully`);
          
          // Report progress AFTER batch is fully processed (including embeddings)
          const chunksProcessed = i + batch.length;
          // Logger.debug(`Reporting progress: ${chunksProcessed}/${allChunks.length} chunks processed`);
          
          onProgress?.({
            currentFile: this.i18n.t('notifications.vectorDatabase.indexingChunks'),
            currentFileIndex: files.length,
            totalFiles: files.length,
            currentChunk: chunksProcessed,
            totalChunks: allChunks.length,
            phase: 'indexing'
          });
          
          // Small delay to allow UI updates
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Step 5: Save metadata
      onProgress?.({
        currentFile: this.i18n.t('notifications.vectorDatabase.savingMetadata'),
        currentFileIndex: files.length,
        totalFiles: files.length,
        phase: 'finalizing'
      });
      
      await this.metaStore.save();
      
      // Step 6: Flush any pending persistence from batch mode
      if (this.vectorDB && 'flushPendingPersist' in this.vectorDB) {
        onProgress?.({
          currentFile: this.i18n.t('notifications.vectorDatabase.savingDatabase'),
          currentFileIndex: files.length,
          totalFiles: files.length,
          phase: 'finalizing'
        });
        await (this.vectorDB as unknown).flushPendingPersist();
        Logger.debug('Flushed pending database persistence');
      }

      // Disable batch mode
      if (this.vectorDB && 'setBatchMode' in this.vectorDB) {
        (this.vectorDB as unknown).setBatchMode(false);
        Logger.debug('Batch mode disabled');
      }

      // Step 7: Clean up backup file (rebuild completed successfully)
      if (this.vectorDB && 'cleanupBackup' in this.vectorDB) {
        try {
          await (this.vectorDB as unknown).cleanupBackup();
        } catch (error) {
          Logger.warn('Failed to cleanup backup file:', error);
        }
      }

      this.lastSyncTime = Date.now();
      result.duration = Date.now() - startTime;

      Logger.debug('Rebuild completed:', result);
      return result;

    } catch (error) {
      const errorMsg = `Rebuild failed: ${error}`;
      Logger.error('[IndexSync]', errorMsg);
      result.errors.push(errorMsg);
      
      // Make sure to disable batch mode and flush any pending data on error
      if (this.vectorDB && 'setBatchMode' in this.vectorDB) {
        (this.vectorDB as unknown).setBatchMode(false);
      }
      if (this.vectorDB && 'flushPendingPersist' in this.vectorDB) {
        try {
          await (this.vectorDB as unknown).flushPendingPersist();
        } catch (flushError) {
          Logger.error('Failed to flush pending persistence:', flushError);
        }
      }
      
      // Try to restore backup if rebuild failed
      if (this.vectorDB && 'restoreBackup' in this.vectorDB) {
        try {
          Logger.debug('Attempting to restore backup after rebuild failure...');
          await (this.vectorDB as unknown).restoreBackup();
        } catch (restoreError) {
          Logger.error('Failed to restore backup:', restoreError);
        }
      }
      
      throw error;
    } finally {
      this.isSyncing = false;
      this.isPaused = false;
    }
  }

  /**
   * Process a single file and split into chunks
   */
  private async processFile(file: TFile): Promise<ChunkMetadata[]> {
    try {
      // Read file content
      const content = await this.vault.cachedRead(file);
      
      // Log file info for debugging
      Logger.debug(`Processing file: ${file.path} (${content.length} chars)`);
      
      // Choose chunking strategy
      if (this.settings.chunkingStrategy === 'semantic') {
        // Use semantic chunking with Parsedoc
        return await this.semanticChunker.splitIntoChunks(content, file.path);
      } else {
        // Use character-based chunking
        const chunks = this.splitIntoChunks(content);
        
        Logger.debug(`Split ${file.path} into ${chunks.length} chunks`);
        
        // Create metadata for each chunk
        const chunkMetadatas: ChunkMetadata[] = [];
        
        for (let i = 0; i < chunks.length; i++) {
          const chunkContent = chunks[i];
          const chunkId = ChunkMetaStore.generateChunkId(file.path, i);
          const contentHash = ChunkMetaStore.computeHash(chunkContent);
          
          chunkMetadatas.push({
            id: chunkId,
            filePath: file.path,
            chunkIndex: i,
            contentHash,
            content: chunkContent,
            timestamp: Date.now()
          });
        }
        
        return chunkMetadatas;
      }
    } catch (error) {
      Logger.error(`Error processing file ${file.path}:`, error);
      Logger.error(`File size: ${(await this.vault.cachedRead(file)).length} chars`);
      Logger.error(`Chunk settings: size=${this.settings.chunkSize}, overlap=${this.settings.chunkOverlap}`);
      throw error;
    }
  }

  /**
   * Split text into overlapping chunks
   */
  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const chunkSize = this.settings.chunkSize;
    const overlap = this.settings.chunkOverlap;
    
    // Handle empty text
    if (text.trim().length === 0) {
      return chunks;
    }
    
    // Validate parameters
    if (chunkSize <= 0) {
      Logger.warn('Invalid chunk size, using default 1000');
      return this.splitIntoChunks(text);
    }
    
    if (overlap >= chunkSize) {
      Logger.warn('Overlap must be less than chunk size, adjusting to 10% of chunk size');
      const adjustedSettings = { ...this.settings, chunkOverlap: Math.floor(chunkSize * 0.1) };
      const tempThis = { ...this, settings: adjustedSettings };
      return this.splitIntoChunks.call(tempThis, text);
    }
    
    // Safety limit: max 10000 chunks per file to prevent memory issues
    const maxChunks = 10000;
    const estimatedChunks = Math.ceil(text.length / (chunkSize - overlap));
    
    if (estimatedChunks > maxChunks) {
      Logger.warn(`File too large: ${text.length} chars would create ${estimatedChunks} chunks. Limiting to ${maxChunks} chunks.`);
      // Adjust chunk size to stay within limit
      const adjustedChunkSize = Math.ceil(text.length / maxChunks) + overlap;
      const adjustedSettings = { ...this.settings, chunkSize: adjustedChunkSize };
      const tempThis = { ...this, settings: adjustedSettings };
      return this.splitIntoChunks.call(tempThis, text);
    }
    
    let start = 0;
    let chunkCount = 0;
    
    while (start < text.length && chunkCount < maxChunks) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.substring(start, end).trim();
      
      if (chunk.length > 0) {
        chunks.push(chunk);
        chunkCount++;
      }
      
      // Move to next chunk with overlap
      const step = chunkSize - overlap;
      if (step <= 0) {
        // Failsafe: if step is invalid, move by chunkSize
        start = end;
      } else {
        start += step;
      }
    }
    
    if (chunkCount >= maxChunks) {
      Logger.warn(`Reached maximum chunk limit (${maxChunks}), some content may be truncated`);
    }
    
    return chunks;
  }

  /**
   * Index a single file (useful for incremental updates)
   */
  async indexFile(file: TFile): Promise<void> {
    if (this.isSyncing) {
      Logger.warn('Sync in progress, skipping file index');
      return;
    }

    try {
      // Remove old chunks for this file
      const oldChunks = this.metaStore.getByFile(file.path);
      
      // Create a map of hash -> embedding from old chunks to reuse embeddings
      const oldEmbeddings = new Map<string, number[]>();
      for (const chunk of oldChunks) {
        if (chunk.embedding && chunk.embedding.length > 0) {
          oldEmbeddings.set(chunk.contentHash, chunk.embedding);
        }
      }

      if (oldChunks.length > 0) {
        await this.vectorDB.delete(oldChunks.map(c => c.id));
        this.metaStore.deleteByFile(file.path);
      }
      
      // Yield to main thread to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 0));

      // Process and add new chunks
      const newChunks = await this.processFile(file);
      
      // Try to reuse embeddings for new chunks
      let reusedCount = 0;
      for (const chunk of newChunks) {
        if (oldEmbeddings.has(chunk.contentHash)) {
          chunk.embedding = oldEmbeddings.get(chunk.contentHash);
          reusedCount++;
        }
      }
      
      if (reusedCount > 0) {
        Logger.debug(`Reusing embeddings for ${reusedCount}/${newChunks.length} chunks in ${file.path}`);
      }

      if (newChunks.length > 0) {
        await this.vectorDB.add(newChunks);
        newChunks.forEach(chunk => {
          this.metaStore.set(chunk.id, chunk);
        });
      }

      await this.metaStore.save();
      Logger.debug(`Indexed file: ${file.path}`);
    } catch (error) {
      Logger.error(`Failed to index file ${file.path}:`, error);
      throw error;
    }
  }

  /**
   * Remove a file from the index
   */
  async removeFile(filePath: string): Promise<void> {
    try {
      const chunks = this.metaStore.getByFile(filePath);
      if (chunks.length > 0) {
        await this.vectorDB.delete(chunks.map(c => c.id));
        this.metaStore.deleteByFile(filePath);
        await this.metaStore.save();
      }
      Logger.debug(`Removed file: ${filePath}`);
    } catch (error) {
      Logger.error(`Failed to remove file ${filePath}:`, error);
      throw error;
    }
  }
}
