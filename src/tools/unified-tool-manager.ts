// Unified Tool Manager
// Manages both built-in tools and MCP tools with consistent interface and schema validation

import { MCPTool } from '../types';
import { Logger } from './../utils/logger';
import { MCPManager } from '../mcp/mcp-manager';
import { ConfigDatabase } from '../utils/config-db';
import { getAllBuiltInTools, getBuiltInTool, executeBuiltInTool, isBuiltInTool, BuiltInTool } from './built-in-tools';

export interface UnifiedTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  outputSchema?: unknown; // JSON Schema for output, same format as inputSchema
  source: 'built-in' | 'mcp';
  server?: string; // For MCP tools
  category?: string; // Tool category for grouping
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  toolName: string;
  source: 'built-in' | 'mcp';
  server?: string;
  executionTime: number;
}

export class UnifiedToolManager {
  private mcpManager: MCPManager | null = null;
  private configDb: ConfigDatabase | null = null;

  constructor(mcpManager?: MCPManager, configDb?: ConfigDatabase) {
    this.mcpManager = mcpManager || null;
    this.configDb = configDb || null;
  }

  /**
   * Set the MCP manager instance
   */
  setMCPManager(mcpManager: MCPManager): void {
    this.mcpManager = mcpManager;
  }

  /**
   * Set the ConfigDatabase instance for permission checking
   */
  setConfigDb(configDb: ConfigDatabase): void {
    this.configDb = configDb;
  }

  /**
   * Check if a built-in tool is enabled
   * Directly queries database for real-time permission state
   */
  private isBuiltInToolEnabled(toolName: string): boolean {
    if (!this.configDb) {
      Logger.warn(`[UnifiedToolManager] ConfigDB not initialized, defaulting to disabled for ${toolName}`);
      return false;
    }
    
    const isEnabled = this.configDb.isBuiltInToolEnabled(toolName);
    Logger.debug(`[UnifiedToolManager] isBuiltInToolEnabled("${toolName}") = ${isEnabled} [caller: ${new Error().stack?.split('\n')[2]?.trim()}]`);
    return isEnabled;
  }

  /**
   * Check if an MCP tool is enabled
   */
  private isMCPToolEnabled(toolName: string, serverId: string): boolean {
    if (!this.mcpManager) {
      return false;
    }
    // Use MCP manager's permission checking
    return this.mcpManager.isToolEnabled(serverId, toolName) && this.mcpManager.isServerEnabled(serverId);
  }
  
  /**
   * Get all available tools (built-in + MCP) with permission filtering
   * NOTE: This method is called on EVERY LLM request to get the LATEST enabled/disabled state
   */
  async getAllTools(): Promise<UnifiedTool[]> {
    const startTime = Date.now();
    Logger.debug('⏱️ [START] getAllTools - Fetching real-time tool permissions from database...', new Date().toISOString());
    
    if (!this.configDb) {
      Logger.warn('[UnifiedToolManager] ConfigDB not initialized, returning empty tools array');
      return [];
    }
    
    const tools: UnifiedTool[] = [];
    const toolNames = new Set<string>(); // Track tool names to prevent duplicates

    // Add built-in tools (includes all tools now, including file editing)
    const builtInStartTime = Date.now();
    Logger.debug('⏱️ [START] Getting built-in tools...', new Date().toISOString());
    const builtInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];
    Logger.debug(`⏱️ Got ${builtInTools.length} built-in tools in ${Date.now() - builtInStartTime}ms`);
    
    const builtInFilterStartTime = Date.now();
    for (const tool of builtInTools) {
      // Auto-initialize tool settings if not exists in database
      // This ensures new tools added to code are automatically enabled
      this.configDb.initializeBuiltInToolSettings(tool.name);
      
      // Check if the built-in tool is enabled
      if (this.isBuiltInToolEnabled(tool.name) && !toolNames.has(tool.name)) {
        Logger.debug(`[getAllTools] ✅ Built-in tool ENABLED: ${tool.name}`);
        tools.push({
          name: tool.name,
          description: tool.description,
          inputSchema: this.validateAndFixSchema(tool.inputSchema, tool.name),
          outputSchema: tool.outputSchema, // Include output schema if available
          source: 'built-in',
          category: tool.category
        });
        toolNames.add(tool.name);
      } else if (!this.isBuiltInToolEnabled(tool.name)) {
        Logger.debug(`[getAllTools] ❌ Built-in tool DISABLED: ${tool.name}`);
      } else {
        // Logger.warn(`Duplicate tool name detected and skipped: ${tool.name} (built-in)`);
      }
    }
    // Logger.debug(`⏱️ Filtered built-in tools in ${Date.now() - builtInFilterStartTime}ms, enabled: ${tools.length}`);

    // Add MCP tools
    if (this.mcpManager) {
      try {
        const mcpStartTime = Date.now();
        Logger.debug('⏱️ [START] Getting MCP tools...', new Date().toISOString());
        const mcpTools = await this.mcpManager.listAllTools();
        Logger.debug(`⏱️ Got ${mcpTools.length} MCP tools in ${Date.now() - mcpStartTime}ms`);
        
        const mcpFilterStartTime = Date.now();
        for (const mcpTool of mcpTools) {
          // Check if the MCP tool is enabled
          if (this.isMCPToolEnabled(mcpTool.name, mcpTool.server) && !toolNames.has(mcpTool.name)) {
            tools.push({
              name: mcpTool.name,
              description: mcpTool.description || 'No description available',
              inputSchema: this.validateAndFixSchema(mcpTool.inputSchema, mcpTool.name),
              source: 'mcp',
              server: mcpTool.server
            });
            toolNames.add(mcpTool.name);
          } else if (!this.isMCPToolEnabled(mcpTool.name, mcpTool.server)) {
            Logger.debug(`MCP tool disabled by permissions: ${mcpTool.name} (server: ${mcpTool.server})`);
          } else {
            Logger.warn(`Duplicate tool name detected and skipped: ${mcpTool.name} (mcp, server: ${mcpTool.server})`);
          }
        }
        Logger.debug(`⏱️ Filtered MCP tools in ${Date.now() - mcpFilterStartTime}ms`);
      } catch (error) {
        Logger.warn('Failed to get MCP tools:', error);
      }
    }

    const endTime = Date.now();
    Logger.debug(`⏱️ [TOTAL] getAllTools completed in ${endTime - startTime}ms`);
    Logger.debug(`Final tool count after permission filtering: ${tools.length}, unique names: ${toolNames.size}`);
    return tools;
  }
  
  /**
   * Get built-in tools only with permission filtering
   */
  getBuiltInTools(): UnifiedTool[] {
    const builtInTools = getAllBuiltInTools({ asArray: true }) as BuiltInTool[];
    return builtInTools
      .filter(tool => this.isBuiltInToolEnabled(tool.name))
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: this.validateAndFixSchema(tool.inputSchema, tool.name),
        source: 'built-in' as const,
        category: tool.category
      }));
  }
  
  /**
   * Get MCP tools only with permission filtering
   */
  async getMCPTools(): Promise<UnifiedTool[]> {
    if (!this.mcpManager) {
      return [];
    }

    try {
      const mcpTools = await this.mcpManager.listAllTools();
      return mcpTools
        .filter(mcpTool => this.isMCPToolEnabled(mcpTool.name, mcpTool.server))
        .map(mcpTool => ({
          name: mcpTool.name,
          description: mcpTool.description || 'No description available',
          inputSchema: this.validateAndFixSchema(mcpTool.inputSchema, mcpTool.name),
          source: 'mcp' as const,
          server: mcpTool.server
        }));
    } catch (error) {
      Logger.warn('Failed to get MCP tools:', error);
      return [];
    }
  }
  
  /**
   * Get a specific tool by name with permission checking
   */
  async getTool(name: string): Promise<UnifiedTool | null> {
    // Check built-in tools first
    if (isBuiltInTool(name)) {
      // Check if the built-in tool is enabled
      if (!this.isBuiltInToolEnabled(name)) {
        Logger.debug(`Built-in tool ${name} is disabled by permissions`);
        return null;
      }

      const tool = getBuiltInTool(name);
      if (tool) {
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: this.validateAndFixSchema(tool.inputSchema, tool.name),
          source: 'built-in'
        };
      }
    }

    // Check MCP tools
    if (this.mcpManager) {
      try {
        const mcpTools = await this.mcpManager.listAllTools();
        const mcpTool = mcpTools.find(t => t.name === name);
        if (mcpTool) {
          // Check if the MCP tool is enabled
          if (!this.isMCPToolEnabled(mcpTool.name, mcpTool.server)) {
            Logger.debug(`MCP tool ${name} is disabled by permissions`);
            return null;
          }

          return {
            name: mcpTool.name,
            description: mcpTool.description || 'No description available',
            inputSchema: this.validateAndFixSchema(mcpTool.inputSchema, mcpTool.name),
            source: 'mcp',
            server: mcpTool.server
          };
        }
      } catch (error) {
        Logger.warn('Failed to search MCP tools:', error);
      }
    }

    return null;
  }
  
  /**
   * Execute a tool by name with permission checking
   */
  async executeTool(name: string, args: unknown, runtimeContext?: unknown): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // Debug: Log tool execution attempt with detailed args
    Logger.debug(`🎯 [executeTool] Attempting to execute tool: ${name}`);
    Logger.debug(`🎯 [executeTool] Args type: ${typeof args}`);
    Logger.debug(`🎯 [executeTool] Args value:`, JSON.stringify(args, null, 2));
    if (args && typeof args === 'object') {
      Logger.debug(`🎯 [executeTool] Args keys:`, Object.keys(args));
      Logger.debug(`🎯 [executeTool] Args entries:`, Object.entries(args));
    }

    try {
      // Check if it's a built-in tool (now includes file editing tools)
      if (isBuiltInTool(name)) {
        // Check if the built-in tool is enabled
        if (!this.isBuiltInToolEnabled(name)) {
          Logger.debug(`Built-in tool ${name} execution blocked by permissions`);
          return {
            success: false,
            error: `Tool "${name}" is disabled by user settings`,
            toolName: name,
            source: 'built-in',
            executionTime: Date.now() - startTime
          };
        }

        Logger.debug(`Executing built-in tool: ${name}`);
        const result = await executeBuiltInTool(name, args, runtimeContext);

        // Check if the tool result itself indicates failure
        const isSuccess = result && typeof result === 'object' && 'success' in result 
          ? result.success !== false  // If result has success field, use it (false means failure)
          : true;  // If no success field, assume success

        return {
          success: isSuccess,
          result,
          toolName: name,
          source: 'built-in',
          executionTime: Date.now() - startTime,
          error: !isSuccess && result && typeof result === 'object' && 'error' in result ? (result as any).error : undefined
        };
      }

      // Try MCP tools
      if (this.mcpManager) {
        Logger.debug(`Executing MCP tool: ${name}`);
        try {
          // Find the tool to get its server info for permission checking
          const mcpTools = await this.mcpManager.listAllTools();
          const mcpTool = mcpTools.find(t => t.name === name);

          if (mcpTool) {
            // Check if the MCP tool is enabled
            if (!this.isMCPToolEnabled(mcpTool.name, mcpTool.server)) {
              Logger.debug(`MCP tool ${name} execution blocked by permissions`);
              return {
                success: false,
                error: `Tool "${name}" is disabled by user settings`,
                toolName: name,
                source: 'mcp',
                server: mcpTool.server,
                executionTime: Date.now() - startTime
              };
            }
          }

          const result = await this.mcpManager.callTool(name, args);

          // Check if the tool result itself indicates failure  
          const isSuccess = result && typeof result === 'object' && 'success' in result
            ? result.success !== false  // If result has success field, use it
            : (result && result.isError ? false : true);  // MCP uses isError field

          // Extract error message from MCP result
          let errorMessage: string | undefined;
          if (!isSuccess && result) {
            if ('error' in result && result.error) {
              errorMessage = String(result.error);
            } else if (result.isError && result.content) {
              // Extract error from content
              errorMessage = result.content.map(c => c.text).filter(Boolean).join(', ');
            }
          }

          return {
            success: isSuccess,
            result,
            toolName: name,
            source: 'mcp',
            server: mcpTool?.server,
            executionTime: Date.now() - startTime,
            error: errorMessage
          };
        } catch (mcpError) {
          Logger.error(`MCP tool execution failed for ${name}:`, mcpError);

          return {
            success: false,
            error: mcpError instanceof Error ? mcpError.message : 'MCP tool execution failed',
            toolName: name,
            source: 'mcp',
            executionTime: Date.now() - startTime
          };
        }
      }

      // Tool not found
      return {
        success: false,
        error: `Tool not found: ${name}`,
        toolName: name,
        source: 'built-in', // Default
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      Logger.error(`Error executing tool ${name}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName: name,
        source: 'built-in',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate and fix tool input schema to ensure it's compatible with AI SDK
   */
  private validateAndFixSchema(schema: unknown, toolName: string): {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  } {
    // Special tools like for_each are meta-tools, skip validation
    if (toolName === 'for_each') {
      return schema as {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
      };
    }
    
    // If schema is null, undefined, or has invalid type
    if (!schema || typeof schema !== 'object') {
      Logger.warn(`Invalid schema for tool ${toolName}, using default`);
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }

    // Cast schema to access properties
    const schemaObj = schema as Record<string, any>;

    // Check for invalid type values - add more comprehensive checks
    // Note: undefined type is common for tools with no parameters, so don't warn for that case alone
    if (schemaObj.type === 'None' || schemaObj.type === null || schemaObj.type === 'none' ||
        schemaObj.type === '' || (typeof schemaObj.type === 'string' && schemaObj.type.toLowerCase() === 'none')) {
      Logger.warn(`Tool ${toolName} has invalid schema type: ${schemaObj.type}, fixing to object type`);
      return {
        type: 'object',
        properties: schemaObj.properties || {},
        required: Array.isArray(schemaObj.required) ? schemaObj.required : []
      };
    }

    // If type is undefined, treat it as an empty object schema (common for tools with no parameters)
    if (schemaObj.type === undefined) {
      return {
        type: 'object',
        properties: schemaObj.properties || {},
        required: Array.isArray(schemaObj.required) ? schemaObj.required : []
      };
    }

    // If type is not 'object', wrap the schema
    if (schemaObj.type !== 'object') {
      Logger.warn(`Tool ${toolName} schema type is not 'object' (${schemaObj.type}), wrapping`);
      return {
        type: 'object',
        properties: {
          input: schemaObj
        },
        required: []
      };
    }

    // Validate properties and fix any invalid property schemas
    const validatedProperties: Record<string, unknown> = {};
    if (schemaObj.properties && typeof schemaObj.properties === 'object') {
      for (const [propName, propSchema] of Object.entries(schemaObj.properties)) {
        const prop = propSchema as Record<string, any>;

        // Fix invalid property types
        if (!prop || typeof prop !== 'object') {
          validatedProperties[propName] = { type: 'string', description: 'Auto-generated property' };
          Logger.warn(`Fixed invalid property ${propName} in ${toolName}`);
          continue;
        }

        // Fix None/null/undefined types
        if (prop.type === 'None' || prop.type === null || prop.type === undefined ||
            prop.type === '' || (typeof prop.type === 'string' && prop.type.toLowerCase() === 'none')) {
          validatedProperties[propName] = {
            ...prop,
            type: 'string',
            description: prop.description || `Parameter for ${propName}`
          };
          // Only log if it's not a common case (undefined is common for optional MCP params)
          if (prop.type !== undefined) {
            Logger.warn(`Fixed invalid property type for ${propName} in ${toolName}: ${prop.type} -> string`);
          }
        } else if (prop.type === 'integer') {
          // Handle 'integer' type from MCP tools (JSON Schema uses 'integer', but we normalize to 'number')
          validatedProperties[propName] = {
            ...prop,
            type: 'number',
            description: prop.description || `Parameter for ${propName}`
          };
        } else if (!['string', 'number', 'boolean', 'array', 'object'].includes(prop.type)) {
          // Fix unknown types
          validatedProperties[propName] = {
            ...prop,
            type: 'string',
            description: prop.description || `Parameter for ${propName}`
          };
          Logger.warn(`Fixed unknown property type for ${propName} in ${toolName}: ${prop.type} -> string`);
        } else {
          validatedProperties[propName] = prop;
        }
      }
    }

    // Ensure required fields exist and are valid
    const validatedSchema = {
      type: 'object' as const,
      properties: validatedProperties,
      required: Array.isArray(schemaObj.required) ? schemaObj.required : []
    };

    // Logger.debug(`Validated schema for ${toolName}: type=${validatedSchema.type}, properties=${Object.keys(validatedProperties).length}`);
    return validatedSchema;
  }
  
  /**
   * Convert unified tools to AI SDK format
   */
  convertToAISDKFormat(tools: UnifiedTool[]): Record<string, unknown> {
    const aiSDKTools: Record<string, unknown> = {};
    const processedNames = new Set<string>();

    for (const tool of tools) {
      // Skip duplicates
      if (processedNames.has(tool.name)) {
        Logger.warn(`Skipping duplicate tool in AI SDK conversion: ${tool.name}`);
        continue;
      }

      // Double-check schema validation before conversion
      const validatedSchema = this.validateAndFixSchema(tool.inputSchema, tool.name);

      // Ensure the schema is valid before adding
      if (validatedSchema.type !== 'object') {
        Logger.error(`Invalid schema type for ${tool.name}: ${validatedSchema.type}, skipping tool`);
        continue;
      }

      // Create the AI SDK tool format
      const aiSDKTool = {
        description: tool.description,
        parameters: validatedSchema
      };

      aiSDKTools[tool.name] = aiSDKTool;
      processedNames.add(tool.name);

      Logger.debug(`AI SDK tool ${tool.name}: schema type = ${validatedSchema.type}`);
      Logger.debug(`Full AI SDK tool for ${tool.name}:`, JSON.stringify(aiSDKTool, null, 2));
    }

    Logger.debug('Converted tools to AI SDK format:', Object.keys(aiSDKTools));
    Logger.debug('Complete AI SDK tools object:', JSON.stringify(aiSDKTools, null, 2));
    return aiSDKTools;
  }
  
  /**
   * Convert unified tools to provider format (OpenAI compatible)
   */
  convertToProviderFormat(tools: UnifiedTool[]): unknown[] {
    return tools.map(tool => {
      // Double-check schema validation before conversion
      const validatedSchema = this.validateAndFixSchema(tool.inputSchema, tool.name);
      
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: validatedSchema
        }
      };
    });
  }
  
  /**
   * Get tool count statistics
   */
  async getToolStats(): Promise<{
    total: number;
    builtIn: number;
    mcp: number;
    mcpByServer: Record<string, number>;
  }> {
    const builtInTools = this.getBuiltInTools();
    const mcpTools = await this.getMCPTools();
    
    const mcpByServer: Record<string, number> = {};
    for (const tool of mcpTools) {
      if (tool.server) {
        mcpByServer[tool.server] = (mcpByServer[tool.server] || 0) + 1;
      }
    }
    
    return {
      total: builtInTools.length + mcpTools.length,
      builtIn: builtInTools.length,
      mcp: mcpTools.length,
      mcpByServer
    };
  }
  
  /**
   * Check if any tools are available
   */
  async hasTools(): Promise<boolean> {
    const stats = await this.getToolStats();
    return stats.total > 0;
  }
  
/**
    * Get tool by name and return its source information
    */
  async getToolInfo(name: string): Promise<{
    exists: boolean;
    source?: 'built-in' | 'mcp';
    server?: string;
    description?: string;
  }> {
    const tool = await this.getTool(name);
    
    if (!tool) {
      return { exists: false };
    }
    
    return {
      exists: true,
      source: tool.source,
      server: tool.server,
      description: tool.description
    };
  }

  /**
    * Get all available tool names
    * Returns an array of tool names from both built-in and MCP tools
    */
  async getToolNames(): Promise<string[]> {
    const tools = await this.getAllTools();
    return tools.map(tool => tool.name);
  }
}