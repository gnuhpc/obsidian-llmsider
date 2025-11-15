// Market Data Tools - Stock quotes, crypto prices, and market indices
import { BuiltInTool } from './built-in-tools';
import { Logger } from './../utils/logger';
import { requestUrl } from 'obsidian';

/**
 * Get stock quote for US stocks, China A-shares, crypto, and indices
 * Uses Yahoo Finance API (free, no API key required)
 */
export const getMarketQuoteTool: BuiltInTool = {
  name: 'get_market_quote',
  description: 'Get real-time or latest market data for stocks, cryptocurrencies, and market indices. IMPORTANT: Use stock codes directly, not company names. Examples: AAPL (Apple), 002281.SZ (光迅科技), 600519.SS (贵州茅台), BTC-USD (Bitcoin), ^DJI (Dow Jones). For Chinese stocks: Shanghai stocks use .SS suffix (e.g., 600519.SS), Shenzhen stocks use .SZ suffix (e.g., 002281.SZ).',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (NOT company name). Examples: AAPL (US), 002281.SZ (Shenzhen A-share), 600519.SS (Shanghai A-share), 0700.HK (Hong Kong), BTC-USD (crypto), ^DJI (index). Format: Shanghai stocks add .SS, Shenzhen stocks add .SZ, Hong Kong stocks add .HK.'
      },
      symbols: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of stock codes to fetch quotes for multiple assets at once. Use stock codes, not company names.'
      }
    },
    required: []
  },
    execute: async (args: { symbol?: string; symbols?: string[] }) => {
    try {
      const { symbol, symbols } = args;
      
      // Validate input
      if (!symbol && (!symbols || symbols.length === 0)) {
        throw new Error('Either symbol or symbols array must be provided');
      }

      const symbolList = symbols && symbols.length > 0 ? symbols : [symbol!];
      const symbolsParam = symbolList.join(',');

      // Use Yahoo Finance API v8 endpoint (no API key required)
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbolsParam)}?interval=1d&range=1d`;

      Logger.debug('Fetching quote from:', url);

      const response = await requestUrl({
        url: url,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Yahoo Finance API returned status ${response.status}`);
      }

      const data = response.json;
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('No data returned from Yahoo Finance API');
      }

      // Parse multiple results
      const results = data.chart.result.map((result: any) => {
        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];
        
        if (!meta) {
          return { error: 'Invalid data structure' };
        }

        // Get the latest price data
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose || meta.chartPreviousClose;
        const change = currentPrice - previousClose;
        const changePercent = previousClose ? (change / previousClose) * 100 : 0;

        return {
          symbol: meta.symbol,
          name: meta.longName || meta.shortName || meta.symbol,
          currency: meta.currency,
          exchange: meta.exchangeName,
          price: currentPrice,
          previousClose: previousClose,
          change: change,
          changePercent: changePercent.toFixed(2) + '%',
          dayHigh: meta.regularMarketDayHigh,
          dayLow: meta.regularMarketDayLow,
          volume: meta.regularMarketVolume,
          marketCap: meta.marketCap,
          timezone: meta.timezone,
          timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
          marketState: meta.marketState
        };
      });

      // Format response
      if (results.length === 1) {
        const quote = results[0];
        if (quote.error) {
          return {
            success: false,
            error: quote.error,
            message: `Failed to fetch quote for ${symbolList[0]}`
          };
        }

        return {
          success: true,
          data: quote,
          formatted: formatQuote(quote)
        };
      } else {
        return {
          success: true,
          data: results,
          formatted: results.map((q: any) => q.error ? `${q.symbol}: Error` : formatQuote(q)).join('\n\n')
        };
      }

    } catch (error) {
      Logger.error('Error fetching market quote:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to fetch market data. The symbol might be invalid or the service might be temporarily unavailable.'
      };
    }
  }
};

/**
 * Format quote data into readable text
 */
function formatQuote(quote: any): string {
  const changeSign = quote.change >= 0 ? '+' : '';
  const changeEmoji = quote.change >= 0 ? '📈' : '📉';
  
  return `${changeEmoji} **${quote.name}** (${quote.symbol})
💰 Price: ${quote.price} ${quote.currency}
${changeSign}${quote.change.toFixed(2)} (${quote.changePercent})
📊 Day Range: ${quote.dayLow} - ${quote.dayHigh}
📦 Volume: ${quote.volume?.toLocaleString() || 'N/A'}
💵 Market Cap: ${quote.marketCap ? formatMarketCap(quote.marketCap) : 'N/A'}
🏢 Exchange: ${quote.exchange}
🕐 Updated: ${new Date(quote.timestamp).toLocaleString()}
📍 Market: ${quote.marketState}`;
}

/**
 * Format market cap in readable format (billions, millions, etc.)
 */
function formatMarketCap(value: number): string {
  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(2)}T`;
  } else if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else {
    return value.toLocaleString();
  }
}

/**
 * Convert GBK buffer to UTF-8 string (simple approach for common Chinese characters)
 */
function gbkToUtf8(text: string): string {
  try {
    // The text is already decoded by requestUrl, but may have encoding issues
    // For Sina API, the response is actually in GB2312/GBK encoding
    // However, since we can't properly decode it in browser environment,
    // we'll use the stock code directly and rely on Yahoo Finance for display names
    return text;
  } catch (error) {
    Logger.warn('GBK conversion failed:', error);
    return text;
  }
}

/**
 * Search Sina Finance API for Chinese stocks
 */
async function searchSinaFinance(query: string, limit: number): Promise<any[]> {
  try {
    // Sina Finance search API (supports Chinese)
    // Note: This API returns data in GB2312 encoding which may cause display issues
    // We'll extract the stock codes and use Yahoo Finance API to get proper names
    const url = `https://suggest3.sinajs.cn/suggest/type=11,12,13,14,15&key=${encodeURIComponent(query)}&name=suggestdata`;
    
    Logger.debug('Searching via Sina Finance:', url);
    
    const response = await requestUrl({
      url: url,
      method: 'GET',
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.status !== 200) {
      return [];
    }

    // Parse Sina response format: var suggestdata="code1,name1,type1;code2,name2,type2;..."
    const text = response.text;
    const match = text.match(/="(.*)"/);
    if (!match || !match[1]) {
      return [];
    }

    const items = match[1].split(';').filter(item => item.trim());
    const stockCodes: string[] = [];
    
    // Extract stock codes from Sina response
    for (const item of items.slice(0, limit)) {
      const parts = item.split(',');
      if (parts.length < 2) continue;
      
      const code = parts[0]; // e.g., sh600519, sz002281
      const market = code.substring(0, 2); // sh, sz, hk
      const stockCode = code.substring(2);
      
      // Convert to Yahoo Finance format
      let symbol = '';
      if (market === 'sh') {
        symbol = `${stockCode}.SS`; // Shanghai
      } else if (market === 'sz') {
        symbol = `${stockCode}.SZ`; // Shenzhen
      } else if (market === 'hk') {
        symbol = `${stockCode}.HK`; // Hong Kong
      } else {
        continue; // Skip unknown markets
      }
      
      stockCodes.push(symbol);
    }

    if (stockCodes.length === 0) {
      return [];
    }

    // Now fetch proper names from Yahoo Finance API
    const results: any[] = [];
    for (const symbol of stockCodes) {
      try {
        const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        const quoteResponse = await requestUrl({
          url: quoteUrl,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (quoteResponse.status === 200) {
          const quoteData = quoteResponse.json;
          if (quoteData.chart?.result?.[0]?.meta) {
            const meta = quoteData.chart.result[0].meta;
            results.push({
              symbol: symbol,
              name: meta.longName || meta.shortName || symbol,
              type: 'EQUITY',
              exchange: meta.exchangeName || symbol.split('.')[1],
              industry: 'N/A',
              sector: 'N/A',
              source: 'sina+yahoo'
            });
          }
        }
      } catch (error) {
        // If Yahoo lookup fails, still include the symbol
        const market = symbol.endsWith('.SS') ? 'Shanghai' : symbol.endsWith('.SZ') ? 'Shenzhen' : 'Hong Kong';
        results.push({
          symbol: symbol,
          name: symbol,
          type: 'EQUITY',
          exchange: market,
          industry: 'N/A',
          sector: 'N/A',
          source: 'sina'
        });
      }
    }

    return results;
  } catch (error) {
    Logger.warn('Sina Finance search failed:', error);
    return [];
  }
}

/**
 * Search Sohu Finance API for Chinese stocks
 */
async function searchSohuFinance(query: string, limit: number): Promise<any[]> {
  try {
    // Sohu Finance search API
    const url = `https://search.10jqka.com.cn/searchstock.php?q=${encodeURIComponent(query)}&format=json`;
    
    Logger.debug('Searching via Sohu Finance:', url);
    
    const response = await requestUrl({
      url: url,
      method: 'GET',
      headers: {
        'Referer': 'https://www.10jqka.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.status !== 200) {
      return [];
    }

    const data = response.json;
    if (!data.result) {
      return [];
    }

    const results = data.result.slice(0, limit).map((item: any) => {
      const code = item.code;
      const name = item.name;
      const market = item.market;
      
      let symbol = '';
      if (market === 'sh') {
        symbol = `${code}.SS`;
      } else if (market === 'sz') {
        symbol = `${code}.SZ`;
      } else if (market === 'hk') {
        symbol = `${code}.HK`;
      } else {
        symbol = code;
      }
      
      return {
        symbol: symbol,
        name: name,
        type: 'EQUITY',
        exchange: market ? market.toUpperCase() : 'N/A',
        industry: 'N/A',
        sector: 'N/A',
        source: 'sohu'
      };
    });

    return results;
  } catch (error) {
    Logger.warn('Sohu Finance search failed:', error);
    return [];
  }
}

/**
 * Search for stock symbols by company name or keyword
 */
export const searchSymbolTool: BuiltInTool = {
  name: 'search_market_symbol',
  description: 'Search for stock symbols by company name, keyword, or ticker. Supports both English and Chinese company names. Uses multiple data sources (Yahoo Finance, Sina Finance, Sohu Finance) for comprehensive search. Returns matching symbols with their names and exchanges.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query - company name (English or Chinese), keyword, or partial ticker symbol. Examples: "Apple", "Tesla", "腾讯", "光迅科技", "贵州茅台", "Bitcoin"'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)'
      }
    },
    required: ['query']
  },
    execute: async (args: { query: string; limit?: number }) => {
    try {
      const { query, limit = 10 } = args;
      
      if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
      }

      const trimmedQuery = query.trim();
      let allResults: any[] = [];

      // Detect if query contains Chinese characters
      const hasChinese = /[\u4e00-\u9fa5]/.test(trimmedQuery);

      if (hasChinese) {
        // For Chinese queries, try Sina Finance first
        Logger.debug('Detected Chinese query, trying Sina Finance first...');
        const sinaResults = await searchSinaFinance(trimmedQuery, limit);
        if (sinaResults.length > 0) {
          allResults = sinaResults;
          
          return {
            success: true,
            data: allResults,
            count: allResults.length,
            formatted: formatSearchResults(allResults, query),
            source: 'sina-finance'
          };
        }

        // Try Sohu as fallback
        Logger.debug('Sina failed, trying Sohu Finance...');
        const sohuResults = await searchSohuFinance(trimmedQuery, limit);
        if (sohuResults.length > 0) {
          allResults = sohuResults;
          
          return {
            success: true,
            data: allResults,
            count: allResults.length,
            formatted: formatSearchResults(allResults, query),
            source: 'sohu-finance'
          };
        }
      }

      // Try Yahoo Finance API (good for English queries and US stocks)
      try {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0`;

        Logger.debug('Searching symbols via Yahoo Finance:', url);

        const response = await requestUrl({
          url: url,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });

        if (response.status === 200) {
          const data = response.json;
          
          if (data.quotes && data.quotes.length > 0) {
            // Parse and format results
            const results = data.quotes.slice(0, limit).map((quote: any) => ({
              symbol: quote.symbol,
              name: quote.longname || quote.shortname || quote.symbol,
              type: quote.quoteType,
              exchange: quote.exchange,
              industry: quote.industry,
              sector: quote.sector,
              source: 'yahoo'
            }));

            allResults = results;
            
            return {
              success: true,
              data: allResults,
              count: allResults.length,
              formatted: formatSearchResults(allResults, query),
              source: 'yahoo-finance'
            };
          }
        }
      } catch (apiError) {
        Logger.warn('Yahoo Finance API failed:', apiError);
      }

      // If all searches fail
      return {
        success: true,
        data: [],
        count: 0,
        message: `No symbols found for "${query}".`,
        formatted: `🔍 No results found for: **${query}**\n\n💡 Tips:\n- Try using different keywords or the English company name\n- Or use stock codes directly:\n  • Shanghai stocks: add .SS suffix (e.g., 600519.SS for 贵州茅台)\n  • Shenzhen stocks: add .SZ suffix (e.g., 000063.SZ for 中兴通讯)\n  • Hong Kong stocks: add .HK suffix (e.g., 0700.HK for 腾讯)\n  • US stocks: direct ticker (e.g., AAPL for Apple)\n\nExample: Use "0700.HK" directly with get_market_quote tool.`
      };

    } catch (error) {
      Logger.error('Error searching symbols:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Search failed for "${args.query}". Try using stock codes directly (e.g., Shanghai: .SS, Shenzhen: .SZ, Hong Kong: .HK).`
      };
    }
  }
};

/**
 * Format search results into readable text
 */
function formatSearchResults(results: any[], query: string): string {
  if (results.length === 0) {
    return `No results found for: ${query}`;
  }

  let output = `🔍 Search results for: **${query}** (${results.length} found)\n\n`;
  
  results.forEach((result, index) => {
    output += `${index + 1}. **${result.symbol}** - ${result.name}\n`;
    output += `   Type: ${result.type} | Exchange: ${result.exchange}\n`;
    if (result.sector) {
      output += `   Sector: ${result.sector}`;
      if (result.industry) {
        output += ` | Industry: ${result.industry}`;
      }
      output += '\n';
    }
    output += '\n';
  });

  return output;
}
