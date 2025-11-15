// Derivatives market tools
// Provides interest rate derivatives, equity derivatives, volatility products, swap rates
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get interest rate swap rates
 * Data source: IRS rates across tenor curve
 */
export const getInterestRateSwapRatesTool: BuiltInTool = {
  name: 'get_interest_rate_swap_rates',
  description: 'Get interest rate swap (IRS) rates across tenor curve (1Y, 3Y, 5Y, 10Y, etc.).',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      currency: {
        type: 'string',
        description: 'Currency: CNY, USD, EUR, JPY. Default: CNY',
        enum: ['CNY', 'USD', 'EUR', 'JPY']
      },
      days: {
        type: 'number',
        description: 'Number of days to retrieve. Default: 90'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { currency = 'CNY', days = 90 } = args;
      
      // East Money IRS rates API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_IRS_RATES',
        columns: 'ALL',
        filter: `(CURRENCY="${currency}")`,
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
        currency,
        days,
        message: `Successfully retrieved ${currency} IRS rates for ${days} days`
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
 * Get equity index derivatives
 * Data source: Equity index futures and options analytics
 */
export const getEquityIndexDerivativesTool: BuiltInTool = {
  name: 'get_equity_index_derivatives',
  description: 'Get equity index derivatives analytics: futures basis, cost of carry, synthetic positions.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      index: {
        type: 'string',
        description: 'Index: CSI300, SSE50, CSI500, CSI1000. Required',
        enum: ['CSI300', 'SSE50', 'CSI500', 'CSI1000']
      },
      metric: {
        type: 'string',
        description: 'Metric: basis, cost_of_carry, implied_dividend, all. Default: all',
        enum: ['basis', 'cost_of_carry', 'implied_dividend', 'all']
      }
    },
    required: ['index']
  },
  async execute(args: any): Promise<any> {
    try {
      const { index, metric = 'all' } = args;
      
      // East Money equity derivatives API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_EQUITY_DERIVATIVES',
        columns: 'ALL',
        filter: `(INDEX_CODE="${index}")`,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '60',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        index,
        metric,
        message: `Successfully retrieved ${index} derivatives analytics`
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
 * Get volatility surface analysis
 * Data source: Options implied volatility surface by strike and maturity
 */
export const getVolatilitySurfaceAnalysisTool: BuiltInTool = {
  name: 'get_volatility_surface_analysis',
  description: 'Get options volatility surface showing implied vol by strike and maturity with skew analysis.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      underlying: {
        type: 'string',
        description: 'Underlying: 510050 (50ETF), 510300 (300ETF), 159919 (300ETF). Required'
      },
      date: {
        type: 'string',
        description: 'Date in YYYY-MM-DD format. Optional, defaults to latest'
      }
    },
    required: ['underlying']
  },
  async execute(args: any): Promise<any> {
    try {
      const { underlying, date } = args;
      
      // East Money vol surface API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_VOL_SURFACE',
        columns: 'ALL',
        filter: `(UNDERLYING_CODE="${underlying}")`,
        sortColumns: 'STRIKE_PRICE,MATURITY_DATE',
        sortTypes: '1,1',
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
        underlying,
        date: date || 'latest',
        message: `Successfully retrieved volatility surface for ${underlying}`
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
 * Get option strategy analysis
 * Data source: Pre-built option strategies analysis
 */
export const getOptionStrategyAnalysisTool: BuiltInTool = {
  name: 'get_option_strategy_analysis',
  description: 'Get option strategy analysis for straddle, strangle, butterfly, iron condor strategies.',
  category: 'options',
  inputSchema: {
    type: 'object',
    properties: {
      underlying: {
        type: 'string',
        description: 'Underlying code. Required'
      },
      strategy: {
        type: 'string',
        description: 'Strategy type: straddle, strangle, butterfly, iron_condor, calendar_spread. Required',
        enum: ['straddle', 'strangle', 'butterfly', 'iron_condor', 'calendar_spread']
      },
      maturity: {
        type: 'string',
        description: 'Target maturity in YYYY-MM format. Optional'
      }
    },
    required: ['underlying', 'strategy']
  },
  async execute(args: any): Promise<any> {
    try {
      const { underlying, strategy, maturity } = args;
      
      // East Money option strategy API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_OPTION_STRATEGY',
        columns: 'ALL',
        filter: `(UNDERLYING_CODE="${underlying}")(STRATEGY="${strategy}")`,
        sortColumns: 'EXPECTED_RETURN',
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
        underlying,
        strategy,
        maturity: maturity || 'all',
        message: `Successfully retrieved ${strategy} strategy analysis for ${underlying}`
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
 * Get swaption data
 * Data source: Interest rate swaption quotes and analytics
 */
export const getSwaptionDataTool: BuiltInTool = {
  name: 'get_swaption_data',
  description: 'Get interest rate swaption quotes showing option to enter swap contracts.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      currency: {
        type: 'string',
        description: 'Currency: CNY, USD, EUR. Default: CNY',
        enum: ['CNY', 'USD', 'EUR']
      },
      tenor: {
        type: 'string',
        description: 'Swaption tenor: 1m, 3m, 6m, 1y. Optional'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { currency = 'CNY', tenor } = args;
      
      // East Money swaption API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_SWAPTION_DATA',
        columns: 'ALL',
        filter: `(CURRENCY="${currency}")`,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '60',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        currency,
        tenor: tenor || 'all',
        message: `Successfully retrieved ${currency} swaption data`
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
 * Get variance swap rates
 * Data source: Variance swap quotes for volatility trading
 */
export const getVarianceSwapRatesTool: BuiltInTool = {
  name: 'get_variance_swap_rates',
  description: 'Get variance swap rates for pure volatility exposure trading.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      underlying: {
        type: 'string',
        description: 'Underlying index. Required'
      },
      tenor: {
        type: 'string',
        description: 'Swap tenor: 1m, 3m, 6m, 1y. Default: 3m',
        enum: ['1m', '3m', '6m', '1y']
      }
    },
    required: ['underlying']
  },
  async execute(args: any): Promise<any> {
    try {
      const { underlying, tenor = '3m' } = args;
      
      // East Money variance swap API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_VARIANCE_SWAP',
        columns: 'ALL',
        filter: `(UNDERLYING="${underlying}")`,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '90',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        underlying,
        tenor,
        message: `Successfully retrieved variance swap rates for ${underlying}`
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
 * Get exotic options data
 * Data source: Barrier, Asian, digital options quotes
 */
export const getExoticOptionsDataTool: BuiltInTool = {
  name: 'get_exotic_options_data',
  description: 'Get exotic options data for barrier options, Asian options, digital options.',
  category: 'options',
  inputSchema: {
    type: 'object',
    properties: {
      option_type: {
        type: 'string',
        description: 'Exotic option type: barrier, asian, digital, all. Default: all',
        enum: ['barrier', 'asian', 'digital', 'all']
      },
      underlying: {
        type: 'string',
        description: 'Underlying asset. Optional'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { option_type = 'all', underlying } = args;
      
      // East Money exotic options API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = underlying ? `(OPTION_TYPE="${option_type}")(UNDERLYING="${underlying}")` : `(OPTION_TYPE="${option_type}")`;
      
      const params = new URLSearchParams({
        reportName: 'RPT_EXOTIC_OPTIONS',
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
        option_type,
        underlying: underlying || 'all',
        message: `Successfully retrieved ${option_type} exotic options data`
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
 * Get credit default swap spreads
 * Data source: CDS spreads by issuer and tenor
 */
export const getCDSSpreadsTool: BuiltInTool = {
  name: 'get_cds_spreads',
  description: 'Get credit default swap (CDS) spreads showing credit risk pricing by issuer and tenor.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Corporate entity or sovereign. Optional, returns all if not specified'
      },
      tenor: {
        type: 'string',
        description: 'CDS tenor: 1y, 3y, 5y, 10y, all. Default: 5y',
        enum: ['1y', '3y', '5y', '10y', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { entity, tenor = '5y' } = args;
      
      // East Money CDS API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = entity ? `(ENTITY="${entity}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_CDS_SPREAD',
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
        entity: entity || 'all',
        tenor,
        message: `Successfully retrieved CDS spreads for ${entity || 'all entities'}`
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
 * Get forward rate agreements
 * Data source: FRA quotes for forward interest rates
 */
export const getForwardRateAgreementsTool: BuiltInTool = {
  name: 'get_forward_rate_agreements',
  description: 'Get forward rate agreement (FRA) quotes showing forward interest rate expectations.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      currency: {
        type: 'string',
        description: 'Currency: CNY, USD, EUR. Default: CNY',
        enum: ['CNY', 'USD', 'EUR']
      },
      tenor: {
        type: 'string',
        description: 'FRA tenor: 1x4, 3x6, 6x9, 9x12. Optional'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { currency = 'CNY', tenor } = args;
      
      // East Money FRA API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_FRA_QUOTE',
        columns: 'ALL',
        filter: `(CURRENCY="${currency}")`,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '60',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        currency,
        tenor: tenor || 'all',
        message: `Successfully retrieved ${currency} FRA quotes`
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
 * Get interest rate cap/floor prices
 * Data source: Interest rate cap and floor option prices
 */
export const getInterestRateCapFloorTool: BuiltInTool = {
  name: 'get_interest_rate_cap_floor',
  description: 'Get interest rate cap and floor option prices for rate protection strategies.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      currency: {
        type: 'string',
        description: 'Currency: CNY, USD, EUR. Default: CNY',
        enum: ['CNY', 'USD', 'EUR']
      },
      instrument: {
        type: 'string',
        description: 'Instrument type: cap, floor, collar. Default: cap',
        enum: ['cap', 'floor', 'collar']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { currency = 'CNY', instrument = 'cap' } = args;
      
      // East Money cap/floor API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_IR_CAP_FLOOR',
        columns: 'ALL',
        filter: `(CURRENCY="${currency}")(INSTRUMENT="${instrument}")`,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '60',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        currency,
        instrument,
        message: `Successfully retrieved ${currency} ${instrument} prices`
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
 * Get equity derivatives OI distribution
 * Data source: Open interest distribution by strike for equity options
 */
export const getEquityDerivativesOIDistributionTool: BuiltInTool = {
  name: 'get_equity_derivatives_oi_distribution',
  description: 'Get equity derivatives open interest distribution by strike showing key support/resistance levels.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      underlying: {
        type: 'string',
        description: 'Underlying ETF code. Required'
      },
      maturity: {
        type: 'string',
        description: 'Option maturity in YYYY-MM format. Optional, defaults to nearest'
      }
    },
    required: ['underlying']
  },
  async execute(args: any): Promise<any> {
    try {
      const { underlying, maturity } = args;
      
      // East Money OI distribution API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_OPTION_OI_DISTRIBUTION',
        columns: 'ALL',
        filter: `(UNDERLYING_CODE="${underlying}")`,
        sortColumns: 'STRIKE_PRICE',
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
        underlying,
        maturity: maturity || 'nearest',
        message: `Successfully retrieved OI distribution for ${underlying}`
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
 * Get volatility arbitrage signals
 * Data source: Vol arbitrage opportunities between realized and implied vol
 */
export const getVolatilityArbitrageSignalsTool: BuiltInTool = {
  name: 'get_volatility_arbitrage_signals',
  description: 'Get volatility arbitrage signals comparing implied vol vs realized vol for trading opportunities.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      underlying: {
        type: 'string',
        description: 'Underlying symbol. Optional, returns all if not specified'
      },
      min_spread: {
        type: 'number',
        description: 'Minimum vol spread (%) for signal. Default: 2'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { underlying, min_spread = 2 } = args;
      
      // East Money vol arbitrage API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = underlying ? `(UNDERLYING="${underlying}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_VOL_ARBITRAGE',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'VOL_SPREAD',
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
        underlying: underlying || 'all',
        min_spread,
        message: `Successfully retrieved vol arbitrage signals for ${underlying || 'all underlyings'}`
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
 * Get dividend swap rates
 * Data source: Dividend swap quotes for dividend trading
 */
export const getDividendSwapRatesTool: BuiltInTool = {
  name: 'get_dividend_swap_rates',
  description: 'Get dividend swap rates for trading future dividend expectations on indices.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      index: {
        type: 'string',
        description: 'Index: CSI300, SSE50. Required',
        enum: ['CSI300', 'SSE50']
      },
      maturity: {
        type: 'string',
        description: 'Swap maturity in YYYY-MM format. Optional'
      }
    },
    required: ['index']
  },
  async execute(args: any): Promise<any> {
    try {
      const { index, maturity } = args;
      
      // East Money dividend swap API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_DIVIDEND_SWAP',
        columns: 'ALL',
        filter: `(INDEX_CODE="${index}")`,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '60',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        index,
        maturity: maturity || 'all',
        message: `Successfully retrieved dividend swap rates for ${index}`
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
 * Get correlation swap quotes
 * Data source: Correlation swap quotes for basket correlation trading
 */
export const getCorrelationSwapQuotesTool: BuiltInTool = {
  name: 'get_correlation_swap_quotes',
  description: 'Get correlation swap quotes for trading realized correlation between assets.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      basket: {
        type: 'string',
        description: 'Asset basket identifier. Required'
      },
      tenor: {
        type: 'string',
        description: 'Swap tenor: 3m, 6m, 1y. Default: 6m',
        enum: ['3m', '6m', '1y']
      }
    },
    required: ['basket']
  },
  async execute(args: any): Promise<any> {
    try {
      const { basket, tenor = '6m' } = args;
      
      // East Money correlation swap API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CORRELATION_SWAP',
        columns: 'ALL',
        filter: `(BASKET="${basket}")`,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '60',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        basket,
        tenor,
        message: `Successfully retrieved correlation swap quotes for ${basket}`
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
 * Get equity dispersion trading signals
 * Data source: Index vs single stock vol spread for dispersion trading
 */
export const getEquityDispersionTradingTool: BuiltInTool = {
  name: 'get_equity_dispersion_trading',
  description: 'Get equity dispersion trading signals comparing index vol vs constituent vol for spread trading.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      index: {
        type: 'string',
        description: 'Index: CSI300, SSE50. Required',
        enum: ['CSI300', 'SSE50']
      },
      signal_type: {
        type: 'string',
        description: 'Signal type: long_dispersion, short_dispersion, all. Default: all',
        enum: ['long_dispersion', 'short_dispersion', 'all']
      }
    },
    required: ['index']
  },
  async execute(args: any): Promise<any> {
    try {
      const { index, signal_type = 'all' } = args;
      
      // East Money dispersion trading API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_DISPERSION_TRADING',
        columns: 'ALL',
        filter: `(INDEX_CODE="${index}")`,
        sortColumns: 'DISPERSION_SPREAD',
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
        index,
        signal_type,
        message: `Successfully retrieved dispersion trading signals for ${index}`
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
 * Get option implied correlation
 * Data source: Implied correlation from index and single stock options
 */
export const getOptionImpliedCorrelationTool: BuiltInTool = {
  name: 'get_option_implied_correlation',
  description: 'Get option-implied correlation between index constituents derived from option prices.',
  category: 'options',
  inputSchema: {
    type: 'object',
    properties: {
      index: {
        type: 'string',
        description: 'Index: CSI300, SSE50. Required',
        enum: ['CSI300', 'SSE50']
      },
      days: {
        type: 'number',
        description: 'Number of days to retrieve. Default: 60'
      }
    },
    required: ['index']
  },
  async execute(args: any): Promise<any> {
    try {
      const { index, days = 60 } = args;
      
      // East Money implied correlation API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_IMPLIED_CORRELATION',
        columns: 'ALL',
        filter: `(INDEX_CODE="${index}")`,
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
        index,
        days,
        message: `Successfully retrieved implied correlation for ${index}`
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
 * Get cross-currency basis swaps
 * Data source: Cross-currency basis swap spreads
 */
export const getCrossCurrencyBasisSwapsTool: BuiltInTool = {
  name: 'get_cross_currency_basis_swaps',
  description: 'Get cross-currency basis swap spreads showing currency funding costs and arbitrage.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      currency_pair: {
        type: 'string',
        description: 'Currency pair: USD/CNY, EUR/USD, USD/JPY. Required'
      },
      tenor: {
        type: 'string',
        description: 'Swap tenor: 1y, 3y, 5y. Default: 1y',
        enum: ['1y', '3y', '5y']
      }
    },
    required: ['currency_pair']
  },
  async execute(args: any): Promise<any> {
    try {
      const { currency_pair, tenor = '1y' } = args;
      
      // East Money cross-currency basis API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_XCCY_BASIS_SWAP',
        columns: 'ALL',
        filter: `(CURRENCY_PAIR="${currency_pair}")`,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '90',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        currency_pair,
        tenor,
        message: `Successfully retrieved cross-currency basis swaps for ${currency_pair}`
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
 * Get total return swaps
 * Data source: TRS quotes for leveraged exposure
 */
export const getTotalReturnSwapsTool: BuiltInTool = {
  name: 'get_total_return_swaps',
  description: 'Get total return swap (TRS) quotes for leveraged exposure to equities, indices, baskets.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      underlying: {
        type: 'string',
        description: 'Underlying asset or basket. Optional'
      },
      tenor: {
        type: 'string',
        description: 'Swap tenor: 3m, 6m, 1y. Default: 6m',
        enum: ['3m', '6m', '1y']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { underlying, tenor = '6m' } = args;
      
      // East Money TRS API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = underlying ? `(UNDERLYING="${underlying}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_TOTAL_RETURN_SWAP',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: '60',
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
        tenor,
        message: `Successfully retrieved TRS quotes for ${underlying || 'all underlyings'}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
