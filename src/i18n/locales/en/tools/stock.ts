/**
 * Stock market tools
 */

export const enStockTools = {
	// Basic Stock Info
	getStockAShareHist: {
		name: 'Get A-Share History',
		description: 'Get historical price data for A-Share stocks.'
	},
	getMarketQuote: {
		name: 'Get Market Quote',
		description: 'Get real-time market quotes for stocks, indices, and other instruments.'
	},
	searchMarketSymbol: {
		name: 'Search Market Symbol',
		description: 'Search for stock symbols by name or code.'
	},
	getUsStockName: {
		name: 'Get US Stock Name',
		description: 'Get the name of a US stock from its symbol.'
	},
	
	// Market Overview & Boards
	getMarketOverview: {
		name: 'Get Market Overview',
		description: 'Get a general overview of the market status.'
	},
	getIndustryBoard: {
		name: 'Get Industry Board',
		description: 'Get performance data for industry sectors.'
	},
	getConceptBoard: {
		name: 'Get Concept Board',
		description: 'Get performance data for concept boards.'
	},
	getBoardStocks: {
		name: 'Get Board Stocks',
		description: 'Get the list of stocks in a specific board or sector.'
	},
	getLimitBoard: {
		name: 'Get Limit Board',
		description: 'Get data on stocks hitting price limits (up/down).'
	},
	getLimitUpPool: {
		name: 'Get Limit Up Pool',
		description: 'Get the pool of stocks that hit the upper price limit.'
	},
	getLimitDownPool: {
		name: 'Get Limit Down Pool',
		description: 'Get the pool of stocks that hit the lower price limit.'
	},
	getBoardAnomaly: {
		name: 'Get Board Anomaly',
		description: 'Detect anomalies in board performance.'
	},
	
	// Rankings & Hot Lists
	getStockHotRank: {
		name: 'Get Stock Hot Rank',
		description: 'Get ranking of popular stocks.'
	},
	getHotUpRank: {
		name: 'Get Hot Up Rank',
		description: 'Get ranking of stocks with highest price increases.'
	},
	getDragonTigerList: {
		name: 'Get Dragon Tiger List',
		description: 'Get the Dragon Tiger List (daily top gainers/losers and institutional activity).'
	},
	getDragonTigerListAdvanced: {
		name: 'Get Dragon Tiger List (Advanced)',
		description: 'Get detailed Dragon Tiger List data.'
	},
	getTradingHeatRankingLbk: {
		name: 'Get Trading Heat Ranking',
		description: 'Get ranking of stocks by trading heat/activity.'
	},
	
	// Financials & Fundamentals
	getFinancialStatements: {
		name: 'Get Financial Statements',
		description: 'Get detailed financial statements (income, balance sheet, cash flow).'
	},
	getFinancialSummary: {
		name: 'Get Financial Summary',
		description: 'Get a summary of key financial metrics.'
	},
	getDividend: {
		name: 'Get Dividend',
		description: 'Get dividend history and details.'
	},
	getShareBuyback: {
		name: 'Get Share Buyback',
		description: 'Get information on share buyback programs.'
	},
	getExecutiveHoldingChange: {
		name: 'Get Executive Holding Change',
		description: 'Get data on changes in shareholdings by company executives.'
	},
	getShareholderChange: {
		name: 'Get Shareholder Change',
		description: 'Get data on changes in major shareholders.'
	},
	getRestrictedShareUnlock: {
		name: 'Get Restricted Share Unlock',
		description: 'Get schedule of restricted shares becoming tradable.'
	},
	getCompanyPledgeRatio: {
		name: 'Get Company Pledge Ratio',
		description: 'Get the ratio of shares pledged by the company.'
	},
	getEquityPledgeProfile: {
		name: 'Get Equity Pledge Profile',
		description: 'Get the profile of equity pledges.'
	},
	
	// IPO
	getNewStockInfo: {
		name: 'Get New Stock Info',
		description: 'Get information on newly listed stocks.'
	},
	getNewStockFirstDay: {
		name: 'Get New Stock First Day',
		description: 'Get performance data for new stocks on their first trading day.'
	},
	getIpoSubscription: {
		name: 'Get IPO Subscription',
		description: 'Get IPO subscription details.'
	},
	getIpoSubscriptionList: {
		name: 'Get IPO Subscription List',
		description: 'Get a list of upcoming IPOs available for subscription.'
	},
	getIpoSubscriptionData: {
		name: 'Get IPO Subscription Data',
		description: 'Get detailed data on IPO subscriptions.'
	},
	getIpoBenefitStocks: {
		name: 'Get IPO Benefit Stocks',
		description: 'Get stocks that benefit from new IPOs (shadow stocks).'
	},
	getIpoProfitRate: {
		name: 'Get IPO Profit Rate',
		description: 'Get historical profit rates for IPOs.'
	},
	getIpoAuditBj: {
		name: 'Get IPO Audit (Beijing)',
		description: 'Get IPO audit status for Beijing Stock Exchange.'
	},
	getIpoAuditCyb: {
		name: 'Get IPO Audit (ChiNext)',
		description: 'Get IPO audit status for ChiNext board.'
	},
	getIpoAuditKcb: {
		name: 'Get IPO Audit (STAR Market)',
		description: 'Get IPO audit status for STAR Market.'
	},
	
	// Funds Flow
	getMarketMoneyFlow: {
		name: 'Get Market Money Flow',
		description: 'Get overall market money flow data.'
	},
	getMarketFundFlow: {
		name: 'Get Market Fund Flow',
		description: 'Get fund flow data for the broader market.'
	},
	getIndividualFundFlow: {
		name: 'Get Individual Fund Flow',
		description: 'Get fund flow data for individual stocks.'
	},
	getStockFundFlowRank: {
		name: 'Get Stock Fund Flow Rank',
		description: 'Get ranking of stocks by net fund inflow.'
	},
	getSectorFundFlowRank: {
		name: 'Get Sector Fund Flow Rank',
		description: 'Get ranking of sectors by net fund inflow.'
	},
	getHSGTFundFlow: {
		name: 'Get HSGT Fund Flow',
		description: 'Get fund flow data for Hong Kong-Shanghai/Shenzhen Connect (Northbound/Southbound).'
	},
	getHSGTHoldings: {
		name: 'Get HSGT Holdings',
		description: 'Get holdings data for Hong Kong-Shanghai/Shenzhen Connect.'
	},
	
	// Technical Analysis & Market Data
	getStockTickData: {
		name: 'Get Stock Tick Data',
		description: 'Get tick-level trading data.'
	},
	getIntradayMinuteData: {
		name: 'Get Intraday Minute Data',
		description: 'Get minute-by-minute intraday trading data.'
	},

	getOrderBookLevel2: {
		name: 'Get Order Book Level 2',
		description: 'Get Level 2 order book data.'
	},
	getOrderBookLevel2Full: {
		name: 'Get Order Book Level 2 Full',
		description: 'Get full Level 2 order book data.'
	},
	getTransactionStream: {
		name: 'Get Transaction Stream',
		description: 'Get real-time stream of transactions.'
	},
	getLargeOrderMonitor: {
		name: 'Get Large Order Monitor',
		description: 'Monitor large orders in the market.'
	},
	getMarketSnapshot: {
		name: 'Get Market Snapshot',
		description: 'Get a snapshot of current market data.'
	},
	getMarketBreadth: {
		name: 'Get Market Breadth',
		description: 'Get market breadth indicators (advancers/decliners).'
	},
	getMarginTrading: {
		name: 'Get Margin Trading',
		description: 'Get margin trading data.'
	},
	getMarginTradingDetail: {
		name: 'Get Margin Trading Detail',
		description: 'Get detailed margin trading data.'
	},
	getMarginTradingSummarySse: {
		name: 'Get Margin Trading Summary (SSE)',
		description: 'Get margin trading summary for Shanghai Stock Exchange.'
	},
	getBlockTrade: {
		name: 'Get Block Trade',
		description: 'Get block trade data.'
	},
	getBlockTradeDetails: {
		name: 'Get Block Trade Details',
		description: 'Get detailed block trade data.'
	},
	getAuctionData: {
		name: 'Get Auction Data',
		description: 'Get call auction data.'
	},
	
	// Technical Indicators
	getTechnicalPatternRecognition: {
		name: 'Get Technical Pattern Recognition',
		description: 'Recognize technical patterns in stock charts.'
	},
	getMomentumIndicators: {
		name: 'Get Momentum Indicators',
		description: 'Get momentum indicators for stocks.'
	},
	getMeanReversionSignals: {
		name: 'Get Mean Reversion Signals',
		description: 'Get mean reversion signals.'
	},
	getCorrelationMatrix: {
		name: 'Get Correlation Matrix',
		description: 'Get correlation matrix for a set of stocks.'
	},
	getPairTradingOpportunities: {
		name: 'Get Pair Trading Opportunities',
		description: 'Identify potential pair trading opportunities.'
	},
	getStockNewHigh: {
		name: 'Get Stock New High',
		description: 'Get stocks hitting new highs.'
	},
	getStockNewLow: {
		name: 'Get Stock New Low',
		description: 'Get stocks hitting new lows.'
	},
	getContinuousRise: {
		name: 'Get Continuous Rise',
		description: 'Get stocks with continuous price rise.'
	},
	getContinuousFall: {
		name: 'Get Continuous Fall',
		description: 'Get stocks with continuous price fall.'
	},
	getContinuousVolume: {
		name: 'Get Continuous Volume',
		description: 'Get stocks with continuous volume activity.'
	},
	getContinuousVolumeRise: {
		name: 'Get Continuous Volume Rise',
		description: 'Get stocks with continuous volume increase.'
	},
	getContinuousVolumeFall: {
		name: 'Get Continuous Volume Fall',
		description: 'Get stocks with continuous volume decrease.'
	},
	getContinuousVolumeShrink: {
		name: 'Get Continuous Volume Shrink',
		description: 'Get stocks with continuous volume shrinkage.'
	},
	getVolumePriceRise: {
		name: 'Get Volume Price Rise',
		description: 'Get stocks with both volume and price rise.'
	},
	getVolumePriceFall: {
		name: 'Get Volume Price Fall',
		description: 'Get stocks with both volume and price fall.'
	},
	
	// Analysis & Research
	getStockScreening: {
		name: 'Get Stock Screening',
		description: 'Screen stocks based on various criteria.'
	},
	getBacktestingResults: {
		name: 'Get Backtesting Results',
		description: 'Get results of backtesting strategies.'
	},
	getResearchReports: {
		name: 'Get Research Reports',
		description: 'Get research reports for stocks.'
	},
	getResearchReportStats: {
		name: 'Get Research Report Stats',
		description: 'Get statistics on research reports.'
	},
	getInstitutionResearchStats: {
		name: 'Get Institution Research Stats',
		description: 'Get statistics on institutional research.'
	},
	getStockRankingMultiMetric: {
		name: 'Get Stock Ranking (Multi-Metric)',
		description: 'Rank stocks based on multiple metrics.'
	},
	
	// LBK Specific Tools (Longport/Longbridge?)
	getStockPanoramaLBK: {
		name: 'Get Stock Panorama',
		description: 'Get a panoramic view of stock data.'
	},
	getBatchStockFieldsLBK: {
		name: 'Get Batch Stock Fields',
		description: 'Get multiple fields for a batch of stocks.'
	},
	compareStocksPanoramaLBK: {
		name: 'Compare Stocks Panorama',
		description: 'Compare panoramic data for multiple stocks.'
	},
	getBatchStockQuotesLbk: {
		name: 'Get Batch Stock Quotes',
		description: 'Get quotes for a batch of stocks.'
	},
	getEventsByTargetsLbk: {
		name: 'Get Events by Targets',
		description: 'Get events for specific targets.'
	},
	getFinanceCalendarLbk: {
		name: 'Get Finance Calendar',
		description: 'Get financial calendar events.'
	},
	getGlobalIndexMapLbk: {
		name: 'Get Global Index Map',
		description: 'Get a map of global indices.'
	},
	getMacroDataForMarketLbk: {
		name: 'Get Macro Data for Market',
		description: 'Get macro economic data relevant to the market.'
	},
	getMarketActivitiesLbk: {
		name: 'Get Market Activities',
		description: 'Get market activity data.'
	},
	getMarketAlertEventsLbk: {
		name: 'Get Market Alert Events',
		description: 'Get market alert events.'
	},
	getMarketIndicesQuotesLbk: {
		name: 'Get Market Indices Quotes',
		description: 'Get quotes for market indices.'
	},
	getMarketIndicesSampleTimesharesLbk: {
		name: 'Get Market Indices Sample Timeshares',
		description: 'Get sample timeshare data for market indices.'
	},
	getMarketMacroDataLbk: {
		name: 'Get Market Macro Data',
		description: 'Get macro data for the market.'
	},
	getSecurityViewsLbk: {
		name: 'Get Security Views',
		description: 'Get views/analysis on securities.'
	},
	getSocialTopicsLbk: {
		name: 'Get Social Topics',
		description: 'Get trending social topics related to stocks.'
	},
	getStockCompanyActionsLbk: {
		name: 'Get Stock Company Actions',
		description: 'Get corporate actions for stocks.'
	},
	getStockCompanyProfessionalsLbk: {
		name: 'Get Stock Company Professionals',
		description: 'Get information on company professionals/executives.'
	},
	getStockEventsLbk: {
		name: 'Get Stock Events',
		description: 'Get events related to stocks.'
	},
	getStockIndustryRankingLbk: {
		name: 'Get Stock Industry Ranking',
		description: 'Get ranking of stock industries.'
	},
	getStockNoticesLbk: {
		name: 'Get Stock Notices',
		description: 'Get official notices for stocks.'
	},
	getStockPinnedActivitiesLbk: {
		name: 'Get Stock Pinned Activities',
		description: 'Get pinned activities for stocks.'
	},
	getStockRatingsLbk: {
		name: 'Get Stock Ratings',
		description: 'Get ratings for stocks.'
	},
	getStockTimesharesLbk: {
		name: 'Get Stock Timeshares',
		description: 'Get timeshare data for stocks.'
	},
	
	// News & Sentiment
	getCCTVNews: {
		name: 'Get CCTV News',
		description: 'Get news from CCTV Finance.'
	},
	getFinancialNews: {
		name: 'Get Financial News',
		description: 'Get general financial news.'
	},
	getStockPopularity: {
		name: 'Get Stock Popularity',
		description: 'Get stock popularity metrics.'
	},
	getNewsSentiment: {
		name: 'Get News Sentiment',
		description: 'Get sentiment analysis of news.'
	},
	getWeiboSentiment: {
		name: 'Get Weibo Sentiment',
		description: 'Get sentiment analysis from Weibo.'
	},
	getStockAnalysisMarketNews: {
		name: 'Get Stock Analysis Market News',
		description: 'Get market news for stock analysis.'
	},
	getStockAnalysisAllStocksNews: {
		name: 'Get Stock Analysis All Stocks News',
		description: 'Get news for all stocks for analysis.'
	},
	getStockAnalysisPressReleases: {
		name: 'Get Stock Analysis Press Releases',
		description: 'Get press releases for stock analysis.'
	},
	getStockMentionTrends: {
		name: 'Get Stock Mention Trends',
		description: 'Get trends of stock mentions in media/social.'
	},
	
	// Other/Misc
	getTimedate: {
		name: 'Get Time/Date',
		description: 'Get current time and date.'
	},
	listFileDirectory: {
		name: 'List File Directory',
		description: 'List files in a directory.'
	},
	processFrontmatter: {
		name: 'Process Frontmatter',
		description: 'Process frontmatter in files.'
	},
	searchGithubTopics: {
		name: 'Search GitHub Topics',
		description: 'Search for topics on GitHub.'
	},
	searchProductHunt: {
		name: 'Search Product Hunt',
		description: 'Search for products on Product Hunt.'
	},
	
	// TickerTick
	tickertickAdvancedQuery: {
		name: 'TickerTick Advanced Query',
		description: 'Perform advanced queries on TickerTick.'
	},
	tickertickGetNewsBySource: {
		name: 'TickerTick Get News by Source',
		description: 'Get news from specific sources via TickerTick.'
	},
	tickertickGetNewsByType: {
		name: 'TickerTick Get News by Type',
		description: 'Get news of specific types via TickerTick.'
	},
	tickertickGetSECFilings: {
		name: 'TickerTick Get SEC Filings',
		description: 'Get SEC filings via TickerTick.'
	},
	tickertickGetTickerNews: {
		name: 'TickerTick Get Ticker News',
		description: 'Get news for a specific ticker via TickerTick.'
	},
	tickertickSearchByEntity: {
		name: 'TickerTick Search by Entity',
		description: 'Search for entities on TickerTick.'
	},
	tickertickSearchTickers: {
		name: 'TickerTick Search Tickers',
		description: 'Search for tickers on TickerTick.'
	},
	
	// Legacy/Misc Stock Tools
	stockAAllPb: {
		name: 'Stock A All PB',
		description: 'Get PB ratio for all A-shares.'
	},
	stockATtmLyr: {
		name: 'Stock A TTM/LYR',
		description: 'Get TTM/LYR PE ratios for A-shares.'
	},
	stockCsiIndexDaily: {
		name: 'Stock CSI Index Daily',
		description: 'Get daily data for CSI indices.'
	},
	stockHkDaily: {
		name: 'Stock HK Daily',
		description: 'Get daily data for HK stocks.'
	},
	stockHotFollowXq: {
		name: 'Stock Hot Follow (Xueqiu)',
		description: 'Get most followed stocks on Xueqiu.'
	},
	stockHotSearchBaidu: {
		name: 'Stock Hot Search (Baidu)',
		description: 'Get most searched stocks on Baidu.'
	},
	stockHotTweetXq: {
		name: 'Stock Hot Tweet (Xueqiu)',
		description: 'Get most discussed stocks on Xueqiu.'
	},
	stockInnerTradeXq: {
		name: 'Stock Inner Trade (Xueqiu)',
		description: 'Get inner trade data from Xueqiu.'
	},
	stockMarginAccountInfo: {
		name: 'Stock Margin Account Info',
		description: 'Get margin account info.'
	},
	stockSzIndexDaily: {
		name: 'Stock SZ Index Daily',
		description: 'Get daily data for Shenzhen indices.'
	},
	stockUsDaily: {
		name: 'Stock US Daily',
		description: 'Get daily data for US stocks.'
	},
	stockZhAhSpot: {
		name: 'Stock ZH A/H Spot',
		description: 'Get spot data for A/H shares.'
	},
	stockZhIndexDaily: {
		name: 'Stock ZH Index Daily',
		description: 'Get daily data for Chinese indices.'
	},
	stockZhKcbDaily: {
		name: 'Stock ZH KCB Daily',
		description: 'Get daily data for STAR Market stocks.'
	},
	stockZhKcbSpot: {
		name: 'Stock ZH KCB Spot',
		description: 'Get spot data for STAR Market stocks.'
	},
	compareStocksPanorama: {
		name: 'Compare Stocks Panorama',
		description: 'Compare multiple stocks with comprehensive data.'
	},
	getBatchStockFields: {
		name: 'Get Batch Stock Fields',
		description: 'Get specific fields for multiple stocks.'
	},
	getBatchStockQuotes: {
		name: 'Get Batch Stock Quotes',
		description: 'Get quotes for multiple stocks.'
	},
	getEventsByTargets: {
		name: 'Get Events By Targets',
		description: 'Get events filtered by target securities.'
	},
	getFinanceCalendar: {
		name: 'Get Finance Calendar',
		description: 'Get financial events calendar.'
	},
	getGlobalIndexMap: {
		name: 'Get Global Index Map',
		description: 'Get global stock market indices map.'
	},
	getMacroDataForMarket: {
		name: 'Get Macro Data For Market',
		description: 'Get macroeconomic data for market analysis.'
	},
	getMarketActivities: {
		name: 'Get Market Activities',
		description: 'Get market trading activities and events.'
	},
	getMarketAlertEvents: {
		name: 'Get Market Alert Events',
		description: 'Get market alert and warning events.'
	},
	getMarketIndicesQuotes: {
		name: 'Get Market Indices Quotes',
		description: 'Get market indices quotes and data.'
	},
	getMarketIndicesSampleTimeshares: {
		name: 'Get Market Indices Sample Timeshares',
		description: 'Get market indices sample timeshare data.'
	},
	getMarketMacroData: {
		name: 'Get Market Macro Data',
		description: 'Get market macroeconomic data.'
	},
	getSecurityViews: {
		name: 'Get Security Views',
		description: 'Get security analysis views and perspectives.'
	},
	getSocialTopics: {
		name: 'Get Social Topics',
		description: 'Get social media trending topics related to stocks.'
	},
	getStockCompanyActions: {
		name: 'Get Stock Company Actions',
		description: 'Get corporate actions (splits, mergers, etc.).'
	},
	getStockCompanyProfessionals: {
		name: 'Get Stock Company Professionals',
		description: 'Get company management and professional team info.'
	},
	getStockEvents: {
		name: 'Get Stock Events',
		description: 'Get stock-related events and announcements.'
	},
	getStockIndustryRanking: {
		name: 'Get Stock Industry Ranking',
		description: 'Get stock rankings by industry sector.'
	},
	getStockNotices: {
		name: 'Get Stock Notices',
		description: 'Get stock notices and announcements.'
	},
	getStockPanorama: {
		name: 'Get Stock Panorama',
		description: 'Get comprehensive stock overview data.'
	},
	getStockPinnedActivities: {
		name: 'Get Stock Pinned Activities',
		description: 'Get important pinned stock activities.'
	},
	getStockRatings: {
		name: 'Get Stock Ratings',
		description: 'Get analyst stock ratings and recommendations.'
	},
	getStockTimeshares: {
		name: 'Get Stock Timeshares',
		description: 'Get intraday timeshare data for stocks.'
	},
	getTradingHeatRanking: {
		name: 'Get Trading Heat Ranking',
		description: 'Get stocks ranked by trading heat/popularity.'
	},
};
