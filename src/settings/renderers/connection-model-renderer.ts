import { App, Notice, Setting } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { LLMConnection, LLMModel } from '../../types';
import { ConnectionHandler } from '../handlers/connection-handler';
import { ModelHandler } from '../handlers/model-handler';
import { getConnectionTypeName, getConnectionTypeLogo } from '../utils/connection-utils';

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
		this.connectionHandler = new ConnectionHandler(app, plugin, onUpdate);
		this.modelHandler = new ModelHandler(app, plugin, i18n, onUpdate);
	}

	/**
	 * Main render method for Connection & Model Settings section
	 */
	render(containerEl: HTMLElement): void {
		// Main Header
		const sectionHeader = containerEl.createEl('h2', { text: this.i18n.t('settingsPage.connectionsAndModels') });
		sectionHeader.style.marginTop = '0px';
		sectionHeader.style.marginBottom = '12px';
		sectionHeader.style.fontSize = '16px';
		sectionHeader.style.fontWeight = '600';

		// 使用统一的 settings-section-container 样式
		const container = containerEl.createDiv({ cls: 'llmsider-settings-section-container llmsider-connections-container' });

		// Add Connection Section
		const addConnectionSection = container.createDiv({ cls: 'llmsider-add-connection-section' });
		const addConnectionTitle = addConnectionSection.createEl('h3', { 
			text: this.i18n.t('settingsPage.addNewConnection')
		});
		addConnectionTitle.style.marginBottom = '12px';
		addConnectionTitle.style.marginTop = '0px';
		addConnectionTitle.style.fontSize = '14px';
		addConnectionTitle.style.fontWeight = '600';
		addConnectionTitle.style.color = 'var(--text-normal)';

		const connectionCardsContainer = addConnectionSection.createDiv({ cls: 'llmsider-connection-cards-grid' });

		// Provider Cards with SVG logos
		const providers: Array<{type: 'openai' | 'anthropic' | 'qwen' | 'openai-compatible' | 'azure-openai' | 'ollama' | 'gemini' | 'groq' | 'huggingface' | 'github-copilot', logo: string, name: string}> = [
			{ 
				type: 'openai', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>`,
				name: 'OpenAI' 
			},
			{ 
				type: 'anthropic', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3L24 21h-4.3l-1.3-3.8h-6.6L10.5 21H6.2L12.4 3h5.4zm-2.7 4.6l-2.3 6.8h4.6l-2.3-6.8zM0 3h4.3l6.2 18H6.2L0 3z"/></svg>`,
				name: 'Anthropic' 
			},
			{ 
				type: 'azure-openai', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.61 2.63L6.67 8.47a.76.76 0 0 0-.21.72l2.02 8.03a.76.76 0 0 0 .64.56l7.98.83a.76.76 0 0 0 .7-.32l4.74-6.8a.76.76 0 0 0-.05-.89L14.4 2.65a.76.76 0 0 0-.79-.02zm-2.09 7.32l3.02-2.19 3.02 4.28-4.68.48-1.36-2.57zM8.19 9.96l1.96 7.75-3.17-5.49 1.21-2.26zm5.37 7.88l-4.54-.47 3.77-5.43.77 5.9zm1.32-6.25l-3.77-5.43 4.54.47-.77 4.96z"/></svg>`,
				name: 'Azure OpenAI' 
			},
			{ 
				type: 'github-copilot', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.475 2 2 6.475 2 12C2 16.425 4.8625 20.1625 8.8375 21.4875C9.3375 21.575 9.525 21.275 9.525 21.0125C9.525 20.775 9.5125 19.9875 9.5125 19.15C7 19.6125 6.35 18.5375 6.15 17.975C6.0375 17.6875 5.55 16.8 5.125 16.5625C4.775 16.375 4.275 15.9125 5.1125 15.9C5.9 15.8875 6.4625 16.625 6.65 16.925C7.55 18.4375 8.9875 18.0125 9.5625 17.75C9.65 17.1 9.9125 16.6625 10.2 16.4125C7.975 16.1625 5.65 15.3 5.65 11.475C5.65 10.3875 6.0375 9.4875 6.675 8.7875C6.575 8.5375 6.225 7.5125 6.775 6.1375C6.775 6.1375 7.6125 5.875 9.525 7.1625C10.325 6.9375 11.175 6.825 12.025 6.825C12.875 6.825 13.725 6.9375 14.525 7.1625C16.4375 5.8625 17.275 6.1375 17.275 6.1375C17.825 7.5125 17.475 8.5375 17.375 8.7875C18.0125 9.4875 18.4 10.375 18.4 11.475C18.4 15.3125 16.0625 16.1625 13.8375 16.4125C14.2 16.725 14.5125 17.325 14.5125 18.2625C14.5125 19.6 14.5 20.675 14.5 21.0125C14.5 21.275 14.6875 21.5875 15.1875 21.4875C19.1375 20.1625 22 16.4125 22 12C22 6.475 17.525 2 12 2Z"/></svg>`,
				name: 'GitHub Copilot' 
			},
			{ 
				type: 'gemini', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.182c5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818-5.423 0-9.818-4.395-9.818-9.818 0-5.423 4.395-9.818 9.818-9.818zm-1.636 3.273v4.363H6.545v2.364h3.818v4.363h2.364v-4.363h3.818v-2.364h-3.818V5.455z"/></svg>`,
				name: 'Gemini' 
			},
			{ 
				type: 'groq', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.48l7 3.5v7.04l-7-3.5V9.48zm9 10.54v-7.04l7-3.5v7.04l-7 3.5z"/></svg>`,
				name: 'Groq' 
			},
			{ 
				type: 'ollama', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2v1h3a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h3V4a2 2 0 0 1 2-2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>`,
				name: 'Ollama' 
			},
			{ 
				type: 'qwen', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
				name: 'Qwen' 
			},
			{ 
				type: 'huggingface', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="10" r="2"/><circle cx="16" cy="10" r="2"/><path d="M12 14c2 0 4 1 4 3 0 2-2 3-4 3s-4-1-4-3c0-2 2-3 4-3z"/><path d="M6 6c0-2 2-3 6-3s6 1 6 3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
				name: 'Hugging Face' 
			},
			{ 
				type: 'openai-compatible', 
				logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0-.39-.39-.39-1.03 0-1.42.39-.39 1.03-.39 1.42 0zm4.24.42c.39.39.39 1.03 0 1.42-.39.39-1.02.39-1.41 0-.39-.39-.39-1.03 0-1.42.39-.39 1.02-.39 1.41 0zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-12.5c-2.33 0-4.32 1.45-5.12 3.5h1.67c.69-1.19 1.97-2 3.45-2s2.75.81 3.45 2h1.67c-.8-2.05-2.79-3.5-5.12-3.5z"/></svg>`,
				name: 'OpenAI-Compatible' 
			}
		];

		providers.forEach(provider => {
			const card = connectionCardsContainer.createDiv({ cls: 'llmsider-connection-card' });
			card.innerHTML = `
				<span class="llmsider-connection-card-icon">${provider.logo}</span>
				<span class="llmsider-connection-card-name">${provider.name}</span>
			`;
			card.onclick = () => this.connectionHandler.showAddConnectionModal(provider.type);
		});

		// Configured Connections Section
		if (this.plugin.settings.connections.length > 0) {
			const listHeader = container.createEl('h3', { text: this.i18n.t('settingsPage.configuredConnectionsAndModels') });
			listHeader.style.marginTop = '24px';
			listHeader.style.marginBottom = '12px';
			listHeader.style.fontSize = '14px';
			listHeader.style.fontWeight = '600';
			listHeader.style.color = 'var(--text-normal)';

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
		deleteBtn.onclick = (e) => {
			e.stopPropagation();
			this.connectionHandler.deleteConnection(connection, index);
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
			new Notice(`Connection "${connection.name}" ${switchInput.checked ? 'enabled' : 'disabled'}`);
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
			text: this.i18n.t('settingsPage.webSearchSettings')
		});
		webSearchHeader.style.marginTop = '0px';
		webSearchHeader.style.marginBottom = '12px';
		webSearchHeader.style.fontSize = '14px';
		webSearchHeader.style.fontWeight = '600';
		webSearchHeader.style.color = 'var(--text-normal)';

		// Description
		const description = webSearchContainer.createEl('p', {
			text: this.i18n.t('settingsPage.webSearchSettingsDesc')
		});
		description.style.marginBottom = '16px';
		description.style.color = 'var(--text-muted)';
		description.style.fontSize = '13px';

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
					text.setPlaceholder('AIzaSy...')
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
					text.setPlaceholder('012345678901234567890:abcdefghijk')
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
					text.setPlaceholder('abc123...')
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
					text.setPlaceholder('tvly-...')
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
			text: this.i18n.t('settingsPage.autocompletionSettings')
		});
		autocompletionHeader.style.marginTop = '0px';
		autocompletionHeader.style.marginBottom = '12px';
		autocompletionHeader.style.fontSize = '14px';
		autocompletionHeader.style.fontWeight = '600';
		autocompletionHeader.style.color = 'var(--text-normal)';

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

		// Completion granularity
		new Setting(autocompletionContainer)
			.setName(this.i18n.t('autocomplete.granularity'))
			.setDesc(this.i18n.t('autocomplete.granularityDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption('word', this.i18n.t('autocomplete.word'));
				dropdown.addOption('phrase', this.i18n.t('autocomplete.phrase'));
				dropdown.addOption('short-sentence', this.i18n.t('autocomplete.shortSentence'));
				dropdown.addOption('long-sentence', this.i18n.t('autocomplete.longSentence'));
				dropdown.setValue(this.plugin.settings.autocomplete.granularity);
				dropdown.onChange(async (value: any) => {
					this.plugin.settings.autocomplete.granularity = value;
					await this.plugin.saveSettings();
				});
			});

		// Writing tone
		new Setting(autocompletionContainer)
			.setName(this.i18n.t('autocomplete.tone'))
			.setDesc(this.i18n.t('autocomplete.toneDesc'))
			.addText(text => {
				text.setPlaceholder('e.g., formal, casual, professional');
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
				text.setPlaceholder('e.g., technical, academic, creative');
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
}
