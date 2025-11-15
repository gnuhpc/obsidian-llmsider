/**
 * GitHub Copilot Provider Implementation
 */

import { BaseLLMProvider } from './base-provider';
import { Logger } from './../utils/logger';
import { LLMResponse, StreamingResponse, ChatMessage } from '../types';
import { GitHubAuth } from '../auth/github-auth';
import { UnifiedTool } from '../tools/unified-tool-manager';
import { requestUrl } from 'obsidian';

export interface GitHubCopilotProvider {
	name: 'github-copilot';
	githubToken: string;
	copilotToken: string;
	tokenExpiry: number;
}

export class GitHubCopilotProviderImpl extends BaseLLMProvider {
	private githubToken: string;
	private copilotToken: string;
	private tokenExpiry: number;
	private copilotBaseUrl = 'https://api.githubcopilot.com';

	constructor(config: any) {
		super(config);
		this.githubToken = config.githubToken || '';
		this.copilotToken = config.copilotToken || '';
		this.tokenExpiry = config.tokenExpiry || 0;
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		// GitHub Copilot doesn't use AI SDK, so this is a no-op
		this.model_config = null;
	}

	protected getAISDKModel(): any {
		// GitHub Copilot doesn't use AI SDK
		throw new Error('GitHub Copilot does not use AI SDK');
	}

	protected getEndpointForLogging(): string {
		return 'github-copilot-chat';
	}

	getProviderName(): string {
		return 'github-copilot';
	}

	/**
	 * Ensure we have a valid Copilot token
	 */
	private async ensureValidToken(): Promise<void> {
		// Check if token is expired or about to expire (within 5 minutes)
		if (!this.copilotToken || Date.now() >= this.tokenExpiry - 5 * 60 * 1000) {
			Logger.debug('Token expired or missing, refreshing...');
			const tokenData = await GitHubAuth.getCopilotToken(this.githubToken);
			this.copilotToken = tokenData.token;
			this.tokenExpiry = tokenData.expires_at * 1000; // Convert to milliseconds
			Logger.debug('Token refreshed');
		}
	}

	async sendMessage(
		messages: ChatMessage[],
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<LLMResponse> {
		await this.ensureValidToken();

		const formattedMessages = messages.map(msg => ({
			role: msg.role,
			content: typeof msg.content === 'string' ? msg.content : 
				msg.content.map(c => c.type === 'text' ? c.text : '[Image]').join('\n')
		}));

		// Add system message if provided
		if (systemMessage) {
			formattedMessages.unshift({
				role: 'system',
				content: systemMessage
			});
		}

		const requestBody: any = {
			messages: formattedMessages,
			model: this.model,
			max_tokens: this.maxTokens,
			temperature: this.temperature || 0.7,
			stream: false
		};

		// Add tools if provided
		if (tools && tools.length > 0) {
			requestBody.tools = tools.map(tool => ({
				type: 'function',
				function: {
					name: tool.name,
					description: tool.description,
					parameters: tool.inputSchema
				}
			}));
		}

		const response = await requestUrl({
			url: `${this.copilotBaseUrl}/chat/completions`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.copilotToken}`,
				'Editor-Version': 'vscode/1.95.0',
				'Editor-Plugin-Version': 'copilot-chat/0.22.4',
				'User-Agent': 'GitHubCopilotChat/0.22.4'
			},
			body: JSON.stringify(requestBody)
		});

		if (response.status !== 200) {
			throw new Error(`GitHub Copilot API error: ${response.status} - ${response.text}`);
		}

		return this.handleNonStreamResponse(response.json);
	}

	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		await this.ensureValidToken();

		const formattedMessages = messages.map(msg => ({
			role: msg.role,
			content: typeof msg.content === 'string' ? msg.content : 
				msg.content.map(c => c.type === 'text' ? c.text : '[Image]').join('\n')
		}));

		if (systemMessage) {
			formattedMessages.unshift({
				role: 'system',
				content: systemMessage
			});
		}

		const requestBody: any = {
			messages: formattedMessages,
			model: this.model,
			max_tokens: this.maxTokens,
			temperature: this.temperature || 0.7,
			stream: true
		};

		if (tools && tools.length > 0) {
			requestBody.tools = tools.map(tool => ({
				type: 'function',
				function: {
					name: tool.name,
					description: tool.description,
					parameters: tool.inputSchema
				}
			}));
		}

		const response = await fetch(`${this.copilotBaseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.copilotToken}`,
				'Editor-Version': 'vscode/1.95.0',
				'Editor-Plugin-Version': 'copilot-chat/0.22.4',
				'User-Agent': 'GitHubCopilotChat/0.22.4'
			},
			body: JSON.stringify(requestBody),
			signal: abortSignal
		});

		if (!response.ok) {
			throw new Error(`GitHub Copilot API error: ${response.statusText}`);
		}

		const reader = response.body!.getReader();
		const decoder = new TextDecoder();
		
		// Track tool calls accumulation across chunks
		const toolCallsAccumulator: Map<number, { id?: string; type?: string; function?: { name?: string; arguments?: string } }> = new Map();

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') {
							// Send accumulated tool calls if any
							if (toolCallsAccumulator.size > 0) {
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
							}
							
							onChunk({
								delta: '',
								isComplete: true
							});
							continue;
						}

						try {
							const parsed = JSON.parse(data);
							const choice = parsed.choices?.[0];
							
							// Handle text delta
							const delta = choice?.delta?.content || '';
							if (delta) {
								onChunk({
									delta,
									isComplete: false
								});
							}
							
							// Handle tool calls delta
							if (choice?.delta?.tool_calls) {
								for (const toolCallDelta of choice.delta.tool_calls) {
									const index = toolCallDelta.index ?? 0;
									
									if (!toolCallsAccumulator.has(index)) {
										toolCallsAccumulator.set(index, {});
									}
									
									const accumulated = toolCallsAccumulator.get(index)!;
									
									// Accumulate tool call data
									if (toolCallDelta.id) {
										accumulated.id = toolCallDelta.id;
									}
									if (toolCallDelta.type) {
										accumulated.type = toolCallDelta.type;
									}
									if (toolCallDelta.function) {
										if (!accumulated.function) {
											accumulated.function = {};
										}
										if (toolCallDelta.function.name) {
											accumulated.function.name = toolCallDelta.function.name;
										}
										if (toolCallDelta.function.arguments) {
											accumulated.function.arguments = (accumulated.function.arguments || '') + toolCallDelta.function.arguments;
										}
									}
								}
							}

							if (parsed.usage) {
								onChunk({
									delta: '',
									isComplete: true,
									usage: {
										promptTokens: parsed.usage.prompt_tokens || 0,
										completionTokens: parsed.usage.completion_tokens || 0,
										totalTokens: parsed.usage.total_tokens || 0
									}
								});
							}
						} catch (e) {
							// Skip invalid JSON
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	private handleNonStreamResponse(data: any): LLMResponse {
		const choice = data.choices[0];
		
		// Parse tool calls if present
		let toolCalls: any[] | undefined;
		if (choice.message.tool_calls) {
			toolCalls = choice.message.tool_calls.map((tc: any) => ({
				id: tc.id,
				type: 'function',
				function: {
					name: tc.function.name,
					arguments: tc.function.arguments
				}
			}));
		}

		return {
			content: choice.message.content || '',
			model: this.model,
			usage: {
				promptTokens: data.usage?.prompt_tokens || 0,
				completionTokens: data.usage?.completion_tokens || 0,
				totalTokens: data.usage?.total_tokens || 0
			},
			finishReason: choice.finish_reason || 'stop',
			toolCalls
		};
	}

	async listModels(): Promise<string[]> {
		try {
			await this.ensureValidToken();
			const models = await GitHubAuth.getModels(this.copilotToken);
			return models.map(m => m.id);
		} catch (error) {
			Logger.error('Error fetching models:', error);
			// Return some common models as fallback
			return [
				'gpt-4o',
				'gpt-4',
				'gpt-3.5-turbo',
				'claude-3-5-sonnet-20241022',
				'o1-preview'
			];
		}
	}

	supportsVision(): boolean {
		// GitHub Copilot supports vision through some models
		return this.model.includes('gpt-4') || this.model.includes('vision');
	}
}
