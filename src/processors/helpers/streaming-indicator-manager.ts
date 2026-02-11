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

		// 1. Main Container
		const container = this.messageContainer.createDiv({
			cls: 'llmsider-validation-error-card w-full max-w-2xl rounded-xl border border-destructive/20 bg-background overflow-hidden shadow-sm'
		});
		
		// Apply basic styling since we might not have tailwind classes available
		container.style.border = '1px solid var(--background-modifier-border-error)'; // border-destructive/20
		container.style.borderRadius = '12px'; // rounded-xl
		container.style.backgroundColor = 'var(--background-primary)'; // bg-background
		container.style.overflow = 'hidden';
		container.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; // shadow-sm
		container.style.marginBottom = '16px';

		// 2. Header
		const header = container.createDiv({
			cls: 'flex items-center gap-3 border-b border-destructive/10 bg-destructive/5 px-5 py-4'
		});
		header.style.display = 'flex';
		header.style.alignItems = 'center';
		header.style.gap = '12px'; // gap-3
		header.style.borderBottom = '1px solid rgba(var(--color-red-rgb), 0.1)'; // border-destructive/10
		header.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.05)'; // bg-destructive/5
		header.style.padding = '16px 20px'; // px-5 py-4

		// Header Icon
		const headerIconContainer = header.createDiv({
			cls: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10'
		});
		headerIconContainer.style.display = 'flex';
		headerIconContainer.style.height = '36px'; // h-9
		headerIconContainer.style.width = '36px'; // w-9
		headerIconContainer.style.flexShrink = '0';
		headerIconContainer.style.alignItems = 'center';
		headerIconContainer.style.justifyContent = 'center';
		headerIconContainer.style.borderRadius = '9999px'; // rounded-full
		headerIconContainer.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.1)'; // bg-destructive/10
		headerIconContainer.innerHTML = SvgIcons.alertCircle();
		const headerIconSvg = headerIconContainer.querySelector('svg');
		if (headerIconSvg) {
			headerIconSvg.style.height = '20px'; // h-5
			headerIconSvg.style.width = '20px'; // w-5
			headerIconSvg.style.color = 'var(--text-error)'; // text-destructive
		}

		// Header Text
		const headerTextContainer = header.createDiv({ cls: 'flex-1 min-w-0' });
		headerTextContainer.style.flex = '1';
		headerTextContainer.style.minWidth = '0';

		const headerTitle = headerTextContainer.createEl('h3', {
			cls: 'text-base font-semibold text-foreground',
			text: this.i18n.t('planExecute.validation.failedTitle') || 'Plan validation failed'
		});
		headerTitle.style.fontSize = '16px'; // text-base
		headerTitle.style.fontWeight = '600'; // font-semibold
		headerTitle.style.color = 'var(--text-normal)'; // text-foreground
		headerTitle.style.margin = '0';

		const headerSubtitle = headerTextContainer.createEl('p', {
			cls: 'text-sm text-muted-foreground mt-0.5',
			text: validationResult.errors.length === 1 
				? '1 error found' 
				: `${validationResult.errors.length} errors found`
		});
		headerSubtitle.style.fontSize = '14px'; // text-sm
		headerSubtitle.style.color = 'var(--text-muted)'; // text-muted-foreground
		headerSubtitle.style.marginTop = '2px'; // mt-0.5
		headerSubtitle.style.margin = '2px 0 0 0';

		// Expand/Collapse Button
		let isExpanded = true;
		const toggleBtn = header.createEl('button', {
			cls: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-foreground'
		});
		toggleBtn.style.display = 'flex';
		toggleBtn.style.height = '32px'; // h-8
		toggleBtn.style.width = '32px'; // w-8
		toggleBtn.style.flexShrink = '0';
		toggleBtn.style.alignItems = 'center';
		toggleBtn.style.justifyContent = 'center';
		toggleBtn.style.borderRadius = '8px'; // rounded-lg
		toggleBtn.style.color = 'var(--text-muted)'; // text-muted-foreground
		toggleBtn.style.background = 'transparent';
		toggleBtn.style.border = 'none';
		toggleBtn.style.cursor = 'pointer';
		toggleBtn.style.transition = 'background-color 0.2s';
		
		// Initial icon
		toggleBtn.innerHTML = SvgIcons.chevronDown();
		let toggleIcon = toggleBtn.querySelector('svg');
		if (toggleIcon) {
			toggleIcon.style.height = '16px';
			toggleIcon.style.width = '16px';
		}

		toggleBtn.onmouseenter = () => {
			toggleBtn.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.1)';
			toggleBtn.style.color = 'var(--text-normal)';
		};
		toggleBtn.onmouseleave = () => {
			toggleBtn.style.backgroundColor = 'transparent';
			toggleBtn.style.color = 'var(--text-muted)';
		};

		// 3. Error List Container
		const errorListContainer = container.createDiv({ cls: 'divide-y divide-border' });
		// We'll simulate divide-y with border-bottom on items

		toggleBtn.onclick = () => {
			isExpanded = !isExpanded;
			errorListContainer.style.display = isExpanded ? 'block' : 'none';
			toggleBtn.innerHTML = isExpanded ? SvgIcons.chevronDown() : SvgIcons.chevronRight();
			toggleIcon = toggleBtn.querySelector('svg');
			if (toggleIcon) {
				toggleIcon.style.height = '16px';
				toggleIcon.style.width = '16px';
			}
			toggleBtn.setAttribute('aria-label', isExpanded ? 'Collapse errors' : 'Expand errors');
		};

		// 4. Render Errors
		validationResult.errors.forEach((error, index) => {
			const isLast = index === validationResult.errors.length - 1;
			const errorItem = errorListContainer.createDiv({
				cls: 'group relative px-5 py-4 transition-colors hover:bg-muted/30'
			});
			errorItem.style.padding = '16px 20px'; // px-5 py-4
			errorItem.style.transition = 'background-color 0.2s';
			if (!isLast) {
				errorItem.style.borderBottom = '1px solid var(--background-modifier-border)';
			}

			errorItem.onmouseenter = () => {
				errorItem.style.backgroundColor = 'var(--background-secondary)'; // hover:bg-muted/30 approx
			};
			errorItem.onmouseleave = () => {
				errorItem.style.backgroundColor = 'transparent';
			};

			const errorFlex = errorItem.createDiv({ cls: 'flex items-start gap-3' });
			errorFlex.style.display = 'flex';
			errorFlex.style.alignItems = 'flex-start';
			errorFlex.style.gap = '12px'; // gap-3

			// Error Icon (X Circle)
			const errorIconContainer = errorFlex.createDiv({
				cls: 'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-destructive/10'
			});
			errorIconContainer.style.marginTop = '2px'; // mt-0.5
			errorIconContainer.style.display = 'flex';
			errorIconContainer.style.height = '24px'; // h-6
			errorIconContainer.style.width = '24px'; // w-6
			errorIconContainer.style.flexShrink = '0';
			errorIconContainer.style.alignItems = 'center';
			errorIconContainer.style.justifyContent = 'center';
			errorIconContainer.style.borderRadius = '6px'; // rounded-md
			errorIconContainer.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.1)'; // bg-destructive/10
			
			// Use cross icon but styled as circle-x if possible, or just cross
			errorIconContainer.innerHTML = SvgIcons.cross(); // reusing cross for now
			const errorIconSvg = errorIconContainer.querySelector('svg');
			if (errorIconSvg) {
				errorIconSvg.style.height = '14px'; // h-3.5
				errorIconSvg.style.width = '14px'; // w-3.5
				errorIconSvg.style.color = 'var(--text-error)'; // text-destructive
			}

			// Content Wrapper
			const contentWrapper = errorFlex.createDiv({ cls: 'flex-1 min-w-0 space-y-2' });
			contentWrapper.style.flex = '1';
			contentWrapper.style.minWidth = '0';
			// space-y-2 is essentially margin-top on children except first, handled manually

			// Badges Row
			const badgesRow = contentWrapper.createDiv({ cls: 'flex flex-wrap items-center gap-2' });
			badgesRow.style.display = 'flex';
			badgesRow.style.flexWrap = 'wrap';
			badgesRow.style.alignItems = 'center';
			badgesRow.style.gap = '8px'; // gap-2
			badgesRow.style.marginBottom = '8px'; // part of space-y-2

			// Step Badge
			const stepBadge = badgesRow.createEl('span', {
				cls: 'inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground',
				text: error.stepId
			});
			stepBadge.style.display = 'inline-flex';
			stepBadge.style.alignItems = 'center';
			stepBadge.style.borderRadius = '6px'; // rounded-md
			stepBadge.style.backgroundColor = 'var(--background-secondary)'; // bg-muted
			stepBadge.style.padding = '2px 8px'; // px-2 py-0.5
			stepBadge.style.fontSize = '12px'; // text-xs
			stepBadge.style.fontWeight = '500'; // font-medium
			stepBadge.style.color = 'var(--text-muted)'; // text-muted-foreground

			// Error Type Badge
			const typeBadge = badgesRow.createEl('span', {
				cls: 'inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive',
				text: error.errorType
			});
			typeBadge.style.display = 'inline-flex';
			typeBadge.style.alignItems = 'center';
			typeBadge.style.borderRadius = '6px';
			typeBadge.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.1)'; // bg-destructive/10
			typeBadge.style.padding = '2px 8px';
			typeBadge.style.fontSize = '12px';
			typeBadge.style.fontWeight = '500';
			typeBadge.style.color = 'var(--text-error)'; // text-destructive

			// Error Message Row
			const msgRow = contentWrapper.createDiv({ cls: 'flex items-start justify-between gap-2' });
			msgRow.style.display = 'flex';
			msgRow.style.alignItems = 'flex-start';
			msgRow.style.justifyContent = 'space-between';
			msgRow.style.gap = '8px';
			msgRow.style.marginBottom = '8px'; // part of space-y-2

			const msgText = msgRow.createEl('p', {
				cls: 'text-sm text-foreground leading-relaxed font-mono',
				text: error.message
			});
			msgText.style.fontSize = '14px';
			msgText.style.color = 'var(--text-normal)';
			msgText.style.lineHeight = '1.625'; // leading-relaxed
			msgText.style.fontFamily = 'var(--font-monospace)'; // font-mono
			msgText.style.margin = '0';

			// Copy Button
			const copyBtn = msgRow.createEl('button', {
				cls: 'mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100',
				attr: { 'aria-label': 'Copy error' }
			});
			copyBtn.style.marginTop = '2px';
			copyBtn.style.flexShrink = '0';
			copyBtn.style.borderRadius = '6px';
			copyBtn.style.padding = '4px';
			copyBtn.style.color = 'var(--text-muted)';
			copyBtn.style.background = 'transparent';
			copyBtn.style.border = 'none';
			copyBtn.style.cursor = 'pointer';
			copyBtn.style.opacity = '0.5'; // Default visible for usability
			copyBtn.style.transition = 'opacity 0.2s';
			
			copyBtn.onmouseenter = () => { copyBtn.style.opacity = '1'; copyBtn.style.backgroundColor = 'var(--background-secondary)'; };
			copyBtn.onmouseleave = () => { copyBtn.style.opacity = '0.5'; copyBtn.style.backgroundColor = 'transparent'; };

			// Copy Icon (Clipboard)
			// Using clipboard icon from SvgIcons but simpler copy icon preferred
			copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
			
			copyBtn.onclick = () => {
				const textToCopy = `[${error.stepId}] ${error.errorType}: ${error.message}`;
				navigator.clipboard.writeText(textToCopy);
				
				// Show checkmark
				copyBtn.innerHTML = SvgIcons.checkmark();
				const checkSvg = copyBtn.querySelector('svg');
				if (checkSvg) {
					checkSvg.style.height = '14px';
					checkSvg.style.width = '14px';
					checkSvg.style.color = 'var(--text-success)';
				}
				
				setTimeout(() => {
					copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
				}, 2000);
			};

			// Suggestion Box
			if (error.suggestion) {
				const suggestionBox = contentWrapper.createDiv({
					cls: 'flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2.5'
				});
				suggestionBox.style.display = 'flex';
				suggestionBox.style.alignItems = 'flex-start';
				suggestionBox.style.gap = '8px';
				suggestionBox.style.borderRadius = '8px';
				suggestionBox.style.backgroundColor = 'rgba(245, 158, 11, 0.05)'; // bg-amber-500/5
				suggestionBox.style.border = '1px solid rgba(245, 158, 11, 0.1)'; // border-amber-500/10
				suggestionBox.style.padding = '10px 12px'; // px-3 py-2.5

				// Lightbulb Icon
				const bulbIcon = suggestionBox.createDiv();
				bulbIcon.style.marginTop = '2px';
				bulbIcon.style.flexShrink = '0';
				bulbIcon.style.color = 'var(--text-warning)'; // text-amber-500
				bulbIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.4 1.5-3.8 0-3.3-2.7-6-6-6S6 4.7 6 8c0 1.4.5 2.8 1.5 3.8.8.8 1.3 1.5 1.5 2.5"></path><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line></svg>`;

				const suggestionText = suggestionBox.createEl('p', {
					cls: 'text-xs text-amber-700 dark:text-amber-400 leading-relaxed',
					text: error.suggestion
				});
				suggestionText.style.fontSize = '12px';
				suggestionText.style.color = 'var(--text-warning)'; // text-amber-700
				suggestionText.style.lineHeight = '1.625';
				suggestionText.style.margin = '0';
			}
		});

		// 5. Footer
		const footer = container.createDiv({
			cls: 'flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between'
		});
		footer.style.display = 'flex';
		footer.style.flexDirection = 'row'; // Assuming desktop width mostly
		footer.style.alignItems = 'center';
		footer.style.justifyContent = 'space-between';
		footer.style.gap = '12px';
		footer.style.borderTop = '1px solid var(--background-modifier-border)';
		footer.style.backgroundColor = 'var(--background-secondary)'; // bg-muted/30 approx
		footer.style.padding = '16px 20px';

		const footerText = footer.createEl('p', {
			cls: 'text-sm text-muted-foreground leading-relaxed',
			text: this.i18n.t('planExecute.validation.regenerateHint') || 'Validation failed. Errors will be automatically sent to AI for improvement.'
		});
		footerText.style.fontSize = '14px';
		footerText.style.color = 'var(--text-muted)';
		footerText.style.lineHeight = '1.625';
		footerText.style.margin = '0';

		// Regenerate Button
		const regenerateBtn = footer.createEl('button', {
			cls: 'shrink-0 gap-2 border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive bg-transparent',
			text: this.i18n.t('planExecute.validation.regeneratePlan') || 'Regenerate Plan'
		});
		regenerateBtn.style.display = 'flex';
		regenerateBtn.style.alignItems = 'center';
		regenerateBtn.style.gap = '8px';
		regenerateBtn.style.flexShrink = '0';
		regenerateBtn.style.border = '1px solid rgba(var(--color-red-rgb), 0.2)'; // border-destructive/20
		regenerateBtn.style.borderRadius = '6px';
		regenerateBtn.style.padding = '6px 12px';
		regenerateBtn.style.fontSize = '13px';
		regenerateBtn.style.fontWeight = '500';
		regenerateBtn.style.color = 'var(--text-error)'; // text-destructive
		regenerateBtn.style.background = 'transparent';
		regenerateBtn.style.cursor = 'pointer';
		regenerateBtn.style.transition = 'background-color 0.2s';

		// Prepend icon
		const btnIcon = document.createElement('span');
		btnIcon.innerHTML = SvgIcons.refresh();
		const btnSvg = btnIcon.querySelector('svg');
		if (btnSvg) {
			btnSvg.style.height = '14px';
			btnSvg.style.width = '14px';
		}
		regenerateBtn.prepend(btnIcon);

		regenerateBtn.onmouseenter = () => {
			regenerateBtn.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.05)';
		};
		regenerateBtn.onmouseleave = () => {
			regenerateBtn.style.backgroundColor = 'transparent';
		};

		regenerateBtn.onclick = async () => {
			// Remove the error card
			container.remove();
			this.plugin.debug('[ValidationResult] Regenerate Plan button clicked - triggering plan regeneration with error context');
			try {
				// Store validation errors for next regeneration
				const errorContext = validationResult.errors.map(e => 
					`[${e.stepId}] ${e.errorType}: ${e.message}${e.suggestion ? ` (suggestion: ${e.suggestion})` : ''}`
				).join('\n');
				(this as any).lastValidationErrors = errorContext;
				await this.onRegeneratePlan();
			} catch (error) {
				Logger.error('[ValidationResult] Plan regeneration failed:', error);
			}
		};

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
