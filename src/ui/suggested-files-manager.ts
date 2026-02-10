/**
 * Suggested Files Manager
 * Suggests semantically related files when user adds context
 * Similar to the "Similar Notes" plugin approach
 */

import { TFile, App } from 'obsidian';
import { Logger } from './../utils/logger';
import LLMSiderPlugin from '../main';
import type { VectorDBManager } from '../vector/vectorDBManager';
import type { DocItem } from '../vector/types';

export interface SuggestedFile {
	file: TFile;
	score: number;
	preview?: string;
}

export class SuggestedFilesManager {
	private app: App;
	private plugin: LLMSiderPlugin;
	private vectorDBManager: VectorDBManager | null;

	constructor(app: App, plugin: LLMSiderPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.vectorDBManager = plugin.getVectorDBManager();
	}

	/**
	 * Check if suggested files feature is enabled
	 */
	isEnabled(): boolean {
		return false;
	}

	/**
	 * Get suggestion timeout in milliseconds
	 */
	getSuggestionTimeout(): number {
		return this.plugin.settings.vectorSettings.suggestionTimeout || 5000;
	}

	/**
	 * Find related files based on a given file
	 * @param file The file to find related files for
	 * @param maxResults Maximum number of suggestions (default: 3)
	 * @returns Array of suggested files with scores
	 */
	async findRelatedFiles(file: TFile, maxResults: number = 3): Promise<SuggestedFile[]> {
		// Check if feature is enabled and vector DB is available
		if (!this.isEnabled() || !this.vectorDBManager) {
			return [];
		}

		// Check if vector DB is initialized
		if (!this.vectorDBManager.isSystemInitialized()) {
			Logger.debug('Vector database not initialized');
			return [];
		}

		try {
			// Read file content
			const content = await this.app.vault.read(file);
			
			// Use first 500 characters as query (to avoid overwhelming the search)
			const query = content.substring(0, 500);
			
			if (!query.trim()) {
				return [];
			}

			// Search for similar documents
			const searchResults: DocItem[] = await this.vectorDBManager.search(query, maxResults + 1);
			
			// Filter out the current file and map to SuggestedFile format
			const suggestions: SuggestedFile[] = [];
			
			for (const result of searchResults) {
				// Skip if this is the same file
				if (result.filePath === file.path) {
					continue;
				}

				// Get the file from vault
				const suggestedFile = this.app.vault.getAbstractFileByPath(result.filePath);
				
				if (!suggestedFile || !(suggestedFile instanceof TFile)) {
					continue;
				}

				suggestions.push({
					file: suggestedFile,
					score: result.score || 0,
					preview: result.content ? this.createPreview(result.content) : undefined
				});

				// Stop when we have enough suggestions
				if (suggestions.length >= maxResults) {
					break;
				}
			}

			Logger.debug(`Found ${suggestions.length} related files for ${file.name}`);
			return suggestions;

		} catch (error) {
			Logger.error('Error finding related files:', error);
			return [];
		}
	}

	/**
	 * Find related files based on text content
	 * @param text The text to find related files for
	 * @param maxResults Maximum number of suggestions (default: 3)
	 * @returns Array of suggested files with scores
	 */
	async findRelatedFilesByText(text: string, maxResults: number = 3): Promise<SuggestedFile[]> {
		// Check if feature is enabled and vector DB is available
		if (!this.isEnabled() || !this.vectorDBManager) {
			return [];
		}

		// Check if vector DB is initialized
		if (!this.vectorDBManager.isSystemInitialized()) {
			Logger.debug('Vector database not initialized');
			return [];
		}

		try {
			// Use first 500 characters as query
			const query = text.substring(0, 500);
			
			if (!query.trim()) {
				return [];
			}

			// Search for similar documents
			const searchResults: DocItem[] = await this.vectorDBManager.search(query, maxResults);
			
			// Map to SuggestedFile format
			const suggestions: SuggestedFile[] = [];
			
			for (const result of searchResults) {
				// Get the file from vault
				const suggestedFile = this.app.vault.getAbstractFileByPath(result.filePath);
				
				if (!suggestedFile || !(suggestedFile instanceof TFile)) {
					continue;
				}

				suggestions.push({
					file: suggestedFile,
					score: result.score || 0,
					preview: result.content ? this.createPreview(result.content) : undefined
				});
			}

			Logger.debug(`Found ${suggestions.length} related files for text query`);
			return suggestions;

		} catch (error) {
			Logger.error('Error finding related files by text:', error);
			return [];
		}
	}

	/**
	 * Create a preview string from text (first 100 characters)
	 */
	private createPreview(text: string): string {
		const cleaned = text.replace(/\s+/g, ' ').trim();
		return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
	}
}
