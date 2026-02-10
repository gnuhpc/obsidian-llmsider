import { App, Setting, Notice, DropdownComponent } from 'obsidian';
import { Logger } from '../../utils/logger';
import LLMSiderPlugin from '../../main';
import { I18nManager } from '../../i18n/i18n-manager';

/**
 * MemorySettingsRenderer handles the rendering of Memory System settings section
 * Includes Working Memory, Conversation History, and Semantic Recall configuration
 */
export class MemorySettingsRenderer {
	private app: App;
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;

	constructor(app: App, plugin: LLMSiderPlugin, i18n: I18nManager) {
		this.app = app;
		this.plugin = plugin;
		this.i18n = i18n;
	}

	/**
	 * Main render method for Memory System settings
	 */
	async render(containerEl: HTMLElement): Promise<void> {
		// Memory Settings Header
		const memoryHeader = containerEl.createEl('h2', { 
			text: this.i18n.t('settingsPage.memory.title'),
			cls: 'llmsider-section-header'
		});

		// Description
		const descriptionDiv = containerEl.createDiv({ cls: 'llmsider-section-description' });
		descriptionDiv.textContent = this.i18n.t('settingsPage.memory.description');

		// Settings container with border
		const settingsContainer = containerEl.createDiv({
			cls: 'llmsider-settings-section-container'
		});

		// Working Memory Section
		await this.renderWorkingMemorySettings(settingsContainer);

		// Conversation History Section
		await this.renderConversationHistorySettings(settingsContainer);
	}

	/**
	 * Render Working Memory settings
	 */
	private async renderWorkingMemorySettings(containerEl: HTMLElement): Promise<void> {
		// Load current settings from SQLite
		const savedEnableWorkingMemory = await this.plugin.configDb.getConfigValue('memory_enableWorkingMemory');
		const enableWorkingMemory = savedEnableWorkingMemory !== null 
			? savedEnableWorkingMemory === 'true' 
			: this.plugin.settings.memorySettings.enableWorkingMemory;

		const savedWorkingMemoryScope = await this.plugin.configDb.getConfigValue('memory_workingMemoryScope');
		const workingMemoryScope = (savedWorkingMemoryScope as 'resource' | 'thread') 
			|| this.plugin.settings.memorySettings.workingMemoryScope;

		// Update settings object
		this.plugin.settings.memorySettings.enableWorkingMemory = enableWorkingMemory;
		this.plugin.settings.memorySettings.workingMemoryScope = workingMemoryScope;

		// Enable Working Memory Toggle
		new Setting(containerEl)
			.setName(this.i18n.t('settingsPage.memory.enableWorkingMemory'))
			.setDesc(this.i18n.t('settingsPage.memory.enableWorkingMemoryDesc'))
			.addToggle(toggle => toggle
				.setValue(enableWorkingMemory)
				.onChange(async (value) => {
					this.plugin.settings.memorySettings.enableWorkingMemory = value;
					await this.plugin.saveSettings();
					
					// Reinitialize Memory Manager with new settings
					await this.reinitializeMemoryManager();
					
					Logger.info('[MemorySettings] Working Memory', value ? 'enabled' : 'disabled');
				}));

		// Working Memory Scope Dropdown
		new Setting(containerEl)
			.setName(this.i18n.t('settingsPage.memory.workingMemoryScope'))
			.setDesc(this.i18n.t('settingsPage.memory.workingMemoryScopeDesc'))
			.addDropdown(dropdown => {
				dropdown
					.addOption('resource', this.i18n.t('settingsPage.memory.scopeResource'))
					.addOption('thread', this.i18n.t('settingsPage.memory.scopeThread'))
					.setValue(workingMemoryScope)
					.onChange(async (value: 'resource' | 'thread') => {
						this.plugin.settings.memorySettings.workingMemoryScope = value;
						await this.plugin.saveSettings();
						
						// Reinitialize Memory Manager with new settings
						await this.reinitializeMemoryManager();
						
						Logger.info('[MemorySettings] Working Memory Scope changed to:', value);
					});
			});
	}

	/**
	 * Render Conversation History settings
	 */
	private async renderConversationHistorySettings(containerEl: HTMLElement): Promise<void> {
		// Load current settings from SQLite
		const savedEnableHistory = await this.plugin.configDb.getConfigValue('memory_enableConversationHistory');
		const enableHistory = savedEnableHistory !== null 
			? savedEnableHistory === 'true' 
			: this.plugin.settings.memorySettings.enableConversationHistory;

		const savedHistoryLimit = await this.plugin.configDb.getConfigValue('memory_conversationHistoryLimit');
		const historyLimit = savedHistoryLimit !== null 
			? parseInt(savedHistoryLimit, 10) 
			: this.plugin.settings.memorySettings.conversationHistoryLimit;

		// Load compaction settings from SQLite
		const savedEnableCompaction = await this.plugin.configDb.getConfigValue('memory_enableCompaction');
		const enableCompaction = savedEnableCompaction !== null 
			? savedEnableCompaction === 'true' 
			: this.plugin.settings.memorySettings.enableCompaction;

		const savedCompactionThreshold = await this.plugin.configDb.getConfigValue('memory_compactionThreshold');
		const compactionThreshold = savedCompactionThreshold !== null 
			? parseInt(savedCompactionThreshold, 10) 
			: this.plugin.settings.memorySettings.compactionThreshold;

		const savedCompactionTarget = await this.plugin.configDb.getConfigValue('memory_compactionTarget');
		const compactionTarget = savedCompactionTarget !== null 
			? parseInt(savedCompactionTarget, 10) 
			: this.plugin.settings.memorySettings.compactionTarget;

		const savedCompactionPreserveCount = await this.plugin.configDb.getConfigValue('memory_compactionPreserveCount');
		const compactionPreserveCount = savedCompactionPreserveCount !== null 
			? parseInt(savedCompactionPreserveCount, 10) 
			: this.plugin.settings.memorySettings.compactionPreserveCount;

		const savedCompactionModel = await this.plugin.configDb.getConfigValue('memory_compactionModel');
		const compactionModel = savedCompactionModel !== null 
			? savedCompactionModel 
			: this.plugin.settings.memorySettings.compactionModel;

		// Update settings object
		this.plugin.settings.memorySettings.enableConversationHistory = enableHistory;
		this.plugin.settings.memorySettings.conversationHistoryLimit = historyLimit;
		this.plugin.settings.memorySettings.enableCompaction = enableCompaction;
		this.plugin.settings.memorySettings.compactionThreshold = compactionThreshold;
		this.plugin.settings.memorySettings.compactionTarget = compactionTarget;
		this.plugin.settings.memorySettings.compactionPreserveCount = compactionPreserveCount;
		this.plugin.settings.memorySettings.compactionModel = compactionModel;

		// Enable Conversation History Toggle
		new Setting(containerEl)
			.setName(this.i18n.t('settingsPage.memory.enableConversationHistory'))
			.setDesc(this.i18n.t('settingsPage.memory.enableConversationHistoryDesc'))
			.addToggle(toggle => toggle
				.setValue(enableHistory)
				.onChange(async (value) => {
					this.plugin.settings.memorySettings.enableConversationHistory = value;
					await this.plugin.saveSettings();
					
					// Reinitialize Memory Manager with new settings
					await this.reinitializeMemoryManager();
					
					Logger.info('[MemorySettings] Conversation History', value ? 'enabled' : 'disabled');
				}));

		// Conversation History Limit Slider
		new Setting(containerEl)
			.setName(this.i18n.t('settingsPage.memory.conversationHistoryLimit'))
			.setDesc(this.i18n.t('settingsPage.memory.conversationHistoryLimitDesc'))
			.addSlider(slider => {
				slider
					.setLimits(5, 1000, 5)
					.setValue(historyLimit)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.memorySettings.conversationHistoryLimit = value;
						await this.plugin.saveSettings();
						
						// Reinitialize Memory Manager with new settings
						await this.reinitializeMemoryManager();
						
						Logger.info('[MemorySettings] Conversation History Limit changed to:', value);
					});
			});

		// Only show compaction settings if conversation history is enabled
		if (enableHistory) {
			// Enable Compaction Toggle
			new Setting(containerEl)
				.setName(this.i18n.t('settingsPage.memory.enableCompaction'))
				.setDesc(this.i18n.t('settingsPage.memory.enableCompactionDesc'))
				.addToggle(toggle => toggle
					.setValue(enableCompaction)
					.onChange(async (value) => {
						this.plugin.settings.memorySettings.enableCompaction = value;
						await this.plugin.saveSettings();
						
						// Reinitialize Memory Manager with new settings
						await this.reinitializeMemoryManager();
						
						Logger.info('[MemorySettings] Conversation Compaction', value ? 'enabled' : 'disabled');
					}));

			// Only show compaction parameters if compaction is enabled
			if (enableCompaction) {
				// Compaction Threshold
				new Setting(containerEl)
					.setName(this.i18n.t('settingsPage.memory.compactionThreshold'))
					.setDesc(this.i18n.t('settingsPage.memory.compactionThresholdDesc'))
					.addText(text => text
						.setPlaceholder('8000')
						.setValue(String(compactionThreshold))
						.onChange(async (value) => {
							const numValue = parseInt(value, 10);
							if (!isNaN(numValue) && numValue > 0) {
								this.plugin.settings.memorySettings.compactionThreshold = numValue;
								await this.plugin.saveSettings();
								await this.reinitializeMemoryManager();
								Logger.info('[MemorySettings] Compaction Threshold changed to:', numValue);
							}
						}));

				// Compaction Target
				new Setting(containerEl)
					.setName(this.i18n.t('settingsPage.memory.compactionTarget'))
					.setDesc(this.i18n.t('settingsPage.memory.compactionTargetDesc'))
					.addText(text => text
						.setPlaceholder('4000')
						.setValue(String(compactionTarget))
						.onChange(async (value) => {
							const numValue = parseInt(value, 10);
							if (!isNaN(numValue) && numValue > 0) {
								this.plugin.settings.memorySettings.compactionTarget = numValue;
								await this.plugin.saveSettings();
								await this.reinitializeMemoryManager();
								Logger.info('[MemorySettings] Compaction Target changed to:', numValue);
							}
						}));

				// Preserve Recent Count
				new Setting(containerEl)
					.setName(this.i18n.t('settingsPage.memory.compactionPreserveCount'))
					.setDesc(this.i18n.t('settingsPage.memory.compactionPreserveCountDesc'))
					.addText(text => text
						.setPlaceholder('4')
						.setValue(String(compactionPreserveCount))
						.onChange(async (value) => {
							const numValue = parseInt(value, 10);
							if (!isNaN(numValue) && numValue > 0) {
								this.plugin.settings.memorySettings.compactionPreserveCount = numValue;
								await this.plugin.saveSettings();
								await this.reinitializeMemoryManager();
								Logger.info('[MemorySettings] Compaction Preserve Count changed to:', numValue);
							}
						}));

				// Compaction Model Dropdown
				await this.renderCompactionModelDropdown(containerEl, compactionModel);
			}
		}
	}

	/**
	 * Render Compaction Model dropdown
	 */
	private async renderCompactionModelDropdown(
		containerEl: HTMLElement, 
		currentModelId: string
	): Promise<void> {
		// Get all available models (non-embedding)
		const connections = this.plugin.settings.connections;
		const models = this.plugin.settings.models.filter(m => !m.isEmbedding);

		// Check if there are any models configured
		if (models.length === 0) {
			const warningDiv = containerEl.createDiv({ cls: 'llmsider-warning-box' });
			warningDiv.innerHTML = '⚠️ ' + this.i18n.t('settingsPage.memory.requiresModel');
			return;
		}

		const compactionModelSetting = new Setting(containerEl)
			.setName(this.i18n.t('settingsPage.memory.compactionModel'))
			.setDesc(this.i18n.t('settingsPage.memory.compactionModelDesc'));

		compactionModelSetting.addDropdown(dropdown => {
			// Add placeholder option
			dropdown.addOption('', this.i18n.t('settingsPage.memory.selectCompactionModel'));

			// Add all available models
			models.forEach(model => {
				const connection = connections.find(c => c.id === model.connectionId);
				if (connection) {
					const modelId = `${connection.id}::${model.id}`;
					const displayName = `${connection.name} - ${model.name}`;
					dropdown.addOption(modelId, displayName);
				}
			});

			dropdown
				.setValue(currentModelId)
				.onChange(async (value) => {
					this.plugin.settings.memorySettings.compactionModel = value;
					await this.plugin.saveSettings();
					
					// Reinitialize Memory Manager with new settings
					await this.reinitializeMemoryManager();
					
					if (value) {
						const [connId, modelId] = value.split('::');
						const connection = connections.find(c => c.id === connId);
						const model = models.find(m => m.id === modelId);
						if (connection && model) {
							Logger.info('[MemorySettings] Compaction Model changed to:', `${connection.name} - ${model.name}`);
						}
					} else {
						Logger.info('[MemorySettings] Compaction Model set to default (first available model)');
					}
				});
		});
	}



	/**
	 * Reinitialize Memory Manager with new settings
	 * This ensures changes take effect immediately
	 */
	private async reinitializeMemoryManager(): Promise<void> {
		try {
			const memoryManager = this.plugin.getMemoryManager();
			if (memoryManager) {
				Logger.debug('[MemorySettings] Reinitializing Memory Manager with new settings...');
				
				// Memory Manager will be reinitialized on next agent creation
				// No need to reset any cache - vectorDBManager is fetched fresh each time
				
				new Notice(this.i18n.t('settingsPage.memory.settingsSaved'));
			}
		} catch (error) {
			Logger.error('[MemorySettings] Failed to reinitialize Memory Manager:', error);
			new Notice(this.i18n.t('settingsPage.memory.settingsSaveFailed', { error: String(error) }));
		}
	}
}
