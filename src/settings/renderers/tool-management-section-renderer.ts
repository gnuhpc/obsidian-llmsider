import type { I18nManager } from '../../i18n/i18n-manager';
import type { BuiltInToolsRenderer } from './builtin-tools-renderer';

/**
 * Tool Management Section Renderer - handles the Built-in Tools section with search and filters
 */
export class ToolManagementSectionRenderer {
	constructor(
		private i18n: I18nManager,
		private builtInToolsRenderer: BuiltInToolsRenderer
	) {}

	/**
	 * Render the complete tool management section with search and filters
	 */
	render(containerEl: HTMLElement): void {
		// Built-in Tools Section header (outside border)
		const builtInHeader = containerEl.createEl('h2', { text: this.i18n.t('settingsPage.builtInTools') });
		builtInHeader.style.marginTop = '20px';
		builtInHeader.style.marginBottom = '12px';
		builtInHeader.style.fontSize = '16px';
		builtInHeader.style.fontWeight = '600';
		
		// 使用统一的 settings-section-container 样式 - 包含筛选器和按钮
		const toolManagementContainer = containerEl.createDiv({ cls: 'llmsider-settings-section-container' });

		// Top controls row (inside border): search input and action buttons
		const topControlsRow = this.renderTopControls(toolManagementContainer);
		
		// Action buttons container (right side)
		const actionsContainer = topControlsRow.createDiv({ cls: 'llmsider-builtin-tools-actions' });
		actionsContainer.style.display = 'flex';
		actionsContainer.style.gap = '8px';
		actionsContainer.style.alignItems = 'center';
		this.builtInToolsRenderer.renderBuiltInToolsActions(actionsContainer);
		
		// Tools list container
		const toolsListContainer = toolManagementContainer.createDiv({ cls: 'llmsider-builtin-tools-list-container' });

		// Store search input reference for filtering
		let currentFilterText = '';
		
		// Built-in Tools Section (directly in container, no description)
		this.builtInToolsRenderer.renderBuiltInToolsManagement(toolsListContainer, currentFilterText);
		
		// Get search input from topControlsRow
		const searchInput = topControlsRow.querySelector('input') as HTMLInputElement;
		
		// Add search input event listener
		if (searchInput) {
			searchInput.addEventListener('input', (e) => {
				currentFilterText = (e.target as HTMLInputElement).value;
				toolsListContainer.empty();
				this.builtInToolsRenderer.renderBuiltInToolsManagement(toolsListContainer, currentFilterText);
			});
		}
	}

	/**
	 * Render the top controls row with search input
	 */
	private renderTopControls(container: HTMLElement): HTMLElement {
		const topControlsRow = container.createDiv({ cls: 'llmsider-builtin-tools-header-container' });
		topControlsRow.style.display = 'flex';
		topControlsRow.style.alignItems = 'center';
		topControlsRow.style.justifyContent = 'space-between';
		topControlsRow.style.marginBottom = '16px';
		topControlsRow.style.marginTop = '0';
		topControlsRow.style.gap = '12px';
		
		// Search input (left side)
		const searchInput = topControlsRow.createEl('input', {
			type: 'text',
			placeholder: this.i18n.t('ui.searchTools'),
			cls: 'llmsider-builtin-tools-search-input'
		});
		searchInput.style.flex = '1';
		searchInput.style.padding = '8px 12px';
		searchInput.style.borderRadius = '4px';
		searchInput.style.border = '1px solid var(--background-modifier-border)';
		searchInput.style.background = 'var(--background-primary)';
		
		return topControlsRow;
	}
}
