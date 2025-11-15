import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 获取新股申购与中签查询
 */
export const getIPOSubscriptionListTool: BuiltInTool = {
	name: 'get_ipo_subscription_list',
	description: '获取新股申购与中签查询数据，包括申购代码、股票名称、申购日期、中签号公布日、中签率、发行价等信息',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async () => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = new URLSearchParams({
				reportName: 'RPT_IPO_LIST',
				columns: 'ALL',
				sortColumns: 'APPLY_DATE',
				sortTypes: '-1',
				pageSize: '100',
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${params.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取IPO审核信息-科创板
 */
export const getIPOAuditKCBTool: BuiltInTool = {
	name: 'get_ipo_audit_kcb',
	description: '获取科创板IPO审核信息，包括公司名称、审核状态、受理日期、上市日期等',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async () => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = new URLSearchParams({
				reportName: 'RPT_KCCDR_AUDIT',
				columns: 'ALL',
				sortColumns: 'ACCEPT_DATE',
				sortTypes: '-1',
				pageSize: '100',
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${params.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取IPO审核信息-创业板
 */
export const getIPOAuditCYBTool: BuiltInTool = {
	name: 'get_ipo_audit_cyb',
	description: '获取创业板IPO审核信息，包括公司名称、审核状态、受理日期、上市日期等',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async () => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = new URLSearchParams({
				reportName: 'RPT_CYBDR_AUDIT',
				columns: 'ALL',
				sortColumns: 'ACCEPT_DATE',
				sortTypes: '-1',
				pageSize: '100',
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${params.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取IPO审核信息-北交所
 */
export const getIPOAuditBJTool: BuiltInTool = {
	name: 'get_ipo_audit_bj',
	description: '获取北京证券交易所IPO审核信息，包括公司名称、审核状态、受理日期等',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async () => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = new URLSearchParams({
				reportName: 'RPT_BJX_AUDIT',
				columns: 'ALL',
				sortColumns: 'ACCEPT_DATE',
				sortTypes: '-1',
				pageSize: '100',
				pageNumber: '1'
			});

			const response = await requestUrl({
				url: `${url}?${params.toString()}`,
				method: 'GET'
			});

			return JSON.stringify(response.json, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取打新收益率
 */
export const getIPOProfitRateTool: BuiltInTool = {
	name: 'get_ipo_profit_rate',
	description: '获取新股打新收益率数据，包括股票代码、名称、发行价、首日开盘价、首日收盘价、首日涨跌幅等',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			market: {
				type: 'string',
				description: '市场类型: ALL(全部), SH(沪市), SZ(深市), BJ(北交所)',
				enum: ['ALL', 'SH', 'SZ', 'BJ']
			}
		},
		required: []
	},
	execute: async (params: { market?: string }) => {
		try {
			const market = params.market || 'ALL';
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_IPO_FIRSTDAY',
				columns: 'ALL',
				sortColumns: 'LISTING_DATE',
				sortTypes: '-1',
				pageSize: '100',
				pageNumber: '1'
			});

			if (market !== 'ALL') {
				queryParams.append('filter', `(MARKET="${market}")`);
			}

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
 * 获取IPO受益股
 */
export const getIPOBenefitStocksTool: BuiltInTool = {
	name: 'get_ipo_benefit_stocks',
	description: '获取IPO受益股数据，显示哪些股票可能受益于新股上市',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			stock_code: {
				type: 'string',
				description: '新股股票代码，例如: 688XXX'
			}
		},
		required: []
	},
	execute: async (params: { stock_code?: string }) => {
		try {
			// 这是一个框架实现，实际需要同花顺API
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_IPO_BENEFIT',
				columns: 'ALL',
				sortColumns: 'BENEFIT_SCORE',
				sortTypes: '-1',
				pageSize: '50',
				pageNumber: '1'
			});

			if (params.stock_code) {
				queryParams.append('filter', `(IPO_CODE="${params.stock_code}")`);
			}

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
 * 获取新股上市首日表现
 */
export const getNewStockFirstDayTool: BuiltInTool = {
	name: 'get_new_stock_first_day',
	description: '获取新股上市首日表现数据，包括首日涨幅、换手率、成交额等关键指标',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: '上市日期，格式: YYYY-MM-DD，不填则返回最近上市的新股'
			}
		},
		required: []
	},
	execute: async (params: { date?: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_IPO_FIRSTDAY_DETAIL',
				columns: 'ALL',
				sortColumns: 'LISTING_DATE',
				sortTypes: '-1',
				pageSize: '50',
				pageNumber: '1'
			});

			if (params.date) {
				queryParams.append('filter', `(LISTING_DATE="${params.date}")`);
			}

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
