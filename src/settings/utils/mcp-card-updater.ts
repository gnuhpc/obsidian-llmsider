import type LLMSiderPlugin from '../../main';
import type { MCPServerCard } from '../components/mcp-server-card';

/**
 * MCP Card Updater - handles updating MCP server cards in the UI
 */
export class MCPCardUpdater {
	constructor(
		private plugin: LLMSiderPlugin,
		private mcpServerCard: MCPServerCard
	) {}

	/**
	 * Update a single MCP card by server ID
	 */
	async updateSingleCard(serverId: string): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		// Find the existing card
		const oldCard = document.querySelector(`[data-server-id="${serverId}"]`) as HTMLElement;
		if (!oldCard) return;

		// Get parent container
		const container = oldCard.parentElement;
		if (!container) return;

		// Get updated server data
		const state = mcpManager.getState();
		const serverConfigs = state.serversConfig.mcpServers;
		const serverConfig = serverConfigs[serverId];
		if (!serverConfig) return;

		const isConnected = state.connectedServers.has(serverId);
		const health = mcpManager.getServerHealth(serverId);
		// Get all tools and filter by server
		const allTools = mcpManager.getAllAvailableTools();
		const tools = allTools.filter((tool: any) => tool.server === serverId);

		// Create new card element - tool details row not needed for single card update
		const tempContainer = document.createElement('div');
		const dummyToolDetailsRow = document.createElement('div');
		this.mcpServerCard.render(tempContainer, serverId, serverConfig, isConnected, health, tools, mcpManager, dummyToolDetailsRow);
		
		const newCard = tempContainer.firstElementChild as HTMLElement;
		if (newCard) {
			// Replace old card with new card
			oldCard.replaceWith(newCard);
		}
	}

	/**
	 * Update all MCP cards
	 */
	async updateAllCards(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		const state = mcpManager.getState();
		const serverConfigs = state.serversConfig.mcpServers;
		const serverIds = Object.keys(serverConfigs);

		// Update each card individually
		for (const serverId of serverIds) {
			await this.updateSingleCard(serverId);
		}
	}
}
