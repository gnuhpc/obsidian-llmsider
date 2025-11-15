# 🤖 LLMSider - 你的 Obsidian AI 副驾驶

<div align="center">

[![GitHub release](https://img.shields.io/github/v/release/llmsider/obsidian-llmsider?style=flat-square)](https://github.com/llmsider/obsidian-llmsider/releases)
[![License](https://img.shields.io/github/license/llmsider/obsidian-llmsider?style=flat-square)](LICENSE)
[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22llmsider%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=flat-square)](https://obsidian.md/plugins?id=llmsider)

*用 AI 超能力改变你的 Obsidian 体验。LLMSider 将 GitHub Copilot 的魔力直接带入你的知识工作空间，融合智能对话、无缝自动补全和强大的自动化能力——同时保护你的笔记隐私，让你的工作流程行云流水。*

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## 🌟 为什么选择 LLMSider

LLMSider 是一个为 Obsidian 设计的 AI 助手插件，提供智能对话、自动补全和工具集成能力，适用于研究写作、项目管理、数据分析等多种知识工作场景。

本插件将 AI 能力深度整合到 Obsidian 工作流程中，支持多种大语言模型，提供灵活的对话模式和丰富的扩展功能。

---

## ✨ LLMSider 的独特之处

### 🎯 多模型支持

LLMSider 支持连接**超过 10 个 AI 提供商**，包括 OpenAI GPT-4、Anthropic Claude、GitHub Copilot、Google Gemini、Azure OpenAI、通义千问，以及通过 Ollama 使用的本地模型。

支持即时切换模型或同时使用多个 AI 服务，兼顾云端算力和本地隐私的不同需求。

### 💬 灵活的对话模式

LLMSider 提供**三种对话模式**以适应不同工作场景：

**普通模式**适用于快速问答和头脑风暴，提供直接的 AI 对话交互。**引导模式**将复杂任务分解为可管理的步骤，在执行前展示每个操作的具体内容，适合需要审核的多步骤工作流程。**智能体模式**允许 AI 自主使用工具、搜索网络、分析数据并完成复杂任务。

对话支持上下文感知，可引用文件、选中文本或包含整个文件夹内容。提供可视化的差异渲染功能，在应用修改前展示具体变更。

### ⚡ 智能写作辅助

**自动补全**：提供类似 GitHub Copilot 的实时自动补全功能，支持笔记、文档和代码编写。系统会根据写作风格、笔记库结构和当前上下文提供智能建议。使用 ⌥[ 和 ⌥] 可在多个建议间切换。

**快速聊天（Quick Chat）**：按 **Cmd+/** 可在编辑器中调出内联 AI 助手，无需离开当前编辑位置即可获得即时帮助。支持续写、改写、总结等多种操作，并提供可视化的差异预览。

**选择操作**：右键选中的文本可使用 AI 快速操作：改进表达、修正语法、翻译语言、扩展内容、总结要点或继续写作。右键选中文本还可以选择"添加到 LLMSider 上下文"，将文本片段添加到对话上下文中。

**上下文管理**：点击对话输入框的 📎 按钮可添加上下文，支持选择文件、拖放文件、选择文件夹等多种方式。AI 对话时会参考这些上下文内容，提供更准确的回答。支持跨笔记文件、跨段落进行引用，可灵活组合不同来源的内容作为对话上下文。

**多模型对比**：可以同时配置多个 AI 模型，通过切换模型对同一问题获取不同的回答，便于对比不同大模型的响应结果和质量。

**结果处理**：对于大模型返回的内容，可以一键应用更改直接修改当前文件，或者生成单独的笔记文件保存 AI 的回答内容，方便后续参考和整理。

**支持的文件格式**：
- **Markdown 文件** (.md) - 完整支持，包括 frontmatter。对于支持图片识别的模型，Markdown 文件中的图片将一并发送给大模型进行分析
- **纯文本文件** (.txt) - 完整支持
- **PDF 文件** (.pdf) - 支持文本提取
- **其他格式** - 可添加为上下文，将提取可读文本内容

### 🔌 MCP 协议支持

LLMSider 支持**模型上下文协议 (MCP)**，可连接 AI 与外部工具。通过添加 MCP 服务器，可实现查询 PostgreSQL 数据库、搜索 GitHub 仓库、集成 Slack 等功能。

内置服务器支持连接文件系统、数据库、搜索引擎和开发工具。提供细粒度的权限控制和实时健康监控，支持服务器自动重连。

### 🗄️ 语义搜索与智能关联

传统搜索基于关键词匹配，**语义搜索**则理解内容含义。LLMSider 的向量数据库会索引整个笔记库，理解概念和关系，而非仅匹配字面文字。

**核心功能**：
- **语义搜索**：找到语义相关的笔记，即使不包含查询的确切词语
- **相似文档**：在笔记底部自动显示与当前笔记相关的其他笔记，帮助发现知识库中的潜在联系
- **上下文增强**：AI 对话会自动使用笔记库中的相关内容进行增强，提供更准确的回答
- **智能推荐**：在编写时根据当前内容推荐相关笔记链接

支持多种嵌入提供商：OpenAI、Hugging Face 或 Ollama 本地模型。采用智能文本分块策略以优化检索效果。

### 🛠️ 丰富的内置工具

LLMSider 包含**超过 100 个内置工具**，覆盖多个功能领域：

**核心工具**：文件创建、编辑和组织；笔记库搜索；文本操作和元数据管理。

**研究工具**：网页内容获取、Google 和 DuckDuckGo 搜索、维基百科查询，支持信息收集和来源核实。

**金融市场工具**（50+ 专业功能）：提供股票、期货、债券、期权、外汇、基金和加密货币的实时数据和分析功能，包括衍生品定价、信用风险评估、ESG 指标等。

工具之间可以组合使用，AI 会根据任务自动选择合适的工具。

### 🎨 界面设计

界面风格与 Obsidian 原生设计保持一致，自动匹配深色和浅色主题。支持桌面和移动设备。

目前提供**中文和英文**界面，后续将支持更多语言。支持自定义键盘快捷键以适配不同工作流程。

### 🔒 隐私与安全

LLMSider 采用**本地优先**策略，笔记数据仅在明确发送给 AI 提供商时才会离开笔记库。支持通过 Ollama 使用自托管 AI 模型，也可选择云端提供商。

提供细粒度的工具权限控制，可精确管理 AI 的访问范围。调试模式提供透明的日志记录功能。

---

## 🚀 快速开始

### 安装

**使用 BRAT 安装**（推荐）：
1. 安装 [BRAT 插件](https://github.com/TfTHacker/obsidian42-brat)
2. 在 BRAT 设置中点击"Add Beta Plugin"
3. 输入仓库地址：`llmsider/obsidian-llmsider`
4. 启用插件

**从社区插件安装**：
打开 Obsidian 设置，导航到社区插件，搜索"LLMSider"。点击安装并启用。如果看到安全模式警告，需要先禁用它。

**手动安装**：
从 [GitHub Releases 页面](https://github.com/llmsider/obsidian-llmsider/releases)下载最新版本，将文件解压到 `你的笔记库/.obsidian/plugins/llmsider/`，重新加载 Obsidian，然后启用插件。

### 快速配置

基本配置步骤：

**步骤 1：配置连接**  
打开设置 → LLMSider，选择 AI 提供商（OpenAI、Claude、GitHub Copilot 等），输入 API 密钥。系统提供合理的默认配置。

**步骤 2：添加模型**  
在连接下点击"添加模型"，选择合适的模型（如 GPT-4、Claude 等）并配置参数，或直接使用默认设置。

**步骤 3：开始使用**  
点击侧边栏的 LLMSider 图标，或通过命令面板打开"LLMSider: 打开聊天"即可开始使用。

---

## 📖 功能文档

**📑 [文档索引](docs/INDEX.md)** - 中英文完整文档概览

探索每个功能的详细指南：

### 核心功能
- [� **快速开始**](docs/zh-CN/QUICKSTART.md) - 5 分钟快速入门
- [�🔗 **连接与模型**](docs/zh-CN/connections-and-models.md) - 配置 AI 提供商
- [💬 **聊天界面**](docs/zh-CN/chat-interface.md) - 掌握对话模式
- [🎯 **对话模式**](docs/zh-CN/conversation-modes.md) - 普通、引导和智能体模式

### AI 辅助
- [⚡ **自动补全**](docs/zh-CN/autocomplete.md) - 内联代码/文本补全
- [💬 **快速聊天**](docs/zh-CN/quick-chat.md) - 即时内联 AI 帮助
- [✨ **选择弹窗**](docs/zh-CN/selection-popup.md) - 右键 AI 操作（待翻译）

### 高级功能
- [🔌 **MCP 集成**](docs/zh-CN/mcp-integration.md) - 使用外部工具扩展（待翻译）
- [🗄️ **向量数据库**](docs/zh-CN/vector-database.md) - 语义搜索设置（待翻译）
- [🛠️ **内置工具**](docs/zh-CN/built-in-tools.md) - 100+ 强大工具（待翻译）

### 配置
- [⚙️ **设置指南**](docs/zh-CN/settings-guide.md) - 完整设置参考

### English Documentation / 英文文档
- [📖 **Complete English Docs**](README.md) - 完整英文文档
- [� **All English Guides**](docs/INDEX.md) - 所有英文指南

---

## 🎯 使用场景

LLMSider 为所有在 Obsidian 中思考、写作、研究或整理信息的人而设计。以下是一些可能的应用方式：

**写作与研究**  
使用智能自动补全起草和完善文字，它会学习你的写作风格。获得帮助来扩展想法、提高清晰度或重新组织内容。直接在笔记中引入网络研究和格式化引用。

**笔记整理**  
使用语义搜索查找相关笔记，即使你不记得确切的关键词。让 AI 帮助分类和标记内容，或为长文档和会议笔记生成摘要。

**数据与分析**  
通过对话直接访问金融市场数据、网络搜索和其他内置工具。分析信息并从你的笔记和外部来源生成报告。

**工作流自动化**  
通过 MCP 连接外部工具来创建自定义工作流。处理多个文件、维护文档，或借助理解你特定上下文的 AI 帮助设置重复任务。

---

## 🤝 加入 LLMSider 社区

每一份贡献都让 LLMSider 变得更强大，无论你是报告 bug、提出功能建议、编写代码，还是帮助他人。以下是你如何成为构建 AI 驱动知识工作未来的一员：

### 🐛 问题反馈

如发现 Bug，欢迎[提交 issue](https://github.com/llmsider/obsidian-llmsider/issues)，建议包含以下信息：

**基本信息**：
- 详细的重现步骤
- 环境信息（Obsidian 版本、操作系统、插件版本）
- 预期行为与实际行为的对比
- 相关截图

**日志收集**：
1. 在插件设置中开启 **Debug 日志** 选项（Settings → LLMSider → Debug Mode）
2. 重现问题
3. 获取 Obsidian 控制台日志：
   - **Windows/Linux**：按 `Ctrl + Shift + I`
   - **macOS**：按 `Cmd + Option + I`
   - 切换到 **Console** 标签页
   - 右键点击日志区域，选择 **Save as...** 保存日志文件
4. 将日志文件和截图一起提交到 GitHub Issue

完整的日志信息有助于快速定位和解决问题。

### 💡 功能建议

欢迎[提交功能请求](https://github.com/llmsider/obsidian-llmsider/issues/new?template=feature_request.md)，建议说明使用场景、预期解决方案及其对工作流程的价值。

### 🔧 代码贡献

欢迎开发者 Fork 仓库并提交 Pull Request。贡献范围包括但不限于错误修复、性能优化、新功能开发等。请确保代码通过测试、遵循编码规范，并提供清晰的提交说明。

### 📚 文档改进

文档贡献包括错误修正、示例补充、教程编写、多语言翻译、视频指南制作等。

### 💬 社区交流

可在 [GitHub Discussions](https://github.com/llmsider/obsidian-llmsider/discussions) 参与讨论，[Discord 社区](https://discord.gg/llmsider)即将开放。关注 [Twitter/X](https://twitter.com/llmsider) 获取更新信息。

---

## 🌟 支持与资源

### 📖 文档资源

[完整文档](docs/)覆盖所有功能说明。可从[文档索引](docs/INDEX.md)查找所需内容，包括基础配置、高级功能和故障排除等。

### ❤️ 支持项目

LLMSider 的开发和维护需要持续投入。如希望支持项目发展，可通过 [GitHub Sponsors](https://github.com/sponsors/llmsider) 或 [Buy Me a Coffee](https://buymeacoffee.com/obsidian.llmsider) 提供赞助。

赞助将用于新功能开发、性能优化、文档翻译和社区支持。赞助者可提前体验测试版功能。

---

## 📜 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🙏 致谢

用 ❤️ 构建，使用：
- [Obsidian](https://obsidian.md) - 知识库平台
- [Vercel AI SDK](https://sdk.vercel.ai) - AI 流式传输和工具调用
- [Model Context Protocol](https://modelcontextprotocol.io) - 可扩展工具集成
- [Orama](https://oramasearch.com) - 向量数据库和搜索
- [CodeMirror 6](https://codemirror.net) - 代码编辑器框架

特别感谢：
- Obsidian 团队创建了一个令人惊叹的平台
- 所有提供反馈的贡献者和用户
- 使这一切成为可能的开源项目

---

<div align="center">

**由 LLMSider 团队用 🤖 和 ☕ 制作**

[⭐ 在 GitHub 上给我们加星](https://github.com/llmsider/obsidian-llmsider) | [🐦 在 Twitter 上关注](https://twitter.com/llmsider) | [📖 阅读文档](docs/)

</div>
