// MCP Client implementation
// Handles JSON-RPC 2.0 communication, initialization, and operations

import { MCPTransport, WebSocketTransport, STDIOTransport, StreamableHTTPTransport, MCPTransportFactory } from './mcp-transport';
import { Logger } from './../utils/logger';
import { MCPServerConfig, MCPServerRuntime, ConnectionOptions, STDIOConnectionOptions } from '../types';
import { StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { 
  MCPProtocolValidator, 
  MCPProtocolError, 
  MCP_ERROR_CODES, 
  MCP_METHODS,
  MCP_PROTOCOL_VERSION,
  InitializeParams,
  InitializeResult,
  ClientInfo,
  ClientCapabilities,
  ListResourcesResult,
  ReadResourceParams,
  ReadResourceResult,
  ListToolsResult,
  CallToolParams,
  CallToolResult,
  Resource,
  Tool
} from './mcp-protocol';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class MCPClient {
  private transport: MCPTransport | null = null;
  private pendingRequests = new Map<string | number, PendingRequest>();
  private requestIdCounter = 0;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private serverCapabilities: any = {};
  private serverInfo: any = {};
  private connectionType: 'websocket' | 'stdio' | 'streamable-http' = 'stdio';
  

  constructor(
    private serverConfig: MCPServerConfig,
    private serverId: string
  ) {
    // Determine connection type based on configuration
    if (serverConfig.url) {
      if (MCPTransportFactory.validateWebSocketUrl(serverConfig.url)) {
        this.connectionType = 'websocket';
      } else if (MCPTransportFactory.validateStreamableHTTPUrl(serverConfig.url)) {
        this.connectionType = 'streamable-http';
      } else {
        throw new Error(`Invalid URL format: ${serverConfig.url}`);
      }
    } else {
      this.connectionType = 'stdio';
    }
  }

  // Connection Management
  async connect(): Promise<void> {
    if (this.transport?.isConnected()) {
      // If already connected, wait for initialization to complete
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }

    Logger.debug(`Connecting via ${this.connectionType}...`);

    // Create initialization promise to track async connection
    this.initializationPromise = this.performConnection();
    await this.initializationPromise;
  }

  // Helper method to extract API key from URL query parameters
  private extractApiKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('key') || urlObj.searchParams.get('apikey') || urlObj.searchParams.get('api_key');
    } catch {
      return null;
    }
  }

  // Helper method to classify connection errors for better error handling
  private classifyConnectionError(error: Error): 'ssl' | 'cors' | 'timeout' | 'network' | 'server' | 'unknown' {
    const message = error.message.toLowerCase();

    if (message.includes('ssl') || message.includes('certificate') || message.includes('tls')) {
      return 'ssl';
    }
    if (message.includes('cors') || message.includes('cross-origin')) {
      return 'cors';
    }
    if (message.includes('timeout') || message.includes('time out')) {
      return 'timeout';
    }
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('server') || message.includes('503') || message.includes('502') || message.includes('500')) {
      return 'server';
    }

    return 'unknown';
  }

  private async performConnection(): Promise<void> {
    try {
      // Create transport based on connection type
      if (this.connectionType === 'websocket' && this.serverConfig.url) {
        if (!MCPTransportFactory.validateWebSocketUrl(this.serverConfig.url)) {
          throw new Error(`Invalid WebSocket URL: ${this.serverConfig.url}`);
        }
        this.transport = MCPTransportFactory.createWebSocket(this.serverConfig.url);
      } else if (this.connectionType === 'streamable-http' && this.serverConfig.url) {
        if (!MCPTransportFactory.validateStreamableHTTPUrl(this.serverConfig.url)) {
          throw new Error(`Invalid Streamable HTTP URL: ${this.serverConfig.url}`);
        }
        // Configure options for external streamable HTTP servers (minimal)
        const streamableOptions: StreamableHTTPClientTransportOptions = {
          // Use default configuration like the reference implementation
        };
        Logger.debug(`Using streamable HTTP options:`, streamableOptions);
        this.transport = MCPTransportFactory.createStreamableHTTP(this.serverConfig.url, streamableOptions);
      } else {
        if (!this.serverConfig.command) {
          throw new Error('No command specified for STDIO connection');
        }

        // Parse command string if it contains arguments
        let command = this.serverConfig.command;
        let args = this.serverConfig.args || [];
        
        // If command contains spaces and no args are provided, parse it
        if (!this.serverConfig.args && this.serverConfig.command.includes(' ')) {
          const parts = this.serverConfig.command.split(/\s+/);
          command = parts[0];
          args = parts.slice(1);
          Logger.debug(`Parsed command: ${command}, args:`, args);
        }

        const stdioOptions: STDIOConnectionOptions = {
          command: command,
          args: args,
          env: this.serverConfig.env,
          cwd: this.serverConfig.cwd,
          timeout: 30000 // 30 seconds timeout for STDIO
        };

        this.transport = MCPTransportFactory.createSTDIO(stdioOptions);
      }

      // Set up event handlers
      this.transport.onMessage((message) => this.handleMessage(message));
      this.transport.onError((error) => this.handleError(error));
      this.transport.onClose(() => this.handleClose());

      // Connect
      await this.transport.connect();
      Logger.debug(`Transport connected`);

      // Initialize MCP protocol
      await this.initialize();
      Logger.debug(`MCP protocol initialized`);

    } catch (error) {
      Logger.error(`Connection failed:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    Logger.debug(`Disconnecting...`);

    // Cancel all pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    if (this.transport) {
      await this.transport.disconnect();
      this.transport = null;
    }

    this.isInitialized = false;
    this.initializationPromise = null;
    this.serverCapabilities = {};
    this.serverInfo = {};
  }

  // Protocol Initialization
  private async initialize(): Promise<InitializeResult> {
    const params: InitializeParams = {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: this.getClientCapabilities(),
      clientInfo: this.getClientInfo()
    };

    try {
      const result = await this.sendRequest(MCP_METHODS.INITIALIZE, params) as InitializeResult;
      
      this.serverCapabilities = result.capabilities || {};
      this.serverInfo = result.serverInfo || {};
      this.isInitialized = true;
      
      Logger.debug(`Initialized with server:`, this.serverInfo);
      
      // Send initialized notification
      await this.sendNotification(MCP_METHODS.NOTIFICATIONS_INITIALIZED, {});
      
      return result;
    } catch (error) {
      Logger.error(`Initialization failed:`, error);
      throw error;
    }
  }

  private getClientCapabilities(): ClientCapabilities {
    return {
      experimental: {},
      sampling: {}
    };
  }

  private getClientInfo(): ClientInfo {
    return {
      name: 'LLMSider',
      version: '1.0.0'
    };
  }

  // Resource Operations
  async listResources(): Promise<Resource[]> {
    await this.ensureInitialized();
    
    try {
      const result = await this.sendRequest(MCP_METHODS.RESOURCES_LIST, {}) as ListResourcesResult;
      return result.resources || [];
    } catch (error) {
      Logger.error(`Failed to list resources:`, error);
      throw error;
    }
  }

  async readResource(uri: string): Promise<ReadResourceResult> {
    await this.ensureInitialized();
    
    try {
      const params: ReadResourceParams = { uri };
      const result = await this.sendRequest(MCP_METHODS.RESOURCES_READ, params) as ReadResourceResult;
      return result;
    } catch (error) {
      Logger.error(`Failed to read resource ${uri}:`, error);
      throw error;
    }
  }

  // Tool Operations
  async listTools(): Promise<Tool[]> {
    await this.ensureInitialized();
    
    try {
      const result = await this.sendRequest(MCP_METHODS.TOOLS_LIST, {}) as ListToolsResult;
      return result.tools || [];
    } catch (error) {
      Logger.error(`Failed to list tools:`, error);
      throw error;
    }
  }

  async callTool(name: string, arguments_?: any): Promise<CallToolResult> {
    await this.ensureInitialized();
    
    try {
      const params: CallToolParams = {
        name,
        arguments: arguments_
      };
      const result = await this.sendRequest(MCP_METHODS.TOOLS_CALL, params) as CallToolResult;
      return result;
    } catch (error) {
      Logger.error(`Failed to call tool ${name}:`, error);
      throw error;
    }
  }

  // Utility Methods
  async ping(): Promise<any> {
    return this.sendRequest(MCP_METHODS.PING, {});
  }

  isConnected(): boolean {
    // For streamable HTTP, consider the client connected if it's initialized
    if (this.connectionType === 'streamable-http') {
      return this.isInitialized && this.transport !== null;
    }
    // For other connection types, rely on transport connection state
    return this.transport?.isConnected() || false;
  }

  getServerInfo(): any {
    return { ...this.serverInfo };
  }

  getServerCapabilities(): any {
    return { ...this.serverCapabilities };
  }

  // Private Methods
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.transport) {
      throw new Error('Transport not available');
    }

    // Different connection checks for different transport types
    if (this.connectionType === 'streamable-http') {
      if (!this.isInitialized && method !== MCP_METHODS.INITIALIZE) {
        throw new Error('MCP client not initialized');
      }
    } else {
      if (!this.transport.isConnected()) {
        throw new Error('Not connected to MCP server');
      }
    }

    const id = this.generateRequestId();
    const request = MCPProtocolValidator.createRequest(id, method, params);

    // Debug: Log the full request for tool calls
    if (method === MCP_METHODS.TOOLS_CALL) {
      Logger.debug(`🔍 Tool call request:`, JSON.stringify(request, null, 2));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new MCPProtocolError(MCP_ERROR_CODES.REQUEST_TIMEOUT, 'Request timeout'));
      }, 30000); // 30 second timeout

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout
      });

      this.transport!.send(request).catch((error) => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }



  private async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.transport) {
      throw new Error('Transport not available');
    }

    // Different connection checks for different transport types
    if (this.connectionType === 'streamable-http') {
      if (!this.isInitialized) {
        throw new Error('MCP client not initialized');
      }
    } else {
      if (!this.transport.isConnected()) {
        throw new Error('Not connected to MCP server');
      }
    }

    const notification = MCPProtocolValidator.createNotification(method, params);
    await this.transport.send(notification);
  }

  private handleMessage(message: any): void {
    try {
      if (message.id !== undefined) {
        // This is a response
        const response = MCPProtocolValidator.validateResponse(message);
        this.handleResponse(response);
      } else {
        // This is a notification
        this.handleNotification(message);
      }
    } catch (error) {
      Logger.error(`Failed to handle message:`, error);
    }
  }

  private handleResponse(response: any): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      Logger.warn(`Received response for unknown request:`, response.id);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      // Debug: Log complete error details for tool call failures
      Logger.error(`🔴 Tool call error response:`, JSON.stringify(response, null, 2));
      Logger.error(`Error code:`, response.error.code);
      Logger.error(`Error message:`, response.error.message);
      Logger.error(`Error data:`, response.error.data);
      const error = new MCPProtocolError(
        response.error.code,
        response.error.message,
        response.error.data
      );
      pending.reject(error);
    } else {
      pending.resolve(response.result);
    }
  }

  private handleNotification(notification: any): void {
    Logger.debug(`Received notification:`, notification.method, notification.params);
    
    // Handle specific notifications
    switch (notification.method) {
      case MCP_METHODS.NOTIFICATIONS_RESOURCE_UPDATED:
      case MCP_METHODS.NOTIFICATIONS_RESOURCE_LIST_CHANGED:
      case MCP_METHODS.NOTIFICATIONS_TOOL_LIST_CHANGED:
        // These could trigger UI updates in the future
        break;
      default:
        Logger.debug(`Unhandled notification:`, notification.method);
    }
  }

  private handleError(error: Error): void {
    Logger.error(`Transport error:`, error);
    
    // Classify error types for better handling
    const errorType = this.classifyError(error);
    Logger.debug(`Error classification:`, errorType);
    
    // Cancel all pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(`Connection error: ${error.message}`));
    }
    this.pendingRequests.clear();
    
    // Emit structured error event for manager to handle
    this.emitErrorEvent(errorType, error);
  }

  private classifyError(error: Error): 'connection' | 'timeout' | 'protocol' | 'authentication' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (message.includes('connection') || message.includes('connect') || message.includes('websocket')) {
      return 'connection';
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'authentication';
    }
    if (message.includes('protocol') || message.includes('jsonrpc') || message.includes('invalid')) {
      return 'protocol';
    }
    
    return 'unknown';
  }

  private emitErrorEvent(errorType: string, error: Error): void {
    // In a full implementation, this would emit to an event system
    Logger.debug(`Emitting error event:`, { errorType, message: error.message });
  }

  private handleClose(): void {
    Logger.debug(`Connection closed`);
    this.isInitialized = false;

    // Cancel all pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  private generateRequestId(): string {
    return `req_${++this.requestIdCounter}`;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      if (this.isInitialized) {
        return;
      }
    }

    throw new Error('MCP client not initialized');
  }
}

// Add missing method to MCPProtocolValidator
declare module './mcp-protocol' {
  namespace MCPProtocolValidator {
    function createRequest(id: string | number, method: string, params?: any): any;
  }
}

// Extend MCPProtocolValidator with createRequest method
(MCPProtocolValidator as any).createRequest = function(id: string | number, method: string, params?: any) {
  const request: any = {
    jsonrpc: '2.0',
    id,
    method
  };
  
  if (params !== undefined) {
    request.params = params;
  }
  
  return request;
};