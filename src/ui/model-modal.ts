import { App, Modal, Notice, TextComponent, DropdownComponent, SliderComponent, ToggleComponent } from 'obsidian';
import { Logger } from './../utils/logger';
import { LLMConnection, LLMModel } from '../types';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';

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
	private isDefaultToggle!: ToggleComponent;
	private availableModels: string[] = [];

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

		// Fetch available models from API in background
		this.plugin.fetchAvailableModelsForConnection(this.connection.id)
			.then((models) => {
				this.availableModels = models;
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
			// Show dropdown if models are available
			this.modelNameDropdown = new DropdownComponent(modelGroup);
			
			// Add "Custom" option
			this.modelNameDropdown.addOption('__custom__', this.i18n.t('settingsPage.customModelOption'));
			
			// Add available models
			this.availableModels.forEach(model => {
				this.modelNameDropdown!.addOption(model, model);
			});

			this.modelNameDropdown.selectEl.style.width = '100%';
			this.modelNameDropdown.selectEl.style.boxSizing = 'border-box';
			
			// Add hint for users about custom input
			const hintText = modelGroup.createEl('p', {
				text: this.i18n.t('settingsPage.selectModelHint'),
				cls: 'llmsider-hint-text'
			});
			hintText.style.fontSize = '0.9em';
			hintText.style.color = 'var(--text-muted)';
			hintText.style.marginTop = '4px';
			
			if (this.existingModel && this.availableModels.includes(this.existingModel.modelName)) {
				this.modelNameDropdown.setValue(this.existingModel.modelName);
			} else {
				this.modelNameDropdown.setValue('__custom__');
			}

			// Find the Display Name group (it's the next sibling of modelGroup)
			const nameGroup = modelGroup.nextElementSibling as HTMLElement;

			// Custom input field (hidden by default) - insert after model dropdown but before display name
			const customInputGroup = document.createElement('div');
			customInputGroup.className = 'llmsider-form-group';
			customInputGroup.style.display = this.modelNameDropdown.getValue() === '__custom__' ? 'block' : 'none';
			
			const customLabel = customInputGroup.createEl('label', { 
				text: this.i18n.t('settingsPage.customModelName'), 
				cls: 'llmsider-form-label' 
			});
			
			this.modelNameInput = new TextComponent(customInputGroup);
			this.modelNameInput.setPlaceholder(this.i18n.t('settingsPage.modelNamePlaceholder'));
			this.modelNameInput.inputEl.style.width = '100%';
			this.modelNameInput.inputEl.style.boxSizing = 'border-box';
			if (this.existingModel) {
				this.modelNameInput.setValue(this.existingModel.modelName);
			}

			// Insert custom input group after model group
			modelGroup.parentElement?.insertBefore(customInputGroup, nameGroup);

			// Toggle custom input visibility and auto-fill display name
			this.modelNameDropdown.onChange((value) => {
				if (value === '__custom__') {
					customInputGroup.style.display = 'block';
				} else {
					customInputGroup.style.display = 'none';
					// Auto-fill display name if empty
					if (!this.nameInput.getValue().trim() && value !== '__custom__') {
						this.nameInput.setValue(value);
					}
				}
			});

			// Auto-fill custom model name input
			if (this.modelNameInput) {
				this.modelNameInput.inputEl.addEventListener('input', () => {
					const customValue = this.modelNameInput?.getValue().trim();
					if (customValue && !this.nameInput.getValue().trim()) {
						this.nameInput.setValue(customValue);
					}
				});
			}
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

	private embeddingDimensionInput?: TextComponent;

	private renderFormControls(formContainer: HTMLElement): void {
		// For Hugging Face connections, show info about local execution
		const isHuggingFace = this.connection.type === 'huggingface';

		if (isHuggingFace) {
			// Show info box for Hugging Face
			const infoGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
			const infoBox = infoGroup.createDiv({ cls: 'llmsider-info-box' });
			infoBox.style.padding = '12px';
			infoBox.style.backgroundColor = 'var(--background-secondary)';
			infoBox.style.borderRadius = '4px';
			infoBox.style.marginTop = '8px';

			infoBox.createEl('p', {
				text: '🤗 Hugging Face Model',
				cls: 'llmsider-info-title'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: 'This model will run locally in your browser. Enter a Hugging Face model ID (e.g., Xenova/all-MiniLM-L6-v2 for embeddings).',
				cls: 'llmsider-form-note'
			});
		}

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

		// For HuggingFace connections, force isEmbedding to true and disable toggle
		if (isHuggingFace) {
			this.isEmbeddingToggle.setValue(true);
			this.isEmbeddingToggle.setDisabled(true);
		} else {
			this.isEmbeddingToggle.setValue(this.existingModel?.isEmbedding || false);
		}

		const embeddingHint = embeddingGroup.createEl('p', {
			text: isHuggingFace
				? 'HuggingFace connections only support embedding models'
				: this.i18n.t('settingsPage.embeddingModelWarning'),
			cls: 'llmsider-hint-text'
		});
		embeddingHint.style.fontSize = '0.85em';
		embeddingHint.style.color = isHuggingFace ? 'var(--text-accent)' : 'var(--text-warning)';
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

		// Toggle visibility based on isEmbedding state
		const updateFieldVisibility = () => {
			const isEmbedding = this.isEmbeddingToggle.getValue();
			embeddingDimensionGroup.style.display = isEmbedding ? 'block' : 'none';
			tokensGroup.style.display = isEmbedding ? 'none' : 'block';
			tempGroup.style.display = isEmbedding ? 'none' : 'block';
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

			// For HuggingFace connections, force isEmbedding to true
			const isHuggingFace = this.connection.type === 'huggingface';
			const isEmbedding = isHuggingFace ? true : this.isEmbeddingToggle.getValue();
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
				id: this.existingModel?.id || `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				name,
				connectionId: this.connection.id,
				modelName,
				maxTokens: this.maxTokensSlider.getValue(),
				temperature: this.temperatureSlider.getValue(),
				enabled: this.existingModel?.enabled ?? true,
				isEmbedding,
				embeddingDimension,
				isDefault: this.isDefaultToggle.getValue(),
				created: this.existingModel?.created || Date.now(),
				updated: Date.now()
			};

			// Debug log for HuggingFace models
			if (isHuggingFace) {
				Logger.debug('Saving HuggingFace model:', {
					name: model.name,
					modelName: model.modelName,
					connectionType: this.connection.type,
					isEmbedding: model.isEmbedding,
					embeddingDimension: model.embeddingDimension
				});
			}

			await this.onSave(model);

			// Verify after save
			if (isHuggingFace) {
				Logger.debug('Model saved. Final state:', {
					isEmbedding: model.isEmbedding,
					embeddingDimension: model.embeddingDimension
				});
			}

			new Notice(this.i18n.t('settingsPage.modelSavedSuccess', { name }));
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
