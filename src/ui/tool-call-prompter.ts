import { App } from 'obsidian';
import LLMSiderPlugin from '../main';

export interface ToolCallData {
	id: string;
	toolName: string;
	parameters: unknown;
	result?: unknown;
	error?: string;
	startTime: number;
	endTime?: number;
	status: 'running' | 'completed' | 'failed';
}

export class ToolCallPrompter {
	private app: App;
	private plugin: LLMSiderPlugin;

	constructor(app: App, plugin: LLMSiderPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	/**
	 * Create a tool call prompter element with collapsible details
	 */
	createToolCallPrompter(container: HTMLElement, toolCall: ToolCallData): HTMLElement {
		const prompterEl = container.createDiv({ cls: 'llmsider-tool-prompter' });
		prompterEl.dataset.toolCallId = toolCall.id;

		// Main header with basic info
		const headerEl = prompterEl.createDiv({ cls: 'tool-prompter-header tool-prompter-clickable' });
		this.updateToolCallHeader(headerEl, toolCall);

		// Collapsible details section (initially collapsed)
		const detailsEl = prompterEl.createDiv({ cls: 'tool-prompter-details collapsed' });
		this.renderToolCallDetails(detailsEl, toolCall);

		// Add click handler for expand/collapse
		headerEl.addEventListener('click', () => {
			this.toggleDetails(headerEl, detailsEl);
		});

		return prompterEl;
	}

	/**
	 * Update existing tool call prompter with new data
	 */
	updateToolCallPrompter(toolCallId: string, toolCall: ToolCallData): boolean {
		const prompterEl = document.querySelector(`[data-tool-call-id="${toolCallId}"]`) as HTMLElement;
		if (!prompterEl) return false;

		// Update header
		const headerEl = prompterEl.querySelector('.tool-prompter-header') as HTMLElement;
		if (headerEl) {
			this.updateToolCallHeader(headerEl, toolCall);
		}

		// Update details
		const detailsEl = prompterEl.querySelector('.tool-prompter-details') as HTMLElement;
		if (detailsEl) {
			detailsEl.empty();
			this.renderToolCallDetails(detailsEl, toolCall);
		}

		return true;
	}

	/**
	 * Update tool call header with status and timing
	 */
	private updateToolCallHeader(headerEl: HTMLElement, toolCall: ToolCallData): void {
		const duration = toolCall.endTime ? toolCall.endTime - toolCall.startTime : Date.now() - toolCall.startTime;
		const durationText = this.formatDuration(duration);
		const i18n = this.plugin.getI18nManager();

		let icon = '🔧';
		let statusText = i18n?.t('toolCallPrompter.statusCalling') || 'Calling';
		let statusClass = 'running';

		switch (toolCall.status) {
			case 'running':
				icon = '⏳';
				statusText = i18n?.t('toolCallPrompter.statusExecuting') || 'Executing';
				statusClass = 'running';
				break;
			case 'completed':
				icon = '✅';
				statusText = i18n?.t('toolCallPrompter.statusCompleted') || 'Completed';
				statusClass = 'completed';
				break;
			case 'failed':
				icon = '❌';
				statusText = i18n?.t('toolCallPrompter.statusFailed') || 'Failed';
				statusClass = 'failed';
				break;
		}

		headerEl.className = `tool-prompter-header tool-prompter-clickable ${statusClass}`;
		headerEl.innerHTML = `
			<span class="tool-prompter-icon">${icon}</span>
			<span class="tool-prompter-name">${toolCall.toolName}</span>
			<span class="tool-prompter-status">${statusText}</span>
			<span class="tool-prompter-duration">${durationText}</span>
			<span class="tool-prompter-toggle">▼</span>
		`;
	}

	/**
	 * Render detailed tool call information
	 */
	private renderToolCallDetails(detailsEl: HTMLElement, toolCall: ToolCallData): void {
		const i18n = this.plugin.getI18nManager();

		// Parameters section (always shown)
		const paramsSection = detailsEl.createDiv({ cls: 'tool-prompter-section' });
		const paramsHeader = paramsSection.createDiv({ cls: 'tool-prompter-subsection-header tool-prompter-subsection-clickable' });
		paramsHeader.innerHTML = `
			<span class="tool-prompter-subsection-title">📤 ${i18n?.t('toolCallPrompter.parametersTitle') || 'Call Parameters'}</span>
			<span class="tool-prompter-subsection-toggle">▼</span>
		`;

		const paramsContent = paramsSection.createDiv({ cls: 'tool-prompter-subsection-content collapsed' });
		paramsContent.createEl('pre', {
			cls: 'tool-prompter-json',
			text: JSON.stringify(toolCall.parameters, null, 2)
		});

		// Add click handler for parameters section
		paramsHeader.addEventListener('click', () => {
			this.toggleSubsection(paramsHeader, paramsContent);
		});

		// Result section (only if completed or failed)
		if (toolCall.status === 'completed' || toolCall.status === 'failed') {
			const resultSection = detailsEl.createDiv({ cls: 'tool-prompter-section' });
			const resultHeader = resultSection.createDiv({ cls: 'tool-prompter-subsection-header tool-prompter-subsection-clickable' });

			if (toolCall.status === 'failed') {
				resultHeader.innerHTML = `
					<span class="tool-prompter-subsection-title">❌ ${i18n?.t('toolCallPrompter.errorTitle') || 'Error Information'}</span>
					<span class="tool-prompter-subsection-toggle">▼</span>
				`;
			} else {
				resultHeader.innerHTML = `
					<span class="tool-prompter-subsection-title">📥 ${i18n?.t('toolCallPrompter.resultsTitle') || 'Execution Results'}</span>
					<span class="tool-prompter-subsection-toggle">▼</span>
				`;
			}

			const resultContent = resultSection.createDiv({ cls: 'tool-prompter-subsection-content collapsed' });

			if (toolCall.error) {
				resultContent.createEl('div', {
					cls: 'tool-prompter-error',
					text: toolCall.error
				});
			} else if (toolCall.result) {
				resultContent.createEl('pre', {
					cls: 'tool-prompter-json',
					text: typeof toolCall.result === 'string'
						? toolCall.result
						: JSON.stringify(toolCall.result, null, 2)
				});
			}

			// Add click handler for result section
			resultHeader.addEventListener('click', () => {
				this.toggleSubsection(resultHeader, resultContent);
			});
		}

		// Execution info section
		const infoSection = detailsEl.createDiv({ cls: 'tool-prompter-info' });
		const startTime = new Date(toolCall.startTime).toLocaleTimeString();
		const endTime = toolCall.endTime ? new Date(toolCall.endTime).toLocaleTimeString() : (i18n?.t('toolCallPrompter.inProgress') || 'In Progress');

		infoSection.innerHTML = `
			<div class="tool-prompter-timing">
				<span>${i18n?.t('toolCallPrompter.startTime') || 'Start'}: ${startTime}</span>
				<span>${i18n?.t('toolCallPrompter.endTime') || 'End'}: ${endTime}</span>
			</div>
		`;
	}

	/**
	 * Toggle main details section
	 */
	private toggleDetails(headerEl: HTMLElement, detailsEl: HTMLElement): void {
		const isCollapsed = detailsEl.classList.contains('collapsed');
		detailsEl.classList.toggle('collapsed', !isCollapsed);

		const toggleIcon = headerEl.querySelector('.tool-prompter-toggle') as HTMLElement;
		if (toggleIcon) {
			toggleIcon.textContent = isCollapsed ? '▲' : '▼';
		}
	}

	/**
	 * Toggle subsection (parameters or results)
	 */
	private toggleSubsection(headerEl: HTMLElement, contentEl: HTMLElement): void {
		const isCollapsed = contentEl.classList.contains('collapsed');
		contentEl.classList.toggle('collapsed', !isCollapsed);

		const toggleIcon = headerEl.querySelector('.tool-prompter-subsection-toggle') as HTMLElement;
		if (toggleIcon) {
			toggleIcon.textContent = isCollapsed ? '▲' : '▼';
		}
	}

	/**
	 * Format duration in milliseconds to human readable format
	 */
	private formatDuration(ms: number): string {
		if (ms < 1000) {
			return `${ms}ms`;
		} else if (ms < 60000) {
			return `${(ms / 1000).toFixed(1)}s`;
		} else {
			const minutes = Math.floor(ms / 60000);
			const seconds = ((ms % 60000) / 1000).toFixed(0);
			return `${minutes}m ${seconds}s`;
		}
	}

	/**
	 * Find existing prompter element by tool call ID
	 */
	findPrompterElement(toolCallId: string): HTMLElement | null {
		return document.querySelector(`[data-tool-call-id="${toolCallId}"]`) as HTMLElement;
	}

	/**
	 * Remove prompter element
	 */
	removePrompter(toolCallId: string): boolean {
		const prompterEl = this.findPrompterElement(toolCallId);
		if (prompterEl) {
			prompterEl.remove();
			return true;
		}
		return false;
	}
}