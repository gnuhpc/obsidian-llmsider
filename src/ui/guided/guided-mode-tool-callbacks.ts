import { ChatMessage } from '../../types';
import { MemoryCoordinator } from '../memory/memory-coordinator';
import { MessageRenderer } from '../message-renderer';
import { setIcon } from 'obsidian';
import { Logger } from '../../utils/logger';
import { MemoryManager } from '../../core/agent/memory-manager';
import { ToolResultCard } from '../tool-result-card';
import { GuidedModeUIRenderer } from './guided-mode-ui-renderer';

/**
 * Interface for shared state across tool callbacks
 */
export interface IToolCallbackState {
	assistantMessage: ChatMessage;
	workingMessageEl: HTMLElement | null;
	followUpMessageEl: HTMLElement | null;
	isFollowUpResponse: boolean;
	accumulatedContent: string;
	stepIndicatorsEl: HTMLElement | null;
	toolAnalysisTimer: NodeJS.Timeout | null;
	waitingIndicatorEl: HTMLElement | null; // Track the specific waiting indicator for this stream
	chunkCount: number;
	lastChunkTime: number;
}

/**
 * Interface for tool callback dependencies
 */
export interface IToolCallbackDeps {
	memoryCoordinator: MemoryCoordinator;
	messageRenderer: MessageRenderer;
	guidedModeUIRenderer: GuidedModeUIRenderer;
	sharedMemoryManager: MemoryManager | null;
	plugin: any;
	getCurrentSession: () => any;
	updateStepIndicator: (tool: string) => void;
	removeStepIndicators: (el?: HTMLElement | null) => void;
	scrollToBottom: () => void;
	getThreadId: () => string | null;
	handleSendMessage: (message: string) => Promise<void>;
}

/**
 * Handles tool-related callbacks for Mastra guided mode
 */
export class GuidedModeToolCallbacks {
	constructor(private deps: IToolCallbackDeps) {}
	
	/**
	 * Creates the onToolSuggested callback
	 */
	createOnToolSuggestedCallback(state: IToolCallbackState) {
		return async (toolCalls: Array<{ function: { name: string; arguments: string } }>) => {
			// Clear any step indicators before processing tools
			this.deps.removeStepIndicators(state.stepIndicatorsEl);
			
			// Update the content with the current accumulated response
			if (state.workingMessageEl) {
				const questionContent = state.workingMessageEl.querySelector('.llmsider-guided-question-content') as HTMLElement;
				if (questionContent) {
					let displayContent = this.deps.memoryCoordinator.stripMemoryMarkers(state.accumulatedContent);
					displayContent = this.deps.guidedModeUIRenderer.removeOptionsFromContent(displayContent);
					this.deps.messageRenderer.updateStreamingContent(questionContent, displayContent);
				}
			}
			
			// Save pre-tool explanation message to session
			// This preserves the text that appears before tool execution
			const currentSession = this.deps.getCurrentSession();
			
			if (currentSession && state.accumulatedContent && state.accumulatedContent.trim().length > 0) {
				const preToolContent = this.deps.memoryCoordinator.stripMemoryMarkers(state.accumulatedContent);
				
				// Only save if there's meaningful content (not just whitespace or markers)
				if (preToolContent.trim().length > 0) {
					const preToolMessage: ChatMessage = {
						id: `pre-tool-${Date.now()}`,
						role: 'assistant',
						content: preToolContent,
						timestamp: Date.now(),
						metadata: {
							isPreToolExplanation: true,
							toolsToExecute: toolCalls.map(tc => tc.function.name)
						}
					};
					
					currentSession.messages.push(preToolMessage);
				}
			}
			
			// Store tool calls in the assistant message's metadata
			if (state.assistantMessage.metadata) {
				state.assistantMessage.metadata.suggestedToolCalls = toolCalls;
				state.assistantMessage.metadata.requiresToolConfirmation = true;
			}
			
			// Save assistant message to Memory system immediately when tool calls are suggested
			if (this.deps.sharedMemoryManager) {
				try {
					const threadId = this.deps.getThreadId();
					await this.deps.sharedMemoryManager.addConversationMessage(
						{
							role: 'assistant',
							content: typeof state.assistantMessage.content === 'string' 
								? state.assistantMessage.content 
								: JSON.stringify(state.assistantMessage.content),
						toolCalls: state.assistantMessage.metadata?.toolCalls
					},
					threadId || undefined
				);
				Logger.debug('[GuidedMode-Mastra] ✅ Assistant message with tool calls saved to Memory');
			} catch (error) {
				Logger.warn('[GuidedMode-Mastra] Failed to save assistant message to Memory:', error);
			}
		}
		
		// Save to current session for title generation
		// (will be saved again in onComplete, but title generation needs it now)
			
			Logger.debug('[GuidedMode-Mastra] Timestamp:', new Date().toISOString());
			Logger.debug('[GuidedMode-Mastra] Total tools to execute:', toolCalls.length);
		};
	}
	
	/**
	 * Creates the onToolExecuted callback
	 */
	createOnToolExecutedCallback(state: IToolCallbackState) {
		return async (result: any, toolName: string, parameters: unknown) => {
			const toolExecutedTime = Date.now();
			Logger.debug('[GuidedMode-Mastra] 🔧 onToolExecuted callback triggered');
			Logger.debug('[GuidedMode-Mastra] Timestamp:', new Date().toISOString());
			Logger.debug('[GuidedMode-Mastra] Tool name:', toolName);
			Logger.debug('[GuidedMode-Mastra] Raw result type:', typeof result);
			Logger.debug('[GuidedMode-Mastra] Raw result:', result);
			
			// Parse the result to check if it's MCP format or standard format
			let resultData: any;
			let isSuccess = false;
			let errorMsg = '';
			
			// Handle various result formats
			if (result && typeof result === 'object') {
				// Case 1: UnifiedToolManager format {success, error, result}
				if ('success' in result && ('result' in result || 'error' in result)) {
					isSuccess = result.success;
					resultData = isSuccess ? result.result : result.error;
					if (!isSuccess) {
						errorMsg = result.error || 'Unknown error';
					}
					Logger.debug('[GuidedMode-Mastra] Detected UnifiedTool format:', {isSuccess, errorMsg});
				}
				// Case 2: MCP standard format {content, isError}
				else if ('content' in result || 'isError' in result) {
					resultData = result.content;
					isSuccess = !result.isError;
					if (result.isError && result.content) {
						errorMsg = typeof result.content === 'string' 
							? result.content 
							: JSON.stringify(result.content);
					}
					Logger.debug('[GuidedMode-Mastra] Detected MCP format:', {isSuccess, errorMsg});
				} 
				// Case 3: Object result (treat as success)
				else {
					resultData = result;
					isSuccess = true;
				}
			} else {
				// Case 3: Primitive result (treat as success)
				resultData = result;
				isSuccess = true;
			}
			
			// Create tool result message
			const toolResultMessage: ChatMessage = {
				id: `tool-result-${Date.now()}`,
				role: 'system' as const,
				content: typeof resultData === 'string' ? resultData : JSON.stringify(resultData, null, 2),
				timestamp: Date.now(),
				metadata: {
					toolName,
				toolResult: true
			}
		};
		
		// Save to current session
		const currentSession = this.deps.getCurrentSession();
		if (currentSession) {
			currentSession.messages.push(toolResultMessage);
		}
	
	// Save to Memory system
	if (this.deps.sharedMemoryManager) {
		try {
			const threadId = this.deps.getThreadId();
			const content = typeof toolResultMessage.content === 'string' 
				? toolResultMessage.content 
				: JSON.stringify(toolResultMessage.content);
			await this.deps.sharedMemoryManager.addConversationMessage(
				{
					role: 'system',
					content
				},
				threadId || undefined
			);
			Logger.debug('[GuidedMode-Mastra] Tool result saved to Memory');
		} catch (error) {
			Logger.warn('[GuidedMode-Mastra] Failed to save tool result to Memory:', error);
		}
	}
	
	// Find the executing tool card and update it
	const toolCards = Array.from(document.querySelectorAll('[data-tool-card-name]'));
	const targetCardName = toolName;
	let targetCard: HTMLElement | null = null;
	
	for (const card of toolCards) {
		const cardToolName = card.getAttribute('data-tool-card-name');
		const isExecuting = card.hasAttribute('data-tool-executing');
		if (cardToolName === targetCardName && isExecuting) {
			targetCard = card as HTMLElement;
			break;
		}
	}
	
	if (targetCard) {
		const existingParameters = parameters;
		
		// Get the existing card instance
		const cardInstance = (targetCard.parentElement as any)?.__toolResultCardInstance;
		
		if (cardInstance) {
			Logger.debug('[GuidedMode-Mastra] Updating existing card instance with result');
			
			// Update existing card to success or error status
			if (isSuccess) {
				cardInstance.updateStatus('success', {
					result: resultData
				});
			} else {
				cardInstance.updateStatus('error', {
					error: errorMsg || this.deps.plugin.i18n.t('ui.toolExecutionFailed'),
					onRegenerateAndRetry: async () => {
						Logger.debug('[GuidedMode-Mastra] User chose: Regenerate and retry');
						
						// Remove the card message container
						const cardMessage = targetCard.closest('.llmsider-tool-card-message');
						if (cardMessage) {
							cardMessage.remove();
						} else {
							targetCard.remove();
						}

						this.deps.scrollToBottom();
						
						const retryPrompt = this.deps.plugin.i18n.t('ui.regenerateToolPrompt', {
							toolName: toolName,
							error: errorMsg
						});
						
						await this.deps.handleSendMessage(retryPrompt);
					},
					onRetry: async () => {
						Logger.debug('[GuidedMode-Mastra] User chose: Retry with same params');
						
						// Remove the card message container
						const cardMessage = targetCard.closest('.llmsider-tool-card-message');
						if (cardMessage) {
							cardMessage.remove();
						} else {
							targetCard.remove();
						}

						this.deps.scrollToBottom();
						
						const retryPrompt = this.deps.plugin.i18n.t('ui.retryToolSameParamsPrompt', {
							toolName: toolName,
							parameters: JSON.stringify(parameters)
						});
						
						await this.deps.handleSendMessage(retryPrompt);
					},
					onSkip: async () => {
						Logger.debug('[GuidedMode-Mastra] User chose: Skip');
						cardInstance.updateStatus('error', {
							error: `${errorMsg} (${this.deps.plugin.i18n.t('common.skipped')})`
						});
						this.deps.scrollToBottom();
						
						const skipMessage = this.deps.plugin.i18n.t('ui.toolSkippedPrompt', {
							toolName: toolName,
							error: errorMsg
						});
						
						await this.deps.handleSendMessage(skipMessage);
					},
					regenerateAndRetryButtonText: this.deps.plugin.i18n.t('planExecute.toolCardLabels.regenerateAndRetry'),
					retryButtonText: this.deps.plugin.i18n.t('planExecute.toolCardLabels.retry'),
					skipButtonText: this.deps.plugin.i18n.t('planExecute.toolCardLabels.skip')
				});
			}
		} else {
			// Fallback: create new card if instance not found
			Logger.warn('[GuidedMode-Mastra] Card instance not found, creating new card');
			
			// Create tool card data
			const toolCardData: any = {
				toolName: toolName,
				status: isSuccess ? 'success' : 'error',
				parameters: existingParameters as any,
				timestamp: new Date()
			};
			
			if (isSuccess) {
				toolCardData.result = resultData;
			} else {
				toolCardData.error = errorMsg || this.deps.plugin.i18n.t('ui.toolExecutionFailed');
				toolCardData.regenerateAndRetryButtonText = this.deps.plugin.i18n.t('planExecute.toolCardLabels.regenerateAndRetry');
				toolCardData.retryButtonText = this.deps.plugin.i18n.t('planExecute.toolCardLabels.retry');
				toolCardData.skipButtonText = this.deps.plugin.i18n.t('planExecute.toolCardLabels.skip');

				toolCardData.onRegenerateAndRetry = async () => {
					Logger.debug('[GuidedMode-Mastra] User chose: Regenerate and retry (fallback)');
					const cardMessage = targetCard.closest('.llmsider-tool-card-message');
					if (cardMessage) cardMessage.remove();
					else targetCard.remove();
					this.deps.scrollToBottom();
					const retryPrompt = this.deps.plugin.i18n.t('ui.regenerateToolPrompt', { toolName, error: errorMsg });
					await this.deps.handleSendMessage(retryPrompt);
				};

				toolCardData.onRetry = async () => {
					Logger.debug('[GuidedMode-Mastra] User chose: Retry with same params (fallback)');
					const cardMessage = targetCard.closest('.llmsider-tool-card-message');
					if (cardMessage) cardMessage.remove();
					else targetCard.remove();
					this.deps.scrollToBottom();
					const retryPrompt = this.deps.plugin.i18n.t('ui.retryToolSameParamsPrompt', { toolName, parameters: JSON.stringify(parameters) });
					await this.deps.handleSendMessage(retryPrompt);
				};

				toolCardData.onSkip = async () => {
					Logger.debug('[GuidedMode-Mastra] User chose: Skip (fallback)');
					const skipMessage = this.deps.plugin.i18n.t('ui.toolSkippedPrompt', { toolName, error: errorMsg });
					await this.deps.handleSendMessage(skipMessage);
				};
			}
			
			new ToolResultCard(targetCard, toolCardData);
		}
		
		// Create waiting indicator after tool execution (for successful tools only)
		// This indicator will be replaced when AI responds with follow-up content
		if (isSuccess) {
			Logger.debug('[onToolExecuted] Tool execution successful, preparing for follow-up response');
			Logger.debug('[onToolExecuted] targetCard exists:', !!targetCard);
			
			state.isFollowUpResponse = true;
			state.accumulatedContent = '';
			state.followUpMessageEl = null;
			state.chunkCount = 0; // Reset chunk count for next streaming response
			state.lastChunkTime = Date.now(); // Reset timing
			
			Logger.debug('[onToolExecuted] Creating waiting indicator after successful tool execution');
			
			// Find the tool card message element
			const toolCardMessage = targetCard ? targetCard.closest('.llmsider-tool-card-message') : null;
			Logger.debug('[onToolExecuted] toolCardMessage found:', !!toolCardMessage);
			if (toolCardMessage) {
				// Create waiting indicator with the same structure as Normal Mode step indicators
				const waitingIndicator = document.createElement('div');
				waitingIndicator.className = 'llmsider-step-indicator active llmsider-plan-execute-tool-indicator';
				waitingIndicator.style.cssText = 'margin: 8px 0;';
				
				// Create icon (using bot icon like Normal Mode)
				const icon = waitingIndicator.createDiv({ cls: 'llmsider-step-icon' });
				setIcon(icon, 'bot');
				
				// Create text
				const textEl = waitingIndicator.createDiv({ cls: 'llmsider-step-text' });
				textEl.textContent = this.deps.plugin.i18n.t('common.waitingForAIResponse') || 'Waiting for AI response...';
				textEl.setAttribute('data-followup-streaming-content', '');
				
				// Insert after tool card message
				toolCardMessage.insertAdjacentElement('afterend', waitingIndicator);
				Logger.debug('[onToolExecuted] ✓ Waiting indicator created and inserted:', waitingIndicator);
				
				// Store reference for later replacement
				state.waitingIndicatorEl = waitingIndicator;
				Logger.debug('[onToolExecuted] ✓ Waiting indicator stored in state');
			} else {
				Logger.debug('[onToolExecuted] ✗ Could not find tool card message to insert indicator after');
			}
			
			Logger.debug('[GuidedMode-Mastra] Waiting for AI response (indicator created in onToolExecuted)');
			
			this.deps.scrollToBottom();
		}
	} else {
		Logger.warn('[GuidedMode-Mastra] Could not find executing tool card to update with result');
	}
};
	}
}
