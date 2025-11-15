import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 获取中国社会融资规模
 */
export const getChinaSocialFinancingTool: BuiltInTool = {
	name: 'get_china_social_financing',
	description: '获取中国社会融资规模存量及增量数据，反映实体经济融资状况',
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
				reportName: 'RPT_ECONOMY_SOCIAL_FINANCE',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
 * 获取中国存款准备金率
 */
export const getChinaReserveRatioTool: BuiltInTool = {
	name: 'get_china_reserve_ratio',
	description: '获取中国存款准备金率调整历史数据，是重要的货币政策工具',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async () => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_ECONOMY_RESERVE_RATIO',
				columns: 'ALL',
				sortColumns: 'PUBLISH_DATE',
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
 * 获取中国工业增加值
 */
export const getChinaIndustrialValueAddedTool: BuiltInTool = {
	name: 'get_china_industrial_value_added',
	description: '获取中国规模以上工业增加值数据，反映工业生产活动',
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
				reportName: 'RPT_ECONOMY_INDUSTRIAL_VALUE',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
 * 获取美国非农就业数据
 */
export const getUSNonFarmPayrollTool: BuiltInTool = {
	name: 'get_us_non_farm_payroll',
	description: '获取美国非农就业人数数据，是最重要的美国经济指标之一',
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
				reportName: 'RPT_ECONOMY_NON_FARM',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
 * 获取美国ADP就业数据
 */
export const getUSADPEmploymentTool: BuiltInTool = {
	name: 'get_us_adp_employment',
	description: '获取美国ADP就业人数数据，是非农数据的先行指标',
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
				reportName: 'RPT_ECONOMY_ADP',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
 * 获取美国CPI数据
 */
export const getUSCPITool: BuiltInTool = {
	name: 'get_us_cpi',
	description: '获取美国消费者物价指数（CPI）数据，衡量通货膨胀',
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
				reportName: 'RPT_ECONOMY_CPI',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
 * 获取美国PPI数据
 */
export const getUSPPITool: BuiltInTool = {
	name: 'get_us_ppi',
	description: '获取美国生产者物价指数（PPI）数据，反映生产环节价格变化',
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
				reportName: 'RPT_ECONOMY_PPI',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
 * 获取美国PMI数据
 */
export const getUSPMITool: BuiltInTool = {
	name: 'get_us_pmi',
	description: '获取美国采购经理人指数（PMI）数据，包括制造业和服务业PMI',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				description: 'PMI类型: manufacturing（制造业）, services（服务业）',
				enum: ['manufacturing', 'services']
			}
		},
		required: []
	},
	execute: async (params: { type?: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const filter = params.type 
				? `(PMI_TYPE="${params.type}")` 
				: '()';

			const queryParams = new URLSearchParams({
				reportName: 'RPT_ECONOMY_PMI',
				columns: 'ALL',
				filter: filter,
				sortColumns: 'REPORT_DATE',
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
 * 获取美国零售销售数据
 */
export const getUSRetailSalesTool: BuiltInTool = {
	name: 'get_us_retail_sales',
	description: '获取美国零售销售数据，反映消费者支出情况',
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
				reportName: 'RPT_ECONOMY_RETAIL_SALES',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
 * 获取美国初请失业金人数
 */
export const getUSInitialJoblessTool: BuiltInTool = {
	name: 'get_us_initial_jobless',
	description: '获取美国初请失业金人数数据，高频就业指标',
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
				reportName: 'RPT_ECONOMY_INITIAL_JOBLESS',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
 * 获取美国EIA原油库存
 */
export const getUSEIACrudeTool: BuiltInTool = {
	name: 'get_us_eia_crude',
	description: '获取美国EIA原油库存数据，影响原油价格的重要指标',
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
				reportName: 'RPT_ECONOMY_EIA_CRUDE',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
 * 获取美国API原油库存
 */
export const getUSAPICrudeTool: BuiltInTool = {
	name: 'get_us_api_crude',
	description: '获取美国API原油库存数据，是EIA数据的先行指标',
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
				reportName: 'RPT_ECONOMY_API_CRUDE',
				columns: 'ALL',
				sortColumns: 'REPORT_DATE',
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
