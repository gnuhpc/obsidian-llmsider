import { Logger } from '../utils/logger';
import { requestUrl } from 'obsidian';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';
import * as https from 'https';
import * as zlib from 'zlib';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Free Gemini Provider - 使用免费的 Google Gemini 网页版 API
 * 
 * 工作原理：
 * 1. 不使用付费的 Google AI Studio API Key，而是使用网页版 Gemini 的认证 cookies
 * 2. 通过浏览器登录 https://gemini.google.com 获取 __Secure-1PSID 和 __Secure-1PSIDTS
 * 3. 使用这些 cookies 调用 Gemini 的内部 API
 * 4. 支持多轮对话、文件上传、流式响应等功能
 * 
 * 获取 cookies 的方法：
 * 1. 访问 https://gemini.google.com 并登录 Google 账号
 * 2. 打开浏览器开发者工具 (F12)
 * 3. 在 Application > Cookies 中找到 __Secure-1PSID 和 __Secure-1PSIDTS 的值
 * 4. 将两个值用 | 连接起来（格式：__Secure-1PSID|__Secure-1PSIDTS）
 */
export class FreeGeminiProviderImpl extends BaseLLMProvider {
	private secure1PSID: string;
	private secure1PSIDTS: string;
	private accessToken: string | null = null;
	private conversationId: string | null = null;
	private responseId: string | null = null;
	private choiceId: string | null = null;
	// Proxy configuration
	private proxyEnabled?: boolean;
	private proxyType?: 'socks5' | 'http' | 'https';
	private proxyHost?: string;
	private proxyPort?: number;
	private proxyAuth?: boolean;
	private proxyUsername?: string;
	private proxyPassword?: string;

	// 伪装浏览器的 headers
	private static readonly FAKE_HEADERS = {
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'Accept-Encoding': 'gzip, deflate, br',
		'Accept-Language': 'en-US,en;q=0.9'
	};

	constructor(config: {
		apiKey: string; // 格式: __Secure-1PSID|__Secure-1PSIDTS
		model: string;
		maxTokens: number;
		temperature?: number;
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
		super({
			...config,
			baseUrl: 'https://gemini.google.com'
		});
		
		// 解析 apiKey，格式为 __Secure-1PSID|__Secure-1PSIDTS
		const parts = config.apiKey.split('|');
		if (parts.length < 2) {
			throw new Error('Invalid Gemini cookies format. Expected: __Secure-1PSID|__Secure-1PSIDTS (separated by |)');
		}
		
		this.secure1PSID = parts[0].trim();
		this.secure1PSIDTS = parts[1].trim();
		
		// 验证 cookies 不为空
		if (!this.secure1PSID || !this.secure1PSIDTS) {
			throw new Error('Both __Secure-1PSID and __Secure-1PSIDTS cookies are required');
		}
		
		// Proxy configuration
		this.proxyEnabled = config.proxyEnabled;
		this.proxyType = config.proxyType;
		this.proxyHost = config.proxyHost;
		this.proxyPort = config.proxyPort;
		this.proxyAuth = config.proxyAuth;
		this.proxyUsername = config.proxyUsername;
		this.proxyPassword = config.proxyPassword;
		
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		// Free Gemini 不需要初始化 AI SDK
		this.model_config = { initialized: true };
	}

	protected getAISDKModel(): unknown {
		// Not used for Free Gemini
		throw new Error('Free Gemini does not use AI SDK');
	}

	protected getEndpointForLogging(): string {
		return 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate';
	}

	getProviderName(): string {
		return 'free-gemini';
	}

	supportsVision(): boolean {
		// Free providers do not expose vision configuration
		// Default to false for safety - users should use official Gemini provider for vision
		Logger.debug(`[Free Gemini] Vision support not configurable, defaulting to false`);
		return false;
	}

	/**
	 * 生成 Cookie 字符串
	 */
	private generateCookie(): string {
		return `__Secure-1PSID=${this.secure1PSID}; __Secure-1PSIDTS=${this.secure1PSIDTS}`;
	}

	/**
	 * 创建代理 agent（如果启用了代理）
	 */
	private createProxyAgent(): https.Agent | undefined {
		// 检查是否明确启用了代理
		if (!this.proxyEnabled) {
			Logger.debug('[FreeGemini] 代理已禁用，使用直连');
			return undefined;
		}

		if (!this.proxyHost || !this.proxyPort) {
			Logger.warn('[FreeGemini] 代理已启用但未配置主机或端口');
			return undefined;
		}

		try {
			const proxyAuth = this.proxyAuth && this.proxyUsername && this.proxyPassword 
				? `${this.proxyUsername}:${this.proxyPassword}@` 
				: '';
			
			if (this.proxyType === 'socks5') {
				Logger.info(`[FreeGemini] ✓ 创建 SOCKS5 代理 Agent: ${this.proxyHost}:${this.proxyPort}`);
				
				// 使用对象配置而不是 URL 字符串，以避免解析问题
				const agentOptions: any = {
					hostname: this.proxyHost,
					port: parseInt(this.proxyPort.toString()),
					protocol: 'socks5:',
				};

				if (this.proxyUsername && this.proxyPassword) {
					agentOptions.username = this.proxyUsername;
					agentOptions.password = this.proxyPassword;
				}

				Logger.info(`[FreeGemini] SOCKS5 Options: ${JSON.stringify({ ...agentOptions, password: '***' })}`);
				const agent = new SocksProxyAgent(agentOptions);
				Logger.info(`[FreeGemini] ✓ SOCKS5 代理 Agent 创建成功`);
				return agent;
			} else {
				// http or https proxy
				const protocol = this.proxyType || 'http';
				const proxyUrl = `${protocol}://${proxyAuth}${this.proxyHost}:${this.proxyPort}`;
				Logger.info(`[FreeGemini] ✓ 创建 ${protocol.toUpperCase()} 代理 Agent: ${this.proxyHost}:${this.proxyPort}`);
				const agent = new HttpsProxyAgent(proxyUrl);
				Logger.info(`[FreeGemini] ✓ ${protocol.toUpperCase()} 代理 Agent 创建成功`);
				return agent;
			}
		} catch (error) {
			Logger.error('[FreeGemini] ✗ 创建代理 Agent 失败:', error);
			Logger.error('[FreeGemini] 将回退到直连模式');
			return undefined;
		}
	}

	/**
	 * 获取访问令牌 (SNlM0e)
	 */
	private async getAccessToken(): Promise<string> {
		if (this.accessToken) {
			return this.accessToken;
		}

		try {
			const proxyAgent = this.createProxyAgent();
			
			// 使用 Node.js https 模块以支持代理
			const responseHtml = await new Promise<string>((resolve, reject) => {
				const options: https.RequestOptions = {
					hostname: 'gemini.google.com',
					port: 443,
					path: '/app',
					method: 'GET',
					servername: 'gemini.google.com',
					rejectUnauthorized: false, // 尝试绕过 SSL 验证以解决 BAD_DECRYPT
					minVersion: 'TLSv1.2', // 强制使用 TLS 1.2，避免 TLS 1.3 在 Electron 中的兼容性问题
					maxVersion: 'TLSv1.2',
					headers: {
						'Cookie': this.generateCookie(),
						...FreeGeminiProviderImpl.FAKE_HEADERS
					},
					agent: proxyAgent
				};

				if (proxyAgent) {
					Logger.info('[FreeGemini] → 获取访问令牌: 通过代理连接');
				} else {
					Logger.info('[FreeGemini] → 获取访问令牌: 直接连接');
				}

				const req = https.request(options, (res) => {
					if (res.statusCode !== 200) {
						reject(new Error(`Failed to get access token: ${res.statusCode}`));
						return;
					}

					// 检查是否需要解压 gzip
					const encoding = res.headers['content-encoding'];
					let stream: NodeJS.ReadableStream = res;
					
					if (encoding === 'gzip') {
						stream = res.pipe(zlib.createGunzip());
					} else if (encoding === 'deflate') {
						stream = res.pipe(zlib.createInflate());
					} else if (encoding === 'br') {
						stream = res.pipe(zlib.createBrotliDecompress());
					}

					let data = '';
					stream.on('data', (chunk) => { data += chunk.toString(); });
					stream.on('end', () => { resolve(data); });
					stream.on('error', (error) => { reject(error); });
				});

				req.on('error', (error) => {
					Logger.error('[FreeGemini] Request error:', error);
					reject(error);
				});

				req.end();
			});

			// 从 HTML 中提取 SNlM0e 值
			const match = responseHtml.match(/"SNlM0e":"(.*?)"/);
			if (!match || !match[1]) {
				Logger.error('[FreeGemini] Failed to extract SNlM0e token');
				Logger.error('[FreeGemini] Response status code:', 200);
				Logger.error('[FreeGemini] Response length:', responseHtml.length);
				Logger.error('[FreeGemini] Response preview:', responseHtml.substring(0, 500));
				
				// 检查是否是登录页面或错误页面
				if (responseHtml.includes('accounts.google.com') || responseHtml.includes('Sign in')) {
					throw new Error('Gemini cookies may be expired or invalid. Please update your cookies.');
				}
				
				throw new Error('Failed to extract SNlM0e token from response. The response may not be from Gemini or cookies are invalid.');
			}

			this.accessToken = match[1];
			Logger.info('[FreeGemini] Access token obtained successfully');
			return this.accessToken;
		} catch (error) {
			Logger.error('[FreeGemini] Failed to get access token:', error);
			throw error;
		}
	}

	/**
	 * 上传文件到 Gemini
	 */
	private async uploadFile(fileUrl: string): Promise<string | null> {
		try {
			// 检查是否是 base64 数据
			const isBase64 = fileUrl.startsWith('data:');
			let fileData: ArrayBuffer;
			let mimeType: string;
			let filename: string;

			if (isBase64) {
				// 解析 base64 数据
				const matches = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
				if (!matches) {
					throw new Error('Invalid base64 file format');
				}
				mimeType = matches[1];
				const base64Data = matches[2];
				
				// 转换为 ArrayBuffer
				const binaryString = atob(base64Data);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				fileData = bytes.buffer;
				
				// 生成文件名
				let ext = mimeType.split('/')[1] || 'bin';
				if (mimeType.includes('officedocument')) {
					if (mimeType.includes('presentationml')) ext = 'pptx';
					else if (mimeType.includes('wordprocessingml')) ext = 'docx';
					else if (mimeType.includes('spreadsheetml')) ext = 'xlsx';
				}
				filename = `file_${Date.now()}.${ext}`;
			} else {
				// 下载远程文件
				const proxyAgent = this.createProxyAgent();
				const fileUrlObj = new URL(fileUrl);
				
				const downloadResult = await new Promise<{data: ArrayBuffer, contentType: string}>((resolve, reject) => {
					const options: https.RequestOptions = {
						hostname: fileUrlObj.hostname,
						port: 443,
						path: fileUrlObj.pathname + fileUrlObj.search,
						method: 'GET',
						servername: fileUrlObj.hostname,
						rejectUnauthorized: false,
						minVersion: 'TLSv1.2',
						maxVersion: 'TLSv1.2',
						agent: proxyAgent
					};

					const req = https.request(options, (res) => {
						if (res.statusCode !== 200) {
							reject(new Error(`Failed to download file: ${res.statusCode}`));
							return;
						}

						const chunks: Buffer[] = [];
						res.on('data', (chunk) => { chunks.push(chunk); });
						res.on('end', () => {
							const buffer = Buffer.concat(chunks);
							resolve({
								data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
								contentType: res.headers['content-type'] || 'application/octet-stream'
							});
						});
					});

					req.on('error', reject);
					req.end();
				});

				fileData = downloadResult.data;
				mimeType = downloadResult.contentType;
				filename = fileUrl.split('/').pop() || `file_${Date.now()}.bin`;
			}

			// 上传文件到 Gemini - 使用简单的方式通过 requestUrl
			// 注意：文件上传不使用代理，因为 FormData 无法通过 https.request 发送
			const uploadUrl = 'https://content-push.googleapis.com/upload/';
			const formData = new FormData();
			formData.append('file', new Blob([fileData], { type: mimeType }), filename);

			const uploadResponse = await requestUrl({
				url: uploadUrl,
				method: 'POST',
				headers: {
					'Cookie': this.generateCookie(),
					'X-Goog-Upload-Protocol': 'multipart',
				},
				body: formData as any,
				throw: false,
			});

			if (uploadResponse.status !== 200) {
				throw new Error(`Failed to upload file: ${uploadResponse.status}`);
			}

			// 提取文件 ID
			const fileId = uploadResponse.json?.file?.name;
			if (!fileId) {
				throw new Error('Failed to get file ID from upload response');
			}

			Logger.info(`[FreeGemini] File uploaded successfully: ${fileId}`);
			return fileId;
		} catch (error) {
			Logger.error('[FreeGemini] Failed to upload file:', error);
			return null;
		}
	}

	/**
	 * 提取消息中的文件 URL
	 */
	private extractFileUrls(messages: ChatMessage[]): Array<{url: string, type: 'image' | 'file'}> {
		const files: Array<{url: string, type: 'image' | 'file'}> = [];
		
		// 只处理最新的消息
		if (!messages.length) return files;
		
		const lastMessage = messages[messages.length - 1];
		if (Array.isArray(lastMessage.content)) {
			lastMessage.content.forEach((item: any) => {
				if (item.type === 'image' && item.source?.type === 'base64') {
					const dataUrl = `data:${item.source.media_type};base64,${item.source.data}`;
					files.push({url: dataUrl, type: 'image'});
				} else if (item.type === 'image_url' && item.image_url?.url) {
					files.push({url: item.image_url.url, type: 'image'});
				} else if (item.type === 'file' && item.file_url?.url) {
					files.push({url: item.file_url.url, type: 'file'});
				}
			});
		}
		
		return files;
	}

	/**
	 * 准备消息内容
	 */
	private prepareMessageContent(messages: ChatMessage[]): string {
		const lastMessage = messages[messages.length - 1];
		
		if (typeof lastMessage.content === 'string') {
			return lastMessage.content;
		}
		
		// 提取文本部分
		if (Array.isArray(lastMessage.content)) {
			const textParts = lastMessage.content
				.filter((item: any) => item.type === 'text')
				.map((item: any) => item.text);
			return textParts.join('\n');
		}
		
		return '';
	}

	async listModels(): Promise<string[]> {
		// Gemini 网页版可用模型
		return [
			'gemini-3.0-pro',
			'gemini-2.5-pro',
			'gemini-2.5-flash',
			'gemini-2.0-flash-exp',
			'gemini-exp-1206',
		];
	}

	async sendMessage(messages: ChatMessage[], tools?: UnifiedTool[], systemMessage?: string): Promise<LLMResponse> {
		try {
			// 获取访问令牌
			const accessToken = await this.getAccessToken();
			
			// 准备消息内容
			const prompt = this.prepareMessageContent(messages);
			
			// 提取文件
			const files = this.extractFileUrls(messages);
			const uploadedFileIds: string[] = [];
			
			// 上传文件
			for (const file of files) {
				const fileId = await this.uploadFile(file.url);
				if (fileId) {
					uploadedFileIds.push(fileId);
				}
			}
			
			// 构建请求数据
			const requestData = this.buildRequestData(prompt, uploadedFileIds, systemMessage);
			
			// 发送请求
			const proxyAgent = this.createProxyAgent();
			const responseText = await new Promise<string>((resolve, reject) => {
				const options: https.RequestOptions = {
					hostname: 'gemini.google.com',
					port: 443,
					path: '/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
					method: 'POST',
					servername: 'gemini.google.com',
					rejectUnauthorized: false,
					minVersion: 'TLSv1.2',
					maxVersion: 'TLSv1.2',
					headers: {
						'Cookie': this.generateCookie(),
						...FreeGeminiProviderImpl.FAKE_HEADERS,
						'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
						'Content-Length': Buffer.byteLength(requestData),
						'Accept-Encoding': 'gzip, deflate, br',
						'X-Same-Domain': '1'
					},
					agent: proxyAgent
				};

				if (proxyAgent) {
					Logger.info('[FreeGemini] → 发送消息: 通过代理连接');
				} else {
					Logger.info('[FreeGemini] → 发送消息: 直接连接');
				}

				const req = https.request(options, (res) => {
					if (res.statusCode !== 200) {
						reject(new Error(`Request failed with status ${res.statusCode}`));
						return;
					}

					// 处理响应压缩
					const encoding = res.headers['content-encoding'];
					let stream: NodeJS.ReadableStream = res;
					
					if (encoding === 'gzip') {
						stream = res.pipe(zlib.createGunzip());
					} else if (encoding === 'deflate') {
						stream = res.pipe(zlib.createInflate());
					} else if (encoding === 'br') {
						stream = res.pipe(zlib.createBrotliDecompress());
					}

					let data = '';
					stream.on('data', (chunk) => { data += chunk.toString(); });
					stream.on('end', () => { resolve(data); });
					stream.on('error', (error) => { reject(error); });
				});

				req.on('error', (error) => {
					Logger.error('[FreeGemini] Request error:', error);
					reject(error);
				});

				req.write(requestData);
				req.end();
			});

			// 解析响应
			const result = this.parseResponse(responseText);
			
			// 更新对话状态
			if (result.conversationId) {
				this.conversationId = result.conversationId;
			}
			if (result.responseId) {
				this.responseId = result.responseId;
			}
			if (result.choiceId) {
				this.choiceId = result.choiceId;
			}
			
			return {
				content: result.text,
				model: 'free-gemini',
				finishReason: 'stop',
				usage: {
					promptTokens: 0,
					completionTokens: 0,
					totalTokens: 0,
				},
			};
		} catch (error) {
			Logger.error('[FreeGemini] Error in sendMessage:', error);
			throw error;
		}
	}

	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		try {
			// 获取访问令牌
			const accessToken = await this.getAccessToken();
			
			// 准备消息内容
			const prompt = this.prepareMessageContent(messages);
			
			// 提取文件
			const files = this.extractFileUrls(messages);
			const uploadedFileIds: string[] = [];
			
			// 上传文件
			for (const file of files) {
				const fileId = await this.uploadFile(file.url);
				if (fileId) {
					uploadedFileIds.push(fileId);
				}
			}
			
			// 构建请求数据
			const requestData = this.buildRequestData(prompt, uploadedFileIds, systemMessage);
			
			// 发送流式请求
			const proxyAgent = this.createProxyAgent();
			
			await new Promise<void>((resolve, reject) => {
				const options: https.RequestOptions = {
					hostname: 'gemini.google.com',
					port: 443,
					path: '/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
					method: 'POST',
					servername: 'gemini.google.com',
					rejectUnauthorized: false,
					minVersion: 'TLSv1.2',
					maxVersion: 'TLSv1.2',
					headers: {
						'Cookie': this.generateCookie(),
						...FreeGeminiProviderImpl.FAKE_HEADERS,
						'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
						'Content-Length': Buffer.byteLength(requestData),
						'Accept-Encoding': 'gzip, deflate, br',
						'X-Same-Domain': '1'
					},
					agent: proxyAgent
				};

				if (proxyAgent) {
					Logger.info('[FreeGemini] → 发送流式消息: 通过代理连接');
				} else {
					Logger.info('[FreeGemini] → 发送流式消息: 直接连接');
				}

				const req = https.request(options, (res) => {
					if (res.statusCode !== 200) {
						reject(new Error(`Request failed with status ${res.statusCode}`));
						return;
					}

					// 处理响应压缩
					const encoding = res.headers['content-encoding'];
					let stream: NodeJS.ReadableStream = res;
					
					if (encoding === 'gzip') {
						stream = res.pipe(zlib.createGunzip());
					} else if (encoding === 'deflate') {
						stream = res.pipe(zlib.createInflate());
					} else if (encoding === 'br') {
						stream = res.pipe(zlib.createBrotliDecompress());
					}

					let buffer = '';
					let fullText = ''; // Move fullText outside to persist across chunks

					const processLine = (line: string) => {
						if (line.trim().startsWith('[')) {
							try {
								const parsed = JSON.parse(line);
								if (parsed && parsed[0] && parsed[0][2]) {
									const data = JSON.parse(parsed[0][2]);
									if (data && data[4] && data[4][0] && data[4][0][1]) {
										const textChunk = data[4][0][1][0];
										if (textChunk) {
											const delta = textChunk.slice(fullText.length);
											if (delta) {
												onChunk({
													delta: delta,
													isComplete: false
												});
												fullText = textChunk;
											}
										}
									}
									
									// 更新对话状态
									if (data[1]) {
										this.conversationId = data[1][0];
										this.responseId = data[1][1];
										this.choiceId = data[4][0][0];
									}
								}
							} catch (parseError) {
								// 忽略解析错误
							}
						}
					};

					stream.on('data', (chunk: Buffer) => {
						if (abortSignal?.aborted) {
							res.destroy();
							return;
						}
						
						buffer += chunk.toString();
						const lines = buffer.split('\n');
						buffer = lines.pop() || '';
						
						for (const line of lines) {
							processLine(line);
						}
					});

					stream.on('end', () => {
						if (buffer) {
							processLine(buffer);
						}
						onChunk({ delta: '', isComplete: true });
						resolve();
					});

					stream.on('error', (error) => {
						reject(error);
					});
				});

				req.on('error', (error) => {
						Logger.error('[FreeGemini] Request error:', error);
						reject(error);
					});

					if (abortSignal) {
						abortSignal.addEventListener('abort', () => {
							req.destroy();
							reject(new Error('Request aborted'));
						});
					}

					req.write(requestData);
					req.end();
				});
		} catch (error) {
			Logger.error('[FreeGemini] Error in sendStreamingMessage:', error);
			throw error;
		}
	}

	/**
	 * 构建请求数据
	 */
	private buildRequestData(prompt: string, fileIds: string[], systemMessage?: string): string {
		const at = this.accessToken;
		
		// 构建请求体
		const messageData: any[] = [
			prompt,
			null,
			null,
		];
		
		// 添加文件
		if (fileIds.length > 0) {
			messageData[2] = fileIds.map(id => [[id]]);
		}
		
		// 添加对话历史
		const conversationData: any[] = [
			messageData,
			null,
			this.conversationId ? [this.conversationId, this.responseId, this.choiceId] : null,
		];
		
		const requestBody = {
			'at': at,
			'f.req': JSON.stringify([null, JSON.stringify(conversationData)]),
		};
		
		// 转换为 URL 编码格式
		const formData = new URLSearchParams();
		for (const [key, value] of Object.entries(requestBody)) {
			formData.append(key, value);
		}
		
		return formData.toString();
	}

	/**
	 * 解析响应数据
	 */
	private parseResponse(responseText: string): { text: string; conversationId?: string; responseId?: string; choiceId?: string; } {
		try {
			const lines = responseText.split('\n');
			let text = '';
			let conversationId: string | undefined;
			let responseId: string | undefined;
			let choiceId: string | undefined;
			
			for (const line of lines) {
				if (line.trim().startsWith('[')) {
					try {
						const parsed = JSON.parse(line);
						if (parsed && parsed[0] && parsed[0][2]) {
							const data = JSON.parse(parsed[0][2]);
							
							// 提取文本
							if (data && data[4] && data[4][0] && data[4][0][1]) {
								text = data[4][0][1][0] || '';
							}
							
							// 提取对话 ID
							if (data[1]) {
								conversationId = data[1][0];
								responseId = data[1][1];
								choiceId = data[4][0][0];
							}
						}
					} catch (parseError) {
						// 忽略解析错误
					}
				}
			}
			
			return {
				text,
				conversationId,
				responseId,
				choiceId,
			};
		} catch (error) {
			Logger.error('[FreeGemini] Failed to parse response:', error);
			throw new Error('Failed to parse Gemini response');
		}
	}

	/**
	 * 重置对话状态
	 */
	resetConversation(): void {
		this.conversationId = null;
		this.responseId = null;
		this.choiceId = null;
		Logger.info('[FreeGemini] Conversation state reset');
	}
}
