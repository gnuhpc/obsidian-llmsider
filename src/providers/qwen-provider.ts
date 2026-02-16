import { createOpenAI } from '@ai-sdk/openai';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';
import { BaseLLMProvider } from './base-provider';
import { ChatMessage, LLMResponse, StreamingResponse, QwenProvider, GeneratedImage } from '../types';
import { UnifiedTool } from '../tools/unified-tool-manager';

export class QwenProviderImpl extends BaseLLMProvider {
	private region: string;
	private outputModalities?: string[];
	private supportsVisionOverride?: boolean;

	constructor(config: QwenProvider) {
		super(config);
		this.region = config.region || 'cn-beijing';
		this.outputModalities = (config as any).outputModalities;
		this.supportsVisionOverride = config.supportsVision;
		Logger.debug(`Constructor called with region: ${this.region}`);
		this.initializeModelConfig();
	}

	protected initializeModelConfig(): void {
		try {
			// Validate API key
			if (!this.apiKey) {
				throw new Error('Qwen API key is required');
			}

			// Use fixed Qwen API endpoint through OpenAI-compatible interface
			const baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

			// Simple initialization following OpenAI Compatible provider pattern
			this.model_config = createOpenAI({
				apiKey: this.apiKey,
				baseURL: baseUrl,
				fetch: this.createCustomFetch()
			});

			//Logger.debug(`Model config initialized successfully`);
		} catch (error) {
			Logger.error(`Failed to initialize model config:`, error);
			this.model_config = undefined;
			throw error;
		}
	}

	protected getAISDKModel(): unknown {
		if (!this.model_config) {
			Logger.error(`Model config not initialized`);
			throw new Error('Qwen provider not properly initialized');
		}
		Logger.debug(`Getting AI SDK model for: ${this.model}`);
		return this.model_config.chat(this.model);
	}

	/**
	 * Create a custom fetch wrapper with adaptive timeout and Keep-Alive support
	 * - 60s default, 180s for large requests >100KB, 120s for streaming
	 */
	private createCustomFetch() {
		const originalFetch = global.fetch || fetch;
		
		return async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			// Clone init to avoid mutation
			const fetchInit = { ...init };
			
			if (typeof fetchInit.body === 'string' && fetchInit.body.includes('"role":"developer"')) {
				try {
					const parsedBody = JSON.parse(fetchInit.body);
					if (Array.isArray(parsedBody?.messages)) {
						parsedBody.messages = parsedBody.messages.map((message: { role?: string }) => {
							if (message?.role === 'developer') {
								return { ...message, role: 'system' };
							}
							return message;
						});
						fetchInit.body = JSON.stringify(parsedBody);
					}
				} catch (error) {
					Logger.warn('[Qwen] Failed to normalize developer role in request body:', error);
				}
			}
			
		// Add adaptive timeout control
		// Large content requests need longer timeout
		// Streaming: 120s, Large non-streaming (>50KB): 180s, Default: 60s
		const isStreaming = fetchInit.body?.toString().includes('"stream":true');
		const bodySize = fetchInit.body ? new Blob([fetchInit.body as BodyInit]).size : 0;
		const isLargeRequest = bodySize > 50000; // >50KB (降低阈值以涵盖更多批次)
		const timeoutMs = isStreaming ? 120000 : (isLargeRequest ? 180000 : 60000);			// Add Keep-Alive header
			fetchInit.headers = {
				...fetchInit.headers,
				'Connection': 'keep-alive',
				'Keep-Alive': 'timeout=120, max=100'
			};
			
			// Create AbortController for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				Logger.warn(`[Qwen] Request timeout after ${timeoutMs}ms for ${url}`);
				controller.abort();
			}, timeoutMs);
			
			// Merge abort signals
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
				
				Logger.error('[Qwen] Fetch error:', {
					url: url.toString(),
					error: error.message,
					code: error.code,
					name: error.name
				});
				
				if (error.name === 'AbortError') {
					throw new Error(`Request timeout after ${timeoutMs}ms for ${url}`);
				}
				throw error;
			}
		};
	}

	protected getEndpointForLogging(): string {
		return 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
	}

	getProviderName(): string {
		return 'qwen';
	}

	supportsVision(): boolean {
		// Only use user's explicit configuration
		if (this.supportsVisionOverride !== undefined) {
			Logger.debug(`[Qwen] Using user vision configuration for ${this.model}:`, this.supportsVisionOverride);
			return this.supportsVisionOverride;
		}

		// Default to false if not configured
		Logger.debug(`[Qwen] No vision configuration set for ${this.model}, defaulting to false`);
		return false;
	}

	async listModels(): Promise<string[]> {
		try {
			// Common Qwen models based on official Alibaba Cloud documentation
			// https://help.aliyun.com/zh/model-studio/models
			// These are production-ready models that may not appear in the base API
			const commonModels = [
				// === 旗舰商业模型 (Flagship Commercial Models) ===
				// Qwen3 Max - 最强能力,适合复杂任务
				'qwen3-max',
				'qwen3-max-2025-09-23',
				'qwen3-max-preview',
				// Qwen Plus - 效果、速度、成本均衡
				'qwen-plus',
				'qwen-plus-latest',
				'qwen-plus-2025-09-11',
				'qwen-plus-2025-07-28',
				'qwen-plus-2025-04-28',
				// Qwen Flash - 适合简单任务,速度快、成本低
				'qwen-flash',
				'qwen-flash-2025-07-28',
				// Qwen Turbo - 后续不再更新,建议替换为Flash
				'qwen-turbo',
				'qwen-turbo-latest',
				'qwen-turbo-2025-07-15',
				'qwen-turbo-2025-04-28',
				// QwQ - 推理模型
				'qwq-plus',
				'qwq-plus-latest',
				'qwq-plus-2025-03-05',
				// Qwen Long - 超长上下文窗口(10M tokens)
				'qwen-long',
				'qwen-long-latest',
				'qwen-long-2025-01-25',
				// Qwen Omni - 多模态模型(文本、图片、音频、视频)
				'qwen3-omni-flash',
				'qwen3-omni-flash-2025-09-15',
				// Qwen Omni Realtime - 实时多模态
				'qwen3-omni-flash-realtime',
				'qwen3-omni-flash-realtime-2025-09-15',
				// QVQ - 视觉推理模型
				'qvq-max',
				'qvq-max-latest',
				'qvq-max-2025-05-15',
				'qvq-max-2025-03-25',
				'qvq-plus',
				'qvq-plus-latest',
				'qvq-plus-2025-05-15',
				
				// === Qwen VL (Vision-Language) - 视觉理解模型 ===
				'qwen3-vl-plus',
				'qwen3-vl-plus-2025-09-23',
				'qwen3-vl-flash',
				'qwen3-vl-flash-2025-10-15',
				// OCR专用模型
				'qwen-vl-ocr',
				'qwen-vl-ocr-latest',
				'qwen-vl-ocr-2025-08-28',
				'qwen-vl-ocr-2025-04-13',
				'qwen-vl-ocr-2024-10-28',
				
				// === Qwen Audio - 音频理解模型 ===
				'qwen-audio-turbo',
				'qwen-audio-turbo-latest',
				'qwen-audio-turbo-2024-12-04',
				'qwen-audio-turbo-2024-08-07',
				
				// === Qwen Math - 数学模型 ===
				'qwen-math-plus',
				'qwen-math-turbo',
				
				// === Qwen Coder - 代码模型 ===
				'qwen3-coder-plus',
				'qwen3-coder-plus-2025-09-23',
				'qwen3-coder-plus-2025-07-22',
				'qwen3-coder-flash',
				'qwen3-coder-flash-2025-07-28',
				
				// === Qwen Translation - 翻译模型 ===
				'qwen-mt-plus',
				'qwen-mt-flash',
				'qwen-mt-turbo',
				
				// === 其他专业模型 ===
				// Data Mining
				'qwen-doc-turbo',
				// Deep Research
				'qwen-deep-research',
				
				// === 开源模型 (Open Source Models) ===
				// Qwen3 开源系列
				'qwen3-next-80b-a3b-thinking',
				'qwen3-next-80b-a3b-instruct',
				'qwen3-235b-a22b-thinking-2507',
				'qwen3-235b-a22b-instruct-2507',
				'qwen3-30b-a3b-thinking-2507',
				'qwen3-30b-a3b-instruct-2507',
				'qwen3-235b-a22b',
				'qwen3-32b',
				'qwen3-30b-a3b',
				'qwen3-14b',
				'qwen3-8b',
				'qwen3-4b',
				'qwen3-1.7b',
				'qwen3-0.6b',
				// QwQ 开源推理模型
				'qwq-32b',
				'qwq-32b-preview',
				// Qwen2.5 系列
				'qwen2.5-72b-instruct',
				'qwen2.5-32b-instruct',
				'qwen2.5-14b-instruct',
				'qwen2.5-7b-instruct',
				'qwen2.5-3b-instruct',
				'qwen2.5-1.5b-instruct',
				'qwen2.5-0.5b-instruct',
				// Qwen2 系列
				'qwen2-72b-instruct',
				'qwen2-57b-a14b-instruct',
				'qwen2-7b-instruct',
				'qwen2-1.5b-instruct',
				'qwen2-0.5b-instruct',
				// Qwen1.5 系列
				'qwen1.5-110b-chat',
				'qwen1.5-72b-chat',
				'qwen1.5-32b-chat',
				'qwen1.5-14b-chat',
				'qwen1.5-7b-chat',
				'qwen1.5-1.8b-chat',
				'qwen1.5-0.5b-chat',
				// 旧版Qwen
				'qwen-72b-chat',
				'qwen-14b-chat',
				'qwen-7b-chat',
				'qwen-1.8b-longcontext-chat',
				'qwen-1.8b-chat',
				
				// === 开源多模态模型 ===
				// QVQ 开源
				'qvq-72b-preview',
				// Qwen Omni 开源
				'qwen2.5-omni-7b',
				'qwen3-omni-30b-a3b-captioner',
				// Qwen VL 开源
				'qwen3-vl-235b-a22b-thinking',
				'qwen3-vl-235b-a22b-instruct',
				'qwen3-vl-32b-thinking',
				'qwen3-vl-32b-instruct',
				'qwen3-vl-30b-a3b-thinking',
				'qwen3-vl-30b-a3b-instruct',
				'qwen3-vl-8b-thinking',
				'qwen3-vl-8b-instruct',
				'qwen2.5-vl-72b-instruct',
				'qwen2.5-vl-32b-instruct',
				'qwen2.5-vl-7b-instruct',
				'qwen2.5-vl-3b-instruct',
				'qwen2.5-vl-2b-instruct',
				'qwen2-vl-72b-instruct',
				'qwen2-vl-7b-instruct',
				'qwen2-vl-2b-instruct',
				// Qwen Audio 开源
				'qwen2-audio-instruct',
				'qwen-audio-chat',
				
				// === 开源专业模型 ===
				// Math Models
				'qwen2.5-math-72b-instruct',
				'qwen2.5-math-7b-instruct',
				'qwen2.5-math-1.5b-instruct',
				// Code Models
				'qwen3-coder-480b-a35b-instruct',
				'qwen3-coder-30b-a3b-instruct',
				'qwen2.5-coder-32b-instruct',
				'qwen2.5-coder-14b-instruct',
				'qwen2.5-coder-7b-instruct',
				'qwen2.5-coder-3b-instruct',
				'qwen2.5-coder-1.5b-instruct',
				'qwen2.5-coder-0.5b-instruct',
				
				// === 图像生成模型 (Image Generation Models) ===
				// Wanx (通义万相) - Text-to-Image
				'wanx-v1',
				'wanx-sketch-to-image-v1',
				'wanx-style-repaint-v1',
				'wanx-background-generation-v2',
				// Qwen Image (通义万相新API)
				'qwen-image-plus',
				'qwen-image',
				// Flux models
				'flux-schnell',
				'flux-dev',
			];

			// Fetch base models from DashScope Models API
			// This endpoint returns basic/foundation models
			const pageSize = 100;
			let pageNo = 1;
			let apiModels: any[] = [];
			let totalModels = 0;

			Logger.debug('Fetching base models from DashScope Models API...');

			// Fetch all pages of base models
			do {
				const url = `https://dashscope.aliyuncs.com/api/v1/models?page_no=${pageNo}&page_size=${pageSize}`;
				Logger.debug(`Fetching page ${pageNo}...`);

				const response = await requestUrl({
					url: url,
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${this.apiKey}`,
						'Content-Type': 'application/json'
					}
				});

				if (response.status !== 200) {
					Logger.error('Error Response:', response.text);
					break; // Don't throw, just use common models
				}

				const data = response.json;
				const pageModels = data.output?.models || [];
				totalModels = data.output?.total || 0;
				
				apiModels = apiModels.concat(pageModels);
				
				Logger.debug(`Page ${pageNo}: Got ${pageModels.length} models, Total: ${apiModels.length}/${totalModels}`);

				// Check if we have all models
				if (apiModels.length >= totalModels) {
					break;
				}

				pageNo++;

				// Safety limit
				if (pageNo > 20) {
					Logger.warn('Reached pagination safety limit (20 pages)');
					break;
				}

			} while (true);

			Logger.debug(`Successfully fetched ${apiModels.length} base models from API`);
			
			// Extract model names from API response
			const apiModelNames = apiModels
				.map((model: { name?: string }) => model.name)
				.filter((name: string | undefined): name is string => !!name);

			// Combine common models with API models and remove duplicates
			const allModels = [...new Set([...commonModels, ...apiModelNames])].sort();

			Logger.debug(`Total available models: ${allModels.length} (${commonModels.length} common + ${apiModelNames.length} from API)`);
			Logger.debug('Available models:', allModels);
			
			return allModels;
		} catch (error) {
			Logger.error('Error fetching models from API:', error);
			Logger.error('Error details:', {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			});
			// Return empty array to let user input model manually
			Logger.debug('API call failed, returning empty list for manual input');
			return [];
		}
	}

	/**
	 * Get detailed information for a specific model
	 * Implements DashScope Models.get(name) API
	 * Reference: Python SDK Models.get() uses SUB_PATH = 'models' + name
	 */
	async getModelDetails(modelName: string): Promise<any> {
		try {
			const url = `https://dashscope.aliyuncs.com/api/v1/models/${encodeURIComponent(modelName)}`;
			Logger.debug('Fetching model details from DashScope Models API...');
			Logger.debug('Request URL:', url);

			// Use Obsidian's requestUrl to bypass CORS
			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				}
			});

			Logger.debug('Model details response:', JSON.stringify(response.json, null, 2));

			if (response.status !== 200) {
				Logger.error('Error fetching model details:', response.text);
				return null;
			}

			// Extract model details from response
			// DashScope API returns model details in output object
			return response.json.output || response.json;
		} catch (error) {
			Logger.error('Error fetching model details:', error);
			return null;
		}
	}

	async sendMessage(messages: ChatMessage[], tools?: UnifiedTool[], systemMessage?: string): Promise<LLMResponse> {
		// Check if this model supports image generation
		const supportsImageGeneration = this.outputModalities?.includes('image') || 
			this.model.includes('wanx') || 
			this.model.includes('flux');
		
		if (supportsImageGeneration) {
			// For image generation models, use specialized method
			Logger.debug('Using image generation for Qwen model with image output modality');
			return this.sendMessageWithImageGeneration(messages, tools, systemMessage);
		}
		
		return this.sendMessageWithAISDK(messages, tools, systemMessage);
	}

	/**
	 * Send message with image generation support (Qwen/Wanx)
	 * Uses DashScope multimodal API for qwen-image models
	 * Uses DashScope text-to-image API for wanx/flux models
	 */
	private async sendMessageWithImageGeneration(
		messages: ChatMessage[],
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<LLMResponse> {
		try {
			// Extract the prompt from the last user message
			const lastUserMessage = messages.filter(m => m.role === 'user').pop();
			const prompt = lastUserMessage?.content || '';
			
			// qwen-image models use the new multimodal generation API
			if (this.model.includes('qwen-image')) {
				const requestBody = {
					model: this.model,
					input: {
						messages: [
							{
								role: 'user',
								content: [
									{
										text: prompt
									}
								]
							}
						]
					},
					parameters: {
						size: '1328*1328',
						prompt_extend: true,
						watermark: false
					}
				};

				const response = await requestUrl({
					url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${this.apiKey}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(requestBody)
				});

				if (response.status !== 200) {
					throw new Error(`API request failed: ${response.status}`);
				}

				const data = response.json;
				
				// Check for error
				if (data.code) {
					throw new Error(`Image generation failed: ${data.message || data.code}`);
				}
				
				// Extract image from new format: output.choices[0].message.content[0].image
				const imageUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image;
				if (!imageUrl) {
					throw new Error('No image URL in response');
				}
				
				const images: GeneratedImage[] = [{
					type: 'image_url',
					image_url: {
						url: imageUrl
					}
				}];
				
				return {
					content: '',
					model: this.model,
					usage: data.usage ? {
						promptTokens: 0,
						completionTokens: 0,
						totalTokens: data.usage.image_count || 1
					} : {
						promptTokens: 0,
						completionTokens: 0,
						totalTokens: 1
					},
					finishReason: 'stop',
					images: images,
					metadata: {
						provider: 'qwen',
						rawResponse: data
					}
				};
			}
			
			// wanx/flux models use the old text2image API with async polling
			const requestBody: any = {
				model: this.model,
				input: {
					prompt: prompt
				},
				parameters: {
					n: 1, // Number of images to generate
					size: '1024*1024' // Image size
				}
			};

			const response = await requestUrl({
				url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
					'X-DashScope-Async': 'enable' // Enable async mode
				},
				body: JSON.stringify(requestBody)
			});

			if (response.status !== 200) {
				throw new Error(`API request failed: ${response.status}`);
			}

			const data = response.json;
			
			// DashScope returns task_id for async generation
			const taskId = data.output?.task_id;
			if (taskId) {
				// Poll for result
				const result = await this.pollImageGenerationResult(taskId);
				
				const images: GeneratedImage[] = result.results?.map((imgData: any) => ({
					type: 'image_url',
					image_url: {
						url: imgData.url
					}
				})) || [];
				
				return {
					content: '',
					model: this.model,
					usage: {
						promptTokens: 0,
						completionTokens: 0,
						totalTokens: 0
					},
					finishReason: 'stop',
					images: images,
					metadata: {
						provider: 'qwen',
						rawResponse: result
					}
				};
			} else if (data.output?.results) {
				// Sync response
				const images: GeneratedImage[] = data.output.results.map((imgData: any) => ({
					type: 'image_url',
					image_url: {
						url: imgData.url
					}
				}));
				
				return {
					content: '',
					model: this.model,
					usage: data.usage || {
						promptTokens: 0,
						completionTokens: 0,
						totalTokens: 0
					},
					finishReason: 'stop',
					images: images,
					metadata: {
						provider: 'qwen',
						rawResponse: data
					}
				};
			}
			
			throw new Error('No valid response from image generation API');
		} catch (error) {
			Logger.error('Error in Qwen image generation request:', error);
			throw error;
		}
	}

	/**
	 * Poll for async image generation result
	 */
	private async pollImageGenerationResult(taskId: string): Promise<any> {
		const maxAttempts = 30; // 30 attempts
		const pollInterval = 2000; // 2 seconds
		
		for (let i = 0; i < maxAttempts; i++) {
			try {
				const response = await requestUrl({
					url: `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${this.apiKey}`,
						'Content-Type': 'application/json'
					}
				});
				
				if (response.status !== 200) {
					throw new Error(`Task query failed: ${response.status}`);
				}
				
				const data = response.json;
				
				if (data.output?.task_status === 'SUCCEEDED') {
					return data.output;
				} else if (data.output?.task_status === 'FAILED') {
					throw new Error(`Image generation failed: ${data.output?.message || 'Unknown error'}`);
				}
				
				// Still processing, wait and retry
				if (i < maxAttempts - 1) {
					await new Promise(resolve => setTimeout(resolve, pollInterval));
				}
			} catch (error) {
				if (i === maxAttempts - 1) throw error;
				await new Promise(resolve => setTimeout(resolve, pollInterval));
			}
		}
		
		throw new Error('Image generation timeout');
	}

	async sendStreamingMessage(
		messages: ChatMessage[],
		onChunk: (chunk: StreamingResponse) => void,
		abortSignal?: AbortSignal,
		tools?: UnifiedTool[],
		systemMessage?: string
	): Promise<void> {
		// Check if model supports image generation
		const supportsImageGeneration = this.outputModalities?.includes('image') || 
			this.model.includes('wanx') || 
			this.model.includes('flux') ||
			this.model.includes('qwen-image');
		
		// Check if system message explicitly disables image generation (e.g., for title generation)
		const bypassImageGeneration = systemMessage?.toLowerCase().includes('no images');
		
		if (supportsImageGeneration && !bypassImageGeneration) {
			// Image generation doesn't support streaming, fallback to non-streaming
			Logger.debug('Image generation does not support streaming, using non-streaming mode');
			const result = await this.sendMessageWithImageGeneration(messages, tools, systemMessage);
			
			// Send as a single chunk
			onChunk({
				content: result.content,
				done: true,
				images: result.images,
				finishReason: result.finishReason,
				usage: result.usage
			});
			return;
		}
		
		return this.sendStreamingMessageWithAISDK(messages, onChunk, abortSignal, tools, systemMessage);
	}

	updateConfig(config: Partial<QwenProvider>): void {
		super.updateConfig(config);
		if (config.region !== undefined) {
			this.region = config.region;
		}
		if (config.supportsVision !== undefined) {
			this.supportsVisionOverride = config.supportsVision;
		}

		// Reinitialize the client with new config
		this.initializeModelConfig();
	}
}
