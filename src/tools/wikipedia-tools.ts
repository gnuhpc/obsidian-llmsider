// Wikipedia search and content retrieval tools
// Based on ddgs Wikipedia implementation with multi-language support
import { requestUrl } from 'obsidian';
import { Logger } from './../utils/logger';
import { BuiltInTool } from './built-in-tools';

/**
 * Wikipedia search result interface
 */
interface WikipediaSearchResult {
  title: string;
  url: string;
  summary: string;
  fullContent?: string;
}

/**
 * Extract Wikipedia content from API response
 */
async function getWikipediaContent(title: string, lang: string = 'en'): Promise<string> {
  try {
    const encodedTitle = encodeURIComponent(title);
    const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodedTitle}&explaintext=0&exintro=0&redirects=1`;

    const response = await requestUrl({
      url: apiUrl,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)',
        'Accept': 'application/json'
      },
      throw: false
    });

    if (response.status === 200) {
      const data = response.json;
      const pages = data.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0] as any;
        return page.extract || '';
      }
    }

    return '';
  } catch (error) {
    Logger.error('Error fetching content:', error);
    return '';
  }
}

/**
 * Wikipedia search tool with multi-language support
 */
export const wikipediaSearchTool: BuiltInTool = {
  name: 'wikipedia_search',
  description: 'Search Wikipedia and get article summaries. Returns title, summary, and URL.',
  category: 'search-engines',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query for Wikipedia'
      },
      language: {
        type: 'string',
        description: 'Wikipedia language code (default: en). Examples: en=English, zh=Chinese, ja=Japanese, de=German, fr=French, es=Spanish, ru=Russian, it=Italian, pt=Portuguese, ar=Arabic',
        default: 'en'
      },
      include_full_content: {
        type: 'boolean',
        description: 'Whether to include full article content (default: false). Set to true for detailed information.',
        default: false
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results (default: 1, max: 5)',
        default: 1,
        minimum: 1,
        maximum: 5
      }
    },
    required: ['query']
  },
  async execute(args: {
    query: string;
    language?: string;
    include_full_content?: boolean;
    max_results?: number;
  }): Promise<any> {
    try {
      const {
        query,
        language = 'en',
        include_full_content = false,
        max_results = 1
      } = args;

      Logger.debug(`Searching for: "${query}" in ${language}`);

      // Use OpenSearch API to find articles
      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `https://${language}.wikipedia.org/w/api.php?action=opensearch&profile=fuzzy&limit=${max_results}&search=${encodedQuery}&format=json`;

      const searchResponse = await requestUrl({
        url: searchUrl,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)',
          'Accept': 'application/json'
        },
        throw: false
      });

      if (searchResponse.status !== 200) {
        throw new Error(`Wikipedia returned status ${searchResponse.status}`);
      }

      const searchData = searchResponse.json;
      
      // OpenSearch returns: [query, [titles], [descriptions], [urls]]
      if (!Array.isArray(searchData) || searchData.length < 4) {
        throw new Error('Invalid Wikipedia API response format');
      }

      const [, titles, summaries, urls] = searchData;

      if (!titles || titles.length === 0) {
        return {
          success: true,
          query,
          language,
          results: [],
          resultsCount: 0,
          message: `No Wikipedia articles found for "${query}" in ${language}`
        };
      }

      // Build results
      const results: WikipediaSearchResult[] = [];

      for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        const url = urls[i];
        const summary = summaries[i] || '';

        const result: WikipediaSearchResult = {
          title,
          url,
          summary
        };

        // Fetch full content if requested
        if (include_full_content) {
          const fullContent = await getWikipediaContent(title, language);
          
          // Skip if the content indicates disambiguation
          if (fullContent && fullContent.toLowerCase().includes('may refer to:')) {
            Logger.debug(`Skipping disambiguation page: ${title}`);
            continue;
          }

          result.fullContent = fullContent;
        }

        results.push(result);
      }

      // Format results
      let formattedResults = '';
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        formattedResults += `${i + 1}. **${result.title}**
   URL: ${result.url}
   Summary: ${result.summary}
`;

        if (result.fullContent) {
          // Limit full content to reasonable length
          const maxContentLength = 5000;
          const content = result.fullContent.length > maxContentLength
            ? result.fullContent.substring(0, maxContentLength) + '\n\n... (content truncated)'
            : result.fullContent;

          formattedResults += `\n   Full Content:\n   ${content.split('\n').join('\n   ')}\n`;
        }

        formattedResults += '\n';
      }

      const summary = `# Wikipedia Search Results for "${query}"

Language: ${language}
Found ${results.length} article${results.length === 1 ? '' : 's'}

---

${formattedResults}`;

      Logger.debug(`Found ${results.length} article(s)`);

      return {
        success: true,
        query,
        language,
        results,
        resultsCount: results.length,
        formattedSummary: summary
      };

    } catch (error) {
      Logger.error('Error:', error);
      
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('status')) {
        errorMessage = `Wikipedia API request failed: ${errorMessage}. The Wikipedia API might be temporarily unavailable or the language code might be invalid.`;
      } else if (errorMessage.includes('Invalid')) {
        errorMessage = `Invalid response from Wikipedia API. This might indicate a network issue or API change.`;
      }

      return {
        success: false,
        error: errorMessage,
        query: args.query,
        language: args.language || 'en'
      };
    }
  }
};

/**
 * Wikipedia random article tool
 */
export const wikipediaRandomTool: BuiltInTool = {
  name: 'wikipedia_random',
  description: 'Get a random Wikipedia article. Useful for discovery and inspiration. Returns article title, URL, and content.',
  category: 'search-engines',
  inputSchema: {
    type: 'object',
    properties: {
      language: {
        type: 'string',
        description: 'Wikipedia language code (default: en)',
        default: 'en'
      },
      include_full_content: {
        type: 'boolean',
        description: 'Whether to include full article content (default: true)',
        default: true
      }
    },
    required: []
  },
  async execute(args: {
    language?: string;
    include_full_content?: boolean;
  }): Promise<any> {
    try {
      const {
        language = 'en',
        include_full_content = true
      } = args;

      Logger.debug(`Getting random article in ${language}`);

      // Use Wikipedia's random API
      const randomUrl = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=1`;

      const randomResponse = await requestUrl({
        url: randomUrl,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)',
          'Accept': 'application/json'
        },
        throw: false
      });

      if (randomResponse.status !== 200) {
        throw new Error(`Wikipedia returned status ${randomResponse.status}`);
      }

      const data = randomResponse.json;
      const randomArticle = data.query?.random?.[0];

      if (!randomArticle) {
        throw new Error('No random article returned from Wikipedia');
      }

      const title = randomArticle.title;
      const pageId = randomArticle.id;
      const url = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

      let fullContent = '';
      let summary = '';

      // Get article content
      if (include_full_content) {
        fullContent = await getWikipediaContent(title, language);
        
        // Extract first paragraph as summary
        const paragraphs = fullContent.split('\n\n');
        summary = paragraphs[0] || '';
      } else {
        // Get just the intro/summary
        const encodedTitle = encodeURIComponent(title);
        const summaryUrl = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodedTitle}&exintro=1&explaintext=1&redirects=1`;

        const summaryResponse = await requestUrl({
          url: summaryUrl,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)',
            'Accept': 'application/json'
          },
          throw: false
        });

        if (summaryResponse.status === 200) {
          const summaryData = summaryResponse.json;
          const pages = summaryData.query?.pages;
          if (pages) {
            const page = Object.values(pages)[0] as any;
            summary = page.extract || '';
          }
        }
      }

      const result = {
        title,
        url,
        summary,
        fullContent: include_full_content ? fullContent : undefined
      };

      // Format result
      let formattedResult = `# Random Wikipedia Article

**${result.title}**
URL: ${result.url}

${result.summary}
`;

      if (result.fullContent) {
        // Limit full content to reasonable length
        const maxContentLength = 5000;
        const content = result.fullContent.length > maxContentLength
          ? result.fullContent.substring(0, maxContentLength) + '\n\n... (content truncated)'
          : result.fullContent;

        formattedResult += `\nFull Content:\n${content}`;
      }

      Logger.debug(`Retrieved article: ${title}`);

      return {
        success: true,
        language,
        result,
        formattedResult
      };

    } catch (error) {
      Logger.error('Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        language: args.language || 'en'
      };
    }
  }
};
