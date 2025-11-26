# 安装和使用说明

## 项目完成清单

✅ 创建了精简版插件项目结构
✅ 实现了基础聊天功能（仅 Normal Mode）
✅ 支持多个 LLM 提供商（OpenAI、Anthropic、OpenAI Compatible）
✅ 简化的设置界面
✅ 基础样式文件
✅ 完整的文档

## 项目位置

```
/Users/gnuhpc/IdeaProjects/obsidian-llmsider-lite/
```

## 主要特性

### ✅ 包含的功能
- 简洁的聊天界面
- 支持 OpenAI (GPT-4, GPT-3.5)
- 支持 Anthropic (Claude)
- 支持 OpenAI 兼容 API（Ollama 等）
- 会话历史管理
- 实时流式响应
- 简单的配置界面

### ❌ 移除的功能（相比完整版）
- Guided Mode（引导模式）
- Agent Mode（代理模式）
- Autocomplete（自动补全）
- Quick Chat（快速聊天）
- Tool Integration（工具集成）
- MCP 支持
- Vector Search（向量搜索）
- Memory System（记忆系统）
- 多语言支持
- Context Management（上下文管理）
- Diff Rendering（差异渲染）
- Similar Notes（相似笔记）

## 文件结构

```
obsidian-llmsider-lite/
├── src/
│   ├── main.ts                    # 主插件文件
│   ├── settings.ts                # 设置页面
│   ├── types.ts                   # 类型定义
│   ├── providers/                 # LLM 提供商
│   │   ├── base-provider.ts
│   │   ├── openai-provider.ts
│   │   ├── anthropic-provider.ts
│   │   └── openai-compatible-provider.ts
│   ├── ui/
│   │   └── chat-view.ts          # 聊天界面
│   └── utils/
│       └── logger.ts              # 日志工具
├── styles.css                     # 样式文件
├── package.json                   # 依赖配置
├── manifest.json                  # 插件清单
├── tsconfig.json                  # TypeScript 配置
├── esbuild.config.mjs            # 构建配置
├── README.md                      # 使用文档
├── LICENSE                        # 许可证
└── .gitignore                    # Git 忽略文件
```

## 安装步骤

### 方法 1: 本地测试安装

1. 确保你有一个 Obsidian 测试仓库
2. 复制构建产物到插件目录：
   ```bash
   mkdir -p /path/to/your/vault/.obsidian/plugins/llmsider-lite
   cp main.js manifest.json styles.css /path/to/your/vault/.obsidian/plugins/llmsider-lite/
   ```
3. 重启 Obsidian
4. 在设置中启用"LLMSider Lite"插件

### 方法 2: 开发模式

1. 在 Obsidian 设置中找到插件文件夹路径
2. 创建符号链接：
   ```bash
   ln -s /Users/gnuhpc/IdeaProjects/obsidian-llmsider-lite /path/to/vault/.obsidian/plugins/llmsider-lite
   ```
3. 运行开发模式：
   ```bash
   cd /Users/gnuhpc/IdeaProjects/obsidian-llmsider-lite
   npm run dev
   ```
4. 在 Obsidian 中启用插件

## 使用说明

### 配置 Provider

1. 打开 Obsidian 设置
2. 找到"LLMSider Lite"设置页
3. 点击"Add Provider"添加新的 AI 提供商
4. 填写必要信息：
   - **Type**: 选择提供商类型
   - **Display Name**: 显示名称
   - **API Key**: API 密钥
   - **Model**: 模型名称（如 `gpt-4`, `claude-3-5-sonnet-20241022`）
   - **Max Tokens**: 最大令牌数（默认 4096）
   - **Temperature**: 温度参数（0-2，默认 0.7）
5. 启用 Provider

### 使用聊天功能

1. 点击左侧栏的聊天图标，或使用命令面板搜索"Open Chat"
2. 在下拉菜单中选择你配置的 Provider
3. 输入消息并按 Enter 或点击"Send"
4. AI 会实时流式返回响应

### OpenAI Compatible API 配置

对于 Ollama 或其他 OpenAI 兼容的 API：
- **Type**: 选择"OpenAI Compatible"
- **Base URL**: 设置 API 端点（如 `http://localhost:11434/v1`）
- **Model**: 模型名称
- **API Key**: 如果不需要可以填任意非空字符串

## 发布到 Obsidian 社区

### 准备工作

1. 在 GitHub 上创建新仓库 `obsidian-llmsider-lite`
2. 推送代码到仓库
3. 创建 Release（标签为 v1.0.0）
4. 上传 `main.js`, `manifest.json`, `styles.css` 到 Release

### 提交到 Obsidian 社区

1. Fork [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) 仓库
2. 在 `community-plugins.json` 中添加你的插件信息
3. 提交 Pull Request

### 插件信息示例

```json
{
  "id": "llmsider-lite",
  "name": "LLMSider Lite",
  "author": "LLMSider Team",
  "description": "Lightweight AI Chat for Obsidian - Simple multi-LLM chat interface with support for OpenAI, Anthropic, and more",
  "repo": "llmsider/obsidian-llmsider-lite"
}
```

## 构建命令

```bash
# 安装依赖
npm install

# 开发模式（自动重新构建）
npm run dev

# 生产构建
npm run build
```

## 与完整版的对比

| 功能 | Lite 版 | 完整版 |
|-----|---------|--------|
| 文件大小 | ~1.2MB | ~15MB |
| 依赖数量 | 3 个核心依赖 | 20+ 依赖 |
| 聊天功能 | ✅ | ✅ |
| Normal Mode | ✅ | ✅ |
| 高级模式 | ❌ | ✅ |
| 工具集成 | ❌ | ✅ |
| 自动补全 | ❌ | ✅ |
| 向量搜索 | ❌ | ✅ |
| 学习曲线 | 低 | 中 |
| 审核难度 | 低 | 高 |

## 为什么选择 Lite 版

1. **更容易通过审核**: 功能简单，代码量少，审核流程更快
2. **更轻量**: 文件体积小，启动快，占用资源少
3. **更易用**: 配置简单，上手快，无学习成本
4. **专注核心**: 只保留聊天功能，适合大多数用户需求

## 技术栈

- **TypeScript**: 类型安全的 JavaScript 超集
- **Obsidian API**: Obsidian 插件开发接口
- **AI SDK**: Vercel 的 AI SDK，支持多个 LLM 提供商
- **esbuild**: 快速的 JavaScript 打包工具

## 支持的模型

### OpenAI
- GPT-4 Turbo
- GPT-4
- GPT-3.5 Turbo

### Anthropic
- Claude 3.5 Sonnet
- Claude 3 Opus
- Claude 3 Haiku

### OpenAI Compatible
- Ollama (所有本地模型)
- LocalAI
- 其他 OpenAI 兼容 API

## 许可证

MIT License - 详见 LICENSE 文件

## 支持

如有问题，请在 GitHub 上提 Issue：
https://github.com/llmsider/obsidian-llmsider-lite/issues
