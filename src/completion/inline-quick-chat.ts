import { Editor, EditorPosition, MarkdownView } from 'obsidian';
import { Logger } from './../utils/logger';
import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type LLMSiderPlugin from '../main';
import { getBuiltInPrompts } from '../data/built-in-prompts';
import type { I18nManager } from '../i18n/i18n-manager';

/**
 * Quick Chat Widget - Similar to Notion AI
 * Provides a floating input box for AI interactions with inline diff preview
 */

/**
 * Widget to display the suggested replacement text inline
 */
class InlineDiffWidget extends WidgetType {
	constructor(private text: string) {
		super();
	}

	toDOM() {
		const span = document.createElement('span');
		span.className = 'llmsider-inline-diff-suggestion';
		span.textContent = this.text;
		return span;
	}

	ignoreEvent() {
		return false;
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
			
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				if (promptItems.length > 0) {
					selectedPromptIndex = (selectedPromptIndex + 1) % promptItems.length;
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
				if (promptItems.length > 0) {
					selectedPromptIndex = selectedPromptIndex <= 0 ? promptItems.length - 1 : selectedPromptIndex - 1;
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
		
		input.onkeypress = (e) => {
			e.stopPropagation();
			e.stopImmediatePropagation();
		};
		
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
		
		// Get built-in prompts with i18n support
		const builtInPrompts = getBuiltInPrompts();
		
		// Add quick prompts section with autocomplete dropdown
		const quickPromptsSection = container.createDiv({ cls: 'llmsider-quick-prompts-section' });
		const quickPromptsTitle = quickPromptsSection.createDiv({ 
			cls: 'llmsider-quick-prompts-title', 
			text: this.i18n.t('quickChatUI.quickActionsAvailable', { count: builtInPrompts.length.toString() })
		});
		
		const quickPromptsList = quickPromptsSection.createDiv({ cls: 'llmsider-quick-prompts-list' });
		
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
		
		// Render all built-in prompts
		const renderPrompts = (filter: string = '') => {
			quickPromptsList.empty();
			const lowerFilter = filter.toLowerCase();
			
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
			
			// Show message if no results found
			if (filteredPrompts.length === 0 && filter !== '') {
				const noResults = quickPromptsList.createDiv({ cls: 'llmsider-no-results' });
				noResults.textContent = this.i18n.t('quickChatUI.noMatchingPrompts');
			}
			
			filteredPrompts.forEach(prompt => {
				const promptItem = quickPromptsList.createDiv({ cls: 'llmsider-quick-prompt-item' });
				promptItem.createSpan({ cls: 'llmsider-quick-prompt-icon', text: getPromptIcon(prompt.title) });
				promptItem.createSpan({ cls: 'llmsider-quick-prompt-text', text: prompt.title });
				
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
			quickPromptsTitle.textContent = filter 
				? this.i18n.t('quickChatUI.quickActionsMatching', { count: filteredPrompts.length.toString() })
				: this.i18n.t('quickChatUI.quickActionsAvailable', { count: builtInPrompts.length.toString() });
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
	 */
	showLoading() {
		if (this.inputElement) {
			this.inputElement.disabled = true;
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
	showAcceptReject() {
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
		
		// Create reject button (✕)
		const rejectBtn = this.actionsElement.createEl('button', {
			cls: 'llmsider-quick-chat-btn-icon',
			attr: { 'aria-label': 'Reject changes', 'title': 'Reject' }
		});
		rejectBtn.innerHTML = '✕';
		rejectBtn.onclick = () => {
			if (this.onReject) this.onReject();
			this.hideAcceptReject();
		};
		
		// Create accept button (✓)
		const acceptBtn = this.actionsElement.createEl('button', {
			cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-accept',
			attr: { 'aria-label': 'Accept changes', 'title': 'Accept' }
		});
		acceptBtn.innerHTML = '✓';
		acceptBtn.onclick = () => {
			if (this.onAccept) this.onAccept();
			this.hideAcceptReject();
		};
	}
	
	/**
	 * Hide accept/reject buttons and restore input
	 */
	hideAcceptReject() {
		if (!this.actionsElement || !this.inputElement) return;
		
		// Hide actions
		this.actionsElement.style.display = 'none';
		this.actionsElement.empty();
		
		// Restore input
		this.inputElement.disabled = false;
		this.inputElement.value = '';
		this.inputElement.placeholder = this.i18n.t('quickChatUI.inputPlaceholder');
		
		// Show quick prompts again
		const quickPromptsSection = this.containerElement?.querySelector('.llmsider-quick-prompts-section') as HTMLElement;
		if (quickPromptsSection) {
			quickPromptsSection.style.display = 'block';
		}
		
		// Restore focus
		setTimeout(() => {
			if (this.inputElement) {
				this.inputElement.focus();
			}
		}, 50);
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
			side: 1,  // Place after the position
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
		accepted: false
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
					accepted: false
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
					accepted: false
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
					accepted: false
				};
			}
		}
		return state;
	},
	provide: field => EditorView.decorations.from(field, state => {
		if (!state.show) return Decoration.none;
		
		const builder = new RangeSetBuilder<Decoration>();
		
		// Add strikethrough decoration to original text (to be replaced)
		builder.add(
			state.from,
			state.to,
			Decoration.mark({
				class: 'llmsider-inline-diff-original',
				attributes: { 'data-original': 'true' }
			})
		);
		
		// Add the new text as a widget at the end position
		builder.add(
			state.to,
			state.to,
			Decoration.widget({
				widget: new InlineDiffWidget(state.modifiedText),
				side: 1
			})
		);
		
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
			await provider.sendStreamingMessage(
				messages,
				(chunk) => {
					if (chunk.delta) {
						response += chunk.delta;
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
			const enableDiff = this.plugin.settings.inlineQuickChat.enableDiffPreview;
			
			if (enableDiff) {
				// For insert mode, use empty string as original text
				const originalText = mode === 'insert' ? '' : selectedText;
				// Show diff preview
				this.showDiffPreview(this.currentView, originalText, response);
				
				// Show accept/reject buttons in widget
				widget.showAcceptReject();
			} else {
				// Direct insertion/replacement (only when diff preview is disabled)
				this.applyChange(this.currentView, response, mode);
				// Add to history after successful application
				this.conversationHistory.push({
					prompt: prompt,
					response: response,
					selectedText: selectedText,
					mode: mode
				});
			}

		} catch (error) {
			Logger.error('Error:', error);
			widget.hideLoading();
			this.showError(error instanceof Error ? error.message : 'Unknown error');
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
						input.disabled = true;
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
				showAcceptReject: () => {
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
						
						// Create reject button
						const rejectBtn = actions.createEl('button', {
							cls: 'llmsider-quick-chat-btn-icon',
							attr: { 'aria-label': 'Reject changes', 'title': 'Reject' }
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
						
						// Create accept button
						const acceptBtn = actions.createEl('button', {
							cls: 'llmsider-quick-chat-btn-icon llmsider-quick-chat-btn-icon-accept',
							attr: { 'aria-label': 'Accept changes', 'title': 'Accept' }
						});
						acceptBtn.innerHTML = '✓';
						acceptBtn.onclick = () => {
							const handler = InlineQuickChatHandler.getInstance();
							if (handler && handler.currentView) {
								handler.acceptInlineDiff(handler.currentView);
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
			} as any;
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
		const diffState = view.state.field(diffPreviewState);
		if (diffState.show) {
			// Reject the diff without applying changes
			view.dispatch({
				effects: rejectDiffEffect.of()
			});
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
			const enableDiff = this.plugin.settings.inlineQuickChat.enableDiffPreview;
			Logger.debug('enableDiffPreview:', enableDiff, 'mode:', mode);
			
			if (enableDiff) {
				Logger.debug('Showing diff preview...');
				// For insert mode, use empty string as original text
				const originalText = mode === 'insert' ? '' : selectedText;
				this.showDiffPreview(view, originalText, response.trim());
				
				// Replace buttons with Accept/Reject if actionsContainer is provided
				if (actionsContainer && inputElement) {
					this.replaceButtonsWithAcceptReject(view, actionsContainer, inputElement, response.trim(), mode);
				}
			} else {
				Logger.debug('Direct apply, no diff preview');
				// Direct insertion/replacement (only when diff preview is disabled)
				this.applyChange(view, response.trim(), mode);
				
				// Clear input and reset buttons for next interaction
				if (inputElement) {
					inputElement.value = '';
					inputElement.style.height = 'auto';
				}
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
				submitBtn.textContent = 'Generating...';
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
				submitBtn.textContent = 'Generate';
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
	private showDiffPreview(view: EditorView, original: string, modified: string) {
		Logger.debug('showDiffPreview called', { original, modified });
		
		// Hide the input widget
		if (this.widgetElement) {
			this.widgetElement.remove();
			this.widgetElement = null;
		}

		// Get the chat state to find the selection position
		const chatState = view.state.field(quickChatState);
		Logger.debug('chatState for diff:', chatState);
		
		// Dispatch effect to show inline diff decorations
		view.dispatch({
			effects: showDiffPreviewEffect.of({
				original: original,
				modified: modified,
				from: chatState.selectionFrom,
				to: chatState.selectionTo
			})
		});
		
		Logger.debug('Inline diff decorations applied');
	}

	/**
	 * Accept inline diff (called by Tab key)
	 */
	public acceptInlineDiff(view: EditorView) {
		Logger.debug('acceptInlineDiff called');
		
		const diffState = view.state.field(diffPreviewState);
		if (!diffState.show) return;
		
		const chatState = view.state.field(quickChatState);
		
		// Apply the change AND clear the diff state in the same transaction
		view.dispatch({
			changes: {
				from: diffState.from,
				to: diffState.to,
				insert: diffState.modifiedText
			},
			effects: acceptDiffEffect.of()
		});
		
		// Add to conversation history
		if (this.currentPrompt && this.currentResponse) {
			this.conversationHistory.push({
				prompt: this.currentPrompt,
				response: this.currentResponse,
				selectedText: chatState.selectedText,
				mode: chatState.mode
			});
		}
		
		Logger.debug('Inline diff accepted and applied, conversation history updated');
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
