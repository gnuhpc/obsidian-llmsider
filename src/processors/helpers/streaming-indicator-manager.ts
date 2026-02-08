/**
 * StreamingIndicatorManager
 * Manages all UI streaming indicators and tool status displays for Plan-Execute mode.
 * 
 * Extracted from plan-execute-processor.ts to reduce main file complexity.
 * This helper handles:
 * - Tool indicator creation and updates
 * - Streaming indicator lifecycle (show/update/hide)
 * - Phase display rendering
 * - Scroll behavior management
 */

import { I18nManager } from '../../i18n/i18n-manager';
import { Logger } from '../../utils/logger';
import { SvgIcons } from '../../utils/svg-icons';
import { FormatUtils } from '../utils/format-utils';
import type LLMSider from '../../main';
import type { PlanExecuteTracker } from '../../processors/plan-execute-tracker';

export class StreamingIndicatorManager {
	private messageContainer: HTMLElement;
	private i18n: I18nManager;
	private plugin: LLMSider;
	private planTracker: PlanExecuteTracker | null;
	
	// State tracking
	private currentStreamingIndicator: HTMLElement | null = null;
	private isStreaming: boolean = false;
	private currentToolIndicator: HTMLElement | null = null;
	private currentStepProgressIndicator: HTMLElement | null = null;
	
	// External state references (passed from parent processor)
	private isExecutingStepRef: () => boolean;
	private pendingToolFailureRef: () => {
		resolve: (action: 'regenerate' | 'retry' | 'skip') => void;
		reject: (error: Error) => void;
	} | null;
	private onRegeneratePlan: () => Promise<void>;

	constructor(
		messageContainer: HTMLElement,
		i18n: I18nManager,
		plugin: LLMSider,
		planTracker: PlanExecuteTracker | null,
		isExecutingStepRef: () => boolean,
		pendingToolFailureRef: () => {
			resolve: (action: 'regenerate' | 'retry' | 'skip') => void;
			reject: (error: Error) => void;
		} | null,
		onRegeneratePlan: () => Promise<void>
	) {
		this.messageContainer = messageContainer;
		this.i18n = i18n;
		this.plugin = plugin;
		this.planTracker = planTracker;
		this.isExecutingStepRef = isExecutingStepRef;
		this.pendingToolFailureRef = pendingToolFailureRef;
		this.onRegeneratePlan = onRegeneratePlan;
	}

	/**
	 * Update the step progress indicator reference (called from parent when it changes)
	 */
	setCurrentStepProgressIndicator(indicator: HTMLElement | null): void {
		this.currentStepProgressIndicator = indicator;
	}

	/**
	 * Get the current tool indicator element
	 */
	getCurrentToolIndicator(): HTMLElement | null {
		return this.currentToolIndicator;
	}

	/**
	 * Get the current streaming indicator element
	 */
	getCurrentStreamingIndicator(): HTMLElement | null {
		return this.currentStreamingIndicator;
	}

	/**
	 * Check if currently streaming
	 */
	isCurrentlyStreaming(): boolean {
		return this.isStreaming;
	}

	/**
	 * Create a tool indicator card for displaying tool execution status
	 */
	createToolIndicator(): HTMLElement {
		// Skip if using NEW tracker - tool details are shown in plan card
		if (this.planTracker) {
			Logger.debug('Using NEW tracker, skipping tool card creation');
			// Return a dummy element that won't be used
			return document.createElement('div');
		}
		
		// Import ToolResultCard at runtime to avoid circular dependencies
		const { ToolResultCard } = require('../../ui/tool-result-card');
		
		// Determine where to insert the tool card
		let parentContainer: HTMLElement;
		
		if (this.currentStepProgressIndicator) {
			// Insert tool card inside the step progress indicator
			// Look for or create a tool-cards container within the step progress
			let toolCardsContainer = this.currentStepProgressIndicator.querySelector('.step-tool-cards') as HTMLElement;
			if (!toolCardsContainer) {
				// Create a container for tool cards within the step progress indicator
				toolCardsContainer = this.currentStepProgressIndicator.createDiv({ 
					cls: 'step-tool-cards' 
				});
			}
			parentContainer = toolCardsContainer;
		} else {
			// Fallback: add to message container if no step progress indicator exists
			parentContainer = this.messageContainer;
		}
		
		const cardContainer = parentContainer.createDiv({ 
			cls: 'llmsider-tool-card-message llmsider-plan-execute-tool-card' 
		});

		// Store the card instance and initial data
		(cardContainer as { toolCardData?: unknown }).toolCardData = {
			toolName: '',
			status: 'pending' as const,
			parameters: {},
			result: null,
			error: null,
			timestamp: new Date(),
			description: ''
		};

		// Store reference to card instance for updates
		(cardContainer as { toolCardInstance?: unknown }).toolCardInstance = null;

		// Store reference for updates
		this.currentToolIndicator = cardContainer;

		// Scroll to bottom
		cardContainer.scrollIntoView({ behavior: 'smooth' });

		return cardContainer;
	}

	/**
	 * Update the tool indicator for different phases (using ToolResultCard component)
	 */
	updateToolIndicator(
		phase: 'intent' | 'executing' | 'success' | 'error',
		toolName: string,
		args: unknown,
		observationContent?: string
	): void {
		// Skip if using NEW tracker - tool details are shown in plan card
		if (this.planTracker) {
			Logger.debug('Using NEW tracker, skipping tool result card update');
			return;
		}
		
		if (!this.currentToolIndicator) {
			this.plugin.debug('[StreamingIndicatorManager] No current tool indicator exists, may need to create one');
			return;
		}

		// Import ToolResultCard at runtime
		const { ToolResultCard } = require('../../ui/tool-result-card');

	// Get stored data
	const cardData = (this.currentToolIndicator as { toolCardData?: unknown }).toolCardData as {
		toolName: string;
		status: 'pending' | 'executing' | 'success' | 'error' | 'regenerating';
		parameters: unknown;
		result: unknown;
		error: string | null;
		timestamp: Date;
		description: string;
		onRegenerateAndRetry?: () => void;
		onRetry?: () => void;
		onSkip?: () => void;
		regenerateAndRetryButtonText?: string;
		retryButtonText?: string;
		skipButtonText?: string;
	};		// Update data based on phase
		cardData.toolName = toolName;
		cardData.parameters = args;
		
		// Map phase to ToolResultCard status
		let status: 'pending' | 'executing' | 'success' | 'error';
		let description = '';
		
	switch (phase) {
		case 'intent': {
			status = 'pending';
			description = '准备调用工具...';
			break;
		}
		case 'executing': {
			status = 'executing';
			description = '正在执行工具...';
			break;
		}
		case 'success': {
			status = 'success';
			cardData.result = observationContent;
			description = '工具执行成功';
			break;
		}
		case 'error': {
			status = 'error';
			cardData.error = observationContent || this.i18n.t('errors.toolExecutionFailed');
			description = '工具执行失败';
			
		Logger.debug('Setting up error callbacks for tool card');
		
		// Add regenerate and retry callback for error status
		// IMPORTANT: Get pendingToolFailure INSIDE callback to ensure we use current value
		cardData.onRegenerateAndRetry = () => {
			Logger.debug('onRegenerateAndRetry callback invoked');
			const pendingToolFailure = this.pendingToolFailureRef();
			if (pendingToolFailure) {
				Logger.debug('User chose to regenerate and retry failed tool');
				
				// Update card to show regenerating status with SVG animation
				cardData.status = 'regenerating';
				cardData.error = undefined;
				cardData.description = this.i18n.t('planExecute.regenerating') || '正在重新生成步骤...';
				
				// Re-render the card with new status
				const { ToolResultCard } = require('../../ui/tool-result-card');
				const card = new ToolResultCard(this.currentToolIndicator!, cardData);
				
				pendingToolFailure.resolve('regenerate');
			} else {
				Logger.error('pendingToolFailure is null! This usually means the error state was already cleared or the operation timed out.');
			}
		};
		
		// Add direct retry callback for error status
		cardData.onRetry = () => {
			Logger.debug('onRetry callback invoked');
			const pendingToolFailure = this.pendingToolFailureRef();
			if (pendingToolFailure) {
				Logger.debug('User chose to retry failed tool');
				pendingToolFailure.resolve('retry');
			} else {
				Logger.error('pendingToolFailure is null! This usually means the error state was already cleared or the operation timed out.');
			}
		};
		
		// Add skip callback for error status
		cardData.onSkip = () => {
			Logger.debug('onSkip callback invoked');
			const pendingToolFailure = this.pendingToolFailureRef();
			if (pendingToolFailure) {
				Logger.debug('User chose to skip failed tool');
				pendingToolFailure.resolve('skip');
			} else {
				Logger.error('pendingToolFailure is null! This usually means the error state was already cleared or the operation timed out.');
			}
		};			// Add i18n button texts
			cardData.regenerateAndRetryButtonText = this.i18n.t('common.regenerateAndRetry');
			cardData.retryButtonText = this.i18n.t('common.retry');
			cardData.skipButtonText = this.i18n.t('common.skip');
			
			Logger.debug('Error callbacks set:', {
				hasRegenerateAndRetry: !!cardData.onRegenerateAndRetry,
				hasRetry: !!cardData.onRetry,
				hasSkip: !!cardData.onSkip,
				regenerateText: cardData.regenerateAndRetryButtonText,
				retryText: cardData.retryButtonText,
				skipText: cardData.skipButtonText
			});
			break;
		}
	}
		
		cardData.status = status;
		cardData.description = description;
		cardData.timestamp = new Date();

		// Clear container and recreate card
		this.currentToolIndicator.empty();
		
		// Create new ToolResultCard instance
		const cardInstance = new ToolResultCard(
			this.currentToolIndicator,
			cardData
		);
		
		// Store card instance
		(this.currentToolIndicator as { toolCardInstance?: unknown }).toolCardInstance = cardInstance;

		// Scroll to bottom after update
		this.currentToolIndicator.scrollIntoView({ behavior: 'smooth' });
	}

	/**
	 * Display phase in UI (for non-tool phases)
	 */
	displayPhase(phaseTitle: string, content: string, icon: string): void {
		// Create phase display element
		const phaseEl = this.messageContainer.createDiv({
			cls: 'llmsider-plan-execute-phase'
		});

		const headerEl = phaseEl.createDiv({ cls: 'plan-execute-header' });
		headerEl.innerHTML = `
			<span class="plan-execute-icon">${icon}</span>
			<span class="plan-execute-title">${phaseTitle}</span>
		`;

		const contentEl = phaseEl.createDiv({ cls: 'plan-execute-content' });
		contentEl.textContent = content;

		// Scroll to bottom
		phaseEl.scrollIntoView({ behavior: 'smooth' });
	}

	/**
	 * Create a simple, highly visible plan generation indicator
	 */
	createSimplePlanGenerationIndicator(message: string): void {
		// Remove any existing plan generation indicator
		const existingIndicator = this.messageContainer.querySelector('.llmsider-simple-plan-indicator');
		if (existingIndicator) {
			existingIndicator.remove();
		}
		
		// Create a consistent styled indicator matching app theme
		const indicator = this.messageContainer.createDiv({
			cls: 'llmsider-simple-plan-indicator llmsider-plan-execute-phase llmsider-streaming-indicator'
		});
		
		// Create header with icon and title
		const headerEl = indicator.createDiv({ cls: 'plan-execute-header' });
		headerEl.innerHTML = `
			<span class="plan-execute-icon spinning">${SvgIcons.loader()}</span>
			<span class="plan-execute-title plan-generation-message">${message}</span>
		`;
		
		// Store reference for updates and cleanup
		this.currentStreamingIndicator = indicator;
		this.isStreaming = true;
		
		// Get chat container reference
		const chatContainer = this.messageContainer.closest('.llmsider-chat-messages') as HTMLElement;
		
		// Force immediate scroll to bottom to show the indicator
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
		
		// Force scroll to bottom using requestAnimationFrame (after DOM updates)
		requestAnimationFrame(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		});
		
		// Add a backup delayed scroll to ensure visibility
		setTimeout(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 100);
	}

	/**
	 * Show validation result - auto-fix logic removed
	 */
	showValidationResult(
		validationResult: {
			valid: boolean;
			errors: Array<{ stepId: string; errorType: string; message: string; suggestion?: string }>;
			warnings: Array<{ stepId: string; warningType: string; message: string }>;
			suggestions: string[];
		},
		_fixResult: {
			fixed: boolean;
			steps: any[];
			changes: string[];
		},
		_autoFixed: boolean
	): void {
		// Remove any existing validation indicators
		const existingIndicators = this.messageContainer.querySelectorAll('.llmsider-validation-result-indicator, .llmsider-validation-error-card');
		existingIndicators.forEach(el => el.remove());

		// Show error card (no auto-fix, always show validation errors)
		const errorCard = this.messageContainer.createDiv({
			cls: 'llmsider-validation-error-card llmsider-plan-execute-phase'
		});

		// Header
		const errorHeaderEl = errorCard.createDiv({ cls: 'plan-execute-header' });
		errorHeaderEl.innerHTML = `
			<span class="plan-execute-icon">${SvgIcons.alertCircle()}</span>
			<span class="plan-execute-title" style="color: var(--text-error);">❌ ${this.i18n.t('planExecute.validation.failedTitle') || '计划验证失败'}</span>
		`;

		// Content area - show errors
		const errorContentEl = errorCard.createDiv({ cls: 'plan-execute-content' });
		if (validationResult.errors.length > 0) {
			const errorSection = errorContentEl.createDiv({ cls: 'validation-error-section' });
			errorSection.createEl('h4', {
				text: `${this.i18n.t('planExecute.validation.errors') || '错误'} (${validationResult.errors.length}):`,
				attr: { style: 'color: var(--text-error); margin: 8px 0 4px 0; font-size: 14px;' }
			});
			const errorsList = errorSection.createEl('div', { cls: 'validation-errors-list' });
			validationResult.errors.forEach((err) => {
				const errorItem = errorsList.createEl('div', { cls: 'validation-error-item' });
				errorItem.createEl('p', {
					text: `• [${err.stepId}] ${err.errorType}: ${err.message}`,
					attr: { style: 'margin: 2px 0; padding-left: 8px; color: var(--text-error);' }
				});
				if (err.suggestion) {
					errorItem.createEl('p', {
						text: `  💡 ${err.suggestion}`,
						attr: { style: 'margin: 2px 0; padding-left: 24px; color: var(--text-muted); font-size: 12px;' }
					});
				}
			});
		}

		// Show warnings
		if (validationResult.warnings.length > 0) {
			const warnSection = errorContentEl.createDiv({ cls: 'validation-warning-section' });
			warnSection.createEl('h4', {
				text: `${this.i18n.t('planExecute.validation.warnings') || '警告'} (${validationResult.warnings.length}):`,
				attr: { style: 'color: var(--text-warning); margin: 8px 0 4px 0; font-size: 14px;' }
			});
			const warnsList = warnSection.createEl('div', { cls: 'validation-warnings-list' });
			validationResult.warnings.forEach((warn) => {
				warnsList.createEl('p', {
					text: `• [${warn.stepId}] ${warn.message}`,
					attr: { style: 'margin: 2px 0; padding-left: 8px; color: var(--text-warning);' }
				});
			});
		}

		// Add Regenerate Plan button if there are critical errors
		const hasCriticalErrors = validationResult.errors.length > 0;
		if (hasCriticalErrors) {
			const actionSection = errorContentEl.createDiv({ cls: 'validation-action-section' });
			actionSection.style.marginTop = '16px';
			actionSection.style.paddingTop = '12px';
			actionSection.style.borderTop = '1px solid var(--background-modifier-border)';
			
			actionSection.createEl('p', {
				text: this.i18n.t('planExecute.validation.regenerateHint') || '由于计划验证失败，请重新生成计划。错误信息将自动发送给 AI 以改进计划。',
				attr: { style: 'margin: 0 0 12px 0; color: var(--text-muted); font-size: 13px;' }
			});
			
			const actionsEl = actionSection.createDiv({ cls: 'validation-actions' });
			actionsEl.style.display = 'flex';
			actionsEl.style.gap = '8px';

			// Regenerate Plan button
			const regenerateBtn = actionsEl.createEl('button', {
				text: `🔄 ${this.i18n.t('planExecute.validation.regeneratePlan') || '重新生成计划'}`,
				cls: 'mod-cta llmsider-regenerate-btn'
			});
			
			regenerateBtn.onclick = async () => {
				// Remove the error card
				errorCard.remove();
				this.plugin.debug('[ValidationResult] Regenerate Plan button clicked - triggering plan regeneration with error context');
				try {
					// Store validation errors for next regeneration
					const errorContext = validationResult.errors.map(e => 
						`[${e.stepId}] ${e.errorType}: ${e.message}${e.suggestion ? ` (建议: ${e.suggestion})` : ''}`
					).join('\n');
					(this as any).lastValidationErrors = errorContext;
					await this.onRegeneratePlan();
				} catch (error) {
					Logger.error('[ValidationResult] Plan regeneration failed:', error);
				}
			};
		}

		// Scroll to show the indicators
		this.scrollToBottom();
	}

	/**
	 * Show streaming indicator with message (DEBUG: Always create new indicator)
	 */
	showStreamingIndicator(message: string): void {
		// Suppress streaming indicators during step execution to avoid display order issues
		if (this.isExecutingStepRef()) {
			return;
		}
		
		this.isStreaming = true;

		// Create a new streaming indicator for this phase
		const newStreamingIndicator = this.messageContainer.createDiv({
			cls: 'llmsider-plan-execute-phase llmsider-streaming-indicator'
		});

		// Force visibility with inline styles for debugging
		newStreamingIndicator.style.display = 'block';
		newStreamingIndicator.style.visibility = 'visible';
		newStreamingIndicator.style.opacity = '1';
		newStreamingIndicator.style.minHeight = '60px';

		// Add a timestamp to help users understand duration
		const timestamp = new Date().toLocaleTimeString();
		const headerEl = newStreamingIndicator.createDiv({ cls: 'plan-execute-header' });
		headerEl.innerHTML = `
			<span class="plan-execute-icon spinning">${SvgIcons.loader()}</span>
			<span class="plan-execute-title">${this.i18n.t('common.processing')}</span>
			<span class="plan-execute-timestamp">${timestamp}</span>
			<div class="plan-execute-spinner"></div>
		`;

		const contentEl = newStreamingIndicator.createDiv({ cls: 'plan-execute-content' });
		contentEl.textContent = message;

		// Set as current indicator
		this.currentStreamingIndicator = newStreamingIndicator;

		this.scrollToBottom();
	}

	/**
	 * Show streaming indicator with iteration prompt for debugging
	 */
	showStreamingIndicatorWithIterationPrompt(message: string, contextPrompt: string): void {
		this.plugin.debug('[StreamingIndicatorManager] showStreamingIndicatorWithIterationPrompt called');

		// Create a new streaming indicator for this iteration
		this.isStreaming = true;
		const newStreamingIndicator = this.messageContainer.createDiv({
			cls: 'llmsider-plan-execute-phase llmsider-streaming-indicator llmsider-with-iteration-prompt'
		});

		const timestamp = new Date().toLocaleTimeString();
		const headerEl = newStreamingIndicator.createDiv({ cls: 'plan-execute-header' });
		headerEl.innerHTML = `
			<span class="plan-execute-icon spinning">${SvgIcons.loader()}</span>
			<span class="plan-execute-title">等待大模型响应</span>
			<span class="plan-execute-timestamp">${timestamp}</span>
			<div class="plan-execute-spinner"></div>
		`;

		const contentEl = newStreamingIndicator.createDiv({ cls: 'plan-execute-content' });
		contentEl.textContent = message;

		// Add iteration context preview
		const contextEl = newStreamingIndicator.createDiv({ cls: 'plan-execute-context-preview' });
		contextEl.innerHTML = `
			<div class="context-label">当前迭代上下文:</div>
			<div class="context-content">${FormatUtils.truncateText(contextPrompt, 400)}</div>
		`;

		// Add response section
		const responseEl = newStreamingIndicator.createDiv({ cls: 'plan-execute-response-preview' });
		responseEl.innerHTML = `
			<div class="response-label">大模型响应:</div>
			<div class="response-content response-streaming">正在等待响应...</div>
		`;

		// Set as current indicator
		this.currentStreamingIndicator = newStreamingIndicator;

		this.scrollToBottom();
	}

	/**
	 * Show streaming indicator with sent prompt preview
	 */
	showStreamingIndicatorWithPrompt(message: string, prompt: string): void {
		this.plugin.debug('[StreamingIndicatorManager] showStreamingIndicatorWithPrompt called');

		if (this.currentStreamingIndicator) {
			this.updateStreamingIndicator(message);
			return;
		}

		this.isStreaming = true;
		this.currentStreamingIndicator = this.messageContainer.createDiv({
			cls: 'llmsider-plan-execute-phase llmsider-streaming-indicator llmsider-with-prompt'
		});

		// Add timestamp
		const timestamp = new Date().toLocaleTimeString();
		const headerEl = this.currentStreamingIndicator.createDiv({ cls: 'plan-execute-header' });
		headerEl.innerHTML = `
			<span class="plan-execute-icon spinning">${SvgIcons.loader()}</span>
			<span class="plan-execute-title">等待大模型响应</span>
			<span class="plan-execute-timestamp">${timestamp}</span>
			<div class="plan-execute-spinner"></div>
		`;

		const contentEl = this.currentStreamingIndicator.createDiv({ cls: 'plan-execute-content' });
		contentEl.textContent = message;

		// Add prompt preview in light gray
		const promptEl = this.currentStreamingIndicator.createDiv({ cls: 'plan-execute-prompt-preview' });
		promptEl.innerHTML = `
			<div class="prompt-label">发送的提示内容:</div>
			<div class="prompt-content">${FormatUtils.truncateText(prompt, 300)}</div>
		`;

		// Add response section (initially empty)
		const responseEl = this.currentStreamingIndicator.createDiv({ cls: 'plan-execute-response-preview' });
		responseEl.innerHTML = `
			<div class="response-label">大模型响应:</div>
			<div class="response-content response-streaming">正在等待响应...</div>
		`;

		this.scrollToBottom();
	}

	/**
	 * Show streaming indicator with response preview for subsequent iterations
	 */
	showStreamingIndicatorWithResponse(message: string, previousResponse: string): void {
		this.plugin.debug('[StreamingIndicatorManager] showStreamingIndicatorWithResponse called');

		if (this.currentStreamingIndicator) {
			this.updateStreamingIndicatorWithResponse(message);
			return;
		}

		this.isStreaming = true;
		this.currentStreamingIndicator = this.messageContainer.createDiv({
			cls: 'llmsider-plan-execute-phase llmsider-streaming-indicator llmsider-with-response'
		});

		const timestamp = new Date().toLocaleTimeString();
		const headerEl = this.currentStreamingIndicator.createDiv({ cls: 'plan-execute-header' });
		headerEl.innerHTML = `
			<span class="plan-execute-icon spinning">${SvgIcons.loader()}</span>
			<span class="plan-execute-title">等待大模型继续响应</span>
			<span class="plan-execute-timestamp">${timestamp}</span>
			<div class="plan-execute-spinner"></div>
		`;

		const contentEl = this.currentStreamingIndicator.createDiv({ cls: 'plan-execute-content' });
		contentEl.textContent = message;

		// Show previous response context
		if (previousResponse.trim()) {
			const contextEl = this.currentStreamingIndicator.createDiv({ cls: 'plan-execute-context-preview' });
			contextEl.innerHTML = `
				<div class="context-label">上一轮响应:</div>
				<div class="context-content">${FormatUtils.truncateText(previousResponse, 200)}</div>
			`;
		}

		// Add response section
		const responseEl = this.currentStreamingIndicator.createDiv({ cls: 'plan-execute-response-preview' });
		responseEl.innerHTML = `
			<div class="response-label">大模型响应:</div>
			<div class="response-content response-streaming">正在等待响应...</div>
		`;

		this.scrollToBottom();
	}

	/**
	 * Update streaming response in real-time
	 */
	updateStreamingResponse(response: string): void {
		if (!this.currentStreamingIndicator) return;

		const responseContentEl = this.currentStreamingIndicator.querySelector('.response-content') as HTMLElement;
		if (responseContentEl) {
			responseContentEl.classList.remove('response-streaming');
			responseContentEl.classList.add('response-active');
			responseContentEl.textContent = FormatUtils.truncateText(response, 500);

			// Auto-scroll to bottom to show latest content
			this.scrollToBottom();
		}
	}

	/**
	 * Update streaming indicator message
	 */
	updateStreamingIndicator(message: string, shouldNotScroll: boolean = false): void {
		if (!this.currentStreamingIndicator) {
			this.createSimplePlanGenerationIndicator(message);
			return;
		}

		// Check if it's a simple indicator
		const simpleIndicator = this.messageContainer.querySelector('.llmsider-simple-plan-indicator');
		if (simpleIndicator) {
			// Update the message in simple indicator (now using plan-execute-title class)
			const messageElement = simpleIndicator.querySelector('.plan-generation-message') as HTMLElement;
			if (messageElement) {
				messageElement.textContent = message;
				return;
			}
		}

		// Fallback to standard indicator
		const contentEl = this.currentStreamingIndicator.querySelector('.plan-execute-content') as HTMLElement;

		if (contentEl) {
			contentEl.textContent = message;
		}

		// Don't auto-scroll if flag is set (used during final answer generation to avoid interrupting user reading)
		if (!shouldNotScroll) {
			this.scrollToBottom();
		}
	}

	/**
	 * Update streaming indicator with response preview
	 */
	updateStreamingIndicatorWithResponse(message: string): void {
		this.plugin.debug('[StreamingIndicatorManager] updateStreamingIndicatorWithResponse called with message:', message);

		if (!this.currentStreamingIndicator) {
			this.plugin.debug('[StreamingIndicatorManager] No streaming indicator exists, creating one');
			this.showStreamingIndicator(message);
			return;
		}

		// Update the main content message
		const contentEl = this.currentStreamingIndicator.querySelector('.plan-execute-content') as HTMLElement;
		if (contentEl) {
			contentEl.textContent = message;
		}

		// Add response preview if not already present
		let responseEl = this.currentStreamingIndicator.querySelector('.plan-execute-response-preview') as HTMLElement;
		if (!responseEl) {
			responseEl = this.currentStreamingIndicator.createDiv({ cls: 'plan-execute-response-preview' });
			responseEl.innerHTML = `
				<div class="response-label">大模型响应:</div>
				<div class="response-content response-streaming">正在等待响应...</div>
			`;
		}

		this.scrollToBottom();
	}

	/**
	 * Hide streaming indicator
	 */
	hideStreamingIndicator(): void {
		Logger.debug('🔴 hideStreamingIndicator called');
		Logger.debug('🔴 messageContainer children BEFORE cleanup:', {
			count: this.messageContainer.children.length,
			elements: Array.from(this.messageContainer.children).map(el => ({
				tagName: el.tagName,
				classList: Array.from(el.classList),
				innerHTML: el.innerHTML.substring(0, 100)
			}))
		});
		
		// Clear simple plan indicator
		const simpleIndicator = this.messageContainer.querySelector('.llmsider-simple-plan-indicator');
		if (simpleIndicator) {
			Logger.debug('🔴 Removing simple plan indicator');
			simpleIndicator.remove();
		}

		if (this.currentStreamingIndicator) {
			Logger.debug('🔴 Removing currentStreamingIndicator');
			this.currentStreamingIndicator.remove();
			this.currentStreamingIndicator = null;
		}

		// Also clean up any orphaned streaming indicators that might have been created during step execution
		Logger.debug('🔴 Calling cleanupAllStreamingIndicators');
		this.cleanupAllStreamingIndicators();

		Logger.debug('🔴 messageContainer children AFTER cleanup:', {
			count: this.messageContainer.children.length,
			elements: Array.from(this.messageContainer.children).map(el => ({
				tagName: el.tagName,
				classList: Array.from(el.classList),
				innerHTML: el.innerHTML.substring(0, 100)
			}))
		});

		this.isStreaming = false;
	}

	/**
	 * Clean up all streaming indicators in the message container
	 */
	cleanupAllStreamingIndicators(): void {
		Logger.debug('🟡 cleanupAllStreamingIndicators called');
		
		const streamingIndicators = this.messageContainer.querySelectorAll('.llmsider-streaming-indicator');
		Logger.debug('🟡 Found streaming indicators:', streamingIndicators.length);
		
		streamingIndicators.forEach((indicator, index) => {
			Logger.debug(`🟡 Removing streaming indicator ${index + 1}:`, {
				classList: Array.from(indicator.classList),
				innerHTML: indicator.innerHTML.substring(0, 100)
			});
			this.plugin.debug('[StreamingIndicatorManager] Removing orphaned streaming indicator:', indicator);
			indicator.remove();
		});

		// Also clean up any "Preparing to execute tool" indicators that might be stuck
		const processingElements = this.messageContainer.querySelectorAll('.llmsider-plan-execute-phase');
		Logger.debug('🟡 Found plan-execute-phase elements:', processingElements.length);
		
		processingElements.forEach((element, index) => {
			const textContent = element.textContent || '';
			const hasPlanCard = element.querySelector('.llmsider-plan-card');
			const hasStaticPlanPhase = element.classList.contains('llmsider-static-plan-phase');
			
			Logger.debug(`🟡 Checking plan-execute-phase element ${index + 1}:`, {
				classList: Array.from(element.classList),
				textContentPreview: textContent.substring(0, 100),
				hasPlanCard: !!hasPlanCard,
				hasStaticPlanPhase,
				shouldRemove: !hasPlanCard && !hasStaticPlanPhase && (
					textContent.includes('Preparing to execute tool') ||
					textContent.includes('准备执行工具') ||
					textContent.includes('Processing')
				)
			});
			
			if (textContent.includes('Preparing to execute tool') ||
			    textContent.includes('准备执行工具') ||
			    textContent.includes('Processing')) {
				// CRITICAL: Don't remove if it contains the plan card!
				if (!hasPlanCard && !hasStaticPlanPhase) {
					Logger.debug(`🔴 Removing stuck processing indicator ${index + 1}`);
					this.plugin.debug('[StreamingIndicatorManager] Removing stuck processing indicator:', element);
					element.remove();
				} else {
					Logger.debug(`🟢 PRESERVING element ${index + 1} - contains plan card or is static plan`);
				}
			}
		});
	}

	/**
	 * Scroll to bottom of chat container
	 */
	private scrollToBottom(): void {
		const chatContainer = this.messageContainer.closest('.llmsider-chat-messages') as HTMLElement;
		if (!chatContainer) return;

		requestAnimationFrame(() => {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		});
	}

	/**
	 * Smooth scroll to bottom of chat container
	 */
	private scrollToBottomSmooth(): void {
		const chatContainer = this.messageContainer.closest('.llmsider-chat-messages') as HTMLElement;
		if (!chatContainer) return;

		chatContainer.scrollTo({
			top: chatContainer.scrollHeight,
			behavior: 'smooth'
		});
	}
}
