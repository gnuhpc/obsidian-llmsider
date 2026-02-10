/**
 * Plan-Execute framework translation types
 */

export interface PlanExecuteTranslation {
  // Framework labels
  planningPhase: string;
  executionPhase: string;
  currentStep: string;
  stepComplete: string;
  allStepsComplete: string;

  // Step status
  pending: string;
  inProgress: string;
  completed: string;
  failed: string;

  // Toggle Markdown rendering
  toggleMarkdown: string;
  showMarkdown: string;
  showPlainText: string;

  // Actions
  viewPlan: string;
  hidePlan: string;
  expandStep: string;
  collapseStep: string;

  // Messages
  generatingPlan: string;
  executingStep: string;
  stepFailed: string;
  retryingStep: string;

  // Plan review
  reviewPlanTitle: string;
  reviewPlanPrompt: string;
  approvePlan: string;
  rejectPlan: string;
  modifyPlan: string;

  // Execution tracking
  stepNumber: string;
  totalSteps: string;
  estimatedTime: string;
  elapsedTime: string;

  // Error handling
  planGenerationFailed: string;
  stepExecutionFailed: string;
  maxRetriesExceeded: string;
}
