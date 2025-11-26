# LLMSider

A lightweight AI chat plugin for Obsidian with multi-LLM support. Simple, fast, and easy to use.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/gnuhpc/obsidian-llmsider)

## ✨ Features

- 💬 **Simple Chat Interface** - Clean and intuitive chat UI
- 🤖 **Multi-LLM Support** - Works with OpenAI, Anthropic, and OpenAI-compatible APIs
- 📝 **Session History** - Save and manage your chat sessions
- ⚡ **Real-time Streaming** - Get responses as they're generated
- 🔧 **Easy Configuration** - Simple settings to get started quickly
- 🌐 **Local Model Support** - Works with Ollama and other local LLMs

## 🎯 Why Lite?

This is a streamlined version focused on core chat functionality:

| Feature | Lite Version | Full Version |
|---------|-------------|--------------|
| File Size | ~1.2MB | ~15MB |
| Dependencies | 3 core | 20+ |
| Chat Interface | ✅ | ✅ |
| Advanced Modes | ❌ | ✅ |
| Tool Integration | ❌ | ✅ |
| Learning Curve | Low | Medium |

**Perfect for users who want:**
- Simple AI chat in Obsidian
- Fast and lightweight plugin
- Easy setup and configuration
- Support for multiple LLM providers

## 🚀 Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "LLMSider"
4. Click Install
5. Enable the plugin

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/gnuhpc/obsidian-llmsider/releases)
2. Create a folder `llmsider` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files to the folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

### Development

```bash
# Clone the repository
git clone https://github.com/gnuhpc/obsidian-llmsider.git
cd obsidian-llmsider

# Install dependencies
npm install

# Build for development (auto-rebuild on changes)
npm run dev

# Build for production
npm run build
```

Then link or copy the built files to your Obsidian vault's plugins folder.

## ⚙️ Configuration

### Adding a Provider

1. Open **Obsidian Settings** → **LLMSider**
2. Click **Add Provider**
3. Fill in the provider details:

#### OpenAI
- **Type**: OpenAI
- **Display Name**: Your choice (e.g., "GPT-4")
- **API Key**: Your OpenAI API key
- **Model**: `gpt-4`, `gpt-4-turbo-preview`, `gpt-3.5-turbo`, etc.
- **Max Tokens**: 4096 (default)
- **Temperature**: 0.7 (default, range 0-2)

#### Anthropic (Claude)
- **Type**: Anthropic
- **Display Name**: Your choice (e.g., "Claude")
- **API Key**: Your Anthropic API key
- **Model**: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, etc.
- **Max Tokens**: 4096 (default)
- **Temperature**: 0.7 (default, range 0-1)

#### OpenAI Compatible (Ollama, etc.)
- **Type**: OpenAI Compatible
- **Display Name**: Your choice (e.g., "Ollama")
- **Base URL**: Your API endpoint (e.g., `http://localhost:11434/v1`)
- **API Key**: Any non-empty string if not required
- **Model**: Model name (e.g., `llama2`, `mistral`)
- **Max Tokens**: 4096 (default)
- **Temperature**: 0.7 (default)

4. Click **Save** and enable the provider

### Using the Chat

1. Click the chat icon in the left ribbon, or use Command Palette: "Open Chat"
2. Select your provider from the dropdown
3. Type your message and press Enter or click Send
4. View streaming responses in real-time

### Managing Chat Sessions

- **New Chat**: Click the "+" button
- **Switch Sessions**: Click on session names in the history
- **Delete Sessions**: Click the trash icon next to a session

## 🌟 Supported Models

### OpenAI
- GPT-4 Turbo (`gpt-4-turbo-preview`)
- GPT-4 (`gpt-4`)
- GPT-3.5 Turbo (`gpt-3.5-turbo`)

### Anthropic
- Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
- Claude 3 Opus (`claude-3-opus-20240229`)
- Claude 3 Sonnet (`claude-3-sonnet-20240229`)
- Claude 3 Haiku (`claude-3-haiku-20240307`)

### OpenAI Compatible APIs
- **Ollama**: All local models (llama2, mistral, codellama, etc.)
- **LocalAI**: Custom local models
- **Any OpenAI-compatible API**: As long as it follows the OpenAI API format

## 📋 Example: Ollama Setup

1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama2`
3. In LLMSider settings:
   - Type: **OpenAI Compatible**
   - Base URL: `http://localhost:11434/v1`
   - Model: `llama2`
   - API Key: `ollama` (or any string)

## 🛠️ Development

### Project Structure

```
llmsider/
├── src/
│   ├── main.ts                    # Main plugin entry
│   ├── settings.ts                # Settings UI
│   ├── types.ts                   # Type definitions
│   ├── providers/                 # LLM providers
│   │   ├── base-provider.ts
│   │   ├── openai-provider.ts
│   │   ├── anthropic-provider.ts
│   │   └── openai-compatible-provider.ts
│   ├── ui/
│   │   └── chat-view.ts          # Chat interface
│   └── utils/
│       └── logger.ts              # Logging utility
├── styles.css                     # Plugin styles
├── manifest.json                  # Plugin manifest
├── package.json                   # Dependencies
└── esbuild.config.mjs            # Build configuration
```

### Tech Stack

- **TypeScript**: Type-safe JavaScript
- **Obsidian API**: Plugin development framework
- **AI SDK**: Vercel's AI SDK for LLM integrations
- **esbuild**: Fast JavaScript bundler

### Build Commands

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Powered by [AI SDK](https://sdk.vercel.ai/)
- Inspired by the need for a simple, lightweight AI chat solution

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/gnuhpc/obsidian-llmsider/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gnuhpc/obsidian-llmsider/discussions)

## 🗺️ Roadmap

### Near Term (v0.6 - v0.8)
- [ ] **Custom System Prompts** - Allow users to define custom system prompts
- [ ] **Export Chat History** - Export conversations to Markdown files
- [ ] **Chat Session Management** - Better UI for managing multiple sessions
- [ ] **Mobile Optimization** - Responsive design for mobile devices

### Mid Term (v0.9 - v1.2)
- [ ] **Internationalization (i18n)** - Multi-language support
- [ ] **Code Syntax Highlighting** - Better code block rendering in chat
- [ ] **Image Support** - Send images to vision-capable models
- [ ] **Voice Input** - Speech-to-text for message input
- [ ] **Context Menu Integration** - Quick actions from editor

### Long Term (v2.0+) - Advanced Features

#### 🎯 Multiple Interaction Modes
- [ ] **Guided Mode** - Step-by-step interactive assistance
- [ ] **Agent Mode** - Autonomous task completion with planning
- [ ] **Quick Chat** - Fast inline chat within notes
- [ ] **Autocomplete** - AI-powered suggestions while typing

#### 🧰 Tool Integration
- [ ] **Built-in Tools** - File operations, search, note creation
- [ ] **Custom Tools** - User-defined tool extensions
- [ ] **Tool Execution** - Automated task execution with approval
- [ ] **Plan & Execute** - Multi-step task planning and execution

#### 🔌 Model Context Protocol (MCP)
- [ ] **MCP Server Support** - Connect to external MCP servers
- [ ] **MCP Tools** - Use tools from MCP ecosystem
- [ ] **MCP Resources** - Access external resources via MCP

#### 🔍 Knowledge & Context Management
- [ ] **Vector Search** - Semantic search across vault notes
- [ ] **Similar Notes** - Find related notes automatically
- [ ] **Context Embedding** - Smart context selection for prompts
- [ ] **Memory System** - Long-term conversation memory
- [ ] **Note References** - Link to and cite vault notes in conversations

#### 📝 Content Processing
- [ ] **Diff Rendering** - Visual code/text diff display
- [ ] **Markdown Rendering** - Rich markdown preview in chat
- [ ] **File Attachments** - Attach files to conversations
- [ ] **Multi-file Context** - Work with multiple files simultaneously

#### 🎨 UI Enhancements
- [ ] **Themes Support** - Custom chat themes
- [ ] **Split View** - Side-by-side chat and editor
- [ ] **Floating Window** - Detachable chat window
- [ ] **Keyboard Shortcuts** - Customizable hotkeys

#### ⚙️ Advanced Settings
- [ ] **Prompt Library** - Pre-defined prompt templates
- [ ] **Workflow Automation** - Automated task sequences
- [ ] **Plugin Integration** - Connect with other Obsidian plugins
- [ ] **API Access** - Programmatic plugin control

#### 📊 Analytics & Insights
- [ ] **Usage Statistics** - Token usage and cost tracking
- [ ] **Conversation Analytics** - Insights from chat history
- [ ] **Performance Monitoring** - Response time tracking

---

**Note**: Features marked for v2.0+ are inspired by the full-featured version. The Lite version prioritizes simplicity and ease of use while the full version offers comprehensive AI assistant capabilities.

Want to contribute? Check out our [GitHub repository](https://github.com/gnuhpc/obsidian-llmsider) and join the development!

---

Made with ❤️ by the LLMSider Team
