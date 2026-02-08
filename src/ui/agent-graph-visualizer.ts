/**
 * Agent Graph Execution Visualizer for Plan-Execute Mode
 * 
 * Renders dynamic step planning visualization with DAG-style nodes
 * Shows the execution flow as steps are dynamically generated
 */

import { setIcon } from 'obsidian';
import { Logger } from '../utils/logger';
import type { AgentStep } from '../core/agent/mastra-agent';
import type { I18nManager } from '../i18n/i18n-manager';

export class AgentGraphVisualizer {
	private container: HTMLElement;
	private i18n: I18nManager;
	private layersContainer: HTMLElement | null = null;
	private stepBadgeContainer: HTMLElement | null = null;
	private phaseElement: HTMLElement | null = null;
	private currentStepNumber: number = 0;
	private allSteps: AgentStep[] = [];
	private stepElements: Map<string, HTMLElement> = new Map();
	private executionMode: 'sequential' | 'dag' = 'sequential';
	private onRetryStep?: (stepId: string) => void;
	
	constructor(container: HTMLElement, i18n: I18nManager, executionMode: 'sequential' | 'dag' = 'sequential', onRetryStep?: (stepId: string) => void) {
		this.container = container;
		this.i18n = i18n;
		this.executionMode = executionMode;
		this.onRetryStep = onRetryStep;
	}
	
	/**
	 * Initialize the graph visualization container
	 */
	initialize(): void {
		this.container.empty();
		this.container.addClass('llmsider-graph-execution');
		
		// Header
		const header = this.container.createDiv({ cls: 'llmsider-dag-header' });
		header.createEl('h3', { text: '🔄 ' + (this.i18n.t('planExecute.graphExecution.title') || '图执行模式') });
		
		// Phase indicator
		this.phaseElement = header.createDiv({ cls: 'llmsider-graph-phase' });
		this.updatePhase('ready');

		// Current step badge
		this.stepBadgeContainer = header.createDiv({ cls: 'llmsider-graph-step-badge' });
		this.updateStepBadge(0);
		
		// Layers container (reuse DAG styles)
		this.layersContainer = this.container.createDiv({ cls: 'llmsider-dag-layers' });
		
		// Legend
		this.renderLegend();
	}

	/**
	 * Update the current phase of execution
	 */
	updatePhase(phase: string): void {
		if (!this.phaseElement) return;
		
		let text = '';
		let cls = '';
		
		switch (phase) {
			case 'planning':
				text = this.i18n.t('planExecute.generating') || 'Generating plan...';
				cls = 'phase-planning';
				break;
			case 'confirming':
				text = this.i18n.t('planExecute.graphExecution.dynamicStepTitle') || 'Waiting for Confirmation';
				cls = 'phase-confirming';
				break;
			case 'executing':
				text = this.i18n.t('planExecute.executingStep') || 'Executing...';
				cls = 'phase-executing';
				break;
			case 'replanning':
				text = this.i18n.t('planExecute.regenerating') || 'Re-planning...';
				cls = 'phase-replanning';
				break;
			case 'completed':
				text = this.i18n.t('planExecute.allStepsCompleted') || 'Completed';
				cls = 'phase-completed';
				break;
			case 'ready':
				text = 'Ready';
				cls = 'phase-ready';
				break;
			default:
				text = phase;
				cls = 'phase-custom';
		}
		
		this.phaseElement.textContent = text;
		this.phaseElement.className = `llmsider-graph-phase ${cls}`;
	}
	
	/**
	 * Update visualization with all current steps
	 */
	updateVisualization(steps: AgentStep[], currentStepIndex: number): void {
		if (!this.layersContainer) {
			Logger.warn('[AgentGraphVisualizer] Layers container not initialized');
			return;
		}
		
		this.allSteps = steps;
		this.currentStepNumber = currentStepIndex;
		
		Logger.debug('[AgentGraphVisualizer] Updating visualization:', {
			totalSteps: steps.length,
			currentStep: currentStepIndex
		});
		
		// Organize steps into layers based on dependencies
		const layers = this.organizeStepsIntoLayers(steps);
		
		// Clear and re-render
		this.layersContainer.empty();
		this.stepElements.clear();
		
		// Render each layer
		layers.forEach((layerSteps, layerIndex) => {
			const layerEl = this.layersContainer!.createDiv({ cls: 'llmsider-dag-layer' });
			layerEl.setAttribute('data-layer', layerIndex.toString());
			
			// Layer label with numbering (Layer 1, Layer 2, etc.) - show in all modes except sequential
			if (this.executionMode !== 'sequential') {
				const layerNumber = layerIndex + 1;
				layerEl.setAttribute('data-layer-label', `${this.i18n.t('planExecute.tracker.layer') || '层'} ${layerNumber}`);
			}
			
			layerSteps.forEach(step => {
				const nodeEl = this.renderStep(layerEl, step);
				this.stepElements.set(step.id, nodeEl);
			});
		});
		
		// Draw connections
		this.drawConnections(steps);
		
		// Update step badge
		this.updateStepBadge(currentStepIndex);
	}
	
	/**
	 * Highlight the step that is about to start
	 */
	highlightStep(stepNumber: number, step: AgentStep): void {
		this.currentStepNumber = stepNumber;
		this.updateStepBadge(stepNumber);
		
		const stepEl = this.stepElements.get(step.id);
		if (stepEl) {
			stepEl.addClass('llmsider-dag-node-highlight');
			setTimeout(() => {
				stepEl.removeClass('llmsider-dag-node-highlight');
			}, 2000);
		}
	}
	
	/**
	 * Update step status after completion
	 */
	updateStepStatus(stepNumber: number, step: AgentStep): void {
		const stepEl = this.stepElements.get(step.id);
		if (!stepEl) {
			Logger.warn('[AgentGraphVisualizer] Step element not found:', step.id);
			return;
		}
		
		// Update status class
		stepEl.removeClass('pending', 'in-progress', 'executing', 'completed', 'error', 'failed', 'skipped');
		
		let statusClass = 'pending';
		if (step.status === 'completed') statusClass = 'completed';
		else if (step.status === 'failed') statusClass = 'error';
		else if (step.status === 'skipped') statusClass = 'skipped';
		else if (step.status === 'in-progress' || step.status === 'executing') statusClass = 'in-progress';
		
		stepEl.addClass(statusClass);
		
		// Update icon
		const statusIcon = stepEl.querySelector('.llmsider-dag-node-status') as HTMLElement;
		if (statusIcon) {
			this.updateStepIcon(statusIcon, step.status);
		}
		
		// Add result if completed
		if (step.status === 'completed' && step.result) {
			const existingResult = stepEl.querySelector('.llmsider-dag-node-result');
			if (!existingResult) {
				const resultEl = stepEl.createDiv({ cls: 'llmsider-dag-node-result' });
				const resultText = typeof step.result === 'string' && step.result.length > 100
					? step.result.substring(0, 100) + '...'
					: JSON.stringify(step.result).substring(0, 100) + '...';
				resultEl.setText('✅ ' + resultText);
			}
		}
		
		// Add error if failed
		if (step.status === 'failed' && step.error) {
			const existingError = stepEl.querySelector('.llmsider-dag-node-error');
			if (!existingError) {
				const errorEl = stepEl.createDiv({ cls: 'llmsider-dag-node-error' });
				errorEl.setText('❌ ' + step.error);
			}
		}
	}
	
	/**
	 * Render a single step node
	 */
	private renderStep(container: HTMLElement, step: AgentStep): HTMLElement {
		// Determine status class
		let statusClass = 'pending';
		if (step.status === 'completed') statusClass = 'completed';
		else if (step.status === 'failed') statusClass = 'error';
		else if (step.status === 'skipped') statusClass = 'skipped';
		else if (step.status === 'in-progress' || step.status === 'executing') statusClass = 'in-progress';
		
		const nodeEl = container.createDiv({ 
			cls: `llmsider-dag-node ${statusClass}`,
			attr: { 'data-node-id': step.id }
		});
		
		// Node header
		const header = nodeEl.createDiv({ cls: 'llmsider-dag-node-header' });
		
		// Status icon
		const statusIcon = header.createSpan({ cls: 'llmsider-dag-node-status' });
		this.updateStepIcon(statusIcon, step.status);
		
		// Step number (extract from ID like "step1" -> "1")
		const match = step.id.match(/step(\d+)/);
		const stepNumber = match ? match[1] : '?';
		
		header.createSpan({ 
			cls: 'llmsider-dag-node-number',
			text: stepNumber
		});
		
		header.createSpan({ 
			cls: 'llmsider-dag-node-title',
			text: step.tool
		});
		
		// Node body - show reason
		if (step.reason) {
			const reasonEl = nodeEl.createDiv({ cls: 'llmsider-dag-node-reason' });
			reasonEl.setText(step.reason);
		}
		
		// Dependencies
		if (step.dependencies && step.dependencies.length > 0) {
			const depsEl = nodeEl.createDiv({ cls: 'llmsider-dag-node-dependencies' });
			depsEl.createSpan({ text: (this.i18n.t('planExecute.tracker.dependsOn') || '依赖于') + ' ' });
			depsEl.createSpan({ 
				cls: 'llmsider-dag-deps-list',
				text: step.dependencies.map(d => d.replace(/step(\d+)/, '$1')).join(', ')
			});
		}
		
		// Result (if completed)
		if (step.status === 'completed' && step.result) {
			const resultEl = nodeEl.createDiv({ cls: 'llmsider-dag-node-result' });
			const resultText = typeof step.result === 'string' && step.result.length > 100
				? step.result.substring(0, 100) + '...'
				: JSON.stringify(step.result).substring(0, 100) + '...';
			resultEl.setText('✅ ' + resultText);
		}
		
		// Error (if failed)
		if (step.status === 'failed' && step.error) {
			const errorEl = nodeEl.createDiv({ cls: 'llmsider-dag-node-error' });
			errorEl.setText('❌ ' + step.error);
			
			// Add retry button
			if (this.onRetryStep) {
				const retryBtn = errorEl.createEl('button', { 
					cls: 'llmsider-dag-retry-btn',
					text: this.i18n.t('common.retry') || 'Retry'
				});
				setIcon(retryBtn, 'refresh-cw');
				retryBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.onRetryStep!(step.id);
				});
			}
		}
		
		return nodeEl;
	}
	
	/**
	 * Update step icon based on status
	 */
	private updateStepIcon(iconEl: HTMLElement, status: string | undefined): void {
		iconEl.empty();
		iconEl.removeClass('spinning');
		
		switch (status) {
			case 'completed':
				setIcon(iconEl, 'check-circle');
				break;
			case 'failed':
			case 'error':
				setIcon(iconEl, 'x-circle');
				break;
			case 'in-progress':
			case 'executing':
				setIcon(iconEl, 'loader-2');
				iconEl.addClass('spinning');
				break;
			case 'skipped':
				setIcon(iconEl, 'skip-forward');
				break;
			default:
				setIcon(iconEl, 'clock');
		}
	}
	
	/**
	 * Update step badge
	 */
	private updateStepBadge(stepNumber: number): void {
		if (!this.stepBadgeContainer) return;
		
		this.stepBadgeContainer.empty();
		this.stepBadgeContainer.createSpan({ 
			cls: 'llmsider-graph-step-number',
			text: `${this.i18n.t('planExecute.graphExecution.step') || '步骤'} ${stepNumber}`
		});
	}
	
	/**
	 * Organize steps into layers based on dependency depth
	 */
	private organizeStepsIntoLayers(steps: AgentStep[]): AgentStep[][] {
		const layers: AgentStep[][] = [];
		const stepDepths = new Map<string, number>();
		
		const calculateDepth = (step: AgentStep): number => {
			if (stepDepths.has(step.id)) {
				return stepDepths.get(step.id)!;
			}
			
			if (!step.dependencies || step.dependencies.length === 0) {
				stepDepths.set(step.id, 0);
				return 0;
			}
			
			const depSteps = steps.filter(s => step.dependencies!.includes(s.id));
			const depDepths = depSteps.map(s => calculateDepth(s));
			const depth = Math.max(...depDepths, 0) + 1;
			stepDepths.set(step.id, depth);
			return depth;
		};
		
		// Calculate depths
		steps.forEach(step => calculateDepth(step));
		
		// Group into layers
		const maxDepth = Math.max(...Array.from(stepDepths.values()), 0);
		for (let i = 0; i <= maxDepth; i++) {
			layers[i] = [];
		}
		
		steps.forEach(step => {
			const depth = stepDepths.get(step.id) || 0;
			layers[depth].push(step);
		});
		
		return layers.filter(layer => layer.length > 0);
	}
	
	/**
	 * Draw connection lines between steps
	 */
	private drawConnections(steps: AgentStep[]): void {
		if (!this.layersContainer) return;
		
		// Remove existing SVG
		const existingSvg = this.layersContainer.querySelector('.llmsider-dag-connections');
		if (existingSvg) {
			existingSvg.remove();
		}
		
		// Check if there are any dependencies
		const stepsWithDeps = steps.filter(s => s.dependencies && s.dependencies.length > 0);
		
		if (stepsWithDeps.length === 0) {
			return; // No dependencies, no lines needed
		}
		
		// Create SVG
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.classList.add('llmsider-dag-connections');
		svg.style.position = 'absolute';
		svg.style.top = '0';
		svg.style.left = '0';
		svg.style.width = '100%';
		svg.style.height = '100%';
		svg.style.pointerEvents = 'none';
		svg.style.zIndex = '0';
		this.layersContainer.style.position = 'relative';
		this.layersContainer.insertBefore(svg, this.layersContainer.firstChild);
		
		const containerRect = this.layersContainer.getBoundingClientRect();
		svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);
		
		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
		svg.appendChild(defs);
		
		// Draw lines
		steps.forEach(step => {
			if (!step.dependencies || step.dependencies.length === 0) return;
			
			const targetEl = this.stepElements.get(step.id);
			if (!targetEl) return;
			
			const targetRect = targetEl.getBoundingClientRect();
			
			step.dependencies.forEach(depId => {
				const sourceEl = this.stepElements.get(depId);
				if (!sourceEl) return;
				
				const sourceRect = sourceEl.getBoundingClientRect();
				
				const x1 = sourceRect.left + sourceRect.width / 2 - containerRect.left;
				const y1 = sourceRect.bottom - containerRect.top;
				const x2 = targetRect.left + targetRect.width / 2 - containerRect.left;
				const y2 = targetRect.top - containerRect.top;
				
				// Curved path
				const controlY1 = y1 + (y2 - y1) * 0.5;
				const controlY2 = y1 + (y2 - y1) * 0.5;
				const d = `M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${y2}`;
				
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', d);
				path.setAttribute('stroke', 'var(--text-muted)');
				path.setAttribute('stroke-width', '2');
				path.setAttribute('fill', 'none');
				path.setAttribute('opacity', '0.6');
				
				// Arrow marker
				const markerId = `arrow-${depId}-${step.id}`;
				const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
				marker.setAttribute('id', markerId);
				marker.setAttribute('markerWidth', '10');
				marker.setAttribute('markerHeight', '10');
				marker.setAttribute('refX', '9');
				marker.setAttribute('refY', '3');
				marker.setAttribute('orient', 'auto');
				
				const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
				arrowPath.setAttribute('fill', 'var(--text-muted)');
				marker.appendChild(arrowPath);
				defs.appendChild(marker);
				
				path.setAttribute('marker-end', `url(#${markerId})`);
				svg.appendChild(path);
			});
		});
	}
	
	/**
	 * Render legend
	 */
	private renderLegend(): void {
		const legend = this.container.createDiv({ cls: 'llmsider-dag-legend' });
		const items = [
			{ status: 'pending', label: this.i18n.t('planExecute.tracker.statusPending') || '待执行' },
			{ status: 'in-progress', label: this.i18n.t('planExecute.tracker.statusInProgress') || '执行中' },
			{ status: 'completed', label: this.i18n.t('planExecute.tracker.statusCompleted') || '已完成' },
			{ status: 'error', label: this.i18n.t('planExecute.tracker.statusError') || '错误' },
			{ status: 'skipped', label: this.i18n.t('planExecute.tracker.statusSkipped') || '已跳过' }
		];
		
		items.forEach(item => {
			const legendItem = legend.createSpan({ cls: 'llmsider-dag-legend-item' });
			legendItem.createSpan({ cls: `llmsider-dag-legend-dot ${item.status}` });
			legendItem.createSpan({ text: item.label });
		});
	}
}
