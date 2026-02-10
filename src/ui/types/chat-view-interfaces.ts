/**
 * ChatView 模块化重构 - 接口定义
 * 
 * 定义各个模块之间的通信接口，确保松耦合和可测试性
 */

import { ChatMessage, ChatSession } from '../../types';
import { TFile } from 'obsidian';

// ============================================================================
// 1. 对话编排器接口
// ============================================================================

export interface IConversationOrchestrator {
	/**
	 * Route conversation to appropriate handler based on mode
	 * @returns true if handled by a mode handler, false if needs fallback
	 */
	routeConversation(params: {
		userMessage: ChatMessage;
		currentSession: ChatSession;
		provider: any;
		assistantMessage: ChatMessage | null;
		workingMessageEl: HTMLElement | null;
		stepIndicatorsEl: HTMLElement | null;
		memoryContext: string;
		memoryMessages: ChatMessage[];
		memoryEnabled: boolean;
		prepareMessages: (
			userMessage: ChatMessage,
			stepIndicatorsEl: HTMLElement | null,
			memoryContext: string,
			memoryMessages: ChatMessage[],
			memoryEnabled: boolean
		) => Promise<any[]>;
		updateStepIndicator: (el: HTMLElement, step: string, status: string) => void;
		autoGenerateSessionTitle: (userMessage: ChatMessage, assistantMessage: ChatMessage) => Promise<void>;
		removeStepIndicators: (el: HTMLElement | null) => void;
	}): Promise<boolean>;
	
	/**
	 * Cleanup resources
	 */
	cleanup(): void;
}

// ============================================================================
// 2. 会话处理器接口
// ============================================================================

export interface ISessionHandler {
	/**
	 * Initialize session
	 */
	initializeSession(): Promise<ChatSession>;
	
	/**
	 * Handle new chat creation
	 */
	handleNewChat(): Promise<void>;
	
	/**
	 * Handle session loaded event
	 */
	handleSessionLoaded(session: ChatSession): void;
	
	/**
	 * Handle clearing current chat
	 */
	handleClearCurrentChat(): Promise<void>;
	
	/**
	 * Handle regenerating an assistant response
	 */
	handleRegenerateResponse(messageId: string): Promise<void>;
}

// ============================================================================
// 3. Provider协调器接口
// ============================================================================

export interface IProviderCoordinator {
	/**
	 * Handle adding a provider for a specific message
	 */
	handleAddProviderForMessage(messageId: string, triggerButton?: HTMLElement): Promise<void>;
	
	/**
	 * Handle provider tab switched event
	 */
	handleProviderTabSwitched(messageId: string, provider: string): Promise<void>;
	
	/**
	 * Handle provider tab removed event
	 */
	handleProviderTabRemoved(messageId: string, provider: string): Promise<void>;
	
	/**
	 * Get human-readable label for a provider
	 */
	getProviderLabel(provider: string): string;
	
	/**
	 * Update provider tabs UI
	 */
	updateProviderTabs(): void;
}

// ============================================================================
// 4. Normal模式处理器接口
// ============================================================================

export interface INormalModeHandler {
	/**
	 * Execute Normal mode conversation
	 */
	execute(params: {
		userMessage: ChatMessage;
		currentSession: ChatSession;
		provider: any;
		stepIndicatorsEl: HTMLElement | null;
		memoryContext: string;
		memoryMessages: ChatMessage[];
		memoryEnabled: boolean;
		updateStepIndicator: (el: HTMLElement, step: string, status: string) => void;
		prepareMessages: (
			userMessage: ChatMessage,
			stepIndicatorsEl: HTMLElement | null,
			memoryContext: string,
			memoryMessages: ChatMessage[],
			memoryEnabled: boolean
		) => Promise<any[]>;
		autoGenerateSessionTitle: (userMessage: ChatMessage, assistantMessage: ChatMessage) => Promise<void>;
		removeStepIndicators: (el: HTMLElement | null) => void;
	}): Promise<void>;
	
	/**
	 * Cleanup resources
	 */
	cleanup(): void;
}

// ============================================================================
// 3. Guided模式处理器接口
// ============================================================================

export interface IGuidedModeHandler {
	/**
	 * Execute Guided mode conversation
	 */
	execute(params: {
		userMessage: ChatMessage;
		currentSession: ChatSession;
		messages: ChatMessage[];
		assistantMessage: ChatMessage | null;
		workingMessageEl: HTMLElement | null;
		stepIndicatorsEl: HTMLElement | null;
		memoryContext: string;
		memoryMessages: ChatMessage[];
		memoryEnabled: boolean;
		prepareMessages: (
			userMessage: ChatMessage,
			stepIndicatorsEl: HTMLElement | null,
			memoryContext: string,
			memoryMessages: ChatMessage[],
			memoryEnabled: boolean
		) => Promise<any[]>;
	}): Promise<void>;
	
	/**
	 * Cleanup resources
	 */
	cleanup(): void;
}

// ============================================================================
// 4. Agent模式处理器接口
// ============================================================================

export interface IAgentModeHandler {
	/**
	 * Determine if should use Plan-Execute framework
	 */
	shouldUsePlanExecuteFramework(content: string, availableTools: any[]): boolean;
	
	/**
	 * Execute Agent mode (Plan-Execute framework)
	 */
	execute(params: {
		userMessage: ChatMessage;
		currentSession: ChatSession;
		availableTools: any[];
		assistantMessage: ChatMessage | null;
		workingMessageEl: HTMLElement | null;
		stepIndicatorsEl: HTMLElement | null;
		memoryContext: string;
		memoryMessages: ChatMessage[];
		memoryEnabled: boolean;
		prepareMessages: (
			userMessage: ChatMessage,
			stepIndicatorsEl: HTMLElement | null,
			memoryContext: string,
			memoryMessages: ChatMessage[],
			memoryEnabled: boolean
		) => Promise<any[]>;
	}): Promise<void>;
	
	/**
	 * Cleanup resources
	 */
	cleanup(): void;
}

// ============================================================================
// 5. 事件管理器接口
// ============================================================================

export interface IChatViewEventCallbacks {
	onNewChat: () => Promise<void>;
	onShowHistory: () => void;
	onShowContextOptions: () => void;
	onClearChat: () => Promise<void>;
	onEditMessage: (messageId: string) => void;
	onRegenerateResponse: (messageId: string) => Promise<void>;
	onDiffReprocess: (messageId: string) => void;
	onRenderGuidedCard: (messageId: string) => void;
	onAgentModeChanged: (agentMode: boolean) => void;
	onModeChanged: (mode: string) => void;
	onAddProviderForMessage: (messageId: string, triggerButton?: HTMLElement) => void;
	onProviderTabSwitched: (messageId: string, provider: string) => void;
	onProviderTabRemoved: (messageId: string, provider: string) => void;
}

export interface IChatViewEventManager {
	/**
	 * 设置所有事件监听器
	 */
	setup(): void;
	
	/**
	 * 清理所有事件监听器
	 */
	cleanup(): void;
	
	/**
	 * 检查是否已设置
	 */
	isSetup(): boolean;
}

// ============================================================================
// 6. UI协调器接口
// ============================================================================

export interface IUICoordinator {
	/**
	 * 更新上下文显示
	 */
	updateContextDisplay(): void;
	
	/**
	 * 显示上下文模态框
	 */
	showContextModal(title: string, content: string, type?: string): void;
	
	/**
	 * 刷新UI状态
	 */
	refreshUIState(): void;
	
	/**
	 * 创建步骤指示器
	 */
	createStepIndicators(): HTMLElement;
	
	/**
	 * 更新步骤指示器
	 */
	updateStepIndicator(
		container: HTMLElement | null,
		stepName: string,
		state: 'pending' | 'active' | 'completed'
	): void;
	
	/**
	 * 移除步骤指示器
	 */
	removeStepIndicators(container: HTMLElement | null): void;
	
	/**
	 * 显示向量搜索结果
	 */
	displayVectorSearchResults(container: HTMLElement | null, results: unknown[]): void;
	
	/**
	 * 刷新上下文搜索按钮
	 */
	refreshContextSearchButton(): void;
}

// ============================================================================
// 7. 会话处理器接口
// ============================================================================

export interface ISessionHandler {
	/**
	 * 初始化会话
	 */
	initializeSession(): Promise<ChatSession | null>;
	
	/**
	 * 处理会话加载
	 */
	handleSessionLoaded(session: ChatSession): void;
	
	/**
	 * 清理当前对话
	 */
	handleClearCurrentChat(): Promise<void>;
	
	/**
	 * 重新生成响应
	 */
	handleRegenerateResponse(messageId: string): Promise<void>;
}

// ============================================================================
// 8. 建议文件协调器接口
// ============================================================================

export interface ISuggestedFile {
	file: TFile;
	score: number;
	reason: string;
}

export interface ISuggestionsCoordinator {
	/**
	 * 渲染建议文件
	 */
	renderSuggestedFiles(container: HTMLElement): void;
	
	/**
	 * 显示文件建议
	 */
	showSuggestionsForFile(file: TFile): Promise<void>;
	
	/**
	 * 确认建议
	 */
	confirmSuggestion(filePath: string): Promise<void>;
	
	/**
	 * 忽略建议
	 */
	dismissSuggestion(filePath: string): void;
	
	/**
	 * 清除所有建议
	 */
	clearAllSuggestions(): void;
	
	/**
	 * 获取活动建议数量
	 */
	getActiveSuggestionsCount(): number;
}

// ============================================================================
// 9. Provider协调器接口
// ============================================================================

export interface IProviderCoordinator {
	/**
	 * 处理为消息添加Provider
	 */
	handleAddProviderForMessage(messageId: string, triggerButton?: HTMLElement): Promise<void>;
	
	/**
	 * 为消息添加Provider响应
	 */
	addProviderResponseForMessage(
		targetMessage: ChatMessage,
		messageIndex: number,
		selectedProvider: string
	): Promise<void>;
	
	/**
	 * 更新Provider标签
	 */
	updateProviderTabs(): void;
	
	/**
	 * 获取Provider标签
	 */
	getProviderLabel(provider: string): string;
}

// ============================================================================
// 10. 模块依赖配置
// ============================================================================

/**
 * 对话编排器依赖
 */
export interface ConversationOrchestratorDeps {
	plugin: any; // LLMSiderPlugin
	messageManager: any; // MessageManager
	contextManager: any; // ContextManager
	streamManager: any; // StreamManager
	toolExecutionManager: any; // ToolExecutionManager
	messageRenderer: any; // MessageRenderer
	sessionManager: any; // SessionManager
	i18n: any; // I18nManager
}

/**
 * Normal模式处理器依赖
 */
export interface NormalModeHandlerDeps {
	plugin: any; // LLMSiderPlugin
	messageContainer: HTMLElement;
	messageManager: any; // MessageManager
	messageRenderer: any; // MessageRenderer
	streamManager: any; // StreamManager
	sessionManager: any; // SessionManager
	contextManager: any; // ContextManager
	i18n: any; // I18nManager
}

/**
 * Guided模式处理器依赖
 */
export interface GuidedModeHandlerDeps {
	plugin: any; // LLMSiderPlugin
	messageContainer: HTMLElement;
	messageManager: any; // MessageManager
	messageRenderer: any; // MessageRenderer
	streamManager: any; // StreamManager
	toolExecutionManager: any; // ToolExecutionManager
	contextManager: any; // ContextManager
	i18n: any; // I18nManager
}

/**
 * Agent模式处理器依赖
 */
export interface AgentModeHandlerDeps {
	plugin: any; // LLMSiderPlugin
	mastraPlanExecuteProcessor: any; // MastraPlanExecuteProcessor
	sessionManager: any; // SessionManager
	i18n: any; // I18nManager
}

/**
 * UI协调器依赖
 */
export interface UICoordinatorDeps {
	plugin: any; // LLMSiderPlugin
	messageContainer: HTMLElement;
	contextDisplay: HTMLElement;
	inputElement: HTMLTextAreaElement;
	sendButton: HTMLElement;
	stopButton: HTMLElement;
	contextManager: any; // ContextManager
	suggestionsCoordinator: ISuggestionsCoordinator;
	i18n: any; // I18nManager
}

/**
 * 会话处理器依赖
 */
export interface SessionHandlerDeps {
	plugin: any; // LLMSiderPlugin
	sessionManager: any; // SessionManager
	messageManager: any; // MessageManager
	messageContainer: HTMLElement;
	uiBuilder: any; // UIBuilder
	contextManager: any; // ContextManager
	conversationOrchestrator: IConversationOrchestrator;
	streamManager: any; // StreamManager
}

/**
 * 建议协调器依赖
 */
export interface SuggestionsCoordinatorDeps {
	plugin: any; // LLMSiderPlugin
	app: any; // Obsidian App
	contextManager: any; // ContextManager
	suggestedFilesManager: any; // SuggestedFilesManager
}

/**
 * Provider协调器依赖
 */
export interface ProviderCoordinatorDeps {
	plugin: any; // LLMSiderPlugin
	messageContainer: HTMLElement;
	providerTabsManager: any; // ProviderTabsManager
	messageRenderer: any; // MessageRenderer
	streamManager: any; // StreamManager
	sessionManager: any; // SessionManager
}

// ============================================================================
// 11. 工具类型和辅助接口
// ============================================================================

/**
 * 消息准备选项
 */
export interface MessagePreparationOptions {
	userMessage: ChatMessage;
	stepIndicatorsEl?: HTMLElement | null;
	memoryContext?: string;
	memoryMessages?: ChatMessage[] | null;
	memoryEnabled?: boolean;
}

/**
 * 步骤指示器状态
 */
export type StepIndicatorState = 'pending' | 'active' | 'completed';

/**
 * 步骤指示器配置
 */
export interface StepIndicatorConfig {
	name: string;
	icon: string;
	label: string;
	state: StepIndicatorState;
}

/**
 * Guided消息元数据
 */
export interface GuidedMessageMetadata {
	isGuidedQuestion?: boolean;
	guidedOptions?: string[];
	isMultiSelect?: boolean;
	requiresToolConfirmation?: boolean;
	suggestedToolCalls?: unknown[];
	isStreaming?: boolean;
	isFollowUpMessage?: boolean;
}

/**
 * 建议项配置
 */
export interface SuggestionConfig {
	timeout: number;
	element: HTMLElement;
}

/**
 * 事件监听器映射
 */
export type EventListenerMap = Map<string, (event: unknown) => void>;

// ============================================================================
// 12. Memory 协调器接口
// ============================================================================

/**
 * Memory Context returned by initialization
 */
export interface MemoryContext {
	memoryContext: string;
	memoryMessages: ChatMessage[] | null;
	memoryEnabled: boolean;
}

export interface IMemoryCoordinator {
	/**
	 * Strip memory update markers from content for display
	 */
	stripMemoryMarkers(content: string): string;
	
	/**
	 * Initialize memory for conversation
	 * Returns memory context, messages, and enabled status
	 */
	initializeMemoryForConversation(userMessage: ChatMessage): Promise<MemoryContext>;
}

// ============================================================================
// 13. Tool 协调器接口
// ============================================================================

export interface IToolCoordinator {
	/**
	 * Process tool calls from AI response
	 */
	processToolCalls(streamingResult: unknown, accumulatedContent: string, availableTools: any[]): Promise<void>;
	
	/**
	 * Parse XML tool calls from content
	 */
	parseXMLToolCalls(content: string): Array<{tool: string, parameters: unknown}>;
	
	/**
	 * Get available tools information for system prompt
	 */
	getAvailableToolsInfo(): Promise<string>;
}

// ============================================================================
// 14. 消息准备服务接口
// ============================================================================

export interface IMessagePreparationService {
	/**
	 * Prepare messages to send to LLM
	 */
	prepareMessages(
		userMessage: ChatMessage,
		stepIndicatorsEl: HTMLElement | null,
		memoryContext: string,
		memoryMessages: ChatMessage[] | null,
		memoryEnabled: boolean
	): Promise<ChatMessage[]>;

	/**
	 * Get system prompt for current mode
	 */
	getSystemPrompt(memoryContext?: string): Promise<string>;

	/**
	 * Update step indicator state
	 */
	updateStepIndicator(
		container: HTMLElement | null,
		stepName: string,
		state: 'pending' | 'active' | 'completed'
	): void;

	/**
	 * Display vector search results
	 */
	displayVectorSearchResults(container: HTMLElement | null, results: any[]): void;
}
