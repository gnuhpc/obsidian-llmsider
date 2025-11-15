import { ChatMessage, ToolCallRecord, ToolCallExecution } from '../types';
import { Logger } from './../utils/logger';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';

export class ToolExecutionManager {
	private plugin: LLMSiderPlugin;
	private messageContainer: HTMLElement;
	private i18n: I18nManager;
	// Tool call records storage for enhanced logging
	private toolCallRecords: Map<string, ToolCallRecord> = new Map();
	private currentToolCallBatch: string[] = []; // Track current batch of tool calls
	// Tool execution queue to ensure sequential processing
	private toolExecutionQueue: Array<() => Promise<void>> = [];
	private isProcessingQueue: boolean = false;

	constructor(plugin: LLMSiderPlugin, messageContainer: HTMLElement) {
		this.plugin = plugin;
		this.messageContainer = messageContainer;
		this.i18n = plugin.getI18nManager()!; // Get i18n instance from plugin
	}

	/**
	 * Add a tool execution task to the queue for sequential processing
	 */
	private async enqueueToolExecution(task: () => Promise<void>): Promise<void> {
		return new Promise((resolve, reject) => {
			this.toolExecutionQueue.push(async () => {
				try {
					await task();
					resolve();
				} catch (error) {
					reject(error);
				}
			});
			this.processQueue();
		});
	}

	/**
	 * Process the tool execution queue sequentially
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessingQueue || this.toolExecutionQueue.length === 0) {
			return;
		}

		this.isProcessingQueue = true;

		try {
			while (this.toolExecutionQueue.length > 0) {
				const task = this.toolExecutionQueue.shift();
				if (task) {
					Logger.debug(`Processing queued task. Remaining: ${this.toolExecutionQueue.length}`);
					await task();
				}
			}
		} finally {
			this.isProcessingQueue = false;
		}
	}

	/**
	 * Record a tool call request with comprehensive logging
	 */
	recordToolCallRequest(
		toolName: string,
		parameters: any,
		server?: string,
		messageId?: string,
		source: 'user' | 'system' | 'auto' = 'user'
	): string {
		const recordId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const toolCallRecord: ToolCallRecord = {
			id: recordId,
			toolName,
			server,
			request: {
				method: toolName,
				parameters,
				timestamp: Date.now(),
				messageId,
				source
			},
			status: 'pending',
			displayData: {
				phase: 'detection',
				message: `检测到工具调用: ${toolName}`,
				icon: '🔧'
			}
		};

		this.toolCallRecords.set(recordId, toolCallRecord);
		this.currentToolCallBatch.push(recordId);

		Logger.debug(`Recorded tool call request:`, {
			id: recordId,
			toolName,
			parameters,
			server,
			source,
			timestamp: new Date().toISOString()
		});

		// Update UI to show tool detection
		this.updateToolExecutionIndicator(recordId);

		return recordId;
	}

	/**
	 * Record a tool call response with comprehensive logging
	 */
	recordToolCallResponse(
		recordId: string,
		result: any,
		error?: any,
		statusCode?: number,
		metadata?: any
	): void {
		const record = this.toolCallRecords.get(recordId);
		if (!record) {
			Logger.warn(`Tool call record not found: ${recordId}`);
			return;
		}

		const executionTime = Date.now() - record.request.timestamp;
		const responseTimestamp = Date.now();

		record.response = {
			result,
			error,
			timestamp: responseTimestamp,
			executionTime,
			statusCode,
			metadata
		};

		record.status = error ? 'failed' : 'completed';

		// Update display data
		record.displayData = {
			phase: error ? 'failed' : 'completed',
			message: error ?
				`工具调用失败: ${record.toolName} - ${error}` :
				`工具调用完成: ${record.toolName}`,
			icon: error ? '❌' : '✅'
		};

		Logger.debug(`Recorded tool call response:`, {
			id: recordId,
			toolName: record.toolName,
			success: !error,
			executionTime,
			result: result ? 'Present' : 'None',
			error: error || 'None',
			timestamp: new Date(responseTimestamp).toISOString()
		});

		// Update UI to show completion/failure
		this.updateToolExecutionIndicator(recordId);
	}

	/**
	 * Mark a tool call as executing (in progress)
	 */
	markToolCallExecuting(recordId: string, progressPercent?: number): void {
		const record = this.toolCallRecords.get(recordId);
		if (!record) return;

		record.status = 'running';
		record.displayData = {
			phase: 'executing',
			message: `正在执行: ${record.toolName}`,
			icon: '⚙️',
			progress: progressPercent ? {
				current: Math.floor(progressPercent),
				total: 100
			} : undefined
		};

		Logger.debug(`Tool call executing:`, {
			id: recordId,
			toolName: record.toolName,
			progress: progressPercent,
			timestamp: new Date().toISOString()
		});

		this.updateToolExecutionIndicator(recordId);
	}

	/**
	 * Get all tool call records for a specific message
	 */
	getToolCallRecordsForMessage(messageId: string): ToolCallRecord[] {
		return Array.from(this.toolCallRecords.values())
			.filter(record => record.request.messageId === messageId);
	}

	/**
	 * Get a specific tool call record
	 */
	getToolCallRecord(recordId: string): ToolCallRecord | undefined {
		return this.toolCallRecords.get(recordId);
	}

	/**
	 * Clear tool call records (cleanup)
	 */
	clearToolCallRecords(olderThan?: number): void {
		const cutoffTime = olderThan || (Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

		for (const [recordId, record] of this.toolCallRecords.entries()) {
			if (record.request.timestamp < cutoffTime) {
				this.toolCallRecords.delete(recordId);
			}
		}

		Logger.debug(`Cleared tool call records older than ${new Date(cutoffTime).toISOString()}`);
	}

	/**
	 * Update the UI tool execution indicator - simplified to avoid duplicate displays
	 */
	private updateToolExecutionIndicator(recordId: string): void {
		const record = this.toolCallRecords.get(recordId);
		if (!record || !record.displayData) return;

		// Only update the unified indicator if it exists, don't create individual ones
		const indicator = this.messageContainer.querySelector('.llmsider-unified-tool-indicator') as HTMLElement;
		if (!indicator) {
			// If no unified indicator exists, don't create individual ones to avoid duplicates
			return;
		}

		// Log the update for debugging purposes
		Logger.debug(`Updated tool execution indicator for ${record.toolName}:`, {
			phase: record.displayData.phase,
			status: record.status,
			timestamp: new Date().toISOString()
		});
	}

	/**
	 * Parse XML-style MCP tool calls from message content
	 */
	parseXMLToolCalls(messageContent: string): Array<{tool: string, parameters: any}> {
		const toolCalls: Array<{tool: string, parameters: any}> = [];

		Logger.debug('Parsing XML tool calls from content');

		// Strategy 1: Parse MCP wrapper format: <use_mcp_tool><tool_name>...</tool_name>...</use_mcp_tool>
		const xmlToolRegex = /<use_mcp_tool>([\s\S]*?)<\/use_mcp_tool>/g;
		let xmlMatch;

		while ((xmlMatch = xmlToolRegex.exec(messageContent)) !== null) {
			const toolContent = xmlMatch[1];
			Logger.debug('Found MCP wrapper tool block:', toolContent);

			// Extract tool name
			const toolNameMatch = toolContent.match(/<tool_name>(.*?)<\/tool_name>/);
			if (!toolNameMatch) {
				Logger.debug('No tool_name found in MCP wrapper block');
				continue;
			}

			const toolName = toolNameMatch[1].trim();
			Logger.debug('Extracted tool name from wrapper:', toolName);

			// Extract parameters from remaining content
			let parameters: any = {};

			// Strategy 1: Look for <arguments> tags first (preferred format)
			const argumentsMatch = toolContent.match(/<arguments>([\s\S]*?)<\/arguments>/);
			if (argumentsMatch) {
				try {
					const argumentsContent = argumentsMatch[1].trim();
					parameters = JSON.parse(argumentsContent);
					Logger.debug('Successfully parsed arguments from <arguments> tag:', parameters);
				} catch (jsonError) {
					Logger.debug('Failed to parse arguments as JSON:', jsonError);
					// If JSON parsing fails, treat as simple text
					parameters = { input: argumentsMatch[1].trim() };
				}
			} else {
				// Strategy 2: Fallback to old parsing methods
				const remainingContent = toolContent
					.replace(/<tool_name>.*?<\/tool_name>/, '')
					.trim();

				Logger.debug('No <arguments> tag found, using fallback parsing for:', remainingContent);

				if (remainingContent) {
					// Try to parse as JSON if it looks like JSON
					if (remainingContent.startsWith('{') && remainingContent.endsWith('}')) {
						try {
							parameters = JSON.parse(remainingContent);
							Logger.debug('Successfully parsed remaining content as JSON:', parameters);
						} catch (jsonError) {
							Logger.debug('Failed to parse as JSON, treating as text:', jsonError);
							// If JSON parsing fails, treat as simple text
							parameters = { input: remainingContent };
						}
					}
					// Look for explicit <parameters> tags
					else {
						const paramMatch = remainingContent.match(/<parameters>([\s\S]*?)<\/parameters>/);
						if (paramMatch) {
							try {
								parameters = JSON.parse(paramMatch[1].trim());
								Logger.debug('Parsed parameters from <parameters> tags:', parameters);
							} catch {
								// If not JSON, treat as simple text parameter
								parameters = { input: paramMatch[1].trim() };
								Logger.debug('Using parameters as text input:', parameters);
							}
						}
						// Parse as simple key-value pairs or plain text
						else {
							// Check if it's a simple state code (2 uppercase letters)
							if (remainingContent.length === 2 && /^[A-Z]{2}$/.test(remainingContent)) {
								parameters = { state: remainingContent };
								Logger.debug('Parsed as state code:', parameters);
							}
							// Check if it looks like key=value pairs
							else if (remainingContent.includes('=')) {
								const pairs = remainingContent.split(/\s+/);
								pairs.forEach(pair => {
									const [key, value] = pair.split('=', 2);
									if (key && value) {
										parameters[key.trim()] = value.trim();
									}
								});
								Logger.debug('Parsed as key-value pairs:', parameters);
							}
							// Otherwise, treat as generic input
							else {
								parameters = { input: remainingContent };
								Logger.debug('Using as generic input:', parameters);
							}
						}
					}
				} else {
					Logger.debug('No parameters found, using empty object');
				}
			}

			const toolCall = {
				tool: toolName,
				parameters
			};

			Logger.debug('Created tool call from wrapper:', toolCall);
			toolCalls.push(toolCall);
		}

		// Strategy 2: Parse direct tool format: <tool-name>parameters</tool-name>
		// Get list of available tools first to know what to look for
		const mcpManager = this.plugin.getMCPManager();
		if (mcpManager) {
			try {
				const availableTools = mcpManager.getAllAvailableTools();
				Logger.debug('Available tools for direct parsing:', availableTools.map(t => t.name));

				// Look for direct tool calls using available tool names
				for (const tool of availableTools) {
					const toolName = tool.name;
					// Create regex to match <toolname>content</toolname>
					const directToolRegex = new RegExp(`<${toolName.replace(/[-_]/g, '[-_]')}>(.*?)<\\/${toolName.replace(/[-_]/g, '[-_]')}>`, 'g');
					let directMatch;

					while ((directMatch = directToolRegex.exec(messageContent)) !== null) {
						const toolContent = directMatch[1].trim();
						Logger.debug(`Found direct tool call for ${toolName}:`, toolContent);

						let parameters: any = {};

						// Parse the content inside the tool tags
						if (toolContent) {
							// Try to parse XML parameters within the tool content
							const xmlParamPattern = /<(\w+)>(.*?)<\/\1>/g;
							let paramMatch;

							while ((paramMatch = xmlParamPattern.exec(toolContent)) !== null) {
								const paramName = paramMatch[1];
								const paramValue = paramMatch[2].trim();
								parameters[paramName] = paramValue;
								Logger.debug(`Extracted parameter ${paramName}:`, paramValue);
							}

							// If no XML parameters found, treat as simple text
							if (Object.keys(parameters).length === 0) {
								// Check if it's a simple state code (2 uppercase letters)
								if (toolContent.length === 2 && /^[A-Z]{2}$/.test(toolContent)) {
									parameters = { state: toolContent };
									Logger.debug('Parsed direct tool as state code:', parameters);
								} else {
									parameters = { input: toolContent };
									Logger.debug('Parsed direct tool as input:', parameters);
								}
							}
						}

						const toolCall = {
							tool: toolName,
							parameters
						};

						Logger.debug('Created direct tool call:', toolCall);
						toolCalls.push(toolCall);
					}
				}
			} catch (error) {
				Logger.warn('Failed to get available tools for direct parsing:', error);
			}
		}

		Logger.debug('Total XML tool calls parsed:', toolCalls.length);
		return toolCalls;
	}

	/**
	 * Convert tool calls in user message to natural language requests
	 */
	/**
	 * Clean tool call XML from message content, leaving only the meaningful text
	 */
	cleanToolCallsFromContent(content: string): string {
		if (!content || typeof content !== 'string') {
			return content;
		}

		let cleanedContent = content;

		// Remove MCP wrapper format tool calls
		cleanedContent = cleanedContent.replace(/<use_mcp_tool>[\s\S]*?<\/use_mcp_tool>/g, '');

		// Remove direct tool format calls (using available tool names)
		const mcpManager = this.plugin.getMCPManager();
		if (mcpManager) {
			try {
				const availableTools = mcpManager.getAllAvailableTools();
				for (const tool of availableTools) {
					const toolName = tool.name;
					const directToolRegex = new RegExp(`<${toolName.replace(/[-_]/g, '[-_]')}>.*?<\\/${toolName.replace(/[-_]/g, '[-_]')}>`, 'g');
					cleanedContent = cleanedContent.replace(directToolRegex, '');
				}
			} catch (error) {
				Logger.warn('Failed to get available tools for content cleaning:', error);
			}
		}

		// Remove empty lines and trim
		cleanedContent = cleanedContent
			.split('\n')
			.filter(line => line.trim() !== '')
			.join('\n')
			.trim();

		// If content is empty after cleaning, provide a default message
		if (!cleanedContent) {
			cleanedContent = this.i18n.t('common.processingRequest');
		}

		return cleanedContent;
	}

	/**
	 * Check if response content contains indications that tools should be called
	 */
	containsToolCallIndications(content: string): boolean {
		if (!content || typeof content !== 'string') {
			return false;
		}

		// Look for common patterns that indicate the AI wants to use tools
		const toolIndicators = [
			// Direct mentions of tool usage
			/I'll use the .* tool/i,
			/Let me use .*/i,
			/I need to .* (tool|function)/i,

			// XML-style MCP tool call syntax
			/<use_mcp_tool>/i,
			/<tool_name>.*<\/tool_name>/i,
			/<\/use_mcp_tool>/i,

			// JSON blocks that might contain tool calls
			/```json[\s\S]*?"tool"[\s\S]*?```/i,

			// Tool call syntax patterns
			/\{[\s\S]*?"tool"[\s\S]*?"parameters"[\s\S]*?\}/i,

			// Common tool-calling phrases
			/I'll (check|search|get|find|read|write|create)/i,
			/Let me (check|search|get|find|read|write|create)/i,
			/I need to (check|search|get|find|read|write|create)/i,
		];

		return toolIndicators.some(pattern => pattern.test(content));
	}

	/**
	 * Process native tool calls from provider responses
	 */
	async processNativeToolCalls(response: any): Promise<void> {
		try {
			const mcpManager = this.plugin.getMCPManager();
			if (!mcpManager) {
				Logger.debug('MCP Manager not available, skipping native tool processing');
				return;
			}

			// Check if response contains tool calls
			let toolCalls: any[] = [];

			// If response is a direct LLMResponse with toolCalls
			if (response && response.toolCalls && Array.isArray(response.toolCalls)) {
				toolCalls = response.toolCalls;
			}
			// If response is streaming result, check for accumulated tool calls
			else if (response && response.content && typeof response.content === 'string') {
				// Try to parse tool calls from final response content if provider doesn't support native tool calls
				return; // Let processMCPToolCalls handle this case
			}

			if (toolCalls.length === 0) {
				Logger.debug('No native tool calls found in response');
				return;
			}

			Logger.debug(`Processing ${toolCalls.length} native tool calls:`, toolCalls);

			// Get available tools using unified tool manager
			let availableTools;
			try {
				const toolManager = this.plugin.getToolManager();
				if (toolManager) {
					availableTools = await toolManager.getAllTools();
				} else {
					Logger.error('Tool manager not available');
					this.addMCPErrorMessage('Tool manager not initialized');
					return;
				}
			} catch (error) {
				Logger.error('Failed to get tools for native processing:', error);
				this.addMCPErrorMessage(`Failed to access tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
				return;
			}

			// Find the current assistant message in the UI and modify its content
			const currentAssistantMessage = this.findLatestAssistantMessage();

			// Replace the assistant message content with tool execution indicator
			if (currentAssistantMessage) {
				this.replaceMessageWithToolExecution(currentAssistantMessage, toolCalls.length);
			}

			// Execute each tool call
			for (const [index, toolCall] of toolCalls.entries()) {
				if (toolCall.type === 'function' && toolCall.function) {
					const toolName = toolCall.function.name;
					let parameters: any = {};

					try {
						// Parse arguments if they're a JSON string
						if (typeof toolCall.function.arguments === 'string') {
							parameters = JSON.parse(toolCall.function.arguments);
						} else {
							parameters = toolCall.function.arguments || {};
						}
					} catch (parseError) {
						Logger.error(`Failed to parse tool arguments for ${toolName}:`, parseError);
						this.addMCPErrorMessage(`Failed to parse arguments for tool "${toolName}"`);
						continue;
					}

					// Find the tool in available MCP tools
					const tool = availableTools.find(t => t.name.toLowerCase() === toolName.toLowerCase());

					if (tool) {
						Logger.debug(`Executing native MCP tool: ${toolName} with parameters:`, parameters);

						try {
							await this.executeMCPToolWithProgress(tool, parameters, index + 1, toolCalls.length);
						} catch (error) {
							Logger.error(`Error executing native tool ${toolName}:`, error);
							this.addMCPErrorMessage(`Tool "${toolName}" failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
						}
					} else {
						Logger.warn(`Requested native tool "${toolName}" not found in available MCP tools`);
						this.addMCPErrorMessage(`Tool "${toolName}" is not available or not connected`);
					}
				}
			}

		} catch (error) {
			Logger.error('Error processing native tool calls:', error);
			this.addMCPErrorMessage(`Native tool processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Find the latest assistant message element in the UI
	 */
	private findLatestAssistantMessage(): HTMLElement | null {
		const assistantMessages = this.messageContainer.querySelectorAll('.llmsider-message[data-role="assistant"]');
		if (assistantMessages.length === 0) {
			return null;
		}
		return assistantMessages[assistantMessages.length - 1] as HTMLElement;
	}

	/**
	 * Replace assistant message content with tool execution indicator
	 */
	private replaceMessageWithToolExecution(messageElement: HTMLElement, toolCount: number): void {
		const contentEl = messageElement.querySelector('.llmsider-message-content');
		if (contentEl) {
			contentEl.innerHTML = `
				<div class="mcp-tool-execution-container">
					<div class="mcp-tool-execution-header">
						<span class="mcp-tool-icon">🛠️</span>
						<span class="mcp-tool-text">正在执行 ${toolCount} 个工具${toolCount > 1 ? '' : ''}...</span>
						<div class="mcp-tool-spinner"></div>
					</div>
					<div class="mcp-tool-progress">
						<div class="mcp-tool-progress-bar">
							<div class="mcp-tool-progress-fill" style="width: 0%"></div>
						</div>
					</div>
					<div class="mcp-tool-results"></div>
				</div>
			`;
		}
	}

	/**
	 * Execute MCP tool with progress feedback and comprehensive logging
	 */
	async executeMCPToolWithProgress(tool: any, parameters: any, currentIndex: number, totalCount: number, messageId?: string): Promise<void> {
		const mcpManager = this.plugin.getMCPManager();
		if (!mcpManager) {
			throw new Error('MCP Manager not available');
		}

		// Record the tool call request
		const recordId = this.recordToolCallRequest(
			tool.name,
			parameters,
			tool.server,
			messageId,
			'system'
		);

		// Find the tool execution container
		const executionContainer = this.messageContainer.querySelector('.mcp-tool-execution-container');
		const progressFill = executionContainer?.querySelector('.mcp-tool-progress-fill') as HTMLElement;
		const resultsContainer = executionContainer?.querySelector('.mcp-tool-results') as HTMLElement;
		const headerText = executionContainer?.querySelector('.mcp-tool-text') as HTMLElement;

		// Create tool execution record for persistence (legacy compatibility)
		const toolExecution: any = {
			id: recordId,
			toolName: tool.name,
			server: tool.server,
			parameters: parameters,
			status: 'running' as const,
			timestamp: Date.now()
		};

		// Store the tool execution in the current assistant message
		this.addToolExecutionToCurrentMessage(toolExecution);

		try {
			// Mark as executing and update progress
			const progressPercent = ((currentIndex - 1) / totalCount) * 100;
			this.markToolCallExecuting(recordId, progressPercent);

			if (progressFill) {
				progressFill.style.width = `${progressPercent}%`;
			}

			// Update header text
			if (headerText) {
				headerText.textContent = `正在执行工具 ${currentIndex}/${totalCount}: ${tool.name}`;
			}

			// Add tool start indicator
			if (resultsContainer) {
				const toolStartEl = document.createElement('div');
				toolStartEl.className = 'mcp-tool-result-item mcp-tool-executing';
				toolStartEl.innerHTML = `
					<div class="mcp-tool-result-header">
						<span class="mcp-tool-name">${tool.name}</span>
						<span class="mcp-tool-server">(${tool.server})</span>
						<span class="mcp-tool-status">正在执行...</span>
					</div>
				`;
				resultsContainer.appendChild(toolStartEl);
			}

			// Execute the tool using unified tool manager
			const startTime = Date.now();
			const toolManager = this.plugin.getToolManager();
			if (!toolManager) {
				throw new Error('Tool manager not available');
			}

			const result = await toolManager.executeTool(tool.name, parameters);
			const executionTime = Date.now() - startTime;

			// Check if the tool execution was successful
			if (!result.success) {
				// Handle tool execution failure
				const errorMessage = result.error || 'Tool execution failed';

				// Record the error response
				this.recordToolCallResponse(recordId, null, errorMessage, 500, {
					executionTime,
					server: tool.server,
					errorType: 'tool_execution_failed'
				});

				// Update tool execution record with failure
				toolExecution.status = 'failed';
				toolExecution.error = errorMessage;
				toolExecution.executionTime = executionTime;
				this.updateToolExecutionInCurrentMessage(toolExecution);

				throw new Error(errorMessage);
			}

			// Record the successful response
			this.recordToolCallResponse(recordId, result.result, null, 200, {
				executionTime,
				server: tool.server,
				resultType: typeof result.result
			});

			// Update tool execution record with success (legacy compatibility)
			toolExecution.status = 'completed';
			toolExecution.result = result.result;
			toolExecution.executionTime = executionTime;
			this.updateToolExecutionInCurrentMessage(toolExecution);

			// Update the tool result
			if (resultsContainer) {
				const toolEl = resultsContainer.querySelector('.mcp-tool-executing');
				if (toolEl) {
					toolEl.classList.remove('mcp-tool-executing');
					toolEl.classList.add('mcp-tool-completed');

					// Format result content
					let resultContent = '';
					if (result.result) {
						if (Array.isArray(result.result)) {
							resultContent = result.result.map(item => {
								if (item.type === 'text') {
									return item.text;
								} else if (item.type === 'resource') {
									return `Resource: ${item.resource?.uri || 'Unknown'}`;
								}
								return JSON.stringify(item);
							}).join('\n');
						} else {
							resultContent = JSON.stringify(result.result, null, 2);
						}
					} else {
						resultContent = 'Tool executed successfully (no content returned)';
					}

					// Update the tool result display
					toolEl.innerHTML = `
						<div class="mcp-tool-result-header">
							<span class="mcp-tool-name">${tool.name}</span>
							<span class="mcp-tool-server">(${tool.server})</span>
							<span class="mcp-tool-status mcp-tool-success">✅ 已完成</span>
						</div>
						<div class="mcp-tool-result-content">
							<pre>${resultContent}</pre>
						</div>
					`;
				}
			}

			// Update progress
			if (progressFill) {
				const finalProgressPercent = (currentIndex / totalCount) * 100;
				progressFill.style.width = `${finalProgressPercent}%`;
			}

			// Update header if this is the last tool
			if (currentIndex === totalCount && headerText) {
				headerText.textContent = `已完成 ${totalCount} 个工具${totalCount > 1 ? '' : ''}`;

				// Remove spinner
				const spinner = executionContainer?.querySelector('.mcp-tool-spinner');
				if (spinner) {
					spinner.remove();
				}
			}

		} catch (error) {
			// Record the error response
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.recordToolCallResponse(recordId, null, errorMessage, 500, {
				executionTime: Date.now() - toolExecution.timestamp,
				server: tool.server,
				errorType: typeof error
			});

			// Update tool execution record with failure (legacy compatibility)
			toolExecution.status = 'failed';
			toolExecution.error = errorMessage;
			toolExecution.executionTime = Date.now() - toolExecution.timestamp;
			this.updateToolExecutionInCurrentMessage(toolExecution);

			// Enhanced error handling with better user feedback
			let displayErrorMessage = 'Unknown error';
			let errorCategory = 'general';

			if (error instanceof Error) {
				displayErrorMessage = error.message;

				// Categorize common error types
				if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('timeout')) {
					errorCategory = 'network';
					displayErrorMessage = this.plugin.getI18nManager()!.t('mcp.networkConnectionFailed');
				} else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
					errorCategory = 'permission';
					displayErrorMessage = this.plugin.getI18nManager()!.t('mcp.permissionDenied');
				} else if (errorMessage.includes('invalid') || errorMessage.includes('parameter')) {
					errorCategory = 'parameter';
					displayErrorMessage = this.plugin.getI18nManager()!.t('mcp.parameterError', { error: errorMessage });
				}
			}

			// Update the tool result with enhanced error info
			if (resultsContainer) {
				const toolEl = resultsContainer.querySelector('.mcp-tool-executing');
				if (toolEl) {
					toolEl.classList.remove('mcp-tool-executing');
					toolEl.classList.add('mcp-tool-failed');
					toolEl.classList.add(`mcp-error-${errorCategory}`);

					let helpText = '';
					switch (errorCategory) {
						case 'network':
							helpText = `<div class="mcp-help-text">${this.plugin.getI18nManager()!.t('mcp.helpNetworkCheck')}</div>`;
							break;
						case 'permission':
							helpText = `<div class="mcp-help-text">${this.plugin.getI18nManager()!.t('mcp.helpPermissionCheck')}</div>`;
							break;
						case 'parameter':
							helpText = `<div class="mcp-help-text">${this.plugin.getI18nManager()!.t('mcp.helpParameterCheck')}</div>`;
							break;
						default:
							helpText = `<div class="mcp-help-text">${this.plugin.getI18nManager()!.t('mcp.helpGeneral')}</div>`;
							break;
					}

					toolEl.innerHTML = `
						<div class="mcp-tool-result-header">
							<span class="mcp-tool-name">${tool.name}</span>
							<span class="mcp-tool-server">(${tool.server})</span>
							<span class="mcp-tool-status mcp-tool-error">❌ 执行失败</span>
						</div>
						<div class="mcp-tool-result-content mcp-tool-error-content">
							<pre>${displayErrorMessage}</pre>
							${helpText}
						</div>
					`;
				}
			}

			// Update header text with error
			if (headerText) {
				headerText.textContent = `工具执行失败 ${currentIndex}/${totalCount}: ${tool.name}`;
			}

			throw error;
		}
	}

	/**
	 * Add an MCP error message to the chat
	 */
	private addMCPErrorMessage(errorMessage: string): void {
		const errorMessageObj: ChatMessage = {
			id: Date.now().toString() + '-mcp-error',
			role: 'system',
			content: `⚠️ MCP Error: ${errorMessage}`,
			timestamp: Date.now(),
			metadata: {
				mcpError: true,
				errorType: 'mcp_operation_failed'
			}
		};

		// This would need to be called from the main ChatView class
		// For now, we'll log the error
		Logger.error('MCP Error:', errorMessage);
	}

	/**
	 * Execute tool calls orchestration - the core of intelligent MCP workflow with comprehensive logging
	 * Now uses a queue system to ensure sequential execution
	 */
	async executeToolCallsOrchestration(
		toolCalls: Array<{tool: string, parameters: any}>,
		currentContent: string,
		assistantMessage: any,
		workingMessageEl: HTMLElement | null,
		messages: any[],
		messageId?: string
	): Promise<void> {
		// Enqueue this orchestration to ensure sequential processing
		return this.enqueueToolExecution(async () => {
			try {
				Logger.debug('Starting tool calls orchestration for:', toolCalls.length, 'tools');

				// Record all tool call requests
				const recordIds: string[] = [];
				for (const toolCall of toolCalls) {
					const recordId = this.recordToolCallRequest(
						toolCall.tool,
						toolCall.parameters,
						undefined, // server will be determined during execution
						messageId,
						'user'
					);
					recordIds.push(recordId);
				}

				// Show unified tool call detection indicator
				this.createOrUpdateToolExecutionIndicator('detection', { toolCalls }, workingMessageEl);

				// Execute all tool calls sequentially and collect results
				const toolResults: Array<{tool: string, result: string}> = [];
				const detailedToolResults: Array<{tool: string, request: any, response: any, error?: string}> = [];

				for (const [index, toolCall] of toolCalls.entries()) {
					const recordId = recordIds[index];

					try {
						const toolManager = this.plugin.getToolManager();
						if (!toolManager) {
							throw new Error('Tool Manager not available');
						}

						// Find the actual tool object using unified tool manager
						const availableTools = await toolManager.getAllTools();
						const tool = availableTools.find(t => t.name === toolCall.tool);
						if (!tool) {
							throw new Error(`Tool "${toolCall.tool}" not found in available tools`);
						}

						// Update the record with server information
						const record = this.getToolCallRecord(recordId);
						if (record) {
							record.server = tool.server;
						}

						// Update indicator to show current tool execution
						this.createOrUpdateToolExecutionIndicator('executing', {
							currentTool: toolCall.tool,
							currentIndex: index + 1,
							totalCount: toolCalls.length
						}, workingMessageEl);

						// Mark the specific tool as executing
						this.markToolCallExecuting(recordId, ((index + 1) / toolCalls.length) * 100);

						Logger.debug(`Executing tool ${index + 1}/${toolCalls.length}: ${toolCall.tool}`);

						// Execute the tool (this is the actual sequential step)
						const startTime = Date.now();
						const result = await this.executeMCPTool(tool, toolCall.parameters);
						const executionTime = Date.now() - startTime;

						Logger.debug(`Tool ${toolCall.tool} completed in ${executionTime}ms`);

						// Record successful response
						this.recordToolCallResponse(recordId, result, null, 200, {
							executionTime,
							server: tool.server,
							resultType: typeof result,
							orchestrationIndex: index + 1,
							orchestrationTotal: toolCalls.length
						});

						toolResults.push({ tool: toolCall.tool, result });

						// Store detailed results for expandable UI
						detailedToolResults.push({
							tool: toolCall.tool,
							request: toolCall.parameters,
							response: result
						});

					} catch (error) {
						Logger.error(`Failed to execute tool ${toolCall.tool}:`, error);
						const errorMsg = error instanceof Error ? error.message : 'Unknown error';

						// Record error response
						this.recordToolCallResponse(recordId, null, errorMsg, 500, {
							executionTime: Date.now() - (this.getToolCallRecord(recordId)?.request.timestamp || Date.now()),
							errorType: typeof error,
							orchestrationIndex: index + 1,
							orchestrationTotal: toolCalls.length
						});

						// Store error in detailed results
						detailedToolResults.push({
							tool: toolCall.tool,
							request: toolCall.parameters,
							response: null,
							error: errorMsg
						});

						// Show error and fallback immediately
						this.createOrUpdateToolExecutionIndicator('failed', {
							error: `工具 ${toolCall.tool} 调用失败: ${errorMsg}，回退到普通对话模式`
						}, workingMessageEl);

						Logger.debug('Single tool call failed, falling back to normal conversation mode');
						throw new Error(`工具调用失败: ${errorMsg}`);
					}
				}

				// Update indicator to show completion
				this.createOrUpdateToolExecutionIndicator('completed', {
					totalCount: toolCalls.length,
					recordIds: recordIds // Pass record IDs for detailed view
				}, workingMessageEl);

				Logger.debug('Tool orchestration completed successfully');

			} catch (error) {
				Logger.error('Tool orchestration failed:', error);

				// Show clear error message via unified indicator
				const errorMsg = error instanceof Error ? error.message : '未知错误';
				this.createOrUpdateToolExecutionIndicator('failed', {
					error: `工具调用失败: ${errorMsg}，回退到普通对话模式`
				}, workingMessageEl);

				throw error;
			}
		});
	}

	/**
	 * Clear the tool execution queue (for cleanup or error recovery)
	 */
	clearToolExecutionQueue(): void {
		this.toolExecutionQueue = [];
		this.isProcessingQueue = false;
		Logger.debug('Tool execution queue cleared');
	}

	/**
	 * Get queue status for debugging
	 */
	getQueueStatus(): { queueLength: number, isProcessing: boolean } {
		return {
			queueLength: this.toolExecutionQueue.length,
			isProcessing: this.isProcessingQueue
		};
	}

	/**
	 * Execute a single tool using unified tool manager
	 */
	private async executeMCPTool(tool: any, parameters: any): Promise<string> {
		const toolManager = this.plugin.getToolManager();
		if (!toolManager) {
			throw new Error('Tool Manager not available');
		}

		try {
			// Execute the tool using unified tool manager
			const result = await toolManager.executeTool(tool.name, parameters);

			// Format result content
			let resultContent = '';
			if (result.success && result.result) {
				// Handle unified tool manager result format
				if (result.result.content && Array.isArray(result.result.content)) {
					resultContent = result.result.content.map((item: any) => {
						if (item.type === 'text') {
							return item.text;
						} else if (item.type === 'resource') {
							return `Resource: ${item.resource?.uri || 'Unknown'}`;
						} else {
							return JSON.stringify(item);
						}
					}).join('\n');
				} else if (typeof result.result === 'string') {
					resultContent = result.result;
				} else {
					resultContent = JSON.stringify(result.result);
				}
			} else {
				// Handle error case
				resultContent = result.error || 'Tool execution failed';
			}

			return resultContent;

		} catch (error) {
			Logger.error(`Error executing tool ${tool.name}:`, error);
			throw error;
		}
	}

	/**
	 * Create or update a unified tool execution indicator with comprehensive logging display
	 */
	private createOrUpdateToolExecutionIndicator(
		phase: 'detection' | 'executing' | 'completed' | 'failed',
		data: {
			toolCalls?: Array<{tool: string, parameters: any}>;
			currentTool?: string;
			currentIndex?: number;
			totalCount?: number;
			error?: string;
			recordIds?: string[]; // Tool call record IDs for detailed view
		},
		workingMessageEl?: HTMLElement | null
	): HTMLElement {
		// Check if indicator already exists
		let indicator = this.messageContainer.querySelector('.llmsider-unified-tool-indicator') as HTMLElement;

		if (!indicator) {
			// Create new indicator (without llmsider-message and llmsider-system to avoid inheriting message styles)
			indicator = this.messageContainer.createDiv({
				cls: 'llmsider-unified-tool-indicator'
			});

			// Store tool execution data on the indicator for expandable functionality
			(indicator as any).toolExecutionData = {
				toolCalls: [],
				toolResults: [],
				phase: phase,
				recordIds: []
			};

			// Insert before the working message if it exists, otherwise at the end
			if (workingMessageEl && workingMessageEl.parentNode === this.messageContainer) {
				this.messageContainer.insertBefore(indicator, workingMessageEl);
			} else {
				// Find the last assistant message and insert before it
				const assistantMessages = this.messageContainer.querySelectorAll('.llmsider-message.llmsider-assistant');
				if (assistantMessages.length > 0) {
					const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
					this.messageContainer.insertBefore(indicator, lastAssistantMessage);
				}
			}
		}

		// Update stored data
		const storedData = (indicator as any).toolExecutionData;
		if (data.toolCalls) {
			storedData.toolCalls = data.toolCalls;
		}
		if (data.recordIds) {
			storedData.recordIds = data.recordIds;
		}
		storedData.phase = phase;

		// Update indicator content based on phase
		indicator.innerHTML = '';

		const content = indicator.createDiv({ cls: 'llmsider-tool-indicator-content' });

		switch (phase) {
			case 'detection':
				if (data.toolCalls) {
					content.innerHTML = `
						<div class="tool-indicator-header">
							<span class="tool-indicator-icon">🔧</span>
							<span class="tool-indicator-text">检测到 ${data.toolCalls.length} 个工具调用: ${data.toolCalls.map(tc => tc.tool).join(', ')}</span>
						</div>
					`;
				}
				break;

			case 'executing':
				if (data.currentTool && data.currentIndex && data.totalCount) {
					content.innerHTML = `
						<div class="tool-indicator-header">
							<span class="tool-indicator-icon spinning">⚙️</span>
							<span class="tool-indicator-text">正在执行工具 ${data.currentIndex}/${data.totalCount}: ${data.currentTool}</span>
							<div class="tool-indicator-progress">
								<div class="tool-indicator-progress-bar">
									<div class="tool-indicator-progress-fill" style="width: ${(data.currentIndex / data.totalCount) * 100}%"></div>
								</div>
							</div>
						</div>
					`;
				}
				break;

			case 'completed':
				if (data.totalCount) {
					const headerEl = content.createDiv({ cls: 'tool-indicator-header tool-indicator-clickable' });
					headerEl.innerHTML = `
						<span class="tool-indicator-icon">✅</span>
						<span class="tool-indicator-text">工具调用完成 - 执行了 ${data.totalCount} 个工具</span>
						<span class="tool-indicator-toggle">▼</span>
					`;

					// Create expandable details section (initially collapsed)
					const detailsEl = content.createDiv({ cls: 'tool-indicator-details collapsed' });
					
					// Get tool execution details from records
					const toolResults = this.buildToolResultsFromRecords(data.recordIds || [], data.toolCalls || []);
					this.renderToolExecutionDetails(detailsEl, { toolCalls: data.toolCalls || [], toolResults });

					// Add click handler for expand/collapse
					headerEl.addEventListener('click', () => {
						const isCollapsed = detailsEl.classList.contains('collapsed');
						detailsEl.classList.toggle('collapsed', !isCollapsed);
						const toggleIcon = headerEl.querySelector('.tool-indicator-toggle') as HTMLElement;
						if (toggleIcon) {
							toggleIcon.textContent = isCollapsed ? '▲' : '▼';
						}
					});
				}
				break;

			case 'failed':
				const failedHeaderEl = content.createDiv({ cls: 'tool-indicator-header tool-indicator-clickable' });
				failedHeaderEl.innerHTML = `
					<span class="tool-indicator-icon">❌</span>
					<span class="tool-indicator-text">工具调用失败: ${data.error || '未知错误'}</span>
					<span class="tool-indicator-toggle">▼</span>
				`;

				// Create expandable details section (initially collapsed)
				const failedDetailsEl = content.createDiv({ cls: 'tool-indicator-details collapsed' });
				
				// Get tool execution details from records
				const failedToolResults = this.buildToolResultsFromRecords(data.recordIds || [], data.toolCalls || []);
				this.renderToolExecutionDetails(failedDetailsEl, { toolCalls: data.toolCalls || [], toolResults: failedToolResults });

				// Add click handler for expand/collapse
				failedHeaderEl.addEventListener('click', () => {
					const isCollapsed = failedDetailsEl.classList.contains('collapsed');
					failedDetailsEl.classList.toggle('collapsed', !isCollapsed);
					const toggleIcon = failedHeaderEl.querySelector('.tool-indicator-toggle') as HTMLElement;
					if (toggleIcon) {
						toggleIcon.textContent = isCollapsed ? '▲' : '▼';
					}
				});
				break;
		}

		return indicator;
	}

	/**
	 * Build tool results from records for display
	 */
	private buildToolResultsFromRecords(recordIds: string[], toolCalls: Array<{tool: string, parameters: any}>): Array<{tool: string, request: any, response: any, error?: string}> {
		const toolResults: Array<{tool: string, request: any, response: any, error?: string}> = [];
		
		for (const recordId of recordIds) {
			const record = this.getToolCallRecord(recordId);
			if (!record) continue;
			
			toolResults.push({
				tool: record.toolName,
				request: record.request.parameters,
				response: record.response?.result || null,
				error: record.response?.error
			});
		}
		
		// If no records found, try to build from tool calls
		if (toolResults.length === 0 && toolCalls.length > 0) {
			for (const toolCall of toolCalls) {
				toolResults.push({
					tool: toolCall.tool,
					request: toolCall.parameters,
					response: null,
					error: '记录未找到'
				});
			}
		}
		
		return toolResults;
	}

	/**
	 * Render tool execution details in expandable section
	 */
	private renderToolExecutionDetails(container: HTMLElement, toolData: { toolCalls: Array<{tool: string, parameters: any}>, toolResults: Array<{tool: string, request: any, response: any, error?: string}> }): void {
		if (!toolData.toolCalls || toolData.toolCalls.length === 0) {
			container.createEl('div', { cls: 'tool-detail-empty', text: '暂无工具调用详情' });
			return;
		}

		toolData.toolCalls.forEach((toolCall, index) => {
			const toolSection = container.createDiv({ cls: 'tool-detail-section' });

			// Tool header
			const toolHeader = toolSection.createDiv({ cls: 'tool-detail-header' });
			toolHeader.innerHTML = `
				<span class="tool-detail-name">🔧 ${toolCall.tool}</span>
				<span class="tool-detail-index">#${index + 1}</span>
			`;

			// Tool request details (collapsible)
			const requestSection = toolSection.createDiv({ cls: 'tool-detail-subsection' });
			const requestHeader = requestSection.createDiv({ cls: 'tool-detail-subsection-header tool-detail-clickable' });
			requestHeader.innerHTML = `
				<span class="tool-detail-subsection-title">📤 请求参数</span>
				<span class="tool-detail-subsection-toggle">▼</span>
			`;

			const requestContent = requestSection.createDiv({ cls: 'tool-detail-content collapsed' });
			requestContent.createEl('pre', {
				cls: 'tool-detail-json',
				text: JSON.stringify(toolCall.parameters, null, 2)
			});

			// Add click handler for request section
			requestHeader.addEventListener('click', () => {
				const isCollapsed = requestContent.classList.contains('collapsed');
				requestContent.classList.toggle('collapsed', !isCollapsed);
				const toggleIcon = requestHeader.querySelector('.tool-detail-subsection-toggle') as HTMLElement;
				if (toggleIcon) {
					toggleIcon.textContent = isCollapsed ? '▲' : '▼';
				}
			});

			// Tool response details (if available)
			const toolResult = toolData.toolResults?.find(result => result.tool === toolCall.tool);
			if (toolResult) {
				const responseSection = toolSection.createDiv({ cls: 'tool-detail-subsection' });
				const responseHeader = responseSection.createDiv({ cls: 'tool-detail-subsection-header tool-detail-clickable' });

				if (toolResult.error) {
					responseHeader.innerHTML = `
						<span class="tool-detail-subsection-title">❌ 响应结果 (错误)</span>
						<span class="tool-detail-subsection-toggle">▼</span>
					`;
				} else {
					responseHeader.innerHTML = `
						<span class="tool-detail-subsection-title">📥 响应结果</span>
						<span class="tool-detail-subsection-toggle">▼</span>
					`;
				}

				const responseContent = responseSection.createDiv({ cls: 'tool-detail-content collapsed' });

				if (toolResult.error) {
					responseContent.createEl('div', {
						cls: 'tool-detail-error',
						text: toolResult.error
					});
				} else {
					responseContent.createEl('pre', {
						cls: 'tool-detail-json',
						text: JSON.stringify(toolResult.response, null, 2)
					});
				}

				// Add click handler for response section
				responseHeader.addEventListener('click', () => {
					const isCollapsed = responseContent.classList.contains('collapsed');
					responseContent.classList.toggle('collapsed', !isCollapsed);
					const toggleIcon = responseHeader.querySelector('.tool-detail-subsection-toggle') as HTMLElement;
					if (toggleIcon) {
						toggleIcon.textContent = isCollapsed ? '▲' : '▼';
					}
				});
			}
		});
	}

	/**
	 * Add simplified records view - clean and focused on request/response
	 */
	private addSimplifiedRecordsView(container: HTMLElement, recordIds: string[]): void {
		const detailsContainer = container.createDiv({ cls: 'tool-records-simple' });

		const toggleButton = detailsContainer.createEl('button', {
			cls: 'tool-records-simple-toggle',
			text: '查看详细记录'
		});

		const detailsContent = detailsContainer.createDiv({
			cls: 'tool-records-simple-content',
			attr: { style: 'display: none;' }
		});

		// Add individual tool records
		for (const recordId of recordIds) {
			const record = this.getToolCallRecord(recordId);
			if (!record) continue;

			const toolCard = detailsContent.createDiv({ cls: 'tool-record-card' });

			// Tool header
			const toolHeader = toolCard.createDiv({ cls: 'tool-record-header' });
			const status = record.status === 'completed' ? '✅' :
						   record.status === 'failed' ? '❌' : '⚙️';

			const executionTime = record.response?.executionTime || 0;
			const timeText = executionTime > 0 ? ` (${executionTime}ms)` : '';

			toolHeader.innerHTML = `
				<span class="tool-record-status">${status}</span>
				<span class="tool-record-name">${record.toolName}</span>
				<span class="tool-record-time">${timeText}</span>
			`;

			// Request section
			const requestSection = toolCard.createDiv({ cls: 'tool-record-section' });
			requestSection.createEl('h4', { text: '请求参数', cls: 'tool-record-section-title' });

			const requestContent = requestSection.createEl('pre', {
				text: JSON.stringify(record.request.parameters, null, 2),
				cls: 'tool-record-json'
			});

			// Response section
			if (record.response) {
				const responseSection = toolCard.createDiv({ cls: 'tool-record-section' });
				responseSection.createEl('h4', { text: '响应结果', cls: 'tool-record-section-title' });

				if (record.response.error) {
					const errorContent = responseSection.createDiv({ cls: 'tool-record-error' });
					errorContent.textContent = record.response.error;
				} else if (record.response.result) {
					const responseContent = responseSection.createEl('pre', {
						text: JSON.stringify(record.response.result, null, 2),
						cls: 'tool-record-json'
					});
				} else {
					const noContent = responseSection.createDiv({ cls: 'tool-record-no-content' });
					noContent.textContent = '无返回内容';
				}
			}
		}

		// Toggle functionality
		toggleButton.addEventListener('click', () => {
			const isHidden = detailsContent.style.display === 'none';
			detailsContent.style.display = isHidden ? 'block' : 'none';
			toggleButton.textContent = isHidden ? '隐藏详细记录' : '查看详细记录';
		});
	}

	/**
	 * Get comprehensive execution statistics for logging and monitoring
	 */
	getExecutionStatistics(): {
		totalRecords: number;
		completedRecords: number;
		failedRecords: number;
		runningRecords: number;
		averageExecutionTime: number;
		recentActivity: ToolCallRecord[];
	} {
		const records = Array.from(this.toolCallRecords.values());
		const completed = records.filter(r => r.status === 'completed');
		const failed = records.filter(r => r.status === 'failed');
		const running = records.filter(r => r.status === 'running');

		const avgTime = completed.length > 0
			? completed.reduce((sum, r) => sum + (r.response?.executionTime || 0), 0) / completed.length
			: 0;

		// Get recent activity (last 10 records)
		const recentActivity = records
			.sort((a, b) => b.request.timestamp - a.request.timestamp)
			.slice(0, 10);

		return {
			totalRecords: records.length,
			completedRecords: completed.length,
			failedRecords: failed.length,
			runningRecords: running.length,
			averageExecutionTime: Math.round(avgTime),
			recentActivity
		};
	}

	/**
	 * Export tool call records for analysis or debugging
	 */
	exportToolCallRecords(): string {
		const records = Array.from(this.toolCallRecords.values());
		const exportData = {
			exportTime: new Date().toISOString(),
			totalRecords: records.length,
			statistics: this.getExecutionStatistics(),
			records: records.map(record => ({
				...record,
				request: {
					...record.request,
					timestamp: new Date(record.request.timestamp).toISOString()
				},
				response: record.response ? {
					...record.response,
					timestamp: new Date(record.response.timestamp).toISOString()
				} : undefined
			}))
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Add tool execution record to current assistant message (legacy compatibility)
	 */
	private addToolExecutionToCurrentMessage(toolExecution: any): void {
		// This would need to be implemented by the main ChatView class
		// For now, we store the record in our enhanced system
		Logger.debug('Tool execution record:', toolExecution);
	}

	/**
	 * Update tool execution record in current assistant message (legacy compatibility)
	 */
	private updateToolExecutionInCurrentMessage(toolExecution: any): void {
		// This would need to be implemented by the main ChatView class
		// The new system handles this through recordToolCallResponse
		Logger.debug('Updated tool execution record:', toolExecution);
	}
}