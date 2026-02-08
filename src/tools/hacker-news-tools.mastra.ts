/**
 * Hacker News Tools (Mastra Format)
 * 
 * Access Hacker News stories, comments, users, and search using the Algolia HN Search API
 * Free public API - no authentication required
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';
import { fetchWebContent } from './utils/web-fetcher';

/**
 * Tool: Search Hacker News stories by relevance
 */
export const hnSearchStoriesTool = createMastraTool({
  category: 'news-info',
	id: 'hn_search_stories',
	description: 'Search Hacker News stories by keyword. Results are sorted by relevance, then points, then number of comments. Returns story title, URL, author, points, and comment count.',
	
	inputSchema: z.object({
		query: z.string()
			.min(1)
			.describe('Search query keywords'),
		page: z.number()
			.min(0)
			.describe('Page number.')
			.default(0),
		hits_per_page: z.number()
			.min(1)
			.max(100)
			.describe('Number of results per page (1-100).')
			.default(20),
		tags: z.string()
			.describe('Optional filter tags. Can use: story, comment, poll, pollopt, show_hn, ask_hn, front_page, author_USERNAME, story_ID')
			.default('story')
	}).describe('Tool input parameters'),
	
	outputSchema: z.string().describe('Formatted Hacker News search results'),
	
	execute: async ({ context }) => {
		const query = context.query;
		const page = context.page;
		const hitsPerPage = context.hits_per_page;
		const tags = context.tags;
		
		if (!query || query.trim().length === 0) {
			throw new Error('Search query cannot be empty');
		}
		
		const url = `http://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=${encodeURIComponent(tags)}&page=${page}&hitsPerPage=${hitsPerPage}`;
		
		const response = await requestUrl({ url, method: 'GET' });
		const data = response.json;
		
		if (!data.hits || data.hits.length === 0) {
			return JSON.stringify({
				query,
				totalResults: 0,
				page: page + 1,
				totalPages: 0,
				results: [],
				message: `No results found for "${query}"`
			});
		}
		
		const results = data.hits.map((hit: any) => ({
			objectID: hit.objectID,
			title: hit.title || 'No title',
			url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
			author: hit.author || 'Unknown',
			points: hit.points || 0,
			num_comments: hit.num_comments || 0,
			created_at: hit.created_at,
			created_at_formatted: new Date(hit.created_at).toLocaleDateString(),
			hn_url: `https://news.ycombinator.com/item?id=${hit.objectID}`
		}));
		
		return JSON.stringify({
			query,
			totalResults: data.nbHits,
			page: page + 1,
			totalPages: data.nbPages,
			resultsCount: results.length,
			results
		});
	}
});

/**
 * Tool: Search Hacker News by date (most recent first)
 */
export const hnSearchByDateTool = createMastraTool({
  category: 'news-info',
	id: 'hn_search_by_date',
	description: 'Search Hacker News stories, comments, or other items sorted by date (most recent first). Useful for finding latest posts on a topic.',
	
	inputSchema: z.object({
		query: z.string()
			.describe('Search query keywords (can be empty to get all recent items)')
			.default(''),
		tags: z.string()
			.describe('Filter by type: story, comment, poll, show_hn, ask_hn, author_USERNAME, etc.')
			.default('story'),
		page: z.number()
			.min(0)
			.describe('Page number.')
			.default(0),
		hits_per_page: z.number()
			.min(1)
			.max(100)
			.describe('Number of results per page (1-100).')
			.default(20),
	numeric_filters: z.string()
		.describe('Optional numeric filters like "created_at_i>1234567890" or "points>100"')
		.optional()
	}).describe('Tool input parameters'),
	
	outputSchema: z.string().describe('Formatted stories filtered by date'),
	
	execute: async ({ context }) => {
		const query = context.query;
		const tags = context.tags;
		const page = context.page;
		const hitsPerPage = context.hits_per_page;
		const numericFilters = context.numeric_filters;
		
		let url = `http://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=${encodeURIComponent(tags)}&page=${page}&hitsPerPage=${hitsPerPage}`;
		
		if (numericFilters) {
			url += `&numericFilters=${encodeURIComponent(numericFilters)}`;
		}
		
		const response = await requestUrl({ url, method: 'GET' });
		const data = response.json;
		
		if (!data.hits || data.hits.length === 0) {
			return JSON.stringify({
				query,
				totalResults: 0,
				page: page + 1,
				totalPages: 0,
				results: [],
				message: `No results found${query ? ` for "${query}"` : ''}`
			});
		}
		
		const results = data.hits.map((hit: any) => {
			const isComment = hit._tags?.includes('comment');
			return {
				objectID: hit.objectID,
				type: isComment ? 'comment' : 'story',
				title: hit.title || (isComment ? hit.comment_text?.substring(0, 100) : 'No title'),
				url: hit.url || null,
				author: hit.author || 'Unknown',
				points: hit.points || 0,
				num_comments: hit.num_comments || 0,
				created_at: hit.created_at,
				created_at_formatted: new Date(hit.created_at).toLocaleString(),
				hn_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
				comment_text: isComment ? hit.comment_text : null
			};
		});
		
		return JSON.stringify({
			query,
			totalResults: data.nbHits,
			page: page + 1,
			totalPages: data.nbPages,
			resultsCount: results.length,
			results
		});
	}
});

/**
 * Tool: Get front page stories
 */
export const hnGetFrontPageTool = createMastraTool({
  category: 'news-info',
	id: 'hn_get_front_page',
	description: 'Get current front page stories from Hacker News. These are the stories currently visible on the HN homepage.',
	
	inputSchema: z.object({
		page: z.number()
			.min(0)
			.describe('Page number.')
			.default(0),
	hits_per_page: z.number()
		.min(1)
		.max(100)
		.describe('Number of results per page (1-100).')
		.default(30)
	}).describe('Tool input parameters'),
	
	outputSchema: z.string().describe('Formatted front page stories'),
	
	execute: async ({ context }) => {
		const page = context.page;
		const hitsPerPage = context.hits_per_page;		const url = `http://hn.algolia.com/api/v1/search?tags=front_page&page=${page}&hitsPerPage=${hitsPerPage}`;
		
		const response = await requestUrl({ url, method: 'GET' });
		const data = response.json;
		
		if (!data.hits || data.hits.length === 0) {
			return JSON.stringify({
				totalResults: 0,
				page: page + 1,
				results: [],
				message: 'No front page stories found'
			});
		}
		
		const results = data.hits.map((hit: any, index: number) => ({
			rank: page * hitsPerPage + index + 1,
			objectID: hit.objectID,
			title: hit.title || 'No title',
			url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
			author: hit.author || 'Unknown',
			points: hit.points || 0,
			num_comments: hit.num_comments || 0,
			hn_url: `https://news.ycombinator.com/item?id=${hit.objectID}`
		}));
		
		return JSON.stringify({
			source: 'front_page',
			page: page + 1,
			resultsCount: results.length,
			results
		});
	}
});

/**
 * Tool: Get top stories
 */
export const hnGetTopStoriesTool = createMastraTool({
  category: 'news-info',
	id: 'hn_get_top_stories',
	description: 'Get top rated stories from Hacker News. Returns highly ranked stories sorted by points and engagement.',
	
	inputSchema: z.object({
		page: z.number()
			.min(0)
			.describe('Page number.')
			.default(0),
		hits_per_page: z.number()
			.min(1)
			.max(100)
			.describe('Number of results per page (1-100).')
			.default(30),
	min_points: z.number()
		.min(1)
		.describe('Minimum points threshold.')
		.default(100)
	}).describe('Tool input parameters'),
	
	outputSchema: z.string().describe('Formatted top stories'),
	
	execute: async ({ context }) => {
		const page = context.page;
		const hitsPerPage = context.hits_per_page;
		const minPoints = context.min_points;
		
		const url = `http://hn.algolia.com/api/v1/search?tags=story&numericFilters=points>${minPoints}&page=${page}&hitsPerPage=${hitsPerPage}`;
		
		const response = await requestUrl({ url, method: 'GET' });
		const data = response.json;
		
		if (!data.hits || data.hits.length === 0) {
			return JSON.stringify({
				min_points: minPoints,
				totalResults: 0,
				page: page + 1,
				results: [],
				message: `No top stories found with more than ${minPoints} points`
			});
		}
		
		const results = data.hits.map((hit: any, index: number) => ({
			rank: page * hitsPerPage + index + 1,
			objectID: hit.objectID,
			title: hit.title || 'No title',
			url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
			author: hit.author || 'Unknown',
			points: hit.points || 0,
			num_comments: hit.num_comments || 0,
			created_at: hit.created_at,
			created_at_formatted: new Date(hit.created_at).toLocaleDateString(),
			hn_url: `https://news.ycombinator.com/item?id=${hit.objectID}`
		}));
		
		return JSON.stringify({
			min_points: minPoints,
			page: page + 1,
			resultsCount: results.length,
			results
		});
	}
});

/**
 * Tool: Get specific item details
 */
export const hnGetItemTool = createMastraTool({
  category: 'news-info',
	id: 'hn_get_item',
	description: 'Get detailed information about a specific Hacker News item (story, comment, poll, etc.) by its ID. Returns full content including nested comments. Optionally fetches the original article content from the URL.',
	
	inputSchema: z.object({
		item_id: z.string()
			.min(1)
			.describe('The Hacker News item ID'),
	fetch_original_content: z.boolean()
		.describe('Whether to fetch the original article content from the URL (if available).')
		.default(true)
	}).describe('Tool input parameters'),
	
	outputSchema: z.string().describe('Formatted item details'),
	
	execute: async ({ context }) => {
		const itemId = context.item_id;
		const fetchOriginalContent = context.fetch_original_content;
		
		if (!itemId) {
			throw new Error('Item ID is required');
		}
		
		const url = `http://hn.algolia.com/api/v1/items/${itemId}`;
		
		const response = await requestUrl({ url, method: 'GET' });
		const item = response.json;
		
		if (!item || !item.id) {
			return JSON.stringify({
				item_id: itemId,
				found: false,
				message: `Item ${itemId} not found`
			});
		}
		
		const topComments = (item.children || []).slice(0, 5).map((comment: any) => ({
			author: comment.author || 'Unknown',
			text: comment.text?.replace(/<[^>]*>/g, '') || 'No text',
			points: comment.points || 0,
			created_at: comment.created_at,
			id: comment.id
		}));
		
		const result: any = {
			item_id: itemId,
			found: true,
			type: item.type || 'unknown',
			title: item.title || 'No title',
			author: item.author || 'Unknown',
			created_at: item.created_at,
			created_at_formatted: new Date(item.created_at).toLocaleString(),
			points: item.points || 0,
			url: item.url || null,
			text: item.text?.replace(/<[^>]*>/g, '') || null,
			hn_url: `https://news.ycombinator.com/item?id=${item.id}`,
			num_comments: item.children?.length || 0,
			top_comments: topComments,
			total_comments: item.children?.length || 0
		};
		
		// Fetch original article content if URL exists and fetch_original_content is not explicitly false
		const shouldFetchOriginal = fetchOriginalContent !== false && item.url && item.type === 'story';
		
		if (shouldFetchOriginal) {
			try {
				const webContent = await fetchWebContent(item.url, {
					extractType: 'main_content',
					timeout: 10000
				});
				
				if (webContent.success) {
					result.original_content = {
						fetched: true,
						title: webContent.title || webContent.metadata?.title,
						content: webContent.content,
						content_length: webContent.contentLength,
						word_count: webContent.wordCount,
						metadata: webContent.metadata
					};
				} else {
					result.original_content = {
						fetched: false,
						error: webContent.error || 'Failed to fetch original content'
					};
				}
			} catch (error) {
				result.original_content = {
					fetched: false,
					error: `Error fetching original content: ${error instanceof Error ? error.message : 'Unknown error'}`
				};
			}
		} else {
			result.original_content = {
				fetched: false,
				reason: !item.url ? 'No URL available' : (item.type !== 'story' ? 'Not a story type' : 'Fetch disabled')
			};
		}
		
		return JSON.stringify(result);
	}
});

/**
 * Tool: Get user information
 */
export const hnGetUserTool = createMastraTool({
  category: 'news-info',
	id: 'hn_get_user',
	description: 'Get information about a Hacker News user including their karma, about section, and submission history.',
	
	inputSchema: z.object({
	username: z.string()
		.min(1)
		.describe('The Hacker News username')
	}).describe('Tool input parameters'),
	
	outputSchema: z.string().describe('Formatted user information'),
	
	execute: async ({ context }) => {
		const username = context.username;
		
		if (!username) {
			throw new Error('Username is required');
		}
		
		const url = `http://hn.algolia.com/api/v1/users/${username}`;
		
		const response = await requestUrl({ url, method: 'GET' });
		const user = response.json;
		
		if (!user || !user.username) {
			return JSON.stringify({
				username,
				found: false,
				message: `User "${username}" not found`
			});
		}
		
		return JSON.stringify({
			username: user.username,
			found: true,
			karma: user.karma || 0,
			about: user.about?.replace(/<[^>]*>/g, '') || 'No bio',
			created_at: user.created_at,
			created_at_formatted: new Date(user.created_at).toLocaleDateString(),
			profile_url: `https://news.ycombinator.com/user?id=${username}`
		});
	}
});

/**
 * Tool: Get Ask HN stories
 */
export const hnGetAskStoresTool = createMastraTool({
  category: 'news-info',
	id: 'hn_get_ask_stories',
	description: 'Get recent Ask HN (Ask Hacker News) stories where users ask questions to the community.',
	
	inputSchema: z.object({
		page: z.number()
			.min(0)
			.describe('Page number.')
			.default(0),
		hits_per_page: z.number()
			.min(1)
			.max(100)
			.describe('Number of results per page (1-100).')
			.default(20)
	}).describe('Tool input parameters'),
	
	outputSchema: z.string().describe('Formatted Ask HN stories'),
	
	execute: async ({ context }) => {
		const page = context.page;
		const hitsPerPage = context.hits_per_page;
		
		const url = `http://hn.algolia.com/api/v1/search_by_date?tags=ask_hn&page=${page}&hitsPerPage=${hitsPerPage}`;
		
		const response = await requestUrl({ url, method: 'GET' });
		const data = response.json;
		
		if (!data.hits || data.hits.length === 0) {
			return JSON.stringify({
				source: 'ask_hn',
				totalResults: 0,
				page: page + 1,
				results: [],
				message: 'No Ask HN stories found'
			});
		}
		
		const results = data.hits.map((hit: any, index: number) => ({
			rank: page * hitsPerPage + index + 1,
			objectID: hit.objectID,
			title: hit.title || 'No title',
			author: hit.author || 'Unknown',
			points: hit.points || 0,
			num_comments: hit.num_comments || 0,
			created_at: hit.created_at,
			created_at_formatted: new Date(hit.created_at).toLocaleDateString(),
			hn_url: `https://news.ycombinator.com/item?id=${hit.objectID}`
		}));
		
		return JSON.stringify({
			source: 'ask_hn',
			page: page + 1,
			resultsCount: results.length,
			results
		});
	}
});

/**
 * Tool: Get Show HN stories
 */
export const hnGetShowStoriesTool = createMastraTool({
  category: 'news-info',
	id: 'hn_get_show_stories',
	description: 'Get recent Show HN (Show Hacker News) stories where users share their projects, products, or creations.',
	
	inputSchema: z.object({
		page: z.number()
			.min(0)
			.describe('Page number.')
			.default(0),
		hits_per_page: z.number()
			.min(1)
			.max(100)
			.describe('Number of results per page (1-100).')
			.default(20)
	}).describe('Tool input parameters'),
	
	outputSchema: z.string().describe('Formatted Show HN stories'),
	
	execute: async ({ context }) => {
		const page = context.page;
		const hitsPerPage = context.hits_per_page;
		
		const url = `http://hn.algolia.com/api/v1/search_by_date?tags=show_hn&page=${page}&hitsPerPage=${hitsPerPage}`;
		
		const response = await requestUrl({ url, method: 'GET' });
		const data = response.json;
		
		if (!data.hits || data.hits.length === 0) {
			return JSON.stringify({
				source: 'show_hn',
				totalResults: 0,
				page: page + 1,
				results: [],
				message: 'No Show HN stories found'
			});
		}
		
		const results = data.hits.map((hit: any, index: number) => ({
			rank: page * hitsPerPage + index + 1,
			objectID: hit.objectID,
			title: hit.title || 'No title',
			url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
			author: hit.author || 'Unknown',
			points: hit.points || 0,
			num_comments: hit.num_comments || 0,
			created_at: hit.created_at,
			created_at_formatted: new Date(hit.created_at).toLocaleDateString(),
			hn_url: `https://news.ycombinator.com/item?id=${hit.objectID}`
		}));
		
		return JSON.stringify({
			source: 'show_hn',
			page: page + 1,
			resultsCount: results.length,
			results
		});
	}
});
