import { App, TFile, TFolder } from 'obsidian';
import { Logger } from './../utils/logger';

type SuggestionItem = TFile | TFolder;

export class FileSuggestions {
	private app: App;
	private allFiles: TFile[] = [];
	private allFolders: TFolder[] = [];
	private filteredItems: SuggestionItem[] = [];
	private currentDisplayCount: number = 10;
	private selectedSuggestionIndex: number = -1;
	private currentFileQuery: string = '';
	private manuallyTriggered: boolean = false; // Track if triggered manually (not by @)
	private manualInputHandler: ((e: Event) => void) | null = null; // Handler for manual trigger input
	private justOpened: boolean = false; // Track if just opened to prevent immediate close

	// UI elements
	private suggestionsContainer: HTMLElement | null = null;
	private inputElement: HTMLTextAreaElement;
	private inputContainer: HTMLElement;

	// Callbacks
	private onFileSelected?: (file: TFile) => void;
	private onFolderSelected?: (folder: TFolder) => void;
	private getPromptSelectorBounds?: () => DOMRect | null;
	private addPlaceholderMapping?: (displayName: string, fullPath: string) => void;

	constructor(app: App, inputElement: HTMLTextAreaElement, inputContainer: HTMLElement) {
		this.app = app;
		this.inputElement = inputElement;
		this.inputContainer = inputContainer;
		this.loadAllItems();
		this.setupEventListeners();

		// Setup complete - file suggestions ready
	}

	/**
	 * Set callback for when file is selected
	 */
	setOnFileSelected(callback: (file: TFile) => void): void {
		this.onFileSelected = callback;
	}

	/**
	 * Set callback for when folder is selected
	 */
	setOnFolderSelected(callback: (folder: TFolder) => void): void {
		this.onFolderSelected = callback;
	}

	/**
	 * Set callback to get prompt selector bounds for positioning
	 */
	setGetPromptSelectorBounds(callback: () => DOMRect | null): void {
		this.getPromptSelectorBounds = callback;
	}

	/**
	 * Set callback for adding placeholder mapping
	 */
	setAddPlaceholderMapping(callback: (displayName: string, fullPath: string) => void): void {
		this.addPlaceholderMapping = callback;
	}

	/**
	 * Check if file suggestions are currently visible
	 */
	isVisible(): boolean {
		return this.suggestionsContainer !== null && this.suggestionsContainer.style.display === 'block';
	}

	/**
	 * Manually trigger file/folder suggestions display
	 * This is used when triggering from a button click without typing @
	 */
	triggerSuggestions(): void {
		// Logger.debug('triggerSuggestions called');
		// Logger.debug('inputElement:', this.inputElement);
		// Logger.debug('allFiles count:', this.allFiles.length);
		// Logger.debug('allFolders count:', this.allFolders.length);
		
		// Focus the input element
		this.inputElement.focus();
		// Logger.debug('inputElement focused');
		
		// Mark as manually triggered
		this.manuallyTriggered = true;
		// Logger.debug('manuallyTriggered set to true');
		
		// Set flag to prevent immediate close from click outside handler
		this.justOpened = true;
		setTimeout(() => {
			this.justOpened = false;
		}, 100); // 100ms delay
		
		// Set up input handler for filtering while manually triggered
		this.setupManualInputHandler();
		
		// Set empty query to show all items
		this.currentFileQuery = '';
		// Logger.debug('About to call showSuggestions with empty query');
		
		this.showSuggestions('');
		
		// Logger.debug('showSuggestions called, suggestionsContainer:', this.suggestionsContainer);
		// Logger.debug('suggestionsContainer display:', this.suggestionsContainer?.style.display);
	}

	/**
	 * Set up input handler for manual trigger mode
	 * Allows typing in input to filter suggestions
	 */
	private setupManualInputHandler(): void {
		// Remove existing handler if any
		if (this.manualInputHandler) {
			this.inputElement.removeEventListener('input', this.manualInputHandler);
		}
		
		// Create new handler
		this.manualInputHandler = (e: Event) => {
			if (!this.manuallyTriggered) return;
			
			const query = this.inputElement.value.trim();
			// Logger.debug('Manual input, filtering with query:', query);
			
			// Update and show filtered suggestions
			this.currentFileQuery = query;
			this.showSuggestions(query);
		};
		
		// Add handler
		this.inputElement.addEventListener('input', this.manualInputHandler);
		// Logger.debug('Manual input handler attached');
	}

	/**
	 * Remove manual input handler
	 */
	private removeManualInputHandler(): void {
		if (this.manualInputHandler) {
			this.inputElement.removeEventListener('input', this.manualInputHandler);
			this.manualInputHandler = null;
			// Logger.debug('Manual input handler removed');
		}
	}

	/**
	 * Load all files and folders for suggestions
	 */
	private loadAllItems(): void {
		this.allFiles = this.app.vault.getFiles();
		this.allFolders = this.getAllFolders();
		
		// Listen for file changes
		this.app.vault.on('create', (file) => {
			if (file instanceof TFile) {
				this.allFiles.push(file);
			} else if (file instanceof TFolder) {
				this.allFolders = this.getAllFolders(); // Reload folders
			}
		});
		
		this.app.vault.on('delete', (file) => {
			if (file instanceof TFile) {
				this.allFiles = this.allFiles.filter(f => f.path !== file.path);
			} else if (file instanceof TFolder) {
				this.allFolders = this.getAllFolders(); // Reload folders
			}
		});
		
		this.app.vault.on('rename', (file, oldPath) => {
			if (file instanceof TFile) {
				this.loadAllItems(); // Reload on rename
			} else if (file instanceof TFolder) {
				this.allFolders = this.getAllFolders(); // Reload folders
			}
		});
	}

	/**
	 * Get all folders from vault
	 */
	private getAllFolders(): TFolder[] {
		const folders: TFolder[] = [];
		
		const processFolder = (folder: TFolder) => {
			folders.push(folder);
			folder.children.forEach(child => {
				if (child instanceof TFolder) {
					processFolder(child);
				}
			});
		};

		const rootFolder = this.app.vault.getRoot();
		processFolder(rootFolder);
		
		return folders.sort((a, b) => a.path.localeCompare(b.path));
	}

	/**
	 * Setup event listeners for input element
	 */
	private setupEventListeners(): void {
		// Track IME composition events for Chinese input
		this.inputElement.addEventListener('input', () => {
			this.handleFileAutoComplete();
		});

		// Use capture phase to ensure this handler runs before InputHandler's handler
		this.inputElement.addEventListener('keydown', (event: KeyboardEvent) => {
			// Check if suggestions are visible - use visibility check instead of display
			const isSuggestionsVisible = this.suggestionsContainer && 
				this.suggestionsContainer.style.visibility === 'visible';
			
			// Logger.debug('Keydown event:', event.key, 'Suggestions visible:', isSuggestionsVisible);
			
			// Handle file suggestions navigation
			if (isSuggestionsVisible) {
				// Logger.debug('Handling key in suggestions:', event.key);
				if (event.key === 'ArrowDown') {
					event.preventDefault();
					event.stopImmediatePropagation();
					// Logger.debug('ArrowDown - navigating down');
					this.navigateFileSuggestions(1);
					return;
				} else if (event.key === 'ArrowUp') {
					event.preventDefault();
					event.stopImmediatePropagation();
					// Logger.debug('ArrowUp - navigating up');
					this.navigateFileSuggestions(-1);
					return;
				} else if (event.key === 'Tab' || event.key === 'Enter') {
					event.preventDefault();
					event.stopImmediatePropagation();
					// Logger.debug('Tab/Enter - selecting suggestion');
					this.selectCurrentFileSuggestion();
					return;
				} else if (event.key === 'Escape') {
					event.preventDefault();
					event.stopImmediatePropagation();
					// Logger.debug('Escape - hiding suggestions');
					this.hideSuggestions();
					return;
				}
			}
		}, true); // Use capture phase by setting third parameter to true

		// Handle click outside to close suggestions
		document.addEventListener('click', (event: MouseEvent) => {
			// Skip if just opened (prevent immediate close from triggering click)
			if (this.justOpened) {
				// Logger.debug('Click ignored - just opened');
				return;
			}
			
			// Check if suggestions are visible
			const isSuggestionsVisible = this.suggestionsContainer && 
				this.suggestionsContainer.style.visibility === 'visible';
			
			if (isSuggestionsVisible && this.suggestionsContainer) {
				const target = event.target as Node;
				// Close if click is outside both the suggestions container and the input element
				if (!this.suggestionsContainer.contains(target) && !this.inputElement.contains(target)) {
					// Logger.debug('Clicked outside, hiding suggestions');
					this.hideSuggestions();
				}
			}
		});
	}

	/**
	 * Handle auto-completion when user types @
	 */
	private handleFileAutoComplete(): void {
		// Skip @ detection if manually triggered
		if (this.manuallyTriggered) {
			return; // Manual input handler will take care of filtering
		}
		
		const text = this.inputElement.value;
		const cursorPos = this.inputElement.selectionStart || 0;

		// Find @ symbol before cursor
		const beforeCursor = text.substring(0, cursorPos);
		const atIndex = beforeCursor.lastIndexOf('@');

		if (atIndex === -1) {
			this.hideSuggestions();
			return;
		}
		
		// Check if @ is at start or preceded by whitespace
		const charBefore = atIndex > 0 ? beforeCursor[atIndex - 1] : ' ';

		if (charBefore !== ' ' && charBefore !== '\n' && atIndex !== 0) {
			this.hideSuggestions();
			return;
		}
		
		// Extract query after @
		const queryStart = atIndex + 1;
		const queryEnd = cursorPos;
		const query = text.substring(queryStart, queryEnd);

		// Check if query contains spaces (invalid)
		if (query.includes(' ') || query.includes('\n')) {
			this.hideSuggestions();
			return;
		}

		this.currentFileQuery = query;
		this.showSuggestions(query);
	}

	/**
	 * Show file and folder suggestions based on query
	 */
	private showSuggestions(query: string): void {
		// Logger.debug('showSuggestions called with query:', query);
		
		// Combine files and folders, then filter based on query
		const allItems: SuggestionItem[] = [...this.allFolders, ...this.allFiles];
		// Logger.debug('Total items (folders + files):', allItems.length);
		
		this.filteredItems = allItems.filter(item => {
			if (query === '') {
				return true; // Show all items when query is empty
			}
			
			const itemName = (item instanceof TFolder ? item.name : item.basename).toLowerCase();
			const queryLower = query.toLowerCase();
			return itemName.includes(queryLower);
		});
		
		// Logger.debug('Filtered items count:', this.filteredItems.length);

		// Sort: folders first, then files
		this.filteredItems.sort((a, b) => {
			if (a instanceof TFolder && b instanceof TFile) return -1;
			if (a instanceof TFile && b instanceof TFolder) return 1;
			
			const nameA = a instanceof TFolder ? a.name : a.basename;
			const nameB = b instanceof TFolder ? b.name : b.basename;
			return nameA.localeCompare(nameB);
		});
		
		// Reset display count when query changes
		this.currentDisplayCount = 10;
		
		if (this.filteredItems.length === 0) {
			// Logger.debug('No filtered items, hiding suggestions');
			this.hideSuggestions();
			return;
		}
		
		// Logger.debug('Creating suggestions container');
		
		// Create or update suggestions container
		if (!this.suggestionsContainer) {
			this.suggestionsContainer = this.inputContainer.createDiv();
			this.applySuggestionStyles();
			// Logger.debug('New suggestions container created');
		} else {
			// Logger.debug('Reusing existing suggestions container');
		}
		
		// Ensure input container has relative positioning
		this.inputContainer.style.position = 'relative';
		
		// Logger.debug('Calling renderSuggestions');
		this.renderSuggestions();
		
		// Position suggestions first
		this.positionSuggestions();
		// Logger.debug('Positioned suggestions');
		
		// Then show by removing display:none if it exists
		// CSS will apply display: flex via class
		this.suggestionsContainer.style.removeProperty('display');
		// Logger.debug('Removed display property to use CSS flex');
		
		// Ensure visibility
		this.suggestionsContainer.style.visibility = 'visible';
		this.suggestionsContainer.style.opacity = '1';
		// Logger.debug('Set visibility and opacity');

		// Positioning complete
		// Logger.debug('showSuggestions completed successfully');
	}

	/**
	 * Apply styles to suggestions container
	 */
	private applySuggestionStyles(): void {
		if (!this.suggestionsContainer) return;

		// Use CSS classes instead of inline styles to match prompt selector
		this.suggestionsContainer.className = 'llmsider-file-suggestions llmsider-file-suggestions-modern';
	}

	/**
	 * Render file and folder suggestions
	 */
	private renderSuggestions(): void {
		if (!this.suggestionsContainer) return;
		
		this.suggestionsContainer.empty();
		this.selectedSuggestionIndex = -1;
		
		// Create list container directly (no header)
		const listContainer = this.suggestionsContainer.createDiv('llmsider-file-suggestions-list');
		
		// Get items to display (up to currentDisplayCount)
		const itemsToShow = this.filteredItems.slice(0, this.currentDisplayCount);
		
		// Find @ position for click handlers (only if not manually triggered)
		let atIndex = -1;
		if (!this.manuallyTriggered) {
			const text = this.inputElement.value;
			const cursorPos = this.inputElement.selectionStart || 0;
			const beforeCursor = text.substring(0, cursorPos);
			atIndex = beforeCursor.lastIndexOf('@');
		}
		
		// Add each suggestion to list container
		itemsToShow.forEach((item) => {
			const suggestion = listContainer.createDiv('llmsider-file-suggestion');
			
		
		// Get icon and display name
		let iconHTML: string;
		let displayName: string;
		
		if (item instanceof TFolder) {
			iconHTML = this.getFolderIconSVG();
			displayName = item.path || 'Root';
		} else {
			iconHTML = this.getFileIconSVG(item);
			displayName = item.extension === 'md' ? item.basename : `${item.basename}.${item.extension}`;
		}
		
		suggestion.innerHTML = `${iconHTML} ${displayName}`;			suggestion.addEventListener('click', () => {
				if (item instanceof TFolder) {
					this.selectFolderSuggestion(item, atIndex);
				} else {
					this.selectFileSuggestion(item, atIndex);
				}
			});
		});

		if (itemsToShow.length > 0) {
			this.selectedSuggestionIndex = 0;
			const firstSuggestion = listContainer.querySelector('.llmsider-file-suggestion') as HTMLElement | null;
			if (firstSuggestion) {
				firstSuggestion.classList.add('selected');
			}
		}
		
		// Add "load more" indicator if there are more items
		if (this.currentDisplayCount < this.filteredItems.length) {
			const loadMoreIndicator = listContainer.createDiv();
			loadMoreIndicator.className = 'llmsider-file-suggestion-load-more';
			const arrowSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
				<line x1="12" y1="5" x2="12" y2="19"></line>
				<polyline points="19 12 12 19 5 12"></polyline>
			</svg>`;
			loadMoreIndicator.innerHTML = `${arrowSVG} ${this.filteredItems.length - this.currentDisplayCount} more items...`;
		}
		
		// Create footer with hints - always show
		const footer = this.suggestionsContainer.createDiv('llmsider-file-suggestions-footer');
		const hint = footer.createDiv('llmsider-file-suggestions-hint');
		hint.innerHTML = '<kbd>↑↓</kbd>Navigate <kbd>Tab/Enter</kbd>Select <kbd>Esc</kbd>Cancel';

		// Footer setup complete
	}


	/**
	 * Position suggestions container
	 */
	private positionSuggestions(): void {
		if (!this.suggestionsContainer) return;
		
		// Get the input wrapper rect for better positioning
		const inputWrapper = this.inputElement.closest('.llmsider-input-wrapper') as HTMLElement;
		const inputRect = inputWrapper ? inputWrapper.getBoundingClientRect() : this.inputElement.getBoundingClientRect();
		
		// Attach to document.body to avoid overflow issues
		if (this.suggestionsContainer.parentElement !== document.body) {
			document.body.appendChild(this.suggestionsContainer);
		}
		
		// Check if prompt selector is visible and get its bounds
		let promptSelectorBounds: DOMRect | null = null;
		if (this.getPromptSelectorBounds) {
			promptSelectorBounds = this.getPromptSelectorBounds();
		}
		
		// Calculate bottom position (fixed point)
		let bottomPosition: number;
		
		if (promptSelectorBounds) {
			// Position with bottom aligned to top of prompt selector with a small gap
			bottomPosition = window.innerHeight - promptSelectorBounds.top + 5;
		} else {
			// Default behavior: position with bottom aligned to top of input wrapper with gap
			bottomPosition = window.innerHeight - inputRect.top + 5;
		}
		
		// Position the suggestions container - fixed bottom, let content expand upward
		this.suggestionsContainer.style.position = 'fixed';
		this.suggestionsContainer.style.bottom = bottomPosition + 'px';
		this.suggestionsContainer.style.top = 'auto'; // Let it expand upward
		this.suggestionsContainer.style.left = inputRect.left + 'px';
		this.suggestionsContainer.style.zIndex = '1000'; // Match CSS z-index
		
		// Don't apply styles here - it's already done in showSuggestions before calling this method
	}

	/**
	 * Hide suggestions
	 */
	private hideSuggestions(): void {
		// Logger.debug('hideSuggestions() called');
		// console.trace('[FileSuggestions] Stack trace for hideSuggestions');
		
		if (this.suggestionsContainer) {
			// Hide by setting visibility and opacity
			this.suggestionsContainer.style.visibility = 'hidden';
			this.suggestionsContainer.style.opacity = '0';
			
			// Remove from document.body if it was moved there
			if (this.suggestionsContainer.parentElement === document.body) {
				this.suggestionsContainer.remove();
				this.suggestionsContainer = null;
			}
		}
		
		// Reset manually triggered flag and remove handler
		if (this.manuallyTriggered) {
			this.manuallyTriggered = false;
			this.removeManualInputHandler();
		}
		
		this.selectedSuggestionIndex = -1;
		this.currentFileQuery = '';
		this.currentDisplayCount = 10; // Reset display count
		this.filteredItems = []; // Clear cache
	}

	/**
	 * Navigate through suggestions with arrow keys
	 */
	private navigateFileSuggestions(direction: number): void {
		// Check if suggestions are visible
		if (!this.suggestionsContainer || 
			this.suggestionsContainer.style.visibility !== 'visible') {
			return;
		}
		
		// Get the total number of available items
		const totalItems = this.filteredItems.length;
		if (totalItems === 0) return;
		
		// Calculate how many items are currently displayed
		const currentlyDisplayed = Math.min(this.currentDisplayCount, totalItems);
		
		// Remove current selection from DOM
		const currentSelection = this.suggestionsContainer.querySelector('.llmsider-file-suggestion.selected');
		if (currentSelection) {
			currentSelection.classList.remove('selected');
		}
		
		// Update selection index
		if (direction === 1) { // Down
			if (this.selectedSuggestionIndex < currentlyDisplayed - 1) {
				// Move to next item
				this.selectedSuggestionIndex++;
			} else if (this.currentDisplayCount < totalItems) {
				// Load more items and move to the first newly loaded item
				const previousDisplayCount = this.currentDisplayCount;
				this.currentDisplayCount = Math.min(this.currentDisplayCount + 10, totalItems);
				this.renderSuggestions();
				this.selectedSuggestionIndex = previousDisplayCount;
			} else {
				// Loop to start
				this.selectedSuggestionIndex = 0;
			}
		} else { // Up
			if (this.selectedSuggestionIndex > 0) {
				// Move to previous item
				this.selectedSuggestionIndex--;
			} else {
				// Loop to end - ensure all items are loaded
				if (this.currentDisplayCount < totalItems) {
					this.currentDisplayCount = totalItems;
					this.renderSuggestions();
				}
				this.selectedSuggestionIndex = Math.min(totalItems - 1, this.currentDisplayCount - 1);
			}
		}
		
		// Apply new selection to DOM
		const listContainer = this.suggestionsContainer.querySelector('.llmsider-file-suggestions-list');
		if (!listContainer) return;
		
		const suggestions = listContainer.querySelectorAll('.llmsider-file-suggestion');
		const itemSuggestions = Array.from(suggestions).filter(s => 
			!s.innerHTML.includes('more items')
		);
		
		if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < itemSuggestions.length) {
			const selectedElement = itemSuggestions[this.selectedSuggestionIndex] as HTMLElement;
			selectedElement.classList.add('selected');
			
			// Scroll the selected item into view
			selectedElement.scrollIntoView({
				behavior: 'auto',
				block: 'nearest',
				inline: 'nearest'
			});
		}
	}

	/**
	 * Select current highlighted suggestion
	 */
	private selectCurrentFileSuggestion(): void {
		if (!this.suggestionsContainer) {
			return;
		}

		if (this.selectedSuggestionIndex === -1) {
			if (this.filteredItems.length === 0) {
				return;
			}
			this.selectedSuggestionIndex = 0;
		}
		if (this.selectedSuggestionIndex === -1) {
			return;
		}
		
		// Find the list container
		const listContainer = this.suggestionsContainer.querySelector('.llmsider-file-suggestions-list');
		if (!listContainer) return;
		
		const suggestions = listContainer.querySelectorAll('.llmsider-file-suggestion');
		const selectedSuggestion = suggestions[this.selectedSuggestionIndex] as HTMLElement;
		
		if (selectedSuggestion) {
			// Get the item from filteredItems by index
			const item = this.filteredItems[this.selectedSuggestionIndex];
			
			if (item) {
				// If manually triggered, use current cursor position
				// Otherwise, find the @ position
				let atIndex = -1;
				if (!this.manuallyTriggered) {
					const text = this.inputElement.value;
					const cursorPos = this.inputElement.selectionStart || 0;
					const beforeCursor = text.substring(0, cursorPos);
					atIndex = beforeCursor.lastIndexOf('@');
				}
				
				if (item instanceof TFolder) {
					this.selectFolderSuggestion(item, atIndex);
				} else {
					this.selectFileSuggestion(item, atIndex);
				}
			}
		}
	}

	/**
	 * Select a folder suggestion
	 */
	private selectFolderSuggestion(folder: TFolder, atIndex: number): void {
		// Create folder placeholder with only display name
		const displayName = folder.name || 'Root';
		const folderPlaceholder = `@[📁${displayName}] `;

		// Store placeholder to path mapping for efficient lookup
		if (this.addPlaceholderMapping) {
			this.addPlaceholderMapping(`📁${displayName}`, folder.path);
		}

		// Get current text and cursor position
		const text = this.inputElement.value;
		const cursorPos = this.inputElement.selectionStart || 0;

		let newText: string;
		let newCursorPos: number;

		if (this.manuallyTriggered) {
			// Manually triggered: replace entire input with placeholder
			// The user's input was just for filtering, not meant to be kept
			newText = folderPlaceholder;
			newCursorPos = folderPlaceholder.length;
		} else {
			// Triggered by @: replace from @ to cursor
			const beforeAt = text.substring(0, atIndex);
			const afterQuery = text.substring(cursorPos);
			newText = beforeAt + folderPlaceholder + afterQuery;
			newCursorPos = atIndex + folderPlaceholder.length;
		}

		// Update input
		this.inputElement.value = newText;
		this.inputElement.setSelectionRange(newCursorPos, newCursorPos);

		// Hide suggestions
		this.hideSuggestions();

		// Call callback if provided
		if (this.onFolderSelected) {
			this.onFolderSelected(folder);
		}

		// Focus back to input
		this.inputElement.focus();
	}

	/**
	 * Select a file suggestion
	 */
	private selectFileSuggestion(file: TFile, atIndex: number): void {
		// Create file placeholder with only display name
		const displayName = file.extension === 'md' ? file.basename : `${file.basename}.${file.extension}`;
		const filePlaceholder = `@[${displayName}] `;

		// Store placeholder to path mapping for efficient lookup
		if (this.addPlaceholderMapping) {
			this.addPlaceholderMapping(displayName, file.path);
		}

		// Get current text and cursor position
		const text = this.inputElement.value;
		const cursorPos = this.inputElement.selectionStart || 0;

		let newText: string;
		let newCursorPos: number;

		if (this.manuallyTriggered) {
			// Manually triggered: replace entire input with placeholder
			// The user's input was just for filtering, not meant to be kept
			newText = filePlaceholder;
			newCursorPos = filePlaceholder.length;
		} else {
			// Triggered by @: replace from @ to cursor
			const beforeAt = text.substring(0, atIndex);
			const afterQuery = text.substring(cursorPos);
			newText = beforeAt + filePlaceholder + afterQuery;
			newCursorPos = atIndex + filePlaceholder.length;
		}

		// Update input
		this.inputElement.value = newText;
		this.inputElement.setSelectionRange(newCursorPos, newCursorPos);

		// Hide suggestions
		this.hideSuggestions();

		// Call callback if provided
		if (this.onFileSelected) {
			this.onFileSelected(file);
		}

		// Focus back to input
		this.inputElement.focus();
	}

	/**
	 * Get folder icon SVG
	 */
	private getFolderIconSVG(): string {
		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
			<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
		</svg>`;
	}

	/**
	 * Get file icon SVG based on file extension
	 */
	private getFileIconSVG(file: TFile): string {
		const ext = file.extension.toLowerCase();
		const svgStyle = 'display: inline-block; vertical-align: middle; margin-right: 4px;';
		
		// 图片类型
		if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<circle cx="8.5" cy="8.5" r="1.5"></circle>
				<polyline points="21 15 16 10 5 21"></polyline>
			</svg>`;
		}
		
		// PDF文档
		if (['pdf'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
				<polyline points="14 2 14 8 20 8"></polyline>
				<path d="M10 12h4"></path>
				<path d="M10 16h4"></path>
			</svg>`;
		}
		
		// 电子表格
		if (['xls', 'xlsx', 'xlsb', 'xlsm', 'xltx', 'ods', 'ots', 'csv'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<path d="M3 3v18h18"></path>
				<path d="M18 17V9"></path>
				<path d="M13 17V5"></path>
				<path d="M8 17v-3"></path>
			</svg>`;
		}
		
		// Office文档
		if (['doc', 'docx', 'odt', 'ott', 'rtf'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
				<polyline points="14 2 14 8 20 8"></polyline>
				<line x1="16" y1="13" x2="8" y2="13"></line>
				<line x1="16" y1="17" x2="8" y2="17"></line>
				<line x1="16" y1="9" x2="8" y2="9"></line>
			</svg>`;
		}
		
		// 演示文稿
		if (['ppt', 'pptx', 'potx', 'odp', 'otp'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
				<line x1="8" y1="21" x2="16" y2="21"></line>
				<line x1="12" y1="17" x2="12" y2="21"></line>
			</svg>`;
		}
		
		// 代码文件
		if (['js', 'ts', 'jsx', 'tsx', 'json', 'py', 'java', 'kt', 'cpp', 'c', 'h', 'go', 'rs', 'php', 'rb', 'swift', 'css', 'scss', 'less'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<polyline points="16 18 22 12 16 6"></polyline>
				<polyline points="8 6 2 12 8 18"></polyline>
			</svg>`;
		}
		
		// HTML/网页文件
		if (['html', 'htm', 'xml'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="2" y1="12" x2="22" y2="12"></line>
				<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
			</svg>`;
		}
		
		// 音频文件
		if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<path d="M9 18V5l12-2v13"></path>
				<circle cx="6" cy="18" r="3"></circle>
				<circle cx="18" cy="16" r="3"></circle>
			</svg>`;
		}
		
		// 视频文件
		if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<polygon points="23 7 16 12 23 17 23 7"></polygon>
				<rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
			</svg>`;
		}
		
		// 压缩文件
		if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
				<polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
				<polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
				<polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
				<polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
				<line x1="12" y1="22.08" x2="12" y2="12"></line>
			</svg>`;
		}
		
		// Markdown和文本文件
		if (['md', 'markdown', 'txt'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
				<polyline points="14 2 14 8 20 8"></polyline>
				<line x1="16" y1="13" x2="8" y2="13"></line>
				<line x1="16" y1="17" x2="8" y2="17"></line>
				<polyline points="10 9 9 9 8 9"></polyline>
			</svg>`;
		}
		
		// 默认文件图标
		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${svgStyle}">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
			<polyline points="14 2 14 8 20 8"></polyline>
		</svg>`;
	}

	/**
	 * Cleanup method to be called when component is destroyed
	 */
	destroy(): void {
		this.hideSuggestions();
		// Remove event listeners if needed
	}
}
