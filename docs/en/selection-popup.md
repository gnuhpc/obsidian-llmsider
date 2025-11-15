# ✨ Selection Popup Guide

## Overview

The Selection Popup provides instant AI-powered actions on selected text. Simply select any text in your notes, right-click, and access powerful AI transformations without leaving your editor.

---

## 🎯 What is Selection Popup?

### Quick Text Actions

Transform selected text with AI in seconds:

```
1. Select text
2. Right-click (or use hotkey)
3. Choose action
4. Done!
```

### Available Actions

| Action | Description | Example |
|--------|-------------|---------|
| **Improve** | Enhance clarity and style | "good" → "excellent" |
| **Simplify** | Make text clearer | Technical → Simple |
| **Expand** | Add more detail | Short → Detailed |
| **Summarize** | Condense content | Long → Brief |
| **Fix Grammar** | Correct errors | Mistakes → Correct |
| **Change Tone** | Adjust formality | Casual → Professional |
| **Translate** | Convert language | English → Spanish |
| **Continue** | Generate more | Incomplete → Complete |

---

## 🚀 Getting Started

### Enable Selection Popup

1. **Open Settings**
   ```
   Settings → LLMSider → Selection Popup
   ```

2. **Enable Feature**
   ```yaml
   Enable Selection Popup: ✓
   Show on Right-Click: ✓
   Hotkey: Cmd+Shift+A (optional)
   ```

3. **Configure Actions**
   - Choose which actions to show
   - Customize prompts
   - Set default model

### Basic Usage

1. **Select Text**
   ```markdown
   [This text needs improvement] ← Select this
   ```

2. **Open Popup**
   - Right-click on selection
   - Or press hotkey (Cmd+Shift+A)
   - Popup appears near cursor

3. **Choose Action**
   ```
   ┌─────────────────────┐
   │ ✨ Improve Writing  │
   │ 📝 Simplify         │
   │ 🔍 Expand           │
   │ 📊 Summarize        │
   │ ✓ Fix Grammar       │
   │ 🎨 Change Tone      │
   │ 🌍 Translate        │
   │ ➡️ Continue         │
   └─────────────────────┘
   ```

4. **Apply Result**
   - AI processes selection
   - Shows inline diff
   - Accept (Tab) or Reject (Esc)

---

## 💡 Action Examples

### 1. Improve Writing

**Before:**
```markdown
This thing is really good and works well for doing stuff.
```

**After:**
```markdown
This tool demonstrates exceptional performance and effectively 
accomplishes its intended purpose with remarkable efficiency.
```

### 2. Simplify

**Before:**
```markdown
The implementation utilizes a sophisticated algorithmic approach 
to facilitate the optimization of computational resources.
```

**After:**
```markdown
The code uses a smart method to make the computer run faster.
```

### 3. Expand

**Before:**
```markdown
AI helps with writing.
```

**After:**
```markdown
Artificial intelligence assists with writing by providing real-time
suggestions, improving grammar and style, generating content ideas,
and automating repetitive tasks. This technology leverages natural
language processing to understand context and deliver relevant,
high-quality text enhancements.
```

### 4. Summarize

**Before:**
```markdown
Machine learning is a subset of artificial intelligence that focuses
on enabling computers to learn from data without explicit programming.
It uses statistical techniques to give computer systems the ability
to progressively improve performance on specific tasks. The field
encompasses various approaches including supervised learning, where
models learn from labeled data, unsupervised learning that finds
patterns in unlabeled data, and reinforcement learning where agents
learn through trial and error.
```

**After:**
```markdown
Machine learning enables computers to learn from data using statistical
methods. Key approaches include supervised, unsupervised, and
reinforcement learning.
```

### 5. Fix Grammar

**Before:**
```markdown
Their going too the store to by some apples and orange's.
```

**After:**
```markdown
They're going to the store to buy some apples and oranges.
```

### 6. Change Tone

**Professional → Casual:**
```markdown
Before: I am writing to inform you that the project has been completed.
After: Hey! Just wanted to let you know the project's done! 🎉
```

**Casual → Professional:**
```markdown
Before: This is kinda cool and works pretty good imo
After: This solution demonstrates effectiveness and delivers 
       satisfactory results.
```

### 7. Translate

**English → Spanish:**
```markdown
Before: Hello, how are you today?
After: Hola, ¿cómo estás hoy?
```

**English → Chinese:**
```markdown
Before: Thank you for your help.
After: 谢谢你的帮助。
```

### 8. Continue Writing

**Before:**
```markdown
The future of artificial intelligence includes
```

**After:**
```markdown
The future of artificial intelligence includes advanced natural
language processing, more sophisticated reasoning capabilities,
better human-AI collaboration tools, and ethical frameworks to
ensure responsible development and deployment.
```

---

## ⚙️ Configuration

### Basic Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Enable/disable popup | Off |
| **Right-Click** | Show on right-click | On |
| **Hotkey** | Keyboard shortcut | None |
| **Model** | AI model to use | GPT-3.5 |
| **Actions** | Which actions to show | All |

### Action Customization

**Edit Action Prompts:**
```yaml
Improve:
  Prompt: "Improve this text for clarity and impact"
  Temperature: 0.7
  Max Tokens: 500

Simplify:
  Prompt: "Rewrite this in simple, clear language"
  Temperature: 0.5
  Max Tokens: 300
```

**Custom Actions:**
```yaml
Make Technical:
  Prompt: "Rewrite with technical terminology"
  Icon: 🔬
  Shortcut: Cmd+Shift+T

Make Casual:
  Prompt: "Make this sound casual and friendly"
  Icon: 😊
  Shortcut: Cmd+Shift+C
```

### Display Options

**Popup Position:**
```yaml
Position: near-cursor  # or: fixed-top, fixed-bottom
Max Width: 300px
Max Height: 400px
Animation: fade       # or: slide, none
```

**Action Icons:**
```yaml
Show Icons: true
Icon Style: emoji     # or: svg, text
Icon Size: 16px
```

---

## 🎨 Advanced Features

### Context-Aware Actions

**Automatic Detection:**
```markdown
Selected: `function calculateTotal() {`
→ Shows: "Add JSDoc", "Refactor", "Add Error Handling"

Selected: "Buenos días"
→ Shows: "Translate to English", "Detect Language"

Selected: "TODO: implement feature"
→ Shows: "Create Task", "Expand Task", "Set Deadline"
```

### Multi-Step Transformations

**Chain Actions:**
```
1. Select text
2. Action: "Simplify"
3. Keep selected
4. Action: "Expand"
5. Keep selected
6. Action: "Improve"
```

### Batch Processing

**Apply to Multiple Selections:**
```
1. Select first block
2. Hold Cmd/Ctrl
3. Select more blocks
4. Right-click any selection
5. Choose action
6. Applies to all
```

---

## 🔑 Keyboard Shortcuts

| Action | Default | Description |
|--------|---------|-------------|
| **Open Popup** | `Cmd+Shift+A` | Show action menu |
| **Improve** | `Cmd+Shift+I` | Quick improve |
| **Simplify** | `Cmd+Shift+S` | Quick simplify |
| **Translate** | `Cmd+Shift+T` | Quick translate |
| **Accept** | `Tab` | Apply changes |
| **Reject** | `Esc` | Discard changes |
| **Navigate** | `↑↓` | Move in menu |
| **Select** | `Enter` | Choose action |

### Custom Shortcuts

**Set in Settings → Hotkeys:**
```yaml
Selection Popup: Open: Cmd+Shift+A
Selection Popup: Improve: Cmd+Shift+I
Selection Popup: Fix Grammar: Cmd+Shift+G
Selection Popup: Translate: Cmd+Shift+T
```

---

## 💡 Pro Tips

### 🎯 Effective Selection

**Select the Right Amount:**
```
✅ Select complete thoughts
✅ Include surrounding context
❌ Don't select partial words
❌ Don't select too much (>500 words)
```

**Selection Strategies:**
```
Single word: Click word
Line: Triple-click
Paragraph: Cmd+A (in paragraph)
Multiple paragraphs: Click-drag
```

### 🚀 Workflow Integration

**Writing Flow:**
```
1. Draft quickly (don't edit)
2. Select sections
3. Use "Improve" action
4. Continue writing
5. Repeat
```

**Editing Flow:**
```
1. Select problematic text
2. Try "Simplify" or "Improve"
3. If not satisfied, try "Expand"
4. Accept best version
```

**Translation Workflow:**
```
1. Write in native language
2. Select all content
3. "Translate" to target language
4. Review and adjust
```

### 🎨 Style Consistency

**Maintain Voice:**
```
Custom Action: "Match My Style"
Prompt: "Rewrite to match the tone and style of 
        the rest of this document"
```

**Context-Based:**
```
Add context: "based on the heading above"
Add constraints: "keep it under 100 words"
Add style guide: "follow AP style guidelines"
```

---

## 🎯 Use Cases

### 1. Content Creation

**Blog Writing:**
```markdown
Draft → Select → Improve → Polish
Quick idea → Expand → Refine → Publish
```

**Technical Writing:**
```markdown
Simple version → Expand with details → Add examples
Complex jargon → Simplify → Add context → Improve
```

### 2. Editing & Revision

**First Pass:**
```
1. Select paragraph
2. "Fix Grammar"
3. "Improve Writing"
4. Accept changes
```

**Second Pass:**
```
1. Select sections
2. "Simplify" if too complex
3. "Expand" if too brief
4. "Change Tone" if needed
```

### 3. Translation & Localization

**Content Translation:**
```
English draft → Spanish translation → Review → Publish
```

**Tone Adjustment:**
```
Formal English → Casual English → Spanish (casual) → Review
```

### 4. Code Documentation

**Add Docs:**
```typescript
// Select function
function process(data) { ... }

// Action: "Add JSDoc"
/**
 * Processes input data and returns results
 * @param {any[]} data - Input data to process
 * @returns {Object} Processed results
 */
function process(data) { ... }
```

---

## 📊 Performance

### Speed Comparison

| Action | Speed | Quality | Cost |
|--------|-------|---------|------|
| **Improve** | ⚡⚡ | ⭐⭐⭐⭐ | 💰💰 |
| **Simplify** | ⚡⚡⚡ | ⭐⭐⭐ | 💰 |
| **Expand** | ⚡ | ⭐⭐⭐⭐ | 💰💰💰 |
| **Summarize** | ⚡⚡ | ⭐⭐⭐⭐ | 💰 |
| **Fix Grammar** | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | 💰 |
| **Translate** | ⚡⚡ | ⭐⭐⭐⭐ | 💰💰 |

### Optimization

**For Speed:**
```yaml
Model: GPT-3.5 Turbo
Max Tokens: 200
Cache Results: true
```

**For Quality:**
```yaml
Model: GPT-4 or Claude 3
Max Tokens: 500
Temperature: 0.7
```

**For Cost:**
```yaml
Model: GPT-3.5
Max Tokens: 300
Cache: Enabled
Rate Limit: 10/min
```

---

## 🐛 Troubleshooting

### Common Issues

**Popup not appearing:**
1. ✅ Verify feature is enabled
2. ✅ Check right-click is enabled
3. ✅ Try hotkey instead
4. ✅ Restart Obsidian

**Actions not working:**
1. ✅ Check model is configured
2. ✅ Verify API key
3. ✅ Test internet connection
4. ✅ Check console for errors

**Slow responses:**
1. ✅ Use faster model
2. ✅ Reduce max tokens
3. ✅ Check API status
4. ✅ Enable caching

**Changes not applying:**
1. ✅ Press Tab to accept
2. ✅ Check file permissions
3. ✅ Try manual copy/paste
4. ✅ Reload note

### Debug Mode

**Enable Logging:**
```
Settings → LLMSider → Advanced → Debug Mode
Check console for logs
```

---

## 🔄 Integration

### With Other Features

**+ Autocomplete:**
```
Use autocomplete to write
Use selection popup to refine
```

**+ Quick Chat:**
```
Quick Chat for complex edits
Selection Popup for quick transforms
```

**+ Chat View:**
```
Chat for planning
Selection Popup for execution
```

### With External Tools

**Writing Tools:**
- Draft in Obsidian
- Refine with Selection Popup
- Export to final format

**Translation Workflow:**
- Write in native language
- Translate with popup
- Review in target language

---

## 📚 Action Library

### Pre-built Actions

**Writing Enhancement:**
- Improve Writing
- Fix Grammar
- Check Spelling
- Enhance Vocabulary

**Content Transformation:**
- Simplify
- Expand
- Summarize
- Paraphrase

**Tone Adjustment:**
- Make Professional
- Make Casual
- Make Persuasive
- Make Friendly

**Technical:**
- Add Code Comments
- Explain Code
- Refactor Code
- Add Error Handling

**Language:**
- Translate (20+ languages)
- Detect Language
- Romanize (for non-Latin scripts)

### Custom Action Templates

**Email Templates:**
```yaml
Make Email Formal:
  Prompt: "Convert to professional email format"
  
Make Email Friendly:
  Prompt: "Make this email warm and friendly"
```

**Academic Writing:**
```yaml
Academic Tone:
  Prompt: "Rewrite in academic style with citations"
  
Thesis Statement:
  Prompt: "Extract thesis statement from this text"
```

---

## 📖 Related Guides

- [Quick Chat](quick-chat.md) - Inline AI assistance
- [Autocomplete](autocomplete.md) - Auto-completion
- [Chat Interface](chat-interface.md) - Full chat features
- [Settings Guide](settings-guide.md) - Configuration

---

**Questions?** [GitHub Issues](https://github.com/llmsider/obsidian-llmsider/issues) | [Discord](https://discord.gg/llmsider)
