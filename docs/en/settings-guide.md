# ⚙️ Settings Guide

## Overview

Complete reference for all LLMSider settings and configuration options. This guide covers every setting in detail with recommended values and best practices.

---

## 📑 Table of Contents

- [Connections & Models](#connections--models)
- [Vector Database](#vector-database)
- [Autocomplete](#autocomplete)
- [Quick Chat](#quick-chat)
- [Built-in Tools](#built-in-tools)
- [MCP Settings](#mcp-settings)
- [UI Settings](#ui-settings)
- [Web Search](#web-search)
- [Advanced Settings](#advanced-settings)

---

## 🔗 Connections & Models

### Connection Management

**Location**: Settings → LLMSider → Connections & Models

#### Adding a Connection

1. **Click provider card** or "Add New Connection"
2. **Fill required fields**:
   - **Name**: Friendly name (e.g., "OpenAI Main", "Ollama Local")
   - **Type**: Auto-selected based on provider
   - **API Key**: Your provider's API key (if required)
   - **Base URL**: API endpoint (has smart defaults)

#### Connection Settings

| Setting | Description | Required | Default |
|---------|-------------|----------|---------|
| **Name** | Display name | ✅ Yes | - |
| **Type** | Provider type | ✅ Yes | Auto-filled |
| **Enabled** | Enable/disable | ✅ Yes | true |
| **API Key** | Authentication | ⚠️ Most | - |
| **Base URL** | API endpoint | ⚠️ Some | Provider default |

#### Provider-Specific Settings

**OpenAI:**
```yaml
Base URL: https://api.openai.com/v1
API Key: sk-...
```

**Azure OpenAI:**
```yaml
Endpoint: https://<resource>.openai.azure.com
API Key: Your Azure key
Deployment Name: your-deployment
API Version: 2024-02-15-preview
```

**GitHub Copilot:**
```yaml
GitHub Token: ghp_...
Auto-refresh: Enabled (automatic)
```

**Ollama:**
```yaml
Base URL: http://localhost:11434
API Key: Not required
```

### Model Configuration

**For each connection, add models:**

#### Model Settings

| Setting | Description | Type | Default | Range |
|---------|-------------|------|---------|-------|
| **Model Name** | Model identifier | Text | - | - |
| **Display Name** | Friendly name | Text | - | - |
| **Enabled** | Enable/disable | Toggle | true | - |
| **Temperature** | Randomness | Slider | 0.7 | 0.0-2.0 |
| **Max Tokens** | Response length | Number | 4096 | 1-128000* |
| **Top P** | Nucleus sampling | Slider | 1.0 | 0.0-1.0 |
| **Frequency Penalty** | Reduce repetition | Slider | 0.0 | -2.0-2.0 |
| **Presence Penalty** | Encourage new topics | Slider | 0.0 | -2.0-2.0 |

*Max tokens depends on model

#### Embedding Model Settings

**For embedding models only:**

| Setting | Description | Required | Example |
|---------|-------------|----------|---------|
| **Embedding Model** | Toggle | ✅ Yes | On |
| **Embedding Dimension** | Vector size | ✅ Yes | 1536, 3072 |

**Common dimensions:**
- text-embedding-3-small: 1536
- text-embedding-3-large: 3072
- text-embedding-ada-002: 1536

#### Set as Default

Toggle to make this model the default for new chats.

---

## 🗄️ Vector Database

**Location**: Settings → LLMSider → Search Enhancement

### Basic Settings

#### Enable Search Enhancement
```yaml
Setting: Enable Search Enhancement
Type: Toggle
Default: Off
Effect: Enables local semantic search using vector embeddings
```

**When enabled:**
- Indexes your entire vault
- Enables semantic search
- Powers context retrieval
- Supports similar notes

#### Show Similar Notes
```yaml
Setting: Show Similar Notes
Type: Toggle
Default: Off
Effect: Shows related notes at bottom of each note
Requires: Search Enhancement enabled
```

### Embedding Configuration

#### Embedding Model
```yaml
Setting: Embedding Model
Type: Dropdown
Options: All embedding models from connections
Required: Yes (if Search Enhancement enabled)
Note: Only shows models marked as "Embedding Model"
```

**Recommended models:**
- OpenAI: text-embedding-3-small (fast, cheap)
- OpenAI: text-embedding-3-large (high quality)
- Local: Hugging Face models via Ollama

### Chunking Strategy

#### Strategy Selection
```yaml
Setting: Chunking Strategy
Type: Dropdown
Options:
  - Character-based (Fixed size)
  - Semantic (Structure-aware)
Default: Semantic
```

**Semantic Chunking** (Recommended):
- Automatic splitting by document structure
- Preserves headings, paragraphs
- No configuration needed
- Best for Markdown notes

**Character-based Chunking**:
- Fixed-size chunks
- Configurable size and overlap
- Good for uniform processing

#### Character Strategy Parameters

**Chunk Size:**
```yaml
Setting: Chunk Size
Type: Number
Default: 1000
Range: 100-5000
Unit: Characters
Description: Number of characters per chunk
```

**Recommendations:**
- Small chunks (500-800): More precise, more vectors
- Medium chunks (1000-1500): Balanced
- Large chunks (2000-5000): More context, fewer vectors

**Chunk Overlap:**
```yaml
Setting: Chunk Overlap
Type: Number
Default: 100
Range: 0 to (chunk_size - 1)
Unit: Characters
Description: Overlapping characters between chunks
```

**Recommendations:**
- 10-20% of chunk size
- Prevents context loss at boundaries
- Higher overlap = smoother transitions

### Search Configuration

#### Search Results
```yaml
Setting: Search Results
Type: Number
Default: 5
Range: 1-20
Description: Number of similar chunks to return
```

**Recommendations:**
- 3-5: Quick queries
- 5-10: Comprehensive searches
- 10+: Research tasks

#### Suggest Related Files
```yaml
Setting: Suggest Related Files
Type: Toggle
Default: Off
Effect: Auto-suggest semantically related files
```

**When enabled:**
- Adding a file triggers suggestions
- Related files appear in gray
- Click within 5 seconds to confirm
- Auto-disappear after timeout

**Suggestion Timeout:**
```yaml
Setting: Suggestion Timeout
Type: Number
Default: 5000
Unit: Milliseconds
Range: 1000-30000
```

### Storage Settings

#### Storage Path
```yaml
Setting: Storage Path
Type: Text
Default: vector-data
Description: Folder for vector database files
Note: Relative to vault root
```

#### Index Name
```yaml
Setting: Index Name
Type: Text
Default: vault-semantic-index
Description: Name for the vector index file
```

### Index Management

#### Update Index (Differential)
```yaml
Button: Update Index
Action: Scan vault and update only changed files
Speed: Fast (only processes changes)
Use: Regular maintenance
```

#### Rebuild Index (Full)
```yaml
Button: Rebuild Index (Full)
Action: Clear and rebuild entire index
Speed: Slow (processes all files)
Use: Major changes, corruption, strategy change
```

**Progress indicators:**
- Scanning: Finding files
- Processing: Chunking content
- Indexing: Creating vectors
- Percentage: Overall progress

---

## ⚡ Autocomplete

**Location**: Settings → LLMSider → Auto-completion

### Basic Settings

#### Enable Inline Completion
```yaml
Setting: Enable Inline Completion
Type: Toggle
Default: Off
Effect: GitHub Copilot-style suggestions as you type
```

#### Autocomplete Model
```yaml
Setting: Model
Type: Dropdown
Options: All enabled chat models
Default: None (must select)
Recommended: Fast models (GPT-3.5, Claude Haiku)
```

### Trigger Settings

#### Trigger Delay
```yaml
Setting: Trigger Delay
Type: Number
Default: 300
Unit: Milliseconds
Range: 100-5000
Description: Delay before showing suggestions
```

**Recommendations:**
- 100-200ms: Very responsive (may be distracting)
- 300-500ms: Balanced
- 500-1000ms: Conservative (less intrusive)

#### Minimum Characters
```yaml
Setting: Minimum Characters
Type: Number
Default: 3
Range: 1-10
Description: Minimum characters before triggering
```

### Advanced Settings

#### Max Suggestions
```yaml
Setting: Max Suggestions
Type: Number
Default: 3
Range: 1-10
Description: Number of alternative suggestions
```

#### Context Lines
```yaml
Setting: Context Lines
Type: Number
Default: 20
Range: 5-100
Description: Lines of context sent to AI
```

**Recommendations:**
- 10-20: Faster, less context
- 20-40: Balanced
- 40+: More context, slower

---

## 💬 Quick Chat

**Location**: Settings → LLMSider → Quick Chat

### Settings

#### Enable Quick Chat
```yaml
Setting: Enable Quick Chat
Type: Toggle
Default: On
Effect: Enables Cmd+/ inline chat
```

#### Quick Chat Model
```yaml
Setting: Model
Type: Dropdown
Options: All enabled chat models
Default: Default chat model
```

#### Show Diff Preview
```yaml
Setting: Show Diff Preview
Type: Toggle
Default: On
Effect: Shows visual diff for code/text changes
```

---

## 🛠️ Built-in Tools

**Location**: Settings → LLMSider → Built-in Tools

### Category Management

**Enable/Disable by Category:**

#### Core Tools (Default: Enabled)
```yaml
✅ Utility (10+ tools)
✅ File System (15+ tools)
✅ File Management (20+ tools)
✅ Note Management (15+ tools)
✅ Editor (10+ tools)
✅ Search (15+ tools)
✅ Web Content (10+ tools)
✅ Search Engines (20+ tools)
```

#### Financial Data (Default: Disabled)
```yaml
❌ Stock Market (150+ tools)
❌ Futures (80+ tools)
❌ Options (60+ tools)
❌ Bonds (50+ tools)
❌ Funds (70+ tools)
❌ Forex (30+ tools)
❌ Crypto (15+ tools)
❌ Financial (40+ tools)
```

#### Advanced Data (Default: Disabled)
```yaml
❌ Derivatives (30+ tools)
❌ Credit Analysis (25+ tools)
❌ ESG Data (18+ tools)
❌ Macro Economics (20+ tools)
❌ Industry Data (25+ tools)
❌ Risk Management (15+ tools)
```

### Individual Tool Control

**For each tool:**
```yaml
Name: Tool name
Description: What it does
Category: Tool category
Enabled: Toggle on/off
```

**Enable all in category:** Click category header toggle

**Search tools:** Use search box to filter

---

## 🔌 MCP Settings

**Location**: Settings → LLMSider → MCP Settings

### Server Configuration

**Managed via JSON editor:**

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}
```

### Server Management

#### Auto-Start
```yaml
Toggle: Auto start on plugin load
Default: On (per server)
Effect: Automatically connects on Obsidian startup
```

#### Server Actions
- **Connect**: Manually start server
- **Disconnect**: Stop server
- **Show Tools**: View available tools
- **Delete**: Remove server config

### MCP Tools

**Per-tool control:**
```yaml
Enabled: Toggle on/off
Input Schema: View parameter details
Description: Tool purpose
```

---

## 🎨 UI Settings

**Location**: Settings → LLMSider → UI Settings

### Language
```yaml
Setting: Language
Type: Dropdown
Options:
  - English
  - 简体中文 (Simplified Chinese)
Default: System default
Effect: Changes all UI text
```

### Default Conversation Mode
```yaml
Setting: Default Conversation Mode
Type: Dropdown
Options:
  - Normal (🗣️)
  - Guided (🎯)
  - Agent (🤖)
Default: Normal
Effect: Mode used when starting new chats
```

### Max Chat History
```yaml
Setting: Max Chat History
Type: Number
Default: 50
Range: 1-1000
Description: Number of chat sessions to keep
Effect: Older sessions auto-deleted
```

---

## 🌐 Web Search

**Location**: Settings → LLMSider → Web Search Settings

### Search Backend
```yaml
Setting: Search Backend
Type: Dropdown
Options:
  - Google Custom Search
  - SerpAPI
  - Tavily AI Search
Default: None (must configure)
```

### Google Custom Search

#### Google API Key
```yaml
Setting: Google API Key
Type: Password
Required: Yes (for Google backend)
Get from: Google Cloud Console
```

#### Search Engine ID
```yaml
Setting: Search Engine ID
Type: Text
Required: Yes (for Google backend)
Get from: Programmable Search Engine
```

### SerpAPI

#### SerpAPI Key
```yaml
Setting: SerpAPI Key
Type: Password
Required: Yes (for SerpAPI backend)
Get from: serpapi.com
```

### Tavily AI Search

#### Tavily API Key
```yaml
Setting: Tavily API Key
Type: Password
Required: Yes (for Tavily backend)
Get from: tavily.com
Note: Free tier available
```

---

## 🔧 Advanced Settings

**Location**: Settings → LLMSider → Advanced

### Debug Mode
```yaml
Setting: Debug Mode
Type: Toggle
Default: Off
Effect: Enables verbose logging in console
Use: Troubleshooting, development
```

**When enabled:**
- All API calls logged
- Tool execution details
- Performance metrics
- Error stack traces

### Request Timeout
```yaml
Setting: Request Timeout
Type: Number
Default: 60000
Unit: Milliseconds
Range: 5000-300000
Description: API request timeout
```

### Retry Settings

#### Max Retries
```yaml
Setting: Max Retries
Type: Number
Default: 3
Range: 0-10
Description: Number of retry attempts for failed requests
```

#### Retry Delay
```yaml
Setting: Retry Delay
Type: Number
Default: 1000
Unit: Milliseconds
Range: 100-10000
Description: Delay between retries
```

---

## 💡 Recommended Configurations

### For Beginners

```yaml
Connections:
  - OpenAI (GPT-3.5 Turbo) OR
  - Ollama (Llama 3 - local, free)

Settings:
  - Autocomplete: Off (learn basics first)
  - Quick Chat: On
  - Vector Database: Off (set up later)
  - Built-in Tools: Core only
  - Conversation Mode: Normal
```

### For Power Users

```yaml
Connections:
  - OpenAI (GPT-4 Turbo, GPT-3.5)
  - Anthropic (Claude 3.5 Sonnet)
  - Ollama (local backup)

Settings:
  - Autocomplete: On (GPT-3.5)
  - Quick Chat: On (GPT-4)
  - Vector Database: On (text-embedding-3-small)
  - Built-in Tools: Core + needed categories
  - Conversation Mode: Guided
```

### For Developers

```yaml
Connections:
  - GitHub Copilot
  - Anthropic Claude 3.5
  - Ollama (various models)

Settings:
  - Autocomplete: On (GitHub Copilot)
  - Quick Chat: On (Claude)
  - Vector Database: On
  - Built-in Tools: All core tools
  - Conversation Mode: Agent
  - Debug Mode: On
```

---

## 🐛 Troubleshooting

### Settings Not Saving
```
✅ Check file permissions
✅ Reload Obsidian
✅ Check console for errors
✅ Backup and reset settings
```

### Models Not Appearing
```
✅ Verify connection enabled
✅ Check API key valid
✅ Test connection manually
✅ Reload provider
```

### Tools Not Working
```
✅ Verify tool enabled
✅ Check category enabled
✅ Verify API keys (if needed)
✅ Check debug logs
```

---

## 📚 Related Guides

- [Connections & Models](connections-and-models.md) - Detailed provider setup
- [Vector Database](vector-database.md) - Semantic search guide
- [Built-in Tools](built-in-tools.md) - Complete tool reference
- [MCP Integration](mcp-integration.md) - External tool setup

---

**Questions?** [GitHub Issues](https://github.com/llmsider/obsidian-llmsider/issues) | [Discord](https://discord.gg/llmsider)
