/**
 * Product Hunt Tools (Mastra Format)
 * 
 * Uses Product Hunt's GraphQL API and web scraping for public data
 * No authentication required for public endpoints
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

const PRODUCT_HUNT_API = 'https://www.producthunt.com/frontend/graphql';
const PRODUCT_HUNT_BASE = 'https://www.producthunt.com';

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds

async function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedRequest(query: string, variables: Record<string, any>) {
	const now = Date.now();
	const elapsed = now - lastRequestTime;
	
	if (elapsed < MIN_REQUEST_INTERVAL) {
		await sleep(MIN_REQUEST_INTERVAL - elapsed);
	}
	
	lastRequestTime = Date.now();
	
	const headers = {
		'Content-Type': 'application/json',
		'Accept': 'application/json',
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
	};
	
	return await requestUrl({
		url: PRODUCT_HUNT_API,
		method: 'POST',
		headers,
		body: JSON.stringify({
			query,
			variables
		})
	});
}

/**
 * Tool: Get Product Hunt Today's Products
 */
export const getProductHuntTodayTool = createMastraTool({
  category: 'news-info',
	id: 'get_product_hunt_today',
	description: 'Get today\'s featured products from Product Hunt, showing the hottest new products launching today.',
	
	inputSchema: z.object({
		max_results: z.number()
			.min(1)
			.max(20)
			.describe('Maximum number of products to return (1-20)')
			.default(10)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		products: z.array(z.object({
			rank: z.number().describe('Product ranking'),
			name: z.string().describe('Product name'),
			tagline: z.string().describe('Product tagline'),
			votesCount: z.number().describe('Number of upvotes'),
			commentsCount: z.number().describe('Number of comments'),
			topics: z.array(z.string()).describe('Associated topics'),
			url: z.string().describe('Product Hunt URL'),
			website: z.string().optional().describe('Product website URL')
		})),
		total: z.number().describe('Total number of products returned')
	}).describe('Product Hunt today\'s products data'),
	
	execute: async ({ context }) => {
		const { max_results } = context;
		
		// GraphQL query for today's posts
		const query = `
			query getTodayPosts {
				posts(order: VOTES) {
					edges {
						node {
							id
							name
							tagline
							description
							votesCount
							commentsCount
							createdAt
							url
							website
							topics(first: 5) {
								edges {
									node {
										name
									}
								}
							}
						}
					}
				}
			}
		`;
		
		const response = await rateLimitedRequest(query, {});
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch Product Hunt data (HTTP ${response.status})`);
		}
		
		const data = response.json;
		const edges = data?.data?.posts?.edges || [];
		
		if (edges.length === 0) {
			return {
				products: [],
				total: 0
			};
		}
		
		const products = edges.slice(0, max_results).map((edge: any, index: number) => {
			const node = edge.node;
			return {
				rank: index + 1,
				name: node.name,
				tagline: node.tagline || '',
				votesCount: node.votesCount || 0,
				commentsCount: node.commentsCount || 0,
				topics: (node.topics?.edges || []).map((t: any) => t.node.name),
				url: `${PRODUCT_HUNT_BASE}${node.url}`,
				website: node.website || undefined
			};
		});
		
		return {
			products,
			total: products.length
		};
	}
});

/**
 * Tool: Search Product Hunt
 */
export const searchProductHuntTool = createMastraTool({
  category: 'news-info',
	id: 'search_product_hunt',
	description: 'Search for products on Product Hunt by keyword or topic.',
	
	inputSchema: z.object({
		query: z.string()
			.min(1)
			.describe('Search query (product name, keyword, or topic)'),
		max_results: z.number()
			.min(1)
			.max(20)
			.describe('Maximum number of products to return (1-20)')
			.default(10)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		query: z.string().describe('The search query used'),
		products: z.array(z.object({
			rank: z.number().describe('Result ranking'),
			name: z.string().describe('Product name'),
			tagline: z.string().describe('Product tagline'),
			votes: z.string().describe('Number of upvotes'),
			url: z.string().describe('Product Hunt URL')
		})),
		total: z.number().describe('Total number of results found'),
		note: z.string().optional().describe('Additional notes or warnings')
	}).describe('Product Hunt search results data'),
	
	execute: async ({ context }) => {
		const { query: searchQuery, max_results } = context;
		
		// For simplicity, we'll use the web scraping approach
		// since GraphQL search requires authentication
		const url = `${PRODUCT_HUNT_BASE}/search?q=${encodeURIComponent(searchQuery)}`;
		
		const headers = {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9'
		};
		
		const now = Date.now();
		const elapsed = now - lastRequestTime;
		if (elapsed < MIN_REQUEST_INTERVAL) {
			await sleep(MIN_REQUEST_INTERVAL - elapsed);
		}
		lastRequestTime = Date.now();
		
		const response = await requestUrl({
			url,
			method: 'GET',
			headers
		});
		
		if (response.status !== 200) {
			throw new Error(`Failed to search Product Hunt (HTTP ${response.status})`);
		}
		
		const html = response.text;
		
		// Simple parsing for product results
		const products: Array<{
			rank: number;
			name: string;
			tagline: string;
			votes: string;
			url: string;
		}> = [];
		
		// This is a simplified approach - real parsing would be more robust
		const itemRegex = /<div[^>]*data-test="post-item"[\s\S]*?<\/div>/g;
		const items = (html.match(itemRegex) || []).slice(0, max_results);
		
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			try {
				const nameMatch = item.match(/<h3[^>]*>(.*?)<\/h3>/);
				const name = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, '').trim() : '';
				
				const taglineMatch = item.match(/<p[^>]*>(.*?)<\/p>/);
				const tagline = taglineMatch ? taglineMatch[1].replace(/<[^>]*>/g, '').trim() : '';
				
				const votesMatch = item.match(/(\d+)\s*upvotes?/i);
				const votes = votesMatch ? votesMatch[1] : '0';
				
				const urlMatch = item.match(/href="(\/posts\/[^"]+)"/);
				const productUrl = urlMatch ? `${PRODUCT_HUNT_BASE}${urlMatch[1]}` : '';
				
				if (name && productUrl) {
					products.push({
						rank: i + 1,
						name,
						tagline,
						votes,
						url: productUrl
					});
				}
			} catch (error) {
				continue;
			}
		}
		
		const result: {
			query: string;
			products: typeof products;
			total: number;
			note?: string;
		} = {
			query: searchQuery,
			products,
			total: products.length
		};
		
		if (products.length === 0) {
			result.note = 'No products found. Product Hunt search results may be limited. Try the website directly for comprehensive results.';
		}
		
		return result;
	}
});

/**
 * Tool: Get Product Hunt Collections
 */
export const getProductHuntCollectionsTool = createMastraTool({
  category: 'news-info',
	id: 'get_product_hunt_collections',
	description: 'Get popular Product Hunt collections organized by topic (e.g., ai, productivity, design).',
	
	inputSchema: z.object({
		topic: z.string()
			.min(1)
			.describe('Topic slug (e.g., ai, productivity, design, developer-tools, remote-work)')
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		topic: z.string().describe('The topic name'),
		description: z.string().optional().describe('Topic description'),
		products: z.array(z.object({
			rank: z.number().describe('Product ranking'),
			name: z.string().describe('Product name'),
			tagline: z.string().describe('Product tagline'),
			votes: z.string().describe('Number of upvotes')
		})),
		total: z.number().describe('Total number of products'),
		url: z.string().describe('Topic page URL'),
		suggestedTopics: z.string().optional().describe('Suggested alternative topics if not found')
	}).describe('Product Hunt topic collection data'),
	
	execute: async ({ context }) => {
		const topic = context.topic.trim().toLowerCase().replace(/\s+/g, '-');
		
		const url = `${PRODUCT_HUNT_BASE}/topics/${encodeURIComponent(topic)}`;
		
		const headers = {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9'
		};
		
		const now = Date.now();
		const elapsed = now - lastRequestTime;
		if (elapsed < MIN_REQUEST_INTERVAL) {
			await sleep(MIN_REQUEST_INTERVAL - elapsed);
		}
		lastRequestTime = Date.now();
		
		const response = await requestUrl({
			url,
			method: 'GET',
			headers
		});
		
		if (response.status === 404) {
			return {
				topic,
				products: [],
				total: 0,
				url,
				suggestedTopics: 'Popular topics: ai, productivity, design, developer-tools, saas, mobile, remote-work, no-code, crypto, marketing'
			};
		}
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch Product Hunt topic (HTTP ${response.status})`);
		}
		
		const html = response.text;
		
		// Extract topic description
		const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/);
		const description = descMatch ? descMatch[1] : undefined;
		
		// Parse products in the topic
		const products: Array<{
			rank: number;
			name: string;
			tagline: string;
			votes: string;
		}> = [];
		
		const itemRegex = /<div[^>]*data-test="post-item"[\s\S]{0,500}?<\/div>/g;
		const items = (html.match(itemRegex) || []).slice(0, 10);
		
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			try {
				const nameMatch = item.match(/<h3[^>]*>(.*?)<\/h3>/);
				const name = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, '').trim() : '';
				
				const taglineMatch = item.match(/<p[^>]*>(.*?)<\/p>/);
				const tagline = taglineMatch ? taglineMatch[1].replace(/<[^>]*>/g, '').trim() : '';
				
				const votesMatch = item.match(/(\d+)\s*upvotes?/i);
				const votes = votesMatch ? votesMatch[1] : '0';
				
				if (name) {
					products.push({
						rank: i + 1,
						name,
						tagline,
						votes
					});
				}
			} catch (error) {
				continue;
			}
		}
		
		return {
			topic,
			description,
			products,
			total: products.length,
			url
		};
	}
});
