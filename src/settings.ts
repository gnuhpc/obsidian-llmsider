import { App, PluginSettingTab, Setting, Notice, Modal } from 'obsidian';
import { Logger } from './utils/logger';
import LLMSiderPlugin from './main';
import { LLMSiderSettings, ProviderType, LLMConnection, LLMModel } from './types';
import { getAllBuiltInTools, getLocalizedBuiltInTools, BuiltInTool } from './tools/built-in-tools';
import { I18nManager } from './i18n/i18n-manager';
import { ModelModal } from './ui/model-modal';
import { ConnectionModal } from './ui/connection-modal';
import { CHUNK_SIZE_MIN, CHUNK_SIZE_MAX, CHUNK_OVERLAP_MIN, CHUNK_OVERLAP_MAX } from './vector/types';
// Import from modularized settings utilities
import { categoryMap, getCategoryDisplayName } from './settings/utils/category-utils';
import { getCategoryIcon } from './settings/utils/tool-icons';
import { PROVIDER_TYPE_NAMES, getProviderTypeName } from './settings/utils/provider-logos';
import { getMCPServerIcon, getMCPServerCommand } from './settings/utils/mcp-utils';
import { MCPCardUpdater } from './settings/utils/mcp-card-updater';
// Import handlers
import { ConnectionHandler } from './settings/handlers/connection-handler';
import { ModelHandler } from './settings/handlers/model-handler';
import { EventHandler } from './settings/handlers/event-handler';
import { ToolPermissionHandler } from './settings/handlers/tool-permission-handler';
import { MCPHandler } from './settings/handlers/mcp-handler';
// Import components
import { ToolButtonControls } from './settings/components/tool-button-controls';
import { MCPServerCard } from './settings/components/mcp-server-card';
import { MCPServerDetails } from './settings/components/mcp-server-details';
import { MCPConnectedTools } from './settings/components/mcp-connected-tools';
// Import renderers
import { VectorDBRenderer } from './settings/renderers/vector-db-renderer';
import { BuiltInToolsRenderer } from './settings/renderers/builtin-tools-renderer';
import { ConnectionModelRenderer } from './settings/renderers/connection-model-renderer';
import { MCPSettingsRenderer } from './settings/renderers/mcp-settings-renderer';
import { MCPInlineEditor } from './settings/renderers/mcp-inline-editor';
import { AdvancedSettingsRenderer } from './settings/renderers/advanced-settings-renderer';
import { ToolManagementSectionRenderer } from './settings/renderers/tool-management-section-renderer';
import { PromptManagementRenderer } from './settings/renderers/prompt-management-renderer';
import { MemorySettingsRenderer } from './settings/renderers/memory-settings-renderer';
// Import modals
import { MCPToolsModal } from './settings/modals/mcp-tools-modal';
import { MCPToolDetailsModal } from './settings/modals/mcp-tool-details-modal';

// Re-export for backward compatibility
export { categoryMap, getCategoryDisplayName, getCategoryIcon };

export class LLMSiderSettingTab extends PluginSettingTab {
	plugin: LLMSiderPlugin;
	private mcpEventListeners: (() => void)[] = [];
	private i18n: I18nManager;
	private isRendering: boolean = false;
	private pendingRender: boolean = false;
	// Handlers
	private connectionHandler: ConnectionHandler;
	private modelHandler: ModelHandler;
	private eventHandler: EventHandler;
	private toolPermissionHandler: ToolPermissionHandler;
	private mcpHandler: MCPHandler;
	// Components
	private toolButtonControls: ToolButtonControls;
	private mcpServerCard: MCPServerCard;
	private mcpServerDetails: MCPServerDetails;
	private mcpConnectedTools: MCPConnectedTools;
	// Renderers
	private vectorDBRenderer: VectorDBRenderer;
	private builtInToolsRenderer: BuiltInToolsRenderer;
	private connectionModelRenderer: ConnectionModelRenderer;
	private mcpSettingsRenderer: MCPSettingsRenderer;
	private mcpInlineEditor: MCPInlineEditor;
	private advancedSettingsRenderer: AdvancedSettingsRenderer;
	private toolManagementSectionRenderer: ToolManagementSectionRenderer;
	private promptManagementRenderer: PromptManagementRenderer;
	private memorySettingsRenderer: MemorySettingsRenderer;
	// Utils
	private mcpCardUpdater: MCPCardUpdater;
	// Modals
	private mcpToolsModal: MCPToolsModal;
	private mcpToolDetailsModal: MCPToolDetailsModal;

	constructor(app: App, plugin: LLMSiderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.i18n = plugin.getI18nManager()!;
		
		// Initialize handlers first
		this.connectionHandler = new ConnectionHandler(this.app, this.plugin, this.i18n, () => this.display());
		this.modelHandler = new ModelHandler(this.app, this.plugin, this.i18n, () => this.display());
		this.toolPermissionHandler = new ToolPermissionHandler(this.plugin, this.i18n, () => this.display());
		
		// Initialize components
		this.toolButtonControls = new ToolButtonControls(this.i18n);
		this.mcpConnectedTools = new MCPConnectedTools(this.i18n);
		
		// Initialize MCP handler (needs to be created early for card updater callback)
		this.mcpHandler = new MCPHandler(this.app, this.plugin, this.i18n, () => this.display(), async () => await this.updateAllMCPCards());
		
		// Initialize MCP components (need mcpHandler)
		this.mcpServerCard = new MCPServerCard(this.i18n, this.mcpHandler, this.toolButtonControls, this.plugin, this.toolPermissionHandler);
		this.mcpServerDetails = new MCPServerDetails(this.i18n, this.toolButtonControls, this.plugin, () => this.display(), this.toolPermissionHandler);
		
		// Initialize utils (need mcpServerCard)
		this.mcpCardUpdater = new MCPCardUpdater(this.plugin, this.mcpServerCard);
		
		// Initialize event handler (needs mcpCardUpdater)
		this.eventHandler = new EventHandler(this.plugin, async () => await this.mcpCardUpdater.updateAllCards());
		
		// Initialize renderers
		this.vectorDBRenderer = new VectorDBRenderer(this.app, this.plugin, this.i18n);
		this.builtInToolsRenderer = new BuiltInToolsRenderer(this.plugin, this.i18n, this.toolButtonControls, this.toolPermissionHandler);
		this.connectionModelRenderer = new ConnectionModelRenderer(this.app, this.plugin, this.i18n, () => this.display());
		this.mcpSettingsRenderer = new MCPSettingsRenderer(this.plugin, this.i18n, this.mcpHandler, this.toolPermissionHandler, this.mcpServerCard, this.mcpServerDetails);
		this.mcpInlineEditor = new MCPInlineEditor(this.plugin, this.i18n, this.mcpHandler);
		this.advancedSettingsRenderer = new AdvancedSettingsRenderer(this.plugin, this.i18n, this.connectionModelRenderer);
		this.toolManagementSectionRenderer = new ToolManagementSectionRenderer(this.i18n, this.builtInToolsRenderer);
		this.promptManagementRenderer = new PromptManagementRenderer(this.plugin, this.i18n, () => this.display());
		this.memorySettingsRenderer = new MemorySettingsRenderer(this.app, this.plugin, this.i18n);
		
		// Initialize modals
		this.mcpToolsModal = new MCPToolsModal(this.plugin, this.i18n, this.toolButtonControls);
		this.mcpToolDetailsModal = new MCPToolDetailsModal(this.i18n);
	}

	hide(): void {
		// Clean up vector DB callbacks when settings tab is hidden
		const vectorDBManager = this.plugin.getVectorDBManager();
		if (vectorDBManager) {
			vectorDBManager.setProgressCallback(null);
			vectorDBManager.setStatsUpdateCallback(null);
		}
		
		// Clean up event listeners when settings tab is hidden
		this.eventHandler.cleanupMCPEventListeners();
		super.hide();
	}

	async display(): Promise<void> {
		// Prevent overlapping renders
		if (this.isRendering) {
			this.pendingRender = true;
			return;
		}

		this.isRendering = true;
		this.pendingRender = false;

		const { containerEl } = this;
		containerEl.empty();

		// Clean up existing MCP event listeners
		this.eventHandler.cleanupMCPEventListeners();

		// Set up MCP event listeners for real-time status updates
		this.eventHandler.setupMCPEventListeners();

		// Header
		const mainHeader = containerEl.createDiv({ cls: 'llmsider-settings-header' });
		mainHeader.style.marginBottom = '20px';

		// Connection + Model Settings Section (New Architecture)
		this.connectionModelRenderer.render(containerEl);

		// Legacy Provider Settings Section (Hidden - Deprecated)
		// this.renderProviderSettings(containerEl);

		// UI Settings Section (moved to Advanced Settings)
		// this.renderUISettings(containerEl);

		// MCP Settings Section
		this.mcpSettingsRenderer.renderMCPSettings(containerEl);
		
		// Render MCP Inline Editor (controls section at the bottom of MCP Settings)
		const mcpContainer = containerEl.querySelector('.llmsider-mcp-container') as HTMLElement;
		if (mcpContainer) {
			this.mcpInlineEditor.renderInlineMCPEditor(mcpContainer, () => this.display());
		}

		// Tool Management Section (Independent - manages both built-in and MCP tools)
		this.renderToolManagementSection(containerEl);

		// Prompt Management Section
		await this.promptManagementRenderer.render(containerEl);

		// Memory Settings Section
		await this.memorySettingsRenderer.render(containerEl);

		// Vector Database Settings Section
		await this.vectorDBRenderer.render(containerEl);

		// Advanced Settings Section
		this.advancedSettingsRenderer.render(containerEl);

		// Release rendering lock
		this.isRendering = false;

		// If another render was requested while we were rendering, do it now
		if (this.pendingRender) {
			this.display();
		}
	}

	/**
	 * Render Tool Management Section (Independent - manages both built-in and MCP tools)
	 */
	private renderToolManagementSection(containerEl: HTMLElement): void {
		this.toolManagementSectionRenderer.render(containerEl);
	}

	private async updateAllMCPCards(): Promise<void> {
		await this.mcpCardUpdater.updateAllCards();
	}
}
