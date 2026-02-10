/**
 * IMDB Tools - Search movies, TV shows, and people - Mastra format
 * Uses IMDB's public search API - no authentication required
 * Note: Use responsibly with rate limiting to avoid being blocked
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import type { MastraTool } from './mastra-tool-types';
import { createMastraTool } from './tool-converter';

const IMDB_SEARCH_URL = 'https://v3.sg.media-imdb.com/suggestion/x';
const IMDB_TITLE_URL = 'https://www.imdb.com/title';

// Rate limiting: Add delay between requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

async function rateLimitedRequest(url: string, headers: Record<string, string> = {}) {
	const now = Date.now();
	const timeSinceLastRequest = now - lastRequestTime;
	
	if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
		await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
	}
	
	lastRequestTime = Date.now();
	
	return await requestUrl({
		url,
		method: 'GET',
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept-Language': 'en',
			'Accept': 'application/json',
			...headers
		}
	});
}

/**
 * Search IMDB for movies, TV shows, and people
 */
export const searchIMDBTool: MastraTool = createMastraTool({
  category: 'entertainment',
	id: 'search_imdb',
	description: 'Search IMDB for movies, TV shows, actors, directors, and other entertainment content. Returns titles, years, cast, ratings, and poster images.',
	
	inputSchema: z.object({
		query: z.string()
			.min(1)
			.describe('Search query (movie/show title, person name, etc.)'),
		
		max_results: z.number()
			.min(1)
			.max(20)
			.optional()
			.default(10)
			.describe('Maximum number of results to return (1-20, default: 10)')
	}),
	
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
		query: z.string().optional(),
		results: z.array(z.object({
			id: z.string(),
			title: z.string(),
			type: z.string(),
			year: z.union([z.number(), z.string()]),
			url: z.string(),
			starring: z.string().optional(),
			image: z.string().optional(),
			rank: z.number().optional()
		}))
	}).describe('Search results from IMDB including movie/show details'),
	
	execute: async ({ context }) => {
		const { query, max_results = 10 } = context;

		if (!query || query.trim() === '') {
			throw new Error('Query parameter is required');
		}

		const limit = Math.min(Math.max(1, max_results), 20);

		try {
			const searchUrl = `${IMDB_SEARCH_URL}/${encodeURIComponent(query)}.json?includeVideos=0`;
			
			const response = await rateLimitedRequest(searchUrl);

			if (response.status !== 200) {
				throw new Error(`IMDB API returned status ${response.status}`);
			}

			const data = response.json;
			
			if (!data || !data.d || !Array.isArray(data.d)) {
				return {
					success: true,
					message: `No results found for "${query}"`,
					results: []
				};
			}

			const results = data.d.slice(0, limit).map((item: any) => {
				const result: any = {
					id: item.id || 'N/A',
					title: item.l || 'N/A',
					type: item.q || 'N/A',
					year: item.y || (item.yr ? item.yr : 'N/A'),
					url: item.id ? `${IMDB_TITLE_URL}/${item.id}` : 'N/A'
				};

				if (item.s) {
					result.starring = item.s;
				}

				if (item.i && item.i.imageUrl) {
					result.image = item.i.imageUrl;
				}

				if (item.rank) {
					result.rank = item.rank;
				}

				return result;
			});

			return {
				success: true,
				message: `Found ${results.length} result(s) for "${query}"`,
				query: query,
				results: results
			};

		} catch (error) {
			throw new Error(`Failed to search IMDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
});
