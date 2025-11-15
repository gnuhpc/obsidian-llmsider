/**
 * Legacy Tracker Utilities
 * 
 * This module provides utilities for the old tracker fallback logic.
 * These methods handle todo item finding and status updates when the new PlanExecuteTracker is not available.
 */

import { Logger } from '../../utils/logger';
import { SvgIcons } from '../../utils/svg-icons';

/**
 * Legacy tracker utilities for fallback operations
 */
export class LegacyTrackerUtils {
	/**
	 * Update static plan step status using old tracker logic
	 */
	static oldTrackerUpdateLogic(
		stepId: string,
		status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped',
		messageContainer: HTMLElement
	): void {
		// Fallback to OLD method if NEW tracker not available
		Logger.debug(`Falling back to OLD tracker method`);
		
		// Find the static todo item in the execution plan
		const todoItem = messageContainer.querySelector(`[data-step-id="${stepId}"]`) as HTMLElement;
		if (!todoItem) {
			Logger.warn(`Could not find static plan item for stepId: ${stepId}`);
			// Debug: List all existing step IDs to help with troubleshooting
			const allItems = messageContainer.querySelectorAll('[data-step-id]');
			Logger.debug('Available step IDs:', Array.from(allItems).map(item => item.getAttribute('data-step-id')));
			return;
		}

		const checkbox = todoItem.querySelector('.plan-static-checkbox') as HTMLElement;
		if (!checkbox) {
			Logger.warn(`Could not find checkbox for stepId: ${stepId}`);
			// Debug: Show what checkbox elements exist
			const allCheckboxes = todoItem.querySelectorAll('[class*="checkbox"]');
			Logger.debug('Available checkbox elements:', Array.from(allCheckboxes).map(cb => cb.className));
			return;
		}

		Logger.debug(`Found checkbox for step ${stepId}`);
		Logger.debug(`Current checkbox innerHTML: "${checkbox.innerHTML.substring(0, 50)}..."`);
		Logger.debug(`Current todoItem classes: "${todoItem.className}"`);
		Logger.debug(`Changing to status: ${status}`);

		// IMPORTANT: Remove all status classes first to ensure clean state
		todoItem.classList.remove('executing', 'in-progress', 'completed', 'failed', 'cancelled', 'skipped');

		// Update checkbox icon based on status with immediate DOM flush
		let newIcon: string;
		let newClass: string;
		
		switch (status) {
			case 'executing':
				newIcon = '⏳'; // Hourglass for executing
				newClass = 'executing in-progress';
				Logger.debug(`Setting to executing state`);
				break;
			case 'completed':
				newIcon = '✅'; // Check mark for completed
				newClass = 'completed';
				Logger.debug(`Setting to completed state`);
				break;
			case 'skipped':
				newIcon = '⏭️'; // Skip forward for skipped
				newClass = 'skipped';
				Logger.debug(`Setting to skipped state`);
				break;
			case 'failed':
				newIcon = '❌'; // Red X for failed
				newClass = 'failed';
				Logger.debug(`Setting to failed state`);
				break;
			case 'cancelled':
				newIcon = '⏸️'; // Pause for cancelled
				newClass = 'cancelled';
				Logger.debug(`Setting to cancelled state`);
				break;
			default:
				Logger.warn(`Unknown status: ${status}`);
				return;
		}

		// Apply changes synchronously
		checkbox.innerHTML = newIcon;
		todoItem.className = `plan-todo-item ${newClass}`;
		
		// Force DOM reflow to ensure immediate visual update
		void todoItem.offsetHeight;
		
		Logger.debug(`Updated checkbox innerHTML: "${checkbox.innerHTML.substring(0, 50)}..."`);
		Logger.debug(`Updated todoItem className: "${todoItem.className}"`);
		Logger.debug(`===== Static plan step status updated =====`);
	}

	/**
	 * Enhanced method to find todo item by step_id with multiple fallback strategies
	 */
	static findTodoItemByStepId(
		stepId: string,
		messageContainer: HTMLElement,
		currentStepIndex: number,
		planSteps: any[]
	): HTMLElement | null {
		// Strategy 1: Direct attribute search
		let todoItem = messageContainer.querySelector(`[data-step-id="${stepId}"]`) as HTMLElement;
		if (todoItem) {
			Logger.debug('Found todo item by direct step_id:', stepId);
			return todoItem;
		}

		// Strategy 2: Search by step index if stepId follows step<N> pattern
		const stepMatch = stepId.match(/step(\d+)/i);
		if (stepMatch) {
			const stepNumber = parseInt(stepMatch[1]);
			const stepIndex = stepNumber - 1; // Convert to 0-based index
			todoItem = messageContainer.querySelector(`[data-step-index="${stepIndex}"]`) as HTMLElement;
			if (todoItem) {
				Logger.debug('Found todo item by step index:', stepIndex, 'for stepId:', stepId);
				return todoItem;
			}
		}

		// Strategy 3: Search all todo items and match by stepId in various formats
		const allTodoItems = messageContainer.querySelectorAll('.plan-todo-item');
		for (let i = 0; i < allTodoItems.length; i++) {
			const item = allTodoItems[i] as HTMLElement;
			const dataStepId = item.getAttribute('data-step-id');
			const dataStepIndex = item.getAttribute('data-step-index');
			
			if (dataStepId === stepId || 
				dataStepId === `step${parseInt(stepId)}` ||
				(stepMatch && dataStepIndex === stepMatch[1]) ||
				(stepMatch && dataStepIndex === (parseInt(stepMatch[1]) - 1).toString())) {
				Logger.debug('Found todo item by fuzzy match:', stepId, 'matched with:', dataStepId || dataStepIndex);
				return item;
			}
		}

		// Strategy 4: Use current step index as fallback
		if (currentStepIndex >= 0 && currentStepIndex < planSteps.length) {
			todoItem = messageContainer.querySelector(`[data-step-index="${currentStepIndex}"]`) as HTMLElement;
			if (todoItem) {
				Logger.debug('Found todo item by currentStepIndex:', currentStepIndex);
				return todoItem;
			}
		}

		Logger.error('Could not find todo item for stepId:', stepId, 'with any strategy');
		return null;
	}

	/**
	 * Fallback method to mark step by content matching
	 */
	static markStepByContent(
		stepId: string,
		status: 'in-progress' | 'completed' | 'failed',
		errorMessage: string | undefined,
		messageContainer: HTMLElement,
		currentStepIndex: number,
		updateTodoItemStatus: (todoItem: HTMLElement, status: 'in-progress' | 'completed' | 'failed', errorMessage?: string) => void
	): void {
		const allTodoItems = messageContainer.querySelectorAll('.plan-todo-item');
		
		// Try to find by step number in title
		const stepMatch = stepId.match(/step(\d+)/i);
		if (stepMatch) {
			const stepNumber = parseInt(stepMatch[1]);
			
			for (let i = 0; i < allTodoItems.length; i++) {
				const todoItem = allTodoItems[i] as HTMLElement;
				const title = todoItem.querySelector('.plan-todo-title')?.textContent || '';
				
				// Check if title contains the step number
				if (title.includes(`${stepNumber}.`) || title.includes(`步骤 ${stepNumber}`)) {
					Logger.debug(`Found step by content matching: "${title}"`);
					updateTodoItemStatus(todoItem, status, errorMessage);
					return;
				}
			}
		}
		
		// Last resort: mark by current index
		if (currentStepIndex >= 0 && currentStepIndex < allTodoItems.length) {
			const todoItem = allTodoItems[currentStepIndex] as HTMLElement;
			Logger.debug(`Marking step by current index ${currentStepIndex}`);
			updateTodoItemStatus(todoItem, status, errorMessage);
		}
	}
}
