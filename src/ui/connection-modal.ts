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

	constructor(
		app: App,
		plugin: LLMSiderPlugin,
		onSave: (connection: LLMConnection) => Promise<void>,
		existingConnection?: LLMConnection
	) {
		super(app);
		this.plugin = plugin;
		this.existingConnection = existingConnection;
		this.onSave = onSave;
		this.i18n = plugin.getI18nManager()!;
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
		typeGroup.createEl('label', { text: this.i18n.t('ui.connectionType'), cls: 'llmsider-form-label' });
		this.typeDropdown = new DropdownComponent(typeGroup);
		this.typeDropdown.addOption('openai', 'OpenAI');
		this.typeDropdown.addOption('anthropic', 'Anthropic');
		this.typeDropdown.addOption('azure-openai', 'Azure OpenAI');
		this.typeDropdown.addOption('github-copilot', 'GitHub Copilot');
		this.typeDropdown.addOption('gemini', 'Google Gemini');
		this.typeDropdown.addOption('groq', 'Groq');
		this.typeDropdown.addOption('ollama', 'Ollama');
		this.typeDropdown.addOption('qwen', 'Qwen (通义千问)');
		this.typeDropdown.addOption('huggingface', 'Hugging Face (Local)');
		this.typeDropdown.addOption('openai-compatible', 'OpenAI-Compatible');
		this.typeDropdown.selectEl.style.width = '100%';
		this.typeDropdown.selectEl.style.boxSizing = 'border-box';
		
		if (this.existingConnection) {
			this.typeDropdown.setValue(this.existingConnection.type);
			// Disable type change when editing
			this.typeDropdown.setDisabled(true);
		} else {
			this.typeDropdown.setValue('openai');
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
		this.renderDynamicFields(dynamicFieldsContainer, this.typeDropdown.getValue() as any);

		// Update dynamic fields when type changes
		this.typeDropdown.onChange((value) => {
			this.renderDynamicFields(dynamicFieldsContainer, value as any);
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
		saveButton.onclick = () => this.handleSave();
	}

	private renderDynamicFields(container: HTMLElement, type: 'openai' | 'anthropic' | 'qwen' | 'openai-compatible' | 'azure-openai' | 'ollama' | 'gemini' | 'groq' | 'huggingface' | 'github-copilot') {
		container.empty();

		if (type === 'github-copilot') {
			// GitHub Copilot - show authentication button
			const infoGroup = container.createDiv({ cls: 'llmsider-form-group' });
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
		} else if (type === 'huggingface') {
			// Hugging Face local models - show info message
			const infoGroup = container.createDiv({ cls: 'llmsider-form-group' });
			const infoBox = infoGroup.createDiv({ cls: 'llmsider-info-box' });
			infoBox.style.padding = '12px';
			infoBox.style.backgroundColor = 'var(--background-secondary)';
			infoBox.style.borderRadius = '4px';
			infoBox.style.marginTop = '8px';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingFaceLocalModelsTitle'),
				cls: 'llmsider-info-title'
			}).style.fontWeight = 'bold';

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingFaceLocalModelsDesc'),
				cls: 'llmsider-form-note'
			});

			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingFaceLocalModelsBrowserRun'),
				cls: 'llmsider-form-note'
			});
			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingFaceLocalModelsWebGPU'),
				cls: 'llmsider-form-note'
			});
			infoBox.createEl('p', {
				text: this.i18n.t('ui.huggingFaceLocalModelsEmbeddingOnly'),
				cls: 'llmsider-form-note'
			});

			// Hide API key field for Hugging Face
			const apiKeyGroup = this.apiKeyInput.inputEl.closest('.llmsider-form-group') as HTMLElement;
			if (apiKeyGroup) {
				apiKeyGroup.style.display = 'none';
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
			// Base URL (required for Ollama)
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
		// Anthropic and Groq don't need extra fields
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
			(this as any)._tempGitHubToken = githubToken;
			(this as any)._tempCopilotToken = copilotData.token;
			(this as any)._tempTokenExpiry = copilotData.expires_at * 1000;

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

	private async handleSave() {
		try {
			const type = this.typeDropdown.getValue() as 'openai' | 'anthropic' | 'qwen' | 'openai-compatible' | 'azure-openai' | 'ollama' | 'gemini' | 'groq' | 'huggingface' | 'github-copilot';
			const name = this.nameInput.getValue().trim();
			const apiKey = (type === 'huggingface' || type === 'github-copilot') ? '' : this.apiKeyInput.getValue().trim();

			// Validation
			if (!name) {
				new Notice(this.i18n.t('ui.connectionNameRequired'));
				this.nameInput.inputEl.focus();
				return;
			}

			// API key not required for Hugging Face and GitHub Copilot
			if (type !== 'huggingface' && type !== 'github-copilot' && !apiKey) {
				new Notice(this.i18n.t('ui.apiKeyRequired'));
				this.apiKeyInput.inputEl.focus();
				return;
			}

			// GitHub Copilot specific validation
			if (type === 'github-copilot') {
				const tempGitHubToken = (this as any)._tempGitHubToken;
				if (!tempGitHubToken && !this.existingConnection?.githubToken) {
					new Notice(this.i18n.t('settingsPage.githubCopilotAuth.pleaseAuthenticateFirst'));
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
					return;
				}
				if (!deploymentName) {
					new Notice(this.i18n.t('ui.deploymentNameRequired'));
					this.deploymentNameInput?.inputEl.focus();
					return;
				}
			} else if (type === 'ollama' || type === 'openai-compatible') {
				baseUrl = this.baseUrlInput?.getValue().trim();
				if (!baseUrl) {
					const typeLabel = type === 'ollama' ? 'Ollama' : 'OpenAI-Compatible';
					new Notice(this.i18n.t('ui.baseUrlRequired', { type: typeLabel }));
					this.baseUrlInput?.inputEl.focus();
					return;
				}
			} else if (type === 'openai') {
				organizationId = this.organizationIdInput?.getValue().trim() || undefined;
			} else if (type === 'gemini' || type === 'qwen') {
				region = this.regionInput?.getValue().trim() || undefined;
			}

			const connection: LLMConnection = {
				id: this.existingConnection?.id || `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				name,
				type,
				apiKey,
				baseUrl,
				organizationId,
				region,
				deploymentName,
				apiVersion,
				// GitHub Copilot specific fields
				githubToken: type === 'github-copilot' ? ((this as any)._tempGitHubToken || this.existingConnection?.githubToken) : undefined,
				copilotToken: type === 'github-copilot' ? ((this as any)._tempCopilotToken || this.existingConnection?.copilotToken) : undefined,
				tokenExpiry: type === 'github-copilot' ? ((this as any)._tempTokenExpiry || this.existingConnection?.tokenExpiry) : undefined,
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
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
