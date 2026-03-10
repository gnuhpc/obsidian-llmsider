import { App, Notice, MarkdownView } from 'obsidian';
import { Logger } from '../utils/logger';
import * as Diff from 'diff';
import type LLMSiderPlugin from '../main';
import type { PromptTemplate } from '../types';
import { getBuiltInPrompts } from '../data/built-in-prompts';

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

		// Quick prompts section (same behavior as editor quick chat)
		const quickPromptsSection = content.createDiv({ cls: 'llmsider-quick-prompts-section' });
		const quickPromptsTitle = quickPromptsSection.createDiv({
			cls: 'llmsider-quick-prompts-title',
			text: this.plugin.i18n.t('quickChatUI.loadingPrompts')
		});
		const quickPromptsList = quickPromptsSection.createDiv({ cls: 'llmsider-quick-prompts-list' });
		let allPrompts: PromptTemplate[] = [];
		let builtInPrompts: PromptTemplate[] = [];
		let customPrompts: PromptTemplate[] = [];
		let promptTitleTypes = new Map<string, { hasChat: boolean; hasSpeedReading: boolean }>();
		let recentHistoryPrompts: string[] = [];

		const isSpeedReadingPrompt = (prompt: PromptTemplate): boolean => {
			const type = (prompt.type || '').toString().trim().toLowerCase().replace('_', '-');
			return type === 'speed-reading';
		};
		const builtInFromCode = getBuiltInPrompts();
		const builtInIdSet = new Set(builtInFromCode.map(prompt => prompt.id));
		const isBuiltInPrompt = (prompt: PromptTemplate): boolean => {
			return Boolean(prompt.isBuiltIn) || builtInIdSet.has(prompt.id);
		};

		const refreshPrompts = async (): Promise<void> => {
			allPrompts = await this.plugin.configDb.getAllPrompts();
			promptTitleTypes = new Map();
			for (const prompt of allPrompts) {
				const entry = promptTitleTypes.get(prompt.title) || { hasChat: false, hasSpeedReading: false };
				if (isSpeedReadingPrompt(prompt)) {
					entry.hasSpeedReading = true;
				} else {
					entry.hasChat = true;
				}
				promptTitleTypes.set(prompt.title, entry);
			}

			const builtInMap = new Map<string, PromptTemplate>();
			allPrompts
				.filter(prompt => isBuiltInPrompt(prompt) && !isSpeedReadingPrompt(prompt))
				.forEach(prompt => builtInMap.set(prompt.id, prompt));
			for (const prompt of builtInFromCode) {
				if (!builtInMap.has(prompt.id)) {
					builtInMap.set(prompt.id, prompt);
				}
			}
			builtInPrompts = Array.from(builtInMap.values());

			customPrompts = allPrompts.filter(prompt => (
				!isBuiltInPrompt(prompt) && !isSpeedReadingPrompt(prompt)
			));
		};

		const getPromptIcon = (title: string): string => {
			const iconMap: Record<string, string> = {
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

		const renderPrompts = (filter: string = '') => {
			quickPromptsList.empty();
			const lowerFilter = filter.toLowerCase();
			const filteredHistory = (filter === '' ? recentHistoryPrompts :
				recentHistoryPrompts.filter(p => p.toLowerCase().includes(lowerFilter)))
				.filter(p => {
					const types = promptTitleTypes.get(p);
					return !(types?.hasSpeedReading && !types.hasChat);
				});

			const matchesFilter = (prompt: PromptTemplate): boolean => {
				if (filter === '') return true;
				const titleMatch = prompt.title.toLowerCase().includes(lowerFilter);
				const descMatch = prompt.description && prompt.description.toLowerCase().includes(lowerFilter);
				const keywordMatch = prompt.searchKeywords &&
					prompt.searchKeywords.some(keyword => keyword.toLowerCase().includes(lowerFilter));
				return titleMatch || descMatch || keywordMatch;
			};

			const filteredBuiltInPrompts = builtInPrompts.filter(matchesFilter);
			const filteredCustomPrompts = customPrompts.filter(matchesFilter);

			if (filteredHistory.length > 0) {
				quickPromptsList.createDiv({
					cls: 'llmsider-quick-prompts-section-title',
					text: this.plugin.i18n.t('quickChatUI.recentPrompts') || 'Recent'
				});

				filteredHistory.forEach(historyPrompt => {
					const promptItem = quickPromptsList.createDiv({ cls: 'llmsider-quick-prompt-item llmsider-history-prompt-item' });
					promptItem.createSpan({ cls: 'llmsider-quick-prompt-icon', text: '🕐' });
					promptItem.createSpan({ cls: 'llmsider-quick-prompt-text', text: historyPrompt });

					this.plugin.configDb.isPromptInBuiltIn(historyPrompt).then(isInBuiltIn => {
						if (!isInBuiltIn) {
							const addBtn = promptItem.createSpan({
								cls: 'llmsider-quick-prompt-add-btn',
								attr: { 'title': this.plugin.i18n.t('quickChatUI.addToBuiltIn') || 'Add to built-in' }
							});
							addBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

							addBtn.onmousedown = (e) => {
								e.preventDefault();
								e.stopPropagation();
							};

							addBtn.onclick = async (e) => {
								e.preventDefault();
								e.stopPropagation();
								const newPromptId = `custom-${Date.now()}`;
								await this.plugin.configDb.addPrompt({
									id: newPromptId,
									title: historyPrompt,
									content: historyPrompt,
									description: '',
									isBuiltIn: false,
										order: 999,
										lastUsed: Date.now()
									});
								const [, history] = await Promise.all([
									refreshPrompts(),
									this.plugin.configDb.getPromptHistory(3)
								]);
								recentHistoryPrompts = history;
								renderPrompts(this.inputEl?.value.trim() || '');
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
						this.handlePrompt(historyPrompt);
					};
				});
			}

			if (filteredHistory.length > 0 && (filteredCustomPrompts.length > 0 || filteredBuiltInPrompts.length > 0)) {
				quickPromptsList.createDiv({ cls: 'llmsider-quick-prompts-separator' });
			}

			if (filteredCustomPrompts.length > 0) {
				quickPromptsList.createDiv({
					cls: 'llmsider-quick-prompts-section-title',
					text: this.plugin.i18n.t('quickChatUI.customPrompts') || 'Custom Prompts'
				});
			}

			filteredCustomPrompts.forEach(prompt => {
				const promptItem = quickPromptsList.createDiv({ cls: 'llmsider-quick-prompt-item' });
				promptItem.createSpan({ cls: 'llmsider-quick-prompt-icon', text: getPromptIcon(prompt.title) });
				promptItem.createSpan({ cls: 'llmsider-quick-prompt-text', text: prompt.title });

				const pinBtn = promptItem.createSpan({
					cls: `llmsider-quick-prompt-pin ${prompt.pinned ? 'pinned' : ''}`,
					attr: { 'title': prompt.pinned ? this.plugin.i18n.t('ui.unpin') : this.plugin.i18n.t('ui.pin') }
				});
				pinBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>';

				if (prompt.pinned) {
					pinBtn.addClass('is-pinned');
					pinBtn.querySelector('svg')?.setAttribute('fill', 'currentColor');
				}

				pinBtn.onmousedown = (e) => {
					e.preventDefault();
					e.stopPropagation();
				};

				pinBtn.onclick = async (e) => {
					e.preventDefault();
					e.stopPropagation();
					await this.plugin.configDb.togglePromptPin(prompt.id);
					await refreshPrompts();
					renderPrompts(this.inputEl?.value.trim() || '');
				};

				promptItem.onmousedown = (e) => {
					e.preventDefault();
					e.stopPropagation();
				};

				promptItem.onclick = (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (!this.inputEl) return;
					this.inputEl.value = prompt.title;
					this.inputEl.focus();
					this.inputEl.setSelectionRange(this.inputEl.value.length, this.inputEl.value.length);
				};
			});

			if (filteredCustomPrompts.length > 0 && filteredBuiltInPrompts.length > 0) {
				quickPromptsList.createDiv({ cls: 'llmsider-quick-prompts-separator' });
			}

			if (filteredBuiltInPrompts.length > 0 || filter === '') {
				quickPromptsList.createDiv({
					cls: 'llmsider-quick-prompts-section-title',
					text: this.plugin.i18n.t('quickChatUI.builtInPrompts') || 'Built-in Actions'
				});
			}

			if (filteredBuiltInPrompts.length === 0 && filteredCustomPrompts.length === 0 && filteredHistory.length === 0 && filter !== '') {
				const noResults = quickPromptsList.createDiv({ cls: 'llmsider-no-results' });
				noResults.textContent = this.plugin.i18n.t('quickChatUI.noMatchingPrompts');
			}

			filteredBuiltInPrompts.forEach(prompt => {
				const promptItem = quickPromptsList.createDiv({ cls: 'llmsider-quick-prompt-item' });
				promptItem.createSpan({ cls: 'llmsider-quick-prompt-icon', text: getPromptIcon(prompt.title) });
				promptItem.createSpan({ cls: 'llmsider-quick-prompt-text', text: prompt.title });

				const pinBtn = promptItem.createSpan({
					cls: `llmsider-quick-prompt-pin ${prompt.pinned ? 'pinned' : ''}`,
					attr: { 'title': prompt.pinned ? this.plugin.i18n.t('ui.unpin') : this.plugin.i18n.t('ui.pin') }
				});
				pinBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>';

				if (prompt.pinned) {
					pinBtn.addClass('is-pinned');
					pinBtn.querySelector('svg')?.setAttribute('fill', 'currentColor');
				}

				pinBtn.onmousedown = (e) => {
					e.preventDefault();
					e.stopPropagation();
				};

				pinBtn.onclick = async (e) => {
					e.preventDefault();
					e.stopPropagation();
					await this.plugin.configDb.togglePromptPin(prompt.id);
					await refreshPrompts();
					renderPrompts(this.inputEl?.value.trim() || '');
				};

				promptItem.onmousedown = (e) => {
					e.preventDefault();
					e.stopPropagation();
				};

				promptItem.onclick = (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (prompt.isBuiltIn || isBuiltInPrompt(prompt)) {
						this.plugin.configDb.incrementPromptUsage(prompt.id);
						this.handlePrompt(prompt.title);
					} else if (this.inputEl) {
						this.inputEl.value = prompt.title;
						this.inputEl.focus();
						this.inputEl.setSelectionRange(this.inputEl.value.length, this.inputEl.value.length);
					}
				};
			});

			const totalCount = filteredHistory.length + filteredBuiltInPrompts.length + filteredCustomPrompts.length;
			quickPromptsTitle.textContent = filter
				? this.plugin.i18n.t('quickChatUI.quickActionsMatching', { count: totalCount.toString() })
				: this.plugin.i18n.t('quickChatUI.quickActionsAvailable', { count: (recentHistoryPrompts.length + builtInPrompts.length + customPrompts.length).toString() });
		};

		Promise.all([
			refreshPrompts(),
			this.plugin.configDb.getPromptHistory(3)
		]).then(([, history]) => {
			recentHistoryPrompts = history;
			renderPrompts();
		}).catch(error => {
			Logger.error('Failed to load prompts:', error);
			quickPromptsTitle.textContent = this.plugin.i18n.t('quickChatUI.failedToLoadPrompts');
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

		// Filter quick prompts as user types
		this.inputEl.oninput = () => {
			const value = this.inputEl?.value.trim() || '';
			renderPrompts(value);
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
