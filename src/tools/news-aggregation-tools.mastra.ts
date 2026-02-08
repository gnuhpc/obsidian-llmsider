/**
 * News Aggregation Tools - Mastra Tool format
 * Fetch news from public RSS feeds without authentication
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

/**
 * Helper function to extract text content from XML tags
 */
function extractTag(xml: string, tagName: string): string {
	const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
	const match = xml.match(regex);
	return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

/**
 * BBC News RSS Feed
 */
export const getBBCNewsTool = createMastraTool({
	id: 'get_bbc_news',
	category: 'news-info',
	description: 'Get latest news from BBC News RSS feed. Returns news headlines, descriptions, links, and publication dates.',
	inputSchema: z.object({
		category: z.enum(['world', 'business', 'technology', 'science', 'health', 'entertainment', 'sport'])
			.default('world')
			.optional()
			.describe('News category: "world", "business", "technology", "science", "health", "entertainment", "sport". Default is "world".'),
		max_items: z.number()
			.min(1)
			.max(20)
			.default(10)
			.optional()
			.describe('Maximum number of news items to return (1-20). Default is 10.')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		category: z.string().describe('News category requested'),
		count: z.number().describe('Number of news items returned'),
		news: z.array(z.object({
			title: z.string().describe('Article title'),
			description: z.string().describe('Article description/summary'),
			url: z.string().describe('Article URL'),
			published_at: z.string().describe('Publication date'),
			id: z.string().describe('Article GUID'),
			source: z.string().describe('News source (BBC News)')
		})).describe('Array of news articles')
	}).describe('BBC News articles'),
	execute: async ({ context }) => {
		const category = context.category || 'world';
		const maxItems = Math.min(context.max_items || 10, 20);
		
		const categoryUrls: Record<string, string> = {
			world: 'https://feeds.bbci.co.uk/news/world/rss.xml',
			business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
			technology: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
			science: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
			health: 'https://feeds.bbci.co.uk/news/health/rss.xml',
			entertainment: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
			sport: 'https://feeds.bbci.co.uk/sport/rss.xml'
		};

		const rssUrl = categoryUrls[category] || categoryUrls.world;

		const response = await requestUrl({
			url: rssUrl,
			method: 'GET',
			headers: {
				'User-Agent': 'ObsidianLLMSider/1.0'
			}
		});

		const text = response.text;

		if (!text.includes('<item>')) {
			return {
				category,
				count: 0,
				news: []
			};
		}

		const items = [];
		const itemParts = text.split('<item>').slice(1, maxItems + 1);

		for (const part of itemParts) {
			const title = extractTag(part, 'title');
			const link = extractTag(part, 'link');
			const description = extractTag(part, 'description');
			const pubDate = extractTag(part, 'pubDate');
			const guid = extractTag(part, 'guid');

			if (title && link) {
				items.push({
					title: title.trim(),
					description: description.trim(),
					url: link.trim(),
					published_at: pubDate,
					id: guid,
					source: 'BBC News'
				});
			}
		}

		return {
			category,
			count: items.length,
			news: items
		};
	}
});

/**
 * Hacker News Feed
 */
export const getHackerNewsTool = createMastraTool({
	id: 'get_hacker_news',
	category: 'news-info',
	description: 'Get top stories from Hacker News. Returns tech news, discussions, and links.',
	inputSchema: z.object({
		category: z.enum(['top', 'new', 'best', 'ask', 'show', 'job'])
			.default('top')
			.optional()
			.describe('Story category: "top", "new", "best", "ask", "show", "job". Default is "top".'),
		max_items: z.number()
			.min(1)
			.max(30)
			.default(10)
			.optional()
			.describe('Maximum number of stories to return (1-30). Default is 10.')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		category: z.string().describe('Story category requested'),
		count: z.number().describe('Number of stories returned'),
		stories: z.array(z.object({
			title: z.string().describe('Story title'),
			url: z.string().describe('Story URL'),
			score: z.number().describe('Story score/points'),
			by: z.string().describe('Author username'),
			time: z.string().describe('ISO timestamp'),
			descendants: z.number().describe('Number of comments'),
			hn_url: z.string().describe('Hacker News discussion URL'),
			source: z.string().describe('Source (Hacker News)')
		})).describe('Array of Hacker News stories')
	}).describe('Hacker News stories'),
	execute: async ({ context }) => {
		const category = context.category || 'top';
		const maxItems = Math.min(context.max_items || 10, 30);

		// Get story IDs
		const listUrl = `https://hacker-news.firebaseio.com/v0/${category}stories.json`;
		const listResponse = await requestUrl({
			url: listUrl,
			method: 'GET'
		});

		const storyIds = listResponse.json.slice(0, maxItems);

		// Fetch story details
		const stories = [];
		for (const id of storyIds) {
			const storyUrl = `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
			const storyResponse = await requestUrl({
				url: storyUrl,
				method: 'GET'
			});

			const story = storyResponse.json;
			if (story && story.type === 'story') {
				stories.push({
					title: story.title,
					url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
					score: story.score,
					by: story.by,
					time: new Date(story.time * 1000).toISOString(),
					descendants: story.descendants || 0,
					hn_url: `https://news.ycombinator.com/item?id=${story.id}`,
					source: 'Hacker News'
				});
			}
		}

		return {
			category,
			count: stories.length,
			stories
		};
	}
});

/**
 * Reddit Top Posts
 */
export const getRedditTopPostsTool = createMastraTool({
	id: 'get_reddit_top_posts',
	category: 'news-info',
	description: 'Get top posts from a Reddit subreddit. Returns post titles, URLs, scores, and comments.',
	inputSchema: z.object({
		subreddit: z.string()
			.min(1)
			.describe('Subreddit name (e.g., "programming", "science", "technology", "news")'),
		time_period: z.enum(['hour', 'day', 'week', 'month', 'year', 'all'])
			.default('day')
			.optional()
			.describe('Time period: "hour", "day", "week", "month", "year", "all". Default is "day".'),
		limit: z.number()
			.min(1)
			.max(25)
			.default(10)
			.optional()
			.describe('Maximum number of posts to return (1-25). Default is 10.')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		subreddit: z.string().describe('Subreddit name'),
		time_period: z.string().describe('Time period filter'),
		count: z.number().describe('Number of posts returned'),
		posts: z.array(z.object({
			title: z.string().describe('Post title'),
			author: z.string().describe('Post author username'),
			score: z.number().describe('Post upvotes (score)'),
			upvote_ratio: z.number().describe('Upvote ratio'),
			num_comments: z.number().describe('Number of comments'),
			created_utc: z.string().describe('Creation timestamp (ISO 8601)'),
			url: z.string().describe('Post URL or external link'),
			permalink: z.string().describe('Reddit discussion URL'),
			subreddit: z.string().describe('Subreddit name'),
			is_self: z.boolean().describe('Is self post'),
			selftext: z.string().nullable().describe('Self post text (truncated)')
		})).describe('Array of Reddit posts')
	}).describe('Reddit top posts'),
	execute: async ({ context }) => {
		const subreddit = context.subreddit.replace(/^r\//, '');
		const timePeriod = context.time_period || 'day';
		const limit = Math.min(context.limit || 10, 25);

		const url = `https://www.reddit.com/r/${subreddit}/top.json?t=${timePeriod}&limit=${limit}`;

		const response = await requestUrl({
			url,
			method: 'GET',
			headers: {
				'User-Agent': 'ObsidianLLMSider/1.0'
			}
		});

		const data = response.json;
		const posts = (data.data?.children || []).map((child: any) => {
			const post = child.data;
			return {
				title: post.title,
				author: post.author,
				score: post.score,
				upvote_ratio: post.upvote_ratio,
				num_comments: post.num_comments,
				created_utc: new Date(post.created_utc * 1000).toISOString(),
				url: post.url,
				permalink: `https://www.reddit.com${post.permalink}`,
				subreddit: post.subreddit,
				is_self: post.is_self,
				selftext: post.is_self ? post.selftext?.substring(0, 300) : null
			};
		});

		return {
			subreddit,
			time_period: timePeriod,
			count: posts.length,
			posts
		};
	}
});

/**
 * NPR News RSS Feed
 */
export const getNPRNewsTool = createMastraTool({
	id: 'get_npr_news',
	category: 'news-info',
	description: 'Get latest news from NPR (National Public Radio) RSS feed. Returns news headlines, summaries, and links.',
	inputSchema: z.object({
		category: z.enum(['news', 'world', 'business', 'technology', 'science', 'health', 'politics'])
			.default('news')
			.optional()
			.describe('News category: "news", "world", "business", "technology", "science", "health", "politics". Default is "news".'),
		max_items: z.number()
			.min(1)
			.max(20)
			.default(10)
			.optional()
			.describe('Maximum number of news items to return (1-20). Default is 10.')
	}).describe('Tool input parameters'),
	outputSchema: z.object({
		category: z.string().describe('News category'),
		count: z.number().describe('Number of articles returned'),
		news: z.array(z.object({
			title: z.string().describe('Article title'),
			description: z.string().describe('Article summary/description'),
			url: z.string().describe('Article URL'),
			published_at: z.string().describe('Publication date'),
			id: z.string().describe('Article GUID'),
			source: z.string().describe('Source (NPR)')
		})).describe('Array of NPR news articles')
	}).describe('NPR News articles'),
	execute: async ({ context }) => {
		const category = context.category || 'news';
		const maxItems = Math.min(context.max_items || 10, 20);
		
		const categoryIds: Record<string, string> = {
			news: '1001',
			world: '1004',
			business: '1006',
			technology: '1019',
			science: '1007',
			health: '1128',
			politics: '1014'
		};

		const categoryId = categoryIds[category] || categoryIds.news;
		const rssUrl = `https://feeds.npr.org/${categoryId}/rss.xml`;

		const response = await requestUrl({
			url: rssUrl,
			method: 'GET',
			headers: {
				'User-Agent': 'ObsidianLLMSider/1.0'
			}
		});

		const text = response.text;

		if (!text.includes('<item>')) {
			return {
				category,
				count: 0,
				news: []
			};
		}

		const items = [];
		const itemParts = text.split('<item>').slice(1, maxItems + 1);

		for (const part of itemParts) {
			const title = extractTag(part, 'title');
			const link = extractTag(part, 'link');
			const description = extractTag(part, 'description');
			const pubDate = extractTag(part, 'pubDate');
			const guid = extractTag(part, 'guid');

			if (title && link) {
				items.push({
					title: title.trim(),
					description: description.trim().replace(/<[^>]+>/g, ''),
					url: link.trim(),
					published_at: pubDate,
					id: guid,
					source: 'NPR'
				});
			}
		}

		return {
			category,
			count: items.length,
			news: items
		};
	}
});
