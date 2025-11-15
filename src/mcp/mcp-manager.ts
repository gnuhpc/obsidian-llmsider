// MCP Manager - Coordinates multiple MCP clients and aggregates capabilities
// Manages server connections and tool discovery

import { MCPClient } from './mcp-client';
import { Logger } from './../utils/logger';
import { MCPServersConfig, MCPServerConfig, MCPServerRuntime, MCPTool, MCPClientState, MCPServerPermissions } from '../types';
import { ConfigDatabase } from '../utils/config-db';
import { Tool, CallToolResult } from './mcp-protocol';
import { Notice } from 'obsidian';
import { I18nManager } from '../i18n/i18n-manager';

export interface MCPManagerEvents {
  'server-connected': (serverId: string) => void;
  'server-disconnected': (serverId: string) => void;
  'server-error': (serverId: string, error: Error) => void;
  'tools-updated': (tools: MCPTool[]) => void;
}

export class MCPManager {
  private clients = new Map<string, MCPClient>();
  private state: MCPClientState;
  private eventHandlers = new Map<keyof MCPManagerEvents, Function[]>();

  // Advanced features
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private healthCheckIntervalMs = 30000; // 30 seconds
  private serverHealth = new Map<string, { lastCheck: number; status: 'healthy' | 'degraded' | 'unhealthy'; errors: string[] }>();

  constructor(
    private configDb: ConfigDatabase,
    private i18n: I18nManager,
    private debugMode = false
  ) {
    this.state = {
      serversConfig: { mcpServers: {} },
      connectedServers: new Set(),
      availableTools: [],
      serverPermissions: {},
      lastUpdate: Date.now()
    };
  }

  // Debug logging helper
  private debugLog(message: string, ...args: any[]): void {
    if (this.debugMode) {
      Logger.debug(`${message}`, ...args);
    }
  }

  private log(message: string, ...args: any[]): void {
    Logger.debug(`${message}`, ...args);
  }

  // Lifecycle Management
  async initialize(): Promise<void> {
    Logger.debug('Initializing MCP Manager...');
    
    try {
      // Load MCP configuration
      this.state.serversConfig = await this.configDb.loadMCPConfig();
      
      Logger.debug('Loaded MCP config with servers:', 
        Object.keys(this.state.serversConfig.mcpServers));
      
      this.state.lastUpdate = Date.now();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
    } catch (error) {
      Logger.error('Failed to initialize:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    Logger.debug('Shutting down MCP Manager...');

    // Stop health monitoring
    this.stopHealthMonitoring();

    // Disconnect all clients
    const disconnectPromises = Array.from(this.clients.values()).map(client =>
      client.disconnect().catch(error =>
        Logger.error('Error disconnecting client:', error)
      )
    );

    await Promise.all(disconnectPromises);
    this.clients.clear();
    this.state.connectedServers.clear();
    this.serverHealth.clear();

    Logger.debug('Shutdown complete');
  }

  // Server Management
  async addServer(serverId: string, config: MCPServerConfig): Promise<void> {
    Logger.debug('Adding server:', serverId);
    
    // Update configuration
    this.state.serversConfig.mcpServers[serverId] = config;
    await this.configDb.saveMCPConfig(this.state.serversConfig);
    
    Logger.debug('Server configuration saved for:', serverId);
  }

  async removeServer(serverId: string): Promise<void> {
    Logger.debug('Removing server:', serverId);
    
    // Disconnect if connected
    await this.disconnectServer(serverId);
    
    // Remove from configuration
    delete this.state.serversConfig.mcpServers[serverId];
    await this.configDb.saveMCPConfig(this.state.serversConfig);
    
    await this.refreshAggregatedData();
    Logger.debug('Server removed:', serverId);
  }

  async updateServer(serverId: string, config: MCPServerConfig): Promise<void> {
    Logger.debug('Updating server:', serverId);
    
    const wasConnected = this.state.connectedServers.has(serverId);
    
    // Disconnect if connected
    if (wasConnected) {
      await this.disconnectServer(serverId);
    }
    
    // Update configuration
    this.state.serversConfig.mcpServers[serverId] = config;
    await this.configDb.saveMCPConfig(this.state.serversConfig);
    
    // Reconnect if it was connected
    if (wasConnected) {
      await this.connectServer(serverId);
    }
    
    Logger.debug('Server updated:', serverId);
  }

  // Connection Management
  async connectServer(serverId: string, options: { suppressNotification?: boolean } = {}): Promise<void> {
    const config = this.state.serversConfig.mcpServers[serverId];
    if (!config) {
      throw new Error(`Server configuration not found: ${serverId}`);
    }

    if (this.clients.has(serverId)) {
      this.debugLog('Server already connected:', serverId);
      return;
    }

    this.debugLog('Connecting to server:', serverId);

    try {
      const client = new MCPClient(config, serverId);

      // Set up client event handlers
      this.setupClientEventHandlers(client, serverId);

      // Store client and connect
      this.clients.set(serverId, client);
      await client.connect();

      this.state.connectedServers.add(serverId);
      await this.refreshAggregatedData();

      // Initialize tool permissions for newly connected server
      // Set all tools to enabled by default if not already configured
      if (!this.state.serverPermissions[serverId]) {
        this.state.serverPermissions[serverId] = {
          serverId,
          serverEnabled: true,
          toolPermissions: {},
          lastUpdated: Date.now()
        };
      }
      
      // Auto-enable all tools from this server if server is enabled
      if (this.state.serverPermissions[serverId].serverEnabled) {
        const serverTools = this.state.availableTools.filter(tool => tool.server === serverId);
        serverTools.forEach(tool => {
          // Only set if not explicitly configured
          if (this.state.serverPermissions[serverId].toolPermissions[tool.name] === undefined) {
            this.state.serverPermissions[serverId].toolPermissions[tool.name] = true;
          }
        });
        
        // Save to database
        await this.configDb.setMCPServerPermissions(this.state.serverPermissions);
      }

      // Initialize tool settings in database for all tools from this server
      // Default: enabled=true, requireConfirmation=true (safer default)
      const serverTools = this.state.availableTools.filter(tool => tool.server === serverId);
      serverTools.forEach(tool => {
        const toolId = `${serverId}:${tool.name}`;
        this.configDb.initializeToolSettings(toolId, serverId);
      });

      this.emit('server-connected', serverId);
      Logger.debug('Successfully connected to server:', serverId);

      // Show success notification only if not suppressed
      if (!options.suppressNotification) {
        new Notice(this.i18n.t('mcp.serverConnected', { server: serverId }), 2000);
      }
      
    } catch (error) {
      Logger.error(`Failed to connect to server ${serverId}:`, error);

      // Show failure notification
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      new Notice(this.i18n.t('mcp.serverConnectionFailed', { server: serverId, error: errorMsg }), 4000);

      // Update health status with error
      this.serverHealth.set(serverId, {
        lastCheck: Date.now(),
        status: 'unhealthy',
        errors: [`Connection failed: ${errorMsg}`]
      });

      // Clean up on failure
      this.clients.delete(serverId);
      this.state.connectedServers.delete(serverId);

      this.emit('server-error', serverId, error as Error);

      // Do not automatically retry - let user manually retry if needed
      // this.scheduleReconnect(serverId);

      throw error;
    }
  }

  async disconnectServer(serverId: string): Promise<void> {
    Logger.debug('Disconnecting server:', serverId);

    const client = this.clients.get(serverId);
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        Logger.error(`Error disconnecting from ${serverId}:`, error);
      }

      this.clients.delete(serverId);
      
      // When server disconnects, optionally clean up its tool settings
      // Uncomment if you want to remove settings when server is disconnected
      // this.configDb.removeToolSettingsByServer(serverId);
    }

    this.state.connectedServers.delete(serverId);
    await this.refreshAggregatedData();

    this.emit('server-disconnected', serverId);
    Logger.debug('Disconnected from server:', serverId);
  }

  async connectAllServers(): Promise<void> {
    Logger.debug('Connecting to all configured servers...');

    const serverIds = Object.keys(this.state.serversConfig.mcpServers);
    const connectPromises = serverIds.map(serverId =>
      this.connectServer(serverId, { suppressNotification: true }).catch(error =>
        Logger.error(`Failed to connect to ${serverId}:`, error)
      )
    );

    await Promise.all(connectPromises);
    Logger.debug('Connection attempts completed');
  }

  async connectAutoConnectServers(): Promise<void> {
    this.log('Connecting to auto-connect enabled servers...');

    const autoConnectServerIds = Object.entries(this.state.serversConfig.mcpServers)
      .filter(([_, config]) => config.autoConnect === true)
      .map(([serverId, _]) => serverId);

    if (autoConnectServerIds.length === 0) {
      this.debugLog('No servers configured for auto-connect');
      return;
    }

    this.debugLog('Found servers with auto-connect enabled:', autoConnectServerIds);

    // Show notification for auto-connecting servers
    if (autoConnectServerIds.length > 0) {
      const serverNames = autoConnectServerIds.join(', ');
      new Notice(this.i18n.t('mcp.connectingServers', { servers: serverNames }), 3000);
    }

    const connectPromises = autoConnectServerIds.map(serverId =>
      this.connectServer(serverId, { suppressNotification: true }).catch(error =>
        Logger.error(`Failed to auto-connect to ${serverId}:`, error)
      )
    );

    await Promise.all(connectPromises);
    this.debugLog('Auto-connect attempts completed');

    // Show completion summary
    const connectedCount = autoConnectServerIds.filter(id => this.state.connectedServers.has(id)).length;
    const totalCount = autoConnectServerIds.length;

    if (connectedCount === totalCount) {
      new Notice(this.i18n.t('mcp.allServersConnected', { connected: connectedCount, total: totalCount }), 2000);
    } else if (connectedCount > 0) {
      new Notice(this.i18n.t('mcp.partialServersConnected', { connected: connectedCount, total: totalCount }), 3000);
    } else {
      new Notice(this.i18n.t('mcp.noServersConnected', { total: totalCount }), 4000);
    }
  }

  async disconnectAllServers(): Promise<void> {
    Logger.debug('Disconnecting from all servers...');
    
    const disconnectPromises = Array.from(this.state.connectedServers).map(serverId =>
      this.disconnectServer(serverId)
    );
    
    await Promise.all(disconnectPromises);
    Logger.debug('All servers disconnected');
  }

  // Tool Operations
  async listAllTools(): Promise<MCPTool[]> {
    const startTime = Date.now();
    Logger.debug('⏱️ [START] listAllTools...', new Date().toISOString());
    const result = this.getFilteredTools();
    const endTime = Date.now();
    Logger.debug(`⏱️ [END] listAllTools completed in ${endTime - startTime}ms, returned ${result.length} tools`);
    return result;
  }

  async getToolsByServer(serverId: string): Promise<MCPTool[]> {
    return this.getFilteredTools().filter(tool => tool.server === serverId);
  }

  /**
   * Get tools filtered by permissions
   */
  private getFilteredTools(): MCPTool[] {
    const startTime = Date.now();
    Logger.debug('⏱️ [START] getFilteredTools, total available tools:', this.state.availableTools.length);
    
    const result = this.state.availableTools.filter(tool => {
      const permissions = this.state.serverPermissions[tool.server];
      if (!permissions) return true; // Default to enabled if no permissions set
      
      // Check if server is enabled
      if (!permissions.serverEnabled) return false;
      
      // Check if specific tool is enabled
      const toolEnabled = permissions.toolPermissions[tool.name];
      return toolEnabled !== false; // Default to enabled if not explicitly disabled
    });
    
    const endTime = Date.now();
    Logger.debug(`⏱️ [END] getFilteredTools completed in ${endTime - startTime}ms, filtered to ${result.length} tools`);
    return result;
  }

  async callTool(toolName: string, args: any, preferredServerId?: string): Promise<CallToolResult> {
    // Find the tool
    const tool = this.state.availableTools.find(t => 
      t.name === toolName && 
      (preferredServerId ? t.server === preferredServerId : true)
    );
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    const client = this.clients.get(tool.server);
    if (!client || !client.isConnected()) {
      throw new Error(`Server not connected: ${tool.server}`);
    }
    
    Logger.debug(`Calling tool ${toolName} on server ${tool.server}`);
    
    try {
      const result = await client.callTool(toolName, args);
      return result;
    } catch (error) {
      Logger.error(`Tool execution failed for ${toolName}:`, error);
      throw error;
    }
  }

  // Configuration Management
  async importConfig(config: MCPServersConfig): Promise<void> {
    Logger.debug('Importing MCP configuration...');
    
    // Disconnect all current servers
    await this.disconnectAllServers();
    
    // Update configuration
    this.state.serversConfig = config;
    await this.configDb.saveMCPConfig(config);
    
    Logger.debug('Configuration imported with servers:', 
      Object.keys(config.mcpServers));
  }

  async exportConfig(): Promise<MCPServersConfig> {
    return { ...this.state.serversConfig };
  }

  // Status and Information
  getConnectedServers(): string[] {
    return Array.from(this.state.connectedServers);
  }

  getServerStatus(serverId: string): 'connected' | 'disconnected' | 'unknown' {
    if (this.state.connectedServers.has(serverId)) {
      return 'connected';
    } else if (this.state.serversConfig.mcpServers[serverId]) {
      return 'disconnected';
    } else {
      return 'unknown';
    }
  }

  getState(): MCPClientState {
    return {
      ...this.state,
      connectedServers: new Set(this.state.connectedServers)
    };
  }

  // Event Management
  on<K extends keyof MCPManagerEvents>(event: K, handler: MCPManagerEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off<K extends keyof MCPManagerEvents>(event: K, handler: MCPManagerEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof MCPManagerEvents>(event: K, ...args: Parameters<MCPManagerEvents[K]>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          Logger.error(`Event handler error for ${event}:`, error);
        }
      });
    }
  }

  // Health Monitoring Methods
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return; // Already running
    }
    
    Logger.debug('Starting health monitoring...');
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckIntervalMs);
    
    // Perform initial health check
    setTimeout(() => {
      this.performHealthChecks().catch(error => {
        Logger.error('Initial health check failed:', error);
      });
    }, 5000); // Wait 5 seconds after startup
  }
  
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      Logger.debug('Stopped health monitoring');
    }
  }
  
  private async performHealthChecks(): Promise<void> {
    this.debugLog('Performing health checks...');
    
    for (const [serverId, client] of this.clients) {
      try {
        const healthStatus = await this.checkServerHealth(serverId, client);
        this.serverHealth.set(serverId, healthStatus);
        
        // Log health status changes
        const previousStatus = this.serverHealth.get(serverId)?.status;
        if (previousStatus && previousStatus !== healthStatus.status) {
          Logger.debug(`Server ${serverId} health changed: ${previousStatus} -> ${healthStatus.status}`);
        }
        
      } catch (error) {
        Logger.error(`Health check failed for server ${serverId}:`, error);
        
        // Mark as unhealthy
        this.serverHealth.set(serverId, {
          lastCheck: Date.now(),
          status: 'unhealthy',
          errors: [error instanceof Error ? error.message : 'Health check failed']
        });
      }
    }
  }
  
  private async checkServerHealth(serverId: string, client: MCPClient): Promise<{ lastCheck: number; status: 'healthy' | 'degraded' | 'unhealthy'; errors: string[] }> {
    const errors: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    try {
      // Check connection status
      if (!client.isConnected()) {
        errors.push('Client not connected');
        status = 'unhealthy';
        return { lastCheck: Date.now(), status, errors };
      }
      
      // Perform ping test with timeout
      const pingPromise = client.ping();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Ping timeout')), 10000); // 10 second timeout
      });
      
      await Promise.race([pingPromise, timeoutPromise]);
      
      // Try to list tools (lightweight operation)
      try {
        await client.listTools();
      } catch (error) {
        errors.push(`Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
        status = 'degraded'; // Can ping but tools may not work
      }
      
    } catch (error) {
      errors.push(`Ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      status = 'unhealthy';
    }
    
    return {
      lastCheck: Date.now(),
      status,
      errors
    };
  }
  
  getServerHealth(serverId: string): { lastCheck: number; status: 'healthy' | 'degraded' | 'unhealthy'; errors: string[] } | null {
    return this.serverHealth.get(serverId) || null;
  }
  
  getAllServerHealth(): Map<string, { lastCheck: number; status: 'healthy' | 'degraded' | 'unhealthy'; errors: string[] }> {
    return new Map(this.serverHealth);
  }

  // Permission Management Methods
  
  /**
   * Set server permissions
   */
  setServerPermissions(serverId: string, permissions: MCPServerPermissions): void {
    this.state.serverPermissions[serverId] = permissions;
    Logger.debug(`Updated permissions for server: ${serverId}`);
  }

  /**
   * Get server permissions
   */
  getServerPermissions(serverId: string): MCPServerPermissions | null {
    return this.state.serverPermissions[serverId] || null;
  }

  /**
   * Enable/disable a specific tool
   */
  async setToolEnabled(serverId: string, toolName: string, enabled: boolean): Promise<void> {
    if (!this.state.serverPermissions[serverId]) {
      this.state.serverPermissions[serverId] = {
        serverId,
        serverEnabled: true,
        toolPermissions: {},
        lastUpdated: Date.now()
      };
    }
    
    this.state.serverPermissions[serverId].toolPermissions[toolName] = enabled;
    this.state.serverPermissions[serverId].lastUpdated = Date.now();
    
    // Save to database to sync with settings
    await this.configDb.setMCPServerPermissions(this.state.serverPermissions);
    
    // Also save to new tool_settings table
    const toolId = `${serverId}:${toolName}`;
    this.configDb.setToolEnabled(toolId, enabled, serverId);
    
    Logger.debug(`Tool ${toolName} on server ${serverId} ${enabled ? 'enabled' : 'disabled'}, saved to database`);
  }

  /**
   * Get tool enabled state
   */
  getToolEnabled(serverId: string, toolName: string): boolean {
    const toolId = `${serverId}:${toolName}`;
    const settings = this.configDb.getToolSettings(toolId);
    
    if (settings) {
      return settings.enabled;
    }
    
    // Fallback to old permissions system
    const permissions = this.state.serverPermissions[serverId];
    if (permissions && permissions.toolPermissions[toolName] !== undefined) {
      return permissions.toolPermissions[toolName];
    }
    
    // Default to enabled
    return true;
  }

  /**
   * Set tool require confirmation state
   */
  setToolRequireConfirmation(serverId: string, toolName: string, requireConfirmation: boolean): void {
    const toolId = `${serverId}:${toolName}`;
    this.configDb.setToolRequireConfirmation(toolId, requireConfirmation, serverId);
    Logger.debug(`Tool ${toolName} on server ${serverId} require_confirmation set to ${requireConfirmation}`);
  }

  /**
   * Get tool require confirmation state
   */
  getToolRequireConfirmation(serverId: string, toolName: string): boolean {
    const toolId = `${serverId}:${toolName}`;
    const settings = this.configDb.getToolSettings(toolId);
    
    if (settings) {
      return settings.requireConfirmation;
    }
    
    // Default to require confirmation (safer)
    return true;
  }

  /**
   * Enable/disable entire server
   */
  async setServerEnabled(serverId: string, enabled: boolean): Promise<void> {
    if (!this.state.serverPermissions[serverId]) {
      this.state.serverPermissions[serverId] = {
        serverId,
        serverEnabled: enabled,
        toolPermissions: {},
        lastUpdated: Date.now()
      };
    } else {
      this.state.serverPermissions[serverId].serverEnabled = enabled;
      this.state.serverPermissions[serverId].lastUpdated = Date.now();
    }
    
    // When enabling/disabling a server, also update all its tools to match
    // This ensures consistency with the settings page behavior
    const serverTools = this.state.availableTools.filter(tool => tool.server === serverId);
    if (serverTools.length > 0) {
      if (!this.state.serverPermissions[serverId].toolPermissions) {
        this.state.serverPermissions[serverId].toolPermissions = {};
      }
      
      // Set all tools to the same enabled state as the server
      serverTools.forEach(tool => {
        this.state.serverPermissions[serverId].toolPermissions[tool.name] = enabled;
      });
    }
    
    // Save to database to sync with settings
    await this.configDb.setMCPServerPermissions(this.state.serverPermissions);
    
    // Actually connect/disconnect the server
    if (enabled) {
      // If enabling, connect the server
      const isConnected = this.state.connectedServers.has(serverId);
      if (!isConnected) {
        await this.connectServer(serverId);
      }
    } else {
      // If disabling, disconnect the server
      const isConnected = this.state.connectedServers.has(serverId);
      if (isConnected) {
        await this.disconnectServer(serverId);
      }
    }
    
    Logger.debug(`Server ${serverId} ${enabled ? 'enabled' : 'disabled'} with ${serverTools.length} tools, saved to database`);
  }

  /**
   * Get all available tools (unfiltered) for management UI
   */
  getAllAvailableTools(): MCPTool[] {
    return [...this.state.availableTools];
  }

  /**
   * Check if a tool is enabled
   */
  isToolEnabled(serverId: string, toolName: string): boolean {
    const permissions = this.state.serverPermissions[serverId];
    if (!permissions) return true; // Default to enabled
    
    if (!permissions.serverEnabled) return false;
    
    const toolEnabled = permissions.toolPermissions[toolName];
    return toolEnabled !== false; // Default to enabled if not explicitly disabled
  }

  /**
   * Check if a server is enabled
   */
  isServerEnabled(serverId: string): boolean {
    const permissions = this.state.serverPermissions[serverId];
    return permissions ? permissions.serverEnabled : false; // Default to disabled if no permission record
  }

  /**
   * Check if a server has explicit permission settings
   */
  hasServerPermission(serverId: string): boolean {
    return !!this.state.serverPermissions[serverId];
  }

  /**
   * Set autoConnect for a server
   */
  async setServerAutoConnect(serverId: string, autoConnect: boolean): Promise<void> {
    const config = this.state.serversConfig.mcpServers[serverId];
    if (!config) {
      throw new Error(`Server configuration not found: ${serverId}`);
    }
    
    // Update autoConnect in config
    config.autoConnect = autoConnect;
    this.state.serversConfig.mcpServers[serverId] = config;
    
    // Save to file
    await this.configDb.saveMCPConfig(this.state.serversConfig);
    
    Logger.debug(`Server ${serverId} autoConnect set to ${autoConnect}`);
  }

  /**
   * Get autoConnect status for a server
   */
  getServerAutoConnect(serverId: string): boolean {
    const config = this.state.serversConfig.mcpServers[serverId];
    return config?.autoConnect === true;
  }

  /**
   * Delete a server configuration
   */
  async deleteServer(serverId: string): Promise<void> {
    // Remove server configuration
    if (this.state.serversConfig.mcpServers[serverId]) {
      delete this.state.serversConfig.mcpServers[serverId];
      await this.configDb.saveMCPConfig(this.state.serversConfig);
    }

    // Remove server permissions
    if (this.state.serverPermissions[serverId]) {
      delete this.state.serverPermissions[serverId];
      await this.configDb.setMCPServerPermissions(this.state.serverPermissions);
    }

    // Remove client if exists
    this.clients.delete(serverId);
    this.state.connectedServers.delete(serverId);
    this.serverHealth.delete(serverId);

    this.log(`Server ${serverId} deleted`);
  }

  // Private Methods
  private async refreshAggregatedData(): Promise<void> {
    const allTools: MCPTool[] = [];
    
    for (const [serverId, client] of this.clients) {
      if (client.isConnected()) {
        try {
          // Fetch tools
          const tools = await client.listTools();
          for (const tool of tools) {
            allTools.push({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
              server: serverId
            });
          }
          
        } catch (error) {
          Logger.error(`Failed to fetch data from ${serverId}:`, error);
        }
      }
    }
    
    this.state.availableTools = allTools;
    this.state.lastUpdate = Date.now();
    
    // Sync database: cleanup removed tools
    const validToolIds = allTools.map(tool => `${tool.server}:${tool.name}`);
    try {
      this.configDb.cleanupToolSettings(validToolIds);
      Logger.debug(`Cleaned up tool settings, ${validToolIds.length} valid tools`);
    } catch (error) {
      Logger.error('Failed to cleanup tool settings:', error);
    }
    
    this.emit('tools-updated', allTools);
    
    Logger.debug(`Aggregated ${allTools.length} tools`);
  }

  private setupClientEventHandlers(client: MCPClient, serverId: string): void {
    // Note: In a real implementation, we would set up handlers for client events
    // The current MCPClient doesn't expose these events, but we could extend it
    Logger.debug(`Set up event handlers for client ${serverId}`);
  }
}