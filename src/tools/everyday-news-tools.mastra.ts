/**
 * Everyday News Tools (Mastra Format)
 * 
 * 提供每日60秒新闻，存储2022/06/04至今的所有新闻
 * Provides daily 60-second Chinese news summaries
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

const EVERYDAY_NEWS_BASE = 'https://ravelloh.github.io/EverydayNews';
const EVERYDAY_NEWS_MIRROR = 'https://news.ravelloh.top'; // 国内加速镜像

/**
 * Format date to YYYY-MM-DD for display
 */
function formatDateDisplay(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Parse date string (supports multiple formats)
 */
function parseDate(dateStr: string): Date {
	// Try YYYY-MM-DD format
	let match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (match) {
		return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
	}
	
	// Try YYYYMMDD format
	match = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
	if (match) {
		return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
	}
	
	// Try YYYY/MM/DD format
	match = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
	if (match) {
		return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
	}
	
	throw new Error('Invalid date format. Please use YYYY-MM-DD, YYYYMMDD, or YYYY/MM/DD format.');
}

/**
 * Tool: Get latest everyday news
 */
export const getLatestEverydayNewsTool = createMastraTool({
  category: 'news-info',
	id: 'get_latest_everyday_news',
	description: 'Get the latest daily 60-second news summary in Chinese. Returns a curated list of the most important news items from today.',
	
	inputSchema: z.object({
		use_mirror: z.boolean()
			.describe('Use China mirror site for faster access')
			.default(false)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		date: z.string().describe('News date (YYYY-MM-DD)'),
		news_count: z.number().describe('Number of news items'),
		news: z.array(z.string()).describe('Array of news items'),
		source: z.string().describe('News source'),
		api_url: z.string().describe('API URL used')
	}).describe('Latest daily news summary'),
	
	execute: async ({ context }) => {
		const { use_mirror } = context;
		const baseUrl = use_mirror ? EVERYDAY_NEWS_MIRROR : EVERYDAY_NEWS_BASE;
		const url = `${baseUrl}/latest.json`;
		
		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});
		
		if (response.status !== 200) {
			throw new Error(`API request failed with status ${response.status}: ${response.text}`);
		}
		
		const data = response.json;
		
		if (!data || !data.date || !Array.isArray(data.content)) {
			throw new Error('Invalid response format from EverydayNews API');
		}
		
		return {
			date: data.date,
			news_count: data.content.length,
			news: data.content,
			source: 'EverydayNews',
			api_url: url
		};
	}
});

/**
 * Tool: Get everyday news by date
 */
export const getEverydayNewsByDateTool = createMastraTool({
  category: 'news-info',
	id: 'get_everyday_news_by_date',
	description: 'Get daily 60-second news summary for a specific date. Supports dates from 2022-06-04 onwards. Returns news in Chinese.',
	
	inputSchema: z.object({
		date: z.string()
			.min(1)
			.describe('Date in YYYY-MM-DD format (e.g., "2025-01-01"). Must be between 2022-06-04 and today.'),
		use_mirror: z.boolean()
			.describe('Use China mirror site for faster access')
			.default(false)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		date: z.string().describe('News date (YYYY-MM-DD)'),
		requested_date: z.string().describe('Requested date'),
		news_count: z.number().describe('Number of news items'),
		news: z.array(z.string()).describe('Array of news items'),
		source: z.string().describe('News source'),
		api_url: z.string().describe('API URL used')
	}).describe('Daily news summary for specific date'),
	
	execute: async ({ context }) => {
		const { date, use_mirror } = context;
		
		// Parse and validate date
		const dateObj = parseDate(date);
		const minDate = new Date(2022, 5, 4); // 2022-06-04
		const maxDate = new Date();
		
		if (dateObj < minDate) {
			throw new Error(`Date must be on or after 2022-06-04. Provided: ${formatDateDisplay(dateObj)}`);
		}
		
		if (dateObj > maxDate) {
			throw new Error(`Date cannot be in the future. Provided: ${formatDateDisplay(dateObj)}`);
		}
		
		const baseUrl = use_mirror ? EVERYDAY_NEWS_MIRROR : EVERYDAY_NEWS_BASE;
		const year = dateObj.getFullYear();
		const month = String(dateObj.getMonth() + 1).padStart(2, '0');
		const day = String(dateObj.getDate()).padStart(2, '0');
		const url = `${baseUrl}/data/${year}/${month}/${day}.json`;
		
		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});
		
		if (response.status === 404) {
			throw new Error(`No news data available for ${formatDateDisplay(dateObj)}. This date might be before the service started (2022-06-04) or the data hasn't been published yet.`);
		}
		
		if (response.status !== 200) {
			throw new Error(`API request failed with status ${response.status}: ${response.text}`);
		}
		
		const data = response.json;
		
		if (!data || !data.date || !Array.isArray(data.content)) {
			throw new Error('Invalid response format from EverydayNews API');
		}
		
		return {
			date: data.date,
			requested_date: formatDateDisplay(dateObj),
			news_count: data.content.length,
			news: data.content,
			source: 'EverydayNews',
			api_url: url
		};
	}
});

/**
 * Tool: Get recent everyday news
 */
export const getRecentEverydayNewsTool = createMastraTool({
  category: 'news-info',
	id: 'get_recent_everyday_news',
	description: 'Get daily 60-second news summaries for the past N days (1-30 days). Returns chronological news in Chinese.',
	
	inputSchema: z.object({
		days: z.number()
			.min(1)
			.max(30)
			.describe('Number of days to fetch (1-30)')
			.default(7),
		use_mirror: z.boolean()
			.describe('Use China mirror site for faster access')
			.default(false)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		requested_days: z.number().describe('Number of days requested'),
		fetched_days: z.number().describe('Number of days with news returned'),
		date_range: z.object({
			from: z.string().describe('Start date'),
			to: z.string().describe('End date')
		}).describe('Date range covered'),
		total_news_items: z.number().describe('Total number of news items'),
		daily_news: z.array(z.object({
			date: z.string().describe('Date (YYYY-MM-DD)'),
			news_count: z.number().describe('Number of news items for this date'),
			news: z.array(z.string()).describe('News items for this date')
		})).describe('News grouped by date'),
		errors: z.array(z.string()).optional().describe('Errors encountered'),
		source: z.string().describe('News source')
	}).describe('Recent daily news summaries'),
	
	execute: async ({ context }) => {
		const { days, use_mirror } = context;
		
		const baseUrl = use_mirror ? EVERYDAY_NEWS_MIRROR : EVERYDAY_NEWS_BASE;
		const allNews: any[] = [];
		const errors: string[] = [];
		const today = new Date();
		
		// Fetch news for each day
		for (let i = 0; i < days; i++) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			
			// Skip if before service start date
			const minDate = new Date(2022, 5, 4);
			if (date < minDate) {
				break;
			}
			
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const url = `${baseUrl}/data/${year}/${month}/${day}.json`;
			
			try {
				const response = await requestUrl({
					url: url,
					method: 'GET',
					throw: false,
					headers: {
						'Accept': 'application/json',
						'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
					}
				});
				
				if (response.status === 200) {
					const data = response.json;
					if (data && data.date && Array.isArray(data.content)) {
						allNews.push({
							date: data.date,
							news_count: data.content.length,
							news: data.content
						});
					}
				} else if (response.status === 404) {
					errors.push(`No data for ${formatDateDisplay(date)}`);
				}
			} catch (err) {
				errors.push(`Failed to fetch ${formatDateDisplay(date)}: ${(err as Error).message || String(err)}`);
			}
			
			// Add small delay to avoid overwhelming the server
			if (i < days - 1) {
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		}
		
		if (allNews.length === 0) {
			throw new Error('No news data could be retrieved for the specified period');
		}
		
		return {
			requested_days: days,
			fetched_days: allNews.length,
			date_range: {
				from: allNews[allNews.length - 1]?.date,
				to: allNews[0]?.date
			},
			total_news_items: allNews.reduce((sum, day) => sum + day.news_count, 0),
			daily_news: allNews,
			errors: errors.length > 0 ? errors : undefined,
			source: 'EverydayNews'
		};
	}
});

/**
 * Tool: Search everyday news
 */
export const searchEverydayNewsTool = createMastraTool({
  category: 'news-info',
	id: 'search_everyday_news',
	description: 'Search for specific keywords in historical daily news from the past N days. Returns matching news items with dates.',
	
	inputSchema: z.object({
		keyword: z.string()
			.min(1)
			.describe('Keyword to search for in news content (Chinese or English)'),
		days: z.number()
			.min(1)
			.max(90)
			.describe('Number of past days to search (1-90)')
			.default(30),
		use_mirror: z.boolean()
			.describe('Use China mirror site for faster access')
			.default(false)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		keyword: z.string().describe('Search keyword'),
		searched_days: z.number().describe('Number of days searched'),
		days_with_matches: z.number().describe('Days with matching news'),
		total_matches: z.number().describe('Total matching news items found'),
		matches: z.array(z.object({
			date: z.string().describe('News date (YYYY-MM-DD)'),
			matching_count: z.number().describe('Number of matches on this date'),
			matching_news: z.array(z.string()).describe('Matching news items')
		})).describe('Matching news items by date'),
		source: z.string().describe('News source'),
		note: z.string().optional().describe('Additional notes if no matches found')
	}).describe('Search results for everyday news'),
	
	execute: async ({ context }) => {
		const { keyword, days, use_mirror } = context;
		
		const baseUrl = use_mirror ? EVERYDAY_NEWS_MIRROR : EVERYDAY_NEWS_BASE;
		const matches: any[] = [];
		const today = new Date();
		const searchKeyword = keyword.trim().toLowerCase();
		
		// Search through historical news
		for (let i = 0; i < days; i++) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			
			// Skip if before service start date
			const minDate = new Date(2022, 5, 4);
			if (date < minDate) {
				break;
			}
			
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const url = `${baseUrl}/data/${year}/${month}/${day}.json`;
			
			try {
				const response = await requestUrl({
					url: url,
					method: 'GET',
					throw: false,
					headers: {
						'Accept': 'application/json',
						'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
					}
				});
				
				if (response.status === 200) {
					const data = response.json;
					if (data && data.date && Array.isArray(data.content)) {
						const matchingNews = data.content.filter((item: string) => 
							item.toLowerCase().includes(searchKeyword)
						);
						
						if (matchingNews.length > 0) {
							matches.push({
								date: data.date,
								matching_count: matchingNews.length,
								matching_news: matchingNews
							});
						}
					}
				}
			} catch (err) {
				// Silently skip dates with errors
				continue;
			}
			
			// Add small delay to avoid overwhelming the server
			if (i < days - 1) {
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		}
		
		return {
			keyword: keyword,
			searched_days: days,
			days_with_matches: matches.length,
			total_matches: matches.reduce((sum, day) => sum + day.matching_count, 0),
			matches: matches,
			source: 'EverydayNews',
			note: matches.length === 0 ? `No news items found containing "${keyword}" in the past ${days} days` : undefined
		};
	}
});
