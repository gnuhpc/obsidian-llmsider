/**
 * Reusable web content fetcher utility
 * Comprehensive web scraping component with JavaScript rendering support
 * Can be used by any tool that needs to fetch and extract web content
 */

import { Logger } from '../../utils/logger';
import { requestUrl, htmlToMarkdown } from 'obsidian';

// Common selectors for main content extraction
const MAIN_CONTENT_SELECTORS = [
  '#main-content',
  '.wiki-content',
  '.confluence-content',
  '#content',
  '.page-content',
  '.post-content',
  '.article-content',
  '.article-body',
  '.main',
  'main',
  '[role="main"]',
  '#main',
  '.content',
  'article',
  '.article'
];

// Electron BrowserWindow type for JavaScript rendering
interface BrowserWindow {
  loadURL(url: string): Promise<void>;
  webContents: {
    executeJavaScript(code: string): Promise<unknown>;
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

declare const require: (id: string) => unknown;

export interface WebContentResult {
  success: boolean;
  url: string;
  title?: string;
  content?: string;
  markdown?: string;
  contentLength?: number;
  wordCount?: number;
  status?: number;
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string;
    author?: string;
    siteName?: string;
    type?: string;
    image?: string;
  };
  error?: string;
  duration?: number;
  extractionMethod?: 'javascript' | 'static' | 'static-fallback';
  extractionTarget?: string;
  waitTime?: number;
}

export interface WebFetchOptions {
  timeout?: number;
  jsWaitTime?: number;
  extractType?: 'full' | 'text_only' | 'metadata_only' | 'main_content';
  selector?: string;
  enableJavaScript?: boolean;  // Enable/disable JavaScript rendering
}

/**
 * Render a web page with JavaScript and return the final HTML
 * Uses Electron BrowserWindow for JavaScript execution
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const electron = require('electron') as any;
        if (electron && electron.BrowserWindow) {
          BrowserWindowClass = electron.BrowserWindow;
        }
      } catch (error) {
        Logger.debug(`Direct electron require failed:`, error);
      }

      // If that didn't work, try remote access (for older Electron versions)
      if (!BrowserWindowClass) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const electron = require('electron') as any;
          const { remote } = electron;
          if (remote && remote.BrowserWindow) {
            BrowserWindowClass = remote.BrowserWindow;
          }
        } catch (error) {
          Logger.debug(`Remote electron require failed:`, error);
        }
      }

      // Try accessing through global object (some Electron contexts)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!BrowserWindowClass && typeof global !== 'undefined' && (global as any).require) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    `) as string;

    Logger.debug(`Successfully rendered page (${html.length} characters)`);
    return html;
  } catch (error) {
    Logger.error('JavaScript rendering error:', error);
    throw new Error(`JavaScript rendering failed: ${error instanceof Error ? error.message : 'Electron not available'}`);
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
async function fetchStaticHTML(url: string): Promise<{ html: string; status: number }> {
  let response;
  try {
    response = await requestUrl({
      url,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      throw: false
    });
  } catch (error) {
    throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}: ${response.status === 404 ? 'Page not found' : 'Request failed'}`);
  }

  return { html: response.text, status: response.status };
}

/**
 * Extract text content from HTML document
 */
function extractTextContent(doc: Document, extractType: string, customSelector?: string): string {
  // Remove script and style elements
  const scriptsAndStyles = doc.querySelectorAll('script, style, noscript');
  scriptsAndStyles.forEach(el => el.remove());

  // If main content or specific selector, remove common junk elements
  if (extractType === 'main_content' || customSelector) {
    const junkSelectors = [
      'nav', 'header', 'footer', 'aside', 
      '.nav', '.navigation', '.sidebar', '.header', '.footer',
      '.banner', '.announcement', '.notice', '.alert',
      '.aui-banner', '.aui-header', '.aui-footer', // Confluence specific
      '.skip-link', '.skip-to-content', '.screen-reader-text',
      '#header', '#footer', '#sidebar', '#navigation'
    ];
    junkSelectors.forEach(s => {
      doc.querySelectorAll(s).forEach(el => el.remove());
    });
  }

  // Determine the extraction target element
  let targetElement: Element | null = null;

  if (customSelector) {
    targetElement = doc.querySelector(customSelector);
    if (!targetElement) {
      Logger.warn(`Custom selector "${customSelector}" not found, falling back to body`);
      targetElement = doc.body || doc.documentElement;
    }
  } else if (extractType === 'main_content') {
    for (const selector of MAIN_CONTENT_SELECTORS) {
      targetElement = doc.querySelector(selector);
      if (targetElement) {
        Logger.debug(`Found main content using selector: ${selector}`);
        break;
      }
    }

    if (!targetElement) {
      Logger.warn('No main content selectors found, falling back to body');
      targetElement = doc.body || doc.documentElement;
    }
  } else {
    targetElement = doc.body || doc.documentElement;
  }

  if (!targetElement) {
    return '';
  }

  const textNodes: string[] = [];

  function extractTextFromElement(element: Element) {
    const childNodes = Array.from(element.childNodes);
    for (const node of childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          textNodes.push(text);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;

        // Skip hidden elements
        const computedStyle = getComputedStyle ? getComputedStyle(el) : null;
        if (computedStyle) {
          if (computedStyle.display === 'none' ||
              computedStyle.visibility === 'hidden' ||
              computedStyle.opacity === '0') {
            return;
          }
        }

        // Skip non-content elements
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

  return textNodes.join(' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract metadata from HTML document
 */
function extractMetadata(doc: Document) {
  return {
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
}

/**
 * Parse URL input that might be:
 * - A single URL string
 * - A JSON string array: '["url1", "url2"]'
 * - An actual array
 */
function parseUrlInput(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input;
  }

  // Try to parse as JSON array
  if (typeof input === 'string' && input.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        Logger.debug(`Parsed JSON string array with ${parsed.length} URLs`);
        return parsed;
      }
    } catch (error) {
      Logger.debug('Failed to parse as JSON array, treating as single URL');
    }
  }

  return [input];
}

/**
 * Extract URL from an object that might have url/link/href/uri fields
 */
function extractUrlFromObject(item: unknown): string | null {
  if (typeof item === 'string') {
    return item;
  }

  if (typeof item === 'object' && item !== null) {
    const urlFields = ['url', 'link', 'href', 'uri'] as const;
    
    for (const field of urlFields) {
      if (field in item) {
        const urlValue = (item as Record<string, unknown>)[field];
        if (typeof urlValue === 'string') {
          Logger.debug(`Extracted URL from object field: ${field}`);
          return urlValue;
        }
      }
    }
  }

  return null;
}

/**
 * Validate URL and return validation result
 */
function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    new URL(url);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid URL format'
    };
  }
}

/**
 * Fetch and extract web content from a single URL
 * This is the core reusable function that can be called by any tool
 */
export async function fetchWebContent(url: string, options: WebFetchOptions = {}): Promise<WebContentResult> {
  const {
    timeout = 15000,
    extractType = 'full',
    selector = '',
    enableJavaScript = false,
    jsWaitTime = 2000
  } = options;

  const startTime = Date.now();

  try {
    // Validate URL
    const validation = validateUrl(url);
    if (!validation.isValid) {
      return {
        success: false,
        url,
        error: validation.error || 'Invalid URL format'
      };
    }

    Logger.debug(`Fetching web content from: ${url}`, { extractType, selector, enableJavaScript });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });

    // Fetch HTML content - try JavaScript rendering first if enabled
    let html: string;
    let httpStatus: number = 200; // Default for JS rendering
    let extractionMethod: 'javascript' | 'static' | 'static-fallback' = 'static';

    if (enableJavaScript) {
      try {
        Logger.debug('Attempting JavaScript rendering...');
        const renderPromise = renderAndGetHTML(url, jsWaitTime);
        html = await Promise.race([renderPromise, timeoutPromise]);
        extractionMethod = 'javascript';
        Logger.debug('Successfully rendered page with JavaScript');
      } catch (jsError) {
        Logger.warn('JavaScript rendering failed, falling back to static HTML:', jsError);
        try {
          const fetchPromise = fetchStaticHTML(url);
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          html = result.html;
          httpStatus = result.status;
          extractionMethod = 'static-fallback';
          Logger.debug('Fetched static HTML as fallback');
        } catch (staticError) {
          throw staticError;
        }
      }
    } else {
      const fetchPromise = fetchStaticHTML(url);
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      html = result.html;
      httpStatus = result.status;
      extractionMethod = 'static';
    }

    Logger.debug(`Fetched HTML content (${html.length} characters) using ${extractionMethod}`);

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract metadata
    const metadata = extractMetadata(doc);

    if (extractType === 'metadata_only') {
      return {
        success: true,
        url,
        metadata,
        extractionMethod,
        duration: Date.now() - startTime
      };
    }

    // Extract text content
    const textContent = extractTextContent(doc, extractType, selector);
    
    Logger.debug(`Extracted text content: ${textContent.length} characters`);
    
    // Extract markdown content using Obsidian's built-in converter
    let markdown = '';
    let markdownConversionFailed = false;
    try {
      // If we have a specific selector, use that element for markdown too
      if (selector && doc.querySelector(selector)) {
        markdown = htmlToMarkdown(doc.querySelector(selector) as HTMLElement);
      } else if (extractType === 'main_content') {
        // Try to find main content for markdown too
        let mainEl = null;
        for (const s of MAIN_CONTENT_SELECTORS) {
          mainEl = doc.querySelector(s);
          if (mainEl) break;
        }
        markdown = htmlToMarkdown((mainEl || doc.body || doc.documentElement) as HTMLElement);
      } else {
        markdown = htmlToMarkdown((doc.body || doc.documentElement) as HTMLElement);
      }
      Logger.debug(`Markdown conversion successful: ${markdown.length} characters`);
    } catch (e) {
      Logger.warn('Failed to convert HTML to markdown using Obsidian API, falling back to text content');
      markdown = textContent;
      markdownConversionFailed = true;
    }

    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

    // Validate that we actually extracted meaningful content
    // If HTML was successfully fetched (which we know it was), be more lenient
    // Only fail if we truly got nothing
    const hasValidContent = (
      html.length > 100 ||  // We fetched HTML successfully
      textContent.length > 20 ||  // Has some text content
      (metadata.title && metadata.title.length > 0) ||  // Has a title
      markdown.length > 20  // Or has some markdown
    );

    if (!hasValidContent) {
      Logger.warn(`Extracted content appears empty or invalid for ${url}`, {
        htmlLength: html.length,
        textLength: textContent.length,
        markdownLength: markdown.length,
        hasTitle: !!metadata.title,
        extractionMethod,
        markdownConversionFailed
      });
      return {
        success: false,
        url,
        error: 'Failed to extract meaningful content from page. The page may be empty, require authentication, or use heavy JavaScript rendering.',
        status: httpStatus,
        extractionMethod,
        duration: Date.now() - startTime
      };
    }
    
    Logger.debug(`Content validation passed for ${url}`, {
      htmlLength: html.length,
      textLength: textContent.length,
      markdownLength: markdown.length,
      wordCount,
      hasTitle: !!metadata.title
    });

    const result: WebContentResult = {
      success: true,
      url,
      title: metadata.title,
      content: textContent,
      markdown: markdown,
      contentLength: markdown.length || textContent.length,
      wordCount,
      status: httpStatus,
      extractionMethod,
      duration: Date.now() - startTime
    };

    if (extractType === 'full') {
      result.metadata = metadata;
    }

    Logger.debug(`Extracted content:`, {
      title: metadata.title,
      contentLength: textContent.length,
      wordCount,
      extractionMethod
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    };
  }
}

/**
 * Fetch content from multiple URLs in parallel
 */
/**
 * Fetch multiple URLs with controlled concurrency and batch timeout to avoid resource exhaustion
 * URLs are processed in batches with a 30-second timeout per batch
 */
export async function fetchMultipleWebContent(
  urls: string[],
  options: WebFetchOptions = {},
  onProgress?: (status: { url: string; status: 'fetching' | 'success' | 'error'; error?: string }) => void
): Promise<WebContentResult[]> {
  const maxConcurrent = 5; // Limit concurrent requests to avoid overwhelming the system
  const batchTimeout = 30000; // 30 seconds timeout per batch
  Logger.debug(`Fetching content from ${urls.length} URLs with max ${maxConcurrent} concurrent requests, ${batchTimeout}ms timeout per batch`);
  
  const results: WebContentResult[] = [];
  
  // Process URLs in batches
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const batchNumber = Math.floor(i / maxConcurrent) + 1;
    const totalBatches = Math.ceil(urls.length / maxConcurrent);
    Logger.debug(`Processing batch ${batchNumber}/${totalBatches}: ${batch.length} URLs`);
    
    try {
      // Create batch promises with individual URL fetching
      const batchPromises = batch.map(async url => {
        // Report start
        if (onProgress) {
          onProgress({ url, status: 'fetching' });
        }
        
        try {
          const result = await fetchWebContent(url, options);
          
          // Report completion
          if (onProgress) {
            onProgress({ 
              url, 
              status: result.success ? 'success' : 'error',
              error: result.error 
            });
          }
          
          return result;
        } catch (error) {
          // Report error
          if (onProgress) {
            onProgress({ 
              url, 
              status: 'error',
              error: error instanceof Error ? error.message : String(error)
            });
          }
          throw error;
        }
      });
      
      // Create batch timeout promise
      const batchTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Batch ${batchNumber} timeout after ${batchTimeout}ms`));
        }, batchTimeout);
      });
      
      // Race between batch completion and batch timeout
      const batchResults = await Promise.race([
        Promise.allSettled(batchPromises),
        batchTimeoutPromise
      ]);
      
      // Convert PromiseSettledResult to WebContentResult
      batchResults.forEach((result, index) => {
        const url = batch[index];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          Logger.error(`Failed to fetch ${url}:`, result.reason);
          results.push({
            success: false,
            url,
            error: result.reason?.message || String(result.reason)
          });
        }
      });
      
      Logger.debug(`Batch ${batchNumber}/${totalBatches} completed`);
      
    } catch (error) {
      // Handle batch timeout - mark all URLs in this batch as timeout errors
      Logger.warn(`Batch ${batchNumber} timeout, marking ${batch.length} URLs as timeout errors`);
      batch.forEach(url => {
        results.push({
          success: false,
          url,
          error: `Batch timeout after ${batchTimeout}ms`,
          duration: batchTimeout
        });
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  Logger.debug(`Completed fetching ${urls.length} URLs: ${successCount} succeeded, ${urls.length - successCount} failed`);
  
  return results;
}
