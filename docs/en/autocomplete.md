# ⚡ Autocomplete Guide

## Overview

LLMSider brings GitHub Copilot-style autocomplete to Obsidian, providing real-time AI suggestions as you type. Get intelligent code and text completions without leaving your editor.

---

## 🎯 Features

### ✨ Inline Suggestions
- **Real-time completions** as you type
- **Multiple suggestions** - cycle through options
- **Context-aware** - understands your vault and writing style
- **Multi-language support** - works with code blocks and prose

### 🚀 Smart Triggering
- **Automatic** - triggers after pause in typing
- **Manual** - trigger on demand with hotkey
- **Configurable delay** - adjust trigger timing
- **Granularity control** - line or full completion

---

## 🔧 Setup

### Enable Autocomplete

1. **Open Settings**
   - Obsidian Settings → LLMSider
   
2. **Navigate to Autocomplete Section**
   - Scroll to "Autocomplete Settings"

3. **Enable Autocomplete**
   - Toggle "Enable Autocomplete" switch
   - Choose your preferred model
   - Configure settings

### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Turn autocomplete on/off | Off |
| **Model** | AI model for suggestions | GPT-3.5 |
| **Trigger Delay** | Wait time before triggering (ms) | 500 |
| **Granularity** | `line` or `full` completion | line |
| **Max Tokens** | Maximum suggestion length | 100 |
| **Temperature** | Creativity (0-1) | 0.3 |

### Recommended Settings

**For Code:**
```yaml
Model: GPT-4 / Claude 3.5 Sonnet
Trigger Delay: 300ms
Granularity: line
Temperature: 0.2
```

**For Writing:**
```yaml
Model: GPT-3.5
Trigger Delay: 500ms
Granularity: full
Temperature: 0.7
```

---

## 💡 Using Autocomplete

### Basic Usage

1. **Start Typing**
   ```markdown
   The key benefits of using AI in 
   ```

2. **Wait for Suggestion**
   ```markdown
   The key benefits of using AI in productivity apps include_
   ```
   ↑ Ghost text appears in gray

3. **Accept or Reject**
   - Press `Tab` to accept
   - Press `Esc` to reject
   - Keep typing to ignore

### Multiple Suggestions

When multiple options are available:

```markdown
The weather today is |
                      └→ Suggestion 1/3
```

**Navigate:**
- `⌥ ]` (Option+]) - Next suggestion
- `⌥ [` (Option+[) - Previous suggestion
- `Tab` - Accept current
- `Esc` - Dismiss all

### Granularity Modes

#### Line Mode
Complete current line only:

```markdown
Input:  def calculate_
Output: def calculate_total(items: list) -> float:
```

#### Full Mode
Multi-line completion:

```markdown
Input:  def calculate_total(items: list):
Output: def calculate_total(items: list):
            """Calculate total price of items."""
            total = sum(item.price for item in items)
            return round(total, 2)
```

---

## 🎨 Visual Indicators

### Suggestion States

**Loading:**
```markdown
Typing...⏳
```

**Suggestion Available:**
```markdown
Your text | AI suggestion in gray
```

**Multiple Options:**
```markdown
Your text | Option 1/3 ⟳
```

### Status Icons

| Icon | Meaning |
|------|---------|
| ⏳ | Loading |
| ⟳ | Multiple options |
| ✓ | Accepted |
| ✗ | Rejected |

---

## ⚙️ Advanced Configuration

### Custom Trigger Conditions

**Minimum Characters:**
```javascript
minChars: 2  // Only trigger after typing 2+ chars
```

**Trigger Patterns:**
```javascript
// Only trigger for specific contexts
triggerPatterns: [
  /^def /,        // Python functions
  /^function /,   // JavaScript functions
  /^## /,         // Markdown headings
]
```

### Context Enhancement

**Include Vault Context:**
```yaml
useVaultContext: true  # Include related notes
contextLimit: 3        # Max notes to include
```

**Include Recent Files:**
```yaml
includeRecentFiles: true
recentFileCount: 5
```

### Performance Tuning

**Debounce Settings:**
```yaml
debounceMs: 500     # Wait before triggering
minTypingPause: 200 # Minimum pause to trigger
```

**Cache Settings:**
```yaml
cacheEnabled: true
cacheTTL: 300000    # 5 minutes
maxCacheSize: 100   # Max cached suggestions
```

---

## 💡 Best Practices

### 🎯 When to Use

**Great for:**
- ✅ Completing common phrases
- ✅ Writing code snippets
- ✅ Filling in boilerplate
- ✅ Consistent formatting
- ✅ List continuation

**Not ideal for:**
- ❌ Creative writing first drafts
- ❌ Highly specific domain content
- ❌ Real-time brainstorming
- ❌ Sensitive/private information

### 🚀 Productivity Tips

1. **Accept Partial Completions**
   ```markdown
   Suggestion: "productivity apps include task managers, note-taking tools, and calendar apps"
   Accept up to: "productivity apps include task managers"
   ```
   - Accept what you want, then keep typing

2. **Use for Boilerplate**
   ```markdown
   Type: "---\ntitle: "
   Accept: Complete frontmatter template
   ```

3. **Learn Your Model's Style**
   - GPT-3.5: Fast, concise
   - GPT-4: Detailed, accurate
   - Claude: Natural language

4. **Combine with Quick Chat**
   - Use autocomplete for quick completions
   - Use Quick Chat (Cmd+/) for complex edits

### 🔒 Privacy Considerations

**What Gets Sent:**
- Current line or paragraph
- File context (if enabled)
- Vault metadata (if enabled)

**What Doesn't:**
- Your entire vault
- Other open notes
- System information

**Tips:**
- Use local models (Ollama) for sensitive data
- Disable vault context for private notes
- Review settings regularly

---

## 🐛 Troubleshooting

### Common Issues

**Suggestions Not Appearing:**
1. ✅ Verify autocomplete is enabled
2. ✅ Check model is active
3. ✅ Ensure API key is valid
4. ✅ Wait for trigger delay
5. ✅ Type minimum characters (2+)

**Slow Suggestions:**
1. ✅ Use faster model (GPT-3.5)
2. ✅ Reduce max tokens
3. ✅ Disable vault context
4. ✅ Increase debounce delay
5. ✅ Check internet speed

**Irrelevant Suggestions:**
1. ✅ Lower temperature
2. ✅ Adjust granularity
3. ✅ Provide more context
4. ✅ Try different model
5. ✅ Enable vault context

**Suggestions Flickering:**
1. ✅ Increase trigger delay
2. ✅ Increase debounce time
3. ✅ Disable rapid typing detection
4. ✅ Restart Obsidian

### Debug Mode

Enable detailed logging:

1. Settings → LLMSider → Advanced
2. Enable "Debug Logging"
3. Open Console (Cmd+Option+I)
4. Look for autocomplete logs:
   ```
   [LLMSider] Autocomplete triggered at line 42
   [LLMSider] Fetching suggestion from GPT-3.5...
   [LLMSider] Suggestion received: "..."
   ```

---

## 🔑 Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Accept | `Tab` | Accept current suggestion |
| Reject | `Esc` | Dismiss all suggestions |
| Next | `⌥]` | Next suggestion option |
| Previous | `⌥[` | Previous suggestion option |
| Trigger | `Ctrl+Space` | Manual trigger (optional) |

### Custom Shortcuts

Set in: Settings → Hotkeys → LLMSider

```yaml
Accept Suggestion: Tab
Reject Suggestion: Escape
Cycle Next: Option+]
Cycle Previous: Option+[
Manual Trigger: Ctrl+Space
```

---

## 📊 Performance

### Model Comparison

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **GPT-3.5** | ⚡⚡⚡ | ⭐⭐⭐ | 💰 | General use |
| **GPT-4** | ⚡ | ⭐⭐⭐⭐⭐ | 💰💰💰 | Code, accuracy |
| **Claude 3** | ⚡⚡ | ⭐⭐⭐⭐ | 💰💰 | Natural language |
| **Ollama** | ⚡⚡⚡ | ⭐⭐⭐ | Free | Privacy, local |

### Optimization Tips

**For Speed:**
1. Use GPT-3.5 or local models
2. Reduce max tokens (50-100)
3. Disable vault context
4. Increase trigger delay

**For Quality:**
1. Use GPT-4 or Claude 3
2. Increase max tokens (200-500)
3. Enable vault context
4. Lower temperature (0.2-0.4)

**For Cost:**
1. Use GPT-3.5 or Ollama
2. Set reasonable max tokens
3. Increase trigger delay
4. Cache suggestions

---

## 🔄 Integration with Other Features

### Quick Chat
- Autocomplete: Quick, inline
- Quick Chat: Complex, multi-line
- **Use Together:** Autocomplete for speed, Quick Chat for precision

### Selection Popup
- Autocomplete: Generates new content
- Selection: Modifies existing content
- **Use Together:** Autocomplete to write, Selection to refine

### Chat View
- Autocomplete: Silent, background
- Chat: Interactive, conversational
- **Use Together:** Autocomplete for flow, Chat for complex tasks

---

## 📚 Examples

### Code Completion

**Python:**
```python
Input:  def process_data(
Output: def process_data(data: list) -> dict:
            """Process input data and return results."""
            # Implementation here
            return {}
```

**JavaScript:**
```javascript
Input:  const fetchUser
Output: const fetchUser = async (userId) => {
            const response = await fetch(`/api/users/${userId}`);
            return response.json();
        };
```

### Text Completion

**Blog Post:**
```markdown
Input:  The future of AI in productivity
Output: The future of AI in productivity tools looks incredibly promising,
        with advances in natural language processing enabling more intuitive
        interfaces and smarter automation.
```

**Email:**
```markdown
Input:  Thank you for your
Output: Thank you for your email. I'll review the proposal and get back
        to you by end of week.
```

---

## 📖 Related Guides

- [Quick Chat](quick-chat.md) - Inline AI assistance
- [Selection Popup](selection-popup.md) - Right-click actions
- [Chat Interface](chat-interface.md) - Full conversation mode
- [Settings Guide](settings-guide.md) - Complete settings

---

**Need Help?** [GitHub Issues](https://github.com/llmsider/obsidian-llmsider/issues) | [Discord](https://discord.gg/llmsider)
