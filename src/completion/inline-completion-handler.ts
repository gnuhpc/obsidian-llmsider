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
	
	// Session reuse for free models (to avoid creating new session for each completion)
	private completionProviderCache: WeakMap<any, { lastUsed: number }> = new WeakMap();
	private readonly SESSION_REUSE_DURATION = 300000; // 5 minutes - reuse session if used within this time
	private sessionCleanupInterval: NodeJS.Timeout | null = null;

	constructor(plugin: LLMSiderPlugin) {
		this.plugin = plugin;
		this.startSessionCleanup();
	}
	
	/**
	 * Start periodic cleanup of expired sessions
	 */
	private startSessionCleanup(): void {
		// Clean up expired sessions every 5 minutes
		this.sessionCleanupInterval = setInterval(() => {
			this.cleanupExpiredSessions();
		}, 300000); // 5 minutes
	}
	
	/**
	 * Clean up expired sessions for free models
	 */
	private cleanupExpiredSessions(): void {
		// Note: WeakMap doesn't allow iteration, but sessions are automatically
		// garbage collected when providers are no longer referenced
		Logger.debug('[Completion] Session cleanup check completed');
	}
	
	/**
	 * Clear all cached sessions (useful when switching models)
	 */
	clearSessionCache(): void {
		// WeakMap will be automatically cleaned up
		// We just need to create a new instance
		this.completionProviderCache = new WeakMap();
		Logger.info('[Completion] Session cache cleared');
	}
	
	/**
	 * Cleanup when handler is destroyed
	 */
	destroy(): void {
		if (this.sessionCleanupInterval) {
			clearInterval(this.sessionCleanupInterval);
			this.sessionCleanupInterval = null;
		}
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	/**
	 * Handle document changes (called on every keystroke)
	 */
	async handleDocumentChange(view: EditorView) {
		// console.log('[Completion] handleDocumentChange called');
		
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
			Logger.debug('[Completion] User is actively accepting words, skipping trigger');
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

		// Get current token (word/text before cursor)
		// Split by spaces and common punctuation
		const currentToken = textBeforeCursor.split(/[\s\-\*\.\,\;:\!\?\(\)\[\]\{\}]/).pop() || '';

		// Minimal check: only require at least 1 character to trigger
		// This allows completion anywhere: after bullet points, mid-text, end of line, etc.
		if (currentToken.length < 1 && textBeforeCursor.trim().length === 0) {
			clearInlineSuggestion(view);
			return;
		}

		// Calculate delay: use very short delay for speed (100ms default)
		const isRecentlyAccepting = timeSinceLastAcceptWord < this.EXTENDED_DELAY_WINDOW;
		const baseDelay = Math.max(100, settings.triggerDelay || 100); // Minimum 100ms
		const delay = isRecentlyAccepting ? this.EXTENDED_DELAY : baseDelay;

		Logger.debug(`[Completion] Triggering in ${delay}ms (currentToken: "${currentToken}")`);

		// Debounce: wait for user to stop typing
		this.debounceTimer = setTimeout(async () => {
			Logger.debug('[Completion] Debounce timer fired, generating suggestion...');
			await this.generateSuggestion(view);
		}, delay);
	}

	/**
	 * Generate suggestions from LLM (generate 1-3 variations based on settings)
	 */
	private async generateSuggestion(view: EditorView) {
		if (this.isGenerating) {
			Logger.debug('[Completion] Already generating, skipping');
			return;
		}

		this.isGenerating = true;
		
		// Track timing (declare outside try block so finally can access it)
		const startTime = Date.now();

		try {
			// Try to get specific autocompletion model, fall back to active provider
			const completionModelId = this.plugin.settings.autocomplete.modelId;
			const provider = completionModelId 
				? this.plugin.getProviderByModelId(completionModelId) || this.plugin.getActiveProvider()
				: this.plugin.getActiveProvider();
			
			if (!provider) {
				Logger.warn('[Completion] No provider found for autocomplete');
				return;
			}

			// Set a stable thread ID for autocomplete to reuse sessions in free models
			provider.setThreadId('autocomplete-session');

			Logger.debug(`[Completion] Using provider: ${provider.getProviderName()} (Model: ${completionModelId || 'default'})`);
			
			// For free models (free-qwen, free-deepseek, hugging-chat), reuse existing session
			// to avoid creating a new session for each completion request
			const providerName = provider.getProviderName();
			const isFreeModel = providerName === 'free-qwen' || 
			                    providerName === 'free-deepseek' || 
			                    providerName === 'hugging-chat';
			
			if (isFreeModel) {
				// Check if we have cached this provider recently
				const cached = this.completionProviderCache.get(provider);
				const now = Date.now();
				
				if (cached && (now - cached.lastUsed) < this.SESSION_REUSE_DURATION) {
					// Session is still fresh, update last used time
					cached.lastUsed = now;
					Logger.debug(`[Completion] Reusing ${providerName} session (last used ${Math.round((now - cached.lastUsed) / 1000)}s ago)`);
				} else {
					// First time or session expired, mark for reuse
					this.completionProviderCache.set(provider, { lastUsed: now });
					Logger.debug(`[Completion] Initializing ${providerName} session for reuse`);
				}
			}

			// Get context
			const state = view.state;
			const pos = state.selection.main.head;
			const contextInfo = this.getContext(state, pos);
			
			// Check cache first
			const cacheKey = this.getCacheKey(contextInfo.before);
			const cached = this.suggestionCache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
				Logger.debug('[Completion] Cache hit, showing cached suggestions');
				// Use cached suggestions
				showInlineSuggestion(view, cached.suggestions);
				this.isGenerating = false;
				return;
			}

		// Show loading indicator
		showLoadingIndicator(view);

		// Build prompt for multiple suggestions
		const settings = this.plugin.settings.autocomplete;
		const prompt = this.buildPrompt(contextInfo.before, contextInfo.after, contextInfo.hasAfter, contextInfo.isNewSentence, settings);
		
		Logger.debug('[Completion] Prompt built:', prompt);

		// Track timing for chunks
		let firstChunkTime = 0;
		let lastChunkTime = 0;
		let chunkCount = 0;

		// Call LLM with streaming - show suggestion immediately as it comes
			let completion = '';
			let displayedSomething = false;
			let currentWord = '';
			const MIN_DISPLAY_LENGTH = 3; // Minimum characters before showing
			
			Logger.debug('[Completion] Sending streaming request...');
			
			await provider.sendStreamingMessage(
				[{ role: 'user', content: prompt, id: '', timestamp: Date.now() }],
				(chunk) => {
					if (chunk.delta) {
						// Track timing
						chunkCount++;
						const now = Date.now();
						if (firstChunkTime === 0) {
							firstChunkTime = now;
							Logger.debug('[Completion] Time to first chunk:', (firstChunkTime - startTime), 'ms');
						}
						lastChunkTime = now;
						
						// Logger.debug('[Completion] Chunk #' + chunkCount + ':', {
						// 	delta: chunk.delta,
						// 	deltaLength: chunk.delta.length,
						// 	elapsed: (now - startTime) + 'ms'
						// });
						
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

			Logger.debug('[Completion] Streaming finished. Total chunks:', chunkCount, 'Total time:', (Date.now() - startTime), 'ms');

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
					Logger.warn('[Completion] No valid suggestions after parsing');
				}
			} else {
				// No completion, hide loading
				hideLoadingIndicator(view);
				Logger.warn('[Completion] ⚠️ Empty completion received');
			}
		} catch (error) {
			Logger.error('[Completion] Error during completion:', error);
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
	 * Get context from document (optimized for 2-sentence context)
	 * Smart logic:
	 * - Extract up to 2 sentences before cursor
	 * - Extract up to 2 sentences after cursor
	 * - If cursor is at sentence boundary (start): use previous sentences as before context
	 * - If cursor is at sentence boundary (end): use next sentences as after context
	 * @returns Object with before, after, hasAfter, and isNewSentence flag
	 */
	private getContext(state: { doc: { toString(): string } }, pos: number): { before: string; after: string; hasAfter: boolean; isNewSentence: boolean } {
		const doc = state.doc;
		
		// Get all text in the document
		const fullText = doc.toString();
		
		// Sentence delimiters (Chinese and English)
		const sentenceDelimiters = /[.!?。！？\n\r]/;
		
	// Find sentence boundaries around cursor - collect up to 2 sentences before and after
	const sentenceBoundaries: number[] = [0]; // Start with document beginning
	
	// Scan entire text to find all sentence delimiters
	for (let i = 0; i < fullText.length && i < pos + 1000; i++) {
		if (sentenceDelimiters.test(fullText[i])) {
			sentenceBoundaries.push(i + 1);
		}
	}
	sentenceBoundaries.push(fullText.length); // End with document end
	
	// Find which sentence the cursor is in
	let cursorSentenceIndex = 0;
	for (let i = 0; i < sentenceBoundaries.length - 1; i++) {
		if (pos >= sentenceBoundaries[i] && pos <= sentenceBoundaries[i + 1]) {
			cursorSentenceIndex = i;
			break;
		}
	}
	
	// Extract up to 2 sentences before cursor position
	const beforeStartIndex = Math.max(0, cursorSentenceIndex - 1);
	const beforeStart = sentenceBoundaries[beforeStartIndex];
	let contextBefore = fullText.substring(beforeStart, pos).trim();
	
	// Extract up to 2 sentences after cursor position
	const afterEndIndex = Math.min(sentenceBoundaries.length - 1, cursorSentenceIndex + 3);
	const afterEnd = sentenceBoundaries[afterEndIndex];
	let contextAfter = fullText.substring(pos, afterEnd).trim();
	
	// Check if cursor is at sentence start
	const sentenceStart = sentenceBoundaries[cursorSentenceIndex];
	const foundStartDelimiter = cursorSentenceIndex > 0;
	
	// Special case: If cursor is at the start of a sentence (contextBefore is empty in current sentence)
	// Extend to include previous 2 complete sentences
	if (contextBefore.length === 0 && foundStartDelimiter && cursorSentenceIndex > 0) {
		const extendedStartIndex = Math.max(0, cursorSentenceIndex - 2);
		const extendedStart = sentenceBoundaries[extendedStartIndex];
		contextBefore = fullText.substring(extendedStart, sentenceStart).trim();
	}
	
	// Special case: If cursor is at the end of a sentence (contextAfter is empty in current sentence)
	// Extend to include next 2 complete sentences
	const currentSentenceEnd = sentenceBoundaries[cursorSentenceIndex + 1];
	if (contextAfter.length === 0 && cursorSentenceIndex < sentenceBoundaries.length - 2) {
		const extendedEndIndex = Math.min(sentenceBoundaries.length - 1, cursorSentenceIndex + 3);
		const extendedEnd = sentenceBoundaries[extendedEndIndex];
		contextAfter = fullText.substring(currentSentenceEnd, extendedEnd).trim();
	}
	
	const hasTextAfter = contextAfter.length > 0;
	
	// Check if this is a new sentence start:
	// 1. Found a delimiter before cursor (foundStartDelimiter = true)
	// 2. No text before cursor in current sentence (original contextBefore was empty)
	// 3. We used previous sentence as context (contextBefore comes from previous sentence)
	const isNewSentence = foundStartDelimiter && sentenceStart === pos;
	
	return {
		before: contextBefore,
		after: contextAfter,
		hasAfter: hasTextAfter,
		isNewSentence: isNewSentence
	};
}	/**
	 * Build prompt for LLM to generate suggestions (optimized for speed and clarity)
	 * @param contextBefore Text before cursor
	 * @param contextAfter Text after cursor (empty if at end of line)
	 * @param hasAfter Whether there is text after cursor
	 * @param isNewSentence Whether this is the start of a new sentence
	 * @param settings Autocomplete settings
	 */
	private buildPrompt(contextBefore: string, contextAfter: string, hasAfter: boolean, isNewSentence: boolean, settings: unknown): string {
		// Detect language based on context - check for Chinese characters
		const hasChinese = /[\u4e00-\u9fa5]/.test(contextBefore);
		const hasEnglish = /[a-zA-Z]/.test(contextBefore);
		
		// Determine primary language (Chinese takes priority in mixed content)
		const isChinese = hasChinese;
		const isEnglish = !hasChinese && hasEnglish;
		
		// Check if context ends with a space (for spacing logic)
		const endsWithSpace = contextBefore.endsWith(' ');
		
		// Get granularity setting to control suggestion length
		const granularity = (settings as { granularity?: string }).granularity || 'phrase';
		
		// Get number of suggestions (default to 1 for speed)
		const numSuggestions = (settings as { maxSuggestions?: number }).maxSuggestions || 1;
		
		// Define length limits based on granularity
		let lengthLimit: string;
		
		if (isChinese) {
			if (granularity === 'phrase') {
		lengthLimit = '3-6字';
	} else if (granularity === 'long-sentence') {
		// Randomly pick a sub-range within 15-30 for variety
		const minLen = 15 + Math.floor(Math.random() * 6); // 15-20
		const maxLen = minLen + 8 + Math.floor(Math.random() * 4); // +8 to +11
		const commaNote = Math.random() > 0.5 ? '，可以包含逗号' : '';
		lengthLimit = `${minLen}-${maxLen}字${commaNote}`;
	} else {
		lengthLimit = '8-15字';
			}
		} else if (isEnglish) {
			if (granularity === 'phrase') {
		lengthLimit = '2-5 words';
	} else if (granularity === 'long-sentence') {
		// Randomly pick a sub-range within 12-25 for variety
		const minLen = 12 + Math.floor(Math.random() * 5); // 12-16
		const maxLen = minLen + 7 + Math.floor(Math.random() * 4); // +7 to +10
		const commaNote = Math.random() > 0.5 ? ', may include commas' : '';
		lengthLimit = `${minLen}-${maxLen} words${commaNote}`;
	} else {
		lengthLimit = '6-12 words';
			}
		} else {
			// Mixed or unknown language, use generic guidance
			if (granularity === 'phrase') {
				lengthLimit = 'a short phrase';
			} else if (granularity === 'long-sentence') {
				lengthLimit = 'one complete sentence';
			} else {
				lengthLimit = 'a short sentence';
			}
		}
		
	// Build prompt
	let prompt: string;
	
if (isChinese) {
	// Chinese prompt - simple and direct
	if (hasAfter) {
		const newSentenceNote = isNewSentence ? '\n5. 注意：这是一个新句子的开始，必须包含完整的主谓宾结构，不是前文的延续' : '';
		const multipleNote = numSuggestions > 1 ? `\n6. 提供${numSuggestions}个不同的续写选项，每个一行` : '';
		prompt = `续写文本（光标位置）：
前文：${contextBefore}
后文：${contextAfter}

要求：
1. 长度限制：${lengthLimit}
2. 保持前后衔接自然流畅
3. 只输出续写内容，不要解释
4. 使用中文${newSentenceNote}${multipleNote}

续写：`;
	} else {
		const newSentenceNote = isNewSentence ? '\n4. 注意：这是一个新句子的开始，必须包含完整的主谓宾结构，不是前文的延续' : '';
		const multipleNote = numSuggestions > 1 ? `\n5. 提供${numSuggestions}个不同的续写选项，每个一行` : '';
		prompt = `续写文本：
${contextBefore}

要求：
1. 长度限制：${lengthLimit}
2. 只输出续写内容，不要解释
3. 使用中文${newSentenceNote}${multipleNote}

续写：`;
		}
		} else if (isEnglish) {
	// English prompt - simple and direct
	const spacingNote = endsWithSpace ? '' : '\n4. Start with a space if continuing the same line';
	const newSentenceNote = isNewSentence ? '\n5. Note: This is the START of a NEW sentence with complete subject-verb-object structure, not a continuation of the previous one' : '';
	const multipleNote = numSuggestions > 1 ? `\n6. Provide ${numSuggestions} different options, one per line` : '';
	
	if (hasAfter) {
		prompt = `Continue the text at cursor position:
Before: ${contextBefore}
After: ${contextAfter}

Requirements:
1. Length: ${lengthLimit}
2. Must connect naturally between before and after text
3. Output ONLY the continuation, no explanations
4. Use English${spacingNote}${newSentenceNote}${multipleNote}

Continuation:`;
		} else {
			prompt = `Continue this text:
${contextBefore}

Requirements:
1. Length: ${lengthLimit}
2. Output ONLY the continuation, no explanations
3. Use English${spacingNote}${newSentenceNote}${multipleNote}

Continuation:`;
		}
		} else {
			// Mixed or generic prompt
			if (hasAfter) {
				prompt = `Complete text at cursor:
Before: ${contextBefore}
After: ${contextAfter}

Length: ${lengthLimit}
Output only the completion text that naturally connects before and after.

Completion:`;
			} else {
				prompt = `Continue this text:
${contextBefore}

Length: ${lengthLimit}
Output only the continuation text.

Continuation:`;
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
