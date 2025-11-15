# 💬 Quick Chat Guide

## Overview

Quick Chat provides instant, inline AI assistance without leaving your note. Press `Cmd+/` anywhere in your document to get AI help right where you need it.

---

## 🎯 What is Quick Chat?

### Inline AI Assistant

Quick Chat is like having GitHub Copilot's chat feature in Obsidian:

```markdown
Your text here|  ← Press Cmd+/
              ↓
┌──────────────────────────────────┐
│ 💬 Quick Chat                    │
│ ─────────────────────────────    │
│ Ask AI to edit or continue...   │
│                                  │
│ [Send]                     [✕]  │
└──────────────────────────────────┘
```

### vs Regular Chat

| Feature | Quick Chat | Regular Chat |
|---------|------------|--------------|
| **Location** | Inline | Sidebar |
| **Context** | Current note | Manual selection |
| **Usage** | Quick edits | Long conversations |
| **Result** | Inline diff | Chat messages |
| **Best For** | Writing flow | Research, planning |

---

## 🚀 Getting Started

### Enable Quick Chat

1. **Open Settings**
   - Settings → LLMSider → Quick Chat

2. **Enable Feature**
   ```yaml
   Enable Quick Chat: ✓
   Trigger Key: Cmd+/
   Model: GPT-4
   ```

3. **Configure Hotkey** (optional)
   - Settings → Hotkeys
   - Search "Quick Chat"
   - Set your preferred key

### First Use

1. **Open any note**
2. **Place cursor where you want help**
3. **Press `Cmd+/`**
4. **Type your request**
5. **Press `Enter` or click Send**

---

## 💡 Usage Examples

### Example 1: Continue Writing

**Before:**
```markdown
The benefits of regular exercise include
```

**Quick Chat:**
```
Continue this paragraph with 3 more benefits
```

**After:**
```markdown
The benefits of regular exercise include improved cardiovascular
health, better mental well-being, and increased energy levels
throughout the day.
```

### Example 2: Refine Text

**Before:**
```markdown
This thing is really good for productivity
```

**Quick Chat:**
```
Make this more professional and specific
```

**After:**
```markdown
This tool significantly enhances productivity by streamlining
workflow automation and reducing manual task overhead.
```

### Example 3: Add Code

**Before:**
```markdown
Here's how to validate email:
```

**Quick Chat:**
```
Add a TypeScript function to validate email addresses
```

**After:**
```markdown
Here's how to validate email:

```typescript
function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```
```

### Example 4: Summarize Section

**Before:**
```markdown
[Long paragraph about AI history...]
[Long paragraph about current applications...]
[Long paragraph about future trends...]
```

**Quick Chat:**
```
Summarize the above in 2 sentences
```

**After:**
```markdown
AI has evolved from theoretical concepts in the 1950s to 
practical applications across industries today. Current 
trends indicate continued growth in automation and 
decision-making support.
```

---

## 🎨 Visual Diff Preview

### Diff Display

When AI suggests changes, you see a visual diff:

```diff
- Old text that will be removed
+ New text that will be added
  Unchanged text remains as is
```

**Actions:**
- **Tab** - Accept changes
- **Esc** - Reject changes
- **Click outside** - Dismiss

### Preview Example

```markdown
Original:
  This is a simple example of text editing.

Quick Chat: "Make it more engaging"

Diff Preview:
- This is a simple example of text editing.
+ Here's an exciting demonstration of dynamic text 
+ transformation!

[Press Tab to apply or Esc to cancel]
```

---

## ⚙️ Configuration

### Basic Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Turn Quick Chat on/off | Off |
| **Trigger Key** | Keyboard shortcut | Cmd+/ |
| **Model** | AI model to use | GPT-3.5 |
| **Max Tokens** | Response length limit | 500 |
| **Temperature** | Creativity level | 0.7 |

### Advanced Options

**Context Window:**
```yaml
Include Lines Before: 5   # Lines above cursor
Include Lines After: 5    # Lines below cursor
Include Whole Note: false # Or use entire note
```

**Diff Rendering:**
```yaml
Show Diff: true          # Visual diff preview
Auto-Apply: false        # Apply without confirmation
Syntax Highlighting: true # Color code diffs
```

**Response Timing:**
```yaml
Show Typing Indicator: true
Stream Response: true    # Real-time updates
Timeout: 30000          # 30 seconds
```

---

## 🔑 Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Open Quick Chat** | `Cmd+/` | Show input box |
| **Send Request** | `Enter` | Submit query |
| **New Line** | `Shift+Enter` | Add line in input |
| **Accept Diff** | `Tab` | Apply changes |
| **Reject Diff** | `Esc` | Discard changes |
| **Close** | `Esc` | Close Quick Chat |

### Custom Shortcuts

Set in: **Settings → Hotkeys → LLMSider**

```yaml
Open Quick Chat: Cmd+/
Accept Changes: Tab
Reject Changes: Esc
```

---

## 💡 Pro Tips

### 🎯 Effective Prompts

**Be Specific:**
```
❌ "improve this"
✅ "make this more formal and add technical details"
```

**Use Action Verbs:**
```
✅ "expand"
✅ "summarize"
✅ "rewrite in first person"
✅ "add code examples"
✅ "translate to Spanish"
```

**Provide Context:**
```
✅ "continue this list with 3 more items in the same style"
✅ "summarize the above paragraph for a technical audience"
```

### 🚀 Workflow Integration

**Writing Flow:**
1. Draft quickly without editing
2. Use Quick Chat for refinement
3. Continue writing

**Code Documentation:**
1. Write code
2. Quick Chat: "add JSDoc comments"
3. Quick Chat: "add usage example"

**Translation Workflow:**
1. Write in native language
2. Quick Chat: "translate to English"
3. Quick Chat: "adjust tone for business"

### 🎨 Style Consistency

**Create Style Presets:**
```
"make this match the tone of [previous section]"
"format as bullet points like above"
"use the same technical level as this article"
```

---

## 🔧 Advanced Features

### Context Management

**Smart Context Detection:**
- Automatically includes surrounding text
- Detects code blocks
- Understands list structures

**Manual Context:**
```
Quick Chat: "Based on the heading above, write an intro"
Quick Chat: "Expand on the previous bullet point"
```

### Multi-Turn Edits

**Iterative Refinement:**
```
1. Quick Chat: "Add a conclusion"
   [Accept]

2. Quick Chat: "Make the conclusion more actionable"
   [Accept]

3. Quick Chat: "Add a call-to-action"
   [Accept]
```

### Template-Based Requests

**Common Patterns:**
```
"Add section: [heading]"
"Create table: [columns]"
"Format as: [style]"
"Insert: [type]"
```

---

## 🎯 Use Cases

### 1. Content Enhancement

**Improve Clarity:**
```markdown
Original: "The thing does stuff really well"
Prompt: "Make this clear and specific"
Result: "The automated workflow tool processes data 
         efficiently and reduces manual effort"
```

**Add Examples:**
```markdown
Original: "There are many benefits"
Prompt: "Add 3 specific examples"
Result: "Benefits include faster processing (50% time 
         savings), reduced errors (99% accuracy), and 
         improved user satisfaction"
```

### 2. Code Assistance

**Add Documentation:**
```typescript
// Original
function processData(data: any[]) {
  return data.map(x => x * 2);
}

// Quick Chat: "add JSDoc with examples"
/**
 * Processes data by doubling each value
 * @param data - Array of numbers to process
 * @returns Processed array with doubled values
 * @example
 * processData([1, 2, 3]) // Returns [2, 4, 6]
 */
function processData(data: number[]): number[] {
  return data.map(x => x * 2);
}
```

**Refactor Code:**
```javascript
// Original
let x = data.filter(d => d.value > 0).map(d => d.name);

// Quick Chat: "refactor for readability"
const activeItems = data.filter(item => item.value > 0);
const itemNames = activeItems.map(item => item.name);
```

### 3. Content Organization

**Create Outlines:**
```markdown
Topic: "Machine Learning Basics"
Prompt: "Create a 5-section outline with brief descriptions"

Result:
1. Introduction to ML
   Overview of machine learning concepts and applications
2. Types of Learning
   Supervised, unsupervised, and reinforcement learning
3. Common Algorithms
   Linear regression, decision trees, neural networks
...
```

**Format Lists:**
```markdown
Original: 
apples, oranges, bananas, grapes

Prompt: "format as prioritized list with descriptions"

Result:
1. **Apples** - Crisp and versatile fruit, high in fiber
2. **Oranges** - Citrus fruit rich in vitamin C
3. **Bananas** - Convenient, potassium-rich snack
4. **Grapes** - Small, sweet fruit perfect for snacking
```

---

## 🐛 Troubleshooting

### Common Issues

**Quick Chat not appearing:**
1. ✅ Verify Quick Chat is enabled
2. ✅ Check hotkey assignment
3. ✅ Restart Obsidian
4. ✅ Review console for errors

**No response:**
1. ✅ Check model is selected
2. ✅ Verify API key is valid
3. ✅ Check internet connection
4. ✅ Try shorter prompt

**Diff not applying:**
1. ✅ Ensure cursor is in edit mode
2. ✅ Try manual copy/paste
3. ✅ Check file permissions
4. ✅ Restart Obsidian

**Slow responses:**
1. ✅ Use faster model (GPT-3.5)
2. ✅ Reduce max tokens
3. ✅ Limit context window
4. ✅ Check API status

### Debug Mode

**Enable Logging:**
1. Settings → LLMSider → Advanced
2. Enable Debug Mode
3. Check console (`Cmd+Option+I`)
4. Look for Quick Chat logs

---

## 📊 Performance Tips

### Speed Optimization

**Fast Model Selection:**
```yaml
# Fastest
Model: GPT-3.5 Turbo
Max Tokens: 200
Temperature: 0.3

# Balanced
Model: GPT-4
Max Tokens: 500
Temperature: 0.5

# Quality (slower)
Model: Claude 3 Opus
Max Tokens: 1000
Temperature: 0.7
```

**Context Reduction:**
```yaml
Include Lines: 3       # Instead of 10
Whole Note: false      # Don't include entire note
```

### Quality Optimization

**Better Results:**
```yaml
Model: GPT-4 / Claude 3
Max Tokens: 500+
Include Context: true
Temperature: 0.5-0.7
```

---

## 📚 Comparison

### Quick Chat vs Other Features

| Feature | Quick Chat | Autocomplete | Chat View |
|---------|------------|--------------|-----------|
| **Trigger** | Manual | Automatic | Manual |
| **Location** | Inline | Inline | Sidebar |
| **Interaction** | Request-based | Suggestion-based | Conversation |
| **Speed** | Medium | Fast | Varies |
| **Best For** | Edits | Completions | Complex tasks |

### When to Use What

**Use Quick Chat when:**
- ✅ Making targeted edits
- ✅ Need AI to understand context
- ✅ Want visual diff preview
- ✅ Staying in writing flow

**Use Autocomplete when:**
- ✅ Writing continuously
- ✅ Want instant suggestions
- ✅ Completing common patterns
- ✅ Maximum speed needed

**Use Chat View when:**
- ✅ Complex multi-step tasks
- ✅ Need conversation history
- ✅ Using multiple tools
- ✅ Research and planning

---

## 📖 Related Guides

- [Autocomplete](autocomplete.md) - Inline completions
- [Selection Popup](selection-popup.md) - Right-click actions
- [Chat Interface](chat-interface.md) - Full chat features
- [Conversation Modes](conversation-modes.md) - Mode details

---

**Questions?** [GitHub Issues](https://github.com/llmsider/obsidian-llmsider/issues) | [Discord](https://discord.gg/llmsider)
