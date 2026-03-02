import OpenAI from 'openai';
import { requestUrl } from 'obsidian';
import { obsidianFetch } from '../utils/obsidian-fetch';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse, ToolCall } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';
import { Logger } from '../utils/logger';
import { llmLogger } from '../utils/llm-logger';
import { TokenManager } from '../utils/token-manager';

type KimiProviderConfig = {
	apiKey: string;
	model: string;
	maxTokens: number;
	temperature?: number;
	baseUrl?: string;
	supportsVision?: boolean;
};

export class KimiProviderImpl extends BaseLLMProvider {
	private supportsVisionOverride?: boolean;

	constructor(config: KimiProviderConfig) {
		super(config);
		this.supportsVisionOverride = config.supportsVision;
	}

	protected initializeModelConfig(): void {
		// No OpenAI client needed - we use direct HTTP requests
	}

	protected getAISDKModel(): unknown {
		return this.model;
	}

	private buildBaseURL(): string {
		const base = this.baseUrl || 'https://api.moonshot.cn/v1';
		let url = base.replace(/\/$/, '');
		if (url.includes('/chat/completions')) url = url.replace(/\/chat\/completions$/, '');
		if (!url.endsWith('/v1')) url += '/v1';
		return url;
	}

	protected getEndpointForLogging(): string {
		return 'kimi-chat-completions';
	}

	getProviderName(): string {
		return 'kimi';
	}

	async sendMessage(messages: ChatMessage[], tools?: UnifiedTool[], systemMessage?: string): Promise<LLMResponse> {
		await this.checkRateLimit();

		const contextPrompt = systemMessage || '';
		const modelName = this.model;
		if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools, modelName)) {
			messages = TokenManager.truncateMessagesToFitTokens(messages, contextPrompt, tools, modelName);
			if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools, modelName)) {
				const effectiveLimit = TokenManager.getModelTokenLimit(modelName);
				const maxContextTokens = Math.floor(effectiveLimit * 0.3);
				systemMessage = TokenManager.truncateContextPrompt(contextPrompt, maxContextTokens);
			}
		}

		const requestId = llmLogger.generateRequestId();
		const startTime = Date.now();

		return this.retryWithBackoff(async () => {
			const formattedMessages = this.formatMessages(messages, systemMessage);
			const providerTools = tools && tools.length > 0 ? this.convertToolsToProviderFormat(tools) : undefined;
			const estimatedTokens = TokenManager.estimateTokensForMessages(messages) + TokenManager.estimateTokensForContext(systemMessage || '') + (tools ? TokenManager.estimateTokensForTools(tools) : 0);
			this.logEnhancedRequest(requestId, this.getEndpointForLogging(), messages, tools, systemMessage, false, estimatedTokens);

			const baseURL = this.buildBaseURL();
			const endpoint = `${baseURL}/chat/completions`;

			const requestBody: Record<string, unknown> = {
				model: this.model,
				messages: formattedMessages,
				max_tokens: this.maxTokens,
				stream: false,
			};
			if (!this.isReasoningModel()) {
				requestBody.temperature = this.temperature;
			}
			if (providerTools) {
				requestBody.tools = providerTools;
			}

			Logger.debug('[Kimi] sendMessage via requestUrl:', endpoint);

			const response = await requestUrl({
				url: endpoint,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey.trim()}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
				throw: false,
			});

			if (response.status < 200 || response.status >= 300) {
				Logger.error('[Kimi] sendMessage error response:', response.status, response.text);
				throw new Error(`Kimi API error: ${response.status} - ${response.text}`);
			}

			const data = response.json;
			const choice = data.choices?.[0];
			const toolCalls = this.parseToolCalls(choice?.message?.tool_calls);
			const llmResponse: LLMResponse = {
				content: choice?.message?.content || '',
				model: this.model,
				usage: {
					promptTokens: data.usage?.prompt_tokens || 0,
					completionTokens: data.usage?.completion_tokens || 0,
					totalTokens: data.usage?.total_tokens || 0
				},
				finishReason: toolCalls.length > 0 ? 'tool_calls' : (choice?.finish_reason === 'length' ? 'length' : 'stop'),
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
				isLoaded: true,
				providerStatuses: {}
			};

			this.logEnhancedResponse(requestId, llmResponse, Date.now() - startTime, false);
			return llmResponse;
		});
	}

	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		await this.checkRateLimit();

		const contextPrompt = systemMessage || '';
		const modelName = this.model;
		if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools, modelName)) {
			messages = TokenManager.truncateMessagesToFitTokens(messages, contextPrompt, tools, modelName);
			if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools, modelName)) {
				const effectiveLimit = TokenManager.getModelTokenLimit(modelName);
				const maxContextTokens = Math.floor(effectiveLimit * 0.3);
				systemMessage = TokenManager.truncateContextPrompt(contextPrompt, maxContextTokens);
			}
			onChunk({
				delta: '',
				isComplete: false,
				metadata: {
					warning: 'TOKEN_LIMIT_EXCEEDED',
					message: `Token limit exceeded for model ${modelName}.`
				}
			});
		}

		const requestId = llmLogger.generateRequestId();
		const estimatedTokens = TokenManager.estimateTokensForMessages(messages) + TokenManager.estimateTokensForContext(systemMessage || '') + (tools ? TokenManager.estimateTokensForTools(tools) : 0);
		this.logEnhancedRequest(requestId, this.getEndpointForLogging(), messages, tools, systemMessage, true, estimatedTokens);

		const formattedMessages = this.formatMessages(messages, systemMessage);
		const providerTools = tools && tools.length > 0 ? this.convertToolsToProviderFormat(tools) : undefined;

		const baseURL = this.buildBaseURL();
		const endpoint = `${baseURL}/chat/completions`;

		const requestBody: Record<string, unknown> = {
			model: this.model,
			messages: formattedMessages,
			max_tokens: this.maxTokens,
			stream: true,
		};
		if (!this.isReasoningModel()) {
			requestBody.temperature = this.temperature;
		}
		if (providerTools) {
			requestBody.tools = providerTools;
		}

		const bodyStr = JSON.stringify(requestBody);

		Logger.debug('[Kimi] sendStreamingMessage via obsidianFetch (Node.js https):', endpoint);

		const response = await obsidianFetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.apiKey.trim()}`,
				'Content-Type': 'application/json',
				'Accept': 'text/event-stream',
			},
			body: bodyStr,
			signal: abortSignal,
		});

		if (!response.ok) {
			const errText = await response.text();
			Logger.error('[Kimi] sendStreamingMessage error response:', response.status, errText);
			throw new Error(`Kimi API error: ${response.status} - ${errText}`);
		}

		if (!response.body) {
			throw new Error('[Kimi] No response body for streaming');
		}

		// Parse SSE stream manually
		const toolCallsAccumulator: Map<number, { id?: string; type?: string; function?: { name?: string; arguments?: string } }> = new Map();

		const reader = response.body.getReader();
		const decoder = new TextDecoder('utf-8');
		let buffer = '';

		try {
			while (true) {
				if (abortSignal?.aborted) break;

				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });

				// Process complete SSE lines from buffer
				const lines = buffer.split('\n');
				// Keep the last (potentially incomplete) line in buffer
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed || trimmed === '') continue;

					if (trimmed.startsWith('data: ')) {
						const dataStr = trimmed.slice(6).trim();
						if (dataStr === '[DONE]') {
							onChunk({ delta: '', isComplete: true });
							return;
						}

						try {
							const chunk = JSON.parse(dataStr);
							const choice = chunk.choices?.[0];
							if (!choice) continue;

							const delta = choice.delta?.content || '';
							if (delta) onChunk({ delta, isComplete: false });

							// Handle tool calls
							if (choice.delta?.tool_calls) {
								for (const toolCallDelta of choice.delta.tool_calls) {
									const index = toolCallDelta.index ?? 0;
									if (!toolCallsAccumulator.has(index)) toolCallsAccumulator.set(index, {});
									const tc = toolCallsAccumulator.get(index)!;
									if (toolCallDelta.id) tc.id = toolCallDelta.id;
									if (toolCallDelta.type) tc.type = toolCallDelta.type;
									if (toolCallDelta.function) {
										if (!tc.function) tc.function = {};
										if (toolCallDelta.function.name) tc.function.name = toolCallDelta.function.name;
										if (toolCallDelta.function.arguments) tc.function.arguments = (tc.function.arguments || '') + toolCallDelta.function.arguments;
									}
								}
							}

							// Handle finish
							if (choice.finish_reason) {
								const toolCalls = Array.from(toolCallsAccumulator.values())
									.filter(tc => tc.function?.name && tc.function?.arguments)
									.map(tc => ({ id: tc.id || `call_${Date.now()}`, type: 'function' as const, function: { name: tc.function!.name!, arguments: tc.function!.arguments! } }));
								if (toolCalls.length > 0) onChunk({ delta: '', isComplete: false, toolCalls });
								onChunk({ delta: '', isComplete: true });
								return;
							}
						} catch (parseErr) {
							Logger.warn('[Kimi] Failed to parse SSE chunk:', dataStr, parseErr);
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		// Ensure we always send isComplete
		onChunk({ delta: '', isComplete: true });
	}

	supportsVision(): boolean {
		if (this.supportsVisionOverride !== undefined) {
			Logger.debug(`[Kimi] Using user vision configuration for ${this.model}:`, this.supportsVisionOverride);
			return this.supportsVisionOverride;
		}
		Logger.debug(`[Kimi] No vision configuration set for ${this.model}, defaulting to false`);
		return false;
	}

	async listModels(): Promise<string[]> {
		try {
			const baseURL = this.buildBaseURL();
			if (!baseURL) {
				Logger.warn('[Kimi] No baseUrl configured, cannot list models');
				return [];
			}
			const modelsUrl = `${baseURL}/models`;
			const response = await requestUrl({
				url: modelsUrl,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.apiKey.trim()}`,
					'Content-Type': 'application/json'
				}
			});
			if (response.status !== 200) {
				Logger.error('[Kimi] Error Response:', response.text);
				throw new Error(`Failed to list models: ${response.status}`);
			}
			const data = response.json;
			if (data.data && Array.isArray(data.data)) {
				return data.data
					.map((model: { id?: string; model_name?: string; name?: string }) => model.id || model.model_name || model.name)
					.filter((id: string) => id)
					.sort();
			}
			if (Array.isArray(data)) {
				return data
					.map((model: { id?: string; model_name?: string; name?: string }) => model.id || model.model_name || model.name)
					.filter((id: string) => id)
					.sort();
			}
			return [];
		} catch (error) {
			Logger.error('[Kimi] Error fetching models from API:', error);
			return [];
		}
	}

	private formatMessages(messages: ChatMessage[], systemMessage?: string): Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> {
		const converted: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];
		if (systemMessage) converted.push({ role: 'system', content: systemMessage });
		for (const msg of messages) {
			let role = msg.role;
			if (role === 'tool') role = 'user';
			if (typeof msg.content === 'string') { converted.push({ role, content: msg.content }); continue; }
			const hasImages = msg.content.some(item => item.type === 'image');
			if (hasImages && this.supportsVision() && role === 'user') {
				const contentParts = msg.content.map(contentItem => {
					if (contentItem.type === 'text') return { type: 'text', text: contentItem.text };
					if (contentItem.type === 'image') return { type: 'image_url', image_url: { url: `data:${contentItem.source.media_type};base64,${contentItem.source.data}` } };
					return { type: 'text', text: '' };
				});
				converted.push({ role, content: contentParts });
			} else {
				const textContent = this.extractTextFromContent(msg.content);
				converted.push({ role, content: textContent });
			}
		}
		return converted;
	}

	private parseToolCalls(toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> | undefined): ToolCall[] {
		if (!toolCalls || toolCalls.length === 0) return [];
		return toolCalls.map(tc => ({
			id: tc.id,
			type: 'function',
			function: {
				name: tc.function.name,
				arguments: tc.function.arguments
			}
		}));
	}
}
