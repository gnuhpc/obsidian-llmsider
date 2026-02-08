import { ChatMessage, ChatSession } from '../../types';
import { IGuidedModeHandler } from '../types/chat-view-interfaces';
import ObsidianLLMSider from '../../main';
import { Logger } from '../../utils/logger';

/**
 * Handler for Guided conversation mode
 * Delegates implementation to ChatView methods to avoid massive code duplication
 */
export class GuidedModeHandler implements IGuidedModeHandler {
	private plugin: ObsidianLLMSider;
	
	// Callbacks to ChatView methods
	private onHandleGuidedMode: (userMessage: ChatMessage, messages: ChatMessage[]) => Promise<void>;
	
	constructor(
		plugin: ObsidianLLMSider,
		onHandleGuidedMode: (userMessage: ChatMessage, messages: ChatMessage[]) => Promise<void>
	) {
		this.plugin = plugin;
		this.onHandleGuidedMode = onHandleGuidedMode;
	}
	
	/**
	 * Execute Guided mode conversation
	 */
	async execute(params: {
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
	}): Promise<void> {
		const { userMessage, messages } = params;
		
		Logger.debug('[GuidedModeHandler] Executing Guided mode');
		
		// Delegate to ChatView's handleGuidedMode method
		await this.onHandleGuidedMode(userMessage, messages);
	}
	
	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		// No cleanup needed currently
	}
}
