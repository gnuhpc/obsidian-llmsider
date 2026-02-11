import { ChatMessage, ChatSession } from '../types';
import { Logger } from '../utils/logger';
import { MessageRenderer } from './message-renderer';
import { DiffProcessor } from '../utils/diff-processor';
import { Notice } from 'obsidian';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';

export class MessageManager {
	private plugin: LLMSiderPlugin;
	private messageContainer: HTMLElement;
	private messageRenderer: MessageRenderer;
	private diffProcessor: DiffProcessor;
	private scrollPending: boolean = false;
	private lastScrollTime: number = 0;
	private scrollThrottleMs: number = 250; // Increased throttle time for better performance
	private shouldAutoScroll: boolean = true; // Flag to control auto-scrolling
	private i18n: I18nManager;
	private guidedCardRenderer?: (message: ChatMessage, isReloaded: boolean) => void;

	constructor(
		plugin: LLMSiderPlugin,
		messageContainer: HTMLElement,
		messageRenderer: MessageRenderer,
		diffProcessor: DiffProcessor
	) {
		this.plugin = plugin;
		this.messageContainer = messageContainer;
		this.messageRenderer = messageRenderer;
		this.diffProcessor = diffProcessor;
		const i18nManager = plugin.getI18nManager();
		if (!i18nManager) {
			throw new Error('I18nManager not initialized');
		}
		this.i18n = i18nManager;
		
		// Set up user scroll detection
		this.setupScrollDetection();
	}

	/**
	 * Set guided card renderer callback (called from ChatView)
	 */
	setGuidedCardRenderer(renderer: (message: ChatMessage, isReloaded: boolean) => void) {
		this.guidedCardRenderer = renderer;
	}

	/**
	 * Set up scroll event listener to detect user scrolling
	 */
	private setupScrollDetection() {
		let lastScrollTop = this.messageContainer.scrollTop;
		
		this.messageContainer.addEventListener('scroll', () => {
			const currentScrollTop = this.messageContainer.scrollTop;
			const scrollHeight = this.messageContainer.scrollHeight;
			const clientHeight = this.messageContainer.clientHeight;
			const distanceFromBottom = scrollHeight - currentScrollTop - clientHeight;
			
			// Check if user scrolled up (not auto-scroll)
			if (currentScrollTop < lastScrollTop) {
				// User is scrolling up, disable auto-scroll
				this.shouldAutoScroll = false;
			}
			// Check if user is at or near the bottom (within 50px)
			else if (distanceFromBottom < 50) {
				// User has scrolled to bottom, re-enable auto-scroll
				this.shouldAutoScroll = true;
			}
			
			lastScrollTop = currentScrollTop;
		}, { passive: true });
	}

	/**
	 * Add message to UI with proper rendering and action buttons
	 */
	addMessageToUI(message: ChatMessage, currentSession?: ChatSession | null) {
		Logger.debug('[TRACE] addMessageToUI called for message:', message.id);
		
		// Remove welcome message when adding first message
		const existingWelcome = this.messageContainer.querySelector('.llmsider-welcome');
		if (existingWelcome) {
			existingWelcome.remove();
		}
		
		const messageEl = this.messageRenderer.renderMessage(this.messageContainer, message);
		
		// Dispatch event for guided question card rendering
		if (message.metadata?.isGuidedQuestion) {
			Logger.debug('[MessageManager] 🎯 Dispatching guided card render event for message:', message.id);
			Logger.debug('[MessageManager] Message metadata:', {
				isGuidedQuestion: message.metadata.isGuidedQuestion,
				requiresToolConfirmation: message.metadata.requiresToolConfirmation,
				hasToolCalls: !!message.metadata.suggestedToolCalls,
				hasOptions: !!message.metadata.guidedOptions,
				isStreaming: message.metadata.isStreaming
			});
			Logger.debug('[MessageManager] 🔍 Message content check before dispatch:', {
				contentLength: typeof message.content === 'string' ? message.content.length : 0,
				hasContent: !!message.content
			});
			window.dispatchEvent(new CustomEvent('llmsider-render-guided-card', {
				detail: { messageId: message.id, message }
			}));
		} else if (message.role === 'assistant') {
			Logger.debug('[MessageManager] ℹ️ Assistant message without isGuidedQuestion flag:', message.id, 'metadata:', message.metadata);
		}

		// Auto-refresh message actions after rendering to ensure buttons are visible
		if (message.role === 'assistant' && !message.metadata?.isWorking) {
			setTimeout(() => {
				// Ensure action buttons are present for the newly added message
				this.refreshMessageActions(currentSession || null);
			}, 200); // Increased delay to ensure DOM is fully rendered
		}

		// Check if this message has diff data that needs to be re-rendered
		// Only re-render if this is a previously saved message being loaded (not a new streaming message)
		if (message.metadata?.hasJSDiff && message.metadata?.diffResult &&
			message.metadata?.originalContent && message.metadata?.modifiedContent &&
			!message.metadata?.isWorking &&
			!(message.metadata as unknown)?.freshlyProcessed && // Don't re-render freshly processed messages
			this.diffProcessor) { // Ensure diff processor is available

			// Check if the message already has the correct diff rendering state applied
			const shouldRenderDiff = (message.metadata as unknown)?.diffRenderingEnabled !== undefined
				? (message.metadata as unknown)?.diffRenderingEnabled
				: false; // Diff rendering disabled by default (setting removed)

			// Logger.debug('Re-rendering saved diff for message:', message.id);

			// Re-render diff visualization after a brief delay to ensure DOM is ready
			setTimeout(() => {
				const contentEl = messageEl.querySelector('.llmsider-message-content');
				if (contentEl && message.metadata && this.diffProcessor) {
					contentEl.innerHTML = '';
					if (shouldRenderDiff) {
						this.diffProcessor.renderJSDiffVisualization(
							contentEl as HTMLElement,
							message.metadata.diffResult,
							message.metadata.originalContent!,
							message.metadata.modifiedContent!
						);
					} else {
						// Render as regular markdown
						this.messageRenderer.renderMarkdownContentPublic(contentEl as HTMLElement, message.metadata.modifiedContent!);
					}

					// Re-add action buttons after content re-rendering
					// Logger.debug('Re-adding action buttons after diff re-render for message:', message.id);
					this.messageRenderer.addMessageActions(messageEl, message);
				}
			}, 10);
		} else if ((message.metadata as unknown)?.freshlyProcessed) {
			// Logger.debug('Skipping re-render for freshly processed message:', message.id);
			// Clear the freshly processed flag after the first render
			setTimeout(() => {
				if (message.metadata) {
					delete (message.metadata as unknown).freshlyProcessed;
				}
			}, 1000);
		}
	}

	/**
	 * Add message to session and UI
	 */
	async addMessage(message: ChatMessage, currentSession: ChatSession | null) {
		// Add to current session
		if (currentSession) {
			currentSession.messages.push(message);
			await this.plugin.updateChatSession(currentSession.id, {
				messages: currentSession.messages
			});
		}

		// Add to UI
		this.addMessageToUI(message);
		this.scrollToBottom();
	}

	/**
	 * Render messages for current session
	 */
	renderMessages(currentSession: ChatSession | null) {
		// Set loading flag to prevent auto-search during initial session load
		const wasLoading = this.plugin.state.isLoadingSession;
		this.plugin.state.isLoadingSession = true;

		// Early return optimization
		if (!currentSession) {
			this.messageContainer.empty();
			this.showWelcomeMessage();
			this.plugin.state.isLoadingSession = wasLoading;
			return;
		}

		// If no messages, just show welcome without unnecessary clearing
		if (currentSession.messages.length === 0) {
			this.messageContainer.empty();
			this.showWelcomeMessage();
			this.plugin.state.isLoadingSession = wasLoading;
			return;
		}

		// Clear only when we have messages to render
		Logger.debug('[MessageManager] Clearing container and rendering', currentSession.messages.length, 'messages');
		this.messageContainer.empty();
		
		// Explicitly remove any welcome message that might exist
		const existingWelcome = this.messageContainer.querySelector('.llmsider-welcome');
		if (existingWelcome) {
			existingWelcome.remove();
		}

		// Filter messages first - exclude temporary tool execution messages
		const messagesToRender = currentSession.messages.filter(message => {
			// Skip temporary tool execution indicator messages
			if (message.metadata?.isToolDetection ||
				message.metadata?.isToolExecution ||
				message.metadata?.isToolExecutionResult) {
				// Logger.debug('Skipping temporary tool message on reload:', message.id, message.metadata);
				return false;
			}
			// Skip tool result messages (role: 'tool') - they should be shown in tool cards, not as separate messages
			if (message.role === 'tool') {
				// Logger.debug('Skipping tool result message on reload:', message.id);
				return false;
			}
			return true;
		});

		// Logger.debug('Rendering filtered messages:', {
		// 	totalMessages: currentSession!.messages.length,
		// 	filteredMessages: messagesToRender.length,
		// 	skippedMessages: currentSession!.messages.length - messagesToRender.length
		// });

		// Batch render messages for better performance
		messagesToRender.forEach((message, index) => {
			this.addMessageToUI(message, currentSession);
		});

		// Double-check: if we filtered all messages but session has messages,
		// don't show welcome message
		if (messagesToRender.length === 0 && currentSession.messages.length > 0) {
			// All messages were filtered out, but session has messages - don't show welcome
			const existingWelcome = this.messageContainer.querySelector('.llmsider-welcome');
			if (existingWelcome) {
				existingWelcome.remove();
			}
		}

		// Auto-refresh all message actions after rendering
		setTimeout(() => {
			this.refreshMessageActions(currentSession);
		}, 250); // Increased delay for batch rendering

		// Re-render guided cards immediately after messages are rendered (plugin reload fix)
		// Use direct callback instead of events to ensure it works during initialization
		if (currentSession && currentSession.messages && this.guidedCardRenderer) {
			Logger.debug('[RenderMessages] Checking for guided messages to re-render...');
			const guidedMessages = currentSession.messages.filter(m => m.metadata?.isGuidedQuestion);
			Logger.debug('[RenderMessages] Found ' + guidedMessages.length + ' guided messages');
			
			if (guidedMessages.length > 0) {
				// Use requestAnimationFrame to ensure DOM is ready
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						guidedMessages.forEach(message => {
							Logger.debug('[RenderMessages] Directly rendering guided card for:', message.id);
							this.guidedCardRenderer!(message, true); // isReloaded = true
						});
					});
				});
			}
		}

		// Scroll to bottom after rendering
		this.scrollToBottom();

		// Clear loading flag after rendering completes
		this.plugin.state.isLoadingSession = wasLoading;
	}

	/**
	 * Show welcome message when no chat history
	 */
	private showWelcomeMessage() {
		// Logger.debug('showWelcomeMessage - creating welcome message');

		const welcome = this.messageContainer.createDiv({ cls: 'llmsider-welcome' });
		// Logger.debug('showWelcomeMessage - welcome div created');

		// Sparkle icon container
		const iconContainer = welcome.createDiv({ cls: 'llmsider-welcome-icon' });
		iconContainer.innerHTML = '✨';

		// Main welcome text
		const welcomeText = welcome.createDiv({ cls: 'llmsider-welcome-text' });
		welcomeText.createEl('h1', { text: this.i18n.t('ui.welcomeTitle') });

		// Subtext
		const subtext = welcome.createDiv({ cls: 'llmsider-welcome-subtext' });
		subtext.textContent = this.i18n.t('ui.welcomeSubtitle');

		// Logger.debug('showWelcomeMessage - welcome content added');

		// Show error if no providers configured
		if (!this.plugin.hasConfiguredProviders()) {
			// Logger.debug('showWelcomeMessage - no providers available, showing warning');
			const warning = welcome.createDiv({ cls: 'llmsider-warning' });
			warning.createEl('p', {
				text: this.i18n.t('ui.noProvidersWarning')
			});
		}
	}

	/**
	 * Handle editing a message
	 */
	async handleEditMessage(messageId: string, message: ChatMessage | undefined, currentSession: ChatSession | null, inputElement: HTMLTextAreaElement): Promise<void> {
		try {
			// Find the message in current session first if not provided
			if (!currentSession) {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.noActiveSession') || 'No active session');
				return;
			}

			const messageIndex = currentSession.messages.findIndex(msg => msg.id === messageId);
			if (messageIndex === -1) {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.messageNotFound') || 'Message not found');
				return;
			}

			// Get the message if not provided
			const targetMessage = message || currentSession.messages[messageIndex];
			
			Logger.debug('Handling edit message:', { messageId, role: targetMessage.role });

			// Only allow editing user messages
			if (targetMessage.role !== 'user') {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.onlyUserMessagesEditable') || 'Only user messages can be edited');
				return;
			}

			// Extract text content from message
			const textContent = this.extractTextFromMessage(targetMessage);
			if (!textContent) {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.noTextContentToEdit') || 'No text content to edit');
				return;
			}

			// Remove the message and all subsequent messages from session
			const messagesToRemove = currentSession.messages.length - messageIndex;
			currentSession.messages.splice(messageIndex);

			Logger.debug('Removed messages from session:', {
				messageIndex,
				messagesToRemove,
				remainingMessages: currentSession.messages.length
			});

			// Reset FreeDeepseek lastMessageId based on remaining messages
			const provider = this.plugin.getActiveProvider();
			if (provider && 'setLastMessageId' in provider && typeof provider.setLastMessageId === 'function') {
				// Find the last assistant message's metadata to get response_message_id
				let lastMessageId: number | null = null;
				for (let i = currentSession.messages.length - 1; i >= 0; i--) {
					const msg = currentSession.messages[i];
					if (msg.role === 'assistant' && msg.metadata?.response_message_id) {
						lastMessageId = msg.metadata.response_message_id;
						break;
					}
				}
				provider.setLastMessageId(lastMessageId);
				Logger.debug('[MessageManager] Reset lastMessageId for edited message:', lastMessageId);
			}

			// Remove messages from UI
			this.removeMessagesFromUI(messageIndex);

			// Set the input content to the edited message text
			inputElement.value = textContent;

			// Focus and set cursor at the end
			inputElement.focus();
			inputElement.setSelectionRange(textContent.length, textContent.length);

			// Update session in storage
			await this.plugin.updateChatSession(currentSession.id, {
				messages: currentSession.messages
			});

			Logger.debug('Message editing completed successfully');

		} catch (error) {
			Logger.error('Failed to edit message:', error);
			new Notice(this.plugin.getI18nManager()?.t('notifications.ui.failedToEditMessage') || 'Failed to edit message');
		}
	}

	/**
	 * Extract text content from a message (handles both string and multimodal content)
	 */
	private extractTextFromMessage(message: ChatMessage): string {
		if (typeof message.content === 'string') {
			return message.content;
		}

		// Handle multimodal content
		if (Array.isArray(message.content)) {
			return message.content
				.filter(item => item.type === 'text')
				.map(item => (item as unknown).text)
				.join('\n');
		}

		return '';
	}

	/**
	 * Remove messages from UI starting from the given index
	 */
	private removeMessagesFromUI(startIndex: number): void {
		try {
			const messageElements = this.messageContainer.querySelectorAll('.llmsider-message');
			let totalElementsRemoved = 0;

			// Remove messages from the UI starting from startIndex
			for (let i = startIndex; i < messageElements.length; i++) {
				const messageEl = messageElements[i] as HTMLElement;

				// Clean up any working intervals
				if ((messageEl as unknown).workingInterval) {
					clearInterval((messageEl as unknown).workingInterval);
				}

				// Clean up markdown components to prevent memory leaks
				const contentEl = messageEl.querySelector('.llmsider-message-content');
				if (contentEl) {
					const component = (contentEl as any)._llmsiderMarkdownComponent;
					if (component) {
						component.unload();
						delete (contentEl as any)._llmsiderMarkdownComponent;
					}
				}

				// Also remove any following sibling elements created by guided mode:
				// - Tool card elements (llmsider-tool-card-message)
				// - Guided options sections (llmsider-guided-card-container, llmsider-guided-options-section)
				// - Tool indicators (llmsider-plan-execute-tool-indicator)
				let nextEl = messageEl.nextElementSibling;
				while (nextEl) {
					if (nextEl.classList.contains('llmsider-tool-card-message') ||
					    nextEl.classList.contains('llmsider-guided-card-container') ||
					    nextEl.classList.contains('llmsider-guided-options-section') ||
					    nextEl.classList.contains('llmsider-plan-execute-tool-indicator') ||
					    nextEl.classList.contains('llmsider-vector-results-summary')) {
						const elementToRemove = nextEl;
						nextEl = nextEl.nextElementSibling;
						elementToRemove.remove();
						totalElementsRemoved++;
					} else {
						// Stop when we hit the next message or non-guided element
						break;
					}
				}

				messageEl.remove();
				totalElementsRemoved++;
			}

			Logger.debug('Removed message elements from UI:', {
				startIndex,
				totalElementsRemoved: totalElementsRemoved
			});

		} catch (error) {
			Logger.error('Failed to remove messages from UI:', error);
		}
	}

	/**
	 * Scroll message container to bottom
	 * Uses time-based and requestAnimationFrame throttling to avoid excessive scrolling during streaming
	 * Respects user's scroll position - only auto-scrolls when user is at bottom
	 */
	scrollToBottom() {
		// Don't auto-scroll if user has scrolled up to view history
		if (!this.shouldAutoScroll) {
			return;
		}

		// Time-based throttling: skip if called too soon
		const now = Date.now();
		if (now - this.lastScrollTime < this.scrollThrottleMs) {
			return;
		}
		
		// Animation frame throttling: skip if already pending
		if (this.scrollPending) {
			return;
		}
		
		this.lastScrollTime = now;
		this.scrollPending = true;
		
		requestAnimationFrame(() => {
			try {
				if (this.messageContainer) {
					// Use instant scroll during streaming for better performance
					this.messageContainer.scrollTo({
						top: this.messageContainer.scrollHeight,
						behavior: 'auto'
					});
				}
			} catch (error) {
				Logger.error('Error during scroll:', error);
			} finally {
				this.scrollPending = false;
			}
		});
	}

	/**
	 * Refresh action buttons for all existing messages
	 * This method updates already rendered messages to show the latest button configuration
	 */
	refreshMessageActions(currentSession: ChatSession | null): void {
		if (!this.messageContainer || !currentSession) {
			return;
		}

		// Find all assistant message elements
		const messageElements = this.messageContainer.querySelectorAll('.llmsider-message.llmsider-assistant');

		messageElements.forEach((messageEl: Element, index: number) => {
			const messageId = (messageEl as HTMLElement).dataset.messageId;

			if (!messageId) {
				return;
			}

			// Find the corresponding message data
			const message = currentSession?.messages.find(msg => msg.id === messageId);

			if (!message || message.metadata?.isWorking) {
				return;
			}

			// Add action buttons (this will remove existing ones and add fresh ones)
			this.messageRenderer.addMessageActions(messageEl as HTMLElement, message);
		});
	}

	/**
	 * Refresh diff rendering for all messages that have diff data
	 * This method ensures diff visualizations are properly restored after plugin reload
	 */
	refreshDiffRendering(currentSession: ChatSession | null): void {
		Logger.debug('[LLMSider DEBUG] [TRACE] refreshDiffRendering called');
		Logger.debug('Refreshing diff rendering for all messages');
		Logger.debug('[RefreshDiff] Called with session:', currentSession?.id, 'Messages:', currentSession?.messages?.length);

		if (!this.messageContainer || !currentSession) {
			Logger.debug('[RefreshDiff] Skipped - messageContainer:', !!this.messageContainer, 'currentSession:', !!currentSession);
			Logger.debug('Refresh skipped - missing container or session');
			return;
		}

		// Find all messages with diff data that need re-rendering
		currentSession.messages.forEach((message) => {
			if (message.metadata?.hasJSDiff && message.metadata?.diffResult &&
				message.metadata?.originalContent && message.metadata?.modifiedContent &&
				!message.metadata?.isWorking) {

				Logger.debug('Re-rendering diff for message:', message.id);

				// Find the message element
				const messageEl = this.messageRenderer.findMessageElement(message.id);
				if (messageEl) {
					const contentEl = messageEl.querySelector('.llmsider-message-content');
					if (contentEl) {
						// Determine if diff should be rendered
						const shouldRenderDiff = (message.metadata as unknown)?.diffRenderingEnabled !== undefined
							? (message.metadata as unknown)?.diffRenderingEnabled
							: false; // Diff rendering disabled by default (setting removed)

						// Clear and re-render content
						contentEl.innerHTML = '';

						if (shouldRenderDiff && message.metadata.diffResult) {
							// Render with diff visualization
							this.diffProcessor.renderJSDiffVisualization(
								contentEl as HTMLElement,
								message.metadata.diffResult,
								message.metadata.originalContent,
								message.metadata.modifiedContent
							);
						} else {
							// Render as regular markdown
							this.messageRenderer.renderMarkdownContentPublic(
								contentEl as HTMLElement,
								message.metadata.modifiedContent
							);
						}
					}
				}
			}
		});

		Logger.debug('Completed refreshing diff rendering');

		// Re-render guided cards after plugin reload
		Logger.debug('[RefreshRendering] Checking for guided messages after reload...');
		const guidedMessages = currentSession.messages.filter(m => m.metadata?.isGuidedQuestion);
		Logger.debug('[RefreshRendering] Found ' + guidedMessages.length + ' guided messages to re-render');

		guidedMessages.forEach(message => {
			Logger.debug('[RefreshRendering] Dispatching event for message: ' + message.id);
			window.dispatchEvent(new CustomEvent('llmsider-render-guided-card', {
				detail: { messageId: message.id, message }
			}));
		});
	}

	/**
	 * Process Action mode response for diff rendering
	 */
	async processActionModeResponse(assistantMessage: ChatMessage, accumulatedContent: string, currentMode: string, contextManager: unknown): Promise<void> {
		try {
			if (currentMode === 'action') {
				Logger.debug('Processing Action mode response for diff');

				// Check if we have selected text context first (priority)
				const selectedTextContexts = contextManager.getSelectedTextContexts();
				const noteContexts = contextManager.getCurrentNoteContext();

				let originalContent = '';
				let isSelectedTextMode = false;
				let hasMultipleReferences = false;

				// Determine if we have multiple references (files OR selected texts)
				const totalReferences = noteContexts.length + selectedTextContexts.length;
				if (totalReferences > 1) {
					hasMultipleReferences = true;
					Logger.debug('Multiple references detected:', {
						noteContexts: noteContexts.length,
						selectedTextContexts: selectedTextContexts.length,
						total: totalReferences
					});
				}

				// Determine original content based on priority
				if (selectedTextContexts.length === 1) {
					// Single selected text - use it for diff
					originalContent = selectedTextContexts[0].text.trim();
					isSelectedTextMode = true;
					Logger.debug('Using single selected text context for diff:', {
						selectedTextLength: originalContent.length,
						selectedTextPreview: selectedTextContexts[0].preview
					});
				} else if (selectedTextContexts.length > 1) {
					// Multiple selected texts - disable diff
					originalContent = '';
					isSelectedTextMode = true;
					Logger.debug('Multiple selected texts detected, diff functionality disabled');
				} else if (noteContexts.length === 1) {
					// Single file reference - use it for diff
					originalContent = noteContexts[0]?.content || '';
					isSelectedTextMode = false;
					Logger.debug('Using single note context for diff');
				} else if (noteContexts.length > 1) {
					// Multiple file references - disable diff
					originalContent = '';
					Logger.debug('Multiple file references detected, diff functionality disabled');
				}

				const modifiedContent = accumulatedContent.trim();

				if (originalContent && modifiedContent && originalContent !== modifiedContent) {
					Logger.debug('Generating diff visualization');

					// Determine diff rendering state for this message
					const shouldRenderDiff = this.getDiffRenderingStateForNewMessage();

					// Generate diff using DiffProcessor
					const diffResult = this.diffProcessor.generateJSDiff(originalContent, modifiedContent);

					// Update message metadata with selected text info and diff rendering state
					assistantMessage.metadata = {
						...assistantMessage.metadata,
						hasJSDiff: true,
						originalContent: originalContent,
						modifiedContent: modifiedContent,
						diffResult: diffResult,
						hasMultipleReferences: hasMultipleReferences, // Add flag for multiple references
						...(isSelectedTextMode && selectedTextContexts.length === 1 && {
							isSelectedTextMode: isSelectedTextMode,
							selectedTextContext: selectedTextContexts[0]
						})
					};

					// Store diff rendering state separately for type safety
					(assistantMessage.metadata as unknown).diffRenderingEnabled = shouldRenderDiff;
					// Mark as newly processed to avoid duplicate rendering
					(assistantMessage.metadata as unknown).freshlyProcessed = true;

					// Re-render based on the determined diff state
					setTimeout(() => {
						const messageEl = this.messageRenderer.findMessageElement(assistantMessage.id);
						if (messageEl) {
							const contentEl = messageEl.querySelector('.llmsider-message-content');
							if (contentEl) {
								contentEl.innerHTML = '';
								if (shouldRenderDiff) {
									// Render with diff visualization
									this.diffProcessor.renderJSDiffVisualization(
										contentEl as HTMLElement,
										diffResult,
										originalContent,
										modifiedContent,
										isSelectedTextMode && selectedTextContexts.length === 1 ? selectedTextContexts[0] : null
									);
								} else {
									// Render as regular markdown
									this.messageRenderer.renderMarkdownContentPublic(contentEl as HTMLElement, modifiedContent);
								}
							}
						}
					}, 10);
				} else if (hasMultipleReferences) {
					// Multiple references with no diff - just mark the metadata
					assistantMessage.metadata = {
						...assistantMessage.metadata,
						hasMultipleReferences: true
					};
					Logger.debug('Multiple references mode, diff/apply disabled');
				}
			}
		} catch (error) {
			Logger.error('Error processing Action mode response:', error);
		}
	}

	/**
	 * Determine diff rendering state for new message based on inheritance rules
	 */
	private getDiffRenderingStateForNewMessage(): boolean {
		// Rule 1: Check if there are previous assistant messages in current session
		const currentSession = this.plugin.settings.chatSessions[0]; // Assuming first session is current
		if (currentSession && currentSession.messages.length > 0) {
			// Find the most recent assistant message with diff capability
			for (let i = currentSession.messages.length - 1; i >= 0; i--) {
				const msg = currentSession.messages[i];
				if (msg.role === 'assistant' && msg.metadata?.hasJSDiff) {
					const inheritedState = (msg.metadata as unknown)?.diffRenderingEnabled;
					if (inheritedState !== undefined) {
						Logger.debug('Inheriting diff state from previous message:', inheritedState);
						return inheritedState;
					}
				}
			}
		}

		// Rule 2: If no previous messages, use global setting from previous sessions
		// Check the most recent message across all sessions
		if (this.plugin.settings.chatSessions && this.plugin.settings.chatSessions.length > 0) {
			for (const session of this.plugin.settings.chatSessions) {
				for (let i = session.messages.length - 1; i >= 0; i--) {
					const msg = session.messages[i];
					if (msg.role === 'assistant' && msg.metadata?.hasJSDiff) {
						const inheritedState = (msg.metadata as unknown)?.diffRenderingEnabled;
						if (inheritedState !== undefined) {
							Logger.debug('Inheriting diff state from previous session:', inheritedState);
							return inheritedState;
						}
					}
				}
			}
		}

		// Rule 3: Fallback to global setting (default behavior)
		Logger.debug('Using global diff setting as fallback: false (setting removed)');
		return false; // Diff rendering disabled by default (setting removed)
	}

	/**
	 * Update or add streaming message (for Final Answer streaming)
	 */
	updateStreamingMessage(message: ChatMessage, currentSession?: ChatSession | null): void {

		// Check if message element already exists
		const existingElement = this.messageRenderer.findMessageElement(message.id);

		if (existingElement) {
			// Update existing message content
			// Pass isStreaming flag to disable mermaid placeholders during streaming
			const isStreaming = message.metadata?.isStreaming ?? false;
			this.messageRenderer.updateMessageContent(message.id, message.content as string, isStreaming, message);
		} else {
			// Create new message element
			this.addMessageToUI(message, currentSession);
		}

		this.scrollToBottom();
	}
}
