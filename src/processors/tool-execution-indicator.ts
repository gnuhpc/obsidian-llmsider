import { Component, MarkdownRenderer, setIcon } from 'obsidian';
import { Logger } from 'src/utils/logger';
import { I18nManager } from '../i18n/i18n-manager';
import LLMSiderPlugin from '../main';

/**
 * UI component that displays the currently executing step below the plan card
 * Shows tool name, parameters, and streaming content in real-time
 */
export class ToolExecutionIndicator {
	private containerEl: HTMLElement;
	private headerEl: HTMLElement;
	private toolNameEl: HTMLElement;
	private parametersEl: HTMLElement;
	private contentEl: HTMLElement;
	private markdownContentEl: HTMLElement;
	private stepIndex: number = -1;
	private currentToolName: string = '';
	private isVisible: boolean = false;
	private i18n: I18nManager;
	
	// Throttling for streaming updates to prevent performance issues
	private lastUpdateTime: number = 0;
	private updateThrottleMs: number = 100; // Update at most every 100ms
	private pendingContent: string | null = null;
	private updateTimeoutId: number | null = null;
	
	// Markdown rendering toggle
	private isMarkdownEnabled: boolean = true; // Default: show markdown
	private toggleButtonEl: HTMLElement | null = null;
	private currentContent: string = ''; // Store current content for re-rendering
	
	// Accumulated streaming content (for streaming delta chunks)
	private accumulatedStreamContent: string = '';
	
	// Track hide animation timeout for cleanup
	private hideTimeoutId: number | null = null;
	
	// Store event handler for cleanup
	private toggleButtonHandler: ((e: MouseEvent) => void) | null = null;
	
	// Component for managing markdown rendering lifecycle
	private markdownComponent: Component;
	
	constructor(private parentEl: HTMLElement, private plugin?: LLMSiderPlugin) {
		// Get i18n manager from plugin, or create a fallback instance
		if (plugin) {
			this.i18n = plugin.getI18nManager()!;
		} else {
			// Create fallback i18n manager
			this.i18n = new I18nManager();
			this.i18n.initialize('en').catch(err => {
				Logger.error('Failed to initialize i18n fallback:', err);
			});
		}
		
		// Initialize markdown component for lifecycle management
		this.markdownComponent = new Component();
		
		this.containerEl = this.createContainer();
		this.headerEl = this.createHeader();
		this.toolNameEl = this.createToolName();
		this.parametersEl = this.createParameters();
		this.contentEl = this.createContent();
		this.markdownContentEl = this.createMarkdownContent();
		
		
		// Assemble the component
		this.headerEl.appendChild(this.toolNameEl);
		this.containerEl.appendChild(this.headerEl);
		this.containerEl.appendChild(this.parametersEl);
		this.containerEl.appendChild(this.contentEl);
		this.contentEl.appendChild(this.markdownContentEl);
		
	}
	
	private createContainer(): HTMLElement {
		const container = this.parentEl.createDiv('tool-execution-indicator');
		container.style.display = 'none'; // Hidden by default
		return container;
	}
	
	private createHeader(): HTMLElement {
		const header = document.createElement('div');
		header.className = 'tool-execution-header';
		
		// Add pulsing icon
		const iconEl = header.createSpan('tool-execution-icon');
		setIcon(iconEl, 'zap'); // Lightning icon for execution
		
		// Add toggle button for markdown rendering
		this.toggleButtonEl = header.createDiv('tool-execution-toggle-btn');
		this.toggleButtonEl.setAttribute('aria-label', 'Toggle Markdown rendering');
		this.toggleButtonEl.title = this.i18n.t('planExecute.toggleMarkdown') || '切换 Markdown 渲染';
		setIcon(this.toggleButtonEl, this.isMarkdownEnabled ? 'eye' : 'eye-off');
		
		// Store the bound handler for later removal
		this.toggleButtonHandler = (e: MouseEvent) => {
			e.stopPropagation();
			this.toggleMarkdownRendering();
		};
		
		this.toggleButtonEl.addEventListener('click', this.toggleButtonHandler);
		
		return header;
	}
	
	private createToolName(): HTMLElement {
		const toolName = document.createElement('div');
		toolName.className = 'tool-execution-name';
		return toolName;
	}
	
	private createParameters(): HTMLElement {
		const params = document.createElement('div');
		params.className = 'tool-execution-parameters';
		return params;
	}
	
	private createContent(): HTMLElement {
		const content = document.createElement('div');
		content.className = 'tool-execution-content';
		return content;
	}
	
	private createMarkdownContent(): HTMLElement {
		const mdContent = document.createElement('div');
		mdContent.className = 'tool-execution-markdown';
		return mdContent;
	}
	
	/**
	 * Show the indicator with initial step information
	 * @param stepIndex The index of the step being executed
	 * @param toolName The name of the tool being executed (raw name for logic)
	 * @param parameters The input parameters for the tool
	 * @param targetEl Optional target element to align the indicator with (for side-by-side layout)
	 * @param displayToolName Optional localized name for display
	 */
	public show(stepIndex: number, toolName: string, parameters: Record<string, unknown>, targetEl?: HTMLElement, displayToolName?: string): void {
		
		// Get computed style
		const computedStyle = window.getComputedStyle(this.containerEl);
		
		// If already showing a different step, clean up first
		if (this.isVisible && this.stepIndex !== stepIndex) {
			// Remove completed class if present
			this.containerEl.removeClass('tool-execution-completed');
		}
		
		this.stepIndex = stepIndex;
		this.currentToolName = toolName;
		this.isVisible = true;
		
		// Reset accumulated streaming content for new step
		this.accumulatedStreamContent = '';
		this.currentContent = '';

		const isSequential = this.parentEl.classList.contains('sequential-mode');
		if (!targetEl && isSequential) {
			const nodes = Array.from(this.parentEl.querySelectorAll('.llmsider-dag-node')) as HTMLElement[];
			const fallbackTarget = nodes[stepIndex];
			if (fallbackTarget) {
				targetEl = fallbackTarget;
			}
		}

		// Handle positioning if targetEl is provided
		if (targetEl) {
			const parentWidth = this.parentEl.getBoundingClientRect().width;
			const shouldStack = isSequential && parentWidth < 900;

			if (shouldStack) {
				this.parentEl.addClass('llmsider-sequential-stacked');
				this.containerEl.style.position = 'relative';
				this.containerEl.style.right = '';
				this.containerEl.style.width = '100%';
				this.containerEl.style.margin = '12px 0 0';
				this.containerEl.style.zIndex = '';
				this.containerEl.style.top = '';
			} else {
				this.parentEl.removeClass('llmsider-sequential-stacked');
				this.containerEl.style.position = 'absolute';
				this.containerEl.style.right = '16px';
				this.containerEl.style.width = '40%';
				this.containerEl.style.margin = '0';
				this.containerEl.style.zIndex = '10';
				
				// Calculate top position relative to parent
				// We assume parentEl is the container that holds both the targetEl (deeply) and this indicator
				// But targetEl is likely inside a wrapper (dag-layers -> dag-layer)
				// So we need offset relative to parentEl
				
				// Get relative offset
				const parentRect = this.parentEl.getBoundingClientRect();
				const targetRect = targetEl.getBoundingClientRect();
				
				const relativeTop = targetRect.top - parentRect.top;
				this.containerEl.style.top = `${relativeTop}px`;
			}
		} else {
			// Reset to default styles if no target
			this.parentEl.removeClass('llmsider-sequential-stacked');
			this.containerEl.style.position = '';
			this.containerEl.style.right = '';
			this.containerEl.style.width = '';
			this.containerEl.style.margin = '';
			this.containerEl.style.zIndex = '';
			this.containerEl.style.top = '';
		}
		
		// Update tool name with i18n
		const nameToShow = displayToolName || toolName;
		this.toolNameEl.textContent = `${this.i18n.t('planExecute.executingStep')}: ${nameToShow}`;
		
		// Update parameters
		this.parametersEl.empty();
		if (parameters && Object.keys(parameters).length > 0) {
			// Check if parameters contain unresolved templates
			const hasTemplates = Object.values(parameters).some(value => 
				typeof value === 'string' && value.includes('{{step')
			);
			
			// Only show parameters if they don't contain templates (will be updated later)
			if (!hasTemplates) {
				const paramsTitle = this.parametersEl.createDiv('params-title');
				paramsTitle.textContent = this.i18n.t('chatView.parameters');
				
				const paramsList = this.parametersEl.createDiv('params-list');
				let paramCount = 0;
				for (const [key, value] of Object.entries(parameters)) {
					const paramItem = paramsList.createDiv('param-item');
					const paramKey = paramItem.createSpan('param-key');
					paramKey.textContent = `${key}: `;
					
					const paramValue = paramItem.createSpan('param-value');
					const valueStr = typeof value === 'string' 
						? value 
						: JSON.stringify(value, null, 2);
					paramValue.textContent = valueStr.length > 100 
						? valueStr.substring(0, 100) + '...' 
						: valueStr;
					paramCount++;
				}
				this.parametersEl.style.display = 'block';
			} else {
				this.parametersEl.style.display = 'none';
			}
		} else {
			this.parametersEl.style.display = 'none';
		}
		
		// Clear previous content and show loading indicator
		this.markdownContentEl.empty();
		this.contentEl.style.display = 'none'; // Hide content initially until we have data
		
		// Add loading indicator based on tool type
		this.showLoadingIndicator(toolName, parameters);
		
		
		// Show container with animation
		this.containerEl.style.display = 'block';
		this.containerEl.addClass('tool-execution-enter');
		
		
		// Remove animation class after animation completes
		setTimeout(() => {
			this.containerEl.removeClass('tool-execution-enter');
		}, 300);
	}
	
	/**
	 * Format template variables for user-friendly display
	 * Converts {{step1.output.results}} to "第 1 步的输出"
	 */
	private formatTemplateForDisplay(template: string): string {
		// Replace step reference templates with friendly names
		return template.replace(/\{\{step(\d+)\.output(?:\.(\w+))?\}\}/g, (match, stepNum, path) => {
			if (path) {
				return this.i18n.t('planExecute.status.stepOutputPath', { step: stepNum, path });
			}
			return this.i18n.t('planExecute.status.stepOutput', { step: stepNum });
		});
	}

	/**
	 * Show loading indicator based on tool type
	 */
	private showLoadingIndicator(toolName: string, parameters: Record<string, any>): void {
		// Clear any existing loading indicator
		const existingLoading = this.containerEl.querySelector('.tool-loading-container');
		if (existingLoading) {
			existingLoading.remove();
		}
		
		const loadingContainer = this.containerEl.createDiv({ cls: 'tool-loading-container' });
		
		// Loading spinner
		loadingContainer.createDiv({ cls: 'tool-loading-spinner' });
		
		// Loading text based on tool type
		const loadingText = loadingContainer.createDiv({ cls: 'tool-loading-text' });
		
		switch(toolName) {
			case 'fetch_web_content':
				const urlsParam = parameters?.urls || parameters?.url || [];
				const urls = Array.isArray(urlsParam) ? urlsParam : [urlsParam];
				// Filter out template variables like {{step1.output}}
				const actualUrls = urls.filter((url: any) => 
					typeof url === 'string' && !url.includes('{{') && url.startsWith('http')
				);
				
				if (actualUrls.length > 0) {
					// Show "正在获取网页内容" with first URL
					loadingText.createEl('div', { 
						text: `${this.i18n.t('planExecute.status.fetchingWebContentGeneric')}: ${actualUrls[0]}`,
						cls: 'loading-main-text'
					});
					// If more than 1 URL, show the count
					if (actualUrls.length > 1) {
						loadingText.createEl('div', { 
							text: this.i18n.t('planExecute.status.andMore', { count: actualUrls.length - 1 }),
							cls: 'loading-url-more'
						});
					}
				} else {
					// Show friendly message instead of raw template variables
					const templateHint = typeof urlsParam === 'string' && urlsParam.includes('{{') 
						? this.formatTemplateForDisplay(urlsParam)
						: '';
					loadingText.createEl('div', { 
						text: this.i18n.t('planExecute.status.fetchingWebContentGeneric'),
						cls: 'loading-main-text'
					});
					if (templateHint) {
						loadingText.createEl('div', { 
							text: this.i18n.t('planExecute.status.waitingForPreviousStep'),
							cls: 'loading-prompt-preview'
						});
					}
				}
				break;
			
			case 'generate_content':
				const taskParam = parameters?.task || parameters?.prompt || parameters?.query || '';
				const task = typeof taskParam === 'string' ? taskParam : '';
				
				loadingText.createEl('div', { 
					text: this.i18n.t('planExecute.status.generatingContent'),
					cls: 'loading-main-text'
				});
				if (task) {
					// Remove template variables for display
					const cleanTask = task.replace(/\{\{[^}]+\}\}/g, this.i18n.t('planExecute.status.dataPlaceholder'));
					const taskPreview = cleanTask.length > 100 ? cleanTask.substring(0, 100) + '...' : cleanTask;
					loadingText.createEl('div', { 
						text: this.i18n.t('planExecute.status.task', { task: taskPreview }),
						cls: 'loading-prompt-preview'
					});
				}
				break;
			
			case 'duckduckgo_text_search':
			case 'duckduckgo_news_search':
			case 'duckduckgo_image_search':
			case 'duckduckgo_video_search':
				const query = parameters?.query || '';
				loadingText.createEl('div', { 
					text: this.i18n.t('planExecute.status.searching'),
					cls: 'loading-main-text'
				});
				if (query) {
					loadingText.createEl('div', { 
						text: this.i18n.t('planExecute.status.searchQuery', { query }),
						cls: 'loading-prompt-preview'
					});
				}
				break;
			
			case 'list_files':
			case 'search_files':
				loadingText.setText(this.i18n.t('planExecute.status.searchingFiles'));
				break;
			
			case 'read_file':
				const filePath = parameters?.file_path || parameters?.path || '';
				if (filePath) {
					loadingText.createEl('div', { text: this.i18n.t('planExecute.status.readingFile'), cls: 'loading-main-text' });
					loadingText.createEl('div', { text: filePath, cls: 'loading-file-path' });
				} else {
					loadingText.setText(this.i18n.t('planExecute.status.readingFile'));
				}
				break;
			
			default:
				// For unknown tools with meaningful parameters, show generic message
				if (parameters && Object.keys(parameters).length > 0) {
					loadingText.setText(this.i18n.t('planExecute.status.executing'));
				} else {
					// Don't show empty loading indicator - remove the container
					loadingContainer.remove();
					return;
				}
		}
	}

	/**
	 * Update parameters with actual values (after template resolution)
	 */
	public updateParameters(toolName: string, parameters: Record<string, any>): void {
		Logger.debug('[ToolExecutionIndicator] Updating parameters with actual values');
		
		// Update parameters section
		this.parametersEl.empty();
		if (parameters && Object.keys(parameters).length > 0) {
			const paramsTitle = this.parametersEl.createDiv('params-title');
			paramsTitle.textContent = this.i18n.t('chatView.parameters');
			
			const paramsList = this.parametersEl.createDiv('params-list');
			for (const [key, value] of Object.entries(parameters)) {
				const paramItem = paramsList.createDiv('param-item');
				const paramKey = paramItem.createSpan('param-key');
				paramKey.textContent = `${key}: `;
				
				const paramValue = paramItem.createSpan('param-value');
				const valueStr = typeof value === 'string' 
					? value 
					: (value !== undefined ? JSON.stringify(value, null, 2) : 'undefined');
				paramValue.textContent = valueStr && valueStr.length > 100 
					? valueStr.substring(0, 100) + '...' 
					: (valueStr || '');
			}
			this.parametersEl.style.display = 'block';
		} else {
			this.parametersEl.style.display = 'none';
		}
		
		// Update loading indicator with actual values
		// Clear both markdownContentEl and any existing loading container
		this.markdownContentEl.empty();
		const existingLoading = this.containerEl.querySelector('.tool-loading-container');
		if (existingLoading) {
			existingLoading.remove();
		}
		this.showLoadingIndicator(toolName, parameters);
	}

	/**
	 * Update streaming content in real-time (throttled to prevent performance issues)
	 */
	public async updateStreamingContent(content: string): Promise<void> {
		if (!this.isVisible || this.stepIndex < 0) {
			Logger.warn('[ToolExecutionIndicator] Cannot update content - indicator not visible');
			return;
		}
		
		// Accumulate the delta content
		this.accumulatedStreamContent += content;
		
		// Store the latest accumulated content
		this.pendingContent = this.accumulatedStreamContent;
		
		const now = Date.now();
		const timeSinceLastUpdate = now - this.lastUpdateTime;
		
		// If we haven't updated recently, update immediately
		if (timeSinceLastUpdate >= this.updateThrottleMs) {
			await this.performContentUpdate(this.accumulatedStreamContent);
			this.pendingContent = null;
		} else {
			// Schedule an update after the throttle period
			if (this.updateTimeoutId !== null) {
				window.clearTimeout(this.updateTimeoutId);
			}
			
			this.updateTimeoutId = window.setTimeout(async () => {
				if (this.pendingContent !== null) {
					await this.performContentUpdate(this.pendingContent);
					this.pendingContent = null;
				}
				this.updateTimeoutId = null;
			}, this.updateThrottleMs - timeSinceLastUpdate);
		}
	}
	
	/**
	 * Actually perform the content update (called by throttled updateStreamingContent)
	 */
	private async performContentUpdate(content: string): Promise<void> {
		Logger.debug('[ToolExecutionIndicator] Performing content update, length:', content.length);
		this.lastUpdateTime = Date.now();
		this.currentContent = content; // Store for re-rendering when toggling mode
		
		// Don't remove loading indicator if we have no content yet
		if (!content) {
			return;
		}

		// Remove loading indicator if present
		const loadingIndicator = this.containerEl.querySelector('.tool-loading-container');
		if (loadingIndicator) {
			loadingIndicator.remove();
		}
		
		// Show content container
		this.contentEl.style.display = 'block';
		
		// Clear previous content
		this.markdownContentEl.empty();
		
		// Special handling for fetch_web_content progress
		if (this.currentToolName === 'fetch_web_content') {
			this.renderWebContentProgress(content);
			return;
		}

		if (this.isMarkdownEnabled) {
			// Render as Markdown
			try {
				await MarkdownRenderer.renderMarkdown(
					content,
					this.markdownContentEl,
					'', // sourcePath
					this.markdownComponent
				);
			} catch (error) {
				Logger.error('[ToolExecutionIndicator] Failed to render markdown:', error);
				// Fallback: show plain text
				this.markdownContentEl.textContent = content;
			}
		} else {
			// Show as plain text (default, better performance)
			// Use div instead of pre to avoid theme-specific pre styling issues that might prevent wrapping
			const textEl = this.markdownContentEl.createDiv('tool-execution-plain-text');
			textEl.textContent = content;
		}
		
		// Scroll to bottom to show latest content
		this.contentEl.scrollTop = this.contentEl.scrollHeight;
	}
	
	/**
	 * Render progress for web content fetching
	 */
	private renderWebContentProgress(content: string): void {
		const lines = content.split('\n').filter(line => line.trim().length > 0);
		const container = this.markdownContentEl.createDiv('web-fetch-progress');
		
		// Parse JSON lines
		const updates: any[] = [];
		for (const line of lines) {
			try {
				if (line.trim().startsWith('{')) {
					const update = JSON.parse(line);
					if (update.type === 'web_fetch_progress') {
						updates.push(update);
					}
				}
			} catch (e) {
				// Ignore non-JSON lines
			}
		}
		
		// Group by URL to show latest status for each
		const urlStatus = new Map<string, any>();
		for (const update of updates) {
			urlStatus.set(update.url, update);
		}
		
		// Render list
		if (urlStatus.size > 0) {
			const list = container.createEl('ul', { cls: 'web-fetch-list' });
			for (const [url, status] of urlStatus.entries()) {
				const item = list.createEl('li', { cls: 'web-fetch-item' });
				
				// Icon based on status
				const iconSpan = item.createSpan('web-fetch-icon');
				if (status.status === 'fetching') {
					setIcon(iconSpan, 'loader');
					iconSpan.addClass('is-loading');
				} else if (status.status === 'success') {
					setIcon(iconSpan, 'check');
					iconSpan.addClass('is-success');
				} else {
					setIcon(iconSpan, 'x');
					iconSpan.addClass('is-error');
				}
				
				// URL text
				item.createSpan({ text: url, cls: 'web-fetch-url' });
				
				// Error message if any
				if (status.error) {
					item.createDiv({ text: status.error, cls: 'web-fetch-error' });
				}
			}
		} else {
			// Fallback if no valid JSON found
			container.textContent = content;
		}
	}

	/**
	 * Toggle between Markdown and plain text rendering
	 */
	private async toggleMarkdownRendering(): Promise<void> {
		this.isMarkdownEnabled = !this.isMarkdownEnabled;
		Logger.debug('[ToolExecutionIndicator] Toggled markdown rendering:', this.isMarkdownEnabled);
		
		// Update button icon
		if (this.toggleButtonEl) {
			this.toggleButtonEl.empty();
			setIcon(this.toggleButtonEl, this.isMarkdownEnabled ? 'eye' : 'eye-off');
			this.toggleButtonEl.title = this.isMarkdownEnabled 
				? (this.i18n.t('planExecute.showPlainText') || '显示纯文本')
				: (this.i18n.t('planExecute.showMarkdown') || '显示 Markdown');
		}
		
		// Re-render current content with new mode
		if (this.currentContent) {
			await this.performContentUpdate(this.currentContent);
		}
	}
	
	/**
	 * Update with final content and mark as completed
	 * Note: Does NOT change header text (keeps "正在执行:"). Caller can show next step or hide.
	 */
	public async complete(finalContent: string): Promise<void> {
		Logger.debug(`[ToolExecutionIndicator] ========== COMPLETE CALLED ==========`);
		Logger.debug(`[ToolExecutionIndicator] Current isVisible: ${this.isVisible}`);
		Logger.debug(`[ToolExecutionIndicator] Step Index: ${this.stepIndex}`);
		Logger.debug(`[ToolExecutionIndicator] Final content length: ${finalContent.length}`);
		
		if (!this.isVisible) {
			Logger.warn(`[ToolExecutionIndicator] ⚠️ Cannot complete - indicator not visible (already hidden or not shown)`);
			return;
		}
		
		// Update final content (this will clear the loading indicator)
		// Reset accumulated content to final content to avoid duplication
		this.accumulatedStreamContent = finalContent;
		this.pendingContent = finalContent;
		await this.performContentUpdate(finalContent);
		Logger.debug(`[ToolExecutionIndicator] ✅ Final content rendered`);
		
		// Add completed styling (green checkmark) but DON'T change header text
		this.containerEl.addClass('tool-execution-completed');
		Logger.debug(`[ToolExecutionIndicator] ✅ Added 'tool-execution-completed' class (keeping "正在执行:" header)`);
		Logger.debug(`[ToolExecutionIndicator] ========== COMPLETE DONE (staying visible) ==========`);
	}

	/**
	 * Hide the indicator
	 */
	public hide(): void {
		Logger.debug('[ToolExecutionIndicator] ========== HIDE CALLED ==========');
		Logger.debug('[ToolExecutionIndicator] Current isVisible:', this.isVisible);
		
		if (!this.isVisible) {
			Logger.debug('[ToolExecutionIndicator] Already hidden, skipping');
			return;
		}
		
		// Clear any pending throttled updates
		if (this.updateTimeoutId !== null) {
			window.clearTimeout(this.updateTimeoutId);
			this.updateTimeoutId = null;
		}
		this.pendingContent = null;
		this.currentContent = '';
		this.accumulatedStreamContent = ''; // Clear accumulated streaming content
		
		// Reset markdown mode for next use
		this.isMarkdownEnabled = false;
		if (this.toggleButtonEl) {
			this.toggleButtonEl.empty();
			setIcon(this.toggleButtonEl, 'eye-off');
			this.toggleButtonEl.title = this.i18n.t('planExecute.showMarkdown') || '显示 Markdown';
		}
		
		this.isVisible = false;
		this.containerEl.addClass('tool-execution-exit');
		Logger.debug('[ToolExecutionIndicator] ✅ Added exit animation class');
		Logger.debug('[ToolExecutionIndicator] Will hide in 300ms...');
		
		// Clear previous hide timeout if exists
		if (this.hideTimeoutId !== null) {
			window.clearTimeout(this.hideTimeoutId);
		}
		
		this.hideTimeoutId = window.setTimeout(() => {
			this.containerEl.style.display = 'none';
			this.containerEl.removeClass('tool-execution-exit', 'tool-execution-completed');
			this.stepIndex = -1;
			this.hideTimeoutId = null;
			Logger.debug('[ToolExecutionIndicator] ✅ Container hidden and cleaned up');
			Logger.debug('[ToolExecutionIndicator] ========== HIDE COMPLETED ==========');
		}, 300);
	}
	
	/**
	 * Show error state
	 */
	public showError(errorMessage: string): void {
		Logger.debug('[ToolExecutionIndicator] ========== SHOW ERROR CALLED ==========');
		Logger.debug('[ToolExecutionIndicator] Current isVisible:', this.isVisible);
		Logger.debug('[ToolExecutionIndicator] Error message:', errorMessage);
		
		if (!this.isVisible) {
			Logger.warn('[ToolExecutionIndicator] ⚠️ Cannot show error - indicator not visible');
			return;
		}
		
		// Update header
		const oldText = this.toolNameEl.textContent;
		this.toolNameEl.textContent = this.toolNameEl.textContent?.replace('正在执行:', '执行失败:') || '';
		Logger.debug(`[ToolExecutionIndicator] ✅ Header updated: "${oldText}" -> "${this.toolNameEl.textContent}"`);
		
		// Show error message
		this.markdownContentEl.empty();
		const errorEl = this.markdownContentEl.createDiv('execution-error');
		errorEl.textContent = errorMessage;
		Logger.debug('[ToolExecutionIndicator] ✅ Error message rendered');
		
		// Add error styling
		this.containerEl.addClass('tool-execution-error');
		Logger.debug('[ToolExecutionIndicator] ✅ Added error styling class');
		Logger.debug('[ToolExecutionIndicator] ========== ERROR DISPLAYED, auto-hiding in 5s ==========');
		
		// Auto-hide after a longer delay
		setTimeout(() => {
			this.hide();
			this.containerEl.removeClass('tool-execution-error');
		}, 5000);
	}
	
	/**
	 * Remove the indicator from DOM
	 */
	public destroy(): void {
		Logger.debug('[ToolExecutionIndicator] Destroying component');
		
		// Clear all pending timeouts to prevent memory leaks
		if (this.updateTimeoutId !== null) {
			window.clearTimeout(this.updateTimeoutId);
			this.updateTimeoutId = null;
		}
		if (this.hideTimeoutId !== null) {
			window.clearTimeout(this.hideTimeoutId);
			this.hideTimeoutId = null;
		}
		
		// Remove event listener from toggle button
		if (this.toggleButtonEl && this.toggleButtonHandler) {
			this.toggleButtonEl.removeEventListener('click', this.toggleButtonHandler);
			this.toggleButtonHandler = null;
			this.toggleButtonEl = null;
		}
		
		// Unload markdown component to clean up event handlers
		if (this.markdownComponent) {
			this.markdownComponent.unload();
		}
		
		// Clear references
		this.pendingContent = null;
		this.currentContent = '';
		
		this.containerEl.remove();
	}
	
	/**
	 * Check if indicator is currently visible
	 */
	public isShowing(): boolean {
		return this.isVisible;
	}
	
	/**
	 * Get current step index
	 */
	public getCurrentStepIndex(): number {
		return this.stepIndex;
	}
}
