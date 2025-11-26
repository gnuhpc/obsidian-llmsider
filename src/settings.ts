// Simplified settings for lite version

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import LLMSiderLitePlugin from './main';
import { LLMProvider, ProviderType } from './types';

export class LLMSiderLiteSettingTab extends PluginSettingTab {
	plugin: LLMSiderLitePlugin;

	constructor(app: App, plugin: LLMSiderLitePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Providers section
		new Setting(containerEl)
			.setName('Providers')
			.setHeading();

		this.plugin.settings.providers.forEach((provider, index) => {
			this.renderProviderSettings(containerEl, provider, index);
		});

		// Add provider button
		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add provider')
				.onClick(() => this.addProvider()));
	}

	private renderProviderSettings(containerEl: HTMLElement, provider: LLMProvider, index: number) {
		const section = containerEl.createDiv({ cls: 'llmsider-lite-provider-section' });

		new Setting(section)
			.setName(`Provider ${index + 1}: ${provider.name}`)
			.setHeading();

		// Provider type
		new Setting(section)
			.setName('Type')
			.addDropdown(dropdown => dropdown
				.addOption('openai', 'Openai')
				.addOption('anthropic', 'Anthropic')
				.addOption('openai-compatible', 'Openai-compatible')
				.setValue(provider.type)
				.onChange(async (value) => {
					provider.type = value as ProviderType;
					await this.plugin.saveSettings();
					this.display();
				}));

		// Name
		new Setting(section)
			.setName('Display name')
			.addText(text => text
				.setValue(provider.name)
				.onChange(async (value) => {
					provider.name = value;
					await this.plugin.saveSettings();
				}));

		// API Key
		new Setting(section)
			.setName('API key')
			.addText(text => text
				.setValue(provider.apiKey)
				.onChange(async (value) => {
					provider.apiKey = value;
					await this.plugin.saveSettings();
				}));

		// Base URL for OpenAI Compatible
		if (provider.type === 'openai-compatible') {
			new Setting(section)
				.setName('Base URL')
				.setDesc('API base URL ending with /v1 (e.g., http://88.218.77.120:8888/v1)')
				.addText(text => text
					.setPlaceholder('HTTP://your-server:8888/v1')
					.setValue(provider.baseUrl || '')
					.onChange(async (value) => {
						// Normalize: trim and remove trailing slash
						let normalizedValue = value.trim().replace(/\/$/, '');
						provider.baseUrl = normalizedValue;
						
						// Validate URL format
						if (normalizedValue) {
						try {
							const url = new URL(normalizedValue);
							if (!['http:', 'https:'].includes(url.protocol)) {
								new Notice('Base URL must use HTTP or HTTPS protocol');
							} else if (!normalizedValue.endsWith('/v1')) {
								new Notice('Warning: base URL should typically end with /v1');
							}
						} catch {
							new Notice('Invalid URL format. Example: http://88.218.77.120:8888/v1');
						}
						}
						await this.plugin.saveSettings();
					}));
		}

		// Model
		new Setting(section)
			.setName('Model')
			.addText(text => text
				.setPlaceholder('Gpt-4, claude-3-5-sonnet-20241022, etc.')
				.setValue(provider.model)
				.onChange(async (value) => {
					provider.model = value;
					await this.plugin.saveSettings();
				}));

		// Max Tokens
		new Setting(section)
			.setName('Max tokens')
			.addText(text => text
				.setValue(provider.maxTokens.toString())
				.onChange(async (value) => {
					const tokens = parseInt(value);
					if (!isNaN(tokens)) {
						provider.maxTokens = tokens;
						await this.plugin.saveSettings();
					}
				}));

		// Temperature
		new Setting(section)
			.setName('Temperature')
			.addSlider(slider => slider
				.setLimits(0, 2, 0.1)
				.setValue(provider.temperature)
				.setDynamicTooltip()
				.onChange(async (value) => {
					provider.temperature = value;
					await this.plugin.saveSettings();
				}));

		// Enabled
		new Setting(section)
			.setName('Enabled')
			.addToggle(toggle => toggle
				.setValue(provider.enabled)
				.onChange(async (value) => {
					provider.enabled = value;
					await this.plugin.saveSettings();
				}));

		// Delete button
		new Setting(section)
			.addButton(button => button
				.setButtonText('Delete provider')
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.providers.splice(index, 1);
					await this.plugin.saveSettings();
					this.display();
					new Notice('Provider deleted');
				}));
	}

	private addProvider(): void {
		const newProvider: LLMProvider = {
			id: Date.now().toString(),
			type: 'openai',
			name: 'New Provider',
			apiKey: '',
			model: 'gpt-4',
			maxTokens: 4096,
			temperature: 0.7,
			enabled: true
		};

		this.plugin.settings.providers.push(newProvider);
		void this.plugin.saveSettings();
		this.display();
		new Notice('Provider added');
	}
}
