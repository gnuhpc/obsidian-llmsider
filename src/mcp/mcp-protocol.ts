// MCP Protocol implementation based on Model Context Protocol specification
// https://modelcontextprotocol.io/

import { MCPRequest, MCPResponse, MCPNotification, MCPError } from '../types';

// MCP Protocol Version
export const MCP_PROTOCOL_VERSION = '2024-11-05';

// MCP Standard Methods
export const MCP_METHODS = {
  // Lifecycle
  INITIALIZE: 'initialize',
  PING: 'ping',
  
  // Resources
  RESOURCES_LIST: 'resources/list',
  RESOURCES_READ: 'resources/read',
  RESOURCES_SUBSCRIBE: 'resources/subscribe',
  RESOURCES_UNSUBSCRIBE: 'resources/unsubscribe',
  
  // Tools
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',
  
  // Prompts
  PROMPTS_LIST: 'prompts/list',
  PROMPTS_GET: 'prompts/get',
  
  // Notifications
  NOTIFICATIONS_INITIALIZED: 'notifications/initialized',
  NOTIFICATIONS_CANCELLED: 'notifications/cancelled',
  NOTIFICATIONS_PROGRESS: 'notifications/progress',
  NOTIFICATIONS_RESOURCE_UPDATED: 'notifications/resources/updated',
  NOTIFICATIONS_RESOURCE_LIST_CHANGED: 'notifications/resources/list_changed',
  NOTIFICATIONS_TOOL_LIST_CHANGED: 'notifications/tools/list_changed',
  NOTIFICATIONS_PROMPT_LIST_CHANGED: 'notifications/prompts/list_changed'
} as const;

// MCP Error Codes
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // MCP-specific error codes
  INVALID_MCP_VERSION: -32000,
  RESOURCE_NOT_FOUND: -32001,
  TOOL_NOT_FOUND: -32002,
  INVALID_TOOL_INPUT: -32003,
  TOOL_EXECUTION_ERROR: -32004,
  CONNECTION_CLOSED: -32005,
  REQUEST_TIMEOUT: -32006
} as const;

// MCP Protocol Types
export interface InitializeParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: ClientInfo;
}

export interface ClientCapabilities {
  experimental?: Record<string, unknown>;
  sampling?: object;
}

export interface ClientInfo {
  name: string;
  version: string;
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: ServerInfo;
}

export interface ServerCapabilities {
  experimental?: Record<string, unknown>;
  logging?: object;
  prompts?: PromptsCapability;
  resources?: ResourcesCapability;
  tools?: ToolsCapability;
}

export interface PromptsCapability {
  listChanged?: boolean;
}

export interface ResourcesCapability {
  subscribe?: boolean;
  listChanged?: boolean;
}

export interface ToolsCapability {
  listChanged?: boolean;
}

export interface ServerInfo {
  name: string;
  version: string;
}

// Resource Types
export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64 encoded
}

export interface ListResourcesResult {
  resources: Resource[];
  nextCursor?: string;
}

export interface ReadResourceParams {
  uri: string;
}

export interface ReadResourceResult {
  contents: ResourceContents[];
}

// Tool Types
export interface Tool {
  name: string;
  description?: string;
  inputSchema: unknown; // JSON Schema
}

export interface ListToolsResult {
  tools: Tool[];
  nextCursor?: string;
}

export interface CallToolParams {
  name: string;
  arguments?: unknown;
}

export interface CallToolResult {
  content: ToolResponseContent[];
  isError?: boolean;
}

export interface ToolResponseContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string; // base64 for images
  resource?: {
    uri: string;
    mimeType?: string;
  };
}

// Prompt Types
export interface Prompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface ListPromptsResult {
  prompts: Prompt[];
  nextCursor?: string;
}

export interface GetPromptParams {
  name: string;
  arguments?: Record<string, string>;
}

export interface GetPromptResult {
  description?: string;
  messages: PromptMessage[];
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: PromptContent;
}

export interface PromptContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string; // base64 for images
  resource?: {
    uri: string;
    mimeType?: string;
  };
}

// Utility functions for protocol validation
export class MCPProtocolValidator {
  static validateRequest(request: unknown): MCPRequest {
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }
    
    if (!request.method || typeof request.method !== 'string') {
      throw new Error('Missing or invalid method');
    }
    
    if (request.id !== undefined && (typeof request.id !== 'string' && typeof request.id !== 'number')) {
      throw new Error('Invalid request ID');
    }
    
    return request as MCPRequest;
  }
  
  static validateResponse(response: unknown): MCPResponse {
    if (!response.jsonrpc || response.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }
    
    if (response.id === undefined) {
      throw new Error('Missing response ID');
    }
    
    if (response.result === undefined && response.error === undefined) {
      throw new Error('Response must have either result or error');
    }
    
    if (response.result !== undefined && response.error !== undefined) {
      throw new Error('Response cannot have both result and error');
    }
    
    return response as MCPResponse;
  }
  
  static createErrorResponse(id: string | number, code: number, message: string, data?: unknown): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };
  }
  
  static createSuccessResponse(id: string | number, result: unknown): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }
  
  static createNotification(method: string, params?: unknown): MCPNotification {
    return {
      jsonrpc: '2.0',
      method,
      params
    };
  }
}

// MCP Error class
export class MCPProtocolError extends Error implements MCPError {
  public code: number;
  public data?: unknown;
  
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'MCPProtocolError';
    this.code = code;
    this.data = data;
  }
  
  static fromErrorCode(code: number, message?: string, data?: unknown): MCPProtocolError {
    const defaultMessages: Record<number, string> = {
      [MCP_ERROR_CODES.PARSE_ERROR]: 'Parse error',
      [MCP_ERROR_CODES.INVALID_REQUEST]: 'Invalid request',
      [MCP_ERROR_CODES.METHOD_NOT_FOUND]: 'Method not found',
      [MCP_ERROR_CODES.INVALID_PARAMS]: 'Invalid params',
      [MCP_ERROR_CODES.INTERNAL_ERROR]: 'Internal error',
      [MCP_ERROR_CODES.INVALID_MCP_VERSION]: 'Invalid MCP version',
      [MCP_ERROR_CODES.RESOURCE_NOT_FOUND]: 'Resource not found',
      [MCP_ERROR_CODES.TOOL_NOT_FOUND]: 'Tool not found',
      [MCP_ERROR_CODES.INVALID_TOOL_INPUT]: 'Invalid tool input',
      [MCP_ERROR_CODES.TOOL_EXECUTION_ERROR]: 'Tool execution error',
      [MCP_ERROR_CODES.CONNECTION_CLOSED]: 'Connection closed',
      [MCP_ERROR_CODES.REQUEST_TIMEOUT]: 'Request timeout'
    };
    
    return new MCPProtocolError(
      code,
      message || defaultMessages[code] || 'Unknown error',
      data
    );
  }
}