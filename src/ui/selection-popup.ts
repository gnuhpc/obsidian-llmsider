import { App, Notice, MarkdownView, TFile, requestUrl } from 'obsidian';
import { Logger } from './../utils/logger';
import LLMSiderPlugin from '../main';

const SELECTION_DEBUG_ENABLED = false;
const selectionDebug = (...args: Parameters<typeof Logger.debug>) => {
	if (!SELECTION_DEBUG_ENABLED) return;
	Logger.debug(...args);
};

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string | undefined): string | null {
	if (!url || typeof url !== 'string' || url.trim() === '') {
		return null;
	}

	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?:[?&#]|$)/,
		/^([a-zA-Z0-9_-]{11})$/ // Direct video ID
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) {
			return match[1];
		}
	}

	return null;
}

/**
 * Parse XML subtitle format to extract text segments
 */
function parseSubtitleXml(xmlContent: string): Array<{ text: string; start?: number; duration?: number }> {
	const segments: Array<{ text: string; start?: number; duration?: number }> = [];

	const textPattern = /<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>(.*?)<\/text>/g;
	let match;

	while ((match = textPattern.exec(xmlContent)) !== null) {
		const start = parseFloat(match[1]);
		const duration = parseFloat(match[2]);
		let text = match[3];

		text = text
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/<[^>]*>/g, '')
			.trim();

		if (text) {
			segments.push({ text, start, duration });
		}
	}

	return segments;
}

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
	private selectionChangeDebounce: number | null = null;
	private lastSelectionText = '';
	private lastAutoReferenceText = '';
	private suppressSelectionClickUntil = 0;
	private mouseDownX = 0;
	private mouseDownY = 0;

	// Bound event handlers for proper cleanup
	private boundHandleMouseDown: (e: MouseEvent) => void;
	private boundHandleMouseUp: (e: MouseEvent) => void;
	private boundHandleClickCapture: (e: MouseEvent) => void;
	private boundHandleSelectionChange: () => void;
	private boundHandleBeforeUnload: () => void;

	constructor(app: App, plugin: LLMSiderPlugin) {
		this.app = app;
		this.plugin = plugin;

		// Bind event handlers
		this.boundHandleMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
		this.boundHandleMouseUp = (e: MouseEvent) => this.handleMouseUp(e);
		this.boundHandleClickCapture = (e: MouseEvent) => this.handleClickCapture(e);
		this.boundHandleSelectionChange = () => this.handleSelectionChange();
		this.boundHandleBeforeUnload = () => this.destroy();

		this.setupEventListeners();
	}

	/**
	 * Setup event listeners for text selection
	 */
	private setupEventListeners(): void {
		// Remove any existing listeners first
		this.removeEventListeners();

		document.addEventListener('mousedown', this.boundHandleMouseDown);
		// Listen to mouseup for selection changes
		document.addEventListener('mouseup', this.boundHandleMouseUp);
		// Intercept the synthetic click that can follow drag-selection in reading view.
		document.addEventListener('click', this.boundHandleClickCapture, true);

		// Listen to selectionchange as backup
		document.addEventListener('selectionchange', this.boundHandleSelectionChange);

		// Clean up on page unload
		window.addEventListener('beforeunload', this.boundHandleBeforeUnload);
	}

	/**
	 * Remove event listeners
	 */
	private removeEventListeners(): void {
		document.removeEventListener('mousedown', this.boundHandleMouseDown);
		document.removeEventListener('mouseup', this.boundHandleMouseUp);
		document.removeEventListener('click', this.boundHandleClickCapture, true);
		document.removeEventListener('selectionchange', this.boundHandleSelectionChange);
		window.removeEventListener('beforeunload', this.boundHandleBeforeUnload);
	}

	/**
	 * Track the drag start point so we can distinguish a real selection drag from a normal click.
	 */
	private handleMouseDown(event: MouseEvent): void {
		this.mouseDownX = event.clientX;
		this.mouseDownY = event.clientY;
	}

	/**
	 * Handle mouse up event
	 */
	private handleMouseUp(event: MouseEvent): void {
		// Small delay to ensure selection is complete
		setTimeout(() => {
			this.updateSelectionClickGuard(event);
			void this.checkSelection(event.clientX, event.clientY);
			// Mouseup is the most reliable trigger for web viewer selection updates.
			void this.processSelectionChange();
		}, 10);
	}

	private updateSelectionClickGuard(event: MouseEvent): void {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const isReadingView = activeView?.getMode() === 'preview';
		const selection = window.getSelection();
		const selectedText = selection?.toString().trim() || '';
		const dragDistance = Math.hypot(
			event.clientX - this.mouseDownX,
			event.clientY - this.mouseDownY
		);

		if (isReadingView && selectedText && !selection?.isCollapsed && dragDistance >= 4) {
			this.suppressSelectionClickUntil = Date.now() + 250;
			return;
		}

		this.suppressSelectionClickUntil = 0;
	}

	private handleClickCapture(event: MouseEvent): void {
		if (Date.now() > this.suppressSelectionClickUntil) {
			return;
		}

		const target = event.target as HTMLElement | null;
		if (!target || target.closest('.llmsider-selection-popup')) {
			return;
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || activeView.getMode() !== 'preview') {
			return;
		}

		const selection = window.getSelection();
		const hasSelection = !!selection && !selection.isCollapsed && !!selection.toString().trim();
		const isInRenderedMarkdown = !!target.closest('.markdown-reading-view, .markdown-preview-view, .markdown-rendered');

		if (!hasSelection || !isInRenderedMarkdown) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		this.suppressSelectionClickUntil = 0;
		selectionDebug('[SelectionPopup] Suppressed click after drag selection in reading view');
	}

	/**
	 * Handle selection change event
	 */
	private handleSelectionChange(): void {
		const selection = window.getSelection();
		// selectionDebug('[SelectionPopup] handleSelectionChange trigger', {
		// 	rangeCount: selection?.rangeCount ?? 0,
		// 	isCollapsed: selection?.isCollapsed ?? true,
		// 	selectedLength: selection?.toString().trim().length ?? 0,
		// 	keepSelectionClass: document.body.classList.contains('llmsider-chat-input-focused')
		// });
		if (this.selectionChangeDebounce !== null) {
			window.clearTimeout(this.selectionChangeDebounce);
		}

		this.selectionChangeDebounce = window.setTimeout(() => {
			this.processSelectionChange();
		}, 100);
	}

	private async processSelectionChange(): Promise<void> {
		const selectionState = await this.resolveActiveSelection();
		const selectedText = selectionState.text;
		const hasSelection = !!selectedText;
		selectionDebug('[SelectionPopup] processSelectionChange', {
			hasSelection,
			selectedLength: selectedText.length,
			autoReference: this.isAutoReferenceEnabled(),
			quickChatEnabled: this.plugin.settings.inlineQuickChat.enabled,
			showAddToContext: this.plugin.settings.selectionPopup.showAddToContext
		});

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const activeLeaf = this.app.workspace.activeLeaf;
		selectionDebug('[SelectionPopup] active view snapshot', {
			hasActiveMarkdownView: !!activeView,
			activeLeafType: activeLeaf?.view?.getViewType?.() ?? null,
			keepSelectionClass: document.body.classList.contains('llmsider-chat-input-focused')
		});
		let isInWebViewer = false;
		if (activeLeaf?.view?.contentEl) {
			const contentEl = activeLeaf.view.contentEl;
			const webview = contentEl.querySelector('webview');
			if (webview) {
				isInWebViewer = true;
			} else {
				const iframes = contentEl.querySelectorAll('iframe');
				for (const iframe of Array.from(iframes)) {
					const src = iframe.getAttribute('src');
					if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
						isInWebViewer = true;
						break;
					}
				}
			}
		}

		if (!activeView && !isInWebViewer) {
			selectionDebug('[SelectionPopup] No active markdown view or webviewer; skip popup');
			return;
		}

		if (!hasSelection) {
			selectionDebug('[SelectionPopup] no selection branch', {
				hadLastSelectionText: !!this.lastSelectionText,
				lastSelectionLength: this.lastSelectionText.length,
				lastAutoReferenceLength: this.lastAutoReferenceText.length
			});
			if (this.lastSelectionText) {
				this.lastSelectionText = '';
				this.lastAutoReferenceText = '';
				this.hidePopup();
				if (this.isAutoReferenceEnabled()) {
					await this.switchToCurrentNoteContext();
				}
			}
			return;
		}


		this.lastSelectionText = selectedText;

		if (!this.isAutoReferenceEnabled()) {
			return;
		}

		if (selectedText.length < 3) {
			selectionDebug('[SelectionPopup] Selection too short for auto-reference');
			return;
		}

		if (selectedText === this.lastAutoReferenceText) {
			return;
		}

		this.lastAutoReferenceText = selectedText;
		await this.handleAddToContext(selectedText, true, false);
	}

	/**
	 * Check if there's selected text and show popup
	 */
	private async checkSelection(mouseX: number, mouseY: number): Promise<void> {
		const selectionState = await this.resolveActiveSelection();
		const selection = selectionState.selection;
		const selectedText = selectionState.text;
		const isFromWebViewer = selectionState.isFromWebViewer;

		if (!selectedText) {
			// No selection found anywhere
			this.hidePopup();
			return;
		}


		// Only show for meaningful selections (more than 3 characters)
		if (selectedText.length < 3) {
			this.hidePopup();
			return;
		}

		// Check if we're in a valid context (MarkdownView or Web Viewer)
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const activeLeaf = this.app.workspace.activeLeaf;

		// Check if we're in a web viewer (check for webview or iframe elements)
		let isInWebViewer = false;
		if (activeLeaf?.view?.contentEl) {
			const contentEl = activeLeaf.view.contentEl;
			// Check for webview element (Obsidian's web viewer uses webview tag)
			const webview = contentEl.querySelector('webview');
			if (webview) {
				const webviewSrc = webview.getAttribute('src');
				isInWebViewer = true;
			} else {
				// Also check for iframe elements that might contain web content
				const iframes = contentEl.querySelectorAll('iframe');
				for (const iframe of Array.from(iframes)) {
					const src = iframe.getAttribute('src');
					if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
						isInWebViewer = true;
						break;
					}
				}
			}
		}


		// Only show popup in editor view or web viewer
		if (!activeView && !isInWebViewer) {
			// Not in editor view or web viewer, don't show popup
			this.hidePopup();
			return;
		}


		// Anchor the popup to the selection bounds so it appears near the
		// selected text instead of the mouse cursor.
		const rect = isFromWebViewer
			? new DOMRect(mouseX, mouseY, 0, 0)
			: this.getSelectionAnchorRect(selection, mouseX, mouseY);

		// Show popup near the selection
		this.showPopup(rect, selectedText, isFromWebViewer);
	}

	private getSelectionAnchorRect(
		selection: Selection | null,
		fallbackX: number,
		fallbackY: number
	): DOMRect {
		try {
			if (selection && selection.rangeCount > 0) {
				const range = selection.getRangeAt(0);
				const rects = Array.from(range.getClientRects());

				// Anchor to the visually last line's right edge so direction of selection
				// (top->bottom or bottom->top) does not change popup placement.
				if (rects.length > 0) {
					const epsilon = 1;
					let anchorRect = rects[0];

					for (const candidate of rects) {
						const isLowerLine = candidate.bottom > anchorRect.bottom + epsilon;
						const isSameLine = Math.abs(candidate.bottom - anchorRect.bottom) <= epsilon;
						const isFurtherRight = candidate.right > anchorRect.right;

						if (isLowerLine || (isSameLine && isFurtherRight)) {
							anchorRect = candidate;
						}
					}

					if (anchorRect.width > 0 || anchorRect.height > 0) {
						return anchorRect;
					}
				}

				const rect = range.getBoundingClientRect();
				if (rect.width > 0 || rect.height > 0) {
					return rect;
				}
			}
		} catch (error) {
			selectionDebug('[SelectionPopup] Failed to read selection bounds:', error);
		}

		return new DOMRect(fallbackX, fallbackY, 0, 0);
	}

	private isAutoReferenceEnabled(): boolean {
		return this.plugin.settings.contextSettings?.autoReference ?? true;
	}

	private async switchToCurrentNoteContext(): Promise<void> {
		const chatView = this.plugin.getChatView();
		if (!chatView) {
			return;
		}

		const contextManager = (chatView as unknown).contextManager;
		if (!contextManager) {
			return;
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const activeFile = activeView?.file ?? this.app.workspace.getActiveFile();
		if (!activeFile) {
			selectionDebug('[SelectionPopup] No active file available when restoring current note context');
			return;
		}

		contextManager.clearContext();
		await contextManager.addFileToContext(activeFile);

		if ((chatView as unknown).updateContextDisplay) {
			(chatView as unknown).updateContextDisplay();
		}
	}

	/**
	 * Show the popup button
	 */
	private showPopup(rect: DOMRect, selectedText: string, isFromWebViewer: boolean = false): void {
		// "Show Add to Context" should strictly follow settings, even when auto-reference is enabled.
		const canShowAddToContext = this.plugin.settings.selectionPopup.showAddToContext;
		const canShowQuickChat = this.plugin.settings.inlineQuickChat.enabled;

		// Check if any buttons are enabled before creating popup
		if (!canShowAddToContext && !canShowQuickChat) {
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
		if (canShowAddToContext) {
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

				// Check if execution is in progress
				const chatView = this.plugin.getChatView();
				if (chatView?.isExecuting()) {
					new Notice(this.plugin.i18n.t('ui.cannotAddContextDuringExecution') || 'Cannot add context during execution');
					return;
				}

				await this.handleAddToContext(selectedText);
			});

			buttonContainer.appendChild(addContextBtn);
		}

		if (canShowQuickChat) {
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
				await this.handleQuickChat(selectedText, rect);
			});

			buttonContainer.appendChild(quickChatBtn);
		}

		// If no buttons are enabled, don't show popup
		if (buttonContainer.children.length === 0) {
			return;
		}

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

		this.positionPopup(rect, isFromWebViewer);

		// Schedule auto-hide
		this.scheduleHide();
	}

	private async resolveActiveSelection(): Promise<{
		selection: Selection | null;
		text: string;
		isFromWebViewer: boolean;
	}> {
		const selection = window.getSelection();
		if (selection && !selection.isCollapsed) {
			const text = selection.toString().trim();
			if (text) {
				return { selection, text, isFromWebViewer: false };
			}
		}

		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf?.view?.contentEl) {
			return { selection: null, text: '', isFromWebViewer: false };
		}

		const contentEl = activeLeaf.view.contentEl;
		const webview = contentEl.querySelector('webview') as any;
		if (webview?.executeJavaScript) {
			try {
				const selectionPromise = webview.executeJavaScript('window.getSelection().toString()');
				const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(''), 100));
				const webviewText = await Promise.race([selectionPromise, timeoutPromise]) as string;
				const text = (webviewText || '').trim();
				if (text) {
					return { selection: null, text, isFromWebViewer: true };
				}
			} catch (error) {
				// Silently ignore webview selection access failures.
			}
		}

		const iframes = contentEl.querySelectorAll('iframe');
		for (const iframe of Array.from(iframes)) {
			try {
				const iframeSelection = iframe.contentWindow?.getSelection();
				if (iframeSelection && !iframeSelection.isCollapsed) {
					const text = iframeSelection.toString().trim();
					if (text) {
						return { selection: null, text, isFromWebViewer: true };
					}
				}
			} catch (error) {
				// Cross-origin iframe selection is inaccessible.
			}
		}

		return { selection: null, text: '', isFromWebViewer: false };
	}

	private positionPopup(rect: DOMRect, isFromWebViewer: boolean): void {
		if (!this.popupEl) {
			return;
		}

		const spacing = 0;
		const viewportPadding = 8;
		const scrollX = window.scrollX;
		const scrollY = window.scrollY;
		const popupWidth = this.popupEl.offsetWidth || 80;
		const popupHeight = this.popupEl.offsetHeight || 45;

		let left = rect.right + scrollX + spacing;
		let top = rect.top + scrollY + Math.max(0, (rect.height - popupHeight) / 2);

		if (isFromWebViewer) {
			left = rect.left + scrollX + spacing;
			top = rect.top + scrollY + spacing;
		}

		const maxLeft = scrollX + window.innerWidth - popupWidth - viewportPadding;
		const maxTop = scrollY + window.innerHeight - popupHeight - viewportPadding;

		if (left > maxLeft) {
			left = Math.max(scrollX + viewportPadding, rect.left + scrollX - popupWidth - spacing);
		}

		if (top > maxTop) {
			top = Math.max(scrollY + viewportPadding, rect.top + scrollY - popupHeight - spacing);
		}

		this.popupEl.style.setProperty('--llmsider-popup-show-transform', 'translateY(0)');
		this.popupEl.style.setProperty('--llmsider-popup-hide-transform', 'translateY(-8px)');
		this.popupEl.style.position = 'absolute';
		this.popupEl.style.top = `${top}px`;
		this.popupEl.style.left = `${Math.max(scrollX + viewportPadding, left)}px`;
		this.popupEl.style.zIndex = '1000';
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
	private async handleAddToContext(
		selectedText: string,
		clearBeforeAdd: boolean = false,
		hideAfter: boolean = true
	): Promise<void> {
		try {
			// Get chat view and its context manager
			const chatView = this.plugin.getChatView();
			if (!chatView) {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.pleaseOpenChatFirst') || 'Please open LLMSider chat first');
				return;
			}

			// Use the context manager from the chat view
			const contextManager = (chatView as unknown).contextManager;
			if (!contextManager) {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.contextManagerNotAvailable') || 'Context manager not available');
				return;
			}

			if (clearBeforeAdd) {
				contextManager.clearContext();
			}

			let finalText = selectedText;

			// Check if we're in a web viewer with YouTube video
			const activeLeaf = this.app.workspace.activeLeaf;
			if (activeLeaf?.view?.contentEl) {
				const webview = activeLeaf.view.contentEl.querySelector('webview') as any;
				if (webview) {
					try {
						// Get current URL from webview
						const currentUrl = webview.getURL ? webview.getURL() : '';
						selectionDebug('[SelectionPopup] Webview URL:', currentUrl);

						const videoId = extractVideoId(currentUrl);

						if (videoId) {
							selectionDebug('[SelectionPopup] Detected YouTube video ID:', videoId);
							new Notice(this.plugin.i18n.t('ui.detectedYouTubeVideo'));

							// Get YouTube video metadata and transcript
							const videoData = await this.getYouTubeTranscript(videoId);
							if (videoData) {
								selectionDebug('[SelectionPopup] Successfully fetched YouTube video data');
								finalText = `## 页面选中内容\n\n${selectedText}\n\n---\n\n# YouTube视频内容\n\n视频链接: ${currentUrl}\n\n${videoData}`;
							} else {
								Logger.warn('[SelectionPopup] Failed to fetch YouTube video data');
							}
						} else {
							selectionDebug('[SelectionPopup] No YouTube video ID detected in URL');
						}
					} catch (error) {
						Logger.error('[SelectionPopup] Error fetching YouTube video data:', error);
					}
				}
			}

			// Add text to context directly without URL prefix
			const activeFile = this.app.workspace.getActiveFile();
			const sourceFile = activeFile instanceof TFile ? activeFile : null;
			const result = await contextManager.addTextToContext(finalText, undefined, sourceFile);

			if (result.success) {
				// Update context display in chat view
				if ((chatView as unknown).updateContextDisplay) {
					(chatView as unknown).updateContextDisplay();
				}

				// Optionally activate the chat view
				// this.plugin.activateChatView();
			} else {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.failedToAddText', { error: result.message }) || 'Failed to add text: ' + result.message);
			}

			if (hideAfter) {
				// Hide popup after action
				this.hidePopup(true);
			}

		} catch (error) {
			Logger.error('Error adding text to context:', error);
			new Notice(this.plugin.getI18nManager()?.t('notifications.ui.errorAddingTextToContext') || 'Error adding text to context');
		}
	}	/**
	 * Handle quick chat action
	 */
	private async handleQuickChat(selectedText: string, anchorRect?: DOMRect): Promise<void> {
		try {
			// Hide popup first
			this.hidePopup(true);

			// Check if Quick Chat feature is enabled
			if (!this.plugin.settings.inlineQuickChat.enabled) {
				// If Quick Chat is not enabled, open the chat view with the selected text as context
				const chatView = this.plugin.getChatView();
				if (!chatView) {
					new Notice(this.plugin.getI18nManager()?.t('notifications.ui.pleaseOpenChatFirst') || 'Please open LLMSider chat first');
					return;
				}				// Add selected text to context
				const contextManager = (chatView as unknown).contextManager;
				if (contextManager) {
					const activeFile = this.app.workspace.getActiveFile();
					const sourceFile = activeFile instanceof TFile ? activeFile : null;
					await contextManager.addTextToContext(selectedText, undefined, sourceFile);
					if ((chatView as unknown).updateContextDisplay) {
						(chatView as unknown).updateContextDisplay();
					}
				}

				// Activate the chat view
				this.plugin.activateChatView();
				return;
			}

			// Get the inline quick chat handler
			const quickChatHandler = this.plugin.inlineQuickChatHandler;
			if (!quickChatHandler) {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.quickChatNotInitialized') || 'Quick Chat is not initialized');
				return;
			}			// Get the active markdown view
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				const readingViewHandler = this.plugin.readingViewQuickChatHandler;
				if (!readingViewHandler) {
					new Notice(this.plugin.i18n.t('ui.readingViewHandlerNotInit'));
					return;
				}
				const fallbackRect = anchorRect || new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0);
				readingViewHandler.show(fallbackRect, selectedText);
				return;
			}

			// Check if we are in Reading View (Preview Mode)
			const isReadingView = activeView.getMode() === 'preview';

			if (isReadingView) {
				// Use Reading View Quick Chat Handler
				const readingViewHandler = this.plugin.readingViewQuickChatHandler;
				if (!readingViewHandler) {
					new Notice(this.plugin.i18n.t('ui.readingViewHandlerNotInit'));
					return;
				}

				// Get selection rect
				const selection = window.getSelection();
				if (selection && selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					const rect = range.getBoundingClientRect();
					readingViewHandler.show(rect, selectedText);
				}
				return;
			}

			// Editing View (Source Mode)
			const editorView = this.plugin.getEditorViewFromMarkdownView(activeView as any);
			if (!editorView) {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.editorNotReady') || 'Editor not ready');
				return;
			}

			// Show the quick chat widget
			quickChatHandler.show(editorView);
		} catch (error) {
			Logger.error('Error opening Quick Chat:', error);
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.ui.errorOpeningQuickChat') || 'Error opening Quick Chat');
		}
	}

	/**
	 * Get YouTube video metadata and transcript using InnerTube API
	 */
	private async getYouTubeTranscript(videoId: string): Promise<string | null> {
		try {
			selectionDebug(`[SelectionPopup] Starting YouTube video fetch for ID: ${videoId}`);

			// Fetch video page to extract API key
			const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
			selectionDebug(`[SelectionPopup] Fetching video page: ${videoPageUrl}`);

			const pageResponse = await requestUrl({
				url: videoPageUrl,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					'Accept-Language': 'en-US,en;q=0.9'
				},
				throw: false
			});

			if (pageResponse.status !== 200) {
				Logger.error(`[SelectionPopup] Failed to fetch video page: HTTP ${pageResponse.status}`);
				throw new Error(`Failed to fetch video page: HTTP ${pageResponse.status}`);
			}

			selectionDebug(`[SelectionPopup] Video page fetched successfully, size: ${pageResponse.text.length} bytes`);

			const html = pageResponse.text;
			const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);

			if (!apiKeyMatch) {
				Logger.error('[SelectionPopup] Could not extract YouTube API key from page');
				throw new Error('Could not extract YouTube API key');
			}

			const apiKey = apiKeyMatch[1];
			selectionDebug(`[SelectionPopup] Extracted API key: ${apiKey.substring(0, 10)}...`);

			// Call InnerTube API
			const innertubeUrl = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
			selectionDebug(`[SelectionPopup] Calling InnerTube API: ${innertubeUrl}`);

			const innertubeResponse = await requestUrl({
				url: innertubeUrl,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
				},
				body: JSON.stringify({
					context: {
						client: {
							clientName: 'WEB',
							clientVersion: '2.20231219.04.00'
						}
					},
					videoId: videoId
				}),
				throw: false
			});

			if (innertubeResponse.status !== 200) {
				Logger.error(`[SelectionPopup] InnerTube API error: HTTP ${innertubeResponse.status}`);
				throw new Error(`InnerTube API error: HTTP ${innertubeResponse.status}`);
			}

			selectionDebug('[SelectionPopup] InnerTube API response received');

			const innertubeData = innertubeResponse.json;

			// Extract video metadata
			const videoDetails = innertubeData.videoDetails;
			selectionDebug('[SelectionPopup] Video metadata:', {
				title: videoDetails?.title,
				author: videoDetails?.author,
				lengthSeconds: videoDetails?.lengthSeconds,
				viewCount: videoDetails?.viewCount,
				channelId: videoDetails?.channelId,
				shortDescription: videoDetails?.shortDescription?.substring(0, 100) + '...'
			});

			// Extract microformat metadata (additional info)
			const microformat = innertubeData.microformat?.playerMicroformatRenderer;
			selectionDebug('[SelectionPopup] Microformat metadata:', {
				uploadDate: microformat?.uploadDate,
				publishDate: microformat?.publishDate,
				category: microformat?.category,
				isUnlisted: microformat?.isUnlisted
			});

			const captionsData = innertubeData.captions?.playerCaptionsTracklistRenderer;

			if (!captionsData || !captionsData.captionTracks || captionsData.captionTracks.length === 0) {
				Logger.warn('[SelectionPopup] No captions available for this video');

				// Return metadata without transcript
				return this.formatVideoMetadata(videoDetails, microformat, null);
			}

			const captionTracks = captionsData.captionTracks;
			selectionDebug(`[SelectionPopup] Found ${captionTracks.length} caption tracks:`,
				captionTracks.map((t: any) => ({
					lang: t.languageCode,
					name: t.name?.simpleText || t.name?.runs?.[0]?.text,
					kind: t.kind
				}))
			);

			// Select caption track: prioritize Chinese > English > first available
			let selectedTrack = captionTracks.find((track: any) =>
				track.languageCode.startsWith('zh')
			) || captionTracks.find((track: any) =>
				track.languageCode === 'en' || track.languageCode.startsWith('en')
			) || captionTracks[0];

			if (!selectedTrack) {
				Logger.warn('[SelectionPopup] No suitable caption track found');
				return this.formatVideoMetadata(videoDetails, microformat, null);
			}

			const trackName = selectedTrack.name?.simpleText ||
				selectedTrack.name?.runs?.[0]?.text ||
				selectedTrack.languageCode;
			const isAutoGenerated = selectedTrack.kind === 'asr';

			selectionDebug(`[SelectionPopup] Selected caption: ${trackName} [${selectedTrack.languageCode}] ${isAutoGenerated ? '(auto-generated)' : '(manual)'}`);

			let captionUrl = selectedTrack.baseUrl.replace(/&fmt=srv3/g, '');
			selectionDebug(`[SelectionPopup] Fetching caption from: ${captionUrl.substring(0, 100)}...`);

			// Download caption data
			const captionResponse = await requestUrl({
				url: captionUrl,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
				},
				throw: false
			});

			if (captionResponse.status !== 200) {
				Logger.error(`[SelectionPopup] Failed to fetch caption content: HTTP ${captionResponse.status}`);
				throw new Error(`Failed to fetch caption content: HTTP ${captionResponse.status}`);
			}

			selectionDebug(`[SelectionPopup] Caption XML fetched, size: ${captionResponse.text.length} bytes`);

			const captionXml = captionResponse.text;
			const segments = parseSubtitleXml(captionXml);

			if (segments.length === 0) {
				Logger.warn('[SelectionPopup] No segments extracted from caption XML');
				return this.formatVideoMetadata(videoDetails, microformat, null);
			}

			// Format as plain text
			const transcript = segments.map(s => s.text).join(' ');

			selectionDebug(`[SelectionPopup] Transcript processed: ${segments.length} segments, ${transcript.length} characters`);
			selectionDebug(`[SelectionPopup] First 200 chars: ${transcript.substring(0, 200)}...`);

			// Return formatted metadata + transcript
			return this.formatVideoMetadata(videoDetails, microformat, {
				language: selectedTrack.languageCode,
				languageName: trackName,
				isAutoGenerated: isAutoGenerated,
				segmentCount: segments.length,
				transcript: transcript
			});

		} catch (error) {
			Logger.error('[SelectionPopup] Error fetching YouTube video data:', error);
			return null;
		}
	}

	/**
	 * Format YouTube video metadata and transcript into readable text
	 */
	private formatVideoMetadata(
		videoDetails: any,
		microformat: any,
		captionData: { language: string; languageName: string; isAutoGenerated: boolean; segmentCount: number; transcript: string } | null
	): string {
		const sections: string[] = [];

		// Video basic info
		sections.push('## 视频信息');
		sections.push('');

		if (videoDetails?.title) {
			sections.push(`**标题**: ${videoDetails.title}`);
		}

		if (videoDetails?.author) {
			sections.push(`**作者**: ${videoDetails.author}`);
		}

		if (videoDetails?.lengthSeconds) {
			const duration = this.formatDuration(parseInt(videoDetails.lengthSeconds));
			sections.push(`**时长**: ${duration}`);
		}

		if (videoDetails?.viewCount) {
			const views = parseInt(videoDetails.viewCount).toLocaleString();
			sections.push(`**观看次数**: ${views}`);
		}

		if (microformat?.publishDate) {
			sections.push(`**发布日期**: ${microformat.publishDate}`);
		}

		if (microformat?.category) {
			sections.push(`**分类**: ${microformat.category}`);
		}

		if (videoDetails?.shortDescription) {
			sections.push('');
			sections.push('**简介**:');
			sections.push(videoDetails.shortDescription);
		}

		// Caption info
		if (captionData) {
			sections.push('');
			sections.push('## 字幕信息');
			sections.push('');
			sections.push(`**语言**: ${captionData.languageName} (${captionData.language})`);
			sections.push(`**类型**: ${captionData.isAutoGenerated ? '自动生成' : '手动添加'}`);
			sections.push(`**片段数**: ${captionData.segmentCount}`);
			sections.push(`**字符数**: ${captionData.transcript.length.toLocaleString()}`);
			sections.push('');
			sections.push('## 字幕内容');
			sections.push('');
			sections.push(captionData.transcript);
		} else {
			sections.push('');
			sections.push('**注**: 该视频没有可用的字幕');
		}

		return sections.join('\n');
	}

	/**
	 * Format duration in seconds to readable format (HH:MM:SS)
	 */
	private formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		} else {
			return `${minutes}:${secs.toString().padStart(2, '0')}`;
		}
	}

	/**
	 * Clean up event listeners and DOM elements
	 */
	destroy(): void {
		this.hidePopup(true);
		this.removeEventListeners();
		if (this.selectionChangeDebounce !== null) {
			window.clearTimeout(this.selectionChangeDebounce);
			this.selectionChangeDebounce = null;
		}
	}
}
