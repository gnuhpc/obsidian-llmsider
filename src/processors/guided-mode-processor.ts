import { ChatMessage } from '../types';
import { Logger } from './../utils/logger';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';
import { UnifiedTool } from '../tools/unified-tool-manager';

/**
 * Guided Mode Processor - Interactive guided conversation with step-by-step questions
 * The AI asks clarifying questions and provides options for the user to choose from
 * Now supports tool suggestions and execution with user confirmation
 */
export class GuidedModeProcessor {
	private plugin: LLMSiderPlugin;
	private i18n: I18nManager;
	private messageContainer: HTMLElement;
	
	// State tracking
	private currentStep: number = 0;
	private conversationContext: string = '';
	private userGoal: string = '';
	private pendingToolCalls: any[] = []; // Store tool calls waiting for user confirmation

	constructor(plugin: LLMSiderPlugin, messageContainer: HTMLElement) {
		this.plugin = plugin;
		this.i18n = plugin.getI18nManager()!;
		this.messageContainer = messageContainer;
		
		// Listen for language changes
		this.i18n.onLanguageChange(() => {
			this.i18n = plugin.getI18nManager()!;
		});
	}

	/**
	 * Start guided mode conversation with user query
	 */
	async startGuidedConversation(
		userQuery: string, 
		messages: ChatMessage[], 
		availableTools?: UnifiedTool[],
		onStreamUpdate?: (message: ChatMessage) => void,
		predefinedMessageId?: string,
		signal?: AbortSignal
	): Promise<ChatMessage | null> {
		Logger.debug('Starting guided conversation for:', userQuery);
		Logger.debug('Available tools:', availableTools?.length || 0);
		Logger.debug('Using message ID:', predefinedMessageId || 'auto-generated');
		
		this.userGoal = userQuery;
		this.currentStep = 1;
		this.conversationContext = userQuery;
		this.pendingToolCalls = [];
		
		// Get AI provider
		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			throw new Error(this.i18n.t('errors.noProvider'));
		}
		
		// Build initial guided prompt
		const guidedPrompt = this.buildGuidedPrompt(userQuery, messages, availableTools);
		
		// Prepare messages for AI
		const aiMessages = [
			...messages,
			{
				id: Date.now().toString(),
				role: 'user' as const,
				content: guidedPrompt,
				timestamp: Date.now()
			}
		];
		
		// Get AI response with streaming and tools
		let responseContent = '';
		let detectedToolCalls: any[] = [];
		
		const guidedMessage: ChatMessage = {
			id: predefinedMessageId || Date.now().toString(),
			role: 'assistant',
			content: '',
			timestamp: Date.now(),
			metadata: {
				isGuidedQuestion: true,
				guidedStepNumber: this.currentStep,
				guidedContext: this.conversationContext,
				isStreaming: true
			}
		};
		
		try {
			Logger.debug('About to call provider.sendStreamingMessage');
			Logger.debug('Provider type:', provider.constructor.name);
			Logger.debug('Messages count:', aiMessages.length);
			Logger.debug('Available tools count:', availableTools?.length || 0);
			
			await provider.sendStreamingMessage(
				aiMessages, 
				(chunk) => {
					// Check if aborted - stop processing immediately
					if (signal?.aborted) {
						Logger.debug('Stream aborted, stopping chunk processing');
						return;
					}
					
					// Logger.debug('Stream chunk received:', { hasDelta: !!chunk.delta, deltaLength: chunk.delta?.length || 0, isComplete: chunk.isComplete });
					
					if (chunk.delta) {
						responseContent += chunk.delta;
						guidedMessage.content = responseContent;
						
						// Extract options if present in response
						const extracted = this.extractOptionsFromResponse(responseContent);
						if (extracted.options.length > 0) {
							guidedMessage.metadata!.guidedOptions = extracted.options;
							guidedMessage.metadata!.isMultiSelect = extracted.isMultiSelect;
						}
						
						// Notify UI to update with streaming content
						if (onStreamUpdate) {
							//Logger.debug('Calling onStreamUpdate with content length:', responseContent.length, 'options:', options.length);
							onStreamUpdate({ ...guidedMessage });
						} else {
							Logger.warn('onStreamUpdate callback is not defined!');
						}
					}
					
					// Collect tool calls from streaming chunks
					if (chunk.toolCalls && chunk.toolCalls.length > 0) {
						detectedToolCalls = [...chunk.toolCalls];
					}
				},
				signal, // Pass abort signal
				availableTools, // Pass tools to provider
				'' // system prompt (using default)
			);
			
			// Check if aborted after streaming completes
			if (signal?.aborted) {
				Logger.debug('Stream was aborted, throwing AbortError');
				const abortError = new Error('Stream aborted');
				abortError.name = 'AbortError';
				throw abortError;
			}
			
			// Check for empty response
			if (!responseContent || responseContent.trim().length === 0) {
				Logger.warn('AI returned empty response');
				
				// Check if there were tool calls even without content
				if (detectedToolCalls.length > 0) {
					Logger.debug('Empty response but has tool calls - this is acceptable');
					
					// No content needed - tool cards will be shown directly
					guidedMessage.content = '';
					guidedMessage.metadata!.suggestedToolCalls = detectedToolCalls;
					guidedMessage.metadata!.requiresToolConfirmation = true;
					guidedMessage.metadata!.isStreaming = false;
					return guidedMessage;
				}
				
				// Truly empty response with no tool calls
				guidedMessage.content = `❌ **${this.i18n.t('errors.emptyResponse')}**\n\n${this.i18n.t('errors.emptyResponseReasons')}\n\n${this.i18n.t('errors.emptyResponseSuggestion')}`;
				guidedMessage.metadata!.hasError = true;
				guidedMessage.metadata!.errorType = 'empty_response';
				guidedMessage.metadata!.isStreaming = false;
				return guidedMessage;
			}
			
			// Check if AI suggested tool calls
			if (detectedToolCalls.length > 0) {
				Logger.debug('AI suggested tool calls:', detectedToolCalls);
				this.pendingToolCalls = detectedToolCalls;
				guidedMessage.metadata!.suggestedToolCalls = detectedToolCalls;
				guidedMessage.metadata!.requiresToolConfirmation = true;
			}
			
			// Mark streaming as complete
			guidedMessage.metadata!.isStreaming = false;
			
			// Parse final content for options
			const finalExtracted = this.extractOptionsFromResponse(responseContent);
			if (finalExtracted.options.length > 0) {
				guidedMessage.metadata!.guidedOptions = finalExtracted.options;
				guidedMessage.metadata!.isMultiSelect = finalExtracted.isMultiSelect;
			}
			
			return guidedMessage;
			
		} catch (error) {
			Logger.error('Error in guided conversation:', error);
			
			// Mark streaming as complete on error
			guidedMessage.metadata!.isStreaming = false;
			
			// Create user-friendly error message
			let errorMessage = this.i18n.t('errors.generationFailed');
			let errorDetails = '';
			let suggestions = '';
			
			if (error && typeof error === 'object') {
				const err = error as any;
				
				// Network errors
				if (err.message?.includes('network') || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ERR_NETWORK') {
					errorMessage = '网络连接错误';
					errorDetails = '无法连接到 AI 服务。可能的原因：\n• 网络连接不稳定\n• 服务器无响应或超时\n• 代理或防火墙拦截';
					suggestions = '💡 建议：\n• 检查网络连接\n• 稍后重试\n• 检查 API 配置';
				}
				// Token limit errors
				else if (err.message?.includes('token') || err.message?.includes('context_length_exceeded')) {
					errorMessage = '内容长度超限';
					errorDetails = '对话内容太长，超出了模型的处理能力。';
					suggestions = '💡 建议：\n• 开始新对话\n• 精简问题描述';
				}
				// API errors
				else if (err.statusCode === 401 || err.statusCode === 403) {
					errorMessage = 'API 认证失败';
					errorDetails = 'API 密钥无效或无权限访问。';
					suggestions = '💡 建议：\n• 检查 API 密钥配置\n• 确认账户状态';
				}
				else if (err.statusCode === 404) {
					errorMessage = '服务未找到';
					errorDetails = '请求的端点或模型不存在。';
					suggestions = '💡 建议：\n• 检查 API 地址\n• 确认模型名称';
				}
				else if (err.statusCode === 429) {
					errorMessage = '请求频率超限';
					errorDetails = 'API 调用次数超出限制。';
					suggestions = '💡 建议：\n• 稍后重试\n• 检查账户配额';
				}
				else if (err.statusCode === 500 || err.statusCode === 502 || err.statusCode === 503) {
					errorMessage = '服务器错误';
					errorDetails = 'AI 服务暂时不可用。';
					suggestions = '💡 建议：\n• 稍后重试\n• 尝试其他模型';
				}
				// General error with message
				else if (err.message) {
					errorDetails = err.message;
				}
			}
			
			// Set error content in the guided message
			const errorContent = [`❌ **${errorMessage}**`];
			if (errorDetails) {
				errorContent.push('', errorDetails);
			}
			if (suggestions) {
				errorContent.push('', suggestions);
			}
			
			guidedMessage.content = errorContent.join('\n');
			guidedMessage.metadata!.hasError = true;
			guidedMessage.metadata!.errorType = 'generation_error';
			
			return guidedMessage;
		}
	}
	
	/**
	 * Process user's selection/response in guided mode
	 */
	async processGuidedResponse(
		userResponse: string, 
		previousMessages: ChatMessage[], 
		availableTools?: UnifiedTool[],
		onStreamUpdate?: (message: ChatMessage) => void,
		predefinedMessageId?: string,
		signal?: AbortSignal
	): Promise<ChatMessage | null> {
		Logger.debug('Processing guided response:', userResponse);
		Logger.debug('Using message ID:', predefinedMessageId || 'auto-generated');
		
		// Update context with user response
		this.conversationContext += `\nUser: ${userResponse}`;
		this.currentStep++;
		
		// Build follow-up prompt
		const followUpPrompt = this.buildFollowUpPrompt(userResponse, previousMessages);
		
		// Get AI provider
		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			throw new Error(this.i18n.t('errors.noProvider'));
		}
		
		// Prepare messages
		const aiMessages = [
			...previousMessages,
			{
				id: Date.now().toString(),
				role: 'user' as const,
				content: followUpPrompt,
				timestamp: Date.now()
			}
		];
		
		// Get AI response
		let responseContent = '';
		let detectedToolCalls: any[] = [];
		
		const guidedMessage: ChatMessage = {
			id: predefinedMessageId || Date.now().toString(),
			role: 'assistant',
			content: '',
			timestamp: Date.now(),
			metadata: {
				isGuidedQuestion: true,
				guidedStepNumber: this.currentStep,
				guidedContext: this.conversationContext,
				isStreaming: true
			}
		};
		
		try {
			await provider.sendStreamingMessage(
				aiMessages, 
				(chunk) => {
					// Check if aborted - stop processing immediately
					if (signal?.aborted) {
						Logger.debug('Stream aborted in chunk callback, stopping');
						return;
					}
					
					// Logger.debug('processGuidedResponse - Stream chunk received:', { hasDelta: !!chunk.delta, deltaLength: chunk.delta?.length || 0, isComplete: chunk.isComplete });
					
					if (chunk.delta) {
						responseContent += chunk.delta;
						guidedMessage.content = responseContent;
						
						// Extract options if present
						const extracted = this.extractOptionsFromResponse(responseContent);
						if (extracted.options.length > 0) {
							guidedMessage.metadata!.guidedOptions = extracted.options;
							guidedMessage.metadata!.isMultiSelect = extracted.isMultiSelect;
						}
						
						// Notify UI to update with streaming content
						if (onStreamUpdate) {
							// Logger.debug('processGuidedResponse - Calling onStreamUpdate with content length:', responseContent.length, 'options:', options.length);
							onStreamUpdate({ ...guidedMessage });
						}
					}
					
					// Collect tool calls from streaming chunks
					if (chunk.toolCalls && chunk.toolCalls.length > 0) {
						detectedToolCalls = [...chunk.toolCalls];
					}
				},
				signal, // Pass abort signal
				availableTools, // Pass tools to provider
				'' // system prompt
			);
			
			// Check if aborted after streaming completes
			if (signal?.aborted) {
				Logger.debug('Stream was aborted, throwing AbortError');
				const abortError = new Error('Stream aborted');
				abortError.name = 'AbortError';
				throw abortError;
			}
			
			// Check for empty response
			if (!responseContent || responseContent.trim().length === 0) {
				Logger.warn('AI returned empty response in follow-up');
				
				// Check if there were tool calls even without content
				if (detectedToolCalls.length > 0) {
					Logger.debug('Empty response but has tool calls - this is acceptable');
					
					// No content needed - tool cards will be shown directly
					guidedMessage.content = '';
					guidedMessage.metadata!.suggestedToolCalls = detectedToolCalls;
					guidedMessage.metadata!.requiresToolConfirmation = true;
					guidedMessage.metadata!.isStreaming = false;
					return guidedMessage;
				}
				
				// Check if this was a confirmation step
				const confirmationKeywords = ['确认', '保存', 'yes', 'ok', '好的', '可以', 'continue', 'proceed', 'go ahead'];
				const wasConfirmation = confirmationKeywords.some(keyword => 
					userResponse.toLowerCase().includes(keyword)
				);
				
				if (wasConfirmation) {
					// Special error message for confirmation steps
					guidedMessage.content = `❌ **AI 模型返回了空响应**

这通常发生在模型应该调用工具但没有调用的情况下。

**可能的原因：**
• 模型理解了任务但没有正确调用工具
• 对话历史过长导致模型困惑
• 模型配置问题（temperature 过高/过低）

**建议的解决方法：**
1. 尝试更换其他 AI 模型（如 Claude、GPT-4）
2. 在设置中调整 temperature 参数（建议 0.2-0.7）
3. 开始新对话重试
4. 或者使用基础模式直接操作

💡 **临时解决方案：** 您可以切换到基础对话模式，直接告诉 AI 您想做什么（不使用引导模式）。`;
				} else {
					// Standard empty response error
					guidedMessage.content = `❌ **${this.i18n.t('errors.emptyResponse')}**\n\n${this.i18n.t('errors.emptyResponseReasons')}\n\n${this.i18n.t('errors.emptyResponseSuggestion')}`;
				}
				
				guidedMessage.metadata!.hasError = true;
				guidedMessage.metadata!.errorType = 'empty_response';
				guidedMessage.metadata!.isStreaming = false;
				return guidedMessage;
			}
			
			// Check if AI suggested tool calls
			if (detectedToolCalls.length > 0) {
				Logger.debug('AI suggested tool calls:', detectedToolCalls);
				this.pendingToolCalls = detectedToolCalls;
				guidedMessage.metadata!.suggestedToolCalls = detectedToolCalls;
				guidedMessage.metadata!.requiresToolConfirmation = true;
			}
			
			// Mark streaming as complete
			guidedMessage.metadata!.isStreaming = false;
			
			// Parse final content for options
			const finalExtracted = this.extractOptionsFromResponse(responseContent);
			if (finalExtracted.options.length > 0) {
				guidedMessage.metadata!.guidedOptions = finalExtracted.options;
				guidedMessage.metadata!.isMultiSelect = finalExtracted.isMultiSelect;
			}
			
			return guidedMessage;
			
		} catch (error) {
			Logger.error('Error processing guided response:', error);
			
			// Mark streaming as complete on error
			guidedMessage.metadata!.isStreaming = false;
			
			// Create user-friendly error message
			let errorMessage = this.i18n.t('errors.generationFailed');
			let errorDetails = '';
			let suggestions = '';
			
			if (error && typeof error === 'object') {
				const err = error as any;
				
				// Network errors
				if (err.message?.includes('network') || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ERR_NETWORK') {
					errorMessage = '网络连接错误';
					errorDetails = '无法连接到 AI 服务。可能的原因：\n• 网络连接不稳定\n• 服务器无响应或超时\n• 代理或防火墙拦截';
					suggestions = '💡 建议：\n• 检查网络连接\n• 稍后重试\n• 检查 API 配置';
				}
				// Token limit errors
				else if (err.message?.includes('token') || err.message?.includes('context_length_exceeded')) {
					errorMessage = '内容长度超限';
					errorDetails = '对话内容太长，超出了模型的处理能力。';
					suggestions = '💡 建议：\n• 开始新对话\n• 精简问题描述';
				}
				// API errors
				else if (err.statusCode === 401 || err.statusCode === 403) {
					errorMessage = 'API 认证失败';
					errorDetails = 'API 密钥无效或无权限访问。';
					suggestions = '💡 建议：\n• 检查 API 密钥配置\n• 确认账户状态';
				}
				else if (err.statusCode === 404) {
					errorMessage = '服务未找到';
					errorDetails = '请求的端点或模型不存在。';
					suggestions = '💡 建议：\n• 检查 API 地址\n• 确认模型名称';
				}
				else if (err.statusCode === 429) {
					errorMessage = '请求频率超限';
					errorDetails = 'API 调用次数超出限制。';
					suggestions = '💡 建议：\n• 稍后重试\n• 检查账户配额';
				}
				else if (err.statusCode === 500 || err.statusCode === 502 || err.statusCode === 503) {
					errorMessage = '服务器错误';
					errorDetails = 'AI 服务暂时不可用。';
					suggestions = '💡 建议：\n• 稍后重试\n• 尝试其他模型';
				}
				// General error with message
				else if (err.message) {
					errorDetails = err.message;
				}
			}
			
			// Set error content in the guided message
			const errorContent = [`❌ **${errorMessage}**`];
			if (errorDetails) {
				errorContent.push('', errorDetails);
			}
			if (suggestions) {
				errorContent.push('', suggestions);
			}
			
			guidedMessage.content = errorContent.join('\n');
			guidedMessage.metadata!.hasError = true;
			guidedMessage.metadata!.errorType = 'generation_error';
			
			return guidedMessage;
		}
	}
	
	/**
	 * Build initial guided prompt
	 */
	private buildGuidedPrompt(userQuery: string, messages: ChatMessage[], availableTools?: UnifiedTool[]): string {
		let toolsInfo = '';
		let hasGetTimedateTool = false;
		
		if (availableTools && availableTools.length > 0) {
			hasGetTimedateTool = availableTools.some(t => t.name === 'get_timedate');
			const toolNames = availableTools.map(t => `- ${t.name}: ${t.description || ''}`).join('\n');
			toolsInfo = `

## Available Tools:
You have access to the following tools that can help answer the user's query:
${toolNames}

IMPORTANT Tool Usage Rules:
1. **CRITICAL: ALWAYS CALL TOOLS DIRECTLY - DO NOT just explain what you will do!**
   - ❌ WRONG: "I will call list_file_directory to check folders" (text only - NO TOOL CALL)
   - ✅ CORRECT: Directly call the tool without explaining first - let the tool execution speak for itself
   - The system will show users which tool is being used - you don't need to announce it
2. When you have gathered enough information to help the user, CALL THE TOOL IMMEDIATELY
3. **NEVER respond with text like "I will call X tool" without actually calling it**
4. DO NOT keep asking questions if you already have all the information needed to call a tool
5. The user has already provided the information - if it's sufficient, call the tool now
6. Only ask for MORE information if something critical is genuinely missing
7. **Remember: Actions speak louder than words - CALL TOOLS instead of talking about calling them**

## CRITICAL: Real-time Information Search and Summarization
**When users ask for real-time, latest, or current information:**
1. **ALWAYS call appropriate search tools** (duckduckgo_text_search, google_search, wikipedia_search, etc.)
2. **MANDATORY: After receiving search results, YOU MUST SUMMARIZE the information**
   - DO NOT just say "here are the search results" and stop
   - DO NOT just list raw search result links
   - Extract key information from the search results
   - Present a clear, structured summary in your response
   - Include specific details: numbers, dates, facts, key points
   - Cite sources when mentioning specific information
3. **Search result workflow:**
   - Step 1: Call search tool with relevant query
   - Step 2: Receive and analyze the search results
   - Step 3: Synthesize information into a coherent summary
   - Step 4: Present the summary with proper formatting (headings, bullet points, etc.)
4. **Keywords indicating search needed:** "latest", "recent", "current", "news", "what happened", "最新", "最近", "现在", "新闻", "发生了什么"
5. **Example workflow:**
   User: "What's the latest news about AI?"
   You: "我将搜索最新的AI新闻动态。" [CALL duckduckgo_text_search]
   [Receive search results]
   You: [Provide structured summary]:
   "根据搜索结果，以下是最新的AI动态：
   
   ## 主要新闻
   1. **[Topic 1]** - [Summary with key details]
      来源: [Source URL]
   
   2. **[Topic 2]** - [Summary with key details]
      来源: [Source URL]
   
   ## 关键发展
   - [Key point 1]
   - [Key point 2]
   
   需要了解更多细节吗？"

## CRITICAL: Avoid Redundant Web Content Fetching

### HIGHEST PRIORITY: ALWAYS Batch Fetch Multiple URLs!
**When you have multiple URLs from search results:**
1. **BATCH FETCH ALL URLs IN ONE CALL using array format**: fetch_web_content with url parameter as ["url1", "url2", "url3"]
2. **NEVER fetch URLs one by one** - This wastes time and is redundant!
3. **After batch fetching completes, ALL content is ready** - Proceed directly to analyze/summarize
4. **DO NOT fetch individual URLs again after batch fetch** - You already have all content!

**Example - WRONG approach (Inefficient one-by-one fetching):**
- Step 1: Search returns URL_A, URL_B, URL_C, URL_D
- Step 2: Fetch URL_A
- Step 3: Fetch URL_B (STOP! Wrong approach!)
- Step 4: Fetch URL_C (You are wasting time!)

**Example - CORRECT approach (Efficient batch fetch):**
- Step 1: Search returns URL_A, URL_B, URL_C, URL_D
- Step 2: Batch fetch all URLs in ONE call
- Step 3: All content ready! Analyze and summarize (No more fetching needed!)

### Rule 1: Check History Before ANY Fetch
**Before fetching any URL (single or batch), check conversation history:**
1. **Look for previous fetch_web_content results** containing these URLs
2. **If URLs already fetched with content**, DO NOT fetch again - reuse existing content
3. **Only fetch if:**
   - URLs never fetched in this conversation, OR
   - Previous fetch failed/incomplete, OR
   - User explicitly requests refresh

### Rule 2: Recognize Already-Fetched URLs
**Search for these patterns in conversation history:**
- Messages containing: "工具执行成功: fetch_web_content" or "Successfully fetched content"
- JSON results with: "totalUrls": X, "successCount": Y, "results": [...]
- URLs in "results" array with "success": true and non-empty "content" field
- **If a URL appears in ANY previous fetch result with content, it is already fetched!**

**Example - Content Already Available:**
Previous Assistant Message shows:
"工具执行成功: fetch_web_content" with "totalUrls": 3, "results" containing three URLs with success true and full content.

User asks follow-up: "Tell me more about page2"
CORRECT behavior: Use existing content from page2, no fetch needed
WRONG behavior: Fetch page2 again - it is already in your history!

### Rule 3: After Batch Fetch, STOP Fetching!
**Once you have batch-fetched URLs from search results:**
1. **You have ALL the content** - Everything is in the batch fetch result
2. **Proceed directly to analysis/summary** - No need for more fetches
3. **Do NOT fetch individual URLs from the batch** - They are already included!
4. **CORRECT Flow:** Search, then Batch fetch ALL URLs, then Analyze, then Answer user
5. **WRONG Flow:** Search, then Batch fetch ALL URLs, then Fetch URL 1 again, then Fetch URL 2 again (wasteful!)

**Key Principle: Fetch once in batch, use many times!**

## CRITICAL: Directory Best Practices
**IMPORTANT: list_file_directory is READ-ONLY, it shows both folders AND files but does NOT create anything!**
**Only the create() tool can create files/directories!**

**POWERFUL: create() tool automatically creates directories!**
- When you call create({path: "NewFolder/subfolder/file.md", content: "..."}), it will:
  1. Check if "NewFolder/" exists, create it if not
  2. Check if "NewFolder/subfolder/" exists, create it if not  
  3. Create the file "file.md" with the content
- You DON'T need separate tool calls to create directories first
- One create() call handles the entire directory tree + file creation
- Example: create({path: "Projects/2025/Q1/report.md"}) creates all folders automatically

**WHEN to call list_file_directory:**
- ONLY call it once when user has confirmed content and you need to know where to save
- NEVER call it at the start of conversation
- NEVER call it multiple times
- NEVER call it before content is ready
- It returns BOTH folders and files in the specified directory

**After list_file_directory is executed (in next step):**
1. You will receive the directory listing result (both folders and files)
2. Present 2-4 directory options to user based on existing directories
3. Wait for user to choose a directory
4. Then call create() with the chosen path (directories will be auto-created if needed)

**Workflow for saving files:**
Step 1: Discuss and confirm content with user
Step 2: User confirms content is ready → Call list_file_directory({directoryPath: ""}) ONCE (explain: "checking existing folders")
Step 3: After list_file_directory result → Present directory options, wait for user choice  
Step 4: User chooses directory → Call create() with path and content (directories auto-created, explain: "saving the file")

**CRITICAL Rules - ALWAYS PREFER EXISTING DIRECTORIES:**
- **HIGHEST PRIORITY: Reuse existing directories whenever possible!**
- If "book/" exists, use it - don't suggest "books/"
- If "Templates/" exists, use it - don't suggest "Template/"
- If "Notes/" exists, use it for notes - don't create "Note/"
- If "Projects/" exists, use it for projects - don't create "Project/"
- **ONLY suggest creating a new directory if:**
  1. User EXPLICITLY asks for a new directory (e.g., "create a new folder called X")
  2. NO existing directory is suitable for the content type
  3. The content is truly unique and doesn't fit existing categories
- **Check for similar names**: "book" ≈ "books" ≈ "Book" ≈ "读书"
- Remember: list_file_directory shows both folders and files for complete context

**When user wants to create a new directory:**
- You can directly use create() with the new path, no need to create directory first
- Example: User chooses "新建目录: BookReviews/" → Directly call create({path: "BookReviews/template.md", content: "..."})
- The create() tool will automatically create "BookReviews/" directory along with the file
- This is simpler than creating directory separately

**DO NOT:**
- Suggest "新建目录" unless user explicitly wants it or no suitable directory exists
- Call list_file_directory before content is confirmed
- Call list_file_directory more than once
- Call create() before getting directory choice from user
- Stop after list_file_directory without asking for directory choice
- Ignore existing directories and suggest creating new ones
- Call a separate "create directory" tool (not needed - create() handles it)`;
		}

		return `# Guided Conversation Mode

You are an AI assistant in Guided Mode. Your role is to help the user achieve their goal by asking clarifying questions step-by-step.
${toolsInfo}

## Instructions:
1. Understand the user's goal: ${userQuery}
2. **MOST IMPORTANT: Focus on CONTENT first, not file operations!**
   - If creating/editing content: Ask about what content the user wants (format, fields, structure)
   - Show/generate the content for user review
   - Only after content is confirmed, then handle file operations (save location, filename)
${hasGetTimedateTool ? `3. **CRITICAL: When users ask about "latest", "recent", "current", or time-sensitive information:**
   - FIRST call the get_timedate tool to get the current date
   - **MANDATORY: Use the returned date to determine the correct time period**
   - For financial reports: Calculate the correct quarter/year from the current date
     * Example: If current date is 2025-10-30, latest quarterly report would be 2025 Q3
     * Example: If current date is 2025-01-15, latest quarterly report would be 2024 Q4
   - **When searching, MUST include the calculated year and quarter in your search query**
   - For news searches: Include the year from the current date (e.g., "Google earnings 2025 Q3")
   - Keywords: "latest", "recent", "current", "newest", "今天", "最新的", "最近的"` : ''}
${hasGetTimedateTool ? '4' : '3'}. Only ask questions if you genuinely need more information
${hasGetTimedateTool ? '5' : '4'}. Ask ONE specific question to clarify missing details
${hasGetTimedateTool ? '6' : '5'}. Provide 2-4 options for the user to choose from (if applicable)
${hasGetTimedateTool ? '7' : '6'}. **CRITICAL: Keep options SHORT and CLICKABLE!**
   - **Each option must be concise (简短精炼）**
   - **For directory choices: Just folder name + "/" (NO explanations in option text!)**
   - **For content choices: 15 characters or less preferred**
   - Add any explanations AFTER all options in a separate sentence/paragraph
${hasGetTimedateTool ? '8' : '7'}. Keep questions focused and easy to understand
${hasGetTimedateTool ? '9' : '8'}. **CRITICAL: Format user choice options with special marker "➤CHOICE:" prefix**
   - Single-choice questions (user selects ONE): "➤CHOICE:SINGLE"
   - Multi-choice questions (user can select MULTIPLE): "➤CHOICE:MULTI"
   - Then list options: "➤CHOICE: 1. Option A", "➤CHOICE: 2. Option B"
   - Regular numbered lists in content: "1. Point one", "2. Point two" (no ➤CHOICE: prefix)
   - This special marker ensures options are distinguished from regular markdown content
   - **IMPORTANT: Add selection mode marker BEFORE listing options**

## CRITICAL: Content Before Operations
- When user wants to create/modify notes: Focus on WHAT they want first
- Don't immediately jump to "where to save" or "what filename"
- File operations (directory selection, filename) come LAST, after content is ready
- Example: "Create a template" → Ask about template structure/fields → Generate content → Show preview → THEN ask where to save

## CRITICAL: Avoid Endless Question Loops
- If the user says "yes", "continue", "go ahead" - they want you to ACT, not ask more questions
- Review the conversation history - if the user has already provided information, USE IT
- Don't repeat questions that have already been answered
- If you have enough info to call a tool, CALL IT NOW

## Output Format:
- If you can call a tool with available info: CALL IT (user will see the tool execution)
- Otherwise: Ask your clarifying question with numbered options

## ⚠️ CRITICAL: Never Say You Will Call a Tool - Just Call It!
**The #1 mistake to avoid:**
- ❌ WRONG: Responding with "我将调用 list_file_directory..." or "I will call X tool" (TEXT ONLY - NO ACTION)
- ✅ CORRECT: Directly call the tool without announcement (ACTUAL TOOL CALL - TAKES ACTION)

**Rule: ACTIONS > WORDS**
- Don't tell users what you're going to do
- Don't explain which tool you'll use
- Just call the tool directly
- The system will show the tool execution to users
- You can add a brief explanation AFTER the tool succeeds (optional)

## Example of GOOD behavior:
User: "Create a reading notes template"
You: "读书笔记模板需要包含哪些内容？"
➤CHOICE:SINGLE
➤CHOICE: 1. 书籍信息+摘要
➤CHOICE: 2. 章节笔记+感想
➤CHOICE: 3. 思维导图式
➤CHOICE: 4. 自定义

User: "书籍信息+摘要"
You: [Shows template content with fields like: 书名、作者、阅读日期、关键摘要等]
You: "这个模板可以吗？需要调整吗？"

User: "可以"
You: [Calls list_file_directory({directoryPath: ""}) IMMEDIATELY - no explanation needed!]
[Tool executes and returns: folders: ["Book", "Template", "Daily", "模板"], files: ["README.md", "notes.md"]]
You: "请选择保存位置："
➤CHOICE:SINGLE
➤CHOICE: 1. Template/
➤CHOICE: 2. 模板/
➤CHOICE: 3. Book/

"Template/ 和 模板/ 都适合存放模板，Book/ 适合读书相关内容。"
[Note: Options are SHORT! Explanations come AFTER in separate sentence!]
[Note: NO "新建目录" option because existing directories are suitable!]

User: "Template"
You: [CALLS create({path: "Template/读书笔记模板.md", content: "..."}) IMMEDIATELY]
[Tool executes successfully]
You: "✅ 模板已创建！" (brief confirmation after tool succeeds)

## Example with NEW directory creation (when user explicitly wants it):
User: "Create a weekly review template"
You: [Discusses content, generates template, gets user confirmation]
You: [CALLS list_file_directory({directoryPath: ""}) IMMEDIATELY]
[Tool returns: folders: ["Daily", "Template"], files: [...]]
You: "请选择保存位置："
➤CHOICE:SINGLE
➤CHOICE: 1. Template/
➤CHOICE: 2. Daily/
➤CHOICE: 3. 新建目录: WeeklyReview/

"如果想专门管理周报，可以创建新目录。"

User: "新建目录: WeeklyReview/"
You: [CALLS create({path: "WeeklyReview/template.md", content: "..."}) IMMEDIATELY]
Note: The create() tool will automatically create the "WeeklyReview/" directory!
[Tool executes successfully]
You: "✅ 已创建 WeeklyReview/ 目录和模板文件！" (after create succeeds)

## CRITICAL: Keep Options SHORT and Use EXACT Directory Names!
**EXCELLENT Example (FOLLOW THIS):**
list_file_directory shows folders: ["Book", "Template", "Daily", "模板"] and files: ["README.md", "index.md"]
User wants to create book notes template
You respond:
"请选择保存位置："
➤CHOICE:SINGLE
➤CHOICE: 1. Template/
➤CHOICE: 2. 模板/
➤CHOICE: 3. Book/

"Template/ 适合模板存放，模板/ 是中文模板目录，Book/ 适合读书相关。"
[Options are SHORT! Just folder name + slash!] ✅✅✅
[NO explanations IN the option text!] ✅✅✅
[NO "新建目录" option - existing directories work perfectly!] ✅✅✅

**Example with multi-choice (user can select multiple):**
"请选择需要包含的故障复盘部分（可以多选）："
➤CHOICE:MULTI
➤CHOICE: 1. 故障概述
➤CHOICE: 2. 发生时间与影响范围
➤CHOICE: 3. 故障发现过程
➤CHOICE: 4. 根因分析
➤CHOICE: 5. 解决措施
➤CHOICE: 6. 预防措施与改进计划

**WRONG Example - Long Options with Explanations (NEVER DO THIS):**
list_file_directory shows folders: ["Template", "模板", "Book"]
User wants template
You suggest:
➤CHOICE:SINGLE
➤CHOICE: 1. Template/ (已有) - 通常用于存放各种类型的模板文件 ← WRONG! TOO LONG! ✗✗✗✗
➤CHOICE: 2. 模板/ (已有) - 如果存在专门存放书籍相关资料的文件夹 ← WRONG! TOO LONG! ✗✗✗✗
Correct format:
➤CHOICE:SINGLE
➤CHOICE: 1. Template/
➤CHOICE: 2. 模板/
Then add explanations separately: "Template/ 和 模板/ 都适合存放模板。" ✅

**WRONG Example - Name Mismatch (NEVER DO THIS):**
list_file_directory shows folders: ["Template", "模板", "Book"]
You suggest:
➤CHOICE:SINGLE
➤CHOICE: 1. Templates/ ← WRONG! Listing shows "Template" not "Templates"! ✗✗✗✗
➤CHOICE: 2. template/ ← WRONG! Case mismatch - listing shows "Template" with capital T! ✗✗✗
➤CHOICE: 3. Template/ ← ✅ CORRECT! Exact match with listing

**WRONG Example - Translation Error (NEVER DO THIS):**
list_file_directory shows folders: ["模板", "Book", "Template"]
You suggest:
➤CHOICE: 1. Templates/ ← WRONG! "模板" exists but you wrote "Templates"! ✗✗✗✗
Correct should be: "➤CHOICE: 1. 模板/" - use the EXACT Chinese name!

**GOOD Example (acceptable if user explicitly wants new folder):**
list_file_directory shows folders: ["Book", "Template", "Daily"]
User says: "Create a NEW folder for my special project notes"
You recommend:
➤CHOICE: 1. 新建目录
➤CHOICE: 2. Daily/
"Daily/ 可以作为备选。" ← Exact name "Daily" from listing ✅

**KEY RULES:**
1. Copy directory names EXACTLY from the listing result - no changes allowed!
2. Keep options SHORT - just folder name + "/" (no explanations in option text!)
3. Add explanations AFTER all options in a separate sentence

Always check existing directories and reuse them unless user explicitly needs a new one!

## Example of BAD behavior (DO NOT DO THIS):
User: "Create a reading notes template"
You: [Immediately calls list_file_directory] ← WRONG! Should ask about content first!
You: "应该保存到哪里？" ← WRONG! Content comes before location!

Or:
User: "Create a reading notes template"
You: "What filename?" ← WRONG! Ask about template structure/content first!

Or:
User: "Create a template"
You: [IMMEDIATELY calls create without discussing content] ← WRONG! No content discussion!

Or:
User: "Templates"
You: "好的" [STOPS after list_file_directory, doesn't call create] ← WRONG! Must call create()!

**CRITICAL: After list_file_directory, you MUST call create() to actually create the file!**
**list_file_directory only VIEWS folders and files, it doesn't create anything!**

**REMEMBER: Always explain WHY you are calling each tool before calling it!**

## User's Goal:
${userQuery}

Please either ask your first clarifying question OR call a tool if you have enough information.`;
	}
	
	/**
	 * Build follow-up prompt based on user response
	 */
	private buildFollowUpPrompt(userResponse: string, previousMessages: ChatMessage[]): string {
		// Get the last guided question for context
		const lastGuidedMessage = previousMessages.filter(m => m.metadata?.isGuidedQuestion).pop();
		const lastQuestion = lastGuidedMessage?.content || '';
		
		// Check if this is a tool execution result
		const isToolResult = typeof userResponse === 'string' && 
			(userResponse.includes('Tool executed successfully') || 
			 userResponse.includes('工具执行成功'));
		
		if (isToolResult) {
			// Check which tool was executed - different handling for different tools
			const isListDirectoryResult = userResponse.includes('list_file_directory') || userResponse.includes('list_directory');
			const isCreateResult = userResponse.includes('create');
			const isMoveNoteResult = userResponse.includes('move_note');
			const isGetTimedateResult = userResponse.includes('get_timedate');
			
			// Check if it's a search/news/web tool (matches any tool containing these keywords)
			const searchKeywords = ['search', 'news', 'web'];
			const isSearchResult = searchKeywords.some(keyword => 
				userResponse.toLowerCase().includes(keyword) && 
				!userResponse.toLowerCase().includes('fetch_web_content') // Exclude fetch_web_content from search category
			);
			
			const isFetchWebContentResult = userResponse.includes('fetch_web_content') || 
				userResponse.includes('fetch_content') || 
				userResponse.includes('browse');
			
			if (isSearchResult) {
				// Extract URLs from search/news/web tool result
				let urls: string[] = [];
				try {
					const toolResultMessage = previousMessages.filter(m => m.metadata?.toolResult).pop();
					if (toolResultMessage && toolResultMessage.metadata?.toolExecutions) {
						const toolExecutions = toolResultMessage.metadata.toolExecutions;
						if (toolExecutions && toolExecutions.length > 0) {
							const lastExecution = toolExecutions[toolExecutions.length - 1];
							const executionResult = lastExecution.result;
							
							// Extract URLs from the search result content - support multiple formats
							if (executionResult && executionResult.result) {
								const result = executionResult.result;
								
								// Format 1: result.content array (Tavily format)
								if (result.content && Array.isArray(result.content)) {
									for (const item of result.content) {
										if (item.type === 'text' && item.text) {
											// Extract URLs using multiple patterns
											// Pattern 1: "URL: https://..."
											const urlPattern1 = item.text.matchAll(/URL:\s*(https?:\/\/[^\s\n]+)/g);
											for (const match of urlPattern1) {
												urls.push(match[1]);
											}
											
											// Pattern 2: "url": "https://..." or 'url': 'https://...'
											const urlPattern2 = item.text.matchAll(/["']url["']:\s*["'](https?:\/\/[^"'\s]+)["']/gi);
											for (const match of urlPattern2) {
												urls.push(match[1]);
											}
											
											// Pattern 3: Standalone URLs in text
											const urlPattern3 = item.text.matchAll(/(?:^|\s)(https?:\/\/[^\s<>"{}|\\^`\[\]]+)(?:\s|$)/g);
											for (const match of urlPattern3) {
												urls.push(match[1].replace(/[,;.!?)]$/, '')); // Remove trailing punctuation
											}
										}
									}
								}
								
								// Format 2: Direct results array (some search APIs)
								if (result.results && Array.isArray(result.results)) {
									for (const item of result.results) {
										if (item.url) urls.push(item.url);
										if (item.link) urls.push(item.link);
										if (item.href) urls.push(item.href);
									}
								}
								
								// Format 3: Direct result object with url/link property
								if (typeof result === 'object') {
									if (result.url) urls.push(result.url);
									if (result.link) urls.push(result.link);
									if (result.links && Array.isArray(result.links)) {
										urls.push(...result.links);
									}
								}
								
								// Format 4: String result - extract URLs from plain text
								if (typeof result === 'string') {
									const urlPattern = result.matchAll(/(?:URL:|url:|link:|href:)?\s*(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi);
									for (const match of urlPattern) {
										urls.push(match[1].replace(/[,;.!?)]$/, ''));
									}
								}
							}
						}
					}
					
					// Remove duplicates and filter out invalid URLs
					urls = [...new Set(urls)].filter(url => {
						try {
							new URL(url);
							return true;
						} catch {
							return false;
						}
					});
					
					Logger.debug('Extracted URLs from search/news/web tool result:', urls);
				} catch (e) {
					Logger.error('Failed to extract URLs from search result:', e);
				}
				
				if (urls.length > 0) {
					return `IMPORTANT: Search tool has been executed successfully. Found ${urls.length} relevant URLs.

Original Goal: "${this.userGoal}"
Current Status: ⚠️ Search completed, but need to fetch detailed content from URLs

**CRITICAL NEXT STEP - BATCH FETCH WEB CONTENT:**

Found URLs:
${urls.map((url, index) => `${index + 1}. ${url}`).join('\n')}

**MANDATORY INSTRUCTIONS:**
1. You MUST now call the \`fetch_web_content\` tool to get the full content of ALL these URLs
2. ⚠️ IMPORTANT: Pass ALL URLs as an ARRAY in ONE single tool call for parallel fetching (much faster!)
3. The tool supports both single URL (string) and multiple URLs (array of strings, up to 10)
4. Select top 5-8 most relevant URLs to fetch
5. After fetching, combine contents with search results for comprehensive analysis

**YOUR NEXT ACTION:**
- DO NOT respond with text only - CALL THE TOOL NOW
- DO NOT call the tool multiple times for each URL separately
- ✅ CORRECT: Call fetch_web_content with an ARRAY of URLs in ONE call

**Example of CORRECT usage:**
✅ Call: fetch_web_content({
  url: [
    "${urls[0] || 'url1'}",
    "${urls[1] || 'url2'}",
    "${urls[2] || 'url3'}"
  ]
})

**Example of WRONG usage:**
❌ WRONG: "我将获取这些URL的内容..." (text only, no tool call!)
❌ WRONG: Call fetch_web_content({url: "${urls[0]}"}) then call again for next URL (inefficient, slow!)

Now IMMEDIATELY call fetch_web_content with an ARRAY containing 5-8 URLs:`;
				} else {
					// No URLs found, treat as regular completion
					return `IMPORTANT: The search tool has ALREADY BEEN EXECUTED successfully.

Task Status: ✅ SEARCH COMPLETED
Original Goal: "${this.userGoal}"
Action Taken: Search successfully executed

Based on the search results, provide a comprehensive analysis addressing the user's request.

YOUR RESPONSE MUST:
1. Analyze the search results thoroughly
2. Answer the user's question based on the data found
3. NOT call the search tool again

Now provide your analysis:`;
				}
			} else if (isFetchWebContentResult) {
				// Check how many web content fetch operations have been done
				const fetchKeywords = ['fetch_web_content', 'fetch_content', 'browse'];
				const webContentMessages = previousMessages.filter(m => 
					m.metadata?.toolResult && 
					m.metadata?.toolExecutions?.some((exec: any) => 
						fetchKeywords.some(keyword => exec.toolName?.toLowerCase().includes(keyword))
					)
				);
				
				// Extract the latest fetched URL and check if there are more URLs to fetch
				let remainingUrls: string[] = [];
				let fetchedUrlCount = webContentMessages.length;
				
				try {
					// Find the original search result to get all URLs (search for any tool with search/news/web keywords)
					const searchKeywords = ['search', 'news', 'web'];
					const searchResultMessage = previousMessages.find(m => 
						m.metadata?.toolResult && 
						m.metadata?.toolExecutions?.some((exec: any) => {
							const toolName = exec.toolName?.toLowerCase() || '';
							return searchKeywords.some(keyword => toolName.includes(keyword)) &&
								!fetchKeywords.some(fk => toolName.includes(fk)); // Exclude fetch tools
						})
					);
					
					if (searchResultMessage && searchResultMessage.metadata?.toolExecutions) {
						const searchExecution = searchResultMessage.metadata.toolExecutions.find(
							(exec: any) => {
								const toolName = exec.toolName?.toLowerCase() || '';
								return searchKeywords.some(keyword => toolName.includes(keyword)) &&
									!fetchKeywords.some(fk => toolName.includes(fk));
							}
						);
						
						if (searchExecution && searchExecution.result && searchExecution.result.result) {
							const result = searchExecution.result.result;
							const allUrls: string[] = [];
							
							// Extract URLs using the same comprehensive logic as in isSearchResult
							// Format 1: result.content array
							if (result.content && Array.isArray(result.content)) {
								for (const item of result.content) {
									if (item.type === 'text' && item.text) {
										// Multiple URL patterns
										const patterns = [
											/URL:\s*(https?:\/\/[^\s\n]+)/g,
											/["']url["']:\s*["'](https?:\/\/[^"'\s]+)["']/gi,
											/(?:^|\s)(https?:\/\/[^\s<>"{}|\\^`\[\]]+)(?:\s|$)/g
										];
										
										for (const pattern of patterns) {
											const matches = item.text.matchAll(pattern);
											for (const match of matches) {
												const url = match[1].replace(/[,;.!?)]$/, '');
												allUrls.push(url);
											}
										}
									}
								}
							}
							
							// Format 2: results array
							if (result.results && Array.isArray(result.results)) {
								for (const item of result.results) {
									if (item.url) allUrls.push(item.url);
									if (item.link) allUrls.push(item.link);
									if (item.href) allUrls.push(item.href);
								}
							}
							
							// Format 3: direct properties
							if (typeof result === 'object') {
								if (result.url) allUrls.push(result.url);
								if (result.link) allUrls.push(result.link);
								if (result.links && Array.isArray(result.links)) {
									allUrls.push(...result.links);
								}
							}
							
						// Get already fetched URLs (handle both single URLs and batch arrays)
						const fetchedUrls: string[] = [];
						for (const msg of webContentMessages) {
							const execution = msg.metadata?.toolExecutions?.find((exec: any) => 
								fetchKeywords.some(keyword => exec.toolName?.toLowerCase().includes(keyword))
							);
							
							if (execution) {
								// Extract URLs from parameters
								const urlParam = execution.parameters?.url;
								if (urlParam) {
									// Try to parse as JSON array (batch fetch)
									try {
										const parsed = JSON.parse(urlParam);
										if (Array.isArray(parsed)) {
											fetchedUrls.push(...parsed);
										} else {
											fetchedUrls.push(urlParam);
										}
									} catch {
										// Not JSON, treat as single URL
										fetchedUrls.push(urlParam);
									}
								}
								
								// Also extract URLs from result.results array (more reliable for batch fetch)
								if (execution.result?.result?.results && Array.isArray(execution.result.result.results)) {
									for (const item of execution.result.result.results) {
										if (item.url && item.success) {
											fetchedUrls.push(item.url);
										}
									}
								}
							}
						}							// Calculate remaining URLs (filter out invalid and already fetched)
							const validUrls = [...new Set(allUrls)].filter(url => {
								try {
									new URL(url);
									return true;
								} catch {
									return false;
								}
							});
							
							remainingUrls = validUrls.filter(url => !fetchedUrls.includes(url));
						}
					}
				} catch (e) {
					Logger.error('Failed to calculate remaining URLs:', e);
				}
				
				Logger.debug('Fetched URLs count:', fetchedUrlCount, 'Remaining URLs:', remainingUrls.length);
				
				// Check if the last fetch was a batch operation (multiple URLs in one call)
				let lastFetchWasBatch = false;
				if (webContentMessages.length > 0) {
					const lastFetchMsg = webContentMessages[webContentMessages.length - 1];
					const lastExecution = lastFetchMsg.metadata?.toolExecutions?.find((exec: any) => 
						fetchKeywords.some(keyword => exec.toolName?.toLowerCase().includes(keyword))
					);
					
					if (lastExecution) {
						// Check if result has multiple URLs (batch fetch)
						const resultCount = lastExecution.result?.result?.totalUrls || 
											lastExecution.result?.result?.results?.length || 0;
						if (resultCount > 1) {
							lastFetchWasBatch = true;
							Logger.debug('Last fetch was a BATCH operation with', resultCount, 'URLs');
						}
					}
				}
				
				// If last fetch was batch and got most/all URLs, don't suggest individual fetches
				// If there are remaining URLs and we haven't fetched too many yet, continue fetching
				if (remainingUrls.length > 0 && fetchedUrlCount < 5 && !lastFetchWasBatch) {
					return `IMPORTANT: fetch_web_content executed successfully. URL content has been retrieved.

Original Goal: "${this.userGoal}"
Current Status: ⚠️ Content fetched (${fetchedUrlCount}/~5), more URLs available

**REMAINING URLs TO FETCH:**
${remainingUrls.slice(0, 5 - fetchedUrlCount).map((url, index) => `${index + 1}. ${url}`).join('\n')}

**CRITICAL NEXT STEP:**
1. You have successfully fetched ${fetchedUrlCount} URL(s)
2. There are ${remainingUrls.length} more relevant URLs from the search results
3. **MANDATORY: Continue calling \`fetch_web_content\` for the next URL to gather comprehensive information**
4. Target: Fetch up to 5 URLs total for thorough analysis

**YOUR NEXT ACTION:**
- DO NOT respond with text only
- DO NOT provide analysis yet (need more content first)
- IMMEDIATELY call \`fetch_web_content\` for the next URL: ${remainingUrls[0]}
- After fetching all priority URLs, then provide comprehensive analysis

Example:
❌ WRONG: "我已经获取了内容，现在进行分析..." (premature analysis!)
✅ CORRECT: Call fetch_web_content({url: "${remainingUrls[0]}"}) (continue fetching)

Now IMMEDIATELY call fetch_web_content for the next URL:`;
				} else {
					// All URLs fetched or reached limit, or last fetch was batch - now provide comprehensive analysis
					const batchFetchNote = lastFetchWasBatch ? 
						'\n**NOTE:** URLs were batch-fetched efficiently in one operation - all content is ready!' : '';
					
					return `IMPORTANT: All priority web content has been fetched successfully.

Task Status: ✅ CONTENT GATHERING COMPLETED${batchFetchNote}
Original Goal: "${this.userGoal}"
Action Taken: Successfully fetched ${fetchedUrlCount} URL(s) with detailed content

**CRITICAL NEXT STEP - COMPREHENSIVE ANALYSIS:**

You now have:
1. Original search results (summaries)
2. Full content from ${fetchedUrlCount} detailed web pages
3. All necessary information to provide in-depth analysis

**MANDATORY INSTRUCTIONS FOR YOUR RESPONSE:**
1. **Synthesize ALL information:**
   - Combine search result summaries with fetched web page details
   - Cross-reference data points across multiple sources
   - Identify key themes, trends, and insights

2. **Provide DEEP ANALYSIS:**
   - Go beyond surface-level summaries
   - Include specific numbers, statistics, and facts from the fetched content
   - Explain implications and context
   - Address ALL aspects of the user's original request

3. **Structure your analysis clearly:**
   - Use headings and bullet points for readability
   - Cite sources when mentioning specific data
   - Provide actionable insights or conclusions

4. **DO NOT:**
   - Simply summarize one source
   - Call any more tools
   - Say "任务完成" without providing detailed analysis
   - Ask questions or request confirmation

**Example structure:**
# [Topic] 深度分析

## 核心发现
[Key findings from all sources]

## 详细数据分析
[Specific numbers and trends]

## 深入洞察
[Implications and context]

## 总结
[Comprehensive conclusion]

Now provide your COMPREHENSIVE ANALYSIS based on all fetched content:`;
				}
			} else if (isGetTimedateResult) {
				// Extract the date from tool result
				let currentDate = '';
				try {
					const toolResultMessage = previousMessages.filter(m => m.metadata?.toolResult).pop();
					if (toolResultMessage && toolResultMessage.metadata?.toolExecutions) {
						const toolExecutions = toolResultMessage.metadata.toolExecutions;
						if (toolExecutions && toolExecutions.length > 0) {
							const lastExecution = toolExecutions[toolExecutions.length - 1];
							const executionResult = lastExecution.result;
							if (executionResult && executionResult.result) {
								currentDate = executionResult.result.date || executionResult.result;
							}
						}
					}
				} catch (e) {
					Logger.error('Failed to extract date from tool result:', e);
				}
				
				return `IMPORTANT: You have successfully retrieved the current date: ${currentDate}

## CRITICAL NEXT STEP - YOU MUST USE THIS DATE:
The user's request was: "${this.userGoal}"

**MANDATORY DATE USAGE INSTRUCTIONS:**
1. **Calculate the correct time period from ${currentDate}:**
   - For financial reports: 
     * If month is 01-03: Previous quarter is Q4 of previous year
     * If month is 04-06: Previous quarter is Q1 of current year  
     * If month is 07-09: Previous quarter is Q2 of current year
     * If month is 10-12: Previous quarter is Q3 of current year
   - Current date ${currentDate} → Extract year: ${currentDate.split('-')[0]}
   
2. **When calling the NEXT tool (search/browse):**
   - You MUST include the calculated year and quarter in your search query
   - Example query format: "Google earnings ${currentDate.split('-')[0]} Q3"
   - Example query format: "Google财报 ${currentDate.split('-')[0]}年第三季度"
   - DO NOT search for previous years unless explicitly requested
   
3. **Your next action:**
   - Call the appropriate search/browse tool with the date-aware query
   - DO NOT respond with text only - CALL THE TOOL NOW
   - DO NOT ask for confirmation - proceed immediately

Example for current date ${currentDate}:
❌ WRONG: Search for "Google earnings 2024 Q3" (wrong year!)
✅ CORRECT: Search for "Google earnings ${currentDate.split('-')[0]} Q3" (using current year)

Now IMMEDIATELY call the next tool with the correct date-aware query:`;
			} else if (isListDirectoryResult) {
				// Parse the actual directory listing from the tool result message in previousMessages
				let directoryListing = '';
				let folders: string[] = [];
				let files: string[] = [];
				
				try {
					// Find the last tool result message in previousMessages
					const toolResultMessage = previousMessages.filter(m => m.metadata?.toolResult).pop();
					Logger.debug('Found tool result message:', toolResultMessage);
					
					if (toolResultMessage && toolResultMessage.metadata?.toolExecutions) {
						// Get the tool execution data from metadata
						const toolExecutions = toolResultMessage.metadata.toolExecutions;
						if (toolExecutions && toolExecutions.length > 0) {
							const lastExecution = toolExecutions[toolExecutions.length - 1];
							const executionResult = lastExecution.result;
							Logger.debug('Tool execution result:', executionResult);
							
							// Extract folder and file lists from the result
							// The structure is: executionResult.result.listing (not just executionResult.listing)
							if (executionResult && executionResult.result && executionResult.result.listing) {
								folders = executionResult.result.listing.folders || [];
								files = executionResult.result.listing.files || [];
								directoryListing = `
**Folders found:** ${folders.length > 0 ? folders.map(f => `"${f}"`).join(', ') : 'None'}
**Files found:** ${files.length > 0 ? files.slice(0, 10).join(', ') : 'None'}${files.length > 10 ? ` (and ${files.length - 10} more...)` : ''}`;
								Logger.debug('Extracted directories:', { folders, files: files.length });
							} else {
								Logger.warn('Tool result does not contain listing. Structure:', executionResult);
							}
						} else {
							Logger.warn('No tool executions found in metadata');
						}
					} else {
						Logger.warn('No tool result message found in previousMessages');
					}
				} catch (error) {
					Logger.error('Error parsing list_file_directory result:', error);
				}
				
				Logger.debug('Building prompt with directory listing:', directoryListing);
				
				// list_file_directory is just a READ operation showing both folders and files - must continue to create
				return `IMPORTANT: list_file_directory tool has been executed successfully (READ-ONLY operation).

===== ACTUAL DIRECTORY LISTING (USE THESE EXACT NAMES!) =====
${directoryListing}
=============================================================

Original Goal: "${this.userGoal}"
Current Status: ⚠️ INCOMPLETE - File not yet created!

CRITICAL INSTRUCTIONS FOR PRESENTING DIRECTORY OPTIONS:
1. The directory listing is now available (folders + files) - DO NOT call list_file_directory again
2. **MANDATORY: You MUST ONLY use directory names from the "Folders found:" list above**
   - DO NOT use any directory name that is not in the list!
   - DO NOT make up, translate, or modify directory names!
   - If you show a directory, it MUST appear EXACTLY in the "Folders found:" line
3. **PRIORITY: Analyze existing directories and find the BEST MATCH for the user's content**
   - Look for directories that match the content type (e.g., "Book" for book notes, "Template" for templates)
   - Consider semantic similarity (e.g., "Notes" for note-taking, "Projects" for project files)
   - Check for plural/singular variations - use EXACT name from list (e.g., if list has "Book", use "Book", NOT "Books")
4. Present 2-3 EXISTING directory options to the user (prioritize most relevant ones from the list)
5. **CRITICAL: Use EXACT directory names from "Folders found:" - DO NOT modify, translate, or change them!**
   - ✅ CORRECT: If "Folders found:" shows "Template", use "Template/" (exact match)
   - ✅ CORRECT: If "Folders found:" shows "模板", use "模板/" (exact match)
   - ✅ CORRECT: If "Folders found:" shows "Book", use "Book/" (exact match with capital B)
   - ✗ WRONG: If "Folders found:" shows "Template", DO NOT use "Templates/" (not in the list!)
   - ✗ WRONG: If "Folders found:" shows "模板", DO NOT use "Template/" (not in the list!)
   - ✗ WRONG: Changing case, adding/removing letters, or translating names
   - **VERIFICATION STEP: Before suggesting any directory, CHECK if it appears in "Folders found:" line**
6. **CRITICAL FORMAT - Keep options SHORT and CLICKABLE:**
   - **Option format: "➤CHOICE: 1. FolderName/"** (NO explanations in the option itself!)
   - ✅ CORRECT: "➤CHOICE: 1. Template/"
   - ✅ CORRECT: "➤CHOICE: 2. Books/"
   - ✅ CORRECT: "➤CHOICE: 3. 模板/"
   - ✗ WRONG: "➤CHOICE: 1. Template/ (已有) - 通常用于存放各种类型的模板文件" (TOO LONG!)
   - ✗ WRONG: "➤CHOICE: 1. Template/ (已有) - 适用于存放各种模板" (TOO LONG!)
   - **Maximum option length: Directory name + "/" only**
   - You can add brief explanations AFTER all options are listed, in a separate paragraph
7. **ONLY include "新建目录" option if:**
   - User explicitly mentioned creating a new directory/folder in their original request, OR
   - NO existing directory is suitable for this type of content
   - If you must include it, add as last option: "➤CHOICE: N. 新建目录"
8. **CRITICAL: Options must be CONSECUTIVE - NO text between options!**
   - ✅ CORRECT format (options listed consecutively):
     * "➤CHOICE: 1. Template/"
     * "➤CHOICE: 2. Books/"  
     * "➤CHOICE: 3. Notes/"
   - ✗ WRONG format (text between options breaks extraction):
     * "➤CHOICE: 1. Template/"
     * "这是模板目录" ← NO! This text breaks option extraction!
     * "➤CHOICE: 2. Books/"
   - **All options MUST be listed together WITHOUT any text in between**
   - Empty lines between options are OK, but NO explanatory text or comments
   - Explanations must come AFTER all options are listed
9. **Output format - Present options cleanly:**
   - Line 1: Ask user to choose (e.g., "请选择保存位置：")
   - Line 2: Blank line (optional)
   - Lines 3-N: List ALL options consecutively, one per line, NO text between them
   - Line N+1: Blank line
   - Line N+2: Brief explanations in a single paragraph AFTER all options
   - Example output:
     * "请选择保存位置："
     * (blank line)
     * "➤CHOICE: 1. Template/"
     * "➤CHOICE: 2. Books/"
     * "➤CHOICE: 3. Notes/"
     * (blank line)
     * "Template/ 适合存放模板，Books/ 适合书籍相关内容。"
10. WAIT for user's directory choice - do NOT call any tools yet
11. After user chooses, you will call create() tool in the next step

**ABSOLUTE RULE: NEVER INVENT OR MODIFY DIRECTORY NAMES!**
- You MUST copy directory names EXACTLY as they appear in "Folders found:" line
- Do NOT change "Template" to "Templates" or "模板" to "Template"
- Do NOT change capitalization (e.g., "Book" is not "book")
- Every directory you suggest MUST be verified to exist in the "Folders found:" list
- If you show a directory as "(已有)" or existing, it MUST appear in "Folders found:" line

IMPORTANT MINDSET:
- **Default to using existing directories** - this keeps the vault organized
- Creating new directories should be the EXCEPTION, not the default
- If unsure between existing directory or new one, ALWAYS prefer existing
- **Use EXACT names - accuracy is critical!**

DO NOT:
- Call list_directory again (already done!)
- Call create() tool yet (need user's directory choice first)
- Say "任务完成" (task not complete)
- Automatically suggest "新建目录" without checking if existing directories work
- Ignore the semantic meaning of existing directory names
- **Modify, translate, or change existing directory names in any way**
- Mark a directory as "(已有)" if it doesn't appear in the listing

Now present the directory options based on the listing result (check both folders and files):`;
			} else if (isCreateResult) {
				// create tool completed - task is done
				return `IMPORTANT: The create tool has ALREADY BEEN EXECUTED successfully.

Task Status: ✅ COMPLETED
Original Goal: "${this.userGoal}"
Action Taken: File successfully created

YOUR RESPONSE MUST:
1. Start with "✅ 任务完成！" or "✅ Task completed!"
2. Briefly confirm what was created (1 sentence)
3. NOT suggest any more actions
4. NOT ask any questions
5. NOT mention using any tools (the tool was already used)

Example response:
"✅ 任务完成！我已经为您创建了读书笔记模板，您可以在 Templates 文件夹中找到它。"

Now provide your brief confirmation (2 sentences maximum):`;
			} else if (isMoveNoteResult) {
				// move_note tool executed - check if there are more files to organize
				// CRITICAL: This is for file organization tasks - must check for remaining files
				return `IMPORTANT: move_note tool has been executed successfully. But this is only ONE BATCH!

===== CURRENT SITUATION =====
Task Type: FILE ORGANIZATION (整理文件)
Original Goal: "${this.userGoal}"
Status: ⚠️ PARTIAL COMPLETION - Only one batch of files has been moved
User Expectation: **AUTOMATIC** classification of **ALL** root directory files
============================

🚨 CRITICAL NEXT STEP - DO NOT ASK USER FOR PERMISSION! 🚨

The user requested "自动常见主题分类" (AUTOMATIC topic classification).
"自动" means AUTOMATIC - you must continue WITHOUT asking for permission!

**MANDATORY ACTION SEQUENCE:**
1. **IMMEDIATELY call list_file_directory tool** with empty path to check remaining root files:
   - Call: list_file_directory({directoryPath: ""})
   - This will show if there are more files to organize

2. **After receiving directory listing:**
   - If files remain in root: Continue classification for next batch
     * Analyze the remaining files by topic/content
     * Call move_note again for the next batch of related files
     * Repeat until ALL root files are organized
   - If NO files remain in root: Show completion message
     * "✅ 任务完成！所有根目录文件已成功整理到对应文件夹中。"

3. **DO NOT:**
   - Ask "还需要继续整理其他文件吗？" (This breaks automatic mode!)
   - Wait for user confirmation between batches
   - Stop until ALL files are organized or task is complete

**VERIFICATION CHECKLIST:**
- ✅ Batch successfully moved
- ❌ More files may remain in root (need to verify)
- ❌ Task is NOT complete yet

**YOUR IMMEDIATE ACTION:**
Call list_file_directory({directoryPath: ""}) RIGHT NOW to check for remaining files.
Do NOT write any explanation first - just CALL THE TOOL!`;
			} else {
				// Other tools - generic completion message
				return `IMPORTANT: The tool has ALREADY BEEN EXECUTED successfully. DO NOT suggest executing it again.

Task Status: ✅ COMPLETED
Original Goal: "${this.userGoal}"
Action Taken: Tool successfully executed

YOUR RESPONSE MUST:
1. Start with "✅ 任务完成！" or "✅ Task completed!"
2. Briefly confirm what was done (1 sentence)
3. NOT suggest any more actions
4. NOT ask any questions

Now provide your brief confirmation (2 sentences maximum):`;
			}
		}
		
		// Check if user is giving confirmation to proceed
		const confirmationKeywords = ['确认', '保存', 'yes', 'ok', '好的', '可以', 'continue', 'proceed', 'go ahead'];
		const isConfirmation = confirmationKeywords.some(keyword => 
			userResponse.toLowerCase().includes(keyword)
		);
		
		return `# Guided Conversation - Follow-up

## Previous Context:
Original Goal: ${this.userGoal}
Step ${this.currentStep - 1}: ${lastQuestion}
User Response: ${userResponse}

## CRITICAL Decision Point:
User said: "${userResponse}"
${isConfirmation ? '\n⚠️ USER IS CONFIRMING TO PROCEED - YOU MUST ACT NOW!\n' : ''}

${isConfirmation ? `
## MANDATORY ACTION REQUIRED:
The user has given CONFIRMATION to proceed. You MUST:
1. Review the conversation history to gather all necessary information
2. CALL THE APPROPRIATE TOOL IMMEDIATELY - do NOT ask permission again
3. If creating content: Use the create() tool with path and content from previous messages
4. DO NOT respond with text explaining what you will do - just CALL THE TOOL
5. If you return ONLY text without a tool call, you are FAILING the user's request

Example: If user confirmed to save a file:
- ❌ WRONG: Respond with "好的，我现在为您创建文件" (text only - does nothing!)
- ✅ CORRECT: Call create({path: "...", content: "..."}) (actual tool call)

YOU MUST CALL A TOOL NOW. Text-only responses are NOT acceptable when user confirms.
` : `
If user response indicates they want to proceed (e.g., "yes", "continue", "go ahead", "是的", "继续", "确认", "保存"):
→ STOP asking questions and CALL THE APPROPRIATE TOOL NOW
→ Review conversation history to gather all parameters needed
→ DO NOT ask "should I continue?" again
→ DO NOT respond with text only - you MUST call a tool

If user provided new information or made a choice:
→ Determine if you now have enough information to call a tool
→ If YES: CALL THE TOOL (not just say you will)
→ If NO: Ask ONE more specific question
`}

## Instructions:
Based on the user's response, either:
1. CALL A TOOL if you have enough information (PREFERRED - don't keep asking!)
2. Ask ONE more clarifying question ONLY if critical information is still missing
3. Provide a final answer if no tools are needed

## Examples:
❌ BAD: "I will use create tool. Should I continue?" (asking permission again)
❌ BAD: "好的，我现在为您创建文件。" (text only, no tool call)
✅ GOOD: [Actually call the create tool with all gathered info]

❌ BAD: Asking the same question repeatedly
✅ GOOD: Review history, use information already provided

If asking another question:
- Make sure it's NEW information, not already provided
- Keep it focused and specific
- Provide numbered options if applicable

If calling a tool:
- Use ALL information gathered from previous responses
- Construct complete parameters from conversation history
- Execute immediately without asking permission
- DO NOT return empty text - the tool call itself is the response

Please proceed with the next appropriate step.`;
	}
	
	/**
	 * Extract numbered options and selection mode from AI response
	 */
	private extractOptionsFromResponse(content: string): { options: string[], isMultiSelect: boolean } {
		const options: string[] = [];
		let isMultiSelect = false;
		
		// Match lines with ➤CHOICE: prefix
		const lines = content.split('\n');
		
		for (const line of lines) {
			// Check for selection mode marker
			if (line.match(/^\s*➤CHOICE:\s*MULTI\s*$/i)) {
				isMultiSelect = true;
				continue;
			}
			if (line.match(/^\s*➤CHOICE:\s*SINGLE\s*$/i)) {
				isMultiSelect = false;
				continue;
			}
			
			// Look for "➤CHOICE: 1. Text" or "➤CHOICE:1. Text" format
			const match = line.match(/^\s*➤CHOICE:\s*(\d+)\.\s*(.+)$/i);
			if (match) {
				const optionText = match[2].trim();
				// Only add non-empty options
				if (optionText && optionText.length > 0) {
					options.push(optionText);
				}
			}
		}
		
		return { options, isMultiSelect };
	}
	
	/**
	 * Create option buttons UI for guided mode
	 */
	createOptionButtons(options: string[], onSelect: (option: string, index: number) => void): HTMLElement {
		const container = this.messageContainer.createDiv({ cls: 'llmsider-guided-options' });
		
		options.forEach((option, index) => {
			const button = container.createEl('button', {
				cls: 'llmsider-guided-option-btn',
				text: `${index + 1}. ${option}`
			});
			
			button.onclick = () => {
				// Disable all buttons after selection
				container.querySelectorAll('.llmsider-guided-option-btn').forEach(btn => {
					btn.setAttribute('disabled', 'true');
					btn.classList.add('disabled');
				});
				
				// Highlight selected button
				button.classList.add('selected');
				
				// Call selection handler
				onSelect(option, index);
			};
		});
		
		return container;
	}
	
	/**
	 * Reset guided mode state
	 */
	reset(): void {
		this.currentStep = 0;
		this.conversationContext = '';
		this.userGoal = '';
	}
}
