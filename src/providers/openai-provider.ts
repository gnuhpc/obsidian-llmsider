import { createOpenAI } from '@ai-sdk/openai';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse, OpenAIProvider } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';

export class OpenAIProviderImpl extends BaseLLMProvider {
	private organizationId?: string;
	private supportsVisionOverride?: boolean;

	constructor(config: OpenAIProvider) {
		super(config);
		this.organizationId = config.organizationId;
		this.supportsVisionOverride = config.supportsVision;
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		this.model_config = createOpenAI({
			apiKey: this.apiKey,
			fetch: this.createCustomFetch()
		});
	}
	
	/**
	 * Create a custom fetch wrapper with timeout and Keep-Alive support
	 */
	private createCustomFetch() {
		const originalFetch = global.fetch || fetch;
		
		return async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			// Clone init to avoid mutation
			const fetchInit = { ...init };
			
			// Add timeout control
			const isStreaming = fetchInit.body?.toString().includes('"stream":true');
			const timeoutMs = isStreaming ? 120000 : 60000;
			
			// Add Keep-Alive header
			fetchInit.headers = {
				...fetchInit.headers,
				'Connection': 'keep-alive',
				'Keep-Alive': 'timeout=120, max=100'
			};
			
			// Create AbortController for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				Logger.warn(`[OpenAI] Request timeout after ${timeoutMs}ms for ${url}`);
				controller.abort();
			}, timeoutMs);
			
			// Merge abort signals
			if (fetchInit.signal) {
				const originalSignal = fetchInit.signal;
				originalSignal.addEventListener('abort', () => {
					controller.abort();
				});
			}
			fetchInit.signal = controller.signal;
			
			try {
				const response = await originalFetch(url, fetchInit);
				clearTimeout(timeoutId);
				return response;
			} catch (error) {
				clearTimeout(timeoutId);
				
				Logger.error('[OpenAI] Fetch error:', {
					url: url.toString(),
					error: error.message,
					code: error.code,
					name: error.name
				});
				
				if (error.name === 'AbortError') {
					throw new Error(`Request timeout after ${timeoutMs}ms for ${url}`);
				}
				throw error;
			}
		};
	}

	protected getAISDKModel(): unknown {
		return this.model_config.chat(this.model);
	}

	protected getEndpointForLogging(): string {
		return 'openai-chat-completions';
	}

	getProviderName(): string {
		return 'openai';
	}

	async sendMessage(messages: ChatMessage[], tools?: UnifiedTool[], systemMessage?: string): Promise<LLMResponse> {
		return this.sendMessageWithAISDK(messages, tools, systemMessage);
	}

	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		return this.sendStreamingMessageWithAISDK(messages, onChunk, abortSignal, tools, systemMessage);
	}

	supportsVision(): boolean {
		// Only use user's explicit configuration
		if (this.supportsVisionOverride !== undefined) {
			Logger.debug(`[OpenAI] Using user vision configuration for ${this.model}:`, this.supportsVisionOverride);
			return this.supportsVisionOverride;
		}

		// Default to false if not configured
		Logger.debug(`[OpenAI] No vision configuration set for ${this.model}, defaulting to false`);
		return false;
	}

	// OpenAI-specific methods using AI SDK
	async listModels(): Promise<string[]> {
		try {
			const url = 'https://api.openai.com/v1/models';
			Logger.debug('Fetching models from API...');
			Logger.debug('Request URL:', url);
			Logger.debug('Request Method: GET');
			Logger.debug('Request Headers:', {
				'Authorization': `Bearer ${this.apiKey.substring(0, 10)}...`,
				'Content-Type': 'application/json'
			});

			// Use Obsidian's requestUrl to bypass CORS
			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				}
			});

			Logger.debug('Response Status:', response.status);
			Logger.debug('Response Body:', JSON.stringify(response.json, null, 2));

			if (response.status !== 200) {
				Logger.error('Error Response:', response.text);
				throw new Error(`Failed to list models: ${response.status}`);
			}

			const data = response.json;
			
			// Filter GPT models and extract model IDs
			const models = (data.data || [])
				.filter((model: unknown) => model.id && model.id.startsWith('gpt-'))
				.map((model: unknown) => model.id)
				.sort();

			Logger.debug('Available GPT models count:', models.length);
			Logger.debug('Available models:', models);
			return models;
		} catch (error) {
			Logger.error('Error fetching models from API:', error);
			Logger.error('Error details:', {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			});
			// Return empty array to let user input model manually
			Logger.debug('API call failed, returning empty list for manual input');
			return [];
		}
	}	updateConfig(config: Partial<OpenAIProvider>): void {
		super.updateConfig(config);
		if (config.organizationId !== undefined) {
			this.organizationId = config.organizationId;
		}
		if (config.supportsVision !== undefined) {
			this.supportsVisionOverride = config.supportsVision;
		}

		// Reinitialize the client with new config
		this.initializeModelConfig();
	}
}