# Migration Guide: Integrating the New Plan-Execute Framework

This guide walks you through integrating the new Mastra-enhanced plan-execute framework with the existing `MastraPlanExecuteProcessor`.

## 🎯 Migration Strategy

We'll use a **phased approach** to minimize disruption:

1. **Phase 1**: Add new framework alongside existing code (no breaking changes)
2. **Phase 2**: Update MastraPlanExecuteProcessor to use new executor
3. **Phase 3**: Migrate plan generation to new Planner
4. **Phase 4**: Remove old code once migration is complete

## 📋 Phase 1: Add New Framework

### Step 1.1: Verify Installation

The new framework is already in place at:
```
src/core/plan-execute/
  ├── index.ts           # Main exports
  ├── types.ts           # Type definitions
  ├── utils.ts           # Utilities
  ├── graph-executor.ts  # Execution engine
  ├── planner.ts         # Plan generation
  ├── adapter.ts         # Compatibility layer
  └── README.md          # Documentation
```

### Step 1.2: Update package.json Dependencies

The framework uses `zod` which should already be installed:
```json
{
  "dependencies": {
    "zod": "^3.25.76"  // Already present
  }
}
```

## 📋 Phase 2: Update MastraPlanExecuteProcessor

### Step 2.1: Import New Framework Components

Add these imports to `mastra-plan-execute-processor.ts`:

```typescript
import {
  PlanExecutor,
  createPlanExecutor,
  Plan,
  ExecutionOptions,
} from '../plan-execute';
import {
  ExecutionAdapter,
  convertAgentPlanToPlan,
  convertPlanToAgentPlan,
  convertTraceToTasks,
} from '../plan-execute/adapter';
```

### Step 2.2: Add PlanExecutor Instance

Add a new field to the class:

```typescript
export class MastraPlanExecuteProcessor {
  // ... existing fields ...
  private planExecutor: PlanExecutor | null = null;
```

### Step 2.3: Initialize PlanExecutor in Constructor

```typescript
constructor(/* ... existing params ... */) {
  // ... existing initialization ...
  
  // Initialize plan executor (will be configured when agent is ready)
  this.initializePlanExecutor();
}

private async initializePlanExecutor(): Promise<void> {
  if (!this.agent) return;
  
  try {
    // Get tools from tool execution manager
    const tools = this.convertToolsForExecutor();
    
    // Create executor with Mastra agent for auto-planning
    this.planExecutor = createPlanExecutor(tools, {
      mastraAgent: this.agent,
      plannerConfig: {
        temperature: 0.3,
        maxRetries: 3,
        debug: true,
      },
    });
    
    Logger.debug('[MastraPlanExecuteProcessor] PlanExecutor initialized');
  } catch (error) {
    Logger.error('[MastraPlanExecuteProcessor] Failed to initialize PlanExecutor:', error);
  }
}

private convertToolsForExecutor(): Record<string, Tool> {
  // Convert ToolExecutionManager's tools to framework Tool format
  // This is a bridge function - actual implementation depends on your tool structure
  const tools: Record<string, Tool> = {};
  
  // Example conversion (adjust to match your actual tool structure):
  const availableTools = this.toolExecutionManager.getAvailableTools();
  for (const [id, tool] of Object.entries(availableTools)) {
    tools[id] = {
      id,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: async (params: AnyObject) => {
        return await this.toolExecutionManager.executeTool(id, params);
      },
    };
  }
  
  return tools;
}
```

### Step 2.4: Update startPlanExecuteFlow to Use New Executor

Add a flag to control which executor to use:

```typescript
async startPlanExecuteFlow(
  userQuery: string,
  messages: ChatMessage[],
  abortController?: AbortController,
  sessionId?: string,
  useNewExecutor = false  // Add this flag
): Promise<void> {
  if (useNewExecutor && this.planExecutor) {
    // Use new executor
    return this.executeWithNewFramework(userQuery, messages, abortController, sessionId);
  } else {
    // Use existing implementation
    return this.executeWithLegacyFramework(userQuery, messages, abortController, sessionId);
  }
}
```

### Step 2.5: Implement New Executor Path

```typescript
private async executeWithNewFramework(
  userQuery: string,
  messages: ChatMessage[],
  abortController?: AbortController,
  sessionId?: string
): Promise<void> {
  Logger.debug('[MastraPlanExecuteProcessor] Using NEW framework executor');
  
  try {
    // Store context
    this.currentUserQuery = userQuery;
    this.currentMessages = messages;
    this.currentSessionId = sessionId || `session-${Date.now()}`;
    
    // Build input context from messages
    const inputContext = this.buildContextFromMessages(messages);
    
    // Execute task (auto-generates plan)
    const result = await this.planExecutor!.executeTask(
      userQuery,
      inputContext,
      {
        planOptions: {
          executionMode: this.plugin.settings.planExecutionMode || 'sequential',
          maxSteps: 10,
        },
        maxRetries: 2,
        defaultTimeoutMs: 30000,
        concurrency: 4,
        abortController,
        
        // Lifecycle callbacks
        onNodeStart: (nodeId: string) => {
          Logger.debug(`[New Framework] Node started: ${nodeId}`);
          // Update UI if needed
        },
        
        onNodeComplete: (nodeId: string, result: unknown) => {
          Logger.debug(`[New Framework] Node completed: ${nodeId}`);
          // Update UI with result
        },
        
        onNodeError: (nodeId: string, error: string) => {
          Logger.error(`[New Framework] Node failed: ${nodeId}`, error);
          // Update UI with error
        },
      }
    );
    
    // Convert plan to AgentPlan format for UI
    const agentPlan = convertPlanToAgentPlan(result.plan);
    
    // Convert trace to tasks for UI
    const tasks = convertTraceToTasks(result.trace, result.plan);
    
    // Update UI (use existing plan tracker)
    if (this.onPlanCreatedCallback) {
      this.onPlanCreatedCallback(agentPlan, tasks);
    }
    
    // Render results
    this.renderFinalResults(result.context, result.trace);
    
    Logger.debug('[MastraPlanExecuteProcessor] Execution completed successfully');
    
  } catch (error) {
    Logger.error('[MastraPlanExecuteProcessor] Execution failed:', error);
    this.handleExecutionError(error);
  }
}

private buildContextFromMessages(messages: ChatMessage[]): AnyObject {
  // Extract relevant context from messages
  return {
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    // Add any other relevant context
  };
}

private renderFinalResults(context: AnyObject, trace: ExecTrace): void {
  // Render execution results to UI
  const resultContainer = this.messageContainer.createDiv({
    cls: 'llmsider-execution-results'
  });
  
  // Display execution statistics
  const statsEl = resultContainer.createDiv({ cls: 'execution-stats' });
  statsEl.innerHTML = `
    <h4>Execution Summary</h4>
    <ul>
      <li>Total Steps: ${trace.statistics?.totalSteps}</li>
      <li>Successful: ${trace.statistics?.successfulSteps}</li>
      <li>Failed: ${trace.statistics?.failedSteps}</li>
      <li>Duration: ${trace.totalDurationMs}ms</li>
    </ul>
  `;
  
  // Display final context (results)
  // Customize based on your needs
}

private handleExecutionError(error: unknown): void {
  // Handle execution errors
  const errorMsg = error instanceof Error ? error.message : String(error);
  
  // Use existing error renderer
  const errorRenderer = new ErrorRenderer(this.messageContainer, this.plugin);
  errorRenderer.render({
    message: 'Plan execution failed',
    details: errorMsg,
  });
}
```

### Step 2.6: Add Toggle for Testing

Add a setting to switch between old and new executors:

```typescript
// In plugin settings
interface LLMSiderSettings {
  // ... existing settings ...
  useNewPlanExecutor?: boolean;  // Add this
}

// In settings tab
new Setting(containerEl)
  .setName('Use New Plan Executor (Experimental)')
  .setDesc('Enable the new Mastra-enhanced plan executor')
  .addToggle(toggle => toggle
    .setValue(this.plugin.settings.useNewPlanExecutor ?? false)
    .onChange(async (value) => {
      this.plugin.settings.useNewPlanExecutor = value;
      await this.plugin.saveSettings();
    }));
```

### Step 2.7: Update Call Sites

```typescript
// When starting plan-execute flow
await processor.startPlanExecuteFlow(
  userQuery,
  messages,
  abortController,
  sessionId,
  this.plugin.settings.useNewPlanExecutor  // Pass the flag
);
```

## 📋 Phase 3: Migrate Plan Generation

### Step 3.1: Use Planner for Plan Generation Only

If you want to use the new Planner but keep existing execution:

```typescript
import { createMastraPlanner } from '../plan-execute/planner';

// In initialization
this.planner = createMastraPlanner(this.agent, tools, {
  temperature: 0.3,
  maxRetries: 3,
  debug: true,
});

// Generate plan
const plan = await this.planner.generatePlanFromTask(userQuery, {
  executionMode: 'dag',
  maxSteps: 10,
});

// Convert to AgentPlan for existing executor
const agentPlan = convertPlanToAgentPlan(plan);

// Execute with existing code
await this.executeExistingPlan(agentPlan);
```

## 📋 Phase 4: Complete Migration

Once you've tested and verified the new framework works correctly:

### Step 4.1: Update Default Behavior

```typescript
// Change default to use new executor
async startPlanExecuteFlow(
  userQuery: string,
  messages: ChatMessage[],
  abortController?: AbortController,
  sessionId?: string,
  useNewExecutor = true  // Change default to true
): Promise<void> {
```

### Step 4.2: Remove Legacy Code

After confirming stability:
1. Remove old execution paths
2. Remove adapter layer (if no longer needed)
3. Clean up redundant code

### Step 4.3: Update Documentation

Update your plugin's documentation to reflect the new capabilities:
- DAG execution support
- Loop processing
- Enhanced error handling
- Execution tracing

## 🧪 Testing Strategy

### Test Plan

1. **Smoke Tests**
   ```typescript
   // Test basic execution
   await executor.execute(samplePlans.sequential);
   
   // Test with real tools
   await executor.executeTask('Fetch weather for NYC');
   ```

2. **Comparison Tests**
   ```typescript
   // Run same task with both executors
   const oldResult = await oldExecutor.execute(task);
   const newResult = await newExecutor.execute(task);
   
   // Compare results
   compareResults(oldResult, newResult);
   ```

3. **Edge Case Tests**
   - Test error handling
   - Test timeout scenarios
   - Test cancellation
   - Test retry logic
   - Test loop expansion

4. **Performance Tests**
   - Compare sequential vs DAG execution
   - Measure execution time
   - Check memory usage

## 🐛 Troubleshooting

### Issue: Tools not converting correctly

**Solution**: Implement proper tool conversion in `convertToolsForExecutor()`:

```typescript
private convertToolsForExecutor(): Record<string, Tool> {
  const tools: Record<string, Tool> = {};
  
  // Get your actual tools
  const mcpTools = this.toolExecutionManager.getMCPTools();
  const builtinTools = this.toolExecutionManager.getBuiltinTools();
  
  // Convert each tool type
  for (const tool of [...mcpTools, ...builtinTools]) {
    tools[tool.name] = {
      id: tool.name,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: async (params: AnyObject) => {
        return await this.toolExecutionManager.executeTool(tool.name, params);
      },
    };
  }
  
  return tools;
}
```

### Issue: UI not updating correctly

**Solution**: Ensure callbacks are connected:

```typescript
// Connect UI callbacks
this.planExecutor = createPlanExecutor(tools, {
  mastraAgent: this.agent,
});

// Use lifecycle callbacks to update UI
executionOptions.onNodeComplete = (nodeId, result) => {
  this.updateTaskInUI(nodeId, 'completed', result);
};
```

### Issue: Context not being passed correctly

**Solution**: Build context more comprehensively:

```typescript
private buildContextFromMessages(messages: ChatMessage[]): AnyObject {
  return {
    messages,
    // Add conversation history
    history: this.conversationHistory,
    // Add file references
    files: this.contextManager?.getReferencedFiles(),
    // Add user preferences
    settings: this.plugin.settings,
    // Add any other state
  };
}
```

## 📊 Rollback Plan

If you encounter issues:

1. **Quick Rollback**: Set `useNewPlanExecutor` to `false`
2. **Code Rollback**: The new code is in separate files, old code unchanged
3. **Gradual Migration**: Start with simple plans, expand to complex ones

## ✅ Checklist

- [ ] Phase 1: New framework added
- [ ] Phase 2: Integration code written
- [ ] Settings toggle added
- [ ] Tool conversion implemented
- [ ] UI callbacks connected
- [ ] Smoke tests passing
- [ ] Edge cases tested
- [ ] Performance validated
- [ ] Documentation updated
- [ ] Default switched to new executor
- [ ] Legacy code removed (optional)

## 🎉 Benefits After Migration

1. **Better Performance**: Parallel execution where possible
2. **More Robust**: Comprehensive error handling and retry logic
3. **Better Observability**: Detailed execution traces
4. **Type Safety**: Zod validation prevents runtime errors
5. **More Flexible**: Support for loops, conditionals, reduce operations
6. **Easier to Debug**: Clear execution flow and comprehensive logging

## 📚 Additional Resources

- `README.md` - Complete framework documentation
- `IMPLEMENTATION_SUMMARY.md` - What was built
- `types.ts` - Type definitions
- Sample plans in `index.ts` - Examples to learn from
