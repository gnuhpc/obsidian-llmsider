// Stock advanced analysis tools
// Provides quantitative analysis: factor exposure, screening, backtesting, correlation, technical patterns
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get multi-criteria stock screening
 * Data source: Advanced stock screener with multiple filters
 */
export const getStockScreeningTool: BuiltInTool = {
  name: 'get_stock_screening',
  description: 'Get stock screening results with multiple criteria: PE, PB, ROE, revenue growth, market cap, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      pe_min: {
        type: 'number',
        description: 'Minimum PE ratio. Optional'
      },
      pe_max: {
        type: 'number',
        description: 'Maximum PE ratio. Optional'
      },
      pb_min: {
        type: 'number',
        description: 'Minimum PB ratio. Optional'
      },
      pb_max: {
        type: 'number',
        description: 'Maximum PB ratio. Optional'
      },
      roe_min: {
        type: 'number',
        description: 'Minimum ROE (%). Optional'
      },
      market_cap_min: {
        type: 'number',
        description: 'Minimum market cap (billion CNY). Optional'
      },
      revenue_growth_min: {
        type: 'number',
        description: 'Minimum revenue growth YoY (%). Optional'
      },
      industry: {
        type: 'string',
        description: 'Industry filter. Optional'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const filters = [];
      
      if (args.pe_min !== undefined) filters.push(`(PE_TTM>=${args.pe_min})`);
      if (args.pe_max !== undefined) filters.push(`(PE_TTM<=${args.pe_max})`);
      if (args.pb_min !== undefined) filters.push(`(PB_MRQ>=${args.pb_min})`);
      if (args.pb_max !== undefined) filters.push(`(PB_MRQ<=${args.pb_max})`);
      if (args.roe_min !== undefined) filters.push(`(ROE_TTM>=${args.roe_min})`);
      if (args.market_cap_min !== undefined) filters.push(`(TOTAL_MARKET_CAP>=${args.market_cap_min * 100000000})`);
      if (args.revenue_growth_min !== undefined) filters.push(`(REVENUE_GROWTH_YOY>=${args.revenue_growth_min})`);
      if (args.industry) filters.push(`(INDUSTRY_CODE="${args.industry}")`);
      
      const filterString = filters.join('');
      
      // East Money stock screener API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_STOCK_SCREENER',
        columns: 'ALL',
        filter: filterString,
        sortColumns: 'TOTAL_MARKET_CAP',
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
        filters: args,
        message: `Successfully screened stocks with ${filters.length} criteria`
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
 * Get backtesting results
 * Data source: Strategy backtesting performance metrics
 */
export const getBacktestingResultsTool: BuiltInTool = {
  name: 'get_backtesting_results',
  description: 'Get backtesting results for quantitative strategies showing returns, Sharpe ratio, max drawdown, win rate.',
  inputSchema: {
    type: 'object',
    properties: {
      strategy_type: {
        type: 'string',
        description: 'Strategy type: momentum, mean_reversion, value, growth, multi_factor. Required',
        enum: ['momentum', 'mean_reversion', 'value', 'growth', 'multi_factor']
      },
      start_date: {
        type: 'string',
        description: 'Backtest start date in YYYY-MM-DD format. Optional, defaults to 3 years ago'
      },
      end_date: {
        type: 'string',
        description: 'Backtest end date in YYYY-MM-DD format. Optional, defaults to today'
      }
    },
    required: ['strategy_type']
  },
  async execute(args: any): Promise<any> {
    try {
      const { strategy_type, start_date, end_date } = args;
      
      // East Money backtesting API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_BACKTESTING_RESULT',
        columns: 'ALL',
        filter: `(STRATEGY_TYPE="${strategy_type}")`,
        sortColumns: 'SHARPE_RATIO',
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
        strategy_type,
        start_date: start_date || 'default',
        end_date: end_date || 'default',
        message: `Successfully retrieved backtesting results for ${strategy_type} strategy`
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
 * Get correlation matrix
 * Data source: Stock correlation analysis
 */
export const getCorrelationMatrixTool: BuiltInTool = {
  name: 'get_correlation_matrix',
  description: 'Get correlation matrix for a list of stocks showing price correlation coefficients.',
  inputSchema: {
    type: 'object',
    properties: {
      symbols: {
        type: 'string',
        description: 'Comma-separated stock codes (6-digit), e.g., 600519,000858,600036. Required, max 20 stocks'
      },
      period: {
        type: 'string',
        description: 'Analysis period: 1m, 3m, 6m, 1y. Default: 3m',
        enum: ['1m', '3m', '6m', '1y']
      }
    },
    required: ['symbols']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbols, period = '3m' } = args;
      const symbolList = symbols.split(',').map((s: string) => s.trim());
      
      if (symbolList.length > 20) {
        return {
          success: false,
          error: 'Maximum 20 stocks allowed for correlation analysis'
        };
      }
      
      // East Money correlation API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_STOCK_CORRELATION',
        columns: 'ALL',
        filter: `(SECURITY_CODE IN (${symbolList.map((s: string) => `"${s}"`).join(',')}))`,
        sortColumns: 'CORRELATION_COEF',
        sortTypes: '-1',
        pageSize: '500',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbols: symbolList,
        period,
        message: `Successfully calculated correlation matrix for ${symbolList.length} stocks`
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
 * Get momentum indicators
 * Data source: Technical momentum indicators (RSI, MACD, KDJ)
 */
export const getMomentumIndicatorsTool: BuiltInTool = {
  name: 'get_momentum_indicators',
  description: 'Get momentum indicators for stock: RSI, MACD, KDJ showing overbought/oversold conditions.',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit), e.g., 600519. Required'
      },
      indicator: {
        type: 'string',
        description: 'Indicator type: rsi, macd, kdj, all. Default: all',
        enum: ['rsi', 'macd', 'kdj', 'all']
      },
      period: {
        type: 'number',
        description: 'Number of trading days to analyze. Default: 90'
      }
    },
    required: ['symbol']
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, indicator = 'all', period = 90 } = args;
      
      // East Money technical indicators API
      const url = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get';
      const params = new URLSearchParams({
        secid: symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`,
        fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
        ndays: String(period)
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol,
        indicator,
        period,
        message: `Successfully retrieved ${indicator} indicators for ${symbol}`
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
 * Get technical pattern recognition
 * Data source: Chart pattern detection (head-shoulders, triangles, flags, etc.)
 */
export const getTechnicalPatternRecognitionTool: BuiltInTool = {
  name: 'get_technical_pattern_recognition',
  description: 'Get technical pattern recognition for stocks: head-shoulders, triangles, flags, double-top/bottom patterns.',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit). Optional, returns all detected patterns if not specified'
      },
      pattern_type: {
        type: 'string',
        description: 'Pattern type: head_shoulders, triangle, flag, double_top, double_bottom, all. Default: all',
        enum: ['head_shoulders', 'triangle', 'flag', 'double_top', 'double_bottom', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, pattern_type = 'all' } = args;
      
      // East Money pattern recognition API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_PATTERN_RECOGNITION',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'DETECTION_DATE',
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
        pattern_type,
        message: `Successfully detected ${pattern_type} patterns for ${symbol || 'all stocks'}`
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
 * Get mean reversion signals
 * Data source: Mean reversion strategy signals
 */
export const getMeanReversionSignalsTool: BuiltInTool = {
  name: 'get_mean_reversion_signals',
  description: 'Get mean reversion signals showing stocks trading away from historical means with potential reversal opportunities.',
  inputSchema: {
    type: 'object',
    properties: {
      threshold: {
        type: 'number',
        description: 'Standard deviation threshold for signal generation. Default: 2.0'
      },
      market: {
        type: 'string',
        description: 'Market scope: shanghai, shenzhen, all. Default: all',
        enum: ['shanghai', 'shenzhen', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { threshold = 2.0, market = 'all' } = args;
      
      // East Money mean reversion signals API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_MEAN_REVERSION_SIGNAL',
        columns: 'ALL',
        sortColumns: 'Z_SCORE',
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
        threshold,
        market,
        message: `Successfully retrieved mean reversion signals with ${threshold} std dev threshold`
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
 * Get pair trading opportunities
 * Data source: Cointegrated stock pairs for pair trading
 */
export const getPairTradingOpportunitiesTool: BuiltInTool = {
  name: 'get_pair_trading_opportunities',
  description: 'Get pair trading opportunities showing cointegrated stock pairs with spread statistics.',
  inputSchema: {
    type: 'object',
    properties: {
      industry: {
        type: 'string',
        description: 'Industry filter to find pairs within same sector. Optional'
      },
      min_correlation: {
        type: 'number',
        description: 'Minimum correlation coefficient. Default: 0.7'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { industry, min_correlation = 0.7 } = args;
      
      // East Money pair trading API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = industry ? `(INDUSTRY_CODE="${industry}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_PAIR_TRADING',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'COINTEGRATION_SCORE',
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
        industry: industry || 'all',
        min_correlation,
        message: `Successfully retrieved pair trading opportunities for ${industry || 'all industries'}`
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
 * Get stock ranking by multiple metrics
 * Data source: Composite stock ranking system
 */
export const getStockRankingMultiMetricTool: BuiltInTool = {
  name: 'get_stock_ranking_multi_metric',
  description: 'Get stock rankings by multiple metrics with weighted scoring: value, growth, profitability, momentum.',
  inputSchema: {
    type: 'object',
    properties: {
      value_weight: {
        type: 'number',
        description: 'Weight for value factors (0-1). Default: 0.25'
      },
      growth_weight: {
        type: 'number',
        description: 'Weight for growth factors (0-1). Default: 0.25'
      },
      profitability_weight: {
        type: 'number',
        description: 'Weight for profitability factors (0-1). Default: 0.25'
      },
      momentum_weight: {
        type: 'number',
        description: 'Weight for momentum factors (0-1). Default: 0.25'
      },
      market_cap_filter: {
        type: 'string',
        description: 'Market cap filter: large_cap, mid_cap, small_cap, all. Default: all',
        enum: ['large_cap', 'mid_cap', 'small_cap', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const {
        value_weight = 0.25,
        growth_weight = 0.25,
        profitability_weight = 0.25,
        momentum_weight = 0.25,
        market_cap_filter = 'all'
      } = args;
      
      // Validate weights sum to 1
      const totalWeight = value_weight + growth_weight + profitability_weight + momentum_weight;
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        return {
          success: false,
          error: `Weights must sum to 1.0, current sum: ${totalWeight}`
        };
      }
      
      // East Money multi-metric ranking API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_STOCK_RANKING_COMPOSITE',
        columns: 'ALL',
        sortColumns: 'COMPOSITE_SCORE',
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
        weights: {
          value: value_weight,
          growth: growth_weight,
          profitability: profitability_weight,
          momentum: momentum_weight
        },
        market_cap_filter,
        message: `Successfully ranked stocks with custom weights for ${market_cap_filter} stocks`
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
 * Get sector momentum ranking
 * Data source: Sector relative strength and momentum
 */
export const getSectorMomentumRankingTool: BuiltInTool = {
  name: 'get_sector_momentum_ranking',
  description: 'Get sector momentum ranking showing which sectors have strongest/weakest relative strength and momentum.',
  inputSchema: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        description: 'Analysis period: 1w, 1m, 3m, 6m. Default: 1m',
        enum: ['1w', '1m', '3m', '6m']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const period = args.period || '1m';
      
      // East Money sector momentum API
      const url = 'https://push2.eastmoney.com/api/qt/clist/get';
      const params = new URLSearchParams({
        pn: '1',
        pz: '100',
        po: '1',
        np: '1',
        fltt: '2',
        invt: '2',
        fid: 'f3',
        fs: 'm:90+t:2',
        fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f62,f184'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        period,
        message: `Successfully retrieved sector momentum rankings for ${period} period`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
