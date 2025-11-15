/**
 * Bond market tools
 */

export const enBondsTools = {
	getCurrentTime: {
			name: 'Get Current Time',
			description: 'Get the current date and time in various formats'
		},
		append: {
			name: 'Append Content',
			description: 'Append content to the end of a file'
		},
		listDirectory: {
			name: 'List Directory',
			description: 'List all folders and files in a directory. Returns both subdirectories and files, with optional detailed statistics (size, modification time). Use this to browse vault structure or discover existing content.'
		},
		moveFile: {
			name: 'Move File',
			description: 'Move or rename a file within the vault using Obsidian FileManager'
		},
		trashFile: {
			name: 'Trash File',
			description: 'Move a file to trash using Obsidian FileManager (respects user preferences)'
		},
		sed: {
			name: 'Sed Transform',
			description: 'Apply sed-like text transformations to a file using regular expressions. Supports basic sed syntax (s/pattern/replacement/flags). Supports flags: g (global), i (case-insensitive), m (multiline).'
		},
		fileExists: {
			name: 'File Exists',
			description: 'Check if a file exists using FileSystemAdapter with case sensitivity option'
		},
		insertAtCursor: {
			name: 'Insert at Cursor',
			description: 'Insert text at the current cursor position in the active editor'
		},
		// Vault search tools
		searchFiles: {
			name: 'Search Files',
			description: 'Search for files by name pattern in the vault. Supports glob-like patterns with * and ?.'
		},
		searchContent: {
			name: 'Search Content',
			description: 'Search for text content within files using regex patterns.'
		},
		findFilesContaining: {
			name: 'Find Files Containing',
			description: 'Find files that contain specific text (case-insensitive simple search).'
		},
		// Enhanced web search tools
		enhancedSearch: {
			name: 'Enhanced Search',
			description: 'Advanced search tool that aggregates results from multiple search engines (DuckDuckGo, Google, Wikipedia, etc.). Supports text, images, news, and video search with intelligent ranking and deduplication.'
		},
		duckduckgoTextSearch: {
			name: 'DuckDuckGo Text Search',
			description: 'Search the web using DuckDuckGo. Returns text search results with titles, URLs, and snippets. Free, no API key required.'
		},
		duckduckgoImageSearch: {
			name: 'DuckDuckGo Image Search',
			description: 'Search for images using DuckDuckGo. Returns image URLs, thumbnails, titles, and sources. Supports filters for size, color, type, layout, and license.'
		},
		duckduckgoNewsSearch: {
			name: 'DuckDuckGo News Search',
			description: 'Search for news articles using DuckDuckGo. Returns news with titles, URLs, dates, sources, and excerpts.'
		},
		duckduckgoVideoSearch: {
			name: 'DuckDuckGo Video Search',
			description: 'Search for videos using DuckDuckGo. Returns video titles, URLs, descriptions, durations, and publishers.'
		},
		wikipediaSearch: {
			name: 'Wikipedia Search',
			description: 'Search Wikipedia and retrieve article content. Supports multiple languages (en, zh, ja, de, fr, es, etc.). Returns article title, summary, URL, and optional full content.'
		},
		wikipediaRandom: {
			name: 'Wikipedia Random Article',
			description: 'Get a random Wikipedia article. Useful for discovery and inspiration. Returns article title, URL, and content.'
		},
		getMarketQuote: {
			name: 'Get Market Quote',
			description: 'Get real-time or latest market data for stocks (US stocks, China A-shares), cryptocurrencies, and market indices. Supports various symbols like AAPL (Apple), 000001.SZ (Ping An Bank), BTC-USD (Bitcoin), ^DJI (Dow Jones), 000001.SS (Shanghai Composite).'
		},
		searchMarketSymbol: {
			name: 'Search Market Symbol',
			description: 'Search for stock symbols by company name, keyword, or ticker. Returns matching symbols with their names and exchanges. Useful when you know the company name but not the exact symbol.'
		},
		getStockHotRank: {
			name: 'Get Stock Hot Rank',
			description: 'Get current hot stock rankings from East Money showing the most popular stocks with their latest prices and price changes. Useful for identifying market trends and hot stocks.'
		},
		getIndustryBoard: {
			name: 'Get Industry Board',
			description: 'Get real-time market data for all industry sectors in China A-share market. Shows sector performance including price changes, market cap, leading stocks, etc. Useful for sector rotation analysis.'
		},
		getConceptBoard: {
			name: 'Get Concept Board',
			description: 'Get real-time market data for concept/theme sectors (e.g., AI, New Energy, Chip, etc.). Shows concept performance including price changes, constituent stocks, leading stocks. Useful for thematic investment analysis.'
		},
		getBoardStocks: {
			name: 'Get Board Stocks',
			description: 'Get constituent stocks of a specific industry or concept board. Shows stock performance within the board including prices, changes, volumes. Requires board code from get_industry_board or get_concept_board.'
		},
		getLimitBoard: {
			name: 'Get Limit Board',
			description: 'Get stocks hitting daily limit (up/down limit) or strong stocks with significant price changes. Shows limit boards, strong stocks (gain > 7%), turnover, and trading volume.'
		},
		getHotUpRank: {
			name: 'Get Hot Up Rank',
			description: 'Get popularity surge ranking showing stocks with rapidly increasing attention. Shows ranking changes compared to yesterday, current rank, prices, and price changes. Useful for identifying trending stocks.'
		},
		getMarketMoneyFlow: {
			name: 'Get Market Money Flow',
			description: 'Get real-time money flow data for stocks, showing institutional and retail fund movements. Displays main force inflow/outflow, super large orders, big orders, medium orders, and small orders. Useful for analyzing fund movements.'
		},
		getDragonTigerList: {
			name: 'Get Dragon Tiger List',
			description: 'Get Dragon-Tiger list (daily billboard) showing stocks with exceptional trading activity and institutional seat transactions. Shows net buying, reasons for listing, and fund flows. Updated after market close.'
		},
		getNewStockInfo: {
			name: 'Get New Stock Info',
			description: 'Get IPO (new stock) information including subscription calendar and newly listed stock performance. Shows issue price, P/E ratio, subscription dates, listing dates, and first-day performance.'
		},
		getMarketOverview: {
			name: 'Get Market Overview',
			description: 'Get comprehensive A-share market overview including total stocks, up/down counts, limit board statistics, average price change, total trading volume, and price change distribution. Useful for understanding overall market sentiment.'
		},
		getMovieBoxOfficeRealtime: {
			name: 'Get Movie Box Office Realtime',
			description: 'Get real-time movie box office data for currently showing movies in China. Shows today\'s box office, total box office, release days, and rankings.'
		},
		getMovieBoxOfficeDaily: {
			name: 'Get Movie Box Office Daily',
			description: 'Get daily movie box office data for a specific date in China. Shows total box office, rankings, box office share, and screening rate.'
		},
		getTVShowRanking: {
			name: 'Get TV Show Ranking',
			description: 'Get popular TV drama series rankings with heat index, starring actors, and platform information from major Chinese video platforms.'
		},
		getVarietyShowRanking: {
			name: 'Get Variety Show Ranking',
			description: 'Get popular variety show rankings with heat index, hosts, and platform information from major Chinese video platforms.'
		},
		getArtistBusinessValue: {
			name: 'Get Artist Business Value',
			description: 'Get artist business value rankings based on commercial influence, endorsements, and market impact in China entertainment industry.'
		},
		getArtistOnlineValue: {
			name: 'Get Artist Online Value',
			description: 'Get artist online traffic value rankings based on social media influence, fan engagement, and online presence in China.'
		},
		getWeatherDaily: {
			name: 'Get Weather Daily',
			description: 'Get sunrise and sunset times for cities worldwide. Includes civil twilight times and daylight duration.'
		},
		getAirQualityHist: {
			name: 'Get Air Quality History',
			description: 'Get historical air quality data (AQI, PM2.5, PM10, etc.) for cities in China. Shows air quality index, pollution levels, and health recommendations.'
		},
		getAirQualityRank: {
			name: 'Get Air Quality Rank',
			description: 'Get real-time air quality rankings for major cities in China, sorted by AQI from best to worst. Useful for comparing air quality across cities.'
		},
		getAirCityList: {
			name: 'Get Air City List',
			description: 'Get the list of all cities in China that support air quality monitoring. Organized by province and region.'
		},
		getHogPriceProvinceRank: {
			name: 'Get Hog Price Province Rank',
			description: 'Get real-time live hog price rankings by province in China. Shows current prices, price changes, and trends for pig farming industry.'
		},
		getHogPriceTrend: {
			name: 'Get Hog Price Trend',
			description: 'Get national live hog price trends showing historical price changes over specified period. Useful for analyzing pig farming market cycles.'
		},
		getHogLeanPrice: {
			name: 'Get Hog Lean Price',
			description: 'Get current lean-type hog prices by region in China. Shows average price, highest/lowest prices, and price changes.'
		},
		getCornPrice: {
			name: 'Get Corn Price',
			description: 'Get national corn price trends in China. Corn is a major feed ingredient affecting livestock farming costs.'
		},
		getSoybeanMealPrice: {
			name: 'Get Soybean Meal Price',
			description: 'Get national soybean meal price trends in China. Soybean meal is a key protein source in animal feed.'
		},
		getFeedCostIndex: {
			name: 'Get Feed Cost Index',
			description: 'Get comprehensive feed cost index for pig farming including corn, soybean meal, and mixed feed prices. Useful for analyzing farming profitability.'
		},
		// Futures market tools
		getFuturesRealtime: {
			name: 'Get Futures Real-time Quotes',
			description: 'Get real-time quotes for domestic futures contracts including price, volume, open interest, settlement price, etc. Supports all major commodity, financial, and index futures.'
		},
		getFuturesMainContract: {
			name: 'Get Futures Main Contract',
			description: 'Get main (most actively traded) contract information for futures varieties. Returns contract code, current price, open interest, trading volume.'
		},
		getFuturesPositionRank: {
			name: 'Get Futures Position Rank',
			description: 'Get futures position ranking by broker/member showing top holders for long/short positions and trading volume. Useful for tracking institutional positions.'
		},
		getFuturesWarehouseReceipt: {
			name: 'Get Futures Warehouse Receipt',
			description: 'Get futures warehouse receipt data showing physical commodity inventory registered for delivery. Important for analyzing supply-demand fundamentals.'
		},
		getFuturesInventory: {
			name: 'Get Futures Inventory',
			description: 'Get futures market inventory data for various commodities. Shows stock levels at major warehouses and delivery points.'
		},
		getComexInventory: {
			name: 'Get COMEX Inventory',
			description: 'Get COMEX (Commodity Exchange) metal inventory data for gold, silver, copper, etc. Updated daily showing registered and eligible stocks.'
		},
		getFuturesBasis: {
			name: 'Get Futures Basis',
			description: 'Get futures basis (spread between futures and spot prices). Positive basis indicates contango, negative indicates backwardation. Important for arbitrage and hedging.'
		},
		// Futures advanced tools
		getFuturesPositionRankSum: {
			name: 'Get Futures Position Rankings',
			description: 'Get futures position rankings by brokers/institutions. Shows top holders of long/short positions and their changes. Useful for tracking smart money.'
		},
		getFuturesWarehouseReceiptData: {
			name: 'Get Futures Warehouse Receipt Data',
			description: 'Get warehouse receipt (delivery warrant) data for futures contracts. Shows inventory levels at delivery warehouses. Critical for spot-futures arbitrage.'
		},
		getCFFEXDaily: {
			name: 'Get CFFEX Daily Data',
			description: 'Get China Financial Futures Exchange (CFFEX) daily trading data. Includes index futures (IF, IC, IH, IM, MO) and treasury futures (T, TF, TS, TL).'
		},
		getCZCEDaily: {
			name: 'Get CZCE Daily Data',
			description: 'Get Zhengzhou Commodity Exchange (CZCE) daily trading data. Includes agricultural products (wheat, cotton, sugar, PTA) and industrial materials.'
		},
		getDCEDaily: {
			name: 'Get DCE Daily Data',
			description: 'Get Dalian Commodity Exchange (DCE) daily trading data. Includes agricultural products (soybeans, corn, eggs) and chemicals (plastics, PVC).'
		},
		getSHFEDaily: {
			name: 'Get SHFE Daily Data',
			description: 'Get Shanghai Futures Exchange (SHFE) daily trading data. Includes metals (copper, aluminum, gold, silver), energy (crude oil), and chemicals (rubber).'
		},
		getINEDaily: {
			name: 'Get INE Daily Data',
			description: 'Get Shanghai International Energy Exchange (INE) daily trading data. Includes crude oil, fuel oil, low-sulfur fuel oil, and 20# rubber.'
		},
		getFuturesInventoryEM: {
			name: 'Get Futures Inventory (EM)',
			description: 'Get comprehensive futures inventory data from East Money. Covers all major Chinese futures exchanges. Shows daily inventory changes.'
		},
		getDCECommodityOptionHist: {
			name: 'Get DCE Commodity Option History',
			description: 'Get historical data for Dalian Commodity Exchange commodity options. Includes corn, soybean, iron ore, palm oil options.'
		},
		getCZCECommodityOptionHist: {
			name: 'Get CZCE Commodity Option History',
			description: 'Get historical data for Zhengzhou Commodity Exchange commodity options. Includes sugar, cotton, PTA, methanol options.'
		},
		getSHFECommodityOptionHist: {
			name: 'Get SHFE Commodity Option History',
			description: 'Get historical data for Shanghai Futures Exchange commodity options. Includes copper, gold, rubber, aluminum options.'
		},
		getGFEXCommodityOptionHist: {
			name: 'Get GFEX Commodity Option History',
			description: 'Get historical data for Guangzhou Futures Exchange commodity options. Includes silicon, power coal, soda ash options.'
		},
		// Bond market tools
		getBondRealtime: {
			name: 'Get Bond Real-time Quotes',
			description: 'Get real-time quotes for bonds including government bonds, corporate bonds, convertible bonds. Shows yield, price, volume, and maturity information.'
		},
		getConvertibleBond: {
			name: 'Get Convertible Bond Data',
			description: 'Get convertible bond market data including conversion premium, pure bond value, conversion value, and YTM. Useful for convertible arbitrage.'
		},
		getTreasuryYieldCurve: {
			name: 'Get Treasury Yield Curve',
			description: 'Get government bond yield curve showing yields across different maturities (3M/6M/1Y/3Y/5Y/7Y/10Y/30Y). Useful for analyzing interest rate expectations.'
		},
		getCorporateBond: {
			name: 'Get Corporate Bond Data',
			description: 'Get corporate bond market data including bond ratings, yields, issuers, and maturity dates. Supports filtering by rating and industry.'
		},
		getBondYTM: {
			name: 'Get Bond YTM',
			description: 'Get bond yield to maturity (YTM) data. YTM is the total return anticipated on a bond if held until maturity, expressed as annual rate.'
		},
		getChinaUSTreasurySpread: {
			name: 'Get China-US Treasury Spread',
			description: 'Get spread between China and US treasury yields (10-year benchmark). Important indicator for international capital flows and currency movements.'
		},
		// Bond advanced tools
		getBondMarketQuote: {
			name: 'Get Bond Market Quote',
			description: 'Get comprehensive bond market quotes including treasuries, corporate bonds, and municipal bonds. Real-time pricing with yield, duration, and rating information.'
		},
		getBondMarketTrade: {
			name: 'Get Bond Market Trade',
			description: 'Get bond trading activity data including transaction volume, price, and turnover. Shows institutional and retail trading patterns.'
		},
		getTreasuryBondIssue: {
			name: 'Get Treasury Bond Issuance',
			description: 'Get treasury bond issuance information including issue date, amount, coupon rate, and maturity. Covers central government bonds and T-bills.'
		},
		getCorporateBondIssue: {
			name: 'Get Corporate Bond Issuance',
			description: 'Get corporate bond issuance data including issuer, amount, rating, purpose, and underwriters. Important for credit market analysis.'
		},
		getLocalGovBondIssue: {
			name: 'Get Local Government Bond Issuance',
			description: 'Get local government bond issuance information. Shows provincial/municipal bonds with purpose (infrastructure, refinancing), amount, and terms.'
		},
		getConvertibleBondValueAnalysis: {
			name: 'Get Convertible Bond Value Analysis',
			description: 'Get convertible bond value decomposition showing pure bond value, option value, and total value. Essential for convertible arbitrage strategies.'
		},
		getConvertibleBondPremiumAnalysis: {
			name: 'Get Convertible Bond Premium Analysis',
			description: 'Get convertible bond premium metrics including conversion premium rate, pure bond premium rate, and break-even analysis. Key for pricing evaluation.'
		},
		getChinaBondYieldCurve: {
			name: 'Get China Bond Yield Curve',
			description: 'Get China Central Depository & Clearing yield curve data. Shows term structure of interest rates from 1 month to 30 years for various bond types.'
		},
		getSSEPledgeRepo: {
			name: 'Get SSE Pledge Repo',
			description: 'Get Shanghai Stock Exchange pledge repo (bond collateral repo) trading data. Shows repo rates from overnight to 182 days. Key for money market rates.'
		},
		getSZSEPledgeRepo: {
			name: 'Get SZSE Pledge Repo',
			description: 'Get Shenzhen Stock Exchange pledge repo trading data. Includes various tenors from 1 day to 6 months. Reflects short-term liquidity conditions.'
		},
getBondConvertPremium: {
			name: 'Get Convertible Bond Premium',
			description: 'Get convertible bond conversion premium data.'
		},
		getBondCallRedeemWarning: {
			name: 'Get Convertible Bond Call Warning',
			description: 'Get convertible bond forced redemption warning information.'
		},
		getFundShareChange: {
			name: 'Get Fund Share Changes',
			description: 'Get fund share change history data.'
		},
		getFundPurchaseRedeem: {
			name: 'Get Fund Purchase/Redemption',
			description: 'Get fund subscription and redemption status information.'
		},
		getFundRatingAllEM: {
			name: 'Get Fund Ratings - All',
			description: 'Get all fund rating data from East Money.'
		},
		getFundRatingSH: {
			name: 'Get Fund Ratings - Shanghai',
			description: 'Get fund rating data from Shanghai Securities.'
		},
		getFundOpenRankEM: {
			name: 'Get Open-End Fund Ranking',
			description: 'Get open-end fund ranking from East Money.'
		},
		getESGRatings: {
			name: 'Get ESG Ratings',
			description: 'Get corporate Environmental, Social and Governance (ESG) ratings.'
		},
		getCarbonEmissionsData: {
			name: 'Get Carbon Emissions Data',
			description: 'Get corporate carbon emissions and footprint data.'
		},
		getGreenBondData: {
			name: 'Get Green Bond Data',
			description: 'Get green bond issuance and market data.'
		},
		getESGControversyScores: {
			name: 'Get ESG Controversy Scores',
			description: 'Get corporate ESG-related controversy event scores.'
		},
		getClimateRiskAssessment: {
			name: 'Get Climate Risk Assessment',
			description: 'Assess climate change risks faced by corporations.'
		},
		getSustainabilityReports: {
			name: 'Get Sustainability Reports',
			description: 'Get corporate sustainability report summaries.'
		},
		getWaterUsageData: {
			name: 'Get Water Usage Data',
			description: 'Get corporate water consumption and management data.'
		},
		getRenewableEnergyUsage: {
			name: 'Get Renewable Energy Usage',
			description: 'Get corporate renewable energy usage ratio.'
		},
		getWasteManagementMetrics: {
			name: 'Get Waste Management Metrics',
			description: 'Get corporate waste disposal and recycling metrics.'
		},
		getSupplyChainESGMetrics: {
			name: 'Get Supply Chain ESG Metrics',
			description: 'Get supply chain environmental and social responsibility indicators.'
		},
		getBoardDiversityMetrics: {
			name: 'Get Board Diversity Metrics',
			description: 'Get board gender and background diversity metrics.'
		},
		getEmployeeSatisfactionMetrics: {
			name: 'Get Employee Satisfaction Metrics',
			description: 'Get employee satisfaction and welfare indicators.'
		},
		getESGFundScreening: {
			name: 'Get ESG Fund Screening',
			description: 'Screen investment funds meeting ESG standards.'
		},
		getGreenFinanceStats: {
			name: 'Get Green Finance Statistics',
			description: 'Get green finance market statistics.'
		},
		getCarbonCreditPrices: {
			name: 'Get Carbon Credit Prices',
			description: 'Get carbon credit trading prices.'
		},
		getESGDisclosureQuality: {
			name: 'Get ESG Disclosure Quality',
			description: 'Assess corporate ESG information disclosure quality.'
		},
		getSocialResponsibilityMetrics: {
			name: 'Get Social Responsibility Metrics',
			description: 'Get corporate social responsibility fulfillment indicators.'
		},
		getGovernanceQualityMetrics: {
			name: 'Get Governance Quality Metrics',
			description: 'Get corporate governance quality scores.'
		},
		getOrderBookDepth: {
			name: 'Get Order Book Depth',
			description: 'Get market order book depth and bid/ask distribution.'
		},
		getMicrostructureMarketMakerDepth: {
			name: 'Get Market Maker Depth',
			description: 'Get market maker quote depth and liquidity.'
		},
		getTickByTickData: {
			name: 'Get Tick-by-Tick Data',
			description: 'Get market tick-by-tick transaction detail data.'
		},
		getTradeExecutionQuality: {
			name: 'Get Trade Execution Quality',
			description: 'Assess trade execution quality and slippage.'
		},
		getSlippageAnalysis: {
			name: 'Get Slippage Analysis',
			description: 'Analyze trade slippage and market impact costs.'
		},
		getMarketImpactAnalysis: {
			name: 'Get Market Impact Analysis',
			description: 'Analyze large trade impact on market prices.'
		},
		getVWAPTWAPBenchmarks: {
			name: 'Get VWAP/TWAP Benchmarks',
			description: 'Get volume-weighted and time-weighted average prices.'
		},
		getLimitOrderBookAnalysis: {
			name: 'Get Limit Order Book Analysis',
			description: 'Analyze limit order book structure and imbalances.'
		},
		getQuoteStuffingDetection: {
			name: 'Get Quote Stuffing Detection',
			description: 'Detect market quote stuffing and abnormal behavior.'
		},
		getHFTActivityIndicators: {
			name: 'Get HFT Activity Indicators',
			description: 'Monitor high-frequency trading activity and market quality.'
		},
		getDarkPoolVolume: {
			name: 'Get Dark Pool Volume',
			description: 'Get dark pool trading volume data.'
		},
		getAuctionImbalanceIndicators: {
			name: 'Get Auction Imbalance Indicators',
			description: 'Get opening and closing auction imbalance indicators.'
		},
		getBlockTradeAnalysis: {
			name: 'Get Block Trade Analysis',
			description: 'Analyze block trade impact on markets.'
		},
		getOrderFlowImbalance: {
			name: 'Get Order Flow Imbalance',
			description: 'Monitor buy/sell order flow imbalances.'
		},
		getBidAskBounceAnalysis: {
			name: 'Get Bid-Ask Bounce Analysis',
			description: 'Analyze bid-ask spread bounce patterns.'
		},
		getTradeClassification: {
			name: 'Get Trade Classification',
			description: 'Classify trades as buyer-initiated or seller-initiated.'
		},
		getCreditRatingsHistory: {
			name: 'Get Credit Ratings History',
			description: 'Get bond and corporate credit rating history changes.'
		},
		getRatingTransitionMatrix: {
			name: 'Get Rating Transition Matrix',
			description: 'Get credit rating transition probability matrix.'
		},
		getDefaultProbability: {
			name: 'Get Default Probability',
			description: 'Calculate bond and corporate default probability.'
		},
		getCreditSpreadAnalysis: {
			name: 'Get Credit Spread Analysis',
			description: 'Analyze credit spread trends and drivers.'
		},
		getRecoveryRates: {
			name: 'Get Recovery Rates',
			description: 'Get historical recovery rate data for defaulted bonds.'
		},
		getCovenantAnalysis: {
			name: 'Get Covenant Analysis',
			description: 'Analyze bond protective and restrictive covenants.'
		},
		getDebtStructureAnalysis: {
			name: 'Get Debt Structure Analysis',
			description: 'Analyze corporate debt structure and solvency.'
		},
		getCreditEventHistory: {
			name: 'Get Credit Event History',
			description: 'Get history of credit events like defaults and downgrades.'
		},
		getBankruptcyPrediction: {
			name: 'Get Bankruptcy Prediction',
			description: 'Predict corporate bankruptcy risk and probability.'
		},
		getDistressedDebtAnalysis: {
			name: 'Get Distressed Debt Analysis',
			description: 'Analyze distressed corporate debt restructuring opportunities.'
		},
		getCreditPortfolioAnalytics: {
			name: 'Get Credit Portfolio Analytics',
			description: 'Analyze credit investment portfolio risk and return.'
		},
		getCounterpartyCreditRisk: {
			name: 'Get Counterparty Credit Risk',
			description: 'Assess counterparty credit risk.'
		},
		getSovereignCreditAnalysis: {
			name: 'Get Sovereign Credit Analysis',
			description: 'Analyze sovereign credit risk.'
		},
		getCorporateBondAnalytics: {
			name: 'Get Corporate Bond Analytics',
			description: 'Analyze corporate bond valuation and risk.'
		},
		getCreditCycleIndicators: {
			name: 'Get Credit Cycle Indicators',
			description: 'Monitor credit cycle phases and trends.'
		},
		getDebtCapacityAnalysis: {
			name: 'Get Debt Capacity Analysis',
			description: 'Analyze corporate capacity for additional debt.'
		},
		getExecutiveTrading: {
			name: 'Get Executive Trading',
			description: 'Query executive trading records including directors and supervisors buying/selling stocks, capturing insider trading signals for investment reference.'
		},
		getInstitutionalHoldings: {
			name: 'Get Institutional Holdings',
			description: 'Query shareholding details by institutional investors (funds, QFII, social security funds, etc.) to understand institutional investment preferences.'
		},
		getShareholderCount: {
			name: 'Get Shareholder Count',
			description: 'Query total shareholder count changes over time to analyze equity concentration trends and investor structure.'
		},
		getRestrictedShareRelease: {
			name: 'Get Restricted Share Release',
			description: 'Query restricted share unlock schedule including IPO restricted shares, additional issuance locked shares, lifting dates and quantities, evaluating potential selling pressure.'
		},
		getSharePledge: {
			name: 'Get Share Pledge',
			description: 'Query major shareholder pledge status including pledged quantity, pledge ratio, pledgees, monitoring credit risk and shareholder liquidity.'
		},
		getEquityIncentive: {
			name: 'Get Equity Incentive',
			description: 'Query equity incentive plan details including stock options, restricted stocks, evaluating management alignment with shareholder interests.'
		},
		getEarningsForecast: {
			name: 'Get Earnings Forecast',
			description: 'Query company earnings forecasts, analyst consensus estimates for future performance, helping understand market expectations.'
		},
		getEarningsFlash: {
			name: 'Get Earnings Flash',
			description: 'Query real-time earnings announcement summaries, including EPS, revenue, net profit, capturing immediate earnings updates.'
		},
		getTopList: {
			name: 'Get Top List',
			description: 'Query top 10 daily stocks ranked by various metrics (turnover rate, volume, price change, amplitude) discovering market hotspots and active stocks.'
		},
		getStockFinancialRatios: {
			name: 'Get Stock Financial Ratios',
			description: 'Comprehensive financial ratio analysis including profitability, liquidity, solvency, and efficiency metrics.'
		},
		getStockDCFValuation: {
			name: 'Get Stock DCF Valuation',
			description: 'Perform discounted cash flow (DCF) valuation analysis for stock intrinsic value estimation.'
		},
		getStockTechnicalIndicators: {
			name: 'Get Stock Technical Indicators',
			description: 'Query technical indicators including MACD, RSI, Bollinger Bands, KDJ for technical analysis.'
		},
		getStockIndustryComparison: {
			name: 'Get Stock Industry Comparison',
			description: 'Compare target stock\'s financial metrics with industry peers for relative valuation analysis.'
		},
		getConvertibleBondSpot: {
			name: 'Get Convertible Bond Spot',
			description: 'Query real-time convertible bond quotes including price, conversion premium, YTM, etc.'
		},
		getConvertibleBondIssuance: {
			name: 'Get Convertible Bond Issuance',
			description: 'Query convertible bond issuance data including issuer, issuance scale, conversion terms, etc.'
		},
		getCorporateBondSpot: {
			name: 'Get Corporate Bond Spot',
			description: 'Query real-time corporate bond quotes including price, yield, trading volume, etc.'
		},
		getCorporateBondIssuance: {
			name: 'Get Corporate Bond Issuance',
			description: 'Query corporate bond issuance information including issuer, issuance scale, coupon rate, maturity, etc.'
		},
		getLocalGovBondIssuance: {
			name: 'Get Local Government Bond Issuance',
			description: 'Query local government bond issuance data including issuing region, bond purpose, issuance scale, coupon rate, etc.'
		},
		getExchangeableBond: {
			name: 'Get Exchangeable Bond',
			description: 'Query exchangeable bond information including underlying stock, exchange terms, premium rate, etc.'
		},
		getABSSecurities: {
			name: 'Get ABS Securities',
			description: 'Query asset-backed securities (ABS) information including underlying assets, issuance scale, rating, etc.'
		},
		getBondCreditRating: {
			name: 'Get Bond Credit Rating',
			description: 'Query bond issuer and bond credit ratings including rating agency, rating level, outlook, etc.'
		},
		getBondRatingChanges: {
			name: 'Get Bond Rating Changes',
			description: 'Query historical bond rating change records including upgrade/downgrade events, reasons, etc.'
		},
		getBondDefaultEvents: {
			name: 'Get Bond Default Events',
			description: 'Query bond default events including default date, default amount, default type, handling progress, etc.'
		},
		getBondRepoRates: {
			name: 'Get Bond Repo Rates',
			description: 'Query interbank and exchange repo rates reflecting short-term liquidity conditions.'
		},
		getBondDurationConvexity: {
			name: 'Get Bond Duration Convexity',
			description: 'Calculate bond duration and convexity for interest rate risk assessment and hedging strategy development.'
		},
		getConversionPremiumHistory: {
			name: 'Get Conversion Premium History',
			description: 'Query convertible bond conversion premium historical data analyzing premium trends and conversion opportunities.'
		},
		getShiborRate: {
			name: 'Get SHIBOR Rate',
			description: 'Query Shanghai Interbank Offered Rate (SHIBOR) including overnight, 1-week, 1-month, 3-month, etc. reflecting interbank liquidity.'
		},
		getLPRRate: {
			name: 'Get LPR Rate',
			description: 'Query Loan Prime Rate (LPR) as benchmark for bank loan interest rates, reflecting monetary policy and credit costs.'
		},
		getAgricultureInventory: {
			name: 'Get Agriculture Inventory',
			description: 'Query agricultural commodity inventory data (grains, oilseeds) including domestic stocks, port stocks, etc.'
		},
		getAgricultureProduction: {
			name: 'Get Agriculture Production',
			description: 'Query agricultural product production data including crop yields, planting area, production forecasts, etc.'
		},
		getMetalsInventory: {
			name: 'Get Metals Inventory',
			description: 'Query metal commodity inventory data including copper, aluminum, zinc, etc. covering exchange stocks, social inventory, etc.'
		},
		getMetalsProduction: {
			name: 'Get Metals Production',
			description: 'Query metal production data including mining output, smelting output, production capacity utilization, etc.'
		},
		getMetalsTradeData: {
			name: 'Get Metals Trade Data',
			description: 'Query metal import/export data including import volume, export volume, net imports, etc.'
		},
		getOilInventory: {
			name: 'Get Oil Inventory',
			description: 'Query crude oil inventory data including commercial inventory, strategic reserves, refinery inventory, etc.'
		},
		getRefinedOilInventory: {
			name: 'Get Refined Oil Inventory',
			description: 'Query refined oil product inventory including gasoline, diesel, kerosene inventory levels.'
		},
		getNaturalGasInventory: {
			name: 'Get Natural Gas Inventory',
			description: 'Query natural gas storage data including underground storage, LNG tank storage, etc.'
		},
		getCoalInventory: {
			name: 'Get Coal Inventory',
			description: 'Query coal inventory data including port inventory, power plant inventory, social inventory, etc.'
		},
		getSteelInventory: {
			name: 'Get Steel Inventory',
			description: 'Query steel product inventory including rebar, hot-rolled coil, cold-rolled sheet inventory at mills and social warehouses.'
		},
		getChemicalInventory: {
			name: 'Get Chemical Inventory',
			description: 'Query chemical product inventory including PVC, PP, PE, PTA, ethylene, etc.'
		},
		getRubberInventory: {
			name: 'Get Rubber Inventory',
			description: 'Query natural and synthetic rubber inventory data.'
		},
		getSugarInventory: {
			name: 'Get Sugar Inventory',
			description: 'Query sugar inventory data including industrial inventory, port inventory, etc.'
		},
		getOilseedInventory: {
			name: 'Get Oilseed Inventory',
			description: 'Query oilseed and vegetable oil inventory including soybeans, soybean oil, palm oil, rapeseed oil, etc.'
		},
		getGlassData: {
			name: 'Get Glass Data',
			description: 'Query glass industry data including production, inventory, operating rate, etc.'
		},
		getCementProduction: {
			name: 'Get Cement Production',
			description: 'Query cement production data including output, clinker production, capacity utilization, etc.'
		},
		getMajorFXPairs: {
			name: 'Get Major FX Pairs',
			description: 'Query list of major currency pairs and their basic information.'
		},
		getFXPairQuote: {
			name: 'Get FX Pair Quote',
			description: 'Query specific currency pair real-time quote including bid/ask price, spread, etc.'
		},
		getFXSwapQuote: {
			name: 'Get FX Swap Quote',
			description: 'Query FX swap point quotes for different tenors used for FX forward pricing and hedging.'
		},
		getBitcoinPriceTrend: {
			name: 'Get Bitcoin Price Trend',
			description: 'Query Bitcoin historical price trends including daily/hourly OHLCV data.'
		},
		getCryptoMarketCapRanking: {
			name: 'Get Crypto Market Cap Ranking',
			description: 'Query cryptocurrency market capitalization rankings showing major coins by size.'
		},
		getCryptoExchangeRanking: {
			name: 'Get Crypto Exchange Ranking',
			description: 'Query cryptocurrency exchange rankings by trading volume, user count, etc.'
		},
		getDeFiTVL: {
			name: 'Get DeFi TVL',
			description: 'Query DeFi protocol Total Value Locked (TVL) data reflecting decentralized finance scale.'
		},
		getNFTMarketData: {
			name: 'Get NFT Market Data',
			description: 'Query NFT market data including trading volume, floor price, active users, etc.'
		},
		getMacroCPI: {
			name: 'Get Macro CPI',
			description: 'Query Consumer Price Index (CPI) data reflecting inflation levels and price changes.'
		},
		getMacroPPI: {
			name: 'Get Macro PPI',
			description: 'Query Producer Price Index (PPI) data reflecting industrial product price changes.'
		},
		getMacroGDP: {
			name: 'Get Macro GDP',
			description: 'Query Gross Domestic Product (GDP) data reflecting economic growth and size.'
		},
		getMacroPMI: {
			name: 'Get Macro PMI',
			description: 'Query Purchasing Managers\' Index (PMI) data reflecting manufacturing and services sector activity.'
		},
		getMacroMoneySupply: {
			name: 'Get Macro Money Supply',
			description: 'Query money supply data (M0, M1, M2) reflecting currency circulation and liquidity.'
		},
		// Stock Financial Analysis Depth Tools
		getIncomeStatementDetail: {
			name: 'Get Income Statement Detail',
			description: 'Get detailed income statement (利润表) with operating revenue, operating costs, sales/admin/financial expenses, R&D expenses, net profit, EPS, and year-over-year changes. Essential for profitability analysis.'
		},
		getBalanceSheetDetail: {
			name: 'Get Balance Sheet Detail',
			description: 'Get detailed balance sheet (资产负债表) with assets, liabilities, shareholders equity, current ratio, asset-liability ratio, and structure analysis. Critical for solvency assessment.'
		},
		getCashFlowDetail: {
			name: 'Get Cash Flow Detail',
			description: 'Get detailed cash flow statement (现金流量表) showing operating, investing, and financing activities. Operating cash flow quality is key indicator of business health.'
		},
		getFinancialIndicators: {
			name: 'Get Financial Indicators',
			description: 'Get comprehensive financial indicators including profitability (ROE, ROA, net margin), solvency (debt ratios), operational efficiency (turnover ratios), and growth rates. One-stop financial health check.'
		},
		getRoeDupont: {
			name: 'Get ROE DuPont Analysis',
			description: 'Get ROE DuPont analysis (杜邦分析) decomposing ROE into net profit margin × asset turnover × equity multiplier. Identifies profit drivers and leverage impact. Core valuation metric.'
		},
		getProfitabilityMetrics: {
			name: 'Get Profitability Metrics',
			description: 'Get profitability metrics including gross margin, operating margin, net margin, ROE, ROA, ROIC with historical trends. High and stable margins indicate competitive advantage.'
		},
		getOperatingEfficiency: {
			name: 'Get Operating Efficiency',
			description: 'Get operating efficiency ratios including inventory turnover, receivables turnover, payables turnover, cash conversion cycle. Higher turnover = better capital efficiency.'
		},
		getSolvencyRatios: {
			name: 'Get Solvency Ratios',
			description: 'Get solvency ratios including current ratio, quick ratio, cash ratio, debt-to-equity, interest coverage. Measures ability to meet short-term and long-term obligations.'
		},
		getGrowthMetrics: {
			name: 'Get Growth Metrics',
			description: 'Get growth metrics including revenue growth, net profit growth, EPS growth, asset growth rates. Sustained high growth commands premium valuations.'
		},
		getValuationMultiples: {
			name: 'Get Valuation Multiples',
			description: 'Get valuation multiples including P/E, P/B, P/S, EV/EBITDA ratios with sector comparisons and historical percentiles. Low multiples may indicate undervaluation.'
		},
		getPePbBand: {
			name: 'Get PE/PB Band Analysis',
			description: 'Get historical PE/PB band analysis (估值区间) showing valuation ranges over time. Trading below historical average PE/PB may signal opportunity.'
		},
		getDividendAnalysis: {
			name: 'Get Dividend Analysis',
			description: 'Get dividend analysis (分红分析) including dividend yield, payout ratio, dividend growth rate, and payout history. Consistent dividends indicate stable cash flow.'
		},
		getFreeCashFlow: {
			name: 'Get Free Cash Flow',
			description: 'Get free cash flow (FCF) analysis = Operating Cash Flow - Capital Expenditures. FCF is cash available for dividends, buybacks, debt reduction. Warren Buffett\'s favorite metric.'
		},
		getEarningsQuality: {
			name: 'Get Earnings Quality',
			description: 'Get earnings quality analysis comparing net profit vs operating cash flow. If cash flow < profit, earnings may be low quality (aggressive accounting). High quality = profit backed by cash.'
		},
		getAssetQuality: {
			name: 'Get Asset Quality',
			description: 'Get asset quality analysis examining receivables aging, inventory aging, goodwill, intangible assets. High quality assets are liquid and realizable. Beware of excessive goodwill.'
		},
		getRevenueBreakdown: {
			name: 'Get Revenue Breakdown',
			description: 'Get revenue breakdown by product, geography, customer segments. Shows business diversification and growth drivers. Concentration risk if one product/region dominates.'
		},
		getCostStructure: {
			name: 'Get Cost Structure',
			description: 'Get cost structure analysis showing COGS, operating expenses, SG&A, R&D as % of revenue. Identifies cost control effectiveness and operating leverage potential.'
		},
		getRdInvestment: {
			name: 'Get R&D Investment',
			description: 'Get R&D investment (研发投入) and R&D intensity (R&D / Revenue). High R&D indicates innovation focus, important for tech and pharma sectors. Drives long-term competitiveness.'
		},
		getCapexAnalysis: {
			name: 'Get Capex Analysis',
			description: 'Get capital expenditure (CAPEX) analysis showing investment in PP&E, growth vs maintenance capex. High capex may indicate growth phase or capital-intensive business model.'
		},
		getTaxRateAnalysis: {
			name: 'Get Tax Rate Analysis',
			description: 'Get effective tax rate analysis comparing statutory vs actual tax rates. Lower effective rates boost net profit. Sudden changes may indicate tax benefits expiring.'
		},
		getPeerComparison: {
			name: 'Get Peer Comparison',
			description: 'Get peer comparison (同业对比) benchmarking financial metrics against industry competitors. Identifies relative strengths/weaknesses and valuation gaps.'
		},
		getFinancialForecast: {
			name: 'Get Financial Forecast',
			description: 'Get financial forecast and analyst consensus (一致预期) for EPS, revenue, net profit. Shows market expectations. Beating consensus drives stock price up.'
		},
		getEarningsSurprise: {
			name: 'Get Earnings Surprise',
			description: 'Get earnings surprise history (业绩超预期) showing actual vs expected results. Consistent positive surprises = management under-promises and over-delivers.'
		},
		getQuarterlyEarningsTrend: {
			name: 'Get Quarterly Earnings Trend',
			description: 'Get quarterly earnings trend showing sequential and year-over-year growth. Identifies acceleration/deceleration in business momentum. Critical for growth stocks.'
		},
		getSegmentPerformance: {
			name: 'Get Segment Performance',
			description: 'Get business segment performance showing revenue, profit, margins by division. Identifies which business units are driving growth vs dragging down results.'
		},
		getMacroTrade: {
			name: 'Get Macro Trade',
			description: 'Query foreign trade data including import/export value, trade balance, etc.'
		},
		getMacroSocialFinancing: {
			name: 'Get Macro Social Financing',
			description: 'Query total social financing data reflecting overall financing scale and structure in the economy.'
		},
		getMacroForexReserve: {
			name: 'Get Macro Forex Reserve',
			description: 'Query foreign exchange reserve data reflecting external payment capacity and monetary policy space.'
		},
		getAnalystConsensus: {
			name: 'Get Analyst Consensus',
			description: 'Query analyst consensus ratings (buy/hold/sell) and target prices for stocks.'
		},
		getAnalystRatingChanges: {
			name: 'Get Analyst Rating Changes',
			description: 'Query analyst rating change records including upgrades and downgrades.'
		},
		getInsiderTradingSentiment: {
			name: 'Get Insider Trading Sentiment',
			description: 'Analyze insider trading sentiment based on executive and director trading activity.'
		},
		getFundHoldingsSentiment: {
			name: 'Get Fund Holdings Sentiment',
			description: 'Analyze fund holdings sentiment based on institutional position changes.'
		},
		getInstitutionalResearchCalendar: {
			name: 'Get Institutional Research Calendar',
			description: 'Query institutional research report publication schedule and coverage.'
		},
		getMediaCoverageAnalysis: {
			name: 'Get Media Coverage Analysis',
			description: 'Analyze media coverage frequency and sentiment for stocks or industries.'
		},
		getSocialMediaBuzz: {
			name: 'Get Social Media Buzz',
			description: 'Monitor social media discussion heat and sentiment for stocks or topics.'
		},
		getNewsHeatRanking: {
			name: 'Get News Heat Ranking',
			description: 'Query news heat rankings showing most discussed stocks or sectors.'
		},
		getStockSentimentIndex: {
			name: 'Get Stock Sentiment Index',
			description: 'Query comprehensive stock sentiment index synthesizing multiple alternative data sources.'
		},
		getRegulatoryFilingsSentiment: {
			name: 'Get Regulatory Filings Sentiment',
			description: 'Analyze sentiment from regulatory filings (prospectuses, shareholder letters, etc.).'
		},
		getResearchReportStats: {
			name: 'Get Research Report Stats',
			description: 'Query research report publication statistics including frequency, rating distribution, etc.'
		},
		getShortInterestTrends: {
			name: 'Get Short Interest Trends',
			description: 'Query short interest data and trends reflecting market short sentiment.'
		},
	getLprRate: {
		name: 'Get LPR Rate',
		description: 'Get LPR (Loan Prime Rate) including 1-year and 5-year rates'
	},
	getAbsSecurities: {
		name: 'Get ABS Securities',
		description: 'Get asset-backed securities (ABS) data including corporate ABS and credit ABS'
	},
};
