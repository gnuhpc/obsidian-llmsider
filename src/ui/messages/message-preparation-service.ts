/**
 * MessagePreparationService - 负责准备发送给 LLM 的消息
 * 
 * 职责：
 * - 构建消息列表（系统消息 + 历史消息 + 用户消息）
 * - 生成系统提示词
 * - 处理 Vector Search
 * - 处理多模态内容（图片、文件）
 * - Token 管理和截断
 */

import { ChatMessage, ChatSession, ResolvedSkill } from '../../types';
import { Logger } from '../../utils/logger';
import type LLMSiderPlugin from '../../main';
import type { ContextManager } from '../../core/context-manager';
import type { ToolCoordinator } from '../tools/tool-coordinator';
import type { UIBuilder } from '../ui-builder';
import { TokenManager } from '../../utils/token-manager';
import { Notice } from 'obsidian';

const RUN_LOCAL_COMMAND_TOOL = 'run_local_command';

export interface IMessagePreparationService {
	/**
	 * 准备要发送给 LLM 的消息列表
	 */
	prepareMessages(
		userMessage: ChatMessage,
		stepIndicatorsEl: HTMLElement | null,
		memoryContext: string,
		memoryMessages: ChatMessage[] | null,
		memoryEnabled: boolean,
		routedSkill?: ResolvedSkill | null
	): Promise<ChatMessage[]>;

	/**
	 * 生成系统提示词
	 */
	getSystemPrompt(memoryContext?: string, userInput?: string, routedSkill?: ResolvedSkill | null): Promise<string>;

	/**
	 * 更新步骤指示器状态
	 */
	updateStepIndicator(
		container: HTMLElement | null,
		stepName: string,
		state: 'pending' | 'active' | 'completed'
	): void;

	/**
	 * 显示 Vector Search 结果
	 */
	displayVectorSearchResults(container: HTMLElement | null, results: any[]): void;

	/**
	 * 自动生成会话标题
	 */
	autoGenerateSessionTitle(userMessage: ChatMessage, assistantMessage: ChatMessage): Promise<void>;

	/**
	 * 从内容中提取最终答案（移除思考过程）
	 */
	extractFinalAnswer(content: string): string;
}

export interface MessagePreparationCallbacks {
	getCurrentSession: () => ChatSession | null;
	updateStepIndicator: (
		container: HTMLElement | null,
		stepName: string,
		state: 'pending' | 'active' | 'completed'
	) => void;
	displayVectorSearchResults: (container: HTMLElement | null, results: any[]) => void;
	updateSession: (sessionId: string, updates: Partial<ChatSession>) => Promise<void>;
	updateSessionNameDisplay: (name: string) => void;
}

export class MessagePreparationService implements IMessagePreparationService {
	constructor(
		private plugin: LLMSiderPlugin,
		private contextManager: ContextManager,
		private toolCoordinator: ToolCoordinator,
		private uiBuilder: UIBuilder,
		private callbacks: MessagePreparationCallbacks
	) { }

	/**
	 * 准备要发送给 LLM 的消息列表
	 */
	async prepareMessages(
		userMessage: ChatMessage,
		stepIndicatorsEl: HTMLElement | null = null,
		memoryContext = '',
		memoryMessages: ChatMessage[] | null = null,
		memoryEnabled = false,
		routedSkill: ResolvedSkill | null = null
	): Promise<ChatMessage[]> {
		const messages: ChatMessage[] = [];
		const hasContext = this.contextManager.hasContext();
		const includeExtrasWithContext = this.plugin.settings.contextSettings?.includeExtrasWithContext ?? false;
		const allowExtraContext = !hasContext || includeExtrasWithContext;
		const currentSession = this.callbacks.getCurrentSession();
		const guidedModeEnabled = currentSession?.guidedModeEnabled ?? this.plugin.settings.guidedModeEnabled ?? false;
		const shouldIncludeConversationHistory =
			this.plugin.settings.memorySettings.enableConversationHistory &&
			(allowExtraContext || guidedModeEnabled);

		// Add system message
		const rawUserInput = typeof userMessage.content === 'string' ? userMessage.content : '';
		const systemPrompt = await this.getSystemPrompt(memoryContext, rawUserInput, routedSkill);

		// Add local vector search context if auto-search is enabled
		// Skip during plugin initialization and session loading to prevent startup vector generation
		let vectorSearchContext = '';

		if (allowExtraContext && this.plugin.settings.vectorSettings.autoSearchEnabled &&
			this.plugin.state.isLoaded &&
			!this.plugin.state.isLoadingSession) {
			// Update step indicator to active
			this.updateStepIndicator(stepIndicatorsEl, 'vector-search', 'active');

			const vectorDBManager = this.plugin.getVectorDBManager();
			const isInitialized = vectorDBManager?.isSystemInitialized();

			if (vectorDBManager && isInitialized) {
				try {
					const status = vectorDBManager.getStatus();

					if (status.totalChunks > 0) {
						// Extract query from user message
						const query =
							typeof userMessage.content === 'string' ? userMessage.content : '';

						if (query) {
							Logger.debug('Performing local vector search for:', query);
							const results = await vectorDBManager.search(query);

							if (results.length > 0) {
								vectorSearchContext = `\n\n## Related Content from Your Vault\n\n${vectorDBManager.formatSearchResults(results)}`;

								// Log detailed information about each result
								Logger.debug(`Added ${results.length} vector search results to context:`);
								results.forEach((item, index) => {
									Logger.debug(`  [${index + 1}] File: ${item.filePath}`);
									Logger.debug(`      Score: ${(item.score * 100).toFixed(1)}%`);
									Logger.debug(
										`      Content preview: ${item.content.substring(0, 100)}...`
									);
								});

								// Log the formatted context that will be sent to LLM
								Logger.debug(
									'Formatted vector search context length:',
									vectorSearchContext.length,
									'chars'
								);
								Logger.debug(
									'Vector search context preview:',
									vectorSearchContext.substring(0, 500) + '...'
								);

								// Display search results summary in UI
								this.displayVectorSearchResults(stepIndicatorsEl, results);
							}
						}
					}
				} catch (error) {
					Logger.error('Vector search failed:', error);
				}
			}

			// Mark vector search as completed
			this.updateStepIndicator(stepIndicatorsEl, 'vector-search', 'completed');
		}

		const systemMessage: ChatMessage = {
			id: 'system-' + Date.now(),
			role: 'system',
			content: systemPrompt + vectorSearchContext,
			timestamp: Date.now()
		};

		// Debug trace: verify global prompt suffix is injected into the outgoing system message.
		const globalPromptPreConstraint = this.plugin.getGlobalPromptPreConstraint();
		const globalPromptSuffix = this.plugin.getGlobalPromptSuffix();
		Logger.debug('[MessagePrep] Global prompt injection check', {
			hasGlobalPromptPreConstraint: globalPromptPreConstraint.length > 0,
			globalPromptPreConstraintLength: globalPromptPreConstraint.length,
			systemPromptIncludesGlobalPreConstraint: globalPromptPreConstraint.length > 0
				? systemPrompt.includes(globalPromptPreConstraint)
				: false,
			finalSystemMessageIncludesGlobalPreConstraint: globalPromptPreConstraint.length > 0
				? systemMessage.content.includes(globalPromptPreConstraint)
				: false,
			hasGlobalPromptSuffix: globalPromptSuffix.length > 0,
			globalPromptSuffixLength: globalPromptSuffix.length,
			systemPromptIncludesGlobalSuffix: globalPromptSuffix.length > 0
				? systemPrompt.includes(globalPromptSuffix)
				: false,
			finalSystemMessageIncludesGlobalSuffix: globalPromptSuffix.length > 0
				? systemMessage.content.includes(globalPromptSuffix)
				: false
		});

		// Add chat history: use Memory messages if available, no manual history fallback
		let chatHistory: ChatMessage[] = [];
		const currentUserContent = typeof userMessage.content === 'string'
			? userMessage.content
			: JSON.stringify(userMessage.content);

		// Check if conversation history is enabled in settings
		if (shouldIncludeConversationHistory) {
			// Strategy: Try Memory first, then Local
			let usedMemoryHistory = false;
			const limit = this.plugin.settings.memorySettings.conversationHistoryLimit || 10;

			// 1. Try to use Memory-provided messages (if Memory is enabled and has data)
			if (memoryEnabled && memoryMessages && memoryMessages.length > 0) {
				chatHistory = memoryMessages;

				// Apply history limit to memory messages too
				if (chatHistory.length > limit) {
					chatHistory = chatHistory.slice(-limit);
					Logger.debug(`[Memory] 🔄 Truncated Memory history to ${limit} messages`);
				}

				usedMemoryHistory = true;
				Logger.debug(
					'[Memory] 🔄 Using Memory-managed history:',
					chatHistory.length,
					'messages'
				);
			}

			// 2. Fallback to Local Session messages (if Memory didn't provide history)
			if (!usedMemoryHistory) {
				if (currentSession && currentSession.messages.length > 0) {
					// Exclude the current user message
					chatHistory = currentSession.messages.filter((m) => m.id !== userMessage.id);

					// Avoid sending the same user turn twice when a previous interrupted
					// request already left an identical trailing user message in session history.
					const lastHistoryMessage = chatHistory[chatHistory.length - 1];
					const lastHistoryContent = lastHistoryMessage
						? (typeof lastHistoryMessage.content === 'string'
							? lastHistoryMessage.content
							: JSON.stringify(lastHistoryMessage.content))
						: '';
					if (
						lastHistoryMessage?.role === userMessage.role &&
						lastHistoryContent === currentUserContent
					) {
						chatHistory = chatHistory.slice(0, -1);
						Logger.debug('[Memory] 🧹 Removed duplicate trailing local history message matching current user input');
					}

					// Apply history limit
					if (chatHistory.length > limit) {
						chatHistory = chatHistory.slice(-limit);
					}

					if (chatHistory.length > 0) {
						Logger.debug(
							'[Memory] 📂 Using local session history (Memory empty or disabled):',
							chatHistory.length,
							'messages'
						);
					} else {
						Logger.debug('[Memory] 📂 Local history enabled but empty');
					}
				} else {
					Logger.debug('[Memory] 📂 Local history enabled but no session messages');
				}
			}
		} else {
			// History is disabled
			chatHistory = [];
			Logger.debug('[Memory] 📋 Conversation history disabled (by settings or context policy)');
		}

		// Prepare initial message list
		messages.push(systemMessage);
		messages.push(...chatHistory);

		// Handle multimodal content if present
		const imageData = this.contextManager.getImageDataForMultimodal();
		let finalUserMessage = userMessage;

		// 检查是否使用 Free Qwen provider
		const provider = this.plugin.getActiveProvider();
		const isFreeQwen = provider?.getProviderName() === 'free-qwen';

		// Process images if present
		if (imageData.length > 0) {
			const supportsVision = provider?.supportsVision();
			Logger.debug('[MessagePrep] Provider vision support check:', {
				model: provider?.getModelName(),
				supportsVision,
				providerType: provider?.getProviderName()
			});

			if (!supportsVision) {
				// Show notice instead of throwing error
				const modelName = provider?.getModelName() || 'Current model';
				new Notice(
					`⚠️ ${modelName} 不支持图片分析，已跳过 ${imageData.length} 张图片，仅处理文字内容`,
					6000
				);
				Logger.warn('Model does not support vision, skipping images:', {
					model: modelName,
					imageCount: imageData.length
				});

				// Clear image data from context manager to prevent retry
				this.contextManager.clearImageData();

				// Continue with text-only message (don't add multimodal content)
			} else {
				// Create multimodal content with images
				const multimodalContent: unknown[] = [];
				if (userMessage.content && typeof userMessage.content === 'string') {
					multimodalContent.push({ type: 'text', text: userMessage.content });
				}

				// 添加图片
				imageData.forEach((image) => {
					multimodalContent.push({
						type: 'image',
						source: {
							type: 'base64',
							media_type: image.mediaType,
							data: image.base64
						}
					});
				});

				finalUserMessage = { ...userMessage, content: multimodalContent as any };
			}
		}

		// Free Qwen: 添加文件引用（独立于图片处理）
		if (isFreeQwen) {
			const fileData = await this.contextManager.getFileDataForRemoteParsing();
			if (fileData.length > 0) {
				Logger.debug(
					`[FreeQwen] Adding ${fileData.length} file(s) for remote parsing`
				);

				// 如果已经有 multimodal content（来自图片），继续添加；否则创建新的
				let multimodalContent: unknown[];
				if (Array.isArray(finalUserMessage.content)) {
					multimodalContent = finalUserMessage.content as unknown[];
				} else {
					multimodalContent = [];
					if (finalUserMessage.content && typeof finalUserMessage.content === 'string') {
						multimodalContent.push({ type: 'text', text: finalUserMessage.content });
					}
				}

				fileData.forEach((file) => {
					// 将文件转换为 base64 data URL
					const bytes = new Uint8Array(file.buffer);
					let binary = '';
					for (let i = 0; i < bytes.byteLength; i++) {
						binary += String.fromCharCode(bytes[i]);
					}
					const base64 = btoa(binary);
					const dataUrl = `data:${file.mimeType};base64,${base64}`;

					multimodalContent.push({
						type: 'file',
						file_url: {
							url: dataUrl
						}
					});
				});

				finalUserMessage = { ...userMessage, content: multimodalContent as any };
			}
		}

		messages.push(finalUserMessage);

		// Apply token management - this will truncate if needed
		const contextPrompt = systemPrompt;

		// Get available tools for token estimation
		const conversationMode = this.plugin.settings.conversationMode || 'normal';
		let availableTools: any[] = [];
		if (conversationMode === 'agent' || conversationMode === 'normal') {
			try {
				const toolManager = this.plugin.getToolManager();
				const skillManager = this.plugin.getSkillManager();
				if (toolManager) {
					availableTools = await toolManager.getAllTools();
					if (conversationMode === 'normal') {
						const currentSession = this.callbacks.getCurrentSession();
						const effectiveSkill = skillManager?.getEffectiveSkill(currentSession) || routedSkill;
						if (skillManager && effectiveSkill) {
							availableTools = skillManager.filterToolsForSkill(availableTools, effectiveSkill);
							} else if (skillManager && skillManager.isSkillUsageEnabled(currentSession) && skillManager.getInvocableSkills(currentSession).length > 0) {
								availableTools = skillManager.filterToolsForSession(
									availableTools,
									currentSession,
									typeof userMessage.content === 'string' ? userMessage.content : '',
									routedSkill
								);
						} else {
							availableTools = availableTools.filter(tool => tool.name !== RUN_LOCAL_COMMAND_TOOL);
						}
					} else if (skillManager) {
						availableTools = skillManager.filterToolsForSession(
							availableTools,
							this.callbacks.getCurrentSession(),
							typeof userMessage.content === 'string' ? userMessage.content : ''
						);
					}
				}
			} catch (error) {
				Logger.warn('Failed to get tools for token estimation:', error);
			}
		}

		// Get current model name for model-specific token limits (reuse provider from above)
		const modelName = provider?.getModelName();

		// Check if token limit is exceeded and handle it
		if (
			TokenManager.isTokenLimitExceeded(
				messages,
				contextPrompt,
				availableTools,
				modelName
			)
		) {
			Logger.warn('Token limit exceeded, applying token management', {
				model: modelName,
				limit: modelName
					? TokenManager.getModelTokenLimit(modelName)
					: TokenManager.MAX_CONTEXT_TOKENS
			});

			// Show warning to user
			new Notice(
				this.plugin.getI18nManager()?.t('notifications.ui.tokenLimitExceeded') ||
				'Token limit exceeded. Truncating conversation history to fit within limits.',
				5000
			);

			// Get truncated messages (this will preserve the most recent messages and user input)
			const truncatedMessages = TokenManager.truncateMessagesToFitTokens(
				messages,
				contextPrompt,
				availableTools,
				modelName
			);

			// Log the truncation for debugging
			Logger.debug('Message truncation applied:', {
				originalCount: messages.length,
				truncatedCount: truncatedMessages.length,
				originalTokens: TokenManager.estimateTokensForMessages(messages),
				truncatedTokens: TokenManager.estimateTokensForMessages(truncatedMessages)
			});

			return truncatedMessages;
		}

		// Log token usage for monitoring
		const totalTokens =
			TokenManager.estimateTokensForMessages(messages) +
			TokenManager.estimateTokensForContext(contextPrompt) +
			TokenManager.estimateTokensForTools(availableTools);
		const effectiveLimit = modelName
			? TokenManager.getModelTokenLimit(modelName)
			: TokenManager.MAX_CONTEXT_TOKENS;

		Logger.debug('Token usage:', {
			totalTokens: TokenManager.formatTokenUsage(totalTokens),
			warningLevel: TokenManager.getTokenWarningLevel(totalTokens),
			messageCount: messages.length,
			model: modelName,
			effectiveLimit
		});

		// Show warning if approaching limits
		const warningLevel = TokenManager.getTokenWarningLevel(totalTokens);
		if (warningLevel === 'warning') {
			new Notice(
				this.plugin.getI18nManager()?.t('notifications.ui.approachingTokenLimit') ||
				'Approaching token limit. Consider starting a new chat if you encounter issues.',
				4000
			);
		}
		return messages;
	}

	/**
	 * 生成系统提示词
	 */
	async getSystemPrompt(memoryContext = '', userInput = '', routedSkill?: ResolvedSkill | null): Promise<string> {
		const basePrompt = `You are an AI assistant integrated into Obsidian, a note-taking app.`;
		const currentSession = this.callbacks.getCurrentSession();
		const skillManager = this.plugin.getSkillManager();
		const skillsEnabled = skillManager?.isSkillUsageEnabled(currentSession) !== false;
		const effectiveSkill = skillsEnabled ? skillManager?.getEffectiveSkill(currentSession) : null;
		const resolvedRoutedSkill = !effectiveSkill && skillsEnabled
			? (routedSkill !== undefined
				? routedSkill
				: (userInput ? skillManager?.routeSkillForInput(userInput, currentSession) : null))
			: null;

		// Check if working memory is enabled in settings
		const workingMemoryEnabled = this.plugin.settings.memorySettings.enableWorkingMemory;

		// Add working memory context and protocol only if working memory is enabled
		let memorySection = '';
		if (workingMemoryEnabled) {
			if (memoryContext) {
				// Has existing working memory context
				memorySection = `\n\n## User Information (Working Memory)\n\nYou have access to important information about this user that you should remember and reference when relevant. This information persists across ALL conversations:\n\n${memoryContext}\n\n**CRITICAL - Memory Update Protocol:**\nWhen the user shares personal information (name, preferences, interests, location, etc.), you MUST append a hidden memory update marker at the END of your response, AFTER all user-visible content. Format:\n\n[MEMORY_UPDATE]\n- Name: [user's name]\n- Location: [user's location]\n- Preferences: [any preferences]\n[/MEMORY_UPDATE]\n\n**IMPORTANT**: This marker will be automatically hidden from the user - do NOT explain or mention it in your visible response!\n`;
			} else {
				// No existing working memory, but feature is enabled
				memorySection = `\n\n## User Information (Working Memory)\n\n**CRITICAL - Memory Update Protocol:**\nWhen the user shares personal information (name, preferences, interests, location, etc.), you MUST append a hidden memory update marker at the END of your response, AFTER all user-visible content. Format:\n\n[MEMORY_UPDATE]\n- Name: [user's name]\n- Location: [user's location]\n- Preferences: [any preferences]\n[/MEMORY_UPDATE]\n\n**IMPORTANT**: This marker will be automatically hidden from the user - do NOT explain or mention it in your visible response! Just respond naturally to the user, then add the marker at the end.\n`;
			}
		}
		// If working memory is disabled, memorySection remains empty (no memory protocol)

		const directoryBestPractices = `

CRITICAL: Content First, Operations Last
When creating or modifying notes:
1. **FOCUS ON CONTENT FIRST**: Ask about what the user wants (structure, format, fields)
2. Generate/show the content for user review and confirmation
3. **ONLY AFTER content is confirmed**, then handle file operations:
   - If user wants to check directories/files: call list_directory({directoryPath: ""}) - this is READ-ONLY, no creation
   - Present directory options to user
   - Wait for user to choose location
   - Then create/modify the file with create() tool

IMPORTANT: list_directory is for VIEWING ONLY - it shows both folders AND files but does NOT create anything!
Only use create() tool to actually create files/folders.

**CRITICAL: ALWAYS Reuse Existing Directories - Creating New Directories is RARE!**
- When list_directory shows existing directories and files, you MUST STRONGLY prefer reusing existing directories
- **Default behavior: Use existing directories** - Creating new directories should be the EXCEPTION, not the norm
- **ABSOLUTE RULE: Use EXACT directory names from list_directory result - NO modifications allowed!**
  * ✅ If listing shows "Template", use "Template/" (exact match)
  * ✅ If listing shows "模板", use "模板/" (exact Chinese name)
  * ✅ If listing shows "Book", use "Book/" (capital B matches listing)
  * ✗ If listing shows "Template", DO NOT use "Templates/" (different name!)
  * ✗ If listing shows "模板", DO NOT use "Template/" (translation not allowed!)
  * ✗ DO NOT change case: "Book" ≠ "book", "Template" ≠ "template"
  * ✗ DO NOT pluralize/singularize existing names
- Before even THINKING about "新建目录", thoroughly check if an existing directory can work:
  * Consider semantic similarity: "日记" can use "Daily/", "工作" can use "Work/" or "Projects/"
  * But always use the EXACT name from the listing!
- **ONLY suggest "新建目录" if ALL of these are true:**
  1. User EXPLICITLY asked to create a new directory/folder in their request, OR
  2. NO existing directory is semantically suitable for the content type, AND
  3. The content represents a genuinely new category not covered by existing directories
- When checking for similar directories, understand semantic similarity but ALWAYS use exact names:
  * "Template" and "模板" both mean templates - use whichever exists (exact name!)
  * "Book" and "book" are the same semantically but use the exact case from listing
- Note: list_directory returns BOTH folders and files, so you can see the full directory structure

**PRIORITY ORDER when presenting options:**
1. Most relevant existing directory with EXACT name (explain why it fits)
2. Second relevant existing directory with EXACT name (if applicable)
3. ONLY if truly necessary: "新建目录" (explain why existing ones don't work)

Example workflow:
User: "Create a reading template"
Step 1: Ask about template structure/content (NOT about filename or location!)
Step 2: Generate and show the template content
Step 3: After user confirms content is good
Step 4: If needed, call list_directory({directoryPath: ""}) to show existing directories and files
Step 5: Check listing result shows: ["Template", "模板", "Book", "Daily"]
   - Analyze and ask: "保存到哪里？Template/ (适合模板) / 模板/ (中文模板目录) / Book/ (适合读书相关)"
   - Use EXACT names: "Template" not "Templates", "模板" not "Template"
   - DO NOT automatically include "新建目录" unless user asked for it or no directory fits
Step 6: After user chooses, MUST call create({path: "ChosenDirectory/filename.md", content: "..."})
   - If user chose "Template", path must be "Template/filename.md" (exact match!)
Step 7: Wait for create() tool result before concluding

**After calling list_directory, you MUST continue with asking user for location and then call create()!**
**DO NOT stop after listing directories/files - that's just step 4, you need to finish steps 5-6!**
**File operations (where to save, what to name) come LAST, after content is ready!**`;

		const conversationMode = this.plugin.settings.conversationMode || 'normal';
		const guidedModeEnabledForPrompt = currentSession?.guidedModeEnabled ?? this.plugin.settings.guidedModeEnabled ?? false;
		let modePrompt = '';

		if (conversationMode === 'agent') {
			// Agent mode: use plan-execute system with tools
			modePrompt = `You're in Agent mode - you have access to various tools and should use the plan-execute framework for complex tasks.

CRITICAL: You MUST use the available tools. Do not just describe what you would do - actually call the tools!

For weather queries about New Mexico:
1. IMMEDIATELY call get-forecast tool with location "Albuquerque, NM"
2. IMMEDIATELY call get-alerts tool with location "New Mexico"
3. Only after getting the data, provide your response

DO NOT say "I will get data" - ACTUALLY GET THE DATA by calling the tools first!

IMPORTANT: When users ask about "latest", "recent", "current", or time-sensitive information:
1. FIRST call the get_current_date tool to get the current date
2. Use this date information to provide accurate, time-aware responses
3. For example: "latest news", "recent updates", "what's new", "今天", "最新的", etc.

CRITICAL: Avoid Redundant Web Content Fetching
**Before fetching web page content, ALWAYS check conversation history first:**
1. **Check if the URL has been fetched before** in this conversation
2. **If the URL appears in previous messages with content**, DO NOT fetch it again
3. **Reuse the previously fetched content** from conversation history
4. **Only fetch if:**
   - The URL has never been fetched in this conversation, OR
   - Previous fetch failed or returned incomplete data, OR
   - User explicitly asks to refresh/refetch the content
5. **Look for these indicators in conversation history:**
   - Tool execution results from fetch_web_content, fetch_url, or similar tools
   - Messages containing "Successfully fetched content from [URL]"
   - Previous responses that include content from the URL
6. **Example - DO NOT DO THIS:**
   Message 1: [fetch_web_content called for https://example.com, got content]
   Message 3: User asks follow-up question about the article
   You: [fetch_web_content for https://example.com again] ← WRONG! Content already available!
7. **Example - CORRECT behavior:**
   Message 1: [fetch_web_content called for https://example.com, got content]
   Message 3: User asks follow-up question
   You: [Use the content from Message 1 to answer] ← CORRECT!

**Remember: Web fetching takes time and resources - avoid redundant fetches by checking history first!**

The tools are real and functional - you must use them!
${directoryBestPractices}

IMPORTANT RESPONSE STYLE:
- Always provide direct answers without preamble, introductions, or meta-commentary
- Do NOT start responses with phrases like "我来帮你...", "我将为你...", "让我..." etc.
- Do NOT end with summaries, suggestions for further action, or closing remarks
- For any task (writing, expanding, modifying, explaining), output the actual result immediately
- Avoid unnecessary framing language - just deliver the requested content directly`;
		} else if (guidedModeEnabledForPrompt) {
			// Superpower mode in normal chat: autonomous execution without guided-choice syntax.
			modePrompt = `You're in normal chat mode with Superpower enabled.

Your job is to autonomously complete the user's original intent with minimal back-and-forth.

SUPERPOWER BEHAVIOR RULES:
- Prioritize execution and completion over asking optional preference questions.
- If required information is already inferable, proceed directly.
- If tools are available and needed, call them immediately and continue until task completion.
- If the task is already completed, finish with a clear completion result.
- If blocked, state the concrete blocker and missing capability.

STRICT OUTPUT FORMAT RULES:
- Do NOT output guided-choice markers such as "➤CHOICE:", "SINGLE", or "MULTIPLE".
- Do NOT ask users to pick from numbered option menus unless the user explicitly requests options.
- Do NOT emit legacy guided-mode interaction templates.

${directoryBestPractices}

IMPORTANT RESPONSE STYLE:
- Always provide direct answers without preamble, introductions, or meta-commentary
- Do NOT start responses with phrases like "我来帮你...", "我将为你...", "让我..." etc.
- Avoid unnecessary framing language; move directly to execution progress or final result`;
		} else {
			// Basic Q&A mode: provide helpful responses with action buttons
			modePrompt = `You're in basic Q&A mode - provide helpful, informative responses to user questions. When the user references files or provides context, make sure to use that information to provide relevant answers.

If the user asks you to modify or work with files mentioned in the context, provide specific suggestions or show what the modified content should look like.
${directoryBestPractices}

IMPORTANT RESPONSE STYLE:
- Always provide direct answers without preamble, introductions, or meta-commentary
- Do NOT start responses with phrases like "我来帮你...", "我将为你...", "让我..." etc.
- Do NOT end with summaries, suggestions for further action, or closing remarks
- For any task (writing, expanding, modifying, explaining), output the actual result immediately
- Avoid unnecessary framing language - just deliver the requested content directly`;
		}

		// Get available tools and add them to the system prompt
		const toolsInfo = await this.toolCoordinator.getAvailableToolsInfo(resolvedRoutedSkill);
		const activeOrRoutedSkill = effectiveSkill || resolvedRoutedSkill;
			const skillUsesLocalCommand = skillManager?.skillExposesRunLocalCommand(activeOrRoutedSkill);
			const cliExecutionAdapterPrompt = skillUsesLocalCommand
				? `\n\n## CLI Skill Execution Adapter\n\nThis skill allows "${RUN_LOCAL_COMMAND_TOOL}". That means the skill's domain actions must be executed through the exact tool name "${RUN_LOCAL_COMMAND_TOOL}".\n\nHow to use it:\n- Infer the needed local CLI action from the skill's name, description, and instructions.\n- Call the exact tool "${RUN_LOCAL_COMMAND_TOOL}".\n- Pass a real shell command string in the "command" argument.\n\nCRITICAL:\n- The skill name is not a tool name.\n- Terms mentioned in the skill description are not automatically tool names.\n- Do not invent wrapper tools, aliases, or pseudo-DSL commands.\n- The "command" field must contain a real shell command, not an abstract action description.\n\nCorrect pattern:\n- tool name: "${RUN_LOCAL_COMMAND_TOOL}"\n- arguments: {"command":"<actual terminal command>"}\n\nWrong pattern:\n- tool name: "<skill name or alias>"\n- arguments: {"command":"create name=\\"foo\\""}\n`
				: '';
		const skillExecutionPrompt = activeOrRoutedSkill
			? `\n\n## Execution Phase\n\nThe router already matched this request to the skill "${activeOrRoutedSkill.name}". You are no longer deciding whether to load a skill. That decision is already made.\n\nExecution rules:\n- Treat the loaded skill as the logic container for this task.\n- Read and follow the full skill instructions injected below.\n- If the skill can answer directly, do so.\n- If the skill requires external actions, use the exact callable tools listed in AVAILABLE TOOLS.\n- Built-in tools have higher priority than MCP tools when both can complete the same concrete action.\n- A skill name is not a callable tool name unless it also appears exactly in AVAILABLE TOOLS.\n- Never invent wrappers, aliases, or pseudo-tools from a skill name.\n- Prefer acting over describing what you would do when the required information is already available.\n`
			: `\n\n## Router Phase\n\nYou are currently choosing among parallel capability sources:\n1. Skills via their registry descriptions\n2. Built-in tools via their tool definitions\n3. MCP tools via their tool definitions\n\nRouting rules:\n- If a skill registry description is the best match, select that skill conceptually and solve the task according to its loaded instructions once provided.\n- If no skill is the best match, call the appropriate built-in or MCP tool directly.\n- Skills are logic containers. Built-in tools and MCP tools are execution endpoints.\n- Only exact names in AVAILABLE TOOLS are callable.\n`;
		const skillPrompt = !skillsEnabled
			? ''
			: (effectiveSkill || resolvedRoutedSkill)
			? (() => {
				const resolvedSkill = effectiveSkill || resolvedRoutedSkill;
				const title = effectiveSkill ? 'Active Skill' : 'Routed Skill';
					const cliExecutionHint = skillManager?.skillExposesRunLocalCommand(resolvedSkill)
						? `Execution mapping: this skill executes through the exact tool name "${RUN_LOCAL_COMMAND_TOOL}". If you need to act in the local environment or invoke a CLI described by the skill, call "${RUN_LOCAL_COMMAND_TOOL}" with a real shell command string. Do not invent tool names such as "${resolvedSkill.name}" or "obsidian".\n`
						: '';
					return `\n\n## ${title}\n\nSkill: ${resolvedSkill?.name}\n${resolvedSkill?.description ? `Registry description: ${resolvedSkill.description}\n` : ''}${resolvedSkill?.preferredConversationMode ? `Preferred conversation mode: ${resolvedSkill.preferredConversationMode}\n` : ''}${resolvedSkill?.toolAllowlist?.length ? `Capability hints: ${resolvedSkill.toolAllowlist.join(', ')}\n` : ''}${cliExecutionHint}${resolvedSkill?.instructionsContent ? `\nLoaded skill instructions:\n${resolvedSkill.instructionsContent}\n` : ''}`;
			  })()
			: (() => {
				// No skill explicitly active — inject descriptions of all model-invocable
				// enabled skills so the LLM can progressively select the right one.
				const descriptions = skillManager?.getSkillDescriptionsForContext(currentSession) || '';
				return descriptions ? `\n\n${descriptions}` : '';
			  })();

		// Add context from ContextManager (will auto-refresh file contents)
		// Pass model name to ensure proper token limits for file extraction
		const provider = this.plugin.getActiveProvider();
		const modelName = provider?.getModelName();
		const providerName = provider?.getProviderName();
		const isFreeQwen = providerName === 'free-qwen';
		// For Free Qwen, skip file content in context prompt (files are sent in user message)
		const contextPrompt = await this.contextManager.generateContextPrompt(
			undefined,
			modelName,
			isFreeQwen,
			providerName
		);

		const toolUsagePolicy = activeOrRoutedSkill
			? `Remember: the skill has already been selected. Execute against the loaded skill instructions and use tools only as concrete endpoints when needed. Tool names must match AVAILABLE TOOLS exactly.`
			: `Remember: you are still in the routing stage unless you directly call a built-in or MCP tool. "${RUN_LOCAL_COMMAND_TOOL}" is forbidden unless a specific active or routed skill explicitly matched this request and exposes that exact tool.`;

		const systemPromptBase = `${basePrompt}
${memorySection}
${skillPrompt}
	${cliExecutionAdapterPrompt}
	${skillExecutionPrompt}
	${modePrompt}

${toolsInfo}

Context Information:
${contextPrompt}

CRITICAL: Context-First Rule
- ALWAYS check "Context Information" before using any tools.
- If the user references a folder (e.g., "Summarize folder X") and the content of files from that folder is ALREADY present in the "Context Information" (look for "Directory: X/" markers), you MUST NOT call \`list_directory\` or search for those files.
- Use the provided context directly to answer the user's request. Only use tools if the necessary information is truly missing from the context.

${toolUsagePolicy}`;

		return this.plugin.appendGlobalPromptToSystemMessage(systemPromptBase);
	}

	/**
	 * 更新步骤指示器状态（委托给回调）
	 */
	updateStepIndicator(
		container: HTMLElement | null,
		stepName: string,
		state: 'pending' | 'active' | 'completed'
	): void {
		this.callbacks.updateStepIndicator(container, stepName, state);
	}

	/**
	 * 显示 Vector Search 结果（委托给回调）
	 */
	displayVectorSearchResults(container: HTMLElement | null, results: any[]): void {
		this.callbacks.displayVectorSearchResults(container, results);
	}

	/**
	 * 自动生成会话标题（在首轮对话后）
	 */
	async autoGenerateSessionTitle(
		userMessage: ChatMessage,
		assistantMessage: ChatMessage
	): Promise<void> {
		const currentSession = this.callbacks.getCurrentSession();
		if (!currentSession) {
			Logger.debug('[TitleGen] No current session, skipping');
			return;
		}

		// Count only user and assistant messages, excluding system messages, tool messages, etc.
		const conversationMessages = currentSession.messages.filter(
			(m) => m.role === 'user' || m.role === 'assistant'
		);

		Logger.debug('[TitleGen] Session name:', currentSession.name);
		Logger.debug('[TitleGen] Conversation messages count:', conversationMessages.length);
		Logger.debug('[TitleGen] Total messages count:', currentSession.messages.length);
		Logger.debug(
			'[TitleGen] Message roles:',
			currentSession.messages.map((m) => m.role).join(', ')
		);

		// Only generate title after first round (2 messages: 1 user + 1 assistant)
		if (conversationMessages.length === 2 && currentSession.name === 'Untitled') {
			// Run title generation in background without blocking
			const sessionId = currentSession.id;

			// Don't await - let it run in background
			(async () => {
				try {
					const userContent =
						typeof userMessage.content === 'string'
							? userMessage.content
							: JSON.stringify(userMessage.content);
					let assistantContent =
						typeof assistantMessage.content === 'string'
							? assistantMessage.content
							: JSON.stringify(assistantMessage.content);

					// Extract final answer by removing thinking sections
					assistantContent = this.extractFinalAnswer(assistantContent);

					Logger.debug('[TitleGen] 🎬 Starting title generation in background...');
					Logger.debug('[TitleGen] User content length:', userContent.length);
					Logger.debug(
						'[TitleGen] Assistant content length (after removing thinking):',
						assistantContent.length
					);

					const sessionName = await this.uiBuilder.generateSessionNameFromMessage(
						userContent,
						assistantContent
					);

					Logger.debug('[TitleGen] ✓ Generated title:', sessionName);

					// Update session title
					await this.callbacks.updateSession(sessionId, { name: sessionName });
					const updatedSession = this.callbacks.getCurrentSession();
					if (updatedSession && updatedSession.id === sessionId) {
						updatedSession.name = sessionName;
						this.callbacks.updateSessionNameDisplay(sessionName);
						Logger.debug('[TitleGen] ✓ Session title updated in UI');
					} else {
						Logger.debug('[TitleGen] ⚠️ Session changed, not updating UI');
					}
				} catch (error) {
					Logger.error('[TitleGen] ❌ Failed to auto-generate session title:', error);
				}
			})();
		}
	}

	/**
	 * 从内容中提取最终答案（移除思考过程）
	 * 用于标题生成，跳过思考过程
	 */
	extractFinalAnswer(content: string): string {
		// Remove thinking callout sections (e.g., "> [!tip] 思考过程\n> ...")
		let cleaned = content;

		// Pattern 1: Remove callout blocks with thinking content
		// Matches: > [!tip] 思考过程\n> content\n> more content\n\n
		cleaned = cleaned.replace(/^>\s*\[!\w+\][^\n]*思考[^\n]*\n(>\s*[^\n]*\n)*\n*/gm, '');

		// Pattern 2: Remove any remaining > quoted blocks at the start
		cleaned = cleaned.replace(/^(>\s*[^\n]*\n)+\n*/m, '');

		return cleaned.trim();
	}
}
