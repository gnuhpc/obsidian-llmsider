import { createOpenAI } from '@ai-sdk/openai';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse, QwenProvider } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';

export class QwenProviderImpl extends BaseLLMProvider {
	private region: string;

	constructor(config: QwenProvider) {
		super(config);
		this.region = config.region || 'cn-beijing';
		Logger.debug(`Constructor called with region: ${this.region}`);
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		try {
			// Validate API key
			if (!this.apiKey) {
				throw new Error('Qwen API key is required');
			}

			// Use fixed Qwen API endpoint through OpenAI-compatible interface
			const baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

			// Simple initialization following OpenAI Compatible provider pattern
			this.model_config = createOpenAI({
				apiKey: this.apiKey,
				baseURL: baseUrl
			});

			//Logger.debug(`Model config initialized successfully`);
		} catch (error) {
			Logger.error(`Failed to initialize model config:`, error);
			this.model_config = undefined;
			throw error;
		}
	}

	protected getAISDKModel(): any {
		if (!this.model_config) {
			Logger.error(`Model config not initialized`);
			throw new Error('Qwen provider not properly initialized');
		}
		Logger.debug(`Getting AI SDK model for: ${this.model}`);
		return this.model_config.chat(this.model);
	}

	protected getEndpointForLogging(): string {
		return 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
	}

	getProviderName(): string {
		return 'qwen';
	}

	supportsVision(): boolean {
		// Qwen supports vision for certain models
		return this.model.includes('vision') || this.model.includes('vl');
	}

	async listModels(): Promise<string[]> {
		try {
			// Only fetch first page for quick response
			// Qwen has many models across multiple pages, but first page is usually enough
			const url = 'https://dashscope.aliyuncs.com/api/v1/deployments/models?page_no=1&page_size=50';
			Logger.debug('Fetching first page of deployable models from API...');
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
			
			// Extract model names from the response
			// Qwen deployments API returns models in output.models array
			const allModels = data.output?.models || [];
			const totalModels = data.output?.total || 0;
			Logger.debug('Total deployable models available:', totalModels);
			Logger.debug('Models in first page:', allModels.length);
			
			const models = allModels
				.map((model: any) => model.model_name)
				.filter((name: string) => name) // Filter out empty names
				.sort();

			Logger.debug('Extracted models count:', models.length);
			Logger.debug('Available models (first page):', models);
			
			if (totalModels > models.length) {
				Logger.debug(`Note: Showing ${models.length} of ${totalModels} total models. You can manually enter other model names.`);
			}
			
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
}