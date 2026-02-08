/**
 * Guided Mode Orchestrator
 * 
 * Coordinates the high-level flow of Guided Mode conversations:
 * - Entry point routing (new conversation vs. response)
 * - Error handling and recovery
 * - Delegation to Mastra-based implementation
 * 
 * Note: The detailed Mastra agent execution remains in ChatView due to tight coupling
 * with UI state and streaming management. This orchestrator provides a clean
 * abstraction for the conversation flow control.
 * 
 * Extracted from chat-view.ts to improve code organization
 */

import { ChatMessage } from '../../types';
import { Logger } from '../../utils/logger';
import { ErrorRenderer } from '../error-renderer';
import type { MessageRenderer } from '../message-renderer';
import type { I18nManager } from '../../i18n/i18n-manager';

/**
 * Callbacks required by GuidedModeOrchestrator for delegation
 */
export interface IGuidedModeOrchestratorCallbacks {
	/**
	 * Get current session messages
	 */
	getCurrentMessages: () => ChatMessage[];
	
	/**
	 * Start guided conversation with Mastra framework
	 */
	startGuidedConversationWithMastra: (userMessage: ChatMessage, messages: ChatMessage[]) => Promise<void>;
	
	/**
	 * Handle guided response with Mastra framework
	 */
	handleGuidedResponseWithMastra: (userMessage: ChatMessage, messages: ChatMessage[]) => Promise<void>;
	
	/**
	 * Add message to UI
	 */
	addMessageToUI: (message: ChatMessage) => HTMLElement;

	/**
	 * Get AI response (for retry)
	 */
	getAIResponse: (userMessage: ChatMessage) => Promise<void>;
}

/**
 * Interface for GuidedModeOrchestrator
 */
export interface IGuidedModeOrchestrator {
	/**
	 * Main entry point for Guided Mode
	 */
	handleGuidedMode(userMessage: ChatMessage, messages: ChatMessage[]): Promise<void>;
	
	/**
	 * Start new guided conversation
	 */
	startGuidedConversation(userMessage: ChatMessage, messages: ChatMessage[]): Promise<void>;
	
	/**
	 * Handle user response to guided question
	 */
	handleGuidedResponse(userMessage: ChatMessage, messages: ChatMessage[]): Promise<void>;
}

/**
 * Guided Mode Orchestrator
 * 
 * Handles high-level conversation flow control for Guided Mode
 */
export class GuidedModeOrchestrator implements IGuidedModeOrchestrator {
	constructor(
		private messageRenderer: MessageRenderer,
		private i18n: I18nManager,
		private callbacks: IGuidedModeOrchestratorCallbacks
	) {}
	
	/**
	 * Main entry point for Guided Mode - routes to appropriate handler
	 */
	async handleGuidedMode(userMessage: ChatMessage, messages: ChatMessage[]): Promise<void> {
		Logger.debug('[GuidedMode] ========== START handleGuidedMode ==========');
		Logger.debug('[GuidedMode] Timestamp:', new Date().toISOString());
		
		try {
			// Check if this is a response to a guided question
			const lastMessage = messages[messages.length - 2]; // -2 because last is current user message
			const isGuidedResponse = lastMessage?.metadata?.isGuidedQuestion;
			
			Logger.debug('[GuidedMode] isGuidedResponse:', isGuidedResponse);
			Logger.debug('[GuidedMode] About to call', isGuidedResponse ? 'handleGuidedResponse' : 'startGuidedConversation');
			
			if (isGuidedResponse) {
				// User is responding to a guided question
				await this.handleGuidedResponse(userMessage, messages);
			} else {
				// Start new guided conversation
				await this.startGuidedConversation(userMessage, messages);
			}
			
			Logger.debug('[GuidedMode] ✅ Guided mode completed successfully');
		} catch (error) {
			Logger.error('[GuidedMode] ❌❌❌ CAUGHT ERROR IN handleGuidedMode ❌❌❌');
			Logger.error('[GuidedMode] Error type:', error instanceof Error ? error.constructor.name : typeof error);
			Logger.error('[GuidedMode] Error message:', error instanceof Error ? error.message : String(error));
			Logger.error('[GuidedMode] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
			Logger.error('[GuidedMode] Error object:', error);
			
			// Find the assistant message element to render error
			const currentMessages = this.callbacks.getCurrentMessages();
			const lastAssistantMsg = currentMessages
				.filter(m => m.role === 'assistant')
				.pop();
			
			let messageEl: HTMLElement | null = null;
			
			if (lastAssistantMsg) {
				messageEl = this.messageRenderer.findMessageElement(lastAssistantMsg.id);
			}
			
			// If no assistant message element found, create a new one for the error
			if (!messageEl) {
				const errorMsg: ChatMessage = {
					id: `error-${Date.now()}`,
					role: 'assistant',
					content: '',
					timestamp: Date.now(),
					metadata: { isGuidedQuestion: true }
				};
				messageEl = this.callbacks.addMessageToUI(errorMsg);
			}

			if (messageEl) {
				// Use unified error renderer
				ErrorRenderer.renderErrorInMessage(
					messageEl,
					error,
					this.i18n,
					async () => {
						// Remove the error message element
						if (messageEl) {
							messageEl.remove();
						}
						
						// Retry by finding the user message that triggered this
						const userMsg = messages[messages.length - 1];
						if (userMsg && userMsg.role === 'user') {
							Logger.debug('[GuidedModeOrchestrator] Retrying guided mode request...');
							await this.callbacks.getAIResponse(userMsg);
						}
					}
				);
			}
		}
	}
	
	/**
	 * Start new guided conversation
	 */
	async startGuidedConversation(userMessage: ChatMessage, messages: ChatMessage[]): Promise<void> {
		Logger.debug('[GuidedMode] Starting new guided conversation');
		Logger.debug('[GuidedMode-Mastra] Using Mastra framework for guided mode');
		await this.callbacks.startGuidedConversationWithMastra(userMessage, messages);
	}
	
	/**
	 * Handle user response to guided question
	 */
	async handleGuidedResponse(userMessage: ChatMessage, messages: ChatMessage[]): Promise<void> {
		Logger.debug('[GuidedMode] ========== START handleGuidedResponse ==========');
		Logger.debug('[GuidedMode] User message:', userMessage.content);
		Logger.debug('[GuidedMode] Message history length:', messages.length);
		
		Logger.debug('[GuidedMode-Mastra] ✓ Using Mastra framework for guided response');
		await this.callbacks.handleGuidedResponseWithMastra(userMessage, messages);
		Logger.debug('[GuidedMode-Mastra] ✓ Mastra framework completed successfully');
	}
}
