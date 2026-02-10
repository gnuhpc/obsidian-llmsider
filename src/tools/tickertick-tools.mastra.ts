/**
 * TickerTick Tools
 * Migrated from tickertick-tools.ts to Mastra framework
 * 
 * Provides comprehensive US stock news and data via TickerTick API:
 * - Stock ticker search (10,000+ US stocks)
 * - Ticker news stories
 * - News by type (earnings, SEC, market, analysis, etc.)
 * - News by source (WSJ, CNBC, Bloomberg, etc.)
 * - Entity-based news search
 * - Advanced query capabilities
 * - SEC filings retrieval
 * 
 * Rate limit: 10 requests per minute per IP
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

const TICKERTICK_API_BASE = 'https://api.tickertick.com';
const RATE_LIMIT_WARNING = 'Note: TickerTick API has a rate limit of 10 requests per minute per IP address.';

/**
 * Ticker match modes
 * z: - Exact/strict matching (fewer, more relevant results)
 * tt: - Broad matching (more stories)
 * TT: - Very broad matching (maximum coverage)
 */
export enum TickerMatchMode {
	EXACT = 'z',      // z:ticker - Strict matching
	BROAD = 'tt',     // tt:ticker - Broad matching (default)
	VERY_BROAD = 'TT' // TT:ticker - Maximum coverage
}

/**
 * Story types available in TickerTick API
 */
export enum StoryType {
	CURATED = 'T:curated',
	EARNING = 'T:earning',
	MARKET = 'T:market',
	SEC = 'T:sec',
	SEC_FIN = 'T:sec_fin',
	TRADE = 'T:trade',
	UGC = 'T:ugc',
	ANALYSIS = 'T:analysis',
	INDUSTRY = 'T:industry'
}

/**
 * Normalize ticker input to array format with enhanced error tolerance
 * Handles common input variations from AI agents:
 * - Single ticker string -> [ticker]
 * - "ticker" param -> "tickers" array
 * - Filters empty/null values
 * - Converts to uppercase
 */
function normalizeTickers(context: any): string[] {
	let tickerInput: any = context.tickers || context.ticker;
	
	// Handle empty input
	if (!tickerInput) {
		return [];
	}
	
	// Convert single string to array
	if (typeof tickerInput === 'string') {
		tickerInput = [tickerInput];
	}
	
	// Ensure array and filter/normalize
	const tickers = Array.isArray(tickerInput) ? tickerInput : [tickerInput];
	
	return tickers
		.filter((t: any) => t && typeof t === 'string' && t.trim().length > 0)
		.map((t: string) => t.trim().toUpperCase());
}

/**
 * Helper function to build TickerTick query strings
 */
function buildQuery(params: {
	tickers?: string[];
	sources?: string[];
	entities?: string[];
	storyTypes?: StoryType[];
	operator?: 'and' | 'or' | 'diff';
	tickerMatchMode?: TickerMatchMode;
}): string {
	const { tickers, sources, entities, storyTypes, operator = 'or', tickerMatchMode = TickerMatchMode.BROAD } = params;
	const terms: string[] = [];

	if (tickers && tickers.length > 0) {
		terms.push(...tickers.map(t => `${tickerMatchMode}:${t.toLowerCase()}`));
	}

	if (sources && sources.length > 0) {
		terms.push(...sources.map(s => `s:${s.toLowerCase().replace(/\./g, '')}`));
	}

	if (entities && entities.length > 0) {
		terms.push(...entities.map(e => `E:${e.toLowerCase().replace(/\s+/g, '_')}`));
	}

	if (storyTypes && storyTypes.length > 0) {
		terms.push(...storyTypes);
	}

	if (terms.length === 0) {
		throw new Error('At least one query parameter (ticker, source, entity, or story type) must be provided');
	}

	if (terms.length === 1) {
		return terms[0];
	}

	if (operator === 'diff') {
		if (terms.length !== 2) {
			throw new Error('Diff operator requires exactly 2 query terms');
		}
		return `(diff ${terms[0]} ${terms[1]})`;
	}

	return `(${operator} ${terms.join(' ')})`;
}

/**
 * Parse TickerTick API response with enhanced error handling
 * Handles HTML responses, JSON parsing errors, and rate limiting
 */
function parseTickerTickResponse(response: any, toolName: string): any {
	// Check status code
	if (response.status === 429) {
		throw new Error('TickerTick API rate limit exceeded (10 requests/minute). Please wait and try again.');
	}

	if (response.status !== 200) {
		const preview = response.text?.substring(0, 200) || 'No response body';
		throw new Error(`TickerTick API (${toolName}) failed with HTTP ${response.status}. Response: ${preview}`);
	}

	// Check content type - API should return JSON
	const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
	if (contentType.toLowerCase().includes('text/html')) {
		const htmlPreview = response.text?.substring(0, 300) || '';
		throw new Error(`TickerTick API (${toolName}) returned HTML instead of JSON. This usually indicates:
• API endpoint has changed or is temporarily unavailable
• Authentication/API key may be required now
• IP address might be blocked or rate-limited
• Service maintenance or outage

HTML Response preview:
${htmlPreview}

Suggestion: Check https://api.tickertick.com status or try again later.`);
	}

	// Try to parse JSON
	let data: any;
	try {
		data = response.json;
	} catch (error) {
		const textPreview = response.text?.substring(0, 300) || 'No response text';
		throw new Error(`TickerTick API (${toolName}) returned invalid JSON: ${error.message}

Response preview:
${textPreview}`);
	}

	return data;
}

/**
 * Search for stock tickers
 * 搜索股票代码
 */
export const tickertickSearchTickersTool = createMastraTool({
  category: 'news-info',
	id: 'tickertick_search_tickers',
	description: 'Search for US stock ticker symbols by company name or partial ticker. WHEN TO USE: When user mentions a company name but you need the stock ticker symbol (e.g., "Tesla" -> "TSLA"). Returns official ticker symbols, company names, and SEC CIK numbers. Supports partial matching.',
	inputSchema: z.object({
		query: z.string()
			.min(2, 'Query must be at least 2 characters')
			.describe('Company name or partial ticker to search. Examples: "Tesla" finds TSLA, "Apple" finds AAPL, "Micro" finds Microsoft, "goo" finds GOOG/GOOGL. Case-insensitive, partial matches work well.'),
		limit: z.number()
			.int()
			.min(1)
			.max(50)
			.optional()
			.default(10)
			.describe('Maximum number of results to return. Default: 10, increase if searching broad terms')
	}),
	outputSchema: z.object({
		success: z.boolean().describe('Whether the request was successful'),
		query: z.string().optional().describe('Search query'),
		count: z.number().optional().describe('Number of results returned'),
		tickers: z.array(z.object({
			ticker: z.string().describe('Stock ticker symbol (e.g., "cost" for Costco)'),
			company_name: z.string().describe('Full company name'),
			cik: z.string().optional().describe('SEC CIK number'),
			country: z.string().optional().describe('Country code (e.g., "us")')
		})).optional().describe('List of matching stock tickers'),
		suggestion: z.string().optional().describe('Search suggestion when no results found'),
		rate_limit: z.string().optional().describe('API rate limit warning'),
		error: z.string().optional().describe('Error type'),
		message: z.string().optional().describe('Error details'),
		timestamp: z.string().optional().describe('Timestamp')
	}).describe('Stock ticker search results structure'),
	execute: async ({ context }) => {
		const { query, limit } = context;

		if (!query || query.trim().length === 0) {
			throw new Error('Search query cannot be empty');
		}

		const url = `${TICKERTICK_API_BASE}/tickers?p=${encodeURIComponent(query)}&n=${limit}`;

		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});

		const data = parseTickerTickResponse(response, 'tickertick_search_tickers');

		const result: any = {
			success: true,
			query: query,
			count: data.tickers?.length || 0,
			tickers: data.tickers || [],
			rate_limit: RATE_LIMIT_WARNING
		};

		if (result.count === 0) {
			result.suggestion = 'No results found. Try: 1) Using the official company name (e.g., "Alphabet" for Google); 2) Using partial ticker symbols (e.g., "goo" for GOOG/GOOGL); 3) Using shorter partial matches (3-4 characters work best).';
		}

		return result;
	}
});

/**
 * Get ticker news
 * 获取股票新闻
 */
export const tickertickGetTickerNewsTool = createMastraTool({
  category: 'news-info',
	id: 'tickertick_get_ticker_news',
	description: 'Get latest news articles for specific stock ticker symbols. WHEN TO USE: When user asks for news about a specific stock (e.g., "Tesla news", "what\'s happening with AAPL"). Returns comprehensive news with title, URL, source, timestamp, description, and related tickers. IMPORTANT: Use ticker symbols (TSLA, AAPL) not company names - call tickertick_search_tickers first if you only have company name.',
	inputSchema: z.object({
		tickers: z.array(z.string())
			.min(1, 'At least one ticker symbol is required')
			.describe('Stock ticker symbols (NOT company names). Examples: ["TSLA"], ["AAPL", "MSFT"], ["GOOG"]. Must be uppercase stock symbols like TSLA, AAPL, MSFT.'),
		match_mode: z.enum(['exact', 'broad', 'very_broad'])
			.optional()
			.default('broad')
			.describe('Matching strictness: "exact" = only news directly about this ticker (fewest, most precise); "broad" = balanced relevance (DEFAULT, recommended); "very_broad" = any mention of ticker (most coverage). Use "exact" for focused analysis, "broad" for general news, "very_broad" for comprehensive coverage.'),
		limit: z.number()
			.int()
			.min(1)
			.max(200)
			.optional()
			.default(50)
			.describe('Number of news articles to return (1-200). Default: 50. Use 10-20 for quick updates, 50-100 for comprehensive analysis.'),
		last_id: z.string()
			.optional()
			.describe('Pagination ID from previous response to fetch older news. Omit for first page/latest news.')
	}),
	outputSchema: z.object({
		stories: z.array(z.object({
			id: z.string().describe('Unique story ID'),
			title: z.string().describe('News title'),
			url: z.string().describe('News URL'),
			site: z.string().describe('Source website'),
			time: z.number().describe('Unix timestamp (ms)'),
			description: z.string().optional().describe('News summary'),
			tags: z.array(z.string()).optional().describe('Related ticker symbols'),
			similar_stories: z.array(z.string()).optional().describe('IDs of similar stories')
		})),
		last_id: z.string().optional().describe('Last story ID for pagination'),
		count: z.number().describe('Number of stories returned')
	}).describe('News stories with metadata'),
	execute: async ({ context }) => {
		// Normalize tickers with enhanced error tolerance (handles ticker/tickers, string/array)
		const tickers = normalizeTickers(context);
		const { match_mode = 'broad', limit = 50, last_id } = context;

		if (!tickers || tickers.length === 0) {
			throw new Error('At least one ticker symbol must be provided. Use tickertick_search_tickers to find ticker symbols if you only have company names.');
		}

		// Map match_mode to TickerMatchMode enum
		const modeMap: Record<string, TickerMatchMode> = {
			'exact': TickerMatchMode.EXACT,
			'broad': TickerMatchMode.BROAD,
			'very_broad': TickerMatchMode.VERY_BROAD
		};

		const query = buildQuery({ 
			tickers, 
			operator: tickers.length > 1 ? 'or' : undefined,
			tickerMatchMode: modeMap[match_mode]
		});
		
		let url = `${TICKERTICK_API_BASE}/feed?q=${encodeURIComponent(query)}&n=${Math.min(limit, 200)}`;
		
		if (last_id) {
			url += `&last=${encodeURIComponent(last_id)}`;
		}

		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});

		const data = parseTickerTickResponse(response, 'tickertick_get_ticker_news');

		// Return full story objects with metadata
		const stories = (data.stories || []).map((story: any) => ({
			id: story.id,
			title: story.title,
			url: story.url,
			site: story.site,
			time: story.time,
			description: story.description,
			tags: story.tags || story.tickers || [],
			similar_stories: story.similar_stories
		}));

		return {
			stories,
			last_id: data.last_id,
			count: stories.length
		};
	}
});

/**
 * Get most important news (using tag:_best_ feature)
 * 获取最重要的股票新闻
 */
export const tickertickGetImportantNewsTool = createMastraTool({
  category: 'news-info',
	id: 'tickertick_get_important_news',
	description: 'Get ONLY the most significant/breaking news for stock tickers. WHEN TO USE: When user wants "important news", "breaking news", "major updates", or "key developments". Filters for high-impact stories using: 1) TickerTick\'s "best" editorial tag, 2) Story clustering (multiple sources covering same event = important). Each story gets an importance score 1-10. AUTO-FILTERS noise like routine trading updates.',
	inputSchema: z.object({
		tickers: z.array(z.string())
			.min(1)
			.describe('Stock ticker symbols (uppercase). Examples: ["TSLA"], ["META", "AMZN"]'),
		match_mode: z.enum(['exact', 'broad', 'very_broad'])
			.optional()
			.default('very_broad')
			.describe('Matching mode. Default: "very_broad" (recommended for important news to catch all significant stories)'),
		min_cluster_size: z.number()
			.int()
			.min(2)
			.optional()
			.default(3)
			.describe('Minimum similar stories to consider important. Default: 3 (story covered by 3+ sources = significant). Lower to 2 for more results, raise to 5+ for only major breaking news.'),
		limit: z.number()
			.int()
			.min(1)
			.max(200)
			.optional()
			.default(100)
			.describe('Stories to scan before filtering. Default: 100. Higher values find more important stories but slower.')
	}),
	outputSchema: z.object({
		important_stories: z.array(z.object({
			id: z.string(),
			title: z.string(),
			url: z.string(),
			site: z.string(),
			time: z.number(),
			description: z.string().optional(),
			tags: z.array(z.string()),
			similar_stories_count: z.number().describe('Number of similar stories (cluster size)'),
			is_best_tagged: z.boolean().describe('Whether story has _best_ tag'),
			importance_score: z.number().describe('Calculated importance (1-10)')
		})),
		total_fetched: z.number(),
		important_count: z.number()
	}).describe('Important news stories ranked by significance'),
	execute: async ({ context }) => {
		// Normalize tickers with enhanced error tolerance
		const tickers = normalizeTickers(context);
		const { match_mode = 'very_broad', min_cluster_size = 3, limit = 100 } = context;

		if (!tickers || tickers.length === 0) {
			throw new Error('At least one ticker symbol must be provided. Use tickertick_search_tickers to find ticker symbols if you only have company names.');
		}

		// Build query: (diff (or TT:ticker1 TT:ticker2 tag:_best_) (or T:trade T:market T:ugc))
		// This filters out trading/market/ugc noise while including best-tagged stories
		const modeMap: Record<string, TickerMatchMode> = {
			'exact': TickerMatchMode.EXACT,
			'broad': TickerMatchMode.BROAD,
			'very_broad': TickerMatchMode.VERY_BROAD
		};
		
		const tickerTerms = tickers.map(t => `${modeMap[match_mode]}:${t.toLowerCase()}`).join(' ');
		const bestTag = 'tag:_best_';
		
		// Complex query: include broad ticker matches OR best-tagged stories, EXCLUDE noise
		const query = `(diff (or ${tickerTerms} (and ${bestTag} (or ${tickers.map(t => `tt:${t.toLowerCase()}`).join(' ')}))) (or T:trade T:market T:ugc))`;

		const url = `${TICKERTICK_API_BASE}/feed?q=${encodeURIComponent(query)}&n=${Math.min(limit, 200)}`;

		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});

		const data = parseTickerTickResponse(response, 'tickertick_get_important_news');

		// Filter and score stories
		const allStories = data.stories || [];
		const importantStories = allStories
			.filter((story: any) => {
				const hasBestTag = (story.tags || []).includes('_best_');
				const clusterSize = (story.similar_stories || []).length;
				return hasBestTag || clusterSize >= min_cluster_size;
			})
			.map((story: any) => {
				const hasBestTag = (story.tags || []).includes('_best_');
				const clusterSize = (story.similar_stories || []).length;
				
				// Importance score: 1-10
				// Best tag = +5, cluster size contributes up to 5
				let score = hasBestTag ? 5 : 0;
				score += Math.min(5, Math.floor(clusterSize / 2));
				
				return {
					id: story.id,
					title: story.title,
					url: story.url,
					site: story.site,
					time: story.time,
					description: story.description,
					tags: (story.tags || story.tickers || []).filter((t: string) => t !== '_best_'),
					similar_stories_count: clusterSize,
					is_best_tagged: hasBestTag,
					importance_score: score
				};
			})
			.sort((a: any, b: any) => b.importance_score - a.importance_score);

		return {
			important_stories: importantStories,
			total_fetched: allStories.length,
			important_count: importantStories.length
		};
	}
});

/**
 * Get news by type
 * 获取特定类型的股票新闻
 */
export const tickertickGetNewsByTypeTool = createMastraTool({
  category: 'news-info',
	id: 'tickertick_get_news_by_type',
	description: 'Get news filtered by specific category type. WHEN TO USE: User asks for specific types like "earnings reports", "SEC filings", "market news", "analysis". CATEGORIES: "curated" (top-tier sources only), "earning" (earnings calls/reports), "market" (market-wide news), "sec" (regulatory filings), "sec_fin" (quarterly/annual financial reports), "trade" (trading activity), "analysis" (analyst reports), "industry" (sector news), "ugc" (user-generated). Can optionally filter by ticker.',
	inputSchema: z.object({
		story_type: z.enum(['curated', 'earning', 'market', 'sec', 'sec_fin', 'trade', 'ugc', 'analysis', 'industry'])
			.describe('News category. CHOOSE: "curated" = premium sources (WSJ/Bloomberg/etc), "earning" = earnings reports/calls, "market" = broad market news, "sec" = SEC regulatory filings, "sec_fin" = quarterly/annual financial statements, "trade" = trading activity news, "analysis" = analyst ratings/reports, "industry" = sector/industry news, "ugc" = social/user content'),
		tickers: z.array(z.string())
			.optional()
			.describe('OPTIONAL: Stock ticker symbols to filter results. Leave empty for category-wide news. Example: ["TSLA", "AAPL"] for Tesla and Apple earnings only.'),
		limit: z.number()
			.int()
			.min(1)
			.max(200)
			.optional()
			.default(50)
			.describe('Number of results (1-200). Default: 50'),
		last_id: z.string()
			.optional()
			.describe('Pagination ID for older news. Omit for latest.')
	}),
	outputSchema: z.array(z.string()).describe('Array of news URLs'),
	execute: async ({ context }) => {
		const { story_type, limit, last_id } = context;
		
		// Normalize tickers (optional for this tool)
		const tickers = normalizeTickers(context);

		const storyTypeMap: Record<string, StoryType> = {
			'curated': StoryType.CURATED,
			'earning': StoryType.EARNING,
			'market': StoryType.MARKET,
			'sec': StoryType.SEC,
			'sec_fin': StoryType.SEC_FIN,
			'trade': StoryType.TRADE,
			'ugc': StoryType.UGC,
			'analysis': StoryType.ANALYSIS,
			'industry': StoryType.INDUSTRY
		};

		const storyTypes = [storyTypeMap[story_type]];
		if (!storyTypes[0]) {
			throw new Error(`Invalid story type: ${story_type}`);
		}

		const query = buildQuery({ 
			tickers: tickers.length > 0 ? tickers : undefined, 
			storyTypes,
			operator: 'and'
		});

		let url = `${TICKERTICK_API_BASE}/feed?q=${encodeURIComponent(query)}&n=${Math.min(limit, 200)}`;
		
		if (last_id) {
			url += `&last=${encodeURIComponent(last_id)}`;
		}

		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});

		const data = parseTickerTickResponse(response, 'tickertick_get_news_by_type');

		const urls = (data.stories || [])
			.map((story: any) => story.url)
			.filter((url: any) => url && typeof url === 'string');

		return urls;
	}
});

/**
 * Get news by source
 * 按新闻源获取新闻
 */
export const tickertickGetNewsBySourceTool = createMastraTool({
  category: 'news-info',
	id: 'tickertick_get_news_by_source',
	description: 'Get news from specific news sources/publications (e.g., WSJ, CNBC, Bloomberg, Reuters). WHEN TO USE: User asks for news from a specific publication like "WSJ articles about Tesla", "Bloomberg coverage of AAPL", or "Reuters market news". Can optionally filter by ticker symbols.',
	inputSchema: z.object({
		sources: z.array(z.string()).describe('News source domain names WITHOUT dots. Examples: ["wsj"] for Wall Street Journal, ["cnbc"], ["bloomberg"], ["reuters"], ["nytimes"]. Common sources: wsj, cnbc, bloomberg, reuters, seekingalpha, fool, marketwatch, barrons, forbes'),
		tickers: z.array(z.string())
			.optional()
			.describe('OPTIONAL: Filter by stock ticker symbols. Example: ["TSLA"] to get only Tesla news from specified sources. Leave empty for all news from sources.'),
		limit: z.number()
			.optional()
			.default(50)
			.describe('Number of news items to return (1-200). Default: 50'),
		last_id: z.string()
			.optional()
			.describe('Pagination ID for older news. Omit for latest.')
	}).describe('Tool input parameters'),
	outputSchema: z.array(z.string()).describe('Array of news article URLs'),
	execute: async ({ context }) => {
		const { sources, limit, last_id } = context;
		
		// Normalize tickers (optional for this tool)
		const tickers = normalizeTickers(context);

		if (!sources || sources.length === 0) {
			throw new Error('At least one source must be provided');
		}

		const query = buildQuery({ 
			sources, 
			tickers: tickers.length > 0 ? tickers : undefined,
			operator: tickers.length > 0 ? 'and' : 'or'
		});

		let url = `${TICKERTICK_API_BASE}/feed?q=${encodeURIComponent(query)}&n=${Math.min(limit, 200)}`;
		
		if (last_id) {
			url += `&last=${encodeURIComponent(last_id)}`;
		}

		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});

		const data = parseTickerTickResponse(response, 'tickertick_get_news_by_source');

		const urls = (data.stories || [])
			.map((story: any) => story.url)
			.filter((url: any) => url && typeof url === 'string');

		return urls;
	}
});

/**
 * Search by entity
 * 按实体搜索新闻
 */
export const tickertickSearchByEntityTool = createMastraTool({
  category: 'news-info',
	id: 'tickertick_search_by_entity',
	description: 'Search news by named entities mentioned in article titles (people, products, concepts). WHEN TO USE: User asks about a person ("Elon Musk news"), product ("iPhone", "ChatGPT"), or concept ("artificial intelligence") that is NOT a ticker symbol. For stock-related searches, use ticker-based tools instead. ENTITY EXAMPLES: "elon_musk", "chatgpt", "iphone", "covid", "artificial_intelligence".',
	inputSchema: z.object({
		entities: z.array(z.string()).describe('Entity names (lowercase, spaces replaced with underscores). Examples: ["elon_musk"] for Elon Musk, ["chatgpt"] for ChatGPT, ["artificial_intelligence"] for AI, ["iphone"] for iPhone. Format: all lowercase, use underscores for spaces.'),
		limit: z.number()
			.optional()
			.default(50)
			.describe('Number of news items (1-200). Default: 50'),
		last_id: z.string()
			.optional()
			.describe('Pagination ID for older news. Omit for latest.')
	}).describe('Tool input parameters'),
	outputSchema: z.array(z.string()).describe('Array of news URLs'),
	execute: async ({ context }) => {
		const { entities, limit, last_id } = context;

		if (!entities || entities.length === 0) {
			throw new Error('At least one entity must be provided');
		}

		const query = buildQuery({ 
			entities,
			operator: entities.length > 1 ? 'or' : undefined
		});

		let url = `${TICKERTICK_API_BASE}/feed?q=${encodeURIComponent(query)}&n=${Math.min(limit, 200)}`;
		
		if (last_id) {
			url += `&last=${encodeURIComponent(last_id)}`;
		}

		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});

		const data = parseTickerTickResponse(response, 'tickertick_search_by_entity');

		const urls = (data.stories || [])
			.map((story: any) => story.url)
			.filter((url: any) => url && typeof url === 'string');

		return urls;
	}
});

/**
 * Advanced query
 * 高级查询
 */
export const tickertickAdvancedQueryTool = createMastraTool({
  category: 'news-info',
	id: 'tickertick_advanced_query',
	description: 'Execute advanced TickerTick queries with complex boolean logic. WHEN TO USE: When simple tools don\'t fit - need complex combinations of tickers, sources, types, entities. USE OTHER TOOLS FIRST - this is for power users only. OPERATORS: "and" (all terms), "or" (any term), "diff" (exclude). PREFIXES: tt:/z:/TT: (ticker), s: (source), E: (entity), T: (type), tag: (tags).',
	inputSchema: z.object({
		query: z.string().describe('Custom TickerTick query string. EXAMPLES: "tt:aapl" (Apple news, broad), "(and tt:tsla T:earning)" (Tesla earnings only), "(or tt:meta tt:goog)" (Meta OR Google), "(diff tt:aapl s:seekingalpha)" (Apple news EXCLUDING Seeking Alpha), "(and s:wsj (or tt:tsla tt:aapl))" (WSJ articles about Tesla OR Apple). SYNTAX: Use lowercase for tickers/sources/entities, combine with (and/or/diff ...)'),
		limit: z.number()
			.optional()
			.default(50)
			.describe('Number of results (1-200). Default: 50'),
		last_id: z.string()
			.optional()
			.describe('Pagination ID for older news. Omit for latest.')
	}).describe('Tool input parameters'),
	outputSchema: z.array(z.string()).describe('Array of news URLs'),
	execute: async ({ context }) => {
		const { query, limit, last_id } = context;

		if (!query || query.trim().length === 0) {
			throw new Error('Query string cannot be empty');
		}

		let url = `${TICKERTICK_API_BASE}/feed?q=${encodeURIComponent(query)}&n=${Math.min(limit, 200)}`;
		
		if (last_id) {
			url += `&last=${encodeURIComponent(last_id)}`;
		}

		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});

		const data = parseTickerTickResponse(response, 'tickertick_advanced_query');

		const urls = (data.stories || [])
			.map((story: any) => story.url)
			.filter((url: any) => url && typeof url === 'string');

		return urls;
	}
});

/**
 * Get SEC filings
 * 获取SEC文件
 */
export const tickertickGetSECFilingsTool = createMastraTool({
  category: 'news-info',
	id: 'tickertick_get_sec_filings',
	description: 'Get SEC regulatory filings for stock tickers (10-K annual reports, 10-Q quarterly reports, 8-K current reports, etc.). WHEN TO USE: User asks for "SEC filings", "10-K", "10-Q", "8-K", "quarterly report", "annual report", or "regulatory filings". Returns official SEC document links.',
	inputSchema: z.object({
		tickers: z.array(z.string()).describe('Stock ticker symbols. Example: ["AAPL"], ["TSLA", "MSFT"]'),
		filing_type: z.enum(['all', 'financial_reports'])
			.optional()
			.default('all')
			.describe('Filing type filter: "all" = all SEC filings (10-K, 10-Q, 8-K, S-1, etc.), "financial_reports" = only periodic financial statements (10-K annual, 10-Q quarterly). Use "financial_reports" when user specifically wants earnings/financial reports.'),
		limit: z.number()
			.optional()
			.default(50)
			.describe('Number of filings to return (1-200). Default: 50'),
		last_id: z.string()
			.optional()
			.describe('Pagination ID for older filings. Omit for latest.')
	}).describe('Tool input parameters'),
	outputSchema: z.array(z.string()).describe('Array of SEC filing URLs'),
	execute: async ({ context }) => {
		// Normalize tickers with enhanced error tolerance
		const tickers = normalizeTickers(context);
		const { filing_type, limit, last_id } = context;

		if (!tickers || tickers.length === 0) {
			throw new Error('At least one ticker must be provided. Use tickertick_search_tickers to find ticker symbols if you only have company names.');
		}

		const storyType = filing_type === 'financial_reports' ? StoryType.SEC_FIN : StoryType.SEC;
		const query = buildQuery({ 
			tickers, 
			storyTypes: [storyType],
			operator: 'and'
		});

		let url = `${TICKERTICK_API_BASE}/feed?q=${encodeURIComponent(query)}&n=${Math.min(limit, 200)}`;
		
		if (last_id) {
			url += `&last=${encodeURIComponent(last_id)}`;
		}

		const response = await requestUrl({
			url: url,
			method: 'GET',
			throw: false,
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)'
			}
		});

		const data = parseTickerTickResponse(response, 'tickertick_get_sec_filings');

		const urls = (data.stories || [])
			.map((story: any) => story.url)
			.filter((url: any) => url && typeof url === 'string');

		return urls;
	}
});
