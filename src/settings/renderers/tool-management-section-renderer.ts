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
		const builtInHeader = containerEl.createEl('h2', { 
			text: this.i18n.t('settingsPage.builtInTools'),
			cls: 'llmsider-section-header'
		});
		
		// 使用统一的 settings-section-container 样式 - 包含筛选器和按钮
		const toolManagementContainer = containerEl.createDiv({ cls: 'llmsider-settings-section-container' });

		// Top controls row (inside border): search input and action buttons
		const topControlsRow = this.renderTopControls(toolManagementContainer);
		
		// Action buttons container (right side)
		const actionsContainer = topControlsRow.createDiv({ cls: 'llmsider-builtin-tools-actions llmsider-actions-container' });
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
		const topControlsRow = container.createDiv({ cls: 'llmsider-builtin-tools-header-container llmsider-top-controls-row' });
		
		// Search input (left side)
		const searchInput = topControlsRow.createEl('input', {
			type: 'text',
			placeholder: this.i18n.t('ui.searchTools') || 'Filter tools...',
			cls: 'llmsider-builtin-tools-search-input llmsider-search-input'
		});
		
		return topControlsRow;
	}
}
