import { Notice, Setting } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import { PromptTemplate } from '../../types';
import { PromptManagementModal } from '../modals/prompt-management-modal';

/**
 * PromptManagementRenderer
 * Handles rendering of Prompt Management section including:
 * - Display of built-in prompts (read-only)
 * - CRUD operations for custom prompts
 * - Quick filtering/search functionality
 */
export class PromptManagementRenderer {
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;
	private onDisplayCallback: () => void;
	private filterQuery: string = '';
	private promptContainer: HTMLElement | null = null;

	constructor(plugin: LLMSiderPlugin, i18n: I18nManager, onDisplayCallback: () => void) {
		this.plugin = plugin;
		this.i18n = i18n;
		this.onDisplayCallback = onDisplayCallback;
	}

	/**
	 * Render the entire Prompt Management section
	 */
	async render(containerEl: HTMLElement): Promise<void> {
		// Section header (outside border) - match Built-in Tools style
		const builtInHeader = containerEl.createEl('h2', { 
			text: this.i18n.t('settingsPage.promptManagement.title'),
			cls: 'llmsider-section-header'
		});
		
		// Container for controls and list
		const promptSection = containerEl.createDiv({ cls: 'llmsider-settings-section-container' });

		// Controls row: search + add button
		const controlsRow = promptSection.createDiv({ cls: 'llmsider-prompt-controls' });
		
		// Search/filter input
		const searchContainer = controlsRow.createDiv({ cls: 'llmsider-prompt-search' });
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: this.i18n.t('settingsPage.promptManagement.searchPlaceholder'),
			cls: 'llmsider-prompt-search-input'
		});
		
		searchInput.addEventListener('input', (e) => {
			this.filterQuery = (e.target as HTMLInputElement).value.toLowerCase();
			this.refreshPromptList();
		});

		// Add new prompt button
		const addButton = controlsRow.createEl('button', {
			text: this.i18n.t('settingsPage.promptManagement.addPrompt'),
			cls: 'mod-cta'
		});
		
		addButton.addEventListener('click', () => {
			new PromptManagementModal(
				this.plugin.app,
				this.plugin,
				this.i18n,
				null,
				async () => {
					await this.refreshPromptList();
				}
			).open();
		});

		// Tab navigation
		const tabContainer = promptSection.createDiv({ cls: 'llmsider-prompt-tabs' });
		const builtInTab = tabContainer.createEl('button', {
			text: this.i18n.t('settingsPage.promptManagement.builtInPrompts'),
			cls: 'llmsider-prompt-tab llmsider-prompt-tab-active',
			attr: { 'data-tab': 'builtin' }
		});
		const customTab = tabContainer.createEl('button', {
			text: this.i18n.t('settingsPage.promptManagement.customPrompts'),
			cls: 'llmsider-prompt-tab',
			attr: { 'data-tab': 'custom' }
		});

		// Prompt list container
		this.promptContainer = promptSection.createDiv({ cls: 'llmsider-prompt-list' });
		
		// Tab switching logic with toggle collapse
		builtInTab.addEventListener('click', () => {
			if (builtInTab.hasClass('llmsider-prompt-tab-active')) {
				// Toggle collapse if already active
				if (this.promptContainer!.hasClass('llmsider-collapsed')) {
					this.promptContainer!.removeClass('llmsider-collapsed');
				} else {
					this.promptContainer!.addClass('llmsider-collapsed');
				}
			} else {
				// Switch to built-in tab
				builtInTab.addClass('llmsider-prompt-tab-active');
				customTab.removeClass('llmsider-prompt-tab-active');
				this.promptContainer!.removeClass('llmsider-collapsed');
				this.refreshPromptList();
			}
		});
		
		customTab.addEventListener('click', () => {
			if (customTab.hasClass('llmsider-prompt-tab-active')) {
				// Toggle collapse if already active
				if (this.promptContainer!.hasClass('llmsider-collapsed')) {
					this.promptContainer!.removeClass('llmsider-collapsed');
				} else {
					this.promptContainer!.addClass('llmsider-collapsed');
				}
			} else {
				// Switch to custom tab
				customTab.addClass('llmsider-prompt-tab-active');
				builtInTab.removeClass('llmsider-prompt-tab-active');
				this.promptContainer!.removeClass('llmsider-collapsed');
				this.refreshPromptList();
			}
		});
		
		await this.refreshPromptList();
	}

	/**
	 * Refresh the prompt list display with current filter
	 */
	private async refreshPromptList(): Promise<void> {
		if (!this.promptContainer) return;

		this.promptContainer.empty();

		// Get all prompts from config database
		const allPrompts = await this.plugin.configDb.getAllPrompts();
		
		// Filter prompts based on search query
		const filteredPrompts = this.filterPrompts(allPrompts);

		if (filteredPrompts.length === 0) {
			this.promptContainer.createDiv({
				text: this.i18n.t('settingsPage.promptManagement.noPromptsFound'),
				cls: 'llmsider-prompt-empty'
			});
			return;
		}

		// Separate built-in and custom prompts
		const builtInPrompts = filteredPrompts.filter(p => p.isBuiltIn);
		const customPrompts = filteredPrompts.filter(p => !p.isBuiltIn);

		// Determine which tab is active
		const tabContainer = this.promptContainer.parentElement?.querySelector('.llmsider-prompt-tabs');
		const activeTab = tabContainer?.querySelector('.llmsider-prompt-tab-active') as HTMLElement;
		const isBuiltInActive = activeTab?.dataset?.tab === 'builtin';

		// Render based on active tab
		if (isBuiltInActive) {
			if (builtInPrompts.length > 0) {
				builtInPrompts.forEach(prompt => {
					this.renderPromptCard(this.promptContainer!, prompt, true);
				});
			} else {
				this.promptContainer.createDiv({
					text: this.i18n.t('settingsPage.promptManagement.noPromptsFound'),
					cls: 'llmsider-prompt-empty'
				});
			}
		} else {
			if (customPrompts.length > 0) {
				customPrompts.forEach(prompt => {
					this.renderPromptCard(this.promptContainer!, prompt, false);
				});
			} else {
				this.promptContainer.createDiv({
					text: this.i18n.t('settingsPage.promptManagement.noPromptsFound'),
					cls: 'llmsider-prompt-empty'
				});
			}
		}
	}

	/**
	 * Filter prompts based on search query
	 */
	private filterPrompts(prompts: PromptTemplate[]): PromptTemplate[] {
		if (!this.filterQuery) return prompts;

		return prompts.filter(prompt => {
			// Search in title, description, and content
			const searchText = [
				prompt.title,
				prompt.description || '',
				prompt.content,
				...(prompt.searchKeywords || [])
			].join(' ').toLowerCase();

			return searchText.includes(this.filterQuery);
		});
	}

	/**
	 * Render a single prompt card (two-line layout)
	 */
	private renderPromptCard(container: HTMLElement, prompt: PromptTemplate, isBuiltIn: boolean): void {
		const card = container.createDiv({ cls: 'llmsider-prompt-card' });

		// First row: Title + Description + Actions
		const firstRow = card.createDiv({ cls: 'llmsider-prompt-card-first-row' });
		
		// Left side: Title with badge and description
		const textContent = firstRow.createDiv({ cls: 'llmsider-prompt-card-header' });
		
		// Title with optional badge
		const titleContainer = textContent.createDiv({ cls: 'llmsider-prompt-card-title-line' });
		const titleEl = titleContainer.createEl('span', { 
			text: prompt.title,
			cls: 'llmsider-prompt-card-title'
		});
		
		if (isBuiltIn) {
			titleContainer.createEl('span', { 
				text: this.i18n.t('settingsPage.promptManagement.builtInBadge'),
				cls: 'llmsider-prompt-builtin-badge'
			});
		}

		// Description (on same line as title, truncated)
		if (prompt.description) {
			textContent.createEl('span', { 
				text: prompt.description,
				cls: 'llmsider-prompt-card-description'
			});
		}

		// Right side: Action buttons (always show, including for built-in)
		const actions = firstRow.createDiv({ cls: 'llmsider-prompt-card-actions' });
		
		// Duplicate button (available for all prompts)
		const duplicateBtn = actions.createEl('button', {
			cls: 'llmsider-prompt-action-btn',
			attr: { 'aria-label': this.i18n.t('settingsPage.promptManagement.duplicatePrompt') }
		});
		duplicateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
		duplicateBtn.addEventListener('click', async () => {
			await this.duplicatePrompt(prompt);
		});

		// Edit button
		const editBtn = actions.createEl('button', {
			cls: 'llmsider-prompt-action-btn',
			attr: { 'aria-label': this.i18n.t('settingsPage.promptManagement.editPrompt') }
		});
		editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
		editBtn.addEventListener('click', () => {
			new PromptManagementModal(
				this.plugin.app,
				this.plugin,
				this.i18n,
				prompt,
				async () => {
					await this.refreshPromptList();
				}
			).open();
		});

		// Delete button
		const deleteBtn = actions.createEl('button', {
			cls: 'llmsider-prompt-action-btn llmsider-prompt-action-delete',
			attr: { 'aria-label': this.i18n.t('settingsPage.promptManagement.deletePrompt') }
		});
		deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
		deleteBtn.addEventListener('click', async () => {
			await this.deletePrompt(prompt);
		});

		// Second row: Prompt content preview (truncated)
		const secondRow = card.createDiv({ cls: 'llmsider-prompt-card-second-row' });
		secondRow.createEl('div', { 
			text: prompt.content,
			cls: 'llmsider-prompt-card-content-preview'
		});
	}

	/**
	 * Truncate content for preview
	 */
	private truncateContent(content: string, maxLength: number = 150): string {
		if (content.length <= maxLength) return content;
		return content.substring(0, maxLength) + '...';
	}

	/**
	 * Duplicate a prompt
	 */
	private async duplicatePrompt(prompt: PromptTemplate): Promise<void> {
		// Find similar prompts to generate a unique name
		const allPrompts = await this.plugin.configDb.getAllPrompts();
		const baseName = prompt.title.replace(/\s+\d+$/, ''); // Remove existing number suffix
		const similarPrompts = allPrompts.filter(p => p.title.startsWith(baseName));
		const nextNumber = similarPrompts.length + 1;

		const newPrompt: PromptTemplate = {
			id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
			title: `${baseName} ${nextNumber}`,
			content: prompt.content,
			description: prompt.description,
			isBuiltIn: false,
			order: prompt.order
		};

		await this.plugin.configDb.createPrompt(newPrompt);
		new Notice(this.i18n.t('settingsPage.promptManagement.promptDuplicated', { name: newPrompt.title }));
		
		// If duplicating a built-in prompt, switch to custom tab
		if (prompt.isBuiltIn) {
			const tabContainer = this.promptContainer?.parentElement?.querySelector('.llmsider-prompt-tabs');
			const customTab = tabContainer?.querySelector('.llmsider-prompt-tab:last-child') as HTMLElement;
			const builtInTab = tabContainer?.querySelector('.llmsider-prompt-tab:first-child') as HTMLElement;
			
			if (customTab && builtInTab) {
				customTab.addClass('llmsider-prompt-tab-active');
				builtInTab.removeClass('llmsider-prompt-tab-active');
				this.promptContainer?.removeClass('llmsider-collapsed');
			}
		}
		
		await this.refreshPromptList();
	}

	/**
	 * Delete a prompt
	 */
	private async deletePrompt(prompt: PromptTemplate): Promise<void> {

		// Confirm deletion
		const confirmed = await this.showConfirmDialog(
			this.i18n.t('settingsPage.promptManagement.confirmDelete', { name: prompt.title })
		);

		if (!confirmed) return;

		await this.plugin.configDb.deletePrompt(prompt.id);
		new Notice(this.i18n.t('settingsPage.promptManagement.promptDeleted', { name: prompt.title }));
		await this.refreshPromptList();
	}

	/**
	 * Show confirmation dialog
	 */
	private async showConfirmDialog(message: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = document.createElement('div');
			modal.classList.add('modal-container');
			modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
			
			const dialog = modal.createDiv({ cls: 'modal llmsider-confirm-dialog' });
			dialog.style.cssText = 'padding: 20px; background: var(--background-primary); border-radius: 8px; max-width: 400px;';
			
			dialog.createEl('p', { text: message });
			
			const buttons = dialog.createDiv({ cls: 'modal-button-container' });
			buttons.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;';
			
			const cancelBtn = buttons.createEl('button', { text: this.i18n.t('settingsPage.promptManagement.cancel') });
			cancelBtn.addEventListener('click', () => {
				document.body.removeChild(modal);
				resolve(false);
			});
			
			const confirmBtn = buttons.createEl('button', { 
				text: this.i18n.t('settingsPage.promptManagement.confirm'),
				cls: 'mod-warning'
			});
			confirmBtn.addEventListener('click', () => {
				document.body.removeChild(modal);
				resolve(true);
			});
			
			document.body.appendChild(modal);
		});
	}
}
