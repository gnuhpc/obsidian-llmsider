// OpenAI-compatible provider implementation

import { BaseLLMProvider, StreamCallbacks } from './base-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Logger } from '../utils/logger';

export class OpenAICompatibleProvider extends BaseLLMProvider {
	constructor(
		apiKey: string,
		model: string,
		baseUrl: string,
		maxTokens: number = 4096,
		temperature: number = 0.7
	) {
		super(apiKey, model, maxTokens, temperature, baseUrl);
	}

	async chat(
		messages: Array<{ role: string; content: string }>,
		callbacks: StreamCallbacks
	): Promise<void> {
		let normalizedBaseUrl = '';
		try {
			// Validate baseUrl
			if (!this.baseUrl) {
				throw new Error('Base URL is required for OpenAI-compatible provider');
			}

			// Normalize baseUrl: trim and remove trailing slash
			normalizedBaseUrl = this.baseUrl.trim().replace(/\/$/, '');

			// Validate that baseUrl is a proper HTTP/HTTPS URL
			try {
				const url = new URL(normalizedBaseUrl);
				if (!['http:', 'https:'].includes(url.protocol)) {
					throw new Error(`Invalid protocol: ${url.protocol}. Base URL must use HTTP or HTTPS.`);
				}
				
				// Warn if baseUrl doesn't end with /v1
				if (!normalizedBaseUrl.endsWith('/v1')) {
					Logger.warn(`Base URL should typically end with /v1. Current: ${normalizedBaseUrl}`);
				}
			} catch {
				throw new Error(`Invalid base URL format: ${this.baseUrl}. Please provide a valid HTTP/HTTPS URL (e.g., http://88.218.77.120:8888/v1)`);
			}

			Logger.debug(`OpenAI-compatible provider - baseURL: ${normalizedBaseUrl}, model: ${this.model}`);

			const openaiCompatible = createOpenAI({
				apiKey: this.apiKey,
				baseURL: normalizedBaseUrl,
				compatibility: 'strict', // Ensure strict OpenAI compatibility
			});

			// Use .chat() to explicitly force /v1/chat/completions endpoint
			// This prevents the SDK from using special endpoints like /v1/responses for o1/o4 models
			const result = streamText({
				model: openaiCompatible.chat(this.model),
				messages: messages,
				maxTokens: this.maxTokens,
				temperature: this.temperature,
			});

			for await (const textPart of result.textStream) {
				if (callbacks.onText) {
					callbacks.onText(textPart);
				}
			}

			if (callbacks.onComplete) {
				callbacks.onComplete();
			}
		} catch (error: unknown) {
			Logger.error('OpenAI-compatible provider error:', error);
			
			// Provide more detailed error message
			let errorMessage = 'OpenAI-compatible API error';
			if (error instanceof Error) {
				if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED')) {
					errorMessage = `Cannot connect to ${normalizedBaseUrl}. Please check:\n` +
						`1. Server is running and accessible\n` +
						`2. URL is correct: ${normalizedBaseUrl}\n` +
						`3. No firewall/CORS blocking the request\n` +
						`4. Server accepts requests at /v1/chat/completions`;
				} else {
					errorMessage = `API Error: ${error.message}`;
				}
			}
			
			if (callbacks.onError) {
				callbacks.onError(new Error(errorMessage));
			}
		}
	}
}
