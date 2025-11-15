// ESG (Environmental, Social, Governance) data tools
// Provides ESG ratings, carbon emissions, sustainability metrics
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get ESG ratings and scores
 * Data source: Corporate ESG ratings from rating agencies
 */
export const getESGRatingsTool: BuiltInTool = {
  name: 'get_esg_ratings',
  description: 'Get ESG (Environmental, Social, Governance) ratings and scores for companies.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      stock_code: {
        type: 'string',
        description: 'Stock code. Required'
      },
      rating_agency: {
        type: 'string',
        description: 'Rating agency: msci, sustainalytics, cdp, all. Default: all',
        enum: ['msci', 'sustainalytics', 'cdp', 'all']
      }
    },
    required: ['stock_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { stock_code, rating_agency = 'all' } = args;
      
      // East Money ESG ratings API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_ESG_RATING',
        columns: 'ALL',
        filter: `(SECURITY_CODE="${stock_code}")`,
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
        stock_code,
        rating_agency,
        message: `Successfully retrieved ESG ratings for ${stock_code}`
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
 * Get carbon emissions data
 * Data source: Corporate carbon footprint and emissions
 */
export const getCarbonEmissionsDataTool: BuiltInTool = {
  name: 'get_carbon_emissions_data',
  description: 'Get carbon emissions data (Scope 1, 2, 3) and carbon intensity for companies.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      stock_code: {
        type: 'string',
        description: 'Stock code. Required'
      },
      scope: {
        type: 'string',
        description: 'Emission scope: scope1, scope2, scope3, total. Default: total',
        enum: ['scope1', 'scope2', 'scope3', 'total']
      }
    },
    required: ['stock_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { stock_code, scope = 'total' } = args;
      
      // East Money carbon emissions API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CARBON_EMISSION',
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
        scope,
        message: `Successfully retrieved carbon emissions for ${stock_code}`
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
 * Get green bond data
 * Data source: Green bond issuance and performance
 */
export const getGreenBondDataTool: BuiltInTool = {
  name: 'get_green_bond_data',
  description: 'Get green bond issuance data, use of proceeds, and environmental impact.',
  category: 'bonds',
  inputSchema: {
    type: 'object',
    properties: {
      issuer: {
        type: 'string',
        description: 'Bond issuer name. Optional, returns all if not specified'
      },
      bond_type: {
        type: 'string',
        description: 'Green bond type: solar, wind, energy_efficiency, all. Default: all',
        enum: ['solar', 'wind', 'energy_efficiency', 'clean_transport', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { issuer, bond_type = 'all' } = args;
      
      // East Money green bond API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = issuer ? `(ISSUER_NAME="${issuer}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_GREEN_BOND',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'ISSUE_DATE',
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
        issuer: issuer || 'all',
        bond_type,
        message: `Successfully retrieved green bond data for ${issuer || 'all issuers'}`
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
 * Get ESG controversy scores
 * Data source: ESG controversy events and severity
 */
export const getESGControversyScoresTool: BuiltInTool = {
  name: 'get_esg_controversy_scores',
  description: 'Get ESG controversy scores and incidents (environmental violations, labor issues, corruption).',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      stock_code: {
        type: 'string',
        description: 'Stock code. Required'
      },
      controversy_type: {
        type: 'string',
        description: 'Controversy type: environmental, social, governance, all. Default: all',
        enum: ['environmental', 'social', 'governance', 'all']
      }
    },
    required: ['stock_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { stock_code, controversy_type = 'all' } = args;
      
      // East Money ESG controversy API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_ESG_CONTROVERSY',
        columns: 'ALL',
        filter: `(SECURITY_CODE="${stock_code}")`,
        sortColumns: 'INCIDENT_DATE',
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
        stock_code,
        controversy_type,
        message: `Successfully retrieved ESG controversy data for ${stock_code}`
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
 * Get climate risk assessment
 * Data source: Physical and transition climate risks
 */
export const getClimateRiskAssessmentTool: BuiltInTool = {
  name: 'get_climate_risk_assessment',
  description: 'Get climate risk assessment including physical risks (floods, droughts) and transition risks.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      stock_code: {
        type: 'string',
        description: 'Stock code. Required'
      },
      risk_type: {
        type: 'string',
        description: 'Risk type: physical, transition, all. Default: all',
        enum: ['physical', 'transition', 'all']
      }
    },
    required: ['stock_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { stock_code, risk_type = 'all' } = args;
      
      // East Money climate risk API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CLIMATE_RISK',
        columns: 'ALL',
        filter: `(SECURITY_CODE="${stock_code}")`,
        sortColumns: 'ASSESSMENT_DATE',
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
        risk_type,
        message: `Successfully retrieved climate risk assessment for ${stock_code}`
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
 * Get sustainability reports summary
 * Data source: Corporate sustainability/CSR report highlights
 */
export const getSustainabilityReportsTool: BuiltInTool = {
  name: 'get_sustainability_reports',
  description: 'Get sustainability report summaries and key metrics from corporate CSR disclosures.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      stock_code: {
        type: 'string',
        description: 'Stock code. Required'
      },
      report_year: {
        type: 'number',
        description: 'Report year. Optional, returns latest if not specified'
      }
    },
    required: ['stock_code']
  },
  async execute(args: any): Promise<any> {
    try {
      const { stock_code, report_year } = args;
      
      // East Money sustainability reports API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = report_year 
        ? `(SECURITY_CODE="${stock_code}")(REPORT_YEAR="${report_year}")`
        : `(SECURITY_CODE="${stock_code}")`;
      
      const params = new URLSearchParams({
        reportName: 'RPT_SUSTAINABILITY_REPORT',
        columns: 'ALL',
        filter: filter,
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
        report_year: report_year || 'latest',
        message: `Successfully retrieved sustainability reports for ${stock_code}`
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
 * Get water usage and management data
 * Data source: Corporate water consumption and efficiency
 */
export const getWaterUsageDataTool: BuiltInTool = {
  name: 'get_water_usage_data',
  description: 'Get water usage, water stress exposure, and water management practices.',
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
      
      // East Money water usage API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_WATER_USAGE',
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
        message: `Successfully retrieved water usage data for ${stock_code}`
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
 * Get renewable energy usage
 * Data source: Renewable energy consumption and targets
 */
export const getRenewableEnergyUsageTool: BuiltInTool = {
  name: 'get_renewable_energy_usage',
  description: 'Get renewable energy consumption percentage and renewable energy targets.',
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
      
      // East Money renewable energy API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_RENEWABLE_ENERGY',
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
        message: `Successfully retrieved renewable energy data for ${stock_code}`
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
 * Get waste management metrics
 * Data source: Waste generation and recycling rates
 */
export const getWasteManagementMetricsTool: BuiltInTool = {
  name: 'get_waste_management_metrics',
  description: 'Get waste generation, recycling rates, and circular economy initiatives.',
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
      
      // East Money waste management API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_WASTE_MANAGEMENT',
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
        message: `Successfully retrieved waste management metrics for ${stock_code}`
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
 * Get supply chain ESG metrics
 * Data source: Supplier ESG performance and audits
 */
export const getSupplyChainESGMetricsTool: BuiltInTool = {
  name: 'get_supply_chain_esg_metrics',
  description: 'Get supply chain ESG performance including supplier audits and compliance.',
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
      
      // East Money supply chain ESG API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_SUPPLY_CHAIN_ESG',
        columns: 'ALL',
        filter: `(SECURITY_CODE="${stock_code}")`,
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
        stock_code,
        message: `Successfully retrieved supply chain ESG metrics for ${stock_code}`
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
 * Get board diversity metrics
 * Data source: Board composition by gender, ethnicity, age
 */
export const getBoardDiversityMetricsTool: BuiltInTool = {
  name: 'get_board_diversity_metrics',
  description: 'Get board diversity metrics including gender, ethnicity, age, and independence.',
  category: 'stock',
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
      
      // East Money board diversity API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_BOARD_DIVERSITY',
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
        message: `Successfully retrieved board diversity metrics for ${stock_code}`
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
 * Get employee satisfaction metrics
 * Data source: Employee engagement and satisfaction scores
 */
export const getEmployeeSatisfactionMetricsTool: BuiltInTool = {
  name: 'get_employee_satisfaction_metrics',
  description: 'Get employee satisfaction, turnover rates, and workplace safety metrics.',
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
      
      // East Money employee satisfaction API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_EMPLOYEE_SATISFACTION',
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
        message: `Successfully retrieved employee satisfaction metrics for ${stock_code}`
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
 * Get ESG fund screening
 * Data source: ESG-focused mutual funds and ETFs
 */
export const getESGFundScreeningTool: BuiltInTool = {
  name: 'get_esg_fund_screening',
  description: 'Get ESG-focused funds with screening criteria and ESG scores.',
  category: 'funds',
  inputSchema: {
    type: 'object',
    properties: {
      fund_type: {
        type: 'string',
        description: 'Fund type: equity, bond, balanced, all. Default: all',
        enum: ['equity', 'bond', 'balanced', 'all']
      },
      min_esg_score: {
        type: 'number',
        description: 'Minimum ESG score (0-100). Optional'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { fund_type = 'all', min_esg_score } = args;
      
      // East Money ESG fund API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_ESG_FUND',
        columns: 'ALL',
        filter: '',
        sortColumns: 'ESG_SCORE',
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
        fund_type,
        min_esg_score: min_esg_score || 'none',
        message: `Successfully retrieved ESG fund screening results`
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
 * Get green finance statistics
 * Data source: Green loans, bonds, and sustainable finance
 */
export const getGreenFinanceStatsTool: BuiltInTool = {
  name: 'get_green_finance_stats',
  description: 'Get green finance statistics including green loans, bonds, and sustainable finance growth.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      region: {
        type: 'string',
        description: 'Region: china, asia, europe, global. Default: china',
        enum: ['china', 'asia', 'europe', 'north_america', 'global']
      },
      finance_type: {
        type: 'string',
        description: 'Finance type: loan, bond, equity, all. Default: all',
        enum: ['loan', 'bond', 'equity', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { region = 'china', finance_type = 'all' } = args;
      
      // East Money green finance API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_GREEN_FINANCE',
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
        finance_type,
        message: `Successfully retrieved green finance statistics for ${region}`
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
 * Get carbon credit prices
 * Data source: Carbon emission allowances and credits trading
 */
export const getCarbonCreditPricesTool: BuiltInTool = {
  name: 'get_carbon_credit_prices',
  description: 'Get carbon credit and emission allowance prices from various carbon markets.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      market: {
        type: 'string',
        description: 'Carbon market: eu_ets, china_ets, california, all. Default: all',
        enum: ['eu_ets', 'china_ets', 'california', 'korea', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { market = 'all' } = args;
      
      // East Money carbon credit API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CARBON_CREDIT',
        columns: 'ALL',
        filter: '',
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
        market,
        message: `Successfully retrieved carbon credit prices for ${market}`
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
 * Get ESG disclosure quality
 * Data source: ESG reporting quality and completeness
 */
export const getESGDisclosureQualityTool: BuiltInTool = {
  name: 'get_esg_disclosure_quality',
  description: 'Get ESG disclosure quality scores and reporting completeness.',
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
      
      // East Money ESG disclosure API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_ESG_DISCLOSURE',
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
        message: `Successfully retrieved ESG disclosure quality for ${stock_code}`
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
 * Get social responsibility metrics
 * Data source: Community investment and social programs
 */
export const getSocialResponsibilityMetricsTool: BuiltInTool = {
  name: 'get_social_responsibility_metrics',
  description: 'Get corporate social responsibility metrics including community investment and philanthropy.',
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
      
      // East Money CSR metrics API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_CSR_METRICS',
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
        message: `Successfully retrieved social responsibility metrics for ${stock_code}`
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
 * Get governance quality metrics
 * Data source: Corporate governance scores and practices
 */
export const getGovernanceQualityMetricsTool: BuiltInTool = {
  name: 'get_governance_quality_metrics',
  description: 'Get corporate governance quality including board structure, shareholder rights, transparency.',
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
      
      // East Money governance quality API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_GOVERNANCE_QUALITY',
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
        message: `Successfully retrieved governance quality metrics for ${stock_code}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
