import { Logger } from '../utils/logger';
import { requestUrl } from 'obsidian';
import * as https from 'https';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';

/**
 * Free Qwen Provider - 使用免费的通义千问网页API
 * 
 * 工作原理：
 * 1. 不使用付费的 DashScope API Key，而是使用网页版通义千问的认证 ticket
 * 2. 通过浏览器登录 https://tongyi.aliyun.com/qianwen 获取 tongyi_sso_ticket
 * 3. 使用 HTTP/2 连接到 qianwen.biz.aliyun.com/dialog/conversation
 * 4. 使用 Cookie 方式传递 ticket 进行认证
 * 5. 接收 SSE 流式响应并转换为标准格式
 * 
 * 获取 ticket 的方法：
 * 1. 访问 https://tongyi.aliyun.com/qianwen
 * 2. 登录后打开浏览器开发者工具 (F12)
 * 3. 在 Application > Cookies 中找到 tongyi_sso_ticket 的值
 * 4. 或者从 https://www.aliyun.com 登录后获取 login_aliyunid_ticket
 */
export class FreeQwenProviderImpl extends BaseLLMProvider {
	private ticket: string;
	private modelCodeToNameMap: Map<string, string> = new Map();
	private modelNameToCodeMap: Map<string, string> = new Map();
	private static modelCapabilitiesMap: Map<string, any[]> = new Map(); // 存储模型能力（静态，所有实例共享）
	
	// Qwen API conversation state management:
	// - First message: sessionId="", parentMsgId=""
	// - Subsequent messages: use sessionId from first response, parentMsgId from last message
	// - Only send current message in contents array (backend maintains history via sessionId)
	// Use a static cache keyed by threadId to persist sessions across provider instances
	private static sessionCache: Map<string, { sessionId: string, lastMessageId: string }> = new Map();

	private get sessionId(): string | null {
		if (!this.currentThreadId) return null;
		return FreeQwenProviderImpl.sessionCache.get(this.currentThreadId)?.sessionId || null;
	}

	private set sessionId(value: string | null) {
		if (!this.currentThreadId) return;
		const state = FreeQwenProviderImpl.sessionCache.get(this.currentThreadId) || { sessionId: '', lastMessageId: '' };
		state.sessionId = value || '';
		FreeQwenProviderImpl.sessionCache.set(this.currentThreadId, state);
	}

	private get lastMessageId(): string | null {
		if (!this.currentThreadId) return null;
		return FreeQwenProviderImpl.sessionCache.get(this.currentThreadId)?.lastMessageId || null;
	}

	private set lastMessageId(value: string | null) {
		if (!this.currentThreadId) return;
		const state = FreeQwenProviderImpl.sessionCache.get(this.currentThreadId) || { sessionId: '', lastMessageId: '' };
		state.lastMessageId = value || '';
		FreeQwenProviderImpl.sessionCache.set(this.currentThreadId, state);
	}

	// 伪装浏览器的 headers
	private static readonly FAKE_HEADERS = {
		'Accept': 'application/json, text/plain, */*',
		'Accept-Encoding': 'gzip, deflate, br, zstd',
		'Accept-Language': 'zh-CN,zh;q=0.9',
		'Cache-Control': 'no-cache',
		'Origin': 'https://tongyi.aliyun.com',
		'Pragma': 'no-cache',
		'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
		'Sec-Ch-Ua-Mobile': '?0',
		'Sec-Ch-Ua-Platform': '"Windows"',
		'Sec-Fetch-Dest': 'empty',
		'Sec-Fetch-Mode': 'cors',
		'Sec-Fetch-Site': 'same-site',
		'Referer': 'https://tongyi.aliyun.com/',
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
		'X-Platform': 'pc_tongyi',
		'X-Xsrf-Token': '48b9ee49-a184-45e2-9f67-fa87213edcdc',
	};

	constructor(config: {
		apiKey: string; // 这里的 apiKey 实际是 tongyi_sso_ticket 或 login_aliyunid_ticket
		model: string;
		maxTokens: number;
		temperature?: number;
		toolManager?: any;
		memoryManager?: any;
		threadId?: string;
	}) {
		super({
			...config,
			baseUrl: 'https://api.qianwen.com'
		});
		
		// apiKey 在这里实际上是 ticket
		this.ticket = config.apiKey;
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		// Free Qwen 不需要初始化 AI SDK，因为我们直接使用 HTTP/2
		this.model_config = { initialized: true };
	}

	protected getAISDKModel(): unknown {
		// Not used for Free Qwen
		throw new Error('Free Qwen does not use AI SDK');
	}

	protected getEndpointForLogging(): string {
		return 'https://api.qianwen.com/dialog/conversation';
	}

	getProviderName(): string {
		return 'free-qwen';
	}

	supportsVision(): boolean {
		// Free providers do not expose vision configuration
		// Default to false for safety - users should use official Qwen provider for vision
		Logger.debug(`[Free Qwen] Vision support not configurable, defaulting to false`);
		return false;
	}

	/**
	 * 获取模型的内部名称（用于 API 请求）
	 */
	private getInternalModelName(modelCode: string): string {
		// 如果有映射关系，使用映射的名称
		if (this.modelCodeToNameMap.has(modelCode)) {
			return this.modelCodeToNameMap.get(modelCode)!;
		}
		// 否则直接使用原始名称（兼容旧版本模型）
		return modelCode;
	}

	/**
	 * 获取模型能力（公开方法，供 UI 使用）
	 */
	getModelCapabilities(modelCode: string): any[] {
		const caps = FreeQwenProviderImpl.modelCapabilitiesMap.get(modelCode) || [];
		Logger.debug(`[FreeQwen] getModelCapabilities(${modelCode}):`, caps.length, 'items');
		return caps;
	}

	async listModels(): Promise<string[]> {
		try {
			// 尝试从 API 获取最新的模型列表
			const requestBody = JSON.stringify({
				configType: 'MAIN_CHAT',
				interactionScene: 'all_chat',
				version: 'v1'
			});

			const response = await new Promise<{status: number, json?: any}>((resolve, reject) => {
				const options: https.RequestOptions = {
					hostname: 'api.qianwen.com',
					path: '/dialog/api/chat/config/getModelSeries',
					method: 'POST',
					headers: {
						'Accept': '*/*',
						'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(requestBody),
						'Cookie': this.generateCookie(this.ticket),
						'Origin': 'https://www.qianwen.com',
						'Referer': 'https://www.qianwen.com/',
						'Sec-Ch-Ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
						'Sec-Ch-Ua-Mobile': '?0',
						'Sec-Ch-Ua-Platform': '"macOS"',
						'Sec-Fetch-Dest': 'empty',
						'Sec-Fetch-Mode': 'cors',
						'Sec-Fetch-Site': 'same-site',
						'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
					},
				};

				const req = https.request(options, (res) => {
					let responseData = '';
					
					res.on('data', (chunk) => {
						responseData += chunk;
					});
					
					res.on('end', () => {
						try {
							const json = JSON.parse(responseData);
							resolve({ status: res.statusCode || 0, json });
						} catch (error) {
							resolve({ status: res.statusCode || 0 });
						}
					});
				});

				req.on('error', (error) => {
					reject(error);
				});

				req.write(requestBody);
				req.end();
			});

			if (response.status === 200 && response.json?.success && response.json?.data) {
				const models: string[] = [];
				const modelData = response.json.data;

				// 清空旧的映射
				this.modelCodeToNameMap.clear();
				this.modelNameToCodeMap.clear();
				FreeQwenProviderImpl.modelCapabilitiesMap.clear();

				// 遍历所有系列
				for (const series of modelData) {
					if (series.params && Array.isArray(series.params)) {
						for (const model of series.params) {
							// 使用 modelCode 作为模型标识（用户可见）
							if (model.modelCode && model.modelName) {
								models.push(model.modelCode);
								
								// 建立 modelCode <-> modelName 映射关系
								this.modelCodeToNameMap.set(model.modelCode, model.modelName);
								this.modelNameToCodeMap.set(model.modelName, model.modelCode);
								
								// 保存模型能力信息（使用静态变量，所有实例共享）
								if (model.capsule && Array.isArray(model.capsule)) {
									FreeQwenProviderImpl.modelCapabilitiesMap.set(model.modelCode, model.capsule);
									Logger.debug(`[FreeQwen] Saved capabilities for ${model.modelCode}:`, model.capsule.length, 'items');
								}
								
								Logger.debug(`[FreeQwen] Model mapping: ${model.modelCode} -> ${model.modelName}`);
							}
						}
					}
				}

				if (models.length > 0) {
					Logger.info(`[FreeQwen] Fetched ${models.length} models from API:`, models);
					return models;
				}
			}

			Logger.warn('[FreeQwen] Failed to fetch models from API, returning empty list');
		} catch (error) {
			Logger.warn('[FreeQwen] Error fetching models from API:', error);
		}

		// API 获取失败时返回空数组，强制使用动态获取
		// 如果用户已经配置了模型名称，仍然可以使用
		Logger.info('[FreeQwen] No models available from API, please check your ticket or retry later');
		return [];
	}

	/**
	 * 生成 Cookie 字符串
	 */
	private generateCookie(ticket: string): string {
		const ticketKey = ticket.length > 100 ? 'login_aliyunid_ticket' : 'tongyi_sso_ticket';
		return [
			`${ticketKey}=${ticket}`,
			'aliyun_choice=intl',
			'_samesite_flag_=true',
			`t=${this.generateUUID(false)}`,
		].join('; ');
	}

	/**
	 * 生成 UUID
	 */
	private generateUUID(withHyphens: boolean = true): string {
		const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
		return withHyphens ? uuid : uuid.replace(/-/g, '');
	}

	/**
	 * 准备消息内容
	 */
	/**
	 * 提取消息中的图片和文件 URL（包括 base64）
	 * 策略：将所有文件（包括 base64）统一上传到 OSS，然后引用 OSS URL
	 */
	private extractFileUrls(messages: ChatMessage[]): Array<{url: string, type: 'image' | 'file'}> {
		const files: Array<{url: string, type: 'image' | 'file'}> = [];
		
		// 只处理最新的消息
		if (!messages.length) return files;
		
		const lastMessage = messages[messages.length - 1];
		Logger.debug(`[FreeQwen] Extracting files from message, content type: ${typeof lastMessage.content}, isArray: ${Array.isArray(lastMessage.content)}`);
		
		if (Array.isArray(lastMessage.content)) {
			lastMessage.content.forEach((item: any, index: number) => {
				Logger.debug(`[FreeQwen] Content item ${index}: type=${item.type}, hasSource=${!!item.source}, hasImageUrl=${!!item.image_url}, hasFileUrl=${!!item.file_url}`);
				
				// 支持系统内部格式: { type: 'image', source: { type: 'base64', media_type: '...', data: '...' } }
				if (item.type === 'image' && item.source?.type === 'base64') {
					// 将 base64 数据转换为 data URL 格式，统一上传到 OSS
					const dataUrl = `data:${item.source.media_type};base64,${item.source.data}`;
					const preview = dataUrl.substring(0, 50) + '...' + dataUrl.substring(dataUrl.length - 20);
					Logger.debug(`[FreeQwen] Extracted base64 image: ${preview}`);
					files.push({url: dataUrl, type: 'image'});
				}
				// 兼容 OpenAI 格式: { type: 'image_url', image_url: { url: '...' } }
				else if (item.type === 'image_url' && item.image_url?.url) {
					const urlPreview = item.image_url.url.substring(0, 50) + '...';
					Logger.debug(`[FreeQwen] Extracted image_url: ${urlPreview}`);
					files.push({url: item.image_url.url, type: 'image'});
				}
				// 支持文件格式: { type: 'file', file_url: { url: '...' } }
				else if (item.type === 'file' && item.file_url?.url) {
					//Logger.debug(`[FreeQwen]${item.file_url.url}`);
					files.push({url: item.file_url.url, type: 'file'});
				}
			});
		}
		
		Logger.info(`[FreeQwen] Extracted ${files.length} file(s) from message`);
		return files;
	}

	/**
	 * 获取 OSS 上传凭证
	 */
	private async acquireUploadParams(): Promise<any> {
		try {
			// 使用 Node.js https 模块调用 uploadToken API
			const requestBody = JSON.stringify({ source: 'dialogue' });

			const response = await new Promise<{status: number, json?: any, text?: string}>((resolve, reject) => {
				const options: https.RequestOptions = {
					hostname: 'api.qianwen.com',
					path: '/dialog/uploadToken',
					method: 'POST',
					headers: {
						'Accept': 'application/json, text/plain, */*',
						'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(requestBody),
						'Cookie': this.generateCookie(this.ticket),
						'Origin': 'https://www.qianwen.com',
						'Referer': 'https://www.qianwen.com/',
						'Sec-Ch-Ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
						'Sec-Ch-Ua-Mobile': '?0',
						'Sec-Ch-Ua-Platform': '"macOS"',
						'Sec-Fetch-Dest': 'empty',
						'Sec-Fetch-Mode': 'cors',
						'Sec-Fetch-Site': 'same-site',
						'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
						'X-Platform': 'pc_tongyi',
						'X-Deviceid': this.generateUUID(),
						'X-Xsrf-Token': this.generateUUID(),
					},
				};

				const req = https.request(options, (res) => {
					let responseData = '';
					
					res.on('data', (chunk) => {
						responseData += chunk;
					});
					
					res.on('end', () => {
						try {
							const json = JSON.parse(responseData);
							resolve({ status: res.statusCode || 0, json, text: responseData });
						} catch (error) {
							resolve({ status: res.statusCode || 0, text: responseData });
						}
					});
				});

				req.on('error', (error) => {
					reject(error);
				});

				req.write(requestBody);
				req.end();
			});

			if (response.status !== 200 || !response.json?.success) {
				const errorMsg = response.json?.errorMsg || response.text;
				Logger.error(`[FreeQwen] Upload token failed: status=${response.status}, error:`, errorMsg);
				throw new Error(`Failed to get upload token: ${response.status} - ${errorMsg}`);
			}

			return response.json.data;
		} catch (error) {
			Logger.error('[FreeQwen] Failed to acquire upload params:', error);
			throw error;
		}
	}

	/**
	 * 上传文件（图片或文档）到 OSS
	 */
	private async uploadFile(fileUrl: string, batchId: string, fileType: 'image' | 'file' = 'image'): Promise<any | null> {
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
				
				// 检查文件类型是否被 Qwen 云端支持
				// PowerPoint 等不支持的类型应该使用本地已解析的文本内容
				const unsupportedTypes = [
					'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
					'application/vnd.ms-powerpoint', // .ppt
				];
				
				if (unsupportedTypes.includes(mimeType)) {
					Logger.info(`[FreeQwen] File type ${mimeType} not supported by cloud, skipping upload (will use local parsed content)`);
					return null; // 返回 null 表示跳过云端上传，使用本地解析内容
				}
				
				const base64Data = matches[2];
				
				// 转换为 ArrayBuffer
				const binaryString = atob(base64Data);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				fileData = bytes.buffer;
				
				// 生成文件名 - 使用原始文件名（如果可用）或生成随机名称
				// 注意：对于图片和文档都使用原始文件名，这是测试脚本的做法
				let ext = mimeType.split('/')[1] || 'dat';
				// 处理复杂的 MIME 类型，提取正确的扩展名
				if (mimeType.includes('officedocument')) {
					if (mimeType.includes('presentationml')) ext = 'pptx';
					else if (mimeType.includes('wordprocessingml')) ext = 'docx';
					else if (mimeType.includes('spreadsheetml')) ext = 'xlsx';
				} else if (mimeType === 'application/pdf') {
					ext = 'pdf';
				} else if (mimeType === 'text/markdown') {
					ext = 'md';
				} else if (mimeType === 'text/plain') {
					ext = 'txt';
				}
				
				// 尝试从 fileUrl 中提取原始文件名（如果是 data URI 可能无法提取）
				// 对于 base64 数据，使用随机文件名
				filename = `${this.generateUUID()}.${ext}`;
			} else {
				// 下载远程文件（使用 Node.js https 模块）
				const urlObj = new URL(fileUrl);
				const response = await new Promise<{status: number, arrayBuffer?: ArrayBuffer, headers?: any}>((resolve, reject) => {
					const options: https.RequestOptions = {
						hostname: urlObj.hostname,
						path: urlObj.pathname + urlObj.search,
						method: 'GET',
					};

					const req = https.request(options, (res) => {
						const chunks: Buffer[] = [];
						
						res.on('data', (chunk) => {
							chunks.push(chunk);
						});
						
						res.on('end', () => {
							const buffer = Buffer.concat(chunks);
							const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
							resolve({ 
								status: res.statusCode || 0, 
								arrayBuffer,
								headers: res.headers
							});
						});
					});

					req.on('error', (error) => {
						reject(error);
					});

					req.end();
				});

				if (response.status !== 200) {
					throw new Error(`Failed to download file: ${response.status}`);
				}

				fileData = response.arrayBuffer as ArrayBuffer;
				
				// 从 URL 中提取文件名
				const urlPath = urlObj.pathname;
				filename = urlPath.split('/').pop() || `${this.generateUUID()}.dat`;
				
				// 尝试从响应头获取 MIME 类型
				mimeType = response.headers?.['content-type'] || 'image/png';
			}

			// 判断文件类型：根据 MIME 类型
			const isImage = mimeType.startsWith('image/');

			if (isImage) {
				// 图片：使用原有的 OSS 上传流程
				return await this.uploadImage(fileData, filename, mimeType, batchId);
			} else {
				// 文档：使用新的文档上传 API
				return await this.uploadDocument(fileData, filename, mimeType, batchId);
			}
		} catch (error) {
			Logger.error('[FreeQwen] Failed to upload file:', error);
			throw error;
		}
	}

	/**
	 * 获取下载链接（单数，用于图片）
	 */
	private async getDownloadLink(filename: string, dir: string, fileType: 'image'): Promise<string> {
		const requestBody = JSON.stringify({
			fileKey: filename,
			fileType: fileType,
			dir: dir,
			source: 'dialogue'
		});

		return new Promise((resolve, reject) => {
			const options: https.RequestOptions = {
				hostname: 'api.qianwen.com',
				path: '/dialog/downloadLink',
				method: 'POST',
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(requestBody),
					'Cookie': this.generateCookie(this.ticket),
					'Origin': 'https://www.qianwen.com',
					'Referer': 'https://www.qianwen.com/chat',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'X-Platform': 'pc_tongyi',
					'X-Deviceid': this.generateUUID(),
					'X-Xsrf-Token': this.generateUUID(),
				},
			};

			const req = https.request(options, (res) => {
				let responseData = '';
				
				res.on('data', (chunk) => {
					responseData += chunk;
				});
				
				res.on('end', () => {
					try {
						const jsonResponse = JSON.parse(responseData);
						
						if (res.statusCode === 200 && jsonResponse.success && jsonResponse.data?.url) {
							Logger.info(`[FreeQwen] Got download link for image`);							resolve(jsonResponse.data.url);
						} else {
							const errorMsg = jsonResponse.errorMsg || 'No URL in response';
							Logger.error(`[FreeQwen] Download link failed: ${errorMsg}`);
							reject(new Error(`Download link failed: ${errorMsg}`));
						}
					} catch (error) {
						Logger.error(`[FreeQwen] Failed to parse download link response:`, error);
						reject(error);
					}
				});
			});

			req.on('error', (error) => {
				Logger.error(`[FreeQwen] Download link request error:`, error);
				reject(error);
			});

			req.write(requestBody);
			req.end();
		});
	}

	/**
	 * 获取文件的签名 URL（通过 downloadLink/batch API，用于文档）
	 */
	private async getDownloadLinkBatch(filename: string, dir: string, fileType: 'file'): Promise<{ signedUrl: string; docId: string; fileId: string }> {
		try {
			const requestBody = JSON.stringify({
				fileKeys: [filename],
				fileType: fileType,
				dir: dir,
				source: 'dialogue'
			});

			const response = await new Promise<{status: number, json?: any, text?: string}>((resolve, reject) => {
				const options: https.RequestOptions = {
					hostname: 'api.qianwen.com',
					path: '/dialog/downloadLink/batch',
					method: 'POST',
					headers: {
						'Accept': 'application/json, text/plain, */*',
						'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(requestBody),
						'Cookie': this.generateCookie(this.ticket),
						'Origin': 'https://www.qianwen.com',
						'Referer': 'https://www.qianwen.com/',
						'Sec-Ch-Ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
						'Sec-Ch-Ua-Mobile': '?0',
						'Sec-Ch-Ua-Platform': '"Windows"',
						'Sec-Fetch-Dest': 'empty',
						'Sec-Fetch-Mode': 'cors',
						'Sec-Fetch-Site': 'same-site',
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
						'X-Platform': 'pc_tongyi',
						'X-Deviceid': this.generateUUID(),
						'X-Xsrf-Token': this.generateUUID(),
					},
				};

				const req = https.request(options, (res) => {
					let responseData = '';
					
					res.on('data', (chunk) => {
						responseData += chunk;
					});
					
					res.on('end', () => {
						try {
							const json = JSON.parse(responseData);
							resolve({ status: res.statusCode || 0, json, text: responseData });
						} catch (error) {
							resolve({ status: res.statusCode || 0, text: responseData });
						}
					});
				});

				req.on('error', (error) => {
					reject(error);
				});

				req.write(requestBody);
				req.end();
			});

			if (response.status !== 200 || !response.json?.success) {
				const errorMsg = response.json?.errorMsg || response.text;
				Logger.error(`[FreeQwen] Download link batch failed: ${errorMsg}`);
				Logger.error(`[FreeQwen] Full response: ${JSON.stringify(response.json)}`);
				throw new Error(`Download link batch failed: ${errorMsg}`);
			}

			Logger.info(`[FreeQwen] Download link batch response: ${JSON.stringify(response.json)}`);

			const results = response.json.data?.results;
			if (!results || results.length === 0) {
				Logger.error(`[FreeQwen] No results in response.json.data.results`);
				throw new Error('No results returned from download link batch');
			}

			const result = results[0];
			Logger.info(`[FreeQwen] Got download link batch result: ${JSON.stringify(result)}`);

			return {
				signedUrl: result.url,
				docId: result.docId,
				fileId: result.fileId
			};
		} catch (error) {
			Logger.error('[FreeQwen] Failed to get download link batch:', error);
			throw error;
		}
	}

	/**
	 * 上传文件到 OSS（公共方法）
	 */
	private async uploadToOSS(fileData: ArrayBuffer, filename: string, mimeType: string): Promise<{ ossUrl: string; dir: string; fileKey: string }> {
		// 获取上传凭证
		const uploadParams = await this.acquireUploadParams();
		const { accessId, policy, signature, dir } = uploadParams;

		// 手动构建 multipart/form-data（按照测试脚本的顺序和格式）
		const boundary = '----WebKitFormBoundary' + this.generateUUID(false);
		const fileKey = `${dir}${filename}`;
		
		// 构建表单字段
		const textEncoder = new TextEncoder();
		const parts: Uint8Array[] = [];
		
		const addField = (name: string, value: string) => {
			parts.push(textEncoder.encode(
				`--${boundary}\r\n` +
				`Content-Disposition: form-data; name="${name}"\r\n\r\n` +
				`${value}\r\n`
			));
		};
		
		// 按照测试脚本的顺序添加字段
		addField('OSSAccessKeyId', accessId);
		addField('policy', policy);
		addField('signature', signature);
		addField('key', fileKey);
		addField('dir', dir);
		addField('success_action_status', '200');
		
		// 添加文件
		parts.push(textEncoder.encode(
			`--${boundary}\r\n` +
			`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
			`Content-Type: ${mimeType}\r\n\r\n`
		));
		parts.push(new Uint8Array(fileData));
		parts.push(textEncoder.encode(`\r\n--${boundary}--\r\n`));
		
		// 合并所有部分
		const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
		const postData = new Uint8Array(totalLength);
		let offset = 0;
		for (const part of parts) {
			postData.set(part, offset);
			offset += part.byteLength;
		}

		// 使用 Node.js https 模块上传到 OSS
		return new Promise((resolve, reject) => {
			const options: https.RequestOptions = {
				hostname: 'tongyi-main.oss-accelerate.aliyuncs.com',
				path: '/',
				method: 'POST',
				headers: {
					'Content-Type': `multipart/form-data; boundary=${boundary}`,
					'Content-Length': postData.byteLength,
					'X-Requested-With': 'XMLHttpRequest',
				},
			};

			const req = https.request(options, (res) => {
				let responseData = '';
				
				res.on('data', (chunk) => {
					responseData += chunk;
				});
				
				res.on('end', () => {
					if (res.statusCode === 200) {
						Logger.info(`[FreeQwen] Successfully uploaded to OSS: ${filename}`);
						
						// 根据测试脚本，返回不带签名的简单 URL
						const ossUrl = `https://tongyi-main.oss-accelerate.aliyuncs.com/${fileKey}`;
						
						Logger.info(`[FreeQwen] OSS URL: ${ossUrl}`);
						
						resolve({ ossUrl, dir, fileKey });
					} else {
						Logger.error(`[FreeQwen] OSS upload failed: status=${res.statusCode}, response:`, responseData);
						reject(new Error(`OSS upload failed: ${res.statusCode} - ${responseData}`));
					}
				});
			});

			req.on('error', (error) => {
				Logger.error(`[FreeQwen] OSS upload error:`, error);
				reject(error);
			});

			req.write(Buffer.from(postData.buffer));
			req.end();
		});
	}

	/**
	 * 上传图片到 OSS
	 * 图片流程：OSS上传（原始文件名） → /dialog/downloadLink（单数） → 直接使用
	 */
	private async uploadImage(fileData: ArrayBuffer, filename: string, mimeType: string, batchId: string): Promise<any> {
		// 1. 上传到 OSS（使用原始文件名）
		const { ossUrl, dir, fileKey } = await this.uploadToOSS(fileData, filename, mimeType);
		
		// 2. 调用 /dialog/downloadLink（单数，不是 batch）获取签名 URL
		Logger.info(`[FreeQwen] Getting download link for image: ${filename}`);
		const signedUrl = await this.getDownloadLink(filename, dir, 'image');
		
		// 图片不需要 file/add 注册，直接返回
		Logger.info(`[FreeQwen] Image uploaded successfully, using signed URL`);
		
		return {
			role: 'user',
			contentType: 'image',
			content: signedUrl,
		};
	}

	/**
	 * 上传文档（需要额外注册）
	 */
	private async uploadDocument(fileData: ArrayBuffer, filename: string, mimeType: string, batchId: string): Promise<any> {
		// 映射 MIME 类型（文档特有逻辑）
		const allowedMimeTypes = [
			'application/epub+zip', 'application/msword', 'application/octet-stream',
			'application/pdf', 'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'text/markdown', 'text/plain'
		];
		
		let uploadMimeType = mimeType;
		if (!allowedMimeTypes.includes(mimeType) && !mimeType.startsWith('image/') && !mimeType.startsWith('audio/') && !mimeType.startsWith('video/')) {
			Logger.info(`[FreeQwen] MIME type ${mimeType} not in OSS allow list, using application/octet-stream`);
			uploadMimeType = 'application/octet-stream';
		}

		// 上传到 OSS
		const { ossUrl, dir } = await this.uploadToOSS(fileData, filename, uploadMimeType);

		// 1. 获取签名 URL 和 docId/fileId（通过 downloadLink/batch API）
		Logger.info(`[FreeQwen] Getting download link batch for document: ${filename}`);
		const { signedUrl, docId, fileId } = await this.getDownloadLinkBatch(filename, dir, 'file');
		
		// 2. 使用获取到的 docId 和 fileId 注册文件
		Logger.info(`[FreeQwen] Registering document with docId=${docId}, fileId=${fileId}`);
		const fileExt = filename.split('.').pop() || 'dat';

		const requestBody = JSON.stringify({
			workSource: 'chat',
			terminal: 'web',
			workCode: '0',
			channel: 'home',
			workType: 'file',
			module: 'uploadhistory',
			workName: filename,
			workId: docId,
			workResourcePath: signedUrl,
			sessionId: '',
			batchId: this.generateUUID().replace(/-/g, ''),
			fileId: fileId,
			fileSize: fileData.byteLength
		});

		// 使用 Node.js https 模块调用 file/add API
		const addFileResponse = await new Promise<{success: boolean, data?: any, errorMsg?: string}>((resolve, reject) => {
			const options: https.RequestOptions = {
				hostname: 'api.qianwen.com',
				path: '/assistant/api/chat/file/add',
				method: 'POST',
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(requestBody),
					'Cookie': this.generateCookie(this.ticket),
					'Origin': 'https://www.qianwen.com',
					'Referer': 'https://www.qianwen.com/chat',
					'Sec-Ch-Ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
					'Sec-Ch-Ua-Mobile': '?0',
					'Sec-Ch-Ua-Platform': '"macOS"',
					'Sec-Fetch-Dest': 'empty',
					'Sec-Fetch-Mode': 'cors',
					'Sec-Fetch-Site': 'same-site',
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
					'X-Platform': 'pc_tongyi',
				},
			};

			const req = https.request(options, (res) => {
				let responseData = '';
				
				res.on('data', (chunk) => {
					responseData += chunk;
				});
				
				res.on('end', () => {
					try {
						const jsonResponse = JSON.parse(responseData);
						resolve(jsonResponse);
					} catch (error) {
						Logger.error(`[FreeQwen] Failed to parse file/add response:`, responseData);
						reject(new Error(`Failed to parse response: ${responseData}`));
					}
				});
			});

			req.on('error', (error) => {
				Logger.error(`[FreeQwen] file/add request error:`, error);
				reject(error);
			});

			req.write(requestBody);
			req.end();
		});

		if (!addFileResponse.success) {
			const errorMsg = addFileResponse.errorMsg || 'Unknown error';
			Logger.error(`[FreeQwen] Document add failed: ${errorMsg}`);
			throw new Error(`Document add failed: ${errorMsg}`);
		}

		const resultData = addFileResponse.data;
		Logger.info(`[FreeQwen] Document uploaded successfully: workId=${resultData.workId}, recordId=${resultData.recordId}`);

		// 返回格式化的文档引用（使用签名 URL 和从 batch API 获取的 IDs）
		return {
			role: 'user',
			contentType: 'file',
			content: signedUrl,
			fileId: fileId,
			fileName: filename,
			fileSize: fileData.byteLength
		};
	}	/**
	 * 生成类似雪花 ID 的唯一标识
	 */
	private generateSnowflakeId(): string {
		// 使用时间戳 + 随机数生成类似雪花 ID 的数字字符串
		const timestamp = Date.now();
		const random = Math.floor(Math.random() * 10000);
		return `${timestamp}${random.toString().padStart(4, '0')}`;
	}

	private async prepareMessages(messages: ChatMessage[], batchId: string, isRefConv: boolean = false): Promise<{contents: any[], registeredBatchId?: string}> {
		// 提取并上传图片和文件（只从最后一条消息中提取）
		const files = this.extractFileUrls(messages);
		const fileRefs = [];
		let registeredBatchId: string | undefined;
		
		if (files.length > 0) {
			// 去重：基于内容去重，优先保留 image 类型
			const fileMap = new Map<string, {url: string, type: 'image' | 'file'}>();
			
			for (const file of files) {
				let key = file.url;
				// 对于 base64 数据，使用数据载荷作为 key（忽略 MIME 类型差异）
				if (file.url.startsWith('data:')) {
					const matches = file.url.match(/base64,(.+)$/);
					if (matches) key = matches[1];
				}
				
				// 如果 key 已存在，仅当当前是 image 且已存在的是 file 时才覆盖
				// (对于相同内容的图片，优先使用 image 类型处理，避免走文档上传流程)
				if (fileMap.has(key)) {
					const existing = fileMap.get(key)!;
					if (existing.type === 'file' && file.type === 'image') {
						fileMap.set(key, file);
					}
					// 如果已存在的是 image，保持不变（不被 file 覆盖）
				} else {
					fileMap.set(key, file);
				}
			}
			
			const uniqueFiles = Array.from(fileMap.values());
			
			if (uniqueFiles.length < files.length) {
				Logger.info(`[FreeQwen] Deduplicated ${files.length - uniqueFiles.length} duplicate file(s) (kept ${uniqueFiles.length})`);
			}
			
			Logger.info(`[FreeQwen] Uploading ${uniqueFiles.length} file(s)...`);
			
			// 不要捕获上传错误，让它向上抛出，由 retryWithBackoff 处理重试
			const uploadPromises = uniqueFiles.map(file => this.uploadFile(file.url, batchId, file.type));
			const uploadedFiles = await Promise.all(uploadPromises);
			// 过滤掉 null（不支持的类型会返回 null，使用本地解析内容）
			const validFiles = uploadedFiles.filter(f => f !== null);
			fileRefs.push(...validFiles);
			
			// 收集 registeredBatchId（从第一个有效文件中获取）
			for (const file of validFiles) {
				if (file.registeredBatchId) {
					registeredBatchId = file.registeredBatchId;
					break;
				}
			}
			
			if (uploadedFiles.some(f => f === null)) {
				Logger.info('[FreeQwen] Some files were skipped for cloud upload and will use local parsed content instead');
			}
			
			Logger.info(`[FreeQwen] Successfully uploaded ${fileRefs.length} file(s)`);
			fileRefs.forEach((ref, i) => {
				Logger.debug(`[FreeQwen] File ${i + 1}:`, JSON.stringify(ref, null, 2));
			});
		}

		// Qwen API: only send current message (usually just 1 message)
		// The backend maintains conversation history via sessionId
		const result: any[] = [];
		
		for (const message of messages) {
			let content = '';
			
			// 提取文本内容
			if (typeof message.content === 'string') {
				content = message.content;
			} else if (Array.isArray(message.content)) {
				// 处理多模态内容 - 只提取文本部分
				const textParts = message.content
					.filter(item => item.type === 'text')
					.map(item => (item as any).text || '')
					.join('\n');
				content = textParts;
			}
			
			// 如果有文件上传，但用户没有明确指令，添加默认提示
			if (fileRefs.length > 0) {
				const hasImages = fileRefs.some(f => f.contentType === 'image');
				const hasFiles = fileRefs.some(f => f.contentType === 'file');
				let enhancement = '';
				
				if (hasImages && hasFiles) {
					enhancement = '请综合分析上下文中的文本内容、上传的图片和文档。文本内容通常是笔记的正文，图片和文档是附件。请将它们作为一个整体进行解读，不要仅关注附件，也不要遗漏任何一方。';
				} else if (hasImages) {
					enhancement = '请综合分析上下文中的文本内容和上传的图片。文本内容通常是笔记的正文，图片是笔记中的插图。请将它们作为一个整体进行解读，不要仅关注图片，也不要遗漏文本信息。';
				} else if (hasFiles) {
					enhancement = '请综合分析上下文中的文本内容和上传的文档。请将它们作为一个整体进行解读，不要仅关注文档，也不要遗漏文本信息。';
				}

				if (!content || content.trim().length < 10) {
					content = enhancement;
					Logger.info(`[FreeQwen] Enhanced prompt for file upload (empty/short): "${content}"`);
				} else if (content.startsWith('Referenced file:')) {
					// 对于自动生成的文件引用消息，追加提示词以确保模型关注上下文
					content = `${content}\n\n${enhancement}`;
					Logger.info(`[FreeQwen] Enhanced prompt for file upload (referenced file): "${content}"`);
				} else {
					Logger.debug(`[FreeQwen] Using original user content: "${content.substring(0, 50)}..."`);
				}
			}
			
			// 添加消息到结果数组
			result.push({
				content,
				contentType: 'text',
				role: message.role || 'user',
			});
		}
		
		// 文件引用添加到最后（属于当前消息）
		result.push(...fileRefs);
		
		Logger.debug(`[FreeQwen] Prepared ${result.length} content items (${messages.length} messages + ${fileRefs.length} files)`);
		
		return { contents: result, registeredBatchId };
	}

	/**
	 * 发送非流式消息（使用 requestUrl）
	 */
	async sendMessage(messages: ChatMessage[], tools?: UnifiedTool[], systemMessage?: string): Promise<LLMResponse> {
		await this.checkRateLimit();

		const requestId = this.generateUUID();
		const startTime = Date.now();

		Logger.info('[FreeQwen] Sending non-streaming message');

		return this.retryWithBackoff(async () => {
			// 准备请求数据
			const { contents, registeredBatchId } = await this.prepareMessages(messages, '', false);
			const requestData = {
				mode: 'chat',
				model: this.getInternalModelName(this.model),
				action: 'next',
				userAction: 'chat',
				requestId: this.generateUUID(false),
				sessionId: '',
				sessionType: 'text_chat',
				parentMsgId: '',
				params: {
					searchType: '',
					...(registeredBatchId ? { fileUploadBatchId: registeredBatchId } : {}),
				},
				contents,
			};

			if (systemMessage) {
				// For Free Qwen, we always try to merge system message into the first user message
				// because the "system" role is often ignored or not supported by the web-based API.
				const userTextItem = requestData.contents.find(c => c.role === 'user' && c.contentType === 'text');
				if (userTextItem) {
					userTextItem.content = `${systemMessage}\n\n${userTextItem.content}`;
					Logger.info('[FreeQwen] Merged system message into user message for better instruction following');
				} else {
					// Fallback if no user text found, use 'user' role instead of 'system' for better compatibility
					requestData.contents.unshift({
						content: systemMessage,
						contentType: 'text',
						role: 'user',
					});
				}
			}

			Logger.debug('[FreeQwen] Non-streaming conversation REQUEST:', {
				url: 'https://api.qianwen.com/dialog/conversation',
				model: `${this.model} -> ${requestData.model}`,
				data: requestData
			});

			// 使用 requestUrl 发送请求
			const response = await requestUrl({
				url: 'https://api.qianwen.com/dialog/conversation',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': this.generateCookie(this.ticket),
					'Accept': 'text/event-stream',
					'Accept-Language': 'zh-CN,zh;q=0.9',
					'Origin': 'https://www.qianwen.com',
					'Referer': 'https://www.qianwen.com/',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'X-Platform': 'pc_tongyi',
					'X-Xsrf-Token': this.generateUUID(),
				},
				body: JSON.stringify(requestData),
				throw: false,
			});

			if (response.status !== 200) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			// 解析 SSE 响应
			const responseText = response.text;
			const lines = responseText.split('\n');
			let fullContent = '';
			let conversationId = '';

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				
				const data = line.slice(6).trim();
				if (data === '[DONE]' || data === '[heartbeat]') continue;

				try {
					const parsed = JSON.parse(data);
					
					if (!conversationId && parsed.sessionId && parsed.msgId) {
						conversationId = `${parsed.sessionId}-${parsed.msgId}`;
					}

					if (parsed.contents && Array.isArray(parsed.contents)) {
						for (const content of parsed.contents) {
							if (content.contentType === 'text' && content.role === 'assistant') {
								fullContent = content.content || fullContent;
							}
						}
					}
				} catch (parseError) {
					Logger.warn('[FreeQwen] Failed to parse SSE line:', parseError);
				}
			}

			// 存储会话状态
			if (conversationId) {
				const parts = conversationId.split('-');
				if (parts.length >= 2) {
					this.sessionId = parts[0];
					this.lastMessageId = parts[1];
					Logger.info(`[FreeQwen] Stored session state: sessionId=${this.sessionId}, msgId=${this.lastMessageId}`);
				}
			}

			const duration = Date.now() - startTime;
			Logger.info(`[FreeQwen] Message completed in ${duration}ms`);

			return {
				content: fullContent,
				model: this.model,
				usage: {
					promptTokens: Math.ceil(fullContent.length / 4),
					completionTokens: Math.ceil(fullContent.length / 4),
					totalTokens: Math.ceil(fullContent.length / 2),
				},
				finishReason: 'stop',
				metadata: {
					provider: this.getProviderName(),
					conversationId: conversationId,
					rawResponse: { conversationId }
				}
			};
		});
	}

	/**
	 * 发送流式消息（使用 Fetch API）
	 */
	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		await this.checkRateLimit();

		Logger.info('[FreeQwen] Sending streaming message');

		return this.retryWithBackoff(async () => {
			// 准备请求数据
			const lastMessage = messages[messages.length - 1];
			const { contents, registeredBatchId } = await this.prepareMessages([lastMessage], '', false);
			const requestData = {
				mode: 'chat',
				model: this.getInternalModelName(this.model),
				action: 'next',
				userAction: 'chat',
				requestId: this.generateUUID(false),
				sessionId: this.sessionId || '',
				sessionType: 'text_chat',
				parentMsgId: this.lastMessageId || '',
				params: {
					searchType: '',
					...(registeredBatchId ? { fileUploadBatchId: registeredBatchId } : {}),
				},
				contents,
			};

			if (systemMessage) {
				// For Free Qwen, we always try to merge system message into the first user message
				// because the "system" role is often ignored or not supported by the web-based API.
				const userTextItem = requestData.contents.find(c => c.role === 'user' && c.contentType === 'text');
				if (userTextItem) {
					userTextItem.content = `${systemMessage}\n\n${userTextItem.content}`;
					Logger.info('[FreeQwen] Merged system message into user message for better instruction following');
				} else {
					// Fallback if no user text found, use 'user' role instead of 'system' for better compatibility
					requestData.contents.unshift({
						content: systemMessage,
						contentType: 'text',
						role: 'user',
					});
				}
			}

		Logger.debug('[FreeQwen] Streaming conversation REQUEST:', {
			url: 'https://api.qianwen.com/dialog/conversation',
			contentsCount: requestData.contents.length,
			contentsPreview: requestData.contents.map((c: any) => ({
				role: c.role,
				type: c.contentType,
				contentPreview: c.content // Print full content for debugging
			}))
		});

		// 使用 Node.js https 模块进行流式请求（避免 fetch 被 Electron 阻止）
		const requestBody = JSON.stringify(requestData);
		
		return new Promise<void>((resolve, reject) => {
			const options: https.RequestOptions = {
				hostname: 'api.qianwen.com',
				path: '/dialog/conversation',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(requestBody),
					'Cookie': this.generateCookie(this.ticket),
					'Accept': 'text/event-stream',
					'Accept-Language': 'zh-CN,zh;q=0.9',
					'Origin': 'https://www.qianwen.com',
					'Referer': 'https://www.qianwen.com/',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
					'X-Platform': 'pc_tongyi',
					'X-Xsrf-Token': this.generateUUID(),
				},
			};

			const req = https.request(options, (res) => {
				if (res.statusCode !== 200) {
					reject(new Error(`HTTP error! status: ${res.statusCode}`));
					return;
				}

				let buffer = '';
				let conversationId = '';
				let previousContent = '';

				onChunk({ delta: '', isComplete: false });

				res.on('data', (chunk) => {
					buffer += chunk.toString();
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (!line.startsWith('data: ')) continue;
						
						const data = line.slice(6).trim();
						if (data === '[DONE]' || data === '[heartbeat]') continue;

						try {
							const parsed = JSON.parse(data);
							
							if (!conversationId && parsed.sessionId && parsed.msgId) {
								conversationId = `${parsed.sessionId}-${parsed.msgId}`;
							}

							if (parsed.contents && Array.isArray(parsed.contents)) {
								for (const content of parsed.contents) {
									const isAssistant = content.role === 'assistant';
									const isTextType = content.contentType === 'text';
									const hasContent = content.content && typeof content.content === 'string';
									const isThinkingMarker = content.content === 'Thinking';
									
									if (!isAssistant || !isTextType || !hasContent || isThinkingMarker) {
										continue;
									}
									
									const currentContent = content.content;
									
									if (currentContent.length > previousContent.length) {
										const delta = currentContent.substring(previousContent.length);
										onChunk({ delta, isComplete: false });
										previousContent = currentContent;
									}
								}
							}							if (parsed.msgStatus === 'finished') {
								onChunk({
									delta: '',
									isComplete: true,
									usage: {
										promptTokens: Math.ceil(previousContent.length / 4),
										completionTokens: Math.ceil(previousContent.length / 4),
										totalTokens: Math.ceil(previousContent.length / 2),
									}
								});
							}
						} catch (parseError) {
							Logger.warn('[FreeQwen] Failed to parse SSE line:', parseError);
						}
					}
				});

				res.on('end', () => {
					// 存储会话状态
					if (conversationId) {
						const parts = conversationId.split('-');
						if (parts.length >= 2) {
							this.sessionId = parts[0];
							this.lastMessageId = parts[1];
							Logger.info(`[FreeQwen] Stored session state: sessionId=${this.sessionId}, msgId=${this.lastMessageId}`);
						}
					}
					resolve();
				});

				res.on('error', (error) => {
					Logger.error('[FreeQwen] Stream error:', error);
					reject(error);
				});
			});

			req.on('error', (error) => {
				Logger.error('[FreeQwen] Request error:', error);
				reject(error);
			});

			// 处理 abort signal
			if (abortSignal) {
				abortSignal.addEventListener('abort', () => {
					req.destroy();
					reject(new Error('Request aborted'));
				});
			}

			req.write(requestBody);
			req.end();
		});
		}); // 结束 retryWithBackoff
	}

	/**
	 * 验证 ticket 是否有效
	 */
	async validateTicket(): Promise<boolean> {
		try {
			const requestBody = JSON.stringify({});

			const response = await new Promise<{status: number, json?: any}>((resolve, reject) => {
				const options: https.RequestOptions = {
					hostname: 'api.qianwen.com',
					path: '/dialog/session/list',
					method: 'POST',
					headers: {
						'Cookie': this.generateCookie(this.ticket),
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(requestBody),
						...FreeQwenProviderImpl.FAKE_HEADERS,
					},
				};

				const req = https.request(options, (res) => {
					let responseData = '';
					
					res.on('data', (chunk) => {
						responseData += chunk;
					});
					
					res.on('end', () => {
						try {
							const json = JSON.parse(responseData);
							resolve({ status: res.statusCode || 0, json });
						} catch (error) {
							resolve({ status: res.statusCode || 0 });
						}
					});
				});

				req.on('error', (error) => {
					reject(error);
				});

				req.write(requestBody);
				req.end();
			});

			return response.status === 200 && response.json?.success === true;
		} catch (error) {
			Logger.error('[FreeQwen] Failed to validate ticket:', error);
			return false;
		}
	}
}
