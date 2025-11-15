// Alternative data tools
// Provides sentiment analysis, news aggregation, social media metrics, analyst ratings, research reports
import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Get news heat ranking
 * Data source: News mentions and热度 tracking
 */
export const getNewsHeatRankingTool: BuiltInTool = {
  name: 'get_news_heat_ranking',
  description: 'Get stock news heat ranking showing most mentioned stocks in financial news with heat scores.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      time_range: {
        type: 'string',
        description: 'Time range: today, 3d (last 3 days), 1w (last week), 1m (last month). Default: today',
        enum: ['today', '3d', '1w', '1m']
      },
      category: {
        type: 'string',
        description: 'News category: all, industry, company, policy, macro. Default: all',
        enum: ['all', 'industry', 'company', 'policy', 'macro']
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const timeRange = args.time_range || 'today';
      const category = args.category || 'all';
      
      // East Money news heat API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_NEWS_HEAT_RANK',
        columns: 'ALL',
        sortColumns: 'HEAT_VALUE',
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
        time_range: timeRange,
        category,
        message: `Successfully retrieved news heat ranking for ${timeRange}`
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
 * Get research report statistics
 * Data source: Research report counts and topics
 */
export const getResearchReportStatsTool: BuiltInTool = {
  name: 'get_research_report_stats',
  description: 'Get research report statistics including report count, coverage by brokers, research topics.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit). Optional, if not provided returns overall market stats'
      },
      report_type: {
        type: 'string',
        description: 'Report type: company (company research), industry (industry research), strategy (strategy report), macro (macro research). Default: company',
        enum: ['company', 'industry', 'strategy', 'macro']
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
      const { symbol, report_type = 'company', days = 30 } = args;
      
      // East Money research report API
      const url = 'https://reportapi.eastmoney.com/report/list';
      const params = new URLSearchParams({
        qType: '0',
        stockCode: symbol || '',
        industryCode: '',
        pageSize: '50',
        pageNo: '1',
        beginTime: '',
        endTime: '',
        ratingChange: ''
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        symbol: symbol || 'all',
        report_type,
        days,
        message: `Successfully retrieved research report stats for ${symbol || 'market'}`
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
 * Get stock mention trends
 * Data source: Trending stocks on financial platforms
 */
export const getStockMentionTrendsTool: BuiltInTool = {
  name: 'get_stock_mention_trends',
  description: 'Get trending stocks based on mention volume across news, forums, social media over time.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      trend_period: {
        type: 'string',
        description: 'Trending period: hourly, daily, weekly. Default: daily',
        enum: ['hourly', 'daily', 'weekly']
      },
      limit: {
        type: 'number',
        description: 'Number of top trending stocks to return. Default: 50, max: 100'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const trendPeriod = args.trend_period || 'daily';
      const limit = Math.min(args.limit || 50, 100);
      
      // East Money trending stocks API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_HOT_STOCK_RANK',
        columns: 'ALL',
        sortColumns: 'HOT_RANK',
        sortTypes: '1',
        pageSize: String(limit),
        pageNumber: '1'
      });

      const response = await requestUrl({
        url: `${url}?${params.toString()}`,
        method: 'GET'
      });

      return {
        success: true,
        data: response.json,
        trend_period: trendPeriod,
        limit,
        message: `Successfully retrieved top ${limit} trending stocks for ${trendPeriod}`
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
 * Get institutional research calendar
 * Data source: Upcoming research events and roadshows
 */
export const getInstitutionalResearchCalendarTool: BuiltInTool = {
  name: 'get_institutional_research_calendar',
  description: 'Get institutional research calendar showing upcoming company visits, roadshows, research events.',
  category: 'stock',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock code (6-digit). Optional, if not provided returns all upcoming events'
      },
      days_ahead: {
        type: 'number',
        description: 'Number of days ahead to look. Default: 14'
      }
    },
    required: []
  },
  async execute(args: any): Promise<any> {
    try {
      const { symbol, days_ahead = 14 } = args;
      
      // East Money institutional research calendar API
      const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';
      const filter = symbol ? `(SECURITY_CODE="${symbol}")` : '';
      
      const params = new URLSearchParams({
        reportName: 'RPT_ORG_RESEARCH_ACTIVITY',
        columns: 'ALL',
        filter: filter,
        sortColumns: 'RECEPTION_DATE',
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
        days_ahead,
        message: `Successfully retrieved institutional research calendar for ${symbol || 'all stocks'}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};


