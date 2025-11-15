// Fund detailed data tools
// Provides comprehensive fund analysis including manager performance, fund flows, ETF tracking, allocation indices
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get fund manager performance and ranking
 * Data source: East Money fund manager ranking API
 */
export const getFundManagerPerformanceTool: BuiltInTool = {
  name: 'get_fund_manager_performance',
  description: 'Get fund manager performance ranking and statistics. Returns manager name, managed funds, total assets, average return, ranking, etc.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      sort_by: {
        type: 'string',
        description: 'Sorting field: return_1y (1-year return), return_3y (3-year return), return_5y (5-year return), total_asset (total managed assets), fund_count (number of funds). Default: return_1y',
        enum: ['return_1y', 'return_3y', 'return_5y', 'total_asset', 'fund_count']
      },
      fund_type: {
        type: 'string',
        description: 'Fund type filter: all (all types), equity (equity funds), bond (bond funds), hybrid (hybrid funds), index (index funds). Default: all',
        enum: ['all', 'equity', 'bond', 'hybrid', 'index']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const sortBy = args.sort_by || 'return_1y';
      const fundType = args.fund_type || 'all';
      
      // East Money fund manager ranking API
      const url = 'https://fund.eastmoney.com/Data/FundDataPortfolio_Interface.aspx';
      const params = new URLSearchParams({
        dt: '14',
        mc: 'returnjson',
        ft: fundType,
        pn: '50',
        pi: '1',
        sc: sortBy
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        message: `Successfully retrieved fund manager performance data sorted by ${sortBy}`
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
 * Get fund flow data (subscription and redemption)
 * Data source: East Money fund flow statistics
 */
export const getFundFlowTool: BuiltInTool = {
  name: 'get_fund_flow',
  description: 'Get fund subscription and redemption flow data. Returns daily/weekly/monthly fund flows, net subscription amount, flow trends.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code), e.g., 110022 for Yi Fangda Consumer Industry. Required'
      },
      period: {
        type: 'string',
        description: 'Time period: daily, weekly, monthly. Default: daily',
        enum: ['daily', 'weekly', 'monthly']
      },
      start_date: {
        type: 'string',
        description: 'Start date in YYYYMMDD format, e.g., 20240101. Optional'
      },
      end_date: {
        type: 'string',
        description: 'End date in YYYYMMDD format, e.g., 20241231. Optional'
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code, period = 'daily', start_date, end_date } = args;
      
      // East Money fund flow API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'jjjz',
        code: fund_code,
        sdate: start_date || '',
        edate: end_date || '',
        per: period === 'weekly' ? '2' : period === 'monthly' ? '3' : '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        period,
        message: `Successfully retrieved ${period} fund flow data for ${fund_code}`
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
 * Get ETF real-time tracking data
 * Data source: East Money ETF tracking API
 */
export const getETFTrackingTool: BuiltInTool = {
  name: 'get_etf_tracking',
  description: 'Get ETF real-time tracking data including tracking error, premium/discount rate, fund flow, constituents changes.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      etf_code: {
        type: 'string',
        description: 'ETF code (6-digit code), e.g., 510300 for 300ETF, 510050 for 50ETF. Required'
      }
    },
    required: ['etf_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { etf_code } = args;
      
      // East Money ETF tracking API
      const url = 'https://push2.eastmoney.com/api/qt/stock/get';
      const params = new URLSearchParams({
        secid: `1.${etf_code}`,
        fields: 'f57,f58,f107,f152,f43,f46,f47,f48,f60,f170,f168,f169,f162'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        etf_code,
        message: `Successfully retrieved ETF tracking data for ${etf_code}`
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
 * Get fund allocation index data
 * Data source: East Money fund allocation analysis
 */
export const getFundAllocationIndexTool: BuiltInTool = {
  name: 'get_fund_allocation_index',
  description: 'Get fund asset allocation index including stock position, bond position, cash position, sector allocation, style exposure.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code). Required'
      },
      report_date: {
        type: 'string',
        description: 'Report date in YYYYMMDD format, e.g., 20240630 for Q2 2024. Optional, defaults to latest'
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code, report_date } = args;
      
      // East Money fund allocation API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'zcpz',
        code: fund_code,
        topline: '10',
        year: report_date ? report_date.substring(0, 4) : ''
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        report_date,
        message: `Successfully retrieved fund allocation index for ${fund_code}`
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
 * Get fund performance comparison
 * Data source: East Money fund comparison tool
 */
export const getFundComparisonTool: BuiltInTool = {
  name: 'get_fund_comparison',
  description: 'Compare performance metrics of multiple funds including returns, volatility, Sharpe ratio, max drawdown, etc.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_codes: {
        type: 'string',
        description: 'Comma-separated fund codes, e.g., "110022,163406,000001". Required, max 5 funds'
      },
      period: {
        type: 'string',
        description: 'Comparison period: 1m (1 month), 3m (3 months), 6m (6 months), 1y (1 year), 3y (3 years), 5y (5 years), all (since inception). Default: 1y',
        enum: ['1m', '3m', '6m', '1y', '3y', '5y', 'all']
      }
    },
    required: ['fund_codes']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_codes, period = '1y' } = args;
      const codes = fund_codes.split(',').map((c: string) => c.trim()).slice(0, 5);
      
      // East Money fund comparison API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const results = [];
      
      for (const code of codes) {
        const params = new URLSearchParams({
          type: 'lsjz',
          code: code,
          per: '20'
        });
        
        const response = await requestUrl({
          url: `${url}?${params.toString()}`,
          method: 'GET'
        });
        
        results.push({
          fund_code: code,
          data: response.text
        });
      }

      return {
        success: true,
        data: results,
        period,
        message: `Successfully retrieved comparison data for ${codes.length} funds`
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
 * Get fund fee structure
 * Data source: East Money fund fee information
 */
export const getFundFeesTool: BuiltInTool = {
  name: 'get_fund_fees',
  description: 'Get fund fee structure including subscription fee, redemption fee, management fee, custodian fee, sales service fee.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code). Required'
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code } = args;
      
      // East Money fund fee API
      const url = `https://fundf10.eastmoney.com/jjfl_${fund_code}.html`;

      const response = await requestUrl({
        url: url,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        message: `Successfully retrieved fund fee structure for ${fund_code}`
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
 * Get fund risk metrics
 * Data source: East Money fund risk analysis
 */
export const getFundRiskMetricsTool: BuiltInTool = {
  name: 'get_fund_risk_metrics',
  description: 'Get fund risk metrics including volatility, beta, Sharpe ratio, maximum drawdown, Value at Risk (VaR), downside risk.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code). Required'
      },
      period: {
        type: 'string',
        description: 'Analysis period: 1y (1 year), 3y (3 years), 5y (5 years). Default: 1y',
        enum: ['1y', '3y', '5y']
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code, period = '1y' } = args;
      
      // East Money fund risk metrics API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'ftjj',
        code: fund_code
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        period,
        message: `Successfully retrieved fund risk metrics for ${fund_code}`
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
 * Get fund style analysis
 * Data source: East Money fund style classification
 */
export const getFundStyleAnalysisTool: BuiltInTool = {
  name: 'get_fund_style_analysis',
  description: 'Get fund investment style analysis including growth/value orientation, large/mid/small cap exposure, sector preferences.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code). Required'
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code } = args;
      
      // East Money fund style API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'tzfg',
        code: fund_code
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        message: `Successfully retrieved fund style analysis for ${fund_code}`
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
 * Get fund company ranking
 * Data source: East Money fund company statistics
 */
export const getFundCompanyRankingTool: BuiltInTool = {
  name: 'get_fund_company_ranking',
  description: 'Get fund company ranking by total assets, fund count, average performance, investor count.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      sort_by: {
        type: 'string',
        description: 'Sorting field: total_asset (total managed assets), fund_count (number of funds), avg_return (average return), investor_count (total investors). Default: total_asset',
        enum: ['total_asset', 'fund_count', 'avg_return', 'investor_count']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const sortBy = args.sort_by || 'total_asset';
      
      // East Money fund company ranking API
      const url = 'https://fund.eastmoney.com/Company/default.html';

      const response = await requestUrl({
        url: url,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        sort_by: sortBy,
        message: `Successfully retrieved fund company ranking sorted by ${sortBy}`
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
 * Get ETF arbitrage opportunities
 * Data source: ETF arbitrage monitoring
 */
export const getETFArbitrageTool: BuiltInTool = {
  name: 'get_etf_arbitrage',
  description: 'Get ETF arbitrage opportunities based on premium/discount rate. Returns ETF code, premium rate, arbitrage profit estimate.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      min_premium: {
        type: 'number',
        description: 'Minimum premium rate threshold (%), e.g., 0.5 for 0.5% premium. Default: 0.3'
      },
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
      const minPremium = args.min_premium || 0.3;
      const market = args.market || 'all';
      
      // East Money ETF arbitrage API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_ETF_LISTVALUE',
        columns: 'ALL',
        filter: `(PREMIUM_RT>=${minPremium})`,
        sortColumns: 'PREMIUM_RT',
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
        min_premium: minPremium,
        market,
        message: `Successfully retrieved ETF arbitrage opportunities with premium >= ${minPremium}%`
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
 * Get LOF arbitrage opportunities
 * Data source: LOF (Listed Open-ended Fund) premium/discount monitoring
 */
export const getLOFArbitrageTool: BuiltInTool = {
  name: 'get_lof_arbitrage',
  description: 'Get LOF (Listed Open-ended Fund) arbitrage opportunities based on premium/discount rate between market price and NAV.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      min_discount: {
        type: 'number',
        description: 'Minimum discount rate threshold (%), e.g., -2 for 2% discount. Default: -1.5'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const minDiscount = args.min_discount || -1.5;
      
      // East Money LOF arbitrage API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_LOF_LISTVALUE',
        columns: 'ALL',
        filter: `(PREMIUM_RT<=${minDiscount})`,
        sortColumns: 'PREMIUM_RT',
        sortTypes: '1',
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
        min_discount: minDiscount,
        message: `Successfully retrieved LOF arbitrage opportunities with discount >= ${Math.abs(minDiscount)}%`
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
 * Get fund portfolio turnover rate
 * Data source: East Money fund turnover statistics
 */
export const getFundTurnoverRateTool: BuiltInTool = {
  name: 'get_fund_turnover_rate',
  description: 'Get fund portfolio turnover rate indicating trading frequency. High turnover may indicate active management style.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code). Required'
      },
      report_date: {
        type: 'string',
        description: 'Report date in YYYYMMDD format. Optional, defaults to latest'
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code, report_date } = args;
      
      // East Money fund turnover API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'cwzb',
        code: fund_code,
        year: report_date ? report_date.substring(0, 4) : ''
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        report_date,
        message: `Successfully retrieved fund turnover rate for ${fund_code}`
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
 * Get fund manager change history
 * Data source: East Money fund manager history
 */
export const getFundManagerHistoryTool: BuiltInTool = {
  name: 'get_fund_manager_history',
  description: 'Get fund manager change history including appointment dates, departure dates, tenure returns for each manager.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code). Required'
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code } = args;
      
      // East Money fund manager history API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'jjjl',
        code: fund_code
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        message: `Successfully retrieved fund manager history for ${fund_code}`
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
 * Get sector fund ranking
 * Data source: East Money sector fund performance
 */
export const getSectorFundRankingTool: BuiltInTool = {
  name: 'get_sector_fund_ranking',
  description: 'Get sector/theme fund ranking by performance. Includes technology, healthcare, consumption, finance, real estate sector funds.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      sector: {
        type: 'string',
        description: 'Sector/theme: technology, healthcare, consumption, finance, real_estate, energy, materials, military, new_energy, semiconductor. Required'
      },
      period: {
        type: 'string',
        description: 'Performance period: 1w (1 week), 1m (1 month), 3m (3 months), 6m (6 months), 1y (1 year), 3y (3 years). Default: 1m',
        enum: ['1w', '1m', '3m', '6m', '1y', '3y']
      }
    },
    required: ['sector']
  },
  async execute(args: any): Promise<any> {
    try {
      const { sector, period = '1m' } = args;
      
      // Sector to category ID mapping
      const sectorMap: Record<string, string> = {
        technology: '001',
        healthcare: '002',
        consumption: '003',
        finance: '004',
        real_estate: '005',
        energy: '006',
        materials: '007',
        military: '008',
        new_energy: '009',
        semiconductor: '010'
      };
      
      const categoryId = sectorMap[sector] || '001';
      
      // East Money sector fund API
      const url = 'https://fund.eastmoney.com/data/FundGuideapi.aspx';
      const params = new URLSearchParams({
        dt: '0',
        ft: 'all',
        sd: '',
        ed: '',
        sc: period,
        st: 'desc',
        pi: '1',
        pn: '50',
        zf: 'all',
        sh: 'list'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        sector,
        period,
        message: `Successfully retrieved ${sector} sector fund ranking for ${period}`
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
 * Get fund benchmark comparison
 * Data source: Fund vs benchmark performance
 */
export const getFundBenchmarkComparisonTool: BuiltInTool = {
  name: 'get_fund_benchmark_comparison',
  description: 'Compare fund performance against its benchmark index. Returns excess returns, tracking error, information ratio.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code). Required'
      },
      period: {
        type: 'string',
        description: 'Comparison period: 1y (1 year), 3y (3 years), 5y (5 years), all (since inception). Default: 1y',
        enum: ['1y', '3y', '5y', 'all']
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code, period = '1y' } = args;
      
      // East Money fund benchmark comparison API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'zldb',
        code: fund_code
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        period,
        message: `Successfully retrieved fund benchmark comparison for ${fund_code}`
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
 * Get QDII fund currency exposure
 * Data source: QDII fund foreign currency allocation
 */
export const getQDIICurrencyExposureTool: BuiltInTool = {
  name: 'get_qdii_currency_exposure',
  description: 'Get QDII fund currency exposure showing USD, EUR, HKD, JPY allocation percentages and currency risk.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'QDII fund code (6-digit code). Required'
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code } = args;
      
      // East Money QDII currency exposure API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'zcpz',
        code: fund_code
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        message: `Successfully retrieved QDII currency exposure for ${fund_code}`
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
 * Get fund seasonal holdings change
 * Data source: Quarter-over-quarter holdings comparison
 */
export const getFundHoldingsChangeTool: BuiltInTool = {
  name: 'get_fund_holdings_change',
  description: 'Get quarter-over-quarter fund holdings changes showing added/reduced/new/cleared positions.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code). Required'
      },
      report_date: {
        type: 'string',
        description: 'Report date in YYYYMMDD format, e.g., 20240630. Optional, defaults to latest quarter'
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code, report_date } = args;
      
      // East Money fund holdings change API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'ccmx',
        code: fund_code,
        topline: '50',
        year: report_date ? report_date.substring(0, 4) : ''
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        report_date,
        message: `Successfully retrieved fund holdings changes for ${fund_code}`
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
 * Get money market fund 7-day yield ranking
 * Data source: Money market fund yield comparison
 */
export const getMoneyFundYieldRankingTool: BuiltInTool = {
  name: 'get_money_fund_yield_ranking',
  description: 'Get money market fund 7-day annualized yield ranking. Useful for cash management fund selection.',
  category: 'bonds',
  inputSchema: {
    type: 'object',
    properties: {
      min_scale: {
        type: 'number',
        description: 'Minimum fund scale in billions of CNY, e.g., 10 for 10 billion. Default: 1'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const minScale = args.min_scale || 1;
      
      // East Money money fund yield ranking API
      const url = 'https://fund.eastmoney.com/data/FundGuideapi.aspx';
      const params = new URLSearchParams({
        dt: '0',
        ft: 'hb',
        sd: '',
        ed: '',
        sc: '7ry',
        st: 'desc',
        pi: '1',
        pn: '100',
        zf: 'all',
        sh: 'list'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        min_scale: minScale,
        message: `Successfully retrieved money fund yield ranking with min scale ${minScale}B CNY`
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
 * Get fund shareholder concentration
 * Data source: Fund investor structure and concentration
 */
export const getFundShareholderConcentrationTool: BuiltInTool = {
  name: 'get_fund_shareholder_concentration',
  description: 'Get fund shareholder concentration showing institutional vs retail investor proportions, top 10 holders percentage.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      fund_code: {
        type: 'string',
        description: 'Fund code (6-digit code). Required'
      }
    },
    required: ['fund_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_code } = args;
      
      // East Money fund shareholder concentration API
      const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx';
      const params = new URLSearchParams({
        type: 'gmjg',
        code: fund_code
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.text,
        fund_code,
        message: `Successfully retrieved fund shareholder concentration for ${fund_code}`
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
 * Get smart beta ETF metrics
 * Data source: Smart beta strategy ETF performance tracking
 */
export const getSmartBetaETFMetricsTool: BuiltInTool = {
  name: 'get_smart_beta_etf_metrics',
  description: 'Get smart beta ETF metrics including factor exposure (value, growth, momentum, quality, low volatility), tracking efficiency.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      strategy: {
        type: 'string',
        description: 'Smart beta strategy: value, growth, momentum, quality, low_volatility, dividend, equal_weight. Default: all',
        enum: ['all', 'value', 'growth', 'momentum', 'quality', 'low_volatility', 'dividend', 'equal_weight']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const strategy = args.strategy || 'all';
      
      // East Money smart beta ETF API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_ETF_LISTVALUE',
        columns: 'ALL',
        sortColumns: 'TOTAL_NETASSET',
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
        strategy,
        message: `Successfully retrieved smart beta ETF metrics for ${strategy} strategy`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
