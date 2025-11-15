/**
 * News and sentiment tools
 */

export const enNewsTools = {
	getCCTVNews: {
			name: 'Get CCTV News Transcript',
			description: 'Get CCTV News (新闻联播) text transcript, useful for analyzing policy direction and market hot topics. Requires date (YYYYMMDD).'
		},
getFinancialNews: {
			name: 'Get Financial News',
			description: 'Get financial news from multiple sources including Securities Times, CLS, Yicai, EEO, and 21st Century Business Herald. Optional source and count filters.'
		},
getStockPopularity: {
			name: 'Get Stock Popularity Ranking',
			description: 'Get stock popularity ranking based on attention, search heat, and other metrics. Supports market filter (all/sh/sz).'
		},
getNewsSentiment: {
			name: 'Get News Sentiment Index',
			description: 'Get market news sentiment index for quantitative sentiment analysis. Optional stock symbol, otherwise returns overall market sentiment.'
		},
getWeiboSentiment: {
			name: 'Get Weibo Financial Sentiment',
			description: 'Get Weibo financial sentiment index reflecting social media market sentiment.'
		},
getResearchReports: {
			name: 'Get Research Reports',
			description: 'Get brokerage research reports list. Supports filtering by stock symbol and report type (company/industry/macro/strategy). Default 50 reports.'
		},
};
