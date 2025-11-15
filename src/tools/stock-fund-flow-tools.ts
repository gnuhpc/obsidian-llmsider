// Stock fund flow data tools
// Provides individual stock, sector, main force fund flow data

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

/**
 * 获取个股资金流向 - 东方财富
 * Get individual stock fund flow - Eastmoney
 */
export const getIndividualFundFlowTool: BuiltInTool = {
	name: 'get_individual_fund_flow',
	description: 'Get fund flow data for individual stock, including main force, retail, institutional inflow/outflow',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Stock symbol (e.g., "000001", "600000")'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }): Promise<string> => {
		try {
			const symbol = args.symbol;
			const secid = symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
			
			const url = `http://push2.eastmoney.com/api/qt/stock/fflow/kline/get?lmt=0&klt=101&secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.data || !data.data.klines) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const flowData = data.data.klines.map((line: string) => {
				const parts = line.split(',');
				return {
					date: parts[0],
					main_force_net_inflow: parseFloat(parts[1]),
					small_order_net_inflow: parseFloat(parts[2]),
					medium_order_net_inflow: parseFloat(parts[3]),
					large_order_net_inflow: parseFloat(parts[4]),
					super_large_order_net_inflow: parseFloat(parts[5]),
					main_force_net_pct: parseFloat(parts[7]),
					small_order_net_pct: parseFloat(parts[8]),
					medium_order_net_pct: parseFloat(parts[9]),
					large_order_net_pct: parseFloat(parts[10]),
					super_large_order_net_pct: parseFloat(parts[11]),
					close_price: parseFloat(parts[12]),
					change_pct: parseFloat(parts[13])
				};
			});
			
			return JSON.stringify({
				symbol,
				name: data.data.name,
				data: flowData
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取个股资金流排名 - 东方财富
 * Get stock fund flow ranking - Eastmoney
 */
export const getStockFundFlowRankTool: BuiltInTool = {
	name: 'get_stock_fund_flow_rank',
	description: 'Get ranking of stocks by fund flow (main force net inflow), useful for finding stocks with strong capital inflow',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			rank_type: {
				type: 'string',
				description: 'Ranking type: "today" for today, "3days" for recent 3 days, "5days" for recent 5 days, "10days" for recent 10 days',
				enum: ['today', '3days', '5days', '10days'],
				default: 'today'
			},
			limit: {
				type: 'number',
				description: 'Number of stocks to return (default: 100)',
				default: 100
			}
		},
		required: []
	},
	execute: async (args: { rank_type?: string; limit?: number }): Promise<string> => {
		try {
			const rankType = args.rank_type || 'today';
			const limit = args.limit || 100;
			
			const fieldMap: Record<string, string> = {
				'today': 'f62',
				'3days': 'f267',
				'5days': 'f164',
				'10days': 'f174'
			};
			
			const field = fieldMap[rankType] || 'f62';
			
			const url = `http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${limit}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=${field}&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152,f62,f164,f174,f267`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.data || !data.data.diff) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const stocks = data.data.diff.map((item: any) => ({
				symbol: item.f12,
				name: item.f14,
				price: item.f2,
				change_pct: item.f3,
				main_net_inflow: item.f62,
				main_net_inflow_pct: item.f184,
				three_days_net_inflow: item.f267,
				five_days_net_inflow: item.f164,
				ten_days_net_inflow: item.f174
			}));
			
			return JSON.stringify({
				rank_type: rankType,
				total: stocks.length,
				stocks: stocks
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取板块资金流排名 - 东方财富
 * Get sector fund flow ranking - Eastmoney
 */
export const getSectorFundFlowRankTool: BuiltInTool = {
	name: 'get_sector_fund_flow_rank',
	description: 'Get ranking of industry sectors or concept boards by fund flow',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			sector_type: {
				type: 'string',
				description: 'Sector type: "industry" for industry sectors, "concept" for concept boards',
				enum: ['industry', 'concept'],
				default: 'industry'
			},
			limit: {
				type: 'number',
				description: 'Number of sectors to return (default: 100)',
				default: 100
			}
		},
		required: []
	},
	execute: async (args: { sector_type?: string; limit?: number }): Promise<string> => {
		try {
			const sectorType = args.sector_type || 'industry';
			const limit = args.limit || 100;
			
			const typeMap: Record<string, string> = {
				'industry': 'm:90+t:2+f:!50',
				'concept': 'm:90+t:3+f:!50'
			};
			
			const fs = typeMap[sectorType] || typeMap['industry'];
			const url = `http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${limit}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f62&fs=${fs}&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152,f62,f184`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.data || !data.data.diff) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const sectors = data.data.diff.map((item: any) => ({
				code: item.f12,
				name: item.f14,
				change_pct: item.f3,
				main_net_inflow: item.f62,
				main_net_inflow_pct: item.f184,
				leading_stock: item.f128
			}));
			
			return JSON.stringify({
				sector_type: sectorType,
				total: sectors.length,
				sectors: sectors
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取大盘资金流向 - 东方财富
 * Get market fund flow - Eastmoney
 */
export const getMarketFundFlowTool: BuiltInTool = {
	name: 'get_market_fund_flow',
	description: 'Get overall market fund flow data, including A-share market main force inflow/outflow',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
			// 获取沪深A股大盘资金流向
			const url = 'http://push2.eastmoney.com/api/qt/stock/fflow/kline/get?lmt=0&klt=101&secid=1.000001&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65&ut=b2884a393a59ad64002292a3e90d46a5';
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.data || !data.data.klines) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			// 获取最新一天的数据
			const latest = data.data.klines[data.data.klines.length - 1];
			const parts = latest.split(',');
			
			return JSON.stringify({
				date: parts[0],
				main_force_net_inflow: parseFloat(parts[1]),
				small_order_net_inflow: parseFloat(parts[2]),
				medium_order_net_inflow: parseFloat(parts[3]),
				large_order_net_inflow: parseFloat(parts[4]),
				super_large_order_net_inflow: parseFloat(parts[5]),
				main_force_net_pct: parseFloat(parts[7]),
				small_order_net_pct: parseFloat(parts[8]),
				medium_order_net_pct: parseFloat(parts[9]),
				large_order_net_pct: parseFloat(parts[10]),
				super_large_order_net_pct: parseFloat(parts[11]),
				note: 'Positive values indicate net inflow, negative values indicate net outflow. Main force = large orders + super large orders.'
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};
