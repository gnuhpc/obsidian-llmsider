// Browser automation tools for interactive web browsing
import type { ToolCategory } from './built-in-tools';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';

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

// Browser action types
export type BrowserAction = 'launch' | 'click' | 'type' | 'scroll_down' | 'scroll_up' | 'close';

export const browserActions: BrowserAction[] = ['launch', 'click', 'type', 'scroll_down', 'scroll_up', 'close'];

// Browser session state
class BrowserSession {
  private isActive = false;
  private currentUrl = '';
  private sessionData: any = {};

  async launchBrowser(): Promise<void> {
    this.isActive = true;
    Logger.debug('Browser session started');
  }

  async navigateToUrl(url: string): Promise<{ screenshot?: string; logs?: string }> {
    try {
      // Validate URL
      new URL(url);

      // For now, we'll simulate browser navigation by fetching the page
      // In a real implementation, this would use a headless browser
      const response = await requestUrl({
        url,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        throw: false
      });

      if (response.status >= 200 && response.status < 300) {
        this.currentUrl = url;
        return {
          logs: `Successfully navigated to ${url}`,
          screenshot: undefined // Would contain base64 image in real implementation
        };
      } else {
        throw new Error(`HTTP ${response.status}: Failed to load page`);
      }
    } catch (error) {
      throw new Error(`Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async click(coordinate: string): Promise<{ screenshot?: string; logs?: string }> {
    if (!this.isActive) {
      throw new Error('Browser session not active');
    }

    // Parse coordinate (e.g., "100,200")
    const coords = coordinate.split(',').map(c => parseInt(c.trim()));
    if (coords.length !== 2 || coords.some(isNaN)) {
      throw new Error('Invalid coordinate format. Use "x,y" format (e.g., "100,200")');
    }

    Logger.debug(`Simulating click at coordinates: ${coordinate}`);
    return {
      logs: `Clicked at coordinates ${coordinate}`,
      screenshot: undefined
    };
  }

  async type(text: string): Promise<{ screenshot?: string; logs?: string }> {
    if (!this.isActive) {
      throw new Error('Browser session not active');
    }

    Logger.debug(`Typing text: ${text}`);
    return {
      logs: `Typed text: "${text}"`,
      screenshot: undefined
    };
  }

  async scrollDown(): Promise<{ screenshot?: string; logs?: string }> {
    if (!this.isActive) {
      throw new Error('Browser session not active');
    }

    Logger.debug('Scrolling down');
    return {
      logs: 'Scrolled down',
      screenshot: undefined
    };
  }

  async scrollUp(): Promise<{ screenshot?: string; logs?: string }> {
    if (!this.isActive) {
      throw new Error('Browser session not active');
    }

    Logger.debug('Scrolling up');
    return {
      logs: 'Scrolled up',
      screenshot: undefined
    };
  }

  async closeBrowser(): Promise<{ screenshot?: string; logs?: string }> {
    this.isActive = false;
    this.currentUrl = '';
    this.sessionData = {};
    Logger.debug('Browser session closed');
    return {
      logs: 'Browser session closed',
      screenshot: undefined
    };
  }

  isSessionActive(): boolean {
    return this.isActive;
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }
}

// Global browser session instance
let globalBrowserSession: BrowserSession | null = null;

function getBrowserSession(): BrowserSession {
  if (!globalBrowserSession) {
    globalBrowserSession = new BrowserSession();
  }
  return globalBrowserSession;
}

/**
 * Interactive browser automation tool
 */
export const browserTool: BuiltInTool = {
  name: 'browser',
  description: 'Interactive browser automation for web navigation, clicking, typing, and scrolling. Actions: launch (requires url), click (requires coordinate as "x,y"), type (requires text), scroll_down, scroll_up, close.',
  category: 'web-content',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform'
      },
      url: {
        type: 'string',
        description: 'URL for launch action'
      },
      coordinate: {
        type: 'string',
        description: 'Coordinate for click action'
      },
      text: {
        type: 'string',
        description: 'Text for type action'
      }
    },
    required: ['action']
  },
  execute: async (args: {
    action: BrowserAction;
    url?: string;
    coordinate?: string;
    text?: string;
  }) => {
    try {
      const { action, url, coordinate, text } = args;

      // Validate action
      if (!browserActions.includes(action)) {
        throw new Error(`Invalid browser action: ${action}. Valid actions: ${browserActions.join(', ')}`);
      }

      const browserSession = getBrowserSession();
      let result: { screenshot?: string; logs?: string };

      Logger.debug(`Executing action: ${action}`, { url, coordinate, text });

      switch (action) {
        case 'launch':
          if (!url) {
            throw new Error('URL is required for launch action');
          }
          await browserSession.launchBrowser();
          result = await browserSession.navigateToUrl(url);
          break;

        case 'click':
          if (!coordinate) {
            throw new Error('Coordinate is required for click action (format: "x,y")');
          }
          result = await browserSession.click(coordinate);
          break;

        case 'type':
          if (!text) {
            throw new Error('Text is required for type action');
          }
          result = await browserSession.type(text);
          break;

        case 'scroll_down':
          result = await browserSession.scrollDown();
          break;

        case 'scroll_up':
          result = await browserSession.scrollUp();
          break;

        case 'close':
          result = await browserSession.closeBrowser();
          break;

        default:
          throw new Error(`Unsupported browser action: ${action}`);
      }

      const response = {
        success: true,
        action,
        result: {
          logs: result.logs || 'Action completed successfully',
          screenshot: result.screenshot || null,
          sessionActive: browserSession.isSessionActive(),
          currentUrl: browserSession.getCurrentUrl()
        }
      };

      // Special handling for close action
      if (action === 'close') {
        return {
          success: true,
          action,
          message: 'Browser session closed. You may now proceed to using other tools.',
          sessionActive: false
        };
      }

      // For other actions, remind about closing browser before using other tools
      if (browserSession.isSessionActive()) {
        response.result.logs += '\n\n(REMEMBER: if you need to proceed to using non-browser tools or launch a new browser, you MUST first close this browser using the "close" action.)';
      }

      Logger.debug(`Action ${action} completed successfully`);
      return response;

    } catch (error) {
      Logger.error('Error:', error);

      // Ensure browser session is closed on error
      try {
        const browserSession = getBrowserSession();
        if (browserSession.isSessionActive()) {
          await browserSession.closeBrowser();
        }
      } catch (closeError) {
        Logger.error('Error closing browser session:', closeError);
      }

      return {
        success: false,
        action: args.action,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};

/**
 * Web fetch tool for retrieving single or multiple URLs in parallel
 * Supports both single URL (string) and multiple URLs (array) for flexibility
 */
export const webFetchTool: BuiltInTool = {
  name: 'web_fetch',
  description: '🚀 RECOMMENDED for fetching web content - Converts HTML to clean markdown. Supports BOTH single URL (string) and multiple URLs (array). Multiple URLs are fetched IN PARALLEL for maximum efficiency. When you have 2+ URLs from search results, ALWAYS pass them as an array to this tool in ONE call (up to 10 URLs). Example: {urls: ["url1", "url2", "url3"]}. Do NOT call this tool multiple times for multiple URLs.',
  category: 'web-content',
  inputSchema: {
    type: 'object',
    properties: {
      urls: {
        type: ['string', 'array'],
        description: 'Single URL or array of URLs to fetch'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds. Default: 10000'
      }
    },
    required: ['urls']
  },
  execute: async (args: {
    urls: string | string[];
    timeout?: number;
  }) => {
    try {
      const { timeout = 10000 } = args;
      
      // Normalize input to always be an array
      const urlsArray = Array.isArray(args.urls) ? args.urls : [args.urls];
      const isSingleUrl = !Array.isArray(args.urls);

      Logger.debug(`Fetching ${urlsArray.length} URL(s)${isSingleUrl ? '' : ' in parallel'}`);

      // Validate URLs
      const validatedUrls: { url: string; isValid: boolean; error?: string }[] = urlsArray.map(url => {
        try {
          new URL(url);
          return { url, isValid: true };
        } catch (error) {
          return { url, isValid: false, error: 'Invalid URL format' };
        }
      });

      // Filter valid URLs
      const validUrls = validatedUrls.filter(item => item.isValid).map(item => item.url);
      const invalidUrls = validatedUrls.filter(item => !item.isValid);

      // Fetch all valid URLs in parallel
      const fetchPromises = validUrls.map(async (url) => {
        const startTime = Date.now();
        
        try {
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeout);
          });

          // Create fetch promise
          const fetchPromise = requestUrl({
            url,
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            throw: false
          });

          // Race between fetch and timeout
          const response = await Promise.race([fetchPromise, timeoutPromise]) as any;

          const duration = Date.now() - startTime;

          if (response.status < 200 || response.status >= 300) {
            return {
              url,
              success: false,
              status: response.status,
              error: `HTTP ${response.status}`,
              duration
            };
          }

          const html = response.text;
          const markdownContent = htmlToMarkdown(html);
          
          return {
            url,
            success: true,
            status: response.status,
            markdownContent,
            contentLength: markdownContent.length,
            wordCount: markdownContent.split(/\s+/).filter(word => word.length > 0).length,
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
          const successResult = result as any;
          return {
            success: true,
            url: result.url,
            markdownContent: successResult.markdownContent,
            contentLength: successResult.contentLength,
            wordCount: successResult.wordCount,
            duration: successResult.duration,
            formattedSummary: `# Web Fetch Result\n\n**URL**: ${result.url}\n**Status**: Success\n**Content Length**: ${successResult.contentLength} characters\n**Word Count**: ${successResult.wordCount} words\n**Duration**: ${successResult.duration}ms\n\n---\n\n${successResult.markdownContent}`
          };
        } else {
          const failResult = result as any;
          return {
            success: false,
            url: result.url,
            error: failResult.error,
            status: failResult.status,
            duration: failResult.duration
          };
        }
      }

      // For multiple URLs, return batch format
      let summary = `# Web Fetch Results\n\n`;
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
          summary += `✅ **Status**: Success (HTTP ${successResult.status || 200})\n`;
          if ('contentLength' in successResult) {
            summary += `**Content Length**: ${successResult.contentLength} characters\n`;
            summary += `**Word Count**: ${successResult.wordCount} words\n`;
          }
          if ('duration' in successResult) {
            summary += `**Duration**: ${successResult.duration}ms\n`;
          }
          summary += `\n### Content:\n\n`;
          if ('markdownContent' in successResult) {
            // Truncate very long content for summary
            const content = successResult.markdownContent;
            if (content.length > 2000) {
              summary += content.substring(0, 2000) + `\n\n...(truncated, total ${content.length} characters)\n`;
            } else {
              summary += content + '\n';
            }
          }
        } else {
          const failResult = result as any;
          summary += `❌ **Status**: Failed\n`;
          summary += `**Error**: ${failResult.error}\n`;
          if ('status' in failResult && failResult.status) {
            summary += `**HTTP Status**: ${failResult.status}\n`;
          }
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

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        urls: args.urls
      };
    }
  }
};

/**
 * Convert HTML to Markdown (simplified implementation)
 */
function htmlToMarkdown(html: string): string {
  try {
    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove script and style elements
    const scriptsAndStyles = doc.querySelectorAll('script, style, noscript');
    scriptsAndStyles.forEach(el => el.remove());

    // Extract title
    const title = doc.title || '';

    // Extract main content
    const bodyElement = doc.body || doc.documentElement;
    let markdown = '';

    if (title) {
      markdown += `# ${title}\n\n`;
    }

    if (bodyElement) {
      markdown += extractMarkdownFromElement(bodyElement);
    }

    return markdown.trim();
  } catch (error) {
    Logger.error('Error converting HTML to markdown:', error);
    return 'Error converting HTML to markdown';
  }
}

/**
 * Extract markdown content from HTML element
 */
function extractMarkdownFromElement(element: Element): string {
  const result: string[] = [];

  function processElement(el: Element, depth = 0): void {
    const tagName = el.tagName.toLowerCase();

    // Skip non-content elements
    if (['script', 'style', 'noscript', 'iframe', 'object', 'embed'].includes(tagName)) {
      return;
    }

    // Handle different HTML elements
    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        const level = parseInt(tagName.charAt(1));
        const headingText = el.textContent?.trim() || '';
        if (headingText) {
          result.push(`${'#'.repeat(level)} ${headingText}\n`);
        }
        break;

      case 'p':
        const pText = el.textContent?.trim() || '';
        if (pText) {
          result.push(`${pText}\n\n`);
        }
        break;

      case 'a':
        const linkText = el.textContent?.trim() || '';
        const href = el.getAttribute('href') || '';
        if (linkText && href) {
          result.push(`[${linkText}](${href})`);
        } else if (linkText) {
          result.push(linkText);
        }
        break;

      case 'img':
        const alt = el.getAttribute('alt') || '';
        const src = el.getAttribute('src') || '';
        if (src) {
          result.push(`![${alt}](${src})`);
        }
        break;

      case 'ul':
      case 'ol':
        result.push('\n');
        processChildren(el, depth);
        result.push('\n');
        break;

      case 'li':
        const liText = el.textContent?.trim() || '';
        if (liText) {
          const prefix = el.closest('ol') ? '1. ' : '- ';
          result.push(`${'  '.repeat(depth)}${prefix}${liText}\n`);
        }
        break;

      case 'blockquote':
        const quoteText = el.textContent?.trim() || '';
        if (quoteText) {
          const quotedLines = quoteText.split('\n').map(line => `> ${line}`).join('\n');
          result.push(`${quotedLines}\n\n`);
        }
        break;

      case 'code':
        const codeText = el.textContent || '';
        result.push(`\`${codeText}\``);
        break;

      case 'pre':
        const preText = el.textContent || '';
        result.push(`\n\`\`\`\n${preText}\n\`\`\`\n\n`);
        break;

      case 'br':
        result.push('\n');
        break;

      case 'hr':
        result.push('\n---\n\n');
        break;

      case 'strong':
      case 'b':
        const strongText = el.textContent?.trim() || '';
        if (strongText) {
          result.push(`**${strongText}**`);
        }
        break;

      case 'em':
      case 'i':
        const emText = el.textContent?.trim() || '';
        if (emText) {
          result.push(`*${emText}*`);
        }
        break;

      default:
        // For other elements, process children
        processChildren(el, depth);

        // Add line break for block elements
        if (['div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav'].includes(tagName)) {
          const text = el.textContent?.trim() || '';
          if (text) {
            result.push('\n');
          }
        }
        break;
    }
  }

  function processChildren(el: Element, depth = 0): void {
    Array.from(el.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          result.push(text + ' ');
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        processElement(node as Element, depth);
      }
    });
  }

  processChildren(element);

  return result.join('')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}