import { App, Notice, Setting } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { LLMConnection, LLMModel } from '../../types';
import { ConnectionHandler } from '../handlers/connection-handler';
import { ModelHandler } from '../handlers/model-handler';
import { getConnectionTypeName, getConnectionTypeLogo } from '../utils/connection-utils';
import { PROVIDER_CARD_LOGOS, PROVIDER_TYPE_NAMES } from '../utils/provider-logos';

/**
 * Renderer for Connection and Model Management Settings
 * Handles the UI for creating, editing, and managing LLM connections and their associated models
 */
export class ConnectionModelRenderer {
	private connectionHandler: ConnectionHandler;
	private modelHandler: ModelHandler;

	constructor(
		private app: App,
		private plugin: LLMSiderPlugin,
		private i18n: I18nManager,
		private onUpdate: () => void
	) {
		this.connectionHandler = new ConnectionHandler(app, plugin, i18n, onUpdate);
		this.modelHandler = new ModelHandler(app, plugin, i18n, onUpdate);
	}

	/**
	 * Main render method for Connection & Model Settings section
	 */
	render(containerEl: HTMLElement): void {
		// Main Header - first section, no top margin
		const sectionHeader = containerEl.createEl('h2', { 
			text: this.i18n.t('settingsPage.connectionsAndModels'),
			cls: 'llmsider-section-header llmsider-section-header-first'
		});

		// 使用统一的 settings-section-container 样式
		const container = containerEl.createDiv({ cls: 'llmsider-settings-section-container llmsider-connections-container' });

		// Add Connection Section
		const addConnectionSection = container.createDiv({ cls: 'llmsider-add-connection-section' });
		const addConnectionTitle = addConnectionSection.createEl('h3', { 
			text: this.i18n.t('settingsPage.addNewConnection'),
			cls: 'llmsider-subsection-header'
		});

		const connectionCardsContainer = addConnectionSection.createDiv({ cls: 'llmsider-connection-cards-grid' });

		// Provider Cards with SVG logos - using centralized definitions
		type ProviderType = 'openai' | 'anthropic' | 'qwen' | 'free-qwen' | 'free-deepseek' | 'free-gemini' | 'openai-compatible' | 'azure-openai' | 'ollama' | 'gemini' | 'groq' | 'hugging-chat' | 'github-copilot' | 'xai' | 'openrouter' | 'opencode';
		const providerTypes: ProviderType[] = [
			'openai',
			'anthropic',
			'azure-openai',
			'github-copilot',
			'gemini',
			'groq',
			'openrouter',
			'ollama',
			'opencode',
			'qwen',
			'free-qwen',
			'free-deepseek',
			'free-gemini',
			'hugging-chat',
			'openai-compatible'
		];

		providerTypes.forEach(type => {
			const card = connectionCardsContainer.createDiv({ cls: 'llmsider-connection-card' });
			card.innerHTML = `
				<span class="llmsider-connection-card-icon">${PROVIDER_CARD_LOGOS[type]}</span>
				<span class="llmsider-connection-card-name">${PROVIDER_TYPE_NAMES[type]}</span>
			`;
			card.onclick = () => this.connectionHandler.showAddConnectionModal(type);
		});

		// Configured Connections Section
		if (this.plugin.settings.connections.length > 0) {
			const listHeader = container.createEl('h3', { 
				text: this.i18n.t('settingsPage.configuredConnectionsAndModels'),
				cls: 'llmsider-subsection-header llmsider-subsection-header-spaced'
			});

			const connectionList = container.createDiv({ cls: 'llmsider-connections-list' });

			this.plugin.settings.connections.forEach((connection, index) => {
				this.renderConnectionCard(connectionList, connection, index);
			});
		}
	}

	/**
	 * Render a single connection card with its models
	 */
	private renderConnectionCard(container: HTMLElement, connection: LLMConnection, index: number): void {
		const card = container.createDiv({ cls: 'llmsider-connection-item' });

		// Connection Header
		const header = card.createDiv({ cls: 'llmsider-connection-header' });

		// Left side - Toggle and info
		const leftSide = header.createDiv({ cls: 'llmsider-connection-header-left' });
		
		// Collapse toggle button
		const collapseBtn = leftSide.createEl('button', { cls: 'llmsider-connection-collapse-btn' });
		collapseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
		
		// Connection info
		const info = leftSide.createDiv({ cls: 'llmsider-connection-info' });
		const nameContainer = info.createDiv({ cls: 'llmsider-connection-name-container' });
		const nameEl = nameContainer.createEl('h4', { text: connection.name, cls: 'llmsider-connection-name' });
		const typeEl = nameContainer.createEl('span', { cls: 'llmsider-connection-type-badge' });
		
		// Add logo icon and type name to badge
		const logoIcon = typeEl.createEl('span', { cls: 'llmsider-connection-type-logo' });
		logoIcon.innerHTML = getConnectionTypeLogo(connection.type);
		typeEl.createEl('span', { text: getConnectionTypeName(connection.type) });

		// Add server status indicator for OpenCode
		if (connection.type === 'opencode') {
			const statusIndicator = nameContainer.createEl('span', { 
				cls: 'llmsider-opencode-status-indicator',
				attr: { 'data-connection-id': connection.id }
			});
			statusIndicator.innerHTML = `
				<span class="status-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: var(--text-muted); margin-left: 8px; margin-right: 4px;"></span>
				<span class="status-text" style="font-size: 0.85em; color: var(--text-muted);">Checking...</span>
			`;
			
			this.checkOpenCodeServerStatus(statusIndicator);
		}

		// Add description for Free Deepseek
		let descEl: HTMLElement | null = null;
		if (connection.type === 'free-deepseek') {
			descEl = info.createEl('div', { cls: 'llmsider-connection-description' });
			descEl.innerHTML = `
				<div style="font-size: 0.85em; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">
					<strong>Available Models:</strong><br/>
					• deepseek-chat (默认) / deepseek-reasoner (R1推理)<br/>
					• deepseek-think / deepseek-r1 (深度思考)<br/>
					• deepseek-search (联网搜索)<br/>
					• deepseek-r1-search / deepseek-think-search (思考+搜索)<br/>
					• deepseek-*-silent (静默模式，不显示中间过程)
				</div>
			`;
		}

		// Right side - Actions
		const rightSide = header.createDiv({ cls: 'llmsider-connection-header-right' });
		
		// Edit button
		const editBtn = rightSide.createEl('button', { 
			cls: 'llmsider-icon-btn',
			attr: { 'aria-label': 'Edit connection' }
		});
		editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
		editBtn.onclick = (e) => {
			e.stopPropagation();
			this.connectionHandler.editConnection(connection, index);
		};

		// Delete button
		const deleteBtn = rightSide.createEl('button', { 
			cls: 'llmsider-icon-btn',
			attr: { 'aria-label': 'Delete connection' }
		});
		deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
		deleteBtn.onclick = async (e) => {
			e.stopPropagation();
			deleteBtn.disabled = true;
			try {
				await this.connectionHandler.deleteConnection(connection, index);
			} catch (error) {
				console.error('Failed to delete connection:', error);
				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('ui.failedToDeleteConnection') || 'Failed to delete connection');
			} finally {
				deleteBtn.disabled = false;
			}
		};

		// Toggle switch
		const toggleSwitch = rightSide.createDiv({ cls: 'llmsider-switch-container' });
		const switchInput = toggleSwitch.createEl('input', {
			type: 'checkbox',
			cls: 'llmsider-switch-input',
			attr: { id: `connection-toggle-${connection.id}` }
		});
		switchInput.checked = connection.enabled;
		
		const switchLabel = toggleSwitch.createEl('label', {
			cls: 'llmsider-switch-label',
			attr: { for: `connection-toggle-${connection.id}` }
		});

		switchInput.addEventListener('change', async () => {
			this.plugin.settings.connections[index].enabled = switchInput.checked;
			await this.plugin.saveSettings();
			await this.plugin.reinitializeProviders();
			const i18n = this.plugin.getI18nManager();
			if (switchInput.checked) {
				new Notice(i18n?.t('notifications.settingsHandlers.connectionEnabled', { name: connection.name }) || `Connection "${connection.name}" enabled`);
			} else {
				new Notice(i18n?.t('notifications.settingsHandlers.connectionDisabled', { name: connection.name }) || `Connection "${connection.name}" disabled`);
			}
		});

		// Models section (collapsible)
		const modelsSection = card.createDiv({ cls: 'llmsider-models-section' });
		modelsSection.style.display = 'block'; // Initially expanded
		
		const models = this.plugin.settings.models.filter(m => m.connectionId === connection.id);
		
		// Models header
		const modelsHeader = modelsSection.createDiv({ cls: 'llmsider-models-header' });
		const modelsCount = modelsHeader.createEl('span', { 
			text: `${this.i18n.t('settingsPage.models')} (${models.length})`,
			cls: 'llmsider-models-count'
		});
		
		// Add Model button
		const addModelBtn = modelsHeader.createEl('button', { cls: 'llmsider-add-model-btn' });
		addModelBtn.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="5" x2="12" y2="19"></line>
				<line x1="5" y1="12" x2="19" y2="12"></line>
			</svg>
			<span>${this.i18n.t('settingsPage.addModel')}</span>
		`;
		addModelBtn.onclick = () => this.modelHandler.showAddModelModal(connection);

		// Models list
		const modelsList = modelsSection.createDiv({ cls: 'llmsider-models-list' });
		if (models.length > 0) {
			models.forEach((model, modelIndex) => {
				this.renderModelCard(modelsList, model, modelIndex);
			});
		}

		// Toggle collapse functionality
		let isExpanded = true;
		collapseBtn.onclick = () => {
			isExpanded = !isExpanded;
			modelsSection.style.display = isExpanded ? 'block' : 'none';
			if (descEl) descEl.style.display = isExpanded ? 'block' : 'none';
			collapseBtn.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
		};
	}

	/**
	 * Render a single model card
	 */
	private renderModelCard(container: HTMLElement, model: LLMModel, index: number): void {
		const modelCard = container.createDiv({ cls: 'llmsider-model-card' });

		// Model info section
		const modelInfo = modelCard.createDiv({ cls: 'llmsider-model-card-info' });
		
		// Model name and badge
		const modelHeader = modelInfo.createDiv({ cls: 'llmsider-model-card-header' });
		const modelName = modelHeader.createEl('span', { 
			text: model.name,
			cls: 'llmsider-model-card-name'
		});

		if (model.isDefault) {
			const defaultBadge = modelHeader.createEl('span', { 
				text: this.i18n.t('settingsPage.defaultBadge'),
				cls: 'llmsider-model-default-badge'
			});
		}

		// Model details
		const modelDetails = modelInfo.createEl('div', { cls: 'llmsider-model-card-details' });
		if (model.isEmbedding) {
			// For embedding models, show dimension instead of temperature and max tokens
			modelDetails.textContent = `${this.i18n.t('ui.model')}: ${model.modelName} | ${this.i18n.t('ui.dimension')}: ${model.embeddingDimension || 'N/A'}`;
		} else {
			// For chat models, show temperature and max tokens
			modelDetails.textContent = `${this.i18n.t('ui.model')}: ${model.modelName} | ${this.i18n.t('ui.temp')}: ${model.temperature} | ${this.i18n.t('ui.maxTokens')}: ${model.maxTokens.toLocaleString()}`;
		}

		// Model actions
		const modelActions = modelCard.createDiv({ cls: 'llmsider-model-card-actions' });
		
		// Edit button
		const editBtn = modelActions.createEl('button', { 
			cls: 'llmsider-icon-btn',
			attr: { 'aria-label': 'Edit model' }
		});
		editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
		editBtn.onclick = () => this.modelHandler.editModel(model, index);

		// Delete button
		const deleteBtn = modelActions.createEl('button', { 
			cls: 'llmsider-icon-btn',
			attr: { 'aria-label': 'Delete model' }
		});
		deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
		deleteBtn.onclick = () => this.modelHandler.deleteModel(model, index);
	}

	/**
	 * Render Google Search Settings section
	 */
	renderGoogleSearchSettings(containerEl: HTMLElement): void {
		// Container with border
		const webSearchContainer = containerEl.createDiv({ cls: 'llmsider-settings-section-container' });
		
		// Section Header
		const webSearchHeader = webSearchContainer.createEl('h3', { 
			text: this.i18n.t('settingsPage.webSearchSettings'),
			cls: 'llmsider-subsection-header'
		});

		// Description
		const description = webSearchContainer.createEl('p', {
			text: this.i18n.t('settingsPage.webSearchSettingsDesc'),
			cls: 'llmsider-section-description'
		});

		// Search Backend Dropdown
		const backendSetting = new Setting(webSearchContainer)
			.setName(this.i18n.t('settingsPage.searchBackend'))
			.setDesc(this.i18n.t('settingsPage.searchBackendDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption('google', this.i18n.t('settingsPage.googleBackend'));
				dropdown.addOption('serpapi', this.i18n.t('settingsPage.serpapiBackend'));
				dropdown.addOption('tavily', this.i18n.t('settingsPage.tavilyBackend'));
				
				dropdown.setValue(this.plugin.settings.googleSearch.searchBackend);
				dropdown.onChange(async (value: string) => {
					this.plugin.settings.googleSearch.searchBackend = value as 'google' | 'serpapi' | 'tavily';
					await this.plugin.saveSettings();
					
					// Re-render to show/hide relevant API key fields
					this.onUpdate();
				});
			});

		const currentBackend = this.plugin.settings.googleSearch.searchBackend;

		// Google Custom Search API Settings (show only if google backend selected)
		if (currentBackend === 'google') {
			new Setting(webSearchContainer)
				.setName(this.i18n.t('settingsPage.googleApiKey'))
				.setDesc(this.i18n.t('settingsPage.googleApiKeyDesc'))
				.addText(text => {
					text.setPlaceholder(this.i18n.t('settingsPage.googleApiKeyPlaceholder'))
						.setValue(this.plugin.settings.googleSearch.googleApiKey || '')
						.onChange(async (value) => {
							this.plugin.settings.googleSearch.googleApiKey = value.trim();
							await this.plugin.saveSettings();
						});
					text.inputEl.type = 'password';
				});

			new Setting(webSearchContainer)
				.setName(this.i18n.t('settingsPage.googleSearchEngineId'))
				.setDesc(this.i18n.t('settingsPage.googleSearchEngineIdDesc'))
				.addText(text => {
					text.setPlaceholder(this.i18n.t('settingsPage.googleSearchEngineIdPlaceholder'))
						.setValue(this.plugin.settings.googleSearch.googleSearchEngineId || '')
						.onChange(async (value) => {
							this.plugin.settings.googleSearch.googleSearchEngineId = value.trim();
							await this.plugin.saveSettings();
						});
				});
		}

		// SerpAPI Settings (show only if serpapi backend selected)
		if (currentBackend === 'serpapi') {
			new Setting(webSearchContainer)
				.setName(this.i18n.t('settingsPage.serpapiKey'))
				.setDesc(this.i18n.t('settingsPage.serpapiKeyDesc'))
				.addText(text => {
					text.setPlaceholder(this.i18n.t('settingsPage.serpapiKeyPlaceholder'))
						.setValue(this.plugin.settings.googleSearch.serpapiKey || '')
						.onChange(async (value) => {
							this.plugin.settings.googleSearch.serpapiKey = value.trim();
							await this.plugin.saveSettings();
						});
					text.inputEl.type = 'password';
				});
		}

		// Tavily API Settings (show only if tavily backend selected)
		if (currentBackend === 'tavily') {
			new Setting(webSearchContainer)
				.setName(this.i18n.t('settingsPage.tavilyApiKey'))
				.setDesc(this.i18n.t('settingsPage.tavilyApiKeyDesc'))
				.addText(text => {
					text.setPlaceholder(this.i18n.t('settingsPage.tavilyApiKeyPlaceholder'))
						.setValue(this.plugin.settings.googleSearch.tavilyApiKey || '')
						.onChange(async (value) => {
							this.plugin.settings.googleSearch.tavilyApiKey = value.trim();
							await this.plugin.saveSettings();
						});
					text.inputEl.type = 'password';
				});
		}
	}

	/**
	 * Render Auto-completion Settings Section
	 */
	renderAutocompletionSettings(containerEl: HTMLElement): void {
		// Container with border
		const autocompletionContainer = containerEl.createDiv({ cls: 'llmsider-settings-section-container' });
		
		// Section Header
		const autocompletionHeader = autocompletionContainer.createEl('h3', { 
			text: this.i18n.t('settingsPage.autocompletionSettings'),
			cls: 'llmsider-subsection-header'
		});

		// Global enable/disable toggle
		new Setting(autocompletionContainer)
			.setName(this.i18n.t('autocomplete.enabled'))
			.setDesc(this.i18n.t('autocomplete.enabledDesc'))
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.autocomplete.enabled);
				toggle.onChange(async (value) => {
					this.plugin.settings.autocomplete.enabled = value;
					await this.plugin.saveSettings();
					
					if (value) {
						new Notice(this.i18n.t('autocomplete.completionEnabled'));
					} else {
						new Notice(this.i18n.t('autocomplete.completionDisabled'));
					}
				});
			});

		// Model selection for autocompletion
		new Setting(autocompletionContainer)
			.setName(this.i18n.t('autocomplete.model'))
			.setDesc(this.i18n.t('autocomplete.modelDesc'))
			.addDropdown(dropdown => {
				// Add default option
				dropdown.addOption('', this.i18n.t('autocomplete.useDefaultModel'));
				
				// Add all enabled models
				const enabledModels = this.plugin.settings.models.filter(m => m.enabled);
				for (const model of enabledModels) {
					const connection = this.plugin.settings.connections.find(c => c.id === model.connectionId);
					const displayName = connection ? `${connection.name} - ${model.name}` : model.name;
					dropdown.addOption(model.id, displayName);
				}
				
				dropdown.setValue(this.plugin.settings.autocomplete.modelId || '');
				dropdown.onChange(async (value) => {
					this.plugin.settings.autocomplete.modelId = value || undefined;
					await this.plugin.saveSettings();
				});
			});

		// Completion granularity
		new Setting(autocompletionContainer)
			.setName(this.i18n.t('autocomplete.granularity'))
			.setDesc(this.i18n.t('autocomplete.granularityDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption('phrase', this.i18n.t('autocomplete.phrase'));
				dropdown.addOption('short-sentence', this.i18n.t('autocomplete.shortSentence'));
				dropdown.addOption('long-sentence', this.i18n.t('autocomplete.longSentence'));
				dropdown.setValue(this.plugin.settings.autocomplete.granularity);
				dropdown.onChange(async (value: unknown) => {
					this.plugin.settings.autocomplete.granularity = value;
					await this.plugin.saveSettings();
				});
			});

		// Writing tone
		new Setting(autocompletionContainer)
			.setName(this.i18n.t('autocomplete.tone'))
			.setDesc(this.i18n.t('autocomplete.toneDesc'))
			.addText(text => {
				text.setPlaceholder(this.i18n.t('autocomplete.tonePlaceholder'));
				text.setValue(this.plugin.settings.autocomplete.tone);
				text.onChange(async (value) => {
					this.plugin.settings.autocomplete.tone = value || 'professional';
					await this.plugin.saveSettings();
				});
			});

		// Domain/Field
		new Setting(autocompletionContainer)
			.setName(this.i18n.t('autocomplete.domain'))
			.setDesc(this.i18n.t('autocomplete.domainDesc'))
			.addText(text => {
				text.setPlaceholder(this.i18n.t('autocomplete.domainPlaceholder'));
				text.setValue(this.plugin.settings.autocomplete.domain);
				text.onChange(async (value) => {
					this.plugin.settings.autocomplete.domain = value || 'general';
					await this.plugin.saveSettings();
				});
			});

		// Trigger delay
		new Setting(autocompletionContainer)
			.setName(this.i18n.t('autocomplete.triggerDelay'))
			.setDesc(this.i18n.t('autocomplete.triggerDelayDesc'))
			.addSlider(slider => {
				slider.setLimits(100, 2000, 100);
				slider.setValue(this.plugin.settings.autocomplete.triggerDelay);
				slider.setDynamicTooltip();
				slider.onChange(async (value) => {
					this.plugin.settings.autocomplete.triggerDelay = value;
					await this.plugin.saveSettings();
				});
			});

		// Maximum suggestions
		new Setting(autocompletionContainer)
			.setName(this.i18n.t('autocomplete.maxSuggestions'))
			.setDesc(this.i18n.t('autocomplete.maxSuggestionsDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption('1', '1');
				dropdown.addOption('2', '2');
				dropdown.addOption('3', '3');
				dropdown.setValue(String(this.plugin.settings.autocomplete.maxSuggestions));
				dropdown.onChange(async (value) => {
					this.plugin.settings.autocomplete.maxSuggestions = parseInt(value);
					await this.plugin.saveSettings();
				});
			});
	}

	private async checkOpenCodeServerStatus(statusIndicator: HTMLElement): Promise<void> {
		const statusDot = statusIndicator.querySelector('.status-dot') as HTMLElement;
		const statusText = statusIndicator.querySelector('.status-text') as HTMLElement;
		
		if (!statusDot || !statusText) return;

		try {
			const { OpenCodeServerManager } = await import('../../utils/opencode-server-manager');
			const manager = new OpenCodeServerManager();
			const isRunning = await manager.isRunning();

			if (isRunning) {
				statusDot.style.backgroundColor = 'var(--text-success)';
				statusText.textContent = 'Running';
				statusText.style.color = 'var(--text-success)';
			} else {
				statusDot.style.backgroundColor = 'var(--text-error)';
				statusText.textContent = 'Not Running';
				statusText.style.color = 'var(--text-error)';
			}
		} catch (error) {
			statusDot.style.backgroundColor = 'var(--text-muted)';
			statusText.textContent = 'Unknown';
			statusText.style.color = 'var(--text-muted)';
		}
	}
}
