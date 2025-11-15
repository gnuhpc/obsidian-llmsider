import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 获取期货持仓排名（详细）
 */
export const getFuturesHoldingRankDetailTool: BuiltInTool = {
	name: 'get_futures_holding_rank_detail',
	description: '获取期货品种的持仓排名详细数据，包括成交量排名、持买单量排名、持卖单量排名',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '期货品种代码，如: CU（铜）、AL（铝）、RB（螺纹钢）等'
			},
			date: {
				type: 'string',
				description: '日期，格式: YYYYMMDD'
			}
		},
		required: ['symbol', 'date']
	},
	execute: async (params: { symbol: string; date: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_FUTURES_HOLDING_RANK',
				columns: 'ALL',
				filter: `(PRODUCT_CODE="${params.symbol}")(TRADE_DATE="${params.date}")`,
				sortColumns: 'RANK_TYPE,RANK',
				sortTypes: '1,1',
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
 * 获取仓单日报（详细）
 */
export const getWarehouseReceiptDetailTool: BuiltInTool = {
	name: 'get_warehouse_receipt_detail',
	description: '获取期货仓单日报详细数据，可用于分析现货供应情况',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '期货品种代码'
			},
			date: {
				type: 'string',
				description: '日期，格式: YYYYMMDD'
			}
		},
		required: ['symbol', 'date']
	},
	execute: async (params: { symbol: string; date: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_WAREHOUSE_RECEIPT',
				columns: 'ALL',
				filter: `(PRODUCT_CODE="${params.symbol}")(TRADE_DATE="${params.date}")`,
				sortColumns: 'WAREHOUSE',
				sortTypes: '1',
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
 * 获取期货展期收益率
 */
export const getFuturesRollYieldTool: BuiltInTool = {
	name: 'get_futures_roll_yield',
	description: '获取期货展期收益率数据，用于分析远近月合约价差',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '期货品种代码'
			}
		},
		required: ['symbol']
	},
	execute: async (params: { symbol: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_FUTURES_ROLL_YIELD',
				columns: 'ALL',
				filter: `(PRODUCT_CODE="${params.symbol}")`,
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
 * 获取期货现货价格对比
 */
export const getFuturesSpotPriceTool: BuiltInTool = {
	name: 'get_futures_spot_price',
	description: '获取期货与现货价格对比数据，用于分析基差',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '期货品种代码'
			}
		},
		required: ['symbol']
	},
	execute: async (params: { symbol: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_FUTURES_SPOT_PRICE',
				columns: 'ALL',
				filter: `(PRODUCT_CODE="${params.symbol}")`,
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
 * 获取大宗商品库存数据
 */
export const getCommodityInventoryTool: BuiltInTool = {
	name: 'get_commodity_inventory',
	description: '获取大宗商品社会库存数据',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '商品类型: 螺纹钢, 热轧卷板, 线材, 铜, 铝, 锌, 铅, 镍'
			}
		},
		required: ['symbol']
	},
	execute: async (params: { symbol: string }) => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = new URLSearchParams({
				reportName: 'RPT_COMMODITY_INVENTORY',
				columns: 'ALL',
				filter: `(COMMODITY_NAME="${params.symbol}")`,
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
