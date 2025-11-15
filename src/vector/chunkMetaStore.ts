/**
 * Chunk Meta Store
 * 管理块元数据和哈希值，用于检测文件变化
 */

import { ChunkMetadata } from './types';
import { Logger } from './../utils/logger';
import { TFile, Vault } from 'obsidian';
import * as crypto from 'crypto';

/**
 * Store for chunk metadata using a simple JSON file
 */
export class ChunkMetaStore {
  private metaStore: Map<string, ChunkMetadata> = new Map();
  private vault: Vault;
  private metaFilePath: string;
  private isDirty: boolean = false;

  constructor(vault: Vault, metaFilePath: string = '.obsidian/vector-meta.json') {
    this.vault = vault;
    this.metaFilePath = metaFilePath;
  }

  /**
   * Load metadata from storage
   */
  async load(): Promise<void> {
    try {
      const adapter = this.vault.adapter;
      
      // Check if meta file exists
      const exists = await adapter.exists(this.metaFilePath);
      if (!exists) {
        Logger.debug('Meta file does not exist, creating new store');
        this.metaStore = new Map();
        return;
      }

      // Read and parse meta file
      const content = await adapter.read(this.metaFilePath);
      const data = JSON.parse(content);

      // Convert array back to Map
      this.metaStore = new Map(Object.entries(data));
      Logger.debug(`Loaded ${this.metaStore.size} chunk metadata entries`);
    } catch (error) {
      Logger.error('Failed to load metadata:', error);
      this.metaStore = new Map();
    }
  }

  /**
   * Save metadata to storage
   */
  async save(): Promise<void> {
    if (!this.isDirty) {
      return;
    }

    try {
      const adapter = this.vault.adapter;

      // Ensure directory exists
      const dirPath = this.metaFilePath.substring(0, this.metaFilePath.lastIndexOf('/'));
      const dirExists = await adapter.exists(dirPath);
      if (!dirExists) {
        await adapter.mkdir(dirPath);
      }

      // Convert Map to object for JSON serialization
      const data = Object.fromEntries(this.metaStore);
      const content = JSON.stringify(data, null, 2);

      // Write to file
      await adapter.write(this.metaFilePath, content);
      this.isDirty = false;

      Logger.debug(`Saved ${this.metaStore.size} chunk metadata entries`);
    } catch (error) {
      Logger.error('Failed to save metadata:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a chunk
   */
  get(chunkId: string): ChunkMetadata | undefined {
    return this.metaStore.get(chunkId);
  }

  /**
   * Set metadata for a chunk
   */
  set(chunkId: string, metadata: ChunkMetadata): void {
    this.metaStore.set(chunkId, metadata);
    this.isDirty = true;
  }

  /**
   * Delete metadata for a chunk
   */
  delete(chunkId: string): void {
    this.metaStore.delete(chunkId);
    this.isDirty = true;
  }

  /**
   * Get all metadata entries
   */
  getAll(): ChunkMetadata[] {
    return Array.from(this.metaStore.values());
  }

  /**
   * Get metadata for all chunks in a file
   */
  getByFile(filePath: string): ChunkMetadata[] {
    return Array.from(this.metaStore.values()).filter(
      meta => meta.filePath === filePath
    );
  }

  /**
   * Delete all metadata for a file
   */
  deleteByFile(filePath: string): void {
    const toDelete: string[] = [];
    for (const [id, meta] of this.metaStore.entries()) {
      if (meta.filePath === filePath) {
        toDelete.push(id);
      }
    }
    toDelete.forEach(id => this.metaStore.delete(id));
    if (toDelete.length > 0) {
      this.isDirty = true;
    }
  }

  /**
   * Clear all metadata
   */
  clear(): void {
    this.metaStore.clear();
    this.isDirty = true;
  }

  /**
   * Get total count of chunks
   */
  count(): number {
    return this.metaStore.size;
  }

  /**
   * Check if a chunk exists
   */
  has(chunkId: string): boolean {
    return this.metaStore.has(chunkId);
  }

  /**
   * Compute hash of content
   */
  static computeHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Generate chunk ID from file path and index
   */
  static generateChunkId(filePath: string, chunkIndex: number): string {
    return `${filePath}::${chunkIndex}`;
  }

  /**
   * Parse chunk ID into file path and index
   */
  static parseChunkId(chunkId: string): { filePath: string; chunkIndex: number } | null {
    const parts = chunkId.split('::');
    if (parts.length !== 2) {
      return null;
    }
    const chunkIndex = parseInt(parts[1], 10);
    if (isNaN(chunkIndex)) {
      return null;
    }
    return {
      filePath: parts[0],
      chunkIndex
    };
  }
}
