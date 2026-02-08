/**
 * Guided Mode Stream Callbacks
 * 
 * Handles streaming responses for Guided Mode conversations:
 * - onStream: Process streaming chunks and update UI
 * - UI state management for message elements
 * - Content cleaning and formatting
 * - Scroll management
 * 
 * Extracted from startGuidedConversationWithMastra to reduce complexity
 */

import { ChatMessage } from '../../types';
import { Logger } from '../../utils/logger';
import type { MessageRenderer } from '../message-renderer';
import type { MessageManager } from '../message-manager';
import type { MemoryCoordinator } from '../memory/memory-coordinator';
import type { GuidedModeUIRenderer } from './guided-mode-ui-renderer';

/**
 * State shared across streaming callbacks
 */
export interface IStreamState {
	chunkCount: number;
	lastChunkTime: number;
	accumulatedContent: string;
	workingMessageEl: HTMLElement | null;
	followUpMessageEl: HTMLElement | null;
	isFollowUpResponse: boolean;
	stepIndicatorsEl: HTMLElement | null;
	toolPlaceholders: Map<string, HTMLElement>; // Track tool call placeholders during streaming
	waitingIndicatorEl: HTMLElement | null; // Track the specific waiting indicator for this stream
}

/**
 * Dependencies required for stream callbacks
 */
export interface IStreamCallbacksDeps {
	messageRenderer: MessageRenderer;
	messageManager: MessageManager;
	memoryCoordinator: MemoryCoordinator;
	guidedModeUIRenderer: GuidedModeUIRenderer;
	getCurrentSession: () => any;
	updateStepIndicator: (el: HTMLElement, step: string, status: string) => void;
	removeStepIndicators: (el: HTMLElement) => void;
}

/**
 * Guided Mode Stream Callbacks Handler
 */
export class GuidedModeStreamCallbacks {
	constructor(
		private deps: IStreamCallbacksDeps
	) {}

	/**
	 * Create onStream callback for agent execution
	 */
	createOnStreamCallback(
		state: IStreamState,
		assistantMessage: ChatMessage,
		messageId: string,
		agentExecuteStartTime: number,
		streamController: AbortController
	): (chunk: string) => void {
		// Throttled scroll function
		let lastScrollTime = 0;
		const scrollThrottleMs = 300;
		const throttledScroll = () => {
			const now = Date.now();
			if (now - lastScrollTime > scrollThrottleMs) {
				this.deps.messageManager.scrollToBottom();
				lastScrollTime = now;
			}
		};

		return (chunk: string) => {
			if (streamController.signal.aborted) return;
			
			state.chunkCount++;
			const now = Date.now();
			const timeSinceLastChunk = now - state.lastChunkTime;
			const timeSinceStart = now - agentExecuteStartTime;
			
			// On first chunk, create message UI and mark AI response as active
			if (state.chunkCount === 1) {
				Logger.debug('[onStream] First chunk - state:', { 
					isFollowUpResponse: state.isFollowUpResponse,
					hasFollowUpMessageEl: !!state.followUpMessageEl,
					hasWaitingIndicatorEl: !!state.waitingIndicatorEl,
					accumulatedContentLength: state.accumulatedContent.length
				});
				Logger.debug('[GuidedMode-Mastra] 📝 First chunk received | Time since execute():', timeSinceStart, 'ms');
								// Remove step indicators as soon as we start receiving content
				if (state.stepIndicatorsEl) {
					this.deps.removeStepIndicators(state.stepIndicatorsEl);
					state.stepIndicatorsEl = null;
				}
							// Only create initial message if this is NOT a follow-up response
			// For follow-up responses, the message will be created by replacing the waiting indicator
			if (!state.isFollowUpResponse) {
				// Add message to UI now that we have content
				this.deps.messageManager.addMessageToUI(assistantMessage, this.deps.getCurrentSession());
				this.deps.messageManager.scrollToBottom();
				
				// Get message element and initialize with guided card structure
				state.workingMessageEl = this.deps.messageRenderer.findMessageElement(messageId);
				if (state.workingMessageEl) {
					state.workingMessageEl.addClass('llmsider-guided-question-message');
					const contentEl = state.workingMessageEl.querySelector('.llmsider-message-content');
					if (contentEl) {
						// Hide original content and create card container as sibling
						(contentEl as HTMLElement).style.display = 'none';
						
						// Check if card container already exists (might have been created by other callbacks)
						let cardContainer = state.workingMessageEl.querySelector('.llmsider-guided-card-container') as HTMLElement;
						if (!cardContainer) {
							cardContainer = state.workingMessageEl.createDiv({ cls: 'llmsider-guided-card-container' });
						}
						
						// Ensure question section exists
						let questionSection = cardContainer.querySelector('.llmsider-guided-question-section') as HTMLElement;
						if (!questionSection) {
							questionSection = cardContainer.createDiv({ cls: 'llmsider-guided-question-section' });
						}
						
						// Ensure question content exists
						let questionContent = questionSection.querySelector('.llmsider-guided-question-content') as HTMLElement;
						if (!questionContent) {
							questionContent = questionSection.createDiv({ cls: 'llmsider-guided-question-content' });
						}
					}
				}
			} else {
				Logger.debug('[onStream] Skipping message creation for follow-up response (will replace waiting indicator)');
			}
		} else {
			// Log state info
			if (state.chunkCount <= 5) {
				Logger.debug('[GuidedMode-Mastra] 📍 Stream state | Chunk #' + state.chunkCount + ' | isFollowUpResponse:', state.isFollowUpResponse, '| hasWorkingMessageEl:', !!state.workingMessageEl);
			}
		}
		
		state.lastChunkTime = now;
		state.accumulatedContent += chunk;
		assistantMessage.content = state.accumulatedContent;
		
		// Handle follow-up response - create message element on first chunk by replacing waiting indicator
		if (state.isFollowUpResponse && state.chunkCount === 1 && !state.followUpMessageEl) {
			Logger.debug('[onStream] First chunk of follow-up response, creating message element');
			
			// Create follow-up message element
			state.followUpMessageEl = document.createElement('div');
			state.followUpMessageEl.addClass('llmsider-message', 'llmsider-assistant', 'llmsider-guided-mode', 'llmsider-guided-question-message');
			state.followUpMessageEl.setAttribute('data-message-id', messageId);
			state.followUpMessageEl.setAttribute('data-role', 'assistant');
			state.followUpMessageEl.setAttribute('data-is-follow-up', 'true'); // Mark as follow-up message
			
			// Create message structure
			const messageContentEl = state.followUpMessageEl.createDiv({ cls: 'llmsider-message-content' });
			messageContentEl.style.display = 'none'; // Hide the plain text content
			
			const cardContainer = state.followUpMessageEl.createDiv({ cls: 'llmsider-guided-card-container' });
			const questionSection = cardContainer.createDiv({ cls: 'llmsider-guided-question-section' });
			const questionContent = questionSection.createDiv({ cls: 'llmsider-guided-question-content' });
			
			// Replace waiting indicator with the new message element
			if (state.waitingIndicatorEl) {
				Logger.debug('[onStream] Replacing waiting indicator with follow-up message');
				state.waitingIndicatorEl.replaceWith(state.followUpMessageEl);
				state.waitingIndicatorEl = null;
				Logger.debug('[onStream] ✓ Replacement complete');
			} else {
				Logger.debug('[onStream] ✗ No waiting indicator found to replace!');
				// Fallback: append to message container
				const messageContainer = document.querySelector('.llmsider-messages') as HTMLElement;
				if (messageContainer) {
					messageContainer.appendChild(state.followUpMessageEl);
				}
			}
		}
		
		// Update streaming content
		const targetElement = state.isFollowUpResponse ? state.followUpMessageEl : state.workingMessageEl;
		if (targetElement) {
			const questionContent = targetElement.querySelector('.llmsider-guided-question-content') as HTMLElement;
			if (questionContent) {
				// Remove memory markers, options, and tool_call XML tags from streaming content
				let displayContent = this.deps.memoryCoordinator.stripMemoryMarkers(state.accumulatedContent);
				displayContent = this.deps.guidedModeUIRenderer.removeOptionsFromContent(displayContent);
				
				// Check if content contains create_file or similar tool calls with file_text parameter
				// This allows users to preview file content before the tool executes
				const hasCreateFileTool = state.accumulatedContent.includes('create_file') || 
										  state.accumulatedContent.includes('file_text');
				
				// Extract and display file content preview if available
				if (hasCreateFileTool) {
					this.updateFileContentPreview(questionContent, state.accumulatedContent);
				}
				
				// Filter out tool_call XML tags (both complete and incomplete)
				displayContent = displayContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
				displayContent = displayContent.replace(/<tool_call>[\s\S]*$/g, '').trim();
				this.deps.messageRenderer.updateStreamingContent(questionContent, displayContent);
				throttledScroll();
			}
		}
	};
	}

	/**
	 * Create a placeholder element for tool call during streaming
	 */
	private createToolPlaceholder(toolCallContent: string): HTMLElement {
		const placeholder = document.createElement('div');
		placeholder.className = 'llmsider-tool-placeholder';
		placeholder.setAttribute('data-tool-placeholder', 'true');
		
		// Extract tool name if available
		const functionMatch = toolCallContent.match(/<function=([^>]+)>/);
		const toolName = functionMatch ? functionMatch[1] : 'Tool';
		
		placeholder.innerHTML = `
			<div class="llmsider-tool-placeholder-content">
				<div class="llmsider-tool-placeholder-icon"></div>
				<div class="llmsider-tool-placeholder-text">${toolName}</div>
			</div>
		`;
		
		return placeholder;
	}

	/**
	 * Update or create file content preview in the streaming response
	 * This extracts file_text parameter and displays it in a collapsible preview
	 */
	private updateFileContentPreview(container: HTMLElement, fullContent: string): void {
		// Try to extract file_text content from accumulated content
		// Support both JSON format and XML tool_call format
		let fileContent = '';
		let fileName = '';
		
		// Try XML format first (more common in streaming)
		const xmlMatch = fullContent.match(/<tool_call>[\s\S]*?<function>create_file<\/function>[\s\S]*?<parameters>([\s\S]*?)<\/parameters>[\s\S]*?<\/tool_call>/);
		if (xmlMatch) {
			try {
				const paramsStr = xmlMatch[1];
				const fileTextMatch = paramsStr.match(/<file_text>([\s\S]*?)<\/file_text>/);
				const pathMatch = paramsStr.match(/<path>([\s\S]*?)<\/path>/);
				
				if (fileTextMatch) {
					fileContent = fileTextMatch[1].trim();
				}
				if (pathMatch) {
					fileName = pathMatch[1].trim();
				}
			} catch (e) {
				// Ignore parsing errors during streaming
			}
		}
		
		// Try JSON format
		if (!fileContent) {
			const jsonMatch = fullContent.match(/\{\s*"file_text"\s*:\s*"([\s\S]*?)"\s*(?:,|})/)
				|| fullContent.match(/"file_text"\s*:\s*"([\s\S]*?)"/);
			if (jsonMatch) {
				fileContent = jsonMatch[1]
					.replace(/\\n/g, '\n')
					.replace(/\\t/g, '\t')
					.replace(/\\"/g, '"')
					.trim();
			}
			
			const pathJsonMatch = fullContent.match(/\{\s*"path"\s*:\s*"([^"]+)"\s*(?:,|})/)
				|| fullContent.match(/"path"\s*:\s*"([^"]+)"/);
			if (pathJsonMatch) {
				fileName = pathJsonMatch[1];
			}
		}
		
		// Only show preview if we have content to display
		if (!fileContent || fileContent.length < 10) {
			return;
		}
		
		// Find or create preview container
		let previewContainer = container.querySelector('.llmsider-file-content-preview') as HTMLElement;
		if (!previewContainer) {
			previewContainer = container.createDiv({ cls: 'llmsider-file-content-preview' });
			
			const header = previewContainer.createDiv({ cls: 'llmsider-file-preview-header' });
			const titleSpan = header.createSpan({ cls: 'llmsider-file-preview-title' });
			titleSpan.textContent = '📝 ';
			const fileNameSpan = titleSpan.createSpan({ cls: 'llmsider-file-preview-filename' });
			fileNameSpan.textContent = fileName || '新建文件';
			
			const toggleBtn = header.createSpan({ 
				cls: 'llmsider-file-preview-toggle',
				text: '展开预览'
			});
			
			const contentEl = previewContainer.createDiv({ cls: 'llmsider-file-preview-content' });
			const pre = contentEl.createEl('pre', { cls: 'llmsider-file-preview-text' });
			const code = pre.createEl('code');
			
			// Toggle functionality
			let isExpanded = false;
			toggleBtn.onclick = () => {
				isExpanded = !isExpanded;
				contentEl.style.display = isExpanded ? 'block' : 'none';
				toggleBtn.textContent = isExpanded ? '收起预览' : '展开预览';
			};
		}
		
		// Update content
		const fileNameSpan = previewContainer.querySelector('.llmsider-file-preview-filename') as HTMLElement;
		if (fileNameSpan && fileName) {
			fileNameSpan.textContent = fileName;
		}
		
		const codeEl = previewContainer.querySelector('.llmsider-file-preview-text code') as HTMLElement;
		if (codeEl) {
			codeEl.textContent = fileContent;
		}
		
		// Show word count
		const wordCount = fileContent.length;
		let statsEl = previewContainer.querySelector('.llmsider-file-preview-stats') as HTMLElement;
		if (!statsEl) {
			const header = previewContainer.querySelector('.llmsider-file-preview-header') as HTMLElement;
			statsEl = header.createSpan({ cls: 'llmsider-file-preview-stats' });
		}
		statsEl.textContent = `${wordCount} 字符`;
	}
}
