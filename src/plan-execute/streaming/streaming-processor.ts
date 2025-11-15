import { Logger } from '../../utils/logger';
import { I18nManager } from '../../i18n/i18n-manager';
import { StreamingIndicatorManager } from '../helpers/streaming-indicator-manager';
import { AnswerGeneratorUtils } from '../utils/answer-generator-utils';
import { ActionValidatorUtils } from '../utils/action-validator-utils';
import { ChatMessage } from '../../types';
import { SvgIcons } from '../../utils/svg-icons';

/**
 * StreamingProcessor - 负责处理流式响应
 * 从 plan-execute-processor.ts 提取，专门处理流式内容的解析、阶段检测和消息管理
 */
export class StreamingProcessor {
	// Streaming state
	private buffer: string = '';
	private currentPhase: 'question' | 'plan' | 'thought' | 'action' | 'observation' | 'final_answer' | null = null;
	private currentFinalAnswerMessage: ChatMessage | null = null;
	private finalAnswerElement: HTMLElement | null = null;
	private incompleteActionChecks: Map<string, number> = new Map();

	constructor(
		private i18n: I18nManager,
		private streamingIndicatorManager: StreamingIndicatorManager,
		private onFinalAnswerCallback: ((message: ChatMessage) => void) | null,
		private planTasks: any[]
	) {}

	/**
	 * Get current buffer content
	 */
	getBuffer(): string {
		return this.buffer;
	}

	/**
	 * Set buffer content
	 */
	setBuffer(content: string): void {
		this.buffer = content;
	}

	/**
	 * Get current phase
	 */
	getCurrentPhase(): 'question' | 'plan' | 'thought' | 'action' | 'observation' | 'final_answer' | null {
		return this.currentPhase;
	}

	/**
	 * Set current phase
	 */
	setCurrentPhase(phase: 'question' | 'plan' | 'thought' | 'action' | 'observation' | 'final_answer' | null): void {
		this.currentPhase = phase;
	}

	/**
	 * Get current final answer message
	 */
	getCurrentFinalAnswerMessage(): ChatMessage | null {
		return this.currentFinalAnswerMessage;
	}

	/**
	 * Reset streaming state
	 */
	resetStreamingState(): void {
		this.buffer = '';
		this.currentPhase = null;
		this.currentFinalAnswerMessage = null;
		this.finalAnswerElement = null;
		this.incompleteActionChecks.clear();
	}

	/**
	 * Process streaming with Plan-Execute framework
	 */
	async processStreamingWithPlanExecute(
		prompt: string,
		provider: any,
		conversationMessages: ChatMessage[],
		abortController: AbortController | null,
		isAborted: boolean,
		isExecutingTool: boolean,
		processPhaseCallback: (phase: 'question' | 'plan' | 'thought' | 'action' | 'observation' | 'final_answer', content: string) => Promise<void>,
		getIsExecutingTool: () => boolean,
		getIsAborted: () => boolean,
		updateConversationMessages: (messages: ChatMessage[]) => void
	): Promise<void> {
		Logger.debug('Starting processStreamingWithPlanExecute');

		// Show initial streaming indicator with prompt preview
		this.streamingIndicatorManager.showStreamingIndicatorWithPrompt(this.i18n.t('planExecute.contentGeneration.preparing'), prompt);

		// Prepare initial messages for LLM
		let currentMessages = [
			...conversationMessages,
			{
				id: Date.now().toString(),
				role: 'user' as const,
				content: prompt,
				timestamp: Date.now()
			}
		];

		let isCompleted = false;
		let iterationCount = 0;
		const maxIterations = 10;
		let lastResponse = '';

		while (!isCompleted && iterationCount < maxIterations) {
			// Check abort status
			if (getIsAborted() || abortController?.signal.aborted) {
				Logger.debug('Plan-Execute flow aborted by user');
				this.streamingIndicatorManager.hideStreamingIndicator();
				return;
			}

			// Wait for tool execution to complete
			while (getIsExecutingTool()) {
				Logger.debug('Tool still executing, waiting for completion...');
				this.streamingIndicatorManager.showStreamingIndicator(this.i18n.t('planExecute.toolExecution.executingTool', { toolName: 'execution' }));
				await new Promise(resolve => setTimeout(resolve, 500));
				if (getIsAborted() || abortController?.signal.aborted) {
					Logger.debug('Plan-Execute flow aborted during tool execution wait');
					this.streamingIndicatorManager.hideStreamingIndicator();
					return;
				}
			}

			iterationCount++;
			this.buffer = '';
			this.currentPhase = null;
			let hasProcessedPhase = false;
			lastResponse = '';

			Logger.debug(`Starting iteration ${iterationCount}/${maxIterations}`);
			Logger.debug(`Current conversation length: ${currentMessages.length}`);

			// Update streaming indicator
			if (iterationCount === 1) {
				this.streamingIndicatorManager.updateStreamingIndicator(`正在进行第 ${iterationCount} 轮分析...`);
			} else {
				this.streamingIndicatorManager.showStreamingIndicatorWithResponse(`正在基于工具结果进行第 ${iterationCount} 轮分析...`, lastResponse || '');
			}

			await new Promise(resolve => setTimeout(resolve, 300));

			// Debug prompt for non-first iterations
			let promptForDebug = '';
			if (iterationCount > 1) {
				const lastUserMessage = currentMessages.filter(msg => msg.role === 'user').pop();
				const lastAssistantMessage = currentMessages.filter(msg => msg.role === 'assistant').pop();

				promptForDebug = `最新对话上下文:\n`;
				if (lastAssistantMessage) {
					promptForDebug += `助手: ${typeof lastAssistantMessage.content === 'string' ? lastAssistantMessage.content.substring(0, 200) + '...' : '[非文本内容]'}\n`;
				}
				if (lastUserMessage && lastUserMessage.metadata?.isSystemMessage) {
					promptForDebug += `系统提醒: ${typeof lastUserMessage.content === 'string' ? lastUserMessage.content.substring(0, 200) + '...' : '[非文本内容]'}`;
				}
			}

			try {
				// Update indicator for non-first iterations
				if (iterationCount > 1 && promptForDebug) {
					this.streamingIndicatorManager.showStreamingIndicatorWithIterationPrompt(`正在进行第 ${iterationCount} 轮分析...`, promptForDebug);
				}

				// Log model interaction
				Logger.debug(`========== MODEL INTERACTION ${iterationCount} START ==========`);
				Logger.debug(`REQUEST to Model:`, {
					iteration: iterationCount,
					messagesCount: currentMessages.length,
					timestamp: new Date().toISOString(),
					provider: provider.constructor.name
				});

				// Stream response from LLM
				await provider.sendStreamingMessage(currentMessages, (chunk: any) => {
					if (abortController?.signal.aborted || getIsAborted()) {
						return;
					}

					if (chunk.delta) {
						this.buffer += chunk.delta;
						lastResponse += chunk.delta;

						this.streamingIndicatorManager.updateStreamingResponse(lastResponse);

						const previousPhase = this.currentPhase;
						this.processStreamingChunk(processPhaseCallback);
						if (this.currentPhase && this.currentPhase !== previousPhase) {
							Logger.debug(`PHASE CHANGE (iteration ${iterationCount}):`, {
								from: previousPhase,
								to: this.currentPhase,
								bufferLength: this.buffer.length,
								timestamp: new Date().toISOString()
							});
							hasProcessedPhase = true;
							this.streamingIndicatorManager.hideStreamingIndicator();
						}
					}
				}, abortController?.signal);

				Logger.debug(`RESPONSE from Model:`, {
					iteration: iterationCount,
					responseLength: lastResponse.length,
					timestamp: new Date().toISOString(),
					responsePreview: lastResponse.substring(0, 200) + '...',
					currentPhase: this.currentPhase,
					bufferLength: this.buffer.length
				});
				Logger.debug(`========== MODEL INTERACTION ${iterationCount} END ==========`);

				// Inject assistant's response into conversation
				if (lastResponse.trim()) {
					this.streamingIndicatorManager.showStreamingIndicator(this.i18n.t('common.processingResponse'));

					currentMessages.push({
						id: Date.now().toString(),
						role: 'assistant',
						content: lastResponse.trim(),
						timestamp: Date.now(),
						metadata: {
							phase: this.currentPhase || undefined
						}
					});
					Logger.debug(`Injected assistant response into conversation (iteration ${iterationCount})`);
					await new Promise(resolve => setTimeout(resolve, 300));
				} else {
					Logger.warn(`Empty response received in iteration ${iterationCount}`);
					this.streamingIndicatorManager.updateStreamingIndicator(`第${iterationCount}次迭代收到空响应，正在分析状态...`);

					// Handle empty response
					const lastMessage = conversationMessages[conversationMessages.length - 1];
					const hasRecentObservation = lastMessage && lastMessage.metadata?.phase === 'observation';

					if (hasRecentObservation && iterationCount <= 3) {
						Logger.debug('Recent observation found, prompting for final answer');
						this.streamingIndicatorManager.updateStreamingIndicator('检测到工具执行结果，等待最终答案...');

						const finalPrompt: ChatMessage = {
							id: `final-prompt-${Date.now()}`,
							role: 'user',
							content: '请基于上述工具执行结果，提供你的最终答案。请使用 <final_answer>...</final_answer> 标签包装你的回答。',
							timestamp: Date.now(),
							metadata: {
								phase: 'final_answer',
								isPlanExecuteMode: true
							}
						};

						currentMessages.push(finalPrompt);
						conversationMessages.push(finalPrompt);
						Logger.debug('Added final answer prompt, continuing iteration');
						continue;
					}

					if (iterationCount > 3) {
						Logger.warn('Multiple empty responses after 3 iterations, stopping');
						this.streamingIndicatorManager.updateStreamingIndicator('多次空响应，流程结束');
						setTimeout(() => {
							this.streamingIndicatorManager.hideStreamingIndicator();
						}, 2000);
						isCompleted = true;
					} else {
						this.streamingIndicatorManager.updateStreamingIndicator(`第${iterationCount}次空响应，等待下次尝试...`);
					}
				}

				// Check completion conditions
				if (this.currentPhase === 'final_answer') {
					Logger.debug('Reached final answer, completing');
					this.streamingIndicatorManager.hideStreamingIndicator();
					isCompleted = true;
				} else if (this.currentFinalAnswerMessage && !this.currentFinalAnswerMessage.metadata?.isStreaming) {
					Logger.debug('Final answer streaming completed, marking as done');
					this.currentPhase = 'final_answer';
					this.streamingIndicatorManager.hideStreamingIndicator();
					isCompleted = true;
				} else if (this.currentPhase === 'action' && !getIsExecutingTool()) {
					currentMessages = [...conversationMessages];
					Logger.debug('Tool execution completed, updated conversation with observation');
					this.streamingIndicatorManager.showStreamingIndicator('等待下一步分析...');
				} else if (!hasProcessedPhase && this.buffer.trim() === '') {
					Logger.warn('No valid phase detected and buffer is empty');

					const hasRecentObservation = conversationMessages.some(msg =>
						msg.metadata?.phase === 'observation' &&
						(Date.now() - msg.timestamp) < 30000
					);

					if (hasRecentObservation && iterationCount <= 3) {
						Logger.debug('Found recent observation, prompting for final answer');
						this.streamingIndicatorManager.updateStreamingIndicator(this.i18n.t('planExecute.answerGeneration.guidingFinalAnswer'));

						const finalAnswerPrompt: ChatMessage = {
							id: `final-answer-prompt-${Date.now()}`,
							role: 'user',
							content: '根据以上工具执行的结果，请提供最终答案。请严格使用以下格式：\n\n<final_answer>\n[你的最终答案内容]\n</final_answer>',
							timestamp: Date.now(),
							metadata: {
								phase: 'final_answer',
								isPlanExecuteMode: true
							}
						};

						currentMessages.push(finalAnswerPrompt);
						conversationMessages.push(finalAnswerPrompt);
						Logger.debug('Added explicit final answer prompt');
						continue;
					}

					this.streamingIndicatorManager.updateStreamingIndicator('未检测到有效阶段且缓冲区为空，流程结束');
					setTimeout(() => {
						this.streamingIndicatorManager.hideStreamingIndicator();
					}, 2000);
					isCompleted = true;
				} else if (!hasProcessedPhase) {
					Logger.warn('No valid phase detected but buffer has content, continuing');
					this.streamingIndicatorManager.updateStreamingIndicator('等待更多数据...');
					await new Promise(resolve => setTimeout(resolve, 100));
				} else if (this.currentPhase === 'observation') {
					this.streamingIndicatorManager.showStreamingIndicator('正在分析工具执行结果...');
					Logger.debug('Updating currentMessages with conversationMessages for observation phase');
					currentMessages = [...conversationMessages];
					Logger.debug('Observation completed, continuing to next iteration');
					await new Promise(resolve => setTimeout(resolve, 600));
					this.streamingIndicatorManager.updateStreamingIndicator('正在基于工具结果继续分析...');
					await new Promise(resolve => setTimeout(resolve, 400));
				} else {
					Logger.debug(`Phase '${this.currentPhase}' detected, continuing`);
					if (this.currentPhase === 'thought') {
						this.streamingIndicatorManager.showStreamingIndicator('正在等待思考结果...');
					} else if (this.currentPhase === 'plan') {
						this.streamingIndicatorManager.showStreamingIndicator('正在生成执行计划...');
					} else {
						this.streamingIndicatorManager.showStreamingIndicator('继续分析...');
					}
				}

			} catch (error) {
				Logger.error('Error in streaming:', error);
				this.streamingIndicatorManager.hideStreamingIndicator();
				this.streamingIndicatorManager.displayPhase(
					this.i18n.t('planExecute.contentGeneration.error'), 
					`${this.i18n.t('errors.executionError')}: ${error instanceof Error ? error.message : this.i18n.t('errors.unknownError')}`, 
					SvgIcons.alertCircle()
				);
				isCompleted = true;
			}
		}

		// Update conversation messages
		updateConversationMessages(currentMessages);
		this.streamingIndicatorManager.hideStreamingIndicator();

		if (iterationCount >= maxIterations) {
			Logger.warn('Reached maximum iterations, stopping');
			this.streamingIndicatorManager.displayPhase(
				this.i18n.t('common.unknown'), 
				this.i18n.t('planExecute.maxIterationsReached'), 
				'⚠️'
			);
		}
	}

	/**
	 * Process incoming streaming chunks and detect XML tags
	 */
	private processStreamingChunk(processPhaseCallback: (phase: 'question' | 'plan' | 'thought' | 'action' | 'observation' | 'final_answer', content: string) => Promise<void>): void {
		// First check for streaming final_answer content
		this.processStreamingFinalAnswer();

		// Check for complete XML tags in buffer
		const tagPatterns = [
			{ tag: 'question', pattern: /<question>([\s\S]*?)<\/question>/ },
			{ tag: 'plan', pattern: /<plan>([\s\S]*?)<\/plan>/ },
			{ tag: 'thought', pattern: /<thought>([\s\S]*?)<\/thought>/ },
			{ tag: 'action', pattern: /<action(?:\s+[^>]*)?>(\s*[\s\S]*?)<\/action>/, requiresCompleteContent: true },
			{ tag: 'observation', pattern: /<observation>([\s\S]*?)<\/observation>/ },
			{ tag: 'final_answer', pattern: /<final_answer>([\s\S]*?)<\/final_answer>/ }
		];

		for (const { tag, pattern, requiresCompleteContent } of tagPatterns) {
			const match = this.buffer.match(pattern);
			if (match) {
				const content = match[1].trim();

				// Handle observation tags
				if (tag === 'observation') {
					Logger.debug('Processing observation:', content.substring(0, 200) + '...');
					processPhaseCallback(tag as any, content);
					this.currentPhase = tag as any;
					this.buffer = this.buffer.replace(pattern, '');
					break;
				}

				// Skip final_answer if already being processed as streaming
				if (tag === 'final_answer' && this.currentFinalAnswerMessage) {
					Logger.debug('Skipping complete final_answer as streaming is active');
					this.buffer = this.buffer.replace(pattern, '');
					continue;
				}

				// Special handling for action tags
				if (requiresCompleteContent && tag === 'action') {
					if (!this.isActionContentComplete(content)) {
						Logger.debug(`Action content incomplete, waiting for more data...`);
						continue;
					}
				}

				Logger.debug(`Detected complete ${tag}:`, content.substring(0, 100) + '...');

				// Process the detected phase
				processPhaseCallback(tag as any, content);
				this.currentPhase = tag as any;
				this.buffer = this.buffer.replace(pattern, '');
				break;
			}
		}
	}

	/**
	 * Process streaming final_answer content
	 */
	private processStreamingFinalAnswer(): void {
		const result = AnswerGeneratorUtils.processStreamingFinalAnswer(
			this.buffer,
			this.currentFinalAnswerMessage,
			this.i18n,
			this.streamingIndicatorManager,
			this.onFinalAnswerCallback,
			() => {
				this.initializeFinalAnswerMessage();
				return this.currentFinalAnswerMessage!;
			}
		);

		if (result.shouldInitialize) {
			this.streamingIndicatorManager.hideStreamingIndicator();
			this.initializeFinalAnswerMessage();
		}

		if (result.shouldUpdate) {
			const currentContent = this.extractCurrentFinalAnswerContent();
			if (currentContent !== null) {
				this.updateFinalAnswerContent(currentContent);
			}
		}

		if (result.shouldFinalize && result.finalContent) {
			this.finalizeFinalAnswerMessage(result.finalContent);
			if (result.newBuffer !== undefined) {
				this.buffer = result.newBuffer;
			}
		}
	}

	/**
	 * Initialize streaming final answer message
	 */
	private initializeFinalAnswerMessage(): void {
		this.currentFinalAnswerMessage = AnswerGeneratorUtils.initializeFinalAnswerMessage(
			this.planTasks,
			this.i18n,
			this.streamingIndicatorManager
		);

		if (this.onFinalAnswerCallback && this.currentFinalAnswerMessage) {
			this.onFinalAnswerCallback(this.currentFinalAnswerMessage);
		}
	}

	/**
	 * Extract current final answer content from buffer
	 */
	private extractCurrentFinalAnswerContent(): string | null {
		return AnswerGeneratorUtils.extractCurrentFinalAnswerContent(this.buffer);
	}

	/**
	 * Update final answer content during streaming
	 */
	private updateFinalAnswerContent(newContent: string): void {
		AnswerGeneratorUtils.updateFinalAnswerContent(
			this.currentFinalAnswerMessage,
			newContent,
			this.i18n,
			this.streamingIndicatorManager,
			this.onFinalAnswerCallback
		);
	}

	/**
	 * Finalize final answer message
	 */
	finalizeFinalAnswerMessage(finalContent: string): { updatedConversationMessages: ChatMessage[], currentPhase: 'final_answer' } {
		const result = AnswerGeneratorUtils.finalizeFinalAnswerMessage(
			this.currentFinalAnswerMessage,
			finalContent,
			[], // Will be updated by caller
			this.streamingIndicatorManager,
			this.onFinalAnswerCallback
		);
		
		// Reset streaming state
		this.currentFinalAnswerMessage = null;
		this.finalAnswerElement = null;
		
		return result;
	}

	/**
	 * Check if action content contains complete MCP tool call
	 */
	private isActionContentComplete(actionContent: string): boolean {
		return ActionValidatorUtils.isActionContentComplete(
			actionContent,
			this.incompleteActionChecks,
			(message) => this.streamingIndicatorManager.showStreamingIndicator(message),
			(message) => this.streamingIndicatorManager.updateStreamingIndicator(message),
			() => this.streamingIndicatorManager.hideStreamingIndicator()
		);
	}
}
