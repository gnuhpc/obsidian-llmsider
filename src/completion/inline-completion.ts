import { Logger } from '../utils/logger';
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import { StateField, StateEffect, Extension } from '@codemirror/state';
import { Prec } from '@codemirror/state';

/**
 * Inline suggestion state - supports multiple suggestions
 */
interface InlineSuggestion {
	suggestions: string[];  // 所有建议选项
	currentIndex: number;   // 当前选中的索引
	render: boolean;        // 是否显示
	isLoading: boolean;     // 是否正在加载
}

/**
 * State effects for managing suggestions
 */
const setSuggestionsEffect = StateEffect.define<string[]>();
const clearSuggestionEffect = StateEffect.define<void>();
const nextSuggestionEffect = StateEffect.define<void>();
const previousSuggestionEffect = StateEffect.define<void>();
const updateCurrentSuggestionEffect = StateEffect.define<string>();  // 新增：只更新当前建议
const setLoadingEffect = StateEffect.define<boolean>();  // 新增：设置加载状态

/**
 * State field that holds the current suggestion
 */
export const inlineSuggestionState = StateField.define<InlineSuggestion>({
	create() {
		return { suggestions: [], currentIndex: 0, render: false, isLoading: false };
	},
	update(value, tr) {
		/*Logger.debug('update called:', {
			hasEffects: tr.effects.length > 0,
			effectsCount: tr.effects.length,
			currentValue: value
		});*/
		
		for (const effect of tr.effects) {
			/*Logger.debug('Processing effect:', {
				isSuggestions: effect.is(setSuggestionsEffect),
				isClear: effect.is(clearSuggestionEffect),
				isUpdate: effect.is(updateCurrentSuggestionEffect),
				isLoading: effect.is(setLoadingEffect),
				isNext: effect.is(nextSuggestionEffect),
				isPrevious: effect.is(previousSuggestionEffect)
			});*/
			
			if (effect.is(setSuggestionsEffect)) {
				return { 
					suggestions: effect.value, 
					currentIndex: 0, 
					render: effect.value.length > 0,
					isLoading: false  // 收到建议后停止加载
				};
			}
			if (effect.is(clearSuggestionEffect)) {
				return { suggestions: [], currentIndex: 0, render: false, isLoading: false };
			}
			if (effect.is(setLoadingEffect)) {
				return {
					...value,
					isLoading: effect.value,
					render: effect.value || value.suggestions.length > 0  // 加载中也要显示
				};
			}
			if (effect.is(updateCurrentSuggestionEffect)) {
				// 只更新当前选中的建议，保持其他建议和索引不变
				if (value.suggestions.length > 0) {
					// 如果新值为空，清除所有建议
					if (effect.value.length === 0) {
						return { suggestions: [], currentIndex: 0, render: false, isLoading: false };
					}
					
					const newSuggestions = [...value.suggestions];
					newSuggestions[value.currentIndex] = effect.value;
					return {
						...value,
						suggestions: newSuggestions,
						render: true  // 有文本就显示
					};
				}
				return value;
			}
			if (effect.is(nextSuggestionEffect)) {
				if (value.suggestions.length > 0) {
					return {
						...value,
						currentIndex: (value.currentIndex + 1) % value.suggestions.length
					};
				}
			}
			if (effect.is(previousSuggestionEffect)) {
				if (value.suggestions.length > 0) {
					return {
						...value,
						currentIndex: (value.currentIndex - 1 + value.suggestions.length) % value.suggestions.length
					};
				}
			}
		}
		return value;
	},
});

/**
 * Show inline suggestions (can be multiple)
 */
export function showInlineSuggestion(view: EditorView, suggestions: string | string[]) {
	const suggestionArray = Array.isArray(suggestions) ? suggestions : [suggestions];
	view.dispatch({
		effects: setSuggestionsEffect.of(suggestionArray),
	});
}

/**
 * Show loading indicator
 */
export function showLoadingIndicator(view: EditorView) {
	view.dispatch({
		effects: setLoadingEffect.of(true),
	});
}

/**
 * Hide loading indicator
 */
export function hideLoadingIndicator(view: EditorView) {
	view.dispatch({
		effects: setLoadingEffect.of(false),
	});
}

/**
 * Clear inline suggestion
 */
export function clearInlineSuggestion(view: EditorView) {
	view.dispatch({
		effects: clearSuggestionEffect.of(),
	});
}

/**
 * Go to next suggestion
 */
export function nextSuggestion(view: EditorView): boolean {
	const suggestion = view.state.field(inlineSuggestionState);
	if (!suggestion.render || suggestion.suggestions.length === 0) {
		return false;
	}
	
	view.dispatch({
		effects: nextSuggestionEffect.of(),
	});
	
	return true;
}

/**
 * Go to previous suggestion
 */
export function previousSuggestion(view: EditorView): boolean {
	const suggestion = view.state.field(inlineSuggestionState);
	if (!suggestion.render || suggestion.suggestions.length === 0) {
		return false;
	}
	
	view.dispatch({
		effects: previousSuggestionEffect.of(),
	});
	
	return true;
}

/**
 * Get current suggestion text
 */
export function getCurrentSuggestionText(suggestion: InlineSuggestion): string {
	if (!suggestion.render || suggestion.suggestions.length === 0) {
		return '';
	}
	return suggestion.suggestions[suggestion.currentIndex] || '';
}

/**
 * Accept inline suggestion (insert it at cursor)
 */
export function acceptInlineSuggestion(view: EditorView) {
	const suggestion = view.state.field(inlineSuggestionState);
	const text = getCurrentSuggestionText(suggestion);
	
	if (!suggestion.render || !text) {
		return false;
	}

	const pos = view.state.selection.main.head;
	
	view.dispatch({
		changes: { from: pos, insert: text },
		selection: { anchor: pos + text.length },
		effects: clearSuggestionEffect.of(),
	});

	return true;
}

/**
 * Accept next word/character of the current suggestion
 * Always accepts minimal unit regardless of granularity setting:
 * - English: one word + trailing space
 * - Chinese: one character
 * @param view The editor view
 * @param granularity Not used anymore, kept for backward compatibility
 */
export function acceptNextWord(view: EditorView, granularity: 'word' | 'phrase' | 'short-sentence' | 'long-sentence' = 'word'): boolean {
	const suggestion = view.state.field(inlineSuggestionState);
	const text = getCurrentSuggestionText(suggestion);
	
	if (!suggestion.render || !text) {
		return false;
	}

	const pos = view.state.selection.main.head;

	// Determine if the text is primarily English or Chinese
	const isEnglish = /^[a-zA-Z0-9]/.test(text.trim());
	
	Logger.debug('Processing:', {
		text,
		textLength: text.length,
		isEnglish
	});
	
	let nextChunk: string;
	let remainingText: string;
	
	// Always accept minimal unit: word for English, character for Chinese
	// Granularity only affects AI generation, not acceptance behavior
	if (isEnglish) {
		// For English: match a word + trailing whitespace (including newlines)
		const match = text.match(/^[^\s]+[\s]*/);
		if (!match) {
			return acceptInlineSuggestion(view);
		}
		nextChunk = match[0];
	} else {
		// For Chinese: one character at a time, whitespace (including newlines), or punctuation
		const match = text.match(/^[\u4e00-\u9fa5]|^[\s]+|^[\n\r]/);
		if (!match) {
			// Fallback for other characters (punctuation, English chars, etc.)
			// Use [\s\S] to match any character including newlines
			const fallbackMatch = text.match(/^[\s\S]/);
			if (!fallbackMatch) {
				return acceptInlineSuggestion(view);
			}
			nextChunk = fallbackMatch[0];
		} else {
			nextChunk = match[0];
		}
	}
	
	remainingText = text.substring(nextChunk.length);

	// Insert the next chunk and update suggestion with remaining text
	// 注意：不使用 clearSuggestionEffect，因为热重载可能导致 effect 实例不匹配
	// 而是用空字符串来触发清除逻辑（在 updateCurrentSuggestionEffect 处理器中有检查）
	const effectToSend = updateCurrentSuggestionEffect.of(remainingText);
	
	view.dispatch({
		changes: { from: pos, insert: nextChunk },
		selection: { anchor: pos + nextChunk.length },
		effects: effectToSend,
	});

	// 如果没有剩余文本，返回 false，表示补全已完成
	// 这样可以防止在 effect 处理之前再次调用此函数
	return remainingText.length > 0;
}

/**
 * Widget that displays the suggestion with counter or loading indicator
 */
class InlineSuggestionWidget extends WidgetType {
	constructor(
		readonly text: string,
		readonly currentIndex: number,
		readonly total: number,
		readonly isLoading: boolean
	) {
		super();
	}

	eq(other: InlineSuggestionWidget) {
		return other.text === this.text && 
		       other.currentIndex === this.currentIndex &&
		       other.total === this.total &&
		       other.isLoading === this.isLoading;
	}

	toDOM() {
		const container = document.createElement('span');
		container.className = 'llmsider-inline-suggestion-container';
		
		if (this.isLoading) {
			// Loading indicator - three animated dots closer to cursor
			const loadingSpan = document.createElement('span');
			loadingSpan.className = 'llmsider-inline-suggestion llmsider-inline-loading';
			loadingSpan.style.opacity = '0.5';
			loadingSpan.style.color = 'var(--text-muted)';
			loadingSpan.style.display = 'inline-block';
			loadingSpan.style.fontStyle = 'normal';
			loadingSpan.style.letterSpacing = '2px';
			loadingSpan.style.marginLeft = '2px';
			
			// Three dots with wave animation
			const dotsSpan = document.createElement('span');
			dotsSpan.className = 'llmsider-loading-dots';
			dotsSpan.innerHTML = `<span class="dot">•</span><span class="dot">•</span><span class="dot">•</span>`;
			
			// Styles are now defined in styles.css instead of dynamic style element
			// to comply with Obsidian plugin guidelines (no-forbidden-elements)
			
			loadingSpan.appendChild(dotsSpan);
			container.appendChild(loadingSpan);
		} else {
			// Suggestion text
			const span = document.createElement('span');
			span.textContent = this.text;
			span.className = 'llmsider-inline-suggestion';
			span.style.opacity = '0.4';
			span.style.color = 'var(--text-muted)';
			span.style.fontStyle = 'italic';
			
			container.appendChild(span);
			
			// Counter (if multiple suggestions)
			if (this.total > 1) {
				const counter = document.createElement('span');
				counter.textContent = ` [${this.currentIndex + 1}/${this.total}]`;
				counter.className = 'llmsider-inline-suggestion-counter';
				counter.style.opacity = '0.6';
				counter.style.color = 'var(--text-accent)';
				counter.style.fontSize = '0.9em';
				counter.style.marginLeft = '4px';
				container.appendChild(counter);
			}
		}
		
		return container;
	}
}

/**
 * View plugin that renders suggestions
 */
const renderSuggestionPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.selectionSet || update.transactions.some(tr => tr.effects.length > 0)) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		buildDecorations(view: EditorView): DecorationSet {
			const suggestion = view.state.field(inlineSuggestionState);
			const text = getCurrentSuggestionText(suggestion);

			// Show loading or suggestion
			if (!suggestion.render) {
				return Decoration.none;
			}

			const pos = view.state.selection.main.head;
			const widget = new InlineSuggestionWidget(
				text || '',  // 加载时text可能为空
				suggestion.currentIndex,
				suggestion.suggestions.length,
				suggestion.isLoading
			);
			const decoration = Decoration.widget({
				widget,
				side: 1,
			});

			return Decoration.set([decoration.range(pos)]);
		}
	},
	{
		decorations: (v) => v.decorations,
	}
);

/**
 * Create the inline completion extension
 */
export function createInlineCompletionExtension(): Extension {
	return [
		inlineSuggestionState,
		Prec.lowest(renderSuggestionPlugin),
	];
}
