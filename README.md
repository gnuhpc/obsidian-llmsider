# 🤖 LLMSider - Your AI Copilot for Obsidian

<div align="center">

[![GitHub release](https://img.shields.io/github/v/release/gnuhpc/obsidian-llmsider?style=flat-square)](https://github.com/gnuhpc/obsidian-llmsider/releases)
[![License](https://img.shields.io/github/license/gnuhpc/obsidian-llmsider?style=flat-square)](LICENSE)
[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22llmsider%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=flat-square)](https://obsidian.md/plugins?id=llmsider)

*Enterprise-grade AI capabilities for personal knowledge management. LLMSider delivers comprehensive AI workflow support for Obsidian—from intelligent writing assistance to complex task automation, making AI your capable assistant for thinking and creating while protecting your data privacy.*

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## 🌟 Why LLMSider

LLMSider is an AI assistant plugin designed specifically for knowledge workers, deeply integrating large language model capabilities into daily Obsidian usage. Whether you're a researcher, content creator, project manager, or data analyst, LLMSider provides intelligent support throughout your workflow.

**Core Advantages**:
- **Flexible Multi-Model Support**: Connect to 10+ mainstream AI providers, choosing the most suitable model for each task
- **Deep Workflow Integration**: From writing assistance to file operations, AI capabilities seamlessly blend into every aspect of the editor
- **Privacy-First Design**: Data sent only when you actively use features, with full offline support via local models
- **Professional Tool Ecosystem**: 100+ built-in tools covering research, analysis, automation, and more

---

## ✨ What Makes LLMSider Special

### 🎯 Multi-Model Support

LLMSider supports connections to **over 10 AI providers**, including OpenAI GPT-4, Anthropic Claude, GitHub Copilot, Google Gemini, Azure OpenAI, Qwen (通义千问), and local models through Ollama.

Supports instant model switching or simultaneous use of multiple AI services, accommodating both cloud computing power and local privacy requirements. Notably, you can **access models from multiple providers for free**: GitHub Copilot (for subscribers), Google Gemini (free tier), DeepSeek (free tier), Qwen (free tier), and Ollama local models (completely free), allowing you to experience different model capabilities at zero or low cost.

![Multi-Model Support Demo](https://github.com/gnuhpc/obsidian-llmsider/releases/download/v1.1.0/models-connetions.gif)

### 💬 Flexible Conversation Modes

LLMSider offers **three conversation modes** for different work scenarios:

**Normal Mode** for quick Q&A and brainstorming with direct AI interaction. **Guided Mode** breaks complex tasks into manageable steps, displaying specific actions before execution—suitable for multi-step workflows requiring review. **Agent Mode** allows AI to autonomously use tools, search the web, analyze data, and complete complex tasks.

![Normal Mode Demo](https://github.com/gnuhpc/obsidian-llmsider/releases/download/v1.1.0/normal-mode.gif)

Conversations support context awareness, including file references, selected text, or entire folder contents. Visual diff rendering displays specific changes before applying modifications.

### ⚡ Intelligent Writing Assistance

**Quick Chat**: Press **Cmd+/** to activate an inline AI assistant within the editor, similar to Notion AI's instant interaction experience. Get help without leaving the current editing position, supporting operations like continue writing, rewriting, and summarizing, with visual diff preview for precise control over every modification.

![Quick Chat Demo](https://github.com/gnuhpc/obsidian-llmsider/releases/download/v1.1.0/quickchat.gif)

**Selection Actions**: Right-click selected text to access AI quick actions: improve expression, fix grammar, translate languages, expand content, summarize key points, or continue writing. Right-click selected text can also choose "Add to LLMSider Context" to add text snippets to conversation context.

**Context Management**: Click the 📎 button in the chat input area to add context, supporting **multiple input methods**:
- **Drag & Drop**: Directly drag note files, folders, images, or text into the chat box
- **File Picker**: Browse and add content from your vault through the file selector
- **Paste Content**: Paste text, links, or Obsidian internal links (`[[Note Name]]`)
- **Command Palette**: Quickly add via "Include current note" or "Include selected text" commands
- **Smart Search**: Find and add related notes through the search function
- **Right-Click Menu**: Select text and right-click to choose "Add to LLMSider Context"

**Supported Content Types**:
- **Markdown Notes** - Full text extraction, optional automatic image embedding (multimodal models)
- **PDF Documents** - Auto-extract text content, support multi-page documents
- **Image Files** - JPG, PNG, GIF, WebP formats, automatically encoded for vision-capable models
- **Office Documents** - Word (.docx), Excel (.xlsx), PowerPoint (.pptx) text and table extraction
- **YouTube Videos** - Input URL to automatically extract subtitle content
- **Selected Text** - Any selected content in the current note
- **Text Snippets** - Directly pasted or dragged plain text

AI conversations reference these context materials for more accurate responses. Supports cross-note and cross-paragraph referencing, allowing flexible combination of content from different sources. The system also **automatically recommends related notes** based on added content, helping you discover potential connections.

**Multi-Model Comparison**: Configure multiple AI models simultaneously and switch between them to get different responses to the same question, enabling comparison of response quality across different large language models.

![Multi-Model Comparison Demo](https://github.com/gnuhpc/obsidian-llmsider/releases/download/v1.1.0/vision-understanding.gif)

**Result Handling**: For AI model responses, apply changes with one click to directly modify the current file, or generate a separate note file to save the AI's response content for future reference and organization.

**Autocomplete**: Provides GitHub Copilot-like real-time autocomplete for notes, documentation, and code writing. The system offers intelligent suggestions based on writing style, vault structure, and current context. Use ⌥[ and ⌥] to cycle through multiple suggestions.

**Supported File Formats**:
- **Markdown files** (.md) - Full support including frontmatter. For models with vision capabilities, images within Markdown files will be sent to the AI model for analysis
- **Plain text files** (.txt) - Full support
- **PDF files** (.pdf) - Text extraction supported
- **EPUB files** (.epub) - Text extraction supported (requires [Epub Reader](https://github.com/caronc/obsidian-epub-plugin) plugin)
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

### 🔍 QMD Integration - Advanced Hybrid Search

For users who need the ultimate in search quality and privacy, LLMSider integrates with **[QMD (Query Markup Documents)](https://github.com/tobi/qmd)** - a state-of-the-art local search engine that combines:

- **BM25 Full-Text Search** - Lightning-fast keyword matching
- **Vector Semantic Search** - Deep contextual understanding
- **LLM Re-ranking** - AI-powered relevance scoring

QMD runs **100% locally** using GGUF models, ensuring complete privacy with no data leaving your machine. Perfect for sensitive research, confidential notes, or offline use.

**Quick Setup**: Install QMD via Bun, index your vault, and connect via MCP. See the [QMD Setup Guide](docs/en/qmd-setup-guide.md) for step-by-step instructions.
### ⚡ Speed Reading

**Speed Reading** quickly generates in-depth summaries, core insights, knowledge structure diagrams, and extended reading suggestions for your notes. It uses AI to comprehensively analyze the current note and displays the results in a real-time sidebar drawer.

![Speed Reading Demo](https://github.com/gnuhpc/obsidian-llmsider/releases/download/v1.1.0/speed-reading.gif)
### 🛠️ A Toolkit That Means Business

LLMSider includes **over 100 specialized tools** that transform your AI from conversationalist to power user:

**Core capabilities** handle everything you'd expect—creating, editing, and organizing files; searching your vault; manipulating text and managing metadata. But we go much further.

**Research tools** fetch web content, search Google and DuckDuckGo, and pull Wikipedia references instantly. Your AI can fact-check, gather sources, and synthesize information from across the internet.

**Financial market tools** provide basic financial data capabilities including forex data and Yahoo Finance stock queries. Stock panorama tools offer comprehensive company profiles, industry classifications, concept sectors, and market data for Hong Kong and US stocks - including investment ratings, industry rankings (market value, revenue, profit, ROE, dividend yield), company executive information, corporate actions timeline (dividends, earnings, splits), and regulatory filings (SEC/HKEX documents).

Every tool integrates seamlessly—your AI knows when to use which tool and combines them intelligently to solve complex problems.

### 🌐 Language Support

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
3. Enter repository: `gnuhpc/obsidian-llmsider`
4. Enable the plugin

**From Community Plugins**:
Open Obsidian Settings, navigate to Community Plugins, and search for "LLMSider". Click install and enable. Disable Safe Mode if prompted.

**Manual Installation**:
Download the latest release from [GitHub Releases page](https://github.com/gnuhpc/obsidian-llmsider/releases), extract files into `YourVault/.obsidian/plugins/llmsider/`, reload Obsidian, and enable the plugin.

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
- [📝 **Built-in Prompts**](docs/en/built-in-prompts.md) - Pre-configured prompts for common tasks
- [📎 **Context Reference**](docs/en/context-reference.md) - Drag & drop files, images, text as context

### Advanced Features
- [🔌 **MCP Integration**](docs/en/mcp-integration.md) - Extend with external tools
- [🗄️ **Search Enhancement**](docs/en/search-enhancement.md) - Semantic search setup
- [🛠️ **Built-in Tools**](docs/en/built-in-tools.md) - 100+ powerful tools
- [⚡ **Speed Reading**](docs/en/speed-reading.md) - Quick note summaries & mind maps

### Configuration
- [⚙️ **Settings Guide**](docs/en/settings-guide.md) - Complete settings reference

### 中文文档 / Chinese Documentation
- [📖 **完整中文文档**](README.zh-CN.md) - Complete Chinese documentation
- [� **快速开始**](docs/zh-CN/QUICKSTART.md) - 5-minute quick start guide

---

## 🎯 Typical Use Cases

LLMSider integrates AI capabilities into your real work scenarios:

### � Deep Reading & Analysis

When reading lengthy PDF papers or EPUB books, **drag files** into chat for AI to generate summaries and key points. Use **Speed Reading** to automatically extract core insights and create mind maps, helping you grasp structure quickly. **Semantic Search** finds related notes in your vault for comparative reading, **Similar Documents** discovers potential connections. For complex concepts, **Cmd+/** triggers quick chat for detailed explanations, **Multi-Model Comparison** analyzes the same text from different AI perspectives.

### ✍️ Writing Improvement

While writing, **Autocomplete** suggests content in real-time based on your style. Select paragraphs to optimize, **Selection Popup** offers quick actions like improve expression, fix grammar, or adjust tone. Use **Cmd+/** to activate quick chat for expanding arguments, adding examples, or reorganizing content, with all changes controlled through **visual diff preview**.

For complex content optimization tasks, **Guided Mode** helps you explore multiple improvement directions: AI presents different rewriting approaches step-by-step (such as academic expression, conversational style, concise version), waiting for your confirmation at each step before proceeding. **Agent Mode** provides fully automated writing optimization: AI autonomously analyzes article structure, searches for relevant materials, optimizes argumentation logic, supplements data support, and presents a complete improved version. **One-click translation** generates multilingual versions, or let AI **create separate notes** to save different versions for comparison.

### 🔬 In-Depth Research & Writing

When writing research reports, use **Semantic Search** to locate all relevant literature notes, **drag multiple files** for AI to extract common viewpoints and research gaps. Query Wikipedia, academic databases, or **Financial Data** directly via **MCP tools** to supplement materials. In **Guided Mode**, let AI execute literature review, data analysis, and conclusion writing step-by-step, with each output **applied with one click** to the current document. **Vector Database** correlates historical research notes for deeper insights based on past experience. **Agent Mode** lets AI autonomously search web resources and organize citations, finally use **Speed Reading** to generate executive summaries...

---

## 🤝 Join the LLMSider Community

LLMSider grows stronger with every contribution, whether you're reporting bugs, suggesting features, writing code, or helping others. Here's how you can be part of building the future of AI-powered knowledge work:

### 🐛 Bug Reports

Found a bug? Please [submit an issue](https://github.com/gnuhpc/obsidian-llmsider/issues) with:
- Detailed reproduction steps
- Environment details (Obsidian version, OS, plugin version)
- Expected vs. actual behavior
- Relevant screenshots or error messages

### 💡 Feature Requests

Have an idea? [Submit a feature request](https://github.com/gnuhpc/obsidian-llmsider/issues/new?template=feature_request.md).

### 📚 Documentation Improvements

Help improve docs, add examples, or translate to other languages.

### 💬 Community Discussion

Join [GitHub Discussions](https://github.com/gnuhpc/obsidian-llmsider/discussions). Follow [Twitter/X](https://twitter.com/llmsider) for updates.

---

## 🌟 Support & Resources

### 📖 Documentation Resources

Explore the [full documentation](docs/) or check the [Documentation Index](docs/INDEX.md) for quick navigation.

### ❤️ Support the Project

If LLMSider helps you, consider supporting via [GitHub Sponsors](https://github.com/sponsors/llmsider) or [Buy Me a Coffee](https://buymeacoffee.com/obsidian.llmsider).

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

**Made with 🤖 and ☕ by gnuhpc**

[⭐ Star us on GitHub](https://github.com/gnuhpc/obsidian-llmsider) | [🐦 Follow on Twitter](https://twitter.com/llmsider) | [📖 Read the Docs](docs/)

</div>
