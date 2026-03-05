import { App, Modal, Notice, TFile } from 'obsidian';
import { VectorDBManager } from '../vector/vectorDBManager';
import { DocItem } from '../vector/types';
import { ContextManager } from '../core/context-manager';
import { I18nManager } from '../i18n/i18n-manager';

export class SmartSearchModal extends Modal {
	private vectorDBManager: VectorDBManager;
	private contextManager: ContextManager;
	private i18n: I18nManager;
	private onComplete: () => void;

	private searchInput!: HTMLInputElement;
	private resultsContainer!: HTMLElement;
	private selectedFiles: Set<string> = new Set();
	private searchResults: DocItem[] = [];

	constructor(
		app: App,
		vectorDBManager: VectorDBManager,
		contextManager: ContextManager,
		i18n: I18nManager,
		onComplete: () => void
	) {
		super(app);
		this.vectorDBManager = vectorDBManager;
		this.contextManager = contextManager;
		this.i18n = i18n;
		this.onComplete = onComplete;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('llmsider-smart-search-modal');

		// Hide modal title and header if found in parent
		const modalEl = contentEl.parentElement?.parentElement;
		if (modalEl) {
			modalEl.querySelector('.modal-title')?.addClass('llmsider-hidden');
			modalEl.querySelector('.modal-header')?.addClass('llmsider-hidden');
			modalEl.querySelector('.modal-close-button')?.addClass('llmsider-hidden');
		}

		const searchWrapper = contentEl.createDiv({ cls: 'llmsider-search-wrapper' });

		this.searchInput = searchWrapper.createEl('input', {
			type: 'text',
			placeholder: this.i18n.t('ui.searchNotesPlaceholder') || '输入关键词搜索笔记...',
			cls: 'llmsider-search-input'
		});

		const searchIconBtn = searchWrapper.createEl('button', {
			cls: 'llmsider-search-icon-btn'
		});
		searchIconBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>`;

		searchIconBtn.onclick = () => this.performSearch();

		this.searchInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.performSearch();
			}
		});

		this.resultsContainer = contentEl.createDiv({ cls: 'llmsider-search-results' });
		this.resultsContainer.style.display = 'none';

		const buttonContainer = contentEl.createDiv({ cls: 'llmsider-modal-buttons' });
		buttonContainer.style.display = 'none';

		const addBtn = buttonContainer.createEl('button', {
			text: this.i18n.t('ui.addToContext') || '添加到对话',
			cls: 'mod-cta'
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: this.i18n.t('ui.cancel') || '取消'
		});

		addBtn.onclick = async () => {
			await this.addSelectedToContext();
			this.close();
		};

		cancelBtn.onclick = () => {
			this.close();
		};

		(this as any).buttonContainer = buttonContainer;
		this.searchInput.focus();
	}

	private async performSearch() {
		const query = this.searchInput.value.trim();

		if (!query) {
			new Notice(this.i18n.t('ui.pleaseEnterSearchQuery') || '请输入搜索关键词');
			return;
		}

		if (!this.vectorDBManager.isSystemInitialized()) {
			new Notice(this.i18n.t('ui.vectorDBNotInitialized') || '搜索增强功能未初始化，请先在设置中构建向量数据库');
			return;
		}

		try {
			this.resultsContainer.style.display = 'block';
			this.resultsContainer.empty();
			this.resultsContainer.createDiv({ text: this.i18n.t('ui.searching') || '正在搜索...', cls: 'search-loading' });

			const results = await this.vectorDBManager.search(query, 10);
			this.searchResults = results;
			this.displayResults(results);
		} catch (error) {
			console.error('LLMSider: Vector search failed:', error);
			new Notice(this.i18n.t('ui.searchError'));
			this.resultsContainer.empty();
		}
	}

	private displayResults(results: DocItem[]) {
		this.resultsContainer.empty();
		this.selectedFiles.clear();

		if (results.length === 0) {
			this.resultsContainer.createDiv({ text: this.i18n.t('ui.noSearchResults'), cls: 'no-results' });
			if ((this as any).buttonContainer) (this as any).buttonContainer.style.display = 'none';
			return;
		}

		// Result header with Select All (Left) and Count (Right)
		const headerRow = this.resultsContainer.createDiv({ cls: 'llmsider-search-results-header' });

		const selectAllContainer = headerRow.createDiv({ cls: 'llmsider-search-select-all' });
		const selectAllCheckbox = selectAllContainer.createEl('input', { type: 'checkbox' });
		selectAllContainer.createSpan({ text: '全选' });

		headerRow.createDiv({
			cls: 'llmsider-search-count',
			text: this.i18n.t('ui.searchResultCount', { count: results.length })
		});

		const resultCheckboxes: HTMLInputElement[] = [];

		selectAllCheckbox.onchange = () => {
			const isChecked = selectAllCheckbox.checked;
			resultCheckboxes.forEach(cb => {
				cb.checked = isChecked;
				cb.dispatchEvent(new Event('change'));
			});
		};

		results.forEach((item, index) => {
			const resultItem = this.resultsContainer.createDiv({ cls: 'llmsider-search-result-item' });

			const checkbox = resultItem.createEl('input', {
				type: 'checkbox',
				cls: 'llmsider-search-checkbox'
			});
			resultCheckboxes.push(checkbox);

			resultItem.createDiv({
				cls: 'llmsider-search-result-name',
				text: item.filePath.split('/').pop() || item.filePath
			});

			checkbox.onchange = (e) => {
				const filePath = item.filePath;
				if (checkbox.checked) {
					this.selectedFiles.add(filePath);
				} else {
					this.selectedFiles.delete(filePath);
					// If manually unchecking, and Select All was checked, uncheck it
					if (selectAllCheckbox.checked) {
						selectAllCheckbox.checked = false;
					}
				}
				this.updateButtonVisibility();
			};

			resultItem.onclick = (e) => {
				if (e.target !== checkbox) {
					checkbox.checked = !checkbox.checked;
					checkbox.dispatchEvent(new Event('change'));
				}
			};
		});

		this.updateButtonVisibility();
	}

	private updateButtonVisibility() {
		const buttonContainer = (this as any).buttonContainer;
		if (buttonContainer) {
			buttonContainer.style.display = this.selectedFiles.size > 0 ? 'flex' : 'none';
		}
	}

	private async addSelectedToContext() {
		let successCount = 0;
		for (const filePath of this.selectedFiles) {
			try {
				const file = this.app.vault.getAbstractFileByPath(filePath);
				if (file && file instanceof TFile) {
					const result = await this.contextManager.addFileToContext(file, undefined, undefined, 'search');
					if (result.success) {
						successCount++;
					} else {
						new Notice(this.i18n.t('ui.failedToAddNotes', { count: 1 }));
					}
				}
			} catch (error) {
				console.error('LLMSider: Failed to add file to context:', error);
			}
		}

		if (successCount > 0) {
			new Notice(this.i18n.t('ui.addedNotesToContext', { count: successCount }));
		}

		if (this.onComplete) {
			this.onComplete();
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
