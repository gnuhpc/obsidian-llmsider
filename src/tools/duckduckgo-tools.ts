// DuckDuckGo search tools - Enhanced multi-category search
// Based on ddgs library implementation with support for text, images, news, and videos
import { requestUrl } from 'obsidian';
import { Logger } from './../utils/logger';
import { BuiltInTool } from './built-in-tools';

/**
 * DuckDuckGo search region codes
 */
export type DuckDuckGoRegion = 'us-en' | 'uk-en' | 'de-de' | 'fr-fr' | 'es-es' | 'it-it' | 'jp-jp' | 'cn-zh' | 'tw-zh' | 'ru-ru';

/**
 * DuckDuckGo safesearch levels
 */
export type DuckDuckGoSafesearch = 'on' | 'moderate' | 'off';

/**
 * DuckDuckGo time limits
 */
export type DuckDuckGoTimelimit = 'd' | 'w' | 'm' | 'y';

/**
 * Text search result interface
 */
interface TextSearchResult {
  title: string;
  href: string;
  body: string;
}

/**
 * Image search result interface
 */
interface ImageSearchResult {
  title: string;
  image: string;
  thumbnail: string;
  url: string;
  height: number;
  width: number;
  source: string;
}

/**
 * News search result interface
 */
interface NewsSearchResult {
  date: string;
  title: string;
  body: string;
  url: string;
  image?: string;
  source: string;
}

/**
 * Video search result interface
 */
interface VideoSearchResult {
  title: string;
  description: string;
  duration: string;
  embed_url: string;
  provider: string;
  published: string;
  publisher: string;
}

/**
 * Get VQD token from DuckDuckGo using their API endpoint
 */
async function getVqd(query: string): Promise<string> {
  try {
    // Method 1: Try to get VQD from the main page POST request
    const response = await requestUrl({
      url: 'https://duckduckgo.com',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Origin': 'https://duckduckgo.com',
        'Referer': 'https://duckduckgo.com/'
      },
      body: `q=${encodeURIComponent(query)}`,
      throw: false
    });

    if (response.status === 200) {
      const html = response.text;
      
      // Try multiple patterns to extract VQD
      const patterns = [
        /vqd=['"]([0-9-]+)['"]/i,
        /vqd[=:](['"])?([0-9-]+)\1/i,
        /"vqd":\s*"([0-9-]+)"/i,
        /vqd:\s*"([0-9-]+)"/i,
        /data-vqd=['"]([0-9-]+)['"]/i
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const vqd = match[1] || match[2];
          if (vqd && /^\d+-\d+/.test(vqd)) {
            Logger.debug(`Found VQD token: ${vqd}`);
            return vqd;
          }
        }
      }
    }

    // Method 2: Generate a simple VQD-like token (fallback)
    // DuckDuckGo sometimes doesn't require VQD for certain requests
    Logger.warn('VQD token not found, using fallback method');
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    return `${timestamp}-${random}`;
    
  } catch (error) {
    Logger.error('Error getting VQD token:', error);
    // Use timestamp-based fallback
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    return `${timestamp}-${random}`;
  }
}

/**
 * DuckDuckGo text search (Web search)
 */
export const duckduckgoTextSearchTool: BuiltInTool = {
  name: 'duckduckgo_text_search',
  description: 'Search the web using DuckDuckGo. Returns text search results with titles, URLs, and snippets. Free, no API key required. Supports region, safesearch, and time filters.',
  category: 'search-engines',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      },
      region: {
        type: 'string',
        enum: ['us-en', 'uk-en', 'de-de', 'fr-fr', 'es-es', 'it-it', 'jp-jp', 'cn-zh', 'tw-zh', 'ru-ru'],
        description: 'Search region (default: us-en)',
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
    region?: string;
    safesearch?: string;
    timelimit?: string;
    max_results?: number;
  }): Promise<any> {
    try {
      const {
        query,
        region = 'us-en',
        safesearch = 'moderate',
        timelimit,
        max_results = 10
      } = args;

      Logger.debug(`Searching for: "${query}"`);

      // Use HTML version for better results
      const searchUrl = 'https://html.duckduckgo.com/html/';
      
      // Build payload
      const payload: Record<string, string> = {
        q: query,
        b: '',
        l: region
      };

      if (timelimit) {
        payload.df = timelimit;
      }

      // Convert payload to form data
      const formData = new URLSearchParams(payload).toString();

      const response = await requestUrl({
        url: searchUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://duckduckgo.com/'
        },
        body: formData,
        throw: false
      });

      if (response.status !== 200) {
        throw new Error(`DuckDuckGo returned status ${response.status}`);
      }

      const html = response.text;
      const results: TextSearchResult[] = [];

      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Find all result divs
      const resultElements = doc.querySelectorAll('.result, .web-result, div[class*="result"]');

      for (const element of Array.from(resultElements)) {
        if (results.length >= max_results) break;

        try {
          // Extract title and URL
          const titleElement = element.querySelector('.result__a, a.result__a, .result__title a');
          const title = titleElement?.textContent?.trim() || '';
          const href = titleElement?.getAttribute('href') || '';

          // Extract snippet
          const snippetElement = element.querySelector('.result__snippet, .result__description');
          const body = snippetElement?.textContent?.trim() || '';

          // Clean URL (DuckDuckGo uses redirect URLs)
          let cleanUrl = href;
          if (href.includes('uddg=')) {
            const uddgMatch = href.match(/uddg=([^&]+)/);
            if (uddgMatch) {
              cleanUrl = decodeURIComponent(uddgMatch[1]);
            }
          }

          if (title && cleanUrl && body) {
            results.push({ title, href: cleanUrl, body });
          }
        } catch (error) {
          Logger.warn('Error parsing result:', error);
          continue;
        }
      }

      // Format results
      const formattedResults = results.map((result, index) => {
        return `${index + 1}. **${result.title}**
   URL: ${result.href}
   ${result.body}`;
      }).join('\n\n');

      const summary = `# DuckDuckGo Search Results for "${query}"

Found ${results.length} results
Region: ${region} | SafeSearch: ${safesearch}${timelimit ? ` | Time: ${timelimit}` : ''}

---

${formattedResults || 'No results found.'}`;

      Logger.debug(`Found ${results.length} results`);

      return {
        success: true,
        query,
        results,
        resultsCount: results.length,
        formattedSummary: summary
      };

    } catch (error) {
      Logger.error('Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: args.query
      };
    }
  }
};

/**
 * DuckDuckGo image search
 */
export const duckduckgoImageSearchTool: BuiltInTool = {
  name: 'duckduckgo_image_search',
  description: 'Search for images using DuckDuckGo. Returns image results with URLs, thumbnails, and metadata. Free, no API key required.',
  category: 'search-engines',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The image search query'
      },
      region: {
        type: 'string',
        enum: ['us-en', 'uk-en', 'de-de', 'fr-fr', 'es-es', 'it-it', 'jp-jp', 'cn-zh', 'tw-zh', 'ru-ru'],
        description: 'Search region (default: us-en)',
        default: 'us-en'
      },
      safesearch: {
        type: 'string',
        enum: ['on', 'moderate', 'off'],
        description: 'Safe search level (default: moderate)',
        default: 'moderate'
      },
      size: {
        type: 'string',
        enum: ['Small', 'Medium', 'Large', 'Wallpaper'],
        description: 'Image size filter (optional)'
      },
      color: {
        type: 'string',
        enum: ['color', 'Monochrome', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'Brown', 'Black', 'Gray', 'Teal', 'White'],
        description: 'Color filter (optional)'
      },
      type_image: {
        type: 'string',
        enum: ['photo', 'clipart', 'gif', 'transparent', 'line'],
        description: 'Image type filter (optional)'
      },
      layout: {
        type: 'string',
        enum: ['Square', 'Tall', 'Wide'],
        description: 'Image layout/aspect ratio (optional)'
      },
      license_image: {
        type: 'string',
        enum: ['any', 'Public', 'Share', 'Modify', 'ModifyCommercially'],
        description: 'License type (optional)'
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results (default: 20, max: 100)',
        default: 20,
        minimum: 1,
        maximum: 100
      }
    },
    required: ['query']
  },
  async execute(args: {
    query: string;
    region?: string;
    safesearch?: string;
    size?: string;
    color?: string;
    type_image?: string;
    layout?: string;
    license_image?: string;
    max_results?: number;
  }): Promise<any> {
    try {
      const {
        query,
        region = 'us-en',
        safesearch = 'moderate',
        size,
        color,
        type_image,
        layout,
        license_image,
        max_results = 20
      } = args;

      Logger.debug(`Searching for: "${query}"`);

      // Get VQD token
      const vqd = await getVqd(query);

      // Build filters
      const filters: string[] = [];
      if (size) filters.push(`size:${size}`);
      if (color) filters.push(`color:${color}`);
      if (type_image) filters.push(`type:${type_image}`);
      if (layout) filters.push(`layout:${layout}`);
      if (license_image) filters.push(`license:${license_image}`);

      // Build payload
      const safesearchMap: Record<string, string> = {
        on: '1',
        moderate: '1',
        off: '-1'
      };

      const params = new URLSearchParams({
        o: 'json',
        q: query,
        l: region,
        vqd: vqd,
        p: safesearchMap[safesearch]
      });

      if (filters.length > 0) {
        params.append('f', filters.join(','));
      }

      // Search images
      const searchResponse = await requestUrl({
        url: `https://duckduckgo.com/i.js?${params.toString()}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://duckduckgo.com/',
          'Sec-Fetch-Mode': 'cors'
        },
        throw: false
      });

      if (searchResponse.status !== 200) {
        throw new Error(`DuckDuckGo returned status ${searchResponse.status}`);
      }

      const data = searchResponse.json;
      const results: ImageSearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          if (results.length >= max_results) break;

          results.push({
            title: item.title || '',
            image: item.image || '',
            thumbnail: item.thumbnail || '',
            url: item.url || '',
            height: item.height || 0,
            width: item.width || 0,
            source: item.source || ''
          });
        }
      }

      // Format results
      const formattedResults = results.map((result, index) => {
        return `${index + 1}. **${result.title}**
   Image: ${result.image}
   Source: ${result.url}
   Dimensions: ${result.width}x${result.height}
   Provider: ${result.source}`;
      }).join('\n\n');

      const summary = `# DuckDuckGo Image Search Results for "${query}"

Found ${results.length} images
Region: ${region} | SafeSearch: ${safesearch}
${filters.length > 0 ? `Filters: ${filters.join(', ')}` : ''}

---

${formattedResults || 'No images found.'}`;

      Logger.debug(`Found ${results.length} images`);

      return {
        success: true,
        query,
        results,
        resultsCount: results.length,
        formattedSummary: summary
      };

    } catch (error) {
      Logger.error('Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: args.query
      };
    }
  }
};

/**
 * DuckDuckGo news search
 */
export const duckduckgoNewsSearchTool: BuiltInTool = {
  name: 'duckduckgo_news_search',
  description: 'Search for news articles using DuckDuckGo. Returns news results with titles, URLs, dates, and summaries. Free, no API key required.',
  category: 'search-engines',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The news search query'
      },
      region: {
        type: 'string',
        enum: ['us-en', 'uk-en', 'de-de', 'fr-fr', 'es-es', 'it-it', 'jp-jp', 'cn-zh', 'tw-zh', 'ru-ru'],
        description: 'Search region (default: us-en)',
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
        enum: ['d', 'w', 'm'],
        description: 'Time limit: d=day, w=week, m=month (optional)'
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results (default: 20, max: 100)',
        default: 20,
        minimum: 1,
        maximum: 100
      }
    },
    required: ['query']
  },
  async execute(args: {
    query: string;
    region?: string;
    safesearch?: string;
    timelimit?: string;
    max_results?: number;
  }): Promise<any> {
    try {
      const {
        query,
        region = 'us-en',
        safesearch = 'moderate',
        timelimit,
        max_results = 20
      } = args;

      Logger.debug(`Searching for: "${query}"`);

      // Get VQD token
      const vqd = await getVqd(query);

      // Build payload
      const safesearchMap: Record<string, string> = {
        on: '1',
        moderate: '-1',
        off: '-2'
      };

      const params = new URLSearchParams({
        l: region,
        o: 'json',
        noamp: '1',
        q: query,
        vqd: vqd,
        p: safesearchMap[safesearch]
      });

      if (timelimit) {
        params.append('df', timelimit);
      }

      // Search news
      const searchResponse = await requestUrl({
        url: `https://duckduckgo.com/news.js?${params.toString()}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://duckduckgo.com/'
        },
        throw: false
      });

      if (searchResponse.status !== 200) {
        throw new Error(`DuckDuckGo returned status ${searchResponse.status}`);
      }

      const data = searchResponse.json;
      const results: NewsSearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          if (results.length >= max_results) break;

          results.push({
            date: item.date || '',
            title: item.title || '',
            body: item.excerpt || '',
            url: item.url || '',
            image: item.image,
            source: item.source || ''
          });
        }
      }

      // Format results
      const formattedResults = results.map((result, index) => {
        return `${index + 1}. **${result.title}**
   Source: ${result.source} | Date: ${result.date}
   URL: ${result.url}
   ${result.body}`;
      }).join('\n\n');

      const summary = `# DuckDuckGo News Search Results for "${query}"

Found ${results.length} news articles
Region: ${region} | SafeSearch: ${safesearch}${timelimit ? ` | Time: ${timelimit}` : ''}

---

${formattedResults || 'No news found.'}`;

      Logger.debug(`Found ${results.length} articles`);

      return {
        success: true,
        query,
        results,
        resultsCount: results.length,
        formattedSummary: summary
      };

    } catch (error) {
      Logger.error('Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: args.query
      };
    }
  }
};

/**
 * DuckDuckGo video search
 */
export const duckduckgoVideoSearchTool: BuiltInTool = {
  name: 'duckduckgo_video_search',
  description: 'Search for videos using DuckDuckGo. Returns video results with titles, URLs, durations, and publishers. Free, no API key required.',
  category: 'search-engines',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The video search query'
      },
      region: {
        type: 'string',
        enum: ['us-en', 'uk-en', 'de-de', 'fr-fr', 'es-es', 'it-it', 'jp-jp', 'cn-zh', 'tw-zh', 'ru-ru'],
        description: 'Search region (default: us-en)',
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
      resolution: {
        type: 'string',
        enum: ['high', 'standart'],
        description: 'Video resolution (optional)'
      },
      duration: {
        type: 'string',
        enum: ['short', 'medium', 'long'],
        description: 'Video duration (optional)'
      },
      license_videos: {
        type: 'string',
        enum: ['creativeCommon', 'youtube'],
        description: 'Video license type (optional)'
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results (default: 20, max: 100)',
        default: 20,
        minimum: 1,
        maximum: 100
      }
    },
    required: ['query']
  },
  async execute(args: {
    query: string;
    region?: string;
    safesearch?: string;
    timelimit?: string;
    resolution?: string;
    duration?: string;
    license_videos?: string;
    max_results?: number;
  }): Promise<any> {
    try {
      const {
        query,
        region = 'us-en',
        safesearch = 'moderate',
        timelimit,
        resolution,
        duration,
        license_videos,
        max_results = 20
      } = args;

      Logger.debug(`Searching for: "${query}"`);

      // Get VQD token
      const vqd = await getVqd(query);

      // Build filters
      const filters: string[] = [];
      if (timelimit) filters.push(`publishedAfter:${timelimit}`);
      if (resolution) filters.push(`videoDefinition:${resolution}`);
      if (duration) filters.push(`videoDuration:${duration}`);
      if (license_videos) filters.push(`videoLicense:${license_videos}`);

      // Build payload
      const safesearchMap: Record<string, string> = {
        on: '1',
        moderate: '-1',
        off: '-2'
      };

      const params = new URLSearchParams({
        l: region,
        o: 'json',
        q: query,
        vqd: vqd,
        f: filters.join(','),
        p: safesearchMap[safesearch]
      });

      // Search videos
      const searchResponse = await requestUrl({
        url: `https://duckduckgo.com/v.js?${params.toString()}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://duckduckgo.com/'
        },
        throw: false
      });

      if (searchResponse.status !== 200) {
        throw new Error(`DuckDuckGo returned status ${searchResponse.status}`);
      }

      const data = searchResponse.json;
      const results: VideoSearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          if (results.length >= max_results) break;

          results.push({
            title: item.title || '',
            description: item.description || item.content || '',
            duration: item.duration || '',
            embed_url: item.embed_url || '',
            provider: item.provider || '',
            published: item.published || '',
            publisher: item.publisher || item.uploader || ''
          });
        }
      }

      // Format results
      const formattedResults = results.map((result, index) => {
        return `${index + 1}. **${result.title}**
   Publisher: ${result.publisher} | Provider: ${result.provider}
   Duration: ${result.duration} | Published: ${result.published}
   URL: ${result.embed_url}
   ${result.description}`;
      }).join('\n\n');

      const summary = `# DuckDuckGo Video Search Results for "${query}"

Found ${results.length} videos
Region: ${region} | SafeSearch: ${safesearch}
${filters.length > 0 ? `Filters: ${filters.join(', ')}` : ''}

---

${formattedResults || 'No videos found.'}`;

      Logger.debug(`Found ${results.length} videos`);

      return {
        success: true,
        query,
        results,
        resultsCount: results.length,
        formattedSummary: summary
      };

    } catch (error) {
      Logger.error('Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: args.query
      };
    }
  }
};
