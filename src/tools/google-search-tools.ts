// Google search tools for web search functionality
import { requestUrl } from 'obsidian';
import { Logger } from './../utils/logger';
import { BuiltInTool } from './built-in-tools';

/**
 * Google search result interface
 */
interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
}

/**
 * Google search response interface
 */
interface GoogleSearchResponse {
  success: boolean;
  query: string;
  results: GoogleSearchResult[];
  totalResults?: number;
  searchTime?: number;
  error?: string;
}

/**
 * Perform Google search using Google Custom Search JSON API
 * Requires API key and Search Engine ID to be configured
 */
async function searchWithGoogleAPI(
  query: string,
  numResults: number = 10,
  apiKey?: string,
  searchEngineId?: string
): Promise<GoogleSearchResponse> {
  if (!apiKey || !searchEngineId) {
    throw new Error('Google API key and Search Engine ID are required. Please configure them in plugin settings.');
  }

  const encodedQuery = encodeURIComponent(query);
  const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodedQuery}&num=${Math.min(numResults, 10)}`;

  try {
    const response = await requestUrl({
      url: apiUrl,
      method: 'GET',
      throw: false
    });

    if (response.status !== 200) {
      throw new Error(`Google API returned status ${response.status}: ${response.text}`);
    }

    const data = response.json;

    if (!data.items || data.items.length === 0) {
      return {
        success: true,
        query,
        results: [],
        totalResults: 0,
        searchTime: data.searchInformation?.searchTime || 0
      };
    }

    const results: GoogleSearchResult[] = data.items.map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      displayLink: item.displayLink || ''
    }));

    return {
      success: true,
      query,
      results,
      totalResults: parseInt(data.searchInformation?.totalResults || '0'),
      searchTime: parseFloat(data.searchInformation?.searchTime || '0')
    };
  } catch (error) {
    throw new Error(`Google API search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Perform Google search using SerpAPI
 * Requires SerpAPI key to be configured
 */
async function searchWithSerpAPI(
  query: string,
  numResults: number = 10,
  apiKey?: string
): Promise<GoogleSearchResponse> {
  if (!apiKey) {
    throw new Error('SerpAPI key is required. Please configure it in plugin settings.');
  }

  const encodedQuery = encodeURIComponent(query);
  const apiUrl = `https://serpapi.com/search.json?q=${encodedQuery}&num=${numResults}&api_key=${apiKey}`;

  try {
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
        totalResults: 0
      };
    }

    const results: GoogleSearchResult[] = data.organic_results.map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      displayLink: item.displayed_link || ''
    }));

    return {
      success: true,
      query,
      results,
      totalResults: data.search_information?.total_results || results.length
    };
  } catch (error) {
    throw new Error(`SerpAPI search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Perform search using Tavily Search API (optimized for AI, free tier available)
 */
async function searchWithTavily(
  query: string,
  numResults: number = 10,
  apiKey?: string
): Promise<GoogleSearchResponse> {
  if (!apiKey) {
    throw new Error('Tavily API key is required. Please configure it in plugin settings or get one from https://tavily.com');
  }

  try {
    const response = await requestUrl({
      url: 'https://api.tavily.com/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        include_answer: false,
        include_images: false,
        include_raw_content: false,
        max_results: Math.min(numResults, 10)
      }),
      throw: false
    });

    if (response.status !== 200) {
      throw new Error(`Tavily API returned status ${response.status}: ${response.text}`);
    }

    const data = response.json;

    if (!data.results || data.results.length === 0) {
      return {
        success: true,
        query,
        results: [],
        totalResults: 0
      };
    }

    const results: GoogleSearchResult[] = data.results.map((item: any) => ({
      title: item.title || '',
      link: item.url || '',
      snippet: item.content || '',
      displayLink: item.url ? new URL(item.url).hostname.replace('www.', '') : ''
    }));

    return {
      success: true,
      query,
      results,
      totalResults: results.length
    };
  } catch (error) {
    throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Perform search using DuckDuckGo HTML scraping (free, no API key required)
 */
async function searchWithDuckDuckGo(
  query: string,
  numResults: number = 10
): Promise<GoogleSearchResponse> {
  const encodedQuery = encodeURIComponent(query);
  // Use DuckDuckGo HTML version for better results
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

  try {
    const response = await requestUrl({
      url: searchUrl,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://duckduckgo.com/'
      },
      throw: false
    });

    if (response.status !== 200) {
      throw new Error(`DuckDuckGo returned status ${response.status}`);
    }

    const html = response.text;
    const results: GoogleSearchResult[] = [];

    // Parse HTML to extract search results
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find all result divs (DuckDuckGo uses class 'result' for search results)
    const resultElements = doc.querySelectorAll('.result, .web-result');

    for (const element of Array.from(resultElements)) {
      if (results.length >= numResults) break;

      try {
        // Extract title
        const titleElement = element.querySelector('.result__a, .result__title a, a.result__a');
        const title = titleElement?.textContent?.trim() || '';
        
        // Extract URL
        const url = titleElement?.getAttribute('href') || '';
        let cleanUrl = url;
        
        // DuckDuckGo uses redirect URLs, extract actual URL
        if (url.includes('uddg=')) {
          const uddgMatch = url.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            cleanUrl = decodeURIComponent(uddgMatch[1]);
          }
        }

        // Extract snippet
        const snippetElement = element.querySelector('.result__snippet, .result__description');
        const snippet = snippetElement?.textContent?.trim() || '';

        // Extract display link
        let displayLink = '';
        try {
          if (cleanUrl) {
            displayLink = new URL(cleanUrl).hostname.replace('www.', '');
          }
        } catch (e) {
          displayLink = cleanUrl.split('/')[2] || '';
        }

        if (title && cleanUrl) {
          results.push({
            title,
            link: cleanUrl,
            snippet,
            displayLink
          });
        }
      } catch (error) {
        Logger.warn('Error parsing result element:', error);
        continue;
      }
    }

    // Fallback: try instant answer API if HTML scraping fails
    if (results.length === 0) {
      Logger.debug('HTML scraping returned no results, trying instant answer API...');
      const apiUrl = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
      
      const apiResponse = await requestUrl({
        url: apiUrl,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        throw: false
      });

      if (apiResponse.status === 200) {
        const data = apiResponse.json;

        // Try RelatedTopics
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics) {
            if (results.length >= numResults) break;
            
            if (topic.FirstURL && topic.Text) {
              try {
                results.push({
                  title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
                  link: topic.FirstURL,
                  snippet: topic.Text,
                  displayLink: new URL(topic.FirstURL).hostname.replace('www.', '')
                });
              } catch (e) {
                continue;
              }
            }
          }
        }

        // Try Abstract
        if (results.length === 0 && data.AbstractURL && data.AbstractText) {
          try {
            results.push({
              title: data.Heading || query,
              link: data.AbstractURL,
              snippet: data.AbstractText,
              displayLink: new URL(data.AbstractURL).hostname.replace('www.', '')
            });
          } catch (e) {
            // Ignore error
          }
        }
      }
    }

    Logger.debug(`Extracted ${results.length} results from search`);

    return {
      success: true,
      query,
      results,
      totalResults: results.length
    };
  } catch (error) {
    Logger.error('Search error:', error);
    throw new Error(`DuckDuckGo search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get plugin settings
 * This function will be set by the plugin when initializing tools
 */
let getPluginSettings: (() => any) | null = null;

export function setPluginSettingsGetter(getter: () => any): void {
  getPluginSettings = getter;
}

/**
 * Web search tool with multiple backend support
 */
export const webSearchTool: BuiltInTool = {
  name: 'web_search',
  description: 'Search the web using multiple search backends. Supports: Google Custom Search API, SerpAPI, Tavily AI Search (optimized for AI with free tier), or DuckDuckGo (free, no API key). Returns search results with titles, links, and snippets.',
  category: 'search-engines',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to search for'
      },
      num_results: {
        type: 'number',
        description: 'Number of search results to return (default: 10, max: 10)',
        default: 10,
        minimum: 1,
        maximum: 10
      }
    },
    required: ['query']
  },
  execute: async (args: {
    query: string;
    num_results?: number;
  }) => {
    try {
      const {
        query,
        num_results = 10
      } = args;

      // Get settings from plugin
      if (!getPluginSettings) {
        throw new Error('Plugin settings not initialized. Please restart the plugin.');
      }

      const settings = getPluginSettings();
      const searchConfig = settings.googleSearch;

      if (!searchConfig) {
        throw new Error('Google search settings not found. Please configure search settings in plugin settings.');
      }

      const search_backend = searchConfig.searchBackend || 'duckduckgo';
      const google_api_key = searchConfig.googleApiKey;
      const google_search_engine_id = searchConfig.googleSearchEngineId;
      const serpapi_key = searchConfig.serpapiKey;
      const tavily_api_key = searchConfig.tavilyApiKey;

      Logger.debug(`Searching for: "${query}" using ${search_backend} backend`);

      if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
      }

      const numResults = Math.min(Math.max(num_results, 1), 10);
      let searchResponse: GoogleSearchResponse;

      // Choose search backend
      switch (search_backend) {
        case 'google':
          searchResponse = await searchWithGoogleAPI(
            query,
            numResults,
            google_api_key,
            google_search_engine_id
          );
          break;

        case 'serpapi':
          searchResponse = await searchWithSerpAPI(
            query,
            numResults,
            serpapi_key
          );
          break;

        case 'tavily':
          searchResponse = await searchWithTavily(
            query,
            numResults,
            tavily_api_key
          );
          break;

        case 'duckduckgo':
          searchResponse = await searchWithDuckDuckGo(query, numResults);
          break;

        default:
          throw new Error(`Unknown search backend: ${search_backend}`);
      }

      // Format results for display
      const formattedResults = searchResponse.results.map((result, index) => {
        return `${index + 1}. **${result.title}**
   URL: ${result.link}
   ${result.snippet}
   ${result.displayLink ? `Source: ${result.displayLink}` : ''}`;
      }).join('\n\n');

      const summary = `# Google Search Results for "${query}"

Found ${searchResponse.results.length} results${searchResponse.totalResults ? ` (${searchResponse.totalResults.toLocaleString()} total)` : ''}${searchResponse.searchTime ? ` in ${searchResponse.searchTime}s` : ''}
Search backend: ${search_backend}

---

${formattedResults || 'No results found.'}`;

      Logger.debug(`Successfully retrieved ${searchResponse.results.length} results`);

      return {
        success: true,
        query,
        results: searchResponse.results,
        resultsCount: searchResponse.results.length,
        totalResults: searchResponse.totalResults,
        searchTime: searchResponse.searchTime,
        searchBackend: search_backend,
        formattedSummary: summary
      };

    } catch (error) {
      Logger.error('Error:', error);

      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      let backend = 'duckduckgo';

      // Try to get backend from settings
      try {
        if (getPluginSettings) {
          const settings = getPluginSettings();
          backend = settings.googleSearch?.searchBackend || 'duckduckgo';
        }
      } catch (e) {
        // Ignore settings error in error handler
      }

      // Provide helpful error messages
      if (errorMessage.includes('API key') || errorMessage.includes('Search Engine ID')) {
        errorMessage = `配置错误: ${errorMessage}

使用说明:
- Google Custom Search: 需要 Google API 密钥和搜索引擎ID (https://console.cloud.google.com/)
- SerpAPI: 需要 SerpAPI 密钥 (https://serpapi.com/)
- Tavily: 需要 Tavily API 密钥，专为AI优化，有免费额度 (https://tavily.com/)
- DuckDuckGo: 完全免费，无需API密钥（默认选项）

建议: 
1. 快速测试：使用 DuckDuckGo（免费，无需配置）
2. AI优化搜索：使用 Tavily（有免费额度，结果更适合AI处理）
3. 高级需求：使用 Google 或 SerpAPI`;
      } else if (errorMessage.includes('Network') || errorMessage.includes('Request failed')) {
        errorMessage = `网络请求失败: 无法连接到搜索服务。请检查网络连接。`;
      } else if (errorMessage.includes('Search query cannot be empty')) {
        errorMessage = `搜索查询不能为空，请提供有效的搜索关键词。`;
      } else if (errorMessage.includes('Plugin settings not initialized')) {
        errorMessage = `插件设置未初始化：请在插件设置中配置Google搜索选项。`;
      }

      return {
        success: false,
        error: errorMessage,
        query: args.query,
        searchBackend: backend
      };
    }
  }
};
