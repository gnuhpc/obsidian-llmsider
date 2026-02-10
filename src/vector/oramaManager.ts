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
  private embeddingDimension: number = 0; // Will be detected during initialization
  private i18n: I18nManager | null = null;
  
  // 内存管理配置
  private readonly MAX_DOCUMENTS = 50000; // 最多存储50000个文档
  private readonly BATCH_SIZE_EMBEDDING = 5; // 每次最多处理5个embedding（减少内存峰值）
  private readonly WARNING_THRESHOLD = 40000; // 超过40000个文档时警告
  private readonly MAX_CONTENT_LENGTH = 2000; // 最多存储2000字符的内容用于搜索
  private readonly CLEANUP_INTERVAL_HOURS = 24; // 每24小时自动清理一次
  private lastCleanupTime: number = 0;
  private batchMode: boolean = false;
  private pendingPersist: boolean = false;

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
      throw new Error('Cannot detect embedding dimension: no connection or model configured. Please configure an embedding model in settings.');
    }

    // GitHub Copilot uses fixed 1024 dimensions for embeddings
    if (this.connection.type === 'github-copilot') {
      Logger.debug('GitHub Copilot uses fixed 1024-dimensional embeddings');
      return 1024;
    }

    // First, check if the model has a configured embedding dimension
    if (this.model.embeddingDimension && this.model.embeddingDimension > 0) {
      Logger.info(`[Dimension] Using model config: ${this.model.embeddingDimension}D`);
      Logger.info(`[Dimension] Model: ${this.model.modelName}`);
      Logger.info(`[Dimension] Connection: ${this.connection?.name} (${this.connection?.type})`);
      return this.model.embeddingDimension;
    }

    // If not configured, try to detect by generating a test embedding
    try {
      Logger.warn('[Dimension] No embedding dimension configured in model settings!');
      Logger.warn('[Dimension] Attempting auto-detection by generating test embedding...');
      Logger.warn('[Dimension] Recommendation: Configure embeddingDimension in model settings');
      
      const testEmbeddings = await this.generateEmbeddings(['test']);
      const dimension = testEmbeddings[0].length;
      
      Logger.info(`[Dimension] Auto-detected: ${dimension}D`);
      Logger.info(`[Dimension] Model: ${this.model.modelName}`);
      Logger.warn(`[Dimension] Please update model settings to set embeddingDimension=${dimension}`);
      
      return dimension;
    } catch (error) {
      Logger.error('[Dimension] Failed to detect embedding dimension:', error);
      throw new Error(`Cannot detect embedding dimension: ${error}. Please check your embedding model configuration.`);
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
          let parsedData;
          try {
            parsedData = JSON.parse(data);
          } catch (parseError) {
            Logger.error('Database file exists but JSON is corrupted!');
            Logger.error('Parse error:', parseError);
            Logger.error('File path:', persistencePath);
            // Treat as corrupted file, will be backed up and recreated
            throw new Error('JSON_CORRUPTED');
          }
          
          const docCount = parsedData?.docs?.count || 0;
          
          Logger.debug(`Database file contains ${docCount} documents`);
          
          if (docCount === 0) {
            // Check file age to determine if this is a fresh empty DB or potentially failed rebuild
            try {
              const stats = await fs.stat(persistencePath);
              const fileAgeMinutes = (Date.now() - stats.mtimeMs) / (1000 * 60);
              
              // Only warn if file is older than 5 minutes (not a fresh creation)
              if (fileAgeMinutes > 5) {
                Logger.warn(`WARNING: Database file exists but contains no documents!`);
                Logger.warn(`File age: ${Math.round(fileAgeMinutes)} minutes - this might indicate a previous failed rebuild.`);
              } else {
                Logger.debug(`Empty database file is fresh (${Math.round(fileAgeMinutes * 60)}s old), no warning needed`);
              }
            } catch (statError) {
              // If we can't check file age, just show debug message
              Logger.debug(`Database file is empty (0 documents)`);
            }
          }
          
          // IMPORTANT: Always use configured dimension from model, not from file
          // This allows users to switch to different embedding models with different dimensions
          this.embeddingDimension = await this.detectEmbeddingDimension();
          Logger.debug(`Using configured embedding dimension: ${this.embeddingDimension}`);
          
          // Check if dimension changed from file
          const embeddingProperty = parsedData?.index?.searchablePropertiesWithTypes?.embedding;
          let fileDimension = this.embeddingDimension; // Use current detected dimension as default
          if (embeddingProperty && typeof embeddingProperty === 'string') {
            const match = embeddingProperty.match(/vector\[(\d+)\]/);
            if (match) {
              fileDimension = parseInt(match[1], 10);
            }
          }
          
          if (fileDimension !== this.embeddingDimension) {
            Logger.warn(`[Dimension] Mismatch detected during initialization:`);
            Logger.warn(`[Dimension] - Database file: ${fileDimension}D`);
            Logger.warn(`[Dimension] - Current model: ${this.embeddingDimension}D`);
            Logger.warn(`[Dimension] - This usually happens when switching embedding models`);
            Logger.warn(`[Dimension] Database needs to be rebuilt with new embedding dimension`);
            // Don't load the old database, create a new one instead
            throw new Error('DIMENSION_MISMATCH');
          }
          
          // Restore database from persisted data
          this.db = await restore('json', data);
          Logger.debug(`Successfully loaded existing database with ${docCount} documents (${this.embeddingDimension}D embeddings)`);
          
        } catch (error) {
          // Check error type for better handling
          const isDimensionMismatch = error instanceof Error && error.message === 'DIMENSION_MISMATCH';
          const isJsonCorrupted = error instanceof Error && error.message === 'JSON_CORRUPTED';
          
          if (isDimensionMismatch) {
            Logger.warn('Embedding dimension changed, will create new database...');
          } else if (isJsonCorrupted) {
            Logger.error('Database file is corrupted (invalid JSON)!');
          } else {
            Logger.error('Database file exists but could not be loaded!');
            Logger.error('Error details:', error);
            Logger.error('File path:', persistencePath);
          }

          // Auto-recovery: Backup old file and create new database
          try {
            if (isDimensionMismatch) {
              Logger.debug('Backing up database with old dimension...');
            } else if (isJsonCorrupted) {
              Logger.debug('Attempting auto-recovery from corrupted JSON...');
            } else {
              Logger.debug('Attempting auto-recovery from unknown error...');
            }

            // Backup the old file
            const backupSuffix = isDimensionMismatch ? 'old-dimension' : 'corrupted';
            const backupPath = `${persistencePath}.${backupSuffix}-${Date.now()}`;
            await fs.rename(persistencePath, backupPath);
            Logger.debug(`Backed up old file to: ${backupPath}`);

            // Create new database with current dimension
            Logger.debug('Creating new empty database...');
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

            // Show appropriate user message based on error type
            let message: string;
            if (isDimensionMismatch) {
              Logger.debug(`Successfully created new database with ${this.embeddingDimension}D embeddings`);
              message = this.i18n?.t('vectorDatabase.dimensionChanged') || 
                'Vector database dimension changed. Please rebuild the index with the new embedding model.';
            } else {
              Logger.debug(`Successfully recovered from database error with ${this.embeddingDimension}D embeddings`);
              message = this.i18n?.t('vectorDatabase.databaseCorrupted') || 
                'Vector database was corrupted and has been automatically reset. Please rebuild the index.';
            }
            new Notice(message, 8000);

          } catch (recoveryError) {
            Logger.error('Failed to recover from database error:', recoveryError);
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
   * Persist the database to disk using atomic write operation
   * 
   * This method uses a "write-temp-then-rename" pattern to ensure data integrity:
   * 1. Write serialized data to a temporary file (.tmp)
   * 2. If write succeeds, rename temp file to actual file (atomic operation)
   * 3. If anything fails, the original file remains intact
   * 
   * This prevents corruption when:
   * - Plugin is reloaded during write
   * - Obsidian crashes during write
   * - System interrupts occur during write
   * 
   * In batch mode (during rebuild), this method only marks that persistence is needed
   * and returns immediately to avoid excessive I/O operations.
   */
  private async persist(): Promise<void> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    // In batch mode, just mark that we need to persist later
    if (this.batchMode) {
      this.pendingPersist = true;
      Logger.debug('Batch mode active - deferring persistence');
      return;
    }

    try {
      // Persist database to JSON format
      const serializedData = await persist(this.db, 'json');
      const persistencePath = this.getPersistencePath();
      const tempPath = `${persistencePath}.tmp`;
      
      // Ensure directory exists
      await fs.mkdir(this.storagePath, { recursive: true });
      
      // Step 1: Write to temporary file
      // If this fails, original file remains intact
      await fs.writeFile(tempPath, serializedData as string, 'utf-8');
      Logger.debug(`Database serialized to temp file: "${tempPath}"`);
      
      // Step 2: Atomic rename - this is the critical operation
      // On most filesystems, rename is atomic, meaning:
      // - Either it completes fully, or not at all
      // - No partial/corrupted state is possible
      await fs.rename(tempPath, persistencePath);
      
      Logger.debug(`Database persisted atomically to "${persistencePath}"`);
    } catch (error) {
      Logger.error('Failed to persist database:', error);
      
      // Clean up temp file if it exists
      try {
        const tempPath = `${this.getPersistencePath()}.tmp`;
        await fs.unlink(tempPath);
        Logger.debug('Cleaned up temporary file after failed write');
      } catch (cleanupError) {
        // Ignore cleanup errors - temp file might not exist
      }
      
      throw error;
    }
  }

  /**
   * Enable batch mode to reduce persistence frequency during bulk operations
   * When enabled, persist() calls will only mark pendingPersist flag
   * Call flushPendingPersist() to actually persist when batch is complete
   */
  setBatchMode(enabled: boolean): void {
    this.batchMode = enabled;
    Logger.debug(`Batch mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Force persistence if there are pending changes from batch operations
   * This should be called after completing a batch of operations
   */
  async flushPendingPersist(): Promise<void> {
    if (this.pendingPersist) {
      Logger.debug('Flushing pending persistence...');
      this.pendingPersist = false;
      const wasBatchMode = this.batchMode;
      this.batchMode = false; // Temporarily disable batch mode to allow persist
      try {
        await this.persist();
      } finally {
        this.batchMode = wasBatchMode; // Restore batch mode state
      }
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
                // Use configured dimension (GitHub Copilot uses 1024 by default)
                dimensions: this.embeddingDimension
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
            const embeddings = data.data.map((item: unknown) => item.embedding);
            
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
      // Use smaller batch size for all providers to reduce memory peaks and show better progress
      let maxBatchSize = this.BATCH_SIZE_EMBEDDING; // Reduced for memory optimization
      
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
      // Note: dimensions parameter must be passed through providerOptions for AI SDK
      const embeddingOptions: {
        providerOptions?: {
          openai?: {
            dimensions?: number;
          };
        };
      } = {};
      
      if (this.model.embeddingDimension && this.model.embeddingDimension > 0) {
        embeddingOptions.providerOptions = {
          openai: {
            dimensions: this.model.embeddingDimension
          }
        };
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
      
      // CRITICAL: Validate that generated embeddings match expected dimension
      if (finalEmbeddings.length > 0) {
        const actualDimension = finalEmbeddings[0].length;
        const expectedDimension = this.embeddingDimension;
        
        if (actualDimension !== expectedDimension) {
          const errorMsg = `[Dimension] MISMATCH during generation!\n` +
            `Expected: ${expectedDimension}D (from model config)\n` +
            `Actual: ${actualDimension}D (from API response)\n` +
            `Model: ${this.model?.modelName}\n` +
            `Connection: ${this.connection?.name}\n\n` +
            `This usually means:\n` +
            `1. The model doesn't support the configured dimension\n` +
            `2. The API ignored the 'dimensions' parameter\n` +
            `3. Wrong model is selected\n\n` +
            `Please check your embedding model configuration in Settings.`;
          
          Logger.error(errorMsg);
          throw new Error(`[Dimension] Mismatch: expected ${expectedDimension}D but got ${actualDimension}D`);
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
   * Truncate content to save memory
   */
  private truncateContent(content: string): string {
    if (!content) return '';
    if (content.length <= this.MAX_CONTENT_LENGTH) return content;
    return content.substring(0, this.MAX_CONTENT_LENGTH);
  }

  /**
   * Check if auto cleanup is needed and perform it
   */
  private async autoCleanupIfNeeded(): Promise<void> {
    const now = Date.now();
    const intervalMs = this.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
    
    if (now - this.lastCleanupTime > intervalMs) {
      Logger.debug('[OramaManager] Performing scheduled auto cleanup...');
      await this.cleanupOldDocuments();
      this.lastCleanupTime = now;
    }
  }

  /**
   * Add chunks to the database
   * Supports optional precomputed embeddings to avoid redundant generation
   */
  async add(chunks: ChunkMetadata[]): Promise<void> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    if (chunks.length === 0) {
      return;
    }

    // 检查文档数量限制
    const currentCount = await this.count();
    if (currentCount >= this.MAX_DOCUMENTS) {
      Logger.warn(`[OramaManager] Document limit reached (${this.MAX_DOCUMENTS}), skipping add`);
      return;
    }
    
    // 限制本次添加的数量
    const availableSpace = this.MAX_DOCUMENTS - currentCount;
    if (chunks.length > availableSpace) {
      Logger.warn(`[OramaManager] Limiting add from ${chunks.length} to ${availableSpace} chunks`);
      chunks = chunks.slice(0, availableSpace);
    }
    
    // 警告阈值检查
    if (currentCount + chunks.length >= this.WARNING_THRESHOLD) {
      Logger.warn(`[OramaManager] Approaching document limit: ${currentCount + chunks.length}/${this.MAX_DOCUMENTS}`);
    }

    try {
      // Prepare embeddings array
      const embeddings: number[][] = new Array(chunks.length);
      const indicesToGenerate: number[] = [];
      const textsToGenerate: string[] = [];

      // Check which chunks already have embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
          embeddings[i] = chunk.embedding;
        } else {
          indicesToGenerate.push(i);
          textsToGenerate.push(chunk.content);
        }
      }
      
      if (indicesToGenerate.length > 0) {
        Logger.debug(`Generating ${indicesToGenerate.length} new embeddings (reusing ${chunks.length - indicesToGenerate.length})`);
        const newEmbeddings = await this.generateEmbeddings(textsToGenerate, this.embeddingProgressCallback || undefined);
        
        // Fill in the generated embeddings
        for (let i = 0; i < indicesToGenerate.length; i++) {
          const originalIndex = indicesToGenerate[i];
          embeddings[originalIndex] = newEmbeddings[i];
        }
      } else {
        Logger.debug(`Using ${chunks.length} precomputed embeddings (performance optimization)`);
      }

      // Insert documents into database
      // Truncate content to save memory but keep full hash for comparison
      const documents = chunks.map((chunk, i) => ({
        id: chunk.id,
        filePath: chunk.filePath,
        chunkIndex: chunk.chunkIndex,
        contentHash: chunk.contentHash,
        content: this.truncateContent(chunk.content), // Truncate to save memory
        timestamp: chunk.timestamp,
        embedding: embeddings[i]
      }));

      await insertMultiple(this.db, documents);
      
      // Auto cleanup check
      await this.autoCleanupIfNeeded();
      
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

        // Insert updated document (with truncated content)
        await insert(this.db, {
          id: chunk.id,
          filePath: chunk.filePath,
          chunkIndex: chunk.chunkIndex,
          contentHash: chunk.contentHash,
          content: this.truncateContent(chunk.content),
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
        const errorMsg = `[Dimension] Mismatch: query has ${queryVector.length}D but database expects ${this.embeddingDimension}D. Please rebuild the vector index with the current embedding model.`;
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
      const docItems: DocItem[] = results.hits.map((hit: unknown) => {
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
   * Search by vector directly with optional text query
   * Uses hybrid search when term is provided, otherwise falls back to vector-only search
   */
  async searchByVector(queryVector: number[], topK: number = 5, term?: string): Promise<DocItem[]> {
    if (!this.db) {
      throw new Error('Orama not initialized');
    }

    try {
      // Validate query vector
      if (!queryVector || !Array.isArray(queryVector) || queryVector.length === 0) {
        Logger.error('Invalid query vector:', { 
          hasVector: !!queryVector,
          isArray: Array.isArray(queryVector),
          length: queryVector?.length 
        });
        throw new Error('Invalid query vector format');
      }
      
      const searchMode = term ? 'hybrid' : 'vector';
      Logger.debug(`Performing ${searchMode} search with ${queryVector.length}D embedding${term ? ` and term: "${term}"` : ''}`);
      
      // Check if query embedding dimension matches database dimension
      if (queryVector.length !== this.embeddingDimension) {
        const errorMsg = `[Dimension] Mismatch: query has ${queryVector.length}D but database expects ${this.embeddingDimension}D`;
        Logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Perform hybrid or vector-only search
      const searchConfig: any = {
        mode: searchMode,
        vector: {
          value: queryVector,
          property: 'embedding'
        },
        limit: topK,
        includeVectors: false,
        similarity: 0.3 // Minimum similarity score (0-1)
      };

      // Add hybrid search parameters if term is provided
      if (term) {
        searchConfig.term = term;
        searchConfig.boost = {
          content: 2,
          filePath: 1
        };
        searchConfig.hybridWeights = {
          text: 0.3,
          vector: 0.7
        };
      }

      const results = await search(this.db, searchConfig);

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

      Logger.debug(`${searchMode === 'hybrid' ? 'Hybrid' : 'Vector'} search returned ${docItems.length} results (total hits: ${results.count})`);
      if (docItems.length > 0) {
        Logger.debug(`Top result score: ${docItems[0].score.toFixed(4)}`);
      }
      
      return docItems;
    } catch (error) {
      Logger.error(`Failed to perform ${term ? 'hybrid' : 'vector'} search:`, error);
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
      // Use timestamp in backup filename to preserve history
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: 2025-01-28T14-30-52
      const backupPath = `${persistencePath}.backup-${timestamp}`;
      let oldFileExists = false;
      try {
        await fs.copyFile(persistencePath, backupPath);
        Logger.debug(`Created backup of existing database at "${backupPath}"`);
        oldFileExists = true;
        
        // Delete the original file to prevent conflicts with new schema
        await fs.unlink(persistencePath);
        Logger.debug('Deleted original database file (backup preserved)');
      } catch (error) {
        // File might not exist, that's ok
        Logger.debug('No existing database file to backup');
      }

      // IMPORTANT: Always re-detect embedding dimension during rebuild!
      // This ensures we use the correct dimension even if the user switched embedding models
      // without restarting the plugin
      const oldDimension = this.embeddingDimension;
      
      // Force fresh dimension detection (ignore cached value)
      this.embeddingDimension = await this.detectEmbeddingDimension();
      
      Logger.info(`[Dimension] Rebuild using model: ${this.model?.modelName}`);
      Logger.info(`[Dimension] Configured: ${this.model?.embeddingDimension || 'auto-detect'}D`);
      Logger.info(`[Dimension] Detected: ${this.embeddingDimension}D`);
      
      if (oldDimension !== this.embeddingDimension) {
        Logger.warn(`[Dimension] Changed: ${oldDimension}D -> ${this.embeddingDimension}D`);
        Logger.warn(`[Dimension] This usually happens when switching embedding models`);
      }

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
   * Clean up old backup files, keeping only the most recent one
   */
  async cleanupBackup(): Promise<void> {
    try {
      const persistencePath = this.getPersistencePath();
      const dirPath = path.dirname(persistencePath);
      const baseName = path.basename(persistencePath);
      
      // Find all backup files for this database
      const files = await fs.readdir(dirPath);
      const backupFiles = files
        .filter(f => f.startsWith(baseName + '.backup-'))
        .map(f => path.join(dirPath, f));
      
      if (backupFiles.length === 0) {
        Logger.debug('No backup files to cleanup');
        return;
      }
      
      // Sort by modification time (newest first)
      const filesWithStats = await Promise.all(
        backupFiles.map(async (file) => ({
          file,
          mtime: (await fs.stat(file)).mtime
        }))
      );
      filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Keep the most recent backup, delete the rest
      for (let i = 1; i < filesWithStats.length; i++) {
        try {
          await fs.unlink(filesWithStats[i].file);
          Logger.debug(`Deleted old backup file "${filesWithStats[i].file}"`);
        } catch (error) {
          Logger.warn(`Failed to delete old backup file "${filesWithStats[i].file}":`, error);
        }
      }
      
      Logger.debug(`Cleanup complete. Kept most recent backup: "${filesWithStats[0].file}"`);
    } catch (error) {
      Logger.error('Failed to cleanup backup:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Restore database from the most recent backup after failed rebuild
   */
  async restoreBackup(): Promise<void> {
    try {
      const persistencePath = this.getPersistencePath();
      const dirPath = path.dirname(persistencePath);
      const baseName = path.basename(persistencePath);
      
      // Find all backup files for this database
      const files = await fs.readdir(dirPath);
      const backupFiles = files
        .filter(f => f.startsWith(baseName + '.backup-'))
        .map(f => path.join(dirPath, f));
      
      if (backupFiles.length === 0) {
        Logger.debug('No backup file to restore from');
        return;
      }
      
      // Sort by modification time (newest first)
      const filesWithStats = await Promise.all(
        backupFiles.map(async (file) => ({
          file,
          mtime: (await fs.stat(file)).mtime
        }))
      );
      filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Use the most recent backup
      const backupPath = filesWithStats[0].file;
      
      // Restore backup to original location
      await fs.copyFile(backupPath, persistencePath);
      Logger.debug(`Restored database from backup "${backupPath}"`);
      
      // Reload the database from restored file
      const data = await fs.readFile(persistencePath, 'utf-8');
      
      // IMPORTANT: Extract dimension from backup data BEFORE restoring
      // This ensures this.embeddingDimension matches the actual database schema
      let dimensionChanged = false;
      try {
        const parsedData = JSON.parse(data);
        const embeddingProperty = parsedData?.index?.searchablePropertiesWithTypes?.embedding;
        if (embeddingProperty && typeof embeddingProperty === 'string') {
          const match = embeddingProperty.match(/vector\[(\d+)\]/);
          if (match) {
            const backupDimension = parseInt(match[1], 10);
            if (backupDimension !== this.embeddingDimension) {
              Logger.warn(`[Dimension] Backup: ${backupDimension}D differs from current: ${this.embeddingDimension}D`);
              Logger.warn(`[Dimension] Updating dimension to match restored database`);
              this.embeddingDimension = backupDimension;
              dimensionChanged = true;
            }
          }
        }
      } catch (parseError) {
        Logger.error('Failed to parse backup dimension, keeping current dimension:', parseError);
      }
      
      this.db = await restore('json', data);
      Logger.debug(`Database reloaded from restored file with ${this.embeddingDimension}D embeddings`);
      
      Logger.debug('Backup restored successfully (backup file preserved)');
      
      // Show user-friendly notice if dimension changed (rebuild failed due to dimension mismatch)
      if (dimensionChanged) {
        const message = this.i18n?.t('vectorDatabase.dimensionMismatch') || 
          'Vector database dimension mismatch. Please rebuild the index in settings.';
        new Notice(message, 10000);
      }
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

      // Clear database reference
      this.db = null;
    }

    // Clear callbacks to prevent memory leaks
    this.embeddingProgressCallback = null;
    this.connectionUpdateCallback = null;
    
    // Clear connection and model references
    this.connection = null;
    this.model = null;

    Logger.debug('Orama shutdown complete');
  }

  /**
   * Get memory usage statistics
   */
  async getMemoryStats(): Promise<{
    documentCount: number;
    maxDocuments: number;
    usagePercentage: number;
    warningThreshold: number;
    isNearLimit: boolean;
  }> {
    const count = await this.count();
    return {
      documentCount: count,
      maxDocuments: this.MAX_DOCUMENTS,
      usagePercentage: (count / this.MAX_DOCUMENTS) * 100,
      warningThreshold: this.WARNING_THRESHOLD,
      isNearLimit: count >= this.WARNING_THRESHOLD
    };
  }

  /**
   * Cleanup old documents based on timestamp
   * @param daysToKeep Number of days to keep documents
   * @returns Number of documents deleted
   */
  async cleanupOldDocuments(daysToKeep: number = 90): Promise<number> {
    if (!this.db) {
      // Silently skip if not initialized yet (e.g., during plugin startup)
      Logger.debug('[OramaManager] Skipping cleanup - database not initialized yet');
      return 0;
    }

    try {
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      
      // Search for old documents (using regular search since where clause might not work)
      const allResults = await search(this.db, {
        term: '',
        limit: this.MAX_DOCUMENTS
      });

      const idsToDelete = allResults.hits
        .filter((hit: any) => hit.document.timestamp < cutoffTime)
        .map((hit: any) => hit.document.id);
      
      if (idsToDelete.length > 0) {
        await this.delete(idsToDelete);
        Logger.info(`[OramaManager] Cleaned up ${idsToDelete.length} old documents`);
      }

      return idsToDelete.length;
    } catch (error) {
      Logger.error('[OramaManager] Failed to cleanup old documents:', error);
      return 0;
    }
  }
  
}
