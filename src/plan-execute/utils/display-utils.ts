/**
 * Display utilities for Plan-Execute UI components
 * Handles plan display, todo list rendering, and UI effects
 */

import { Logger } from '../../utils/logger';
import { SvgIcons } from '../../utils/svg-icons';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { Task, TaskStatus } from '../plan-execute-tracker';
import { PlanExecuteTracker } from '../plan-execute-tracker';

export class DisplayUtils {
	/**
	 * Display plan as static todo list using PlanExecuteTracker
	 */
	static displayPlanAsTodoList(
		content: string,
		messageContainer: HTMLElement,
		planSteps: any[],
		planTasks: Task[],
		planTracker: PlanExecuteTracker | null,
		determineToolType: (toolName: string) => 'mcp' | 'builtin' | 'api',
		i18n: I18nManager,
		onTaskRetry: (taskId: string) => Promise<void>,
		onTaskRegenerateAndRetry: (taskId: string) => Promise<void>,
		onTaskSkip: (taskId: string) => Promise<void>,
		onPlanCreatedCallback: ((planData: any, tasks: Task[]) => void) | null,
		scrollToBottom: () => void,
		streamingIndicatorManager: any,
		structuredPromptManager: any
	): {
		planSteps: any[];
		planTasks: Task[];
		planTracker: PlanExecuteTracker | null;
	} {
		try {
			// Parse the JSON content from the plan
			const planData = JSON.parse(content);

			if (!planData.steps || !Array.isArray(planData.steps)) {
				Logger.warn('Invalid plan format, falling back to normal display');
				streamingIndicatorManager.displayPhase('Plan', content, SvgIcons.clipboard());
				return { planSteps, planTasks, planTracker };
			}

			// Store plan steps for tracking
			const newPlanSteps = planData.steps;

			// Update structured prompt manager with total steps count
			structuredPromptManager.updateTotalSteps(newPlanSteps.length);

			// Convert plan steps to Task[] format for PlanExecuteTracker
			const newPlanTasks = planData.steps.map((step: any, index: number) => ({
				id: step.step_id,
				title: step.tool,
				description: step.reason,
				status: 'pending' as TaskStatus,
				toolCalls: [],
				// New fields for improved display
				toolName: step.tool,
				toolType: determineToolType(step.tool),
				reason: step.reason
				// timestamp will be set when step starts execution
			}));

			Logger.debug('🟢 Converting plan to tasks:', {
				stepsCount: planData.steps.length,
				tasksCount: newPlanTasks.length
			});

			// Create container for the plan tracker with wrapper class
			// PlanExecuteTracker will add llmsider-plan-card class
			const planElement = messageContainer.createDiv({ cls: 'llmsider-plan-execute-tracker' });

			Logger.debug('🟢 Plan element created:', {
				element: planElement,
				classList: Array.from(planElement.classList),
				parentElement: planElement.parentElement,
				isConnected: planElement.isConnected
			});

			// Use NEW PlanExecuteTracker component and store reference
			const newPlanTracker = new PlanExecuteTracker(planElement, {
				tasks: newPlanTasks,
				isExecuting: true,
				expandable: true,
				onTaskRetry,
				onTaskRegenerateAndRetry,
				onTaskSkip,
				i18n
			});

			Logger.debug('🟢 PlanExecuteTracker instantiated:', {
				trackerExists: !!newPlanTracker,
				tasksCount: newPlanTasks.length,
				planElementStillConnected: planElement.isConnected,
				planElementChildren: planElement.children.length,
				planElementHTML: planElement.innerHTML.substring(0, 200)
			});

			// Check if plan card was actually rendered
			const planCard = planElement.querySelector('.llmsider-plan-card');
			Logger.debug('🟢 Plan card check:', {
				planCardExists: !!planCard,
				planCardHTML: planCard ? planCard.innerHTML.substring(0, 200) : 'NOT FOUND'
			});

			Logger.debug('🟢 Static plan displayed with NEW tracker:', newPlanTasks.length, 'steps');

			// Notify chat-view to save plan data for restoration after reload
			if (onPlanCreatedCallback) {
				onPlanCreatedCallback(planData, newPlanTasks);
			}

			scrollToBottom();

			return {
				planSteps: newPlanSteps,
				planTasks: newPlanTasks,
				planTracker: newPlanTracker
			};
		} catch (error) {
			Logger.error('Error displaying plan as todo list:', error);
			streamingIndicatorManager.displayPhase('Plan', content, SvgIcons.clipboard());
			return { planSteps, planTasks, planTracker };
		}
	}

	/**
	 * Update todo item status with visual feedback
	 */
	static updateTodoItemStatus(
		todoItem: HTMLElement,
		status: 'in-progress' | 'completed' | 'failed',
		errorMessage: string | undefined,
		i18n: I18nManager,
		incrementCompletedSteps: () => void,
		updatePlanProgress: () => void
	): void {
		const checkbox = todoItem.querySelector('.plan-todo-checkbox') as HTMLElement;
		if (!checkbox) return;

		// Clear previous states
		todoItem.classList.remove('in-progress', 'completed', 'failed');

		switch (status) {
			case 'in-progress':
				checkbox.innerHTML = SvgIcons.loader();
				todoItem.classList.add('in-progress');
				break;
			case 'completed':
				checkbox.innerHTML = SvgIcons.checkedBox();
				todoItem.classList.add('completed');
				DisplayUtils.addCelebrationEffect(todoItem);
				incrementCompletedSteps();
				break;
			case 'failed':
				checkbox.innerHTML = SvgIcons.cross();
				todoItem.classList.add('failed');
				if (errorMessage) {
					const existingError = todoItem.querySelector('.plan-todo-error');
					if (!existingError) {
						const errorEl = todoItem.createDiv({ cls: 'plan-todo-error' });
						errorEl.textContent = `错误: ${errorMessage}`;
					}
				}
				break;
		}

		updatePlanProgress();

		// Scroll to item
		setTimeout(() => {
			todoItem.scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			});
		}, 200);
	}

	/**
	 * Add celebration effect to completed todo item
	 */
	static addCelebrationEffect(todoItem: HTMLElement): void {
		// Create a temporary celebration element
		const celebration = todoItem.createDiv({ cls: 'plan-todo-celebration' });
		celebration.innerHTML = '🎉';
		celebration.style.position = 'absolute';
		celebration.style.right = '10px';
		celebration.style.top = '50%';
		celebration.style.transform = 'translateY(-50%)';
		celebration.style.fontSize = '16px';
		celebration.style.opacity = '0';
		celebration.style.animation = 'celebrationPop 1.5s ease-out forwards';

		// Remove after animation
		setTimeout(() => {
			celebration.remove();
		}, 1500);
	}
}
