import initSqlJs, { Database } from 'sql.js';
import { Logger } from '././logger';
import { ProviderType, PromptTemplate, MCPServersConfig, ChatSession } from '../types';
import { DataAdapter, Vault } from 'obsidian';
import { BUILT_IN_PROMPTS, getBuiltInPrompts } from '../data/built-in-prompts';
import { SQL_WASM_BASE64 } from './sql-wasm-data';

// Helper type for sql.js query results
type SqlRow = Record<string, string | number | boolean | null>;

export interface ConfigData {
    agentMode: boolean;
    prompts?: PromptTemplate[];
    mcpServersConfig?: MCPServersConfig; // JSON file based, not database stored
}

export class ConfigDatabase {
    private db: Database | null = null;
    private dbPath: string;
    private isInitialized = false;
    private vault?: Vault;
    private saveTimer: number | null = null;
    private pendingSave = false;

    constructor(private dataDir: string, private adapter?: DataAdapter, vault?: Vault) {
        this.vault = vault;
        // Use configDir from vault (user-configurable)
        // Note: vault.configDir is always available in Obsidian, no fallback needed
        // eslint-disable-next-line obsidianmd/hardcoded-config-path
        const configDir = vault?.configDir || '.obsidian'; // Fallback only for tests
        this.dbPath = `${configDir}/plugins/obsidian-llmsider/config.db`;
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
            // Retry up to 3 times if WASM initialization fails due to memory issues
            let SQL;
            let lastError;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    SQL = await initSqlJs({
                        wasmBinary: wasmBinary
                    });
                    Logger.debug(`SQL.js initialized successfully on attempt ${attempt}`);
                    break;
                } catch (error) {
                    lastError = error;
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    
                    // Check if it's a WASM memory error
                    if (errorMsg.includes('Out of memory') || errorMsg.includes('Cannot allocate Wasm memory')) {
                        Logger.warn(`WASM memory allocation failed on attempt ${attempt}/3:`, errorMsg);
                        
                        // Wait a bit before retrying to allow memory to be freed
                        if (attempt < 3) {
                            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                            // Suggest garbage collection (only a hint to the browser)
                            if (globalThis.gc) {
                                globalThis.gc();
                            }
                        }
                    } else {
                        // Not a memory error, don't retry
                        throw error;
                    }
                }
            }
            
            if (!SQL) {
                throw lastError || new Error('Failed to initialize SQL.js after retries');
            }

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
                proxy_enabled INTEGER NOT NULL DEFAULT 0,
                proxy_type TEXT,
                proxy_host TEXT,
                proxy_port INTEGER,
                proxy_auth INTEGER NOT NULL DEFAULT 0,
                proxy_username TEXT,
                proxy_password TEXT,
                enabled INTEGER NOT NULL DEFAULT 1,
                created INTEGER NOT NULL,
                updated INTEGER NOT NULL
            )
        `);

        // Migrate existing connections table to add proxy fields if they don't exist
        try {
            // Check if proxy_enabled column exists by querying table structure
            const stmt = this.db.prepare('PRAGMA table_info(connections)');
            const columns: string[] = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                columns.push(row.name as string);
            }
            stmt.free();

            // If proxy_enabled column doesn't exist, add all proxy columns
            if (!columns.includes('proxy_enabled')) {
                Logger.info('Migrating connections table to add proxy support...');
                this.db.run('ALTER TABLE connections ADD COLUMN proxy_enabled INTEGER NOT NULL DEFAULT 0');
                this.db.run('ALTER TABLE connections ADD COLUMN proxy_type TEXT');
                this.db.run('ALTER TABLE connections ADD COLUMN proxy_host TEXT');
                this.db.run('ALTER TABLE connections ADD COLUMN proxy_port INTEGER');
                this.db.run('ALTER TABLE connections ADD COLUMN proxy_auth INTEGER NOT NULL DEFAULT 0');
                this.db.run('ALTER TABLE connections ADD COLUMN proxy_username TEXT');
                this.db.run('ALTER TABLE connections ADD COLUMN proxy_password TEXT');
                Logger.info('✅ Proxy columns added successfully to connections table');
            }
        } catch (e) {
            Logger.error('Failed to migrate connections table:', e);
        }

        // Fix connections with missing or empty type field
        // Run this every time to catch any connections created with empty type
        try {
            const stmt = this.db.prepare("SELECT id, name, type FROM connections WHERE type IS NULL OR type = ''");
            const needsFix: { id: string; name: string }[] = [];
            
            while (stmt.step()) {
                const row = stmt.getAsObject();
                needsFix.push({ id: row.id as string, name: row.name as string });
            }
            stmt.free();

            if (needsFix.length > 0) {
                Logger.warn(`⚠️  Found ${needsFix.length} connection(s) with missing type field, fixing...`);
                
                for (const conn of needsFix) {
                    let inferredType = 'openai'; // default fallback
                    
                    const nameLower = conn.name.toLowerCase();
                    if (nameLower.includes('deepseek') || nameLower.includes('freeds')) {
                        inferredType = 'free-deepseek';
                    } else if (nameLower.includes('anthropic') || nameLower.includes('claude')) {
                        inferredType = 'anthropic';
                    } else if (nameLower.includes('openai') || nameLower.includes('gpt')) {
                        inferredType = 'openai';
                    } else if (nameLower.includes('google') || nameLower.includes('gemini')) {
                        inferredType = 'google';
                    } else if (nameLower.includes('qwen') || nameLower.includes('tongyi')) {
                        inferredType = 'qwen';
                    } else if (nameLower.includes('azure')) {
                        inferredType = 'azure-openai';
                    } else if (nameLower.includes('ollama')) {
                        inferredType = 'ollama';
                    } else if (nameLower.includes('hugging') && nameLower.includes('chat')) {
                        inferredType = 'hugging-chat';
                    } else if (nameLower.includes('github') || nameLower.includes('copilot')) {
                        inferredType = 'github-copilot';
                    }
                    
                    this.db.run('UPDATE connections SET type = ? WHERE id = ?', [inferredType, conn.id]);
                    Logger.info(`✅ Fixed connection "${conn.name}" - set type to: ${inferredType}`);
                }
                
                // Save immediately after fixing to persist changes
                this.saveToFileImmediate();
            }
        } catch (e) {
            Logger.error('Failed to fix connection types:', e);
        }

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

        // Migration: Add supports_vision column if it doesn't exist
        try {
            const tableInfo = this.db.exec("PRAGMA table_info(models)");
            const columns = tableInfo[0].values.map(v => v[1]);
            if (!columns.includes('supports_vision')) {
                Logger.info('Migrating models table: adding supports_vision column');
                this.db.run('ALTER TABLE models ADD COLUMN supports_vision INTEGER NOT NULL DEFAULT 0');
            }
        } catch (e) {
            Logger.error('Failed to check/migrate models table for supports_vision:', e);
        }

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
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
                usage_count INTEGER NOT NULL DEFAULT 0,
                pinned INTEGER NOT NULL DEFAULT 0,
                is_user_modified INTEGER NOT NULL DEFAULT 0,
                is_deleted INTEGER NOT NULL DEFAULT 0
            )
        `);

        // Create indexes for prompt templates
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_title ON prompt_templates(title)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_is_built_in ON prompt_templates(is_built_in)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_order ON prompt_templates(order_index)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_last_used ON prompt_templates(last_used)`);
        
        // Migration: Add usage_count and pinned columns if they don't exist
        try {
            const tableInfo = this.db.exec("PRAGMA table_info(prompt_templates)");
            if (tableInfo.length > 0) {
                const columns = tableInfo[0].values.map(v => v[1]);
                if (!columns.includes('usage_count')) {
                    this.db.run("ALTER TABLE prompt_templates ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0");
                    Logger.info("Added usage_count column to prompt_templates table");
                }
                if (!columns.includes('pinned')) {
                    this.db.run("ALTER TABLE prompt_templates ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0");
                    Logger.info("Added pinned column to prompt_templates table");
                }
                if (!columns.includes('is_user_modified')) {
                    this.db.run("ALTER TABLE prompt_templates ADD COLUMN is_user_modified INTEGER NOT NULL DEFAULT 0");
                    Logger.info("Added is_user_modified column to prompt_templates table");
                }
                if (!columns.includes('is_deleted')) {
                    this.db.run("ALTER TABLE prompt_templates ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0");
                    Logger.info("Added is_deleted column to prompt_templates table");
                }
            }
        } catch (e) {
            Logger.error("Failed to migrate prompt_templates table:", e);
        }

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
        
        // Create prompt_history table for quick chat history
        this.db.run(`
            CREATE TABLE IF NOT EXISTS prompt_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt TEXT NOT NULL UNIQUE,
                last_used INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
                use_count INTEGER NOT NULL DEFAULT 1
            )
        `);
        
        // Create indexes for prompt_history
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_history_last_used ON prompt_history(last_used DESC)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_history_prompt ON prompt_history(prompt)`);
        
        // DEPRECATED: Create built_in_tool_permissions table (kept for backward compatibility)
        // New code uses tool_settings table with 'built-in:toolName' format
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
            // Get built-in prompts with i18n support
            const builtInPrompts = getBuiltInPrompts();
            
            const countResult = this.db.exec('SELECT COUNT(*) as count FROM prompt_templates WHERE is_built_in = 1 AND is_deleted = 0');
            const dbCount = countResult.length > 0 && countResult[0].values.length > 0 
                ? Number(countResult[0].values[0][0]) 
                : 0;
            
            const codeCount = builtInPrompts.length;
            
            Logger.debug(`Built-in prompts - Database (active): ${dbCount}, Code: ${codeCount}`);
            
            const updateStmt = this.db.prepare(`
                UPDATE prompt_templates 
                SET title = ?, content = ?, description = ?, updated_at = ?
                WHERE id = ? AND is_built_in = 1 AND is_user_modified = 0 AND is_deleted = 0
            `);
            
            const now = Date.now();
            let translationUpdateCount = 0;
            for (const prompt of builtInPrompts) {
                updateStmt.bind([
                    prompt.title,
                    prompt.content,
                    prompt.description || '',
                    now,
                    prompt.id
                ]);
                const result = updateStmt.step();
                if (result) translationUpdateCount++;
                updateStmt.reset();
            }
            updateStmt.free();
            Logger.debug(`Updated translations for ${translationUpdateCount} built-in prompts`);

            const upsertStmt = this.db.prepare(`
                INSERT INTO prompt_templates (id, title, content, description, is_built_in, order_index, last_used, usage_count, pinned, is_user_modified, is_deleted, created_at, updated_at)
                SELECT ?, ?, ?, ?, 1, ?, 0, 0, 0, 0, 0, ?, ?
                WHERE NOT EXISTS (SELECT 1 FROM prompt_templates WHERE id = ?)
            `);
            
            let newCount = 0;
            for (const prompt of builtInPrompts) {
                upsertStmt.bind([
                    prompt.id,
                    prompt.title,
                    prompt.content,
                    prompt.description || '',
                    prompt.order,
                    now,
                    now,
                    prompt.id
                ]);
                upsertStmt.step();
                upsertStmt.reset();
                if (this.db.exec('SELECT changes()')[0].values[0][0] as number > 0) {
                    newCount++;
                }
            }
            upsertStmt.free();
            
            if (newCount > 0) {
                Logger.debug(`Imported ${newCount} new built-in prompts`);
            }
            
            // Save changes to file
            this.saveToFile();
            
        } catch (error) {
            Logger.error('Error initializing built-in prompts:', error);
            // Don't throw error, just log it - this shouldn't prevent database initialization
        }
    }
    
    /**
     * Update built-in prompts translations
     * Call this method when language is changed to update prompt titles/descriptions/content
     */
    public updateBuiltInPromptsTranslations(): void {
        if (!this.db) return;
        
        try {
            Logger.debug('Updating built-in prompts translations...');
            
            // Get fresh translations
            const builtInPrompts = getBuiltInPrompts();
            
            const updateStmt = this.db.prepare(`
                UPDATE prompt_templates 
                SET title = ?, content = ?, description = ?, updated_at = ?
                WHERE id = ? AND is_built_in = 1 AND is_user_modified = 0 AND is_deleted = 0
            `);
            
            const now = Date.now();
            for (const prompt of builtInPrompts) {
                updateStmt.bind([
                    prompt.title,
                    prompt.content,
                    prompt.description || '',
                    now,
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

    /**
     * Debounced save to file - delays actual file write by 500ms
     * Multiple rapid saves will be merged into a single write operation
     */
    async saveToFile(): Promise<void> {
        if (!this.db || !this.adapter) return;
        
        this.pendingSave = true;
        
        // Clear existing timer
        if (this.saveTimer !== null) {
            window.clearTimeout(this.saveTimer);
        }
        
        // Set new timer to save after 500ms of inactivity
        this.saveTimer = window.setTimeout(async () => {
            if (!this.pendingSave) return;
            
            try {
                const data = this.db!.export();
                await this.adapter!.writeBinary(this.dbPath, data.buffer as ArrayBuffer);
                this.pendingSave = false;
                this.saveTimer = null;
            } catch (error) {
                Logger.error('Failed to save database:', error);
                this.pendingSave = false;
                this.saveTimer = null;
            }
        }, 500); // 500ms debounce delay
    }

    /**
     * Force immediate save to file, bypassing debounce
     */
    async saveToFileImmediate(): Promise<void> {
        if (!this.db || !this.adapter) return;
        
        // Cancel pending debounced save
        if (this.saveTimer !== null) {
            window.clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        
        try {
            const data = this.db.export();
            await this.adapter.writeBinary(this.dbPath, data.buffer as ArrayBuffer);
            this.pendingSave = false;
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
                const result = stmt.getAsObject() as SqlRow;
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
            const row = stmt.getAsObject() as SqlRow;
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
            SELECT id, title, content, description, is_built_in, order_index, last_used, usage_count, pinned, is_user_modified, is_deleted
            FROM prompt_templates
            WHERE is_deleted = 0
            ORDER BY pinned DESC, usage_count DESC, order_index ASC, title ASC
        `);

        const rows: SqlRow[] = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject() as SqlRow);
        }
        stmt.free();

        // Get built-in prompts from code to add searchKeywords
        const builtInPromptsFromCode = getBuiltInPrompts();
        const keywordsMap = new Map(builtInPromptsFromCode.map(p => [p.id, p.searchKeywords]));

        return rows.map(row => ({
            id: row.id as string,
            title: row.title as string,
            content: row.content as string,
            description: row.description as string || undefined,
            isBuiltIn: Boolean(row.is_built_in),
            order: row.order_index as number,
            lastUsed: row.last_used as number,
            usageCount: Number(row.usage_count || 0),
            pinned: Boolean(row.pinned),
            isUserModified: Boolean(row.is_user_modified),
            isDeleted: Boolean(row.is_deleted),
            searchKeywords: keywordsMap.get(row.id as string) || []
        }));
    }

    async getPrompt(id: string): Promise<PromptTemplate | null> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT id, title, content, description, is_built_in, order_index, last_used, usage_count, pinned, is_user_modified, is_deleted
            FROM prompt_templates
            WHERE id = ? AND is_deleted = 0
        `);
        stmt.bind([id]);

        if (stmt.step()) {
            const row = stmt.getAsObject() as SqlRow;
            stmt.free();

            // Get searchKeywords from built-in prompts if applicable
            const builtInPromptsFromCode = getBuiltInPrompts();
            const foundPrompt = builtInPromptsFromCode.find(p => p.id === row.id);

            return {
                id: row.id as string,
                title: row.title as string,
                content: row.content as string,
                description: row.description as string || undefined,
                isBuiltIn: Boolean(row.is_built_in),
                order: row.order_index as number,
                lastUsed: row.last_used as number,
                usageCount: Number(row.usage_count || 0),
                pinned: Boolean(row.pinned),
                isUserModified: Boolean(row.is_user_modified),
                isDeleted: Boolean(row.is_deleted),
                searchKeywords: foundPrompt?.searchKeywords || []
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
        if (updates.usageCount !== undefined) {
            setClause.push('usage_count = ?');
            values.push(updates.usageCount);
        }
        if (updates.pinned !== undefined) {
            setClause.push('pinned = ?');
            values.push(updates.pinned ? 1 : 0);
        }

        if (updates.title !== undefined || updates.content !== undefined || updates.description !== undefined) {
            const checkStmt = this.db.prepare('SELECT is_built_in FROM prompt_templates WHERE id = ?');
            checkStmt.bind([id]);
            if (checkStmt.step()) {
                const row = checkStmt.getAsObject();
                if (row.is_built_in === 1) {
                    setClause.push('is_user_modified = 1');
                }
            }
            checkStmt.free();
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

    async incrementPromptUsage(id: string): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            UPDATE prompt_templates 
            SET usage_count = usage_count + 1, last_used = ? 
            WHERE id = ?
        `);
        
        stmt.run([Date.now(), id]);
        stmt.free();
        
        await this.saveToFile();
    }

    async togglePromptPin(id: string): Promise<boolean> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        // First get current state
        const getStmt = this.db.prepare('SELECT pinned FROM prompt_templates WHERE id = ?');
        getStmt.bind([id]);
        
        let newPinnedState = false;
        if (getStmt.step()) {
            const row = getStmt.getAsObject();
            const currentPinned = Boolean(row.pinned);
            newPinnedState = !currentPinned;
        }
        getStmt.free();

        // Update state
        const updateStmt = this.db.prepare('UPDATE prompt_templates SET pinned = ? WHERE id = ?');
        updateStmt.run([newPinnedState ? 1 : 0, id]);
        updateStmt.free();
        
        await this.saveToFile();
        return newPinnedState;
    }

    async deletePrompt(id: string): Promise<void> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const checkStmt = this.db.prepare('SELECT is_built_in FROM prompt_templates WHERE id = ?');
        checkStmt.bind([id]);
        let isBuiltIn = false;
        if (checkStmt.step()) {
            const row = checkStmt.getAsObject();
            isBuiltIn = row.is_built_in === 1;
        }
        checkStmt.free();

        if (isBuiltIn) {
            const stmt = this.db.prepare('UPDATE prompt_templates SET is_deleted = 1 WHERE id = ?');
            stmt.run([id]);
        } else {
            const stmt = this.db.prepare('DELETE FROM prompt_templates WHERE id = ?');
            stmt.run([id]);
        }
        await this.saveToFile();
    }

    async searchPrompts(query: string): Promise<PromptTemplate[]> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        if (!query || query.trim() === '') {
            return this.getAllPrompts();
        }

        const searchTerm = `%${query.toLowerCase()}%`;
        
        // Get all prompts for keyword-based filtering (since SQLite doesn't have the keywords column)
        const allPrompts = await this.getAllPrompts();
        
        if (!allPrompts || allPrompts.length === 0) {
            return [];
        }
        
        const lowerQuery = query.toLowerCase();
        const filtered = allPrompts.filter(prompt => {
            const titleMatch = prompt.title.toLowerCase().includes(lowerQuery);
            const descMatch = prompt.description?.toLowerCase().includes(lowerQuery) || false;
            const keywordMatch = prompt.searchKeywords?.some(kw => kw.toLowerCase().includes(lowerQuery)) || false;
            return titleMatch || descMatch || keywordMatch;
        });
        
        // Sort by relevance
        return filtered.sort((a, b) => {
            const aTitle = a.title.toLowerCase();
            const bTitle = b.title.toLowerCase();
            
            // Exact match first
            if (aTitle === lowerQuery && bTitle !== lowerQuery) return -1;
            if (bTitle === lowerQuery && aTitle !== lowerQuery) return 1;
            
            // Starts with query
            const aStarts = aTitle.startsWith(lowerQuery);
            const bStarts = bTitle.startsWith(lowerQuery);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;
            
            // Contains in title
            const aContains = aTitle.includes(lowerQuery);
            const bContains = bTitle.includes(lowerQuery);
            if (aContains && !bContains) return -1;
            if (bContains && !aContains) return 1;
            
            // Then by last used
            const lastUsedDiff = (b.lastUsed || 0) - (a.lastUsed || 0);
            if (lastUsedDiff !== 0) return lastUsedDiff;
            
            // Finally by order
            return (a.order || 999) - (b.order || 999);
        });
    }

    async markPromptAsUsed(id: string): Promise<void> {
        await this.updatePrompt(id, { lastUsed: Date.now() });
    }

    async getBuiltInPrompts(): Promise<PromptTemplate[]> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT id, title, content, description, is_built_in, order_index, last_used, usage_count, pinned, is_user_modified, is_deleted
            FROM prompt_templates
            WHERE is_built_in = 1 AND is_deleted = 0
            ORDER BY pinned DESC, usage_count DESC, order_index ASC, title ASC
        `);

        const rows: SqlRow[] = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject() as SqlRow);
        }
        stmt.free();

        // Get built-in prompts from code to add searchKeywords
        const builtInPromptsFromCode = getBuiltInPrompts();
        const keywordsMap = new Map(builtInPromptsFromCode.map(p => [p.id, p.searchKeywords]));

        return rows.map(row => ({
            id: row.id as string,
            title: row.title as string,
            content: row.content as string,
            description: row.description as string || undefined,
            isBuiltIn: true,
            order: row.order_index as number,
            lastUsed: row.last_used as number,
            usageCount: Number(row.usage_count || 0),
            pinned: Boolean(row.pinned),
            isUserModified: Boolean(row.is_user_modified),
            isDeleted: Boolean(row.is_deleted),
            searchKeywords: keywordsMap.get(row.id as string) || []
        }));
    }

    async getCustomPrompts(): Promise<PromptTemplate[]> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT id, title, content, description, is_built_in, order_index, last_used, usage_count, pinned, is_user_modified, is_deleted
            FROM prompt_templates
            WHERE is_built_in = 0 AND is_deleted = 0
            ORDER BY order_index ASC, title ASC
        `);

        const rows: SqlRow[] = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject() as SqlRow);
        }
        stmt.free();

        return rows.map(row => ({
            id: row.id as string,
            title: row.title as string,
            content: row.content as string,
            description: row.description as string || undefined,
            isBuiltIn: false,
            order: row.order_index as number,
            lastUsed: row.last_used as number,
            usageCount: Number(row.usage_count || 0),
            pinned: Boolean(row.pinned),
            isUserModified: Boolean(row.is_user_modified),
            isDeleted: Boolean(row.is_deleted)
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
            const mcpConfigPath = `${this.vault.configDir}/plugins/obsidian-llmsider/mcp-config.json`;
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
            const mcpConfigPath = `${this.vault.configDir}/plugins/obsidian-llmsider/mcp-config.json`;
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

        const rows: ChatSession[] = [];
        while (stmt.step()) {
            const row = stmt.getAsObject() as SqlRow;
            rows.push({
                id: row.id as string,
                name: row.name as string,
                messages: JSON.parse(row.messages as string),
                created: row.created as number,
                updated: row.updated as number,
                provider: row.provider as string,
                mode: row.mode as 'ask' | 'action'
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
            const row = stmt.getAsObject() as SqlRow;
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

    // ============================================================================
    // DEPRECATED: Built-in Tool Permissions (Old Architecture)
    // The built_in_tool_permissions table is kept for backward compatibility
    // but all new code should use tool_settings table via:
    //   - isBuiltInToolEnabled()
    //   - setBuiltInToolEnabled()
    //   - getBuiltInToolSettings()
    // ============================================================================

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
    async getAutocompleteSettings(): Promise<unknown> {
        const enabled = await this.getConfig('autocomplete.enabled');
        const modelId = await this.getConfig('autocomplete.modelId');
        const granularity = await this.getConfig('autocomplete.granularity');
        const tone = await this.getConfig('autocomplete.tone');
        const domain = await this.getConfig('autocomplete.domain');
        const triggerDelay = await this.getConfig('autocomplete.triggerDelay');
        const maxSuggestions = await this.getConfig('autocomplete.maxSuggestions');

        return {
            enabled: enabled === null ? true : enabled === 'true',
            modelId: modelId || undefined,
            granularity: granularity || 'phrase',
            tone: tone || 'professional',
            domain: domain || 'general',
            triggerDelay: triggerDelay ? parseInt(triggerDelay) : 500,
            maxSuggestions: maxSuggestions ? parseInt(maxSuggestions) : 1
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async setAutocompleteSettings(settings: any): Promise<void> {
        await this.setConfig('autocomplete.enabled', settings.enabled.toString());
        if (settings.modelId) {
            await this.setConfig('autocomplete.modelId', settings.modelId);
        } else {
            await this.deleteConfigValue('autocomplete.modelId');
        }
        await this.setConfig('autocomplete.granularity', settings.granularity);
        await this.setConfig('autocomplete.tone', settings.tone);
        await this.setConfig('autocomplete.domain', settings.domain);
        await this.setConfig('autocomplete.triggerDelay', settings.triggerDelay.toString());
        await this.setConfig('autocomplete.maxSuggestions', settings.maxSuggestions.toString());
    }

    // Inline Quick Chat Settings
    async getInlineQuickChatSettings(): Promise<unknown> {
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
            showQuickChatButton: showQuickChatButton === null ? true : showQuickChatButton === 'true'
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async setInlineQuickChatSettings(settings: any): Promise<void> {
        await this.setConfig('inlineQuickChat.enabled', settings.enabled.toString());
        await this.setConfig('inlineQuickChat.triggerKey', settings.triggerKey);
        await this.setConfig('inlineQuickChat.showOnSelection', settings.showOnSelection.toString());
        await this.setConfig('inlineQuickChat.enableDiffPreview', settings.enableDiffPreview.toString());
        await this.setConfig('inlineQuickChat.showQuickChatButton', settings.showQuickChatButton.toString());
    }

    // ==================== Prompt History Methods ====================

    /**
     * Add or update a prompt in history
     */
    async addPromptHistory(prompt: string): Promise<void> {
        if (!this.db || !prompt || !prompt.trim()) return;
        
        const trimmedPrompt = prompt.trim();
        const now = Date.now();
        
        try {
            // Check if prompt already exists
            const existing = this.db.exec(
                'SELECT id, use_count FROM prompt_history WHERE prompt = ?',
                [trimmedPrompt]
            );
            
            if (existing.length > 0 && existing[0].values.length > 0) {
                // Update existing entry
                const useCount = existing[0].values[0][1] as number;
                this.db.run(
                    'UPDATE prompt_history SET last_used = ?, use_count = ? WHERE prompt = ?',
                    [now, useCount + 1, trimmedPrompt]
                );
            } else {
                // Insert new entry
                this.db.run(
                    'INSERT INTO prompt_history (prompt, last_used, use_count) VALUES (?, ?, ?)',
                    [trimmedPrompt, now, 1]
                );
            }
            
            await this.saveToFile();
        } catch (error) {
            Logger.error('Failed to add prompt history:', error);
        }
    }

    /**
     * Get recent prompt history (most recent first)
     * @param limit Maximum number of prompts to return
     */
    async getPromptHistory(limit: number = 10): Promise<string[]> {
        if (!this.db) return [];
        
        try {
            const result = this.db.exec(
                'SELECT prompt FROM prompt_history ORDER BY last_used DESC LIMIT ?',
                [limit]
            );
            
            if (result.length === 0 || result[0].values.length === 0) {
                return [];
            }
            
            return result[0].values.map(row => row[0] as string);
        } catch (error) {
            Logger.error('Failed to get prompt history:', error);
            return [];
        }
    }

    /**
     * Check if a prompt exists in built-in prompts (by title)
     */
    async isPromptInBuiltIn(prompt: string): Promise<boolean> {
        const builtInPrompts = await this.getBuiltInPrompts();
        return builtInPrompts.some(p => p.title === prompt || p.content === prompt);
    }

    /**
     * Clear old prompt history entries (keep only the most recent N entries)
     */
    async cleanPromptHistory(keepCount: number = 100): Promise<void> {
        if (!this.db) return;
        
        try {
            this.db.run(
                `DELETE FROM prompt_history WHERE id NOT IN (
                    SELECT id FROM prompt_history ORDER BY last_used DESC LIMIT ?
                )`,
                [keepCount]
            );
            await this.saveToFile();
        } catch (error) {
            Logger.error('Failed to clean prompt history:', error);
        }
    }

    // Selection Popup Settings
    async getSelectionPopupSettings(): Promise<unknown> {
        const showAddToContext = await this.getConfig('selectionPopup.showAddToContext');
        return {
            showAddToContext: showAddToContext === null ? true : showAddToContext === 'true'
        };
    }

    async setSelectionPopupSettings(settings: any): Promise<void> {
        await this.setConfig('selectionPopup.showAddToContext', settings.showAddToContext.toString());
    }

    async getContextSettings(): Promise<unknown> {
        const autoReference = await this.getConfig('contextSettings.autoReference');
        const includeExtrasWithContext = await this.getConfig('contextSettings.includeExtrasWithContext');
        const legacyAutoAddToContext = await this.getConfig('selectionPopup.autoAddToContext');
        const resolvedAutoReference = autoReference === null
            ? (legacyAutoAddToContext === null ? true : legacyAutoAddToContext === 'true')
            : autoReference === 'true';

        return {
            autoReference: resolvedAutoReference,
            includeExtrasWithContext: includeExtrasWithContext === 'true'
        };
    }

    async setContextSettings(settings: any): Promise<void> {
        await this.setConfig('contextSettings.autoReference', settings.autoReference.toString());
        await this.setConfig('contextSettings.includeExtrasWithContext', settings.includeExtrasWithContext.toString());
    }

    // Google Search Settings
    async getGoogleSearchSettings(): Promise<unknown> {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    async getVectorSettings(): Promise<unknown> {
        const enabled = await this.getConfig('vector.enabled');
        const showSimilarNotes = await this.getConfig('vector.showSimilarNotes');
        const similarNotesCollapsed = await this.getConfig('vector.similarNotesCollapsed');
        const similarNotesHideByDefault = await this.getConfig('vector.similarNotesHideByDefault');
        const autoSearchEnabled = await this.getConfig('vector.autoSearchEnabled');
        const indexName = await this.getConfig('vector.indexName');
        const chunkingStrategy = await this.getConfig('vector.chunkingStrategy');
        const chunkSize = await this.getConfig('vector.chunkSize');
        const chunkOverlap = await this.getConfig('vector.chunkOverlap');
        const topK = await this.getConfig('vector.topK');
        const embeddingModelId = await this.getConfig('vector.embeddingModelId');
        const suggestRelatedFiles = await this.getConfig('vector.suggestRelatedFiles');
        const suggestionTimeout = await this.getConfig('vector.suggestionTimeout');
        const contextExcerptLength = await this.getConfig('vector.contextExcerptLength');

        const autoSearchResult = autoSearchEnabled === null ? false : autoSearchEnabled === 'true';

        return {
            enabled: enabled === 'true',
            showSimilarNotes: showSimilarNotes === null ? true : showSimilarNotes === 'true',
            similarNotesCollapsed: similarNotesCollapsed === 'true',
            similarNotesHideByDefault: similarNotesHideByDefault === 'true',
            autoSearchEnabled: autoSearchResult, // Default false if not set
            storagePath: `${this.vault.configDir}/plugins/obsidian-llmsider/vector-data`, // Always use default, not stored in DB
            indexName: indexName || 'vault-semantic-index',
            chunkingStrategy: chunkingStrategy || 'character',
            chunkSize: chunkSize ? parseInt(chunkSize) : 1000,
            chunkOverlap: chunkOverlap ? parseInt(chunkOverlap) : 100,
            topK: topK ? parseInt(topK) : 5,
            embeddingModelId: embeddingModelId || '',
            suggestRelatedFiles: suggestRelatedFiles === 'true',
            suggestionTimeout: suggestionTimeout ? parseInt(suggestionTimeout) : 5000,
            contextExcerptLength: contextExcerptLength ? parseInt(contextExcerptLength) : 500,
            localModelPath: `${this.vault.configDir}/plugins/obsidian-llmsider/models` // Always use default, not stored in DB
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async setVectorSettings(settings: any): Promise<void> {
        await this.setConfig('vector.enabled', settings.enabled.toString());
        await this.setConfig('vector.showSimilarNotes', settings.showSimilarNotes?.toString() || 'true');
        await this.setConfig('vector.similarNotesCollapsed', settings.similarNotesCollapsed?.toString() || 'false');
        await this.setConfig('vector.similarNotesHideByDefault', settings.similarNotesHideByDefault?.toString() || 'false');
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
        await this.setConfig('vector.contextExcerptLength', settings.contextExcerptLength?.toString() || '500');
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

    async getUpdateNotificationsEnabled(): Promise<boolean> {
        const value = await this.getConfig('updateNotificationsEnabled');
        return value === null ? true : value === 'true';
    }

    async setUpdateNotificationsEnabled(enabled: boolean): Promise<void> {
        await this.setConfig('updateNotificationsEnabled', enabled.toString());
    }

    async getUpdateLastCheckedAt(): Promise<number> {
        const value = await this.getConfig('updateLastCheckedAt');
        return value ? parseInt(value) : 0;
    }

    async setUpdateLastCheckedAt(timestamp: number): Promise<void> {
        await this.setConfig('updateLastCheckedAt', timestamp.toString());
    }

    async getUpdateLastNotifiedVersion(): Promise<string> {
        const value = await this.getConfig('updateLastNotifiedVersion');
        return value || '';
    }

    async setUpdateLastNotifiedVersion(version: string): Promise<void> {
        await this.setConfig('updateLastNotifiedVersion', version);
    }

    // MCP Settings (serverPermissions only, serversConfig stays in mcp-config.json)
    async getMCPServerPermissions(): Promise<Record<string, unknown>> {
        const value = await this.getConfig('mcpServerPermissions');
        if (!value) return {};
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }

    async setMCPServerPermissions(permissions: Record<string, unknown>): Promise<void> {
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

    // Tool Selection Limit Settings
    async getMaxBuiltInToolsSelection(): Promise<number> {
        const value = await this.getConfig('maxBuiltInToolsSelection');
        return value ? parseInt(value) : 64; // Default: 64
    }

    async setMaxBuiltInToolsSelection(limit: number): Promise<void> {
        await this.setConfig('maxBuiltInToolsSelection', limit.toString());
    }

    async getMaxMCPToolsSelection(): Promise<number> {
        const value = await this.getConfig('maxMCPToolsSelection');
        return value ? parseInt(value) : 64; // Default: 64
    }

    async setMaxMCPToolsSelection(limit: number): Promise<void> {
        await this.setConfig('maxMCPToolsSelection', limit.toString());
    }

	// Plan Execution Mode Settings
	async getPlanExecutionMode(): Promise<'sequential' | 'dag'> {
		const value = await this.getConfig('planExecutionMode');
		return (value as 'sequential' | 'dag') || 'sequential'; // Default: sequential
	}

	async setPlanExecutionMode(mode: 'sequential' | 'dag'): Promise<void> {
		await this.setConfig('planExecutionMode', mode);
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
                const row = stmt.getAsObject() as SqlRow;
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
            
            // Persist changes to file
            this.saveToFile();
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
                const row = stmt.getAsObject() as SqlRow;
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
     * WARNING: This method is deprecated and should not be used.
     * Use cleanupMCPToolSettings or removeToolSettingsByServer instead.
     */
    cleanupToolSettings(validToolIds: string[]): void {
        // This method is intentionally disabled to prevent bugs where MCP tool cleanup
        // accidentally deletes built-in tool settings
    }

    /**
     * Remove MCP tool settings for tools that no longer exist on specific servers
     * Only affects MCP tools (server_id != 'built-in')
     */
    cleanupMCPToolSettings(validMCPToolIds: string[]): void {
        if (!this.db) return;
        
        try {
            if (validMCPToolIds.length === 0) {
                // If no valid MCP tools, clear all MCP tool settings (keep built-in)
                this.db.run(`DELETE FROM tool_settings WHERE server_id != 'built-in'`);
                return;
            }
            
            const placeholders = validMCPToolIds.map(() => '?').join(',');
            const stmt = this.db.prepare(`
                DELETE FROM tool_settings 
                WHERE server_id != 'built-in'
                AND tool_id NOT IN (${placeholders})
            `);
            
            stmt.bind(validMCPToolIds);
            stmt.step();
            stmt.free();
        } catch (error) {
            Logger.error('Failed to cleanup MCP tool settings:', error);
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
        // System tools are ALWAYS enabled
        const SYSTEM_TOOLS = ['get_timedate', 'get_current_time', 'for_each'];
        if (SYSTEM_TOOLS.includes(toolName)) {
            return true;
        }

        const settings = this.getBuiltInToolSettings(toolName);
        
        // CRITICAL DEBUG: Log the exact settings retrieval
        if (!settings) {
            Logger.debug(`[ConfigDB] Tool ${toolName} has NO settings record in database - defaulting to DISABLED`);
        } else {
            Logger.debug(`[ConfigDB] Tool ${toolName} settings found: enabled=${settings.enabled}, requireConfirmation=${settings.requireConfirmation}`);
        }
        
        // Default to FALSE (disabled) if not explicitly set - CONSERVATIVE APPROACH
        // This prevents accidentally enabling all tools
        return settings ? settings.enabled : false;
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
    async getConnections(): Promise<unknown[]> {
        if (!this.db) return [];
        try {
            const stmt = this.db.prepare(`
                SELECT id, name, type, api_key as apiKey, base_url as baseUrl, 
                       organization_id as organizationId, region,
                       proxy_enabled as proxyEnabled, proxy_type as proxyType,
                       proxy_host as proxyHost, proxy_port as proxyPort,
                       proxy_auth as proxyAuth, proxy_username as proxyUsername,
                       proxy_password as proxyPassword,
                       enabled, created, updated
                FROM connections
                ORDER BY created DESC
            `);
            const connections = [];
            const connectionsNeedingFix = [];
            
            while (stmt.step()) {
                const row = stmt.getAsObject() as SqlRow;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const connection: any = {
                    ...row,
                    enabled: row.enabled === 1,
                    proxyEnabled: row.proxyEnabled === 1,
                    proxyAuth: row.proxyAuth === 1
                };
                
                // Fix missing type field from old data
                if (!connection.type || connection.type === '') {
                    // Try to infer type from connection name
                    const nameLower = connection.name?.toLowerCase() || '';
                    if (nameLower.includes('deepseek')) {
                        connection.type = 'free-deepseek';
                    } else if (nameLower.includes('openai')) {
                        connection.type = 'openai';
                    } else if (nameLower.includes('anthropic') || nameLower.includes('claude')) {
                        connection.type = 'anthropic';
                    } else if (nameLower.includes('azure')) {
                        connection.type = 'azure-openai';
                    } else if (nameLower.includes('ollama')) {
                        connection.type = 'ollama';
                    } else if (nameLower.includes('gemini') || nameLower.includes('google')) {
                        connection.type = 'google';
                    } else {
                        connection.type = 'openai'; // Default fallback
                    }
                    Logger.warn(`Fixed missing type for connection ${connection.id}: ${connection.name} -> ${connection.type}`);
                    connectionsNeedingFix.push(connection);
                }
                
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
            
            // Save fixed connections back to database
            for (const connection of connectionsNeedingFix) {
                try {
                    await this.saveConnection(connection);
                    Logger.debug(`Saved fixed connection: ${connection.id}`);
                } catch (error) {
                    Logger.error(`Failed to save fixed connection ${connection.id}:`, error);
                }
            }
            
            return connections;
        } catch (error) {
            Logger.error('Error getting connections:', error);
            return [];
        }
    }

    /**
     * Save or update a connection
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                (id, name, type, api_key, base_url, organization_id, region,
                 proxy_enabled, proxy_type, proxy_host, proxy_port, proxy_auth, proxy_username, proxy_password,
                 enabled, created, updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.bind([
                connection.id,
                connection.name,
                connection.type,
                apiKeyValue,
                connection.baseUrl || null,
                connection.organizationId || null,
                connection.region || null,
                connection.proxyEnabled ? 1 : 0,
                connection.proxyType || null,
                connection.proxyHost || null,
                connection.proxyPort || null,
                connection.proxyAuth ? 1 : 0,
                connection.proxyUsername || null,
                connection.proxyPassword || null,
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
    async getModels(): Promise<unknown[]> {
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
                const row = stmt.getAsObject() as SqlRow;
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
    async getModelsForConnection(connectionId: string): Promise<unknown[]> {
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
                const row = stmt.getAsObject() as SqlRow;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async saveModel(model: any): Promise<void> {
        if (!this.db) return;
        try {
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

    // ============================================================================
    // Memory Settings
    // ============================================================================

    async getMemorySettings(): Promise<unknown> {
        const enableWorkingMemory = await this.getConfig('memory_enableWorkingMemory');
        const workingMemoryScope = await this.getConfig('memory_workingMemoryScope');
        const enableConversationHistory = await this.getConfig('memory_enableConversationHistory');
        const conversationHistoryLimit = await this.getConfig('memory_conversationHistoryLimit');
        const enableSemanticRecall = await this.getConfig('memory_enableSemanticRecall');
        const semanticRecallLimit = await this.getConfig('memory_semanticRecallLimit');
        const embeddingModelId = await this.getConfig('memory_embeddingModelId');
        const enableCompaction = await this.getConfig('memory_enableCompaction');
        const compactionThreshold = await this.getConfig('memory_compactionThreshold');
        const compactionTarget = await this.getConfig('memory_compactionTarget');
        const compactionPreserveCount = await this.getConfig('memory_compactionPreserveCount');
        const compactionModel = await this.getConfig('memory_compactionModel');

        return {
            enableWorkingMemory: enableWorkingMemory === 'true',
            workingMemoryScope: (workingMemoryScope || 'resource') as 'resource' | 'thread',
            enableConversationHistory: enableConversationHistory === null ? true : enableConversationHistory === 'true',
            conversationHistoryLimit: conversationHistoryLimit ? parseInt(conversationHistoryLimit) : 10,
            enableSemanticRecall: enableSemanticRecall === 'true',
            semanticRecallLimit: semanticRecallLimit ? parseInt(semanticRecallLimit) : 5,
            embeddingModelId: embeddingModelId || '',
            enableCompaction: enableCompaction === null ? true : enableCompaction === 'true',
            compactionThreshold: compactionThreshold ? parseInt(compactionThreshold) : 65536,
            compactionTarget: compactionTarget ? parseInt(compactionTarget) : 4000,
            compactionPreserveCount: compactionPreserveCount ? parseInt(compactionPreserveCount) : 4,
            compactionModel: compactionModel || '',
        };
    }

    async setMemorySettings(settings: any): Promise<void> {
        await this.setConfig('memory_enableWorkingMemory', settings.enableWorkingMemory?.toString() || 'true');
        await this.setConfig('memory_workingMemoryScope', settings.workingMemoryScope || 'resource');
        await this.setConfig('memory_enableConversationHistory', settings.enableConversationHistory?.toString() || 'true');
        await this.setConfig('memory_conversationHistoryLimit', settings.conversationHistoryLimit?.toString() || '10');
        await this.setConfig('memory_enableSemanticRecall', settings.enableSemanticRecall?.toString() || 'false');
        await this.setConfig('memory_semanticRecallLimit', settings.semanticRecallLimit?.toString() || '5');
        await this.setConfig('memory_embeddingModelId', settings.embeddingModelId || '');
        await this.setConfig('memory_enableCompaction', settings.enableCompaction?.toString() || 'true');
        await this.setConfig('memory_compactionThreshold', settings.compactionThreshold?.toString() || '65536');
        await this.setConfig('memory_compactionTarget', settings.compactionTarget?.toString() || '4000');
        await this.setConfig('memory_compactionPreserveCount', settings.compactionPreserveCount?.toString() || '4');
        await this.setConfig('memory_compactionModel', settings.compactionModel || '');
    }

    // ============================================================================
    // Conversation Mode Settings
    // ============================================================================

    async getConversationMode(): Promise<'normal' | 'guided' | 'agent'> {
        const value = await this.getConfig('conversationMode');
        return (value as 'normal' | 'guided' | 'agent') || 'normal';
    }

    async setConversationMode(mode: 'normal' | 'guided' | 'agent'): Promise<void> {
        await this.setConfig('conversationMode', mode);
    }

    async getDefaultConversationMode(): Promise<'normal' | 'guided' | 'agent'> {
        const value = await this.getConfig('defaultConversationMode');
        return (value as 'normal' | 'guided' | 'agent') || 'normal';
    }

    async setDefaultConversationMode(mode: 'normal' | 'guided' | 'agent'): Promise<void> {
        await this.setConfig('defaultConversationMode', mode);
    }

    // ============================================================================
    // Advanced Settings
    // ============================================================================

    async getEnableDebugLogging(): Promise<boolean> {
        const value = await this.getConfig('enableDebugLogging');
        return value === 'true';
    }

    async setEnableDebugLogging(enabled: boolean): Promise<void> {
        await this.setConfig('enableDebugLogging', enabled.toString());
    }

    async getIsFirstLaunch(): Promise<boolean> {
        const value = await this.getConfig('isFirstLaunch');
        return value === null ? true : value === 'true'; // Default to true if not set
    }

    async setIsFirstLaunch(isFirst: boolean): Promise<void> {
        await this.setConfig('isFirstLaunch', isFirst.toString());
    }
}
