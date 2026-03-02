import { App, Modal, Notice, TextComponent, DropdownComponent } from 'obsidian';
import { Logger } from './../utils/logger';
import { LLMConnection } from '../types';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';

/**
 * Modal for adding or editing a Connection
 */
export class ConnectionModal extends Modal {
	private existingConnection?: LLMConnection;
	private onSave: (connection: LLMConnection) => Promise<void>;
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;

	// Form fields (initialized in onOpen)
	private typeDropdown!: DropdownComponent;
	private nameInput!: TextComponent;
	private apiKeyInput!: TextComponent;
	private baseUrlInput?: TextComponent;
	private organizationIdInput?: TextComponent;
	private regionInput?: TextComponent;
	private deploymentNameInput?: TextComponent;
	private apiVersionInput?: TextComponent;
	private saveButton?: HTMLButtonElement;
	
	// Free Gemini specific fields
	private geminiPSIDInput?: TextComponent;
	private geminiPSIDTSInput?: TextComponent;
	
	// Proxy fields
	private proxyEnabledToggle?: HTMLInputElement;
	private proxyTypeDropdown?: DropdownComponent;
	private proxyHostInput?: TextComponent;
	private proxyPortInput?: TextComponent;
	private proxyAuthToggle?: HTMLInputElement;
	private proxyUsernameInput?: TextComponent;
	private proxyPasswordInput?: TextComponent;
	private proxySection?: HTMLElement;

	// GitHub Copilot temporary tokens (stored during authentication)
	private _tempGitHubToken?: string;
	private _tempCopilotToken?: string;
	private _tempTokenExpiry?: number;

	private presetType?: string;

	constructor(
		app: App,
		plugin: LLMSiderPlugin,
		onSave: (connection: LLMConnection) => Promise<void>,
		existingConnection?: LLMConnection,
		presetType?: string
	) {
		super(app);
		this.plugin = plugin;
		this.existingConnection = existingConnection;
		this.onSave = onSave;
		this.i18n = plugin.getI18nManager()!;
		this.presetType = presetType;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('llmsider-connection-modal');

		// Modal title
		contentEl.createEl('h2', { 
			text: this.existingConnection 
				? this.i18n.t('ui.editConnection')
				: this.i18n.t('ui.addNewConnection')
		});

		// Form container
		const formContainer = contentEl.createDiv({ cls: 'llmsider-connection-form' });

		// Connection Type
		const typeGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		
		// Only show dropdown if no preset type is provided and not editing
		if (!this.presetType && !this.existingConnection) {
			typeGroup.createEl('label', { text: this.i18n.t('ui.connectionType'), cls: 'llmsider-form-label' });
			this.typeDropdown = new DropdownComponent(typeGroup);
			this.typeDropdown.addOption('openai', 'OpenAI');
			this.typeDropdown.addOption('anthropic', 'Anthropic');
			this.typeDropdown.addOption('azure-openai', 'Azure OpenAI');
			this.typeDropdown.addOption('github-copilot', 'GitHub Copilot');
			this.typeDropdown.addOption('gemini', 'Google Gemini');
			this.typeDropdown.addOption('groq', 'Groq');
			this.typeDropdown.addOption('xai', 'X.AI (Grok)');
			this.typeDropdown.addOption('openrouter', 'OpenRouter');
			this.typeDropdown.addOption('siliconflow', 'SiliconFlow (硅基流动)');
			this.typeDropdown.addOption('kimi', 'Kimi (Moonshot)');
			this.typeDropdown.addOption('ollama', 'Ollama');
			this.typeDropdown.addOption('qwen', 'Qwen (通义千问)');
			this.typeDropdown.addOption('free-qwen', 'Free Qwen (免费通义千问)');
			this.typeDropdown.addOption('free-deepseek', 'Free DeepSeek (免费 DeepSeek)');
			this.typeDropdown.addOption('free-gemini', 'Free Gemini (免费 Gemini)');
			this.typeDropdown.addOption('hugging-chat', 'Hugging Chat');
			this.typeDropdown.addOption('openai-compatible', 'OpenAI-Compatible');
			this.typeDropdown.selectEl.style.width = '100%';
			this.typeDropdown.selectEl.style.boxSizing = 'border-box';
			this.typeDropdown.setValue('openai');
		} else {
			// Create a hidden dropdown for internal use
			this.typeDropdown = new DropdownComponent(typeGroup);
		this.typeDropdown.addOption('openai', 'OpenAI');
		this.typeDropdown.addOption('anthropic', 'Anthropic');
		this.typeDropdown.addOption('azure-openai', 'Azure OpenAI');
		this.typeDropdown.addOption('github-copilot', 'GitHub Copilot');
		this.typeDropdown.addOption('gemini', 'Google Gemini');
		this.typeDropdown.addOption('groq', 'Groq');
		this.typeDropdown.addOption('xai', 'X.AI (Grok)');
		this.typeDropdown.addOption('openrouter', 'OpenRouter');
		this.typeDropdown.addOption('siliconflow', 'SiliconFlow (硅基流动)');
		this.typeDropdown.addOption('kimi', 'Kimi (Moonshot)');
		this.typeDropdown.addOption('ollama', 'Ollama');
		this.typeDropdown.addOption('opencode', 'OpenCode');
		this.typeDropdown.addOption('qwen', 'Qwen (通义千问)');
		this.typeDropdown.addOption('free-qwen', 'Free Qwen (免费通义千问)');
		this.typeDropdown.addOption('free-deepseek', 'Free DeepSeek (免费 DeepSeek)');
		this.typeDropdown.addOption('free-gemini', 'Free Gemini (免费 Gemini)');
		this.typeDropdown.addOption('hugging-chat', 'Hugging Chat');
		this.typeDropdown.addOption('openai-compatible', 'OpenAI-Compatible');
		
		if (this.existingConnection) {
			this.typeDropdown.setValue(this.existingConnection.type);
		} else if (this.presetType) {
			this.typeDropdown.setValue(this.presetType);
		}
		
		typeGroup.style.display = 'none';
		}

		// Connection Name
		const nameGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		nameGroup.createEl('label', { text: this.i18n.t('ui.connectionName'), cls: 'llmsider-form-label' });
		this.nameInput = new TextComponent(nameGroup);
		this.nameInput.setPlaceholder(this.i18n.t('ui.connectionNamePlaceholder'));
		this.nameInput.inputEl.style.width = '100%';
		this.nameInput.inputEl.style.boxSizing = 'border-box';
		if (this.existingConnection) {
			this.nameInput.setValue(this.existingConnection.name);
		}

		// API Key
		const apiKeyGroup = formContainer.createDiv({ cls: 'llmsider-form-group' });
		apiKeyGroup.createEl('label', { text: this.i18n.t('ui.apiKey'), cls: 'llmsider-form-label' });
		this.apiKeyInput = new TextComponent(apiKeyGroup);
		this.apiKeyInput.setPlaceholder(this.i18n.t('ui.apiKeyPlaceholder'));
		this.apiKeyInput.inputEl.type = 'password';
		this.apiKeyInput.inputEl.style.width = '100%';
		this.apiKeyInput.inputEl.style.boxSizing = 'border-box';
		if (this.existingConnection) {
			this.apiKeyInput.setValue(this.existingConnection.apiKey);
		}

		// Dynamic fields based on type
		const dynamicFieldsContainer = formContainer.createDiv({ cls: 'llmsider-dynamic-fields' });
		
		// Proxy Configuration Section (Always visible, after dynamic fields)
		const proxyContainer = formContainer.createDiv({ cls: 'llmsider-proxy-container' });
		this.renderProxySettings(proxyContainer);

		// Instructions/Info Section (Always at the bottom)
		const instructionsContainer = formContainer.createDiv({ cls: 'llmsider-instructions-container' });

		this.renderDynamicFields(dynamicFieldsContainer, instructionsContainer, this.typeDropdown.getValue() as Exclude<LLMConnection['type'], 'local'>);

		// Update dynamic fields when type changes
		this.typeDropdown.onChange((value) => {
			const newType = value as Exclude<LLMConnection['type'], 'local'>;
			this.renderDynamicFields(dynamicFieldsContainer, instructionsContainer, newType);
		});

		// Buttons
		const buttonGroup = contentEl.createDiv({ cls: 'llmsider-modal-buttons' });
		buttonGroup.style.display = 'flex';
		buttonGroup.style.justifyContent = 'flex-end';
		buttonGroup.style.gap = '10px';
		buttonGroup.style.marginTop = '20px';

		const cancelButton = buttonGroup.createEl('button', { text: this.i18n.t('ui.cancel') });
		cancelButton.onclick = () => this.close();

		const saveButton = buttonGroup.createEl('button', { text: this.i18n.t('ui.save'), cls: 'mod-cta' });
		this.saveButton = saveButton; // Store reference for later use
		saveButton.onclick = async () => {
			// Disable button to prevent double-click
			saveButton.disabled = true;
			saveButton.textContent = this.i18n.t('ui.saving') || 'Saving...';
			
			try {
				await this.handleSave();
			} catch (error) {
				Logger.error('Error in handleSave:', error);
				// Re-enable button on error
				saveButton.disabled = false;
				saveButton.textContent = this.i18n.t('ui.save');
			}
		};
	}

	private renderDynamicFields(container: HTMLElement, instructionsContainer: HTMLElement, type: Exclude<LLMConnection['type'], 'local'>) {
		container.empty();
		instructionsContainer.empty();

		if (type === 'github-copilot') {
			// GitHub Copilot - show authentication button
			const infoGroup = instructionsContainer.createDiv({ cls: 'llmsider-form-group' });
			const infoBox = infoGroup.createDiv({ cls: 'llmsider-info-box' });
			infoBox.style.padding = '12px';
			infoBox.style.backgroundColor = 'var(--background-secondary)';
			infoBox.style.borderRadius = '4px';
			infoBox.style.marginTop = '8px';

			infoBox.createEl('p', {
				text: this.i18n.t('settingsPage.githubCopilotAuth.title'),
				cls: 'llmsider-info-title'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('settingsPage.githubCopilotAuth.description'),
				cls: 'llmsider-form-note'
			});

			// Check if already authenticated
			if (this.existingConnection && this.existingConnection.githubToken) {
				infoBox.createEl('p', {
					text: this.i18n.t('settingsPage.githubCopilotAuth.alreadyAuthenticated'),
					cls: 'llmsider-form-note'
				}).style.color = 'var(--text-success)';
			}

			// Auth button
			const authBtn = infoGroup.createEl('button', {
				text: this.existingConnection?.githubToken 
					? this.i18n.t('settingsPage.githubCopilotAuth.reauthenticateButton')
					: this.i18n.t('settingsPage.githubCopilotAuth.authenticateButton'),
				cls: 'mod-cta'
			});
			authBtn.style.marginTop = '12px';
			authBtn.onclick = async () => {
				await this.authenticateGitHub(authBtn, infoBox);
			};

			// Hide API key field for GitHub Copilot
			const apiKeyGroup = this.apiKeyInput.inputEl.closest('.llmsider-form-group') as HTMLElement;
			if (apiKeyGroup) {
				apiKeyGroup.style.display = 'none';
			}
		} else if (type === 'hugging-chat') {
			// Hugging Chat - show authentication info
			const infoGroup = instructionsContainer.createDiv({ cls: 'llmsider-form-group' });
			const infoBox = infoGroup.createDiv({ cls: 'llmsider-info-box' });
			infoBox.style.padding = '12px';
			infoBox.style.backgroundColor = 'var(--background-secondary)';
			infoBox.style.borderRadius = '4px';
			infoBox.style.marginTop = '8px';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatTitle'),
				cls: 'llmsider-info-title'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatDesc'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatHowToGetCookie'),
				cls: 'llmsider-form-note'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatStep1'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatStep2'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatStep3'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatStep4'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatStep5'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatStep6'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingChatNote'),
				cls: 'llmsider-form-note'
			}).style.fontStyle = 'italic';

			// Update API key field label for Hugging Chat
			const apiKeyGroup = this.apiKeyInput.inputEl.closest('.llmsider-form-group') as HTMLElement;
			if (apiKeyGroup) {
				const label = apiKeyGroup.querySelector('label');
				if (label) {
					label.textContent = this.i18n.t('ui.huggingChatApiKeyLabel');
				}
				this.apiKeyInput.setPlaceholder(this.i18n.t('ui.huggingChatApiKeyPlaceholder'));
			}
		} else {
			// Show API key field for other types
			const apiKeyGroup = this.apiKeyInput.inputEl.closest('.llmsider-form-group') as HTMLElement;
			if (apiKeyGroup) {
				apiKeyGroup.style.display = '';
			}
		}

		if (type === 'openai') {
			// Organization ID (optional for OpenAI)
			const orgGroup = container.createDiv({ cls: 'llmsider-form-group' });
			orgGroup.createEl('label', { text: this.i18n.t('ui.organizationIdOptional'), cls: 'llmsider-form-label' });
			this.organizationIdInput = new TextComponent(orgGroup);
			this.organizationIdInput.setPlaceholder(this.i18n.t('ui.organizationIdPlaceholder'));
			this.organizationIdInput.inputEl.style.width = '100%';
			if (this.existingConnection && this.existingConnection.organizationId) {
				this.organizationIdInput.setValue(this.existingConnection.organizationId);
			}
		} else if (type === 'azure-openai') {
			// Base URL (Azure endpoint)
			const baseUrlGroup = container.createDiv({ cls: 'llmsider-form-group' });
			baseUrlGroup.createEl('label', { text: this.i18n.t('ui.azureEndpoint'), cls: 'llmsider-form-label' });
			baseUrlGroup.createEl('p', { 
				text: this.i18n.t('ui.azureEndpointNote'), 
				cls: 'llmsider-form-note' 
			});
			
			this.baseUrlInput = new TextComponent(baseUrlGroup);
			this.baseUrlInput.setPlaceholder(this.i18n.t('ui.azureEndpointPlaceholder'));
			this.baseUrlInput.inputEl.style.width = '100%';
			if (this.existingConnection && this.existingConnection.baseUrl) {
				this.baseUrlInput.setValue(this.existingConnection.baseUrl);
			}

			// Deployment Name
			const deploymentGroup = container.createDiv({ cls: 'llmsider-form-group' });
			deploymentGroup.createEl('label', { text: this.i18n.t('ui.deploymentName'), cls: 'llmsider-form-label' });
			this.deploymentNameInput = new TextComponent(deploymentGroup);
			this.deploymentNameInput.setPlaceholder(this.i18n.t('ui.deploymentNamePlaceholder'));
			this.deploymentNameInput.inputEl.style.width = '100%';
			if (this.existingConnection && this.existingConnection.deploymentName) {
				this.deploymentNameInput.setValue(this.existingConnection.deploymentName);
			}

			// API Version (optional)
			const apiVersionGroup = container.createDiv({ cls: 'llmsider-form-group' });
			apiVersionGroup.createEl('label', { text: this.i18n.t('ui.apiVersionOptional'), cls: 'llmsider-form-label' });
			apiVersionGroup.createEl('p', { 
				text: this.i18n.t('ui.apiVersionNote'), 
				cls: 'llmsider-form-note' 
			});
			
			this.apiVersionInput = new TextComponent(apiVersionGroup);
			this.apiVersionInput.setPlaceholder(this.i18n.t('ui.apiVersionPlaceholder'));
			this.apiVersionInput.inputEl.style.width = '100%';
			if (this.existingConnection && this.existingConnection.apiVersion) {
				this.apiVersionInput.setValue(this.existingConnection.apiVersion);
			}
		} else if (type === 'ollama') {
			const baseUrlGroup = container.createDiv({ cls: 'llmsider-form-group' });
			baseUrlGroup.createEl('label', { text: this.i18n.t('ui.ollamaServerUrl'), cls: 'llmsider-form-label' });
			baseUrlGroup.createEl('p', { 
				text: this.i18n.t('ui.ollamaServerUrlNote'), 
				cls: 'llmsider-form-note' 
			});
			
			this.baseUrlInput = new TextComponent(baseUrlGroup);
			this.baseUrlInput.setPlaceholder(this.i18n.t('ui.ollamaServerUrlPlaceholder'));
			this.baseUrlInput.inputEl.style.width = '100%';
			if (this.existingConnection && this.existingConnection.baseUrl) {
				this.baseUrlInput.setValue(this.existingConnection.baseUrl);
			} else {
				this.baseUrlInput.setValue('http://localhost:11434/v1');
			}
		} else if (type === 'opencode') {
			const apiKeyGroup = this.apiKeyInput.inputEl.closest('.llmsider-form-group') as HTMLElement;
			if (apiKeyGroup) {
				apiKeyGroup.style.display = 'none';
			}

			const infoGroup = instructionsContainer.createDiv({ cls: 'llmsider-form-group' });
			const infoBox = infoGroup.createDiv({ cls: 'llmsider-info-box' });
			infoBox.style.padding = '12px';
			infoBox.style.backgroundColor = 'var(--background-secondary)';
			infoBox.style.borderRadius = '4px';
			infoBox.style.marginTop = '8px';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.opencodeTitle'),
				cls: 'llmsider-info-title'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: 'The OpenCode server will automatically start on http://127.0.0.1:4097',
				cls: 'llmsider-form-note'
			}).style.marginTop = '8px';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.opencodeDesc'),
				cls: 'llmsider-form-note'
			}).style.marginTop = '8px';

			const requirementText = infoBox.createEl('p', {
				cls: 'llmsider-form-note'
			});
			requirementText.style.cssText = 'margin-top: 12px; padding: 8px; background: var(--background-modifier-error-hover); border-left: 3px solid var(--text-error); border-radius: 3px;';
			requirementText.innerHTML = '<strong>Requirement:</strong> OpenCode CLI must be installed<br/><code style="background: var(--code-background); padding: 2px 6px; border-radius: 3px; font-family: monospace;">npm install -g opencode</code>';

			infoBox.createEl('p', {
				text: 'The plugin will automatically manage the server lifecycle.',
				cls: 'llmsider-form-note'
			}).style.marginTop = '8px';
		} else if (type === 'gemini') {
			// Region (optional for Gemini)
			const regionGroup = container.createDiv({ cls: 'llmsider-form-group' });
			regionGroup.createEl('label', { text: this.i18n.t('ui.regionOptional'), cls: 'llmsider-form-label' });
			regionGroup.createEl('p', { 
				text: this.i18n.t('ui.regionNote'), 
				cls: 'llmsider-form-note' 
			});
			
			this.regionInput = new TextComponent(regionGroup);
			this.regionInput.setPlaceholder(this.i18n.t('ui.regionPlaceholder'));
			this.regionInput.inputEl.style.width = '100%';
			if (this.existingConnection && this.existingConnection.region) {
				this.regionInput.setValue(this.existingConnection.region);
			}
		} else if (type === 'qwen') {
			// Region (optional for Qwen)
			const regionGroup = container.createDiv({ cls: 'llmsider-form-group' });
			regionGroup.createEl('label', { text: this.i18n.t('ui.regionOptional'), cls: 'llmsider-form-label' });
			regionGroup.createEl('p', { 
				text: this.i18n.t('ui.regionAlibabaNote'), 
				cls: 'llmsider-form-note' 
			});
			
			this.regionInput = new TextComponent(regionGroup);
			this.regionInput.setPlaceholder(this.i18n.t('ui.regionAlibabaPlaceholder'));
			this.regionInput.inputEl.style.width = '100%';
			if (this.existingConnection && this.existingConnection.region) {
				this.regionInput.setValue(this.existingConnection.region);
			}
		} else if (type === 'free-qwen') {
			// Free Qwen - show info box explaining ticket requirement
			const infoGroup = instructionsContainer.createDiv({ cls: 'llmsider-form-group' });
			const infoBox = infoGroup.createDiv({ cls: 'llmsider-info-box' });
			infoBox.style.padding = '12px';
			infoBox.style.backgroundColor = 'var(--background-secondary)';
			infoBox.style.borderRadius = '4px';
			infoBox.style.marginTop = '8px';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenTitle'),
				cls: 'llmsider-info-title'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenDesc'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenHowToGetToken'),
				cls: 'llmsider-form-note'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenStep1'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenStep2'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenStep3'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenStep4'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenStep5'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenStep6'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeQwenNote'),
				cls: 'llmsider-form-note'
			}).style.fontStyle = 'italic';

			// Update API key field label for Free Qwen
			const apiKeyGroup = this.apiKeyInput.inputEl.closest('.llmsider-form-group') as HTMLElement;
			if (apiKeyGroup) {
				const label = apiKeyGroup.querySelector('label');
				if (label) {
					label.textContent = this.i18n.t('ui.freeQwenApiKeyLabel');
				}
				this.apiKeyInput.setPlaceholder(this.i18n.t('ui.freeQwenApiKeyPlaceholder'));
			}
		} else if (type === 'free-deepseek') {
			// Free Deepseek - show info box explaining token requirement
			const infoGroup = instructionsContainer.createDiv({ cls: 'llmsider-form-group' });
			const infoBox = infoGroup.createDiv({ cls: 'llmsider-info-box' });
			infoBox.style.padding = '12px';
			infoBox.style.backgroundColor = 'var(--background-secondary)';
			infoBox.style.borderRadius = '4px';
			infoBox.style.marginTop = '8px';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekTitle'),
				cls: 'llmsider-info-title'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekDesc'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekHowToGetToken'),
				cls: 'llmsider-form-note'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekStep1'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekStep2'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekStep3'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekStep4'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekStep5'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekStep6'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeDeepSeekNote'),
				cls: 'llmsider-form-note'
			}).style.fontStyle = 'italic';

			// Update API key field label for Free Deepseek
			const apiKeyGroup = this.apiKeyInput.inputEl.closest('.llmsider-form-group') as HTMLElement;
			if (apiKeyGroup) {
				const label = apiKeyGroup.querySelector('label');
				if (label) {
					label.textContent = this.i18n.t('ui.freeDeepSeekApiKeyLabel');
				}
				this.apiKeyInput.setPlaceholder(this.i18n.t('ui.freeDeepSeekApiKeyPlaceholder'));
			}
		} else if (type === 'free-gemini') {
			// Free Gemini - show info box explaining cookies requirement
			const infoGroup = instructionsContainer.createDiv({ cls: 'llmsider-form-group' });
			const infoBox = infoGroup.createDiv({ cls: 'llmsider-info-box' });
			infoBox.style.padding = '12px';
			infoBox.style.backgroundColor = 'var(--background-secondary)';
			infoBox.style.borderRadius = '4px';
			infoBox.style.marginTop = '8px';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiTitle'),
				cls: 'llmsider-info-title'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiDesc'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiHowToGetCookies'),
				cls: 'llmsider-form-note'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiStep1'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiStep2'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiStep3'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiStep4'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiStep5'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiStep6'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.freeGeminiNote'),
				cls: 'llmsider-form-note'
			}).style.fontStyle = 'italic';

			// Hide the default API key field
			const apiKeyGroupGemini = this.apiKeyInput.inputEl.closest('.llmsider-form-group') as HTMLElement;
			if (apiKeyGroupGemini) {
				apiKeyGroupGemini.style.display = 'none';
			}

			// Add separate fields for __Secure-1PSID
			const psidGroup = container.createDiv({ cls: 'llmsider-form-group' });
			psidGroup.createEl('label', { text: '__Secure-1PSID:', cls: 'llmsider-form-label' });
			this.geminiPSIDInput = new TextComponent(psidGroup);
			this.geminiPSIDInput.setPlaceholder(this.i18n.t('ui.freeGeminiPSIDPlaceholder'));
			this.geminiPSIDInput.inputEl.type = 'password';
			this.geminiPSIDInput.inputEl.style.width = '100%';
			this.geminiPSIDInput.inputEl.style.boxSizing = 'border-box';
			
			// Parse existing value if editing
			if (this.existingConnection && this.existingConnection.apiKey) {
				const parts = this.existingConnection.apiKey.split('|');
				if (parts.length >= 1) {
					this.geminiPSIDInput.setValue(parts[0]);
				}
			}

			// Add separate fields for __Secure-1PSIDTS
			const psidtsGroup = container.createDiv({ cls: 'llmsider-form-group' });
			psidtsGroup.createEl('label', { text: '__Secure-1PSIDTS:', cls: 'llmsider-form-label' });
			this.geminiPSIDTSInput = new TextComponent(psidtsGroup);
			this.geminiPSIDTSInput.setPlaceholder(this.i18n.t('ui.freeGeminiPSIDTSPlaceholder'));
			this.geminiPSIDTSInput.inputEl.type = 'password';
			this.geminiPSIDTSInput.inputEl.style.width = '100%';
			this.geminiPSIDTSInput.inputEl.style.boxSizing = 'border-box';
			
			// Parse existing value if editing
			if (this.existingConnection && this.existingConnection.apiKey) {
				const parts = this.existingConnection.apiKey.split('|');
				if (parts.length >= 2) {
					this.geminiPSIDTSInput.setValue(parts[1]);
				}
			}
		} else if (type === 'siliconflow' || type === 'kimi') {
			const baseUrlGroup = container.createDiv({ cls: 'llmsider-form-group' });
			baseUrlGroup.createEl('label', { text: this.i18n.t('ui.baseUrl'), cls: 'llmsider-form-label' });
			baseUrlGroup.createEl('p', {
				text: this.i18n.t('ui.baseUrlNote'),
				cls: 'llmsider-form-note'
			});
			
			this.baseUrlInput = new TextComponent(baseUrlGroup);
			this.baseUrlInput.setPlaceholder(this.i18n.t('ui.baseUrlPlaceholder'));
			this.baseUrlInput.inputEl.style.width = '100%';
			if (this.existingConnection && this.existingConnection.baseUrl) {
				this.baseUrlInput.setValue(this.existingConnection.baseUrl);
			} else {
				this.baseUrlInput.setValue(type === 'kimi' ? 'https://api.moonshot.cn/v1' : 'https://api.siliconflow.cn/v1');
			}
		} else if (type === 'openai-compatible') {
			// Base URL (required for OpenAI-Compatible)
			const baseUrlGroup = container.createDiv({ cls: 'llmsider-form-group' });
			baseUrlGroup.createEl('label', { text: this.i18n.t('ui.baseUrl'), cls: 'llmsider-form-label' });
			baseUrlGroup.createEl('p', { 
				text: this.i18n.t('ui.baseUrlNote'), 
				cls: 'llmsider-form-note' 
			});
			
			this.baseUrlInput = new TextComponent(baseUrlGroup);
			this.baseUrlInput.setPlaceholder(this.i18n.t('ui.baseUrlPlaceholder'));
			this.baseUrlInput.inputEl.style.width = '100%';
			if (this.existingConnection && this.existingConnection.baseUrl) {
				this.baseUrlInput.setValue(this.existingConnection.baseUrl);
			}
		}
		// Anthropic, Groq, and X.AI don't need extra fields
	}

	private async authenticateGitHub(button: HTMLButtonElement, infoBox: HTMLElement) {
		try {
			button.disabled = true;
			button.textContent = this.i18n.t('settingsPage.githubCopilotAuth.authenticatingButton');

			// Import auth module
			const { GitHubAuth } = await import('../auth/github-auth');

			// Step 1: Get device code
			const deviceCode = await GitHubAuth.getDeviceCode();
			
			// Show user code with copy button
			const statusEl = infoBox.createEl('p', {
				cls: 'llmsider-form-note'
			});
			statusEl.innerHTML = `${this.i18n.t('settingsPage.githubCopilotAuth.pleaseVisit')} <a href="${deviceCode.verification_uri}" target="_blank">${deviceCode.verification_uri}</a> ${this.i18n.t('settingsPage.githubCopilotAuth.andEnterCode')} <strong>${deviceCode.user_code}</strong>`;
			statusEl.style.color = 'var(--text-accent)';
			statusEl.style.marginTop = '12px';

			// Add copy button for the code
			const copyButtonContainer = infoBox.createEl('div');
			copyButtonContainer.style.marginTop = '8px';
			copyButtonContainer.style.display = 'flex';
			copyButtonContainer.style.alignItems = 'center';
			copyButtonContainer.style.gap = '8px';

			const codeDisplay = copyButtonContainer.createEl('code', {
				text: deviceCode.user_code
			});
			codeDisplay.style.padding = '4px 8px';
			codeDisplay.style.backgroundColor = 'var(--background-secondary)';
			codeDisplay.style.borderRadius = '4px';
			codeDisplay.style.fontSize = '14px';
			codeDisplay.style.fontWeight = 'bold';

			const copyBtn = copyButtonContainer.createEl('button', {
				text: this.i18n.t('settingsPage.githubCopilotAuth.copyCodeButton'),
				cls: 'mod-cta'
			});
			copyBtn.style.padding = '4px 12px';
			copyBtn.style.fontSize = '12px';
			copyBtn.onclick = async () => {
				await navigator.clipboard.writeText(deviceCode.user_code);
				const originalText = copyBtn.textContent;
				copyBtn.textContent = this.i18n.t('settingsPage.githubCopilotAuth.codeCopied');
				setTimeout(() => {
					copyBtn.textContent = originalText;
				}, 2000);
			};

			// Step 2: Poll for access token
			const githubToken = await GitHubAuth.pollAccessToken(deviceCode);
			
			// Step 3: Get Copilot token
			const copilotData = await GitHubAuth.getCopilotToken(githubToken);

			// Step 4: Get user info
			const user = await GitHubAuth.getGitHubUser(githubToken);

			// Store tokens temporarily
			this._tempGitHubToken = githubToken;
			this._tempCopilotToken = copilotData.token;
			this._tempTokenExpiry = copilotData.expires_at * 1000;

			// Update UI
			statusEl.innerHTML = `${this.i18n.t('settingsPage.githubCopilotAuth.successfullyAuthenticated')} <strong>${user.login}</strong>`;
			statusEl.style.color = 'var(--text-success)';
			
			button.textContent = this.i18n.t('settingsPage.githubCopilotAuth.reauthenticateButton');
			button.disabled = false;

			new Notice(`${this.i18n.t('settingsPage.githubCopilotAuth.successfullyAuthenticated')} ${user.login}`);
		} catch (error) {
			Logger.error('GitHub authentication failed:', error);
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`${this.i18n.t('settingsPage.githubCopilotAuth.authenticationFailed')}: ${message}`);
			button.textContent = this.i18n.t('settingsPage.githubCopilotAuth.retryAuthentication');
			button.disabled = false;
		}
	}

	private renderProxySettings(container: HTMLElement, beforeInfoBox: boolean = false) {
		// Remove existing proxy section if it exists
		if (this.proxySection) {
			this.proxySection.remove();
		}
		
		// Proxy settings container
		this.proxySection = container.createDiv({ cls: 'llmsider-proxy-settings' });
		this.proxySection.style.marginTop = beforeInfoBox ? '0px' : '24px';
		this.proxySection.style.marginBottom = beforeInfoBox ? '16px' : '0px';		// Enable proxy toggle - always visible
		const proxyEnableGroup = this.proxySection.createDiv({ cls: 'llmsider-form-group' });
		proxyEnableGroup.style.display = 'flex';
		proxyEnableGroup.style.flexDirection = 'row';
		proxyEnableGroup.style.alignItems = 'center';
		proxyEnableGroup.style.justifyContent = 'flex-start';
		proxyEnableGroup.style.gap = '8px';
		
		proxyEnableGroup.createEl('label', { text: this.i18n.t('ui.enableProxy') || 'Enable Proxy' });
		this.proxyEnabledToggle = proxyEnableGroup.createEl('input', { type: 'checkbox' });
		this.proxyEnabledToggle.checked = this.existingConnection?.proxyEnabled || false;

		// Proxy details container - shown only when proxy is enabled
		const proxyDetailsContainer = this.proxySection.createDiv({ cls: 'llmsider-proxy-details' });
		proxyDetailsContainer.style.marginTop = '12px';

		// Proxy type
		const typeGroup = proxyDetailsContainer.createDiv({ cls: 'llmsider-form-group' });
		typeGroup.createEl('label', { text: this.i18n.t('ui.proxyType') || 'Proxy Type', cls: 'llmsider-form-label' });
		this.proxyTypeDropdown = new DropdownComponent(typeGroup);
		this.proxyTypeDropdown.addOption('socks5', 'SOCKS5');
		this.proxyTypeDropdown.addOption('http', 'HTTP');
		this.proxyTypeDropdown.addOption('https', 'HTTPS');
		this.proxyTypeDropdown.setValue(this.existingConnection?.proxyType || 'socks5');
		this.proxyTypeDropdown.selectEl.style.width = '100%';

		// Proxy host
		const hostGroup = proxyDetailsContainer.createDiv({ cls: 'llmsider-form-group' });
		hostGroup.createEl('label', { text: this.i18n.t('ui.proxyHost') || 'Proxy Host', cls: 'llmsider-form-label' });
		this.proxyHostInput = new TextComponent(hostGroup);
		this.proxyHostInput.setPlaceholder('127.0.0.1');
		this.proxyHostInput.inputEl.style.width = '100%';
		if (this.existingConnection?.proxyHost) {
			this.proxyHostInput.setValue(this.existingConnection.proxyHost);
		}

		// Proxy port
		const portGroup = proxyDetailsContainer.createDiv({ cls: 'llmsider-form-group' });
		portGroup.createEl('label', { text: this.i18n.t('ui.proxyPort') || 'Proxy Port', cls: 'llmsider-form-label' });
		this.proxyPortInput = new TextComponent(portGroup);
		this.proxyPortInput.setPlaceholder('1080');
		this.proxyPortInput.inputEl.style.width = '100%';
		this.proxyPortInput.inputEl.type = 'number';
		if (this.existingConnection?.proxyPort) {
			this.proxyPortInput.setValue(String(this.existingConnection.proxyPort));
		}

		// Proxy authentication toggle
		const authGroup = proxyDetailsContainer.createDiv({ cls: 'llmsider-form-group' });
		authGroup.style.display = 'flex';
		authGroup.style.alignItems = 'center';
		authGroup.style.gap = '8px';
		authGroup.style.marginTop = '12px';
		
		this.proxyAuthToggle = authGroup.createEl('input', { type: 'checkbox' });
		this.proxyAuthToggle.checked = this.existingConnection?.proxyAuth || false;
		authGroup.createEl('label', { text: this.i18n.t('ui.proxyRequiresAuth') || 'Proxy requires authentication' });

		// Auth details container
		const authDetailsContainer = proxyDetailsContainer.createDiv({ cls: 'llmsider-proxy-auth-details' });
		authDetailsContainer.style.marginTop = '12px';

		// Username
		const usernameGroup = authDetailsContainer.createDiv({ cls: 'llmsider-form-group' });
		usernameGroup.createEl('label', { text: this.i18n.t('ui.proxyUsername') || 'Username', cls: 'llmsider-form-label' });
		this.proxyUsernameInput = new TextComponent(usernameGroup);
		this.proxyUsernameInput.inputEl.style.width = '100%';
		if (this.existingConnection?.proxyUsername) {
			this.proxyUsernameInput.setValue(this.existingConnection.proxyUsername);
		}

		// Password
		const passwordGroup = authDetailsContainer.createDiv({ cls: 'llmsider-form-group' });
		passwordGroup.createEl('label', { text: this.i18n.t('ui.proxyPassword') || 'Password', cls: 'llmsider-form-label' });
		this.proxyPasswordInput = new TextComponent(passwordGroup);
		this.proxyPasswordInput.inputEl.type = 'password';
		this.proxyPasswordInput.inputEl.style.width = '100%';
		if (this.existingConnection?.proxyPassword) {
			this.proxyPasswordInput.setValue(this.existingConnection.proxyPassword);
		}

		// Toggle visibility logic
		const updateProxyDetailsVisibility = () => {
			proxyDetailsContainer.style.display = this.proxyEnabledToggle!.checked ? 'block' : 'none';
		};

		const updateAuthDetailsVisibility = () => {
			authDetailsContainer.style.display = this.proxyAuthToggle!.checked ? 'block' : 'none';
		};

		this.proxyEnabledToggle.addEventListener('change', updateProxyDetailsVisibility);
		this.proxyAuthToggle.addEventListener('change', updateAuthDetailsVisibility);

		updateProxyDetailsVisibility();
		updateAuthDetailsVisibility();
	}

	private async handleSave() {
		try {
		const type = this.typeDropdown.getValue() as 'openai' | 'anthropic' | 'qwen' | 'free-qwen' | 'free-deepseek' | 'free-gemini' | 'openai-compatible' | 'siliconflow' | 'kimi' | 'azure-openai' | 'ollama' | 'gemini' | 'groq' | 'xai' | 'hugging-chat' | 'github-copilot' | 'opencode' | 'openrouter';
		const name = this.nameInput.getValue().trim();
		let apiKey = (type === 'github-copilot' || type === 'opencode') ? '' : this.apiKeyInput.getValue().trim();
			
			// For Free Gemini, combine the two cookie fields
			if (type === 'free-gemini') {
				const psid = this.geminiPSIDInput?.getValue().trim() || '';
				const psidts = this.geminiPSIDTSInput?.getValue().trim() || '';
				
				if (!psid || !psidts) {
					new Notice(this.i18n.t('ui.bothCookiesRequired'));
					if (!psid) {
						this.geminiPSIDInput?.inputEl.focus();
					} else {
						this.geminiPSIDTSInput?.inputEl.focus();
					}
					this.restoreSaveButton();
					return;
				}
				
				// Combine with | separator
				apiKey = `${psid}|${psidts}`;
			}
			
			Logger.debug('[ConnectionModal] Saving connection:', { name, type, hasApiKey: !!apiKey });
			
			// Validation
			if (!name) {
				new Notice(this.i18n.t('ui.connectionNameRequired'));
				this.nameInput.inputEl.focus();
				this.restoreSaveButton();
				return;
			}
			
			if (!type) {
				Logger.error('[ConnectionModal] Type is empty!', { dropdownValue: this.typeDropdown.getValue() });
				new Notice(this.i18n.t('ui.connectionTypeRequired'));
				this.restoreSaveButton();
				return;
			}

		if (type !== 'github-copilot' && type !== 'ollama' && type !== 'opencode' && !apiKey) {
			new Notice(this.i18n.t('ui.apiKeyRequired'));
			this.apiKeyInput.inputEl.focus();
			this.restoreSaveButton();
			return;
		}			// GitHub Copilot specific validation
			if (type === 'github-copilot') {
				const tempGitHubToken = this._tempGitHubToken;
				if (!tempGitHubToken && !this.existingConnection?.githubToken) {
					new Notice(this.i18n.t('settingsPage.githubCopilotAuth.pleaseAuthenticateFirst'));
					this.restoreSaveButton();
					return;
				}
			}

			// Type-specific validation
			let baseUrl: string | undefined;
			let organizationId: string | undefined;
			let region: string | undefined;
			let deploymentName: string | undefined;
			let apiVersion: string | undefined;

			if (type === 'azure-openai') {
				baseUrl = this.baseUrlInput?.getValue().trim();
				deploymentName = this.deploymentNameInput?.getValue().trim();
				apiVersion = this.apiVersionInput?.getValue().trim() || undefined;
				
				if (!baseUrl) {
					new Notice(this.i18n.t('ui.azureEndpointRequired'));
					this.baseUrlInput?.inputEl.focus();
					this.restoreSaveButton();
					return;
				}
				if (!deploymentName) {
					new Notice(this.i18n.t('ui.deploymentNameRequired'));
					this.deploymentNameInput?.inputEl.focus();
					this.restoreSaveButton();
					return;
				}
		} else if (type === 'ollama' || type === 'openai-compatible') {
			baseUrl = this.baseUrlInput?.getValue().trim();
			if (!baseUrl) {
				const typeLabel = type === 'ollama' ? 'Ollama' : 'OpenAI-Compatible';
				new Notice(this.i18n.t('ui.baseUrlRequired', { type: typeLabel }));
				this.baseUrlInput?.inputEl.focus();
				this.restoreSaveButton();
				return;
			}
		} else if (type === 'siliconflow') {
			baseUrl = this.baseUrlInput?.getValue().trim() || 'https://api.siliconflow.cn/v1';
		} else if (type === 'kimi') {
			baseUrl = this.baseUrlInput?.getValue().trim() || 'https://api.moonshot.cn/v1';
		} else if (type === 'openai') {
				organizationId = this.organizationIdInput?.getValue().trim() || undefined;
			} else if (type === 'gemini' || type === 'qwen' || type === 'free-qwen' || type === 'free-deepseek' || type === 'free-gemini') {
				region = this.regionInput?.getValue().trim() || undefined;
			}

			// Proxy configuration
			const proxyEnabled = this.proxyEnabledToggle?.checked || false;
			const proxyType = this.proxyTypeDropdown?.getValue() as 'socks5' | 'http' | 'https' | undefined;
			const proxyHost = this.proxyHostInput?.getValue().trim();
			const proxyPort = this.proxyPortInput?.getValue().trim() ? parseInt(this.proxyPortInput.getValue().trim()) : undefined;
			const proxyAuth = this.proxyAuthToggle?.checked || false;
			const proxyUsername = this.proxyUsernameInput?.getValue().trim();
			const proxyPassword = this.proxyPasswordInput?.getValue().trim();

			const connection: LLMConnection = {
				id: this.existingConnection?.id || `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				name,
				type,
				apiKey,
				baseUrl,
				organizationId,
				region,
				deploymentName,
				apiVersion,
				// GitHub Copilot specific fields
				githubToken: type === 'github-copilot' ? (this._tempGitHubToken || this.existingConnection?.githubToken) : undefined,
				copilotToken: type === 'github-copilot' ? (this._tempCopilotToken || this.existingConnection?.copilotToken) : undefined,
				tokenExpiry: type === 'github-copilot' ? (this._tempTokenExpiry || this.existingConnection?.tokenExpiry) : undefined,
				// Proxy configuration
				proxyEnabled,
				proxyType: proxyEnabled ? proxyType : undefined,
				proxyHost: proxyEnabled ? proxyHost : undefined,
				proxyPort: proxyEnabled ? proxyPort : undefined,
				proxyAuth: proxyEnabled ? proxyAuth : undefined,
				proxyUsername: proxyEnabled && proxyAuth ? proxyUsername : undefined,
				proxyPassword: proxyEnabled && proxyAuth ? proxyPassword : undefined,
				enabled: this.existingConnection?.enabled ?? true,
				created: this.existingConnection?.created || Date.now(),
				updated: Date.now()
			};

			// Debug log for GitHub Copilot
			if (type === 'github-copilot') {
				Logger.debug('Saving GitHub Copilot connection:', {
					hasGithubToken: !!connection.githubToken,
					hasCopilotToken: !!connection.copilotToken,
					tokenExpiry: connection.tokenExpiry ? new Date(connection.tokenExpiry).toISOString() : 'none'
				});
			}

			await this.onSave(connection);
			new Notice(this.i18n.t('ui.connectionSaved', { name }));
			this.close();
		} catch (error) {
			Logger.error('Error saving connection:', error);
			new Notice(this.i18n.t('ui.failedToSaveConnection'));
			this.restoreSaveButton();
		}
	}

	/**
	 * Restore save button to enabled state
	 */
	private restoreSaveButton() {
		if (this.saveButton) {
			this.saveButton.disabled = false;
			this.saveButton.textContent = this.i18n.t('ui.save');
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
