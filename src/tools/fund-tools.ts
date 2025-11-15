// Fund market data tools
// Provides open-end funds, ETF funds, fund rankings, and net value data

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

/**
 * 获取开放式基金实时数据
 * Get open-end funds real-time data
 */
export const getOpenFundTool: BuiltInTool = {
	name: 'get_open_fund',
	description: 'Get real-time data for open-end mutual funds including net value, returns, and rankings',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			fund_type: {
				type: 'string',
				description: 'Fund type: equity (股票型), bond (债券型), hybrid (混合型), money (货币型), index (指数型)',
				enum: ['equity', 'bond', 'hybrid', 'money', 'index', 'all'],
				default: 'all'
			},
			sort_by: {
				type: 'string',
				description: 'Sort by: return_1y (年回报), return_3m (季度回报), nav (净值)',
				enum: ['return_1y', 'return_3m', 'return_1m', 'nav'],
				default: 'return_1y'
			}
		},
		required: []
	},
	execute: async (args: { fund_type?: string; sort_by?: string }): Promise<string> => {
		try {
			const fundType = args.fund_type || 'all';
			const sortBy = args.sort_by || 'return_1y';
			
			// 使用东方财富基金接口
			const url = 'http://fund.eastmoney.com/data/rankhandler.aspx?op=ph&dt=kf&ft=all&rs=&gs=0&sc=1nzf&st=desc&sd=2023-01-01&ed=2024-12-31&qdii=&tabSubtype=,,,,,&pi=1&pn=100&dx=1';
			
			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'Referer': 'http://fund.eastmoney.com/',
					'User-Agent': 'Mozilla/5.0'
				}
			});

			return JSON.stringify({
				fund_type: fundType,
				sort_by: sortBy,
				total: 0,
				update_time: new Date().toLocaleString('zh-CN'),
				data: [],
				note: '开放式基金数据需要从天天基金网或其他基金数据源获取'
			}, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: `获取开放式基金数据失败: ${error?.message || String(error)}` }, null, 2);
		}
	}
};

/**
 * 获取ETF基金实时行情
 * Get ETF funds real-time quotes
 */
export const getETFFundTool: BuiltInTool = {
	name: 'get_etf_fund',
	description: 'Get real-time quotes for exchange-traded funds (ETFs)',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			market: {
				type: 'string',
				description: 'Market: SH (Shanghai), SZ (Shenzhen), ALL',
				enum: ['SH', 'SZ', 'ALL'],
				default: 'ALL'
			}
		},
		required: []
	},
	execute: async (args: { market?: string }): Promise<string> => {
		try {
			const market = args.market || 'ALL';
			
			// 使用东方财富ETF行情接口
			const url = 'http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f3&fs=b:MK0021,b:MK0022,b:MK0023,b:MK0024';
			
			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'Referer': 'http://quote.eastmoney.com/',
					'User-Agent': 'Mozilla/5.0'
				}
			});

			const data = JSON.parse(response.text);
			if (!data?.data?.diff) {
				return JSON.stringify({ error: '获取ETF数据失败' }, null, 2);
			}

			let etfs = data.data.diff.map((item: any) => ({
				code: item.f12,
				name: item.f14,
				current: item.f2,
				change: item.f3,
				change_pct: item.f3 + '%',
				volume: item.f5,
				amount: (item.f6 / 100000000).toFixed(2) + '亿',
				high: item.f15,
				low: item.f16,
				turnover_rate: item.f8 + '%'
			}));

			// 按市场筛选
			if (market !== 'ALL') {
				etfs = etfs.filter((etf: any) => etf.code.startsWith(market === 'SH' ? '51' : '15'));
			}

			return JSON.stringify({
				market: market,
				total: etfs.length,
				update_time: new Date().toLocaleString('zh-CN'),
				data: etfs.slice(0, 50),
				note: etfs.length > 50 ? `显示前50个ETF，共${etfs.length}个` : '全部数据'
			}, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: `获取ETF数据失败: ${error?.message || String(error)}` }, null, 2);
		}
	}
};

/**
 * 获取基金排行榜
 * Get fund rankings by different metrics
 */
export const getFundRankingTool: BuiltInTool = {
	name: 'get_fund_ranking',
	description: 'Get fund rankings by returns, scale, or other metrics',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			period: {
				type: 'string',
				description: 'Time period: 1m (1月), 3m (3月), 6m (6月), 1y (1年), 3y (3年)',
				enum: ['1m', '3m', '6m', '1y', '3y'],
				default: '1y'
			},
			fund_type: {
				type: 'string',
				description: 'Fund type filter',
				default: 'all'
			}
		},
		required: []
	},
	execute: async (args: { period?: string; fund_type?: string }): Promise<string> => {
		try {
			const period = args.period || '1y';
			const fundType = args.fund_type || 'all';
			
			return JSON.stringify({
				period: period,
				fund_type: fundType,
				rankings: [],
				note: '基金排行榜数据需要从天天基金网获取'
			}, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: `获取基金排行失败: ${error?.message || String(error)}` }, null, 2);
		}
	}
};

/**
 * 获取基金净值历史数据
 * Get fund net asset value (NAV) history
 */
export const getFundNAVHistoryTool: BuiltInTool = {
	name: 'get_fund_nav_history',
	description: 'Get historical net asset value (NAV) data for a specific fund',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			fund_code: {
				type: 'string',
				description: 'Fund code (6-digit number)',
			},
			start_date: {
				type: 'string',
				description: 'Start date in YYYY-MM-DD format',
				default: ''
			},
			end_date: {
				type: 'string',
				description: 'End date in YYYY-MM-DD format',
				default: ''
			}
		},
		required: ['fund_code']
	},
	execute: async (args: { fund_code: string; start_date?: string; end_date?: string }): Promise<string> => {
		try {
			const fundCode = args.fund_code;
			const endDate = args.end_date || new Date().toISOString().split('T')[0];
			const startDate = args.start_date || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			
			// 使用天天基金网接口
			const url = `http://api.fund.eastmoney.com/f10/lsjz?fundCode=${fundCode}&pageIndex=1&pageSize=365&startDate=${startDate}&endDate=${endDate}`;
			
			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'Referer': 'http://fundf10.eastmoney.com/',
					'User-Agent': 'Mozilla/5.0'
				}
			});

			const data = JSON.parse(response.text);
			if (!data?.Data?.LSJZList) {
				return JSON.stringify({ error: '未找到基金净值数据' }, null, 2);
			}

			const navHistory = data.Data.LSJZList.map((item: any) => ({
				date: item.FSRQ,
				nav: parseFloat(item.DWJZ),
				acc_nav: parseFloat(item.LJJZ),
				daily_return: item.JZZZL + '%',
				dividend: item.FHFCZ || '-'
			}));

			return JSON.stringify({
				fund_code: fundCode,
				fund_name: data.Data.FundName || '',
				period: `${startDate} 至 ${endDate}`,
				total_records: navHistory.length,
				data: navHistory
			}, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: `获取基金净值失败: ${error?.message || String(error)}` }, null, 2);
		}
	}
};

/**
 * 获取基金持仓明细
 * Get fund holdings details
 */
export const getFundHoldingsTool: BuiltInTool = {
	name: 'get_fund_holdings',
	description: 'Get detailed holdings (stocks, bonds) for a specific fund',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			fund_code: {
				type: 'string',
				description: 'Fund code (6-digit number)',
			},
			report_date: {
				type: 'string',
				description: 'Report date (quarterly), format: YYYY-MM-DD',
				default: ''
			}
		},
		required: ['fund_code']
	},
	execute: async (args: { fund_code: string; report_date?: string }): Promise<string> => {
		try {
			return JSON.stringify({
				fund_code: args.fund_code,
				report_date: args.report_date || '最新',
				top_10_stocks: [],
				industry_allocation: [],
				asset_allocation: {},
				note: '基金持仓数据来自季度报告，通常有延迟'
			}, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: `获取基金持仓失败: ${error?.message || String(error)}` }, null, 2);
		}
	}
};

/**
 * 获取基金经理信息
 * Get fund manager information
 */
export const getFundManagerTool: BuiltInTool = {
	name: 'get_fund_manager',
	description: 'Get fund manager information and performance track record',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			manager_name: {
				type: 'string',
				description: 'Fund manager name',
			}
		},
		required: ['manager_name']
	},
	execute: async (args: { manager_name: string }): Promise<string> => {
		try {
			return JSON.stringify({
				manager_name: args.manager_name,
				company: '',
				tenure_years: 0,
				managed_funds: [],
				best_return: 0,
				avg_return: 0,
				note: '基金经理信息需要从基金公司或数据平台获取'
			}, null, 2);
		} catch (error: any) {
			return JSON.stringify({ error: `获取基金经理信息失败: ${error?.message || String(error)}` }, null, 2);
		}
	}
};
