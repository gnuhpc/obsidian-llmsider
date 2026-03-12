# 🔌 MCP 集成指南

## 概述

MCP(模型上下文协议)使 LLMSider 能够连接到外部工具和服务,极大地扩展了 AI 的能力,超越内置功能。将其视为 AI 工具的插件系统。

---

## 🎯 什么是 MCP?

### 模型上下文协议

MCP 是一个开放标准,用于将 AI 模型连接到外部工具、数据源和服务。它提供:

- **标准化接口**: 工具通信的通用协议
- **统一工具管理**: MCP 工具通过“统一工具管理器”与内置工具无缝集成
- **安全性**: 基于服务器和工具维度的权限访问控制
- **可扩展性**: 连接到任何 MCP 兼容工具
- **可靠性**: 健康监控和自动重连

### 工作原理

```
┌─────────────┐
│  LLMSider   │ ← 您的 Obsidian 插件
└──────┬──────┘
       │
   MCP 协议
       │
┌──────┴──────┐
│ MCP 服务器  │ ← 外部工具和服务
└─────────────┘
  - 文件系统
  - Web API
  - 数据库
  - 自定义工具
```

---

## 🚀 入门

### 前提条件

1. **Node.js**(用于大多数 MCP 服务器)
   ```bash
   node --version  # 应该是 18+
   ```

2. **MCP 兼容工具**
   - 浏览 [MCP 服务器注册表](https://github.com/modelcontextprotocol/servers)
   - 或构建您自己的

### 基本设置

#### 1. 在设置中配置 MCP

1. 打开设置 → LLMSider → MCP 设置
2. 您将看到 MCP 服务器管理界面

#### 2. 添加您的第一个 MCP 服务器

**示例: 文件系统服务器**

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/path/to/allowed/directory"
  ],
  "env": {}
}
```

**示例: GitHub 服务器**

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-github",
    "--token",
    "YOUR_GITHUB_TOKEN"
  ],
  "env": {}
}
```

#### 3. 在 mcp-config.json 中配置服务器

位置: `YourVault/.obsidian/plugins/llmsider/mcp-config.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/you/Documents"
      ],
      "autoConnect": true
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_TOKEN": "your-token-here"
      },
      "autoConnect": false
    }
  }
}
```

#### 4. 连接服务器

1. 设置 → LLMSider → MCP 设置
2. 在列表中找到您的服务器
3. 点击 ▶️ (播放)按钮连接
4. 连接后服务器状态变为绿色

---

## 🎨 服务器管理

### 服务器卡片

每个服务器显示:

```
┌─────────────────────────────────────┐
│ 🟢 filesystem                       │
│ ⚡ 自动  [🔧] [▶️]  [🗑️]           │
│                                     │
│ 📊 5 个工具可用                     │
└─────────────────────────────────────┘
```

**图标:**
- 🟢 已连接 / 🔴 已断开
- ⚡ 自动启动已启用 / ✋ 手动启动
- 🔧 工具可用
- ▶️ 连接 / ⏸️ 断开
- 🗑️ 删除服务器

### 服务器操作

| 操作 | 按钮 | 描述 |
|--------|--------|-------------|
| **连接** | ▶️ | 启动服务器连接 |
| **断开** | ⏸️ | 停止服务器 |
| **查看工具** | 🔧 | 列出可用工具 |
| **切换自动** | ⚡/✋ | 启用/禁用自动连接 |
| **删除** | 🗑️ | 删除服务器 |

---

## 🛠️ 可用的 MCP 服务器

### 官方服务器

#### 1. 文件系统服务器
**用途:** 访问本地文件和目录

```json
{
  "filesystem": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/allowed/path"
    ]
  }
}
```

**工具:**
- `read_file` - 读取文件内容
- `write_file` - 写入文件
- `list_directory` - 列出目录内容
- `create_directory` - 创建新目录
- `delete_file` - 删除文件

#### 2. GitHub 服务器
**用途:** 与 GitHub 仓库交互

```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_TOKEN": "ghp_..."
    }
  }
}
```

**工具:**
- `create_repository` - 创建新仓库
- `create_issue` - 提交问题
- `create_pull_request` - 打开 PR
- `search_repositories` - 搜索 GitHub
- `get_file_contents` - 读取仓库文件

#### 3. PostgreSQL 服务器
**用途:** 查询 PostgreSQL 数据库

```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres"],
    "env": {
      "DATABASE_URL": "postgresql://..."
    }
  }
}
```

**工具:**
- `query` - 执行 SQL 查询
- `list_tables` - 显示表
- `describe_table` - 表架构
- `get_table_data` - 获取行

---

## 🔒 安全与权限

### 权限级别

每个服务器都有可配置的权限:

```yaml
服务器级别:
  - 已启用/已禁用
  
工具级别:
  - 已启用/已禁用
  - 需要确认
```

### 设置权限

1. 设置 → LLMSider → MCP 设置
2. 点击任何已连接服务器上的 🔧
3. 切换单个工具的开/关
4. 更改立即应用

### 最佳实践

1. **最小权限原则**
   - 仅启用需要的工具
   - 禁用未使用的服务器
   - 定期审查权限

2. **敏感操作**
   - 对以下操作启用"需要确认":
     - 文件删除
     - 数据库修改
     - 外部 API 调用

3. **令牌安全**
   - 在环境变量中存储令牌
   - 使用 `.env` 文件(不提交到 git)
   - 定期轮换令牌

---

## 🔧 自定义 MCP 服务器

### 创建您自己的服务器

#### 1. 基本 TypeScript 服务器

```typescript
// server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "my-custom-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 定义工具
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "my_tool",
        description: "做一些有用的事情",
        inputSchema: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "输入参数",
            },
          },
          required: ["input"],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "my_tool") {
    const input = request.params.arguments?.input;
    return {
      content: [
        {
          type: "text",
          text: `已处理: ${input}`,
        },
      ],
    };
  }
  throw new Error("工具未找到");
});

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 📊 监控与健康

### 健康指标

每个服务器显示健康状态:

- 🟢 **健康** - 所有系统正常运行
- 🟡 **降级** - 有些问题,但功能正常
- 🔴 **不健康** - 未正常运行

### 连接状态

**实时监控:**
```
服务器: filesystem
状态: 🟢 已连接
健康: 健康
上次检查: 2 分钟前
工具: 5 个可用
```

---

## 💡 最佳实践

### 🎯 服务器组织

**按功能分组:**
```json
{
  // 数据访问
  "postgres": {...},
  "mongodb": {...},
  
  // 外部服务
  "github": {...},
  "slack": {...},
  
  // 本地工具
  "filesystem": {...},
  "custom-tools": {...}
}
```

---

## 📚 资源

### 官方文档
- [MCP 规范](https://modelcontextprotocol.io/docs/spec)
- [服务器注册表](https://github.com/modelcontextprotocol/servers)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### 社区

- [GitHub 讨论](https://github.com/modelcontextprotocol/discussions)
- [示例服务器](https://github.com/modelcontextprotocol/examples)

---

## 🐛 故障排除

### 常见问题

**错误: "服务器未响应"**
```bash
# 检查命令是否独立工作
npx -y @modelcontextprotocol/server-filesystem /path

# 查看 Obsidian 控制台
Cmd+Option+I → 控制台标签
```

**错误: "权限被拒绝"**
```json
// 检查文件权限
"args": ["/Users/you/Documents"]  // 必须可访问
```

---

## 📖 相关指南

- [内置工具](built-in-tools.md) - 原生工具参考
- [聊天界面](chat-interface.md) - 在聊天中使用工具
- [设置指南](settings-guide.md) - 配置选项

---

**有疑问?** [GitHub Issues](https://github.com/gnuhpc/obsidian-llmsider/issues)
