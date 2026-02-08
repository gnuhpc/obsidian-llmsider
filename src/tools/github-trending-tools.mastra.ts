/**
 * GitHub Trending Tools (Mastra Format)
 * 
 * Scrapes GitHub trending repositories, developers, and topics
 * No authentication required - free public access
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

const GITHUB_BASE_URL = 'https://github.com';

// Rate limiting to avoid being blocked
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds

async function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedRequest(url: string, headers: Record<string, string>) {
	const now = Date.now();
	const elapsed = now - lastRequestTime;
	
	if (elapsed < MIN_REQUEST_INTERVAL) {
		await sleep(MIN_REQUEST_INTERVAL - elapsed);
	}
	
	lastRequestTime = Date.now();
	
	return await requestUrl({
		url,
		headers,
		method: 'GET'
	});
}

interface TrendingRepo {
	rank: number;
	author: string;
	name: string;
	description: string;
	language: string;
	stars: string;
	forks: string;
	todayStars: string;
	url: string;
}

interface TrendingDeveloper {
	rank: number;
	username: string;
	name: string;
	sponsorable: boolean;
	popularRepo: {
		name: string;
		description: string;
	};
	url: string;
}

/**
 * Parse HTML to extract trending repositories
 */
function parseTrendingRepos(html: string): TrendingRepo[] {
	const repos: TrendingRepo[] = [];
	
	// Match article elements containing repo information
	const articleRegex = /<article class="Box-row"[\s\S]*?<\/article>/g;
	const articles = html.match(articleRegex) || [];
	
	let rank = 1;
	for (const article of articles) {
		try {
			// Extract repo author and name
			const repoMatch = article.match(/<h2[^>]*>[\s\S]*?<a href="\/([^"]+)"/);
			if (!repoMatch) continue;
			
			const fullName = repoMatch[1];
			const [author, name] = fullName.split('/');
			
			// Extract description
			const descMatch = article.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
			const description = descMatch 
				? descMatch[1].replace(/<[^>]*>/g, '').trim()
				: '';
			
			// Extract language
			const langMatch = article.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>(.*?)<\/span>/);
			const language = langMatch ? langMatch[1].trim() : 'Unknown';
			
			// Extract stars
			const starsMatch = article.match(/<svg[^>]*octicon-star[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/);
			const stars = starsMatch ? starsMatch[1].trim() : '0';
			
			// Extract forks
			const forksMatch = article.match(/<svg[^>]*octicon-repo-forked[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/);
			const forks = forksMatch ? forksMatch[1].trim() : '0';
			
			// Extract today's stars
			const todayMatch = article.match(/<span class="d-inline-block float-sm-right">([\s\S]*?)<\/span>/);
			let todayStars = '0';
			if (todayMatch) {
				const starsToday = todayMatch[1].match(/([\d,]+)\s*stars?\s*today/i);
				if (starsToday) {
					todayStars = starsToday[1].trim();
				}
			}
			
			repos.push({
				rank,
				author,
				name,
				description,
				language,
				stars,
				forks,
				todayStars,
				url: `${GITHUB_BASE_URL}/${fullName}`
			});
			
			rank++;
		} catch (error) {
			// Skip this repo if parsing fails
			continue;
		}
	}
	
	return repos;
}

/**
 * Parse HTML to extract trending developers
 */
function parseTrendingDevelopers(html: string): TrendingDeveloper[] {
	const developers: TrendingDeveloper[] = [];
	
	// Match article elements containing developer information
	const articleRegex = /<article class="Box-row"[\s\S]*?<\/article>/g;
	const articles = html.match(articleRegex) || [];
	
	let rank = 1;
	for (const article of articles) {
		try {
			// Extract username
			const usernameMatch = article.match(/<h1[^>]*>[\s\S]*?<a href="\/([^"]+)"/);
			if (!usernameMatch) continue;
			
			const username = usernameMatch[1];
			
			// Extract full name
			const nameMatch = article.match(/<p[^>]*class="[^"]*f4[^"]*"[^>]*>(.*?)<\/p>/);
			const name = nameMatch 
				? nameMatch[1].replace(/<[^>]*>/g, '').trim()
				: username;
			
			// Check if sponsorable
			const sponsorable = article.includes('octicon-heart');
			
			// Extract popular repo
			const repoMatch = article.match(/<h1[^>]*class="[^"]*h4[^"]*"[^>]*>[\s\S]*?<a href="[^"]*">[\s\S]*?<span[^>]*>(.*?)<\/span>[\s\S]*?<span[^>]*>(.*?)<\/span>/);
			let popularRepo = { name: '', description: '' };
			if (repoMatch) {
				popularRepo.name = repoMatch[1].trim();
				const descMatch = article.match(/<div[^>]*class="[^"]*f6[^"]*"[^>]*>(.*?)<\/div>/);
				popularRepo.description = descMatch 
					? descMatch[1].replace(/<[^>]*>/g, '').trim()
					: '';
			}
			
			developers.push({
				rank,
				username,
				name,
				sponsorable,
				popularRepo,
				url: `${GITHUB_BASE_URL}/${username}`
			});
			
			rank++;
		} catch (error) {
			// Skip this developer if parsing fails
			continue;
		}
	}
	
	return developers;
}

/**
 * Tool: Get GitHub Trending Repositories
 */
export const getGitHubTrendingReposTool = createMastraTool({
  category: 'news-info',
	id: 'get_github_trending_repos',
	description: 'Get trending repositories from GitHub. Shows popular projects developers are starring today.',
	
	inputSchema: z.object({
		language: z.string()
			.describe('Programming language to filter by (e.g., javascript, python, typescript, go, rust). Leave empty for all languages.')
			.optional(),
		since: z.enum(['daily', 'weekly', 'monthly'])
			.describe('Time range: daily, weekly, or monthly.')
			.default('daily'),
		max_results: z.number()
			.min(1)
			.max(25)
			.describe('Maximum number of repositories to return (1-25).')
			.default(10)
	}).describe('Tool input parameters'),
	
	outputSchema: z.string().describe('Formatted trending repositories information'),
	
	execute: async ({ context }) => {
		const language = context.language || '';
		const since = context.since;
		const maxResults = context.max_results;
		
		// Build URL
		let url = `${GITHUB_BASE_URL}/trending`;
		if (language) {
			url += `/${encodeURIComponent(language.toLowerCase())}`;
		}
		url += `?since=${since}`;
		
		const headers = {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9'
		};
		
		const response = await rateLimitedRequest(url, headers);
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch GitHub trending repositories (HTTP ${response.status})`);
		}
		
		const html = response.text;
		const repos = parseTrendingRepos(html);
		
		if (repos.length === 0) {
			throw new Error(`No trending repositories found${language ? ` for ${language}` : ''}`);
		}
		
		const resultRepos = repos.slice(0, maxResults);
		
		let result = `GitHub Trending Repositories (${since})${language ? ` - ${language}` : ''}\n`;
		result += `Found ${resultRepos.length} repositories:\n\n`;
		
		for (const repo of resultRepos) {
			result += `${repo.rank}. ${repo.author}/${repo.name}\n`;
			result += `   Language: ${repo.language}\n`;
			result += `   Stars: ${repo.stars} (⭐ ${repo.todayStars} today)\n`;
			result += `   Forks: ${repo.forks}\n`;
			if (repo.description) {
				result += `   Description: ${repo.description}\n`;
			}
			result += `   URL: ${repo.url}\n\n`;
		}
		
		return result.trim();
	}
});

/**
 * Tool: Get GitHub Trending Developers
 */
export const getGitHubTrendingDevelopersTool = createMastraTool({
  category: 'news-info',
	id: 'get_github_trending_developers',
	description: 'Get trending developers on GitHub. Shows developers that the community is following.',
	
	inputSchema: z.object({
		language: z.string()
			.describe('Programming language to filter by (e.g., javascript, python, typescript). Leave empty for all languages.')
			.optional(),
		since: z.enum(['daily', 'weekly', 'monthly'])
			.describe('Time range: daily, weekly, or monthly.')
			.default('daily'),
		max_results: z.number()
			.min(1)
			.max(25)
			.describe('Maximum number of developers to return (1-25).')
			.default(10)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Formatted trending developers information'),
	
	execute: async ({ context }) => {
		const language = context.language || '';
		const since = context.since;
		const maxResults = context.max_results;
		
		// Build URL
		let url = `${GITHUB_BASE_URL}/trending/developers`;
		if (language) {
			url += `/${encodeURIComponent(language.toLowerCase())}`;
		}
		url += `?since=${since}`;
		
		const headers = {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9'
		};
		
		const response = await rateLimitedRequest(url, headers);
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch GitHub trending developers (HTTP ${response.status})`);
		}
		
		const html = response.text;
		const developers = parseTrendingDevelopers(html);
		
		if (developers.length === 0) {
			throw new Error(`No trending developers found${language ? ` for ${language}` : ''}`);
		}
		
		const resultDevs = developers.slice(0, maxResults);
		
		let result = `GitHub Trending Developers (${since})${language ? ` - ${language}` : ''}\n`;
		result += `Found ${resultDevs.length} developers:\n\n`;
		
		for (const dev of resultDevs) {
			result += `${dev.rank}. ${dev.name} (@${dev.username})${dev.sponsorable ? ' 💖' : ''}\n`;
			if (dev.popularRepo.name) {
				result += `   Popular Repo: ${dev.popularRepo.name}\n`;
				if (dev.popularRepo.description) {
					result += `   Description: ${dev.popularRepo.description}\n`;
				}
			}
			result += `   Profile: ${dev.url}\n\n`;
		}
		
		return result.trim();
	}
});

/**
 * Tool: Search GitHub Topics
 */
export const searchGitHubTopicsTool = createMastraTool({
  category: 'news-info',
	id: 'search_github_topics',
	description: 'Search for GitHub topics and get trending repositories in that topic.',
	
	inputSchema: z.object({
		topic: z.string()
			.min(1)
			.describe('Topic to search for (e.g., machine-learning, web-development, blockchain)'),
		max_results: z.number()
			.min(1)
			.max(20)
			.describe('Maximum number of repositories to return (1-20).')
			.default(10)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Formatted topic search results'),
	
	execute: async ({ context }) => {
		const topic = context.topic.trim().toLowerCase().replace(/\s+/g, '-');
		const maxResults = context.max_results;
		
		if (!topic) {
			throw new Error('Topic cannot be empty');
		}
		
		const url = `${GITHUB_BASE_URL}/topics/${encodeURIComponent(topic)}`;
		
		const headers = {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9'
		};
		
		const response = await rateLimitedRequest(url, headers);
		
		if (response.status === 404) {
			throw new Error(`Topic "${topic}" not found on GitHub. Try a different topic name.`);
		}
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch GitHub topic (HTTP ${response.status})`);
		}
		
		const html = response.text;
		
		// Extract topic description
		const descMatch = html.match(/<p[^>]*class="[^"]*f4[^"]*"[^>]*>(.*?)<\/p>/);
		const description = descMatch 
			? descMatch[1].replace(/<[^>]*>/g, '').trim()
			: '';
		
		// Extract repositories (simplified parsing)
		const repos: Array<{
			name: string;
			description: string;
			stars: string;
			language: string;
			url: string;
		}> = [];
		
		const articleRegex = /<article[\s\S]*?<\/article>/g;
		const articles = (html.match(articleRegex) || []).slice(0, maxResults);
		
		for (const article of articles) {
			try {
				const repoMatch = article.match(/<a[^>]*href="\/([^"]+)"[^>]*>/);
				if (!repoMatch) continue;
				
				const fullName = repoMatch[1];
				
				const descMatch = article.match(/<p[^>]*>(.*?)<\/p>/);
				const repoDesc = descMatch 
					? descMatch[1].replace(/<[^>]*>/g, '').trim()
					: '';
				
				const starsMatch = article.match(/<svg[^>]*octicon-star[^>]*>[\s\S]*?<\/svg>\s*([\d.k]+)/i);
				const stars = starsMatch ? starsMatch[1].trim() : '0';
				
				const langMatch = article.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>(.*?)<\/span>/);
				const language = langMatch ? langMatch[1].trim() : 'Unknown';
				
				repos.push({
					name: fullName,
					description: repoDesc,
					stars,
					language,
					url: `${GITHUB_BASE_URL}/${fullName}`
				});
			} catch (error) {
				continue;
			}
		}
		
		if (repos.length === 0) {
			throw new Error(`No repositories found for topic "${topic}"`);
		}
		
		let result = `GitHub Topic: ${topic}\n`;
		if (description) {
			result += `Description: ${description}\n`;
		}
		result += `\nTop ${repos.length} repositories:\n\n`;
		
		for (let i = 0; i < repos.length; i++) {
			const repo = repos[i];
			result += `${i + 1}. ${repo.name}\n`;
			result += `   Language: ${repo.language}\n`;
			result += `   Stars: ${repo.stars}\n`;
			if (repo.description) {
				result += `   Description: ${repo.description}\n`;
			}
			result += `   URL: ${repo.url}\n\n`;
		}
		
		return result.trim();
	}
});
