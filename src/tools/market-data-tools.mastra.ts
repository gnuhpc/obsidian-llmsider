// Market Data Tools - Stock quotes, crypto prices, and market indices
import { z } from 'zod';
import { createMastraTool } from './tool-converter';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';

/**
 * Format market cap in readable format (billions, millions, etc.)
 */
function formatMarketCap(value: number): string {
	if (value >= 1e12) {
		return `${(value / 1e12).toFixed(2)}T`;
	} else if (value >= 1e9) {
		return `${(value / 1e9).toFixed(2)}B`;
	} else if (value >= 1e6) {
		return `${(value / 1e6).toFixed(2)}M`;
	} else {
		return value.toLocaleString();
	}
}

/**
 * Get stock quote for US stocks, China A-shares, crypto, and indices
 * Uses Yahoo Finance API (free, no API key required)
 */
export const getMarketQuoteTool = createMastraTool({
	id: 'get_market_quote',
	description: 'Get real-time or latest market data for stocks, cryptocurrencies, and market indices. IMPORTANT: Use stock codes directly, not company names. Examples: AAPL (Apple), 002281.SZ (Accelink), 600519.SS (Kweichow Moutai), BTC-USD (Bitcoin), ^DJI (Dow Jones). For Chinese stocks: Shanghai stocks use .SS suffix (e.g., 600519.SS), Shenzhen stocks use .SZ suffix (e.g., 002281.SZ).',
	category: 'stock-china',
	inputSchema: z.object({
		symbol: z.string().optional().describe('Stock code (NOT company name). Examples: AAPL (US), 002281.SZ (Shenzhen A-share), 600519.SS (Shanghai A-share), 0700.HK (Hong Kong), BTC-USD (crypto), ^DJI (index). Format: Shanghai stocks add .SS, Shenzhen stocks add .SZ, Hong Kong stocks add .HK.'),
		symbols: z.array(z.string()).optional().describe('Array of stock codes to fetch quotes for multiple assets at once. Use stock codes, not company names.')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		success: z.boolean().describe('Request success status'),
		data: z.union([
			z.object({
				symbol: z.string().describe('Stock symbol'),
				name: z.string().describe('Name'),
				currency: z.string().describe('Currency'),
				exchange: z.string().describe('Exchange'),
				price: z.number().describe('Current price'),
				previousClose: z.number().describe('Previous close'),
				change: z.number().describe('Change amount'),
				changePercent: z.string().describe('Change percent (%)'),
				dayHigh: z.number().describe('Day high'),
				dayLow: z.number().describe('Day low'),
				volume: z.number().describe('Volume'),
				marketCap: z.number().optional().describe('Market cap'),
				timezone: z.string().describe('Timezone'),
				timestamp: z.string().describe('Timestamp'),
				marketState: z.string().describe('Market state')
			}),
			z.array(z.object({
				symbol: z.string().describe('Stock symbol'),
				name: z.string().describe('Name'),
				currency: z.string().describe('Currency'),
				exchange: z.string().describe('Exchange'),
				price: z.number().describe('Current price'),
				previousClose: z.number().describe('Previous close'),
				change: z.number().describe('Change amount'),
				changePercent: z.string().describe('Change percent (%)'),
				dayHigh: z.number().describe('Day high'),
				dayLow: z.number().describe('Day low'),
				volume: z.number().describe('Volume'),
				marketCap: z.number().optional().describe('Market cap'),
				timezone: z.string().describe('Timezone'),
				timestamp: z.string().describe('Timestamp'),
				marketState: z.string().describe('Market state')
			}))
		]).optional().describe('Market data, single or multiple'),
		error: z.string().optional().describe('Error message'),
		message: z.string().optional().describe('Additional information')
	}).describe('Market quote data'),
	execute: async ({ context }) => {
		try {
			const { symbol, symbols } = context;
			
			// Validate input
			if (!symbol && (!symbols || symbols.length === 0)) {
				throw new Error('Either symbol or symbols array must be provided');
			}

			const symbolList = symbols && symbols.length > 0 ? symbols : [symbol!];
			const symbolsParam = symbolList.join(',');

			// Use Yahoo Finance API v8 endpoint (no API key required)
			const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbolsParam)}?interval=1d&range=1d`;

			Logger.debug('Fetching quote from:', url);

			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
				}
			});

			if (response.status !== 200) {
				throw new Error(`Yahoo Finance API returned status ${response.status}`);
			}

			const data = response.json;
			
			if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
				throw new Error('No data returned from Yahoo Finance API');
			}

			// Parse multiple results
			const results = data.chart.result.map((result: any) => {
				const meta = result.meta;
				const quote = result.indicators?.quote?.[0];
				
				if (!meta) {
					return { error: 'Invalid data structure' };
				}

				// Get the latest price data
				const currentPrice = meta.regularMarketPrice;
				const previousClose = meta.previousClose || meta.chartPreviousClose;
				const change = currentPrice - previousClose;
				const changePercent = previousClose ? (change / previousClose) * 100 : 0;

				return {
					symbol: meta.symbol,
					name: meta.longName || meta.shortName || meta.symbol,
					currency: meta.currency,
					exchange: meta.exchangeName,
					price: currentPrice,
					previousClose: previousClose,
					change: change,
					changePercent: changePercent.toFixed(2) + '%',
					dayHigh: meta.regularMarketDayHigh,
					dayLow: meta.regularMarketDayLow,
					volume: meta.regularMarketVolume,
					marketCap: meta.marketCap,
					timezone: meta.timezone,
					timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
					marketState: meta.marketState
				};
			});

			// Format response
			if (results.length === 1) {
				const quote = results[0];
				if (quote.error) {
					return {
						success: false,
						error: quote.error,
						message: `Failed to fetch quote for ${symbolList[0]}`
					};
				}

				return {
					success: true,
					data: quote
				};
			} else {
				return {
					success: true,
					data: results
				};
			}

		} catch (error) {
			Logger.error('Error fetching market quote:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				message: 'Failed to fetch market data. The symbol might be invalid or the service might be temporarily unavailable.'
			};
		}
	}
});

/**
 * Search for stock symbols by company name or keyword
 */
export const searchSymbolTool = createMastraTool({
	id: 'search_market_symbol',
	description: 'Search for stock symbols by company name, keyword, or ticker. Supports both English and Chinese company names. Uses multiple data sources (Yahoo Finance, Sina Finance, Sohu Finance) for comprehensive search. Returns matching symbols with their names and exchanges.',
	category: 'stock-china',
	inputSchema: z.object({
		query: z.string().describe('Search query - company name (English or Chinese), keyword, or partial ticker symbol. Examples: "Apple", "Tesla", "Tencent", "Accelink", "Kweichow Moutai", "Bitcoin"'),
		limit: z.number().optional().default(10).describe('Maximum number of results to return (default: 10)')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		success: z.boolean().describe('Search success status'),
		data: z.array(z.object({
			symbol: z.string().describe('Stock symbol'),
			name: z.string().describe('Stock name'),
			type: z.string().describe('Type'),
			exchange: z.string().describe('Exchange'),
			industry: z.string().optional().describe('Industry'),
			sector: z.string().optional().describe('Sector'),
			source: z.string().describe('Data source')
		})).describe('Search results list'),
		count: z.number().describe('Result count'),
		source: z.string().optional().describe('Data source used'),
		message: z.string().optional().describe('Message'),
		error: z.string().optional().describe('Error message')
	}).describe('Stock symbol search results'),
	execute: async ({ context }) => {
		try {
			const { query, limit = 10 } = context;
			
			if (!query || query.trim().length === 0) {
				throw new Error('Search query cannot be empty');
			}

			const trimmedQuery = query.trim();
			let allResults: any[] = [];

			// Detect if query contains Chinese characters
			const hasChinese = /[\u4e00-\u9fa5]/.test(trimmedQuery);

			if (hasChinese) {
				// For Chinese queries, try Sina Finance first
				Logger.debug('Detected Chinese query, trying Sina Finance first...');
				// Note: Sina Finance API integration would go here
				// For now, fall through to Yahoo Finance
			}

			// Try Yahoo Finance API (good for English queries and US stocks)
			try {
				const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0`;

				Logger.debug('Searching symbols via Yahoo Finance:', url);

				const response = await requestUrl({
					url: url,
					method: 'GET',
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
						'Accept': 'application/json'
					}
				});

				if (response.status === 200) {
					const data = response.json;
					
					if (data.quotes && data.quotes.length > 0) {
						// Parse and format results
						const results = data.quotes.slice(0, limit).map((quote: any) => ({
							symbol: quote.symbol,
							name: quote.longname || quote.shortname || quote.symbol,
							type: quote.quoteType,
							exchange: quote.exchange,
							industry: quote.industry,
							sector: quote.sector,
							source: 'yahoo'
						}));

						allResults = results;
						
						return {
							success: true,
							data: allResults,
							count: allResults.length,
							source: 'yahoo-finance'
						};
					}
				}
			} catch (apiError) {
				Logger.warn('Yahoo Finance API failed:', apiError);
			}

			// If all searches fail
			return {
				success: true,
				data: [],
				count: 0,
				message: `No symbols found for "${query}". Tips: Try using different keywords or stock codes directly (Shanghai: .SS, Shenzhen: .SZ, Hong Kong: .HK)`
			};

		} catch (error) {
			Logger.error('Error searching symbols:', error);
			return {
				success: false,
				data: [],
				count: 0,
				error: error instanceof Error ? error.message : String(error),
				message: `Search failed for "${context.query}". Try using stock codes directly (e.g., Shanghai: .SS, Shenzhen: .SZ, Hong Kong: .HK).`
			};
		}
	}
});
