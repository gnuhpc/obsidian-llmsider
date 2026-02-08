import { App, Modal, Notice, TextComponent, DropdownComponent, SliderComponent, ToggleComponent, requestUrl } from 'obsidian';
import { Logger } from './../utils/logger';
import { LLMConnection, LLMModel } from '../types';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';
import { ProviderFactory } from '../utils/provider-factory';

/**
 * Modal for adding or editing a Model
 * Features:
 * - Fetches available models from the provider API
 * - Allows selection from dropdown or manual entry
 * - Configures model parameters (tokens, temperature, etc.)
 */
export class ModelModal extends Modal {
	private connection: LLMConnection;
	private existingModel?: LLMModel;
	private onSave: (model: LLMModel) => Promise<void>;
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;

	// Form fields (initialized in onOpen)
	private nameInput!: TextComponent;
	private modelNameDropdown?: DropdownComponent;
	private modelNameInput?: TextComponent;
	private maxTokensSlider!: SliderComponent;
	private maxTokensValue!: HTMLSpanElement;
	private temperatureSlider!: SliderComponent;
	private temperatureValue!: HTMLSpanElement;
	private isEmbeddingToggle!: ToggleComponent;
	private supportsVisionToggle!: ToggleComponent;
	private isDefaultToggle!: ToggleComponent;
	private availableModels: string[] = [];
	private allModels: string[] = [];
	private freeModelsCache: string[] = [];
	private tempProvider: any = null; // 缓存临时 provider 实例
	private selectedModelOutputModalities?: string[]; // Store output modalities for image generation models

	constructor(
		app: App,
		plugin: LLMSiderPlugin,
		connection: LLMConnection,
		onSave: (model: LLMModel) => Promise<void>,
		existingModel?: LLMModel
	) {
		super(app);
		this.plugin = plugin;
		this.connection = connection;
		this.existingModel = existingModel;
		this.onSave = onSave;
		this.i18n = plugin.getI18nManager()!;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Modal title
		contentEl.createEl('h2', { 
			text: this.existingModel 
				? this.i18n.t('settingsPage.editModel', { connectionName: this.connection.name })
				: this.i18n.t('settingsPage.addModelToConnection', { connectionName: this.connection.name })
		});

		// Form container
		const formContainer = contentEl.createDiv({ cls: 'llmsider-model-form' });

		// Model selection section - first field, will be populated after API call
		const modelGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		modelGroup.createEl('label', { text: this.i18n.t('settingsPage.modelNameLabel'), cls: 'llmsider-form-label' });
		
		// Show loading indicator
		const loadingIndicator = modelGroup.createEl('p', { 
			text: this.i18n.t('settingsPage.loadingModels'), 
			cls: 'llmsider-loading-text' 
		});

		// Display Name field - second field, show immediately
		const nameGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		nameGroup.createEl('label', { text: this.i18n.t('settingsPage.displayNameLabel'), cls: 'llmsider-form-label' });
		this.nameInput = new TextComponent(nameGroup);
		this.nameInput.setPlaceholder(this.i18n.t('settingsPage.displayNamePlaceholder'));
		this.nameInput.inputEl.style.width = '100%';
		this.nameInput.inputEl.style.boxSizing = 'border-box';
		if (this.existingModel) {
			this.nameInput.setValue(this.existingModel.name);
		}

		// Create temporary provider instance for getting capabilities
		if (this.connection.type === 'free-qwen') {
			try {
				const tempModel: LLMModel = {
					id: 'temp-' + Date.now(),
					connectionId: this.connection.id,
					name: 'temp',
					modelName: 'temp',
					maxTokens: 4000,
					temperature: 0.7,
					isDefault: false,
					isEmbedding: false
				};
				this.tempProvider = ProviderFactory.createProvider(this.connection, tempModel, this.plugin.getToolManager());
			} catch (error) {
				Logger.debug('[ModelModal] Failed to create temp provider:', error);
			}
		}

		// Fetch available models from API in background
		this.plugin.fetchAvailableModelsForConnection(this.connection.id)
			.then((models) => {
				this.availableModels = models;
				this.allModels = models;
				// Remove loading indicator
				loadingIndicator.remove();
				// Render model selection UI
				this.renderModelSelection(modelGroup, formContainer);
			})
			.catch((error) => {
				Logger.error('Failed to load models:', error);
				this.availableModels = [];
				// Remove loading indicator
				loadingIndicator.remove();
				// Render manual input
				this.renderModelSelection(modelGroup, formContainer);
			});

		// Continue rendering the rest of the form immediately
		this.renderFormControls(formContainer);
	}

	private renderModelSelection(modelGroup: HTMLElement, formContainer: HTMLElement): void {
		if (this.availableModels.length > 0) {
			// Check if connection is OpenRouter
			const isOpenRouter = this.connection.baseUrl?.includes('openrouter.ai');
			let freeModelsToggle: ToggleComponent | null = null;

			if (isOpenRouter) {
				const filterContainer = modelGroup.createDiv({ cls: 'llmsider-model-filter-container' });
				filterContainer.style.marginBottom = '8px';
				filterContainer.style.display = 'flex';
				filterContainer.style.alignItems = 'center';
				filterContainer.style.gap = '8px';

				freeModelsToggle = new ToggleComponent(filterContainer)
					.setValue(false);
				
				filterContainer.createSpan({ text: 'Show Free Models Only' });
			}

			// Create a searchable model selector
			const searchContainer = modelGroup.createDiv({ cls: 'llmsider-model-search-container' });
			searchContainer.style.position = 'relative';
			searchContainer.style.width = '100%';

			// Search input
			const searchInput = searchContainer.createEl('input', {
				type: 'text',
				placeholder: this.i18n.t('settingsPage.searchOrSelectModel'),
				cls: 'llmsider-model-search-input'
			});
			searchInput.style.width = '100%';
			searchInput.style.boxSizing = 'border-box';
			searchInput.style.padding = '8px';
			searchInput.style.border = '1px solid var(--background-modifier-border)';
			searchInput.style.borderRadius = '4px';
			searchInput.style.backgroundColor = 'var(--background-primary)';
			searchInput.style.color = 'var(--text-normal)';

			// Dropdown list for filtered results
			const dropdownList = searchContainer.createDiv({ cls: 'llmsider-model-dropdown-list' });
			dropdownList.style.position = 'absolute';
			dropdownList.style.top = '100%';
			dropdownList.style.left = '0';
			dropdownList.style.right = '0';
			dropdownList.style.maxHeight = '300px';
			dropdownList.style.overflowY = 'auto';
			dropdownList.style.border = '1px solid var(--background-modifier-border)';
			dropdownList.style.borderRadius = '4px';
			dropdownList.style.backgroundColor = 'var(--background-primary)';
			dropdownList.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
			dropdownList.style.zIndex = '1000';
			dropdownList.style.display = 'none';
			dropdownList.style.marginTop = '4px';

			let selectedModel = '';
			let filteredModels = [...this.availableModels];

			// Function to render filtered models
			const renderFilteredModels = (filter: string) => {
				dropdownList.empty();
				
				// Filter models based on search input
				filteredModels = this.availableModels.filter(model => 
					model.toLowerCase().includes(filter.toLowerCase())
				);

				if (filteredModels.length === 0) {
					const noResults = dropdownList.createDiv({ cls: 'llmsider-model-dropdown-item' });
					noResults.textContent = this.i18n.t('settingsPage.noModelsFound');
					noResults.style.padding = '8px 12px';
					noResults.style.color = 'var(--text-muted)';
					noResults.style.fontStyle = 'italic';
					return;
				}

				// Add "Custom" option if there's a search filter
				if (filter.trim()) {
					const customItem = dropdownList.createDiv({ cls: 'llmsider-model-dropdown-item' });
					customItem.textContent = `✏️ ${this.i18n.t('settingsPage.useCustomModel')}: "${filter}"`;
					customItem.style.padding = '8px 12px';
					customItem.style.cursor = 'pointer';
					customItem.style.borderBottom = '1px solid var(--background-modifier-border)';
					customItem.style.fontWeight = 'bold';
					customItem.style.backgroundColor = 'var(--background-secondary)';
					
					customItem.addEventListener('click', () => {
						selectedModel = filter;
						searchInput.value = filter;
						dropdownList.style.display = 'none';
						// Auto-fill display name
						if (!this.nameInput.getValue().trim()) {
							this.nameInput.setValue(filter);
						}
						// Fetch model details
						this.fetchAndDisplayModelDetails(filter, modelGroup);
					});

					customItem.addEventListener('mouseenter', () => {
						customItem.style.backgroundColor = 'var(--background-modifier-hover)';
					});
					customItem.addEventListener('mouseleave', () => {
						customItem.style.backgroundColor = 'var(--background-secondary)';
					});
				}

				// Render filtered model items
				filteredModels.forEach(model => {
					const item = dropdownList.createDiv({ cls: 'llmsider-model-dropdown-item' });
					item.style.padding = '8px 12px';
					item.style.cursor = 'pointer';
					item.style.borderBottom = '1px solid var(--background-modifier-border)';
					item.style.display = 'flex';
					item.style.alignItems = 'center';
					item.style.gap = '8px';
					item.style.flexWrap = 'wrap';

					// Model name
					const modelName = item.createSpan();
					modelName.textContent = model;
					modelName.style.fontWeight = '500';
					modelName.style.flexShrink = '0';

					// Get capabilities for free-qwen models
					if (this.connection.type === 'free-qwen' && this.tempProvider) {
						try {
							if (typeof this.tempProvider.getModelCapabilities === 'function') {
								const capabilities = this.tempProvider.getModelCapabilities(model);
								Logger.debug('[ModelModal] Capabilities for', model, ':', capabilities);
								
								if (capabilities && capabilities.length > 0) {
									const capsuleContainer = item.createSpan();
									capsuleContainer.style.display = 'flex';
									capsuleContainer.style.gap = '4px';
									capsuleContainer.style.flexWrap = 'wrap';
									capsuleContainer.style.alignItems = 'center';
									
									capabilities
										.filter((cap: any) => cap.enable)
										.forEach((cap: any) => {
											const badge = capsuleContainer.createSpan();
											badge.textContent = cap.code;
											badge.style.fontSize = '0.7em';
											badge.style.padding = '2px 5px';
											badge.style.borderRadius = '3px';
											badge.style.backgroundColor = 'var(--interactive-accent)';
											badge.style.color = 'var(--text-on-accent)';
											badge.style.fontWeight = '500';
											badge.style.whiteSpace = 'nowrap';
										});
								}
							}
						} catch (error) {
							Logger.debug('[ModelModal] Failed to get capabilities for model:', model, error);
						}
					}

					item.addEventListener('click', () => {
						selectedModel = model;
						searchInput.value = model;
						dropdownList.style.display = 'none';
						// Auto-fill display name
						if (!this.nameInput.getValue().trim()) {
							this.nameInput.setValue(model);
						}
						// Fetch model details
						this.fetchAndDisplayModelDetails(model, modelGroup);
					});

					item.addEventListener('mouseenter', () => {
						item.style.backgroundColor = 'var(--background-modifier-hover)';
					});
					item.addEventListener('mouseleave', () => {
						item.style.backgroundColor = 'var(--background-primary)';
					});
				});
			};

			// Attach listener for free models toggle
			if (freeModelsToggle) {
				freeModelsToggle.onChange(async (value) => {
					if (value) {
						// Show free models only
						if (this.freeModelsCache.length === 0) {
							try {
								const response = await requestUrl({
									url: 'https://openrouter.ai/api/frontend/models/find?max_price=0',
									method: 'GET'
								});
								if (response.status === 200) {
									const data = response.json;
									if (data.data && data.data.models) {
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										this.freeModelsCache = data.data.models.map((m: any) => m.slug);
									}
								}
							} catch (error) {
								Logger.error('Failed to fetch free models from OpenRouter:', error);
								new Notice(this.i18n.t('ui.failedToFetchFreeModels'));
							}
						}
						
						if (this.freeModelsCache.length > 0) {
							this.availableModels = this.freeModelsCache;
						}
					} else {
						// Show all models
						this.availableModels = this.allModels;
					}
					
					// Trigger search update
					renderFilteredModels(searchInput.value);
				});
			}

			// Search input event listeners
			searchInput.addEventListener('focus', () => {
				dropdownList.style.display = 'block';
				renderFilteredModels(searchInput.value);
			});

			searchInput.addEventListener('input', () => {
				dropdownList.style.display = 'block';
				renderFilteredModels(searchInput.value);
			});

			// Close dropdown when clicking outside
			document.addEventListener('click', (e) => {
				if (!searchContainer.contains(e.target as Node)) {
					dropdownList.style.display = 'none';
				}
			});

			// Handle keyboard navigation
			searchInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' && searchInput.value.trim()) {
					selectedModel = searchInput.value.trim();
					dropdownList.style.display = 'none';
					// Auto-fill display name
					if (!this.nameInput.getValue().trim()) {
						this.nameInput.setValue(selectedModel);
					}
					// Fetch model details
					this.fetchAndDisplayModelDetails(selectedModel, modelGroup);
					e.preventDefault();
				} else if (e.key === 'Escape') {
					dropdownList.style.display = 'none';
					e.preventDefault();
				}
			});

			// Set initial value if editing existing model
			if (this.existingModel) {
				searchInput.value = this.existingModel.modelName;
				selectedModel = this.existingModel.modelName;
			}

			// Store the selected model value getter
			this.modelNameDropdown = {
				getValue: () => selectedModel || searchInput.value.trim() || '__custom__',
				setValue: (value: string) => {
					searchInput.value = value;
					selectedModel = value;
				}
			} as any;
			
			// Add hint for users about search
			const hintText = modelGroup.createEl('p', {
				text: this.i18n.t('settingsPage.searchModelHint'),
				cls: 'llmsider-hint-text'
			});
			hintText.style.fontSize = '0.9em';
			hintText.style.color = 'var(--text-muted)';
			hintText.style.marginTop = '8px';
			
			// No need for custom input field anymore since search box handles everything
			// Users can type any model name directly in the search box

			// Auto-fill display name when typing in search box
			searchInput.addEventListener('blur', () => {
				const modelValue = searchInput.value.trim();
				if (modelValue && !this.nameInput.getValue().trim()) {
					this.nameInput.setValue(modelValue);
				}
			});
		} else {
			// No models available, show manual input
			const noModelsNote = modelGroup.createEl('p', { 
				text: this.i18n.t('settingsPage.noModelsAvailable'), 
				cls: 'llmsider-note-text' 
			});
			
			this.modelNameInput = new TextComponent(modelGroup);
			this.modelNameInput.setPlaceholder(this.i18n.t('settingsPage.modelNamePlaceholder'));
			this.modelNameInput.inputEl.style.width = '100%';
			this.modelNameInput.inputEl.style.boxSizing = 'border-box';
			if (this.existingModel) {
				this.modelNameInput.setValue(this.existingModel.modelName);
			}

			// Auto-fill display name when user types model name
			this.modelNameInput.inputEl.addEventListener('input', () => {
				const modelValue = this.modelNameInput?.getValue().trim();
				if (modelValue && !this.nameInput.getValue().trim()) {
					this.nameInput.setValue(modelValue);
				}
			});
		}
	}

	/**
	 * Fetch and display model details for Qwen models
	 */
	private async fetchAndDisplayModelDetails(modelName: string, container: HTMLElement): Promise<void> {
		// Only fetch details for Qwen providers (both regular and free) and OpenRouter
		if (this.connection.type !== 'qwen' && this.connection.type !== 'free-qwen' && this.connection.type !== 'openrouter') {
			return;
		}

		// Remove existing details box if any
		const existingDetails = container.querySelector('.llmsider-model-details-box');
		if (existingDetails) {
			existingDetails.remove();
		}

		// Create loading indicator
		const detailsBox = container.createDiv({ cls: 'llmsider-model-details-box' });
		detailsBox.style.padding = '12px';
		detailsBox.style.backgroundColor = 'var(--background-secondary)';
		detailsBox.style.borderRadius = '4px';
		detailsBox.style.marginTop = '8px';
		detailsBox.style.fontSize = '0.9em';

		const loadingText = detailsBox.createEl('p', {
			text: '⏳ ' + this.i18n.t('settingsPage.loadingModelDetails'),
			cls: 'llmsider-loading-text'
		});
		loadingText.style.color = 'var(--text-muted)';

		try {
			// Create a temporary model config to instantiate the provider
			const tempModel: LLMModel = {
				id: 'temp-' + Date.now(),
				connectionId: this.connection.id,
				name: modelName,
				modelName: modelName,
				maxTokens: 4000,
				temperature: 0.7,
				isDefault: false,
				isEmbedding: false
			};

			// Get the provider instance using ProviderFactory
			const provider = ProviderFactory.createProvider(
				this.connection, 
				tempModel, 
				this.plugin.getToolManager()
			);
			
			if (!provider || typeof (provider as any).getModelDetails !== 'function') {
				detailsBox.remove();
				return;
			}

			// Fetch model details
			const details = await (provider as any).getModelDetails(modelName);
			
			// Remove loading indicator
			loadingText.remove();

			if (details) {
				// Auto-fill max tokens if context_length is available (OpenRouter)
				if (details.context_length) {
					const contextLength = parseInt(details.context_length);
					if (!isNaN(contextLength)) {
						// Ensure it's within slider limits or update limits if needed
						if (contextLength > 150000) {
							this.maxTokensSlider.setLimits(100, contextLength, 100);
						}
						this.maxTokensSlider.setValue(contextLength);
						this.maxTokensValue.textContent = contextLength.toString();
					}
				} else if (details.input_max_length) {
					// For Qwen models
					const contextLength = parseInt(details.input_max_length);
					if (!isNaN(contextLength)) {
						if (contextLength > 150000) {
							this.maxTokensSlider.setLimits(100, contextLength, 100);
						}
						this.maxTokensSlider.setValue(contextLength);
						this.maxTokensValue.textContent = contextLength.toString();
					}
				}

				// Display model details
				const title = detailsBox.createEl('p', {
					text: '📋 ' + this.i18n.t('settingsPage.modelDetails'),
					cls: 'llmsider-info-title'
				});
				title.style.fontWeight = 'bold';
				title.style.marginBottom = '8px';

				// Create details content
				const detailsContent = detailsBox.createDiv({ cls: 'llmsider-model-details-content' });
				detailsContent.style.color = 'var(--text-muted)';
				detailsContent.style.lineHeight = '1.6';

				// Display key information
				// DashScope API returns: name, organization, description, create_time, update_time
				const infoItems: string[] = [];
				
				if (details.name) {
					infoItems.push(`• ${this.i18n.t('settingsPage.modelName')}: ${details.name}`);
				}
				if (details.organization) {
					infoItems.push(`• ${this.i18n.t('settingsPage.organization')}: ${details.organization}`);
				}
				if (details.description) {
					infoItems.push(`• ${this.i18n.t('settingsPage.description')}: ${details.description}`);
				}
				if (details.create_time) {
					const createDate = new Date(details.create_time).toLocaleString();
					infoItems.push(`• ${this.i18n.t('settingsPage.createTime')}: ${createDate}`);
				}
				if (details.update_time) {
					const updateDate = new Date(details.update_time).toLocaleString();
					infoItems.push(`• ${this.i18n.t('settingsPage.updateTime')}: ${updateDate}`);
				}
				
				// Also check for extended fields (if available from detail endpoint)
				if (details.model_type) {
					infoItems.push(`• ${this.i18n.t('settingsPage.modelType')}: ${details.model_type}`);
				}
				if (details.task_type) {
					infoItems.push(`• ${this.i18n.t('settingsPage.taskType')}: ${details.task_type}`);
				}
				if (details.supported_languages) {
					const langs = Array.isArray(details.supported_languages) 
						? details.supported_languages.join(', ') 
						: details.supported_languages;
					infoItems.push(`• ${this.i18n.t('settingsPage.supportedLanguages')}: ${langs}`);
				}
				if (details.context_length) {
					infoItems.push(`• ${this.i18n.t('settingsPage.contextLength')}: ${details.context_length}`);
				}
				if (details.pricing) {
					const prompt = details.pricing.prompt || '0';
					const completion = details.pricing.completion || '0';
					infoItems.push(`• ${this.i18n.t('settingsPage.pricing')}: $${prompt}/1M prompt, $${completion}/1M completion`);
				}
				if (details.input_max_length) {
					infoItems.push(`• ${this.i18n.t('settingsPage.maxInputLength')}: ${details.input_max_length}`);
				}
				if (details.output_max_length) {
					infoItems.push(`• ${this.i18n.t('settingsPage.maxOutputLength')}: ${details.output_max_length}`);
				}
				if (details.supports_vision !== undefined) {
					infoItems.push(`• ${this.i18n.t('settingsPage.supportsVision')}: ${details.supports_vision ? this.i18n.t('settingsPage.yes') : this.i18n.t('settingsPage.no')}`);
				}
				if (details.supports_function_call !== undefined) {
					infoItems.push(`• ${this.i18n.t('settingsPage.supportsFunctionCall')}: ${details.supports_function_call ? this.i18n.t('settingsPage.yes') : this.i18n.t('settingsPage.no')}`);
				}
				if (details.output_modalities) {
					const modalities = Array.isArray(details.output_modalities)
						? details.output_modalities.join(', ')
						: details.output_modalities;
					infoItems.push(`• ${this.i18n.t('settingsPage.outputModalities')}: ${modalities}`);
					
					// Store output_modalities for later use
					this.selectedModelOutputModalities = details.output_modalities;
					
					// Show image generation capability notice
					if (details.output_modalities.includes('image')) {
						const imageGenNotice = detailsBox.createDiv({ cls: 'llmsider-image-gen-notice' });
						imageGenNotice.style.marginTop = '12px';
						imageGenNotice.style.padding = '8px 12px';
						imageGenNotice.style.backgroundColor = 'var(--interactive-accent-hover)';
						imageGenNotice.style.borderRadius = '4px';
						imageGenNotice.style.fontSize = '0.9em';
						imageGenNotice.textContent = '🎨 ' + this.i18n.t('settingsPage.imageGenerationSupported');
					}
				}

				if (infoItems.length > 0) {
					detailsContent.createEl('div', { text: infoItems.join('\n') });
				} else {
					// Show raw JSON if no structured data
					const pre = detailsContent.createEl('pre');
					pre.style.fontSize = '0.85em';
					pre.style.overflow = 'auto';
					pre.textContent = JSON.stringify(details, null, 2);
				}
			} else {
				// No details available
				detailsBox.createEl('p', {
					text: 'ℹ️ ' + this.i18n.t('settingsPage.noDetailsAvailable'),
					cls: 'llmsider-note-text'
				}).style.color = 'var(--text-muted)';
			}
		} catch (error) {
			Logger.error('Failed to fetch model details:', error);
			loadingText.remove();
			detailsBox.createEl('p', {
				text: '⚠️ ' + this.i18n.t('settingsPage.failedToLoadDetails'),
				cls: 'llmsider-error-text'
			}).style.color = 'var(--text-error)';
		}
	}

	private embeddingDimensionInput?: TextComponent;

	private renderFormControls(formContainer: HTMLElement): void {
		// Is Embedding Model toggle (moved here, right after display name)
		const embeddingGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		const embeddingRow = embeddingGroup.createDiv({ cls: 'llmsider-slider-row' });
		const embeddingLabel = embeddingRow.createEl('label', {
			text: this.i18n.t('settingsPage.embeddingModelLabel'),
			cls: 'llmsider-form-label'
		});
		// Add tooltip to label
		embeddingLabel.setAttribute('title', this.i18n.t('settingsPage.embeddingModelTooltip'));
		embeddingLabel.style.cursor = 'help';

		this.isEmbeddingToggle = new ToggleComponent(embeddingRow);
		this.isEmbeddingToggle.setValue(this.existingModel?.isEmbedding || false);

		const embeddingHint = embeddingGroup.createEl('p', {
			text: this.i18n.t('settingsPage.embeddingModelWarning'),
			cls: 'llmsider-hint-text'
		});
		embeddingHint.style.fontSize = '0.85em';
		embeddingHint.style.color = 'var(--text-warning)';
		embeddingHint.style.marginTop = '4px';

		// Embedding Dimension input (only shown if isEmbedding is true)
		const embeddingDimensionGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		embeddingDimensionGroup.createEl('label', { 
			text: this.i18n.t('settingsPage.embeddingDimensionLabel'), 
			cls: 'llmsider-form-label' 
		});
		embeddingDimensionGroup.createEl('p', {
			text: this.i18n.t('settingsPage.embeddingDimensionDesc'),
			cls: 'llmsider-hint-text'
		}).style.fontSize = '0.85em';
		this.embeddingDimensionInput = new TextComponent(embeddingDimensionGroup);
		this.embeddingDimensionInput.setPlaceholder(this.i18n.t('settingsPage.embeddingDimensionPlaceholder'));
		this.embeddingDimensionInput.inputEl.style.width = '100%';
		this.embeddingDimensionInput.inputEl.style.boxSizing = 'border-box';
		this.embeddingDimensionInput.inputEl.type = 'number';
		this.embeddingDimensionInput.inputEl.min = '1';
		this.embeddingDimensionInput.inputEl.step = '1';
		if (this.existingModel?.embeddingDimension) {
			this.embeddingDimensionInput.setValue(this.existingModel.embeddingDimension.toString());
		}

		// Max Tokens slider (hidden when isEmbedding is true)
		const tokensGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		tokensGroup.createEl('label', { text: this.i18n.t('settingsPage.maxTokensLabel'), cls: 'llmsider-form-label' });
		const tokensRow = tokensGroup.createDiv({ cls: 'llmsider-slider-row' });
		this.maxTokensSlider = new SliderComponent(tokensRow);
		this.maxTokensSlider.setLimits(100, 150000, 100);
		this.maxTokensSlider.setValue(this.existingModel?.maxTokens || 4096);
		this.maxTokensValue = tokensRow.createEl('span', { 
			text: (this.existingModel?.maxTokens || 4096).toString(), 
			cls: 'llmsider-slider-value' 
		});
		this.maxTokensSlider.onChange((value) => {
			this.maxTokensValue.textContent = value.toString();
		});

		// Temperature slider (hidden when isEmbedding is true)
		const tempGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		tempGroup.createEl('label', { text: this.i18n.t('settingsPage.temperatureLabel'), cls: 'llmsider-form-label' });
		const tempRow = tempGroup.createDiv({ cls: 'llmsider-slider-row' });
		this.temperatureSlider = new SliderComponent(tempRow);
		this.temperatureSlider.setLimits(0, 2, 0.1);
		this.temperatureSlider.setValue(this.existingModel?.temperature || 0.7);
		this.temperatureValue = tempRow.createEl('span', { 
			text: (this.existingModel?.temperature || 0.7).toFixed(1), 
			cls: 'llmsider-slider-value' 
		});
		this.temperatureSlider.onChange((value) => {
			this.temperatureValue.textContent = value.toFixed(1);
		});

		// Supports Vision toggle
		const visionGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		const visionRow = visionGroup.createDiv({ cls: 'llmsider-slider-row' });
		const visionLabel = visionRow.createEl('label', { 
			text: this.i18n.t('settingsPage.supportsVision'), 
			cls: 'llmsider-form-label' 
		});
		// Add tooltip to label
		visionLabel.setAttribute('title', this.i18n.t('settingsPage.supportsVisionTooltip') || 'Enable this if the model supports image understanding (vision)');
		visionLabel.style.cursor = 'help';

		this.supportsVisionToggle = new ToggleComponent(visionRow);
		this.supportsVisionToggle.setValue(this.existingModel?.supportsVision || false);

		// Toggle visibility based on isEmbedding state
		const updateFieldVisibility = () => {
			const isEmbedding = this.isEmbeddingToggle.getValue();
			embeddingDimensionGroup.style.display = isEmbedding ? 'block' : 'none';
			tokensGroup.style.display = isEmbedding ? 'none' : 'block';
			tempGroup.style.display = isEmbedding ? 'none' : 'block';
			visionGroup.style.display = isEmbedding ? 'none' : 'block';
		};

		// Set initial visibility
		updateFieldVisibility();

		// Update visibility when toggle changes
		this.isEmbeddingToggle.onChange(() => {
			updateFieldVisibility();
		});

		// Set as Default toggle
		const defaultGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		const defaultRow = defaultGroup.createDiv({ cls: 'llmsider-slider-row' });
		defaultRow.createEl('label', { text: this.i18n.t('settingsPage.setAsDefaultLabel'), cls: 'llmsider-form-label' });
		this.isDefaultToggle = new ToggleComponent(defaultRow);
		this.isDefaultToggle.setValue(this.existingModel?.isDefault || false);

		// Buttons
		const buttonGroup = formContainer.createDiv({ cls: 'llmsider-modal-buttons' });
		buttonGroup.style.marginTop = '20px';

		const cancelButton = buttonGroup.createEl('button', { text: this.i18n.t('cancel') });
		cancelButton.onclick = () => this.close();

		const saveButton = buttonGroup.createEl('button', { text: this.i18n.t('save'), cls: 'mod-cta' });
		saveButton.onclick = () => this.handleSave();
	}

	private async handleSave() {
		try {
			// Get model name from dropdown or custom input
			let modelName: string;
			if (this.modelNameDropdown && this.modelNameDropdown.getValue() !== '__custom__') {
				modelName = this.modelNameDropdown.getValue();
			} else if (this.modelNameInput) {
				modelName = this.modelNameInput.getValue().trim();
			} else {
				new Notice(this.i18n.t('settingsPage.modelNameRequired'));
				return;
			}

			const name = this.nameInput.getValue().trim();
			
			if (!name) {
				new Notice(this.i18n.t('settingsPage.displayNameRequired'));
				this.nameInput.inputEl.focus();
				return;
			}

			if (!modelName) {
				new Notice(this.i18n.t('settingsPage.modelNameRequiredInput'));
				if (this.modelNameInput) {
					this.modelNameInput.inputEl.focus();
				}
				return;
			}

			const isEmbedding = this.isEmbeddingToggle.getValue();
			let embeddingDimension: number | undefined = undefined;

			// Validate embedding dimension if this is an embedding model
			if (isEmbedding) {
				const dimensionStr = this.embeddingDimensionInput?.getValue().trim();
				if (!dimensionStr) {
					new Notice(this.i18n.t('settingsPage.embeddingDimensionRequired'));
					this.embeddingDimensionInput?.inputEl.focus();
					return;
				}
				embeddingDimension = parseInt(dimensionStr, 10);
				if (isNaN(embeddingDimension) || embeddingDimension <= 0) {
					new Notice(this.i18n.t('settingsPage.embeddingDimensionInvalid'));
					this.embeddingDimensionInput?.inputEl.focus();
					return;
				}
			}

			const model: LLMModel = {
				id: this.existingModel?.id || `model-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				name,
				connectionId: this.connection.id,
				modelName,
				maxTokens: this.maxTokensSlider.getValue(),
				temperature: this.temperatureSlider.getValue(),
				enabled: this.existingModel?.enabled ?? true,
				isEmbedding,
				embeddingDimension,
				supportsVision: this.supportsVisionToggle.getValue(),
				outputModalities: this.selectedModelOutputModalities, // Store image generation capability
				isDefault: this.isDefaultToggle.getValue(),
				created: this.existingModel?.created || Date.now(),
				updated: Date.now()
			};

		Logger.debug('[ModelModal] Saving model:', {
			id: model.id,
			name: model.name,
			modelName: model.modelName,
			connectionId: model.connectionId,
			enabled: model.enabled,
			isNew: !this.existingModel,
			connectionType: this.connection.type,
			isEmbedding: model.isEmbedding,
			embeddingDimension: model.embeddingDimension
		});

		await this.onSave(model);			new Notice(this.i18n.t('settingsPage.modelSavedSuccess', { name }));
			this.close();
		} catch (error) {
			Logger.error('Error saving model:', error);
			new Notice(this.i18n.t('settingsPage.modelSaveFailed'));
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
