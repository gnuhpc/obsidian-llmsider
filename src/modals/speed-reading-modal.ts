import { App, MarkdownRenderer, Component, Notice } from 'obsidian';
import { Logger } from '../utils/logger';
import type { SpeedReadingResult } from '../features/speed-reading';
import type LLMSiderPlugin from '../main';

// jsMind type definitions
interface JsMindNode {
	id: string;
	topic: string;
	isroot?: boolean;
	parentid?: string;
	direction?: 'left' | 'right';
	children?: JsMindNode[];
}

interface JsMindData {
	meta: {
		name: string;
		author: string;
		version: string;
	};
	format: 'node_array' | 'node_tree';
	data: JsMindNode[] | JsMindNode;
}

declare global {
	interface Window {
		jsMind: any;
	}
}

export class SpeedReadingDrawer {
	private drawerEl: HTMLElement | null = null;
	private contentEl: HTMLElement | null = null;
	private isOpen = false;
	private isStreaming = false;
	private jsMindInstance: any = null;
	private jsMindLoaded = false;
	private lastRenderedMindMap: string = ''; // 缓存已渲染的思维导图内容
	private lastRenderedMindMapHash: string = ''; // 思维导图结构哈希(用于检测实质性变化)
	private mindMapRenderThrottle = 0; // 思维导图渲染节流计数器
	private lastMindMapRenderTime = 0; // 上次渲染时间
	private mindMapRenderDebounceTimer: NodeJS.Timeout | null = null; // 防抖定时器
	private userScrolledUp = false; // 用户是否主动向上滚动
	private scrollListener: ((e: Event) => void) | null = null; // 滚动监听器
	private markdownComponents: Component[] = []; // Track all markdown components for cleanup

	constructor(private app: App, private plugin: LLMSiderPlugin, private containerEl: HTMLElement) {}

	/**
	 * Validate if mindmap JSON structure is complete
	 * @param json The JSON string to validate
	 * @returns true if the JSON has complete structure (meta + data + root node)
	 */
	private isValidMindMapStructure(json: string): boolean {
		if (!json || json.length < 50) {
			return false; // Too short to be a valid mindmap
		}
		
		// Quick check: JSON must end with } and have balanced braces
		const trimmed = json.trim();
		if (!trimmed.endsWith('}')) {
			return false;
		}
		
		// Count braces to check if JSON might be complete
		let braceCount = 0;
		for (const char of trimmed) {
			if (char === '{') braceCount++;
			else if (char === '}') braceCount--;
		}
		
		// If braces don't match, JSON is incomplete
		if (braceCount !== 0) {
			return false;
		}
		
		// Now try to parse
		try {
			const parsed = JSON.parse(json);
			// Check for required structure: meta, data, and root node with topic
			return !!parsed.meta && !!parsed.data && !!parsed.data?.topic;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Send message to chat view and close drawer
	 */
	private async sendMessageToChat(message: string): Promise<void> {
		try {
			// Close the drawer first
			this.close();
			
			// Wait a bit for drawer animation
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Activate chat view
			await this.plugin.activateChatView();
			
			// Get the chat view and send message
			const leaves = this.app.workspace.getLeavesOfType('llmsider-chat-view');
			if (leaves.length > 0) {
				const chatView = leaves[0].view as any;
				if (chatView && typeof chatView.sendMessage === 'function') {
					await chatView.sendMessage(message);
				}
			}
		} catch (error) {
			Logger.error('[SpeedReading] Error sending message to chat:', error);
			new Notice(this.plugin.i18n.t('ui.speedReadingSendMessageFailed'));
		}
	}

	/**
	 * Toggle drawer visibility
	 */
	toggle(result?: SpeedReadingResult): void {
		if (this.isOpen) {
			this.close();
		} else if (result) {
			this.open(result);
		}
	}

	/**
	 * Check if drawer is open
	 */
	isDrawerOpen(): boolean {
		return this.isOpen;
	}

	/**
	 * Open drawer with result
	 */
	open(result: SpeedReadingResult, streaming = false): void {
		if (this.isOpen) {
			this.updateContent(result);
			return;
		}

		this.isStreaming = streaming;

		// Try to find the plugin container, otherwise use body (full screen mode)
		const pluginContainer = this.containerEl.closest('.llmsider-container') as HTMLElement;
		const targetContainer = pluginContainer || this.containerEl;
		const isFullScreen = !pluginContainer;
		
		// Ensure plugin container has position relative for absolute positioning
		if (!isFullScreen && getComputedStyle(targetContainer).position === 'static') {
			targetContainer.style.setProperty('position', 'relative', 'important');
		}
		
		// Create drawer container with modern design
		this.drawerEl = targetContainer.createDiv({ cls: 'llmsider-speed-reading-drawer' });
		
		// Modern drawer positioning and styling
		if (isFullScreen) {
			// Full screen mode: fixed positioning
			this.drawerEl.style.setProperty('position', 'fixed', 'important');
			this.drawerEl.style.setProperty('inset', '0', 'important');
		} else {
			// Container mode: absolute positioning with full viewport height
			this.drawerEl.style.setProperty('position', 'fixed', 'important');
			this.drawerEl.style.setProperty('top', '0', 'important');
			this.drawerEl.style.setProperty('bottom', '0', 'important');
			this.drawerEl.style.setProperty('left', '0', 'important');
			this.drawerEl.style.setProperty('right', '0', 'important');
		}
		this.drawerEl.style.setProperty('z-index', '999999', 'important');
		this.drawerEl.style.setProperty('pointer-events', 'none', 'important');
		this.drawerEl.style.setProperty('display', 'flex', 'important');
		this.drawerEl.style.setProperty('align-items', 'stretch', 'important');
		this.drawerEl.style.setProperty('justify-content', 'flex-end', 'important');
		
		// Create backdrop without blur and click-to-close
		const backdrop = this.drawerEl.createDiv({ cls: 'speed-reading-drawer-backdrop' });
		backdrop.style.setProperty('position', 'absolute', 'important');
		backdrop.style.setProperty('inset', '0', 'important');
		backdrop.style.setProperty('background', 'transparent', 'important');
		backdrop.style.setProperty('pointer-events', 'none', 'important');

		// Create modern drawer panel with card-like design
		const panel = this.drawerEl.createDiv({ cls: 'speed-reading-drawer-panel' });
		
		// Modern panel styling inspired by shadcn/ui
		panel.style.setProperty('position', 'relative', 'important');
		panel.style.setProperty('width', '420px', 'important');
		panel.style.setProperty('max-width', '85%', 'important');
		panel.style.setProperty('height', '100%', 'important');
		panel.style.setProperty('min-height', '100vh', 'important');
		panel.style.setProperty('background', 'var(--background-primary)', 'important');
		panel.style.setProperty('border-left', '1px solid var(--background-modifier-border)', 'important');
		panel.style.setProperty('border-radius', '12px 0 0 12px', 'important');
		panel.style.setProperty('box-shadow', '-4px 0 24px -8px rgba(0, 0, 0, 0.12), -2px 0 8px -2px rgba(0, 0, 0, 0.08)', 'important');
		panel.style.setProperty('transform', 'translateX(100%)', 'important');
		panel.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
		panel.style.setProperty('display', 'flex', 'important');
		panel.style.setProperty('flex-direction', 'column', 'important');
		panel.style.setProperty('overflow', 'hidden', 'important');
		panel.style.setProperty('pointer-events', 'auto', 'important');
		panel.style.setProperty('z-index', '2', 'important');
		panel.style.setProperty('user-select', 'text', 'important');
		
		// Create resize handle on the left edge
		const resizeHandle = panel.createDiv({ cls: 'speed-reading-resize-handle' });
		resizeHandle.style.setProperty('position', 'absolute', 'important');
		resizeHandle.style.setProperty('left', '0', 'important');
		resizeHandle.style.setProperty('top', '0', 'important');
		resizeHandle.style.setProperty('bottom', '0', 'important');
		resizeHandle.style.setProperty('width', '12px', 'important');
		resizeHandle.style.setProperty('cursor', 'col-resize', 'important');
		resizeHandle.style.setProperty('z-index', '100', 'important');
		resizeHandle.style.setProperty('background', 'transparent', 'important');
		resizeHandle.style.setProperty('transition', 'background 0.15s ease', 'important');
		resizeHandle.style.setProperty('display', 'flex', 'important');
		resizeHandle.style.setProperty('align-items', 'center', 'important');
		resizeHandle.style.setProperty('justify-content', 'center', 'important');
		resizeHandle.style.setProperty('pointer-events', 'auto', 'important');
		resizeHandle.style.setProperty('user-select', 'none', 'important');
		
		// Add visual indicator
		const indicator = resizeHandle.createDiv();
		indicator.style.setProperty('width', '3px', 'important');
		indicator.style.setProperty('height', '48px', 'important');
		indicator.style.setProperty('background', 'var(--background-modifier-border)', 'important');
		indicator.style.setProperty('border-radius', '2px', 'important');
		indicator.style.setProperty('opacity', '0.5', 'important');
		indicator.style.setProperty('transition', 'all 0.15s ease', 'important');
		indicator.style.setProperty('pointer-events', 'none', 'important');
		
		// Resize handle hover effect
		resizeHandle.onmouseover = () => {
			resizeHandle.style.setProperty('background', 'var(--background-modifier-hover)', 'important');
			indicator.style.setProperty('opacity', '1', 'important');
			indicator.style.setProperty('background', 'var(--interactive-accent)', 'important');
		};
		resizeHandle.onmouseout = () => {
			resizeHandle.style.setProperty('background', 'transparent', 'important');
			indicator.style.setProperty('opacity', '0.4', 'important');
			indicator.style.setProperty('background', 'var(--background-modifier-border)', 'important');
		};
		
		// Add resize functionality
		let isResizing = false;
		let startX = 0;
		let startWidth = 0;
		
		resizeHandle.addEventListener('mousedown', (e) => {
			isResizing = true;
			startX = e.clientX;
			startWidth = panel.offsetWidth;
			e.preventDefault();
			
			// Add resizing class for visual feedback
			panel.addClass('speed-reading-panel-resizing');
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
		});
		Logger.debug('[ResizeHandle] Mousedown listener registered');
		
		const mouseMoveHandler = (e: MouseEvent) => {
			if (!isResizing) return;
			
			const deltaX = startX - e.clientX;
			const newWidth = Math.max(320, Math.min(window.innerWidth * 0.9, startWidth + deltaX));
			panel.style.setProperty('width', `${newWidth}px`, 'important');
			panel.style.setProperty('max-width', 'none', 'important');
			
			// Trigger layout recalculation for responsive content
			window.dispatchEvent(new Event('resize'));
		};
		
		document.addEventListener('mousemove', mouseMoveHandler);
		
		const mouseUpHandler = () => {
			if (isResizing) {
				isResizing = false;
				panel.removeClass('speed-reading-panel-resizing');
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
			}
		};
		
		document.addEventListener('mouseup', mouseUpHandler);
		
		// Store handlers for cleanup
		(panel as any)._resizeHandlers = { mouseMoveHandler, mouseUpHandler };
		
		// Add ESC key listener to close drawer
		const handleEscKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				this.close();
			}
		};
		document.addEventListener('keydown', handleEscKey);
		
		// Store the handler so we can remove it later
		(panel as any)._escKeyHandler = handleEscKey;
		
		// Store resize handle reference before renderContent (which calls panel.empty())
		(panel as any)._resizeHandle = resizeHandle;
		
		// Save panel reference for updates
		this.contentEl = panel;
		this.renderContent(panel, result);
		
		// Trigger animation
		setTimeout(() => {
			this.drawerEl?.addClass('speed-reading-drawer-open');
			// Animate panel slide-in
			if (panel) {
				panel.style.setProperty('transform', 'translateX(0)', 'important');
			}
			this.isOpen = true;
		}, 10);
	}

	/**
	 * Close drawer
	 */
	close(): void {
		if (!this.isOpen || !this.drawerEl) return;

		// Remove ESC key listener
		if (this.contentEl && (this.contentEl as any)._escKeyHandler) {
			document.removeEventListener('keydown', (this.contentEl as any)._escKeyHandler);
			delete (this.contentEl as any)._escKeyHandler;
		}

		// Remove resize handlers and trigger close animation
		const panel = this.drawerEl?.querySelector('.speed-reading-drawer-panel') as HTMLElement;
		if (panel) {
			// Remove resize handlers if they exist
			const panelWithHandlers = panel as any;
			if (panelWithHandlers._resizeHandlers) {
				document.removeEventListener('mousemove', panelWithHandlers._resizeHandlers.mouseMoveHandler);
				document.removeEventListener('mouseup', panelWithHandlers._resizeHandlers.mouseUpHandler);
				delete panelWithHandlers._resizeHandlers;
			}
			
			// Trigger close animation
			panel.style.setProperty('transform', 'translateX(100%)', 'important');
		}

		// Remove scroll listener
		if (this.scrollListener) {
			const scrollContainer = this.contentEl?.querySelector('.speed-reading-report-content') as HTMLElement;
			if (scrollContainer) {
				scrollContainer.removeEventListener('scroll', this.scrollListener);
			}
			this.scrollListener = null;
		}

		this.drawerEl.removeClass('speed-reading-drawer-open');
		
		// Wait for animation to complete before cleanup
		setTimeout(() => {
			// Clean up all markdown components
			this.markdownComponents.forEach(component => {
				component.unload();
			});
			this.markdownComponents = [];
			
			this.drawerEl?.remove();
			this.drawerEl = null;
			this.contentEl = null;
			this.isOpen = false;
			this.isStreaming = false;
			this.userScrolledUp = false;
			this.jsMindInstance = null;
			this.lastRenderedMindMap = ''; // 重置缓存
			this.lastRenderedMindMapHash = ''; // 重置结构哈希缓存
			this.mindMapRenderThrottle = 0; // 重置节流计数器
		}, 300);
	}

	/**
	 * Check if jsMind library is available (should be loaded by plugin on startup)
	 * This matches webchat's approach: assume jsMind is preloaded, just verify it exists
	 */
	private checkJsMind(): boolean {
		if (window.jsMind) {
			this.jsMindLoaded = true;
			return true;
		}
		return false;
	}

	/**
	 * Parse markdown mindmap to jsMind data structure
	 */
	private parseMarkdownToJsMind(markdown: string): JsMindData {
		const lines = markdown.split('\n').filter(line => line.trim());
		const nodes: JsMindNode[] = [];
		const stack: Array<{ level: number; id: string }> = [];
		let nodeId = 0;

		for (const line of lines) {
			const match = line.match(/^(#+|\s*[-*])\s+(.+)$/);
			if (!match) continue;

			const [, prefix, topic] = match;
			const level = prefix.startsWith('#') ? prefix.length : 
			             (line.match(/^\s*/)?.[0].length || 0) / 2 + 1;

			const id = nodeId === 0 ? 'root' : `node_${nodeId}`;
			nodeId++;

			// Find parent
			while (stack.length > 0 && stack[stack.length - 1].level >= level) {
				stack.pop();
			}

			const parentId = stack.length > 0 ? stack[stack.length - 1].id : undefined;
			
			const node: JsMindNode = {
				id,
				topic: topic.replace(/\*\*/g, '').trim(),
				...(id === 'root' ? { isroot: true } : { 
					parentid: parentId,
					direction: nodes.length % 2 === 0 ? 'right' : 'left'
				})
			};

			nodes.push(node);
			stack.push({ level, id });
		}

		return {
			meta: {
				name: this.plugin.i18n.t('ui.speedReadingMindMapTitle'),
				author: 'LLMSider',
				version: '1.0'
			},
			format: 'node_array',
			data: nodes
		};
	}

	/**
	 * Update content for streaming
	 */
	updateContent(result: SpeedReadingResult, streaming?: boolean): void {
		if (!this.contentEl) {
			return;
		}
		
		// Update streaming state
		if (streaming !== undefined) {
			const wasStreaming = this.isStreaming;
			this.isStreaming = streaming;
			
			// Reset user scroll flag when streaming starts
			if (streaming && !wasStreaming) {
				this.userScrolledUp = false;
			}
		}
		
		// Re-render content
		this.renderContent(this.contentEl, result);
		
		// Auto-scroll to bottom during streaming unless user scrolled up
		if (this.isStreaming && !this.userScrolledUp) {
			this.scrollToBottom();
		}
		
		// If streaming just ended, force final mindmap render
		if (streaming === false && this.mindMapRenderDebounceTimer) {
			clearTimeout(this.mindMapRenderDebounceTimer);
			this.mindMapRenderDebounceTimer = null;
			// Force a final render after a short delay to ensure all content is ready
			setTimeout(() => {
				if (this.contentEl) {
					this.renderContent(this.contentEl, result);
					this.scrollToBottom();
				}
			}, 100);
		}
	}

	/**
	 * Setup scroll listener to detect user scrolling up
	 */
	private setupScrollListener(scrollContainer: HTMLElement): void {
		// Remove existing listener if any
		if (this.scrollListener) {
			const oldContainer = this.contentEl?.querySelector('.speed-reading-report-content') as HTMLElement;
			if (oldContainer) {
				oldContainer.removeEventListener('scroll', this.scrollListener);
			}
		}

		// Create new listener
		this.scrollListener = () => {
			if (!this.isStreaming) return;
			
			// Check if user is scrolled away from bottom
			const distanceFromBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
			
			// If user is more than 50px from bottom, they scrolled up manually
			if (distanceFromBottom > 50) {
				this.userScrolledUp = true;
			} else {
				// If user scrolled back to near bottom, resume auto-scroll
				this.userScrolledUp = false;
			}
		};

		scrollContainer.addEventListener('scroll', this.scrollListener, { passive: true });
	}

	/**
	 * Scroll content to bottom
	 */
	private scrollToBottom(): void {
		if (!this.contentEl) return;
		
		const scrollContainer = this.contentEl.querySelector('.speed-reading-report-content') as HTMLElement;
		if (scrollContainer) {
			// Use requestAnimationFrame for smoother scroll
			requestAnimationFrame(() => {
				if (scrollContainer) {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				}
			});
		}
	}

	/**
	 * Render drawer content
	 */
	private renderContent(panel: HTMLElement, result: SpeedReadingResult): void {
		// Save resize handle before clearing panel
		const savedResizeHandle = (panel as any)._resizeHandle as HTMLElement | undefined;
		
		panel.empty();
		panel.addClass('llmsider-speed-reading-modal');
		
		// Re-add resize handle if it was saved
		if (savedResizeHandle) {
			panel.prepend(savedResizeHandle);
		}

		// Modern header design inspired by shadcn/ui Card
		const header = panel.createDiv({ cls: 'speed-reading-report-header' });
		header.style.setProperty('padding', '24px 24px 20px', 'important');
		header.style.setProperty('background', 'var(--background-primary)', 'important');
		header.style.setProperty('border-bottom', '1px solid var(--background-modifier-border)', 'important');
		header.style.setProperty('flex-shrink', '0', 'important');
		header.style.setProperty('position', 'relative', 'important');
		header.style.setProperty('z-index', '1', 'important');
		
		// Title row with label and buttons
		const titleRow = header.createDiv({ cls: 'speed-reading-title-row' });
		titleRow.style.setProperty('display', 'flex', 'important');
		titleRow.style.setProperty('justify-content', 'space-between', 'important');
		titleRow.style.setProperty('align-items', 'center', 'important');
		titleRow.style.setProperty('gap', '12px', 'important');
		titleRow.style.setProperty('margin-bottom', '16px', 'important');
		
		// Label badge style (on the left)
		const label = titleRow.createEl('div', { 
			text: this.plugin.i18n.t('ui.speedReadingSmartAnalysis'),
			cls: 'speed-reading-report-label'
		});
		label.style.setProperty('display', 'inline-flex', 'important');
		label.style.setProperty('align-items', 'center', 'important');
		label.style.setProperty('padding', '2px 8px', 'important');
		label.style.setProperty('font-size', '11px', 'important');
		label.style.setProperty('font-weight', '600', 'important');
		label.style.setProperty('border-radius', '6px', 'important');
		label.style.setProperty('background', 'var(--interactive-accent)', 'important');
		label.style.setProperty('color', 'var(--text-on-accent)', 'important');
		label.style.setProperty('width', 'fit-content', 'important');
		
		// Button group with action buttons (on the right)
		const buttonGroup = titleRow.createDiv({ cls: 'speed-reading-button-group' });
		buttonGroup.style.setProperty('display', 'flex', 'important');
		buttonGroup.style.setProperty('gap', '8px', 'important');
		buttonGroup.style.setProperty('flex-shrink', '0', 'important');
		
		// Copy as markdown button
		const copyMarkdownBtn = buttonGroup.createEl('button', {
			cls: 'llmsider-input-btn',
			attr: { 
				'aria-label': this.plugin.i18n.t('ui.speedReadingCopyMarkdown'), 
				'title': this.plugin.i18n.t('ui.speedReadingCopyMarkdownTooltip') 
			}
		});
		copyMarkdownBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
		copyMarkdownBtn.onclick = async () => {
			await this.copyToClipboard(result);
		};
		
		// Export to note button
		const exportNoteBtn = buttonGroup.createEl('button', {
			cls: 'llmsider-input-btn',
			attr: { 
				'aria-label': this.plugin.i18n.t('ui.speedReadingExportNote'), 
				'title': this.plugin.i18n.t('ui.speedReadingExportNoteTooltip') 
			}
		});
		exportNoteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
		exportNoteBtn.onclick = async () => {
			await this.exportToNote(result);
		};
		
		// Regenerate button
		const regenerateBtn = buttonGroup.createEl('button', {
			cls: 'llmsider-input-btn',
			attr: { 
				'aria-label': this.plugin.i18n.t('ui.speedReadingRegenerate'), 
				'title': this.plugin.i18n.t('ui.speedReadingRegenerateTooltip') 
			}
		});
		regenerateBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;
		regenerateBtn.onclick = async () => {
			// Close current drawer
			this.close();
			// Trigger regeneration via speed reading manager
			const speedReadingManager = this.plugin.getSpeedReadingManager();
			if (speedReadingManager) {
				await speedReadingManager.regenerateReport(result.notePath);
			} else {
				new Notice(this.plugin.i18n.t('ui.speedReadingNotInitialized'));
			}
		};
		
		// Close button
		const closeBtn = buttonGroup.createEl('button', {
			cls: 'llmsider-input-btn',
			attr: { 
				'aria-label': this.plugin.i18n.t('ui.speedReadingClose'), 
				'title': this.plugin.i18n.t('ui.speedReadingCloseDrawer') 
			}
		});
		closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
		closeBtn.onclick = () => {
			this.close();
		};
		
		// Title section below buttons (full width)
		const titleSection = header.createDiv();
		titleSection.style.setProperty('width', '100%', 'important');
		
		// Title with modern typography
		const title = titleSection.createEl('h2', { 
			text: result.noteTitle,
			cls: 'speed-reading-report-title'
		});
		title.style.setProperty('font-size', '20px', 'important');
		title.style.setProperty('font-weight', '600', 'important');
		title.style.setProperty('line-height', '1.4', 'important');
		title.style.setProperty('margin', '0', 'important');
		title.style.setProperty('color', 'var(--text-normal)', 'important');
		title.style.setProperty('width', '100%', 'important');
		
		// Scrollable content container
		const content = panel.createDiv({ cls: 'speed-reading-report-content' });
		content.style.setProperty('flex', '1', 'important');
		content.style.setProperty('overflow-y', 'auto', 'important');
		content.style.setProperty('overflow-x', 'hidden', 'important');
		content.style.setProperty('padding', '24px', 'important');
		content.style.setProperty('user-select', 'text', 'important');

		// Add scroll listener to detect user scrolling up
		this.setupScrollListener(content);

		// Loading state indicator (only show when streaming but no real content yet)
		const hasRealContent = (result.summary && !result.summary.includes('⏳') && !result.summary.includes('正在分析')) 
			|| result.keyPoints.length > 0 
			|| (result.mindMap && !result.mindMap.includes('⏳'));
		if (this.isStreaming && !hasRealContent) {
			const loadingIndicator = content.createDiv({ cls: 'speed-reading-loading' });
			loadingIndicator.style.setProperty('display', 'flex', 'important');
			loadingIndicator.style.setProperty('flex-direction', 'column', 'important');
			loadingIndicator.style.setProperty('align-items', 'center', 'important');
			loadingIndicator.style.setProperty('justify-content', 'center', 'important');
			loadingIndicator.style.setProperty('padding', '40px', 'important');
			loadingIndicator.style.setProperty('gap', '12px', 'important');
			
			const spinner = loadingIndicator.createDiv();
			spinner.style.setProperty('width', '40px', 'important');
			spinner.style.setProperty('height', '40px', 'important');
			spinner.style.setProperty('border', '3px solid var(--background-modifier-border)', 'important');
			spinner.style.setProperty('border-top-color', 'var(--interactive-accent)', 'important');
			spinner.style.setProperty('border-radius', '50%', 'important');
			spinner.style.setProperty('animation', 'spin 1s linear infinite', 'important');
			
			const loadingText = loadingIndicator.createDiv({ text: this.plugin.i18n.t('ui.speedReadingAnalyzingDocumentContent') });
			loadingText.style.setProperty('font-size', '14px', 'important');
			loadingText.style.setProperty('color', 'var(--text-muted)', 'important');
			loadingText.style.setProperty('font-weight', '500', 'important');
		}

		// Executive Summary Section with modern card design (only show if has actual content)
		const hasSummary = result.summary && result.summary.trim().length > 0 && !result.summary.includes('⏳') && !result.summary.includes('正在分析');
		
		if (hasSummary) {
			const summaryWrapper = content.createDiv({ cls: 'speed-reading-section' });
			summaryWrapper.style.setProperty('margin-bottom', '20px', 'important');
			
			// Header outside the card
			const summaryHeader = summaryWrapper.createDiv({ cls: 'speed-reading-section-header' });
			summaryHeader.style.setProperty('display', 'flex', 'important');
			summaryHeader.style.setProperty('align-items', 'center', 'important');
			summaryHeader.style.setProperty('gap', '8px', 'important');
			summaryHeader.style.setProperty('margin-bottom', '12px', 'important');
			
			const sectionNumber = summaryHeader.createEl('div', { text: '01', cls: 'speed-reading-section-number' });
			sectionNumber.style.setProperty('display', 'flex', 'important');
			sectionNumber.style.setProperty('align-items', 'center', 'important');
			sectionNumber.style.setProperty('justify-content', 'center', 'important');
			sectionNumber.style.setProperty('width', '24px', 'important');
			sectionNumber.style.setProperty('height', '24px', 'important');
			sectionNumber.style.setProperty('border-radius', '6px', 'important');
			sectionNumber.style.setProperty('background', 'var(--interactive-accent)', 'important');
			sectionNumber.style.setProperty('color', 'var(--text-on-accent)', 'important');
			sectionNumber.style.setProperty('font-size', '11px', 'important');
			sectionNumber.style.setProperty('font-weight', '600', 'important');
			
			const sectionTitle = summaryHeader.createEl('h3', { text: this.plugin.i18n.t('ui.speedReadingExecutiveSummary'), cls: 'speed-reading-section-title' });
			sectionTitle.style.setProperty('font-size', '15px', 'important');
			sectionTitle.style.setProperty('font-weight', '600', 'important');
			sectionTitle.style.setProperty('margin', '0', 'important');
			sectionTitle.style.setProperty('color', 'var(--text-normal)', 'important');
			
			// Card with content
			const summaryCard = summaryWrapper.createDiv({ cls: 'speed-reading-summary-card' });
			summaryCard.style.setProperty('padding', '16px', 'important');
			summaryCard.style.setProperty('background', 'var(--background-secondary)', 'important');
			summaryCard.style.setProperty('border-radius', '12px', 'important');
			summaryCard.style.setProperty('border', '1px solid var(--background-modifier-border)', 'important');
			
			const summaryText = summaryCard.createDiv({ cls: 'speed-reading-summary-text' });
			summaryText.style.setProperty('font-size', '13px', 'important');
			summaryText.style.setProperty('line-height', '1.6', 'important');
			summaryText.style.setProperty('color', 'var(--text-muted)', 'important');
			summaryText.style.setProperty('margin', '0', 'important');
			
			// Use MarkdownRenderer to render the summary content
			const summaryComponent = new Component();
			this.markdownComponents.push(summaryComponent);
			MarkdownRenderer.render(
				this.app,
				result.summary,
				summaryText,
				'',
				summaryComponent
			).then(() => {
				// Remove paragraph margins
				const summaryParagraphs = summaryText.querySelectorAll('p');
				summaryParagraphs.forEach((p) => {
					const htmlP = p as HTMLElement;
					htmlP.style.setProperty('margin', '0', 'important');
					htmlP.style.setProperty('margin-bottom', '8px', 'important');
				});
				
				// Style bold/strong elements
				const summaryStrongElements = summaryText.querySelectorAll('strong, b');
				summaryStrongElements.forEach((strong) => {
					const htmlStrong = strong as HTMLElement;
					htmlStrong.style.setProperty('color', 'var(--text-normal)', 'important');
					htmlStrong.style.setProperty('font-weight', '600', 'important');
				});
			});
		}

		// Key Points Section with modern list design (only show after summary is ready)
		if (hasSummary && result.keyPoints && result.keyPoints.length > 0) {
			const keyPointsSection = content.createDiv({ cls: 'speed-reading-section' });
			keyPointsSection.style.setProperty('margin-bottom', '20px', 'important');
			
			const keyPointsHeader = keyPointsSection.createDiv({ cls: 'speed-reading-section-header' });
			keyPointsHeader.style.setProperty('display', 'flex', 'important');
			keyPointsHeader.style.setProperty('align-items', 'center', 'important');
			keyPointsHeader.style.setProperty('gap', '8px', 'important');
			keyPointsHeader.style.setProperty('margin-bottom', '12px', 'important');
			
			const sectionNumber = keyPointsHeader.createEl('div', { text: '02', cls: 'speed-reading-section-number' });
			sectionNumber.style.setProperty('display', 'flex', 'important');
			sectionNumber.style.setProperty('align-items', 'center', 'important');
			sectionNumber.style.setProperty('justify-content', 'center', 'important');
			sectionNumber.style.setProperty('width', '24px', 'important');
			sectionNumber.style.setProperty('height', '24px', 'important');
			sectionNumber.style.setProperty('border-radius', '6px', 'important');
			sectionNumber.style.setProperty('background', 'var(--interactive-accent)', 'important');
			sectionNumber.style.setProperty('color', 'var(--text-on-accent)', 'important');
			sectionNumber.style.setProperty('font-size', '11px', 'important');
			sectionNumber.style.setProperty('font-weight', '600', 'important');
			
			const sectionTitle = keyPointsHeader.createEl('h3', { text: this.plugin.i18n.t('ui.speedReadingCorePoints'), cls: 'speed-reading-section-title' });
			sectionTitle.style.setProperty('font-size', '15px', 'important');
			sectionTitle.style.setProperty('font-weight', '600', 'important');
			sectionTitle.style.setProperty('margin', '0', 'important');
			sectionTitle.style.setProperty('color', 'var(--text-normal)', 'important');
			
			const keyPointsList = keyPointsSection.createDiv({ cls: 'speed-reading-points-list' });
			keyPointsList.style.setProperty('display', 'flex', 'important');
			keyPointsList.style.setProperty('flex-direction', 'column', 'important');
			keyPointsList.style.setProperty('gap', '8px', 'important');
			
			result.keyPoints.forEach((point, index) => {
				const pointItem = keyPointsList.createDiv({ cls: 'speed-reading-point-item' });
				pointItem.style.setProperty('display', 'flex', 'important');
				pointItem.style.setProperty('gap', '10px', 'important');
				pointItem.style.setProperty('padding', '12px 16px', 'important');
				pointItem.style.setProperty('background', 'linear-gradient(135deg, var(--background-secondary) 0%, var(--background-primary-alt) 100%)', 'important');
				pointItem.style.setProperty('border-radius', '8px', 'important');
				pointItem.style.setProperty('border-left', '3px solid var(--interactive-accent)', 'important');
				pointItem.style.setProperty('border-top', '1px solid var(--background-modifier-border)', 'important');
				pointItem.style.setProperty('border-right', '1px solid var(--background-modifier-border)', 'important');
				pointItem.style.setProperty('border-bottom', '1px solid var(--background-modifier-border)', 'important');
				pointItem.style.setProperty('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.05)', 'important');
				pointItem.style.setProperty('transition', 'all 0.2s', 'important');
				pointItem.style.setProperty('position', 'relative', 'important');
				
				// Add subtle highlight bar on the left
				const highlightBar = pointItem.createDiv();
				highlightBar.style.setProperty('position', 'absolute', 'important');
				highlightBar.style.setProperty('left', '0', 'important');
				highlightBar.style.setProperty('top', '0', 'important');
				highlightBar.style.setProperty('bottom', '0', 'important');
				highlightBar.style.setProperty('width', '3px', 'important');
				highlightBar.style.setProperty('background', 'var(--interactive-accent)', 'important');
				highlightBar.style.setProperty('border-radius', '8px 0 0 8px', 'important');
				highlightBar.style.setProperty('opacity', '0.8', 'important');
				
				const pointNumber = pointItem.createEl('div', { 
					text: (index + 1).toString(),
					cls: 'speed-reading-point-number' 
				});
				pointNumber.style.setProperty('flex-shrink', '0', 'important');
				pointNumber.style.setProperty('width', '24px', 'important');
				pointNumber.style.setProperty('height', '24px', 'important');
				pointNumber.style.setProperty('display', 'flex', 'important');
				pointNumber.style.setProperty('align-items', 'center', 'important');
				pointNumber.style.setProperty('justify-content', 'center', 'important');
				pointNumber.style.setProperty('border-radius', '6px', 'important');
				pointNumber.style.setProperty('background', 'var(--interactive-accent)', 'important');
				pointNumber.style.setProperty('color', 'var(--text-on-accent)', 'important');
				pointNumber.style.setProperty('font-size', '12px', 'important');
				pointNumber.style.setProperty('font-weight', '700', 'important');
				pointNumber.style.setProperty('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.1)', 'important');
				
				const pointText = pointItem.createDiv({ cls: 'speed-reading-point-text' });
				pointText.style.setProperty('flex', '1', 'important');
				pointText.style.setProperty('font-size', '13px', 'important');
				pointText.style.setProperty('line-height', '1.6', 'important');
				pointText.style.setProperty('color', 'var(--text-normal)', 'important');
				pointText.style.setProperty('padding-left', '4px', 'important');
				
				// Use MarkdownRenderer to support bold text
				const component = new Component();
				this.markdownComponents.push(component);
				MarkdownRenderer.render(
					this.app,
					point,
					pointText,
					'',
					component
				);
				
				// Remove paragraph margins and add underline to important text
				const paragraphs = pointText.querySelectorAll('p');
				paragraphs.forEach((p) => {
					const htmlP = p as HTMLElement;
					htmlP.style.setProperty('margin', '0', 'important');
				});
				
				// Add underline and highlight to bold/strong text
				const strongElements = pointText.querySelectorAll('strong, b');
				strongElements.forEach((strong) => {
					const htmlStrong = strong as HTMLElement;
					htmlStrong.style.setProperty('font-weight', '700', 'important');
					htmlStrong.style.setProperty('color', 'var(--text-accent)', 'important');
					htmlStrong.style.setProperty('text-decoration', 'underline', 'important');
					htmlStrong.style.setProperty('text-decoration-color', 'var(--interactive-accent)', 'important');
					htmlStrong.style.setProperty('text-decoration-thickness', '2px', 'important');
					htmlStrong.style.setProperty('text-underline-offset', '2px', 'important');
					htmlStrong.style.setProperty('background', 'linear-gradient(180deg, transparent 60%, var(--text-highlight-bg) 60%)', 'important');
					htmlStrong.style.setProperty('padding', '2px 4px', 'important');
					htmlStrong.style.setProperty('border-radius', '3px', 'important');
				});
				
				// Hover effect for the entire item
				pointItem.onmouseover = () => {
					pointItem.style.setProperty('transform', 'translateX(4px)', 'important');
					pointItem.style.setProperty('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.1)', 'important');
					highlightBar.style.setProperty('opacity', '1', 'important');
				};
				pointItem.onmouseout = () => {
					pointItem.style.setProperty('transform', 'translateX(0)', 'important');
					pointItem.style.setProperty('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.05)', 'important');
					highlightBar.style.setProperty('opacity', '0.8', 'important');
				};
			});
		}

		// Mind Map Section with modern card (only show after keyPoints is ready)
		const hasKeyPoints = result.keyPoints && result.keyPoints.length > 0;
		if (hasSummary && hasKeyPoints && result.mindMap && result.mindMap.trim().length > 0) {
			const mindMapSection = content.createDiv({ cls: 'speed-reading-section' });
			mindMapSection.style.setProperty('margin-bottom', '20px', 'important');
			
			const mindMapHeader = mindMapSection.createDiv({ cls: 'speed-reading-section-header' });
			mindMapHeader.style.setProperty('display', 'flex', 'important');
			mindMapHeader.style.setProperty('align-items', 'center', 'important');
			mindMapHeader.style.setProperty('gap', '8px', 'important');
			mindMapHeader.style.setProperty('margin-bottom', '12px', 'important');
			
			const sectionNumber = mindMapHeader.createEl('div', { text: '03', cls: 'speed-reading-section-number' });
			sectionNumber.style.setProperty('display', 'flex', 'important');
			sectionNumber.style.setProperty('align-items', 'center', 'important');
			sectionNumber.style.setProperty('justify-content', 'center', 'important');
			sectionNumber.style.setProperty('width', '24px', 'important');
			sectionNumber.style.setProperty('height', '24px', 'important');
			sectionNumber.style.setProperty('border-radius', '6px', 'important');
			sectionNumber.style.setProperty('background', 'var(--interactive-accent)', 'important');
			sectionNumber.style.setProperty('color', 'var(--text-on-accent)', 'important');
			sectionNumber.style.setProperty('font-size', '11px', 'important');
			sectionNumber.style.setProperty('font-weight', '600', 'important');
			
			const sectionTitle = mindMapHeader.createEl('h3', { text: this.plugin.i18n.t('ui.speedReadingKnowledgeStructure'), cls: 'speed-reading-section-title' });
			sectionTitle.style.setProperty('font-size', '15px', 'important');
			sectionTitle.style.setProperty('font-weight', '600', 'important');
			sectionTitle.style.setProperty('margin', '0', 'important');
			sectionTitle.style.setProperty('color', 'var(--text-normal)', 'important');
			
			// Button container for fullscreen button
			const buttonContainer = mindMapHeader.createDiv();
			buttonContainer.style.setProperty('margin-left', 'auto', 'important');
			buttonContainer.style.setProperty('display', 'flex', 'important');
			buttonContainer.style.setProperty('gap', '8px', 'important');
			
			// Add fullscreen button with SVG icon
			const fullscreenBtn = buttonContainer.createEl('button', { cls: 'llmsider-input-btn' });
			fullscreenBtn.style.setProperty('cursor', 'pointer', 'important');
			fullscreenBtn.setAttribute('aria-label', this.plugin.i18n.t('ui.speedReadingFullscreenMindMap'));
			fullscreenBtn.setAttribute('title', this.plugin.i18n.t('ui.speedReadingFullscreenMindMap'));
			fullscreenBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`;
			fullscreenBtn.onclick = () => {
				this.showFullscreenMindMap(result.mindMap);
			};
			
			const mindMapBody = mindMapSection.createDiv({ cls: 'speed-reading-section-body' });
	mindMapBody.style.setProperty('padding', '20px', 'important');
	mindMapBody.style.setProperty('background', 'var(--background-primary)', 'important');
	mindMapBody.style.setProperty('border-radius', '12px', 'important');
	mindMapBody.style.setProperty('border', '1px solid var(--background-modifier-border)', 'important');
	mindMapBody.style.setProperty('cursor', 'pointer', 'important');
	mindMapBody.style.setProperty('position', 'relative', 'important');
	mindMapBody.setAttribute('title', this.plugin.i18n.t('ui.speedReadingClickToViewFullscreen'));
	
	// Add click event for fullscreen
	mindMapBody.onclick = () => {
		this.showFullscreenMindMap(result.mindMap);
	};
	
	// Add hover effect
	mindMapBody.onmouseover = () => {
		mindMapBody.style.setProperty('border-color', 'var(--interactive-accent)', 'important');
		mindMapBody.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.1)', 'important');
	};
	mindMapBody.onmouseout = () => {
		mindMapBody.style.setProperty('border-color', 'var(--background-modifier-border)', 'important');
		mindMapBody.style.setProperty('box-shadow', 'none', 'important');
	};
			
			if (!result.mindMap || !this.isValidMindMapStructure(result.mindMap)) {
				// Show loading indicator only during streaming
				if (this.isStreaming) {
					const loadingIndicator = mindMapBody.createDiv({ cls: 'mindmap-loading-indicator' });
					loadingIndicator.style.setProperty('display', 'flex', 'important');
					loadingIndicator.style.setProperty('flex-direction', 'column', 'important');
					loadingIndicator.style.setProperty('align-items', 'center', 'important');
					loadingIndicator.style.setProperty('justify-content', 'center', 'important');
					loadingIndicator.style.setProperty('padding', '60px 20px', 'important');
					loadingIndicator.style.setProperty('gap', '12px', 'important');
					
					const spinner = loadingIndicator.createDiv();
					spinner.style.setProperty('width', '40px', 'important');
					spinner.style.setProperty('height', '40px', 'important');
					spinner.style.setProperty('border', '3px solid var(--background-modifier-border)', 'important');
					spinner.style.setProperty('border-top-color', 'var(--interactive-accent)', 'important');
					spinner.style.setProperty('border-radius', '50%', 'important');
					spinner.style.setProperty('animation', 'spin 1s linear infinite', 'important');
					
					const loadingText = loadingIndicator.createDiv({ text: this.plugin.i18n.t('ui.speedReadingGeneratingMindMap') });
					loadingText.style.setProperty('font-size', '14px', 'important');
					loadingText.style.setProperty('color', 'var(--text-muted)', 'important');
					loadingText.style.setProperty('font-weight', '500', 'important');
				}
			} else {
				// Only render mindmap when streaming is complete
				if (!this.isStreaming) {
					// Generate structural hash: first 100 chars + total length
					const currentHash = result.mindMap.substring(0, 100) + '|' + result.mindMap.length;
					
					if (this.lastRenderedMindMapHash !== currentHash) {
						// Render immediately when not streaming
						Logger.debug(`[MindMap] Rendering (${result.mindMap.length} chars)`);
						this.renderJsMindMap(mindMapBody, result.mindMap);
						this.lastRenderedMindMap = result.mindMap;
						this.lastRenderedMindMapHash = currentHash;
					}
				} else {
					// Show loading indicator during streaming
					const loadingIndicator = mindMapBody.createDiv({ cls: 'mindmap-loading-indicator' });
					loadingIndicator.style.setProperty('display', 'flex', 'important');
					loadingIndicator.style.setProperty('flex-direction', 'column', 'important');
					loadingIndicator.style.setProperty('align-items', 'center', 'important');
					loadingIndicator.style.setProperty('justify-content', 'center', 'important');
					loadingIndicator.style.setProperty('padding', '60px 20px', 'important');
					loadingIndicator.style.setProperty('gap', '12px', 'important');
					
					const spinner = loadingIndicator.createDiv();
					spinner.style.setProperty('width', '40px', 'important');
					spinner.style.setProperty('height', '40px', 'important');
					spinner.style.setProperty('border', '3px solid var(--background-modifier-border)', 'important');
					spinner.style.setProperty('border-top-color', 'var(--interactive-accent)', 'important');
					spinner.style.setProperty('border-radius', '50%', 'important');
					spinner.style.setProperty('animation', 'spin 1s linear infinite', 'important');
					
					const loadingText = loadingIndicator.createDiv({ text: this.plugin.i18n.t('ui.speedReadingGeneratingMindMap') });
					loadingText.style.setProperty('font-size', '14px', 'important');
					loadingText.style.setProperty('color', 'var(--text-muted)', 'important');
					loadingText.style.setProperty('font-weight', '500', 'important');
				}
			}
		}

		// Extended Reading Section with modern list (only show after mindMap is ready)
		const hasMindMap = result.mindMap && result.mindMap.trim().length > 0;
		if (hasSummary && hasKeyPoints && hasMindMap && result.extendedReading && result.extendedReading.length > 0) {
			const extendedSection = content.createDiv({ cls: 'speed-reading-section' });
			extendedSection.style.setProperty('margin-bottom', '20px', 'important');
			
			const extendedHeader = extendedSection.createDiv({ cls: 'speed-reading-section-header' });
			extendedHeader.style.setProperty('display', 'flex', 'important');
			extendedHeader.style.setProperty('align-items', 'center', 'important');
			extendedHeader.style.setProperty('gap', '8px', 'important');
			extendedHeader.style.setProperty('margin-bottom', '12px', 'important');
			
			const sectionNumber = extendedHeader.createEl('div', { text: '04', cls: 'speed-reading-section-number' });
			sectionNumber.style.setProperty('display', 'flex', 'important');
			sectionNumber.style.setProperty('align-items', 'center', 'important');
			sectionNumber.style.setProperty('justify-content', 'center', 'important');
			sectionNumber.style.setProperty('width', '24px', 'important');
			sectionNumber.style.setProperty('height', '24px', 'important');
			sectionNumber.style.setProperty('border-radius', '6px', 'important');
			sectionNumber.style.setProperty('background', 'var(--interactive-accent)', 'important');
			sectionNumber.style.setProperty('color', 'var(--text-on-accent)', 'important');
			sectionNumber.style.setProperty('font-size', '11px', 'important');
			sectionNumber.style.setProperty('font-weight', '600', 'important');
			
			const sectionTitle = extendedHeader.createEl('h3', { text: this.plugin.i18n.t('ui.speedReadingExtendedReading'), cls: 'speed-reading-section-title' });
			sectionTitle.style.setProperty('font-size', '15px', 'important');
			sectionTitle.style.setProperty('font-weight', '600', 'important');
			sectionTitle.style.setProperty('margin', '0', 'important');
			sectionTitle.style.setProperty('color', 'var(--text-normal)', 'important');
			
			const extendedList = extendedSection.createDiv({ cls: 'speed-reading-reading-list' });
			extendedList.style.setProperty('display', 'flex', 'important');
			extendedList.style.setProperty('flex-direction', 'column', 'important');
			extendedList.style.setProperty('gap', '8px', 'important');
			
			result.extendedReading.forEach((reading, index) => {
				const readingItem = extendedList.createDiv({ cls: 'speed-reading-reading-item' });
				readingItem.style.setProperty('padding', '12px', 'important');
				readingItem.style.setProperty('background', 'var(--background-secondary)', 'important');
				readingItem.style.setProperty('border-radius', '8px', 'important');
				readingItem.style.setProperty('border', '1px solid var(--background-modifier-border)', 'important');
				readingItem.style.setProperty('font-size', '13px', 'important');
				readingItem.style.setProperty('line-height', '1.5', 'important');
				readingItem.style.setProperty('color', 'var(--text-normal)', 'important');
				readingItem.style.setProperty('transition', 'all 0.2s', 'important');
				readingItem.style.setProperty('cursor', 'pointer', 'important');
				readingItem.setText(reading);
				
				// Hover effect
				readingItem.onmouseover = () => {
					readingItem.style.background = 'var(--background-modifier-hover)';
					readingItem.style.borderColor = 'var(--interactive-accent)';
				};
				readingItem.onmouseout = () => {
					readingItem.style.background = 'var(--background-secondary)';
					readingItem.style.borderColor = 'var(--background-modifier-border)';
				};
				
				// Click delay timer to distinguish from double click
				let clickTimer: NodeJS.Timeout | null = null;
				
				// Click handler: send to chat (delayed to check for double click)
				readingItem.onclick = async (e) => {
					e.preventDefault();
					if (clickTimer) {
						clearTimeout(clickTimer);
					}
					clickTimer = setTimeout(async () => {
						await this.sendMessageToChat(reading);
						clickTimer = null;
					}, 300);
				};
				
				// Double click handler: search in Google
				readingItem.ondblclick = (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (clickTimer) {
						clearTimeout(clickTimer);
						clickTimer = null;
					}
					const searchQuery = encodeURIComponent(reading);
					window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
				};
			});
		}

		// Guess You Care About Section (only show after extendedReading is ready)
		const hasExtendedReading = result.extendedReading && result.extendedReading.length > 0;
		if (hasSummary && hasKeyPoints && hasMindMap && hasExtendedReading && result.guessYouCareAbout && result.guessYouCareAbout.length > 0) {
			const guessSection = content.createDiv({ cls: 'speed-reading-section' });
			guessSection.style.setProperty('margin-bottom', '20px', 'important');
			
			const guessHeader = guessSection.createDiv({ cls: 'speed-reading-section-header' });
			guessHeader.style.setProperty('display', 'flex', 'important');
			guessHeader.style.setProperty('align-items', 'center', 'important');
			guessHeader.style.setProperty('gap', '8px', 'important');
			guessHeader.style.setProperty('margin-bottom', '12px', 'important');
			
			const sectionNumber = guessHeader.createEl('div', { text: '05', cls: 'speed-reading-section-number' });
			sectionNumber.style.setProperty('display', 'flex', 'important');
			sectionNumber.style.setProperty('align-items', 'center', 'important');
			sectionNumber.style.setProperty('justify-content', 'center', 'important');
			sectionNumber.style.setProperty('width', '24px', 'important');
			sectionNumber.style.setProperty('height', '24px', 'important');
			sectionNumber.style.setProperty('border-radius', '6px', 'important');
			sectionNumber.style.setProperty('background', 'var(--interactive-accent)', 'important');
			sectionNumber.style.setProperty('color', 'var(--text-on-accent)', 'important');
			sectionNumber.style.setProperty('font-size', '11px', 'important');
			sectionNumber.style.setProperty('font-weight', '600', 'important');
			
			const sectionTitle = guessHeader.createEl('h3', { text: this.plugin.i18n.t('ui.speedReadingGuessYouCareAbout'), cls: 'speed-reading-section-title' });
			sectionTitle.style.setProperty('font-size', '15px', 'important');
			sectionTitle.style.setProperty('font-weight', '600', 'important');
			sectionTitle.style.setProperty('margin', '0', 'important');
			sectionTitle.style.setProperty('color', 'var(--text-normal)', 'important');
			
			const guessList = guessSection.createDiv({ cls: 'speed-reading-guess-list' });
			guessList.style.setProperty('display', 'flex', 'important');
			guessList.style.setProperty('flex-direction', 'column', 'important');
			guessList.style.setProperty('gap', '8px', 'important');
			
			result.guessYouCareAbout.forEach((guess, index) => {
				const guessItem = guessList.createDiv({ cls: 'speed-reading-guess-item' });
				guessItem.style.setProperty('padding', '12px', 'important');
				guessItem.style.setProperty('background', 'var(--background-secondary)', 'important');
				guessItem.style.setProperty('border-radius', '8px', 'important');
				guessItem.style.setProperty('border', '1px solid var(--background-modifier-border)', 'important');
				guessItem.style.setProperty('font-size', '13px', 'important');
				guessItem.style.setProperty('line-height', '1.5', 'important');
				guessItem.style.setProperty('color', 'var(--text-normal)', 'important');
				guessItem.style.setProperty('transition', 'all 0.2s', 'important');
				guessItem.style.setProperty('cursor', 'pointer', 'important');
				guessItem.setText(guess);
				
				// Hover effect
				guessItem.onmouseover = () => {
					guessItem.style.background = 'var(--background-modifier-hover)';
					guessItem.style.borderColor = 'var(--interactive-accent)';
				};
				guessItem.onmouseout = () => {
					guessItem.style.background = 'var(--background-secondary)';
					guessItem.style.borderColor = 'var(--background-modifier-border)';
				};
				
				// Click delay timer to distinguish from double click
				let clickTimer: NodeJS.Timeout | null = null;
				
				// Click handler: send to chat (delayed to check for double click)
				guessItem.onclick = async (e) => {
					e.preventDefault();
					if (clickTimer) {
						clearTimeout(clickTimer);
					}
					clickTimer = setTimeout(async () => {
						await this.sendMessageToChat(guess);
						clickTimer = null;
					}, 300);
				};
				
				// Double click handler: search in Google
				guessItem.ondblclick = (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (clickTimer) {
						clearTimeout(clickTimer);
						clickTimer = null;
					}
					const searchQuery = encodeURIComponent(guess);
					window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
				};
			});
		}

		// Modern footer
		const footer = panel.createDiv({ cls: 'speed-reading-report-footer' });
		footer.style.setProperty('flex-shrink', '0', 'important');
		footer.style.setProperty('padding', '16px 24px', 'important');
		footer.style.setProperty('border-top', '1px solid var(--background-modifier-border)', 'important');
		footer.style.setProperty('background', 'var(--background-primary)', 'important');
		footer.style.setProperty('display', 'flex', 'important');
		footer.style.setProperty('justify-content', 'space-between', 'important');
		footer.style.setProperty('align-items', 'center', 'important');
		
		const footerText = footer.createEl('div', { 
			text: this.plugin.i18n.t('ui.speedReadingAIGenerated'),
			cls: 'speed-reading-footer-text'
		});
		footerText.style.setProperty('font-size', '11px', 'important');
		footerText.style.setProperty('color', 'var(--text-muted)', 'important');
		
		// Date in footer
		const footerDate = footer.createEl('div', { cls: 'speed-reading-footer-date' });
		footerDate.style.setProperty('font-size', '11px', 'important');
		footerDate.style.setProperty('color', 'var(--text-muted)', 'important');
		footerDate.setText(`${new Date(result.createdAt).toLocaleDateString('zh-CN')} ${new Date(result.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
	}

	/**
	 * Render jsMind mindmap (webchat-inspired approach)
	 */
	private async renderJsMindMap(container: HTMLElement, mindMapText: string): Promise<void> {
		try {
			if (!this.checkJsMind()) {
				throw new Error('jsMind library not loaded');
			}

			// Verify container is in the document
			if (!container.ownerDocument || !container.ownerDocument.contains(container)) {
				Logger.warn('[MindMap] Container not in document, skipping render');
				return;
			}

			// Destroy existing jsMind instance before clearing container
			if (this.jsMindInstance) {
				try {
					this.jsMindInstance = null;
				} catch (e) {
					Logger.warn('[MindMap] Error destroying previous instance:', e);
				}
			}

			container.empty();

			// Create container for jsMind
			const jsmindContainer = container.createDiv({ cls: 'jsmind-container' });
			jsmindContainer.style.setProperty('width', '100%', 'important');
			jsmindContainer.style.setProperty('height', '400px', 'important'); // Increased height
			jsmindContainer.style.setProperty('overflow', 'hidden', 'important');
			jsmindContainer.style.setProperty('background', 'var(--background-primary)', 'important');
			jsmindContainer.style.setProperty('position', 'relative', 'important');
			
			// Generate unique ID
			const containerId = `jsmind-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			jsmindContainer.id = containerId;
			
			// Ensure container is fully in DOM before proceeding
			await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

			// Determine if mindMapText is already a JSON string or needs parsing from Markdown
			let mindData: any;
			if (mindMapText.trim().startsWith('{')) {
				try {
					mindData = JSON.parse(mindMapText);
				} catch (e) {
					mindData = this.parseMarkdownToJsMind(mindMapText);
				}
			} else {
				mindData = this.parseMarkdownToJsMind(mindMapText);
			}

			// Initialize jsMind with standard theme
			const options = {
				container: containerId,
				theme: 'primary', // Use standard theme
				mode: 'side',
				editable: false,
				support_html: false, // Disable HTML to simplify
				view: {
					engine: 'canvas',
					hmargin: 100,
					vmargin: 50,
					line_width: 2,
					line_color: '#555',
					line_style: 'curved',
					draggable: false // Disable dragging to reduce event listeners
				},
				layout: {
					hspace: 30,
					vspace: 20,
					pspace: 13
				}
			};


			// Create jsMind instance with error handling
			try {
				const jm = new window.jsMind(options);
				jm.show(mindData);
				this.jsMindInstance = jm;
				Logger.debug('[MindMap] Rendered');
			} catch (error) {
				Logger.warn('[MindMap] Render error:', error);
				throw error;
			}


		} catch (error) {
			Logger.error('[MindMap] Rendering failed:', error);
			// Clear container before fallback
			container.empty();
			// Fallback to text rendering
			await this.renderTextMindMap(container, mindMapText);
		}
	}

	/**
	 * Render text-based mind map (webchat mermaid-like style)
	 */
	private async renderTextMindMap(container: HTMLElement, mindMapText: string) {
		try {
			// Create a wrapper with webchat-inspired styling
			const wrapper = container.createDiv({ cls: 'speed-reading-mindmap-mermaid' });
			
			// Base typography matching webchat's prose
			wrapper.style.setProperty('font-size', '13px', 'important');
			wrapper.style.setProperty('line-height', '1.625', 'important');
			wrapper.style.setProperty('color', 'var(--text-normal)', 'important');
			wrapper.style.setProperty('max-width', '100%', 'important');
			wrapper.style.setProperty('word-break', 'break-words', 'important');
			
			// Use Obsidian's markdown renderer
			const component = new Component();
			this.markdownComponents.push(component);
			await MarkdownRenderer.render(
				this.app,
				mindMapText,
				wrapper,
				'',
				component
			);
			
			// Apply mermaid-like mindmap styling (webchat style)
			this.applyMermaidMindmapStyles(wrapper);
		} catch (error) {
			Logger.error('[SpeedReading] Text mind map rendering failed:', error);
			// Show plain text fallback
			container.createEl('div', {
				text: mindMapText,
				cls: 'speed-reading-mindmap-text'
			});
		}
	}

	/**
	 * Apply mermaid-like mindmap styles (webchat mermaid mindmap style - left to right layout)
	 * Root on the left, leaves on the right, expanding horizontally
	 */
	private applyMermaidMindmapStyles(wrapper: HTMLElement): void {
		// Root wrapper with left-to-right layout
		wrapper.style.setProperty('display', 'flex', 'important');
		wrapper.style.setProperty('flex-direction', 'row', 'important');
		wrapper.style.setProperty('align-items', 'flex-start', 'important');
		wrapper.style.setProperty('justify-content', 'flex-start', 'important');
		wrapper.style.setProperty('padding', '20px', 'important');
		wrapper.style.setProperty('overflow-x', 'auto', 'important');
		
		// Get all lists
		const allLists = wrapper.querySelectorAll('ul, ol');
		
		// Style root level list (mindmap root - leftmost)
		const rootLists = wrapper.querySelectorAll(':scope > ul, :scope > ol');
		rootLists.forEach((list) => {
			const htmlList = list as HTMLElement;
			htmlList.style.setProperty('list-style', 'none', 'important');
			htmlList.style.setProperty('padding', '0', 'important');
			htmlList.style.setProperty('margin', '0', 'important');
			htmlList.style.setProperty('display', 'flex', 'important');
			htmlList.style.setProperty('flex-direction', 'column', 'important');
			htmlList.style.setProperty('align-items', 'flex-start', 'important');
			htmlList.style.setProperty('gap', '0', 'important');
		});
		
		// Style all lists to remove default styling
		allLists.forEach((list) => {
			const htmlList = list as HTMLElement;
			htmlList.style.setProperty('list-style', 'none', 'important');
			htmlList.style.setProperty('padding-left', '0', 'important');
		});
		
		// Style list items as mindmap nodes with horizontal expansion
		const items = wrapper.querySelectorAll('li');
		items.forEach((item) => {
			const htmlItem = item as HTMLElement;
			const depth = this.getListDepth(htmlItem);
			
			// Container for each node - horizontal layout
			htmlItem.style.setProperty('position', 'relative', 'important');
			htmlItem.style.setProperty('display', 'flex', 'important');
			htmlItem.style.setProperty('flex-direction', 'row', 'important');
			htmlItem.style.setProperty('align-items', 'center', 'important');
			htmlItem.style.setProperty('margin', '8px 0', 'important');
			
			// Find direct text content (not in nested lists)
			const textNode = this.getDirectTextContent(htmlItem);
			if (textNode) {
				// Style the node as a mindmap bubble
				const nodeWrapper = document.createElement('div');
				nodeWrapper.className = 'mindmap-node';
				nodeWrapper.style.setProperty('display', 'inline-flex', 'important');
				nodeWrapper.style.setProperty('align-items', 'center', 'important');
				nodeWrapper.style.setProperty('padding', '8px 16px', 'important');
				nodeWrapper.style.setProperty('background', 'var(--background-secondary)', 'important');
				nodeWrapper.style.setProperty('border', '2px solid var(--background-modifier-border)', 'important');
				nodeWrapper.style.setProperty('border-radius', '20px', 'important');
				nodeWrapper.style.setProperty('white-space', 'nowrap', 'important');
				nodeWrapper.style.setProperty('transition', 'all 0.2s ease', 'important');
				nodeWrapper.style.setProperty('box-shadow', '0 2px 6px rgba(0, 0, 0, 0.06)', 'important');
				nodeWrapper.style.setProperty('min-width', 'fit-content', 'important');
				nodeWrapper.style.setProperty('flex-shrink', '0', 'important');
				
				// Depth-based styling
				if (depth === 0) {
					// Root node - leftmost, largest
					nodeWrapper.style.setProperty('font-size', '15px', 'important');
					nodeWrapper.style.setProperty('font-weight', '700', 'important');
					nodeWrapper.style.setProperty('padding', '10px 20px', 'important');
					nodeWrapper.style.setProperty('background', 'var(--interactive-accent)', 'important');
					nodeWrapper.style.setProperty('color', 'var(--text-on-accent)', 'important');
					nodeWrapper.style.setProperty('border-color', 'var(--interactive-accent)', 'important');
					nodeWrapper.style.setProperty('box-shadow', '0 3px 10px rgba(0, 0, 0, 0.12)', 'important');
				} else if (depth === 1) {
					// First level branches
					nodeWrapper.style.setProperty('font-size', '14px', 'important');
					nodeWrapper.style.setProperty('font-weight', '600', 'important');
					nodeWrapper.style.setProperty('background', 'var(--background-primary-alt)', 'important');
					nodeWrapper.style.setProperty('border-width', '2px', 'important');
				} else {
					// Deeper level branches (leaves)
					nodeWrapper.style.setProperty('font-size', '13px', 'important');
					nodeWrapper.style.setProperty('font-weight', '500', 'important');
					nodeWrapper.style.setProperty('opacity', '0.95', 'important');
				}
				
				// Hover effect
				nodeWrapper.onmouseover = () => {
					nodeWrapper.style.transform = 'scale(1.05)';
					nodeWrapper.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
					nodeWrapper.style.borderColor = 'var(--interactive-accent)';
				};
				nodeWrapper.onmouseout = () => {
					nodeWrapper.style.transform = 'scale(1)';
					nodeWrapper.style.boxShadow = depth === 0 ? '0 3px 10px rgba(0, 0, 0, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.06)';
					nodeWrapper.style.borderColor = depth === 0 ? 'var(--interactive-accent)' : 'var(--background-modifier-border)';
				};
				
				// Wrap the text content
				nodeWrapper.textContent = textNode;
				
				// Replace the text with the wrapped version
				const textElements = Array.from(htmlItem.childNodes).filter(
					node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
				);
				textElements.forEach(node => node.remove());
				
				// Add node at the beginning
				htmlItem.insertBefore(nodeWrapper, htmlItem.firstChild);
			}
			
			// Style nested lists (children) - horizontal expansion to the right
			const nestedLists = htmlItem.querySelectorAll(':scope > ul, :scope > ol');
			nestedLists.forEach((nestedList, listIndex) => {
				const htmlNestedList = nestedList as HTMLElement;
				htmlNestedList.style.setProperty('display', 'flex', 'important');
				htmlNestedList.style.setProperty('flex-direction', 'column', 'important');
				htmlNestedList.style.setProperty('align-items', 'flex-start', 'important');
				htmlNestedList.style.setProperty('gap', '8px', 'important');
				htmlNestedList.style.setProperty('margin-left', '30px', 'important');
				htmlNestedList.style.setProperty('position', 'relative', 'important');
				htmlNestedList.style.setProperty('padding-left', '20px', 'important');
				
				// Count real child items (excluding connector elements)
				const childItems = Array.from(htmlNestedList.children).filter(child => 
					child.tagName === 'LI'
				);
				
				// Add vertical line connecting all children (if more than one)
				if (childItems.length > 1) {
					const vertConnector = document.createElement('div');
					vertConnector.className = 'mindmap-connector-v';
					vertConnector.style.setProperty('position', 'absolute', 'important');
					vertConnector.style.setProperty('left', '-20px', 'important');
					vertConnector.style.setProperty('top', '20px', 'important'); // Start from first child
					vertConnector.style.setProperty('height', `calc(100% - 40px)`, 'important'); // Extend to last child
					vertConnector.style.setProperty('width', '2px', 'important');
					vertConnector.style.setProperty('background', 'var(--background-modifier-border)', 'important');
					vertConnector.style.setProperty('z-index', '0', 'important');
					htmlNestedList.appendChild(vertConnector);
				}
				
				// Add horizontal connector from parent to each child
				childItems.forEach((childItem, childIndex) => {
					const htmlChildItem = childItem as HTMLElement;
					const connector = document.createElement('div');
					connector.className = 'mindmap-connector-h';
					connector.style.setProperty('position', 'absolute', 'important');
					connector.style.setProperty('left', '-20px', 'important');
					connector.style.setProperty('top', '50%', 'important');
					connector.style.setProperty('transform', 'translateY(-50%)', 'important');
					connector.style.setProperty('width', '20px', 'important');
					connector.style.setProperty('height', '2px', 'important');
					connector.style.setProperty('background', 'var(--background-modifier-border)', 'important');
					connector.style.setProperty('z-index', '1', 'important');
					
					// Make child item position relative for absolute positioning of connector
					htmlChildItem.style.setProperty('position', 'relative', 'important');
					htmlChildItem.insertBefore(connector, htmlChildItem.firstChild);
				});
			});
		});
		
		// Remove empty paragraphs
		const paragraphs = wrapper.querySelectorAll('li > p');
		paragraphs.forEach((p) => {
			const htmlP = p as HTMLElement;
			if (htmlP.textContent?.trim()) {
				// Keep non-empty paragraphs but remove margins
				htmlP.style.setProperty('margin', '0', 'important');
				htmlP.style.setProperty('line-height', 'inherit', 'important');
			}
		});
	}

	/**
	 * Get direct text content of a list item (excluding nested lists)
	 */
	private getDirectTextContent(element: HTMLElement): string {
		let text = '';
		
		// Get all direct child nodes
		element.childNodes.forEach((node) => {
			// Skip nested lists
			if (node.nodeName === 'UL' || node.nodeName === 'OL') {
				return;
			}
			
			// Get text from text nodes and elements (like <p>)
			if (node.nodeType === Node.TEXT_NODE) {
				text += node.textContent || '';
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				// Only get text from non-list elements
				if (el.tagName !== 'UL' && el.tagName !== 'OL') {
					text += el.textContent || '';
				}
			}
		});
		
		return text.trim();
	}

	/**
	 * Get the depth level of a list item (0 = root level)
	 */
	private getListDepth(element: HTMLElement): number {
		let depth = 0;
		let parent = element.parentElement;
		
		while (parent) {
			if (parent.tagName === 'UL' || parent.tagName === 'OL') {
				depth++;
			}
			parent = parent.parentElement;
		}
		
		return depth - 1; // Subtract 1 because we count from the wrapper
	}

	/**
	 * Render mermaid diagram with zoom and pan support
	 */
	private async renderMermaid(container: HTMLElement, mermaidCode: string) {
		try {
			// Sanitize mermaid code to fix common syntax errors
			const sanitizedCode = this.sanitizeMermaidCode(mermaidCode);
			
			// Create container for mermaid diagram with full width
			const mermaidContainer = container.createDiv({ cls: 'speed-reading-mermaid-container' });
			
			// Set large size for better visibility
			mermaidContainer.style.setProperty('min-height', '400px', 'important');
			mermaidContainer.style.setProperty('width', '100%', 'important');
			mermaidContainer.style.setProperty('display', 'flex', 'important');
			mermaidContainer.style.setProperty('align-items', 'center', 'important');
			mermaidContainer.style.setProperty('justify-content', 'center', 'important');
			mermaidContainer.style.setProperty('overflow', 'auto', 'important');
			
			// Use Obsidian's markdown renderer to render mermaid
			const component = new Component();
			this.markdownComponents.push(component);
			await MarkdownRenderer.render(
				this.app,
				'```mermaid\n' + sanitizedCode + '\n```',
				mermaidContainer,
				'',
				component
			);
			
			// Scale up the SVG for better visibility
			const svg = mermaidContainer.querySelector('svg');
			if (svg) {
				svg.style.setProperty('width', '100%', 'important');
				svg.style.setProperty('height', 'auto', 'important');
				svg.style.setProperty('max-width', '100%', 'important');
				// Enlarge the diagram
				svg.style.setProperty('transform', 'scale(1.2)', 'important');
				svg.style.setProperty('transform-origin', 'center', 'important');
			}
			
			// Make diagram clickable to open in fullscreen modal
			mermaidContainer.style.cursor = 'pointer';
			mermaidContainer.onclick = () => {
				this.openMermaidModal(sanitizedCode);
			};
			
		} catch (error) {
			Logger.error('[SpeedReading] Mermaid rendering failed:', error);
			// Show error message
			container.createEl('p', {
				text: this.plugin.i18n.t('ui.speedReadingMindMapRenderFailed'),
				cls: 'speed-reading-mermaid-error'
			});
		}
	}

	/**
	 * Sanitize Mermaid code to prevent syntax errors
	 */
	private sanitizeMermaidCode(code: string): string {
		// Replace parentheses in node labels with full-width parentheses
		// Regex explanation: Match content inside [] and replace ( ) with （ ）
		return code.replace(/\[(.*?)\]/g, (match, content) => {
			const sanitizedContent = content
				.replace(/\(/g, '（')
				.replace(/\)/g, '）');
			return `[${sanitizedContent}]`;
		});
	}
	
	/**
	 * Open mermaid diagram in fullscreen modal with zoom and pan
	 */
	private openMermaidModal(mermaidCode: string) {
		// Create modal container with higher z-index
		const modal = document.body.createEl('div', {
			cls: 'llmsider-mermaid-modal'
		});
		modal.style.setProperty('z-index', '9999999', 'important'); // Higher than drawer
		modal.style.setProperty('position', 'fixed', 'important');
		modal.style.setProperty('top', '0', 'important');
		modal.style.setProperty('left', '0', 'important');
		modal.style.setProperty('right', '0', 'important');
		modal.style.setProperty('bottom', '0', 'important');
		modal.style.setProperty('display', 'flex', 'important');
		modal.style.setProperty('align-items', 'center', 'important');
		modal.style.setProperty('justify-content', 'center', 'important');
		
		// Create backdrop
		const backdrop = modal.createEl('div', {
			cls: 'llmsider-mermaid-backdrop'
		});
		backdrop.style.setProperty('position', 'absolute', 'important');
		backdrop.style.setProperty('top', '0', 'important');
		backdrop.style.setProperty('left', '0', 'important');
		backdrop.style.setProperty('right', '0', 'important');
		backdrop.style.setProperty('bottom', '0', 'important');
		backdrop.style.setProperty('background', 'rgba(0, 0, 0, 0.85)', 'important');
		backdrop.style.setProperty('backdrop-filter', 'blur(8px)', 'important');
		
		// Create modal content container - full screen
		const modalContent = modal.createEl('div', {
			cls: 'llmsider-mermaid-modal-content'
		});
		modalContent.style.setProperty('position', 'relative', 'important');
		modalContent.style.setProperty('width', '100vw', 'important');
		modalContent.style.setProperty('height', '100vh', 'important');
		modalContent.style.setProperty('display', 'flex', 'important');
		modalContent.style.setProperty('flex-direction', 'column', 'important');
		modalContent.style.setProperty('background', 'var(--background-primary)', 'important');
		modalContent.style.setProperty('z-index', '1', 'important');
		
		// Add toolbar at top with buttons
		const toolbar = modalContent.createEl('div', {
			cls: 'llmsider-mermaid-toolbar'
		});
		toolbar.style.setProperty('display', 'flex', 'important');
		toolbar.style.setProperty('justify-content', 'space-between', 'important');
		toolbar.style.setProperty('align-items', 'center', 'important');
		toolbar.style.setProperty('padding', '16px 24px', 'important');
		toolbar.style.setProperty('border-bottom', '1px solid var(--background-modifier-border)', 'important');
		toolbar.style.setProperty('flex-shrink', '0', 'important');
		
		// Left side - hint text
		const hint = toolbar.createEl('div', {
			cls: 'llmsider-mermaid-hint',
			text: this.plugin.i18n.t('ui.speedReadingMouseWheelZoom')
		});
		hint.style.setProperty('font-size', '13px', 'important');
		hint.style.setProperty('color', 'var(--text-muted)', 'important');
		
		// Right side - button group
		const buttonGroup = toolbar.createEl('div');
		buttonGroup.style.setProperty('display', 'flex', 'important');
		buttonGroup.style.setProperty('gap', '8px', 'important');
		
		// Export button
		const exportBtn = buttonGroup.createEl('button', {
			cls: 'llmsider-input-btn',
			attr: { 'aria-label': this.plugin.i18n.t('ui.speedReadingExportAsImage'), 'title': this.plugin.i18n.t('ui.speedReadingExportAsImage') }
		});
		exportBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
		exportBtn.onclick = () => this.exportMermaidAsImage(mermaidContainer);
		
		// Close button
		const closeBtn = buttonGroup.createEl('button', {
			cls: 'llmsider-input-btn',
			attr: { 'aria-label': this.plugin.i18n.t('ui.speedReadingClose'), 'title': this.plugin.i18n.t('ui.speedReadingClose') }
		});
		closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
		closeBtn.onclick = () => modal.remove();
		
		// Create a container for the mermaid diagram - full screen
		const mermaidContainer = modalContent.createEl('div', {
			cls: 'llmsider-mermaid-container'
		});
		mermaidContainer.style.setProperty('flex', '1', 'important');
		mermaidContainer.style.setProperty('overflow', 'hidden', 'important');
		mermaidContainer.style.setProperty('display', 'flex', 'important');
		mermaidContainer.style.setProperty('align-items', 'center', 'important');
		mermaidContainer.style.setProperty('justify-content', 'center', 'important');
		mermaidContainer.style.setProperty('position', 'relative', 'important');
		
		// Render using Obsidian's markdown renderer
		const component = new Component();
		this.markdownComponents.push(component);
		MarkdownRenderer.render(
			this.app,
			'```mermaid\n' + mermaidCode + '\n```',
			mermaidContainer,
			'',
			component
		).then(() => {
			// After render, fit SVG to container
			const svg = mermaidContainer.querySelector('svg');
			if (svg) {
				// Get SVG natural dimensions
				const svgRect = svg.getBoundingClientRect();
				const containerRect = mermaidContainer.getBoundingClientRect();
				
				// Calculate scale to fit
				const scaleX = (containerRect.width * 0.9) / svgRect.width;
				const scaleY = (containerRect.height * 0.9) / svgRect.height;
				const fitScale = Math.min(scaleX, scaleY);
				
				// Set initial scale to fit container
				currentScale = fitScale;
				applyTransform();
			}
		}).catch(error => {
			Logger.error('[SpeedReading] Modal mermaid rendering failed:', error);
		});

		// Initialize zoom and pan state
		let currentScale = 1; // Will be set after SVG renders
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
			modal.remove();
		};

		// Close modal when clicking outside the content
		modal.onclick = (e) => {
			if (e.target === modal) {
				modal.remove();
			}
		};

		// Prevent closing when clicking the content itself
		modalContent.onclick = (e) => {
			e.stopPropagation();
		};
	}

	/**
	 * Export mermaid diagram as image
	 */
	private async exportMermaidAsImage(container: HTMLElement) {
		try {
			const svg = container.querySelector('svg');
			if (!svg) {
				new Notice(this.plugin.i18n.t('ui.speedReadingMindMapNotFound'));
				return;
			}

			// Get SVG data
			const svgData = new XMLSerializer().serializeToString(svg);
			const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
			
			// Create download link
			const url = URL.createObjectURL(svgBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `mindmap-${Date.now()}.svg`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			
			new Notice(this.plugin.i18n.t('ui.speedReadingMindMapExported'));
		} catch (error) {
			Logger.error('[SpeedReading] Export failed:', error);
			new Notice(this.plugin.i18n.t('ui.speedReadingExportFailed'));
		}
	}

	/**
	 * Copy result to clipboard as markdown
	 */
	private async copyToClipboard(result: SpeedReadingResult) {
		const markdown = this.generateMarkdown(result);
		
		try {
			await navigator.clipboard.writeText(markdown);
			// Update button icon temporarily to show success
			const btn = this.drawerEl?.querySelector('.speed-reading-export-btn') as HTMLElement;
			if (btn) {
				const originalHTML = btn.innerHTML;
				btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
				btn.style.color = 'var(--color-green)';
				setTimeout(() => {
					btn.innerHTML = originalHTML;
					btn.style.color = 'var(--text-muted)';
				}, 2000);
			}
		} catch (error) {
			Logger.error('[SpeedReading] Copy failed:', error);
		}
	}

	/**
	 * Generate markdown format
	 */
	private generateMarkdown(result: SpeedReadingResult, svgFileName?: string): string {
		let markdown = `# 📖 ${result.noteTitle}\n\n`;
		markdown += `> ${this.plugin.i18n.t('ui.speedReadingSmartReport')}\n\n`;

		// Summary
		if (result.summary) {
			markdown += `## 📝 ${this.plugin.i18n.t('ui.speedReadingExecutiveSummary')}\n\n${result.summary}\n\n`;
		}

		// Key Points
		if (result.keyPoints && result.keyPoints.length > 0) {
			markdown += `## 🎯 ${this.plugin.i18n.t('ui.speedReadingCorePoints')}\n\n`;
			result.keyPoints.forEach((point, index) => {
				markdown += `${index + 1}. ${point}\n`;
			});
			markdown += '\n';
		}

		// Mind Map - embed SVG if available, otherwise convert to markdown list
		if (result.mindMap) {
			markdown += `## 🗺️ ${this.plugin.i18n.t('ui.speedReadingKnowledgeStructure')}\n\n`;
			if (svgFileName) {
				// Embed SVG using markdown image syntax
				markdown += `![[${svgFileName}]]\n\n`;
			} else {
				// Fallback: Parse mindMap and convert to markdown list (for clipboard copy)
				try {
					// Try to parse as JSON and convert to markdown
					if (result.mindMap.trim().startsWith('{')) {
						const jsonData = JSON.parse(result.mindMap);
						const convertToMarkdown = (node: any, level: number = 0): string => {
							let md = '';
							const indent = '  '.repeat(level);
							if (level === 0) {
								md += `${node.topic}\n`;
							} else {
								md += `${indent}- ${node.topic}\n`;
							}
							if (node.children && node.children.length > 0) {
								node.children.forEach((child: any) => {
									md += convertToMarkdown(child, level + 1);
								});
							}
							return md;
						};
						
						if (jsonData.data) {
							if (Array.isArray(jsonData.data)) {
								// node_array format
								const rootNode = jsonData.data.find((n: any) => n.isroot);
								if (rootNode) {
									const nodeMap = new Map<string, any>();
									jsonData.data.forEach((node: any) => {
										nodeMap.set(node.id, { ...node, children: [] });
									});
									jsonData.data.forEach((node: any) => {
										if (!node.isroot && node.parentid) {
											const parent = nodeMap.get(node.parentid);
											if (parent) {
												parent.children.push(nodeMap.get(node.id));
											}
										}
									});
									markdown += convertToMarkdown(nodeMap.get(rootNode.id), 0);
								}
							} else {
								// node_tree format
								markdown += convertToMarkdown(jsonData.data, 0);
							}
						}
					} else {
						// Already markdown format
						const mindMapLines = result.mindMap.split('\n').filter(line => line.trim());
						mindMapLines.forEach(line => {
							if (line.trim()) {
								markdown += `${line}\n`;
							}
						});
					}
				} catch (e) {
					// Fallback to raw text
					const mindMapLines = result.mindMap.split('\n').filter(line => line.trim());
					mindMapLines.forEach(line => {
						if (line.trim()) {
							markdown += `${line}\n`;
						}
					});
				}
			}
			markdown += '\n';
		}

		// Extended Reading
		if (result.extendedReading && result.extendedReading.length > 0) {
			markdown += `## 📚 ${this.plugin.i18n.t('ui.speedReadingExtendedReading')}\n\n`;
			result.extendedReading.forEach(reading => {
				markdown += `- ${reading}\n`;
			});
			markdown += '\n';
		}

		// Guess you care about
		if (result.guessYouCareAbout && result.guessYouCareAbout.length > 0) {
			markdown += `## 🤔 ${this.plugin.i18n.t('ui.speedReadingGuessYouCareAbout')}\n\n`;
			result.guessYouCareAbout.forEach(guess => {
				markdown += `- ${guess}\n`;
			});
			markdown += '\n';
		}

		// Metadata
		markdown += `---\n\n`;
		markdown += `**${this.plugin.i18n.t('ui.speedReadingOriginalDoc')}**: [[${result.noteTitle}]]\n`;
		markdown += `**${this.plugin.i18n.t('ui.speedReadingGeneratedTime')}**: ${new Date(result.createdAt).toLocaleString('zh-CN')}\n`;

		return markdown;
	}

	/**
	 * Export report to a new note file
	 */
	private async exportToNote(result: SpeedReadingResult): Promise<void> {
		try {
			// Get the directory of the original note
			const originalFile = this.app.vault.getAbstractFileByPath(result.notePath);
			if (!originalFile) {
				new Notice(this.plugin.i18n.t('ui.speedReadingOriginalNoteNotFound'));
				return;
			}
			
			// Get parent folder path
			const parentPath = originalFile.parent?.path || '';
			
			// Generate new filename with timestamp to avoid conflicts
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			const baseFileName = result.noteTitle.replace(/\.(md|markdown)$/i, '');
			const newFileName = `${baseFileName}-${this.plugin.i18n.t('ui.speedReadingReportSuffix')}-${timestamp}.md`;
			const newFilePath = parentPath ? `${parentPath}/${newFileName}` : newFileName;
			
			// Generate SVG file for mind map if exists
			let svgFileName = '';
			if (result.mindMap) {
				svgFileName = `${baseFileName}-${this.plugin.i18n.t('ui.speedReadingMindMapSuffix')}-${timestamp}.svg`;
				const svgFilePath = parentPath ? `${parentPath}/${svgFileName}` : svgFileName;
				const svgContent = this.convertMindMapToSVG(result.mindMap);
				await this.app.vault.create(svgFilePath, svgContent);
			}
			
			// Generate markdown content with SVG reference
			const markdown = this.generateMarkdown(result, svgFileName);
			
			// Create the new file
			const newFile = await this.app.vault.create(newFilePath, markdown);
			
			// Show success message
			new Notice(this.plugin.i18n.t('ui.speedReadingReportExported', { fileName: newFileName }));
			
			// Optional: Open the new file
			const leaf = this.app.workspace.getLeaf(false);
			if (leaf) {
				await leaf.openFile(newFile);
			}
			
			// Close the drawer
			this.close();
		} catch (error) {
			Logger.error('[SpeedReading] Export to note failed:', error);
			new Notice(this.plugin.i18n.t('ui.speedReadingExportFailed'));
		}
	}

	/**
	 * Show fullscreen mindmap view
	 */
	private showFullscreenMindMap(mindMapContent: string): void {
		// Create fullscreen overlay
		const overlay = document.body.createDiv({ cls: 'speed-reading-fullscreen-overlay' });
		overlay.style.setProperty('position', 'fixed', 'important');
		overlay.style.setProperty('top', '0', 'important');
		overlay.style.setProperty('left', '0', 'important');
		overlay.style.setProperty('width', '100vw', 'important');
		overlay.style.setProperty('height', '100vh', 'important');
		overlay.style.setProperty('background', 'var(--background-primary)', 'important');
		overlay.style.setProperty('z-index', '1000000', 'important');
		overlay.style.setProperty('display', 'flex', 'important');
		overlay.style.setProperty('flex-direction', 'column', 'important');
		overlay.style.setProperty('overflow', 'hidden', 'important');
		
		// Header with close button and controls
		const header = overlay.createDiv({ cls: 'fullscreen-header' });
		header.style.setProperty('display', 'flex', 'important');
		header.style.setProperty('align-items', 'center', 'important');
		header.style.setProperty('justify-content', 'space-between', 'important');
		header.style.setProperty('padding', '16px 24px', 'important');
		header.style.setProperty('border-bottom', '1px solid var(--background-modifier-border)', 'important');
		header.style.setProperty('background', 'var(--background-secondary)', 'important');
		header.style.setProperty('gap', '12px', 'important');
		
		const title = header.createEl('h2', { text: this.plugin.i18n.t('ui.speedReadingFullscreenTitle') });
		title.style.setProperty('margin', '0', 'important');
		title.style.setProperty('font-size', '18px', 'important');
		title.style.setProperty('font-weight', '600', 'important');
		
		// Button container
		const controls = header.createDiv();
		controls.style.setProperty('display', 'flex', 'important');
		controls.style.setProperty('gap', '8px', 'important');
		controls.style.setProperty('align-items', 'center', 'important');
		
		// Zoom controls
		const zoomControls = controls.createDiv();
		zoomControls.style.setProperty('display', 'flex', 'important');
		zoomControls.style.setProperty('gap', '4px', 'important');
		
		// Zoom out button with SVG
		const zoomOutBtn = zoomControls.createEl('button', { cls: 'llmsider-input-btn' });
		zoomOutBtn.setAttribute('aria-label', this.plugin.i18n.t('ui.speedReadingZoomOut'));
		zoomOutBtn.setAttribute('title', this.plugin.i18n.t('ui.speedReadingZoomOut'));
		zoomOutBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
		
		// Zoom in button with SVG
		const zoomInBtn = zoomControls.createEl('button', { cls: 'llmsider-input-btn' });
		zoomInBtn.setAttribute('aria-label', this.plugin.i18n.t('ui.speedReadingZoomIn'));
		zoomInBtn.setAttribute('title', this.plugin.i18n.t('ui.speedReadingZoomIn'));
		zoomInBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
		
		// Export button with dropdown
		const exportWrapper = controls.createDiv();
		exportWrapper.style.setProperty('position', 'relative', 'important');
		
		// Export button with SVG
		const exportBtn = exportWrapper.createEl('button', { cls: 'llmsider-input-btn' });
		exportBtn.style.setProperty('cursor', 'pointer', 'important');
		exportBtn.setAttribute('aria-label', this.plugin.i18n.t('ui.speedReadingExportMindMap'));
		exportBtn.setAttribute('title', this.plugin.i18n.t('ui.speedReadingExportMindMap'));
		exportBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
		
		// Export dropdown menu
		let exportMenu: HTMLElement | null = null;
		const hideExportMenu = () => {
			if (exportMenu && exportMenu.parentElement) {
				exportMenu.remove();
				exportMenu = null;
			}
		};
		
		const exportFormats = [
			{ name: 'JSMind', ext: 'jm' },
			{ name: 'Text', ext: 'txt' },
			{ name: 'Markdown', ext: 'md' },
			{ name: 'Mermaid', ext: 'mmd' },
			{ name: 'Freemind', ext: 'mm' },
			{ name: 'SVG', ext: 'svg' },
			{ name: 'PNG', ext: 'png' }
		];
		
		exportBtn.addEventListener('click', (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			
			if (exportMenu) {
				hideExportMenu();
				return;
			}
			
			exportMenu = document.body.createDiv({ cls: 'mindmap-export-menu' });
			exportMenu.style.setProperty('position', 'fixed', 'important');
			exportMenu.style.setProperty('background', 'var(--background-primary)', 'important');
			exportMenu.style.setProperty('border', '1px solid var(--background-modifier-border)', 'important');
			exportMenu.style.setProperty('border-radius', '8px', 'important');
			exportMenu.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)', 'important');
			exportMenu.style.setProperty('padding', '4px', 'important');
			exportMenu.style.setProperty('z-index', '10000000', 'important');
			exportMenu.style.setProperty('min-width', '120px', 'important');
			
			exportFormats.forEach(format => {
				const item = exportMenu!.createEl('button', { text: format.name, cls: 'mindmap-export-item' });
				item.style.setProperty('display', 'block', 'important');
				item.style.setProperty('width', '100%', 'important');
				item.style.setProperty('padding', '8px 12px', 'important');
				item.style.setProperty('text-align', 'left', 'important');
				item.style.setProperty('background', 'transparent', 'important');
				item.style.setProperty('border', 'none', 'important');
				item.style.setProperty('border-radius', '4px', 'important');
				item.style.setProperty('cursor', 'pointer', 'important');
				item.style.setProperty('transition', 'background 0.2s', 'important');
				item.style.setProperty('color', 'var(--text-normal)', 'important');
				
				item.addEventListener('mouseover', () => {
					item.style.background = 'var(--background-modifier-hover)';
				});
				item.addEventListener('mouseout', () => {
					item.style.background = 'transparent';
				});
				
				item.addEventListener('click', (itemEvent: MouseEvent) => {
					itemEvent.preventDefault();
					itemEvent.stopPropagation();
					this.exportMindMap(mindMapContent, format.name, format.ext);
					hideExportMenu();
				});
			});
			
			const btnRect = exportBtn.getBoundingClientRect();
			const menuWidth = 140; // min-width of menu
			const menuHeight = exportFormats.length * 40; // approximate height
			
			// Calculate position, avoiding screen edges
			let top = btnRect.bottom + 5;
			let left = btnRect.left;
			
			// Check if menu goes off right edge
			if (left + menuWidth > window.innerWidth) {
				left = window.innerWidth - menuWidth - 10;
			}
			
			// Check if menu goes off bottom edge
			if (top + menuHeight > window.innerHeight) {
				top = btnRect.top - menuHeight - 5; // Show above button
			}
			
			// Check if menu goes off left edge
			if (left < 10) {
				left = 10;
			}
			
			// Check if menu goes off top edge
			if (top < 10) {
				top = 10;
			}
			
			exportMenu.style.top = `${top}px`;
			exportMenu.style.left = `${left}px`;
			
			// Close menu when clicking outside
			const handleClickOutside = (clickEvent: MouseEvent) => {
				if (exportMenu && !exportMenu.contains(clickEvent.target as Node) && clickEvent.target !== exportBtn) {
					hideExportMenu();
					document.removeEventListener('click', handleClickOutside);
				}
			};
			
			setTimeout(() => {
				document.addEventListener('click', handleClickOutside);
			}, 0);
		});
		
		// Close button with SVG
		const closeBtn = controls.createEl('button', { cls: 'llmsider-input-btn' });
		closeBtn.setAttribute('aria-label', this.plugin.i18n.t('ui.speedReadingClose'));
		closeBtn.setAttribute('title', this.plugin.i18n.t('ui.speedReadingClose'));
		closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
		closeBtn.onclick = () => {
			hideExportMenu();
			overlay.remove();
			document.removeEventListener('keydown', handleKeyDown, true);
		};
		
		// Content container
		const content = overlay.createDiv({ cls: 'fullscreen-content' });
		content.style.setProperty('flex', '1', 'important');
		content.style.setProperty('overflow', 'auto', 'important');
		content.style.setProperty('padding', '40px', 'important');
		content.style.setProperty('position', 'relative', 'important');
		
		// Create jsMind container
		const jsmindContainer = content.createDiv({ cls: 'jsmind-fullscreen-container' });
		jsmindContainer.style.setProperty('width', '100%', 'important');
		jsmindContainer.style.setProperty('height', '100%', 'important');
		jsmindContainer.style.setProperty('min-height', '600px', 'important');
		
		const containerId = `jsmind-fullscreen-${Date.now()}`;
		jsmindContainer.id = containerId;
		
		// Initialize jsMind or fallback to text rendering
		if (this.jsMindLoaded && window.jsMind) {
			try {
				// Determine if mindMapContent is already a JSON string or needs parsing from Markdown
				let mindData: any;
				if (mindMapContent.trim().startsWith('{')) {
					try {
						mindData = JSON.parse(mindMapContent);
					} catch (e) {
						mindData = this.parseMarkdownToJsMind(mindMapContent);
					}
				} else {
					mindData = this.parseMarkdownToJsMind(mindMapContent);
				}
				
				const options = {
					container: containerId,
					theme: 'primary',
					mode: 'side',
					editable: false,
					support_html: true,
					view: {
						engine: 'canvas',
						hmargin: 150,
						vmargin: 80,
						line_width: 2,
						line_color: '#555',
						line_style: 'curved',
						draggable: true
					},
					layout: {
						hspace: 40,
						vspace: 30,
						pspace: 15
					}
				};
				
				this.jsMindInstance = new window.jsMind(options);
				this.jsMindInstance.show(mindData);
				
				// Zoom functionality for jsMind
				zoomInBtn.onclick = () => {
					if (this.jsMindInstance) {
						this.jsMindInstance.view.zoomIn();
					}
				};
				
				zoomOutBtn.onclick = () => {
					if (this.jsMindInstance) {
						this.jsMindInstance.view.zoomOut();
					}
				};
				
			} catch (error) {
				Logger.error('[SpeedReading] jsMind fullscreen failed:', error);
				// Fallback to text rendering
				jsmindContainer.empty();
				this.renderTextMindMap(jsmindContainer, mindMapContent);
				this.setupTextZoom(content, zoomInBtn, zoomOutBtn);
			}
		} else {
			// Fallback to text rendering
			this.renderTextMindMap(jsmindContainer, mindMapContent);
			this.setupTextZoom(content, zoomInBtn, zoomOutBtn);
		}
		
		// Close on ESC key - use capture phase to intercept before drawer handler
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				hideExportMenu();
				overlay.remove();
				this.jsMindInstance = null;
				document.removeEventListener('keydown', handleKeyDown, true);
			}
		};
		document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
		
		// Close on overlay click (but not on content)
		overlay.onclick = (e) => {
			if (e.target === overlay) {
				hideExportMenu();
				overlay.remove();
				this.jsMindInstance = null;
				document.removeEventListener('keydown', handleKeyDown, true);
			}
		};
		
		// Prevent overlay clicks from reaching drawer
		overlay.addEventListener('click', (e) => {
			e.stopPropagation();
		});
	}

	/**
	 * Setup zoom for text-based mindmap
	 */
	private setupTextZoom(content: HTMLElement, zoomInBtn: HTMLElement, zoomOutBtn: HTMLElement): void {
		let zoomLevel = 1;
		const minZoom = 0.5;
		const maxZoom = 2;
		const zoomStep = 0.1;
		
		const updateZoom = () => {
			content.style.setProperty('transform', `scale(${zoomLevel})`, 'important');
			content.style.setProperty('transform-origin', 'top left', 'important');
		};
		
		zoomInBtn.onclick = () => {
			if (zoomLevel < maxZoom) {
				zoomLevel = Math.min(zoomLevel + zoomStep, maxZoom);
				updateZoom();
			}
		};
		
		zoomOutBtn.onclick = () => {
			if (zoomLevel > minZoom) {
				zoomLevel = Math.max(zoomLevel - zoomStep, minZoom);
				updateZoom();
			}
		};
	}

	/**
	 * Copy mindmap to clipboard in various formats
	 */
	private async copyMindMapToClipboard(content: string, formatName: string, ext: string): Promise<void> {
		let exportContent: string;
		
		switch (ext) {
			case 'json':
				exportContent = this.convertMindMapToJSON(content);
				break;
			case 'md':
				exportContent = this.convertMindMapToMarkdown(content);
				break;
			case 'mmd':
				exportContent = this.convertMindMapToMermaid(content);
				break;
			case 'mm':
				exportContent = this.convertMindMapToFreemind(content);
				break;
			case 'svg':
				// SVG export from jsMind canvas
				if (this.jsMindInstance) {
					try {
						const svgXml = this.jsMindInstance.screenshot.shootSVG();
						await navigator.clipboard.writeText(svgXml);
						new Notice(this.plugin.i18n.t('ui.speedReadingCopiedAs', { formatName }));
						return;
					} catch (e) {
						new Notice(this.plugin.i18n.t('ui.speedReadingSVGExportFailed'));
						return;
					}
				} else {
					new Notice(this.plugin.i18n.t('ui.speedReadingSVGOnlyInJsMind'));
					return;
				}
			default:
				exportContent = content;
		}
		
		try {
			await navigator.clipboard.writeText(exportContent);
			new Notice(this.plugin.i18n.t('ui.speedReadingCopiedAs', { formatName }));
		} catch (error) {
			new Notice(this.plugin.i18n.t('ui.speedReadingCopyFailed'));
		}
	}

	/**
	 * Export mindmap in various formats
	 */
	private exportMindMap(content: string, formatName: string, ext: string): void {
		let exportContent: string;
		
		switch (ext) {
			case 'json':
				exportContent = this.convertMindMapToJSON(content);
				break;
			case 'txt':
				exportContent = this.convertMindMapToText(content);
				break;
			case 'md':
				exportContent = this.convertMindMapToMarkdown(content);
				break;
			case 'mmd':
				exportContent = this.convertMindMapToMermaid(content);
				break;
			case 'mm':
				exportContent = this.convertMindMapToFreemind(content);
				break;
			case 'svg':
				exportContent = this.convertMindMapToSVG(content);
				break;
			case 'png':
				// PNG is handled asynchronously
				this.convertMindMapToPNG(content);
				return;
			default:
				exportContent = content;
		}
		
		const mimeType = ext === 'jm' ? 'application/json' : ext === 'svg' ? 'image/svg+xml' : 'text/plain';
		const blob = new Blob([exportContent], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `mindmap-${Date.now()}.${ext}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	/**
	 * Convert mindmap to JSON format
	 */
	private convertMindMapToJSON(content: string): string {
		// If already JSON, just format it
		if (content.trim().startsWith('{')) {
			try {
				const parsed = JSON.parse(content);
				return JSON.stringify(parsed, null, 2);
			} catch (e) {
				// Invalid JSON, fallback to markdown parsing
			}
		}
		
		// Parse from markdown format
		const lines = content.split('\n').filter(line => line.trim());
		const root: any = { topic: '', children: [] };
		const stack: Array<{ node: any; level: number }> = [];
		
		lines.forEach(line => {
			const match = line.match(/^(\s*)-\s+(.+)$/);
			if (!match) {
				if (!root.topic) root.topic = line.trim();
				return;
			}
			
			const indent = match[1].length;
			const topic = match[2].trim();
			const level = Math.floor(indent / 2);
			const node = { topic, children: [] };
			
			while (stack.length > 0 && stack[stack.length - 1].level >= level) {
				stack.pop();
			}
			
			if (stack.length === 0) {
				root.children.push(node);
			} else {
				stack[stack.length - 1].node.children.push(node);
			}
			
			stack.push({ node, level });
		});
		
		return JSON.stringify({ meta: { name: 'Mind Map', version: '1.0' }, data: root }, null, 2);
	}

	/**
	 * Convert mindmap to plain text
	 */
	private convertMindMapToText(content: string): string {
		// If JSON, convert to text tree
		if (content.trim().startsWith('{')) {
			try {
				const jsonData = JSON.parse(content);
				let text = '';
				
				const convertNode = (node: any, indent: number = 0) => {
					const prefix = '  '.repeat(indent);
					text += `${prefix}${node.topic}\n`;
					
					if (node.children && node.children.length > 0) {
						node.children.forEach((child: any) => {
							convertNode(child, indent + 1);
						});
					}
				};
				
				if (jsonData.data) {
					if (Array.isArray(jsonData.data)) {
						// node_array format
						const rootNode = jsonData.data.find((n: any) => n.isroot);
						if (rootNode) {
							const nodeMap = new Map<string, any>();
							jsonData.data.forEach((node: any) => {
								nodeMap.set(node.id, { ...node, children: [] });
							});
							
							jsonData.data.forEach((node: any) => {
								if (!node.isroot && node.parentid) {
									const parent = nodeMap.get(node.parentid);
									if (parent) {
										parent.children.push(nodeMap.get(node.id));
									}
								}
							});
							
							convertNode(nodeMap.get(rootNode.id), 0);
						}
					} else {
						// node_tree format
						convertNode(jsonData.data, 0);
					}
				}
				
				return text;
			} catch (e) {
				// Invalid JSON, return as is
			}
		}
		
		// Already text/markdown format
		return content;
	}

	/**
	 * Convert mindmap to Markdown format
	 */
	private convertMindMapToMarkdown(content: string): string {
		// If JSON, convert to markdown
		if (content.trim().startsWith('{')) {
			try {
				const jsonData = JSON.parse(content);
				let markdown = '';
				
				const convertNode = (node: any, level: number = 0) => {
					const indent = '  '.repeat(level);
					if (level === 0) {
						markdown += `# ${node.topic}\n\n`;
					} else {
						markdown += `${indent}- ${node.topic}\n`;
					}
					
					if (node.children && node.children.length > 0) {
						node.children.forEach((child: any) => {
							convertNode(child, level + 1);
						});
					}
				};
				
				if (jsonData.data) {
					if (Array.isArray(jsonData.data)) {
						// node_array format
						const rootNode = jsonData.data.find((n: any) => n.isroot);
						if (rootNode) {
							const nodeMap = new Map<string, any>();
							jsonData.data.forEach((node: any) => {
								nodeMap.set(node.id, { ...node, children: [] });
							});
							
							jsonData.data.forEach((node: any) => {
								if (!node.isroot && node.parentid) {
									const parent = nodeMap.get(node.parentid);
									if (parent) {
										parent.children.push(nodeMap.get(node.id));
									}
								}
							});
							
							convertNode(nodeMap.get(rootNode.id), 0);
						}
					} else {
						// node_tree format
						convertNode(jsonData.data, 0);
					}
				}
				
				return markdown;
			} catch (e) {
				// Invalid JSON, return as is
			}
		}
		
		// Already markdown format
		return content;
	}

	/**
	 * Convert mindmap to Mermaid format
	 */
	private convertMindMapToMermaid(content: string): string {
		let mermaid = 'mindmap\n';
		
		// If JSON, convert to mermaid
		if (content.trim().startsWith('{')) {
			try {
				const jsonData = JSON.parse(content);
				
				const convertNode = (node: any, level: number = 0) => {
					const indent = '  '.repeat(level + 1);
					mermaid += `${indent}${node.topic}\n`;
					
					if (node.children && node.children.length > 0) {
						node.children.forEach((child: any) => {
							convertNode(child, level + 1);
						});
					}
				};
				
				if (jsonData.data) {
					if (Array.isArray(jsonData.data)) {
						// node_array format
						const rootNode = jsonData.data.find((n: any) => n.isroot);
						if (rootNode) {
							const nodeMap = new Map<string, any>();
							jsonData.data.forEach((node: any) => {
								nodeMap.set(node.id, { ...node, children: [] });
							});
							
							jsonData.data.forEach((node: any) => {
								if (!node.isroot && node.parentid) {
									const parent = nodeMap.get(node.parentid);
									if (parent) {
										parent.children.push(nodeMap.get(node.id));
									}
								}
							});
							
							convertNode(nodeMap.get(rootNode.id), 0);
						}
					} else {
						// node_tree format
						convertNode(jsonData.data, 0);
					}
				}
				
				return mermaid;
			} catch (e) {
				// Invalid JSON, fallback to markdown parsing
			}
		}
		
		// Parse from markdown format
		const lines = content.split('\n').filter(line => line.trim());
		
		lines.forEach(line => {
			const match = line.match(/^(\s*)-\s+(.+)$/);
			if (match) {
				const indent = match[1].length;
				const topic = match[2].trim();
				const spaces = '  '.repeat(Math.floor(indent / 2) + 1);
				mermaid += `${spaces}${topic}\n`;
			} else if (line.trim()) {
				mermaid += `  ${line.trim()}\n`;
			}
		});
		
		return mermaid;
	}

	/**
	 * Convert mindmap to Freemind format
	 */
	private convertMindMapToFreemind(content: string): string {
		const escapeXml = (str: string) => {
			return str.replace(/[<>&'"]/g, (char) => {
				switch (char) {
					case '<': return '&lt;';
					case '>': return '&gt;';
					case '&': return '&amp;';
					case "'": return '&apos;';
					case '"': return '&quot;';
					default: return char;
				}
			});
		};
		
		let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<map version="1.0">\n';
		let rootTopic = 'Mind Map';
		
		// If JSON, convert to Freemind
		if (content.trim().startsWith('{')) {
			try {
				const jsonData = JSON.parse(content);
				
				const convertNode = (node: any, depth: number = 1) => {
					const indent = '  '.repeat(depth);
					let nodeXml = `${indent}<node TEXT="${escapeXml(node.topic)}">\n`;
					
					if (node.children && node.children.length > 0) {
						node.children.forEach((child: any) => {
							nodeXml += convertNode(child, depth + 1);
						});
					}
					
					nodeXml += `${indent}</node>\n`;
					return nodeXml;
				};
				
				if (jsonData.data) {
					if (Array.isArray(jsonData.data)) {
						// node_array format
						const rootNode = jsonData.data.find((n: any) => n.isroot);
						if (rootNode) {
							rootTopic = rootNode.topic;
							const nodeMap = new Map<string, any>();
							jsonData.data.forEach((node: any) => {
								nodeMap.set(node.id, { ...node, children: [] });
							});
							
							jsonData.data.forEach((node: any) => {
								if (!node.isroot && node.parentid) {
									const parent = nodeMap.get(node.parentid);
									if (parent) {
										parent.children.push(nodeMap.get(node.id));
									}
								}
							});
							
							xml += `<node TEXT="${escapeXml(rootTopic)}">\n`;
							const rootData = nodeMap.get(rootNode.id);
							if (rootData.children && rootData.children.length > 0) {
								rootData.children.forEach((child: any) => {
									xml += convertNode(child, 1);
								});
							}
							xml += '</node>\n</map>';
							return xml;
						}
					} else {
						// node_tree format
						rootTopic = jsonData.data.topic;
						xml += `<node TEXT="${escapeXml(rootTopic)}">\n`;
						if (jsonData.data.children && jsonData.data.children.length > 0) {
							jsonData.data.children.forEach((child: any) => {
								xml += convertNode(child, 1);
							});
						}
						xml += '</node>\n</map>';
						return xml;
					}
				}
			} catch (e) {
				// Invalid JSON, fallback to markdown parsing
			}
		}
		
		// Parse from markdown format
		const lines = content.split('\n').filter(line => line.trim());
		
		if (lines.length > 0 && !lines[0].match(/^\s*-/)) {
			rootTopic = lines.shift()!.trim();
		}
		
		xml += `<node TEXT="${escapeXml(rootTopic)}">\n`;
		
		const stack: Array<{ level: number; closed: boolean }> = [{ level: -1, closed: false }];
		
		lines.forEach(line => {
			const match = line.match(/^(\s*)-\s+(.+)$/);
			if (!match) return;
			
			const indent = match[1].length;
			const topic = match[2].trim();
			const level = Math.floor(indent / 2);
			
			while (stack.length > 1 && stack[stack.length - 1].level >= level) {
				if (!stack[stack.length - 1].closed) {
					xml += '  '.repeat(stack.length) + '</node>\n';
				}
				stack.pop();
			}
			
			xml += '  '.repeat(stack.length + 1) + `<node TEXT="${escapeXml(topic)}">\n`;
			stack.push({ level, closed: false });
		});
		
		while (stack.length > 1) {
			if (!stack[stack.length - 1].closed) {
				xml += '  '.repeat(stack.length) + '</node>\n';
			}
			stack.pop();
		}
		
		xml += '</node>\n</map>';
		return xml;
	}

	/**
	 * Convert mindmap markdown to SVG format
	 */
	private convertMindMapToSVG(content: string): string {
		const baseNodeWidth = 80;
		const nodeHeight = 40;
		const minNodeWidth = 100;
		const maxNodeWidth = 400;
		const horizontalSpacing = 50;
		const verticalSpacing = 60;
		const fontSize = 14;
		const padding = 24; // Horizontal padding (12px on each side)
		
		// Parse tree structure
		interface TreeNode {
			topic: string;
			children: TreeNode[];
			x?: number;
			y?: number;
			level?: number;
			width?: number;
		}
		
		let root: TreeNode = { topic: 'Mind Map', children: [] };
		
		// Try to parse as JSON first (jsMind format)
		if (content.trim().startsWith('{')) {
			try {
				const jsonData = JSON.parse(content);
				// Convert jsMind format to tree
				if (jsonData.data) {
					if (Array.isArray(jsonData.data)) {
						// node_array format
						const nodeMap = new Map<string, TreeNode>();
						const rootNode = jsonData.data.find((n: any) => n.isroot);
						if (rootNode) {
							root = { topic: rootNode.topic, children: [] };
							nodeMap.set(rootNode.id, root);
							
							// Build tree from node array
							jsonData.data.forEach((node: any) => {
								if (node.isroot) return;
								const treeNode: TreeNode = { topic: node.topic, children: [] };
								nodeMap.set(node.id, treeNode);
								
								const parent = nodeMap.get(node.parentid);
								if (parent) {
									parent.children.push(treeNode);
								}
							});
						}
					} else {
						// node_tree format
						root = this.convertJsMindNodeToTree(jsonData.data);
					}
				}
			} catch (e) {
				// Not valid JSON, fallback to markdown parsing
				root = this.parseMarkdownToTree(content);
			}
		} else {
			// Parse as markdown
			root = this.parseMarkdownToTree(content);
		}
		
		// Calculate node widths based on text length
		const calculateTextWidth = (text: string): number => {
			// More accurate width calculation for mixed Chinese/English text
			let width = 0;
			for (let i = 0; i < text.length; i++) {
				const char = text.charAt(i);
				// Chinese characters and full-width characters take more space
				if (char.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/)) {
					width += fontSize * 1.2; // Chinese characters are wider
				} else {
					width += fontSize * 0.6; // English characters
				}
			}
			return width + padding; // Add padding
		};
		
		const calculateNodeWidth = (node: TreeNode) => {
			const textWidth = calculateTextWidth(node.topic);
			const calculatedWidth = Math.min(maxNodeWidth, Math.max(minNodeWidth, textWidth));
			node.width = calculatedWidth;
			node.children.forEach(child => calculateNodeWidth(child));
		};
		
		calculateNodeWidth(root);
		
		// Calculate max width per level for alignment
		const levelWidths = new Map<number, number>();
		const calculateLevelWidths = (node: TreeNode, level: number) => {
			const currentMax = levelWidths.get(level) || 0;
			levelWidths.set(level, Math.max(currentMax, node.width!));
			node.children.forEach(child => calculateLevelWidths(child, level + 1));
		};
		
		calculateLevelWidths(root, 0);
		
		// Calculate positions
		let maxY = 0;
		let maxX = 0;
		const calculateLayout = (node: TreeNode, level: number, yOffset: number): number => {
			node.level = level;
			
			// Calculate x position based on accumulated widths of previous levels
			let xPos = 50;
			for (let i = 0; i < level; i++) {
				xPos += (levelWidths.get(i) || minNodeWidth) + horizontalSpacing;
			}
			node.x = xPos;
			maxX = Math.max(maxX, xPos + node.width!);
			
			if (node.children.length === 0) {
				node.y = yOffset;
				maxY = Math.max(maxY, yOffset);
				return yOffset + verticalSpacing;
			}
			
			let currentY = yOffset;
			node.children.forEach(child => {
				currentY = calculateLayout(child, level + 1, currentY);
			});
			
			// Center parent between children
			const firstChildY = node.children[0].y!;
			const lastChildY = node.children[node.children.length - 1].y!;
			node.y = (firstChildY + lastChildY) / 2;
			
			return currentY;
		};
		
		calculateLayout(root, 0, 50);
		
		// Helper function to get all nodes
		const getAllNodes = (node: TreeNode): TreeNode[] => {
			const nodes = [node];
			node.children.forEach(child => {
				nodes.push(...getAllNodes(child));
			});
			return nodes;
		};
		
		// Generate SVG
		const allNodes = getAllNodes(root);
		const maxLevel = Math.max(...allNodes.map(n => n.level || 0));
		const svgWidth = maxX + 100;
		const svgHeight = maxY + 100;
		
		let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
		svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;
		svg += `  <defs>\n`;
		svg += `    <style>\n`;
		svg += `      .node-rect { fill: #4A90E2; stroke: #2E5C8A; stroke-width: 2; rx: 8; }\n`;
		svg += `      .node-text { fill: white; font-family: Arial, sans-serif; font-size: 14px; text-anchor: middle; dominant-baseline: middle; white-space: pre; }\n`;
		svg += `      .root-rect { fill: #E74C3C; stroke: #C0392B; stroke-width: 2; rx: 8; }\n`;
		svg += `      .connection { stroke: #95a5a6; stroke-width: 2; fill: none; }\n`;
		svg += `    </style>\n`;
		svg += `  </defs>\n`;
		
		// Draw connections first
		const drawConnections = (node: TreeNode) => {
			node.children.forEach(child => {
				svg += `  <path class="connection" d="M ${node.x! + node.width!} ${node.y!} C ${node.x! + node.width! + horizontalSpacing/2} ${node.y!}, ${child.x! - horizontalSpacing/2} ${child.y!}, ${child.x!} ${child.y!}" />\n`;
				drawConnections(child);
			});
		};
		
		drawConnections(root);
		
		// Draw nodes
		const drawNode = (node: TreeNode) => {
			const isRoot = node.level === 0;
			const rectClass = isRoot ? 'root-rect' : 'node-rect';
			
			svg += `  <rect class="${rectClass}" x="${node.x}" y="${node.y! - nodeHeight/2}" width="${node.width}" height="${nodeHeight}" />\n`;
			svg += `  <text class="node-text" x="${node.x! + node.width!/2}" y="${node.y}">${this.escapeXml(node.topic)}</text>\n`;
			
			node.children.forEach(child => drawNode(child));
		};
		
		drawNode(root);
		
		svg += `</svg>`;
		return svg;
	}

	/**
	 * Truncate text to fit in node
	 */
	private truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength - 3) + '...';
	}

	/**
	 * Convert jsMind node to tree structure
	 */
	private convertJsMindNodeToTree(node: any): any {
		const treeNode: any = {
			topic: node.topic,
			children: []
		};
		
		if (node.children) {
			node.children.forEach((child: any) => {
				treeNode.children.push(this.convertJsMindNodeToTree(child));
			});
		}
		
		return treeNode;
	}

	/**
	 * Parse markdown to tree structure
	 */
	private parseMarkdownToTree(content: string): any {
		const lines = content.split('\n').filter(line => line.trim());
		const root: any = { topic: '', children: [] };
		const stack: Array<{ node: any; level: number }> = [];
		
		lines.forEach(line => {
			const match = line.match(/^(\s*)-\s+(.+)$/);
			if (!match) {
				if (!root.topic) root.topic = line.trim();
				return;
			}
			
			const indent = match[1].length;
			const topic = match[2].trim();
			const level = Math.floor(indent / 2);
			const node: any = { topic, children: [] };
			
			while (stack.length > 0 && stack[stack.length - 1].level >= level) {
				stack.pop();
			}
			
			if (stack.length === 0) {
				root.children.push(node);
			} else {
				stack[stack.length - 1].node.children.push(node);
			}
			
			stack.push({ node, level });
		});
		
		return root;
	}

	/**
	 * Convert mindmap to PNG format (via SVG)
	 */
	private async convertMindMapToPNG(content: string): Promise<void> {
		try {
			// First convert to SVG
			const svgContent = this.convertMindMapToSVG(content);
			
			// Create an image element from SVG
			const img = new Image();
			const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
			const url = URL.createObjectURL(svgBlob);
			
			img.onload = () => {
				// Create canvas with the same dimensions as SVG
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					new Notice(this.plugin.i18n.t('ui.speedReadingCanvasContextFailed'));
					URL.revokeObjectURL(url);
					return;
				}
				
				// Draw the image on canvas
				ctx.drawImage(img, 0, 0);
				
				// Convert canvas to PNG blob
				canvas.toBlob((blob) => {
					if (!blob) {
						new Notice(this.plugin.i18n.t('ui.speedReadingPNGConversionFailed'));
						URL.revokeObjectURL(url);
						return;
					}
					
					// Download the PNG file
					const pngUrl = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = pngUrl;
					a.download = `mindmap-${Date.now()}.png`;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(pngUrl);
					URL.revokeObjectURL(url);
					
					new Notice(this.plugin.i18n.t('ui.speedReadingPNGExportSuccess'));
				}, 'image/png');
			};
			
			img.onerror = () => {
				new Notice(this.plugin.i18n.t('ui.speedReadingSVGLoadFailed'));
				URL.revokeObjectURL(url);
			};
			
			img.src = url;
		} catch (error) {
			Logger.error('[MindMap] PNG export error:', error);
			new Notice(this.plugin.i18n.t('ui.speedReadingPNGExportFailed'));
		}
	}

	/**
	 * Escape XML special characters
	 */
	private escapeXml(str: string): string {
		return str.replace(/[<>&'"]/g, (char) => {
			switch (char) {
				case '<': return '&lt;';
				case '>': return '&gt;';
				case '&': return '&amp;';
				case "'": return '&apos;';
				case '"': return '&quot;';
				default: return char;
			}
		});
	}
}
