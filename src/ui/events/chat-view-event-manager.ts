/**
 * 事件管理器
 * 
 * 负责管理所有UI事件监听器的注册和清理，包括：
 * - 新建对话
 * - 显示历史记录
 * - 清除对话
 * - 编辑消息
 * - 重新生成响应
 * - Agent模式切换
 * - Provider标签管理
 * - 等等
 */

import { Logger } from '../../utils/logger';
import { IChatViewEventManager, IChatViewEventCallbacks } from '../types/chat-view-interfaces';

export class ChatViewEventManager implements IChatViewEventManager {
	private eventListeners: Map<string, (event: unknown) => void> = new Map();
	private callbacks: IChatViewEventCallbacks;
	private isSetupComplete = false;

	constructor(callbacks: IChatViewEventCallbacks) {
		this.callbacks = callbacks;
	}

	/**
	 * 设置所有事件监听器
	 */
	setup(): void {
		// 清理旧的监听器
		this.cleanup();

		// 新建对话事件
		const newChatHandler = async () => {
			await this.callbacks.onNewChat();
		};
		this.registerEvent('llmsider-new-chat', newChatHandler);

		// 显示历史记录事件
		const showHistoryHandler = () => {
			Logger.debug('📜 Show history event received');
			this.callbacks.onShowHistory();
		};
		this.registerEvent('llmsider-show-history', showHistoryHandler);
		Logger.debug('📜 Show history event listener registered');

		// 显示上下文选项事件
		const showContextHandler = () => {
			this.callbacks.onShowContextOptions();
		};
		this.registerEvent('llmsider-show-context-options', showContextHandler);

		// Agent模式变更事件
		const agentModeChangeHandler = (event: unknown) => {
			const { agentMode } = (event as any).detail;
			Logger.debug('Agent mode changed:', agentMode);
			this.callbacks.onAgentModeChanged(agentMode);
		};
		this.registerEvent('llmsider-agent-mode-changed', agentModeChangeHandler);

		// 对话模式变更事件
		const modeChangedHandler = (event: unknown) => {
			const { mode } = (event as any).detail;
			Logger.debug('Conversation mode changed:', mode);
			this.callbacks.onModeChanged(mode);
		};
		this.registerEvent('llmsider-mode-changed', modeChangedHandler);

		// 为消息添加Provider对比事件
		const addProviderForMessageHandler = (event: unknown) => {
			const { messageId, triggerButton } = (event as any).detail;
			Logger.debug('Add provider for message:', messageId);
			this.callbacks.onAddProviderForMessage(messageId, triggerButton);
		};
		this.registerEvent('llmsider-add-provider-for-message', addProviderForMessageHandler);

		// 清除对话事件
		const clearChatHandler = async () => {
			await this.callbacks.onClearChat();
		};
		this.registerEvent('llmsider-clear-chat', clearChatHandler);

		// 编辑消息事件
		const editMessageHandler = (event: unknown) => {
			const { messageId } = (event as any).detail;
			this.callbacks.onEditMessage(messageId);
		};
		this.registerEvent('llmsider-edit-message', editMessageHandler);

		// 重新生成响应事件
		const regenerateResponseHandler = async (event: unknown) => {
			const { messageId } = (event as any).detail;
			await this.callbacks.onRegenerateResponse(messageId);
		};
		this.registerEvent('llmsider-regenerate-response', regenerateResponseHandler);

		// Diff重新处理事件
		const diffReprocessHandler = (event: unknown) => {
			const { messageId } = (event as any).detail;
			this.callbacks.onDiffReprocess(messageId);
		};
		this.registerEvent('llmsider-reprocess-diff', diffReprocessHandler);

		// 渲染Guided卡片事件
		const renderGuidedCardHandler = (event: unknown) => {
			const { message } = (event as any).detail;
			if (message?.metadata?.isGuidedQuestion) {
				setTimeout(() => {
					const messageId = message.id;
					this.callbacks.onRenderGuidedCard(messageId);
				}, 100);
			}
		};
		this.registerEvent('llmsider-render-guided-card', renderGuidedCardHandler);

		// Provider标签切换事件
		const providerTabSwitchedHandler = async (event: unknown) => {
			const { messageId, providerKey } = (event as any).detail;
			Logger.debug('Provider tab switched:', messageId, providerKey);
			this.callbacks.onProviderTabSwitched(messageId, providerKey);
		};
		this.registerEvent('llmsider-provider-tab-switched', providerTabSwitchedHandler);

		// Provider标签移除事件
		const providerTabRemovedHandler = async (event: unknown) => {
			const { messageId, providerKey } = (event as any).detail;
			Logger.debug('Provider tab removed:', messageId, providerKey);
			this.callbacks.onProviderTabRemoved(messageId, providerKey);
		};
		this.registerEvent('llmsider-provider-tab-removed', providerTabRemovedHandler);

		this.isSetupComplete = true;
		Logger.debug('ChatViewEventManager setup complete');
	}

	/**
	 * 注册单个事件
	 */
	private registerEvent(eventName: string, handler: (event: unknown) => void): void {
		this.eventListeners.set(eventName, handler);
		window.addEventListener(eventName, handler);
	}

	/**
	 * 清理所有事件监听器
	 */
	cleanup(): void {
		this.eventListeners.forEach((handler, eventName) => {
			window.removeEventListener(eventName, handler);
		});
		this.eventListeners.clear();
		this.isSetupComplete = false;
		Logger.debug('ChatViewEventManager cleanup complete');
	}

	/**
	 * 检查是否已设置
	 */
	isSetup(): boolean {
		return this.isSetupComplete;
	}

	/**
	 * 获取已注册的事件数量
	 */
	getEventCount(): number {
		return this.eventListeners.size;
	}

	/**
	 * 检查特定事件是否已注册
	 */
	hasEvent(eventName: string): boolean {
		return this.eventListeners.has(eventName);
	}
}
