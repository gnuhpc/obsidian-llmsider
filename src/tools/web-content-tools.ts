// Web content tools for fetching and processing online content
import type { ToolCategory } from './built-in-tools';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';

// Electron BrowserWindow type (since it's not directly importable in plugin environment)
interface BrowserWindow {
  loadURL(url: string): Promise<void>;
  webContents: {
    executeJavaScript(code: string): Promise<any>;
  };
  isDestroyed(): boolean;
  close(): void;
}

interface BrowserWindowConstructorOptions {
  show?: boolean;
  webSecurity?: boolean;
  webPreferences?: {
    nodeIntegration?: boolean;
    contextIsolation?: boolean;
    enableRemoteModule?: boolean;
    sandbox?: boolean;
  };
}

// Electron remote access (available in Obsidian context)
declare const require: (id: string) => any;

/**
 * Render a web page with JavaScript and return the final HTML
 */
async function renderAndGetHTML(url: string, waitTime: number = 2000): Promise<string> {
  Logger.debug(`Rendering page with JavaScript: ${url}, wait time: ${waitTime}ms`);

  let win: BrowserWindow | null = null;
  try {
    // Check if we're in an Electron environment and try to get BrowserWindow
    let BrowserWindowClass;

    if (typeof require !== 'undefined') {
      try {
        // First try to get electron directly
        const electron = require('electron');
        if (electron && electron.BrowserWindow) {
          BrowserWindowClass = electron.BrowserWindow;
        }
      } catch (error) {
        Logger.debug(`Direct electron require failed:`, error);
      }

      // If that didn't work, try remote access (for older Electron versions)
      if (!BrowserWindowClass) {
        try {
          const { remote } = require('electron');
          if (remote && remote.BrowserWindow) {
            BrowserWindowClass = remote.BrowserWindow;
          }
        } catch (error) {
          Logger.debug(`Remote electron require failed:`, error);
        }
      }

      // Try accessing through global object (some Electron contexts)
      if (!BrowserWindowClass && typeof global !== 'undefined' && (global as any).require) {
        try {
          const electron = (global as any).require('electron');
          if (electron && electron.BrowserWindow) {
            BrowserWindowClass = electron.BrowserWindow;
          }
        } catch (error) {
          Logger.debug(`Global electron require failed:`, error);
        }
      }
    }

    if (!BrowserWindowClass) {
      throw new Error('BrowserWindow not available in current environment');
    }

    // Create a hidden browser window
    win = new BrowserWindowClass({
      show: false,
      webSecurity: false, // Allow loading any URL
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        sandbox: false
      }
    }) as BrowserWindow;

    // Load the URL
    await win.loadURL(url);

    // Wait for JavaScript to render
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Get the final HTML after JavaScript execution
    const html = await win.webContents.executeJavaScript(`
      document.documentElement.outerHTML
    `);

    Logger.debug(`Successfully rendered page (${html.length} characters)`);
    return html;
  } catch (error) {
    Logger.error('Error:', error);
    throw new Error(`JavaScript rendering failed: Electron not available in current environment`);
  } finally {
    // Always close the window
    if (win && !win.isDestroyed()) {
      win.close();
    }
  }
}

/**
 * Fetch static HTML using Obsidian's requestUrl
 */
async function fetchStaticHTML(url: string): Promise<string> {
  // Use Obsidian's requestUrl to bypass CORS restrictions
  let response;
  try {
    response = await requestUrl({
      url,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      throw: false // Don't throw on HTTP errors, handle them manually
    });
  } catch (error) {
    throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}: ${response.status === 404 ? 'Page not found' : 'Request failed'}`);
  }

  return response.text;
}

export interface BuiltInTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (args: any) => Promise<any>;
  category?: ToolCategory;
}

/**
 * Fetch and extract content from web pages - supports single or multiple URLs
 */
export const fetchWebContentTool: BuiltInTool = {
  name: 'fetch_web_content',
  description: '🚀 Fetch web content with advanced extraction. Supports BOTH single URL (string) and multiple URLs (array). Multiple URLs are fetched IN PARALLEL for maximum speed. When you have 2+ URLs from search results, ALWAYS pass them as an array in ONE call.',
  category: 'web-content',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ],
        description: 'Single URL or array of URLs to fetch'
      },
      extractType: {
        type: 'string',
        description: 'Extraction type: full, text_only, metadata_only, or main_content'
      },
      selector: {
        type: 'string',
        description: 'CSS selector for targeted extraction'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds'
      }
    },
    required: ['url']
  },
  execute: async (args: {
    url: string | string[];
    extractType?: 'full' | 'text_only' | 'metadata_only' | 'main_content';
    selector?: string;
    timeout?: number;
  }) => {
    try {
      // Validate url parameter exists and is the right type
      if (!args.url) {
        Logger.error('Missing url parameter:', args);
        throw new Error('URL parameter is required');
      }

      if (typeof args.url !== 'string' && !Array.isArray(args.url)) {
        Logger.error('Invalid url parameter type:', typeof args.url, args);
        throw new Error(`URL must be a string or array of strings, got ${typeof args.url}`);
      }

      const extractType = args.extractType || 'full';
      const customSelector = args.selector || '';
      const timeout = args.timeout || 15000;
      const jsWaitTime = 3000; // Fixed wait time for JavaScript rendering
      
      // Handle case where AI passes a JSON string instead of an array
      // e.g., '["url1", "url2"]' instead of ["url1", "url2"]
      let processedUrl: string | string[] = args.url;
      if (typeof args.url === 'string' && args.url.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(args.url);
          if (Array.isArray(parsed)) {
            Logger.debug('Detected JSON string array, parsing:', args.url.substring(0, 100));
            processedUrl = parsed;
          }
        } catch (e) {
          // If JSON parse fails, treat as regular URL string
          Logger.debug('String starts with [ but is not valid JSON, treating as URL');
        }
      }
      
      // Normalize input to always be an array
      let urlsArray: any[] = Array.isArray(processedUrl) ? processedUrl : [processedUrl];
      const isSingleUrl = !Array.isArray(processedUrl);
      
      // Handle case where AI passes objects with url property instead of strings
      // e.g., [{url: "...", title: "..."}, ...] instead of ["...", ...]
      urlsArray = urlsArray.map((item: any) => {
        if (typeof item === 'object' && item !== null && 'url' in item) {
          Logger.debug('Extracting URL from object:', item.url);
          return item.url;
        }
        return item;
      });

      Logger.debug(`Fetching ${extractType} content from ${urlsArray.length} URL(s)${isSingleUrl ? '' : ' in parallel'}`, {
        urls: urlsArray,
        extractType,
        customSelector,
        renderingMode: 'javascript-with-fallback'
      });

      // Validate URLs
      const validatedUrls: { url: string; isValid: boolean; error?: string }[] = urlsArray.map(url => {
        // Check if url is a string
        if (typeof url !== 'string') {
          Logger.error('URL is not a string:', typeof url, url);
          return { url: String(url), isValid: false, error: `Invalid URL type: expected string, got ${typeof url}` };
        }
        
        try {
          new URL(url);
          return { url, isValid: true };
        } catch (error) {
          Logger.error('URL validation failed:', url, error);
          return { url, isValid: false, error: 'Invalid URL format' };
        }
      });

      // Filter valid URLs
      const validUrls = validatedUrls.filter(item => item.isValid).map(item => item.url);
      const invalidUrls = validatedUrls.filter(item => !item.isValid);

      Logger.debug(`URL validation results:`, {
        total: urlsArray.length,
        valid: validUrls.length,
        invalid: invalidUrls.length,
        invalidUrls: invalidUrls.map(u => ({ url: u.url, error: u.error }))
      });

      // If all URLs are invalid, return error immediately
      if (validUrls.length === 0 && invalidUrls.length > 0) {
        const errorDetails = invalidUrls.map(u => `  - ${u.url}: ${u.error}`).join('\n');
        Logger.error('All URLs are invalid:', errorDetails);
        return {
          success: false,
          error: `All provided URLs are invalid:\n${errorDetails}`,
          totalUrls: urlsArray.length,
          invalidCount: invalidUrls.length,
          results: invalidUrls.map(item => ({
            url: item.url,
            success: false,
            error: item.error || 'Invalid URL'
          }))
        };
      }

      // Fetch all valid URLs in parallel
      const fetchPromises = validUrls.map(async (url) => {
        const startTime = Date.now();
        
        try {
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeout);
          });

          // Always use JavaScript rendering for better content extraction
          let html: string;
          let actualExtractionMethod = 'javascript';
          
          try {
            Logger.debug(`Using JavaScript rendering for ${url} with ${jsWaitTime}ms wait time`);
            const renderPromise = renderAndGetHTML(url, jsWaitTime);
            html = await Promise.race([renderPromise, timeoutPromise]) as string;
          } catch (error) {
            // Fallback to static fetch if JavaScript rendering fails
            Logger.warn(`JavaScript rendering failed for ${url}, falling back to static fetch:`, error);
            const staticPromise = fetchStaticHTML(url);
            html = await Promise.race([staticPromise, timeoutPromise]) as string;
            actualExtractionMethod = 'static-fallback';
          }
          
          Logger.debug(`Fetched HTML content for ${url} (${html.length} characters)`);

          // Parse HTML content
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          // Extract metadata
          const metadata = {
            title: doc.title || '',
            description: doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
            keywords: doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
            author: doc.querySelector('meta[name="author"]')?.getAttribute('content') || '',
            siteName: doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || '',
            type: doc.querySelector('meta[property="og:type"]')?.getAttribute('content') || '',
            image: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                   doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || ''
          };

          if (extractType === 'metadata_only') {
            return {
              url,
              success: true,
              metadata,
              content: null,
              extractionMethod: actualExtractionMethod,
              duration: Date.now() - startTime
            };
          }

          // Extract visible text content
          let textContent = '';

          // Remove script and style elements
          const scriptsAndStyles = doc.querySelectorAll('script, style, noscript');
          scriptsAndStyles.forEach(el => el.remove());

          // Determine the extraction target element
          let targetElement: Element | null = null;

          if (customSelector) {
            // Use custom selector
            targetElement = doc.querySelector(customSelector);
            if (!targetElement) {
              Logger.warn(`Custom selector "${customSelector}" not found, falling back to body`);
              targetElement = doc.body || doc.documentElement;
            }
          } else if (extractType === 'main_content') {
            // Try to find main content elements in order of preference
            const mainSelectors = [
              '.main',
              'main',
              '[role="main"]',
              '#main',
              '#content',
              '.content',
              'article',
              '.article'
            ];

            for (const selector of mainSelectors) {
              targetElement = doc.querySelector(selector);
              if (targetElement) {
                Logger.debug(`Found main content using selector: ${selector}`);
                break;
              }
            }

            // Fallback to body if no main content found
            if (!targetElement) {
              Logger.warn('No main content selectors found, falling back to body');
              targetElement = doc.body || doc.documentElement;
            }
          } else {
            // Use body or documentElement for full extraction
            targetElement = doc.body || doc.documentElement;
          }

          if (targetElement) {
            // Extract text while preserving some structure - no length limits
            const textNodes: string[] = [];

            function extractTextFromElement(element: Element) {
              const childNodes = Array.from(element.childNodes);
              for (const node of childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                  const text = node.textContent?.trim();
                  // Accept all non-empty text, no minimum length restriction
                  if (text && text.length > 0) {
                    textNodes.push(text);
                  }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  const el = node as Element;

                  // Skip hidden elements and common non-content elements
                  const computedStyle = getComputedStyle ? getComputedStyle(el) : null;
                  if (computedStyle) {
                    if (computedStyle.display === 'none' ||
                        computedStyle.visibility === 'hidden' ||
                        computedStyle.opacity === '0') {
                      return;
                    }
                  }

                  // Skip common non-content elements
                  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED'].includes(el.tagName)) {
                    return;
                  }

                  // Add spacing for block elements
                  if (['DIV', 'P', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV'].includes(el.tagName)) {
                    if (textNodes.length > 0 && !textNodes[textNodes.length - 1].endsWith('\n')) {
                      textNodes.push('\n');
                    }
                  }

                  extractTextFromElement(el);
                }
              }
            }

            extractTextFromElement(targetElement);

            // Join and clean text - preserve all content, no truncation
            textContent = textNodes.join(' ')
              .replace(/\s+/g, ' ')
              .replace(/\n\s+/g, '\n')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
          }

          const duration = Date.now() - startTime;
          const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

          Logger.debug(`Extracted content from ${url}:`, {
            title: metadata.title,
            contentLength: textContent.length,
            wordCount
          });

          if (extractType === 'text_only') {
            return {
              url,
              success: true,
              metadata: null,
              content: textContent,
              contentLength: textContent.length,
              wordCount,
              extractionMethod: actualExtractionMethod,
              extractionTarget: customSelector || 'text_only',
              duration
            };
          }

          // Full extraction
          return {
            url,
            success: true,
            metadata,
            content: textContent,
            contentLength: textContent.length,
            wordCount,
            extractionMethod: actualExtractionMethod,
            extractionTarget: customSelector || (extractType === 'main_content' ? 'main_content' : 'full'),
            waitTime: jsWaitTime,
            duration
          };

        } catch (error) {
          const duration = Date.now() - startTime;
          return {
            url,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration
          };
        }
      });

      // Wait for all fetches to complete
      const results = await Promise.all(fetchPromises);

      // Add invalid URLs to results
      const allResults = [
        ...results,
        ...invalidUrls.map(item => ({
          url: item.url,
          success: false,
          error: item.error || 'Invalid URL'
        }))
      ];

      // Calculate statistics
      const successCount = allResults.filter(r => r.success).length;
      const failureCount = allResults.filter(r => !r.success).length;
      const totalWords = allResults
        .filter(r => r.success && 'wordCount' in r)
        .reduce((sum, r: any) => sum + r.wordCount, 0);

      // For single URL, return simpler format
      if (isSingleUrl && allResults.length === 1) {
        const result = allResults[0];
        if (result.success) {
          return result;
        } else {
          return {
            success: false,
            url: result.url,
            error: (result as any).error
          };
        }
      }

      // For multiple URLs, return batch format with summary
      let summary = `# Web Content Fetch Results\n\n`;
      summary += `**Total URLs**: ${urlsArray.length}\n`;
      summary += `**Successful**: ${successCount}\n`;
      summary += `**Failed**: ${failureCount}\n`;
      summary += `**Total Words Fetched**: ${totalWords}\n\n`;
      summary += `---\n\n`;

      // Add individual results
      allResults.forEach((result, index) => {
        summary += `## ${index + 1}. ${result.url}\n\n`;
        
        if (result.success) {
          const successResult = result as any;
          summary += `✅ **Status**: Success\n`;
          if ('metadata' in successResult && successResult.metadata) {
            summary += `**Title**: ${successResult.metadata.title || 'N/A'}\n`;
          }
          if ('contentLength' in successResult) {
            summary += `**Content Length**: ${successResult.contentLength} characters\n`;
            summary += `**Word Count**: ${successResult.wordCount} words\n`;
          }
          if ('duration' in successResult) {
            summary += `**Duration**: ${successResult.duration}ms\n`;
          }
          if ('extractionMethod' in successResult) {
            summary += `**Method**: ${successResult.extractionMethod}\n`;
          }
          summary += `\n### Content Preview:\n\n`;
          if ('content' in successResult && successResult.content) {
            // Truncate very long content for summary
            const content = successResult.content;
            if (content.length > 1000) {
              summary += content.substring(0, 1000) + `\n\n...(truncated, total ${content.length} characters)\n`;
            } else {
              summary += content + '\n';
            }
          }
        } else {
          const failResult = result as any;
          summary += `❌ **Status**: Failed\n`;
          summary += `**Error**: ${failResult.error}\n`;
          if ('duration' in failResult) {
            summary += `**Duration**: ${failResult.duration}ms\n`;
          }
        }
        
        summary += `\n---\n\n`;
      });

      Logger.debug(`Completed: ${successCount} successful, ${failureCount} failed`);

      return {
        success: true,
        totalUrls: urlsArray.length,
        successCount,
        failureCount,
        results: allResults,
        formattedSummary: summary,
        totalWords
      };

    } catch (error) {
      Logger.error('Error:', error);

      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Provide more helpful error messages for common issues
      if (errorMessage.includes('Request failed') || errorMessage.includes('Network')) {
        errorMessage = `网络请求失败：无法连接到目标网站。可能的原因：
1. 网络连接问题
2. 目标URL不可访问
3. 服务器响应超时
4. 网站阻止了请求

建议：检查网络连接和URL是否正确。`;
      } else if (errorMessage.includes('Invalid URL')) {
        errorMessage = `URL 格式错误：请提供有效的网页地址，例如 https://example.com`;
      } else if (errorMessage.includes('HTTP 404')) {
        errorMessage = `页面未找到：目标网页不存在（404错误）`;
      } else if (errorMessage.includes('HTTP 403')) {
        errorMessage = `访问被拒绝：网站拒绝访问该页面（403错误）`;
      } else if (errorMessage.includes('HTTP 500')) {
        errorMessage = `服务器错误：目标网站服务器出现问题（500错误）`;
      }

      return {
        success: false,
        error: errorMessage,
        url: args.url
      };
    }
  }
};

/**
 * Fetch YouTube video transcript using Supadata API
 */
export const fetchYouTubeTranscriptTool: BuiltInTool = {
  name: 'fetch_youtube_transcript',
  description: 'Fetch complete transcript/subtitles from YouTube videos using Supadata API. No length limits on transcripts.',
  category: 'web-content',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)'
      },
      format: {
        type: 'string',
        enum: ['text', 'timestamped', 'json'],
        description: 'Output format for the transcript',
        default: 'timestamped'
      }
    },
    required: ['url']
  },
  execute: async (args: {
    url: string;
    format?: 'text' | 'timestamped' | 'json';
  }) => {
    try {
      const format = args.format || 'timestamped';

      Logger.debug(`Fetching transcript for: ${args.url}`);

      // Validate YouTube URL
      const youtubeUrlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = args.url.match(youtubeUrlPattern);

      if (!match) {
        throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL.');
      }

      const videoId = match[1];
      Logger.debug(`Video ID: ${videoId}`);

      // Call Supadata API using Obsidian's requestUrl
      const apiUrl = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(args.url)}`;
      const response = await requestUrl({
        url: apiUrl,
        method: 'GET',
        headers: {
          'x-api-key': 'sd_5a84a7a3f8ebf064342104af27bd2d1a'
        },
        throw: false
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Supadata API error: ${response.status} ${response.status === 404 ? 'Video not found or transcript not available' : 'API request failed'}`);
      }

      const transcriptData = response.json;
      Logger.debug(`Received transcript data:`, {
        hasContent: !!transcriptData.content,
        contentLength: transcriptData.content?.length || 0
      });

      if (!transcriptData || !transcriptData.content) {
        throw new Error('No transcript data available for this video');
      }

      // Format transcript based on requested format
      const transcriptItems = transcriptData.content.map((item: any) => ({
        startTime: item.offset / 1000, // Convert milliseconds to seconds
        endTime: (item.offset + item.duration) / 1000,
        text: item.text.trim()
      }));

      let formattedTranscript: any;

      switch (format) {
        case 'text':
          formattedTranscript = transcriptItems
            .map((item: any) => item.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          break;

        case 'timestamped':
          const formatTime = (seconds: number): string => {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          };

          formattedTranscript = transcriptItems
            .map((item: any) => `[${formatTime(item.startTime)}] ${item.text}`)
            .join('\n');
          break;

        case 'json':
          formattedTranscript = transcriptItems;
          break;

        default:
          formattedTranscript = transcriptItems;
      }

      const result = {
        success: true,
        videoId,
        url: args.url,
        transcript: formattedTranscript,
        format,
        itemCount: transcriptItems.length,
        totalDuration: Math.max(...transcriptItems.map((item: any) => item.endTime))
      };

      Logger.debug(`Successfully processed transcript:`, {
        itemCount: result.itemCount,
        totalDuration: result.totalDuration,
        format: result.format
      });

      return result;

    } catch (error) {
      Logger.error('Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        url: args.url
      };
    }
  }
};