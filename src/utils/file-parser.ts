import { Logger } from '././logger';
export class FileParser {
	// Supported file extensions using FileToMarkdown (except PDF which uses Obsidian's PDF.js)
	private static readonly SUPPORTED_EXTENSIONS = new Set([
		// Text files that can be read directly
		'md', 'markdown', 'txt', 'json', 'csv',
		// PDF files (using Obsidian's internal PDF.js)
		'pdf',
		// Image files (sent to LLM for visual understanding, no text extraction)
		'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
		// Office Documents (using FileToMarkdown)
		'docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods',
		// Web Development files
		'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'less', 'vue', 'svelte', 'astro',
		// Backend Languages
		'py', 'java', 'cs', 'php', 'go', 'rs', 'swift', 'kt', 'scala', 'dart',
		// System Languages
		'c', 'cpp', 'h', 'hpp', 'rb', 'pl', 'lua', 'r', 'm',
		// Shell & Scripting
		'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
		// Database
		'sql', 'pgsql', 'mysql',
		// Configuration & Data
		'xml', 'yml', 'yaml', 'toml', 'ini', 'conf', 'dockerfile', 'docker', 'graphql', 'gql',
		// LaTeX
		'tex',
		// Archives
		'zip', '7z'
	]);

	/**
	 * Extract text content from file buffer
	 */
	static async extractText(buffer: ArrayBuffer, filename: string): Promise<string> {
		const ext = filename.toLowerCase().split('.').pop() || '';
		Logger.debug(`Starting text extraction for file: ${filename} (${ext})`);
		
		try {
			let text = '';
			if (this.isImageFile(ext)) {
				// For image files, return a placeholder that indicates LLM processing is needed
				text = `[IMAGE FILE: ${filename}]\nThis is an image file that requires visual understanding by the LLM. The image data will be sent directly to the model for analysis.`;
				Logger.debug(`Image file detected: ${filename}, returning placeholder text`);
			} else if (ext === 'pdf') {
				text = await this.extractPDFText(buffer, filename);
			} else if (['md', 'markdown', 'txt', 'json', 'csv'].includes(ext)) {
				// For simple text files, convert buffer to string directly
				const uint8Array = new Uint8Array(buffer);
				const decoder = new TextDecoder('utf-8');
				text = decoder.decode(uint8Array);
			} else {
				text = await this.extractWithFileToMarkdown(buffer, filename);
			}
			
			Logger.debug(`Successfully extracted text from ${filename}, length: ${text.length} characters`);
			Logger.debug(`First 200 characters: ${text.substring(0, 200)}`);
			return text;
		} catch (error) {
			Logger.error('Failed to parse file:', error);
			throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Extract text from PDF using Obsidian's internal PDF.js
	 */
	private static async extractPDFText(buffer: ArrayBuffer, filename: string): Promise<string> {
		try {
			// Access Obsidian's PDF.js from the global window object
			const pdfjsLib = (window as any).pdfjsLib;
			if (!pdfjsLib) {
				throw new Error('PDF.js library not available in Obsidian');
			}
			
			// Load the PDF document from buffer
			const loadingTask = pdfjsLib.getDocument({ data: buffer });
			const pdfDocument = await loadingTask.promise;
			
			let extractedText = '';
			
			// Extract text from all pages
			for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
				try {
					const page = await pdfDocument.getPage(pageNum);
					
					// Get text content with character-level information (Obsidian's customization)
					const textContent = await page.getTextContent({ includeChars: true });
					
					// Extract text items
					const pageText = textContent.items
						.map((item: any) => item.str || '')
						.join(' ')
						.trim();
					
					if (pageText) {
						extractedText += `\n\n## Page ${pageNum}\n\n${pageText}`;
					}
				} catch (pageError) {
					Logger.warn(`Failed to extract text from page ${pageNum}:`, pageError);
				}
			}
			
			// Clean up extracted text
			extractedText = extractedText
				.replace(/\s+/g, ' ')
				.replace(/\n\s+/g, '\n')
				.trim();
			
			if (!extractedText || extractedText.length < 10) {
				throw new Error('No readable text found in PDF');
			}
			
			// Add metadata header
			const resultText = `# ${filename}\n\n${extractedText}`;
			
			return resultText;
			
		} catch (error) {
			Logger.error('Failed to extract PDF text with Obsidian PDF.js:', error);
			
			// Fallback: try basic binary text extraction
			try {
				const uint8Array = new Uint8Array(buffer);
				const decoder = new TextDecoder('utf-8', { fatal: false });
				let text = decoder.decode(uint8Array);
				
				// Extract readable text patterns from PDF binary
				const textMatches = text.match(/[a-zA-Z0-9\u4e00-\u9fff\s.,!?;:()\-_"']+/g);
				if (textMatches && textMatches.length > 0) {
					const extractedText = textMatches
						.filter(match => match.trim().length > 2)
						.join(' ')
						.replace(/\s+/g, ' ')
						.trim();
					
					if (extractedText.length > 50) {
						return `# ${filename}\n\n[PDF文本提取 - 基础模式]\n\n${extractedText}`;
					}
				}
			} catch (fallbackError) {
				Logger.warn('Fallback extraction also failed:', fallbackError);
			}
			
			throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Extract text using FileToMarkdown library (excludes PDF files)
	 */
	private static async extractWithFileToMarkdown(buffer: ArrayBuffer, filename: string): Promise<string> {
		const ext = filename.toLowerCase().split('.').pop() || '';
		
		// Safety check: Never process PDF files with FileToMarkdown
		if (ext === 'pdf') {
			throw new Error('PDF files should not be processed by FileToMarkdown - use extractPDFText instead');
		}
		
		try {
			// Import FileToMarkdown library
			let convertToMarkdown: any;
			try {
				// Try dynamic import first
				const fileToMarkdown = await import('filetomarkdown');
				
				// Try different possible export names
				convertToMarkdown = fileToMarkdown.convertToMarkdown || 
								   fileToMarkdown.default || 
								   fileToMarkdown;
			} catch (importError) {
				try {
					// Fallback to require
					const fileToMarkdown = require('filetomarkdown');
					
					convertToMarkdown = fileToMarkdown.convertToMarkdown || 
									   fileToMarkdown.default || 
									   fileToMarkdown;
				} catch (requireError) {
					Logger.error(`Both import methods failed:`, requireError);
					throw new Error(`Cannot load filetomarkdown library: ${requireError instanceof Error ? requireError.message : String(requireError)}`);
				}
			}
			
			if (!convertToMarkdown || typeof convertToMarkdown !== 'function') {
				throw new Error('convertToMarkdown function not found in filetomarkdown library');
			}
			
			// Import Node.js modules for file operations
			let fs: any, path: any, os: any;
			try {
				fs = require('fs');
				path = require('path');
				os = require('os');
			} catch (nodeError) {
				Logger.error(`Failed to import Node.js modules:`, nodeError);
				throw new Error(`Node.js modules not available: ${nodeError instanceof Error ? nodeError.message : String(nodeError)}`);
			}
			
			// Convert ArrayBuffer to Buffer
			const uint8Array = new Uint8Array(buffer);
			const nodeBuffer = Buffer.from(uint8Array);
			
			// Create temporary file with proper extension and absolute path
			const ext = path.extname(filename).toLowerCase() || '.tmp';
			const tempDir = path.resolve(os.tmpdir());
			const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
			const tempFile = path.resolve(tempDir, `temp-ftm-${Date.now()}-${sanitizedFilename}${ext}`);
			
			try {
				// Write buffer to temporary file
				fs.writeFileSync(tempFile, nodeBuffer);
				
				// Verify file exists and has content
				if (!fs.existsSync(tempFile)) {
					throw new Error(`Temporary file was not created: ${tempFile}`);
				}
				
				// Save current working directory
				const originalCwd = process.cwd();
				
				try {
					// Change to temp directory before calling FileToMarkdown
					process.chdir(path.dirname(tempFile));
					
					// Convert file to Markdown using FileToMarkdown with timeout to avoid hanging
					
					// Wrap in Promise.race to add timeout
					const conversionPromise = convertToMarkdown(path.resolve(tempFile));
					const timeoutPromise = new Promise((_, reject) => {
						setTimeout(() => reject(new Error('FileToMarkdown conversion timeout')), 30000); // 30 second timeout
					});
					
					const markdownText = await Promise.race([conversionPromise, timeoutPromise]);
					
					// Clean up temporary file
					fs.unlinkSync(tempFile);
					
					// Add metadata header if not already present
					const resultText = markdownText.startsWith('# ') ? markdownText : `# ${filename}\n\n${markdownText}`;
					
					return resultText;
				} finally {
					// Always restore original working directory
					process.chdir(originalCwd);
				}
			} catch (conversionError) {
				Logger.error(`Error during FileToMarkdown processing:`, conversionError);
				// Clean up temporary file if it exists
				try {
					if (fs.existsSync(tempFile)) {
						fs.unlinkSync(tempFile);
					}
				} catch (cleanupError) {
					Logger.warn('Failed to cleanup temp file:', cleanupError);
				}
				throw conversionError;
			}
		} catch (error) {
			Logger.error('Failed to extract text with FileToMarkdown:', error);
			throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}


	/**
	 * Check if file is supported for text extraction
	 */
	static isSupportedFile(filename: string): boolean {
		const ext = filename.toLowerCase().split('.').pop();
		return ext ? this.SUPPORTED_EXTENSIONS.has(ext) : false;
	}

	/**
	 * Get file type category
	 */
	static getFileType(filename: string): 'document' | 'spreadsheet' | 'presentation' | 'text' | 'code' | 'image' | 'archive' | 'other' {
		const ext = filename.toLowerCase().split('.').pop();
		if (!ext) return 'other';

		if (this.isImageFile(ext)) {
			return 'image';
		}
		if (['pdf', 'docx', 'odt', 'tex'].includes(ext)) {
			return 'document';
		}
		if (['xlsx', 'ods'].includes(ext)) {
			return 'spreadsheet';
		}
		if (['pptx', 'odp'].includes(ext)) {
			return 'presentation';
		}
		if (['zip', '7z'].includes(ext)) {
			return 'archive';
		}
		if (['md', 'markdown', 'txt', 'json', 'csv', 'xml', 'yml', 'yaml', 'toml', 'ini', 'conf'].includes(ext)) {
			return 'text';
		}
		if (['js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'less', 'vue', 'svelte', 'astro',
			 'py', 'java', 'cs', 'php', 'go', 'rs', 'swift', 'kt', 'scala', 'dart',
			 'c', 'cpp', 'h', 'hpp', 'rb', 'pl', 'lua', 'r', 'm',
			 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
			 'sql', 'pgsql', 'mysql', 'dockerfile', 'docker', 'graphql', 'gql'].includes(ext)) {
			return 'code';
		}
		return 'other';
	}

	/**
	 * Extract image data for LLM processing
	 */
	static extractImageData(buffer: ArrayBuffer, filename: string): {
		base64Data: string;
		mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
	} {
		const ext = filename.toLowerCase().split('.').pop() || '';
		
		if (!this.isImageFile(ext)) {
			throw new Error(`File ${filename} is not a supported image format`);
		}
		
		// Convert buffer to base64 safely (handle large files)
		const uint8Array = new Uint8Array(buffer);
		let binaryString = '';
		
		// Process in chunks to avoid stack overflow
		const chunkSize = 8192; // 8KB chunks
		for (let i = 0; i < uint8Array.length; i += chunkSize) {
			const chunk = uint8Array.slice(i, i + chunkSize);
			binaryString += String.fromCharCode.apply(null, Array.from(chunk));
		}
		
		const base64Data = btoa(binaryString);
		
		// Map file extension to media type
		let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
		switch (ext) {
			case 'jpg':
			case 'jpeg':
				mediaType = 'image/jpeg';
				break;
			case 'png':
				mediaType = 'image/png';
				break;
			case 'gif':
				mediaType = 'image/gif';
				break;
			case 'webp':
				mediaType = 'image/webp';
				break;
			default:
				// Default to jpeg for other formats like bmp, svg
				mediaType = 'image/jpeg';
		}
		
		Logger.debug(`Extracted image data for ${filename}, base64 length: ${base64Data.length}, media type: ${mediaType}`);
		
		return {
			base64Data,
			mediaType
		};
	}

	/**
	 * Check if file is an image file
	 */
	static isImageFile(ext: string): boolean {
		return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext.toLowerCase());
	}

	/**
	 * Extract text with length limit and preview
	 */
	static async extractTextWithLimit(buffer: ArrayBuffer, filename: string, maxLength: number = 50000): Promise<{
		text: string;
		truncated: boolean;
		originalLength: number;
		fileType: string;
	}> {
		try {
			const fullText = await this.extractText(buffer, filename);
			const originalLength = fullText.length;
			const fileType = this.getFileType(filename);
			
			if (fullText.length > maxLength) {
				const truncatedText = fullText.substring(0, maxLength) + '\n\n[Content truncated due to length...]';
				return {
					text: truncatedText,
					truncated: true,
					originalLength,
					fileType
				};
			}
			
			return {
				text: fullText,
				truncated: false,
				originalLength,
				fileType
			};
		} catch (error) {
			Logger.error('extractTextWithLimit failed:', error);
			throw error;
		}
	}

	/**
	 * Get supported file extensions list
	 */
	static getSupportedExtensions(): string[] {
		return Array.from(this.SUPPORTED_EXTENSIONS).sort();
	}
}