import { App, TFile, MarkdownView, Notice, TFolder } from 'obsidian';
import { Logger } from './../utils/logger';
import { FileParser } from '../utils/file-parser';
import { TokenManager } from '../utils/token-manager';
import { MCPManager } from '../mcp/mcp-manager';
import type { I18nManager } from '../i18n/i18n-manager';

export interface ExtractedImage {
	filename: string;
	base64: string;
	mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
	relativePath: string;
}

export interface NoteContext {
	name: string;
	content: string;
	filePath?: string; // Add file path to track the file for live content updates
	type?: 'markdown' | 'document' | 'spreadsheet' | 'presentation' | 'text' | 'image' | 'other';
	metadata?: {
		originalLength?: number;
		truncated?: boolean;
		fileType?: string;
		isImage?: boolean;
		imageData?: {
			base64: string;
			mediaType: string;
		};
		buffer?: ArrayBuffer; // Raw image data for multimodal processing
		extractedImages?: ExtractedImage[]; // Images extracted from markdown
	};
}

export interface SelectedTextContext {
	text: string;
	preview: string;
}

export class ContextManager {
	private app: App;
	private currentNoteContext: NoteContext[] = [];
	private selectedTextContexts: SelectedTextContext[] = []; // 改为数组支持多个选中文本
	private mcpManager: MCPManager | null = null;
	private i18n: I18nManager | null = null;

	constructor(app: App, mcpManager?: MCPManager, i18n?: I18nManager) {
		this.app = app;
		this.mcpManager = mcpManager || null;
		this.i18n = i18n || null;
	}

	/**
	 * Set MCP Manager reference
	 */
	setMCPManager(mcpManager: MCPManager): void {
		this.mcpManager = mcpManager;
	}

	/**
	 * Set I18n Manager reference
	 */
	setI18nManager(i18n: I18nManager): void {
		this.i18n = i18n;
	}

	/**
	 * Get current note context
	 */
	getCurrentNoteContext(): NoteContext[] {
		return this.currentNoteContext;
	}

	/**
	 * Get selected text context
	 */
	getSelectedTextContext(): SelectedTextContext | null {
		// 返回第一个选中文本（向后兼容）
		return this.selectedTextContexts.length > 0 ? this.selectedTextContexts[0] : null;
	}

	/**
	 * Get all selected text contexts
	 */
	getSelectedTextContexts(): SelectedTextContext[] {
		return this.selectedTextContexts;
	}

	/**
	 * Clear all context
	 */
	clearContext(): void {
		this.currentNoteContext = [];
		this.selectedTextContexts = [];
	}

	/**
	 * Include current note content as context
	 */
	async includeCurrentNote(): Promise<{ success: boolean; message: string; note?: NoteContext }> {
		// Try multiple methods to get the active file
		let activeFile: TFile | null = null;
		
		// Method 1: Try to get from active markdown view
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView && activeView.file) {
			activeFile = activeView.file;
		}
		
		// Method 2: Try to get from workspace active file
		if (!activeFile) {
			activeFile = this.app.workspace.getActiveFile();
		}
		
		// Method 3: Try to get from active leaf
		if (!activeFile) {
			const activeLeaf = this.app.workspace.activeLeaf;
			if (activeLeaf && activeLeaf.view && (activeLeaf.view as any).file) {
				activeFile = (activeLeaf.view as any).file;
			}
		}

		Logger.debug('Active file detection:', {
			activeView: !!activeView,
			activeViewFile: activeView?.file?.path,
			workspaceActiveFile: this.app.workspace.getActiveFile()?.path,
			activeLeaf: !!this.app.workspace.activeLeaf,
			foundFile: activeFile?.path
		});

		if (!activeFile) {
			return {
				success: false,
				message: 'No active note found. Please make sure a note is open and active.'
			};
		}

		// Use the existing addFileToContext method which now supports PDF
		return await this.addFileToContext(activeFile);
	}

	/**
	 * Include selected text from active note
	 */
	async includeSelectedText(): Promise<{ success: boolean; message: string; context?: SelectedTextContext }> {
		Logger.debug('Attempting to get selected text...');
		const selectedText = await this.getSelectedText();
		
		if (selectedText && selectedText.trim()) {
			// Create preview (first 50 characters)
			const preview = selectedText.length > 50 
				? selectedText.substring(0, 50) + '...' 
				: selectedText;
			
			const context: SelectedTextContext = {
				text: selectedText.trim(),
				preview: preview
			};

			this.selectedTextContexts.push(context);
			
			Logger.debug('Added selected text to context:', {
				length: selectedText.length,
				preview: preview,
				totalSelections: this.selectedTextContexts.length
			});
			
			return {
				success: true,
				message: `Added ${selectedText.length} characters of selected text to context`,
				context: context
			};
		} else {
			Logger.debug('No text selected or found');
			return {
				success: false,
				message: 'No text selected. Please select some text first and try again.'
			};
		}
	}

	/**
	 * Add specific text to context (for context menu integration)
	 */
	async addTextToContext(text: string): Promise<{ success: boolean; message: string; context?: SelectedTextContext }> {
		if (!text || !text.trim()) {
			return {
				success: false,
				message: 'No text provided to add to context'
			};
		}

		const trimmedText = text.trim();
		
		// Create preview (first 50 characters)
		const preview = trimmedText.length > 50 
			? trimmedText.substring(0, 50) + '...' 
			: trimmedText;
		
		const context: SelectedTextContext = {
			text: trimmedText,
			preview: preview
		};

		this.selectedTextContexts.push(context);
		
		Logger.debug('Added specific text to context:', {
			length: trimmedText.length,
			preview: preview,
			totalSelections: this.selectedTextContexts.length
		});
		
		return {
			success: true,
			message: `Added ${trimmedText.length} characters to context`,
			context: context
		};
	}

	/**
	 * Include entire directory as context
	 */
	async includeDirectory(folder: TFolder): Promise<{ success: boolean; message: string; filesAdded: number }> {
		try {
			Logger.debug('Starting directory inclusion:', folder.path);
			
			const files = this.getAllFilesInFolder(folder);
			const supportedFiles = files.filter(file => FileParser.isSupportedFile(file.name));
			
			if (supportedFiles.length === 0) {
				return {
					success: false,
					message: `No supported files found in directory "${folder.name}"`,
					filesAdded: 0
				};
			}
			
			let addedCount = 0;
			const errors: string[] = [];
			
			// Process files in batches to avoid overwhelming the UI
			const batchSize = 5;
			for (let i = 0; i < supportedFiles.length; i += batchSize) {
				const batch = supportedFiles.slice(i, i + batchSize);
				
				await Promise.all(batch.map(async (file) => {
					try {
						const result = await this.addFileToContext(file);
						if (result.success) {
							addedCount++;
						} else {
							errors.push(`${file.name}: ${result.message}`);
						}
					} catch (error) {
						errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
					}
				}));
				
				// Small delay between batches to prevent UI freezing
				if (i + batchSize < supportedFiles.length) {
					await new Promise(resolve => setTimeout(resolve, 100));
				}
			}
			
			let message = `Added ${addedCount} files from directory "${folder.name}"`;
			if (errors.length > 0) {
				message += ` (${errors.length} files failed to load)`;
				Logger.warn('Directory inclusion errors:', errors);
			}
			
			Logger.debug('Directory inclusion completed:', {
				folder: folder.path,
				totalFiles: files.length,
				supportedFiles: supportedFiles.length,
				addedCount,
				errors: errors.length
			});
			
			return {
				success: addedCount > 0,
				message,
				filesAdded: addedCount
			};
			
		} catch (error) {
			Logger.error('Failed to include directory:', error);
			return {
				success: false,
				message: `Failed to process directory "${folder.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
				filesAdded: 0
			};
		}
	}

	/**
	 * Get all files recursively from a folder
	 */
	private getAllFilesInFolder(folder: TFolder): TFile[] {
		const files: TFile[] = [];
		
		const processFolder = (currentFolder: TFolder) => {
			currentFolder.children.forEach(child => {
				if (child instanceof TFile) {
					files.push(child);
				} else if (child instanceof TFolder) {
					processFolder(child);
				}
			});
		};
		
		processFolder(folder);
		return files;
	}

	/**
	 * Add file to context by TFile
	 */
	async addFileToContext(file: TFile): Promise<{ success: boolean; message: string; note?: NoteContext }> {
		try {
			let content: string;
			let type: 'markdown' | 'document' | 'spreadsheet' | 'presentation' | 'text' | 'image' | 'other' = 'other';
			let metadata: any = {};

			// Check if file is supported by extract-text
			if (FileParser.isSupportedFile(file.name)) {
				try {
					// Read file as ArrayBuffer for extract-text
					const arrayBuffer = await this.app.vault.readBinary(file);
					
					// Check if it's an image file
					const ext = file.name.toLowerCase().split('.').pop() || '';
					if (FileParser.isImageFile(ext)) {
						// Filter out GIF files - not supported by LLMs and causes errors
						if (ext === 'gif') {
							Logger.debug('Filtering out GIF file (not supported by AI models):', file.name);
							return {
								success: false,
								message: `GIF files are not supported by AI models. Please use JPEG, PNG, or WebP instead.`
							};
						}
						
						// Handle image file
						Logger.debug('Processing image file:', file.name);
						
						const imageData = FileParser.extractImageData(arrayBuffer, file.name);
						content = `[IMAGE: ${file.name}] - This image will be sent to the AI for visual understanding.`;
						type = 'image';
						metadata = {
							originalLength: arrayBuffer.byteLength,
							truncated: false,
							fileType: 'image',
							isImage: true,
							imageData: {
								base64: imageData.base64Data,
								mediaType: imageData.mediaType
							},
							buffer: arrayBuffer
						};
						
						Logger.debug('Image data prepared:', {
							filename: file.name,
							mediaType: imageData.mediaType,
							base64Length: imageData.base64Data.length,
							bufferSize: arrayBuffer.byteLength
						});
					} else if (file.extension === 'md') {
						// Handle markdown files with image extraction
						Logger.debug('Processing markdown file:', file.name);
						
						const textContent = await this.app.vault.read(file);
						content = textContent;
						type = 'markdown';
						
						// Extract images from markdown content
						const extractedImages = await this.extractImagesFromMarkdown(textContent, file);
						
						metadata = {
							originalLength: textContent.length,
							truncated: false,
							fileType: 'markdown',
							extractedImages: extractedImages
						};
						
						Logger.debug('EXTRACTED MARKDOWN CONTENT AND IMAGES:', {
							filename: file.name,
							contentLength: textContent.length,
							imageCount: extractedImages.length,
							imageFiles: extractedImages.map((img: ExtractedImage) => img.filename),
							extractedImages: extractedImages
						});
					} else {
						// Handle other supported files
						const result = await FileParser.extractTextWithLimit(arrayBuffer, file.name, 128000);
						
						content = result.text;
						type = result.fileType as any;
						metadata = {
							originalLength: result.originalLength,
							truncated: result.truncated,
							fileType: result.fileType
						};

						Logger.debug('Extracted text from file:', {
							filename: file.name,
							fileType: result.fileType,
							originalLength: result.originalLength,
							extractedLength: content.length,
							truncated: result.truncated
						});
					}
				} catch (extractError) {
					Logger.warn('Failed to extract text from file, trying as text file:', extractError);
					
					// Fallback: try to read as regular text file
					try {
						content = await this.app.vault.read(file);
						type = file.extension === 'md' ? 'markdown' : 'text';
						Logger.debug('Successfully read as text file:', file.name);
					} catch (readError) {
						Logger.error('Failed to read file as text:', readError);
						return {
							success: false,
							message: `Failed to extract text from "${file.basename}". File type "${file.extension}" may not be supported for text extraction.`
						};
					}
				}
			} else {
				// Try to read as regular text file
				try {
					content = await this.app.vault.read(file);
					type = file.extension === 'md' ? 'markdown' : 'text';
				} catch (readError) {
					return {
						success: false,
						message: `File type "${file.extension}" is not supported for text extraction`
					};
				}
			}
			
			// Check if this file is already in context
			const existingIndex = this.currentNoteContext.findIndex(ctx => ctx.name === file.basename);
			
			const noteContext: NoteContext = {
				name: file.basename,
				content: content,
				filePath: file.path, // Store file path for live content updates
				type: type,
				metadata: metadata
			};

			if (existingIndex >= 0) {
				// Update existing file content
				this.currentNoteContext[existingIndex] = noteContext;
				
				const typeLabel = this.getFileTypeLabel(type);
				return {
					success: true,
					message: `Updated ${typeLabel} "${file.basename}" in context${metadata.truncated ? ' (content truncated)' : ''}`,
					note: noteContext
				};
			} else {
				// Add new file to context
				this.currentNoteContext.push(noteContext);
				
				const typeLabel = this.getFileTypeLabel(type);
				const truncatedText = metadata.truncated ? (this.i18n?.t('ui.contentTruncated') || ' (content truncated)') : '';
				const message = this.i18n?.t('ui.addedToContext', { type: typeLabel, name: file.basename }) || `Added ${typeLabel} "${file.basename}" to context`;
				return {
					success: true,
					message: message + truncatedText,
					note: noteContext
				};
			}

		} catch (error) {
			Logger.error('Failed to read file:', error);
			const message = this.i18n?.t('ui.failedToReadFile', { name: file.basename }) || `Failed to read file "${file.basename}"`;
			return {
				success: false,
				message: message
			};
		}
	}

	/**
	 * Get file type label for display
	 */
	private getFileTypeLabel(type: string): string {
		if (!this.i18n) {
			// Fallback to English if i18n is not available
			switch (type) {
				case 'document': return 'Document';
				case 'spreadsheet': return 'Spreadsheet';
				case 'presentation': return 'Presentation';
				case 'text': return 'Text File';
				case 'markdown': return 'Markdown';
				case 'image': return 'Image';
				default: return 'File';
			}
		}
		
		switch (type) {
			case 'document': return this.i18n.t('ui.fileTypeDocument');
			case 'spreadsheet': return this.i18n.t('ui.fileTypeSpreadsheet');
			case 'presentation': return this.i18n.t('ui.fileTypePresentation');
			case 'text': return this.i18n.t('ui.fileTypeText');
			case 'markdown': return this.i18n.t('ui.fileTypeMarkdown');
			case 'image': return this.i18n.t('ui.fileTypeImage');
			default: return this.i18n.t('ui.fileTypeFile');
		}
	}

	/**
	 * Remove note from context by name
	 */
	removeNoteContext(noteName: string): boolean {
		const index = this.currentNoteContext.findIndex(ctx => ctx.name === noteName);
		if (index >= 0) {
			this.currentNoteContext.splice(index, 1);
			return true;
		}
		return false;
	}

	/**
	 * Remove selected text context (by index, or all if index not provided)
	 */
	removeSelectedTextContext(index?: number): void {
		if (index !== undefined && index >= 0 && index < this.selectedTextContexts.length) {
			this.selectedTextContexts.splice(index, 1);
		} else {
			this.selectedTextContexts = [];
		}
	}

	/**
	 * Update note context content (for when note is modified)
	 */
	updateNoteContext(noteName: string, newContent: string): boolean {
		const existingIndex = this.currentNoteContext.findIndex(ctx => ctx.name === noteName);
		if (existingIndex >= 0) {
			this.currentNoteContext[existingIndex].content = newContent;
			return true;
		}
		return false;
	}

	/**
	 * Get context summary for display
	 */
	getContextSummary(): string {
		const parts = [];

		if (this.currentNoteContext.length > 0) {
			parts.push(`${this.currentNoteContext.length} note(s)`);
		}

		if (this.selectedTextContexts.length > 0) {
			parts.push(`${this.selectedTextContexts.length} selected text(s)`);
		}

		return parts.length > 0 ? parts.join(', ') : 'No context';
	}

	/**
	 * Get context summary with token information
	 */
	async getContextSummaryWithTokens(): Promise<string> {
		const baseSummary = this.getContextSummary();

		if (this.hasContext()) {
			const contextPrompt = await this.generateContextPrompt();
			const tokenCount = TokenManager.estimateTokensForContext(contextPrompt);
			const warningLevel = TokenManager.getTokenWarningLevel(tokenCount);
			const tokenFormatted = TokenManager.formatTokenUsage(tokenCount);

			const warningIcon = warningLevel === 'critical' ? '🔴' :
							   warningLevel === 'warning' ? '🟡' : '🟢';

			return `${baseSummary} (${warningIcon} ${tokenFormatted})`;
		}

		return baseSummary;
	}

	/**
	 * Generate system prompt context based on current context
	 */
	/**
	 * Refresh content of all referenced files to get the latest version
	 */
	async refreshReferencedFilesContent(): Promise<void> {
		Logger.debug('Refreshing referenced files content...');
		
		const refreshPromises = this.currentNoteContext.map(async (noteContext) => {
			// Only refresh if we have a file path stored
			if (!noteContext.filePath) {
				Logger.debug('No file path for context:', noteContext.name);
				return;
			}
			
			try {
				// Get the file by path
				const file = this.app.vault.getAbstractFileByPath(noteContext.filePath) as TFile;
				if (!file) {
					Logger.warn('File not found for refresh:', noteContext.filePath);
					return;
				}
				
				// Re-read the file content
				let content: string;
				let metadata: any = noteContext.metadata || {};
				
				// Handle different file types
				if (noteContext.metadata?.isImage) {
					// For images, re-read the binary data
					const arrayBuffer = await this.app.vault.readBinary(file);
					const imageData = FileParser.extractImageData(arrayBuffer, file.name);
					
					content = `[IMAGE: ${file.name}] - This image will be sent to the AI for visual understanding.`;
					metadata = {
						...metadata,
						imageData: {
							base64: imageData.base64Data,
							mediaType: imageData.mediaType
						},
						buffer: arrayBuffer
					};
					
					Logger.debug('Refreshed image:', file.name);
				} else if (file.extension === 'md') {
					// Handle markdown files with image extraction
					const textContent = await this.app.vault.read(file);
					content = textContent;
					
					// Re-extract images from markdown content
					const extractedImages = await this.extractImagesFromMarkdown(textContent, file);
					
					metadata = {
						...metadata,
						originalLength: textContent.length,
						truncated: false,
						fileType: 'markdown',
						extractedImages: extractedImages
					};
					
					Logger.debug('Refreshed markdown with images:', {
						filename: file.name,
						contentLength: textContent.length,
						imageCount: extractedImages.length
					});
				} else if (FileParser.isSupportedFile(file.name)) {
					// Handle other supported files
					const arrayBuffer = await this.app.vault.readBinary(file);
					const result = await FileParser.extractTextWithLimit(arrayBuffer, file.name, 128000);
					
					content = result.text;
					metadata = {
						...metadata,
						originalLength: result.originalLength,
						truncated: result.truncated,
						fileType: result.fileType
					};
					
					Logger.debug('Refreshed document:', {
						filename: file.name,
						fileType: result.fileType,
						contentLength: content.length
					});
				} else {
					// Regular text file
					content = await this.app.vault.read(file);
					Logger.debug('Refreshed text file:', file.name);
				}
				
				// Update the note context with fresh content
				noteContext.content = content;
				noteContext.metadata = metadata;
				
				Logger.debug('Successfully refreshed:', noteContext.name);
			} catch (error) {
				Logger.error('Failed to refresh file:', noteContext.filePath, error);
			}
		});
		
		await Promise.all(refreshPromises);
		Logger.debug('All referenced files refreshed');
	}

	/**
	 * Get image data from context for multimodal messages
	 */
	getImageDataForMultimodal(): Array<{filename: string; base64: string; mediaType: string}> {
		const imageData: Array<{filename: string; base64: string; mediaType: string}> = [];
		
		this.currentNoteContext.forEach((noteContext) => {
			// Direct image files
			if (noteContext.metadata?.isImage && noteContext.metadata?.imageData) {
				imageData.push({
					filename: noteContext.name,
					base64: noteContext.metadata.imageData.base64,
					mediaType: noteContext.metadata.imageData.mediaType
				});
				Logger.debug('Found direct image data for multimodal message:', {
					filename: noteContext.name,
					mediaType: noteContext.metadata.imageData.mediaType,
					base64Length: noteContext.metadata.imageData.base64.length
				});
			}
			
			// Images extracted from markdown files
			if (noteContext.metadata?.extractedImages && noteContext.metadata.extractedImages.length > 0) {
				noteContext.metadata.extractedImages.forEach((extractedImage: ExtractedImage) => {
					imageData.push({
						filename: extractedImage.filename,
						base64: extractedImage.base64,
						mediaType: extractedImage.mediaType
					});
					Logger.debug('Found extracted image from markdown for multimodal message:', {
						sourceFile: noteContext.name,
						filename: extractedImage.filename,
						mediaType: extractedImage.mediaType,
						base64Length: extractedImage.base64.length
					});
				});
			}
		});
		
		return imageData;
	}

	async generateContextPrompt(maxTokens?: number): Promise<string> {
		// Refresh referenced files to get the latest content
		await this.refreshReferencedFilesContent();
		
		let contextPrompt = '';

		// Add note context (skip images as they will be in user message)
		this.currentNoteContext.forEach((noteContext) => {
			// Skip image files as they will be included in multimodal user message
			if (noteContext.metadata?.isImage) {
				Logger.debug('Skipping image file in system prompt (will be in user message):', noteContext.name);
				return;
			}

			const fileTypeLabel = this.getFileTypeLabel(noteContext.type || 'other');

			let contextHeader = `\n\nCONTEXT - ${fileTypeLabel} "${noteContext.name}":`;

			// Add metadata for extracted files
			if (noteContext.metadata && noteContext.metadata.fileType && noteContext.metadata.fileType !== 'markdown') {
				const meta = noteContext.metadata;
				contextHeader += `\n[File Info: Type: ${meta.fileType}, Original length: ${meta.originalLength} chars${meta.truncated ? ', Content truncated for context' : ''}]`;
			}

			// Add information about extracted images if any
			if (noteContext.metadata?.extractedImages && noteContext.metadata.extractedImages.length > 0) {
				const imageList = noteContext.metadata.extractedImages.map((img: ExtractedImage) => img.filename).join(', ');
				contextHeader += `\n[Images in this markdown: ${imageList} - These images are included in the user message for visual analysis]`;
			}

			contextPrompt += `${contextHeader}\n---\n${noteContext.content}\n---`;

			Logger.debug('Including file context in system prompt:', {
				noteName: noteContext.name,
				type: noteContext.type,
				contentLength: noteContext.content.length,
				metadata: noteContext.metadata,
				extractedImages: noteContext.metadata?.extractedImages?.length || 0
			});
		});

		// Add selected text contexts
		this.selectedTextContexts.forEach((selectedTextContext, index) => {
			const label = this.selectedTextContexts.length > 1 
				? `Selected Text ${index + 1}` 
				: 'Selected Text';
			contextPrompt += `\n\nCONTEXT - ${label}:\n---\n${selectedTextContext.text}\n---`;

			Logger.debug('Including selected text in system prompt:', {
				index,
				textLength: selectedTextContext.text.length,
				preview: selectedTextContext.preview
			});
		});

		// Apply token-based truncation if maxTokens is specified
		if (maxTokens && contextPrompt) {
			const estimatedTokens = TokenManager.estimateTokensForContext(contextPrompt);
			if (estimatedTokens > maxTokens) {
				Logger.warn('Context prompt exceeds token limit, truncating:', {
					originalTokens: estimatedTokens,
					maxTokens,
					originalLength: contextPrompt.length
				});

				const truncatedPrompt = TokenManager.truncateContextPrompt(contextPrompt, maxTokens);

				// Show notice to user
				new Notice('Context files are too large and have been truncated to fit token limits.', 4000);

				return truncatedPrompt;
			}
		}

		return contextPrompt;
	}

	/**
	 * Generate token-aware context prompt with specified limits
	 */
	async generateTokenAwareContextPrompt(maxTokens: number): Promise<string> {
		return await this.generateContextPrompt(maxTokens);
	}

	/**
	 * Extract images from markdown content
	 */
	private async extractImagesFromMarkdown(markdownContent: string, sourceFile: TFile): Promise<ExtractedImage[]> {
		const extractedImages: ExtractedImage[] = [];
		let skippedImages: {path: string, reason: string}[] = [];
		
		Logger.debug('Starting image extraction from markdown:', {
			sourceFile: sourceFile.path,
			contentLength: markdownContent.length,
			hasImages: /!\[.*?\]\(.*?\)|!\[\[.*?\]\]|<img.*?src\s*=/.test(markdownContent)
		});
		
		// Regular expressions for different markdown image syntaxes
		const imagePatterns = [
			// Standard markdown: ![alt](path) or ![alt](path "title")
			/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
			// Wiki-style links: ![[image.png]] or ![[image.png|alt]]
			/!\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g,
			// HTML img tags: <img src="path" ... >
			/<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
		];
		
		for (const pattern of imagePatterns) {
			let match;
			while ((match = pattern.exec(markdownContent)) !== null) {
				let imagePath = '';
				
				Logger.debug('Found image pattern match:', {
					pattern: pattern.source,
					match: match[0],
					groups: match
				});
				
				// Extract path based on pattern type
				if (pattern.source.includes('!\\[\\[')) {
					// Wiki-style link: ![[image.png]]
					imagePath = match[1];
				} else if (pattern.source.includes('<img')) {
					// HTML img tag
					imagePath = match[1];
				} else {
					// Standard markdown: ![alt](path)
					imagePath = match[2];
				}
				
				Logger.debug('Extracted image path:', imagePath);
				
				// Handle different types of image sources
				if (imagePath.match(/^(https?:|data:|ftp:)/i)) {
					// External URLs - download and process them
					try {
						Logger.debug('Processing external image URL:', imagePath);
						const downloadedImage = await this.downloadExternalImage(imagePath);
						if (downloadedImage) {
							extractedImages.push(downloadedImage);
							Logger.debug('Successfully downloaded external image:', {
								url: imagePath,
								filename: downloadedImage.filename,
								mediaType: downloadedImage.mediaType,
								size: downloadedImage.base64.length
							});
						} else {
							// Image conversion failed or unsupported
							skippedImages.push({path: imagePath, reason: 'Conversion failed or unsupported format'});
						}
					} catch (error) {
						Logger.warn('Failed to download external image:', imagePath, error);
						skippedImages.push({path: imagePath, reason: 'Download error'});
					}
					continue;
				} else if (imagePath.match(/^mailto:/i)) {
					Logger.debug('Skipping mailto URL:', imagePath);
					skippedImages.push({path: imagePath, reason: 'mailto URL'});
					continue;
				}
				
				try {
					// Resolve the image file
					const imageFile = await this.resolveImageFile(imagePath, sourceFile);
					if (!imageFile) {
						Logger.warn('Could not resolve image file:', imagePath);
						continue;
					}
					
					// Check if it's actually an image file
					const ext = imageFile.extension.toLowerCase();
					if (!FileParser.isImageFile(ext)) {
						Logger.warn('File is not an image:', imageFile.path);
						skippedImages.push({path: imagePath, reason: 'Not an image file'});
						continue;
					}
					
					// Filter out GIF files - not supported by LLMs and causes errors
					if (ext === 'gif') {
						Logger.debug('Filtering out GIF file (not supported by LLMs):', imageFile.path);
						skippedImages.push({path: imagePath, reason: 'GIF format not supported by AI models'});
						continue;
					}
					
					// Check if the image format is supported by LLMs
					if (!this.isSupportedLocalImageFormat(ext)) {
						Logger.debug('Converting unsupported local image format:', ext, imageFile.path);
						
						// Try to convert the image
						const arrayBuffer = await this.app.vault.readBinary(imageFile);
						const convertedData = await this.convertImageToSupportedFormat(arrayBuffer, imageFile.name, `image/${ext}`);
						
						if (convertedData) {
							extractedImages.push({
								filename: convertedData.filename,
								base64: convertedData.base64Data,
								mediaType: convertedData.mediaType,
								relativePath: imageFile.path
							});
							
							Logger.debug('Successfully converted local image:', {
								originalPath: imageFile.path,
								originalFormat: ext,
								newFilename: convertedData.filename,
								newFormat: convertedData.mediaType
							});
						} else {
							skippedImages.push({path: imagePath, reason: `Conversion failed: .${ext}`});
						}
						continue;
					}
					
					// Avoid duplicates
					if (extractedImages.some(img => img.relativePath === imageFile.path)) {
						continue;
					}
					
					// Read and encode the image
					const arrayBuffer = await this.app.vault.readBinary(imageFile);
					
					// Use FileParser but validate the media type
					const imageData = FileParser.extractImageData(arrayBuffer, imageFile.name);
					
					// For supported local formats, ensure correct media type
					const expectedMediaType = this.getMediaTypeFromExtension(ext);
					if (expectedMediaType && imageData.mediaType !== expectedMediaType) {
						Logger.warn('Local image media type mismatch, correcting:', {
							filename: imageFile.name,
							detected: imageData.mediaType,
							expected: expectedMediaType,
							extension: ext
						});
					}
					
					extractedImages.push({
						filename: imageFile.name,
						base64: imageData.base64Data,
						mediaType: expectedMediaType || imageData.mediaType,
						relativePath: imageFile.path
					});
					
					Logger.debug('Extracted image from markdown:', {
						sourceFile: sourceFile.path,
						imagePath: imagePath,
						resolvedPath: imageFile.path,
						filename: imageFile.name,
						mediaType: imageData.mediaType
					});
					
				} catch (error) {
					Logger.warn('Failed to extract image:', imagePath, error);
				}
			}
		}
		
		// Log summary with special mention of GIF files
		const gifFiles = skippedImages.filter(img => img.reason.includes('GIF format'));
		Logger.debug('Image extraction completed:', {
			sourceFile: sourceFile.path,
			extractedCount: extractedImages.length,
			skippedCount: skippedImages.length,
			gifFilesSkipped: gifFiles.length,
			extractedImages: extractedImages.map(img => img.filename),
			skippedImages: skippedImages
		});
		
		// Add user notification if GIF files were skipped
		if (gifFiles.length > 0) {
			Logger.warn('Note: Skipped GIF files as they are not supported by AI models:', 
				gifFiles.map(gif => gif.path));
		}
		
		return extractedImages;
	}

	/**
	 * Resolve image file path relative to the source markdown file
	 */
	private async resolveImageFile(imagePath: string, sourceFile: TFile): Promise<TFile | null> {
		// Remove any leading/trailing whitespace and quotes
		imagePath = imagePath.trim().replace(/^["']|["']$/g, '');
		
		// Try different resolution strategies
		const strategies = [
			// 1. Direct path from vault root
			() => this.app.vault.getAbstractFileByPath(imagePath) as TFile,
			
			// 2. Relative to source file's directory
			() => {
				const sourceDir = sourceFile.parent?.path || '';
				const fullPath = sourceDir ? `${sourceDir}/${imagePath}` : imagePath;
				return this.app.vault.getAbstractFileByPath(fullPath) as TFile;
			},
			
			// 3. Search by filename only (for wiki-style links)
			() => {
				const filename = imagePath.split('/').pop() || imagePath;
				const files = this.app.vault.getFiles();
				return files.find(file => file.name === filename || file.basename === filename) || null;
			},
			
			// 4. Obsidian's built-in link resolution
			() => {
				const linkCache = this.app.metadataCache.getFileCache(sourceFile);
				if (linkCache?.embeds) {
					const embed = linkCache.embeds.find(e => e.link === imagePath);
					if (embed) {
						return this.app.metadataCache.getFirstLinkpathDest(imagePath, sourceFile.path);
					}
				}
				return null;
			}
		];
		
		for (const strategy of strategies) {
			try {
				const file = strategy();
				if (file && file instanceof TFile) {
					return file;
				}
			} catch (error) {
				// Continue to next strategy
			}
		}
		
		return null;
	}

	/**
	 * Download external image and convert to base64
	 */
	private async downloadExternalImage(imageUrl: string): Promise<ExtractedImage | null> {
		try {
			Logger.debug('Downloading external image:', imageUrl);
			
			// Use fetch to download the image
			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			// Check content type - reject GIFs early
			const contentType = response.headers.get('content-type') || '';
			if (!contentType.startsWith('image/')) {
				throw new Error(`Not an image: ${contentType}`);
			}
			
			// Special handling for GIF - don't try to convert, just skip
			if (contentType.toLowerCase() === 'image/gif') {
				Logger.debug('Skipping GIF format from external URL (not supported by AI models):', imageUrl);
				return null;
			}
			
			// Get the image data as array buffer
			const arrayBuffer = await response.arrayBuffer();
			
			// Extract filename from URL
			const url = new URL(imageUrl);
			let filename = url.pathname.split('/').pop() || 'image';
			
			// Remove query parameters from filename
			filename = filename.split('?')[0];
			
			// If no extension, try to guess from content type
			if (!filename.includes('.')) {
				const extension = this.getExtensionFromContentType(contentType);
				filename = `${filename}.${extension}`;
			}
			
			// Check if we need to convert the image format
			if (!this.isSupportedImageFormat(contentType)) {
				Logger.debug('Converting unsupported format to PNG:', contentType, imageUrl);
				const convertedData = await this.convertImageToSupportedFormat(arrayBuffer, filename, contentType);
				if (convertedData) {
					return {
						filename: convertedData.filename,
						base64: convertedData.base64Data,
						mediaType: convertedData.mediaType,
						relativePath: imageUrl // Use original URL as relative path for external images
					};
				} else {
					Logger.warn('Failed to convert image format:', contentType, imageUrl);
					return null;
				}
			}
			
			// For supported formats, use FileParser but validate the media type
			const imageData = FileParser.extractImageData(arrayBuffer, filename);
			
			// Double-check media type matches what we expect
			const expectedMediaType = this.getMediaTypeFromContentType(contentType);
			if (expectedMediaType && imageData.mediaType !== expectedMediaType) {
				Logger.warn('Media type mismatch, correcting:', {
					filename,
					detected: imageData.mediaType,
					expected: expectedMediaType,
					contentType
				});
			}
			
			return {
				filename: filename,
				base64: imageData.base64Data,
				mediaType: expectedMediaType || imageData.mediaType,
				relativePath: imageUrl // Use original URL as relative path for external images
			};
			
		} catch (error) {
			Logger.error('Failed to download external image:', imageUrl, error);
			return null;
		}
	}

	/**
	 * Convert image to supported format using Canvas API
	 */
	private async convertImageToSupportedFormat(
		arrayBuffer: ArrayBuffer, 
		originalFilename: string, 
		originalContentType: string
	): Promise<{filename: string, base64Data: string, mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'} | null> {
		try {
			Logger.debug('Starting image conversion:', {
				originalFilename,
				originalContentType,
				bufferSize: arrayBuffer.byteLength
			});
			
			// Create a Blob from the ArrayBuffer
			const blob = new Blob([arrayBuffer], { type: originalContentType });
			const imageUrl = URL.createObjectURL(blob);
			
			try {
				// Create an Image element
				const img = new Image();
				
				// Wait for image to load
				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = () => reject(new Error('Failed to load image'));
					img.src = imageUrl;
				});
				
				// Create canvas and draw the image
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				
				if (!ctx) {
					throw new Error('Could not get canvas context');
				}
				
				// Set canvas size to image size
				canvas.width = img.width;
				canvas.height = img.height;
				
				// Draw the image on canvas
				ctx.drawImage(img, 0, 0);
				
				// Convert to PNG (widely supported)
				const targetFormat = 'image/png';
				const quality = 0.9; // High quality
				
				// Get the converted image as base64
				const dataUrl = canvas.toDataURL(targetFormat, quality);
				const base64Data = dataUrl.split(',')[1]; // Remove data:image/png;base64, prefix
				
				// Generate new filename
				const baseName = originalFilename.replace(/\.[^/.]+$/, ''); // Remove extension
				const newFilename = `${baseName}_converted.png`;
				
				Logger.debug('Image conversion successful:', {
					originalFormat: originalContentType,
					newFormat: targetFormat,
					originalSize: arrayBuffer.byteLength,
					convertedSize: base64Data.length,
					dimensions: `${img.width}x${img.height}`,
					newFilename
				});
				
				// Return with correct PNG media type
				return {
					filename: newFilename,
					base64Data: base64Data,
					mediaType: 'image/png' // Ensure this matches the actual converted format
				};
				
			} finally {
				// Clean up the object URL
				URL.revokeObjectURL(imageUrl);
			}
			
		} catch (error) {
			Logger.error('Image conversion failed:', error);
			return null;
		}
	}
	private isSupportedImageFormat(contentType: string): boolean {
		const supportedFormats = [
			'image/jpeg',
			'image/jpg', 
			'image/png',
			'image/webp'
			// Note: GIF, BMP, SVG are not supported by most LLM APIs
		];
		
		return supportedFormats.includes(contentType.toLowerCase());
	}

	/**
	 * Check if local image format is supported by LLMs
	 */
	private isSupportedLocalImageFormat(extension: string): boolean {
		const supportedExtensions = [
			'jpg',
			'jpeg', 
			'png',
			'webp'
			// Note: gif, bmp, svg are not supported by most LLM APIs
		];
		
		return supportedExtensions.includes(extension.toLowerCase());
	}

	/**
	 * Get file extension from content type
	 */
	private getExtensionFromContentType(contentType: string): string {
		switch (contentType.toLowerCase()) {
			case 'image/jpeg':
			case 'image/jpg':
				return 'jpg';
			case 'image/png':
				return 'png';
			case 'image/gif':
				return 'gif';
			case 'image/webp':
				return 'webp';
			case 'image/svg+xml':
				return 'svg';
			case 'image/bmp':
				return 'bmp';
			default:
				return 'jpg'; // Default fallback
		}
	}

	/**
	 * Get media type from content type (for validation)
	 */
	private getMediaTypeFromContentType(contentType: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null {
		switch (contentType.toLowerCase()) {
			case 'image/jpeg':
			case 'image/jpg':
				return 'image/jpeg';
			case 'image/png':
				return 'image/png';
			case 'image/gif':
				return 'image/gif';
			case 'image/webp':
				return 'image/webp';
			default:
				return null;
		}
	}

	/**
	 * Get media type from file extension (for validation)
	 */
	private getMediaTypeFromExtension(extension: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null {
		switch (extension.toLowerCase()) {
			case 'jpg':
			case 'jpeg':
				return 'image/jpeg';
			case 'png':
				return 'image/png';
			case 'gif':
				return 'image/gif';
			case 'webp':
				return 'image/webp';
			default:
				return null;
		}
	}

	/**
	 * Debug helper: manually test image extraction from a markdown file
	 */
	async debugImageExtraction(filePath: string): Promise<void> {
		Logger.debug('DEBUG: Manual image extraction test for:', filePath);
		
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
		if (!file) {
			Logger.error('DEBUG: File not found:', filePath);
			return;
		}
		
		if (file.extension !== 'md') {
			Logger.error('DEBUG: Not a markdown file:', filePath);
			return;
		}
		
		const content = await this.app.vault.read(file);
		Logger.debug('DEBUG: Markdown content preview:', content.substring(0, 500));
		
		const extractedImages = await this.extractImagesFromMarkdown(content, file);
		Logger.debug('DEBUG: Extraction result:', {
			imageCount: extractedImages.length,
			images: extractedImages
		});
		
		// Test adding to context
		const result = await this.addFileToContext(file);
		Logger.debug('DEBUG: Add to context result:', result);
		
		// Test multimodal data
		const imageData = this.getImageDataForMultimodal();
		Logger.debug('DEBUG: Multimodal data:', imageData);
	}

	/**
	 * Get selected text from various sources
	 */
	private async getSelectedText(): Promise<string> {
		// Try multiple methods to get selected text
		let selectedText = '';
		
		// Method 1: Try from active markdown view editor
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = (activeView as any).editor;
			if (editor && editor.getSelection) {
				selectedText = editor.getSelection();
				Logger.debug('From MarkdownView editor:', selectedText.length);
			}
		}
		
		// Method 2: Try from global window selection (for any text)
		if (!selectedText) {
			const selection = window.getSelection();
			if (selection && selection.toString().trim()) {
				selectedText = selection.toString().trim();
				Logger.debug('From window selection:', selectedText.length);
			}
		}
		
		// Method 3: Try from document selection
		if (!selectedText) {
			if (document.getSelection) {
				const docSelection = document.getSelection();
				if (docSelection && docSelection.toString().trim()) {
					selectedText = docSelection.toString().trim();
					Logger.debug('From document selection:', selectedText.length);
				}
			}
		}
		
		Logger.debug('Final selected text:', {
			length: selectedText.length,
			preview: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : ''),
			activeView: !!activeView,
			hasEditor: !!(activeView && (activeView as any).editor)
		});
		
		return selectedText;
	}

	/**
	 * Include current webpage content as context
	 * Checks if the active tab is a webpage and fetches its content
	 */
	async includeWebpageContent(): Promise<{ success: boolean; message: string; context?: SelectedTextContext; contentLength?: number; url?: string }> {
		// Try to get URL from various sources
		let url: string | null = null;
		let webContent: string | null = null;
		let foundLeaf: any = null;

		// Strategy: Find the most recently active webpage
		// 1. First check the active leaf (might be the chat view, but worth checking)
		// 2. Then check recently active leaves
		// 3. Finally check all leaves
		
		const workspaceLeaves: any[] = [];
		this.app.workspace.iterateAllLeaves((leaf: any) => {
			workspaceLeaves.push(leaf);
		});

		// Get the active leaf and recently active leaves for prioritization
		const activeLeaf = this.app.workspace.activeLeaf;
		const recentLeaves = (this.app.workspace as any).recentlyActiveLeaves || [];
		
		// Create a prioritized list: active leaf first, then recent leaves, then all others
		const prioritizedLeaves: any[] = [];
		
		// Add active leaf first
		if (activeLeaf) {
			prioritizedLeaves.push(activeLeaf);
		}
		
		// Add recent leaves (excluding active leaf if already added)
		for (const leaf of recentLeaves) {
			if (leaf !== activeLeaf && !prioritizedLeaves.includes(leaf)) {
				prioritizedLeaves.push(leaf);
			}
		}
		
		// Add remaining leaves
		for (const leaf of workspaceLeaves) {
			if (!prioritizedLeaves.includes(leaf)) {
				prioritizedLeaves.push(leaf);
			}
		}

		// Search through prioritized leaves for a webpage
		for (const leaf of prioritizedLeaves) {
			const view = leaf.view as any;
			
			// Method 1: Check if view has a frame property (iframe)
			if (view?.frame && view.frame.src) {
				const frameSrc = view.frame.src;
				if (frameSrc.startsWith('http')) {
					url = frameSrc;
					foundLeaf = leaf;
					Logger.debug('Found URL:', url);
					
					// Try to access iframe content
					try {
						const iframeDoc = view.frame.contentDocument || view.frame.contentWindow?.document;
						if (iframeDoc) {
							webContent = this.extractTextFromDocument(iframeDoc);
						}
					} catch (corsError) {
						// CORS prevented direct access, will fetch later
					}
					break;
				}
			}

			// Method 2: Search for iframes in contentEl
			if (view?.contentEl) {
				const iframes = view.contentEl.querySelectorAll('iframe');
				if (iframes.length > 0) {
					for (const iframe of Array.from(iframes)) {
						const iframeSrc = (iframe as HTMLIFrameElement).src;
						if (iframeSrc && iframeSrc.startsWith('http')) {
							url = iframeSrc;
							foundLeaf = leaf;
							Logger.debug('Found URL:', url);
							
							try {
								const iframeEl = iframe as HTMLIFrameElement;
								const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow?.document;
								if (iframeDoc) {
									webContent = this.extractTextFromDocument(iframeDoc);
								}
							} catch (corsError) {
								// CORS prevented direct access
							}
							break;
						}
					}
					
					if (url) break;
				}
			}

			// Method 3: Check for webview element
			if (view?.contentEl) {
				const webview = view.contentEl.querySelector('webview');
				if (webview) {
					const webviewSrc = webview.getAttribute('src');
					if (webviewSrc && webviewSrc.startsWith('http')) {
						url = webviewSrc;
						foundLeaf = leaf;
						break;
					}
				}
			}

			// Method 4: Check view properties for URL
			const possibleUrlProps = ['url', 'src', 'href', 'path', 'data'];
			for (const prop of possibleUrlProps) {
				if (view?.[prop] && typeof view[prop] === 'string' && view[prop].startsWith('http')) {
					url = view[prop];
					foundLeaf = leaf;
					break;
				}
			}
			
			if (url) break;
		}

		// Check if we found a URL
		if (!url || !url.startsWith('http')) {
			const message = this.i18n?.t('ui.noWebpageFound') || 'No webpage found in open tabs. Please open a webpage first.';
			return {
				success: false,
				message: message
			};
		}

		Logger.debug('Fetching webpage content:', url);

		// If we couldn't get content directly due to CORS, use Obsidian's requestUrl API
		if (!webContent && url) {
			
			try {
				// Use Obsidian's requestUrl which can bypass CORS (same as web-content-tools.ts)
				const { requestUrl } = require('obsidian');
				const response = await requestUrl({
					url: url,
					method: 'GET',
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
						'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
						'Accept-Language': 'en-US,en;q=0.5',
						'Accept-Encoding': 'gzip, deflate, br',
						'DNT': '1',
						'Connection': 'keep-alive',
						'Upgrade-Insecure-Requests': '1'
					},
					throw: false // Don't throw on HTTP errors, handle them manually
				});
				
				if (response.status >= 200 && response.status < 300 && response.text) {
					// Parse HTML and extract text
					const parser = new DOMParser();
					const doc = parser.parseFromString(response.text, 'text/html');
					webContent = this.extractTextFromDocument(doc);
					Logger.debug('Successfully extracted content:', webContent?.length, 'characters');
				}
			} catch (fetchError) {
				Logger.warn('Failed to fetch webpage content:', fetchError);
				
				// Fallback: Try to access iframe content one more time
				if (foundLeaf) {
					const view = foundLeaf.view as any;
					let iframe: HTMLIFrameElement | null = null;
					
					// Find the iframe
					if (view?.frame) {
						iframe = view.frame;
					} else if (view?.contentEl) {
						const iframes = view.contentEl.querySelectorAll('iframe');
						for (const iframeEl of Array.from(iframes)) {
							if ((iframeEl as HTMLIFrameElement).src === url) {
								iframe = iframeEl as HTMLIFrameElement;
								break;
							}
						}
					}
					
					if (iframe) {
						try {
							// Try contentWindow
							const iframeWindow = iframe.contentWindow;
							if (iframeWindow) {
								try {
									const iframeDoc = iframeWindow.document;
									if (iframeDoc && iframeDoc.body) {
										webContent = this.extractTextFromDocument(iframeDoc);
									}
								} catch (e) {
									// contentWindow access failed
								}
							}
							
							// Try contentDocument
							if (!webContent && iframe.contentDocument) {
								try {
									webContent = this.extractTextFromDocument(iframe.contentDocument);
								} catch (e) {
									// contentDocument access failed
								}
							}
						} catch (error) {
							// Iframe extraction failed
						}
					}
				}
			}
		}
		
		// If still no content after all attempts, provide URL only with better message
		if (!webContent) {
			Logger.warn('Unable to extract webpage content, adding URL reference');
			
			const contextText = `[Webpage: ${url}]\n\nNote: This webpage could not be automatically extracted due to security restrictions. The AI will be aware of this URL for context.`;
			const preview = url;
			
			const context: SelectedTextContext = {
				text: contextText,
				preview: preview
			};

			this.selectedTextContexts.push(context);
			
			return {
				success: true,
				message: '',  // Will be formatted in input-handler with i18n
				url: url,
				context: context
			};
		}

		// Create a context object with the webpage content
		const preview = webContent.length > 100 
			? webContent.substring(0, 100) + '...' 
			: webContent;
		
		const context: SelectedTextContext = {
			text: `[Webpage: ${url}]\n\n${webContent.trim()}`,
			preview: `${url}: ${preview}`
		};

		this.selectedTextContexts.push(context);
		
		Logger.debug('Added webpage content to context:', {
			url: url,
			contentLength: webContent.length,
			preview: preview,
			totalSelections: this.selectedTextContexts.length
		});
		
		return {
			success: true,
			message: '',  // Will be formatted in input-handler with i18n
			contentLength: webContent.length,
			url: url,
			context: context
		};
	}

	/**
	 * Extract readable text from a document (HTML)
	 */
	private extractTextFromDocument(doc: Document): string {
		// Remove script and style elements
		const scripts = doc.querySelectorAll('script, style, noscript');
		scripts.forEach(el => el.remove());

		// Get text content from body
		const body = doc.body;
		if (!body) {
			return '';
		}

		// Extract text, preserving some structure
		let text = body.innerText || body.textContent || '';
		
		// Clean up excessive whitespace
		text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
		text = text.replace(/[ \t]+/g, ' '); // Normalize spaces
		text = text.trim();

		return text;
	}

	/**
	 * Check if any context is available
	 */
	hasContext(): boolean {
		return this.currentNoteContext.length > 0 || 
			   this.selectedTextContexts.length > 0;
	}
}
