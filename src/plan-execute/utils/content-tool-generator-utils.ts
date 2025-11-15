import { Logger } from '../../utils/logger';
import { TokenManager } from '../../utils/token-manager';

/**
 * Content Tool Generator Utilities
 * 
 * Handles AI-powered content generation for create/append/insert/str_replace tools
 * with comprehensive progress tracking, token logging, and error handling.
 */
export class ContentToolGeneratorUtils {
	/**
	 * Generate content for create/append/insert tools using AI with 7-phase process
	 * 
	 * @param step - Current step information
	 * @param originalInput - Original tool input parameters
	 * @param executionResults - Previous step execution results
	 * @param conversationMessages - Conversation history
	 * @param getProvider - Function to get AI provider
	 * @param buildContentPrompt - Function to build content generation prompt
	 * @param createIndicator - Function to create progress indicator
	 * @param updateIndicator - Function to update progress indicator
	 * @param extractWebContent - Function to extract web content from results
	 * @param formatResults - Function to format execution results
	 * @param cleanContent - Function to clean generated content
	 * @param isTokenError - Function to check if error is token-related
	 * @param i18n - I18n manager for translations
	 * @param abortSignal - Abort signal for cancellation
	 * @returns Updated input with generated content
	 */
	static async generateContentForTool(
		step: any,
		originalInput: any,
		executionResults: any[],
		conversationMessages: any[],
		getProvider: () => any,
		buildContentPrompt: (step: any, filePath: string, contentTemplate: string, toolName: string) => Promise<string>,
		createIndicator: () => HTMLElement,
		updateIndicator: (indicator: HTMLElement, phase: string, message: string, content?: string) => void,
		extractWebContent: () => string | null,
		formatResults: () => string,
		cleanContent: (content: string) => string,
		isTokenError: (error: any) => boolean,
		i18n: any,
		abortSignal?: AbortSignal,
		isAborted?: boolean
	): Promise<any> {
		const toolName = step.tool;
		Logger.debug(`Generating content for ${toolName} tool...`);
		
		const contentGenerationIndicator = createIndicator();
		
		try {
			// Phase 1: Extract and validate input parameters
			updateIndicator(contentGenerationIndicator, 'parsing', i18n.t('planExecute.contentGeneration.parseParameters'));
			await new Promise(resolve => setTimeout(resolve, 300));
			
			let filePath = '';
			let contentTemplate = '';
			
			if (typeof originalInput === 'object' && originalInput) {
				filePath = originalInput.path || originalInput.file_path || '';
				contentTemplate = originalInput.file_text || originalInput.content || originalInput.new_str || '';
			}
			
			if (!filePath) {
				updateIndicator(contentGenerationIndicator, 'error', i18n.t('planExecute.contentGeneration.pathMissing'));
				throw new Error(i18n.t('planExecute.contentGeneration.pathMissing'));
			}
			
			updateIndicator(contentGenerationIndicator, 'analyzing', i18n.t('planExecute.contentGeneration.analyzeTemplate', { filePath }));
			await new Promise(resolve => setTimeout(resolve, 500));
			
			// Phase 2: Analyze execution results
			updateIndicator(contentGenerationIndicator, 'analyzing', i18n.t('planExecute.contentGeneration.analyzeResults'));
			await new Promise(resolve => setTimeout(resolve, 300));
			
			const webContent = extractWebContent();
			const executionSummary = formatResults();
			
			updateIndicator(contentGenerationIndicator, 'analyzing',
				i18n.t('planExecute.contentGeneration.foundResults', {
					count: executionResults.length.toString(),
					hasWebContent: webContent ? i18n.t('planExecute.contentGeneration.hasWebContent') : i18n.t('planExecute.contentGeneration.noWebContent')
				}));
			await new Promise(resolve => setTimeout(resolve, 400));
			
			// Phase 3: Build generation prompt
			updateIndicator(contentGenerationIndicator, 'preparing', i18n.t('planExecute.contentGeneration.buildPrompt'));
			await new Promise(resolve => setTimeout(resolve, 300));

			const contentGenerationPrompt = await buildContentPrompt(step, filePath, contentTemplate, toolName);
			
			updateIndicator(contentGenerationIndicator, 'preparing', 
				i18n.t('planExecute.contentGeneration.promptCompleted', { length: contentGenerationPrompt.length }));
			await new Promise(resolve => setTimeout(resolve, 400));
			
			// Phase 4: Get AI provider
			updateIndicator(contentGenerationIndicator, 'connecting', i18n.t('planExecute.contentGeneration.connectAI'));
			await new Promise(resolve => setTimeout(resolve, 300));
			
			const provider = getProvider();
			if (!provider) {
				updateIndicator(contentGenerationIndicator, 'error', i18n.t('planExecute.contentGeneration.aiUnavailable'));
				Logger.warn('No AI provider available for content generation');
				return originalInput;
			}
			
			updateIndicator(contentGenerationIndicator, 'connected', i18n.t('planExecute.contentGeneration.aiConnected'));
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Phase 5: Generate content with streaming
			updateIndicator(contentGenerationIndicator, 'generating', i18n.t('planExecute.contentGeneration.generatingContent'), '');
			
			// Prepare messages
			const systemMessage = conversationMessages.find(msg => msg.role === 'system');
			const messages = systemMessage
				? [
						systemMessage,
						{
							id: Date.now().toString(),
							role: 'user' as const,
							content: contentGenerationPrompt,
							timestamp: Date.now()
						}
				  ]
				: [
						{
							id: Date.now().toString(),
							role: 'user' as const,
							content: contentGenerationPrompt,
							timestamp: Date.now()
						}
				  ];
			
			// Log LLM request
			await ContentToolGeneratorUtils.logLLMRequest(step, toolName, filePath, contentTemplate, provider, messages);
			
			// Stream content generation
			const generatedContent = await ContentToolGeneratorUtils.streamContentGeneration(
				provider,
				messages,
				contentGenerationIndicator,
				updateIndicator,
				isTokenError,
				i18n,
				abortSignal,
				isAborted
			);
			
			// Phase 6: Clean content
			updateIndicator(contentGenerationIndicator, 'processing', i18n.t('errors.cleaningContent'), generatedContent);
			await new Promise(resolve => setTimeout(resolve, 400));
			
			const cleanedContent = cleanContent(generatedContent);
			
			updateIndicator(contentGenerationIndicator, 'processing', 
				i18n.t('planExecute.contentGeneration.contentProcessed', { length: cleanedContent.length }), cleanedContent);
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Phase 7: Complete
			updateIndicator(contentGenerationIndicator, 'completed', 
				i18n.t('planExecute.contentGeneration.finalLength', { length: cleanedContent.length }), cleanedContent);
			await new Promise(resolve => setTimeout(resolve, 500));
			
			// Return updated input
			const contentField = ContentToolGeneratorUtils.getContentFieldName(toolName);
			const updatedInput = {
				...originalInput,
				[contentField]: cleanedContent
			};

			Logger.debug(`Generated content for ${toolName} length:`, cleanedContent.length);
			Logger.debug(`Content preview:`, cleanedContent.substring(0, 200) + '...');
			
			setTimeout(() => {
				if (contentGenerationIndicator && contentGenerationIndicator.parentElement) {
					contentGenerationIndicator.remove();
				}
			}, 2000);
			
			return updatedInput;
			
		} catch (error) {
			Logger.error('Error generating content for create tool:', error);

			if (isTokenError(error)) {
				updateIndicator(
					contentGenerationIndicator,
					'error',
					i18n.t('errors.tokenLimitExceededDetail')
				);
			} else {
				updateIndicator(contentGenerationIndicator, 'error',
					`${i18n.t('errors.generationFailed')}: ${error instanceof Error ? error.message : i18n.t('errors.unknownError')}`);
			}

			setTimeout(() => {
				if (contentGenerationIndicator && contentGenerationIndicator.parentElement) {
					contentGenerationIndicator.remove();
				}
			}, 5000);

			if (isTokenError(error)) {
				throw error;
			} else {
				return originalInput;
			}
		}
	}

	/**
	 * Stream content generation with progress updates
	 */
	private static async streamContentGeneration(
		provider: any,
		messages: any[],
		indicator: HTMLElement,
		updateIndicator: (indicator: HTMLElement, phase: string, message: string, content?: string) => void,
		isTokenError: (error: any) => boolean,
		i18n: any,
		abortSignal?: AbortSignal,
		isAborted?: boolean
	): Promise<string> {
		let generatedContent = '';
		let contentLength = 0;
		let lastUpdateLength = 0;
		let hasTokenWarning = false;
		
		try {
			await provider.sendStreamingMessage(
				messages, 
				(chunk: any) => {
					if (abortSignal?.aborted || isAborted) {
						return;
					}

					if (chunk.metadata?.warning === 'TOKEN_LIMIT_EXCEEDED') {
						hasTokenWarning = true;
						updateIndicator(
							indicator,
							'generating',
							i18n.t('errors.contextExceededWarning')
						);
					}

					if (chunk.delta) {
						generatedContent += chunk.delta;
						const newLength = generatedContent.length;

						const shouldUpdate = newLength - lastUpdateLength >= 50;
						if (shouldUpdate) {
							lastUpdateLength = newLength;
							const statusMessage = hasTokenWarning 
								? `${i18n.t('planExecute.contentGeneration.generating')}... (${newLength} ${i18n.t('common.characters')}) - ${i18n.t('errors.contextExceededWarning')}`
								: `${i18n.t('planExecute.contentGeneration.generating')}... (${newLength} ${i18n.t('common.characters')})`;
							
							updateIndicator(
								indicator,
								'generating',
								statusMessage,
								generatedContent
							);
						}

						if (newLength - contentLength >= 100) {
							contentLength = newLength;
						}
					}
				},
				abortSignal,
				undefined,
				undefined
			);
			
			const finalStatusMessage = hasTokenWarning
				? i18n.t('planExecute.contentGeneration.finalLength', { length: generatedContent.length.toString() }) + ' - ' + i18n.t('errors.contextExceededWarning')
				: i18n.t('planExecute.contentGeneration.finalLength', { length: generatedContent.length.toString() });
			
			updateIndicator(
				indicator,
				'generating',
				finalStatusMessage,
				generatedContent
			);
			
			if (!generatedContent || generatedContent.trim() === '') {
				const errorMsg = hasTokenWarning 
					? i18n.t('errors.contentGenerationFailedDueToTokenLimit')
					: i18n.t('errors.contentGenerationFailedEmpty');
				
				updateIndicator(
					indicator,
					'error',
					errorMsg
				);
				
				throw new Error(errorMsg);
			}

			return generatedContent;

		} catch (streamError: unknown) {
			if (isTokenError(streamError)) {
				Logger.error('Token limit exceeded during content generation:', streamError);
				const errorMessage = streamError instanceof Error ? streamError.message : i18n.t('errors.tokenExceeded');
				updateIndicator(
					indicator,
					'error',
					i18n.t('errors.tokenLimitExceededError', { error: errorMessage })
				);

				const tokenLimitError = new Error(`Token limit exceeded: ${errorMessage || 'Context window too large'}`);
				tokenLimitError.name = 'TokenLimitError';
				throw tokenLimitError;
			} else {
				updateIndicator(indicator, 'error', i18n.t('planExecute.contentGeneration.generationFailed'));
				throw streamError;
			}
		}
	}

	/**
	 * Log LLM request for debugging
	 */
	private static async logLLMRequest(
		step: any,
		toolName: string,
		filePath: string,
		contentTemplate: string,
		provider: any,
		messages: any[]
	): Promise<void> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const logFileName = `llm-request-${step.step_id}-${timestamp}.json`;
		
		const requestLog = {
			timestamp: new Date().toISOString(),
			requestType: 'content-generation',
			stepInfo: {
				stepId: step.step_id,
				stepDescription: step.description || null,
				stepReason: step.reason || null,
				toolName: toolName,
				filePath: filePath,
				contentTemplateLength: contentTemplate?.length || 0
			},
			provider: {
				name: provider.getProviderName(),
				model: (provider as any).model || 'unknown'
			},
			messages: messages.map(msg => ({
				role: msg.role,
				content: msg.content,
				timestamp: msg.timestamp
			})),
			tokenEstimation: {
				estimatedInputTokens: TokenManager.estimateTokensForMessages(messages),
				warningLevel: TokenManager.getTokenWarningLevel(TokenManager.estimateTokensForMessages(messages)),
				formattedUsage: TokenManager.formatTokenUsage(TokenManager.estimateTokensForMessages(messages))
			}
		};
		
		Logger.debug('\n' + '═'.repeat(100));
		Logger.debug('🔍 [PlanExecuteProcessor] LLM REQUEST - Content Generation Before Create Step');
		Logger.debug('═'.repeat(100));
		Logger.debug('\n📋 Request logged to file:', logFileName);
		Logger.debug('\n📄 [COMPLETE REQUEST DATA]');
		Logger.debug(JSON.stringify(requestLog, null, 2));
		Logger.debug('\n' + '═'.repeat(100));
		Logger.debug('✅ [PlanExecuteProcessor] LLM Request Log Complete');
		Logger.debug('═'.repeat(100) + '\n');
		
		try {
			const fs = require('fs');
			const path = require('path');
			const { ConversationLogger } = await import('../../utils/conversation-logger');
			
			const logsDir = ConversationLogger.getInstance().getLogDirectory();
			if (!fs.existsSync(logsDir)) {
				fs.mkdirSync(logsDir, { recursive: true});
			}
			
			const logFilePath = path.join(logsDir, logFileName);
			fs.writeFileSync(logFilePath, JSON.stringify(requestLog, null, 2), 'utf8');
			
			Logger.debug(`✅ [PlanExecuteProcessor] Request saved to: ${logFilePath}`);
		} catch (error) {
			Logger.error('❌ [PlanExecuteProcessor] Failed to save request log to file:', error);
		}
	}

	/**
	 * Get content field name based on tool type
	 */
	private static getContentFieldName(toolName: string): string {
		if (toolName === 'create') {
			return 'file_text';
		} else if (toolName === 'insert' || toolName === 'str_replace' || toolName === 'sed') {
			return 'new_str';
		} else {
			return 'content';
		}
	}
}
