# 🤖 LLMSider - 你的 Obsidian AI 副驾驶

<div align="center">

[![GitHub release](https://img.shields.io/github/v/release/gnuhpc/obsidian-llmsider?style=flat-square)](https://github.com/gnuhpc/obsidian-llmsider/releases)
[![License](https://img.shields.io/github/license/gnuhpc/obsidian-llmsider?style=flat-square)](LICENSE)
[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22llmsider%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=flat-square)](https://obsidian.md/plugins?id=llmsider)

*将企业级 AI 能力带入个人知识管理。LLMSider 为 Obsidian 提供完整的 AI 工作流支持——从智能写作辅助到复杂任务自动化,在保护数据隐私的前提下,让 AI 成为你思考和创作的得力助手。*

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## 🌟 为什么选择 LLMSider

LLMSider 是一个专为知识工作者设计的 AI 助手插件,将大语言模型的能力深度整合到 Obsidian 的日常使用中。无论你是研究人员、内容创作者、项目经理还是数据分析师,LLMSider 都能在你的工作流程中提供智能化支持。

**核心优势**:
- **多模型灵活切换**:支持 10+ 主流 AI 提供商,可根据任务特点选择最合适的模型
- **深度工作流集成**:从写作辅助到文件操作,AI 能力无缝融入编辑器的每个环节
- **隐私优先设计**:数据仅在你主动使用时发送,支持本地模型完全离线工作
- **专业工具生态**:100+ 内置工具覆盖研究、分析、自动化等多个领域

---

## ✨ LLMSider 的独特之处

### 🎯 多模型支持

LLMSider 支持连接**超过 10 个 AI 提供商**，包括 OpenAI GPT-4、Anthropic Claude、GitHub Copilot、Google Gemini、Azure OpenAI、通义千问，以及通过 Ollama 使用的本地模型。

支持即时切换模型或同时使用多个 AI 服务，兼顾云端算力和本地隐私的不同需求。值得注意的是，你可以**免费调用多家提供商的模型**：GitHub Copilot（订阅用户）、Google Gemini（免费额度）、DeepSeek（免费额度）、通义千问（免费额度）以及 Ollama 本地模型（完全免费），让你在零成本或低成本下体验不同模型的能力。

![多模型支持演示](docs/assets/screenrecords/models-connetions.gif)

### 💬 灵活的对话模式

LLMSider 提供**三种对话模式**以适应不同工作场景：

**普通模式**适用于快速问答和头脑风暴，提供直接的 AI 对话交互。**引导模式**将复杂任务分解为可管理的步骤，在执行前展示每个操作的具体内容，适合需要审核的多步骤工作流程。**智能体模式**允许 AI 自主使用工具、搜索网络、分析数据并完成复杂任务。

![普通模式演示](docs/assets/screenrecords/normal-mode.gif)

对话支持上下文感知，可引用文件、选中文本或包含整个文件夹内容。提供可视化的差异渲染功能，在应用修改前展示具体变更。

### ⚡ 智能写作辅助

**快速聊天（Quick Chat）**：按 **Cmd+/** 可在编辑器中调出内联 AI 助手，类似 Notion AI 的即时交互体验。无需离开当前编辑位置即可获得帮助，支持续写、改写、总结等多种操作，并提供可视化的差异预览，让你精确控制每一处修改。

![Quick Chat 演示](docs/assets/screenrecords/quickchat.gif)

**选择操作**：右键选中的文本可使用 AI 快速操作：改进表达、修正语法、翻译语言、扩展内容、总结要点或继续写作。右键选中文本还可以选择"添加到 LLMSider 上下文"，将文本片段添加到对话上下文中。

**上下文管理**：点击对话输入框的 📎 按钮可添加上下文，支持**多种添加方式**：
- **拖放操作**：直接拖放笔记文件、文件夹、图片或文本到聊天框
- **选择文件**：通过文件选择器浏览并添加笔记库中的内容
- **粘贴内容**：粘贴文本、链接或 Obsidian 内部链接（`[[笔记名]]`）
- **命令面板**：通过“引入当前笔记”或“引入选中文本”命令快速添加
- **智能搜索**：通过搜索功能查找并添加相关笔记
- **右键菜单**：选中文本后右键选择“添加到 LLMSider 上下文”

**支持的内容类型**：
- **Markdown 笔记** - 完整提取文本，可选择嵌入图片自动提取（支持多模态模型）
- **PDF 文档** - 自动提取文本内容，支持多页文档
- **图片文件** - JPG、PNG、GIF、WebP 等格式，自动编码发送给支持视觉的模型
- **Office 文档** - Word (.docx)、Excel (.xlsx)、PowerPoint (.pptx) 提取文本和表格
- **YouTube 视频** - 输入 URL 自动提取字幕内容
- **选中文本** - 当前笔记中的任意选中内容
- **文本片段** - 直接粘贴或拖放的纯文本

AI 对话时会参考这些上下文内容，提供更准确的回答。支持跨笔记文件、跨段落进行引用，可灵活组合不同来源的内容作为对话上下文。系统还会根据已添加的内容**自动推荐相关笔记**，帮助你发现潜在的关联内容。

**多模型对比**：可以同时配置多个 AI 模型，通过切换模型对同一问题获取不同的回答，便于对比不同大模型的响应结果和质量。

![Multi-Model Comparison Demo](docs/assets/screenrecords/vision-understanding.gif)

**结果处理**：对于大模型返回的内容，可以一键应用更改直接修改当前文件，或者生成单独的笔记文件保存 AI 的回答内容，方便后续参考和整理。

**自动补全**：提供类似 GitHub Copilot 的实时自动补全功能，支持笔记、文档和代码编写。系统会根据写作风格、笔记库结构和当前上下文提供智能建议。使用 ⌥[ 和 ⌥] 可在多个建议间切换。

**支持的文件格式**：
- **Markdown 文件** (.md) - 完整支持，包括 frontmatter。对于支持图片识别的模型，Markdown 文件中的图片将一并发送给大模型进行分析
- **纯文本文件** (.txt) - 完整支持
- **PDF 文件** (.pdf) - 支持文本提取
- **EPUB 文件** (.epub) - 支持文本提取（需要安装 [Epub Reader](https://github.com/caronc/obsidian-epub-plugin) 插件）
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

### ⚡ 快速阅读

**快速阅读**功能可以快速生成笔记的深度摘要、核心观点、知识结构图和扩展阅读建议。它利用 AI 全面分析当前笔记，并在侧边栏实时显示分析结果。

![Speed Reading Demo](docs/assets/screenrecords/speed-reading.gif)

### 🛠️ 丰富的内置工具

LLMSider 包含**超过 100 个内置工具**，覆盖多个功能领域：

**核心工具**：文件创建、编辑和组织；笔记库搜索；文本操作和元数据管理。

**研究工具**：网页内容获取、Google 和 DuckDuckGo 搜索、维基百科查询，支持信息收集和来源核实。

**金融市场工具**：提供外汇、Yahoo Finance 股票数据查询等基础金融数据功能。支持港美股全景信息查询工具，获取公司详细资料、行业分类、概念板块、投资评分、行业排名（市值、营收、利润、ROE、股息率）、公司高管信息、公司动态时间线（分红、业绩、拆股）、监管文件（SEC/港交所公告）等。

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
3. 输入仓库地址：`gnuhpc/obsidian-llmsider`
4. 启用插件

**从社区插件安装**：
打开 Obsidian 设置，导航到社区插件，搜索"LLMSider"。点击安装并启用。如果看到安全模式警告，需要先禁用它。

**手动安装**：
从 [GitHub Releases 页面](https://github.com/gnuhpc/obsidian-llmsider/releases)下载最新版本，将文件解压到 `你的笔记库/.obsidian/plugins/llmsider/`，重新加载 Obsidian，然后启用插件。

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
- [🔗 **连接与模型**](docs/zh/connections-and-models.md) - 配置 AI 提供商
- [💬 **聊天界面**](docs/zh/chat-interface.md) - 掌握对话模式
- [🎯 **对话模式**](docs/zh/conversation-modes.md) - 普通、引导和智能体模式

### AI 辅助
- [⚡ **自动补全**](docs/zh/autocomplete.md) - 内联代码/文本补全
- [💬 **快速聊天**](docs/zh/quick-chat.md) - 即时内联 AI 帮助
- [✨ **选择弹窗**](docs/zh/selection-popup.md) - 右键 AI 操作
- [📝 **内置提示词**](docs/zh/built-in-prompts.md) - 常用任务的预配置提示词
- [📎 **上下文引用**](docs/zh/context-reference.md) - 拖放文件、图片、文本作为上下文

### 高级功能
- [🔌 **MCP 集成**](docs/zh/mcp-integration.md) - 使用外部工具扩展
- [🗄️ **搜索增强**](docs/zh/search-enhancement.md) - 语义搜索设置
- [🛠️ **内置工具**](docs/zh/built-in-tools.md) - 100+ 强大工具
- [⚡ **速读**](docs/zh/speed-reading.md) - 快速笔记摘要与思维导图

### 配置
- [⚙️ **设置指南**](docs/zh/settings-guide.md) - 完整设置参考

### English Documentation / 英文文档
- [📖 **Complete English Docs**](README.md) - 完整英文文档
- [� **All English Guides**](docs/INDEX.md) - 所有英文指南

---

## 🎯 典型应用场景

LLMSider 将 AI 能力融入你的实际工作场景：

### � 深度阅读理解分析

阅读长篇 PDF 论文或 EPUB 电子书时，**拖放文件**到聊天框让 AI 快速生成摘要和要点。使用**速读功能**自动提取核心观点并生成思维导图，帮助快速把握文章结构。通过**语义搜索**在笔记库中找到相关笔记进行对比阅读，**相似文档**功能发现潜在关联内容。对复杂概念使用 **Cmd+/** 快速聊天请 AI 详细解释，**多模型对比**让不同 AI 从多个角度分析同一段文字。

### ✍️ 写作改进

写作过程中，**自动补全**根据你的写作风格实时建议后续内容。选中需要优化的段落，**选择弹窗**提供改进表达、修正语法、调整语气等快捷操作。使用 **Cmd+/** 调出快速聊天，让 AI 帮助扩展论点、添加示例或重新组织内容，所有修改通过**可视化差异预览**精确控制。

对于复杂的内容优化任务，**引导模式**帮助你探索多种改进方向：AI 会分步骤展示不同的改写方案（如学术化表达、口语化风格、精简版本），每一步都等待你的确认再执行。而**智能体模式**则提供完全自动化的写作优化：AI 自主分析文章结构、查找相关资料、优化论证逻辑、补充数据支持，最终呈现完整的改进版本。完成后**一键翻译**生成多语言版本，或让 AI **生成独立笔记**保存不同版本方便对比。

### 🔬 深入研究写作

撰写研究报告时，先用**语义搜索**定位所有相关文献笔记，**拖放多个文件**让 AI 提炼共同观点和研究缺口。通过 **MCP 工具**直接查询 Wikipedia、学术数据库或 **金融市场数据**（50+ 专业工具）补充资料。在**引导模式**下让 AI 分步骤执行文献综述、数据分析、结论撰写，每步输出可**一键应用**到当前文档。使用**向量数据库**关联历史研究笔记，AI 结合过往经验提供更深入的见解。**智能体模式**让 AI 自主搜索网络资源、整理引用格式，最后用**速读**生成执行摘要检查研究完整性。

---

## 🤝 加入 LLMSider 社区

每一份贡献都让 LLMSider 变得更强大，无论你是报告 bug、提出功能建议、编写代码，还是帮助他人。以下是你如何成为构建 AI 驱动知识工作未来的一员：

### 🐛 问题反馈

如发现 Bug，欢迎[提交 issue](https://github.com/gnuhpc/obsidian-llmsider/issues)。为了快速定位问题，建议提供：
- 详细的重现步骤
- 环境信息（Obsidian 版本、操作系统、插件版本）
- 预期行为与实际行为对比
- 相关截图或错误信息

### 💡 功能建议

欢迎[提交功能请求](https://github.com/gnuhpc/obsidian-llmsider/issues/new?template=feature_request.md)。

### 📚 文档改进

欢迎帮助改进文档、添加示例或翻译。

### 💬 社区交流

在 [GitHub Discussions](https://github.com/gnuhpc/obsidian-llmsider/discussions) 参与讨论，关注 [Twitter/X](https://twitter.com/llmsider) 获取更新。

---

## 🌟 支持与资源

### 📖 文档资源

查看[完整文档](docs/)了解所有功能，或从[文档索引](docs/INDEX.md)快速查找。

### ❤️ 支持项目

如果 LLMSider 对你有帮助，可通过 [GitHub Sponsors](https://github.com/sponsors/llmsider) 或 [Buy Me a Coffee](https://buymeacoffee.com/obsidian.llmsider) 支持项目发展。

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

**由 gnuhpc 用 🤖 和 ☕ 制作**

[⭐ 在 GitHub 上给我们加星](https://github.com/gnuhpc/obsidian-llmsider) | [🐦 在 Twitter 上关注](https://twitter.com/llmsider) | [📖 阅读文档](docs/)

</div>
