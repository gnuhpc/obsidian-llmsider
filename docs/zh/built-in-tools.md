# 🛠️ 内置工具参考

## 概述

LLMSider 包含 **600+ 个内置工具**,涵盖多个类别,为 AI 提供强大的功能来与您的笔记库交互、搜索网络、访问金融数据等。

---

## 📚 目录

- [工具类别](#工具类别)
- [核心工具](#核心工具)
  - [文件管理](#文件管理)
  - [笔记管理](#笔记管理)
  - [搜索与发现](#搜索与发现)
  - [编辑器操作](#编辑器操作)
  - [网页内容](#网页内容)
- [数据工具](#数据工具)
  - [金融市场数据](#金融市场数据)
  - [加密货币与数字资产](#加密货币与数字资产)
  - [宏观经济学](#宏观经济学)
  - [替代数据](#替代数据)
- [配置](#配置)
- [最佳实践](#最佳实践)

---

## 🗂️ 工具类别

### 类别概览

| 类别 | 工具数 | 描述 | 默认状态 |
|----------|-------|-------------|---------|
| **实用工具** | 10+ | 日期/时间、计算 | ✅ 已启用 |
| **文件系统** | 15+ | 文件操作 | ✅ 已启用 |
| **文件管理** | 20+ | 高级文件工具 | ✅ 已启用 |
| **笔记管理** | 15+ | Obsidian 专用 | ✅ 已启用 |
| **编辑器** | 10+ | 编辑器控制 | ✅ 已启用 |
| **搜索** | 15+ | 内容发现 | ✅ 已启用 |
| **网页内容** | 10+ | 网页抓取 | ✅ 已启用 |
| **搜索引擎** | 20+ | DuckDuckGo、Google | ✅ 已启用 |
| **外汇** | 10+ | 货币兑换 | ❌ 已禁用 |
| **股票分析** | 5+ | Yahoo Finance 等 | ❌ 已禁用 |

**总计: 20+ 个类别中的 600+ 个工具**

### 默认配置

**默认启用(8 个类别):**
- ✅ 实用工具
- ✅ 文件系统
- ✅ 文件管理
- ✅ 笔记管理
- ✅ 编辑器
- ✅ 搜索
- ✅ 网页内容
- ✅ 搜索引擎

**默认禁用(2 个类别):**
- ❌ 外汇工具
- ❌ 股票分析工具（Yahoo Finance）

---

## 🔧 核心工具

### 文件管理

**基本操作:**
```typescript
// 查看文件内容
view(path: string, start_line?: number, end_line?: number)
// 返回文件内容,可选行范围

// 创建新文件
create(path: string, content: string)
// 使用指定内容创建文件

// 修改文件内容
str_replace(path: string, old_str: string, new_str: string)
// 替换文件中的文本

// 追加到文件
append(path: string, content: string)
// 将内容添加到文件末尾

// 在特定位置插入
insert(path: string, insert_line: number, new_str: string)
// 在指定行号插入内容
```

**文件系统操作:**
```typescript
// 检查文件是否存在
file_exists(path: string)
// 返回 true/false

// 列出目录内容
list_file_directory(path: string, recursive?: boolean)
// 返回文件/文件夹列表

// 移动文件
move_file(old_path: string, new_path: string)
// 重新定位文件

// 删除文件(移至回收站)
trash_file(path: string)
// 安全删除文件
```

---

### 笔记管理

**Obsidian 专用:**
```typescript
// 在笔记库中移动笔记
move_note(source: string, destination: string)
// 移动并更新链接

// 重命名笔记
rename_note(old_name: string, new_name: string)
// 重命名并更新反向链接

// 删除笔记
delete_note(note_path: string)
// 安全删除并确认

// 合并笔记
merge_notes(source_notes: string[], target_note: string)
// 合并多个笔记

// 复制笔记
copy_note(source: string, destination: string)
// 用新名称复制

// 复制笔记
duplicate_note(note_path: string)
// 在同一文件夹中创建副本
```

**智能功能:**
- ✅ 自动反向链接更新
- ✅ 保留笔记结构
- ✅ 处理附件
- ✅ 安全操作(回收站,而非删除)

---

### 搜索与发现

**内容搜索:**
```typescript
// 搜索文件名
search_files(pattern: string, folder?: string)
// 按名称模式查找文件

// 搜索文件内容
search_content(query: string, folder?: string, case_sensitive?: boolean)
// 全文搜索

// 查找包含文本的文件
find_files_containing(text: string, folder?: string)
// 在文件中搜索

// 增强的语义搜索
enhanced_search(query: string, max_results?: number)
// 上下文感知搜索
```

**搜索引擎集成:**
```typescript
// 网页搜索
web_search(query: string, num_results?: number)
// 通用网页搜索

// DuckDuckGo 搜索
duckduckgo_text_search(query: string, region?: string)
duckduckgo_image_search(query: string, size?: string)
duckduckgo_news_search(query: string, time?: string)
duckduckgo_video_search(query: string, duration?: string)

// 维基百科
wikipedia_search(query: string, lang?: string)
wikipedia_random(lang?: string)
```

---

### 编辑器操作

**光标与选择:**
```typescript
// 在光标处插入
insert_at_cursor(text: string)
// 在当前位置添加文本

// 撤销上次更改
editor_undo()
// 恢复上次编辑

// 重做更改
editor_redo()
// 恢复已撤销的编辑
```

---

### 网页内容

**内容提取:**
```typescript
// 获取网页内容
fetch_web_content(url: string, selector?: string)
// 提取主要内容或特定元素

// 获取 YouTube 字幕
fetch_youtube_transcript(video_url: string, lang?: string)
// 提取视频字幕
```

---

## 💰 金融数据工具

### Yahoo Finance 工具

**股票数据查询:**
```typescript
// 获取股票行情
get_yahoo_finance_quote(symbol: string)
// 返回:价格、成交量、涨跌幅等

// 获取股票新闻
get_yahoo_finance_news(symbol: string)
// 返回股票相关新闻
```

**港美股全景工具:**
```typescript
// 股票全景 (港美股)
get_stock_panorama(symbol: string)
// 获取公司详细资料、行业分类、概念板块等
```

**使用示例:**
```markdown
用户: "AAPL 的当前价格是多少?"
AI: [使用 get_yahoo_finance_quote("AAPL") 工具]
📊 Apple Inc. (AAPL)
价格: $185.23 (+2.34%)
成交量: 45.2M
市值: $2.91T
```

---

### 外汇工具

**货币兑换:**
```typescript
// 实时汇率
get_forex_rate(from: string, to: string)
// 返回当前汇率

// 历史汇率
get_forex_history(pair: string, start_date: string, end_date: string)
// 返回历史汇率数据
```

---

## ⚙️ 配置## ⚙️ 配置

### 启用/禁用工具

**设置位置:**
```
设置 → LLMSider → 内置工具
```

**类别控制:**
```yaml
✅ 实用工具
✅ 文件管理
✅ 笔记管理
✅ 搜索引擎
✅ 网页内容
❌ 股票市场数据
❌ 期货与商品
❌ 期权分析
```

**单个工具控制:**
```yaml
类别: 股票市场(150 个工具)
├─ ✅ get_market_quote
├─ ✅ get_stock_hot_rank
├─ ❌ get_dragon_tiger_list
├─ ❌ get_block_trade
└─ ... (还有 146 个工具)
```

---

## 💡 最佳实践

### 🎯 工具选择

**让 AI 选择:**
```markdown
✅ "查找关于机器学习的笔记"
❌ "使用 search_content() 查找关于机器学习的笔记"
```

**要具体:**
```markdown
✅ "苹果公司的当前股价是多少?"
✅ "显示今天的涨停股票"
❌ "获取市场数据"
❌ "搜索股票"
```

### 🚀 性能

**只启用您需要的:**
```yaml
笔记用户:
  ✅ 核心工具(文件、笔记、搜索)
  ❌ 金融工具
  ❌ 市场数据

金融分析师:
  ✅ 核心工具
  ✅ 股票工具
  ✅ 金融工具
  ❌ 加密货币工具(如果不使用)
```

---

## 📖 相关指南

- [聊天界面](chat-interface.md) - 在聊天中使用工具
- [对话模式](conversation-modes.md) - 工具的代理模式
- [MCP 集成](mcp-integration.md) - 外部工具集成
- [设置指南](settings-guide.md) - 工具配置

---

**有疑问?** [GitHub Issues](https://github.com/gnuhpc/obsidian-llmsider/issues)

---

## 📝 附录

### 按类别划分的工具数量

| 类别 | 数量 | 默认启用 |
|----------|-------|-------------------|
| 股票 | 150 | ❌ |
| 期货 | 80 | ❌ |
| 基金 | 70 | ❌ |
| 期权 | 60 | ❌ |
| 债券 | 50 | ❌ |
| 金融 | 40 | ❌ |
| 外汇 | 30 | ❌ |
| 行业 | 25 | ❌ |
| 搜索引擎 | 20 | ✅ |
| 文件管理 | 20 | ✅ |
| 宏观 | 20 | ❌ |
| ESG | 18 | ❌ |
| 风险 | 15 | ❌ |
| 加密货币 | 15 | ❌ |
| 笔记管理 | 15 | ✅ |
| 文件系统 | 15 | ✅ |
| 搜索 | 15 | ✅ |
| 实用工具 | 10 | ✅ |
| 网页内容 | 10 | ✅ |
| 编辑器 | 10 | ✅ |
| 其他 | 20 | ❌ |
| **总计** | **624** | **150 已启用** |
