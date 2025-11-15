// Sector-specific analysis tools
// Provides industry-specific KPIs and metrics: banking, insurance, real estate, healthcare
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get banking net interest margin trends
 * Data source: Bank financial metrics - NIM analysis
 */
export const getBankNetInterestMarginTool: BuiltInTool = {
  name: 'get_bank_net_interest_margin',
  description: 'Get banking sector net interest margin (NIM) trends showing interest income vs cost trends.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Bank stock code. Optional, returns all banks if not specified'
      },
      quarters: {
        type: 'number',
        description: 'Number of quarters to retrieve. Default: 12'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, quarters = 12 } = args;
      
      // East Money bank NIM API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '(INDUSTRY_CODE="BK0475")';
      
      const params = new URLSearchParams({
        reportName: 'RPT_BANK_NIM_ANALYSIS',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(quarters),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all_banks',
        quarters,
        message: `Successfully retrieved bank NIM trends for ${symbol || 'all banks'}`
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
 * Get banking loan-to-deposit ratios
 * Data source: Bank liquidity metrics - loan/deposit ratio
 */
export const getBankLoanDepositRatioTool: BuiltInTool = {
  name: 'get_bank_loan_deposit_ratio',
  description: 'Get banking sector loan-to-deposit ratios showing liquidity management and lending capacity.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Bank stock code. Optional, returns all banks if not specified'
      },
      quarters: {
        type: 'number',
        description: 'Number of quarters to retrieve. Default: 8'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, quarters = 8 } = args;
      
      // East Money bank loan/deposit ratio API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '(INDUSTRY_CODE="BK0475")';
      
      const params = new URLSearchParams({
        reportName: 'RPT_BANK_LOAN_DEPOSIT',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(quarters),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all_banks',
        quarters,
        message: `Successfully retrieved bank loan-deposit ratios for ${symbol || 'all banks'}`
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
 * Get banking non-performing loan (NPL) ratios
 * Data source: Bank asset quality - NPL ratio trends
 */
export const getBankNPLRatioTool: BuiltInTool = {
  name: 'get_bank_npl_ratio',
  description: 'Get banking sector non-performing loan (NPL) ratios showing asset quality and credit risk.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Bank stock code. Optional, returns all banks if not specified'
      },
      quarters: {
        type: 'number',
        description: 'Number of quarters to retrieve. Default: 12'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, quarters = 12 } = args;
      
      // East Money bank NPL API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '(INDUSTRY_CODE="BK0475")';
      
      const params = new URLSearchParams({
        reportName: 'RPT_BANK_NPL_RATIO',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(quarters),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all_banks',
        quarters,
        message: `Successfully retrieved bank NPL ratios for ${symbol || 'all banks'}`
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
 * Get banking capital adequacy ratios
 * Data source: Bank regulatory metrics - CAR compliance
 */
export const getBankCapitalAdequacyTool: BuiltInTool = {
  name: 'get_bank_capital_adequacy',
  description: 'Get banking sector capital adequacy ratios (CAR) showing regulatory compliance and solvency.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Bank stock code. Optional, returns all banks if not specified'
      },
      quarters: {
        type: 'number',
        description: 'Number of quarters to retrieve. Default: 8'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, quarters = 8 } = args;
      
      // East Money bank CAR API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '(INDUSTRY_CODE="BK0475")';
      
      const params = new URLSearchParams({
        reportName: 'RPT_BANK_CAR',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(quarters),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all_banks',
        quarters,
        message: `Successfully retrieved bank capital adequacy ratios for ${symbol || 'all banks'}`
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
 * Get insurance premium income
 * Data source: Insurance company premium revenue by category
 */
export const getInsurancePremiumIncomeTool: BuiltInTool = {
  name: 'get_insurance_premium_income',
  description: 'Get insurance sector premium income by category (life, property, health) showing revenue breakdown.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Insurance company stock code. Optional, returns all insurers if not specified'
      },
      category: {
        type: 'string',
        description: 'Premium category: life, property, health, all. Default: all',
        enum: ['life', 'property', 'health', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, category = 'all' } = args;
      
      // East Money insurance premium API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '(INDUSTRY_CODE="BK0474")';
      
      const params = new URLSearchParams({
        reportName: 'RPT_INSURANCE_PREMIUM',
        columns: 'ALL',
        filter: filter,
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
        symbol: symbol || 'all_insurers',
        category,
        message: `Successfully retrieved insurance premium income for ${symbol || 'all insurers'}`
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
 * Get insurance solvency ratios
 * Data source: Insurance regulatory metrics - solvency adequacy
 */
export const getInsuranceSolvencyRatioTool: BuiltInTool = {
  name: 'get_insurance_solvency_ratio',
  description: 'Get insurance sector solvency ratios showing financial strength and regulatory compliance.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Insurance company stock code. Optional, returns all insurers if not specified'
      },
      quarters: {
        type: 'number',
        description: 'Number of quarters to retrieve. Default: 8'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, quarters = 8 } = args;
      
      // East Money insurance solvency API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '(INDUSTRY_CODE="BK0474")';
      
      const params = new URLSearchParams({
        reportName: 'RPT_INSURANCE_SOLVENCY',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(quarters),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all_insurers',
        quarters,
        message: `Successfully retrieved insurance solvency ratios for ${symbol || 'all insurers'}`
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
 * Get insurance combined ratio
 * Data source: Insurance underwriting profitability - combined ratio
 */
export const getInsuranceCombinedRatioTool: BuiltInTool = {
  name: 'get_insurance_combined_ratio',
  description: 'Get insurance sector combined ratios (loss ratio + expense ratio) showing underwriting profitability.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Insurance company stock code. Optional, returns all property insurers if not specified'
      },
      years: {
        type: 'number',
        description: 'Number of years to retrieve. Default: 5'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, years = 5 } = args;
      
      // East Money insurance combined ratio API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '(INDUSTRY_CODE="BK0474")';
      
      const params = new URLSearchParams({
        reportName: 'RPT_INSURANCE_COMBINED_RATIO',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(years * 4),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all_property_insurers',
        years,
        message: `Successfully retrieved insurance combined ratios for ${symbol || 'all property insurers'}`
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
 * Get real estate sales data
 * Data source: Property developer sales volumes by city/region
 */
export const getRealEstateSalesDataTool: BuiltInTool = {
  name: 'get_real_estate_sales_data',
  description: 'Get real estate sector sales data by city/region showing property sales volumes and amounts.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name. Optional, returns national data if not specified'
      },
      months: {
        type: 'number',
        description: 'Number of months to retrieve. Default: 12'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { city, months = 12 } = args;
      
      // East Money real estate sales API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = city ? `(CITY_NAME="${city}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_REALESTATE_SALES',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: String(months),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        city: city || 'national',
        months,
        message: `Successfully retrieved real estate sales data for ${city || 'national'}`
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
 * Get land transaction data
 * Data source: Land auctions and transactions by city
 */
export const getLandTransactionDataTool: BuiltInTool = {
  name: 'get_land_transaction_data',
  description: 'Get land transaction data showing auction results, land prices, transaction volumes by city.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name. Optional, returns national data if not specified'
      },
      months: {
        type: 'number',
        description: 'Number of months to retrieve. Default: 6'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { city, months = 6 } = args;
      
      // East Money land transaction API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = city ? `(CITY_NAME="${city}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_LAND_TRANSACTION',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        pageSize: String(months * 30),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        city: city || 'national',
        months,
        message: `Successfully retrieved land transaction data for ${city || 'national'}`
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
 * Get property inventory levels
 * Data source: Real estate inventory/unsold units by city
 */
export const getPropertyInventoryLevelsTool: BuiltInTool = {
  name: 'get_property_inventory_levels',
  description: 'Get property inventory levels showing unsold units, inventory months, supply overhang by city.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name. Optional, returns top cities if not specified'
      },
      months: {
        type: 'number',
        description: 'Number of months to retrieve. Default: 12'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { city, months = 12 } = args;
      
      // East Money property inventory API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = city ? `(CITY_NAME="${city}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_PROPERTY_INVENTORY',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(months),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        city: city || 'top_cities',
        months,
        message: `Successfully retrieved property inventory levels for ${city || 'top cities'}`
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
 * Get property price indices
 * Data source: Real estate price indices by city
 */
export const getPropertyPriceIndicesTool: BuiltInTool = {
  name: 'get_property_price_indices',
  description: 'Get property price indices showing price trends (new homes, resale homes) by city.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name. Optional, returns top cities if not specified'
      },
      months: {
        type: 'number',
        description: 'Number of months to retrieve. Default: 24'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { city, months = 24 } = args;
      
      // East Money property price index API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = city ? `(CITY_NAME="${city}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_PROPERTY_PRICE_INDEX',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(months),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        city: city || 'top_cities',
        months,
        message: `Successfully retrieved property price indices for ${city || 'top cities'}`
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
 * Get drug approval pipeline
 * Data source: NMPA drug approval status and pipeline
 */
export const getDrugApprovalPipelineTool: BuiltInTool = {
  name: 'get_drug_approval_pipeline',
  description: 'Get drug approval pipeline from NMPA showing approval status, clinical trial phases, drug categories.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      company: {
        type: 'string',
        description: 'Pharmaceutical company name. Optional, returns all if not specified'
      },
      status: {
        type: 'string',
        description: 'Approval status: approved, pending, clinical_trial, all. Default: all',
        enum: ['approved', 'pending', 'clinical_trial', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { company, status = 'all' } = args;
      
      // East Money drug approval API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = company ? `(COMPANY_NAME="${company}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_DRUG_APPROVAL',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'APPROVAL_DATE',
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
        company: company || 'all',
        status,
        message: `Successfully retrieved drug approval pipeline for ${company || 'all companies'}`
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
 * Get clinical trial data
 * Data source: Clinical trial registry and progress
 */
export const getClinicalTrialDataTool: BuiltInTool = {
  name: 'get_clinical_trial_data',
  description: 'Get clinical trial data showing trial phases, disease areas, enrollment status, study progress.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      company: {
        type: 'string',
        description: 'Pharmaceutical/biotech company name. Optional, returns all if not specified'
      },
      phase: {
        type: 'string',
        description: 'Clinical trial phase: phase1, phase2, phase3, phase4, all. Default: all',
        enum: ['phase1', 'phase2', 'phase3', 'phase4', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { company, phase = 'all' } = args;
      
      // East Money clinical trial API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = company ? `(COMPANY_NAME="${company}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_CLINICAL_TRIAL',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'START_DATE',
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
        company: company || 'all',
        phase,
        message: `Successfully retrieved clinical trial data for ${company || 'all companies'}`
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
 * Get medical device registration
 * Data source: NMPA medical device registration data
 */
export const getMedicalDeviceRegistrationTool: BuiltInTool = {
  name: 'get_medical_device_registration',
  description: 'Get medical device registration data from NMPA showing approval status, device categories, companies.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      company: {
        type: 'string',
        description: 'Medical device company name. Optional, returns all if not specified'
      },
      device_class: {
        type: 'string',
        description: 'Device classification: class1, class2, class3, all. Default: all',
        enum: ['class1', 'class2', 'class3', 'all']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { company, device_class = 'all' } = args;
      
      // East Money medical device registration API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = company ? `(COMPANY_NAME="${company}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_MEDICAL_DEVICE_REG',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REGISTRATION_DATE',
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
        company: company || 'all',
        device_class,
        message: `Successfully retrieved medical device registrations for ${company || 'all companies'}`
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
 * Get hospital operation metrics
 * Data source: Hospital financial and operational KPIs
 */
export const getHospitalOperationMetricsTool: BuiltInTool = {
  name: 'get_hospital_operation_metrics',
  description: 'Get hospital operation metrics showing patient volumes, bed occupancy rates, revenue per bed, operational efficiency.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Hospital/healthcare company stock code. Optional, returns all if not specified'
      },
      quarters: {
        type: 'number',
        description: 'Number of quarters to retrieve. Default: 8'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, quarters = 8 } = args;
      
      // East Money hospital operation metrics API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '(INDUSTRY_CODE="BK0727")';
      
      const params = new URLSearchParams({
        reportName: 'RPT_HOSPITAL_OPERATION',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(quarters),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all_hospitals',
        quarters,
        message: `Successfully retrieved hospital operation metrics for ${symbol || 'all hospitals'}`
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
 * Get REITs (Real Estate Investment Trusts) performance
 * Data source: China REITs market data and performance
 */
export const getREITsPerformanceTool: BuiltInTool = {
  name: 'get_reits_performance',
  description: 'Get REITs (Real Estate Investment Trusts) performance showing NAV, distribution yield, premium/discount rates.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'REITs code. Optional, returns all if not specified'
      },
      sort_by: {
        type: 'string',
        description: 'Sort by: yield (distribution yield), premium_rate, nav_growth. Default: yield',
        enum: ['yield', 'premium_rate', 'nav_growth']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, sort_by = 'yield' } = args;
      
      // East Money REITs performance API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_REITS_PERFORMANCE',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'DISTRIBUTION_YIELD',
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
        symbol: symbol || 'all',
        sort_by,
        message: `Successfully retrieved REITs performance for ${symbol || 'all'}`
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
 * Get telecom operator metrics
 * Data source: Telecom industry operational KPIs
 */
export const getTelecomOperatorMetricsTool: BuiltInTool = {
  name: 'get_telecom_operator_metrics',
  description: 'Get telecom operator metrics showing subscriber counts, ARPU, churn rates, 5G penetration.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      operator: {
        type: 'string',
        description: 'Operator name: china_mobile, china_unicom, china_telecom, all. Default: all',
        enum: ['china_mobile', 'china_unicom', 'china_telecom', 'all']
      },
      quarters: {
        type: 'number',
        description: 'Number of quarters to retrieve. Default: 8'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { operator = 'all', quarters = 8 } = args;
      
      // East Money telecom operator metrics API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_TELECOM_OPERATOR',
        columns: 'ALL',
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(quarters),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        operator,
        quarters,
        message: `Successfully retrieved telecom operator metrics for ${operator}`
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
 * Get automotive sales data
 * Data source: China auto sales by manufacturer and model
 */
export const getAutomotiveSalesDataTool: BuiltInTool = {
  name: 'get_automotive_sales_data',
  description: 'Get automotive sales data by manufacturer and model showing monthly sales volumes, market share, YoY growth.',
  category: 'market-data',
  inputSchema: {
    type: 'object',
    properties: {
      manufacturer: {
        type: 'string',
        description: 'Manufacturer name. Optional, returns all if not specified'
      },
      months: {
        type: 'number',
        description: 'Number of months to retrieve. Default: 12'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { manufacturer, months = 12 } = args;
      
      // East Money automotive sales API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = manufacturer ? `(MANUFACTURER="${manufacturer}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_AUTO_SALES',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        pageSize: String(months * 50),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        manufacturer: manufacturer || 'all',
        months,
        message: `Successfully retrieved automotive sales data for ${manufacturer || 'all manufacturers'}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
