// Base provider interface for lite version

import { Logger } from '../utils/logger';

export interface StreamCallbacks {
	onText?: (text: string) => void;
	onComplete?: () => void;
	onError?: (error: Error) => void;
}

export abstract class BaseLLMProvider {
	protected apiKey: string;
	protected model: string;
	protected maxTokens: number;
	protected temperature: number;
	protected baseUrl?: string;

	constructor(
		apiKey: string,
		model: string,
		maxTokens: number = 4096,
		temperature: number = 0.7,
		baseUrl?: string
	) {
		this.apiKey = apiKey;
		this.model = model;
		this.maxTokens = maxTokens;
		this.temperature = temperature;
		this.baseUrl = baseUrl;
	}

	abstract chat(
		messages: Array<{ role: string; content: string }>,
		callbacks: StreamCallbacks
	): Promise<void>;

	protected handleError(error: unknown, context: string): Error {
		Logger.error(`${context}:`, error);
		
		if (error instanceof Error) {
			return error;
		}
		
		return new Error(`${context}: ${String(error)}`);
	}
}
