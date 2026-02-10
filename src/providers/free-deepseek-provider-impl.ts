import { Logger } from '../utils/logger';
import { requestUrl } from 'obsidian';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';
import { calculatePoWHash } from '../utils/deepseek-hash';
import { WASM_BASE64 } from '../utils/sha3-wasm-data';
import * as https from 'https';
import * as zlib from 'zlib';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Free DeepSeek Provider - 使用免费的 DeepSeek 网页 API
 * 
 * 工作原理（基于 deepseek-free-api 和 deepseek4free 项目）：
 * 1. 不使用付费的 API Key，而是使用网页版 DeepSeek 的认证 token
 * 2. 通过浏览器登录 https://chat.deepseek.com 获取 authorization token
 * 3. 使用 HTTP/2 连接到 chat.deepseek.com/api/v0
 * 4. 使用 Bearer token 方式传递 token 进行认证
 * 5. 支持 PoW (Proof of Work) 挑战机制
 * 6. 接收 SSE 流式响应并转换为标准格式
 * 
 * 支持的模型：
 * - deepseek-chat: 默认聊天模型
 * - deepseek-reasoner/deepseek-think/deepseek-r1: 深度思考模型（R1）
 * - deepseek-search: 联网搜索模式
 * - deepseek-r1-search/deepseek-think-search: 深度思考 + 联网搜索
 * - deepseek-think-silent/deepseek-r1-silent: 静默模式（不输出思考过程）
 * 
 * 获取 token 的方法：
 * 1. 访问 https://chat.deepseek.com
 * 2. 登录后打开浏览器开发者工具 (F12)
 * 3. 在 Application > Local Storage 中找到 userToken 的 value
 * 4. 或者在 Network 请求头中找到 authorization token (去掉 'Bearer ' 前缀)
 */
export class FreeDeepseekProviderImpl extends BaseLLMProvider {
	private authToken: string;
	private cookies: Record<string, string> = {};
	private wasmBuffer: ArrayBuffer | null = null;
	private wasmLoadingPromise: Promise<void> | null = null;
	
	// Use a static cache keyed by threadId to persist sessions across provider instances
	private static sessionCache: Map<string, { sessionId: string, lastMessageId: number | null }> = new Map();

	private get sessionId(): string | null {
		if (!this.currentThreadId) return null;
		return FreeDeepseekProviderImpl.sessionCache.get(this.currentThreadId)?.sessionId || null;
	}

	private set sessionId(value: string | null) {
		if (!this.currentThreadId) return;
		const state = FreeDeepseekProviderImpl.sessionCache.get(this.currentThreadId) || { sessionId: '', lastMessageId: null };
		state.sessionId = value || '';
		FreeDeepseekProviderImpl.sessionCache.set(this.currentThreadId, state);
	}

	private get lastMessageId(): number | null {
		if (!this.currentThreadId) return null;
		return FreeDeepseekProviderImpl.sessionCache.get(this.currentThreadId)?.lastMessageId ?? null;
	}

	private set lastMessageId(value: number | null) {
		if (!this.currentThreadId) return;
		const state = FreeDeepseekProviderImpl.sessionCache.get(this.currentThreadId) || { sessionId: '', lastMessageId: null };
		state.lastMessageId = value;
		FreeDeepseekProviderImpl.sessionCache.set(this.currentThreadId, state);
	}

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
		'accept': '*/*',
		'accept-language': 'en,fr-FR;q=0.9,fr;q=0.8,es-ES;q=0.7,es;q=0.6,en-US;q=0.5,am;q=0.4,de;q=0.3',
		'content-type': 'application/json',
		'origin': 'https://chat.deepseek.com',
		'referer': 'https://chat.deepseek.com/',
		'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
		'x-app-version': '20241129.1',
		'x-client-locale': 'en_US',
		'x-client-platform': 'web',
		'x-client-version': '1.0.0-always',
	};

	constructor(config: {
		apiKey: string; // 这里的 apiKey 实际是 DeepSeek authorization token
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
			baseUrl: 'https://chat.deepseek.com'
		});
		
		// apiKey 在这里实际上是 authorization token
		this.authToken = config.apiKey;
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
		// Free DeepSeek 不需要初始化 AI SDK，因为我们直接使用 HTTP/2
		this.model_config = { initialized: true };
		// Load WASM immediately during initialization
		this.loadWasmFile().catch(error => {
			Logger.error('[FreeDeepseek] Failed to load WASM during initialization:', error);
		});
	}
	
	/**
	 * Load WASM from embedded base64 data
	 */
	private async loadWasmFile(): Promise<void> {
		// Return existing loading promise if already in progress
		if (this.wasmLoadingPromise) {
			return this.wasmLoadingPromise;
		}

		// Already loaded
		if (this.wasmBuffer) {
			return Promise.resolve();
		}

		// Start loading
		this.wasmLoadingPromise = (async () => {
			try {
				Logger.info('[FreeDeepseek] Loading embedded WASM...');
				
				// Decode base64 to binary
				const binaryString = atob(WASM_BASE64);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				this.wasmBuffer = bytes.buffer;
				
				Logger.info(`[FreeDeepseek] ✅ WASM loaded successfully (${this.wasmBuffer.byteLength} bytes)`);
			} catch (error) {
				Logger.error('[FreeDeepseek] Failed to load WASM:', error);
				this.wasmLoadingPromise = null; // Reset to allow retry
				throw error;
			} finally {
				this.wasmLoadingPromise = null;
			}
		})();

		return this.wasmLoadingPromise;
	}

	protected getAISDKModel(): unknown {
		// Not used for Free DeepSeek
		throw new Error('Free DeepSeek does not use AI SDK');
	}

	protected getEndpointForLogging(): string {
		return 'https://chat.deepseek.com/api/v0/chat/completion';
	}

	getProviderName(): string {
		return 'free-deepseek';
	}

	supportsVision(): boolean {
		// Free providers do not expose vision configuration
		// Default to false for safety
		Logger.debug(`[Free DeepSeek] Vision support not configurable, defaulting to false`);
		return false;
	}

	async listModels(): Promise<string[]> {
		// 根据 deepseek-free-api 项目文档，DeepSeek 支持的模型
		return [
			'deepseek-chat',           // 默认：DeepSeek 主力聊天模型
			'deepseek-reasoner',       // DeepSeek R1 推理模型（深度思考）
			'deepseek-think',          // 深度思考模式
			'deepseek-r1',             // R1 模型（深度思考）
			'deepseek-search',         // 联网搜索模式
			'deepseek-r1-search',      // 深度思考 + 联网搜索
			'deepseek-think-search',   // 深度思考 + 联网搜索
			'deepseek-think-silent',   // 静默模式（不输出思考过程）
			'deepseek-r1-silent',      // R1 静默模式
			'deepseek-search-silent',  // 搜索静默模式
		];
	}

	/**
	 * 创建代理 agent（如果启用了代理）
	 */
	private createProxyAgent(): https.Agent | undefined {
		// 检查是否明确启用了代理
		if (!this.proxyEnabled) {
			Logger.debug('[FreeDeepseek] 代理已禁用，使用直连');
			return undefined;
		}

		if (!this.proxyHost || !this.proxyPort) {
			Logger.warn('[FreeDeepseek] 代理已启用但未配置主机或端口');
			return undefined;
		}

		try {
			const proxyAuth = this.proxyAuth && this.proxyUsername && this.proxyPassword 
				? `${this.proxyUsername}:${this.proxyPassword}@` 
				: '';
			
			if (this.proxyType === 'socks5') {
				const proxyUrl = `socks5://${proxyAuth}${this.proxyHost}:${this.proxyPort}`;
				Logger.info(`[FreeDeepseek] ✓ 创建 SOCKS5 代理 Agent: ${this.proxyHost}:${this.proxyPort}`);
				const agent = new SocksProxyAgent(proxyUrl);
				Logger.info(`[FreeDeepseek] ✓ SOCKS5 代理 Agent 创建成功`);
				return agent;
			} else {
				// http or https proxy
				const protocol = this.proxyType || 'http';
				const proxyUrl = `${protocol}://${proxyAuth}${this.proxyHost}:${this.proxyPort}`;
				Logger.info(`[FreeDeepseek] ✓ 创建 ${protocol.toUpperCase()} 代理 Agent: ${this.proxyHost}:${this.proxyPort}`);
				const agent = new HttpsProxyAgent(proxyUrl);
				Logger.info(`[FreeDeepseek] ✓ ${protocol.toUpperCase()} 代理 Agent 创建成功`);
				return agent;
			}
		} catch (error) {
			Logger.error('[FreeDeepseek] ✗ 创建代理 Agent 失败:', error);
			Logger.error('[FreeDeepseek] 将回退到直连模式');
			return undefined;
		}
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
	 * 生成 Cookie 字符串
	 */
	private generateCookie(): string {
		const timestamp = Date.now();
		const unixTime = Math.floor(timestamp / 1000);
		const randomHex = (len: number) => Array.from({ length: len }, () => 
			Math.floor(Math.random() * 16).toString(16)).join('');
		const uuid = () => this.generateUUID(false);
		
		return `intercom-HWWAFSESTIME=${timestamp}; HWWAFSESID=${randomHex(18)}; Hm_lvt_${uuid()}=${unixTime},${unixTime},${unixTime}; Hm_lpvt_${uuid()}=${unixTime}; _frid=${uuid()}; _fr_ssid=${uuid()}; _fr_pvid=${uuid()}`;
	}

	/**
	 * 准备消息内容（基于 deepseek-free-api 的 messagesPrepare 实现）
	 */
	private messagesPrepare(messages: ChatMessage[]): string {

		// 处理消息内容
		const processedMessages = messages.map((message, idx) => {
			let text: string;
			if (Array.isArray(message.content)) {
				// 过滤出 type 为 "text" 的项并连接文本
				// 注意：跳过 file/image 类型以避免处理大型 base64 数据
				const texts = message.content
					.filter((item: any) => item.type === "text")
					.map((item: any) => item.text);
				text = texts.join('\n');

			} else {
				text = String(message.content);

			}
			return { role: message.role, text };
		});

		if (processedMessages.length === 0) return '';

		// 合并连续相同角色的消息
		const mergedBlocks: { role: string; text: string }[] = [];
		let currentBlock = { ...processedMessages[0] };

		for (let i = 1; i < processedMessages.length; i++) {
			const msg = processedMessages[i];
			if (msg.role === currentBlock.role) {
				currentBlock.text += `\n\n${msg.text}`;
			} else {
				mergedBlocks.push(currentBlock);
				currentBlock = { ...msg };
			}
		}
		mergedBlocks.push(currentBlock);

		// 添加标签并连接结果
		return mergedBlocks
			.map((block, index) => {
				if (block.role === "assistant") {
					return `<｜Assistant｜>${block.text}<｜end▁of▁sentence｜>`;
				}
				
				if (block.role === "user" || block.role === "system") {
					return index > 0 ? `<｜User｜>${block.text}` : block.text;
				}

				return block.text;
			})
			.join('')
			.replace(/\!\[.+\]\(.+\)/g, "");
	}

	/**
	 * 提取消息中的图片和文件 URL
	 */
	private extractFileUrls(messages: ChatMessage[]): Array<{url: string, type: 'image' | 'file', filename?: string}> {
		const files: Array<{url: string, type: 'image' | 'file', filename?: string}> = [];
		
		// 只处理最新的消息
		if (!messages.length) return files;
		
		const lastMessage = messages[messages.length - 1];
		if (Array.isArray(lastMessage.content)) {
			lastMessage.content.forEach((item: any) => {
				// 支持系统内部格式: { type: 'image', source: { type: 'base64', media_type: '...', data: '...' } }
				if (item.type === 'image' && item.source?.type === 'base64') {
					// 将 base64 数据转换为 data URL 格式
					const dataUrl = `data:${item.source.media_type};base64,${item.source.data}`;
					files.push({url: dataUrl, type: 'image', filename: item.filename});
				}
				// 兼容 OpenAI 格式: { type: 'image_url', image_url: { url: '...' } }
				else if (item.type === 'image_url' && item.image_url?.url) {
					files.push({url: item.image_url.url, type: 'image', filename: item.filename});
				}
				// 支持文件格式: { type: 'file', file_url: { url: '...' } }
				else if (item.type === 'file' && item.file_url?.url) {
					files.push({url: item.file_url.url, type: 'file', filename: item.filename});
				}
			});
		}

		// Log files summary without large base64 data
		if (files.length > 0) {
			files.forEach((f, i) => {

			});
		}

		return files;
	}

	/**
	 * 上传文件到DeepSeek（仅支持base64数据，不下载远程文件）
	 */
	private async uploadFile(fileUrl: string, fileType: 'image' | 'file' = 'image', originalFilename?: string, sessionId?: string, cookie?: string): Promise<any> {
		try {
			
			const isBase64 = fileUrl.startsWith('data:');
			
			// 只支持 base64 格式，不下载远程文件
			if (!isBase64) {
				Logger.warn('[FreeDeepseek] Remote file URLs are not supported, skipping:', fileUrl);
				throw new Error('Only base64 encoded files are supported. Please embed the file as base64 data.');
			}
			
			const matches = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
			if (!matches) {
				throw new Error('Invalid base64 file format');
			}
			
			let mimeType = matches[1];
			const base64Data = matches[2];

			// 修正旧版 Office MIME types 为新版
			const mimeTypeMap: Record<string, string> = {
				'application/vnd.ms-powerpoint': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'application/msword': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'application/vnd.ms-excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			};
			
			// 如果有原始文件名，根据扩展名判断正确的 MIME type
			if (originalFilename) {

				const ext = originalFilename.toLowerCase().split('.').pop();

				if (ext === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
				else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
				else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
				else if (ext === 'ppt') mimeType = 'application/vnd.ms-powerpoint';
				else if (ext === 'doc') mimeType = 'application/msword';
				else if (ext === 'xls') mimeType = 'application/vnd.ms-excel';

			} else {

				if (mimeTypeMap[mimeType]) {
					// 自动修正旧 MIME type
					const oldMimeType = mimeType;
					mimeType = mimeTypeMap[mimeType];

				} else {

				}
			}
			
			const binaryString = atob(base64Data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			const fileData = bytes.buffer;
			
			// Use original filename if provided, otherwise generate one
			let filename: string;
			if (originalFilename) {
				filename = originalFilename;
			} else {
				const ext = mimeType.split('/')[1] || 'png';
				filename = `${this.generateUUID()}.${ext}`;
			}

		// 获取 PoW challenge 用于文件上传 - 必须指定正确的 target_path
		Logger.info('[FreeDeepseek] Getting PoW challenge for file upload...');
		const challenge = await this.getPowChallenge('/api/v0/file/upload_file');
		Logger.info('[FreeDeepseek] File upload PoW challenge:', { algorithm: challenge.algorithm, difficulty: challenge.difficulty });
		const powResponse = await this.solvePowChallenge(challenge, '/api/v0/file/upload_file');
		Logger.info('[FreeDeepseek] File upload PoW solved, response length:', powResponse.length);
		
		// 构建multipart/form-data
		const boundary = `----WebKitFormBoundary${this.generateUUID(false)}`;
		const formParts: Uint8Array[] = [];

		// 添加文件部分 - 严格按照 RFC 2388 格式
		const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
		formParts.push(new TextEncoder().encode(fileHeader));
		formParts.push(new Uint8Array(fileData));
		formParts.push(new TextEncoder().encode(`\r\n--${boundary}--\r\n`));

		const totalLength = formParts.reduce((sum, part) => sum + part.length, 0);
		const formData = new Uint8Array(totalLength);
		let offset = 0;
		for (const part of formParts) {
			formData.set(part, offset);
			offset += part.length;
		}
		

		// 直接上传到DeepSeek API
		Logger.info('[FreeDeepseek] Uploading file:', {
			filename,
			mimeType,
			size: fileData.byteLength,
			powResponseLength: powResponse.length,
			boundaryLength: boundary.length,
			formDataSize: formData.length
		});
		
		// Log PoW response for debugging
		
		// Decode and log PoW response structure
		try {
			const powData = JSON.parse(atob(powResponse));

		} catch (e) {
			Logger.error('[FreeDeepseek] Failed to decode PoW:', e);
		}
		
		// 构建 URL - 文件上传不需要 session ID（根据浏览器行为）
		const uploadUrl = 'https://chat.deepseek.com/api/v0/file/upload_file';
		
		const uploadResponse = await requestUrl({
			url: uploadUrl,
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.authToken}`,
				'Content-Type': `multipart/form-data; boundary=${boundary}`,
				'Cookie': cookie || this.generateCookie(),
				'x-ds-pow-response': powResponse,
				'x-file-size': fileData.byteLength.toString(),
				'x-app-version': '20241129.1',
				'x-client-locale': 'zh_CN',
				'x-client-platform': 'web',
				'x-client-version': '1.5.0',
			},
			body: formData.buffer,
			throw: false,
		});
		
		Logger.info('[FreeDeepseek] Upload response status:', uploadResponse.status);

		if (uploadResponse.status !== 200) {
			const errorText = uploadResponse.text || JSON.stringify(uploadResponse.json);
			Logger.error(`[FreeDeepseek] File upload failed: status=${uploadResponse.status}, response:`, errorText);
			throw new Error(`File upload failed: ${uploadResponse.status}`);
		}

	// 解析响应
	const result = uploadResponse.json;
	
	// Log the actual data content
	if (result.data) {

	}
	
	if (result.code !== 0) {
		Logger.error('[FreeDeepseek] Upload response error:', result);
		throw new Error(`Upload error: ${result.msg || 'Unknown error'}`);
	}
	
	// Try both biz_data and direct data access
	const fileInfo = result.data?.biz_data || result.data;
	if (!fileInfo || !fileInfo.id) {
		Logger.error('[FreeDeepseek] Upload response missing file ID:', result);
		throw new Error('Upload response missing file information');
	}

	Logger.info(`[FreeDeepseek] File uploaded successfully: ${fileInfo.id}, status: ${fileInfo.status}`);
	
	// 如果文件状态是 PENDING，轮询检查直到状态变为 SUCCESS
	if (fileInfo.status === 'PENDING') {

		await new Promise(resolve => setTimeout(resolve, 10000));
		
		const maxAttempts = 15; // 最多检查 15 次（30 秒）
		let attempts = 0;
		let fileStatus = 'PENDING';
		
		while (fileStatus === 'PENDING' && attempts < maxAttempts) {
			attempts++;
			
			try {
				// 检查文件状态 API（不需要 PoW header）
				const statusResponse = await requestUrl({
					url: `https://chat.deepseek.com/api/v0/file/fetch_files?file_ids=${fileInfo.id}`,
					method: 'GET',
					headers: {
						'authorization': `Bearer ${this.authToken}`,
						'Cookie': cookie || this.generateCookie(),
						...FreeDeepseekProviderImpl.FAKE_HEADERS,
					},
					throw: false,
				});
				
				if (statusResponse.status === 200) {
					const statusResult = statusResponse.json;
					if (statusResult?.data?.biz_data?.files?.[0]) {
						fileStatus = statusResult.data.biz_data.files[0].status;

						if (fileStatus === 'SUCCESS') {

							break;
						} else if (fileStatus === 'FAILED') {
							throw new Error('File processing failed');
						}
					}
				} else {
					Logger.warn(`[FreeDeepseek] Status check returned ${statusResponse.status}`);
				}
				} catch (error) {
					Logger.error('[FreeDeepseek] Error checking file status:', error);
				}			// 等待 2 秒后再次检查
			if (fileStatus === 'PENDING') {
				await new Promise(resolve => setTimeout(resolve, 2000));
			}
		}
		
		if (fileStatus !== 'SUCCESS') {
			Logger.warn(`[FreeDeepseek] File status is still ${fileStatus} after ${attempts} attempts`);
		}
	}
	
	// 返回文件ID
	return {
		id: fileInfo.id,
				name: fileInfo.file_name,
				type: fileType,
				size: fileInfo.file_size,
				status: fileInfo.status
			};
		} catch (error) {
			Logger.error('[FreeDeepseek] Failed to upload file:', error);
			throw error;
		}
	}

	/**
	 * 获取 PoW 挑战
	 */
	private async getPowChallenge(targetPath: string = '/api/v0/chat/completion'): Promise<any> {
		try {
			const response = await requestUrl({
				url: 'https://chat.deepseek.com/api/v0/chat/create_pow_challenge',
				method: 'POST',
				headers: {
					'authorization': `Bearer ${this.authToken}`,
					...FreeDeepseekProviderImpl.FAKE_HEADERS,
				},
				body: JSON.stringify({ target_path: targetPath }),
				throw: false,
			});

			if (response.status !== 200) {
				throw new Error(`Failed to get PoW challenge: ${response.status}`);
			}

			const result = response.json;
			if (!result.data?.biz_data?.challenge) {
				throw new Error('Invalid PoW challenge response');
			}

			return result.data.biz_data.challenge;
		} catch (error) {
			Logger.error('[FreeDeepseek] Failed to get PoW challenge:', error);
			throw error;
		}
	}

	/**
	 * 创建会话
	 */
	private async createSession(): Promise<string> {
		try {
			const response = await requestUrl({
				url: 'https://chat.deepseek.com/api/v0/chat_session/create',
				method: 'POST',
				headers: {
					'authorization': `Bearer ${this.authToken}`,
					...FreeDeepseekProviderImpl.FAKE_HEADERS,
				},
				body: JSON.stringify({ character_id: null }),
				throw: false,
			});

			if (response.status === 403) {
				const errorMsg = 'Token验证失败 (403)。请检查:\n' +
					'1. Token是否已过期 - 请重新登录 https://chat.deepseek.com 获取新token\n' +
					'2. Token格式是否正确 - 应该是 JWT 格式\n' +
					'3. 网络是否正常 - DeepSeek可能限制了某些地区访问\n' +
					'4. 请求是否过于频繁 - 稍后再试';
				Logger.error('[FreeDeepseek]', errorMsg);
				throw new Error(errorMsg);
			}

			if (response.status !== 200) {
				const errorDetail = response.text ? `\n响应: ${response.text.substring(0, 200)}` : '';
				throw new Error(`Failed to create session: ${response.status}${errorDetail}`);
			}

			const result = response.json;
			if (!result.data?.biz_data?.id) {
				Logger.error('[FreeDeepseek] Invalid response structure:', result);
				throw new Error('Invalid session creation response');
			}

			Logger.info(`[FreeDeepseek] ✅ Session created: ${result.data.biz_data.id}`);
			return result.data.biz_data.id;
		} catch (error) {
			Logger.error('[FreeDeepseek] Failed to create session:', error);
			throw error;
		}
	}

	/**
	 * 获取或创建会话 ID（复用现有会话）
	 */
	private async getOrCreateSession(): Promise<string> {
		if (this.sessionId) {
			Logger.info(`[FreeDeepseek] 复用现有会话: ${this.sessionId}`);
			return this.sessionId;
		}
		
		this.sessionId = await this.createSession();
		this.lastMessageId = null; // 新会话，重置消息 ID
		Logger.info(`[FreeDeepseek] 创建新会话: ${this.sessionId}`);
		return this.sessionId;
	}

	/**
	 * 清除会话（开始新对话时调用）
	 */
	clearSession(): void {
		if (this.sessionId) {
			Logger.info(`[FreeDeepseek] 清除会话: ${this.sessionId}`);
		}
		this.sessionId = null;
		this.lastMessageId = null;
	}

	/**
	 * 设置 lastMessageId（用于编辑消息场景）
	 * @param messageId 要设置的消息 ID，如果为 null 则重置
	 */
	setLastMessageId(messageId: number | null): void {
		this.lastMessageId = messageId;
		Logger.info(`[FreeDeepseek] 手动设置 lastMessageId: ${messageId}`);
	}

	/**
	 * 解决 PoW 挑战
	 */
	private async solvePowChallenge(challenge: any, targetPath: string): Promise<string> {
		try {
			const { algorithm, challenge: challengeStr, salt, difficulty, expire_at, signature } = challenge;
			
			// Ensure WASM is loaded (this will wait if loading is in progress)
			await this.loadWasmFile();
			
			if (!this.wasmBuffer) {
				throw new Error('Failed to load WASM file');
			}
			
			// 使用 WASM 计算 PoW 答案
			// Only pass wasmBuffer on first call - singleton will reuse the instance
			const answer = await calculatePoWHash(
				algorithm,
				challengeStr,
				salt,
				difficulty,
				expire_at,
				this.wasmBuffer // Singleton pattern will handle initialization once
			);
			
			if (answer === undefined) {
				Logger.error('[FreeDeepseek] Failed to solve PoW challenge: WASM returned undefined');
				throw new Error('PoW solving failed');
			}
			
			const responseData = {
				algorithm,
				challenge: challengeStr,
				salt,
				answer: Math.floor(answer), // 确保是整数
				signature,
				target_path: targetPath
			};
			
			return btoa(JSON.stringify(responseData));
		} catch (error) {
			Logger.error('[FreeDeepseek] Failed to solve PoW challenge:', error);
			throw error;
		}
	}

	/**
	 * 发送非流式消息
	 */
	async sendMessage(messages: ChatMessage[], tools?: UnifiedTool[], systemMessage?: string): Promise<LLMResponse> {
		await this.checkRateLimit();

		const requestId = this.generateUUID();
		const startTime = Date.now();

		Logger.info('[FreeDeepseek] Sending non-streaming message');

		return this.retryWithBackoff(async () => {
			// 获取或创建会话
			const sessionId = await this.getOrCreateSession();

			// 获取 PoW 挑战并求解
			const challenge = await this.getPowChallenge();
			const powResponse = await this.solvePowChallenge(challenge, '/api/v0/chat/completion');
			Logger.debug(`[FreeDeepseek] PoW response length: ${powResponse.length}`);

			// 准备消息 prompt
			let prompt = this.extractPromptFromMessages(messages);
			
			// 如果有系统消息，添加到 prompt 前面
			if (systemMessage) {
				prompt = systemMessage + '\n\n' + prompt;
			}

			// 提取并上传文件
			const files = this.extractFileUrls(messages);
			const refFileIds: string[] = [];
			
			if (files.length > 0) {
				try {
					Logger.info(`[FreeDeepseek] Uploading ${files.length} files...`);
					const uploadPromises = files.map(file => this.uploadFile(file.url, file.type, file.filename));
					const uploadedFiles = await Promise.all(uploadPromises);
					refFileIds.push(...uploadedFiles.map((f: any) => f.id));
					Logger.info(`[FreeDeepseek] Successfully uploaded ${refFileIds.length} files:`, refFileIds);
				} catch (error) {
					Logger.error('[FreeDeepseek] File upload failed:', error);
					// 继续处理，但不包含文件
				}
			}

			// 根据模型名称判断是否启用思考和搜索模式
			const isSearchModel = this.model.includes('search') || prompt.includes('联网搜索');
			const isThinkingModel = this.model.includes('think') || this.model.includes('r1') || this.model.includes('reasoner') || prompt.includes('深度思考');

			// 准备请求数据
			const requestData = {
				chat_session_id: sessionId,
				parent_message_id: this.lastMessageId, // 使用上一条消息 ID 构建对话链
				prompt,
				ref_file_ids: refFileIds,
				thinking_enabled: isThinkingModel,
				search_enabled: isSearchModel,
			};
			Logger.info(`[FreeDeepseek] 📤 发送消息 - 会话ID: ${sessionId}, 父消息ID: ${this.lastMessageId}, Model: ${this.model}`);
			Logger.debug('[FreeDeepseek] Request data:', requestData);

			// 使用 requestUrl (Obsidian API) 发送请求以避免 CORS 问题
			const response = await requestUrl({
				url: 'https://chat.deepseek.com/api/v0/chat/completion',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.authToken}`,
					'Content-Type': 'application/json',
					'Cookie': this.generateCookie(),
					'x-ds-pow-response': powResponse,
					'Accept': '*/*',
					'X-App-Version': '20241129.1',
					'X-Client-Locale': 'zh-CN',
					'X-Client-Platform': 'web',
					'X-Client-Version': '1.0.0-always',
				},
				body: JSON.stringify(requestData),
				throw: false,
			});

			// 检查响应
			if (response.status !== 200) {
				const errorText = response.text || JSON.stringify(response.json);
				Logger.error('[FreeDeepseek] API Error:', { status: response.status, response: errorText });
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			}

			// Log response details
			Logger.info('[FreeDeepseek] Response received:', {
				status: response.status,
				headers: response.headers,
				textLength: response.text?.length || 0,
				textPreview: response.text?.substring(0, 200)
			});

			// requestUrl returns text, need to parse SSE manually
			const result = await this.parseSSEResponseNonStreaming(response.text, this.model.includes('silent'));

			// 从响应中提取并保存消息 ID（用于后续对话）
			if (result.metadata?.response_message_id && typeof result.metadata.response_message_id === 'number') {
				this.lastMessageId = result.metadata.response_message_id;
				Logger.info(`[FreeDeepseek] 保存消息 ID: ${this.lastMessageId}`);
			}

			const duration = Date.now() - startTime;
			Logger.info(`[FreeDeepseek] Message completed in ${duration}ms`);

			return result;
		});
	}

	/**
	 * 解析 SSE 响应文本（非流式版本）
	 */
	private async parseSSEResponseNonStreaming(
		responseText: string,
		isSilentModel: boolean = false
	): Promise<LLMResponse> {
		let thinkingContent = '';
		let answerContent = '';
		let messageId: number | null = null;

		const lines = responseText.split('\n');
		
		for (const line of lines) {
			if (!line.startsWith('data: ')) continue;
			
			const data = line.slice(6).trim();
			if (!data || data === '[DONE]') continue;

			try {
				const parsed = JSON.parse(data);
				
				// 详细记录所有包含 'id' 关键字的数据行以便调试
				if (data.toLowerCase().includes('id') && !data.includes('client_stream_id')) {
					Logger.debug('[FreeDeepseek] 🔍 包含ID的SSE行:', data.substring(0, 300));
				}
				
				// 提取消息 ID（数字类型）- 检查多个可能的位置
				// 优先检查 response_message_id（实际响应格式）
				if (parsed.response_message_id && typeof parsed.response_message_id === 'number') {
					messageId = parsed.response_message_id;
					Logger.info(`[FreeDeepseek] ✅ 从响应中提取到消息 ID (response_message_id): ${messageId}`);
				} else if (parsed.v?.response?.message_id && typeof parsed.v.response.message_id === 'number') {
					messageId = parsed.v.response.message_id;
					Logger.info(`[FreeDeepseek] ✅ 从响应中提取到消息 ID (v.response.message_id): ${messageId}`);
				} else if (parsed.p === 'response/id' && typeof parsed.v === 'number') {
					messageId = parsed.v;
					Logger.info(`[FreeDeepseek] ✅ 从响应中提取到消息 ID (path): ${messageId}`);
				} else if (parsed.v?.response?.id && typeof parsed.v.response.id === 'number') {
					messageId = parsed.v.response.id;
					Logger.info(`[FreeDeepseek] ✅ 从响应中提取到消息 ID (nested): ${messageId}`);
				} else if (typeof parsed.v === 'number' && parsed.p === 'id') {
					// 可能直接在 v 字段
					messageId = parsed.v;
					Logger.info(`[FreeDeepseek] ✅ 从响应中提取到消息 ID (direct): ${messageId}`);
				} else if (parsed.id && typeof parsed.id === 'number') {
					// 可能在顶层
					messageId = parsed.id;
					Logger.info(`[FreeDeepseek] ✅ 从响应中提取到消息 ID (top-level): ${messageId}`);
				}
				
				// Format 1: Path-based append
				if (parsed.p && typeof parsed.v === 'string') {
					const path = parsed.p;
					const content = parsed.v;
					
					if (path.includes('response/fragments') && path.includes('/content')) {
						answerContent += content;
					} else if (path === 'response/thinking_content' && !isSilentModel) {
						thinkingContent += content;
					} else if (path === 'response/content') {
						answerContent += content;
					}
				}
				
				// Format 2: Array with operations
				if (Array.isArray(parsed.v)) {
					for (const item of parsed.v) {
						if (item.p === 'fragments' && Array.isArray(item.v)) {
							for (const fragment of item.v) {
								const content = fragment.content || '';
								if (!content) continue;
								
								if (fragment.type === 'THINKING' && !isSilentModel) {
									thinkingContent += content;
								} else if (fragment.type === 'RESPONSE') {
									answerContent += content;
								}
							}
						}
					}
				}
				
				// Format 3: Full response object
				if (parsed.v?.response?.fragments && Array.isArray(parsed.v.response.fragments)) {
					const fragments = parsed.v.response.fragments;
					for (const fragment of fragments) {
						const content = fragment.content || '';
						if (!content) continue;
						
						if ((fragment.type === 'thinking' || fragment.type === 'THINKING') && !isSilentModel) {
							thinkingContent += content;
						} else if (fragment.type === 'content' || fragment.type === 'RESPONSE') {
							answerContent += content;
						}
					}
				}
			} catch (parseError) {
				Logger.warn('[FreeDeepseek] Failed to parse SSE line:', parseError);
			}
		}

		// 组合最终内容
		let finalContent = '';
		if (thinkingContent) {
			finalContent += '[思考开始]\n' + thinkingContent + '\n\n[思考结束]\n\n';
		}
		finalContent += answerContent;

		return {
			content: finalContent,
			model: this.model,
			usage: {
				promptTokens: Math.ceil(finalContent.length / 4),
				completionTokens: Math.ceil(finalContent.length / 4),
				totalTokens: Math.ceil(finalContent.length / 2),
			},
			finishReason: 'stop',
			metadata: {
				provider: this.getProviderName(),
				rawResponse: responseText,
				response_message_id: messageId // 保存消息 ID用于编辑场景
			}
		};
	}

	/**
	 * 从消息中提取 prompt（使用 messagesPrepare）
	 */
	private extractPromptFromMessages(messages: ChatMessage[]): string {
		return this.messagesPrepare(messages);
	}

	/**
	 * 发送流式消息
	 */
	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {

		// 打印代理配置状态
		Logger.info('[FreeDeepseek] ========== 代理配置状态 ==========');
		Logger.info(`[FreeDeepseek] 代理已启用: ${this.proxyEnabled || false}`);
		if (this.proxyEnabled) {
			Logger.info(`[FreeDeepseek] 代理类型: ${this.proxyType || 'unknown'}`);
			Logger.info(`[FreeDeepseek] 代理地址: ${this.proxyHost}:${this.proxyPort}`);
			Logger.info(`[FreeDeepseek] 需要认证: ${this.proxyAuth || false}`);
			if (this.proxyAuth) {
				Logger.info(`[FreeDeepseek] 认证用户: ${this.proxyUsername || 'none'}`);
			}
		} else {
			Logger.info('[FreeDeepseek] 直连模式（未使用代理）');
		}
		Logger.info('[FreeDeepseek] =====================================');

		try {
			await this.checkRateLimit();

			} catch (error) {
				Logger.error('[FreeDeepseek] Rate limit check failed:', error);
				throw error;
			}

		return this.retryWithBackoff(async () => {

			// 生成一次性 cookie，用于整个请求（文件上传和聊天都使用同一个 cookie）
			const requestCookie = this.generateCookie();

			// 获取或创建会话

			const sessionId = await this.getOrCreateSession();

			// 获取 PoW 挑战并求解

			const challenge = await this.getPowChallenge();

			const powResponse = await this.solvePowChallenge(challenge, '/api/v0/chat/completion');

			// Logger.debug removed - causes crash with large messages

			// 准备消息 prompt - 手动提取文本避免序列化大对象

			let prompt = '';
			
			// 手动提取文本内容,避免传递包含大文件的消息数组
			for (let i = 0; i < messages.length; i++) {
				const msg = messages[i];

				let textContent = '';
				if (typeof msg.content === 'string') {
					textContent = msg.content;
				} else if (Array.isArray(msg.content)) {
					// 只提取文本部分,跳过文件内容
					const textParts: string[] = [];
					for (const item of msg.content) {
						if (item.type === 'text') {
							textParts.push(item.text);
						}
					}
					textContent = textParts.join('\n');
				}
				
				// 添加角色标记
				if (msg.role === 'user') {
					prompt += `User: ${textContent}\n\n`;
				} else if (msg.role === 'assistant') {
					prompt += `Assistant: ${textContent}\n\n`;
				}
			}

			// 如果有系统消息，添加到 prompt 前面
			if (systemMessage) {
				prompt = systemMessage + '\n\n' + prompt;
			}

			// 提取并上传文件

			const files = this.extractFileUrls(messages);

			const refFileIds: string[] = [];
			
			// 临时测试：跳过文件上传以验证基本聊天功能
			const SKIP_FILE_UPLOAD_TEST = false; // 设置为 true 可以测试不带文件的聊天
			
			if (files.length > 0 && !SKIP_FILE_UPLOAD_TEST) {
				try {

					Logger.info(`[FreeDeepseek] Uploading ${files.length} files...`);
					const uploadPromises = files.map(file => this.uploadFile(file.url, file.type, file.filename, sessionId, requestCookie));
					const uploadedFiles = await Promise.all(uploadPromises);
					refFileIds.push(...uploadedFiles.map((f: any) => f.id));

					Logger.info(`[FreeDeepseek] Successfully uploaded ${refFileIds.length} files:`, refFileIds);
				} catch (error) {
					Logger.error('[FreeDeepseek] File upload failed:', error);
					Logger.error('[FreeDeepseek] File upload failed:', error);
					// 继续处理，但不包含文件
				}
			} else {
				if (SKIP_FILE_UPLOAD_TEST && files.length > 0) {
					Logger.warn('[FreeDeepseek] SKIP_FILE_UPLOAD_TEST enabled - ignoring', files.length, 'files');
				} else {

				}
			}

			// 根据模型名称判断是否启用思考和搜索模式
			const isSearchModel = this.model.includes('search') || prompt.includes('联网搜索');
			const isThinkingModel = this.model.includes('think') || this.model.includes('r1') || this.model.includes('reasoner') || prompt.includes('深度思考');
			const isSilentModel = this.model.includes('silent');
			
			// 准备请求数据（ref_file_ids 必须始终存在，即使为空数组）
			const requestData: any = {
				chat_session_id: sessionId,
				parent_message_id: this.lastMessageId, // 使用上一条消息 ID 构建对话链
				prompt,
				ref_file_ids: refFileIds,  // 始终包含，即使为空数组
				thinking_enabled: isThinkingModel,
				search_enabled: isSearchModel,
			};
			
			Logger.info(`[FreeDeepseek] 📤 发送流式消息 - 会话ID: ${sessionId}, 父消息ID: ${this.lastMessageId}, Model: ${this.model}`);
			
			// 记录请求信息
			if (refFileIds.length > 0) {

			} else {
			}

			// 使用 requestUrl 进行 HTTP/1.1 流式传输 (DeepSeek服务器似乎不支持HTTP/2)
			const headers = {
				...FreeDeepseekProviderImpl.FAKE_HEADERS,
				'Authorization': `Bearer ${this.authToken}`,
				'Content-Type': 'application/json',
				'Cookie': requestCookie,
				'X-Ds-Pow-Response': powResponse,
				'Accept': 'text/event-stream',  // Must be after FAKE_HEADERS to override
				'x-app-version': '20241129.1',
				'x-client-locale': 'zh_CN',
				'x-client-platform': 'web',
				'x-client-version': '1.5.0',
			};

			// 写入请求体
			const bodyData = JSON.stringify(requestData);

			try {
				// 使用 Node.js https 模块实现真正的流式传输
				await new Promise<void>((resolve, reject) => {
					const proxyAgent = this.createProxyAgent();
					const options: https.RequestOptions = {
						hostname: 'chat.deepseek.com',
						port: 443,
						path: '/api/v0/chat/completion',
						method: 'POST',
						headers: {
							...headers,
							'Content-Length': Buffer.byteLength(bodyData)
						},
						agent: proxyAgent
					};

					if (proxyAgent) {
						Logger.info('[FreeDeepseek] → 发起请求: 通过代理连接到 chat.deepseek.com');
					} else {
						Logger.info('[FreeDeepseek] → 发起请求: 直接连接到 chat.deepseek.com');
					}

					const req = https.request(options, (res) => {
						Logger.debug('[FreeDeepseek] Response status:', res.statusCode);
						Logger.info(`[FreeDeepseek] ✓ 已建立连接，状态码: ${res.statusCode}`);
						
						if (res.statusCode !== 200) {
							let errorBody = '';
							res.on('data', (chunk) => { errorBody += chunk.toString(); });
							res.on('end', () => {
								Logger.error('[FreeDeepseek] Bad response status:', res.statusCode, 'Body:', errorBody);
								reject(new Error(`HTTP ${res.statusCode}: ${errorBody}`));
							});
							return;
						}

						// 处理真正的流式响应
						this.parseStreamingSSEResponse(res, onChunk, isSilentModel, abortSignal)
							.then(resolve)
							.catch(reject);
					});

					req.on('error', (error) => {
						Logger.error('[FreeDeepseek] Request error:', error);
						reject(error);
					});

					// 处理中止信号
					if (abortSignal) {
						abortSignal.addEventListener('abort', () => {
							req.destroy();
							reject(new Error('Request aborted'));
						});
					}

					// 发送请求体
					req.write(bodyData);
					req.end();
				});			} catch (error) {
				Logger.error('[FreeDeepseek] Streaming error:', error);
				throw error;
			}
		});
	}

	/**
	 * 处理真正的流式 SSE 响应（Node.js IncomingMessage）
	 * DeepSeek format: {"v": "content", "p": "response/thinking_content"|"response/content", "o": "APPEND"}
	 */
	private async parseStreamingSSEResponse(
		stream: NodeJS.ReadableStream,
		onChunk: (chunk: StreamingResponse) => void,
		isSilentModel: boolean = false,
		abortSignal?: AbortSignal
	): Promise<void> {
		return new Promise((resolve, reject) => {
			let buffer = '';
			
			let thinkingContent = '';
			let answerContent = '';
			let messageId: number | null = null;
			const fragmentTypes: Map<number, string> = new Map();
			let currentFragmentIndex: number | null = null;
			let aborted = false;
			
			// 发送初始 chunk
			onChunk({
				delta: '',
				isComplete: false
			});

			let lastYieldTime = Date.now();
			const YIELD_INTERVAL_MS = 16; // ~60fps

			// 监听 abort 信号
			if (abortSignal) {
				abortSignal.addEventListener('abort', () => {
					aborted = true;
					if (stream && typeof (stream as any).destroy === 'function') {
						(stream as any).destroy();
					}
					reject(new Error('Request aborted'));
				});
			}

			// 监听数据事件
			stream.on('data', (chunk: Buffer) => {
				if (aborted) return;

				// 解码数据块
				buffer += chunk.toString('utf-8');
				const lines = buffer.split('\n');
				
				// 保留最后一行（可能不完整）
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					
					const data = line.slice(6).trim();
					if (!data || data === '[DONE]') continue;

			try {
				const parsed = JSON.parse(data);
				
				// 详细记录所有包含 'id' 关键字的数据行以便调试
				if (data.toLowerCase().includes('id') && !data.includes('client_stream_id')) {
					Logger.debug('[FreeDeepseek] 🔍 包含ID的SSE行:', data.substring(0, 300));
				}
				
				// 提取消息 ID（数字类型）- 检查多个可能的位置
				// 优先检查 response_message_id（实际响应格式）
				if (parsed.response_message_id && typeof parsed.response_message_id === 'number') {
					messageId = parsed.response_message_id;
					Logger.info(`[FreeDeepseek] ✅ 流式响应中提取到消息 ID (response_message_id): ${messageId}`);
				} else if (parsed.v?.response?.message_id && typeof parsed.v.response.message_id === 'number') {
					messageId = parsed.v.response.message_id;
					Logger.info(`[FreeDeepseek] ✅ 流式响应中提取到消息 ID (v.response.message_id): ${messageId}`);
				} else if (parsed.p === 'response/id' && typeof parsed.v === 'number') {
					messageId = parsed.v;
					Logger.info(`[FreeDeepseek] ✅ 流式响应中提取到消息 ID (path): ${messageId}`);
				} else if (parsed.v?.response?.id && typeof parsed.v.response.id === 'number') {
					messageId = parsed.v.response.id;
					Logger.info(`[FreeDeepseek] ✅ 流式响应中提取到消息 ID (nested): ${messageId}`);
				} else if (typeof parsed.v === 'number' && parsed.p === 'id') {
					// 可能直接在 v 字段
					messageId = parsed.v;
					Logger.info(`[FreeDeepseek] ✅ 流式响应中提取到消息 ID (direct): ${messageId}`);
				} else if (parsed.id && typeof parsed.id === 'number') {
					// 可能在顶层
					messageId = parsed.id;
					Logger.info(`[FreeDeepseek] ✅ 流式响应中提取到消息 ID (top-level): ${messageId}`);
				}						// Format 1: Path-based append
						if (parsed.p && typeof parsed.v === 'string') {
							const path = parsed.p;
							const content = parsed.v;
							
							// Track fragment type updates
							if (path.includes('response/fragments/') && path.includes('/type')) {
								const fragmentIndexMatch = path.match(/fragments\/(\d+)\/type/);
								if (fragmentIndexMatch) {
									const fragmentIndex = parseInt(fragmentIndexMatch[1]);
									fragmentTypes.set(fragmentIndex, content);
									currentFragmentIndex = fragmentIndex;
								}
								continue;
							}
							
							// Check if it's a fragment content update
							if (path.includes('response/fragments') && path.includes('/content')) {
								const fragmentIndexMatch = path.match(/fragments\/(\d+)\/content/);
								if (fragmentIndexMatch) {
									const fragmentIndex = parseInt(fragmentIndexMatch[1]);
									let fragmentType = fragmentTypes.get(fragmentIndex);
									
									if (!fragmentType) {
										fragmentType = fragmentIndex === 0 ? 'THINK' : 'RESPONSE';
										fragmentTypes.set(fragmentIndex, fragmentType);
									}
									
									currentFragmentIndex = fragmentIndex;
									
									// Clean up leading punctuation from RESPONSE fragments
									let cleanedContent = content;
									if ((fragmentType === 'RESPONSE') && fragmentIndex > 0 && answerContent === '') {
										cleanedContent = content.replace(/^[!?.。！？\s]+/, '');
									}
									
									if ((fragmentType === 'THINK' || fragmentType === 'THINKING') && !isSilentModel) {
										thinkingContent += content;
										onChunk({
											delta: content,
											isComplete: false,
											metadata: { type: 'thinking' }
										});
									} else {
										answerContent += cleanedContent;
										onChunk({
											delta: cleanedContent,
											isComplete: false
										});
									}
								}
								const now = Date.now();
								if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
									setTimeout(() => {}, 0);
									lastYieldTime = now;
								}
								continue;
							}
						}
						
						// Format 2: Array with operations
						if (Array.isArray(parsed.v)) {
							for (const item of parsed.v) {
								if ((item.p === 'fragments' || item.p === 'response/fragments') && Array.isArray(item.v)) {
									for (const fragment of item.v) {
										if (fragment.id !== undefined && fragment.type) {
											const fragmentIndex = fragment.id - 1;
											fragmentTypes.set(fragmentIndex, fragment.type);
											currentFragmentIndex = fragmentIndex;
										}
										
										const content = fragment.content || '';
										if (!content) continue;
										
										if ((fragment.type === 'THINKING' || fragment.type === 'THINK') && !isSilentModel) {
											thinkingContent += content;
											onChunk({
												delta: content,
												isComplete: false,
												metadata: { type: 'thinking' }
											});
										} else if (fragment.type === 'RESPONSE') {
											answerContent += content;
											onChunk({
												delta: content,
												isComplete: false
											});
										}
										const now = Date.now();
										if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
											setTimeout(() => {}, 0);
											lastYieldTime = now;
										}
									}
								}
							}
							continue;
						}
						
						// Format 4: Simple string without path
						if (typeof parsed.v === 'string' && parsed.v && !parsed.p) {
							const content = parsed.v;
							
							if (currentFragmentIndex !== null) {
								const fragmentType = fragmentTypes.get(currentFragmentIndex);
								let cleanedContent = content;
								if ((fragmentType === 'RESPONSE') && currentFragmentIndex > 0 && answerContent === '') {
									cleanedContent = content.trimStart();
								}

								if ((fragmentType === 'THINK' || fragmentType === 'THINKING') && !isSilentModel) {
									thinkingContent += content;
									onChunk({
										delta: content,
										isComplete: false,
										metadata: { type: 'thinking' }
									});
								} else {
									answerContent += cleanedContent;
									onChunk({
										delta: cleanedContent,
										isComplete: false
									});
								}
							} else {
								answerContent += content;
								onChunk({
									delta: content,
									isComplete: false
								});
							}
							const now = Date.now();
							if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
								setTimeout(() => {}, 0);
								lastYieldTime = now;
							}
							continue;
						}
					} catch (parseError) {
						Logger.warn('[FreeDeepseek] Failed to parse SSE line:', parseError);
					}
				}
			});

			// 监听流结束事件
			stream.on('end', () => {
				if (aborted) return;

				// 保存消息 ID
				if (messageId) {
					this.lastMessageId = messageId;
					Logger.info(`[FreeDeepseek] 保存消息 ID: ${this.lastMessageId}`);
				}

			// 发送完成信号
			onChunk({
				delta: '',
				isComplete: true,
				usage: {
					promptTokens: Math.ceil((thinkingContent.length + answerContent.length) / 4),
					completionTokens: Math.ceil((thinkingContent.length + answerContent.length) / 4),
					totalTokens: Math.ceil((thinkingContent.length + answerContent.length) / 2),
				},
				metadata: messageId ? { response_message_id: messageId } : undefined
			});				resolve();
			});

			// 监听错误事件
			stream.on('error', (error) => {
				if (aborted) return;
				Logger.error('[FreeDeepseek] Stream error:', error);
				reject(error);
			});
		});
	}

	/**
	 * 解析 SSE 响应文本（用于非流式情况或回退）
	 * DeepSeek format: {"v": "content", "p": "response/thinking_content"|"response/content", "o": "APPEND"}
	 */
	private async parseSSEResponse(
		responseText: string,
		onChunk: (chunk: StreamingResponse) => void,
		isSilentModel: boolean = false
	): Promise<void> {

		let thinkingContent = '';
		let answerContent = '';
		let messageId: number | null = null;
		// Track fragment types: fragmentTypes[index] = 'THINK' | 'RESPONSE' | etc.
		const fragmentTypes: Map<number, string> = new Map();
		// Track current fragment index for implicit content appends ({"v": "text"} without path)
		let currentFragmentIndex: number | null = null;

		// 发送初始 chunk

		onChunk({
			delta: '',
			isComplete: false
		});

		const lines = responseText.split('\n');
		let currentEvent = '';
		let dataLineCount = 0;
		// 优化的渲染控制：基于时间而非固定 chunk 数
		let lastYieldTime = Date.now();
		const YIELD_INTERVAL_MS = 16; // ~60fps
		
		for (const line of lines) {
			// 处理 event: 行
			if (line.startsWith('event: ')) {
				currentEvent = line.slice(7).trim();
				continue;
			}
			
			if (!line.startsWith('data: ')) continue;
			
			const data = line.slice(6).trim();
			if (!data || data === '[DONE]') continue;
			
			dataLineCount++;
			// 只打印前几行、包含 content 的行、以及每50行打印一次
			if (dataLineCount <= 5 || data.includes('"content"') || dataLineCount % 50 === 0) {
			}

			try {
				const parsed = JSON.parse(data);
				
				// 提取消息 ID（数字类型）
				if (parsed.p === 'response/id' && typeof parsed.v === 'number') {
					messageId = parsed.v;
					Logger.info(`[FreeDeepseek] 流式响应中提取到消息 ID (path): ${messageId}`);
				} else if (parsed.v?.response?.id && typeof parsed.v.response.id === 'number') {
					messageId = parsed.v.response.id;
					Logger.info(`[FreeDeepseek] 流式响应中提取到消息 ID (nested): ${messageId}`);
				}
				
				// Format 1: Path-based append: {"v": "text", "p": "response/fragments/0/content", "o": "APPEND"}
				if (parsed.p && typeof parsed.v === 'string') {
					const path = parsed.p;
					const content = parsed.v;
					
				// Track fragment type updates: response/fragments/0/type
				if (path.includes('response/fragments/') && path.includes('/type')) {
					const fragmentIndexMatch = path.match(/fragments\/(\d+)\/type/);
					if (fragmentIndexMatch) {
						const fragmentIndex = parseInt(fragmentIndexMatch[1]);
						fragmentTypes.set(fragmentIndex, content);
						currentFragmentIndex = fragmentIndex; // Remember for Format 4
						Logger.debug(`🔧 Type Init: Fragment ${fragmentIndex} type=${content} (via path)`);
					}
					continue;
				}					// Check if it's a fragment content update
					if (path.includes('response/fragments') && path.includes('/content')) {
						// Extract fragment index from path: response/fragments/0/content
						const fragmentIndexMatch = path.match(/fragments\/(\d+)\/content/);
					if (fragmentIndexMatch) {
						const fragmentIndex = parseInt(fragmentIndexMatch[1]);
						let fragmentType = fragmentTypes.get(fragmentIndex);
						
						// If type is unknown, infer it: Fragment 0 is usually THINK, others are RESPONSE
						if (!fragmentType) {
							fragmentType = fragmentIndex === 0 ? 'THINK' : 'RESPONSE';
							fragmentTypes.set(fragmentIndex, fragmentType);
							Logger.debug(`🔮 Type Inferred: Fragment ${fragmentIndex} type=${fragmentType} (type not provided by server)`);
						}
						
						Logger.debug(`📝 Path Append: Fragment ${fragmentIndex} type=${fragmentType}, content="${content.slice(0, 20)}..."`);							// Remember current fragment for implicit appends
							currentFragmentIndex = fragmentIndex;
							
							// Clean up leading punctuation from RESPONSE fragments (thinking may end with !, ?, .)
							let cleanedContent = content;
							if ((fragmentType === 'RESPONSE') && fragmentIndex > 0 && answerContent === '') {
								// First content of answer fragment - remove leading punctuation if present
								cleanedContent = content.replace(/^[!?.。！？\s]+/, '');
								if (cleanedContent !== content) {
									Logger.debug(`🧹 Cleaned leading punctuation: "${content}" -> "${cleanedContent}"`);
								}
							}
							
							// Check if this is a thinking fragment
							if ((fragmentType === 'THINK' || fragmentType === 'THINKING') && !isSilentModel) {
								thinkingContent += content;
								onChunk({
									delta: content,
									isComplete: false,
									metadata: { type: 'thinking' }
								});
							} else {
								answerContent += cleanedContent;
								onChunk({
									delta: cleanedContent,
									isComplete: false
								});
							}
						} else {
							// Fallback: treat as answer if can't parse index
							answerContent += content;
							onChunk({
								delta: content,
								isComplete: false
							});
						}
						// 每处理 5 个 chunk，让出控制权以允许 UI 渲染
						continue;
					}
					// Old format compatibility
					else if (path === 'response/thinking_content' && !isSilentModel) {
						thinkingContent += content;
						onChunk({
							delta: content,
							isComplete: false,
							metadata: { type: 'thinking' }
						});
				const now = Date.now();
				if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
					await new Promise(resolve => setTimeout(resolve, 0));
					lastYieldTime = now;
				}
						continue;
					} else if (path === 'response/content') {
						answerContent += content;
						onChunk({
							delta: content,
							isComplete: false
						});
				const now = Date.now();
				if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
					await new Promise(resolve => setTimeout(resolve, 0));
					lastYieldTime = now;
				}
						continue;
					}
				}
				
				// Format 2: Array with operations: [{"v":...,"p":"fragments","o":"APPEND"}, ...]
				// Also handles nested path: {"p":"response/fragments","o":"APPEND"}
				if (Array.isArray(parsed.v)) {
					for (const item of parsed.v) {
						// Support both "fragments" and "response/fragments" paths
						if ((item.p === 'fragments' || item.p === 'response/fragments') && Array.isArray(item.v)) {
							Logger.debug(`📦 BATCH Received: ${item.v.length} fragments`);
							for (const fragment of item.v) {
								Logger.debug(`📦 Fragment data: id=${fragment.id}, type=${fragment.type}, hasContent=${!!fragment.content}, contentLength=${fragment.content?.length || 0}`);
								// Track fragment type for later Format 1 appends
								if (fragment.id !== undefined && fragment.type) {
									const fragmentIndex = fragment.id - 1; // id is 1-based, index is 0-based
									fragmentTypes.set(fragmentIndex, fragment.type);
									currentFragmentIndex = fragmentIndex;
									Logger.debug(`🆕 BATCH Init: Fragment ${fragmentIndex} (id=${fragment.id}) type=${fragment.type}, initialContent="${fragment.content?.slice(0, 20) || '(empty)'}..."`);
								} else if (fragment.id !== undefined) {
									Logger.debug(`⚠️ Fragment ${fragment.id} has NO TYPE field!`);
								}
								
								const content = fragment.content || '';
								// Skip if no content, but we've already tracked the type above
								if (!content) continue;
								
								// Support both 'THINK' and 'THINKING' type names
								if ((fragment.type === 'THINKING' || fragment.type === 'THINK') && !isSilentModel) {
									thinkingContent += content;
									onChunk({
										delta: content,
										isComplete: false,
										metadata: { type: 'thinking' }
									});
								} else if (fragment.type === 'RESPONSE') {
									answerContent += content;
									onChunk({
										delta: content,
										isComplete: false
									});
								}
								const now = Date.now();
								if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
									await new Promise(resolve => setTimeout(resolve, 0));
									lastYieldTime = now;
								}
							}
						}
					}
					continue;
				}
				
				// Format 3: Full response object: {"v": {"response": {..., "fragments": [...]}}}
				if (parsed.v?.response?.fragments && Array.isArray(parsed.v.response.fragments)) {
					const fragments = parsed.v.response.fragments;
					for (const fragment of fragments) {
						const content = fragment.content || '';
						if (!content) continue;
						
						// Support 'thinking', 'THINKING', and 'THINK' type names
						if (fragment.type === 'thinking' || fragment.type === 'THINKING' || fragment.type === 'THINK') {
							if (!isSilentModel) {
								thinkingContent += content;
								onChunk({
									delta: content,
									isComplete: false,
									metadata: { type: 'thinking' }
								});
					const now = Date.now();
					if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
						await new Promise(resolve => setTimeout(resolve, 0));
						lastYieldTime = now;
					}
							}
						} else if (fragment.type === 'content' || fragment.type === 'RESPONSE') {
							answerContent += content;
							onChunk({
								delta: content,
								isComplete: false
							});
					const now = Date.now();
					if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
						await new Promise(resolve => setTimeout(resolve, 0));
						lastYieldTime = now;
					}
						}
					}
					continue;
				}
				
				// Format 4: Simple string without path - continue appending to current fragment
				if (typeof parsed.v === 'string' && parsed.v && !parsed.p) {
					const content = parsed.v;
					
					// Use current fragment type to determine where to append
					if (currentFragmentIndex !== null) {
						const fragmentType = fragmentTypes.get(currentFragmentIndex);
						// console.log(`➕ Implicit Append: Fragment ${currentFragmentIndex} type=${fragmentType}, content="${content.slice(0, 20)}..."`);

						// Clean up leading whitespace from RESPONSE fragments if this is the first implicit append
						let cleanedContent = content;
						if ((fragmentType === 'RESPONSE') && currentFragmentIndex > 0 && answerContent === '') {
							// First implicit append of answer - trim leading whitespace
							cleanedContent = content.trimStart();
							if (cleanedContent !== content) {
								Logger.debug(`🧹 Trimmed leading whitespace in implicit append: "${content}" -> "${cleanedContent}"`);
							}
						}

						if ((fragmentType === 'THINK' || fragmentType === 'THINKING') && !isSilentModel) {
							thinkingContent += content;
							onChunk({
								delta: content,
								isComplete: false,
								metadata: { type: 'thinking' }
							});
						} else {
							answerContent += cleanedContent;
							onChunk({
								delta: cleanedContent,
								isComplete: false
							});
						}
					} else {
						// Fallback: treat as answer if no current fragment
						answerContent += content;
						onChunk({
							delta: content,
							isComplete: false
						});
					}
				const now = Date.now();
				if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
					await new Promise(resolve => setTimeout(resolve, 0));
					lastYieldTime = now;
				}
					continue;
				}
			} catch (parseError) {
				Logger.warn('[FreeDeepseek] Failed to parse SSE line:', parseError);
			}
		}

		// 保存消息 ID
		if (messageId) {
			this.lastMessageId = messageId;
			Logger.info(`[FreeDeepseek] 保存消息 ID: ${this.lastMessageId}`);
		}

		// 发送完成信号
		onChunk({
			delta: '',
			isComplete: true,
			usage: {
				promptTokens: Math.ceil((thinkingContent.length + answerContent.length) / 4),
				completionTokens: Math.ceil((thinkingContent.length + answerContent.length) / 4),
				totalTokens: Math.ceil((thinkingContent.length + answerContent.length) / 2),
			},
			metadata: messageId ? { response_message_id: messageId } : undefined
		});
					const now = Date.now();
					if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
						await new Promise(resolve => setTimeout(resolve, 0));
						lastYieldTime = now;
					}
	}

	/**
	 * 处理真实流式响应 (已废弃 - 保留作为参考)
	 * DeepSeek format: {"v": "content", "p": "response/thinking_content"|"response/content", "o": "APPEND"}
	 */
	private handleStreamingResponse(
		req: any,
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		isSilentModel: boolean = false
	): Promise<void> {
		return new Promise((resolve, reject) => {
			let buffer = '';
			let thinkingContent = '';
			let answerContent = '';
			let currentMode: 'thinking' | 'content' | null = null;
			let statusCode: number | undefined;
			let hasReceivedData = false;
			// 优化的渲染控制：基于时间而非固定 chunk 数
			let lastYieldTime = Date.now();
			const YIELD_INTERVAL_MS = 16; // ~60fps

			req.setEncoding('utf8');

		// 检查响应状态码
		req.on('response', (headers: any) => {
			statusCode = headers[':status'];
			
			if (statusCode && statusCode !== 200) {
				Logger.error('[FreeDeepseek] Bad response status:', statusCode, 'Full headers:', headers);
				req.destroy(new Error(`HTTP ${statusCode}`));
			}
		});			// 发送初始 chunk
			onChunk({
				delta: '',
				isComplete: false
			});

			req.on('data', async (chunk: string) => {
				hasReceivedData = true;
				// 检查是否被中止
				if (abortSignal?.aborted) {
					req.destroy();
					return;
				}

				buffer += chunk;
				const lines = buffer.split('\n');
				
				// 保留最后一行（可能不完整）
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					
					const data = line.slice(6).trim();
					if (!data || data === '[DONE]') continue;

					try {
						const parsed = JSON.parse(data);
						
						// 检查 p 字段以确定内容类型
						if (parsed.p === 'response/thinking_content') {
							currentMode = 'thinking';
						} else if (parsed.p === 'response/content') {
							currentMode = 'content';
						}
						// 如果 p 字段不存在，继续使用当前模式

						const contentPiece = parsed.v || '';
						
						if (currentMode === 'thinking' && !isSilentModel) {
							// 思考内容
							thinkingContent += contentPiece;
							onChunk({
								delta: contentPiece,
								isComplete: false,
								metadata: {
									type: 'thinking'
								}
							});
							const now = Date.now();
							if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
								await new Promise(resolve => setTimeout(resolve, 0));
								lastYieldTime = now;
							}
						} else if (currentMode === 'content') {
							// 回答内容
							answerContent += contentPiece;
							onChunk({
								delta: contentPiece,
								isComplete: false,
								metadata: {
									type: 'content'
								}
							});
							const now = Date.now();
							if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
								await new Promise(resolve => setTimeout(resolve, 0));
								lastYieldTime = now;
							}
						}
					} catch (parseError) {
						Logger.warn('[FreeDeepseek] Failed to parse SSE line:', parseError);
					}
				}
			});

			req.on('end', () => {
				if (!hasReceivedData) {
					Logger.warn('[FreeDeepseek] Stream ended without receiving any data');
				}
				
				// 发送完成信号
				onChunk({
					delta: '',
					isComplete: true,
					usage: {
						promptTokens: Math.ceil((thinkingContent.length + answerContent.length) / 4),
						completionTokens: Math.ceil((thinkingContent.length + answerContent.length) / 4),
						totalTokens: Math.ceil((thinkingContent.length + answerContent.length) / 2),
					}
				});
				resolve();
			});

			req.on('error', (error: any) => {
				Logger.error('[FreeDeepseek] Stream error:', {
					message: error.message,
					code: error.code,
					errno: error.errno,
					statusCode: statusCode,
					hasReceivedData: hasReceivedData
				});
				
				// 提供更有用的错误信息
				if (error.code === 'ERR_HTTP2_ERROR' || error.message === 'Protocol error') {
					reject(new Error('DeepSeek API connection failed. The server closed the connection unexpectedly. Please try again.'));
				} else {
					reject(error);
				}
			});

			// 处理中止信号
			if (abortSignal) {
				abortSignal.addEventListener('abort', () => {
					req.destroy();
					reject(new Error('Request aborted'));
				});
			}
		});
	}



	/**
	 * 接收完整的非流式响应（从 ReadableStream）
	 */
	private async receiveCompleteResponseFromStream(stream: ReadableStream<Uint8Array> | null): Promise<LLMResponse> {
		if (!stream) {
			throw new Error('Response body is null');
		}

		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let responseText = '';
		const isSilentModel = this.model.includes('silent');

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				responseText += decoder.decode(value, { stream: true });
			}

			// 解析 SSE 响应
			const lines = responseText.split('\n');
			let fullContent = '';
			let thinkingContent = '';
			let searchResults: string[] = [];

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				
				const data = line.slice(6).trim();
				if (data === '[DONE]') continue;

				try {
					const parsed = JSON.parse(data);
					
					// DeepSeek format: {"v": "content", "p": "response/content", "o": "APPEND"}
					// Some chunks may not have "p" field, just "v" field
					if (parsed.v && typeof parsed.v === 'string') {
						// Handle response content
						if (!parsed.p || parsed.p === 'response/content') {
							fullContent += parsed.v;
						}
						// Handle thinking content
						else if (parsed.p === 'response/thinking' && !isSilentModel) {
							if (!thinkingContent) {
								thinkingContent = '[思考开始]\n';
							}
							thinkingContent += parsed.v;
						}
					}
					// Handle search results if present
					else if (parsed.p === 'response/search_results' && parsed.v && !isSilentModel) {
						try {
							const results = Array.isArray(parsed.v) ? parsed.v : JSON.parse(parsed.v);
							searchResults.push(
								...results.map((item: any) => `${item.title || item.name || ''} - ${item.url || ''}`)
							);
						} catch (e) {
							// Ignore search result parse errors
						}
					}
				} catch (parseError) {
					Logger.warn('[FreeDeepseek] Failed to parse SSE line:', parseError);
				}
			}

			// 组合最终内容
			let finalContent = '';
			if (thinkingContent) {
				finalContent += '\n\n<details class="thinking-section" open>\n<summary>💭 思考过程</summary>\n<div class="thinking-content">' + thinkingContent + '</div>\n</details>\n\n';
			}
			if (thinkingContent && fullContent) {
				finalContent += '<div class="final-answer"><span class="final-answer-label">📝 最终回答</span>\n\n';
			}
			finalContent += fullContent;
			if (thinkingContent && fullContent) {
				finalContent += '\n</div>';
			}
			if (searchResults.length > 0) {
				finalContent += '\n\n**🔍 搜索结果来自：**\n' + searchResults.map(r => `- ${r}`).join('\n');
			}

			const response: LLMResponse = {
				content: finalContent,
				model: this.model,
				usage: {
					promptTokens: Math.ceil(finalContent.length / 4),
					completionTokens: Math.ceil(finalContent.length / 4),
					totalTokens: Math.ceil(finalContent.length / 2),
				},
				finishReason: 'stop',
				metadata: {
					provider: this.getProviderName(),
					rawResponse: {}
				}
			};

			return response;
		} catch (error) {
			Logger.error('[FreeDeepseek] Failed to parse response:', error);
			throw error;
		} finally {
			reader.releaseLock();
		}
	}

	/**
	 * 处理流式响应（从 ReadableStream，支持思考内容和搜索结果）
	 */
	private async handleStreamingResponseFromStream(
		stream: ReadableStream<Uint8Array> | null,
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal
	): Promise<void> {
		if (!stream) {
			throw new Error('Response body is null');
		}

		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let fullContent = '';
		let thinkingContent = '';
		let searchResults: string[] = [];
		const isSilentModel = this.model.includes('silent');
		// 优化的渲染控制：基于时间而非固定 chunk 数
		let lastYieldTime = Date.now();
		const YIELD_INTERVAL_MS = 16; // ~60fps

		// 发送初始 chunk
		onChunk({
			delta: '',
			isComplete: false
		});

		try {
			let chunkCount = 0;
			while (true) {
				// 检查是否被中止
				if (abortSignal?.aborted) {
					await reader.cancel();
					throw new Error('Request aborted');
				}

				const { done, value } = await reader.read();
				if (done) {
					Logger.debug(`[FreeDeepseek] Stream done after ${chunkCount} chunks`);
					break;
				}

				const chunk = decoder.decode(value, { stream: true });
				chunkCount++;
				
				if (chunkCount <= 3) {
					Logger.debug(`[FreeDeepseek] Chunk ${chunkCount}: ${chunk.substring(0, 200)}`);
				}

				buffer += chunk;
				const lines = buffer.split('\n');
				
				// 保留最后一行（可能不完整）
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					
					const data = line.slice(6).trim();
					if (data === '[DONE]' || data === '{}') continue;

					try {
						const parsed = JSON.parse(data);
						
						// Debug: Log what we actually received
						Logger.debug(`[FreeDeepseek] Raw parsed:`, {
							keys: Object.keys(parsed),
							hasV: !!parsed.v,
							hasP: !!parsed.p,
							hasChoices: !!parsed.choices,
							p: parsed.p,
							vPreview: parsed.v ? parsed.v.substring(0, 30) : 'no v field'
						});
						
						// DeepSeek format: {"v": "content", "p": "response/content" or "response/thinking", "o": "APPEND"}
						if (parsed.v && typeof parsed.v === 'string') {
							// 处理思考内容 (response/thinking)
							if (parsed.p === 'response/thinking') {
								if (!isSilentModel) {
									// 非静默模式：输出思考过程
									if (thinkingContent === '') {
										// 第一次思考内容，添加标记
										onChunk({
											delta: '\n\n<details class="thinking-section" open>\n<summary>💭 思考过程</summary>\n<div class="thinking-content">',
											isComplete: false
										});
					const now = Date.now();
					if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
						await new Promise(resolve => setTimeout(resolve, 0));
						lastYieldTime = now;
					}
									}
									onChunk({
										delta: parsed.v,
										isComplete: false
									});
									thinkingContent += parsed.v;
								}
								// 静默模式：不输出思考过程
								continue;
							}
							
							// 处理普通文本内容 (response/content)
							if (!parsed.p || parsed.p === 'response/content') {
								// 如果之前有思考内容且刚开始输出正常内容，添加结束标记
								if (thinkingContent && !isSilentModel) {
									onChunk({
										delta: '</div>\n</details>\n\n<div class="final-answer"><span class="final-answer-label">📝 最终回答</span>\n\n',
										isComplete: false
									});
									thinkingContent = ''; // 清空，避免重复输出
								}

								// 移除引用标记
								const cleanContent = parsed.v.replace(/\[citation:\d+\]/g, '');
								
								if (cleanContent) {
									onChunk({
										delta: cleanContent,
										isComplete: false
									});
									fullContent += cleanContent;
								}
							}
							
							// 处理搜索结果
							else if (parsed.p === 'response/search_results' && !isSilentModel) {
								try {
									const results = Array.isArray(parsed.v) ? parsed.v : JSON.parse(parsed.v);
									const searchText = results
										.map((item: any) => `检索 ${item.title || item.name || ''} - ${item.url || ''}`)
										.join('\n') + '\n\n';
									
									onChunk({
										delta: searchText,
										isComplete: false
									});
									
									searchResults.push(...results.map((item: any) => `${item.title || item.name || ''} - ${item.url || ''}`));
								} catch (e) {
									// Ignore search result parse errors
								}
							}
						}
						
						// 检查是否完成 (OpenAI format compatibility check)
						if (parsed.choices && Array.isArray(parsed.choices)) {
							for (const choice of parsed.choices) {
								if (choice.finish_reason === 'stop') {
									// 关闭 final-answer div 如果之前有思考内容
									if (thinkingContent && !isSilentModel) {
										onChunk({
											delta: '\n</div>',
											isComplete: false
										});
					const now = Date.now();
					if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
						await new Promise(resolve => setTimeout(resolve, 0));
						lastYieldTime = now;
					}
									}
									
									// 添加搜索结果来源
									if (searchResults.length > 0) {
										const sourcesText = '\n\n搜索结果来自：\n' + searchResults.join('\n');
										onChunk({
											delta: sourcesText,
											isComplete: false
										});
					const now = Date.now();
					if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
						await new Promise(resolve => setTimeout(resolve, 0));
						lastYieldTime = now;
					}
									}

									onChunk({
										delta: '',
										isComplete: true,
										usage: {
											promptTokens: Math.ceil(fullContent.length / 4),
											completionTokens: Math.ceil(fullContent.length / 4),
											totalTokens: Math.ceil(fullContent.length / 2),
										}
									});
					const now = Date.now();
					if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
						await new Promise(resolve => setTimeout(resolve, 0));
						lastYieldTime = now;
					}
								}
							}
						}
					} catch (parseError) {
						Logger.warn('[FreeDeepseek] Failed to parse streaming SSE line:', parseError);
					}
				}
			}
			
			// Stream ended, send completion
			// 关闭 final-answer div 如果之前有思考内容
			if (thinkingContent && !isSilentModel) {
				onChunk({
					delta: '\n</div>',
					isComplete: false
				});
					const now = Date.now();
					if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
						await new Promise(resolve => setTimeout(resolve, 0));
						lastYieldTime = now;
					}
			}
			
			// 添加搜索结果来源
			if (searchResults.length > 0) {
				const sourcesText = '\n\n搜索结果来自：\n' + searchResults.join('\n');
				onChunk({
					delta: sourcesText,
					isComplete: false
				});
					const now = Date.now();
					if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
						await new Promise(resolve => setTimeout(resolve, 0));
						lastYieldTime = now;
					}
			}

			onChunk({
				delta: '',
				isComplete: true,
				usage: {
					promptTokens: Math.ceil(fullContent.length / 4),
					completionTokens: Math.ceil(fullContent.length / 4),
					totalTokens: Math.ceil(fullContent.length / 2),
				}
			});
		} catch (error) {
			Logger.error('[FreeDeepseek] Stream error:', error);
			throw error;
		} finally {
			reader.releaseLock();
		}
	}

	/**
	 * 验证 token 是否有效
	 */
	async validateToken(): Promise<boolean> {
		try {
			const response = await requestUrl({
				url: 'https://chat.deepseek.com/api/v0/users/current',
				method: 'GET',
				headers: {
					'authorization': `Bearer ${this.authToken}`,
					...FreeDeepseekProviderImpl.FAKE_HEADERS,
				},
				throw: false,
			});

			return response.status === 200;
		} catch (error) {
			Logger.error('[FreeDeepseek] Failed to validate token:', error);
			return false;
		}
	}
}
