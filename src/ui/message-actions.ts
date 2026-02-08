/**
 * Message Actions - Shared utilities for message operations
 * 
 * Provides reusable functions for copy, generate note, and insert at cursor
 * operations that can be used by both message-renderer and selection-toolbar.
 */

import { Notice, MarkdownView, App } from 'obsidian';
import { Logger } from '../utils/logger';
import type LLMSiderPlugin from '../main';
import type { I18nManager } from '../i18n/i18n-manager';

export interface MessageActionsConfig {
	app: App;
	plugin: LLMSiderPlugin;
	i18n?: I18nManager;
}

/**
 * Shared message action utilities
 */
export class MessageActions {
	private app: App;
	private plugin: LLMSiderPlugin;
	private i18n?: I18nManager;

	constructor(config: MessageActionsConfig) {
		this.app = config.app;
		this.plugin = config.plugin;
		this.i18n = config.i18n;
	}

	/**
	 * Copy text to clipboard
	 */
	async copyToClipboard(text: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(text);
			new Notice(this.i18n?.t('common.copiedToClipboard') || 'Copied to clipboard');
			Logger.debug('[MessageActions] Copied to clipboard:', text.length + ' characters');
		} catch (error) {
			Logger.error('[MessageActions] Failed to copy to clipboard:', error);
			new Notice(this.i18n?.t('common.failedToCopy') || 'Failed to copy');
		}
	}

	private markdownToPlainText(markdown: string): string {
		return markdown
			.replace(/^#{1,6}\s+/gm, '')
			.replace(/\*\*(.*?)\*\*/g, '$1')
			.replace(/\*(.*?)\*/g, '$1')
			.replace(/__(.*?)__/g, '$1')
			.replace(/_(.*?)_/g, '$1')
			.replace(/`(.*?)`/g, '$1')
			.replace(/```[\s\S]*?```/g, '')
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
			.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
			.replace(/~~(.*?)~~/g, '$1')
			.replace(/^>\s+/gm, '')
			.replace(/^[\s]*[-*+]\s+/gm, '')
			.replace(/^\d+\.\s+/gm, '')
			.replace(/^---+$/gm, '')
			.replace(/\n\s*\n\s*\n/g, '\n\n')
			.trim();
	}

	async copyAsPlainText(text: string): Promise<void> {
		const plainText = this.markdownToPlainText(text);
		await this.copyToClipboard(plainText);
	}

	/**
	 * Generate a new note from text content
	 */
	async generateNote(content: string, useAITitle: boolean = true): Promise<void> {
		try {
			// Validate content
			if (!content || content.trim().length < 10) {
				new Notice(this.i18n?.t('notifications.messageRenderer.contentTooShort') || 'Content too short to generate note');
				return;
			}

			let generatedTitle = 'AI生成的笔记';

			// Generate title using AI if requested
			if (useAITitle) {
				const provider = this.plugin.getActiveProvider();
				if (provider) {
					try {
						// Show a simple Notice while generating title
						const progressNotice = new Notice(this.i18n?.t('ui.generatingNoteTitle') || '正在生成笔记标题...', 0);

						const titlePrompt = `Based on the following content, generate a concise, descriptive title in Chinese that captures the main topic or key insight. The title should be:
- Clear and informative
- Suitable as a file name
- Return ONLY the title, no quotes or additional text

Content:
${content.substring(0, 800)}`;

						const titleMessages = [{
							id: 'title-gen-' + Date.now(),
							role: 'user' as const,
							content: titlePrompt,
							timestamp: Date.now()
						}];

						let titleContent = '';
						await provider.sendStreamingMessage(
							titleMessages, 
							(_chunk) => {
								// Ignore streaming updates for the UI; we only need the final result
							},
							undefined, // abortSignal
							undefined, // tools - explicitly undefined to avoid tool calling
							'' // systemMessage - empty to avoid plan generation prompts
						);

						// Hide the progress notice
						progressNotice.hide();

						if (titleContent.trim()) {
							generatedTitle = titleContent.trim()
								.replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid filename characters
								.replace(/^["']|["']$/g, ''); // Remove quotes

							Logger.debug('[MessageActions] Generated title:', generatedTitle);
						}
					} catch (error) {
						Logger.warn('[MessageActions] Failed to generate title, using default:', error);
					}
				}
			}

			// Show creating note notice
			const creatingNotice = new Notice(this.i18n?.t('ui.creatingNote') || 'Creating note...', 0);

			// Create filename with timestamp to avoid conflicts
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
			const filename = `${generatedTitle}.md`;

			// Check if file already exists, if so add timestamp
			let finalFilename = filename;
			if (await this.app.vault.adapter.exists(filename)) {
				finalFilename = `${generatedTitle} ${timestamp}.md`;
			}

			// Create the note content
			const generatedFromText = this.i18n?.t('ui.generatedFrom', { date: new Date().toLocaleString() }) 
				|| `Generated from LLMSider on ${new Date().toLocaleString()}`;
			const noteContent = `# ${generatedTitle}\n\n${content}\n\n---\n*${generatedFromText}*`;

			// Create the file in vault root
			const file = await this.app.vault.create(finalFilename, noteContent);

			// Hide creating notice
			creatingNotice.hide();

			Logger.debug('[MessageActions] Created new note:', {
				originalFilename: filename,
				finalFilename: finalFilename,
				path: file.path,
				contentLength: noteContent.length,
				generatedTitle: generatedTitle
			});

			// Show success message
			const successMessage = this.i18n?.t('ui.createdNote', { title: generatedTitle }) 
				|| `Created note: ${generatedTitle}`;
			new Notice(successMessage);

			// Optional: Open the newly created note
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);

		} catch (error) {
			Logger.error('[MessageActions] Failed to generate note:', error);

			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			const errorMessage = this.i18n?.t('ui.failedToGenerateNote', { error: errorMsg }) 
				|| `Failed to generate new note: ${errorMsg}`;
			new Notice(errorMessage);
		}
	}

	/**
	 * Insert text at cursor position in active editor
	 */
	async insertAtCursor(text: string): Promise<void> {
		try {
			Logger.debug('[MessageActions] Inserting content at cursor...', {
				contentLength: text.length
			});

			// Strategy: Find the best markdown editor to insert into
			// 1. Try getActiveViewOfType (works when markdown view is active)
			// 2. Check workspace.activeLeaf directly (might be markdown even if getActiveViewOfType returns null)
			// 3. Find the most recently focused markdown editor from workspace layout
			
			let markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);

			if (!markdownView) {
				Logger.debug('[MessageActions] getActiveViewOfType returned null, trying activeLeaf');
				
				// Check if activeLeaf itself is a markdown view
				const activeLeaf = this.app.workspace.activeLeaf;
				if (activeLeaf?.view.getViewType() === 'markdown') {
					markdownView = activeLeaf.view as MarkdownView;
					Logger.debug('[MessageActions] Found markdown view in activeLeaf:', markdownView.file?.path);
				}
			}

			if (!markdownView) {
				Logger.debug('[MessageActions] activeLeaf is not markdown, searching for last active markdown editor');
				
				// Find markdown editors in the workspace
				// Use getMostRecentLeaf to get the last focused leaf
				const recentLeaf = this.app.workspace.getMostRecentLeaf();
				
				if (recentLeaf?.view.getViewType() === 'markdown') {
					markdownView = recentLeaf.view as MarkdownView;
					Logger.debug('[MessageActions] Using most recent leaf:', markdownView.file?.path);
				} else {
					// Fall back to searching all markdown leaves
					const leaves = this.app.workspace.getLeavesOfType('markdown');
					if (leaves.length > 0) {
						// Use the first available markdown leaf as last resort
						const view = leaves[0].view;
						if (view instanceof MarkdownView) {
							markdownView = view;
							// Focus this leaf
							this.app.workspace.setActiveLeaf(leaves[0], { focus: true });
							Logger.debug('[MessageActions] Using first available markdown editor:', markdownView.file?.path);
						}
					}
				}
			}

			if (!markdownView) {
				new Notice(this.i18n?.t('notifications.messageRenderer.noActiveEditor') || 'No active editor found');
				return;
			}

			const editor = markdownView.editor;
			const cursor = editor.getCursor();

			// Insert content at cursor position
			editor.replaceRange(text, cursor);

			// Move cursor to end of inserted text
			const lines = text.split('\n');
			const newCursor = {
				line: cursor.line + lines.length - 1,
				ch: lines.length > 1 ? lines[lines.length - 1].length : cursor.ch + text.length
			};
			editor.setCursor(newCursor);

			new Notice(this.i18n?.t('notifications.messageRenderer.insertedAtCursor') || 'Inserted at cursor position');
			Logger.debug('[MessageActions] Successfully inserted content at cursor:', {
				oldPosition: cursor,
				newPosition: newCursor,
				contentLength: text.length,
				file: markdownView.file?.path
			});
		} catch (error) {
			Logger.error('[MessageActions] Failed to insert at cursor:', error);
			new Notice(this.i18n?.t('notifications.messageRenderer.failedToInsert') || 'Failed to insert at cursor');
		}
	}
}
