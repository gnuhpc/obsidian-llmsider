// Anthropic provider implementation

import { BaseLLMProvider, StreamCallbacks } from './base-provider';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { Logger } from '../utils/logger';

export class AnthropicProvider extends BaseLLMProvider {
	async chat(
		messages: Array<{ role: string; content: string }>,
		callbacks: StreamCallbacks
	): Promise<void> {
		try {
			const anthropic = createAnthropic({
				apiKey: this.apiKey
			});

			const result = streamText({
				model: anthropic(this.model),
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
			Logger.error('Anthropic provider error:', error);
			if (callbacks.onError) {
				callbacks.onError(this.handleError(error, 'Anthropic API error'));
			}
		}
	}
}
