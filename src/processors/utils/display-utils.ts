import { Logger } from '../../utils/logger';
import { SvgIcons } from '../../utils/svg-icons';
import { PlanExecuteTracker, Task, TaskStatus } from '../plan-execute-tracker';

/**
 * Display utilities for scrolling and UI updates
 */
export class DisplayUtils {
	/**
	 * Scroll to bottom of chat container - immediate scroll
	 */
	static scrollToBottom(messageContainer: HTMLElement): void {
		const chatContainer = messageContainer.closest('.llmsider-chat-messages') as HTMLElement;
		if (!chatContainer) return;

		requestAnimationFrame(() => {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		});
	}

	/**
	 * Smooth scroll to bottom of chat container
	 */
	static scrollToBottomSmooth(messageContainer: HTMLElement): void {
		const chatContainer = messageContainer.closest('.llmsider-chat-messages') as HTMLElement;
		if (!chatContainer) return;

		chatContainer.scrollTo({
			top: chatContainer.scrollHeight,
			behavior: 'smooth'
		});
	}

	/**
	 * Update todo item status in plan tracker
	 */
	static updateTodoItemStatus(
		todoItem: HTMLElement,
		status: 'in-progress' | 'completed' | 'failed',
		errorMessage: string | undefined,
		i18n: any,
		incrementCompletedSteps: () => void,
		updatePlanProgress: () => void
	): void {
		// Remove previous status classes
		todoItem.classList.remove('in-progress', 'completed', 'failed');
		
		// Add new status class
		todoItem.classList.add(status);

		// Update checkbox/icon
		const checkbox = todoItem.querySelector('.plan-todo-checkbox') as HTMLElement;
		if (!checkbox) return;

		const SvgIcons = {
			loader: () => '<svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>',
			checkCircle: () => '<svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
			xCircle: () => '<svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
		};

		switch (status) {
			case 'in-progress':
				checkbox.innerHTML = SvgIcons.loader();
				break;
			case 'completed':
				checkbox.innerHTML = SvgIcons.checkCircle();
				incrementCompletedSteps();
				updatePlanProgress();
				break;
			case 'failed':
				checkbox.innerHTML = SvgIcons.xCircle();
				if (errorMessage) {
					const errorEl = todoItem.createDiv({ cls: 'step-error-message' });
					errorEl.textContent = errorMessage;
				}
				break;
		}
	}

	/**
	 * Add celebration effect to completed item
	 */
	static addCelebrationEffect(todoItem: HTMLElement): void {
		todoItem.classList.add('celebrate');
		setTimeout(() => {
			todoItem.classList.remove('celebrate');
		}, 1000);
	}

	/**
	 * Display plan as static todo list - full implementation
	 */
	static displayPlanAsTodoList(
		content: string,
		messageContainer: HTMLElement,
		planSteps: any[],
		planTasks: any[],
		planTracker: any,
		determineToolType: (toolName: string) => 'mcp' | 'builtin' | 'api',
		i18n: any,
		onTaskRetry: (taskId: string) => void,
		onTaskRegenerateAndRetry: (taskId: string) => void,
		onTaskSkip: (taskId: string) => void,
		onPlanCreatedCallback: ((planData: unknown, tasks: any[]) => void) | null,
		scrollToBottom: () => void,
		streamingIndicatorManager: any,
		structuredPromptManager: any
	): { planSteps: any[], planTasks: any[], planTracker: any } {
		try {
			// Parse the JSON content from the plan
			Logger.debug('🟢 Parsing plan content:', { contentLength: content.length, contentPreview: content.substring(0, 200) });
			const planData = JSON.parse(content);

			if (!planData.steps || !Array.isArray(planData.steps)) {
				Logger.warn('Invalid plan format, falling back to normal display');
				streamingIndicatorManager.displayPhase('Plan', content, '<svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>');
				return { planSteps, planTasks, planTracker };
			}

			Logger.debug('🟢 Parsed plan data:', { stepsCount: planData.steps.length, steps: planData.steps });

			// Store plan steps for tracking - clear and repopulate array instead of reassigning
			planSteps.length = 0;
			planSteps.push(...planData.steps);
			
			Logger.debug('🟢 Assigned planSteps:', { planStepsLength: planSteps.length });

			// Update structured prompt manager with total steps count
			if (structuredPromptManager && structuredPromptManager.updateTotalSteps) {
				structuredPromptManager.updateTotalSteps(planSteps.length);
			}

			// Convert plan steps to Task[] format for PlanExecuteTracker - clear and repopulate
			planTasks.length = 0;
			planTasks.push(...planData.steps.map((step: any, index: number) => ({
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
			})));

			Logger.debug('🟢 Converting plan to tasks:', {
				stepsCount: planData.steps.length,
				tasksCount: planTasks.length
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
			planTracker = new PlanExecuteTracker(planElement, {
				tasks: planTasks,
				isExecuting: true,
				expandable: true,
				onTaskRetry: (taskId: string) => onTaskRetry(taskId),
				onTaskRegenerateAndRetry: (taskId: string) => onTaskRegenerateAndRetry(taskId),
				onTaskSkip: (taskId: string) => onTaskSkip(taskId),
				i18n: i18n
			});

			Logger.debug('🟢 PlanExecuteTracker instantiated:', {
				trackerExists: !!planTracker,
				tasksCount: planTasks.length,
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

			Logger.debug('🟢 Static plan displayed with NEW tracker:', planTasks.length, 'steps');

			// Notify chat-view to save plan data for restoration after reload
			if (onPlanCreatedCallback) {
				onPlanCreatedCallback(planData, planTasks);
			}

			scrollToBottom();
			
			// Hide the streaming indicator since plan generation is complete
			Logger.debug('🔵 Before hideStreamingIndicator, plan element status:', {
				isConnected: planElement.isConnected,
				hasParent: !!planElement.parentElement,
				childrenCount: planElement.children.length
			});
			
			streamingIndicatorManager.hideStreamingIndicator();
			
			Logger.debug('🔵 After hideStreamingIndicator, plan element status:', {
				isConnected: planElement.isConnected,
				hasParent: !!planElement.parentElement,
				childrenCount: planElement.children.length,
				messageContainerChildren: messageContainer.children.length
			});

		} catch (error) {
			Logger.error('Error parsing plan JSON:', error);
			// Fallback to normal display
			streamingIndicatorManager.displayPhase('Plan', content, '<svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>');
			// Also hide streaming indicator on error
			streamingIndicatorManager.hideStreamingIndicator();
		}
		
		Logger.debug('🟢 Returning from displayPlanAsTodoList:', {
			planStepsLength: planSteps?.length,
			planTasksLength: planTasks?.length,
			hasPlanTracker: !!planTracker
		});
		
		return { planSteps, planTasks, planTracker };
	}
}
