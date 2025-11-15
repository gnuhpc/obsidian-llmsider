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

		// Check if we've reached the maximum chat history limit
		if (this.plugin.settings.chatSessions.length >= this.plugin.settings.maxChatHistory) {
			const shouldProceed = await this.showMaxChatLimitDialog();
			if (!shouldProceed) {
				Logger.debug('User cancelled new chat creation due to limit');
				// Return the current session instead of creating a new one
				return this.plugin.settings.chatSessions[0];
			}
			// User chose to proceed, oldest chat will be automatically removed when we add the new one
		}

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

		// Limit chat history
		if (this.plugin.settings.chatSessions.length > this.plugin.settings.maxChatHistory) {
			const removedCount = this.plugin.settings.chatSessions.length - this.plugin.settings.maxChatHistory;
			this.plugin.settings.chatSessions = this.plugin.settings.chatSessions.slice(0, this.plugin.settings.maxChatHistory);
			Logger.debug('Trimmed chat history, removed', removedCount, 'old sessions');
		}

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
		const sessions = this.plugin.settings.chatSessions;
		if (sessions.length <= 1) {
			new Notice('No chat history available');
			return;
		}

		this.showChatHistoryModal(sessions);
	}

	/**
	 * Show chat history modal with session list
	 */
	private showChatHistoryModal(sessions: ChatSession[]): void {
		// Create modal overlay
		const modal = document.body.createDiv({
			cls: 'llmsider-chat-history-modal'
		});

		// Modal container - match prompt selector style
		const modalContainer = modal.createDiv({
			cls: 'llmsider-chat-history-container'
		});

		// Header
		const header = modalContainer.createDiv({
			cls: 'llmsider-chat-history-header'
		});

		const title = header.createEl('h2', {
			text: `Chat History (${sessions.length})`,
			cls: 'llmsider-chat-history-title'
		});

		const closeBtn = header.createEl('button', {
			cls: 'llmsider-chat-history-close',
			attr: { 'aria-label': 'Close' }
		});
		// Use SVG icon instead of emoji
		closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="18" y1="6" x2="6" y2="18"></line>
			<line x1="6" y1="6" x2="18" y2="18"></line>
		</svg>`;
		closeBtn.onclick = () => modal.remove();

		// Sessions list
		const sessionsList = modalContainer.createDiv({
			cls: 'llmsider-chat-history-list'
		});

		// Sort sessions by updated time (most recent first)
		const sortedSessions = [...sessions].sort((a, b) => b.updated - a.updated);

		// Keyboard navigation state
		let selectedIndex = -1;

		const updateSelection = () => {
			const items = sessionsList.querySelectorAll('.llmsider-chat-history-item');
			items.forEach((item, index) => {
				if (index === selectedIndex) {
					item.addClass('keyboard-selected');
					item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
				} else {
					item.removeClass('keyboard-selected');
				}
			});
		};

		const selectSession = () => {
			if (selectedIndex >= 0 && selectedIndex < sortedSessions.length) {
				const session = sortedSessions[selectedIndex];
				const currentSession = this.plugin.settings.chatSessions[0];
				if (session.id !== currentSession?.id) {
					this.loadChatSession(session);
					modal.remove();
				}
			}
		};

		sortedSessions.forEach((session, index) => {
			const currentSession = this.plugin.settings.chatSessions[0];
			const sessionItem = sessionsList.createDiv({
				cls: `llmsider-chat-history-item ${session.id === currentSession?.id ? 'current' : ''}`
			});

			// Item header with title and actions
			const itemHeader = sessionItem.createDiv({
				cls: 'llmsider-chat-history-item-header'
			});

			// Left side: session icon + name
			const leftSide = itemHeader.createDiv({
				cls: 'llmsider-chat-history-item-left'
			});

			// Chat icon (SVG)
			const chatIcon = leftSide.createEl('span', {
				cls: 'llmsider-chat-history-item-icon'
			});
			chatIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
			</svg>`;

			// Session name
			const displayName = session.name || `Chat ${index + 1}`;
			const sessionName = leftSide.createEl('span', {
				cls: 'llmsider-chat-history-item-name',
				text: displayName
			});

			// Right side: actions
			const actions = itemHeader.createDiv({
				cls: 'llmsider-chat-history-actions'
			});

			// Current indicator or Load button (SVG)
			if (session.id === currentSession?.id) {
				const currentBadge = actions.createEl('span', {
					cls: 'llmsider-chat-history-current-badge',
					attr: { 'aria-label': 'Current session' }
				});
				currentBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>`;
			} else {
				const loadBtn = actions.createEl('button', {
					cls: 'llmsider-chat-history-load-btn',
					attr: { 'aria-label': 'Load session' }
				});
				loadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="9 18 15 12 9 6"></polyline>
				</svg>`;
				loadBtn.onclick = (e) => {
					e.stopPropagation();
					this.loadChatSession(session);
					modal.remove();
				};
			}

			// Delete button (only for non-current sessions, SVG)
			if (session.id !== currentSession?.id) {
				const deleteBtn = actions.createEl('button', {
					cls: 'llmsider-chat-history-delete-btn',
					attr: { 'aria-label': 'Delete session' }
				});
				deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="3 6 5 6 21 6"></polyline>
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
				</svg>`;

				deleteBtn.onclick = async (e) => {
					e.stopPropagation();

					const confirmDelete = await this.showDeleteConfirmation(displayName);
					if (confirmDelete) {
						await this.plugin.deleteChatSession(session.id);
						// Refresh the modal
						modal.remove();
						this.showChatHistory();
					}
				};
			}

			// Meta info row
			const metaRow = sessionItem.createDiv({
				cls: 'llmsider-chat-history-item-meta'
			});

			// Message count with icon (SVG)
			const messageCount = metaRow.createEl('span', {
				cls: 'llmsider-chat-history-meta-item'
			});
			messageCount.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
			</svg><span>${session.messages.length}</span>`;

			// Time info with icon (SVG)
			const updatedTime = new Date(session.updated);
			const isToday = updatedTime.toDateString() === new Date().toDateString();
			const timeInfo = metaRow.createEl('span', {
				cls: 'llmsider-chat-history-meta-item'
			});
			timeInfo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<polyline points="12 6 12 12 16 14"></polyline>
			</svg><span>${isToday ? updatedTime.toLocaleTimeString() : updatedTime.toLocaleDateString()}</span>`;

			// Preview row (only if there's a message)
			if (session.messages.length > 0) {
				const firstUserMessage = session.messages.find(msg => msg.role === 'user');
				if (firstUserMessage) {
					const preview = sessionItem.createDiv({
						cls: 'llmsider-chat-history-preview'
					});

					const content = typeof firstUserMessage.content === 'string'
						? firstUserMessage.content
						: firstUserMessage.content.map(c => c.type === 'text' ? c.text : '[Image]').join(' ');

					preview.textContent = content.length > 80 ? content.substring(0, 80) + '...' : content;
				}
			}

			// Event handlers
			sessionItem.onclick = () => {
				if (session.id !== currentSession?.id) {
					this.loadChatSession(session);
					modal.remove();
				}
			};

			sessionItem.onmouseenter = () => {
				selectedIndex = index;
				updateSelection();
			};
		});

		// Keyboard event handler
		const keyHandler = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'ArrowUp':
					e.preventDefault();
					selectedIndex = selectedIndex <= 0 ? sortedSessions.length - 1 : selectedIndex - 1;
					updateSelection();
					break;
				case 'ArrowDown':
					e.preventDefault();
					selectedIndex = selectedIndex >= sortedSessions.length - 1 ? 0 : selectedIndex + 1;
					updateSelection();
					break;
				case 'Enter':
					e.preventDefault();
					selectSession();
					break;
				case 'Escape':
					e.preventDefault();
					modal.remove();
					document.removeEventListener('keydown', keyHandler);
					break;
			}
		};

		// Add keyboard listener
		document.addEventListener('keydown', keyHandler);

		// Focus the modal for keyboard events
		modal.tabIndex = -1;
		modal.focus();

		// Click outside to close
		modal.onclick = (e) => {
			if (e.target === modal) {
				modal.remove();
				document.removeEventListener('keydown', keyHandler);
			}
		};

		// Cleanup on close
		const originalRemove = modal.remove;
		modal.remove = () => {
			document.removeEventListener('keydown', keyHandler);
			originalRemove.call(modal);
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
	 * Load a specific chat session
	 */
	loadChatSession(session: ChatSession): void {
		// Move session to front of array (make it current)
		const sessionIndex = this.plugin.settings.chatSessions.findIndex(s => s.id === session.id);
		if (sessionIndex > 0) {
			this.plugin.settings.chatSessions.splice(sessionIndex, 1);
			this.plugin.settings.chatSessions.unshift(session);
		}

		// Show success message
		new Notice(`Loaded chat session: ${session.name || 'Untitled'}`);

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
	async includeCurrentNoteForAction(contextManager: any): Promise<void> {
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
			const originalRemove = modal.remove;
			modal.remove = () => {
				document.removeEventListener('keydown', keyHandler);
				originalRemove.call(modal);
			};

			// Focus the proceed button by default
			setTimeout(() => {
				proceedBtn.focus();
			}, 100);
		});
	}
}