// Stock sector and concept board data tools
// Provides industry sector, concept board data and constituents

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

/**
 * 获取行业板块实时行情 - 东方财富
 * Get industry sector real-time quotes - Eastmoney
 */
export const getIndustrySectorSpotTool: BuiltInTool = {
	name: 'get_industry_sector_spot',
	description: 'Get real-time quotes for industry sectors, including sector index, change percentage, leading stocks, etc.',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			limit: {
				type: 'number',
				description: 'Number of sectors to return (default: 100)',
				default: 100
			}
		},
		required: []
	},
	execute: async (args: { limit?: number }): Promise<string> => {
		try {
			const limit = args.limit || 100;
			
			const url = `http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${limit}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=m:90+t:2+f:!50&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152`;
			
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
				change: item.f4,
				total_market_cap: item.f20,
				leading_stock: item.f128,
				up_count: item.f104,
				down_count: item.f105,
				amount: item.f6
			}));
			
			return JSON.stringify({
				total: sectors.length,
				sectors: sectors
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取概念板块实时行情 - 东方财富
 * Get concept board real-time quotes - Eastmoney
 */
export const getConceptBoardSpotTool: BuiltInTool = {
	name: 'get_concept_board_spot',
	description: 'Get real-time quotes for concept boards, including board index, change percentage, leading stocks, etc.',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			limit: {
				type: 'number',
				description: 'Number of concept boards to return (default: 100)',
				default: 100
			}
		},
		required: []
	},
	execute: async (args: { limit?: number }): Promise<string> => {
		try {
			const limit = args.limit || 100;
			
			const url = `http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${limit}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=m:90+t:3+f:!50&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.data || !data.data.diff) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const concepts = data.data.diff.map((item: any) => ({
				code: item.f12,
				name: item.f14,
				change_pct: item.f3,
				change: item.f4,
				leading_stock: item.f128,
				up_count: item.f104,
				down_count: item.f105,
				amount: item.f6
			}));
			
			return JSON.stringify({
				total: concepts.length,
				concepts: concepts
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取板块成份股 - 东方财富
 * Get sector constituent stocks - Eastmoney
 */
export const getSectorConstituentsTool: BuiltInTool = {
	name: 'get_sector_constituents',
	description: 'Get constituent stocks of a specific sector or concept board',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			sector_code: {
				type: 'string',
				description: 'Sector or concept board code (e.g., "BK0420" for semiconductor, "BK0447" for AI concept)'
			},
			sector_type: {
				type: 'string',
				description: 'Sector type: "industry" for industry sector, "concept" for concept board',
				enum: ['industry', 'concept'],
				default: 'concept'
			}
		},
		required: ['sector_code']
	},
	execute: async (args: { sector_code: string; sector_type?: string }): Promise<string> => {
		try {
			const sectorCode = args.sector_code;
			const sectorType = args.sector_type || 'concept';
			
			const url = `http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=1000&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=b:${sectorCode}+f:!50&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.data || !data.data.diff) {
				return JSON.stringify({ error: 'No data available for this sector' }, null, 2);
			}
			
			const stocks = data.data.diff.map((item: any) => ({
				symbol: item.f12,
				name: item.f14,
				price: item.f2,
				change_pct: item.f3,
				change: item.f4,
				volume: item.f5,
				amount: item.f6,
				turnover_rate: item.f8,
				pe_ratio: item.f9
			}));
			
			return JSON.stringify({
				sector_code: sectorCode,
				sector_type: sectorType,
				total: stocks.length,
				stocks: stocks
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取板块历史行情 - 东方财富
 * Get sector historical data - Eastmoney
 */
export const getSectorHistTool: BuiltInTool = {
	name: 'get_sector_hist',
	description: 'Get historical data for industry sector or concept board',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			sector_code: {
				type: 'string',
				description: 'Sector or concept board code'
			},
			start_date: {
				type: 'string',
				description: 'Start date in format YYYYMMDD (e.g., "20240101")'
			},
			end_date: {
				type: 'string',
				description: 'End date in format YYYYMMDD (e.g., "20241231")'
			}
		},
		required: ['sector_code']
	},
	execute: async (args: { sector_code: string; start_date?: string; end_date?: string }): Promise<string> => {
		try {
			const sectorCode = args.sector_code;
			const startDate = args.start_date || '19900101';
			const endDate = args.end_date || new Date().toISOString().split('T')[0].replace(/-/g, '');
			
			const secid = `90.${sectorCode}`;
			const url = `http://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&beg=${startDate}&end=${endDate}`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.data || !data.data.klines) {
				return JSON.stringify({ error: 'No data available for this sector' }, null, 2);
			}
			
			const history = data.data.klines.map((line: string) => {
				const parts = line.split(',');
				return {
					date: parts[0],
					open: parseFloat(parts[1]),
					close: parseFloat(parts[2]),
					high: parseFloat(parts[3]),
					low: parseFloat(parts[4]),
					volume: parseFloat(parts[5]),
					amount: parseFloat(parts[6]),
					change_pct: parseFloat(parts[8]),
					change: parseFloat(parts[9])
				};
			});
			
			return JSON.stringify({
				sector_code: sectorCode,
				name: data.data.name,
				data: history
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};
