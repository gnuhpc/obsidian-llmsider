# 🎯 Conversation Modes Guide

## Overview

LLMSider offers two conversation modes plus a guided assist toggle, each optimized for different use cases. Choose the right mode and enable guided assist when you want step-by-step interaction.

---

## 🗣️ Normal Mode

### What is Normal Mode?

**Direct, immediate AI conversation** - like chatting with a knowledgeable assistant.

```
You: What are the benefits of meditation?
AI: Meditation offers several benefits including reduced stress,
    improved focus, better emotional regulation, and enhanced
    self-awareness. Research shows...
```

### Characteristics

| Aspect | Description |
|--------|-------------|
| **Speed** | ⚡⚡⚡ Instant responses |
| **Complexity** | Simple to moderate tasks |
| **Control** | Minimal user intervention |
| **Tool Use** | Limited (user-initiated only) |
| **Best For** | Q&A, brainstorming, quick tasks |

### When to Use

**✅ Great For:**
- Quick questions and answers
- Brainstorming ideas
- Explaining concepts
- Generating drafts
- Casual conversation
- Learning new topics

**❌ Not Ideal For:**
- Complex multi-step tasks
- Tasks requiring tool execution
- Research requiring multiple sources
- File manipulation

### Example Workflows

#### 1. Quick Research
```
You: Summarize quantum computing in simple terms

AI: Quantum computing is a type of computing that uses quantum
    mechanics principles... [provides summary]
```

#### 2. Content Generation
```
You: Write a professional email template for meeting requests

AI: Subject: Meeting Request - [Topic]
    Dear [Name],
    I hope this message finds you well...
```

#### 3. Brainstorming
```
You: Give me 10 unique blog post ideas about productivity

AI: 1. The 2-Minute Rule: How Small Actions Lead to Big Results
    2. Digital Minimalism: Simplifying Your Tech Stack
    ...
```

---

## 🎯 Guided Assist

### What is Guided Assist?

**A toggle inside Normal mode for interactive, step-by-step guidance**. The AI can ask focused follow-up questions, render explicit options, and request confirmation before sensitive actions.

```
You: Create a research note on machine learning

AI: I can help with that. First, I should create a file for the note.
    
    [Tool Suggestion]
    Tool: create_file
    Args: { path: "machine-learning.md", content: "# Machine Learning\n\n" }
    
    [Approve] [Reject]

You: [Approve]

AI: File created. Now, should I search for some key concepts to add?
```

### Characteristics

| Aspect | Description |
|--------|-------------|
| **Speed** | ⚡⚡ Moderate (requires approvals) |
| **Complexity** | Moderate to high |
| **Control** | ⭐⭐⭐ High user control |
| **Tool Use** | Guided suggestions and confirmations |
| **Best For** | Learning, complex tasks, safety |

### When to Use

**✅ Great For:**
- Tasks where you want full control
- Learning how the AI uses tools
- Sensitive file operations
- Ensuring accuracy at each step
- Collaborative problem solving

**❌ Not Ideal For:**
- Fully autonomous tasks
- Speed (Agent mode is faster)
- Simple Q&A (Normal mode is better)

### Workflow

1. **User Request**: You ask for something.
2. **AI Suggestion**: AI suggests a tool call or asks a clarifying question.
3. **User Action**: You approve the tool or answer the question.
4. **Execution**: Tool runs (if approved).
5. **Loop**: AI analyzes the result and suggests the next step.

### Example Workflows

#### 1. Controlled Research
```
You: Find information about the latest React version.

AI: I'll search for "React latest version release notes".
    [Tool: google_search]
    [Approve] [Reject]

You: Approve.

AI: Found React 19. Now I'll fetch the official blog post.
    [Tool: fetch_url]
    [Approve] [Reject]
```

#### 2. Safe File Editing
```
You: Refactor this file.

AI: I'll read the file first.
    [Tool: read_file]
    [Approve]

AI: I see the code. I'll apply the changes now.
    [Tool: edit_file]
    [Approve]
```

---

## 🤖 Agent Mode

### What is Agent Mode?

**Autonomous Plan & Execute** - The AI analyzes your request, generates a full plan (Sequential or DAG), and executes it automatically.

```
You: Research and compare top 5 programming languages

AI: [Plan Generated]
    1. Search for rankings (Parallel)
    2. Fetch details for Python (Parallel)
    3. Fetch details for JavaScript (Parallel)
    ...
    6. Create comparison report (Sequential)

    [Executing Step 1...]
    [Executing Step 2...]
    ...
    
    ✓ Task Complete!
```

### Characteristics

| Aspect | Description |
|--------|-------------|
| **Speed** | ⚡⚡⚡ Fast (no approval needed) |
| **Complexity** | High - handles anything |
| **Control** | ⭐ Low (autonomous) |
| **Tool Use** | Automatic with all tools |
| **Best For** | Research, automation, data |

### When to Use

**✅ Great For:**
- Research and data gathering
- Repetitive tasks
- Multi-tool workflows
- Comprehensive analysis
- Automation
- Time-saving operations

**❌ Not Ideal For:**
- Sensitive file operations
- Learning new workflows
- Tasks requiring human judgment
- Destructive operations

### Tool Execution

#### Execution Modes

Agent Mode supports two execution strategies (configurable in Settings):

1. **Sequential Mode (Default)**
   - Steps run one after another
   - Safer and easier to debug
   - Stops if a step fails

2. **DAG Mode (Parallel)**
   - Independent steps run simultaneously
   - Faster for complex tasks
   - Example: Searching 5 different topics at once

#### Automatic Tool Selection
```
Goal: "Create weekly report from project notes"

AI decides:
1. search_vault("project notes")      → Find relevant notes
2. read_file("meeting-notes.md")      → Read content
3. google_search("industry trends")   → Get context
4. create_file("weekly-report.md")    → Create report
5. edit_file(add_chart_data)          → Add visualizations
```

**Progress Indicators:**
```
[⏳] Searching vault... (search_vault)
[✓] Found 15 relevant notes
[⏳] Fetching web data... (google_search)
[✓] Retrieved industry trends
[⏳] Creating report... (create_file)
[✓] Report created: weekly-report.md
```

### Example Workflows

#### 1. Comprehensive Research
```
You: Research AI safety and create a literature review

AI: [📊 Plan] Breaking down into research tasks...
    
    [🔍 Tool: Google Search] "AI safety research papers 2024"
    [📄 Tool: Fetch Content] arxiv.org/paper1...
    [📄 Tool: Fetch Content] arxiv.org/paper2...
    [📝 Tool: Create File] ai-safety-review.md
    [✏️ Tool: Edit File] Adding introduction...
    [✏️ Tool: Edit File] Adding key findings...
    [✏️ Tool: Edit File] Adding references...
    
    ✅ Created comprehensive review with 20 sources!
```

#### 2. Data Analysis
```
You: Analyze this data and create visualizations

AI: [📊 Tool: Read File] Reading data.csv...
    [🔢 Tool: Calculate Stats] Computing statistics...
    [📈 Tool: Create Chart] Generating chart...
    [📝 Tool: Create File] analysis-report.md
    [📊 Tool: Embed Chart] Adding visualizations...
    
    ✅ Analysis complete with 5 charts!
```

#### 3. Content Pipeline
```
You: Create a blog post series about productivity (5 posts)

AI: [🎯 Plan] Creating 5-post series...
    
    Post 1: "Introduction to Productivity"
    [📝 Create] intro-productivity.md
    [🔍 Research] Best practices...
    [✏️ Write] 1000 words...
    [✅] Complete!
    
    Post 2: "Time Management Techniques"
    [📝 Create] time-management.md
    ...
    
    ✅ All 5 posts created with references!
```

---

## 🔄 Mode Comparison

### Feature Matrix

| Feature | Normal | Guided | Agent |
|---------|--------|--------|-------|
| **Tool Access** | Manual | Approved | Automatic |
| **Multi-step** | ❌ | ✅ | ✅ |
| **Approval Required** | N/A | ✅ | ❌ |
| **Speed** | Fast | Moderate | Fast |
| **Control** | None | High | Low |
| **Learning Curve** | Low | Medium | Low |
| **Safety** | ✅ High | ✅ High | ⚠️ Moderate |

### Task Suitability

| Task Type | Recommended Mode |
|-----------|------------------|
| **Simple Q&A** | Normal |
| **Complex Research** | Agent |
| **File Operations** | Guided |
| **Brainstorming** | Normal |
| **Multi-step Projects** | Guided |
| **Data Collection** | Agent |
| **Learning Workflows** | Guided |
| **Quick Drafts** | Normal |
| **Automation** | Agent |

---

## 📝 Message Action Buttons

When you hover over a message, a set of action buttons appears. Different message types display different buttons.

### User Message Actions

When you hover over **messages you sent**:

| Button | Icon | Function | Use Case |
|--------|------|----------|----------|
| **Copy Message** | 📋 | Copy message content to clipboard | Quickly copy your prompt |
| **Edit Message** | ✏️ | Edit this message (deletes this and all subsequent messages) | Fix typos or refine your question |

**Note**: Editing a user message retracts that message and all subsequent conversation. The content will be placed back in the input box for you to modify.

---

### Assistant Message Actions

When you hover over **AI assistant responses**:

#### Basic Actions (Available in All Modes)

| Button | Icon | Function | Use Case |
|--------|------|----------|----------|
| **Copy as Markdown** | 📋 | Copy response in Markdown format | Preserve formatting when copying |
| **Generate New Note** | 📄 | Create a new note file from this response | Save AI answer as permanent note |
| **Insert at Cursor** | ↙️ | Insert content at current editor cursor | Quickly add response to your note |
| **Regenerate** | 🔄 | Delete this response and regenerate | Retry when unsatisfied with answer |
| **Compare with Other Models** | 🔀 | Add another model for comparison | See multiple models' answers side-by-side |

#### Advanced Actions (Guided/Normal Mode Only)

When the message contains **text modification suggestions** or **selected text context**, additional buttons appear:

| Button | Icon | Function | Use Case |
|--------|------|----------|----------|
| **Apply Changes** | ✅ | Apply AI's suggested modifications to original file | Accept AI's editing suggestions |
| **Toggle Diff View** | 👁️ | Switch between rendered and diff comparison views | Review before/after changes |

**Note**: 
- Diff-related buttons only appear when there's a **single file reference**
- If the message references **multiple files**, these buttons are hidden (cannot determine which file to apply to)

---

### Usage Tips

#### 💡 Generate New Note
```
1. After AI responds, hover over the message
2. Click 📄 "Generate New Note"
3. AI automatically generates a title
4. Note is created and automatically opened
```

#### ✂️ Apply Code Changes
```
1. Select a piece of code
2. Right-click → "Add to LLMSider Context"
3. Ask AI: "Optimize this code"
4. After AI responds, click 👁️ to view diff
5. After confirmation, click ✅ "Apply Changes"
```

#### 🔄 Regeneration Strategy
```
If the first response isn't ideal:
1. Click 🔄 Regenerate
2. Or click 🔀 Compare with other models
3. Or click ✏️ to edit your question and re-ask
```

---

## ⚠️ Important Notes

### Editing Messages
- Editing a user message **deletes that message and all subsequent conversation**
- Content will be placed back in the input box for you to modify and resend
- This is an irreversible operation, use with caution

### Applying Changes
- Applying changes **directly modifies the original file**
- Recommended to click 👁️ to review diff before applying
- If needed, you can use Obsidian's version history to revert

### Insert at Cursor
- Ensure a **Markdown editor** is open
- If no active editor, will automatically switch to the most recent one
- Content is inserted at **current cursor position**

---

## ⚡ Quick Access

While there are no direct button shortcuts, you can quickly access via mouse hover:

```
Hover over message → Buttons appear → Click to execute
```

**Efficient Workflow:**
1. Move mouse to message
2. Buttons appear instantly
3. Click desired action
4. No need for right-click menu

---

## ⚙️ Configuration

### Changing Modes

**Method 1: Settings**
```
Settings → LLMSider → Conversation Modes
Default Mode: [Normal | Guided | Agent]
```

**Method 2: In Chat**
```
Currently: Normal Mode
[Switch to Guided] [Switch to Agent]
```

**Method 3: Per Session**
```
Right-click session → Change Mode
```

### Mode-Specific Settings

#### Normal Mode
```yaml
Max Message Length: 4000 tokens
History Context: 10 messages
Tool Confirmation: Always ask
```

#### Guided Assist
```yaml
Auto-approve Safe Tools: false
Show Tool Preview: true
Step Timeout: 60 seconds
Max Steps: 20
```

#### Agent Mode
```yaml
Tool Access: All enabled tools
Max Tool Calls: 50
Require Confirmation: Only destructive
Parallel Execution: true
```

---

## 💡 Best Practices

### 🎯 Mode Selection Strategy

**Start with Normal, Escalate as Needed:**
```
Simple task → Normal
  ↓ (if tools needed)
Add complexity → Guided Assist
  ↓ (if confident)
Full automation → Agent
```

**Task Checklist:**
```
□ Does it require tools?
  → No: Normal | Yes: Continue
□ Do I need to review each step?
  → Yes: Guided Assist | No: Continue
□ Can AI decide autonomously?
  → Yes: Agent | No: Guided Assist
```

### 🚀 Workflow Optimization

**Normal Mode Tips:**
1. Keep requests clear and specific
2. One task per message
3. Use follow-up questions
4. Reference previous context

**Guided Assist Tips:**
1. Review plan before approving
2. Modify steps if needed
3. Skip unnecessary steps
4. Learn the workflow

**Agent Mode Tips:**
1. Set clear end goals
2. Enable relevant tools only
3. Monitor progress
4. Stop if going off-track

### 🔒 Safety Guidelines

**Normal Mode:**
- ✅ Safe for all operations
- ✅ No automatic changes
- ✅ Full control

**Guided Assist:**
- ✅ Review before approval
- ✅ Skip destructive steps
- ✅ Modify if uncertain

**Agent Mode:**
- ⚠️ Monitor closely
- ⚠️ Backup important files
- ⚠️ Disable destructive tools
- ⚠️ Test with small tasks first

---

## 🐛 Troubleshooting

### Common Issues

**Mode not switching:**
1. ✅ Check setting is saved
2. ✅ Reload chat view
3. ✅ Restart Obsidian
4. ✅ Clear cache

**Tools not working in Guided Assist:**
1. ✅ Ensure tools are enabled
2. ✅ Check permissions
3. ✅ Approve step fully
4. ✅ Review error messages

**Agent too aggressive:**
1. ✅ Reduce tool permissions
2. ✅ Use Guided Assist instead
3. ✅ Set clearer constraints
4. ✅ Monitor and stop if needed

**Guided Assist seems stuck:**
1. ✅ Approve or skip step
2. ✅ Cancel and restart
3. ✅ Check tool status
4. ✅ Review debug logs

---

## 📚 Examples Library

### Normal Mode Examples

```markdown
1. "Explain quantum entanglement"
2. "Write a haiku about coding"
3. "What are the benefits of TypeScript?"
4. "Brainstorm 5 app ideas for students"
5. "Summarize this article: [paste URL]"
```

### Guided Assist Examples

```markdown
1. "Create a comprehensive project plan for a blog"
2. "Refactor this code with step-by-step explanations"
3. "Set up a new note-taking system"
4. "Migrate old notes to new structure"
5. "Research and document a technical topic"
```

### Agent Mode Examples

```markdown
1. "Research top 10 AI tools and create comparison table"
2. "Collect all TODO items from vault and prioritize"
3. "Create weekly report from meeting notes"
4. "Find and fix all broken links in vault"
5. "Generate dataset from web sources and analyze"
```

---

## 📖 Related Guides

- [Chat Interface](chat-interface.md) - Main chat features
- [Built-in Tools](built-in-tools.md) - Available tools
- [MCP Integration](mcp-integration.md) - External tools
- [Settings Guide](settings-guide.md) - Configuration

---

**Questions?** [GitHub Issues](https://github.com/gnuhpc/obsidian-llmsider/issues)
