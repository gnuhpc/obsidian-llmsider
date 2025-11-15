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
};
