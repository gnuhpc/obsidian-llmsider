import { App } from 'obsidian';
import { Logger } from './../utils/logger';
import { PromptTemplate } from '../types';
import { PromptManager } from '../core/prompt-manager';

export class PromptSelector {
    private app: App;
    private promptManager: PromptManager;
    private containerEl: HTMLElement;
    private selectorEl?: HTMLElement;
    private isVisibleState: boolean = false;
    private suggestions: PromptTemplate[] = [];
    private selectedIndex: number = 0;
    private currentQuery: string = '';
    private onSelectCallback?: (template: PromptTemplate) => void;
    private onCancelCallback?: () => void;
    private searchTimeout?: number;

    constructor(app: App, promptManager: PromptManager, container: HTMLElement) {
        this.app = app;
        this.promptManager = promptManager;
        this.containerEl = container;
        this.setupClickOutsideHandler();
    }

    /**
     * Setup click outside handler to close selector
     */
    private setupClickOutsideHandler(): void {
        document.addEventListener('click', (event: MouseEvent) => {
            if (this.isVisibleState && this.selectorEl) {
                const target = event.target as Node;
                // Close if click is outside the selector element
                if (!this.selectorEl.contains(target)) {
                    this.cancel();
                }
            }
        });
    }

    /**
     * Show prompt selector with query
     */
    async show(query: string = '', position: { x: number; y: number }): Promise<void> {
        this.currentQuery = query;
        this.selectedIndex = 0;
        this.isVisibleState = true;

        // Clear previous search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Search for prompts with debouncing
        this.searchTimeout = window.setTimeout(async () => {
            await this.searchPrompts();
            this.renderSelector(position);
        }, 100);
    }

    /**
     * Hide prompt selector
     */
    hide(): void {
        this.isVisibleState = false;
        this.currentQuery = '';
        this.suggestions = [];
        this.selectedIndex = 0;
        
        if (this.selectorEl) {
            this.selectorEl.remove();
            this.selectorEl = undefined;
        }
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = undefined;
        }
    }

    /**
     * Update search query and refresh suggestions
     */
    async updateQuery(query: string): Promise<void> {
        this.currentQuery = query;
        this.selectedIndex = 0;
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = window.setTimeout(async () => {
            await this.searchPrompts();
            this.updateList();
        }, 100);
    }

    /**
     * Navigate up in the suggestion list
     */
    navigateUp(): void {
        if (this.suggestions.length > 0) {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.updateSelection();
        }
    }

    /**
     * Navigate down in the suggestion list
     */
    navigateDown(): void {
        if (this.suggestions.length > 0) {
            this.selectedIndex = Math.min(this.suggestions.length - 1, this.selectedIndex + 1);
            this.updateSelection();
        }
    }

    /**
     * Select the currently highlighted suggestion
     */
    selectCurrent(): void {
        if (this.suggestions.length > 0 && this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
            const template = this.suggestions[this.selectedIndex];
            this.selectTemplate(template);
        }
    }

    /**
     * Cancel selection
     */
    cancel(): void {
        this.hide();
        if (this.onCancelCallback) {
            this.onCancelCallback();
        }
    }

    /**
     * Set callbacks for selection and cancellation
     */
    setCallbacks(
        onSelect: (template: PromptTemplate) => void,
        onCancel: () => void
    ): void {
        this.onSelectCallback = onSelect;
        this.onCancelCallback = onCancel;
    }

    /**
     * Check if selector is visible
     */
    isVisible(): boolean {
        return this.isVisibleState;
    }

    /**
     * Search for prompts based on current query
     */
    private async searchPrompts(): Promise<void> {
        try {
            this.suggestions = await this.promptManager.searchPrompts(this.currentQuery);
            // For empty query, show all results; for specific queries, limit to top matches
            const maxResults = this.currentQuery.trim() === '' ? 50 : 15;
            this.suggestions = this.suggestions.slice(0, maxResults);
        } catch (error) {
            Logger.error('Failed to search prompts:', error);
            this.suggestions = [];
        }
    }

    /**
     * Render the prompt selector UI
     */
    private renderSelector(position: { x: number; y: number }): void {
        // Remove existing selector
        if (this.selectorEl) {
            this.selectorEl.remove();
        }

        // Don't render if no suggestions
        if (!this.isVisibleState || this.suggestions.length === 0) {
            return;
        }
        
        // Create selector element - attach to document.body for fixed positioning
        this.selectorEl = document.body.createDiv({
            cls: 'llmsider-prompt-selector llmsider-prompt-selector-modern'
        });

        // Use fixed positioning for reliable placement
        const maxHeight = 250; // Match CSS max-height
        const selectorHeight = Math.min(maxHeight, this.suggestions.length * 35 + 80); // Dynamic height based on suggestions, reduced padding
        let top = position.y - selectorHeight; // Position above the input
        
        // If would be above viewport, position below the input instead
        if (top < 10) {
            top = position.y + 60; // Position below the input with enough spacing
        }
        
        this.selectorEl.style.position = 'fixed';
        this.selectorEl.style.left = position.x + 'px';
        this.selectorEl.style.top = top + 'px';
        this.selectorEl.style.width = '350px';
        this.selectorEl.style.maxHeight = maxHeight + 'px';
        this.selectorEl.style.zIndex = '10000';
        this.selectorEl.style.backgroundColor = 'var(--background-primary)';
        this.selectorEl.style.border = '1px solid var(--background-modifier-border)';
        this.selectorEl.style.borderRadius = '6px';
        this.selectorEl.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.2)';
        this.selectorEl.style.overflow = 'hidden';

        this.renderContent();
    }

    /**
     * Render selector content
     */
    private renderContent(): void {
        if (!this.selectorEl) return;

        this.selectorEl.empty();

        // Header
        const header = this.selectorEl.createDiv({
            cls: 'llmsider-prompt-selector-header'
        });
        header.createSpan({
            text: `💡 Prompt Templates (${this.suggestions.length})`,
            cls: 'llmsider-prompt-selector-title'
        });

        // List container
        const listContainer = this.selectorEl.createDiv({
            cls: 'llmsider-prompt-selector-list'
        });

        // Render suggestions with original compact style
        this.suggestions.forEach((template, index) => {
            const item = listContainer.createDiv({
                cls: `llmsider-prompt-selector-item ${index === this.selectedIndex ? 'selected' : ''}`
            });

            // Template title
            const titleEl = item.createDiv({
                cls: 'llmsider-prompt-selector-item-title'
            });
            titleEl.textContent = template.title;

            // Template description (if available)
            if (template.description) {
                const descEl = item.createDiv({
                    cls: 'llmsider-prompt-selector-item-desc'
                });
                descEl.textContent = template.description;
            }

            // Type indicator
            const typeEl = item.createDiv({
                cls: 'llmsider-prompt-selector-item-type'
            });
            typeEl.textContent = template.isBuiltIn ? '📦 Built-in' : '🎨 Custom';

            // Event handlers
            item.onclick = () => this.selectTemplate(template);
            item.onmouseenter = () => {
                this.selectedIndex = index;
                this.updateSelection();
            };
        });

        // Footer
        const footer = this.selectorEl.createDiv({
            cls: 'llmsider-prompt-selector-footer'
        });
        footer.innerHTML = `
            <span class="llmsider-prompt-selector-hint">
                <kbd>↑↓</kbd> Navigate
                <kbd>Tab/Enter</kbd> Select
                <kbd>Esc</kbd> Cancel
            </span>
        `;
    }

    /**
     * Update the list without full re-render
     */
    private updateList(): void {
        if (!this.selectorEl) return;
        
        if (this.suggestions.length === 0) {
            this.hide();
            return;
        }
        
        this.renderContent();
    }

    /**
     * Update visual selection in the list
     */
    private updateSelection(): void {
        if (!this.selectorEl) return;

        const items = this.selectorEl.querySelectorAll('.llmsider-prompt-selector-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.addClass('selected');
                // Scroll into view if needed
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.removeClass('selected');
            }
        });
    }

    /**
     * Select a template and trigger callback
     */
    private selectTemplate(template: PromptTemplate): void {
        this.hide();
        
        if (this.onSelectCallback) {
            this.onSelectCallback(template);
        }
        
        // Mark as used (don't await to avoid blocking)
        this.promptManager.markPromptAsUsed(template.id).catch(error => {
            Logger.error('Failed to mark prompt as used:', error);
        });
    }
}