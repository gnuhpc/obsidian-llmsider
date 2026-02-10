import { Logger } from '../../utils/logger';
import { FormatUtils } from '../utils/format-utils';
import { I18nManager } from '../../i18n/i18n-manager';

/**
 * PromptBuilder - 负责构建各种提示词
 * 从 plan-execute-processor.ts 提取，用于减少主文件大小
 */
export class PromptBuilder {
	constructor(
		private i18n: I18nManager,
		private getAvailableToolsDescriptionFn: () => Promise<string>
	) {}

	/**
	 * Detect the language of the user query (zh or en)
	 */
	private detectLanguage(text: string): 'zh' | 'en' {
		if (!text || text.trim().length === 0) {
			return 'en'; // Default to English
		}
		
		// Count Chinese characters
		const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
		const totalChars = text.replace(/\s/g, '').length;
		
		if (chineseChars && totalChars > 0) {
			const chineseRatio = chineseChars.length / totalChars;
			// If more than 30% Chinese characters, consider it Chinese
			if (chineseRatio > 0.3) {
				return 'zh';
			}
		}
		
		return 'en';
	}

	/**
	 * Check if a tool is available in the available tools description
	 */
	private checkToolAvailability(availableTools: string, toolName: string): boolean {
		// Check if the tool name appears in the available tools description
		// Look for patterns like "### tool_name" or "**tool_name**"
		const patterns = [
			new RegExp(`###\\s*${toolName}\\b`, 'i'),
			new RegExp(`\\*\\*${toolName}\\*\\*`, 'i'),
			new RegExp(`"tool":\\s*"${toolName}"`, 'i'),
			new RegExp(`'tool':\\s*'${toolName}'`, 'i')
		];
		return patterns.some(pattern => pattern.test(availableTools));
	}

	/**
	 * Build Plan-Execute prompt based on phase
	 */
	async buildPlanExecutePrompt(
		userQuery: string, 
		phase: 'plan' | 'execute' = 'plan', 
		executionResults?: unknown[]
	): Promise<string> {
		const startTime = Date.now();
		Logger.debug('⏱️ [START] buildPlanExecutePrompt for phase:', phase, new Date().toISOString());

		if (phase === 'plan') {
			const toolsStartTime = Date.now();
			Logger.debug('⏱️ [START] Getting available tools description...', new Date().toISOString());
			const availableTools = await this.getAvailableToolsDescriptionFn();
			const toolsEndTime = Date.now();
			Logger.debug(`⏱️ [END] Getting available tools took ${toolsEndTime - toolsStartTime}ms`);
			Logger.debug(`Available tools length: ${availableTools.length} characters`);
			
			const buildPromptStartTime = Date.now();
			Logger.debug('⏱️ [START] Building plan phase prompt...', new Date().toISOString());
			const prompt = this.buildPlanPhasePrompt(userQuery, availableTools);
			const buildPromptEndTime = Date.now();
			Logger.debug(`⏱️ [END] Building plan phase prompt took ${buildPromptEndTime - buildPromptStartTime}ms`);
			
			const endTime = Date.now();
			Logger.debug(`⏱️ [TOTAL] buildPlanExecutePrompt completed in ${endTime - startTime}ms`);
			return prompt;
		} else {
			// Execute phase is now handled by sequential step execution
			// This method is kept for backward compatibility but should not be used
			Logger.warn('buildPlanExecutePrompt with execute phase is deprecated. Use buildSimpleFinalAnswerPrompt instead.');
			const finalPrompt = await this.buildSimpleFinalAnswerPrompt(userQuery, executionResults || []);
			return finalPrompt;
		}
	}

	/**
	 * Build Plan Agent prompt - responsible for tool call planning
	 */
	buildPlanPhasePrompt(userQuery: string, availableTools: string, contextInfo?: string, executionMode: 'sequential' | 'dag' = 'sequential'): string {
		const startTime = Date.now();
		Logger.debug('⏱️ [START] buildPlanPhasePrompt...', new Date().toISOString());
		Logger.debug(`User query length: ${userQuery.length}, Available tools length: ${availableTools.length}, Has context: ${!!contextInfo}, Execution mode: ${executionMode}`);
		
		// Detect language from user query
		const language = this.detectLanguage(userQuery);
		Logger.debug(`[PromptBuilder] Detected language: ${language} for query: "${userQuery.substring(0, 50)}..."`);
		
		// Add language instruction at the beginning
		const languageInstruction = language === 'zh' 
			? '\n⚠️ 重要：请用中文回复所有说明、原因和解释。Use Chinese for all descriptions, reasons, and explanations.\n\n'
			: '\n⚠️ Important: Please reply in English for all descriptions, reasons, and explanations.\n\n';
		
		// Add context information if provided
		const contextSection = contextInfo ? `\n# ${language === 'zh' ? '当前上下文信息' : 'Current Context Information'}
${contextInfo}\n` : '';
		
		// Use different prompt structure based on execution mode
		if (executionMode === 'dag') {
			// DAG mode: Structured prompt for complex parallel execution planning
			const dagHeader = language === 'zh' 
				? '║            DAG 模式 - 并行执行计划生成器                      ║'
				: '║            DAG MODE - PARALLEL EXECUTION PLANNER              ║';
			const roleDesc = language === 'zh'
				? '你是一个并行执行计划生成器。创建一个优化的计划，让独立的步骤并发运行。'
				: 'You are a parallel execution plan generator. Create an optimized plan where independent steps run concurrently.';
			
			const result = `╔════════════════════════════════════════════════════════════════╗
${dagHeader}
╚════════════════════════════════════════════════════════════════╝
${languageInstruction}
${this.buildAvailableToolsListSection(availableTools)}

┌─────────────────────────────────────────────────────────────────┐
│ 📌 YOUR ROLE                                                    │
└─────────────────────────────────────────────────────────────────┘
${roleDesc}

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ CRITICAL REQUIREMENT #1 - outputSchema MANDATORY             │
└─────────────────────────────────────────────────────────────────┘
EVERY STEP MUST INCLUDE "outputSchema" FIELD!

✓ Correct format:
  {"step_id": "step1", "tool": "...", "input": {...}, "outputSchema": {...}, "reason": "...", "dependencies": []}
  
✗ Missing outputSchema causes FAILURE:
  {"step_id": "step1", "tool": "...", "input": {...}, "reason": "...", "dependencies": []}  ← BROKEN!

WHY: Dependencies cannot be resolved without knowing each step's output structure.

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ CRITICAL REQUIREMENT #2 - WEB SEARCH WORKFLOW                │
└─────────────────────────────────────────────────────────────────┘
Search tools MUST be followed by fetch_web_content!

✓ Correct: step1: search → step2: fetch_web_content → step3: analyze
✗ Wrong:   step1: search → step2: analyze (Missing full content!)

WHY: Search results only contain snippets. You MUST fetch the full content for accurate analysis.

┌─────────────────────────────────────────────────────────────────┐
│ 📋 EXECUTION MODE CHARACTERISTICS                               │
└─────────────────────────────────────────────────────────────────┘
DAG (Directed Acyclic Graph) Mode = Steps with dependencies form a graph
• Parallel execution of independent steps
• Faster overall completion time
• Complex dependency tracking
• Requires careful analysis of data dependencies
• Perfect for multi-source data gathering and aggregation

${contextSection}
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 DEPENDENCY ANALYSIS PROCESS (STEP-BY-STEP)                  │
└─────────────────────────────────────────────────────────────────┘

For EACH step, follow this checklist:

STEP 1️⃣: What does this step DO?
  └─ Describe the action (search, fetch, analyze, create, etc.)

STEP 2️⃣: What INPUT does it need?
  └─ List specific data requirements (query string, URLs, file paths, etc.)

STEP 3️⃣: What OUTPUT will it produce?
  └─ Copy outputSchema from tool definition (MANDATORY!)

STEP 4️⃣: Where does the input come from?
  ┌─────────────────────────────────────┐
  │ From user query directly?           │
  │   → dependencies: []                │
  │                                     │
  │ From previous step's output?        │
  │   → dependencies: ["stepX"]         │
  │                                     │
  │ From multiple previous steps?       │
  │   → dependencies: ["stepX", "stepY"]│
  └─────────────────────────────────────┘

STEP 5️⃣: Can this step start immediately?
  ✓ YES → dependencies: []
  ✗ NO  → dependencies: ["step1", "step2", ...]

┌─────────────────────────────────────────────────────────────────┐
│ 🎯 DEPENDENCY CLASSIFICATION RULES                              │
└─────────────────────────────────────────────────────────────────┘

[CATEGORY A] INDEPENDENT STEPS (dependencies: [])
  ✓ Searching different topics/keywords
  ✓ Fetching from different known URLs
  ✓ Viewing different files/folders
  ✓ Any step using only user-provided data

[CATEGORY B] SEQUENTIAL DEPENDENCIES (dependencies: ["stepX"])
  ✓ Using {{stepX.fieldName}} in input (direct access, no .output)
  ✓ Analyzing data from previous step
  ✓ Creating file with generated content

[CATEGORY C] MULTI-DEPENDENCY (dependencies: ["stepX", "stepY"])
  ✓ Comparing outputs from multiple steps
  ✓ Aggregating results from parallel searches
  ✓ Creating summary from multiple sources

[CATEGORY D] COMMON MISTAKES (AVOID!)
  ✗ Using {{stepX.output}} but dependencies: [] ← BROKEN!
  ✗ Omitting dependencies field entirely ← BROKEN!
  ✗ Circular dependencies (stepA→stepB→stepA) ← INVALID!

┌─────────────────────────────────────────────────────────────────┐
│ 📤 OUTPUT FORMAT SPECIFICATION                                  │
└─────────────────────────────────────────────────────────────────┘

Output ONLY valid JSON (no markdown, no explanations, no code blocks):

{
  "steps": [
    {
      "step_id": "step1",
      "tool": "tool_name",
      "input": {...},
      "outputSchema": {"type": "object", "properties": {...}},
      "reason": "why this step",
      "dependencies": []
    }
  ]
}

⚠️ CRITICAL RULES FOR outputSchema:
  1. EVERY step MUST have "outputSchema" field - NO EXCEPTIONS!
  2. outputSchema.type MUST be "object" (NEVER "array" or "string")
  3. Wrap arrays: {"type": "object", "properties": {"results": {"type": "array"}}}
  4. Wrap strings: {"type": "object", "properties": {"content": {"type": "string"}}}
  5. Copy from tool definition, ensuring object wrapping!

${this.buildSearchToolPriorityGuidance(availableTools)}

🎯 URL PASSING TO fetch_web_content - SIMPLIFIED:
  ✅ RECOMMENDED: Pass entire results array → {"urls": "{{step1.results}}"}
  ✅ The tool AUTOMATICALLY extracts url/link/href fields from objects
  ❌ FORBIDDEN: {"url": "{{step1.output.results}}"} (NEVER use .output layer)
  
🔧 HOW IT WORKS:
  • Search returns: {results: [{url: "...", title: "...", body: "..."}]}
  • You pass: {"urls": "{{step1.results}}"}
  • Tool extracts: ["url1", "url2", ...] automatically
  
💡 ALTERNATIVE PATTERNS (if needed):
  Pattern A: Field already contains clean URLs
    step1: some_tool → {"urls": ["url1", "url2"]}
    step2: fetch_web_content → {"url": "{{step1.urls}}"}
  
  Pattern B: Manual extraction (only if tool doesn't support auto-extract)
    step2: fetch_web_content → {"url": ["{{step1.results[0].url}}", ...]}

🚨 KEY INSIGHT: fetch_web_content intelligently handles both clean URLs and objects!

DEPENDENCY STRUCTURE:
  step1: dependencies: []           (independent search)
  step2: dependencies: ["step1"]    (uses search results from step1)
  step3: dependencies: ["step2"]    (uses fetched content from step2)

❌ WRONG PATTERNS:
  • Skip fetch step → Only URLs/snippets, no full content ← BROKEN!
  • Using .output: {{step1.output.results}} → NEVER use .output layer!
  • Missing field name: {{step1}} when tool returns object → Must specify field like {{step1.results}}

✓ CORRECT PATTERNS:
  • Complete field reference: {{step1.results}} (tool handles extraction)
  • Pure URL fields: {{step1.urls}} (when field already contains clean URLs)

Exception: Skip fetch only if NO fetch tool is available.

┌─────────────────────────────────────────────────────────────────┐
│ 🔗 DATA PASSING RULES (CRITICAL) - DIRECT ACCESS FORMAT        │
└─────────────────────────────────────────────────────────────────┘

🚨 IMPORTANT: Use DIRECT ACCESS format (NO .output layer!)

✓ CORRECT TEMPLATE SYNTAX:
  ✓ {{stepX.fieldName}}  - Access object field directly
  ✓ {{stepX}}            - Access entire output (for arrays/primitives)
  ✗ {{stepX.output.fieldName}} - WRONG! NEVER use .output layer!
  ✗ {{stepX.output}}           - WRONG! NEVER use .output layer!

You MUST check the tool's outputSchema to know how to reference data:

CASE 1: Tool returns an OBJECT
  Definition: "outputSchema": {"type": "object", "properties": {"results": ...}}
  Reference: {{stepX.results}}
  Example: fetch_web_content returns {results: [...]}, so use {{stepX.results}}

CASE 2: Tool returns an ARRAY (Direct Array)
  Definition: "outputSchema": {"type": "array", ...}
  Reference: {{stepX}}
  Example: bing_search returns ["url1", "url2"], so use {{stepX}}
  ⚠️ CRITICAL: If tool returns an array directly, DO NOT use .results or any other field!

CASE 3: Tool returns a STRING
  Definition: "outputSchema": {"type": "string", ...}
  Reference: {{stepX}}
  Example: get_timedate returns "2025-12-06", so use {{stepX}}

⚠️ NEVER GUESS! Look at the "Available Tools" definition for each tool.

SCHEMA MATCHING EXAMPLES:

Example 1: Object Field (Wrapped Array) → Array Parameter
  Step A: outputSchema: {"type": "object", "properties": {"results": {"type": "array"}}}
  Step B: inputSchema expects "url" (array)
  ✓ CORRECT: {"url": "{{stepA.results}}"}
  ✗ WRONG:   {"url": "{{stepA.output.results}}"} (NEVER use .output)

Example 2: Direct Array → Array Parameter
  Step A: outputSchema: {"type": "array", "items": {"type": "string"}}
  Step B: inputSchema expects "url" (array)
  ✓ CORRECT: {"url": "{{stepA}}"}
  ✗ WRONG:   {"url": "{{stepA.output}}"} (NEVER use .output)

Example 3: Object Field → String Parameter
  Step A: outputSchema: {"type": "object", "properties": {"content": {"type": "string"}}}
  Step B: inputSchema expects "task" (string)
  ✓ CORRECT: {"task": "Analyze {{stepA.content}}"}
  ✗ WRONG:   {"task": "Analyze {{stepA.output.content}}"} (NEVER use .output)

COMMON MISTAKES TO AVOID:
  ✗ {{stepA}} when tool returns object → Must specify field: {{stepA.results}}
  ✗ {{stepA.results}} when tool returns array → No .results field: use {{stepA}}
  ✗ {{stepA.output.anything}} → NEVER use .output layer!
  ✓ ALWAYS CHECK outputSchema TYPE!


┌─────────────────────────────────────────────────────────────────┐
│ 📁 FILE ORGANIZATION PATTERNS (FOR NOTE MANAGEMENT TASKS)      │
└─────────────────────────────────────────────────────────────────┘

PATTERN A: Organize Files INTO Folders (Batch Mode - Recommended)
  step1: view → {"path": "", "recursive": true}, dependencies: []
         Returns all files including subfolders
  step2: generate_content → dependencies: ["step1"]
         Output: [{"folder": "Category1", "files": ["f1.md", "f2.md"]}, ...]
  step3: move_note (batch) → {"moves": "{{step2.content}}"}, dependencies: ["step2"]
         ONE call moves all files (faster than for_each!)

PATTERN B: Move Files OUT of Folders
  step1: view → {"path": "", "recursive": true}, dependencies: []
  step2: generate_content → dependencies: ["step1"]
         Extract folder→files mapping
  step3: for_each with move_note → dependencies: ["step2"]
         Move files to root
  step4: generate_content → dependencies: ["step1"]
         Extract folder names (parallel with step3)
  step5: for_each with delete_note → dependencies: ["step3", "step4"]
         Delete folders AFTER files moved (⚠️ CRITICAL: Both dependencies!)

PATTERN C: Dynamic Categorization (for_each)
  step1: view → List files
  step2: generate_content → Output JSON array for iteration
  step3: for_each → Loop over categories dynamically

WHY BATCH MODE > for_each:
  ✓ ONE tool call instead of N iterations
  ✓ Faster execution (no loop overhead)
  ✓ Better UI responsiveness
  ✓ Simpler plan structure

❌ WRONG PATTERNS (AVOID):
  • Creating folders explicitly (move_note creates them automatically!)
  • Moving one file per step (use batch mode!)
  • Deleting folders before moving files (data loss!)

┌─────────────────────────────────────────────────────────────────┐
│ ✍️ CONTENT CREATION RULE (AUTO-HANDLED)                        │
└─────────────────────────────────────────────────────────────────┘

ℹ️ NOTE: Content generation is AUTOMATICALLY handled by the system

✓ SIMPLIFIED WORKFLOW:
  step1: create → System auto-generates content internally

✗ DON'T EXPLICITLY PLAN:
  step1: generate_content → Not needed in plan
  step2: create → Redundant step

WHY: The create tool automatically invokes content generation when needed.
     Explicit generate_content steps add unnecessary complexity to plans.

RULE: Just use create directly. System handles content generation automatically.


┌─────────────────────────────────────────────────────────────────┐
│ 📚 EXAMPLE 1: Multi-Source Data Comparison (Parallel Pattern)  │
└─────────────────────────────────────────────────────────────────┘

TASK: "Compare Confluent and Snowflake earnings"

THINKING PROCESS:
  step1 (search Confluent): User query → Independent → dependencies: []
  step2 (search Snowflake): User query → Independent → dependencies: []
  step3 (fetch Confluent): step1 URLs → dependencies: ["step1"]
  step4 (fetch Snowflake): step2 URLs → dependencies: ["step2"]
  step5 (compare): step3 + step4 content → dependencies: ["step3", "step4"]
  step6 (create file): step5 content → dependencies: ["step5"]

EXECUTION TIMELINE:
  t0: step1, step2 start in PARALLEL
  t1: step1 completes → step3 starts
  t2: step2 completes → step4 starts
  t3: step3, step4 both complete → step5 starts
  t4: step5 completes → step6 starts
  t5: step6 completes → DONE

OUTPUT:
{
  "steps": [
    {
      "step_id": "step1",
      "tool": "duckduckgo_text_search",
      "input": {"query": "Confluent earnings report 2024"},
      "outputSchema": {"type": "object", "properties": {"results": {"type": "array"}}},
      "reason": "Search for Confluent financial data",
      "dependencies": []
    },
    {
      "step_id": "step2",
      "tool": "bing_search",
      "input": {"query": "Snowflake earnings report 2024"},
      "outputSchema": {"type": "object", "properties": {"results": {"type": "array"}}},
      "reason": "Search for Snowflake financial data",
      "dependencies": []
    },
    {
      "step_id": "step3",
      "tool": "fetch_web_content",
      "input": {"url": "{{step1.results}}"},
      "outputSchema": {"type": "object", "properties": {"results": {"type": "array"}}},
      "reason": "Fetch Confluent report content",
      "dependencies": ["step1"]
    },
    {
      "step_id": "step4",
      "tool": "fetch_web_content",
      "input": {"url": "{{step2.results}}"},
      "outputSchema": {"type": "object", "properties": {"results": {"type": "array"}}},
      "reason": "Fetch Snowflake report content",
      "dependencies": ["step2"]
    },
    {
      "step_id": "step5",
      "tool": "generate_content",
      "input": {"task": "Compare {{step3.results}} and {{step4.results}}"},
      "outputSchema": {"type": "object", "properties": {"content": {"type": "string"}}},
      "reason": "Generate comparison analysis",
      "dependencies": ["step3", "step4"]
    },
    {
      "step_id": "step6",
      "tool": "create",
      "input": {"path": "Financial_Comparison.md", "file_text": "{{step5.content}}"},
      "outputSchema": {"type": "object", "properties": {"path": {"type": "string"}}},
      "reason": "Save comparison to file",
      "dependencies": ["step5"]
    }
  ]
}

KEY INSIGHTS:
  • step1 & step2: Parallel (no dependencies)
  • step3 & step4: Can start independently after respective searches
  • step5: Waits for BOTH fetch steps (multi-dependency)
  • Every step has outputSchema with object wrapping
  • Data references use field names directly: {{stepX.results}}

┌─────────────────────────────────────────────────────────────────┐
│ 📚 EXAMPLE 2: File Organization with Dynamic Categorization    │
└─────────────────────────────────────────────────────────────────┘

TASK: "Organize root notes into folders"

THINKING PROCESS:
  step1 (view): List all files → Independent → dependencies: []
  step2 (analyze): Categorize from step1 → dependencies: ["step1"]
  step3 (for_each loop): Move based on step2 → dependencies: ["step2"]

CRITICAL: Use for_each when category count is unknown at plan time.

OUTPUT:
{
  "steps": [
    {
      "step_id": "step1",
      "tool": "view",
      "input": {"path": "", "recursive": true},
      "outputSchema": {"type": "object", "properties": {"files": {"type": "array"}}},
      "reason": "View all files in root directory",
      "dependencies": []
    },
    {
      "step_id": "step2",
      "tool": "generate_content",
      "input": {
        "task": "Analyze {{step1.files}} and output ONLY a JSON array: [{\"folder\": \"Category1\", \"files\": [\"f1.md\"]}, {\"folder\": \"Category2\", \"files\": [\"f2.md\"]}]"
      },
      "outputSchema": {"type": "object", "properties": {"content": {"type": "string"}}},
      "reason": "Generate categorization array",
      "dependencies": ["step1"]
    },
    {
      "step_id": "step3",
      "tool": "for_each",
      "input": {
        "items": "{{step2.content}}",
        "tool_name": "move_note",
        "tool_input": {
          "source_paths": "{{item.files}}",
          "target_folder": "{{item.folder}}"
        }
      },
      "outputSchema": {"type": "object", "properties": {"results": {"type": "array"}}},
      "reason": "Loop over categories and move files",
      "dependencies": ["step2"]
    }
  ]
}

KEY INSIGHTS:
  • step2 outputs JSON array (not object with "categories" key)
  • step3 uses for_each → Dynamic iteration
  • {{item.files}}, {{item.folder}} → Access current iteration data
  • for_each automatically handles all categories
  • move_note creates target folders if they don't exist

┌─────────────────────────────────────────────────────────────────┐
│ 🛠️ AVAILABLE TOOLS                                             │
└─────────────────────────────────────────────────────────────────┘
${availableTools}

┌─────────────────────────────────────────────────────────────────┐
│ 💬 USER QUERY                                                   │
└─────────────────────────────────────────────────────────────────┘
${userQuery}

╔════════════════════════════════════════════════════════════════╗
║ 🚀 NOW GENERATE THE PARALLEL EXECUTION PLAN                    ║
╚════════════════════════════════════════════════════════════════╝

Apply dependency analysis process for each step. Output ONLY valid JSON.

FINAL CHECKLIST (Verify before output):
✓ Every step has "outputSchema" field
✓ Dependencies correctly reflect data flow
✓ Independent steps have dependencies: []
✓ Search steps followed by fetch steps
✓ Data references use DIRECT ACCESS format: {{stepX.fieldName}} (NO .output layer!)
✓ Output is pure JSON (no markdown, no explanations)
✓ Format matches examples exactly`;
			
			const endTime = Date.now();
			Logger.debug(`⏱️ [END] buildPlanPhasePrompt (DAG mode) completed in ${endTime - startTime}ms`);
			return result;
			
		} else {
			// Sequential mode: Structured prompt for simple step-by-step planning
			const seqHeader = language === 'zh' 
				? '║         顺序模式 - 简单的逐步计划器                           ║'
				: '║         SEQUENTIAL MODE - SIMPLE STEP-BY-STEP PLANNER         ║';
			const roleDesc = language === 'zh'
				? '你是一个任务分解和计划生成器。将复杂任务拆解为简单、顺序执行的步骤。'
				: this.i18n.t('planExecute.planningPrompt.roleDescription');
			
			const result = `╔════════════════════════════════════════════════════════════════╗
${seqHeader}
╚════════════════════════════════════════════════════════════════╝
${languageInstruction}
${this.buildAvailableToolsListSection(availableTools)}

┌─────────────────────────────────────────────────────────────────┐
│ 📌 YOUR ROLE                                                    │
└─────────────────────────────────────────────────────────────────┘
${roleDesc}

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ CRITICAL REQUIREMENT #1 - outputSchema MANDATORY             │
└─────────────────────────────────────────────────────────────────┘
EVERY STEP MUST INCLUDE "outputSchema" FIELD!

🚨 CRITICAL: COPY EXACT outputSchema from tool definition below!
  • Find the tool in "Available Tools" section
  • Locate its "### Output Schema (JSON):" section
  • Copy-paste the EXACT JSON structure
  • DO NOT modify, simplify, or guess the schema!

✓ Correct - EXACT COPY from tool definition:
  Tool definition shows: "outputSchema": {"type": "object", "properties": {"count": ..., "urls": ...}}
  Your plan: "outputSchema": {"type": "object", "properties": {"count": ..., "urls": ...}}
  
✗ WRONG - Modified/simplified schema:
  Tool definition shows: {"count": number, "urls": array}
  Your plan: {"results": array}  ← BROKEN! Field name mismatch!

WHY: Next step templates like {{step1.urls}} will FAIL if schema is wrong.

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ CRITICAL REQUIREMENT #2 - WEB SEARCH WORKFLOW                │
└─────────────────────────────────────────────────────────────────┘
Search tools MUST be followed by fetch_web_content!

✓ Correct: step1: search → step2: fetch_web_content → step3: analyze
✗ Wrong:   step1: search → step2: analyze (Missing full content!)

WHY: Search results only contain snippets. You MUST fetch the full content for accurate analysis.

┌─────────────────────────────────────────────────────────────────┐
│ 📋 EXECUTION MODE CHARACTERISTICS                               │
└─────────────────────────────────────────────────────────────────┘
Sequential Mode = Steps execute one-by-one in order (step1 → step2 → step3)
• Simple, reliable, easy to understand
• No parallel execution
• Each step waits for previous step to finish
• Perfect for linear workflows

${contextSection}
┌─────────────────────────────────────────────────────────────────┐
│ 📐 CORE PLANNING RULES                                          │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.rule1')}
${this.i18n.t('planExecute.planningPrompt.rule2')}

┌─────────────────────────────────────────────────────────────────┐
│ 📋 OUTPUT SCHEMA REQUIREMENTS (MANDATORY)                       │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.rule3')}
${this.i18n.t('planExecute.planningPrompt.rule3a')}
${this.i18n.t('planExecute.planningPrompt.rule3b')}

┌─────────────────────────────────────────────────────────────────┐
│ 🔗 DATA REFERENCE FORMAT                                        │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.rule4')}
${this.i18n.t('planExecute.planningPrompt.rule4a')}
${this.i18n.t('planExecute.planningPrompt.rule4b')}
${this.i18n.t('planExecute.planningPrompt.rule4c')}
${this.i18n.t('planExecute.planningPrompt.rule4d')}

┌─────────────────────────────────────────────────────────────────┐
│ 📁 FILE OPERATIONS                                              │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.rule5')}
${this.i18n.t('planExecute.planningPrompt.rule5a')}
${this.i18n.t('planExecute.planningPrompt.rule5b')}

┌─────────────────────────────────────────────────────────────────┐
│ 🌐 WEB CONTENT WORKFLOW (SEARCH → FETCH → GENERATE)            │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.rule6')}
${this.i18n.t('planExecute.planningPrompt.rule6a')}
${this.i18n.t('planExecute.planningPrompt.rule6b')}
${this.i18n.t('planExecute.planningPrompt.rule6c')}
${this.i18n.t('planExecute.planningPrompt.rule6d')}
${this.i18n.t('planExecute.planningPrompt.rule6e')}
${this.i18n.t('planExecute.planningPrompt.rule6f')}
${this.i18n.t('planExecute.planningPrompt.rule6g')}

┌─────────────────────────────────────────────────────────────────┐
│ 📝 CONTENT GENERATION PATTERN                                   │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.rule7')}
${this.i18n.t('planExecute.planningPrompt.rule7a')}
${this.i18n.t('planExecute.planningPrompt.rule7b')}
${this.i18n.t('planExecute.planningPrompt.rule7c')}
${this.i18n.t('planExecute.planningPrompt.rule7d')}
${this.i18n.t('planExecute.planningPrompt.rule7e')}
${this.i18n.t('planExecute.planningPrompt.rule7f')}

┌─────────────────────────────────────────────────────────────────┐
│ 📅 DATE PARAMETERS                                              │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.rule8')}
${this.i18n.t('planExecute.planningPrompt.rule8a')}
${this.i18n.t('planExecute.planningPrompt.rule8b')}
${this.i18n.t('planExecute.planningPrompt.rule8c')}
${this.i18n.t('planExecute.planningPrompt.rule8d')}

┌─────────────────────────────────────────────────────────────────┐
│ 🔍 SEARCH ENGINE DIVERSITY                                      │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.rule9')}
${this.i18n.t('planExecute.planningPrompt.rule9a')}
${this.i18n.t('planExecute.planningPrompt.rule9b')}

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ CRITICAL: EXTRACT ENTITIES FROM USER QUERY                  │
└─────────────────────────────────────────────────────────────────┘

🚨 NEVER generate empty parameters {}! You MUST extract information from user query.

STEP 1: Identify entities in user query
STEP 2: Convert entities to required parameter format
STEP 3: Fill parameters with actual values

ENTITY EXTRACTION EXAMPLES:

Example 1: Stock Symbol Extraction (Chinese/English)
  User: "预测特斯拉股价" or "Analyze Tesla stock"
  ├─ Entity: Tesla/特斯拉
  ├─ Convert: Tesla → Ticker symbol "TSLA"
  └─ Parameter: {"tickers": ["TSLA"]}
  ✓ CORRECT: {"tool": "tickertick_get_ticker_news", "input": {"tickers": ["TSLA"]}}
  ✗ WRONG: {"tool": "tickertick_get_ticker_news", "input": {}}

Example 2: Multiple Companies
  User: "比较苹果和微软" (Compare Apple and Microsoft)
  ├─ Entities: Apple/苹果, Microsoft/微软
  ├─ Convert: Apple→AAPL, Microsoft→MSFT
  └─ Parameter: {"tickers": ["AAPL", "MSFT"]}
  ✓ CORRECT: {"input": {"tickers": ["AAPL", "MSFT"]}}

Example 3: Search Keywords
  User: "搜索人工智能新闻" (Search AI news)
  ├─ Keywords: 人工智能 (Artificial Intelligence)
  └─ Parameter: {"query": "人工智能" or "AI"}
  ✓ CORRECT: {"tool": "web_search", "input": {"query": "人工智能"}}

Example 4: Note Creation
  User: "创建一个关于Python的笔记" (Create a note about Python)
  ├─ Topic: Python
  ├─ Title: "Python笔记" or "Python Notes"
  └─ Content: Generate based on topic
  ✓ CORRECT: {"tool": "create_file", "input": {"path": "Python笔记.md", "file_text": "# Python\\n\\n..."}}
  ✗ WRONG: tool name "create" (should be "create_file")

COMMON STOCK TICKER MAPPINGS (Use these when you see company names):
  • Tesla/特斯拉 → TSLA
  • Apple/苹果 → AAPL
  • Microsoft/微软 → MSFT
  • Google/谷歌 → GOOGL
  • Amazon/亚马逊 → AMZN
  • Meta/Facebook → META
  • NVIDIA/英伟达 → NVDA
  • Alibaba/阿里巴巴 → BABA
  • Tencent/腾讯 → TCEHY
  • If unknown: use search_symbol tool first to find ticker!

PARAMETER VALIDATION RULES:
1. Check tool's inputSchema for REQUIRED fields
2. Empty {} is ONLY valid if tool has NO required parameters
3. Use EXACT tool name from Available Tools (no abbreviations!)
4. If unsure about parameter value, extract from user query or use default

┌─────────────────────────────────────────────────────────────────┐
│ � OUTPUT FORMAT                                                 │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.outputFormatDesc')}

{
  "steps": [
    {
      "step_id": "step1",
      "tool": "${this.i18n.t('planExecute.planningPrompt.templateToolName')}",
      "input": {...},
      "outputSchema": {"type": "object", "properties": {...}},
      "reason": "${this.i18n.t('planExecute.planningPrompt.templateStepReason')}"
    }
  ]
}

┌─────────────────────────────────────────────────────────────────┐
│ 🗂️ OBSIDIAN VAULT CONTEXT                                      │
└─────────────────────────────────────────────────────────────────┘

${this.i18n.t('planExecute.planningPrompt.vaultContextDescription')}
${this.i18n.t('planExecute.planningPrompt.vaultRule1')}
${this.i18n.t('planExecute.planningPrompt.vaultExample1')}
${this.i18n.t('planExecute.planningPrompt.vaultExample2')}
${this.i18n.t('planExecute.planningPrompt.vaultExample3')}

┌─────────────────────────────────────────────────────────────────┐
│ 🛠️ AVAILABLE TOOLS                                             │
└─────────────────────────────────────────────────────────────────┘
${availableTools}

┌─────────────────────────────────────────────────────────────────┐
│ 💬 USER QUERY                                                   │
└─────────────────────────────────────────────────────────────────┘
${userQuery}

╔════════════════════════════════════════════════════════════════╗
║ 🚀 GENERATE PLAN                                               ║
╚════════════════════════════════════════════════════════════════╝

${this.i18n.t('planExecute.planningPrompt.finalChecklist')}

${this.i18n.t('planExecute.planningPrompt.generatePlanAndExecute')}`;

			
			const endTime = Date.now();
			Logger.debug(`⏱️ [END] buildPlanPhasePrompt (sequential mode) completed in ${endTime - startTime}ms`);
			return result;
		}
	}

	/**
	 * Build simplified final answer prompt (no Execution Trace)
	 */
	async buildSimpleFinalAnswerPrompt(userQuery: string, executionResults: unknown[]): Promise<string> {
		// Enhanced safe JSON serialization with depth limiting
		const safeJsonStringify = (obj: unknown, space?: number): string => {
			const seen = new WeakSet();
			const maxDepth = 10; // Limit recursion depth
			const maxStringLength = 1000; // Limit string length

			const replacer = (key: string, value: unknown, currentDepth = 0): unknown => {
				// Limit recursion depth
				if (currentDepth > maxDepth) {
					return '[Max Depth Reached]';
				}

				// Skip circular references
				if (typeof value === 'object' && value !== null) {
					if (seen.has(value)) {
						return '[Circular Reference]';
					}
					seen.add(value);
				}

				// Skip functions
				if (typeof value === 'function') {
					return '[Function]';
				}

				// Truncate very long strings
				if (typeof value === 'string' && value.length > maxStringLength) {
					return value.substring(0, maxStringLength) + '...[truncated]';
				}

				// Skip problematic DOM and React elements
				if (typeof value === 'object' && value !== null) {
					if (value.constructor) {
						const constructorName = value.constructor.name;
						if (constructorName === 'HTMLElement' || constructorName.includes('Element')) {
							return '[DOM Element]';
						}
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const v = value as any;
					if (v._owner || v._store || v.$$typeof) {
						return '[React Component]';
					}
					// Skip very large objects
					if (Object.keys(value).length > 50) {
						return '[Large Object - ' + Object.keys(value).length + ' keys]';
					}
				}

				return value;
			};

			try {
				return JSON.stringify(obj, replacer, space);
			} catch (error) {
				Logger.error('JSON stringify error:', error);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const o = obj as any;
				return JSON.stringify({
					error: 'Failed to serialize execution results',
					message: error instanceof Error ? error.message : 'Unknown error',
					resultCount: Array.isArray(o?.executions) ? o.executions.length : 'unknown'
				}, null, space);
			}
		};

		// Simplified execution results - only include essential data
		const simplifiedResults = executionResults.map((result, index) => {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const r = result as any;
				return {
					step: index + 1,
					step_id: r.step_id || `step_${index + 1}`,
					tool: r.tool_name || 'unknown',
					success: r.success !== false,
					result_summary: FormatUtils.summarizeToolResult(r.tool_result, r.tool_name),
					timestamp: r.timestamp || Date.now()
				};
			} catch (error) {
				return {
					step: index + 1,
					error: 'Failed to process result',
					message: error instanceof Error ? error.message : 'Unknown error'
				};
			}
		});

		const executionsJson = safeJsonStringify({
			executions: simplifiedResults
		}, 2);

		return `# ${this.i18n.t('planExecute.finalAnswerPrompt.role')}
${this.i18n.t('planExecute.finalAnswerPrompt.roleDescription')}

# ${this.i18n.t('planExecute.finalAnswerPrompt.input')}
${this.i18n.t('planExecute.finalAnswerPrompt.toolExecutionResults')}
${executionsJson}

# ${this.i18n.t('planExecute.finalAnswerPrompt.rules')}
1. ${this.i18n.t('planExecute.finalAnswerPrompt.requirement1')}
2. ${this.i18n.t('planExecute.finalAnswerPrompt.requirement2')}
3. ${this.i18n.t('planExecute.finalAnswerPrompt.requirement3')}
4. ${this.i18n.t('planExecute.finalAnswerPrompt.requirement4')}

# ${this.i18n.t('planExecute.finalAnswerPrompt.originalUserQuestion')}
${userQuery}

${this.i18n.t('planExecute.finalAnswerPrompt.answerBasedOnResults')}`;
	}

	/**
	 * Build content generation prompt for file creation tools
	 * Enhanced version from main processor with support for different tool types
	 */
	async buildContentGenerationPrompt(
		step: unknown, 
		filePath: string, 
		contentTemplate: string, 
		toolName: string,
		originalUserQuery: string,
		planSteps: unknown[],
		buildCollectedInformationFn: () => string,
		buildExecutionContextFn: () => string
	): Promise<string> {
		let taskDescription: string;
		let instructions: string;
		
		if (toolName === 'create') {
			taskDescription = this.i18n.t('planExecute.contentGeneration.contentGenerationTask');
			instructions = this.i18n.t('planExecute.contentGeneration.contentGenerationInstructions');
		} else if (toolName === 'insert') {
			taskDescription = this.i18n.t('planExecute.contentGeneration.insertTaskDescription', { path: filePath });
			instructions = this.i18n.t('planExecute.contentGeneration.insertInstructions');
		} else if (toolName === 'str_replace' || toolName === 'sed') {
			taskDescription = this.i18n.t('planExecute.contentGeneration.replaceTaskDescription', { path: filePath });
			instructions = this.i18n.t('planExecute.contentGeneration.replaceInstructions');
		} else {
			taskDescription = this.i18n.t('planExecute.contentGeneration.contentAppendTask', { filePath });
			instructions = this.i18n.t('planExecute.contentGeneration.contentAppendInstructions');
		}

		// Check if this is the final create step
		const currentStepIndex = planSteps.findIndex((s: any) => s.step_id === (step as any).step_id);
		const isFinalCreateStep = currentStepIndex === planSteps.length - 1 && toolName === 'create';

		if (isFinalCreateStep) {
			// For final create step: focus on original user task with collected info as supporting context
			const collectedInfoSection = buildCollectedInformationFn();
			
			return `# ${taskDescription}

Your primary goal is to complete the following user task:

## ${this.i18n.t('planExecute.contentGeneration.userTaskSection', { defaultValue: 'User\'s Original Task' })}
${originalUserQuery || this.i18n.t('planExecute.contentGeneration.noUserTask', { defaultValue: 'No task description available' })}

${collectedInfoSection}

## ${this.i18n.t('planExecute.contentGeneration.fileInformationSection')}
- ${this.i18n.t('planExecute.contentGeneration.filePath', { path: filePath })}
- ${this.i18n.t('planExecute.contentGeneration.fileGoal', { goal: (step as any).reason || this.i18n.t('planExecute.contentGeneration.defaultGoal') })}
- ${this.i18n.t('planExecute.contentGeneration.toolType', { tool: toolName })}

## ${this.i18n.t('planExecute.contentGeneration.requirementsSection')}
${instructions}

1. ${this.i18n.t('planExecute.contentGeneration.requirement1')}
2. ${this.i18n.t('planExecute.contentGeneration.requirement2')}
3. ${this.i18n.t('planExecute.contentGeneration.requirement3')}
4. ${this.i18n.t('planExecute.contentGeneration.requirement4')}
5. ${this.i18n.t('planExecute.contentGeneration.requirement5')}
6. ${this.i18n.t('planExecute.contentGeneration.requirement6')}
7. ${this.i18n.t('planExecute.contentGeneration.requirement7')}

${this.i18n.t('planExecute.contentGeneration.generateCompleteContent')}`;
		} else {
			// For other steps (preparation): prioritize step purpose and user task
			const executionContextSection = buildExecutionContextFn();
			
			return `# ${taskDescription}

## ${this.i18n.t('planExecute.contentGeneration.currentStepPurpose', { defaultValue: 'Current Step Purpose' })}
${(step as any).reason || this.i18n.t('planExecute.contentGeneration.defaultGoal')}

## ${this.i18n.t('planExecute.contentGeneration.userTaskSection', { defaultValue: 'User\'s Original Task' })}
${originalUserQuery || this.i18n.t('planExecute.contentGeneration.noUserTask', { defaultValue: 'No task description available' })}

${executionContextSection}

## ${this.i18n.t('planExecute.contentGeneration.fileInformationSection')}
- ${this.i18n.t('planExecute.contentGeneration.filePath', { path: filePath })}
- ${this.i18n.t('planExecute.contentGeneration.toolType', { tool: toolName })}

## ${this.i18n.t('planExecute.contentGeneration.requirementsSection')}
${instructions}

1. ${this.i18n.t('planExecute.contentGeneration.requirement1')}
2. ${this.i18n.t('planExecute.contentGeneration.requirement2')}
3. ${this.i18n.t('planExecute.contentGeneration.requirement3')}
4. ${this.i18n.t('planExecute.contentGeneration.requirement4')}
5. ${this.i18n.t('planExecute.contentGeneration.requirement5')}
6. ${this.i18n.t('planExecute.contentGeneration.requirement6')}
7. ${this.i18n.t('planExecute.contentGeneration.requirement7')}

			${toolName === 'create'
				? this.i18n.t('planExecute.contentGeneration.generateCompleteContent')
				: toolName === 'insert'
				? this.i18n.t('planExecute.contentGeneration.generateInsertContent')
				: (toolName === 'str_replace' || toolName === 'sed')
				? this.i18n.t('planExecute.contentGeneration.generateReplaceContent')
				: this.i18n.t('planExecute.contentGeneration.generateAppendContent')}`;
		}
	}

	/**
	 * Build search tool priority guidance based on available tools
	 */
	private buildSearchToolPriorityGuidance(availableTools: string): string {
		const hasEnhancedSearch = this.checkToolAvailability(availableTools, 'enhanced_search');
		const hasWebSearch = this.checkToolAvailability(availableTools, 'web_search');
		const hasDuckDuckGo = this.checkToolAvailability(availableTools, 'duckduckgo_text_search');
		const hasFetchWebContent = this.checkToolAvailability(availableTools, 'fetch_web_content');

		if (!hasEnhancedSearch && !hasWebSearch && !hasDuckDuckGo) {
			return '';
		}

		const toolPriority: string[] = [];
		if (hasEnhancedSearch) {
			toolPriority.push('  1️⃣ **PREFERRED**: Use \'enhanced_search\' - Multi-engine aggregation with better quality');
		}
		if (hasWebSearch) {
			const priority = hasEnhancedSearch ? '2️⃣' : '1️⃣';
			toolPriority.push(`  ${priority} **FALLBACK**: Use \'web_search\' ${hasEnhancedSearch ? 'only if enhanced_search is unavailable' : ''}`);
		}
		if (hasDuckDuckGo) {
			const priority = hasEnhancedSearch && hasWebSearch ? '3️⃣' : hasEnhancedSearch || hasWebSearch ? '2️⃣' : '1️⃣';
			toolPriority.push(`  ${priority} **SPECIALIZED**: Use \'duckduckgo_*\' tools for specific search types (news/images/videos)`);
		}

		if (toolPriority.length === 0) {
			return '';
		}

		let guidance = '🎯 TOOL SELECTION PRIORITY:\n';
		guidance += toolPriority.join('\n') + '\n';

		if (hasFetchWebContent) {
			guidance += '\n⚠️ MANDATORY WORKFLOW - Web Search Tools MUST be followed by fetch_web_content:\n';
			guidance += '  📋 **APPLICABLE TOOLS**:\n';
			guidance += '     • Any tool with "search" in its name (e.g., web_search, google_search, tavily_search, duckduckgo_*)\n';
			guidance += '     • Any tool that returns a list of URLs or links\n';
			guidance += '\n';
			guidance += '  ⚡ **REQUIRED PATTERN**: For ANY search/URL-returning tool:\n';
			guidance += '     Step N: <web_search_tool> → Returns URLs\n';
			guidance += '     Step N+1: fetch_web_content → Get actual content from the search results\n';
			guidance += '     ⚠️ SYSTEM WILL NOT AUTO-CORRECT MISSING FETCH STEPS. YOU MUST INCLUDE THEM.\n';
			guidance += '     Step N+2: analyze/generate → Process the fetched content\n';
			guidance += '\n';
			guidance += '  📊 **DATA PASSING REQUIREMENT**:\n';
			guidance += '     • Pass the ENTIRE results array to fetch_web_content\n';
			guidance += '     • ✅ **CORRECT (if array)**: {"urls": "{{stepN}}"}\n';
			guidance += '     • ✅ **CORRECT (if object)**: {"urls": "{{stepN.results}}"}\n';
			guidance += '     • ❌ **FORBIDDEN**: Manual indexing like ["{{stepN.results[0].url}}", ...]\n';
			guidance += '     • ❌ **FORBIDDEN**: Using .output layer like {{stepN.output.results}}\n';
			guidance += '\n';
			guidance += '  ❌ **FORBIDDEN**: Using web search results directly for analysis WITHOUT fetch_web_content\n';
			guidance += '  ✅ **CORRECT**: Always insert fetch_web_content between search and analysis steps\n';
		} else {
			guidance += '\n⚠️ NOTE: fetch_web_content is NOT available. Search results will contain URLs/snippets only.\n';
		}

		return guidance;
	}

	/**
	 * Build available tools list section
	 * Extracts tool names from the available tools description
	 */
	private buildAvailableToolsListSection(availableTools: string): string {
		// Extract tool names from the description
		// Look for patterns like "## tool_name"
		const toolNamePattern = /^## (.+)$/gm;
		const toolNames: string[] = [];
		let match;
		
		while ((match = toolNamePattern.exec(availableTools)) !== null) {
			toolNames.push(match[1].trim());
		}

		if (toolNames.length === 0) {
			return '';
		}

		let section = '┌─────────────────────────────────────────────────────────────────┐\n';
		section += '│ 🚨 CRITICAL: AVAILABLE TOOLS - USE ONLY THESE TOOLS!           │\n';
		section += '└─────────────────────────────────────────────────────────────────┘\n\n';
		section += `You have access to EXACTLY ${toolNames.length} tool${toolNames.length > 1 ? 's' : ''}:\n\n`;
		
		toolNames.forEach((name, index) => {
			section += `  ${index + 1}. ${name}\n`;
		});
		
		section += '\n⚠️ DO NOT use any tool names not listed above!\n';
		section += '⚠️ If you need a tool that is not available, explain the limitation to the user.\n\n';
		
		return section;
	}
}