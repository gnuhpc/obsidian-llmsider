/**
 * Answer generation utilities for Plan-Execute final answer
 * Handles final answer generation, streaming, and UI updates
 */

import { ChatMessage } from '../../types';
import { Logger } from '../../utils/logger';
import { SvgIcons } from '../../utils/svg-icons';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { Task } from '../plan-execute-tracker';

export class AnswerGeneratorUtils {
	/**
	 * Create final answer indicator UI element
	 */
	static createFinalAnswerIndicator(
		messageContainer: HTMLElement,
		i18n: I18nManager,
		scrollToBottom: () => void
	): HTMLElement {
		const indicatorElement = messageContainer.createDiv({
			cls: 'llmsider-plan-execute-phase llmsider-final-answer-phase'
		});

		// Create header
		const headerEl = indicatorElement.createDiv({ cls: 'plan-execute-header' });
		headerEl.innerHTML = `
			<span class="plan-execute-icon">${SvgIcons.edit()}</span>
			<span class="plan-execute-title">${i18n.t('planExecute.generatingAnswer')}</span>
		`;

		// Create content area
		const contentEl = indicatorElement.createDiv({ cls: 'plan-execute-content' });
		contentEl.innerHTML = `
			<div class="final-answer-status">${i18n.t('planExecute.generatingAnswer')}</div>
		`;

		scrollToBottom();
		return indicatorElement;
	}

	/**
	 * Update final answer indicator status
	 */
	static updateFinalAnswerIndicator(
		indicatorElement: HTMLElement,
		status: 'preparing' | 'executing' | 'completed' | 'failed',
		message: string | undefined,
		i18n: I18nManager,
		scrollToBottom: () => void
	): void {
		const statusEl = indicatorElement.querySelector('.final-answer-status') as HTMLElement;
		const iconEl = indicatorElement.querySelector('.plan-execute-icon') as HTMLElement;

		if (!statusEl || !iconEl) return;

		let iconSvg = SvgIcons.edit();
		let statusText = message || '';
		let statusClass = '';

		switch (status) {
			case 'preparing':
				iconSvg = SvgIcons.settings();
				statusText = message || i18n.t('planExecute.generatingAnswer');
				statusClass = 'status-preparing';
				break;
			case 'executing':
				iconSvg = SvgIcons.zap();
				statusText = message || i18n.t('planExecute.generatingAnswer');
				statusClass = 'status-executing';
				break;
			case 'completed':
				iconSvg = SvgIcons.checkedBox();
				statusText = message || i18n.t('planExecute.answerGeneration.answerGenerated');
				statusClass = 'status-completed';
				break;
			case 'failed':
				iconSvg = SvgIcons.cross();
				statusText = message || i18n.t('errors.finalAnswerFailed');
				statusClass = 'status-failed';
				break;
		}

		iconEl.innerHTML = iconSvg;
		statusEl.textContent = statusText;

		// Update CSS classes
		indicatorElement.className = `llmsider-plan-execute-phase llmsider-final-answer-phase ${statusClass}`;

		// Don't auto-scroll during final answer generation to avoid interrupting user reading
		if (status !== 'executing') {
			scrollToBottom();
		}
	}

	/**
	 * Initialize streaming final answer message
	 */
	static initializeFinalAnswerMessage(
		planTasks: Task[],
		i18n: I18nManager,
		streamingIndicatorManager: any
	): ChatMessage {
		// Show final answer generation indicator
		streamingIndicatorManager.hideStreamingIndicator();
		streamingIndicatorManager.showStreamingIndicator(i18n.t('planExecute.generatingAnswer'));

		const message: ChatMessage = {
			id: Date.now().toString(),
			role: 'assistant',
			content: '',
			timestamp: Date.now(),
			metadata: {
				phase: 'final_answer',
				isPlanExecuteMode: true, // Add flag for reload detection
				isStreaming: true,
				// Save plan tasks for reload reconstruction
				// Store as any to avoid type conflicts
				planTasks: JSON.parse(JSON.stringify(planTasks)) as any
			}
		};

		return message;
	}

	/**
	 * Extract current final answer content from buffer
	 */
	static extractCurrentFinalAnswerContent(buffer: string): string | null {
		const match = buffer.match(/<final_answer>([\s\S]*?)(?:<\/final_answer>|$)/);
		if (match) {
			return match[1];
		}
		return null;
	}

	/**
	 * Update final answer content during streaming
	 */
	static updateFinalAnswerContent(
		currentMessage: ChatMessage | null,
		newContent: string,
		i18n: I18nManager,
		streamingIndicatorManager: any,
		onCallback: ((message: ChatMessage) => void) | null
	): void {
		if (!currentMessage) return;

		// Only update if content has actually changed
		if (currentMessage.content !== newContent) {
			currentMessage.content = newContent;
			if (currentMessage.metadata) {
				currentMessage.metadata.isStreaming = true;
			}

			// Update streaming indicator to show progress
			if (newContent.length > 50) {
				streamingIndicatorManager.updateStreamingIndicator(
					i18n.t('planExecute.generatingAnswerProgress', { characters: newContent.length.toString() })
				);
			} else {
				streamingIndicatorManager.updateStreamingIndicator(i18n.t('planExecute.generatingAnswer'));
			}

			// Notify callback about content update
			if (onCallback) {
				onCallback({ ...currentMessage });
			}
		}
	}

	/**
	 * Finalize final answer message
	 */
	static finalizeFinalAnswerMessage(
		currentMessage: ChatMessage | null,
		finalContent: string,
		conversationMessages: ChatMessage[],
		streamingIndicatorManager: any,
		onCallback: ((message: ChatMessage) => void) | null
	): {
		updatedConversationMessages: ChatMessage[];
		currentPhase: 'final_answer';
	} {
		if (!currentMessage) {
			return {
				updatedConversationMessages: conversationMessages,
				currentPhase: 'final_answer'
			};
		}

		// Hide the streaming indicator when final answer is complete
		streamingIndicatorManager.hideStreamingIndicator();

		currentMessage.content = finalContent;
		if (currentMessage.metadata) {
			currentMessage.metadata.isStreaming = false;
		}

		// Add to conversation messages for context
		const updatedMessages = [...conversationMessages, { ...currentMessage }];

		// Final callback notification
		if (onCallback) {
			onCallback({ ...currentMessage });
		}

		Logger.debug('Final answer message finalized:', currentMessage.content.substring(0, 100) + '...');

		return {
			updatedConversationMessages: updatedMessages,
			currentPhase: 'final_answer'
		};
	}

	/**
	 * Process streaming final_answer content
	 */
	static processStreamingFinalAnswer(
		buffer: string,
		currentMessage: ChatMessage | null,
		i18n: I18nManager,
		streamingIndicatorManager: any,
		onCallback: ((message: ChatMessage) => void) | null,
		initializeMessage: () => ChatMessage
	): {
		shouldInitialize: boolean;
		shouldUpdate: boolean;
		shouldFinalize: boolean;
		finalContent?: string;
		newBuffer?: string;
	} {
		// Check if final_answer tag is starting (but not yet complete)
		const startMatch = buffer.match(/<final_answer>([\s\S]*?)(?=<\/final_answer>|$)/);
		if (startMatch && !currentMessage) {
			// Starting new final answer
			Logger.debug('Starting streaming final answer');
			return {
				shouldInitialize: true,
				shouldUpdate: startMatch[1].trim() ? true : false,
				shouldFinalize: false
			};
		}

		// Check if we're in the middle of final_answer and have new content
		if (currentMessage) {
			const currentContent = AnswerGeneratorUtils.extractCurrentFinalAnswerContent(buffer);
			if (currentContent !== null && currentContent !== currentMessage.content) {
				return {
					shouldInitialize: false,
					shouldUpdate: true,
					shouldFinalize: false
				};
			}
		}

		// Check if final_answer is complete
		const completeMatch = buffer.match(/<final_answer>([\s\S]*?)<\/final_answer>/);
		if (completeMatch && currentMessage) {
			Logger.debug('Finalizing streaming final answer');
			return {
				shouldInitialize: false,
				shouldUpdate: false,
				shouldFinalize: true,
				finalContent: completeMatch[1].trim(),
				newBuffer: buffer.replace(completeMatch[0], '')
			};
		}

		return {
			shouldInitialize: false,
			shouldUpdate: false,
			shouldFinalize: false
		};
	}
}
