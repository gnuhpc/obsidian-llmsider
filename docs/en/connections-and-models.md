# 🔗 Connections & Models Guide

## Overview

LLMSider uses a flexible **Connection + Model** architecture that allows you to:
- Connect to multiple AI providers simultaneously
- Configure multiple models per provider
- Switch between models on-the-fly
- Manage API keys and settings independently

---

## 🎯 Key Concepts

### Connections
A **Connection** represents a link to an AI provider's API. It stores:
- Provider type (OpenAI, Anthropic, etc.)
- API credentials (keys, endpoints)
- Base URL and configuration
- Connection-specific settings

### Models
A **Model** is a specific AI model configuration within a connection:
- Model name (e.g., gpt-4, claude-3-5-sonnet)
- Parameters (temperature, max tokens)
- Model-specific settings
- Embedding vs Chat model designation

---

## 🚀 Setting Up Connections

### Step 1: Open Settings
1. Click the gear icon in Obsidian
2. Navigate to **LLMSider** section
3. Find the **Connections and Models** section at the top

### Step 2: Add a Connection

#### Option A: Choose from Provider Cards
Click on any provider card to start configuration:

<table>
<tr>
<td align="center">
<img src="../assets/openai-logo.svg" width="48"><br>
<b>OpenAI</b>
</td>
<td align="center">
<img src="../assets/anthropic-logo.svg" width="48"><br>
<b>Anthropic</b>
</td>
<td align="center">
<img src="../assets/github-logo.svg" width="48"><br>
<b>GitHub Copilot</b>
</td>
<td align="center">
<img src="../assets/azure-logo.svg" width="48"><br>
<b>Azure OpenAI</b>
</td>
</tr>
</table>

#### Option B: Supported Providers

1. **OpenAI**
   ```
   API Key: sk-...
   Base URL: https://api.openai.com/v1 (default)
   ```

2. **Anthropic (Claude)**
   ```
   API Key: sk-ant-...
   Base URL: https://api.anthropic.com (default)
   ```

3. **GitHub Copilot**
   ```
   GitHub Token: ghp_...
   (Copilot token auto-refreshed)
   ```

4. **Azure OpenAI**
   ```
   API Key: Your Azure API key
   Endpoint: https://<resource>.openai.azure.com
   Deployment Name: Your deployment name
   API Version: 2024-02-15-preview
   ```

5. **Gemini**
   ```
   API Key: AIza...
   Base URL: https://generativelanguage.googleapis.com/v1
   ```

6. **Groq**
   ```
   API Key: gsk_...
   Base URL: https://api.groq.com/openai/v1
   ```

7. **Ollama (Local)**
   ```
   Base URL: http://localhost:11434
   (No API key needed)
   ```

8. **Qwen (通义千问)**
   ```
   API Key: sk-...
   Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
   ```

9. **Hugging Face (Embeddings)**
   ```
   API Key: hf_...
   Model: sentence-transformers/all-MiniLM-L6-v2
   ```

10. **OpenAI-Compatible**
    ```
    Base URL: Your custom endpoint
    API Key: Your API key (if required)
    ```

### Step 3: Configure Connection Settings

Fill in the connection form:

| Field | Description | Required |
|-------|-------------|----------|
| **Name** | Friendly name for this connection | ✅ |
| **Type** | Provider type (auto-filled from card) | ✅ |
| **API Key** | Your provider API key | ✅* |
| **Base URL** | API endpoint (has smart defaults) | ⚠️ |
| **Enabled** | Toggle to enable/disable connection | ✅ |

*Not required for Ollama or custom local setups

#### Advanced Options
- **Custom Headers**: Add custom HTTP headers
- **Timeout**: Request timeout in seconds
- **Retry Settings**: Configure retry behavior

---

## 🎨 Managing Models

### Adding a Model

1. **Click "Add Model"** under any connection
2. **Fill in Model Details**:

   | Field | Description | Example |
   |-------|-------------|---------|
   | **Name** | Display name | GPT-4 Turbo |
   | **Model Name** | API model identifier | gpt-4-1106-preview |
   | **Type** | Chat or Embedding | Chat |
   | **Temperature** | Creativity (0-2) | 0.7 |
   | **Max Tokens** | Response length limit | 4096 |

3. **Set as Default** (optional): Mark as preferred model for this connection

### Model Parameters

#### Temperature
Controls randomness in responses:
- `0.0` - Deterministic, consistent
- `0.5-0.8` - Balanced (recommended)
- `1.0+` - Creative, varied

#### Max Tokens
Maximum response length:
- **Chat Models**: 1000-4096 tokens typical
- **Embedding Models**: Set embedding dimension instead

#### Special Settings

**For Chat Models:**
- Top P: Nucleus sampling threshold
- Frequency Penalty: Reduce repetition
- Presence Penalty: Encourage new topics

**For Embedding Models:**
- Embedding Dimension: Vector size (e.g., 384, 768, 1536)
- Batch Size: Parallel processing count

### Editing & Deleting Models

**Edit**: Click the ✏️ icon next to model name
**Delete**: Click the 🗑️ icon (requires confirmation)

---

## 🎯 Using Multiple Models

### Quick Switching

**In Chat Interface:**
1. Look for provider tabs at the top
2. Click any tab to switch active model
3. Current conversation continues seamlessly

**Via Settings:**
1. Enable/disable connections and models
2. Changes apply immediately

### Model Selection Strategy

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| **Quick Responses** | GPT-3.5 Turbo | Fast, cost-effective |
| **Complex Reasoning** | GPT-4, Claude 3 Opus | Superior logic |
| **Code Generation** | GPT-4, Claude 3.5 Sonnet | Code understanding |
| **Long Context** | Claude 3 (200K tokens) | Large document analysis |
| **Local Privacy** | Ollama (Llama 3) | No API calls |
| **Embeddings** | text-embedding-3-small | Quality + speed |

---

## 🔧 Advanced Configuration

### Connection-Level Features

#### Auto-Reconnect
Automatically reconnect dropped connections

#### Rate Limiting
Built-in rate limiting to respect API quotas

#### Token Refresh (GitHub Copilot)
Automatic token renewal before expiration

### Model-Level Features

#### Context Window
Maximum input tokens the model can handle

#### Function Calling
Support for tool/function calls (GPT-4, Claude 3)

#### Vision Support
Process images alongside text (GPT-4 Vision)

---

## 💡 Tips & Best Practices

### 🎯 Connection Management

1. **Use Descriptive Names**
   ```
   ✅ "OpenAI GPT-4 Personal"
   ❌ "Connection 1"
   ```

2. **Organize by Purpose**
   - `Work - Azure OpenAI`
   - `Personal - OpenAI`
   - `Local - Ollama`

3. **Set Reasonable Limits**
   - Don't exceed your provider's rate limits
   - Use lower max tokens for exploratory chats
   - Reserve high token counts for final drafts

### 🔒 Security Best Practices

1. **API Keys**
   - Never share your API keys
   - Rotate keys periodically
   - Use environment variables for keys if possible

2. **Access Control**
   - Disable connections when not needed
   - Use separate keys for different projects
   - Monitor API usage regularly

3. **Local Alternatives**
   - Consider Ollama for sensitive data
   - Use OpenAI-compatible local servers
   - Self-host embedding models

### 💰 Cost Optimization

1. **Model Selection**
   - Use GPT-3.5 for simple tasks
   - Reserve GPT-4 for complex reasoning
   - Use embedding models sparingly

2. **Token Management**
   - Set appropriate max tokens
   - Use streaming for long responses
   - Clear context when starting new topics

3. **Caching**
   - Enable response caching when available
   - Reuse embeddings for unchanged content
   - Store frequently used completions

---

## 🐛 Troubleshooting

### Connection Issues

**Problem**: Connection fails to connect
- ✅ Verify API key is correct
- ✅ Check base URL format
- ✅ Ensure internet connectivity
- ✅ Check provider status page

**Problem**: Slow responses
- ✅ Check network latency
- ✅ Try different model
- ✅ Reduce max tokens
- ✅ Disable unnecessary tools

### Model Issues

**Problem**: Model not showing in dropdown
- ✅ Ensure model is enabled
- ✅ Check connection is enabled
- ✅ Verify model name is correct
- ✅ Refresh Obsidian

**Problem**: Unexpected responses
- ✅ Adjust temperature
- ✅ Check system prompt
- ✅ Review context included
- ✅ Try different model

### API Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 | Invalid API key | Check key format |
| 429 | Rate limit | Wait or upgrade plan |
| 500 | Server error | Retry or contact provider |
| Timeout | Request too slow | Increase timeout setting |

---

## 📚 Further Reading

- [Chat Interface Guide](chat-interface.md)
- [Autocomplete Setup](autocomplete.md)
- [MCP Integration](mcp-integration.md)
- [Troubleshooting Guide](troubleshooting.md)

---

**Need Help?** [Open an issue](https://github.com/llmsider/obsidian-llmsider/issues) or join our [Discord](https://discord.gg/llmsider)
