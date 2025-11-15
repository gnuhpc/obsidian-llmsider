# 🤖 LLMSider - Your AI Copilot for Obsidian

<div align="center">

[![GitHub release](https://img.shields.io/github/v/release/llmsider/obsidian-llmsider?style=flat-square)](https://github.com/llmsider/obsidian-llmsider/releases)
[![License](https://img.shields.io/github/license/llmsider/obsidian-llmsider?style=flat-square)](LICENSE)
[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22llmsider%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=flat-square)](https://obsidian.md/plugins?id=llmsider)

*Transform your Obsidian experience with AI superpowers. LLMSider brings the magic of GitHub Copilot directly into your knowledge workspace, combining intelligent conversations, seamless autocomplete, and powerful automation—all while keeping your notes private and your workflow fluid.*

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## 🌟 Why LLMSider

LLMSider is an AI assistant plugin designed for Obsidian, providing intelligent conversations, autocomplete capabilities, and tool integrations for research writing, project management, data analysis, and various knowledge work scenarios.

The plugin deeply integrates AI capabilities into Obsidian workflows, supporting multiple large language models with flexible conversation modes and extensive functionality.

---

## ✨ What Makes LLMSider Special

### 🎯 Multi-Model Support

LLMSider supports connections to **over 10 AI providers**, including OpenAI GPT-4, Anthropic Claude, GitHub Copilot, Google Gemini, Azure OpenAI, Qwen (通义千问), and local models through Ollama.

Supports instant model switching or simultaneous use of multiple AI services, accommodating both cloud computing power and local privacy requirements.

### 💬 Flexible Conversation Modes

LLMSider offers **three conversation modes** for different work scenarios:

**Normal Mode** for quick Q&A and brainstorming with direct AI interaction. **Guided Mode** breaks complex tasks into manageable steps, displaying specific actions before execution—suitable for multi-step workflows requiring review. **Agent Mode** allows AI to autonomously use tools, search the web, analyze data, and complete complex tasks.

Conversations support context awareness, including file references, selected text, or entire folder contents. Visual diff rendering displays specific changes before applying modifications.

### ⚡ Intelligent Writing Assistance

**Autocomplete**: Provides GitHub Copilot-like real-time autocomplete for notes, documentation, and code writing. The system offers intelligent suggestions based on writing style, vault structure, and current context. Use ⌥[ and ⌥] to cycle through multiple suggestions.

**Quick Chat**: Press **Cmd+/** to activate an inline AI assistant within the editor, getting instant help without leaving the current editing position. Supports operations like continue writing, rewriting, summarizing, with visual diff preview.

**Selection Actions**: Right-click selected text to access AI quick actions: improve expression, fix grammar, translate languages, expand content, summarize key points, or continue writing. Right-click selected text can also choose "Add to LLMSider Context" to add text snippets to conversation context.

**Context Management**: Click the 📎 button in the chat input area to add context, supporting multiple methods like file picker, drag & drop, and folder selection. AI conversations will reference these context materials for more accurate responses. Supports cross-note and cross-paragraph referencing, allowing flexible combination of content from different sources as conversation context.

**Multi-Model Comparison**: Configure multiple AI models simultaneously and switch between them to get different responses to the same question, enabling comparison of response quality across different large language models.

**Result Handling**: For AI model responses, apply changes with one click to directly modify the current file, or generate a separate note file to save the AI's response content for future reference and organization.

**Supported File Formats**:
- **Markdown files** (.md) - Full support including frontmatter. For models with vision capabilities, images within Markdown files will be sent to the AI model for analysis
- **Plain text files** (.txt) - Full support
- **PDF files** (.pdf) - Text extraction supported
- **Other formats** - Can be added as context, readable text content will be extracted

### 🔌 MCP Protocol Support

LLMSider supports **Model Context Protocol (MCP)** for connecting AI to external tools. Add MCP servers to enable features like querying PostgreSQL databases, searching GitHub repositories, or integrating Slack.

Built-in servers support filesystems, databases, search engines, and developer tools. Provides fine-grained permission control and real-time health monitoring with automatic server reconnection.

### 🗄️ Semantic Search and Intelligent Discovery

Traditional search matches keywords, while **semantic search** understands meaning. LLMSider's vector database indexes the entire vault, comprehending concepts and relationships beyond literal text matching.

**Core Features**:
- **Semantic Search**: Finds semantically related notes even when they don't contain exact query terms
- **Similar Documents**: Automatically displays related notes at the bottom of the current note, helping discover potential connections in the knowledge base
- **Context Enhancement**: AI conversations are automatically enhanced with relevant vault content for more accurate responses
- **Smart Recommendations**: Recommends related note links based on current content while writing

Supports multiple embedding providers: OpenAI, Hugging Face, or Ollama local models. Uses intelligent text chunking strategies to optimize retrieval performance.

### �️ A Toolkit That Means Business

LLMSider includes **over 100 specialized tools** that transform your AI from conversationalist to power user:

**Core capabilities** handle everything you'd expect—creating, editing, and organizing files; searching your vault; manipulating text and managing metadata. But we go much further.

**Research tools** fetch web content, search Google and DuckDuckGo, and pull Wikipedia references instantly. Your AI can fact-check, gather sources, and synthesize information from across the internet.

**Financial market tools** (50+ specialized functions) bring professional-grade data analysis to your fingertips. Track stocks, futures, bonds, options, forex, mutual funds, and cryptocurrency with real-time quotes and comprehensive analytics. Analyze derivatives, assess credit risk, review ESG metrics, and tap into alternative data sources. Whether you're a trader, analyst, or investor, your AI assistant becomes a Bloomberg terminal that understands natural language.

Every tool integrates seamlessly—your AI knows when to use which tool and combines them intelligently to solve complex problems.

### 🎨 Interface Design

Interface style aligns with Obsidian's native design, automatically matching dark and light themes. Supports both desktop and mobile devices.

Currently available in **English and Chinese**, with more languages coming. Supports custom keyboard shortcuts to adapt to different workflows.

### 🔒 Privacy and Security

LLMSider adopts a **local-first** approach, with note data leaving the vault only when explicitly sent to AI providers. Supports self-hosted AI models through Ollama or cloud providers.

Provides fine-grained tool permission control for precise access management. Debug mode offers transparent logging functionality.

---

## 🚀 Getting Started

### Installation

**Install via BRAT** (Recommended):
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. In BRAT settings, click "Add Beta Plugin"
3. Enter repository: `llmsider/obsidian-llmsider`
4. Enable the plugin

**From Community Plugins**:
Open Obsidian Settings, navigate to Community Plugins, and search for "LLMSider". Click install and enable. Disable Safe Mode if prompted.

**Manual Installation**:
Download the latest release from [GitHub Releases page](https://github.com/llmsider/obsidian-llmsider/releases), extract files into `YourVault/.obsidian/plugins/llmsider/`, reload Obsidian, and enable the plugin.

### Quick Setup

Basic configuration steps:

**Step 1: Configure Connection**  
Open Settings → LLMSider, select an AI provider (OpenAI, Claude, GitHub Copilot, etc.), and enter the API key. Default configurations are provided.

**Step 2: Add Model**  
Click "Add Model" under the connection, select an appropriate model (such as GPT-4, Claude, etc.) and configure parameters, or use default settings.

**Step 3: Start Using**  
Click the LLMSider icon in the sidebar or open "LLMSider: Open Chat" from the command palette to begin.

---

## 📖 Feature Documentation

**📑 [Documentation Index](docs/INDEX.md)** - Complete documentation overview in English and Chinese

Explore detailed guides for each feature:

### Core Features
- [🔗 **Connections & Models**](docs/en/connections-and-models.md) - Configure AI providers
- [💬 **Chat Interface**](docs/en/chat-interface.md) - Master conversation modes
- [🎯 **Conversation Modes**](docs/en/conversation-modes.md) - Normal, Guided, and Agent modes

### AI Assistance
- [⚡ **Autocomplete**](docs/en/autocomplete.md) - Inline code/text completion
- [💬 **Quick Chat**](docs/en/quick-chat.md) - Instant inline AI help
- [✨ **Selection Popup**](docs/en/selection-popup.md) - Right-click AI actions

### Advanced Features
- [🔌 **MCP Integration**](docs/en/mcp-integration.md) - Extend with external tools
- [🗄️ **Vector Database**](docs/en/vector-database.md) - Semantic search setup
- [🛠️ **Built-in Tools**](docs/en/built-in-tools.md) - 100+ powerful tools

### Configuration
- [⚙️ **Settings Guide**](docs/en/settings-guide.md) - Complete settings reference

### 中文文档 / Chinese Documentation
- [📖 **完整中文文档**](README.zh-CN.md) - Complete Chinese documentation
- [� **快速开始**](docs/zh-CN/QUICKSTART.md) - 5-minute quick start guide

---

## 🎯 Use Cases

LLMSider is built for anyone who uses Obsidian to think, write, research, or organize information. Here are some ways it can help:

**Writing and Research**  
Draft and refine your writing with intelligent autocomplete that learns your style. Get help expanding ideas, improving clarity, or reorganizing content. Pull in web research and format citations without leaving your notes.

**Note Organization**  
Use semantic search to find related notes even when you don't remember exact keywords. Let AI help categorize and tag your content, or generate summaries of long documents and meeting notes.

**Data and Analysis**  
Access financial market data, web search, and other built-in tools directly through conversation. Analyze information and generate reports from your notes and external sources.

**Workflow Automation**  
Create custom workflows by connecting external tools through MCP. Process multiple files, maintain documentation, or set up repeating tasks with AI assistance that understands your specific context.

---

## 🤝 Join the LLMSider Community

LLMSider grows stronger with every contribution, whether you're reporting bugs, suggesting features, writing code, or helping others. Here's how you can be part of building the future of AI-powered knowledge work:

### 🐛 Bug Reports

For bug reports, please [submit an issue](https://github.com/llmsider/obsidian-llmsider/issues) with the following information:

**Basic Information**:
- Detailed reproduction steps
- Environment details (Obsidian version, OS, plugin version)
- Expected vs. actual behavior
- Relevant screenshots

**Log Collection**:
1. Enable **Debug Mode** in plugin settings (Settings → LLMSider → Debug Mode)
2. Reproduce the issue
3. Collect Obsidian console logs:
   - **Windows/Linux**: Press `Ctrl + Shift + I`
   - **macOS**: Press `Cmd + Option + I`
   - Switch to the **Console** tab
   - Right-click in the log area, select **Save as...** to save the log file
4. Attach both the log file and screenshots to the GitHub Issue

Complete log information helps quickly identify and resolve issues.

### 💡 Feature Requests

Welcome to [submit feature requests](https://github.com/llmsider/obsidian-llmsider/issues/new?template=feature_request.md), describing use cases, expected solutions, and their value to workflows.

### 🔧 Code Contributions

Developers are welcome to fork the repository and submit Pull Requests. Contributions include but are not limited to bug fixes, performance optimizations, and new feature development. Please ensure code passes tests, follows coding standards, and provides clear commit messages.

### 📚 Documentation Improvements

Documentation contributions include error corrections, example additions, tutorial writing, multi-language translations, and video guide creation.

### 💬 Community Discussion

Join [GitHub Discussions](https://github.com/llmsider/obsidian-llmsider/discussions) for conversations. [Discord community](https://discord.gg/llmsider) launching soon. Follow [Twitter/X](https://twitter.com/llmsider) for updates.

---

## 🌟 Support & Resources

### 📖 Documentation Resources

Comprehensive [documentation](docs/) covers all feature descriptions. Consult the [Documentation Index](docs/INDEX.md) for needed content, including basic configuration, advanced features, and troubleshooting.

### ❤️ Support the Project

LLMSider development and maintenance requires ongoing investment. To support project development, consider sponsoring through [GitHub Sponsors](https://github.com/sponsors/llmsider) or [Buy Me a Coffee](https://buymeacoffee.com/obsidian.llmsider).

Sponsorship funds new feature development, performance optimization, documentation translation, and community support. Sponsors receive early access to beta features.

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

Built with ❤️ using:
- [Obsidian](https://obsidian.md) - The knowledge base platform
- [Vercel AI SDK](https://sdk.vercel.ai) - AI streaming and tool calls
- [Model Context Protocol](https://modelcontextprotocol.io) - Extensible tool integration
- [Orama](https://oramasearch.com) - Vector database and search
- [CodeMirror 6](https://codemirror.net) - Code editor framework

Special thanks to:
- The Obsidian team for creating an amazing platform
- All contributors and users providing feedback
- Open source projects that made this possible

---

<div align="center">

**Made with 🤖 and ☕ by the LLMSider Team**

[⭐ Star us on GitHub](https://github.com/llmsider/obsidian-llmsider) | [🐦 Follow on Twitter](https://twitter.com/llmsider) | [📖 Read the Docs](docs/)

</div>
