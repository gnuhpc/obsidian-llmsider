/**
 * Tool Result Card Component
 * Displays tool execution results in a beautiful card format
 * Based on reference implementation from ai-chat-tool-execution
 */

import { setIcon } from 'obsidian';
import { Logger } from './../utils/logger';
import { i18n } from '../i18n/i18n-manager';
import { TOOL_I18N_KEY_MAP } from '../tools/built-in-tools';

export type ToolStatus = 'pending' | 'executing' | 'success' | 'error' | 'regenerating';

/**
 * Structured result format with message, path, and content fields
 */
interface StructuredToolResult {
	message?: string;
	path?: string;
	content?: string;
	[key: string]: unknown;
}

export interface ToolResultData {
	toolName: string;
	status: ToolStatus;
	parameters?: Record<string, unknown>;
	result?: unknown;
	error?: string;
	timestamp: Date;
	description?: string;
	progressText?: string; // 执行中的进度文本提示
	initiallyExpanded?: boolean; // 是否默认展开 (用于reload后的卡片)
	onRetry?: () => void;
	onRegenerateAndRetry?: () => void;
	onSkip?: () => void;
	retryButtonText?: string;
	regenerateAndRetryButtonText?: string;
	skipButtonText?: string;
}

export class ToolResultCard {
	private containerEl: HTMLElement;
	private isExpanded: boolean; // 是否展开
	private showRawResult: boolean = false;
	private onApprove?: () => void;
	private onCancel?: () => void;

	constructor(
		container: HTMLElement,
		private data: ToolResultData,
		onApprove?: () => void,
		onCancel?: () => void
	) {
		this.containerEl = container.createDiv({ cls: 'llmsider-tool-result-card' });
		this.onApprove = onApprove;
		this.onCancel = onCancel;
		// Set initial expanded state - default to collapsed unless specified
		this.isExpanded = data.initiallyExpanded ?? false;
		
		// Store this instance on the container element for later access
		(container as any).__toolResultCardInstance = this;
		
		// Store parameters in DOM for retrieval later
		if (data.parameters) {
			(this.containerEl as any).__toolParameters = data.parameters;
		}
		
		// Debug: Log parameters received
		Logger.debug('[ToolResultCard] Constructor called with:', {
			toolName: data.toolName,
			status: data.status,
			hasParameters: !!data.parameters,
			parametersKeys: data.parameters ? Object.keys(data.parameters) : [],
			parameters: data.parameters
		});
		
		this.render();
	}
	
	/**
	 * Update progress text during tool execution
	 */
	public updateProgress(progressText: string): void {
		this.data.progressText = progressText;
		this.render();
	}
	
	/**
	 * Update card status and optionally other data fields
	 */
	public updateStatus(status: ToolStatus, updates?: Partial<ToolResultData>): void {
		this.data.status = status;
		if (updates) {
			Object.assign(this.data, updates);
		}
		Logger.debug('[ToolResultCard] Status updated:', {
			newStatus: status,
			updates: updates
		});
		this.render();
	}

	private render(): void {
		Logger.debug('[ToolResultCard] render() called, status:', this.data.status);
		this.containerEl.empty();

		// Remove all status-specific classes first
		this.containerEl.removeClass('llmsider-tool-status-pending');
		this.containerEl.removeClass('llmsider-tool-status-executing');
		this.containerEl.removeClass('llmsider-tool-status-success');
		this.containerEl.removeClass('llmsider-tool-status-error');
		this.containerEl.removeClass('llmsider-tool-status-regenerating');
		
		// Add current status-specific class
		this.containerEl.addClass(`llmsider-tool-status-${this.data.status}`);
		Logger.debug('[ToolResultCard] Added status class:', `llmsider-tool-status-${this.data.status}`);
		
		// Add data attributes for tool card identification
		this.containerEl.setAttribute('data-tool-card-name', this.data.toolName);
		if (this.data.status === 'executing') {
			this.containerEl.setAttribute('data-tool-executing', 'true');
		} else {
			this.containerEl.removeAttribute('data-tool-executing');
		}
		Logger.debug('[ToolResultCard] Set data attributes:', {
			toolName: this.data.toolName,
			isExecuting: this.data.status === 'executing'
		});

		// Card content wrapper
		const contentEl = this.containerEl.createDiv({ cls: 'llmsider-tool-card-content' });
		Logger.debug('[ToolResultCard] Created content element');

		// Make the whole card clickable (except buttons)
		contentEl.style.cursor = 'pointer';
		contentEl.onclick = (e) => {
			// Don't toggle if clicking on action buttons
			const target = e.target as HTMLElement;
			if (target.closest('.llmsider-tool-card-actions') || 
			    target.closest('button')) {
				return;
			}
			this.isExpanded = !this.isExpanded;
			this.render();
		};

		// Header
		Logger.debug('[ToolResultCard] Calling renderHeader()');
		this.renderHeader(contentEl);
		Logger.debug('[ToolResultCard] renderHeader() completed');

		// Error message - 始终在顶部显示（如果有错误）
		if (this.data.status === 'error' && this.data.error) {
			Logger.debug('[ToolResultCard] Rendering error summary');
			this.renderErrorSummary(contentEl);
		}

		// Parameters preview (collapsed state) - 显示参数数量
		if (!this.isExpanded && this.data.parameters) {
			Logger.debug('[ToolResultCard] Rendering parameters preview');
			this.renderParametersPreview(contentEl);
		}

		// Expanded content - 展开时显示详细参数
		if (this.isExpanded) {
			Logger.debug('[ToolResultCard] Rendering expanded content');
			this.renderExpandedContent(contentEl);
		}
		
		// Action buttons - pending 状态时显示批准/取消按钮，error 状态时显示重新生成/重试/跳过按钮
		if (this.data.status === 'pending' && (this.onApprove || this.onCancel)) {
			Logger.debug('[ToolResultCard] Rendering action buttons');
			this.renderActionButtons(contentEl);
		} else if (this.data.status === 'error' && (this.data.onRegenerateAndRetry || this.data.onRetry || this.data.onSkip)) {
			Logger.debug('Rendering error action buttons:', {
				hasRegenerateAndRetry: !!this.data.onRegenerateAndRetry,
				hasRetry: !!this.data.onRetry,
				hasSkip: !!this.data.onSkip
			});
			this.renderErrorActionButtons(contentEl);
		}
		Logger.debug('[ToolResultCard] render() completed successfully');
	}

	private renderHeader(container: HTMLElement): void {
		const headerEl = container.createDiv({ cls: 'llmsider-tool-card-header' });

		// Left side: icon + info
		const leftEl = headerEl.createDiv({ cls: 'llmsider-tool-card-left' });

		// Status icon
		const iconContainer = leftEl.createDiv({ cls: 'llmsider-tool-card-icon' });
		
		// Use custom SVG animation for regenerating status
		if (this.data.status === 'regenerating') {
			iconContainer.addClass('llmsider-tool-icon-regenerating');
			// Create custom SVG animation for regenerating
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('width', '20');
			svg.setAttribute('height', '20');
			svg.setAttribute('viewBox', '0 0 24 24');
			svg.setAttribute('fill', 'none');
			svg.setAttribute('stroke', 'currentColor');
			svg.setAttribute('stroke-width', '2');
			svg.setAttribute('stroke-linecap', 'round');
			svg.setAttribute('stroke-linejoin', 'round');
			
			// AI sparkle icon with animation
			const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			g.setAttribute('class', 'llmsider-regenerate-icon');
			
			// Central star
			const centerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			centerPath.setAttribute('d', 'M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5Z');
			centerPath.setAttribute('fill', 'currentColor');
			centerPath.setAttribute('opacity', '0.8');
			centerPath.setAttribute('class', 'llmsider-sparkle-center');
			g.appendChild(centerPath);
			
			// Top right sparkle
			const sparkle1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			sparkle1.setAttribute('d', 'M19 3L19.5 5L21.5 5.5L19.5 6L19 8L18.5 6L16.5 5.5L18.5 5Z');
			sparkle1.setAttribute('fill', 'currentColor');
			sparkle1.setAttribute('opacity', '0.6');
			sparkle1.setAttribute('class', 'llmsider-sparkle-1');
			g.appendChild(sparkle1);
			
			// Bottom left sparkle
			const sparkle2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			sparkle2.setAttribute('d', 'M5 16L5.5 18L7.5 18.5L5.5 19L5 21L4.5 19L2.5 18.5L4.5 18Z');
			sparkle2.setAttribute('fill', 'currentColor');
			sparkle2.setAttribute('opacity', '0.6');
			sparkle2.setAttribute('class', 'llmsider-sparkle-2');
			g.appendChild(sparkle2);
			
			svg.appendChild(g);
			iconContainer.appendChild(svg);
		} else {
			const iconName = this.getStatusIcon();
			setIcon(iconContainer, iconName);
			if (this.data.status === 'executing') {
				iconContainer.addClass('llmsider-tool-icon-spin');
			}
		}

		// Tool info
		const infoEl = leftEl.createDiv({ cls: 'llmsider-tool-card-info' });
		
		// Title row - 显示工具名称和状态徽章
		const titleRow = infoEl.createDiv({ cls: 'llmsider-tool-card-title-row' });
		titleRow.createSpan({ 
			cls: 'llmsider-tool-card-name',
			text: this.getLocalizedToolName()
		});
		
		const badge = titleRow.createSpan({ 
			cls: 'llmsider-tool-card-badge',
			text: this.getStatusLabel() 
		});
		badge.addClass(`llmsider-badge-${this.data.status}`);
		
		// Description row - show tool call purpose
		if (this.data.description) {
			infoEl.createDiv({ 
				cls: 'llmsider-tool-card-description',
				text: this.data.description 
			});
		}
		
		// Progress text for executing status
		if (this.data.status === 'executing' && this.data.progressText) {
			infoEl.createDiv({
				cls: 'llmsider-tool-card-progress',
				text: this.data.progressText
			});
		}

		// No toggle button - the whole card content is clickable
	}

	private renderParametersPreview(container: HTMLElement): void {
		if (!this.data.parameters) return;
		
		const count = Object.keys(this.data.parameters).length;
		if (count === 0) return;

		const previewEl = container.createDiv({ cls: 'llmsider-tool-card-preview' });
		
		// Show parameter count with a hint that it's clickable
		const translationKey = count === 1 ? 'planExecute.toolCardLabels.parameterCount' : 'planExecute.toolCardLabels.parametersCount';
		const countText = i18n.t(translationKey, { count: count.toString() });
		
		// Add status-specific hint
		let hintText = '';
		if (this.data.status === 'pending') {
			hintText = i18n.t('planExecute.toolCardLabels.clickToViewParameters');
		} else if (this.data.status === 'success') {
			hintText = i18n.t('planExecute.toolCardLabels.clickToViewDetails');
		} else if (this.data.status === 'error') {
			hintText = i18n.t('planExecute.toolCardLabels.clickToViewDetails');
		}
		
		previewEl.createSpan({ 
			cls: 'llmsider-tool-card-preview-count',
			text: countText
		});
		
		if (hintText) {
			previewEl.createSpan({ 
				cls: 'llmsider-tool-card-preview-hint',
				text: ` • ${hintText}`
			});
		}
	}

	private renderExpandedContent(container: HTMLElement): void {
		const expandedEl = container.createDiv({ cls: 'llmsider-tool-card-expanded' });

		// Debug: Log what we're rendering
		Logger.debug('[ToolResultCard] renderExpandedContent called:', {
			hasParameters: !!this.data.parameters,
			parametersCount: this.data.parameters ? Object.keys(this.data.parameters).length : 0,
			parameters: this.data.parameters,
			status: this.data.status,
			hasResult: !!this.data.result
		});

		// Parameters section - always show if available (for all states: pending, executing, success, error)
		if (this.data.parameters && Object.keys(this.data.parameters).length > 0) {
			Logger.debug('[ToolResultCard] Rendering parameters section');
			this.renderParameters(expandedEl);
		} else {
			Logger.debug('[ToolResultCard] No parameters to render');
		}

		// Result section - show for success or error with result
		if ((this.data.status === 'success' || this.data.status === 'error') && this.data.result) {
			Logger.debug('[ToolResultCard] Rendering result section');
			this.renderResult(expandedEl);
		}

		// Note: Error message is displayed at the top in renderErrorSummary
	}

	private renderErrorSummary(container: HTMLElement): void {
		const errorEl = container.createDiv({ cls: 'llmsider-tool-card-error-summary' });
		
		const iconEl = errorEl.createSpan({ cls: 'llmsider-tool-card-error-icon' });
		setIcon(iconEl, 'alert-circle');
		
		errorEl.createSpan({ 
			cls: 'llmsider-tool-card-error-text',
			text: this.data.error || 'Unknown error'
		});
	}

	private renderActionButtons(container: HTMLElement): void {
		const actionsEl = container.createDiv({ cls: 'llmsider-tool-card-actions' });
		
		if (this.onApprove) {
			const approveBtn = actionsEl.createEl('button', {
				cls: 'llmsider-tool-card-btn llmsider-tool-card-btn-primary',
				text: i18n.t('planExecute.toolCardLabels.approveAndExecute')
			});
			const playIcon = approveBtn.createSpan({ cls: 'llmsider-tool-card-btn-icon' });
			setIcon(playIcon, 'play');
			approveBtn.prepend(playIcon);
			
			approveBtn.onclick = () => {
				if (this.onApprove) this.onApprove();
			};
		}
		
		if (this.onCancel) {
			const cancelBtn = actionsEl.createEl('button', {
				cls: 'llmsider-tool-card-btn llmsider-tool-card-btn-secondary',
				text: i18n.t('planExecute.toolCardLabels.cancel')
			});
			
			cancelBtn.onclick = () => {
				if (this.onCancel) this.onCancel();
			};
		}
	}

	private renderErrorActionButtons(container: HTMLElement): void {
		Logger.debug('renderErrorActionButtons called');
		const actionsEl = container.createDiv({ cls: 'llmsider-tool-card-actions' });
		
		// First row: Regenerate and Retry button (AI-powered fix) - full width
		if (this.data.onRegenerateAndRetry) {
			Logger.debug('Creating Regenerate and Retry button');
			const firstRowEl = actionsEl.createDiv({ cls: 'llmsider-tool-card-actions-row' });
			const regenerateBtn = firstRowEl.createEl('button', {
				cls: 'llmsider-tool-card-btn llmsider-tool-card-btn-primary llmsider-tool-card-btn-full',
				text: this.data.regenerateAndRetryButtonText || i18n.t('planExecute.toolCardLabels.regenerateAndRetry')
			});
			const sparklesIcon = regenerateBtn.createSpan({ cls: 'llmsider-tool-card-btn-icon' });
			setIcon(sparklesIcon, 'sparkles');
			regenerateBtn.prepend(sparklesIcon);
			
			regenerateBtn.onclick = () => {
				Logger.debug('Regenerate and Retry button clicked');
				if (this.data.onRegenerateAndRetry) this.data.onRegenerateAndRetry();
			};
		}
		
		// Second row: Retry and Skip buttons - side by side
		if (this.data.onRetry || this.data.onSkip) {
			const secondRowEl = actionsEl.createDiv({ cls: 'llmsider-tool-card-actions-row' });
			
			// Direct Retry button (same parameters)
			if (this.data.onRetry) {
				Logger.debug('Creating Retry button');
				const retryBtn = secondRowEl.createEl('button', {
					cls: 'llmsider-tool-card-btn llmsider-tool-card-btn-secondary',
					text: this.data.retryButtonText || i18n.t('planExecute.toolCardLabels.retry')
				});
				const refreshIcon = retryBtn.createSpan({ cls: 'llmsider-tool-card-btn-icon' });
				setIcon(refreshIcon, 'refresh-cw');
				retryBtn.prepend(refreshIcon);
				
				retryBtn.onclick = () => {
					Logger.debug('Retry button clicked');
					if (this.data.onRetry) this.data.onRetry();
				};
			}
			
			// Skip button
			if (this.data.onSkip) {
				Logger.debug('Creating Skip button');
				const skipBtn = secondRowEl.createEl('button', {
					cls: 'llmsider-tool-card-btn llmsider-tool-card-btn-tertiary',
					text: this.data.skipButtonText || i18n.t('planExecute.toolCardLabels.skip')
				});
				const skipIcon = skipBtn.createSpan({ cls: 'llmsider-tool-card-btn-icon' });
				setIcon(skipIcon, 'skip-forward');
				skipBtn.prepend(skipIcon);
				
				skipBtn.onclick = () => {
					Logger.debug('Skip button clicked');
					if (this.data.onSkip) this.data.onSkip();
				};
			}
		}
		
		Logger.debug('Error action buttons rendered, actions container:', actionsEl);
	}

	private renderParameters(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'llmsider-tool-card-section' });
		
		const header = section.createDiv({ cls: 'llmsider-tool-card-section-header' });
		header.createSpan({ text: i18n.t('planExecute.toolCardLabels.parameters') });
		
		// Add copy button
		const copyBtn = header.createSpan({ 
			cls: 'llmsider-tool-card-copy-btn',
			attr: { 'aria-label': i18n.t('planExecute.toolCardLabels.copyParameters') }
		});
		setIcon(copyBtn, 'copy');
		copyBtn.onclick = (e) => {
			e.stopPropagation();
			this.copyToClipboard(JSON.stringify(this.data.parameters, null, 2), copyBtn);
		};

		const paramsBox = section.createDiv({ cls: 'llmsider-tool-card-params-box' });
		
		for (const [key, value] of Object.entries(this.data.parameters!)) {
			const paramEl = paramsBox.createDiv({ cls: 'llmsider-tool-card-param' });
			paramEl.createDiv({ 
				cls: 'llmsider-tool-card-param-key',
				text: key 
			});
			paramEl.createDiv({ 
				cls: 'llmsider-tool-card-param-value',
				text: this.formatValue(value)
			});
		}
	}

	private renderResult(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'llmsider-tool-card-section' });
		
		const header = section.createDiv({ cls: 'llmsider-tool-card-section-header' });
		header.createSpan({ text: i18n.t('planExecute.toolCardLabels.result') });

		// Add copy button
		const copyBtn = header.createSpan({ 
			cls: 'llmsider-tool-card-copy-btn',
			attr: { 'aria-label': i18n.t('planExecute.toolCardLabels.copyResult') }
		});
		setIcon(copyBtn, 'copy');
		copyBtn.onclick = (e) => {
			e.stopPropagation();
			const content = typeof this.data.result === 'string' 
				? this.data.result 
				: JSON.stringify(this.data.result, null, 2);
			this.copyToClipboard(content, copyBtn);
		};

		// Toggle raw/formatted button
		const toggleBtn = header.createSpan({ 
			cls: 'llmsider-tool-card-toggle-format',
			text: this.showRawResult ? i18n.t('planExecute.toolCardLabels.formatted') : i18n.t('planExecute.toolCardLabels.rawJson')
		});
		toggleBtn.onclick = (e) => {
			e.stopPropagation();
			this.showRawResult = !this.showRawResult;
			this.render();
		};

		const resultBox = section.createDiv({ cls: 'llmsider-tool-card-result-box' });

		if (this.showRawResult) {
			const pre = resultBox.createEl('pre', { cls: 'llmsider-tool-card-code' });
			pre.createEl('code', { text: JSON.stringify(this.data.result, null, 2) });
		} else {
			// Try to format nicely
			if (typeof this.data.result === 'string') {
				resultBox.createDiv({ text: this.data.result });
			} else if (this.isStructuredResult(this.data.result)) {
				const structuredResult = this.data.result;
				
				// Special handling for list_directory results
				if (this.data.toolName === 'list_directory' && structuredResult.listing) {
					const listing = structuredResult.listing as { folders?: string[]; files?: string[] };
					
					if (listing.folders && listing.folders.length > 0) {
						const foldersHeader = resultBox.createDiv({ cls: 'llmsider-tool-card-directory-header' });
						foldersHeader.textContent = `📁 ${i18n.t('planExecute.toolCardLabels.folders')} (${listing.folders.length})`;
						
						const foldersList = resultBox.createDiv({ cls: 'llmsider-tool-card-directory-list' });
						listing.folders.forEach(folder => {
							const folderItem = foldersList.createDiv({ cls: 'llmsider-tool-card-directory-item' });
							folderItem.textContent = `  📂 ${folder}`;
						});
					}
					
					if (listing.files && listing.files.length > 0) {
						const filesHeader = resultBox.createDiv({ cls: 'llmsider-tool-card-directory-header' });
						filesHeader.textContent = `📄 ${i18n.t('planExecute.toolCardLabels.files')} (${listing.files.length})`;
						
						const filesList = resultBox.createDiv({ cls: 'llmsider-tool-card-directory-list' });
						listing.files.forEach(file => {
							const fileItem = filesList.createDiv({ cls: 'llmsider-tool-card-directory-item' });
							
							if (typeof file === 'string') {
								fileItem.textContent = `  📄 ${file}`;
							} else {
								// Handle file object with stats
								const fileObj = file as { name: string; size?: number; modified?: number };
								const sizeStr = fileObj.size !== undefined ? ` (${this.formatBytes(fileObj.size)})` : '';
								fileItem.textContent = `  📄 ${fileObj.name}${sizeStr}`;
								
								// Optional: Add tooltip with modification time if available
								if (fileObj.modified) {
									fileItem.title = `Modified: ${new Date(fileObj.modified).toLocaleString()}`;
								}
							}
						});
					}
					
					// Show summary if no items
					if ((!listing.folders || listing.folders.length === 0) && 
					    (!listing.files || listing.files.length === 0)) {
						resultBox.createDiv({ 
							cls: 'llmsider-tool-card-empty-result',
							text: i18n.t('planExecute.toolCardLabels.emptyDirectory')
						});
					}
				} else {
					// Default structured result handling
					if (structuredResult.message) {
						resultBox.createDiv({ text: structuredResult.message });
					}
					
					// Show path if available
					if (structuredResult.path) {
						const pathEl = resultBox.createDiv({ cls: 'llmsider-tool-card-path' });
						pathEl.innerHTML = `📁 Path: <code>${structuredResult.path}</code>`;
					}
					
					// Show content if available (truncated)
					if (structuredResult.content) {
						const contentPreview = structuredResult.content.substring(0, 200);
						const pre = resultBox.createEl('pre', { cls: 'llmsider-tool-card-content-preview' });
						pre.createEl('code', { 
							text: contentPreview + (structuredResult.content.length > 200 ? '...' : '') 
						});
					}
				}
			} else {
				const pre = resultBox.createEl('pre', { cls: 'llmsider-tool-card-code' });
				pre.createEl('code', { text: JSON.stringify(this.data.result, null, 2) });
			}
		}
	}

	private formatValue(value: unknown): string {
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
		return JSON.stringify(value, null, 2);
	}

	/**
	 * Type guard to check if result is structured format
	 */
	private isStructuredResult(result: unknown): result is StructuredToolResult {
		return (
			result !== null &&
			typeof result === 'object' &&
			('message' in result || 'path' in result || 'content' in result)
		);
	}

	private getLocalizedToolName(): string {
		// Check if tool has i18n translation
		const toolKeyMap = TOOL_I18N_KEY_MAP as Record<string, { name?: string; description?: string }>;
		const i18nKey = toolKeyMap[this.data.toolName];
		if (i18nKey && i18nKey.name) {
			const translatedName = i18n.t(i18nKey.name);
			// If translation exists and is different from the key, return it
			if (translatedName && translatedName !== i18nKey.name) {
				return translatedName;
			}
		}
		// Return original tool name if no translation
		return this.data.toolName;
	}

	private getStatusIcon(): string {
		switch (this.data.status) {
			case 'pending': return 'clock';
			case 'executing': return 'loader-2';
			case 'regenerating': return 'refresh-cw';
			case 'success': return 'check-circle-2';
			case 'error': return 'x-circle';
		}
	}

	private getStatusLabel(): string {
		switch (this.data.status) {
			case 'pending': return i18n.t('planExecute.toolCardStatus.awaitingApproval');
			case 'executing': return i18n.t('planExecute.toolCardStatus.executing');
			case 'regenerating': return i18n.t('planExecute.toolCardStatus.regenerating');
			case 'success': return i18n.t('planExecute.toolCardStatus.completed');
			case 'error': return i18n.t('planExecute.toolCardStatus.failed');
		}
	}

	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	private async copyToClipboard(text: string, buttonEl: HTMLElement): Promise<void> {
		try {
			await navigator.clipboard.writeText(text);
			
			// Visual feedback
			const originalIcon = buttonEl.innerHTML;
			buttonEl.empty();
			setIcon(buttonEl, 'check');
			buttonEl.addClass('llmsider-tool-card-copy-success');
			
			// Restore after 2 seconds
			setTimeout(() => {
				buttonEl.empty();
				buttonEl.innerHTML = originalIcon;
				buttonEl.removeClass('llmsider-tool-card-copy-success');
			}, 2000);
		} catch (error) {
			Logger.error('Failed to copy to clipboard:', error);
			
			// Show error feedback
			buttonEl.addClass('llmsider-tool-card-copy-error');
			setTimeout(() => {
				buttonEl.removeClass('llmsider-tool-card-copy-error');
			}, 2000);
		}
	}
}
