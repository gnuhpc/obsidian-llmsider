/**
 * Stock market tools
 */

export const zhStockTools = {


	getStockAShareHist: {
		name: '获取A股历史数据',
		description: '获取A股股票的历史价格数据。'
	},


	getMarketQuote: {
		name: '获取市场行情',
		description: '获取股票、指数和其他工具的实时市场行情。'
	},


	searchMarketSymbol: {
		name: '搜索市场代码',
		description: '通过名称或代码搜索股票代码。'
	},


	getUSStockName: {
		name: '获取美股名称',
		description: '通过代码获取美股股票名称。'
	},


	getMarketOverview: {
		name: '获取市场概览',
		description: '获取市场状态的总体概览。'
	},


	getIndustryBoard: {
		name: '获取行业板块',
		description: '获取行业板块的表现数据。'
	},


	getConceptBoard: {
		name: '获取概念板块',
		description: '获取概念板块的表现数据。'
	},


	getBoardStocks: {
		name: '获取板块成分股',
		description: '获取特定板块或行业的成分股列表。'
	},


	getLimitBoard: {
		name: '获取涨跌停板',
		description: '获取触及涨跌停限制的股票数据。'
	},


	getLimitUpPool: {
		name: '获取涨停池',
		description: '获取触及涨停板的股票池。'
	},


	getLimitDownPool: {
		name: '获取跌停池',
		description: '获取触及跌停板的股票池。'
	},


	getBoardAnomaly: {
		name: '获取板块异动',
		description: '检测板块表现的异常情况。'
	},


	getStockHotRank: {
		name: '获取股票热度排行',
		description: '获取热门股票的排名。'
	},


	getHotUpRank: {
		name: '获取涨幅排行',
		description: '获取涨幅最高的股票排名。'
	},


	getDragonTigerList: {
		name: '获取龙虎榜',
		description: '获取龙虎榜数据（每日涨跌幅前列及机构动向）。'
	},


	getDragonTigerListAdvanced: {
		name: '获取龙虎榜 (高级)',
		description: '获取详细的龙虎榜数据。'
	},


	getTradingHeatRankingLbk: {
		name: '获取交易热度排行',
		description: '按交易热度/活跃度排名的股票列表。'
	},


	getFinancialStatements: {
		name: '获取财务报表',
		description: '获取详细的财务报表（利润表、资产负债表、现金流量表）。'
	},


	getFinancialSummary: {
		name: '获取财务摘要',
		description: '获取关键财务指标的摘要。'
	},


	getDividend: {
		name: '获取分红信息',
		description: '获取分红历史和详情。'
	},


	getShareBuyback: {
		name: '获取股份回购',
		description: '获取股份回购计划的信息。'
	},


	getExecutiveHoldingChange: {
		name: '获取高管持股变动',
		description: '获取公司高管持股变动的数据。'
	},


	getShareholderChange: {
		name: '获取股东变动',
		description: '获取主要股东变动的数据。'
	},


	getRestrictedShareUnlock: {
		name: '获取限售股解禁',
		description: '获取限售股解禁上市的时间表。'
	},


	getCompanyPledgeRatio: {
		name: '获取公司质押比例',
		description: '获取公司股份质押的比例。'
	},


	getEquityPledgeProfile: {
		name: '获取股权质押概况',
		description: '获取股权质押的概况信息。'
	},


	getNewStockInfo: {
		name: '获取新股信息',
		description: '获取新上市股票的信息。'
	},


	getNewStockFirstDay: {
		name: '获取新股首日表现',
		description: '获取新股上市首日的表现数据。'
	},


	getIpoSubscription: {
		name: '获取IPO申购',
		description: '获取IPO申购详情。'
	},


	getIPOSubscriptionList: {
		name: '获取IPO申购列表',
		description: '获取即将进行申购的IPO列表。'
	},


	getIPOSubscriptionData: {
		name: '获取IPO申购数据',
		description: '获取IPO申购的详细数据。'
	},


	getIPOBenefitStocks: {
		name: '获取IPO受益股',
		description: '获取受益于新股IPO的影子股。'
	},


	getIPOProfitRate: {
		name: '获取IPO收益率',
		description: '获取IPO的历史收益率数据。'
	},


	getIPOAuditBJ: {
		name: '获取IPO审核 (北交所)',
		description: '获取北京证券交易所的IPO审核状态。'
	},


	getIPOAuditCYB: {
		name: '获取IPO审核 (创业板)',
		description: '获取创业板的IPO审核状态。'
	},


	getIPOAuditKCB: {
		name: '获取IPO审核 (科创板)',
		description: '获取科创板的IPO审核状态。'
	},


	getMarketMoneyFlow: {
		name: '获取市场资金流向',
		description: '获取整体市场的资金流向数据。'
	},


	getMarketFundFlow: {
		name: '获取市场资金流',
		description: '获取更广泛市场的资金流向数据。'
	},


	getIndividualFundFlow: {
		name: '获取个股资金流向',
		description: '获取个股的资金流向数据。'
	},


	getStockFundFlowRank: {
		name: '获取个股资金流排名',
		description: '按资金净流入排名的股票列表。'
	},


	getSectorFundFlowRank: {
		name: '获取板块资金流排名',
		description: '按资金净流入排名的板块列表。'
	},


	getHSGTFundFlow: {
		name: '获取沪深港通资金流',
		description: '获取沪深港通（北向/南向）的资金流向数据。'
	},


	getHSGTHoldings: {
		name: '获取沪深港通持仓',
		description: '获取沪深港通的持仓数据。'
	},


	getStockTickData: {
		name: '获取股票Tick数据',
		description: '获取Tick级别的交易数据。'
	},


	getIntradayMinuteData: {
		name: '获取分时数据',
		description: '获取分钟级别的分时交易数据。'
	},


	getOrderBookLevel2: {
		name: '获取Level 2盘口',
		description: '获取Level 2深度盘口数据。'
	},


	getOrderBookLevel2Full: {
		name: '获取完整Level 2盘口',
		description: '获取完整的Level 2深度盘口数据。'
	},


	getTransactionStream: {
		name: '获取逐笔交易',
		description: '获取实时的逐笔交易流。'
	},


	getLargeOrderMonitor: {
		name: '获取大单监控',
		description: '监控市场中的大额订单。'
	},


	getMarketSnapshot: {
		name: '获取市场快照',
		description: '获取当前市场的快照数据。'
	},


	getMarketBreadth: {
		name: '获取市场广度',
		description: '获取市场广度指标（上涨/下跌家数）。'
	},


	getMarginTrading: {
		name: '获取融资融券',
		description: '获取融资融券数据。'
	},


	getMarginTradingDetail: {
		name: '获取融资融券详情',
		description: '获取详细的融资融券数据。'
	},


	getMarginTradingSummarySSE: {
		name: '获取融资融券汇总 (上交所)',
		description: '获取上海证券交易所的融资融券汇总数据。'
	},


	getBlockTrade: {
		name: '获取大宗交易',
		description: '获取大宗交易数据。'
	},


	getBlockTradeDetails: {
		name: '获取大宗交易详情',
		description: '获取详细的大宗交易数据。'
	},


	getAuctionData: {
		name: '获取集合竞价数据',
		description: '获取集合竞价阶段的数据。'
	},


	getTechnicalPatternRecognition: {
		name: '获取技术形态识别',
		description: '识别股票走势图中的技术形态。'
	},


	getMomentumIndicators: {
		name: '获取动量指标',
		description: '获取股票的动量指标。'
	},


	getMeanReversionSignals: {
		name: '获取均值回归信号',
		description: '获取均值回归交易信号。'
	},


	getCorrelationMatrix: {
		name: '获取相关性矩阵',
		description: '获取一组股票的相关性矩阵。'
	},


	getPairTradingOpportunities: {
		name: '获取配对交易机会',
		description: '识别潜在的配对交易机会。'
	},


	getStockNewHigh: {
		name: '获取创新高股票',
		description: '获取创出新高的股票列表。'
	},


	getStockNewLow: {
		name: '获取创新低股票',
		description: '获取创出新低的股票列表。'
	},


	getContinuousRise: {
		name: '获取连涨股票',
		description: '获取价格连续上涨的股票。'
	},


	getContinuousFall: {
		name: '获取连跌股票',
		description: '获取价格连续下跌的股票。'
	},


	getContinuousVolume: {
		name: '获取持续放量股票',
		description: '获取成交量持续活跃的股票。'
	},


	getContinuousVolumeRise: {
		name: '获取量增价涨股票',
		description: '获取成交量持续增加的股票。'
	},


	getContinuousVolumeFall: {
		name: '获取量减价跌股票',
		description: '获取成交量持续减少的股票。'
	},


	getContinuousVolumeShrink: {
		name: '获取持续缩量股票',
		description: '获取成交量持续萎缩的股票。'
	},


	getVolumePriceRise: {
		name: '获取量价齐升股票',
		description: '获取成交量和价格同时上涨的股票。'
	},


	getVolumePriceFall: {
		name: '获取量价齐跌股票',
		description: '获取成交量和价格同时下跌的股票。'
	},


	getStockScreening: {
		name: '获取选股结果',
		description: '根据多种条件筛选股票。'
	},


	getBacktestingResults: {
		name: '获取回测结果',
		description: '获取策略回测的结果。'
	},


	getResearchReports: {
		name: '获取研报',
		description: '获取股票的研究报告。'
	},


	getResearchReportStats: {
		name: '获取研报统计',
		description: '获取研究报告的统计数据。'
	},


	getInstitutionResearchStats: {
		name: '获取机构调研统计',
		description: '获取机构调研的统计数据。'
	},


	getStockRankingMultiMetric: {
		name: '获取多指标排名',
		description: '基于多个指标对股票进行排名。'
	},


	getStockPanoramaLBK: {
		name: '获取股票全景',
		description: '获取股票的全景数据视图。'
	},


	getBatchStockFieldsLBK: {
		name: '获取批量股票字段',
		description: '获取一批股票的多个字段数据。'
	},


	compareStocksPanoramaLBK: {
		name: '对比股票全景',
		description: '对比多只股票的全景数据。'
	},


	getBatchStockQuotesLbk: {
		name: '获取批量股票行情',
		description: '获取一批股票的行情数据。'
	},


	getEventsByTargetsLbk: {
		name: '获取标的事件',
		description: '获取特定标的的事件信息。'
	},


	getFinanceCalendarLbk: {
		name: '获取财经日历',
		description: '获取财经日历事件。'
	},


	getGlobalIndexMapLbk: {
		name: '获取全球指数地图',
		description: '获取全球指数的地图数据。'
	},


	getMacroDataForMarketLbk: {
		name: '获取市场宏观数据',
		description: '获取与市场相关的宏观经济数据。'
	},


	getMarketActivitiesLbk: {
		name: '获取市场活动',
		description: '获取市场活动数据。'
	},


	getMarketAlertEventsLbk: {
		name: '获取市场预警事件',
		description: '获取市场的预警事件。'
	},


	getMarketIndicesQuotesLbk: {
		name: '获取市场指数行情',
		description: '获取市场指数的行情数据。'
	},


	getMarketIndicesSampleTimesharesLbk: {
		name: '获取指数分时样本',
		description: '获取市场指数的分时样本数据。'
	},


	getMarketMacroDataLbk: {
		name: '获取市场宏观数据',
		description: '获取市场的宏观数据。'
	},


	getSecurityViewsLbk: {
		name: '获取证券观点',
		description: '获取关于证券的观点和分析。'
	},


	getSocialTopicsLbk: {
		name: '获取社交话题',
		description: '获取与股票相关的热门社交话题。'
	},


	getStockCompanyActionsLbk: {
		name: '获取公司行动',
		description: '获取股票的公司行动（如分红、拆股等）。'
	},


	getStockCompanyProfessionalsLbk: {
		name: '获取公司高管',
		description: '获取公司高管和专业人士的信息。'
	},


	getStockEventsLbk: {
		name: '获取股票事件',
		description: '获取股票相关的事件。'
	},


	getStockIndustryRankingLbk: {
		name: '获取行业排名',
		description: '获取股票行业的排名。'
	},


	getStockNoticesLbk: {
		name: '获取股票公告',
		description: '获取股票的官方公告。'
	},


	getStockPinnedActivitiesLbk: {
		name: '获取置顶活动',
		description: '获取股票的置顶活动信息。'
	},


	getStockRatingsLbk: {
		name: '获取股票评级',
		description: '获取股票的评级数据。'
	},


	getStockTimesharesLbk: {
		name: '获取股票分时',
		description: '获取股票的分时数据。'
	},


	getCCTVNews: {
		name: '获取央视财经新闻',
		description: '获取央视财经频道的新闻。'
	},


	getFinancialNews: {
		name: '获取财经新闻',
		description: '获取综合财经新闻。'
	},


	getStockPopularity: {
		name: '获取股票人气',
		description: '获取股票的人气指标。'
	},


	getNewsSentiment: {
		name: '获取新闻舆情',
		description: '获取新闻的舆情分析。'
	},


	getWeiboSentiment: {
		name: '获取微博舆情',
		description: '获取微博的舆情分析。'
	},


	getStockAnalysisMarketNews: {
		name: '获取个股分析市场新闻',
		description: '获取用于个股分析的市场新闻。'
	},


	getStockAnalysisAllStocksNews: {
		name: '获取全市场个股新闻',
		description: '获取所有股票的新闻用于分析。'
	},


	getStockAnalysisPressReleases: {
		name: '获取个股新闻稿',
		description: '获取个股的新闻稿用于分析。'
	},


	getStockMentionTrends: {
		name: '获取个股提及趋势',
		description: '获取个股在媒体/社交网络中的提及趋势。'
	},


	getTimedate: {
		name: '获取时间日期',
		description: '获取当前的时间和日期。'
	},


	listFileDirectory: {
		name: '列出文件目录',
		description: '列出目录中的文件。'
	},


	processFrontmatter: {
		name: '处理Frontmatter',
		description: '处理文件中的Frontmatter信息。'
	},


	searchGitHubTopics: {
		name: '搜索GitHub话题',
		description: '在GitHub上搜索话题。'
	},


	searchProductHunt: {
		name: '搜索Product Hunt',
		description: '在Product Hunt上搜索产品。'
	},


	tickerTickAdvancedQuery: {
		name: 'TickerTick高级查询',
		description: '在TickerTick上执行高级查询。'
	},


	tickertickGetNewsBySource: {
		name: 'TickerTick按来源获取新闻',
		description: '通过TickerTick获取特定来源的新闻。'
	},


	tickertickGetNewsByType: {
		name: 'TickerTick按类型获取新闻',
		description: '通过TickerTick获取特定类型的新闻。'
	},


	tickertickGetSECFilings: {
		name: 'TickerTick获取SEC文件',
		description: '通过TickerTick获取SEC备案文件。'
	},

	tickertickGetTickerNews: {
		name: 'TickerTick获取个股新闻',
		description: '通过TickerTick获取特定股票的新闻。'
	},


	tickertickSearchByEntity: {
		name: 'TickerTick按实体搜索',
		description: '在TickerTick上搜索实体。'
	},


	tickertickSearchTickers: {
		name: 'TickerTick搜索代码',
		description: '在TickerTick上搜索股票代码。'
	},


	stockAAllPb: {
		name: 'A股整体市净率',
		description: '获取A股市场的整体市净率（PB）。'
	},


	stockATtmLyr: {
		name: 'A股TTM/LYR市盈率',
		description: '获取A股市场的TTM/LYR市盈率。'
	},


	stockCsiIndexDaily: {
		name: '中证指数日行情',
		description: '获取中证指数的日行情数据。'
	},


	stockHkDaily: {
		name: '港股日行情',
		description: '获取港股的日行情数据。'
	},


	stockHotFollowXq: {
		name: '雪球热股关注',
		description: '获取雪球上最受关注的股票。'
	},


	stockHotSearchBaidu: {
		name: '百度热搜股票',
		description: '获取百度上搜索热度最高的股票。'
	},


	stockHotTweetXq: {
		name: '雪球热帖股票',
		description: '获取雪球上讨论最热烈的股票。'
	},


	stockInnerTradeXq: {
		name: '雪球内部交易',
		description: '从雪球获取内部交易数据。'
	},


	stockMarginAccountInfo: {
		name: '融资融券账户信息',
		description: '获取融资融券账户信息。'
	},


	stockSzIndexDaily: {
		name: '深证指数日行情',
		description: '获取深证指数的日行情数据。'
	},


	stockUsDaily: {
		name: '美股日行情',
		description: '获取美股的日行情数据。'
	},


	stockZhAhSpot: {
		name: 'A/H股实时行情',
		description: '获取A/H股的实时行情数据。'
	},


	stockZhIndexDaily: {
		name: '中国指数日行情',
		description: '获取中国指数的日行情数据。'
	},


	stockZhKcbDaily: {
		name: '科创板日行情',
		description: '获取科创板股票的日行情数据。'
	},


	stockZhKcbSpot: {
		name: '科创板实时行情',
		description: '获取科创板股票的实时行情数据。'
	},

	getStockHKDaily: {
		name: '获取港股日线数据',
		description: '获取香港股票日线行情数据'
	},


	getStockUSDaily: {
		name: '获取美股日线数据',
		description: '获取美国股票日线行情数据'
	},


	getStockAHSpot: {
		name: '获取A+H股实时行情',
		description: '获取A股和H股同时上市的股票实时行情'
	},


	getStockKCBSpot: {
		name: '获取科创板实时行情',
		description: '获取科创板股票实时行情'
	},


	getStockKCBDaily: {
		name: '获取科创板日线数据',
		description: '获取科创板股票日线数据'
	},
	compareStocksPanorama: {
		name: '对比股票全景图',
		description: '对比多只股票的综合数据。'
	},
	getBatchStockFields: {
		name: '批量获取股票字段',
		description: '批量获取多只股票的特定字段。'
	},
	getBatchStockQuotes: {
		name: '批量获取股票行情',
		description: '批量获取多只股票行情。'
	},
	getEventsByTargets: {
		name: '按标的获取事件',
		description: '按目标证券筛选获取事件。'
	},
	getFinanceCalendar: {
		name: '获取财经日历',
		description: '获取财经事件日历。'
	},
	getGlobalIndexMap: {
		name: '获取全球指数地图',
		description: '获取全球股市指数地图。'
	},
	getMacroDataForMarket: {
		name: '获取市场宏观数据',
		description: '获取用于市场分析的宏观经济数据。'
	},
	getMarketActivities: {
		name: '获取市场活动',
		description: '获取市场交易活动和事件。'
	},
	getMarketAlertEvents: {
		name: '获取市场预警事件',
		description: '获取市场预警和警告事件。'
	},
	getMarketIndicesQuotes: {
		name: '获取市场指数行情',
		description: '获取市场指数行情和数据。'
	},
	getMarketIndicesSampleTimeshares: {
		name: '获取市场指数分时样本',
		description: '获取市场指数分时样本数据。'
	},
	getMarketMacroData: {
		name: '获取市场宏观数据',
		description: '获取市场宏观经济数据。'
	},
	getSecurityViews: {
		name: '获取证券观点',
		description: '获取证券分析观点和视角。'
	},
	getSocialTopics: {
		name: '获取社交话题',
		description: '获取与股票相关的社交媒体热门话题。'
	},
	getStockCompanyActions: {
		name: '获取公司行动',
		description: '获取公司行动（拆股、合并等）。'
	},
	getStockCompanyProfessionals: {
		name: '获取公司管理团队',
		description: '获取公司管理和专业团队信息。'
	},
	getStockEvents: {
		name: '获取股票事件',
		description: '获取股票相关事件和公告。'
	},
	getStockIndustryRanking: {
		name: '获取行业排名',
		description: '获取按行业板块的股票排名。'
	},
	getStockNotices: {
		name: '获取股票公告',
		description: '获取股票公告和通知。'
	},
	getStockPanorama: {
		name: '获取股票全景图',
		description: '获取全面的股票概览数据。'
	},
	getStockPinnedActivities: {
		name: '获取置顶股票活动',
		description: '获取重要的置顶股票活动。'
	},
	getStockRatings: {
		name: '获取股票评级',
		description: '获取分析师股票评级和建议。'
	},
	getStockTimeshares: {
		name: '获取股票分时数据',
		description: '获取股票盘中分时数据。'
	},
	getTradingHeatRanking: {
		name: '获取交易热度排名',
		description: '获取按交易热度/人气排名的股票。'
	},
};
