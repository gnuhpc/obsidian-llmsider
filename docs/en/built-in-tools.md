# 🛠️ Built-in Tools Reference

## Overview

LLMSider includes **100+ built-in tools** across multiple categories, providing AI with powerful capabilities to interact with your vault, search the web, access financial data, and more.

---

## 📚 Table of Contents

- [Tool Categories](#tool-categories)
- [Core Tools](#core-tools)
  - [File Management](#file-management)
  - [Note Management](#note-management)
  - [Search & Discovery](#search--discovery)
  - [Editor Operations](#editor-operations)
  - [Web Content](#web-content)
- [Data Tools](#data-tools)
  - [Financial Market Data](#financial-market-data)
  - [Crypto & Digital Assets](#crypto--digital-assets)
  - [Macro Economics](#macro-economics)
  - [Alternative Data](#alternative-data)
- [Configuration](#configuration)
- [Best Practices](#best-practices)

---

## 🗂️ Tool Categories

### Category Overview

| Category | Tools | Description | Default |
|----------|-------|-------------|---------|
| **Utility** | 10+ | Date/time, calculations | ✅ Enabled |
| **File System** | 15+ | File operations | ✅ Enabled |
| **File Management** | 20+ | Advanced file tools | ✅ Enabled |
| **Note Management** | 15+ | Obsidian-specific | ✅ Enabled |
| **Editor** | 10+ | Editor controls | ✅ Enabled |
| **Search** | 15+ | Content discovery | ✅ Enabled |
| **Web Content** | 10+ | Web scraping | ✅ Enabled |
| **Search Engines** | 20+ | DuckDuckGo, Google | ✅ Enabled |
| **Forex** | 10+ | Currency exchange | ❌ Disabled |
| **Stock Analysis** | 5+ | Yahoo Finance, etc. | ❌ Disabled |

**Total: 100+ tools across 10+ categories**

### Default Configuration

**Enabled by Default (8 categories):**
- ✅ Utility
- ✅ File System
- ✅ File Management  
- ✅ Note Management
- ✅ Editor
- ✅ Search
- ✅ Web Content
- ✅ Search Engines

**Disabled by Default (2 categories):**
- ❌ Forex tools
- ❌ Stock analysis tools (Yahoo Finance)

---

## 🔧 Core Tools

### File Management

**Basic Operations:**
```typescript
// View file content
view(path: string, start_line?: number, end_line?: number)
// Returns file content with optional line range

// Create new file
create(path: string, content: string)
// Creates file with specified content

// Modify file content
str_replace(path: string, old_str: string, new_str: string)
// Replace text in file

// Append to file
append(path: string, content: string)
// Add content to end of file

// Insert at specific position
insert(path: string, insert_line: number, new_str: string)
// Insert content at line number
```

**File System Operations:**
```typescript
// Check file existence
file_exists(path: string)
// Returns true/false

// List directory contents
list_file_directory(path: string, recursive?: boolean)
// Returns file/folder list

// Move file
move_file(old_path: string, new_path: string)
// Relocate file

// Delete file (to trash)
trash_file(path: string)
// Safely remove file
```

**Example Usage:**
```markdown
User: "Create a new note about meeting notes"
AI: [uses create() tool]
✅ Created: "Meetings/2024-01-15.md"

User: "Show me the first 10 lines of today's note"
AI: [uses view() with start_line=1, end_line=10]
📄 Displays content...
```

---

### Note Management

**Obsidian-Specific:**
```typescript
// Move note within vault
move_note(source: string, destination: string)
// Move with link updates

// Rename note
rename_note(old_name: string, new_name: string)
// Rename with backlink updates

// Delete note
delete_note(note_path: string)
// Safe deletion with confirmation

// Merge notes
merge_notes(source_notes: string[], target_note: string)
// Combine multiple notes

// Copy note
copy_note(source: string, destination: string)
// Duplicate with new name

// Duplicate note
duplicate_note(note_path: string)
// Create copy in same folder
```

**Smart Features:**
- ✅ Automatic backlink updates
- ✅ Preserves note structure
- ✅ Handles attachments
- ✅ Safe operations (trash, not delete)

**Example Usage:**
```markdown
User: "Merge all my meeting notes from last week"
AI: 
1. [uses search_files() to find meetings]
2. [uses merge_notes() to combine]
✅ Merged 5 notes into "Meetings/Week-2024-01.md"

User: "Rename project notes to use yyyy-mm-dd format"
AI:
1. [uses list_file_directory() in Projects/]
2. [uses rename_note() for each file]
✅ Renamed 12 notes with standard date format
```

---

### Search & Discovery

**Content Search:**
```typescript
// Search file names
search_files(pattern: string, folder?: string)
// Find files by name pattern

// Search file content
search_content(query: string, folder?: string, case_sensitive?: boolean)
// Full-text search

// Find files containing text
find_files_containing(text: string, folder?: string)
// Search within files

// Enhanced semantic search
enhanced_search(query: string, max_results?: number)
// Context-aware search
```

**Search Engine Integration:**
```typescript
// Web search
web_search(query: string, num_results?: number)
// Generic web search

// DuckDuckGo searches
duckduckgo_text_search(query: string, region?: string)
duckduckgo_image_search(query: string, size?: string)
duckduckgo_news_search(query: string, time?: string)
duckduckgo_video_search(query: string, duration?: string)

// Wikipedia
wikipedia_search(query: string, lang?: string)
wikipedia_random(lang?: string)
```

**Example Usage:**
```markdown
User: "Find all notes about machine learning"
AI: [uses search_content("machine learning")]
📋 Found 23 notes:
- AI/ML-Basics.md
- Projects/ML-Project-2024.md
- ...

User: "Search the web for latest AI news"
AI: [uses duckduckgo_news_search("artificial intelligence")]
📰 Top results:
1. OpenAI releases GPT-5...
2. Google announces Gemini 2.0...
```

---

### Editor Operations

**Cursor & Selection:**
```typescript
// Insert at cursor
insert_at_cursor(text: string)
// Add text at current position

// Undo last change
editor_undo()
// Revert last edit

// Redo change
editor_redo()
// Restore undone edit
```

**Use Cases:**
```markdown
User: "Add a TODO item here"
AI: [uses insert_at_cursor("- [ ] ")]
✅ Added checkbox at cursor

User: "Oops, undo that"
AI: [uses editor_undo()]
↶ Reverted last change
```

---

### Web Content

**Content Extraction:**
```typescript
// Fetch webpage content
fetch_web_content(url: string, selector?: string)
// Extract main content or specific elements

// Get YouTube transcript
fetch_youtube_transcript(video_url: string, lang?: string)
// Extract video captions
```

**Example Usage:**
```markdown
User: "Summarize this article: https://example.com/article"
AI:
1. [uses fetch_web_content()]
2. [analyzes content]
📝 Summary: The article discusses...

User: "Get the transcript from this YouTube video"
AI: [uses fetch_youtube_transcript()]
📺 Transcript:
[00:00] Introduction...
[01:23] Main points...
```

---

## 💰 Financial Data Tools

### Yahoo Finance Tools

**Stock Data Queries:**
```typescript
// Get stock quote
get_yahoo_finance_quote(symbol: string)
// Returns: price, volume, change, etc.

// Get stock news
get_yahoo_finance_news(symbol: string)
// Returns stock-related news
```

**Stock Panorama Tools (HK & US stocks):**
```typescript
// Stock Panorama
get_stock_panorama(symbol: string)
// Get company profiles, industry classification, concept sectors, etc.
```

**Example Usage:**
```markdown
User: "What's the current price of AAPL?"
AI: [uses get_yahoo_finance_quote("AAPL")]
📊 Apple Inc. (AAPL)
Price: $185.23 (+2.34%)
Volume: 45.2M
Market Cap: $2.91T
```

---

### Forex Tools

**Currency Exchange:**
```typescript
// Real-time exchange rate
get_forex_rate(from: string, to: string)
// Returns current exchange rate

// Historical exchange rates
get_forex_history(pair: string, start_date: string, end_date: string)
// Returns historical rate data
```

### Crypto & Digital Assets

Tools for tracking the cryptocurrency market.

**Key Capabilities:**
- **Market Overview:** Global crypto market cap and volume.
- **Price Tracking:** Real-time prices for 1000+ coins.
- **Exchange Data:** Volume and liquidity across major exchanges.

---

## ⚙️ Configuration## ⚙️ Configuration

### Enable/Disable Tools

**Settings Location:**
```
Settings → LLMSider → Built-in Tools
```

**Category Control:**
```yaml
✅ Utility Tools
✅ File Management
✅ Note Management
✅ Search Engines
✅ Web Content
❌ Stock Market Data
❌ Futures & Commodities
❌ Options Analytics
```

**Individual Tool Control:**
```yaml
Category: Stock Market (150 tools)
├─ ✅ get_market_quote
├─ ✅ get_stock_hot_rank
├─ ❌ get_dragon_tiger_list
├─ ❌ get_block_trade
└─ ... (146 more tools)
```

### Default Configuration

**First Install:**
- ✅ 8 core categories enabled (150 tools)
- ❌ All data categories disabled (474 tools)
- Reason: Minimize API calls, focus on note-taking

**Enable Financial Data:**
```yaml
1. Go to Settings → LLMSider → Built-in Tools
2. Expand "Stock Market" category
3. Toggle "Enable all in category"
4. Click "Apply"
```

**Granular Control:**
```yaml
1. Browse tool list by category
2. Toggle individual tools on/off
3. Search for specific tools
4. Export/import configurations
```

---

## 📊 Tool Usage

### How AI Uses Tools

**Automatic Selection:**
```markdown
User: "What files do I have about Python?"
AI Decision Process:
1. Detect intent: File search
2. Choose tool: search_files() or search_content()
3. Execute: search_content("Python")
4. Present results

No manual tool selection needed!
```

**Multi-Tool Workflows:**
```markdown
User: "Create a stock analysis report for 600000"
AI Workflow:
1. [get_market_quote("600000")] - Current price
2. [get_financial_indicators("600000")] - Financials
3. [get_news_sentiment("600000")] - News
4. [create("Reports/600000-analysis.md", content)] - Save report
✅ Created comprehensive analysis
```

### Tool Call Visibility

**In Chat:**
```markdown
AI: 🔧 Using tool: get_market_quote
    Parameters: {"symbol": "600000"}
    
📊 Result: 
Price: ¥15.23 (+2.34%)
Volume: 12.5M
```

**In Debug Mode:**
```json
{
  "tool": "get_market_quote",
  "params": {"symbol": "600000"},
  "duration": "234ms",
  "result": {
    "price": 15.23,
    "change": 2.34,
    "volume": 12500000
  }
}
```

---

## 💡 Best Practices

### 🎯 Tool Selection

**Let AI Choose:**
```markdown
✅ "Find notes about machine learning"
❌ "Use search_content() to find notes about machine learning"
```

**Be Specific:**
```markdown
✅ "What's Apple's current stock price?"
✅ "Show me today's limit up stocks"
❌ "Get market data"
❌ "Search for stocks"
```

### 🚀 Performance

**Enable Only What You Need:**
```yaml
Note-taking user:
  ✅ Core tools (file, note, search)
  ❌ Financial tools
  ❌ Market data

Financial analyst:
  ✅ Core tools
  ✅ Stock tools
  ✅ Financial tools
  ❌ Crypto tools (if not used)
```

**Cache Results:**
- Market data is cached for 1 minute
- File searches cached for 5 minutes
- Reduces API calls and improves speed

### 🔒 Security

**File System Access:**
```yaml
Tools can:
  ✅ Read files in your vault
  ✅ Create/modify files in vault
  ✅ Move files to trash
  ❌ Delete permanently (requires manual confirmation)
  ❌ Access files outside vault
```

**API Keys:**
```yaml
Market data tools require:
  - API keys configured in settings
  - Rate limiting enabled
  - Usage monitoring
```

### 📈 Cost Management

**Free Tools:**
- ✅ All file/note operations
- ✅ All search operations
- ✅ DuckDuckGo searches
- ✅ Wikipedia searches

**Paid/Rate-Limited:**
- 💰 Some market data APIs
- 💰 Real-time quotes
- ⏱️ Rate limits apply

**Optimization:**
```yaml
1. Enable only needed tools
2. Use caching
3. Batch requests
4. Monitor usage in settings
```

---

## 🔧 Advanced Usage

### Custom Tool Workflows

**Research Workflow:**
```markdown
1. User: "Research topic X"
2. AI:
   - [web_search("X latest news")]
   - [fetch_web_content(top_urls)]
   - [create("Research/X-summary.md", summary)]
   - [enhanced_search("X")] - Find related notes
   - [merge_notes(related, "Research/X-compiled.md")]
```

**Trading Analysis:**
```markdown
1. User: "Analyze tech sector performance"
2. AI:
   - [get_industry_board("Technology")]
   - [get_sector_fund_flow_rank("Technology")]
   - [get_stock_hot_rank(sector="tech")]
   - [get_news_sentiment(sector="tech")]
   - Create comprehensive report
```

### Tool Combinations

**File + Web:**
```markdown
"Fetch this article and save to my vault"
→ [fetch_web_content() + create()]
```

**Search + Analysis:**
```markdown
"Find all project notes and create a summary"
→ [search_files() + view() + create()]
```

**Market + Financial:**
```markdown
"Compare valuations of tech stocks"
→ [get_industry_board() + get_valuation_multiples() + create_report()]
```

---

## 🐛 Troubleshooting

### Common Issues

**Tool not working:**
1. ✅ Check tool is enabled in settings
2. ✅ Verify API keys configured
3. ✅ Check internet connection
4. ✅ Review error message in console

**Slow performance:**
1. ✅ Disable unused tool categories
2. ✅ Enable caching
3. ✅ Use more specific queries
4. ✅ Check network speed

**Unexpected results:**
1. ✅ Be more specific in requests
2. ✅ Check tool parameters in debug mode
3. ✅ Verify data source status
4. ✅ Report issues on GitHub

### Debug Mode

**Enable:**
```
Settings → LLMSider → Advanced → Debug Mode
```

**View Tool Calls:**
```
Open Console (Cmd+Option+I)
Filter: "tool-call"
See: All tool executions with params and results
```

---

## 📚 Tool Reference

### Quick Links

**By Category:**
- [File Management Tools](#file-management)
- [Note Management Tools](#note-management)
- [Search Tools](#search--discovery)
- [Stock Market Tools](#financial-market-data)
- [Futures Tools](#futures--commodities-80-tools)
- [Options Tools](#options-60-tools)
- [Bonds Tools](#bonds-50-tools)
- [Funds Tools](#funds-70-tools)
- [Macro Tools](#macro-economics-20-tools)
- [Crypto Tools](#crypto--digital-assets-15-tools)
- [ESG Tools](#alternative-data-100-tools)

**By Use Case:**
- Content Creation: File, Note, Editor, Web
- Research: Search, Web Content, Wikipedia
- Trading: Stock, Futures, Options, Real-time
- Investing: Financial, Valuation, Funds, Bonds
- Analysis: Technical, Fundamental, Sentiment
- Risk Management: Risk, Credit, ESG

---

## 📖 Related Guides

- [Chat Interface](chat-interface.md) - Using tools in chat
- [Conversation Modes](conversation-modes.md) - Agent mode for tools
- [MCP Integration](mcp-integration.md) - External tool integration
- [Settings Guide](settings-guide.md) - Tool configuration

---

**Questions?** [GitHub Issues](https://github.com/gnuhpc/obsidian-llmsider/issues)

---

## 📝 Appendix

### Tool Count by Category

| Category | Count | Enabled by Default |
|----------|-------|-------------------|
| Stock | 150 | ❌ |
| Futures | 80 | ❌ |
| Funds | 70 | ❌ |
| Options | 60 | ❌ |
| Bonds | 50 | ❌ |
| Financial | 40 | ❌ |
| Forex | 30 | ❌ |
| Industry | 25 | ❌ |
| Search Engines | 20 | ✅ |
| File Management | 20 | ✅ |
| Macro | 20 | ❌ |
| ESG | 18 | ❌ |
| Risk | 15 | ❌ |
| Crypto | 15 | ❌ |
| Note Management | 15 | ✅ |
| File System | 15 | ✅ |
| Search | 15 | ✅ |
| Utility | 10 | ✅ |
| Web Content | 10 | ✅ |
| Editor | 10 | ✅ |
| Other | 20 | ❌ |
| **Total** | **624** | **150 enabled** |

### API Requirements

**Free (No API Key):**
- File/Note operations
- Local search
- DuckDuckGo searches
- Wikipedia

**Requires API Key:**
- Financial data (various providers)
- Some real-time data
- Premium data sources

**Rate Limits:**
- Varies by provider
- Typically: 100-1000 requests/day
- Check provider documentation
