/**
 * Guided Mode UI Renderer
 * 
 * Responsible for rendering Guided Mode specific UI components:
 * - Guided question cards
 * - Tool call confirmations
 * - Option selection UI
 * - Tool execution cards
 * 
 * Extracted from chat-view.ts to reduce complexity
 */

import { ChatMessage } from '../../types';
import { ToolResultCard } from '../tool-result-card';
import { Logger } from '../../utils/logger';
import { setIcon } from 'obsidian';
import type { MessageRenderer } from '../message-renderer';
import type { MessageManager } from '../message-manager';
import type LLMSiderLitePlugin from '../../main';
import type { MemoryCoordinator } from '../memory/memory-coordinator';

/**
 * Interface for GuidedModeUIRenderer
 */
export interface IGuidedModeUIRenderer {
	updateGuidedMessageUI(message: ChatMessage): Promise<void>;
	renderGuidedCard(message: ChatMessage, isReloaded?: boolean): void;
	renderGuidedToolCallsAsIndependent(message: ChatMessage, isReloaded?: boolean): HTMLElement | null;
	renderGuidedToolCalls(cardContainer: HTMLElement, message: ChatMessage, isReloaded?: boolean): void;
	renderGuidedOptions(cardContainer: HTMLElement, message: ChatMessage, isReloaded?: boolean): void;
	addGuidedMessageToUI(message: ChatMessage): Promise<void>;
	executeGuidedTool(toolCall: unknown, guidedMessage: ChatMessage, buttonElement?: HTMLButtonElement): Promise<void>;
	executeToolWithCard(cardContainer: HTMLElement, toolCall: unknown, guidedMessage: ChatMessage): Promise<void>;
	removeOptionsFromContent(content: string): string;
}

/**
 * Callbacks required by GuidedModeUIRenderer
 */
export interface IGuidedModeUIRendererCallbacks {
	getCurrentSession: () => any;
	updateSession: (updates: any) => Promise<void>;
	handleSendMessage: (content: string, metadata?: Record<string, unknown>) => Promise<void>;
	handleGuidedResponse: (userMessage: ChatMessage, messages: ChatMessage[]) => Promise<void>;
	getStoppedMessageIds: () => Set<string>;
}

/**
 * GuidedModeUIRenderer - Renders Guided Mode UI components
 */
export class GuidedModeUIRenderer implements IGuidedModeUIRenderer {
	constructor(
		private plugin: LLMSiderLitePlugin,
		private messageRenderer: MessageRenderer,
		private messageManager: MessageManager,
		private memoryCoordinator: MemoryCoordinator,
		private callbacks: IGuidedModeUIRendererCallbacks
	) {}

	/**
	 * Update Guided Mode message UI
	 * Ensures proper rendering of guided card structure with tools and options
	 */
	public async updateGuidedMessageUI(message: ChatMessage): Promise<void> {
		// FIRST: Check if this message has been stopped - prevent ALL updates
		if (this.callbacks.getStoppedMessageIds().has(message.id)) {
			Logger.debug('Message', message.id, 'has been stopped, skipping ALL updates');
			return;
		}
		
		let messageEl = this.messageRenderer.findMessageElement(message.id);
		
		if (!messageEl) {
			Logger.error('Message element not found for ID:', message.id);
			Logger.error('Searching for element with selector:', `[data-message-id="${message.id}"]`);
			
			// Debug: list all message elements
			const allMessages = document.querySelectorAll('[data-message-id]');
			Logger.error('All message elements in DOM:', Array.from(allMessages).map(el => el.getAttribute('data-message-id')));
			
			Logger.warn('Message element not found, creating new element for ID:', message.id);
			// If element doesn't exist, create it
			this.messageManager.addMessageToUI(message, this.callbacks.getCurrentSession());
			messageEl = this.messageRenderer.findMessageElement(message.id);
			
			if (!messageEl) {
				Logger.error('Failed to create message element even after addMessageToUI!');
				return;
			}
		}
		
		// Check if message has been stopped - if so, don't update it
		const contentEl = messageEl.querySelector('.llmsider-message-content');
		if (contentEl && contentEl.querySelector('.llmsider-stopped-message')) {
			Logger.debug('Message has been stopped, skipping update');
			return;
		}
		
		// Update existing message
		if (message.metadata?.isGuidedQuestion) {
			this.renderGuidedCard(message);
			// Use double requestAnimationFrame to ensure all DOM operations complete
			// This prevents the jumping effect in guided mode
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					this.messageManager.scrollToBottom();
				});
			});
		} else {
			// Regular message update
			// Pass isStreaming flag to disable mermaid placeholders during streaming
			const isStreaming = message.metadata?.isStreaming ?? false;
			this.messageRenderer.updateMessageContent(message.id, message.content as string, isStreaming);
			// Single requestAnimationFrame is sufficient for regular updates
			requestAnimationFrame(() => {
				this.messageManager.scrollToBottom();
			});
		}
	}

	/**
	 * Render or update the guided card UI
	 */
	public renderGuidedCard(message: ChatMessage, isReloaded: boolean = false): void {
		const messageEl = this.messageRenderer.findMessageElement(message.id);
		if (!messageEl) {
			Logger.warn('Message element not found in renderGuidedCard!');
			return;
		}
		
		const hasActualContent = message.content && (message.content as string).length > 0;
		const hasToolCalls = message.metadata?.requiresToolConfirmation && message.metadata?.suggestedToolCalls;
		
		// If no content yet AND no tool calls, keep the three dots loading indicator and return early
		if (!hasActualContent && !hasToolCalls) {
			Logger.debug('No content yet, keeping loading indicator');
			return;
		}
		
		// Now we have content or tool calls, remove the loading indicator
		const contentEl = messageEl.querySelector('.llmsider-message-content');
		if (contentEl) {
			contentEl.classList.remove('llmsider-working-indicator');
			const existingDots = contentEl.querySelector('.llmsider-typing-dots');
			if (existingDots) {
				existingDots.remove();
			}
		}
		
		// Add special class and hide actions
		messageEl.addClass('llmsider-guided-question-message');
		
		const originalContent = messageEl.querySelector('.llmsider-message-content');
		if (originalContent) {
			(originalContent as HTMLElement).style.display = 'none';
		}
		
		// Check if card container already exists
		let cardContainer = messageEl.querySelector('.llmsider-guided-card-container') as HTMLElement;
		
		if (!cardContainer) {
			cardContainer = messageEl.createDiv({ cls: 'llmsider-guided-card-container' });
		}
		
		// Update or create question section
		let questionSection = cardContainer.querySelector('.llmsider-guided-question-section') as HTMLElement;
		
		if (!questionSection) {
			questionSection = cardContainer.createDiv({ cls: 'llmsider-guided-question-section' });
		}
		
		// Update question content
		let questionContent = questionSection.querySelector('.llmsider-guided-question-content') as HTMLElement;
		
		if (!questionContent) {
			questionContent = questionSection.createDiv({ cls: 'llmsider-guided-question-content' });
		}
		
		const contentText = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
		const cleanedContent = this.removeOptionsFromContent(contentText);
		
		Logger.debug('[GuidedRender] renderGuidedCard - cleanedContent length:', cleanedContent.length);
		Logger.debug('[GuidedRender] cleanedContent FULL:', cleanedContent);

		// Clear and re-render content using the same method as Normal Mode
		questionContent.empty();
		// Use renderMarkdownContentPublic directly to avoid streaming buffer issues
		this.messageRenderer.renderMarkdownContentPublic(questionContent, cleanedContent);
		
		// DEBUG: Check if content was actually rendered
		Logger.debug('[GuidedRender] 📊 After renderMarkdownContentPublic:', {
			questionContentExists: !!questionContent,
			hasChildNodes: questionContent.childNodes.length > 0,
			childCount: questionContent.childNodes.length,
			innerHTML: questionContent.innerHTML.substring(0, 100),
			isVisible: questionContent.style.display !== 'none'
		});
		
		// Only hide question section if there's no meaningful content
		if (cleanedContent.trim().length === 0) {
			Logger.debug('[GuidedRender] ⚠️ No content after cleaning, hiding question section');
			questionSection.style.display = 'none';
		} else {
			Logger.debug('[GuidedRender] ✅ Has content, showing question section');
			questionSection.style.display = 'block';
			
			// DEBUG: Check questionSection computed styles and positioning
			const computedStyles = window.getComputedStyle(questionSection);
			const rect = questionSection.getBoundingClientRect();
			Logger.debug('[GuidedRender] 🎨 questionSection computed styles:', {
				display: computedStyles.display,
				visibility: computedStyles.visibility,
				opacity: computedStyles.opacity,
				height: computedStyles.height,
				maxHeight: computedStyles.maxHeight,
				overflow: computedStyles.overflow,
				position: computedStyles.position,
				zIndex: computedStyles.zIndex,
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height_rect: rect.height,
				isInViewport: rect.top >= 0 && rect.bottom <= window.innerHeight
			});
		}
		
		// Handle tool calls if present - BUT ONLY render when streaming is complete
		let lastToolElement: HTMLElement | null = null;
		if (message.metadata?.requiresToolConfirmation && message.metadata?.suggestedToolCalls && !message.metadata?.isFollowUpMessage) {
			// When reloading, treat all messages as completed streaming
			// When live (not reloaded), check actual streaming status
			const isStreaming = isReloaded ? false : (message.metadata?.isStreaming ?? false);
			
			Logger.debug('[GuidedRender] 🎬 Tool call rendering check:');
			Logger.debug('[GuidedRender]   - requiresToolConfirmation:', message.metadata?.requiresToolConfirmation);
			Logger.debug('[GuidedRender]   - isStreaming:', isStreaming);
			Logger.debug('[GuidedRender]   - isReloaded:', isReloaded);
			Logger.debug('[GuidedRender]   - isFollowUpMessage:', message.metadata?.isFollowUpMessage);
			Logger.debug('[GuidedRender]   - suggestedToolCalls count:', (message.metadata?.suggestedToolCalls as any[])?.length || 0);
			
			if (!isStreaming) {
				// Streaming is complete (or message is reloaded), safe to render tool cards now
				Logger.debug('[GuidedRender] ✅ Streaming complete or reloaded, calling renderGuidedToolCallsAsIndependent NOW');
				Logger.debug('[GuidedRender] Timestamp:', new Date().toISOString());
				lastToolElement = this.renderGuidedToolCallsAsIndependent(message, isReloaded);
				Logger.debug('[GuidedRender] ✅ renderGuidedToolCallsAsIndependent returned');
			} else {
				// Still streaming, wait until it's complete
				Logger.debug('[GuidedRender] ⏳ Still streaming, deferring tool card rendering until complete');
			}
		}
		
		// Handle options - check both metadata and content for options
		let optionsToRender = message.metadata?.guidedOptions as string[] | undefined;
		let isMultiSelect = message.metadata?.isMultiSelect || false;
		
		// If no options in metadata, try to extract from content
		if (!optionsToRender || optionsToRender.length === 0) {
			const contentText = typeof message.content === 'string' ? message.content : '';
			
			Logger.debug('[GuidedRender] Checking for options in content, length:', contentText.length);
			Logger.debug('[GuidedRender] Content preview:', contentText.substring(0, 200));
			
			const optionsMatch = contentText.match(/➤CHOICE:(SINGLE|MULTIPLE)\n((?:➤CHOICE:.*\n?)+)/);
			
			if (optionsMatch) {
				Logger.debug('[GuidedRender] Found options using pattern 1');
				isMultiSelect = optionsMatch[1] === 'MULTIPLE';
				const optionsText = optionsMatch[2];
				optionsToRender = optionsText.split('\n')
					.filter(line => line.trim().startsWith('➤CHOICE:'))
					.map(line => line.replace(/^➤CHOICE:\s*/, '').trim())
					.filter(opt => opt.length > 0);
			} else {
				// Fallback: Look for explicit mode marker
				const lines = contentText.split('\n');
				const modeLineIndex = lines.findIndex(line => /➤CHOICE:\s*(SINGLE|MULTIPLE)\s*$/i.test(line));
				
				if (modeLineIndex !== -1) {
					Logger.debug('[GuidedRender] Found options using pattern 2, modeLineIndex:', modeLineIndex);
					const modeLine = lines[modeLineIndex];
					const modeMatch = modeLine.match(/➤CHOICE:\s*(SINGLE|MULTIPLE)\s*$/i);
					if (modeMatch) {
						isMultiSelect = modeMatch[1].toUpperCase() === 'MULTIPLE';
						
						// Extract all option lines after the mode line
						optionsToRender = lines.slice(modeLineIndex + 1)
							.filter(line => line.trim().startsWith('➤CHOICE:'))
							.map(line => line.replace(/^➤CHOICE:\s*/, '').trim())
							.filter(opt => opt.length > 0);
					}
				} else {
					// Fallback 2: No mode marker found - parse ALL ➤CHOICE lines as options
					const choiceLines = lines
						.filter(line => line.trim().startsWith('➤CHOICE:'))
						.map(line => line.replace(/^➤CHOICE:\s*/, '').trim())
						.filter(opt => opt.length > 0);
					
					if (choiceLines.length > 0) {
						Logger.debug('[GuidedRender] Found options using pattern 3, count:', choiceLines.length);
						optionsToRender = choiceLines;
						// Default to single-select when no mode specified
						isMultiSelect = false;
					} else {
						// Fallback 3: Try to detect numbered list as options (1. xxx, 2. xxx, etc.)
						const numberedListPattern = /^(\d+)\.\s+(.+)$/;
						const numberedOptions = lines
							.filter(line => numberedListPattern.test(line.trim()))
							.map(line => {
								const match = line.trim().match(numberedListPattern);
								return match ? match[2].trim() : '';
							})
							.filter(opt => opt.length > 0);
						
						if (numberedOptions.length >= 2) {
							Logger.debug('[GuidedRender] Found options using numbered list pattern, count:', numberedOptions.length);
							optionsToRender = numberedOptions;
							isMultiSelect = false;
						}
					}
				}
			}
			
			Logger.debug('[GuidedRender] Final options extracted:', optionsToRender ? optionsToRender.length : 0, optionsToRender);
		}
		
		// Render options if found
		if (optionsToRender && optionsToRender.length > 0) {
			Logger.debug('[GuidedRender] Rendering options, count:', optionsToRender.length);
			// Update metadata with extracted options
			if (!message.metadata) message.metadata = {};
			message.metadata.guidedOptions = optionsToRender;
			message.metadata.isMultiSelect = isMultiSelect;
			
			// Determine where to render options
			let targetContainer = cardContainer;
			
			// If we have tool calls rendered, we want options to appear AFTER them
			if (lastToolElement) {
				// Check if we already have an independent options container
				let independentOptionsContainer = lastToolElement.nextElementSibling as HTMLElement;
				if (!independentOptionsContainer || !independentOptionsContainer.classList.contains('llmsider-independent-options-container')) {
					independentOptionsContainer = document.createElement('div');
					independentOptionsContainer.className = 'llmsider-independent-options-container';
					// Insert after the last tool element
					lastToolElement.insertAdjacentElement('afterend', independentOptionsContainer);
				}
				targetContainer = independentOptionsContainer;
				
				// Clear options from the original cardContainer to avoid duplication
				const oldOptionsSection = cardContainer.querySelector('.llmsider-guided-options-section');
				if (oldOptionsSection) {
					oldOptionsSection.remove();
				}
			}
			
			this.renderGuidedOptions(targetContainer, message, isReloaded);
			this.messageManager.scrollToBottom();
		}
	}

	/**
	 * Render guided tool calls as independent card messages (not inside AI message)
	 */
	public renderGuidedToolCallsAsIndependent(message: ChatMessage, isReloaded: boolean = false): HTMLElement | null {
		const renderStartTime = Date.now();
		Logger.debug('[ToolCards] ========== START renderGuidedToolCallsAsIndependent ==========');
		Logger.debug('[ToolCards] Message ID:', message.id);
		Logger.debug('[ToolCards] isReloaded:', isReloaded);
		Logger.debug('[ToolCards] Timestamp:', new Date().toISOString());
		
		const toolCalls = message.metadata!.suggestedToolCalls as unknown[];
		Logger.debug('[ToolCards] Tool calls count:', toolCalls?.length || 0);
		
		// If reloaded, build a map of tool results from following 'tool' role messages
		const toolResultsMap = new Map<string, any>();
		if (isReloaded) {
			const currentSession = this.callbacks.getCurrentSession();
			if (currentSession) {
				// Find the index of the current assistant message
				const messageIndex = currentSession.messages.findIndex((m: ChatMessage) => m.id === message.id);
				if (messageIndex !== -1) {
					// Look at subsequent messages for tool results
					for (let i = messageIndex + 1; i < currentSession.messages.length; i++) {
						const msg = currentSession.messages[i];
						// Stop when we hit the next assistant message
						if (msg.role === 'assistant') break;
						// Collect tool result messages
						if (msg.role === 'tool' && msg.metadata?.toolName) {
							toolResultsMap.set(msg.metadata.toolName, {
								result: msg.metadata.toolResult,
								isSuccess: msg.metadata.isSuccess
							});
							Logger.debug('[ToolCards] Found saved tool result for:', msg.metadata.toolName);
						}
					}
				}
			}
		}
		
		const rawContent = typeof message.content === 'string' ? message.content : '';
		const actionDescription = this.removeOptionsFromContent(rawContent);
		Logger.debug('[ToolCards] Action description length:', actionDescription.length);
		
		// Find the parent message element to insert cards after it
		const messageEl = this.messageRenderer.findMessageElement(message.id);
		if (!messageEl) {
			Logger.warn('[ToolCards] ❌ Parent message element not found, cannot insert tool cards');
			return null;
		}
		Logger.debug('[ToolCards] ✓ Found parent message element');
		
		// Check if tool cards already exist - if so, don't recreate them
		const nextSibling = messageEl.nextElementSibling;
		if (nextSibling && nextSibling.classList.contains('llmsider-tool-card-message')) {
			Logger.debug('Tool cards already rendered, skipping re-render');
			// Return the last tool card element
			let lastCard = nextSibling;
			while (lastCard.nextElementSibling && lastCard.nextElementSibling.classList.contains('llmsider-tool-card-message')) {
				lastCard = lastCard.nextElementSibling;
			}
			return lastCard as HTMLElement;
		}
		
		// CRITICAL: Always append after the absolute last tool card or indicator,
		// never relative to the current message position. This prevents mis-ordering
		// when follow-up messages replace waiting indicators mid-flow.
		const chatMessagesContainer = messageEl.closest('.llmsider-chat-messages');
		let insertAfter: Element | null = null;

		if (chatMessagesContainer) {
			const allToolCards = Array.from(chatMessagesContainer.querySelectorAll('.llmsider-tool-card-message'));
			const allIndicators = Array.from(chatMessagesContainer.querySelectorAll('.llmsider-plan-execute-tool-indicator'));
			
			Logger.debug(`[renderGuidedToolCallsAsIndependent] Tool: ${tool.name}, Found ${allToolCards.length} cards, ${allIndicators.length} indicators`);

			const lastToolCard = allToolCards[allToolCards.length - 1];
			const lastIndicator = allIndicators[allIndicators.length - 1];
			
			if (lastToolCard) Logger.debug('[renderGuidedToolCallsAsIndependent] Last tool card:', (lastToolCard as HTMLElement).dataset.toolName);
			if (lastIndicator) Logger.debug('[renderGuidedToolCallsAsIndependent] Last indicator found:', lastIndicator);

			// Determine the absolute last element in the tool flow
			if (lastToolCard && lastIndicator) {
				if (lastIndicator.compareDocumentPosition(lastToolCard) & Node.DOCUMENT_POSITION_PRECEDING) {
					insertAfter = lastIndicator;
					Logger.debug('[ToolCards] 📍 Inserting after last indicator (global)');
				} else {
					insertAfter = lastToolCard;
					Logger.debug('[ToolCards] 📍 Inserting after last tool card (global)');
				}
			} else if (lastToolCard) {
				insertAfter = lastToolCard;
				Logger.debug('[ToolCards] 📍 Inserting after last tool card (global)');
			} else if (lastIndicator) {
				insertAfter = lastIndicator;
				Logger.debug('[ToolCards] 📍 Inserting after last indicator (global)');
			}
		}
		
		// If no tool flow exists yet, insert after the current message
		if (!insertAfter) {
			insertAfter = messageEl;
			Logger.debug('[ToolCards] 📍 No existing tool flow, inserting after message');
		}
		
		Logger.debug(`[renderGuidedToolCallsAsIndependent] Final insertion: ${tool.name} after`, insertAfter);
		
		// Extract purpose statement
		const purposeMatch = actionDescription.match(/^([^。！？\.\!\?]+[。！？\.\!\?]?)/);
		const purposeStatement = purposeMatch ? purposeMatch[1].trim() : '';
		
		// Create purpose message element if we have a purpose statement
		let lastInsertedElement: Element = insertAfter;
		if (purposeStatement) {
			const purposeEl = document.createElement('div');
			purposeEl.className = 'llmsider-message llmsider-assistant';
			purposeEl.style.cssText = 'margin: 8px 0;';
			const purposeContent = purposeEl.createDiv({ cls: 'llmsider-message-content' });
			purposeContent.textContent = purposeStatement;
			
			insertAfter.insertAdjacentElement('afterend', purposeEl);
			lastInsertedElement = purposeEl;
			
			Logger.debug('[GuidedMode] Created purpose message:', purposeStatement);
		}
		
		// Hide the question section
		const questionSection = messageEl.querySelector('.llmsider-guided-question-section') as HTMLElement;
		if (questionSection) {
			questionSection.style.display = 'none';
		}
		
		Logger.debug('[ToolCards] 🔄 Starting to process tool calls...');
		
		toolCalls.forEach((toolCall, index) => {
			Logger.debug('[ToolCards] 🔧 Processing tool call #' + (index + 1));
			const tc = toolCall as any;
			const toolName = tc.name || tc.function?.name || 'Unknown Tool';
			Logger.debug('[ToolCards] Tool name:', toolName);
			
			// Parse tool arguments for display
			let toolParameters: Record<string, unknown> = {};
			try {
				if (tc.function?.arguments) {
					toolParameters = typeof tc.function.arguments === 'string' 
						? JSON.parse(tc.function.arguments) 
						: tc.function.arguments;
				} else if (tc.arguments) {
					toolParameters = typeof tc.arguments === 'string' 
						? JSON.parse(tc.arguments) 
						: tc.arguments;
				} else if (tc.input) {
					toolParameters = tc.input;
				}
				Logger.debug('[ToolCards] ✓ Parsed tool parameters:', Object.keys(toolParameters).length, 'keys');
			} catch (error) {
				Logger.error('[ToolCards] ❌ Failed to parse tool parameters:', error);
				toolParameters = { error: 'Failed to parse parameters' };
			}
			
			// Create independent tool card container
			Logger.debug('[ToolCards] 📦 Creating tool card DOM element...');
			const toolCardEl = document.createElement('div');
			toolCardEl.className = 'llmsider-tool-card-message';
			Logger.debug('[ToolCards] ✓ Tool card element created');
			
			// Insert card after the last inserted element
			Logger.debug('[ToolCards] 📍 Inserting tool card into DOM...');
			lastInsertedElement.insertAdjacentElement('afterend', toolCardEl);
			lastInsertedElement = toolCardEl;
			Logger.debug('[ToolCards] ✓ Tool card inserted into DOM');
			
			// If reloaded, create a read-only card with saved status
			if (isReloaded) {
				Logger.debug('[ToolCards] 🔄 Creating reloaded card...');
				
				const savedResult = toolResultsMap.get(toolName);
				const status = savedResult ? (savedResult.isSuccess ? 'success' : 'error') : 'success';
				const result = savedResult?.result;
				const error = savedResult && !savedResult.isSuccess ? (savedResult.result?.error || 'Tool execution failed') : undefined;
				
				Logger.debug('[ToolCards] Tool result for', toolName, ':', { hasSavedResult: !!savedResult, status, hasResult: !!result });
				
				new ToolResultCard(toolCardEl, {
					toolName: toolName,
					status: status,
					parameters: toolParameters,
					result: result,
					error: error,
					timestamp: new Date(),
					description: actionDescription
				});
				Logger.debug('[ToolCards] ✓ Reloaded card created with', status, 'status');
			} else {
				// Create the tool approval card with pending status
				Logger.debug('[ToolCards] ⏸️ Creating pending approval card...');
				new ToolResultCard(toolCardEl, {
					toolName: toolName,
					status: 'pending',
					parameters: toolParameters,
					timestamp: new Date(),
					description: actionDescription
				}, async () => {
					// Approve callback
					Logger.debug('[ToolCards] ✅ User approved tool:', toolName);
					await this.executeToolWithCard(toolCardEl, toolCall, message);
				}, () => {
					// Cancel callback
					Logger.debug('[ToolCards] ❌ User cancelled tool:', toolName);
					toolCardEl.remove();
				});
				Logger.debug('[ToolCards] ✓ Pending card created with callbacks');
			}
			
			Logger.debug('[ToolCards] 📜 Scrolling to bottom after card #' + (index + 1));
			this.messageManager.scrollToBottom();
		});
		
		const renderDuration = Date.now() - renderStartTime;
		Logger.debug('[ToolCards] ========== ✅ renderGuidedToolCallsAsIndependent COMPLETED ==========');
		Logger.debug('[ToolCards] Total render time:', renderDuration, 'ms');
		Logger.debug('[ToolCards] Tool cards created:', toolCalls.length);
		
		return lastInsertedElement as HTMLElement;
	}

	/**
	 * Render or update guided tool calls - DEPRECATED, use renderGuidedToolCallsAsIndependent instead
	 */
	public renderGuidedToolCalls(cardContainer: HTMLElement, message: ChatMessage, isReloaded: boolean = false): void {
		Logger.debug('renderGuidedToolCalls called (deprecated)');
		
		let toolsSection = cardContainer.querySelector('.llmsider-guided-tools-section') as HTMLElement;
		
		if (!toolsSection) {
			toolsSection = cardContainer.createDiv({ cls: 'llmsider-guided-tools-section' });
		} else {
			toolsSection.empty();
		}
		
		const toolCalls = message.metadata!.suggestedToolCalls as unknown[];
		const actionDescription = typeof message.content === 'string' ? message.content : '';
		
		toolCalls.forEach((toolCall) => {
			const tc = toolCall as any;
			const toolName = tc.name || tc.function?.name || 'Unknown Tool';
			
			let toolParameters: Record<string, unknown> = {};
			try {
				if (tc.function?.arguments) {
					toolParameters = typeof tc.function.arguments === 'string' 
						? JSON.parse(tc.function.arguments) 
						: tc.function.arguments;
				} else if (tc.arguments) {
					toolParameters = typeof tc.arguments === 'string' 
						? JSON.parse(tc.arguments) 
						: tc.arguments;
				} else if (tc.input) {
					toolParameters = tc.input;
				}
			} catch (error) {
				Logger.error('Failed to parse tool parameters:', error);
				toolParameters = { error: 'Failed to parse parameters' };
			}
			
			const toolCardContainer = toolsSection.createDiv({ cls: 'llmsider-tool-card-wrapper' });
			
			if (isReloaded) {
				new ToolResultCard(toolCardContainer, {
					toolName: toolName,
					status: 'success',
					parameters: toolParameters,
					timestamp: new Date(),
					description: actionDescription
				});
			} else {
				new ToolResultCard(toolCardContainer, {
					toolName: toolName,
					status: 'pending',
					parameters: toolParameters,
					timestamp: new Date(),
					description: actionDescription
				}, async () => {
					await this.executeToolWithCard(toolCardContainer, toolCall, message);
				}, () => {
					toolCardContainer.remove();
				});
			}
		});
	}

	/**
	 * Render or update guided options
	 */
	public renderGuidedOptions(cardContainer: HTMLElement, message: ChatMessage, isReloaded: boolean = false): void {
		let optionsSection = cardContainer.querySelector('.llmsider-guided-options-section') as HTMLElement;
		
		if (!optionsSection) {
			optionsSection = cardContainer.createDiv({ cls: 'llmsider-guided-options-section' });
		}
		
		let optionsContainer = optionsSection.querySelector('.llmsider-guided-options') as HTMLElement;
		
		if (optionsContainer) {
			optionsContainer.empty();
		} else {
			optionsContainer = optionsSection.createDiv({ cls: 'llmsider-guided-options' });
		}
		
		const i18n = this.plugin.getI18nManager();
		const options = message.metadata!.guidedOptions as string[];
		const isMultiSelect = message.metadata!.isMultiSelect || false;
		const selectedOptions = new Set<number>();
		
		options.forEach((option, index) => {
			const optionCard = optionsContainer.createDiv({
				cls: 'llmsider-guided-option-card'
			});
			
			if (isReloaded) {
				optionCard.addClass('disabled');
			}
			
			if (isMultiSelect) {
				optionCard.addClass('multi-select-mode');
			}
			
			const badge = optionCard.createEl('div', {
				cls: 'llmsider-guided-option-number',
				text: (index + 1).toString()
			});
			
			const checkmark = optionCard.createDiv({
				cls: 'llmsider-guided-option-checkmark'
			});
			setIcon(checkmark, 'check');
			
			const content = optionCard.createDiv({ cls: 'llmsider-guided-option-content' });
			
			const parts = option.split(' - ');
			const title = parts[0];
			const desc = parts.length > 1 ? parts.slice(1).join(' - ') : '';
			
			content.createEl('div', {
				cls: 'llmsider-guided-option-title',
				text: title
			});
			
			if (desc) {
				content.createEl('div', {
					cls: 'llmsider-guided-option-desc',
					text: desc
				});
			}
			
			// Only add click handler if streaming is complete AND not reloaded
			if (!message.metadata?.isStreaming && !isReloaded) {
				if (isMultiSelect) {
					optionCard.onclick = () => {
						if (selectedOptions.has(index)) {
							selectedOptions.delete(index);
							optionCard.removeClass('selected');
						} else {
							selectedOptions.add(index);
							optionCard.addClass('selected');
						}
					};
				} else {
					let isProcessing = false;
					
					optionCard.onclick = async () => {
						if (isProcessing) return;
						
						isProcessing = true;
						optionCard.addClass('selected');
						optionsContainer.querySelectorAll('.llmsider-guided-option-card').forEach(card => {
							card.addClass('disabled');
							(card as HTMLElement).onclick = null;
						});
						
						// Check for special options
						if (option === i18n?.t('ui.endGuidedMode') || option === 'End guided mode') {
							const endMessage: ChatMessage = {
								id: Date.now().toString(),
								role: 'assistant',
								content: i18n?.t('ui.guidedModeEnded') || 'Guided mode ended.',
								timestamp: Date.now()
							};
							
							this.messageManager.addMessageToUI(endMessage, this.callbacks.getCurrentSession());
							
							const currentSession = this.callbacks.getCurrentSession();
							if (currentSession) {
								currentSession.messages.push(endMessage);
								await this.callbacks.updateSession({
									messages: currentSession.messages
								});
							}
							return;
						}
						
						if (option === i18n?.t('ui.continueWithSuggestions') || option === 'Continue with AI suggestions') {
							const userMessage: ChatMessage = {
								id: Date.now().toString(),
								role: 'user',
								content: 'Please continue with the next suggestions.',
								timestamp: Date.now()
							};
							
							const currentSession = this.callbacks.getCurrentSession();
							if (currentSession) {
								currentSession.messages.push(userMessage);
								await this.callbacks.updateSession({
									messages: currentSession.messages
								});
							}
							
							await this.callbacks.handleGuidedResponse(userMessage, currentSession?.messages || []);
							return;
						}
						
						// Send selected option
						await this.callbacks.handleSendMessage(title, {
							isGuidedOption: true,
							guidedStep: message.metadata?.guidedStepNumber
						});
					};
				}
			}
		});
		
		// Add submit button for multi-select mode
		if (isMultiSelect && !message.metadata?.isStreaming && !isReloaded) {
			const submitContainer = optionsSection.createDiv({ cls: 'llmsider-guided-options-submit' });
			const submitBtn = submitContainer.createEl('button', {
				cls: 'llmsider-guided-submit-btn',
				text: i18n?.t('ui.submitSelection') || 'Submit Selection'
			});
			
			submitBtn.onclick = async () => {
				if (selectedOptions.size === 0) return;
				
				optionsContainer.querySelectorAll('.llmsider-guided-option-card').forEach(card => {
					card.addClass('disabled');
					(card as HTMLElement).onclick = null;
				});
				submitBtn.disabled = true;
				submitBtn.addClass('disabled');
				
				const selectedTitles = Array.from(selectedOptions)
					.map(index => {
						const option = options[index];
						const parts = option.split(' - ');
						return parts[0];
					})
					.join(', ');
				
				await this.callbacks.handleSendMessage(selectedTitles, {
					isGuidedOption: true,
					guidedStep: message.metadata?.guidedStepNumber
				});
			};
		}
		
		this.messageManager.scrollToBottom();
	}

	/**
	 * Add guided message with options to UI
	 */
	public async addGuidedMessageToUI(message: ChatMessage): Promise<void> {
		this.messageManager.addMessageToUI(message, this.callbacks.getCurrentSession());
		
		const currentSession = this.callbacks.getCurrentSession();
		if (currentSession) {
			currentSession.messages.push(message);
			await this.callbacks.updateSession({
				messages: currentSession.messages
			});
		}
		
		const messageEl = this.messageRenderer.findMessageElement(message.id);
		if (!messageEl) return;
		
		// If message has tool calls requiring confirmation
		if (message.metadata?.requiresToolConfirmation && message.metadata?.suggestedToolCalls) {
			const toolsContainer = messageEl.createDiv({ cls: 'llmsider-guided-tools' });
			const toolCalls = message.metadata.suggestedToolCalls;
			const actionDescription = typeof message.content === 'string' ? message.content : '';
			
			toolCalls.forEach((toolCall: any) => {
				const tc = toolCall;
				const toolName = tc.name || tc.function?.name || 'Unknown Tool';
				
				let toolParameters: Record<string, unknown> = {};
				if (tc.function?.arguments) {
					toolParameters = typeof tc.function.arguments === 'string' 
						? JSON.parse(tc.function.arguments) 
						: tc.function.arguments;
				} else if (tc.arguments) {
					toolParameters = typeof tc.arguments === 'string' 
						? JSON.parse(tc.arguments) 
						: tc.arguments;
				} else if (tc.input) {
					toolParameters = tc.input;
				}
				
				const cardContainer = toolsContainer.createDiv();
				
				new ToolResultCard(cardContainer, {
					toolName: toolName,
					status: 'pending',
					parameters: toolParameters,
					timestamp: new Date(),
					description: actionDescription
				}, async () => {
					await this.executeToolWithCard(cardContainer, toolCall, message);
				}, () => {
					cardContainer.remove();
				});
			});
		}
		
		// If message has options, render them as cards
		if (message.metadata?.isGuidedQuestion && message.metadata?.guidedOptions) {
			messageEl.addClass('llmsider-guided-question-message');
			
			const originalContent = messageEl.querySelector('.llmsider-message-content');
			if (originalContent) {
				(originalContent as HTMLElement).style.display = 'none';
			}
			
			const cardContainer = messageEl.createDiv({ cls: 'llmsider-guided-card-container' });
			const questionSection = cardContainer.createDiv({ cls: 'llmsider-guided-question-section' });
			const questionContent = questionSection.createDiv({ cls: 'llmsider-guided-question-content' });
			const contentText = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
			const cleanedContent = this.removeOptionsFromContent(contentText);
			this.messageRenderer.renderMarkdownContentPublic(questionContent, cleanedContent);
			
			if (cleanedContent.trim().length === 0) {
				questionSection.style.display = 'none';
			}
			
			const optionsSection = cardContainer.createDiv({ cls: 'llmsider-guided-options-section' });
			const optionsContainer = optionsSection.createDiv({ cls: 'llmsider-guided-options' });
			const i18n = this.plugin.getI18nManager();
			const options = message.metadata.guidedOptions;
			
			options.forEach((option: string, index: number) => {
				const optionCard = optionsContainer.createDiv({
					cls: 'llmsider-guided-option-card'
				});
				
				const numberBadge = optionCard.createEl('div', {
					cls: 'llmsider-guided-option-number',
					text: (index + 1).toString()
				});
				
				const checkmark = optionCard.createDiv({
					cls: 'llmsider-guided-option-checkmark'
				});
				setIcon(checkmark, 'check');
				
				const content = optionCard.createDiv({ cls: 'llmsider-guided-option-content' });
				const parts = option.split(' - ');
				const title = parts[0];
				const desc = parts.length > 1 ? parts.slice(1).join(' - ') : '';
				
				content.createEl('div', {
					cls: 'llmsider-guided-option-title',
					text: title
				});
				
				if (desc) {
					content.createEl('div', {
						cls: 'llmsider-guided-option-desc',
						text: desc
					});
				}
				
				let isProcessing = false;
				
				optionCard.onclick = async () => {
					if (isProcessing) {
						Logger.debug('Option already being processed, ignoring click');
						return;
					}
					
					isProcessing = true;
					optionCard.addClass('selected');
					optionsContainer.querySelectorAll('.llmsider-guided-option-card').forEach(card => {
						card.addClass('disabled');
						(card as HTMLElement).onclick = null;
					});
					
					if (option === i18n?.t('ui.endGuidedMode') || option === 'End guided mode') {
						const endMessage: ChatMessage = {
							id: Date.now().toString(),
							role: 'assistant',
							content: i18n?.t('ui.guidedModeEnded') || 'Guided mode ended.',
							timestamp: Date.now()
						};
						
						this.messageManager.addMessageToUI(endMessage, this.callbacks.getCurrentSession());
						
						const currentSession = this.callbacks.getCurrentSession();
						if (currentSession) {
							currentSession.messages.push(endMessage);
							await this.callbacks.updateSession({
								messages: currentSession.messages
							});
						}
						return;
					}
					
					if (option === i18n?.t('ui.continueWithSuggestions') || option === 'Continue with AI suggestions') {
						const userMessage: ChatMessage = {
							id: Date.now().toString(),
							role: 'user',
							content: 'Please continue with the next suggestions.',
							timestamp: Date.now()
						};
						
						const currentSession = this.callbacks.getCurrentSession();
						if (currentSession) {
							currentSession.messages.push(userMessage);
							await this.callbacks.updateSession({
								messages: currentSession.messages
							});
						}
						
						await this.callbacks.handleGuidedResponse(userMessage, currentSession?.messages || []);
						return;
					}
					
					await this.callbacks.handleSendMessage(title, {
						isGuidedOption: true,
						guidedStep: message.metadata?.guidedStepNumber
					});
				};
			});
		}
		
		this.messageManager.scrollToBottom();
	}

	/**
	 * Remove option lines (with ➤CHOICE: prefix) from content
	 */
	public removeOptionsFromContent(content: string): string {
		// Remove Memory Update markers
		let cleaned = content.replace(/\[MEMORY_UPDATE\][\s\S]*?\[\/MEMORY_UPDATE\]/g, '');
		
		const incompleteMarkerIndex = cleaned.indexOf('[MEMORY_UPDATE]');
		if (incompleteMarkerIndex !== -1) {
			cleaned = cleaned.substring(0, incompleteMarkerIndex);
		}
		
		// Analyze ➤CHOICE structure
		const hasModeMarker = /➤CHOICE:\s*(SINGLE|MULTIPLE)\s*$/m.test(cleaned);
		const lines = cleaned.split('\n');
		const choiceLines = lines.filter(line => /^\s*➤CHOICE:/i.test(line));
		const optionLines = choiceLines.filter(line => !/^\s*➤CHOICE:\s*(SINGLE|MULTIPLE)\s*$/i.test(line));
		const hasMultipleOptions = optionLines.length >= 2;
		
		// Case 1: Standard guided mode - remove all ➤CHOICE lines
		if (hasModeMarker && hasMultipleOptions) {
			const cleanedLines: string[] = [];
			
			for (const line of lines) {
				const isChoiceLine = /^\s*➤CHOICE:/i.test(line);
				if (!isChoiceLine) {
					cleanedLines.push(line);
				}
			}
			
			const result = cleanedLines.join('\n').trim();
			
			if (!result && content.includes('[MEMORY_UPDATE]')) {
				return this.plugin.i18n.getCurrentLanguage() === 'zh' 
					? '✓ 已记住您提供的信息' 
					: '✓ Information saved to memory';
			}
			
			return result;
		}
		
		// Case 2 & 3: Strip ➤CHOICE: prefix but keep content
		const cleanedLines: string[] = [];
		
		for (const line of lines) {
			if (/^\s*➤CHOICE:\s*(SINGLE|MULTIPLE)\s*$/i.test(line)) {
				continue;
			} else if (/^\s*➤CHOICE:/i.test(line)) {
				const contentAfterMarker = line.replace(/^\s*➤CHOICE:\s*/i, '').trim();
				if (contentAfterMarker) {
					cleanedLines.push(contentAfterMarker);
				}
			} else {
				cleanedLines.push(line);
			}
		}
		
		const result = cleanedLines.join('\n').trim();
		
		if (!result && content.includes('[MEMORY_UPDATE]')) {
			return this.plugin.i18n.getCurrentLanguage() === 'zh' 
				? '✓ 已记住您提供的信息' 
				: '✓ Information saved to memory';
		}
		
		return result;
	}

	/**
	 * Execute a tool in guided mode after user confirmation
	 */
	public async executeGuidedTool(toolCall: unknown, guidedMessage: ChatMessage, buttonElement?: HTMLButtonElement): Promise<void> {
		Logger.debug('executeGuidedTool is deprecated, use executeToolWithCard instead');
		// This method is deprecated but kept for backwards compatibility
		// It will be removed in a future version
	}

	/**
	 * Execute a tool with card status updates
	 */
	public async executeToolWithCard(cardContainer: HTMLElement, toolCall: unknown, guidedMessage: ChatMessage): Promise<void> {
		Logger.debug('Executing tool with card:', toolCall);
		
		try {
			const tc = toolCall as any;
			const toolName = tc.name || tc.function?.name;
			
			// Parse tool arguments
			let toolArgs: unknown = {};
			if (tc.function?.arguments) {
				toolArgs = typeof tc.function.arguments === 'string' 
					? JSON.parse(tc.function.arguments) 
					: tc.function.arguments;
			} else if (tc.arguments) {
				toolArgs = typeof tc.arguments === 'string' 
					? JSON.parse(tc.arguments) 
					: tc.arguments;
			} else if (tc.input) {
				toolArgs = tc.input;
			}
			
			// Special handling for 'create' tool - auto-fill file_text
			if (toolName === 'create') {
				const createArgs = toolArgs as { path?: string; file_text?: string; override?: boolean };
				
				if (!createArgs.file_text || createArgs.file_text.trim() === '') {
					Logger.debug('Create tool missing file_text, attempting to extract from message content');
					
					const messageContent = typeof guidedMessage.content === 'string' ? guidedMessage.content : '';
					
					if (messageContent && messageContent.length > 0) {
						// Try to extract code blocks first
						const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)\n```/g;
						const codeBlocks: string[] = [];
						let match;
						
						while ((match = codeBlockRegex.exec(messageContent)) !== null) {
							codeBlocks.push(match[1]);
						}
						
						if (codeBlocks.length > 0) {
							const largestBlock = codeBlocks.reduce((a, b) => a.length > b.length ? a : b);
							createArgs.file_text = largestBlock.trim();
							Logger.info('✓ Extracted file_text from code block');
						} else {
							// Extract clean text content
							let cleanContent = messageContent;
							cleanContent = cleanContent.replace(/<use_mcp_tool>[\s\S]*?<\/use_mcp_tool>/g, '');
							
							const lines = cleanContent.split('\n');
							const contentLines: string[] = [];
							let inContentSection = false;
							let skipNextEmpty = true;
							
							for (const line of lines) {
								const trimmed = line.trim();
								
								if (!inContentSection && !trimmed) continue;
								
								if (trimmed.match(/^(我将|我会|现在|接下来|然后|下一步|让我|好的，|I will|I'll|Now|Next|Then|Let me|Okay,|Here is|Here's|这是|以下是)/i)) {
									skipNextEmpty = true;
									continue;
								}
								
								if (trimmed.match(/^(使用.*工具|调用.*工具|call.*tool|use.*tool|创建文件|create.*file)/i)) {
									skipNextEmpty = true;
									continue;
								}
								
								if (skipNextEmpty && !trimmed) {
									skipNextEmpty = false;
									continue;
								}
								
								if (trimmed) {
									inContentSection = true;
									skipNextEmpty = false;
								}
								
								contentLines.push(line);
							}
							
							const extractedContent = contentLines.join('\n').trim();
							
							if (extractedContent.length > 0) {
								createArgs.file_text = extractedContent;
								Logger.info('✓ Extracted file_text from cleaned message content');
							}
						}
					}
				}
			}
			
			// Get existing card instance or create new one
			let executingCard: ToolResultCard;
			const existingCardInstance = (cardContainer as any).__toolResultCardInstance as ToolResultCard | undefined;
			
			if (existingCardInstance) {
				// Update existing card to executing status
				Logger.debug('[executeToolWithCard] Updating existing card to executing status');
				existingCardInstance.updateStatus('executing', {
					progressText: this.plugin.i18n.t('ui.preparingTools')
				});
				executingCard = existingCardInstance;
			} else {
				// Fallback: create new card if instance not found
				Logger.warn('[executeToolWithCard] Card instance not found, creating new card');
				cardContainer.empty();
				executingCard = new ToolResultCard(cardContainer, {
					toolName: toolName,
					status: 'executing',
					parameters: toolArgs as any,
					timestamp: new Date(),
					progressText: this.plugin.i18n.t('ui.preparingTools')
				});
			}
			
			await new Promise(resolve => setTimeout(resolve, 100));
			
			const progressMessages: Record<string, string> = {
				'create': this.plugin.i18n.t('ui.creatingFile'),
				'edit': this.plugin.i18n.t('ui.editingFile'),
				'read': this.plugin.i18n.t('ui.readingFile'),
				'search': this.plugin.i18n.t('ui.searchingContent'),
				'list': this.plugin.i18n.t('ui.listingFiles'),
				'move': this.plugin.i18n.t('ui.movingFile'),
				'delete': this.plugin.i18n.t('ui.deletingFile'),
				'default': this.plugin.i18n.t('ui.executingTool')
			};
			const progressText = progressMessages[toolName] || progressMessages['default'];
			executingCard.updateProgress(progressText);
			this.messageManager.scrollToBottom();
			
			// Execute the tool
			const toolManager = this.plugin.getToolManager();
			if (!toolManager) {
				throw new Error('Tool manager not available');
			}
			const result = await toolManager.executeTool(toolName, toolArgs);
			
			if (result.success === false) {
				const errorMsg = result.error || 'Tool execution failed';
				throw new Error(errorMsg);
			}
			
			// Update card to success
			const actionDescription = typeof guidedMessage.content === 'string' ? guidedMessage.content : '';
			executingCard.updateStatus('success', {
				result: result,
				description: actionDescription
			});
			
			this.messageManager.scrollToBottom();
			
			// Create "Waiting for AI response" indicator after the tool card
			const thinkingIndicator = cardContainer.parentElement?.createDiv() || document.createElement('div');
			thinkingIndicator.className = 'llmsider-step-indicator active llmsider-plan-execute-tool-indicator';
			thinkingIndicator.style.cssText = 'margin: 8px 0;';
			
			// Create icon (using bot icon like Normal Mode)
			const icon = thinkingIndicator.createDiv({ cls: 'llmsider-step-icon' });
			setIcon(icon, 'bot');
			
			// Create text
			const textEl = thinkingIndicator.createDiv({ cls: 'llmsider-step-text' });
			textEl.textContent = i18n?.t('common.waitingForAIResponse') || 'Waiting for AI response...';
			textEl.setAttribute('data-followup-streaming-content', '');
			
			// Insert after the card container
			cardContainer.insertAdjacentElement('afterend', thinkingIndicator);
			
			Logger.debug('[executeToolWithCard] Created waiting indicator after tool card');
			this.messageManager.scrollToBottom();
			
			// Add tool result to messages
			const i18n = this.plugin.getI18nManager();
			let toolResultContent = `${i18n?.t('ui.toolExecutedSuccessfully') || 'Tool executed successfully'}: ${toolName}\n\n`;
			
			if (result.result) {
				if (typeof result.result === 'object') {
					toolResultContent += `**Result:**\n\`\`\`json\n${JSON.stringify(result.result, null, 2)}\n\`\`\``;
				} else {
					toolResultContent += `**Result:** ${result.result}`;
				}
			} else if (typeof result === 'object') {
				toolResultContent += `**Result:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
			} else {
				toolResultContent += `**Result:** ${result}`;
			}
			
			const toolResultMessage: ChatMessage = {
				id: Date.now().toString(),
				role: 'assistant',
				content: toolResultContent,
				timestamp: Date.now(),
				metadata: {
					toolResult: true,
					toolName: toolName,
					toolExecutions: [{
						id: Date.now().toString(),
						toolName: toolName,
						parameters: toolArgs,
						result: result,
						status: 'completed',
						timestamp: Date.now()
					}],
					internalMessage: true
				}
			};
			
			const currentSession = this.callbacks.getCurrentSession();
			if (currentSession) {
				currentSession.messages.push(toolResultMessage);
				await this.callbacks.updateSession({
					messages: currentSession.messages
				});
			}
			
			// Let AI decide next steps
			const allMessages = currentSession?.messages || [];
			await this.callbacks.handleGuidedResponse(toolResultMessage, allMessages);
			
		} catch (error) {
			Logger.error('Error executing tool with card:', error);
			
			const errorMsg = error instanceof Error ? error.message : String(error);
			const tc = toolCall as any;
			const toolName = tc.name || tc.function?.name;
			
			// Parse parameters for error card
			let toolArgs: unknown = {};
			if (tc.function?.arguments) {
				toolArgs = typeof tc.function.arguments === 'string' 
					? JSON.parse(tc.function.arguments) 
					: tc.function.arguments;
			} else if (tc.arguments) {
				toolArgs = typeof tc.arguments === 'string' 
					? JSON.parse(tc.arguments) 
					: tc.arguments;
			} else if (tc.input) {
				toolArgs = tc.input;
			}
			
			// Update card to error status with action buttons
			const i18n = this.plugin.getI18nManager();
			const existingCardInstance = (cardContainer as any).__toolResultCardInstance as ToolResultCard | undefined;
			
			if (existingCardInstance) {
				// Update existing card to error status
				Logger.debug('[executeToolWithCard] Updating existing card to error status');
				existingCardInstance.updateStatus('error', {
					error: errorMsg,
					onRegenerateAndRetry: async () => {
						Logger.debug('User chose: Regenerate and Retry for Guided mode tool');
						existingCardInstance.updateStatus('executing', {
							progressText: this.plugin.i18n.t('ui.preparingTools')
						});
						this.messageManager.scrollToBottom();
						
						const regenerationPrompt = `上一次工具执行失败了。工具名称：${toolName}，错误信息：${errorMsg}。请分析错误原因，调整参数后重新调用工具。`;
						await this.callbacks.handleSendMessage(regenerationPrompt);
					},
					onRetry: async () => {
						Logger.debug('User chose: Retry for Guided mode tool');
						await this.executeToolWithCard(cardContainer, toolCall, guidedMessage);
					},
					onSkip: async () => {
						Logger.debug('User chose: Skip for Guided mode tool');
						existingCardInstance.updateStatus('error', {
							error: `${errorMsg} (${i18n?.t('common.skip') || '已跳过'})`
						});
						this.messageManager.scrollToBottom();
						
						const skipMessage = i18n?.t('common.toolExecutionSkipped', { toolName, error: errorMsg }) || 
							`工具 ${toolName} 执行失败已被跳过。错误：${errorMsg}。请继续后续步骤或提供替代方案。`;
						await this.callbacks.handleSendMessage(skipMessage);
					},
					regenerateAndRetryButtonText: i18n?.t('common.regenerateAndRetry') || '重新生成并重试',
					retryButtonText: i18n?.t('common.retry') || '重试',
					skipButtonText: i18n?.t('common.skip') || '跳过'
				});
			} else {
				// Fallback: create new error card if instance not found
				Logger.warn('[executeToolWithCard] Card instance not found for error update, creating new card');
				cardContainer.empty();
				new ToolResultCard(cardContainer, {
					toolName: toolName,
					status: 'error',
					parameters: toolArgs as any,
					error: errorMsg,
					timestamp: new Date(),
					onRegenerateAndRetry: async () => {
						Logger.debug('User chose: Regenerate and Retry for Guided mode tool');
						const cardInstance = (cardContainer as any).__toolResultCardInstance as ToolResultCard | undefined;
						if (cardInstance) {
							cardInstance.updateStatus('executing', {
								progressText: this.plugin.i18n.t('ui.preparingTools')
							});
						} else {
							cardContainer.empty();
							new ToolResultCard(cardContainer, {
								toolName: toolName,
								status: 'executing',
								parameters: toolArgs as any,
								timestamp: new Date()
							});
						}
						this.messageManager.scrollToBottom();
						
						const regenerationPrompt = `上一次工具执行失败了。工具名称：${toolName}，错误信息：${errorMsg}。请分析错误原因，调整参数后重新调用工具。`;
						await this.callbacks.handleSendMessage(regenerationPrompt);
					},
					onRetry: async () => {
						Logger.debug('User chose: Retry for Guided mode tool');
						await this.executeToolWithCard(cardContainer, toolCall, guidedMessage);
					},
					onSkip: async () => {
						Logger.debug('User chose: Skip for Guided mode tool');
						const cardInstance = (cardContainer as any).__toolResultCardInstance as ToolResultCard | undefined;
						if (cardInstance) {
							cardInstance.updateStatus('error', {
								error: `${errorMsg} (${i18n?.t('common.skip') || '已跳过'})`
							});
						} else {
							cardContainer.empty();
							new ToolResultCard(cardContainer, {
								toolName: toolName,
								status: 'error',
								parameters: toolArgs as any,
								error: `${errorMsg} (${i18n?.t('common.skip') || '已跳过'})`,
								timestamp: new Date()
							});
						}
						this.messageManager.scrollToBottom();
						
						const skipMessage = i18n?.t('common.toolExecutionSkipped', { toolName, error: errorMsg }) || 
							`工具 ${toolName} 执行失败已被跳过。错误：${errorMsg}。请继续后续步骤或提供替代方案。`;
						await this.callbacks.handleSendMessage(skipMessage);
					},
					regenerateAndRetryButtonText: i18n?.t('common.regenerateAndRetry') || '重新生成并重试',
					retryButtonText: i18n?.t('common.retry') || '重试',
					skipButtonText: i18n?.t('common.skip') || '跳过'
				});
			}
			
			this.messageManager.scrollToBottom();
		}
	}
}
