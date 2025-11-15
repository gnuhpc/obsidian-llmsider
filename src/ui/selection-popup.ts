import { App, Notice, MarkdownView } from 'obsidian';
import { Logger } from './../utils/logger';
import LLMSiderPlugin from '../main';

/**
 * Selection popup button manager
 * Shows a floating "Add to Context" button when text is selected
 */
export class SelectionPopup {
	private app: App;
	private plugin: LLMSiderPlugin;
	private popupEl: HTMLElement | null = null;
	private hideTimeout: number | null = null;
	private isMouseOverPopup: boolean = false;

	constructor(app: App, plugin: LLMSiderPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.setupEventListeners();
	}

	/**
	 * Setup event listeners for text selection
	 */
	private setupEventListeners(): void {
		// Listen to mouseup for selection changes
		document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
		
		// Listen to selectionchange as backup
		document.addEventListener('selectionchange', () => this.handleSelectionChange());
		
		// Clean up on page unload
		window.addEventListener('beforeunload', () => this.destroy());
	}

	/**
	 * Handle mouse up event
	 */
	private handleMouseUp(event: MouseEvent): void {
		// Small delay to ensure selection is complete
		setTimeout(() => {
			this.checkSelection(event.clientX, event.clientY);
		}, 10);
	}

	/**
	 * Handle selection change event
	 */
	private handleSelectionChange(): void {
		// Don't show on selection change if popup is already visible
		// This prevents the popup from jumping around while text is being selected
		if (this.popupEl) {
			return;
		}
	}

	/**
	 * Check if there's selected text and show popup
	 */
	private checkSelection(mouseX: number, mouseY: number): void {
		const selection = window.getSelection();
		
		if (!selection || selection.isCollapsed || !selection.toString().trim()) {
			// No selection, hide popup
			this.hidePopup();
			return;
		}

		const selectedText = selection.toString().trim();
		
		// Only show for meaningful selections (more than 3 characters)
		if (selectedText.length < 3) {
			this.hidePopup();
			return;
		}

		// IMPORTANT: Only show popup in editor interface (MarkdownView)
		// Don't show in chat view or other non-editor interfaces
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			// Not in editor view, don't show popup
			this.hidePopup();
			return;
		}

		// Get selection bounding rect
		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();

		// Show popup near the selection
		this.showPopup(rect, selectedText);
	}

	/**
	 * Show the popup button
	 */
	private showPopup(rect: DOMRect, selectedText: string): void {
		// Check if any buttons are enabled before creating popup
		if (!this.plugin.settings.selectionPopup.showAddToContext && 
		    !this.plugin.settings.inlineQuickChat.showQuickChatButton) {
			// No buttons enabled, don't show popup
			return;
		}

		// Remove existing popup
		this.hidePopup(true);

		// Create popup element
		this.popupEl = document.createElement('div');
		this.popupEl.className = 'llmsider-selection-popup';
		
		// Create button container
		const buttonContainer = document.createElement('div');
		buttonContainer.className = 'llmsider-selection-popup-buttons';
		this.popupEl.appendChild(buttonContainer);

		// Add to Context button (icon only) - only if enabled
		if (this.plugin.settings.selectionPopup.showAddToContext) {
			const addContextBtn = document.createElement('button');
			addContextBtn.className = 'llmsider-selection-popup-btn';
			addContextBtn.setAttribute('aria-label', 'Add to Context');

			// Add icon (SVG - plus icon)
			addContextBtn.innerHTML = `
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 5v14M5 12h14"/>
				</svg>
			`;

			// Handle click for Add to Context
			addContextBtn.addEventListener('click', async (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				await this.handleAddToContext(selectedText);
			});

			buttonContainer.appendChild(addContextBtn);
		}

		// Quick Chat button (icon only) - only if enabled
		if (this.plugin.settings.inlineQuickChat.showQuickChatButton) {
			const quickChatBtn = document.createElement('button');
			quickChatBtn.className = 'llmsider-selection-popup-btn llmsider-selection-popup-btn-quick-chat';
			quickChatBtn.setAttribute('aria-label', this.plugin.i18n.t('quickChatUI.buttonLabel'));

			// Add icon (SVG - chat bubble icon)
			quickChatBtn.innerHTML = `
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
				</svg>
			`;

			// Handle click for Quick Chat
			quickChatBtn.addEventListener('click', async (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				await this.handleQuickChat(selectedText);
			});

			buttonContainer.appendChild(quickChatBtn);
		}

		// If no buttons are enabled, don't show popup
		if (buttonContainer.children.length === 0) {
			return;
		}

		// Position the popup
		// Place it above the selection by default, or below if not enough space
		const popupHeight = 75; // Approximate height for two circular buttons
		const spacing = 8; // Space between selection and popup
		
		let top = rect.top + window.scrollY - popupHeight - spacing;
		
		// If not enough space above, place below
		if (rect.top < popupHeight + spacing) {
			top = rect.bottom + window.scrollY + spacing;
		}
		
		// Center horizontally relative to selection
		const left = rect.left + window.scrollX + (rect.width / 2);
		
		this.popupEl.style.position = 'absolute';
		this.popupEl.style.top = `${top}px`;
		this.popupEl.style.left = `${left}px`;
		this.popupEl.style.transform = 'translateX(-50%)';
		this.popupEl.style.zIndex = '1000';

		// Handle mouse enter/leave for popup
		this.popupEl.addEventListener('mouseenter', () => {
			this.isMouseOverPopup = true;
			if (this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}
		});

		this.popupEl.addEventListener('mouseleave', () => {
			this.isMouseOverPopup = false;
			this.scheduleHide();
		});

		// Add to document
		document.body.appendChild(this.popupEl);

		// Schedule auto-hide
		this.scheduleHide();

		Logger.debug('Popup shown at:', { top, left, text: selectedText.substring(0, 50) });
	}

	/**
	 * Schedule popup hide after delay
	 */
	private scheduleHide(): void {
		// Clear existing timeout
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
		}

		// Hide after 3 seconds if not hovering
		this.hideTimeout = window.setTimeout(() => {
			if (!this.isMouseOverPopup) {
				this.hidePopup();
			}
		}, 3000);
	}

	/**
	 * Hide the popup
	 */
	private hidePopup(immediate: boolean = false): void {
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}

		if (this.popupEl) {
			if (immediate) {
				this.popupEl.remove();
				this.popupEl = null;
			} else {
				// Fade out animation
				this.popupEl.addClass('llmsider-selection-popup-hiding');
				setTimeout(() => {
					if (this.popupEl) {
						this.popupEl.remove();
						this.popupEl = null;
					}
				}, 200);
			}
		}

		this.isMouseOverPopup = false;
	}

	/**
	 * Handle add to context action
	 */
	private async handleAddToContext(selectedText: string): Promise<void> {
		try {
			// Get chat view and its context manager
			const chatView = this.plugin.getChatView();
			if (!chatView) {
				new Notice('Please open LLMSider chat first');
				return;
			}

			// Use the context manager from the chat view
			const contextManager = (chatView as any).contextManager;
			if (!contextManager) {
				new Notice('Context manager not available');
				return;
			}

			// Add text to context
			const result = await contextManager.addTextToContext(selectedText);
			
			if (result.success) {
				const i18n = this.plugin.getI18nManager();
				const message = i18n?.t('ui.addedSelectionToContext', { length: selectedText.length }) || `✓ Added to context (${selectedText.length} chars)`;
				new Notice(message);
				
				// Update context display in chat view
				if ((chatView as any).updateContextDisplay) {
					(chatView as any).updateContextDisplay();
				}
				
				// Optionally activate the chat view
				// this.plugin.activateChatView();
			} else {
				new Notice('Failed to add text: ' + result.message);
			}

			// Hide popup after action
			this.hidePopup(true);

		} catch (error) {
			Logger.error('Error adding text to context:', error);
			new Notice('Error adding text to context');
		}
	}

	/**
	 * Handle quick chat action
	 */
	private async handleQuickChat(selectedText: string): Promise<void> {
		try {
			// Hide popup first
			this.hidePopup(true);

			// Check if Quick Chat feature is enabled
			if (!this.plugin.settings.inlineQuickChat.enabled) {
				// If Quick Chat is not enabled, open the chat view with the selected text as context
				const chatView = this.plugin.getChatView();
				if (!chatView) {
					new Notice('Please open LLMSider chat first');
					return;
				}

				// Add selected text to context
				const contextManager = (chatView as any).contextManager;
				if (contextManager) {
					await contextManager.addTextToContext(selectedText);
					if ((chatView as any).updateContextDisplay) {
						(chatView as any).updateContextDisplay();
					}
				}

				// Activate the chat view
				this.plugin.activateChatView();
				new Notice('Selected text added to chat context');
				return;
			}

			// Get the inline quick chat handler
			const quickChatHandler = this.plugin.inlineQuickChatHandler;
			if (!quickChatHandler) {
				new Notice('Quick Chat is not initialized');
				return;
			}

			// Get the active markdown view and editor
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				// If no active editor, fall back to opening chat view
				const chatView = this.plugin.getChatView();
				if (chatView) {
					const contextManager = (chatView as any).contextManager;
					if (contextManager) {
						await contextManager.addTextToContext(selectedText);
						if ((chatView as any).updateContextDisplay) {
							(chatView as any).updateContextDisplay();
						}
					}
					this.plugin.activateChatView();
					new Notice('Selected text added to chat context');
				} else {
					new Notice('Please open LLMSider chat first');
				}
				return;
			}

			// Get the CodeMirror editor view
			const editorView = (activeView.editor as any).cm;
			if (!editorView) {
				new Notice('Editor not ready');
				return;
			}

			// Show the quick chat widget
			quickChatHandler.show(editorView);

			Logger.debug('Quick Chat opened with selected text:', selectedText.substring(0, 50));

		} catch (error) {
			Logger.error('Error opening Quick Chat:', error);
			new Notice('Error opening Quick Chat');
		}
	}

	/**
	 * Clean up event listeners and DOM elements
	 */
	destroy(): void {
		this.hidePopup(true);
		
		// Note: In a real plugin, we'd want to properly remove event listeners
		// For now, they'll be cleaned up when the page unloads
	}
}
