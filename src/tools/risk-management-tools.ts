// Risk management tools
// Provides risk metrics: VaR, stress testing, scenario analysis, risk attribution
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get Value at Risk (VaR) calculation
 * Data source: Historical VaR and parametric VaR estimates
 */
export const getValueAtRiskTool: BuiltInTool = {
  name: 'get_value_at_risk',
  description: 'Get Value at Risk (VaR) calculation for portfolios showing potential losses at confidence levels.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Required'
      },
      confidence_level: {
        type: 'number',
        description: 'Confidence level (90, 95, 99). Default: 95'
      },
      time_horizon: {
        type: 'number',
        description: 'Time horizon in days. Default: 1'
      },
      method: {
        type: 'string',
        description: 'Calculation method: historical, parametric, monte_carlo. Default: historical',
        enum: ['historical', 'parametric', 'monte_carlo']
      }
    },
    required: ['portfolio_id']
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id, confidence_level = 95, time_horizon = 1, method = 'historical' } = args;
      
      // East Money VaR API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_VAR_CALCULATION',
        columns: 'ALL',
        filter: `(PORTFOLIO_ID="${portfolio_id}")`,
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
        portfolio_id,
        confidence_level,
        time_horizon,
        method,
        message: `Successfully calculated ${confidence_level}% VaR for ${portfolio_id}`
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
 * Get stress testing results
 * Data source: Portfolio stress test scenarios
 */
export const getStressTestingResultsTool: BuiltInTool = {
  name: 'get_stress_testing_results',
  description: 'Get stress testing results showing portfolio impact under extreme market scenarios.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Required'
      },
      scenario: {
        type: 'string',
        description: 'Stress scenario: 2008_crisis, covid_crash, rate_shock, all. Default: all',
        enum: ['2008_crisis', 'covid_crash', 'rate_shock', 'custom', 'all']
      }
    },
    required: ['portfolio_id']
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id, scenario = 'all' } = args;
      
      // East Money stress test API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_STRESS_TEST',
        columns: 'ALL',
        filter: `(PORTFOLIO_ID="${portfolio_id}")`,
        sortColumns: 'SCENARIO_SEVERITY',
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
        portfolio_id,
        scenario,
        message: `Successfully retrieved stress test results for ${portfolio_id}`
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
 * Get scenario analysis
 * Data source: Custom scenario impact analysis
 */
export const getScenarioAnalysisTool: BuiltInTool = {
  name: 'get_scenario_analysis',
  description: 'Get scenario analysis showing portfolio performance under custom market condition scenarios.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Required'
      },
      scenario_params: {
        type: 'object',
        description: 'Scenario parameters (equity_change, rate_change, etc.). Optional'
      }
    },
    required: ['portfolio_id']
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id, scenario_params } = args;
      
      // East Money scenario analysis API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_SCENARIO_ANALYSIS',
        columns: 'ALL',
        filter: `(PORTFOLIO_ID="${portfolio_id}")`,
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
        portfolio_id,
        scenario_params: scenario_params || 'default',
        message: `Successfully retrieved scenario analysis for ${portfolio_id}`
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
 * Get portfolio risk attribution
 * Data source: Risk decomposition by asset class, sector, factor
 */
export const getPortfolioRiskAttributionTool: BuiltInTool = {
  name: 'get_portfolio_risk_attribution',
  description: 'Get portfolio risk attribution showing risk contribution by asset class, sector, factor.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Required'
      },
      attribution_type: {
        type: 'string',
        description: 'Attribution type: asset_class, sector, factor, security. Default: sector',
        enum: ['asset_class', 'sector', 'factor', 'security']
      }
    },
    required: ['portfolio_id']
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id, attribution_type = 'sector' } = args;
      
      // East Money risk attribution API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_RISK_ATTRIBUTION',
        columns: 'ALL',
        filter: `(PORTFOLIO_ID="${portfolio_id}")`,
        sortColumns: 'RISK_CONTRIBUTION',
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
        portfolio_id,
        attribution_type,
        message: `Successfully retrieved risk attribution for ${portfolio_id}`
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
 * Get credit risk metrics
 * Data source: Credit exposure, PD, LGD, EAD metrics
 */
export const getCreditRiskMetricsTool: BuiltInTool = {
  name: 'get_credit_risk_metrics',
  description: 'Get credit risk metrics showing probability of default (PD), loss given default (LGD), exposure at default (EAD).',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Corporate entity or counterparty. Required'
      },
      metric: {
        type: 'string',
        description: 'Metric type: pd, lgd, ead, expected_loss, all. Default: all',
        enum: ['pd', 'lgd', 'ead', 'expected_loss', 'all']
      }
    },
    required: ['entity']
  },
  async execute(args: any): Promise<any> {
    try {
      const { entity, metric = 'all' } = args;
      
      // East Money credit risk API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CREDIT_RISK',
        columns: 'ALL',
        filter: `(ENTITY="${entity}")`,
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
        entity,
        metric,
        message: `Successfully retrieved credit risk metrics for ${entity}`
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
 * Get liquidity risk indicators
 * Data source: Portfolio liquidity metrics and stress
 */
export const getLiquidityRiskIndicatorsTool: BuiltInTool = {
  name: 'get_liquidity_risk_indicators',
  description: 'Get liquidity risk indicators showing days to liquidate, bid-ask spread impact, liquidity stress.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Required'
      },
      liquidation_horizon: {
        type: 'number',
        description: 'Target liquidation horizon in days. Default: 5'
      }
    },
    required: ['portfolio_id']
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id, liquidation_horizon = 5 } = args;
      
      // East Money liquidity risk API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_LIQUIDITY_RISK',
        columns: 'ALL',
        filter: `(PORTFOLIO_ID="${portfolio_id}")`,
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
        portfolio_id,
        liquidation_horizon,
        message: `Successfully retrieved liquidity risk indicators for ${portfolio_id}`
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
 * Get operational risk indicators
 * Data source: Operational risk events and KRIs
 */
export const getOperationalRiskIndicatorsTool: BuiltInTool = {
  name: 'get_operational_risk_indicators',
  description: 'Get operational risk indicators (KRIs) showing event frequency, severity, control effectiveness.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      business_unit: {
        type: 'string',
        description: 'Business unit. Optional, returns all if not specified'
      },
      risk_category: {
        type: 'string',
        description: 'Risk category: fraud, system_failure, compliance, all. Default: all',
        enum: ['fraud', 'system_failure', 'compliance', 'human_error', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { business_unit, risk_category = 'all' } = args;
      
      // East Money operational risk API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = business_unit ? `(BUSINESS_UNIT="${business_unit}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_OPERATIONAL_RISK',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'SEVERITY_SCORE',
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
        business_unit: business_unit || 'all',
        risk_category,
        message: `Successfully retrieved operational risk indicators for ${business_unit || 'all units'}`
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
 * Get margin requirements
 * Data source: Initial and maintenance margin calculations
 */
export const getMarginRequirementsTool: BuiltInTool = {
  name: 'get_margin_requirements',
  description: 'Get margin requirements showing initial margin, maintenance margin, margin calls for portfolio.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Required'
      },
      margin_type: {
        type: 'string',
        description: 'Margin type: initial, maintenance, variation. Default: all',
        enum: ['initial', 'maintenance', 'variation', 'all']
      }
    },
    required: ['portfolio_id']
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id, margin_type = 'all' } = args;
      
      // East Money margin requirements API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_MARGIN_REQUIREMENT',
        columns: 'ALL',
        filter: `(PORTFOLIO_ID="${portfolio_id}")`,
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
        portfolio_id,
        margin_type,
        message: `Successfully retrieved margin requirements for ${portfolio_id}`
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
 * Get counterparty exposure
 * Data source: Counterparty credit exposure and limits
 */
export const getCounterpartyExposureTool: BuiltInTool = {
  name: 'get_counterparty_exposure',
  description: 'Get counterparty exposure showing current exposure, potential future exposure (PFE), CVA.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      counterparty: {
        type: 'string',
        description: 'Counterparty name. Required'
      },
      exposure_type: {
        type: 'string',
        description: 'Exposure type: current, pfe, cva, all. Default: all',
        enum: ['current', 'pfe', 'cva', 'all']
      }
    },
    required: ['counterparty']
  },
  async execute(args: any): Promise<any> {
    try {
      const { counterparty, exposure_type = 'all' } = args;
      
      // East Money counterparty exposure API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_COUNTERPARTY_EXPOSURE',
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
        exposure_type,
        message: `Successfully retrieved counterparty exposure for ${counterparty}`
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
 * Get concentration risk analysis
 * Data source: Portfolio concentration metrics
 */
export const getConcentrationRiskAnalysisTool: BuiltInTool = {
  name: 'get_concentration_risk_analysis',
  description: 'Get concentration risk analysis showing single-name, sector, geographic concentration risks.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Required'
      },
      concentration_type: {
        type: 'string',
        description: 'Concentration type: single_name, sector, geography, all. Default: all',
        enum: ['single_name', 'sector', 'geography', 'all']
      }
    },
    required: ['portfolio_id']
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id, concentration_type = 'all' } = args;
      
      // East Money concentration risk API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CONCENTRATION_RISK',
        columns: 'ALL',
        filter: `(PORTFOLIO_ID="${portfolio_id}")`,
        sortColumns: 'CONCENTRATION_INDEX',
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
        portfolio_id,
        concentration_type,
        message: `Successfully retrieved concentration risk analysis for ${portfolio_id}`
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
 * Get tail risk indicators
 * Data source: Extreme loss probabilities beyond VaR
 */
export const getTailRiskIndicatorsTool: BuiltInTool = {
  name: 'get_tail_risk_indicators',
  description: 'Get tail risk indicators showing expected shortfall (CVaR), extreme loss probabilities.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Required'
      },
      confidence_level: {
        type: 'number',
        description: 'Confidence level for tail risk (95, 99, 99.9). Default: 99'
      }
    },
    required: ['portfolio_id']
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id, confidence_level = 99 } = args;
      
      // East Money tail risk API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_TAIL_RISK',
        columns: 'ALL',
        filter: `(PORTFOLIO_ID="${portfolio_id}")`,
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
        portfolio_id,
        confidence_level,
        message: `Successfully retrieved tail risk indicators for ${portfolio_id}`
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
 * Get risk limit monitoring
 * Data source: Risk limit utilization and breaches
 */
export const getRiskLimitMonitoringTool: BuiltInTool = {
  name: 'get_risk_limit_monitoring',
  description: 'Get risk limit monitoring showing limit utilization, breaches, warning levels across risk types.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      portfolio_id: {
        type: 'string',
        description: 'Portfolio identifier. Optional, returns all if not specified'
      },
      limit_type: {
        type: 'string',
        description: 'Limit type: var, exposure, concentration, leverage, all. Default: all',
        enum: ['var', 'exposure', 'concentration', 'leverage', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { portfolio_id, limit_type = 'all' } = args;
      
      // East Money risk limit API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = portfolio_id ? `(PORTFOLIO_ID="${portfolio_id}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_RISK_LIMIT',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'UTILIZATION_PCT',
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
        portfolio_id: portfolio_id || 'all',
        limit_type,
        message: `Successfully retrieved risk limit monitoring for ${portfolio_id || 'all portfolios'}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
