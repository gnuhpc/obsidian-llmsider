import { Notice } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { MCPHandler } from '../handlers/mcp-handler';

/**
 * MCPInlineEditor
 * Handles the inline JSON editor for MCP configuration with:
 * - Opening and closing the inline editor
 * - Save and validate buttons
 * - Import/Export MCP configuration
 * - JSON validation and error handling
 */
export class MCPInlineEditor {
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;
	private mcpHandler: MCPHandler;

	constructor(
		plugin: LLMSiderPlugin,
		i18n: I18nManager,
		mcpHandler: MCPHandler
	) {
		this.plugin = plugin;
		this.i18n = i18n;
		this.mcpHandler = mcpHandler;
	}

	/**
	 * Renders the inline MCP editor with import/export buttons
	 */
	renderInlineMCPEditor(container: HTMLElement, displayCallback: () => void): void {
		const editorContainer = container.createDiv({ cls: 'llmsider-mcp-inline-editor-container' });

		// Editor header with toggle button and import/export actions
		const editorHeader = editorContainer.createDiv({ cls: 'llmsider-mcp-editor-header' });
		const headerContent = editorHeader.createDiv({ cls: 'llmsider-mcp-editor-header-content' });
		headerContent.createEl('h3', { text: this.i18n.t('mcp.configuration.title'), cls: 'llmsider-mcp-editor-title' });

		// Add action buttons on the right
		const headerActions = editorHeader.createDiv({ cls: 'llmsider-mcp-editor-actions' });

		// Import button
		const importBtn = headerActions.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-import-btn',
			title: this.i18n.t('mcp.configuration.importFromClaude')
		});
		importBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
			<polyline points="7 10 12 15 17 10"></polyline>
			<line x1="12" y1="15" x2="12" y2="3"></line>
		</svg>`;
		importBtn.onclick = () => this.mcpHandler.importMCPConfig();

		// Export button
		const exportBtn = headerActions.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-export-btn',
			title: this.i18n.t('mcp.configuration.exportToClaude')
		});
		exportBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
			<polyline points="17 8 12 3 7 8"></polyline>
			<line x1="12" y1="3" x2="12" y2="15"></line>
		</svg>`;
		exportBtn.onclick = () => this.mcpHandler.exportMCPConfig();

		// Edit Configuration button
		const toggleButton = headerActions.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-edit-config-btn',
			title: this.i18n.t('mcp.configuration.editConfiguration')
		});
		toggleButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
			<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
		</svg>`;
		
		// Editor content area (initially hidden)
		const editorContent = editorContainer.createDiv({ 
			cls: 'llmsider-mcp-editor-content',
			attr: { style: 'display: none;' }
		});
		
		let isEditorOpen = false;
		let currentTextarea: HTMLTextAreaElement | null = null;

		toggleButton.onclick = async () => {
			if (isEditorOpen) {
				// Close editor
				editorContent.style.display = 'none';
				toggleButton.title = this.i18n.t('mcp.configuration.editConfiguration');
				toggleButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
					<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
				</svg>`;
				isEditorOpen = false;
				currentTextarea = null;
			} else {
				// Open editor
				currentTextarea = await this.openInlineEditor(editorContent, displayCallback);
				editorContent.style.display = 'block';
				toggleButton.title = this.i18n.t('mcp.configuration.closeEditor');
				toggleButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>`;
				isEditorOpen = true;
			}
		};
		
		// Add description
		const description = editorContainer.createEl('p', {
			text: this.i18n.t('mcp.configuration.description'),
			cls: 'llmsider-mcp-editor-desc'
		});
	}

	/**
	 * Opens the inline MCP JSON editor
	 */
	private async openInlineEditor(container: HTMLElement, displayCallback: () => void): Promise<HTMLTextAreaElement | null> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return null;
		}

		try {
			const currentConfig = await mcpManager.exportConfig();
			const jsonString = JSON.stringify(currentConfig, null, 2);

			// Clear container
			container.empty();
			
			// Create textarea
			const textarea = container.createEl('textarea', {
				cls: 'llmsider-mcp-inline-textarea',
				attr: {
					placeholder: 'Enter MCP configuration in JSON format...',
					spellcheck: 'false'
				}
			});
			
			textarea.value = jsonString;
			
			// Create action buttons
			const buttonContainer = container.createDiv({ cls: 'llmsider-mcp-inline-buttons' });
			
			// Save button with floppy disk icon
			const saveBtn = buttonContainer.createEl('button', {
				cls: 'llmsider-provider-action-btn llmsider-mcp-save-btn',
				title: this.i18n.t('settingsPage.saveConfiguration')
			});
			saveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
				<polyline points="17 21 17 13 7 13 7 21"></polyline>
				<polyline points="7 3 7 8 15 8"></polyline>
			</svg>`;

			// Validate button with document check icon
			const validateBtn = buttonContainer.createEl('button', {
				cls: 'llmsider-provider-action-btn llmsider-mcp-validate-btn',
				title: this.i18n.t('settingsPage.validateJSON')
			});
			validateBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
				<polyline points="14 2 14 8 20 8"></polyline>
				<polyline points="9 15 11 17 15 13"></polyline>
			</svg>`;
			
			// Button handlers
			saveBtn.onclick = async () => {
				await this.saveMCPConfigFromTextarea(textarea, displayCallback);
			};
			
			validateBtn.onclick = () => {
				this.validateMCPJson(textarea);
			};
			
			return textarea;
			
		} catch (error) {
			new Notice(`Failed to load MCP configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return null;
		}
	}

	/**
	 * Saves the MCP configuration from the textarea
	 */
	private async saveMCPConfigFromTextarea(textarea: HTMLTextAreaElement, displayCallback: () => void): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			new Notice(this.i18n.t('notifications.mcp.managerNotAvailable'));
			return;
		}

		try {
			const newConfig = JSON.parse(textarea.value);
			await mcpManager.importConfig(newConfig);
			await this.plugin.saveSettings();
			new Notice(this.i18n.t('notifications.mcp.configSaved'));
			
			// Refresh the entire settings display to show updated server list
			displayCallback();
		} catch (error) {
			if (error instanceof SyntaxError) {
				new Notice(this.i18n.t('notifications.mcp.invalidJson', { error: error.message }));
			} else {
				new Notice(this.i18n.t('notifications.mcp.importFailed', { 
					error: error instanceof Error ? error.message : 'Unknown error' 
				}));
			}
		}
	}

	/**
	 * Validates the MCP JSON configuration
	 */
	private validateMCPJson(textarea: HTMLTextAreaElement): void {
		try {
			const config = JSON.parse(textarea.value);
			
			// Basic validation
			if (!config.mcpServers || typeof config.mcpServers !== 'object') {
				throw new Error('Configuration must have "mcpServers" object');
			}
			
			// Validate server entries
			const serverCount = Object.keys(config.mcpServers).length;
			
			new Notice(this.i18n.t('notifications.mcp.validJsonConfig', { count: serverCount }));
		} catch (error) {
			if (error instanceof SyntaxError) {
				new Notice(this.i18n.t('notifications.mcp.invalidJsonSyntax', { error: error.message }));
			} else {
				new Notice(this.i18n.t('notifications.mcp.configurationError', { 
					error: error instanceof Error ? error.message : 'Unknown error' 
				}));
			}
		}
	}
}
