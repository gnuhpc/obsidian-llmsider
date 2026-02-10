/**
 * Plan-Execute Tracker Component - Refactored Version
 * Based on newcode design with improved layout and interactions
 */

import { setIcon } from 'obsidian';
import { Logger } from '../utils/logger';
import type { I18nManager } from '../i18n/i18n-manager';
import { TOOL_I18N_KEY_MAP } from '../tools/built-in-tools';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'error' | 'skipped';

export interface ToolCall {
	id: string;
	toolName: string;
	toolType: 'mcp' | 'builtin' | 'api';
	reason?: string;
	parameters: Record<string, unknown>;
	response?: Record<string, unknown> | string;
	error?: string;
	timestamp?: string;
	startTime?: string;
	duration?: number;
}

export interface Task {
	id: string;
	title: string;
	description?: string;
	status: TaskStatus;
	timestamp?: string;
	result?: string;
	error?: string;
	toolCalls?: ToolCall[];
	// New fields for enhanced display
	toolName?: string;
	toolType?: 'mcp' | 'builtin' | 'api';
	reason?: string;
}

export interface PlanExecuteTrackerProps {
	tasks: Task[];
	isExecuting?: boolean;
	onRetry?: () => void;
	onTaskRetry?: (taskId: string) => void;
	onTaskRegenerateAndRetry?: (taskId: string) => void;
	onTaskSkip?: (taskId: string) => void;
	expandable?: boolean;
	i18n: I18nManager;
}

interface StatusConfig {
	icon: string;
	color: string;
	bg: string;
	border: string;
	badge: string;
	labelKey: string;
}

const statusConfig: Record<TaskStatus, StatusConfig> = {
	pending: {
		icon: 'clock',
		color: 'llmsider-status-pending',
		bg: 'llmsider-task-bg-pending',
		border: 'llmsider-task-border-pending',
		badge: 'llmsider-badge-pending',
		labelKey: 'planExecute.tracker.statusPending'
	},
	'in-progress': {
		icon: 'clock',
		color: 'llmsider-status-progress llmsider-spinning',
		bg: 'llmsider-task-bg-progress',
		border: 'llmsider-task-border-progress',
		badge: 'llmsider-badge-progress',
		labelKey: 'planExecute.tracker.statusInProgress'
	},
	completed: {
		icon: 'check',
		color: 'llmsider-status-completed',
		bg: 'llmsider-task-bg-completed',
		border: 'llmsider-task-border-completed',
		badge: 'llmsider-badge-completed',
		labelKey: 'planExecute.tracker.statusCompleted'
	},
	skipped: {
		icon: 'skip-forward',
		color: 'llmsider-status-skipped',
		bg: 'llmsider-task-bg-skipped',
		border: 'llmsider-task-border-skipped',
		badge: 'llmsider-badge-skipped',
		labelKey: 'planExecute.tracker.statusSkipped'
	},
	error: {
		icon: 'alert-circle',
		color: 'llmsider-status-error',
		bg: 'llmsider-task-bg-error',
		border: 'llmsider-task-border-error',
		badge: 'llmsider-badge-error',
		labelKey: 'planExecute.tracker.statusError'
	}
};

export class PlanExecuteTracker {
	private containerEl: HTMLElement;
	private props: PlanExecuteTrackerProps;
	private expandedTasks: Set<string> = new Set(); // Track which tasks are expanded (details view)
	private copiedButtons: Set<HTMLElement> = new Set(); // Track copied buttons for visual feedback
	private isPlanExpanded: boolean = true;
	private i18n: I18nManager;

	constructor(container: HTMLElement, props: PlanExecuteTrackerProps) {
		this.props = props;
		this.containerEl = container;
		this.i18n = props.i18n;
		// Initialize all tasks as collapsed by default
		this.expandedTasks = new Set();
		this.render();
	}	public update(newProps: PlanExecuteTrackerProps): void {
		// Find the currently active (in-progress) task
		const previousInProgressTask = this.props.tasks.find(t => t.status === 'in-progress');
		const newInProgressTask = newProps.tasks.find(t => t.status === 'in-progress');
		
		this.props = newProps;
		this.i18n = newProps.i18n;
		// Preserve expanded state, new tasks default to collapsed
		// (No need to add new tasks to expandedTasks set)
		this.render();
		
		// Scroll to new in-progress task if it changed
		if (newInProgressTask && newInProgressTask.id !== previousInProgressTask?.id) {
			this.scrollToTask(newInProgressTask.id);
		}
	}
	
	private scrollToTask(taskId: string): void {
		// Wait for render to complete
		setTimeout(() => {
			const taskElements = this.containerEl.querySelectorAll('.llmsider-task-item');
			const taskIndex = this.props.tasks.findIndex(t => t.id === taskId);
			
			if (taskIndex >= 0 && taskIndex < taskElements.length) {
				const taskElement = taskElements[taskIndex] as HTMLElement;
				let scrollContainer = this.containerEl.querySelector('.llmsider-tasks-list');
				if (!scrollContainer) {
					scrollContainer = this.containerEl.querySelector('.llmsider-plan-tasks');
				}
				
				if (scrollContainer && taskElement) {
					// Smooth scroll to task
					taskElement.scrollIntoView({
						behavior: 'smooth',
						block: 'nearest',
						inline: 'nearest'
					});
				}
			}
		}, 50);
	}

	private render(): void {
		this.containerEl.empty();
		
		// Create the plan card inside the container
		const planCard = this.containerEl.createDiv({ cls: 'llmsider-plan-card' });

		// Header with progress
		this.renderHeader(planCard);

		// Tasks list (only if expanded)
		if (this.isPlanExpanded) {
			this.renderTasksList(planCard);
		}

		// Footer: show when executing OR has errors
		const { tasks } = this.props;
		const isExecuting = tasks.some(t => t.status === 'in-progress');
		const hasErrors = tasks.some(t => t.status === 'error');
		if (isExecuting || hasErrors) {
			this.renderFooter(planCard, isExecuting, hasErrors);
		}
	}

	private renderHeader(container: HTMLElement): void {
		const { tasks } = this.props;
		const completedCount = tasks.filter(t => t.status === 'completed').length;
		const totalCount = tasks.length;
		const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
		const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
		const errorCount = tasks.filter(t => t.status === 'error').length;

		const header = container.createDiv({ cls: 'llmsider-plan-header' });
		
		const headerBtn = header.createEl('button', { cls: 'llmsider-plan-header-btn' });
		headerBtn.addEventListener('click', () => {
			this.isPlanExpanded = !this.isPlanExpanded;
			this.render();
		});

		const headerContent = headerBtn.createDiv({ cls: 'llmsider-plan-header-content' });

		// All content in one row
		// 1. Plan title with history indicator
		const titleContainer = headerContent.createDiv({ cls: 'llmsider-plan-title-container' });
		titleContainer.createEl('span', { 
			cls: 'llmsider-plan-title',
			text: this.i18n.t('planExecute.tracker.planTitle')
		});
		
		// Show history badge for non-executing plans
		if (!this.props.isExecuting) {
			titleContainer.createEl('span', {
				cls: 'llmsider-plan-history-badge',
				text: this.i18n.t('planExecute.tracker.historyBadge')
			});
		}

		// Only show progress bar and status indicators for executing plans
		if (this.props.isExecuting) {
			// 2. Progress bar
			const progressBar = headerContent.createDiv({ cls: 'llmsider-progress-bar' });
			progressBar.createDiv({ 
				cls: 'llmsider-progress-fill',
				attr: { style: `width: ${progressPercentage}%` }
			});
			
			// 3. Progress text
			headerContent.createEl('span', {
				cls: 'llmsider-progress-text',
				text: `${completedCount}/${totalCount}`
			});

			// 4. Status indicators (success/failed)
			const statusContainer = headerContent.createDiv({ cls: 'llmsider-plan-status-container' });
			
			// Always show completed count
			const completedEl = statusContainer.createEl('span', { 
				cls: 'llmsider-status-item llmsider-status-completed'
			});
			const completedIcon = completedEl.createSpan({ cls: 'llmsider-status-icon' });
			setIcon(completedIcon, 'check');
			completedEl.createEl('span', { text: `${completedCount} ${this.i18n.t('planExecute.taskStatus.completed')}` });
			
			// Always show failed count
			const failedEl = statusContainer.createEl('span', { 
				cls: 'llmsider-status-item llmsider-status-error'
			});
			const failedIcon = failedEl.createSpan({ cls: 'llmsider-status-icon' });
			setIcon(failedIcon, 'alert-circle');
			failedEl.createEl('span', { text: `${errorCount} ${this.i18n.t('planExecute.taskStatus.failed')}` });
		}

		// 5. Expand/collapse icon (rightmost)
		const expandIcon = headerContent.createDiv({ cls: 'llmsider-plan-expand-icon' });
		setIcon(expandIcon, this.isPlanExpanded ? 'chevron-up' : 'chevron-down');
	}

	private renderTasksList(container: HTMLElement): void {
		const tasksList = container.createDiv({ cls: 'llmsider-tasks-list' });

		this.props.tasks.forEach((task, index) => {
			this.renderTask(tasksList, task, index);
		});
	}

	private renderTask(container: HTMLElement, task: Task, index: number): void {
		const config = statusConfig[task.status];
		const hasToolCalls = task.toolCalls && task.toolCalls.length > 0;
		const isTaskExpanded = this.expandedTasks.has(task.id);
		const isError = task.status === 'error';
		const isHistorical = !this.props.isExecuting; // Historical plans don't show interactive elements
		
		// Get tool info from first tool call or task properties
		const mainToolCall = hasToolCalls ? task.toolCalls![0] : null;
		const toolName = mainToolCall?.toolName || task.toolName;
		const toolType = mainToolCall?.toolType || task.toolType;
		const reason = mainToolCall?.reason || task.reason;

		const taskItem = container.createDiv({ 
			cls: `llmsider-task-item ${config.border} ${config.bg}`
		});
		const taskContent = taskItem.createDiv({ cls: 'llmsider-task-content' });

		// Main content button (clickable to expand/collapse) - only for executing plans
		// For historical plans, use a non-interactive div
		const taskBtn = isHistorical 
			? taskContent.createDiv({ cls: 'llmsider-task-btn llmsider-task-static' })
			: taskContent.createEl('button', { cls: 'llmsider-task-btn' });
		
		// Only add click handler for executing plans
		if (!isHistorical) {
			taskBtn.addEventListener('click', (e) => {
			// Only handle clicks that aren't from child buttons
			const target = e.target as HTMLElement;
			if (target.closest('.llmsider-icon-btn') || target.closest('.llmsider-expand-btn')) {
				return;
			}
			
			// Save scroll position relative to this task item
			const scrollContainer = this.containerEl.parentElement;
			if (!scrollContainer) return;
			
			const taskItemRect = taskItem.getBoundingClientRect();
			const containerRect = scrollContainer.getBoundingClientRect();
			const relativeTop = taskItemRect.top - containerRect.top;
			
			// Toggle expansion state
			if (this.expandedTasks.has(task.id)) {
				this.expandedTasks.delete(task.id);
			} else {
				this.expandedTasks.add(task.id);
			}
			
			// Find the details section in the current task item
			const detailsSection = taskItem.querySelector('.llmsider-task-details') as HTMLElement;
			if (!detailsSection) return;
			
			// Toggle visibility with smooth transition
			const isExpanded = this.expandedTasks.has(task.id);
			
			if (isExpanded) {
				// Expand with animation
				detailsSection.style.display = 'block';
				detailsSection.style.maxHeight = '0';
				detailsSection.style.opacity = '0';
				detailsSection.style.overflow = 'hidden';
				detailsSection.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
				
				// Get full height
				const fullHeight = detailsSection.scrollHeight;
				
				// Trigger reflow
				void detailsSection.offsetHeight;
				
				// Expand with animation
				requestAnimationFrame(() => {
					detailsSection.style.maxHeight = fullHeight + 'px';
					detailsSection.style.opacity = '1';
					
					// Restore scroll position to keep task item at same relative position
					const newTaskItemRect = taskItem.getBoundingClientRect();
					const newRelativeTop = newTaskItemRect.top - containerRect.top;
					const scrollDiff = newRelativeTop - relativeTop;
					scrollContainer.scrollTop += scrollDiff;
					
					// After animation, remove max-height for dynamic content
					setTimeout(() => {
						if (this.expandedTasks.has(task.id)) {
							detailsSection.style.maxHeight = 'none';
							detailsSection.style.overflow = 'visible';
						}
					}, 300);
				});
			} else {
				// Collapse with animation
				const fullHeight = detailsSection.scrollHeight;
				detailsSection.style.maxHeight = fullHeight + 'px';
				detailsSection.style.overflow = 'hidden';
				detailsSection.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
				
				// Trigger reflow
				void detailsSection.offsetHeight;
				
				// Collapse with animation
				requestAnimationFrame(() => {
					detailsSection.style.maxHeight = '0';
					detailsSection.style.opacity = '0';
					
					// Hide after animation
					setTimeout(() => {
						if (!this.expandedTasks.has(task.id)) {
							detailsSection.style.display = 'none';
						}
					}, 300);
				});
			}
			
			// Update expand button icon if it exists
			const expandBtn = taskItem.querySelector('.llmsider-expand-btn') as HTMLElement;
			if (expandBtn) {
				const expandIcon = expandBtn.querySelector('.svg-icon');
				if (expandIcon) {
					expandIcon.empty();
					setIcon(expandIcon as HTMLElement, isExpanded ? 'chevron-up' : 'chevron-down');
				}
			}
			});
		}

		// Left side: Step number + icon (vertical layout)
		const leftSide = taskBtn.createDiv({ cls: 'llmsider-task-left' });
		
		leftSide.createEl('span', {
			cls: 'llmsider-step-label',
			text: this.i18n.t('planExecute.tracker.stepLabel', { index: (index + 1).toString() })
		});

		// ALWAYS show status icon (removed isHistorical check)
		const iconWrapper = leftSide.createDiv({ cls: 'llmsider-task-icon-wrapper' });
		const iconEl = iconWrapper.createDiv({ cls: `llmsider-task-icon ${config.color}` });
		setIcon(iconEl, config.icon);

		// Middle: Content area (multiple lines)
		const middleSide = taskBtn.createDiv({ cls: 'llmsider-task-middle' });
		
		// First line: toolName + badge + action buttons
		const toolNameRow = middleSide.createDiv({ cls: 'llmsider-tool-name-row' });
		
		const toolNameLeft = toolNameRow.createDiv({ cls: 'llmsider-tool-name-left' });
		if (toolName) {
			// Try to get localized tool name
			const localizedToolName = this.getLocalizedToolName(toolName);
			toolNameLeft.createEl('span', {
				cls: 'llmsider-tool-name',
				text: localizedToolName
			});
		}
		if (toolType) {
			toolNameLeft.createEl('span', {
				cls: 'llmsider-tool-type-badge',
				text: toolType
			});
		}

		// Action buttons in the same row as tool name
		const toolNameRight = toolNameRow.createDiv({ cls: 'llmsider-tool-name-right' });

		// Second line: reason
		if (reason) {
			middleSide.createEl('p', {
				cls: 'llmsider-tool-reason',
				text: reason
			});
		}

		// Third line: result (only show for completed tasks, not errors)
		if (task.status === 'completed' && task.result) {
			middleSide.createEl('p', {
				cls: 'llmsider-task-result-text',
				text: task.result
			});
		}
		
		// Fourth line: error message (only show for error tasks)
		if (task.status === 'error' && task.error) {
			middleSide.createEl('p', {
				cls: 'llmsider-task-error-text',
				text: task.error
			});
		}

		// Move all button functionality to toolNameRight
		const rightTop = toolNameRight; // Use toolNameRight for buttons
		
		// Right side for time info (keep it for time display)
		const rightSide = taskContent.createDiv({ cls: 'llmsider-task-right' });
		
		// Error action buttons (icon buttons) - only show when error
		Logger.debug(`Checking error buttons - isError: ${isError}`);
		Logger.debug(`onTaskRetry exists: ${!!this.props.onTaskRetry}`);
		Logger.debug(`onTaskSkip exists: ${!!this.props.onTaskSkip}`);
		Logger.debug(`onTaskRegenerateAndRetry exists: ${!!this.props.onTaskRegenerateAndRetry}`);
		
		if (isError) {
			const errorActions = rightTop.createDiv({ cls: 'llmsider-task-error-icons' });
			Logger.debug(`Error actions container created: ${errorActions.className}`);
			
			if (this.props.onTaskRetry) {
				Logger.debug(`Creating Retry button...`);
				const retryBtn = errorActions.createEl('button', {
					cls: 'llmsider-icon-btn llmsider-retry-btn',
					attr: { title: this.i18n.t('planExecute.tracker.retryTooltip') }
				});
				Logger.debug(`Retry button classes: ${retryBtn.className}`);
				// Custom SVG for retry - single circular arrow
				retryBtn.innerHTML = `
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 2v6h-6"></path>
						<path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
						<path d="M3 12a9 9 0 0 0 15 6.7"></path>
					</svg>
				`;
				retryBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.props.onTaskRetry?.(task.id);
				});
			}

			if (this.props.onTaskSkip) {
				Logger.debug(`Creating Skip button...`);
				const skipBtn = errorActions.createEl('button', {
					cls: 'llmsider-icon-btn llmsider-skip-btn',
					attr: { title: this.i18n.t('planExecute.tracker.skipTooltip') }
				});
				Logger.debug(`Skip button classes: ${skipBtn.className}`);
				const skipIcon = skipBtn.createSpan();
				setIcon(skipIcon, 'skip-forward');
				skipBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.props.onTaskSkip?.(task.id);
				});
			}

			if (this.props.onTaskRegenerateAndRetry) {
				Logger.debug(`Creating Regenerate button...`);
				const regenerateBtn = errorActions.createEl('button', {
					cls: 'llmsider-icon-btn llmsider-regenerate-btn',
					attr: { title: this.i18n.t('planExecute.tracker.regenerateRetryTooltip') }
				});
				Logger.debug(`Regenerate button classes: ${regenerateBtn.className}`);
				// Custom SVG for AI-powered regenerate - sparkles + refresh arrows
				regenerateBtn.innerHTML = `
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<!-- Sparkle/AI symbol -->
						<path d="M12 2L13 8L12 9L11 8Z"></path>
						<path d="M12 15L13 21L12 22L11 21Z"></path>
						<path d="M2 12L8 13L9 12L8 11Z"></path>
						<path d="M15 12L21 13L22 12L21 11Z"></path>
						<!-- Circular refresh arrows around sparkle -->
						<path d="M17 7C15.5 5.5 13.5 4.8 11.5 5C9.5 5.2 7.8 6.3 6.8 8"></path>
						<path d="M7 17C8.5 18.5 10.5 19.2 12.5 19C14.5 18.8 16.2 17.7 17.2 16"></path>
						<polyline points="5 8 7 8 7 6"></polyline>
						<polyline points="19 16 17 16 17 18"></polyline>
					</svg>
				`;
				regenerateBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.props.onTaskRegenerateAndRetry?.(task.id);
				});
			}
			
			Logger.debug(`Total error buttons created in errorActions: ${errorActions.children.length}`);
		} else {
			Logger.debug(`❌ NOT rendering error buttons (isError is false)`);
		}

		// Expand/collapse button - only show for executing plans
		if (!isHistorical) {
			const expandBtn = rightTop.createEl('button', {
				cls: 'llmsider-expand-btn'
			});
			const expandIcon = expandBtn.createSpan();
			setIcon(expandIcon, isTaskExpanded ? 'chevron-up' : 'chevron-down');
			expandBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault();
			
			// Find the details section in the current task item
			const taskItemEl = expandBtn.closest('.llmsider-task-item') as HTMLElement;
			if (!taskItemEl) return;
			
			// Save scroll position relative to this task item
			const scrollContainer = this.containerEl.parentElement;
			if (!scrollContainer) return;
			
			const taskItemRect = taskItemEl.getBoundingClientRect();
			const containerRect = scrollContainer.getBoundingClientRect();
			const relativeTop = taskItemRect.top - containerRect.top;
			
			// Toggle expansion state
			if (this.expandedTasks.has(task.id)) {
				this.expandedTasks.delete(task.id);
			} else {
				this.expandedTasks.add(task.id);
			}
			
			const detailsSection = taskItemEl.querySelector('.llmsider-task-details') as HTMLElement;
			if (!detailsSection) return;
			
			// Toggle visibility with smooth transition
			const isExpanded = this.expandedTasks.has(task.id);
			
			if (isExpanded) {
				// Expanding
				detailsSection.style.display = 'block';
				detailsSection.style.maxHeight = '0';
				detailsSection.style.opacity = '0';
				detailsSection.style.overflow = 'hidden';
				detailsSection.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
				
				// Trigger reflow
				void detailsSection.offsetHeight;
				
				// Expand with animation
				requestAnimationFrame(() => {
					detailsSection.style.maxHeight = detailsSection.scrollHeight + 'px';
					detailsSection.style.opacity = '1';
					
					// Restore scroll position to keep task item at same relative position
					const newTaskItemRect = taskItemEl.getBoundingClientRect();
					const newRelativeTop = newTaskItemRect.top - containerRect.top;
					const scrollDiff = newRelativeTop - relativeTop;
					scrollContainer.scrollTop += scrollDiff;
					
					// After animation, remove max-height for dynamic content
					setTimeout(() => {
						if (this.expandedTasks.has(task.id)) {
							detailsSection.style.maxHeight = 'none';
							detailsSection.style.overflow = 'visible';
						}
					}, 300);
				});
			} else {
				// Collapsing
				detailsSection.style.maxHeight = detailsSection.scrollHeight + 'px';
				detailsSection.style.overflow = 'hidden';
				detailsSection.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
				
				// Trigger reflow
				void detailsSection.offsetHeight;
				
				// Collapse with animation
				requestAnimationFrame(() => {
					detailsSection.style.maxHeight = '0';
					detailsSection.style.opacity = '0';
					
					// Hide after animation
					setTimeout(() => {
						if (!this.expandedTasks.has(task.id)) {
							detailsSection.style.display = 'none';
						}
					}, 300);
				});
			}
			
			// Update icon
			expandIcon.empty();
			setIcon(expandIcon, isExpanded ? 'chevron-up' : 'chevron-down');
			});
		}

		// Timestamp/duration info
		if (mainToolCall?.startTime || mainToolCall?.duration) {
			const timeInfo = rightSide.createDiv({ cls: 'llmsider-time-info' });
			if (mainToolCall.startTime) {
				timeInfo.createEl('span', {
					cls: 'llmsider-time-text',
					text: mainToolCall.startTime
				});
			}
			if (mainToolCall.startTime && mainToolCall.duration) {
				timeInfo.createEl('span', { text: '•' });
			}
			if (mainToolCall.duration) {
				timeInfo.createEl('span', {
					cls: 'llmsider-time-text',
					text: `Duration: ${mainToolCall.duration}ms`
				});
			}
		}

		// Only create details section for executing plans
		if (!isHistorical) {
			const detailsContainer = taskItem.createDiv({ 
				cls: 'llmsider-task-details',
			});
			
			// Set initial state based on expansion
			if (!isTaskExpanded) {
				detailsContainer.style.display = 'none';
				detailsContainer.style.maxHeight = '0';
				detailsContainer.style.opacity = '0';
			}
			
			this.renderTaskDetails(detailsContainer, task);
		}
	}

	private renderTaskDetails(container: HTMLElement, task: Task): void {
		const detailsSection = container.createDiv({ cls: 'llmsider-task-details-section' });

		// If no tool calls and pending, show waiting message
		if (!task.toolCalls || task.toolCalls.length === 0) {
			if (task.status === 'pending') {
				detailsSection.createEl('p', {
					cls: 'llmsider-pending-text',
					text: this.i18n.t('planExecute.tracker.statusPending')
				});
			}
			return;
		}

		// Render all tool calls
		task.toolCalls.forEach((toolCall, index) => {
			this.renderToolCallDetails(detailsSection, toolCall, index, task.toolCalls!.length);
		});
	}

	private renderToolCallDetails(
		container: HTMLElement, 
		toolCall: ToolCall, 
		index: number, 
		totalCount: number
	): void {
		const toolDetails = container.createDiv({ cls: 'llmsider-tool-details' });

		// If multiple tools, show index
		if (totalCount > 1) {
			toolDetails.createEl('p', {
				cls: 'llmsider-tool-index',
				text: this.i18n.t('planExecute.tracker.toolIndex', { index: (index + 1).toString() })
			});
		}

		// Request section
		const requestSection = toolDetails.createDiv({ cls: 'llmsider-tool-section' });
		const requestHeader = requestSection.createDiv({ cls: 'llmsider-tool-section-header' });
		requestHeader.createEl('span', {
			cls: 'llmsider-tool-section-title',
			text: this.i18n.t('planExecute.tracker.request')
		});
		
		// Copy button
		const copyRequestBtn = requestHeader.createEl('button', {
			cls: 'llmsider-copy-btn',
			attr: { title: this.i18n.t('planExecute.tracker.copyRequest') }
		});
		const copyRequestIcon = copyRequestBtn.createSpan();
		setIcon(copyRequestIcon, 'copy');
		copyRequestBtn.addEventListener('click', () => {
			navigator.clipboard.writeText(JSON.stringify(toolCall.parameters, null, 2));
			this.showCopiedFeedback(copyRequestBtn);
		});

		const requestPre = requestSection.createEl('pre', {
			cls: 'llmsider-tool-code'
		});
		requestPre.createEl('code', {
			text: JSON.stringify(toolCall.parameters, null, 2)
		});

		// Error section (if exists) - shown after Request
		if (toolCall.error) {
			const errorSection = toolDetails.createDiv({ cls: 'llmsider-tool-section' });
			const errorHeader = errorSection.createDiv({ cls: 'llmsider-tool-section-header' });
			errorHeader.createEl('span', {
				cls: 'llmsider-tool-section-title',
				text: this.i18n.t('planExecute.tracker.error')
			});
			
			// Copy button
			const copyErrorBtn = errorHeader.createEl('button', {
				cls: 'llmsider-copy-btn',
				attr: { title: this.i18n.t('planExecute.tracker.copyError') }
			});
			const copyErrorIcon = copyErrorBtn.createSpan();
			setIcon(copyErrorIcon, 'copy');
			copyErrorBtn.addEventListener('click', () => {
				navigator.clipboard.writeText(toolCall.error!);
				this.showCopiedFeedback(copyErrorBtn);
			});

			const errorPre = errorSection.createEl('pre', {
				cls: 'llmsider-tool-code llmsider-tool-error'
			});
			errorPre.createEl('code', {
				text: toolCall.error
			});
		}

		// Response section (if exists)
		if (toolCall.response) {
			const responseSection = toolDetails.createDiv({ cls: 'llmsider-tool-section' });
			const responseHeader = responseSection.createDiv({ cls: 'llmsider-tool-section-header' });
			responseHeader.createEl('span', {
				cls: 'llmsider-tool-section-title',
				text: this.i18n.t('planExecute.tracker.response')
			});
			
			// Copy button
			const copyResponseBtn = responseHeader.createEl('button', {
				cls: 'llmsider-copy-btn',
				attr: { title: this.i18n.t('planExecute.tracker.copyResponse') }
			});
			const copyResponseIcon = copyResponseBtn.createSpan();
			setIcon(copyResponseIcon, 'copy');
			copyResponseBtn.addEventListener('click', () => {
				const text = typeof toolCall.response === 'string'
					? toolCall.response
					: JSON.stringify(toolCall.response, null, 2);
				navigator.clipboard.writeText(text);
				this.showCopiedFeedback(copyResponseBtn);
			});

			const responsePre = responseSection.createEl('pre', {
				cls: 'llmsider-tool-code'
			});
			responsePre.createEl('code', {
				text: typeof toolCall.response === 'string'
					? toolCall.response
					: JSON.stringify(toolCall.response, null, 2)
			});
		}
	}

	private showCopiedFeedback(button: HTMLElement): void {
		if (this.copiedButtons.has(button)) return;

		this.copiedButtons.add(button);
		button.addClass('llmsider-copied');
		
		// Find the icon span and temporarily replace it
		const iconSpan = button.querySelector('span');
		if (iconSpan) {
			const originalIcon = iconSpan.cloneNode(true);
			setIcon(iconSpan, 'check');
			
			setTimeout(() => {
				if (iconSpan.parentElement === button) {
					iconSpan.replaceWith(originalIcon);
				}
				button.removeClass('llmsider-copied');
				this.copiedButtons.delete(button);
			}, 2000);
		}
	}

	/**
	 * Get localized tool name from TOOL_I18N_KEY_MAP
	 * Falls back to original tool name if translation not found
	 */
	private getLocalizedToolName(toolName: string): string {
		try {
			// First try: Use TOOL_I18N_KEY_MAP for translation
			const toolKeyMap = TOOL_I18N_KEY_MAP as Record<string, { name?: string }>;
			const i18nKey = toolKeyMap[toolName];
			if (i18nKey?.name) {
				const translated = this.i18n.t(i18nKey.name);
				// Only use translation if it's different from the key (means it was found)
				if (translated && translated !== i18nKey.name) {
					return translated;
				}
			}
			
			// Second try: Get from tool manager's built-in tools (already localized)
			const allTools = this.plugin.toolManager.getToolsForLLM();
			const tool = allTools.find(t => t.name === toolName || t.id === toolName);
			if (tool && tool.displayName && tool.displayName !== toolName) {
				return tool.displayName;
			}
		} catch (error) {
			Logger.error(`Failed to get localized tool name for ${toolName}:`, error);
		}
		// Fallback to original tool name
		return toolName;
	}

	private renderFooter(container: HTMLElement, isExecuting: boolean, hasErrors: boolean): void {
		const footer = container.createDiv({ cls: 'llmsider-plan-footer' });
		
		// Show executing status when executing, otherwise show error message
		if (isExecuting) {
			const executingDiv = footer.createDiv({ cls: 'llmsider-executing-status' });
			executingDiv.createDiv({ cls: 'llmsider-pulse-dot' });
			executingDiv.createSpan({ 
				cls: 'llmsider-executing-text',
				text: this.i18n.t('planExecute.tracker.executingPlan')
			});
		} else if (hasErrors) {
			footer.createEl('p', {
				cls: 'llmsider-error-text',
				text: this.i18n.t('planExecute.tracker.executionFailed')
			});
		}
	}
}
