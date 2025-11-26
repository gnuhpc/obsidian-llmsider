// OpenAI provider implementation

import { BaseLLMProvider, StreamCallbacks } from './base-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Logger } from '../utils/logger';

export class OpenAIProvider extends BaseLLMProvider {
	private organizationId?: string;

	constructor(
		apiKey: string,
		model: string,
		maxTokens: number = 4096,
		temperature: number = 0.7,
		organizationId?: string
	) {
		super(apiKey, model, maxTokens, temperature);
		this.organizationId = organizationId;
	}

	async chat(
		messages: Array<{ role: string; content: string }>,
		callbacks: StreamCallbacks
	): Promise<void> {
		try {
			const openai = createOpenAI({
				apiKey: this.apiKey,
				organization: this.organizationId
			});

			const result = streamText({
				model: openai(this.model),
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
			Logger.error('OpenAI provider error:', error);
			if (callbacks.onError) {
				callbacks.onError(this.handleError(error, 'OpenAI API error'));
			}
		}
	}
}
