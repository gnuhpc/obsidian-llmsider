import { Logger } from '../../utils/logger';

/**
 * Action Validator Utils - utilities for validating action content completeness
 */
export class ActionValidatorUtils {
	/**
	 * Check if action content contains complete MCP tool call
	 */
	static isActionContentComplete(
		actionContent: string,
		incompleteActionChecks: Map<string, number>,
		showStreamingIndicator: (message: string) => void,
		updateStreamingIndicator: (message: string) => void,
		hideStreamingIndicator: () => void
	): boolean {
		// Check if this looks like an MCP tool call
		if (actionContent.includes('<use_mcp_tool>')) {
			// For MCP format, ensure we have all required closing tags
			const hasToolNameStart = actionContent.includes('<tool_name>');
			const hasToolNameEnd = actionContent.includes('</tool_name>');
			const hasArgumentsStart = actionContent.includes('<arguments>');
			const hasArgumentsEnd = actionContent.includes('</arguments>');
			const hasUseMcpEnd = actionContent.includes('</use_mcp_tool>');

			const isComplete = hasToolNameStart && hasToolNameEnd && hasArgumentsStart && hasArgumentsEnd && hasUseMcpEnd;

			Logger.debug(`MCP completeness check:`, {
				hasToolNameStart,
				hasToolNameEnd,
				hasArgumentsStart,
				hasArgumentsEnd,
				hasUseMcpEnd,
				isComplete
			});

			// If complete, return immediately
			if (isComplete) {
				return true;
			}

			// If we have tool name and arguments start but missing closing tags,
			// implement timeout logic to avoid infinite waiting
			if (hasToolNameStart && hasToolNameEnd && hasArgumentsStart) {
				const contentHash = actionContent.substring(0, 100); // Use first 100 chars as identifier
				const checkCount = (incompleteActionChecks.get(contentHash) || 0) + 1;
				incompleteActionChecks.set(contentHash, checkCount);

				// Show waiting indicator during incomplete action parsing
				if (checkCount === 1) {
					Logger.debug('Starting to wait for complete MCP action content');
					showStreamingIndicator('正在等待工具调用内容完整...');
				} else if (checkCount % 10 === 0) {
					// Update indicator every 10 checks
					updateStreamingIndicator(`正在等待工具调用内容完整... (${checkCount} 次检查)`);
				}

				// If we've been waiting too long (over 30 checks), try to process anyway
				if (checkCount > 30) {
					Logger.debug(`Timeout waiting for complete MCP structure, attempting to process incomplete action (${checkCount} checks)`);
					Logger.debug(`Incomplete content:`, actionContent.substring(0, 200) + '...');
					// Hide the waiting indicator before processing
					hideStreamingIndicator();
					return true; // Force processing to prevent infinite loop
				}

				// Not complete yet and haven't timed out
				return false;
			}

			// Missing essential parts, not complete
			return false;
		}

		// For non-MCP content, assume it's complete if we have the action tags
		return true;
	}
}
