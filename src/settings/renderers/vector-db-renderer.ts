import { App, Setting, Notice, Modal } from 'obsidian';
import { Logger } from '../../utils/logger';
import LLMSiderPlugin from '../../main';
import { I18nManager } from '../../i18n/i18n-manager';
import { CHUNK_SIZE_MIN, CHUNK_SIZE_MAX, CHUNK_OVERLAP_MIN, CHUNK_OVERLAP_MAX } from '../../vector/types';

/**
 * Interface for progress UI elements
 */
interface ProgressElements {
	container: HTMLElement;
	fill: HTMLElement;
	text: HTMLElement;
	pauseButton: HTMLElement;
}

/**
 * VectorDBRenderer handles the rendering of Vector Database settings section
 * Includes progress tracking, stats display, and configuration options
 */
export class VectorDBRenderer {
	private app: App;
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;

	constructor(app: App, plugin: LLMSiderPlugin, i18n: I18nManager) {
		this.app = app;
		this.plugin = plugin;
		this.i18n = i18n;
	}

	/**
	 * Main render method for Vector Database settings
	 */
	async render(containerEl: HTMLElement): Promise<void> {
		// Get vector DB manager reference once at the top
		let vectorDBManager = this.plugin.getVectorDBManager();
		
		// Vector Database Settings Header with Action Buttons
		const headerContainer = containerEl.createDiv();
		headerContainer.style.display = 'flex';
		headerContainer.style.justifyContent = 'space-between';
		headerContainer.style.alignItems = 'center';
		headerContainer.style.marginTop = '20px';
		headerContainer.style.marginBottom = '12px';

		// Left side: Title and Stats
		const titleStatsContainer = headerContainer.createDiv();
		titleStatsContainer.style.display = 'flex';
		titleStatsContainer.style.flexDirection = 'column';
		titleStatsContainer.style.gap = '4px';

		// Title
		const vectorHeader = titleStatsContainer.createEl('h2', { 
			text: this.i18n.t('settingsPage.vectorDatabase.title')
		});
		vectorHeader.style.fontSize = '16px';
		vectorHeader.style.fontWeight = '600';
		vectorHeader.style.margin = '0';
		
		// Stats display (initially hidden, shown after index is ready)
		const statsDisplay = titleStatsContainer.createDiv({ cls: 'llmsider-vector-stats' });
		statsDisplay.style.fontSize = '12px';
		statsDisplay.style.color = 'var(--text-muted)';
		statsDisplay.style.display = 'none';
		statsDisplay.style.lineHeight = '1.4';
		
		// Check if vector DB is initialized
		if (vectorDBManager && vectorDBManager.isSystemInitialized()) {
			// Already initialized, can show stats (will be updated by updateHeaderStats below)
			statsDisplay.style.display = 'none';
		} else if (vectorDBManager) {
			// Manager exists but not initialized yet (loading in background)
			statsDisplay.textContent = this.i18n.t('settingsPage.vectorDatabase.statsLoading');
			statsDisplay.style.display = 'block';
		} else {
			// No manager at all (disabled)
			statsDisplay.style.display = 'none';
		}
		
		// Create progress elements
		const progressElements = this.createProgressBar(headerContainer);

		// Helper function to hide progress
		const hideProgress = () => {
			progressElements.container.style.display = 'none';
			progressElements.fill.style.width = '0%';
			// Reset pause button state
			const vectorDBManager = this.plugin.getVectorDBManager();
			if (vectorDBManager) {
				vectorDBManager.resumeIndexing();
				this.updatePauseButtonState(progressElements.pauseButton);
			}
		};

		// Helper function to update header with stats
		const updateHeaderStats = async () => {
			// Always get the latest vectorDBManager instance
			const currentVectorDB = this.plugin.getVectorDBManager();
			if (currentVectorDB && currentVectorDB.isSystemInitialized()) {
				try {
					const stats = await currentVectorDB.getStats();
					const sizeStr = stats.diskSizeKB < 1024 
						? `${stats.diskSizeKB}KB` 
						: `${(stats.diskSizeKB / 1024).toFixed(1)}MB`;
					
					// Update stats display with i18n
					statsDisplay.textContent = this.i18n.t('settingsPage.vectorDatabase.statsFormat', {
						files: stats.totalFiles.toString(),
						filesLabel: this.i18n.t('settingsPage.vectorDatabase.statsFiles'),
						chunks: stats.totalChunks.toString(),
						chunksLabel: this.i18n.t('settingsPage.vectorDatabase.statsChunks'),
						size: sizeStr
					});
					statsDisplay.style.display = 'block';
					Logger.debug('Stats updated:', stats);
				} catch (error) {
					Logger.warn('Failed to update stats:', error);
					statsDisplay.style.display = 'none';
				}
			} else {
				Logger.debug('VectorDB not initialized, hiding stats');
				statsDisplay.style.display = 'none';
			}
		};

		// Check if there's an ongoing indexing operation and restore progress
		if (vectorDBManager) {
			const status = vectorDBManager.getStatus();
			if (status.isIndexing) {
				const currentProgress = vectorDBManager.getCurrentProgress();
				if (currentProgress) {
					// Restore progress display
					progressElements.container.style.display = 'flex';
					progressElements.fill.style.width = `${currentProgress.percentage}%`;
					progressElements.text.textContent = `${currentProgress.percentage}%`;
					Logger.debug('Restored progress:', currentProgress);
				}
			} else {
				// Not indexing, show stats if available
				await updateHeaderStats();
			}
			
			// Set up stats update callback for automatic refresh (no notification)
			vectorDBManager.setStatsUpdateCallback(async () => {
				await updateHeaderStats();
			});
			
			// Set up progress callback
			this.setupProgressCallback(vectorDBManager, progressElements, hideProgress, updateHeaderStats);
		}

		// Action Buttons Container (right side of header)
		this.renderActionButtons(headerContainer, progressElements, hideProgress, updateHeaderStats);

		// Container with border
		const vectorContainer = containerEl.createDiv({ cls: 'llmsider-settings-section-container' });

		// Render settings
		await this.renderSettings(vectorContainer, statsDisplay);
	}

	/**
	 * Create progress bar UI elements
	 */
	private createProgressBar(headerContainer: HTMLElement): ProgressElements {
		// Create inline progress container in header (initially hidden)
		const progressContainer = headerContainer.createDiv({ cls: 'llmsider-vector-progress-container' });
		progressContainer.style.display = 'none';
		progressContainer.style.alignItems = 'center';
		progressContainer.style.gap = '12px';
		progressContainer.style.marginLeft = '16px';
		progressContainer.style.marginRight = '16px';
		progressContainer.style.minWidth = '300px';
		progressContainer.style.maxWidth = '400px';

		// Progress bar
		const progressBar = progressContainer.createDiv({ cls: 'llmsider-vector-progress-bar' });
		progressBar.style.height = '6px';
		progressBar.style.backgroundColor = 'var(--background-modifier-border)';
		progressBar.style.borderRadius = '3px';
		progressBar.style.overflow = 'hidden';
		progressBar.style.flex = '1';
		progressBar.style.minWidth = '120px';

		const progressFill = progressBar.createDiv({ cls: 'llmsider-vector-progress-fill' });
		progressFill.style.height = '100%';
		progressFill.style.backgroundColor = 'var(--interactive-accent)';
		progressFill.style.width = '0%';
		progressFill.style.transition = 'width 0.3s ease';

		// Progress text (percentage and count)
		const progressText = progressContainer.createDiv({ cls: 'llmsider-vector-progress-text' });
		progressText.style.fontSize = '12px';
		progressText.style.color = 'var(--text-muted)';
		progressText.style.whiteSpace = 'nowrap';
		progressText.style.minWidth = '80px';
		progressText.textContent = '0%';

		// Pause/Resume button
		const pauseButton = this.createPauseButton(progressContainer);

		return {
			container: progressContainer,
			fill: progressFill,
			text: progressText,
			pauseButton
		};
	}

	/**
	 * Create pause/resume button
	 */
	private createPauseButton(container: HTMLElement): HTMLElement {
		const pauseButton = container.createEl('button', {
			cls: 'llmsider-pause-index-btn clickable-icon',
			attr: { 
				'aria-label': this.i18n.t('settingsPage.vectorDatabase.pauseIndexing'),
				'title': this.i18n.t('settingsPage.vectorDatabase.pauseIndexing')
			}
		});
		pauseButton.style.padding = '4px';
		pauseButton.style.cursor = 'pointer';
		pauseButton.style.border = 'none';
		pauseButton.style.borderRadius = '3px';
		pauseButton.style.backgroundColor = 'transparent';
		
		// Pause icon SVG (default)
		const pauseIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
		pauseButton.innerHTML = pauseIconSVG;
		
		pauseButton.onclick = async (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			const vectorDBManager = this.plugin.getVectorDBManager();
			if (!vectorDBManager) {
				Logger.warn('VectorDB manager not available for pause/resume');
				return;
			}

			const isPaused = vectorDBManager.isPausedState();
			Logger.debug(`Pause button clicked, current state: ${isPaused ? 'paused' : 'running'}`);
			
			if (isPaused) {
				Logger.debug('Resuming indexing...');
				vectorDBManager.resumeIndexing();
				new Notice(this.i18n.t('settingsPage.vectorDatabase.indexingResumed') || 'Indexing resumed');
			} else {
				Logger.debug('Pausing indexing...');
				vectorDBManager.pauseIndexing();
				new Notice(this.i18n.t('settingsPage.vectorDatabase.indexingPaused') || 'Indexing paused');
			}
			
			// Update button state after a brief delay
			setTimeout(() => {
				this.updatePauseButtonState(pauseButton);
			}, 100);
		};

		return pauseButton;
	}

	/**
	 * Update pause button state (icon and label)
	 */
	private updatePauseButtonState(pauseButton: HTMLElement): void {
		const vectorDBManager = this.plugin.getVectorDBManager();
		if (!vectorDBManager) return;
		
		const isPaused = vectorDBManager.isPausedState();
		
		// Pause icon SVG
		const pauseIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
		
		// Play/Resume icon SVG
		const playIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
		
		if (isPaused) {
			pauseButton.innerHTML = playIconSVG;
			pauseButton.setAttribute('aria-label', this.i18n.t('settingsPage.vectorDatabase.resumeIndexing'));
			pauseButton.setAttribute('title', this.i18n.t('settingsPage.vectorDatabase.resumeIndexing'));
		} else {
			pauseButton.innerHTML = pauseIconSVG;
			pauseButton.setAttribute('aria-label', this.i18n.t('settingsPage.vectorDatabase.pauseIndexing'));
			pauseButton.setAttribute('title', this.i18n.t('settingsPage.vectorDatabase.pauseIndexing'));
		}
	}

	/**
	 * Setup progress callback for real-time updates
	 */
	private setupProgressCallback(
		vectorDBManager: any,
		progressElements: ProgressElements,
		hideProgress: () => void,
		updateHeaderStats: () => Promise<void>
	): void {
		vectorDBManager.setProgressCallback((progress: any) => {
			let percentage = 0;
			let displayText = '';
			
			if (progress.phase === 'scanning') {
				percentage = 0;
				displayText = this.i18n.t('settingsPage.vectorDatabase.scanning');
			} else if (progress.phase === 'processing') {
				percentage = 0;
				displayText = this.i18n.t('settingsPage.vectorDatabase.processingFile', {
					current: progress.currentFileIndex,
					total: progress.totalFiles
				});
			} else if (progress.phase === 'indexing') {
				percentage = progress.totalChunks && progress.currentChunk
					? Math.floor((progress.currentChunk / progress.totalChunks) * 100)
					: 0;
				const statusText = progress.currentFile || this.i18n.t('settingsPage.vectorDatabase.indexingChunk', {
					current: progress.currentChunk || 0,
					total: progress.totalChunks || 0
				});
				displayText = this.i18n.t('settingsPage.vectorDatabase.indexingProgress', {
					percentage: percentage,
					status: statusText
				});
			} else if (progress.phase === 'finalizing') {
				percentage = 100;
				displayText = this.i18n.t('settingsPage.vectorDatabase.finalizing');
				// Schedule stats update after a short delay
				setTimeout(async () => {
					hideProgress();
					await updateHeaderStats();
				}, 500);
			}
			
			progressElements.container.style.display = 'flex';
			progressElements.fill.style.width = `${percentage}%`;
			progressElements.text.textContent = displayText;
		});
	}

	/**
	 * Render action buttons (rebuild index, etc.)
	 */
	private renderActionButtons(
		headerContainer: HTMLElement,
		progressElements: ProgressElements,
		hideProgress: () => void,
		updateHeaderStats: () => Promise<void>
	): void {
		const headerActionsContainer = headerContainer.createDiv();
		headerActionsContainer.style.display = 'flex';
		headerActionsContainer.style.gap = '8px';
		headerActionsContainer.style.alignItems = 'center';

		// Rebuild Index Button
		const rebuildButton = headerActionsContainer.createEl('button', {
			cls: 'clickable-icon',
			attr: { 
				'aria-label': this.i18n.t('settingsPage.vectorDatabase.rebuildIndexFull') || 'Rebuild Index (Full)',
				'title': this.i18n.t('settingsPage.vectorDatabase.rebuildIndexFullDesc') || 'Clear and rebuild entire index from scratch'
			}
		});
		rebuildButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
		rebuildButton.style.padding = '4px';
		
		rebuildButton.addEventListener('click', async () => {
			await this.handleRebuildIndex(rebuildButton, progressElements, hideProgress, updateHeaderStats);
		});
	}

	/**
	 * Handle rebuild index button click
	 */
	private async handleRebuildIndex(
		rebuildButton: HTMLElement,
		progressElements: ProgressElements,
		hideProgress: () => void,
		updateHeaderStats: () => Promise<void>
	): Promise<void> {
		Logger.debug('Full rebuild index button clicked');
		try {
			rebuildButton.setAttribute('disabled', 'true');
			(rebuildButton as HTMLButtonElement).disabled = true;
			rebuildButton.style.opacity = '0.5';
			
			// Check if vector DB is enabled in settings
			if (!this.plugin.settings.vectorSettings.enabled) {
				Logger.warn('Vector DB is disabled in settings');
				new Notice(this.i18n.t('settingsPage.vectorDatabase.disabledInSettings') || 'Vector database is disabled. Please enable it first.', 5000);
				return;
			}
			
			let vectorDBManager = this.plugin.getVectorDBManager();
			
			// Initialize if not already initialized
			if (!vectorDBManager) {
				Logger.debug('Vector DB manager not initialized, initializing now...');
				new Notice(this.i18n.t('settingsPage.vectorDatabase.initializing') || 'Initializing vector database...', 3000);
				
				try {
					await (this.plugin as any).initializeVectorDB();
					vectorDBManager = this.plugin.getVectorDBManager();
					
					if (!vectorDBManager) {
						throw new Error('Failed to initialize vector database manager');
					}
				} catch (initError) {
					Logger.error('Failed to initialize:', initError);
					const message = initError instanceof Error ? initError.message : String(initError);
					new Notice(`${this.i18n.t('settingsPage.vectorDatabase.initFailed') || 'Initialization failed'}: ${message}`, 5000);
					return;
				}
			}
			
			if (!vectorDBManager.isSystemInitialized()) {
				Logger.warn('Vector DB system not initialized');
				new Notice(this.i18n.t('settingsPage.vectorDatabase.notInitialized'), 5000);
				return;
			}
			
			Logger.debug('Starting full index rebuild (from scratch)...');
			const startTime = Date.now();
			
			// Show initial progress
			progressElements.container.style.display = 'flex';
			progressElements.container.style.visibility = 'visible';
			progressElements.container.style.opacity = '1';
			progressElements.fill.style.width = '0%';
			progressElements.text.textContent = '0% (准备中...)';
			
			const result = await vectorDBManager.rebuildIndex((progress: any) => {
				this.handleRebuildProgress(progress, progressElements);
			});
			
			const duration = Date.now() - startTime;
			
			Logger.debug('Full rebuild completed:', {
				totalChunks: result.added,
				errors: result.errors.length,
				duration: `${duration}ms`
			});
			
			if (result.errors.length > 0) {
				Logger.warn('Rebuild completed with errors:', result.errors);
			}
			
			const message = this.i18n.t('notifications.vectorDatabase.rebuildComplete', {
				chunks: result.added.toString(),
				duration: (result.duration / 1000).toFixed(1)
			});
			new Notice(message, 5000);
			
			// Hide progress and update stats after a brief delay
			setTimeout(async () => {
				hideProgress();
				await updateHeaderStats();
			}, 2000);
		} catch (error) {
			Logger.error('Failed to rebuild index:', error);
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`${this.i18n.t('settingsPage.vectorDatabase.rebuildFailed')}: ${message}`, 5000);
			hideProgress();
		} finally {
			rebuildButton.removeAttribute('disabled');
			(rebuildButton as HTMLButtonElement).disabled = false;
			rebuildButton.style.opacity = '1';
		}
	}

	/**
	 * Handle rebuild progress updates
	 */
	private handleRebuildProgress(progress: any, progressElements: ProgressElements): void {
		let percentage = 0;
		let displayText = '';
		
		Logger.debug('[VectorDB Progress]', progress);
		
		if (progress.phase === 'scanning') {
			percentage = 0;
			displayText = this.i18n.t('settingsPage.vectorDatabase.scanning');
		} else if (progress.phase === 'processing') {
			percentage = 0;
			displayText = this.i18n.t('settingsPage.vectorDatabase.processingFile', {
				current: progress.currentFileIndex,
				total: progress.totalFiles
			});
		} else if (progress.phase === 'indexing') {
			percentage = progress.totalChunks && progress.currentChunk
				? Math.floor((progress.currentChunk / progress.totalChunks) * 100)
				: 0;
			const statusText = this.i18n.t('settingsPage.vectorDatabase.indexingChunk', {
				current: progress.currentChunk || 0,
				total: progress.totalChunks || 0
			});
			displayText = this.i18n.t('settingsPage.vectorDatabase.indexingProgress', {
				percentage: percentage,
				status: statusText
			});
		} else if (progress.phase === 'finalizing') {
			percentage = 100;
			displayText = this.i18n.t('settingsPage.vectorDatabase.finalizing');
		}
		
		Logger.debug(`Displaying: ${displayText}`);
		
		// Update progress bar
		if (progressElements.container) {
			progressElements.container.style.display = 'flex';
			progressElements.container.style.visibility = 'visible';
			progressElements.container.style.opacity = '1';
		}
		if (progressElements.fill) {
			progressElements.fill.style.width = `${percentage}%`;
		}
		if (progressElements.text) {
			progressElements.text.textContent = displayText;
		}
	}

	/**
	 * Render all vector database settings
	 */
	private async renderSettings(vectorContainer: HTMLElement, statsDisplay: HTMLElement): Promise<void> {
		// Enable/Disable Vector Search
		new Setting(vectorContainer)
			.setName(this.i18n.t('settingsPage.vectorDatabase.enableSemanticSearch'))
			.setDesc(this.i18n.t('settingsPage.vectorDatabase.enableSemanticSearchDesc'))
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.vectorSettings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.vectorSettings.enabled = value;
						await this.plugin.saveSettings();
						// Note: Parent will handle re-render
					});
			});

		// Only show additional settings if enabled
		if (this.plugin.settings.vectorSettings.enabled) {
			await this.renderEnabledSettings(vectorContainer, statsDisplay);
		}
	}

	/**
	 * Render settings when vector DB is enabled
	 */
	private async renderEnabledSettings(vectorContainer: HTMLElement, statsDisplay: HTMLElement): Promise<void> {
		// Show Similar Notes Toggle
		new Setting(vectorContainer)
			.setName(this.i18n.t('settingsPage.vectorDatabase.showSimilarNotes') || 'Show Similar Notes')
			.setDesc(this.i18n.t('settingsPage.vectorDatabase.showSimilarNotesDesc') || 'Display similar notes at the bottom of each note based on semantic similarity')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.vectorSettings.showSimilarNotes)
					.onChange(async (value) => {
						this.plugin.settings.vectorSettings.showSimilarNotes = value;
						await this.plugin.saveSettings();
						
						// Trigger update if a note is currently open
						const activeFile = this.app.workspace.getActiveFile();
						if (activeFile && this.plugin.similarNotesManager) {
							await this.plugin.similarNotesManager.onFileOpen(activeFile);
						}
					});
			});
		
		// Embedding Model Selection
		await this.renderEmbeddingModelSetting(vectorContainer, statsDisplay);
		
		// Chunking Strategy
		this.renderChunkingStrategySetting(vectorContainer);
		
		// Character Strategy Settings (conditional)
		if (this.plugin.settings.vectorSettings.chunkingStrategy === 'character') {
			this.renderCharacterStrategySettings(vectorContainer);
		}
		
		// Search Results Count
		this.renderSearchResultsSetting(vectorContainer);
		
		// Suggest Related Files
		this.renderSuggestRelatedFilesSetting(vectorContainer);
	}

	/**
	 * Render embedding model selection setting
	 */
	private async renderEmbeddingModelSetting(vectorContainer: HTMLElement, statsDisplay: HTMLElement): Promise<void> {
		const embeddingModelSetting = new Setting(vectorContainer)
			.setName(this.i18n.t('settingsPage.vectorDatabase.embeddingModel'))
			.setDesc(this.i18n.t('settingsPage.vectorDatabase.embeddingModelDesc'));

		// Get list of connections and models
		const connections = await this.plugin.configDb.getConnections();
		const modelOptions: Record<string, string> = { '': this.i18n.t('settingsPage.vectorDatabase.selectModel') };
		const connectionTypeMap: Record<string, string> = {};

		for (const conn of connections) {
			const models = await this.plugin.configDb.getModelsForConnection(conn.id);
			for (const model of models) {
				if (model.isEmbedding) {
					const modelId = `${conn.id}::${model.id}`;
					const typeLabel = conn.type === 'huggingface' ? '🤗 Local' : '☁️ API';
					modelOptions[modelId] = `${typeLabel} | ${conn.name} - ${model.name}`;
					connectionTypeMap[modelId] = conn.type;
				}
			}
		}

		embeddingModelSetting.addDropdown(dropdown => {
			for (const [value, label] of Object.entries(modelOptions)) {
				dropdown.addOption(value, label);
			}

			dropdown.setValue(this.plugin.settings.vectorSettings.embeddingModelId);
			dropdown.onChange(async (value) => {
				await this.handleEmbeddingModelChange(value, dropdown, statsDisplay);
			});
		});
	}

	/**
	 * Handle embedding model change with confirmation if needed
	 */
	private async handleEmbeddingModelChange(
		value: string,
		dropdown: any,
		statsDisplay: HTMLElement
	): Promise<void> {
		const oldValue = this.plugin.settings.vectorSettings.embeddingModelId;
		
		// Check if model actually changed and database has content
		if (value !== oldValue && oldValue) {
			const currentVectorDB = this.plugin.getVectorDBManager();
			if (currentVectorDB && currentVectorDB.isSystemInitialized()) {
				const stats = await currentVectorDB.getStats();
				
				// Only show prompt if there's indexed content
				if (stats.totalChunks > 0) {
					await this.showEmbeddingModelChangeModal(value, oldValue, dropdown, statsDisplay);
					return;
				}
			}
		}
		
		// If no prompt shown, proceed normally
		await this.applyEmbeddingModelChange(value, statsDisplay, false);
	}

	/**
	 * Show modal for embedding model change confirmation
	 */
	private async showEmbeddingModelChangeModal(
		newValue: string,
		oldValue: string,
		dropdown: any,
		statsDisplay: HTMLElement
	): Promise<void> {
		const modal = new Modal(this.app);
		modal.titleEl.setText(this.i18n.t('settingsPage.vectorDatabase.modelChangeTitle') || 'Embedding Model Changed');
		
		const content = modal.contentEl;
		content.createEl('p', { 
			text: this.i18n.t('settingsPage.vectorDatabase.modelChangeWarning') || 
				'Changing the embedding model requires rebuilding the vector index. If you don\'t rebuild now, enhanced search and other vector-based features may not work properly due to dimension mismatch.'
		});
		content.createEl('p', {
			text: this.i18n.t('settingsPage.vectorDatabase.modelChangeQuestion') || 
				'Do you want to rebuild the index now?',
			cls: 'llmsider-modal-question'
		}).style.fontWeight = 'bold';
		
		const buttonContainer = content.createDiv({ cls: 'llmsider-modal-buttons' });
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.marginTop = '20px';
		buttonContainer.style.justifyContent = 'flex-end';
		
		const rebuildBtn = buttonContainer.createEl('button', {
			text: this.i18n.t('settingsPage.vectorDatabase.rebuildNow') || 'Rebuild Now',
			cls: 'mod-cta'
		});
		
		const laterBtn = buttonContainer.createEl('button', {
			text: this.i18n.t('settingsPage.vectorDatabase.rebuildLater') || 'Later'
		});
		
		const cancelBtn = buttonContainer.createEl('button', {
			text: this.i18n.t('common.cancel') || 'Cancel'
		});
		
		// Handle rebuild now
		rebuildBtn.addEventListener('click', async () => {
			modal.close();
			await this.applyEmbeddingModelChange(newValue, statsDisplay, true);
		});
		
		// Handle later
		laterBtn.addEventListener('click', async () => {
			modal.close();
			await this.applyEmbeddingModelChange(newValue, statsDisplay, false);
		});
		
		// Handle cancel
		cancelBtn.addEventListener('click', () => {
			modal.close();
			dropdown.setValue(oldValue);
		});
		
		modal.open();
	}

	/**
	 * Apply embedding model change
	 */
	private async applyEmbeddingModelChange(
		newValue: string,
		statsDisplay: HTMLElement,
		triggerRebuild: boolean
	): Promise<void> {
		this.plugin.settings.vectorSettings.embeddingModelId = newValue;
		await this.plugin.saveSettings();
		
		if (!newValue) return;
		
		Logger.debug('Embedding model changed, reinitializing vector database...');
		new Notice(this.i18n.t('settingsPage.vectorDatabase.reinitializing') || 'Reinitializing with new embedding model...', 3000);
		
		try {
			const currentVectorDB = this.plugin.getVectorDBManager();
			
			if (currentVectorDB) {
				Logger.debug('Shutting down existing vector database...');
				await currentVectorDB.shutdown();
			}
			
			Logger.debug('Initializing with new embedding model...');
			await (this.plugin as any).initializeVectorDB();
			
			if (triggerRebuild) {
				// Find and click rebuild button
				const rebuildButton = document.querySelector('.clickable-icon[aria-label*="Rebuild"]') as HTMLElement;
				if (rebuildButton) {
					rebuildButton.click();
				}
			} else {
				new Notice(this.i18n.t('settingsPage.vectorDatabase.rebuildReminder') || 'Remember to rebuild the index before using vector search features.', 5000);
			}
			
			// Update stats
			const newVectorDB = this.plugin.getVectorDBManager();
			if (newVectorDB && newVectorDB.isSystemInitialized()) {
				const stats = await newVectorDB.getStats();
				const sizeStr = stats.diskSizeKB < 1024 
					? `${stats.diskSizeKB}KB` 
					: `${(stats.diskSizeKB / 1024).toFixed(1)}MB`;
				statsDisplay.textContent = this.i18n.t('settingsPage.vectorDatabase.statsFormat', {
					files: stats.totalFiles.toString(),
					filesLabel: this.i18n.t('settingsPage.vectorDatabase.statsFiles'),
					chunks: stats.totalChunks.toString(),
					chunksLabel: this.i18n.t('settingsPage.vectorDatabase.statsChunks'),
					size: sizeStr
				});
				statsDisplay.style.display = 'block';
			}
		} catch (error) {
			Logger.error('Failed to reinitialize:', error);
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`${this.i18n.t('settingsPage.vectorDatabase.reinitializeFailed') || 'Failed to reinitialize'}: ${message}`, 5000);
		}
	}

	/**
	 * Render chunking strategy setting
	 */
	private renderChunkingStrategySetting(vectorContainer: HTMLElement): void {
		const chunkingStrategySetting = new Setting(vectorContainer)
			.setName(this.i18n.t('settingsPage.vectorDatabase.chunkingStrategy'))
			.setDesc(this.i18n.t('settingsPage.vectorDatabase.chunkingStrategyDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption('semantic', this.i18n.t('settingsPage.vectorDatabase.strategySemantic'));
				dropdown.addOption('character', this.i18n.t('settingsPage.vectorDatabase.strategyCharacter'));
				
				dropdown.setValue(this.plugin.settings.vectorSettings.chunkingStrategy);
				dropdown.onChange(async (value: string) => {
					this.plugin.settings.vectorSettings.chunkingStrategy = value as 'character' | 'semantic';
					await this.plugin.saveSettings();
					// Note: Parent will handle re-render
				});
			});
		
		// Add info icon with tooltip
		this.addInfoIcon(chunkingStrategySetting);
	}

	/**
	 * Add info icon with tooltip
	 */
	private addInfoIcon(setting: Setting): void {
		const infoIcon = setting.nameEl.createSpan({ cls: 'llmsider-info-icon' });
		infoIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
		infoIcon.style.marginLeft = '6px';
		infoIcon.style.cursor = 'pointer';
		infoIcon.style.opacity = '0.6';
		infoIcon.style.verticalAlign = 'middle';
		infoIcon.style.display = 'inline-flex';
		infoIcon.style.alignItems = 'center';
		
		const tooltip = document.createElement('div');
		tooltip.className = 'llmsider-info-tooltip';
		tooltip.textContent = this.i18n.t('settingsPage.vectorDatabase.chunkingStrategyInfo');
		tooltip.style.display = 'none';
		document.body.appendChild(tooltip);
		
		infoIcon.addEventListener('mouseenter', (e) => {
			const rect = infoIcon.getBoundingClientRect();
			tooltip.style.display = 'block';
			tooltip.style.top = `${rect.bottom + 8}px`;
			tooltip.style.left = `${rect.left + rect.width / 2}px`;
		});
		
		infoIcon.addEventListener('mouseleave', () => {
			tooltip.style.display = 'none';
		});
	}

	/**
	 * Render character strategy settings (chunk size and overlap)
	 */
	private renderCharacterStrategySettings(vectorContainer: HTMLElement): void {
		// Chunk Size
		const chunkSizeSetting = new Setting(vectorContainer)
			.setName(this.i18n.t('settingsPage.vectorDatabase.chunkSize'))
			.setDesc(this.i18n.t('settingsPage.vectorDatabase.chunkSizeDesc'))
			.addText(text => {
				text.setPlaceholder('1000')
					.setValue(String(this.plugin.settings.vectorSettings.chunkSize))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num)) {
							if (num < CHUNK_SIZE_MIN) {
								new Notice(`Chunk size must be at least ${CHUNK_SIZE_MIN}`, 3000);
								text.setValue(String(CHUNK_SIZE_MIN));
								this.plugin.settings.vectorSettings.chunkSize = CHUNK_SIZE_MIN;
							} else if (num > CHUNK_SIZE_MAX) {
								new Notice(`Chunk size cannot exceed ${CHUNK_SIZE_MAX}`, 3000);
								text.setValue(String(CHUNK_SIZE_MAX));
								this.plugin.settings.vectorSettings.chunkSize = CHUNK_SIZE_MAX;
							} else {
								this.plugin.settings.vectorSettings.chunkSize = num;
							}
							
							// Ensure overlap is less than chunk size
							if (this.plugin.settings.vectorSettings.chunkOverlap >= num) {
								const newOverlap = Math.floor(num * 0.1);
								this.plugin.settings.vectorSettings.chunkOverlap = newOverlap;
								new Notice(`Chunk overlap adjusted to ${newOverlap} (must be less than chunk size)`, 3000);
								// Note: Parent will handle re-render
							}
							
							await this.plugin.saveSettings();
						}
					});
				text.inputEl.type = 'number';
				text.inputEl.min = String(CHUNK_SIZE_MIN);
				text.inputEl.max = String(CHUNK_SIZE_MAX);
			});
		chunkSizeSetting.settingEl.style.paddingLeft = '24px';
		chunkSizeSetting.settingEl.style.fontSize = '0.95em';

		// Chunk Overlap
		const chunkOverlapSetting = new Setting(vectorContainer)
			.setName(this.i18n.t('settingsPage.vectorDatabase.chunkOverlap'))
			.setDesc(this.i18n.t('settingsPage.vectorDatabase.chunkOverlapDesc'))
			.addText(text => {
				text.setPlaceholder('100')
					.setValue(String(this.plugin.settings.vectorSettings.chunkOverlap))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num)) {
							const chunkSize = this.plugin.settings.vectorSettings.chunkSize;
							
							if (num < CHUNK_OVERLAP_MIN) {
								new Notice(`Chunk overlap must be at least ${CHUNK_OVERLAP_MIN}`, 3000);
								text.setValue(String(CHUNK_OVERLAP_MIN));
								this.plugin.settings.vectorSettings.chunkOverlap = CHUNK_OVERLAP_MIN;
							} else if (num > CHUNK_OVERLAP_MAX) {
								new Notice(`Chunk overlap cannot exceed ${CHUNK_OVERLAP_MAX}`, 3000);
								text.setValue(String(CHUNK_OVERLAP_MAX));
								this.plugin.settings.vectorSettings.chunkOverlap = CHUNK_OVERLAP_MAX;
							} else if (num >= chunkSize) {
								new Notice(`Chunk overlap must be less than chunk size (${chunkSize})`, 3000);
								const maxOverlap = Math.floor(chunkSize * 0.5);
								text.setValue(String(maxOverlap));
								this.plugin.settings.vectorSettings.chunkOverlap = maxOverlap;
							} else {
								this.plugin.settings.vectorSettings.chunkOverlap = num;
							}
							
							await this.plugin.saveSettings();
						}
					});
				text.inputEl.type = 'number';
				text.inputEl.min = String(CHUNK_OVERLAP_MIN);
				text.inputEl.max = String(CHUNK_OVERLAP_MAX);
			});
		chunkOverlapSetting.settingEl.style.paddingLeft = '24px';
		chunkOverlapSetting.settingEl.style.fontSize = '0.95em';
	}

	/**
	 * Render search results count setting
	 */
	private renderSearchResultsSetting(vectorContainer: HTMLElement): void {
		new Setting(vectorContainer)
			.setName(this.i18n.t('settingsPage.vectorDatabase.searchResults'))
			.setDesc(this.i18n.t('settingsPage.vectorDatabase.searchResultsDesc'))
			.addText(text => {
				text.setPlaceholder('5')
					.setValue(String(this.plugin.settings.vectorSettings.topK))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.plugin.settings.vectorSettings.topK = num;
							await this.plugin.saveSettings();
						}
					});
				text.inputEl.type = 'number';
			});
	}

	/**
	 * Render suggest related files setting
	 */
	private renderSuggestRelatedFilesSetting(vectorContainer: HTMLElement): void {
		new Setting(vectorContainer)
			.setName(this.i18n.t('settingsPage.vectorDatabase.suggestRelatedFiles'))
			.setDesc(this.i18n.t('settingsPage.vectorDatabase.suggestRelatedFilesDesc'))
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.vectorSettings.suggestRelatedFiles)
					.onChange(async (value) => {
						this.plugin.settings.vectorSettings.suggestRelatedFiles = value;
						await this.plugin.saveSettings();
						// Note: Parent will handle re-render
					});
			});

		// Suggestion Timeout (conditional)
		if (this.plugin.settings.vectorSettings.suggestRelatedFiles) {
			new Setting(vectorContainer)
				.setName(this.i18n.t('settingsPage.vectorDatabase.suggestionTimeout'))
				.setDesc(this.i18n.t('settingsPage.vectorDatabase.suggestionTimeoutDesc'))
				.addText(text => {
					text.setPlaceholder('5000')
						.setValue(String(this.plugin.settings.vectorSettings.suggestionTimeout))
						.onChange(async (value) => {
							const num = parseInt(value);
							if (!isNaN(num) && num > 0) {
								this.plugin.settings.vectorSettings.suggestionTimeout = num;
								await this.plugin.saveSettings();
							}
						});
					text.inputEl.type = 'number';
				});
		}
	}
}
