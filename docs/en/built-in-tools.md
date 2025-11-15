# 🛠️ Built-in Tools Reference

## Overview

LLMSider includes **600+ built-in tools** across 20+ categories, providing AI with powerful capabilities to interact with your vault, search the web, access financial data, and more.

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
| **Stock** | 150+ | Stock market data | ❌ Disabled |
| **Futures** | 80+ | Futures & commodities | ❌ Disabled |
| **Options** | 60+ | Options analytics | ❌ Disabled |
| **Bonds** | 50+ | Bond market data | ❌ Disabled |
| **Funds** | 70+ | Mutual funds, ETFs | ❌ Disabled |
| **Forex** | 30+ | Currency exchange | ❌ Disabled |
| **Crypto** | 15+ | Cryptocurrency | ❌ Disabled |
| **Financial** | 40+ | Financial statements | ❌ Disabled |
| **Macro** | 20+ | Economic indicators | ❌ Disabled |
| **Risk** | 15+ | Risk management | ❌ Disabled |
| **ESG** | 18+ | ESG & sustainability | ❌ Disabled |
| **Industry** | 25+ | Industry data | ❌ Disabled |

**Total: 624 tools across 20+ categories**

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

**Disabled by Default (15+ categories):**
- ❌ All financial/market data categories
- ❌ Specialized data categories

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

## 💰 Data Tools

### Financial Market Data

**Stock Market (150+ tools)**

**Real-time Quotes:**
```typescript
// Get current quote
get_market_quote(symbol: string)
// Returns: price, volume, change, etc.

// Real-time A-share data
get_stock_a_share_spot(symbol?: string)
// Live market data

// Minute-level data
get_stock_minute_data(symbol: string, period: string)
// Intraday price movements
```

**Market Analysis:**
```typescript
// Hot stock rankings
get_stock_hot_rank()
get_hot_up_rank()

// Industry/sector boards
get_industry_board()
get_concept_board()
get_board_stocks(board: string)

// Market overview
get_market_overview()
get_market_money_flow()
```

**Trading Activity:**
```typescript
// Limit up/down pools
get_limit_board()
get_limit_up_pool()
get_limit_down_pool()

// Dragon-Tiger List
get_dragon_tiger_list(date: string)
get_dragon_tiger_list_detail(symbol: string, date: string)

// Block trades
get_block_trade(date: string)
get_block_trade_details(symbol: string)
```

**Financial Data:**
```typescript
// Financial statements
get_income_statement_detail(symbol: string)
get_balance_sheet_detail(symbol: string)
get_cash_flow_detail(symbol: string)

// Financial ratios
get_financial_indicators(symbol: string)
get_roe_dupont(symbol: string)
get_profitability_metrics(symbol: string)

// Valuation
get_valuation_multiples(symbol: string)
get_pe_pb_band(symbol: string)
get_dividend_analysis(symbol: string)
```

**Example Usage:**
```markdown
User: "What's the current price of AAPL?"
AI: [uses get_market_quote("AAPL")]
📊 Apple Inc. (AAPL)
Price: $185.23 (+2.34%)
Volume: 45.2M
Market Cap: $2.91T

User: "Show me today's limit up stocks"
AI: [uses get_limit_up_pool()]
🚀 Today's Limit Up Stocks:
1. 600000 (+10.01%)
2. 000001 (+10.00%)
... (23 stocks total)

User: "Analyze the financial health of 600000"
AI:
1. [uses get_financial_indicators("600000")]
2. [uses get_roe_dupont("600000")]
3. [uses get_debt_ratio()]
📊 Financial Analysis:
- ROE: 15.2% (Good)
- Debt Ratio: 42% (Moderate)
- Current Ratio: 1.8 (Healthy)
```

---

### Futures & Commodities (80+ tools)

**Real-time Data:**
```typescript
// Futures quotes
get_futures_realtime(symbol: string)
get_futures_main_contract(variety: string)

// Position rankings
get_futures_position_rank(symbol: string, date: string)
get_futures_holding_rank_detail(symbol: string, date: string)

// Warehouse & inventory
get_futures_warehouse_receipt(variety: string)
get_futures_inventory(exchange: string)
```

**Commodity Data:**
```typescript
// Agricultural inventory
get_agriculture_inventory()
get_oilseed_inventory()
get_sugar_inventory()

// Metals
get_metals_inventory()
get_metals_production()

// Energy
get_oil_inventory()
get_natural_gas_inventory()
get_coal_inventory()

// Industrial
get_steel_inventory()
get_cement_production()
get_rubber_inventory()
```

**Example Usage:**
```markdown
User: "What's the current price of crude oil futures?"
AI: [uses get_futures_realtime("CL")]
🛢️ Crude Oil (CL)
Price: $82.45 (+1.2%)
Volume: 234,567
Open Interest: 1.2M

User: "Show me copper inventory trends"
AI: [uses get_metals_inventory("copper")]
📊 Copper Inventory (Last 30 Days):
Jan 15: 345,000 tons
Jan 14: 342,000 tons (+0.9%)
...
Trend: ⬆️ Increasing
```

---

### Options (60+ tools)

**Options Chains:**
```typescript
// Index options
get_sse50_option()
get_csi300_option()
get_csi1000_option()

// Real-time quotes
get_option_t_quotes(underlying: string)

// Greeks
get_option_greeks(symbol: string)
get_option_greeks_detail(symbol: string)
```

**Analytics:**
```typescript
// Implied volatility
get_option_iv(symbol: string)
get_volatility_surface_analysis(underlying: string)

// Risk metrics
get_option_risk_metrics(symbol: string)
get_option_value_analysis(symbol: string)

// Market indicators
get_option_pcr()  // Put-Call Ratio
get_china_vix()   // Volatility Index
```

**Example Usage:**
```markdown
User: "Show me CSI300 options with highest volume"
AI: [uses get_csi300_option()]
📈 Top 10 by Volume:
1. 510300C2412M05000 - 23,456 contracts
2. 510300P2412M05000 - 18,234 contracts
...

User: "Calculate Greeks for this option"
AI: [uses get_option_greeks_detail("510300C2412M05000")]
📊 Greeks Analysis:
Delta: 0.58
Gamma: 0.023
Theta: -0.042
Vega: 0.156
Implied Vol: 18.5%
```

---

### Bonds (50+ tools)

**Bond Market:**
```typescript
// Real-time quotes
get_bond_realtime(symbol: string)
get_bond_market_quote(market: string)

// Convertible bonds
get_convertible_bond()
get_convertible_bond_value_analysis(symbol: string)
get_convertible_bond_premium_analysis(symbol: string)

// Yield curves
get_treasury_yield_curve()
get_china_bond_yield_curve()
```

**Credit Analysis:**
```typescript
// Credit ratings
get_bond_credit_rating(symbol: string)
get_bond_rating_changes(date: string)

// Default risk
get_bond_default_events()
get_credit_risk_metrics(symbol: string)
```

**Example Usage:**
```markdown
User: "Show me today's convertible bond premiums"
AI: [uses get_convertible_bond_premium_analysis()]
📊 Convertible Bond Premiums:
110061 (Tech CB): +12.5%
113050 (Bank CB): +8.3%
...

User: "Plot the treasury yield curve"
AI: [uses get_treasury_yield_curve()]
📈 Treasury Yield Curve:
3M:  2.45%
6M:  2.68%
1Y:  2.85%
2Y:  3.12%
5Y:  3.45%
10Y: 3.68%
30Y: 3.92%
```

---

### Funds (70+ tools)

**Fund Data:**
```typescript
// Fund information
get_open_fund(fund_code: string)
get_etf_fund(fund_code: string)
get_fund_ranking(category: string)

// NAV history
get_fund_nav_history(fund_code: string)

// Holdings
get_fund_holdings(fund_code: string)
get_fund_stock_holdings(fund_code: string)
get_fund_bond_holdings(fund_code: string)
```

**Fund Analysis:**
```typescript
// Performance
get_fund_manager_performance(manager: string)
get_fund_rating(fund_code: string)

// Flow data
get_fund_flow(fund_code: string)
get_etf_arbitrage()
get_lof_arbitrage()

// Risk metrics
get_fund_risk_metrics(fund_code: string)
get_fund_style_analysis(fund_code: string)
```

**Example Usage:**
```markdown
User: "Find top-performing tech funds"
AI: [uses get_fund_ranking("technology")]
🏆 Top Tech Funds (YTD):
1. Fund A: +35.2%
2. Fund B: +28.7%
3. Fund C: +24.3%

User: "Analyze this fund's holdings"
AI: [uses get_fund_holdings("110011")]
📊 Fund 110011 Holdings:
Top 10 Stocks (45% of portfolio):
1. 600000 (8.2%)
2. 000001 (6.5%)
...
Sector Allocation:
Technology: 35%
Finance: 20%
Healthcare: 15%
```

---

### Macro Economics (20+ tools)

**Economic Indicators:**
```typescript
// China indicators
get_cpi()         // Consumer Price Index
get_ppi()         // Producer Price Index
get_gdp()         // Gross Domestic Product
get_pmi()         // Purchasing Managers Index
get_money_supply()
get_unemployment_rate()

// US indicators
get_us_cpi()
get_us_ppi()
get_us_pmi()
get_us_non_farm_payroll()
get_us_retail_sales()
```

**Example Usage:**
```markdown
User: "Show me China's latest CPI data"
AI: [uses get_cpi()]
📊 China CPI (Latest):
Dec 2024: 0.5% (YoY)
Nov 2024: 0.3%
Oct 2024: 0.1%
Trend: 📈 Rising

User: "Compare US and China GDP growth"
AI:
1. [uses get_gdp()]
2. [uses get_us_gdp()]
📊 GDP Growth Comparison:
China Q4 2024: 5.2%
US Q4 2024: 2.8%
China growing 85% faster
```

---

### Crypto & Digital Assets (15+ tools)

**Cryptocurrency:**
```typescript
// Spot prices
get_crypto_spot(symbol: string)
get_crypto_bitcoin_price_trend()

// Market data
get_crypto_market_cap_ranking()
get_crypto_exchange_ranking()

// DeFi & NFT
get_crypto_defi_tvl()
get_crypto_nft_market_data()

// Bitcoin derivatives
get_crypto_bitcoin_cme()
get_crypto_bitcoin_hold_report()
```

**Example Usage:**
```markdown
User: "What's Bitcoin's current price?"
AI: [uses get_crypto_spot("BTC")]
₿ Bitcoin (BTC)
Price: $42,350 (+3.2%)
24h Volume: $28.5B
Market Cap: $829B

User: "Show me top DeFi protocols by TVL"
AI: [uses get_crypto_defi_tvl()]
🔗 Top DeFi by TVL:
1. Lido: $23.4B
2. MakerDAO: $8.7B
3. Aave: $6.2B
```

---

### Alternative Data (100+ tools)

**ESG Data (18 tools):**
```typescript
// ESG ratings & metrics
get_esg_ratings(symbol: string)
get_carbon_emissions_data(symbol: string)
get_esg_controversy_scores(symbol: string)
get_climate_risk_assessment(symbol: string)

// Sustainability
get_sustainability_reports(symbol: string)
get_water_usage_data(symbol: string)
get_renewable_energy_usage(symbol: string)

// Governance
get_board_diversity_metrics(symbol: string)
get_governance_quality_metrics(symbol: string)
```

**Industry-Specific (25+ tools):**
```typescript
// Real estate
get_real_estate_sales_data(city: string)
get_land_transaction_data(city: string)
get_property_price_indices()

// Automotive
get_automotive_sales_data()
get_car_sales_ranking()
get_nev_sales()  // New Energy Vehicles

// Commodities
get_hog_price_trend()
get_corn_price()
get_soybean_meal_price()
```

**Entertainment & Media:**
```typescript
// Box office
get_movie_boxoffice_realtime()
get_movie_boxoffice_daily()

// TV & streaming
get_tv_show_ranking()
get_variety_show_ranking()
```

**Weather & Environment:**
```typescript
get_weather_daily(city: string)
get_air_quality_hist(city: string)
get_air_quality_rank()
```

**Example Usage:**
```markdown
User: "What's Tesla's ESG rating?"
AI: [uses get_esg_ratings("TSLA")]
🌱 Tesla ESG Profile:
Overall Score: B+
Environmental: A-
Social: B
Governance: B+
Carbon Intensity: Low
Key Strengths: Renewable energy, innovation
Areas for Improvement: Labor practices

User: "Show me today's box office numbers"
AI: [uses get_movie_boxoffice_realtime()]
🎬 Today's Box Office:
1. Movie A: $12.5M
2. Movie B: $8.3M
3. Movie C: $6.7M
Total: $45.2M (+15% vs. yesterday)
```

---

## ⚙️ Configuration

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

**Questions?** [GitHub Issues](https://github.com/llmsider/obsidian-llmsider/issues) | [Discord](https://discord.gg/llmsider)

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
