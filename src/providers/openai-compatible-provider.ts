import { createOpenAI } from '@ai-sdk/openai';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse, OpenAICompatibleProvider, GeneratedImage } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';

export class OpenAICompatibleProviderImpl extends BaseLLMProvider {
	private supportsVisionOverride?: boolean;
	private outputModalities?: string[];

	constructor(config: OpenAICompatibleProvider) {
		super(config);
		this.supportsVisionOverride = config.supportsVision;
		this.outputModalities = (config as any).outputModalities;

		// Initialize OpenAI client with custom baseURL for OpenAI-compatible servers
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		try {
			const finalBaseURL = this.buildFullEndpointURL();

			this.model_config = createOpenAI({
				apiKey: this.apiKey || 'not-needed',
				baseURL: finalBaseURL,
				fetch: this.createCustomFetch()
			});

		} catch (error) {
			this.model_config = undefined;
		}
	}

	/**
	 * Create a custom fetch wrapper that handles non-standard response formats
	 * and network reliability issues.
	 * 
	 * Improvements:
	 * - Adds adaptive timeout control (60s default, 180s for large requests >100KB, 120s for streaming)
	 * - Enables HTTP Keep-Alive for connection reuse
	 * - Handles ERR_INCOMPLETE_CHUNKED_ENCODING errors
	 * - Transforms non-standard annotations (GitHub Copilot format)
	 */
	private createCustomFetch() {
		const originalFetch = global.fetch || fetch;
		
		return async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			// Clone init to avoid mutation
			const fetchInit = { ...init };
			
		// Add timeout control to prevent hanging requests
		// Large content requests need longer timeout
		// Streaming: 120s, Large non-streaming (>50KB): 180s, Default: 60s
		const isStreaming = fetchInit.body?.toString().includes('"stream":true');
		const bodySize = fetchInit.body ? new Blob([fetchInit.body as BodyInit]).size : 0;
		const isLargeRequest = bodySize > 50000; // >50KB (降低阈值以涵盖更多批次)
		const timeoutMs = isStreaming ? 120000 : (isLargeRequest ? 180000 : 60000);			// Add Keep-Alive header to reuse connections and reduce latency
			fetchInit.headers = {
				...fetchInit.headers,
				'Connection': 'keep-alive',
				'Keep-Alive': 'timeout=120, max=100'
			};
			
			// Create an AbortController for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				Logger.warn(`[OpenAICompatible] Request timeout after ${timeoutMs}ms for ${url}`);
				controller.abort();
			}, timeoutMs);
			
			// Merge abort signals if one already exists
			if (fetchInit.signal) {
				const originalSignal = fetchInit.signal;
				// Listen to original signal
				originalSignal.addEventListener('abort', () => {
					controller.abort();
				});
			}
			fetchInit.signal = controller.signal;
			
			try {
				const response = await originalFetch(url, fetchInit);
				clearTimeout(timeoutId);
				
				// Only process streaming chat completion responses
				const urlStr = url.toString();
				if (!urlStr.includes('/chat/completions') || !response.body) {
					return response;
				}

				// Check if this is a streaming response
				const contentType = response.headers.get('content-type') || '';
				if (!contentType.includes('text/event-stream')) {
					return response;
				}

				// Create a transformed stream with error recovery
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				const encoder = new TextEncoder();
				
				// Track incomplete chunks for error recovery
				let incompleteChunk = '';
				let consecutiveErrors = 0;
				const MAX_CONSECUTIVE_ERRORS = 3;

				const transformedStream = new ReadableStream({
					async start(controller) {
						try {
							while (true) {
								try {
									const { done, value } = await reader.read();
									if (done) {
										// If stream ends with incomplete data, log warning
										if (incompleteChunk.trim()) {
											Logger.warn('[OpenAICompatible] Stream ended with incomplete chunk:', incompleteChunk);
										}
										controller.close();
										break;
									}
									
									// Reset error counter on successful read
									consecutiveErrors = 0;

									// Decode the chunk
									const chunk = decoder.decode(value, { stream: true });
									
									// Prepend any incomplete chunk from previous iteration
									const fullChunk = incompleteChunk + chunk;
									const lines = fullChunk.split('\n');
									
									// Save last line if it doesn't end with newline (incomplete)
									if (!fullChunk.endsWith('\n')) {
										incompleteChunk = lines.pop() || '';
									} else {
										incompleteChunk = '';
									}
									
									const transformedLines: string[] = [];

									for (const line of lines) {
										if (!line.trim() || !line.startsWith('data: ')) {
											transformedLines.push(line);
											continue;
										}

										const data = line.slice(6); // Remove 'data: '
										if (data === '[DONE]') {
											transformedLines.push(line);
											continue;
										}

										try {
											const parsed = JSON.parse(data);
											
											// Transform annotations if present
											if (parsed.choices) {
												for (const choice of parsed.choices) {
													if (choice.delta?.annotations) {
														// If annotations is an object, strip it entirely
														// The AI SDK expects it to be an array or undefined
														if (typeof choice.delta.annotations === 'object' && !Array.isArray(choice.delta.annotations)) {
															delete choice.delta.annotations;
													}
												}
												// Also strip copilot-specific annotations
												if (choice.delta?.copilot_annotations) {
													delete choice.delta.copilot_annotations;
												}
											}
										}

										transformedLines.push('data: ' + JSON.stringify(parsed));
										} catch (parseError) {
											// If parsing fails, keep the original line
											Logger.debug('[OpenAICompatible] Failed to parse SSE line, keeping original:', line.substring(0, 100));
											transformedLines.push(line);
										}
									}

									// Encode and enqueue the transformed chunk
									const transformedChunk = encoder.encode(transformedLines.join('\n') + '\n');
									controller.enqueue(transformedChunk);
								} catch (readError) {
									// Catch errors from reader.read() specifically
									consecutiveErrors++;
									Logger.error(`[OpenAICompatible] Stream read error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, readError);
									
									// If too many consecutive errors or network error, fail the stream immediately
									const isNetworkError = readError instanceof TypeError && 
										(readError.message.includes('network') || readError.message.includes('aborted'));
									
									if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS || isNetworkError) {
										Logger.error('[OpenAICompatible] Stream failed, aborting:', readError.message);
										controller.error(readError);
										break; // Exit the while loop
									}
									// Otherwise continue trying to read
								}
							}
						} catch (outerError) {
							// Catch any other unexpected errors
							Logger.error('[OpenAICompatible] Unexpected stream error:', outerError);
							controller.error(outerError);
						}
					}
				});

				// Create a new response with the transformed stream
				return new Response(transformedStream, {
					status: response.status,
					statusText: response.statusText,
					headers: response.headers
				});
			} catch (fetchError) {
				clearTimeout(timeoutId);
				
				// Log detailed error for debugging
				Logger.error('[OpenAICompatible] Fetch error:', {
					url: url.toString(),
					error: fetchError.message,
					code: fetchError.code,
					name: fetchError.name
				});
				
				// Re-throw with enhanced error message
				if (fetchError.name === 'AbortError') {
					throw new Error(`Request timeout after ${timeoutMs}ms for ${url}`);
				}
				throw fetchError;
			}
		};
	}

	private buildFullEndpointURL(): string {
		if (!this.baseUrl) {
			return '';
		}

		// If the URL already includes the full path, use it as-is
		if (this.baseUrl.includes('/v1/chat/completions')) {
			return this.baseUrl;
		}

		// Remove trailing slash if present
		let url = this.baseUrl.replace(/\/$/, '');

		// Add /v1 if not present
		if (!url.endsWith('/v1')) {
			url += '/v1';
		}

		return url;
	}

	protected getEndpointForLogging(): string {
		const baseURL = this.buildFullEndpointURL();
		if (baseURL && !baseURL.includes('/chat/completions')) {
			return `${baseURL}/chat/completions`;
		}
		return baseURL;
	}

	protected getAISDKModel(): unknown {
		return this.model_config.chat(this.model);
	}

	getProviderName(): string {
		return 'openai-compatible';
	}

	async sendMessage(messages: ChatMessage[], tools?: UnifiedTool[], systemMessage?: string): Promise<LLMResponse> {
		if (!this.baseUrl) {
			throw new Error('Base URL not configured for OpenAI-compatible provider');
		}

		if (!this.model_config || typeof this.model_config !== 'function') {
			throw new Error('OpenAI-compatible provider not properly initialized');
		}

		// Check if this model supports image generation
		const modelLower = this.model.toLowerCase();
		const supportsImageGeneration = this.outputModalities?.includes('image') ||
			(modelLower.includes('gemini') && modelLower.includes('image')) ||
			modelLower.includes('dall-e') ||
			modelLower.includes('flux');
		
		if (supportsImageGeneration) {
			// For image generation models, override to add modalities
			Logger.debug('Detected image generation model:', this.model);
			return this.sendMessageWithImageGeneration(messages, tools, systemMessage);
		}

		return this.sendMessageWithAISDK(messages, tools, systemMessage);
	}

	/**
	 * Send message with image generation support (OpenRouter)
	 * Adds modalities parameter for image generation models
	 */
	private async sendMessageWithImageGeneration(
		messages: ChatMessage[],
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<LLMResponse> {
		// Use requestUrl to make a direct API call with modalities support
		try {
			const formattedMessages = this.formatMessagesForAISDK(messages);
			
			const requestBody: any = {
				model: this.model,
				messages: formattedMessages,
				modalities: ['image', 'text'],
				max_tokens: this.maxTokens
			};

			// Only add temperature for non-reasoning models
			if (!this.isReasoningModel()) {
				requestBody.temperature = this.temperature;
			}

			if (systemMessage) {
				requestBody.messages.unshift({
					role: 'system',
					content: systemMessage
				});
			}

			if (tools && tools.length > 0) {
				requestBody.tools = this.convertToolsToProviderFormat(tools);
			}

			// Optional: Add image_config for Gemini models
			if (this.model.includes('gemini') && this.model.includes('image')) {
				requestBody.image_config = {
					aspect_ratio: '1:1', // Default aspect ratio
					image_size: '1K' // Default size
				};
			}

			const response = await requestUrl({
				url: `${this.baseUrl}/chat/completions`,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (response.status !== 200) {
				throw new Error(`API request failed: ${response.status}`);
			}

			const data = response.json;
			
			// Extract response
			const choice = data.choices?.[0];
			const message = choice?.message;
			
			// Extract images - OpenRouter returns images in message.images
			// Format: [{type: "image_url", image_url: {url: "data:image/png;base64,..."}}]
			let images: GeneratedImage[] | undefined;
			if (message?.images && Array.isArray(message.images)) {
				images = message.images;
				Logger.debug('Found images in message.images:', images.length);
				Logger.debug('First image preview:', images[0]?.image_url?.url?.substring(0, 80));
			} else if (data.images && Array.isArray(data.images)) {
				images = data.images;
				Logger.debug('Found images in data.images:', images.length);
			}
			
			// Log raw response for debugging if no images found
			if (!images && this.model.toLowerCase().includes('image')) {
				Logger.debug('No images found in response. Raw response:', JSON.stringify(data, null, 2));
			}
			
			return {
				content: message?.content || '',
				model: this.model,
				usage: {
					promptTokens: data.usage?.prompt_tokens || 0,
					completionTokens: data.usage?.completion_tokens || 0,
					totalTokens: data.usage?.total_tokens || 0
				},
				finishReason: choice?.finish_reason === 'length' ? 'length' : 'stop',
				images: images,
				metadata: {
					provider: this.getProviderName(),
					rawResponse: data
				}
			};
		} catch (error) {
			Logger.error('Error in image generation request:', error);
			throw error;
		}
	}

	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		Logger.debug('sendStreamingMessage called');
		Logger.debug('baseUrl:', this.baseUrl);
		Logger.debug('messages count:', messages.length);
		Logger.debug('tools count:', tools?.length || 0);
		
		if (!this.baseUrl) {
			throw new Error('Base URL not configured for OpenAI-compatible provider');
		}

		if (!this.model_config || typeof this.model_config !== 'function') {
			throw new Error('OpenAI-compatible provider not properly initialized');
		}

		// Check if model supports image generation
		const modelLower = this.model.toLowerCase();
		const supportsImageGeneration = this.outputModalities?.includes('image') ||
			(modelLower.includes('gemini') && modelLower.includes('image')) ||
			modelLower.includes('dall-e') ||
			modelLower.includes('flux');
		
		// Debug logging for image generation detection
		Logger.debug('[ImageGen] Model detection:', {
			model: this.model,
			modelLower,
			hasOutputModalities: !!this.outputModalities,
			outputModalities: this.outputModalities,
			hasGeminiImage: modelLower.includes('gemini') && modelLower.includes('image'),
			hasDallE: modelLower.includes('dall-e'),
			hasFlux: modelLower.includes('flux'),
			supportsImageGeneration
		});
		
		// Check if system message explicitly disables image generation (e.g., for title generation)
		const bypassImageGeneration = systemMessage?.toLowerCase().includes('no images');
		
		if (bypassImageGeneration) {
			Logger.debug('[ImageGen] Bypassing image generation due to system message');
		}
			
		if (supportsImageGeneration && !bypassImageGeneration) {
			Logger.debug('Using image generation streaming for model:', this.model);
			return this.sendStreamingMessageWithImageGeneration(messages, onChunk, abortSignal, tools, systemMessage);
		}

		Logger.debug('About to call sendStreamingMessageWithAISDK');
		return this.sendStreamingMessageWithAISDK(messages, onChunk, abortSignal, tools, systemMessage);
	}

	/**
	 * Send streaming message with image generation support (OpenRouter)
	 * Adds modalities parameter for image generation models
	 */
	private async sendStreamingMessageWithImageGeneration(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		try {
			const formattedMessages = this.formatMessagesForAISDK(messages);
			
			const requestBody: any = {
				model: this.model,
				messages: formattedMessages,
				modalities: ['image', 'text'],
				max_tokens: this.maxTokens,
				stream: true
			};

			// Only add temperature for non-reasoning models
			if (!this.isReasoningModel()) {
				requestBody.temperature = this.temperature;
			}

			if (systemMessage) {
				requestBody.messages.unshift({
					role: 'system',
					content: systemMessage
				});
			}

			if (tools && tools.length > 0) {
				requestBody.tools = this.convertToolsToProviderFormat(tools);
			}

			// Optional: Add image_config for Gemini models
			if (this.model.includes('gemini') && this.model.includes('image')) {
				requestBody.image_config = {
					aspect_ratio: '1:1',
					image_size: '1K'
				};
			}

			const response = await fetch(`${this.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody),
				signal: abortSignal
			});

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('Response body is null');
			}

			const decoder = new TextDecoder();
			let buffer = '';
			const accumulatedImages: GeneratedImage[] = [];

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') continue;

						try {
							const chunk = JSON.parse(data);
							const delta = chunk.choices?.[0]?.delta;
							const message = chunk.choices?.[0]?.message;

							// Handle content - can be string or array
							if (delta?.content) {
								if (typeof delta.content === 'string') {
									// Text content
									onChunk({
										content: delta.content,
										done: false
									});
								} else if (Array.isArray(delta.content)) {
									// Array of content parts (text and/or images)
									for (const part of delta.content) {
										if (part.type === 'text' && part.text) {
											onChunk({
												content: part.text,
												done: false
											});
										} else if (part.type === 'image_url' && part.image_url?.url) {
											accumulatedImages.push(part);
											Logger.debug('Found image in delta.content array:', part.image_url.url.substring(0, 80));
										}
									}
								}
							}

							// Also check message.content for final response
							if (message?.content && Array.isArray(message.content)) {
								for (const part of message.content) {
									if (part.type === 'image_url' && part.image_url?.url) {
										// Avoid duplicates
										const isDuplicate = accumulatedImages.some(img => 
											img.image_url?.url === part.image_url.url
										);
										if (!isDuplicate) {
											accumulatedImages.push(part);
											Logger.debug('Found image in message.content array:', part.image_url.url.substring(0, 80));
										}
									}
								}
							}

							// Legacy: Also check for images field (some providers might use this)
							if (delta?.images && Array.isArray(delta.images)) {
								accumulatedImages.push(...delta.images);
								Logger.debug('Found images in delta.images:', delta.images.length);
							} else if (message?.images && Array.isArray(message.images)) {
								const existingUrls = new Set(accumulatedImages.map(img => img.image_url?.url));
								const newImages = message.images.filter(img => !existingUrls.has(img.image_url?.url));
								accumulatedImages.push(...newImages);
								if (newImages.length > 0) {
									Logger.debug('Found new images in message.images:', newImages.length);
								}
							}

							// Tool calls handling
							if (delta?.tool_calls) {
								// Handle tool calls if needed
							}

							// Check for finish
							const finishReason = chunk.choices?.[0]?.finish_reason;
							if (finishReason) {
								Logger.debug('Stream finished. Total accumulated images:', accumulatedImages.length);
								onChunk({
									content: '',
									done: true,
									images: accumulatedImages.length > 0 ? accumulatedImages : undefined,
									finishReason: finishReason === 'length' ? 'length' : 'stop',
									usage: chunk.usage ? {
										promptTokens: chunk.usage.prompt_tokens || 0,
										completionTokens: chunk.usage.completion_tokens || 0,
										totalTokens: chunk.usage.total_tokens || 0
									} : undefined
								});
							}
						} catch (e) {
							Logger.error('Error parsing streaming chunk:', e);
							Logger.debug('Problematic line:', line);
						}
					}
				}
			}
			
			Logger.debug('Stream finished. Total images sent:', accumulatedImages.length);
		} catch (error) {
			Logger.error('Error in streaming image generation request:', error);
			throw error;
		}
	}

	supportsVision(): boolean {
		// Only use user's explicit configuration
		if (this.supportsVisionOverride !== undefined) {
			Logger.debug(`[OpenAI Compatible] Using user vision configuration for ${this.model}:`, this.supportsVisionOverride);
			return this.supportsVisionOverride;
		}

		// Default to false if not configured
		Logger.debug(`[OpenAI Compatible] No vision configuration set for ${this.model}, defaulting to false`);
		return false;
	}

	// OpenAI-compatible provider specific methods using AI SDK
	async listModels(): Promise<string[]> {
		try {
			if (!this.baseUrl) {
				Logger.warn('No baseUrl configured, cannot list models');
				return [];
			}

			// Try to fetch models from the OpenAI-compatible endpoint
			const modelsUrl = `${this.baseUrl}/models`;
			Logger.debug('Fetching models from API...');
			Logger.debug('Request URL:', modelsUrl);
			Logger.debug('Request Method: GET');
			Logger.debug('Request Headers:', {
				'Authorization': `Bearer ${this.apiKey.substring(0, 10)}...`,
				'Content-Type': 'application/json'
			});

			// Use Obsidian's requestUrl to bypass CORS
			const response = await requestUrl({
				url: modelsUrl,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				}
			});

			Logger.debug('Response Status:', response.status);

			if (response.status !== 200) {
				Logger.error('Error Response:', response.text);
				throw new Error(`Failed to list models: ${response.status}`);
			}

			const data = response.json;
			Logger.debug('Response Body:', JSON.stringify(data, null, 2));
			
			// Extract model IDs from the response
			// Most OpenAI-compatible APIs follow the same format
			if (data.data && Array.isArray(data.data)) {
				const allModels = data.data;
				Logger.debug('Total models returned (data.data):', allModels.length);
				
				const models = allModels
					.map((model: unknown) => model.id || model.model_name || model.name)
					.filter((id: string) => id) // Filter out undefined/null values
					.sort();

				Logger.debug('Extracted models count:', models.length);
				Logger.debug('Available models:', models);
				return models;
			} else if (Array.isArray(data)) {
				// Some APIs return a direct array
				Logger.debug('Total models returned (direct array):', data.length);
				
				const models = data
					.map((model: unknown) => model.id || model.model_name || model.name)
					.filter((id: string) => id)
					.sort();

				Logger.debug('Extracted models count:', models.length);
				Logger.debug('Available models:', models);
				return models;
			} else {
				Logger.warn('Unexpected API response format');
				Logger.warn('Response structure:', Object.keys(data));
				return [];
			}
		} catch (error) {
			Logger.error('Error fetching models from API:', error);
			Logger.error('Error details:', {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			});
			// For OpenAI-compatible endpoints, we can't provide a fallback
			// as models vary widely between providers
			Logger.debug('No fallback available, returning empty list');
			return [];
		}
	}

	async getModelDetails(modelName: string): Promise<any> {
		try {
			if (!this.baseUrl) {
				Logger.warn('No baseUrl configured, cannot get model details');
				return null;
			}

			const modelsUrl = `${this.baseUrl}/models`;
			Logger.debug('Fetching model details from API...');
			
			// Use Obsidian's requestUrl to bypass CORS
			const response = await requestUrl({
				url: modelsUrl,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				}
			});

			if (response.status !== 200) {
				Logger.error('Error fetching model details:', response.text);
				return null;
			}

			const data = response.json;
			
			// Find the specific model in the list
			if (data.data && Array.isArray(data.data)) {
				return data.data.find((m: any) => m.id === modelName || m.model_name === modelName || m.name === modelName);
			} else if (Array.isArray(data)) {
				return data.find((m: any) => m.id === modelName || m.model_name === modelName || m.name === modelName);
			}

			return null;
		} catch (error) {
			Logger.error('Error fetching model details:', error);
			return null;
		}
	}

	async getServerInfo(): Promise<unknown> {
		// This would require custom HTTP calls, which we're moving away from
		// Return null for now
		return null;
	}

	// Test connection with a simple request
	async testConnection(): Promise<boolean> {
		try {
			const testMessages: ChatMessage[] = [{
				id: 'test',
				role: 'user',
				content: 'Hi',
				timestamp: Date.now()
			}];

			const response = await this.sendMessage(testMessages);
			return response.content.length > 0;
		} catch (error) {
			Logger.error('OpenAI-compatible provider connection test failed:', error);
			return false;
		}
	}

	updateConfig(config: Partial<OpenAICompatibleProvider>): void {
		super.updateConfig(config);
		if (config.supportsVision !== undefined) {
			this.supportsVisionOverride = config.supportsVision;
		}

		// Reinitialize the client with new config
		this.initializeModelConfig();
	}

	// Override to handle OpenAI-compatible provider quirks
	protected isRetryableError(error: unknown): boolean {
		// OpenAI-compatible servers might have different error patterns
		const retryableStatusCodes = [429, 502, 503, 504];

		if (error.status && retryableStatusCodes.includes(error.status)) {
			return true;
		}

		// Connection errors to OpenAI-compatible servers are often retryable
		if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
			return true;
		}

		return super.isRetryableError(error);
	}

	// Override formatError to provide better multimodal error messages
	protected formatError(error: unknown): unknown {
		const baseError = super.formatError(error);

		// Check if this is a 400 error that might be related to multimodal content
		if (error.response && error.response.status === 400) {
			const errorMessage = error.response.data?.error?.message || error.message || '';
			const errorCode = error.response.data?.error?.code || '';

			// Common patterns that indicate multimodal/vision issues
			const multimodalErrorPatterns = [
				'image',
				'vision',
				'multimodal',
				'content_type',
				'unsupported',
				'format',
				'media',
				'base64',
				'image_url'
			];

			const isLikelyMultimodalError = multimodalErrorPatterns.some(pattern =>
				errorMessage.toLowerCase().includes(pattern) ||
				errorCode.toLowerCase().includes(pattern)
			);

			if (isLikelyMultimodalError) {
				return {
					...baseError,
					message: `${this.model} does not support image analysis. Please:
1. Switch to a vision-capable model (like llava, gpt-4o, claude-4-sonnet, gemini-2, etc.)
2. Remove images from context before sending
3. Or enable "Supports Vision" option in model settings if your model supports it

Original error: ${errorMessage}`,
					code: 'MULTIMODAL_NOT_SUPPORTED'
				};
			}
		}

		return baseError;
	}
}