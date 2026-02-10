/**
 * News and sentiment tools
 */

export const zhNewsTools = {
	getCCTVNews: {
			name: '获取新闻联播文字稿',
			description: '获取新闻联播文字稿，用于分析政策导向和市场热点。需要日期（YYYYMMDD）。'
		},
getFinancialNews: {
			name: '获取财经新闻',
			description: '获取多来源财经新闻，包括证券时报、财联社、第一财经、经济观察报和21世纪经济报道。可选来源和数量筛选。'
		},
getStockPopularity: {
			name: '获取股票人气榜',
			description: '获取基于关注度、搜索热度等指标的股票人气排行榜。支持市场筛选（全部/沪市/深市）。'
		},
getNewsSentiment: {
			name: '获取新闻情绪指数',
			description: '获取市场新闻情绪指数，用于量化分析市场情绪。可选股票代码，否则返回大盘情绪。'
		},
getWeiboSentiment: {
			name: '获取微博财经情绪',
			description: '获取微博财经情绪指数，反映社交媒体上的市场情绪。'
		},
getResearchReports: {
			name: '获取研究报告',
			description: '获取券商研究报告列表。支持按股票代码和报告类型（公司/行业/宏观/策略）筛选。默认50份报告。'
		},
	getStockAnalysisMarketNews: {
		name: '获取美股市场新闻',
		description: '获取美股市场整体新闻，来自StockAnalysis.com，包括市场动态、分析报告和重要资讯。返回解析后的新闻，包含标题、来源、时间、链接和描述。默认返回20条，可通过limit参数调整。'
	},
	getStockAnalysisAllStocksNews: {
		name: '获取美股个股新闻',
		description: '获取所有美股个股新闻，来自StockAnalysis.com，包括各公司的最新动态和公告。返回解析后的新闻，包含标题、来源、时间、链接和描述。默认返回20条，可通过limit参数调整。'
	},
	getStockAnalysisPressReleases: {
		name: '获取美股公司官方公告',
		description: '获取美股公司官方新闻发布，来自StockAnalysis.com，包括业绩公告、重要声明等官方信息。返回解析后的新闻，包含标题、来源、时间、链接和描述。默认返回20条，可通过limit参数调整。'
	},
	hnSearchStories: {
		name: '搜索 Hacker News 故事',
		description: '通过关键词搜索Hacker News故事。结果按相关性、点数和评论数排序。返回故事标题、URL、作者、点数和评论数。'
	},
	hnSearchByDate: {
		name: '按日期搜索 Hacker News',
		description: '按日期搜索Hacker News故事和评论（最新优先）。适合查找某话题的最新帖子。'
	},
	hnGetFrontPage: {
		name: '获取 Hacker News 首页',
		description: '获取Hacker News当前首页故事。显示HN首页上当前可见的故事。'
	},
	hnGetTopStories: {
		name: '获取 Hacker News 热门故事',
		description: '获取Hacker News热门故事。返回按点数和参与度排序的高评分故事。'
	},
	hnGetItem: {
		name: '获取 Hacker News 项目详情',
		description: '通过ID获取特定Hacker News项目（故事、评论、投票）的详细信息。返回完整内容包括嵌套评论。'
	},
	hnGetUser: {
		name: '获取 Hacker News 用户信息',
		description: '获取Hacker News用户信息，包括karma值、个人介绍和提交历史。'
	},
	hnGetAskStories: {
		name: '获取 Ask HN 故事',
		description: '获取最近的Ask HN故事，用户向社区提问的内容。'
	},
	hnGetShowStories: {
		name: '获取 Show HN 故事',
		description: '获取最近的Show HN故事，用户分享他们的项目、产品或创作。'
	},
	// Yahoo Finance 新闻工具
	getYahooFinanceNewsRSS: {
		name: '获取Yahoo财经RSS新闻',
		description: '获取特定股票代码的Yahoo财经RSS新闻源最新文章。返回新闻标题、链接、发布日期和来源。'
	},
	getYahooFinanceNewsSearch: {
		name: '搜索Yahoo财经新闻',
		description: '使用Yahoo财经搜索API搜索股票代码相关的新闻文章。返回包含标题、链接、发布者和发布时间的新闻。'
	},
	getYahooFinanceTrending: {
		name: '获取Yahoo财经热门股票',
		description: '获取Yahoo财经的热门（最受欢迎/最活跃交易）股票代码。显示当前市场上最热门的股票。'
	},
	getYahooFinanceQuote: {
		name: '获取Yahoo财经行情',
		description: '获取Yahoo财经的综合股票行情数据，包括当前价格、前收盘价、市值、市盈率、52周价格区间、成交量等。'
	},
	getYahooFinanceHistory: {
		name: '获取Yahoo财经历史数据',
		description: '获取Yahoo财经的历史股价数据（OHLCV - 开盘价、最高价、最低价、收盘价、成交量）。支持日线、周线和月线周期。'
	},
	// EverydayNews 每日新闻工具（60秒新闻）
	getLatestEverydayNews: {
		name: '获取最新每日新闻',
		description: '获取最新的每日60秒新闻摘要（中文）。返回当天最重要的新闻事件列表。'
	},
	getEverydayNewsByDate: {
		name: '按日期获取每日新闻',
		description: '获取特定日期的每日60秒新闻摘要。支持2022年6月4日至今的日期。返回中文新闻。'
	},
	getRecentEverydayNews: {
		name: '获取最近每日新闻',
		description: '获取最近N天的每日60秒新闻摘要（1-30天）。按时间顺序返回中文新闻。'
	},
	searchEverydayNews: {
		name: '搜索每日新闻',
		description: '在最近N天的历史每日新闻中搜索特定关键词。返回匹配的新闻条目及日期。'
	},
	hnGetAskStores: {
		name: '获取Hacker News Ask帖子',
		description: '获取Hacker News的Ask Stories'
	},
	getBBCNews: {
		name: '获取BBC新闻',
		description: '获取BBC最新新闻'
	},
	getNPRNews: {
		name: '获取NPR新闻',
		description: '获取NPR(美国国家公共广播电台)最新新闻'
	},
	tickertickGetImportantNews: {
		name: '从 TickerTick 获取重要新闻',
		description: '从 TickerTick 获取特定股票代码的重要新闻。返回包含标题、摘要、来源和情绪的新闻项目。'
	}
};

