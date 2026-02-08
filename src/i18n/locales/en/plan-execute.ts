/**
 * Plan-Execute framework translations
 */

export const enPlanExecute = {
  planExecute: {
    generating: 'Generating execution plan...',
    regenerating: 'Regenerating step...',
    executingStep: 'Executing',
    stepCompleted: 'Step {step} completed successfully',
    allStepsCompleted: 'Complete',
    generatingAnswer: 'Generating final answer...',
    generatingAnswerProgress: 'Generating final answer... ({characters} characters)',
    processingBatch: 'Processing batch {index}...',
    stopped: 'Plan-Execute process stopped by user',
    maxIterationsReached: 'Maximum iterations reached, stopped to prevent infinite loop',
    toggleMarkdown: 'Toggle Markdown rendering',
    showMarkdown: 'Render as Markdown',
    showPlainText: 'Show plain text',

    // Graph Execution Mode
    graphExecution: {
      title: 'Graph Execution Mode',
      step: 'Step',
      layer: 'Layer',
      layerStart: 'Start',
      dependsOn: 'Depends on',
      statusPending: 'Pending',
      statusRunning: 'Running',
      statusSuccess: 'Success',
      statusFailed: 'Failed',
      statusSkipped: 'Skipped',
      dynamicStepTitle: 'Dynamic Step Confirmation',
      willExecute: 'Will execute',
      tools: 'tool(s)',
      parallelNotice: 'These tools will execute in parallel for efficiency',
      progress: 'Progress',
      completed: 'completed',
      confirm: 'Confirm Execution',
      cancel: 'Cancel'
    },

    // Tracker UI
    tracker: {
      title: 'Execution Plan',
      planTitle: 'Plan',
      historyBadge: 'History',
      stepTitle: 'Step {index}: {title}',
      stepLabel: 'Step {index}',
      stepResult: 'Step {step} Result:',
      layer: 'Layer',
      
      // Error handling actions
      errorActions: {
        title: 'Step Failed',
        skip: 'Skip',
        retry: 'Retry',
        regenerate: 'Regenerate & Retry',
        skipping: 'Skipping...',
        retrying: 'Retrying...',
        regenerating: 'Regenerating...'
      },
      dependsOn: 'Depends on:',
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
      skippedByUser: 'Skipped by user',
      placeholderErrorPrefix: 'Placeholder replacement failed:',
      placeholderNotFound: 'Placeholder {placeholder} not found.',
      placeholderFieldMissing: 'Field "{field}" does not exist in step{stepNum} result.',
      availableFields: 'Available fields:',
      suggestRegenerate: 'Please regenerate the step using correct field names, or skip this step.',
      placeholderReplacementFailed: 'Placeholder {placeholder} replacement failed.\n\nAvailable fields: {availableFields}\n\nPlease regenerate the step using correct field names, or skip this step.'
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
      stepCancelled: 'Step cancelled',
      stepRegeneratedReady: '✅ Step regenerated, ready to execute...'
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
      result: 'Result',
      aiWantsToExecuteTools: 'AI wants to execute tools',
      toolsToExecute: 'TOOLS TO EXECUTE',
      approveAndExecute: 'Approve & Execute',
      cancel: 'Cancel',
      retry: 'Retry',
      skip: 'Skip',
      regenerateAndRetry: 'Regenerate and Retry',
      copyParameters: 'Copy parameters',
      copyResult: 'Copy result',
      clickToViewParameters: 'Click to view parameters',
      clickToViewDetails: 'Click to view details',
      rawJson: 'Raw JSON',
      formatted: 'Formatted',
      executing: 'Executing...',
      completed: 'Completed',
      failed: 'Failed',
      folders: 'Folders',
      files: 'Files',
      emptyDirectory: '(Empty directory)'
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

    // Planning agent prompts - Refactored for clarity and reduced redundancy
    planningPrompt: {
      role: 'Role',
      roleDescription: 'You are a planning agent responsible for generating tool call plans for user requests.',
      rules: 'Rules',
      
      // SECTION 1: Core Planning Requirements
      rule1: '[BASIC] Generate tool execution plans only - never answer directly',
      rule2: '[STRUCTURE] Each step needs: tool, input, outputSchema, reason, step_id',
      rule2a: '  • tool: Exact tool name from Available Tools list',
      rule2b: '  • input: JSON object matching the tool\'s inputSchema',
      rule2c: '  • outputSchema: Copy EXACTLY from tool definition (CRITICAL)',
      rule2d: '  • reason: Brief explanation of why this step is needed',
      
      // SECTION 2: Output Schema (consolidated from rule3, rule4, rule6, rule10)
      rule3: '[OUTPUT SCHEMA] Every step MUST have outputSchema field (copy from tool definition)',
      rule3a: '  • Must be object: {"type": "object", "properties": {"results": {...}}}',
      rule3b: '  • ❌ FORBIDDEN: {"type": "array"} - arrays must be wrapped in object',
      
      // SECTION 3: Data Reference Format (consolidated from rule6)
      rule4: '[DATA REFERENCE - CRITICAL] ⚠️ MUST use format: {{stepN.fieldName}}',
      rule4a: '  • ✅ CORRECT: {{step1.results}}, {{step2.content}}',
      rule4b: '  • ❌ FORBIDDEN: {{step1.output.results}}, {{step1.output}} (NEVER use .output layer)',
      rule4c: '  • 💡 Always reference the field name directly from the tool\'s outputSchema',
      rule4d: '  • 💡 Tools will automatically handle array iteration and field extraction',
      
      // SECTION 4: File Operations (consolidated from rule5, rule7)
      rule5: '[FILE OPS] Always use "path" parameter (relative to Vault root)',
      rule5a: '  • Examples: "Notes/Report.md", "Projects/Plan.md"',
      rule5b: '  • Read existing files with "view" tool first - never assume content',
      rule5c: '  • ❌ FORBIDDEN: Absolute paths like /Users/username/...',
      rule5d: '  • 💡 Use forward slashes (/) for paths, even on Windows',
      
      // SECTION 5: Web Content Workflow (consolidated from rule8, rule8a, rule8b)
      rule6: '[WEB WORKFLOW - MANDATORY] ⚠️ Search tools MUST be immediately followed by fetch_web_content',
      rule6a: '  • ✅ MUST: Any step using search tool (duckduckgo_*, google_*, tavily_*, baidu_*, news, tickers, etc.)',
      rule6b: '  • ✅ MUST: Next step MUST be fetch_web_content using search results',
      rule6c: '  • ✅ CORRECT fetch input: {"urls": "{{stepN.results}}"} or {"urls": "{{stepN}}"}',
      rule6d: '  • ❌ FORBIDDEN: Using search results directly for analysis WITHOUT fetch_web_content',
      rule6e: '  • 💡 The fetch_web_content tool automatically extracts url/link/href fields from result objects',
      rule6f: '  • 💡 Full flow: search → fetch_web_content(urls={{stepN.results}}) → generate_content',
      rule6g: '  • ❌ WRONG: search → create (missing fetch step)',
      rule6h: '  • 🚨 CRITICAL: If a tool returns URLs, you MUST fetch them. Snippets are NOT enough.',
      rule6i: '  • 🚨 CRITICAL: System will NOT auto-fix missing fetch steps. YOU must include them in your plan!',
      rule6j: '  • 🚨 ABSOLUTELY FORBIDDEN: search_tool -> generate_content (MUST insert fetch_web_content in between)',
      
      // SECTION 6: Content Generation Pattern (consolidated from rule8c-f)
      rule7: '[CONTENT GEN] You can compose file content directly using placeholders',
      rule7a: '  • ✅ ALLOWED: create_file(file_text="# Report\n\n## Data\n{{step1.results}}\n\n## Analysis\n{{step2.content}}")',
      rule7b: '  • ✅ ALLOWED: Directly reference and combine multiple step outputs in file_text',
      rule7c: '  • 💡 TIP: For complex synthesis, you can optionally use generate_content tool',
      rule7d: '  • 💡 generate_content helps when you need LLM to analyze/summarize/transform data',
      rule7e: '  • 💡 Simple formatting/concatenation can be done directly in create_file',
      rule7f: '  • ⚠️ Remember: Always use {{stepN.fieldName}} format for references',
      
      // SECTION 7: Date Parameters (from rule11)
      rule8: '[DATE PARAMS] For date/time parameters, always use get_current_time first',
      rule8a: '  • Tools needing dates: get_stock_historical_data, get_economic_calendar, etc.',
      rule8b: '  • Flow: step1: get_current_time(calculate_dates=true) → step2: use {{step1.current_date}}',
      rule8c: '  • Available: current_date, date_minus_7, date_minus_14, date_minus_30',
      rule8d: '  • Never hardcode dates like "2024-12-09"',
      rule8e: '  • 💡 For "yesterday", "last week", etc., calculate based on current_date',
      rule8e2: '  • 💡 If tool accepts start_date/end_date, ensure end_date >= start_date',
      rule8f: '  • 💡 Timezone is handled automatically by the system',
      
      // SECTION 8: Search Diversity (from rule9)
      rule9: '[SEARCH DIVERSITY] Use different search engines for multiple searches',
      rule9a: '  • Rotate engines: duckduckgo → baidu → bing → google → tavily',
      rule9b: '  • Avoid repeated use of same engine',
      
      // Output format specifications
      outputFormat: 'Output Format',
      outputFormatDesc: 'Pure JSON only (no markdown, no code blocks, no explanations)',
      planExample: 'Then execute each step in sequence:',
      
      // Obsidian context
      obsidianVaultContext: 'Obsidian Vault Context',
      vaultContextDescription: 'This is an Obsidian plugin environment. When using file creation tools:',
      vaultRule1: '- Must provide "path" parameter, specifying file path relative to Vault root directory',
      vaultRule2: '- File path examples:',
      vaultExample1: '  - "Today\'s Weather.md" (in Vault root directory)',
      vaultExample2: '  - "Diary/2024-01-01.md" (in diary folder)',
      vaultExample3: '  - "Project/Work Plan.md" (in project folder)',
      
      // Sections
      availableTools: 'Available Tools',
      userQuestion: 'User Question',
      generatePlanAndExecute: 'Generate execution plan and start executing:',
      
      // Final checklist
      finalChecklistHeader: 'FINAL CHECKLIST',
      finalChecklist: `Before submitting, verify:
✓ Every step has "outputSchema" field
✓ Output is pure JSON (no markdown)
✓ Search steps followed by fetch steps
✓ Data references use {{stepN.fieldName}} (NO .output)
✓ File paths relative to Vault root
✓ Date parameters use get_current_time`,
      
      // Template placeholders
      templateToolName: '<tool_name>',
      templateInputContent: '<input_content>',
      templateStepReason: '<reason_for_calling_this_tool>',
      templateDependentInput: '{"param": "{{step1.fieldName}}"}',
      templateCallReason: '<call_reason>',
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
      requirement1: '**Respond in the same language as the user\'s question** (Chinese for Chinese questions, English for English questions)',
      requirement2: 'Provide accurate and useful answers based on tool execution results',
      requirement3: 'Answer user questions directly, no need to show execution process',
      requirement4: 'If tool results are insufficient to fully answer the question, please state this honestly',
      requirement5: 'Answers should be natural and fluent, like normal conversation',
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
      generateContent: 'Generate Content',
      executing: 'Executing',
      defaultGenerateTask: 'Generate content',
      contentGenerationSuccess: 'Content generation successful',
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
      parameterCorrectionTask: 'Task: Fix Tool Parameters',
      parameterIssuesToFix: 'Parameter Issues to Fix',
      relevantToolRequirements: 'Relevant Tool Parameter Requirements',
      parameterCorrectionRequirements: 'Requirements',
      parameterCorrectionInstructions: 'Only output the corrected parameters, keep the original plan steps and tools unchanged.\n**Important: Please ensure the correction result includes all required parameters for the tool, but do not modify parameters that are already correct.**\n**Special Note: If the path parameter in the original plan is a correct file path, do not replace it with example values.**',
      parameterCorrectionFormat: 'Strictly output the correction result in the following JSON format:',
      unreplacedStepPlaceholder: 'Parameter contains unreplaced step placeholder: {placeholders}',
      ensurePreviousStepsCompleted: 'Ensure previous steps have completed and provided the required data, or replace with specific parameter values',
      noExecutionResults: 'No execution results',
      unknownTool: 'Unknown tool',
      executionSuccess: 'Success',
      executionFailure: 'Failure',
      noContent: 'No content',
      contentGenerationTask: 'Task: Generate file content',
      contentAppendTask: 'Task: Generate content to append to file {filePath}',
      insertTaskDescription: 'Task: Generate insert content for file {path}',
      replaceTaskDescription: 'Task: Generate replacement content for file {path}',
      contentGenerationInstructions: 'Generate file content based on the following information:',
      contentAppendInstructions: 'Generate content to append to the file based on the following information:',
      insertInstructions: 'Generate content to insert into the file based on the following information:',
      replaceInstructions: 'Generate replacement content for the file based on the following information:',
      generateInsertContent: 'Now please directly output the content to **insert into the file** (start from the first line of body, no explanatory prefix):',
      generateReplaceContent: 'Now please directly output the **new replacement content** (start from the first line of body, no explanatory prefix):',
      generateAppendContent: 'Now please generate the content to append to the file:',
      currentStepPurpose: 'Current Step Purpose',
      userTaskSection: 'User Original Task',
      noUserTask: 'No task description',
      fileInformationSection: 'File Information',
      filePath: 'File path: {path}',
      fileGoal: 'Goal: {goal}',
      toolType: 'Tool type: {tool}',
      defaultGoal: 'Generate file content',
      previousResultsSection: 'Previous Step Execution Results',
      contextInformationSection: 'Context Information',
      previousStepOutputsSection: 'Previous Step Outputs',
      requirementsSection: 'Requirements',
      taskSection: 'Task',
      generateContentInstructions: 'Please generate content based on the above information. Output the content directly without adding additional explanations or wrappers.',
      webContentSection: 'Web Content (if any)',
      noWebContentMessage: 'No web content',
      requirement1: '**Generate content in the same language as the user\'s question** (Chinese for Chinese questions, English for English questions)',
      requirement2: 'If there is web content, fully organize and format it in Markdown (keep original language or translate as requested by user)',
      requirement3: '**Must include all content from the original**, do not omit any important information',
      requirement4: 'Maintain the structure and section hierarchy of the content',
      requirement5: 'Remove unnecessary HTML tags and style information',
      requirement6: 'Ensure the content is easy to read and understand',
      requirement7: '**Do not truncate the content**, provide complete content',
      requirement8: 'Output the file content directly, do not add any explanatory text',
      generateCompleteContent: 'Please generate the **complete content** of the file:'
    },

    // Status indicators
    status: {
      waiting: 'Waiting',
      inProgress: 'In Progress',
      completed: 'Completed',
      failed: 'Failed',
      stopped: 'Stopped',
      timeout: 'Timeout',
      // Tool execution status messages
      fetchingWebContent: 'Fetching {count} web pages...',
      fetchingWebContentGeneric: 'Fetching web content...',
      andMore: '... and {count} more',
      source: 'Source: {source}',
      generatingContent: 'Generating content...',
      task: 'Task: {task}',
      dataPlaceholder: '[data]',
      searching: 'Searching...',
      searchQuery: 'Query: {query}',
      searchingFiles: 'Searching files...',
      readingFile: 'Reading file...',
      executing: 'Executing...',
      waitingForPreviousStep: 'Waiting for previous step to complete...',
      stepOutput: 'Output from step {step}',
      stepOutputPath: 'Output from step {step}: {path}'
    },

    // Task status
    taskStatus: {
      completed: 'completed',
      failed: 'failed',
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
    },

    // Plan validation messages
    validation: {
      autoFixedTitle: 'Plan Auto-Fixed',
      failedTitle: 'Plan Validation Failed',
      autoFixedChanges: 'Auto-fixed issues:',
      errors: 'Errors',
      warnings: 'Warnings',
      regenerate: 'Regenerate Plan',
      regeneratePlan: 'Regenerate Plan',
      actionRequired: 'Action Required',
      regenerateHint: 'Plan validation failed. Please regenerate the plan. Error details will be sent to AI for improvement.',
      ignoreAndContinue: 'Ignore & Continue',
      cancel: 'Cancel'
    }
  }
};
