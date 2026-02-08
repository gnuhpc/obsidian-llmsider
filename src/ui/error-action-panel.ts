/**
 * Error Action Panel Component
 * 
 * Displays a floating action panel when a step fails in sequential execution.
 * Provides options to Skip, Retry, or Regenerate & Retry the failed step.
 */

import { setIcon } from 'obsidian';
import { Logger } from '../utils/logger';
import type { I18nManager } from '../i18n/i18n-manager';
import type { AgentStep } from '../core/agent/mastra-agent';

export type ErrorActionType = 'skip' | 'retry' | 'regenerate';

export interface ErrorActionPanelOptions {
	/** Failed step information */
	step: AgentStep;
	/** Step index */
	stepIndex: number;
	/** I18n manager for translations */
	i18n: I18nManager;
	/** Callback when user chooses an action */
	onAction: (action: ErrorActionType) => void;
	/** Callback when panel should be destroyed */
	onDestroy?: () => void;
	/** Target element to append the panel to (optional) */
	targetEl?: HTMLElement;
}

/**
 * Inline error action panel for failed steps
 */
export class ErrorActionPanel {
	private container: HTMLElement;
	private panelEl: HTMLElement | null = null;
	private options: ErrorActionPanelOptions;
	private isProcessing: boolean = false;
	
	constructor(container: HTMLElement, options: ErrorActionPanelOptions) {
		this.container = container;
		this.options = options;
	}
	
	/**
	 * Show the error action panel
	 */
	show(): void {
		if (this.panelEl) {
			this.destroy();
		}
		
		Logger.debug('[ErrorActionPanel] Showing panel for step:', this.options.step.id);
		
		// Determine parent element: use targetEl if provided, otherwise use container
		const parentEl = this.options.targetEl || this.container;
		
		// Create panel directly in parent element (no overlay)
		this.panelEl = parentEl.createDiv({ cls: 'llmsider-error-panel inline-mode' });
		
		// Panel header
		const header = this.panelEl.createDiv({ cls: 'llmsider-error-panel-header' });
		const headerIcon = header.createSpan({ cls: 'llmsider-error-panel-icon' });
		setIcon(headerIcon, 'alert-circle');
		
		header.createSpan({ 
			cls: 'llmsider-error-panel-title',
			text: this.options.i18n.t('planExecute.tracker.errorActions.title')
		});
		
		// Error message
		const errorMsg = this.panelEl.createDiv({ cls: 'llmsider-error-panel-message' });
		
		// Only show step info if not attached to the step itself
		if (!this.options.targetEl) {
			const stepInfo = errorMsg.createDiv({ cls: 'llmsider-error-panel-step-info' });
			stepInfo.createSpan({ 
				cls: 'llmsider-error-panel-step-label',
				text: `${this.options.i18n.t('planExecute.tracker.stepLabel').replace('{index}', String(this.options.stepIndex + 1))}: `
			});
			stepInfo.createSpan({ 
				cls: 'llmsider-error-panel-step-tool',
				text: this.options.step.tool
			});
		}
		
		if (this.options.step.error) {
			const errorText = errorMsg.createDiv({ cls: 'llmsider-error-panel-error-text' });
			errorText.setText(this.options.step.error);
		}
		
		// Action buttons
		const actions = this.panelEl.createDiv({ cls: 'llmsider-error-panel-actions' });
		
		// Skip button
		const skipBtn = this.createActionButton(
			actions,
			'skip-forward',
			this.options.i18n.t('planExecute.tracker.errorActions.skip'),
			'skip'
		);
		
		// Retry button
		const retryBtn = this.createActionButton(
			actions,
			'rotate-cw',
			this.options.i18n.t('planExecute.tracker.errorActions.retry'),
			'retry'
		);
		
		// Regenerate button
		const regenBtn = this.createActionButton(
			actions,
			'sparkles',
			this.options.i18n.t('planExecute.tracker.errorActions.regenerate'),
			'regenerate',
			true // Primary action
		);
		
		Logger.debug('[ErrorActionPanel] Panel shown with 3 action buttons');
	}
	
	/**
	 * Create an action button with icon and label
	 */
	private createActionButton(
		container: HTMLElement, 
		iconName: string, 
		label: string, 
		action: ErrorActionType,
		isPrimary: boolean = false
	): HTMLElement {
		const btn = container.createEl('button', { 
			cls: `llmsider-error-action-btn ${isPrimary ? 'primary' : ''}`,
			attr: { 'data-action': action }
		});
		
		const icon = btn.createSpan({ cls: 'llmsider-error-action-icon' });
		setIcon(icon, iconName);
		
		btn.createSpan({ 
			cls: 'llmsider-error-action-label',
			text: label 
		});
		
		btn.addEventListener('click', async () => {
			if (this.isProcessing) return;
			
			this.isProcessing = true;
			await this.handleAction(action, btn);
		});
		
		return btn;
	}
	
	/**
	 * Handle user action
	 */
	private async handleAction(action: ErrorActionType, btnEl: HTMLElement): Promise<void> {
		Logger.debug('[ErrorActionPanel] Action selected:', action);
		
		// Update button to show processing state
		const label = btnEl.querySelector('.llmsider-error-action-label') as HTMLElement;
		const originalText = label.textContent || '';
		
		const processingTexts: Record<ErrorActionType, string> = {
			skip: this.options.i18n.t('planExecute.tracker.errorActions.skipping'),
			retry: this.options.i18n.t('planExecute.tracker.errorActions.retrying'),
			regenerate: this.options.i18n.t('planExecute.tracker.errorActions.regenerating')
		};
		
		label.setText(processingTexts[action]);
		btnEl.addClass('processing');
		
		// Disable all buttons
		const allButtons = this.panelEl?.querySelectorAll('.llmsider-error-action-btn');
		allButtons?.forEach(btn => {
			(btn as HTMLButtonElement).disabled = true;
		});
		
		try {
			// Call the action callback
			await this.options.onAction(action);
			
			// Destroy panel after action completes
			this.destroy();
			
		} catch (error) {
			Logger.error('[ErrorActionPanel] Action failed:', error);
			
			// Restore button state on error
			label.setText(originalText);
			btnEl.removeClass('processing');
			allButtons?.forEach(btn => {
				(btn as HTMLButtonElement).disabled = false;
			});
			
			this.isProcessing = false;
		}
	}
	
	/**
	 * Check if panel is currently showing
	 */
	isShowing(): boolean {
		return this.panelEl !== null && this.panelEl.isConnected;
	}
	
	/**
	 * Destroy the panel
	 */
	destroy(): void {
		if (this.panelEl) {
			Logger.debug('[ErrorActionPanel] Destroying panel');
			
			const overlay = this.panelEl.parentElement;
			if (overlay) {
				overlay.remove();
			}
			
			this.panelEl = null;
			this.isProcessing = false;
			
			if (this.options.onDestroy) {
				this.options.onDestroy();
			}
		}
	}
}
