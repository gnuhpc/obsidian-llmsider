import { ChatSession, ChatMode } from '../types';
import { Logger } from './../utils/logger';
import { Notice } from 'obsidian';
import LLMSiderPlugin from '../main';

export class SessionManager {
	private plugin: LLMSiderPlugin;
	private messageContainer: HTMLElement;
	private onSessionLoadedCallback?: (session: ChatSession) => void;

	constructor(plugin: LLMSiderPlugin, messageContainer: HTMLElement) {
		this.plugin = plugin;
		this.messageContainer = messageContainer;
	}

	/**
	 * Set callback for when a session is loaded
	 */
	setOnSessionLoadedCallback(callback: (session: ChatSession) => void): void {
		this.onSessionLoadedCallback = callback;
	}

	/**
	 * Initialize a new or existing session
	 */
	async initializeSession(): Promise<ChatSession> {
		// Create new session or load existing one
		if (this.plugin.settings.chatSessions.length > 0) {
			return this.plugin.settings.chatSessions[0];
		} else {
			return await this.plugin.createChatSession();
		}
	}

	/**
	 * Create a new chat session
	 */
	async newChat(): Promise<ChatSession> {
		Logger.debug('Creating new chat session');
		Logger.debug('Current sessions count:', this.plugin.settings.chatSessions.length);

		// Create session without immediate save to improve performance
		const session: ChatSession = {
			id: this.plugin.settings.nextSessionId.toString(),
			name: 'Untitled', // Default name, will be updated from first message
			messages: [],
			created: Date.now(),
			updated: Date.now(),
			provider: this.plugin.settings.activeProvider,
			mode: 'ask' // Default mode for compatibility
		};

		// Increment nextSessionId for the next session
		this.plugin.settings.nextSessionId++;

		Logger.debug('New session created:', {
			id: session.id,
			name: session.name,
			messageCount: session.messages.length,
			provider: session.provider,
			mode: session.mode
		});

		// Add to settings immediately for UI consistency
		this.plugin.settings.chatSessions.unshift(session);
		Logger.debug('Session added to front of sessions array');
		Logger.debug('Final sessions count:', this.plugin.settings.chatSessions.length);

		// Save settings asynchronously in background
		this.plugin.saveSettings().catch(error => {
			Logger.error('Failed to save settings after creating new chat:', error);
		});

		Logger.debug('New chat session creation completed');
		return session;
	}

	/**
	 * Clear current chat session
	 */
	async clearChat(currentSession: ChatSession | null): Promise<void> {
		if (currentSession) {
			currentSession.messages = [];

			// Save settings asynchronously in background
			this.plugin.updateChatSession(currentSession.id, { messages: [] }).catch(error => {
				Logger.error('Failed to save settings after clearing chat:', error);
			});
		}
	}

	/**
	 * Show chat history modal
	 */
	showChatHistory(): void {
		Logger.debug('📜 showChatHistory called');
		const sessions = this.plugin.settings.chatSessions;
		Logger.debug('📜 Current sessions count:', sessions.length);
		if (sessions.length <= 1) {
			Logger.debug('📜 Not enough sessions to show history (need > 1)');
			new Notice(this.plugin.getI18nManager()?.t('notifications.session.noChatHistory') || 'No chat history available');
			return;
		}

		this.showChatHistoryModal(sessions);
	}

	/**
	 * Show chat history modal with modern UI and search (beautify-layout inspired)
	 */
	private showChatHistoryModal(sessions: ChatSession[]): void {
		Logger.debug('📜 showChatHistoryModal called with', sessions.length, 'sessions');
		// Create modal overlay
		const modal = document.body.createDiv({
			cls: 'llmsider-chat-history-modal'
		});

		// Modal container (card with shadow)
		const modalContainer = modal.createDiv({
			cls: 'llmsider-chat-history-container'
		});

		// Header with title and close button
		const header = modalContainer.createDiv({
			cls: 'llmsider-chat-history-header'
		});

		const title = header.createEl('h2', {
			text: 'Chat History',
			cls: 'llmsider-chat-history-title'
		});

		const closeBtn = header.createEl('button', {
			cls: 'llmsider-chat-history-close',
			attr: { 'aria-label': 'Close' }
		});
		closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="18" y1="6" x2="6" y2="18"></line>
			<line x1="6" y1="6" x2="18" y2="18"></line>
		</svg>`;
		closeBtn.onclick = () => modal.remove();

		// Search bar with icon (inside border box)
		const searchWrapper = modalContainer.createDiv({
			cls: 'llmsider-chat-history-search-wrapper'
		});

		const searchContainer = searchWrapper.createDiv({
			cls: 'llmsider-chat-history-search-container'
		});

		const searchIcon = searchContainer.createEl('span', {
			cls: 'llmsider-chat-history-search-icon'
		});
		searchIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="11" cy="11" r="8"></circle>
			<path d="m21 21-4.35-4.35"></path>
		</svg>`;

		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Search conversations...',
			cls: 'llmsider-chat-history-search-input',
			attr: { 'aria-label': 'Search conversations' }
		});

		// Conversations list container (with scroll area)
		const conversationsList = modalContainer.createDiv({
			cls: 'llmsider-chat-history-list'
		});

		// Search state
		let filteredSessions = sessions;
		let searchQuery = '';

		// Render function for session list
		const renderSessions = (sessionsToRender: ChatSession[]) => {
			conversationsList.empty();

			if (sessionsToRender.length === 0) {
				// Empty state (beautify-layout style)
				const emptyState = conversationsList.createDiv({
					cls: 'llmsider-chat-history-empty'
				});
				const emptyIcon = emptyState.createEl('div', {
					cls: 'llmsider-chat-history-empty-icon'
				});
				emptyIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"></circle>
					<path d="m21 21-4.35-4.35"></path>
				</svg>`;
				emptyState.createEl('p', {
					text: 'No conversations found',
					cls: 'llmsider-chat-history-empty-text'
				});
				return;
			}

			// Get current session
			const currentSession = this.plugin.settings.chatSessions[0];

			// Render each session as a card
			for (let index = 0; index < sessionsToRender.length; index++) {
				const session = sessionsToRender[index];
				const isCurrentSession = session.id === currentSession?.id;
				
				// Get message count and preview from session
				const messageCount = session.messages.length;
				const firstUserMessage = session.messages.find(msg => msg.role === 'user');
				const previewText = firstUserMessage?.content 
					? (typeof firstUserMessage.content === 'string' 
						? firstUserMessage.content 
						: firstUserMessage.content.map((c: any) => c.type === 'text' ? c.text : '[Image]').join(' '))
					: '';

				// Create card item
				const cardItem = conversationsList.createDiv({
					cls: `llmsider-chat-history-card ${isCurrentSession ? 'current-thread' : ''}`
				});

				// Current thread indicator (dot)
				if (isCurrentSession) {
					cardItem.createDiv({ cls: 'llmsider-chat-history-current-indicator' });
				}

				// Card content wrapper (flex container)
				const cardContent = cardItem.createDiv({
					cls: 'llmsider-chat-history-card-content'
				});

				// Left icon
				const iconWrapper = cardContent.createDiv({
					cls: 'llmsider-chat-history-card-icon'
				});
				iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
				</svg>`;

				// Main content (middle)
				const mainContent = cardContent.createDiv({
					cls: 'llmsider-chat-history-card-main'
				});

			// Title row (title + metadata)
			const titleRow = mainContent.createDiv({
				cls: 'llmsider-chat-history-card-title-row'
			});

			// Title
			titleRow.createEl('h3', {
				text: session.name || 'Untitled Conversation',
				cls: 'llmsider-chat-history-card-title'
			});

			// Metadata (message count and date) in title row
			const cardMeta = titleRow.createDiv({ cls: 'llmsider-chat-history-card-meta' });

			// Message count
			cardMeta.createEl('span', {
				cls: 'llmsider-chat-history-meta-count',
				text: `${messageCount} messages`
			});

			// Dot separator
			cardMeta.createEl('span', {
				cls: 'llmsider-chat-history-meta-separator',
				text: '•'
			});

			// Updated time
			const updatedTime = new Date(session.updated);
			cardMeta.createEl('span', {
				cls: 'llmsider-chat-history-meta-date',
				text: updatedTime.toLocaleDateString()
			});

			// Actions container (right side, hover-revealed)
			const cardActions = cardContent.createDiv({
				cls: 'llmsider-chat-history-card-actions'
			});				// Navigate/Load button
				if (!isCurrentSession) {
					const loadBtn = cardActions.createEl('button', {
						cls: 'llmsider-chat-history-action-btn',
						attr: { 'aria-label': 'Load conversation', title: 'Load conversation' }
					});
					loadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>`;
					loadBtn.onclick = (e) => {
						e.stopPropagation();
						this.loadChatSession(session);
						modal.remove();
					};
				}

				// Delete button
				if (!isCurrentSession) {
					const deleteBtn = cardActions.createEl('button', {
						cls: 'llmsider-chat-history-action-btn delete',
						attr: { 'aria-label': 'Delete conversation', title: 'Delete conversation' }
					});
					deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 6h18"></path>
						<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
						<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
					</svg>`;
					deleteBtn.onclick = async (e) => {
						e.stopPropagation();
						const confirmDelete = await this.showDeleteConfirmation(session.name || 'Untitled Conversation');
						if (confirmDelete) {
							await this.plugin.deleteChatSession(session.id);
							new Notice(this.plugin.i18n.t('ui.conversationDeleted'));
							// Refresh modal
							modal.remove();
							this.showChatHistory();
						}
					};
				}

				// Preview text
				if (previewText) {
					mainContent.createEl('p', {
						text: previewText,
						cls: 'llmsider-chat-history-card-preview'
					});
				}

				// Click handler for the entire card
				cardItem.onclick = () => {
					if (!isCurrentSession) {
						this.loadChatSession(session);
						modal.remove();
					}
				};
			}
		};

		// Search input handler with real-time filtering
		searchInput.oninput = () => {
			searchQuery = searchInput.value.trim().toLowerCase();
			if (!searchQuery) {
				filteredSessions = sessions;
			} else {
				filteredSessions = sessions.filter((session) => {
					const name = (session.name || '').toLowerCase();
					const firstMsg = session.messages.find(m => m.role === 'user');
					const preview = firstMsg?.content ? (typeof firstMsg.content === 'string' ? firstMsg.content : '').toLowerCase() : '';
					return name.includes(searchQuery) || preview.includes(searchQuery);
				});
			}
			renderSessions(filteredSessions);
		};

		// Initial render
		renderSessions(filteredSessions);

		// Keyboard event handler for ESC and search focus
		const keyHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				modal.remove();
			}
		};

		document.addEventListener('keydown', keyHandler);

		// Auto-focus search input
		setTimeout(() => searchInput.focus(), 100);

		// Click outside to close
		modal.onclick = (e) => {
			if (e.target === modal) {
				modal.remove();
			}
		};

		// Cleanup on close
		const originalRemove = modal.remove.bind(modal);
		modal.remove = () => {
			document.removeEventListener('keydown', keyHandler);
			originalRemove();
		};
	}

	/**
	 * Show delete confirmation dialog
	 */
	private async showDeleteConfirmation(sessionName: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = document.body.createDiv({
				cls: 'llmsider-delete-confirmation-modal'
			});

			const container = modal.createDiv({
				cls: 'llmsider-delete-confirmation-container'
			});

			container.createEl('h3', {
				text: 'Delete Chat Session',
				cls: 'llmsider-delete-confirmation-title'
			});

			container.createEl('p', {
				text: `Are you sure you want to delete "${sessionName}"? This action cannot be undone.`,
				cls: 'llmsider-delete-confirmation-text'
			});

			const actions = container.createDiv({
				cls: 'llmsider-delete-confirmation-actions'
			});

			const cancelBtn = actions.createEl('button', {
				cls: 'llmsider-delete-confirmation-cancel',
				text: 'Cancel'
			});

			const deleteBtn = actions.createEl('button', {
				cls: 'llmsider-delete-confirmation-delete',
				text: 'Delete'
			});

			const cleanup = () => {
				modal.remove();
			};

			cancelBtn.onclick = () => {
				cleanup();
				resolve(false);
			};

			deleteBtn.onclick = () => {
				cleanup();
				resolve(true);
			};

			modal.onclick = (e) => {
				if (e.target === modal) {
					cleanup();
					resolve(false);
				}
			};
		});
	}

	/**
	 * Load thread from Mastra memory and restore to UI
	 */
	async loadThreadFromMemory(threadId: string, memoryManager: any): Promise<void> {
		try {
			Logger.debug('📥 Loading thread from memory:', threadId);

			// Get conversation history
			const history = await memoryManager.getConversationHistory(threadId);
			Logger.debug('📥 Loaded', history.length, 'messages');

			// Set as current thread in memory manager
			memoryManager.setDefaultThreadId(threadId);

			// Create or update ChatSession for UI compatibility
			const thread = await memoryManager.getStorageAdapter().getThread({ id: threadId });
			const session: ChatSession = {
				id: threadId,
				name: thread?.title || 'Untitled',
				messages: history.map((msg: any) => ({
					role: msg.role,
					content: msg.content,
					timestamp: msg.timestamp
				})),
				created: thread?.createdAt ? new Date(thread.createdAt).getTime() : Date.now(),
				updated: thread?.updatedAt ? new Date(thread.updatedAt).getTime() : Date.now(),
				provider: this.plugin.settings.activeProvider,
				mode: 'ask'
			};

			// Update current session in plugin state
			this.plugin.state.currentSession = threadId;
			
			// Move to front of chatSessions array for backwards compatibility
			const existingIndex = this.plugin.settings.chatSessions.findIndex(s => s.id === threadId);
			if (existingIndex >= 0) {
				this.plugin.settings.chatSessions.splice(existingIndex, 1);
			}
			this.plugin.settings.chatSessions.unshift(session);

			await this.plugin.saveSettings();

			// Show success message
			new Notice(this.plugin.getI18nManager()?.t('notifications.session.sessionLoaded', { name: session.name }) || `Loaded: ${session.name}`);

			// Trigger UI refresh
			if (this.onSessionLoadedCallback) {
				this.onSessionLoadedCallback(session);
			}

			Logger.debug('📥 Thread loaded successfully:', threadId);
		} catch (error) {
			Logger.error('📥 Failed to load thread:', error);
			new Notice(this.plugin.i18n.t('ui.failedToLoadConversation'));
		}
	}

	/**
	 * Load a specific chat session (legacy method, kept for compatibility)
	 */
	loadChatSession(session: ChatSession): void {
		// Move session to front of array (make it current)
		const sessionIndex = this.plugin.settings.chatSessions.findIndex(s => s.id === session.id);
		if (sessionIndex > 0) {
			this.plugin.settings.chatSessions.splice(sessionIndex, 1);
			this.plugin.settings.chatSessions.unshift(session);
		}

		// Show success message
		new Notice(this.plugin.getI18nManager()?.t('notifications.session.sessionLoaded', { name: session.name || 'Untitled' }) || `Loaded chat session: ${session.name || 'Untitled'}`);

		// Update plugin's current session in state
		this.plugin.state.currentSession = session.id;
		this.plugin.saveSettings();

		// Trigger UI refresh callback
		if (this.onSessionLoadedCallback) {
			this.onSessionLoadedCallback(session);
		}

		Logger.debug('Session loaded:', session.id);
	}

	/**
	 * Get current session (first in the array)
	 */
	getCurrentSession(): ChatSession | null {
		return this.plugin.settings.chatSessions.length > 0 ? this.plugin.settings.chatSessions[0] : null;
	}

	/**
	 * Update session mode
	 */
	async updateSessionMode(session: ChatSession, mode: ChatMode): Promise<void> {
		session.mode = mode;
		await this.plugin.updateChatSession(session.id, { mode: mode });
	}

	/**
	 * Auto-include current note for action mode
	 */
	async includeCurrentNoteForAction(contextManager: unknown): Promise<void> {
		const result = await contextManager.includeCurrentNote();
		if (result.success) {
			Logger.debug('Auto-included current note for action mode:', result.note?.name);
		} else {
			new Notice(result.message);
		}
	}

	/**
	 * Show dialog when maximum chat limit is reached
	 */
	private async showMaxChatLimitDialog(): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = document.body.createDiv({
				cls: 'llmsider-max-chat-limit-modal'
			});

			const container = modal.createDiv({
				cls: 'llmsider-max-chat-limit-container'
			});

			// Title
			container.createEl('h3', {
				text: 'Maximum Chat History Reached',
				cls: 'llmsider-max-chat-limit-title'
			});

			// Message
			const message = container.createDiv({
				cls: 'llmsider-max-chat-limit-message'
			});

			message.createEl('p', {
				text: `You have reached the maximum chat history limit of ${this.plugin.settings.maxChatHistory} conversations.`
			});

			message.createEl('p', {
				text: 'To create a new chat, the oldest conversation will be automatically removed.'
			});

			// Actions
			const actions = container.createDiv({
				cls: 'llmsider-max-chat-limit-actions'
			});

			const cancelBtn = actions.createEl('button', {
				cls: 'llmsider-max-chat-limit-cancel',
				text: 'Cancel'
			});

			const proceedBtn = actions.createEl('button', {
				cls: 'llmsider-max-chat-limit-proceed',
				text: 'Continue & Remove Oldest'
			});

			const cleanup = () => {
				modal.remove();
			};

			cancelBtn.onclick = () => {
				cleanup();
				resolve(false);
			};

			proceedBtn.onclick = () => {
				cleanup();
				resolve(true);
			};

			// ESC key to cancel
			const keyHandler = (e: KeyboardEvent) => {
				if (e.key === 'Escape') {
					cleanup();
					document.removeEventListener('keydown', keyHandler);
					resolve(false);
				}
			};
			document.addEventListener('keydown', keyHandler);

			// Click outside to cancel
			modal.onclick = (e) => {
				if (e.target === modal) {
					cleanup();
					document.removeEventListener('keydown', keyHandler);
					resolve(false);
				}
			};

			// Cleanup on close
			const originalRemove = modal.remove.bind(modal);
			modal.remove = () => {
				document.removeEventListener('keydown', keyHandler);
				originalRemove();
			};

			// Focus the proceed button by default
			setTimeout(() => {
				proceedBtn.focus();
			}, 100);
		});
	}
}