/**
 * Unified Error Renderer
 * 
 * Provides consistent error handling and display across all conversation modes:
 * - normal mode (basic Q&A)
 * - agent mode (plan-execute with tools)
 * - guided mode (structured conversation)
 */

import { setIcon } from 'obsidian';
import { I18nManager } from '../i18n/i18n-manager';
import { Logger } from '../utils/logger';

export interface ErrorDisplayOptions {
	/** The error object */
	error: Error | unknown;
	/** Container element to display error in */
	containerEl: HTMLElement;
	/** I18n manager for translations */
	i18n: I18nManager;
	/** Optional retry callback */
	onRetry?: () => Promise<void>;
	/** Optional custom error title */
	customTitle?: string;
	/** Optional custom error message */
	customMessage?: string;
	/** Show retry button (default: true) */
	showRetry?: boolean;
}

export interface ErrorInfo {
	title: string;
	message: string;
	showRetry: boolean;
}

/**
 * Unified Error Renderer for all conversation modes
 */
export class ErrorRenderer {
	/**
	 * Analyze error and extract standardized error information
	 */
	static analyzeError(error: Error | unknown, i18n: I18nManager): ErrorInfo {
		let errorTitle = '';
		let errorMessage = '';
		let showRetry = true;
		
		if (error instanceof Error) {
			Logger.debug('[ErrorRenderer] Analyzing error:', error.message);
			
			// Image analysis not supported
			if (error.message.includes('does not support image analysis')) {
				errorTitle = i18n.t('errors.imageAnalysisNotSupported');
				errorMessage = i18n.t('errors.imageAnalysisNotSupportedDetail');
				showRetry = false;
			}
			// Network errors
			else if (error.message.includes('Failed to fetch') || 
					error.message.includes('fetch failed') ||
					error.message.includes('NetworkError') ||
					error.message.includes('net::ERR_FAILED')) {
				errorTitle = i18n.t('errors.aiServiceConnectionFailed');
				errorMessage = i18n.t('errors.aiServiceConnectionFailedDetail');
			}
			// Timeout errors
			else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
				errorTitle = i18n.t('errors.aiServiceTimeout');
				errorMessage = i18n.t('errors.aiServiceTimeoutDetail');
			}
			// Rate limit errors
			else if (error.message.includes('rate limit') || error.message.includes('429')) {
				errorTitle = i18n.t('errors.aiServiceRateLimitExceeded');
				errorMessage = i18n.t('errors.aiServiceRateLimitExceededDetail');
			}
			// Authentication errors
			else if (error.message.includes('401') || error.message.includes('403') || 
					error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
				errorTitle = i18n.t('errors.aiServiceAuthFailed');
				errorMessage = i18n.t('errors.aiServiceAuthFailedDetail');
				showRetry = false;
			}
			// OpenRouter tool use error
			else if (error.message.includes('No endpoints found that support tool use') ||
					error.message.includes('provider routing')) {
				errorTitle = i18n.t('errors.aiServiceError') || 'AI Service Error';
				errorMessage = 'The selected model does not support tool/function calling. Please:\n\n' +
					'1. Switch to a model that supports tools (e.g., GPT-4, Claude, etc.)\n' +
					'2. Or switch to Normal Mode (without tools) in settings\n' +
					'3. Visit OpenRouter docs for compatible models: https://openrouter.ai/docs/guides/routing/provider-selection';
				showRetry = false;
			}
			// API errors (including model not supported)
			else if (error.message.includes('APICallError') || 
					error.message.includes('model is not supported') ||
					error.message.includes('invalid_request_error')) {
				errorTitle = i18n.t('errors.aiServiceError');
				
				// Try to extract and format JSON from error message
				try {
					// Use [\s\S] instead of . with s flag for compatibility
					const jsonMatch = error.message.match(/\{[\s\S]*\}/);
					
					if (jsonMatch) {
						const jsonObj = JSON.parse(jsonMatch[0]);
						// Format JSON with indentation for better readability
						const formattedJson = JSON.stringify(jsonObj, null, 2);
						
						// Extract the actual error message if available
						if (jsonObj.error && jsonObj.error.message) {
							errorMessage = `${jsonObj.error.message}\n\nDetails:\n${formattedJson}`;
						} else {
							errorMessage = formattedJson;
						}
					} else {
						errorMessage = error.message;
					}
				} catch (e) {
					// If JSON parsing fails, use original message
					errorMessage = error.message;
				}
				
				showRetry = false;
			}
			// JSON parsing errors (plan generation)
			else if (error.message.includes('JSON') || 
					error.message.includes('parse') ||
					error.message.includes('Unexpected end of JSON input')) {
				errorTitle = i18n.t('errors.planGenerationFailed') || 'Plan Generation Failed';
				errorMessage = i18n.t('errors.planGenerationFailedDetail') || 'Failed to parse plan from LLM response. Please try again.';
			}
			// Plan validation errors - handled by validation UI, don't show error card
			else if (error.message.includes('Plan validation failed')) {
				// Return empty to suppress error rendering (already handled by showValidationResult)
				return { title: '', message: '', showRetry: false };
			}
			// Other errors
			else {
				errorTitle = i18n.t('errors.unknownError');
				errorMessage = error.message;
			}
		} else {
			errorTitle = i18n.t('errors.unknownError');
			errorMessage = String(error);
		}
		
		return { title: errorTitle, message: errorMessage, showRetry };
	}
	
	/**
	 * Render error UI in the specified container
	 */
	static renderError(options: ErrorDisplayOptions): void {
		const { error, containerEl, i18n, onRetry, customTitle, customMessage, showRetry: customShowRetry } = options;
		
		Logger.debug('[ErrorRenderer] Rendering error UI');
		
		// Clear container
		containerEl.empty();
		
		// Analyze error if not provided custom messages
		const errorInfo = customTitle && customMessage 
			? { title: customTitle, message: customMessage, showRetry: customShowRetry ?? true }
			: this.analyzeError(error, i18n);
		
		// Skip rendering if title is empty (e.g., validation errors handled elsewhere)
		if (!errorInfo.title) {
			Logger.debug('[ErrorRenderer] Skipping error rendering - already handled by validation UI');
			return;
		}
		
		// Create error container
		const errorContainer = containerEl.createDiv({ cls: 'llmsider-error-message' });
		
		// Error icon
		const iconContainer = errorContainer.createDiv({ cls: 'llmsider-error-icon' });
		setIcon(iconContainer, 'alert-circle');
		
		// Error content
		const errorContent = errorContainer.createDiv({ cls: 'llmsider-error-content' });
		
		errorContent.createEl('div', { 
			cls: 'llmsider-error-title',
			text: errorInfo.title
		});
		
		// Use pre tag for messages with line breaks to preserve formatting
		if (errorInfo.message.includes('\n')) {
			const descEl = errorContent.createEl('pre', { 
				cls: 'llmsider-error-description'
			});
			descEl.textContent = errorInfo.message;
		} else {
			errorContent.createEl('div', { 
				cls: 'llmsider-error-description',
				text: errorInfo.message
			});
		}
		
		// Add retry button if applicable
		if (errorInfo.showRetry && onRetry) {
			const actionsContainer = errorContainer.createDiv({ cls: 'llmsider-error-actions' });
			
			const retryBtn = actionsContainer.createEl('button', {
				cls: 'llmsider-error-retry-btn',
				text: i18n.t('common.retry') || 'Retry'
			});
			
			retryBtn.onclick = async () => {
				Logger.debug('[ErrorRenderer] Retry button clicked');
				try {
					await onRetry();
				} catch (retryError) {
					Logger.error('[ErrorRenderer] Retry failed:', retryError);
				}
			};
		}
		
		Logger.debug('[ErrorRenderer] Error UI rendered successfully');
	}
	
	/**
	 * Render error in a message element (for chat messages)
	 */
	static renderErrorInMessage(
		messageEl: HTMLElement,
		error: Error | unknown,
		i18n: I18nManager,
		onRetry?: () => Promise<void>
	): void {
		Logger.debug('[ErrorRenderer] Rendering error in message element');
		
		// Find content element
		const contentEl = messageEl.querySelector('.llmsider-message-content') as HTMLElement;
		if (!contentEl) {
			Logger.error('[ErrorRenderer] Content element not found in message');
			return;
		}
		
		// Remove loading indicator
		contentEl.classList.remove('llmsider-working-indicator');
		const dotsEl = contentEl.querySelector('.llmsider-typing-dots');
		if (dotsEl) {
			dotsEl.remove();
		}
		
		// Render error
		this.renderError({
			error,
			containerEl: contentEl,
			i18n,
			onRetry
		});
	}
	
	/**
	 * Render error in a phase indicator (for plan-execute mode)
	 */
	static renderErrorInPhaseIndicator(
		indicatorEl: HTMLElement,
		error: Error | unknown,
		i18n: I18nManager,
		onRetry?: () => Promise<void>
	): void {
		Logger.debug('[ErrorRenderer] Rendering error in phase indicator');
		
		// Find or create content element
		let contentEl = indicatorEl.querySelector('.plan-execute-content') as HTMLElement;
		if (!contentEl) {
			contentEl = indicatorEl.createDiv({ cls: 'plan-execute-content' });
		}
		
		// Render error
		this.renderError({
			error,
			containerEl: contentEl,
			i18n,
			onRetry
		});
	}
}
