import { I18nManager } from '../../i18n/i18n-manager';

/**
 * MCPConnectedTools component handles rendering of connected MCP tools section
 * Used in the tool management section to show all connected MCP tools across servers
 */
export class MCPConnectedTools {
	private i18n: I18nManager;

	constructor(i18n: I18nManager) {
		this.i18n = i18n;
	}

	/**
	 * Render connected MCP tools section
	 */
	render(
		container: HTMLElement,
		connectedServers: unknown[],
		mcpManager: unknown,
		onServerDetailsClick: (serverId: string) => void
	): void {
		const mcpTools = [];

		// Collect tools from all connected servers
		for (const server of connectedServers) {
			const serverTools = mcpManager.getServerTools(server.serverId) || [];
			for (const tool of serverTools) {
				mcpTools.push({
					serverId: server.serverId,
					...tool
				});
			}
		}

		if (mcpTools.length === 0) {
			const emptyState = container.createDiv({ cls: 'llmsider-empty-state' });
			emptyState.style.cssText = 'text-align: center; padding: 48px 16px; color: var(--text-muted);';
			
			const emptyIcon = emptyState.createDiv();
			emptyIcon.innerHTML = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px; opacity: 0.5;">
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
			</svg>`;
			
			emptyState.createEl('p', { 
				text: this.i18n.t('settingsPage.toolManagement.noMCPTools'),
				cls: 'llmsider-empty-state-text'
			});
			return;
		}

		// Group tools by server
		const toolsByServer = mcpTools.reduce((acc, tool) => {
			if (!acc[tool.serverId]) {
				acc[tool.serverId] = [];
			}
			acc[tool.serverId].push(tool);
			return acc;
		}, {} as Record<string, unknown[]>);

		// Render tools grouped by server
		Object.entries(toolsByServer).forEach(([serverId, serverTools]) => {
			const tools = serverTools as unknown[];
			const serverSection = container.createDiv({ cls: 'llmsider-mcp-server-section' });
			
			const serverHeader = serverSection.createDiv({ cls: 'llmsider-mcp-server-header' });
			serverHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--background-secondary); border-radius: 4px; margin-bottom: 8px; cursor: pointer;';
			
			const serverTitle = serverHeader.createEl('h4', { 
				text: `${serverId} (${tools.length} tools)`,
				cls: 'llmsider-mcp-server-title'
			});
			serverTitle.style.cssText = 'margin: 0; font-size: 14px; font-weight: 600; color: var(--text-normal);';
			
			const expandButton = serverHeader.createEl('span', { 
				text: '▼',
				cls: 'llmsider-mcp-expand-icon'
			});
			expandButton.style.cssText = 'font-size: 12px; transition: transform 0.2s;';
			
			const toolsList = serverSection.createDiv({ cls: 'llmsider-mcp-tools-list' });
			toolsList.style.display = 'block';
			
			let isExpanded = true;
			serverHeader.addEventListener('click', () => {
				isExpanded = !isExpanded;
				toolsList.style.display = isExpanded ? 'block' : 'none';
				expandButton.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
			});
			
			// Render tools
			tools.forEach((tool: unknown) => {
				const toolItem = toolsList.createDiv({ cls: 'llmsider-mcp-tool-item' });
				toolItem.style.cssText = 'padding: 12px; margin-bottom: 8px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px;';
				
				const toolName = toolItem.createEl('div', { 
					text: tool.name,
					cls: 'llmsider-mcp-tool-name'
				});
				toolName.style.cssText = 'font-weight: 500; font-size: 13px; margin-bottom: 4px;';
				
				if (tool.description) {
					const toolDesc = toolItem.createEl('div', { 
						text: tool.description,
						cls: 'llmsider-mcp-tool-description'
					});
					toolDesc.style.cssText = 'font-size: 12px; color: var(--text-muted); line-height: 1.4;';
				}
			});
			
			// Link to server details
			const viewDetailsLink = serverSection.createEl('a', { 
				text: this.i18n.t('settingsPage.toolManagement.viewServerDetails'),
				cls: 'llmsider-mcp-view-details-link'
			});
			viewDetailsLink.style.cssText = 'display: block; text-align: right; font-size: 12px; color: var(--interactive-accent); cursor: pointer; margin-top: 8px;';
			
			viewDetailsLink.addEventListener('click', () => {
				onServerDetailsClick(serverId);
			});
		});
	}
}
