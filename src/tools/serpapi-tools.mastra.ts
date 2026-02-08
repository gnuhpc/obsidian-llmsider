// SerpAPI search tools for Baidu and Bing - Mastra Tool format
import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { Logger } from './../utils/logger';
import { createMastraTool } from './tool-converter';

/**
 * Common search result interface
 */
export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
  position?: number;
}

/**
 * Common search response interface
 */
export interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  totalResults?: number;
  searchEngine: string;
  error?: string;
}

/**
 * Get plugin settings
 */
let getPluginSettings: (() => any) | null = null;

export function setPluginSettingsGetter(getter: () => any): void {
  getPluginSettings = getter;
}

/**
 * Get SerpAPI key from settings
 */
function getSerpAPIKey(): string {
  if (!getPluginSettings) {
    throw new Error('Plugin settings not initialized');
  }
  const settings = getPluginSettings();
  const apiKey = settings.googleSearch?.serpapiKey;
  if (!apiKey) {
    throw new Error('SerpAPI key not configured. Please add your SerpAPI key in plugin settings.');
  }
  return apiKey;
}

/**
 * Perform Baidu search using SerpAPI
 */
async function searchBaiduWithSerpAPI(
  query: string,
  numResults: number = 10,
  apiKey: string
): Promise<SearchResponse> {
  const encodedQuery = encodeURIComponent(query);
  const apiUrl = `https://serpapi.com/search.json?engine=baidu&q=${encodedQuery}&num=${numResults}&api_key=${apiKey}`;

  try {
    Logger.debug(`Searching Baidu via SerpAPI: "${query}"`);
    
    const response = await requestUrl({
      url: apiUrl,
      method: 'GET',
      throw: false
    });

    if (response.status !== 200) {
      throw new Error(`SerpAPI returned status ${response.status}: ${response.text}`);
    }

    const data = response.json;

    if (!data.organic_results || data.organic_results.length === 0) {
      return {
        success: true,
        query,
        results: [],
        totalResults: 0,
        searchEngine: 'baidu'
      };
    }

    const results: SearchResult[] = data.organic_results.map((item: any, index: number) => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      displayLink: item.displayed_link || (item.link ? new URL(item.link).hostname : ''),
      position: index + 1
    }));

    return {
      success: true,
      query,
      results,
      totalResults: data.search_information?.total_results || results.length,
      searchEngine: 'baidu'
    };
  } catch (error) {
    throw new Error(`Baidu search via SerpAPI failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Perform Bing search using SerpAPI
 */
async function searchBingWithSerpAPI(
  query: string,
  numResults: number = 10,
  apiKey: string
): Promise<SearchResponse> {
  const encodedQuery = encodeURIComponent(query);
  const apiUrl = `https://serpapi.com/search.json?engine=bing&q=${encodedQuery}&count=${numResults}&api_key=${apiKey}`;

  try {
    Logger.debug(`Searching Bing via SerpAPI: "${query}"`);
    
    const response = await requestUrl({
      url: apiUrl,
      method: 'GET',
      throw: false
    });

    if (response.status !== 200) {
      throw new Error(`SerpAPI returned status ${response.status}: ${response.text}`);
    }

    const data = response.json;

    if (!data.organic_results || data.organic_results.length === 0) {
      return {
        success: true,
        query,
        results: [],
        totalResults: 0,
        searchEngine: 'bing'
      };
    }

    const results: SearchResult[] = data.organic_results.map((item: any, index: number) => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      displayLink: item.displayed_link || (item.link ? new URL(item.link).hostname : ''),
      position: index + 1
    }));

    return {
      success: true,
      query,
      results,
      totalResults: data.search_information?.total_results || results.length,
      searchEngine: 'bing'
    };
  } catch (error) {
    throw new Error(`Bing search via SerpAPI failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Baidu search tool (via SerpAPI)
 */
export const baiduSearchTool = createMastraTool({
  category: 'search-web',
  id: 'baidu_search',
  description: 'Search using Baidu search engine (powered by SerpAPI). Returns search results with titles, links, and snippets. Requires SerpAPI key.',
  inputSchema: z.object({
    query: z.string()
      .min(1, 'Search query cannot be empty')
      .describe('The search query'),
    num_results: z.number()
      .min(1)
      .max(50)
      .default(10)
      .optional()
      .describe('Number of search results to return (default: 10, max: 50)')
  }).describe('Tool input parameters'),
  outputSchema: z.array(z.string())
    .describe('Array of URLs from Baidu search results'),
  execute: async ({ context }) => {
    const { query, num_results = 10 } = context;

    const apiKey = getSerpAPIKey();
    const numResults = Math.min(Math.max(num_results, 1), 50);

    const searchResponse = await searchBaiduWithSerpAPI(query, numResults, apiKey);

    // Format results for display
    const formattedResults = searchResponse.results.map((result, index) => {
      return `${index + 1}. **${result.title}**
   URL: ${result.link}
   ${result.snippet}
   ${result.displayLink ? `Source: ${result.displayLink}` : ''}`;
    }).join('\n\n');

    const summary = `# Baidu Search Results for "${query}"

Found ${searchResponse.results.length} results${searchResponse.totalResults ? ` (${searchResponse.totalResults.toLocaleString()} total)` : ''}
Search engine: Baidu (via SerpAPI)

---

${formattedResults || 'No results found.'}`;

    Logger.debug(`Successfully retrieved ${searchResponse.results.length} Baidu results`);

    // Return only URLs array
    return searchResponse.results.map(r => r.link);
  }
});

/**
 * Bing search tool (via SerpAPI)
 */
export const bingSearchTool = createMastraTool({
  category: 'search-web',
  id: 'bing_search',
  description: 'Search using Bing search engine (powered by SerpAPI). Returns search results with titles, links, and snippets. Requires SerpAPI key.',
  inputSchema: z.object({
    query: z.string()
      .min(1, 'Search query cannot be empty')
      .describe('The search query'),
    num_results: z.number()
      .min(1)
      .max(50)
      .default(10)
      .optional()
      .describe('Number of search results to return (default: 10, max: 50)')
  }).describe('Tool input parameters'),
  outputSchema: z.array(z.string())
    .describe('Array of URLs from Bing search results'),
  execute: async ({ context }) => {
    const { query, num_results = 10 } = context;

    const apiKey = getSerpAPIKey();
    const numResults = Math.min(Math.max(num_results, 1), 50);

    const searchResponse = await searchBingWithSerpAPI(query, numResults, apiKey);

    // Format results for display
    const formattedResults = searchResponse.results.map((result, index) => {
      return `${index + 1}. **${result.title}**
   URL: ${result.link}
   ${result.snippet}
   ${result.displayLink ? `Source: ${result.displayLink}` : ''}`;
    }).join('\n\n');

    const summary = `# Bing Search Results for "${query}"

Found ${searchResponse.results.length} results${searchResponse.totalResults ? ` (${searchResponse.totalResults.toLocaleString()} total)` : ''}
Search engine: Bing (via SerpAPI)

---

${formattedResults || 'No results found.'}`;

    Logger.debug(`Successfully retrieved ${searchResponse.results.length} Bing results`);

    // Return only URLs array
    return searchResponse.results.map(r => r.link);
  }
});
