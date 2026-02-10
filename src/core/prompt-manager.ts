import { App } from 'obsidian';
import { Logger } from './../utils/logger';
import { PromptTemplate } from '../types';
import LLMSiderPlugin from '../main';
import { PromptDatabase } from '../utils/prompt-db';
import { getBuiltInPrompts } from '../data/built-in-prompts';

export class PromptManager {
    private app: App;
    private plugin: LLMSiderPlugin;
    private promptDb: PromptDatabase;
    private builtInPrompts: PromptTemplate[] = [];

    constructor(app: App, plugin: LLMSiderPlugin) {
        this.app = app;
        this.plugin = plugin;
        this.promptDb = new PromptDatabase(app);
    }

    /**
     * Initialize prompt manager by initializing database
     */
    async initialize(): Promise<void> {
        try {
            await this.promptDb.initialize();
            Logger.debug('Database initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize database:', error);
            // Fallback to in-memory prompts if database fails
            this.loadBuiltInPrompts();
        }
    }

    /**
     * Load built-in prompts from predefined templates
     */
    private loadBuiltInPrompts(): void {
        this.builtInPrompts = [...getBuiltInPrompts()];

        // Sort by order
        this.builtInPrompts.sort((a, b) => {
            const orderA = a.order || 999;
            const orderB = b.order || 999;
            return orderA - orderB;
        });

        Logger.debug(`Loaded ${this.builtInPrompts.length} built-in prompts`);
    }

    /**
     * Get all available prompts from database
     */
    async getAllPrompts(): Promise<PromptTemplate[]> {
        try {
            return await this.promptDb.getAllPrompts();
        } catch (error) {
            Logger.error('Failed to get prompts from database:', error);
            // Fallback to in-memory prompts
            const customPrompts = this.plugin.settings.customPrompts || [];
            return [...this.builtInPrompts, ...customPrompts];
        }
    }

    /**
     * Search prompts by query using database
     */
    async searchPrompts(query: string): Promise<PromptTemplate[]> {
        try {
            return await this.promptDb.searchPrompts(query);
        } catch (error) {
            Logger.error('Failed to search prompts in database:', error);
            // Fallback to in-memory search
            const allPrompts = await this.getAllPrompts();
            
            if (!query || query.trim() === '') {
                return allPrompts;
            }

            const searchTerm = query.toLowerCase().trim();
            
            return allPrompts.filter(prompt => {
                const titleMatch = prompt.title.toLowerCase().includes(searchTerm);
                const descriptionMatch = prompt.description?.toLowerCase().includes(searchTerm) || false;
                const keywordMatch = prompt.searchKeywords?.some(kw => kw.toLowerCase().includes(searchTerm)) || false;
                return titleMatch || descriptionMatch || keywordMatch;
            }).sort((a, b) => {
                // Sort by relevance and last used
                const aRelevance = this.calculateRelevance(a, searchTerm);
                const bRelevance = this.calculateRelevance(b, searchTerm);
                
                if (aRelevance !== bRelevance) {
                    return bRelevance - aRelevance; // Higher relevance first
                }
                
                // Then by last used
                return (b.lastUsed || 0) - (a.lastUsed || 0);
            });
        }
    }

    /**
     * Calculate relevance score for search
     */
    private calculateRelevance(prompt: PromptTemplate, searchTerm: string): number {
        let score = 0;
        const title = prompt.title.toLowerCase();
        const description = prompt.description?.toLowerCase() || '';
        const keywords = prompt.searchKeywords?.map(kw => kw.toLowerCase()) || [];

        // Exact title match gets highest score
        if (title === searchTerm) {
            score += 100;
        }
        // Title starts with search term
        else if (title.startsWith(searchTerm)) {
            score += 50;
        }
        // Title contains search term
        else if (title.includes(searchTerm)) {
            score += 25;
        }
        
        // Check keywords for exact or partial matches
        keywords.forEach(keyword => {
            if (keyword === searchTerm) {
                score += 40;
            } else if (keyword.startsWith(searchTerm)) {
                score += 20;
            } else if (keyword.includes(searchTerm)) {
                score += 10;
            }
        });

        // Description matches
        if (description.includes(searchTerm)) {
            score += 10;
        }

        // Boost recently used prompts
        if (prompt.lastUsed && prompt.lastUsed > 0) {
            const daysSinceUsed = (Date.now() - prompt.lastUsed) / (1000 * 60 * 60 * 24);
            score += Math.max(0, 10 - daysSinceUsed);
        }

        return score;
    }

    /**
     * Add a custom prompt to database
     */
    async addCustomPrompt(prompt: Omit<PromptTemplate, 'id' | 'isBuiltIn'>): Promise<void> {
        try {
            const newPrompt: PromptTemplate = {
                ...prompt,
                id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                isBuiltIn: false
            };

            await this.promptDb.createPrompt(newPrompt);
        } catch (error) {
            Logger.error('Failed to add custom prompt to database:', error);
            // Fallback to settings
            const newPrompt: PromptTemplate = {
                ...prompt,
                id: `custom-${Date.now()}`,
                isBuiltIn: false
            };

            this.plugin.settings.customPrompts.push(newPrompt);
            await this.plugin.saveSettings();
        }
    }

    /**
     * Update a prompt in database
     */
    async updateCustomPrompt(id: string, updates: Partial<PromptTemplate>): Promise<void> {
        try {
            await this.promptDb.updatePrompt(id, updates);
        } catch (error) {
            Logger.error('Failed to update prompt in database:', error);
            // Fallback to settings
            const index = this.plugin.settings.customPrompts.findIndex(p => p.id === id);
            if (index >= 0) {
                this.plugin.settings.customPrompts[index] = {
                    ...this.plugin.settings.customPrompts[index],
                    ...updates
                };
                await this.plugin.saveSettings();
            }
        }
    }

    /**
     * Delete a prompt from database
     */
    async deleteCustomPrompt(id: string): Promise<void> {
        try {
            await this.promptDb.deletePrompt(id);
        } catch (error) {
            Logger.error('Failed to delete prompt from database:', error);
            // Fallback to settings
            this.plugin.settings.customPrompts = this.plugin.settings.customPrompts.filter(p => p.id !== id);
            await this.plugin.saveSettings();
        }
    }

    /**
     * Mark a prompt as used in database
     */
    async markPromptAsUsed(id: string): Promise<void> {
        try {
            await this.promptDb.markPromptAsUsed(id);
        } catch (error) {
            Logger.error('Failed to mark prompt as used in database:', error);
            // Fallback to settings for custom prompts only
            const index = this.plugin.settings.customPrompts.findIndex(p => p.id === id);
            if (index >= 0) {
                this.plugin.settings.customPrompts[index].lastUsed = Date.now();
                await this.plugin.saveSettings();
            }
        }
    }

    /**
     * Apply prompt template to user content
     */
    applyPrompt(template: PromptTemplate, userContent: string): string {
        // Replace {} placeholder with user content
        return template.content.replace(/\{\}/g, userContent);
    }
}