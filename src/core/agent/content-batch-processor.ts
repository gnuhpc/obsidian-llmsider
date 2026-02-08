/**
 * Content Batch Processor
 * 
 * Intelligently processes large content that exceeds model token limits
 * by breaking it into batches, processing each batch, and then merging results.
 * 
 * Supports two strategies:
 * 1. Batch-and-merge: Split content into chunks, process each, then merge
 * 2. Summarize-and-generate: Summarize each piece first, then generate from summaries
 */

import { Logger } from '../../utils/logger';
import { TokenManager } from '../../utils/token-manager';
import { BaseLLMProvider } from '../../providers/base-provider';
import { ChatMessage } from '../../types';

export interface ContentBatch {
	/** Batch number (1-indexed) */
	index: number;
	/** Content items in this batch */
	items: string[];
	/** Estimated token count for this batch */
	estimatedTokens: number;
}

export interface BatchProcessingStrategy {
	/** Total batches needed */
	totalBatches: number;
	/** Batches to process */
	batches: ContentBatch[];
	/** Strategy used: 'batch-merge' | 'summarize-merge' | 'direct' */
	strategy: 'batch-merge' | 'summarize-merge' | 'direct';
}

export interface ContentSummaryCache {
	/** Content hash (for cache key) */
	hash: string;
	/** Cached summary */
	summary: string;
	/** Timestamp when cached */
	timestamp: number;
}

export class ContentBatchProcessor {
	private provider: BaseLLMProvider;
	private modelName: string;
	private maxTokenLimit: number;
	private reservedTokens: number = 2000; // Reserve for task description and final merge
	private batchSafetyRatio: number = 0.8; // Use 80% of available tokens per batch
	private summaryCache: Map<string, ContentSummaryCache> = new Map();
	private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
	
	// Payload size limits (to prevent network errors)
	private readonly MAX_PAYLOAD_SIZE = 80 * 1024; // 80KB - conservative limit to avoid network issues
	
	// Adaptive batch sizing parameters
	private tokenUsageHistory: number[] = []; // Track actual token usage
	private maxHistorySize: number = 10; // Keep last 10 measurements
	
	constructor(provider: BaseLLMProvider, modelName: string) {
		this.provider = provider;
		this.modelName = modelName;
		this.maxTokenLimit = TokenManager.getModelTokenLimit(modelName);
		Logger.debug('[ContentBatchProcessor] Initialized with max token limit:', this.maxTokenLimit);
	}
	
	/**
	 * Generate hash for content (for caching)
	 */
	private hashContent(content: string): string {
		// Simple hash function for content
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash.toString(36);
	}
	
	/**
	 * Get cached summary if available and not expired
	 */
	private getCachedSummary(content: string): string | null {
		const hash = this.hashContent(content);
		const cached = this.summaryCache.get(hash);
		
		if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
			Logger.debug('[ContentBatchProcessor] Using cached summary for content');
			return cached.summary;
		}
		
		return null;
	}
	
	/**
	 * Cache summary for content
	 */
	private cacheSummary(content: string, summary: string): void {
		const hash = this.hashContent(content);
		this.summaryCache.set(hash, {
			hash,
			summary,
			timestamp: Date.now()
		});
		Logger.debug('[ContentBatchProcessor] Cached summary for content');
	}
	
	/**
	 * Update batch safety ratio based on actual token usage
	 */
	private updateAdaptiveBatchSize(estimatedTokens: number, actualTokens: number): void {
		// Record the ratio of actual to estimated tokens
		const ratio = actualTokens / estimatedTokens;
		this.tokenUsageHistory.push(ratio);
		
		// Keep only recent history
		if (this.tokenUsageHistory.length > this.maxHistorySize) {
			this.tokenUsageHistory.shift();
		}
		
		// Adjust safety ratio based on average ratio
		if (this.tokenUsageHistory.length >= 3) {
			const avgRatio = this.tokenUsageHistory.reduce((sum, r) => sum + r, 0) / this.tokenUsageHistory.length;
			
			// If we're consistently underestimating, reduce safety ratio (be more conservative)
			// If we're consistently overestimating, increase safety ratio (be more aggressive)
			if (avgRatio > 1.1) {
				// We're underestimating by more than 10%
				this.batchSafetyRatio = Math.max(0.6, this.batchSafetyRatio - 0.05);
				Logger.debug('[ContentBatchProcessor] Adjusted batch safety ratio down to:', this.batchSafetyRatio);
			} else if (avgRatio < 0.9) {
				// We're overestimating by more than 10%
				this.batchSafetyRatio = Math.min(0.9, this.batchSafetyRatio + 0.05);
				Logger.debug('[ContentBatchProcessor] Adjusted batch safety ratio up to:', this.batchSafetyRatio);
			}
		}
	}
	
	/**
	 * Calculate the estimated payload size in bytes for a request
	 * This helps prevent network errors from oversized payloads
	 */
	private calculatePayloadSize(contentPieces: string[], taskDescription: string): number {
		// Estimate the JSON payload size including:
		// - messages array structure
		// - system prompt
		// - task description
		// - content pieces
		// - model name, temperature, etc.
		
		const systemPrompt = "You are a helpful assistant.";
		const messageOverhead = 200; // JSON structure overhead per message
		
		// Calculate base size: JSON structure + system message + task message
		let totalSize = 500; // Base JSON structure
		totalSize += new Blob([systemPrompt]).size + messageOverhead;
		totalSize += new Blob([taskDescription]).size + messageOverhead;
		
		// Add content pieces
		for (const piece of contentPieces) {
			totalSize += new Blob([piece]).size + messageOverhead;
		}
		
		Logger.debug('[ContentBatchProcessor] Estimated payload size:', totalSize, 'bytes');
		return totalSize;
	}
	
	/**
	 * Analyze content and determine optimal processing strategy
	 */
	public analyzeContent(
		contentPieces: string[],
		taskDescription: string
	): BatchProcessingStrategy {
		Logger.debug('[ContentBatchProcessor] Analyzing', contentPieces.length, 'content pieces');
		
		// Calculate tokens for task and overhead
		const taskTokens = TokenManager.estimateTokensForText(taskDescription);
		const overheadTokens = 500; // System prompt, formatting, etc.
		const availableTokens = this.maxTokenLimit - taskTokens - overheadTokens - this.reservedTokens;
		
		Logger.debug('[ContentBatchProcessor] Available tokens:', availableTokens);
		
		// Calculate token count for each piece
		const pieceTokens = contentPieces.map(piece => 
			TokenManager.estimateTokensForText(piece)
		);
		
		const totalTokens = pieceTokens.reduce((sum, tokens) => sum + tokens, 0);
		Logger.debug('[ContentBatchProcessor] Total content tokens:', totalTokens);
		
		// Calculate actual payload size in bytes
		const payloadSize = this.calculatePayloadSize(contentPieces, taskDescription);
		
		// Strategy 1: If everything fits (both tokens AND payload size), process directly
		if (totalTokens <= availableTokens && payloadSize <= this.MAX_PAYLOAD_SIZE) {
			Logger.debug('[ContentBatchProcessor] Using DIRECT strategy - all content fits');
			return {
				strategy: 'direct',
				totalBatches: 1,
				batches: [{
					index: 1,
					items: contentPieces,
					estimatedTokens: totalTokens
				}]
			};
		}
		
		// If payload is too large but tokens fit, we need to batch anyway
		if (totalTokens <= availableTokens && payloadSize > this.MAX_PAYLOAD_SIZE) {
			Logger.warn('[ContentBatchProcessor] Payload size exceeds limit (' + payloadSize + ' > ' + this.MAX_PAYLOAD_SIZE + 
				'), forcing batch processing despite tokens fitting (' + totalTokens + ' <= ' + availableTokens + ')');
		}
		
		// Strategy 2: Batch-and-merge
		// Try to fit as many pieces as possible in each batch (considering both tokens AND payload size)
		const batches: ContentBatch[] = [];
		let currentBatch: string[] = [];
		let currentBatchTokens = 0;
		const batchTokenLimit = Math.floor(availableTokens * this.batchSafetyRatio); // Use adaptive safety ratio
		const batchSizeLimit = this.MAX_PAYLOAD_SIZE * 0.7; // Use 70% of max payload size per batch for safety
		
		for (let i = 0; i < contentPieces.length; i++) {
			const piece = contentPieces[i];
			const tokens = pieceTokens[i];
			const currentBatchSize = this.calculatePayloadSize(currentBatch, taskDescription);
			const pieceSize = new Blob([piece]).size;
			
			// If this single piece is too large (tokens or size), we'll need to summarize it
			if (tokens > batchTokenLimit || pieceSize > batchSizeLimit) {
				// If current batch has items, save it first
				if (currentBatch.length > 0) {
					batches.push({
						index: batches.length + 1,
						items: currentBatch,
						estimatedTokens: currentBatchTokens
					});
					currentBatch = [];
					currentBatchTokens = 0;
				}
				
				// This piece needs its own batch and will be summarized
				batches.push({
					index: batches.length + 1,
					items: [piece],
					estimatedTokens: tokens
				});
				continue;
			}
			
			// Check if adding this piece would exceed batch limit (tokens OR size)
			const wouldExceedTokens = currentBatchTokens + tokens > batchTokenLimit;
			const wouldExceedSize = currentBatchSize + pieceSize > batchSizeLimit;
			
			if ((wouldExceedTokens || wouldExceedSize) && currentBatch.length > 0) {
				// Save current batch and start a new one
				batches.push({
					index: batches.length + 1,
					items: currentBatch,
					estimatedTokens: currentBatchTokens
				});
				currentBatch = [piece];
				currentBatchTokens = tokens;
			} else {
				// Add to current batch
				currentBatch.push(piece);
				currentBatchTokens += tokens;
			}
		}
		
		// Add remaining batch
		if (currentBatch.length > 0) {
			batches.push({
				index: batches.length + 1,
				items: currentBatch,
				estimatedTokens: currentBatchTokens
			});
		}
		
		// Decide strategy based on batch count
		const strategy = batches.length <= 5 ? 'batch-merge' : 'summarize-merge';
		
		Logger.debug(`[ContentBatchProcessor] Using ${strategy.toUpperCase()} strategy with ${batches.length} batches`);
		
		return {
			strategy,
			totalBatches: batches.length,
			batches
		};
	}
	
	/**
	 * Process content using the determined strategy
	 */
	public async processContent(
		contentPieces: string[],
		taskDescription: string,
		language: 'zh' | 'en',
		onProgress?: (batchIndex: number, content: string) => void,
		parallel: boolean = true,
		onStream?: (content: string) => void,
		originalUserQuery?: string,
		abortSignal?: AbortSignal
	): Promise<string> {
		const analysis = this.analyzeContent(contentPieces, taskDescription);
		
		if (analysis.strategy === 'direct') {
			// For direct strategy, we can stream directly
			return this.processBatchMerge(analysis.batches, taskDescription, language, onProgress, false, onStream, originalUserQuery, abortSignal);
		} else if (analysis.strategy === 'batch-merge') {
			return this.processBatchMerge(analysis.batches, taskDescription, language, onProgress, parallel, onStream, originalUserQuery, abortSignal);
		} else {
			return this.processSummarizeMerge(analysis.batches, taskDescription, language, onProgress, parallel, originalUserQuery, abortSignal);
		}
	}
	
	/**
	 * Process content using batch-and-merge strategy with parallel processing
	 */
	public async processBatchMerge(
		batches: ContentBatch[],
		taskDescription: string,
		language: 'zh' | 'en',
		onProgress?: (batchIndex: number, content: string) => void,
		parallel: boolean = true,
		onStream?: (content: string) => void,
		originalUserQuery?: string,
		abortSignal?: AbortSignal
	): Promise<string> {
		Logger.debug('[ContentBatchProcessor] Processing with batch-merge strategy, parallel:', parallel);
		
		const batchResults: string[] = [];
		const systemPrompt = this.getContentGenerationSystemPrompt(language);
		
		if (parallel && batches.length > 1) {
			// Process batches in parallel
			Logger.debug('[ContentBatchProcessor] Processing', batches.length, 'batches in parallel');
			
			const batchPromises = batches.map(async (batch) => {
				// Check for abort signal
				if (abortSignal?.aborted) {
					throw new Error('Content generation aborted by user');
				}

				Logger.debug(`[ContentBatchProcessor] Starting batch ${batch.index}/${batches.length}`);
				
				const batchContent = batch.items.join('\n\n---\n\n');
				
				// Include original user query if provided
				const userGoalSection = originalUserQuery 
					? (language === 'zh' 
						? `\n\n用户的最终目标：${originalUserQuery}\n`
						: `\n\nUser's ultimate goal: ${originalUserQuery}\n`)
					: '';
				
				const userPrompt = language === 'zh'
					? `这是第 ${batch.index} 部分（共 ${batches.length} 部分）。${userGoalSection}
任务：${taskDescription}

内容：
${batchContent}`
					: `This is part ${batch.index} of ${batches.length}.${userGoalSection}
Task: ${taskDescription}

Content:
${batchContent}`;
				
				const messages: ChatMessage[] = [
					{
						id: `system-${batch.index}-${Date.now()}`,
						role: 'system',
						content: systemPrompt,
						timestamp: Date.now()
					},
					{
						id: `batch-${batch.index}-${Date.now()}`,
						role: 'user',
						content: userPrompt,
						timestamp: Date.now()
					}
				];
				
				const startTime = Date.now();
				const response = await this.provider.sendMessage(messages, abortSignal);
				const actualTokens = TokenManager.estimateTokensForText(response?.content || '');
				
				// Update adaptive batch size based on actual usage
				this.updateAdaptiveBatchSize(batch.estimatedTokens, actualTokens);
				
				Logger.debug(`[ContentBatchProcessor] Completed batch ${batch.index}/${batches.length} in ${Date.now() - startTime}ms`);
				
				if (onProgress && response?.content) {
					onProgress(batch.index, response.content);
				}
				
				return {
					index: batch.index,
					content: response?.content || ''
				};
			});
			
			// Wait for all batches to complete
			const results = await Promise.all(batchPromises);
			
			// Sort results by index to maintain order
			results.sort((a, b) => a.index - b.index);
			batchResults.push(...results.map(r => r.content));
			
		} else {
			// Process batches sequentially (original behavior)
			// If only 1 batch and streaming is requested, use streaming
			if (batches.length === 1 && onStream) {
				const batch = batches[0];
				Logger.debug(`[ContentBatchProcessor] Processing single batch with streaming`);
				
				const batchContent = batch.items.join('\n\n---\n\n');
				
				// Include original user query if provided
				const userGoalSection = originalUserQuery 
					? (language === 'zh' 
						? `\n\n用户的最终目标：${originalUserQuery}\n`
						: `\n\nUser's ultimate goal: ${originalUserQuery}\n`)
					: '';
				
				const userPrompt = language === 'zh'
					? `${userGoalSection}任务：${taskDescription}

内容：
${batchContent}`
					: `${userGoalSection}Task: ${taskDescription}

Content:
${batchContent}`;
				
				const messages: ChatMessage[] = [
					{
						id: `system-${batch.index}-${Date.now()}`,
						role: 'system',
						content: systemPrompt,
						timestamp: Date.now()
					},
					{
						id: `batch-${batch.index}-${Date.now()}`,
						role: 'user',
						content: userPrompt,
						timestamp: Date.now()
					}
				];
				
				let fullContent = '';
				await this.provider.sendStreamingMessage(messages, (chunk) => {
					// Check for abort signal during streaming
					if (abortSignal?.aborted) {
						throw new Error('Content generation aborted by user');
					}

					if (chunk.delta) {
						fullContent += chunk.delta;
						onStream(chunk.delta);
					}
				}, abortSignal);
				
				const actualTokens = TokenManager.estimateTokensForText(fullContent);
				this.updateAdaptiveBatchSize(batch.estimatedTokens, actualTokens);
				
				batchResults.push(fullContent);
				
			} else {
				// Standard sequential processing
				for (const batch of batches) {
					// Check for abort signal
					if (abortSignal?.aborted) {
						throw new Error('Content generation aborted by user');
					}

					Logger.debug(`[ContentBatchProcessor] Processing batch ${batch.index}/${batches.length}`);
					
					const batchContent = batch.items.join('\n\n---\n\n');
					
					// Include original user query if provided
					const userGoalSection = originalUserQuery 
						? (language === 'zh' 
							? `\n\n用户的最终目标：${originalUserQuery}\n`
							: `\n\nUser's ultimate goal: ${originalUserQuery}\n`)
						: '';
					
					const userPrompt = language === 'zh'
						? `这是第 ${batch.index} 部分（共 ${batches.length} 部分）。${userGoalSection}
任务：${taskDescription}

内容：
${batchContent}`
						: `This is part ${batch.index} of ${batches.length}.${userGoalSection}
Task: ${taskDescription}

Content:
${batchContent}`;
					
					const messages: ChatMessage[] = [
						{
							id: `system-${batch.index}-${Date.now()}`,
							role: 'system',
							content: systemPrompt,
							timestamp: Date.now()
						},
						{
							id: `batch-${batch.index}-${Date.now()}`,
							role: 'user',
							content: userPrompt,
							timestamp: Date.now()
						}
					];
					
					const response = await this.provider.sendMessage(messages, abortSignal);
					const actualTokens = TokenManager.estimateTokensForText(response?.content || '');
					
					// Update adaptive batch size
					this.updateAdaptiveBatchSize(batch.estimatedTokens, actualTokens);
					
					if (response?.content) {
						batchResults.push(response.content);
						
						if (onProgress) {
							onProgress(batch.index, response.content);
						}
					}
				}
			}
		}
		
		// If only one batch, return directly
		if (batchResults.length === 1) {
			return batchResults[0];
		}
		
		// Merge all batch results with progressive merging for large batches
		Logger.debug('[ContentBatchProcessor] Merging', batchResults.length, 'batch results');
		
		return await this.progressiveMerge(batchResults, taskDescription, language, onStream, abortSignal);
	}
	
	/**
	 * Progressive merge: merge results in layers for better handling of large batches
	 */
	private async progressiveMerge(
		results: string[],
		taskDescription: string,
		language: 'zh' | 'en',
		onStream?: (content: string) => void,
		abortSignal?: AbortSignal
	): Promise<string> {
		// If 6 or fewer results, merge directly
		if (results.length <= 6) {
			return await this.directMerge(results, taskDescription, language, onStream, abortSignal);
		}
		
		// For more than 6 results, merge in layers
		Logger.debug('[ContentBatchProcessor] Using progressive merge for', results.length, 'results');
		
		let currentLayer = [...results];
		let layerNum = 1;
		const systemPrompt = this.getContentGenerationSystemPrompt(language);
		
		while (currentLayer.length > 3) {
			// Check for abort signal
			if (abortSignal?.aborted) {
				throw new Error('Content generation aborted by user');
			}

			Logger.debug(`[ContentBatchProcessor] Merge layer ${layerNum}: ${currentLayer.length} -> ${Math.ceil(currentLayer.length / 3)} chunks`);
			
			const nextLayer: string[] = [];
			
			// Merge every 3 results into 1
			for (let i = 0; i < currentLayer.length; i += 3) {
				// Check for abort signal
				if (abortSignal?.aborted) {
					throw new Error('Content generation aborted by user');
				}

				const chunk = currentLayer.slice(i, Math.min(i + 3, currentLayer.length));
				
				const userPrompt = language === 'zh'
					? `请合并以下 ${chunk.length} 个内容片段，保持完整性和连贯性。

${chunk.map((c, idx) => `## 片段 ${i + idx + 1}\n${c}`).join('\n\n')}`
					: `Please merge the following ${chunk.length} content fragments, maintaining completeness and coherence.

${chunk.map((c, idx) => `## Fragment ${i + idx + 1}\n${c}`).join('\n\n')}`;
				
				const messages: ChatMessage[] = [
					{
						id: `system-layer${layerNum}-${i / 3}-${Date.now()}`,
						role: 'system',
						content: systemPrompt,
						timestamp: Date.now()
					},
					{
						id: `merge-layer${layerNum}-${i / 3}-${Date.now()}`,
						role: 'user',
						content: userPrompt,
						timestamp: Date.now()
					}
				];
				
				const response = await this.provider.sendMessage(messages, abortSignal);
				if (response?.content) {
					nextLayer.push(response.content);
				}
			}
			
			currentLayer = nextLayer;
			layerNum++;
		}
		
		// Final merge of remaining 2-3 chunks
		Logger.debug('[ContentBatchProcessor] Final merge of', currentLayer.length, 'chunks');
		return await this.directMerge(currentLayer, taskDescription, language, onStream, abortSignal);
	}
	
	/**
	 * Direct merge of results (used for small number of results or final layer)
	 */
	private async directMerge(
		results: string[],
		taskDescription: string,
		language: 'zh' | 'en',
		onStream?: (content: string) => void,
		abortSignal?: AbortSignal
	): Promise<string> {
		if (results.length === 1) {
			return results[0];
		}
		
		const systemPrompt = this.getContentGenerationSystemPrompt(language);
		
		const userPrompt = language === 'zh'
			? `以下是分批生成的内容片段，请将它们合并整理成一份完整、连贯的文档。

任务：${taskDescription}

内容片段：
${results.map((result, idx) => `## 第 ${idx + 1} 部分\n${result}`).join('\n\n')}`
			: `The following are content fragments generated in batches. Please merge and organize them into a complete, coherent document.

Task: ${taskDescription}

Content fragments:
${results.map((result, idx) => `## Part ${idx + 1}\n${result}`).join('\n\n')}`;
		
		const mergeMessages: ChatMessage[] = [
			{
				id: `system-merge-${Date.now()}`,
				role: 'system',
				content: systemPrompt,
				timestamp: Date.now()
			},
			{
				id: `final-merge-${Date.now()}`,
				role: 'user',
				content: userPrompt,
				timestamp: Date.now()
			}
		];
		
		if (onStream) {
			Logger.debug('[ContentBatchProcessor] Streaming final merge result');
			let fullContent = '';
			await this.provider.sendStreamingMessage(mergeMessages, (chunk) => {
				// Check for abort signal during streaming
				if (abortSignal?.aborted) {
					throw new Error('Content generation aborted by user');
				}

				if (chunk.delta) {
					fullContent += chunk.delta;
					onStream(chunk.delta);
				}
			}, abortSignal);
			return fullContent;
		} else {
			const mergeResponse = await this.provider.sendMessage(mergeMessages, abortSignal);
			return mergeResponse?.content || results.join('\n\n');
		}
	}
	
	/**
	 * Process content using summarize-and-merge strategy with caching
	 */
	public async processSummarizeMerge(
		batches: ContentBatch[],
		taskDescription: string,
		language: 'zh' | 'en',
		onProgress?: (batchIndex: number, content: string) => void,
		parallel: boolean = true,
		originalUserQuery?: string,
		abortSignal?: AbortSignal
	): Promise<string> {
		Logger.debug('[ContentBatchProcessor] Processing with summarize-merge strategy, parallel:', parallel);
		
		const summaries: string[] = [];
		
		if (parallel && batches.length > 1) {
			// Step 1: Summarize each batch in parallel with caching
			Logger.debug('[ContentBatchProcessor] Summarizing', batches.length, 'batches in parallel');
			
			const summaryPromises = batches.map(async (batch) => {
				// Check for abort signal
				if (abortSignal?.aborted) {
					throw new Error('Content generation aborted by user');
				}

				const batchContent = batch.items.join('\n\n---\n\n');
				
				// Check cache first
				const cachedSummary = this.getCachedSummary(batchContent);
				if (cachedSummary) {
					Logger.debug(`[ContentBatchProcessor] Using cached summary for batch ${batch.index}`);
					if (onProgress) {
						onProgress(batch.index, `[缓存摘要 ${batch.index}/${batches.length}] ${cachedSummary.substring(0, 100)}...`);
					}
					return {
						index: batch.index,
						summary: cachedSummary
					};
				}
				
				// Generate new summary
				Logger.debug(`[ContentBatchProcessor] Generating summary for batch ${batch.index}/${batches.length}`);
				
				const summarizePrompt = language === 'zh'
					? `请总结以下内容的关键信息和要点。这是第 ${batch.index} 部分（共 ${batches.length} 部分）。

内容：
${batchContent}

请提取关键信息，保持重要细节，生成简洁的摘要。直接输出摘要，不要添加解释。`
					: `Please summarize the key information and points from the following content. This is part ${batch.index} of ${batches.length}.

Content:
${batchContent}

Extract key information, retain important details, and generate a concise summary. Output the summary directly without explanations.`;
				
				const messages: ChatMessage[] = [{
					id: `summarize-${batch.index}-${Date.now()}`,
					role: 'user',
					content: summarizePrompt,
					timestamp: Date.now()
				}];
				
				const response = await this.provider.sendMessage(messages, abortSignal);
				
				if (response?.content) {
					// Cache the summary
					this.cacheSummary(batchContent, response.content);
					
					if (onProgress) {
						onProgress(batch.index, `[摘要 ${batch.index}/${batches.length}] ${response.content.substring(0, 100)}...`);
					}
					
					return {
						index: batch.index,
						summary: response.content
					};
				}
				
				return {
					index: batch.index,
					summary: ''
				};
			});
			
			// Wait for all summaries
			const summaryResults = await Promise.all(summaryPromises);
			summaryResults.sort((a, b) => a.index - b.index);
			summaries.push(...summaryResults.map(r => r.summary));
			
		} else {
			// Sequential processing with caching
			for (const batch of batches) {
				// Check for abort signal
				if (abortSignal?.aborted) {
					throw new Error('Content generation aborted by user');
				}

				const batchContent = batch.items.join('\n\n---\n\n');
				
				// Check cache first
				const cachedSummary = this.getCachedSummary(batchContent);
				if (cachedSummary) {
					Logger.debug(`[ContentBatchProcessor] Using cached summary for batch ${batch.index}`);
					summaries.push(cachedSummary);
					if (onProgress) {
						onProgress(batch.index, `[缓存摘要 ${batch.index}/${batches.length}] ${cachedSummary.substring(0, 100)}...`);
					}
					continue;
				}
				
				// Generate new summary
				Logger.debug(`[ContentBatchProcessor] Summarizing batch ${batch.index}/${batches.length}`);
				
				const summarizePrompt = language === 'zh'
					? `请总结以下内容的关键信息和要点。这是第 ${batch.index} 部分（共 ${batches.length} 部分）。

内容：
${batchContent}

请提取关键信息，保持重要细节，生成简洁的摘要。直接输出摘要，不要添加解释。`
					: `Please summarize the key information and points from the following content. This is part ${batch.index} of ${batches.length}.

Content:
${batchContent}

Extract key information, retain important details, and generate a concise summary. Output the summary directly without explanations.`;
				
				const messages: ChatMessage[] = [{
					id: `summarize-${batch.index}-${Date.now()}`,
					role: 'user',
					content: summarizePrompt,
					timestamp: Date.now()
				}];
				
				const response = await this.provider.sendMessage(messages, abortSignal);
				
				if (response?.content) {
					// Cache the summary
					this.cacheSummary(batchContent, response.content);
					summaries.push(response.content);
					
					if (onProgress) {
						onProgress(batch.index, `[摘要 ${batch.index}/${batches.length}] ${response.content.substring(0, 100)}...`);
					}
				}
			}
		}
		
		// Step 2: Generate final content from summaries
		Logger.debug('[ContentBatchProcessor] Generating final content from summaries');
		
		const systemPrompt = this.getContentGenerationSystemPrompt(language);
		
		// Include original user query if provided
		const userGoalSection = originalUserQuery 
			? (language === 'zh' 
				? `\n\n用户的最终目标：${originalUserQuery}\n`
				: `\n\nUser's ultimate goal: ${originalUserQuery}\n`)
			: '';
		
		const userPrompt = language === 'zh'
			? `基于以下摘要信息完成任务：${userGoalSection}
任务：${taskDescription}

摘要信息：
${summaries.map((summary, idx) => `## 摘要 ${idx + 1}\n${summary}`).join('\n\n')}`
			: `Complete the task based on the following summary information:${userGoalSection}
Task: ${taskDescription}

Summary information:
${summaries.map((summary, idx) => `## Summary ${idx + 1}\n${summary}`).join('\n\n')}`;
		
		const generateMessages: ChatMessage[] = [
			{
				id: `system-generate-${Date.now()}`,
				role: 'system',
				content: systemPrompt,
				timestamp: Date.now()
			},
			{
				id: `generate-${Date.now()}`,
				role: 'user',
				content: userPrompt,
				timestamp: Date.now()
			}
		];
		
		const finalResponse = await this.provider.sendMessage(generateMessages, abortSignal);
		
		return finalResponse?.content || summaries.join('\n\n');
	}
	
	/**
	 * Get system prompt for content generation (matching mastra-agent.ts logic)
	 */
	private getContentGenerationSystemPrompt(language: 'zh' | 'en'): string {
		if (language === 'zh') {
			return `你是一个专业的内容分析与生成助手。你的任务是基于提供的多源信息，生成一份综合性、深入的分析报告。

核心要求：
1. **综合分析** - 整合所有来源的信息，提供全面的视角和深入的洞察
2. **叙述性写作** - 使用连贯的段落进行深入分析，避免过度依赖项目符号列表
   - 项目符号仅用于清单、列举或补充说明
   - 主体内容应该是流畅的分析性段落，展现逻辑推理和洞察
3. **语言匹配** - 根据用户查询的主要语言撰写（中文查询用中文，英文查询用英文）
4. **可视化增强** - 适当使用表格和Mermaid图表来呈现：
   - 表格：对比数据、关键指标、时间线等
   - Mermaid流程图/关系图：展示流程、架构、因果关系等
5. **直接输出** - 生成的内容将直接使用，不要包含"以下是..."等元评论

输出格式：
- Markdown格式，结构清晰
- 从标题直接开始（如"## 分析报告"而非"以下是分析：## 分析报告"）
- 段落为主，配合适当的标题、表格、图表
- 可直接使用，无需修改`;
		}
		
		return `You are a professional content analysis and generation assistant. Your task is to synthesize information from multiple sources and produce a comprehensive, in-depth analytical report.

CORE REQUIREMENTS:
1. **Comprehensive Analysis** - Integrate all source materials to provide complete perspectives and deep insights
2. **Narrative Writing** - Use coherent paragraphs for in-depth analysis, avoiding over-reliance on bullet points
   - Bullet points should only be used for checklists, enumerations, or supplementary notes
   - Main content should be flowing analytical paragraphs demonstrating logical reasoning and insights
3. **Language Matching** - Write in the primary language of the user's query (Chinese for Chinese queries, English for English queries)
4. **Visual Enhancement** - Appropriately use tables and Mermaid diagrams to present:
   - Tables: Comparative data, key metrics, timelines, etc.
   - Mermaid diagrams: Processes, architectures, relationships, etc.
5. **Direct Output** - Content will be used as-is; do NOT include meta-commentary like "Here is..."

OUTPUT FORMAT:
- Markdown format with clear structure
- Start directly with content (e.g., "## Analysis Report" not "Here is the analysis: ## Analysis Report")
- Paragraph-focused with appropriate headings, tables, and diagrams
- Ready to use without modifications`;
	}

}
