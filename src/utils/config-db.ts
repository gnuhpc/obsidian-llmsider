import initSqlJs, { Database } from 'sql.js';
import { Logger } from '././logger';
import { ProviderType, PromptTemplate, MCPServersConfig, ChatSession } from '../types';
import { DataAdapter } from 'obsidian';
import { BUILT_IN_PROMPTS, getBuiltInPrompts } from '../data/built-in-prompts';
import { SQL_WASM_BASE64 } from './sql-wasm-data';

export interface ConfigData {
    agentMode: boolean;
    prompts?: PromptTemplate[];
    mcpServersConfig?: MCPServersConfig; // JSON file based, not database stored
}

export class ConfigDatabase {
    private db: Database | null = null;
    private dbPath: string;
    private isInitialized = false;

    constructor(private dataDir: string, private adapter?: DataAdapter) {
        // Use relative path for Obsidian adapter
        this.dbPath = `.obsidian/plugins/obsidian-llmsider/config.db`;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            Logger.debug('Starting SQL.js initialization with embedded WASM...');
            Logger.debug('Data dir:', this.dataDir);
            
            // Convert base64 WASM data to ArrayBuffer
            const wasmBinary = Uint8Array.from(atob(SQL_WASM_BASE64), c => c.charCodeAt(0)).buffer;
            Logger.debug('Loaded embedded WASM, size:', wasmBinary.byteLength);
            
            // Initialize SQL.js with embedded WASM binary
            const SQL = await initSqlJs({
                wasmBinary: wasmBinary
            });

            // Try multiple possible locations for the database file
            const possiblePaths = [
                this.dbPath, // Standard plugin directory
                'config.db', // Development location (project root)
            ];

            let data: Uint8Array | undefined;
            let foundPath: string | null = null;

            // Try to load existing database file from possible locations
            for (const path of possiblePaths) {
                try {
                    if (this.adapter && await this.adapter.exists(path)) {
                        const buffer = await this.adapter.readBinary(path);
                        data = new Uint8Array(buffer);
                        foundPath = path;
                        this.dbPath = path; // Update dbPath to the found location
                        Logger.debug(`Found database at: ${path}`);
                        break;
                    }
                } catch (error) {
                    // Continue to next path
                    continue;
                }
            }

            if (!foundPath) {
                Logger.debug('Creating new database at:', this.dbPath);
            }

            this.db = new SQL.Database(data);
            this.initializeSchema();
            this.isInitialized = true;
            Logger.debug('SQLite database initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize SQLite database:', error);
            Logger.error('SQLite is required for LLMSider to function.');
            Logger.error('Please run migration if upgrading from an older version: npm run migrate');
            throw error; // SQLite is now required, don't allow fallback
        }
    }

    private initializeSchema(): void {
        if (!this.db) throw new Error('Database not initialized');

        // Create connections table with all fields (including GitHub Copilot token support via api_key JSON)
        this.db.run(`
            CREATE TABLE IF NOT EXISTS connections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                api_key TEXT NOT NULL,
                base_url TEXT,
                organization_id TEXT,
                region TEXT,
                enabled INTEGER NOT NULL DEFAULT 1,
                created INTEGER NOT NULL,
                updated INTEGER NOT NULL
            )
        `);

        // Create models table with all fields including embedding support
        this.db.run(`
            CREATE TABLE IF NOT EXISTS models (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                connection_id TEXT NOT NULL,
                model_name TEXT NOT NULL,
                max_tokens INTEGER NOT NULL,
                temperature REAL NOT NULL,
                top_p REAL,
                enabled INTEGER NOT NULL DEFAULT 1,
                supports_vision INTEGER NOT NULL DEFAULT 0,
                is_default INTEGER NOT NULL DEFAULT 0,
                is_embedding INTEGER NOT NULL DEFAULT 0,
                embedding_dimension INTEGER,
                created INTEGER NOT NULL,
                updated INTEGER NOT NULL,
                FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for models
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_models_connection ON models(connection_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_models_enabled ON models(enabled)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_models_default ON models(is_default)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_models_embedding ON models(is_embedding)`);

        // Create config table for global settings
        this.db.run(`
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create prompt templates table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS prompt_templates (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                description TEXT,
                is_built_in INTEGER NOT NULL DEFAULT 0,
                order_index INTEGER NOT NULL DEFAULT 999,
                last_used INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
            )
        `);

        // Create indexes for prompt templates
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_title ON prompt_templates(title)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_is_built_in ON prompt_templates(is_built_in)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_order ON prompt_templates(order_index)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_last_used ON prompt_templates(last_used)`);
        
        // Create chat_sessions table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                messages TEXT NOT NULL,
                created INTEGER NOT NULL,
                updated INTEGER NOT NULL,
                provider TEXT NOT NULL,
                mode TEXT NOT NULL
            )
        `);
        
        // Create indexes for chat_sessions
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_session_updated ON chat_sessions(updated DESC)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_session_provider ON chat_sessions(provider)`);
        
        // Create built_in_tool_permissions table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS built_in_tool_permissions (
                tool_name TEXT PRIMARY KEY,
                enabled INTEGER NOT NULL DEFAULT 1,
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
            )
        `);
        
        // Create tool_settings table for storing tool enable/confirmation states
        this.db.run(`
            CREATE TABLE IF NOT EXISTS tool_settings (
                tool_id TEXT PRIMARY KEY,
                enabled INTEGER NOT NULL DEFAULT 1,
                require_confirmation INTEGER NOT NULL DEFAULT 1,
                server_id TEXT,
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
            )
        `);
        
        // Create index for faster lookups by server_id
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_tool_server ON tool_settings(server_id)`);
        
        // Note: Built-in prompts initialization is now handled separately after i18n is ready
        // See initializeBuiltInPrompts() - should be called after i18n.initialize()
    }
    
    /**
     * Initialize built-in prompts with i18n translations
     * IMPORTANT: This method must be called AFTER i18n.initialize() completes
     * to ensure translations are available
     */
    public initializeBuiltInPrompts(): void {
        if (!this.db) return;
        
        try {
            // Check if built-in prompts already exist
            const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM prompt_templates WHERE is_built_in = 1`);
            const result = stmt.getAsObject();
            stmt.free();
            
            const existingCount = (result.count as number) || 0;
            
            // If no built-in prompts exist, insert them
            if (existingCount === 0) {
                Logger.debug('Initializing built-in prompts with i18n translations...');
                
                // Get built-in prompts with i18n support
                const builtInPrompts = getBuiltInPrompts();
                
                const insertStmt = this.db.prepare(`
                    INSERT OR IGNORE INTO prompt_templates (id, title, content, description, is_built_in, order_index, last_used)
                    VALUES (?, ?, ?, ?, 1, ?, 0)
                `);
                
                for (const prompt of builtInPrompts) {
                    insertStmt.bind([
                        prompt.id,
                        prompt.title,
                        prompt.content,
                        prompt.description || '',
                        prompt.order
                    ]);
                    insertStmt.step();
                    insertStmt.reset();
                }
                
                insertStmt.free();
                Logger.debug(`Initialized ${builtInPrompts.length} built-in prompts with translations`);
            } else {
                Logger.debug(`Found ${existingCount} existing built-in prompts, skipping initialization`);
            }
        } catch (error) {
            Logger.error('Error initializing built-in prompts:', error);
            // Don't throw error, just log it - this shouldn't prevent database initialization
        }
    }
    
    /**
     * Update built-in prompts translations
     * Call this method when language is changed to update prompt titles/descriptions
     */
    public updateBuiltInPromptsTranslations(): void {
        if (!this.db) return;
        
        try {
            Logger.debug('Updating built-in prompts translations...');
            
            // Get fresh translations
            const builtInPrompts = getBuiltInPrompts();
            
            const updateStmt = this.db.prepare(`
                UPDATE prompt_templates 
                SET title = ?, description = ?
                WHERE id = ? AND is_built_in = 1
            `);
            
            for (const prompt of builtInPrompts) {
                updateStmt.bind([
                    prompt.title,
                    prompt.description || '',
                    prompt.id
                ]);
                updateStmt.step();
                updateStmt.reset();
            }
            
            updateStmt.free();
            Logger.debug(`Updated ${builtInPrompts.length} built-in prompts translations`);
        } catch (error) {
            Logger.error('Error updating built-in prompts translations:', error);
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    async saveToFile(): Promise<void> {
        if (!this.db || !this.adapter) return;
        
        try {
            const data = this.db.export();
            await this.adapter.writeBinary(this.dbPath, data.buffer as ArrayBuffer);
        } catch (error) {
            Logger.error('Failed to save database:', error);
        }
    }

    // Configuration value operations
    async getConfigValue(key: string): Promise<string | null> {
        await this.ensureInitialized();
        if (!this.db) return null;

        try {
            const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
            stmt.bind([key]);
            
            if (stmt.step()) {
                const result = stmt.getAsObject();
                stmt.free();
                return result.value as string;
            }
            
            stmt.free();
            return null;
        } catch (error) {
            Logger.error(`Error getting config value for key ${key}:`, error);
            return null;
        }
    }

    async setConfigValue(key: string, value: string): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) return;

        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO config (key, value, updated_at)
                VALUES (?, ?, datetime('now'))
            `);
            stmt.bind([key, value]);
            stmt.step();
            stmt.free();
            
            await this.saveToFile();
            Logger.debug(`Saved config value: ${key} = ${value}`);
        } catch (error) {
            Logger.error(`Error setting config value for key ${key}:`, error);
        }
    }

    async deleteConfigValue(key: string): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) return;

        try {
            const stmt = this.db.prepare('DELETE FROM config WHERE key = ?');
            stmt.bind([key]);
            stmt.step();
            stmt.free();
            
            await this.saveToFile();
            Logger.debug(`Deleted config value: ${key}`);
        } catch (error) {
            Logger.error(`Error deleting config value for key ${key}:`, error);
        }
    }

    // Config operations
    async getConfig(key: string): Promise<string | null> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
        stmt.bind([key]);
        
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row.value as string;
        }
        
        stmt.free();
        return null;
    }

    async setConfig(key: string, value: string): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO config (key, value) 
            VALUES (?, ?)
        `);
        stmt.run([key, value]);
        await this.saveToFile();
    }

    async getActiveProvider(): Promise<string | null> {
        return await this.getConfig('activeProvider');
    }

    async setActiveProvider(providerId: string): Promise<void> {
        await this.setConfig('activeProvider', providerId);
    }

    async getAgentMode(): Promise<boolean> {
        const mode = await this.getConfig('agentMode');
        if (mode === null || mode === undefined) return false;
        if (typeof mode === 'boolean') return mode;
        if (typeof mode === 'number') return mode === 1;
        if (typeof mode === 'string') return mode === 'true' || mode === '1';
        return false;
    }

    async setAgentMode(mode: boolean): Promise<void> {
        await this.setConfig('agentMode', mode ? 'true' : 'false');
    }

    // Get all config data (for export/backup)
    async getAllConfigData(): Promise<ConfigData> {
        return {
            agentMode: await this.getAgentMode(),
            prompts: await this.getAllPrompts()
        };
    }

    // Prompt Templates CRUD operations
    async createPrompt(prompt: PromptTemplate): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            INSERT INTO prompt_templates (
                id, title, content, description, is_built_in, order_index, last_used
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([
            prompt.id,
            prompt.title,
            prompt.content,
            prompt.description || null,
            prompt.isBuiltIn ? 1 : 0,
            prompt.order || 999,
            prompt.lastUsed || 0
        ]);

        await this.saveToFile();
    }

    async getAllPrompts(): Promise<PromptTemplate[]> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT id, title, content, description, is_built_in, order_index, last_used
            FROM prompt_templates
            ORDER BY order_index ASC, title ASC
        `);

        const rows: any[] = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();

        return rows.map(row => ({
            id: row.id as string,
            title: row.title as string,
            content: row.content as string,
            description: row.description as string || undefined,
            isBuiltIn: Boolean(row.is_built_in),
            order: row.order_index as number,
            lastUsed: row.last_used as number
        }));
    }

    async getPrompt(id: string): Promise<PromptTemplate | null> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT id, title, content, description, is_built_in, order_index, last_used
            FROM prompt_templates
            WHERE id = ?
        `);
        stmt.bind([id]);

        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();

            return {
                id: row.id as string,
                title: row.title as string,
                content: row.content as string,
                description: row.description as string || undefined,
                isBuiltIn: Boolean(row.is_built_in),
                order: row.order_index as number,
                lastUsed: row.last_used as number
            };
        }

        stmt.free();
        return null;
    }

    async updatePrompt(id: string, updates: Partial<Omit<PromptTemplate, 'id'>>): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const setClause = [];
        const values = [];

        if (updates.title !== undefined) {
            setClause.push('title = ?');
            values.push(updates.title);
        }
        if (updates.content !== undefined) {
            setClause.push('content = ?');
            values.push(updates.content);
        }
        if (updates.description !== undefined) {
            setClause.push('description = ?');
            values.push(updates.description);
        }
        if (updates.order !== undefined) {
            setClause.push('order_index = ?');
            values.push(updates.order);
        }
        if (updates.lastUsed !== undefined) {
            setClause.push('last_used = ?');
            values.push(updates.lastUsed);
        }

        if (setClause.length === 0) {
            return;
        }

        setClause.push('updated_at = ?');
        values.push(Date.now());
        values.push(id);

        const stmt = this.db.prepare(`
            UPDATE prompt_templates
            SET ${setClause.join(', ')}
            WHERE id = ?
        `);

        stmt.run(values);
        await this.saveToFile();
    }

    async deletePrompt(id: string): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare('DELETE FROM prompt_templates WHERE id = ?');
        stmt.run([id]);
        await this.saveToFile();
    }

    async searchPrompts(query: string): Promise<PromptTemplate[]> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        if (!query || query.trim() === '') {
            return this.getAllPrompts();
        }

        const searchTerm = `%${query.toLowerCase()}%`;
        
        const stmt = this.db.prepare(`
            SELECT id, title, content, description, is_built_in, order_index, last_used
            FROM prompt_templates
            WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ?
            ORDER BY 
                CASE 
                    WHEN LOWER(title) = LOWER(?) THEN 1
                    WHEN LOWER(title) LIKE ? THEN 2
                    WHEN LOWER(title) LIKE ? THEN 3
                    ELSE 4
                END,
                last_used DESC,
                order_index ASC
        `);

        stmt.bind([searchTerm, searchTerm, query.toLowerCase(), `${query.toLowerCase()}%`, searchTerm]);

        const rows: any[] = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();

        return rows.map(row => ({
            id: row.id as string,
            title: row.title as string,
            content: row.content as string,
            description: row.description as string || undefined,
            isBuiltIn: Boolean(row.is_built_in),
            order: row.order_index as number,
            lastUsed: row.last_used as number
        }));
    }

    async markPromptAsUsed(id: string): Promise<void> {
        await this.updatePrompt(id, { lastUsed: Date.now() });
    }

    async getBuiltInPrompts(): Promise<PromptTemplate[]> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT id, title, content, description, is_built_in, order_index, last_used
            FROM prompt_templates
            WHERE is_built_in = 1
            ORDER BY order_index ASC, title ASC
        `);

        const rows: any[] = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();

        return rows.map(row => ({
            id: row.id as string,
            title: row.title as string,
            content: row.content as string,
            description: row.description as string || undefined,
            isBuiltIn: true,
            order: row.order_index as number,
            lastUsed: row.last_used as number
        }));
    }

    async getCustomPrompts(): Promise<PromptTemplate[]> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT id, title, content, description, is_built_in, order_index, last_used
            FROM prompt_templates
            WHERE is_built_in = 0
            ORDER BY order_index ASC, title ASC
        `);

        const rows: any[] = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();

        return rows.map(row => ({
            id: row.id as string,
            title: row.title as string,
            content: row.content as string,
            description: row.description as string || undefined,
            isBuiltIn: false,
            order: row.order_index as number,
            lastUsed: row.last_used as number
        }));
    }

    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.isInitialized = false;
    }

    // Load JSON data fallback - DEPRECATED
    // This method is no longer used. Use the migration script instead:
    // npm run migrate
    // private async loadJsonData(): Promise<void> {
    //     try {
    //         const jsonPath = `${this.dataDir}/data.json`;
    //         if (this.adapter && await this.adapter.exists(jsonPath)) {
    //             const jsonContent = await this.adapter.read(jsonPath);
    //             JSON.parse(jsonContent);
    //             Logger.debug('Found data.json - please run migration: npm run migrate');
    //         }
    //     } catch (error) {
    //         Logger.debug('No JSON data found');
    //     }
    // }

    // Backup and restore
    async backup(backupPath: string): Promise<void> {
        if (!this.db || !this.adapter) return;
        
        try {
            const data = this.db.export();
            await this.adapter.writeBinary(backupPath, data.buffer as ArrayBuffer);
        } catch (error) {
            Logger.error('Failed to backup database:', error);
        }
    }

    // MCP Configuration Management (JSON file based)
    async loadMCPConfig(): Promise<MCPServersConfig> {
        if (!this.adapter) {
            return { mcpServers: {} };
        }

        try {
            // Store MCP config in plugin directory
            const mcpConfigPath = '.obsidian/plugins/obsidian-llmsider/mcp-config.json';
            if (await this.adapter.exists(mcpConfigPath)) {
                const configContent = await this.adapter.read(mcpConfigPath);
                const config = JSON.parse(configContent) as MCPServersConfig;
                Logger.debug('Loaded MCP config from file');
                return config;
            }
        } catch (error) {
            Logger.error('Failed to load MCP config:', error);
        }

        return { mcpServers: {} };
    }

    async saveMCPConfig(config: MCPServersConfig): Promise<void> {
        if (!this.adapter) return;

        try {
            // Store MCP config in plugin directory
            const mcpConfigPath = '.obsidian/plugins/obsidian-llmsider/mcp-config.json';
            const configContent = JSON.stringify(config, null, 2);
            await this.adapter.write(mcpConfigPath, configContent);
            Logger.debug('Saved MCP config to file');
        } catch (error) {
            Logger.error('Failed to save MCP config:', error);
            throw error;
        }
    }

    async exportMCPConfigForClaudeDesktop(): Promise<string> {
        const config = await this.loadMCPConfig();
        return JSON.stringify(config, null, 2);
    }

    async importMCPConfigFromClaudeDesktop(jsonContent: string): Promise<void> {
        try {
            const config = JSON.parse(jsonContent) as MCPServersConfig;
            
            // Validate the structure
            if (!config.mcpServers || typeof config.mcpServers !== 'object') {
                throw new Error('Invalid MCP configuration format');
            }

            await this.saveMCPConfig(config);
            Logger.debug('Successfully imported MCP config from Claude Desktop format');
        } catch (error) {
            Logger.error('Failed to import MCP config:', error);
            throw error;
        }
    }

    // Chat Sessions CRUD operations
    async createChatSession(session: ChatSession): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            INSERT INTO chat_sessions (id, name, messages, created, updated, provider, mode)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([
            session.id,
            session.name,
            JSON.stringify(session.messages),
            session.created,
            session.updated,
            session.provider,
            session.mode
        ]);

        await this.saveToFile();
    }

    async getAllChatSessions(): Promise<ChatSession[]> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT * FROM chat_sessions ORDER BY updated DESC
        `);

        const rows: any[] = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            rows.push({
                id: row.id,
                name: row.name,
                messages: JSON.parse(row.messages as string),
                created: row.created,
                updated: row.updated,
                provider: row.provider,
                mode: row.mode
            });
        }
        stmt.free();

        return rows;
    }

    async getChatSession(id: string): Promise<ChatSession | null> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`SELECT * FROM chat_sessions WHERE id = ?`);
        stmt.bind([id]);

        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();

            return {
                id: row.id,
                name: row.name,
                messages: JSON.parse(row.messages as string),
                created: row.created,
                updated: row.updated,
                provider: row.provider,
                mode: row.mode
            } as ChatSession;
        }

        stmt.free();
        return null;
    }

    async updateChatSession(session: ChatSession): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            UPDATE chat_sessions 
            SET name = ?, messages = ?, updated = ?, provider = ?, mode = ?
            WHERE id = ?
        `);

        stmt.run([
            session.name,
            JSON.stringify(session.messages),
            session.updated,
            session.provider,
            session.mode,
            session.id
        ]);

        await this.saveToFile();
    }

    async deleteChatSession(id: string): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare('DELETE FROM chat_sessions WHERE id = ?');
        stmt.run([id]);
        await this.saveToFile();
    }

    async deleteOldestChatSessions(keepCount: number): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            DELETE FROM chat_sessions WHERE id IN (
                SELECT id FROM chat_sessions ORDER BY updated DESC LIMIT -1 OFFSET ?
            )
        `);
        stmt.run([keepCount]);
        await this.saveToFile();
    }

    // Built-in Tool Permissions CRUD operations
    async getBuiltInToolPermissions(): Promise<Record<string, boolean>> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`SELECT tool_name, enabled FROM built_in_tool_permissions`);
        const permissions: Record<string, boolean> = {};

        while (stmt.step()) {
            const row = stmt.getAsObject();
            permissions[row.tool_name as string] = Boolean(row.enabled);
        }
        stmt.free();

        return permissions;
    }

    async setBuiltInToolPermission(toolName: string, enabled: boolean): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO built_in_tool_permissions (tool_name, enabled, updated_at)
            VALUES (?, ?, ?)
        `);

        stmt.run([toolName, enabled ? 1 : 0, Date.now()]);
        await this.saveToFile();
    }

    async setBuiltInToolPermissions(permissions: Record<string, boolean>): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO built_in_tool_permissions (tool_name, enabled, updated_at)
            VALUES (?, ?, ?)
        `);

        for (const [toolName, enabled] of Object.entries(permissions)) {
            stmt.bind([toolName, enabled ? 1 : 0, Date.now()]);
            stmt.step();
            stmt.reset();
        }
        stmt.free();

        await this.saveToFile();
    }

    // I18n Settings
    async getI18nSettings(): Promise<{ language: 'en' | 'zh'; initialized: boolean }> {
        const language = await this.getConfig('i18n.language');
        const initialized = await this.getConfig('i18n.initialized');
        
        return {
            language: (language as 'en' | 'zh') || 'en',
            initialized: initialized === 'true'
        };
    }

    async setI18nSettings(settings: { language: 'en' | 'zh'; initialized: boolean }): Promise<void> {
        await this.setConfig('i18n.language', settings.language);
        await this.setConfig('i18n.initialized', settings.initialized.toString());
    }

    // Autocomplete Settings
    async getAutocompleteSettings(): Promise<any> {
        const enabled = await this.getConfig('autocomplete.enabled');
        const granularity = await this.getConfig('autocomplete.granularity');
        const tone = await this.getConfig('autocomplete.tone');
        const domain = await this.getConfig('autocomplete.domain');
        const triggerDelay = await this.getConfig('autocomplete.triggerDelay');
        const maxSuggestions = await this.getConfig('autocomplete.maxSuggestions');

        return {
            enabled: enabled === null ? true : enabled === 'true',
            granularity: granularity || 'phrase',
            tone: tone || 'professional',
            domain: domain || 'general',
            triggerDelay: triggerDelay ? parseInt(triggerDelay) : 500,
            maxSuggestions: maxSuggestions ? parseInt(maxSuggestions) : 1
        };
    }

    async setAutocompleteSettings(settings: any): Promise<void> {
        await this.setConfig('autocomplete.enabled', settings.enabled.toString());
        await this.setConfig('autocomplete.granularity', settings.granularity);
        await this.setConfig('autocomplete.tone', settings.tone);
        await this.setConfig('autocomplete.domain', settings.domain);
        await this.setConfig('autocomplete.triggerDelay', settings.triggerDelay.toString());
        await this.setConfig('autocomplete.maxSuggestions', settings.maxSuggestions.toString());
    }

    // Inline Quick Chat Settings
    async getInlineQuickChatSettings(): Promise<any> {
        const enabled = await this.getConfig('inlineQuickChat.enabled');
        const triggerKey = await this.getConfig('inlineQuickChat.triggerKey');
        const showOnSelection = await this.getConfig('inlineQuickChat.showOnSelection');
        const enableDiffPreview = await this.getConfig('inlineQuickChat.enableDiffPreview');
        const showQuickChatButton = await this.getConfig('inlineQuickChat.showQuickChatButton');

        return {
            enabled: enabled === 'true',
            triggerKey: triggerKey || 'Mod+/',
            showOnSelection: showOnSelection === 'true',
            enableDiffPreview: enableDiffPreview === null ? true : enableDiffPreview === 'true',
            showQuickChatButton: showQuickChatButton === 'true'
        };
    }

    async setInlineQuickChatSettings(settings: any): Promise<void> {
        await this.setConfig('inlineQuickChat.enabled', settings.enabled.toString());
        await this.setConfig('inlineQuickChat.triggerKey', settings.triggerKey);
        await this.setConfig('inlineQuickChat.showOnSelection', settings.showOnSelection.toString());
        await this.setConfig('inlineQuickChat.enableDiffPreview', settings.enableDiffPreview.toString());
        await this.setConfig('inlineQuickChat.showQuickChatButton', settings.showQuickChatButton.toString());
    }

    // Selection Popup Settings
    async getSelectionPopupSettings(): Promise<any> {
        const showAddToContext = await this.getConfig('selectionPopup.showAddToContext');
        return {
            showAddToContext: showAddToContext === 'true'
        };
    }

    async setSelectionPopupSettings(settings: any): Promise<void> {
        await this.setConfig('selectionPopup.showAddToContext', settings.showAddToContext.toString());
    }

    // Google Search Settings
    async getGoogleSearchSettings(): Promise<any> {
        const searchBackend = await this.getConfig('googleSearch.searchBackend');
        const googleApiKey = await this.getConfig('googleSearch.googleApiKey');
        const googleSearchEngineId = await this.getConfig('googleSearch.googleSearchEngineId');
        const serpapiKey = await this.getConfig('googleSearch.serpapiKey');
        const tavilyApiKey = await this.getConfig('googleSearch.tavilyApiKey');

        return {
            searchBackend: searchBackend || 'google',
            googleApiKey: googleApiKey || '',
            googleSearchEngineId: googleSearchEngineId || '',
            serpapiKey: serpapiKey || '',
            tavilyApiKey: tavilyApiKey || ''
        };
    }

    async setGoogleSearchSettings(settings: any): Promise<void> {
        await this.setConfig('googleSearch.searchBackend', settings.searchBackend);
        if (settings.googleApiKey !== undefined) {
            await this.setConfig('googleSearch.googleApiKey', settings.googleApiKey);
        }
        if (settings.googleSearchEngineId !== undefined) {
            await this.setConfig('googleSearch.googleSearchEngineId', settings.googleSearchEngineId);
        }
        if (settings.serpapiKey !== undefined) {
            await this.setConfig('googleSearch.serpapiKey', settings.serpapiKey);
        }
        if (settings.tavilyApiKey !== undefined) {
            await this.setConfig('googleSearch.tavilyApiKey', settings.tavilyApiKey);
        }
    }

    // Vector Database Settings
    async getVectorSettings(): Promise<any> {
        const enabled = await this.getConfig('vector.enabled');
        const showSimilarNotes = await this.getConfig('vector.showSimilarNotes');
        const autoSearchEnabled = await this.getConfig('vector.autoSearchEnabled');
        const indexName = await this.getConfig('vector.indexName');
        const chunkingStrategy = await this.getConfig('vector.chunkingStrategy');
        const chunkSize = await this.getConfig('vector.chunkSize');
        const chunkOverlap = await this.getConfig('vector.chunkOverlap');
        const topK = await this.getConfig('vector.topK');
        const embeddingModelId = await this.getConfig('vector.embeddingModelId');
        const suggestRelatedFiles = await this.getConfig('vector.suggestRelatedFiles');
        const suggestionTimeout = await this.getConfig('vector.suggestionTimeout');

        return {
            enabled: enabled === 'true',
            showSimilarNotes: showSimilarNotes === null ? true : showSimilarNotes === 'true',
            autoSearchEnabled: autoSearchEnabled === 'true',
            storagePath: '.obsidian/plugins/obsidian-llmsider/vector-data', // Always use default, not stored in DB
            indexName: indexName || 'vault-semantic-index',
            chunkingStrategy: chunkingStrategy || 'character',
            chunkSize: chunkSize ? parseInt(chunkSize) : 1000,
            chunkOverlap: chunkOverlap ? parseInt(chunkOverlap) : 100,
            topK: topK ? parseInt(topK) : 5,
            embeddingModelId: embeddingModelId || '',
            suggestRelatedFiles: suggestRelatedFiles === 'true',
            suggestionTimeout: suggestionTimeout ? parseInt(suggestionTimeout) : 5000,
            localModelPath: '.obsidian/plugins/obsidian-llmsider/models' // Always use default, not stored in DB
        };
    }

    async setVectorSettings(settings: any): Promise<void> {
        await this.setConfig('vector.enabled', settings.enabled.toString());
        await this.setConfig('vector.showSimilarNotes', settings.showSimilarNotes?.toString() || 'true');
        await this.setConfig('vector.autoSearchEnabled', settings.autoSearchEnabled?.toString() || 'false');
        // storagePath and localModelPath are not stored in DB - always use defaults
        await this.setConfig('vector.indexName', settings.indexName);
        await this.setConfig('vector.chunkingStrategy', settings.chunkingStrategy);
        await this.setConfig('vector.chunkSize', settings.chunkSize.toString());
        await this.setConfig('vector.chunkOverlap', settings.chunkOverlap.toString());
        await this.setConfig('vector.topK', settings.topK.toString());
        await this.setConfig('vector.embeddingModelId', settings.embeddingModelId);
        await this.setConfig('vector.suggestRelatedFiles', settings.suggestRelatedFiles?.toString() || 'false');
        await this.setConfig('vector.suggestionTimeout', settings.suggestionTimeout?.toString() || '5000');
    }

    // Other Settings
    async getMaxChatHistory(): Promise<number> {
        const value = await this.getConfig('maxChatHistory');
        return value ? parseInt(value) : 50;
    }

    async setMaxChatHistory(maxHistory: number): Promise<void> {
        await this.setConfig('maxChatHistory', maxHistory.toString());
    }

    async getNextSessionId(): Promise<number> {
        const value = await this.getConfig('nextSessionId');
        return value ? parseInt(value) : 1;
    }

    async setNextSessionId(nextId: number): Promise<void> {
        await this.setConfig('nextSessionId', nextId.toString());
    }

    async getDebugMode(): Promise<boolean> {
        const value = await this.getConfig('debugMode');
        return value === 'true';
    }

    async setDebugMode(enabled: boolean): Promise<void> {
        await this.setConfig('debugMode', enabled.toString());
    }

    async getEnableDiffRendering(): Promise<boolean> {
        const value = await this.getConfig('enableDiffRenderingInActionMode');
        return value === 'true';
    }

    async setEnableDiffRendering(enabled: boolean): Promise<void> {
        await this.setConfig('enableDiffRenderingInActionMode', enabled.toString());
    }

    async getShowSidebar(): Promise<boolean> {
        const value = await this.getConfig('showSidebar');
        return value === null ? true : value === 'true';
    }

    async setShowSidebar(show: boolean): Promise<void> {
        await this.setConfig('showSidebar', show.toString());
    }

    async getSidebarPosition(): Promise<'left' | 'right'> {
        const value = await this.getConfig('sidebarPosition');
        return (value as 'left' | 'right') || 'right';
    }

    async setSidebarPosition(position: 'left' | 'right'): Promise<void> {
        await this.setConfig('sidebarPosition', position);
    }

    // MCP Settings (serverPermissions only, serversConfig stays in mcp-config.json)
    async getMCPServerPermissions(): Promise<Record<string, any>> {
        const value = await this.getConfig('mcpServerPermissions');
        if (!value) return {};
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }

    async setMCPServerPermissions(permissions: Record<string, any>): Promise<void> {
        await this.setConfig('mcpServerPermissions', JSON.stringify(permissions));
    }

    async getMCPEnableToolSuggestions(): Promise<boolean> {
        const value = await this.getConfig('mcpEnableToolSuggestions');
        return value === null ? true : value === 'true';
    }

    async setMCPEnableToolSuggestions(enabled: boolean): Promise<void> {
        await this.setConfig('mcpEnableToolSuggestions', enabled.toString());
    }

    async getMCPEnableResourceBrowsing(): Promise<boolean> {
        const value = await this.getConfig('mcpEnableResourceBrowsing');
        return value === null ? true : value === 'true';
    }

    async setMCPEnableResourceBrowsing(enabled: boolean): Promise<void> {
        await this.setConfig('mcpEnableResourceBrowsing', enabled.toString());
    }

    async getMCPRequireConfirmationForTools(): Promise<boolean> {
        const value = await this.getConfig('mcpRequireConfirmationForTools');
        return value === 'true';
    }

    async setMCPRequireConfirmationForTools(enabled: boolean): Promise<void> {
        await this.setConfig('mcpRequireConfirmationForTools', enabled.toString());
    }

    // ============================================================================
    // Tool Auto-Execute Settings
    // ============================================================================

    /**
     * Get all tool auto-execute settings
     */
    async getToolAutoExecute(): Promise<Record<string, boolean>> {
        const value = await this.getConfig('toolAutoExecute');
        if (!value) return {};
        try {
            return JSON.parse(value);
        } catch (error) {
            Logger.error('Failed to parse toolAutoExecute config:', error);
            return {};
        }
    }

    /**
     * Set tool auto-execute settings
     */
    async setToolAutoExecute(settings: Record<string, boolean>): Promise<void> {
        await this.setConfig('toolAutoExecute', JSON.stringify(settings));
    }

    /**
     * Set auto-execute for a specific tool
     */
    async setToolAutoExecuteForTool(toolName: string, autoExecute: boolean): Promise<void> {
        const settings = await this.getToolAutoExecute();
        settings[toolName] = autoExecute;
        await this.setToolAutoExecute(settings);
    }

    /**
     * Get auto-execute setting for a specific tool
     */
    async getToolAutoExecuteForTool(toolName: string): Promise<boolean> {
        const settings = await this.getToolAutoExecute();
        return settings[toolName] ?? false; // Default to false (require confirmation)
    }

    // ============================================================================
    // Tool Settings (New Persistent Storage)
    // ============================================================================

    /**
     * Get tool settings (enabled and require_confirmation states)
     */
    getToolSettings(toolId: string): { enabled: boolean; requireConfirmation: boolean } | null {
        if (!this.db) return null;
        
        try {
            const stmt = this.db.prepare(`
                SELECT enabled, require_confirmation 
                FROM tool_settings 
                WHERE tool_id = ?
            `);
            stmt.bind([toolId]);
            
            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                return {
                    enabled: row.enabled === 1,
                    requireConfirmation: row.require_confirmation === 1
                };
            }
            
            stmt.free();
            return null;
        } catch (error) {
            Logger.error('Failed to get tool settings:', error);
            return null;
        }
    }

    /**
     * Set tool settings (both enabled and require_confirmation)
     */
    setToolSettings(toolId: string, enabled: boolean, requireConfirmation: boolean, serverId?: string): void {
        if (!this.db) return;
        
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO tool_settings (tool_id, enabled, require_confirmation, server_id, updated_at)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.bind([
                toolId,
                enabled ? 1 : 0,
                requireConfirmation ? 1 : 0,
                serverId || null,
                Date.now()
            ]);
            stmt.step();
            stmt.free();
        } catch (error) {
            Logger.error('Failed to set tool settings:', error);
        }
    }

    /**
     * Set tool enabled state only
     */
    setToolEnabled(toolId: string, enabled: boolean, serverId?: string): void {
        if (!this.db) return;
        
        try {
            // Get existing settings or use defaults
            const existing = this.getToolSettings(toolId);
            const requireConfirmation = existing?.requireConfirmation ?? true; // Default to require confirmation
            
            this.setToolSettings(toolId, enabled, requireConfirmation, serverId);
        } catch (error) {
            Logger.error('Failed to set tool enabled state:', error);
        }
    }

    /**
     * Set tool require_confirmation state only
     */
    setToolRequireConfirmation(toolId: string, requireConfirmation: boolean, serverId?: string): void {
        if (!this.db) return;
        
        try {
            // Get existing settings or use defaults
            const existing = this.getToolSettings(toolId);
            const enabled = existing?.enabled ?? true; // Default to enabled
            
            this.setToolSettings(toolId, enabled, requireConfirmation, serverId);
        } catch (error) {
            Logger.error('Failed to set tool require confirmation state:', error);
        }
    }

    /**
     * Initialize tool settings with defaults (called when new tools are discovered)
     */
    initializeToolSettings(toolId: string, serverId?: string): void {
        if (!this.db) return;
        
        // Only initialize if not already exists
        const existing = this.getToolSettings(toolId);
        if (existing === null) {
            // Default: enabled=true, requireConfirmation=true
            this.setToolSettings(toolId, true, true, serverId);
        }
    }

    /**
     * Get all tool settings for a specific server
     */
    getToolSettingsByServer(serverId: string): Map<string, { enabled: boolean; requireConfirmation: boolean }> {
        const result = new Map<string, { enabled: boolean; requireConfirmation: boolean }>();
        
        if (!this.db) return result;
        
        try {
            const stmt = this.db.prepare(`
                SELECT tool_id, enabled, require_confirmation 
                FROM tool_settings 
                WHERE server_id = ?
            `);
            stmt.bind([serverId]);
            
            while (stmt.step()) {
                const row = stmt.getAsObject();
                result.set(row.tool_id as string, {
                    enabled: row.enabled === 1,
                    requireConfirmation: row.require_confirmation === 1
                });
            }
            
            stmt.free();
        } catch (error) {
            Logger.error('Failed to get tool settings by server:', error);
        }
        
        return result;
    }

    /**
     * Remove tool settings for tools that no longer exist
     */
    cleanupToolSettings(validToolIds: string[]): void {
        if (!this.db) return;
        
        try {
            if (validToolIds.length === 0) {
                // If no valid tools, clear all
                this.db.run(`DELETE FROM tool_settings`);
                return;
            }
            
            const placeholders = validToolIds.map(() => '?').join(',');
            const stmt = this.db.prepare(`
                DELETE FROM tool_settings 
                WHERE tool_id NOT IN (${placeholders})
            `);
            
            stmt.bind(validToolIds);
            stmt.step();
            stmt.free();
        } catch (error) {
            Logger.error('Failed to cleanup tool settings:', error);
        }
    }

    /**
     * Remove all tool settings for a specific server
     */
    removeToolSettingsByServer(serverId: string): void {
        if (!this.db) return;
        
        try {
            const stmt = this.db.prepare(`DELETE FROM tool_settings WHERE server_id = ?`);
            stmt.bind([serverId]);
            stmt.step();
            stmt.free();
        } catch (error) {
            Logger.error('Failed to remove tool settings by server:', error);
        }
    }

    /**
     * Get built-in tool settings (enabled state and require confirmation)
     * Built-in tools use 'built-in:toolName' as tool_id
     */
    getBuiltInToolSettings(toolName: string): { enabled: boolean; requireConfirmation: boolean } | null {
        if (!this.db) return null;
        
        const toolId = `built-in:${toolName}`;
        return this.getToolSettings(toolId);
    }

    /**
     * Set built-in tool enabled state
     */
    setBuiltInToolEnabled(toolName: string, enabled: boolean): void {
        if (!this.db) return;
        
        const toolId = `built-in:${toolName}`;
        this.setToolEnabled(toolId, enabled, 'built-in');
    }

    /**
     * Set built-in tool require confirmation state
     */
    setBuiltInToolRequireConfirmation(toolName: string, requireConfirmation: boolean): void {
        if (!this.db) return;
        
        const toolId = `built-in:${toolName}`;
        this.setToolRequireConfirmation(toolId, requireConfirmation, 'built-in');
    }

    /**
     * Initialize built-in tool settings with defaults
     * Default: enabled=true, requireConfirmation=true
     */
    initializeBuiltInToolSettings(toolName: string): void {
        if (!this.db) return;
        
        const toolId = `built-in:${toolName}`;
        this.initializeToolSettings(toolId, 'built-in');
    }

    /**
     * Get enabled state for a built-in tool (convenience method)
     * Returns true if not set (default enabled)
     */
    isBuiltInToolEnabled(toolName: string): boolean {
        const settings = this.getBuiltInToolSettings(toolName);
        return settings ? settings.enabled : true;
    }

    /**
     * Get require confirmation state for a built-in tool (convenience method)
     * Returns true if not set (default require confirmation)
     */
    isBuiltInToolRequireConfirmation(toolName: string): boolean {
        const settings = this.getBuiltInToolSettings(toolName);
        return settings ? settings.requireConfirmation : true;
    }

    // ============================================================================
    // Connection and Model Methods (New Architecture)
    // ============================================================================

    /**
     * Get all connections
     */
    async getConnections(): Promise<any[]> {
        if (!this.db) return [];
        try {
            const stmt = this.db.prepare(`
                SELECT id, name, type, api_key as apiKey, base_url as baseUrl, 
                       organization_id as organizationId, enabled, created, updated
                FROM connections
                ORDER BY created DESC
            `);
            const connections = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                const connection: any = {
                    ...row,
                    enabled: row.enabled === 1
                };
                
                // For GitHub Copilot, decode tokens from apiKey JSON
                if (connection.type === 'github-copilot' && connection.apiKey) {
                    try {
                        const tokenData = JSON.parse(connection.apiKey);
                        connection.githubToken = tokenData.githubToken;
                        connection.copilotToken = tokenData.copilotToken;
                        connection.tokenExpiry = tokenData.tokenExpiry;
                        connection.apiKey = ''; // Clear apiKey to avoid confusion
                    } catch (e) {
                        // If parsing fails, keep apiKey as is
                    }
                }
                
                connections.push(connection);
            }
            stmt.free();
            return connections;
        } catch (error) {
            Logger.error('Error getting connections:', error);
            return [];
        }
    }

    /**
     * Save or update a connection
     */
    async saveConnection(connection: any): Promise<void> {
        if (!this.db) return;
        try {
            // For GitHub Copilot, encode tokens into apiKey as JSON
            let apiKeyValue = connection.apiKey || '';
            if (connection.type === 'github-copilot' && (connection.githubToken || connection.copilotToken)) {
                apiKeyValue = JSON.stringify({
                    githubToken: connection.githubToken,
                    copilotToken: connection.copilotToken,
                    tokenExpiry: connection.tokenExpiry
                });
            }
            
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO connections 
                (id, name, type, api_key, base_url, organization_id, enabled, created, updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.bind([
                connection.id,
                connection.name,
                connection.type,
                apiKeyValue,
                connection.baseUrl || null,
                connection.organizationId || null,
                connection.enabled ? 1 : 0,
                connection.created,
                connection.updated
            ]);
            stmt.step();
            stmt.free();
            await this.saveToFile();
        } catch (error) {
            Logger.error('Error saving connection:', error);
            throw error;
        }
    }

    /**
     * Delete a connection and its associated models
     */
    async deleteConnection(id: string): Promise<void> {
        if (!this.db) return;
        try {
            // Models will be deleted automatically due to CASCADE
            const stmt = this.db.prepare(`DELETE FROM connections WHERE id = ?`);
            stmt.bind([id]);
            stmt.step();
            stmt.free();
            await this.saveToFile();
        } catch (error) {
            Logger.error('Error deleting connection:', error);
            throw error;
        }
    }

    /**
     * Get all models
     */
    async getModels(): Promise<any[]> {
        if (!this.db) return [];
        try {
            const stmt = this.db.prepare(`
                SELECT id, name, connection_id as connectionId, model_name as modelName,
                       max_tokens as maxTokens, temperature, top_p as topP,
                       enabled, supports_vision as supportsVision, is_default as isDefault,
                       is_embedding as isEmbedding, embedding_dimension as embeddingDimension,
                       created, updated
                FROM models
                ORDER BY created DESC
            `);
            const models = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                models.push({
                    ...row,
                    enabled: row.enabled === 1,
                    supportsVision: row.supportsVision === 1,
                    isDefault: row.isDefault === 1,
                    isEmbedding: row.isEmbedding === 1,
                    embeddingDimension: row.embeddingDimension || undefined
                });
            }
            stmt.free();
            return models;
        } catch (error) {
            Logger.error('Error getting models:', error);
            return [];
        }
    }

    /**
     * Get models for a specific connection
     */
    async getModelsForConnection(connectionId: string): Promise<any[]> {
        if (!this.db) return [];
        try {
            const stmt = this.db.prepare(`
                SELECT id, name, connection_id as connectionId, model_name as modelName,
                       max_tokens as maxTokens, temperature, top_p as topP,
                       enabled, supports_vision as supportsVision, is_default as isDefault,
                       is_embedding as isEmbedding, embedding_dimension as embeddingDimension,
                       created, updated
                FROM models
                WHERE connection_id = ?
                ORDER BY is_default DESC, created DESC
            `);
            stmt.bind([connectionId]);
            const models = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                models.push({
                    ...row,
                    enabled: row.enabled === 1,
                    supportsVision: row.supportsVision === 1,
                    isDefault: row.isDefault === 1,
                    isEmbedding: row.isEmbedding === 1,
                    embeddingDimension: row.embeddingDimension || undefined
                });
            }
            stmt.free();
            return models;
        } catch (error) {
            Logger.error('Error getting models for connection:', error);
            return [];
        }
    }

    /**
     * Save or update a model
     */
    async saveModel(model: any): Promise<void> {
        if (!this.db) return;
        try {
            // Debug log for embedding models
            if (model.isEmbedding) {
                Logger.debug('Saving embedding model to database:', {
                    id: model.id,
                    name: model.name,
                    modelName: model.modelName,
                    isEmbedding: model.isEmbedding,
                    embeddingDimension: model.embeddingDimension
                });
            }

            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO models
                (id, name, connection_id, model_name, max_tokens, temperature, top_p,
                 enabled, supports_vision, is_default, is_embedding, embedding_dimension, created, updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.bind([
                model.id,
                model.name,
                model.connectionId,
                model.modelName,
                model.maxTokens,
                model.temperature,
                model.topP || null,
                model.enabled ? 1 : 0,
                model.supportsVision ? 1 : 0,
                model.isDefault ? 1 : 0,
                model.isEmbedding ? 1 : 0,
                model.embeddingDimension || null,
                model.created,
                model.updated
            ]);
            stmt.step();
            stmt.free();
            await this.saveToFile();

            // Verify save for embedding models
            if (model.isEmbedding) {
                const verifyStmt = this.db.prepare('SELECT is_embedding, embedding_dimension FROM models WHERE id = ?');
                verifyStmt.bind([model.id]);
                if (verifyStmt.step()) {
                    const row = verifyStmt.getAsObject();
                    Logger.debug('Verified saved model in DB:', {
                        id: model.id,
                        is_embedding: row.is_embedding,
                        embedding_dimension: row.embedding_dimension
                    });
                }
                verifyStmt.free();
            }
        } catch (error) {
            Logger.error('Error saving model:', error);
            throw error;
        }
    }

    /**
     * Delete a model
     */
    async deleteModel(id: string): Promise<void> {
        if (!this.db) return;
        try {
            const stmt = this.db.prepare(`DELETE FROM models WHERE id = ?`);
            stmt.bind([id]);
            stmt.step();
            stmt.free();
            await this.saveToFile();
        } catch (error) {
            Logger.error('Error deleting model:', error);
            throw error;
        }
    }

    /**
     * Get active connection ID
     */
    async getActiveConnectionId(): Promise<string | null> {
        return await this.getConfig('activeConnectionId');
    }

    /**
     * Set active connection ID
     */
    async setActiveConnectionId(connectionId: string): Promise<void> {
        await this.setConfig('activeConnectionId', connectionId);
    }

    /**
     * Get active model ID
     */
    async getActiveModelId(): Promise<string | null> {
        return await this.getConfig('activeModelId');
    }

    /**
     * Set active model ID
     */
    async setActiveModelId(modelId: string): Promise<void> {
        await this.setConfig('activeModelId', modelId);
    }

}
