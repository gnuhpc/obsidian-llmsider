// Enhanced unified search tool manager - Mastra Tool format
// Aggregates results from multiple search engines with ranking and filtering
import { z } from 'zod';
import { Logger } from './../utils/logger';
import { createMastraTool } from './tool-converter';
import { 
  duckduckgoTextSearchTool,
  duckduckgoImageSearchTool,
  duckduckgoNewsSearchTool,
  duckduckgoVideoSearchTool
} from './duckduckgo-tools.mastra';
import { googleSearchTool } from './google-search-tools.mastra';
import { baiduSearchTool, bingSearchTool } from './serpapi-tools.mastra';

/**
 * Search category types
 */
export type SearchCategory = 'text' | 'images' | 'news' | 'videos';

/**
 * Search backend/engine types
 */
export type SearchBackend = 'auto' | 'duckduckgo' | 'google' | 'tavily' | 'serpapi' | 'baidu' | 'bing';

/**
 * Unified search result interface
 */
interface UnifiedSearchResult {
  title: string;
  url?: string;
  snippet?: string;
  source: string;
  relevanceScore?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Simple text similarity scoring for ranking
 */
function calculateRelevance(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Basic relevance factors
  let score = 0;
  
  // Exact match in text
  if (textLower.includes(queryLower)) {
    score += 10;
  }
  
  // Individual word matches
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);
  
  for (const qWord of queryWords) {
    if (qWord.length < 3) continue; // Skip short words
    
    for (const tWord of textWords) {
      if (tWord.includes(qWord)) {
        score += 1;
      }
    }
  }
  
  // Position bonus (earlier matches are better)
  const firstMatchIndex = textLower.indexOf(queryLower);
  if (firstMatchIndex >= 0) {
    score += Math.max(0, 5 - firstMatchIndex / 20);
  }
  
  return score;
}

/**
 * Deduplicate and rank search results
 */
function aggregateAndRankResults(
  results: UnifiedSearchResult[],
  query: string,
  maxResults: number
): UnifiedSearchResult[] {
  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueResults: UnifiedSearchResult[] = [];
  
  for (const result of results) {
    const url = result.url || result.title;
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      uniqueResults.push(result);
    }
  }
  
  // Calculate relevance scores if not already present
  for (const result of uniqueResults) {
    if (result.relevanceScore === undefined) {
      const combinedText = `${result.title} ${result.snippet || ''}`;
      result.relevanceScore = calculateRelevance(query, combinedText);
    }
  }
  
  // Sort by relevance score (descending)
  uniqueResults.sort((a, b) => {
    const scoreA = a.relevanceScore || 0;
    const scoreB = b.relevanceScore || 0;
    return scoreB - scoreA;
  });
  
  // Return top results
  return uniqueResults.slice(0, maxResults);
}

/**
 * Enhanced unified search tool with multi-engine support
 */
export const webSearchTool = createMastraTool({
  id: 'web_search',
  category: 'search-web',
  description: 'The most powerful web search tool that aggregates results from multiple search engines (DuckDuckGo, Google, Tavily, SerpAPI, Baidu, Bing). Supports text, images, news, and video search with intelligent ranking and deduplication.',
  inputSchema: z.object({
    query: z.string()
      .min(1)
      .describe('The search query'),
    category: z.enum(['text', 'images', 'news', 'videos'])
      .default('text')
      .optional()
      .describe('Search category (default: text)'),
    backend: z.enum(['auto', 'duckduckgo', 'google', 'tavily', 'serpapi', 'baidu', 'bing'])
      .default('auto')
      .optional()
      .describe('Search backend (default: auto). auto=aggregate from multiple sources including Baidu and Bing via SerpAPI'),
    region: z.string()
      .default('us-en')
      .optional()
      .describe('Search region (e.g., us-en, uk-en, de-de)'),
    safesearch: z.enum(['on', 'moderate', 'off'])
      .default('moderate')
      .optional()
      .describe('Safe search level (default: moderate)'),
    timelimit: z.enum(['d', 'w', 'm', 'y'])
      .optional()
      .describe('Time limit: d=day, w=week, m=month, y=year (optional)'),
    max_results: z.number()
      .min(1)
      .max(50)
      .default(10)
      .optional()
      .describe('Maximum number of results (default: 10, max: 50)')
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
      source: z.string()
    }))
  }).describe('Search results with metadata'),
  execute: async ({ context }) => {
    const {
      query,
      category = 'text',
      backend = 'auto',
      region = 'us-en',
      safesearch = 'moderate',
      timelimit,
      max_results = 10
    } = context;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }

    Logger.debug(`Query: "${query}", Category: ${category}, Backend: ${backend}`);

    const allResults: UnifiedSearchResult[] = [];
    const engines: string[] = [];

    // Determine which engines to use
    if (backend === 'auto') {
      // Use multiple engines for better results
      switch (category) {
        case 'text':
          engines.push('duckduckgo', 'google', 'baidu', 'bing');
          break;
        case 'images':
          engines.push('duckduckgo');
          break;
        case 'news':
          engines.push('duckduckgo');
          break;
        case 'videos':
          engines.push('duckduckgo');
          break;
      }
    } else {
      engines.push(backend);
    }

    // Execute searches in parallel
    const searchPromises: Promise<unknown>[] = [];

    for (const engine of engines) {
      try {
        let searchPromise: Promise<unknown>;

        switch (engine) {
          case 'duckduckgo':
            if (category === 'text') {
              searchPromise = duckduckgoTextSearchTool.execute({
                context: {
                  query,
                  region,
                  safesearch,
                  timelimit,
                  max_results: Math.ceil(max_results / engines.length)
                }
              });
            } else if (category === 'images') {
              searchPromise = duckduckgoImageSearchTool.execute({
                context: {
                  query,
                  region,
                  safesearch,
                  max_results: Math.ceil(max_results / engines.length)
                }
              });
            } else if (category === 'news') {
              searchPromise = duckduckgoNewsSearchTool.execute({
                context: {
                  query,
                  region,
                  safesearch,
                  timelimit,
                  max_results: Math.ceil(max_results / engines.length)
                }
              });
            } else if (category === 'videos') {
              searchPromise = duckduckgoVideoSearchTool.execute({
                context: {
                  query,
                  region,
                  safesearch,
                  timelimit,
                  max_results: Math.ceil(max_results / engines.length)
                }
              });
            } else {
              continue;
            }
            break;

          case 'google':
          case 'tavily':
          case 'serpapi':
            if (category === 'text') {
              searchPromise = googleSearchTool.execute({
                context: {
                  query,
                  num_results: Math.ceil(max_results / engines.length)
                }
              });
            } else {
              continue;
            }
            break;

          case 'baidu':
            if (category === 'text') {
              searchPromise = baiduSearchTool.execute({
                context: {
                  query,
                  num_results: Math.ceil(max_results / engines.length)
                }
              });
            } else {
              continue;
            }
            break;

          case 'bing':
            if (category === 'text') {
              searchPromise = bingSearchTool.execute({
                context: {
                  query,
                  num_results: Math.ceil(max_results / engines.length)
                }
              });
            } else {
              continue;
            }
            break;

          default:
            continue;
        }

        searchPromises.push(
          searchPromise.then(result => ({ engine, result })).catch(error => {
            Logger.warn(`${engine} failed:`, error);
            return { engine, result: null };
          })
        );
      } catch (error) {
        Logger.warn(`Error setting up ${engine}:`, error);
      }
    }

    // Wait for all searches to complete
    const searchResults = await Promise.all(searchPromises);

    // Aggregate results
    for (const item of searchResults) {
      const { engine, result } = item as { engine: string; result: any };
      if (!result || !result.success || !result.results) {
        continue;
      }

      for (const resItem of result.results) {
        const unifiedResult: UnifiedSearchResult = {
          title: resItem.title || '',
          url: resItem.url || resItem.href || resItem.link || resItem.image || resItem.embed_url || '',
          snippet: resItem.snippet || resItem.body || resItem.description || resItem.summary || '',
          source: engine,
          metadata: resItem
        };

        allResults.push(unifiedResult);
      }
    }

    // Rank and deduplicate results
    const rankedResults = aggregateAndRankResults(allResults, query, max_results);

    // Format results
    const formattedResults = rankedResults.map((result, index) => {
      return `${index + 1}. **${result.title}** [${result.source}]\n   URL: ${result.url}\n   ${result.snippet}\n   Relevance Score: ${result.relevanceScore?.toFixed(2) || 'N/A'}`;
    }).join('\n\n');

    const summary = `# Enhanced Search Results for "${query}"\n\nCategory: ${category} | Backends: ${engines.join(', ')}\nFound ${rankedResults.length} results from ${allResults.length} total\nRegion: ${region} | SafeSearch: ${safesearch}${timelimit ? ` | Time: ${timelimit}` : ''}\n\n---\n\n${formattedResults || 'No results found.'}`;

    Logger.debug(`Aggregated ${rankedResults.length} results from ${engines.length} engine(s)`);

    // Return rich results
    return {
      results: rankedResults.map(r => ({
        title: r.title,
        url: r.url || '',
        snippet: r.snippet || '',
        source: r.source
      }))
    };
  }
});

/**
 * Get all available enhanced search tools
 */
export function getAllEnhancedSearchTools(): any[] {
  return [
    webSearchTool,
    duckduckgoTextSearchTool,
    duckduckgoImageSearchTool,
    duckduckgoNewsSearchTool,
    duckduckgoVideoSearchTool,
    baiduSearchTool,
    bingSearchTool
  ];
}
