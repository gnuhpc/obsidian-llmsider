import { Notice, Setting } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import { SkillsMarketModal } from '../modals/skills-market-modal';

export class SkillManagementRenderer {
	constructor(
		private plugin: LLMSiderPlugin,
		private i18n: I18nManager,
		private onDisplayCallback: () => void,
	) { }

	async render(containerEl: HTMLElement): Promise<void> {
		containerEl.createEl('h2', {
			text: this.i18n.t('settingsPage.skills.title') || 'Skills',
			cls: 'llmsider-section-header'
		});

		const section = containerEl.createDiv({ cls: 'llmsider-settings-section-container llmsider-skills-section' });

		const skillManager = this.plugin.getSkillManager();
		if (!skillManager) {
			section.createEl('p', {
				text: this.i18n.t('settingsPage.skills.notInitialized') || 'Skill manager is not initialized.',
				cls: 'llmsider-empty-text'
			});
			return;
		}

		const currentState = skillManager.getStateSnapshot();
		const loadedSkills = skillManager.listSkills();
		const loadErrors = skillManager.getLoadErrors();

		const marketSetting = new Setting(section)
			.setName(this.i18n.t('settingsPage.skills.market.title') || 'Skills Market')
			.setDesc(this.i18n.t('settingsPage.skills.market.description') || 'Search remote skills and install them into your local skills directory.')
			.addButton(button => {
				button
					.setButtonText(this.i18n.t('settingsPage.skills.market.openMarket') || 'Open Market')
					.setCta()
					.onClick(() => {
						new SkillsMarketModal(this.plugin.app, this.plugin, this.i18n, () => {
							this.onDisplayCallback();
						}).open();
					});
			});
		marketSetting.settingEl.addClass('llmsider-skills-market-row');

		const directorySetting = new Setting(section)
			.setName(this.i18n.t('settingsPage.skills.directory') || 'Skills Directory')
			.setDesc('')
			.addText(text => {
				text.setPlaceholder('skills');
				text.setValue(currentState.directory || 'skills');
				text.onChange(async (value) => {
					this.plugin.settings.skillsSettings.directory = value || 'skills';
				});
			})
			.addButton(button => {
				button
					.setClass('llmsider-skills-reload-btn')
					.setIcon('refresh-cw')
					.setTooltip(this.i18n.t('settingsPage.skills.reload') || 'Reload Skills')
					.onClick(async () => {
						const directory = this.plugin.settings.skillsSettings.directory || 'skills';
						await skillManager.setSkillsDirectory(directory);
						this.plugin.settings.skillsSettings = skillManager.getStateSnapshot();
						new Notice(this.i18n.t('settingsPage.skills.directoryUpdated') || 'Skills directory updated');
						this.onDisplayCallback();
					});
			})
			.addToggle(toggle => {
				toggle.setTooltip(this.i18n.t('settingsPage.skills.globalToggleDesc') || 'Globally enable or disable all local skills');
				toggle.setValue(currentState.globallyEnabled !== false);
				toggle.onChange(async (value) => {
					await skillManager.setGloballyEnabled(value);
					this.plugin.settings.skillsSettings = skillManager.getStateSnapshot();
					await this.plugin.saveSettings();
					new Notice(
						value
							? (this.i18n.t('ui.allSkillsEnabled') || 'All skills enabled')
							: (this.i18n.t('ui.allSkillsDisabled') || 'All skills disabled')
					);
					this.onDisplayCallback();
				});
			});
		directorySetting.settingEl.addClass('llmsider-skills-directory-row');

		if (loadErrors.length > 0) {
			const errorBlock = section.createDiv({ cls: 'llmsider-settings-empty-state llmsider-skills-error-block' });
			errorBlock.createEl('h3', {
				text: this.i18n.t('settingsPage.skills.loadErrors') || 'Load Errors',
				cls: 'llmsider-subsection-header'
			});

			loadErrors.forEach(error => {
				const item = errorBlock.createDiv({ cls: 'llmsider-skills-error-item' });
				item.createEl('strong', { text: error.skillId || error.path });
				item.createEl('p', { text: error.message, cls: 'llmsider-empty-text' });
			});
		}

		const list = section.createDiv({ cls: 'llmsider-skills-list' });
		if (loadedSkills.length === 0) {
			const empty = list.createDiv({ cls: 'llmsider-settings-empty-state llmsider-skills-empty-state' });
			empty.createEl('p', {
				text: this.i18n.t('settingsPage.skills.noSkillsFound') || 'No local skills found in the configured directory.',
				cls: 'llmsider-empty-text'
			});
		} else {
			loadedSkills.forEach(skill => {
				const descriptionParts = [skill.description || skill.id];
				if (currentState.defaultActiveSkillId === skill.id) {
					descriptionParts.push(this.i18n.t('settingsPage.skills.defaultBadge') || 'default');
				}
				if (skill.preferredConversationMode) {
					descriptionParts.push(`mode: ${skill.preferredConversationMode}`);
				}
				if (skill.toolAllowlist.length > 0) {
					descriptionParts.push(`tools: ${skill.toolAllowlist.length}`);
				}

				const skillSetting = new Setting(list)
					.setName(skill.name)
					.setDesc(descriptionParts.join(' · '));
				skillSetting.settingEl.addClass('llmsider-skills-list-item');

				skillSetting.addToggle(toggle => {
					toggle.setValue(skillManager.isSkillEnabled(skill.id));
					toggle.onChange(async (value) => {
						await skillManager.setSkillEnabled(skill.id, value);
						this.plugin.settings.skillsSettings = skillManager.getStateSnapshot();
						if (!value) {
							const currentSession = this.plugin.getChatView()?.getCurrentSession();
							if (currentSession?.activeSkillId === skill.id) {
								await this.plugin.applySkillToCurrentContext(null);
							}
						}
						this.onDisplayCallback();
					});
				});

				skillSetting.addExtraButton(button => {
					button
						.setIcon('star')
						.setTooltip(this.i18n.t('settingsPage.skills.setAsDefault') || 'Set as default')
						.onClick(async () => {
							await this.plugin.setDefaultSkill(skill.id);
							this.onDisplayCallback();
						});
				});

				skillSetting.addExtraButton(button => {
					button
						.setIcon('play')
						.setTooltip(this.i18n.t('settingsPage.skills.activateForCurrentChat') || 'Activate for current chat')
						.onClick(async () => {
							await this.plugin.applySkillToCurrentContext(skill.id);
						});
				});
			});
		}
	}
}
