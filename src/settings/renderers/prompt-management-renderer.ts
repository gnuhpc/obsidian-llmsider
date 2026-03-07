import { App, Modal, Notice } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import { PromptTemplate } from '../../types';
import { PromptManagementModal } from '../modals/prompt-management-modal';

type PromptTabName = 'builtin' | 'custom' | 'speed-reading';

interface PromptCollections {
	builtInPrompts: PromptTemplate[];
	customPrompts: PromptTemplate[];
	speedReadingPrompts: PromptTemplate[];
	total: number;
}

const PROMPT_TAB_ORDER: PromptTabName[] = ['builtin', 'custom', 'speed-reading'];

/**
 * PromptManagementRenderer
 * Renders the settings prompt management studio.
 */
export class PromptManagementRenderer {
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;
	private onDisplayCallback: () => void;
	private filterQuery = '';
	private activeTab: PromptTabName = 'builtin';
	private promptContainer: HTMLElement | null = null;
	private addButtonLabel: HTMLSpanElement | null = null;
	private resultMetaEl: HTMLElement | null = null;
	private tabButtons: Partial<Record<PromptTabName, HTMLButtonElement>> = {};
	private tabCountEls: Partial<Record<PromptTabName, HTMLElement>> = {};
	private overviewCountEls: Partial<Record<PromptTabName | 'total', HTMLElement>> = {};

	constructor(plugin: LLMSiderPlugin, i18n: I18nManager, onDisplayCallback: () => void) {
		this.plugin = plugin;
		this.i18n = i18n;
		this.onDisplayCallback = onDisplayCallback;
	}

	async render(containerEl: HTMLElement): Promise<void> {
		containerEl.createEl('h2', {
			text: this.i18n.t('settingsPage.promptManagement.title'),
			cls: 'llmsider-section-header'
		});

		const promptSection = containerEl.createDiv({
			cls: 'llmsider-settings-section-container llmsider-settings-list-section llmsider-prompt-management-section'
		});

		this.renderToolbar(promptSection);
		this.promptContainer = promptSection.createDiv({ cls: 'llmsider-prompt-list' });

		this.updateActiveTabUI();
		this.updateCreateButtonLabel();
		await this.refreshPromptList();
	}

	private renderOverview(container: HTMLElement): void {
		const overview = container.createDiv({ cls: 'llmsider-prompt-overview' });
		const copy = overview.createDiv({ cls: 'llmsider-prompt-overview-copy' });

		copy.createEl('p', {
			text: this.i18n.t('settingsPage.promptManagement.description'),
			cls: 'llmsider-prompt-overview-description'
		});

		const statsGrid = overview.createDiv({ cls: 'llmsider-prompt-overview-stats' });
		this.createOverviewStat(statsGrid, 'total', this.i18n.t('settingsPage.promptManagement.totalPrompts'));
		this.createOverviewStat(statsGrid, 'builtin', this.i18n.t('settingsPage.promptManagement.builtInPrompts'));
		this.createOverviewStat(statsGrid, 'custom', this.i18n.t('settingsPage.promptManagement.customPrompts'));
		this.createOverviewStat(statsGrid, 'speed-reading', this.i18n.t('settingsPage.promptManagement.speedReadingPrompts'));
	}

	private createOverviewStat(
		container: HTMLElement,
		key: PromptTabName | 'total',
		label: string
	): void {
		const card = container.createDiv({ cls: 'llmsider-prompt-overview-stat' });
		const valueEl = card.createEl('strong', {
			text: '0',
			cls: 'llmsider-prompt-overview-stat-value'
		});

		card.createEl('span', {
			text: label,
			cls: 'llmsider-prompt-overview-stat-label'
		});

		this.overviewCountEls[key] = valueEl;
	}

	private renderToolbar(container: HTMLElement): void {
		const toolbar = container.createDiv({
			cls: 'llmsider-prompt-toolbar llmsider-settings-list-toolbar'
		});

		const tabControl = toolbar.createDiv({ cls: 'llmsider-prompt-segmented-control' });
		PROMPT_TAB_ORDER.forEach((tab) => {
			const button = tabControl.createEl('button', {
				cls: 'llmsider-prompt-tab',
				attr: {
					type: 'button',
					'data-tab': tab
				}
			});

			button.createEl('span', {
				text: this.getTabLabel(tab),
				cls: 'llmsider-prompt-tab-label'
			});

			const count = button.createEl('span', {
				text: '0',
				cls: 'llmsider-prompt-tab-count'
			});

			button.addEventListener('click', () => {
				this.setActiveTab(tab);
			});

			this.tabButtons[tab] = button;
			this.tabCountEls[tab] = count;
		});

		const actions = toolbar.createDiv({ cls: 'llmsider-prompt-toolbar-actions' });
		const searchShell = actions.createDiv({ cls: 'llmsider-prompt-search-shell' });
		const searchIcon = searchShell.createDiv({ cls: 'llmsider-settings-search-icon' });
		searchIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="11" cy="11" r="7"></circle>
			<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
		</svg>`;

		const searchInput = searchShell.createEl('input', {
			type: 'text',
			placeholder: this.i18n.t('settingsPage.promptManagement.searchPlaceholder'),
			cls: 'llmsider-prompt-search-input'
		});

		searchInput.addEventListener('input', (event) => {
			this.filterQuery = (event.target as HTMLInputElement).value.trim().toLowerCase();
			void this.refreshPromptList();
		});

		const addButton = actions.createEl('button', {
			cls: 'mod-cta llmsider-prompt-create-btn',
			attr: {
				type: 'button',
				title: this.i18n.t('settingsPage.promptManagement.addChatPrompt')
			}
		});
		addButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<line x1="12" y1="5" x2="12" y2="19"></line>
			<line x1="5" y1="12" x2="19" y2="12"></line>
		</svg>`;

		addButton.addEventListener('click', () => {
			this.openPromptEditor(null, this.getDraftPromptType());
		});

		// this.resultMetaEl = container.createDiv({ cls: 'llmsider-prompt-result-meta' });
	}

	private setActiveTab(tab: PromptTabName): void {
		if (this.activeTab === tab) {
			return;
		}

		this.activeTab = tab;
		this.updateActiveTabUI();
		void this.refreshPromptList();
	}

	private updateActiveTabUI(): void {
		PROMPT_TAB_ORDER.forEach((tab) => {
			this.tabButtons[tab]?.toggleClass('llmsider-prompt-tab-active', tab === this.activeTab);
		});
	}

	private updateCreateButtonLabel(): void {
		// No longer needed as button is icon-only
	}

	private async refreshPromptList(): Promise<void> {
		if (!this.promptContainer) {
			return;
		}

		const allPrompts = await this.plugin.configDb.getAllPrompts();
		const collections = this.getPromptCollections(allPrompts);
		const activePrompts = this.getPromptsForActiveTab(collections);
		const visiblePrompts = this.filterPrompts(activePrompts);

		this.updateOverview(collections);
		this.updateTabCounts(collections);
		// this.updateResultMeta(visiblePrompts.length, activePrompts.length);

		this.promptContainer.empty();

		if (visiblePrompts.length === 0) {
			this.renderEmptyState(this.promptContainer, activePrompts.length > 0);
			return;
		}

		const grid = this.promptContainer.createDiv({ cls: 'llmsider-prompt-grid' });
		visiblePrompts.forEach((prompt) => {
			this.renderPromptCard(grid, prompt);
		});
	}

	private renderEmptyState(container: HTMLElement, hasTabPrompts: boolean): void {
		const emptyState = container.createDiv({ cls: 'llmsider-prompt-empty' });
		const icon = emptyState.createDiv({ cls: 'llmsider-prompt-empty-icon' });
		icon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
			<path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
			<path d="M9 13h6"></path>
			<path d="M9 17h6"></path>
		</svg>`;

		emptyState.createEl('p', {
			text: this.i18n.t('settingsPage.promptManagement.noPromptsFound'),
			cls: 'llmsider-prompt-empty-text'
		});

		if (!this.filterQuery && !hasTabPrompts && this.activeTab !== 'builtin') {
			const createButton = emptyState.createEl('button', {
				text: this.activeTab === 'speed-reading'
					? this.i18n.t('settingsPage.promptManagement.addSpeedReadingPrompt')
					: this.i18n.t('settingsPage.promptManagement.addChatPrompt'),
				cls: 'llmsider-prompt-empty-action mod-cta',
				attr: { type: 'button' }
			});

			createButton.addEventListener('click', () => {
				this.openPromptEditor(null, this.getDraftPromptType());
			});
		}
	}

	private renderPromptCard(container: HTMLElement, prompt: PromptTemplate): void {
		const promptType = prompt.type === 'speed-reading' ? 'speed-reading' : 'chat';
		const hasPlaceholder = prompt.content.includes('{}');
		const previewText = this.getContentPreview(prompt.content);
		const lineCount = prompt.content.split(/\r?\n/).length;
		const description = prompt.description?.trim() || this.getContentPreview(prompt.content, 96);

		const card = container.createDiv({
			cls: `llmsider-prompt-card ${prompt.isBuiltIn ? 'is-built-in' : 'is-custom'} ${promptType === 'speed-reading' ? 'is-speed-reading' : 'is-chat'}`
		});

		card.addEventListener('click', (e) => {
			if ((e.target as HTMLElement).closest('.llmsider-prompt-action-btn')) return;
			card.toggleClass('is-expanded', !card.hasClass('is-expanded'));
		});

		const cardHeader = card.createDiv({ cls: 'llmsider-prompt-card-header' });
		const identity = cardHeader.createDiv({ cls: 'llmsider-prompt-card-identity' });
		const icon = identity.createDiv({ cls: 'llmsider-prompt-card-icon' });
		icon.setText(promptType === 'speed-reading' ? 'SR' : '{}');

		const copy = identity.createDiv({ cls: 'llmsider-prompt-card-copy' });
		copy.createEl('h3', {
			text: prompt.title,
			cls: 'llmsider-prompt-card-title'
		});

		/* Remove tag row as requested
		const badgeRow = copy.createDiv({ cls: 'llmsider-prompt-card-badge-row' });
		this.createCardBadge(
			badgeRow,
			prompt.isBuiltIn
				? this.i18n.t('settingsPage.promptManagement.builtInBadge')
				: this.i18n.t('settingsPage.promptManagement.customBadge'),
			prompt.isBuiltIn ? 'is-built-in' : 'is-custom'
		);
		this.createCardBadge(
			badgeRow,
			promptType === 'speed-reading'
				? this.i18n.t('settingsPage.promptManagement.speedReadingPromptType')
				: this.i18n.t('settingsPage.promptManagement.chatPromptType'),
			promptType === 'speed-reading' ? 'is-speed-reading' : 'is-chat'
		);
		*/

		copy.createEl('p', {
			text: description,
			cls: 'llmsider-prompt-card-description'
		});

		const actions = cardHeader.createDiv({ cls: 'llmsider-prompt-card-actions' });
		this.createActionButton(
			actions,
			this.i18n.t('settingsPage.promptManagement.duplicatePrompt'),
			`<rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path>`,
			async () => {
				await this.duplicatePrompt(prompt);
			}
		);
		this.createActionButton(
			actions,
			this.i18n.t('settingsPage.promptManagement.editPrompt'),
			`<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>`,
			() => {
				this.openPromptEditor(prompt, promptType);
			}
		);
		this.createActionButton(
			actions,
			this.i18n.t('settingsPage.promptManagement.deletePrompt'),
			`<polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>`,
			async () => {
				await this.deletePrompt(prompt);
			},
			'llmsider-prompt-action-delete'
		);

		const preview = card.createDiv({ cls: 'llmsider-prompt-card-preview' });
		preview.createEl('p', {
			text: previewText,
			cls: 'llmsider-prompt-card-preview-text'
		});

		const footer = card.createDiv({ cls: 'llmsider-prompt-card-footer' });
		this.createMetricChip(
			footer,
			hasPlaceholder
				? this.i18n.t('settingsPage.promptManagement.placeholderReady')
				: this.i18n.t('settingsPage.promptManagement.placeholderMissing'),
			hasPlaceholder ? 'is-accent' : 'is-muted'
		);
		this.createMetricChip(
			footer,
			`${prompt.content.length} ${this.i18n.t('settingsPage.promptManagement.characters')}`
		);
		this.createMetricChip(
			footer,
			`${lineCount} ${this.i18n.t('settingsPage.promptManagement.lines')}`
		);
	}

	private createCardBadge(container: HTMLElement, label: string, tone: string): void {
		container.createEl('span', {
			text: label,
			cls: `llmsider-prompt-card-badge ${tone}`
		});
	}

	private createMetricChip(container: HTMLElement, text: string, tone?: string): void {
		container.createEl('span', {
			text,
			cls: `llmsider-prompt-card-metric${tone ? ` ${tone}` : ''}`
		});
	}

	private createActionButton(
		container: HTMLElement,
		label: string,
		iconMarkup: string,
		handler: () => void | Promise<void>,
		extraClass = ''
	): void {
		const button = container.createEl('button', {
			cls: `llmsider-prompt-action-btn ${extraClass}`.trim(),
			attr: {
				type: 'button',
				'aria-label': label,
				title: label
			}
		});

		button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${iconMarkup}</svg>`;
		button.addEventListener('click', () => {
			void handler();
		});
	}

	private openPromptEditor(
		prompt: PromptTemplate | null,
		promptType: 'chat' | 'speed-reading'
	): void {
		new PromptManagementModal(
			this.plugin.app,
			this.plugin,
			this.i18n,
			prompt,
			promptType,
			async () => {
				await this.refreshPromptList();
			}
		).open();
	}

	private getDraftPromptType(): 'chat' | 'speed-reading' {
		return this.activeTab === 'speed-reading' ? 'speed-reading' : 'chat';
	}

	private filterPrompts(prompts: PromptTemplate[]): PromptTemplate[] {
		if (!this.filterQuery) {
			return prompts;
		}

		return prompts.filter((prompt) => {
			const searchText = [
				prompt.title,
				prompt.description || '',
				prompt.content,
				...(prompt.searchKeywords || [])
			].join(' ').toLowerCase();

			return searchText.includes(this.filterQuery);
		});
	}

	private getPromptCollections(prompts: PromptTemplate[]): PromptCollections {
		const sortedPrompts = [...prompts].sort((a, b) => {
			const orderDelta = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
			if (orderDelta !== 0) {
				return orderDelta;
			}

			return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
		});

		const builtInPrompts = sortedPrompts.filter(
			(prompt) => prompt.isBuiltIn && prompt.type !== 'speed-reading'
		);
		const customPrompts = sortedPrompts.filter(
			(prompt) => !prompt.isBuiltIn && prompt.type !== 'speed-reading'
		);
		const speedReadingPrompts = sortedPrompts.filter(
			(prompt) => prompt.type === 'speed-reading'
		);

		return {
			builtInPrompts,
			customPrompts,
			speedReadingPrompts,
			total: sortedPrompts.length
		};
	}

	private getPromptsForActiveTab(collections: PromptCollections): PromptTemplate[] {
		if (this.activeTab === 'custom') {
			return collections.customPrompts;
		}

		if (this.activeTab === 'speed-reading') {
			return collections.speedReadingPrompts;
		}

		return collections.builtInPrompts;
	}

	private updateOverview(collections: PromptCollections): void {
		this.overviewCountEls.total?.setText(String(collections.total));
		this.overviewCountEls.builtin?.setText(String(collections.builtInPrompts.length));
		this.overviewCountEls.custom?.setText(String(collections.customPrompts.length));
		this.overviewCountEls['speed-reading']?.setText(String(collections.speedReadingPrompts.length));
	}

	private updateTabCounts(collections: PromptCollections): void {
		this.tabCountEls.builtin?.setText(String(collections.builtInPrompts.length));
		this.tabCountEls.custom?.setText(String(collections.customPrompts.length));
		this.tabCountEls['speed-reading']?.setText(String(collections.speedReadingPrompts.length));
	}

	private updateResultMeta(visibleCount: number, totalCount: number): void {
		if (!this.resultMetaEl) {
			return;
		}

		const activeLabel = this.getTabLabel(this.activeTab);
		this.resultMetaEl.setText(
			this.filterQuery ? `${activeLabel} · ${visibleCount}/${totalCount}` : `${activeLabel} · ${totalCount}`
		);
	}

	private getTabLabel(tab: PromptTabName): string {
		switch (tab) {
			case 'custom':
				return this.i18n.t('settingsPage.promptManagement.customPrompts');
			case 'speed-reading':
				return this.i18n.t('settingsPage.promptManagement.speedReadingPrompts');
			case 'builtin':
			default:
				return this.i18n.t('settingsPage.promptManagement.builtInPrompts');
		}
	}

	private getContentPreview(content: string, maxLength = 220): string {
		const normalized = content.replace(/\s+/g, ' ').trim();
		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength).trimEnd()}...`;
	}

	private async duplicatePrompt(prompt: PromptTemplate): Promise<void> {
		const allPrompts = await this.plugin.configDb.getAllPrompts();
		const baseName = prompt.title.replace(/\s+\d+$/, '');
		const similarPrompts = allPrompts.filter((item) => item.title.startsWith(baseName));
		const nextNumber = similarPrompts.length + 1;

		const newPrompt: PromptTemplate = {
			id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
			title: `${baseName} ${nextNumber}`,
			content: prompt.content,
			description: prompt.description,
			isBuiltIn: false,
			order: prompt.order,
			type: prompt.type || 'chat'
		};

		await this.plugin.configDb.createPrompt(newPrompt);
		new Notice(this.i18n.t('settingsPage.promptManagement.promptDuplicated', { name: newPrompt.title }));

		this.activeTab = newPrompt.type === 'speed-reading' ? 'speed-reading' : 'custom';
		this.updateActiveTabUI();
		this.updateCreateButtonLabel();
		await this.refreshPromptList();
	}

	private async deletePrompt(prompt: PromptTemplate): Promise<void> {
		const confirmed = await this.showConfirmDialog(
			this.i18n.t('settingsPage.promptManagement.confirmDelete', { name: prompt.title })
		);

		if (!confirmed) {
			return;
		}

		await this.plugin.configDb.deletePrompt(prompt.id);
		new Notice(this.i18n.t('settingsPage.promptManagement.promptDeleted', { name: prompt.title }));
		await this.refreshPromptList();
	}

	private async showConfirmDialog(message: string): Promise<boolean> {
		return new Promise((resolve) => {
			new PromptConfirmModal(this.plugin.app, this.i18n, message, resolve).open();
		});
	}
}

class PromptConfirmModal extends Modal {
	private resolved = false;

	constructor(
		app: App,
		private i18n: I18nManager,
		private message: string,
		private onResolve: (confirmed: boolean) => void
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass('llmsider-prompt-confirm-modal-shell');
		this.contentEl.empty();
		this.contentEl.addClass('llmsider-prompt-confirm-modal');

		const body = this.contentEl.createDiv({ cls: 'llmsider-prompt-confirm-modal-body' });
		const icon = body.createDiv({ cls: 'llmsider-prompt-confirm-modal-icon' });
		icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M12 9v4"></path>
			<path d="M12 17h.01"></path>
			<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
		</svg>`;

		body.createEl('p', {
			text: this.message,
			cls: 'llmsider-prompt-confirm-modal-text'
		});

		const actions = this.contentEl.createDiv({ cls: 'llmsider-prompt-confirm-modal-actions' });
		const cancelButton = actions.createEl('button', {
			text: this.i18n.t('settingsPage.promptManagement.cancel'),
			attr: { type: 'button' }
		});
		cancelButton.addEventListener('click', () => {
			this.resolve(false);
		});

		const confirmButton = actions.createEl('button', {
			text: this.i18n.t('settingsPage.promptManagement.confirm'),
			cls: 'mod-warning',
			attr: { type: 'button' }
		});
		confirmButton.addEventListener('click', () => {
			this.resolve(true);
		});
	}

	onClose(): void {
		this.contentEl.empty();
		this.contentEl.removeClass('llmsider-prompt-confirm-modal');
		this.modalEl.removeClass('llmsider-prompt-confirm-modal-shell');

		if (!this.resolved) {
			this.resolved = true;
			this.onResolve(false);
		}
	}

	private resolve(confirmed: boolean): void {
		if (this.resolved) {
			return;
		}

		this.resolved = true;
		this.onResolve(confirmed);
		this.close();
	}
}
