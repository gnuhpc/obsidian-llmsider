/**
 * Dynamic Step Confirmation Modal
 * 
 * Shows user which nodes are about to execute in the current step
 * Allows user to confirm/cancel before execution
 */

import { Modal, App, setIcon } from 'obsidian';
import type { DynamicStep, ToolNode } from '../core/agent/guided-mode-agent';
import type { I18nManager } from '../i18n/i18n-manager';

export class DynamicStepModal extends Modal {
	private step: DynamicStep;
	private nodes: Map<string, ToolNode>;
	private i18n: I18nManager;
	private resolveCallback: ((confirmed: boolean) => void) | null = null;
	
	constructor(app: App, step: DynamicStep, nodes: Map<string, ToolNode>, i18n: I18nManager) {
		super(app);
		this.step = step;
		this.nodes = nodes;
		this.i18n = i18n;
	}
	
	/**
	 * Show modal and wait for user confirmation
	 */
	async confirm(): Promise<boolean> {
		this.open();
		
		return new Promise<boolean>((resolve) => {
			this.resolveCallback = resolve;
		});
	}
	
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('llmsider-dynamic-step-modal');
		
		// Header
		const header = contentEl.createDiv({ cls: 'llmsider-step-modal-header' });
		const title = header.createEl('h2');
		const titleIcon = title.createSpan({ cls: 'llmsider-step-modal-icon' });
		setIcon(titleIcon, 'zap');
		title.appendText(this.i18n.t('graphExecution.dynamicStepTitle') || '动态步骤确认');
		
		// Step info
		const stepInfo = contentEl.createDiv({ cls: 'llmsider-step-modal-info' });
		stepInfo.createEl('strong', { 
			text: `${this.i18n.t('graphExecution.step') || '步骤'} ${this.step.stepNumber}` 
		});
		
		const nodeCount = this.step.executedNodes.length;
		stepInfo.createDiv({ 
			text: `${this.i18n.t('graphExecution.willExecute') || '即将执行'} ${nodeCount} ${this.i18n.t('graphExecution.tools') || '个工具'}`,
			cls: 'llmsider-step-modal-count'
		});
		
		// Node list
		const nodeList = contentEl.createDiv({ cls: 'llmsider-step-modal-nodes' });
		
		this.step.executedNodes.forEach((nodeId, index) => {
			const node = this.nodes.get(nodeId);
			if (!node) return;
			
			const nodeItem = nodeList.createDiv({ cls: 'llmsider-step-modal-node-item' });
			
			// Node number
			const match = node.id.match(/tool-(\d+)-/);
			const nodeNumber = match ? match[1] : (index + 1).toString();
			nodeItem.createSpan({ 
				cls: 'llmsider-step-modal-node-number',
				text: nodeNumber
			});
			
			// Tool info
			const nodeInfo = nodeItem.createDiv({ cls: 'llmsider-step-modal-node-info' });
			nodeInfo.createEl('strong', { text: node.toolName });
			
			// Args preview
			if (node.args && Object.keys(node.args).length > 0) {
				const argsPreview = nodeInfo.createDiv({ cls: 'llmsider-step-modal-node-args' });
				const argsText = Object.entries(node.args)
					.map(([key, value]) => {
						const val = typeof value === 'string' && value.length > 40 
							? value.substring(0, 40) + '...' 
							: String(value);
						return `${key}: ${val}`;
					})
					.join(', ');
				argsPreview.setText(argsText);
			}
			
			// Dependencies
			if (node.dependencies && node.dependencies.length > 0) {
				const depsDiv = nodeInfo.createDiv({ cls: 'llmsider-step-modal-node-deps' });
				const depsIcon = depsDiv.createSpan({ cls: 'llmsider-step-modal-deps-icon' });
				setIcon(depsIcon, 'arrow-left');
				depsDiv.appendText((this.i18n.t('graphExecution.dependsOn') || '依赖于') + ' ');
				const depNumbers = node.dependencies
					.map(d => d.replace(/tool-(\d+)-.*/, '$1'))
					.join(', ');
				depsDiv.createSpan({ 
					cls: 'llmsider-step-modal-deps-list',
					text: depNumbers
				});
			}
		});
		
		// Parallel execution notice
		if (this.step.executedNodes.length > 1) {
			const parallelNotice = contentEl.createDiv({ cls: 'llmsider-step-modal-parallel-notice' });
			const noticeIcon = parallelNotice.createSpan({ cls: 'llmsider-step-modal-notice-icon' });
			setIcon(noticeIcon, 'zap');
			parallelNotice.appendText(this.i18n.t('graphExecution.parallelNotice') || '这些工具将并行执行以提高效率');
		}
		
		// Execution time info
		const executedCount = this.step.executedNodes.length;
		const totalNodes = this.nodes.size;
		const completedCount = Array.from(this.nodes.values()).filter(n => 
			n.status === 'success' || n.status === 'failed'
		).length;
		
		const progressInfo = contentEl.createDiv({ cls: 'llmsider-step-modal-progress' });
		progressInfo.setText(
			`${this.i18n.t('graphExecution.progress') || '进度'}: ${completedCount}/${totalNodes} ${this.i18n.t('graphExecution.completed') || '已完成'}`
		);
		
		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'llmsider-step-modal-buttons' });
		
		const confirmBtn = buttonContainer.createEl('button', { 
			cls: 'mod-cta',
			text: this.i18n.t('graphExecution.confirm') || '确认执行'
		});
		confirmBtn.addEventListener('click', () => {
			this.resolveCallback?.(true);
			this.close();
		});
		
		const cancelBtn = buttonContainer.createEl('button', {
			text: this.i18n.t('graphExecution.cancel') || '取消'
		});
		cancelBtn.addEventListener('click', () => {
			this.resolveCallback?.(false);
			this.close();
		});
		
		// Focus confirm button
		setTimeout(() => confirmBtn.focus(), 100);
	}
	
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		
		// If modal closed without button click, cancel
		if (this.resolveCallback) {
			this.resolveCallback(false);
			this.resolveCallback = null;
		}
	}
}
