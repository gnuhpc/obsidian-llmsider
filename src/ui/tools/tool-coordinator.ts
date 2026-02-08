import { UnifiedTool } from '../../tools/unified-tool-manager';
import LLMSiderPlugin from '../../main';
import { ToolExecutionManager } from '../../tools/tool-execution-manager';
import { I18nManager } from '../../i18n/i18n-manager';
import { Logger } from '../../utils/logger';

/**
 * Callbacks for ToolCoordinator
 */
export interface ToolCoordinatorCallbacks {
	getCurrentSession: () => any | null;
}

/**
 * ToolCoordinator
 * 
 * Unified manager for all Tool-related logic:
 * - Tool call processing
 * - XML tool call parsing
 * - Available tools information generation
 */
export class ToolCoordinator {
	constructor(
		private plugin: LLMSiderPlugin,
		private toolExecutionManager: ToolExecutionManager,
		private i18n: I18nManager,
		private callbacks: ToolCoordinatorCallbacks
	) {}

	/**
	 * Process tool calls from AI response
	 */
	public async processToolCalls(streamingResult: unknown, accumulatedContent: string, availableTools: UnifiedTool[]): Promise<void> {
		// Process native tool calls first
		if ((streamingResult as any)?.toolCalls && Array.isArray((streamingResult as any).toolCalls)) {
			// Handle native tool calls through the tool execution manager
			Logger.debug('Processing native tool calls:', (streamingResult as any).toolCalls.length);
		}

		// Always check for MCP tool calls in AI response content
		if (availableTools.length > 0) {
			const toolCalls = this.parseXMLToolCalls(accumulatedContent);
			if (toolCalls.length > 0) {
				Logger.debug('Processing MCP tool calls:', toolCalls.length);
				// Tool execution would be handled by the tool execution manager
			}
		}
	}

	/**
	 * Parse XML tool calls from content
	 */
	public parseXMLToolCalls(content: string): Array<{tool: string, parameters: unknown}> {
		const toolCalls: Array<{tool: string, parameters: unknown}> = [];

		// Parse MCP wrapper format
		const xmlToolRegex = /<use_mcp_tool>([\s\S]*?)<\/use_mcp_tool>/g;
		let xmlMatch;

		while ((xmlMatch = xmlToolRegex.exec(content)) !== null) {
			const toolContent = xmlMatch[1];
			const toolNameMatch = toolContent.match(/<tool_name>(.*?)<\/tool_name>/);

			if (toolNameMatch) {
				const toolName = toolNameMatch[1].trim();
				let parameters: unknown = {};

				const argumentsMatch = toolContent.match(/<arguments>([\s\S]*?)<\/arguments>/);
				if (argumentsMatch) {
					try {
						parameters = JSON.parse(argumentsMatch[1].trim());
					} catch {
						parameters = { input: argumentsMatch[1].trim() };
					}
				}

				toolCalls.push({ tool: toolName, parameters });
			}
		}

		return toolCalls;
	}

	/**
	 * Get available tools information for system prompt
	 */
	public async getAvailableToolsInfo(): Promise<string> {
		// Only provide tool information in Agent conversation mode
		const conversationMode = this.plugin.settings.conversationMode || 'normal';
		if (conversationMode !== 'agent') {
			return "AVAILABLE TOOLS: None (Not in Agent conversation mode)";
		}

		try {
			const toolManager = this.plugin.getToolManager();
			if (!toolManager) {
				return "AVAILABLE TOOLS: None";
			}

			const tools = await toolManager.getAllTools();
			if (tools.length === 0) {
				return "AVAILABLE TOOLS: None";
			}

			let toolsInfo = "AVAILABLE TOOLS:\n";

			// Group tools by source
			const builtInTools = tools.filter(t => t.source === 'built-in' && !t.server);
			const fileEditingTools = tools.filter(t => t.source === 'built-in' && t.server === 'file-editing');
			const mcpTools = tools.filter(t => t.source === 'mcp');

			if (builtInTools.length > 0) {
				toolsInfo += "\nBuilt-in Tools:\n";
				builtInTools.forEach(tool => {
					toolsInfo += `- ${tool.name}: ${tool.description}\n`;
				});
			}

			if (fileEditingTools.length > 0) {
				toolsInfo += "\nFile Editing Tools:\n";
				fileEditingTools.forEach(tool => {
					toolsInfo += `- ${tool.name}: ${tool.description}\n`;
				});
			}

			if (mcpTools.length > 0) {
				// Group MCP tools by server
				const mcpByServer = mcpTools.reduce((acc, tool) => {
					const server = tool.server || 'unknown';
					if (!acc[server]) acc[server] = [];
					acc[server].push(tool);
					return acc;
				}, {} as Record<string, typeof mcpTools>);

				toolsInfo += "\nMCP Tools (External Services):\n";
				Object.entries(mcpByServer).forEach(([server, serverTools]) => {
					toolsInfo += `\nFrom ${server} server:\n`;
					serverTools.forEach(tool => {
						toolsInfo += `- ${tool.name}: ${tool.description}\n`;
					});
				});
			}

			toolsInfo += `\nTotal: ${tools.length} tools available\n`;

			return toolsInfo;
		} catch (error) {
			Logger.warn('Failed to get tools info for system prompt:', error);
			return "AVAILABLE TOOLS: Error retrieving tool information";
		}
	}
}
