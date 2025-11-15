import { Editor, EditorPosition, MarkdownView } from 'obsidian';
import { Logger } from './../utils/logger';
import { EditorView } from '@codemirror/view';
import type LLMSiderPlugin from '../main';
import {
	showInlineSuggestion,
	clearInlineSuggestion,
	acceptInlineSuggestion,
	acceptNextWord as acceptNextWordFromCompletion,
	nextSuggestion as nextSuggestionFromCompletion,
	previousSuggestion as previousSuggestionFromCompletion,
	showLoadingIndicator,
	hideLoadingIndicator,
	inlineSuggestionState,
	getCurrentSuggestionText,
} from './inline-completion';

/**
 * Manages inline completion logic
 */
export class InlineCompletionHandler {
	private plugin: LLMSiderPlugin;
	private lastTriggerTime: number = 0;
	private isGenerating: boolean = false;
	private debounceTimer: NodeJS.Timeout | null = null;
	private lastAcceptWordTime: number = 0; // Track last time user accepted a word with arrow key
	private readonly EXTENDED_DELAY = 3000; // 3 seconds delay after accepting words
	private readonly EXTENDED_DELAY_WINDOW = 5000; // Consider recent if within 5 seconds
	
	// Cache for suggestions to avoid repeated API calls
	private suggestionCache: Map<string, { suggestions: string[], timestamp: number }> = new Map();
	private readonly CACHE_DURATION = 60000; // 60 seconds cache for better hit rate
	private readonly MAX_CACHE_SIZE = 100; // Increased cache size

	constructor(plugin: LLMSiderPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Handle document changes (called on every keystroke)
	 */
	async handleDocumentChange(view: EditorView) {
		// Clear any existing debounce timer
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		const settings = this.plugin.settings.autocomplete;

		// Check if autocomplete is enabled
		if (!settings.enabled) {
			return;
		}

		// Check if user is actively accepting words (within 1 second)
		const now = Date.now();
		const timeSinceLastAcceptWord = this.lastAcceptWordTime === 0 
			? Infinity  // Never accepted a word yet
			: now - this.lastAcceptWordTime;
		const isActivelyAccepting = timeSinceLastAcceptWord < 1000; // 1 second window

		// Check if there's an active suggestion being displayed
		const suggestion = view.state.field(inlineSuggestionState);
		const hasActiveSuggestion = suggestion.render && suggestion.suggestions.length > 0;

		// If user is actively accepting words and there's an active suggestion, 
		// don't clear it or trigger new generation
		if (isActivelyAccepting && hasActiveSuggestion) {
			return;
		}

		// Get cursor position and context
		const state = view.state;
		const pos = state.selection.main.head;
		const doc = state.doc;
		const line = doc.lineAt(pos);
		const lineText = line.text;
		const cursorInLine = pos - line.from;

		// Get text before and after cursor
		const textBeforeCursor = lineText.substring(0, cursorInLine);
		const textAfterCursor = lineText.substring(cursorInLine);

		const atEndOfLine = cursorInLine === lineText.length;
		
		Logger.debug('Trigger check:', {
			atEndOfLine,
			textBefore: textBeforeCursor.slice(-20),
			textAfter: textAfterCursor.slice(0, 20),
			cursorPos: cursorInLine,
			lineLength: lineText.length
		});

		// Get current token (word/text before cursor)
		// Split by spaces and common punctuation
		const currentToken = textBeforeCursor.split(/[\s\-\*\.\,\;:\!\?\(\)\[\]\{\}]/).pop() || '';

		Logger.debug('Current token:', currentToken, 'length:', currentToken.length);

		// Minimal check: only require at least 1 character to trigger
		// This allows completion anywhere: after bullet points, mid-text, end of line, etc.
		if (currentToken.length < 1 && textBeforeCursor.trim().length === 0) {
			Logger.debug('Empty line, skipping');
			clearInlineSuggestion(view);
			return;
		}

		// Calculate delay: use very short delay for speed (100ms default)
		const isRecentlyAccepting = timeSinceLastAcceptWord < this.EXTENDED_DELAY_WINDOW;
		const baseDelay = Math.max(100, settings.triggerDelay || 100); // Minimum 100ms
		const delay = isRecentlyAccepting ? this.EXTENDED_DELAY : baseDelay;

		// Debounce: wait for user to stop typing
		this.debounceTimer = setTimeout(async () => {
			await this.generateSuggestion(view);
		}, delay);
	}

	/**
	 * Generate suggestions from LLM (generate 1-3 variations based on settings)
	 */
	private async generateSuggestion(view: EditorView) {
		if (this.isGenerating) {
			return;
		}

		this.isGenerating = true;

		try {
			const provider = this.plugin.getActiveProvider();
			if (!provider) {
				return;
			}

			// Get context
			const state = view.state;
			const pos = state.selection.main.head;
			const contextInfo = this.getContext(state, pos);
			
			// Check cache first
			const cacheKey = this.getCacheKey(contextInfo.before);
			const cached = this.suggestionCache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
				// Use cached suggestions
				showInlineSuggestion(view, cached.suggestions);
				this.isGenerating = false;
				return;
			}

			// Show loading indicator
			showLoadingIndicator(view);

			// Build prompt for multiple suggestions
			const settings = this.plugin.settings.autocomplete;
			const prompt = this.buildPrompt(contextInfo.before, contextInfo.after, contextInfo.hasAfter, settings);

			// Call LLM with streaming - show suggestion immediately as it comes
			let completion = '';
			let displayedSomething = false;
			let currentWord = '';
			const MIN_DISPLAY_LENGTH = 3; // Minimum characters before showing
			
			await provider.sendStreamingMessage(
				[{ role: 'user', content: prompt, id: '', timestamp: Date.now() }],
				(chunk) => {
					if (chunk.delta) {
						Logger.debug('Received chunk:', {
							delta: chunk.delta,
							deltaLength: chunk.delta.length,
							charCodes: Array.from(chunk.delta).map(c => c.charCodeAt(0)),
							hasRealNewline: chunk.delta.includes('\n'),
							hasLiteralBackslashN: chunk.delta.includes('\\n')
						});
						
						completion += chunk.delta;
						
						// For single word/phrase suggestions, show as soon as we have a few characters
						if (!displayedSomething && completion.length >= MIN_DISPLAY_LENGTH) {
							// Get the first word or meaningful chunk
							const firstChunk = completion.split(/[\n\r]|[。！？]|[.!?]/)[0].trim();
							if (firstChunk.length >= MIN_DISPLAY_LENGTH) {
								const cleaned = this.cleanSuggestion(firstChunk, contextInfo.before);
								if (cleaned.length >= MIN_DISPLAY_LENGTH) {
									hideLoadingIndicator(view);
									showInlineSuggestion(view, [cleaned]);
									displayedSomething = true;
								}
							}
						}
						
						// Update the display with more complete suggestion as it streams
						if (displayedSomething && completion.includes('\n')) {
							const lines = completion.split('\n').filter(l => l.trim().length > 0);
							if (lines.length > 0) {
								const suggestions = lines.slice(0, 3).map(l => this.cleanSuggestion(l, contextInfo.before)).filter(s => s.length > 0);
								if (suggestions.length > 0) {
									showInlineSuggestion(view, suggestions);
								}
							}
						}
					}
				}
			);

			// Don't trim the completion to preserve line breaks for list markers
			// Only remove trailing whitespace
			completion = completion.replace(/\s+$/, '');
			
			if (completion) {
				// Parse all suggestions (separated by newlines or numbers)
				const suggestions = this.parseSuggestions(completion, contextInfo.before);

				if (suggestions.length > 0) {
					// Hide loading and show all suggestions
					hideLoadingIndicator(view);
					showInlineSuggestion(view, suggestions);
					
					// Cache the suggestions
					this.cacheSuggestions(cacheKey, suggestions);
				} else {
					// No valid suggestions, hide loading
					hideLoadingIndicator(view);
				}
			} else {
				// No completion, hide loading
				hideLoadingIndicator(view);
			}
		} catch (error) {
			Logger.error('❌ Error:', error);
			// Hide loading on error
			hideLoadingIndicator(view);
		} finally {
			this.isGenerating = false;
		}
	}
	
	/**
	 * Generate cache key from context (optimized for better hit rate)
	 */
	private getCacheKey(context: string): string {
		// Use last 50 characters as cache key for better cache hits
		// Similar contexts will have same key
		const key = context.slice(-50).toLowerCase().trim();
		return key;
	}
	
	/**
	 * Cache suggestions with size limit
	 */
	private cacheSuggestions(key: string, suggestions: string[]): void {
		// Clean old cache entries if size limit reached
		if (this.suggestionCache.size >= this.MAX_CACHE_SIZE) {
			const oldestKey = this.suggestionCache.keys().next().value;
			if (oldestKey) {
				this.suggestionCache.delete(oldestKey);
			}
		}
		
		this.suggestionCache.set(key, {
			suggestions,
			timestamp: Date.now()
		});
	}
	
	/**
	 * Clean a single suggestion line
	 */
	private cleanSuggestion(line: string, context?: string): string {
		const lastWord = context ? context.trim().split(/\s+/).pop() || '' : '';
		const isEnglish = context && /[a-zA-Z]/.test(context) && !/[\u4e00-\u9fa5]/.test(context);
		const endsWithSpace = context ? context.endsWith(' ') : false;
		
		// Remove leading numbers and punctuation
		let cleaned = line.replace(/^[\d\.\)]+\s*/, '').trim();
		
		// Remove quotes if they wrap the entire suggestion
		if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
			(cleaned.startsWith("'") && cleaned.endsWith("'"))) {
			cleaned = cleaned.slice(1, -1).trim();
		}
		
		// Check if suggestion starts with the last word (duplication)
		if (lastWord && cleaned.toLowerCase().startsWith(lastWord.toLowerCase())) {
			cleaned = cleaned.substring(lastWord.length).trim();
		}
		
		// For English text, ensure correct spacing
		if (isEnglish) {
			if (endsWithSpace) {
				cleaned = cleaned.trimStart();
			} else {
				if (!cleaned.startsWith(' ')) {
					cleaned = ' ' + cleaned;
				}
			}
		}
		
		return cleaned;
	}

	/**
	 * Get context from document (ultra-optimized for speed)
	 */
	/**
	 * Get context before and after cursor
	 * @returns Object with before, after, and combined context
	 */
	private getContext(state: any, pos: number): { before: string; after: string; hasAfter: boolean } {
		const doc = state.doc;
		const currentLine = doc.lineAt(pos);
		
		// Ultra-fast: only use current line + previous line for minimal context
		const MAX_CONTEXT_CHARS = 150; // Reduced to 150 chars for speed
		
		const cursorInLine = pos - currentLine.from;
		const currentLineTextBefore = currentLine.text.substring(0, cursorInLine);
		const currentLineTextAfter = currentLine.text.substring(cursorInLine);
		
		// Get text after cursor (same line only, limited length)
		const textAfter = currentLineTextAfter.substring(0, 100).trim();
		const hasTextAfter = textAfter.length > 0;
		
		// Build context before cursor
		let contextBefore = currentLineTextBefore;
		
		// If current line is long enough, just use it
		if (currentLineTextBefore.length < 50 && currentLine.number > 1) {
			// Add previous line for more context
			const prevLine = doc.line(currentLine.number - 1);
			contextBefore = prevLine.text + '\n' + currentLineTextBefore;
		}
		
		// Limit context before cursor
		contextBefore = contextBefore.slice(-MAX_CONTEXT_CHARS);
		
		return {
			before: contextBefore,
			after: textAfter,
			hasAfter: hasTextAfter
		};
	}

	/**
	 * Build prompt for LLM to generate suggestions (optimized for speed)
	 * @param contextBefore Text before cursor
	 * @param contextAfter Text after cursor (empty if at end of line)
	 * @param hasAfter Whether there is text after cursor
	 * @param settings Autocomplete settings
	 */
	private buildPrompt(contextBefore: string, contextAfter: string, hasAfter: boolean, settings: any): string {
		// Detect language based on context
		const isEnglish = /[a-zA-Z]/.test(contextBefore) && !/[\u4e00-\u9fa5]/.test(contextBefore);
		
		// Check if context ends with a space (for English)
		const endsWithSpace = contextBefore.endsWith(' ');
		
		// Check if context ends with punctuation that suggests sentence completion
		const endsWithSentencePunctuation = /[.!?。！？]$/.test(contextBefore.trim());
		const endsWithPausePunctuation = /[,;:，；：]$/.test(contextBefore.trim());
		
		// Get granularity setting to control suggestion length
		const granularity = settings.granularity || 'phrase';
		
		// Get number of suggestions (default to 1 for speed, configurable)
		const numSuggestions = settings.maxSuggestions || 1; // Changed default to 1 for speed
		
		// Define length instructions based on granularity
		let lengthInstruction: string;
		let lengthExample: string;
		let punctuationNote: string;
		
		if (isEnglish) {
			// Punctuation guidance for English
			if (endsWithSentencePunctuation) {
				punctuationNote = 'Start a new sentence with proper capitalization';
			} else if (endsWithPausePunctuation) {
				punctuationNote = 'Continue the sentence naturally, add punctuation when needed';
			} else {
				punctuationNote = 'Include punctuation marks (commas, periods, etc.) when appropriate for natural flow';
			}
			
			switch (granularity) {
				case 'word':
					lengthInstruction = 'Generate VERY SHORT suggestions: only 1-2 words each';
					lengthExample = 'Examples: "beautiful", "important document", "quickly"';
					break;
				case 'phrase':
					lengthInstruction = 'Generate SHORT suggestions: 2-4 words each. When adding list items (bullets -, *, + or numbers 1., 2., or TODO markers), start each item on a new line';
					lengthExample = 'Examples: "of great importance", "key features:\n- High performance\n- Easy to use\n- Scalable"';
					break;
				case 'short-sentence':
					lengthInstruction = 'Generate MEDIUM suggestions: 6-12 words or up to one short sentence. When adding list items (bullets -, *, + or numbers 1., 2., or TODO markers), start each item on a new line';
					lengthExample = 'Examples: "is an important topic that needs attention.", "tasks:\n- [ ] Data processing\n- [x] Analytics\nTODO: Review"';
					break;
				case 'long-sentence':
					lengthInstruction = 'Generate LONGER suggestions: 12-25 words or one complete sentence. When adding list items (bullets -, *, + or numbers 1., 2., or TODO markers), start each item on a new line';
					lengthExample = 'Examples: "represents a fundamental shift in problem-solving.", "features:\n- Advanced capabilities\n- User-friendly\nNOTE: Requires setup"';
					break;
				default:
					lengthInstruction = 'Generate SHORT suggestions: 2-4 words each. When adding list items, start each item on a new line';
					lengthExample = 'Examples: "of great importance", "in the morning"';
			}
		} else {
			// Punctuation guidance for Chinese
			if (endsWithSentencePunctuation) {
				punctuationNote = '开始新的句子';
			} else if (endsWithPausePunctuation) {
				punctuationNote = '自然延续句子，在合适的地方添加标点符号';
			} else {
				punctuationNote = '在适当的地方包含标点符号（逗号、句号等），使语句通顺自然';
			}
			
			switch (granularity) {
				case 'word':
					lengthInstruction = '生成非常简短的建议：每个建议只有1-2个字';
					lengthExample = '示例："是"、"的"、"了"、"很好"';
					break;
				case 'phrase':
					lengthInstruction = '生成简短的建议：每个建议3-6个字。添加列表项（项目符号-、*、+，序号1.、2.，或TODO等标记）时，每项另起一行';
					lengthExample = '示例："是一个重要的"、"主要特点：\n- 高性能\n- 易于使用\n- 可扩展"';
					break;
				case 'short-sentence':
					lengthInstruction = '生成中等长度的建议：每个建议8-15个字或一个短句。添加列表项（项目符号-、*、+，序号1.、2.，或TODO等标记）时，每项另起一行';
					lengthExample = '示例："是一个需要深入探讨的重要问题。"、"任务：\n- [ ] 数据处理\n- [x] 分析功能\nTODO: 审查"';
					break;
				case 'long-sentence':
					lengthInstruction = '生成较长的建议：每个建议15-30个字或一个完整句子。添加列表项（项目符号-、*、+，序号1.、2.，或TODO等标记）时，每项另起一行';
					lengthExample = '示例："代表了处理问题解决方案的根本性转变。"、"主要功能：\n- 强大的能力\n- 友好的界面\n注意: 需要配置"';
					break;
				default:
					lengthInstruction = '生成简短的建议：每个建议3-6个字。添加列表项时，每项另起一行';
					lengthExample = '示例："是一个重要的"、"可以帮助我们"';
			}
		}
		
		let prompt: string;
		const suggestionText = numSuggestions === 1 ? '1' : `${numSuggestions}`;
		
		// Build prompt based on whether there's text after cursor
		if (isEnglish) {
			// Ultra-simplified English prompt for speed
			const spacingNote = endsWithSpace ? "Start with the word" : "Start with space + word";
			
			if (hasAfter) {
				// When there's text after cursor, provide both contexts
				prompt = `Complete the text at the cursor position. ${lengthInstruction}. ${punctuationNote}. ${spacingNote}.

Text before cursor: ${contextBefore}
Text after cursor: ${contextAfter}

Generate ${suggestionText} natural completion(s) that fit between the before and after text:`;
			} else {
				// Normal case: cursor at end of line
				prompt = `Continue this text with ${suggestionText} short suggestion(s). ${lengthInstruction}. ${punctuationNote}. ${spacingNote}.

Text: ${contextBefore}

Output ${suggestionText} continuation(s):`;
			}
		} else {
			// Ultra-simplified Chinese prompt for speed
			if (hasAfter) {
				// When there's text after cursor, provide both contexts
				prompt = `在光标位置补全文本。${lengthInstruction}。${punctuationNote}。

光标前文本：${contextBefore}
光标后文本：${contextAfter}

生成${suggestionText}个自然的补全，使前后文本衔接流畅：`;
			} else {
				// Normal case: cursor at end of line
				prompt = `续写以下文本，生成${suggestionText}个建议。${lengthInstruction}。${punctuationNote}。

文本：${contextBefore}

输出${suggestionText}个续写：`;
			}
		}

		return prompt;
	}

	/**
	 * Parse multiple suggestions from LLM response
	 */
	private parseSuggestions(completion: string, context?: string): string[] {
		Logger.debug('Input:', {
			completion,
			completionLength: completion.length,
			hasNewlines: /[\n\r]/.test(completion),
			context: context?.slice(-20)
		});
		
		// Get the last word from context to check for duplicates
		const lastWord = context ? context.trim().split(/\s+/).pop() || '' : '';
		
		// Check if context is English and ends with space
		const isEnglish = context && /[a-zA-Z]/.test(context) && !/[\u4e00-\u9fa5]/.test(context);
		const endsWithSpace = context ? context.endsWith(' ') : false;
		
		// Check if completion contains newlines and list markers BEFORE trimming
		const hasNewlines = /[\n\r]/.test(completion);
		const trimmedCompletion = completion.trim();
		const startsWithListMarker = /^[-*+]/.test(trimmedCompletion) || /^\d+\./.test(trimmedCompletion) || /^\[[\sx]\]/.test(trimmedCompletion) || /^(TODO|FIXME|NOTE|注意|待办):/i.test(trimmedCompletion);
		const hasListMarkers = hasNewlines && startsWithListMarker;
		
		Logger.debug('Detection:', {
			hasListMarkers,
			hasNewlines,
			startsWithListMarker,
			originalCompletion: completion,
			trimmedCompletion
		});
		
		// If it has list markers, keep the line breaks; otherwise process line by line
		if (hasListMarkers) {
			// Keep the entire completion with line breaks intact
			// Only remove trailing whitespace, preserve leading newlines
			let cleaned = completion.replace(/\s+$/, '');
			
			// Remove leading numbers and punctuation from the very first line only
			cleaned = cleaned.replace(/^[\d\.\)]+\s*/, '');
			
			// Remove quotes if they wrap the entire suggestion
			if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
			    (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
				cleaned = cleaned.slice(1, -1).trim();
			}
			
			// Check if suggestion starts with the last word (duplication)
			if (lastWord && cleaned.toLowerCase().startsWith(lastWord.toLowerCase())) {
				cleaned = cleaned.substring(lastWord.length).trim();
			}
			
			// For English text, ensure correct spacing at the start
			if (isEnglish) {
				if (endsWithSpace) {
					cleaned = cleaned.trimStart();
				} else {
					if (!cleaned.startsWith(' ') && !cleaned.startsWith('\n')) {
						cleaned = ' ' + cleaned;
					}
				}
			}
			
			Logger.debug('Result (with line breaks):', {
				cleaned,
				cleanedLength: cleaned.length,
				hasNewlines: /[\n\r]/.test(cleaned)
			});
			
			return cleaned.length > 0 ? [cleaned] : [];
		}
		
		// Original logic for non-list completions (single line)
		const lines = trimmedCompletion.split('\n')
			.map(line => line.trim())
			.filter(line => {
				// Remove numbered lists like "1. ", "2. ", etc
				return line.length > 0 && !line.match(/^\d+[\.\)]\s*$/);
			})
			.map(line => {
				// Remove leading numbers and punctuation
				let cleaned = line.replace(/^[\d\.\)]+\s*/, '').trim();
				
				// Remove quotes if they wrap the entire suggestion
				if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
				    (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
					cleaned = cleaned.slice(1, -1).trim();
				}
				
				// Check if suggestion starts with the last word (duplication)
				if (lastWord && cleaned.toLowerCase().startsWith(lastWord.toLowerCase())) {
					// Remove the duplicate word at the start
					cleaned = cleaned.substring(lastWord.length).trim();
				}
				
				// For English text, ensure correct spacing
				if (isEnglish) {
					if (endsWithSpace) {
						// Context ends with space, suggestion should NOT start with space
						cleaned = cleaned.trimStart();
					} else {
						// Context does NOT end with space, suggestion MUST start with space
						if (!cleaned.startsWith(' ')) {
							cleaned = ' ' + cleaned;
						}
					}
				}
				
				return cleaned;
			})
			.filter(line => line.length > 0);

		// Take up to 3 suggestions
		return lines.slice(0, 3);
	}

	/**
	 * Accept current suggestion
	 */
	accept(view: EditorView): boolean {
		return acceptInlineSuggestion(view);
	}

	/**
	 * Accept next word of the suggestion
	 */
	acceptNextWord(view: EditorView): boolean {
		// Check if there's remaining text before accepting
		const suggestionBefore = view.state.field(inlineSuggestionState);
		const textBefore = getCurrentSuggestionText(suggestionBefore);
		const hasRemainingBefore = textBefore && textBefore.length > 0;
		
		Logger.debug('Before accepting:', {
			textBefore,
			hasRemainingBefore,
			textLength: textBefore?.length
		});
		
		if (!hasRemainingBefore) {
			// No suggestion to accept
			return false;
		}
		
		// Record the time BEFORE accepting the word, so that handleDocumentChange
		// can detect we're actively accepting and preserve the suggestion
		this.lastAcceptWordTime = Date.now();
		
		// Get granularity from settings
		const granularity = this.plugin.settings.autocomplete.granularity;
		
		// acceptNextWordFromCompletion 现在会返回 false 当所有文本都被接受完毕
		const hasMoreText = acceptNextWordFromCompletion(view, granularity);
		
		// Check if we've consumed all the suggestion text
		const suggestionAfter = view.state.field(inlineSuggestionState);
		const textAfter = getCurrentSuggestionText(suggestionAfter);
		const hasRemainingAfter = textAfter && textAfter.length > 0;
		
		Logger.debug('After accepting:', {
			textAfter,
			hasRemainingAfter,
			textLength: textAfter?.length,
			hasMoreText,
			shouldTriggerNew: !hasMoreText && !hasRemainingAfter
		});
		
		// 如果 acceptNextWordFromCompletion 返回 false（没有更多文本了）
		// 并且 state 中也确实没有剩余文本，说明补全已完成
		if (!hasMoreText && !hasRemainingAfter) {
			Logger.debug('All consumed, triggering new completion in 200ms');
			// Reset the accept time so handleDocumentChange doesn't skip
			this.lastAcceptWordTime = 0;
			
			// 延迟触发新的补全，让状态更新和光标位置稳定
			setTimeout(() => {
				Logger.debug('Executing delayed handleDocumentChange for new completion');
				this.handleDocumentChange(view);
			}, 200);
		}
		
		return true;
	}

	/**
	 * Switch to next suggestion
	 */
	nextSuggestion(view: EditorView): boolean {
		return nextSuggestionFromCompletion(view);
	}

	/**
	 * Switch to previous suggestion
	 */
	previousSuggestion(view: EditorView): boolean {
		return previousSuggestionFromCompletion(view);
	}

	/**
	 * Cancel current suggestion
	 */
	cancel(view: EditorView): boolean {
		// Check if there's an active suggestion to cancel
		const suggestion = view.state.field(inlineSuggestionState);
		const hasSuggestion = suggestion.render && suggestion.suggestions.length > 0;
		
		if (hasSuggestion) {
			clearInlineSuggestion(view);
			return true;
		}
		
		return false;
	}
}
