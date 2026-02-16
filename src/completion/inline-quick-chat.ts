import { Editor, EditorPosition, MarkdownView } from 'obsidian';
import { Logger } from './../utils/logger';
import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import * as Diff from 'diff';
import type LLMSiderPlugin from '../main';
import type { I18nManager } from '../i18n/i18n-manager';
import type { PromptTemplate } from '../types';

/**
 * Quick Chat Widget - Similar to Notion AI
 * Provides a floating input box for AI interactions with inline diff preview
 */

// Polyfill for requestIdleCallback
const requestIdleCallback = window.requestIdleCallback || ((cb: IdleRequestCallback) => {
	const start = Date.now();
	return setTimeout(() => {
		cb({
			didTimeout: false,
			timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
		});
	}, 1);
});

/**
 * Widget to display the suggested replacement text inline
 */
class InlineDiffWidget extends WidgetType {
	constructor(private text: string, private className: string = 'llmsider-inline-diff-suggestion') {
		super();
	}

	toDOM() {
		const span = document.createElement('span');
		span.className = this.className;
		span.textContent = this.text;
		return span;
	}

	ignoreEvent() {
		return false;
	}
}

/**
 * Widget to display fine-grained diff
 */
class FineGrainedDiffWidget extends WidgetType {
	constructor(private original: string, private modified: string) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'llmsider-fine-grained-diff-block';
		
		// Calculate diff
		// Use diffChars for CJK text to get better granularity, diffWords for others
		const hasCJK = /[\u4e00-\u9fa5]/.test(this.original) || /[\u4e00-\u9fa5]/.test(this.modified);
		const diff = hasCJK ? Diff.diffChars(this.original, this.modified) : Diff.diffWords(this.original, this.modified);
		
		diff.forEach(part => {
			const partSpan = document.createElement('span');
			if (part.added) {
				partSpan.className = 'llmsider-diff-added-inline';
				partSpan.textContent = part.value;
			} else if (part.removed) {
				partSpan.className = 'llmsider-diff-removed-inline';
				partSpan.textContent = part.value;
			} else {
				partSpan.className = 'llmsider-diff-context-inline';
				partSpan.textContent = part.value;
			}
			container.appendChild(partSpan);
		});
		
		return container;
	}

	ignoreEvent() {
		return false;
	}
}

/**
 * Widget to display preview text with action buttons (no diff)
 */
class PreviewTextWidget extends WidgetType {
	constructor(private text: string) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'llmsider-fine-grained-diff-block llmsider-preview-text-block';
		
		// Get i18n instance
		const i18n = InlineQuickChatHandler.getI18n();
		
		// Content
		const contentSpan = document.createElement('span');
		contentSpan.className = 'llmsider-preview-text-content';
		contentSpan.textContent = this.text;
		container.appendChild(contentSpan);
		
		// Action buttons removed as requested - now integrated into the bottom Quick Chat widget
		
		return container;
	}

	ignoreEvent() {
		return false; // Allow DOM events to propagate
	}
}

/**
 * Widget to display the Quick Chat input box as a block inserted in the editor
 */
class QuickChatBlockWidget extends WidgetType {
	private containerElement: HTMLElement | null = null;
	private inputElement: HTMLInputElement | null = null;
	private statusElement: HTMLElement | null = null;
	private actionsElement: HTMLElement | null = null;
	
	constructor(
		private selectedText: string,
		private mode: 'insert' | 'replace',
		private onSubmit: (prompt: string) => void,
		private onClose: () => void,
		private i18n: I18nManager,
		private plugin: LLMSiderPlugin,
		private onAccept?: () => void,
		private onReject?: () => void
	) {
		super();
	}

	toDOM() {
		const widget = document.createElement('div');
		widget.className = 'llmsider-quick-chat-widget-block';
		
		// Create compact container
		const container = widget.createDiv({ cls: 'llmsider-quick-chat-compact' });
		this.containerElement = container;
		
		// Flag to track if we're intentionally closing
		let isClosing = false;
		
		// Flag to track IME composition state (for Chinese/Japanese/Korean input)
		let isComposing = false;

		// Input wrapper - will contain input + action buttons on the same line
		const inputWrapper = container.createDiv({ cls: 'llmsider-quick-chat-input-wrapper' });
		
		// Input field with premium placeholder
		const input = inputWrapper.createEl('input', { 
			cls: 'llmsider-quick-chat-input-compact',
			attr: { 
				type: 'text',
				placeholder: this.i18n.t('quickChatUI.inputPlaceholder'),
				'data-no-vim': 'true'
			}
		});
		this.inputElement = input;
		
		// Actions container for accept/reject buttons (in the same line as input, hidden by default)
		const actionsDiv = inputWrapper.createDiv({ cls: 'llmsider-quick-chat-actions-inline' });
		actionsDiv.style.display = 'none';
		this.actionsElement = actionsDiv;
		
		// Prevent spellcheck
		input.setAttribute('spellcheck', 'false');
		
		// Strong focus maintenance strategy
		const maintainFocus = () => {
			if (!isClosing && container.parentElement && document.activeElement !== input) {
				input.focus();
			}
		};
		
		// Multiple strategies to maintain focus
		input.onblur = (e) => {
			if (!isClosing) {
				setTimeout(maintainFocus, 0);
				setTimeout(maintainFocus, 10);
				setTimeout(maintainFocus, 50);
			}
		};
		
		// Prevent focus loss on mousedown/click
		container.onmousedown = (e) => {
			if (e.target !== input) {
				e.preventDefault();
			}
		};
		
		// Re-focus on any interaction with container
		container.onclick = (e) => {
			if (!isClosing && e.target !== input) {
				e.preventDefault();
				input.focus();
			}
		};
		
		// Handle IME composition events (Chinese/Japanese/Korean input)
		input.addEventListener('compositionstart', (e) => {
			isComposing = true;
			e.stopPropagation();
			e.stopImmediatePropagation();
		});
		
		input.addEventListener('compositionupdate', (e) => {
			e.stopPropagation();
			e.stopImmediatePropagation();
		});
		
		input.addEventListener('compositionend', (e) => {
			isComposing = false;
			e.stopPropagation();
			e.stopImmediatePropagation();
		});

		// Track selected item for keyboard navigation
		let selectedPromptIndex = -1;
		
		// Track history navigation state
		let historyPrompts: string[] = [];
		let historyIndex = -1; // -1 means not navigating history
		let currentInputBeforeHistory = ''; // Store current input before starting history navigation
		
		// Load history prompts
		this.plugin.configDb.getPromptHistory(50).then(history => {
			historyPrompts = history;
		});
		
		// Handle Enter key to submit, ESC to close, and arrow keys for navigation
		input.onkeydown = (e) => {
			// Stop event propagation FIRST to prevent Vim/CodeMirror from handling it
			e.stopPropagation();
			e.stopImmediatePropagation();
			
			// Don't handle Enter key during IME composition (Chinese/Japanese/Korean input)
			if (e.key === 'Enter' && isComposing) {
				return;
			}
			
			// Handle arrow keys for prompt navigation in the list below
			const promptItems = Array.from(container.querySelectorAll('.llmsider-quick-prompt-item'));
			
			const useHistoryNavigation = (quickPromptsSection.style.display === 'none' || 
				promptItems.length === 0) && historyPrompts.length > 0;
			
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				
				if (useHistoryNavigation) {
					// Navigate history backward (newer)
					if (historyIndex > 0) {
						historyIndex--;
						input.value = historyPrompts[historyIndex];
					} else if (historyIndex === 0) {
						// Restore original input
						historyIndex = -1;
						input.value = currentInputBeforeHistory;
					}
				} else if (promptItems.length > 0) {
					if (selectedPromptIndex === -1) {
						selectedPromptIndex = 0;
					} else {
						selectedPromptIndex = (selectedPromptIndex + 1) % promptItems.length;
					}
					promptItems.forEach((item, index) => {
						item.toggleClass('selected', index === selectedPromptIndex);
					});
					// Scroll selected item into view
					if (selectedPromptIndex >= 0) {
						promptItems[selectedPromptIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
					}
				}
				return;
			}
			
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				
				if (useHistoryNavigation) {
					// Navigate history forward (older)
					if (historyIndex === -1) {
						// Start history navigation
						currentInputBeforeHistory = input.value;
						historyIndex = 0;
						if (historyPrompts.length > 0) {
							input.value = historyPrompts[0];
						}
					} else if (historyIndex < historyPrompts.length - 1) {
						historyIndex++;
						input.value = historyPrompts[historyIndex];
					}
				} else if (promptItems.length > 0) {
					if (selectedPromptIndex === -1) {
						selectedPromptIndex = promptItems.length - 1;
					} else {
						selectedPromptIndex = selectedPromptIndex <= 0 ? promptItems.length - 1 : selectedPromptIndex - 1;
					}
					promptItems.forEach((item, index) => {
						item.toggleClass('selected', index === selectedPromptIndex);
					});
					// Scroll selected item into view
					if (selectedPromptIndex >= 0) {
						promptItems[selectedPromptIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
					}
				}
				return;
			}

			if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
				if (!useHistoryNavigation || historyPrompts.length === 0) {
					return;
				}
				e.preventDefault();

				if (e.key === 'ArrowRight') {
					// Navigate history backward (newer)
					if (historyIndex > 0) {
						historyIndex--;
						input.value = historyPrompts[historyIndex];
					} else if (historyIndex === 0) {
						// Restore original input
						historyIndex = -1;
						input.value = currentInputBeforeHistory;
					}
				} else {
					// Navigate history forward (older)
					if (historyIndex === -1) {
						// Start history navigation
						currentInputBeforeHistory = input.value;
						historyIndex = 0;
						if (historyPrompts.length > 0) {
							input.value = historyPrompts[0];
						}
					} else if (historyIndex < historyPrompts.length - 1) {
						historyIndex++;
						input.value = historyPrompts[historyIndex];
					}
				}
				return;
			}
			
			if (e.key === 'Tab' && promptItems.length > 0 && selectedPromptIndex >= 0) {
				e.preventDefault();
				(promptItems[selectedPromptIndex] as HTMLElement).click();
				return;
			}
			
			if (e.key === 'Enter') {
				e.preventDefault();
				// Only use keyboard selection if the list is visible and has a selected item
				const isListVisible = quickPromptsSection.style.display !== 'none';
				if (isListVisible && promptItems.length > 0 && selectedPromptIndex >= 0) {
					(promptItems[selectedPromptIndex] as HTMLElement).click();
					selectedPromptIndex = -1; // Reset selection after use
					return;
				}
				// Otherwise submit the prompt
				const prompt = input.value.trim();
				if (prompt) {
					this.onSubmit(prompt);
				}
			}
			
			if (e.key === 'Escape') {
				e.preventDefault();
				isClosing = true;
				this.onClose();
			}
		};
		
		// Capture all key events to prevent Vim interference
		input.onkeyup = (e) => {
			e.stopPropagation();
			e.stopImmediatePropagation();
		};
		
		input.addEventListener('keydown', (e) => {
			e.stopPropagation();
			e.stopImmediatePropagation();
		});
		
		// Capture paste events to prevent them from being handled by the editor
		input.onpaste = (e) => {
			e.stopPropagation();
			e.stopImmediatePropagation();
		};
		
		// Capture cut events
		input.oncut = (e) => {
			e.stopPropagation();
			e.stopImmediatePropagation();
		};
		
		// Capture copy events
		input.oncopy = (e) => {
			e.stopPropagation();
			e.stopImmediatePropagation();
		};
		
		// Note: We don't capture input events here because we handle them in oninput below
		// This prevents interfering with the filtering logic
		
		// Capture beforeinput events (fired before input is inserted)
		input.addEventListener('beforeinput', (e) => {
			e.stopPropagation();
			e.stopImmediatePropagation();
		});
		
		// Get built-in prompts from database (async)
		let builtInPrompts: PromptTemplate[] = [];
		let recentHistoryPrompts: string[] = []; // Store recent 3 history prompts
		
		// Add quick prompts section with autocomplete dropdown
		const quickPromptsSection = container.createDiv({ cls: 'llmsider-quick-prompts-section' });
		const quickPromptsTitle = quickPromptsSection.createDiv({ 
			cls: 'llmsider-quick-prompts-title', 
			text: this.i18n.t('quickChatUI.loadingPrompts')
		});
		
		const quickPromptsList = quickPromptsSection.createDiv({ cls: 'llmsider-quick-prompts-list' });
		
		// Load prompts and history asynchronously
		Promise.all([
			this.plugin.configDb.getBuiltInPrompts(),
			this.plugin.configDb.getPromptHistory(3) // Get recent 3 history
		]).then(([prompts, history]) => {
			builtInPrompts = prompts;
			recentHistoryPrompts = history;
			// Initial render with all prompts
			renderPrompts();
		}).catch(error => {
			Logger.error('Failed to load prompts:', error);
			quickPromptsTitle.textContent = this.i18n.t('quickChatUI.failedToLoadPrompts');
		});
		
		// Function to get prompt icon based on title
		const getPromptIcon = (title: string): string => {
			const iconMap: Record<string, string> = {
				// English titles
				'Continue writing': '✍️',
				'Fix grammar and spelling': '📝',
				'Translate to Chinese': '🌐',
				'Translate to English': '🌐',
				'Summarize': '📄',
				'Simplify': '💡',
				'Explain like I am 5': '👶',
				'Emojify': '😊',
				'Make shorter': '✂️',
				'Make longer': '📈',
				'Generate table of contents': '📑',
				'Generate glossary': '📚',
				'Remove URLs': '🔗',
				'Rewrite as tweet': '🐦',
				'Rewrite as tweet thread': '🧵',
				'Prioritize tasks': '⚡',
				'Daily planner': '📅',
				'Meeting summary': '📝',
				'Rewrite as user story': '📖',
				'Decision matrix': '🎯',
				'Draft email': '✉️',
				'Action checklist': '✅',
				'Brainstorm ideas': '💭',
				'Summarize key learnings': '🎓',
				'Weekly review': '📊',
				'Polish style': '✨',
				'Rewrite in academic tone': '🎓',
				'Rewrite in professional tone': '💼',
				'Improve conciseness': '📏',
				'Improve flow and coherence': '🌊',
				'Enhance persuasiveness': '💪',
				'Write PRD': '📋',
				'Requirement description': '📝',
				'Bug description': '🐛',
				// Chinese titles
				'继续写': '✍️',
				'修正语法和拼写': '📝',
				'翻译成中文': '🌐',
				'翻译成英文': '🌐',
				'总结': '📄',
				'简化': '💡',
				'像我5岁一样解释': '👶',
				'添加表情符号': '😊',
				'缩短': '✂️',
				'扩展': '📈',
				'生成目录': '📑',
				'生成术语表': '📚',
				'移除URL': '🔗',
				'改写为推文': '🐦',
				'改写为推文串': '🧵',
				'任务优先级排序': '⚡',
				'日计划': '📅',
				'会议总结': '📝',
				'改写为用户故事': '📖',
				'决策矩阵': '🎯',
				'草拟邮件': '✉️',
				'行动清单': '✅',
				'头脑风暴': '💭',
				'总结关键要点': '🎓',
				'周回顾': '📊',
				'润色风格': '✨',
				'改写为学术语气': '🎓',
				'改写为专业语气': '💼',
				'提高简洁性': '📏',
				'改善流畅性和连贯性': '🌊',
				'增强说服力': '💪',
				'编写PRD': '📋',
				'需求描述': '📝',
				'Bug描述': '🐛'
			};
			return iconMap[title] || '📝';
		};
		
		// Render all prompts (history + built-in)
		const renderPrompts = (filter: string = '') => {
			quickPromptsList.empty();
			const lowerFilter = filter.toLowerCase();
			
			// Filter history prompts (only show when no filter or filter matches)
			const filteredHistory = filter === '' ? recentHistoryPrompts : 
				recentHistoryPrompts.filter(p => p.toLowerCase().includes(lowerFilter));
			
			// Filter built-in prompts
			const filteredPrompts = builtInPrompts.filter(prompt => {
				if (filter === '') return true;
				
				// Search in current language title and description
				const titleMatch = prompt.title.toLowerCase().includes(lowerFilter);
				const descMatch = prompt.description && prompt.description.toLowerCase().includes(lowerFilter);
				
				// Also search in searchKeywords for cross-language support
				const keywordMatch = prompt.searchKeywords && 
					prompt.searchKeywords.some(keyword => keyword.toLowerCase().includes(lowerFilter));
				
				return titleMatch || descMatch || keywordMatch;
			});
			
			// Render recent history prompts (if any and no filter, or filter matches)
			if (filteredHistory.length > 0) {
				const historyTitle = quickPromptsList.createDiv({ 
					cls: 'llmsider-quick-prompts-section-title',
					text: this.i18n.t('quickChatUI.recentPrompts') || 'Recent'
				});
				
				filteredHistory.forEach(historyPrompt => {
					const promptItem = quickPromptsList.createDiv({ cls: 'llmsider-quick-prompt-item llmsider-history-prompt-item' });
					promptItem.createSpan({ cls: 'llmsider-quick-prompt-icon', text: '🕐' }); // History icon
					promptItem.createSpan({ cls: 'llmsider-quick-prompt-text', text: historyPrompt });
					
					// Check if this history prompt is already in built-in
					this.plugin.configDb.isPromptInBuiltIn(historyPrompt).then(isInBuiltIn => {
						if (!isInBuiltIn) {
							// Add "Add to Built-in" button
							const addBtn = promptItem.createSpan({ 
								cls: 'llmsider-quick-prompt-add-btn',
								attr: { 'title': this.i18n.t('quickChatUI.addToBuiltIn') || 'Add to built-in' }
							});
							addBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
							
							addBtn.onmousedown = (e) => {
								e.preventDefault();
								e.stopPropagation();
							};
							
							addBtn.onclick = async (e) => {
								e.preventDefault();
								e.stopPropagation();
								
								// Add to built-in prompts
								const newPromptId = `custom-${Date.now()}`;
								await this.plugin.configDb.addPrompt({
									id: newPromptId,
									title: historyPrompt,
									content: historyPrompt,
									description: '',
									isBuiltIn: false,
									orderIndex: 999,
									lastUsed: Date.now(),
									createdAt: Date.now(),
									updatedAt: Date.now()
								});
								
								// Reload and re-render
								const [prompts, history] = await Promise.all([
									this.plugin.configDb.getBuiltInPrompts(),
									this.plugin.configDb.getPromptHistory(3)
								]);
								builtInPrompts = prompts;
								recentHistoryPrompts = history;
								renderPrompts(input.value.trim());
							};
						}
					});
					
					promptItem.onmousedown = (e) => {
						e.preventDefault();
						e.stopPropagation();
					};
					
					promptItem.onclick = (e) => {
						e.preventDefault();
						e.stopPropagation();
						selectedPromptIndex = -1;
						quickPromptsSection.style.display = 'none';
						this.onSubmit(historyPrompt);
					};
				});
			}
			
			// Add separator if both history and built-in prompts exist
			if (filteredHistory.length > 0 && filteredPrompts.length > 0) {
				quickPromptsList.createDiv({ cls: 'llmsider-quick-prompts-separator' });
			}
			
			// Render built-in prompts section
			if (filteredPrompts.length > 0 || filter === '') {
				const builtInTitle = quickPromptsList.createDiv({ 
					cls: 'llmsider-quick-prompts-section-title',
					text: this.i18n.t('quickChatUI.builtInPrompts') || 'Built-in Actions'
				});
			}
			
			// Show message if no results found
			if (filteredPrompts.length === 0 && filteredHistory.length === 0 && filter !== '') {
				const noResults = quickPromptsList.createDiv({ cls: 'llmsider-no-results' });
				noResults.textContent = this.i18n.t('quickChatUI.noMatchingPrompts');
			}
			
			filteredPrompts.forEach(prompt => {
				const promptItem = quickPromptsList.createDiv({ cls: 'llmsider-quick-prompt-item' });
				promptItem.createSpan({ cls: 'llmsider-quick-prompt-icon', text: getPromptIcon(prompt.title) });
				promptItem.createSpan({ cls: 'llmsider-quick-prompt-text', text: prompt.title });
				
				// Add Pin/Unpin button
				const pinBtn = promptItem.createSpan({ 
					cls: `llmsider-quick-prompt-pin ${prompt.pinned ? 'pinned' : ''}`,
					attr: { 'title': prompt.pinned ? this.i18n.t('ui.unpin') : this.i18n.t('ui.pin') }
				});
				// Use a simple pin icon
				pinBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>';
				
				if (prompt.pinned) {
					pinBtn.addClass('is-pinned');
					// Fill the icon if pinned
					pinBtn.querySelector('svg')?.setAttribute('fill', 'currentColor');
				}

				pinBtn.onmousedown = (e) => {
					e.preventDefault();
					e.stopPropagation();
				};

				pinBtn.onclick = async (e) => {
					e.preventDefault();
					e.stopPropagation();
					
					// Toggle pin state
					await this.plugin.configDb.togglePromptPin(prompt.id);
					
					// Reload prompts and re-render
					this.plugin.configDb.getBuiltInPrompts().then(prompts => {
						builtInPrompts = prompts;
						renderPrompts(input.value.trim());
					});
				};

				promptItem.onmousedown = (e) => {
					e.preventDefault();
					e.stopPropagation();
				};
				
				promptItem.onclick = (e) => {
					e.preventDefault();
					e.stopPropagation();
					// Reset keyboard selection
					selectedPromptIndex = -1;
					// Hide quick prompts after selection
					quickPromptsSection.style.display = 'none';
					
					// For built-in prompts, execute directly instead of filling input
					if (prompt.isBuiltIn) {
						// Increment usage count
						this.plugin.configDb.incrementPromptUsage(prompt.id);

						// Use the prompt title as the action to submit
						const action = prompt.title;
						this.onSubmit(action);
					} else {
						// For custom prompts, fill input and wait for user confirmation
						const action = prompt.title;
						input.value = action;
						// Ensure focus is maintained
						setTimeout(() => {
							input.focus();
							input.setSelectionRange(input.value.length, input.value.length);
						}, 0);
					}
				};
			});
			
			// Update title with count
			const totalCount = filteredHistory.length + filteredPrompts.length;
			quickPromptsTitle.textContent = filter 
				? this.i18n.t('quickChatUI.quickActionsMatching', { count: totalCount.toString() })
				: this.i18n.t('quickChatUI.quickActionsAvailable', { count: (recentHistoryPrompts.length + builtInPrompts.length).toString() });

			const promptItems = Array.from(quickPromptsList.querySelectorAll('.llmsider-quick-prompt-item')) as HTMLElement[];
			if (promptItems.length > 0) {
				selectedPromptIndex = 0;
				promptItems.forEach((item, index) => {
					item.toggleClass('selected', index === selectedPromptIndex);
				});
			} else {
				selectedPromptIndex = -1;
			}
		};
		
		// Initial render with all prompts
		renderPrompts();
		
		// Handle input changes - filter the list below in real-time
		input.oninput = (e) => {
			// Stop propagation to prevent editor from receiving input events
			if (e) {
				e.stopPropagation();
				e.stopImmediatePropagation();
			}
			
			const value = input.value.trim();
			selectedPromptIndex = -1; // Reset selection when filtering
			historyIndex = -1; // Reset history navigation when user types
			
			if (value) {
				// Filter and show matching prompts
				renderPrompts(value);
				quickPromptsSection.style.display = 'block';
			} else {
				// Show all prompts when input is empty
				renderPrompts();
				quickPromptsSection.style.display = 'block';
			}
		};
		
		// Prevent container clicks from stealing focus
		container.onmousedown = (e) => {
			if (e.target === container || e.target === quickPromptsSection || e.target === quickPromptsTitle) {
				e.preventDefault();
			}
		};
		
		// Focus input after widget is fully rendered
		setTimeout(() => {
			input.focus();
			// Ensure input is ready to receive input
			input.setSelectionRange(0, 0);
		}, 100);
		
		return widget;
	}

	ignoreEvent(): boolean {
		// Don't ignore events - let them through to our inputs
		return false;
	}

	eq(other: QuickChatBlockWidget): boolean {
		return other.mode === this.mode && other.selectedText === this.selectedText;
	}
	
	/**
	 * Show loading state (only in placeholder)
	 * Keep input enabled so user can type while waiting
	 */
	showLoading() {
		if (this.inputElement) {
			// Keep input enabled - users should be able to type during loading
			// this.inputElement.disabled = true;
			this.inputElement.value = '';
			this.inputElement.placeholder = this.i18n.t('quickChatUI.loadingPlaceholder');
		}
	}
	
	/**
	 * Hide loading state and restore input
	 */
	hideLoading() {
		if (this.inputElement) {
			this.inputElement.disabled = false;
			this.inputElement.value = '';
			this.inputElement.placeholder = this.i18n.t('quickChatUI.inputPlaceholder');
			// Restore focus
			setTimeout(() => {
				if (this.inputElement) {
					this.inputElement.focus();
				}
			}, 50);
		}
	}
	
	/**
	 * Show accept/reject buttons (inline with input, on the right side)
	 */
	showAcceptReject(textToCopy?: string) {
		if (!this.actionsElement || !this.inputElement) return;
		
		// Keep input enabled and clear it for new input
		this.inputElement.value = '';
		this.inputElement.placeholder = this.i18n.t('quickChatUI.inputPlaceholderContinue');
		this.inputElement.disabled = false; // Keep input enabled!
		
		// Hide quick prompts
		const quickPromptsSection = this.containerElement?.querySelector('.llmsider-quick-prompts-section') as HTMLElement;
		if (quickPromptsSection) {
			quickPromptsSection.style.display = 'none';
		}
		
		// Clear and show actions inline
		this.actionsElement.empty();
		this.actionsElement.style.display = 'flex';
		
		// Create accept button (✓) - Apply
		const acceptBtn = this.actionsElement.createEl('button', {
			cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-accept',
			attr: {
				'aria-label': this.i18n.t('quickChatUI.acceptChanges'),
				'title': this.i18n.t('quickChatUI.accept')
			}
		});
		acceptBtn.innerHTML = '✓';
		acceptBtn.onclick = () => {
			if (this.onAccept) this.onAccept();
			this.hideAcceptReject();
		};

		// Create insert before button (↱) - Insert Before
		const insertBeforeBtn = this.actionsElement.createEl('button', {
			cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-insert-before',
			attr: { 'aria-label': this.i18n.t('quickChatUI.insertBefore'), 'title': this.i18n.t('quickChatUI.insertBefore') }
		});
		// Corner up right arrow icon
		insertBeforeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>';
		
		insertBeforeBtn.onclick = () => {
			const handler = InlineQuickChatHandler.getInstance();
			if (handler && handler.currentView) {
				handler.insertBeforeInlineDiff(handler.currentView);
				this.hideAcceptReject();
			}
		};

		// Create insert after button (↳) - Insert After
		const insertAfterBtn = this.actionsElement.createEl('button', {
			cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-insert-after',
			attr: { 'aria-label': this.i18n.t('quickChatUI.insertAfter'), 'title': this.i18n.t('quickChatUI.insertAfter') }
		});
		// Corner down right arrow icon
		insertAfterBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>';
		
		insertAfterBtn.onclick = () => {
			const handler = InlineQuickChatHandler.getInstance();
			if (handler && handler.currentView) {
				handler.insertAfterInlineDiff(handler.currentView);
				this.hideAcceptReject();
			}
		};

		// Create copy button (📋) - Copy
		if (textToCopy) {
			const copyBtn = this.actionsElement.createEl('button', {
				cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-copy',
				attr: {
					'aria-label': this.i18n.t('quickChatUI.copyToClipboard'),
					'title': this.i18n.t('quickChatUI.copy')
				}
			});
			// Use SVG for copy icon
			copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
			
			copyBtn.onclick = async (e) => {
				e.preventDefault();
				e.stopPropagation();
				
				try {
					await navigator.clipboard.writeText(textToCopy);
					const originalIcon = copyBtn.innerHTML;
					// Show checkmark temporarily
					copyBtn.innerHTML = '✓';
					setTimeout(() => {
						copyBtn.innerHTML = originalIcon;
					}, 1500);
				} catch (err) {
					Logger.error('Failed to copy:', err);
					// Fallback
					const textarea = document.createElement('textarea');
					textarea.value = textToCopy;
					document.body.appendChild(textarea);
					textarea.select();
					document.execCommand('copy');
					document.body.removeChild(textarea);
					
					const originalIcon = copyBtn.innerHTML;
					copyBtn.innerHTML = '✓';
					setTimeout(() => {
						copyBtn.innerHTML = originalIcon;
					}, 1500);
				}
			};
		}
		
		// Create reject button (✕) - Cancel
		const rejectBtn = this.actionsElement.createEl('button', {
			cls: 'llmsider-quick-chat-btn-icon',
			attr: {
				'aria-label': this.i18n.t('quickChatUI.rejectChanges'),
				'title': this.i18n.t('quickChatUI.reject')
			}
		});
		rejectBtn.innerHTML = '✕';
		rejectBtn.onclick = () => {
			if (this.onReject) this.onReject();
			this.hideAcceptReject();
		};
	}
	
	/**
	 * Hide accept/reject buttons and restore input
	 */
	hideAcceptReject() {
		if (!this.actionsElement || !this.inputElement) return;
		
		// Batch DOM updates for better performance
		requestAnimationFrame(() => {
			// Hide actions
			this.actionsElement!.style.display = 'none';
			this.actionsElement!.empty();
			
			// Restore input
			this.inputElement!.disabled = false;
			this.inputElement!.value = '';
			this.inputElement!.placeholder = this.i18n.t('quickChatUI.inputPlaceholder');
			
			// Show quick prompts again
			const quickPromptsSection = this.containerElement?.querySelector('.llmsider-quick-prompts-section') as HTMLElement;
			if (quickPromptsSection) {
				quickPromptsSection.style.display = 'block';
			}
			
			// Restore focus immediately (no delay needed)
			this.inputElement!.focus();
		});
	}
}

interface QuickChatState {
	show: boolean;
	position: { line: number; ch: number } | null;
	selectedText: string;
	originalText: string;
	mode: 'insert' | 'replace';
	selectionFrom: number;
	selectionTo: number;
	widgetElement: HTMLElement | null;
}

interface DiffPreviewState {
	show: boolean;
	originalText: string;
	modifiedText: string;
	from: number;
	to: number;
	accepted: boolean;
	streaming: boolean;
	disableDiffRendering: boolean;
}

// State effects for managing the quick chat widget
const showQuickChatEffect = StateEffect.define<{ 
	pos: { line: number; ch: number }; 
	selectedText: string; 
	mode: 'insert' | 'replace';
	from: number;
	to: number;
}>();
const hideQuickChatEffect = StateEffect.define<void>();
const showDiffPreviewEffect = StateEffect.define<{ 
	original: string; 
	modified: string;
	from: number;
	to: number;
	streaming?: boolean;
	disableDiffRendering?: boolean;
}>();
const acceptDiffEffect = StateEffect.define<void>();
const rejectDiffEffect = StateEffect.define<void>();
const setWidgetElementEffect = StateEffect.define<HTMLElement | null>();

// State field for quick chat widget
export const quickChatState = StateField.define<QuickChatState>({
	create: () => ({
		show: false,
		position: null,
		selectedText: '',
		originalText: '',
		mode: 'insert',
		selectionFrom: 0,
		selectionTo: 0,
		widgetElement: null
	}),
	update: (state, tr) => {
		for (const effect of tr.effects) {
			if (effect.is(showQuickChatEffect)) {
				return {
					...state,
					show: true,
					position: effect.value.pos,
					selectedText: effect.value.selectedText,
					originalText: effect.value.selectedText,
					mode: effect.value.mode,
					selectionFrom: effect.value.from,
					selectionTo: effect.value.to
				};
			}
			if (effect.is(hideQuickChatEffect)) {
				return {
					...state,
					show: false,
					position: null,
					selectedText: '',
					originalText: '',
					mode: 'insert',
					selectionFrom: 0,
					selectionTo: 0,
					widgetElement: null
				};
			}
			if (effect.is(setWidgetElementEffect)) {
				return {
					...state,
					widgetElement: effect.value
				};
			}
		}
		return state;
	},
	provide: field => EditorView.decorations.from(field, state => {
		if (!state.show) return Decoration.none;
		
		const builder = new RangeSetBuilder<Decoration>();
		
		// Add highlight decoration for the selected text
		if (state.selectedText && state.selectionFrom !== state.selectionTo) {
			builder.add(
				state.selectionFrom, 
				state.selectionTo, 
				Decoration.mark({
					class: 'llmsider-quick-chat-selection-highlight'
				})
			);
		}
		
		// Add block widget at the selection end (after the selected text)
		const pos = state.selectionTo;
		const handler = InlineQuickChatHandler.getInstance();
		const plugin = InlineQuickChatHandler.getPlugin();
		if (!handler || !plugin) return builder.finish();
		
		builder.add(pos, pos, Decoration.widget({
			widget: new QuickChatBlockWidget(
				state.selectedText,
				state.mode,
				(prompt: string) => {
					// Get handler instance and call handlePrompt
					const handler = InlineQuickChatHandler.getInstance();
					if (handler && handler.currentView) {
						handler.handlePromptFromWidget(prompt, state.selectedText, state.mode);
					}
				},
				() => {
					// Get handler instance and call hide
					const handler = InlineQuickChatHandler.getInstance();
					if (handler && handler.currentView) {
						handler.hide(handler.currentView);
					}
				},
				// Get i18n from handler instance
				InlineQuickChatHandler.getI18n()!,
				plugin,
				() => {
					// Accept callback
					const handler = InlineQuickChatHandler.getInstance();
					if (handler && handler.currentView) {
						handler.acceptInlineDiff(handler.currentView);
					}
				},
				() => {
					// Reject callback
					const handler = InlineQuickChatHandler.getInstance();
					if (handler && handler.currentView) {
						handler.rejectInlineDiff(handler.currentView);
					}
				}
			),
			side: 10,  // Place after the position (higher value = lower down)
			block: true  // Make it a block-level widget (creates a new line)
		}));
		
		return builder.finish();
	})
});

// State field for diff preview
export const diffPreviewState = StateField.define<DiffPreviewState>({
	create: () => ({
		show: false,
		originalText: '',
		modifiedText: '',
		from: 0,
		to: 0,
		accepted: false,
		streaming: false,
		disableDiffRendering: false
	}),
	update: (state, tr) => {
		// Check if document changed - if so, we need to adjust positions or clear
		if (tr.docChanged && state.show) {
			// If the diff range was modified, clear the diff state
			let clearDiff = false;
			tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
				// If the change overlaps with our diff range, clear it
				if (fromA <= state.to && toA >= state.from) {
					clearDiff = true;
				}
			});
			
			if (clearDiff) {
				return {
					show: false,
					originalText: '',
					modifiedText: '',
					from: 0,
					to: 0,
					accepted: false,
					streaming: false,
					disableDiffRendering: false
				};
			}
		}
		
		for (const effect of tr.effects) {
			if (effect.is(showDiffPreviewEffect)) {
				return {
					show: true,
					originalText: effect.value.original,
					modifiedText: effect.value.modified,
					from: effect.value.from,
					to: effect.value.to,
					accepted: false,
					streaming: effect.value.streaming || false,
					disableDiffRendering: effect.value.disableDiffRendering || false
				};
			}
			if (effect.is(acceptDiffEffect)) {
				return { ...state, accepted: true, show: false };
			}
			if (effect.is(rejectDiffEffect)) {
				return {
					show: false,
					originalText: '',
					modifiedText: '',
					from: 0,
					to: 0,
					accepted: false,
					streaming: false,
					disableDiffRendering: false
				};
			}
		}
		return state;
	},
	provide: field => EditorView.decorations.from(field, state => {
		if (!state.show) return Decoration.none;
		
		const builder = new RangeSetBuilder<Decoration>();
		
		if (state.streaming) {
			// Streaming mode: Unified typewriter effect (same for both diff enabled/disabled)
			// Just show the streaming text below the original text
			
			// Add the new text as a widget at the end position (typewriter effect)
			builder.add(
				state.to,
				state.to,
				Decoration.widget({
					widget: new InlineDiffWidget(state.modifiedText, 'llmsider-inline-streaming-text'),
					side: 1,
					block: true
				})
			);
		} else {
			// Completed mode: Different rendering based on diff setting
			
			if (state.disableDiffRendering) {
				// No diff: Show preview block with action buttons
				builder.add(
					state.to,
					state.to,
					Decoration.widget({
						widget: new PreviewTextWidget(state.modifiedText),
						side: 1,
						block: true 
					})
				);
			} else {
				// With diff: Show fine-grained diff highlighting
				
				// Dim original text (keep visible for context)
				builder.add(
					state.from,
					state.to,
					Decoration.mark({
						class: 'llmsider-inline-diff-original-streaming',
						attributes: { 'data-original': 'true' }
					})
				);
				
				// Add the fine-grained diff widget as a block
				builder.add(
					state.to,
					state.to,
					Decoration.widget({
						widget: new FineGrainedDiffWidget(state.originalText, state.modifiedText),
						side: 1,
						block: true
					})
				);
			}
		}
		
		return builder.finish();
	})
});

/**
 * Create keymap for accepting/rejecting inline diffs
 */
export function createDiffKeymap(handler: InlineQuickChatHandler) {
	return keymap.of([
		{
			key: 'Tab',
			run: (view) => {
				const diffState = view.state.field(diffPreviewState);
				if (diffState.show) {
					handler.acceptInlineDiff(view);
					return true;
				}
				return false;
			}
		},
		{
			key: 'Escape',
			run: (view) => {
				const diffState = view.state.field(diffPreviewState);
				const chatState = view.state.field(quickChatState);
				
				// If there's a diff showing, reject it
				if (diffState.show) {
					handler.rejectInlineDiff(view);
					return true;
				}
				
				// If the quick chat widget is showing, close it
				if (chatState.show) {
					handler.hide(view);
					return true;
				}
				
				return false;
			}
		}
	]);
}

/**
 * Conversation history entry
 */
interface ConversationEntry {
	prompt: string;
	response: string;
	selectedText: string;
	mode: 'insert' | 'replace';
}

/**
 * Quick Chat Handler
 */
export class InlineQuickChatHandler {
	private plugin: LLMSiderPlugin;
	private widgetElement: HTMLElement | null = null;
	private diffPreviewElement: HTMLElement | null = null;
	public currentView: EditorView | null = null;
	private clickOutsideListener: ((e: MouseEvent) => void) | null = null;
	
	// Store instance for widget callbacks
	private static currentInstance: InlineQuickChatHandler | null = null;
	
	// Conversation history for context
	private conversationHistory: ConversationEntry[] = [];
	private currentResponse: string = '';
	private currentPrompt: string = '';

	constructor(plugin: LLMSiderPlugin) {
		this.plugin = plugin;
		InlineQuickChatHandler.currentInstance = this;
	}

	/**
	 * Get the current handler instance (for widget callbacks)
	 */
	static getInstance(): InlineQuickChatHandler | null {
		return InlineQuickChatHandler.currentInstance;
	}

	/**
	 * Get plugin instance (for widget access)
	 */
	static getPlugin(): LLMSiderPlugin | null {
		return InlineQuickChatHandler.currentInstance?.plugin || null;
	}

	/**
	 * Get i18n instance (for widget access)
	 */
	static getI18n(): I18nManager | null {
		return InlineQuickChatHandler.currentInstance?.plugin.i18n || null;
	}

	/**
	 * Handle prompt submission from widget
	 */
	public async handlePromptFromWidget(prompt: string, selectedText: string, mode: 'insert' | 'replace') {
		if (!this.currentView) return;
		
		// Save to prompt history
		this.plugin.configDb.addPromptHistory(prompt).catch(error => {
			Logger.error('Failed to save prompt history:', error);
		});
		
		// Find the widget instance
		const widget = this.getWidgetInstance();
		if (!widget) return;
		
		try {
			// Show loading state
			widget.showLoading();
			
			const provider = this.plugin.getActiveProvider();
			if (!provider) {
				throw new Error('No active provider configured');
			}

			// Build messages with conversation history
			const messages: Array<{ role: 'user' | 'assistant', content: string, id: string, timestamp: number }> = [];
			
			// Add conversation history
			this.conversationHistory.forEach((entry, index) => {
				// Add user message
				const userContent = mode === 'replace' 
					? `Selected text:\n---\n${entry.selectedText}\n---\n\nInstruction: ${entry.prompt}`
					: `Instruction: ${entry.prompt}`;
				messages.push({
					role: 'user',
					content: userContent,
					id: `history-user-${index}`,
					timestamp: Date.now()
				});
				
				// Add assistant response
				messages.push({
					role: 'assistant',
					content: entry.response,
					id: `history-assistant-${index}`,
					timestamp: Date.now()
				});
			});

			// Build the current prompt with system context
			let fullPrompt = '';
			if (mode === 'replace') {
				fullPrompt = this.conversationHistory.length === 0
					? `You are a helpful writing assistant. The user has selected the following text:

---
${selectedText}
---

They want you to: ${prompt}

IMPORTANT: Return ONLY the modified text without any surrounding quotes, explanations, or markdown formatting. Do not wrap the output in quotation marks. The output should be directly usable as a replacement for the selected text.`
					: `Selected text:\n---\n${selectedText}\n---\n\nInstruction: ${prompt}\n\nIMPORTANT: Return ONLY the modified text without any surrounding quotes, explanations, or markdown formatting.`;
			} else {
				fullPrompt = this.conversationHistory.length === 0
					? `You are a helpful writing assistant. The user wants you to generate text based on this instruction:

${prompt}

IMPORTANT: Return ONLY the generated text without any surrounding quotes, explanations, or markdown formatting. Do not wrap the output in quotation marks. The output should be directly usable for insertion into their document.`
					: `Instruction: ${prompt}\n\nIMPORTANT: Return ONLY the generated text without any surrounding quotes, explanations, or markdown formatting.`;
			}

			// Add current user message
			messages.push({
				role: 'user',
				content: fullPrompt,
				id: 'current',
				timestamp: Date.now()
			});

			// Store current prompt
			this.currentPrompt = prompt;

			// Call LLM
			let response = '';
			// const enableDiff = this.plugin.settings.inlineQuickChat.enableDiffPreview;
			const originalText = mode === 'insert' ? '' : selectedText;

			await provider.sendStreamingMessage(
				messages,
				(chunk) => {
					if (chunk.delta) {
						response += chunk.delta;
						
						// Update diff preview in real-time
						// Even if diff preview is disabled, we show the streaming text (without diff colors)
						if (this.currentView) {
							// We don't clean response during streaming to avoid jumping content
							// as quotes might not be closed yet. 
							// Also we throttle updates slightly to avoid overwhelming the editor
							// but for now direct update should be fine as CodeMirror is efficient
							// Pass streaming=true to use coarse diff (block replace) during streaming
							this.showDiffPreview(this.currentView, originalText, response, true);
						}
					}
				}
			);

			// Clean up response - remove surrounding quotes if present
			response = this.cleanLLMResponse(response.trim());
			
			// Store current response
			this.currentResponse = response;

			// Hide loading state
			widget.hideLoading();

			// Show diff preview for both insert and replace modes
			// enableDiff and originalText are already defined above
			
			// Always show preview (diff or no-diff based on setting) and wait for confirmation
			// Pass streaming=false to use fine-grained diff after completion (if diff enabled)
			this.showDiffPreview(this.currentView, originalText, response, false);
			
			// Show accept/reject buttons in widget
			widget.showAcceptReject(response);

		} catch (error) {
			Logger.error('Error in handlePromptFromWidget:', error);
			widget.hideLoading();
			
			// Show error message in the widget
			if (this.currentView) {
				const widgetEl = this.currentView.dom.querySelector('.llmsider-quick-chat-widget-block');
				if (widgetEl) {
					// Remove any existing error message
					const existingError = widgetEl.querySelector('.llmsider-quick-chat-error-inline');
					if (existingError) {
						existingError.remove();
					}
					
					// Create error message element
					const errorDiv = widgetEl.createDiv({ cls: 'llmsider-quick-chat-error-inline' });
					
					// Parse error message for better display
					let errorMessage = 'Unknown error';
					if (error instanceof Error) {
						errorMessage = error.message;
						
						// Check for specific error types and provide helpful messages
						if (errorMessage.includes('Payload Too Large') || errorMessage.includes('Request too large')) {
							errorMessage = '❌ Request too large - Please try:\n• Using a shorter prompt\n• Selecting less text\n• Starting a new conversation (closes history)';
						} else if (errorMessage.includes('TPM') || errorMessage.includes('tokens per minute')) {
							errorMessage = '❌ Token limit exceeded - The conversation history + your request is too large.\n\nSuggestions:\n• Close and reopen this widget to clear history\n• Use a shorter prompt\n• Select less text';
						}
					}
					
					errorDiv.textContent = errorMessage;
					
					// Auto-remove error after 10 seconds
					setTimeout(() => errorDiv.remove(), 10000);
				}
			}
		}
	}
	
	/**
	 * Get the widget instance from decorations
	 */
	private getWidgetInstance(): QuickChatBlockWidget | null {
		if (!this.currentView) return null;
		
		const state = this.currentView.state.field(quickChatState);
		if (!state.show) return null;
		
		// Try to find the widget in the decoration set
		const decorations = this.currentView.state.field(quickChatState, false);
		if (!decorations) return null;
		
		// Access the widget through the DOM element
		const widgetEl = this.currentView.dom.querySelector('.llmsider-quick-chat-widget-block');
		if (widgetEl) {
			// Get i18n instance
			const i18n = this.plugin.i18n;
			
			// Store reference if needed - for now return null and handle via DOM
			// This is a workaround since we can't easily access the widget instance
			return {
				showLoading: () => {
					const input = widgetEl.querySelector('.llmsider-quick-chat-input-compact') as HTMLInputElement;
					if (input) {
						// Keep input enabled - users should be able to type during loading
						// input.disabled = true;
						input.value = '';
						input.placeholder = i18n.t('quickChatUI.loadingPlaceholder');
					}
				},
				hideLoading: () => {
					const input = widgetEl.querySelector('.llmsider-quick-chat-input-compact') as HTMLInputElement;
					if (input) {
						input.disabled = false;
						input.value = '';
						input.placeholder = i18n.t('quickChatUI.inputPlaceholder');
						// Restore focus
						setTimeout(() => input.focus(), 50);
					}
				},
				showAcceptReject: (textToCopy?: string) => {
					const input = widgetEl.querySelector('.llmsider-quick-chat-input-compact') as HTMLInputElement;
					const quickPrompts = widgetEl.querySelector('.llmsider-quick-prompts-section') as HTMLElement;
					const actions = widgetEl.querySelector('.llmsider-quick-chat-actions-inline') as HTMLElement;
					
					// Keep input enabled for continued interaction
					if (input) {
						input.value = '';
						input.placeholder = i18n.t('quickChatUI.inputPlaceholderContinue');
						input.disabled = false; // Keep enabled!
					}
					
					if (quickPrompts) quickPrompts.style.display = 'none';
					if (actions) {
						actions.innerHTML = '';
						actions.style.display = 'flex';
						
						// Create accept button (✓) - Apply
						const acceptBtn = actions.createEl('button', {
							cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-accept',
							attr: {
								'aria-label': i18n.t('quickChatUI.acceptChanges'),
								'title': i18n.t('quickChatUI.accept')
							}
						});
						acceptBtn.innerHTML = '✓';
						acceptBtn.onclick = () => {
							const handler = InlineQuickChatHandler.getInstance();
							if (handler && handler.currentView) {
								// Apply changes first
								handler.acceptInlineDiff(handler.currentView);
								
								// Batch UI updates in next frame for better performance
								requestAnimationFrame(() => {
									if (actions) actions.style.display = 'none';
									if (input) {
										input.disabled = false;
										input.value = '';
										input.placeholder = i18n.t('quickChatUI.inputPlaceholder');
										input.focus();
									}
									if (quickPrompts) quickPrompts.style.display = 'block';
								});
							}
						};

						// Create insert before button (↱) - Insert Before
						const insertBeforeBtn = actions.createEl('button', {
							cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-insert-before',
							attr: { 'aria-label': i18n.t('quickChatUI.insertBefore'), 'title': i18n.t('quickChatUI.insertBefore') }
						});
						// Corner up right arrow icon
						insertBeforeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>';
						
						insertBeforeBtn.onclick = () => {
							const handler = InlineQuickChatHandler.getInstance();
							if (handler && handler.currentView) {
								// Insert before selection
								handler.insertBeforeInlineDiff(handler.currentView);
								
								// Batch UI updates in next frame for better performance
								requestAnimationFrame(() => {
									if (actions) actions.style.display = 'none';
									if (input) {
										input.disabled = false;
										input.value = '';
										input.placeholder = i18n.t('quickChatUI.inputPlaceholder');
										input.focus();
									}
									if (quickPrompts) quickPrompts.style.display = 'block';
								});
							}
						};

						// Create insert after button (↳) - Insert After
						const insertAfterBtn = actions.createEl('button', {
							cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-insert-after',
							attr: { 'aria-label': i18n.t('quickChatUI.insertAfter'), 'title': i18n.t('quickChatUI.insertAfter') }
						});
						// Corner down right arrow icon
						insertAfterBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>';
						
						insertAfterBtn.onclick = () => {
							const handler = InlineQuickChatHandler.getInstance();
							if (handler && handler.currentView) {
								// Insert after selection
								handler.insertAfterInlineDiff(handler.currentView);
								
								// Batch UI updates in next frame for better performance
								requestAnimationFrame(() => {
									if (actions) actions.style.display = 'none';
									if (input) {
										input.disabled = false;
										input.value = '';
										input.placeholder = i18n.t('quickChatUI.inputPlaceholder');
										input.focus();
									}
									if (quickPrompts) quickPrompts.style.display = 'block';
								});
							}
						};

						// Create copy button (📋) - Copy
						if (textToCopy) {
							const copyBtn = actions.createEl('button', {
								cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-copy',
								attr: {
									'aria-label': i18n.t('quickChatUI.copyToClipboard'),
									'title': i18n.t('quickChatUI.copy')
								}
							});
							copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
							
							copyBtn.onclick = async (e) => {
								e.preventDefault();
								e.stopPropagation();
								
								try {
									await navigator.clipboard.writeText(textToCopy);
									const originalIcon = copyBtn.innerHTML;
									copyBtn.innerHTML = '✓';
									setTimeout(() => {
										copyBtn.innerHTML = originalIcon;
									}, 1500);
								} catch (err) {
									Logger.error('Failed to copy:', err);
									// Fallback
									const textarea = document.createElement('textarea');
									textarea.value = textToCopy;
									document.body.appendChild(textarea);
									textarea.select();
									document.execCommand('copy');
									document.body.removeChild(textarea);
									
									const originalIcon = copyBtn.innerHTML;
									copyBtn.innerHTML = '✓';
									setTimeout(() => {
										copyBtn.innerHTML = originalIcon;
									}, 1500);
								}
							};
						}
						
						// Create reject button (✕) - Cancel
						const rejectBtn = actions.createEl('button', {
							cls: 'llmsider-quick-chat-btn-icon',
							attr: {
								'aria-label': i18n.t('quickChatUI.rejectChanges'),
								'title': i18n.t('quickChatUI.reject')
							}
						});
						rejectBtn.innerHTML = '✕';
						rejectBtn.onclick = () => {
							const handler = InlineQuickChatHandler.getInstance();
							if (handler && handler.currentView) {
								handler.rejectInlineDiff(handler.currentView);
								// Restore UI
								if (actions) actions.style.display = 'none';
								if (input) {
									input.disabled = false;
									input.value = '';
									input.placeholder = i18n.t('quickChatUI.inputPlaceholder');
									setTimeout(() => input.focus(), 50);
								}
								if (quickPrompts) quickPrompts.style.display = 'block';
							}
						};
					}
				},
				hideAcceptReject: () => {
					// Handled inline in button click handlers
				}
			} as unknown as QuickChatBlockWidget;
		}
		
		return null;
	}

	/**
	 * Show the quick chat widget
	 */
	show(view: EditorView) {
		const state = view.state;
		const selection = state.selection.main;
		const selectedText = state.doc.sliceString(selection.from, selection.to);
		
		// Determine mode: insert if no selection, replace if has selection
		const mode = selectedText.trim() ? 'replace' : 'insert';
		
		// Calculate line and character position
		const line = state.doc.lineAt(selection.from);
		const linePos = { line: line.number - 1, ch: selection.from - line.from };

		// Dispatch effect to show widget with gentle scrolling
		view.dispatch({
			effects: [
				showQuickChatEffect.of({
					pos: linePos,
					selectedText: selectedText,
					mode: mode,
					from: selection.from,
					to: selection.to
				}),
				// Gently scroll to show the widget position if needed
				EditorView.scrollIntoView(selection.to, {
					y: "nearest",  // Only scroll if not visible
					yMargin: 100   // Keep some margin from viewport edges
				})
			]
		});

		this.currentView = view;
		
		// Add click outside listener to close the widget
		// Wait a bit to ensure the widget is rendered
		setTimeout(() => {
			this.setupClickOutsideListener(view);
		}, 100);
	}

	/**
	 * Setup click outside listener to close the widget
	 */
	private setupClickOutsideListener(view: EditorView) {
		// Remove existing listener if any
		if (this.clickOutsideListener) {
			document.removeEventListener('mousedown', this.clickOutsideListener);
		}

		this.clickOutsideListener = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			
			// Check if click is outside the quick chat widget
			const widgetEl = view.dom.querySelector('.llmsider-quick-chat-widget-block');
			
			if (widgetEl && !widgetEl.contains(target)) {
				// Clicked outside the widget, close it
				this.hide(view);
			}
		};

		document.addEventListener('mousedown', this.clickOutsideListener);
	}

	/**
	 * Hide the quick chat widget
	 */
	hide(view: EditorView) {
		// Check if there's an active diff preview and reject it
		try {
			// Pass false to avoid throwing if field is not present
			const diffState = view.state.field(diffPreviewState, false);
			if (diffState && diffState.show) {
				// Reject the diff without applying changes
				view.dispatch({
					effects: rejectDiffEffect.of()
				});
			}
		} catch (e) {
			// Ignore error if field is not present or state is invalid
		}
		
		if (this.widgetElement) {
			this.widgetElement.remove();
			this.widgetElement = null;
		}
		
		// Remove click outside listener
		if (this.clickOutsideListener) {
			document.removeEventListener('mousedown', this.clickOutsideListener);
			this.clickOutsideListener = null;
		}
		
		view.dispatch({
			effects: hideQuickChatEffect.of()
		});
		
		// Clear conversation history when closing the widget
		this.conversationHistory = [];
		this.currentPrompt = '';
		this.currentResponse = '';
		
		this.currentView = null;
	}

	/**
	 * Handle user prompt and generate AI response
	 */
	private async handlePrompt(
		view: EditorView, 
		prompt: string, 
		selectedText: string, 
		mode: 'insert' | 'replace',
		actionsContainer?: HTMLElement,
		inputElement?: HTMLInputElement | HTMLTextAreaElement
	) {
		try {
			const provider = this.plugin.getActiveProvider();
			if (!provider) {
				throw new Error('No active provider configured');
			}

			// Build the full prompt
			let fullPrompt = '';
			if (mode === 'replace') {
				fullPrompt = `You are a helpful writing assistant. The user has selected the following text:

"${selectedText}"

They want you to: ${prompt}

Please provide ONLY the modified text as output, without any explanations or additional context. The output should be directly usable as a replacement.`;
			} else {
				fullPrompt = `You are a helpful writing assistant. The user wants you to generate text based on this instruction:

${prompt}

Please provide ONLY the generated text as output, without any explanations or additional context. The output should be directly usable for insertion into their document.`;
			}

			// Show loading state
			this.showLoadingState(view);

			// Call LLM
			let response = '';
			await provider.sendStreamingMessage(
				[{ role: 'user', content: fullPrompt, id: '', timestamp: Date.now() }],
				(chunk) => {
					if (chunk.delta) {
						response += chunk.delta;
					}
				}
			);

			// Hide loading state
			this.hideLoadingState();

			// Show diff preview for both insert and replace modes
			// Even if diff preview is disabled, we use showDiffPreview to handle the preview (without diff colors)
			// and wait for user confirmation (Accept/Reject)
			
			// For insert mode, use empty string as original text
			const originalText = mode === 'insert' ? '' : selectedText;
			this.showDiffPreview(view, originalText, response.trim());
			
			// Replace buttons with Accept/Reject if actionsContainer is provided
			if (actionsContainer && inputElement) {
				this.replaceButtonsWithAcceptReject(view, actionsContainer, inputElement, response.trim(), mode);
			}

		} catch (error) {
			Logger.error('Error:', error);
			this.showError(error instanceof Error ? error.message : 'Unknown error');
		}
	}

	/**
	 * Replace Generate/Cancel buttons with Accept/Reject buttons
	 */
	private replaceButtonsWithAcceptReject(
		view: EditorView, 
		actionsContainer: HTMLElement, 
		inputElement: HTMLInputElement | HTMLTextAreaElement,
		modifiedText: string,
		mode: 'insert' | 'replace'
	) {
		// Clear existing buttons
		actionsContainer.empty();
		
		// Hide input
		inputElement.style.display = 'none';
		
		// Add keyboard event listener for Tab and Esc
		const keyHandler = (e: KeyboardEvent) => {
			if (e.key === 'Tab') {
				e.preventDefault();
				acceptBtn.click();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				rejectBtn.click();
			}
		};
		document.addEventListener('keydown', keyHandler);
		
		// Create Reject button
		const rejectBtn = actionsContainer.createEl('button', { 
			cls: 'llmsider-quick-chat-btn-reject-compact', 
			text: 'Reject' 
		});
		rejectBtn.onclick = () => {
			document.removeEventListener('keydown', keyHandler);
			this.rejectInlineDiff(view);
			// Show input again and restore Submit button
			inputElement.style.display = 'block';
			inputElement.value = '';
			if (inputElement instanceof HTMLTextAreaElement) {
				inputElement.style.height = 'auto';
			}
			this.restoreGenerateButtons(view, actionsContainer, inputElement);
		};
		
		// Create Accept button
		const acceptBtn = actionsContainer.createEl('button', { 
			cls: 'llmsider-quick-chat-btn-accept-compact', 
			text: 'Accept' 
		});
		acceptBtn.onclick = () => {
			document.removeEventListener('keydown', keyHandler);
			this.acceptInlineDiff(view);
			// Show input again and restore Submit button for next use
			inputElement.style.display = 'block';
			inputElement.value = '';
			if (inputElement instanceof HTMLTextAreaElement) {
				inputElement.style.height = 'auto';
			}
			this.restoreGenerateButtons(view, actionsContainer, inputElement);
		};
	}

	/**
	 * Restore Generate/Cancel buttons after accepting or rejecting
	 */
	private restoreGenerateButtons(view: EditorView, actionsContainer: HTMLElement, inputElement: HTMLInputElement | HTMLTextAreaElement) {
		// Get current state
		const chatState = view.state.field(quickChatState);
		const selectedText = chatState.selectedText;
		const mode = chatState.mode;
		
		// Clear existing buttons
		actionsContainer.empty();
		
		// Create Submit button (compact style)
		const submitBtn = actionsContainer.createEl('button', { 
			cls: 'llmsider-quick-chat-btn-submit-compact', 
			text: 'Submit' 
		});
		submitBtn.onclick = async () => {
			const prompt = inputElement.value.trim();
			if (prompt) {
				await this.handlePrompt(view, prompt, selectedText, mode, actionsContainer, inputElement);
			}
		};
	}

	/**
	 * Show loading state
	 */
	private showLoadingState(view: EditorView) {
		if (this.widgetElement) {
			const submitBtn = this.widgetElement.querySelector('.llmsider-quick-chat-btn-submit') as HTMLButtonElement;
			if (submitBtn) {
				submitBtn.disabled = true;
				submitBtn.textContent = this.plugin.i18n.t('ui.inlineChat.generating');
			}
		}
	}

	/**
	 * Hide loading state
	 */
	private hideLoadingState() {
		if (this.widgetElement) {
			const submitBtn = this.widgetElement.querySelector('.llmsider-quick-chat-btn-submit') as HTMLButtonElement;
			if (submitBtn) {
				submitBtn.disabled = false;
				submitBtn.textContent = this.plugin.i18n.t('ui.inlineChat.generate');
			}
		}
	}

	/**
	 * Show error message
	 */
	/**
	 * Clean LLM response by removing surrounding quotes and extra whitespace
	 */
	private cleanLLMResponse(response: string): string {
		let cleaned = response.trim();
		
		// Remove surrounding double quotes if present
		// Match pattern: starts with " and ends with " (but preserve quotes in the middle)
		if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 1) {
			cleaned = cleaned.slice(1, -1);
		}
		
		// Remove surrounding single quotes if present
		if (cleaned.startsWith("'") && cleaned.endsWith("'") && cleaned.length > 1) {
			cleaned = cleaned.slice(1, -1);
		}
		
		// Remove surrounding backticks if present (some models use these)
		if (cleaned.startsWith('`') && cleaned.endsWith('`') && cleaned.length > 1) {
			cleaned = cleaned.slice(1, -1);
		}
		
		// Remove markdown code blocks if present
		// Pattern: ```language\ncode\n``` or ```\ncode\n```
		const codeBlockMatch = cleaned.match(/^```(?:\w+)?\n?([\s\S]*?)\n?```$/);
		if (codeBlockMatch) {
			cleaned = codeBlockMatch[1].trim();
		}
		
		return cleaned.trim();
	}

	private showError(message: string) {
		if (this.widgetElement) {
			const container = this.widgetElement.querySelector('.llmsider-quick-chat-container');
			if (container) {
				const errorDiv = container.createDiv({ cls: 'llmsider-quick-chat-error' });
				errorDiv.textContent = `Error: ${message}`;
				setTimeout(() => errorDiv.remove(), 5000);
			}
		}
	}

	/**
	 * Show inline diff preview using decorations (like GitHub Copilot)
	 */
	private showDiffPreview(view: EditorView, original: string, modified: string, streaming: boolean = false) {
		// Hide the input widget
		if (this.widgetElement) {
			this.widgetElement.remove();
			this.widgetElement = null;
		}

		// Get the chat state to find the selection position
		const chatState = view.state.field(quickChatState);
		
		// Check if diff rendering is disabled
		const disableDiffRendering = !this.plugin.settings.inlineQuickChat.enableDiffPreview;
		
		// Dispatch effect to show inline diff decorations
		view.dispatch({
			effects: showDiffPreviewEffect.of({
				original: original,
				modified: modified,
				from: chatState.selectionFrom,
				to: chatState.selectionTo,
				streaming: streaming,
				disableDiffRendering: disableDiffRendering
			})
		});
	}

	/**
	 * Accept inline diff (called by Tab key)
	 */
	public acceptInlineDiff(view: EditorView) {
		const diffState = view.state.field(diffPreviewState);
		if (!diffState.show) return;
		
		const chatState = view.state.field(quickChatState);
		
		// Calculate the new selection range after applying the modified text
		const newFrom = diffState.from;
		const newTo = diffState.from + diffState.modifiedText.length;
		
		// Apply the change, clear the diff state, and select the newly applied text
		view.dispatch({
			changes: {
				from: diffState.from,
				to: diffState.to,
				insert: diffState.modifiedText
			},
			selection: { anchor: newFrom, head: newTo },
			effects: [
				acceptDiffEffect.of(),
				// Update quick chat state to match new selection
				showQuickChatEffect.of({
					pos: chatState.position || { line: 0, ch: 0 },
					selectedText: diffState.modifiedText,
					mode: 'replace',
					from: newFrom,
					to: newTo
				})
			]
		});
		
		// Add to conversation history asynchronously to not block UI
		requestIdleCallback(() => {
			if (this.currentPrompt && this.currentResponse) {
				this.conversationHistory.push({
					prompt: this.currentPrompt,
					response: this.currentResponse,
					selectedText: chatState.selectedText,
					mode: chatState.mode
				});
			}
			Logger.debug('Inline diff accepted and applied, conversation history updated');
		});
	}

	/**
	 * Insert inline diff before selection
	 */
	public insertBeforeInlineDiff(view: EditorView) {
		const diffState = view.state.field(diffPreviewState);
		if (!diffState.show) return;
		
		const chatState = view.state.field(quickChatState);
		
		// Determine if we should add a newline
		const separator = '\n';
		const textToInsert = diffState.modifiedText + separator;
		
		// Calculate the new selection range (selecting BOTH inserted text and original)
		const newFrom = diffState.from;
		const newTo = diffState.to + textToInsert.length;
		
		// The combined text for the new selection state
		const combinedText = textToInsert + chatState.selectedText;
		
		// Apply the change (insert at start of selection), clear the diff state, and select the newly applied text
		view.dispatch({
			changes: {
				from: diffState.from,
				to: diffState.from,
				insert: textToInsert
			},
			selection: { anchor: newFrom, head: newTo },
			effects: [
				acceptDiffEffect.of(),
				// Update quick chat state to match new selection
				showQuickChatEffect.of({
					pos: chatState.position || { line: 0, ch: 0 },
					selectedText: combinedText,
					mode: 'replace',
					from: newFrom,
					to: newTo
				})
			]
		});
		
		// Add to conversation history asynchronously
		requestIdleCallback(() => {
			if (this.currentPrompt && this.currentResponse) {
				this.conversationHistory.push({
					prompt: this.currentPrompt,
					response: this.currentResponse,
					selectedText: chatState.selectedText,
					mode: chatState.mode
				});
			}
			Logger.debug('Inline diff inserted before and applied, conversation history updated');
		});
	}

	/**
	 * Insert inline diff after selection
	 */
	public insertAfterInlineDiff(view: EditorView) {
		const diffState = view.state.field(diffPreviewState);
		if (!diffState.show) return;
		
		const chatState = view.state.field(quickChatState);
		
		// Determine if we should add a newline
		// If the original text ends with a newline, or the modified text starts with one, we might not need to add one.
		// But generally, "Insert After" implies a new block or separation.
		// Let's add a newline for safety to separate from original text.
		const separator = '\n';
		const textToInsert = separator + diffState.modifiedText;
		
		// Calculate the new selection range (selecting BOTH original and inserted text)
		const newFrom = diffState.from;
		const newTo = diffState.to + textToInsert.length;
		
		// The combined text for the new selection state
		const combinedText = chatState.selectedText + textToInsert;
		
		// Apply the change (insert at end of selection), clear the diff state, and select the newly applied text
		view.dispatch({
			changes: {
				from: diffState.to,
				to: diffState.to,
				insert: textToInsert
			},
			selection: { anchor: newFrom, head: newTo },
			effects: [
				acceptDiffEffect.of(),
				// Update quick chat state to match new selection
				showQuickChatEffect.of({
					pos: chatState.position || { line: 0, ch: 0 }, // Position might need update but this keeps widget near
					selectedText: combinedText,
					mode: 'replace',
					from: newFrom,
					to: newTo
				})
			]
		});
		
		// Add to conversation history asynchronously
		requestIdleCallback(() => {
			if (this.currentPrompt && this.currentResponse) {
				this.conversationHistory.push({
					prompt: this.currentPrompt,
					response: this.currentResponse,
					selectedText: chatState.selectedText,
					mode: chatState.mode
				});
			}
			Logger.debug('Inline diff inserted after and applied, conversation history updated');
		});
	}

	/**
	 * Reject inline diff (called by Esc key)
	 */
	public rejectInlineDiff(view: EditorView) {
		Logger.debug('rejectInlineDiff called');
		
		const diffState = view.state.field(diffPreviewState);
		if (!diffState.show) return;
		
		// Just hide the diff without applying
		// Don't add to conversation history since user rejected it
		view.dispatch({
			effects: rejectDiffEffect.of()
		});
		
		Logger.debug('Inline diff rejected, conversation history not updated');
	}

	/**
	 * Old method - kept for backward compatibility (remove if not needed)
	 */
	private createInlineDiffPreview(view: EditorView, original: string, modified: string, from: number, to: number) {
		Logger.debug('createInlineDiffPreview called', { from, to });
		
		// Remove existing preview if any
		if (this.diffPreviewElement) {
			this.diffPreviewElement.remove();
		}

		// Get coordinates at the end of selection
		const coords = view.coordsAtPos(to);
		Logger.debug('coords:', coords);
		if (!coords) {
			Logger.debug('No coords found, aborting');
			return;
		}

		const preview = document.createElement('div');
		preview.className = 'llmsider-inline-diff-preview';
		
		// Use fixed positioning since coords are relative to viewport
		preview.style.position = 'fixed';
		preview.style.top = `${coords.bottom}px`;
		preview.style.left = `${coords.left}px`;
		preview.style.zIndex = '1000';

		Logger.debug('Preview positioned at:', preview.style.top, preview.style.left);

		const container = preview.createDiv({ cls: 'llmsider-inline-diff-container' });
		
		// Header with title
		const header = container.createDiv({ cls: 'llmsider-inline-diff-header' });
		header.createSpan({ cls: 'llmsider-inline-diff-title', text: 'AI Suggested Change' });

		// Show original text (strikethrough)
		const originalSection = container.createDiv({ cls: 'llmsider-inline-diff-original' });
		originalSection.createSpan({ text: '- ' });
		const originalText = originalSection.createSpan({ cls: 'llmsider-inline-diff-text-removed' });
		originalText.textContent = original;

		// Show new text (highlighted)
		const modifiedSection = container.createDiv({ cls: 'llmsider-inline-diff-modified' });
		modifiedSection.createSpan({ text: '+ ' });
		const modifiedText = modifiedSection.createSpan({ cls: 'llmsider-inline-diff-text-added' });
		modifiedText.textContent = modified;

		// Action buttons
		const actions = container.createDiv({ cls: 'llmsider-inline-diff-actions' });
		
		const rejectBtn = actions.createEl('button', { cls: 'llmsider-diff-btn-reject', text: 'Reject' });
		rejectBtn.onclick = () => {
			Logger.debug('Reject button clicked');
			this.rejectDiff(view);
		};

		const acceptBtn = actions.createEl('button', { cls: 'llmsider-diff-btn-accept', text: 'Accept' });
		acceptBtn.onclick = () => {
			Logger.debug('Accept button clicked, modifiedText:', modified);
			this.acceptDiff(view, modified);
		};

		// Add to document.body for fixed positioning
		document.body.appendChild(preview);
		this.diffPreviewElement = preview;
		
		Logger.debug('Diff preview element added to DOM');
	}

	/**
	 * Accept diff and apply changes
	 */
	private acceptDiff(view: EditorView, modifiedText: string) {
		Logger.debug('acceptDiff called');
		
		// Use currentView if available, otherwise use the passed view
		const activeView = this.currentView || view;
		
		try {
			const chatState = activeView.state.field(quickChatState);
			Logger.debug('chatState:', chatState);
			
			if (chatState.show) {
				Logger.debug('Applying change with range:', chatState.selectionFrom, chatState.selectionTo);
				// Use the stored selection range instead of current selection
				this.applyChangeWithRange(activeView, modifiedText, chatState.mode, chatState.selectionFrom, chatState.selectionTo);
			} else {
				Logger.debug('chatState.show is false, cannot apply changes');
			}
		} catch (error) {
			Logger.error('Error in acceptDiff:', error);
		}

		// Clean up
		this.cleanupDiffPreview();
		this.hide(activeView);

		activeView.dispatch({
			effects: acceptDiffEffect.of()
		});
	}

	/**
	 * Reject diff and return to input
	 */
	private rejectDiff(view: EditorView) {
		// Clean up diff preview
		this.cleanupDiffPreview();

		// Show input widget again
		if (this.widgetElement) {
			this.widgetElement.style.display = 'block';
		}

		view.dispatch({
			effects: rejectDiffEffect.of()
		});
	}

	/**
	 * Clean up diff preview
	 */
	private cleanupDiffPreview() {
		if (this.diffPreviewElement) {
			this.diffPreviewElement.remove();
			this.diffPreviewElement = null;
		}
	}

	/**
	 * Apply the change to the editor
	 */
	private applyChange(view: EditorView, text: string, mode: 'insert' | 'replace') {
		const state = view.state;
		const selection = state.selection.main;

		if (mode === 'replace') {
			// Replace selected text
			view.dispatch({
				changes: {
					from: selection.from,
					to: selection.to,
					insert: text
				}
			});
		} else {
			// Insert at cursor
			view.dispatch({
				changes: {
					from: selection.from,
					insert: text
				}
			});
		}
	}

	/**
	 * Apply the change with specific range (used by acceptDiff)
	 */
	private applyChangeWithRange(view: EditorView, text: string, mode: 'insert' | 'replace', from: number, to: number) {
		Logger.debug('applyChangeWithRange called:', { text, mode, from, to });
		if (mode === 'replace') {
			// Replace text at the stored range
			view.dispatch({
				changes: {
					from: from,
					to: to,
					insert: text
				}
			});
			Logger.debug('Applied replace change');
		} else {
			// Insert at the stored position
			view.dispatch({
				changes: {
					from: from,
					insert: text
				}
			});
			Logger.debug('Applied insert change');
		}
	}
}
