import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 获取机构调研统计数据
 *//**
 * 获取高管持股变动明细
 */
export const getExecutiveHoldingChangeTool: BuiltInTool = {
	name: 'get_executive_holding_change',
	description: '获取董监高及相关人员持股变动明细，包括变动人、变动数量、变动原因等',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码，例如: 600000'
			},
			start_date: {
				type: 'string',
				description: '开始日期，格式: YYYY-MM-DD'
			},
			end_date: {
				type: 'string',
				description: '结束日期，格式: YYYY-MM-DD'
			}
		},
		required: ['symbol']
	},
	execute: async (params: { symbol: string; start_date?: string; end_date?: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			let filter = `(SECURITY_CODE="${params.symbol}")`;
			
			if (params.start_date && params.end_date) {
				filter += `(CHANGE_DATE>='${params.start_date}')(CHANGE_DATE<='${params.end_date}')`;
			}

			const queryParams = new URLSearchParams({
				reportName: 'RPT_EXECUTIVE_HOLD_DETAILS',
				columns: 'ALL',
				filter: filter,
				sortColumns: 'CHANGE_DATE',
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
 * 获取机构调研统计
 */
export const getInstitutionResearchStatsTool: BuiltInTool = {
	name: 'get_institution_research_stats',
	description: '获取机构调研统计数据，包括调研机构数量、调研次数、接待方式等',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码，例如: 600000，不填则返回所有股票的调研统计'
			},
			start_date: {
				type: 'string',
				description: '开始日期，格式: YYYY-MM-DD'
			},
			end_date: {
				type: 'string',
				description: '结束日期，格式: YYYY-MM-DD'
			}
		},
		required: []
	},
	execute: async (params: { symbol?: string; start_date?: string; end_date?: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			let filter = '';
			
			if (params.symbol) {
				filter += `(SECURITY_CODE="${params.symbol}")`;
			}
			if (params.start_date && params.end_date) {
				filter += `(SURVEY_DATE>='${params.start_date}')(SURVEY_DATE<='${params.end_date}')`;
			}

			const queryParams = new URLSearchParams({
				reportName: 'RPT_ORG_SURVEY',
				columns: 'ALL',
				filter: filter || '()',
				sortColumns: 'SURVEY_DATE',
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
 * 获取股权质押概况
 */
export const getEquityPledgeProfileTool: BuiltInTool = {
	name: 'get_equity_pledge_profile',
	description: '获取股权质押市场概况，包括质押股票数量、质押市值、质押比例等整体数据',
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
				reportName: 'RPT_PLEDGE_OVERVIEW',
				columns: 'ALL',
				sortColumns: 'STATISTICS_DATE',
				sortTypes: '-1',
				pageSize: '10',
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
 * 获取上市公司质押比例
 */
export const getCompanyPledgeRatioTool: BuiltInTool = {
	name: 'get_company_pledge_ratio',
	description: '获取上市公司质押比例数据，可按质押比例排序查看高质押风险公司',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码，例如: 600000，不填则返回所有公司'
			}
		},
		required: []
	},
	execute: async (params: { symbol?: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const filter = params.symbol ? `(SECURITY_CODE="${params.symbol}")` : '()';

			const queryParams = new URLSearchParams({
				reportName: 'RPT_PLEDGE_RATIO',
				columns: 'ALL',
				filter: filter,
				sortColumns: 'PLEDGE_RATIO',
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
