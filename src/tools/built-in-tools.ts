// Built-in Tools System - Mastra Format with Full Compatibility
// Provides complete functionality: i18n, categorization, tool management

import { App } from 'obsidian';
import { Logger } from './../utils/logger';
import { I18nManager } from '../i18n/i18n-manager';
import { FileHistoryEntry } from '../types';
import type { MastraTool } from './mastra-tool-types';
import type { ToolCategory } from '../types/tool-categories';

// Re-export ToolCategory type
export type { ToolCategory } from '../types/tool-categories';

// Constants from TextEditorTools
const SNIPPET_LINES = 3; // Number of lines to show before/after changes
const MAX_HISTORY_ENTRIES = 50; // Maximum number of undo entries per file

// Global App instance for Obsidian API access
let globalApp: App | null = null;
// Global plugin instance for accessing plugin features (i18n, etc.)
let globalPlugin: any | null = null;
// File history for undo functionality
export let globalFileHistory: Map<string, FileHistoryEntry[]> = new Map();
// Global tool executor (usually UnifiedToolManager.executeTool)
let globalToolExecutor: ((name: string, args: unknown) => Promise<any>) | null = null;

/**
 * Set the global tool executor
 */
export function setToolExecutor(executor: (name: string, args: unknown) => Promise<any>): void {
  globalToolExecutor = executor;
  Logger.debug('[built-in-tools] Global tool executor set');
}

/**
 * BuiltInTool interface - compatible with both legacy and Mastra formats
 */
export interface BuiltInTool {
  id?: string;
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  outputSchema?: unknown;
  category?: ToolCategory;
  execute: (args: unknown) => Promise<unknown>;
}

/**
 * Set the global App instance for Obsidian API access
 */
export function setApp(app: App, getSettings?: () => unknown, plugin?: any): void {
  globalApp = app;
  globalPlugin = plugin || null;
  
  // Initialize settings getter for search tools if provided
  if (getSettings) {
    // Import and initialize settings for tools that need them
    import('./google-search-tools.mastra').then(module => {
      module.setPluginSettingsGetter(getSettings);
      Logger.debug('[built-in-tools] Google search tools settings initialized');
    }).catch(err => {
      Logger.error('[built-in-tools] Failed to initialize Google search tools settings:', err);
    });
    
    import('./serpapi-tools.mastra').then(module => {
      module.setPluginSettingsGetter(getSettings);
      Logger.debug('[built-in-tools] SerpAPI tools settings initialized');
    }).catch(err => {
      Logger.error('[built-in-tools] Failed to initialize SerpAPI tools settings:', err);
    });
    
    Logger.debug('[built-in-tools] App and settings getter initialized');
  }
}

/**
 * Get the global App instance
 */
export function getApp(): App {
  if (!globalApp) {
    throw new Error('App instance not initialized. Call setApp() first.');
  }
  return globalApp;
}

/**
 * Get the global plugin instance
 */
export function getPlugin(): any {
  return globalPlugin;
}

/**
 * Validate file path for security and vault boundaries
 */
export async function validatePath(operation: string, path: string): Promise<void> {
  if (!path || path.trim() === '') {
    throw new Error(`Invalid path: empty path provided for ${operation}`);
  }

  // Security: prevent path traversal
  if (path.includes('..') || path.includes('//') || path.startsWith('/')) {
    throw new Error(`Invalid path: path traversal not allowed (${path})`);
  }

  // Ensure path is within vault boundaries by normalizing
  const normalizedPath = path.replace(/\\/g, '/');
  if (normalizedPath !== path) {
    throw new Error(`Invalid path: backslashes not allowed (${path})`);
  }
}

/**
 * Save file content to history for undo functionality
 */
export async function saveToHistory(path: string, content: string, operation: string): Promise<void> {
  if (!globalFileHistory.has(path)) {
    globalFileHistory.set(path, []);
  }

  const history = globalFileHistory.get(path)!;
  history.push({
    content,
    timestamp: Date.now(),
    operation
  });

  // Limit history size to prevent memory issues
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.shift(); // Remove oldest entry
  }
}

/**
 * Format output with line numbers (following existing patterns)
 */
export function makeOutput(content: string, path: string, startLine: number = 1): string {
  const lines = content.split('\n');
  const lineNumberWidth = Math.max(2, String(startLine + lines.length - 1).length);

  const numberedLines = lines.map((line, index) => {
    const lineNumber = startLine + index;
    const paddedNumber = String(lineNumber).padStart(lineNumberWidth, ' ');
    return `${paddedNumber}→${line}`;
  });

  return `Here's the content of ${path}:\n${numberedLines.join('\n')}`;
}

/**
 * Ensure that the directory path exists for a given file path
 */
export async function ensureDirectoryExists(filePath: string): Promise<void> {
  Logger.debug('ensureDirectoryExists called with:', filePath);

  const app = getApp();
  const pathParts = filePath.split('/');
  Logger.debug('Path parts:', pathParts);

  // Remove the filename (last part)
  if (pathParts.length <= 1) {
    Logger.debug('File is in root directory, no directories to create');
    return; // File is in root directory
  }

  const directoryPath = pathParts.slice(0, -1).join('/');
  Logger.debug('Target directory path:', directoryPath);

  // Check if directory already exists
  const existingDir = app.vault.getAbstractFileByPath(directoryPath);
  Logger.debug('Directory exists check:', existingDir ? 'EXISTS' : 'NOT_EXISTS');
  if (existingDir) {
    Logger.debug('Directory already exists:', {
      name: existingDir.name,
      path: existingDir.path,
      type: existingDir.constructor.name
    });
    return; // Directory already exists
  }

  // Create directory path step by step
  Logger.debug('Creating directories step by step...');
  let currentPath = '';
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    Logger.debug(`Processing directory part ${i + 1}/${pathParts.length - 1}: "${part}" -> "${currentPath}"`);

    const existingPart = app.vault.getAbstractFileByPath(currentPath);
    Logger.debug(`Directory "${currentPath}" exists:`, existingPart ? 'YES' : 'NO');

    if (!existingPart) {
      try {
        Logger.debug(`Attempting to create directory: "${currentPath}"`);
        const createdFolder = await app.vault.createFolder(currentPath);
        Logger.debug(`Successfully created directory:`, {
          name: createdFolder.name,
          path: createdFolder.path,
          parent: createdFolder.parent?.path || 'root'
        });

        // Verify the directory was created
        const verifyDir = app.vault.getAbstractFileByPath(currentPath);
        Logger.debug(`Directory verification for "${currentPath}":`, verifyDir ? 'FOUND' : 'NOT_FOUND');
      } catch (error) {
        // Check if error is "folder already exists" - this is OK
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.toLowerCase().includes('already exists') || 
            errorMessage.toLowerCase().includes('folder already exists')) {
          Logger.debug(`Directory "${currentPath}" already exists (caught during creation), continuing...`);
          
          // Try to verify directory exists (may be case-insensitive match)
          const verifyDir = app.vault.getAbstractFileByPath(currentPath);
          if (verifyDir) {
            Logger.debug(`Directory "${currentPath}" confirmed to exist (exact match)`);
          } else {
            // Directory exists but with different case (e.g., Templates vs templates on macOS)
            // This is OK - just log it and continue
            Logger.debug(`Directory exists but with different case (case-insensitive file system)`);
          }
          continue; // Directory exists (possibly with different case), move to next part
        }
        
        Logger.error(`Failed to create directory "${currentPath}":`, error);
        Logger.error('Directory creation error details:', {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        throw new Error(`Failed to create directory: ${currentPath} - ${errorMessage}`);
      }
    } else {
      Logger.debug(`Directory "${currentPath}" already exists, skipping creation`);
    }
  }
  Logger.debug('Directory creation process completed');
}

// Export constants for use by modules
export { SNIPPET_LINES, MAX_HISTORY_ENTRIES };

// =============================================================================
// LAZY LOADING SYSTEM FOR MASTRA TOOLS
// =============================================================================

let toolsCache: Record<string, BuiltInTool> | null = null;

/**
 * Load all Mastra tools dynamically
 * This function imports .mastra.ts files and extracts tool definitions
 */
async function loadAllTools(): Promise<Record<string, BuiltInTool>> {
  if (toolsCache) {
    return toolsCache;
  }

  const tools: Record<string, BuiltInTool> = {};

  try {
    Logger.debug('[built-in-tools] Loading Mastra tools...');

    // Define all tool modules to load explicitly
    // We must use explicit string literals for esbuild to bundle them correctly
    const modules = [
      await import('./book-tools.mastra'),
      await import('./browser-tools.mastra'),
      await import('./control-flow-tools.mastra'),
      await import('./devto-tools.mastra'),
      await import('./duckduckgo-tools.mastra'),
      await import('./editor-tools.mastra'),
      await import('./enhanced-search-tools.mastra'),
      await import('./everyday-news-tools.mastra'),
      await import('./file-management-tools.mastra'),
      await import('./file-system-tools.mastra'),
      await import('./forex-supplementary-tools.mastra'),
      await import('./forex-tools.mastra'),
      await import('./futures-contract-info-tools.mastra'),
      await import('./futures-roll-yield-tools.mastra'),
      await import('./futures-sina-tools.mastra'),
      await import('./github-trending-tools.mastra'),
      await import('./google-search-tools.mastra'),
      await import('./hacker-news-tools.mastra'),
      await import('./imdb-tools.mastra'),
      await import('./market-data-tools.mastra'),
      await import('./news-aggregation-tools.mastra'),
      await import('./note-management-tools.mastra'),
      await import('./options-advanced-tools.mastra'),
      await import('./product-hunt-tools.mastra'),
      await import('./search-tools.mastra'),
      await import('./serpapi-tools.mastra'),
      await import('./stock-analysis-news-tools.mastra'),
      await import('./stock-panorama-tools.mastra'),
      await import('./tickertick-tools.mastra'),
      await import('./tvmaze-tools.mastra'),
      await import('./utility-tools.mastra'),
      await import('./weather-tools.mastra'),
      await import('./web-content-tools.mastra'),
      await import('./wikipedia-tools.mastra'),
      await import('./yahoo-finance-tools.mastra'),
      await import('./youtube-transcript-tools.mastra')
    ];

    // Inject shared functions into modules that expose setSharedFunctions
    const sharedFunctions = {
      getApp,
      getPlugin,
      validatePath,
      saveToHistory,
      makeOutput,
      ensureDirectoryExists,
      globalFileHistory,
      executeTool: async (name: string, args: unknown) => {
        if (globalToolExecutor) {
          return await globalToolExecutor(name, args);
        }
        return await executeBuiltInTool(name, args);
      }
    };

    for (const module of modules) {
      try {
        const maybeSetter = (module as any).setSharedFunctions;
        if (typeof maybeSetter === 'function') {
          maybeSetter(sharedFunctions);
          Logger.debug('[built-in-tools] Shared functions injected into module');
        }
      } catch (error) {
        Logger.warn('[built-in-tools] Failed to inject shared functions into module', error);
      }
    }

    // Process all loaded modules
    for (const toolModule of modules) {
        // Extract all exported tools from the module
        for (const [exportName, exportValue] of Object.entries(toolModule)) {
          // Check if it's a tool export (ends with 'Tool' and has required properties)
          if (exportName.endsWith('Tool') && exportValue && typeof exportValue === 'object') {
            const tool = exportValue as any;
            if (tool.id && tool.description && tool.execute) {
              // Convert camelCase tool name to snake_case key
              // Improved logic to handle acronyms properly:
              // - Treats consecutive capitals as one unit (e.g., ETF, HSGT, API)
              // - Converts: getETFTracking -> get_etf_tracking (not get_e_t_f_tracking)
              // - Converts: getHKBuyback -> get_hk_buyback (not get_h_k_buyback)
              const toolKey = exportName
                .replace(/Tool$/, '') // Remove 'Tool' suffix
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2') // Handle acronyms followed by word: ETFTracking -> ETF_Tracking
                .replace(/([a-z\d])([A-Z])/g, '$1_$2') // Handle regular camelCase: getEtf -> get_Etf
                .toLowerCase() // Convert to lowercase
                .replace(/^_/, ''); // Remove leading underscore if any
              
              // Convert Zod schema to JSON Schema if needed
              let inputSchema = tool.inputSchema;
              if (inputSchema && typeof inputSchema === 'object' && '_def' in inputSchema) {
                // This is a Zod schema, convert it to JSON Schema using zod-to-json-schema
                try {
                  const { zodToJsonSchema } = await import('zod-to-json-schema');
                  inputSchema = zodToJsonSchema(inputSchema, {
                    target: 'jsonSchema7',
                    $refStrategy: 'none'
                  });
                  // Logger.debug(`[built-in-tools] ✅ Converted Zod schema to JSON Schema for ${toolKey}`);
                } catch (error) {
                  Logger.error(`[built-in-tools] ❌ Failed to convert Zod schema for ${toolKey}:`, error);
                  // Fallback to empty schema
                  inputSchema = {
                    type: 'object',
                    properties: {},
                    required: []
                  };
                }
              }
              
              tools[toolKey] = {
                ...tool,
                inputSchema
              } as unknown as BuiltInTool;
              
              // Auto-generate i18n mapping if not already exists
              // This creates the mapping: toolKey -> 'tools.originalName.{name|description}'
              // Example: 'get_etf_tracking' -> 'tools.getEtfTracking.name'
              if (!TOOL_I18N_KEY_MAP[toolKey]) {
                const originalName = exportName.replace(/Tool$/, '');
                TOOL_I18N_KEY_MAP[toolKey] = {
                  name: `tools.${originalName}.name`,
                  description: `tools.${originalName}.description`
                };
              }
            }
          }
        }
    }
    
    Logger.debug('[built-in-tools] All tools loaded successfully:', Object.keys(tools).length);
    Logger.debug('[built-in-tools] Auto-generated i18n mappings:', Object.keys(TOOL_I18N_KEY_MAP).length);

  } catch (error) {
    Logger.error('[built-in-tools] Error loading Mastra tools:', error);
  }

  toolsCache = tools;
  return tools;
}

/**
 * Initialize built-in tools (async)
 * Call this during plugin startup
 */
export async function initializeBuiltInTools(): Promise<void> {
  Logger.debug('[built-in-tools] Initializing built-in tools...');
  await loadAllTools();
  Logger.debug('[built-in-tools] Built-in tools initialized, count:', Object.keys(toolsCache || {}).length);
}

/**
 * Registry of all built-in tools (populated lazily)
 */
export const BUILT_IN_TOOLS: Record<string, BuiltInTool> = {};

// =============================================================================
// TOOL CATEGORIZATION SYSTEM
// =============================================================================

/**
 * Dynamically determine tool category based on tool name
 * Matches original categorization logic
 */
function getToolCategory(toolName: string): ToolCategory {
  // First, try to get category from the tool definition itself
  const tools = toolsCache || {};
  const tool = tools[toolName];
  if (tool && tool.category) {
    return tool.category;
  }
  
  if (toolName === 'for_each') return 'meta';
  
  // Fallback: if no category matched, return 'other' instead of 'note-management'
  Logger.warn(`[built-in-tools] Tool '${toolName}' has no explicit category defined, defaulting to 'other'`);
  return 'other';
}

// =============================================================================
// I18N SUPPORT - Tool name to i18n key mapping
// =============================================================================

/**
 * Tool name to i18n key mapping for localization
 * Format: { toolName: { name: 'i18n.key.name', description: 'i18n.key.description' } }
 * 
 * IMPORTANT: This map is now AUTO-POPULATED during tool loading!
 * 
 * The system automatically generates mappings for all loaded tools by converting:
 * - Tool export name (e.g., 'getETFTrackingTool') 
 * - To snake_case key (e.g., 'get_etf_tracking')
 * - To i18n path (e.g., 'tools.getETFTracking.name')
 * 
 * You only need to manually add entries here for SPECIAL CASES:
 * - Tools with non-standard naming that don't follow the Tool suffix pattern
 * - Tools that need custom i18n key mappings
 * - Legacy compatibility entries
 * 
 * All other mappings are generated automatically - no need to add them manually!
 */
export const TOOL_I18N_KEY_MAP: Record<string, { name: string; description: string }> = {
  // Special case tools that don't follow the standard naming pattern
  // These won't be auto-generated and need explicit mappings
  
  // Note: Most tools are now auto-generated during loadAllMastraTools()
  // Only add manual entries here if the tool has special requirements
};


// =============================================================================
// PUBLIC API - Compatible with original built-in-tools.ts
// =============================================================================

/**
 * Unified function to get all built-in tools
 * @param options - Configuration options
 * @param options.i18n - Optional I18nManager for localization. If provided, tools will be localized
 * @param options.asArray - If true, returns array; if false, returns Record (default: false)
 * @returns Built-in tools as array or record, localized if i18n is provided
 */
export function getAllBuiltInTools(options?: { 
  i18n?: I18nManager; 
  asArray?: boolean 
}): BuiltInTool[] | Record<string, BuiltInTool> {
  const { i18n, asArray = false } = options || {};
  
  // Get cached tools (may be null if not initialized yet)
  const sourceTools = toolsCache || {};
  
  let tools: Record<string, BuiltInTool>;
  
  if (i18n) {
    // Localize tools and assign categories
    tools = {};
    for (const [toolName, tool] of Object.entries(sourceTools)) {
      const i18nKeys = TOOL_I18N_KEY_MAP[toolName];
      const category = getToolCategory(toolName);
      
      if (i18nKeys) {
        // Tool has i18n keys, try to translate
        tools[toolName] = {
          ...tool,
          id: toolName, // Keep original tool name as id for permission checking
          name: i18n.t(i18nKeys.name) || tool.name,
          description: i18n.t(i18nKeys.description) || tool.description,
          category
        };
      } else {
        // No i18n keys, use original
        tools[toolName] = {
          ...tool,
          id: toolName, // Keep original tool name as id
          name: tool.name || toolName, // Fallback to toolName if name is missing
          category
        };
      }
    }
  } else {
    // Return original tools with categories
    tools = {};
    for (const [toolName, tool] of Object.entries(sourceTools)) {
      tools[toolName] = {
        ...tool,
        id: toolName, // Keep original tool name as id
        name: tool.name || toolName, // Fallback to toolName if name is missing
        category: getToolCategory(toolName)
      };
    }
  }
  
  // Debug logging
  Logger.debug('[built-in-tools] getAllBuiltInTools called, toolsCache:', toolsCache ? 'loaded' : 'null', 'tools count:', Object.keys(tools).length);
  
  return asArray ? Object.values(tools) : tools;
}

/**
 * @deprecated Use getAllBuiltInTools({ i18n }) instead
 * Get localized built-in tools with translated descriptions
 */
export function getLocalizedBuiltInTools(i18n: I18nManager): Record<string, BuiltInTool> {
  return getAllBuiltInTools({ i18n }) as Record<string, BuiltInTool>;
}

/**
 * Get a specific built-in tool by name
 */
export function getBuiltInTool(name: string): BuiltInTool | undefined {
  const tools = toolsCache || {};
  return tools[name];
}

/**
 * Execute a built-in tool
 */
export async function executeBuiltInTool(name: string, args: unknown, runtimeContext?: unknown): Promise<unknown> {
  const tool = getBuiltInTool(name);
  if (!tool) {
    throw new Error(`Built-in tool not found: ${name}`);
  }

  Logger.debug(`[built-in-tools] Executing tool: ${name}`, args);
  
  // Mastra tools expect parameters wrapped in a context object
  // We cast to any to bypass the loose typing of BuiltInTool.execute
  const result = await (tool.execute as any)({ context: args, runtimeContext });
  
  Logger.debug(`[built-in-tools] Tool ${name} result:`, result);

  return result;
}

/**
 * Check if a tool name refers to a built-in tool
 */
export function isBuiltInTool(name: string): boolean {
  const tools = toolsCache || {};
  return name in tools;
}
