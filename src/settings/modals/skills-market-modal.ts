import { App, Modal, Notice } from 'obsidian';
import type LLMSiderPlugin from '../../main';
import type { I18nManager } from '../../i18n/i18n-manager';
import { SkillsMarketSearchResult, SkillsMarketService, SkillsMarketSkill } from '../../skills/skills-market-service';

export class SkillsMarketModal extends Modal {
    private skillsMarketService: SkillsMarketService;
    private marketQuery = '';
    private marketPage = 1;
    private marketResults: SkillsMarketSearchResult | null = null;
    private marketError = '';
    private marketLoading = false;
    private installingSkillId = '';
    private onInstallCallback: () => void;

    constructor(
        app: App,
        private plugin: LLMSiderPlugin,
        private i18n: I18nManager,
        onInstallCallback: () => void
    ) {
        super(app);
        this.skillsMarketService = new SkillsMarketService(plugin);
        this.onInstallCallback = onInstallCallback;
    }

    onOpen(): void {
        this.renderMarketSection();
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    private renderMarketSection(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('llmsider-skills-market-modal');

        contentEl.createEl('h2', {
            text: this.i18n.t('settingsPage.skills.market.title') || 'Skills Market',
            cls: 'llmsider-section-header',
        });
        contentEl.createEl('p', {
            text: this.i18n.t('settingsPage.skills.market.description') || 'Search remote skills and install them into your local skills directory.',
            cls: 'llmsider-section-description',
        });

        const tokenRow = contentEl.createDiv({ cls: 'llmsider-skills-market-token-row' });
        const tokenLabel = tokenRow.createEl('label', {
            text: this.i18n.t('settingsPage.skills.market.apiToken') || 'API Token',
        });
        tokenLabel.addClass('llmsider-skills-market-token-label');
        const hasToken = Boolean((this.plugin.settings.skillsMarketApiToken || '').trim());

        if (!hasToken) {
            const onboarding = contentEl.createDiv({ cls: 'llmsider-skills-market-onboarding' });
            onboarding.createEl('p', {
                text: this.i18n.t('settingsPage.skills.market.onboarding') || 'Before searching Skills, create a Skills Market API token and paste it below.',
            });
            const createLink = onboarding.createEl('a', {
                text: this.i18n.t('settingsPage.skills.market.createTokenAction') || 'Create API token',
                href: 'https://skillsmp.com/',
            });
            createLink.target = '_blank';
            createLink.rel = 'noopener noreferrer';
        }

        const tokenInput = tokenRow.createEl('input', {
            type: 'password',
            placeholder: this.i18n.t('settingsPage.skills.market.apiTokenPlaceholder') || 'Paste Skills Market API token',
        });
        tokenInput.value = this.plugin.settings.skillsMarketApiToken || '';
        tokenInput.addClass('llmsider-skills-market-input');
        tokenInput.autocomplete = 'off';
        tokenInput.addEventListener('change', async () => {
            const nextToken = tokenInput.value.trim();
            this.plugin.settings.skillsMarketApiToken = nextToken;
            await this.plugin.configDb.setConfig('skillsMarketApiToken', nextToken);
            if (nextToken) {
                new Notice(this.i18n.t('settingsPage.skills.market.tokenSaved') || 'Skills Market API token saved locally');
            }
            this.renderMarketSection();
        });

        if (hasToken) {
            tokenRow.createEl('div', {
                text: this.i18n.t('settingsPage.skills.market.tokenSavedHint') || 'Saved locally. You do not need to enter it again.',
                cls: 'llmsider-skills-market-token-saved',
            });
        }

        const controls = contentEl.createDiv({ cls: 'llmsider-skills-market-controls' });
        const input = controls.createEl('input', {
            type: 'text',
            placeholder: this.i18n.t('settingsPage.skills.market.searchPlaceholder') || 'Search skills...',
        });
        input.value = this.marketQuery;
        input.addClass('llmsider-skills-market-input');
        input.addEventListener('input', () => {
            this.marketQuery = input.value;
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                void this.runMarketSearch(1);
            }
        });

        const searchButton = controls.createEl('button', {
            text: this.marketLoading
                ? (this.i18n.t('settingsPage.skills.market.searching') || 'Searching...')
                : (this.i18n.t('settingsPage.skills.market.searchAction') || 'Search'),
        });
        searchButton.addClass('mod-cta', 'llmsider-skills-market-button');
        searchButton.disabled = this.marketLoading || !hasToken;
        searchButton.onclick = () => {
            void this.runMarketSearch(1);
        };

        if (this.marketError) {
            const error = contentEl.createDiv({ cls: 'llmsider-skills-market-error' });
            error.setText(this.marketError);
        }

        if (this.marketLoading) {
            contentEl.createEl('p', {
                text: this.i18n.t('settingsPage.skills.market.searching') || 'Searching...',
                cls: 'llmsider-empty-text',
            });
            return;
        }

        if (!this.marketResults) {
            contentEl.createEl('p', {
                text: this.i18n.t('settingsPage.skills.market.empty') || 'Search the market to view installable skills.',
                cls: 'llmsider-empty-text',
            });
            return;
        }

        const summary = contentEl.createDiv({ cls: 'llmsider-skills-market-summary' });
        summary.setText(this.i18n.t('settingsPage.skills.market.resultsSummary', {
            page: String(this.marketResults.pagination.page),
            totalPages: String(this.marketResults.pagination.totalPages || 1),
            total: String(this.marketResults.pagination.total),
        }) || `Page ${this.marketResults.pagination.page} / ${this.marketResults.pagination.totalPages} · ${this.marketResults.pagination.total} results`);

        const results = contentEl.createDiv({ cls: 'llmsider-skills-market-results' });
        if (this.marketResults.skills.length === 0) {
            results.createEl('p', {
                text: this.i18n.t('settingsPage.skills.market.noResults') || 'No matching skills found.',
                cls: 'llmsider-empty-text',
            });
        } else {
            this.marketResults.skills.forEach((skill) => {
                this.renderMarketSkillCard(results, skill);
            });
        }

        const pagination = contentEl.createDiv({ cls: 'llmsider-skills-market-pagination' });
        const prev = pagination.createEl('button', {
            text: this.i18n.t('settingsPage.skills.market.prevPage') || 'Previous',
        });
        prev.disabled = !this.marketResults.pagination.hasPrev || this.marketLoading;
        prev.onclick = () => {
            void this.runMarketSearch(Math.max(1, this.marketPage - 1));
        };

        const next = pagination.createEl('button', {
            text: this.i18n.t('settingsPage.skills.market.nextPage') || 'Next',
        });
        next.disabled = !this.marketResults.pagination.hasNext || this.marketLoading;
        next.onclick = () => {
            void this.runMarketSearch(this.marketPage + 1);
        };
    }

    private renderMarketSkillCard(container: HTMLElement, skill: SkillsMarketSkill): void {
        const card = container.createDiv({ cls: 'llmsider-skills-market-card' });
        const header = card.createDiv({ cls: 'llmsider-skills-market-card-header' });
        const titleWrap = header.createDiv();
        titleWrap.createEl('strong', { text: skill.name });
        titleWrap.createEl('div', {
            text: `${skill.author} · ${skill.installDirName}`,
            cls: 'llmsider-skills-market-meta',
        });

        const metrics = header.createDiv({ cls: 'llmsider-skills-market-badges' });
        metrics.createSpan({ text: `★ ${skill.stars || 0}` });
        metrics.createSpan({ text: `⑂ ${skill.forks || 0}` });
        if (skill.installed) {
            metrics.createSpan({
                text: this.i18n.t('settingsPage.skills.market.installed') || 'Installed',
                cls: 'llmsider-skills-market-installed-badge',
            });
        }

        card.createEl('p', {
            text: skill.description || '',
            cls: 'llmsider-skills-market-description',
        });

        const footer = card.createDiv({ cls: 'llmsider-skills-market-card-footer' });
        const updatedAt = this.formatUpdatedAt(skill.updatedAt);
        if (updatedAt) {
            footer.createSpan({
                text: `${this.i18n.t('settingsPage.skills.market.updatedAt') || 'Updated'}: ${updatedAt}`,
                cls: 'llmsider-skills-market-meta',
            });
        }

        const actions = footer.createDiv({ cls: 'llmsider-skills-market-actions' });
        const githubLink = actions.createEl('a', {
            text: this.i18n.t('settingsPage.skills.market.viewOnGithub') || 'GitHub',
            href: skill.githubUrl,
        });
        githubLink.target = '_blank';
        githubLink.rel = 'noopener noreferrer';

        const installButton = actions.createEl('button', {
            text: this.installingSkillId === skill.id
                ? (this.i18n.t('settingsPage.skills.market.installing') || 'Installing...')
                : skill.installed
                    ? (this.i18n.t('settingsPage.skills.market.reinstallBlocked') || 'Installed')
                    : (this.i18n.t('settingsPage.skills.market.installAction') || 'Install'),
        });
        installButton.addClass('mod-cta', 'llmsider-skills-market-button');
        installButton.disabled = skill.installed || this.installingSkillId.length > 0;
        installButton.onclick = () => {
            void this.installMarketSkill(skill);
        };
    }

    private async runMarketSearch(page: number): Promise<void> {
        this.marketLoading = true;
        this.marketError = '';
        this.marketPage = page;
        this.renderMarketSection();

        try {
            this.marketResults = await this.skillsMarketService.searchSkills(this.marketQuery, page);
        } catch (error) {
            this.marketResults = null;
            this.marketError = error instanceof Error ? error.message : String(error);
        } finally {
            this.marketLoading = false;
            this.renderMarketSection();
        }
    }

    private async installMarketSkill(skill: SkillsMarketSkill): Promise<void> {
        this.installingSkillId = skill.id;
        this.marketError = '';
        this.renderMarketSection();

        try {
            await this.skillsMarketService.installSkill(skill);
            new Notice(this.i18n.t('settingsPage.skills.market.installSuccess', {
                name: skill.name,
            }) || `Installed skill: ${skill.name}`);

            if (this.marketResults) {
                this.marketResults = {
                    ...this.marketResults,
                    skills: this.marketResults.skills.map(item => item.id === skill.id ? { ...item, installed: true } : item),
                };
            }

            // Call the callback to refresh standard skills list
            this.onInstallCallback();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.marketError = message;
            new Notice(message, 8000);
        } finally {
            this.installingSkillId = '';
            this.renderMarketSection();
        }
    }

    private formatUpdatedAt(updatedAt?: string): string {
        if (!updatedAt) {
            return '';
        }

        const timestamp = Number(updatedAt) * 1000;
        if (!Number.isFinite(timestamp) || timestamp <= 0) {
            return '';
        }

        return new Date(timestamp).toLocaleDateString();
    }
}
