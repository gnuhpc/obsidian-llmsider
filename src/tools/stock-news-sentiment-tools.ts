import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 获取新闻联播文字稿
 */
export const getCCTVNewsTool: BuiltInTool = {
	name: 'get_cctv_news',
	description: '获取新闻联播文字稿，可用于分析政策导向和市场热点',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: '日期，格式: YYYYMMDD，如: 20240101'
			}
		},
		required: ['date']
	},
	execute: async (params: { date: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_CCTV_NEWS',
				columns: 'ALL',
				filter: `(TRADE_DATE="${params.date}")`,
				sortColumns: 'NEWS_TIME',
				sortTypes: '-1',
				pageSize: '100',
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${queryParams.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取财经新闻
 */
export const getFinancialNewsTool: BuiltInTool = {
	name: 'get_financial_news',
	description: '获取多来源财经新闻，包括证券时报、财联社等主流媒体',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			source: {
				type: 'string',
				description: '新闻来源: 证券时报, 财联社, 第一财经, 经济观察报, 21世纪经济报道',
				enum: ['stcn', 'cls', 'yicai', 'eeo', '21jingji']
			},
			max_count: {
				type: 'number',
				description: '获取新闻数量，默认50条'
			}
		},
		required: []
	},
	execute: async (params: { source?: string; max_count?: number }) => {
		try {
			const maxCount = params.max_count || 50;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const filter = params.source ? `(NEWS_SOURCE="${params.source}")` : '()';

			const queryParams = new URLSearchParams({
				reportName: 'RPT_FINANCIAL_NEWS',
				columns: 'ALL',
				filter: filter,
				sortColumns: 'PUBLISH_TIME',
				sortTypes: '-1',
				pageSize: String(maxCount),
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${queryParams.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取股票人气榜
 */
export const getStockPopularityTool: BuiltInTool = {
	name: 'get_stock_popularity',
	description: '获取股票人气排行榜，包括关注度、搜索热度等指标',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			market: {
				type: 'string',
				description: '市场类型: 全部, 沪市, 深市',
				enum: ['all', 'sh', 'sz']
			}
		},
		required: []
	},
	execute: async (params: { market?: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const filter = params.market && params.market !== 'all' 
				? `(MARKET="${params.market.toUpperCase()}")` 
				: '()';

			const queryParams = new URLSearchParams({
				reportName: 'RPT_STOCK_POPULARITY',
				columns: 'ALL',
				filter: filter,
				sortColumns: 'POPULARITY_SCORE',
				sortTypes: '-1',
				pageSize: '100',
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${queryParams.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取新闻情绪指数
 */
export const getNewsSentimentTool: BuiltInTool = {
	name: 'get_news_sentiment',
	description: '获取市场新闻情绪指数，用于量化分析市场情绪',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码，可选，留空则获取大盘情绪'
			}
		},
		required: []
	},
	execute: async (params: { symbol?: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const filter = params.symbol 
				? `(SECURITY_CODE="${params.symbol}")` 
				: '()';

			const queryParams = new URLSearchParams({
				reportName: 'RPT_NEWS_SENTIMENT',
				columns: 'ALL',
				filter: filter,
				sortColumns: 'TRADE_DATE',
				sortTypes: '-1',
				pageSize: '100',
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${queryParams.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取微博财经情绪
 */
export const getWeiboSentimentTool: BuiltInTool = {
	name: 'get_weibo_sentiment',
	description: '获取微博财经情绪指数，反映社交媒体上的市场情绪',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async () => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_WEIBO_SENTIMENT',
				columns: 'ALL',
				sortColumns: 'TRADE_DATE',
				sortTypes: '-1',
				pageSize: '100',
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${queryParams.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取财经日历
 */
export const getEconomicCalendarTool: BuiltInTool = {
	name: 'get_economic_calendar',
	description: '获取重要经济数据发布日历，包括GDP、CPI、PMI等数据发布时间',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			start_date: {
				type: 'string',
				description: '开始日期，格式: YYYYMMDD'
			},
			end_date: {
				type: 'string',
				description: '结束日期，格式: YYYYMMDD'
			}
		},
		required: []
	},
	execute: async (params: { start_date?: string; end_date?: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			let filter = '()';
			if (params.start_date && params.end_date) {
				filter = `(PUBLISH_DATE>="${params.start_date}")(PUBLISH_DATE<="${params.end_date}")`;
			} else if (params.start_date) {
				filter = `(PUBLISH_DATE>="${params.start_date}")`;
			}

			const queryParams = new URLSearchParams({
				reportName: 'RPT_ECONOMIC_CALENDAR',
				columns: 'ALL',
				filter: filter,
				sortColumns: 'PUBLISH_DATE,PUBLISH_TIME',
				sortTypes: '-1,-1',
				pageSize: '200',
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${queryParams.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取研究报告列表
 */
export const getResearchReportsTool: BuiltInTool = {
	name: 'get_research_reports',
	description: '获取券商研究报告列表，可按股票代码筛选',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码，可选'
			},
			report_type: {
				type: 'string',
				description: '报告类型: 公司研究, 行业研究, 宏观研究, 策略研究',
				enum: ['company', 'industry', 'macro', 'strategy']
			},
			max_count: {
				type: 'number',
				description: '获取报告数量，默认50份'
			}
		},
		required: []
	},
	execute: async (params: { symbol?: string; report_type?: string; max_count?: number }) => {
		try {
			const maxCount = params.max_count || 50;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			
			let filter = '()';
			if (params.symbol && params.report_type) {
				filter = `(SECURITY_CODE="${params.symbol}")(REPORT_TYPE="${params.report_type}")`;
			} else if (params.symbol) {
				filter = `(SECURITY_CODE="${params.symbol}")`;
			} else if (params.report_type) {
				filter = `(REPORT_TYPE="${params.report_type}")`;
			}

			const queryParams = new URLSearchParams({
				reportName: 'RPT_RESEARCH_REPORTS',
				columns: 'ALL',
				filter: filter,
				sortColumns: 'PUBLISH_DATE',
				sortTypes: '-1',
				pageSize: String(maxCount),
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${queryParams.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};
