import { ChatMessage, StreamingResponse } from '../types';
import { Logger } from '././logger';

export interface TextContent {
	type: 'text';
	text: string;
}

export interface LLMRequestLog {
	requestId: string;
	timestamp: number;
	provider: string;
	model: string;
	endpoint: string;
	requestData: {
		messages: ChatMessage[];
		maxTokens: number;
		temperature: number;
		stream: boolean;
		tools?: unknown[];
		systemMessage?: string;
	};
}

export interface LLMResponseLog {
	requestId: string;
	timestamp: number;
	provider: string;
	model: string;
	responseData: {
		content: string;
		usage?: {
			promptTokens: number;
			completionTokens: number;
			totalTokens: number;
		};
		finishReason?: string;
		toolCalls?: unknown[];
		metadata?: unknown;
	};
	duration: number;
	isStreaming: boolean;
}

export interface StreamingBuffer {
	requestId: string;
	startTime: number;
	provider: string;
	model: string;
	chunks: string[];
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	isComplete: boolean;
	finishReason?: string;
	toolCalls?: unknown[];
	metadata?: unknown;
}

export class LLMLogger {
	private static instance: LLMLogger;
	private streamingBuffers: Map<string, StreamingBuffer> = new Map();
	private requestCounter = 0;

	private constructor() {}

	static getInstance(): LLMLogger {
		if (!LLMLogger.instance) {
			LLMLogger.instance = new LLMLogger();
		}
		return LLMLogger.instance;
	}

	generateRequestId(): string {
		this.requestCounter++;
		return `req_${Date.now()}_${this.requestCounter}`;
	}

	logRequest(request: LLMRequestLog): void {
		const formattedLog = this.formatRequestLog(request);
		Logger.debug(`${formattedLog}`);
	}

	logResponse(response: LLMResponseLog): void {
		const formattedLog = this.formatResponseLog(response);
		Logger.debug(`${formattedLog}`);
	}

	startStreamingResponse(
		requestId: string,
		provider: string,
		model: string
	): void {
		const buffer: StreamingBuffer = {
			requestId,
			startTime: Date.now(),
			provider,
			model,
			chunks: [],
			isComplete: false
		};
		this.streamingBuffers.set(requestId, buffer);
	}

	addStreamingChunk(requestId: string, chunk: StreamingResponse): void {
		const buffer = this.streamingBuffers.get(requestId);
		if (!buffer) {
			Logger.warn(`No streaming buffer found for request ${requestId}`);
			return;
		}

		if (chunk.delta) {
			buffer.chunks.push(chunk.delta);
		}

		// Save tool calls from chunk
		if (chunk.toolCalls && chunk.toolCalls.length > 0) {
			Logger.debug(`Saving ${chunk.toolCalls.length} tool calls to buffer:`, chunk.toolCalls);
			buffer.toolCalls = chunk.toolCalls;
			// When tool calls are present, set finish reason
			buffer.finishReason = 'tool_calls';
		}

		// Save metadata if provided
		if (chunk.metadata) {
			buffer.metadata = chunk.metadata;
		}

		if (chunk.isComplete) {
			Logger.debug(`Stream complete. Buffer state:`, {
				hasToolCalls: !!buffer.toolCalls,
				toolCallsCount: buffer.toolCalls?.length || 0,
				finishReason: buffer.finishReason
			});
			buffer.isComplete = true;
			if (chunk.usage) {
				buffer.usage = chunk.usage;
			}
			// If no finish reason was set yet, default to 'stop'
			if (!buffer.finishReason) {
				buffer.finishReason = 'stop';
			}
			this.flushStreamingBuffer(requestId);
		}
	}

	private flushStreamingBuffer(requestId: string): void {
		const buffer = this.streamingBuffers.get(requestId);
		if (!buffer) {
			return;
		}

		const responseLog: LLMResponseLog = {
			requestId,
			timestamp: Date.now(),
			provider: buffer.provider,
			model: buffer.model,
			responseData: {
				content: buffer.chunks.join(''),
				usage: buffer.usage,
				finishReason: buffer.finishReason,
				toolCalls: buffer.toolCalls,
				metadata: buffer.metadata
			},
			duration: Date.now() - buffer.startTime,
			isStreaming: true
		};

		this.logResponse(responseLog);
		this.streamingBuffers.delete(requestId);
	}

	private formatRequestLog(request: LLMRequestLog): string {
		const requestSummary = {
			id: request.requestId,
			provider: request.provider,
			model: request.model,
			endpoint: request.endpoint,
			messagesCount: request.requestData.messages.length,
			maxTokens: request.requestData.maxTokens,
			temperature: request.requestData.temperature,
			stream: request.requestData.stream,
			hasTools: request.requestData.tools ? request.requestData.tools.length > 0 : false,
			hasSystemMessage: !!request.requestData.systemMessage,
			timestamp: new Date(request.timestamp).toISOString()
		};

		const messagesPreview = request.requestData.messages.map(msg => ({
			role: msg.role,
			contentLength: typeof msg.content === 'string' ? msg.content.length :
				Array.isArray(msg.content) ? msg.content.reduce((len, item) => len + (item.type === 'text' ? (item as TextContent).text.length : 0), 0) : 0,
			contentPreview: typeof msg.content === 'string' ?
				msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '') :
				Array.isArray(msg.content) ?
					msg.content.filter(item => item.type === 'text').map(item => (item as TextContent).text).join(' ').substring(0, 100) + '...' : ''
		}));

		return JSON.stringify({
			summary: requestSummary,
			messages: messagesPreview,
			...(request.requestData.systemMessage && {
				systemMessage: request.requestData.systemMessage.substring(0, 200) +
					(request.requestData.systemMessage.length > 200 ? '...' : '')
			})
		}, null, 2);
	}

	private formatResponseLog(response: LLMResponseLog): string {
		const responseSummary = {
			id: response.requestId,
			provider: response.provider,
			model: response.model,
			contentLength: response.responseData.content.length,
			usage: response.responseData.usage,
			finishReason: response.responseData.finishReason,
			hasToolCalls: response.responseData.toolCalls ? response.responseData.toolCalls.length > 0 : false,
			duration: `${response.duration}ms`,
			isStreaming: response.isStreaming,
			timestamp: new Date(response.timestamp).toISOString()
		};

		const contentPreview = response.responseData.content.substring(0, 200) +
			(response.responseData.content.length > 200 ? '...' : '');

		return JSON.stringify({
			summary: responseSummary,
			contentPreview,
			...(response.responseData.toolCalls && response.responseData.toolCalls.length > 0 && {
				toolCalls: response.responseData.toolCalls.map(tc => ({
					id: tc.id,
					type: tc.type,
					functionName: tc.function?.name
				}))
			}),
			...(response.responseData.metadata && { metadata: response.responseData.metadata })
		}, null, 2);
	}

	// Cleanup method for completed or failed requests
	cleanupStreamingBuffer(requestId: string): void {
		this.streamingBuffers.delete(requestId);
	}

	// Get current streaming buffers (for debugging)
	getActiveStreamingBuffers(): string[] {
		return Array.from(this.streamingBuffers.keys());
	}

	// Clear all streaming buffers (for cleanup)
	clearAllBuffers(): void {
		this.streamingBuffers.clear();
	}
}

export const llmLogger = LLMLogger.getInstance();