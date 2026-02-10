// Structured Prompt Manager for Agent Mode
// Handles preservation of original user intent and structured tool results

import { ChatMessage } from '../types';
import { Logger } from './../utils/logger';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';

export interface StructuredUserPrompt {
  originalIntent: string;
  currentStep: number;
  totalSteps: number;
  context: {
    sessionId: string;
    timestamp: number;
    mode: 'agent';
  };
  previousResults?: ToolExecutionSummary[];
}

export interface ToolExecutionSummary {
  stepId: string;
  toolName: string;
  status: 'success' | 'error';
  summary: string;
  timestamp: number;
}

export interface StructuredToolResult {
  execution: {
    stepId: string;
    toolName: string;
    status: 'success' | 'error';
    timestamp: number;
  };
  result: {
    summary: string;
    details: unknown;
    artifacts?: string[];
  };
  context: {
    originalIntent: string;
    currentStep: number;
    totalSteps: number;
  };
}

/**
 * Manages structured prompts for agent mode to preserve original user intent
 * and provide structured tool results to the LLM
 */
export class StructuredPromptManager {
  private plugin: LLMSiderPlugin;
  private i18n: I18nManager;
  private originalIntent: string = '';
  private currentStep: number = 0;
  private totalSteps: number = 0;
  private executionHistory: ToolExecutionSummary[] = [];
  private sessionId: string = '';

  constructor(plugin: LLMSiderPlugin) {
    this.plugin = plugin;
    this.i18n = plugin.getI18nManager()!;
  }

  /**
   * Initialize a new session with the original user intent
   */
  initializeSession(originalIntent: string, totalSteps: number = 0): void {
    this.originalIntent = originalIntent;
    this.currentStep = 0;
    this.totalSteps = totalSteps;
    this.executionHistory = [];
    this.sessionId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 11);

    Logger.debug('Initialized session:', {
      sessionId: this.sessionId,
      originalIntent: originalIntent.substring(0, 100) + '...',
      totalSteps
    });
  }

  /**
   * Create structured user prompt that preserves original intent
   */
  createStructuredUserPrompt(currentQuery: string, additionalContext?: string): string {
    const structuredPrompt: StructuredUserPrompt = {
      originalIntent: this.originalIntent,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      context: {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        mode: 'agent'
      },
      previousResults: this.executionHistory.length > 0 ? this.executionHistory : undefined
    };

    // Build the user message with structured context
    let message = `<original_user_intent>
${JSON.stringify(structuredPrompt, null, 2)}
</original_user_intent>

<current_query>
${currentQuery}
</current_query>`;

    if (additionalContext) {
      message += `\n\n<additional_context>
${additionalContext}
</additional_context>`;
    }

    return message;
  }

  /**
   * Create structured system message for tool execution results
   */
  createStructuredToolResultMessage(
    stepId: string,
    toolName: string,
    result: unknown,
    status: 'success' | 'error' = 'success',
    summary?: string
  ): ChatMessage {
    // Check for circular references and log if found
    const hasCircular = this.hasCircularReferences(result);
    if (hasCircular) {
      Logger.debug('Detected circular references in result, sanitizing...', {
        toolName,
        stepId,
        resultType: typeof result
      });
    }

    // Sanitize result to remove circular references
    const sanitizedResult = this.sanitizeCircularReferences(result);

    const toolResult: StructuredToolResult = {
      execution: {
        stepId,
        toolName,
        status,
        timestamp: Date.now()
      },
      result: {
        summary: summary || this.generateResultSummary(toolName, result, status),
        details: sanitizedResult,
        artifacts: this.extractArtifacts(result)
      },
      context: {
        originalIntent: this.originalIntent,
        currentStep: this.currentStep,
        totalSteps: this.totalSteps
      }
    };

    // Add to execution history for context preservation
    this.executionHistory.push({
      stepId,
      toolName,
      status,
      summary: toolResult.result.summary,
      timestamp: toolResult.execution.timestamp
    });

    // Create system message with structured result
    let content: string;
    try {
      content = `<tool_execution_result>
${JSON.stringify(toolResult, null, 2)}
</tool_execution_result>`;
    } catch (error) {
      Logger.error('Failed to serialize tool result:', error);
      // Fallback to simplified representation
      content = `<tool_execution_result>
{
  "execution": {
    "stepId": "${stepId}",
    "toolName": "${toolName}",
    "status": "${status}",
    "timestamp": ${Date.now()}
  },
  "result": {
    "summary": "${toolResult.result.summary}",
    "details": "[Serialization failed - circular references detected]",
    "artifacts": ${JSON.stringify(toolResult.result.artifacts || [])}
  },
  "context": {
    "originalIntent": "${this.originalIntent}",
    "currentStep": ${this.currentStep},
    "totalSteps": ${this.totalSteps}
  }
}
</tool_execution_result>`;
    }

    const systemMessage: ChatMessage = {
      id: Date.now().toString() + '_system_' + stepId,
      role: 'system',
      content,
      timestamp: Date.now(),
      metadata: {
        toolName,
        context: `Tool result for step: ${stepId} (${status})`
      }
    };

    Logger.debug('Created structured tool result:', {
      toolName,
      stepId,
      status,
      summaryLength: toolResult.result.summary.length
    });

    return systemMessage;
  }

  /**
   * Sanitize objects with circular references for safe JSON serialization
   * @param obj - Object to sanitize
   * @param seen - WeakSet to track seen objects
   * @returns Sanitized object safe for JSON.stringify
   */
  private sanitizeCircularReferences(obj: unknown, seen = new WeakSet()): unknown {
    // Handle primitives and null
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Detect circular reference
    if (seen.has(obj)) {
      return '[Circular Reference]';
    }

    seen.add(obj);

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeCircularReferences(item, seen));
    }

    // Handle objects
    const sanitized: unknown = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        try {
          sanitized[key] = this.sanitizeCircularReferences(obj[key], seen);
        } catch (error) {
          sanitized[key] = '[Error serializing property]';
        }
      }
    }

    return sanitized;
  }

  /**
   * Check if an object has circular references
   * @param obj - Object to check
   * @returns true if circular references detected
   */
  private hasCircularReferences(obj: unknown): boolean {
    try {
      JSON.stringify(obj);
      return false;
    } catch (error) {
      return error instanceof TypeError && error.message.includes('circular');
    }
  }

  /**
   * Generate a concise summary of tool execution result
   */
  private generateResultSummary(toolName: string, result: unknown, status: 'success' | 'error'): string {
    if (status === 'error') {
      return `Tool ${toolName} failed: ${result?.error || 'Unknown error'}`;
    }

    // Generate context-aware summary based on tool type
    switch (toolName) {
      case 'view':
        return `Retrieved content from file: ${result?.path || 'unknown'} (${result?.content?.length || 0} characters)`;

      case 'str_replace':
      case 'sed':
        return `Modified file: ${result?.path || 'unknown'} - ${result?.changes || 'content updated'}`;

      case 'create':
        return `Created file: ${result?.path || 'unknown'} with ${result?.content?.length || 0} characters`;

      case 'search_notes':
        return `Search completed: found ${result?.results?.length || 0} matches`;

      case 'fetch_web_content':
        return `Fetched web content from ${result?.url || 'unknown URL'} (${result?.content?.length || 0} characters)`;

      case 'browser':
        return `Browser action: ${result?.action || 'unknown'} - ${result?.result?.logs || 'completed'}`;

      default:
        // Generic summary for unknown tools
        if (typeof result === 'object' && result !== null) {
          const keys = Object.keys(result);
          return `Tool ${toolName} executed successfully: ${keys.length} result properties`;
        }
        return `Tool ${toolName} executed successfully`;
    }
  }

  /**
   * Extract artifacts (file paths, URLs, etc.) from tool results
   */
  private extractArtifacts(result: unknown): string[] {
    const artifacts: string[] = [];

    if (typeof result === 'object' && result !== null) {
      // Extract file paths
      if (result.path) artifacts.push(result.path);
      if (result.filePath) artifacts.push(result.filePath);

      // Extract URLs
      if (result.url) artifacts.push(result.url);

      // Extract arrays of paths or URLs
      if (Array.isArray(result.files)) {
        artifacts.push(...result.files.filter((f: unknown) => typeof f === 'string'));
      }
      if (Array.isArray(result.results)) {
        result.results.forEach((r: unknown) => {
          if (r.path) artifacts.push(r.path);
          if (r.file) artifacts.push(r.file);
        });
      }
    }

    return artifacts;
  }

  /**
   * Advance to next step
   */
  nextStep(): void {
    this.currentStep++;
    Logger.debug('Advanced to step:', this.currentStep);
  }

  /**
   * Update total steps if needed
   */
  updateTotalSteps(totalSteps: number): void {
    this.totalSteps = totalSteps;
  }

  /**
   * Get current execution context
   */
  getExecutionContext(): {
    originalIntent: string;
    currentStep: number;
    totalSteps: number;
    sessionId: string;
    executionHistory: ToolExecutionSummary[];
  } {
    return {
      originalIntent: this.originalIntent,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      sessionId: this.sessionId,
      executionHistory: [...this.executionHistory]
    };
  }

  /**
   * Create final answer prompt that includes full context
   */
  createFinalAnswerPrompt(executionResults: unknown[]): string {
    // Create a concise execution summary (max ~300 words)
    // Only include: step purpose, success/failure status, and user task
    
    let executionSummary = '';
    
    if (executionResults.length > 0) {
      executionSummary = this.i18n.t('planExecute.finalAnswerPrompt.executionSummary') + '\n';
      executionResults.forEach((result, index) => {
        const stepNum = index + 1;
        const toolName = result.tool_name || 'Unknown';
        const status = result.tool_error 
          ? this.i18n.t('planExecute.finalAnswerPrompt.failed')
          : this.i18n.t('planExecute.finalAnswerPrompt.success');
        const purpose = result.step_reason || result.purpose || this.i18n.t('planExecute.finalAnswerPrompt.noDescription');
        
        const purposeLabel = this.i18n.t('planExecute.finalAnswerPrompt.purpose');
        executionSummary += `${stepNum}. ${toolName} - ${status}\n   ${purposeLabel}: ${purpose}\n`;
        
        // Only include error info if failed
        if (result.tool_error) {
          const errorMsg = typeof result.tool_error === 'string' 
            ? result.tool_error.substring(0, 100) 
            : this.i18n.t('planExecute.finalAnswerPrompt.unknownError');
          const errorLabel = this.i18n.t('planExecute.finalAnswerPrompt.error');
          executionSummary += `   ${errorLabel}: ${errorMsg}\n`;
        }
      });
    }

    // Create prompt using i18n keys
    return `${this.i18n.t('planExecute.finalAnswerPrompt.header')}

${this.i18n.t('planExecute.finalAnswerPrompt.originalTask')}
${this.originalIntent}

${executionSummary}

${this.i18n.t('planExecute.finalAnswerPrompt.basedOnResults')}
${this.i18n.t('planExecute.finalAnswerPrompt.summaryPoint1')}
${this.i18n.t('planExecute.finalAnswerPrompt.summaryPoint2')}
${this.i18n.t('planExecute.finalAnswerPrompt.summaryPoint3')}
${this.i18n.t('planExecute.finalAnswerPrompt.summaryPoint4')}

${this.i18n.t('planExecute.finalAnswerPrompt.keepConcise')}`;
  }

  /**
   * Reset session state
   */
  reset(): void {
    this.originalIntent = '';
    this.currentStep = 0;
    this.totalSteps = 0;
    this.executionHistory = [];
    this.sessionId = '';
    Logger.debug('Session reset');
  }
}