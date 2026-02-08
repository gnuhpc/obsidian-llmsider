/**
 * Plan DAG Restoration Utilities
 * Helper functions to restore DAG visualization from saved plan messages
 */

import { setIcon } from 'obsidian';
import type { I18nManager } from '../i18n/i18n-manager';
import { getAllBuiltInTools } from '../tools/built-in-tools';

export interface RestoredStep {
	id: string;
	tool: string;
	input: Record<string, unknown>;
	reason?: string;
	status?: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
	dependencies?: string[];
	error?: string;
}

export interface RestoredPlan {
	id: string;
	steps: RestoredStep[];
}

/**
 * Transform sequential plan steps into linear chain
 */
export function transformSequentialToLinear(plan: RestoredPlan): void {
	for (let i = 0; i < plan.steps.length; i++) {
		const step = plan.steps[i];
		if (i === 0) {
			step.dependencies = [];
		} else {
			step.dependencies = [plan.steps[i - 1].id];
		}
	}
}

/**
 * Organize steps into layers based on dependency depth
 */
export function organizeStepsIntoLayers(steps: RestoredStep[]): RestoredStep[][] {
	const layers: RestoredStep[][] = [];
	const stepDepths = new Map<string, number>();
	
	function calculateDepth(step: RestoredStep): number {
		if (stepDepths.has(step.id)) {
			return stepDepths.get(step.id)!;
		}
		
		if (!step.dependencies || step.dependencies.length === 0) {
			stepDepths.set(step.id, 0);
			return 0;
		}
		
		const depSteps = step.dependencies
			.map(depId => steps.find(s => s.id === depId))
			.filter(s => s) as RestoredStep[];
			
		const maxDepDepth = Math.max(...depSteps.map(s => calculateDepth(s)));
		const depth = maxDepDepth + 1;
		stepDepths.set(step.id, depth);
		return depth;
	}
	
	steps.forEach(step => calculateDepth(step));
	
	// Group steps by depth
	steps.forEach(step => {
		const depth = stepDepths.get(step.id)!;
		if (!layers[depth]) {
			layers[depth] = [];
		}
		layers[depth].push(step);
	});
	
	return layers;
}

/**
 * Render restored DAG plan visualization
 */
export function renderRestoredDAGPlan(
	plan: RestoredPlan,
	container: HTMLElement,
	i18n: I18nManager
): void {
	const tools = getAllBuiltInTools({ i18n }) as Record<string, { name: string }>;
	
	// Create header
	const header = container.createDiv({ cls: 'llmsider-dag-header' });
	header.createEl('h3', { text: i18n.t('planExecute.tracker.planTitle') || '执行计划' });
	
	// Create layers container
	const layersContainer = container.createDiv({ cls: 'llmsider-dag-layers' });
	
	// Organize steps into layers
	const layers = organizeStepsIntoLayers(plan.steps);
	
	// Render each layer
	layers.forEach((layerSteps, layerIndex) => {
		const layerEl = layersContainer.createDiv({ cls: 'llmsider-dag-layer' });
		layerEl.setAttribute('data-layer', layerIndex.toString());
		
		// Only show layer label if NOT in sequential mode
		if (!container.hasClass('sequential-mode')) {
			layerEl.setAttribute('data-layer-label', i18n.t('planExecute.tracker.layer') || 'Layer');
		}
		
		layerSteps.forEach(step => {
			const nodeStatus = step.status || 'completed';
			const nodeEl = layerEl.createDiv({ 
				cls: `llmsider-dag-node ${nodeStatus}`,
				attr: { 'data-step-id': step.id }
			});
			
			const stepNumber = step.id.replace(/^step/, '');
			
			// Node header with status icon
			const nodeHeader = nodeEl.createDiv({ cls: 'llmsider-dag-node-header' });
			const statusIcon = nodeHeader.createSpan({ cls: 'llmsider-dag-node-status' });
			
			// Set icon based on status
			const iconName = nodeStatus === 'completed' ? 'check' :
			                 nodeStatus === 'failed' ? 'alert-circle' :
			                 nodeStatus === 'cancelled' ? 'x' : 'clock';
			setIcon(statusIcon, iconName);
			
			nodeHeader.createSpan({ 
				cls: 'llmsider-dag-node-number',
				text: stepNumber
			});
			
			// Resolve localized tool name
			let toolName = step.tool;
			if (step.tool === 'generate_content') {
				toolName = i18n.t('tools.generateContent.name') || '生成内容';
			} else if (tools[step.tool]) {
				toolName = tools[step.tool].name;
			}
			
			nodeHeader.createSpan({ 
				cls: 'llmsider-dag-node-title',
				text: toolName || 'Unknown Tool'
			});
			
			// Node body with reason
			if (step.reason) {
				nodeEl.createDiv({ 
					cls: 'llmsider-dag-node-reason',
					text: step.reason
				});
			}
			
			// Show error if any
			if (step.error) {
				nodeEl.createDiv({
					cls: 'llmsider-dag-node-error',
					text: `❌ ${step.error}`
				});
			}
		});
	});
	
	// Draw connections
	drawDAGConnections(container, plan.steps);
}

/**
 * Draw DAG connections between nodes
 */
function drawDAGConnections(container: HTMLElement, steps: RestoredStep[]): void {
	// Wait for DOM to render
	setTimeout(() => {
		const svg = container.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.addClass('llmsider-dag-connections');
		
		const containerRect = container.getBoundingClientRect();
		svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);
		
		container.appendChild(svg);
		
		// Draw lines for each dependency
		steps.forEach(step => {
			if (!step.dependencies || step.dependencies.length === 0) return;
			
			const toNode = container.querySelector(`[data-step-id="${step.id}"]`) as HTMLElement;
			if (!toNode) return;
			
			step.dependencies.forEach(depId => {
				const fromNode = container.querySelector(`[data-step-id="${depId}"]`) as HTMLElement;
				if (!fromNode) return;
				
				const fromRect = fromNode.getBoundingClientRect();
				const toRect = toNode.getBoundingClientRect();
				const containerRect = container.getBoundingClientRect();
				
				const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
				const y1 = fromRect.bottom - containerRect.top;
				const x2 = toRect.left + toRect.width / 2 - containerRect.left;
				const y2 = toRect.top - containerRect.top;
				
				const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
				line.setAttribute('x1', x1.toString());
				line.setAttribute('y1', y1.toString());
				line.setAttribute('x2', x2.toString());
				line.setAttribute('y2', y2.toString());
				line.addClass('llmsider-dag-connection');
				
				svg.appendChild(line);
			});
		});
	}, 50); // Small delay to ensure DOM is fully rendered
}
