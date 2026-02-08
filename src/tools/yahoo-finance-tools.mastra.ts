// Yahoo Finance Tools - News, trending stocks, quotes, historical data
import { z } from 'zod';
import { createMastraTool } from './tool-converter';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';

/**
 * Helper function to extract content between XML tags
 */
function extractTag(text: string, tagName: string): string {
	try {
		const startTag = `<${tagName}>`;
		const endTag = `</${tagName}>`;
		const startIndex = text.indexOf(startTag);
		const endIndex = text.indexOf(endTag, startIndex);
		
		if (startIndex === -1 || endIndex === -1) {
			return '';
		}
		
		const content = text.substring(startIndex + startTag.length, endIndex);
		// Remove CDATA wrapper if present
		return content.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
	} catch {
		return '';
	}
}

/**
 * Get Yahoo Finance news from RSS feed
 */
export const getYahooFinanceNewsRSSTool = createMastraTool({
	id: 'get_yahoo_finance_news_rss',
	description: 'Get latest news articles from Yahoo Finance RSS feed for specific stock ticker symbols. Returns news title, link, publication date and source. Uses free Yahoo Finance RSS feed (no API key required).',
	category: 'news-info',
	inputSchema: z.object({
		ticker: z.string().describe('Stock ticker symbol (e.g., AAPL, TSLA, MSFT, GOOGL)'),
		max_items: z.number().optional().default(5).describe('Maximum number of news items to return (default: 5)')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		ticker: z.string().describe('Stock ticker'),
		count: z.number().describe('News count'),
		news: z.array(z.object({
			ticker: z.string().describe('Stock ticker'),
			title: z.string().describe('News title'),
			url: z.string().describe('News link'),
			published_at: z.string().describe('Publication time'),
			description: z.string().describe('News description'),
			source: z.string().describe('Data source')
		})).describe('News list'),
		message: z.string().optional().describe('Message')
	}).describe('Yahoo Finance RSS news data'),
	execute: async ({ context }) => {
		try {
			const ticker = context.ticker.toUpperCase();
			const maxItems = context.max_items || 5;
			const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;

			const response = await requestUrl({
				url: rssUrl,
				method: 'GET',
				headers: {
					'User-Agent': 'LLMSider/1.0'
				}
			});

			const text = response.text;

			// Parse RSS XML manually (simple parsing without external dependencies)
			if (!text.includes('<item>')) {
				return {
					ticker,
					count: 0,
					news: [],
					message: 'No news items found for this ticker'
				};
			}

			const items = [];
			const itemParts = text.split('<item>').slice(1, maxItems + 1);

			for (const part of itemParts) {
				const title = extractTag(part, 'title');
				const link = extractTag(part, 'link');
				const pubDate = extractTag(part, 'pubDate');
				const description = extractTag(part, 'description');

				if (title && link) {
					items.push({
						ticker,
						title: title.trim(),
						url: link.trim(),
						published_at: pubDate || '',
						description: description ? description.trim() : '',
						source: 'Yahoo Finance RSS'
					});
				}
			}

			return {
				ticker,
				count: items.length,
				news: items
			};
		} catch (error) {
			Logger.error('Error fetching Yahoo Finance RSS:', error);
			throw new Error(`Failed to fetch Yahoo Finance RSS: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
});

/**
 * Search Yahoo Finance news by ticker
 */
export const getYahooFinanceNewsSearchTool = createMastraTool({
	id: 'get_yahoo_finance_news_search',
	description: 'Search for news articles about a stock ticker using Yahoo Finance search API. Returns news with title, link, publisher, and publication time. Uses Yahoo Finance API (no API key required).',
	category: 'news-info',
	inputSchema: z.object({
		ticker: z.string().describe('Stock ticker symbol to search news for (e.g., AAPL, TSLA, MSFT)'),
		max_items: z.number().optional().default(5).describe('Maximum number of news items to return (default: 5)')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		ticker: z.string().describe('Stock ticker'),
		count: z.number().describe('News count'),
		news: z.array(z.object({
			ticker: z.string().describe('Stock ticker'),
			title: z.string().describe('News title'),
			url: z.string().describe('News link'),
			publisher: z.string().describe('Publisher'),
			published_at: z.string().describe('Publication time (ISO format)'),
			source: z.string().describe('Data source')
		})).describe('News list')
	}).describe('Yahoo Finance news search results'),
	execute: async ({ context }) => {
		try {
			const ticker = context.ticker.toUpperCase();
			const maxItems = context.max_items || 5;
			const searchUrl = 'https://query1.finance.yahoo.com/v1/finance/search';

			const response = await requestUrl({
				url: `${searchUrl}?q=${ticker}&newsCount=${maxItems}`,
				method: 'GET',
				headers: {
					'User-Agent': 'LLMSider/1.0'
				}
			});

			const data = response.json;
			const newsList = (data?.news || []).slice(0, maxItems);

			const items = newsList.map((n: any) => ({
				ticker,
				title: n.title,
				url: n.link,
				publisher: n.publisher,
				published_at: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : '',
				source: 'Yahoo Finance Search'
			}));

			return {
				ticker,
				count: items.length,
				news: items
			};
		} catch (error) {
			Logger.error('Error searching Yahoo Finance news:', error);
			throw new Error(`Failed to search Yahoo Finance news: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
});

/**
 * Get trending tickers from Yahoo Finance
 */
export const getYahooFinanceTrendingTool = createMastraTool({
	id: 'get_yahoo_finance_trending',
	description: 'Get trending (most popular/actively traded) stock tickers from Yahoo Finance. Shows what stocks are currently hot in the market. Supports multiple regions (US, HK, GB, etc.).',
	category: 'stock-global',
	inputSchema: z.object({
		region: z.enum(['US', 'HK', 'GB', 'AU', 'CA', 'FR', 'DE', 'IT', 'ES', 'IN']).optional().default('US').describe('Market region: US (United States), HK (Hong Kong), GB (Great Britain), AU (Australia), CA (Canada), FR (France), DE (Germany), IT (Italy), ES (Spain), IN (India)'),
		max_items: z.number().optional().default(10).describe('Maximum number of trending tickers to return (default: 10)')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		region: z.string().describe('Market region code'),
		count: z.number().describe('Number of trending stocks'),
		tickers: z.array(z.object({
			symbol: z.string().describe('Stock symbol'),
			name: z.string().describe('Company name'),
			exchange: z.string().describe('Exchange name'),
			type: z.string().describe('Security type (EQUITY, ETF, etc.)'),
			marketState: z.string().describe('Market state (REGULAR, PRE, POST, CLOSED)')
		})).describe('List of trending stocks'),
		message: z.string().optional().describe('Message')
	}).describe('Yahoo Finance trending stock data'),
	execute: async ({ context }) => {
		try {
			const region = context.region || 'US';
			const maxItems = context.max_items || 10;
			const trendingUrl = `https://query1.finance.yahoo.com/v1/finance/trending/${region}`;

			const response = await requestUrl({
				url: trendingUrl,
				method: 'GET',
				headers: {
					'User-Agent': 'LLMSider/1.0'
				}
			});

			const data = response.json;
			const results = data?.finance?.result || [];

			if (results.length === 0) {
				return {
					region,
					count: 0,
					tickers: [],
					message: 'No trending tickers found'
				};
			}

			const quotes = (results[0]?.quotes || []).slice(0, maxItems);
			const tickers = quotes.map((q: any) => ({
				symbol: q.symbol,
				name: q.shortName || q.longName || q.symbol,
				exchange: q.exchange,
				type: q.quoteType,
				marketState: q.marketState
			}));

			return {
				region,
				count: tickers.length,
				tickers
			};
		} catch (error) {
			Logger.error('Error fetching trending tickers:', error);
			throw new Error(`Failed to fetch trending tickers: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
});

/**
 * Get stock quote from Yahoo Finance
 */
export const getYahooFinanceQuoteTool = createMastraTool({
	id: 'get_yahoo_finance_quote',
	description: 'Get comprehensive stock quote data from Yahoo Finance including current price, previous close, 52-week range, volume, and more. Uses chart API for reliable data access (no API key required).',
	category: 'stock-global',
	inputSchema: z.object({
		ticker: z.string().describe('Stock ticker symbol (e.g., AAPL, TSLA, MSFT, 000001.SS for Shanghai stocks)')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		symbol: z.string().describe('Stock symbol'),
		name: z.string().describe('Company name'),
		currency: z.string().describe('Trading currency'),
		exchange: z.string().describe('Full exchange name'),
		instrumentType: z.string().describe('Instrument type (EQUITY, ETF, INDEX, etc.)'),
		timezone: z.string().describe('Exchange timezone'),
		price: z.object({
			current: z.number().describe('Current price'),
			previousClose: z.number().describe('Previous close price'),
			open: z.number().nullable().describe('Opening price'),
			dayHigh: z.number().nullable().describe('Day high price'),
			dayLow: z.number().nullable().describe('Day low price')
		}).describe('Price information'),
		change: z.object({
			amount: z.number().nullable().describe('Change amount'),
			percent: z.number().nullable().describe('Change percentage (%)')
		}).describe('Price change information'),
		range52Week: z.object({
			low: z.number().nullable().describe('52-week low'),
			high: z.number().nullable().describe('52-week high')
		}).describe('52-week price range'),
		volume: z.object({
			current: z.number().nullable().describe('Current volume'),
			average: z.number().nullable().describe('Average volume')
		}).describe('Volume information'),
		tradingPeriod: z.any().optional().describe('Trading period information'),
		hasPrePostMarketData: z.boolean().optional().describe('Has pre/post market data'),
		timestamp: z.string().describe('Data timestamp (ISO format)')
	}).describe('Yahoo Finance stock quote data'),
	execute: async ({ context }) => {
		try {
			const tickerInput = (context?.ticker ?? (context as any)?.symbol) as string | undefined;
			if (!tickerInput) {
				throw new Error('Ticker symbol is required');
			}
			const ticker = tickerInput.toUpperCase();
			const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
			
			// Get 1 year data to calculate 52-week range
			const response = await requestUrl({
				url: `${chartUrl}?interval=1d&range=1y`,
				method: 'GET',
				headers: {
					'User-Agent': 'LLMSider/1.0'
				}
			});

			const data = response.json;
			const result = data?.chart?.result?.[0];

			if (!result) {
				throw new Error(`No data found for ticker: ${ticker}`);
			}

			const meta = result.meta;
			const quotes = result.indicators?.quote?.[0];
			const timestamps = result.timestamp || [];
			const lastIdx = timestamps.length - 1;

			// Calculate average volume from historical data
			const volumes = (quotes?.volume || []).filter((v: number | null) => v !== null && v > 0);
			const avgVolume = volumes.length > 0 ? Math.round(volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length) : null;

			// Current day data
			const currentPrice = meta.regularMarketPrice || quotes?.close?.[lastIdx];
			const previousClose = meta.chartPreviousClose;
			const priceChange = currentPrice && previousClose ? currentPrice - previousClose : null;
			const priceChangePercent = priceChange && previousClose ? (priceChange / previousClose) * 100 : null;

			// Extract key information
			const quote = {
				symbol: meta.symbol,
				name: meta.longName || meta.shortName || meta.symbol,
				currency: meta.currency,
				exchange: meta.fullExchangeName || meta.exchangeName,
				instrumentType: meta.instrumentType,
				timezone: meta.exchangeTimezoneName,
				price: {
					current: currentPrice,
					previousClose: previousClose,
					open: quotes?.open?.[lastIdx] || null,
					dayHigh: meta.regularMarketDayHigh || quotes?.high?.[lastIdx] || null,
					dayLow: meta.regularMarketDayLow || quotes?.low?.[lastIdx] || null
				},
				change: {
					amount: priceChange,
					percent: priceChangePercent
				},
				range52Week: {
					low: meta.fiftyTwoWeekLow || null,
					high: meta.fiftyTwoWeekHigh || null
				},
				volume: {
					current: quotes?.volume?.[lastIdx] || null,
					average: avgVolume
				},
				tradingPeriod: meta.currentTradingPeriod,
				hasPrePostMarketData: meta.hasPrePostMarketData,
				timestamp: new Date(timestamps[lastIdx] * 1000).toISOString()
			};

			return quote;
		} catch (error) {
			Logger.error('Error fetching Yahoo Finance quote:', error);
			throw new Error(`Failed to fetch Yahoo Finance quote: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
});

/**
 * Get historical stock data from Yahoo Finance
 */
export const getYahooFinanceHistoryTool = createMastraTool({
	id: 'get_yahoo_finance_history',
	description: 'Get historical stock price data (OHLCV - Open, High, Low, Close, Volume) from Yahoo Finance. Supports daily, weekly, and monthly intervals for various time periods.',
	category: 'stock-global',
	inputSchema: z.object({
		ticker: z.string().describe('Stock ticker symbol (e.g., AAPL, TSLA, MSFT)'),
		period: z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']).optional().default('1mo').describe('Time period: 1d, 5d, 1mo (1 month), 3mo, 6mo, 1y (1 year), 2y, 5y, 10y, ytd (year-to-date), max (all available data)'),
		interval: z.enum(['1d', '1wk', '1mo']).optional().default('1d').describe('Data interval: 1d (daily), 1wk (weekly), 1mo (monthly)')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		ticker: z.string().describe('Stock ticker'),
		period: z.string().describe('Time period'),
		interval: z.string().describe('Data interval'),
		currency: z.string().describe('Currency'),
		dataCount: z.number().describe('Number of data points'),
		data: z.array(z.object({
			date: z.string().describe('Date (YYYY-MM-DD)'),
			open: z.number().nullable().describe('Opening price'),
			high: z.number().nullable().describe('Highest price'),
			low: z.number().nullable().describe('Lowest price'),
			close: z.number().nullable().describe('Closing price'),
			adjClose: z.number().nullable().describe('Adjusted closing price'),
			volume: z.number().nullable().describe('Volume')
		})).describe('Historical data list')
	}).describe('Yahoo Finance historical market data'),
	execute: async ({ context }) => {
		try {
			const ticker = context.ticker.toUpperCase();
			const period = context.period || '1mo';
			const interval = context.interval || '1d';
			
			// Calculate timestamps
			const now = Math.floor(Date.now() / 1000);
			const periodMap: { [key: string]: number } = {
				'1d': 86400,
				'5d': 5 * 86400,
				'1mo': 30 * 86400,
				'3mo': 90 * 86400,
				'6mo': 180 * 86400,
				'1y': 365 * 86400,
				'2y': 2 * 365 * 86400,
				'5y': 5 * 365 * 86400,
				'10y': 10 * 365 * 86400,
				'ytd': Math.floor((now - new Date(new Date().getFullYear(), 0, 1).getTime() / 1000)),
				'max': 50 * 365 * 86400
			};

			const period1 = now - (periodMap[period] || periodMap['1mo']);
			const period2 = now;

			const historyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
			const queryParams = new URLSearchParams({
				period1: String(period1),
				period2: String(period2),
				interval: interval,
				events: 'history'
			});

			const response = await requestUrl({
				url: `${historyUrl}?${queryParams.toString()}`,
				method: 'GET',
				headers: {
					'User-Agent': 'LLMSider/1.0'
				}
			});

			const data = response.json;
			const result = data?.chart?.result?.[0];

			if (!result) {
				throw new Error(`No historical data found for ticker: ${ticker}`);
			}

			const timestamps = result.timestamp || [];
			const quote = result.indicators?.quote?.[0] || {};
			const adjclose = result.indicators?.adjclose?.[0]?.adjclose || [];

			const history = timestamps.map((ts: number, i: number) => ({
				date: new Date(ts * 1000).toISOString().split('T')[0],
				open: quote.open?.[i] || null,
				high: quote.high?.[i] || null,
				low: quote.low?.[i] || null,
				close: quote.close?.[i] || null,
				adjClose: adjclose[i] || null,
				volume: quote.volume?.[i] || null
			})).filter((d: any) => d.close !== null);

			return {
				ticker,
				period,
				interval,
				currency: result.meta?.currency || 'USD',
				dataCount: history.length,
				data: history
			};
		} catch (error) {
			Logger.error('Error fetching historical data:', error);
			throw new Error(`Failed to fetch historical data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
});
