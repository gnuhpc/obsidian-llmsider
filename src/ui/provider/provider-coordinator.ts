import { ChatMessage, ChatSession, LLMConnection, LLMModel } from '../../types';
import { Logger } from '../../utils/logger';
import { Notice } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { MessageRenderer } from '../message-renderer';
import type { MessageManager } from '../message-manager';
import type { StreamManager } from '../../core/stream-manager';
import type { ProviderTabsManager } from '../provider-tabs';

/**
 * ProviderCoordinator
 * 
 * Handles all provider-related operations including:
 * - Adding provider responses to messages
 * - Managing provider tabs
 * - Switching between provider responses
 * - Provider label formatting
 */
export class ProviderCoordinator {
	constructor(
		private plugin: LLMSiderPlugin,
		private messageRenderer: MessageRenderer,
		private messageManager: MessageManager,
		private streamManager: StreamManager,
		private providerTabsManager: ProviderTabsManager,
		private messageContainer: HTMLElement,
		private getCurrentSession: () => ChatSession | null,
		private getSystemPrompt: () => Promise<string>
	) {}

	/**
	 * Handle adding a provider for a specific message
	 */
	async handleAddProviderForMessage(messageId: string, triggerButton?: HTMLElement): Promise<void> {
		const currentSession = this.getCurrentSession();
		if (!currentSession) {
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.chatView.noActiveSession') || 'No active session');
			return;
		}

		Logger.debug('Add provider for message:', messageId);
		
		// Find the target assistant message
		const targetMessage = currentSession.messages.find(m => m.id === messageId);
		if (!targetMessage || targetMessage.role !== 'assistant') {
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.chatView.messageNotFoundOrNotAssistant') || 'Message not found or not an assistant message');
			return;
		}
		
		// Find the message index
		const messageIndex = currentSession.messages.findIndex(m => m.id === messageId);

		// Show provider selection dropdown near the trigger button
		this.providerTabsManager.showAddProviderModal(async (selectedProvider: string) => {
			await this.addProviderResponseForMessage(targetMessage, messageIndex, selectedProvider);
		}, triggerButton);
	}

	/**
	 * Add a new provider response to an existing assistant message
	 */
	private async addProviderResponseForMessage(
		targetMessage: ChatMessage,
		messageIndex: number,
		selectedProvider: string
	): Promise<void> {
		const currentSession = this.getCurrentSession();
		if (!currentSession) return;

		Logger.debug('Adding provider response for message:', targetMessage.id, 'provider:', selectedProvider);

		// Store current provider's content if not already stored
		if (!targetMessage.providerResponses) {
			targetMessage.providerResponses = {};
			// Store the original content as the first provider response
			const originalProvider = targetMessage.metadata?.provider || currentSession.provider;
			if (originalProvider) {
				targetMessage.providerResponses[originalProvider] = {
					content: targetMessage.content,
					timestamp: targetMessage.timestamp,
					tokens: targetMessage.metadata?.tokens,
					model: targetMessage.metadata?.model
				};
				targetMessage.activeProvider = originalProvider;
			}
		}

		// Check if this provider already has a response
		if (targetMessage.providerResponses[selectedProvider]) {
			new Notice(this.plugin.getI18nManager()?.t('notifications.chatView.providerAlreadyHasResponse') || 'This provider already has a response for this message');
			return;
		}

		// Get all messages up to (but not including) the target assistant message
		const conversationHistory = currentSession.messages.slice(0, messageIndex);
		
		// Find the last user message
		const lastUserMessage = conversationHistory.filter(m => m.role === 'user').pop();
		if (!lastUserMessage) {
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.chatView.noUserMessageBefore') || 'No user message found before this assistant message');
			return;
		}

		// Get the message element
		const messageEl = document.querySelector(`[data-message-id="${targetMessage.id}"]`);
		if (!messageEl) {
			Logger.error('Message element not found:', targetMessage.id);
			return;
		}

		// Get content element
		const contentEl = messageEl.querySelector('.llmsider-message-content');
		if (!contentEl) {
			Logger.error('Content element not found before rendering tabs');
			return;
		}

		// Create placeholder response for the new provider
		targetMessage.providerResponses[selectedProvider] = {
			content: '', // Empty content, will be filled with streaming
			timestamp: Date.now()
		};

		// Set active provider to the new one
		targetMessage.activeProvider = selectedProvider;

		// Render tabs at the top
		this.messageRenderer.renderProviderTabsForMessage(messageEl as HTMLElement, targetMessage);

		// Remove all children EXCEPT the tabs container
		const tabsContainer = contentEl.querySelector('.llmsider-message-provider-tabs');
		const children = Array.from(contentEl.children);
		children.forEach(child => {
			if (child !== tabsContainer) {
				child.remove();
			}
		});

		// Add loading indicator
		const dotsContainer = (contentEl as HTMLElement).createEl('div', { cls: 'llmsider-typing-dots' });
		const middleDot = dotsContainer.createEl('span', { cls: 'llmsider-typing-dot' });
		middleDot.style.cssText = `
			display: inline-block;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--text-muted);
			animation: typing 1.4s infinite both;
			animation-delay: 0.2s;
		`;

		// Temporarily switch provider
		const originalProvider = currentSession.provider;
		const originalActiveConnectionId = this.plugin.settings.activeConnectionId;
		const originalActiveModelId = this.plugin.settings.activeModelId;
		
		// Parse and set the new provider
		if (selectedProvider.includes('::')) {
			const [connectionId, modelId] = selectedProvider.split('::');
			this.plugin.settings.activeConnectionId = connectionId;
			this.plugin.settings.activeModelId = modelId;
		}
		currentSession.provider = selectedProvider;

		// Start streaming mode
		const streamController = this.streamManager.startStreaming();
		
		// Set up stop handler
		this.streamManager.setStopHandler(() => {
			Logger.debug('Multi-provider stream stopped by user');
			
			// Clear loading indicator
			const currentContentEl = messageEl.querySelector('.llmsider-message-content');
			if (currentContentEl) {
				const dotsContainer = currentContentEl.querySelector('.llmsider-typing-dots');
				if (dotsContainer) {
					dotsContainer.remove();
				}
			}
			
			this.streamManager.stopStreaming();
		});

		try {
			// Get the provider instance
			const provider = this.plugin.getActiveProvider();
			if (!provider) {
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.chatView.failedToGetProvider') || 'Failed to get provider instance');
				return;
			}

			// Build the messages
			const systemPrompt = await this.getSystemPrompt();
			
			// Prepare conversation history
			const conversationMessages = conversationHistory.map((msg, idx) => ({
				id: msg.id || `temp-${idx}`,
				role: msg.role,
				content: msg.content,
				timestamp: msg.timestamp || Date.now(),
				metadata: msg.metadata
			}));

			// Accumulated content for streaming
			let accumulatedContent = '';

			// Set thread ID on provider for session management (e.g. Free Qwen)
			const currentSession = this.getCurrentSession();
			if (currentSession?.id && provider.setThreadId) {
				provider.setThreadId(currentSession.id);
			}

			// Use streaming API
			await provider.sendStreamingMessage(conversationMessages, (chunk) => {
				// Check if streaming was stopped
				if (streamController.signal.aborted) return;

				// Clear loading indicator on first chunk
				if (chunk.delta && accumulatedContent === '') {
					const currentContentEl = messageEl.querySelector('.llmsider-message-content');
					if (currentContentEl) {
						currentContentEl.classList.remove('llmsider-working-indicator');
						const dotsContainer = currentContentEl.querySelector('.llmsider-typing-dots');
						if (dotsContainer) {
							dotsContainer.remove();
						}
					}
				}

				if (chunk.delta) {
					accumulatedContent += chunk.delta;
					
					// Update the provider response content
					targetMessage.providerResponses![selectedProvider].content = accumulatedContent;

					// Update the UI with streaming content
					const currentContentEl = messageEl.querySelector('.llmsider-message-content');
					if (currentContentEl) {
						this.messageRenderer.updateStreamingContent(currentContentEl as HTMLElement, accumulatedContent);
					}
				}
			}, streamController.signal, undefined, systemPrompt);

			// Update final response
			targetMessage.providerResponses[selectedProvider] = {
				content: accumulatedContent,
				timestamp: Date.now()
			};

			// Save the session
			await this.plugin.updateChatSession(currentSession.id, {
				messages: currentSession.messages,
				updated: Date.now()
			});

			Logger.debug(`Response from ${this.getProviderLabel(selectedProvider)} completed`);
		} catch (error) {
			Logger.error('Error getting provider response:', error);
			
			// Handle abort error gracefully
			if (error instanceof Error && error.name === 'AbortError') {
				Logger.debug('Multi-provider stream was aborted by user');
				if (targetMessage.providerResponses[selectedProvider].content) {
					await this.plugin.updateChatSession(currentSession.id, {
						messages: currentSession.messages,
						updated: Date.now()
					});
				} else {
					delete targetMessage.providerResponses[selectedProvider];
					this.messageManager.renderMessages(currentSession);
				}
				return;
			}
			
			// Remove the failed response
			delete targetMessage.providerResponses[selectedProvider];
			this.messageManager.renderMessages(currentSession);
			
			const i18n = this.plugin.getI18nManager();
			if (error instanceof Error) {
				new Notice(i18n?.t('notifications.chatView.providerError', { message: error.message }) || `Error: ${error.message}`);
			} else {
				new Notice(i18n?.t('notifications.chatView.failedToGetResponse') || 'Failed to get response from provider');
			}
		} finally {
			// Always reset button states
			this.streamManager.resetButtonStates();
			
			// Restore original provider settings
			currentSession.provider = originalProvider;
			this.plugin.settings.activeConnectionId = originalActiveConnectionId;
			this.plugin.settings.activeModelId = originalActiveModelId;
		}
	}

	/**
	 * Handle provider tab switched event
	 */
	async handleProviderTabSwitched(messageId: string, provider: string): Promise<void> {
		const currentSession = this.getCurrentSession();
		if (currentSession) {
			await this.plugin.updateChatSession(currentSession.id, {
				messages: currentSession.messages,
				updated: Date.now()
			});
		}
	}

	/**
	 * Handle provider tab removed event
	 */
	async handleProviderTabRemoved(messageId: string, provider: string): Promise<void> {
		const currentSession = this.getCurrentSession();
		if (currentSession) {
			await this.plugin.updateChatSession(currentSession.id, {
				messages: currentSession.messages,
				updated: Date.now()
			});
		}
	}

	/**
	 * Get human-readable label for a provider
	 */
	getProviderLabel(provider: string): string {
		if (provider.includes('::')) {
			const [connectionId, modelId] = provider.split('::');
			const connection = this.plugin.settings.connections?.find((c: LLMConnection) => c.id === connectionId);
			const model = this.plugin.settings.models?.find((m: LLMModel) => m.id === modelId && m.connectionId === connectionId);
			if (model && connection) {
				return `${connection.name}: ${model.name}`;
			}
		}
		// Fallback to provider type name
		return provider.charAt(0).toUpperCase() + provider.slice(1);
	}

	/**
	 * Update provider tabs UI
	 */
	updateProviderTabs(): void {
		if (!this.providerTabsManager) return;
		
		// Remove any existing tabs container
		const existingTabs = this.messageContainer.querySelector('.llmsider-provider-tabs-container');
		if (existingTabs) {
			existingTabs.remove();
		}
	}
}
