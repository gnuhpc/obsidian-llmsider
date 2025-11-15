import { createOpenAI } from '@ai-sdk/openai';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse, OpenAIProvider } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';

export class OpenAIProviderImpl extends BaseLLMProvider {
	private organizationId?: string;

	constructor(config: OpenAIProvider) {
		super(config);
		this.organizationId = config.organizationId;
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		this.model_config = createOpenAI({
			apiKey: this.apiKey
		});
	}

	protected getAISDKModel(): any {
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
		// Check if the current model supports vision/multimodal input
		// OpenAI vision models
		const visionModels = [
			'gpt-4-vision-preview', 'gpt-4-turbo', 'gpt-4-turbo-preview',
			'gpt-4o', 'gpt-4o-mini', 'gpt-4-1106-vision-preview'
		];

		const modelName = this.model.toLowerCase();
		return visionModels.some(visionModel => modelName.includes(visionModel));
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
				.filter((model: any) => model.id && model.id.startsWith('gpt-'))
				.map((model: any) => model.id)
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

		// Reinitialize the client with new config
		this.initializeModelConfig();
	}
}