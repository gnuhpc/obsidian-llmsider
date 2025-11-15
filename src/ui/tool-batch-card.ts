/**
 * Tool Batch Card Component
 * Displays multiple tool calls in a single collapsible card
 */

import { setIcon } from 'obsidian';
import { i18n } from '../i18n/i18n-manager';

export interface ToolCallData {
	name: string;
	parameters: Record<string, any>;
	id?: string;
	rawToolCall?: any;
}

export class ToolBatchCard {
	private containerEl: HTMLElement;
	private isExpanded: boolean = false;
	private expandedTools: Set<string> = new Set();
	private onApprove?: () => void;
	private onCancel?: () => void;

	constructor(
		container: HTMLElement,
		private toolCalls: ToolCallData[],
		private description: string,
		onApprove?: () => void,
		onCancel?: () => void
	) {
		this.containerEl = container.createDiv({ cls: 'llmsider-tool-batch-card' });
		this.onApprove = onApprove;
		this.onCancel = onCancel;
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		// Card wrapper
		const cardEl = this.containerEl.createDiv({ cls: 'llmsider-tool-batch-wrapper' });

		// Header with main toggle
		this.renderHeader(cardEl);

		// Collapsed state: show summary
		if (!this.isExpanded) {
			this.renderSummary(cardEl);
		}

		// Expanded state: show all tools
		if (this.isExpanded) {
			this.renderToolsList(cardEl);
		}

		// Action buttons (always at bottom)
		this.renderActionButtons(cardEl);
	}

	private renderHeader(container: HTMLElement): void {
		const headerEl = container.createDiv({ cls: 'llmsider-tool-batch-header' });

		// Left side: icon + description
		const leftEl = headerEl.createDiv({ cls: 'llmsider-tool-batch-left' });

		// Icon
		const iconContainer = leftEl.createDiv({ cls: 'llmsider-tool-batch-icon' });
		setIcon(iconContainer, 'clock');

		// Description
		const descEl = leftEl.createDiv({ cls: 'llmsider-tool-batch-desc' });
		descEl.createSpan({
			cls: 'llmsider-tool-batch-title',
			text: this.description || i18n.t('planExecute.toolCardLabels.aiWantsToExecuteTools')
		});

		// Badge
		const badge = descEl.createSpan({
			cls: 'llmsider-tool-batch-badge',
			text: i18n.t('planExecute.toolCardStatus.awaitingApproval')
		});

		// Right side: expand/collapse button
		const toggleBtn = headerEl.createDiv({ cls: 'llmsider-tool-batch-toggle' });
		const toggleIcon = this.isExpanded ? 'chevron-up' : 'chevron-down';
		setIcon(toggleBtn, toggleIcon);
		toggleBtn.onclick = () => {
			this.isExpanded = !this.isExpanded;
			this.render();
		};
	}

	private renderSummary(container: HTMLElement): void {
		const summaryEl = container.createDiv({ cls: 'llmsider-tool-batch-summary' });
		
		const count = this.toolCalls.length;
		const toolNames = this.toolCalls.map(t => t.name).join(', ');
		
		summaryEl.createSpan({
			text: `${count} tool${count !== 1 ? 's' : ''}: ${toolNames}`
		});
	}

	private renderToolsList(container: HTMLElement): void {
		const listEl = container.createDiv({ cls: 'llmsider-tool-batch-list' });

		listEl.createDiv({
			cls: 'llmsider-tool-batch-section-title',
			text: i18n.t('planExecute.toolCardLabels.toolsToExecute')
		});

		this.toolCalls.forEach((tool, index) => {
			this.renderToolItem(listEl, tool, index);
		});
	}

	private renderToolItem(container: HTMLElement, tool: ToolCallData, index: number): void {
		const itemEl = container.createDiv({ cls: 'llmsider-tool-batch-item' });
		
		const toolId = tool.id || `tool-${index}`;
		const isToolExpanded = this.expandedTools.has(toolId);

		// Tool header (always visible when batch card is expanded)
		const toolHeaderEl = itemEl.createDiv({ cls: 'llmsider-tool-batch-item-header' });

		// Left: tool name and param count
		const toolLeftEl = toolHeaderEl.createDiv({ cls: 'llmsider-tool-batch-item-left' });
		
		toolLeftEl.createSpan({
			cls: 'llmsider-tool-batch-item-name',
			text: tool.name
		});

		const paramCount = Object.keys(tool.parameters || {}).length;
		if (paramCount > 0) {
			toolLeftEl.createSpan({
				cls: 'llmsider-tool-batch-item-count',
				text: `${paramCount} parameter${paramCount !== 1 ? 's' : ''}`
			});
		}

		// Right: expand/collapse toggle
		const toolToggleBtn = toolHeaderEl.createDiv({ cls: 'llmsider-tool-batch-item-toggle' });
		const toolToggleIcon = isToolExpanded ? 'chevron-up' : 'chevron-down';
		setIcon(toolToggleBtn, toolToggleIcon);
		toolToggleBtn.onclick = () => {
			if (isToolExpanded) {
				this.expandedTools.delete(toolId);
			} else {
				this.expandedTools.add(toolId);
			}
			this.render();
		};

		// Tool parameters (shown when individual tool is expanded)
		if (isToolExpanded) {
			this.renderToolParameters(itemEl, tool);
		}
	}

	private renderToolParameters(container: HTMLElement, tool: ToolCallData): void {
		const paramsEl = container.createDiv({ cls: 'llmsider-tool-batch-item-params' });

		paramsEl.createDiv({
			cls: 'llmsider-tool-batch-param-title',
			text: i18n.t('planExecute.toolCardLabels.parameters')
		});

		const paramsBox = paramsEl.createDiv({ cls: 'llmsider-tool-batch-param-box' });

		for (const [key, value] of Object.entries(tool.parameters || {})) {
			const paramEl = paramsBox.createDiv({ cls: 'llmsider-tool-batch-param' });
			
			paramEl.createDiv({
				cls: 'llmsider-tool-batch-param-key',
				text: key
			});
			
			paramEl.createDiv({
				cls: 'llmsider-tool-batch-param-value',
				text: this.formatValue(value)
			});
		}
	}

	private renderActionButtons(container: HTMLElement): void {
		const actionsEl = container.createDiv({ cls: 'llmsider-tool-batch-actions' });

		if (this.onApprove) {
			const approveBtn = actionsEl.createEl('button', {
				cls: 'llmsider-tool-batch-btn llmsider-tool-batch-btn-primary',
				text: i18n.t('planExecute.toolCardLabels.approveAndExecute')
			});
			const playIcon = approveBtn.createSpan({ cls: 'llmsider-tool-batch-btn-icon' });
			setIcon(playIcon, 'play');
			approveBtn.prepend(playIcon);

			approveBtn.onclick = () => {
				if (this.onApprove) this.onApprove();
			};
		}

		if (this.onCancel) {
			const cancelBtn = actionsEl.createEl('button', {
				cls: 'llmsider-tool-batch-btn llmsider-tool-batch-btn-secondary',
				text: i18n.t('planExecute.toolCardLabels.cancel')
			});

			cancelBtn.onclick = () => {
				if (this.onCancel) this.onCancel();
			};
		}
	}

	private formatValue(value: any): string {
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
		if (Array.isArray(value)) return JSON.stringify(value);
		if (typeof value === 'object' && value !== null) {
			// For objects, show a compact representation
			const str = JSON.stringify(value);
			if (str.length > 100) {
				return str.substring(0, 97) + '...';
			}
			return str;
		}
		return JSON.stringify(value);
	}

	public updateStatus(status: 'executing' | 'completed' | 'error', message?: string): void {
		// Find badge and update
		const badge = this.containerEl.querySelector('.llmsider-tool-batch-badge') as HTMLElement;
		if (badge) {
			if (status === 'executing') {
				badge.textContent = i18n.t('planExecute.toolCardLabels.executing');
				badge.className = 'llmsider-tool-batch-badge llmsider-badge-executing';
			} else if (status === 'completed') {
				badge.textContent = i18n.t('planExecute.toolCardLabels.completed');
				badge.className = 'llmsider-tool-batch-badge llmsider-badge-success';
			} else if (status === 'error') {
				badge.textContent = i18n.t('planExecute.toolCardLabels.failed');
				badge.className = 'llmsider-tool-batch-badge llmsider-badge-error';
			}
		}

		// Hide action buttons when not pending
		const actionsEl = this.containerEl.querySelector('.llmsider-tool-batch-actions');
		if (actionsEl && status !== 'executing') {
			(actionsEl as HTMLElement).style.display = 'none';
		}

		// Update icon if executing
		if (status === 'executing') {
			const icon = this.containerEl.querySelector('.llmsider-tool-batch-icon');
			if (icon) {
				icon.empty();
				setIcon(icon as HTMLElement, 'loader-2');
				icon.addClass('llmsider-tool-icon-spin');
			}
		}
	}
}
