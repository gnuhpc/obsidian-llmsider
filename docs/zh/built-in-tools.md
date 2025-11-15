# 🛠️ 内置工具参考

## 概述

LLMSider 包含 **600+ 个内置工具**,涵盖 20 多个类别,为 AI 提供强大的功能来与您的笔记库交互、搜索网络、访问金融数据等。

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
| **股票** | 150+ | 股票市场数据 | ❌ 已禁用 |
| **期货** | 80+ | 期货与商品 | ❌ 已禁用 |
| **期权** | 60+ | 期权分析 | ❌ 已禁用 |
| **债券** | 50+ | 债券市场数据 | ❌ 已禁用 |
| **基金** | 70+ | 共同基金、ETF | ❌ 已禁用 |
| **外汇** | 30+ | 货币兑换 | ❌ 已禁用 |
| **加密货币** | 15+ | 加密货币 | ❌ 已禁用 |
| **金融** | 40+ | 财务报表 | ❌ 已禁用 |
| **宏观** | 20+ | 经济指标 | ❌ 已禁用 |
| **风险** | 15+ | 风险管理 | ❌ 已禁用 |
| **ESG** | 18+ | ESG 与可持续性 | ❌ 已禁用 |
| **行业** | 25+ | 行业数据 | ❌ 已禁用 |

**总计: 20+ 个类别中的 624 个工具**

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

**默认禁用(15+ 个类别):**
- ❌ 所有金融/市场数据类别
- ❌ 专业数据类别

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

## 💰 数据工具

### 金融市场数据

**股票市场(150+ 个工具)**

**实时行情:**
```typescript
// 获取当前报价
get_market_quote(symbol: string)
// 返回: 价格、成交量、涨跌等

// A股实时数据
get_stock_a_share_spot(symbol?: string)
// 实时市场数据

// 分钟级数据
get_stock_minute_data(symbol: string, period: string)
// 盘中价格走势
```

**市场分析:**
```typescript
// 热门股票排名
get_stock_hot_rank()
get_hot_up_rank()

// 行业/板块
get_industry_board()
get_concept_board()
get_board_stocks(board: string)

// 市场概览
get_market_overview()
get_market_money_flow()
```

**交易活动:**
```typescript
// 涨停/跌停池
get_limit_board()
get_limit_up_pool()
get_limit_down_pool()

// 龙虎榜
get_dragon_tiger_list(date: string)
get_dragon_tiger_list_detail(symbol: string, date: string)

// 大宗交易
get_block_trade(date: string)
get_block_trade_details(symbol: string)
```

---

### 加密货币与数字资产(15+ 个工具)

**加密货币:**
```typescript
// 现货价格
get_crypto_spot(symbol: string)
get_crypto_bitcoin_price_trend()

// 市场数据
get_crypto_market_cap_ranking()
get_crypto_exchange_ranking()

// DeFi 和 NFT
get_crypto_defi_tvl()
get_crypto_nft_market_data()

// 比特币衍生品
get_crypto_bitcoin_cme()
get_crypto_bitcoin_hold_report()
```

---

### 宏观经济学(20+ 个工具)

**经济指标:**
```typescript
// 中国指标
get_cpi()         // 消费者价格指数
get_ppi()         // 生产者价格指数
get_gdp()         // 国内生产总值
get_pmi()         // 采购经理人指数
get_money_supply()
get_unemployment_rate()

// 美国指标
get_us_cpi()
get_us_ppi()
get_us_pmi()
get_us_non_farm_payroll()
get_us_retail_sales()
```

---

### 替代数据(100+ 个工具)

**ESG 数据(18 个工具):**
```typescript
// ESG 评级和指标
get_esg_ratings(symbol: string)
get_carbon_emissions_data(symbol: string)
get_esg_controversy_scores(symbol: string)
get_climate_risk_assessment(symbol: string)

// 可持续性
get_sustainability_reports(symbol: string)
get_water_usage_data(symbol: string)
get_renewable_energy_usage(symbol: string)

// 治理
get_board_diversity_metrics(symbol: string)
get_governance_quality_metrics(symbol: string)
```

---

## ⚙️ 配置

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

**有疑问?** [GitHub Issues](https://github.com/llmsider/obsidian-llmsider/issues) | [Discord](https://discord.gg/llmsider)

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
