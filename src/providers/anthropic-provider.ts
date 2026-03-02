import { createAnthropic } from '@ai-sdk/anthropic';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';
import { obsidianFetch } from '../utils/obsidian-fetch';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse, AnthropicProvider } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';

export class AnthropicProviderImpl extends BaseLLMProvider {
	private supportsVisionOverride?: boolean;

	constructor(config: AnthropicProvider) {
		super(config);
		this.supportsVisionOverride = config.supportsVision;
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		this.model_config = createAnthropic({
			apiKey: this.apiKey,
			fetch: this.createCustomFetch()
		});
	}
	
	/**
	 * Create a custom fetch wrapper with timeout and Keep-Alive support
	 */
	private createCustomFetch() {
		return async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			const fetchInit = { ...init };
			const isStreaming = fetchInit.body?.toString().includes('"stream":true');
			const timeoutMs = isStreaming ? 120000 : 60000;

			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				Logger.warn(`[Anthropic] Request timeout after ${timeoutMs}ms for ${url}`);
				controller.abort();
			}, timeoutMs);

			if (fetchInit.signal) {
				const originalSignal = fetchInit.signal;
				originalSignal.addEventListener('abort', () => controller.abort());
			}
			fetchInit.signal = controller.signal;

			try {
				const response = await obsidianFetch(url, {
					...fetchInit,
					proxyEnabled: this.proxyEnabled,
					proxyType: this.proxyType,
					proxyHost: this.proxyHost,
					proxyPort: this.proxyPort,
					proxyAuth: this.proxyAuth,
					proxyUsername: this.proxyUsername,
					proxyPassword: this.proxyPassword,
				});
				clearTimeout(timeoutId);
				return response;
			} catch (error) {
				clearTimeout(timeoutId);
				Logger.error('[Anthropic] Fetch error:', {
					url: url.toString(),
					error: (error as Error).message,
					code: (error as any).code,
					name: (error as Error).name
				});
				if ((error as Error).name === 'AbortError') {
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
		return 'anthropic-messages';
	}

	getProviderName(): string {
		return 'anthropic';
	}

	async sendMessage(messages: ChatMessage[], tools?: UnifiedTool[], systemMessage?: string): Promise<LLMResponse> {
		// Use provided systemMessage or extract from messages
		if (systemMessage) {
			return this.sendMessageWithAISDK(messages, tools, systemMessage);
		} else {
			// Extract system message for Anthropic (legacy behavior)
			const { formattedMessages, systemMessage: extractedSystemMessage } = this.extractSystemMessage(messages);
			return this.sendMessageWithAISDK(formattedMessages, tools, extractedSystemMessage);
		}
	}

	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		// Use provided systemMessage or extract from messages
		if (systemMessage) {
			return this.sendStreamingMessageWithAISDK(messages, onChunk, abortSignal, tools, systemMessage);
		} else {
			// Extract system message for Anthropic (legacy behavior)
			const { formattedMessages, systemMessage: extractedSystemMessage } = this.extractSystemMessage(messages);
			return this.sendStreamingMessageWithAISDK(formattedMessages, onChunk, abortSignal, tools, extractedSystemMessage);
		}
	}

	// Anthropic-specific method to extract system messages
	private extractSystemMessage(messages: ChatMessage[]): { formattedMessages: ChatMessage[], systemMessage?: string } {
		const formattedMessages: ChatMessage[] = [];
		let systemMessage = '';

		for (const msg of messages) {
			if (msg.role === 'system') {
				// Collect system messages to be used as system parameter
				systemMessage += (systemMessage ? '\n\n' : '') + (typeof msg.content === 'string' ? msg.content : this.extractTextFromContent(msg.content));
			} else {
				formattedMessages.push(msg);
			}
		}

		// Ensure alternating pattern starts with user
		if (formattedMessages.length > 0 && formattedMessages[0].role !== 'user') {
			formattedMessages.unshift({
				id: 'system-continue',
				role: 'user',
				content: 'Please continue our conversation.',
				timestamp: Date.now()
			});
		}

		return {
			formattedMessages,
			systemMessage: systemMessage || undefined
		};
	}

	supportsVision(): boolean {
		// Only use user's explicit configuration
		if (this.supportsVisionOverride !== undefined) {
			Logger.debug(`[Anthropic] Using user vision configuration for ${this.model}:`, this.supportsVisionOverride);
			return this.supportsVisionOverride;
		}

		// Default to false if not configured
		Logger.debug(`[Anthropic] No vision configuration set for ${this.model}, defaulting to false`);
		return false;
	}

	// Anthropic-specific methods using AI SDK
	async listModels(): Promise<string[]> {
		try {
			const url = 'https://api.anthropic.com/v1/models';
			Logger.debug('Fetching models from API...');
			Logger.debug('Request URL:', url);
			Logger.debug('Request Method: GET');
			Logger.debug('Request Headers:', {
				'x-api-key': `${this.apiKey.substring(0, 10)}...`,
				'anthropic-version': '2023-06-01',
				'Content-Type': 'application/json'
			});

			// Use Obsidian's requestUrl to bypass CORS
			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'x-api-key': this.apiKey,
					'anthropic-version': '2023-06-01',
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
			const allModels = data.data || [];
			Logger.debug('Total models returned:', allModels.length);
			
			const models = allModels
				.map((model: unknown) => model.id)
				.sort();

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
	}

	updateConfig(config: Partial<AnthropicProvider>): void {
		super.updateConfig(config);
		if (config.supportsVision !== undefined) {
			this.supportsVisionOverride = config.supportsVision;
		}

		// Reinitialize the client with new config
		this.initializeModelConfig();
	}

	// Override token calculation for Anthropic-specific estimation
	protected calculateTokenUsage(prompt: string, completion: string): {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	} {
		// Anthropic token estimation (roughly 3.5 characters per token)
		const promptTokens = Math.ceil(prompt.length / 3.5);
		const completionTokens = Math.ceil(completion.length / 3.5);

		return {
			promptTokens,
			completionTokens,
			totalTokens: promptTokens + completionTokens
		};
	}
}