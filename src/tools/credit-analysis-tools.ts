// Credit analysis tools
// Provides credit ratings, default probability, credit spreads
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get credit ratings history
 * Data source: Credit rating changes and history
 */
export const getCreditRatingsHistoryTool: BuiltInTool = {
  name: 'get_credit_ratings_history',
  description: 'Get credit ratings history showing rating changes from major agencies (Moody\'s, S&P, Fitch).',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Corporate entity or bond issuer. Required'
      },
      agency: {
        type: 'string',
        description: 'Rating agency: moodys, sp, fitch, all. Default: all',
        enum: ['moodys', 'sp', 'fitch', 'dagong', 'all']
      }
    },
    required: ['entity']
  },
  async execute(args: any): Promise<any> {
    try {
      const { entity, agency = 'all' } = args;
      
      // East Money credit rating API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CREDIT_RATING_HISTORY',
        columns: 'ALL',
        filter: `(ENTITY_NAME="${entity}")`,
        sortColumns: 'RATING_DATE',
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
        entity,
        agency,
        message: `Successfully retrieved credit ratings history for ${entity}`
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
 * Get rating transition matrix
 * Data source: Probability of rating migrations
 */
export const getRatingTransitionMatrixTool: BuiltInTool = {
  name: 'get_rating_transition_matrix',
  description: 'Get rating transition matrix showing probability of rating upgrades/downgrades.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      time_horizon: {
        type: 'number',
        description: 'Time horizon in years (1, 3, 5). Default: 1'
      },
      industry: {
        type: 'string',
        description: 'Industry sector. Optional, all if not specified'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { time_horizon = 1, industry } = args;
      
      // East Money rating transition API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = industry ? `(INDUSTRY="${industry}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_RATING_TRANSITION',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
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
        time_horizon,
        industry: industry || 'all',
        message: `Successfully retrieved rating transition matrix for ${time_horizon}Y`
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
 * Get default probability
 * Data source: Probability of default (PD) estimates
 */
export const getDefaultProbabilityTool: BuiltInTool = {
  name: 'get_default_probability',
  description: 'Get probability of default (PD) estimates from structural and reduced-form models.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Corporate entity. Required'
      },
      model: {
        type: 'string',
        description: 'Model type: merton, kmv, cds_implied, all. Default: all',
        enum: ['merton', 'kmv', 'cds_implied', 'all']
      },
      horizon: {
        type: 'number',
        description: 'Time horizon in years. Default: 1'
      }
    },
    required: ['entity']
  },
  async execute(args: any): Promise<any> {
    try {
      const { entity, model = 'all', horizon = 1 } = args;
      
      // East Money default probability API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_DEFAULT_PROBABILITY',
        columns: 'ALL',
        filter: `(ENTITY_NAME="${entity}")`,
        sortColumns: 'CALC_DATE',
        sortTypes: '-1',
        pageSize: '30',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        entity,
        model,
        horizon,
        message: `Successfully retrieved default probability for ${entity}`
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
 * Get credit spread analysis
 * Data source: Credit spreads over benchmarks
 */
export const getCreditSpreadAnalysisTool: BuiltInTool = {
  name: 'get_credit_spread_analysis',
  description: 'Get credit spread analysis showing spread over government bonds.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      bond_code: {
        type: 'string',
        description: 'Bond code. Required'
      },
      benchmark: {
        type: 'string',
        description: 'Benchmark: treasury, swap, all. Default: treasury',
        enum: ['treasury', 'swap', 'all']
      }
    },
    required: ['bond_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { bond_code, benchmark = 'treasury' } = args;
      
      // East Money credit spread API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CREDIT_SPREAD',
        columns: 'ALL',
        filter: `(BOND_CODE="${bond_code}")`,
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
        bond_code,
        benchmark,
        message: `Successfully retrieved credit spread analysis for ${bond_code}`
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
 * Get recovery rates
 * Data source: Historical recovery rates by seniority
 */
export const getRecoveryRatesTool: BuiltInTool = {
  name: 'get_recovery_rates',
  description: 'Get recovery rates by debt seniority and industry in default scenarios.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      seniority: {
        type: 'string',
        description: 'Debt seniority: senior_secured, senior_unsecured, subordinated, all. Default: all',
        enum: ['senior_secured', 'senior_unsecured', 'subordinated', 'all']
      },
      industry: {
        type: 'string',
        description: 'Industry sector. Optional'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { seniority = 'all', industry } = args;
      
      // East Money recovery rates API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = industry ? `(INDUSTRY="${industry}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_RECOVERY_RATE',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'DEFAULT_DATE',
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
        seniority,
        industry: industry || 'all',
        message: `Successfully retrieved recovery rates for ${seniority}`
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
 * Get covenant analysis
 * Data source: Bond covenants and restrictions
 */
export const getCovenantAnalysisTool: BuiltInTool = {
  name: 'get_covenant_analysis',
  description: 'Get bond covenant analysis including financial covenants and restrictions.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      bond_code: {
        type: 'string',
        description: 'Bond code. Required'
      }
    },
    required: ['bond_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { bond_code } = args;
      
      // East Money covenant analysis API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_BOND_COVENANT',
        columns: 'ALL',
        filter: `(BOND_CODE="${bond_code}")`,
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
        bond_code,
        message: `Successfully retrieved covenant analysis for ${bond_code}`
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
 * Get debt structure analysis
 * Data source: Corporate debt composition and maturity profile
 */
export const getDebtStructureAnalysisTool: BuiltInTool = {
  name: 'get_debt_structure_analysis',
  description: 'Get debt structure analysis showing debt composition, maturity profile, currency mix.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Corporate entity. Required'
      }
    },
    required: ['entity']
  },
  async execute(args: any): Promise<any> {
    try {
      const { entity } = args;
      
      // East Money debt structure API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_DEBT_STRUCTURE',
        columns: 'ALL',
        filter: `(ENTITY_NAME="${entity}")`,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: '10',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        entity,
        message: `Successfully retrieved debt structure analysis for ${entity}`
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
 * Get credit event history
 * Data source: Default, restructuring, covenant breach events
 */
export const getCreditEventHistoryTool: BuiltInTool = {
  name: 'get_credit_event_history',
  description: 'Get credit event history including defaults, restructurings, covenant breaches.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Corporate entity. Optional, returns all if not specified'
      },
      event_type: {
        type: 'string',
        description: 'Event type: default, restructuring, covenant_breach, all. Default: all',
        enum: ['default', 'restructuring', 'covenant_breach', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { entity, event_type = 'all' } = args;
      
      // East Money credit event API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = entity ? `(ENTITY_NAME="${entity}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_CREDIT_EVENT',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'EVENT_DATE',
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
        event_type,
        message: `Successfully retrieved credit event history for ${entity || 'all entities'}`
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
 * Get bankruptcy prediction model
 * Data source: Altman Z-score and other bankruptcy models
 */
export const getBankruptcyPredictionTool: BuiltInTool = {
  name: 'get_bankruptcy_prediction',
  description: 'Get bankruptcy prediction scores using Altman Z-score and Ohlson O-score models.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      stock_code: {
        type: 'string',
        description: 'Stock code. Required'
      },
      model: {
        type: 'string',
        description: 'Model: altman_z, ohlson_o, merton, all. Default: all',
        enum: ['altman_z', 'ohlson_o', 'merton', 'all']
      }
    },
    required: ['stock_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { stock_code, model = 'all' } = args;
      
      // East Money bankruptcy prediction API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_BANKRUPTCY_PREDICTION',
        columns: 'ALL',
        filter: `(SECURITY_CODE="${stock_code}")`,
        sortColumns: 'CALC_DATE',
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
        stock_code,
        model,
        message: `Successfully retrieved bankruptcy prediction for ${stock_code}`
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
 * Get distressed debt analysis
 * Data source: Distressed bonds trading below par
 */
export const getDistressedDebtAnalysisTool: BuiltInTool = {
  name: 'get_distressed_debt_analysis',
  description: 'Get distressed debt analysis for bonds trading at deep discounts.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      max_price: {
        type: 'number',
        description: 'Maximum price (% of par, e.g., 70). Default: 70'
      },
      industry: {
        type: 'string',
        description: 'Industry sector. Optional'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { max_price = 70, industry } = args;
      
      // East Money distressed debt API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = industry ? `(INDUSTRY="${industry}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_DISTRESSED_DEBT',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'CURRENT_PRICE',
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
        max_price,
        industry: industry || 'all',
        message: `Successfully retrieved distressed debt analysis`
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
 * Get credit portfolio analytics
 * Data source: Portfolio credit risk metrics
 */
export const getCreditPortfolioAnalyticsTool: BuiltInTool = {
  name: 'get_credit_portfolio_analytics',
  description: 'Get credit portfolio analytics including diversification, concentration, expected loss.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Required'
      }
    },
    required: ['portfolio_id']
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id } = args;
      
      // East Money credit portfolio API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CREDIT_PORTFOLIO',
        columns: 'ALL',
        filter: `(PORTFOLIO_ID="${portfolio_id}")`,
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
        portfolio_id,
        message: `Successfully retrieved credit portfolio analytics for ${portfolio_id}`
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
 * Get counterparty credit risk
 * Data source: Counterparty default risk and exposure
 */
export const getCounterpartyCreditRiskTool: BuiltInTool = {
  name: 'get_counterparty_credit_risk',
  description: 'Get counterparty credit risk including exposure and credit valuation adjustment (CVA).',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      counterparty: {
        type: 'string',
        description: 'Counterparty name. Required'
      }
    },
    required: ['counterparty']
  },
  async execute(args: any): Promise<any> {
    try {
      const { counterparty } = args;
      
      // East Money counterparty credit risk API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_COUNTERPARTY_CREDIT',
        columns: 'ALL',
        filter: `(COUNTERPARTY="${counterparty}")`,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: '30',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        counterparty,
        message: `Successfully retrieved counterparty credit risk for ${counterparty}`
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
 * Get sovereign credit analysis
 * Data source: Sovereign credit ratings and risk
 */
export const getSovereignCreditAnalysisTool: BuiltInTool = {
  name: 'get_sovereign_credit_analysis',
  description: 'Get sovereign credit analysis including country ratings and default risk.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      country: {
        type: 'string',
        description: 'Country name. Required'
      }
    },
    required: ['country']
  },
  async execute(args: any): Promise<any> {
    try {
      const { country } = args;
      
      // East Money sovereign credit API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_SOVEREIGN_CREDIT',
        columns: 'ALL',
        filter: `(COUNTRY="${country}")`,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: '30',
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
        message: `Successfully retrieved sovereign credit analysis for ${country}`
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
 * Get corporate bond analytics
 * Data source: Corporate bond valuation and metrics
 */
export const getCorporateBondAnalyticsTool: BuiltInTool = {
  name: 'get_corporate_bond_analytics',
  description: 'Get corporate bond analytics including YTM, duration, convexity, OAS.',
  category: 'bonds',
  inputSchema: {
    type: 'object',
    properties: {
      bond_code: {
        type: 'string',
        description: 'Bond code. Required'
      }
    },
    required: ['bond_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { bond_code } = args;
      
      // East Money corporate bond API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CORPORATE_BOND_ANALYTICS',
        columns: 'ALL',
        filter: `(BOND_CODE="${bond_code}")`,
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
        bond_code,
        message: `Successfully retrieved corporate bond analytics for ${bond_code}`
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
 * Get credit cycle indicators
 * Data source: Credit cycle positioning metrics
 */
export const getCreditCycleIndicatorsTool: BuiltInTool = {
  name: 'get_credit_cycle_indicators',
  description: 'Get credit cycle indicators showing market positioning in the credit cycle.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      region: {
        type: 'string',
        description: 'Region: china, us, europe, global. Default: china',
        enum: ['china', 'us', 'europe', 'asia', 'global']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { region = 'china' } = args;
      
      // East Money credit cycle API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CREDIT_CYCLE',
        columns: 'ALL',
        filter: '',
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
        region,
        message: `Successfully retrieved credit cycle indicators for ${region}`
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
 * Get debt capacity analysis
 * Data source: Maximum sustainable debt levels
 */
export const getDebtCapacityAnalysisTool: BuiltInTool = {
  name: 'get_debt_capacity_analysis',
  description: 'Get debt capacity analysis showing maximum sustainable debt levels.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      stock_code: {
        type: 'string',
        description: 'Stock code. Required'
      }
    },
    required: ['stock_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { stock_code } = args;
      
      // East Money debt capacity API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_DEBT_CAPACITY',
        columns: 'ALL',
        filter: `(SECURITY_CODE="${stock_code}")`,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: '10',
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        stock_code,
        message: `Successfully retrieved debt capacity analysis for ${stock_code}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
