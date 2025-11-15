import { createOpenAI } from '@ai-sdk/openai';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse, OpenAICompatibleProvider } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';

export class OpenAICompatibleProviderImpl extends BaseLLMProvider {
	private supportsVisionOverride?: boolean;

	constructor(config: OpenAICompatibleProvider) {
		super(config);
		this.supportsVisionOverride = config.supportsVision;

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
	 * Specifically handles:
	 * - annotations as object (GitHub Copilot format) -> convert to array or strip
	 * - copilot_annotations -> strip
	 */
	private createCustomFetch() {
		const originalFetch = global.fetch || fetch;
		
		return async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			const response = await originalFetch(url, init);
			
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

			// Create a transformed stream
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			const encoder = new TextEncoder();

			const transformedStream = new ReadableStream({
				async start(controller) {
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) {
								controller.close();
								break;
							}

							// Decode the chunk
							const chunk = decoder.decode(value, { stream: true });
							const lines = chunk.split('\n');
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
								} catch (e) {
									// If parsing fails, keep the original line
									transformedLines.push(line);
								}
							}

							// Encode and enqueue the transformed chunk
							const transformedChunk = encoder.encode(transformedLines.join('\n'));
							controller.enqueue(transformedChunk);
						}
					} catch (error) {
						controller.error(error);
					}
				}
			});

			// Create a new response with the transformed stream
			return new Response(transformedStream, {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers
			});
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

	protected getAISDKModel(): any {
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

		return this.sendMessageWithAISDK(messages, tools, systemMessage);
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

		Logger.debug('About to call sendStreamingMessageWithAISDK');
		return this.sendStreamingMessageWithAISDK(messages, onChunk, abortSignal, tools, systemMessage);
	}

	supportsVision(): boolean {
		// Manual override takes priority
		if (this.supportsVisionOverride !== undefined) {
			Logger.debug(`Using manual vision override:`, this.supportsVisionOverride);
			return this.supportsVisionOverride;
		}

		// Check if the current model supports vision/multimodal input
		// Common vision model names for OpenAI-compatible providers
		const visionModels = [
			// Local models
			'llava', 'llava-v1.5', 'llava-v1.6', 'llava-phi3', 'llava-llama3',
			'minicpm-v', 'cogvlm', 'qwen-vl', 'internvl', 'yi-vl',
			'moondream', 'bunny', 'obsidian-3b-multimodal',
			// Remote OpenAI-compatible services
			'gpt-4-vision', 'gpt-4o', 'gpt-4-turbo', 'claude-3',
			'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash',
			// Generic vision indicators
			'vision', 'multimodal', 'visual', 'image'
		];

		const modelName = this.model.toLowerCase();
		const supportsVision = visionModels.some(visionModel => modelName.includes(visionModel));

		Logger.debug(`Vision support check:`, {
			model: this.model,
			modelLower: modelName,
			supportsVision,
			matchedModels: visionModels.filter(vm => modelName.includes(vm)),
			manualOverride: this.supportsVisionOverride
		});

		return supportsVision;
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
					.map((model: any) => model.id || model.model_name || model.name)
					.filter((id: string) => id) // Filter out undefined/null values
					.sort();

				Logger.debug('Extracted models count:', models.length);
				Logger.debug('Available models:', models);
				return models;
			} else if (Array.isArray(data)) {
				// Some APIs return a direct array
				Logger.debug('Total models returned (direct array):', data.length);
				
				const models = data
					.map((model: any) => model.id || model.model_name || model.name)
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

	async getServerInfo(): Promise<any> {
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
	protected isRetryableError(error: any): boolean {
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
	protected formatError(error: any): any {
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
1. Switch to a vision-capable model (like llava, gpt-4-vision, claude-3, etc.)
2. Remove images from context before sending
3. Or enable vision support in provider settings if your model supports it

Original error: ${errorMessage}`,
					code: 'MULTIMODAL_NOT_SUPPORTED'
				};
			}
		}

		return baseError;
	}
}