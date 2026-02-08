import LLMSiderPlugin from '../../main';
import { Logger } from '../../utils/logger';

/**
 * Handles MCP event listeners management
 */
export class EventHandler {
	private mcpEventListeners: (() => void)[] = [];
	private mcpRefreshTimeout: unknown = null;

	constructor(
		private plugin: LLMSiderPlugin,
		private onRefresh: () => Promise<void>
	) {}

	setupMCPEventListeners(): void {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) return;

		// Create event handlers for real-time UI updates
		const onServerConnected = (serverId: string) => {
			Logger.debug(`Server connected: ${serverId}, refreshing MCP UI`);
			this.refreshMCPSections();
		};

		const onServerDisconnected = (serverId: string) => {
			Logger.debug(`Server disconnected: ${serverId}, refreshing MCP UI`);
			this.refreshMCPSections();
		};

		const onServerError = (serverId: string, error: Error) => {
			Logger.debug(`Server error for ${serverId}: ${error.message}, refreshing MCP UI`);
			this.refreshMCPSections();
		};

		const onToolsUpdated = (tools: unknown[]) => {
			Logger.debug(`Tools updated: ${tools.length} tools available, refreshing MCP UI`);
			this.refreshMCPSections();
		};

		// Set up event listeners
		mcpManager.on('server-connected', onServerConnected);
		mcpManager.on('server-disconnected', onServerDisconnected);
		mcpManager.on('server-error', onServerError);
		mcpManager.on('tools-updated', onToolsUpdated);

		// Store cleanup functions
		this.mcpEventListeners = [
			() => mcpManager.off('server-connected', onServerConnected),
			() => mcpManager.off('server-disconnected', onServerDisconnected),
			() => mcpManager.off('server-error', onServerError),
			() => mcpManager.off('tools-updated', onToolsUpdated)
		];
	}

	cleanupMCPEventListeners(): void {
		// Clean up all event listeners
		this.mcpEventListeners.forEach(cleanup => cleanup());
		this.mcpEventListeners = [];
	}

	private refreshMCPSections(): void {
		// Debounce the refresh to avoid too many rapid updates
		if (this.mcpRefreshTimeout) {
			clearTimeout(this.mcpRefreshTimeout);
		}

		this.mcpRefreshTimeout = setTimeout(async () => {
			// Only update MCP cards without full re-render
			await this.onRefresh();
		}, 300); // 300ms debounce
	}
}
