import { ChatMessage } from '../../types';
import { I18nManager } from '../../i18n/i18n-manager';

/**
 * Answer generation utility functions
 */
export class AnswerGeneratorUtils {
	/**
	 * Process streaming final answer content
	 */
	static processStreamingFinalAnswer(
		buffer: string,
		finalAnswerElement: HTMLElement | null,
		messageContainer: HTMLElement,
		i18n: I18nManager
	): { element: HTMLElement; hasContent: boolean } {
		if (!finalAnswerElement) {
			// Create final answer container
			finalAnswerElement = messageContainer.createDiv({ cls: 'llmsider-plan-execute-phase' });
			
			const timestamp = new Date().toLocaleTimeString();
			const headerEl = finalAnswerElement.createDiv({ cls: 'plan-execute-header' });
			headerEl.innerHTML = `
				<span class="plan-execute-icon">✅</span>
				<span class="plan-execute-title">${i18n.t('planExecute.finalAnswer')}</span>
				<span class="plan-execute-timestamp">${timestamp}</span>
			`;

			finalAnswerElement.createDiv({ cls: 'plan-execute-content final-answer-content' });
		}

		const contentEl = finalAnswerElement.querySelector('.final-answer-content') as HTMLElement;
		if (contentEl && buffer) {
			contentEl.innerHTML = buffer.replace(/\n/g, '<br>');
		}

		return { element: finalAnswerElement, hasContent: buffer.length > 0 };
	}

	/**
	 * Create final answer indicator
	 */
	static createFinalAnswerIndicator(
		messageContainer: HTMLElement,
		i18n: I18nManager,
		scrollToBottom: () => void
	): HTMLElement {
		const indicator = messageContainer.createDiv({ cls: 'llmsider-plan-execute-phase' });
		
		const timestamp = new Date().toLocaleTimeString();
		const headerEl = indicator.createDiv({ cls: 'plan-execute-header' });
		headerEl.innerHTML = `
			<span class="plan-execute-icon">🤔</span>
			<span class="plan-execute-title">${i18n.t('planExecute.generatingAnswer')}</span>
			<span class="plan-execute-timestamp">${timestamp}</span>
		`;

		indicator.createDiv({ cls: 'plan-execute-content final-answer-content' });

		scrollToBottom();
		return indicator;
	}

	/**
	 * Update final answer indicator
	 */
	static updateFinalAnswerIndicator(
		indicator: HTMLElement,
		status: 'preparing' | 'executing' | 'completed' | 'failed',
		message: string | undefined,
		i18n: I18nManager,
		scrollToBottom: () => void
	): void {
		const contentEl = indicator.querySelector('.final-answer-content') as HTMLElement;
		if (contentEl && message) {
			contentEl.innerHTML = message.replace(/\n/g, '<br>');
		}

		// Update icon based on status
		const iconEl = indicator.querySelector('.plan-execute-icon') as HTMLElement;
		if (iconEl) {
			if (status === 'completed') {
				iconEl.textContent = '✅';
			} else if (status === 'failed') {
				iconEl.textContent = '❌';
			} else if (status === 'executing') {
				iconEl.textContent = '⏳';
			}
		}

		const titleEl = indicator.querySelector('.plan-execute-title') as HTMLElement;
		if (titleEl) {
			if (status === 'completed') {
				titleEl.textContent = i18n.t('planExecute.answerGeneration.answerGenerated');
			} else if (status === 'executing') {
				titleEl.textContent = i18n.t('planExecute.generatingAnswer');
			}
		}

		scrollToBottom();
	}

	/**
	 * Initialize final answer message
	 */
	static initializeFinalAnswerMessage(
		finalAnswerElement: HTMLElement
	): ChatMessage {
		return {
			id: `final-answer-${Date.now()}`,
			role: 'assistant',
			content: '',
			timestamp: Date.now(),
			metadata: {
				isStreaming: true
			}
		};
	}

	/**
	 * Extract current final answer content from buffer
	 */
	static extractCurrentFinalAnswerContent(buffer: string): string {
		// Extract content between <final_answer> tags if present
		const match = buffer.match(/<final_answer>([\s\S]*?)(?:<\/final_answer>|$)/);
		return match ? match[1].trim() : buffer;
	}

	/**
	 * Update final answer content in the message
	 */
	static updateFinalAnswerContent(
		currentMessage: ChatMessage,
		content: string,
		finalAnswerElement: HTMLElement
	): void {
		currentMessage.content = content;
		
		// Update UI
		const contentEl = finalAnswerElement.querySelector('.final-answer-content') as HTMLElement;
		if (contentEl) {
			contentEl.innerHTML = content.replace(/\n/g, '<br>');
		}
	}

	/**
	 * Finalize final answer message
	 */
	static finalizeFinalAnswerMessage(
		currentMessage: ChatMessage
	): ChatMessage {
		const finalMessage = { ...currentMessage };
		delete finalMessage.metadata?.isStreaming;
		return finalMessage;
	}
}
