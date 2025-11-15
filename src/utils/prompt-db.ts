import { PromptTemplate } from '../types';
import { Logger } from '././logger';
import { App } from 'obsidian';
import { BUILT_IN_PROMPTS, getBuiltInPrompts } from '../data/built-in-prompts';
import { ConfigDatabase } from './config-db';

export class PromptDatabase {
    private configDb: ConfigDatabase;
    private app: App;
    private fallbackMode: boolean = false;
    private fallbackData: PromptTemplate[] = [];

    constructor(app: App) {
        this.app = app;
        // Use ConfigDatabase for unified storage
        this.configDb = new ConfigDatabase((app.vault.adapter as any).basePath || '', app.vault.adapter);
    }

    /**
     * Initialize the database
     */
    async initialize(): Promise<void> {
        try {
            // Initialize the config database
            await this.configDb.initialize();
            
            // Initialize with built-in prompts if database is empty
            await this.initializeBuiltInPrompts();
            
            Logger.debug('Database initialized successfully using config.db');
        } catch (error) {
            Logger.error('Failed to initialize with SQLite, falling back to JSON storage:', error);
            
            // Fallback to JSON-based storage
            this.fallbackMode = true;
            await this.initializeFallbackMode();
            
            Logger.debug('Fallback mode initialized successfully');
        }
    }

    /**
     * Initialize built-in prompts only if database is empty
     */
    private async initializeBuiltInPrompts(): Promise<void> {
        if (this.fallbackMode) return;

        try {
            // Check if any prompts already exist in the database
            const existingPrompts = await this.configDb.getAllPrompts();
            
            if (existingPrompts.length > 0) {
                Logger.debug('Built-in prompts already exist, skipping initialization');
                return;
            }

            Logger.debug('Database is empty, initializing built-in prompts...');

            const builtInPrompts = getBuiltInPrompts();

            for (const prompt of builtInPrompts) {
                await this.configDb.createPrompt(prompt);
            }

            Logger.debug(`Initialized ${builtInPrompts.length} built-in prompts`);
        } catch (error) {
            Logger.error('Failed to initialize built-in prompts:', error);
        }
    }

    /**
     * Create a new prompt template
     */
    async createPrompt(prompt: PromptTemplate): Promise<void> {
        if (this.fallbackMode) {
            this.fallbackData.push(prompt);
            await this.saveFallbackData();
            return;
        }

        await this.configDb.createPrompt(prompt);
    }

    /**
     * Get all prompt templates
     */
    async getAllPrompts(): Promise<PromptTemplate[]> {
        if (this.fallbackMode) {
            return [...this.fallbackData].sort((a, b) => {
                const orderA = a.order || 999;
                const orderB = b.order || 999;
                return orderA - orderB;
            });
        }

        return await this.configDb.getAllPrompts();
    }

    /**
     * Get prompt template by ID
     */
    async getPrompt(id: string): Promise<PromptTemplate | null> {
        if (this.fallbackMode) {
            return this.fallbackData.find(prompt => prompt.id === id) || null;
        }

        return await this.configDb.getPrompt(id);
    }

    /**
     * Update a prompt template
     */
    async updatePrompt(id: string, updates: Partial<Omit<PromptTemplate, 'id'>>): Promise<void> {
        if (this.fallbackMode) {
            const index = this.fallbackData.findIndex(prompt => prompt.id === id);
            if (index !== -1) {
                this.fallbackData[index] = { ...this.fallbackData[index], ...updates };
                await this.saveFallbackData();
            }
            return;
        }

        await this.configDb.updatePrompt(id, updates);
    }

    /**
     * Delete a prompt template
     */
    async deletePrompt(id: string): Promise<void> {
        if (this.fallbackMode) {
            const index = this.fallbackData.findIndex(prompt => prompt.id === id);
            if (index !== -1) {
                this.fallbackData.splice(index, 1);
                await this.saveFallbackData();
            }
            return;
        }

        await this.configDb.deletePrompt(id);
    }

    /**
     * Search prompt templates
     */
    async searchPrompts(query: string): Promise<PromptTemplate[]> {
        if (this.fallbackMode) {
            if (!query || query.trim() === '') {
                return this.getAllPrompts();
            }

            const searchTerm = query.toLowerCase();
            return this.fallbackData
                .filter(prompt => 
                    prompt.title.toLowerCase().includes(searchTerm) ||
                    (prompt.description && prompt.description.toLowerCase().includes(searchTerm))
                )
                .sort((a, b) => {
                    const orderA = a.order || 999;
                    const orderB = b.order || 999;
                    return orderA - orderB;
                });
        }

        return await this.configDb.searchPrompts(query);
    }

    /**
     * Mark a prompt as used
     */
    async markPromptAsUsed(id: string): Promise<void> {
        await this.updatePrompt(id, { lastUsed: Date.now() });
    }

    /**
     * Get built-in prompts only
     */
    async getBuiltInPrompts(): Promise<PromptTemplate[]> {
        if (this.fallbackMode) {
            return this.fallbackData
                .filter(prompt => prompt.isBuiltIn)
                .sort((a, b) => {
                    const orderA = a.order || 999;
                    const orderB = b.order || 999;
                    return orderA - orderB;
                });
        }

        return await this.configDb.getBuiltInPrompts();
    }

    /**
     * Get custom prompts only
     */
    async getCustomPrompts(): Promise<PromptTemplate[]> {
        if (this.fallbackMode) {
            return this.fallbackData
                .filter(prompt => !prompt.isBuiltIn)
                .sort((a, b) => {
                    const orderA = a.order || 999;
                    const orderB = b.order || 999;
                    return orderA - orderB;
                });
        }

        return await this.configDb.getCustomPrompts();
    }

    /**
     * Close database connection
     */
    close(): void {
        if (!this.fallbackMode) {
            this.configDb.close();
        }
    }

    /**
     * Initialize fallback mode with JSON storage
     */
    private async initializeFallbackMode(): Promise<void> {
        try {
            // Try to load existing JSON data
            const fallbackPath = `${this.app.vault.configDir}/plugins/obsidian-llmsider/prompts.json`;
            const data = await this.app.vault.adapter.read(fallbackPath);
            this.fallbackData = JSON.parse(data);
            Logger.debug(`Loaded ${this.fallbackData.length} prompts from fallback JSON file`);
        } catch (error) {
            // Initialize with built-in prompts only if no existing data
            Logger.debug('No existing fallback data found, initializing with built-in prompts...');
            this.fallbackData = getBuiltInPrompts();
            await this.saveFallbackData();
            Logger.debug(`Initialized fallback mode with ${this.fallbackData.length} built-in prompts`);
        }
    }

    /**
     * Save fallback data to JSON file
     */
    private async saveFallbackData(): Promise<void> {
        try {
            const fallbackPath = `${this.app.vault.configDir}/plugins/obsidian-llmsider/prompts.json`;
            await this.app.vault.adapter.write(fallbackPath, JSON.stringify(this.fallbackData, null, 2));
        } catch (error) {
            Logger.error('Failed to save fallback data:', error);
        }
    }
}