/**
 * 建议文件协调器 - 示例实现
 * 
 * 这是重构的第一个模块示例，展示如何从 chat-view.ts 中提取独立功能
 * 
 * 原始位置: chat-view.ts (行 4033-4187)
 * 功能: 管理文件建议的显示、确认和忽略
 */

import { TFile, App } from 'obsidian';
import { Logger } from '../../utils/logger';
import { ISuggestionsCoordinator, ISuggestedFile, SuggestionConfig } from '../types/chat-view-interfaces';
import LLMSiderPlugin from '../../main';
import { ContextManager } from '../../core/context-manager';
import { SuggestedFilesManager, SuggestedFile } from '../suggested-files-manager';

export class SuggestionsCoordinator implements ISuggestionsCoordinator {
	private activeSuggestions: Map<string, SuggestionConfig> = new Map();

	constructor(
		private app: App,
		private plugin: LLMSiderPlugin,
		private contextManager: ContextManager,
		private suggestedFilesManager: SuggestedFilesManager
	) {}

	/**
	 * 渲染建议文件到容器中
	 * 
	 * 原始方法: renderSuggestedFiles() in chat-view.ts
	 */
	public renderSuggestedFiles(container: HTMLElement): void {
		// 清除容器中现有的建议元素
		this.activeSuggestions.forEach((suggestion, key) => {
			if (suggestion.element.parentElement === container) {
				suggestion.element.remove();
			}
		});

		// 渲染当前激活的建议
		this.activeSuggestions.forEach((suggestion, filePath) => {
			const suggestionEl = container.createDiv({ cls: 'llmsider-context-suggestion' });
			
			// 文件名
			const nameEl = suggestionEl.createDiv({ cls: 'llmsider-context-suggestion-name' });
			nameEl.textContent = filePath.split('/').pop() || filePath;
			
			// 操作按钮容器
			const actionsEl = suggestionEl.createDiv({ cls: 'llmsider-context-suggestion-actions' });
			
			// 确认按钮
			const confirmBtn = actionsEl.createEl('button', {
				cls: 'llmsider-context-suggestion-confirm',
				text: '✓'
			});
			confirmBtn.onclick = () => this.confirmSuggestion(filePath);
			
			// 忽略按钮
			const dismissBtn = actionsEl.createEl('button', {
				cls: 'llmsider-context-suggestion-dismiss',
				text: '✕'
			});
			dismissBtn.onclick = () => this.dismissSuggestion(filePath);
			
			// 更新元素引用
			suggestion.element = suggestionEl;
		});
	}

	/**
	 * 显示文件的相关建议
	 * 
	 * 原始方法: showSuggestionsForFile() in chat-view.ts
	 */
	public async showSuggestionsForFile(file: TFile): Promise<void> {
		if (!this.suggestedFilesManager.isEnabled()) {
			Logger.debug('Suggested files feature is disabled');
			return;
		}

		try {
			const suggestions = await this.suggestedFilesManager.findRelatedFiles(file);
			
			if (suggestions.length === 0) {
				Logger.debug('No suggestions found for file:', file.path);
				return;
			}

			Logger.debug(`Found ${suggestions.length} suggestions for ${file.path}`);
			
			// 添加每个建议
			suggestions.forEach(suggestion => {
				this.addSuggestion(suggestion);
			});
		} catch (error) {
			Logger.error('Error getting file suggestions:', error);
		}
	}

	/**
	 * 添加单个建议并设置自动忽略定时器
	 * 
	 * 原始方法: addSuggestion() in chat-view.ts (private)
	 */
	private addSuggestion(suggestion: SuggestedFile): void {
		const filePath = suggestion.file.path;

		// 不建议已在上下文中的文件
		const existingContexts = this.contextManager.getCurrentNoteContext();
		if (existingContexts.some(ctx => ctx.filePath === filePath)) {
			Logger.debug('File already in context, skipping suggestion:', filePath);
			return;
		}

		// 不重复添加已有的建议
		if (this.activeSuggestions.has(filePath)) {
			Logger.debug('Suggestion already exists, skipping:', filePath);
			return;
		}

		// 创建自动忽略定时器
		const timeout = window.setTimeout(() => {
			this.dismissSuggestion(filePath);
		}, this.suggestedFilesManager.getSuggestionTimeout());

		// 存储建议配置
		this.activeSuggestions.set(filePath, {
			timeout,
			element: document.createElement('span') // 占位元素，将在renderSuggestedFiles中替换
		});

		Logger.debug('Added suggestion:', filePath);
	}

	/**
	 * 确认建议，将文件添加到上下文
	 * 
	 * 原始方法: confirmSuggestion() in chat-view.ts (private)
	 */
	public async confirmSuggestion(filePath: string): Promise<void> {
		const suggestion = this.activeSuggestions.get(filePath);
		if (!suggestion) {
			Logger.warn('Suggestion not found:', filePath);
			return;
		}

		// 清除定时器
		clearTimeout(suggestion.timeout);

		// 从建议列表中移除
		this.activeSuggestions.delete(filePath);

		// 查找文件
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			// 添加到上下文
			await this.contextManager.addFileToContext(file);
			Logger.debug('Confirmed suggestion and added to context:', filePath);
		} else {
			Logger.error('File not found or not a TFile:', filePath);
		}

		// 触发上下文显示更新 (通过事件)
		window.dispatchEvent(new CustomEvent('llmsider-context-updated'));
	}

	/**
	 * 忽略建议，不添加到上下文
	 * 
	 * 原始方法: dismissSuggestion() in chat-view.ts (private)
	 */
	public dismissSuggestion(filePath: string): void {
		const suggestion = this.activeSuggestions.get(filePath);
		if (!suggestion) {
			Logger.warn('Suggestion not found:', filePath);
			return;
		}

		// 清除定时器
		clearTimeout(suggestion.timeout);

		// 从建议列表中移除
		this.activeSuggestions.delete(filePath);

		Logger.debug('Dismissed suggestion:', filePath);

		// 触发上下文显示更新 (通过事件)
		window.dispatchEvent(new CustomEvent('llmsider-context-updated'));
	}

	/**
	 * 清除所有激活的建议
	 * 
	 * 原始方法: clearAllSuggestions() in chat-view.ts (private)
	 */
	public clearAllSuggestions(): void {
		// 清除所有定时器并移除元素
		this.activeSuggestions.forEach((suggestion) => {
			clearTimeout(suggestion.timeout);
			if (suggestion.element.parentElement) {
				suggestion.element.remove();
			}
		});

		// 清空映射
		this.activeSuggestions.clear();

		Logger.debug('Cleared all suggestions');
	}

	/**
	 * 获取当前激活的建议数量
	 */
	public getActiveSuggestionsCount(): number {
		return this.activeSuggestions.size;
	}

	/**
	 * 销毁方法，清理资源
	 */
	public destroy(): void {
		this.clearAllSuggestions();
	}
}
