/**
 * Plan-Execute framework translations
 */

export const enPlanExecute = {
  planExecute: {
    generating: 'Generating execution plan...',
    regenerating: 'Regenerating step...',
    executingStep: 'Executing step {step} of {total}',
    stepCompleted: 'Step {step} completed successfully',
    allStepsCompleted: 'Complete',
    generatingAnswer: 'Generating final answer...',
    generatingAnswerProgress: 'Generating final answer... ({characters} characters)',
    stopped: 'Plan-Execute process stopped by user',
    maxIterationsReached: 'Maximum iterations reached, stopped to prevent infinite loop',

    // Tracker UI
    tracker: {
      title: 'Execution Plan',
      planTitle: 'Plan',
      historyBadge: 'History',
      stepTitle: 'Step {index}: {title}',
      progressText: '{completed} of {total} completed',
      statusPending: 'Pending',
      statusInProgress: 'In Progress',
      statusCompleted: 'Completed',
      statusSkipped: 'Skipped',
      statusError: 'Error',
      regenerateRetry: 'Regenerate & Retry',
      retry: 'Retry',
      skip: 'Skip',
      showDetails: 'Show Details',
      hideDetails: 'Hide Details',
      executionFailed: 'Plan execution failed',
      inProgress: '{count} in progress',
      failed: '{count} failed',
      executingPlan: 'Executing plan...',
      toolIndex: 'Tool {index}',
      request: 'Request',
      response: 'Response',
      error: 'Error',
      copyRequest: 'Copy request',
      copyResponse: 'Copy response',
      copyError: 'Copy error',
      retryTooltip: 'Retry this step',
      skipTooltip: 'Skip this step and continue',
      regenerateRetryTooltip: 'Regenerate step content and retry',
      stopped: 'Stopped',
      stoppedByUser: 'Execution stopped by user',
      skippedByUser: 'Skipped by user'
    },

    // Execution plan related
    executionPlanGeneration: {
      analyzing: 'Analyzing request and generating execution plan...',
      buildingPlan: 'Building execution plan with steps...',
      planGenerated: 'Plan ready',
      planGenerationFailed: 'Failed to generate execution plan',
      invalidPlan: 'Generated plan is invalid or malformed',
      planTooLong: 'Execution plan is too long, simplifying...',
      planValidation: 'Validating execution plan structure...',
      planExecution: 'Starting execution plan implementation...'
    },

    // Step execution related
    stepExecution: {
      preparingStep: 'Preparing to execute step...',
      preparingStepIcon: '🔄 Preparing to execute...',
      stepLabel: 'Step {step}:',
      executingStepNumber: 'Executing step {step} of {total}...',
      stepExecutionSuccess: 'Step {step} executed successfully',
      stepExecutionFailed: 'Step {step} execution failed: {error}',
      stepValidation: 'Validating step parameters and requirements...',
      stepTimeout: 'Step execution timed out',
      stepSkipped: 'Step skipped due to conditions',
      stepRetrying: 'Retrying step execution...',
      allStepsCompleted: 'Execution complete',
      executionInterrupted: 'Execution interrupted by user or system',
      stepCancelled: 'Step cancelled'
    },

    // Tool execution related
    toolExecution: {
      preparingTool: 'Preparing tool for execution...',
      executingTool: 'Executing tool: {toolName}',
      toolName: 'Tool {toolName}',
      toolExecutionSuccess: 'Tool {toolName} executed successfully',
      toolExecutionFailed: 'Tool {toolName} execution failed: {error}',
      toolNotFound: 'Tool {toolName} not found or unavailable',
      toolTimeout: 'Tool execution timed out',
      toolParameterError: 'Invalid parameters for tool {toolName}',
      toolPermissionDenied: 'Permission denied for tool {toolName}'
    },

    // Tool card status labels
    toolCardStatus: {
      awaitingApproval: 'Awaiting Approval',
      executing: 'Executing',
      regenerating: 'Regenerating',
      completed: 'Completed',
      failed: 'Failed'
    },

    // Tool card UI labels
    toolCardLabels: {
      parameters: 'Parameters',
      parameterCount: '{count} parameter',
      parametersCount: '{count} parameters',
      aiWantsToExecuteTools: 'AI wants to execute tools',
      toolsToExecute: 'TOOLS TO EXECUTE',
      approveAndExecute: 'Approve & Execute',
      cancel: 'Cancel',
      executing: 'Executing...',
      completed: 'Completed',
      failed: 'Failed'
    },

    // Placeholder error handling
    placeholderError: {
      title: 'Placeholder Replacement Failed',
      regenerateAndTry: 'Regenerate and Try',
      retrying: 'Retrying...'
    },

    // Answer generation related
    answerGeneration: {
      generatingFinalAnswer: 'Generating final answer based on execution results...',
      guidingFinalAnswer: 'Detected tool execution results, guiding to generate final answer...',
      answerGenerated: 'Answer ready',
      answerGenerationFailed: 'Failed to generate final answer',
      summaryGeneration: 'Generating execution summary...',
      resultCompilation: 'Compiling execution results...'
    },

    // Planning agent prompts
    planningPrompt: {
      role: 'Role',
      roleDescription: 'You are a planning agent responsible for generating tool call plans for user requests.',
      rules: 'Rules',
      rule1: 'Do not directly answer user questions.',
      rule2: 'Your task is to output tool call plans, including:',
      rule2a: '- Which tools to call',
      rule2b: '- Tool call sequence',
      rule2c: '- Input for each step call',
      rule2d: '- Reason for each step',
      rule3: 'Each step must have a unique "step_id" for subsequent tracking.',
      rule4: 'Output must strictly follow the specified XML format.',
      rule5: '**Important: For tools involving file operations (such as create, create_file, sed, str_replace, etc.), you must provide all required parameters including a path relative to the Obsidian Vault root directory in the input.**',
      rule5a: '- Use "path" parameter to specify file path',
      rule5b: '- Path format: such as "Notes/Weather Report.md" or "Project/Plan.md"',
      rule5c: '- Do not use absolute paths, only use paths relative to Vault',
      rule5d: '- Check tool parameter list for parameters marked as "(必需)" and ensure all are included in input',
      rule6: '**Placeholder Format: When a step needs to reference output from previous steps, use the following unified format:**',
      rule6a: '- {{step1.output.content}} - Reference the content field from step 1 output',
      rule6b: '- {{step2.output.transformedText}} - Reference the transformedText field from step 2 output',
      rule6c: '- {{stepN.output.fieldName}} - Generic format, N is step number, fieldName is field name',
      rule6d: '- Common fields: content, text, transformedText, location, longitude, latitude, results',
      rule6d2: '- **list_file_directory output**: Use {{stepN.output.listing.files}} for file array, {{stepN.output.listing.folders}} for folder array, or {{stepN.output.listing}} for the entire listing object',
      rule6e: '- Example: {"content": "{{step2.output.transformedText}}"}',
      rule6f: '- **Date Calculation Fields**: When using get_current_time tool with calculate_dates=true, available fields include: date_minus_7, date_minus_14, date_minus_30 (dates for 7/14/30 days ago in YYYY-MM-DD format)',
      rule7: '**Critical: When user mentions local files, existing files, or references to file content (e.g., "based on X.md", "reference the file", "use the content from"), you MUST:**',
      rule7a: '- First use "view" tool to read the referenced file content',
      rule7b: '- Then use that content in subsequent steps',
      rule7c: '- Example: If user says "write an article based on notes.md", your first step must be view("notes.md")',
      rule7d: '- Never assume file content without reading it first with the view tool',
      outputFormat: 'Output Format',
      planExample: 'Then execute each step in sequence:',
      obsidianVaultContext: 'Obsidian Vault Context',
      vaultContextDescription: 'This is an Obsidian plugin environment. When using file creation tools:',
      vaultRule1: '- Must provide "path" parameter, specifying file path relative to Vault root directory',
      vaultRule2: '- File path examples:',
      vaultExample1: '  - "Today\'s Weather.md" (in Vault root directory)',
      vaultExample2: '  - "Diary/2024-01-01.md" (in diary folder)',
      vaultExample3: '  - "Project/Work Plan.md" (in project folder)',
      availableTools: 'Available Tools',
      userQuestion: 'User Question',
      generatePlanAndExecute: 'Please first generate an execution plan, then start executing the first step:',
      // Template placeholders
      templateToolName: '<tool_name>',
      templateInputContent: '<input_content>',
      templateStepReason: '<reason_for_calling_this_tool>',
      templateDependentInput: '{"param": "{{step1.output.fieldName}}"}',
      templateCallReason: '<call_reason>',
      // Action example placeholders
      exampleToolName: 'tool_name',
      exampleParamName: 'param_name',
      exampleParamValue: 'param_value'
    },

    // Final answer prompts
    finalAnswerPrompt: {
      role: 'Role',
      roleDescription: 'You are an intelligent assistant responsible for answering user questions based on tool execution results.',
      input: 'Input',
      toolExecutionResults: 'Tool execution results:',
      rules: 'Rules',
      requirement1: 'Provide accurate and useful answers based on tool execution results',
      requirement2: 'Answer user questions directly, no need to show execution process',
      requirement3: 'If tool results are insufficient to fully answer the question, please state this honestly',
      requirement4: 'Answers should be natural and fluent, like normal conversation',
      originalUserQuestion: 'Original User Question',
      answerBasedOnResults: 'Please answer the user question directly based on the above tool execution results:',
      // New keys for concise final answer
      header: 'Please provide a concise final answer that addresses the user\'s original task.',
      originalTask: 'Original User Task:',
      executionSummary: 'Execution Summary:',
      purpose: 'Purpose',
      error: 'Error',
      unknownError: 'Unknown error',
      noDescription: 'No description',
      success: '✅ Success',
      failed: '❌ Failed',
      basedOnResults: 'Based on the execution results above, please summarize:',
      summaryPoint1: '1. What was accomplished',
      summaryPoint2: '2. Whether the user\'s task was completed successfully',
      summaryPoint3: '3. Any important findings or outputs',
      summaryPoint4: '4. Next steps if applicable',
      keepConcise: 'Keep your answer focused and concise.'
    },

    // Content generation stages
    contentGeneration: {
      parsing: 'Parsing',
      analyzing: 'Analyzing',
      preparing: 'Preparing',
      connecting: 'Connecting',
      connected: 'Connected',
      generating: 'Generating',
      processing: 'Processing',
      completed: 'Completed',
      error: 'Error',
      parseParameters: 'Parsing parameters...',
      analyzeTemplate: 'Analyzing template',
      analyzeResults: 'Analyzing results...',
      buildPrompt: 'Building prompt...',
      connectAI: 'Connecting to AI...',
      aiConnected: 'AI connected successfully',
      generatingContent: 'Generating content...',
      cleanContent: 'Cleaning content...',
      contentCompleted: 'Content generation completed',
      generationFailed: 'Generation failed',
      pathMissing: 'File path missing',
      aiUnavailable: 'AI service unavailable',
      foundResults: 'Found {count} execution results',
      hasWebContent: 'Contains web content',
      noWebContent: 'No web content',
      promptCompleted: 'Prompt completed ({length} characters)',
      contentProcessed: 'Content processed ({length} characters)',
      finalLength: 'Content generation completed! Final length: {length} characters',
      validationFailed: 'Plan parameter validation failed, please check tool call parameters',
      parameterValidationPassed: '{count} step parameters validated',
      parameterValidationFailed: 'Parameter validation failed',
      noExecutionResults: 'No execution results',
      unknownTool: 'Unknown tool',
      executionSuccess: 'Success',
      executionFailure: 'Failure',
      noContent: 'No content',
      contentGenerationTask: 'Task: Generate file content',
      contentAppendTask: 'Task: Generate content to append to file {filePath}',
      contentGenerationInstructions: 'Generate file content based on the following information:',
      contentAppendInstructions: 'Generate content to append to the file based on the following information:',
      currentStepPurpose: 'Current Step Purpose',
      userTaskSection: 'User Original Task',
      noUserTask: 'No task description',
      fileInformationSection: 'File Information',
      filePath: 'File path: {path}',
      fileGoal: 'Goal: {goal}',
      toolType: 'Tool type: {tool}',
      defaultGoal: 'Generate file content',
      previousResultsSection: 'Previous Step Execution Results',
      webContentSection: 'Web Content (if any)',
      noWebContentMessage: 'No web content',
      requirementsSection: 'Requirements',
      requirement1: 'If there is web content, please **fully translate** it to Chinese and format it in Markdown',
      requirement2: '**Must include all content from the original**, do not omit any important information',
      requirement3: 'Maintain the structure and section hierarchy of the content',
      requirement4: 'Remove unnecessary HTML tags and style information',
      requirement5: 'Ensure the content is easy to read and understand',
      requirement6: '**Do not truncate the content**, please provide a complete translation',
      requirement7: 'Output the file content directly, do not add any explanatory text',
      generateCompleteContent: 'Please generate the **complete content** of the file:',
      generateAppendContent: 'Please generate the content to **append to the end of the file**:'
    },

    // Status indicators
    status: {
      waiting: 'Waiting',
      inProgress: 'In Progress',
      completed: 'Completed',
      failed: 'Failed',
      stopped: 'Stopped',
      timeout: 'Timeout'
    },

    // Progress messages
    progress: {
      stepProgress: 'Step {current}/{total} ({percentage}%)',
      overallProgress: 'Overall progress: {percentage}%',
      timeElapsed: 'Time elapsed: {time}',
      estimatedRemaining: 'Estimated remaining: {time}',
      executingCurrentStep: 'Executing: {tool} (step {step}/{total})',
      executingInProgress: 'In progress (step {step}/{total})',
      preparingNextStep: 'Preparing to execute step {step}/{total}',
      failedStepsWithCompleted: '{failed} steps failed, {completed} completed'
    }
  }
};
