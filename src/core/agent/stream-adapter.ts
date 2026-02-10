/**
 * Stream Adapter for Mastra Integration
 * 
 * This module bridges Mastra's streaming output to LLMSider's StreamingIndicatorManager.
 * It handles text chunks, tool calls, and tool results from Mastra's agent execution.
 */

import { Logger } from '../../utils/logger';
import { StreamingIndicatorManager } from '../../processors/helpers/streaming-indicator-manager';

/**
 * Types of stream events from Mastra
 */
export type MastraStreamEventType = 
	| 'text-delta'      // Incremental text content
	| 'tool-call'       // Tool invocation
	| 'tool-result'     // Tool execution result
	| 'step-start'      // Step execution start
	| 'step-finish'     // Step execution complete
	| 'error';          // Error occurred

/**
 * Stream event from Mastra
 */
export interface MastraStreamEvent {
	/** Event type */
	type: MastraStreamEventType;
	/** Event payload */
	data: unknown;
	/** Event timestamp */
	timestamp?: number;
}

/**
 * Text delta event data
 */
export interface TextDeltaData {
	/** Text chunk */
	delta: string;
	/** Full text so far */
	fullText?: string;
}

/**
 * Tool call event data
 */
export interface ToolCallData {
	/** Tool name */
	name: string;
	/** Tool input parameters */
	input: Record<string, unknown>;
	/** Tool call ID */
	id?: string;
}

/**
 * Tool result event data
 */
export interface ToolResultData {
	/** Tool name */
	name: string;
	/** Tool call ID */
	id?: string;
	/** Execution result */
	result?: unknown;
	/** Error message if failed */
	error?: string;
	/** Execution time in ms */
	executionTime?: number;
}

/**
 * Step event data
 */
export interface StepEventData {
	/** Step ID */
	stepId: string;
	/** Step type */
	type: string;
	/** Step status */
	status?: 'start' | 'complete' | 'error';
}

/**
 * MastraStreamAdapter - Adapts Mastra streaming to LLMSider UI
 * 
 * This adapter converts Mastra's stream events into updates for StreamingIndicatorManager,
 * ensuring seamless integration with existing LLMSider UI components.
 */
export class MastraStreamAdapter {
	private streamingManager: StreamingIndicatorManager;
	private currentMessage: string = '';
	private currentToolName: string = '';
	private isToolExecuting: boolean = false;
	
	constructor(streamingManager: StreamingIndicatorManager) {
		this.streamingManager = streamingManager;
	}
	
	/**
	 * Process a stream event from Mastra
	 * 
	 * @param event - Stream event to process
	 */
	async handleStreamEvent(event: MastraStreamEvent): Promise<void> {
		try {
			Logger.debug('[MastraStreamAdapter] Handling event:', event.type);
			
			switch (event.type) {
				case 'text-delta':
					await this.handleTextDelta(event.data as TextDeltaData);
					break;
				
				case 'tool-call':
					await this.handleToolCall(event.data as ToolCallData);
					break;
				
				case 'tool-result':
					await this.handleToolResult(event.data as ToolResultData);
					break;
				
				case 'step-start':
					await this.handleStepStart(event.data as StepEventData);
					break;
				
				case 'step-finish':
					await this.handleStepFinish(event.data as StepEventData);
					break;
				
				case 'error':
					await this.handleError(event.data);
					break;
				
				default:
					Logger.warn('[MastraStreamAdapter] Unknown event type:', event.type);
			}
		} catch (error) {
			Logger.error('[MastraStreamAdapter] Error handling stream event:', error);
		}
	}
	
	/**
	 * Handle text delta (incremental text content)
	 */
	private async handleTextDelta(data: TextDeltaData): Promise<void> {
		// Accumulate text
		this.currentMessage += data.delta;
		
		// Update streaming indicator if not executing a tool
		if (!this.isToolExecuting) {
			this.streamingManager.updateStreamingIndicator(this.currentMessage);
		}
	}
	
	/**
	 * Handle tool call event
	 */
	private async handleToolCall(data: ToolCallData): Promise<void> {
		Logger.debug('[MastraStreamAdapter] Tool call:', data.name);
		
		this.currentToolName = data.name;
		this.isToolExecuting = true;
		
		// Create tool indicator
		this.streamingManager.createToolIndicator();
		
		// Update to show intent
		this.streamingManager.updateToolIndicator(
			'intent',
			data.name,
			data.input
		);
		
		// Update to executing state
		this.streamingManager.updateToolIndicator(
			'executing',
			data.name,
			data.input
		);
	}
	
	/**
	 * Handle tool result event
	 */
	private async handleToolResult(data: ToolResultData): Promise<void> {
		Logger.debug('[MastraStreamAdapter] Tool result:', data.name);
		
		this.isToolExecuting = false;
		
		// Update tool indicator based on success/failure
		if (data.error) {
			this.streamingManager.updateToolIndicator(
				'error',
				data.name,
				{},
				data.error
			);
		} else {
			// Convert result to string for observation content
			const resultStr = data.result 
				? (typeof data.result === 'string' ? data.result : JSON.stringify(data.result))
				: undefined;
			
			this.streamingManager.updateToolIndicator(
				'success',
				data.name,
				{},
				resultStr
			);
		}
	}
	
	/**
	 * Handle step start event
	 */
	private async handleStepStart(data: StepEventData): Promise<void> {
		Logger.debug('[MastraStreamAdapter] Step start:', data.stepId);
		
		// Show streaming indicator for step
		this.streamingManager.showStreamingIndicator(
			`Executing step ${data.stepId}...`
		);
	}
	
	/**
	 * Handle step finish event
	 */
	private async handleStepFinish(data: StepEventData): Promise<void> {
		Logger.debug('[MastraStreamAdapter] Step finish:', data.stepId);
		
		// Hide streaming indicator
		this.streamingManager.hideStreamingIndicator();
	}
	
	/**
	 * Handle error event
	 */
	private async handleError(error: unknown): Promise<void> {
		Logger.error('[MastraStreamAdapter] Error event:', error);
		
		// Show error in streaming indicator
		const errorMessage = error instanceof Error 
			? error.message 
			: 'An error occurred';
		
		this.streamingManager.updateStreamingIndicator(
			`Error: ${errorMessage}`
		);
		
		// If tool was executing, mark as error
		if (this.isToolExecuting && this.currentToolName) {
			this.streamingManager.updateToolIndicator(
				'error',
				this.currentToolName,
				{},
				errorMessage
			);
			this.isToolExecuting = false;
		}
	}
	
	/**
	 * Reset adapter state
	 * 
	 * Call this when starting a new conversation or execution
	 */
	reset(): void {
		this.currentMessage = '';
		this.currentToolName = '';
		this.isToolExecuting = false;
	}
	
	/**
	 * Get accumulated message text
	 */
	getCurrentMessage(): string {
		return this.currentMessage;
	}
	
	/**
	 * Check if currently executing a tool
	 */
	isExecutingTool(): boolean {
		return this.isToolExecuting;
	}
}

/**
 * Create a stream handler function for Mastra
 * 
 * This creates a callback function that can be passed to Mastra's streaming methods.
 * It converts Mastra's stream format to MastraStreamEvents and processes them.
 * 
 * @param streamingManager - LLMSider's streaming indicator manager
 * @returns Stream handler function
 */
export function createMastraStreamHandler(
	streamingManager: StreamingIndicatorManager
): (chunk: unknown) => void {
	const adapter = new MastraStreamAdapter(streamingManager);
	
	return (chunk: unknown) => {
		try {
			// Convert Mastra chunk to our event format
			// Note: This will need to be adapted based on actual Mastra stream format
			const event = convertMastraChunkToEvent(chunk);
			
			if (event) {
				adapter.handleStreamEvent(event);
			}
		} catch (error) {
			Logger.error('[MastraStreamHandler] Error processing chunk:', error);
		}
	};
}

/**
 * Convert Mastra chunk format to MastraStreamEvent
 * 
 * This function needs to be implemented based on actual Mastra stream format.
 * For now, it's a placeholder that expects a specific format.
 */
function convertMastraChunkToEvent(chunk: unknown): MastraStreamEvent | null {
	// TODO: Implement based on actual Mastra stream format
	// This is a placeholder implementation
	
	if (!chunk || typeof chunk !== 'object') {
		return null;
	}
	
	const chunkObj = chunk as Record<string, unknown>;
	
	// Try to detect event type from chunk structure
	if ('delta' in chunkObj || 'text' in chunkObj) {
		return {
			type: 'text-delta',
			data: {
				delta: chunkObj.delta || chunkObj.text || '',
				fullText: chunkObj.fullText
			} as TextDeltaData,
			timestamp: Date.now()
		};
	}
	
	if ('toolCall' in chunkObj) {
		const toolCall = chunkObj.toolCall as Record<string, unknown>;
		return {
			type: 'tool-call',
			data: {
				name: toolCall.name as string,
				input: toolCall.input as Record<string, unknown>,
				id: toolCall.id as string | undefined
			} as ToolCallData,
			timestamp: Date.now()
		};
	}
	
	if ('toolResult' in chunkObj) {
		const toolResult = chunkObj.toolResult as Record<string, unknown>;
		return {
			type: 'tool-result',
			data: {
				name: toolResult.name as string,
				id: toolResult.id as string | undefined,
				result: toolResult.result,
				error: toolResult.error as string | undefined,
				executionTime: toolResult.executionTime as number | undefined
			} as ToolResultData,
			timestamp: Date.now()
		};
	}
	
	Logger.debug('[MastraStreamAdapter] Unknown chunk format:', chunk);
	return null;
}

/**
 * Create a simple text stream handler that only handles text deltas
 * 
 * Use this for simpler use cases where you only need to display text.
 * 
 * @param onTextChunk - Callback for text chunks
 * @returns Stream handler function
 */
export function createSimpleTextStreamHandler(
	onTextChunk: (text: string) => void
): (chunk: unknown) => void {
	return (chunk: unknown) => {
		try {
			const event = convertMastraChunkToEvent(chunk);
			
			if (event && event.type === 'text-delta') {
				const data = event.data as TextDeltaData;
				onTextChunk(data.delta);
			}
		} catch (error) {
			Logger.error('[SimpleTextStreamHandler] Error processing chunk:', error);
		}
	};
}
