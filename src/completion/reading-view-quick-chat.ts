import { App, Notice, MarkdownView } from 'obsidian';
import { Logger } from '../utils/logger';
import * as Diff from 'diff';
import type LLMSiderPlugin from '../main';
import type { PromptTemplate } from '../types';

/**
 * Reading View Quick Chat Handler
 * Provides a floating input box for AI interactions in Reading View (Preview Mode)
 */
export class ReadingViewQuickChatHandler {
	private plugin: LLMSiderPlugin;
	private app: App;
	private containerEl: HTMLElement | null = null;
	private inputEl: HTMLInputElement | null = null;
	private resultEl: HTMLElement | null = null;
	private selectedText: string = '';
	private currentPrompt: string = '';
	private isStreaming: boolean = false;
	private clickOutsideListener: ((e: MouseEvent) => void) | null = null;

	constructor(plugin: LLMSiderPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
	}

	/**
	 * Show the quick chat widget
	 */
	show(rect: DOMRect, selectedText: string) {
		this.selectedText = selectedText;
		this.close(); // Close existing if any

		// Create container
		this.containerEl = document.createElement('div');
		this.containerEl.className = 'llmsider-quick-chat-widget-block llmsider-reading-view-widget';
		this.containerEl.style.position = 'absolute';
		this.containerEl.style.zIndex = '1000';
		this.containerEl.style.width = '400px'; // Fixed width for now
		
		// Position it
		const top = rect.bottom + window.scrollY + 10;
		const left = rect.left + window.scrollX;
		this.containerEl.style.top = `${top}px`;
		this.containerEl.style.left = `${left}px`;

		// Create content
		const content = this.containerEl.createDiv({ cls: 'llmsider-quick-chat-compact' });
		
		// Input wrapper
		const inputWrapper = content.createDiv({ cls: 'llmsider-quick-chat-input-wrapper' });
		
		// Input field
		this.inputEl = inputWrapper.createEl('input', { 
			cls: 'llmsider-quick-chat-input-compact',
			attr: { 
				type: 'text',
				placeholder: this.plugin.i18n.t('quickChatUI.inputPlaceholder'),
				spellcheck: 'false'
			}
		});

		// Handle input events
		this.inputEl.onkeydown = (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				const prompt = this.inputEl?.value.trim();
				if (prompt) {
					this.handlePrompt(prompt);
				}
			} else if (e.key === 'Escape') {
				e.preventDefault();
				this.close();
			}
		};

		// Add to body
		document.body.appendChild(this.containerEl);
		
		// Focus input
		setTimeout(() => this.inputEl?.focus(), 50);

		// Setup click outside listener
		this.setupClickOutsideListener();
	}

	/**
	 * Handle prompt submission
	 */
	private async handlePrompt(prompt: string) {
		if (!this.inputEl || !this.containerEl) return;
		
		this.currentPrompt = prompt;
		this.isStreaming = true;
		
		// Disable input
		this.inputEl.disabled = true;
		this.inputEl.placeholder = this.plugin.i18n.t('quickChatUI.loadingPlaceholder');
		this.inputEl.value = '';

		// Create result area if not exists
		if (!this.resultEl) {
			this.resultEl = this.containerEl.querySelector('.llmsider-quick-chat-compact')?.createDiv({ cls: 'llmsider-quick-chat-result' }) || null;
		}
		if (this.resultEl) {
			this.resultEl.empty();
			this.resultEl.style.marginTop = '12px';
			this.resultEl.style.maxHeight = '300px';
			this.resultEl.style.overflowY = 'auto';
		}

		try {
			const provider = this.plugin.getActiveProvider();
			if (!provider) {
				throw new Error(this.plugin.i18n.t('errors.noProvider'));
			}

			// Build prompt
			const fullPrompt = `You are a helpful writing assistant. The user has selected the following text:

"${this.selectedText}"

They want you to: ${prompt}

Please provide ONLY the modified text as output, without any explanations or additional context.`;

			// Call LLM
			let response = '';
			await provider.sendStreamingMessage(
				[{ role: 'user', content: fullPrompt, id: '', timestamp: Date.now() }],
				(chunk) => {
					if (chunk.delta) {
						response += chunk.delta;
						this.updateResult(response, true);
					}
				}
			);

			this.isStreaming = false;
			this.updateResult(response, false);
			this.showActions(response);

		} catch (error) {
			Logger.error('Error in Reading View Quick Chat:', error);
			new Notice(this.plugin.i18n.t('errors.generationFailed'));
			this.close();
		} finally {
			if (this.inputEl) {
				this.inputEl.disabled = false;
				this.inputEl.placeholder = this.plugin.i18n.t('quickChatUI.inputPlaceholder');
			}
		}
	}

	/**
	 * Update result display
	 */
	private updateResult(text: string, isStreaming: boolean) {
		if (!this.resultEl) return;
		
		this.resultEl.empty();
		
		// Use the same styling as the editor version
		const container = this.resultEl.createDiv({ cls: 'llmsider-fine-grained-diff-block' });
		
		if (isStreaming) {
			container.addClass('llmsider-inline-diff-streaming');
			container.textContent = text;
		} else {
			// Show diff if enabled, otherwise just text
			// For Reading View, maybe just showing the text is enough, or we can show diff against selected text
			// Let's show diff to be consistent
			const hasCJK = /[\u4e00-\u9fa5]/.test(this.selectedText) || /[\u4e00-\u9fa5]/.test(text);
			const diff = hasCJK ? Diff.diffChars(this.selectedText, text) : Diff.diffWords(this.selectedText, text);
			
			diff.forEach(part => {
				const span = container.createSpan();
				if (part.added) {
					span.className = 'llmsider-diff-added-inline';
					span.textContent = part.value;
				} else if (part.removed) {
					span.className = 'llmsider-diff-removed-inline';
					span.textContent = part.value;
				} else {
					span.className = 'llmsider-diff-context-inline';
					span.textContent = part.value;
				}
			});
		}
	}

	/**
	 * Show actions (Copy / Close)
	 */
	private showActions(text: string) {
		if (!this.containerEl) return;
		
		const actionsDiv = this.containerEl.querySelector('.llmsider-quick-chat-actions-inline') as HTMLElement || 
						  this.containerEl.querySelector('.llmsider-quick-chat-compact')?.createDiv({ cls: 'llmsider-quick-chat-actions-inline' });
		
		if (actionsDiv) {
			actionsDiv.empty();
			actionsDiv.style.display = 'flex';
			actionsDiv.style.justifyContent = 'flex-end';
			actionsDiv.style.marginTop = '8px';
			actionsDiv.style.gap = '8px';

			// Copy button
			const copyBtn = actionsDiv.createEl('button', {
				cls: 'llmsider-quick-chat-btn-icon',
				attr: { 'aria-label': this.plugin.i18n.t('common.copy'), 'title': this.plugin.i18n.t('common.copy') }
			});
			// Copy icon
			copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
			
			copyBtn.onclick = async () => {
				await navigator.clipboard.writeText(text);
				new Notice(this.plugin.i18n.t('common.copiedToClipboard'));
				this.close();
			};

			// Close button
			const closeBtn = actionsDiv.createEl('button', {
				cls: 'llmsider-quick-chat-btn-icon',
				attr: { 'aria-label': this.plugin.i18n.t('common.close'), 'title': this.plugin.i18n.t('common.close') }
			});
			closeBtn.innerHTML = '✕';
			closeBtn.onclick = () => this.close();
		}
	}

	/**
	 * Close the widget
	 */
	close() {
		if (this.containerEl) {
			this.containerEl.remove();
			this.containerEl = null;
		}
		if (this.clickOutsideListener) {
			document.removeEventListener('mousedown', this.clickOutsideListener);
			this.clickOutsideListener = null;
		}
		this.inputEl = null;
		this.resultEl = null;
	}

	private setupClickOutsideListener() {
		if (this.clickOutsideListener) {
			document.removeEventListener('mousedown', this.clickOutsideListener);
		}
		this.clickOutsideListener = (e: MouseEvent) => {
			if (this.containerEl && !this.containerEl.contains(e.target as Node)) {
				this.close();
			}
		};
		document.addEventListener('mousedown', this.clickOutsideListener);
	}
}
