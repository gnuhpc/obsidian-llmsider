import { Logger } from '../../utils/logger';

/**
 * Content cleaning utilities for Plan-Execute processor
 * Handles sanitization and normalization of generated content
 */
export class ContentCleaner {
	/**
	 * Clean generated content by removing code block markers and extra whitespace
	 */
	static cleanGeneratedContent(content: string): string {
		if (!content) return content;

		// Remove common markdown code block markers if the entire content is wrapped
		let cleaned = content.trim();
		
		// Remove <plan> and <action> tags if they exist at the beginning
		cleaned = cleaned.replace(/^<plan>[\s\S]*?<\/plan>\s*/, '');
		cleaned = cleaned.replace(/^<action>[\s\S]*?<\/action>\s*/, '');
		
		// Remove <tool_execution_result> tags if they exist
		cleaned = cleaned.replace(/<tool_execution_result>[\s\S]*?<\/tool_execution_result>/g, '');
		
		// Check if content is wrapped in <tool> tags (from LLM planning format)
		// Pattern: <tool>create "path" "content"</tool> or similar
		const toolMatch = cleaned.match(/<tool>([\s\S]+?)<\/tool>/);
		if (toolMatch && toolMatch[1]) {
			const toolContent = toolMatch[1].trim();
			
			// Try to extract the last quoted argument which should be the file content
			// Handle both single and double quotes, and escaped quotes within
			// Pattern: tool_name "path" "content" - we want to extract the last quoted string
			const lastQuotedMatch = toolContent.match(/["']([\s\S]+?)["']\s*$/);
			if (lastQuotedMatch && lastQuotedMatch[1]) {
				cleaned = lastQuotedMatch[1];
				
				// Unescape any escaped quotes and newlines
				cleaned = cleaned
					.replace(/\\"/g, '"')
					.replace(/\\'/g, "'")
					.replace(/\\n/g, '\n')
					.replace(/\\t/g, '\t')
					.replace(/\\\\/g, '\\');
			}
		}
		
		// Remove markdown code blocks if the entire content is wrapped in them
		if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
			const lines = cleaned.split('\n');
			if (lines.length > 2) {
				lines.shift(); // Remove first ```
				lines.pop();   // Remove last ```
				cleaned = lines.join('\n').trim();
			}
		}
		
		// CRITICAL: Remove line number prefixes (e.g., "  1→", " 10→", "100→")
		// This pattern matches line numbers from read_file tool output
		// Pattern: optional spaces + digits + arrow + space/content
		const hasLineNumbers = /^\s*\d+→/.test(cleaned);
		if (hasLineNumbers) {
			Logger.debug('Detected line number prefixes in content, removing...');
			// Split into lines and remove line number prefix from each line
			const linesWithNumbers = cleaned.split('\n');
			const linesWithoutNumbers = linesWithNumbers.map(line => {
				// Match and remove line number prefix: optional spaces + digits + arrow
				return line.replace(/^\s*\d+→/, '');
			});
			cleaned = linesWithoutNumbers.join('\n');
			Logger.debug('Removed line number prefixes from', linesWithNumbers.length, 'lines');
		}
		
		// ENHANCED: Remove any leading explanation text patterns more aggressively
		// This handles multiple languages and variations
		const introPatterns = [
			// Chinese patterns
			/^(以下是|这是|内容如下|文件内容|生成的内容|下面是)[：:\s]*[^\n]*[\n\r]*/i,
			// English patterns  
			/^(Here's the content of|Here is the content of|This is the content of|Content of|The content is)[：:\s]*[^\n]*[\n\r]*/i,
			/^(Here's|Here is|This is)[：:\s]*[^\n]*[\n\r]*/i,
			// File path patterns
			/^[^\n]*\.(md|txt|html|js|ts|json|css)[：:\s]*[\n\r]*/i,
			// Generic colon patterns
			/^[^#\n]{1,80}[：:]\s*[\n\r]*/
		];
		
		for (const pattern of introPatterns) {
			const beforeClean = cleaned;
			cleaned = cleaned.replace(pattern, '');
			if (beforeClean !== cleaned) {
				Logger.debug('Removed intro pattern, before length:', beforeClean.length, 'after:', cleaned.length);
				// Only remove once to avoid over-cleaning
				break;
			}
		}
		
		// Remove any trailing explanation text patterns
		cleaned = cleaned.replace(/\s*(以上就是|内容结束|完毕).*$/i, '');
		cleaned = cleaned.replace(/\s*(That's all|End of content|Done).*$/i, '');
		
		return cleaned.trim();
	}

	/**
	 * Clean tool arguments by removing markdown formatting
	 */
	static cleanToolArguments(args: string): string {
		if (!args) return args;

		// Remove markdown code block markers
		let cleaned = args.trim();
		if (cleaned.startsWith('```')) {
			cleaned = cleaned.replace(/^```(?:json)?\n?/, '');
			cleaned = cleaned.replace(/\n?```\s*$/, '');
		}

		return cleaned.trim();
	}

	/**
	 * Process web content: extract main text, remove scripts/styles
	 */
	static processWebContent(html: string): string {
		if (!html) return '';

		try {
			// Create a temporary DOM parser
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			// Remove unwanted elements
			const unwantedSelectors = [
				'script', 'style', 'nav', 'footer', 'header',
				'iframe', 'noscript', 'svg'
			];

			unwantedSelectors.forEach(selector => {
				const elements = doc.querySelectorAll(selector);
				elements.forEach(el => el.remove());
			});

			// Get main content
			const mainContent = doc.querySelector('main') || doc.querySelector('article') || doc.body;

			if (!mainContent) {
				Logger.warn('Could not find main content in HTML');
				return '';
			}

			// Extract text content
			let text = mainContent.textContent || '';

			// Clean up whitespace
			text = text
				.split('\n')
				.map(line => line.trim())
				.filter(line => line.length > 0)
				.join('\n');

			// Limit length (max 10000 chars)
			if (text.length > 10000) {
				text = text.substring(0, 10000) + '\n\n[Content truncated...]';
			}

			return text;

		} catch (error) {
			Logger.error('Error processing web content:', error);
			return '';
		}
	}

	/**
	 * Remove XML-style tags from text
	 */
	static removeXMLTags(text: string): string {
		if (!text) return text;

		// Remove common XML-style tags used in LLM outputs
		return text
			.replace(/<\/?thinking>/g, '')
			.replace(/<\/?thought>/g, '')
			.replace(/<\/?reflection>/g, '')
			.replace(/<\/?analysis>/g, '')
			.replace(/<\/?reasoning>/g, '')
			.trim();
	}

	/**
	 * Clean JSON-like strings that might have extra formatting
	 */
	static cleanJSONString(jsonStr: string): string {
		if (!jsonStr) return jsonStr;

		let cleaned = jsonStr.trim();

		// Remove markdown code block markers
		if (cleaned.startsWith('```')) {
			cleaned = cleaned.replace(/^```(?:json)?\n?/, '');
			cleaned = cleaned.replace(/\n?```\s*$/, '');
		}

		// Remove potential leading/trailing quotes if entire string is quoted
		if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
			cleaned = cleaned.slice(1, -1);
		}

		return cleaned.trim();
	}

	/**
	 * Strip ANSI color codes from terminal output
	 */
	static stripAnsiCodes(text: string): string {
		if (!text) return text;

		// ANSI escape code pattern
		const ansiRegex = /\x1b\[[0-9;]*[a-zA-Z]/g;
		return text.replace(ansiRegex, '');
	}

	/**
	 * Normalize line endings to \n
	 */
	static normalizeLineEndings(text: string): string {
		if (!text) return text;
		return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	}

	/**
	 * Remove excessive empty lines (more than 2 consecutive)
	 */
	static removeExcessiveEmptyLines(text: string): string {
		if (!text) return text;
		return text.replace(/\n{3,}/g, '\n\n');
	}

	/**
	 * Comprehensive content cleaning pipeline
	 */
	static cleanContent(content: string, options?: {
		removeCodeBlocks?: boolean;
		removeXMLTags?: boolean;
		normalizeWhitespace?: boolean;
		stripAnsi?: boolean;
	}): string {
		if (!content) return content;

		let cleaned = content;

		const opts = {
			removeCodeBlocks: true,
			removeXMLTags: true,
			normalizeWhitespace: true,
			stripAnsi: true,
			...options
		};

		if (opts.stripAnsi) {
			cleaned = this.stripAnsiCodes(cleaned);
		}

		if (opts.removeCodeBlocks) {
			cleaned = this.cleanGeneratedContent(cleaned);
		}

		if (opts.removeXMLTags) {
			cleaned = this.removeXMLTags(cleaned);
		}

		if (opts.normalizeWhitespace) {
			cleaned = this.normalizeLineEndings(cleaned);
			cleaned = this.removeExcessiveEmptyLines(cleaned);
		}

		return cleaned.trim();
	}
}
