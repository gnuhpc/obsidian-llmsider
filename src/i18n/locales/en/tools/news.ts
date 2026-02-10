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
	getStockAnalysisMarketNews: {
		name: 'Get US Stock Market News',
		description: 'Get overall US stock market news from StockAnalysis.com, including market dynamics, analysis reports, and important information. Returns parsed news with title, source, time, URL, and description. Default 20 items, adjustable via limit parameter.'
	},
	getStockAnalysisAllStocksNews: {
		name: 'Get All US Stocks News',
		description: 'Get news for all US individual stocks from StockAnalysis.com, including latest updates and announcements from various companies. Returns parsed news with title, source, time, URL, and description. Default 20 items, adjustable via limit parameter.'
	},
	getStockAnalysisPressReleases: {
		name: 'Get US Company Press Releases',
		description: 'Get official press releases from US companies via StockAnalysis.com, including earnings announcements and important statements. Returns parsed news with title, source, time, URL, and description. Default 20 items, adjustable via limit parameter.'
	},
	hnSearchStories: {
		name: 'Search Hacker News Stories',
		description: 'Search Hacker News stories by keyword. Results sorted by relevance, points, and comments. Returns story titles, URLs, authors, points, and comment counts.'
	},
	hnSearchByDate: {
		name: 'Search Hacker News by Date',
		description: 'Search Hacker News stories and comments sorted by date (most recent first). Useful for finding latest posts on a topic.'
	},
	hnGetFrontPage: {
		name: 'Get Hacker News Front Page',
		description: 'Get current front page stories from Hacker News. Shows stories currently visible on the HN homepage.'
	},
	hnGetTopStories: {
		name: 'Get Hacker News Top Stories',
		description: 'Get top rated stories from Hacker News. Returns highly ranked stories sorted by points and engagement.'
	},
	hnGetItem: {
		name: 'Get Hacker News Item Details',
		description: 'Get detailed information about a specific Hacker News item (story, comment, poll) by ID. Returns full content including nested comments.'
	},
	hnGetUser: {
		name: 'Get Hacker News User Info',
		description: 'Get information about a Hacker News user including karma, about section, and submission history.'
	},
	hnGetAskStories: {
		name: 'Get Ask HN Stories',
		description: 'Get recent Ask HN stories where users ask questions to the community.'
	},
	hnGetShowStories: {
		name: 'Get Show HN Stories',
		description: 'Get recent Show HN stories where users share their projects, products, or creations.'
	},
	// Yahoo Finance News Tools
	getYahooFinanceNewsRSS: {
		name: 'Get Yahoo Finance News (RSS)',
		description: 'Get latest news articles from Yahoo Finance RSS feed for specific stock ticker symbols. Returns news title, link, publication date and source. Uses free Yahoo Finance RSS feed (no API key required).'
	},
	getYahooFinanceNewsSearch: {
		name: 'Get Yahoo Finance News Search',
		description: 'Search for news articles about a stock ticker using Yahoo Finance search API. Returns news with title, link, publisher, and publication time.'
	},
	getYahooFinanceTrending: {
		name: 'Get Yahoo Finance Trending',
		description: 'Get trending (most popular/actively traded) stock tickers from Yahoo Finance. Shows what stocks are currently hot in the market.'
	},
	getYahooFinanceQuote: {
		name: 'Get Yahoo Finance Quote',
		description: 'Get comprehensive stock quote data from Yahoo Finance including current price, previous close, market cap, PE ratio, 52-week range, volume, and more.'
	},
	getYahooFinanceHistory: {
		name: 'Get Yahoo Finance Historical Data',
		description: 'Get historical stock price data (OHLCV - Open, High, Low, Close, Volume) from Yahoo Finance. Supports daily, weekly, and monthly intervals.'
	},
	// EverydayNews tools (60-second daily news)
	getLatestEverydayNews: {
		name: 'Get Latest Daily News',
		description: 'Get the latest daily 60-second news summary in Chinese. Returns a curated list of the most important news items from today.'
	},
	getEverydayNewsByDate: {
		name: 'Get Daily News by Date',
		description: 'Get daily 60-second news summary for a specific date. Supports dates from 2022-06-04 onwards. Returns news in Chinese.'
	},
	getRecentEverydayNews: {
		name: 'Get Recent Daily News',
		description: 'Get daily 60-second news summaries for the past N days (1-30 days). Returns chronological news in Chinese.'
	},
	searchEverydayNews: {
		name: 'Search Daily News',
		description: 'Search for specific keywords in historical daily news from the past N days. Returns matching news items with dates.'
	},
	// News aggregation tools
	getBbcNews: {
		name: 'Get BBC News',
		description: 'Get latest news from BBC News RSS feed. Supports multiple categories including world, business, technology, science, health, entertainment, and sport. Returns news headlines, descriptions, links, and publication dates.'
	},
	getHackerNews: {
		name: 'Get Hacker News',
		description: 'Get stories from Hacker News. Supports multiple story types including top, new, best, ask, show, and job stories. Returns story title, URL, score, author, comment count, and Hacker News discussion link.'
	},
	getRedditTopPosts: {
		name: 'Get Reddit Top Posts',
		description: 'Get top posts from a Reddit subreddit. Supports multiple time periods including hour, day, week, month, year, and all time. Returns post title, author, score, upvote ratio, comment count, URL, and content preview.'
	},
	getNprNews: {
		name: 'Get NPR News',
		description: 'Get latest news from NPR (National Public Radio) RSS feed. Supports multiple categories including news, world, business, technology, science, health, and politics. Returns news headlines, summaries, links, and publication dates.'
	},
	tickertickGetImportantNews: {
		name: 'Get Important News from TickerTick',
		description: 'Get important news for a specific stock symbol from TickerTick. Returns news items with title, summary, source, and sentiment.'
	}
};
