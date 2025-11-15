import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 获取技术选股-创新高
 */
export const getStockNewHighTool: BuiltInTool = {
	name: 'get_stock_new_high',
	description: '获取创历史新高或近期新高的股票列表，可用于捕捉强势股',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			period: {
				type: 'string',
				description: '周期类型: 60日新高, 半年新高, 一年新高, 历史新高',
				enum: ['60', '180', '360', 'all']
			}
		},
		required: []
	},
	execute: async (params: { period?: string }) => {
		try {
			const period = params.period || '60';
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_TECHNICAL_NEWPRICE',
				columns: 'ALL',
				filter: `(PERIOD="${period}")`,
				sortColumns: 'TRADE_DATE,CHANGE_RATE',
				sortTypes: '-1,-1',
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
 * 获取技术选股-创新低
 */
export const getStockNewLowTool: BuiltInTool = {
	name: 'get_stock_new_low',
	description: '获取创历史新低或近期新低的股票列表，可用于识别弱势股或寻找反转机会',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			period: {
				type: 'string',
				description: '周期类型: 60日新低, 半年新低, 一年新低, 历史新低',
				enum: ['60', '180', '360', 'all']
			}
		},
		required: []
	},
	execute: async (params: { period?: string }) => {
		try {
			const period = params.period || '60';
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_TECHNICAL_NEWLOW',
				columns: 'ALL',
				filter: `(PERIOD="${period}")`,
				sortColumns: 'TRADE_DATE,CHANGE_RATE',
				sortTypes: '-1,1',
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
 * 获取连续上涨股票
 */
export const getContinuousRiseTool: BuiltInTool = {
	name: 'get_continuous_rise',
	description: '获取连续上涨的股票列表，包括连涨天数、累计涨幅等',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			min_days: {
				type: 'number',
				description: '最少连涨天数，默认3天'
			}
		},
		required: []
	},
	execute: async (params: { min_days?: number }) => {
		try {
			const minDays = params.min_days || 3;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_TECHNICAL_CONTINUOUS_RISE',
				columns: 'ALL',
				filter: `(CONTINUOUS_DAYS>=${minDays})`,
				sortColumns: 'CONTINUOUS_DAYS,CUMULATIVE_CHANGE',
				sortTypes: '-1,-1',
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
 * 获取连续下跌股票
 */
export const getContinuousFallTool: BuiltInTool = {
	name: 'get_continuous_fall',
	description: '获取连续下跌的股票列表，包括连跌天数、累计跌幅等',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			min_days: {
				type: 'number',
				description: '最少连跌天数，默认3天'
			}
		},
		required: []
	},
	execute: async (params: { min_days?: number }) => {
		try {
			const minDays = params.min_days || 3;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_TECHNICAL_CONTINUOUS_FALL',
				columns: 'ALL',
				filter: `(CONTINUOUS_DAYS>=${minDays})`,
				sortColumns: 'CONTINUOUS_DAYS,CUMULATIVE_CHANGE',
				sortTypes: '-1,1',
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
 * 获取持续放量股票
 */
export const getContinuousVolumeTool: BuiltInTool = {
	name: 'get_continuous_volume',
	description: '获取持续放量的股票列表，可用于识别资金持续流入的股票',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			min_days: {
				type: 'number',
				description: '最少连续放量天数，默认3天'
			}
		},
		required: []
	},
	execute: async (params: { min_days?: number }) => {
		try {
			const minDays = params.min_days || 3;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_TECHNICAL_VOLUME_INCREASE',
				columns: 'ALL',
				filter: `(CONTINUOUS_DAYS>=${minDays})`,
				sortColumns: 'CONTINUOUS_DAYS,VOLUME_RATIO',
				sortTypes: '-1,-1',
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
 * 获取持续缩量股票
 */
export const getContinuousVolumeShrinkTool: BuiltInTool = {
	name: 'get_continuous_volume_shrink',
	description: '获取持续缩量的股票列表，可用于识别交投清淡或趋势末期的股票',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			min_days: {
				type: 'number',
				description: '最少连续缩量天数，默认3天'
			}
		},
		required: []
	},
	execute: async (params: { min_days?: number }) => {
		try {
			const minDays = params.min_days || 3;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_TECHNICAL_VOLUME_DECREASE',
				columns: 'ALL',
				filter: `(CONTINUOUS_DAYS>=${minDays})`,
				sortColumns: 'CONTINUOUS_DAYS,VOLUME_RATIO',
				sortTypes: '-1,1',
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
 * 获取量价齐升股票
 */
export const getVolumePriceRiseTool: BuiltInTool = {
	name: 'get_volume_price_rise',
	description: '获取量价齐升的股票列表，价涨量增被认为是健康的上涨趋势',
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
				reportName: 'RPT_TECHNICAL_VPPRICE_RISE',
				columns: 'ALL',
				sortColumns: 'TRADE_DATE,CHANGE_RATE',
				sortTypes: '-1,-1',
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
 * 获取量价齐跌股票
 */
export const getVolumePriceFallTool: BuiltInTool = {
	name: 'get_volume_price_fall',
	description: '获取量价齐跌的股票列表，价跌量增可能预示恐慌性抛售',
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
				reportName: 'RPT_TECHNICAL_VPPRICE_FALL',
				columns: 'ALL',
				sortColumns: 'TRADE_DATE,CHANGE_RATE',
				sortTypes: '-1,1',
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
 * 获取板块异动
 */
export const getBoardAnomalyTool: BuiltInTool = {
	name: 'get_board_anomaly',
	description: '获取板块异动数据，帮助识别市场热点板块的快速变化',
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
				reportName: 'RPT_BOARD_ANOMALY',
				columns: 'ALL',
				sortColumns: 'ANOMALY_TIME',
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
