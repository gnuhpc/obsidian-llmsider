# LLMSider - AI Copilot for Obsidian

<div align="center">

[![GitHub release](https://img.shields.io/github/v/release/gnuhpc/obsidian-llmsider?style=flat-square)](https://github.com/gnuhpc/obsidian-llmsider/releases)
[![License](https://img.shields.io/github/license/gnuhpc/obsidian-llmsider?style=flat-square)](LICENSE)
[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22llmsider%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=flat-square)](https://obsidian.md/plugins?id=llmsider)

AI workflows for Obsidian: chat, inline writing help, agent tool use, MCP, semantic search, local skills, and optional local inference.

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## Why LLMSider

LLMSider turns Obsidian into an AI workspace instead of just a chat box. It supports day-to-day writing assistance, guided task execution, autonomous tool use, vault search, external MCP tools, and local-first options such as Ollama and WebLLM.

Core capabilities:

- Multi-provider connections with separate model management
- Normal chat, Agent mode, and **Superpower** for interactive, robust workflows
- Quick Chat, selection popup, and autocomplete inside the editor
- Rich context input: notes, folders, images, PDFs, Office files, YouTube transcripts, pasted text
- **Unified Tool Manager**: Seamlessly manages 100+ built-in tools and external MCP servers
- Semantic search, similar notes, and vault-aware context enhancement
- Local skills, prompt management, and memory controls
- **Prompt Optimization**: One-click enhancement of your message for better AI results
- **Advanced Speed Reading**: Real-time summaries, interactive mind maps (SVG/PNG/MD export), and custom analysis
- **Local Inference**: Optional browser-side inference with `WebLLM` (WebGPU)
- **Automatic Updates**: Built-in version checker and one-click plugin update

---

## Current Feature Set

### Connections and models

LLMSider uses a `Connection + Model` architecture. You can configure multiple connections and attach multiple models to each connection, then switch models from chat without rebuilding your setup.

Current connection types in the codebase include:

- OpenAI
- Anthropic
- Azure OpenAI
- GitHub Copilot
- Gemini
- Groq
- xAI
- OpenRouter
- OpenAI-compatible endpoints
- SiliconFlow
- Kimi
- Ollama
- Qwen
- Free Qwen
- Free DeepSeek
- Hugging Chat
- OpenCode
- WebLLM (Beta)

### Conversation flows

LLMSider currently supports:

- `Normal Mode` for direct chat and editing help
- `Agent Mode` for autonomous tool calling
- `Superpower`: A layer on Normal mode that provides step-by-step guidance, interactive questions, and robust tool execution with error recovery. It works even when tools are disabled, acting as a guided dialogue.

The chat view also keeps per-session state for model choice, context, guided goal, and active skill.

### In-editor AI

- `Quick Chat`: inline AI actions with `Cmd+/`
- `Selection Popup`: floating actions for selected text, including quick chat and add-to-context
- `Autocomplete`: Copilot-style inline suggestions for writing and code
- Diff preview and one-click apply for AI-generated edits

### Context and knowledge workflows

You can send context from:

- Markdown notes and folders
- Selected text
- Images
- PDF files
- Office documents
- YouTube URLs
- Pasted text and links

LLMSider can also auto-include the current note, recommend related files, and use vector search to improve retrieval from your vault.

### Tools, MCP, and skills

- **Unified Tool Manager**: A central engine to manage and execute 100+ built-in tools and external MCP servers with consistent schemas and real-time permission controls.
- **Dynamic Built-in Tools**: Extensible tool system covering note operations, web search, content fetching, finance, news, and utilities.
- MCP server management with per-server and per-tool control
- Local skills directory, per-skill enable/disable, default skill selection, and skill market UI

### Search, memory, and local inference

- Semantic search and similar-note discovery
- Memory settings for conversation handling
- WebLLM support for local browser inference on compatible devices

---

## Getting Started

### Installation

**Community Plugins**

Open Obsidian Settings -> Community Plugins -> Browse -> search for `LLMSider` -> Install -> Enable.

**BRAT**

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Click `Add Beta Plugin`
3. Enter `gnuhpc/obsidian-llmsider`
4. Enable the plugin

**Manual**

Download the latest release from [GitHub Releases](https://github.com/gnuhpc/obsidian-llmsider/releases), extract it into `YourVault/.obsidian/plugins/llmsider/`, reload Obsidian, then enable LLMSider.

### Quick setup

1. Open `Settings -> LLMSider`
2. Add a connection
3. Add at least one chat model under that connection
4. Open `LLMSider: Open Chat`
5. Optionally enable MCP, vector search, skills, or WebLLM

---

## Documentation

- [Documentation Index](docs/INDEX.md)
- [Connections & Models](docs/en/connections-and-models.md)
- [Chat Interface](docs/en/chat-interface.md)
- [Conversation Modes](docs/en/conversation-modes.md)
- [Quick Chat](docs/en/quick-chat.md)
- [Selection Popup](docs/en/selection-popup.md)
- [Autocomplete](docs/en/autocomplete.md)
- [Context Reference](docs/en/context-reference.md)
- [Built-in Tools](docs/en/built-in-tools.md)
- [MCP Integration](docs/en/mcp-integration.md)
- [Search Enhancement](docs/en/search-enhancement.md)
- [Speed Reading](docs/en/speed-reading.md)
- [Settings Guide](docs/en/settings-guide.md)

中文文档:

- [中文 README](README.zh-CN.md)
- [中文文档索引](docs/INDEX.md)

---

## Notes

- `WebLLM (Beta)` requires browser/WebGPU support and compatible hardware.
- `OpenCode` requires the local OpenCode server or CLI setup.
- Built-in tools and MCP tools have separate permission controls in settings.

---

## Support

- [GitHub Issues](https://github.com/gnuhpc/obsidian-llmsider/issues)
- [GitHub Discussions](https://github.com/gnuhpc/obsidian-llmsider/discussions)
- [GitHub Sponsors](https://github.com/sponsors/llmsider)
