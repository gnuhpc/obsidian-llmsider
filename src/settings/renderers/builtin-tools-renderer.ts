import { Notice } from 'obsidian';
import LLMSiderPlugin from '../../main';
import { I18nManager } from '../../i18n/i18n-manager';
import { ToolButtonControls } from '../components/tool-button-controls';
import { ToolPermissionHandler } from '../handlers/tool-permission-handler';
import { getAllBuiltInTools, BuiltInTool, getLocalizedBuiltInTools } from '../../tools/built-in-tools';
import { getCategoryDisplayName } from '../utils/category-utils';
import { getCategoryIcon } from '../utils/tool-icons';

/**
 * Built-in Tools Renderer
 * 
 * Handles rendering of built-in tools management UI:
 * - Category-based tool organization
 * - Tool enable/disable toggles
 * - Tool details modal
 * - Category-level actions
 * - Tool search/filtering
 */
export class BuiltInToolsRenderer {
	constructor(
		private plugin: LLMSiderPlugin,
		private i18n: I18nManager,
		private toolButtonControls: ToolButtonControls,
		private toolPermissionHandler: ToolPermissionHandler
	) {}

	/**
	 * Render the main built-in tools management section
	 */
	renderBuiltInToolsManagement(container: HTMLDivElement, filterText: string = ''): void {
		// Import built-in tools with localization
		const allBuiltInTools = getAllBuiltInTools({ i18n: this.i18n, asArray: true }) as BuiltInTool[];

		if (allBuiltInTools.length === 0) {
			const emptyState = container.createDiv({ cls: 'llmsider-mcp-tool-empty' });
			emptyState.style.padding = '20px';
			emptyState.style.textAlign = 'center';
			emptyState.style.background = 'var(--background-secondary)';
			emptyState.style.borderRadius = '4px';
			emptyState.createEl('p', {
				text: this.i18n.t('settingsPage.noBuiltInTools'),
				cls: 'llmsider-empty-text'
			}).style.color = 'var(--text-muted)';
			return;
		}

		// Group tools by category
		const toolsByCategory = new Map<string, typeof allBuiltInTools>();
		allBuiltInTools.forEach(tool => {
			const category = (tool as any).category || 'utility';
			if (!toolsByCategory.has(category)) {
				toolsByCategory.set(category, []);
			}
			toolsByCategory.get(category)!.push(tool);
		});
		
		// Filter tools if search text provided
		const filteredToolsByCategory = new Map<string, typeof allBuiltInTools>();
		if (filterText) {
			const lowerFilter = filterText.toLowerCase();
			toolsByCategory.forEach((tools, category) => {
				const filteredTools = tools.filter((tool: any) =>
					tool.name.toLowerCase().includes(lowerFilter) ||
					(tool.description && tool.description.toLowerCase().includes(lowerFilter))
				);
				if (filteredTools.length > 0) {
					filteredToolsByCategory.set(category, filteredTools);
				}
			});
		} else {
			// No filter, use all tools
			toolsByCategory.forEach((tools, category) => {
				filteredToolsByCategory.set(category, tools);
			});
		}
		
		// Show no results message if nothing matches
		if (filteredToolsByCategory.size === 0) {
			const noResultsState = container.createDiv({ cls: 'llmsider-mcp-tool-empty' });
			noResultsState.style.padding = '20px';
			noResultsState.style.textAlign = 'center';
			noResultsState.style.background = 'var(--background-secondary)';
			noResultsState.style.borderRadius = '4px';
			noResultsState.createEl('p', {
				text: this.i18n.t('ui.noMatchingTools'),
				cls: 'llmsider-empty-text'
			}).style.color = 'var(--text-muted)';
			return;
		}

		// Category cards grid
		const categoryGrid = container.createDiv({ cls: 'llmsider-builtin-category-grid' });
		
		// Create details row FIRST (will be positioned by order)
		const toolDetailsRow = categoryGrid.createDiv({ cls: 'llmsider-builtin-tools-details-row' });
		toolDetailsRow.style.display = 'none';
		toolDetailsRow.style.gridColumn = '1 / -1';
		toolDetailsRow.style.order = '9999'; // Initially at end
		
		let currentExpandedCard: HTMLDivElement | null = null;

		// Render category cards
		filteredToolsByCategory.forEach((tools, category) => {
			const categoryCard = categoryGrid.createDiv({ cls: 'llmsider-builtin-category-card' });
			categoryCard.style.cursor = 'pointer';
			categoryCard.style.order = Array.from(filteredToolsByCategory.keys()).indexOf(category).toString();
			
			// Category icon and name
			const categoryHeader = categoryCard.createDiv({ cls: 'llmsider-category-header' });
			const categoryIcon = categoryHeader.createDiv({ cls: 'llmsider-category-icon' });
			categoryIcon.innerHTML = getCategoryIcon(category);
			
			const categoryName = categoryHeader.createEl('h3', {
				text: getCategoryDisplayName(category, this.i18n),
				cls: 'llmsider-category-name'
			});
			
			// Tool count
			const toolCount = categoryCard.createEl('div', {
				text: `${tools.length} ${this.i18n.t('settingsPage.toolCount')}`,
				cls: 'llmsider-category-tool-count'
			});
			
			// Category toggle (enable/disable all tools in category)
			const toggleContainer = categoryCard.createDiv({ cls: 'llmsider-category-toggle' });
			const isCategoryEnabled = this.isCategoryEnabled(category, tools);
			
			const toggleSwitch = toggleContainer.createDiv({ cls: `llmsider-toggle-switch ${isCategoryEnabled ? 'active' : ''}` });
			const toggleThumb = toggleSwitch.createDiv({ cls: 'llmsider-toggle-thumb' });
			
			toggleSwitch.addEventListener('click', async (e: MouseEvent) => {
				e.stopPropagation(); // Prevent card click
				const newState = !toggleSwitch.hasClass('active');
				
				await this.toolPermissionHandler.toggleCategoryTools(category, tools, newState);
				
				if (newState) {
					toggleSwitch.addClass('active');
				} else {
					toggleSwitch.removeClass('active');
				}
				
				new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolsInCategoryToggled', {
					category: getCategoryDisplayName(category, this.i18n),
					status: newState ? this.i18n.t('settingsPage.toolManagement.enabled') : this.i18n.t('settingsPage.toolManagement.disabled')
				}));
			});
			
			// Expand arrow indicator
			const expandArrow = categoryCard.createDiv({ cls: 'llmsider-category-expand-arrow' });
			expandArrow.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>`;
			
			// Click to expand/collapse
			categoryCard.addEventListener('click', (e: MouseEvent) => {
				// Don't expand if clicking toggle
				if ((e.target as HTMLElement).closest('.llmsider-category-toggle')) {
					return;
				}
				
				const wasExpanded = categoryCard.hasClass('expanded');
				
				// Collapse any previously expanded card
				if (currentExpandedCard && currentExpandedCard !== categoryCard) {
					currentExpandedCard.removeClass('expanded');
				}
				
				if (wasExpanded) {
					// Collapse this card
					categoryCard.removeClass('expanded');
					toolDetailsRow.style.display = 'none';
					currentExpandedCard = null;
				} else {
					// Expand this card
					categoryCard.addClass('expanded');
					currentExpandedCard = categoryCard;
					
					// Position details row after this card
					const cardOrder = parseInt(categoryCard.style.order);
					toolDetailsRow.style.order = (cardOrder + 0.5).toString();
					toolDetailsRow.style.display = 'block';
					
					// Render tools in details row
					this.renderCategoryDetails(toolDetailsRow, category, tools);
				}
			});
		});
	}

	/**
	 * Render a category group with tools list (collapsible)
	 */
	renderBuiltInToolCategory(container: HTMLDivElement, category: string, tools: any[]): void {
		const categoryGroup = container.createDiv({ cls: 'llmsider-mcp-server-tool-group' });

		// Category header
		const categoryHeader = categoryGroup.createDiv({ cls: 'llmsider-mcp-server-tool-header' });

		const categoryInfo = categoryHeader.createDiv({ cls: 'llmsider-mcp-server-tool-info' });
		categoryInfo.createEl('h4', {
			text: getCategoryDisplayName(category, this.i18n),
			cls: 'llmsider-mcp-server-tool-name'
		});

		const categoryStatus = categoryInfo.createEl('span', {
			cls: 'llmsider-mcp-server-tool-status connected',
			text: `${tools.length} ${this.i18n.t('settingsPage.toolCount')}`
		});

		// Category-level enable/disable toggle
		const categoryToggle = categoryHeader.createDiv({ cls: 'llmsider-mcp-server-tool-toggle' });
		const isCategoryEnabled = this.isCategoryEnabled(category, tools);

		const toggleLabel = categoryToggle.createEl('label', { cls: 'llmsider-mcp-toggle-label-compact' });

		const toggleInput = toggleLabel.createEl('input', {
			type: 'checkbox',
			cls: 'llmsider-mcp-toggle-input-compact'
		});
		toggleInput.checked = isCategoryEnabled;

		const toggleSlider = toggleLabel.createEl('span', { cls: 'llmsider-mcp-toggle-slider-compact' });

		toggleInput.addEventListener('change', async () => {
			await this.toolPermissionHandler.toggleCategoryTools(category, tools, toggleInput.checked);

			// Update tool toggles state
			const toolToggles = categoryGroup.querySelectorAll('.llmsider-mcp-tool-item .llmsider-mcp-toggle-input');
			toolToggles.forEach((toggle: Element) => {
				const toolToggleInput = toggle as HTMLInputElement;
				toolToggleInput.checked = toggleInput.checked;
			});

				new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolsInCategoryToggled', {
					category: getCategoryDisplayName(category, this.i18n),
					status: toggleInput.checked ? this.i18n.t('settingsPage.toolManagement.enabled') : this.i18n.t('settingsPage.toolManagement.disabled')
				}));
		});

		// Tools list for this category (collapsible, collapsed by default)
		const toolsDetails = categoryGroup.createEl('details', { cls: 'llmsider-mcp-server-tools-details' });
		const toolsSummary = toolsDetails.createEl('summary', {
			cls: 'llmsider-mcp-server-tools-summary',
			text: `${tools.length} ${this.i18n.t('settingsPage.toolsAvailable')}`
		});

		const toolsList = toolsDetails.createDiv({ cls: 'llmsider-mcp-tools-list-items' });

		tools.forEach(tool => {
			this.renderBuiltInToolItem(toolsList, tool);
		});
	}

	/**
	 * Render a single built-in tool item card
	 */
	renderBuiltInToolItem(container: HTMLDivElement, tool: any): void {
		const toolId = tool.id || tool.name;
		const isToolEnabled = this.plugin.configDb.isBuiltInToolEnabled(toolId);
		const requireConfirmation = this.plugin.configDb.isBuiltInToolRequireConfirmation(toolId);
		
		// Tool card container with hover effect - full width
		const toolItem = container.createDiv({ cls: 'llmsider-modern-tool-card' });
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
		
		// Add hover effect
		toolItem.addEventListener('mouseenter', () => {
			toolItem.style.borderColor = 'var(--interactive-accent)';
			toolItem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
		});
		toolItem.addEventListener('mouseleave', () => {
			toolItem.style.borderColor = 'var(--background-modifier-border)';
			toolItem.style.boxShadow = 'none';
		});

		// Main content container (flex row)
		const mainContent = toolItem.createDiv({ cls: 'llmsider-modern-tool-main' });
		mainContent.style.cssText = 'display: flex !important; align-items: start !important; justify-content: space-between !important; gap: 16px !important;';

		// Left side: Tool info
		const toolInfo = mainContent.createDiv({ cls: 'llmsider-modern-tool-info' });
		toolInfo.style.cssText = 'flex: 1 !important; min-width: 0 !important;';

		const toolName = toolInfo.createEl('h3', { text: tool.name });
		toolName.style.cssText = 'margin: 0 0 4px 0 !important; font-size: 14px !important; font-weight: 600 !important; color: var(--text-normal) !important;';

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

		// Right side: Controls with button groups
		const controlsContainer = mainContent.createDiv({ cls: 'llmsider-modern-tool-controls' });
		controlsContainer.style.cssText = 'display: flex !important; flex-direction: column !important; gap: 10px !important; flex-shrink: 0 !important;';

		// Use helper method to create button controls
		this.toolButtonControls.create(
			controlsContainer,
			isToolEnabled,
			requireConfirmation,
			async (enabled) => {
				this.plugin.configDb.setBuiltInToolEnabled(toolId, enabled);
				await this.plugin.saveSettings();
				new Notice(this.i18n.t('settingsPage.toolManagement.builtInToolToggled', {
					name: tool.name,
					status: enabled ? this.i18n.t('settingsPage.toolManagement.enabled') : this.i18n.t('settingsPage.toolManagement.disabled')
				}));
			},
			async (requireConfirm) => {
				this.plugin.configDb.setBuiltInToolRequireConfirmation(toolId, requireConfirm);
			}
		);
	}

	/**
	 * Render category details (expanded tool list)
	 */
	renderCategoryDetails(container: HTMLDivElement, category: string, tools: any[]): void {
		// Clear existing content
		container.empty();
		
		// Tools list (no header needed when expanded)
		const toolsList = container.createDiv({ cls: 'llmsider-tools-list' });
		
		// Get localized tools
		const localizedTools = getLocalizedBuiltInTools(this.i18n);
		
		tools.forEach(tool => {
			// Use same modern card design as renderBuiltInToolItem
			const toolId = tool.id || tool.name;
			const isToolEnabled = this.plugin.configDb.isBuiltInToolEnabled(toolId);
			const requireConfirmation = this.plugin.configDb.isBuiltInToolRequireConfirmation(toolId);
			const localizedTool = localizedTools[tool.name] || tool;
			
			// Tool card container with hover effect - full width
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
			const toolInfo = mainContent.createDiv({ cls: 'llmsider-modern-tool-info' });
			toolInfo.style.cssText = 'flex: 1 !important; min-width: 0 !important;';

			const toolName = toolInfo.createEl('h3', { text: localizedTool.name });
			toolName.style.cssText = 'margin: 0 0 4px 0 !important; font-size: 14px !important; font-weight: 600 !important; color: var(--text-normal) !important;';

			if (localizedTool.description) {
				const toolDesc = toolInfo.createEl('p', { text: localizedTool.description });
				toolDesc.style.cssText = 'margin: 0 !important; font-size: 13px !important; line-height: 1.5 !important; color: var(--text-muted) !important;';
			}

			// Remove the info box - will be replaced with tooltip icon

			// Right side: Controls with button groups
			const controlsContainer = mainContent.createDiv({ cls: 'llmsider-modern-tool-controls' });
			controlsContainer.style.cssText = 'display: flex !important; flex-direction: column !important; gap: 10px !important; flex-shrink: 0 !important;';

			// Use helper method to create button controls
			this.toolButtonControls.create(
				controlsContainer,
				isToolEnabled,
				requireConfirmation,
				async (enabled) => {
					this.plugin.configDb.setBuiltInToolEnabled(toolId, enabled);
					await this.plugin.saveSettings();
				},
				async (requireConfirm) => {
					this.plugin.configDb.setBuiltInToolRequireConfirmation(toolId, requireConfirm);
				}
			);
		});
	}

	/**
	 * Show tool details modal
	 */
	showToolDetailsModal(tool: any): void {
		const modal = document.createElement('div');
		modal.addClass('llmsider-modal-overlay');
		
		const modalContent = modal.createDiv({ cls: 'llmsider-modal-content' });
		
		// Get localized tool info
		const localizedTools = getLocalizedBuiltInTools(this.i18n);
		const localizedTool = localizedTools[tool.name] || tool;
		
		// Modal header
		const modalHeader = modalContent.createDiv({ cls: 'llmsider-modal-header' });
		
		const modalTitle = modalHeader.createEl('h2', {
			text: localizedTool.name,
			cls: 'llmsider-modal-title'
		});
		
		const closeBtn = modalHeader.createDiv({ cls: 'llmsider-modal-close' });
		closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="18" y1="6" x2="6" y2="18"></line>
			<line x1="6" y1="6" x2="18" y2="18"></line>
		</svg>`;
		closeBtn.onclick = () => modal.remove();
		
		// Modal body
		const modalBody = modalContent.createDiv({ cls: 'llmsider-modal-body' });
		
		// Description section
		if (localizedTool.description) {
			const descSection = modalBody.createDiv({ cls: 'llmsider-modal-section' });
			descSection.createEl('h3', { text: this.i18n.t('settingsPage.description') });
			descSection.createEl('p', { text: localizedTool.description });
		}
		
		// Input schema section
		if (tool.inputSchema) {
			const schemaSection = modalBody.createDiv({ cls: 'llmsider-modal-section' });
			schemaSection.createEl('h3', { text: this.i18n.t('settingsPage.inputSchema') });
			const schemaContent = schemaSection.createEl('pre', { cls: 'llmsider-modal-code' });
			schemaContent.textContent = JSON.stringify(tool.inputSchema, null, 2);
		}
		
		// Close on overlay click
		modal.onclick = (e) => {
			if (e.target === modal) {
				modal.remove();
			}
		};
		
		// Add to DOM
		document.body.appendChild(modal);
	}

	/**
	 * Render action buttons for built-in tools section
	 */
	renderBuiltInToolsActions(container: HTMLDivElement): void {
		container.style.display = 'flex';
		container.style.gap = '12px';
		container.style.alignItems = 'center';

	// Check if all tools are enabled
	const allBuiltInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];
	const allEnabled = allBuiltInTools.every(tool => 
		this.plugin.settings.builtInToolsPermissions[(tool as any).id || tool.name] !== false
	);		// Toggle all label and switch
		const toggleAllContainer = container.createDiv({ cls: 'llmsider-tools-toggle-all-container' });
		
		const toggleLabel = toggleAllContainer.createEl('span', {
			text: this.i18n.t('ui.allBuiltInTools'),
			cls: 'llmsider-tools-toggle-all-label'
		});
		toggleLabel.style.fontSize = '13px';
		toggleLabel.style.color = 'var(--text-muted)';
		toggleLabel.style.marginRight = '8px';
		
		const toggleSwitch = toggleAllContainer.createDiv({ 
			cls: `llmsider-toggle-switch ${allEnabled ? 'active' : ''}` 
		});
		const toggleThumb = toggleSwitch.createDiv({ cls: 'llmsider-toggle-thumb' });
		
		toggleSwitch.addEventListener('click', async (e: MouseEvent) => {
			e.stopPropagation();
			const newState = !toggleSwitch.hasClass('active');
			
			if (newState) {
				await this.toolPermissionHandler.enableAllBuiltInTools();
			} else {
				await this.toolPermissionHandler.disableAllBuiltInTools();
			}
		});

		// Reset built-in tools to default state
		const resetBtn = container.createEl('button', {
			cls: 'llmsider-provider-action-btn llmsider-icon-btn',
			title: this.i18n.t('settingsPage.toolManagement.resetBuiltInDesc')
		});
		resetBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="23 4 23 10 17 10"></polyline>
			<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
		</svg>`;
		resetBtn.onclick = () => this.toolPermissionHandler.resetBuiltInToolPermissions();
	}

	/**
	 * Check if a category is enabled (at least one tool enabled)
	 */
	isCategoryEnabled(category: string, tools: any[]): boolean {
		// Category is enabled if at least one tool is enabled
		const result = tools.some(tool => this.plugin.configDb.isBuiltInToolEnabled(tool.id || tool.name));
		return result;
	}
}
