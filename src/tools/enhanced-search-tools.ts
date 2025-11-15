// Enhanced unified search tool manager
// Aggregates results from multiple search engines with ranking and filtering
// Based on DDGS implementation pattern
import { BuiltInTool } from './built-in-tools';
import { Logger } from './../utils/logger';
import { 
  duckduckgoTextSearchTool,
  duckduckgoImageSearchTool,
  duckduckgoNewsSearchTool,
  duckduckgoVideoSearchTool
} from './duckduckgo-tools';
import { wikipediaSearchTool } from './wikipedia-tools';
import { webSearchTool } from './google-search-tools';

/**
 * Search category types
 */
export type SearchCategory = 'text' | 'images' | 'news' | 'videos' | 'knowledge';

/**
 * Search backend/engine types
 */
export type SearchBackend = 'auto' | 'duckduckgo' | 'google' | 'tavily' | 'serpapi' | 'wikipedia';

/**
 * Unified search result interface
 */
interface UnifiedSearchResult {
  title: string;
  url?: string;
  snippet?: string;
  source: string;
  relevanceScore?: number;
  metadata?: Record<string, any>;
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
export const enhancedSearchTool: BuiltInTool = {
  name: 'enhanced_search',
  description: 'Enhanced web search with multi-backend support and category-specific search.',
  category: 'search-engines',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      },
      category: {
        type: 'string',
        enum: ['text', 'images', 'news', 'videos', 'knowledge'],
        description: 'Search category (default: text). knowledge=Wikipedia only',
        default: 'text'
      },
      backend: {
        type: 'string',
        enum: ['auto', 'duckduckgo', 'google', 'tavily', 'serpapi', 'wikipedia'],
        description: 'Search backend (default: auto). auto=aggregate from multiple sources',
        default: 'auto'
      },
      region: {
        type: 'string',
        description: 'Search region (e.g., us-en, uk-en, de-de)',
        default: 'us-en'
      },
      safesearch: {
        type: 'string',
        enum: ['on', 'moderate', 'off'],
        description: 'Safe search level (default: moderate)',
        default: 'moderate'
      },
      timelimit: {
        type: 'string',
        enum: ['d', 'w', 'm', 'y'],
        description: 'Time limit: d=day, w=week, m=month, y=year (optional)'
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results (default: 10, max: 50)',
        default: 10,
        minimum: 1,
        maximum: 50
      }
    },
    required: ['query']
  },
  async execute(args: {
    query: string;
    category?: SearchCategory;
    backend?: SearchBackend;
    region?: string;
    safesearch?: string;
    timelimit?: string;
    max_results?: number;
  }): Promise<any> {
    try {
      const {
        query,
        category = 'text',
        backend = 'auto',
        region = 'us-en',
        safesearch = 'moderate',
        timelimit,
        max_results = 10
      } = args;

      Logger.debug(`Query: "${query}", Category: ${category}, Backend: ${backend}`);

      const allResults: UnifiedSearchResult[] = [];
      const engines: string[] = [];

      // Determine which engines to use
      if (backend === 'auto') {
        // Use multiple engines for better results
        switch (category) {
          case 'text':
            engines.push('duckduckgo', 'google', 'wikipedia');
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
          case 'knowledge':
            engines.push('wikipedia');
            break;
        }
      } else {
        engines.push(backend);
      }

      // Execute searches in parallel
      const searchPromises: Promise<any>[] = [];

      for (const engine of engines) {
        try {
          let searchPromise: Promise<any>;

          switch (engine) {
            case 'duckduckgo':
              if (category === 'text') {
                searchPromise = duckduckgoTextSearchTool.execute({
                  query,
                  region,
                  safesearch,
                  timelimit,
                  max_results: Math.ceil(max_results / engines.length)
                });
              } else if (category === 'images') {
                searchPromise = duckduckgoImageSearchTool.execute({
                  query,
                  region,
                  safesearch,
                  max_results: Math.ceil(max_results / engines.length)
                });
              } else if (category === 'news') {
                searchPromise = duckduckgoNewsSearchTool.execute({
                  query,
                  region,
                  safesearch,
                  timelimit,
                  max_results: Math.ceil(max_results / engines.length)
                });
              } else if (category === 'videos') {
                searchPromise = duckduckgoVideoSearchTool.execute({
                  query,
                  region,
                  safesearch,
                  timelimit,
                  max_results: Math.ceil(max_results / engines.length)
                });
              } else {
                continue;
              }
              break;

            case 'google':
            case 'tavily':
            case 'serpapi':
              if (category === 'text') {
                searchPromise = webSearchTool.execute({
                  query,
                  num_results: Math.ceil(max_results / engines.length)
                });
              } else {
                continue;
              }
              break;

            case 'wikipedia':
              if (category === 'text' || category === 'knowledge') {
                const [, lang] = region.split('-');
                searchPromise = wikipediaSearchTool.execute({
                  query,
                  language: lang || 'en',
                  max_results: Math.min(3, Math.ceil(max_results / engines.length))
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
      for (const { engine, result } of searchResults) {
        if (!result || !result.success || !result.results) {
          continue;
        }

        for (const item of result.results) {
          const unifiedResult: UnifiedSearchResult = {
            title: item.title || '',
            url: item.url || item.href || item.link || item.image || item.embed_url || '',
            snippet: item.snippet || item.body || item.description || item.summary || '',
            source: engine,
            metadata: item
          };

          allResults.push(unifiedResult);
        }
      }

      // Rank and deduplicate results
      const rankedResults = aggregateAndRankResults(allResults, query, max_results);

      // Format results
      const formattedResults = rankedResults.map((result, index) => {
        return `${index + 1}. **${result.title}** [${result.source}]
   URL: ${result.url}
   ${result.snippet}
   Relevance Score: ${result.relevanceScore?.toFixed(2) || 'N/A'}`;
      }).join('\n\n');

      const summary = `# Enhanced Search Results for "${query}"

Category: ${category} | Backends: ${engines.join(', ')}
Found ${rankedResults.length} results from ${allResults.length} total
Region: ${region} | SafeSearch: ${safesearch}${timelimit ? ` | Time: ${timelimit}` : ''}

---

${formattedResults || 'No results found.'}`;

      Logger.debug(`Aggregated ${rankedResults.length} results from ${engines.length} engine(s)`);

      return {
        success: true,
        query,
        category,
        backends: engines,
        results: rankedResults,
        resultsCount: rankedResults.length,
        totalResultsBeforeRanking: allResults.length,
        formattedSummary: summary
      };

    } catch (error) {
      Logger.error('Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: args.query,
        category: args.category || 'text',
        backend: args.backend || 'auto'
      };
    }
  }
};

/**
 * Get all available enhanced search tools
 */
export function getAllEnhancedSearchTools(): BuiltInTool[] {
  return [
    enhancedSearchTool,
    duckduckgoTextSearchTool,
    duckduckgoImageSearchTool,
    duckduckgoNewsSearchTool,
    duckduckgoVideoSearchTool,
    wikipediaSearchTool
  ];
}
