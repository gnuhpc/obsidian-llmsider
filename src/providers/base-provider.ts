import { ChatMessage, LLMResponse, StreamingResponse, LLMError, ToolCall, MessageContent, TextContent } from '../types';
import { Logger } from './../utils/logger';
import { llmLogger, LLMRequestLog, LLMResponseLog } from '../utils/llm-logger';
import { TokenManager } from '../utils/token-manager';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';
import { UnifiedToolManager, UnifiedTool } from '../tools/unified-tool-manager';

export abstract class BaseLLMProvider {
	protected apiKey: string;
	protected model: string;
	protected maxTokens: number;
	protected temperature: number;
	protected baseUrl?: string;
	protected model_config: any;
	protected toolManager?: UnifiedToolManager;

	constructor(config: {
		apiKey?: string; // Optional for local providers
		model: string;
		maxTokens: number;
		temperature?: number;
		baseUrl?: string;
		toolManager?: UnifiedToolManager;
	}) {
		this.apiKey = config.apiKey || ''; // Default to empty string for local providers
		this.model = config.model;
		this.maxTokens = config.maxTokens;
		this.temperature = config.temperature || 0.7;
		this.baseUrl = config.baseUrl;
		this.toolManager = config.toolManager;
	}

	// Abstract methods that must be implemented by concrete providers
	abstract sendMessage(messages: ChatMessage[], tools?: UnifiedTool[], systemMessage?: string): Promise<LLMResponse>;
	abstract sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void>;
	abstract getProviderName(): string;

	// Vision support method - should be implemented by concrete providers
	abstract supportsVision(): boolean;

	// List available models from the provider
	abstract listModels(): Promise<string[]>;

	// Provider-specific model config initialization
	protected abstract initializeModelConfig(): void;

	/**
	 * Check if the current model is a reasoning model that doesn't support temperature
	 * Reasoning models include: o1, o3, gpt-5 series, etc.
	 */
	protected isReasoningModel(): boolean {
		const modelLower = this.model.toLowerCase();
		return modelLower.includes('o1-') || 
		       modelLower.includes('o3-') || 
		       modelLower.includes('gpt-5');
	}

	// Common AI SDK implementation methods
	protected async sendMessageWithAISDK(
		messages: ChatMessage[],
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<LLMResponse> {
		await this.checkRateLimit();

		// Check and handle token limits
		const contextPrompt = systemMessage || '';
		if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools)) {
			// Truncate messages to fit within limits
			messages = TokenManager.truncateMessagesToFitTokens(messages, contextPrompt, tools);

			// If still too large, truncate the system message
			if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools)) {
				const maxContextTokens = Math.floor(TokenManager.MAX_CONTEXT_TOKENS * 0.3); // Max 30% for context
				systemMessage = TokenManager.truncateContextPrompt(contextPrompt, maxContextTokens);
			}
		}

		const requestId = llmLogger.generateRequestId();
		const startTime = Date.now();

		return this.retryWithBackoff(async () => {
			const formattedMessages = this.formatMessagesForAISDK(messages);

			// Log token usage
			const estimatedTokens = TokenManager.estimateTokensForMessages(messages) +
				TokenManager.estimateTokensForContext(systemMessage || '') +
				(tools ? TokenManager.estimateTokensForTools(tools) : 0);

			// Enhanced logging - log the complete request
			this.logEnhancedRequest(requestId, this.getEndpointForLogging(), messages, tools, systemMessage, false, estimatedTokens);

			const aiSDKConfig: any = {
				model: this.getAISDKModel(),
				messages: formattedMessages,
				tools: tools && tools.length > 0 ? this.convertToolsToAISDKFormat(tools) : undefined,
			};

			// Only add temperature for non-reasoning models
			// Reasoning models (o1, o3, gpt-5, etc.) don't support temperature
			if (!this.isReasoningModel()) {
				aiSDKConfig.temperature = this.temperature;
			}

			if (systemMessage) {
				aiSDKConfig.system = systemMessage;
			}

			const result = await generateText(aiSDKConfig);
			const llmResponse = this.formatAISDKResponse(result);

			// Enhanced logging - log the complete response
			this.logEnhancedResponse(requestId, llmResponse, Date.now() - startTime, false);

			return llmResponse;
		});
	}

	protected async sendStreamingMessageWithAISDK(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		await this.checkRateLimit();

		// Check and handle token limits
		const contextPrompt = systemMessage || '';
		if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools)) {
			// Truncate messages to fit within limits
			messages = TokenManager.truncateMessagesToFitTokens(messages, contextPrompt, tools);

			// If still too large, truncate the system message
			if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools)) {
				const maxContextTokens = Math.floor(TokenManager.MAX_CONTEXT_TOKENS * 0.3); // Max 30% for context
				systemMessage = TokenManager.truncateContextPrompt(contextPrompt, maxContextTokens);
			}

			// Send a warning chunk with metadata instead of content
			onChunk({
				delta: '',
				isComplete: false,
				metadata: {
					warning: 'TOKEN_LIMIT_EXCEEDED',
					message: 'Token limit exceeded - conversation history and context have been truncated to fit within limits.'
				}
			});
		}

		const requestId = llmLogger.generateRequestId();

		return this.retryWithBackoff(async () => {
			const formattedMessages = this.formatMessagesForAISDK(messages);

			// Log token usage
			const estimatedTokens = TokenManager.estimateTokensForMessages(messages) +
				TokenManager.estimateTokensForContext(systemMessage || '') +
				(tools ? TokenManager.estimateTokensForTools(tools) : 0);

			// Enhanced logging - log the complete streaming request
			this.logEnhancedRequest(requestId, this.getEndpointForLogging(), messages, tools, systemMessage, true, estimatedTokens);

			// Start streaming log
			this.startStreamingLog(requestId);

			const convertedTools = tools && tools.length > 0 ? this.convertToolsToAISDKFormat(tools) : undefined;

			const aiSDKConfig: any = {
				model: this.getAISDKModel(),
				messages: formattedMessages,
				tools: convertedTools,
				abortSignal,
			};

			// Only add temperature for non-reasoning models
			if (!this.isReasoningModel()) {
				aiSDKConfig.temperature = this.temperature;
			}

			if (systemMessage) {
				aiSDKConfig.system = systemMessage;
			}

			const result = await streamText(aiSDKConfig);

			let totalTokens = 0;
			let streamedContent = '';
			const streamStartTime = Date.now();
			const collectedToolCalls: any[] = [];

			try {
				// Use fullStream to capture both text and tool calls
				let chunkCount = 0;
				for await (const part of result.fullStream) {
					chunkCount++;
					
					// Check for abort signal
					if (abortSignal?.aborted) {
						this.cleanupStreamingLog(requestId);
						return;
					}

					// Handle text deltas
					if (part.type === 'text-delta') {
						const textDelta = part.text;
						const chunk = {
							delta: textDelta,
							isComplete: false
						};
						onChunk(chunk);
						this.addStreamingChunk(requestId, chunk);
						totalTokens += 1; // Rough estimation
						streamedContent += textDelta;
					}
					
					// Handle tool calls
					if (part.type === 'tool-call') {
						const toolInput = (part as any).input || (part as any).args || {};
						const toolCall = {
							id: part.toolCallId,
							type: 'function',
							function: {
								name: part.toolName,
								arguments: JSON.stringify(toolInput)
							}
						};
						collectedToolCalls.push(toolCall);
					}
				}

				// Send final chunk with tool calls if any
				const finalChunk: any = {
					delta: '',
					isComplete: true,
					usage: { totalTokens, promptTokens: estimatedTokens, completionTokens: totalTokens }
				};
				
				if (collectedToolCalls.length > 0) {
					finalChunk.toolCalls = collectedToolCalls;
				}
				
				onChunk(finalChunk);
				this.addStreamingChunk(requestId, finalChunk);

			} catch (error) {
				Logger.error(`Stream error:`, error);
				this.cleanupStreamingLog(requestId);
				throw error;
			}
		});
	}

	// Abstract methods for provider-specific AI SDK configuration
	protected abstract getAISDKModel(): any;
	protected abstract getEndpointForLogging(): string;

	// Common AI SDK helper methods
	protected formatMessagesForAISDK(messages: ChatMessage[]): any[] {
		return messages.map(msg => {
			// Handle both string and multimodal content
			if (typeof msg.content === 'string') {
				return {
					role: msg.role,
					content: msg.content
				};
			} else {
				// Multimodal content - AI SDK supports this for vision models
				const hasImages = msg.content.some(item => item.type === 'image');

				if (hasImages && this.supportsVision()) {
					// Format for AI SDK vision models
					return {
						role: msg.role,
						content: msg.content.map(contentItem => {
							if (contentItem.type === 'text') {
								return {
									type: 'text',
									text: contentItem.text
								};
							} else if (contentItem.type === 'image') {
								return {
									type: 'image',
									image: `data:${contentItem.source.media_type};base64,${contentItem.source.data}`
								};
							}
							return contentItem;
						})
					};
				} else {
					// Fall back to text-only for non-vision models
					const textContent = this.extractTextFromContent(msg.content);
					return {
						role: msg.role,
						content: textContent
					};
				}
			}
		});
	}

	protected convertToolsToAISDKFormat(tools: UnifiedTool[]): any {
		// Use AI SDK's correct tool format with inputSchema
		const aiSDKTools: Record<string, any> = {};

		for (const unifiedTool of tools) {
			try {
				// Convert JSON schema properties to Zod schema dynamically
				const zodSchema = this.convertJSONSchemaToZod(unifiedTool.inputSchema, unifiedTool.name);

				aiSDKTools[unifiedTool.name] = {
					description: unifiedTool.description,
					inputSchema: zodSchema
				};
			} catch (error) {
				Logger.error(`Failed to create AI SDK tool: ${unifiedTool.name}:`, error);
			}
		}

		return aiSDKTools;
	}

	private convertJSONSchemaToZod(jsonSchema: any, toolName: string): any {
		try {
			// Create a basic Zod object from JSON schema properties
			const zodProperties: Record<string, any> = {};

			if (jsonSchema.properties) {
				for (const [propName, propSchema] of Object.entries(jsonSchema.properties)) {
					const prop = propSchema as any;

					let zodProp: any;

					switch (prop.type) {
						case 'string':
							if (prop.enum) {
								zodProp = z.enum(prop.enum as [string, ...string[]]);
							} else {
								zodProp = z.string();
							}
							break;
						case 'number':
							zodProp = z.number();
							break;
						case 'boolean':
							zodProp = z.boolean();
							break;
						case 'array':
							// Handle array items properly
							if (prop.items) {
								if (prop.items.type === 'number') {
									zodProp = z.array(z.number());
								} else if (prop.items.type === 'string') {
									zodProp = z.array(z.string());
								} else if (prop.items.type === 'boolean') {
									zodProp = z.array(z.boolean());
								} else {
									zodProp = z.array(z.any());
								}
							} else {
								zodProp = z.array(z.any());
							}

							// Handle minItems and maxItems if present
							if (prop.minItems !== undefined) {
								zodProp = zodProp.min(prop.minItems);
							}
							if (prop.maxItems !== undefined) {
								zodProp = zodProp.max(prop.maxItems);
							}
							break;
						case 'object':
							zodProp = z.object({});
							break;
						default:
							zodProp = z.any();
					}

					// Add description if available
					if (prop.description) {
						zodProp = zodProp.describe(prop.description);
					}

					// Make optional if not in required array
					if (!jsonSchema.required || !jsonSchema.required.includes(propName)) {
						zodProp = zodProp.optional();
					}

					zodProperties[propName] = zodProp;
				}
			}

			return z.object(zodProperties);
		} catch (error) {
			Logger.warn(`Failed to convert schema for ${toolName}, using fallback:`, error);
			// Fallback to a simple schema
			return z.object({});
		}
	}

	protected formatAISDKResponse(result: any): LLMResponse {
		// Extract tool calls if any
		const toolCalls = result.toolCalls ? result.toolCalls.map((call: any) => ({
			id: call.toolCallId,
			type: 'function',
			function: {
				name: call.toolName,
				arguments: JSON.stringify(call.args)
			}
		})) : [];

		return {
			content: result.text || '',
			model: this.model,
			usage: {
				promptTokens: result.usage?.promptTokens || 0,
				completionTokens: result.usage?.completionTokens || 0,
				totalTokens: result.usage?.totalTokens || 0
			},
			finishReason: toolCalls.length > 0 ? 'tool_calls' : (result.finishReason === 'length' ? 'length' : 'stop'),
			toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			metadata: {
				provider: this.getProviderName(),
				rawResponse: result
			}
		};
	}

	protected extractTextFromContent(content: MessageContent[]): string {
		return content
			.filter(item => item.type === 'text')
			.map(item => (item as TextContent).text)
			.join('\n');
	}

	// Convert tools to provider-specific format
	protected convertToolsToProviderFormat(tools: UnifiedTool[]): any[] {
		if (!this.toolManager) {
			Logger.warn('No tool manager available for provider format conversion');
			return [];
		}
		
		return this.toolManager.convertToProviderFormat(tools);
	}

	// Parse tool calls from provider response - should be overridden by providers
	protected parseToolCallsFromResponse(responseData: any): ToolCall[] {
		const toolCalls: ToolCall[] = [];

		// Default OpenAI-compatible format
		if (responseData.choices && responseData.choices[0]?.message?.tool_calls) {
			responseData.choices[0].message.tool_calls.forEach((toolCall: any) => {
				if (toolCall.type === 'function') {
					toolCalls.push({
						id: toolCall.id,
						type: 'function',
						function: {
							name: toolCall.function.name,
							arguments: toolCall.function.arguments
						}
					});
				}
			});
		}

		return toolCalls;
	}

	// Determine if response indicates tool calls were made
	protected hasToolCalls(responseData: any): boolean {
		// Default implementation - check for tool calls in various common formats
		if (responseData.choices && responseData.choices[0]?.message?.tool_calls) {
			return responseData.choices[0].message.tool_calls.length > 0;
		}

		// Anthropic format
		if (responseData.content && Array.isArray(responseData.content)) {
			return responseData.content.some((item: any) => item.type === 'tool_use');
		}

		return false;
	}

	// Get finish reason when tool calls are present
	protected getToolCallFinishReason(responseData: any): LLMResponse['finishReason'] {
		// Check if the response finished due to tool calls
		if (this.hasToolCalls(responseData)) {
			return 'tool_calls';
		}

		// Default OpenAI format
		if (responseData.choices && responseData.choices[0]?.finish_reason === 'tool_calls') {
			return 'tool_calls';
		}

		// Anthropic format
		if (responseData.stop_reason === 'tool_use') {
			return 'tool_calls';
		}

		return 'stop';
	}

	// Optional method for code completion (can be overridden for optimized completion)
	async getCompletion(prompt: string): Promise<string> {
		const messages: ChatMessage[] = [
			{
				id: Date.now().toString(),
				role: 'user',
				content: prompt,
				timestamp: Date.now()
			}
		];

		const response = await this.sendMessage(messages);
		return response.content;
	}

	// Common utility methods
	protected async sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	protected isRetryableError(error: any): boolean {
		Logger.debug('Checking if error is retryable:', {
			errorType: typeof error,
			message: error?.message,
			code: error?.code,
			status: error?.status
		});
		
		// Common retryable HTTP status codes
		const retryableStatusCodes = [429, 502, 503, 504];

		if (error.status && retryableStatusCodes.includes(error.status)) {
			Logger.debug('Error is retryable (status code):', error.status);
			return true;
		}

		// Token limit errors are not retryable without reducing content
		if (this.isTokenLimitError(error)) {
			Logger.debug('Error is NOT retryable (token limit)');
			return false;
		}

		// Check for "Failed to fetch" errors - these should fail immediately
		const errorMessage = (error.message || '').toLowerCase();
		if (errorMessage.includes('failed to fetch') || 
		    errorMessage.includes('fetch failed') ||
		    errorMessage.includes('networkerror')) {
			Logger.debug('Error is NOT retryable (failed to fetch)');
			return false;
		}

		// Network errors with specific codes are typically retryable
		if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
			Logger.debug('Error is retryable (network code):', error.code);
			return true;
		}

		Logger.debug('Error is NOT retryable (default)');
		return false;
	}

	/**
	 * Check if error is related to token limits
	 */
	protected isTokenLimitError(error: any): boolean {
		if (!error) return false;

		const errorMessage = (error.message || '').toLowerCase();
		const errorCode = (error.code || '').toLowerCase();
		const responseMessage = error.response?.data?.error?.message?.toLowerCase() || '';

		const tokenLimitPatterns = [
			'token',
			'context length',
			'max_tokens',
			'maximum context',
			'prompt token count',
			'exceeds the limit',
			'too long',
			'context_length_exceeded',
			'model_max_prompt_tokens_exceeded'
		];

		return tokenLimitPatterns.some(pattern =>
			errorMessage.includes(pattern) ||
			errorCode.includes(pattern) ||
			responseMessage.includes(pattern)
		);
	}

	protected formatError(error: any): LLMError {
		const timestamp = Date.now();

		// Handle token limit errors with helpful messages
		if (this.isTokenLimitError(error)) {
			const originalMessage = error.response?.data?.error?.message || error.message || 'Token limit exceeded';

			return {
				code: 'TOKEN_LIMIT_EXCEEDED',
				message: `Token limit exceeded. ${originalMessage}\n\nThis usually happens when:\n- Your conversation history is too long\n- You've included too much context (files, notes)\n- The combined input exceeds the model's limits\n\nTip: Try starting a new chat or reducing the amount of context.`,
				provider: this.getProviderName(),
				details: error.response?.data || error,
				retryable: false,
				timestamp
			};
		}

		// Handle different error types
		if (error.response) {
			// HTTP error with response
			return {
				code: `HTTP_${error.response.status}`,
				message: error.response.data?.error?.message || error.message,
				provider: this.getProviderName(),
				details: error.response.data,
				retryable: this.isRetryableError(error),
				timestamp
			};
		} else if (error.request) {
			// Network error
			return {
				code: 'NETWORK_ERROR',
				message: 'Network request failed',
				provider: this.getProviderName(),
				details: { code: error.code, message: error.message },
				retryable: true,
				timestamp
			};
		} else {
			// Other error
			return {
				code: 'UNKNOWN_ERROR',
				message: error.message || 'Unknown error occurred',
				provider: this.getProviderName(),
				details: error,
				retryable: false,
				timestamp
			};
		}
	}

	protected async retryWithBackoff<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		baseDelay: number = 1000
	): Promise<T> {
		let lastError: any;

		Logger.debug('Starting operation with retry (maxRetries:', maxRetries, ')');
		
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				Logger.debug('Attempt', attempt + 1, 'of', maxRetries + 1);
				return await operation();
			} catch (error) {
				lastError = error;
				Logger.debug('Attempt', attempt + 1, 'failed:', error instanceof Error ? error.message : String(error));
				
				// Don't retry on last attempt or non-retryable errors
				if (attempt === maxRetries || !this.isRetryableError(error)) {
					Logger.debug('No more retries. Throwing error.');
					throw this.formatError(error);
				}

				// Exponential backoff with jitter
				const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
				Logger.debug('Retrying in', Math.round(delay), 'ms...');
				await this.sleep(delay);
			}
		}

		Logger.debug('All attempts exhausted. Throwing last error.');
		throw this.formatError(lastError);
	}

	protected formatMessagesForProvider(messages: ChatMessage[]): any[] {
		// Default implementation - can be overridden by specific providers
		return messages.map(msg => ({
			role: msg.role,
			content: msg.content
		}));
	}

	protected calculateTokenUsage(prompt: string, completion: string): {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	} {
		// Rough token estimation (actual providers should override this)
		const promptTokens = Math.ceil(prompt.length / 4);
		const completionTokens = Math.ceil(completion.length / 4);
		
		return {
			promptTokens,
			completionTokens,
			totalTokens: promptTokens + completionTokens
		};
	}

	// Rate limiting placeholder - will be implemented in utils
	protected async checkRateLimit(): Promise<void> {
		// This will be implemented with the rate limiter utility
		// For now, just a placeholder
	}

	// Update configuration
	updateConfig(config: Partial<{
		apiKey: string;
		model: string;
		maxTokens: number;
		temperature: number;
		baseUrl: string;
		toolManager: UnifiedToolManager;
	}>): void {
		if (config.apiKey !== undefined) this.apiKey = config.apiKey;
		if (config.model !== undefined) this.model = config.model;
		if (config.maxTokens !== undefined) this.maxTokens = config.maxTokens;
		if (config.temperature !== undefined) this.temperature = config.temperature;
		if (config.baseUrl !== undefined) this.baseUrl = config.baseUrl;
		if (config.toolManager !== undefined) this.toolManager = config.toolManager;
	}

	// Logging helper methods
	protected logRequest(
		requestId: string,
		endpoint: string,
		messages: ChatMessage[],
		tools?: UnifiedTool[],
		systemMessage?: string,
		isStreaming = false
	): void {
		const requestLog: LLMRequestLog = {
			requestId,
			timestamp: Date.now(),
			provider: this.getProviderName(),
			model: this.model,
			endpoint,
			requestData: {
				messages,
				maxTokens: this.maxTokens,
				temperature: this.temperature,
				stream: isStreaming,
				tools,
				systemMessage
			}
		};

		llmLogger.logRequest(requestLog);
	}

	protected logResponse(
		requestId: string,
		response: LLMResponse,
		duration: number,
		isStreaming = false
	): void {
		const responseLog: LLMResponseLog = {
			requestId,
			timestamp: Date.now(),
			provider: this.getProviderName(),
			model: response.model,
			responseData: {
				content: response.content,
				usage: response.usage,
				finishReason: response.finishReason,
				toolCalls: response.toolCalls,
				metadata: response.metadata
			},
			duration,
			isStreaming
		};

		llmLogger.logResponse(responseLog);
	}

	// Enhanced logging methods
	protected logEnhancedRequest(
		requestId: string,
		endpoint: string,
		messages: ChatMessage[],
		tools?: UnifiedTool[],
		systemMessage?: string,
		isStreaming = false,
		estimatedTokens?: number
	): void {
		const requestLog: LLMRequestLog = {
			requestId,
			timestamp: Date.now(),
			provider: this.getProviderName(),
			model: this.model,
			endpoint,
			requestData: {
				messages,
				maxTokens: this.maxTokens,
				temperature: this.temperature,
				stream: isStreaming,
				tools,
				systemMessage
			}
		};

		llmLogger.logRequest(requestLog);
	}

	protected logEnhancedResponse(
		requestId: string,
		response: LLMResponse,
		duration: number,
		isStreaming = false
	): void {
		const responseLog: LLMResponseLog = {
			requestId,
			timestamp: Date.now(),
			provider: this.getProviderName(),
			model: response.model,
			responseData: {
				content: response.content,
				usage: response.usage,
				finishReason: response.finishReason,
				toolCalls: response.toolCalls,
				metadata: response.metadata
			},
			duration,
			isStreaming
		};

		llmLogger.logResponse(responseLog);
	}

	protected startStreamingLog(requestId: string): void {
		llmLogger.startStreamingResponse(requestId, this.getProviderName(), this.model);
	}

	protected addStreamingChunk(requestId: string, chunk: StreamingResponse): void {
		llmLogger.addStreamingChunk(requestId, chunk);
	}

	protected cleanupStreamingLog(requestId: string): void {
		llmLogger.cleanupStreamingBuffer(requestId);
	}
}