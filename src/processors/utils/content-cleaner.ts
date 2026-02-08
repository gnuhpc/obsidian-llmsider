import { Logger } from '../../utils/logger';

/**
 * Content cleaning utilities for generated and web content
 */
export class ContentCleaner {
	/**
	 * Clean tool arguments to remove unwanted prefixes and formatting
	 * This is especially important for str_replace tool where old_str must match exactly
	 */
	static cleanGeneratedContent(content: string): string {
		if (!content || typeof content !== 'string') {
			return content;
		}

		let cleaned = content;

		// Remove common LLM-generated prefixes and explanations
		const unwantedPrefixes = [
			/^Here (?:is|are) the .*?:\s*/i,
			/^(?:The|This) (?:code|content|text|file) .*?:\s*/i,
			/^I(?:'ll| will) (?:create|add|modify|replace) .*?:\s*/i,
			/^Let me .*?:\s*/i,
			/^(?:Sure|OK|Okay),? .*?:\s*/i,
			/^Based on .*?:\s*/i
		];

		for (const pattern of unwantedPrefixes) {
			cleaned = cleaned.replace(pattern, '');
		}

		// Remove markdown code blocks if the content is wrapped in them
		const codeBlockMatch = cleaned.match(/^```(?:\w+)?\s*\n([\s\S]*?)\n```\s*$/);
		if (codeBlockMatch) {
			cleaned = codeBlockMatch[1];
		}

		return cleaned.trim();
	}

	/**
	 * Process web content fetched by fetch_web_content tool
	 * Extracts meaningful information and formats it properly
	 */
	static processWebContent(content: string): string {
		Logger.debug('Processing web content, original length:', content.length);
		
		// If content is too short, likely an error page
		if (content.length < 100) {
			Logger.warn('Web content too short, likely an error page');
			return content;
		}

		// Remove common web noise patterns
		let processed = content;
		
		// Remove navigation and common UI elements
		const noisePatterns = [
			/Home\s+My Books\s+Browse\s+▾[\s\S]*?More Genres/gi,
			/Company\s+About us[\s\S]*?© \d{4}[\s\S]*?$/gi,
			/Welcome back\.\s+Just a moment while we sign you in/gi,
			/Two links diverged[\s\S]*?— adapted from The Road Not Taken/gi,
			/(Sign in|Sign up|Login|Register)\s+/gi,
			/(Cookie Policy|Privacy Policy|Terms of Service)/gi,
			/\[Advertisement\]/gi,
			/Skip to (content|main)/gi
		];

		for (const pattern of noisePatterns) {
			processed = processed.replace(pattern, '');
		}

		// Clean up excessive whitespace
		processed = processed
			.replace(/\n{3,}/g, '\n\n')
			.replace(/\s{2,}/g, ' ')
			.trim();

		// Check if we got meaningful content
		const contentLength = processed.length;
		const originalLength = content.length;
		const reductionRatio = 1 - (contentLength / originalLength);

		Logger.debug('Web content processed:', {
			originalLength,
			processedLength: contentLength,
			reductionRatio: `${(reductionRatio * 100).toFixed(1)}%`,
			hasContent: contentLength > 50
		});

		// If we removed too much content (>90%), it might be over-filtered
		if (reductionRatio > 0.9) {
			Logger.warn('Over-filtered, returning original content');
			return content;
		}

		// If processed content is still too short, return original
		if (contentLength < 50) {
			Logger.warn('Processed content too short, returning original');
			return content;
		}

		return processed;
	}
}
