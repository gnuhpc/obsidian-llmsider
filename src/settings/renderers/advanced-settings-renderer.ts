import { Notice, Setting } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import type { ConnectionModelRenderer } from './connection-model-renderer';

/**
 * AdvancedSettingsRenderer
 * Handles rendering of Advanced Settings section including:
 * - Google Search settings (delegated to ConnectionModelRenderer)
 * - Auto-completion settings (delegated to ConnectionModelRenderer)
 * - Quick Chat settings
 * - Other advanced settings (language, debug logging, etc.)
 */
export class AdvancedSettingsRenderer {
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;
	private connectionModelRenderer: ConnectionModelRenderer;

	constructor(
		plugin: LLMSiderPlugin,
		i18n: I18nManager,
		connectionModelRenderer: ConnectionModelRenderer
	) {
		this.plugin = plugin;
		this.i18n = i18n;
		this.connectionModelRenderer = connectionModelRenderer;
	}

	/**
	 * Main entry point - renders the complete Advanced Settings section
	 */
	render(containerEl: HTMLElement): void {
		// Advanced Settings Header
		const advancedHeader = containerEl.createEl('h2', { text: this.i18n.t('settingsPage.advancedSettings') });
		advancedHeader.style.marginTop = '20px';
		advancedHeader.style.marginBottom = '12px';
		advancedHeader.style.fontSize = '16px';
		advancedHeader.style.fontWeight = '600';

		// Render Google Search settings section (delegated)
		this.connectionModelRenderer.renderGoogleSearchSettings(containerEl);

		// Render Auto-completion settings section (delegated)
		this.connectionModelRenderer.renderAutocompletionSettings(containerEl);

		// Render Quick Chat settings section
		this.renderQuickChatSettings(containerEl);

		// Render other advanced settings
		this.renderOtherAdvancedSettings(containerEl);
	}

	/**
	 * Renders Quick Chat settings section
	 */
	private renderQuickChatSettings(containerEl: HTMLElement): void {
		// Container with border
		const quickChatContainer = containerEl.createDiv({ cls: 'llmsider-settings-section-container' });
		
		// Section Header
		const quickChatHeader = quickChatContainer.createEl('h3', { 
			text: this.i18n.t('settingsPage.quickChat')
		});
		quickChatHeader.style.marginTop = '0px';
		quickChatHeader.style.marginBottom = '12px';
		quickChatHeader.style.fontSize = '14px';
		quickChatHeader.style.fontWeight = '600';
		quickChatHeader.style.color = 'var(--text-normal)';

		// Global enable/disable toggle for quick chat
		new Setting(quickChatContainer)
			.setName(this.i18n.t('quickChat.enabled'))
			.setDesc(this.i18n.t('quickChat.enabledDesc'))
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.inlineQuickChat.enabled);
				toggle.onChange(async (value) => {
					this.plugin.settings.inlineQuickChat.enabled = value;
					await this.plugin.saveSettings();
					
					if (value) {
						const message = this.i18n.t('quickChat.enabledNotice').replace('{key}', this.plugin.settings.inlineQuickChat.triggerKey);
						new Notice(message);
					} else {
						new Notice(this.i18n.t('quickChat.disabledNotice'));
					}
				});
			});

		// Show on selection toggle
		new Setting(quickChatContainer)
			.setName(this.i18n.t('quickChat.showOnSelection'))
			.setDesc(this.i18n.t('quickChat.showOnSelectionDesc'))
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.inlineQuickChat.showOnSelection);
				toggle.onChange(async (value) => {
					this.plugin.settings.inlineQuickChat.showOnSelection = value;
					await this.plugin.saveSettings();
				});
			});

		// Enable diff preview toggle
		new Setting(quickChatContainer)
			.setName(this.i18n.t('quickChat.enableDiffPreview'))
			.setDesc(this.i18n.t('quickChat.enableDiffPreviewDesc'))
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.inlineQuickChat.enableDiffPreview);
				toggle.onChange(async (value) => {
					this.plugin.settings.inlineQuickChat.enableDiffPreview = value;
					await this.plugin.saveSettings();
				});
			});

		// Show Quick Chat button toggle
		new Setting(quickChatContainer)
			.setName(this.i18n.t('quickChat.showQuickChatButton'))
			.setDesc(this.i18n.t('quickChat.showQuickChatButtonDesc'))
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.inlineQuickChat.showQuickChatButton);
				toggle.onChange(async (value) => {
					this.plugin.settings.inlineQuickChat.showQuickChatButton = value;
					await this.plugin.saveSettings();
				});
			});
	}

	/**
	 * Renders other advanced settings (language, logging, etc.)
	 */
	private renderOtherAdvancedSettings(containerEl: HTMLElement): void {
		// Container with border
		const otherContainer = containerEl.createDiv({ cls: 'llmsider-settings-section-container' });
		
		// Section Header
		const otherHeader = otherContainer.createEl('h3', { 
			text: this.i18n.t('settingsPage.otherSettings')
		});
		otherHeader.style.marginTop = '0px';
		otherHeader.style.marginBottom = '12px';
		otherHeader.style.fontSize = '14px';
		otherHeader.style.fontWeight = '600';
		otherHeader.style.color = 'var(--text-normal)';

		new Setting(otherContainer)
			.setName(this.i18n.t('settingsPage.language'))
			.setDesc(this.i18n.t('settingsPage.languageDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption('en', 'English');
				dropdown.addOption('zh', '中文');

				dropdown.setValue(this.plugin.settings.i18n.language);
				dropdown.onChange(async (value) => {
					this.plugin.settings.i18n.language = value as 'en' | 'zh';
					await this.plugin.saveSettings();

					// Update i18n manager with new language
					const i18nManager = this.plugin.getI18nManager();
					if (i18nManager) {
						i18nManager.setLanguage(value as 'en' | 'zh');
					}

					new Notice(`Language changed to ${dropdown.selectEl.selectedOptions[0].text}`);

					// Refresh the settings page to show updated language
					// Use requestAnimationFrame to ensure proper re-rendering
					requestAnimationFrame(() => {
						// Call display on the settings tab
						// Note: This requires the display callback to be available
						// The parent settings tab will handle the refresh
					});
				});
			});

		// Max Chat History
		new Setting(otherContainer)
			.setName(this.i18n.t('settingsPage.maxChatHistory'))
			.setDesc(this.i18n.t('settingsPage.maxChatHistoryDesc'))
			.addSlider(slider => {
				slider.setLimits(10, 200, 10);
				slider.setValue(this.plugin.settings.maxChatHistory);
				slider.setDynamicTooltip();
				slider.onChange(async (value) => {
					this.plugin.settings.maxChatHistory = value;
					await this.plugin.saveSettings();
				});
			});

		// Show "Add to Context" button when text is selected
		new Setting(otherContainer)
			.setName(this.i18n.t('selectionPopup.showAddToContextButton'))
			.setDesc(this.i18n.t('selectionPopup.showAddToContextButtonDesc'))
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.selectionPopup.showAddToContext);
				toggle.onChange(async (value) => {
					this.plugin.settings.selectionPopup.showAddToContext = value;
					await this.plugin.saveSettings();
				});
			});

		// Enable Debug Logging
		new Setting(otherContainer)
			.setName(this.i18n.t('ui.enableDebugLogging'))
			.setDesc(this.i18n.t('ui.enableDebugLoggingDesc'))
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.enableDebugLogging);
				toggle.onChange(async (value) => {
					this.plugin.settings.enableDebugLogging = value;
					await this.plugin.saveSettings();
					
					// Update logger state
					const { Logger } = await import('../../utils/logger');
					Logger.setDebugEnabled(value);
					
					new Notice(value ? 'Debug logging enabled' : 'Debug logging disabled');
				});
			});

		// Tool Confirmation Setting (Unified for both MCP and Built-in tools)
		new Setting(otherContainer)
			.setName(this.i18n.t('settingsPage.requireConfirmationForTools'))
			.setDesc(this.i18n.t('settingsPage.requireConfirmationForToolsDesc'))
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.requireConfirmationForTools);
				toggle.onChange(async (value) => {
					this.plugin.settings.requireConfirmationForTools = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
