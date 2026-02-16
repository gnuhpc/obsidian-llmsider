import OpenAI from 'openai';
import { requestUrl } from 'obsidian';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse, LLMProvider, ToolCall } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';
import { Logger } from '../utils/logger';
import { llmLogger } from '../utils/llm-logger';
import { TokenManager } from '../utils/token-manager';

type SiliconFlowProviderConfig = LLMProvider;

export class SiliconFlowProviderImpl extends BaseLLMProvider {
	private client?: OpenAI;
	private supportsVisionOverride?: boolean;

	constructor(config: SiliconFlowProviderConfig) {
		super(config);
		this.supportsVisionOverride = config.supportsVision;
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		const baseURL = this.buildBaseURL();
		this.client = new OpenAI({
			apiKey: this.apiKey,
			baseURL: baseURL || undefined,
			dangerouslyAllowBrowser: true,
			fetch: this.createCustomFetch()
		});
	}

	private createCustomFetch() {
		const originalFetch = global.fetch || fetch;

		return async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			const fetchInit = { ...init };

			const isStreaming = fetchInit.body?.toString().includes('"stream":true');
			const timeoutMs = isStreaming ? 120000 : 60000;

			fetchInit.headers = {
				...fetchInit.headers,
				'Connection': 'keep-alive',
				'Keep-Alive': 'timeout=120, max=100'
			};

			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				Logger.warn(`[SiliconFlow] Request timeout after ${timeoutMs}ms for ${url}`);
				controller.abort();
			}, timeoutMs);

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

				Logger.error('[SiliconFlow] Fetch error:', {
					url: url.toString(),
					error: error instanceof Error ? error.message : String(error),
					code: (error as { code?: string }).code,
					name: (error as { name?: string }).name
				});

				if ((error as { name?: string }).name === 'AbortError') {
					throw new Error(`Request timeout after ${timeoutMs}ms for ${url}`);
				}
				throw error;
			}
		};
	}

	private buildBaseURL(): string {
		if (!this.baseUrl) {
			return '';
		}

		let url = this.baseUrl.replace(/\/$/, '');

		if (url.includes('/chat/completions')) {
			url = url.replace(/\/chat\/completions$/, '');
		}

		if (!url.endsWith('/v1')) {
			url += '/v1';
		}

		return url;
	}

	protected getAISDKModel(): unknown {
		return undefined;
	}

	protected getEndpointForLogging(): string {
		return 'siliconflow-chat-completions';
	}

	getProviderName(): string {
		return 'siliconflow';
	}

	async sendMessage(
		messages: ChatMessage[],
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<LLMResponse> {
		if (!this.client) {
			throw new Error('SiliconFlow provider not properly initialized');
		}

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
			const formattedMessages = this.formatMessagesForOpenAI(messages, systemMessage);

			const aiSDKTools = tools && tools.length > 0
				? this.convertToolsToProviderFormat(tools)
				: undefined;

			const estimatedTokens = TokenManager.estimateTokensForMessages(messages) +
				TokenManager.estimateTokensForContext(systemMessage || '') +
				(tools ? TokenManager.estimateTokensForTools(tools) : 0);
			this.logEnhancedRequest(requestId, this.getEndpointForLogging(), messages, tools, systemMessage, false, estimatedTokens);

			const response = await this.client!.chat.completions.create({
				model: this.model,
				messages: formattedMessages,
				max_tokens: this.maxTokens,
				...(this.isReasoningModel() ? {} : { temperature: this.temperature }),
				...(aiSDKTools ? { tools: aiSDKTools } : {})
			});

			const choice = response.choices?.[0];
			const toolCalls = this.parseToolCalls(choice?.message?.tool_calls);

			const llmResponse: LLMResponse = {
				content: choice?.message?.content || '',
				model: this.model,
				usage: {
					promptTokens: response.usage?.prompt_tokens || 0,
					completionTokens: response.usage?.completion_tokens || 0,
					totalTokens: response.usage?.total_tokens || 0
				},
				finishReason: toolCalls.length > 0
					? 'tool_calls'
					: (choice?.finish_reason === 'length' ? 'length' : 'stop'),
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
		if (!this.client) {
			throw new Error('SiliconFlow provider not properly initialized');
		}

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
					message: `Token limit exceeded for model ${modelName}. Conversation history and context have been truncated to fit within limits.`
				}
			});
		}

		const requestId = llmLogger.generateRequestId();
		const estimatedTokens = TokenManager.estimateTokensForMessages(messages) +
			TokenManager.estimateTokensForContext(systemMessage || '') +
			(tools ? TokenManager.estimateTokensForTools(tools) : 0);
		this.logEnhancedRequest(requestId, this.getEndpointForLogging(), messages, tools, systemMessage, true, estimatedTokens);

		const formattedMessages = this.formatMessagesForOpenAI(messages, systemMessage);
		const providerTools = tools && tools.length > 0
			? this.convertToolsToProviderFormat(tools)
			: undefined;

		const toolCallsAccumulator: Map<number, { id?: string; type?: string; function?: { name?: string; arguments?: string } }> = new Map();

		const stream = await this.client.chat.completions.create({
			model: this.model,
			messages: formattedMessages,
			max_tokens: this.maxTokens,
			stream: true,
			...(this.isReasoningModel() ? {} : { temperature: this.temperature }),
			...(providerTools ? { tools: providerTools } : {}),
			...(abortSignal ? { signal: abortSignal } : {})
		});

		for await (const chunk of stream) {
			if (abortSignal?.aborted) {
				return;
			}

			const choice = chunk.choices?.[0];
			const delta = choice?.delta?.content || '';
			if (delta) {
				onChunk({ delta, isComplete: false });
			}

			if (choice?.delta?.tool_calls) {
				for (const toolCallDelta of choice.delta.tool_calls) {
					const index = toolCallDelta.index ?? 0;
					if (!toolCallsAccumulator.has(index)) {
						toolCallsAccumulator.set(index, {});
					}
					const tc = toolCallsAccumulator.get(index)!;
					if (toolCallDelta.id) tc.id = toolCallDelta.id;
					if (toolCallDelta.type) tc.type = toolCallDelta.type;
					if (toolCallDelta.function) {
						if (!tc.function) tc.function = {};
						if (toolCallDelta.function.name) {
							tc.function.name = toolCallDelta.function.name;
						}
						if (toolCallDelta.function.arguments) {
							tc.function.arguments = (tc.function.arguments || '') + toolCallDelta.function.arguments;
						}
					}
				}
			}

			if (choice?.finish_reason) {
				const toolCalls = Array.from(toolCallsAccumulator.values())
					.filter(tc => tc.function?.name && tc.function?.arguments)
					.map(tc => ({
						id: tc.id || `call_${Date.now()}`,
						type: 'function' as const,
						function: {
							name: tc.function!.name!,
							arguments: tc.function!.arguments!
						}
					}));

				if (toolCalls.length > 0) {
					onChunk({
						delta: '',
						isComplete: false,
						toolCalls
					});
				}

				onChunk({
					delta: '',
					isComplete: true
				});
			}
		}
	}

	supportsVision(): boolean {
		if (this.supportsVisionOverride !== undefined) {
			Logger.debug(`[SiliconFlow] Using user vision configuration for ${this.model}:`, this.supportsVisionOverride);
			return this.supportsVisionOverride;
		}

		Logger.debug(`[SiliconFlow] No vision configuration set for ${this.model}, defaulting to false`);
		return false;
	}

	async listModels(): Promise<string[]> {
		try {
			const baseURL = this.buildBaseURL();
			if (!baseURL) {
				Logger.warn('No baseUrl configured, cannot list models');
				return [];
			}

			const modelsUrl = `${baseURL}/models`;
			const response = await requestUrl({
				url: modelsUrl,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				}
			});

			if (response.status !== 200) {
				Logger.error('Error Response:', response.text);
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
			Logger.error('Error fetching models from API:', error);
			return [];
		}
	}

	private formatMessagesForOpenAI(messages: ChatMessage[], systemMessage?: string): Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> {
		const converted: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];

		if (systemMessage) {
			converted.push({ role: 'system', content: systemMessage });
		}

		for (const msg of messages) {
			let role = msg.role;
			if (role === 'tool') {
				role = 'user';
			}

			if (typeof msg.content === 'string') {
				converted.push({ role, content: msg.content });
				continue;
			}

			const hasImages = msg.content.some(item => item.type === 'image');
			if (hasImages && this.supportsVision()) {
				const contentParts = msg.content.map(contentItem => {
					if (contentItem.type === 'text') {
						return { type: 'text', text: contentItem.text };
					}
					if (contentItem.type === 'image') {
						return {
							type: 'image_url',
							image_url: {
								url: `data:${contentItem.source.media_type};base64,${contentItem.source.data}`
							}
						};
					}
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
		if (!toolCalls || toolCalls.length === 0) {
			return [];
		}
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
