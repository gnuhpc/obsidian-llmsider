/**
 * Orama Manager
 * 管理本地 Orama 向量数据库
 */

import { Logger } from '../utils/logger';
import {
  create,
  insert,
  insertMultiple,
  update,
  remove,
  removeMultiple,
  search,
  count as oramaCount,
  getByID
} from '@orama/orama';
import type { Orama, TypedDocument } from '@orama/orama';
import { persist, restore } from '@orama/plugin-data-persistence';
// Chinese tokenizer support - requires moduleResolution compatibility workaround
// See: https://docs.orama.com/docs/orama-js/supported-languages/using-chinese-with-orama
// @ts-ignore - Package exports work correctly at runtime with esbuild
import { createTokenizer } from '@orama/tokenizers/mandarin';
// @ts-ignore - Package exports work correctly at runtime with esbuild
import { stopwords as mandarinStopwords } from '@orama/stopwords/mandarin';
import { ChunkMetadata, DocItem, IVectorDatabase } from './types';
import { Notice, requestUrl } from 'obsidian';
import * as path from 'path';
import { promises as fs } from 'fs';
import { LLMConnection, LLMModel } from '../types';
import { embedMany } from 'ai';
import { UnifiedToolManager } from '../tools/unified-tool-manager';
import type { I18nManager } from '../i18n/i18n-manager';
import { GitHubAuth } from '../auth/github-auth';

// Define the schema for our documents
type OramaSchema = {
  id: 'string';
  filePath: 'string';
  chunkIndex: 'number';
  contentHash: 'string';
  content: 'string';
  timestamp: 'number';
  embedding: 'vector[1536]'; // Default OpenAI embedding size, will be adjusted based on actual model
};

type OramaDocument = TypedDocument<Orama<OramaSchema>>;

export class OramaManager implements IVectorDatabase {
  private db: Orama<OramaSchema> | null = null;
  private storagePath: string;
  private indexName: string;
  private connection: LLMConnection | null = null;
  private model: LLMModel | null = null;
  private embeddingProgressCallback: ((current: number, total: number) => void) | null = null;
  private connectionUpdateCallback: ((connection: LLMConnection) => Promise<void>) | null = null;
  private toolManager: UnifiedToolManager;
  private embeddingDimension: number = 1536; // Default dimension
  private i18n: I18nManager | null = null;

  constructor(
    storagePath: string,
    indexName: string,
    toolManager: UnifiedToolManager,
    connection: LLMConnection | null = null,
    model: LLMModel | null = null,
    i18n?: I18nManager
  ) {
    this.storagePath = storagePath;
    this.indexName = indexName;
    this.toolManager = toolManager;
    this.connection = connection;
    this.model = model;
    this.i18n = i18n || null;
  }

  /**
   * Update connection and model settings (for remote embeddings)
   */
  updateConnectionModel(connection: LLMConnection, model: LLMModel): void {
    this.connection = connection;
    this.model = model;
  }

  /**
   * Set embedding progress callback
   */
  setEmbeddingProgressCallback(callback: ((current: number, total: number) => void) | null): void {
    this.embeddingProgressCallback = callback;
  }

  /**
   * Set connection update callback (for token refresh)
   */
  setConnectionUpdateCallback(callback: ((connection: LLMConnection) => Promise<void>) | null): void {
    this.connectionUpdateCallback = callback;
  }

  /**
   * Get the persistence file path
   */
  private getPersistencePath(): string {
    return path.join(this.storagePath, `${this.indexName}.json`);
  }

  /**
   * Detect embedding dimension - use configured dimension if available, otherwise generate test embedding
   */
  private async detectEmbeddingDimension(): Promise<number> {
    // For remote provider
    if (!this.connection || !this.model) {
      Logger.warn('Cannot detect dimension without connection/model, using default 1536');
      return 1536;
    }

    // GitHub Copilot uses fixed 1024 dimensions for embeddings
    if (this.connection.type === 'github-copilot') {
      Logger.debug('GitHub Copilot uses fixed 1024-dimensional embeddings');
      return 1024;
    }

    // First, check if the model has a configured embedding dimension
    if (this.model.embeddingDimension && this.model.embeddingDimension > 0) {
      Logger.debug(`Using configured embedding dimension: ${this.model.embeddingDimension}`);
      return this.model.embeddingDimension;
    }

    // If not configured, try to detect by generating a test embedding
    try {
      Logger.debug('No dimension configured, detecting by generating test embedding...');
      const testEmbeddings = await this.generateEmbeddings(['test']);
      const dimension = testEmbeddings[0].length;
      Logger.debug(`Detected embedding dimension: ${dimension}`);
      return dimension;
    } catch (error) {
      Logger.warn('Failed to detect dimension, using default 1536:', error);
      return 1536;
    }
  }

  /**
   * Initialize Orama database
   */
  async initialize(): Promise<void> {
    try {
      Logger.debug('Initializing Orama database...');

      const persistencePath = this.getPersistencePath();
      Logger.debug(`Persistence path: "${persistencePath}"`);

      // Check if persisted database file exists
      let fileExists = false;
      try {
        await fs.access(persistencePath);
        fileExists = true;
        Logger.debug('Database file exists, attempting to load...');
      } catch (error) {
        Logger.debug('Database file does not exist, will create new one');
      }

      if (fileExists) {
        // File exists - MUST load it, do NOT create new database
        try {
          const data = await fs.readFile(persistencePath, 'utf-8');
          
          // Parse JSON to verify it's valid and extract metadata
          const parsedData = JSON.parse(data);
          const docCount = parsedData?.docs?.count || 0;
          
          Logger.debug(`Database file contains ${docCount} documents`);
          
          if (docCount === 0) {
            Logger.warn(`WARNING: Database file exists but contains no documents!`);
            Logger.warn(`This might indicate a previous failed rebuild.`);
          }
          
          // IMPORTANT: Always use configured dimension from model, not from file
          // This allows users to switch to different embedding models with different dimensions
          this.embeddingDimension = await this.detectEmbeddingDimension();
          Logger.debug(`Using configured embedding dimension: ${this.embeddingDimension}`);
          
          // Check if dimension changed from file
          const embeddingProperty = parsedData?.index?.searchablePropertiesWithTypes?.embedding;
          let fileDimension = 1536; // default
          if (embeddingProperty && typeof embeddingProperty === 'string') {
            const match = embeddingProperty.match(/vector\[(\d+)\]/);
            if (match) {
              fileDimension = parseInt(match[1], 10);
            }
          }
          
          if (fileDimension !== this.embeddingDimension) {
            Logger.warn(`Dimension mismatch: file has ${fileDimension}D, but model requires ${this.embeddingDimension}D`);
            Logger.warn(`Database needs to be rebuilt with new embedding dimension`);
            // Don't load the old database, create a new one instead
            throw new Error('DIMENSION_MISMATCH');
          }
          
          // Restore database from persisted data
          this.db = await restore('json', data) as Orama<OramaSchema>;
          Logger.debug(`Successfully loaded existing database with ${docCount} documents (${this.embeddingDimension}D embeddings)`);
          
        } catch (error) {
          // Check if it's a dimension mismatch or corruption
          const isDimensionMismatch = error instanceof Error && error.message === 'DIMENSION_MISMATCH';
          
          if (isDimensionMismatch) {
            Logger.warn('Embedding dimension changed, creating new database...');
          } else {
            Logger.error('Database file exists but is corrupted!');
            Logger.error('Error details:', error);
            Logger.error('File path:', persistencePath);
          }

          // Auto-recovery: Backup old file and create new database
          try {
            if (isDimensionMismatch) {
              Logger.debug('Backing up database with old dimension...');
            } else {
              Logger.debug('Attempting auto-recovery...');
            }

            // Backup the old file
            const backupSuffix = isDimensionMismatch ? 'old-dimension' : 'corrupted';
            const backupPath = `${persistencePath}.${backupSuffix}-${Date.now()}`;
            await fs.rename(persistencePath, backupPath);
            Logger.debug(`Backed up old file to: ${backupPath}`);

            // Create new database with current dimension
            Logger.debug('Creating new database...');
            // Dimension already set above, don't re-detect
            if (!this.embeddingDimension || this.embeddingDimension === 0) {
              this.embeddingDimension = await this.detectEmbeddingDimension();
            }

            this.db = await create({
              schema: {
                id: 'string',
                filePath: 'string',
                chunkIndex: 'number',
                contentHash: 'string',
                content: 'string',
                timestamp: 'number',
                embedding: `vector[${this.embeddingDimension}]` as 'vector[1536]'
              } as OramaSchema,
              components: {
                tokenizer: createTokenizer({
                  language: 'mandarin',
                  stopWords: mandarinStopwords
                })
              }
            });

            if (isDimensionMismatch) {
              Logger.debug(`Successfully created new database with ${this.embeddingDimension}D embeddings`);
              const message = this.i18n?.t('vectorDatabase.dimensionChanged') || 'Vector database dimension changed. Please rebuild the index with the new embedding model.';
              new Notice(message, 8000);
            } else {
              Logger.debug(`Successfully recovered from database corruption with ${this.embeddingDimension}D embeddings`);
              const message = this.i18n?.t('vectorDatabase.databaseCorrupted') || 'Vector database was corrupted and has been automatically reset. Please rebuild the index.';
              new Notice(message, 8000);
            }

          } catch (recoveryError) {
            Logger.error('Failed to recover:', recoveryError);
            throw new Error(`Database recovery failed: ${error}`);
          }
        }
      } else {
        // File doesn't exist - safe to create new database
        Logger.debug('Creating new database...');
        
        // Detect embedding dimension from the actual model
        this.embeddingDimension = await this.detectEmbeddingDimension();
        
        this.db = await create({
          schema: {
            id: 'string',
            filePath: 'string',
            chunkIndex: 'number',
            contentHash: 'string',
            content: 'string',
            timestamp: 'number',
            embedding: `vector[${this.embeddingDimension}]` as 'vector[1536]'
          } as OramaSchema,
          components: {
            tokenizer: createTokenizer({
              language: 'mandarin',
              stopWords: mandarinStopwords
            })
          }
        });

        Logger.debug(`Created new database "${this.indexName}" with ${this.embeddingDimension}-dimensional embeddings and Chinese tokenizer`);
      }

      Logger.debug('Orama initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize Orama:', error);
      throw error;
    }
  }

  /**
   * Persist the database to disk
   */
  private async persist(): Promise<void> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    try {
      // Persist database to JSON format
      const serializedData = await persist(this.db, 'json');
      const persistencePath = this.getPersistencePath();
      
      // Ensure directory exists
      await fs.mkdir(this.storagePath, { recursive: true });
      
      // Write to file
      await fs.writeFile(persistencePath, serializedData as string, 'utf-8');
      
      Logger.debug(`Database persisted to "${persistencePath}"`);
    } catch (error) {
      Logger.error('Failed to persist database:', error);
      throw error;
    }
  }

  /**
   * Ensure we have a valid GitHub Copilot token (refresh if expired or about to expire)
   */
  private async ensureValidCopilotToken(): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not configured');
    }

    const now = Date.now();
    const expiryTime = this.connection.tokenExpiry || 0;
    const timeUntilExpiry = expiryTime - now;
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);
    
    Logger.debug(`Token check - Current time: ${new Date(now).toISOString()}, Expiry: ${new Date(expiryTime).toISOString()}, Minutes until expiry: ${minutesUntilExpiry}`);

    // Check if token is expired or about to expire (within 5 minutes)
    if (!this.connection.copilotToken || !this.connection.tokenExpiry || 
        now >= expiryTime - 5 * 60 * 1000) {
      Logger.debug('GitHub Copilot token expired or about to expire, refreshing...');
      
      if (!this.connection.githubToken) {
        throw new Error('GitHub token not found. Please re-authenticate with GitHub.');
      }
      
      try {
        const tokenData = await GitHubAuth.getCopilotToken(this.connection.githubToken);
        
        // Update the connection object directly
        this.connection.copilotToken = tokenData.token;
        this.connection.tokenExpiry = tokenData.expires_at * 1000; // Convert to milliseconds
        
        Logger.debug(`GitHub Copilot token refreshed successfully`);
        Logger.debug(`New token expires at: ${new Date(this.connection.tokenExpiry).toISOString()}`);
        Logger.debug(`Token will be valid for ${Math.floor((this.connection.tokenExpiry - Date.now()) / 60000)} minutes`);
        
        // Also update the connection in settings via callback if available
        if (this.connectionUpdateCallback) {
          try {
            await this.connectionUpdateCallback(this.connection);
            Logger.debug('Connection update callback completed successfully');
          } catch (callbackError) {
            Logger.error('Connection update callback failed:', callbackError);
            // Don't throw - the local connection is already updated
          }
        }
      } catch (error) {
        Logger.error('Failed to refresh GitHub Copilot token:', error);
        const err = error as Error;
        throw new Error(`Failed to refresh GitHub Copilot token: ${err.message}`);
      }
    } else {
      Logger.debug(`Token is still valid (${minutesUntilExpiry} minutes remaining)`);
    }
  }

  /**
   * Generate embeddings using GitHub Copilot REST API
   */
  private async generateGitHubCopilotEmbeddings(
    texts: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<number[][]> {
    if (!this.connection) {
      throw new Error('Connection not configured');
    }
    
    // Ensure we have a valid token (refresh if expired or about to expire)
    await this.ensureValidCopilotToken();
    
    // MUST use copilotToken (NOT githubToken) - copilotToken is the access token from getCopilotToken API
    const token = this.connection.copilotToken;
    if (!token) {
      throw new Error('GitHub Copilot access token not found. Please re-authenticate with GitHub Copilot.');
    }

    // Use smaller batch size for better progress feedback (max 16 per GitHub Copilot API)
    const maxBatchSize = 10;
    const maxRetries = 3;
    const retryDelayMs = 1000;

    try {
      const allEmbeddings: number[][] = [];
      const totalBatches = Math.ceil(texts.length / maxBatchSize);
      
      for (let i = 0; i < texts.length; i += maxBatchSize) {
        const batch = texts.slice(i, Math.min(i + maxBatchSize, texts.length));
        const batchNum = Math.floor(i / maxBatchSize) + 1;
        
        Logger.debug(`Generating GitHub Copilot embeddings for batch ${batchNum}/${totalBatches} (${batch.length} texts)`);
        
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await requestUrl({
              url: 'https://api.githubcopilot.com/embeddings',
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Editor-Version': 'vscode/1.95.0',
                'Editor-Plugin-Version': 'copilot-chat/0.22.4',
                'User-Agent': 'GitHubCopilotChat/0.22.4'
              },
              body: JSON.stringify({
                input: batch,
                // Use text-embedding-3-small for embeddings (not chat models)
                model: 'text-embedding-3-small',
                // GitHub Copilot embeddings API uses 1024 dimensions
                dimensions: 1024
              })
            });

            if (response.status !== 200) {
              throw new Error(`GitHub Copilot API error: ${response.status}`);
            }

            const data = response.json;
            if (!data.data || !Array.isArray(data.data)) {
              throw new Error('Invalid response format from GitHub Copilot API');
            }

            // Extract embeddings from response
            const embeddings = data.data.map((item: any) => item.embedding);
            
            // Validate embeddings
            if (embeddings.length === 0 || !embeddings[0] || !Array.isArray(embeddings[0])) {
              Logger.error('Invalid embeddings format:', { 
                count: embeddings.length,
                firstEmbedding: embeddings[0] ? `Array(${embeddings[0].length})` : 'null'
              });
              throw new Error('Invalid embeddings format from GitHub Copilot API');
            }
            
            Logger.debug(`Generated ${embeddings.length} embeddings, dimension: ${embeddings[0].length}`);
            
            allEmbeddings.push(...embeddings);
            lastError = null;
            
            if (onProgress) {
              onProgress(batchNum, totalBatches);
            }
            
            break;
          } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries) {
              const delay = retryDelayMs * attempt;
              Logger.warn(`GitHub Copilot batch ${batchNum} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, lastError.message);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        if (lastError) {
          Logger.error(`GitHub Copilot batch ${batchNum} failed after ${maxRetries} attempts`);
          throw lastError;
        }
      }

      return allEmbeddings;
    } catch (error) {
      const err = error as Error;
      Logger.error('Failed to generate GitHub Copilot embeddings:', err);
      throw new Error(`Failed to generate embeddings: ${err.message}`);
    }
  }

  /**
   * Generate embeddings using remote API (OpenAI-compatible)
   */
  private async generateEmbeddings(
    texts: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<number[][]> {
    if (!this.connection || !this.model) {
      throw new Error('Embedding model not configured. Please select a model in settings.');
    }
    const maxRetries = 3;
    const retryDelayMs = 1000; // Start with 1 second delay
    const maxInputLength = 8192; // Maximum input length for most embedding models

    try {
      // Pre-process texts to handle those exceeding max length
      const processedTexts: string[] = [];
      const textIndexMap: number[] = []; // Maps processed text index to original text index
      
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        
        if (text.length <= maxInputLength) {
          // Text is within limit, use as-is
          processedTexts.push(text);
          textIndexMap.push(i);
        } else {
          // Text exceeds limit, split it
          Logger.warn(`Text ${i} exceeds ${maxInputLength} chars (${text.length}), splitting...`);
          
          // Calculate how many splits we need
          let numSplits = 2;
          while (Math.ceil(text.length / numSplits) > maxInputLength) {
            numSplits *= 2; // Double the splits if still too long
          }
          
          Logger.debug(`Splitting text ${i} into ${numSplits} parts`);
          
          const chunkSize = Math.ceil(text.length / numSplits);
          for (let j = 0; j < numSplits; j++) {
            const start = j * chunkSize;
            const end = Math.min(start + chunkSize, text.length);
            const subText = text.substring(start, end);
            processedTexts.push(subText);
            textIndexMap.push(i); // All sub-texts map to same original index
          }
        }
      }
      
      Logger.debug(`Processed ${texts.length} texts into ${processedTexts.length} chunks for embedding`);
      
      // GitHub Copilot needs special handling as it uses direct REST API
      if (this.connection.type === 'github-copilot') {
        return await this.generateGitHubCopilotEmbeddings(processedTexts, onProgress);
      }
      
      // All other embedding models use OpenAI-compatible API format
      const { createOpenAI } = await import('@ai-sdk/openai');
      
      // Determine base URL, API key, and batch size based on connection type
      let baseURL: string | undefined;
      let apiKey: string;
      // Use smaller batch size for all providers to show better progress feedback
      let maxBatchSize = 10; // Reduced from 100 for better user experience
      
      if (this.connection.type === 'qwen') {
        // Qwen has a default endpoint and strict batch size limit
        baseURL = this.connection.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        maxBatchSize = 10; // Qwen's embedding API limit
        apiKey = this.connection.apiKey;
      } else if (this.connection.baseUrl) {
        // Use configured base URL for compatible providers
        baseURL = this.connection.baseUrl;
        apiKey = this.connection.apiKey;
      } else {
        // For standard OpenAI, baseURL remains undefined (uses default)
        apiKey = this.connection.apiKey;
      }
      
      const provider = createOpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
        organization: this.connection.organizationId
      });
      
      const embeddingModel = provider.embedding(this.model.modelName);
      
      // Prepare embedding options with dimensions if configured
      // Note: dimensions parameter is supported by some models like text-embedding-3-small/large
      const embeddingOptions: any = {};
      if (this.model.embeddingDimension && this.model.embeddingDimension > 0) {
        embeddingOptions.dimensions = this.model.embeddingDimension;
        Logger.debug(`Requesting embeddings with dimension: ${this.model.embeddingDimension}`);
      }
      
      // Process in batches to respect API limits
      const allProcessedEmbeddings: number[][] = [];
      const totalBatches = Math.ceil(processedTexts.length / maxBatchSize);
      
      for (let i = 0; i < processedTexts.length; i += maxBatchSize) {
        const batch = processedTexts.slice(i, Math.min(i + maxBatchSize, processedTexts.length));
        const batchNum = Math.floor(i / maxBatchSize) + 1;
        
        Logger.debug(`Generating embeddings for batch ${batchNum}/${totalBatches} (${batch.length} texts)`);
        
        // Retry logic for each batch
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const { embeddings } = await embedMany({
              model: embeddingModel,
              values: batch,
              ...embeddingOptions
            });
            
            allProcessedEmbeddings.push(...embeddings);
            lastError = null;
            
            // Report progress after successful batch
            if (onProgress) {
              onProgress(batchNum, totalBatches);
            }
            
            break; // Success, exit retry loop
          } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries) {
              const delay = retryDelayMs * attempt; // Exponential backoff
              Logger.warn(`Batch ${batchNum} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, lastError.message);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // If all retries failed, throw the last error
        if (lastError) {
          Logger.error(`Batch ${batchNum} failed after ${maxRetries} attempts`);
          throw lastError;
        }
      }

      // Merge embeddings back to original text count
      // For split texts, average their embeddings
      const finalEmbeddings: number[][] = [];
      for (let i = 0; i < texts.length; i++) {
        const relatedEmbeddings = allProcessedEmbeddings.filter((_, idx) => textIndexMap[idx] === i);
        
        if (relatedEmbeddings.length === 1) {
          // No split, use directly
          finalEmbeddings.push(relatedEmbeddings[0]);
        } else {
          // Multiple splits, average them
          const embeddingDim = relatedEmbeddings[0].length;
          const avgEmbedding = new Array(embeddingDim).fill(0);
          
          for (const emb of relatedEmbeddings) {
            for (let j = 0; j < embeddingDim; j++) {
              avgEmbedding[j] += emb[j];
            }
          }
          
          for (let j = 0; j < embeddingDim; j++) {
            avgEmbedding[j] /= relatedEmbeddings.length;
          }
          
          finalEmbeddings.push(avgEmbedding);
          Logger.debug(`Averaged ${relatedEmbeddings.length} embeddings for text ${i}`);
        }
      }

      return finalEmbeddings;
    } catch (error) {
      const err = error as Error;
      Logger.error('Failed to generate embeddings:', err);
      throw new Error(`Failed to generate embeddings: ${err.message}`);
    }
  }

  /**
   * Add chunks to the database
   */
  async add(chunks: ChunkMetadata[]): Promise<void> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    if (chunks.length === 0) {
      return;
    }

    try {
      // Generate embeddings for all chunks
      const texts = chunks.map(c => c.content);
      const embeddings = await this.generateEmbeddings(texts, this.embeddingProgressCallback || undefined);

      // Insert documents into database
      const documents = chunks.map((chunk, i) => ({
        id: chunk.id,
        filePath: chunk.filePath,
        chunkIndex: chunk.chunkIndex,
        contentHash: chunk.contentHash,
        content: chunk.content,
        timestamp: chunk.timestamp,
        embedding: embeddings[i]
      }));

      await insertMultiple(this.db, documents);
      
      // Persist after batch insert
      await this.persist();

      Logger.debug(`Added ${chunks.length} chunks`);
    } catch (error) {
      Logger.error('Failed to add chunks:', error);
      throw error;
    }
  }

  /**
   * Update chunks in the database
   */
  async update(chunks: ChunkMetadata[]): Promise<void> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    if (chunks.length === 0) {
      return;
    }

    try {
      // Generate embeddings for all chunks
      const texts = chunks.map(c => c.content);
      const embeddings = await this.generateEmbeddings(texts);

      // Update documents (remove old and insert new)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Try to remove existing document first
        try {
          await remove(this.db, chunk.id);
        } catch (error) {
          // Document might not exist, continue
        }

        // Insert updated document
        await insert(this.db, {
          id: chunk.id,
          filePath: chunk.filePath,
          chunkIndex: chunk.chunkIndex,
          contentHash: chunk.contentHash,
          content: chunk.content,
          timestamp: chunk.timestamp,
          embedding: embeddings[i]
        });
      }

      // Persist after batch update
      await this.persist();

      Logger.debug(`Updated ${chunks.length} chunks`);
    } catch (error) {
      Logger.error('Failed to update chunks:', error);
      throw error;
    }
  }

  /**
   * Delete chunks from the database
   */
  async delete(chunkIds: string[]): Promise<void> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    if (chunkIds.length === 0) {
      return;
    }

    try {
      // Remove documents from database
      await removeMultiple(this.db, chunkIds);
      
      // Persist after batch delete
      await this.persist();

      Logger.debug(`Deleted ${chunkIds.length} chunks`);
    } catch (error) {
      Logger.error('Failed to delete chunks:', error);
      throw error;
    }
  }

  /**
   * Query the database for similar documents using hybrid search
   */
  async query(queryText: string, topK: number = 5): Promise<DocItem[]> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    try {
      Logger.debug(`Performing hybrid search for: "${queryText}"`);
      
      // Generate embedding for query
      const embeddings = await this.generateEmbeddings([queryText]);
      
      // Validate embeddings
      if (!embeddings || embeddings.length === 0) {
        throw new Error('Failed to generate query embedding: empty result');
      }
      
      const queryVector = embeddings[0];
      
      if (!queryVector || !Array.isArray(queryVector) || queryVector.length === 0) {
        Logger.error('Invalid query vector:', { 
          hasVector: !!queryVector,
          isArray: Array.isArray(queryVector),
          length: queryVector?.length 
        });
        throw new Error('Invalid query embedding format');
      }
      
      Logger.debug(`Generated query embedding with dimension: ${queryVector.length}`);
      
      // Check if query embedding dimension matches database dimension
      if (queryVector.length !== this.embeddingDimension) {
        const errorMsg = `Embedding dimension mismatch: query has ${queryVector.length}D but database expects ${this.embeddingDimension}D. Please rebuild the vector index with the current embedding model.`;
        Logger.error(`${errorMsg}`);
        
        // Show user-friendly notice
        const noticeMsg = this.i18n?.t('vectorDatabase.dimensionMismatch') || 
          'Vector database dimension mismatch. Please rebuild the index in settings.';
        new Notice(noticeMsg, 8000);
        
        throw new Error(errorMsg);
      }

      // Perform hybrid search (combines full-text and vector search)
      const results = await search(this.db, {
        term: queryText, // Full-text search term
        mode: 'hybrid', // Use hybrid search mode
        vector: {
          value: queryVector,
          property: 'embedding'
        },
        limit: topK,
        includeVectors: false,
        // Boost fields for better relevance
        boost: {
          content: 2, // Prioritize content matches
          filePath: 1
        },
        // Hybrid search parameters - lowered threshold for better recall
        similarity: 0.3, // Minimum similarity score (0-1) - lowered from 0.8 to catch more results
        hybridWeights: {
          text: 0.3, // 30% weight for full-text search (increased text weight)
          vector: 0.7 // 70% weight for vector search
        }
      });

      // Convert to DocItem format
      const docItems: DocItem[] = results.hits.map((hit: any) => {
        const doc = hit.document;
        return {
          id: doc.id,
          filePath: doc.filePath,
          chunkIndex: doc.chunkIndex,
          content: doc.content,
          score: hit.score,
          metadata: {
            contentHash: doc.contentHash,
            timestamp: doc.timestamp
          }
        };
      });

      Logger.debug(`Hybrid search returned ${docItems.length} results (total hits: ${results.count})`);
      if (docItems.length > 0) {
        Logger.debug(`Top result score: ${docItems[0].score.toFixed(4)}`);
      }
      
      return docItems;
    } catch (error) {
      Logger.error('Failed to perform hybrid search:', error);
      throw error;
    }
  }

  /**
   * Get total count of chunks in database
   */
  async count(): Promise<number> {
    if (!this.db) {
      Logger.warn('count() called but db is null');
      throw new Error('Orama not initialized');
    }

    try {
      // Try using the standard count API first
      const total = await oramaCount(this.db);
      Logger.debug(`count() returned: ${total}`);
      
      // Workaround: If count returns 0 but db exists, use search to get actual count
      // This is needed because restore() doesn't preserve internal count metadata
      if (total === 0) {
        Logger.debug('Standard count returned 0, trying search-based count...');
        const searchResult = await search(this.db, {
          term: '', // Empty term to match all documents
          limit: 0, // We don't need actual results
          includeVectors: false
        });
        const actualCount = searchResult.count || 0;
        Logger.debug(`Search-based count returned: ${actualCount}`);
        return actualCount;
      }
      
      return total;
    } catch (error) {
      Logger.error('Failed to get count:', error);
      return 0;
    }
  }

  /**
   * Clear all data from database (in memory only, does NOT persist)
   * Note: This only clears the in-memory database. 
   * The persisted file will only be updated when persist() is called explicitly.
   */
  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    try {
      // Recreate the database from scratch (in memory only)
      this.db = await create({
        schema: {
          id: 'string',
          filePath: 'string',
          chunkIndex: 'number',
          contentHash: 'string',
          content: 'string',
          timestamp: 'number',
          embedding: `vector[${this.embeddingDimension}]` as 'vector[1536]'
        } as OramaSchema,
        components: {
          tokenizer: createTokenizer({
            language: 'mandarin',
            stopWords: mandarinStopwords
          })
        }
      });

      // DO NOT persist here! Only clear in memory.
      // The file will be persisted when rebuild() completes successfully.
      Logger.debug('Database cleared (in memory only, not persisted)');
    } catch (error) {
      Logger.error('Failed to clear database:', error);
      throw error;
    }
  }

  /**
   * Rebuild the entire database
   * Note: The old database file is preserved until rebuild completes successfully
   * IMPORTANT: This method does NOT re-detect embedding dimension or reload the model.
   * It reuses the existing dimension and model that were initialized during initialize().
   */
  async rebuild(): Promise<void> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    try {
      const persistencePath = this.getPersistencePath();
      
      // Backup the old database file (if exists) before rebuilding
      const backupPath = `${persistencePath}.backup`;
      try {
        await fs.copyFile(persistencePath, backupPath);
        Logger.debug(`Created backup of existing database at "${backupPath}"`);
      } catch (error) {
        // File might not exist, that's ok
        Logger.debug('No existing database file to backup');
      }

      // IMPORTANT: Do NOT re-detect embedding dimension here!
      // Use the existing dimension that was set during initialize()
      // This prevents re-downloading the model during rebuild
      Logger.debug(`Reusing existing embedding dimension: ${this.embeddingDimension}`);

      // Recreate database in memory (doesn't affect file yet)
      this.db = await create({
        schema: {
          id: 'string',
          filePath: 'string',
          chunkIndex: 'number',
          contentHash: 'string',
          content: 'string',
          timestamp: 'number',
          embedding: `vector[${this.embeddingDimension}]` as 'vector[1536]'
        } as OramaSchema,
        components: {
          tokenizer: createTokenizer({
            language: 'mandarin',
            stopWords: mandarinStopwords
          })
        }
      });

      Logger.debug(`Recreated database "${this.indexName}" with ${this.embeddingDimension}-dimensional embeddings and Chinese tokenizer`);
      Logger.debug('Old database file preserved until rebuild completes successfully');
    } catch (error) {
      Logger.error('Failed to rebuild database:', error);
      throw error;
    }
  }

  /**
   * Clean up backup file after successful rebuild
   */
  async cleanupBackup(): Promise<void> {
    try {
      const persistencePath = this.getPersistencePath();
      const backupPath = `${persistencePath}.backup`;
      
      try {
        await fs.unlink(backupPath);
        Logger.debug(`Deleted backup file "${backupPath}"`);
      } catch (error) {
        // Backup file might not exist
        Logger.debug('No backup file to delete');
      }
    } catch (error) {
      Logger.error('Failed to cleanup backup:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Restore database from backup after failed rebuild
   */
  async restoreBackup(): Promise<void> {
    try {
      const persistencePath = this.getPersistencePath();
      const backupPath = `${persistencePath}.backup`;
      
      // Check if backup exists
      try {
        await fs.access(backupPath);
      } catch (error) {
        Logger.debug('No backup file to restore from');
        return;
      }
      
      // Restore backup to original location
      await fs.copyFile(backupPath, persistencePath);
      Logger.debug(`Restored database from backup "${backupPath}"`);
      
      // Reload the database from restored file
      const data = await fs.readFile(persistencePath, 'utf-8');
      this.db = await restore('json', data) as Orama<OramaSchema>;
      Logger.debug('Database reloaded from restored file');
      
      // Clean up backup
      await fs.unlink(backupPath);
      Logger.debug('Backup file cleaned up after restore');
    } catch (error) {
      Logger.error('Failed to restore backup:', error);
      throw error;
    }
  }

  /**
   * Check if a chunk exists
   */
  async exists(chunkId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    try {
      const doc = await getByID(this.db, chunkId);
      return doc !== null && doc !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get chunks by IDs
   */
  async getByIds(chunkIds: string[]): Promise<ChunkMetadata[]> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    if (chunkIds.length === 0) {
      return [];
    }

    try {
      const chunks: ChunkMetadata[] = [];
      
      for (const id of chunkIds) {
        try {
          const doc = await getByID(this.db, id);
          if (doc) {
            chunks.push({
              id: doc.id,
              filePath: doc.filePath,
              chunkIndex: doc.chunkIndex,
              contentHash: doc.contentHash,
              content: doc.content,
              timestamp: doc.timestamp
            });
          }
        } catch (error) {
          // Document not found, continue
        }
      }

      return chunks;
    } catch (error) {
      Logger.error('Failed to get chunks by IDs:', error);
      return [];
    }
  }

  /**
   * Shutdown Orama database
   */
  async shutdown(): Promise<void> {
    Logger.debug('Shutting down Orama...');

    if (this.db) {
      // Persist one final time
      try {
        await this.persist();
      } catch (error) {
        Logger.error('Failed to persist on shutdown:', error);
      }

      this.db = null;
    }

    Logger.debug('Orama shutdown complete');
  }
  
}
