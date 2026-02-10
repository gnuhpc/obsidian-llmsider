// Wikipedia search and content retrieval tools - Mastra format
import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { Logger } from './../utils/logger';
import type { MastraTool } from './mastra-tool-types';
import { createMastraTool } from './tool-converter';

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
        const page: any = Object.values(pages)[0];
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
export const wikipediaSearchTool: MastraTool = createMastraTool({
  category: 'search-web',
  id: 'wikipedia_search',
  description: 'Search Wikipedia and get article summaries. Returns title, summary, and URL.',
  
  inputSchema: z.object({
    query: z.string()
      .min(1)
      .describe('The search query for Wikipedia'),
    
    language: z.string()
      .optional()
      .default('en')
      .describe('Wikipedia language code (default: en). Examples: en=English, zh=Chinese, ja=Japanese, de=German, fr=French, es=Spanish, ru=Russian, it=Italian, pt=Portuguese, ar=Arabic'),
    
    include_full_content: z.boolean()
      .optional()
      .default(false)
      .describe('Whether to include full article content (default: false). Set to true for detailed information.'),
    
    max_results: z.number()
      .min(1)
      .max(5)
      .optional()
      .default(1)
      .describe('Maximum number of results (default: 1, max: 5)')
  }),
  
  outputSchema: z.object({
    success: z.boolean().describe('Whether search was successful'),
    query: z.string().describe('Original search query'),
    language: z.string().describe('Wikipedia language code used'),
    results: z.array(z.object({
      title: z.string().describe('Article title'),
      url: z.string().describe('Article URL'),
      summary: z.string().describe('Article summary/snippet'),
      fullContent: z.string().optional().describe('Full article content (if requested)')
    })).describe('Array of found Wikipedia articles'),
    resultsCount: z.number().describe('Number of results returned'),
    formattedSummary: z.string().optional(),
    message: z.string().optional()
  }),
  
  execute: async ({ context }) => {
    try {
      const {
        query,
        language = 'en',
        include_full_content = false,
        max_results = 1
      } = context;

      Logger.debug(`Searching for: "${query}" in ${language}`);

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

        if (include_full_content) {
          const fullContent = await getWikipediaContent(title, language);
          
          if (fullContent && fullContent.toLowerCase().includes('may refer to:')) {
            Logger.debug(`Skipping disambiguation page: ${title}`);
            continue;
          }

          result.fullContent = fullContent;
        }

        results.push(result);
      }

      let formattedResults = '';
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        formattedResults += `${i + 1}. **${result.title}**
   URL: ${result.url}
   Summary: ${result.summary}
`;

        if (result.fullContent) {
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

      throw new Error(errorMessage);
    }
  }
});

/**
 * Wikipedia random article tool
 */
export const wikipediaRandomTool: MastraTool = createMastraTool({
  category: 'search-web',
  id: 'wikipedia_random',
  description: 'Get a random Wikipedia article. Useful for discovering new topics.',
  
  inputSchema: z.object({
    language: z.string()
      .optional()
      .default('en')
      .describe('Wikipedia language code (default: en)')
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    language: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    summary: z.string().optional(),
    error: z.string().optional()
  }).describe('Random Wikipedia article, including title, URL, and summary'),
  
  execute: async ({ context }) => {
    try {
      const language = context.language || 'en';
      
      const randomUrl = `https://${language}.wikipedia.org/api/rest_v1/page/random/summary`;
      
      const response = await requestUrl({
        url: randomUrl,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ObsidianLLMSider/1.0)',
          'Accept': 'application/json'
        },
        throw: false
      });

      if (response.status !== 200) {
        throw new Error(`Wikipedia returned status ${response.status}`);
      }

      const data = response.json;

      return {
        success: true,
        language,
        title: data.title,
        url: data.content_urls?.desktop?.page,
        summary: data.extract
      };

    } catch (error) {
      Logger.error('Error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  }
});
