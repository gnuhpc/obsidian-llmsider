/**
 * Mastra-based Plan-Execute Processor
 * 
 * This is a refactored version of the plan-execute processor that leverages
 * mastra's Agent capabilities for more robust plan generation and execution.
 * 
 * Key improvements over the original implementation:
 * 1. Uses mastra's built-in agent loop for automatic retries and error handling
 * 2. Leverages mastra's tool orchestration system
 * 3. Better separation of concerns between planning and execution
 * 4. More maintainable code structure following mastra patterns
 */

import { setIcon } from 'obsidian';
import { Logger } from '../../utils/logger';
import LLMSiderPlugin from '../../main';
import { ChatMessage } from '../../types';
import { I18nManager } from '../../i18n/i18n-manager';
import { ToolExecutionManager } from '../../tools/tool-execution-manager';
import { getAllBuiltInTools } from '../../tools/built-in-tools';
import { MastraAgent, AgentExecuteOptions, AgentPlan, AgentStep } from './mastra-agent';
import { ContextManager } from '../context-manager';
import { Task } from '../../processors/plan-execute-tracker';
import { StreamingIndicatorManager } from '../../processors/helpers/streaming-indicator-manager';
import { ToolExecutionIndicator } from '../../processors/tool-execution-indicator';
import { ErrorRenderer } from '../../ui/error-renderer';
import { AgentGraphVisualizer } from '../../ui/agent-graph-visualizer';
import { ErrorActionPanel, ErrorActionType } from '../../ui/error-action-panel';

/**
 * Plan-Execute Processor using Mastra Agent framework
 * 
 * This processor implements the plan-and-execute pattern using mastra's
 * agent capabilities. It provides:
 * - Automatic plan generation from user queries
 * - Sequential step execution with error handling
 * - Streaming responses
 * - UI integration with existing PlanExecuteTracker
 */
export class MastraPlanExecuteProcessor {
	private plugin: LLMSiderPlugin;
	private toolExecutionManager: ToolExecutionManager;
	private messageContainer: HTMLElement;
	private i18n: I18nManager;
	private agent: MastraAgent | null = null;
	private abortController: AbortController | null = null;
	private isAborted: boolean = false;
	private streamingManager: StreamingIndicatorManager;
	private planTasks: Task[] = [];
	private dagContainer: HTMLElement | null = null;
	private graphVisualizer: AgentGraphVisualizer | null = null;
	private executionIndicator: ToolExecutionIndicator | null = null;
	private currentAnswerMessageId: string = '';
	private errorActionPanel: ErrorActionPanel | null = null;
	private errorActionResolver: ((action: ErrorActionType) => void) | null = null;
	
	// Store context for regeneration
	private currentUserQuery: string = '';
	private currentMessages: ChatMessage[] = [];
	private currentSessionId: string = '';
	private currentAbortController: AbortController | null = null;
	private currentPlan: AgentPlan | null = null;
	
	// Track current execution step element for retry positioning
	private currentStepElement: HTMLElement | null = null;
	private currentStepId: string | null = null;
	
	// Callbacks for UI integration
	private onPlanCreatedCallback?: (planData: unknown, tasks: Task[], executionMode?: 'dag' | 'sequential') => void;
	private onStepExecutedCallback?: (step: AgentStep) => void;
	
	constructor(
		plugin: LLMSiderPlugin,
		toolExecutionManager: ToolExecutionManager,
		messageContainer: HTMLElement,
		private contextManager?: ContextManager
	) {
		this.plugin = plugin;
		this.toolExecutionManager = toolExecutionManager;
		this.messageContainer = messageContainer;
		this.i18n = plugin.getI18nManager()!;
		
		// Create streaming indicator manager with minimal configuration
		// These refs will be null for Mastra processor as it manages its own state
		this.streamingManager = new StreamingIndicatorManager(
			this.messageContainer,
			this.i18n,
			this.plugin,
			null, // planTracker - not needed for Mastra
			() => false, // isExecutingStepRef
			() => null, // pendingToolFailureRef
			async () => { // onRegeneratePlan - regenerate with error context
				Logger.debug('[MastraPlanExecuteProcessor] Regenerate plan callback invoked');
				await this.regeneratePlan();
			}
		);
		
		Logger.debug('[MastraPlanExecuteProcessor] Initialized with streaming manager');
	}
	
	/**
	 * Set callback for when plan is created
	 */
	setPlanCreatedCallback(callback: (planData: unknown, tasks: Task[], executionMode?: 'dag' | 'sequential') => void): void {
		this.onPlanCreatedCallback = callback;
	}
	
	/**
	 * Set callback for when a step is executed
	 */
	setStepExecutedCallback(callback: (step: AgentStep) => void): void {
		this.onStepExecutedCallback = callback;
	}
	
	/**
	 * Reset agent instance to force re-initialization with new provider
	 * Call this when provider changes mid-conversation
	 */
	resetAgent(): void {
		Logger.debug('[MastraPlanExecuteProcessor] Resetting agent instance due to provider change');
		this.agent = null;
	}
	
	/**
	 * Start Plan-Execute flow with mastra agent
	 * 
	 * This is the main entry point for plan-execute processing.
	 * It replaces the original startPlanExecuteFlow method.
	 */
	async startPlanExecuteFlow(
		userQuery: string,
		messages: ChatMessage[],
		abortController?: AbortController,
		sessionId?: string
	): Promise<void> {
		Logger.debug('[MastraPlanExecuteProcessor] ========================================');
		Logger.debug('[MastraPlanExecuteProcessor] ===== STARTING PLAN EXECUTE FLOW =====');
		Logger.debug('[MastraPlanExecuteProcessor] ========================================');
		try {
			Logger.debug('[MastraPlanExecuteProcessor] Starting plan-execute flow');
			
			// Save context for potential regeneration
			this.currentUserQuery = userQuery;
			this.currentMessages = messages;
			this.currentSessionId = sessionId || `session-${Date.now()}`;
			this.currentAbortController = abortController || null;
			
			// Setup abort controller
			this.abortController = abortController || new AbortController();
			this.isAborted = false;
			
			// Generate thread and resource IDs for memory
			const threadId = sessionId || `session-${Date.now()}`;
			const resourceId = this.plugin.getResourceId();
			
			// Initialize mastra agent if not already done
			if (!this.agent) {
				await this.initializeAgent(threadId, resourceId);
			} else {
				// Update thread ID if switching sessions
				await this.agent.setThreadId(threadId);
			}
			
			// Accumulate streaming response for final answer
			let finalAnswer = '';
			let answerMessageSent = false;
			
			// Prepare execution options
			const executeOptions: AgentExecuteOptions = {
				messages,
				maxSteps: 10,
				abortController: this.abortController,
				onPlanGenerated: (plan) => {
					Logger.debug('[MastraPlanExecuteProcessor] ===== PLAN GENERATION =====');
					Logger.debug('[MastraPlanExecuteProcessor] Plan generated:', plan);
					Logger.debug('[MastraPlanExecuteProcessor] Total steps:', plan.steps.length);
					
					// Store plan for retry/resume
					this.currentPlan = plan;
					
					// Auto-insert generate_content steps before create_note/create_file if missing
					this.autoInsertGenerateContentSteps(plan);
					
					// Log each step with dependencies
					plan.steps.forEach((step, index) => {
						Logger.debug(`[MastraPlanExecuteProcessor] Step ${index + 1} (${step.id}):`, {
							tool: step.tool,
							dependencies: step.dependencies || [],
							input: step.input,
							reason: step.reason
						});
					});
					
					// Convert AgentPlan to Task[] format and store
					this.planTasks = this.convertPlanToTasks(plan);
					
					// Check execution mode to determine UI rendering
					const executionMode = this.plugin.settings.planExecutionMode || 'sequential';
					Logger.debug('[MastraPlanExecuteProcessor] Rendering plan UI in mode:', executionMode);
					
					// All modes now use DAG visualization (sequential is just a special case - a linear graph)
					const planElement = this.messageContainer.createDiv({ cls: 'llmsider-plan-dag-container' });
					
					if (executionMode === 'sequential') {
						planElement.addClass('sequential-mode');
						// Sequential mode: Transform plan into a linear chain (special DAG case)
						this.addSequentialDependencies(plan);
						this.renderDAGPlan(plan, planElement);
						Logger.debug('[MastraPlanExecuteProcessor] Sequential plan UI created with', plan.steps.length, 'steps (as linear DAG)');
					} else if (executionMode === 'dag') {
						// DAG mode: Use the plan's existing dependencies
						this.renderDAGPlan(plan, planElement);
						Logger.debug('[MastraPlanExecuteProcessor] DAG plan UI created with', plan.steps.length, 'steps');
					} else if (executionMode === 'graph') {
						// Graph mode: Create dynamic graph visualization
						this.renderGraphPlan(plan, planElement);
						Logger.debug('[MastraPlanExecuteProcessor] Graph plan UI created with', plan.steps.length, 'initial steps');
					}
					
					// Create execution indicator
					// In sequential mode, we put it INSIDE the plan container for side-by-side layout
					// In other modes, we keep it below the plan
					const indicatorParent = executionMode === 'sequential' ? planElement : this.messageContainer;
					
					// Always recreate indicator to ensure correct parent and fresh state
					if (this.executionIndicator) {
						this.executionIndicator.destroy();
					}
					
					this.executionIndicator = new ToolExecutionIndicator(indicatorParent, this.plugin);
					Logger.debug(`[TOOL-EXEC-DEBUG] ✅ Created execution indicator in ${executionMode === 'sequential' ? 'plan container' : 'message container'}`);
					
					// Set up streaming callback for content generation
					if (this.agent) {
						this.agent.setContentStreamCallback((stepIndex: number, content: string) => {
							// Logger.debug('[TOOL-EXEC-DEBUG] 📺 Streaming callback invoked:', {
							// 	stepIndex,
							// 	contentLength: content.length,
							// 	hasIndicator: !!this.executionIndicator
							// });
							if (this.executionIndicator) {
								this.executionIndicator.updateStreamingContent(content);
							}
						});
						// Logger.debug('[MastraPlanExecuteProcessor] ✅ Content stream callback registered');
					}
					
					// Notify UI callback with execution mode
					if (this.onPlanCreatedCallback) {
						this.onPlanCreatedCallback(plan, this.planTasks, executionMode);
					}
				},
					onStepExecuted: (step) => {
						Logger.debug('[MastraPlanExecuteProcessor] ===== onStepExecuted Callback =====');
						Logger.debug('[MastraPlanExecuteProcessor] Step ID:', step.id);
						Logger.debug('[MastraPlanExecuteProcessor] Step Status:', step.status);
					Logger.debug('[MastraPlanExecuteProcessor] Step Tool:', step.tool);
					Logger.debug('[MastraPlanExecuteProcessor] Step FULL STRUCTURE:', JSON.stringify(step, null, 2));
					Logger.debug('[MastraPlanExecuteProcessor] Has executionIndicator:', !!this.executionIndicator);
					
					// Check if we're in DAG or sequential mode and update DAG UI
					// (Sequential now also uses DAG visualization as a linear graph)
					const executionMode = this.plugin.settings.planExecutionMode || 'sequential';
					if ((executionMode === 'dag' || executionMode === 'sequential') && this.dagContainer) {
						// Map AgentStep status to DAG node status
						const dagStatus = step.status === 'failed' ? 'failed' : 
						                   step.status === 'executing' ? 'executing' : 
						                   step.status === 'completed' ? 'completed' : 'pending';
						this.updateDAGNodeStatus(step.id, dagStatus);
					}
					
					// Handle execution indicator based on step status
				if (this.executionIndicator) {
					Logger.debug('[MastraPlanExecuteProcessor] 🎯 Execution indicator exists, processing status:', step.status);						if (step.status === 'executing') {
							// When a new step starts executing, show it immediately
							// (This will replace/update the previous step's display)
							const rawToolName = step.tool || 'Unknown Tool';
							let displayToolName = rawToolName;
							
							// Localize tool name
							if (step.tool === 'generate_content') {
								displayToolName = this.i18n.t('tools.generateContent.name') || '生成内容';
							} else {
								const tools = getAllBuiltInTools({ i18n: this.i18n }) as Record<string, { name: string }>;
								if (tools[step.tool]) {
									displayToolName = tools[step.tool].name;
								}
							}

							// Parameters are in step.input (before execution) or step.toolCalls[0].parameters (during/after)
							const parameters = step.input || step.toolCalls?.[0]?.parameters || {};
							const stepIndex = this.planTasks.findIndex(t => t.id === step.id);
							
							Logger.debug('[MastraPlanExecuteProcessor] 🚀 SHOWING execution indicator:');
							Logger.debug('  - Tool:', rawToolName);
							Logger.debug('  - Display Name:', displayToolName);
							Logger.debug('  - Step Index:', stepIndex);
							Logger.debug('  - Parameters:', parameters);
							
							// Find target element for alignment (in sequential mode)
						// If this is a retry of the same step, reuse the previous element position
						let targetEl: HTMLElement | undefined;
						if (executionMode === 'sequential' && this.dagContainer) {
							// Check if we're retrying the same step - if so, reuse the previous element
							if (this.currentStepId === step.id && this.currentStepElement) {
								Logger.debug('[MastraPlanExecuteProcessor] 🔄 Retrying same step, reusing element position');
								targetEl = this.currentStepElement;
							} else {
								// New step or different step, find the element
								const node = this.dagContainer.querySelector(`[data-step-id="${step.id}"]`);
								if (node instanceof HTMLElement) {
									targetEl = node;
									// Store for potential retry
									this.currentStepElement = node;
									this.currentStepId = step.id;
								}
							}
						}
						
						this.executionIndicator.show(stepIndex, rawToolName, parameters, targetEl, displayToolName);
						
						Logger.debug('[MastraPlanExecuteProcessor] ✅ show() method called');
						
					} else if (step.status === 'completed') {
						// Update indicator to show completion
						// (Keep it visible until next step starts)
						// Only clear currentStepElement when moving to a different step
						if (this.currentStepId !== step.id) {
							this.currentStepElement = null;
							this.currentStepId = null;
						}
						
						Logger.debug('[TOOL-EXEC-DEBUG] ✅ COMPLETING execution indicator:');
						Logger.debug('[TOOL-EXEC-DEBUG]   - Step ID:', step.id);
						Logger.debug('[TOOL-EXEC-DEBUG]   - Has toolCalls:', !!step.toolCalls);
						Logger.debug('[TOOL-EXEC-DEBUG]   - toolCalls length:', step.toolCalls?.length);
						Logger.debug('[TOOL-EXEC-DEBUG]   - Has parameters:', !!step.toolCalls?.[0]?.parameters);
						
						// Update parameters with actual values (replacing templates)
						if (step.toolCalls?.[0]?.parameters) {
							const actualParameters = step.toolCalls[0].parameters;
							let toolName = step.tool || 'Unknown Tool';
							
							// Localize tool name
							if (step.tool === 'generate_content') {
								toolName = this.i18n.t('tools.generateContent.name') || '生成内容';
							} else {
								const tools = getAllBuiltInTools({ i18n: this.i18n }) as Record<string, { name: string }>;
								if (tools[step.tool]) {
									toolName = tools[step.tool].name;
								}
							}

							Logger.debug('[TOOL-EXEC-DEBUG] 🔄 Updating parameters with actual values');
							Logger.debug('[TOOL-EXEC-DEBUG]   - Tool:', toolName);
							Logger.debug('[TOOL-EXEC-DEBUG]   - Parameters:', actualParameters);
							this.executionIndicator.updateParameters(toolName, actualParameters);
						} else {
							Logger.warn('[TOOL-EXEC-DEBUG] ⚠️ No parameters to update');
						}
						
						const finalContent = step.toolCalls?.[0]?.response 
							? (typeof step.toolCalls[0].response === 'string' 
								? step.toolCalls[0].response 
								: JSON.stringify(step.toolCalls[0].response, null, 2))
							: '';
						
						Logger.debug('[TOOL-EXEC-DEBUG]   - Final content length:', finalContent.length);
						Logger.debug('[TOOL-EXEC-DEBUG]   - Will stay visible until next step or end');
						
						this.executionIndicator.complete(finalContent);
						
						Logger.debug('[TOOL-EXEC-DEBUG] ✅ complete() method called');
						
						} else if (step.status === 'failed') {
							// Show error state (will auto-hide after 5s)
						// Keep currentStepElement/currentStepId for potential retry
						Logger.debug('[MastraPlanExecuteProcessor] ❌ SHOWING ERROR in execution indicator:');
						Logger.debug('  - Error:', step.error);
						Logger.debug('  - Keeping element reference for potential retry');
							
							Logger.debug('[MastraPlanExecuteProcessor] ❌ showError() method called');
						
						} else {
							Logger.debug('[MastraPlanExecuteProcessor] ⚠️ Unhandled step status:', step.status);
						}
					} else {
						Logger.warn('[MastraPlanExecuteProcessor] ⚠️ executionIndicator is NULL! Cannot show step execution.');
					}
					
					// Update corresponding task in array
					const task = this.planTasks.find(t => t.id === step.id);
					if (task) {
						// Map AgentStep status to TaskStatus
						// AgentStep uses 'failed', but TaskStatus uses 'error'
						const taskStatus = step.status === 'failed' ? 'error' : 
						                   step.status === 'executing' ? 'in-progress' : 
						                   step.status as any;
						task.status = taskStatus;
					task.result = step.result ? JSON.stringify(step.result).substring(0, 500) : undefined;
					task.error = step.error;
					
					// CRITICAL: Copy toolCalls from step to task for UI display
					if (step.toolCalls && step.toolCalls.length > 0) {
						task.toolCalls = step.toolCalls;
						Logger.debug('[MastraPlanExecuteProcessor] Copied toolCalls to task:', step.toolCalls.length);
					}
					
					Logger.debug('[MastraPlanExecuteProcessor] Task updated:', task);
				}
				
				if (this.onStepExecutedCallback) {
						this.onStepExecutedCallback(step);
					}
					
					// Note: 不在这里销毁指示器，让它在最后一个步骤完成后保持可见
					// 只在整个 flow 结束时才销毁（在 startPlanExecuteFlow 的 finally 中处理）
				},
				// Graph execution visualization callbacks
				onGraphStepStart: (stepNumber, step, executedSteps) => {
					Logger.debug('[MastraPlanExecuteProcessor] Graph step starting:', stepNumber, step.id);
					if (this.graphVisualizer) {
						this.graphVisualizer.highlightStep(stepNumber, step);
					}
				},
				onGraphStepComplete: (stepNumber, step) => {
					Logger.debug('[MastraPlanExecuteProcessor] Graph step completed:', stepNumber, step.id);
					if (this.graphVisualizer) {
						this.graphVisualizer.updateStepStatus(stepNumber, step);
					}
				},
				onGraphVisualizationUpdate: (allSteps, currentStepIndex) => {
					Logger.debug('[MastraPlanExecuteProcessor] Graph visualization update:', allSteps.length, 'steps, current:', currentStepIndex);
					if (this.graphVisualizer) {
						this.graphVisualizer.updateVisualization(allSteps, currentStepIndex);
					}
				}
			// Agent模式不需要onStream回调,所有输出通过工具执行过程直接显示
		};
		
		// Set up error handler for sequential mode
		const executionMode = this.plugin.settings.planExecutionMode || 'sequential';
		if (executionMode === 'sequential' && this.agent) {
			this.agent.setSequentialStepErrorHandler(async (step: AgentStep, stepIndex: number) => {
				Logger.debug('[MastraPlanExecuteProcessor] Sequential step error handler invoked:', step.id);
				
				// Show error action panel and wait for user decision
				return await this.showErrorActionPanel(step, stepIndex);
			});
		}
		
		// Execute with mastra agent
		Logger.debug('[MastraPlanExecuteProcessor] About to call agent.execute()');
			if (this.agent) {
				Logger.debug('[MastraPlanExecuteProcessor] Calling agent.execute...');
				await this.agent.execute(executeOptions);
				Logger.debug('[MastraPlanExecuteProcessor] agent.execute completed successfully');
			} else {
				Logger.error('[MastraPlanExecuteProcessor] Agent is not initialized!');
			}
		
		Logger.debug('[MastraPlanExecuteProcessor] ✅ Plan-execute flow completed successfully');		// Destroy execution indicator after all steps complete
		if (this.executionIndicator && this.executionIndicator.isShowing()) {
			Logger.debug('[MastraPlanExecuteProcessor] Destroying execution indicator after flow completion');
			this.executionIndicator.destroy();
			this.executionIndicator = null;
		}

		// Clean up streaming indicator (e.g. "Processing batch...")
		if (this.streamingManager) {
			Logger.debug('[MastraPlanExecuteProcessor] Hiding streaming indicator after flow completion');
			this.streamingManager.hideStreamingIndicator();
		}

		} catch (error) {
		Logger.error('[MastraPlanExecuteProcessor] ========================================');
		Logger.error('[MastraPlanExecuteProcessor] ===== ERROR IN PLAN EXECUTE FLOW =====');
		Logger.error('[MastraPlanExecuteProcessor] ========================================');
		Logger.error('[MastraPlanExecuteProcessor] Error caught in startPlanExecuteFlow:', error);
		Logger.error('[MastraPlanExecuteProcessor] Error type:', error?.constructor?.name);
		Logger.error('[MastraPlanExecuteProcessor] Error message:', (error as Error)?.message);
		Logger.error('[MastraPlanExecuteProcessor] Error stack:', (error as Error)?.stack);
		
		// Destroy indicator on error too
		if (this.executionIndicator && this.executionIndicator.isShowing()) {
			this.executionIndicator.destroy();
			this.executionIndicator = null;
		}

		if (this.streamingManager) {
			this.streamingManager.hideStreamingIndicator();
		}
		
		// Don't render error UI here - let the upper layer (ChatView) handle it
		// to avoid duplicate error messages
		Logger.debug('[MastraPlanExecuteProcessor] Re-throwing error to upper layer for unified error handling');
		throw error;
		}
	}
	
	/**
	 * Initialize the mastra agent with current configuration
	 */
	private async initializeAgent(threadId?: string, resourceId?: string): Promise<void> {
		try {
			Logger.debug('[MastraPlanExecuteProcessor] Initializing mastra agent...');
			
			// Get available tools
			const toolsList = await this.plugin.toolManager.getAllTools();
			Logger.debug('[MastraPlanExecuteProcessor] Tools received from getAllTools:', {
				count: toolsList.length,
				names: toolsList.map(t => t.name)
			});
			
			const tools: Record<string, typeof toolsList[0]> = {};
			toolsList.forEach(tool => {
				tools[tool.name] = tool;
			});
			
			Logger.debug('[MastraPlanExecuteProcessor] Tools to be passed to agent:', {
				count: Object.keys(tools).length,
				names: Object.keys(tools)
			});
			
			// Get or create memory manager
			const memoryManager = await this.plugin.getMemoryManager();
			
			// Create agent with plan-execute instructions and memory support
			this.agent = new MastraAgent({
				plugin: this.plugin,
				i18n: this.i18n,
				streamingManager: this.streamingManager,
				contextManager: this.contextManager,
				name: 'PlanExecuteAgent',
				instructions: this.buildAgentInstructions(),
				tools,
				maxRetries: 2,
				debug: this.plugin.settings.enableDebugLogging,
				memoryManager,
				threadId,
			resourceId,
			memoryConfig: {
				enableWorkingMemory: this.plugin.settings.memorySettings.enableWorkingMemory,
				enableConversationHistory: this.plugin.settings.memorySettings.enableConversationHistory,
				conversationHistoryLimit: this.plugin.settings.memorySettings.conversationHistoryLimit || 10,
				enableSemanticRecall: this.plugin.settings.memorySettings.enableSemanticRecall,
				semanticRecallLimit: this.plugin.settings.memorySettings.semanticRecallLimit || 5,
			}
		});			await this.agent.initialize({
				plugin: this.plugin,
				i18n: this.i18n,
				streamingManager: this.streamingManager,
				contextManager: this.contextManager,
				name: 'PlanExecuteAgent',
				instructions: this.buildAgentInstructions(),
				tools,
				memoryManager,
				threadId,
				resourceId,
			});
			
			Logger.debug('[MastraPlanExecuteProcessor] Mastra agent initialized with memory:', {
				hasMemory: this.agent.hasMemory(),
				threadId,
				resourceId
			});
			
		} catch (error) {
			Logger.error('[MastraPlanExecuteProcessor] Failed to initialize agent:', error);
			throw error;
		}
	}
	
	/**
	 * Build agent instructions for plan-execute mode
	 * 
	 * This replaces the buildPlanPhasePrompt method from the original implementation.
	 * Instructions are more concise and leverage mastra's built-in capabilities.
	 */
	private buildAgentInstructions(): string {
		return this.i18n.t('planExecute.planningPrompt.roleDescription') + '\n\n' +
			this.i18n.t('planExecute.planningPrompt.rules') + '\n' +
			'1. ' + this.i18n.t('planExecute.planningPrompt.rule1') + '\n' +
			'2. ' + this.i18n.t('planExecute.planningPrompt.rule2') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule2a') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule2b') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule2c') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule2d') + '\n' +
			'3. ' + this.i18n.t('planExecute.planningPrompt.rule3') + '\n' +
			'4. ' + this.i18n.t('planExecute.planningPrompt.rule4') + '\n' +
			'5. ' + this.i18n.t('planExecute.planningPrompt.rule5') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule5a') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule5b') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule5c') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule5d') + '\n' +
			'6. ' + this.i18n.t('planExecute.planningPrompt.rule6') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule6a') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule6b') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule6c') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule6d') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule6e') + '\n' +
			'7. ' + this.i18n.t('planExecute.planningPrompt.rule7') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule7a') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule7b') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule7c') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule7d') + '\n' +
			'8. ' + this.i18n.t('planExecute.planningPrompt.rule8') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule8a') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule8b') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule8c') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule8d') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule8e') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule8e2') + '\n' +
			'   ' + this.i18n.t('planExecute.planningPrompt.rule8f');
	}
	
	/**
	 * Auto-insert generate_content steps before create_note/create_file if missing
	 * 
	 * Checks if a create_note or create_file step is preceded by a generate_content step.
	 * If not, inserts a generate_content step with appropriate dependencies.
	 */
	private autoInsertGenerateContentSteps(plan: AgentPlan): void {
		Logger.debug('[MastraPlanExecuteProcessor] Auto-inserting generate_content steps if needed...');
		
		// Track tools that require content generation before use
		const contentCreationTools = ['create_note', 'create_file', 'create'];
		
		// Track inserted steps to avoid modifying array during iteration
		const stepsToInsert: { index: number; step: AgentStep }[] = [];
		
		// Iterate through steps to find create operations without prior generate_content
		for (let i = 0; i < plan.steps.length; i++) {
			const step = plan.steps[i];
			
			// Check if this is a content creation step
			if (!contentCreationTools.includes(step.tool)) {
				continue;
			}
			
			Logger.debug(`[MastraPlanExecuteProcessor] Found ${step.tool} at index ${i}, checking for prior generate_content...`);
			
			// Check if there's a generate_content step in the dependencies
			const hasPriorGenerateContent = this.hasPriorGenerateContent(plan, step, i);
			
			if (hasPriorGenerateContent) {
				Logger.debug(`[MastraPlanExecuteProcessor] Step ${step.id} already has generate_content in dependencies, skipping.`);
				continue;
			}
			
			// Need to insert a generate_content step before this create step
			Logger.debug(`[MastraPlanExecuteProcessor] Step ${step.id} needs generate_content, preparing to insert...`);
			
			// Determine the step number for the new generate_content step
			const newStepNum = this.getNextStepNumber(plan.steps);
			const newStepId = `step${newStepNum}`;
			
			// Determine dependencies for the generate_content step
			// It should depend on the same steps that the create step depends on (excluding the final step itself)
			const generateDependencies = step.dependencies ? [...step.dependencies] : [];
			
			// Create the generate_content step
			const generateContentStep: AgentStep = {
				id: newStepId,
				tool: 'generate_content',
				input: {
					task: `Generate content for ${step.tool} operation based on previous step results`
				},
				outputSchema: {
					type: 'object',
					properties: {
						content: { type: 'string' }
					}
				},
				dependencies: generateDependencies,
				reason: `Generate content before creating file (auto-inserted for ${step.id})`,
				status: 'pending'
			};
			
			// Update the create step to depend ONLY on the new generate_content step
			// The generate_content step already has all the dependencies that create_note needs
			// So create_note should only depend on generate_content, not on the original dependencies
			step.dependencies = [newStepId];
			
			// Update the create step's input to reference the generated content
			// Replace direct content with reference to generate_content output
			if (step.input && typeof step.input === 'object') {
				// Find content-related fields (file_text, content, etc.)
				const contentFields = ['file_text', 'content', 'text'];
				for (const field of contentFields) {
					if (field in step.input) {
						step.input[field] = `{{${newStepId}.content}}`;
					}
				}
			}
			
			// Record the step to insert (insert at position i, before the create step)
			stepsToInsert.push({ index: i, step: generateContentStep });
			
			Logger.debug(`[MastraPlanExecuteProcessor] Prepared generate_content step ${newStepId} to insert before ${step.id}`);
		}
		
		// Insert steps in reverse order to maintain correct indices
		for (let i = stepsToInsert.length - 1; i >= 0; i--) {
			const { index, step } = stepsToInsert[i];
			plan.steps.splice(index, 0, step);
			Logger.debug(`[MastraPlanExecuteProcessor] ✅ Inserted ${step.id} at index ${index}`);
		}
		
		if (stepsToInsert.length > 0) {
			Logger.debug(`[MastraPlanExecuteProcessor] ✅ Auto-inserted ${stepsToInsert.length} generate_content step(s)`);
			Logger.debug(`[MastraPlanExecuteProcessor] Updated plan has ${plan.steps.length} steps`);
			
			// Renumber steps to ensure sequential IDs (step1, step2, ...)
			this.renumberSteps(plan);
		} else {
			Logger.debug('[MastraPlanExecuteProcessor] No generate_content steps needed');
		}
	}

	/**
	 * Renumber steps sequentially (step1, step2, ...) and update references
	 */
	private renumberSteps(plan: AgentPlan): void {
		const idMap = new Map<string, string>();
		
		// 1. Assign new IDs
		plan.steps.forEach((step, index) => {
			const oldId = step.id;
			const newId = `step${index + 1}`;
			if (oldId !== newId) {
				idMap.set(oldId, newId);
				step.id = newId;
			}
		});
		
		if (idMap.size === 0) return;
		
		Logger.debug(`[MastraPlanExecuteProcessor] Renumbering ${idMap.size} steps...`);
		
		// 2. Update dependencies and inputs
		plan.steps.forEach(step => {
			// Update dependencies
			if (step.dependencies) {
				step.dependencies = step.dependencies.map(depId => idMap.get(depId) || depId);
			}
			
			// Update inputs (replace {{stepX.output}} references)
			if (step.input) {
				this.updateInputReferences(step.input, idMap);
			}
			
			// Update reason if it contains step ID references
			if (step.reason) {
				step.reason = step.reason.replace(/step\d+/g, (match) => idMap.get(match) || match);
			}
		});
	}

	/**
	 * Recursively update step references in input object
	 */
	private updateInputReferences(obj: any, idMap: Map<string, string>): void {
		if (!obj || typeof obj !== 'object') return;
		
		for (const key in obj) {
			const value = obj[key];
			if (typeof value === 'string') {
				// Replace {{stepX.output...}} or {{stepX.content}}
				// Regex matches {{stepX...}} pattern
				obj[key] = value.replace(/\{\{(step\d+)(\..*?)\}\}/g, (match, stepId, rest) => {
					const newId = idMap.get(stepId);
					return newId ? `{{${newId}${rest}}}` : match;
				});
			} else if (typeof value === 'object') {
				this.updateInputReferences(value, idMap);
			}
		}
	}
	
	/**
	 * Check if a step has a prior generate_content step in its dependencies
	 */
	private hasPriorGenerateContent(plan: AgentPlan, targetStep: AgentStep, targetIndex: number): boolean {
		// Check direct dependencies
		if (targetStep.dependencies) {
			for (const depId of targetStep.dependencies) {
				const depStep = plan.steps.find(s => s.id === depId);
				if (depStep?.tool === 'generate_content') {
					return true;
				}
			}
		}
		
		// Also check if any previous step is generate_content (for sequential mode without explicit dependencies)
		for (let i = 0; i < targetIndex; i++) {
			if (plan.steps[i].tool === 'generate_content') {
				// Check if this generate_content is in the dependency chain
				if (!targetStep.dependencies || targetStep.dependencies.includes(plan.steps[i].id)) {
					return true;
				}
			}
		}
		
		return false;
	}
	
	/**
	 * Get the next available step number for a new step
	 */
	private getNextStepNumber(steps: AgentStep[]): number {
		let maxNum = 0;
		for (const step of steps) {
			const match = step.id.match(/step(\d+)/);
			if (match) {
				const num = parseInt(match[1]);
				if (num > maxNum) {
					maxNum = num;
				}
			}
		}
		return maxNum + 1;
	}
	
	/**
	 * Convert AgentPlan steps to Task array format for UI
	 * 
	 * This adapts the mastra plan format to the legacy Task interface
	 * expected by the PlanExecuteTracker UI component.
	 */
	private convertPlanToTasks(plan: AgentPlan): Task[] {
		return plan.steps.map((step, index) => ({
			id: step.id,
			title: `Step ${index + 1}: ${step.tool}`,
			description: step.reason,
			status: 'pending' as const,
			toolName: step.tool,
			reason: step.reason
		}));
	}

	/**
	 * Extract dependencies from step input
	 * Looks for {{stepN}} patterns in the input values
	 */
	private extractDependenciesFromInput(input: Record<string, any> | undefined): string[] {
		if (!input) return [];
		
		const dependencies: Set<string> = new Set();
		const inputStr = JSON.stringify(input);
		// Match {{stepN}} pattern
		const regex = /\{\{(step\d+)\}\}/g;
		let match;
		
		while ((match = regex.exec(inputStr)) !== null) {
			dependencies.add(match[1]);
		}
		
		// Sort dependencies naturally (step1, step2, step10)
		return Array.from(dependencies).sort((a, b) => {
			const numA = parseInt(a.replace('step', ''));
			const numB = parseInt(b.replace('step', ''));
			return numA - numB;
		});
	}
	
	/**
	 * Render DAG plan visualization
	 * 
	 * Creates a graph-based layout showing dependencies between steps.
	 * Steps are organized into layers based on their dependency depth.
	 */
	private renderDAGPlan(plan: AgentPlan, container: HTMLElement): void {
		Logger.debug('[MastraPlanExecuteProcessor] Rendering DAG plan with', plan.steps.length, 'steps');
		
		// Get localized tools for name resolution
		const tools = getAllBuiltInTools({ i18n: this.i18n }) as Record<string, { name: string }>;
		
		// Create header
		const header = container.createDiv({ cls: 'llmsider-dag-header' });
		header.createEl('h3', { text: this.i18n.t('planExecute.tracker.planTitle') || '执行计划' });
		
		// Create layers container
		const layersContainer = container.createDiv({ cls: 'llmsider-dag-layers' });
		
		// Organize steps into layers based on dependency depth
		const layers = this.organizeStepsIntoLayers(plan.steps);
		Logger.debug('[MastraPlanExecuteProcessor] Organized steps into', layers.length, 'layers');
		
		// Render each layer
		layers.forEach((layerSteps, layerIndex) => {
			const layerEl = layersContainer.createDiv({ cls: 'llmsider-dag-layer' });
			layerEl.setAttribute('data-layer', layerIndex.toString());
			
			// Only show layer label if NOT in sequential mode
			if (!container.hasClass('sequential-mode')) {
				// Add layer number: "Layer 1", "Layer 2", etc.
				const layerNumber = layerIndex + 1;
				const layerLabel = `${this.i18n.t('planExecute.tracker.layer') || 'Layer'} ${layerNumber}`;
				layerEl.setAttribute('data-layer-label', layerLabel);
			}
			
			layerSteps.forEach(step => {
				const nodeEl = layerEl.createDiv({ 
					cls: 'llmsider-dag-node pending clickable',
					attr: { 'data-step-id': step.id }
				});
				
				// Extract step number from step ID (e.g., "step1" -> "1")
				const stepNumber = step.id.replace(/^step/, '');
				
				// Node header with status icon
				const nodeHeader = nodeEl.createDiv({ cls: 'llmsider-dag-node-header' });
				const statusIcon = nodeHeader.createSpan({ cls: 'llmsider-dag-node-status' });
				setIcon(statusIcon, 'clock');
				
				// Add step number badge
				nodeHeader.createSpan({ 
					cls: 'llmsider-dag-node-number',
					text: stepNumber
				});
				
				// Resolve localized tool name
				let toolName = step.tool;
				
				// Special handling for generate_content virtual tool
				if (step.tool === 'generate_content') {
					toolName = this.i18n.t('tools.generateContent.name') || '生成内容';
				} else if (tools[step.tool]) {
					toolName = tools[step.tool].name;
				}
				
				nodeHeader.createSpan({ 
					cls: 'llmsider-dag-node-title',
					text: toolName || 'Unknown Tool'
				});
				
				// Node body with reason
				if (step.reason) {
					nodeEl.createDiv({ 
						cls: 'llmsider-dag-node-reason',
						text: step.reason
					});
				}
				
				// Add click handler to show step details
				nodeEl.addEventListener('click', (e) => {
					e.stopPropagation();
					this.showStepDetailsModal(step, nodeEl);
				});
				
				// Show dependencies if any
				// Calculate data dependencies from input to show actual data flow
				const dataDependencies = this.extractDependenciesFromInput(step.input);
				// Use data dependencies if available, otherwise fall back to structural dependencies
				const dependenciesToShow = dataDependencies.length > 0 ? dataDependencies : step.dependencies;

				if (dependenciesToShow && dependenciesToShow.length > 0) {
					const depsEl = nodeEl.createDiv({ cls: 'llmsider-dag-node-dependencies' });
					depsEl.createSpan({ text: this.i18n.t('planExecute.tracker.dependsOn') + ' ' });
					
					// Localize dependency names (e.g., "step1" -> "步骤 1")
					const localizedDeps = dependenciesToShow.map(depId => {
						const depNum = depId.replace(/^step/, '');
						return this.i18n.t('planExecute.tracker.stepLabel').replace('{index}', depNum);
					});
					
					depsEl.createSpan({ 
						cls: 'llmsider-dag-deps-list',
						text: localizedDeps.join(', ')
					});
				}
			});
		});
		
		// Draw connection lines after nodes are rendered
		// Multi-stage drawing to handle async layout changes
		const drawWithRetry = () => {
			// Initial draw
			requestAnimationFrame(() => {
				setTimeout(() => {
					this.drawDAGConnections(layersContainer, plan.steps);
					
					// Redraw after font loading and layout stabilization (silent mode)
					setTimeout(() => {
						this.redrawDAGConnections(layersContainer, plan.steps, true);
					}, 300);
					
					// Final redraw to ensure accuracy (silent mode)
					setTimeout(() => {
						this.redrawDAGConnections(layersContainer, plan.steps, true);
					}, 800);
				}, 100);
			});
		};
		
		drawWithRetry();
		
		// Redraw connections on window resize or layout changes
		let resizeTimeout: NodeJS.Timeout | null = null;
		const resizeObserver = new ResizeObserver((entries) => {
			// Clear previous timeout
			if (resizeTimeout) {
				clearTimeout(resizeTimeout);
			}
			// Debounce: wait for resize to finish
			resizeTimeout = setTimeout(() => {
				Logger.debug('[MastraPlanExecuteProcessor] Container resized, redrawing connections');
				this.redrawDAGConnections(layersContainer, plan.steps);
				resizeTimeout = null;
			}, 300);
		});
		resizeObserver.observe(layersContainer);
		
		// Store observer for cleanup
		(layersContainer as any)._dagResizeObserver = resizeObserver;
		
		// Create legend
		const legend = container.createDiv({ cls: 'llmsider-dag-legend' });
		const legendItems = [
			{ status: 'pending', label: this.i18n.t('planExecute.tracker.statusPending') || '等待中' },
			{ status: 'executing', label: this.i18n.t('planExecute.tracker.statusInProgress') || '执行中' },
			{ status: 'completed', label: this.i18n.t('planExecute.tracker.statusCompleted') || '已完成' },
			{ status: 'failed', label: this.i18n.t('planExecute.tracker.statusError') || '失败' }
		];
		
		legendItems.forEach(item => {
			const legendItem = legend.createSpan({ cls: 'llmsider-dag-legend-item' });
			legendItem.createSpan({ cls: `llmsider-dag-legend-dot ${item.status}` });
			legendItem.createSpan({ text: item.label });
		});
		
		// Store reference for updates
		this.dagContainer = container;
	}
	
	/**
	 * Add sequential dependencies to plan steps (transform into linear chain)
	 * Each step depends on the previous one, forming a straight-line DAG
	 */
	private addSequentialDependencies(plan: AgentPlan): void {
		Logger.debug('[MastraPlanExecuteProcessor] Adding sequential dependencies to', plan.steps.length, 'steps');
		
		for (let i = 0; i < plan.steps.length; i++) {
			if (i === 0) {
				// First step has no dependencies
				plan.steps[i].dependencies = [];
			} else {
				// Each step depends on the previous one
				plan.steps[i].dependencies = [plan.steps[i - 1].id];
			}
		}
		
		Logger.debug('[MastraPlanExecuteProcessor] Sequential dependencies added - creating linear execution chain');
	}
	
	/**
	 * Render Graph plan visualization with dynamic step planning
	 * 
	 * Creates a dynamic graph visualization that updates as steps are generated and executed.
	 * Uses the same visual style as DAG mode but shows live execution progress.
	 */
	private renderGraphPlan(plan: AgentPlan, container: HTMLElement): void {
		Logger.debug('[MastraPlanExecuteProcessor] Rendering Graph plan with', plan.steps.length, 'initial steps');
		
		// Get execution mode from settings
		const executionMode = this.plugin.settings.planExecutionMode || 'sequential';
		
		// Create graph visualizer with execution mode
		this.graphVisualizer = new AgentGraphVisualizer(
			container, 
			this.i18n, 
			executionMode,
			(stepId) => this.retryStep(stepId)
		);
		this.graphVisualizer.initialize();
		
		// Show initial plan structure
		this.graphVisualizer.updateVisualization(plan.steps, 0);
		
		Logger.debug('[MastraPlanExecuteProcessor] Graph visualization initialized in', executionMode, 'mode');
	}

	/**
	 * Retry execution from a specific step
	 */
	private async retryStep(stepId: string): Promise<void> {
		Logger.debug(`[MastraPlanExecuteProcessor] Retrying from step ${stepId}`);
		
		if (!this.agent || !this.currentPlan) {
			Logger.error('[MastraPlanExecuteProcessor] Cannot retry: agent or plan not initialized');
			return;
		}
		
		const stepIndex = this.currentPlan.steps.findIndex(s => s.id === stepId);
		if (stepIndex === -1) return;

		// Reset status of this step
		const step = this.currentPlan.steps[stepIndex];
		step.status = 'pending';
		step.error = undefined;
		step.result = undefined;
		
		// Also reset all steps that depend on this failed step (directly or transitively)
		// This ensures that steps which used the failed step's output are re-executed
		const resetDependentSteps = (failedStepId: string) => {
			for (const s of this.currentPlan!.steps) {
				if (s.dependencies && s.dependencies.includes(failedStepId)) {
					// This step depends on the failed step, reset it
					if (s.status === 'completed' || s.status === 'failed') {
						Logger.debug(`[MastraPlanExecuteProcessor] Resetting dependent step: ${s.id}`);
						s.status = 'pending';
						s.error = undefined;
						s.result = undefined;
						// Recursively reset steps that depend on this one
						resetDependentSteps(s.id);
					}
				}
			}
		};
		resetDependentSteps(stepId);
		
		// Update UI to show pending status for the failed step
		if (this.graphVisualizer) {
			this.graphVisualizer.updateStepStatus(stepIndex, step);
			// Also update UI for all reset dependent steps
			for (let i = 0; i < this.currentPlan.steps.length; i++) {
				const s = this.currentPlan.steps[i];
				if (s.status === 'pending' && s.id !== stepId) {
					this.graphVisualizer.updateStepStatus(i, s);
				}
			}
		}
		
		// Resume execution
		try {
			await this.agent.resumePlan(this.currentPlan, {
				messages: this.currentMessages,
				abortController: this.abortController || new AbortController(),
				onStepExecuted: (executedStep) => {
					// Update UI
					if (this.graphVisualizer) {
						const idx = this.currentPlan!.steps.findIndex(s => s.id === executedStep.id);
						if (idx >= 0) {
							this.graphVisualizer.updateStepStatus(idx, executedStep);
						}
					}
					
					// Call external callback if set
					if (this.onStepExecutedCallback) {
						this.onStepExecutedCallback(executedStep);
					}
				}
			});
		} catch (error) {
			Logger.error('[MastraPlanExecuteProcessor] Retry failed:', error);
			// Error handling is already done in agent execution (updates step status)
		}
	}
	
	/**
	 * Redraw DAG connections (remove old SVG and draw new one)
	 */
	private redrawDAGConnections(container: HTMLElement, steps: AgentStep[], silent: boolean = false): void {
		if (!silent) {
			Logger.debug('[MastraPlanExecuteProcessor] Redrawing DAG connections');
		}
		// Remove existing SVG
		const existingSvg = container.querySelector('.llmsider-dag-connections');
		if (existingSvg) {
			existingSvg.remove();
		}
		// Immediately draw new connections (no extra delay needed)
		this.drawDAGConnections(container, steps, silent);
	}
	
	/**
	 * Draw SVG connection lines between nodes based on dependencies
	 */
	private drawDAGConnections(container: HTMLElement, steps: AgentStep[], silent: boolean = false): void {
		if (!silent) {
			Logger.debug('[MastraPlanExecuteProcessor] Drawing DAG connections for', steps.length, 'steps');
		}
		
		// Count steps with dependencies
		const stepsWithDeps = steps.filter(s => s.dependencies && s.dependencies.length > 0);
		if (!silent) {
			Logger.debug('[MastraPlanExecuteProcessor] Steps with dependencies:', stepsWithDeps.length);
		}
		
		if (stepsWithDeps.length === 0) {
			Logger.debug('[MastraPlanExecuteProcessor] No dependencies found, skipping connection lines');
			// Add a notice to the UI
			const notice = container.createDiv({ cls: 'llmsider-dag-notice' });
			notice.innerHTML = '<em>提示：当前计划中的所有步骤都是独立的，没有依赖关系，将并行执行</em>';
			return;
		}
		
		// Create SVG overlay for connection lines
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.classList.add('llmsider-dag-connections');
		svg.style.position = 'absolute';
		svg.style.top = '0';
		svg.style.left = '0';
		svg.style.width = '100%';
		svg.style.height = '100%';
		svg.style.pointerEvents = 'none';
		svg.style.zIndex = '0';
		svg.style.overflow = 'visible'; // Allow lines to extend beyond container
		container.style.position = 'relative';
		container.insertBefore(svg, container.firstChild);
		
		// Get actual container dimensions
		const containerRect = container.getBoundingClientRect();
		const containerWidth = Math.max(containerRect.width, container.scrollWidth);
		const containerHeight = Math.max(containerRect.height, container.scrollHeight);
		
		Logger.debug('[MastraPlanExecuteProcessor] SVG viewBox:', {
			width: containerWidth,
			height: containerHeight
		});
		
		// Set viewBox to match container size
		svg.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);
		
		// Create defs for arrow markers
		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
		svg.appendChild(defs);
		
		let connectionCount = 0;
		
		// Draw lines for each step with dependencies
		steps.forEach(step => {
			if (!step.dependencies || step.dependencies.length === 0) return;
			
			if (!silent) {
				Logger.debug('[MastraPlanExecuteProcessor] Drawing connections for step:', step.id, 'dependencies:', step.dependencies);
			}
			
			const targetNode = container.querySelector(`[data-step-id="${step.id}"]`) as HTMLElement;
			if (!targetNode) {
				if (!silent) {
					Logger.warn('[MastraPlanExecuteProcessor] Target node not found:', step.id);
				}
				return;
			}
			
			const targetRect = targetNode.getBoundingClientRect();
			const containerRect = container.getBoundingClientRect();
			
			step.dependencies.forEach(depId => {
				const sourceNode = container.querySelector(`[data-step-id="${depId}"]`) as HTMLElement;
				if (!sourceNode) {
					if (!silent) {
						Logger.warn('[MastraPlanExecuteProcessor] Source node not found:', depId);
					}
					return;
				}
				
				const sourceRect = sourceNode.getBoundingClientRect();
				
				// Calculate connection points (bottom of source, top of target)
				const x1 = sourceRect.left + sourceRect.width / 2 - containerRect.left;
				const y1 = sourceRect.bottom - containerRect.top;
				const x2 = targetRect.left + targetRect.width / 2 - containerRect.left;
				const y2 = targetRect.top - containerRect.top;
				
				if (!silent) {
					Logger.debug('[MastraPlanExecuteProcessor] Drawing line from', depId, 'to', step.id, 
						'coords:', {x1, y1, x2, y2});
				}
				
				// Create curved path
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				
				// Use vertical control points for better curves (top-to-bottom flow)
				const controlY1 = y1 + (y2 - y1) * 0.5;
				const controlY2 = y1 + (y2 - y1) * 0.5;
				const d = `M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${y2}`;
				
				path.setAttribute('d', d);
				path.setAttribute('stroke', 'var(--text-muted)');
				path.setAttribute('stroke-width', '2');
				path.setAttribute('fill', 'none');
				path.setAttribute('opacity', '0.6');
				path.classList.add('llmsider-dag-connection-line');
				
				// Add arrow marker
				const markerId = `arrow-${depId}-${step.id}`;
				const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
				marker.setAttribute('id', markerId);
				marker.setAttribute('markerWidth', '10');
				marker.setAttribute('markerHeight', '10');
				marker.setAttribute('refX', '9');
				marker.setAttribute('refY', '3');
				marker.setAttribute('orient', 'auto');
				marker.setAttribute('markerUnits', 'strokeWidth');
				
				const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
				arrowPath.setAttribute('fill', 'var(--text-muted)');
				arrowPath.setAttribute('opacity', '0.6');
				marker.appendChild(arrowPath);
				defs.appendChild(marker);
				
				path.setAttribute('marker-end', `url(#${markerId})`);
				svg.appendChild(path);
				connectionCount++;
				if (!silent) {
					Logger.debug(`[MastraPlanExecuteProcessor] ✓ Connection drawn: ${depId} → ${step.id}`);
				}
			});
		});
		
		if (!silent) {
			Logger.debug('[MastraPlanExecuteProcessor] ===== CONNECTION DRAWING COMPLETE =====');
			Logger.debug('[MastraPlanExecuteProcessor] Total connections drawn:', connectionCount);
		}
	}
	
	/**
	 * Organize steps into layers based on dependency depth
	 * 
	 * Steps with no dependencies go in layer 0.
	 * Each subsequent layer contains steps that depend only on previous layers.
	 */
	private organizeStepsIntoLayers(steps: AgentStep[]): AgentStep[][] {
		Logger.debug('[MastraPlanExecuteProcessor] ===== ORGANIZING LAYERS =====');
		Logger.debug('[MastraPlanExecuteProcessor] Total steps to organize:', steps.length);
		steps.forEach(step => {
			Logger.debug(`[MastraPlanExecuteProcessor] Step ${step.id} dependencies:`, step.dependencies || []);
		});
		
		const layers: AgentStep[][] = [];
		const stepDepths = new Map<string, number>();
		
		// Calculate depth for each step
		const calculateDepth = (step: AgentStep): number => {
			if (stepDepths.has(step.id)) {
				const cachedDepth = stepDepths.get(step.id)!;
				Logger.debug(`[MastraPlanExecuteProcessor] Using cached depth for ${step.id}: ${cachedDepth}`);
				return cachedDepth;
			}
			
			if (!step.dependencies || step.dependencies.length === 0) {
				Logger.debug(`[MastraPlanExecuteProcessor] ${step.id} has no dependencies, depth = 0`);
				stepDepths.set(step.id, 0);
				return 0;
			}
			
			// Depth is 1 + max depth of dependencies
			Logger.debug(`[MastraPlanExecuteProcessor] ${step.id} depends on:`, step.dependencies);
			const depSteps = steps.filter(s => step.dependencies!.includes(s.id));
			Logger.debug(`[MastraPlanExecuteProcessor] Found ${depSteps.length} dependency steps for ${step.id}`);
			const depthsOfDeps = depSteps.map(s => calculateDepth(s));
			Logger.debug(`[MastraPlanExecuteProcessor] Dependency depths for ${step.id}:`, depthsOfDeps);
			const maxDepDepth = Math.max(...depthsOfDeps);
			const depth = maxDepDepth + 1;
			Logger.debug(`[MastraPlanExecuteProcessor] ${step.id} calculated depth: ${depth} (max dep depth ${maxDepDepth} + 1)`);
			stepDepths.set(step.id, depth);
			return depth;
		};
		
		// Calculate depths for all steps
		steps.forEach(step => calculateDepth(step));
		
		// Group steps by depth
		steps.forEach(step => {
			const depth = stepDepths.get(step.id)!;
			if (!layers[depth]) {
				layers[depth] = [];
			}
			layers[depth].push(step);
		});
		
		Logger.debug('[MastraPlanExecuteProcessor] ===== LAYER ORGANIZATION COMPLETE =====');
		Logger.debug('[MastraPlanExecuteProcessor] Total layers:', layers.length);
		layers.forEach((layer, index) => {
			Logger.debug(`[MastraPlanExecuteProcessor] Layer ${index}:`, layer.map(s => s.id).join(', '));
		});
		
		return layers;
	}
	
	/**
	 * Update DAG node status in the UI
	 */
	private updateDAGNodeStatus(stepId: string, status: 'pending' | 'executing' | 'completed' | 'failed'): void {
		if (!this.dagContainer) return;
		
		const nodeEl = this.dagContainer.querySelector(`[data-step-id="${stepId}"]`);
		if (!nodeEl) {
			Logger.warn('[MastraPlanExecuteProcessor] DAG node not found:', stepId);
			return;
		}
		
		// Remove old status classes
		nodeEl.classList.remove('pending', 'executing', 'completed', 'failed');
		// Add new status class
		nodeEl.classList.add(status);
		
		// Update status icon
		const statusIcon = nodeEl.querySelector('.llmsider-dag-node-status');
		if (statusIcon) {
			const iconMap = {
				pending: 'clock',
				executing: 'loader',
				completed: 'check',
				failed: 'x'
			};
			setIcon(statusIcon as HTMLElement, iconMap[status]);
		}
		
		Logger.debug('[MastraPlanExecuteProcessor] Updated DAG node status:', stepId, status);
	}
	
	/**
	 * Stop the plan-execute processing
	 */
	stop(): void {
		Logger.debug('[MastraPlanExecuteProcessor] Stopping plan-execute flow');
		this.isAborted = true;
		if (this.abortController) {
			this.abortController.abort();
		}
	}
	
	/**
	 * Regenerate plan with error context from validation failure
	 */
	private async regeneratePlan(): Promise<void> {
		Logger.debug('[MastraPlanExecuteProcessor] Regenerating plan with error context');
		
		try {
			// Get validation error context from streaming manager
			const errorContext = (this.streamingManager as any).lastValidationErrors;
			
			// Add validation errors to messages for context
			const updatedMessages = [...this.currentMessages];
			if (errorContext) {
				Logger.debug('[MastraPlanExecuteProcessor] Adding validation error context to regeneration:', errorContext);
				
				// Add system message with error context
				updatedMessages.push({
					role: 'system',
					content: `Previous plan validation failed with the following errors:\n\n${errorContext}\n\nPlease generate a new plan that addresses these issues.`
				} as ChatMessage);
			}
			
			// Clear previous UI elements
			if (this.dagContainer) {
				this.dagContainer.remove();
				this.dagContainer = null;
			}
			if (this.executionIndicator) {
				this.executionIndicator.destroy();
				this.executionIndicator = null;
			}
			
			// Clear any existing validation error cards
			const errorCards = this.messageContainer.querySelectorAll('.llmsider-validation-error-card, .llmsider-validation-result-indicator');
			errorCards.forEach(card => card.remove());
			
			// Restart the plan-execute flow with updated context
			await this.startPlanExecuteFlow(
				this.currentUserQuery,
				updatedMessages,
				this.currentAbortController || undefined,
				this.currentSessionId
			);
			
		} catch (error) {
			Logger.error('[MastraPlanExecuteProcessor] Failed to regenerate plan:', error);
			throw error;
		}
	}
	
	/**
	 * Show step details in a floating modal
	 */
	private showStepDetailsModal(step: AgentStep, nodeEl: HTMLElement): void {
		// Remove any existing modal
		const existingModal = document.querySelector('.llmsider-step-detail-modal');
		if (existingModal) {
			existingModal.remove();
		}
		
		// Create modal backdrop
		const backdrop = document.body.createDiv({ cls: 'llmsider-step-detail-backdrop' });
		
		// Create modal container
		const modal = backdrop.createDiv({ cls: 'llmsider-step-detail-modal' });
		
		// Add failed class if step failed
		if (step.status === 'failed') {
			modal.addClass('failed-step');
		}
		
		// Modal header
		const header = modal.createDiv({ cls: 'llmsider-step-detail-header' });
		const stepNumber = step.id.replace(/^step/, '');
		header.createSpan({ 
			cls: 'llmsider-step-detail-number',
			text: `Step ${stepNumber}`
		});
		header.createSpan({ 
			cls: 'llmsider-step-detail-tool',
			text: step.tool || 'Unknown Tool'
		});
		
		// Close button
		const closeBtn = header.createSpan({ cls: 'llmsider-step-detail-close' });
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', () => backdrop.remove());
		
		// Modal body
		const body = modal.createDiv({ cls: 'llmsider-step-detail-body' });
		
		// Reason section
		if (step.reason) {
			const reasonSection = body.createDiv({ cls: 'llmsider-step-detail-section' });
			reasonSection.createEl('h4', { text: this.plugin.i18n.t('ui.toolExecution.description') });
			reasonSection.createDiv({ 
				cls: 'llmsider-step-detail-content',
				text: step.reason
			});
		}
		
		// Input section
		const inputSection = body.createDiv({ cls: 'llmsider-step-detail-section' });
		const inputHeader = inputSection.createDiv({ cls: 'llmsider-step-detail-section-header' });
		inputHeader.createEl('h4', { text: this.plugin.i18n.t('ui.toolExecution.inputParameters') });
		
		const inputCopyBtn = inputHeader.createSpan({ cls: 'llmsider-copy-btn' });
		inputCopyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
		
		const inputContent = JSON.stringify(step.input, null, 2);
		const inputPre = inputSection.createEl('pre', { cls: 'llmsider-step-detail-code' });
		inputPre.createEl('code', { text: inputContent });
		
		inputCopyBtn.addEventListener('click', async () => {
			await navigator.clipboard.writeText(inputContent);
			inputCopyBtn.addClass('copied');
			setTimeout(() => inputCopyBtn.removeClass('copied'), 2000);
		});
		
		// Response section
		const responseSection = body.createDiv({ cls: 'llmsider-step-detail-section' });
		const responseHeader = responseSection.createDiv({ cls: 'llmsider-step-detail-section-header' });
		responseHeader.createEl('h4', { text: this.plugin.i18n.t('ui.toolExecution.response') });
		
		if (step.toolCalls && step.toolCalls.length > 0) {
			const toolCall = step.toolCalls[0];
			
			const responseCopyBtn = responseHeader.createSpan({ cls: 'llmsider-copy-btn' });
			responseCopyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
			
			let responseContent = '';
			if (toolCall.error) {
				responseContent = toolCall.error;
				const errorPre = responseSection.createEl('pre', { cls: 'llmsider-step-detail-code error' });
				errorPre.createEl('code', { text: responseContent });
			} else if (toolCall.response) {
				responseContent = typeof toolCall.response === 'string' 
					? toolCall.response 
					: JSON.stringify(toolCall.response, null, 2);
				const responsePre = responseSection.createEl('pre', { cls: 'llmsider-step-detail-code' });
				responsePre.createEl('code', { text: responseContent });
			}
			
			if (responseContent) {
				responseCopyBtn.addEventListener('click', async () => {
					await navigator.clipboard.writeText(responseContent);
					responseCopyBtn.addClass('copied');
					setTimeout(() => responseCopyBtn.removeClass('copied'), 2000);
				});
			}
		} else {
			responseSection.createDiv({ 
				cls: 'llmsider-step-detail-placeholder',
				text: step.status === 'pending' ? 'Not executed yet' : 'No response data'
			});
		}
		
		// Add retry button for failed steps
		if (step.status === 'failed') {
			const footer = modal.createDiv({ cls: 'llmsider-step-detail-footer' });
			
			const retryBtn = footer.createEl('button', { 
				cls: 'llmsider-step-detail-retry-btn',
				text: this.plugin.i18n.t('planExecute.tracker.errorActions.retry') || 'Retry'
			});
			
			// Add retry icon
			const retryIcon = retryBtn.createSpan({ cls: 'llmsider-retry-icon' });
			setIcon(retryIcon, 'refresh-cw');
			
			retryBtn.addEventListener('click', async () => {
				Logger.debug('[showStepDetailsModal] Retry button clicked for step:', step.id);
				
				// Find step index
				const stepIndex = this.currentPlan?.steps.findIndex(s => s.id === step.id) ?? -1;
				if (stepIndex === -1) {
					Logger.error('[showStepDetailsModal] Could not find step index for:', step.id);
					return;
				}
				
				// Disable button and show loading state
				retryBtn.disabled = true;
				retryBtn.addClass('loading');
				retryBtn.textContent = this.plugin.i18n.t('planExecute.tracker.retrying') || 'Retrying...';
				
				// Close modal
				backdrop.remove();
				
				// Reset the failed step and all subsequent steps
				if (this.currentPlan) {
					Logger.debug('[showStepDetailsModal] Resetting step and subsequent steps from index:', stepIndex);
					
					// Reset the failed step
					step.status = 'pending';
					step.error = undefined;
					step.toolCalls = [];
					step.result = undefined;
					
					// Reset all subsequent steps that depend on this step (directly or indirectly)
					const dependentSteps = this.findDependentSteps(step.id, this.currentPlan.steps);
					dependentSteps.forEach(depStep => {
						if (depStep.status === 'failed' || depStep.status === 'completed') {
							Logger.debug('[showStepDetailsModal] Resetting dependent step:', depStep.id);
							depStep.status = 'pending';
							depStep.error = undefined;
							depStep.toolCalls = [];
							depStep.result = undefined;
							
							// Update UI for dependent step
							const depNodeEl = this.messageContainer?.querySelector(`[data-step-id="${depStep.id}"]`);
							if (depNodeEl) {
								depNodeEl.removeClass('failed', 'completed');
								depNodeEl.addClass('pending');
								
								const statusIcon = depNodeEl.querySelector('.llmsider-dag-node-status');
								if (statusIcon) {
									statusIcon.empty();
									setIcon(statusIcon as HTMLElement, 'clock');
								}
							}
						}
					});
					
					// Update UI for the retry step
					const nodeEl = this.messageContainer?.querySelector(`[data-step-id="${step.id}"]`);
					if (nodeEl) {
						nodeEl.removeClass('failed');
						nodeEl.addClass('pending');
						
						const statusIcon = nodeEl.querySelector('.llmsider-dag-node-status');
						if (statusIcon) {
							statusIcon.empty();
							setIcon(statusIcon as HTMLElement, 'clock');
						}
					}
					
					// Re-execute from the failed step
					await this.retryFromStep(stepIndex);
				}
			});
		}
		
		// Close on backdrop click
		backdrop.addEventListener('click', (e) => {
			if (e.target === backdrop) {
				backdrop.remove();
			}
		});
		
		// Close on Escape key
		const escapeHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				backdrop.remove();
				document.removeEventListener('keydown', escapeHandler);
			}
		};
		document.addEventListener('keydown', escapeHandler);
	}
	
	/**
	 * Find all steps that depend on a given step (directly or transitively)
	 */
	private findDependentSteps(stepId: string, allSteps: AgentStep[]): AgentStep[] {
		const dependent: AgentStep[] = [];
		const visited = new Set<string>();
		
		const findRecursive = (id: string) => {
			for (const step of allSteps) {
				if (!visited.has(step.id) && step.dependencies?.includes(id)) {
					visited.add(step.id);
					dependent.push(step);
					findRecursive(step.id); // Find transitive dependencies
				}
			}
		};
		
		findRecursive(stepId);
		return dependent;
	}
	
	/**
	 * Retry execution from a specific step index
	 */
	private async retryFromStep(stepIndex: number): Promise<void> {
		if (!this.currentPlan || !this.agent) {
			Logger.error('[retryFromStep] No current plan or agent available');
			return;
		}
		
		Logger.debug('[retryFromStep] Retrying from step index:', stepIndex);
		
		// Create new abort controller for retry execution
		const retryAbortController = new AbortController();
		
		// Create a modified plan with the failed step and subsequent steps reset
		const retryPlan: AgentPlan = {
			id: `${this.currentPlan.id}-retry-${Date.now()}`,
			steps: [...this.currentPlan.steps], // Clone steps array
			estimatedTokens: this.currentPlan.estimatedTokens
		};
		
		// Re-execute using the agent's resumePlan method (which skips completed steps)
		try {
			Logger.debug('[retryFromStep] Resuming plan execution with agent...');
			
			await this.agent.resumePlan(retryPlan, {
				messages: [], // Empty messages since we're resuming
				onStepExecuted: (step: AgentStep) => {
					Logger.debug('[retryFromStep] Step executed callback:', step.id, step.status);
					
					// Update UI - same logic as main execution
					const executionMode = this.plugin.settings.planExecutionMode || 'sequential';
					if ((executionMode === 'dag' || executionMode === 'sequential') && this.dagContainer) {
						const dagStatus = step.status === 'failed' ? 'failed' : 
						                   step.status === 'executing' ? 'executing' : 
						                   step.status === 'completed' ? 'completed' : 'pending';
						this.updateDAGNodeStatus(step.id, dagStatus);
					}
					
					// Update task in array
					const task = this.planTasks.find(t => t.id === step.id);
					if (task) {
						const taskStatus = step.status === 'failed' ? 'error' : 
						                   step.status === 'executing' ? 'in-progress' : 
						                   step.status as any;
						task.status = taskStatus;
						task.result = step.result ? JSON.stringify(step.result).substring(0, 500) : undefined;
						task.error = step.error;
						
						if (step.toolCalls && step.toolCalls.length > 0) {
							task.toolCalls = step.toolCalls;
						}
					}
					
					// Call the processor's callback if exists
					if (this.onStepExecutedCallback) {
						this.onStepExecutedCallback(step);
					}
				},
				abortController: retryAbortController
			});
			
			Logger.debug('[retryFromStep] Retry execution completed successfully');
		} catch (error) {
			Logger.error('[retryFromStep] Retry execution failed:', error);
			throw error;
		}
	}
	
	/**
	 * Reset processor state
	 */
	reset(): void {
		Logger.debug('[MastraPlanExecuteProcessor] Resetting processor state');
		this.isAborted = false;
		this.abortController = null;
		
		// Clean up error panel if exists
		if (this.errorActionPanel) {
			this.errorActionPanel.destroy();
			this.errorActionPanel = null;
		}
		this.errorActionResolver = null;
		
		// Keep agent instance for reuse
	}
	
	/**
	 * Show error action panel and wait for user decision
	 * Returns a promise that resolves with the user's choice
	 */
	private async showErrorActionPanel(step: AgentStep, stepIndex: number): Promise<ErrorActionType> {
		Logger.debug('[MastraPlanExecuteProcessor] Showing error action panel for step:', step.id);
		
		return new Promise<ErrorActionType>((resolve) => {
			// Store resolver to be called when user makes a choice
			this.errorActionResolver = resolve;
			
			// Find the step element in the DOM
			let targetEl: HTMLElement | undefined;
			if (this.messageContainer) {
				// Try to find the specific step element by data attribute
				const stepEl = this.messageContainer.querySelector(`[data-step-id="${step.id}"]`);
				if (stepEl instanceof HTMLElement) {
					targetEl = stepEl;
					Logger.debug('[MastraPlanExecuteProcessor] Found target element for step:', step.id);
				} else {
					Logger.warn('[MastraPlanExecuteProcessor] Could not find target element for step:', step.id);
				}
			}
			
			// Create and show error action panel
			this.errorActionPanel = new ErrorActionPanel(this.messageContainer, {
				step,
				stepIndex,
				i18n: this.i18n,
				targetEl, // Pass the target element for inline positioning
				onAction: async (action: ErrorActionType) => {
					Logger.debug('[MastraPlanExecuteProcessor] Error action selected:', action);
					
					// Resolve the promise with user's choice
					if (this.errorActionResolver) {
						this.errorActionResolver(action);
						this.errorActionResolver = null;
					}
					
					// Panel will be destroyed by the component itself
					this.errorActionPanel = null;
				},
				onDestroy: () => {
					Logger.debug('[MastraPlanExecuteProcessor] Error action panel destroyed');
					this.errorActionPanel = null;
				}
			});
			
			this.errorActionPanel.show();
		});
	}
	
	/**
	 * Clean up resources
	 */
	dispose(): void {
		Logger.debug('[MastraPlanExecuteProcessor] Disposing processor');
		if (this.agent) {
			this.agent.dispose();
			this.agent = null;
		}
	}
}
