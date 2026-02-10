/* eslint-disable @typescript-eslint/no-explicit-any */
import { MarkdownRenderer, Component, App, Notice, MarkdownView, setIcon, Modal } from 'obsidian';
import { Logger } from './../utils/logger';
import { ChatMessage, MessageContent, PlanExecutePhase, PlanExecuteState } from '../types';
import LLMSiderPlugin from '../main';
import { ToolCallPrompter, ToolCallData } from './tool-call-prompter';
import { ToolResultCard, ToolResultData } from './tool-result-card';
import { MessageActions } from './message-actions';
import { PlanExecuteTracker, Task } from '../processors/plan-execute-tracker';
import { getAllBuiltInTools } from '../tools/built-in-tools';
import { renderRestoredDAGPlan, transformSequentialToLinear, type RestoredPlan } from './plan-dag-restoration';


export class MessageRenderer {
	private app: App;
	private plugin: LLMSiderPlugin;
	private xmlBuffer: string = '';
	private isBufferingXml: boolean = false;
	private pendingContent: string = '';
	private toolCallPrompter: ToolCallPrompter;
	private messageActions: MessageActions;
	// Track mermaid blocks being streamed: messageId -> { startIndex, mermaidId, code }[]
	private streamingMermaidBlocks: Map<string, Array<{ startIndex: number; mermaidId: string; code: string; completed: boolean }>> = new Map();
	
	// Throttling for streaming updates
	private streamingThrottleMap: Map<HTMLElement, {
		lastUpdate: number;
		pendingContent: string | null;
		timeoutId: number | null;
	}> = new Map();
	private readonly STREAMING_THROTTLE_MS = 100; // Update at most every 100ms
	private readonly STREAMING_FINAL_DELAY_MS = 50; // Short delay for final update

	constructor(app: App, plugin: LLMSiderPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.toolCallPrompter = new ToolCallPrompter(app, plugin);
		this.messageActions = new MessageActions({
			app: app,
			plugin: plugin,
			i18n: plugin.getI18nManager()
		});
	}

	/**
	 * Render a chat message to a DOM element
	 */
	renderMessage(container: HTMLElement, message: ChatMessage): HTMLElement {
		Logger.debug('[TRACE] renderMessage called for:', message.id);

		// Skip rendering internal messages (used only for AI context)
		if (message.metadata?.internalMessage) {
			return container.createDiv({ cls: 'llmsider-internal-message', attr: { 'style': 'display: none;' } });
		}

		const messageClasses = [`llmsider-message`, `llmsider-${message.role}`];
		
		// Add guided mode class if this is a guided question
		if (message.metadata?.isGuidedQuestion) {
			messageClasses.push('llmsider-guided-mode');
		}

		const messageEl = container.createDiv({ 
			cls: messageClasses.join(' ')
		});
		messageEl.dataset.messageId = message.id;
		
		// Mark error messages with data attribute for styling
		if (message.metadata?.hasError) {
			messageEl.dataset.hasError = 'true';
		}

		// Only show header for system messages or debug mode
		if (message.role === 'system' || this.plugin.settings.debugMode) {
			this.renderMessageHeader(messageEl, message);
		}

		// Message content
		const contentEl = messageEl.createDiv({ cls: 'llmsider-message-content' });

		if (message.role === 'assistant') {
			this.renderAssistantMessage(messageEl, contentEl, message);
		} else if (message.role === 'user') {
			this.renderUserMessage(contentEl, message);
			// Add hover actions for user messages
			this.addUserMessageActions(messageEl, message);
		} else if (message.role === 'system' && message.metadata?.toolResult) {
			// Render system tool result messages as cards
			this.renderToolResultCard(contentEl, message);
		} else {
			this.renderUserMessage(contentEl, message);
		}

		// Message metadata (only in debug mode)
		if (message.metadata && this.plugin.settings.debugMode) {
			this.renderMessageMetadata(messageEl, message);
		}


		return messageEl;
	}

	/**
	 * Render message header with role and timestamp
	 */
	private renderMessageHeader(messageEl: HTMLElement, message: ChatMessage): void {
		const header = messageEl.createDiv({ cls: 'llmsider-message-header' });
		const role = message.role === 'user' ? 'You' : message.role === 'assistant' ? 'AI' : 'System';
		header.createEl('span', { cls: 'llmsider-message-role', text: role });
		
		const timestamp = new Date(message.timestamp).toLocaleTimeString();
		header.createEl('span', { cls: 'llmsider-message-time', text: timestamp });
	}

	/**
	 * Render assistant message with special handling for working indicators and diffs
	 */
	public renderAssistantMessage(messageEl: HTMLElement, contentEl: HTMLElement, message: ChatMessage): void {
		// Check if this is a saved plan message (after reload) - restore tracker
		if (message.metadata?.phase === 'plan' && message.metadata?.planTasks) {
			this.restorePlanTracker(contentEl, message);
			return;
		}

		// Render provider tabs if there are multiple provider responses
		if (message.providerResponses && Object.keys(message.providerResponses).length > 0) {
			this.renderProviderTabsForMessage(messageEl, message);

			// Render content from active provider instead of message.content
			const activeProvider = message.activeProvider || Object.keys(message.providerResponses)[0];
			const activeResponse = message.providerResponses[activeProvider];

			// Always try to render content if activeResponse exists
			// Even if content is empty, we'll show an empty content area (tabs will be visible)
			if (activeResponse) {
				const responseContent = activeResponse.content ? this.extractTextContent(activeResponse.content) : '';
				if (responseContent.trim()) {
					this.renderMarkdownContent(contentEl, responseContent);
				}
				// If content is empty, don't show loading indicator - just leave content empty
				// This allows tabs to be visible during streaming before content arrives
			}
			return; // Don't render the original content
		}

		// Only add "Add Provider" button if there are NO provider tabs
		// (when provider tabs exist, they already have a "+" button)
		if (!message.providerResponses || Object.keys(message.providerResponses).length === 0) {
			// Add "Add Provider" button for multi-provider comparison (shown on hover)
			this.addProviderComparisonButton(messageEl, message);
		}

		// Add action buttons for guided mode messages (after rendering content)
		if (message.metadata?.isGuidedQuestion) {
			this.addMessageActions(messageEl, message);
		}

		// Check if this is a tool result - render with card component
		// NOTE: Don't return early! Assistant messages can have both text content AND tool results
		// We'll render tool cards after rendering the main content below
		const hasToolResult = message.metadata?.toolResult;
		if (hasToolResult && message.role === 'system') {
			// System messages with tool results ONLY show the tool card (no text content)
			this.renderToolResultCard(contentEl, message);
			return;
		}

		// Check if this is a working indicator
		if (message.metadata?.isWorking && message.content === 'working') {
			this.renderWorkingIndicator(contentEl, messageEl);
			return;
		}

		// Check if this is an MCP tool result message (but render as normal assistant message)
		if (message.metadata?.mcpTool && message.metadata?.toolStatus === 'completed') {
			// Add MCP tool indicator before content
			const mcpIndicator = contentEl.createDiv({ cls: 'llmsider-mcp-tool-indicator' });
			mcpIndicator.innerHTML = `
				<span class="mcp-tool-icon">🔧</span>
				<span class="mcp-tool-label">${message.metadata.mcpTool} 工具结果</span>
				<span class="mcp-tool-server">来自 ${message.metadata.mcpServer}</span>
			`;
			
			// Then render content normally as markdown
			this.renderMarkdownContent(contentEl, this.extractTextContent(message.content));
			return;
		}

		// Check if this is other types of MCP messages (keep special rendering)
		if (message.metadata?.mcpTool && message.metadata?.toolStatus !== 'completed') {
			this.renderMCPToolMessage(contentEl, message);
			return;
		}

		// Check if message contains tool call XML and should show prompters
		const textContent = this.extractTextContent(message.content);
		if (this.containsToolCallXML(textContent)) {
			// Render tool call prompters instead of XML content
			this.renderToolCallPrompters(messageEl, message);

			// Also render any non-XML content
			const cleanContent = this.removeToolCallXML(textContent);
			if (cleanContent.trim()) {
				const additionalContentEl = contentEl.createDiv({ cls: 'llmsider-additional-content' });
				this.renderMarkdownContent(additionalContentEl, cleanContent);
			}
			return;
		}

		// Check if diff rendering is enabled for this specific message
		// First check message-level setting, then fall back to global setting
		const messageDiffState = (message.metadata as any)?.diffRenderingEnabled;
		const shouldRenderDiff = messageDiffState !== undefined 
			? messageDiffState 
			: this.plugin.settings.enableDiffRenderingInActionMode;

		Logger.debug('Diff rendering decision:', {
			messageId: message.id,
			messageDiffState: messageDiffState,
			globalSetting: this.plugin.settings.enableDiffRenderingInActionMode,
			finalDecision: shouldRenderDiff
		});

		// Handle different types of diff rendering based on toggle state
		if (shouldRenderDiff && message.metadata?.hasJSDiff) {
			// Will be handled by DiffProcessor
			contentEl.dataset.diffType = 'jsdiff';
			contentEl.dataset.messageId = message.id;
		} else if (shouldRenderDiff && message.metadata?.hasEnhancedDiff) {
			contentEl.dataset.diffType = 'enhanced';
			contentEl.dataset.messageId = message.id;
		} else if (shouldRenderDiff && message.metadata?.hasUnifiedDiff) {
			contentEl.dataset.diffType = 'unified';
			contentEl.dataset.messageId = message.id;
		} else {
			// Regular markdown rendering (either diff disabled or no diff data)
			this.renderMarkdownContent(contentEl, this.extractTextContent(message.content));
		}

		// Add action buttons for assistant messages (unless already added for guided mode)
		// Skip if message is still working/streaming
		if (!message.metadata?.isWorking && !message.metadata?.isGuidedQuestion) {
			this.addMessageActions(messageEl, message);
		}

		// Finally, if this assistant message has tool results, render them AFTER the text content
		if (hasToolResult && message.role === 'assistant') {
			// Create a separate container for tool cards after the text content
			const toolCardContainer = contentEl.createDiv({ cls: 'llmsider-tool-card-container' });
			this.renderToolResultCard(toolCardContainer, message);
		}

		// Render generated images if present
		if (message.metadata?.generatedImages && Array.isArray(message.metadata.generatedImages)) {
			this.renderGeneratedImages(contentEl, message.metadata.generatedImages);
		}
	}

	/**
	 * Render user message as plain text with line breaks
	 */
	private renderUserMessage(contentEl: HTMLElement, message: ChatMessage): void {
		// Handle multimodal content
		if (Array.isArray(message.content)) {
			for (const contentItem of message.content) {
				if (contentItem.type === 'text') {
					// Check if user message contains tool call XML and filter it out
					let textContent = contentItem.text;
					if (this.containsToolCallXML(textContent)) {
						// Remove tool call XML from user message display
						textContent = this.removeToolCallXML(textContent);
					}

					const lines = textContent.split('\n');
					lines.forEach((line, index) => {
						if (index > 0) contentEl.createEl('br');
						contentEl.appendText(line);
					});
				} else if (contentItem.type === 'image') {
					// Render image placeholder for user messages
					const imageEl = contentEl.createEl('div', { cls: 'llmsider-image-placeholder' });
					imageEl.createEl('span', { text: '[Image attached]' });
				}
			}
		} else {
			// Handle string content
			let textContent = message.content;
			if (this.containsToolCallXML(textContent)) {
				// Remove tool call XML from user message display
				textContent = this.removeToolCallXML(textContent);
			}

			const lines = textContent.split('\n');
			lines.forEach((line, index) => {
				if (index > 0) contentEl.createEl('br');
				contentEl.appendText(line);
			});
		}

		// Handle special system messages for tool execution
		if (message.role === 'system' && message.metadata) {
			this.renderSystemMessage(contentEl, message);
		}
	}
	
	/**
	 * Ensure message footer exists and return the actions container
	 */
	private ensureMessageFooter(messageEl: HTMLElement, message: ChatMessage): HTMLElement {
		// Remove existing separate actions container if it exists (legacy structure)
		const existingSeparateActions = messageEl.querySelector(':scope > .llmsider-message-actions');
		if (existingSeparateActions) {
			existingSeparateActions.remove();
		}

		let footer = messageEl.querySelector('.llmsider-message-footer') as HTMLElement;
		let actionsContainer: HTMLElement;

		if (!footer) {
			footer = messageEl.createDiv({ cls: 'llmsider-message-footer' });
			
			// Add timestamp on the left
			const timestamp = footer.createDiv({ cls: 'llmsider-message-timestamp' });
			timestamp.textContent = this.formatTimestamp(message.timestamp);
			
			// Add actions container on the right
			actionsContainer = footer.createDiv({ cls: 'llmsider-message-actions' });
		} else {
			actionsContainer = footer.querySelector('.llmsider-message-actions') as HTMLElement;
			if (!actionsContainer) {
				actionsContainer = footer.createDiv({ cls: 'llmsider-message-actions' });
			} else {
				actionsContainer.empty(); // Clear existing actions to rebuild
			}
		}
		
		return actionsContainer;
	}

	private formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp);
		// Format as YYYY/MM/DD HH:mm:ss
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');
		return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
	}

	/**
	 * Add hover actions for user messages
	 */
	private addUserMessageActions(messageEl: HTMLElement, message: ChatMessage): void {
		const actionsEl = this.ensureMessageFooter(messageEl, message);

		const i18n = this.plugin.getI18nManager();

		// Copy button - for user messages
		const copyBtn = actionsEl.createEl('button', {
			cls: 'llmsider-action-btn',
			title: i18n?.t('messageActions.copyMessage') || 'Copy message',
			attr: { 'aria-label': i18n?.t('messageActions.copyMessage') || 'Copy message' }
		});
		copyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
		</svg>`;
		copyBtn.onclick = () => this.copyUserMessage(message);

		// Edit button - edit user message
		const editBtn = actionsEl.createEl('button', {
			cls: 'llmsider-action-btn',
			title: i18n?.t('messageActions.editMessage') || 'Edit message',
			attr: { 'aria-label': i18n?.t('messageActions.editMessage') || 'Edit message' }
		});
		editBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
			<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
		</svg>`;
		editBtn.onclick = () => this.editMessage(message);
	}

	/**
	 * Copy user message content
	 */
	private async copyUserMessage(message: ChatMessage): Promise<void> {
		const i18n = this.plugin.getI18nManager();
		try {
			const textContent = this.extractTextContent(message.content);
			await navigator.clipboard.writeText(textContent);
			new Notice(i18n?.t('common.copiedToClipboard') || 'Copied to clipboard');
			Logger.debug('Copied user message to clipboard:', textContent.length + ' characters');
		} catch (error) {
			Logger.error('Failed to copy to clipboard:', error);
			new Notice(i18n?.t('common.failedToCopy') || 'Failed to copy');
		}
	}

	/**
	 * Render special system messages (tool execution, detection, etc.)
	 */
	private renderSystemMessage(contentEl: HTMLElement, message: ChatMessage): void {
		const metadata = message.metadata as unknown;
		
		// Add special styling for tool-related messages
		const meta = metadata as any;
		if (meta?.isToolDetection) {
			contentEl.classList.add('llmsider-tool-detection-message');
		} else if (meta?.isToolExecution) {
			contentEl.classList.add('llmsider-tool-execution-message');
			// Add animation for running tools
			if (meta.executionStatus === 'running') {
				contentEl.classList.add('llmsider-tool-running');
			}
		} else if (meta?.isToolExecutionResult) {
			contentEl.classList.add('llmsider-tool-result-message');
			if (meta.executionStatus === 'completed') {
				contentEl.classList.add('llmsider-tool-success');
			} else if (meta.executionStatus === 'failed') {
				contentEl.classList.add('llmsider-tool-error');
			}
		}
	}

	/**
	 * Extract text content from message content (handling both string and multimodal)
	 */
	private extractTextContent(content: string | MessageContent[]): string {
		if (typeof content === 'string') {
			return content;
		}
		
		// Extract text from multimodal content
		return content
			.filter(item => item.type === 'text')
			.map(item => (item as any).text)
			.join('\n');
	}

	/**
	 * Render working indicator with three animated dots
	 */
	private renderWorkingIndicator(contentEl: HTMLElement, messageEl: HTMLElement): void {
		Logger.debug('Rendering working indicator');
		contentEl.classList.add('llmsider-working-indicator');
		
		// Create three animated dots (same as Guided Mode)
		const dotsContainer = contentEl.createEl('div', { cls: 'llmsider-typing-dots' });
		
		// Create the middle dot with animation
		// The ::before and ::after pseudo-elements will create the other two dots
		const middleDot = dotsContainer.createEl('span', { cls: 'llmsider-typing-dot' });
		middleDot.style.cssText = `
			display: inline-block;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--text-muted);
			animation: typing 1.4s infinite both;
			animation-delay: 0.2s;
		`;
		
		// No interval needed - CSS handles the animation
		// Store a flag for cleanup identification
		(messageEl as any).isWorkingIndicator = true;
	}

	/**
	 * Render tool result card
	 */
	private renderToolResultCard(contentEl: HTMLElement, message: ChatMessage): void {
		try {
			// Check if message has toolExecutions metadata
			if (message.metadata?.toolExecutions && message.metadata.toolExecutions.length > 0) {
				const execution = message.metadata.toolExecutions[0];
				
				// Construct ToolResultData from metadata
				const toolData: ToolResultData = {
					toolName: execution.toolName,
					parameters: execution.parameters as any,
					result: execution.result,
					status: execution.status === 'completed' ? 'success' : 
					        execution.status === 'failed' ? 'error' : 'pending',
					timestamp: new Date(execution.timestamp || message.timestamp)
				};
				
				// Create the tool result card
				new ToolResultCard(contentEl, toolData);
			} else if (message.metadata?.toolName) {
				// Construct ToolResultData from metadata + content (backward compatibility)
				const toolData: ToolResultData = {
					toolName: message.metadata.toolName,
					parameters: message.metadata.parameters || {},
					result: message.content, // Content is the result
					status: 'success', // Assume success if no error metadata
					timestamp: new Date(message.timestamp)
				};
				
				// Create the tool result card
				new ToolResultCard(contentEl, toolData);
			} else {
				// Try parsing as JSON (backward compatibility for very old format)
				const toolData: ToolResultData = JSON.parse(message.content as string);
				new ToolResultCard(contentEl, toolData);
			}
		} catch (error) {
			Logger.error('Failed to render tool result card:', error);
			// Fallback to regular text display
			this.renderMarkdownContent(contentEl, message.content as string);
		}
	}

	/**
	 * Render markdown content with error handling (public method)
	 */
	public renderMarkdownContentPublic(contentEl: HTMLElement, content: string, enableMermaidPlaceholder: boolean = true): void {
		this.renderMarkdownContent(contentEl, content, enableMermaidPlaceholder);
	}

	/**
	 * Render markdown content with error handling
	 * Mermaid diagrams are replaced with click-to-render placeholders
	 * @param enableMermaidPlaceholder - If true, replaces complete mermaid blocks with placeholders
	 */
	private renderMarkdownContent(contentEl: HTMLElement, content: string, enableMermaidPlaceholder: boolean = true): void {
		try {
			let processedContent = content;
			let hasAnyMermaid = false;
			let hasIncompleteMermaid = false;
			
			// Strip memory markers (both complete and incomplete)
			processedContent = processedContent.replace(/\[MEMORY_UPDATE\][\s\S]*?\[\/MEMORY_UPDATE\]/g, '');
			const incompleteMarkerIndex = processedContent.indexOf('[MEMORY_UPDATE]');
			if (incompleteMarkerIndex !== -1) {
				processedContent = processedContent.substring(0, incompleteMarkerIndex);
			}
			processedContent = processedContent.trim();
			
			// Handle YAML front matter - render as code block to avoid Obsidian's table rendering
			if (processedContent.trimStart().startsWith('---')) {
				const yamlMatch = processedContent.match(/^---\n([\s\S]*?)\n---/);
				if (yamlMatch) {
					// Replace YAML front matter with a code block
					const yamlContent = yamlMatch[1];
					const restContent = processedContent.substring(yamlMatch[0].length);
					processedContent = `\`\`\`yaml\n${yamlContent}\n\`\`\`${restContent}`;
				}
			}
			
			// First, replace all complete mermaid blocks with placeholders
			if (processedContent.includes('```mermaid')) {
				// Find all mermaid blocks (complete and incomplete)
				const mermaidBlocks: Array<{start: number, end: number, code: string, complete: boolean}> = [];
				let searchPos = 0;
				
				while (true) {
					const startPos = processedContent.indexOf('```mermaid', searchPos);
					if (startPos === -1) break;
					
					// Look for the closing ```
					const contentStart = startPos + 10; // length of '```mermaid'
					const endPos = processedContent.indexOf('```', contentStart);
					
					if (endPos !== -1) {
						// Complete block found
						const code = processedContent.substring(contentStart, endPos);
						mermaidBlocks.push({
							start: startPos,
							end: endPos + 3, // include closing ```
							code: code,
							complete: true
						});
						searchPos = endPos + 3;
					} else {
						// Incomplete block (streaming)
						const code = processedContent.substring(contentStart);
						mermaidBlocks.push({
							start: startPos,
							end: processedContent.length,
							code: code,
							complete: false
						});
						hasIncompleteMermaid = true;
						break; // No more blocks after incomplete one
					}
				}
				
				// Replace blocks from end to start to preserve positions
				for (let i = mermaidBlocks.length - 1; i >= 0; i--) {
					const block = mermaidBlocks[i];
					const mermaidId = block.complete 
						? `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
						: `mermaid-streaming-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
					
					const placeholderClass = block.complete 
						? 'mermaid-placeholder'
						: 'mermaid-placeholder mermaid-streaming';
					
					const placeholder = `<div class="${placeholderClass}" data-mermaid-id="${mermaidId}" data-mermaid-code="${this.escapeHtml(block.code)}"></div>`;
					
					processedContent = processedContent.substring(0, block.start) + 
									 placeholder + 
									 processedContent.substring(block.end);
					hasAnyMermaid = true;
				}
			}
			
			// Render the processed content
			// Unload previous component if exists (for re-renders)
			const existingComponent = (contentEl as any)._llmsiderMarkdownComponent;
			if (existingComponent) {
				existingComponent.unload();
			}
			
			const component = new Component();
			(contentEl as any)._llmsiderMarkdownComponent = component; // Store for cleanup
			
			MarkdownRenderer.render(
				this.app,
				processedContent,
				contentEl,
				'',
				component
			);
			
			// Add click-to-render UI for mermaid placeholders
			if (hasAnyMermaid) {
				this.addMermaidPlaceholders(contentEl);
			}
			
			// Add streaming indicator for incomplete mermaid placeholders
			if (hasIncompleteMermaid) {
				this.addStreamingMermaidIndicators(contentEl);
			}
		} catch (error) {
			Logger.error('Rendering error:', error);
			// Fallback to plain text if markdown rendering fails
			contentEl.createEl('pre', { text: content });
		}
	}

	/**
	 * Escape HTML entities
	 */
	private escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * Unescape HTML entities
	 */
	private unescapeHtml(html: string): string {
		const div = document.createElement('div');
		div.innerHTML = html;
		return div.textContent || '';
	}

	/**
	 * Add click-to-render UI for mermaid placeholders
	 */
	private addMermaidPlaceholders(contentEl: HTMLElement): void {
		const placeholders = contentEl.querySelectorAll('.mermaid-placeholder');
		const i18n = this.plugin.getI18nManager();
		
		placeholders.forEach((placeholder: Element) => {
			const htmlPlaceholder = placeholder as HTMLElement;
			const mermaidId = htmlPlaceholder.dataset.mermaidId;
			const mermaidCode = this.unescapeHtml(htmlPlaceholder.dataset.mermaidCode || '');
			
			// Clear the placeholder and create the UI
			htmlPlaceholder.empty();
			htmlPlaceholder.addClass('llmsider-mermaid-placeholder');
			
			const renderBtn = htmlPlaceholder.createEl('button', {
				cls: 'llmsider-mermaid-render-btn',
				text: i18n?.t('mermaid.clickToRender') || '📊 Click to render Mermaid diagram'
			});
			
			const codePreview = htmlPlaceholder.createEl('div', {
				cls: 'llmsider-mermaid-preview',
				text: mermaidCode.substring(0, 100) + (mermaidCode.length > 100 ? '...' : '')
			});
			
			// Add click handler to render and show in modal
			renderBtn.onclick = async () => {
				try {
					renderBtn.disabled = true;
					renderBtn.textContent = i18n?.t('mermaid.rendering') || '⏳ Rendering...';
					
					// Create modal container
					const modal = document.body.createEl('div', {
						cls: 'llmsider-mermaid-modal'
					});
					
					// Create backdrop
					const backdrop = modal.createEl('div', {
						cls: 'llmsider-mermaid-backdrop'
					});
					
					// Create modal content container with hint
					const modalContent = modal.createEl('div', {
						cls: 'llmsider-mermaid-modal-content'
					});
					
					// Add hint text
					const hint = modalContent.createEl('div', {
						cls: 'llmsider-mermaid-hint',
						text: `${i18n?.t('mermaid.clickOutsideToClose') || 'Click outside to close'} | ${i18n?.t('mermaid.mouseWheelZoom') || 'Mouse wheel to zoom'} | ${i18n?.t('mermaid.dragToView') || 'Drag to view'}`
					});
					
					// Create a container for the mermaid diagram
					const mermaidContainer = modalContent.createEl('div', {
						cls: 'llmsider-mermaid-container'
					});
					
					// Render using Obsidian's markdown renderer which handles mermaid
					const component = new Component();
					await MarkdownRenderer.render(
						this.app,
						'```mermaid\n' + mermaidCode + '\n```',
						mermaidContainer,
						'',
						component
					);

					// Initialize zoom and pan state
					let currentScale = 1;
					const minScale = 0.1;
					const maxScale = 5;
					const zoomSpeed = 0.1;
					
					let isPanning = false;
					let startX = 0;
					let startY = 0;
					let translateX = 0;
					let translateY = 0;

					// Apply transform
					const applyTransform = () => {
						mermaidContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
						mermaidContainer.style.transformOrigin = 'center center';
						mermaidContainer.style.transition = isPanning ? 'none' : 'transform 0.1s ease';
					};

					// Add mouse wheel zoom handler
					modalContent.addEventListener('wheel', (e: WheelEvent) => {
						e.preventDefault();

						// Calculate zoom direction
						const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
						const newScale = Math.max(minScale, Math.min(maxScale, currentScale + delta));

						if (newScale !== currentScale) {
							currentScale = newScale;
							applyTransform();
						}
					}, { passive: false });
					
					// Add drag/pan functionality
					mermaidContainer.style.cursor = 'grab';
					
					mermaidContainer.addEventListener('mousedown', (e: MouseEvent) => {
						if (e.button !== 0) return; // Only left mouse button
						
						isPanning = true;
						mermaidContainer.style.cursor = 'grabbing';
						startX = e.clientX - translateX;
						startY = e.clientY - translateY;
						e.preventDefault();
					});
					
					document.addEventListener('mousemove', (e: MouseEvent) => {
						if (!isPanning) return;
						e.preventDefault();
						
						translateX = e.clientX - startX;
						translateY = e.clientY - startY;
						applyTransform();
					});
					
					document.addEventListener('mouseup', () => {
						if (isPanning) {
							isPanning = false;
							mermaidContainer.style.cursor = 'grab';
						}
					});

					// Close modal when clicking backdrop
					backdrop.onclick = () => {
						component.unload();
						modal.remove();
					};

					// Close modal when clicking outside the content
					modal.onclick = (e) => {
						if (e.target === modal) {
							component.unload();
							modal.remove();
						}
					};

					// Prevent closing when clicking the content itself
					modalContent.onclick = (e) => {
						e.stopPropagation();
					};
					
					// Re-enable button after modal is created
					renderBtn.disabled = false;
					renderBtn.textContent = i18n?.t('mermaid.clickToRender') || '📊 Click to render Mermaid diagram';
					
				} catch (error) {
					Logger.error('Failed to render mermaid:', error);
					const errorMsg = error instanceof Error ? error.message : String(error);
					
					// Show error in Notice instead of in-place
					new Notice(
						(i18n?.t('mermaid.renderError') || '❌ Failed to render Mermaid diagram') + ': ' + errorMsg
					);
					
					// Re-enable button
					renderBtn.disabled = false;
					renderBtn.textContent = i18n?.t('mermaid.clickToRender') || '📊 Click to render Mermaid diagram';
				}
			};
		});
	}

	/**
	 * Add streaming indicator for incomplete mermaid placeholders
	 */
	private addStreamingMermaidIndicators(contentEl: HTMLElement): void {
		const placeholders = contentEl.querySelectorAll('.mermaid-placeholder.mermaid-streaming');
		
		placeholders.forEach((placeholder: Element) => {
			const htmlPlaceholder = placeholder as HTMLElement;
			
			// Clear the placeholder and create the streaming UI
			htmlPlaceholder.empty();
			htmlPlaceholder.addClass('llmsider-mermaid-placeholder');
			htmlPlaceholder.addClass('llmsider-mermaid-streaming');
			
			const streamingIndicator = htmlPlaceholder.createEl('div', {
				cls: 'llmsider-mermaid-streaming-indicator'
			});
			
			streamingIndicator.createEl('span', {
				cls: 'llmsider-mermaid-streaming-icon',
				text: '📊'
			});
			
			streamingIndicator.createEl('span', {
				cls: 'llmsider-mermaid-streaming-text',
				text: 'Mermaid diagram streaming...'
			});
		});
	}

	/**
	 * Add provider comparison button to assistant messages
	 */
	/**
	 * Add close button to a provider tab
	 */
	private addCloseButtonToTab(tab: HTMLElement, message: ChatMessage, messageEl: HTMLElement, providerKey: string): void {
		const providers = Object.keys(message.providerResponses || {});
		
		const closeBtn = tab.createEl('button', {
			cls: 'llmsider-provider-tab-close-btn',
			title: 'Remove this response',
			attr: { 'aria-label': 'Remove this response' }
		});
		closeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="18" y1="6" x2="6" y2="18"></line>
			<line x1="6" y1="6" x2="18" y2="18"></line>
		</svg>`;
		
		closeBtn.onclick = (e) => {
			e.stopPropagation();
			
			// Prevent removing the last provider response
			if (providers.length <= 1) {
				return;
			}
			
			const isActive = providerKey === message.activeProvider;
			
			// If removing the active tab, switch to another tab first
			if (isActive && providers.length > 1) {
				const otherProvider = providers.find(p => p !== providerKey);
				if (otherProvider) {
					message.activeProvider = otherProvider;
				}
			}
			
			// Remove this provider's response
			if (message.providerResponses) {
				delete message.providerResponses[providerKey];
			}
			
			// Re-render the tabs
			this.renderProviderTabsForMessage(messageEl, message);
			
			// If we switched active provider, also update the content
			if (isActive) {
				const contentEl = messageEl.querySelector('.llmsider-message-content');
				if (contentEl && message.activeProvider) {
					// IMPORTANT: Don't use empty() - it removes tabs!
					// Instead, remove all children EXCEPT the tabs container
					const tabsContainer = contentEl.querySelector('.llmsider-message-provider-tabs');
					const children = Array.from(contentEl.children);
					children.forEach(child => {
						if (child !== tabsContainer) {
							child.remove();
						}
					});
					
					// Render the new active provider's content
					const responseContent = message.providerResponses![message.activeProvider].content;
					if (responseContent && typeof responseContent === 'string' && responseContent.trim()) {
						this.renderMarkdownContent(contentEl as HTMLElement, this.extractTextContent(responseContent));
					}
				}
			}
			
			// Dispatch event to save session
			window.dispatchEvent(new CustomEvent('llmsider-provider-tab-removed', {
				detail: { messageId: message.id, providerKey }
			}));
		};
	}
	
	/**
	 * Render provider tabs for a message with multiple provider responses
	 */
	public renderProviderTabsForMessage(messageEl: HTMLElement, message: ChatMessage): void {
// Find the content element
const contentEl = messageEl.querySelector('.llmsider-message-content') as HTMLElement;
if (!contentEl) {
Logger.error('Content element not found for tabs');
return;
}

// Remove any existing tabs inside content
const existingTabsInContent = contentEl.querySelector('.llmsider-message-provider-tabs');
if (existingTabsInContent) {
existingTabsInContent.remove();
}

// Remove the hover "Add Provider" button if it exists (we have "+" in tabs instead)
const existingAddBtn = messageEl.querySelector('.llmsider-add-provider-btn');
if (existingAddBtn) {
existingAddBtn.remove();
}// Create tabs container INSIDE and at the TOP of the content element
const tabsContainer = document.createElement('div');
tabsContainer.className = 'llmsider-message-provider-tabs';
contentEl.insertBefore(tabsContainer, contentEl.firstChild);
		
		// Get all providers (including the main content provider)
		const providers = Object.keys(message.providerResponses || {});
		const activeProvider = message.activeProvider || providers[0];
		
		// Create tab for each provider
		providers.forEach(providerKey => {
			const response = message.providerResponses![providerKey];
			const isActive = providerKey === activeProvider;
			
			const tab = tabsContainer.createDiv({ 
				cls: `llmsider-provider-tab ${isActive ? 'active' : ''}` 
			});
			tab.dataset.providerKey = providerKey;
			
			// Provider icon
			const icon = tab.createSpan({ cls: 'provider-icon' });
			icon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10"></circle>
				<circle cx="12" cy="12" r="3"></circle>
			</svg>`;
			
			// Provider label
			const label = this.getProviderLabel(providerKey);
			tab.createSpan({ cls: 'provider-label', text: label });
			
			// Add close button for all tabs (including active tab)
			this.addCloseButtonToTab(tab, message, messageEl, providerKey);
			
			// Tab click handler
			tab.onclick = () => {
				// Don't switch if already active
				if (providerKey === message.activeProvider) {
					return;
				}
				
				// Update active provider
				const previousActiveProvider = message.activeProvider;
				message.activeProvider = providerKey;
				
				// Update tab states without full re-render
				tabsContainer.querySelectorAll('.llmsider-provider-tab').forEach(t => {
					const tabProviderKey = t.getAttribute('data-provider-key');
					if (tabProviderKey === providerKey) {
						t.classList.add('active');
					} else if (tabProviderKey === previousActiveProvider) {
						t.classList.remove('active');
					}
					// Keep close buttons on all tabs (no need to add/remove)
				});
				
		// Re-render message content with the selected provider's response
		const contentEl = messageEl.querySelector('.llmsider-message-content');
		if (contentEl) {
			// IMPORTANT: Don't use contentEl.empty() as it would remove the tabs!
			// Instead, remove all children EXCEPT the tabs container
			const tabsContainer = contentEl.querySelector('.llmsider-message-provider-tabs');
			const children = Array.from(contentEl.children);
			children.forEach(child => {
				if (child !== tabsContainer) {
					child.remove();
				}
			});
			
			// Render the response content AFTER the tabs
			const responseContent = message.providerResponses![providerKey].content;
			if (responseContent && typeof responseContent === 'string' && responseContent.trim()) {
				this.renderMarkdownContent(contentEl as HTMLElement, this.extractTextContent(responseContent));
			}
			// Don't show loading indicator when switching tabs
			// Loading is only shown when actively streaming (managed by chat-view)
			// If content is empty after switching, just leave it empty
		}
				
				// Dispatch event to save session
				window.dispatchEvent(new CustomEvent('llmsider-provider-tab-switched', {
					detail: { messageId: message.id, providerKey }
				}));
			};
		});
		
		// Add "+" button to add more providers
		const addBtn = tabsContainer.createEl('button', { 
			cls: 'llmsider-provider-tab-add-btn',
			title: 'Compare with another model',
			attr: { 'aria-label': 'Compare with another model' }
		});
		// Use the same git-branch icon for consistency
		addBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="6" y1="3" x2="6" y2="15"></line>
			<circle cx="18" cy="6" r="3"></circle>
			<circle cx="6" cy="18" r="3"></circle>
			<path d="M18 9a9 9 0 0 1-9 9"></path>
		</svg>`;
		addBtn.onclick = (e) => {
			e.stopPropagation();
			window.dispatchEvent(new CustomEvent('llmsider-add-provider-for-message', {
				detail: { 
					messageId: message.id,
					triggerButton: addBtn 
				}
			}));
		};
		
// Tabs are already inserted before the content element, no need to move them
}

	/**
	 * Get human-readable label for a provider
	 */
	private getProviderLabel(providerKey: string): string {
		if (providerKey.includes('::')) {
			const [connectionId, modelId] = providerKey.split('::');
			const connection = this.plugin.settings.connections?.find((c: any) => c.id === connectionId);
			const model = this.plugin.settings.models?.find((m: any) => m.id === modelId && m.connectionId === connectionId);
			if (model && connection) {
				return `${connection.name}: ${model.name}`;
			}
		}
		return providerKey;
	}

	private addProviderComparisonButton(messageEl: HTMLElement, message: ChatMessage): void {
		// Skip for special messages (working indicator, tool results, etc.)
		if (message.metadata?.isWorking || 
		    message.metadata?.toolResult || 
		    message.metadata?.isGuidedQuestion) {
			return;
		}

		// Remove existing button first
		const existingBtn = messageEl.querySelector('.llmsider-add-provider-btn');
		if (existingBtn) {
			existingBtn.remove();
		}

		const i18n = this.plugin.getI18nManager();
		const addProviderBtn = messageEl.createEl('button', {
			cls: 'llmsider-add-provider-btn',
			title: i18n?.t('ui.addModelForComparison') || 'Compare with another model',
			attr: { 'aria-label': i18n?.t('ui.addModelForComparison') || 'Compare with another model' }
		});
		
		// Icon showing git-branch style (representing comparison/branching)
		addProviderBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="6" y1="3" x2="6" y2="15"></line>
			<circle cx="18" cy="6" r="3"></circle>
			<circle cx="6" cy="18" r="3"></circle>
			<path d="M18 9a9 9 0 0 1-9 9"></path>
		</svg>`;
		
		addProviderBtn.onclick = (e) => {
			e.stopPropagation();
			// Dispatch custom event that ChatView will listen to
			window.dispatchEvent(new CustomEvent('llmsider-add-provider-for-message', {
				detail: { 
					messageId: message.id,
					triggerButton: addProviderBtn
				}
			}));
		};
	}

	/**
	 * Add action buttons to assistant messages
	 */
	public addMessageActions(messageEl: HTMLElement, message: ChatMessage): void {

		// Use MCP-specific actions for MCP messages
		if (message.metadata?.mcpTool || message.metadata?.mcpResourceUri) {
			this.addMCPMessageActions(messageEl, message);
			return;
		}

		// For Guided Mode messages with options, show action buttons (copy, generate note)
		// This allows users to copy the question or generate notes from guided conversations
		const metadata = message.metadata as any;
		const isGuidedMode = metadata?.isGuidedQuestion === true;
		const hasOptions = !!metadata?.guidedOptions;
		
		// Don't show action buttons for streaming/loading messages
		// Wait until the message is fully loaded before showing interactive buttons
		const isStreaming = metadata?.isStreaming === true;
		if (isStreaming) {
			Logger.debug('Skipping action buttons for streaming message:', message.id);
			return;
		}
		
		// No longer skip action buttons for guided mode messages
		// Users should be able to copy questions and generate notes

		const actionsEl = this.ensureMessageFooter(messageEl, message);

		// Check if message has text content
		const hasTextContent = typeof message.content === 'string' && message.content.trim().length > 0;
		const hasMultimodalText = Array.isArray(message.content) && message.content.some(item => 
			item.type === 'text' && item.text.trim().length > 0
		);
		const shouldShowDiffButton = hasTextContent || hasMultimodalText;
		
		// Check if multiple file references are present (disables diff/apply functionality)
		const hasMultipleReferences = message.metadata?.hasMultipleReferences === true;

		// Check if message has text reference context (selected text ONLY, not context files)
		const hasTextReference = (metadata as any)?.isSelectedTextMode === true || 
		                         (metadata as any)?.selectedTextContext !== undefined;

		// Add diff toggle button for non-agent mode - only show when there's text/file content AND selected text reference
		// Hide if multiple references are present
		if (!this.plugin.settings.agentMode && shouldShowDiffButton && !hasMultipleReferences && hasTextReference) {
			const i18n = this.plugin.getI18nManager();
			const diffToggleBtn = actionsEl.createEl('button', {
				cls: 'llmsider-action-btn llmsider-diff-toggle-btn',
				title: i18n?.t('messageActions.toggleDiffRendering') || 'Toggle Diff Rendering',
				attr: { 'aria-label': i18n?.t('messageActions.toggleDiffRendering') || 'Toggle Diff Rendering' }
			});

			// Set button appearance based on message-specific or global state
			const messageDiffState = (message.metadata as any)?.diffRenderingEnabled;
			const isDiffEnabled = messageDiffState !== undefined
				? messageDiffState
				: this.plugin.settings.enableDiffRenderingInActionMode;
			
			// Use a git-diff style icon to represent diff rendering
			diffToggleBtn.innerHTML = isDiffEnabled 
				? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<line x1="9" y1="3" x2="9" y2="21"></line>
					<line x1="15" y1="9" x2="15" y2="15"></line>
					<line x1="12" y1="12" x2="18" y2="12"></line>
				</svg>`
				: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<line x1="9" y1="3" x2="9" y2="21"></line>
				</svg>`;
			diffToggleBtn.classList.toggle('diff-enabled', isDiffEnabled);

			diffToggleBtn.onclick = () => this.toggleDiffRendering(messageEl, message);
		}

		// Add apply button for non-agent mode - only show when there's text reference
		// Hide if multiple references are present
		if (!this.plugin.settings.agentMode && !hasMultipleReferences && hasTextReference) {
			const i18n = this.plugin.getI18nManager();
			const applyBtn = actionsEl.createEl('button', {
				cls: 'llmsider-action-btn llmsider-apply-btn',
				title: i18n?.t('messageActions.applyChanges') || 'Apply Changes',
				attr: { 'aria-label': i18n?.t('messageActions.applyChanges') || 'Apply Changes' }
			});
			applyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="20 6 9 17 4 12"></polyline>
			</svg>`;
			applyBtn.onclick = () => this.applyChanges(message);
		}

		// Copy button with dropdown - ALWAYS add for assistant messages
		const i18n = this.plugin.getI18nManager();
		const copyBtnContainer = actionsEl.createEl('div', {
			cls: 'llmsider-action-btn-dropdown-container'
		});
		
		const copyBtn = copyBtnContainer.createEl('button', {
			cls: 'llmsider-action-btn llmsider-copy-dropdown-btn',
			title: i18n?.t('messageActions.copy') || 'Copy',
			attr: { 'aria-label': i18n?.t('messageActions.copy') || 'Copy' }
		});
		copyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
		</svg>`;
		
		const dropdownMenu = copyBtnContainer.createEl('div', {
			cls: 'llmsider-copy-dropdown-menu'
		});
		dropdownMenu.style.display = 'none';
		
		const copyAsMarkdownOption = dropdownMenu.createEl('div', {
			cls: 'llmsider-copy-dropdown-item',
			text: i18n?.t('messageActions.copyAsMarkdown') || 'Copy as Markdown'
		});
		copyAsMarkdownOption.onclick = (e) => {
			e.stopPropagation();
			this.copyAsMarkdown(message);
			dropdownMenu.style.display = 'none';
		};
		
		const copyAsPlainTextOption = dropdownMenu.createEl('div', {
			cls: 'llmsider-copy-dropdown-item',
			text: i18n?.t('messageActions.copyAsPlainText') || 'Copy as Plain Text'
		});
		copyAsPlainTextOption.onclick = (e) => {
			e.stopPropagation();
			this.copyAsPlainText(message);
			dropdownMenu.style.display = 'none';
		};
		
		copyBtn.onclick = (e) => {
			e.stopPropagation();
			const isVisible = dropdownMenu.style.display !== 'none';
			document.querySelectorAll('.llmsider-copy-dropdown-menu').forEach(menu => {
				(menu as HTMLElement).style.display = 'none';
			});
			dropdownMenu.style.display = isVisible ? 'none' : 'block';
		};
		
		document.addEventListener('click', () => {
			dropdownMenu.style.display = 'none';
		});

		// Generate new Note button - ALWAYS add for assistant messages
		const noteBtn = actionsEl.createEl('button', {
			cls: 'llmsider-action-btn',
			title: i18n?.t('messageActions.generateNewNote') || 'Generate new Note',
			attr: { 'aria-label': i18n?.t('messageActions.generateNewNote') || 'Generate new Note' }
		});
		noteBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
			<polyline points="14 2 14 8 20 8"></polyline>
			<line x1="12" y1="18" x2="12" y2="12"></line>
			<line x1="9" y1="15" x2="15" y2="15"></line>
		</svg>`;
		noteBtn.onclick = () => this.generateNewNote(message);

		// Insert at Cursor button - ALWAYS add for assistant messages
		const insertBtn = actionsEl.createEl('button', {
			cls: 'llmsider-action-btn',
			title: i18n?.t('messageActions.insertAtCursor') || 'Insert at Cursor',
			attr: { 'aria-label': i18n?.t('messageActions.insertAtCursor') || 'Insert at Cursor' }
		});
		insertBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="9 10 4 15 9 20"></polyline>
			<path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
		</svg>`;
		insertBtn.onclick = () => this.insertAtCursor(message);

		// Regenerate button - regenerate the response
		const regenerateBtn = actionsEl.createEl('button', {
			cls: 'llmsider-action-btn',
			title: i18n?.t('messageActions.regenerate') || 'Regenerate',
			attr: { 'aria-label': i18n?.t('messageActions.regenerate') || 'Regenerate' }
		});
		regenerateBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="23 4 23 10 17 10"></polyline>
			<polyline points="1 20 1 14 7 14"></polyline>
			<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
		</svg>`;
		regenerateBtn.onclick = () => this.regenerateResponse(message);

		// Add "Compare with other models" button in top-right corner
		// Only show if there are no provider tabs yet (if tabs exist, they have their own "+" button)
		if (!message.providerResponses || Object.keys(message.providerResponses).length === 0) {
			this.addCompareButtonTopRight(messageEl, message);
		}
	}

	/**
	 * Add compare button in the top-right corner of message (for guided mode)
	 * Uses the same style as normal mode's addProviderComparisonButton
	 */
	private addCompareButtonTopRight(messageEl: HTMLElement, message: ChatMessage): void {
		// Remove existing button first
		const existingBtn = messageEl.querySelector('.llmsider-add-provider-btn');
		if (existingBtn) {
			existingBtn.remove();
		}

		const i18n = this.plugin.getI18nManager();
		const addProviderBtn = messageEl.createEl('button', {
			cls: 'llmsider-add-provider-btn',
			title: i18n?.t('ui.addModelForComparison') || 'Compare with another model',
			attr: { 'aria-label': i18n?.t('ui.addModelForComparison') || 'Compare with another model' }
		});
		
		// Icon showing git-branch style (representing comparison/branching)
		addProviderBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="6" y1="3" x2="6" y2="15"></line>
			<circle cx="18" cy="6" r="3"></circle>
			<circle cx="6" cy="18" r="3"></circle>
			<path d="M18 9a9 9 0 0 1-9 9"></path>
		</svg>`;
		
		addProviderBtn.onclick = (e) => {
			e.stopPropagation();
			window.dispatchEvent(new CustomEvent('llmsider-add-provider-for-message', {
				detail: { 
					messageId: message.id,
					triggerButton: addProviderBtn
				}
			}));
		};
	}

	/**
	 * Toggle diff rendering and re-render the message
	 */
	private async toggleDiffRendering(messageEl: HTMLElement, message: ChatMessage): Promise<void> {
		try {
			// Get current message-level diff state, defaulting to global setting
			const currentMessageDiffState = (message.metadata as any)?.diffRenderingEnabled !== undefined
				? (message.metadata as any)?.diffRenderingEnabled
				: this.plugin.settings.enableDiffRenderingInActionMode;
			
			// Toggle the message-level setting
			const newDiffState = !currentMessageDiffState;
			
			// Update message metadata
			if (message.metadata) {
				(message.metadata as any).diffRenderingEnabled = newDiffState;
			}
			
			Logger.debug('Toggled message diff rendering:', {
				messageId: message.id,
				oldState: currentMessageDiffState,
				newState: newDiffState
			});
			
			// Update the toggle button appearance
			const diffToggleBtn = messageEl.querySelector('.llmsider-diff-toggle-btn') as HTMLElement;
			if (diffToggleBtn) {
				// Use a git-diff style icon to represent diff rendering (same as initial render)
				diffToggleBtn.innerHTML = newDiffState 
					? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
						<line x1="9" y1="3" x2="9" y2="21"></line>
						<line x1="15" y1="9" x2="15" y2="15"></line>
						<line x1="12" y1="12" x2="18" y2="12"></line>
					</svg>`
					: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
						<line x1="9" y1="3" x2="9" y2="21"></line>
					</svg>`;
				diffToggleBtn.classList.toggle('diff-enabled', newDiffState);
			}
			
			// Re-render the message content
			const contentEl = messageEl.querySelector('.llmsider-message-content') as HTMLElement;
			if (contentEl) {
				contentEl.empty();
				
				// Handle different types of diff rendering based on new toggle state
				if (newDiffState && message.metadata?.hasJSDiff) {
					contentEl.dataset.diffType = 'jsdiff';
					contentEl.dataset.messageId = message.id;
					// Trigger diff processing - this will be handled by the chat view's diff processor
					if (window.dispatchEvent) {
						const diffEvent = new CustomEvent('llmsider-reprocess-diff', {
							detail: { messageId: message.id, contentEl }
						});
						window.dispatchEvent(diffEvent);
					}
				} else if (newDiffState && message.metadata?.hasEnhancedDiff) {
					contentEl.dataset.diffType = 'enhanced';
					contentEl.dataset.messageId = message.id;
				} else if (newDiffState && message.metadata?.hasUnifiedDiff) {
					contentEl.dataset.diffType = 'unified';
					contentEl.dataset.messageId = message.id;
				} else {
					// Regular markdown rendering (diff disabled or no diff data)
					// If message has diff metadata, use the modified content, otherwise use original content
					const textContent = message.metadata?.modifiedContent || this.extractTextContent(message.content);
					this.renderMarkdownContent(contentEl, textContent);
				}
				
				// Auto-scroll to show the diff content when enabled
				if (newDiffState) {
					// Wait for content to be rendered before scrolling
					setTimeout(() => {
						this.scrollToShowDiff(messageEl, contentEl);
					}, 100);
				}
			}
			
		} catch (error) {
			Logger.error('Failed to toggle diff rendering:', error);
		}
	}

	/**
	 * Scroll to show diff content when toggled on
	 */
	private scrollToShowDiff(messageEl: HTMLElement, contentEl: HTMLElement): void {
		try {
			// Find the scrollable container - use the correct class name
			const chatContainer = messageEl.closest('.llmsider-messages') as HTMLElement;
			if (!chatContainer) {
				Logger.warn('Could not find .llmsider-messages container');
				return;
			}

			Logger.debug('Found chat container, calculating scroll position');

			// Get the bounding rectangles
			const messageRect = messageEl.getBoundingClientRect();
			const contentRect = contentEl.getBoundingClientRect();
			const containerRect = chatContainer.getBoundingClientRect();

			// Calculate if the diff content is fully visible
			const contentTop = contentRect.top;
			const contentBottom = contentRect.bottom;
			const containerTop = containerRect.top;
			const containerBottom = containerRect.bottom;
			
			const isContentFullyVisible = contentTop >= containerTop && contentBottom <= containerBottom;

			Logger.debug('Scroll visibility check:', {
				contentTop,
				contentBottom,
				containerTop,
				containerBottom,
				isContentFullyVisible
			});

			// If content is not fully visible, scroll to show it
			if (!isContentFullyVisible) {
				// Calculate the scroll position to show the entire message
				const messageOffsetTop = messageEl.offsetTop;
				const contentHeight = contentEl.offsetHeight;
				const messageHeight = messageEl.offsetHeight;
				const containerHeight = chatContainer.clientHeight;

				// Calculate scroll target to show the entire diff with some padding
				let scrollTarget;
				if (messageHeight > containerHeight * 0.9) {
					// Message is too tall to fit, scroll to show the top with padding
					scrollTarget = messageOffsetTop - 20;
				} else {
					// Try to center the entire message in view
					scrollTarget = messageOffsetTop - (containerHeight - messageHeight) / 2;
					// Ensure we don't scroll past the top
					scrollTarget = Math.max(0, scrollTarget);
				}

				Logger.debug('Scrolling to position:', scrollTarget);

				// Smooth scroll to the target position
				chatContainer.scrollTo({
					top: scrollTarget,
					behavior: 'smooth'
				});
			} else {
				Logger.debug('Content is already fully visible, no scroll needed');
			}
		} catch (error) {
			Logger.error('Failed to scroll to diff:', error);
		}
	}

	/**
	 * Render message metadata for debug mode
	 */
	private renderMessageMetadata(messageEl: HTMLElement, message: ChatMessage): void {
		const metadata = messageEl.createDiv({ cls: 'llmsider-message-metadata' });
		metadata.createEl('small', { 
			text: `Provider: ${message.metadata?.provider || 'unknown'} | Tokens: ${message.metadata?.tokens || 'unknown'}` 
		});
	}

	/**
	 * Update streaming content with typewriter effect and XML buffering
	 */
	updateStreamingContent(contentEl: HTMLElement, content: string): void {
		// Get or create throttle state for this element
		let throttleState = this.streamingThrottleMap.get(contentEl);
		if (!throttleState) {
			throttleState = {
				lastUpdate: 0,
				pendingContent: null,
				timeoutId: null
			};
			this.streamingThrottleMap.set(contentEl, throttleState);
		}
		
		// Store the latest content
		throttleState.pendingContent = content;
		
		const now = Date.now();
		const timeSinceLastUpdate = now - throttleState.lastUpdate;
		
		// If enough time has passed, update immediately
		if (timeSinceLastUpdate >= this.STREAMING_THROTTLE_MS) {
			this.performStreamingUpdate(contentEl, content);
			throttleState.lastUpdate = now;
			throttleState.pendingContent = null;
			
			// Clear any pending timeout
			if (throttleState.timeoutId !== null) {
				window.clearTimeout(throttleState.timeoutId);
				throttleState.timeoutId = null;
			}
		} else {
			// Schedule an update if one isn't already scheduled
			if (throttleState.timeoutId === null) {
				const delay = this.STREAMING_THROTTLE_MS - timeSinceLastUpdate;
				throttleState.timeoutId = window.setTimeout(() => {
					const state = this.streamingThrottleMap.get(contentEl);
					if (state && state.pendingContent !== null) {
						this.performStreamingUpdate(contentEl, state.pendingContent);
						state.lastUpdate = Date.now();
						state.pendingContent = null;
						state.timeoutId = null;
					}
				}, delay);
			}
		}
	}
	
	/**
	 * Force final update for streaming content (call when streaming completes)
	 */
	flushStreamingContent(contentEl: HTMLElement): void {
		const throttleState = this.streamingThrottleMap.get(contentEl);
		if (throttleState) {
			// Clear any pending timeout
			if (throttleState.timeoutId !== null) {
				window.clearTimeout(throttleState.timeoutId);
				throttleState.timeoutId = null;
			}
			
			// Perform final update if there's pending content
			if (throttleState.pendingContent !== null) {
				this.performStreamingUpdate(contentEl, throttleState.pendingContent);
				throttleState.pendingContent = null;
			}
			
			// Clean up throttle state
			this.streamingThrottleMap.delete(contentEl);
		}
	}
	
	/**
	 * Actually perform the streaming content update
	 */
	private performStreamingUpdate(contentEl: HTMLElement, content: string): void {
		// Use requestAnimationFrame to batch DOM updates with browser's repaint cycle
		requestAnimationFrame(() => {
			try {
				// Process content through XML buffering logic
				const processedContent = this.processStreamingContentWithXmlBuffer(content);

				// IMPORTANT: Don't use empty() - it removes tabs!
				// Instead, remove all children EXCEPT the tabs container
				const tabsContainer = contentEl.querySelector('.llmsider-message-provider-tabs');
				const children = Array.from(contentEl.children);
				children.forEach(child => {
					if (child !== tabsContainer) {
						child.remove();
					}
				});

				// Only render if there's content to display
				if (processedContent.trim()) {
					// Regular markdown rendering
					this.renderMarkdownContent(contentEl, processedContent);
				}
			} catch (error) {
				Logger.error(`Streaming render error:`, error);
				// Fallback: process through XML filter and render as plain text
				const filteredContent = this.removeToolCallXML(content);
				if (filteredContent.trim()) {
					contentEl.textContent = filteredContent;
				}
			}
		});
	}

	/**
	 * Process streaming content with XML buffering to hide tool calls
	 */
	private processStreamingContentWithXmlBuffer(newContent: string): string {
		// This is the complete content so far (accumulated from all streaming chunks)
		const fullContent = newContent;

		// Simple approach: Check if content contains complete tool call XML
		// If it does, filter it out; if not, display as-is
		if (this.containsCompleteToolCallXML(fullContent)) {
			// Contains complete tool call XML, filter it out
			return this.removeToolCallXML(fullContent);
		} else if (this.containsPartialToolCallXML(fullContent)) {
			// Contains partial tool call XML, buffer it (don't display yet)
			return this.getContentBeforePartialXML(fullContent);
		} else {
			// No tool call XML detected, display normally
			return fullContent;
		}
	}

	/**
	 * Check if content contains complete tool call XML blocks
	 */
	private containsCompleteToolCallXML(content: string): boolean {
		return (content.includes('<use_mcp_tool>') && content.includes('</use_mcp_tool>')) ||
			   (content.includes('<function_calls>') && content.includes('</function_calls>')) ||
			   (content.includes('<mcp>') && content.includes('</mcp>')) ||
			   (content.includes('<invoke>') && content.includes('</invoke>'));
	}

	/**
	 * Check if content contains partial (incomplete) tool call XML
	 */
	private containsPartialToolCallXML(content: string): boolean {
		// Check for opening tags without corresponding closing tags
		return (content.includes('<use_mcp_tool>') && !content.includes('</use_mcp_tool>')) ||
			   (content.includes('<function_calls>') && !content.includes('</function_calls>')) ||
			   (content.includes('<mcp>') && !content.includes('</mcp>')) ||
			   (content.includes('<invoke>') && !content.includes('</invoke>')) ||
			   (content.includes('<tool_name>') && !content.includes('</tool_name>')) ||
			   (content.includes('<arguments>') && !content.includes('</arguments>'));
	}

	/**
	 * Get content that appears before any partial XML (safe to display)
	 */
	private getContentBeforePartialXML(content: string): string {
		const xmlStartPatterns = ['<use_mcp_tool>', '<function_calls>', '<mcp>', '<invoke>', '<tool_name>', '<arguments>'];

		let earliestXmlPos = -1;
		for (const pattern of xmlStartPatterns) {
			const pos = content.indexOf(pattern);
			if (pos >= 0 && (earliestXmlPos === -1 || pos < earliestXmlPos)) {
				earliestXmlPos = pos;
			}
		}

		if (earliestXmlPos >= 0) {
			return content.substring(0, earliestXmlPos);
		}

		return content;
	}

	/**
	 * Reset XML buffering state (call when message streaming is complete)
	 */
	public resetXmlBuffer(): void {
		this.xmlBuffer = '';
		this.isBufferingXml = false;
		this.pendingContent = '';
	}

	/**
	 * Get content from active provider tab if multi-provider mode, otherwise use message.content
	 */
	private getActiveProviderContent(message: ChatMessage): string | MessageContent[] {
		// If message has provider responses, use the active provider's content
		if (message.providerResponses && Object.keys(message.providerResponses).length > 0) {
			const activeProvider = message.activeProvider || Object.keys(message.providerResponses)[0];
			const activeResponse = message.providerResponses[activeProvider];
			if (activeResponse && activeResponse.content) {
				return activeResponse.content;
			}
		}
		// Fall back to message.content
		return message.content;
	}

	/**
	 * Copy message content as Markdown
	 */
	private async copyAsMarkdown(message: ChatMessage): Promise<void> {
		const activeContent = this.getActiveProviderContent(message);
		const textContent = this.extractTextContent(activeContent);
		await this.messageActions.copyToClipboard(textContent);
	}

	private async copyAsPlainText(message: ChatMessage): Promise<void> {
		const activeContent = this.getActiveProviderContent(message);
		const textContent = this.extractTextContent(activeContent);
		await this.messageActions.copyAsPlainText(textContent);
	}

	/**
	 * Insert message content at cursor position in active editor
	 */
	private async insertAtCursor(message: ChatMessage): Promise<void> {
		const activeContent = this.getActiveProviderContent(message);
		const textContent = this.extractTextContent(activeContent);
		await this.messageActions.insertAtCursor(textContent);
	}

	/**
	 * Edit user message - remove this message and all subsequent messages, put content back in input
	 */
	private editMessage(message: ChatMessage): void {
		if (message.role !== 'user') {
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('ui.onlyUserMessagesCanBeEdited') || 'Only user messages can be edited');
			return;
		}

		// Dispatch custom event to trigger edit in chat-view
		const event = new CustomEvent('llmsider-edit-message', {
			detail: { messageId: message.id, message }
		});
		window.dispatchEvent(event);
	}

	/**
	 * Regenerate assistant response - resend the previous user prompt
	 */
	private regenerateResponse(message: ChatMessage): void {
		if (message.role !== 'assistant') {
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('ui.canOnlyRegenerateAssistantMessages') || 'Can only regenerate assistant messages');
			return;
		}

		// Dispatch custom event to trigger regeneration in chat-view
		const event = new CustomEvent('llmsider-regenerate-response', {
			detail: { messageId: message.id, message }
		});
		window.dispatchEvent(event);
	}

	/**
	 * Generate new Note from message content
	 */
	private async generateNewNote(message: ChatMessage): Promise<void> {
		const activeContent = this.getActiveProviderContent(message);
		const textContent = this.extractTextContent(activeContent);
		
		// Validate message content
		const i18n = this.plugin.getI18nManager();
		if (message.metadata?.isWorking || textContent === 'working') {
			new Notice(i18n?.t('notifications.messageRenderer.cannotGenerateFromWorkingIndicator') || 'Cannot generate note from working indicator');
			return;
		}
		
		// Use MessageActions with AI title generation enabled for full messages
		await this.messageActions.generateNote(textContent, true);
	}

	/**
	 * Apply message content to current note
	 */
	private async applyChanges(message: ChatMessage): Promise<void> {
		try {
			const activeContent = this.getActiveProviderContent(message);
			const textContent = this.extractTextContent(activeContent);
			
			// Get the active file
			const activeFile = this.app.workspace.getActiveFile();
			if (!activeFile) {
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.messageRenderer.noActiveNoteToApply') || 'No active note found to apply changes to');
				return;
			}

			// Validate message content
			if (!textContent || textContent.trim().length < 1) {
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.messageRenderer.noContentToApply') || 'No content to apply');
				return;
			}

			if (message.metadata?.isWorking || textContent === 'working') {
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.messageRenderer.cannotApplyWorkingIndicator') || 'Cannot apply working indicator');
				return;
			}

			// Check if this is selected text mode
			const isSelectedTextMode = (message.metadata as any)?.isSelectedTextMode;
			const selectedTextContext = (message.metadata as any)?.selectedTextContext;
			const originalContent = (message.metadata as any)?.originalContent;

		if (isSelectedTextMode && selectedTextContext && originalContent) {
			// Selected text mode: replace only the selected portion
			Logger.debug('Applying changes in selected text mode:', {
				selectedText: selectedTextContext.preview,
				originalLength: originalContent.length,
				modifiedLength: textContent.length
			});

				// Read current file content
				const currentFileContent = await this.app.vault.read(activeFile);
				
				// Find and replace the original selected text with modified content
				const selectedText = selectedTextContext.text;
				const modifiedText = textContent.trim();
				
				// Check if the selected text still exists in the file
				const selectedTextIndex = currentFileContent.indexOf(selectedText);
				if (selectedTextIndex === -1) {
					const proceed = confirm(
						'The selected text was not found in the current file. It may have been modified since selection. ' +
						'Do you want to replace the entire file content instead?'
					);
					if (!proceed) return;
					
					// Fallback to full file replacement
					await this.app.vault.modify(activeFile, modifiedText);
					const i18n = this.plugin.getI18nManager();
					new Notice(i18n?.t('notifications.messageRenderer.appliedToEntireFile', { file: activeFile.name }) || `Applied changes to entire file "${activeFile.name}"`);
				} else {
					// Replace only the selected portion
					const newFileContent = 
						currentFileContent.substring(0, selectedTextIndex) +
						modifiedText +
						currentFileContent.substring(selectedTextIndex + selectedText.length);
					
					await this.app.vault.modify(activeFile, newFileContent);
					const i18n = this.plugin.getI18nManager();
					new Notice(i18n?.t('notifications.messageRenderer.appliedToSelectedText', { file: activeFile.name }) || `Applied changes to selected text in "${activeFile.name}"`);
				}
				
		} else {
			// Full file mode: replace entire file content
			Logger.debug('Applying changes in full file mode');

			Logger.debug('Applying changes to active file:', {
				filename: activeFile.name,
					messageId: message.id,
					contentLength: textContent.length
				});

				// Apply the content to the active file
				await this.app.vault.modify(activeFile, textContent);
				
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.messageRenderer.appliedChanges', { file: activeFile.name }) || `Applied changes to ${activeFile.name}`);
			}
			
		} catch (error) {
			Logger.error('Failed to apply changes:', error);
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.messageRenderer.failedToApply', { error: error instanceof Error ? error.message : 'Unknown error' }) || 'Failed to apply changes: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	}

	/**
	 * Show confirmation dialog (simple implementation using confirm)
	 */
	private async showConfirmDialog(title: string, message: string, confirmText: string, cancelText: string): Promise<boolean> {
		return confirm(`${title}\n\n${message}`);
	}

	/**
	 * Check if content contains tool call XML or JSON
	 */
	public containsToolCallXML(content: string): boolean {
		// Check for XML formats
		if (content.includes('<use_mcp_tool>') ||
			   content.includes('<mcp>') ||
			   content.includes('<tool_name>') ||
			   content.includes('<arguments>') ||
			   content.includes('<function_calls>') ||
			   content.includes('<invoke>') ||
			   content.includes('<parameter>')) {
			return true;
		}

		// Check for JSON format (FreeQwen style)
		return this.extractJsonToolCall(content) !== null;
	}

	/**
	 * Remove tool call XML/JSON from content
	 */
	private removeToolCallXML(content: string): string {
		// Check for JSON format first (FreeQwen style)
		const jsonCall = this.extractJsonToolCall(content);
		if (jsonCall) {
			// Remove the JSON block
			return content.replace(jsonCall.fullMatch, '').trim();
		}

		return content
			// Remove various XML tool call formats
			.replace(/<use_mcp_tool[\s\S]*?<\/use_mcp_tool>/g, '')
			.replace(/<mcp[\s\S]*?<\/mcp>/g, '')
			.replace(/<function_calls[\s\S]*?<\/function_calls>/g, '')
			.replace(/<function_calls[\s\S]*?<\/antml:function_calls>/g, '')
			.replace(/<tool_name[\s\S]*?<\/tool_name>/g, '')
			.replace(/<arguments[\s\S]*?<\/arguments>/g, '')
			.replace(/<invoke[\s\S]*?<\/invoke>/g, '')
			.replace(/<parameter[\s\S]*?<\/parameter>/g, '')
			// Clean up any remaining empty lines
			.replace(/\n\s*\n\s*\n/g, '\n\n')
			.trim();
	}

	/**
	 * Render MCP tool-related messages with special styling
	 */
	private renderMCPToolMessage(contentEl: HTMLElement, message: ChatMessage): void {
		const mcpContainer = contentEl.createDiv({ cls: 'llmsider-mcp-message' });
		
		// MCP header with tool icon and server info
		const mcpHeader = mcpContainer.createDiv({ cls: 'llmsider-mcp-header' });
		
		const toolIcon = mcpHeader.createEl('span', { 
			cls: 'llmsider-mcp-icon',
			text: '🔧'
		});
		
		const toolInfo = mcpHeader.createDiv({ cls: 'llmsider-mcp-info' });
		
		// Different display based on tool status
		if (message.metadata?.toolStatus === 'completed') {
			toolInfo.createEl('span', { 
				cls: 'llmsider-mcp-tool-name',
				text: `${message.metadata?.mcpTool} 执行结果`
			});
		} else {
			toolInfo.createEl('span', { 
				cls: 'llmsider-mcp-tool-name',
				text: `MCP Tool: ${message.metadata?.mcpTool}`
			});
		}
		
		if (message.metadata?.mcpServer) {
			toolInfo.createEl('span', { 
				cls: 'llmsider-mcp-server',
				text: `Server: ${message.metadata.mcpServer}`
			});
		}
		
		// MCP content
		const mcpContent = mcpContainer.createDiv({ cls: 'llmsider-mcp-content' });
		
		if (typeof message.content === 'string') {
			// For tool results, display in a more readable format
			if (message.metadata?.toolStatus === 'completed') {
				// Try to parse JSON content for better formatting
				try {
					const parsed = JSON.parse(message.content);
					// If it's valid JSON, display it formatted
					const formattedContent = '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
					this.renderMarkdownContentPublic(mcpContent, formattedContent);
				} catch {
					// If not JSON, treat as plain text but wrap in code block for better readability
					if (message.content.length > 100) {
						const formattedContent = '```\n' + message.content + '\n```';
						this.renderMarkdownContentPublic(mcpContent, formattedContent);
					} else {
						this.renderMarkdownContentPublic(mcpContent, message.content);
					}
				}
			} else {
				// Render the content as markdown
				this.renderMarkdownContentPublic(mcpContent, message.content);
			}
		} else {
			const i18n = this.plugin.getI18nManager();
			mcpContent.createEl('p', { text: i18n?.t('ui.mcpToolResultMultimodal') || 'MCP tool result (multimodal content not supported in display)' });
		}
		
		// Add visual separator
		mcpContainer.createDiv({ cls: 'llmsider-mcp-separator' });
	}

	/**
	 * Enhanced message actions to include MCP-specific actions
	 */
	private addMCPMessageActions(messageEl: HTMLElement, message: ChatMessage): void {
		const actionsContainer = this.ensureMessageFooter(messageEl, message);
		
		// Add MCP resource to context button
		if (message.metadata?.mcpResourceUri) {
			const addResourceBtn = actionsContainer.createEl('button', {
				cls: 'llmsider-message-action',
				title: 'Add MCP resource to context',
				attr: { 'aria-label': 'Add MCP resource to context' }
			});
			addResourceBtn.innerHTML = '🔗';
			addResourceBtn.onclick = async () => {
				try {
					// Get the chat view to access context manager
					const chatLeaves = this.app.workspace.getLeavesOfType('llmsider-chat-view');
					if (chatLeaves.length > 0) {
						const chatView = chatLeaves[0].view as any;
						const contextManager = chatView.contextManager;
						
						if (contextManager && message.metadata?.mcpResourceUri) {
							const result = await contextManager.addMCPResource(message.metadata.mcpResourceUri);
							if (result.success) {
								new Notice(`Added MCP resource to context: ${result.resource?.name}`);
								chatView.updateContextDisplay();
							} else {
								new Notice(result.message);
							}
						}
					}
				} catch (error) {
					Logger.error('Failed to add MCP resource to context:', error);
					const i18n = this.plugin.getI18nManager();
					new Notice(i18n?.t('notifications.messageRenderer.failedToAddMCPResource') || 'Failed to add MCP resource to context');
				}
			};
		}

		// Standard message actions
		this.addStandardMessageActions(actionsContainer, message);
	}

	/**
	 * Add standard message actions (copy, regenerate, etc.)
	 */
	private addStandardMessageActions(container: HTMLElement, message: ChatMessage): void {
		const i18n = this.plugin.getI18nManager();
		// Copy button
		const copyBtn = container.createEl('button', {
			cls: 'llmsider-message-action',
			title: i18n?.t('messageActions.copyMessage') || 'Copy message',
			attr: { 'aria-label': i18n?.t('messageActions.copyMessage') || 'Copy message' }
		});
		copyBtn.innerHTML = '📋';
		copyBtn.onclick = () => {
			const content = typeof message.content === 'string' 
				? message.content 
				: 'Multimodal content cannot be copied';
			navigator.clipboard.writeText(content);
			new Notice(i18n?.t('common.messageCopiedToClipboard') || 'Message copied to clipboard');
		};

		// Edit button (for user messages)
		if (message.role === 'user') {
			const editBtn = container.createEl('button', {
				cls: 'llmsider-message-action',
				title: i18n?.t('messageActions.editAndResend') || 'Edit and resend',
				attr: { 'aria-label': i18n?.t('messageActions.editAndResend') || 'Edit and resend' }
			});
			editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
			</svg>`;
			editBtn.onclick = () => {
				window.dispatchEvent(new CustomEvent('llmsider-edit-message', {
					detail: { messageId: message.id, message }
				}));
			};
		}
	}

	/**
	 * Update content of an existing message element (for streaming)
	 */
	updateMessageContent(messageId: string, newContent: string, isStreaming: boolean = false, message?: ChatMessage): boolean {
		// Find the message element by ID
		const messageEl = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
		if (!messageEl) {
			Logger.warn('Message element not found for ID:', messageId);
			return false;
		}

		// Find the content element within the message
		const contentEl = messageEl.querySelector('.llmsider-message-content') as HTMLElement;
		if (!contentEl) {
			Logger.warn('Content element not found in message:', messageId);
			return false;
		}

		// Update the content
		contentEl.empty();
		
		// Always enable mermaid placeholder handling - it will automatically detect
		// complete vs incomplete mermaid blocks and render accordingly
		this.renderMarkdownContentPublic(contentEl, newContent, true);

		return true;
	}

	/**
	 * Find existing message element by ID
	 */
	findMessageElement(messageId: string): HTMLElement | null {
		return document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
	}

	/**
	 * Add tool call prompter to message
	 */
	public addToolCallPrompter(messageEl: HTMLElement, toolCallData: ToolCallData): HTMLElement {
		return this.toolCallPrompter.createToolCallPrompter(messageEl, toolCallData);
	}

	/**
	 * Update tool call prompter status
	 */
	public updateToolCallPrompter(toolCallId: string, toolCallData: ToolCallData): boolean {
		return this.toolCallPrompter.updateToolCallPrompter(toolCallId, toolCallData);
	}

	/**
	 * Parse tool calls from message content and render prompters
	 */
	public renderToolCallPrompters(messageEl: HTMLElement, message: ChatMessage): void {
		const textContent = this.extractTextContent(message.content);
		const toolCalls = this.parseXMLToolCalls(textContent);

		if (toolCalls.length > 0) {
			const promptersContainer = messageEl.createDiv({ cls: 'llmsider-tool-prompters-container' });

			toolCalls.forEach((toolCall, index) => {
				const toolCallData: ToolCallData = {
					id: `${message.id}-tool-${index}`,
					toolName: toolCall.tool,
					parameters: toolCall.parameters,
					startTime: message.timestamp,
					status: 'running'
				};

				this.toolCallPrompter.createToolCallPrompter(promptersContainer, toolCallData);
			});
		}
	}

	/**
	 * Parse XML or JSON tool calls from content
	 */
	private parseXMLToolCalls(content: string): Array<{tool: string, parameters: unknown}> {
		const toolCalls: Array<{tool: string, parameters: unknown}> = [];

		// 1. Try parsing as JSON (FreeQwen style)
		const jsonCall = this.extractJsonToolCall(content);
		if (jsonCall) {
			toolCalls.push({ tool: jsonCall.tool, parameters: jsonCall.parameters });
		}

		// 2. Parse XML formats
		// Parse MCP wrapper format
		const xmlToolRegex = /<use_mcp_tool>([\s\S]*?)<\/use_mcp_tool>/g;
		let xmlMatch;

		while ((xmlMatch = xmlToolRegex.exec(content)) !== null) {
			const toolContent = xmlMatch[1];
			const toolNameMatch = toolContent.match(/<tool_name>(.*?)<\/tool_name>/);

			if (toolNameMatch) {
				const toolName = toolNameMatch[1].trim();
				let parameters: unknown = {};

				const argumentsMatch = toolContent.match(/<arguments>([\s\S]*?)<\/arguments>/);
				if (argumentsMatch) {
					try {
						parameters = JSON.parse(argumentsMatch[1].trim());
					} catch {
						parameters = { input: argumentsMatch[1].trim() };
					}
				}

				toolCalls.push({ tool: toolName, parameters });
			}
		}

		return toolCalls;
	}

	/**
	 * Restore Plan DAG visualization from saved plan message (after plugin reload)
	 */
	private restorePlanTracker(contentEl: HTMLElement, message: ChatMessage): void {
		try {
			const executionMode = (message.metadata?.executionMode as 'dag' | 'sequential') || 'dag';
			
			Logger.debug('[MessageRenderer] Restoring plan with DAG visualization:', {
				messageId: message.id,
				executionMode,
				hasPlanTasks: !!message.metadata?.planTasks
			});

			// Parse plan data from message content
			const planData: RestoredPlan = JSON.parse(message.content as string);

			Logger.debug('[MessageRenderer] Parsed plan data:', {
				stepsCount: planData.steps?.length,
				executionMode
			});

			// Create DAG container (same as live execution)
			const planElement = contentEl.createDiv({ cls: 'llmsider-plan-dag-container' });
			if (executionMode === 'sequential') {
				planElement.addClass('sequential-mode');
			}

			// Transform plan for sequential mode if needed
			if (executionMode === 'sequential' && planData.steps) {
				transformSequentialToLinear(planData);
			}

			// Render using DAG visualization
			renderRestoredDAGPlan(planData, planElement, this.plugin.getI18nManager());

			Logger.debug('[MessageRenderer] Plan DAG visualization restored successfully');

		} catch (error) {
			Logger.error('[MessageRenderer] Failed to restore plan DAG:', error);
			// Fallback: show the raw JSON if restoration fails
			this.renderMarkdownContent(contentEl, '```json\n' + message.content + '\n```');
		}
	}

	/**
	 * Extract JSON tool call from content using brace balancing
	 */
	private extractJsonToolCall(content: string): {tool: string, parameters: unknown, fullMatch: string} | null {
		const marker = '"tool":';
		const startIdx = content.indexOf(marker);
		if (startIdx === -1) return null;
		
		// Find the opening brace before "tool":
		let openBraceIdx = content.lastIndexOf('{', startIdx);
		if (openBraceIdx === -1) return null;
		
		// Now try to find the matching closing brace
		let balance = 0;
		let inString = false;
		let escape = false;
		
		for (let i = openBraceIdx; i < content.length; i++) {
			const char = content[i];
			
			if (escape) {
				escape = false;
				continue;
			}
			
			if (char === '\\') {
				escape = true;
				continue;
			}
			
			if (char === '"') {
				inString = !inString;
				continue;
			}
			
			if (!inString) {
				if (char === '{') balance++;
				else if (char === '}') {
					balance--;
					if (balance === 0) {
						// Found the end
						const jsonStr = content.substring(openBraceIdx, i + 1);
						try {
							const json = JSON.parse(jsonStr);
							if (json.tool && json.parameters) {
								return { 
									tool: json.tool, 
									parameters: json.parameters,
									fullMatch: jsonStr
								};
							}
						} catch {
							return null;
						}
						return null;
					}
				}
			}
		}
		return null;
	}

	/**
	 * Render generated images from image generation models
	 */
	private renderGeneratedImages(container: HTMLElement, images: Array<{type: string, image_url: {url: string}}>): void {
		const imagesContainer = container.createDiv({ cls: 'llmsider-generated-images' });

		images.forEach((image, index) => {
			if (image.type === 'image_url' && image.image_url?.url) {
				const imageWrapper = imagesContainer.createDiv({ cls: 'llmsider-generated-image-wrapper' });

				const img = imageWrapper.createEl('img', { cls: 'llmsider-generated-image' });
				img.src = image.image_url.url;
				img.alt = `Generated image ${index + 1}`;

				// Add click to view full size
				img.addEventListener('click', () => {
					const modal = new ImagePreviewModal(this.app, image.image_url.url);
					modal.open();
				});

				// Add download button (let CSS handle all styling including hover)
				const downloadBtn = imageWrapper.createEl('button', { 
					cls: 'llmsider-action-btn llmsider-image-download-btn',
					title: 'Download Image',
					attr: { 'aria-label': 'Download Image' }
				});
				setIcon(downloadBtn, 'download');

				downloadBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.downloadImage(image.image_url.url, `generated-image-${Date.now()}.png`);
				});
			}
		});
	}

	/**
	 * Download image to vault root
	 */
	private async downloadImage(dataUrl: string, filename: string): Promise<void> {
		try {
			let arrayBuffer: ArrayBuffer;

			if (dataUrl.startsWith('data:')) {
				// Handle base64 data URL
				const base64Data = dataUrl.split(',')[1];
				const binaryString = window.atob(base64Data);
				const len = binaryString.length;
				const bytes = new Uint8Array(len);
				for (let i = 0; i < len; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				arrayBuffer = bytes.buffer;
			} else {
				// Handle regular URL (fetch it)
				const response = await fetch(dataUrl);
				if (!response.ok) throw new Error('Failed to fetch image');
				arrayBuffer = await response.arrayBuffer();
			}

			// Save to vault root
			let finalPath = filename;
			
			// Check if file already exists, if so, append timestamp to avoid conflict
			if (await this.app.vault.adapter.exists(finalPath)) {
				const extension = filename.split('.').pop();
				const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
				finalPath = `${nameWithoutExt}-${Date.now()}.${extension}`;
			}

			await this.app.vault.createBinary(finalPath, arrayBuffer);
			new Notice(`Image saved to vault: ${finalPath}`);
		} catch (error) {
			Logger.error('Failed to save image to vault:', error);
			new Notice('Failed to save image to vault');
		}
	}
}

/**
 * Modal for previewing generated images
 */
class ImagePreviewModal extends Modal {
	private imageUrl: string;
	private scale = 1;
	private translateX = 0;
	private translateY = 0;
	private isDragging = false;
	private startX = 0;
	private startY = 0;
	private imgEl: HTMLImageElement;
	private onMouseMoveHandler: (e: MouseEvent) => void;
	private onMouseUpHandler: () => void;

	constructor(app: App, imageUrl: string) {
		super(app);
		this.imageUrl = imageUrl;
	}

	onOpen() {
		const { contentEl, modalEl } = this;
		
		modalEl.addClass('llmsider-image-preview-modal');
		
		contentEl.empty();
		contentEl.style.display = 'flex';
		contentEl.style.justifyContent = 'center';
		contentEl.style.alignItems = 'center';
		contentEl.style.padding = '0';
		contentEl.style.position = 'relative';
		contentEl.style.width = '100%';
		contentEl.style.height = '100%';
		contentEl.style.overflow = 'hidden';
		contentEl.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';

		const container = contentEl.createDiv({ cls: 'llmsider-image-preview-container' });
		container.style.width = '100%';
		container.style.height = '100%';
		container.style.display = 'flex';
		container.style.justifyContent = 'center';
		container.style.alignItems = 'center';
		container.style.cursor = 'grab';

		this.imgEl = container.createEl('img');
		this.imgEl.src = this.imageUrl;
		this.imgEl.style.maxWidth = '100%';
		this.imgEl.style.maxHeight = '100%';
		this.imgEl.style.objectFit = 'contain';
		this.imgEl.style.transition = 'transform 0.1s ease-out';
		this.imgEl.style.userSelect = 'none';
		this.imgEl.draggable = false;

		// Zoom with wheel / trackpad pinch
		container.addEventListener('wheel', (e) => {
			e.preventDefault();
			const delta = -e.deltaY;
			const factor = delta > 0 ? 1.1 : 0.9;
			this.zoom(factor);
		}, { passive: false });

		// Pan with mouse
		container.addEventListener('mousedown', (e) => {
			if (e.button !== 0) return;
			this.isDragging = true;
			this.startX = e.clientX - this.translateX;
			this.startY = e.clientY - this.translateY;
			container.style.cursor = 'grabbing';
		});

		this.onMouseMoveHandler = (e: MouseEvent) => {
			if (!this.isDragging) return;
			this.translateX = e.clientX - this.startX;
			this.translateY = e.clientY - this.startY;
			this.updateTransform();
		};

		this.onMouseUpHandler = () => {
			this.isDragging = false;
			container.style.cursor = 'grab';
		};

		window.addEventListener('mousemove', this.onMouseMoveHandler);
		window.addEventListener('mouseup', this.onMouseUpHandler);

		// Controls
		const controls = contentEl.createDiv({ cls: 'llmsider-image-preview-controls' });
		
		const zoomInBtn = controls.createEl('button', { cls: 'llmsider-preview-control-btn', title: 'Zoom In', attr: { 'aria-label': 'Zoom In' } });
		setIcon(zoomInBtn, 'zoom-in');
		zoomInBtn.onclick = () => this.zoom(1.2);

		const zoomOutBtn = controls.createEl('button', { cls: 'llmsider-preview-control-btn', title: 'Zoom Out', attr: { 'aria-label': 'Zoom Out' } });
		setIcon(zoomOutBtn, 'zoom-out');
		zoomOutBtn.onclick = () => this.zoom(0.8);

		const resetBtn = controls.createEl('button', { cls: 'llmsider-preview-control-btn', title: 'Reset', attr: { 'aria-label': 'Reset' } });
		setIcon(resetBtn, 'maximize');
		resetBtn.onclick = () => {
			this.scale = 1;
			this.translateX = 0;
			this.translateY = 0;
			this.updateTransform();
		};

		// Close button in top right
		const closeBtn = contentEl.createEl('div', { 
			cls: 'llmsider-image-modal-close',
			title: 'Close (Esc)'
		});
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.close();
		});

		// Click background to close (if not dragging)
		container.addEventListener('click', (e) => {
			if (e.target === container) {
				this.close();
			}
		});
	}

	private zoom(factor: number) {
		this.scale *= factor;
		this.scale = Math.min(Math.max(this.scale, 0.5), 10);
		this.updateTransform();
	}

	private updateTransform() {
		this.imgEl.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
	}

	onClose() {
		window.removeEventListener('mousemove', this.onMouseMoveHandler);
		window.removeEventListener('mouseup', this.onMouseUpHandler);
		const { contentEl } = this;
		contentEl.empty();
	}
}
