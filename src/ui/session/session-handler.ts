import { ChatSession } from '../../types';
import { Logger } from '../../utils/logger';
import type LLMSiderPlugin from '../../main';
import type { SessionManager } from '../../core/session-manager';
import type { ContextManager } from '../../core/context-manager';
import type { MessageManager } from '../message-manager';
import type { UIBuilder } from '../ui-builder';
import type { MastraPlanExecuteProcessor } from '../../core/agent/mastra-plan-execute-processor';
import type { StreamManager } from '../../core/stream-manager';

/**
 * SessionHandler
 * 
 * Handles all session-related operations including:
 * - Session initialization
 * - Session loading and switching
 * - Creating new chats
 * - Clearing current chat
 * - Regenerating responses
 */
export class SessionHandler {
	constructor(
		private plugin: LLMSiderPlugin,
		private sessionManager: SessionManager,
		private contextManager: ContextManager,
		private messageManager: MessageManager,
		private streamManager: StreamManager,
		private uiBuilder: UIBuilder,
		private mastraPlanExecuteProcessor: MastraPlanExecuteProcessor,
		private messageContainer: HTMLElement,
		private getCurrentSession: () => ChatSession | null,
		private setCurrentSession: (session: ChatSession | null) => void,
		private updateContextDisplay: () => void,
		private clearAllSuggestions: () => void,
		private refreshUIState: () => void,
		private getAIResponse: (userMessage: any) => Promise<void>
	) {}

	/**
	 * Initialize session
	 */
	async initializeSession(): Promise<ChatSession> {
		const session = await this.sessionManager.initializeSession();
		this.setCurrentSession(session);
		this.messageManager.renderMessages(session);
		
		// Update session name in header
		this.uiBuilder.updateSessionNameDisplay(session.name);
		
		return session;
	}

	/**
	 * Handle new chat creation
	 */
	async handleNewChat(): Promise<void> {
		Logger.debug('New chat button clicked - starting new session process');

		// Clear FreeDeepseek session if using that provider
		const currentProvider = this.plugin.getActiveProvider();
		if (currentProvider && 'clearSession' in currentProvider && typeof currentProvider.clearSession === 'function') {
			Logger.debug('Clearing provider session (e.g., FreeDeepseek)');
			currentProvider.clearSession();
		}

		// Clear context first
		Logger.debug('Clearing context manager');
		this.contextManager.clearContext();
		await this.contextManager.includeCurrentNote();
		this.updateContextDisplay();

		// Create new session
		Logger.debug('Creating new session via sessionManager');
		const oldSession = this.getCurrentSession();
		const newSession = await this.sessionManager.newChat();
		this.setCurrentSession(newSession);
		Logger.debug('New session created:', {
			oldSessionId: oldSession?.id,
			newSessionId: newSession?.id,
			newSessionMessages: newSession?.messages?.length || 0
		});

		// Update session name in header
		this.uiBuilder.updateSessionNameDisplay(newSession.name);

		// Keep current conversation mode
		Logger.debug('Using current conversation mode:', this.plugin.settings.conversationMode);
		
		// Update mode selector UI to reflect current mode
		window.dispatchEvent(new CustomEvent('llmsider-conversation-mode-changed', { 
			detail: { mode: this.plugin.settings.conversationMode } 
		}));

		// Clear and re-render messages
		Logger.debug('Rendering messages for new session');
		this.messageManager.renderMessages(newSession);

		// Force refresh UI state after new session creation
		Logger.debug('Refreshing UI state');
		this.refreshUIState();

		Logger.debug('New chat process completed with mode:', this.plugin.settings.conversationMode);
	}

	/**
	 * Handle session loaded event
	 */
	handleSessionLoaded(session: ChatSession): void {
		Logger.debug('handleSessionLoaded - session loaded:', session.id);

		// Clear context first when switching sessions
		// This prevents stale context from previous sessions or after plugin reload
		Logger.debug('Clearing context manager for session switch');
		this.contextManager.clearContext();

		// Clear any active suggestions
		this.clearAllSuggestions();

		// Update current session
		this.setCurrentSession(session);

		// Restore conversation mode from session if saved
		if (session.conversationMode && session.conversationMode !== this.plugin.settings.conversationMode) {
			Logger.debug(`Restoring conversation mode from session: ${session.conversationMode} (current: ${this.plugin.settings.conversationMode})`);
			this.plugin.settings.conversationMode = session.conversationMode;
			// Sync legacy agentMode for backward compatibility
			this.plugin.settings.agentMode = (session.conversationMode === 'agent');
			// Update mode selector UI
			window.dispatchEvent(new CustomEvent('llmsider-conversation-mode-changed', { 
				detail: { mode: session.conversationMode } 
			}));
			// Save the restored mode
			this.plugin.saveSettings().catch(error => {
				Logger.error('Failed to save settings after restoring conversation mode:', error);
			});
		}

		// Update session name in header
		this.uiBuilder.updateSessionNameDisplay(session.name);

		// Re-render messages for the loaded session
		this.messageManager.renderMessages(session);

		// Refresh UI state
		this.refreshUIState();

		// Update context display (will show no context after clearing)
		this.updateContextDisplay();

		// Refresh message actions and diff rendering
		setTimeout(() => {
			this.messageManager.scrollToBottom();
			this.messageManager.refreshMessageActions(session);
			this.messageManager.refreshDiffRendering(session);
		}, 100);

		Logger.debug('Session loaded and UI refreshed');
	}

	/**
	 * Handle clearing current chat
	 */
	async handleClearCurrentChat(): Promise<void> {
		const currentSession = this.getCurrentSession();
		if (!currentSession) {
			Logger.debug('No current session to clear');
			return;
		}

		Logger.debug('Clearing current chat session:', currentSession.id);

		// Stop any ongoing streaming or execution before clearing
		Logger.debug('Stopping any ongoing streaming before clearing chat');
		this.streamManager.stopStreaming();
		
		// Stop Plan-Execute processor if running
		if (this.mastraPlanExecuteProcessor) {
			Logger.debug('Stopping Plan-Execute processor before clearing chat');
			this.mastraPlanExecuteProcessor.stop();
		}

		// Explicitly reset button states to ensure UI is correct
		Logger.debug('Resetting button states after stopping');
		this.streamManager.resetButtonStates();

		// Clear the messages from the current session
		currentSession.messages = [];

		// Clear the UI
		this.messageManager.renderMessages(currentSession);

		// Save the updated session
		await this.plugin.updateChatSession(currentSession.id, {
			messages: [],
			updated: Date.now()
		});

		Logger.debug('Current chat cleared successfully');
	}

	/**
	 * Handle regenerating an assistant response
	 */
	async handleRegenerateResponse(messageId: string): Promise<void> {
		const currentSession = this.getCurrentSession();
		if (!currentSession) {
			const i18n = this.plugin.getI18nManager();
			const { Notice } = require('obsidian');
			new Notice(i18n?.t('notifications.chatView.noActiveSession') || 'No active session');
			return;
		}

		Logger.debug('Regenerating response for message:', messageId);

		// Find the assistant message
		const messageIndex = currentSession.messages.findIndex(m => m.id === messageId);
		if (messageIndex === -1) {
			const { Notice } = require('obsidian');
			new Notice(this.plugin.i18n.t('ui.messageNotFound'));
			return;
		}

		const assistantMessage = currentSession.messages[messageIndex];
		if (assistantMessage.role !== 'assistant') {
			const { Notice } = require('obsidian');
			new Notice(this.plugin.i18n.t('ui.canOnlyRegenerateAssistant'));
			return;
		}

		// Find the previous user message
		let userMessageIndex = -1;
		for (let i = messageIndex - 1; i >= 0; i--) {
			if (currentSession.messages[i].role === 'user') {
				userMessageIndex = i;
				break;
			}
		}

		if (userMessageIndex === -1) {
			const { Notice } = require('obsidian');
			new Notice(this.plugin.i18n.t('ui.noUserMessageBeforeAssistant'));
			return;
		}

		const userMessage = currentSession.messages[userMessageIndex];

		// Remove the assistant message and all subsequent messages
		const messagesToRemove = currentSession.messages.length - messageIndex;
		currentSession.messages.splice(messageIndex);

		Logger.debug('Removed messages for regeneration:', {
			messageIndex,
			messagesToRemove,
			remainingMessages: currentSession.messages.length
		});

		// Remove from UI
		const messageElements = this.messageContainer.querySelectorAll('.llmsider-message');
		for (let i = messageIndex; i < messageElements.length; i++) {
			const messageEl = messageElements[i] as HTMLElement;
			if ((messageEl as any).workingInterval) {
				clearInterval((messageEl as any).workingInterval);
			}
			messageEl.remove();
		}

		// Update session
		await this.plugin.updateChatSession(currentSession.id, {
			messages: currentSession.messages,
			updated: Date.now()
		});

		// Regenerate response
		await this.getAIResponse(userMessage);
	}
}
