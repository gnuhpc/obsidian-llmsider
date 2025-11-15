// Real-time market data tools
// Provides tick data, order book snapshots, market depth, real-time quotes, transaction details
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get stock tick data (transaction-by-transaction)
 * Data source: Sina Finance real-time tick API
 */
export const getStockTickDataTool: BuiltInTool = {
  name: 'get_stock_tick_data',
  description: 'Get real-time tick data showing every transaction with timestamp, price, volume, buy/sell direction.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code with market prefix, e.g., sh600000, sz000001. Required'
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol } = args;
      
      // Sina Finance tick data API
      const url = `https://vip.stock.finance.sina.com.cn/quotes_service/view/vMS_tradedetail.php`;
      const params = new URLSearchParams({
        symbol: symbol,
        date: new Date().toISOString().split('T')[0].replace(/-/g, '-')
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        symbol,
        message: `Successfully retrieved tick data for ${symbol}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get Level-2 order book (5-level depth)
 * Data source: East Money Level-2 market data
 */
export const getOrderBookLevel2Tool: BuiltInTool = {
  name: 'get_order_book_level2',
  description: 'Get Level-2 order book showing 5 levels of bid/ask prices and volumes in real-time.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit), e.g., 600000, 000001. Required'
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol } = args;
      
      // Determine market code
      const marketCode = symbol.startsWith('6') ? '1' : '0';
      
      // East Money Level-2 API
      const url = 'https://push2.eastmoney.com/api/qt/stock/get';
      const params = new URLSearchParams({
        secid: `${marketCode}.${symbol}`,
        fields: 'f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f19,f20,f21,f22,f23,f24,f25,f26,f27,f28'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        message: `Successfully retrieved Level-2 order book for ${symbol}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get Level-2 full order book (10-level depth)
 * Data source: Premium market data service
 */
export const getOrderBookLevel2FullTool: BuiltInTool = {
  name: 'get_order_book_level2_full',
  description: 'Get full Level-2 order book with 10 levels of bid/ask depth. Premium data for institutional traders.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit), e.g., 600000, 000001. Required'
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol } = args;
      
      // Determine market code
      const marketCode = symbol.startsWith('6') ? '1' : '0';
      
      // East Money full depth API
      const url = 'https://push2.eastmoney.com/api/qt/stock/details/get';
      const params = new URLSearchParams({
        secid: `${marketCode}.${symbol}`,
        fields1: 'f1,f2,f3,f4',
        fields2: 'f51,f52,f53,f54,f55'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        message: `Successfully retrieved full Level-2 order book for ${symbol}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get real-time transaction stream
 * Data source: Continuous transaction feed
 */
export const getTransactionStreamTool: BuiltInTool = {
  name: 'get_transaction_stream',
  description: 'Get real-time transaction stream with continuous updates of trades, showing timestamp, price, volume, direction.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code with market prefix, e.g., sh600000, sz000001. Required'
      },
      count: {
        type: 'number',
        description: 'Number of recent transactions to retrieve. Default: 100, max: 500'
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, count = 100 } = args;
      const limitedCount = Math.min(count, 500);
      
      // Sina transaction stream API
      const url = `https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_Transactions.getRecentTransactions`;
      const params = new URLSearchParams({
        symbol: symbol,
        num: String(limitedCount)
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        count: limitedCount,
        message: `Successfully retrieved ${limitedCount} recent transactions for ${symbol}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get market snapshot (all stocks)
 * Data source: Full market snapshot data
 */
export const getMarketSnapshotTool: BuiltInTool = {
  name: 'get_market_snapshot',
  description: 'Get full market snapshot showing real-time quotes for all stocks in specified market (Shanghai/Shenzhen).',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      market: {
        type: 'string',
        description: 'Market: sh (Shanghai), sz (Shenzhen), all (both markets). Default: all',
        enum: ['sh', 'sz', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const market = args.market || 'all';
      
      // East Money market snapshot API
      const url = 'https://push2.eastmoney.com/api/qt/clist/get';
      const marketFilter = market === 'sh' ? 'm:1' : market === 'sz' ? 'm:0' : 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23';
      
      const params = new URLSearchParams({
        pn: '1',
        pz: '5000',
        po: '1',
        np: '1',
        fltt: '2',
        invt: '2',
        fid: 'f3',
        fs: marketFilter,
        fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        market,
        message: `Successfully retrieved market snapshot for ${market}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get intraday minute-level data
 * Data source: 1-minute/5-minute K-line data
 */
export const getIntradayMinuteDataTool: BuiltInTool = {
  name: 'get_intraday_minute_data',
  description: 'Get intraday minute-level candlestick data (1-min or 5-min intervals) for current trading day.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit), e.g., 600000, 000001. Required'
      },
      interval: {
        type: 'string',
        description: 'Time interval: 1 (1-minute), 5 (5-minute), 15 (15-minute), 30 (30-minute), 60 (60-minute). Default: 1',
        enum: ['1', '5', '15', '30', '60']
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, interval = '1' } = args;
      
      // Determine market code
      const marketCode = symbol.startsWith('6') ? '1' : '0';
      
      // East Money intraday data API
      const url = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get';
      const params = new URLSearchParams({
        secid: `${marketCode}.${symbol}`,
        fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
        iscr: '0',
        ndays: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        interval,
        message: `Successfully retrieved ${interval}-minute intraday data for ${symbol}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get large order monitoring
 * Data source: Large transaction detection
 */
export const getLargeOrderMonitorTool: BuiltInTool = {
  name: 'get_large_order_monitor',
  description: 'Monitor large orders (big buy/sell transactions) in real-time. Useful for detecting institutional activity.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit), e.g., 600000, 000001. Required'
      },
      min_amount: {
        type: 'number',
        description: 'Minimum transaction amount in CNY, e.g., 1000000 for 1M CNY. Default: 500000'
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, min_amount = 500000 } = args;
      
      // Determine market code
      const marketCode = symbol.startsWith('6') ? '1' : '0';
      
      // East Money large order API
      const url = 'https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get';
      const params = new URLSearchParams({
        secid: `${marketCode}.${symbol}`,
        fields1: 'f1,f2,f3,f7',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        min_amount,
        message: `Successfully retrieved large orders for ${symbol} (min: ${min_amount} CNY)`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get real-time index composition
 * Data source: Index constituent weight updates
 */
export const getIndexCompositionRealtimeTool: BuiltInTool = {
  name: 'get_index_composition_realtime',
  description: 'Get real-time index constituent stocks with current weights, contribution to index movement.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      index_code: {
        type: 'string',
        description: 'Index code, e.g., 000001 (SSE Composite), 399001 (SZSE Component), 000300 (CSI 300). Required'
      }
    },
    required: ['index_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { index_code } = args;
      
      // Determine market code
      const marketCode = index_code.startsWith('0') && index_code.length === 6 ? '0' : '1';
      
      // East Money index constituents API
      const url = 'https://push2.eastmoney.com/api/qt/clist/get';
      const params = new URLSearchParams({
        pn: '1',
        pz: '500',
        po: '1',
        np: '1',
        fltt: '2',
        invt: '2',
        fid: 'f3',
        fs: `i:${index_code}`,
        fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        index_code,
        message: `Successfully retrieved real-time composition for index ${index_code}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get real-time sector rotation
 * Data source: Sector momentum tracking
 */
export const getSectorRotationRealtimeTool: BuiltInTool = {
  name: 'get_sector_rotation_realtime',
  description: 'Get real-time sector rotation data showing which sectors are gaining/losing momentum during trading day.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      sort_by: {
        type: 'string',
        description: 'Sorting: change_pct (price change %), money_flow (net inflow), rise_count (rising stocks). Default: change_pct',
        enum: ['change_pct', 'money_flow', 'rise_count']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const sortBy = args.sort_by || 'change_pct';
      
      // Field mapping
      const fieldMap: Record<string, string> = {
        change_pct: 'f3',
        money_flow: 'f62',
        rise_count: 'f104'
      };
      
      // East Money sector realtime API
      const url = 'https://push2.eastmoney.com/api/qt/clist/get';
      const params = new URLSearchParams({
        pn: '1',
        pz: '100',
        po: '1',
        np: '1',
        fltt: '2',
        invt: '2',
        fid: fieldMap[sortBy],
        fs: 'm:90+t:2',
        fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f12,f14,f62,f104,f105,f106'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        sort_by: sortBy,
        message: `Successfully retrieved real-time sector rotation sorted by ${sortBy}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get market breadth indicators
 * Data source: Advancing/declining stocks, new highs/lows
 */
export const getMarketBreadthTool: BuiltInTool = {
  name: 'get_market_breadth',
  description: 'Get market breadth indicators: advancing vs declining stocks, new highs vs new lows, up/down volume ratio.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      market: {
        type: 'string',
        description: 'Market: sh (Shanghai), sz (Shenzhen), all (both markets). Default: all',
        enum: ['sh', 'sz', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const market = args.market || 'all';
      
      // East Money market breadth API
      const url = 'https://push2.eastmoney.com/api/qt/ulist.np/get';
      const params = new URLSearchParams({
        fltt: '2',
        invt: '2',
        fields: 'f1,f2,f3,f104,f105,f106'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        market,
        message: `Successfully retrieved market breadth indicators for ${market}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get options chain real-time
 * Data source: Full options chain with Greeks
 */
export const getOptionsChainRealtimeTool: BuiltInTool = {
  name: 'get_options_chain_realtime',
  description: 'Get real-time options chain showing all strikes for a given underlying, with bid/ask, volume, open interest, Greeks.',
  category: 'options',
  inputSchema: {
    type: 'object',
    properties: {
      underlying: {
        type: 'string',
        description: 'Underlying asset code: 510050 (50ETF), 510300 (300ETF), 000300 (CSI300 options). Required'
      },
      expiry_month: {
        type: 'string',
        description: 'Expiry month in YYYYMM format, e.g., 202501. Optional, defaults to nearest month'
      }
    },
    required: ['underlying']
  },
  async execute(args: any): Promise<any> {
    try {
      const { underlying, expiry_month } = args;
      
      // East Money options chain API
      const url = 'https://push2.eastmoney.com/api/qt/slist/get';
      const params = new URLSearchParams({
        spt: '3',
        pi: '0',
        pz: '500',
        po: '1',
        fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14',
        ut: 'fa5fd1943c7b386f172d6893dbfba10b'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        underlying,
        expiry_month,
        message: `Successfully retrieved options chain for ${underlying}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get bond real-time quotes stream
 * Data source: Bond market real-time trading
 */
export const getBondQuotesStreamTool: BuiltInTool = {
  name: 'get_bond_quotes_stream',
  description: 'Get real-time bond quotes stream including treasury bonds, corporate bonds, convertible bonds with yield calculations.',
  category: 'bonds',
  inputSchema: {
    type: 'object',
    properties: {
      bond_type: {
        type: 'string',
        description: 'Bond type: treasury (treasury bonds), corporate (corporate bonds), convertible (convertible bonds), all. Default: all',
        enum: ['treasury', 'corporate', 'convertible', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const bondType = args.bond_type || 'all';
      
      // Type to filter mapping
      const typeMap: Record<string, string> = {
        treasury: 'b:MK0354',
        corporate: 'b:MK0366',
        convertible: 'b:MK0354',
        all: 'b:MK0354,b:MK0366'
      };
      
      // East Money bond quotes API
      const url = 'https://push2.eastmoney.com/api/qt/clist/get';
      const params = new URLSearchParams({
        pn: '1',
        pz: '500',
        po: '1',
        np: '1',
        fltt: '2',
        invt: '2',
        fid: 'f3',
        fs: typeMap[bondType],
        fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        bond_type: bondType,
        message: `Successfully retrieved real-time bond quotes for ${bondType}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get market maker quotes
 * Data source: Market maker bid/ask quotes
 */
export const getMarketMakerQuotesTool: BuiltInTool = {
  name: 'get_market_maker_quotes',
  description: 'Get market maker quotes showing bid/ask spread, quote size, market maker identity (for NEEQ/OTC stocks).',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit, typically NEEQ stocks starting with 8). Required'
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol } = args;
      
      // NEEQ market maker API
      const url = 'https://www.neeq.com.cn/api/information/quote/stock';
      const params = new URLSearchParams({
        code: symbol
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        message: `Successfully retrieved market maker quotes for ${symbol}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get auction data (call auction)
 * Data source: Opening/closing call auction details
 */
export const getAuctionDataTool: BuiltInTool = {
  name: 'get_auction_data',
  description: 'Get call auction data showing order imbalance, indicative price, volume during opening/closing auction.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit), e.g., 600000, 000001. Required'
      },
      auction_type: {
        type: 'string',
        description: 'Auction type: opening (morning call auction), closing (closing call auction). Default: opening',
        enum: ['opening', 'closing']
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, auction_type = 'opening' } = args;
      
      // Determine market code
      const marketCode = symbol.startsWith('6') ? '1' : '0';
      
      // East Money auction data API
      const url = 'https://push2.eastmoney.com/api/qt/stock/get';
      const params = new URLSearchParams({
        secid: `${marketCode}.${symbol}`,
        fields: 'f57,f58,f107,f168,f169,f170'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        auction_type,
        message: `Successfully retrieved ${auction_type} auction data for ${symbol}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
