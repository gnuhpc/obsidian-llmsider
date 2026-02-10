import { requestUrl } from 'obsidian';
import * as https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Logger } from '../utils/logger';
import { llmLogger } from '../utils/llm-logger';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';

/**
 * Hugging Chat Provider - Direct reverse-engineered HuggingChat API
 * 
 * Working principle:
 * 1. Create conversation: POST https://huggingface.co/chat/conversation (JSON)
 * 2. Send messages: POST https://huggingface.co/chat/conversation/{conversationId} (JSON with streaming)
 * 3. Parse SSE stream responses
 * 4. Authentication: Full cookie string (including hf-chat, token, aws-waf-token)
 * 
 * How to get cookies:
 * Option 1 (Recommended - Full cookies):
 * 1. Visit https://huggingface.co/chat and login
 * 2. Open DevTools (F12) > Network tab
 * 3. Send a message in the chat
 * 4. Find the request to /chat/conversation/{id}
 * 5. Copy the entire Cookie header value (multiple cookies separated by semicolons)
 * 
 * Option 2 (Simple - hf-chat only, may require login):
 * 1. Visit https://huggingface.co/chat and login
 * 2. Open DevTools (F12) > Application > Cookies > https://huggingface.co
 * 3. Find the `hf-chat` cookie value (UUID format)
 * 4. Copy only the UUID value
 * 
 * Note: The provider auto-detects if you provide a full cookie string or just hf-chat UUID
 */
export class HuggingChatProviderImpl extends BaseLLMProvider {
	private static readonly HF_CHAT_DOMAIN = 'https://huggingface.co';
	private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';

	private conversationId?: string;
	private rootMessageId?: string; // Root message ID from conversation.history[0]
	private supportsVisionOverride?: boolean;
	
	// Proxy configuration
	private proxyEnabled?: boolean;
	private proxyType?: 'socks5' | 'http' | 'https';
	private proxyHost?: string;
	private proxyPort?: number;
	private proxyAuth?: boolean;
	private proxyUsername?: string;
	private proxyPassword?: string;

	constructor(config: {
		apiKey: string; // Full Cookie header or just hf-chat UUID
		model: string;
		maxTokens: number;
		temperature?: number;
		baseUrl?: string;
		toolManager?: any;
		memoryManager?: any;
		threadId?: string;
		// Proxy configuration
		proxyEnabled?: boolean;
		proxyType?: 'socks5' | 'http' | 'https';
		proxyHost?: string;
		proxyPort?: number;
		proxyAuth?: boolean;
		proxyUsername?: string;
		proxyPassword?: string;
	}) {
		super(config);
		
		// Proxy configuration
		this.proxyEnabled = config.proxyEnabled;
		this.proxyType = config.proxyType;
		this.proxyHost = config.proxyHost;
		this.proxyPort = config.proxyPort;
		this.proxyAuth = config.proxyAuth;
		this.proxyUsername = config.proxyUsername;
		this.proxyPassword = config.proxyPassword;
		this.supportsVisionOverride = (config as any).supportsVision;
	}

	/**
	 * Get the Cookie header value
	 * If apiKey looks like a full cookie string, use it directly
	 * Otherwise, assume it's just the hf-chat UUID
	 */
	private getCookieHeader(): string {
		if (!this.apiKey) {
			return '';
		}
		
		Logger.info('[HuggingChat] Cookie length:', this.apiKey.length, 'characters');
		
		// UUID format: 8-4-4-4-12 characters (36 total including dashes)
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		
		// If it matches UUID format exactly, it's just the hf-chat cookie
		if (uuidRegex.test(this.apiKey.trim())) {
			Logger.warn('[HuggingChat] Only hf-chat UUID provided. You may need the full cookie string (including token and aws-waf-token) for authentication.');
			return `hf-chat=${this.apiKey.trim()}`;
		}
		
		// Otherwise, treat as full cookie string
		Logger.info('[HuggingChat] Using full cookie string');
		return this.apiKey;
	}

	/**
	 * Create proxy agent if proxy is enabled
	 */
	private createProxyAgent(): https.Agent | undefined {
		// Check if proxy is explicitly enabled
		if (!this.proxyEnabled) {
			Logger.debug('[HuggingChat] Proxy is disabled, using direct connection');
			return undefined;
		}

		if (!this.proxyHost || !this.proxyPort) {
			Logger.warn('[HuggingChat] Proxy enabled but host or port not configured');
			return undefined;
		}

		try {
			if (this.proxyType === 'socks5') {
				Logger.info(`[HuggingChat] Creating SOCKS5 proxy agent: ${this.proxyHost}:${this.proxyPort}`);
				
				// Build SOCKS5 proxy URL - format: socks5://[user:pass@]host:port
				let proxyUrl: string;
				if (this.proxyAuth && this.proxyUsername && this.proxyPassword) {
					proxyUrl = `socks5://${this.proxyUsername}:${this.proxyPassword}@${this.proxyHost}:${this.proxyPort}`;
				} else {
					proxyUrl = `socks5://${this.proxyHost}:${this.proxyPort}`;
				}
				
				Logger.debug(`[HuggingChat] SOCKS5 proxy URL: ${proxyUrl.replace(/:[^:@]+@/, ':****@')}`); // Mask password in logs
				return new SocksProxyAgent(proxyUrl) as https.Agent;
			} else {
				// http or https proxy
				const protocol = this.proxyType || 'http';
				const proxyAuth = this.proxyAuth && this.proxyUsername && this.proxyPassword
					? `${this.proxyUsername}:${this.proxyPassword}@`
					: '';
				const proxyUrl = `${protocol}://${proxyAuth}${this.proxyHost}:${this.proxyPort}`;
				Logger.info(`[HuggingChat] Creating ${protocol.toUpperCase()} proxy agent: ${this.proxyHost}:${this.proxyPort}`);
				return new HttpsProxyAgent(proxyUrl) as https.Agent;
			}
		} catch (error) {
			Logger.error('[HuggingChat] Failed to create proxy agent:', error);
			Logger.error('[HuggingChat] Falling back to direct connection');
			return undefined;
		}
	}

	/**
	 * Make an HTTPS request with proxy support (non-streaming)
	 */
	private async makeHttpsRequest(
		url: string,
		method: string,
		headers: Record<string, string>,
		body?: string
	): Promise<{ status: number; headers: Record<string, string>; text: string; json?: any }> {
		return new Promise((resolve, reject) => {
			const parsedUrl = new URL(url);
			const proxyAgent = this.createProxyAgent();
			
			const options: https.RequestOptions = {
				hostname: parsedUrl.hostname,
				port: parsedUrl.port || 443,
				path: parsedUrl.pathname + parsedUrl.search,
				method: method,
				headers: {
					...headers,
					...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
				},
				agent: proxyAgent
			};

			if (proxyAgent) {
				Logger.info(`[HuggingChat] Making ${method} request via proxy to ${parsedUrl.hostname}`);
			}

			const req = https.request(options, (res) => {
				let data = '';
				
				res.on('data', (chunk) => {
					data += chunk.toString();
				});
				
				res.on('end', () => {
					const response = {
						status: res.statusCode || 0,
						headers: res.headers as Record<string, string>,
						text: data,
						json: undefined as any
					};
					
					// Try to parse as JSON
					if (data && res.headers['content-type']?.includes('application/json')) {
						try {
							response.json = JSON.parse(data);
						} catch (e) {
							// Not valid JSON, leave as text
						}
					}
					
					resolve(response);
				});
			});

			req.on('error', (error) => {
				Logger.error('[HuggingChat] HTTPS request error:', error);
				reject(error);
			});

			if (body) {
				req.write(body);
			}
			req.end();
		});
	}

	/**
	 * Make a streaming HTTPS request with proxy support
	 */
	private async makeStreamingHttpsRequest(
		url: string,
		method: string,
		headers: Record<string, string>,
		body: string,
		onData: (chunk: string) => void,
		abortSignal?: AbortSignal
	): Promise<{ status: number }> {
		return new Promise((resolve, reject) => {
			const parsedUrl = new URL(url);
			const proxyAgent = this.createProxyAgent();
			
			const options: https.RequestOptions = {
				hostname: parsedUrl.hostname,
				port: parsedUrl.port || 443,
				path: parsedUrl.pathname + parsedUrl.search,
				method: method,
				headers: {
					...headers,
					'Content-Length': Buffer.byteLength(body)
				},
				agent: proxyAgent
			};

			if (proxyAgent) {
				Logger.info(`[HuggingChat] Making streaming ${method} request via proxy to ${parsedUrl.hostname}`);
			}

			const req = https.request(options, (res) => {
				Logger.debug('[HuggingChat] Response status:', res.statusCode);
				
				if (res.statusCode !== 200) {
					let errorBody = '';
					res.on('data', (chunk) => { errorBody += chunk.toString(); });
					res.on('end', () => {
						Logger.error('[HuggingChat] Bad response status:', res.statusCode, 'Body:', errorBody);
						reject(new Error(`HTTP ${res.statusCode}: ${errorBody}`));
					});
					return;
				}

				// Process streaming response
				res.on('data', (chunk) => {
					try {
						onData(chunk.toString());
					} catch (error) {
						Logger.error('[HuggingChat] Error processing chunk:', error);
					}
				});
				
				res.on('end', () => {
					resolve({ status: res.statusCode || 200 });
				});

				res.on('error', (error) => {
					Logger.error('[HuggingChat] Response stream error:', error);
					reject(error);
				});
			});

			req.on('error', (error) => {
				Logger.error('[HuggingChat] Request error:', error);
				reject(error);
			});

			// Handle abort signal
			if (abortSignal) {
				abortSignal.addEventListener('abort', () => {
					req.destroy();
					reject(new Error('Request aborted'));
				});
			}

			req.write(body);
			req.end();
		});
	}

	protected initializeModelConfig(): void {
		// No special initialization needed for direct API calls
		this.model_config = { initialized: true };
	}

	protected getAISDKModel(): any {
		// Not using AI SDK
		return null;
	}

	protected getEndpointForLogging(): string {
		return `${HuggingChatProviderImpl.HF_CHAT_DOMAIN}/chat/conversation`;
	}

	getProviderName(): string {
		return 'hugging-chat';
	}

	supportsVision(): boolean {
		// Only use user's explicit configuration
		if (this.supportsVisionOverride !== undefined) {
			Logger.debug(`[Hugging Chat] Using user vision configuration for ${this.model}:`, this.supportsVisionOverride);
			return this.supportsVisionOverride;
		}

		// Default to false if not configured
		Logger.debug(`[Hugging Chat] No vision configuration set for ${this.model}, defaulting to false`);
		return false;
	}

	async listModels(): Promise<string[]> {
		// Try to fetch models from API v2
		try {
			const url = `${HuggingChatProviderImpl.HF_CHAT_DOMAIN}/chat/api/v2/models`;
			Logger.info('[HuggingChat] Fetching models from API:', url);
			
			const response = await this.makeHttpsRequest(
				url,
				'GET',
				{
					'Accept': '*/*',
					'Cookie': this.getCookieHeader(),
					'User-Agent': HuggingChatProviderImpl.USER_AGENT,
				}
			);

			if (response.status === 200 && response.json) {
				Logger.info('[HuggingChat] API Response status:', response.status);
				
				// API returns: { json: [...models], meta: {...} }
				const data = response.json as { json?: Array<{ id: string; name?: string; unlisted?: boolean }> };
				const models = data.json || data as any;
				
				if (Array.isArray(models) && models.length > 0) {
					// Filter out unlisted models and extract IDs
					const modelIds = models
						.filter(m => !m.unlisted)
						.map(m => m.id || m.name)
						.filter(Boolean);
					
					Logger.info('[HuggingChat] Fetched', modelIds.length, 'models from API');
					return modelIds;
				} else {
					Logger.warn('[HuggingChat] API response does not contain valid models array');
				}
			}
		} catch (error) {
			Logger.warn('[HuggingChat] Failed to fetch models from API, using fallback list:', error);
		}

		// Fallback to hardcoded list (verified working models)
		Logger.info('[HuggingChat] Using fallback model list');
		return [
			'meta-llama/Llama-3.3-70B-Instruct',
			'Qwen/Qwen2.5-72B-Instruct',
			'CohereForAI/c4ai-command-r-plus-08-2024',
			'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
			'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF',
			'Qwen/QwQ-32B-Preview',
			'Qwen/Qwen2.5-Coder-32B-Instruct',
			'meta-llama/Llama-3.2-11B-Vision-Instruct',
			'NousResearch/Hermes-3-Llama-3.1-8B',
			'mistralai/Mistral-Nemo-Instruct-2407',
			'meta-llama/Llama-3.1-8B-Instruct',
		];
	}

	/**
	 * Create a new conversation
	 * API: POST https://huggingface.co/chat/conversation
	 */
	private async createConversation(systemPrompt?: string): Promise<string> {
		const url = `${HuggingChatProviderImpl.HF_CHAT_DOMAIN}/chat/conversation`;
		
		try {
			Logger.info('[HuggingChat] Creating conversation with model:', this.model);
			Logger.info('[HuggingChat] Cookie length:', this.apiKey?.length, 'characters');
			
			const requestBody = JSON.stringify({
				model: this.model,
			});
			
			Logger.debug('[HuggingChat] Request body:', requestBody);
			
			const response = await this.makeHttpsRequest(
				url,
				'POST',
				{
					'accept': '*/*',
					'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7,en-GB;q=0.6,en-CA;q=0.5,en-AU;q=0.4',
					'content-type': 'application/json',
					'cookie': this.getCookieHeader(),
					'origin': HuggingChatProviderImpl.HF_CHAT_DOMAIN,
					'referer': `${HuggingChatProviderImpl.HF_CHAT_DOMAIN}/chat/`,
					'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
					'sec-ch-ua-mobile': '?0',
					'sec-ch-ua-platform': '"Windows"',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-origin',
					'user-agent': HuggingChatProviderImpl.USER_AGENT,
				},
				requestBody
			);

			Logger.info('[HuggingChat] Response status:', response.status);
			Logger.info('[HuggingChat] Response content-type:', response.headers['content-type']);
			
			// Log response body for debugging
			if (response.status !== 200) {
				Logger.error('[HuggingChat] Response body:', response.text);
			}
			
			const data = response.json as { conversationId: string };
			
			if (!data || !data.conversationId) {
				Logger.error('[HuggingChat] Invalid response:', data);
				throw new Error('Invalid response: no conversationId');
			}
			
			Logger.info('[HuggingChat] Created conversation:', data.conversationId);
			
			// Fetch conversation info to get root message ID
			try {
				const infoResponse = await this.makeHttpsRequest(
					`${HuggingChatProviderImpl.HF_CHAT_DOMAIN}/chat/api/v2/conversations/${data.conversationId}`,
					'GET',
					{
						Cookie: this.getCookieHeader(),
						Accept: '*/*',
						'User-Agent': HuggingChatProviderImpl.USER_AGENT
					}
				);

				const conversationInfo = infoResponse.json?.json || infoResponse.json;
				const messages = conversationInfo?.messages || conversationInfo?.history || [];
				
				if (messages.length > 0) {
					this.rootMessageId = messages[0].id; // First message is the root/system message
					Logger.info('[HuggingChat] Got root message ID:', this.rootMessageId);
				} else {
					Logger.warn('[HuggingChat] No messages in conversation history');
				}
			} catch (infoError) {
				Logger.error('[HuggingChat] Failed to get conversation info:', infoError);
			}
			
			return data.conversationId;
		} catch (error) {
			Logger.error('[HuggingChat] Failed to create conversation:', error);
			
			if (error.message?.includes('404')) {
				throw new Error(
					'API endpoint not found (404). The HuggingChat API may have changed.\n' +
					'Please report this issue at: https://github.com/your-repo/issues'
				);
			}
			
			if (error.message?.includes('401')) {
				throw new Error(
					'Authentication failed (401). Please provide the full cookie string:\n' +
					'1. Visit https://huggingface.co/chat and login\n' +
					'2. Open DevTools (F12) > Network tab\n' +
					'3. Send a test message\n' +
					'4. Find request to /chat/conversation/ or /chat/api/v2/\n' +
					'5. Copy the ENTIRE Cookie header value (includes token, hf-chat, aws-waf-token)'
				);
			}
			
			throw new Error(`Failed to create conversation: ${error.message}`);
		}
	}

	/**
	 * Send a message and get non-streaming response
	 */
	async sendMessage(
		messages: ChatMessage[],
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<LLMResponse> {
		const chunks: string[] = [];
		
		await this.sendStreamingMessage(
			messages,
			(chunk) => {
				if (chunk.delta) {
					chunks.push(chunk.delta);
				}
			},
			undefined,
			tools,
			systemMessage
		);

		return {
			content: chunks.join(''),
			model: this.model,
			usage: {
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
			},
			finishReason: 'stop',
		};
	}

	/**
	 * Send a message and get streaming response
	 * API: POST https://huggingface.co/chat/conversation/{conversationId} (JSON with streaming)
	 */
	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		// Create conversation if needed
		if (!this.conversationId) {
			this.conversationId = await this.createConversation(systemMessage);
		}

		// Get the last user message
		const lastMessage = messages[messages.length - 1];
		if (!lastMessage || lastMessage.role !== 'user') {
			throw new Error('Last message must be from user');
		}

		// Send message with multipart/form-data (based on Python reference implementation)
		const url = `${HuggingChatProviderImpl.HF_CHAT_DOMAIN}/chat/conversation/${this.conversationId}`;
		
		Logger.info('[HuggingChat] Sending message to conversation:', this.conversationId);
		Logger.debug('[HuggingChat] Root message ID:', this.rootMessageId);

		// Prepare JSON payload with root message ID
		// MCP servers are optional - can be empty to avoid triggering tool calls
		const dataPayload = {
			inputs: lastMessage.content,
			id: this.rootMessageId || null,  // Use root message ID from conversation history
			is_retry: false,
			is_continue: false,
			selectedMcpServerNames: [],  // Empty to avoid tool calls
			selectedMcpServers: []
		};
		
		// Build multipart/form-data body with 6-dash boundary (confirmed from user's curl)
		const boundary = 'WebKitFormBoundary' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		const bodyParts = [
			`------${boundary}\r\n`,
			`Content-Disposition: form-data; name="data"\r\n\r\n`,
			`${JSON.stringify(dataPayload)}\r\n`,
			`------${boundary}--\r\n`
		];
		const body = bodyParts.join('');
		
		Logger.debug('[HuggingChat] Payload:', dataPayload);

		const requestId = llmLogger.generateRequestId();
		this.startStreamingLog(requestId);

		try {
			// Buffer for incomplete lines
			let buffer = '';
			let tokenCount = 0;

			// Use streaming HTTPS request to support real-time rendering
			await this.makeStreamingHttpsRequest(
				url,
				'POST',
				{
					'Accept': '*/*',
					'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7,en-GB;q=0.6,en-CA;q=0.5,en-AU;q=0.4',
					'Content-Type': `multipart/form-data; boundary=----${boundary}`,
					'Cookie': this.getCookieHeader(),
					'Origin': HuggingChatProviderImpl.HF_CHAT_DOMAIN,
					'Referer': `${HuggingChatProviderImpl.HF_CHAT_DOMAIN}/chat/conversation/${this.conversationId}`,
					'User-Agent': HuggingChatProviderImpl.USER_AGENT,
				},
				body,
				(chunk: string) => {
					// Add chunk to buffer
					buffer += chunk;
					
					// Process complete lines
					const lines = buffer.split('\n');
					
					// Keep the last incomplete line in buffer
					buffer = lines.pop() || '';
					
					// Process each complete line
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;

						try {
							const data = JSON.parse(trimmed);
							
							// Handle different message types
							if (data.type === 'stream') {
								// Text chunk - clean null characters
								if (data.token) {
									tokenCount++;
									// Remove null bytes that sometimes appear in tokens
									const cleanToken = data.token.replace(/\u0000/g, '');
									if (cleanToken) {
										const chunk: StreamingResponse = { 
											delta: cleanToken,
											isComplete: false 
										};
										onChunk(chunk);
										this.addStreamingChunk(requestId, chunk);
									}
								}
							} else if (data.type === 'finalAnswer') {
								// Final message - already sent via stream chunks
								Logger.debug('[HuggingChat] Final answer received:', data.text?.length, 'chars');
							} else if (data.type === 'error') {
								throw new Error(data.message || 'Unknown error from HuggingChat');
							}
						} catch (e) {
							// Ignore parse errors for non-JSON lines
							if (trimmed.startsWith('{')) {
								Logger.warn('[HuggingChat] Failed to parse line:', trimmed, e);
							}
						}
					}
				},
				abortSignal
			);

			Logger.info('[HuggingChat] Streaming complete, tokens:', tokenCount);

			// Send completion signal
			const finalChunk: StreamingResponse = { 
				delta: '',
				isComplete: true,
				usage: {
					totalTokens: tokenCount,
					promptTokens: 0,
					completionTokens: tokenCount,
				},
			};
			onChunk(finalChunk);
			this.addStreamingChunk(requestId, finalChunk);

		} catch (error) {
			Logger.error('[HuggingChat] Streaming error:', error);
			this.cleanupStreamingLog(requestId);
			throw error;
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			// Test by creating a conversation
			const convId = await this.createConversation('Test');
			return !!convId;
		} catch (error) {
			Logger.error('[HuggingChat] Connection test failed:', error);
			return false;
		}
	}

	async getServerInfo(): Promise<unknown> {
		return {
			provider: 'hugging-chat',
			domain: HuggingChatProviderImpl.HF_CHAT_DOMAIN,
			model: this.model,
			conversationId: this.conversationId,
		};
	}

	updateConfig(config: Partial<any>): void {
		super.updateConfig(config);
		if (config.supportsVision !== undefined) {
			this.supportsVisionOverride = config.supportsVision;
		}
		// Reset conversation when config changes
		this.conversationId = undefined;
	}
}
