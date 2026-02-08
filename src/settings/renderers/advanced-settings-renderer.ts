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
		const advancedHeader = containerEl.createEl('h2', { 
			text: this.i18n.t('settingsPage.advancedSettings'),
			cls: 'llmsider-section-header'
		});

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
			text: this.i18n.t('settingsPage.quickChat'),
			cls: 'llmsider-subsection-header'
		});

		let showOnSelectionSetting: Setting;
		let enableDiffPreviewSetting: Setting;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let showOnSelectionToggle: any;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let enableDiffPreviewToggle: any;

		// Global enable/disable toggle for quick chat
		new Setting(quickChatContainer)
			.setName(this.i18n.t('quickChat.enabled'))
			.setDesc(this.i18n.t('quickChat.enabledDesc'))
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.inlineQuickChat.enabled);
				toggle.onChange(async (value) => {
					this.plugin.settings.inlineQuickChat.enabled = value;
					await this.plugin.saveSettings();
					
					// Update disabled state of other settings
					if (showOnSelectionSetting) showOnSelectionSetting.setDisabled(!value);
					if (enableDiffPreviewSetting) enableDiffPreviewSetting.setDisabled(!value);
					
					// Explicitly disable toggles to ensure visual feedback
					if (showOnSelectionToggle) showOnSelectionToggle.setDisabled(!value);
					if (enableDiffPreviewToggle) enableDiffPreviewToggle.setDisabled(!value);

					if (value) {
						const message = this.i18n.t('quickChat.enabledNotice').replace('{key}', this.plugin.settings.inlineQuickChat.triggerKey);
						new Notice(message);
					} else {
						new Notice(this.i18n.t('quickChat.disabledNotice'));
					}
				});
			});

		// Show on selection toggle (also controls Quick Chat button visibility)
		showOnSelectionSetting = new Setting(quickChatContainer)
			.setName(this.i18n.t('quickChat.showOnSelection'))
			.setDesc(this.i18n.t('quickChat.showOnSelectionDesc'))
			.setDisabled(!this.plugin.settings.inlineQuickChat.enabled)
			.addToggle(toggle => {
				showOnSelectionToggle = toggle;
				toggle.setValue(this.plugin.settings.inlineQuickChat.showOnSelection);
				toggle.setDisabled(!this.plugin.settings.inlineQuickChat.enabled);
				toggle.onChange(async (value) => {
					this.plugin.settings.inlineQuickChat.showOnSelection = value;
					await this.plugin.saveSettings();
				});
			});

		// Enable diff preview toggle
		enableDiffPreviewSetting = new Setting(quickChatContainer)
			.setName(this.i18n.t('quickChat.enableDiffPreview'))
			.setDesc(this.i18n.t('quickChat.enableDiffPreviewDesc'))
			.setDisabled(!this.plugin.settings.inlineQuickChat.enabled)
			.addToggle(toggle => {
				enableDiffPreviewToggle = toggle;
				toggle.setValue(this.plugin.settings.inlineQuickChat.enableDiffPreview);
				toggle.setDisabled(!this.plugin.settings.inlineQuickChat.enabled);
				toggle.onChange(async (value) => {
					this.plugin.settings.inlineQuickChat.enableDiffPreview = value;
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
			text: this.i18n.t('settingsPage.otherSettings'),
			cls: 'llmsider-subsection-header'
		});

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
						
					// Update built-in prompts with new language translations
					this.plugin.configDb.updateBuiltInPromptsTranslations();
				}

				const i18n = this.plugin.getI18nManager();
				new Notice(i18n?.t('notifications.settingsHandlers.languageChanged', { language: dropdown.selectEl.selectedOptions[0].text }) || `Language changed to ${dropdown.selectEl.selectedOptions[0].text}`);

				// Refresh the settings page to show updated language
				// Get the settings tab and call display to refresh
				const settingsTab = (this.plugin.app as any).setting?.activeTab;
				if (settingsTab && typeof settingsTab.display === 'function') {
					await settingsTab.display();
			}
		});
	})
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

		// Max Built-in Tools Selection
		new Setting(otherContainer)
			.setName(this.i18n.t('settingsPage.maxBuiltInToolsSelection'))
			.setDesc(this.i18n.t('settingsPage.maxBuiltInToolsSelectionDesc'))
			.addText(text => {
				text.setPlaceholder('64')
					.setValue(String(this.plugin.settings.maxBuiltInToolsSelection))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.plugin.settings.maxBuiltInToolsSelection = num;
							await this.plugin.saveSettings();
						}
					});
				text.inputEl.type = 'number';
				text.inputEl.min = '1';
			});

		// Max MCP Tools Selection
		new Setting(otherContainer)
			.setName(this.i18n.t('settingsPage.maxMCPToolsSelection'))
			.setDesc(this.i18n.t('settingsPage.maxMCPToolsSelectionDesc'))
			.addText(text => {
				text.setPlaceholder('64')
					.setValue(String(this.plugin.settings.maxMCPToolsSelection))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.plugin.settings.maxMCPToolsSelection = num;
							await this.plugin.saveSettings();
						}
					});
				text.inputEl.type = 'number';
				text.inputEl.min = '1';
			});

		// Plan Execution Mode
		new Setting(otherContainer)
			.setName(this.i18n.t('settingsPage.planExecutionMode'))
			.setDesc(this.i18n.t('settingsPage.planExecutionModeDesc'))
			.addDropdown(dropdown => {
				dropdown.addOption('sequential', this.i18n.t('settingsPage.planExecutionModeSequential'));
				dropdown.addOption('dag', this.i18n.t('settingsPage.planExecutionModeDAG'));

				dropdown.setValue(this.plugin.settings.planExecutionMode);
				dropdown.onChange(async (value) => {
					const mode = value as 'sequential' | 'dag';
					this.plugin.settings.planExecutionMode = mode;
					await this.plugin.saveSettings();
					// Persist to database
					await this.plugin.configDb.setPlanExecutionMode(mode);
					new Notice(this.i18n.t('settingsPage.planExecutionModeChanged', { mode: dropdown.selectEl.selectedOptions[0].text }));
				});
			});

	}
}
