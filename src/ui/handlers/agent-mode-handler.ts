import { ChatMessage, ChatSession } from '../../types';
import { IAgentModeHandler } from '../types/chat-view-interfaces';
import ObsidianLLMSider from '../../main';
import { Logger } from '../../utils/logger';
import { StreamManager } from '../../core/stream-manager';
import { MastraPlanExecuteProcessor } from '../../core/agent/mastra-plan-execute-processor';
import { UnifiedTool } from '../../tools/unified-tool-manager';

/**
 * Handler for Agent conversation mode (Plan-Execute framework)
 * Uses Mastra Plan-Execute processor for complex multi-step tasks
 */
export class AgentModeHandler implements IAgentModeHandler {
	private plugin: ObsidianLLMSider;
	private streamManager: StreamManager;
	private mastraPlanExecuteProcessor: MastraPlanExecuteProcessor;
	
	constructor(
		plugin: ObsidianLLMSider,
		streamManager: StreamManager,
		mastraPlanExecuteProcessor: MastraPlanExecuteProcessor
	) {
		this.plugin = plugin;
		this.streamManager = streamManager;
		this.mastraPlanExecuteProcessor = mastraPlanExecuteProcessor;
	}
	
	/**
	 * Determine if should use Plan-Execute framework
	 */
	shouldUsePlanExecuteFramework(content: string, availableTools: UnifiedTool[]): boolean {
		// Always use plan-execute framework when conversation mode is 'agent' and tools are available
		const conversationMode = this.plugin.settings.conversationMode || 'normal';
		const shouldUse = conversationMode === 'agent' && availableTools.length > 0;
		Logger.debug(`[AgentModeHandler] shouldUsePlanExecuteFramework: conversationMode=${conversationMode}, availableTools.length=${availableTools.length}, shouldUse=${shouldUse}`);
		return shouldUse;
	}
	
	/**
	 * Execute Agent mode (Plan-Execute framework)
	 */
	async execute(params: {
		userMessage: ChatMessage;
		currentSession: ChatSession;
		availableTools: UnifiedTool[];
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
	}): Promise<void> {
		const {
			userMessage,
			currentSession,
			assistantMessage,
			workingMessageEl,
			memoryContext,
			memoryMessages,
			memoryEnabled,
			prepareMessages
		} = params;
		
		let { stepIndicatorsEl } = params;
		
		Logger.debug('[AgentModeHandler] Using Plan-Execute framework');
		
		// Remove step indicators as Agent mode has its own indicators
		if (stepIndicatorsEl) {
			stepIndicatorsEl.remove();
			stepIndicatorsEl = null;
		}
		
		// Prepare messages for plan-execute mode
		const messages = await prepareMessages(
			userMessage,
			stepIndicatorsEl,
			memoryContext,
			memoryMessages,
			memoryEnabled
		);
		
		// Remove the temporary assistant message since plan-execute handles its own UI
		if (workingMessageEl) {
			workingMessageEl.remove();
		}
		if (currentSession && assistantMessage) {
			const messageIndex = currentSession.messages.findIndex(m => m.id === assistantMessage.id);
			if (messageIndex > -1) {
				currentSession.messages.splice(messageIndex, 1);
			}
		}
		
		// Start streaming mode with stop button for plan-execute
		const streamController = this.streamManager.startStreaming();

		// Set up stop handler for plan-execute
		this.streamManager.setStopHandler(() => {
			Logger.debug('[AgentModeHandler] Plan-Execute stopped by user');
			// Remove thinking indicator when stopped
			if (workingMessageEl) {
				workingMessageEl.remove();
			}
			if (currentSession && assistantMessage) {
				const messageIndex = currentSession.messages.findIndex(m => m.id === assistantMessage.id);
				if (messageIndex > -1) {
					currentSession.messages.splice(messageIndex, 1);
				}
			}
			this.mastraPlanExecuteProcessor.stop();
			this.streamManager.resetButtonStates();
		});

		try {
			await this.mastraPlanExecuteProcessor.startPlanExecuteFlow(
				userMessage.content as string,
				messages,
				streamController
			);
		} finally {
			// Always reset button states when plan-execute completes or fails
			this.streamManager.resetButtonStates();
		}
	}
	
	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		// No cleanup needed currently
	}
}
