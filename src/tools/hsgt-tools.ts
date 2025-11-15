// Shanghai-Shenzhen-Hong Kong Stock Connect data tools
// Provides HSGT holdings and fund flow data

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

/**
 * 获取沪深港通持股数据 - 东方财富
 */
export const getHSGTHoldingsTool: BuiltInTool = {
	name: 'get_hsgt_holdings',
	description: 'Get Shanghai-Shenzhen-Hong Kong Stock Connect holdings data, showing which A-shares are held by Hong Kong investors',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			market: {
				type: 'string',
				description: 'Market: "SH" for Shanghai Connect, "SZ" for Shenzhen Connect, "ALL" for both',
				enum: ['SH', 'SZ', 'ALL'],
				default: 'ALL'
			},
			limit: {
				type: 'number',
				description: 'Number of stocks to return',
				default: 100
			}
		},
		required: []
	},
	execute: async (args: { market?: string; limit?: number }): Promise<string> => {
		try {
			const market = args.market || 'ALL';
			const limit = args.limit || 100;
			
			const url = `http://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_MUTUAL_STOCK_NORTHSTA&columns=ALL&pageNumber=1&pageSize=${limit}&sortColumns=ADD_MARKET_CAP&sortTypes=-1&filter=(INTERVAL_TYPE="1")`;
			
			const response = await requestUrl({ url, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result || !data.result.data) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const stocks = data.result.data.map((item: any) => ({
				symbol: item.SECURITY_CODE,
				name: item.SECURITY_NAME_ABBR,
				holding_shares: item.HOLD_SHARES,
				holding_pct: item.HOLD_MARKET_CAP_RATIO,
				holding_value: item.HOLD_MARKET_CAP,
				change_shares: item.ADD_SHARES_AMP,
				change_value: item.ADD_MARKET_CAP
			}));
			
			return JSON.stringify({ market, total: stocks.length, stocks }, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取沪深港通资金流向 - 东方财富
 */
export const getHSGTFundFlowTool: BuiltInTool = {
	name: 'get_hsgt_fund_flow',
	description: 'Get Shanghai-Shenzhen-Hong Kong Stock Connect fund flow data (north/south bound money flow)',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'http://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_MUTUAL_MARKET_STA&columns=ALL&pageNumber=1&pageSize=10&sortColumns=TRADE_DATE&sortTypes=-1';
			
			const response = await requestUrl({ url, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result || !data.result.data) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const latest = data.result.data[0];
			return JSON.stringify({
				date: latest.TRADE_DATE,
				northbound_net_inflow: latest.NORTH_MONEY,
				shanghai_connect_net: latest.HGT_NETBUY_AMT,
				shenzhen_connect_net: latest.SZGT_NETBUY_AMT,
				southbound_net_inflow: latest.SOUTH_MONEY,
				hk_shanghai_net: latest.SHGT_NETBUY_AMT,
				hk_shenzhen_net: latest.ZGGT_NETBUY_AMT
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};
