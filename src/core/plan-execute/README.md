# Mastra-Enhanced Plan-Execute Framework

A production-ready plan-execute framework that leverages Mastra's capabilities for intelligent task decomposition and parallel execution.

## 🚀 Overview

This framework provides a comprehensive solution for:
- **Intelligent Planning**: Generate structured execution plans from natural language using LLMs
- **DAG Execution**: Execute plans as directed acyclic graphs with automatic parallelization
- **Advanced Patterns**: Support for loops, conditionals, map-reduce, and parallel execution
- **Robust Error Handling**: Retry logic, timeouts, and comprehensive error tracking
- **Runtime Validation**: Zod-based validation at every step
- **Execution Tracing**: Detailed traces for debugging and monitoring
- **Mastra Integration**: Seamless integration with Mastra agents and tools

## 📋 Features

### Core Capabilities

- ✅ **Multiple Execution Modes**: Sequential, DAG (parallel), and graph-based execution
- ✅ **Loop Support**: Both static (plan-time) and dynamic (runtime) loop expansion
- ✅ **Conditional Branching**: If-then-else logic based on runtime context
- ✅ **Map-Reduce**: Efficient processing of arrays with parallel execution
- ✅ **Dependency Management**: Automatic topological sorting and dependency resolution
- ✅ **Retry Logic**: Configurable retries with exponential backoff
- ✅ **Timeout Control**: Per-step timeouts to prevent hanging operations
- ✅ **Input Validation**: Zod schemas for runtime type safety
- ✅ **Execution Tracing**: Complete audit trail with timing, inputs, and outputs
- ✅ **Variable Substitution**: Template-based parameter substitution from context

### Plan DSL

The framework supports a rich DSL for expressing complex execution plans:

#### Step Types

1. **ToolStep** - Execute a single tool
2. **LoopStep** - Iterate over an array
3. **ParallelStep** - Execute steps in parallel
4. **ReduceStep** - Map-reduce pattern
5. **ConditionalStep** - If-then-else branching
6. **FinalStep** - Final output generation (often LLM-based)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PlanExecutor                            │
│  (Unified interface for planning + execution)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌──────────────┐    ┌────────────────────┐
│   Planner    │    │ DynamicGraphExecutor│
│              │    │                     │
│ - LLM-based  │    │ - DAG execution     │
│ - Mastra     │    │ - Parallelization   │
│   integration│    │ - Loop expansion    │
│ - Schema     │    │ - Error handling    │
│   validation │    │ - Tracing           │
└──────────────┘    └────────────────────┘
        │                    │
        └─────────┬──────────┘
                  ▼
        ┌──────────────────┐
        │   Tool Registry  │
        │                  │
        │ - MCP tools      │
        │ - Built-in tools │
        │ - API tools      │
        └──────────────────┘
```

## 📚 Usage Examples

### Basic Usage

```typescript
import { createPlanExecutor, sampleTools } from './core/plan-execute';

// 1. Create executor with tools
const executor = createPlanExecutor(sampleTools);

// 2. Define a plan
const plan = {
  version: '1.0',
  execution: 'sequential',
  steps: [
    {
      id: 'fetch',
      tool: 'fetch_page_content',
      input: { url: 'https://example.com' },
      output: 'page'
    },
    {
      id: 'analyze',
      tool: 'sentiment_analysis',
      input: { text: '{{page.content}}' },
      output: 'sentiment'
    }
  ]
};

// 3. Execute
const { context, trace } = await executor.execute(plan);
console.log(context.sentiment); // Sentiment analysis result
console.log(trace.statistics); // Execution statistics
```

### With Mastra Agent (Auto-Planning)

```typescript
import { createPlanExecutor } from './core/plan-execute';
import { MastraAgent } from './core/agent/mastra-agent';

// 1. Create Mastra agent
const agent = new MastraAgent({ /* config */ });

// 2. Create executor with planner
const executor = createPlanExecutor(tools, {
  mastraAgent: agent,
  plannerConfig: {
    temperature: 0.3,
    maxRetries: 3
  }
});

// 3. Execute natural language task (auto-generates plan)
const result = await executor.executeTask(
  'Fetch weather for New York, London, and Tokyo, then summarize',
  { /* input context */ }
);

console.log(result.plan);    // Generated plan
console.log(result.context); // Execution results
console.log(result.trace);   // Execution trace
```

### DAG Execution (Parallel)

```typescript
const plan = {
  version: '1.0',
  execution: 'dag',
  steps: [
    // These two steps run in parallel (no dependencies)
    {
      id: 'fetch_weather',
      tool: 'fetch_weather',
      input: { city: 'NYC' },
      output: 'weather'
    },
    {
      id: 'fetch_news',
      tool: 'fetch_news',
      input: { city: 'NYC' },
      output: 'news'
    },
    // This step waits for both to complete
    {
      id: 'summarize',
      tool: 'summarize',
      input: {
        weather: '{{weather}}',
        news: '{{news}}'
      },
      depends_on: ['fetch_weather', 'fetch_news'],
      output: 'summary'
    }
  ]
};

const { context } = await executor.execute(plan);
```

### Loop Execution

```typescript
const plan = {
  version: '1.0',
  execution: 'sequential',
  steps: [
    {
      id: 'process_cities',
      type: 'loop',
      over: 'input.cities',  // Array in context
      as: 'city',            // Loop variable
      concurrency: 3,        // Process 3 at a time
      step: {
        id: 'fetch_weather',
        tool: 'fetch_weather',
        input: { city: '{{city}}' },
        output: 'weather'
      },
      output: 'all_weather'  // Array of results
    }
  ]
};

const { context } = await executor.execute(plan, {
  input: { cities: ['NYC', 'LA', 'Chicago', 'Houston'] }
});
console.log(context.all_weather); // Array of 4 weather results
```

### Conditional Execution

```typescript
const plan = {
  version: '1.0',
  execution: 'sequential',
  steps: [
    {
      id: 'check_sentiment',
      tool: 'sentiment_analysis',
      input: { text: '{{input.text}}' },
      output: 'sentiment'
    },
    {
      id: 'conditional_action',
      type: 'conditional',
      condition: '${sentiment.score} > 0.5',
      then: [
        {
          id: 'positive_action',
          tool: 'send_notification',
          input: { message: 'Positive sentiment detected!' }
        }
      ],
      otherwise: [
        {
          id: 'negative_action',
          tool: 'escalate',
          input: { message: 'Negative sentiment needs attention' }
        }
      ]
    }
  ]
};
```

### Reduce Pattern (Map-Reduce)

```typescript
const plan = {
  version: '1.0',
  execution: 'sequential',
  steps: [
    {
      id: 'fetch_pages',
      type: 'loop',
      over: 'input.urls',
      as: 'url',
      step: {
        id: 'fetch',
        tool: 'fetch_page_content',
        input: { url: '{{url}}' },
        output: 'content'
      },
      output: 'pages'
    },
    {
      id: 'reduce_summaries',
      type: 'reduce',
      input: 'pages',
      as: 'page',
      reducer: {
        id: 'summarize',
        tool: 'summarize_text',
        input: { text: '{{page.content}}' },
        output: 'summary'
      },
      output: 'summaries'
    },
    {
      id: 'final_summary',
      type: 'final',
      function: 'create_report',
      input: { summaries: '{{summaries}}' },
      output: 'report'
    }
  ]
};
```

## 🔧 Configuration

### ExecutionOptions

```typescript
interface ExecutionOptions {
  planId?: string;               // Unique plan ID for tracing
  maxRetries?: number;           // Max retries per step (default: 2)
  defaultTimeoutMs?: number;     // Timeout per step (default: 30000)
  concurrency?: number;          // Max parallel execution (default: 4)
  enableTrace?: boolean;         // Enable detailed tracing (default: true)
  abortController?: AbortController; // For cancellation
  
  // Lifecycle callbacks
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, result: unknown) => void;
  onNodeError?: (nodeId: string, error: string) => void;
}
```

### PlannerConfig

```typescript
interface PlannerConfig {
  llm: LLMClient;                // LLM client for plan generation
  tools: Record<string, Tool>;   // Available tools
  schemaHint?: string;           // Custom schema hint for LLM
  debug?: boolean;               // Enable debug logging
  maxRetries?: number;           // Plan generation retries (default: 3)
  temperature?: number;          // LLM temperature (default: 0.3)
  additionalContext?: string;    // Extra context for planning
}
```

## 🛠️ Tool Interface

Tools must implement this interface:

```typescript
interface Tool {
  id: string;                    // Unique tool ID
  name?: string;                 // Human-readable name
  description?: string;          // Tool description
  inputSchema?: Record<string, unknown>;  // Input validation schema
  outputSchema?: Record<string, unknown>; // Output validation schema
  execute: (params: AnyObject, context?: AnyObject) => Promise<unknown> | unknown;
}
```

### Example Tool

```typescript
const weatherTool: Tool = {
  id: 'fetch_weather',
  description: 'Fetch weather data for a city',
  inputSchema: {
    city: { type: 'string', description: 'City name' },
    units: { type: 'string', enum: ['celsius', 'fahrenheit'], default: 'celsius' }
  },
  outputSchema: {
    temperature: { type: 'number' },
    condition: { type: 'string' }
  },
  execute: async ({ city, units = 'celsius' }) => {
    const response = await fetch(`/api/weather?city=${city}&units=${units}`);
    return response.json();
  }
};
```

## 📊 Execution Tracing

Every execution produces a comprehensive trace:

```typescript
interface ExecTrace {
  planId: string;
  executionMode: 'sequential' | 'dag' | 'graph';
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  
  entries: ExecTraceEntry[];  // One per node executed
  
  statistics: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    skippedSteps: number;
    cancelledSteps: number;
  };
  
  contextSnapshot?: Record<string, unknown>; // Final context state
}

interface ExecTraceEntry {
  nodeId: string;
  stepId?: string;           // Original step ID (before loop expansion)
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'cancelled';
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  error?: string;
  input?: unknown;
  output?: unknown;
  retryCount: number;
  toolName?: string;
}
```

## 🎯 Best Practices

### 1. Plan Design

- **Keep steps focused**: Each step should do one thing well
- **Use meaningful IDs**: Make step IDs descriptive for easier debugging
- **Leverage dependencies**: In DAG mode, use `depends_on` to express parallelism
- **Validate inputs**: Define `inputSchema` for runtime type safety

### 2. Error Handling

- **Set appropriate timeouts**: Different tools need different timeout values
- **Use retry logic wisely**: Not all failures benefit from retries
- **Handle failures gracefully**: Consider using conditional steps to handle errors

### 3. Performance

- **Use DAG mode for parallelism**: When steps are independent, DAG mode is faster
- **Control concurrency**: Set appropriate concurrency limits for loops
- **Minimize context size**: Only store necessary data in context

### 4. Debugging

- **Enable tracing**: Always use tracing in development
- **Use lifecycle callbacks**: Hook into `onNodeStart`, `onNodeComplete`, `onNodeError`
- **Check trace statistics**: Quick way to identify bottlenecks

## 🔍 Troubleshooting

### "Deadlock detected" Error

**Cause**: Circular dependencies in DAG mode
**Solution**: Review `depends_on` fields to ensure acyclic dependency graph

### "Unknown tool" Error

**Cause**: Referenced tool not registered in tool registry
**Solution**: Ensure all tools used in plan are registered

### "Timeout" Error

**Cause**: Step exceeded configured timeout
**Solution**: Increase `defaultTimeoutMs` or set per-step timeout

### "Validation failed" Error

**Cause**: Input doesn't match Zod schema
**Solution**: Check input parameters match expected schema

## 🧪 Testing

```typescript
import { demo, samplePlans, sampleTools, createPlanExecutor } from './core/plan-execute';

// Run built-in demo
await demo();

// Test with sample plans
const executor = createPlanExecutor(sampleTools);

test('sequential execution', async () => {
  const { context, trace } = await executor.execute(
    samplePlans.sequential,
    { input: { url: 'https://test.com' } }
  );
  
  expect(trace.statistics.successfulSteps).toBe(2);
  expect(context.summary1).toBeDefined();
});

test('parallel execution', async () => {
  const { context, trace } = await executor.execute(
    samplePlans.parallel,
    { input: { urls: ['https://a.com', 'https://b.com'] } }
  );
  
  expect(trace.statistics.successfulSteps).toBe(4);
  expect(context.sentiment1).toBeDefined();
  expect(context.sentiment2).toBeDefined();
});
```

## 📖 API Reference

See inline TypeScript documentation for complete API details.

## 🚀 Roadmap

- [ ] Workflow pause/resume support
- [ ] Plan optimization (automatic parallelization)
- [ ] Visual plan editor
- [ ] Plan templates library
- [ ] Streaming execution updates
- [ ] Plan caching and memoization
- [ ] Advanced error recovery strategies

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please ensure:
1. All types are properly validated with Zod
2. Comprehensive test coverage
3. Clear documentation
4. Follow existing code style
