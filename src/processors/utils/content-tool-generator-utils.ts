import { Logger } from '../../utils/logger';
import { StructuredPromptManager } from '../../core/structured-prompt-manager';

/**
 * Content tool generator utility functions
 */
export class ContentToolGeneratorUtils {
	/**
	 * Generate content for a tool using AI
	 */
	static async generateContentForTool(
		step: any,
		originalInput: unknown,
		executionResults: unknown[],
		conversationMessages: unknown[],
		getProvider: () => any,
		buildContentGenerationPrompt: (step: unknown, filePath: string, contentType: string, toolName: string) => Promise<string>,
		createContentGenerationIndicator: () => HTMLElement,
		updateContentGenerationIndicator: (indicator: HTMLElement, phase: string, message: string, content?: string) => void,
		extractWebContentFromResults: () => string | null,
		formatExecutionResultsForPrompt: () => string,
		cleanGeneratedContent: (content: string) => string,
		isTokenLimitError: (error: unknown) => boolean,
		i18n: any,
		abortSignal?: AbortSignal,
		isAborted?: boolean
	): Promise<unknown> {
		Logger.debug('Generating content for tool:', { tool: step.tool, step_id: step.step_id });

		// Parse the input
		let parsedInput: any;
		if (typeof originalInput === 'string') {
			try {
				parsedInput = JSON.parse(originalInput);
			} catch {
				parsedInput = { content: originalInput };
			}
		} else {
			parsedInput = originalInput;
		}

		// Extract file path and content template
		const filePath = parsedInput.path || parsedInput.file_path || parsedInput.filename || '';
		const contentTemplate = parsedInput.content || parsedInput.text || parsedInput.data || '';

		// If no content template or content is already generated, return as-is
		if (!contentTemplate || contentTemplate.length > 50) {
			Logger.debug('Content already provided or empty, skipping generation');
			return originalInput;
		}

		Logger.debug('Generating content with LLM:', { filePath, contentTemplate: contentTemplate.substring(0, 100) });

		// Create visual indicator for content generation
		const indicator = createContentGenerationIndicator();

		try {
			// PHASE 1: Prepare
			updateContentGenerationIndicator(indicator, 'preparing', i18n.t('planExecute.contentGeneration.preparing'));

			// Build the prompt for content generation
			const contentPrompt = await buildContentGenerationPrompt(step, filePath, contentTemplate, step.tool);
			Logger.debug('Content generation prompt built, length:', contentPrompt.length);

			// PHASE 2: Connecting
			updateContentGenerationIndicator(indicator, 'connecting', i18n.t('planExecute.contentGeneration.connecting'));

			const provider = getProvider();
			if (!provider) {
				throw new Error('No provider available for content generation');
			}

			// PHASE 3: Connected
			updateContentGenerationIndicator(indicator, 'connected', i18n.t('planExecute.contentGeneration.connected'));

			// PHASE 4: Generating content
			updateContentGenerationIndicator(indicator, 'generating', i18n.t('planExecute.contentGeneration.generating'));

			// Generate content using the provider directly
			const conversationMsgs = [
				{ role: 'user', content: contentPrompt }
			];

			const response = await provider.sendMessage(conversationMsgs, {
				temperature: 0.7,
				maxTokens: 4000,
				signal: abortSignal
			});

			// Check for abort
			if (isAborted || abortSignal?.aborted) {
				throw new Error('ABORTED');
			}

			let generatedContent = response;

			// PHASE 5: Processing
			updateContentGenerationIndicator(indicator, 'processing', i18n.t('planExecute.contentGeneration.processing'));

			// Clean the generated content
			generatedContent = cleanGeneratedContent(generatedContent);

			Logger.debug('Generated content length:', generatedContent.length);

			// Update the input with generated content
			const updatedInput = {
				...parsedInput,
				content: generatedContent
			};

			// PHASE 6: Completed
			const previewContent = generatedContent.substring(0, 200) + (generatedContent.length > 200 ? '...' : '');
			updateContentGenerationIndicator(indicator, 'completed', i18n.t('planExecute.contentGeneration.completed'), previewContent);

			return updatedInput;

		} catch (error) {
			Logger.error('Error generating content:', error);
			
			// Check if aborted
			if (error instanceof Error && error.message === 'ABORTED') {
				throw error;
			}

			// Handle token limit errors
			if (isTokenLimitError(error)) {
				updateContentGenerationIndicator(indicator, 'error', i18n.t('errors.tokenLimitError'));
				throw error;
			}

			// Handle other errors
			const errorMessage = error instanceof Error ? error.message : String(error);
			updateContentGenerationIndicator(indicator, 'error', `${i18n.t('errors.contentGenerationFailed')}: ${errorMessage}`);
			throw error;
		}
	}
}
