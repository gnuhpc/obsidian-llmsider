import { ChatMessage, LLMResponse, StreamingResponse, LLMError, ToolCall, MessageContent, TextContent } from '../types';
import { Logger } from './../utils/logger';
import { llmLogger, LLMRequestLog, LLMResponseLog } from '../utils/llm-logger';
import { TokenManager } from '../utils/token-manager';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';
import { UnifiedToolManager, UnifiedTool } from '../tools/unified-tool-manager';

import { MemoryManager } from '../core/agent/memory-manager';

export abstract class BaseLLMProvider {
	protected apiKey: string;
	protected model: string;
	protected maxTokens: number;
	protected temperature: number;
	protected baseUrl?: string;
	protected model_config: unknown;
	protected toolManager?: UnifiedToolManager;
	protected memoryManager?: MemoryManager;
	protected currentThreadId?: string;

	// Proxy configuration
	protected proxyEnabled?: boolean;
	protected proxyType?: 'socks5' | 'http' | 'https';
	protected proxyHost?: string;
	protected proxyPort?: number;
	protected proxyAuth?: boolean;
	protected proxyUsername?: string;
	protected proxyPassword?: string;

	constructor(config: {
		apiKey?: string; // Optional for local providers
		model: string;
		maxTokens: number;
		temperature?: number;
		baseUrl?: string;
		toolManager?: UnifiedToolManager;
		memoryManager?: MemoryManager;
		threadId?: string;
		proxyEnabled?: boolean;
		proxyType?: 'socks5' | 'http' | 'https';
		proxyHost?: string;
		proxyPort?: number;
		proxyAuth?: boolean;
		proxyUsername?: string;
		proxyPassword?: string;
	}) {
		this.apiKey = config.apiKey || ''; // Default to empty string for local providers
		this.model = config.model;
		this.maxTokens = config.maxTokens;
		this.temperature = config.temperature || 0.7;
		this.baseUrl = config.baseUrl;
		this.toolManager = config.toolManager;
		this.memoryManager = config.memoryManager;
		this.currentThreadId = config.threadId;
		this.proxyEnabled = config.proxyEnabled;
		this.proxyType = config.proxyType;
		this.proxyHost = config.proxyHost;
		this.proxyPort = config.proxyPort;
		this.proxyAuth = config.proxyAuth;
		this.proxyUsername = config.proxyUsername;
		this.proxyPassword = config.proxyPassword;
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

	// Get current model name
	public getModelName(): string {
		return this.model;
	}

	/**
	 * Set the current thread ID for session management
	 */
	public setThreadId(threadId: string | undefined): void {
		this.currentThreadId = threadId;
	}

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
		const modelName = this.model; // Use the model name for limit checking
		if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools, modelName)) {
			// Truncate messages to fit within limits
			messages = TokenManager.truncateMessagesToFitTokens(messages, contextPrompt, tools, modelName);

			// If still too large, truncate the system message
			if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools, modelName)) {
				const effectiveLimit = TokenManager.getModelTokenLimit(modelName);
				const maxContextTokens = Math.floor(effectiveLimit * 0.3); // Max 30% for context
				systemMessage = TokenManager.truncateContextPrompt(contextPrompt, maxContextTokens);
			}
		}

		const requestId = llmLogger.generateRequestId();
		const startTime = Date.now();

		// Save user message to conversation history (before sending to LLM)
		if (this.memoryManager && this.currentThreadId) {
			try {
				const userMessage = messages[messages.length - 1];
				if (userMessage && userMessage.role === 'user') {
					await this.memoryManager.addConversationMessage({
						role: 'user',
						content: typeof userMessage.content === 'string'
							? userMessage.content
							: JSON.stringify(userMessage.content)
					}, this.currentThreadId);
					Logger.debug('[BaseLLMProvider] Saved user message to conversation history');
				}
			} catch (error) {
				Logger.warn('[BaseLLMProvider] Failed to save user message to history:', error);
				// Don't fail the request if history save fails
			}
		}

		return this.retryWithBackoff(async () => {
			const formattedMessages = this.formatMessagesForAISDK(messages);

			// Log token usage
			const estimatedTokens = TokenManager.estimateTokensForMessages(messages) +
				TokenManager.estimateTokensForContext(systemMessage || '') +
				(tools ? TokenManager.estimateTokensForTools(tools) : 0);

			// Enhanced logging - log the complete request
			this.logEnhancedRequest(requestId, this.getEndpointForLogging(), messages, tools, systemMessage, false, estimatedTokens);

			const aiSDKConfig: unknown = {
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

			// Save assistant response to conversation history (after receiving from LLM)
			if (this.memoryManager && this.currentThreadId) {
				try {
					await this.memoryManager.addConversationMessage({
						role: 'assistant',
						content: llmResponse.content,
						toolCalls: llmResponse.toolCalls
					}, this.currentThreadId);
					Logger.debug('[BaseLLMProvider] Saved assistant response to conversation history');
				} catch (error) {
					Logger.warn('[BaseLLMProvider] Failed to save assistant response to history:', error);
					// Don't fail the request if history save fails
				}
			}

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
		const modelName = this.model; // Use the model name for limit checking
		if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools, modelName)) {
			// Truncate messages to fit within limits
			messages = TokenManager.truncateMessagesToFitTokens(messages, contextPrompt, tools, modelName);

			// If still too large, truncate the system message
			if (TokenManager.isTokenLimitExceeded(messages, contextPrompt, tools, modelName)) {
				const effectiveLimit = TokenManager.getModelTokenLimit(modelName);
				const maxContextTokens = Math.floor(effectiveLimit * 0.3); // Max 30% for context
				systemMessage = TokenManager.truncateContextPrompt(contextPrompt, maxContextTokens);
			}

			// Send a warning chunk with metadata instead of content
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

		// Save user message to conversation history (before streaming starts)
		if (this.memoryManager && this.currentThreadId) {
			try {
				const userMessage = messages[messages.length - 1];
				if (userMessage && userMessage.role === 'user') {
					await this.memoryManager.addConversationMessage({
						role: 'user',
						content: typeof userMessage.content === 'string'
							? userMessage.content
							: JSON.stringify(userMessage.content)
					}, this.currentThreadId);
					Logger.debug('[BaseLLMProvider] Saved user message to conversation history (streaming)');
				}
			} catch (error) {
				Logger.warn('[BaseLLMProvider] Failed to save user message to history (streaming):', error);
				// Don't fail the request if history save fails
			}
		}

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

			// Limit tools count for certain providers (e.g., Groq has 128 tool limit)
			const MAX_TOOLS = 128;
			let limitedTools = tools;
			if (tools && tools.length > MAX_TOOLS) {
				Logger.warn(`Tool count (${tools.length}) exceeds maximum (${MAX_TOOLS}). Truncating to first ${MAX_TOOLS} tools.`);
				limitedTools = tools.slice(0, MAX_TOOLS);
				
				// Send warning chunk
				onChunk({
					delta: '',
					isComplete: false,
					metadata: {
						warning: 'TOOLS_TRUNCATED',
						message: `⚠️ 工具数量过多 (${tools.length}/${MAX_TOOLS})，已自动限制为 ${MAX_TOOLS} 个工具。建议在设置中禁用部分 MCP 工具以提高性能。`
					}
				});
			}
			
			const convertedTools = limitedTools && limitedTools.length > 0 ? this.convertToolsToAISDKFormat(limitedTools) : undefined;

			// Debug: Log detailed tool information before sending to LLM
			if (convertedTools && limitedTools) {
				Logger.debug('🔧 [Tool Debug] Tools being sent to LLM:', {
					totalToolsCount: limitedTools.length,
					toolNames: limitedTools.map(t => t.name).join(', ')
				});
				
				// Log detailed info for each tool - focus on duckduckgo tools
				const duckduckgoTools = limitedTools.filter(t => t.name.includes('duckduckgo'));
				duckduckgoTools.forEach((tool) => {
					Logger.debug(`🔧 [Tool Debug] DuckDuckGo Tool: ${tool.name}`, {
						description: tool.description?.substring(0, 100) + '...',
						inputSchemaType: typeof tool.inputSchema,
						inputSchemaConstructor: tool.inputSchema?.constructor?.name,
						hasOutputSchema: !!tool.outputSchema
					});
					
					// Try to extract schema info - handle both Zod and JSON Schema
					try {
						const schema = tool.inputSchema;
						if (schema && typeof schema === 'object') {
							// Check if it's a Zod schema
							if ('_def' in schema) {
								Logger.debug(`🔧 [Tool Debug] ${tool.name} - Zod Schema detected:`, {
									zodType: (schema as any)._def?.typeName,
									hasShape: !!(schema as any)._def?.shape
								});
								
								// Try to extract shape for object schemas
								if ((schema as any)._def?.shape) {
									const shape = (schema as any)._def.shape();
									const shapeKeys = Object.keys(shape);
									Logger.debug(`🔧 [Tool Debug] ${tool.name} - Zod Shape keys:`, shapeKeys);
									
									// Log first few properties
									shapeKeys.slice(0, 3).forEach(key => {
										const prop = shape[key];
										Logger.debug(`🔧 [Tool Debug] ${tool.name} - Property "${key}":`, {
											zodType: prop?._def?.typeName,
											description: prop?._def?.description,
											isOptional: prop?._def?.typeName === 'ZodOptional',
											hasDefault: !!(prop?._def?.defaultValue)
										});
									});
								}
							} else if ('properties' in schema) {
								// JSON Schema
								Logger.debug(`🔧 [Tool Debug] ${tool.name} - JSON Schema detected:`, {
									propertyNames: Object.keys((schema as any).properties),
									requiredFields: (schema as any).required || []
								});
							}
						}
					} catch (error) {
						Logger.warn(`🔧 [Tool Debug] Failed to extract schema for ${tool.name}:`, error);
					}
				});
				
				// Log the converted AI SDK format for duckduckgo tools
				const convertedDDG = Object.keys(convertedTools)
					.filter(name => name.includes('duckduckgo'))
					.slice(0, 2);
				
				if (convertedDDG.length > 0) {
					Logger.debug('🔧 [Tool Debug] Converted DuckDuckGo Tools in AI SDK Format:');
					convertedDDG.forEach(name => {
						const toolDef = (convertedTools as any)[name];
						Logger.debug(`🔧 [Tool Debug] ${name}:`, {
							hasDescription: !!toolDef.description,
							descriptionLength: toolDef.description?.length,
							hasInputSchema: !!toolDef.inputSchema,
							inputSchemaType: typeof toolDef.inputSchema,
							inputSchemaConstructor: toolDef.inputSchema?.constructor?.name,
							// Try to get Zod schema info
							zodInfo: toolDef.inputSchema?._def ? {
								typeName: toolDef.inputSchema._def.typeName,
								hasShape: !!toolDef.inputSchema._def.shape
							} : 'not a Zod schema'
						});
					});
				}
				
				Logger.debug('🔧 [Tool Debug] Total converted tools:', Object.keys(convertedTools).length);
			} else {
				Logger.debug('🔧 [Tool Debug] No tools being sent to LLM');
			}

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
			const collectedToolCalls: unknown[] = [];

			let streamError: Error | null = null;
			
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
						const toolInput = (part as unknown).input || (part as unknown).args || {};
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
					
					// Check for error indicators in stream parts
					if (part.type === 'error') {
						Logger.error('[sendStreamingMessageWithAISDK] Error part detected in stream:', part);
						streamError = new Error((part as unknown).error || 'Stream error occurred');
					}
				}

				// After stream completes, check for errors via result object
				// AI SDK may complete stream successfully but have error info in result
				Logger.debug('[sendStreamingMessageWithAISDK] Stream iteration completed');
				Logger.debug('[sendStreamingMessageWithAISDK] Checking result for errors...');
				Logger.debug('[sendStreamingMessageWithAISDK] result.error:', result.error);
				Logger.debug('[sendStreamingMessageWithAISDK] streamedContent length:', streamedContent.length);
				Logger.debug('[sendStreamingMessageWithAISDK] collectedToolCalls length:', collectedToolCalls.length);
				
				// Check if result has error property
				if (result.error) {
					Logger.error('[sendStreamingMessageWithAISDK] Result has error property:', result.error);
					streamError = result.error instanceof Error ? result.error : new Error(String(result.error));
				}
				
				// If we have a stream error, throw it before sending final chunk
				if (streamError) {
					Logger.error('[sendStreamingMessageWithAISDK] Stream error detected, throwing:', streamError);
					this.cleanupStreamingLog(requestId);
					throw streamError;
				}
				
				// Send final chunk with tool calls if any
				const finalChunk: unknown = {
					delta: '',
					isComplete: true,
					usage: { totalTokens, promptTokens: estimatedTokens, completionTokens: totalTokens }
				};

				if (collectedToolCalls.length > 0) {
					finalChunk.toolCalls = collectedToolCalls;
				}

				onChunk(finalChunk);
				this.addStreamingChunk(requestId, finalChunk);

				// Save assistant response to conversation history (non-blocking, fire-and-forget)
				// This prevents blocking the UI while waiting for file I/O operations
				if (this.memoryManager && this.currentThreadId) {
					const saveStartTime = Date.now();
					Logger.debug('[BaseLLMProvider] 💾 Starting non-blocking save to conversation history...');
					
					// Use Promise without await to make it non-blocking
					this.memoryManager.addConversationMessage({
						role: 'assistant',
						content: streamedContent,
						toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined
					}, this.currentThreadId).then(() => {
						const saveDuration = Date.now() - saveStartTime;
						Logger.debug('[BaseLLMProvider] ✓ Saved assistant response to conversation history (streaming) | Time:', saveDuration, 'ms');
					}).catch((error) => {
						Logger.warn('[BaseLLMProvider] ❌ Failed to save assistant response to history (streaming):', error);
						// Don't fail the request if history save fails
					});
					
					Logger.debug('[BaseLLMProvider] ⚡ Continuing without waiting for save to complete...');
				}

			} catch (error) {
				Logger.error(`[sendStreamingMessageWithAISDK] Stream error in catch block:`, error);
				this.cleanupStreamingLog(requestId);
				throw error;
			}
		});
	}

	// Abstract methods for provider-specific AI SDK configuration
	protected abstract getAISDKModel(): unknown;
	protected abstract getEndpointForLogging(): string;

	// Common AI SDK helper methods
	protected formatMessagesForAISDK(messages: ChatMessage[]): unknown[] {
		return messages.map((msg, index) => {
			// Explicitly filter out any non-standard fields (id, timestamp, metadata, etc.)
			// to ensure clean ModelMessage format for AI SDK
			
			// AI SDK only accepts 'user', 'assistant', and 'system' roles
			// Convert 'tool' role to 'user' for compatibility
			let role = msg.role;
			if (role === 'tool') {
				Logger.debug(`[formatMessagesForAISDK] Converting 'tool' role to 'user' for message ${index}`);
				role = 'user';
			}
			
			const baseMessage: { role: string; content: string | any[] } = {
				role: role,
				content: '' // Will be set below
			};

			// Debug log to check if message has extra fields
			if ((msg as any).id || (msg as any).timestamp) {
				Logger.debug(`[formatMessagesForAISDK] Message ${index} has extra fields that will be filtered:`, {
					hasId: !!(msg as any).id,
					hasTimestamp: !!(msg as any).timestamp,
					role: msg.role,
					convertedRole: role
				});
			}

			// Handle both string and multimodal content
			if (typeof msg.content === 'string') {
				baseMessage.content = msg.content;
			} else {
				// Multimodal content - AI SDK supports this for vision models
				const hasImages = msg.content.some(item => item.type === 'image');

				if (hasImages && this.supportsVision()) {
					// Format for AI SDK vision models
					baseMessage.content = msg.content.map(contentItem => {
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
					});
				} else {
					// Fall back to text-only for non-vision models
					const textContent = this.extractTextFromContent(msg.content);
					baseMessage.content = textContent;
				}
			}

			// Final debug check - ensure no extra properties
			const keys = Object.keys(baseMessage);
			if (keys.length > 2 || !keys.includes('role') || !keys.includes('content')) {
				Logger.warn(`[formatMessagesForAISDK] Unexpected message structure:`, keys);
			}

			return baseMessage;
		});
	}

	protected convertToolsToAISDKFormat(tools: UnifiedTool[]): unknown {
		// Use AI SDK's correct tool format with inputSchema
		const aiSDKTools: Record<string, unknown> = {};

		for (const unifiedTool of tools) {
			// Skip special control flow tools that have complex schemas
			// These tools are used internally by agents and should not be passed to LLMs
			const skipTools = ['for_each', 'if_else', 'while_loop'];
			if (skipTools.includes(unifiedTool.name)) {
				Logger.debug(`[convertToolsToAISDKFormat] Skipping special tool: ${unifiedTool.name}`);
				continue;
			}
			
			try {
				// Convert JSON schema properties to Zod schema dynamically
				const zodSchema = this.convertJSONSchemaToZod(unifiedTool.inputSchema, unifiedTool.name);

				// Build description with output schema information if available
				let enhancedDescription = unifiedTool.description;
				if (unifiedTool.outputSchema) {
					const outputDesc = this.formatOutputSchemaDescription(unifiedTool.outputSchema);
					if (outputDesc) {
						enhancedDescription += `\n\nOutput: ${outputDesc}`;
					}
				}

				aiSDKTools[unifiedTool.name] = {
					description: enhancedDescription,
					inputSchema: zodSchema
				};
			} catch (error) {
				Logger.error(`Failed to create AI SDK tool: ${unifiedTool.name}:`, error);
			}
		}

		return aiSDKTools;
	}

	/**
	 * Format output schema description for LLM understanding
	 * Converts JSON Schema to human-readable description
	 */
	private formatOutputSchemaDescription(outputSchema: unknown): string {
		if (!outputSchema || typeof outputSchema !== 'object') {
			return '';
		}

		const schema = outputSchema as Record<string, unknown>;
		const parts: string[] = [];

		// Add general description if available
		if (schema.description && typeof schema.description === 'string') {
			parts.push(schema.description);
		}

		// Describe the type
		if (schema.type) {
			if (schema.type === 'object' && schema.properties) {
				const props = schema.properties as Record<string, unknown>;
				const propDescriptions: string[] = [];
				
				for (const [propName, propSchema] of Object.entries(props)) {
					if (propSchema && typeof propSchema === 'object') {
						const prop = propSchema as Record<string, unknown>;
						const propType = prop.type || 'unknown';
						const propDesc = prop.description || '';
						propDescriptions.push(`  - ${propName} (${propType}): ${propDesc}`);
					}
				}
				
				if (propDescriptions.length > 0) {
					parts.push('Returns an object with:\n' + propDescriptions.join('\n'));
				}
			} else if (schema.type === 'array' && schema.items) {
				const items = schema.items as Record<string, unknown>;
				if (items.type === 'object' && items.properties) {
					parts.push('Returns an array of objects');
				} else {
					parts.push(`Returns an array of ${items.type || 'items'}`);
				}
			} else {
				parts.push(`Returns ${schema.type}`);
			}
		}

		// Add example if available
		if (schema.example) {
			parts.push(`Example: ${JSON.stringify(schema.example, null, 2)}`);
		}

		return parts.join('\n');
	}

	private convertJSONSchemaToZod(jsonSchema: unknown, toolName: string): unknown {
		try {
			// Validate jsonSchema is an object with properties
			if (!jsonSchema || typeof jsonSchema !== 'object') {
				Logger.warn(`Invalid schema for ${toolName}: not an object`);
				return z.object({});
			}

			// Create a basic Zod object from JSON schema properties
			const zodProperties: Record<string, unknown> = {};
			const schema = jsonSchema as Record<string, unknown>;

			if (schema.properties && typeof schema.properties === 'object') {
				for (const [propName, propSchema] of Object.entries(schema.properties)) {
					const prop = propSchema;

					let zodProp: unknown;

					// Handle union types (e.g., type: ['array', 'string'])
					if (Array.isArray(prop.type)) {
						// Create a union of the types
						const zodTypes: unknown[] = [];
						for (const type of prop.type) {
							switch (type) {
								case 'string':
									zodTypes.push(z.string());
									break;
								case 'number':
									zodTypes.push(z.number());
									break;
								case 'boolean':
									zodTypes.push(z.boolean());
									break;
								case 'array':
									// For arrays in union types, use a generic array
									if (prop.items) {
										if (prop.items.type === 'number') {
											zodTypes.push(z.array(z.number()));
										} else if (prop.items.type === 'string') {
											zodTypes.push(z.array(z.string()));
										} else if (prop.items.type === 'boolean') {
											zodTypes.push(z.array(z.boolean()));
										} else {
											zodTypes.push(z.array(z.any()));
										}
									} else {
										zodTypes.push(z.array(z.any()));
									}
									break;
								case 'object':
									zodTypes.push(z.object({}));
									break;
								default:
									zodTypes.push(z.any());
							}
						}
						
						// Create union if multiple types, otherwise use the single type
						if (zodTypes.length > 1) {
							zodProp = z.union(zodTypes as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
						} else if (zodTypes.length === 1) {
							zodProp = zodTypes[0];
						} else {
							zodProp = z.any();
						}
					} else {
						// Handle single type
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
							// Check if object has properties definition (nested schema)
							if (prop.properties && typeof prop.properties === 'object') {
								// Recursively convert nested object properties
								const nestedZodProps: Record<string, unknown> = {};
								for (const [nestedPropName, nestedPropSchema] of Object.entries(prop.properties)) {
									// For simplicity, handle nested properties as z.any()
									// since deep nesting is rare and complex
									nestedZodProps[nestedPropName] = z.any();
								}
								zodProp = z.object(nestedZodProps);
								
								// If additionalProperties is true, use z.record for flexibility
								if (prop.additionalProperties === true) {
									zodProp = z.record(z.any());
								}
							} else if (prop.additionalProperties === true) {
								// Object with additionalProperties but no properties defined
								// Use z.record to accept any key-value pairs
								zodProp = z.record(z.any());
							} else {
								// Plain object with no specific structure
								zodProp = z.object({});
							}
							break;
						default:
							zodProp = z.any();
					}
				}					// Add description if available
					if (prop.description) {
						zodProp = zodProp.describe(prop.description);
					}

					// Make optional if not in required array
					const required = Array.isArray(schema.required) ? schema.required : [];
					if (!required.includes(propName)) {
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

	protected formatAISDKResponse(result: unknown): LLMResponse {
		// Extract tool calls if any
		const toolCalls = result.toolCalls ? result.toolCalls.map((call: unknown) => ({
			id: call.toolCallId,
			type: 'function',
			function: {
				name: call.toolName,
				arguments: JSON.stringify(call.args)
			}
		})) : [];

		// Extract generated images if any (for image generation models)
		const images = result.experimental_providerMetadata?.openai?.images || 
		               result.response?.body?.choices?.[0]?.message?.images;

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
			images: images && images.length > 0 ? images : undefined,
			metadata: {
				provider: this.getProviderName(),
				rawResponse: result
			},
			isLoaded: true,
			providerStatuses: {}
		};
	}

	protected extractTextFromContent(content: MessageContent[]): string {
		return content
			.filter(item => item.type === 'text')
			.map(item => (item).text)
			.join('\n');
	}

	// Convert tools to provider-specific format
	protected convertToolsToProviderFormat(tools: UnifiedTool[]): unknown[] {
		if (!this.toolManager) {
			Logger.warn('No tool manager available for provider format conversion');
			return [];
		}
		
		return this.toolManager.convertToProviderFormat(tools);
	}

	// Parse tool calls from provider response - should be overridden by providers
	protected parseToolCallsFromResponse(responseData: unknown): ToolCall[] {
		const toolCalls: ToolCall[] = [];

		// Default OpenAI-compatible format
		if (responseData.choices && responseData.choices[0]?.message?.tool_calls) {
			responseData.choices[0].message.tool_calls.forEach((toolCall: unknown) => {
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
	protected hasToolCalls(responseData: unknown): boolean {
		// Default implementation - check for tool calls in various common formats
		if (responseData.choices && responseData.choices[0]?.message?.tool_calls) {
			return responseData.choices[0].message.tool_calls.length > 0;
		}

		// Anthropic format
		if (responseData.content && Array.isArray(responseData.content)) {
			return responseData.content.some((item: unknown) => item.type === 'tool_use');
		}

		return false;
	}

	// Get finish reason when tool calls are present
	protected getToolCallFinishReason(responseData: unknown): LLMResponse['finishReason'] {
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

	protected isRetryableError(error: unknown): boolean {
		Logger.debug('Checking if error is retryable:', {
			errorType: typeof error,
			message: error?.message,
			code: error?.code,
			status: error?.status
		});
		
		// Common retryable HTTP status codes (NOT including 413)
		const retryableStatusCodes = [429, 502, 503, 504];

		if (error.status && retryableStatusCodes.includes(error.status)) {
			Logger.debug('Error is retryable (status code):', error.status);
			return true;
		}

		// 413 Payload Too Large errors are NOT retryable
		if (error.status === 413) {
			Logger.debug('Error is NOT retryable (413 Payload Too Large)');
			return false;
		}

		// Token limit errors are not retryable without reducing content
		if (this.isTokenLimitError(error)) {
			Logger.debug('Error is NOT retryable (token limit)');
			return false;
		}

		// Check error message for retryable patterns
		const errorMessage = (error.message || '').toLowerCase();
		
		// ERR_INCOMPLETE_CHUNKED_ENCODING is retryable (server/network issue)
		if (errorMessage.includes('err_incomplete_chunked_encoding') ||
		    errorMessage.includes('incomplete chunked')) {
			Logger.debug('Error is RETRYABLE (incomplete chunked encoding - network/server issue)');
			return true;
		}
		
		// Connection errors are retryable
		if (errorMessage.includes('connection reset') ||
		    errorMessage.includes('socket hang up') ||
		    errorMessage.includes('econnreset')) {
			Logger.debug('Error is RETRYABLE (connection error)');
			return true;
		}
		
		// Timeout errors are retryable
		if (errorMessage.includes('timeout') ||
		    errorMessage.includes('timed out') ||
		    errorMessage.includes('etimedout')) {
			Logger.debug('Error is RETRYABLE (timeout error)');
			return true;
		}
		
		// "Failed to fetch" errors - NOT retryable (permanent network failure)
		if (errorMessage.includes('failed to fetch') || 
		    errorMessage.includes('fetch failed') ||
		    errorMessage.includes('networkerror')) {
			Logger.debug('Error is NOT retryable (failed to fetch)');
			return false;
		}

		// Network errors with specific codes are typically retryable
		if (error.code === 'ECONNRESET' || 
		    error.code === 'ENOTFOUND' || 
		    error.code === 'ETIMEDOUT' ||
		    error.code === 'ERR_INCOMPLETE_CHUNKED_ENCODING') {
			Logger.debug('Error is retryable (network code):', error.code);
			return true;
		}

		Logger.debug('Error is NOT retryable (default)');
		return false;
	}

	/**
	 * Check if error is related to token limits
	 */
	protected isTokenLimitError(error: unknown): boolean {
		if (!error) return false;

		// Check HTTP status code first
		if (error.status === 413) {
			return true; // 413 Payload Too Large
		}

		const errorMessage = (error.message || '').toLowerCase();
		const errorCode = (error.code || '').toLowerCase();
		const responseMessage = error.response?.data?.error?.message?.toLowerCase() || '';

		// Exclude authentication token errors (403, token verification failures)
		const authTokenPatterns = [
			'token验证',
			'token verification',
			'authentication',
			'unauthorized',
			'invalid token',
			'expired token',
			'bearer token'
		];
		
		const isAuthError = authTokenPatterns.some(pattern =>
			errorMessage.includes(pattern) ||
			errorCode.includes(pattern) ||
			responseMessage.includes(pattern)
		);
		
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if (isAuthError || (error as any).status === 403) {
			return false; // Not a token limit error, it's an auth error
		}

		const tokenLimitPatterns = [
			'context length',
			'max_tokens',
			'maximum context',
			'prompt token count',
			'exceeds the limit',
			'too long',
			'context_length_exceeded',
			'model_max_prompt_tokens_exceeded',
			'payload too large',
			'request too large',
			'tokens per minute',
			'tpm',
			'rate limit'
		];

		return tokenLimitPatterns.some(pattern =>
			errorMessage.includes(pattern) ||
			errorCode.includes(pattern) ||
			responseMessage.includes(pattern)
		);
	}

	protected formatError(error: unknown): LLMError {
		const timestamp = Date.now();

		// Handle 413 Payload Too Large errors
		if (error.status === 413 || (error.message && error.message.includes('413'))) {
			const originalMessage = error.response?.data?.error?.message || error.message || 'Payload Too Large';

			return {
				code: 'PAYLOAD_TOO_LARGE',
				message: `Request payload is too large. ${originalMessage}\n\nThis happens when:\n- Your conversation history is too long for the model's rate limit\n- The model has a low tokens-per-minute (TPM) limit\n- Too much context (files, notes) is included\n\nRecommendations:\n1. Start a new chat to clear conversation history\n2. Reduce the amount of context included\n3. Use a model with higher rate limits\n4. For Groq models like kimi-k2, the TPM limit is very low (10,000)`,
				provider: this.getProviderName(),
				details: error.response?.data || error,
				retryable: false,
				timestamp
			};
		}

		// Handle token limit errors with helpful messages
		if (this.isTokenLimitError(error)) {
			const originalMessage = error.response?.data?.error?.message || error.message || 'Token limit exceeded';

			return {
				code: 'TOKEN_LIMIT_EXCEEDED',
				message: `Token limit exceeded. ${originalMessage}\n\nThis usually happens when:\n- Your conversation history is too long\n- You've included too much context (files, notes)\n- The combined input exceeds the model's limits\n- The model has rate limits (TPM - tokens per minute)\n\nTip: Try starting a new chat or reducing the amount of context.`,
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
		let lastError: unknown;

		Logger.debug('[retryWithBackoff] Starting operation with retry (maxRetries:', maxRetries, ')');
		
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				Logger.debug('[retryWithBackoff] Attempt', attempt + 1, 'of', maxRetries + 1);
				const result = await operation();
				Logger.debug('[retryWithBackoff] ✅ Operation succeeded on attempt', attempt + 1);
				return result;
			} catch (error) {
				lastError = error;
				Logger.error('[retryWithBackoff] ❌ Attempt', attempt + 1, 'failed');
				Logger.error('[retryWithBackoff] Error type:', error?.constructor?.name);
				Logger.error('[retryWithBackoff] Error message:', error instanceof Error ? error.message : String(error));
				Logger.error('[retryWithBackoff] Error object:', error);
				
				// Check if error is retryable
				const isRetryable = this.isRetryableError(error);
				Logger.debug('[retryWithBackoff] Is error retryable?', isRetryable);
				
				// Don't retry on last attempt or non-retryable errors
				if (attempt === maxRetries || !isRetryable) {
					Logger.error('[retryWithBackoff] No more retries. Formatting and throwing error.');
					const formattedError = this.formatError(error);
					Logger.error('[retryWithBackoff] Formatted error:', formattedError);
					Logger.error('[retryWithBackoff] About to throw formatted error');
					
					// If formattedError is already an Error, throw it directly
					if (formattedError instanceof Error) {
						throw formattedError;
					}
					
					// If it's an LLMError object, create a proper Error with the message
					if (formattedError && typeof formattedError === 'object' && 'message' in formattedError) {
						const err = new Error(formattedError.message);
						// Attach the full LLMError object for downstream handlers
						(err as any).llmError = formattedError;
						throw err;
					}
					
					// Fallback: convert to string
					throw new Error(String(formattedError));
				}

				// Exponential backoff with jitter
				const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
				Logger.debug('[retryWithBackoff] Retrying in', Math.round(delay), 'ms...');
				await this.sleep(delay);
			}
		}

		Logger.error('[retryWithBackoff] All attempts exhausted. Throwing last error.');
		const formattedError = this.formatError(lastError);
		throw formattedError instanceof Error ? formattedError : new Error(String(formattedError));
	}

	protected formatMessagesForProvider(messages: ChatMessage[]): unknown[] {
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
		proxyEnabled: boolean;
		proxyType: 'socks5' | 'http' | 'https';
		proxyHost: string;
		proxyPort: number;
		proxyAuth: boolean;
		proxyUsername: string;
		proxyPassword: string;
	}>): void {
		if (config.apiKey !== undefined) this.apiKey = config.apiKey;
		if (config.model !== undefined) this.model = config.model;
		if (config.maxTokens !== undefined) this.maxTokens = config.maxTokens;
		if (config.temperature !== undefined) this.temperature = config.temperature;
		if (config.baseUrl !== undefined) this.baseUrl = config.baseUrl;
		if (config.toolManager !== undefined) this.toolManager = config.toolManager;
		if (config.proxyEnabled !== undefined) this.proxyEnabled = config.proxyEnabled;
		if (config.proxyType !== undefined) this.proxyType = config.proxyType;
		if (config.proxyHost !== undefined) this.proxyHost = config.proxyHost;
		if (config.proxyPort !== undefined) this.proxyPort = config.proxyPort;
		if (config.proxyAuth !== undefined) this.proxyAuth = config.proxyAuth;
		if (config.proxyUsername !== undefined) this.proxyUsername = config.proxyUsername;
		if (config.proxyPassword !== undefined) this.proxyPassword = config.proxyPassword;
	}

	/**
	 * Update memory context for conversation history
	 * This should be called before each request to ensure the correct thread context
	 */
	updateMemoryContext(memoryManager?: unknown, threadId?: string): void {
		this.memoryManager = memoryManager;
		this.currentThreadId = threadId;
		Logger.debug('[BaseLLMProvider] Memory context updated:', {
			hasMemory: !!memoryManager,
			threadId
		});
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
