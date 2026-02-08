import { Notice } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { ToolButtonControls } from '../components/tool-button-controls';

/**
 * MCP Tools Modal - handles rendering and managing the MCP tools list modal
 */
export class MCPToolsModal {
	constructor(
		private plugin: LLMSiderPlugin,
		private i18n: I18nManager,
		private toolButtonControls: ToolButtonControls
	) {}

	/**
	 * Show the MCP tools modal with all available tools
	 */
	async show(): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return;
		}

		try {
			const tools = await mcpManager.listAllTools();
			
			if (tools.length === 0) {
				const i18n = plugin.getI18nManager();
				new Notice(i18n?.t('notifications.settingsHandlers.noMCPToolsAvailable') || 'No MCP tools available');
				return;
			}

			// Show tools in a modal with modern design
			const modal = document.body.createDiv({ cls: 'llmsider-mcp-tools-modal' });
			modal.style.display = 'flex';
			
			const container = modal.createDiv({ cls: 'llmsider-mcp-tools-container' });
			const i18n = plugin.getI18nManager();
			container.createEl('h2', { text: `${i18n?.t('settingsPage.availableMCPTools') || 'Available MCP Tools'} (${tools.length})` });
			
			const toolsList = container.createDiv({ cls: 'llmsider-tools-list' });
			
			tools.forEach(tool => {
				this.renderToolCard(toolsList, tool, mcpManager);
			});
			
			this.renderCloseButton(container, modal);
			
			modal.onclick = (e) => {
				if (e.target === modal) modal.remove();
			};
		} catch (error) {
			const i18n = plugin.getI18nManager();
			new Notice(i18n?.t('notifications.settingsHandlers.failedToListTools', { error: error instanceof Error ? error.message : 'Unknown error' }) || `Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Render a single tool card in the modal
	 */
	private renderToolCard(toolsList: HTMLElement, tool: unknown, mcpManager: unknown): void {
		const isToolEnabled = mcpManager.getToolEnabled(tool.server, tool.name);
		const requireConfirmation = mcpManager.getToolRequireConfirmation(tool.server, tool.name);
		
		// Modern tool card - full width
		const toolItem = toolsList.createDiv({ cls: 'llmsider-modern-tool-card' });
		toolItem.style.cssText = `
			position: relative !important;
			overflow: hidden !important;
			border-radius: 8px !important;
			border: 1px solid var(--background-modifier-border) !important;
			background: var(--background-primary) !important;
			padding: 16px !important;
			transition: all 0.2s ease !important;
			margin-bottom: 12px !important;
			display: block !important;
			width: 100% !important;
			box-sizing: border-box !important;
		`;
		
		toolItem.addEventListener('mouseenter', () => {
			toolItem.style.borderColor = 'var(--interactive-accent)';
			toolItem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
		});
		toolItem.addEventListener('mouseleave', () => {
			toolItem.style.borderColor = 'var(--background-modifier-border)';
			toolItem.style.boxShadow = 'none';
		});

		// Main content container
		const mainContent = toolItem.createDiv({ cls: 'llmsider-modern-tool-main' });
		mainContent.style.cssText = 'display: flex !important; align-items: start !important; justify-content: space-between !important; gap: 16px !important;';

		// Left side: Tool info
		this.renderToolInfo(mainContent, tool);

		// Right side: Controls with button groups
		this.renderToolControls(mainContent, tool, mcpManager, isToolEnabled, requireConfirmation);
	}

	/**
	 * Render tool information (name, description, schema)
	 */
	private renderToolInfo(mainContent: HTMLElement, tool: unknown): void {
		const toolInfo = mainContent.createDiv({ cls: 'llmsider-modern-tool-info' });
		toolInfo.style.cssText = 'flex: 1 !important; min-width: 0 !important;';

		// Tool name and server badge
		const toolHeader = toolInfo.createDiv();
		toolHeader.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;';
		
		const toolName = toolHeader.createEl('h3', { text: tool.name });
		toolName.style.cssText = 'margin: 0 !important; font-size: 14px !important; font-weight: 600 !important; color: var(--text-normal) !important;';

		const serverBadge = toolHeader.createEl('span', { text: tool.server });
		serverBadge.style.cssText = 'font-size: 11px; padding: 2px 6px; background: var(--background-modifier-border); color: var(--text-muted); border-radius: 3px;';

		if (tool.description) {
			const toolDesc = toolInfo.createEl('p', { text: tool.description });
			toolDesc.style.cssText = 'margin: 0 !important; font-size: 13px !important; line-height: 1.5 !important; color: var(--text-muted) !important;';
		}

		// Tool schema info (collapsible)
		if (tool.inputSchema) {
			const schemaToggle = toolInfo.createEl('details', { cls: 'llmsider-mcp-tool-schema' });
			schemaToggle.style.cssText = 'margin-top: 12px;';
			schemaToggle.createEl('summary', { text: this.i18n.t('settingsPage.viewInputSchema') });
			const schemaContent = schemaToggle.createEl('pre', { cls: 'llmsider-mcp-tool-schema-content' });
			schemaContent.textContent = JSON.stringify(tool.inputSchema, null, 2);
		}
	}

	/**
	 * Render tool control buttons (enable/disable, confirmation)
	 */
	private renderToolControls(
		mainContent: HTMLElement,
		tool: unknown,
		mcpManager: unknown,
		isToolEnabled: boolean,
		requireConfirmation: boolean
	): void {
		const controlsContainer = mainContent.createDiv({ cls: 'llmsider-modern-tool-controls' });
		controlsContainer.style.cssText = 'display: flex !important; flex-direction: column !important; gap: 10px !important; flex-shrink: 0 !important;';

		// Use helper method to create button controls
		this.toolButtonControls.create(
			controlsContainer,
			isToolEnabled,
			requireConfirmation,
			async (enabled) => {
				mcpManager.setToolEnabled(tool.server, tool.name, enabled);
				await this.plugin.saveSettings();
				new Notice(this.i18n.t('settingsPage.toolManagement.toolToggled', {
					name: tool.name,
					status: enabled ? this.i18n.t('settingsPage.toolManagement.enabled') : this.i18n.t('settingsPage.toolManagement.disabled')
				}));
			},
			async (requireConfirm) => {
				mcpManager.setToolRequireConfirmation(tool.server, tool.name, requireConfirm);
			}
		);
	}

	/**
	 * Render the close button for the modal
	 */
	private renderCloseButton(container: HTMLElement, modal: HTMLElement): void {
		const closeBtn = container.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-modal-close-btn',
			title: 'Close'
		});
		closeBtn.innerHTML = '❌';
		closeBtn.onclick = () => modal.remove();
	}
}
