import { App, Modal, Notice, TFile } from 'obsidian';
import { Logger } from './../utils/logger';
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

		// Hide the default close button and title area
		const modalEl = (this as any).modalEl as HTMLElement;
		if (modalEl) {
			const closeButton = modalEl.querySelector('.modal-close-button');
			if (closeButton) {
				(closeButton as HTMLElement).style.display = 'none';
			}
			
			// Hide the modal title and header
			const modalTitle = modalEl.querySelector('.modal-title');
			if (modalTitle) {
				(modalTitle as HTMLElement).style.display = 'none';
			}
			
			const modalHeader = modalEl.querySelector('.modal-header');
			if (modalHeader) {
				(modalHeader as HTMLElement).style.display = 'none';
			}
		}

		// Remove any default styling from contentEl
		contentEl.style.paddingTop = '0';
		contentEl.style.borderTop = 'none';

		// Search input wrapper (similar to quick chat input wrapper)
		const searchWrapper = contentEl.createDiv({ cls: 'llmsider-search-wrapper' });
		
		this.searchInput = searchWrapper.createEl('input', {
			type: 'text',
			placeholder: this.i18n.t('ui.searchNotesPlaceholder') || '输入关键词搜索笔记...',
			cls: 'llmsider-search-input'
		});

		// Search icon button (similar to send button)
		const searchIconBtn = searchWrapper.createEl('button', {
			cls: 'llmsider-search-icon-btn'
		});
		searchIconBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>`;

		searchIconBtn.onclick = () => this.performSearch();
		
		// Allow Enter key to search
		this.searchInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.performSearch();
			}
		});

		// Results container (below the search input)
		this.resultsContainer = contentEl.createDiv({ cls: 'llmsider-search-results' });
		this.resultsContainer.style.display = 'none'; // Initially hidden

		// Button container (hidden initially, shown after search results)
		const buttonContainer = contentEl.createDiv({ cls: 'llmsider-modal-buttons' });
		buttonContainer.style.display = 'none'; // Hidden by default
		
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

		// Store reference to button container for later use
		(this as any).buttonContainer = buttonContainer;

		// Focus on search input
		this.searchInput.focus();
	}

	private async performSearch() {
		const query = this.searchInput.value.trim();
		
		if (!query) {
			new Notice(this.i18n.t('ui.pleaseEnterSearchQuery') || '请输入搜索关键词');
			return;
		}

		// Check if vector DB is initialized
		if (!this.vectorDBManager.isSystemInitialized()) {
			new Notice(this.i18n.t('ui.vectorDBNotInitialized') || '搜索增强功能未初始化，请先在设置中构建向量数据库');
			return;
		}

		try {
			// Show results container and loading state
			this.resultsContainer.style.display = 'block';
			this.resultsContainer.empty();
			this.resultsContainer.createDiv({
				cls: 'llmsider-search-loading',
				text: this.i18n.t('ui.searching') || '搜索中...'
			});

			// Perform search
			this.searchResults = await this.vectorDBManager.search(query, 20);

			// Display results
			this.displayResults();
		} catch (error) {
			Logger.error('Search error:', error);
			new Notice(this.i18n.t('ui.searchError') || '搜索失败，请重试');
			this.resultsContainer.empty();
			this.resultsContainer.style.display = 'none';
		}
	}

	private displayResults() {
		this.resultsContainer.empty();
		this.resultsContainer.style.display = 'block';

		if (this.searchResults.length === 0) {
			this.resultsContainer.createDiv({
				cls: 'llmsider-search-no-results',
				text: this.i18n.t('ui.noSearchResults') || '未找到相关笔记'
			});
			// Hide buttons when no results
			const buttonContainer = (this as any).buttonContainer as HTMLElement;
			if (buttonContainer) {
				buttonContainer.style.display = 'none';
			}
			return;
		}

		// Show buttons when there are results
		const buttonContainer = (this as any).buttonContainer as HTMLElement;
		if (buttonContainer) {
			buttonContainer.style.display = 'flex';
		}

		// Group results by file
		const fileGroups = new Map<string, DocItem[]>();
		this.searchResults.forEach(item => {
			if (!fileGroups.has(item.filePath)) {
				fileGroups.set(item.filePath, []);
			}
			fileGroups.get(item.filePath)!.push(item);
		});

		// Create result items for each file
		fileGroups.forEach((items, filePath) => {
			const resultItem = this.resultsContainer.createDiv({ cls: 'llmsider-search-result-item' });
			
			// Checkbox
			const checkbox = resultItem.createEl('input', {
				type: 'checkbox',
				cls: 'llmsider-search-checkbox'
			});
			
			checkbox.checked = this.selectedFiles.has(filePath);
			checkbox.onchange = () => {
				if (checkbox.checked) {
					this.selectedFiles.add(filePath);
				} else {
					this.selectedFiles.delete(filePath);
				}
			};

			// File info container
			const fileInfo = resultItem.createDiv({ cls: 'llmsider-search-file-info' });
			
			// Open note icon button (positioned on the right)
			const openBtn = resultItem.createEl('button', {
				cls: 'llmsider-search-open-btn',
				attr: {
					'aria-label': this.i18n.t('ui.openNote') || '打开笔记',
					'title': this.i18n.t('ui.openNote') || '打开笔记'
				}
			});
			openBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
				<polyline points="15 3 21 3 21 9"></polyline>
				<line x1="10" y1="14" x2="21" y2="3"></line>
			</svg>`;
			
			openBtn.onclick = async (e) => {
				e.stopPropagation(); // Prevent triggering the item click
				const file = this.app.vault.getAbstractFileByPath(filePath);
				if (file && file instanceof TFile) {
					await this.app.workspace.getLeaf(false).openFile(file);
					this.close(); // Close the modal after opening the note
				} else {
					new Notice(this.i18n.t('ui.fileNotFound') || '文件未找到');
				}
			};
			
			// Best matching chunk for score calculation
			const bestMatch = items.reduce((best, current) => 
				current.score > best.score ? current : best
			);
			const scorePercent = Math.round(bestMatch.score * 100);
			
			// File path with score (header line)
			const headerLine = fileInfo.createDiv({ cls: 'llmsider-search-header-line' });
			headerLine.createSpan({
				cls: 'llmsider-search-file-path',
				text: filePath
			});
			headerLine.createSpan({
				cls: 'llmsider-search-score',
				text: `${this.i18n.t('ui.relevance') || '相关度'}: ${scorePercent}%`
			});

			// Preview
			const preview = bestMatch.content.substring(0, 150);
			fileInfo.createDiv({
				cls: 'llmsider-search-preview',
				text: preview + (bestMatch.content.length > 150 ? '...' : '')
			});

			// Make the whole item clickable to toggle checkbox
			resultItem.onclick = (e) => {
				if (e.target !== checkbox) {
					checkbox.checked = !checkbox.checked;
					checkbox.onchange!(new Event('change'));
				}
			};
		});

		// Show count
		const countText = this.i18n.t('ui.searchResultCount')?.replace('{count}', fileGroups.size.toString()) 
			|| `找到 ${fileGroups.size} 个相关笔记`;
		
		this.resultsContainer.prepend(
			this.resultsContainer.createDiv({
				cls: 'llmsider-search-count',
				text: countText
			})
		);
	}

	private async addSelectedToContext() {
		if (this.selectedFiles.size === 0) {
			new Notice(this.i18n.t('ui.pleaseSelectNotes') || '请选择要添加的笔记');
			return;
		}

		let successCount = 0;
		let failCount = 0;

		for (const filePath of this.selectedFiles) {
			try {
				const file = this.app.vault.getAbstractFileByPath(filePath);
				if (file && file instanceof TFile) {
					const result = await this.contextManager.addFileToContext(file);
					if (result.success) {
						successCount++;
					} else {
						failCount++;
					}
				} else {
					failCount++;
				}
			} catch (error) {
				Logger.error('Error adding file to context:', error);
				failCount++;
			}
		}

		// Show result notice
		if (successCount > 0) {
			const message = this.i18n.t('ui.addedNotesToContext')?.replace('{count}', successCount.toString())
				|| `已添加 ${successCount} 个笔记到对话`;
			new Notice(message);
			
			// Call completion callback to update UI
			this.onComplete();
		}

		if (failCount > 0) {
			const message = this.i18n.t('ui.failedToAddNotes')?.replace('{count}', failCount.toString())
				|| `${failCount} 个笔记添加失败`;
			new Notice(message);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
