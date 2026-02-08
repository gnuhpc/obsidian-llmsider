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

Click on any provider card to start configuration:

![Available Connection Providers](../assets/screenshots/connection-providers.png)
*Available AI provider connections in LLMSider*

#### Supported Providers

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

6. **OpenCode**
   ```
   Server URL: http://localhost:4097
   (No API key needed, local HTTP server)
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

11. **xAI (Grok)**
    ```
    API Key: xai-...
    Base URL: https://api.x.ai/v1
    ```

12. **OpenRouter**
    ```
    API Key: sk-or-...
    Base URL: https://openrouter.ai/api/v1
    ```

13. **Free Qwen**
    ```
    (No API Key required, built-in free access)
    ```

14. **Free DeepSeek**
    ```
    (No API Key required, built-in free access)
    ```

15. **Free Gemini**
    ```
    (No API Key required, built-in free access)
    ```

16. **Hugging Chat**
    ```
    (No API Key required, supports various open source models)
    ```

17. **Local**
    ```
    Base URL: http://localhost:1234/v1
    (Supports LM Studio, LocalAI, etc.)
    ```

### Step 3: Configure Connection Settings

Fill in the connection form:

![Edit Connection Dialog](../assets/screenshots/edit-connection.png)
*Connection configuration with proxy settings and authentication*

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

   ![Add Model Configuration](../assets/screenshots/add-model-dialog.png)
   *Model configuration dialog with temperature and vision support settings*

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
| **Chinese Conversation** | Qwen Max, DeepSeek V3.2 | Superior Chinese understanding and generation |
| **English Conversation** | Claude 3.5 Sonnet, Claude 3 Opus | Top-tier English expression and reasoning |
| **Code Generation** | Claude 3.5 Sonnet, GPT-4o | Strong code understanding and generation |
| **Long Text Analysis** | Claude 3.5 Sonnet (200K tokens), Gemini 1.5 Pro (2M tokens) | Ultra-long context windows |
| **Multimodal Vision** | GPT-4o, Gemini 1.5 Pro, Qwen VL Max | Image-text understanding |
| **Text-to-Image** | DALL-E 3 (OpenAI), Qwen VL Plus/Max, Gemini 3 Pro Image | Generate images from text descriptions |
| **Quick Responses** | GPT-4o mini, DeepSeek Chat | Fast, cost-effective |
| **Local Privacy** | Ollama (Qwen2.5, Llama 3.3) | Fully offline, no API calls |
| **Embeddings** | text-embedding-3-large, bge-large-zh-v1.5 | Semantic search quality |

### Multimodal Support (Image & File Analysis)

Some connection types support **image recognition and file parsing**, allowing you to upload images, PDFs, or other files for analysis in conversations:

| Connection Type | Multimodal Support | Description |
|---------|------------|------|
| **OpenAI** | ✅ Select models | GPT-4o, GPT-4 Turbo, GPT-4 Vision, etc. |
| **Qwen** | ✅ Select models | Models with "vision" or "vl" in the name |
| **Free Qwen** | ✅ All models | All models support multimodal input |
| **Free DeepSeek** | ✅ All models | All models support image uploads |
| **GitHub Copilot** | ✅ Select models | GPT-4 series models supported |
| **Hugging Chat** | ✅ Select models | Only models with "vision" (e.g., Llama 3.2 11B Vision) |
| **OpenAI Compatible** | ✅ Configurable | Manual config or auto-detection (LLaVA, MiniCPM-V, CogVLM, Gemini Vision, etc.) |
| **Anthropic (Claude)** | ❌ Pending | Not supported in current version |
| **Other Providers** | ❌ Not supported | Azure OpenAI, Gemini, Groq, Ollama, etc. currently unsupported |

> 💡 **Tip**: In the chat interface, models with multimodal support will display an attachment button (📎), and you can drag and drop images or PDF files directly into the conversation.

### Text-to-Image Support

Some connection types support **Text-to-Image** functionality, allowing you to generate images from text descriptions:

| Connection Type | Text-to-Image Support | Description |
|---------|------------|------|
| **OpenAI** | ✅ DALL-E models | dall-e-3, dall-e-2 models support image generation |
| **Qwen** | ✅ Select models | qwen-vl-plus, qwen-vl-max and other VL series models |
| **Gemini** | ✅ Image models | Gemini 3 Pro Image (nano banana) supports text-to-image |
| **OpenAI Compatible** | ✅ Configurable | Services compatible with OpenAI image generation API |
| **Other Providers** | ❌ Not supported | Other providers not currently supported |

**How to Use:**
1. Select a text-to-image capable model (e.g., DALL-E 3, Qwen VL Plus, or Gemini 3 Pro Image)
2. Describe the image you want to generate in the conversation
3. AI will automatically invoke image generation and return the result
4. Generated images appear in chat messages and can be downloaded

**Example Prompts:**
```
"Draw an orange cat under moonlight, watercolor style"
"Generate a modern minimalist logo with a tech innovation theme"
"Create a sunset over mountains in oil painting style"
```

> 💡 **Tip**: DALL-E 3 generates high-quality images, while Qwen VL series supports Chinese prompts and responds quickly. Gemini 3 Pro Image (nano banana) offers innovative image generation capabilities.

---

## 🔧 Advanced Configuration

### Proxy Settings

LLMSider supports configuring proxy servers for each connection individually. This is useful when:
- You're behind a corporate firewall
- Need to route traffic through a specific proxy
- Using services blocked in your region
- Want to enhance privacy and security

#### Enabling Proxy

1. **Open Connection Settings**
   - Navigate to Settings → LLMSider → Connections and Models
   - Click the edit icon (✏️) next to your connection

2. **Configure Proxy Settings**:

   | Field | Description | Example |
   |-------|-------------|----------|
   | **Enable Proxy** | Toggle to enable proxy for this connection | ✅ |
   | **Proxy Type** | Select proxy protocol | SOCKS5 / HTTP / HTTPS |
   | **Proxy Host** | Proxy server address | 127.0.0.1 or proxy.example.com |
   | **Proxy Port** | Proxy server port | 1080 (SOCKS5) / 8080 (HTTP) |
   | **Authentication** | Enable if proxy requires login | ✅/❌ |
   | **Username** | Proxy username (if auth enabled) | user123 |
   | **Password** | Proxy password (if auth enabled) | ******** |

3. **Save and Test**
   - Click "Save" to apply settings
   - Send a test message to verify connectivity

#### Proxy Types

**SOCKS5** (Recommended)
- Most versatile and secure
- Works with all providers
- Better performance than HTTP proxies
- Common port: 1080

**HTTP/HTTPS**
- Standard web proxies
- Wide compatibility
- May have limitations with streaming
- Common port: 8080, 3128

#### Common Proxy Setups

**Local Shadowsocks/V2Ray:**
```
Proxy Type: SOCKS5
Proxy Host: 127.0.0.1
Proxy Port: 1080
Authentication: Disabled
```

**Corporate Proxy with Auth:**
```
Proxy Type: HTTP
Proxy Host: proxy.company.com
Proxy Port: 8080
Authentication: Enabled
Username: your_username
Password: your_password
```

**Clash/ClashX:**
```
Proxy Type: HTTP or SOCKS5
Proxy Host: 127.0.0.1
Proxy Port: 7890 (HTTP) or 7891 (SOCKS5)
Authentication: Disabled
```

#### Per-Connection Proxy

- Each connection can have its own proxy settings
- Example use cases:
  - Use proxy for OpenAI (blocked in region)
  - Direct connection for Ollama (local)
  - Different proxies for different providers

#### Troubleshooting Proxy Issues

**Connection Timeout:**
- Verify proxy host and port are correct
- Check if proxy server is running
- Test proxy with other applications

**Authentication Failed:**
- Double-check username and password
- Ensure proxy allows authentication
- Try without authentication first

**Slow Performance:**
- Try SOCKS5 instead of HTTP
- Check proxy server load
- Consider using a faster proxy

**Works for Some Providers, Not Others:**
- Some providers may block proxy IPs
- Try a different proxy server
- Check provider's terms of service

> 💡 **Tip**: You can enable proxy for specific connections only. For example, use proxy for OpenAI while keeping Ollama direct.

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

**Need Help?** [Open an issue](https://github.com/gnuhpc/obsidian-llmsider/issues)
