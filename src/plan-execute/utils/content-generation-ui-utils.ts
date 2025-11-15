import { SvgIcons } from '../../utils/svg-icons';
import type { I18nManager } from '../../i18n/i18n-manager';

/**
 * Content Generation UI Utils - utilities for creating and updating content generation indicators
 */
export class ContentGenerationUIUtils {
	/**
	 * Create content generation indicator for visual progress with expandable real-time content
	 */
	static createContentGenerationIndicator(
		messageContainer: HTMLElement,
		i18n: I18nManager
	): HTMLElement {
		const indicator = document.createElement('div');
		indicator.className = 'llmsider-content-generation-indicator';
		// Remove inline styles to use CSS variables from theme
		indicator.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 8px;
		`;
		
		// Add pulsing animation if not already defined
		if (!document.querySelector('#llmsider-content-generation-animation')) {
			const style = document.createElement('style');
			style.id = 'llmsider-content-generation-animation';
			style.textContent = `
				.content-generation-toggle {
					cursor: pointer;
					user-select: none;
					transition: background-color 0.2s;
				}
				.content-generation-toggle:hover {
					background-color: var(--background-modifier-hover);
					border-radius: 4px;
				}
				.generated-content-preview {
					background: var(--background-primary-alt);
					border-radius: 6px;
					padding: 8px;
					margin-top: 4px;
					font-family: var(--font-monospace);
					font-size: 12px;
					line-height: 1.4;
					color: var(--text-normal);
					white-space: pre-wrap;
					word-wrap: break-word;
					max-height: 200px;
					overflow-y: auto;
					border-left: 3px solid var(--interactive-accent);
				}
				.content-toggle-icon {
					transition: transform 0.2s;
					color: var(--text-muted);
				}
				.content-toggle-icon.expanded {
					transform: rotate(90deg);
				}
			`;
			document.head.appendChild(style);
		}
		
		// Create main status line with toggle functionality
		const statusLine = document.createElement('div');
		statusLine.className = 'content-generation-toggle';
		statusLine.style.cssText = `
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 4px;
		`;
		
		statusLine.innerHTML = `
			<span class="content-toggle-icon">${SvgIcons.chevronRight()}</span>
			<span class="phase-icon">${SvgIcons.loader()}</span>
			<span class="phase-text">准备内容生成...</span>
		`;
		
		// Create collapsible content preview area
		const contentPreview = document.createElement('div');
		contentPreview.className = 'generated-content-preview';
		contentPreview.style.display = 'none';
		contentPreview.textContent = i18n.t('common.clickToViewGeneration');
		
		// Add toggle functionality
		statusLine.addEventListener('click', () => {
			const toggleIcon = statusLine.querySelector('.content-toggle-icon');
			const isExpanded = contentPreview.style.display !== 'none';
			
			if (isExpanded) {
				contentPreview.style.display = 'none';
				if (toggleIcon) toggleIcon.innerHTML = SvgIcons.chevronRight();
				toggleIcon?.classList.remove('expanded');
			} else {
				contentPreview.style.display = 'block';
				if (toggleIcon) toggleIcon.innerHTML = SvgIcons.chevronDown();
				toggleIcon?.classList.add('expanded');
			}
		});
		
		indicator.appendChild(statusLine);
		indicator.appendChild(contentPreview);
		
		// Store reference to content preview for updates
		(indicator as any).contentPreview = contentPreview;
		
		// Insert before any existing messages in the chat container
		const chatContainer = messageContainer.querySelector('.llmsider-chat-messages') || messageContainer;
		if (chatContainer) {
			chatContainer.appendChild(indicator);
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
		
		return indicator;
	}
	
	/**
	 * Update content generation indicator with phase, message, and optional real-time content
	 */
	static updateContentGenerationIndicator(
		indicator: HTMLElement,
		phase: 'parsing' | 'analyzing' | 'preparing' | 'connecting' | 'connected' | 'generating' | 'processing' | 'completed' | 'error',
		message: string,
		messageContainer: HTMLElement,
		i18n: I18nManager,
		generatedContent?: string
	): void {
		if (!indicator) return;
		
		const iconEl = indicator.querySelector('.phase-icon');
		const textEl = indicator.querySelector('.phase-text');
		const contentPreview = (indicator as any).contentPreview;
		
		if (!iconEl || !textEl) return;
		
		// Update icon and styling based on phase
		const phaseConfig: Record<string, { icon?: string; iconSvg?: string; class: string }> = {
			parsing: { icon: '🔍', class: 'phase-parsing' },
			analyzing: { icon: '📊', class: 'phase-analyzing' },
			preparing: { icon: '🛠️', class: 'phase-preparing' },
			connecting: { icon: '🤖', class: 'phase-connecting' },
			connected: { iconSvg: SvgIcons.checkedBox(), class: 'phase-connected' },
			generating: { icon: '✨', class: 'phase-generating' },
			processing: { icon: '🧹', class: 'phase-processing' },
			completed: { icon: '🎉', class: 'phase-completed' },
			error: { iconSvg: SvgIcons.alertCircle(), class: 'phase-error' }
		};
		
		const config = phaseConfig[phase] || phaseConfig.generating;
		
		if (config.iconSvg) {
			iconEl.innerHTML = config.iconSvg;
		} else if (config.icon) {
			iconEl.textContent = config.icon;
		}
		textEl.textContent = message;

		// Remove all phase classes and add the current one
		indicator.classList.remove(...Object.values(phaseConfig).map(p => p.class));
		indicator.classList.add(config.class);
		
		// Update real-time content preview if provided
		if (contentPreview && generatedContent !== undefined) {
			if (generatedContent === '') {
				contentPreview.textContent = i18n.t('common.waitingContentGeneration');
			} else {
				// Format content for better display
				const formattedContent = generatedContent.length > 2000
					? generatedContent.substring(0, 2000) + `\n\n${i18n.t('common.contentTooLong')}`
					: generatedContent;
				
				contentPreview.textContent = formattedContent;
				
				// Auto-scroll to bottom of content preview if it's expanded
				if (contentPreview.style.display !== 'none') {
					contentPreview.scrollTop = contentPreview.scrollHeight;
				}
			}
		}
		
		// Scroll to keep indicator visible
		const chatContainer = messageContainer.querySelector('.llmsider-chat-messages') || messageContainer;
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}
}
