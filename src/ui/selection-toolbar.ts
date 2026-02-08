/**
 * Selection Toolbar - Floating toolbar for selected text in assistant messages
 * 
 * Shows copy, generate note, insert at cursor, and update title buttons when text is selected
 * in assistant message content.
 */

import { Logger } from '../utils/logger';
import LLMSiderPlugin from '../main';
import { MessageActions } from './message-actions';
import { Notice } from 'obsidian';

export class SelectionToolbar {
	private plugin: LLMSiderPlugin;
	private toolbar: HTMLElement | null = null;
	private currentSelection: Selection | null = null;
	private hideTimeout: number | null = null;
	private messageActions: MessageActions;
	private isToolbarVisible: boolean = false;
	private selectionChangeDebounce: number | null = null;

	constructor(plugin: LLMSiderPlugin) {
		this.plugin = plugin;
		this.messageActions = new MessageActions({
			app: plugin.app,
			plugin: plugin,
			i18n: plugin.getI18nManager()
		});
		this.initialize();
	}

	private initialize(): void {
		// Listen for text selection in the document
		document.addEventListener('mouseup', this.handleMouseUp.bind(this));
		document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
		
		Logger.debug('[SelectionToolbar] Initialized');
	}

	private handleMouseUp(event: MouseEvent): void {
		// Small delay to ensure selection is complete
		setTimeout(() => {
			this.checkSelection(event);
		}, 10);
	}

	private handleSelectionChange(): void {
		// Debounce to reduce frequency of checks (selectionchange fires very frequently)
		if (this.selectionChangeDebounce !== null) {
			window.clearTimeout(this.selectionChangeDebounce);
		}

		this.selectionChangeDebounce = window.setTimeout(() => {
			// Only check if toolbar is currently visible
			// This avoids unnecessary calls to hideToolbar when it's already hidden
			if (!this.isToolbarVisible) {
				return;
			}

			const selection = window.getSelection();
			if (!selection || selection.isCollapsed) {
				this.hideToolbar();
			}
		}, 100); // 100ms debounce
	}

	private checkSelection(event: MouseEvent): void {
		const selection = window.getSelection();
		if (!selection || selection.isCollapsed) {
			this.hideToolbar();
			return;
		}

		const selectedText = selection.toString().trim();
		if (!selectedText) {
			this.hideToolbar();
			return;
		}

		// Check if selection is within an assistant message
		const range = selection.getRangeAt(0);
		const container = range.commonAncestorContainer;
		const messageEl = this.findParentMessageElement(container);

		if (!messageEl || !messageEl.classList.contains('llmsider-assistant')) {
			this.hideToolbar();
			return;
		}

		// Show toolbar near the selection
		this.showToolbar(selection, selectedText, event);
	}

	private findParentMessageElement(node: Node): HTMLElement | null {
		let current = node instanceof Element ? node : node.parentElement;
		
		while (current) {
			if (current.classList?.contains('llmsider-message')) {
				return current as HTMLElement;
			}
			current = current.parentElement;
		}
		
		return null;
	}

	private showToolbar(selection: Selection, selectedText: string, event: MouseEvent): void {
		// Skip if already showing for the same selection
		if (this.isToolbarVisible && this.currentSelection === selection && 
		    this.toolbar?.dataset.selectedText === selectedText) {
			return;
		}

		this.currentSelection = selection;

		// Clear any existing hide timeout
		if (this.hideTimeout !== null) {
			window.clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}

		// Create toolbar if it doesn't exist
		if (!this.toolbar) {
			this.createToolbar();
		}

		if (!this.toolbar) return;

		// Position toolbar near the selection
		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();

		// Position above the selection, centered
		const toolbarWidth = 180; // Approximate width (updated for 4 buttons)
		const toolbarHeight = 36;
		
		let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
		let top = rect.top - toolbarHeight - 8;

		// Keep toolbar within viewport
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		if (left < 10) left = 10;
		if (left + toolbarWidth > viewportWidth - 10) left = viewportWidth - toolbarWidth - 10;
		
		// If not enough space above, show below
		if (top < 10) {
			top = rect.bottom + 8;
		}

		this.toolbar.style.left = `${left}px`;
		this.toolbar.style.top = `${top}px`;
		this.toolbar.style.opacity = '1';
		this.toolbar.style.visibility = 'visible';
		this.toolbar.style.transform = 'translateY(0) scale(1)';

		// Store selected text in toolbar dataset
		this.toolbar.dataset.selectedText = selectedText;

		// Mark toolbar as visible
		this.isToolbarVisible = true;

		// Logger.debug('[SelectionToolbar] Showing toolbar at:', { left, top, textLength: selectedText.length });
	}

	private createToolbar(): void {
		this.toolbar = document.body.createDiv({ cls: 'llmsider-selection-toolbar' });

		const i18n = this.plugin.getI18nManager();

		// Copy button
		const copyBtn = this.toolbar.createEl('button', {
			cls: 'llmsider-selection-btn',
			title: i18n?.t('messageActions.copyAsMarkdown') || 'Copy'
		});
		copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
		</svg>`;
		copyBtn.onclick = () => this.copySelectedText();

		// Generate note button
		const noteBtn = this.toolbar.createEl('button', {
			cls: 'llmsider-selection-btn',
			title: i18n?.t('messageActions.generateNewNote') || 'Generate Note'
		});
		noteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
			<polyline points="14 2 14 8 20 8"></polyline>
			<line x1="12" y1="18" x2="12" y2="12"></line>
			<line x1="9" y1="15" x2="15" y2="15"></line>
		</svg>`;
		noteBtn.onclick = () => this.generateNoteFromSelection();

		// Insert at cursor button
		const insertBtn = this.toolbar.createEl('button', {
			cls: 'llmsider-selection-btn',
			title: i18n?.t('messageActions.insertAtCursor') || 'Insert at Cursor'
		});
		insertBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="9 10 4 15 9 20"></polyline>
			<path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
		</svg>`;
		insertBtn.onclick = () => this.insertAtCursor();

		// Update title button
		const updateTitleBtn = this.toolbar.createEl('button', {
			cls: 'llmsider-selection-btn',
			title: i18n?.t('messageActions.updateNoteTitle') || 'Update Note Title'
		});
		updateTitleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M4 7h16"></path>
			<path d="M10 11h4"></path>
			<path d="M4 15h16"></path>
			<path d="M12 3v18"></path>
		</svg>`;
		updateTitleBtn.onclick = () => this.updateNoteTitle();

		// Add mouse enter/leave handlers to keep toolbar visible while hovering
		this.toolbar.addEventListener('mouseenter', () => {
			if (this.hideTimeout !== null) {
				window.clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}
		});

		this.toolbar.addEventListener('mouseleave', () => {
			this.scheduleHide();
		});

		// Logger.debug('[SelectionToolbar] Toolbar created');
	}

	private hideToolbar(): void {
		// Early return if already hidden - avoid redundant DOM operations
		if (!this.toolbar || !this.isToolbarVisible) return;

		this.toolbar.style.opacity = '0';
		this.toolbar.style.visibility = 'hidden';
		this.toolbar.style.transform = 'translateY(-5px) scale(0.95)';
		this.currentSelection = null;
		this.isToolbarVisible = false;

		// Logger.debug('[SelectionToolbar] Toolbar hidden');
	}

	private scheduleHide(): void {
		if (this.hideTimeout !== null) {
			window.clearTimeout(this.hideTimeout);
		}

		this.hideTimeout = window.setTimeout(() => {
			this.hideToolbar();
		}, 200);
	}

	private async copySelectedText(): Promise<void> {
		const selectedText = this.toolbar?.dataset.selectedText;
		if (!selectedText) return;

		await this.messageActions.copyToClipboard(selectedText);
		this.hideToolbar();
	}

	private async generateNoteFromSelection(): Promise<void> {
		const selectedText = this.toolbar?.dataset.selectedText;
		if (!selectedText) return;

		// Use MessageActions with AI title generation disabled for selections
		// (selections are usually short, don't need AI-generated titles)
		await this.messageActions.generateNote(selectedText, false);
		this.hideToolbar();
	}

	private async insertAtCursor(): Promise<void> {
		const selectedText = this.toolbar?.dataset.selectedText;
		if (!selectedText) return;

		await this.messageActions.insertAtCursor(selectedText);
		this.hideToolbar();
	}

	private async updateNoteTitle(): Promise<void> {
		const selectedText = this.toolbar?.dataset.selectedText;
		if (!selectedText) return;

		try {
			const activeFile = this.plugin.app.workspace.getActiveFile();
			if (!activeFile) {
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.file.noActiveFile') || 'No active file');
				return;
			}

			// Sanitize the selected text for filename
			const sanitizedTitle = selectedText
				.replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid filename characters
				.replace(/\n+/g, ' ') // Replace newlines with spaces
				.trim()
				.substring(0, 200); // Limit length

			if (!sanitizedTitle) {
				new Notice(i18n?.t('ui.invalidTitle') || 'Invalid title');
				return;
			}

			// Create new filename
			const newFilename = `${sanitizedTitle}.md`;
			const newPath = activeFile.parent ? `${activeFile.parent.path}/${newFilename}` : newFilename;

			// Check if file with new name already exists
			if (await this.plugin.app.vault.adapter.exists(newPath)) {
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.file.fileAlreadyExists') || `File "${newFilename}" already exists`);
				return;
			}

			// Rename the file
			await this.plugin.app.fileManager.renameFile(activeFile, newPath);

			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.file.noteTitleUpdated', { title: sanitizedTitle }) || `Note title updated to: ${sanitizedTitle}`);
			Logger.debug('[SelectionToolbar] Updated note title:', {
				oldPath: activeFile.path,
				newPath: newPath,
				title: sanitizedTitle
			});
		} catch (error) {
			Logger.error('[SelectionToolbar] Failed to update note title:', error);
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.file.failedToUpdateTitle') || 'Failed to update note title');
		}

		this.hideToolbar();
	}

	public destroy(): void {
		document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
		document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
		
		if (this.toolbar) {
			this.toolbar.remove();
			this.toolbar = null;
		}

		if (this.hideTimeout !== null) {
			window.clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}

		if (this.selectionChangeDebounce !== null) {
			window.clearTimeout(this.selectionChangeDebounce);
			this.selectionChangeDebounce = null;
		}

		Logger.debug('[SelectionToolbar] Destroyed');
	}
}
