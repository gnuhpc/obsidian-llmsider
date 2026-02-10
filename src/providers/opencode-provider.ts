import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMConnection, LLMResponse } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';
import { Logger } from '../utils/logger';
import { requestUrl } from 'obsidian';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';

interface OpenCodeModel {
	id: string;
	providerID: string;
	name: string;
	family: string;
}

interface OpenCodeProvider {
	id: string;
	source: string;
	name: string;
	models: {
		[modelId: string]: OpenCodeModel;
	};
}

interface OpenCodeProviderResponse {
	all: OpenCodeProvider[];
}

export class OpenCodeProviderImpl extends BaseLLMProvider {
	private serverUrl: string = 'http://localhost:4097';

	constructor(config: any) {
		super(config);
	}

	protected initializeModelConfig(): void {
		this.model_config = null;
	}

	protected getAISDKModel(): unknown {
		return null;
	}

	protected getEndpointForLogging(): string {
		return 'opencode-session-message';
	}

	getProviderName(): string {
		return 'opencode';
	}

	async listModels(): Promise<string[]> {
		try {
			const apiUrl = `${this.serverUrl}/provider`;
			Logger.info('[OpenCode] Fetching models from:', apiUrl);
			
			const response = await requestUrl({
				url: apiUrl,
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			Logger.info('[OpenCode] Response status:', response.status);

			if (response.status !== 200) {
				Logger.error('[OpenCode] Failed to fetch models, status:', response.status);
				return [];
			}

			const data = response.json as OpenCodeProviderResponse;
			Logger.info('[OpenCode] Provider count:', data?.all?.length || 0);

			const models: string[] = [];
			if (data && data.all && Array.isArray(data.all)) {
				for (const provider of data.all) {
					const modelIds = Object.keys(provider.models || {});
					Logger.info(`[OpenCode] Provider "${provider.id}" has ${modelIds.length} models`);
					for (const modelId of modelIds) {
						const modelPath = `${provider.id}/${modelId}`;
						models.push(modelPath);
					}
				}
			} else {
				Logger.error('[OpenCode] Invalid response structure:', data);
			}

			Logger.info('[OpenCode] Total models found:', models.length);
			return models;
		} catch (error) {
			Logger.error('[OpenCode] Error fetching models:', error);
			Logger.error('[OpenCode] Error stack:', error instanceof Error ? error.stack : 'No stack');
			return [];
		}
	}

	async sendMessage(
		messages: ChatMessage[],
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<LLMResponse> {
		throw new Error('OpenCode does not support non-streaming messages. Use sendStreamingMessage instead.');
	}

	private async createSession(): Promise<string> {
		return new Promise((resolve, reject) => {
			const url = new URL(`${this.serverUrl}/session`);
			const requestFn = url.protocol === 'https:' ? httpsRequest : httpRequest;
			
			const postData = JSON.stringify({});
			
			const options = {
				hostname: url.hostname,
				port: url.port || (url.protocol === 'https:' ? 443 : 80),
				path: url.pathname,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(postData)
				}
			};

			const req = requestFn(options, (res) => {
				let body = '';
				
				res.on('data', (chunk: Buffer) => {
					body += chunk.toString();
				});
				
				res.on('end', () => {
					if (res.statusCode !== 200) {
						Logger.error('[OpenCode] Failed to create session:', res.statusCode, body);
						reject(new Error(`Failed to create session: ${res.statusCode}`));
						return;
					}
					
					try {
						const data = JSON.parse(body);
						Logger.debug('[OpenCode] Session created:', data.id);
						resolve(data.id);
					} catch (e) {
						Logger.error('[OpenCode] Failed to parse session response:', e);
						reject(e);
					}
				});
				
				res.on('error', (error) => {
					Logger.error('[OpenCode] Session creation error:', error);
					reject(error);
				});
			});
			
			req.on('error', (error) => {
				Logger.error('[OpenCode] Session request error:', error);
				reject(error);
			});
			
			req.write(postData);
			req.end();
		});
	}

	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: { delta: string; isComplete: boolean; metadata?: any; toolCalls?: any }) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				Logger.debug('[OpenCode] Sending streaming message to:', this.serverUrl);
				Logger.debug('[OpenCode] Model:', this.model);
				Logger.debug('[OpenCode] Messages count:', messages.length);

				const sessionId = await this.createSession();
				
				const formattedMessages = messages.map(msg => ({
					role: msg.role,
					content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
				}));

				if (systemMessage) {
					formattedMessages.unshift({
						role: 'system',
						content: systemMessage
					});
				}

				const [providerId, modelId] = this.model.split('/');
				if (!providerId || !modelId) {
					throw new Error(`Invalid model format: ${this.model}. Expected format: provider/model-id`);
				}

				const url = new URL(`${this.serverUrl}/session/${sessionId}/message`);
				const requestFn = url.protocol === 'https:' ? httpsRequest : httpRequest;

				const lastMessage = formattedMessages[formattedMessages.length - 1];
				const postData = JSON.stringify({
					parts: [
						{ type: "text", text: lastMessage.content }
					],
					model: {
						providerID: providerId,
						modelID: modelId
					},
					...(systemMessage && { system: systemMessage })
				});

				const options = {
					hostname: url.hostname,
					port: url.port || (url.protocol === 'https:' ? 443 : 80),
					path: url.pathname,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(postData),
						'Accept': 'text/event-stream'
					}
				};

				Logger.debug('[OpenCode] Request options:', {
					hostname: options.hostname,
					port: options.port,
					path: options.path,
					method: options.method,
					headers: options.headers
				});
				Logger.debug('[OpenCode] Request body:', postData);

				const req = requestFn(options, (res) => {
					Logger.debug('[OpenCode] Response status:', res.statusCode, res.statusMessage);
					Logger.debug('[OpenCode] Response headers:', res.headers);
					
					if (res.statusCode !== 200) {
						let errorBody = '';
						res.on('data', (chunk: Buffer) => {
							errorBody += chunk.toString();
						});
						res.on('end', () => {
							Logger.error('[OpenCode] Error response body:', errorBody);
							reject(new Error(`OpenCode request failed: ${res.statusCode} ${res.statusMessage}\n${errorBody}`));
						});
						return;
					}

					const contentType = res.headers['content-type'] || '';
					Logger.debug('[OpenCode] Content-Type:', contentType);

					if (contentType.includes('application/json')) {
						let jsonBody = '';
						res.on('data', (chunk: Buffer) => {
							jsonBody += chunk.toString();
						});
						res.on('end', () => {
							Logger.debug('[OpenCode] JSON response body:', jsonBody);
							if (jsonBody) {
								try {
									const parsed = JSON.parse(jsonBody);
									Logger.debug('[OpenCode] Parsed JSON response:', parsed);
									
									if (parsed.info && parsed.parts) {
										for (const part of parsed.parts) {
											if (part.type === 'text' && part.text) {
												onChunk({
													delta: part.text,
													isComplete: false
												});
											}
										}
										onChunk({
											delta: '',
											isComplete: true
										});
									}
								} catch (e) {
									Logger.error('[OpenCode] Failed to parse JSON response:', e);
									reject(e);
									return;
								}
							}
							resolve();
						});
						return;
					}

					let buffer = '';

					res.on('data', (chunk: Buffer) => {
						const chunkStr = chunk.toString();
						Logger.debug('[OpenCode] Raw chunk received:', chunkStr.substring(0, 200));
						buffer += chunkStr;
						
						const lines = buffer.split('\n');
						buffer = lines.pop() || '';

						for (const line of lines) {
							Logger.debug('[OpenCode] Processing line:', line.substring(0, 200));
							
							if (!line.trim()) {
								continue;
							}

							if (!line.startsWith('data: ')) {
								Logger.debug('[OpenCode] Line does not start with "data: ", skipping');
								continue;
							}

							const data = line.slice(6);
							Logger.debug('[OpenCode] Extracted data:', data);
							
							if (data === '[DONE]') {
								Logger.debug('[OpenCode] Received [DONE] marker');
								continue;
							}

							try {
								const parsed = JSON.parse(data);
								Logger.debug('[OpenCode] Parsed JSON:', parsed);
								
								if (parsed.type === 'content') {
									onChunk({
										delta: parsed.content || '',
										isComplete: false
									});
								} else if (parsed.type === 'done') {
									onChunk({
										delta: '',
										isComplete: true
									});
								} else {
									Logger.debug('[OpenCode] Unknown message type:', parsed.type);
								}
							} catch (e) {
								Logger.error('[OpenCode] Failed to parse SSE data:', data, e);
							}
						}
					});

					res.on('end', () => {
						Logger.debug('[OpenCode] Response stream ended');
						if (buffer.trim()) {
							Logger.debug('[OpenCode] Remaining buffer:', buffer);
						}
						resolve();
					});

					res.on('error', (error) => {
						Logger.error('[OpenCode] Response error:', error);
						reject(error);
					});
				});

				req.on('error', (error) => {
					Logger.error('[OpenCode] Request error:', error);
					reject(error);
				});

				if (abortSignal) {
					abortSignal.addEventListener('abort', () => {
						req.destroy();
						reject(new Error('Request aborted'));
					});
				}

				req.write(postData);
				req.end();
			} catch (error) {
				Logger.error('[OpenCode] Streaming error:', error);
				reject(error);
			}
		});
	}

	supportsVision(): boolean {
		return false;
	}

	updateConfig(config: Partial<LLMConnection>): void {
		super.updateConfig(config);
	}
}
