# 🎯 Conversation Modes Guide

## Overview

LLMSider offers three distinct conversation modes, each optimized for different use cases. Choose the right mode to match your workflow and get the best results from AI assistance.

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

## 🎯 Guided Mode

### What is Guided Mode?

**Step-by-step task breakdown with approval workflow** - AI creates a plan, you approve each step before execution.

```
You: Create a research note on machine learning

AI: I'll break this into steps:
    ✓ Step 1: Create note structure
      → Create file with frontmatter and sections
      [Approve] [Modify] [Skip]
    
    Step 2: Research key concepts
      → Search and summarize ML basics
      [Approve] [Modify] [Skip]
      
    Step 3: Add references
      → Compile sources and citations
      [Approve] [Modify] [Skip]
```

### Characteristics

| Aspect | Description |
|--------|-------------|
| **Speed** | ⚡⚡ Moderate (requires approvals) |
| **Complexity** | Moderate to high |
| **Control** | ⭐⭐⭐ High user control |
| **Tool Use** | Step-by-step with approval |
| **Best For** | Learning, complex tasks, safety |

### When to Use

**✅ Great For:**
- Complex multi-step tasks
- Learning new workflows
- Tasks requiring validation
- Sensitive operations
- Educational purposes
- Ensuring accuracy

**❌ Not Ideal For:**
- Simple questions
- Quick lookups
- Time-sensitive tasks
- Highly repetitive operations

### Approval Workflow

#### Step Structure

```
┌─────────────────────────────────────┐
│ Step 1: Create project structure    │
├─────────────────────────────────────┤
│ Description:                        │
│ Creates folders and template files  │
│                                     │
│ Tools to use:                       │
│ • create_folder                     │
│ • create_file                       │
│                                     │
│ Expected outcome:                   │
│ Project structure with /src, /docs  │
└─────────────────────────────────────┘
[Approve] [Modify] [Skip] [Cancel All]
```

#### Approval Options

| Action | Description | Use When |
|--------|-------------|----------|
| **Approve** | Execute step as planned | Step looks correct |
| **Modify** | Edit step details | Need adjustments |
| **Skip** | Skip this step | Not needed |
| **Cancel All** | Stop entire plan | Change of plans |

### Example Workflows

#### 1. Complex Research Task
```
You: Research top 10 AI companies and create detailed notes

AI: Plan (5 steps):
    1. Search for top AI companies [Web search]
    2. For each company, gather data [10× Web fetch]
    3. Create note files [10× Create file]
    4. Add company details [10× Edit file]
    5. Create summary index [Create file]
    
    Step 1: Search for top AI companies
    [Approve] → Executing...
    Found: OpenAI, Anthropic, DeepMind...
    
    Step 2: Gather data for OpenAI
    [Approve] → Fetching website...
    Data collected: founding year, products...
```

#### 2. Code Refactoring
```
You: Refactor this codebase for better maintainability

AI: Plan (4 steps):
    1. Analyze current structure
    2. Identify improvement areas
    3. Create refactored version
    4. Update tests
    
    Each step shows:
    - What will be changed
    - Why it's being changed
    - Expected impact
```

---

## 🤖 Agent Mode

### What is Agent Mode?

**Autonomous AI with full tool access** - AI decides which tools to use and executes them automatically to accomplish your goal.

```
You: Research and compare top 5 programming languages

AI: [Tool: Google Search] Searching for programming language rankings...
    [Tool: Fetch Content] Getting Stack Overflow data...
    [Tool: Fetch Content] Getting GitHub statistics...
    [Tool: Create File] Creating comparison-chart.md...
    [Tool: Edit File] Adding language comparison table...
    
    ✓ Created comprehensive comparison with latest data!
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

**Automatic Tool Selection:**
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

#### Guided Mode
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
Add complexity → Guided
  ↓ (if confident)
Full automation → Agent
```

**Task Checklist:**
```
□ Does it require tools?
  → No: Normal | Yes: Continue
□ Do I need to review each step?
  → Yes: Guided | No: Continue
□ Can AI decide autonomously?
  → Yes: Agent | No: Guided
```

### 🚀 Workflow Optimization

**Normal Mode Tips:**
1. Keep requests clear and specific
2. One task per message
3. Use follow-up questions
4. Reference previous context

**Guided Mode Tips:**
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

**Guided Mode:**
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

**Tools not working in Guided:**
1. ✅ Ensure tools are enabled
2. ✅ Check permissions
3. ✅ Approve step fully
4. ✅ Review error messages

**Agent too aggressive:**
1. ✅ Reduce tool permissions
2. ✅ Use Guided mode instead
3. ✅ Set clearer constraints
4. ✅ Monitor and stop if needed

**Guided mode stuck:**
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

### Guided Mode Examples

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

**Questions?** [GitHub Issues](https://github.com/llmsider/obsidian-llmsider/issues) | [Discord](https://discord.gg/llmsider)
