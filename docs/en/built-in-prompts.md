# 📝 Built-in Prompts Guide

## Overview

LLMSider comes with a collection of pre-configured prompts to help you perform common tasks quickly and efficiently. These prompts are optimized for various use cases and support multiple languages.

---

## 🚀 Quick Start

### Accessing Built-in Prompts

1. **Open Chat Interface**
2. **Click the prompt icon** (📝) or use the quick selector
3. **Search or browse** available prompts
4. **Select a prompt** to use it immediately

### Using Prompts

```
Method 1: Quick Selector
- Press `/` in chat input
- Type to search prompts
- Select and apply

Method 2: Prompt Button
- Click 📝 icon above input
- Browse categories
- Click to apply

### Managing Prompts

You can customize your prompt library in **Settings → LLMSider → Prompt Management**:
- **Add Custom Prompts**: Create your own reusable prompts
- **Hide Built-in Prompts**: Toggle visibility of system prompts you don't use
- **Edit/Delete**: Manage your custom prompts

---

## 📚 Available Prompts
```

---

## 📚 Available Prompts

### Writing & Editing

#### Continue Writing
**ID**: `builtin-continue-writing`  
**Description**: Continue writing from where you left off  
**Use Case**: Extend articles, stories, or documentation

**Example:**
```
[Your text]
---
[AI continues naturally from your text]
```

#### Fix Grammar and Spelling
**ID**: `builtin-fix-grammar-and-spelling`  
**Description**: Correct grammar, spelling, and punctuation  
**Use Case**: Polish your writing

**Example:**
```
Input: "i has wrote this sentance wrong"
Output: "I have written this sentence incorrectly"
```

#### Improve Writing
**ID**: `builtin-improve-writing`  
**Description**: Enhance clarity, style, and readability  
**Use Case**: Professional communication, blog posts

---

### Translation

#### Translate to Chinese
**ID**: `builtin-translate-to-chinese`  
**Description**: Translate any text to Chinese  
**Languages**: Supports all major languages → Chinese

#### Translate to English
**ID**: `builtin-translate-to-english`  
**Description**: Translate any text to English  
**Languages**: Supports all major languages → English

---

### Content Generation

#### Summarize
**ID**: `builtin-summarize`  
**Description**: Create concise summaries of long texts  
**Use Case**: Research papers, articles, meeting notes

**Output Format:**
- Key points (3-5 bullets)
- Main conclusion
- 1-2 sentence summary

#### Explain Like I'm 5
**ID**: `builtin-explain-like-im-5`  
**Description**: Simplify complex topics  
**Use Case**: Learning, teaching, documentation

#### Generate Table of Contents
**ID**: `builtin-generate-table-of-contents`  
**Description**: Create structured TOC from text  
**Output**: Markdown-formatted table of contents

#### **NEW** Generate Obsidian Meta
**ID**: `builtin-generate-obsidian-meta`  
**Order**: 1300  
**Description**: Generate YAML front matter for Obsidian notes

**Features:**
- Analyzes content and extracts key information
- Generates appropriate tags, aliases, and metadata
- Follows YAML best practices (snake_case keys, proper quoting)
- Smart categorization and summarization
- Does NOT fabricate missing information

**Output Format:**
```yaml
---
tags: [tag1, tag2, tag3]
aliases: [alias1, alias2]
author: Author Name
source: Source URL or reference
category: Category
summary: Brief summary (1-2 sentences)
---
```

**YAML Formatting Rules:**
- Keys use `snake_case` (lowercase with underscores)
- Indentation with spaces (not tabs)
- `key: value` format
- Hyphens for list items
- Quotes for strings with special characters
- No `title`, `created`, `modified`, or `status` fields

**Use Cases:**
- Organize research notes
- Tag imported articles
- Categorize meeting notes
- Structure knowledge base entries

---

### Development

#### Write Code
**ID**: `builtin-write-code`  
**Description**: Generate code in any programming language  
**Use Case**: Quick prototypes, snippets, solutions

#### Explain Code
**ID**: `builtin-explain-code`  
**Description**: Understand what code does  
**Output**: Line-by-line or block-by-block explanation

#### Find Bugs
**ID**: `builtin-find-bugs`  
**Description**: Identify and fix code issues  
**Output**: Bug location + suggested fix

---

### Organization

#### Extract Action Items
**ID**: `builtin-extract-action-items`  
**Description**: Pull tasks from meeting notes or documents  
**Output**: Formatted task list with owners and deadlines

#### Create Outline
**ID**: `builtin-create-outline`  
**Description**: Structure ideas into hierarchical outline  
**Use Case**: Planning, brainstorming, organization

---

## 🎨 Customization

### Creating Custom Prompts

1. **Go to Settings** → LLMSider → Prompt Management
2. **Click "Add New Prompt"**
3. **Fill in**:
   - Title: Descriptive name
   - Description: What it does
   - Content: The prompt template
   - Tags: For organization
4. **Save**

### Prompt Templates

Use placeholders in custom prompts:

```markdown
Analyze the following {content_type}:
{selected_text}

Focus on: {focus_areas}
```

**Available Placeholders:**
- `{selected_text}` - Currently selected text
- `{current_file}` - Active file content
- `{clipboard}` - Clipboard content
- Custom variables you define

---

## 💡 Best Practices

### When to Use Built-in Prompts

✅ **Good for:**
- Repetitive tasks
- Standard operations
- Quick transformations
- Consistent formatting

❌ **Not ideal for:**
- Highly specific one-off tasks
- Complex multi-step workflows
- Tasks requiring extensive context

### Combining Prompts

**Example workflow:**
1. Use "Summarize" on research article
2. Use "Extract Action Items" on summary
3. Use "Generate Obsidian Meta" to organize
4. Use "Create Outline" for presentation

### Prompt Chaining

```
Step 1: Translate to English → Result A
Step 2: Summarize Result A → Result B  
Step 3: Generate Meta for Result B → Final
```

---

## 🔧 Advanced Features

### Prompt Order

Prompts appear in order based on:
1. **Order Index** (lower = higher priority)
2. **Last Used** (recently used appear first)
3. **Alphabetical** (fallback)

### Search & Filters

**Search prompts:**
- By title: Type prompt name
- By description: Type use case
- By tags: Use `#tag` syntax

**Quick access:**
- Pin frequently used prompts
- Assign keyboard shortcuts (Settings → Hotkeys)

---

## 📊 Prompt Statistics

Track prompt usage in Settings → Prompt Management:

- **Most Used**: Top 10 prompts by usage count
- **Recently Used**: Last 20 prompts used
- **Custom Prompts**: Your created prompts

---

## 🌐 Internationalization

All built-in prompts support:
- **English** (en)
- **Chinese** (zh)

Language switches automatically based on Obsidian settings.

### Adding Translations

For custom prompts, you can:
1. Create language-specific versions
2. Use conditional logic in prompts
3. Set language preference per prompt

---

## 🆘 Troubleshooting

### Prompt Not Showing

**Check:**
- Prompt is enabled (Settings → Prompt Management)
- No filters active
- Correct search query
- Plugin is up to date

### Prompt Not Working

**Verify:**
- Model is selected and active
- API key is valid
- Prompt has valid syntax
- No placeholder errors

### Custom Prompt Issues

**Common problems:**
- Missing required placeholders
- Invalid JSON in prompt metadata
- Duplicate IDs
- Circular references

---

## 📚 Related Documentation

- [Chat Interface Guide](chat-interface.md)
- [Settings Guide](settings-guide.md)
- [Advanced Features](advanced-features.md)

---

## 🔄 Updates

### Version History

**Latest (v1.0):**
- ✨ Added "Generate Obsidian Meta" prompt
- ✨ Improved YAML formatting rules
- ✨ Smart content analysis and categorization
- 🐛 Fixed prompt search performance
- 🐛 Improved i18n support

**Previous:**
- Initial built-in prompts collection
- Multi-language support
- Custom prompt system
