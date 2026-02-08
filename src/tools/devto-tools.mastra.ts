/**
 * Dev.to (DEV Community) Tools (Mastra Format)
 * 
 * Uses Dev.to's public API - no authentication required
 * API Documentation: https://developers.forem.com/api/v1
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

const DEVTO_API_BASE = 'https://dev.to/api';

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second (Dev.to is more lenient)

async function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedRequest(url: string) {
	const now = Date.now();
	const elapsed = now - lastRequestTime;
	
	if (elapsed < MIN_REQUEST_INTERVAL) {
		await sleep(MIN_REQUEST_INTERVAL - elapsed);
	}
	
	lastRequestTime = Date.now();
	
	const headers = {
		'Accept': 'application/json',
		'User-Agent': 'LLMSider/1.0'
	};
	
	return await requestUrl({
		url,
		method: 'GET',
		headers
	});
}

interface DevToArticle {
	id: number;
	title: string;
	description: string;
	url: string;
	publishedAt: string;
	tagList: string[];
	reactionsCount: number;
	commentsCount: number;
	positiveReactionsCount: number;
	user: {
		name: string;
		username: string;
		profileImage: string;
	};
	organization?: {
		name: string;
		username: string;
	};
	readingTimeMinutes: number;
}

/**
 * Parse Dev.to article from API response
 */
function parseArticle(data: any): DevToArticle {
	return {
		id: data.id,
		title: data.title,
		description: data.description || '',
		url: data.url,
		publishedAt: data.published_at || data.created_at,
		tagList: data.tag_list || data.tags || [],
		reactionsCount: data.public_reactions_count || data.reactions_count || 0,
		commentsCount: data.comments_count || 0,
		positiveReactionsCount: data.positive_reactions_count || 0,
		user: {
			name: data.user?.name || 'Unknown',
			username: data.user?.username || 'unknown',
			profileImage: data.user?.profile_image || data.user?.profile_image_90 || ''
		},
		organization: data.organization ? {
			name: data.organization.name,
			username: data.organization.username
		} : undefined,
		readingTimeMinutes: data.reading_time_minutes || 0
	};
}

/**
 * Tool: Get Dev.to Latest Articles
 */
export const getDevToLatestArticlesTool = createMastraTool({
  category: 'news-info',
	id: 'get_devto_latest_articles',
	description: 'Get the latest articles from Dev.to community. Shows recently published technical articles and blog posts.',
	
	inputSchema: z.object({
		per_page: z.number()
			.min(1)
			.max(100)
			.describe('Number of articles to return per page (1-100).')
			.default(10),
		page: z.number()
			.min(1)
			.describe('Page number for pagination.')
			.default(1)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Formatted article list'),
	
	execute: async ({ context }) => {
		const perPage = context.per_page;
		const page = context.page;
		
		const url = `${DEVTO_API_BASE}/articles/latest?per_page=${perPage}&page=${page}`;
		
		const response = await rateLimitedRequest(url);
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch Dev.to articles (HTTP ${response.status})`);
		}
		
		const data = response.json;
		
		if (!Array.isArray(data) || data.length === 0) {
			throw new Error('No articles found');
		}
		
		const articles = data.map(parseArticle);
		
		let result = `Dev.to Latest Articles (Page ${page}, ${articles.length} articles):\n\n`;
		
		for (let i = 0; i < articles.length; i++) {
			const article = articles[i];
			result += `${i + 1}. ${article.title}\n`;
			result += `   Author: ${article.user.name} (@${article.user.username})`;
			if (article.organization) {
				result += ` • ${article.organization.name}`;
			}
			result += `\n`;
			if (article.description) {
				result += `   Description: ${article.description}\n`;
			}
			result += `   🎯 ${article.positiveReactionsCount} reactions | 💬 ${article.commentsCount} comments | ⏱️  ${article.readingTimeMinutes} min read\n`;
			if (article.tagList.length > 0) {
				result += `   Tags: ${article.tagList.map(t => `#${t}`).join(', ')}\n`;
			}
			result += `   Published: ${new Date(article.publishedAt).toLocaleDateString()}\n`;
			result += `   URL: ${article.url}\n\n`;
		}
		
		return result.trim();
	}
});

/**
 * Tool: Get Dev.to Top Articles
 */
export const getDevToTopArticlesTool = createMastraTool({
  category: 'news-info',
	id: 'get_devto_top_articles',
	description: 'Get top articles from Dev.to based on reactions and engagement. Shows the most popular articles from different time periods.',
	
	inputSchema: z.object({
		per_page: z.number()
			.min(1)
			.max(100)
			.describe('Number of articles to return per page (1-100).')
			.default(10),
		page: z.number()
			.min(1)
			.describe('Page number for pagination.')
			.default(1),
		top: z.number()
			.min(1)
			.describe('Number of days to look back. 7 for week, 30 for month, 365 for year.')
			.default(7)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Formatted top articles'),
	
	execute: async ({ context }) => {
		const perPage = context.per_page;
		const page = context.page;
		const top = context.top;
		
		const url = `${DEVTO_API_BASE}/articles?per_page=${perPage}&page=${page}&top=${top}`;
		
		const response = await rateLimitedRequest(url);
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch Dev.to top articles (HTTP ${response.status})`);
		}
		
		const data = response.json;
		
		if (!Array.isArray(data) || data.length === 0) {
			throw new Error('No articles found');
		}
		
		const articles = data.map(parseArticle);
		
		const timeRange = top === 1 ? 'Today' : 
						  top === 7 ? 'This Week' :
						  top === 30 ? 'This Month' :
						  top === 365 ? 'This Year' :
						  `Last ${top} Days`;
		
		let result = `Dev.to Top Articles - ${timeRange} (Page ${page}, ${articles.length} articles):\n\n`;
		
		for (let i = 0; i < articles.length; i++) {
			const article = articles[i];
			result += `${i + 1}. ${article.title}\n`;
			result += `   Author: ${article.user.name} (@${article.user.username})`;
			if (article.organization) {
				result += ` • ${article.organization.name}`;
			}
			result += `\n`;
			if (article.description) {
				result += `   Description: ${article.description}\n`;
			}
			result += `   🎯 ${article.positiveReactionsCount} reactions | 💬 ${article.commentsCount} comments | ⏱️  ${article.readingTimeMinutes} min read\n`;
			if (article.tagList.length > 0) {
				result += `   Tags: ${article.tagList.map(t => `#${t}`).join(', ')}\n`;
			}
			result += `   URL: ${article.url}\n\n`;
		}
		
		return result.trim();
	}
});

/**
 * Tool: Search Dev.to Articles by Tag
 */
export const searchDevToByTagTool = createMastraTool({
  category: 'news-info',
	id: 'search_devto_by_tag',
	description: 'Search Dev.to articles by tag (e.g., javascript, python, webdev, tutorial, beginners).',
	
	inputSchema: z.object({
		tag: z.string()
			.min(1)
			.describe('Tag to search for (e.g., javascript, python, react, tutorial, beginners)'),
		per_page: z.number()
			.min(1)
			.max(100)
			.describe('Number of articles to return per page (1-100).')
			.default(10),
		page: z.number()
			.min(1)
			.describe('Page number for pagination.')
			.default(1)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Formatted search results'),
	
	execute: async ({ context }) => {
		const tag = context.tag.trim().toLowerCase();
		const perPage = context.per_page;
		const page = context.page;
		
		if (!tag) {
			throw new Error('Tag cannot be empty');
		}
		
		const url = `${DEVTO_API_BASE}/articles?tag=${encodeURIComponent(tag)}&per_page=${perPage}&page=${page}`;
		
		const response = await rateLimitedRequest(url);
		
		if (response.status !== 200) {
			throw new Error(`Failed to search Dev.to articles (HTTP ${response.status})`);
		}
		
		const data = response.json;
		
		if (!Array.isArray(data) || data.length === 0) {
			throw new Error(`No articles found with tag "${tag}".\n\nPopular tags: javascript, python, webdev, tutorial, beginners, react, node, programming, css, career`);
		}
		
		const articles = data.map(parseArticle);
		
		let result = `Dev.to Articles Tagged #${tag} (Page ${page}, ${articles.length} articles):\n\n`;
		
		for (let i = 0; i < articles.length; i++) {
			const article = articles[i];
			result += `${i + 1}. ${article.title}\n`;
			result += `   Author: ${article.user.name} (@${article.user.username})`;
			if (article.organization) {
				result += ` • ${article.organization.name}`;
			}
			result += `\n`;
			if (article.description) {
				result += `   Description: ${article.description}\n`;
			}
			result += `   🎯 ${article.positiveReactionsCount} reactions | 💬 ${article.commentsCount} comments | ⏱️  ${article.readingTimeMinutes} min read\n`;
			if (article.tagList.length > 1) {
				const otherTags = article.tagList.filter(t => t !== tag);
				if (otherTags.length > 0) {
					result += `   Other Tags: ${otherTags.map(t => `#${t}`).join(', ')}\n`;
				}
			}
			result += `   URL: ${article.url}\n\n`;
		}
		
		return result.trim();
	}
});

/**
 * Tool: Get Dev.to Article Details
 */
export const getDevToArticleDetailsTool = createMastraTool({
  category: 'news-info',
	id: 'get_devto_article_details',
	description: 'Get detailed information about a specific Dev.to article by its ID or slug.',
	
	inputSchema: z.object({
		id: z.string()
			.min(1)
			.describe('Article ID (number) or article path/slug (e.g., "username/article-slug-123")')
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Formatted article details'),
	
	execute: async ({ context }) => {
		const articleId = context.id.trim();
		
		if (!articleId) {
			throw new Error('Article ID or slug cannot be empty');
		}
		
		// Try to determine if it's a numeric ID or a path
		const isNumeric = /^\d+$/.test(articleId);
		const endpoint = isNumeric ? `${DEVTO_API_BASE}/articles/${articleId}` : `${DEVTO_API_BASE}/articles/by_path?url=https://dev.to/${articleId}`;
		
		const response = await rateLimitedRequest(endpoint);
		
		if (response.status === 404) {
			throw new Error(`Article not found: "${articleId}"`);
		}
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch article details (HTTP ${response.status})`);
		}
		
		const data = response.json;
		const article = parseArticle(data);
		
		let result = `Dev.to Article Details:\n\n`;
		result += `Title: ${article.title}\n`;
		result += `Author: ${article.user.name} (@${article.user.username})\n`;
		if (article.organization) {
			result += `Organization: ${article.organization.name} (@${article.organization.username})\n`;
		}
		result += `Published: ${new Date(article.publishedAt).toLocaleString()}\n`;
		result += `Reading Time: ${article.readingTimeMinutes} minutes\n\n`;
		
		if (article.description) {
			result += `Description:\n${article.description}\n\n`;
		}
		
		result += `Engagement:\n`;
		result += `  🎯 ${article.positiveReactionsCount} positive reactions\n`;
		result += `  ❤️  ${article.reactionsCount} total reactions\n`;
		result += `  💬 ${article.commentsCount} comments\n\n`;
		
		if (article.tagList.length > 0) {
			result += `Tags: ${article.tagList.map(t => `#${t}`).join(', ')}\n\n`;
		}
		
		result += `URL: ${article.url}\n`;
		
		// Try to get body content if available
		if (data.body_markdown) {
			const preview = data.body_markdown.substring(0, 500);
			result += `\nContent Preview:\n${preview}${data.body_markdown.length > 500 ? '...' : ''}\n`;
		}
		
		return result.trim();
	}
});

/**
 * Tool: Get Dev.to User's Articles
 */
export const getDevToUserArticlesTool = createMastraTool({
  category: 'news-info',
	id: 'get_devto_user_articles',
	description: 'Get articles published by a specific Dev.to user.',
	
	inputSchema: z.object({
		username: z.string()
			.min(1)
			.describe('Dev.to username (without @ symbol)'),
		per_page: z.number()
			.min(1)
			.max(100)
			.describe('Number of articles to return per page (1-100).')
			.default(10),
		page: z.number()
			.min(1)
			.describe('Page number for pagination.')
			.default(1)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Formatted user articles'),
	
	execute: async ({ context }) => {
		const username = context.username.trim().replace('@', '');
		const perPage = context.per_page;
		const page = context.page;
		
		if (!username) {
			throw new Error('Username cannot be empty');
		}
		
		const url = `${DEVTO_API_BASE}/articles?username=${encodeURIComponent(username)}&per_page=${perPage}&page=${page}`;
		
		const response = await rateLimitedRequest(url);
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch user articles (HTTP ${response.status})`);
		}
		
		const data = response.json;
		
		if (!Array.isArray(data) || data.length === 0) {
			throw new Error(`No articles found for user "${username}"`);
		}
		
		const articles = data.map(parseArticle);
		
		let result = `Dev.to Articles by @${username} (Page ${page}, ${articles.length} articles):\n\n`;
		
		for (let i = 0; i < articles.length; i++) {
			const article = articles[i];
			result += `${i + 1}. ${article.title}\n`;
			result += `   🎯 ${article.positiveReactionsCount} reactions | 💬 ${article.commentsCount} comments | ⏱️  ${article.readingTimeMinutes} min read\n`;
			if (article.tagList.length > 0) {
				result += `   Tags: ${article.tagList.map(t => `#${t}`).join(', ')}\n`;
			}
			result += `   Published: ${new Date(article.publishedAt).toLocaleDateString()}\n`;
			result += `   URL: ${article.url}\n\n`;
		}
		
		return result.trim();
	}
});
