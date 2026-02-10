import { App, Notice, TFolder, Modal, TFile, MarkdownView, normalizePath } from 'obsidian';
import { Logger } from './../utils/logger';
import { ChatMode, PromptTemplate } from '../types';
import LLMSiderPlugin from '../main';
import { ContextManager } from '../core/context-manager';
import { FileSuggestions } from './file-suggestions';
import { PromptManager } from '../core/prompt-manager';
import { PromptSelector } from './prompt-selector';
import { SmartSearchModal } from './smart-search-modal';
import * as fs from 'fs';
import * as path from 'path';

type ChatViewContextModalHost = {
	isExecuting: () => boolean;
	showContextModal: (title: string, content: string, type?: string) => void;
};

export class InputHandler {
	private app: App;
	private plugin: LLMSiderPlugin;
	private contextManager: ContextManager;
	private fileSuggestions: FileSuggestions;
	private promptManager: PromptManager;
	private promptSelector: PromptSelector;
	private chatView?: ChatViewContextModalHost; // Reference to parent ChatView
	
	// UI elements
	private inputElement: HTMLTextAreaElement;
	private sendButton: HTMLElement;
	private providerSelect: HTMLSelectElement;
	private contextDisplay: HTMLElement;
	private inputContainer: HTMLElement;
	private viewContainer?: HTMLElement;
	
	// State
	private currentMode: ChatMode;
	private selectedPrompt?: PromptTemplate;
	private inputChangeTimeout?: number; // For debouncing
	private isOptimizingPrompt = false;

	// File placeholder mapping: placeholder display name -> full path
	private placeholderPathMap: Map<string, string> = new Map();

	// Track which files were added by which directory placeholder
	private directoryFileMap: Map<string, string[]> = new Map();

	// Store dragged folder path from global drag events
	private draggedFolderPath: string | null = null;

	// Callbacks
	private onSendMessage?: (content: string) => void;
	private onModeChange?: (mode: ChatMode) => void;
	private boundOptimizePromptHandler?: (event: Event) => void;

	constructor(
		app: App, 
		plugin: LLMSiderPlugin, 
		contextManager: ContextManager,
		inputElement: HTMLTextAreaElement,
		sendButton: HTMLElement,
		providerSelect: HTMLSelectElement,
		contextDisplay: HTMLElement,
		inputContainer: HTMLElement,
		viewContainer?: HTMLElement,
		initialMode: ChatMode = 'ask'
	) {
		this.app = app;
		this.plugin = plugin;
		this.contextManager = contextManager;
		this.inputElement = inputElement;
		this.sendButton = sendButton;
		this.providerSelect = providerSelect;
		this.contextDisplay = contextDisplay;
		this.inputContainer = inputContainer;
		this.viewContainer = viewContainer;
		this.currentMode = initialMode;

		// Initialize file suggestions
		this.fileSuggestions = new FileSuggestions(app, inputElement, inputContainer);
		this.fileSuggestions.setOnFileSelected((file) => this.handleFileSelected(file));
		this.fileSuggestions.setOnFolderSelected((folder) => this.handleFolderSelected(folder));
		this.fileSuggestions.setGetPromptSelectorBounds(() => this.getPromptSelectorBounds());
		this.fileSuggestions.setAddPlaceholderMapping((displayName, fullPath) => this.addPlaceholderMapping(displayName, fullPath));

		// Initialize prompt manager and selector
		this.promptManager = new PromptManager(app, plugin);
		this.promptSelector = new PromptSelector(app, this.promptManager, inputContainer);
		
		// Setup prompt selector callbacks
		this.promptSelector.setCallbacks(
			(template) => this.handlePromptSelected(template),
			() => this.handlePromptCancelled()
		);

		this.setupEventListeners();
		this.updateUI();
	}

	/**
	 * Set callback for when message should be sent
	 */
	setOnSendMessage(callback: (content: string) => void): void {
		this.onSendMessage = callback;
	}

	/**
	 * Set callback for when mode changes
	 */
	setOnModeChange(callback: (mode: ChatMode) => void): void {
		this.onModeChange = callback;
	}

	/**
	 * Set reference to parent ChatView
	 */
	setChatView(chatView: ChatViewContextModalHost): void {
		this.chatView = chatView;
	}

	/**
	 * Update current mode
	 */
	setMode(mode: ChatMode): void {
		this.currentMode = mode;
		this.updateUI();
	}

	/**
	 * Get current mode
	 */
	getMode(): ChatMode {
		return this.currentMode;
	}

	/**
	 * Setup event listeners
	 */
	private setupEventListeners(): void {
		// Input events
		this.inputElement.addEventListener('input', () => {
			this.autoResizeTextarea();
			this.updateSendButton();
		});

		// Keyboard events
		this.setupKeyboardEvents();

		// Drag and drop support for files and folders
		this.setupDragAndDropEvents();

		// Paste support for files
		this.setupPasteEvents();

		// Optimize prompt button click
		this.boundOptimizePromptHandler = () => {
			this.handleOptimizePrompt();
		};
		this.inputElement.addEventListener('llmsider-optimize-prompt', this.boundOptimizePromptHandler);

		// Send button click
		this.sendButton.addEventListener('click', () => {
			this.handleSendMessage();
		});

		// Provider select change
		this.providerSelect.addEventListener('change', async () => {
			// Prevent provider change during execution
			if (this.chatView?.isExecuting()) {
				new Notice(this.plugin.i18n.t('ui.cannotChangeProviderDuringExecution') || 'Cannot change provider during execution');
				this.providerSelect.value = this.plugin.settings.activeProvider || '';
				return;
			}
			
			const selectedProviderId = this.providerSelect.value;
			
			// Skip if empty or no providers configured
			if (!selectedProviderId) {
				return;
			}
			
			// Parse connection and model IDs from provider ID (connectionId::modelId format)
			if (selectedProviderId.includes('::')) {
				const [connectionId, modelId] = selectedProviderId.split('::');
				Logger.debug('[InputHandler] Provider change requested:', { selectedProviderId, connectionId, modelId });
				
				// Check if the connection/model combination is valid
				const connection = this.plugin.settings.connections.find(c => c.id === connectionId);
				const model = this.plugin.settings.models.find(m => m.id === modelId);
				
				Logger.debug('[InputHandler] Validation result:', {
					connectionFound: !!connection,
					modelFound: !!model,
					connectionEnabled: connection?.enabled,
					modelEnabled: model?.enabled
				});
				
				if (!connection) {
					Logger.error('[InputHandler] Connection not found:', connectionId);
					new Notice(this.plugin.i18n.t('ui.connectionNotFound'));
					this.providerSelect.value = this.plugin.settings.activeProvider || '';
					return;
				}
				
				if (!model) {
					Logger.error('[InputHandler] Model not found:', modelId);
					Logger.error('[InputHandler] Available models:', this.plugin.settings.models.map(m => ({ id: m.id, name: m.name, enabled: m.enabled })));
					new Notice(this.plugin.i18n.t('ui.modelNotFound'));
					this.providerSelect.value = this.plugin.settings.activeProvider || '';
					return;
				}
				
				if (!connection.enabled || !model.enabled) {
					Logger.warn('[InputHandler] Connection or model is disabled:', { connectionEnabled: connection.enabled, modelEnabled: model.enabled });
					new Notice(this.plugin.i18n.t('ui.connectionOrModelDisabled'));
					this.providerSelect.value = this.plugin.settings.activeProvider || '';
					return;
				}
				
				// Set the active connection and model - this will initialize the provider if needed
				Logger.debug('[InputHandler] Calling setActiveConnectionAndModel...');
				await this.plugin.setActiveConnectionAndModel(connectionId, modelId);
				Logger.debug('[InputHandler] Provider change completed successfully');
			} else {
				// Invalid provider ID format (not empty but doesn't contain ::)
				Logger.error('[InputHandler] Invalid provider ID format:', selectedProviderId);
				new Notice(this.plugin.i18n.t('ui.invalidProviderFormat'));
				this.providerSelect.value = this.plugin.settings.activeProvider || '';
				return;
			}
			
			this.updateSendButton();
		});
	}

	/**
	 * Setup keyboard event handlers
	 */
	private setupKeyboardEvents(): void {
		let isComposing = false;
		
		// Track composition events for IME (Chinese input method)
		this.inputElement.addEventListener('compositionstart', () => {
			isComposing = true;
		});
		
		this.inputElement.addEventListener('compositionend', () => {
			isComposing = false;
		});
		
		// Handle input changes for prompt selector
		this.inputElement.addEventListener('input', () => {
			this.handleInputChange();
		});
		
		this.inputElement.addEventListener('keydown', (event: KeyboardEvent) => {
			// Handle prompt selector navigation first
			if (this.promptSelector.isVisible()) {
				switch (event.key) {
					case 'ArrowUp':
						event.preventDefault();
						this.promptSelector.navigateUp();
						return;
					case 'ArrowDown':
						event.preventDefault();
						this.promptSelector.navigateDown();
						return;
					case 'Tab':
					case 'Enter':
						event.preventDefault();
						this.promptSelector.selectCurrent();
						return;
					case 'Escape':
						event.preventDefault();
						this.promptSelector.cancel();
						return;
				}
			}

			// Check if file suggestions are visible - if so, don't process Enter key here
			// File suggestions have their own Enter key handler
			if (this.fileSuggestions.isVisible() && event.key === 'Enter') {
				// Let file suggestions handle Enter key, don't process it here
				return;
			}

			// Handle file placeholder deletion with Backspace
			if (event.key === 'Backspace') {
				if (this.handleFilePlaceholderDeletion()) {
					event.preventDefault();
					return;
				}
			}

			if (event.key === 'Enter') {
				// If in composition mode (IME active), don't send message
				if (isComposing) {
					return; // Let IME handle the Enter key
				}
				
				if (event.shiftKey) {
					// Shift+Enter: Allow new line
					return;
				} else {
					// Enter: Send message
					event.preventDefault();
					this.handleSendMessage();
				}
			}
		});
	}

	/**
	 * Setup drag and drop event handlers for files, folders, and text
	 */
	private setupDragAndDropEvents(): void {
		const target = this.viewContainer || this.inputElement;

		// Listen to global dragstart to capture full path from source
		document.addEventListener('dragstart', (event: DragEvent) => {
			// Reset previous drag path
			this.draggedFolderPath = null;
			
			// Try to get the dragged element
			const draggedElement = event.target as HTMLElement;
			
			if (draggedElement) {
				// Try to find path from the element or its parents
				let currentEl: HTMLElement | null = draggedElement;
				while (currentEl) {
					// 1. Try data-path attribute (common in Obsidian)
					const dataPath = currentEl.getAttribute('data-path');
					if (dataPath) {
						this.draggedFolderPath = dataPath;
						break;
					}

					// 2. Try Obsidian's internal __file property
					// @ts-ignore - Obsidian stores file/folder reference
					const file = currentEl.__file;
					if (file) {
						if (file instanceof TFolder || file instanceof TFile) {
							this.draggedFolderPath = file.path;
							break;
						} else if (typeof file.path === 'string') {
							// Fallback for plain objects that look like TFile/TFolder
							this.draggedFolderPath = file.path;
							break;
						}
					}
					currentEl = currentEl.parentElement;
				}
			}
		}, true); // Use capture phase

		// Prevent default drag behaviors on the target element
		target.addEventListener('dragover', (event: DragEvent) => {
			event.preventDefault();
			event.stopPropagation();
			this.inputElement.classList.add('llmsider-input-dragover');
		});

		target.addEventListener('dragleave', (event: DragEvent) => {
			event.preventDefault();
			event.stopPropagation();
			
			// If we have a view container, check if we're actually leaving it
			if (this.viewContainer && event.relatedTarget && 
				this.viewContainer.contains(event.relatedTarget as Node)) {
				return;
			}
			
			this.inputElement.classList.remove('llmsider-input-dragover');
		});

		target.addEventListener('drop', async (event: DragEvent) => {
			event.preventDefault();
			event.stopPropagation();
			this.inputElement.classList.remove('llmsider-input-dragover');

			// Get the drag data
			const dragData = event.dataTransfer;
			if (!dragData) return;

			// Try to get Obsidian-specific drag data first
			let obsidianDragData = '';
			
			// Try all available data types
			for (const type of dragData.types) {
				const data = dragData.getData(type);
				if (data && !obsidianDragData) {
					obsidianDragData = data;
				}
			}
			
			// Check if there's a file object in the drag event (Obsidian internal drag)
			// @ts-ignore - Check for Obsidian-specific properties
			if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
				// @ts-ignore
				const file = event.dataTransfer.files[0];
				// @ts-ignore - In Obsidian, files might have a path property
				if (file && file.path) {
					obsidianDragData = file.path;
				}
			}
			
			if (!obsidianDragData) {
				obsidianDragData = dragData.getData('text/plain');
			}
			
			// If we captured a folder path from dragstart event, use it as priority
			if (this.draggedFolderPath) {
				obsidianDragData = this.draggedFolderPath;
			}
			
			if (obsidianDragData) {
				try {
					// Check for multiple lines first (multiple files dragged)
					const lines = obsidianDragData.split(/\r?\n/).filter(line => line.trim().length > 0);
					
					if (lines.length > 1) {
						let successCount = 0;
						
						for (const line of lines) {
							let filePath = line.trim();
							
							// Handle Obsidian URI format for each line
							if (filePath.startsWith('obsidian://')) {
								try {
									const url = new URL(filePath);
									const fileParam = url.searchParams.get('file');
									if (fileParam) {
										filePath = decodeURIComponent(fileParam);
									}
								} catch (e) {
									// Ignore parse errors
								}
							}
							// Handle wiki link format for each line
							else if (filePath.startsWith('[[') && filePath.endsWith(']]')) {
								filePath = filePath.slice(2, -2);
							}
							
							// Try to handle as file/folder path
							if (await this.handleDroppedPath(filePath)) {
								successCount++;
							}
						}
						
						if (successCount > 0) {
							return;
						}
					}

					// Handle Obsidian URI format
					if (obsidianDragData.startsWith('obsidian://')) {
						const url = new URL(obsidianDragData);
						const fileParam = url.searchParams.get('file');
						
						if (fileParam) {
							// Decode the file path
							const filePath = decodeURIComponent(fileParam);
							await this.handleDroppedPath(filePath);
							return;
						}
					}
					
					// Handle wiki link format
					let filePath = obsidianDragData;
					if (filePath.startsWith('[[') && filePath.endsWith(']]')) {
						filePath = filePath.slice(2, -2);
						await this.handleDroppedPath(filePath);
						return;
					}
					
					// Try to handle as file/folder path
					const isFilePath = await this.handleDroppedPath(filePath);
					
					// If not a file path, treat as selected text
					if (!isFilePath) {
						await this.handleDroppedText(obsidianDragData);
					}
					
				} catch (error) {
					Logger.error('Error processing drop:', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					new Notice(this.plugin.getI18nManager()?.t('notifications.ui.errorProcessingDroppedItem', { error: errorMessage }) || `Error processing dropped item: ${errorMessage}`);
				}
			} else {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.unableToProcessDroppedItem') || 'Unable to process dropped item');
			}
		});
	}

	/**
	 * Setup paste event handler
	 */
	private setupPasteEvents(): void {
		this.inputElement.addEventListener('paste', async (event: ClipboardEvent) => {
			const clipboardData = event.clipboardData;
			if (!clipboardData) return;

			// Check for files in clipboard
			if (clipboardData.files && clipboardData.files.length > 0) {
				Logger.debug('Paste event contains files:', clipboardData.files.length);
				event.preventDefault();
				
				for (let i = 0; i < clipboardData.files.length; i++) {
					const file = clipboardData.files[i];
					// In Electron/Obsidian, the File object usually has a 'path' property
					// @ts-ignore - 'path' property exists in Electron environment
					const filePath = file.path;
					
					if (filePath) {
						Logger.debug('Processing pasted file path:', filePath);
						await this.handleDroppedPath(filePath);
					}
				}
			}
		});
	}

	/**
	 * Handle dropped text content as context
	 */
	private async handleDroppedText(text: string): Promise<void> {
		if (!text || !text.trim()) {
			Logger.debug('Empty text dropped, ignoring');
			return;
		}

		Logger.debug('Adding dropped text to context:', {
			length: text.length,
			preview: text.substring(0, 100)
		});

		const result = await this.contextManager.addTextToContext(text);
		
		if (result.success) {
			new Notice(result.message);
			this.updateContextDisplay();
		} else {
			new Notice(this.plugin.getI18nManager()?.t('notifications.ui.failedToAddText', { error: result.message }) || 'Failed to add text: ' + result.message);
		}
	}

	/**
	 * Handle a dropped file path (could be file or folder)
	 * Returns true if successfully handled as file/folder, false otherwise
	 */
	private async handleDroppedPath(filePath: string): Promise<boolean> {
		// Try direct path first
		let abstractFile = this.app.vault.getAbstractFileByPath(filePath);
		
		// If not found and doesn't have extension, try adding .md
		if (!abstractFile && !filePath.includes('.')) {
			const mdPath = filePath + '.md';
			abstractFile = this.app.vault.getAbstractFileByPath(mdPath);
		}
		
		if (abstractFile) {
			if (abstractFile instanceof TFolder) {
				// It's a folder
				await this.handleFolderDropped(abstractFile);
				return true;
			} else if (abstractFile instanceof TFile) {
				// It's a file
				await this.handleFileDropped(abstractFile);
				return true;
			}
		} else {
			// Check if it's an external file path
			const externalFileHandled = await this.handleExternalFile(filePath);
			if (externalFileHandled) {
				return true;
			}
			
			// Not a file/folder path, return false so it can be treated as text
			return false;
		}
		
		return false;
	}

	/**
	 * Handle external file (outside vault)
	 */
	private async handleExternalFile(filePath: string): Promise<boolean> {
		try {
			// Check if file exists
			if (!fs.existsSync(filePath)) {
				Logger.debug('External file does not exist:', filePath);
				return false;
			}

			const stats = fs.statSync(filePath);
			if (stats.isDirectory()) {
				Logger.debug('External path is a directory, not supported yet:', filePath);
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.externalFoldersNotSupported') || 'External folders are not supported');
				return false;
			}

			const fileName = path.basename(filePath);
			const ext = path.extname(filePath).toLowerCase();
			
			Logger.debug('Processing external file:', { filePath, fileName, ext });

			// For image files, copy to vault
			const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'];
			if (imageExtensions.includes(ext)) {
				await this.handleExternalImage(filePath, fileName);
				return true;
			}

			// For text files, read and add to context
			const textExtensions = ['.md', '.txt', '.json', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.css', '.html', '.xml', '.yaml', '.yml'];
			if (textExtensions.includes(ext)) {
				await this.handleExternalTextFile(filePath, fileName);
				return true;
			}

			// For other files, show notice
			new Notice(this.plugin.getI18nManager()?.t('notifications.ui.unsupportedFileType', { ext }) || `Unsupported file type: ${ext}`);
			return false;

		} catch (error) {
			Logger.error('Error handling external file:', error);
			new Notice(this.plugin.getI18nManager()?.t('notifications.ui.failedToReadFile') || 'Failed to read file');
			return false;
		}
	}

	/**
	 * Handle external image - copy to vault attachments folder
	 */
	private async handleExternalImage(filePath: string, fileName: string): Promise<void> {
		try {
			// Read file as buffer
			const fileBuffer = fs.readFileSync(filePath);
			const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);

			// Get attachments folder from settings or use default
			const attachmentFolder = (this.app.vault as any).getConfig('attachmentFolderPath') || 'attachments';
			
			// Ensure attachment folder exists
			if (!await this.app.vault.adapter.exists(attachmentFolder)) {
				await this.app.vault.createFolder(attachmentFolder);
			}

			// Generate unique filename if needed
			let targetFileName = fileName;
			let targetPath = normalizePath(`${attachmentFolder}/${targetFileName}`);
			let counter = 1;
			while (await this.app.vault.adapter.exists(targetPath)) {
				const ext = path.extname(fileName);
				const base = path.basename(fileName, ext);
				targetFileName = `${base}-${counter}${ext}`;
				targetPath = normalizePath(`${attachmentFolder}/${targetFileName}`);
				counter++;
			}

			// Write file to vault
			await this.app.vault.adapter.writeBinary(targetPath, arrayBuffer);
			
			// Get the created file
			const vaultFile = this.app.vault.getAbstractFileByPath(targetPath);
			if (vaultFile instanceof TFile) {
				Logger.debug('External image copied to vault:', targetPath);
				await this.handleFileDropped(vaultFile);
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.imageCopiedToVault', { path: targetPath }) || `Image copied to: ${targetPath}`);
			}

		} catch (error) {
			Logger.error('Error copying external image:', error);
			new Notice(this.plugin.getI18nManager()?.t('notifications.ui.failedToCopyImage') || 'Failed to copy image to vault');
		}
	}

	/**
	 * Handle external text file - read and add to context
	 */
	private async handleExternalTextFile(filePath: string, fileName: string): Promise<void> {
		try {
			const content = fs.readFileSync(filePath, 'utf-8');
			
			Logger.debug('Read external text file:', {
				fileName,
				size: content.length
			});

			// Add to context with file name as title
			const result = await this.contextManager.addTextToContext(content, fileName);
			
			if (result.success) {
				new Notice(result.message);
				this.updateContextDisplay();
			} else {
				new Notice(this.plugin.getI18nManager()?.t('notifications.ui.failedToAddFile', { error: result.message }) || 'Failed to add file: ' + result.message);
			}

		} catch (error) {
			Logger.error('Error reading external text file:', error);
			new Notice(this.plugin.getI18nManager()?.t('notifications.ui.failedToReadFile') || 'Failed to read file');
		}
	}

	/**
	 * Handle file dropped into input
	 */
	private async handleFileDropped(file: TFile): Promise<void> {
		// Get cursor position
		const cursorPos = this.inputElement.selectionStart || this.inputElement.value.length;
		
		// Create file placeholder
		const displayName = file.extension === 'md' ? file.basename : `${file.basename}.${file.extension}`;
		const filePlaceholder = `@[${displayName}] `;
		
		// Insert placeholder at cursor position
		const currentValue = this.inputElement.value;
		const newValue = currentValue.slice(0, cursorPos) + filePlaceholder + currentValue.slice(cursorPos);
		this.inputElement.value = newValue;
		
		// Move cursor after the placeholder
		const newCursorPos = cursorPos + filePlaceholder.length;
		this.inputElement.setSelectionRange(newCursorPos, newCursorPos);
		
		// Store placeholder mapping
		this.addPlaceholderMapping(displayName, file.path);
		
		// Add file to context with current provider information
		// Get provider type from connection settings
		const currentProviderValue = this.providerSelect.value;
		let providerType: string | undefined = undefined;
		
		if (currentProviderValue && currentProviderValue.includes('::')) {
			const [connectionId] = currentProviderValue.split('::');
			const connection = this.plugin.settings.connections.find(c => c.id === connectionId);
			
			if (connection) {
				providerType = connection.type; // e.g., 'free-deepseek', 'free-qwen', 'openai', etc.
				
				Logger.debug('File upload - connection type:', {
					connectionId: connectionId,
					connectionName: connection.name,
					connectionType: connection.type
				});
			}
		}
		
		const result = await this.contextManager.addFileToContext(file, undefined, providerType);
		if (result.success) {
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.ui.addedFile', { name: displayName }) || `Added file: ${displayName}`);
		} else {
			new Notice(result.message);
		}
		
		// Update UI
		this.autoResizeTextarea();
		this.updateSendButton();
		this.updateContextDisplay();
		
		// Focus back on input
		this.inputElement.focus();
	}

	/**
	 * Handle folder dropped into input
	 */
	private async handleFolderDropped(folder: TFolder): Promise<void> {
		// Get cursor position
		const cursorPos = this.inputElement.selectionStart || this.inputElement.value.length;
		
		// Create folder placeholder
		const displayName = folder.name || 'Root';
		const folderPlaceholder = `@[📁${displayName}] `;
		
		// Insert placeholder at cursor position
		const currentValue = this.inputElement.value;
		const newValue = currentValue.slice(0, cursorPos) + folderPlaceholder + currentValue.slice(cursorPos);
		this.inputElement.value = newValue;
		
		// Move cursor after the placeholder
		const newCursorPos = cursorPos + folderPlaceholder.length;
		this.inputElement.setSelectionRange(newCursorPos, newCursorPos);
		
		// Store placeholder mapping
		this.addPlaceholderMapping(`📁${displayName}`, folder.path);
		
		// Add folder to context
		const i18n = this.plugin.getI18nManager();
		new Notice(i18n?.t('notifications.ui.processingDirectory', { name: displayName }) || `Processing directory "${displayName}"...`);
		
		try {
			// Store current context count to track which files were added by this directory
			const beforeContextCount = this.contextManager.getCurrentNoteContext().length;
			
			const result = await this.contextManager.includeDirectory(folder);
			
			if (result.success) {
				// Track which files were added by this directory
				const afterContext = this.contextManager.getCurrentNoteContext();
				const newlyAddedFiles = afterContext.slice(beforeContextCount).map(ctx => ctx.name);
				
				// Store mapping: directory display name -> list of added filenames
				this.directoryFileMap.set(`📁${displayName}`, newlyAddedFiles);
				
				new Notice(result.message);
			} else {
				new Notice(result.message);
			}
		} catch (error) {
			Logger.error('Error processing directory:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.ui.errorProcessingDirectory', { error: errorMessage }) || `Error processing directory: ${errorMessage}`);
		}
		
		// Update UI
		this.autoResizeTextarea();
		this.updateSendButton();
		this.updateContextDisplay();
		
		// Focus back on input
		this.inputElement.focus();
	}

	/**
	 * Handle send message action
	 */
	private handleSendMessage(): void {
		const content = this.inputElement.value.trim();

		// Allow sending if we have content OR a selected prompt
		if (!content && !this.selectedPrompt) return;

		// Process file placeholders before sending
		const processedContent = this.processFilePlaceholders(content);

		// Prepare final message content
		let finalContent = processedContent;

		// If a prompt is selected, apply it to the user content
		if (this.selectedPrompt) {
			// If there's no user content, use the prompt with placeholder handling
			if (!processedContent) {
				// Check if there's context available, if so use "context", otherwise use "the current note"
				const hasContext = this.contextManager.hasContext();
				const defaultContent = hasContext ? 'context' : 'the current note';
				finalContent = this.promptManager.applyPrompt(this.selectedPrompt, defaultContent);
			} else {
				finalContent = this.promptManager.applyPrompt(this.selectedPrompt, processedContent);
			}
			Logger.debug('Applied prompt template:', {
				promptTitle: this.selectedPrompt.title,
				originalContent: processedContent || '(empty)',
				hasContext: this.contextManager.hasContext(),
				finalContent: finalContent.substring(0, 100) + '...'
			});
		}

		// Clear input and selected prompt immediately
		this.inputElement.value = '';
		this.selectedPrompt = undefined;
		this.autoResizeTextarea();
		this.updateSendButton();
		this.updatePromptIndicator();

		// Call callback if provided
		if (this.onSendMessage) {
			this.onSendMessage(finalContent);
		}
	}

	/**
	 * Handle optimize prompt action
	 */
	private async handleOptimizePrompt(): Promise<void> {
		if (this.isOptimizingPrompt) {
			return;
		}
		this.isOptimizingPrompt = true;
		const optimizeStatus = this.inputContainer.querySelector('.llmsider-optimize-status') as HTMLElement | null;
		
		const currentPrompt = this.inputElement.value.trim();
		
		// Check if there's a prompt to optimize
		if (!currentPrompt) {
			new Notice(this.plugin.i18n.t('ui.noPromptToOptimize') || 'Please enter a prompt first');
			this.isOptimizingPrompt = false;
			return;
		}

		if (optimizeStatus) {
			optimizeStatus.textContent = this.plugin.i18n.t('ui.optimizingPrompt') || 'Optimizing prompt...';
			optimizeStatus.style.display = 'inline-flex';
		}
		
		// Check if provider is available
		const availableProviders = this.plugin.getAvailableProviders();
		if (availableProviders.length === 0) {
			new Notice(this.plugin.i18n.t('ui.noProvidersConfigured') || 'No providers configured');
			return;
		}
		
		try {
			// Get active provider
			const activeProvider = this.plugin.settings.activeProvider;
			if (!activeProvider) {
				throw new Error('No active provider');
			}
			
			// Call LLM to optimize
			const provider = this.plugin.getProvider(activeProvider);
			if (!provider) {
				throw new Error('Provider not found');
			}
			
			// Build optimization prompt with clear instructions
			const systemMessage = `You are a prompt optimization expert. Your task is to enhance user prompts to make them clearer, more specific, and more effective for AI models to understand and respond to.

Rules:
1. Keep the user's core intent intact
2. Make the prompt more specific and actionable
3. Add necessary context if missing
4. Structure the prompt logically
5. Use clear and concise language
6. Return ONLY the optimized prompt without any explanation or additional text
7. Maintain the same language as the original prompt (Chinese/English)`;
			
			// Prepare messages for the LLM
			const messages = [
				{
					id: Date.now().toString(),
					role: 'user' as const,
					content: `Original prompt: ${currentPrompt}

Please optimize this prompt to be clearer and more effective. Return ONLY the optimized prompt.`,
					timestamp: Date.now()
				}
			];
			
			// Call provider using sendMessage (non-streaming for simplicity)
			const response = await provider.sendMessage(messages, undefined, systemMessage);
			
			// Extract optimized prompt from response
			const optimizedPrompt = response.content.trim();
			
			if (!optimizedPrompt) {
				throw new Error('Empty response from LLM');
			}
			
			// Update input with optimized prompt
			this.inputElement.value = optimizedPrompt;
			this.autoResizeTextarea();
			this.updateSendButton();
			
			// Show success notice
			new Notice(this.plugin.i18n.t('ui.promptOptimized') || 'Prompt optimized', 3000);
			
			// Focus back on input
			this.inputElement.focus();
			
		} catch (error) {
			Logger.error('[OptimizePrompt] Failed to optimize prompt:', error);
			
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(this.plugin.i18n.t('ui.promptOptimizationFailed') || 'Failed to optimize prompt: ' + errorMessage, 5000);
		} finally {
			if (optimizeStatus) {
				optimizeStatus.style.display = 'none';
			}
			this.isOptimizingPrompt = false;
		}
	}

	/**
	 * Handle input changes - check for # trigger (with debouncing)
	 */
	private handleInputChange(): void {
		// Clear previous timeout
		if (this.inputChangeTimeout) {
			clearTimeout(this.inputChangeTimeout);
		}
		
		// Debounce the input change handling
		this.inputChangeTimeout = window.setTimeout(() => {
			this.processInputChange();
		}, 150); // 150ms debounce delay
	}
	
	/**
	 * Process input changes - actual logic
	 */
	private processInputChange(): void {
		const content = this.inputElement.value;
		const cursorPosition = this.inputElement.selectionStart;
		
		// Check if user typed # at the beginning or after whitespace
		const beforeCursor = content.substring(0, cursorPosition);
		const match = beforeCursor.match(/(^|\s)#([^#\s]*)$/);
		
		if (match) {
			const query = match[2]; // The text after #
			
			// Calculate position for prompt selector - position above input box
			const inputRect = this.inputElement.getBoundingClientRect();
			
			// Position the selector relative to the input box
			const position = {
				x: inputRect.left,
				y: inputRect.top // Use the actual input top position, let selector handle positioning logic
			};
			
			// Show prompt selector
			this.promptSelector.show(query, position);
		} else if (this.promptSelector.isVisible()) {
			// Hide prompt selector if # is not at cursor
			this.promptSelector.hide();
		}
	}

	/**
	 * Handle prompt selection
	 */
	private handlePromptSelected(template: PromptTemplate): void {
		Logger.debug('Prompt selected:', template.title);
		
		// Remove the # trigger from input
		const content = this.inputElement.value;
		const cursorPosition = this.inputElement.selectionStart;
		const beforeCursor = content.substring(0, cursorPosition);
		const afterCursor = content.substring(cursorPosition);
		
		// Find and remove the # trigger
		const match = beforeCursor.match(/(^|\s)#([^#\s]*)$/);
		if (match) {
			const newBefore = beforeCursor.substring(0, match.index! + match[1].length);
			this.inputElement.value = newBefore + afterCursor;
			this.inputElement.setSelectionRange(newBefore.length, newBefore.length);
		}
		
		// Store selected prompt
		this.selectedPrompt = template;
		this.updatePromptIndicator();
		
		// Focus back to input
		this.inputElement.focus();
	}

	/**
	 * Handle prompt selection cancellation
	 */
	private handlePromptCancelled(): void {
		Logger.debug('Prompt selection cancelled');
		// Just focus back to input
		this.inputElement.focus();
	}

	/**
	 * Update prompt indicator in UI
	 */
	private updatePromptIndicator(): void {
		// Remove existing prompt indicator
		const existingIndicator = this.inputContainer.querySelector('.llmsider-prompt-indicator');
		if (existingIndicator) {
			existingIndicator.remove();
		}

		// Add new indicator if prompt is selected
		if (this.selectedPrompt) {
			const indicator = this.inputContainer.createDiv({
				cls: 'llmsider-prompt-indicator'
			});
			
			// Move indicator to the beginning (above input)
			this.inputContainer.insertBefore(indicator, this.inputContainer.firstChild);
			
			const icon = indicator.createSpan({
				cls: 'llmsider-prompt-indicator-icon',
				text: '💡'
			});
			
			const text = indicator.createSpan({
				cls: 'llmsider-prompt-indicator-text',
				text: `Using: ${this.selectedPrompt.title}`
			});
			
			// Add hint about direct sending
			const hint = indicator.createSpan({
				cls: 'llmsider-prompt-indicator-hint',
				text: '(Press Enter to send directly)'
			});
			
			const closeBtn = indicator.createSpan({
				cls: 'llmsider-prompt-indicator-close',
				text: '✕'
			});
			
			closeBtn.onclick = () => {
				this.selectedPrompt = undefined;
				this.updatePromptIndicator();
				this.updateSendButton();
			};
		}
	}

	/**
	 * Initialize prompt manager
	 */
	async initialize(): Promise<void> {
		await this.promptManager.initialize();
	}

	/**
	 * Get input placeholder text based on mode
	 */
	private getInputPlaceholder(): string {
		if (this.currentMode === 'ask') {
			return this.plugin.i18n.t('quickChatUI.chatInputPlaceholder');
		} else {
			return this.plugin.i18n.t('quickChatUI.editModePlaceholder');
		}
	}

	/**
	 * Auto-resize textarea based on content
	 */
	private autoResizeTextarea(): void {
		this.inputElement.style.height = 'auto';
		const newHeight = Math.min(this.inputElement.scrollHeight, 120); // Max 120px
		this.inputElement.style.height = newHeight + 'px';
	}

	/**
	 * Update send button state
	 */
	private updateSendButton(): void {
		const hasContent = this.inputElement.value.trim().length > 0;
		const hasSelectedPrompt = !!this.selectedPrompt;
		const availableProviders = this.plugin.getAvailableProviders();
		const hasProvider = availableProviders.length > 0;

		// Enable send button if we have content OR a selected prompt
		const canSend = (hasContent || hasSelectedPrompt) && hasProvider;

		this.sendButton.innerHTML = '▶';
		
		// Update title based on state
		if (hasSelectedPrompt && !hasContent && this.selectedPrompt) {
			this.sendButton.title = `Send with prompt: ${this.selectedPrompt.title}`;
		} else {
			this.sendButton.title = 'Send message';
		}

		if (this.sendButton instanceof HTMLButtonElement) {
			this.sendButton.disabled = !canSend;
		}
	}

	/**
	 * Update provider select options
	 * Displays providers grouped by Connection
	 */
	updateProviderSelect(): void {
		this.providerSelect.innerHTML = '';
		
		// Get providers with names (Connection + Model architecture)
		const providers = this.plugin.getAvailableProvidersWithNames();
		
		if (providers.length === 0) {
			const option = this.providerSelect.createEl('option', { text: this.plugin.i18n.t('ui.noProvidersConfigured') });
			option.disabled = true;
			return;
		}

		// Group providers by connection
		const connectionGroups = new Map<string, typeof providers>();

		for (const provider of providers) {
			if (provider.connectionId) {
				// New architecture provider
				if (!connectionGroups.has(provider.connectionId)) {
					connectionGroups.set(provider.connectionId, []);
				}
				connectionGroups.get(provider.connectionId)!.push(provider);
			}
		}

		// Add providers grouped by connection
		if (connectionGroups.size > 0) {
			connectionGroups.forEach((models, connectionId) => {
				const connection = this.plugin.settings.connections.find(c => c.id === connectionId);
				if (!connection) return;

				// Create optgroup for connection
				const optgroup = this.providerSelect.createEl('optgroup', {
					attr: { label: `${connection.name} (${connection.type})` }
				});

				// Add models under this connection
				models.forEach(provider => {
					const option = optgroup.createEl('option', {
						value: provider.id,
						text: `  ${provider.name}`
					});
					
					if (provider.id === this.plugin.settings.activeProvider) {
						option.selected = true;
					}
				});
			});
		}
		
		// If no active provider is set, auto-select the first available one
		if (!this.plugin.settings.activeProvider && providers.length > 0) {
			this.plugin.setActiveProvider(providers[0].id);
			Logger.debug('Auto-selected first available provider:', providers[0].id);
		}

		this.updateSendButton();
	}

	/**
	 * Update UI based on current state
	 */
	private updateUI(): void {
		// Update placeholder
		this.inputElement.placeholder = this.getInputPlaceholder();
		
		// Update context display
		this.updateContextDisplay();
		
		// Update provider select
		this.updateProviderSelect();
		
		// Update send button
		this.updateSendButton();
	}

	/**
	 * Update context display
	 */
	private updateContextDisplay(): void {
		this.contextDisplay.innerHTML = '';
		
		// Check if we have any context to display
		if (!this.contextManager.hasContext()) {
			this.contextDisplay.style.display = 'none';
			return;
		}

		this.contextDisplay.style.display = 'block';

		// Create a single container for all context items to display them inline
		const contextContainer = this.contextDisplay.createDiv({ cls: 'llmsider-context-container' });
		
		// Display current note context(s) as inline tags
		const noteContexts = this.contextManager.getCurrentNoteContext();
		noteContexts.forEach((noteContext) => {
			const contextTag = contextContainer.createEl('span', { cls: 'llmsider-context-tag llmsider-context-clickable' });

			contextTag.onclick = (e) => {
				// Ignore clicks on the remove button
				if ((e.target as HTMLElement).closest('.llmsider-context-remove')) return;

				e.preventDefault();
				e.stopPropagation();
				this.chatView?.showContextModal(noteContext.name, noteContext.content, noteContext.type);
			};
			
			// Use different icon based on file type
			let iconSVG = '';
			if (noteContext.type === 'image') {
				iconSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<circle cx="8.5" cy="8.5" r="1.5"></circle>
					<polyline points="21 15 16 10 5 21"></polyline>
				</svg>`;
			} else if (noteContext.type === 'document') {
				iconSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
					<polyline points="14 2 14 8 20 8"></polyline>
					<line x1="16" y1="13" x2="8" y2="13"></line>
					<line x1="16" y1="17" x2="8" y2="17"></line>
					<line x1="16" y1="9" x2="8" y2="9"></line>
				</svg>`;
			} else if (noteContext.type === 'spreadsheet') {
				iconSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 3v18h18"></path>
					<path d="M18 17V9"></path>
					<path d="M13 17V5"></path>
					<path d="M8 17v-3"></path>
				</svg>`;
			} else if (noteContext.type === 'presentation') {
				iconSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
					<line x1="8" y1="21" x2="16" y2="21"></line>
					<line x1="12" y1="17" x2="12" y2="21"></line>
				</svg>`;
			} else {
				// Default file icon
				iconSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
					<polyline points="14 2 14 8 20 8"></polyline>
				</svg>`;
			}
			
			const iconEl = contextTag.createEl('span', { cls: 'llmsider-context-icon' });
			iconEl.innerHTML = iconSVG;

			contextTag.createEl('span', { 
				cls: 'llmsider-context-name',
				text: noteContext.name
			});

			const removeBtn = contextTag.createEl('button', { 
				cls: 'llmsider-context-remove',
				text: '×',
				title: 'Remove note context'
			});

			removeBtn.onclick = (e) => {
				e.stopPropagation();
				// Remove from context manager
				this.contextManager.removeNoteContext(noteContext.name);
				
				// Remove placeholder from input box
				this.removePlaceholderFromInput(noteContext.name);
				
				this.updateContextDisplay();
			};
		});

		// Display selected text context as inline tag
		const selectedTextContext = this.contextManager.getSelectedTextContext();
		if (selectedTextContext) {
			const contextTag = contextContainer.createEl('span', { cls: 'llmsider-context-tag llmsider-context-clickable' });

			contextTag.onclick = (e) => {
				if ((e.target as HTMLElement).closest('.llmsider-context-remove')) return;
				e.preventDefault();
				e.stopPropagation();
				this.chatView?.showContextModal('选中文本', selectedTextContext.text, 'text');
			};
			
			contextTag.createEl('span', { 
				cls: 'llmsider-context-icon',
				text: '✂️'
			});

			contextTag.createEl('span', { 
				cls: 'llmsider-context-name',
				text: selectedTextContext.preview,
				title: selectedTextContext.text // Show full text on hover
			});

			const removeBtn = contextTag.createEl('button', { 
				cls: 'llmsider-context-remove',
				text: 'x',
				title: 'Remove selected text'
			});

			removeBtn.onclick = (e) => {
				e.stopPropagation();
				this.contextManager.removeSelectedTextContext();
				this.updateContextDisplay();
			};
		}
	}

	/**
	 * Handle file selected from suggestions
	 */
	private async handleFileSelected(file: unknown): Promise<void> {
		const result = await this.contextManager.addFileToContext(file);

		if (result.success) {
			new Notice(result.message);
			this.updateContextDisplay();
		} else {
			new Notice(result.message);
		}
	}

	/**
	 * Add placeholder to path mapping
	 */
	addPlaceholderMapping(displayName: string, fullPath: string): void {
		this.placeholderPathMap.set(displayName, fullPath);
		Logger.debug('Added placeholder mapping:', { displayName, fullPath });
	}

	/**
	 * Remove placeholder from path mapping
	 */
	removePlaceholderMapping(displayName: string): void {
		this.placeholderPathMap.delete(displayName);
		Logger.debug('Removed placeholder mapping:', displayName);
	}

	/**
	 * Clear all placeholder mappings
	 */
	clearPlaceholderMappings(): void {
		this.placeholderPathMap.clear();
		this.directoryFileMap.clear();
		Logger.debug('Cleared all placeholder mappings and directory file mappings');
	}

	/**
	 * Remove placeholder from input box by file name
	 */
	private removePlaceholderFromInput(fileName: string): void {
		const currentValue = this.inputElement.value;
		
		// Try different possible placeholder formats
		const possiblePlaceholders = [
			`@[${fileName}]`,  // Exact filename
			`@[${fileName.replace(/\.[^/.]+$/, '')}]`,  // Without extension
			`@[📁${fileName}]`,  // Directory with emoji
		];
		
		// Also check the placeholder mapping for reverse lookup
		for (const [displayName, fullPath] of this.placeholderPathMap.entries()) {
			const pathFileName = fullPath.split('/').pop() || '';
			const pathBaseName = pathFileName.replace(/\.[^/.]+$/, '');
			
			// Check if this mapping matches the file we're trying to remove
			if (pathFileName === fileName || 
				pathBaseName === fileName || 
				displayName.includes(fileName)) {
				possiblePlaceholders.push(`@[${displayName}]`);
			}
		}
		
		// Try to remove each possible placeholder
		let newValue = currentValue;
		for (const placeholder of possiblePlaceholders) {
			if (newValue.includes(placeholder)) {
				// Remove the placeholder and any trailing space
				newValue = newValue.replace(placeholder + ' ', placeholder).replace(placeholder, '');
				Logger.debug('Removed placeholder from input:', placeholder);
				break;
			}
		}
		
		// Update input if changed
		if (newValue !== currentValue) {
			this.inputElement.value = newValue;
			this.autoResizeTextarea();
			this.updateSendButton();
		}
	}

	/**
	 * Handle folder selected from suggestions
	 */
	private async handleFolderSelected(folder: TFolder): Promise<void> {
		new Notice(this.plugin.i18n.t('ui.processingDirectory', {name: folder.name}) || `Processing directory "${folder.name}"...`);

		try {
			// Store current context count to track which files were added by this directory
			const beforeContextCount = this.contextManager.getCurrentNoteContext().length;

			const result = await this.contextManager.includeDirectory(folder);

			if (result.success) {
				// Track which files were added by this directory
				const afterContext = this.contextManager.getCurrentNoteContext();
				const newlyAddedFiles = afterContext.slice(beforeContextCount).map(ctx => ctx.name);

				// Store mapping: directory display name -> list of added filenames
				const displayName = `📁${folder.name || 'Root'}`;
				this.directoryFileMap.set(displayName, newlyAddedFiles);

				Logger.debug('Directory added, tracking files:', {
					directory: displayName,
					filesAdded: newlyAddedFiles,
					totalFiles: newlyAddedFiles.length
				});


			new Notice(result.message);
			this.updateContextDisplay();
		} else {
			new Notice(result.message);
		}
	} catch (error) {
		Logger.error('Failed to include directory from @ suggestion:', error);
		new Notice(this.plugin.i18n.t('ui.failedToProcessDirectory', {error: error instanceof Error ? error.message : 'Unknown error'}) || `Failed to process directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}	// Store captured selection to preserve across menu interactions
	private capturedSelection: string | null = null;

	/**
	 * Show context options menu
	 */
	showContextOptions(): void {
		// Remove existing context menu if any
		document.querySelectorAll('.llmsider-context-menu').forEach(el => el.remove());
		
		// Close all other menus (mutual exclusion)
		document.querySelectorAll('.llmsider-mode-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-tools-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-mcp-dropdown').forEach(el => el.remove());
		document.querySelectorAll('.llmsider-provider-dropdown').forEach(el => el.remove());

		// CRITICAL: Capture text selection BEFORE showing menu to prevent loss when focus changes
		this.capturedSelection = this.captureCurrentSelection();
		Logger.debug('Captured selection for context menu:', {
			length: this.capturedSelection?.length || 0,
			preview: this.capturedSelection?.substring(0, 50) + (this.capturedSelection && this.capturedSelection.length > 50 ? '...' : '')
		});

		// Show menu for different context options
		const menu = document.createElement('div');
		menu.className = 'llmsider-context-menu';
		Logger.debug('Created menu element:', menu);
		
		// Get i18n instance
		const i18n = this.plugin.getI18nManager();
		
		// Create context options with SVG icons (matching mode selector style)
		const options = [
			{
				action: 'current-note',
				label: i18n?.t('ui.currentNoteContent') || 'Current Note Content',
				description: i18n?.t('ui.currentNoteContentDesc') || 'Include the current note',
				iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
					<polyline points="14 2 14 8 20 8"></polyline>
				</svg>`
			},
			{
				action: 'selection',
				label: i18n?.t('ui.includeSelection') || 'Include Selection',
				description: i18n?.t('ui.includeSelectionDesc') || 'Include selected text',
				iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M9 11l3 3L22 4"></path>
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
				</svg>`
			},
			{
				action: 'file-directory',
				label: i18n?.t('ui.includeFileDirectory') || 'Include File&Directory',
				description: i18n?.t('ui.includeFileDirectoryDesc') || 'Browse and select files or folders',
				iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
				</svg>`
			},
			{
				action: 'webpage-content',
				label: i18n?.t('ui.includeWebpageContent') || 'Current Webpage Content',
				description: i18n?.t('ui.includeWebpageContentDesc') || 'Get content from current webpage',
				iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="2" y1="12" x2="22" y2="12"></line>
					<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
				</svg>`
			},
			{
				action: 'epub-page',
				label: i18n?.t('ui.includeEpubPageContent') || 'Current Epub Page',
				description: i18n?.t('ui.includeEpubPageContentDesc') || 'Get content from current epub page',
				iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
					<path d="M12 6v8"></path>
					<path d="M8 10h8"></path>
				</svg>`
			},
			{
				action: 'smart-search',
				label: i18n?.t('ui.smartSearchNotes') || 'Smart Note Search',
				description: i18n?.t('ui.smartSearchNotesDesc') || 'Find relevant notes using semantic search',
				iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"></circle>
					<path d="m21 21-4.35-4.35"></path>
					<path d="M11 8a3 3 0 0 0-3 3"></path>
				</svg>`
			}
		];

		Logger.debug('Options array:', options);
		Logger.debug('Starting to create option elements');

		options.forEach(option => {
			const optionEl = menu.createDiv({ cls: 'llmsider-context-option' });
			optionEl.dataset.action = option.action;
			
			Logger.debug('Created context option:', option.action);
			
			// Create structure matching mode selector
			const iconDiv = optionEl.createDiv({ cls: 'context-icon' });
			iconDiv.innerHTML = option.iconSvg;
			
			const infoDiv = optionEl.createDiv({ cls: 'context-info' });
			infoDiv.createDiv({ cls: 'context-label', text: option.label });
			infoDiv.createDiv({ cls: 'context-description', text: option.description });
		});

		Logger.debug('All options created, menu children count:', menu.children.length);

		// Position the menu ABOVE the attach button
		const attachBtn = this.sendButton.closest('.llmsider-input-container')?.querySelector('.llmsider-input-btn') as HTMLElement;
		Logger.debug('Attach button found:', attachBtn);
		
		if (attachBtn) {
			const rect = attachBtn.getBoundingClientRect();
			menu.style.position = 'fixed';
			menu.style.left = `${rect.left}px`;
			menu.style.bottom = `${window.innerHeight - rect.top + 8}px`; // Position above button
			menu.style.zIndex = '99999';
			Logger.debug('Menu positioned at:', { left: rect.left, bottom: window.innerHeight - rect.top + 8 });
		}

		Logger.debug('Adding click event listener to menu');

		// Handle menu clicks
		menu.addEventListener('click', async (e) => {
			const target = e.target as HTMLElement;
			Logger.debug('Menu clicked, target:', target);
			
			const optionEl = target.closest('.llmsider-context-option') as HTMLElement;
			Logger.debug('Option element found:', optionEl);
			
			if (!optionEl) return;
			
			const action = optionEl.dataset.action;
			Logger.debug('Action selected:', action);
			
			if (action === 'current-note') {
				await this.includeCurrentNote();
			} else if (action === 'selection') {
				await this.includeSelectedTextWithCaptured();
			} else if (action === 'smart-search') {
				// Close menu and open smart search modal
				menu.remove();
				this.capturedSelection = null;
				this.openSmartSearchModal();
				return; // Early return to skip the menu.remove() below
			} else if (action === 'file-directory') {
				// Trigger file/folder selector by simulating @ input
				Logger.debug('File&Directory button clicked, triggering file selector');
				this.triggerFileFolderSelector();
			} else if (action === 'webpage-content') {
				// Close menu immediately to prevent UI blocking
				menu.remove();
				this.capturedSelection = null;
				
				// Show loading notice and fetch content asynchronously
				const loadingNotice = new Notice(this.plugin.i18n.t('ui.fetchingWebpageContent'), 0);
				
				// Use setTimeout to ensure UI updates before starting fetch
				setTimeout(async () => {
					try {
						await this.includeWebpageContent();
					} finally {
						loadingNotice.hide();
					}
				}, 10);
				
				return; // Early return to skip the menu.remove() below
			} else if (action === 'epub-page') {
				// Close menu immediately to prevent UI blocking
				menu.remove();
				this.capturedSelection = null;
				
				// Show loading notice and fetch content asynchronously
				const loadingNotice = new Notice(this.plugin.i18n.t('ui.fetchingEpubPageContent') || 'Fetching epub page content...', 0);
				
				// Use setTimeout to ensure UI updates before starting fetch
				setTimeout(async () => {
					try {
						await this.includeEpubPageContent();
					} finally {
						loadingNotice.hide();
					}
				}, 10);
				
				return; // Early return to skip the menu.remove() below
			}
			
			// Clear captured selection after use
			this.capturedSelection = null;
			menu.remove();
		});

		// Add to document
		Logger.debug('Adding menu to document.body');
		document.body.appendChild(menu);
		Logger.debug('Menu added to DOM, checking visibility');
		Logger.debug('Menu in DOM:', document.body.contains(menu));
		Logger.debug('Menu display style:', window.getComputedStyle(menu).display);
		Logger.debug('Menu visibility style:', window.getComputedStyle(menu).visibility);

		// Close dropdown when clicking outside
		const closeHandler = (e: MouseEvent) => {
			if (!menu.contains(e.target as Node) && !attachBtn?.contains(e.target as Node)) {
				menu.remove();
				// Clear captured selection if menu is cancelled
				this.capturedSelection = null;
				document.removeEventListener('click', closeHandler);
			}
		};
		setTimeout(() => {
			document.addEventListener('click', closeHandler);
		}, 10);
	}

	/**
	 * Trigger file/folder selector by directly showing the suggestions UI
	 * This activates the file suggestions UI without typing @ in the input
	 */
	private triggerFileFolderSelector(): void {
		Logger.debug('triggerFileFolderSelector called');
		Logger.debug('fileSuggestions instance:', this.fileSuggestions);
		Logger.debug('fileSuggestions.triggerSuggestions:', typeof this.fileSuggestions?.triggerSuggestions);
		
		// Directly trigger the file suggestions display
		this.fileSuggestions.triggerSuggestions();
		
		Logger.debug('triggerSuggestions method called');
	}

	/**
	 * Include directory in context
	 */
	private async includeDirectory(): Promise<void> {
		// Create and show folder selection modal
		const folderModal = new FolderSelectionModal(this.app, async (folder: TFolder) => {
			if (!folder) {
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.ui.noDirectorySelected') || 'No directory selected');
				return;
			}
			
			const i18n = this.plugin.getI18nManager();
			new Notice(i18n?.t('notifications.ui.processingDirectory', { name: folder.name }) || `Processing directory "${folder.name}"...`);
			
			try {
				const result = await this.contextManager.includeDirectory(folder);
				
				if (result.success) {
					new Notice(result.message);
					this.updateContextDisplay();
				} else {
					new Notice(result.message);
				}
			} catch (error) {
				Logger.error('Failed to include directory:', error);
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.ui.failedToProcessDirectory', { error: error instanceof Error ? error.message : 'Unknown error' }) || `Failed to process directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		});
		
		folderModal.open();
	}

	/**
	 * Include current note in context
	 */
	private async includeCurrentNote(): Promise<void> {
		const result = await this.contextManager.includeCurrentNote();
		
		new Notice(result.message);
		
		if (result.success) {
			this.updateContextDisplay();
		}
	}

	/**
	 * Capture current text selection from all possible sources
	 */
	private captureCurrentSelection(): string | null {
		let selectedText = '';
		
		// Method 1: Try from active markdown view editor (highest priority for editor selection)
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = (activeView as unknown).editor;
			if (editor && editor.getSelection) {
				selectedText = editor.getSelection();
				Logger.debug('Captured from MarkdownView editor:', selectedText.length);
				if (selectedText && selectedText.trim()) {
					return selectedText.trim();
				}
			}
		}
		
		// Method 2: Try from global window selection (for any text)
		if (!selectedText) {
			const selection = window.getSelection();
			if (selection && selection.toString().trim()) {
				selectedText = selection.toString().trim();
				Logger.debug('Captured from window selection:', selectedText.length);
				if (selectedText && selectedText.trim()) {
					return selectedText.trim();
				}
			}
		}
		
		// Method 3: Try from document selection
		if (!selectedText) {
			if (document.getSelection) {
				const docSelection = document.getSelection();
				if (docSelection && docSelection.toString().trim()) {
					selectedText = docSelection.toString().trim();
					Logger.debug('Captured from document selection:', selectedText.length);
					if (selectedText && selectedText.trim()) {
						return selectedText.trim();
					}
				}
			}
		}
		
		Logger.debug('No text selection found during capture');
		return null;
	}

	/**
	 * Include selected text in context using captured selection if available
	 */
	private async includeSelectedTextWithCaptured(): Promise<void> {
		// Use captured selection if available, otherwise fall back to real-time selection
		let textToAdd = '';
		
		// Check if current session has existing conversation history
		const currentSession = this.plugin.settings.chatSessions[0];
		const hasHistory = currentSession && currentSession.messages.length > 0;
		
		if (this.capturedSelection && this.capturedSelection.trim()) {
			textToAdd = this.capturedSelection.trim();
			Logger.debug('Using captured selection:', {
				length: textToAdd.length,
				preview: textToAdd.substring(0, 50) + (textToAdd.length > 50 ? '...' : '')
			});
			
			// Use the context manager's addTextToContext method directly
			const result = await this.contextManager.addTextToContext(textToAdd);
			
			if (result.success) {
				let noticeMessage = `Added selected text to context: ${result.context?.preview || 'Added'}`;
				if (hasHistory) {
					noticeMessage += ' - ' + this.plugin.i18n.t('ui.contextAddedWithHistory');
				}
				new Notice(noticeMessage, hasHistory ? 6000 : 4000);
				this.updateContextDisplay();
			} else {
				new Notice(result.message);
			}
		} else {
			// Fallback to the original method for real-time selection
			Logger.debug('No captured selection, falling back to real-time selection');
			await this.includeSelectedText();
		}
	}

	/**
	 * Include selected text in context (original method for real-time selection)
	 */
	private async includeSelectedText(): Promise<void> {
		const result = await this.contextManager.includeSelectedText();
		
		// Check if current session has existing conversation history
		const currentSession = this.plugin.settings.chatSessions[0];
		const hasHistory = currentSession && currentSession.messages.length > 0;
		
		if (result.success) {
			// Show appropriate notice based on conversation history
			if (hasHistory) {
				new Notice(result.message + ' - ' + this.plugin.i18n.t('ui.contextAddedWithHistory'), 6000);
			} else {
				new Notice(result.message);
			}
			this.updateContextDisplay();
		} else {
			new Notice(result.message);
		}
	}

	/**
	 * Include current webpage content as context
	 */
	private async includeWebpageContent(): Promise<void> {
		try {
			const result = await this.contextManager.includeWebpageContent();
			
			// Check if current session has existing conversation history
			const currentSession = this.plugin.settings.chatSessions[0];
			const hasHistory = currentSession && currentSession.messages.length > 0;
			
			if (result.success) {
				// Format message with i18n
				let message = '';
				if (result.contentLength) {
					// Successfully fetched content
					message = `${this.plugin.i18n.t('ui.webpageContentFetched')} (${result.contentLength} ${this.plugin.i18n.t('ui.characters')})`;
				} else if (result.url) {
					// Only URL reference added
					message = `${this.plugin.i18n.t('ui.webpageUrlAdded')}: ${result.url}`;
				}
				
				// Show appropriate notice based on conversation history
				if (hasHistory) {
					new Notice(message + ' - ' + this.plugin.i18n.t('ui.contextAddedWithHistory'), 6000);
				} else {
					new Notice(message, 4000);
				}
				// Update context display asynchronously to avoid blocking
				requestAnimationFrame(() => {
					this.updateContextDisplay();
				});
			} else {
				new Notice(result.message, 5000);
			}
		} catch (error) {
			Logger.error('Error fetching webpage content:', error);
			const errorMsg = error instanceof Error ? error.message : this.plugin.i18n.t('ui.webpageContentFetchFailed');
			new Notice(`${this.plugin.i18n.t('ui.webpageContentFetchFailed')}: ${errorMsg}`, 5000);
		}
	}

	/**
	 * Include current epub page content as context
	 */
	private async includeEpubPageContent(): Promise<void> {
		try {
			const result = await this.contextManager.includeEpubPageContent();
			
			// Check if current session has existing conversation history
			const currentSession = this.plugin.settings.chatSessions[0];
			const hasHistory = currentSession && currentSession.messages.length > 0;
			
			if (result.success) {
				// Format message with i18n
				let message = '';
				if (result.contentLength && result.bookTitle) {
					message = `${this.plugin.i18n.t('ui.epubPageContentFetched')}: ${result.bookTitle} (${result.contentLength} ${this.plugin.i18n.t('ui.characters')})`;
				} else {
					message = this.plugin.i18n.t('ui.epubPageContentFetched');
				}
				
				// Show appropriate notice based on conversation history
				if (hasHistory) {
					new Notice(message + ' - ' + this.plugin.i18n.t('ui.contextAddedWithHistory'), 6000);
				} else {
					new Notice(message, 4000);
				}
				// Update context display asynchronously to avoid blocking
				requestAnimationFrame(() => {
					this.updateContextDisplay();
				});
			} else {
				new Notice(result.message, 5000);
			}
		} catch (error) {
			Logger.error('Error fetching epub page content:', error);
			const errorMsg = error instanceof Error ? error.message : this.plugin.i18n.t('ui.epubPageContentFetchFailed');
			new Notice(`${this.plugin.i18n.t('ui.epubPageContentFetchFailed')}: ${errorMsg}`, 5000);
		}
	}

	/**
	 * Open smart search modal for searching and adding notes to context
	 */
	private openSmartSearchModal(): void {
		const vectorDBManager = this.plugin.getVectorDBManager();
		
		if (!vectorDBManager) {
			new Notice(this.plugin.i18n.t('ui.vectorDBNotInitialized'));
			return;
		}
		
		const modal = new SmartSearchModal(
			this.app,
			vectorDBManager,
			this.contextManager,
			this.plugin.i18n,
			() => {
				// Update context display when notes are added
				this.updateContextDisplay();
			}
		);
		
		modal.open();
	}

	/**
	 * Get input value
	 */
	getValue(): string {
		return this.inputElement.value;
	}

	/**
	 * Set input value
	 */
	setValue(value: string): void {
		this.inputElement.value = value;
		this.autoResizeTextarea();
		this.updateSendButton();
	}

	/**
	 * Focus input
	 */
	focus(): void {
		this.inputElement.focus();
	}

	/**
	 * Clear input
	 */
	clear(): void {
		this.inputElement.value = '';
		this.autoResizeTextarea();
		this.updateSendButton();
		// Clear placeholder mappings when input is cleared
		this.clearPlaceholderMappings();
	}

	/**
	 * Check if prompt selector is currently visible
	 */
	isPromptSelectorVisible(): boolean {
		return this.promptSelector.isVisible();
	}

	/**
	 * Get prompt selector element for positioning calculations
	 */
	getPromptSelectorBounds(): DOMRect | null {
		if (!this.promptSelector.isVisible()) {
			return null;
		}
		const selectorEl = document.body.querySelector('.llmsider-prompt-selector') as HTMLElement;
		return selectorEl ? selectorEl.getBoundingClientRect() : null;
	}

	/**
	 * Handle file placeholder deletion with backspace
	 * Returns true if a placeholder was deleted (to prevent default behavior)
	 */
	private handleFilePlaceholderDeletion(): boolean {
		const cursorPos = this.inputElement.selectionStart || 0;
		const text = this.inputElement.value;

		// Check if cursor is right after a file placeholder: @[filename]
		// Pattern: @[content] followed by space
		const beforeCursor = text.substring(0, cursorPos);

		// Match file placeholder pattern at the end of text before cursor
		// Simple format: @[filename] or @[📁foldername]
		const placeholderMatch = beforeCursor.match(/@\[([^\]]+)\]\s*$/);

		if (placeholderMatch) {
			// Extract the display name for cleanup
			const displayName = placeholderMatch[1];

			// Check if this is a directory placeholder
			const isDirectoryPlaceholder = displayName.startsWith('📁');

			// Get the full path before removing from mapping
			const fullPath = this.placeholderPathMap.get(displayName);

			// Calculate the start position of the placeholder
			const placeholderStart = cursorPos - placeholderMatch[0].length;

			// Remove the entire placeholder
			const newText = text.substring(0, placeholderStart) + text.substring(cursorPos);
			this.inputElement.value = newText;

			// Position cursor at the start of where the placeholder was
			this.inputElement.setSelectionRange(placeholderStart, placeholderStart);

			// Clean up the mapping
			this.removePlaceholderMapping(displayName);

			if (isDirectoryPlaceholder) {
				// Handle directory placeholder deletion
				this.handleDirectoryPlaceholderDeletion(displayName);
			} else {
				// Handle single file placeholder deletion
				this.handleSingleFilePlaceholderDeletion(displayName, fullPath);
			}

			// Auto-resize and update UI
			this.autoResizeTextarea();
			this.updateSendButton();

			return true; // Placeholder was deleted
		}

		return false; // No placeholder to delete
	}

	/**
	 * Handle deletion of a directory placeholder - remove all files that were added by this directory
	 */
	private handleDirectoryPlaceholderDeletion(displayName: string): void {
		// Get the list of files that were added by this directory
		const addedFiles = this.directoryFileMap.get(displayName);

		if (addedFiles && addedFiles.length > 0) {
			Logger.debug('Removing directory and all its files from context:', {
				directory: displayName,
				filesCount: addedFiles.length,
				files: addedFiles
			});

			// Remove each file from the context
			let removedCount = 0;
			addedFiles.forEach(fileName => {
				const removed = this.contextManager.removeNoteContext(fileName);
				if (removed) {
					removedCount++;
				} else {
					// If removal by filename failed, try by basename (without extension)
					const baseName = fileName.replace(/\.[^/.]+$/, '');
					const removedByBaseName = this.contextManager.removeNoteContext(baseName);
					if (removedByBaseName) {
						removedCount++;
					}
				}
			});

			// Clean up the directory file mapping
			this.directoryFileMap.delete(displayName);

			Logger.debug('Directory removal completed:', {
				directory: displayName,
				attemptedRemoval: addedFiles.length,
				actuallyRemoved: removedCount
			});

			// Update context display to reflect changes
			this.updateContextDisplay();
		} else {
			Logger.debug('No tracked files found for directory:', displayName);
		}
	}

	/**
	 * Handle deletion of a single file placeholder
	 */
	private handleSingleFilePlaceholderDeletion(displayName: string, fullPath: string | undefined): void {
		// Remove from context if we have the file path
		if (fullPath) {
			// Extract the file name for context removal
			const fileName = fullPath.split('/').pop() || displayName;
			// Try removing with both the full filename and basename
			const removed = this.contextManager.removeNoteContext(fileName);
			if (!removed) {
				// If removal by filename failed, try by basename (without extension)
				const baseName = fileName.replace(/\.[^/.]+$/, '');
				this.contextManager.removeNoteContext(baseName);
			}
			Logger.debug('Removed single file from context:', fileName);
			// Update context display to reflect changes
			this.updateContextDisplay();
		}
	}

	/**
	 * Process file placeholders in content and convert them to path references for LLM
	 * @[filename] placeholders are converted to "Referenced file: path" format using cached mappings
	 */
	private processFilePlaceholders(content: string): string {
		// Convert file placeholder patterns: @[displayName] to path references using mapping
		return content.replace(/@\[([^\]]+)\]\s*/g, (match, displayName) => {
			// Try to get path from mapping first (efficient O(1) lookup)
			const cachedPath = this.placeholderPathMap.get(displayName);

			if (cachedPath) {
				// Use cached path for fast lookup
				return `Referenced file: ${cachedPath} `;
			} else {
				// Fallback: try to find the file (slower, for edge cases)
				Logger.warn('Placeholder not found in cache, falling back to file search:', displayName);
				const file = this.findFileByName(displayName);

				if (file) {
					// Cache the found result for future use
					this.addPlaceholderMapping(displayName, file.path);
					return `Referenced file: ${file.path} `;
				} else {
					// If file not found, return the display name as fallback
					return `Referenced file: ${displayName} (not found) `;
				}
			}
		}).trim();
	}

	/**
	 * Find file by display name in the vault
	 */
	private findFileByName(displayName: string): unknown {
		try {
			// Get all files from the vault
			const files = this.app.vault.getFiles();

			// Try exact match first (with extension)
			let matchedFile = files.find(file => {
				const fileDisplayName = file.extension === 'md' ? file.basename : `${file.basename}.${file.extension}`;
				return fileDisplayName === displayName;
			});

			// If no exact match, try basename match (without extension)
			if (!matchedFile) {
				matchedFile = files.find(file => file.basename === displayName);
			}

			// If still no match, try partial match
			if (!matchedFile) {
				matchedFile = files.find(file => file.name.includes(displayName));
			}

			return matchedFile;
		} catch (error) {
			Logger.error('Error finding file by name:', error);
			return null;
		}
	}

	/**
	 * Cleanup when component is destroyed
	 */
	destroy(): void {
		if (this.boundOptimizePromptHandler) {
			this.inputElement.removeEventListener('llmsider-optimize-prompt', this.boundOptimizePromptHandler);
			this.boundOptimizePromptHandler = undefined;
		}
		this.fileSuggestions.destroy();
	}
}

/**
 * Modal for selecting a folder from the vault
 */
class FolderSelectionModal extends Modal {
	private onSelect: (folder: TFolder) => void;
	private folders: TFolder[] = [];

	constructor(app: App, onSelect: (folder: TFolder) => void) {
		super(app);
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: this.plugin.i18n.t('ui.selectDirectory') });
		contentEl.createEl('p', { text: this.plugin.i18n.t('ui.chooseDirectoryPrompt') });

		// Get all folders from the vault
		this.folders = this.getAllFolders();

		if (this.folders.length === 0) {
			contentEl.createEl('p', { text: this.plugin.i18n.t('ui.noDirectoriesFound') });
			return;
		}

		// Create folder list
		const folderList = contentEl.createDiv({ cls: 'llmsider-folder-list' });

		this.folders.forEach(folder => {
			const folderItem = folderList.createDiv({ cls: 'llmsider-folder-item' });
			
			// Folder icon and name
			const folderButton = folderItem.createEl('button', { 
				cls: 'llmsider-folder-button',
				text: `📁 ${folder.path || 'Root'}`
			});

			// File count info
			const fileCount = this.getFileCountInFolder(folder);
			const supportedCount = this.getSupportedFileCountInFolder(folder);
			
			const infoSpan = folderItem.createEl('span', { 
				cls: 'llmsider-folder-info',
				text: ` (${supportedCount}/${fileCount} supported files)`
			});

			folderButton.onclick = () => {
				this.onSelect(folder);
				this.close();
			};
		});

		// Cancel button
		const buttonContainer = contentEl.createDiv({ cls: 'llmsider-modal-buttons' });
		const cancelButton = buttonContainer.createEl('button', { text: this.plugin.i18n.t('ui.cancelButton') });
		cancelButton.onclick = () => this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

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

		// Get root folder and process it
		const rootFolder = this.app.vault.getRoot();
		processFolder(rootFolder);

		return folders.sort((a, b) => a.path.localeCompare(b.path));
	}

	private getFileCountInFolder(folder: TFolder): number {
		let count = 0;
		
		const processFolder = (currentFolder: TFolder) => {
			currentFolder.children.forEach(child => {
				if (child instanceof TFile) {
					count++;
				} else if (child instanceof TFolder) {
					processFolder(child);
				}
			});
		};
		
		processFolder(folder);
		return count;
	}

	private getSupportedFileCountInFolder(folder: TFolder): number {
		let count = 0;
		
		const processFolder = (currentFolder: TFolder) => {
			currentFolder.children.forEach(child => {
				if (child instanceof TFile) {
					if (this.isFileSupported(child.name)) {
						count++;
					}
				} else if (child instanceof TFolder) {
					processFolder(child);
				}
			});
		};
		
		processFolder(folder);
		return count;
	}

	private isFileSupported(filename: string): boolean {
		// Basic check for supported file extensions
		const ext = filename.toLowerCase().split('.').pop();
		const supportedExtensions = [
			'md', 'markdown', 'txt', 'json', 'csv', 'pdf',
			'jpg', 'jpeg', 'png', 'webp', 'svg', // Removed 'gif' - not supported by LLMs
			'docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods',
			'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'py', 'java'
		];
		return ext ? supportedExtensions.includes(ext) : false;
	}
}
