import { diffChars, diffWords, diffLines, diffSentences, createPatch } from 'diff';
import { Logger } from './logger';
import { ChatMessage } from '../types';
import { App, TFile, Notice } from 'obsidian';
import LLMSiderPlugin from '../main';

// Type definitions for diff operations
interface DiffChange {
	type: 'add' | 'remove' | 'context';
	content: string;
}

interface DiffHunk {
	oldStart: number;
	oldCount: number;
	newStart: number;
	newCount: number;
	changes: DiffChange[];
	removedLines?: string[];
	addedLines?: string[];
	contextLines?: string[];
}

export class DiffProcessor {
	private app: App;
	private plugin: LLMSiderPlugin;

	constructor(app: App, plugin: LLMSiderPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	/**
	 * Check if message content contains diff format
	 */
	containsDiff(content: string): boolean {
		Logger.debug('Checking content for diff patterns');
		Logger.debug('Content length:', content.length);
		Logger.debug('Content preview:', content.substring(0, 300));
		
		// Look for diff markers - support both unified diff and inline diff formats
		const diffPatterns = [
			/```diff[^`]*```/,  // diff code blocks (multiline)
			/@@\s*-\d+,?\d*\s+\+\d+,?\d*\s*@@/,  // hunk headers
			/^[\s]*[-+]\s*.+$/m,  // lines starting with - or + (with optional whitespace)
			/^[\s]*-[^-]/m,  // lines starting with single - (not ---)
			/^[\s]*\+[^+]/m,  // lines starting with single + (not +++)
			/\[-[^\]]+\-\]/,  // inline diff deletions: [-deleted text-]
			/\[\+[^\]]+\+\]/,  // inline diff additions: [+added text+]
		];
		
		let hasDiff = false;
		diffPatterns.forEach((pattern, index) => {
			const matches = pattern.test(content);
			Logger.debug(`Pattern ${index} (${pattern.source}): ${matches}`);
			if (matches) {
				hasDiff = true;
				// Show the match for debugging
				const match = content.match(pattern);
				if (match) {
					Logger.debug(`Match found:`, match[0]);
				}
			}
		});
		
		if (hasDiff) {
			Logger.debug('✅ Diff detected in content');
		} else {
			Logger.debug('❌ No diff detected in content');
		}
		
		return hasDiff;
	}

	/**
	 * Check if content contains inline diff format
	 */
	containsInlineDiff(content: string): boolean {
		const inlineDiffPatterns = [
			/\[-[^\]]+\-\]/,  // inline diff deletions: [-deleted text-]
			/\[\+[^\]]+\+\]/,  // inline diff additions: [+added text+]
		];
		
		return inlineDiffPatterns.some(pattern => pattern.test(content));
	}




	/**
	 * Generate enhanced diff using jsdiff with fine-grained character-level detection
	 */
	private generateEnhancedDiff(originalContent: string, modifiedContent: string): any {
		Logger.debug('Generating enhanced diff with fine-grained inline detection');
		
		// Check if Intl.Segmenter is available for better word boundary detection
		const hasSegmenter = 'Segmenter' in Intl;
		Logger.debug('Intl.Segmenter available:', hasSegmenter);

		// For inline diff, we want character-level precision
		// This provides the most detailed view of what changed
		const charDiff = diffChars(originalContent, modifiedContent);
		
		// Also generate word diff with enhanced segmentation for comparison
		let diffOptions = {};
		if (hasSegmenter) {
			try {
				const segmenter = new (Intl as any).Segmenter('zh-CN', { granularity: 'word' });
				diffOptions = { intlSegmenter: segmenter };
				Logger.debug('Created Intl.Segmenter for Chinese text');
			} catch (error) {
				Logger.debug('Failed to create Intl.Segmenter, using default:', error);
			}
		}

		const wordDiff = diffWords(originalContent, modifiedContent, diffOptions);
		const lineDiff = diffLines(originalContent, modifiedContent);
		const sentenceDiff = diffSentences(originalContent, modifiedContent);

		// Merge adjacent char diffs of the same type for better readability
		// This prevents showing every single character as a separate change
		const mergedCharDiff = this.mergeAdjacentDiffs(charDiff);
		Logger.debug('Merged char diff parts:', mergedCharDiff.length, 'from', charDiff.length);

		// Create unified patch for traditional diff display
		const unifiedPatch = createPatch(
			'original',
			originalContent,
			modifiedContent,
			'Original version',
			'Modified version'
		);

		// Calculate change statistics
		const stats = {
			charactersAdded: charDiff.filter((part: any) => part.added).reduce((sum: any, part: any) => sum + part.value.length, 0),
			charactersRemoved: charDiff.filter((part: any) => part.removed).reduce((sum: any, part: any) => sum + part.value.length, 0),
			wordsAdded: wordDiff.filter((part: any) => part.added).length,
			wordsRemoved: wordDiff.filter((part: any) => part.removed).length,
			linesAdded: lineDiff.filter((part: any) => part.added).reduce((sum: any, part: any) => sum + part.value.split('\n').length - 1, 0),
			linesRemoved: lineDiff.filter((part: any) => part.removed).reduce((sum: any, part: any) => sum + part.value.split('\n').length - 1, 0),
			sentencesAdded: sentenceDiff.filter((part: any) => part.added).length,
			sentencesRemoved: sentenceDiff.filter((part: any) => part.removed).length
		};

		const hasChanges = stats.charactersAdded > 0 || stats.charactersRemoved > 0;

		Logger.debug('Enhanced diff stats:', stats);

		// Return merged char diff for inline visualization (more detailed)
		// but keep word diff for reference
		return {
			hasChanges,
			charDiff: mergedCharDiff, // Use merged version for display
			wordDiff: mergedCharDiff,  // Use char diff for inline view (more precise)
			lineDiff,
			sentenceDiff,
			unifiedPatch,
			stats,
			changesSummary: this.generateChangesSummary(stats),
			algorithm: hasSegmenter ? 'enhanced-segmenter-char' : 'standard-char'
		};
	}

	/**
	 * Merge adjacent diff parts of the same type for better readability
	 * This prevents showing every single character as a separate change
	 */
	private mergeAdjacentDiffs(diffs: any[]): any[] {
		if (!diffs || diffs.length === 0) return diffs;

		const merged: any[] = [];
		let current = { ...diffs[0] };

		for (let i = 1; i < diffs.length; i++) {
			const next = diffs[i];
			
			// Check if we can merge with current
			// Merge if: both are added, both are removed, or both are context
			const sameType = (current.added && next.added) || 
			                 (current.removed && next.removed) ||
			                 (!current.added && !current.removed && !next.added && !next.removed);
			
			// Also check if the text should be merged (not separated by significant whitespace)
			const shouldMerge = sameType && this.shouldMergeDiffParts(current.value, next.value);

			if (shouldMerge) {
				// Merge the values
				current.value += next.value;
			} else {
				// Push current and start a new one
				merged.push(current);
				current = { ...next };
			}
		}
		
		// Push the last one
		merged.push(current);

		return merged;
	}

	/**
	 * Determine if two diff parts should be merged based on their content
	 */
	private shouldMergeDiffParts(value1: string, value2: string): boolean {
		// Don't merge if separated by line breaks
		if (value1.endsWith('\n') || value2.startsWith('\n')) {
			return false;
		}
		
		// Don't merge if the gap between words is too large
		// (more than one space might indicate separate words)
		if (value1.endsWith('  ') || value2.startsWith('  ')) {
			return false;
		}

		// Merge everything else for smooth inline display
		return true;
	}
	/**
	 * Generate diff using jsdiff with Intl.Segmenter for better word segmentation
	 */
	generateJSDiff(originalContent: string, modifiedContent: string): any {
		Logger.debug('Starting enhanced diff generation with Intl.Segmenter');
		Logger.debug('Original content length:', originalContent?.length || 0);
		Logger.debug('Modified content length:', modifiedContent?.length || 0);
		Logger.debug('Original content preview:', originalContent?.substring(0, 100) || 'undefined');
		Logger.debug('Modified content preview:', modifiedContent?.substring(0, 100) || 'undefined');

		if (!originalContent || !modifiedContent) {
			Logger.debug('Missing content - no diff generated');
			return { hasChanges: false, reason: 'Missing content' };
		}

		if (originalContent === modifiedContent) {
			Logger.debug('Identical content - no diff generated');
			return { hasChanges: false, reason: 'Identical content' };
		}

		// Use enhanced word diff with Intl.Segmenter for better Chinese support
		const result = this.generateEnhancedDiff(originalContent, modifiedContent);

		Logger.debug('Final diff result:', {
			hasChanges: result.hasChanges,
			changesSummary: result.changesSummary,
			wordDiffLength: result.wordDiff?.length || 0,
			algorithm: result.algorithm
		});

		return result;
	}

	/**
	 * Generate a human-readable summary of changes
	 */
	private generateChangesSummary(stats: any): string {
		const changes = [];
		const i18n = this.plugin.i18n;
		
		if (stats.charactersAdded > 0) {
			changes.push(`+${stats.charactersAdded} ${i18n.t('common.characters')}`);
		}
		if (stats.charactersRemoved > 0) {
			changes.push(`-${stats.charactersRemoved} ${i18n.t('common.characters')}`);
		}
		if (stats.wordsAdded > 0) {
			changes.push(`+${stats.wordsAdded} ${i18n.t('common.words')}`);
		}
		if (stats.wordsRemoved > 0) {
			changes.push(`-${stats.wordsRemoved} ${i18n.t('common.words')}`);
		}
		if (stats.linesAdded > 0) {
			changes.push(`+${stats.linesAdded} ${i18n.t('common.lines')}`);
		}
		if (stats.linesRemoved > 0) {
			changes.push(`-${stats.linesRemoved} ${i18n.t('common.lines')}`);
		}

		return changes.length > 0 ? changes.join(', ') : i18n.t('common.noChangesDetected');
	}

	/**
	 * Render JSDiff visualization with clean inline display
	 */
	renderJSDiffVisualization(contentEl: HTMLElement, diffResult: any, originalContent: string, modifiedContent: string, selectedTextContext?: any): void {
		Logger.debug('Starting inline diff visualization');
		Logger.debug('diffResult:', diffResult);
		Logger.debug('originalContent length:', originalContent?.length || 0);
		Logger.debug('modifiedContent length:', modifiedContent?.length || 0);

		if (!diffResult.hasChanges) {
			Logger.debug('No changes detected');
			contentEl.createEl('div', { 
				cls: 'llmsider-no-changes',
				text: 'No changes detected in the content.' 
			});
			return;
		}

		Logger.debug('Changes detected, creating diff container');
		// Create main diff container
		const diffContainer = contentEl.createDiv({ cls: 'llmsider-inline-diff-container' });

		Logger.debug('About to render inline diff with wordDiff:', diffResult.wordDiff);
		Logger.debug('wordDiff length:', diffResult.wordDiff?.length || 0);
		
		// Render inline diff directly
		this.renderInlineDiff(diffContainer, diffResult.wordDiff);

		Logger.debug('Inline diff visualization completed');
	}

	/**
	 * Render inline diff with proper highlighting and formatting
	 * Creates a fine-grained inline diff view showing additions and deletions within the same paragraph
	 */
	private renderInlineDiff(container: HTMLElement, wordDiff: any[]): void {
		Logger.debug('renderInlineDiff called');
		Logger.debug('wordDiff input:', wordDiff);
		Logger.debug('wordDiff is array:', Array.isArray(wordDiff));
		Logger.debug('wordDiff length:', wordDiff?.length || 0);

		if (!wordDiff || !Array.isArray(wordDiff)) {
			Logger.error('Invalid wordDiff data:', wordDiff);
			container.createEl('div', { text: 'Error: Invalid diff data' });
			return;
		}

		const inlineContainer = container.createDiv({ 
			cls: 'llmsider-inline-diff-content'
		});
		
		Logger.debug('Created inline container');
		
		// Process diff parts with inline change merging
		// This creates a view where deletions and additions appear inline in the same paragraph
		let i = 0;
		while (i < wordDiff.length) {
			const part = wordDiff[i];
			
			if (!part.value) {
				Logger.warn(`Part ${i} has no value`);
				i++;
				continue;
			}

			// Check if this is a removal followed by an addition (replacement pattern)
			const nextPart = i + 1 < wordDiff.length ? wordDiff[i + 1] : null;
			const isReplacement = part.removed && nextPart && nextPart.added;

			if (isReplacement) {
				// Create an inline replacement group: show deletion then addition
				Logger.debug(`Found replacement at index ${i}`);
				
				// Process the removed part
				this.renderDiffPart(inlineContainer, part.value, 'removed');
				
				// Add a visual separator for replacement (optional)
				// inlineContainer.createEl('span', { 
				// 	cls: 'llmsider-diff-separator',
				// 	text: ' → '
				// });
				
				// Process the added part
				this.renderDiffPart(inlineContainer, nextPart.value, 'added');
				
				// Skip the next part as we've already processed it
				i += 2;
			} else if (part.removed) {
				// Standalone removal
				Logger.debug(`Processing removal at index ${i}`);
				this.renderDiffPart(inlineContainer, part.value, 'removed');
				i++;
			} else if (part.added) {
				// Standalone addition
				Logger.debug(`Processing addition at index ${i}`);
				this.renderDiffPart(inlineContainer, part.value, 'added');
				i++;
			} else {
				// Context (unchanged text)
				Logger.debug(`Processing context at index ${i}`);
				this.renderDiffPart(inlineContainer, part.value, 'context');
				i++;
			}
		}
		
		Logger.debug('renderInlineDiff completed');
		Logger.debug('Final container HTML:', inlineContainer.innerHTML.substring(0, 200));
	}

	/**
	 * Render a single diff part (added, removed, or context)
	 * Handles line breaks properly while maintaining inline display
	 */
	private renderDiffPart(container: HTMLElement, value: string, type: 'added' | 'removed' | 'context'): void {
		// Split by line breaks to handle multi-line content
		const lines = value.split('\n');
		
		lines.forEach((line: string, lineIndex: number) => {
			// Skip empty lines at the beginning or end
			if (line.length === 0 && (lineIndex === 0 || lineIndex === lines.length - 1)) {
				if (lineIndex < lines.length - 1) {
					container.createEl('br');
				}
				return;
			}
			
			// Create element based on diff type
			let span: HTMLElement;
			if (type === 'added') {
				span = container.createEl('span', { 
					cls: 'llmsider-diff-added-inline'
				});
			} else if (type === 'removed') {
				span = container.createEl('span', { 
					cls: 'llmsider-diff-removed-inline'
				});
			} else {
				span = container.createEl('span', { 
					cls: 'llmsider-diff-context-inline'
				});
			}
			span.textContent = line;
			
			// Add line break if not the last line
			if (lineIndex < lines.length - 1) {
				container.createEl('br');
			}
		});
	}

	/**
	 * Extract diff blocks from message content
	 */
	extractDiffBlocks(content: string): string[] {
		const diffBlocks: string[] = [];
		
		Logger.debug('Starting diff block extraction');
		
		// Look for ```diff code blocks first
		const diffBlockRegex = /```diff\s*\n([\s\S]*?)\n```/g;
		let match;
		
		while ((match = diffBlockRegex.exec(content)) !== null) {
			diffBlocks.push(match[1].trim());
			Logger.debug('Found diff code block:', match[1].substring(0, 100));
		}
		
		// If no formal diff blocks found, check if the entire content is a unified diff
		if (diffBlocks.length === 0) {
			Logger.debug('No diff code blocks found, checking for raw diff format');
			
			// Check if content looks like a unified diff (contains @@ headers and +/- lines)
			const hasHunkHeaders = /@@\s*-\d+,?\d*\s+\+\d+,?\d*\s*@@/.test(content);
			const hasDiffLines = /^[+-].*/m.test(content);
			
			if (hasHunkHeaders && hasDiffLines) {
				Logger.debug('Content appears to be raw unified diff format');
				diffBlocks.push(content.trim());
			}
		}
		
		Logger.debug('Extracted', diffBlocks.length, 'diff blocks');
		return diffBlocks;
	}

	/**
	 * Apply inline diff format to get the final content
	 */
	applyInlineDiff(messageContent: string): string {
		Logger.debug('Starting inline diff application');
		
		// Extract diff content from code blocks if present
		let diffContent = messageContent;
		const diffBlockRegex = /```diff\s*\n([\s\S]*?)\n```/g;
		const match = diffBlockRegex.exec(messageContent);
		
		if (match) {
			diffContent = match[1];
			Logger.debug('Extracted diff content from code block');
		}
		
		// Process the content to apply inline diff markers
		let result = diffContent;
		
		// Remove diff headers (--- and +++ lines)
		result = result.replace(/^---\s+.*$/gm, '');
		result = result.replace(/^\+\+\+\s+.*$/gm, '');
		
		// Remove hunk headers (@@ lines)
		result = result.replace(/^@@.*@@$/gm, '');
		
		// Process line-by-line changes first
		const lines = result.split('\n');
		const processedLines: string[] = [];
		
		for (const line of lines) {
			if (line.startsWith('-')) {
				// Skip removed lines - they're replaced by + lines with inline markers
				continue;
			} else if (line.startsWith('+')) {
				// Process added lines (may contain inline markers)
				const cleanLine = line.substring(1); // Remove + prefix
				processedLines.push(cleanLine);
			} else if (line.trim()) {
				// Keep context lines as-is
				processedLines.push(line);
			}
		}
		
		result = processedLines.join('\n');
		
		// Apply inline diff markers
		// Remove deletions: [-deleted text-]
		result = result.replace(/\[-[^\]]*\-\]/g, '');
		
		// Apply additions: [+added text+] -> added text
		result = result.replace(/\[\+([^\]]*)\+\]/g, '$1');
		
		// Clean up any extra whitespace
		result = result.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove triple line breaks
		result = result.trim();
		
		Logger.debug('Final result length:', result.length);
		
		return result;
	}

	/**
	 * Apply changes to the current note
	 */
	async applyChanges(originalContent: string, modifiedContent: string): Promise<void> {
		try {
			const activeFile = this.app.workspace.getActiveFile();
			if (!activeFile) {
				new Notice('No active note found to apply changes to.');
				return;
			}

			Logger.debug('Applying changes to note:', activeFile.basename);

			// Verify current file content matches original
			const currentContent = await this.app.vault.read(activeFile);
			if (currentContent !== originalContent) {
				const proceed = confirm('The note has been modified since the improvements were generated. Apply changes anyway?');
				if (!proceed) return;
			}

			// Apply the improvements
			await this.app.vault.modify(activeFile, modifiedContent);
			new Notice(`Applied improvements to "${activeFile.basename}"`);

			Logger.debug('Successfully applied changes');

		} catch (error) {
			Logger.error('Failed to apply changes:', error);
			new Notice('Failed to apply changes: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	}

	/**
	 * Copy content as Markdown
	 */
	private async copyAsMarkdown(content: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(content);
			new Notice('Content copied to clipboard');
			Logger.debug('Copied content to clipboard:', content.length + ' characters');
		} catch (error) {
			Logger.error('Failed to copy to clipboard:', error);
			new Notice('Failed to copy to clipboard');
		}
	}

	/**
	 * Generate new Note from content with AI-generated title
	 */
	private async generateNewNote(content: string): Promise<void> {
		let notice: Notice | null = null;
		try {
			Logger.debug('Generating new note from content...', {
				contentLength: content.length,
				content: content.substring(0, 100)
			});

			// Validate content
			if (!content || content.trim().length < 10) {
				new Notice('Content too short to generate note');
				return;
			}
			
			const provider = this.plugin.getActiveProvider();
			if (!provider) {
				new Notice('No AI provider available');
				return;
			}

			// Show loading notice
			notice = new Notice('Generating note title...', 0); // 0 means it won't auto-dismiss

		// Generate title using AI with better prompt
		const titlePrompt = `Based on the following content, generate a concise, descriptive title in Chinese that captures the main topic or key insight. The title should be:
- Maximum 10 Chinese characters OR 30 English letters/numbers
- Clear and informative
- Suitable as a file name
- Return ONLY the title, no quotes or additional text

Content:
${content.substring(0, 800)}`;
		
		// Get title from AI
		let generatedTitle = 'AI生成的笔记';
		try {
			const titleMessages = [{
				id: 'title-gen-' + Date.now(),
				role: 'user' as const,
				content: titlePrompt,
				timestamp: Date.now()
			}];

			let titleContent = '';
			await provider.sendStreamingMessage(titleMessages, (chunk) => {
				if (chunk.delta) {
					titleContent += chunk.delta;
				}
			});

			if (titleContent.trim()) {
				generatedTitle = titleContent.trim()
					.replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
					.replace(/^["']|["']$/g, ''); // Remove quotes
				
				// Apply smart length limit: 10 Chinese chars OR 30 English/numbers
				let chineseCount = 0;
				let englishCount = 0;
				let result = '';
				
				for (const char of generatedTitle) {
					if (/[\u4e00-\u9fa5]/.test(char)) {
						if (chineseCount + englishCount >= 10 && chineseCount > 0) break;
						chineseCount++;
					} else if (/[a-zA-Z0-9]/.test(char)) {
						if (englishCount >= 30 || (chineseCount > 0 && chineseCount + englishCount >= 10)) break;
						englishCount++;
					}
					result += char;
				}
				
				generatedTitle = result || generatedTitle.substring(0, 30);
				Logger.debug('Generated title:', generatedTitle);
			}
		} catch (error) {
			Logger.warn('Failed to generate title, using default:', error);
		}			// Get i18n manager once for all translations
			const i18n = this.plugin.getI18nManager();
			
			// Update notice to show creating note
			if (notice) {
				const message = i18n?.t('ui.creatingNote') || 'Creating note...';
				notice.setMessage(message);
			}

			// Create filename with timestamp to avoid conflicts
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
			const filename = `${generatedTitle}.md`;
			
			// Check if file already exists, if so add timestamp
			let finalFilename = filename;
			if (await this.app.vault.adapter.exists(filename)) {
				finalFilename = `${generatedTitle} ${timestamp}.md`;
			}
			
			// Create the note content
			const generatedFromText = i18n?.t('ui.generatedFrom', { date: new Date().toLocaleString() }) || `Generated from LLMSider on ${new Date().toLocaleString()}`;
			const noteContent = `# ${generatedTitle}\n\n${content}\n\n---\n*${generatedFromText}*`;

			// Create the file in vault root
			const file = await this.app.vault.create(finalFilename, noteContent);
			
			Logger.debug('Created new note:', {
				originalFilename: filename,
				finalFilename: finalFilename,
				path: file.path,
				contentLength: noteContent.length,
				generatedTitle: generatedTitle
			});

			// Hide loading notice and show success message
			if (notice) {
				notice.hide();
			}
			const successMessage = i18n?.t('ui.createdNote', { title: generatedTitle }) || `Created note: ${generatedTitle}`;
			new Notice(successMessage);

			// Optional: Open the newly created note
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
			
		} catch (error) {
			Logger.error('Failed to generate new note:', error);
			
			// Hide loading notice and show error message
			if (notice) {
				notice.hide();
			}
			const i18n = this.plugin.getI18nManager();
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			const errorMessage = i18n?.t('ui.failedToGenerateNote', { error: errorMsg }) || `Failed to generate new note: ${errorMsg}`;
			new Notice(errorMessage);
		}
	}

	/**
	 * Simple hash function for debugging content comparison
	 */
	simpleHash(str: string): string {
		let hash = 0;
		if (str.length === 0) return hash.toString();
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(16);
	}
}
