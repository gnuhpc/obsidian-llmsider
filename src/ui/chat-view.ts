// Simplified chat view for lite version - Normal mode only

import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { Logger } from '../utils/logger';
import { CHAT_VIEW_TYPE, ChatMessage, ChatSession } from '../types';
import LLMSiderLitePlugin from '../main';

export class ChatView extends ItemView {
	plugin: LLMSiderLitePlugin;
	currentSession: ChatSession | null = null;

	// UI Elements
	messageContainer!: HTMLElement;
	inputContainer!: HTMLElement;
	inputElement!: HTMLTextAreaElement;
	sendButton!: HTMLElement;
	providerSelect!: HTMLSelectElement;

	// State
	private isStreaming = false;
	private currentAbortController: AbortController | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: LLMSiderLitePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return CHAT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Chat';
	}

	getIcon(): string {
		return 'message-circle';
	}

	async onOpen() {
		this.containerEl.empty();
		this.buildUI();
		await this.initializeSession();
	}

	onClose(): Promise<void> {
		this.containerEl.empty();
		return Promise.resolve();
	}

	private buildUI() {
		const container = this.containerEl.createDiv({ cls: 'llmsider-lite-container' });

		// Header
		const header = container.createDiv({ cls: 'llmsider-lite-header' });
		
		// Provider selector
		const providerContainer = header.createDiv({ cls: 'llmsider-lite-provider' });
		providerContainer.createEl('span', { text: 'Provider: ' });
		this.providerSelect = providerContainer.createEl('select', { cls: 'llmsider-lite-provider-select' });
		this.updateProviderSelect();

		// Message container
		this.messageContainer = container.createDiv({ cls: 'llmsider-lite-messages' });

		// Input area
		this.inputContainer = container.createDiv({ cls: 'llmsider-lite-input-area' });
		
		this.inputElement = this.inputContainer.createEl('textarea', {
			cls: 'llmsider-lite-input',
			attr: { placeholder: 'Type your message...' }
		});

		const buttonContainer = this.inputContainer.createDiv({ cls: 'llmsider-lite-button-container' });
		this.sendButton = buttonContainer.createEl('button', {
			text: 'Send',
			cls: 'llmsider-lite-send-button'
		});

		// Event listeners
		this.sendButton.addEventListener('click', () => {
			void this.handleSend();
		});
		this.inputElement.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				void this.handleSend();
			}
		});
		
		this.providerSelect.addEventListener('change', () => {
			const selectedValue = this.providerSelect.value;
			if (selectedValue) {
				this.plugin.setActiveProvider(selectedValue);
			}
		});
	}

	private updateProviderSelect() {
		this.providerSelect.empty();
		
		const providers = this.plugin.getAvailableProviders();
		if (providers.length === 0) {
			const option = this.providerSelect.createEl('option', {
				text: 'No providers configured',
				attr: { value: '' }
			});
			option.disabled = true;
			return;
		}

		providers.forEach(provider => {
			const option = this.providerSelect.createEl('option', {
				text: provider.name,
				attr: { value: provider.id }
			});
			if (provider.id === this.plugin.settings.activeProvider) {
				option.selected = true;
			}
		});
	}

	private async initializeSession() {
		// Try to load the most recent session
		if (this.plugin.settings.chatSessions.length > 0) {
			this.currentSession = this.plugin.settings.chatSessions[0];
		} else {
			this.currentSession = await this.plugin.createChatSession('New Chat');
		}

		this.renderMessages();
	}

	private renderMessages() {
		this.messageContainer.empty();

		if (!this.currentSession) return;

		for (const message of this.currentSession.messages) {
			this.addMessageToUI(message);
		}

		this.scrollToBottom();
	}

	private addMessageToUI(message: ChatMessage) {
		const messageEl = this.messageContainer.createDiv({
			cls: `llmsider-lite-message llmsider-lite-message-${message.role}`
		});

		const roleEl = messageEl.createDiv({ cls: 'llmsider-lite-message-role' });
		roleEl.textContent = message.role === 'user' ? 'You' : 'Assistant';

		const contentEl = messageEl.createDiv({ cls: 'llmsider-lite-message-content' });
		contentEl.textContent = message.content;

		return messageEl;
	}

	private scrollToBottom() {
		setTimeout(() => {
			this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
		}, 50);
	}

	private async handleSend() {
		const content = this.inputElement.value.trim();
		if (!content || this.isStreaming) return;

		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			new Notice('No provider selected');
			return;
		}

		if (!this.currentSession) return;

		// Add user message
		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			role: 'user',
			content: content,
			timestamp: Date.now()
		};

		this.currentSession.messages.push(userMessage);
		this.addMessageToUI(userMessage);
		this.inputElement.value = '';
		this.scrollToBottom();

		// Save session
		await this.plugin.updateChatSession(this.currentSession.id, {
			messages: this.currentSession.messages,
			name: this.currentSession.messages.length === 1 ? 
				content.slice(0, 50) : this.currentSession.name
		});

		// Get AI response
		await this.getAIResponse();
	}

	private async getAIResponse() {
		if (!this.currentSession) return;

		const provider = this.plugin.getActiveProvider();
		if (!provider) return;

		// Create assistant message
		const assistantMessage: ChatMessage = {
			id: Date.now().toString(),
			role: 'assistant',
			content: '',
			timestamp: Date.now()
		};

		this.currentSession.messages.push(assistantMessage);
		const messageEl = this.addMessageToUI(assistantMessage);
		const contentEl = messageEl.querySelector('.llmsider-lite-message-content') as HTMLElement;

		this.isStreaming = true;
		this.sendButton.disabled = true;
		this.currentAbortController = new AbortController();

		let fullResponse = '';

		try {
			// Prepare messages for API
			const messages = this.currentSession.messages
				.slice(0, -1) // Exclude the empty assistant message we just added
				.map(msg => ({
					role: msg.role,
					content: msg.content
				}));

			await provider.chat(messages, {
				onText: (text: string) => {
					fullResponse += text;
					assistantMessage.content = fullResponse;
					contentEl.textContent = fullResponse;
					this.scrollToBottom();
				},
				onComplete: () => {
					this.isStreaming = false;
					this.sendButton.disabled = false;
					this.currentAbortController = null;

					// Save final message
					void this.plugin.updateChatSession(this.currentSession!.id, {
						messages: this.currentSession!.messages
					});
				},
				onError: (error: Error) => {
					this.isStreaming = false;
					this.sendButton.disabled = false;
					this.currentAbortController = null;
					
					Logger.error('Error getting AI response:', error);
					contentEl.textContent = `Error: ${error.message}`;
					contentEl.addClass('chat-error-message');
				}
			});
		} catch (error: unknown) {
			this.isStreaming = false;
			this.sendButton.disabled = false;
			this.currentAbortController = null;
			
			Logger.error('Error in getAIResponse:', error);
			new Notice('Failed to get AI response');
		}
	}

	// Public method to refresh provider select
	onProviderChanged() {
		this.updateProviderSelect();
	}
}
