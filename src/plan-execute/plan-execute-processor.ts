import { ChatMessage, ToolCallRecord } from '../types';
import { Logger } from '../utils/logger';
import LLMSiderPlugin from '../main';
import { ToolExecutionManager } from '../tools/tool-execution-manager';
import { I18nManager } from '../i18n/i18n-manager';
import { PlanCheckProcessor } from './plan-check-processor';
import { SvgIcons } from '../utils/svg-icons';
import { StructuredPromptManager } from '../core/structured-prompt-manager';
import { TokenManager } from '../utils/token-manager';
import { PlanExecuteTracker, Task, TaskStatus, ToolCall } from './plan-execute-tracker';

// Import utility modules
import { JSONUtils } from './utils/json-utils';
import { PathUtils } from './utils/path-utils';
import { ContentCleaner } from './utils/content-cleaner';
import { PlaceholderUtils, PlaceholderReplacementError } from './utils/placeholder-utils';
import { FormatUtils } from './utils/format-utils';
import { ValidationUtils } from './utils/validation-utils';
import { DisplayUtils } from './utils/display-utils';
import { AnswerGeneratorUtils } from './utils/answer-generator-utils';
import { StateManagementUtils } from './utils/state-management-utils';
import { ToolExecutionUtils } from './utils/tool-execution-utils';
import { LegacyTrackerUtils } from './utils/legacy-tracker-utils';
import { StepProgressUtils } from './utils/step-progress-utils';
import { ActionValidatorUtils } from './utils/action-validator-utils';
import { ContentGenerationUIUtils } from './utils/content-generation-ui-utils';
import { StepRegenerationUtils } from './utils/step-regeneration-utils';
import { ContentToolGeneratorUtils } from './utils/content-tool-generator-utils';
import { ActionProcessorUtils } from './utils/action-processor-utils';
import { StepExecutionUtils } from './utils/step-execution-utils';

// Import helper classes
import { StreamingIndicatorManager } from './helpers/streaming-indicator-manager';

// Import modular components
import { PromptBuilder } from './prompts/prompt-builder';
import { StreamingProcessor } from './streaming/streaming-processor';
import { StepExecutor } from './execution/step-executor';
import { TaskRetryHandler } from './handlers/task-retry-handler';

/**
 * Plan-Execute Processor - implements the Plan-and-Execute framework with streaming
 * Based on reference/tools-calling.md specifications
 */
export class PlanExecuteProcessor {
	private plugin: LLMSiderPlugin;
	private toolExecutionManager: ToolExecutionManager;
	private messageContainer: HTMLElement;
	private i18n: I18nManager;
	private planCheckProcessor: PlanCheckProcessor;
	private structuredPromptManager: StructuredPromptManager;
	private streamingIndicatorManager!: StreamingIndicatorManager; // Initialized in constructor after planTracker

	// State management
	private currentPhase: 'plan' | 'thought' | 'action' | 'observation' | 'final_answer' | null = null;
	private currentExecutionPhase: 'plan' | 'execute' = 'plan';
	private buffer: string = '';
	private isExecutingTool: boolean = false;
	private isExecutingStep: boolean = false; // Flag to suppress streaming indicators during step execution
	private conversationMessages: ChatMessage[] = [];
	private originalUserQuery: string = ''; // Store the original user query for content generation
	private currentToolIndicator: HTMLElement | null = null; // Track current tool indicator (kept for external access)
	private incompleteActionChecks: Map<string, number> = new Map(); // Track incomplete action parsing attempts
	private currentStreamingIndicator: HTMLElement | null = null; // Track streaming indicator (kept for external access)
	private isStreaming: boolean = false; // Track if currently streaming (kept for external access)

	// Plan-Execute specific state
	private executionResults: any[] = []; // Track tool execution results with step_id
	private planSteps: any[] = []; // Store the plan steps
	private currentStepIndex: number = 0; // Track which step we're currently executing
	private isManualStepManagement: boolean = false; // Flag to disable automatic step advancement in processAction
	private isPlanGenerationPhase: boolean = false; // Flag to prevent action execution during plan generation
	private currentStepProgressIndicator: HTMLElement | null = null; // Track current step progress indicator
	private stepProgressIndicators: Map<string, HTMLElement> = new Map(); // Track progress indicators for each step by step_id
	private stepFailureInfo: Map<string, PlaceholderReplacementError | Error> = new Map(); // Track failure errors for each step
	private planTracker: PlanExecuteTracker | null = null; // Track the NEW plan tracker instance
	private planTasks: Task[] = []; // Store tasks for the NEW tracker

	// Token usage tracking
	private stepTokenUsage: Map<string, number> = new Map();

	// Abort control for stopping plan-execute
	private abortController: AbortController | null = null;
	private isAborted: boolean = false;

	// Tool failure handling - wait for user decision (retry, regenerate, or skip)
	private pendingToolFailure: {
		toolName: string;
		args: any;
		error: Error;
		stepId: string;
		stepIndex: number;
		resolve: (action: 'retry' | 'regenerate' | 'skip') => void;
	} | null = null;

	// Final answer streaming state
	private currentFinalAnswerMessage: ChatMessage | null = null;
	private finalAnswerElement: HTMLElement | null = null;
	private onFinalAnswerCallback: ((message: ChatMessage) => void) | null = null;
	private onPlanCreatedCallback: ((planData: any, tasks: Task[]) => void) | null = null;

	// Modular components
	private promptBuilder: PromptBuilder;
	private streamingProcessor: StreamingProcessor;
	private stepExecutor: StepExecutor;
	private taskRetryHandler: TaskRetryHandler;

	constructor(plugin: LLMSiderPlugin, toolExecutionManager: ToolExecutionManager, messageContainer: HTMLElement) {
		this.plugin = plugin;
		this.toolExecutionManager = toolExecutionManager;
		this.messageContainer = messageContainer;
		this.i18n = plugin.getI18nManager()!; // Get i18n instance from plugin
		this.planCheckProcessor = new PlanCheckProcessor(plugin, messageContainer);
		this.structuredPromptManager = new StructuredPromptManager(plugin);

		// Initialize PromptBuilder
		this.promptBuilder = new PromptBuilder(
			this.i18n,
			() => this.getAvailableToolsDescription()
		);

		// Initialize StreamingIndicatorManager
		this.streamingIndicatorManager = new StreamingIndicatorManager(
			this.messageContainer,
			this.i18n,
			this.plugin,
			this.planTracker, // Will be null initially, updated when planTracker is created
			() => this.isExecutingStep,
			() => this.pendingToolFailure
		);

		// Initialize StreamingProcessor
		this.streamingProcessor = new StreamingProcessor(
			this.i18n,
			this.streamingIndicatorManager,
			this.onFinalAnswerCallback,
			this.planTasks
		);

		// Initialize StepExecutor
		this.stepExecutor = new StepExecutor(
			this.i18n,
			this.planCheckProcessor,
			() => this.planSteps,
			() => this.currentStepIndex,
			(index: number) => { this.currentStepIndex = index; },
			() => this.isManualStepManagement,
			(value: boolean) => { this.isManualStepManagement = value; },
			() => this.isAborted,
			() => this.abortController,
			(step: any, stepIndex: number, reuseIndicator?: boolean) => this.executeStepAndWaitForCompletion(step, stepIndex, reuseIndicator),
			(startIndex: number) => this.markRemainingStepsAsCancelled(startIndex),
			(stepId: string, status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped', result?: string, errorMsg?: string) => this.updateStaticPlanStepStatus(stepId, status, result, errorMsg),
			(progressElement: HTMLElement, status: 'preparing' | 'executing' | 'completed' | 'failed' | 'cancelled', message?: string, outputContent?: string, toolName?: string) => this.updateStepProgressIndicator(progressElement, status, message, outputContent, toolName),
			() => this.stepProgressIndicators,
			(toolName: string) => this.isFileCreationTool(toolName)
		);

		// Initialize TaskRetryHandler
		this.taskRetryHandler = new TaskRetryHandler(
			this.i18n,
			() => this.planSteps,
			() => this.planTasks,
			() => this.stepFailureInfo,
			(index: number) => { this.currentStepIndex = index; },
			() => this.isAborted,
			() => this.abortController,
			() => this.originalUserQuery,
			() => this.executionResults,
			() => this.pendingToolFailure,
			(value: any) => { this.pendingToolFailure = value; },
			(step: any, stepIndex: number, reuseIndicator?: boolean) => this.executeStepAndWaitForCompletion(step, stepIndex, reuseIndicator),
			(userQuery: string) => this.generateFinalAnswer(userQuery),
			(startIndex: number) => this.markRemainingStepsAsCancelled(startIndex),
			() => this.updatePlanTracker(),
			(stepId: string, status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped', result?: string, errorMsg?: string) => this.updateStaticPlanStepStatus(stepId, status, result, errorMsg),
			() => this.incrementCompletedSteps(),
			(originalStep: any, stepIndex: number, error: Error) => this.intelligentlyRegenerateStep(originalStep, stepIndex, error)
		);

		// Listen for language changes to update i18n reference
		this.i18n.onLanguageChange(() => {
			this.i18n = plugin.getI18nManager()!; // Refresh i18n instance when language changes
		});
	}

	/**
	 * Set callback for when final answer is ready
	 */
	setFinalAnswerCallback(callback: (message: ChatMessage) => void): void {
		this.onFinalAnswerCallback = callback;
	}

	/**
	 * Set callback for when plan is created
	 */
	setPlanCreatedCallback(callback: (planData: any, tasks: Task[]) => void): void {
		this.onPlanCreatedCallback = callback;
	}

	/**
	 * Start Plan-Execute processing from user input with sequential step execution
	 */
	async startPlanExecuteFlow(userQuery: string, messages: ChatMessage[], abortController?: AbortController): Promise<void> {
		Logger.debug('Starting Plan-Execute flow for query:', userQuery);

		// Store the original user query for later use in content generation
		this.originalUserQuery = userQuery;

		// Set up abort controller
		this.abortController = abortController || new AbortController();
		this.isAborted = false;

		// Initialize structured prompt manager with original user intent
		this.structuredPromptManager.initializeSession(userQuery);

		// Store conversation history excluding the current user query to avoid duplication
		this.conversationMessages = messages.filter(msg => msg.content !== userQuery || msg.role !== 'user');

		Logger.debug('Filtered conversation messages:', {
			original: messages.length,
			filtered: this.conversationMessages.length,
			userQuery: userQuery.substring(0, 50) + '...'
		});

		try {
			// Phase 1: Generate Plan (disable action execution during plan generation)
			this.isPlanGenerationPhase = true;
			await this.generateExecutionPlan(userQuery);
			this.isPlanGenerationPhase = false;

			// Check if aborted after plan generation
			if (this.isAborted || this.abortController?.signal.aborted) {
				Logger.debug('Plan-Execute flow aborted after plan generation');
				return;
			}

			// Phase 2: Execute all steps sequentially with per-step parameter validation
			await this.stepExecutor.executeStepsSequentially();

			// Check if aborted after step execution
			if (this.isAborted || this.abortController?.signal.aborted) {
				Logger.debug('Plan-Execute flow aborted after step execution');
				return;
			}

			// Phase 3: Generate final answer
			await this.generateFinalAnswer(userQuery);

		} catch (error) {
			Logger.error('Error in Plan-Execute flow:', error);
			this.streamingIndicatorManager.hideStreamingIndicator();
			this.streamingIndicatorManager.displayPhase(this.i18n.t('planExecute.contentGeneration.error'), this.i18n.t('errors.unknownError'), SvgIcons.alertCircle());
		}
	}

	/**
	 * Generate execution plan using LLM
	 */
	private async generateExecutionPlan(userQuery: string): Promise<void> {
		const startTime = Date.now();
		Logger.debug('⏱️ [START] Generating execution plan...', new Date().toISOString());

		// Ensure isExecutingStep is false to allow streaming indicator to show
		this.isExecutingStep = false;
		
		// Create a simple, highly visible indicator for plan generation
		this.streamingIndicatorManager.createSimplePlanGenerationIndicator(this.i18n.t('planExecute.generating'));

		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			throw new Error(this.i18n.t('errors.noProvider'));
		}

		// Build plan generation prompt (using PromptBuilder module)
		const promptStartTime = Date.now();
		Logger.debug('⏱️ [START] Building plan prompt...', new Date().toISOString());
		const planPrompt = await this.promptBuilder.buildPlanExecutePrompt(userQuery, 'plan');
		const promptEndTime = Date.now();
		Logger.debug(`⏱️ [END] Building plan prompt took ${promptEndTime - promptStartTime}ms`);

		// Create structured prompt for plan generation
		const structuredPromptStartTime = Date.now();
		Logger.debug('⏱️ [START] Creating structured prompt...', new Date().toISOString());
		const structuredUserPrompt = this.structuredPromptManager.createStructuredUserPrompt(
			planPrompt,
			'Generating execution plan for the above request'
		);
		const structuredPromptEndTime = Date.now();
		Logger.debug(`⏱️ [END] Creating structured prompt took ${structuredPromptEndTime - structuredPromptStartTime}ms`);

		// Prepare messages for plan generation
		const messagesStartTime = Date.now();
		Logger.debug('⏱️ [START] Preparing messages...', new Date().toISOString());
		const planMessages = [
			...this.conversationMessages,
			{
				id: Date.now().toString(),
				role: 'user' as const,
				content: structuredUserPrompt,
				timestamp: Date.now()
			}
		];
		const messagesEndTime = Date.now();
		Logger.debug(`⏱️ [END] Preparing messages took ${messagesEndTime - messagesStartTime}ms`);

		// Estimate and log token usage for plan generation
		const tokenEstimateStartTime = Date.now();
		Logger.debug('⏱️ [START] Estimating tokens...', new Date().toISOString());
		const planStepId = 'plan_generation';
		const estimatedTokens = TokenManager.estimateTokensForMessages(planMessages) +
			TokenManager.estimateTokensForContext(planPrompt);
		const tokenEstimateEndTime = Date.now();
		Logger.debug(`⏱️ [END] Estimating tokens took ${tokenEstimateEndTime - tokenEstimateStartTime}ms`);
		Logger.debug(`Token estimation for ${planStepId}: ${TokenManager.formatTokenUsage(estimatedTokens)}`);

		// ===== LOG LLM REQUEST FOR DEBUGGING =====
		Logger.debug('='.repeat(80));
		Logger.debug('🔍 LLM REQUEST - Plan Generation Phase');
		Logger.debug('='.repeat(80));
		Logger.debug('[Request Info]');
		Logger.debug('  Phase: Plan Generation');
		Logger.debug('  User Query:', userQuery.substring(0, 100) + (userQuery.length > 100 ? '...' : ''));
		Logger.debug('');
		Logger.debug('Total:', planMessages.length);
		planMessages.forEach((msg, idx) => {
			Logger.debug(`  Message ${idx + 1}:`);
			Logger.debug(`    Role: ${msg.role}`);
			Logger.debug(`    Content length: ${typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length} characters`);
			if (msg.role === 'user' && idx === planMessages.length - 1) {
				// Log the full structured prompt for the last user message
				Logger.debug(`    Content (Structured Prompt):`);
				const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2);
				Logger.debug(contentStr);
			} else {
				// For other messages, show first 200 chars
				const contentPreview = typeof msg.content === 'string' 
					? msg.content.substring(0, 200) 
					: JSON.stringify(msg.content).substring(0, 200);
				Logger.debug(`    Content preview: ${contentPreview}${contentPreview.length === 200 ? '...' : ''}`);
			}
		});
		Logger.debug('');
		Logger.debug('[System Prompt]');
		Logger.debug(planPrompt);
		Logger.debug('');
		Logger.debug('[Provider Info]');
		Logger.debug('  Provider:', provider.getProviderName());
		Logger.debug('  Model:', (provider as any).model || 'unknown');
		Logger.debug('');
		Logger.debug('[Token Estimation]');
		Logger.debug('  Estimated input tokens:', estimatedTokens);
		Logger.debug('='.repeat(80));
		// ===== END LOG =====

		this.buffer = '';
		this.currentPhase = null;

		let actualResponseTokens = 0;
		const streamingStartTime = Date.now();
		Logger.debug('⏱️ [START] Starting LLM streaming...', new Date().toISOString());
		
		// Track streaming progress for user feedback
		let progressCheckInterval: number | null = null;
		let lastProgressUpdate = streamingStartTime;
		
		// Update progress indicator every 1 second during streaming - show immediately from start
		progressCheckInterval = window.setInterval(() => {
			const elapsed = Date.now() - streamingStartTime;
			const elapsedSeconds = Math.floor(elapsed / 1000);
			// Logger.debug(`⏱️ [PROGRESS] LLM streaming in progress: ${elapsedSeconds}s elapsed, received ${actualResponseTokens} tokens`);
			
			// Update streaming indicator with elapsed time from the very beginning
			this.streamingIndicatorManager.updateStreamingIndicator(`${this.i18n.t('planExecute.generating')} (${elapsedSeconds}s)`);
		}, 1000);
		
		// Stream plan generation
		await provider.sendStreamingMessage(planMessages, (chunk) => {
			if (this.abortController?.signal.aborted || this.isAborted) {
				return;
			}

			if (chunk.delta) {
				this.buffer += chunk.delta;
				actualResponseTokens += TokenManager.estimateTokensForText(chunk.delta);
				this.processStreamingChunk();
				
				// Log progress every 1000ms during streaming
				const now = Date.now();
				if (now - lastProgressUpdate > 1000) {
					const elapsed = now - streamingStartTime;
					// Logger.debug(`⏱️ [STREAMING] Elapsed: ${elapsed}ms, Received tokens: ~${actualResponseTokens}, Buffer size: ${this.buffer.length} chars`);
					lastProgressUpdate = now;
				}
			}
			if (chunk.isComplete && chunk.usage) {
				const streamingEndTime = Date.now();
				Logger.debug(`⏱️ [END] LLM streaming completed in ${streamingEndTime - streamingStartTime}ms`);
				Logger.debug(`⏱️ [STATS] Total tokens received: ~${actualResponseTokens}, Final buffer size: ${this.buffer.length} chars`);
				// Log actual token usage
				Logger.debug(`Actual token usage for ${planStepId}: ${TokenManager.formatTokenUsage(chunk.usage.totalTokens || actualResponseTokens)}`);
				
				// Clear progress interval
				if (progressCheckInterval) {
					window.clearInterval(progressCheckInterval);
					progressCheckInterval = null;
				}
			}
		}, this.abortController?.signal);
		
		// Ensure interval is cleared even if streaming fails
		if (progressCheckInterval) {
			window.clearInterval(progressCheckInterval);
		}

		// NOTE: Don't hide streaming indicator here - it will be hidden when plan is displayed
		// This ensures users see the "Generating plan..." message during the entire process
		// this.streamingIndicatorManager.hideStreamingIndicator();

		const endTime = Date.now();
		Logger.debug(`⏱️ [TOTAL] Plan generation completed in ${endTime - startTime}ms`);
	}

	// NOTE: executeStepsSequentially method (~90 lines)
	// has been moved to StepExecutor module

	// NOTE: markRemainingStepsAsCancelled (~22 lines) 
	// has been moved to StepExecutor module but kept here as wrapper for internal use
	private markRemainingStepsAsCancelled(startIndex: number): void {
		this.stepExecutor.markRemainingStepsAsCancelled(startIndex);
	}

	// NOTE: executeDataGatheringSteps (~47 lines) and executeFileCreationSteps (~51 lines)
	// have been moved to StepExecutor module (~98 lines saved)

	/**
	 * Detect if an error is related to token limits
	 */
	private isTokenLimitError(error: any): boolean {
		return ValidationUtils.isTokenLimitError(error);
	}

	/**
	 * Generate content for create tool by interacting with LLM based on previous execution results
	 */
	/**
	 * Enhanced content generation for create tool with visual progress indicators
	 */
	private async generateContentForTool(step: any, originalInput: any): Promise<any> {
		return ContentToolGeneratorUtils.generateContentForTool(
			step,
			originalInput,
			this.executionResults,
			this.conversationMessages,
			() => this.plugin.getActiveProvider(),
			(s: any, fp: string, ct: string, tn: string) => this.promptBuilder.buildContentGenerationPrompt(
				s, 
				fp, 
				ct, 
				tn,
				this.originalUserQuery,
				this.planSteps,
				() => this.buildCollectedInformationSection(),
				() => this.buildExecutionContextSection()
			),
			() => this.createContentGenerationIndicator(),
			(ind: HTMLElement, ph: string, msg: string, cnt?: string) => this.updateContentGenerationIndicator(ind, ph as any, msg, cnt),
			() => this.extractWebContentFromResults(),
			() => this.formatExecutionResultsForPrompt(),
			(content: string) => this.cleanGeneratedContent(content),
			(error: any) => this.isTokenLimitError(error),
			this.i18n,
			this.abortController?.signal,
			this.isAborted
		);
	}

	/**
	 * Build collected information section for final create step
	 * Only includes the actual collected data (results) from preparation steps
	 */
	private buildCollectedInformationSection(): string {
		return FormatUtils.buildCollectedInformationSection(this.executionResults, this.planSteps);
	}

	/**
	 * Build execution context section with all step purposes and results
	 */
	private buildExecutionContextSection(): string {
		return FormatUtils.buildExecutionContextSection(this.planSteps, this.executionResults);
	}

	/**
	 * Extract web content from execution results
	 */
	private extractWebContentFromResults(): string | null {
		return FormatUtils.extractWebContentFromResults(this.executionResults);
	}

	/**
	 * Format execution results for prompt
	 */
	/**
	 * Clean up generated content by removing unwanted markers
	 */
	// Content cleaning now delegated to ContentCleaner
	private cleanGeneratedContent(content: string): string {
		return ContentCleaner.cleanGeneratedContent(content);
	}

	/**
	 * Check if a tool is used for file creation
	 */
	private isFileCreationTool(toolName: string): boolean {
		return ValidationUtils.isFileCreationTool(toolName);
	}

	/**
	 * Execute a single step and wait for its complete execution including tool calls
	 */
	private async executeStepAndWaitForCompletion(step: any, stepIndex: number, reuseIndicator: boolean = false): Promise<void> {
		this.isExecutingStep = true; // Suppress streaming indicators during step execution

		try {
			Logger.debug(`===== Starting step execution =====`);
			Logger.debug(`Step ID: ${step.step_id}, Index: ${stepIndex}, Tool: ${step.tool}, Reuse indicator: ${reuseIndicator}`);
			
			// Estimate tokens for this step
			const estimatedTokens = TokenManager.estimateTokensForText(
				`Tool: ${step.tool}, Input: ${JSON.stringify(step.input)}`
			) + 400; // Base estimation

			// Skip creating individual step progress indicators - using NEW PlanExecuteTracker
			// The NEW PlanExecuteTracker handles all visual updates
			Logger.debug(`Using PlanExecuteTracker for visual updates, skipping individual step progress indicator`);

			// IMPORTANT: Update the plan step to show it's executing (works for both OLD and NEW)
			this.updateStaticPlanStepStatus(step.step_id, 'executing');

			// Agent mode: Skip parameter validation and correction - use step as-is
			Logger.debug(`Agent mode: Skipping parameter validation for step ${stepIndex + 1}: ${step.tool}`);
			
			const validatedStep = step;

			// STEP 2: Parse and prepare step input
			let stepInput = StepExecutionUtils.parseStepInput(
				validatedStep.input,
				validatedStep.tool,
				(json: string) => this.sanitizeJSONString(json),
				this.i18n
			);

		// Replace step placeholders with actual values from previous execution results
		try {
			stepInput = PlaceholderUtils.replacePlaceholders(stepInput, this.executionResults);
			Logger.debug(`After placeholder replacement, type:`, typeof stepInput);
		} catch (error) {
			// Handle placeholder replacement errors
			if (error instanceof PlaceholderReplacementError) {
				Logger.error(`Placeholder replacement failed:`, error);
				
				// Save error info for later regeneration
				this.stepFailureInfo.set(step.step_id, error);
				
				// Create error message first
				const errorMessage = `${this.i18n.t('planExecute.placeholderError.title')}: ${error.message}`;
				const guidedObservation = `占位符 ${error.placeholder} 替换失败。\n\n可用的字段: ${error.availableFields.join(', ')}\n\n请重新生成步骤使用正确的字段名，或跳过此步骤。`;
				
				// Add toolCall entry for error display in expanded details
				const task = this.planTasks.find(t => t.id === step.step_id);
				if (task) {
					const toolCallInfo: ToolCall = {
						id: Date.now().toString(),
						toolName: step.tool,
						toolType: 'builtin',
						parameters: step.input,
						error: errorMessage,
						timestamp: new Date().toISOString(),
						duration: 0
					};
					
					if (!task.toolCalls) {
						task.toolCalls = [];
					}
					task.toolCalls.push(toolCallInfo);
					
					// Set task status to error
					task.status = 'error';
					task.error = errorMessage;
					Logger.debug('Added placeholder error to task toolCalls for display');
				}
				
				// Update static plan status to failed WITH the error message
				this.updateStaticPlanStepStatus(step.step_id, 'failed', undefined, errorMessage);
				
				// Create tool indicator if it doesn't exist yet (since placeholder error happens before processAction)
				if (!this.currentToolIndicator) {
					this.currentToolIndicator = this.streamingIndicatorManager.createToolIndicator();
				}
				
				// Create and show tool execution card with error
				this.streamingIndicatorManager.updateToolIndicator('error', step.tool, step.input, guidedObservation);
				
				// Update step progress indicator to show error
				if (this.currentStepProgressIndicator) {
					this.updateStepProgressIndicator(
						this.currentStepProgressIndicator, 
						'failed', 
						`⚠️ ${errorMessage}`
					);
				}
				
				// Create a pending promise for user action
				Logger.debug('Creating pendingToolFailure object for placeholder error');
				const userActionPromise = new Promise<'retry' | 'regenerate' | 'skip'>((resolve) => {
					this.pendingToolFailure = {
						toolName: step.tool,
						args: step.input,
						error: error,
						stepId: step.step_id,
						stepIndex: stepIndex,
						resolve: resolve
					};
				});
				
				// Wait for user decision
				Logger.debug('Waiting for user decision on placeholder error...');
				const userAction = await userActionPromise;
				Logger.debug('User chose action for placeholder error:', userAction);
				
				// Clear the pending promise
				this.pendingToolFailure = null;
				
				// Handle user's choice
				if (userAction === 'regenerate') {
					// Regenerate the step using AI
					Logger.debug('Regenerating step after placeholder error:', step.step_id);
					
					try {
						const regeneratedStep = await this.regenerateStep(step, stepIndex, error);
						
						if (regeneratedStep) {
							// Update the steps array with regenerated step
							this.planSteps[stepIndex] = regeneratedStep;
							
							// Recursively execute the regenerated step, reusing the current indicator
							Logger.debug('Re-executing regenerated step:', regeneratedStep.step_id);
							await this.executeStepAndWaitForCompletion(regeneratedStep, stepIndex, true);
						} else {
							Logger.error('Step regeneration returned null');
							
							// Mark as failed
							this.markStepFailed(step.step_id, errorMessage, guidedObservation);
							
							// Record failed execution
							this.executionResults.push({
								step_id: step.step_id,
								step_index: stepIndex,
								tool_name: step.tool,
								tool_args: step.input,
								tool_result: { success: false, error: error.message },
								step_reason: step.reason || '', // Include step purpose
								success: false,
								timestamp: new Date().toISOString()
							});
						}
					} catch (regenerationError) {
						Logger.error('Step regeneration failed:', regenerationError);
						
						// Mark as failed
						this.markStepFailed(step.step_id, errorMessage, guidedObservation);
						
						// Record failed execution
						this.executionResults.push({
							step_id: step.step_id,
							step_index: stepIndex,
							tool_name: step.tool,
							tool_args: step.input,
							tool_result: { success: false, error: error.message },
							step_reason: step.reason || '', // Include step purpose
							success: false,
							timestamp: new Date().toISOString()
						});
					}
					
					return;
					
				} else if (userAction === 'retry') {
					// Retry with same parameters (will likely fail again, but user's choice)
					Logger.debug('Retrying step after placeholder error:', step.step_id);
					
					// Recursively execute the same step, reusing the current indicator
					await this.executeStepAndWaitForCompletion(step, stepIndex, true);
					return;
					
				} else {
					// User chose to skip
					Logger.debug('Skipping step after placeholder error:', step.step_id);
					
					// Mark as failed
					this.markStepFailed(step.step_id, errorMessage, guidedObservation);
					
					// Get previous successful result for potential fallback
					const lastSuccessResult = this.executionResults.find((r, idx) => {
						return idx < stepIndex && r.success === true;
					});
					
					// Record failed execution with skipped flag
					this.executionResults.push({
						step_id: step.step_id,
						step_index: stepIndex,
						tool_name: step.tool,
						tool_args: step.input,
						tool_result: { 
							success: false,
							skipped: true,
							error: error.message,
							placeholder: error.placeholder,
							availableFields: error.availableFields,
							previousResult: lastSuccessResult?.tool_result
						},
						step_reason: step.reason || '', // Include step purpose
						success: false,
						timestamp: new Date().toISOString()
					});
					
					// Increment step counter and return
					this.incrementCompletedSteps();
					return;
				}
			} else {
				// Re-throw other errors
				throw error;
			}
		}			// Generate content for content-generation tools
			if (StepExecutionUtils.isContentGenerationTool(validatedStep.tool)) {
				Logger.debug(`Detected ${validatedStep.tool} tool. Current execution results count: ${this.executionResults.length}`);
				Logger.debug(`Running enhanced content generation for ${validatedStep.tool} tool`);
				stepInput = await this.generateContentForTool(validatedStep, stepInput);
				Logger.debug(`After generateContentForTool, type:`, typeof stepInput);
				Logger.debug(`After generateContentForTool, keys:`, typeof stepInput === 'object' ? Object.keys(stepInput) : 'N/A');
			}

			// Normalize step input after content generation
			stepInput = await StepExecutionUtils.normalizeStepInput(
				stepInput,
				validatedStep.tool,
				(tool: string, input: string) => this.mapInputForTool(tool, input)
			);

			// Create action content for tool execution
			const actionContent = StepExecutionUtils.createActionContent(
				validatedStep.step_id,
				validatedStep.tool,
				stepInput
			);

			Logger.debug(`Generated action for step ${stepIndex + 1}:`, actionContent);

			// Update step status to executing BEFORE calling processAction
			if (this.currentStepProgressIndicator) {
				this.updateStepProgressIndicator(this.currentStepProgressIndicator, 'executing', `${SvgIcons.zap()} ${this.i18n.t('status.executingTool')}...`);
			}

			// Process the action (this will handle tool execution)
			// CRITICAL: This is the actual execution point - we must wait for it to complete
			Logger.debug(`===== Calling processAction (BLOCKING) =====`);
			await this.processAction(actionContent);
			Logger.debug(`===== processAction returned =====`);

			// Wait for tool execution to complete using StepExecutionUtils
			try {
				const waitCount = await StepExecutionUtils.waitForToolCompletion(
					() => this.isExecutingTool,
					() => this.isAborted || this.abortController?.signal.aborted || false,
					stepIndex,
					60 // 60 seconds timeout
				);
				Logger.debug(`===== Step ${stepIndex + 1} execution fully completed after ${waitCount} wait cycles =====`);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				
				if (errorMsg === 'ABORTED') {
					Logger.debug('Step execution aborted during tool execution wait');
					return;
				}
				
				if (errorMsg.startsWith('TIMEOUT:')) {
					const timeoutSeconds = parseInt(errorMsg.split(':')[1]);
					Logger.error(`Tool execution wait timeout after ${timeoutSeconds} seconds - forcing completion`);
					this.isExecutingTool = false;
					
					// Mark step as failed due to timeout
					if (this.currentStepProgressIndicator) {
						this.updateStepProgressIndicator(
							this.currentStepProgressIndicator, 
							'failed', 
							`${SvgIcons.clock()} ${this.i18n.t('planExecute.stepExecution.stepTimeout')}`
						);
					}
					
					// Update static plan step status
					this.updateStaticPlanStepStatus(step.step_id, 'failed');
					throw new Error(`Step ${stepIndex + 1} execution timeout after ${timeoutSeconds} seconds`);
				}
				
				throw error;
			}
			
			// CRITICAL: Mark step as completed AFTER tool execution is fully done
			Logger.debug(`Marking step ${step.step_id} as completed`);
			this.markStepCompleted(step.step_id);
			Logger.debug(`Step ${step.step_id} marked as completed`);

		} catch (error) {
			Logger.error(`Error executing step ${stepIndex + 1}:`, error);

			// Mark step as failed only if it wasn't already marked as failed by processAction
			if (this.currentStepProgressIndicator) {
				const statusElement = this.currentStepProgressIndicator.querySelector('.step-status') as HTMLElement;
				const alreadyFailed = statusElement?.textContent?.includes('❌') || statusElement?.textContent?.includes(this.i18n.t('planExecute.stepExecution.executionInterrupted'));

				if (!alreadyFailed) {
					let errorMessage: string;
					let detailMessage: string;

					// Special handling for token limit errors
					if (this.isTokenLimitError(error)) {
						errorMessage = this.i18n.t('errors.stepExecutionFailedContext');
						detailMessage = this.i18n.t('errors.tokenLimitSuggestion');
					} else {
						errorMessage = error instanceof Error ? error.message : this.i18n.t('errors.unknownError');
						detailMessage = errorMessage;
					}

					this.updateStepProgressIndicator(this.currentStepProgressIndicator, 'failed', `❌ ${this.i18n.t('status.stepFailed')}: ${errorMessage}`, detailMessage);

					// IMPORTANT: Also update the static plan step to show failure
					this.updateStaticPlanStepStatus(step.step_id, 'failed');
				}
			}

			throw error; // Re-throw to halt execution
		} finally {
			this.isExecutingStep = false; // Re-enable streaming indicators
			// Clean up tool indicator for this step to allow next step to create its own
			this.currentToolIndicator = null;
			Logger.debug('Cleaned up currentToolIndicator in finally block');
		}
	}

	/**
	 * Estimate tokens for tool execution
	 */
	private estimateTokensForToolExecution(toolName: string, toolInput: any, actionContent: string): number {
		return ToolExecutionUtils.estimateTokensForToolExecution(
			toolName,
			toolInput,
			actionContent,
			TokenManager
		);
	}

	/**
	 * Map raw string input to appropriate parameter object based on tool's input schema
	 */
	private async mapInputForTool(toolName: string, rawInput: string): Promise<any> {
		return ToolExecutionUtils.mapInputForTool(
			toolName,
			rawInput,
			() => this.plugin.getToolManager()
		);
	}

	/**
	 * Generate final answer based on all step results
	 */
	private async generateFinalAnswer(userQuery: string): Promise<void> {
		Logger.debug('Generating final answer...');

		// Create a final answer generation indicator similar to step execution
		const finalAnswerIndicator = this.createFinalAnswerIndicator();

		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			throw new Error(this.i18n.t('errors.noProvider'));
		}

		// Build final answer prompt with structured context
		const finalPrompt = this.structuredPromptManager.createFinalAnswerPrompt(this.executionResults);

		// Prepare messages for final answer generation
		const finalMessages = [
			...this.conversationMessages,
			{
				id: Date.now().toString(),
				role: 'user' as const,
				content: finalPrompt,
				timestamp: Date.now()
			}
		];

		// Estimate and log token usage for final answer
		const finalAnswerStepId = 'final_answer_generation';
		const estimatedTokens = TokenManager.estimateTokensForMessages(finalMessages) +
			TokenManager.estimateTokensForContext(finalPrompt);
		Logger.debug(`Token estimation for ${finalAnswerStepId}: ${TokenManager.formatTokenUsage(estimatedTokens)}`);

		// Initialize final answer message for streaming
		const finalAnswerMessage: ChatMessage = {
			id: Date.now().toString(),
			role: 'assistant',
			content: '', // Initialize as string for streaming
			timestamp: Date.now(),
			metadata: {
				phase: 'final_answer',
				isStreaming: true
			}
		};

		// Update indicator to executing state
		this.updateFinalAnswerIndicator(finalAnswerIndicator, 'executing', this.i18n.t('planExecute.generatingAnswer'));

		// First, notify the callback that final answer streaming has started
		if (this.onFinalAnswerCallback) {
			this.onFinalAnswerCallback({ ...finalAnswerMessage });
		}

		let actualResponseTokens = 0;
		// Stream final answer generation
		try {
			await provider.sendStreamingMessage(finalMessages, (chunk) => {
				if (this.abortController?.signal.aborted || this.isAborted) {
					return;
				}

				if (chunk.delta) {
					// Accumulate raw content first
					let rawContent = '';
					if (typeof finalAnswerMessage.content === 'string') {
						rawContent = finalAnswerMessage.content + chunk.delta;
					} else {
						rawContent = chunk.delta;
					}

					// Extract clean content from final_answer tags if present
					const finalAnswerMatch = rawContent.match(/<final_answer>([\s\S]*?)(?:<\/final_answer>|$)/);
					if (finalAnswerMatch) {
						// Only use content inside final_answer tags
						finalAnswerMessage.content = finalAnswerMatch[1];
					} else {
						// If no final_answer tags yet, use raw content
						finalAnswerMessage.content = rawContent;
					}

					actualResponseTokens += TokenManager.estimateTokensForText(chunk.delta);

					// Update streaming metadata
					if (finalAnswerMessage.metadata) {
						finalAnswerMessage.metadata.isStreaming = true;
					}

					// Notify callback about content update for proper message rendering
					if (this.onFinalAnswerCallback) {
						this.onFinalAnswerCallback({ ...finalAnswerMessage });
					}
				}
				if (chunk.isComplete && chunk.usage) {
					// Log actual token usage
					Logger.debug(`Actual token usage for ${finalAnswerStepId}: ${TokenManager.formatTokenUsage(chunk.usage.totalTokens || actualResponseTokens)}`);
				}
			}, this.abortController?.signal);
		} catch (finalAnswerError: unknown) {
			// Enhanced error handling with detailed information
			Logger.error('Final answer generation error:', finalAnswerError);
			
			// Check for network-related errors
			const isNetworkError = finalAnswerError instanceof Error && (
				finalAnswerError.message.includes('network error') ||
				finalAnswerError.message.includes('INCOMPLETE_CHUNKED_ENCODING') ||
				finalAnswerError.message.includes('ERR_NETWORK') ||
				finalAnswerError.message.includes('ERR_INCOMPLETE_CHUNKED_ENCODING') ||
				finalAnswerError.message.includes('fetch failed') ||
				finalAnswerError.message.includes('connection') ||
				finalAnswerError.message.includes('ECONNRESET') ||
				finalAnswerError.message.includes('ETIMEDOUT')
			);

			if (isNetworkError) {
				const networkErrorMessage = this.i18n.t('errors.networkStreamInterrupted');
				Logger.error('Network streaming error detected:', finalAnswerError);

				// Update final answer indicator to show network error
				this.updateFinalAnswerIndicator(
					finalAnswerIndicator, 
					'failed',
					`❌ ${networkErrorMessage}`
				);

				// Set helpful error content in final answer message
				const errorDetails = finalAnswerError instanceof Error ? finalAnswerError.message : String(finalAnswerError);
				finalAnswerMessage.content = this.i18n.t('errors.networkStreamInterruptedDetail', { 
					details: errorDetails 
				});
				
				if (finalAnswerMessage.metadata) {
					finalAnswerMessage.metadata.isStreaming = false;
					finalAnswerMessage.metadata.error = 'Network streaming interrupted';
				}

				// Still notify callback with error message
				if (this.onFinalAnswerCallback) {
					this.onFinalAnswerCallback({ ...finalAnswerMessage });
				}

				// Add to conversation messages for context
				this.conversationMessages.push({ ...finalAnswerMessage });
				return; // Exit gracefully
			}
			
			// Handle token limit errors in final answer generation
			if (this.isTokenLimitError(finalAnswerError)) {
				Logger.error('Token limit exceeded during final answer generation:', finalAnswerError);

				// Update final answer indicator to show token limit error
				this.updateFinalAnswerIndicator(finalAnswerIndicator, 'failed',
					this.i18n.t('errors.finalAnswerFailedTokenLimit'));

				// Set error content in final answer message
				finalAnswerMessage.content = this.i18n.t('errors.tokenLimitFinalAnswerContent');
				if (finalAnswerMessage.metadata) {
					finalAnswerMessage.metadata.isStreaming = false;
					finalAnswerMessage.metadata.error = 'Token limit exceeded';
				}

				// Still notify callback with error message
				if (this.onFinalAnswerCallback) {
					this.onFinalAnswerCallback({ ...finalAnswerMessage });
				}

				// Add to conversation messages for context
				this.conversationMessages.push({ ...finalAnswerMessage });
				return; // Exit the method gracefully instead of throwing
			}
			
			// Handle other errors with generic message
			const genericErrorMessage = finalAnswerError instanceof Error 
				? finalAnswerError.message 
				: this.i18n.t('errors.unknownError');
				
			Logger.error('Unhandled error during final answer generation:', genericErrorMessage);
			
			this.updateFinalAnswerIndicator(
				finalAnswerIndicator, 
				'failed',
				`❌ ${this.i18n.t('errors.finalAnswerFailed')}: ${genericErrorMessage}`
			);

			finalAnswerMessage.content = this.i18n.t('errors.finalAnswerFailedContent', {
				error: genericErrorMessage
			});
			
			if (finalAnswerMessage.metadata) {
				finalAnswerMessage.metadata.isStreaming = false;
				finalAnswerMessage.metadata.error = genericErrorMessage;
			}

			if (this.onFinalAnswerCallback) {
				this.onFinalAnswerCallback({ ...finalAnswerMessage });
			}

			this.conversationMessages.push({ ...finalAnswerMessage });
			return; // Exit gracefully instead of re-throwing
		}

		// Mark final answer as completed - but don't show the completion notification
		this.updateFinalAnswerIndicator(finalAnswerIndicator, 'completed', this.i18n.t('planExecute.answerGeneration.answerGenerated'));

		// Mark streaming as complete
		if (finalAnswerMessage.metadata) {
			finalAnswerMessage.metadata.isStreaming = false;
		}

		// Add final answer to conversation
		this.conversationMessages.push(finalAnswerMessage);

		// Final callback notification to complete the message
		if (this.onFinalAnswerCallback) {
			this.onFinalAnswerCallback({ ...finalAnswerMessage });
		}

		Logger.debug('Final answer generation completed');

		// Force hide any remaining validation indicator when final answer is complete
		if (this.planCheckProcessor.isValidationIndicatorVisible()) {
			Logger.debug('Forcing cleanup of validation indicator after final answer completion');
			this.planCheckProcessor.forceHideValidationIndicatorImmediate();
		}
	}

	/**
	 * Stop the Plan-Execute processing
	 */
	stop(): void {
		Logger.debug('Stopping Plan-Execute flow');
		this.isAborted = true;

		// Abort the streaming
		if (this.abortController) {
			this.abortController.abort();
		}

		// Hide any streaming indicators
		this.streamingIndicatorManager.hideStreamingIndicator();

		// Force hide any remaining validation indicator when stopping
		if (this.planCheckProcessor.isValidationIndicatorVisible()) {
			Logger.debug('Forcing cleanup of validation indicator during stop');
			this.planCheckProcessor.forceHideValidationIndicatorImmediate();
		}


	// Display stop message
	this.streamingIndicatorManager.displayPhase(this.i18n.t('planExecute.tracker.stopped'), this.i18n.t('planExecute.tracker.stoppedByUser'), SvgIcons.pause());
}	/**
	 * Get the abort controller for external use
	 */
	getAbortController(): AbortController | null {
		return this.abortController;
	}

	/**
	 * Build Plan-Execute prompt according to reference/tools-calling.md
	 */
	// NOTE: These three methods (buildPlanExecutePrompt, buildPlanPhasePrompt, buildSimpleFinalAnswerPrompt)  
	// have been moved to PromptBuilder module (~250 lines saved)

	private summarizeToolResult(toolResult: any): string {
		return FormatUtils.summarizeToolResult(toolResult);
	}

	/**
	 * Display plan as static todo list (no progress updates in original plan)
	 */
	private displayPlanAsTodoList(content: string): void {
		try {
			const result = DisplayUtils.displayPlanAsTodoList(
				content,
				this.messageContainer,
				this.planSteps,
				this.planTasks,
				this.planTracker,
				(toolName: string) => this.determineToolType(toolName),
				this.i18n,
				(taskId: string) => this.taskRetryHandler.handleTaskRetry(taskId),
				(taskId: string) => this.taskRetryHandler.handleTaskRegenerateAndRetry(taskId),
				(taskId: string) => this.taskRetryHandler.handleTaskSkip(taskId),
				this.onPlanCreatedCallback,
				() => this.scrollToBottom(),
				this.streamingIndicatorManager,
				this.structuredPromptManager
			);
			// Update instance properties
			this.planSteps = result.planSteps;
			this.planTasks = result.planTasks;
			this.planTracker = result.planTracker;
			
			// Hide the streaming indicator since plan generation is complete
			this.streamingIndicatorManager.hideStreamingIndicator();
		} catch (error) {
			Logger.error('Error parsing plan JSON:', error);
			// Fallback to normal display
			this.streamingIndicatorManager.displayPhase('Plan', content, SvgIcons.clipboard());
			// Also hide streaming indicator on error
			this.streamingIndicatorManager.hideStreamingIndicator();
		}
	}

	/**
	 * Create a standalone progress indicator for current step execution
	 */
	private createStepProgressIndicator(stepId: string, stepIndex: number, totalSteps: number): HTMLElement {
		return StepProgressUtils.createStepProgressIndicator(
			stepId,
			stepIndex,
			totalSteps,
			this.planSteps,
			this.messageContainer,
			this.i18n,
			() => this.scrollToBottom()
		);
	}

	/**
	 * Update step progress indicator with current status
	 */
	private updateStepProgressIndicator(progressElement: HTMLElement, status: 'preparing' | 'executing' | 'completed' | 'failed' | 'cancelled', message?: string, outputContent?: string, toolName?: string): void {
		StepProgressUtils.updateStepProgressIndicator(
			progressElement,
			status,
			message,
			outputContent,
			toolName,
			this.planTracker,
			this.i18n,
			(content) => this.formatOutputForDisplay(content),
			() => this.scrollToBottom()
		);
	}

	/**
	 * Create final answer generation indicator (similar to step execution indicator)
	 */
	private createFinalAnswerIndicator(): HTMLElement {
		return AnswerGeneratorUtils.createFinalAnswerIndicator(
			this.messageContainer,
			this.i18n,
			() => this.scrollToBottom()
		);
	}

	/**
	 * Update final answer indicator status
	 */
	private updateFinalAnswerIndicator(indicatorElement: HTMLElement, status: 'preparing' | 'executing' | 'completed' | 'failed', message?: string): void {
		AnswerGeneratorUtils.updateFinalAnswerIndicator(
			indicatorElement,
			status,
			message,
			this.i18n,
			() => this.scrollToBottom()
		);
	}

	/**
	 * Convert text content to HTML (basic markdown support)
	 */
	private convertToHTML(content: string): string {
		return ValidationUtils.convertToHTML(content);
	}

	private markStepCompleted(stepId: string, outputContent?: string): void {
		StateManagementUtils.markStepCompleted(
			stepId,
			outputContent,
			this.planTracker,
			this.stepProgressIndicators,
			this.currentStepIndex,
			this.i18n,
			(id, status, result, errorMsg) => this.updateStaticPlanStepStatus(id, status, result, errorMsg),
			() => this.incrementCompletedSteps(),
			() => this.updatePlanProgress(),
			(indicator, status, message, output) => this.updateStepProgressIndicator(indicator, status, message, output)
		);
	}

	/**
	 * Mark a plan step as in progress with enhanced visual feedback
	 */
	private markStepInProgress(stepId: string): void {
		// Skip creating individual progress indicators when using PlanExecuteTracker
		if (this.planTracker) {
			Logger.debug('Skipping markStepInProgress (using PlanExecuteTracker)');
			return;
		}

		const stepIndex = this.currentStepIndex;
		const totalSteps = this.planSteps.length;

		// Create new step progress indicator for this step
		this.currentStepProgressIndicator = this.createStepProgressIndicator(stepId, stepIndex, totalSteps);
		
		// Notify StreamingIndicatorManager about the new step progress indicator
		this.streamingIndicatorManager.setCurrentStepProgressIndicator(this.currentStepProgressIndicator);
		
		// Link the current tool indicator to this step indicator for tool execution updates
		this.currentToolIndicator = this.currentStepProgressIndicator;
		
		// Update to in-progress status
		this.updateStepProgressIndicator(this.currentStepProgressIndicator, 'preparing', `${SvgIcons.refresh()} ${this.i18n.t('planExecute.stepExecution.preparingStep')}`);

		Logger.debug('Created step progress indicator for:', stepId);
	}

	/**
	 * Mark a plan step as failed with visual feedback
	 */
	private markStepFailed(stepId: string, errorMessage?: string, outputContent?: string): void {
		StateManagementUtils.markStepFailed(
			stepId,
			errorMessage,
			outputContent,
			this.planTracker,
			this.stepProgressIndicators,
			this.i18n,
			(id, status, result, errorMsg) => this.updateStaticPlanStepStatus(id, status, result, errorMsg),
			() => this.updatePlanProgress(),
			(indicator, status, message, output) => this.updateStepProgressIndicator(indicator, status, message, output)
		);
	}

	/**
	 * Determine tool type based on tool name
	 */
	private determineToolType(toolName: string): 'mcp' | 'builtin' | 'api' {
		return ValidationUtils.determineToolType(toolName);
	}

	/**
	 * Helper method to update tracker with consistent props
	 */
	private updatePlanTracker(): void {
		if (this.planTracker) {
			this.planTracker.update({
				tasks: this.planTasks,
				isExecuting: true,
				expandable: true,
				onTaskRetry: (taskId: string) => this.taskRetryHandler.handleTaskRetry(taskId),
				onTaskRegenerateAndRetry: (taskId: string) => this.taskRetryHandler.handleTaskRegenerateAndRetry(taskId),
				onTaskSkip: (taskId: string) => this.taskRetryHandler.handleTaskSkip(taskId),
				i18n: this.i18n
			});
		}
	}

	/**
	 * Update static plan step status (checkbox)
	 */
	private updateStaticPlanStepStatus(stepId: string, status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped', result?: string, errorMsg?: string): void {
		StateManagementUtils.updateStaticPlanStepStatus(
			stepId,
			status,
			result,
			errorMsg,
			this.planTracker,
			this.planTasks,
			this.messageContainer,
			() => this.updatePlanTracker(),
			(todoItem, todoStatus, errorMessage) => this.updateTodoItemStatus(todoItem, todoStatus, errorMessage)
		);
	}

	/**
	 * Old tracker fallback code - keeping the rest for compatibility
	 */
	private oldTrackerUpdateLogic(stepId: string, status: 'completed' | 'failed' | 'executing' | 'cancelled' | 'skipped'): void {
		LegacyTrackerUtils.oldTrackerUpdateLogic(stepId, status, this.messageContainer);
	}

	/**
	 * Enhanced method to find todo item by step_id with multiple fallback strategies
	 */
	private findTodoItemByStepId(stepId: string): HTMLElement | null {
		return LegacyTrackerUtils.findTodoItemByStepId(
			stepId,
			this.messageContainer,
			this.currentStepIndex,
			this.planSteps
		);
	}

	/**
	 * Fallback method to mark step by content matching
	 */
	private markStepByContent(stepId: string, status: 'in-progress' | 'completed' | 'failed', errorMessage?: string): void {
		LegacyTrackerUtils.markStepByContent(
			stepId,
			status,
			errorMessage,
			this.messageContainer,
			this.currentStepIndex,
			(item, status, errorMessage) => this.updateTodoItemStatus(item, status, errorMessage)
		);
	}

	/**
	 * Update todo item status directly
	 */
	private updateTodoItemStatus(todoItem: HTMLElement, status: 'in-progress' | 'completed' | 'failed', errorMessage?: string): void {
		DisplayUtils.updateTodoItemStatus(
			todoItem,
			status,
			errorMessage,
			this.i18n,
			() => this.incrementCompletedSteps(),
			() => this.updatePlanProgress()
		);
	}

	/**
	 * Increment completed steps counter
	 */
	private incrementCompletedSteps(): void {
		this.currentStepIndex = StateManagementUtils.incrementCompletedSteps(
			this.currentStepIndex,
			this.planSteps.length
		);
	}

	/**
	 * Advance to next step in the execution plan
	 */
	private advanceToNextStep(): void {
		this.currentStepIndex = StateManagementUtils.advanceToNextStep(
			this.currentStepIndex,
			this.planSteps,
			() => this.updatePlanProgress()
		);
	}

	/**
	 * Get current step information
	 */
	private getCurrentStep(): any | null {
		return StateManagementUtils.getCurrentStep(this.currentStepIndex, this.planSteps);
	}

	/**
	 * Check if all steps are completed
	 */
	private areAllStepsCompleted(): boolean {
		return StateManagementUtils.areAllStepsCompleted(this.messageContainer, this.planSteps);
	}

	/**
	 * Clear previous in-progress states to ensure only one step is active
	 */
	private clearPreviousInProgressStates(): void {
		StateManagementUtils.clearPreviousInProgressStates(this.messageContainer);
	}

	/**
	 * Add celebration effect for completed steps
	 */
	private addCelebrationEffect(todoItem: HTMLElement): void {
		DisplayUtils.addCelebrationEffect(todoItem);
	}

	/**
	 * Update plan progress indicator
	 */
	private updatePlanProgress(): void {
		StateManagementUtils.updatePlanProgress(
			this.messageContainer,
			this.planSteps,
			this.currentStepIndex,
			this.i18n,
			() => this.getCurrentStep()
		);
	}
	private async getAvailableToolsDescription(): Promise<string> {
		const startTime = Date.now();
		try {
			Logger.debug('⏱️ [START] Getting available tools description...', new Date().toISOString());

			// Get unified tool manager to list all available tools
			const toolManagerStartTime = Date.now();
			const toolManager = this.plugin.getToolManager();
			if (!toolManager) {
				Logger.warn('No tool manager available');
				return this.i18n.t('planExecute.toolExecution.toolNotFound', { toolName: 'manager' });
			}
			const toolManagerEndTime = Date.now();
			Logger.debug(`⏱️ Getting tool manager took ${toolManagerEndTime - toolManagerStartTime}ms`);

			// Get all available tools (built-in + file editing + MCP)
			const getAllToolsStartTime = Date.now();
			Logger.debug('⏱️ [START] Getting all tools from manager...', new Date().toISOString());
			const allTools = await toolManager.getAllTools();
			const getAllToolsEndTime = Date.now();
			Logger.debug(`⏱️ [END] Getting all tools took ${getAllToolsEndTime - getAllToolsStartTime}ms`);
			Logger.debug(`Found ${allTools.length} available tools`);
			Logger.debug('Available tools for Plan-Execute:', allTools.map(t => ({ name: t.name, source: t.source, server: t.server })));

			if (allTools.length === 0) {
				return this.i18n.t('planExecute.toolExecution.toolNotFound', { toolName: 'manager' });
			}

			// Generate detailed tool descriptions with parameters
			const descriptionStartTime = Date.now();
			Logger.debug('⏱️ [START] Generating tool descriptions...', new Date().toISOString());
			const toolDescriptions: string[] = [];

			for (const tool of allTools) {
				let paramInfo = '';
				if (tool.inputSchema && tool.inputSchema.properties) {
					const params = Object.entries(tool.inputSchema.properties).map(([name, schema]: [string, any]) => {
						const isRequired = tool.inputSchema.required?.includes(name) ? ' (必需)' : ' (可选)';
						const typeInfo = schema.type ? ` [${schema.type}]` : '';
						const description = schema.description ? ` - ${schema.description}` : '';
						return `${name}${isRequired}${typeInfo}${description}`;
					});
					paramInfo = params.length > 0 ? `\n   参数: ${params.join(', ')}` : '';
				}

				const sourceInfo = tool.source === 'mcp' ? ` (MCP-${tool.server})` : ' (内置)';
				const syntaxNote = tool.name === 'sed' ? '\n   注意：使用JavaScript正则语法，() 分组和 $1 引用，如 s/<h1>(.*)<\\/h1>/[h1]$1[\\/h1]/g' : '';
				toolDescriptions.push(`- ${tool.name}${sourceInfo}: ${tool.description}${paramInfo}${syntaxNote}`);
			}
			const descriptionEndTime = Date.now();
			Logger.debug(`⏱️ [END] Generating tool descriptions took ${descriptionEndTime - descriptionStartTime}ms`);

			const endTime = Date.now();
			const result = toolDescriptions.join('\n');
			
			// Debug: Log tavily_web_search tool description
			const tavilyDesc = toolDescriptions.find(desc => desc.includes('tavily_web_search'));
			if (tavilyDesc) {
				Logger.debug('🔍 tavily_web_search description:', tavilyDesc);
			}
			
			Logger.debug(`⏱️ [TOTAL] getAvailableToolsDescription completed in ${endTime - startTime}ms, result length: ${result.length} characters`);
			return result;
		} catch (error) {
			const endTime = Date.now();
			Logger.error(`⏱️ Error getting tools description after ${endTime - startTime}ms:`, error);
			return this.i18n.t('planExecute.toolExecution.toolExecutionFailed');
		}
	}

	/**
	 * Process streaming response with Plan-Execute framework
	 */
	private async processStreamingWithPlanExecute(prompt: string): Promise<void> {
		Logger.debug('Starting processStreamingWithPlanExecute');
		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			throw new Error(this.i18n.t('errors.noProvider'));
		}

		// Show initial streaming indicator with prompt preview
		this.plugin.debug('[PlanExecuteProcessor] About to show initial streaming indicator');
		this.streamingIndicatorManager.showStreamingIndicatorWithPrompt(this.i18n.t('planExecute.contentGeneration.preparing'), prompt);
		this.plugin.debug('[PlanExecuteProcessor] Initial streaming indicator should be shown');

		// Prepare initial messages for LLM (only add user prompt on first iteration)
		let currentMessages = [
			...this.conversationMessages,
			{
				id: Date.now().toString(),
				role: 'user' as const,
				content: prompt,
				timestamp: Date.now()
			}
		];

		let isCompleted = false;
		let iterationCount = 0;
		const maxIterations = 10; // Prevent infinite loops
		let lastResponse = ''; // Track the assistant's response for injection

		while (!isCompleted && iterationCount < maxIterations) {
			// Check if plan-execute has been aborted
			if (this.isAborted || this.abortController?.signal.aborted) {
				Logger.debug('Plan-Execute flow aborted by user');
				this.streamingIndicatorManager.hideStreamingIndicator();
				return;
			}

			// CRITICAL: Wait for any ongoing tool execution to complete before starting new iteration
			while (this.isExecutingTool) {
				Logger.debug('Tool still executing, waiting for completion...');
				this.streamingIndicatorManager.showStreamingIndicator(this.i18n.t('planExecute.toolExecution.executingTool', { toolName: 'execution' }));
				await new Promise(resolve => setTimeout(resolve, 500));
				// Double check abort signal during waiting
				if (this.isAborted || this.abortController?.signal.aborted) {
					Logger.debug('Plan-Execute flow aborted during tool execution wait');
					this.streamingIndicatorManager.hideStreamingIndicator();
					return;
				}
			}

			// Only increment iteration count if we're starting a new actual iteration
			iterationCount++;

			this.buffer = '';
			this.currentPhase = null;
			// Don't reset currentToolIndicator - let it persist across tool calls in same response
			let hasProcessedPhase = false;
			lastResponse = ''; // Reset for this iteration

			Logger.debug(`Starting iteration ${iterationCount}/${maxIterations}`);
			Logger.debug(`Current conversation length: ${currentMessages.length}`);
			Logger.debug(`Current streaming state: finalAnswer=${!!this.currentFinalAnswerMessage}, isExecutingTool=${this.isExecutingTool}`);

			// Update streaming indicator for current iteration
			if (iterationCount === 1) {
				// For first iteration, just update the existing indicator message (already has prompt)
				this.streamingIndicatorManager.updateStreamingIndicator(`正在进行第 ${iterationCount} 轮分析...`);
			} else {
				// For subsequent iterations, show more specific message
				this.streamingIndicatorManager.showStreamingIndicatorWithResponse(`正在基于工具结果进行第 ${iterationCount} 轮分析...`, lastResponse || '');
			}

			// Add a small delay before sending request to show the iteration message
			await new Promise(resolve => setTimeout(resolve, 300));

			// DEBUG: Show current conversation state for non-first iterations
			let promptForDebug = '';
			if (iterationCount > 1) {
				// For subsequent iterations, show the conversation context
				const lastUserMessage = currentMessages.filter(msg => msg.role === 'user').pop();
				const lastAssistantMessage = currentMessages.filter(msg => msg.role === 'assistant').pop();

				promptForDebug = `最新对话上下文:\n`;
				if (lastAssistantMessage) {
					promptForDebug += `助手: ${typeof lastAssistantMessage.content === 'string' ? lastAssistantMessage.content.substring(0, 200) + '...' : '[非文本内容]'}\n`;
				}
				if (lastUserMessage && lastUserMessage.metadata?.isSystemMessage) {
					promptForDebug += `系统提醒: ${typeof lastUserMessage.content === 'string' ? lastUserMessage.content.substring(0, 200) + '...' : '[非文本内容]'}`;
				}
			}

			try {
				// Update streaming indicator with prompt info for non-first iterations
				if (iterationCount > 1 && promptForDebug) {
					this.streamingIndicatorManager.showStreamingIndicatorWithIterationPrompt(`正在进行第 ${iterationCount} 轮分析...`, promptForDebug);
				}

				// Log detailed model interaction request
				Logger.debug(`========== MODEL INTERACTION ${iterationCount} START ==========`);
				Logger.debug(`REQUEST to Model:`, {
					iteration: iterationCount,
					messagesCount: currentMessages.length,
					timestamp: new Date().toISOString(),
					provider: provider.constructor.name,
					conversationSummary: currentMessages.map((msg, idx) => ({
						index: idx,
						role: msg.role,
						contentLength: typeof msg.content === 'string' ? msg.content.length : 0,
						contentPreview: typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : '[非文本内容]',
						phase: msg.metadata?.phase,
						timestamp: new Date(msg.timestamp).toISOString()
					}))
				});

				// Log full conversation for debugging (especially for iteration > 1)
				if (iterationCount > 1) {
					Logger.debug(`FULL CONVERSATION for iteration ${iterationCount}:`);
					currentMessages.forEach((msg, idx) => {
						Logger.debug(`Message ${idx}:`, {
							role: msg.role,
							contentLength: typeof msg.content === 'string' ? msg.content.length : 0,
							fullContent: typeof msg.content === 'string' ? msg.content : '[非文本内容]',
							phase: msg.metadata?.phase,
							isSystemMessage: msg.metadata?.isSystemMessage
						});
					});
				}

				// Stream response from LLM with current conversation state
				await provider.sendStreamingMessage(currentMessages, (chunk) => {
					// Check for abort signal during streaming
					if (this.abortController?.signal.aborted || this.isAborted) {
						return; // Stop processing chunks
					}

					if (chunk.delta) {
						this.buffer += chunk.delta;
						lastResponse += chunk.delta; // Accumulate the response

						// Update streaming indicator with real-time response
						this.streamingIndicatorManager.updateStreamingResponse(lastResponse);

						const previousPhase = this.currentPhase;
						this.processStreamingChunk();
						if (this.currentPhase && this.currentPhase !== previousPhase) {
							Logger.debug(`PHASE CHANGE (iteration ${iterationCount}):`, {
								from: previousPhase,
								to: this.currentPhase,
								bufferLength: this.buffer.length,
								timestamp: new Date().toISOString()
							});
							hasProcessedPhase = true;
							// Hide streaming indicator when phase changes
							this.streamingIndicatorManager.hideStreamingIndicator();
						}
					}
				}, this.abortController?.signal);

				// Log detailed model interaction response
				Logger.debug(`RESPONSE from Model:`, {
					iteration: iterationCount,
					responseLength: lastResponse.length,
					timestamp: new Date().toISOString(),
					responsePreview: lastResponse.substring(0, 200) + '...',
					currentPhase: this.currentPhase,
					bufferLength: this.buffer.length,
					isExecutingTool: this.isExecutingTool
				});
				Logger.debug(`========== MODEL INTERACTION ${iterationCount} END ==========`);

				// After streaming completes, inject the assistant's response into conversation
				if (lastResponse.trim()) {
					// Show indicator for injecting response
					this.streamingIndicatorManager.showStreamingIndicator(this.i18n.t('common.processingResponse'));

					currentMessages.push({
						id: Date.now().toString(),
						role: 'assistant',
						content: lastResponse.trim(),
						timestamp: Date.now(),
						metadata: {
							phase: this.currentPhase || undefined
						}
					});
					Logger.debug(`Injected assistant response into conversation (iteration ${iterationCount})`);

					// Small delay to show the processing indicator
					await new Promise(resolve => setTimeout(resolve, 300));
				} else {
					Logger.warn(`Empty response received in iteration ${iterationCount}`);

					// Show indicator for empty response handling
					this.streamingIndicatorManager.updateStreamingIndicator(`第${iterationCount}次迭代收到空响应，正在分析状态...`);

					// Check if we have any pending tool execution or final answer
					const lastMessage = this.conversationMessages[this.conversationMessages.length - 1];
					const hasRecentObservation = lastMessage && lastMessage.metadata?.phase === 'observation';

					// If we have a recent observation, try to prompt for final answer
					if (hasRecentObservation && iterationCount <= 3) {
						Logger.debug('Recent observation found, prompting for final answer');
						this.streamingIndicatorManager.updateStreamingIndicator('检测到工具执行结果，等待最终答案...');

						// Add a message to prompt for final answer
						const finalPrompt: ChatMessage = {
							id: `final-prompt-${Date.now()}`,
							role: 'user',
							content: '请基于上述工具执行结果，提供你的最终答案。请使用 <final_answer>...</final_answer> 标签包装你的回答。',
							timestamp: Date.now(),
							metadata: {
								phase: 'final_answer',
								isPlanExecuteMode: true
							}
						};

						currentMessages.push(finalPrompt);
						this.conversationMessages.push(finalPrompt);
						Logger.debug('Added final answer prompt, continuing iteration');

						// Continue to next iteration instead of stopping
						continue;
					}

					// Handle empty response - this might indicate an error or completion
					if (iterationCount > 3) {
						// If we've tried multiple times and got empty response, stop
						Logger.warn('Multiple empty responses after 3 iterations, stopping to prevent infinite loop');
						this.streamingIndicatorManager.updateStreamingIndicator('多次空响应，流程结束');
						// Give time to show the message, then hide
						setTimeout(() => {
							this.streamingIndicatorManager.hideStreamingIndicator();
						}, 2000);
						isCompleted = true;
					} else {
						// Show waiting indicator for next attempt
						this.streamingIndicatorManager.updateStreamingIndicator(`第${iterationCount}次空响应，等待下次尝试...`);
					}
				}

				// Check completion conditions
				if (this.currentPhase === 'final_answer') {
					Logger.debug('Reached final answer, completing');
					this.streamingIndicatorManager.hideStreamingIndicator();
					isCompleted = true;
				} else if (this.currentFinalAnswerMessage && !this.currentFinalAnswerMessage.metadata?.isStreaming) {
					// Final answer streaming has completed
					Logger.debug('Final answer streaming completed, marking as done');
					this.currentPhase = 'final_answer';
					this.streamingIndicatorManager.hideStreamingIndicator();
					isCompleted = true;
				} else if (this.currentPhase === 'action' && !this.isExecutingTool) {
					// Tool execution just completed, observation should be in conversationMessages
					// Update currentMessages to include the latest conversation state
					currentMessages = [...this.conversationMessages];
					Logger.debug('Tool execution completed, updated conversation with observation');
					// Show streaming indicator for next iteration
					this.streamingIndicatorManager.showStreamingIndicator('等待下一步分析...');
				} else if (!hasProcessedPhase && this.buffer.trim() === '') {
					// If no valid phase was detected and buffer is empty, check current state
					Logger.warn('No valid phase detected and buffer is empty');
					Logger.debug('Current conversation state:', {
						conversationLength: this.conversationMessages.length,
						lastMessagePhase: this.conversationMessages[this.conversationMessages.length - 1]?.metadata?.phase,
						iterationCount,
						currentPhase: this.currentPhase
					});

					// If we have recent observations but no final answer, try one more time
					const hasRecentObservation = this.conversationMessages.some(msg =>
						msg.metadata?.phase === 'observation' &&
						(Date.now() - msg.timestamp) < 30000 // Within last 30 seconds
					);

					if (hasRecentObservation && iterationCount <= 3) {
						Logger.debug('Found recent observation, prompting for final answer');
						this.streamingIndicatorManager.updateStreamingIndicator(this.i18n.t('planExecute.answerGeneration.guidingFinalAnswer'));

						// Add explicit prompt for final answer
						const finalAnswerPrompt: ChatMessage = {
							id: `final-answer-prompt-${Date.now()}`,
							role: 'user',
							content: '根据以上工具执行的结果，请提供最终答案。请严格使用以下格式：\n\n<final_answer>\n[你的最终答案内容]\n</final_answer>',
							timestamp: Date.now(),
							metadata: {
								phase: 'final_answer',
								isPlanExecuteMode: true
							}
						};

						currentMessages.push(finalAnswerPrompt);
						this.conversationMessages.push(finalAnswerPrompt);
						Logger.debug('Added explicit final answer prompt');

						// Continue instead of stopping
						continue;
					}

					// If no recent observations or too many iterations, stop
					this.streamingIndicatorManager.updateStreamingIndicator('未检测到有效阶段且缓冲区为空，流程结束');
					setTimeout(() => {
						this.streamingIndicatorManager.hideStreamingIndicator();
					}, 2000);
					isCompleted = true;
				} else if (!hasProcessedPhase) {
					// If no valid phase was detected but buffer has content, continue (might be partial content)
					Logger.warn('No valid phase detected but buffer has content, continuing');
					Logger.debug('Current buffer content:', this.buffer.substring(0, 200) + '...');
					// Update streaming indicator to show waiting for more content
					this.streamingIndicatorManager.updateStreamingIndicator('等待更多数据...');
					// Add a small timeout to prevent busy waiting
					await new Promise(resolve => setTimeout(resolve, 100));
				} else if (this.currentPhase === 'observation') {
					// Observation was already injected by processAction, update conversation
					this.streamingIndicatorManager.showStreamingIndicator('正在分析工具执行结果...');
					Logger.debug('Updating currentMessages with conversationMessages for observation phase');
					Logger.debug('conversationMessages length:', this.conversationMessages.length);
					const lastMessage = this.conversationMessages[this.conversationMessages.length - 1];
					const lastContent = lastMessage?.content;
					const lastContentPreview = typeof lastContent === 'string' ? lastContent.substring(0, 150) + '...' : 'Non-string content';
					Logger.debug('Last message in conversationMessages:', lastContentPreview);
					currentMessages = [...this.conversationMessages];
					Logger.debug('currentMessages updated, length:', currentMessages.length);
					Logger.debug('Observation completed, continuing to next iteration');
					// Add delay to show processing and prepare for next analysis
					await new Promise(resolve => setTimeout(resolve, 600));
					// Show streaming indicator for next iteration with more specific message
					this.streamingIndicatorManager.updateStreamingIndicator('正在基于工具结果继续分析...');
					// Additional delay before starting next iteration
					await new Promise(resolve => setTimeout(resolve, 400));
				} else {
					// Other phases detected but not final or action, continue
					Logger.debug(`Phase '${this.currentPhase}' detected, continuing`);
					// Show specific streaming indicator based on phase
					if (this.currentPhase === 'thought') {
						this.streamingIndicatorManager.showStreamingIndicator('正在等待思考结果...');
					} else if (this.currentPhase === 'plan') {
						this.streamingIndicatorManager.showStreamingIndicator('正在生成执行计划...');
					} else {
						this.streamingIndicatorManager.showStreamingIndicator('继续分析...');
					}
				}

			} catch (error) {
				Logger.error('Error in streaming:', error);
				// Display error and stop
				this.streamingIndicatorManager.hideStreamingIndicator();
				this.streamingIndicatorManager.displayPhase(this.i18n.t('planExecute.contentGeneration.error'), `${this.i18n.t('errors.executionError')}: ${error instanceof Error ? error.message : this.i18n.t('errors.unknownError')}`, SvgIcons.alertCircle());
				isCompleted = true;
			}
		}

		// Update the main conversation state with final results
		this.conversationMessages = currentMessages;

		// Ensure streaming indicator is hidden
		this.streamingIndicatorManager.hideStreamingIndicator();

		// Check if we hit max iterations
		if (iterationCount >= maxIterations) {
			Logger.warn('Reached maximum iterations, stopping to prevent infinite loop');
			this.streamingIndicatorManager.displayPhase(this.i18n.t('common.unknown'), this.i18n.t('planExecute.maxIterationsReached'), '⚠️');
		}
	}

	/**
	 * Process incoming streaming chunks and detect XML tags
	 */
	private processStreamingChunk(): void {
		// First check for streaming final_answer content
		this.processStreamingFinalAnswer();

		// Check for complete XML tags in buffer
		const tagPatterns = [
			{ tag: 'question', pattern: /<question>([\s\S]*?)<\/question>/ },
			{ tag: 'plan', pattern: /<plan>([\s\S]*?)<\/plan>/ },
			{ tag: 'thought', pattern: /<thought>([\s\S]*?)<\/thought>/ },
			{ tag: 'action', pattern: /<action(?:\s+[^>]*)?>(\s*[\s\S]*?)<\/action>/, requiresCompleteContent: true },
			{ tag: 'observation', pattern: /<observation>([\s\S]*?)<\/observation>/ },
			{ tag: 'final_answer', pattern: /<final_answer>([\s\S]*?)<\/final_answer>/ }
		];

		for (const { tag, pattern, requiresCompleteContent } of tagPatterns) {
			const match = this.buffer.match(pattern);
			if (match) {
				const content = match[1].trim();

				// Handle observation tags - allow all observations to be processed
				if (tag === 'observation') {
					Logger.debug('Processing observation:', content.substring(0, 200) + '...');
					// Process the observation normally
					this.processPhase(tag as any, content);
					this.currentPhase = tag as any;
					this.buffer = this.buffer.replace(pattern, '');
					break;
				}

				// Skip final_answer if already being processed as streaming
				if (tag === 'final_answer' && this.currentFinalAnswerMessage) {
					Logger.debug('Skipping complete final_answer as streaming is active');
					// Remove processed content from buffer but don't display
					this.buffer = this.buffer.replace(pattern, '');
					continue;
				}

				// Special handling for action tags - ensure MCP content is complete
				if (requiresCompleteContent && tag === 'action') {
					if (!this.isActionContentComplete(content)) {
						Logger.debug(`Action content incomplete, waiting for more data...`);
						continue; // Skip processing this action until it's complete
					}
				}

				Logger.debug(`Detected complete ${tag}:`, content.substring(0, 100) + '...');

				// Process the detected phase
				this.processPhase(tag as any, content);

				// Update current phase
				this.currentPhase = tag as any;

				// Remove processed content from buffer
				this.buffer = this.buffer.replace(pattern, '');
				break;
			}
		}
	}

	/**
	 * Process streaming final_answer content
	 */
	private processStreamingFinalAnswer(): void {
		const result = AnswerGeneratorUtils.processStreamingFinalAnswer(
			this.buffer,
			this.currentFinalAnswerMessage,
			this.i18n,
			this.streamingIndicatorManager,
			this.onFinalAnswerCallback,
			() => {
				this.initializeFinalAnswerMessage();
				return this.currentFinalAnswerMessage!;
			}
		);

		if (result.shouldInitialize) {
			this.streamingIndicatorManager.hideStreamingIndicator();
			this.initializeFinalAnswerMessage();
		}

		if (result.shouldUpdate) {
			const currentContent = this.extractCurrentFinalAnswerContent();
			if (currentContent !== null) {
				this.updateFinalAnswerContent(currentContent);
			}
		}

		if (result.shouldFinalize && result.finalContent) {
			this.finalizeFinalAnswerMessage(result.finalContent);
			if (result.newBuffer !== undefined) {
				this.buffer = result.newBuffer;
			}
		}
	}

	/**
	 * Initialize streaming final answer message
	 */
	private initializeFinalAnswerMessage(): void {
		this.currentFinalAnswerMessage = AnswerGeneratorUtils.initializeFinalAnswerMessage(
			this.planTasks,
			this.i18n,
			this.streamingIndicatorManager
		);

		// Notify callback that final answer started
		if (this.onFinalAnswerCallback && this.currentFinalAnswerMessage) {
			this.onFinalAnswerCallback(this.currentFinalAnswerMessage);
		}
	}

	/**
	 * Extract current final answer content from buffer
	 */
	private extractCurrentFinalAnswerContent(): string | null {
		return AnswerGeneratorUtils.extractCurrentFinalAnswerContent(this.buffer);
	}

	/**
	 * Update final answer content during streaming
	 */
	private updateFinalAnswerContent(newContent: string): void {
		AnswerGeneratorUtils.updateFinalAnswerContent(
			this.currentFinalAnswerMessage,
			newContent,
			this.i18n,
			this.streamingIndicatorManager,
			this.onFinalAnswerCallback
		);
	}

	/**
	 * Finalize final answer message
	 */
	private finalizeFinalAnswerMessage(finalContent: string): void {
		const result = AnswerGeneratorUtils.finalizeFinalAnswerMessage(
			this.currentFinalAnswerMessage,
			finalContent,
			this.conversationMessages,
			this.streamingIndicatorManager,
			this.onFinalAnswerCallback
		);
		
		// Update instance state
		this.conversationMessages = result.updatedConversationMessages;
		this.currentPhase = result.currentPhase;
		
		// Reset streaming state
		this.currentFinalAnswerMessage = null;
		this.finalAnswerElement = null;
	}

	/**
	 * Check if action content contains complete MCP tool call
	 */
	private isActionContentComplete(actionContent: string): boolean {
		return ActionValidatorUtils.isActionContentComplete(
			actionContent,
			this.incompleteActionChecks,
			(message) => this.streamingIndicatorManager.showStreamingIndicator(message),
			(message) => this.streamingIndicatorManager.updateStreamingIndicator(message),
			() => this.streamingIndicatorManager.hideStreamingIndicator()
		);
	}

	/**
	 * Process different phases of Plan-Execute
	 */
	private async processPhase(phase: 'question' | 'plan' | 'thought' | 'action' | 'observation' | 'final_answer', content: string): Promise<void> {
		switch (phase) {
			case 'question':
				this.streamingIndicatorManager.displayPhase('Question', content, '❓');
				break;

			case 'plan':
				this.displayPlanAsTodoList(content);
				break;

			case 'thought':
				this.streamingIndicatorManager.displayPhase('Thought', content, '💭');
				break;

			case 'action':
				await this.processAction(content);
				break;

			case 'observation':
				this.streamingIndicatorManager.displayPhase('Observation', content, '👁️');
				break;

			case 'final_answer':
				// Final answer is now handled by streaming logic in processStreamingFinalAnswer
				// This case should not be reached due to the skip logic in processStreamingChunk
				Logger.debug('final_answer phase reached in processPhase - this should be handled by streaming');
				break;
		}
	}

	/**
	 * Process action phase - execute tools and inject observation
	 */
	private async processAction(actionContent: string): Promise<void> {
		try {
			// ===== LOG ACTION PROCESSING FOR DEBUGGING =====
			Logger.debug('='.repeat(80));
			Logger.debug('🔍 PROCESSING ACTION - Step Execution');
			Logger.debug('='.repeat(80));
			Logger.debug('[Action Content]');
			Logger.debug(actionContent);
			Logger.debug('');
			Logger.debug('[Execution Context]');
			Logger.debug('  isPlanGenerationPhase:', this.isPlanGenerationPhase);
			Logger.debug('  isExecutingTool:', this.isExecutingTool);
			Logger.debug('  currentStepIndex:', this.currentStepIndex);
			Logger.debug('  totalSteps:', this.planSteps.length);
			Logger.debug('  executionResults count:', this.executionResults.length);
			Logger.debug('='.repeat(80));
			// ===== END LOG =====
			
			// Skip action execution during plan generation phase
			if (this.isPlanGenerationPhase) {
				Logger.debug('Skipping action execution during plan generation phase');
				return;
			}

			// Extract step_id from action content using ActionProcessorUtils
			const { stepId, stepIndex: extractedStepIndex } = ActionProcessorUtils.extractStepId(
				actionContent,
				this.currentStepIndex,
				this.planSteps
			);
			
			let stepIndex = extractedStepIndex;
			if (stepIndex >= 0) {
				this.currentStepIndex = stepIndex;
			}

			// Show indicator for parsing action
			this.streamingIndicatorManager.showStreamingIndicator(this.i18n.t('planExecute.contentGeneration.parseParameters'));

			Logger.debug('Processing complete action content:', JSON.stringify(actionContent));
			Logger.debug('Action content length:', actionContent.length);

			// Parse action content using ActionProcessorUtils
			let { toolName, args } = ActionProcessorUtils.parseActionContent(
				actionContent,
				(json: string) => this.sanitizeJSONString(json),
				(content: string) => this.parseIncompleteMCP(content),
				this.currentStepIndex,
				this.planSteps,
				this.i18n
			);

			// Show indicator for tool preparation (only if not using planTracker)
			if (!this.planTracker) {
				this.streamingIndicatorManager.updateStreamingIndicator(`${this.i18n.t('status.preparingTool')}: ${toolName}...`);
				// Small delay to show the preparation step
				await new Promise(resolve => setTimeout(resolve, 200));
			}

			Logger.debug('Executing action:', { toolName, args });

			// Normalize file paths in arguments for file-related tools
			args = this.normalizeFilePathsInInput(toolName, args);
			Logger.debug('After path normalization:', { toolName, args });

			// Clean tool arguments (remove line numbers, intro text, etc.)
			args = this.cleanToolArguments(toolName, args);
			Logger.debug('After argument cleaning:', { toolName, args });

			// Create tool indicator for Guided Mode style display
			if (!this.currentToolIndicator) {
				this.currentToolIndicator = this.streamingIndicatorManager.createToolIndicator();
			}
			
			// Phase 1: Show intent
			this.streamingIndicatorManager.updateToolIndicator('intent', toolName, args);
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Phase 2: Show executing
			this.streamingIndicatorManager.updateToolIndicator('executing', toolName, args);

			// Also update step progress indicator to show tool execution
			if (this.currentStepProgressIndicator) {
				this.updateStepProgressIndicator(this.currentStepProgressIndicator, 'executing', `${SvgIcons.zap()} ${this.i18n.t('status.executingTool')}: ${toolName}...`);
			}

			// Record tool call request
			const recordId = this.toolExecutionManager.recordToolCallRequest(
				toolName,
				args || {},
				undefined,
				undefined,
				'system'
			);

			this.toolExecutionManager.markToolCallExecuting(recordId);

			// Execute the tool
			this.isExecutingTool = true;
			let result;
			let executionError: Error | null = null;

			try {
				Logger.debug('Starting tool execution (sequential mode)');
				result = await this.executeTool(toolName, args || {});
				Logger.debug('Tool execution completed successfully');
			} catch (toolError) {
				executionError = toolError instanceof Error ? toolError : new Error(String(toolError));
				Logger.error('Tool execution failed:', toolError);
			} finally {
				// CRITICAL: Always mark tool execution as completed in finally block
				this.isExecutingTool = false;
				Logger.debug('Tool execution state reset (isExecutingTool = false)');
			}

		// Record tool call response (success or failure)
		// Check if tool execution failed at any point
		const hasExecutionError = executionError || (result && result.success === false);
		
		if (hasExecutionError) {
			const errorMessage = executionError 
				? (executionError instanceof Error ? executionError.message : 'Unknown error')
				: (result?.error || result?.message || 'Tool execution failed');
			
			this.toolExecutionManager.recordToolCallResponse(recordId, null, errorMessage);
			
			// Ensure executionError is set for consistent error handling
			if (!executionError) {
				executionError = new Error(errorMessage);
			}
			
			Logger.debug('Tool execution failed:', { success: result?.success, error: errorMessage });
			
			// Create error observation using ActionProcessorUtils
			const { observation, guidedObservation } = ActionProcessorUtils.createErrorObservation(
				toolName,
				errorMessage,
				this.i18n
			);

			// Add tool call error to task if using NEW tracker
			if (this.planTracker && this.planTasks.length > 0) {
				const task = this.planTasks.find(t => t.id === stepId);
				if (task) {
					const toolCallInfo: ToolCall = {
						id: recordId,
						toolName: toolName,
						toolType: 'builtin',
						parameters: args,
						error: errorMessage,
						timestamp: new Date().toISOString(),
						duration: 0
					};
					
					if (!task.toolCalls) {
						task.toolCalls = [];
					}
					task.toolCalls.push(toolCallInfo);
					
					// Change task status to 'error' to trigger error buttons
					task.status = 'error';
					Logger.debug('⚠️ Set task status to ERROR due to tool failure');
					
					// CRITICAL: Save error info to stepFailureInfo for later regeneration
					// This ensures error details persist even after pendingToolFailure is resolved
					if (stepId && executionError) {
						this.stepFailureInfo.set(stepId, executionError);
						Logger.debug('💾 Saved tool execution error to stepFailureInfo for step:', stepId);
					}
					
					// Update tracker to show tool call error
					this.updatePlanTracker();
					
					Logger.debug('Added tool call error to task:', { taskId: stepId, toolName, error: errorMessage });
				}
			}

			// Update tool indicator to show error with retry/skip buttons
			this.streamingIndicatorManager.updateToolIndicator('error', toolName, args, guidedObservation);
			Logger.debug('Tool execution failed, showing retry/skip/regenerate options');
			Logger.debug('About to create pendingToolFailure and wait for user decision...');

			// Update step progress indicator to show failure
			if (this.currentStepProgressIndicator) {
				this.updateStepProgressIndicator(this.currentStepProgressIndicator, 'failed', errorMessage, guidedObservation, toolName);
			}

			// Wait for user decision (retry, regenerate, or skip)
			Logger.debug('Creating Promise to wait for user decision...');
			const userDecision = await new Promise<'retry' | 'regenerate' | 'skip'>((resolve) => {
				this.pendingToolFailure = {
					toolName,
					args,
					error: executionError!,
					stepId: stepId || '',
					stepIndex,
					resolve
				};
				Logger.debug('pendingToolFailure created:', {
					toolName,
					stepId: stepId || '',
					hasResolve: !!resolve
				});
			});

			Logger.debug('User decision received:', userDecision);
			
			// Clear pending failure
			this.pendingToolFailure = null;

			if (userDecision === 'retry') {
				// User chose to retry - recursively call processAction with same content
				Logger.debug('Retrying tool execution:', toolName);
				return await this.processAction(actionContent);
			} else if (userDecision === 'regenerate') {
				// User chose to regenerate step using AI
				Logger.debug('Regenerating step with AI:', stepId);
				
				// Update step progress indicator
				if (this.currentStepProgressIndicator) {
					this.updateStepProgressIndicator(
						this.currentStepProgressIndicator,
						'preparing',
						this.i18n.t('planExecute.placeholderError.retrying')
					);
				}
				
				try {
					// Find the step in planSteps
					const step = this.planSteps.find(s => s.step_id === stepId);
					if (!step) {
						throw new Error(`Step ${stepId || 'unknown'} not found in plan`);
					}
					
					// Create a PlaceholderReplacementError-like error for regeneration context
					const regenerationError = new PlaceholderReplacementError(
						errorMessage,
						'', // No specific placeholder
						[],
						toolName,
						stepId || 'unknown'
					);
					regenerationError.name = 'ToolExecutionError';
					
					// Call regenerateStep
					const regeneratedStep = await this.regenerateStep(step, stepIndex, regenerationError);
					
					Logger.debug('Step regenerated successfully:', regeneratedStep);
					
					// Update the step in planSteps array
					this.planSteps[stepIndex] = regeneratedStep;
					
					// Update step progress indicator
					if (this.currentStepProgressIndicator) {
						this.updateStepProgressIndicator(
							this.currentStepProgressIndicator,
							'preparing',
							'✅ 步骤已重新生成，准备执行...'
						);
					}
					
					// Process the regenerated step
					const regeneratedContent = `\n<tool_call>\n${JSON.stringify({
						tool: regeneratedStep.tool,
						input: regeneratedStep.input
					}, null, 2)}\n</tool_call>\n`;
					
					return await this.processAction(regeneratedContent);
					
				} catch (regenerationError) {
					Logger.error('Step regeneration failed:', regenerationError);
					
					if (this.currentStepProgressIndicator) {
						this.updateStepProgressIndicator(
							this.currentStepProgressIndicator,
							'failed',
							`❌ 重新生成失败: ${regenerationError instanceof Error ? regenerationError.message : String(regenerationError)}`
						);
					}
					
					// Mark as failed and continue
					if (stepId) {
						this.markStepFailed(stepId, errorMessage, guidedObservation);
					}
					
					// Record failed execution
					this.executionResults.push({
						step_id: stepId,
						step_index: stepIndex,
						tool_name: toolName,
						tool_args: args,
						tool_result: result,
						tool_error: errorMessage,
						observation: guidedObservation,
						step_reason: this.planSteps[stepIndex]?.reason || '', // Include step purpose
						success: false,
						timestamp: Date.now()
					});
					
					return;
				}
		} else {
			// User chose to skip - mark step as failed and continue
			Logger.debug('Skipping failed tool:', toolName);
			
			// Mark step as failed if we have step_id
			if (stepId) {
				this.markStepFailed(stepId, errorMessage, guidedObservation);
				Logger.debug('Marked step as failed and skipped:', stepId);
			}
			
			// Get previous successful result for potential fallback
			const lastSuccessResult = this.executionResults.find((r, idx) => {
				return idx < stepIndex && r.success === true;
			});
			
			// Record FAILED execution result with skipped flag for final answer generation
			const executionResult = {
				step_id: stepId,
				step_index: stepIndex,
				tool_name: toolName,
				tool_args: args,
				tool_result: {
					...result,
					skipped: true,
					previousResult: lastSuccessResult?.tool_result
				},
				tool_error: errorMessage,
				observation: guidedObservation,
				step_reason: this.planSteps[stepIndex]?.reason || '', // Include step purpose
				success: false, // IMPORTANT: Mark as failed
				timestamp: Date.now()
			};

			this.executionResults.push(executionResult);
			Logger.debug('Recorded SKIPPED execution result:', executionResult);				// Create structured system message for tool result
				const structuredSystemMessage = this.structuredPromptManager.createStructuredToolResultMessage(
					stepId || `step_${stepIndex}`,
					toolName,
					result,
					'error',
					guidedObservation
				);

				// Add structured system message to conversation
				this.conversationMessages.push(structuredSystemMessage);

				// Advance to next step in structured prompt manager
				this.structuredPromptManager.nextStep();

				// Inject observation back to conversation for context
				const observationMessage: ChatMessage = {
					id: Date.now().toString(),
					role: 'assistant' as const,
					content: `<observation>${guidedObservation}</observation>`,
					timestamp: Date.now(),
					metadata: {
						phase: 'observation',
						toolName: toolName,
						toolResult: result,
						toolError: errorMessage
					}
				};

				this.conversationMessages.push(observationMessage);
				this.streamingIndicatorManager.hideStreamingIndicator();

				// Clear the current tool indicator
				this.currentToolIndicator = null;

				// Don't throw error - continue with next step
				return;
			}
		}
		
		// Tool execution succeeded - record success response
		this.toolExecutionManager.recordToolCallResponse(recordId, result);
		Logger.debug('Tool execution succeeded:', { success: result?.success });

		// Phase 3: 👁️ 调用结果 - Tool succeeded, display observation
		let observation = this.formatToolResult(result);
		Logger.debug('Tool execution was successful, displaying result:', observation.substring(0, 200) + '...');

		// Tool execution was successful
		Logger.debug('===== Tool execution succeeded =====');
		Logger.debug('Tool name:', toolName);
		Logger.debug('Step ID:', stepId);
		Logger.debug('Observation preview:', observation.substring(0, 200) + '...');
		
		// Add tool call to task if using NEW tracker
		if (this.planTracker && this.planTasks.length > 0) {
			const task = this.planTasks.find(t => t.id === stepId);
			if (task) {
				const toolCallInfo: ToolCall = {
					id: recordId,
					toolName: toolName,
					toolType: 'builtin', // Determine actual type from tool manager
					parameters: args,
					response: result,
					timestamp: new Date().toISOString(),
					duration: 0 // Will be updated by toolExecutionManager
				};
				
				if (!task.toolCalls) {
					task.toolCalls = [];
				}
				task.toolCalls.push(toolCallInfo);
				
				// Update tracker to show tool call
				this.updatePlanTracker();
				
				Logger.debug('Added tool call to task:', { taskId: stepId, toolName, toolCallsCount: task.toolCalls.length });
			}
		}
		
		this.streamingIndicatorManager.updateToolIndicator('success', toolName, args, observation);

		// CRITICAL: First record the execution result BEFORE marking as completed
		// This ensures the result is available before any UI updates
		const executionResult = {
			step_id: stepId,
			step_index: stepIndex,
			tool_name: toolName,
			tool_args: args,
			tool_result: result,
			tool_error: null, // No error for successful execution
			observation: observation,
			step_reason: this.planSteps[stepIndex]?.reason || '', // Include step purpose for final answer
			success: true, // IMPORTANT: Mark as successful
			timestamp: Date.now()
		};

		this.executionResults.push(executionResult);
		Logger.debug('Recorded SUCCESSFUL execution result:', executionResult);

		// CRITICAL: Small delay to ensure UI thread processes any pending updates
		await new Promise(resolve => setTimeout(resolve, 100));

		// Update step progress indicator to show success
		if (this.currentStepProgressIndicator) {
			Logger.debug('Updating step progress indicator to completed');
			this.updateStepProgressIndicator(this.currentStepProgressIndicator, 'completed', `${this.i18n.t('planExecute.status.completed')}: ${toolName}`, observation, toolName);
		} else {
			Logger.warn('No current step progress indicator found');
		}

		// CRITICAL: Another small delay to ensure progress indicator update is rendered
		await new Promise(resolve => setTimeout(resolve, 100));

		// NOTE: Step completion is now handled in executeStepAndWaitForCompletion
		// to ensure proper sequencing after tool execution is fully done
		Logger.debug('Tool execution completed for stepId:', stepId);
		Logger.debug('Step completion will be marked by executeStepAndWaitForCompletion');

		// Create structured system message for tool result
		const structuredSystemMessage = this.structuredPromptManager.createStructuredToolResultMessage(
			stepId || `step_${stepIndex}`,
			toolName,
			result,
			'success',
			observation
		);

		// Add structured system message to conversation
		this.conversationMessages.push(structuredSystemMessage);

		// Advance to next step in structured prompt manager
		this.structuredPromptManager.nextStep();

		// Inject observation back to conversation for context
		this.streamingIndicatorManager.showStreamingIndicator(this.i18n.t('planExecute.contentGeneration.analyzing'));
		await new Promise(resolve => setTimeout(resolve, 200));

		const observationMessage: ChatMessage = {
			id: Date.now().toString(),
			role: 'assistant' as const,
			content: `<observation>${observation}</observation>`,
			timestamp: Date.now(),
			metadata: {
				phase: 'observation',
				toolName: toolName,
				toolResult: result,
				toolError: undefined // No error for successful execution
			}
		};

		this.conversationMessages.push(observationMessage);
		this.streamingIndicatorManager.hideStreamingIndicator();

		// Clear the current tool indicator and step progress (step is complete)
			this.currentToolIndicator = null;

		} catch (error) {
			Logger.error('Error in action processing:', error);

			// The error should already be handled by the step management logic
			// Just inject error observation to continue the conversation
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			this.conversationMessages.push({
				id: Date.now().toString(),
				role: 'assistant',
				content: `<observation>动作处理失败: ${errorMessage}</observation>`,
				timestamp: Date.now(),
				metadata: {
					phase: 'observation',
					error: errorMessage
				}
			});

			// Update phase to indicate observation is ready (isExecutingTool already set to false in finally block)
			this.currentPhase = 'observation';

			// Clear the current tool indicator
			this.currentToolIndicator = null;
			
			// CRITICAL: Re-throw the error to halt step execution
			// This ensures that when a step fails, subsequent steps are not executed
			throw error;
		}
	}

	/**
	 * Parse incomplete MCP format (handles streaming content that may be cut off)
	 */
	private parseIncompleteMCP(actionContent: string): { toolName: string; args: any } | null {
		Logger.debug('Attempting to parse incomplete MCP content:', actionContent.substring(0, 200) + '...');
		
		const result = FormatUtils.parseIncompleteMCP(actionContent);
		
		if (!result) {
			Logger.debug('No tool name found in incomplete content');
			return null;
		}
		
		Logger.debug('Successfully extracted from incomplete MCP:', result);
		return result;
	}

	/**
	 * Validate tool parameters before execution
	 */
	private async validateToolParameters(toolName: string, args: any): Promise<{valid: boolean, error?: string, suggestion?: string}> {
		return ToolExecutionUtils.validateToolParameters(
			toolName,
			args,
			() => this.plugin.getToolManager(),
			this.i18n
		);
	}

	/**
	 * Execute a single tool
	 */
	private async executeTool(toolName: string, args: any): Promise<any> {
		return ToolExecutionUtils.executeTool(
			toolName,
			args,
			() => this.plugin.getToolManager(),
			(toolName: string, args: any) => this.validateToolParameters(toolName, args)
		);
	}

	/**
	 * Format tool result for observation
	 */
	private formatToolResult(toolResult: any): string {
		return FormatUtils.formatToolResult(toolResult);
	}



	// UI indicator methods now delegated to StreamingIndicatorManager
	// Deleted: createToolIndicator, updateToolIndicator, displayPhase,
	// createSimplePlanGenerationIndicator, showStreamingIndicator variants,
	// updateStreamingIndicator variants, hideStreamingIndicator, cleanupAllStreamingIndicators
	// (~641 lines removed)

	/**
	 * Sanitize JSON string by removing/escaping problematic characters
	 */
	// JSON utility methods now delegated to JSONUtils
	private sanitizeJSONString(jsonStr: string): string {
		return JSONUtils.sanitizeJSONString(jsonStr);
	}

	private fixExtraClosingBraces(jsonStr: string): string {
		return JSONUtils.fixExtraClosingBraces(jsonStr);
	}

	private escapeNewlinesInJSONStrings(jsonStr: string): string {
		return JSONUtils.escapeNewlinesInJSONStrings(jsonStr);
	}

	/**
	 * Truncate text for preview display
	 */
	// Formatting utility methods now delegated to FormatUtils
	private truncateText(text: string, maxLength: number): string {
		return FormatUtils.truncateText(text, maxLength);
	}

	/**
	 * Format execution results for prompt generation
	 */
	private formatExecutionResultsForPrompt(): string {
		return FormatUtils.formatExecutionResultsForPrompt(this.executionResults, this.i18n);
	}

	/**
	 * Format output content for display in the collapsible section
	 */
	private formatOutputForDisplay(outputContent: string): string {
		return FormatUtils.formatOutputForDisplay(outputContent, this.i18n);
	}

	private formatParametersForDisplay(toolName: string, params: any): string {
		return FormatUtils.formatParametersForDisplay(toolName, params, this.i18n);
	}

	/**
	 * Create content generation indicator for visual progress with expandable real-time content
	 */
	private createContentGenerationIndicator(): HTMLElement {
		return ContentGenerationUIUtils.createContentGenerationIndicator(
			this.messageContainer,
			this.i18n
		);
	}
	
	/**
	 * Update content generation indicator with phase, message, and optional real-time content
	 */
	private updateContentGenerationIndicator(
		indicator: HTMLElement, 
		phase: 'parsing' | 'analyzing' | 'preparing' | 'connecting' | 'connected' | 'generating' | 'processing' | 'completed' | 'error',
		message: string,
		generatedContent?: string
	): void {
		ContentGenerationUIUtils.updateContentGenerationIndicator(
			indicator,
			phase,
			message,
			this.messageContainer,
			this.i18n,
			generatedContent
		);
	}

	/**
	 * Reset processor state
	 */
	reset(): void {
		this.currentPhase = null;
		this.currentExecutionPhase = 'plan';
		this.buffer = '';
		this.isExecutingTool = false;
		this.conversationMessages = [];
		this.currentToolIndicator = null;
		this.incompleteActionChecks.clear();

		// Reset Plan-Execute specific state
		this.executionResults = [];
		this.planSteps = [];
		this.currentStepIndex = 0;
		this.isManualStepManagement = false; // Reset manual step management mode

		// Reset structured prompt manager
		this.structuredPromptManager.reset();
		this.currentStepProgressIndicator = null; // Reset step progress indicator
		this.streamingIndicatorManager.setCurrentStepProgressIndicator(null); // Notify manager
		// Reset final answer streaming state
		this.currentFinalAnswerMessage = null;
		this.finalAnswerElement = null;
		this.onFinalAnswerCallback = null;
		// Reset streaming state
		this.streamingIndicatorManager.hideStreamingIndicator();
		this.isStreaming = false;
		// Reset abort state
		this.abortController = null;
		this.isAborted = false;
		// Reset token usage tracking
		this.stepTokenUsage.clear();

		// Force hide any remaining validation indicator during reset
		if (this.planCheckProcessor.isValidationIndicatorVisible()) {
			Logger.debug('Forcing cleanup of validation indicator during reset');
			this.planCheckProcessor.forceHideValidationIndicatorImmediate();
		}
	}

/**
 * Scroll to bottom of chat container - immediate scroll
 */
private scrollToBottom(): void {
const chatContainer = this.messageContainer.closest('.llmsider-chat-messages') as HTMLElement;
if (!chatContainer) return;

requestAnimationFrame(() => {
chatContainer.scrollTop = chatContainer.scrollHeight;
});
}

/**
 * Smooth scroll to bottom of chat container
 */
private scrollToBottomSmooth(): void {
const chatContainer = this.messageContainer.closest('.llmsider-chat-messages') as HTMLElement;
if (!chatContainer) return;

chatContainer.scrollTo({
top: chatContainer.scrollHeight,
behavior: 'smooth'
});
}

	/**
	 * Helper function to get nested property from object using path
	 */
	// Path utility methods now delegated to PathUtils
	private normalizeFilePath(path: string): string {
		return PathUtils.normalizeFilePath(path, this.plugin.app);
	}

	private normalizeFilePathsInInput(toolName: string, input: any): any {
		return PathUtils.normalizeFilePathsInInput(toolName, input, this.plugin.app);
	}

	/**
	 * Clean tool arguments to remove unwanted prefixes and formatting
	 * This is especially important for str_replace tool where old_str must match exactly
	 */
	private cleanToolArguments(toolName: string, input: any): any {
		return ToolExecutionUtils.cleanToolArguments(
			toolName,
			input,
			(content: string) => this.cleanGeneratedContent(content)
		);
	}

	/**
	 * Helper function to escape special regex characters
	 */
	private escapeRegExp(string: string): string {
		return FormatUtils.escapeRegExp(string);
	}

	/**
	 * Replace placeholders in input with actual values from execution results
	 * Supports format: {{step1.output.path}}, {{step2.result.data}}, etc.
	 */
	/**
	 * Recursively collect all field paths from an object
	 * Example: {a: {b: 1}, c: [1,2]} => ["a.b", "c[0]", "c[1]"]
	 */
	// Placeholder processing methods now delegated to PlaceholderUtils
	// These methods are kept as thin wrappers for backward compatibility
	
	private processWebContent(content: string, stepResult: any): string {
		return ContentCleaner.processWebContent(content);
	}

	/**
	 * Intelligently regenerate a step based on error type analysis
	 * Uses AI to determine if it should:
	 * 1. Fix parameter issues (parameter mismatch, validation errors)
	 * 2. Find alternative tools (API key missing, service unavailable)
	 */
	private async intelligentlyRegenerateStep(
		originalStep: any,
		stepIndex: number,
		error: Error
	): Promise<any> {
		return await StepRegenerationUtils.intelligentlyRegenerateStep(
			originalStep,
			stepIndex,
			error,
			this.executionResults,
			() => this.plugin.getActiveProvider(),
			() => this.plugin.toolManager,
			this.abortController?.signal
		);
	}

	/**
	 * Generate a step with fixed parameters
	 */
	private async generateFixedParameterStep(
		originalStep: any,
		stepIndex: number,
		error: Error,
		reasoning: string
	): Promise<any> {
		return await StepRegenerationUtils.generateFixedParameterStep(
			originalStep,
			stepIndex,
			error,
			reasoning,
			this.executionResults,
			() => this.plugin.getActiveProvider(),
			() => this.plugin.toolManager,
			this.abortController?.signal
		);
	}

	/**
	 * Generate a step using an alternative tool
	 */
	private async generateAlternativeStep(
		originalStep: any,
		stepIndex: number,
		alternativeTool: string,
		reasoning: string
	): Promise<any> {
		return await StepRegenerationUtils.generateAlternativeStep(
			originalStep,
			stepIndex,
			alternativeTool,
			reasoning,
			this.executionResults,
			() => this.plugin.getActiveProvider(),
			() => this.plugin.toolManager,
			this.abortController?.signal
		);
	}

	/**
	 * Regenerate a step that failed due to placeholder errors
	 * Calls AI to fix the step based on available fields and context
	 */
	private async regenerateStep(
		originalStep: any,
		stepIndex: number,
		error: PlaceholderReplacementError
	): Promise<any> {
		return await StepRegenerationUtils.regenerateStepForPlaceholderError(
			originalStep,
			stepIndex,
			error,
			this.executionResults,
			() => this.plugin.getActiveProvider(),
			this.abortController?.signal
		);
	}
}
