# 🔌 MCP Integration Guide

## Overview

MCP (Model Context Protocol) enables LLMSider to connect with external tools and services, dramatically extending AI capabilities beyond built-in features. Think of it as a plugin system for AI tools.

---

## 🎯 What is MCP?

### Model Context Protocol

MCP is an open standard for connecting AI models to external tools, data sources, and services. It provides:

- **Standardized Interface**: Common protocol for tool communication
- **Security**: Permission-based access control
- **Extensibility**: Connect to any MCP-compatible tool
- **Reliability**: Health monitoring and automatic reconnection

### How It Works

```
┌─────────────┐
│  LLMSider   │ ← Your Obsidian plugin
└──────┬──────┘
       │
   MCP Protocol
       │
┌──────┴──────┐
│ MCP Servers │ ← External tools & services
└─────────────┘
  - Filesystem
  - Web APIs
  - Databases
  - Custom tools
```

### Benefits

| Feature | Traditional | With MCP |
|---------|------------|----------|
| **Tool Integration** | Hard-coded | Dynamic |
| **Updates** | Plugin update needed | Server update only |
| **Custom Tools** | Not possible | Build your own |
| **Data Access** | Limited | Full access |
| **Security** | Plugin-level | Tool-level |

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (for most MCP servers)
   ```bash
   node --version  # Should be 18+
   ```

2. **MCP-compatible tools**
   - Browse [MCP Server Registry](https://github.com/modelcontextprotocol/servers)
   - Or build your own

### Basic Setup

#### 1. Configure MCP in Settings

1. Open Settings → LLMSider → MCP Settings
2. You'll see the MCP server management interface

#### 2. Add Your First MCP Server

**Example: Filesystem Server**

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

**Example: GitHub Server**

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

#### 3. Configure Server in mcp-config.json

Location: `YourVault/.obsidian/plugins/llmsider/mcp-config.json`

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

#### 4. Connect Server

1. Settings → LLMSider → MCP Settings
2. Find your server in the list
3. Click the ▶️ (Play) button to connect
4. Server status turns green when connected

---

## 🎨 Server Management

### Server Cards

Each server displays:

```
┌─────────────────────────────────────┐
│ 🟢 filesystem                       │
│ ⚡ Auto  [🔧] [▶️]  [🗑️]           │
│                                     │
│ 📊 5 tools available                │
└─────────────────────────────────────┘
```

**Icons:**
- 🟢 Connected / 🔴 Disconnected
- ⚡ Auto-start enabled / ✋ Manual start
- 🔧 Tools available
- ▶️ Connect / ⏸️ Disconnect
- 🗑️ Delete server

### Server Actions

| Action | Button | Description |
|--------|--------|-------------|
| **Connect** | ▶️ | Start server connection |
| **Disconnect** | ⏸️ | Stop server |
| **View Tools** | 🔧 | List available tools |
| **Toggle Auto** | ⚡/✋ | Enable/disable auto-connect |
| **Delete** | 🗑️ | Remove server |

### Auto-Connect

**Enable:** Server connects automatically on startup
**Disable:** Manual connection required

Toggle by clicking ⚡ icon.

---

## 🛠️ Available MCP Servers

### Official Servers

#### 1. Filesystem Server
**Purpose:** Access local files and directories

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

**Tools:**
- `read_file` - Read file contents
- `write_file` - Write to file
- `list_directory` - List directory contents
- `create_directory` - Create new directory
- `delete_file` - Remove file

#### 2. GitHub Server
**Purpose:** Interact with GitHub repositories

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

**Tools:**
- `create_repository` - Create new repo
- `create_issue` - File an issue
- `create_pull_request` - Open PR
- `search_repositories` - Search GitHub
- `get_file_contents` - Read repo files

#### 3. PostgreSQL Server
**Purpose:** Query PostgreSQL databases

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

**Tools:**
- `query` - Execute SQL query
- `list_tables` - Show tables
- `describe_table` - Table schema
- `get_table_data` - Fetch rows

#### 4. Brave Search Server
**Purpose:** Web search via Brave

```json
{
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": {
      "BRAVE_API_KEY": "..."
    }
  }
}
```

**Tools:**
- `brave_web_search` - Search the web
- `brave_local_search` - Local search

#### 5. Slack Server
**Purpose:** Slack integration

```json
{
  "slack": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-slack"],
    "env": {
      "SLACK_BOT_TOKEN": "xoxb-...",
      "SLACK_TEAM_ID": "..."
    }
  }
}
```

**Tools:**
- `post_message` - Send message
- `list_channels` - Get channels
- `get_channel_history` - Read messages

### Community Servers

Browse [MCP Server Registry](https://github.com/modelcontextprotocol/servers) for more:

- **Google Drive** - Access Drive files
- **Notion** - Read/write Notion pages
- **Jira** - Manage Jira issues
- **Linear** - Linear integration
- **And many more...**

---

## 🔒 Security & Permissions

### Permission Levels

Each server has configurable permissions:

```yaml
Server Level:
  - Enabled/Disabled
  
Tool Level:
  - Enabled/Disabled
  - Require Confirmation
```

### Setting Permissions

1. Settings → LLMSider → MCP Settings
2. Click 🔧 on any connected server
3. Toggle individual tools on/off
4. Changes apply immediately

### Best Practices

1. **Principle of Least Privilege**
   - Only enable needed tools
   - Disable unused servers
   - Review permissions regularly

2. **Sensitive Operations**
   - Enable "Require Confirmation" for:
     - File deletion
     - Database modifications
     - External API calls

3. **Token Security**
   - Store tokens in environment variables
   - Use `.env` files (not committed to git)
   - Rotate tokens regularly

---

## 🔧 Custom MCP Servers

### Creating Your Own Server

#### 1. Basic TypeScript Server

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

// Define a tool
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "my_tool",
        description: "Does something useful",
        inputSchema: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "Input parameter",
            },
          },
          required: ["input"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "my_tool") {
    const input = request.params.arguments?.input;
    return {
      content: [
        {
          type: "text",
          text: `Processed: ${input}`,
        },
      ],
    };
  }
  throw new Error("Tool not found");
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

#### 2. Configure in LLMSider

```json
{
  "my-server": {
    "command": "node",
    "args": ["/path/to/server.js"],
    "autoConnect": true
  }
}
```

#### 3. Test Connection

1. Save configuration
2. Reload LLMSider
3. Connect server
4. Test tool in chat

### Example Servers

**Weather Server:**
```typescript
// Fetch weather data from API
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "get_weather") {
    const city = request.params.arguments?.city;
    const weather = await fetchWeather(city);
    return {
      content: [{ type: "text", text: weather }],
    };
  }
});
```

**Database Query Server:**
```typescript
// Execute safe read-only queries
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "query_db") {
    const sql = request.params.arguments?.sql;
    // Validate and execute query
    const results = await db.query(sql);
    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
    };
  }
});
```

---

## 📊 Monitoring & Health

### Health Indicators

Each server shows health status:

- 🟢 **Healthy** - All systems operational
- 🟡 **Degraded** - Some issues, but functional
- 🔴 **Unhealthy** - Not functioning properly

### Connection Status

**Real-time monitoring:**
```
Server: filesystem
Status: 🟢 Connected
Health: Healthy
Last Check: 2 minutes ago
Tools: 5 available
```

### Troubleshooting

**Server won't connect:**
1. ✅ Check command path
2. ✅ Verify Node.js version
3. ✅ Review server logs
4. ✅ Check permissions
5. ✅ Test command manually

**Tools not appearing:**
1. ✅ Ensure server is connected
2. ✅ Check tool permissions
3. ✅ Reload LLMSider
4. ✅ Review MCP logs

**Slow performance:**
1. ✅ Check server resources
2. ✅ Review network latency
3. ✅ Optimize tool calls
4. ✅ Consider caching

---

## 💡 Best Practices

### 🎯 Server Organization

**Group by Function:**
```json
{
  // Data access
  "postgres": {...},
  "mongodb": {...},
  
  // External services
  "github": {...},
  "slack": {...},
  
  // Local tools
  "filesystem": {...},
  "custom-tools": {...}
}
```

### 🚀 Performance

1. **Minimize Tool Calls**
   - Batch operations when possible
   - Cache frequent queries
   - Use efficient queries

2. **Optimize Server Startup**
   - Disable auto-connect for rarely-used servers
   - Use lightweight servers
   - Lazy-load heavy dependencies

3. **Resource Management**
   - Monitor memory usage
   - Clean up connections
   - Handle errors gracefully

### 🔒 Security

1. **Token Management**
   ```bash
   # Use environment variables
   export GITHUB_TOKEN="ghp_..."
   export API_KEY="..."
   ```

2. **Access Control**
   - Limit file system access
   - Whitelist allowed operations
   - Validate all inputs

3. **Audit Logging**
   - Log all tool calls
   - Monitor unusual activity
   - Review permissions regularly

---

## 📚 Resources

### Official Documentation
- [MCP Specification](https://modelcontextprotocol.io/docs/spec)
- [Server Registry](https://github.com/modelcontextprotocol/servers)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### Tutorials
- [Building Your First MCP Server](https://modelcontextprotocol.io/tutorials/first-server)
- [Advanced Tool Development](https://modelcontextprotocol.io/tutorials/advanced)
- [Best Practices Guide](https://modelcontextprotocol.io/best-practices)

### Community
- [MCP Discord](https://discord.gg/mcp)
- [GitHub Discussions](https://github.com/modelcontextprotocol/discussions)
- [Example Servers](https://github.com/modelcontextprotocol/examples)

---

## 🐛 Troubleshooting

### Common Issues

**Error: "Server not responding"**
```bash
# Check if command works standalone
npx -y @modelcontextprotocol/server-filesystem /path

# Review Obsidian console
Cmd+Option+I → Console tab
```

**Error: "Permission denied"**
```json
// Check file permissions
"args": ["/Users/you/Documents"]  // Must be accessible

// Or run with sudo (not recommended)
"command": "sudo",
"args": ["npx", "-y", "..."]
```

**Error: "Module not found"**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall globally
npm install -g @modelcontextprotocol/server-NAME
```

### Debug Mode

Enable MCP debug logging:

1. Settings → LLMSider → Advanced
2. Enable "Debug Mode"
3. Check console for MCP logs

---

## 📖 Related Guides

- [Built-in Tools](built-in-tools.md) - Native tool reference
- [Chat Interface](chat-interface.md) - Using tools in chat
- [Settings Guide](settings-guide.md) - Configuration options
- [Troubleshooting](troubleshooting.md) - General issues

---

**Questions?** [GitHub Issues](https://github.com/llmsider/obsidian-llmsider/issues) | [MCP Discord](https://discord.gg/mcp)
