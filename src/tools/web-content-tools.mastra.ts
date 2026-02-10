// Web content tools for fetching and processing online content - Mastra format
import { z } from 'zod';
import type { MastraTool } from './mastra-tool-types';
import { createMastraTool } from './tool-converter';
import { Logger } from './../utils/logger';
import { 
  fetchWebContent as fetchWebContentUtil, 
  fetchMultipleWebContent as fetchMultipleWebContentUtil,
  type WebContentResult, 
  type WebFetchOptions 
} from './utils/web-fetcher';

/**
 * Fetch and extract content from web pages - supports single or multiple URLs
 * Refactored to use the centralized web-fetcher utility with JavaScript rendering support
 */
export const fetchWebContentTool: MastraTool = createMastraTool({
  category: 'search-web',
  id: 'fetch_web_content',
  description: 'Fetch and extract content from web pages. Can process single URL or multiple URLs in parallel. Automatically extracts main content, metadata, and text from web pages.',
  
  inputSchema: z.object({
    url: z.union([
      z.string(),
      z.array(z.string()),
      z.record(z.any()),
      z.array(z.record(z.any()))
    ]).optional().describe('REQUIRED. URL(s) to fetch. Formats accepted: 1) Single URL string, 2) Array of URLs, 3) Object containing URLs, 4) Array of objects (like search results). The tool will automatically extract URLs from any structure provided.'),
    
    urls: z.union([
      z.string(),
      z.array(z.string()),
      z.record(z.any()),
      z.array(z.record(z.any()))
    ]).optional().describe('Alias for url parameter. Can accept entire search results object.'),
    
    extractType: z.enum(['full', 'text_only', 'metadata_only', 'main_content'])
      .optional()
      .default('full')
      .describe('Content extraction type. Options: "full" (complete content + metadata), "text_only" (text only), "metadata_only" (title/description), "main_content" (article text). Default: "full"'),
    
    selector: z.string()
      .optional()
      .describe('CSS selector for targeted extraction (e.g., ".article-body", "#content"). Leave empty to extract all content.'),
    
    timeout: z.number()
      .int()
      .min(1000)
      .max(60000)
      .optional()
      .default(30000)
      .describe('Request timeout in milliseconds (1000-60000). Default: 30000'),
    
    enableJavaScript: z.boolean()
      .optional()
      .default(true)
      .describe('Enable JavaScript rendering for dynamic pages. Default: true'),
    
    jsWaitTime: z.number()
      .int()
      .min(0)
      .max(10000)
      .optional()
      .default(3000)
      .describe('Wait time in milliseconds after page load for JavaScript execution (0-10000). Default: 3000')
  }),
  
  outputSchema: z.object({
    success: z.boolean().describe('Whether fetch was successful'),
    results: z.array(z.object({
      title: z.string().optional().describe('Page title'),
      content: z.string().optional().describe('Extracted text content'),
      html: z.string().optional().describe('Raw HTML (if extractType=full)'),
      metadata: z.record(z.any()).optional().describe('Page metadata (author, description, keywords, etc.)'),
      images: z.array(z.string()).optional().describe('Image links on the page'),
      links: z.array(z.string()).optional().describe('Links on the page')
    })).optional().describe('Array of fetched content results'),
    totalResults: z.number().optional().describe('Total number of URLs processed'),
    totalUrls: z.number().optional(),
    successCount: z.number().optional(),
    failureCount: z.number().optional(),
    totalWords: z.number().optional(),
    summary: z.string().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
    filteredCount: z.number().optional(),
    inputReceived: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    contentLength: z.number().optional(),
    wordCount: z.number().optional(),
    duration: z.number().optional(),
    extractionMethod: z.string().optional()
  }),
  
  execute: async ({ context, runtimeContext }) => {
    try {
      // Support 'url' or 'urls' parameter
      let urlInput = context.url || context.urls;

      // ENHANCEMENT: If no explicit url/urls parameter, use the entire context
      // This handles cases where LLM passes the search results object directly as the input
      if (!urlInput && context && typeof context === 'object' && Object.keys(context).length > 0) {
        Logger.debug('No explicit url/urls parameter, using entire context for URL extraction');
        urlInput = context;
      }

      // Validate url parameter exists
      if (!urlInput) {
        Logger.error('Missing url parameter and context is empty:', context);
        throw new Error('URL parameter is required. Please provide a URL string, array of URLs, or an object containing URLs.');
      }

      const extractType = context.extractType || 'full';
      const customSelector = context.selector || '';
      const timeout = context.timeout || 30000; // Increased to 30s for JavaScript rendering
      const enableJavaScript = context.enableJavaScript !== false; // Enable by default
      const jsWaitTime = context.jsWaitTime || 3000;
      
      // Parse URL input (handles JSON strings, arrays, and objects with url fields)
      const urlsArray: string[] = [];
      const isSingleUrl = !Array.isArray(urlInput);
      
      // Handle JSON string arrays like '["url1", "url2"]'
      let processedUrl: string | string[] | Record<string, any> | Record<string, any>[] = urlInput;
      if (typeof urlInput === 'string' && urlInput.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(urlInput);
          if (Array.isArray(parsed)) {
            Logger.debug('Detected JSON string array, parsing:', urlInput.substring(0, 100));
            processedUrl = parsed;
          }
        } catch (e) {
          Logger.debug('String starts with [ but is not valid JSON, treating as URL');
        }
      }
      
      // Blocklist for URLs that should be filtered out
      const blockedDomains = [
        'wenku.baidu.com',           // Baidu Wenku
        'baike.baidu.com',           // Baidu Baike (Paid content)
        'doc.mbalib.com',            // MBA Lib Doc (Login required)
        'download.csdn.net',         // CSDN Download (Points required)
      ];
      
      // Helper function to extract URLs from plain text using regex
      const extractUrlsFromText = (text: string): string[] => {
        const urls: string[] = [];
        // Match http:// or https:// followed by non-whitespace characters
        const urlRegex = /https?:\/\/[^\s,\]}"']+/g;
        const matches = text.match(urlRegex);
        
        if (matches) {
          for (let url of matches) {
            // Clean up trailing punctuation that's likely not part of the URL
            url = url.replace(/[,.\]}\)"']+$/, '');
            urls.push(url);
          }
        }
        
        return urls;
      };
      
      // Helper function to recursively extract URLs from objects
      const extractUrlsFromObject = (obj: unknown, depth = 0): string[] => {
        const MAX_DEPTH = 5; // Increased from 3 to handle deeper nesting
        if (depth > MAX_DEPTH) return [];
        
        const urls: string[] = [];
        
        if (typeof obj === 'string') {
          // First try to extract URLs from text using regex (handles mixed content)
          const textUrls = extractUrlsFromText(obj);
          if (textUrls.length > 0) {
            urls.push(...textUrls);
          }
          // Also check if the whole string is a valid URL
          else if (obj.startsWith('http://') || obj.startsWith('https://')) {
            urls.push(obj);
          } else if (obj.trim().startsWith('[') || obj.trim().startsWith('{')) {
            // Try to parse JSON string
            try {
              const parsed = JSON.parse(obj);
              urls.push(...extractUrlsFromObject(parsed, depth + 1));
            } catch (e) {
              Logger.debug('String looks like JSON but failed to parse:', obj.substring(0, 100));
            }
          }
        } else if (Array.isArray(obj)) {
          // Recursively extract from array items
          for (const item of obj) {
            urls.push(...extractUrlsFromObject(item, depth + 1));
          }
        } else if (typeof obj === 'object' && obj !== null) {
          // Try common URL field names first
          const urlFields = [
            'url', 'link', 'href', 'uri', 'src', 'source', 'website', 
            'page_url', 'article_url', 'original_url', 'web_url', 
            'formatted_url', 'link_url', 'desktop_url', 'mobile_url'
          ] as const;
          
          // Also check fields that likely contain lists of objects with URLs
          const containerFields = ['results', 'items', 'data', 'hits', 'matches', 'output'] as const;
          
          let found = false;
          
          // 1. Check container fields first to prioritize actual results
          for (const field of containerFields) {
            if (field in obj) {
              const value = (obj as Record<string, unknown>)[field];
              if (value) {
                const extracted = extractUrlsFromObject(value, depth + 1);
                if (extracted.length > 0) {
                  urls.push(...extracted);
                  found = true;
                }
              }
            }
          }
          
          // 2. Check direct URL fields
          for (const field of urlFields) {
            if (field in obj) {
              const value = (obj as Record<string, unknown>)[field];
              if (value) {
                const extracted = extractUrlsFromObject(value, depth + 1);
                if (extracted.length > 0) {
                  urls.push(...extracted);
                  found = true;
                }
              }
            }
          }
          
          // 3. If no specific field found, check all string values in the object
          if (!found) {
            for (const value of Object.values(obj)) {
              if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                urls.push(value);
              } else if (typeof value === 'object' && value !== null) {
                // Recursively check nested objects
                urls.push(...extractUrlsFromObject(value, depth + 1));
              }
            }
          }
        }
        
        return urls;
      };
      
      // Normalize to array
      const inputArray: unknown[] = Array.isArray(processedUrl) ? processedUrl : [processedUrl];
      
      // Extract URLs from input (handles strings, objects, and arrays), with filtering
      Logger.debug(`Processing ${inputArray.length} input item(s) to extract URLs`);
      
      for (const item of inputArray) {
        const extractedUrls = extractUrlsFromObject(item);
        
        for (const url of extractedUrls) {
          // Check if URL is blocked
          const isBlocked = blockedDomains.some(domain => url.includes(domain));
          if (isBlocked) {
            Logger.warn(`Skipping blocked URL: ${url}`);
            continue;
          }
          
          // Avoid duplicates
          if (!urlsArray.includes(url)) {
            urlsArray.push(url);
          }
        }
      }

      // Handle case where all URLs were filtered out or no URLs found
      if (urlsArray.length === 0) {
        const hasBlockedUrls = inputArray.some(item => {
          const urls = extractUrlsFromObject(item);
          return urls.some(url => blockedDomains.some(domain => url.includes(domain)));
        });
        
        if (hasBlockedUrls) {
          Logger.warn('All URLs were filtered out by blocklist');
          return {
            success: false,
            error: 'All provided URLs are blocked (e.g., Baidu Wenku, paywalled content)',
            filteredCount: inputArray.length
          };
        } else {
          Logger.error('No URLs could be extracted from input:', inputArray);
          return {
            success: false,
            error: 'No valid URLs found in input. Please provide URL strings, objects with url/link/href fields, or arrays of such items.',
            inputReceived: inputArray.length > 0 ? typeof inputArray[0] : 'empty'
          };
        }
      }

      Logger.debug(`Successfully extracted ${urlsArray.length} URL(s) from input:`, urlsArray);

      Logger.debug(`Fetching ${extractType} content from ${urlsArray.length} URL(s)${isSingleUrl ? '' : ' in parallel'}`, {
        urls: urlsArray,
        extractType,
        customSelector,
        enableJavaScript,
        jsWaitTime
      });

      // Prepare fetch options
      const fetchOptions: WebFetchOptions = {
        timeout,
        extractType,
        selector: customSelector,
        enableJavaScript,
        jsWaitTime
      };

      // Fetch using the web-fetcher utility
      const onProgress = (runtimeContext as any)?.onProgress;
      
      // Helper to report progress for single URL
      const reportProgress = (url: string, status: 'fetching' | 'success' | 'error', error?: string) => {
        if (onProgress) {
          onProgress(JSON.stringify({ type: 'web_fetch_progress', url, status, error }) + '\n');
        }
      };

      let results: WebContentResult[];
      
      if (urlsArray.length === 1) {
        const url = urlsArray[0];
        reportProgress(url, 'fetching');
        try {
          const result = await fetchWebContentUtil(url, fetchOptions);
          reportProgress(url, result.success ? 'success' : 'error', result.error);
          results = [result];
        } catch (e) {
          reportProgress(url, 'error', String(e));
          throw e;
        }
      } else {
        results = await fetchMultipleWebContentUtil(urlsArray, fetchOptions, (status) => {
          if (onProgress) {
            onProgress(JSON.stringify({ type: 'web_fetch_progress', ...status }) + '\n');
          }
        });
      }

      // Calculate statistics
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      const totalWords = results
        .filter(r => r.success && r.wordCount)
        .reduce((sum, r) => sum + (r.wordCount || 0), 0);

      // For single URL, return simpler format
      if (isSingleUrl && results.length === 1) {
        const result = results[0];
        if (result.success) {
          // Remove url from result
          const { url, ...rest } = result;
          return rest;
        } else {
          return {
            success: false,
            error: result.error
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
      results.forEach((result, index) => {
        summary += `## ${index + 1}. ${result.url}\n\n`;
        
        if (result.success) {
          summary += `✅ **Status**: Success\n`;
          if (result.title) {
            summary += `**Title**: ${result.title}\n`;
          }
          if (result.contentLength !== undefined) {
            summary += `**Content Length**: ${result.contentLength} characters\n`;
            summary += `**Word Count**: ${result.wordCount} words\n`;
          }
          if (result.duration !== undefined) {
            summary += `**Duration**: ${result.duration}ms\n`;
          }
          if (result.extractionMethod) {
            summary += `**Method**: ${result.extractionMethod}\n`;
          }
          summary += `\n### Content Preview:\n\n`;
          if (result.content) {
            // Truncate very long content for summary
            if (result.content.length > 1000) {
              summary += result.content.substring(0, 1000) + `\n\n...(truncated, total ${result.content.length} characters)\n`;
            } else {
              summary += result.content + '\n';
            }
          }
        } else {
          summary += `❌ **Status**: Failed\n`;
          summary += `**Error**: ${result.error}\n`;
          if (result.duration !== undefined) {
            summary += `**Duration**: ${result.duration}ms\n`;
          }
        }
        summary += `\n---\n\n`;
      });

      // Log final statistics
      Logger.debug(`Tool fetch_web_content result: ${successCount}/${urlsArray.length} URLs succeeded, ${totalWords} total words`);
      
      // Remove url from results
      const sanitizedResults = results.map(r => {
        const { url, ...rest } = r;
        return rest;
      });

      return {
        success: successCount > 0, // Success if at least one URL succeeded
        totalUrls: urlsArray.length,
        successCount,
        failureCount,
        totalWords,
        results: sanitizedResults,
        summary,
        // Add warning message when there are partial failures
        ...(successCount > 0 && failureCount > 0 ? {
          message: `⚠️ Partial success: ${successCount}/${urlsArray.length} URLs fetched (${failureCount} failed). This is normal for large batches - continuing with available content.`
        } : {}),
        // Add error when all failed
        ...(successCount === 0 ? {
          error: `❌ All ${urlsArray.length} URL(s) failed to fetch. This may indicate network issues or blocked access. Check individual errors above.`
        } : {})
      };

    } catch (error) {
      Logger.error('Error:', error);

      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Provide more helpful error messages for common issues
      if (errorMessage.includes('Request failed') || errorMessage.includes('Network')) {
        errorMessage = `Network request failed: Unable to connect to target website. Possible reasons:
1. Network connection issue
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
        error: errorMessage
      };
    }
  }
});
