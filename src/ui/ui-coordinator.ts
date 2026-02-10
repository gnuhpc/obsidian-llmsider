/**
 * UI 协调器
 * 
 * 负责协调和管理各种 UI 元素的显示和更新，包括：
 * - 上下文显示管理
 * - 步骤指示器管理
 * - UI 状态刷新
 * - 模态框显示
 */

import { TFile, Notice, setIcon } from 'obsidian';
import { Logger } from '../utils/logger';
import { ContextManager } from '../core/context-manager';
import { I18nManager } from '../i18n/i18n-manager';
import { ISuggestionsCoordinator, IUICoordinator, UICoordinatorDeps } from './types/chat-view-interfaces';
import LLMSiderPlugin from '../main';

export class UICoordinator implements IUICoordinator {
	private plugin: LLMSiderPlugin;
	private messageContainer: HTMLElement;
	private contextDisplay: HTMLElement;
	private inputElement: HTMLTextAreaElement;
	private sendButton: HTMLElement;
	private stopButton: HTMLElement;
	private contextManager: ContextManager;
	private suggestionsCoordinator: ISuggestionsCoordinator;
	private i18n: I18nManager;

	constructor(deps: UICoordinatorDeps) {
		this.plugin = deps.plugin;
		this.messageContainer = deps.messageContainer;
		this.contextDisplay = deps.contextDisplay;
		this.inputElement = deps.inputElement;
		this.sendButton = deps.sendButton;
		this.stopButton = deps.stopButton;
		this.contextManager = deps.contextManager;
		this.suggestionsCoordinator = deps.suggestionsCoordinator;
		this.i18n = deps.i18n;
	}

	/**
	 * 更新上下文显示区域
	 */
	updateContextDisplay(): void {
		if (!this.contextDisplay) return;

		this.contextDisplay.innerHTML = '';

		if (!this.contextManager.hasContext()) {
			this.contextDisplay.style.display = 'none';
			return;
		}

		this.contextDisplay.style.display = 'block';
		const contextContainer = this.contextDisplay.createDiv({ cls: 'llmsider-context-container' });

		// 显示笔记上下文
		this.renderNoteContexts(contextContainer);

		// 显示选中文本上下文
		this.renderSelectedTextContexts(contextContainer);

		// 显示建议文件（待定状态）
		this.suggestionsCoordinator.renderSuggestedFiles(contextContainer);
	}

	/**
	 * 渲染笔记上下文标签
	 */
	private renderNoteContexts(container: HTMLElement): void {
		const noteContexts = this.contextManager.getCurrentNoteContext();
		noteContexts.forEach((noteContext) => {
			const contextTag = container.createEl('span', { 
				cls: 'llmsider-context-tag llmsider-context-clickable' 
			});

			// 创建图标容器
			const iconContainer = contextTag.createEl('span', { cls: 'llmsider-context-icon' });
			
			// 根据类型确定图标
			let svgIcon = '';
			if (noteContext.type === 'image') {
				svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<circle cx="8.5" cy="8.5" r="1.5"></circle>
					<polyline points="21 15 16 10 5 21"></polyline>
				</svg>`;
			} else if (noteContext.type === 'document') {
				svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
					<polyline points="14 2 14 8 20 8"></polyline>
					<line x1="16" y1="13" x2="8" y2="13"></line>
					<line x1="16" y1="17" x2="8" y2="17"></line>
					<polyline points="10 9 9 9 8 9"></polyline>
				</svg>`;
			} else {
				svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
					<polyline points="14 2 14 8 20 8"></polyline>
				</svg>`;
			}
			
			iconContainer.innerHTML = svgIcon;
			contextTag.createEl('span', { 
				cls: 'llmsider-context-name', 
				text: noteContext.name 
			});

			// 移除按钮
			const removeBtn = contextTag.createEl('button', {
				cls: 'llmsider-context-remove',
				text: '×',
				title: 'Remove note context'
			});

			removeBtn.onclick = (e) => {
				e.stopPropagation();
				this.contextManager.removeNoteContext(noteContext.name);
				this.updateContextDisplay();
			};
		});
	}

	/**
	 * 渲染选中文本上下文标签
	 */
	private renderSelectedTextContexts(container: HTMLElement): void {
		const selectedTextContexts = this.contextManager.getSelectedTextContexts();
		selectedTextContexts.forEach((selectedTextContext, index) => {
			const contextTag = container.createEl('span', { 
				cls: 'llmsider-context-tag llmsider-context-clickable' 
			});

			// 剪刀图标（选中文本）
			const iconContainer = contextTag.createEl('span', { cls: 'llmsider-context-icon' });
			iconContainer.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="6" cy="6" r="3"></circle>
				<circle cx="6" cy="18" r="3"></circle>
				<line x1="20" y1="4" x2="8.12" y2="15.88"></line>
				<line x1="14.47" y1="14.48" x2="20" y2="20"></line>
				<line x1="8.12" y1="8.12" x2="12" y2="12"></line>
			</svg>`;
			
			// 如果有多个选中项，显示索引
			const displayText = selectedTextContexts.length > 1 
				? `${index + 1}. ${selectedTextContext.preview}`
				: selectedTextContext.preview;
			
			contextTag.createEl('span', {
				cls: 'llmsider-context-name',
				text: displayText,
				title: selectedTextContext.text
			});

			// 移除按钮
			const removeBtn = contextTag.createEl('button', {
				cls: 'llmsider-context-remove',
				text: '×',
				title: 'Remove selected text'
			});

			removeBtn.onclick = (e) => {
				e.stopPropagation();
				this.contextManager.removeSelectedTextContext(index);
				this.updateContextDisplay();
			};
		});
	}

	/**
	 * 显示上下文内容模态框
	 */
	showContextModal(title: string, content: string, type?: string): void {
		const modal = document.createElement('div');
		modal.className = 'llmsider-context-modal';
		
		const overlay = document.createElement('div');
		overlay.className = 'llmsider-context-modal-overlay';
		
		const modalContent = document.createElement('div');
		modalContent.className = 'llmsider-context-modal-content';
		
		// 标题栏
		const header = modalContent.createDiv({ cls: 'llmsider-context-modal-header' });
		header.createDiv({ cls: 'llmsider-context-modal-title', text: title });
		
		// 标题栏按钮容器
		const headerButtons = header.createDiv({ cls: 'llmsider-context-modal-header-buttons' });
		
		// 添加复制按钮（仅非图片内容）
		if (type !== 'image') {
			const copyBtn = this.createCopyButton(content);
			headerButtons.appendChild(copyBtn);
		}
		
		// 关闭按钮
		const closeBtn = headerButtons.createEl('button', { 
			cls: 'llmsider-context-modal-close', 
			text: '×' 
		});
		closeBtn.onclick = () => modal.remove();
		
		// 内容主体
		const body = modalContent.createDiv({ cls: 'llmsider-context-modal-body' });
		
		if (type === 'image') {
			body.createEl('p', { 
				text: '图片内容已添加到上下文中', 
				cls: 'llmsider-context-image-notice' 
			});
		} else {
			const pre = body.createEl('pre', { cls: 'llmsider-context-modal-pre' });
			pre.createEl('code', { text: content });
		}
		
		// 页脚统计信息
		const footer = modalContent.createDiv({ cls: 'llmsider-context-modal-footer' });
		const stats = type === 'image' 
			? '图片类型'
			: `${content.length.toLocaleString()} 字符 | ${content.split(/\n/).length.toLocaleString()} 行`;
		footer.createEl('span', { text: stats, cls: 'llmsider-context-modal-stats' });
		
		// 组装模态框
		modal.appendChild(overlay);
		modal.appendChild(modalContent);
		document.body.appendChild(modal);
		
		// 点击覆盖层关闭
		overlay.onclick = () => modal.remove();
		
		// ESC 键关闭
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				modal.remove();
				document.removeEventListener('keydown', handleEscape);
			}
		};
		document.addEventListener('keydown', handleEscape);
	}

	/**
	 * 创建复制按钮
	 */
	private createCopyButton(content: string): HTMLButtonElement {
		const copyBtn = document.createElement('button');
		copyBtn.className = 'llmsider-context-modal-copy';
		copyBtn.title = '复制内容';
		copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
		</svg>`;
		
		copyBtn.onclick = async (e) => {
			e.stopPropagation();
			try {
				await navigator.clipboard.writeText(content);
				
				// 显示成功反馈
				const originalHTML = copyBtn.innerHTML;
				copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>`;
				copyBtn.classList.add('success');
				
				setTimeout(() => {
					copyBtn.innerHTML = originalHTML;
					copyBtn.classList.remove('success');
				}, 2000);
				
				new Notice(this.plugin.i18n.t('ui.contentCopied'));
			} catch (error) {
				Logger.error('Failed to copy content:', error);
				new Notice(this.plugin.i18n.t('ui.copyFailed'));
			}
		};

		return copyBtn;
	}

	/**
	 * 刷新 UI 状态（会话切换后）
	 */
	refreshUIState(): void {
		Logger.debug('UICoordinator.refreshUIState - starting UI refresh');

		// 重置输入框状态
		if (this.inputElement) {
			this.inputElement.disabled = false;
			this.inputElement.placeholder = 'Type your message...';
		}

		// 重置按钮状态
		if (this.sendButton) {
			this.sendButton.style.display = 'block';
		}

		if (this.stopButton) {
			this.stopButton.style.display = 'none';
		}

		// 延迟聚焦到输入框
		setTimeout(() => {
			if (this.inputElement) {
				this.inputElement.focus();
			}
		}, 100);

		Logger.debug('UICoordinator.refreshUIState - UI state refreshed');
	}

	/**
	 * 创建步骤指示器容器
	 */
	createStepIndicators(): HTMLElement {
		const container = this.messageContainer.createDiv({ cls: 'llmsider-step-indicators' });
		
		// 检查是否启用了自动搜索
		const isVectorSearchEnabled = this.plugin.settings.vectorSettings.autoSearchEnabled;
		
		// 步骤 1: 向量搜索（仅在启用时）
		if (isVectorSearchEnabled) {
			const vectorStep = container.createDiv({ cls: 'llmsider-step-indicator pending' });
			vectorStep.dataset.step = 'vector-search';
			
			const vectorIcon = vectorStep.createDiv({ cls: 'llmsider-step-icon' });
			setIcon(vectorIcon, 'sparkles');
			
			vectorStep.createDiv({ 
				cls: 'llmsider-step-text',
				text: this.i18n.t('common.searchingLocalContext')
			});
		}
		
		// 步骤 2: AI 响应
		const aiStep = container.createDiv({ cls: 'llmsider-step-indicator pending' });
		aiStep.dataset.step = 'ai-response';
		
		const aiIcon = aiStep.createDiv({ cls: 'llmsider-step-icon' });
		setIcon(aiIcon, 'bot');
		
		aiStep.createDiv({ 
			cls: 'llmsider-step-text',
			text: this.i18n.t('common.waitingForAIResponse')
		});
		
		return container;
	}

	/**
	 * 更新步骤指示器状态
	 */
	updateStepIndicator(
		container: HTMLElement | null, 
		stepName: string, 
		state: 'pending' | 'active' | 'completed'
	): void {
		if (!container) return;
		
		const stepEl = container.querySelector(`[data-step="${stepName}"]`) as HTMLElement;
		if (!stepEl) return;
		
		// 移除所有状态类
		stepEl.classList.remove('pending', 'active', 'completed');
		
		// 添加新状态类
		stepEl.classList.add(state);
		
		// 为完成状态更新图标
		if (state === 'completed') {
			const iconEl = stepEl.querySelector('.llmsider-step-icon') as HTMLElement;
			if (iconEl) {
				iconEl.empty();
				setIcon(iconEl, 'check-circle');
			}
		}
	}

	/**
	 * 显示向量搜索结果摘要
	 */
	displayVectorSearchResults(container: HTMLElement | null, results: any[]): void {
		if (!container || results.length === 0) return;
		
		// Create results summary card
		const summaryCard = document.createElement('div');
		summaryCard.className = 'llmsider-vector-results-summary';
		
		// Try to insert between vector search indicator and AI response indicator
		const aiResponseIndicator = container.querySelector('[data-step="ai-response"]');
		if (aiResponseIndicator) {
			// Insert before AI response indicator (so it's between vector search and AI response)
			container.insertBefore(summaryCard, aiResponseIndicator);
		} else {
			// Fallback: append to container
			container.appendChild(summaryCard);
		}
		
		const header = summaryCard.createDiv({ cls: 'llmsider-vector-results-header' });
		const headerIcon = header.createDiv({ cls: 'llmsider-vector-results-icon' });
		setIcon(headerIcon, 'check-circle');
		header.createSpan({ 
			cls: 'llmsider-vector-results-title',
			text: this.i18n.t('common.searchingLocalContext')
		});
		
		// Add a small badge for result count
		const countBadge = header.createSpan({ cls: 'llmsider-vector-results-count' });
		countBadge.textContent = `(${results.length})`;
		
		// Make it collapsible
		const toggleIcon = header.createDiv({ cls: 'llmsider-vector-results-toggle' });
		setIcon(toggleIcon, 'chevron-down');
		
		const resultsList = summaryCard.createDiv({ cls: 'llmsider-vector-results-list' });
		resultsList.style.display = 'none'; // Hidden by default
		
		summaryCard.style.cursor = 'pointer';
		summaryCard.onclick = () => {
			const isHidden = resultsList.style.display === 'none';
			resultsList.style.display = isHidden ? 'block' : 'none';
			toggleIcon.empty();
			setIcon(toggleIcon, isHidden ? 'chevron-up' : 'chevron-down');
		};
		
		// 显示前5个结果
		const displayResults = results.slice(0, 5);
		displayResults.forEach((item) => {
			const resultItem = resultsList.createDiv({ cls: 'llmsider-vector-result-item' });
			
			// 从路径提取文件名
			const fileName = item.filePath.split('/').pop() || item.filePath;
			const fileNameWithoutExt = fileName.replace(/\.md$/, '');
			
			// 相似度徽章
			const similarity = Math.round(item.score * 100);
			const badge = resultItem.createDiv({ cls: 'llmsider-vector-result-badge' });
			badge.textContent = `${similarity}%`;
			// 根据相似度设置不同的颜色等级
			if (similarity >= 70) {
				badge.addClass('similarity-high');
			} else if (similarity >= 50) {
				badge.addClass('similarity-medium');
			} else {
				badge.addClass('similarity-low');
			}
			
			// 文件名
			const nameEl = resultItem.createDiv({ cls: 'llmsider-vector-result-name' });
			nameEl.textContent = fileNameWithoutExt;

			// 添加悬停提示显示内容片段
			if (item.content) {
				resultItem.setAttribute('title', item.content);
			}
		});
		
		if (results.length > 5) {
			summaryCard.createDiv({ 
				cls: 'llmsider-vector-results-more',
				text: `...及其他 ${results.length - 5} 个结果`
			});
		}
	}

	/**
	 * 移除步骤指示器
	 */
	removeStepIndicators(container: HTMLElement | null): void {
		if (container) {
			// Move vector results summary out of the container before removing it
			// This ensures the results persist in the chat history
			const summaryCard = container.querySelector('.llmsider-vector-results-summary');
			if (summaryCard && container.parentElement) {
				container.parentElement.insertBefore(summaryCard, container);
			}
			
			if (container.parentElement) {
				container.remove();
			}
		}
	}

	/**
	 * 刷新上下文搜索按钮状态
	 */
	refreshContextSearchButton(): void {
		// 委托给 UIBuilder
		this.plugin.app.workspace.trigger('llmsider:refresh-context-search-button');
	}
}
