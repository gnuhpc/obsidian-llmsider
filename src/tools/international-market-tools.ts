// International market data tools
// Provides US/HK market advanced data: earnings calendars, institutional holdings, ADR data, splits, etc.
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get US stock earnings calendar
 * Data source: US earnings announcement schedule
 */
export const getUSEarningsCalendarTool: BuiltInTool = {
  name: 'get_us_earnings_calendar',
  description: 'Get US stock earnings announcement calendar showing upcoming earnings dates, estimated EPS, actual EPS.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format, e.g., 2024-01-01. Optional, defaults to today'
      },
      end_date: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format, e.g., 2024-12-31. Optional, defaults to 7 days from start'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const startDate = args.start_date || new Date().toISOString().split('T')[0];
      const endDate = args.end_date || '';
      
      // East Money US earnings calendar API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_US_EARNINGS_CALENDAR',
        columns: 'ALL',
        sortColumns: 'REPORT_DATE',
        sortTypes: '1',
        pageSize: '100',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        start_date: startDate,
        end_date: endDate,
        message: `Successfully retrieved US earnings calendar from ${startDate}`
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
 * Get US stock institutional holdings
 * Data source: 13F filings institutional holdings
 */
export const getUSInstitutionalHoldingsTool: BuiltInTool = {
  name: 'get_us_institutional_holdings',
  description: 'Get US stock institutional holdings from 13F filings showing top holders, shares held, changes.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'US stock ticker symbol, e.g., AAPL, TSLA, GOOGL. Required'
      },
      quarter: {
        type: 'string',
        description: 'Quarter in YYYYQN format, e.g., 2024Q2. Optional, defaults to latest'
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, quarter } = args;
      
      // East Money US institutional holdings API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_US_INSTITUTIONAL_HOLDING',
        columns: 'ALL',
        filter: `(SECURITY_CODE="${symbol}")`,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: '50',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        quarter: quarter || 'latest',
        message: `Successfully retrieved US institutional holdings for ${symbol}`
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
 * Get US insider trading activity
 * Data source: SEC Form 4 insider transactions
 */
export const getUSInsiderTradingTool: BuiltInTool = {
  name: 'get_us_insider_trading',
  description: 'Get US stock insider trading from Form 4 filings showing executive buys/sells, transaction dates, prices.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'US stock ticker symbol, e.g., AAPL, TSLA. Optional, if not provided returns all recent insider trades'
      },
      days: {
        type: 'number',
        description: 'Number of days to look back. Default: 30'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, days = 30 } = args;
      
      // East Money US insider trading API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_US_INSIDER_TRADE',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '100',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all',
        days,
        message: `Successfully retrieved US insider trading for ${symbol || 'all stocks'}`
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
 * Get US dividend calendar
 * Data source: US stock dividend announcement and payment schedule
 */
export const getUSDividendCalendarTool: BuiltInTool = {
  name: 'get_us_dividend_calendar',
  description: 'Get US stock dividend calendar showing ex-dividend dates, payment dates, dividend amounts, yields.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Month in YYYY-MM format, e.g., 2024-06. Optional, defaults to current month'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const month = args.month || new Date().toISOString().slice(0, 7);
      
      // East Money US dividend calendar API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_US_DIVIDEND_CALENDAR',
        columns: 'ALL',
        sortColumns: 'EX_DIVIDEND_DATE',
        sortTypes: '1',
        pageSize: '200',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        month,
        message: `Successfully retrieved US dividend calendar for ${month}`
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
 * Get ADR (American Depositary Receipt) data
 * Data source: ADR listings and conversion ratios
 */
export const getADRDataTool: BuiltInTool = {
  name: 'get_adr_data',
  description: 'Get ADR (American Depositary Receipt) data including conversion ratios, underlying stock info, arbitrage opportunities.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      country: {
        type: 'string',
        description: 'Country filter: china, all. Default: all',
        enum: ['china', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const country = args.country || 'all';
      
      // East Money ADR data API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_ADR_LIST',
        columns: 'ALL',
        sortColumns: 'MARKET_VALUE',
        sortTypes: '-1',
        pageSize: '100',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        country,
        message: `Successfully retrieved ADR data for ${country}`
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
 * Get US premarket and afterhours quotes
 * Data source: Extended hours trading data
 */
export const getUSExtendedHoursQuotesTool: BuiltInTool = {
  name: 'get_us_extended_hours_quotes',
  description: 'Get US stock premarket and afterhours trading quotes showing extended hours price, volume, changes.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'US stock ticker symbol, e.g., AAPL, TSLA. Required'
      },
      session: {
        type: 'string',
        description: 'Trading session: premarket, afterhours, both. Default: both',
        enum: ['premarket', 'afterhours', 'both']
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, session = 'both' } = args;
      
      // Sina US extended hours API
      const url = `https://hq.sinajs.cn/list=gb_${symbol.toLowerCase()}`;

      const response = await requestUrl({
        url: url,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        symbol,
        session,
        message: `Successfully retrieved extended hours quotes for ${symbol}`
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
 * Get US stock splits calendar
 * Data source: Stock split announcements and effective dates
 */
export const getUSStockSplitsCalendarTool: BuiltInTool = {
  name: 'get_us_stock_splits_calendar',
  description: 'Get US stock splits calendar showing split ratios, announcement dates, effective dates.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      year: {
        type: 'string',
        description: 'Year in YYYY format, e.g., 2024. Optional, defaults to current year'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const year = args.year || new Date().getFullYear().toString();
      
      // East Money US stock splits API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_US_STOCK_SPLIT',
        columns: 'ALL',
        sortColumns: 'SPLIT_DATE',
        sortTypes: '-1',
        pageSize: '100',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        year,
        message: `Successfully retrieved US stock splits calendar for ${year}`
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
 * Get HK stock connect (Southbound) quota usage
 * Data source: Southbound Trading quota monitoring
 */
export const getHKConnectQuotaUsageTool: BuiltInTool = {
  name: 'get_hk_connect_quota_usage',
  description: 'Get Hong Kong Stock Connect (Southbound Trading) daily quota usage and remaining quota.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'Number of days to retrieve. Default: 30'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const days = args.days || 30;
      
      // East Money HK Connect quota API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_MUTUAL_QUOTA_STAT',
        columns: 'ALL',
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: String(days),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        days,
        message: `Successfully retrieved HK Connect quota usage for ${days} days`
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
 * Get HK stock IPO calendar
 * Data source: Hong Kong IPO listings schedule
 */
export const getHKIPOCalendarTool: BuiltInTool = {
  name: 'get_hk_ipo_calendar',
  description: 'Get Hong Kong stock IPO calendar showing listing dates, offer prices, subscription details.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'IPO status: upcoming, recent, all. Default: all',
        enum: ['upcoming', 'recent', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const status = args.status || 'all';
      
      // East Money HK IPO calendar API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_HK_IPO_LIST',
        columns: 'ALL',
        sortColumns: 'LISTING_DATE',
        sortTypes: '-1',
        pageSize: '50',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        status,
        message: `Successfully retrieved HK IPO calendar (${status})`
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
 * Get HK stock major shareholders
 * Data source: Hong Kong substantial shareholder notices
 */
export const getHKMajorShareholdersTool: BuiltInTool = {
  name: 'get_hk_major_shareholders',
  description: 'Get Hong Kong stock major shareholders from substantial shareholder notices (5%+ holdings).',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'HK stock code (5-digit), e.g., 00700 for Tencent. Required'
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol } = args;
      
      // East Money HK major shareholders API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_HK_MAJOR_SHAREHOLDER',
        columns: 'ALL',
        filter: `(SECURITY_CODE="${symbol}")`,
        sortColumns: 'NOTICE_DATE',
        sortTypes: '-1',
        pageSize: '50',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        message: `Successfully retrieved HK major shareholders for ${symbol}`
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
 * Get HK stock warrant data
 * Data source: Hong Kong warrants market data
 */
export const getHKWarrantDataTool: BuiltInTool = {
  name: 'get_hk_warrant_data',
  description: 'Get Hong Kong warrant (cbbc/warrant) data including strike prices, expiry dates, leverage ratios.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      underlying: {
        type: 'string',
        description: 'Underlying stock code (5-digit), e.g., 00700. Optional, returns all if not specified'
      },
      type: {
        type: 'string',
        description: 'Warrant type: call, put, cbbc (callable bull/bear contracts), all. Default: all',
        enum: ['call', 'put', 'cbbc', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { underlying, type = 'all' } = args;
      
      // East Money HK warrant API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = underlying ? `(UNDERLYING_CODE="${underlying}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_HK_WARRANT_LIST',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'VOLUME',
        sortTypes: '-1',
        pageSize: '100',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        underlying: underlying || 'all',
        type,
        message: `Successfully retrieved HK warrant data for ${underlying || 'all stocks'}`
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
 * Get US conference call schedule
 * Data source: Upcoming earnings conference calls
 */
export const getUSConferenceCallScheduleTool: BuiltInTool = {
  name: 'get_us_conference_call_schedule',
  description: 'Get US stock earnings conference call schedule with dates, times, dial-in information.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      days_ahead: {
        type: 'number',
        description: 'Number of days ahead to look. Default: 14'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const daysAhead = args.days_ahead || 14;
      
      // East Money US conference call API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_US_CONFERENCE_CALL',
        columns: 'ALL',
        sortColumns: 'CALL_DATE',
        sortTypes: '1',
        pageSize: '100',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        days_ahead: daysAhead,
        message: `Successfully retrieved US conference call schedule for next ${daysAhead} days`
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
 * Get US analyst estimates consensus
 * Data source: Analyst consensus estimates for revenue, EPS, etc.
 */
export const getUSAnalystEstimatesTool: BuiltInTool = {
  name: 'get_us_analyst_estimates',
  description: 'Get US stock analyst consensus estimates showing revenue, EPS, growth forecasts with estimate ranges.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'US stock ticker symbol, e.g., AAPL, TSLA. Required'
      },
      metric: {
        type: 'string',
        description: 'Metric type: revenue, eps, growth, all. Default: all',
        enum: ['revenue', 'eps', 'growth', 'all']
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, metric = 'all' } = args;
      
      // East Money US analyst estimates API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_US_ANALYST_ESTIMATE',
        columns: 'ALL',
        filter: `(SECURITY_CODE="${symbol}")`,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: '20',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        metric,
        message: `Successfully retrieved US analyst estimates for ${symbol}`
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
 * Get HK stock buyback announcements
 * Data source: Hong Kong stock buyback program announcements
 */
export const getHKBuybackAnnouncementsTool: BuiltInTool = {
  name: 'get_hk_buyback_announcements',
  description: 'Get Hong Kong stock buyback announcements showing buyback amounts, progress, dates.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'HK stock code (5-digit). Optional, returns all recent buybacks if not specified'
      },
      days: {
        type: 'number',
        description: 'Number of days to look back. Default: 90'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, days = 90 } = args;
      
      // East Money HK buyback API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_HK_BUYBACK',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'ANNOUNCEMENT_DATE',
        sortTypes: '-1',
        pageSize: '100',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all',
        days,
        message: `Successfully retrieved HK buyback announcements for ${symbol || 'all stocks'}`
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
 * Get global market indices realtime
 * Data source: Major global stock indices
 */
export const getGlobalIndicesRealtimeTool: BuiltInTool = {
  name: 'get_global_indices_realtime',
  description: 'Get realtime quotes for major global stock indices: Dow Jones, S&P 500, Nasdaq, FTSE, DAX, Nikkei, etc.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      region: {
        type: 'string',
        description: 'Region filter: us, europe, asia, all. Default: all',
        enum: ['us', 'europe', 'asia', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const region = args.region || 'all';
      
      // East Money global indices API
      const url = 'https://push2.eastmoney.com/api/qt/clist/get';
      const params = new URLSearchParams({
        pn: '1',
        pz: '100',
        po: '1',
        np: '1',
        fltt: '2',
        invt: '2',
        fid: 'f3',
        fs: 'm:100+t:1,m:100+t:3,m:100+t:5',
        fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        region,
        message: `Successfully retrieved global indices for ${region}`
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
 * Get US options expiration calendar
 * Data source: US stock options expiration dates
 */
export const getUSOptionsExpirationCalendarTool: BuiltInTool = {
  name: 'get_us_options_expiration_calendar',
  description: 'Get US stock options expiration calendar showing monthly and weekly expiration dates.',
  category: 'options',
  inputSchema: {
    type: 'object',
    properties: {
      year: {
        type: 'string',
        description: 'Year in YYYY format, e.g., 2024. Optional, defaults to current year'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const year = args.year || new Date().getFullYear().toString();
      
      // Calculate options expiration dates (3rd Friday of each month)
      const expirations = [];
      for (let month = 0; month < 12; month++) {
        const firstDay = new Date(parseInt(year), month, 1);
        const firstFriday = firstDay.getDay() === 5 ? 1 : (12 - firstDay.getDay()) % 7 + 1;
        const thirdFriday = firstDay.getDate() + firstFriday + 14;
        expirations.push({
          month: month + 1,
          expiration_date: `${year}-${String(month + 1).padStart(2, '0')}-${String(thirdFriday).padStart(2, '0')}`,
          type: 'monthly'
        });
      }

      return {
        success: true,
        data: expirations,
        year,
        message: `Successfully generated US options expiration calendar for ${year}`
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
 * Get HK stock short selling data
 * Data source: Hong Kong short selling turnover
 */
export const getHKShortSellingDataTool: BuiltInTool = {
  name: 'get_hk_short_selling_data',
  description: 'Get Hong Kong stock short selling data showing short turnover, short percentage of total turnover.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'HK stock code (5-digit). Optional, returns all if not specified'
      },
      days: {
        type: 'number',
        description: 'Number of days to retrieve. Default: 30'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, days = 30 } = args;
      
      // East Money HK short selling API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_HK_SHORT_SELLING',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: String(days),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all',
        days,
        message: `Successfully retrieved HK short selling data for ${symbol || 'all stocks'}`
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
 * Get AH premium/discount tracking
 * Data source: A-share vs H-share price differential
 */
export const getAHPremiumTrackingTool: BuiltInTool = {
  name: 'get_ah_premium_tracking',
  description: 'Get A-share vs H-share premium/discount tracking for dual-listed stocks showing price differences.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      sort_by: {
        type: 'string',
        description: 'Sort by: premium_rate (highest premium first), volume (highest volume), all. Default: premium_rate',
        enum: ['premium_rate', 'volume', 'market_cap']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const sortBy = args.sort_by || 'premium_rate';
      
      // East Money AH premium API
      const url = 'https://push2.eastmoney.com/api/qt/clist/get';
      const params = new URLSearchParams({
        pn: '1',
        pz: '100',
        po: '1',
        np: '1',
        fltt: '2',
        invt: '2',
        fid: 'f3',
        fs: 'm:0+t:3,m:1+t:3',
        fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f288'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        sort_by: sortBy,
        message: `Successfully retrieved AH premium tracking sorted by ${sortBy}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
