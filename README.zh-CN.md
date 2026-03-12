# LLMSider - Obsidian AI 副驾驶

<div align="center">

[![GitHub release](https://img.shields.io/github/v/release/gnuhpc/obsidian-llmsider?style=flat-square)](https://github.com/gnuhpc/obsidian-llmsider/releases)
[![License](https://img.shields.io/github/license/gnuhpc/obsidian-llmsider?style=flat-square)](LICENSE)
[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22llmsider%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=flat-square)](https://obsidian.md/plugins?id=llmsider)

把聊天、写作辅助、Agent 工具调用、MCP、语义搜索、本地技能和可选本地推理带进 Obsidian。

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## 为什么选择 LLMSider

LLMSider 不是单纯把一个聊天窗口塞进 Obsidian，而是把 AI 工作流接入你的笔记环境。它覆盖日常写作辅助、分步式任务引导、自主工具调用、知识库检索、MCP 外部工具扩展，以及 Ollama 和 WebLLM 这类本地优先能力。

当前核心能力：

- 多提供商连接与独立模型管理
- 普通聊天、Agent 模式、**超能力 (Superpower)** 分步交互式引导
- 编辑器内 Quick Chat、选择弹窗、自动补全
- 丰富上下文输入：笔记、文件夹、图片、PDF、Office、YouTube 字幕、粘贴文本
- **统一工具管理器 (Unified Tool Manager)**：无缝管理 100+ 内置工具与 MCP 外部服务
- 语义搜索、相似笔记、基于知识库的上下文增强
- 本地 Skills、提示词管理、记忆设置
- **提示词优化**：一键增强你的输入，获得更高质量的 AI 回复
- **高级速读**：实时摘要、交互式思维导图（支持 SVG/PNG/MD 导出）及自定义分析
- **本地推理**：可选 `WebLLM` (WebGPU) 实现纯本地浏览器端推理
- **自动更新**：内置版本检查与一键无损更新插件功能

---

## 当前功能概览

### 连接与模型

LLMSider 采用 `连接 + 模型` 架构。你可以配置多个连接，并为每个连接挂载多个模型，在聊天界面里直接切换。

当前代码中支持的连接类型包括：

- OpenAI
- Anthropic
- Azure OpenAI
- GitHub Copilot
- Gemini
- Groq
- xAI
- OpenRouter
- OpenAI-Compatible
- SiliconFlow
- Kimi
- Ollama
- Qwen
- Free Qwen
- Free DeepSeek
- Hugging Chat
- OpenCode
- WebLLM (Beta)

### 对话流程

目前支持：

- `Normal Mode`：直接问答和写作辅助
- `Agent Mode`：自主调用工具完成任务
- `超能力 (Superpower)`：叠加在普通模式上的引导层。提供分步指引、交互式提问以及具备错误恢复能力的工具执行流程。即使工具关闭，它也能作为纯引导对话正常工作。

聊天会话还会保存模型选择、上下文、引导目标和当前激活的 Skill。

### 编辑器内 AI

- `Quick Chat`：`Cmd+/` 呼出内联 AI
- `Selection Popup`：选中文本后的浮动操作，支持快速聊天和添加到上下文
- `Autocomplete`：类似 Copilot 的实时补全
- AI 改写结果支持差异预览和一键应用

### 上下文与知识库工作流

支持作为上下文发送的内容包括：

- Markdown 笔记和文件夹
- 选中文本
- 图片
- PDF
- Office 文档
- YouTube 链接
- 粘贴的文本和链接

LLMSider 还支持自动引入当前笔记、推荐相关文件，并通过向量检索增强知识库问答。

### 工具、MCP 与 Skills

- **统一工具管理器**：核心引擎，管理并执行 100+ 内置工具及外部 MCP 服务，支持统一 Schema 校验与实时权限控制。
- **动态内置工具**：可扩展的工具体系，覆盖笔记操作、网页搜索、内容抓取、财经、新闻和通用工具。
- MCP 服务管理，支持按服务和按工具控制权限
- 本地 Skills 目录、单个 Skill 开关、默认 Skill 选择、Skills Market 界面

### 搜索、记忆与本地推理

- 语义搜索与相似笔记发现
- 会话记忆相关设置
- 支持在兼容设备上使用 WebLLM 做本地浏览器推理

---

## 快速开始

### 安装

**社区插件**

打开 Obsidian 设置 -> 社区插件 -> 浏览 -> 搜索 `LLMSider` -> 安装并启用。

**BRAT**

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. 点击 `Add Beta Plugin`
3. 输入 `gnuhpc/obsidian-llmsider`
4. 启用插件

**手动安装**

从 [GitHub Releases](https://github.com/gnuhpc/obsidian-llmsider/releases) 下载最新版本，解压到 `你的笔记库/.obsidian/plugins/llmsider/`，重载 Obsidian 后启用。

### 快速配置

1. 打开 `设置 -> LLMSider`
2. 新增一个连接
3. 在该连接下新增至少一个聊天模型
4. 执行 `LLMSider: Open Chat`
5. 按需启用 MCP、向量搜索、Skills 或 WebLLM

---

## 文档入口

- [文档索引](docs/INDEX.md)
- [连接与模型](docs/zh/connections-and-models.md)
- [聊天界面](docs/zh/chat-interface.md)
- [对话模式](docs/zh/conversation-modes.md)
- [快速聊天](docs/zh/quick-chat.md)
- [选择弹窗](docs/zh/selection-popup.md)
- [自动补全](docs/zh/autocomplete.md)
- [上下文引用](docs/zh/context-reference.md)
- [内置工具](docs/zh/built-in-tools.md)
- [MCP 集成](docs/zh/mcp-integration.md)
- [搜索增强](docs/zh/search-enhancement.md)
- [速读](docs/zh/speed-reading.md)
- [设置指南](docs/zh/settings-guide.md)

英文文档：

- [English README](README.md)
- [Documentation Index](docs/INDEX.md)

---

## 说明

- `WebLLM (Beta)` 依赖浏览器 WebGPU 和兼容硬件。
- `OpenCode` 需要本地 OpenCode 服务或 CLI 环境。
- 内置工具和 MCP 工具都可以在设置中分别控制权限。

---

## 支持

- [GitHub Issues](https://github.com/gnuhpc/obsidian-llmsider/issues)
- [GitHub Discussions](https://github.com/gnuhpc/obsidian-llmsider/discussions)
- [GitHub Sponsors](https://github.com/sponsors/llmsider)
