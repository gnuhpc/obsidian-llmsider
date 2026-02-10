import { ChatMessage, ChatSession } from '../../types';
import { IConversationOrchestrator } from '../types/chat-view-interfaces';
import ObsidianLLMSider from '../../main';
import { Logger } from '../../utils/logger';
import { NormalModeHandler } from '../handlers/normal-mode-handler';
import { AgentModeHandler } from '../handlers/agent-mode-handler';
import { GuidedModeHandler } from '../handlers/guided-mode-handler';
import { UnifiedTool } from '../../tools/unified-tool-manager';

/**
 * Orchestrator for conversation flow
 * Routes messages to appropriate mode handlers based on conversation mode
 */
export class ConversationOrchestrator implements IConversationOrchestrator {
	private plugin: ObsidianLLMSider;
	private normalModeHandler: NormalModeHandler;
	private agentModeHandler: AgentModeHandler;
	private guidedModeHandler: GuidedModeHandler;
	
	constructor(
		plugin: ObsidianLLMSider,
		normalModeHandler: NormalModeHandler,
		agentModeHandler: AgentModeHandler,
		guidedModeHandler: GuidedModeHandler
	) {
		this.plugin = plugin;
		this.normalModeHandler = normalModeHandler;
		this.agentModeHandler = agentModeHandler;
		this.guidedModeHandler = guidedModeHandler;
	}
	
	/**
	 * Route conversation to appropriate handler based on mode
	 */
	async routeConversation(params: {
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
	}): Promise<boolean> {
		const {
			userMessage,
			currentSession,
			provider,
			assistantMessage,
			workingMessageEl,
			stepIndicatorsEl,
			memoryContext,
			memoryMessages,
			memoryEnabled,
			prepareMessages,
			updateStepIndicator,
			autoGenerateSessionTitle,
			removeStepIndicators
		} = params;
		
		// Determine conversation mode
		const conversationMode = currentSession.conversationMode || this.plugin.settings.conversationMode || 'normal';
		
		Logger.debug(`[ConversationOrchestrator] Routing conversation, mode: ${conversationMode}`);
		
		// Route to Guided Mode
		if (conversationMode === 'guided') {
			Logger.debug('[ConversationOrchestrator] Routing to Guided Mode Handler');
			
			const messages = await prepareMessages(
				userMessage,
				stepIndicatorsEl,
				memoryContext,
				memoryMessages,
				memoryEnabled
			);
			
			// Remove the temporary assistant message since guided mode handles its own UI
			if (workingMessageEl) {
				workingMessageEl.remove();
			}
			
			// Remove step indicators
			if (stepIndicatorsEl) {
				stepIndicatorsEl.remove();
			}

			if (currentSession && assistantMessage) {
				const messageIndex = currentSession.messages.findIndex(m => m.id === assistantMessage.id);
				if (messageIndex > -1) {
					currentSession.messages.splice(messageIndex, 1);
				}
			}
			
			await this.guidedModeHandler.execute({
				userMessage,
				currentSession,
				messages,
				assistantMessage,
				workingMessageEl,
				stepIndicatorsEl,
				memoryContext,
				memoryMessages,
				memoryEnabled,
				prepareMessages
			});
			
			return true; // Handled
		}
		
		// Get available tools for Agent mode
		let availableTools: UnifiedTool[] = [];
		if (conversationMode === 'agent') {
			try {
				const toolManager = this.plugin.getToolManager();
				if (toolManager) {
					availableTools = await toolManager.getAllTools();
					Logger.debug(`[ConversationOrchestrator] Retrieved ${availableTools.length} tools for Agent mode`);
				}
			} catch (error) {
				Logger.warn('[ConversationOrchestrator] Failed to get tools:', error);
			}
		}
		
		// Route to Agent Mode (Plan-Execute)
		if (conversationMode === 'agent' && this.agentModeHandler.shouldUsePlanExecuteFramework(userMessage.content as string, availableTools)) {
			Logger.debug('[ConversationOrchestrator] Routing to Agent Mode Handler (Plan-Execute)');
			
			await this.agentModeHandler.execute({
				userMessage,
				currentSession,
				availableTools,
				assistantMessage,
				workingMessageEl,
				stepIndicatorsEl,
				memoryContext,
				memoryMessages,
				memoryEnabled,
				prepareMessages
			});
			
			return true; // Handled
		}
		
		// Route to Normal Mode
		if (conversationMode === 'normal') {
			Logger.debug('[ConversationOrchestrator] Routing to Normal Mode Handler');
			
			// Update step indicator to active for AI response
			if (stepIndicatorsEl) {
				updateStepIndicator(stepIndicatorsEl, 'ai-response', 'active');
			}
			
			try {
				await this.normalModeHandler.execute({
					userMessage,
					currentSession,
					provider,
					stepIndicatorsEl,
					memoryContext,
					memoryMessages,
					memoryEnabled,
					updateStepIndicator,
					prepareMessages,
					autoGenerateSessionTitle,
					removeStepIndicators
				});
				
				Logger.debug('[ConversationOrchestrator] Normal Mode Handler completed successfully');
				return true; // Handled
			} catch (error) {
				Logger.error('[ConversationOrchestrator] Normal Mode Handler failed:', error);
				Logger.warn('[ConversationOrchestrator] Will fall back to original implementation');
				removeStepIndicators(stepIndicatorsEl);
				return false; // Not handled, needs fallback
			}
		}
		
		Logger.debug('[ConversationOrchestrator] No handler matched, using fallback');
		return false; // Not handled
	}
	
	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		this.normalModeHandler.cleanup();
		this.agentModeHandler.cleanup();
		this.guidedModeHandler.cleanup();
	}
}
