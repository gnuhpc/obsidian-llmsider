/**
 * Tool Result Card Component
 * Displays tool execution results in a beautiful card format
 * Based on reference implementation from ai-chat-tool-execution
 */

import { setIcon } from 'obsidian';
import { Logger } from './../utils/logger';
import { i18n } from '../i18n/i18n-manager';

export type ToolStatus = 'pending' | 'executing' | 'success' | 'error' | 'regenerating';

export interface ToolResultData {
	toolName: string;
	status: ToolStatus;
	parameters?: Record<string, any>;
	result?: any;
	error?: string;
	timestamp: Date;
	description?: string;
	onRetry?: () => void;
	onRegenerateAndRetry?: () => void;
	onSkip?: () => void;
	retryButtonText?: string;
	regenerateAndRetryButtonText?: string;
	skipButtonText?: string;
}

export class ToolResultCard {
	private containerEl: HTMLElement;
	private isExpanded: boolean = false; // 默认折叠
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
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		// Add status-specific class
		this.containerEl.addClass(`llmsider-tool-status-${this.data.status}`);

		// Card content wrapper
		const contentEl = this.containerEl.createDiv({ cls: 'llmsider-tool-card-content' });

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
		this.renderHeader(contentEl);

		// Error message - 始终在顶部显示（如果有错误）
		if (this.data.status === 'error' && this.data.error) {
			this.renderErrorSummary(contentEl);
		}

		// Parameters preview (collapsed state) - 显示参数数量
		if (!this.isExpanded && this.data.parameters) {
			this.renderParametersPreview(contentEl);
		}

		// Expanded content - 展开时显示详细参数
		if (this.isExpanded) {
			this.renderExpandedContent(contentEl);
		}
		
		// Action buttons - pending 状态时显示批准/取消按钮，error 状态时显示重新生成/重试/跳过按钮
		if (this.data.status === 'pending' && (this.onApprove || this.onCancel)) {
			this.renderActionButtons(contentEl);
		} else if (this.data.status === 'error' && (this.data.onRegenerateAndRetry || this.data.onRetry || this.data.onSkip)) {
			Logger.debug('Rendering error action buttons:', {
				hasRegenerateAndRetry: !!this.data.onRegenerateAndRetry,
				hasRetry: !!this.data.onRetry,
				hasSkip: !!this.data.onSkip
			});
			this.renderErrorActionButtons(contentEl);
		}
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
			text: this.data.toolName 
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

		// No toggle button - the whole card content is clickable
	}

	private renderParametersPreview(container: HTMLElement): void {
		if (!this.data.parameters) return;
		
		const count = Object.keys(this.data.parameters).length;
		if (count === 0) return;

		const previewEl = container.createDiv({ cls: 'llmsider-tool-card-preview' });
		const translationKey = count === 1 ? 'planExecute.toolCardLabels.parameterCount' : 'planExecute.toolCardLabels.parametersCount';
		previewEl.createSpan({ 
			text: i18n.t(translationKey, { count: count.toString() })
		});
	}

	private renderExpandedContent(container: HTMLElement): void {
		const expandedEl = container.createDiv({ cls: 'llmsider-tool-card-expanded' });

		// Parameters section
		if (this.data.parameters && Object.keys(this.data.parameters).length > 0) {
			this.renderParameters(expandedEl);
		}

		// Result section
		if (this.data.status === 'success' && this.data.result) {
			this.renderResult(expandedEl);
		}

		// 注意：错误信息不再在这里显示，已经在 renderErrorSummary 中显示
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
				text: 'Approve & Execute'
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
				text: 'Cancel'
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
				text: this.data.regenerateAndRetryButtonText || 'Regenerate and Retry'
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
					text: this.data.retryButtonText || 'Retry'
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
					text: this.data.skipButtonText || 'Skip'
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
		header.createSpan({ text: 'Result' });

		// Toggle raw/formatted button
		const toggleBtn = header.createSpan({ 
			cls: 'llmsider-tool-card-toggle-format',
			text: this.showRawResult ? 'Formatted' : 'Raw JSON'
		});
		toggleBtn.onclick = () => {
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
			} else if (this.data.result.message) {
				resultBox.createDiv({ text: this.data.result.message });
				
				// Show path if available
				if (this.data.result.path) {
					const pathEl = resultBox.createDiv({ cls: 'llmsider-tool-card-path' });
					pathEl.innerHTML = `📁 Path: <code>${this.data.result.path}</code>`;
				}
				
				// Show content if available (truncated)
				if (this.data.result.content) {
					const contentPreview = this.data.result.content.substring(0, 200);
					const pre = resultBox.createEl('pre', { cls: 'llmsider-tool-card-content-preview' });
					pre.createEl('code', { text: contentPreview + (this.data.result.content.length > 200 ? '...' : '') });
				}
			} else {
				const pre = resultBox.createEl('pre', { cls: 'llmsider-tool-card-code' });
				pre.createEl('code', { text: JSON.stringify(this.data.result, null, 2) });
			}
		}
	}

	private formatValue(value: any): string {
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
		return JSON.stringify(value, null, 2);
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
}
