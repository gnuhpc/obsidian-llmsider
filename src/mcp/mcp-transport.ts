// MCP Transport layer for WebSocket, STDIO, and Streamable HTTP connections
// Based on Model Context Protocol specification

import { MCPRequest, MCPResponse, MCPNotification, ConnectionOptions, STDIOConnectionOptions, ConnectionStatus } from '../types';
import { Logger } from './../utils/logger';
import { MCPProtocolValidator, MCPProtocolError, MCP_ERROR_CODES } from './mcp-protocol';
import { spawn, ChildProcess, execSync } from 'child_process';
import { StreamableHTTPClientTransport, StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface MCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: MCPRequest | MCPNotification): Promise<void>;
  onMessage(handler: (message: MCPResponse | MCPNotification) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
  isConnected(): boolean;
  getStatus(): ConnectionStatus;
}

// WebSocket Transport Implementation
export class WebSocketTransport implements MCPTransport {
  private ws: WebSocket | null = null;
  private messageHandler?: (message: MCPResponse | MCPNotification) => void;
  private errorHandler?: (error: Error) => void;
  private closeHandler?: () => void;
  private connectionStatus: ConnectionStatus;

  constructor(
    private url: string,
    private options: ConnectionOptions = {}
  ) {
    this.connectionStatus = {
      connected: false,
      url: url,
      connecting: false
    };
  }

  async connect(): Promise<void> {
    if (this.connectionStatus.connecting || this.connectionStatus.connected) {
      return;
    }

    this.connectionStatus.connecting = true;
    this.connectionStatus.lastError = undefined;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        const timeout = this.options.timeout || 10000;
        const timeoutId = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, timeout);

        this.ws.onopen = () => {
          clearTimeout(timeoutId);
          this.connectionStatus.connected = true;
          this.connectionStatus.connecting = false;
          Logger.debug('Connected to:', this.url);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (this.messageHandler) {
              this.messageHandler(message);
            }
          } catch (error) {
            Logger.error('Failed to parse message:', error);
            if (this.errorHandler) {
              this.errorHandler(new Error('Failed to parse incoming message'));
            }
          }
        };

        this.ws.onerror = (event) => {
          clearTimeout(timeoutId);
          this.connectionStatus.connecting = false;
          this.connectionStatus.connected = false;
          const error = new Error('WebSocket connection error');
          this.connectionStatus.lastError = error.message;
          
          if (this.errorHandler) {
            this.errorHandler(error);
          }
          
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        };

        this.ws.onclose = () => {
          clearTimeout(timeoutId);
          this.connectionStatus.connected = false;
          this.connectionStatus.connecting = false;
          Logger.debug('Connection closed');

          if (this.closeHandler) {
            this.closeHandler();
          }
        };

      } catch (error) {
        this.connectionStatus.connecting = false;
        this.connectionStatus.lastError = (error as Error).message;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }


  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionStatus.connected = false;
    this.connectionStatus.connecting = false;
  }

  async send(message: MCPRequest | MCPNotification): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    try {
      const serialized = JSON.stringify(message);
      this.ws.send(serialized);
    } catch (error) {
      throw new Error(`Failed to send message: ${(error as Error).message}`);
    }
  }

  onMessage(handler: (message: MCPResponse | MCPNotification) => void): void {
    this.messageHandler = handler;
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  isConnected(): boolean {
    return this.connectionStatus.connected;
  }

  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }
}

// STDIO Transport Implementation
export class STDIOTransport implements MCPTransport {
  private process: ChildProcess | null = null;
  private messageHandler?: (message: MCPResponse | MCPNotification) => void;
  private errorHandler?: (error: Error) => void;
  private closeHandler?: () => void;
  private connectionStatus: ConnectionStatus;
  private buffer = '';
  private stderrBuffer = '';
  private inJsonBlock = false;

  constructor(private options: STDIOConnectionOptions) {
    this.connectionStatus = {
      connected: false,
      url: null,
      command: options.command,
      connecting: false
    };
  }

  private resolveCommand(command: string): string {
    // If command is already an absolute path, return it
    if (command.startsWith('/')) {
      return command;
    }

    // Common command mappings for cross-platform compatibility
    const commandMappings: Record<string, string[]> = {
      'python': ['python3', 'python', '/usr/bin/python3', '/usr/bin/python', '/opt/homebrew/bin/python3', '/opt/homebrew/bin/python'],
      'node': ['node', '/usr/bin/node', '/opt/homebrew/bin/node'],
      'npm': ['npm', '/usr/bin/npm', '/opt/homebrew/bin/npm'],
      'npx': ['npx', '/usr/bin/npx', '/opt/homebrew/bin/npx']
    };

    const candidates = commandMappings[command] || [command];

    for (const candidate of candidates) {
      try {
        // Try to find the command using 'which'
        const fullPath = execSync(`which ${candidate}`, { encoding: 'utf8', timeout: 1000 }).trim();
        if (fullPath) {
          Logger.debug(`Resolved command '${command}' to '${fullPath}'`);
          return fullPath;
        }
      } catch (error) {
        // Command not found, try next candidate
        continue;
      }
    }

    // If no command found, return original command and let spawn handle the error
    Logger.warn(`Could not resolve command '${command}', using as-is`);
    return command;
  }

  async connect(): Promise<void> {
    if (this.connectionStatus.connecting || this.connectionStatus.connected) {
      return;
    }

    this.connectionStatus.connecting = true;
    this.connectionStatus.lastError = undefined;

    return new Promise((resolve, reject) => {
      try {
        // Resolve the command path
        const resolvedCommand = this.resolveCommand(this.options.command);
        
        // Ensure comprehensive PATH environment
        const enhancedEnv = {
          ...process.env,
          ...this.options.env,
          // Add common paths where Node.js and other tools might be installed
          PATH: [
            process.env.PATH,
            `${process.env.HOME}/.local/bin`,  // Add user's local bin directory for tools like uvx
            '/opt/homebrew/bin',
            '/usr/local/bin',
            '/usr/bin',
            '/bin'
          ].filter(Boolean).join(':'),
          // Explicitly set NODE_PATH if not set
          NODE_PATH: process.env.NODE_PATH || '/opt/homebrew/lib/node_modules'
        };

        const spawnOptions: unknown = {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: enhancedEnv,
          cwd: this.options.cwd
        };

        Logger.debug(`Spawning command: ${resolvedCommand}`);
        Logger.debug(`Args:`, this.options.args);
        Logger.debug(`Enhanced PATH:`, enhancedEnv.PATH);

        this.process = spawn(resolvedCommand, this.options.args || [], spawnOptions);

        const timeout = this.options.timeout || 10000;
        const timeoutId = setTimeout(() => {
          if (this.process && !this.connectionStatus.connected) {
            this.process.kill();
            reject(new Error('STDIO connection timeout'));
          }
        }, timeout);

        this.process?.on('spawn', () => {
          clearTimeout(timeoutId);
          this.connectionStatus.connected = true;
          this.connectionStatus.connecting = false;
          Logger.debug('Process spawned:', this.options.command);
          resolve();
        });

        this.process?.stdout?.on('data', (chunk: Buffer) => {
          this.buffer += chunk.toString();
          this.processBuffer();
        });

        this.process?.stderr?.on('data', (chunk: Buffer) => {
          const stderrText = chunk.toString();
          
          // Add to buffer for multi-line JSON detection
          this.stderrBuffer += stderrText;
          
          // Detect JSON blocks that span multiple lines
          const lines = stderrText.split('\n');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Check if entering a JSON block (starts with process ID and opening brace)
            if (/\[\d+\]\s*\{/.test(trimmedLine)) {
              this.inJsonBlock = true;
              continue;
            }
            
            // Check if exiting a JSON block (closing brace)
            if (this.inJsonBlock && /^\s*\}\s*$/.test(trimmedLine)) {
              this.inJsonBlock = false;
              continue;
            }
            
            // Skip lines that are part of a JSON block
            if (this.inJsonBlock) {
              continue;
            }
            
            // Filter out npm warnings, normal startup messages, and MCP protocol debug logs
            const ignoredPatterns = [
              /npm warn Unknown user config/,
              /This will stop working in the next major version of npm/,
              /running on stdio$/i,
              /server running/i,
              /listening on/i,
              // MCP protocol debug messages (e.g., "[85824] [Local→Remote] ping")
              /\[\d+\]\s+\[(Local|Remote)→(Local|Remote)\]/,
              // MCP request/response IDs (e.g., "req_12", "req_13")
              /^(req_|res_)\d+\s*$/,
              // MCP method names in debug output
              /^(ping|tools\/list|initialize|initialized)\s*$/,
              // MCP-remote proxy startup messages
              /Using automatically selected callback port:/,
              /Connecting to remote server:/,
              /Using transport strategy:/,
              /Connected to remote server using/,
              /Proxy established successfully/,
              /Press Ctrl\+C to exit/,
              // Notifications
              /notifications\/initialized/,
              // OAuth configuration discovery
              /Discovering OAuth server configuration/,
              // Closing braces for JSON output
              /^\s*\}\s*$/
            ];

            const shouldIgnore = ignoredPatterns.some(pattern => pattern.test(trimmedLine));

            if (!shouldIgnore && trimmedLine) {
              Logger.warn('Process stderr:', line);
            }
          }
          
          // Keep buffer size reasonable (last 1000 chars)
          if (this.stderrBuffer.length > 1000) {
            this.stderrBuffer = this.stderrBuffer.slice(-1000);
          }
        });

        this.process?.on('error', (error) => {
          clearTimeout(timeoutId);
          this.connectionStatus.connecting = false;
          this.connectionStatus.connected = false;
          this.connectionStatus.lastError = error.message;
          
          if (this.errorHandler) {
            this.errorHandler(error);
          }
          
          if (!this.connectionStatus.connected) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });

        this.process?.on('exit', (code, signal) => {
          clearTimeout(timeoutId);
          this.connectionStatus.connected = false;
          this.connectionStatus.connecting = false;
          Logger.debug('Process exited with code:', code, 'signal:', signal);
          
          if (this.closeHandler) {
            this.closeHandler();
          }
        });

      } catch (error) {
        this.connectionStatus.connecting = false;
        this.connectionStatus.lastError = (error as Error).message;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep the incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          if (this.messageHandler) {
            this.messageHandler(message);
          }
        } catch (error) {
          Logger.error('Failed to parse JSON:', line, error);
          if (this.errorHandler) {
            this.errorHandler(new Error('Failed to parse incoming message'));
          }
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connectionStatus.connected = false;
    this.connectionStatus.connecting = false;
  }

  async send(message: MCPRequest | MCPNotification): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('STDIO process not connected');
    }

    try {
      const serialized = JSON.stringify(message) + '\n';
      this.process.stdin.write(serialized);
    } catch (error) {
      throw new Error(`Failed to send message: ${(error as Error).message}`);
    }
  }

  onMessage(handler: (message: MCPResponse | MCPNotification) => void): void {
    this.messageHandler = handler;
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  isConnected(): boolean {
    return this.connectionStatus.connected;
  }

  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }
}

// Streamable HTTP Transport Implementation
export class StreamableHTTPTransport implements MCPTransport {
  private transport: StreamableHTTPClientTransport;
  private messageHandler?: (message: MCPResponse | MCPNotification) => void;
  private errorHandler?: (error: Error) => void;
  private closeHandler?: () => void;
  private connectionStatus: ConnectionStatus;
  private url: URL;

  constructor(
    url: string,
    private options: StreamableHTTPClientTransportOptions = {}
  ) {
    // Fix URL encoding issues - ensure proper URL format
    const cleanUrl = this.sanitizeUrl(url);
    this.url = new URL(cleanUrl);

    // Use standard configuration with CORS-aware fetch fallback
    const enhancedOptions: StreamableHTTPClientTransportOptions = {
      ...this.options,
      // Only add fetch override if needed for CORS handling
      fetch: this.createCORSAwareFetch()
    };

    this.transport = new StreamableHTTPClientTransport(this.url, enhancedOptions);

    this.connectionStatus = {
      connected: false,
      url: url,
      connecting: false
    };
  }

  private sanitizeUrl(url: string): string {
    // Fix common URL encoding issues
    let cleanUrl = url;

    // Replace UTF-8 encoded question mark with regular question mark
    cleanUrl = cleanUrl.replace(/%EF%BC%9F/g, '?');
    // Fix other common UTF-8 encoded characters
    cleanUrl = cleanUrl.replace(/%EF%BC%88/g, '(');
    cleanUrl = cleanUrl.replace(/%EF%BC%89/g, ')');

    // Replace Chinese question mark with regular question mark
    cleanUrl = cleanUrl.replace(/？/g, '?');

    // Handle remaining percent encoding safely
    try {
      // Only decode standard percent-encoded characters, not UTF-8 fullwidth
      if (cleanUrl.includes('%') && !cleanUrl.includes('%EF%')) {
        cleanUrl = decodeURIComponent(cleanUrl);
      }
    } catch (error) {
      Logger.warn(`URL decode warning:`, error);
    }

    // Ensure proper protocol - enforce HTTPS only for security
    if (!/^https?:\/\//.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    // Enforce HTTPS - reject HTTP connections for security, except for localhost/127.0.0.1
    if (cleanUrl.startsWith('http://')) {
      const url = new URL(cleanUrl);
      const isLocalhost = url.hostname === 'localhost' ||
                         url.hostname === '127.0.0.1' ||
                         url.hostname.startsWith('192.168.') ||
                         url.hostname.startsWith('10.') ||
                         url.hostname.startsWith('172.');

      if (!isLocalhost) {
        throw new Error(`不安全的HTTP连接被拒绝: ${cleanUrl} - 仅支持HTTPS连接以确保安全性`);
      }
      // For localhost/local network, allow HTTP but warn
      Logger.warn(`Allowing HTTP for local development: ${cleanUrl}`);
    }

    Logger.debug(`Sanitized URL: ${url} -> ${cleanUrl}`);
    return cleanUrl;
  }

  private createCORSAwareFetch() {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      Logger.debug(`Using Obsidian requestUrl for: ${url}`);

      try {
        // Extract headers
        const headers: Record<string, string> = {};
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((value, key) => {
              headers[key] = value;
            });
          } else if (typeof init.headers === 'object') {
            Object.entries(init.headers).forEach(([key, value]) => {
              if (typeof value === 'string') {
                headers[key] = value;
              }
            });
          }
        }

        // Ensure required Accept header for MCP streamable HTTP servers
        // Some MCP servers (like AMAP) require both application/json and text/event-stream
        if (!headers['Accept'] && !headers['accept']) {
          headers['Accept'] = 'application/json, text/event-stream';
        }

        // Validate HTTPS requirement before making request, except for localhost
        if (!url.startsWith('https://')) {
          const urlObj = new URL(url);
          const isLocalhost = urlObj.hostname === 'localhost' ||
                             urlObj.hostname === '127.0.0.1' ||
                             urlObj.hostname.startsWith('192.168.') ||
                             urlObj.hostname.startsWith('10.') ||
                             urlObj.hostname.startsWith('172.');

          if (!isLocalhost) {
            throw new Error(`不安全的连接被拒绝: ${url} - 仅支持HTTPS连接`);
          }
        }

        // Use Obsidian's requestUrl directly with strict SSL validation
        // @ts-ignore - Obsidian API
        const response = await window.requestUrl({
          url: url,
          method: init?.method || 'GET',
          headers: headers,
          body: typeof init?.body === 'string' ? init.body : undefined,
          throw: false
        });

        // Convert to fetch Response format
        const fetchResponse = {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.status.toString(),
          headers: new Headers(response.headers || {}),
          text: async () => response.text || '',
          json: async () => {
            try {
              return response.json || JSON.parse(response.text || '{}');
            } catch {
              return {};
            }
          },
          body: response.text ? new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(response.text));
              controller.close();
            }
          }) : null
        } as Response;

        return fetchResponse;
      } catch (error) {
        Logger.error(`Obsidian requestUrl failed:`, error);
        throw error;
      }
    };
  }


  async connect(): Promise<void> {
    if (this.connectionStatus.connecting || this.connectionStatus.connected) {
      return;
    }

    this.connectionStatus.connecting = true;
    this.connectionStatus.lastError = undefined;

    // Set up event handlers before connection
    this.transport.onmessage = (message) => {
      if (this.messageHandler) {
        this.messageHandler(message as MCPResponse | MCPNotification);
      }
    };

    this.transport.onerror = (error) => {
      Logger.error(`Transport error:`, error);
      this.connectionStatus.connected = false;
      this.connectionStatus.connecting = false;

      // Enhance error message based on error type
      let enhancedError = error;
      if (error.message.includes('Failed to fetch')) {
        enhancedError = new Error(`连接失败: ${this.url.toString()} - 可能是SSL证书问题、CORS限制或服务器不可用`);
      }

      this.connectionStatus.lastError = enhancedError.message;
      if (this.errorHandler) {
        this.errorHandler(enhancedError);
      }
    };

    this.transport.onclose = () => {
      Logger.debug(`Connection closed: ${this.url.toString()}`);
      this.connectionStatus.connected = false;
      this.connectionStatus.connecting = false;
      if (this.closeHandler) {
        this.closeHandler();
      }
    };

    try {
      Logger.debug(`Starting connection to: ${this.url.toString()}`);

      // Simply resolve the connection - the actual connection will be established
      // when the first request is sent, following the streamable HTTP pattern
      this.connectionStatus.connected = true;
      this.connectionStatus.connecting = false;
      Logger.debug('Connected to:', this.url.toString());

    } catch (error) {
      this.connectionStatus.connecting = false;
      this.connectionStatus.connected = false;
      this.connectionStatus.lastError = (error as Error).message;

      // Enhanced error logging with debugging info
      Logger.error('Connection failed:', {
        url: this.url.toString(),
        error: error,
        options: this.options
      });

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.transport.close();
    } catch (error) {
      Logger.error('Error during disconnect:', error);
    }
    this.connectionStatus.connected = false;
    this.connectionStatus.connecting = false;
  }

  async send(message: MCPRequest | MCPNotification): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('StreamableHTTP transport not connected');
    }

    try {
      // The actual connection is established here when the first request is sent
      await this.transport.send(message as unknown);
    } catch (error) {
      // Handle connection errors that occur during send
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('SSL') || error.message.includes('PROTOCOL_ERROR')) {
          this.connectionStatus.connected = false;
          const enhancedError = new Error(`发送消息失败: ${this.url.toString()} - SSL证书问题或服务器不可用。请检查URL是否正确和SSL证书配置`);
          this.connectionStatus.lastError = enhancedError.message;
          if (this.errorHandler) {
            this.errorHandler(enhancedError);
          }
          throw enhancedError;
        }
      }
      throw new Error(`Failed to send message: ${(error as Error).message}`);
    }
  }

  onMessage(handler: (message: MCPResponse | MCPNotification) => void): void {
    this.messageHandler = handler;
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  isConnected(): boolean {
    return this.connectionStatus.connected;
  }

  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  get sessionId(): string | undefined {
    return this.transport.sessionId;
  }

  async terminateSession(): Promise<void> {
    await this.transport.terminateSession();
  }
}

// Transport factory
export class MCPTransportFactory {
  static createWebSocket(url: string, options?: ConnectionOptions): WebSocketTransport {
    return new WebSocketTransport(url, options);
  }

  static createSTDIO(options: STDIOConnectionOptions): STDIOTransport {
    return new STDIOTransport(options);
  }

  static createStreamableHTTP(url: string, options?: StreamableHTTPClientTransportOptions): StreamableHTTPTransport {
    return new StreamableHTTPTransport(url, options);
  }

  static validateWebSocketUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow secure WebSocket connections
      return parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  static validateStreamableHTTPUrl(url: string): boolean {
    try {
      const parsed = new URL(url);

      // Allow HTTPS for all connections
      if (parsed.protocol === 'https:') {
        return true;
      }

      // Allow HTTP for localhost and local network addresses
      if (parsed.protocol === 'http:') {
        const isLocalhost = parsed.hostname === 'localhost' ||
                           parsed.hostname === '127.0.0.1' ||
                           parsed.hostname.startsWith('192.168.') ||
                           parsed.hostname.startsWith('10.') ||
                           parsed.hostname.startsWith('172.');

        if (isLocalhost) {
          Logger.warn(`Allowing HTTP for local development: ${url}`);
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}