/**
 * Stock Analysis News Tools (Mastra Format)
 * 
 * 获取StockAnalysis.com的美股新闻
 * Get US stock news from StockAnalysis.com
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

/**
 * 解析StockAnalysis.com的优化JSON格式
 * 该格式使用索引引用来减少数据冗余
 */
function parseStockAnalysisData(rawData: any): any[] {
	try {
		if (!rawData || !rawData.nodes || !rawData.nodes[1] || !rawData.nodes[1].data) {
			return [];
		}

		const dataArray = rawData.nodes[1].data;
		if (!Array.isArray(dataArray) || dataArray.length < 2) {
			return [];
		}

		// dataArray[1] 包含新闻条目的索引列表
		const newsIndices = dataArray[1];
		if (!Array.isArray(newsIndices)) {
			return [];
		}

		const parsedNews: any[] = [];

		// 遍历每个新闻索引
		for (const idx of newsIndices) {
			if (typeof idx !== 'number' || idx >= dataArray.length) {
				continue;
			}

			const newsTemplate = dataArray[idx];
			if (!newsTemplate || typeof newsTemplate !== 'object') {
				continue;
			}

			// 解析新闻条目，将索引引用替换为实际值
			const newsItem: any = {};
			for (const [key, value] of Object.entries(newsTemplate)) {
				if (typeof value === 'number' && value < dataArray.length) {
					// 索引引用，获取实际值
					newsItem[key] = dataArray[value];
				} else {
					// 直接值
					newsItem[key] = value;
				}
			}

			parsedNews.push(newsItem);
		}

		return parsedNews;
	} catch (error) {
		console.error('Error parsing StockAnalysis data:', error);
		return [];
	}
}

/**
 * Tool: Get Stock Analysis Market News
 */
export const getStockAnalysisMarketNewsTool = createMastraTool({
  category: 'stock-china',
	id: 'get_stock_analysis_market_news',
	description: 'Get US stock market news, including market dynamics, analysis reports, and important information',
	
	inputSchema: z.object({
		limit: z.number()
			.describe('Limit number of news items')
			.optional()
			.default(20)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		count: z.number()
			.describe('Number of news items returned'),
		urls: z.array(z.string())
			.describe('News article URL list')
	}).describe('StockAnalysis US market news data'),
	
	execute: async ({ context }) => {
		const { limit = 20 } = context;
		
		const url = 'https://stockanalysis.com/news/__data.json?x-sveltekit-trailing-slash=1&x-sveltekit-invalidated=01';
		
		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
				'sec-ch-ua': '"Chromium";v="140", "Not A(Brand";v="24"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"macOS"'
			}
		});

		if (response.status !== 200) {
			throw new Error(`HTTP ${response.status}`);
		}

		const parsedNews = parseStockAnalysisData(response.json);
		
		if (parsedNews.length === 0) {
			throw new Error('No news data found or failed to parse response');
		}

		const limitedNews = parsedNews.slice(0, limit);
		const urls = limitedNews.map((item: any) => item.url);

		return {
			count: urls.length,
			urls
		};
	}
});

/**
 * Tool: Get Stock Analysis All Stocks News
 */
export const getStockAnalysisAllStocksNewsTool = createMastraTool({
  category: 'stock-china',
	id: 'get_stock_analysis_all_stocks_news',
	description: 'Get all US stock news, including latest updates and announcements from companies',
	
	inputSchema: z.object({
		limit: z.number()
			.describe('Limit number of news items')
			.optional()
			.default(20)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		count: z.number()
			.describe('Number of news items returned'),
		urls: z.array(z.string())
			.describe('News article URL list')
	}).describe('StockAnalysis individual stock news data'),
	
	execute: async ({ context }) => {
		const { limit = 20 } = context;
		
		const url = 'https://stockanalysis.com/news/all-stocks/__data.json?x-sveltekit-trailing-slash=1&x-sveltekit-invalidated=01';
		
		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
				'sec-ch-ua': '"Chromium";v="140", "Not A(Brand";v="24"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"macOS"'
			}
		});

		if (response.status !== 200) {
			throw new Error(`HTTP ${response.status}`);
		}

		const parsedNews = parseStockAnalysisData(response.json);
		
		if (parsedNews.length === 0) {
			throw new Error('Failed to parse news data - received empty or invalid response');
		}

		const limitedNews = parsedNews.slice(0, limit);
		const urls = limitedNews.map((item: any) => item.url);

		return {
			count: urls.length,
			urls
		};
	}
});

/**
 * Tool: Get Stock Analysis Press Releases
 */
export const getStockAnalysisPressReleasesTool = createMastraTool({
  category: 'stock-china',
	id: 'get_stock_analysis_press_releases',
	description: 'Get US stock official press releases, including earnings announcements and important statements',
	
	inputSchema: z.object({
		limit: z.number()
			.describe('Limit number of news items')
			.optional()
			.default(20)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		count: z.number()
			.describe('Number of news items returned'),
		urls: z.array(z.string())
			.describe('Official press release URL list')
	}).describe('StockAnalysis official press release data'),
	
	execute: async ({ context }) => {
		const { limit = 20 } = context;
		
		const url = 'https://stockanalysis.com/news/press-releases/__data.json?x-sveltekit-trailing-slash=1&x-sveltekit-invalidated=01';
		
		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
				'sec-ch-ua': '"Chromium";v="140", "Not A(Brand";v="24"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"macOS"'
			}
		});

		if (response.status !== 200) {
			throw new Error(`HTTP ${response.status}`);
		}

		const parsedNews = parseStockAnalysisData(response.json);
		
		if (parsedNews.length === 0) {
			throw new Error('Failed to parse news data - received empty or invalid response');
		}

		const limitedNews = parsedNews.slice(0, limit);
		const urls = limitedNews.map((item: any) => item.url);

		return {
			count: urls.length,
			urls
		};
	}
});
