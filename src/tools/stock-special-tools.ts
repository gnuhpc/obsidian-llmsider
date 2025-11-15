// Stock special data tools - Dragon & Tiger list, Limit Up/Down, IPO, Block trades
// Provides special trading data and market features

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

/**
 * 获取龙虎榜数据 - 东方财富
 * Get Dragon & Tiger list data - Eastmoney
 */
export const getDragonTigerListTool: BuiltInTool = {
	name: 'get_dragon_tiger_list',
	description: 'Get Dragon & Tiger list data (stocks with unusual trading activity disclosed by exchanges), including top trading desks and their buy/sell amounts',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Date in format YYYY-MM-DD (e.g., "2024-01-15"). Leave empty for latest trading day.'
			}
		},
		required: []
	},
	execute: async (args: { date?: string }): Promise<string> => {
		try {
			const date = args.date || new Date().toISOString().split('T')[0];
			const dateParam = date.replace(/-/g, '');
			
			const url = `http://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DAILYBILLBOARD_DAILYDETAILSBUY&columns=ALL&pageNumber=1&pageSize=50&sortColumns=TRADE_DATE,SECURITY_CODE&sortTypes=-1,-1&filter=(TRADE_DATE%3D'${dateParam}')`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.result || !data.result.data) {
				return JSON.stringify({ error: 'No data available for this date' }, null, 2);
			}
			
			const stocks = data.result.data.map((item: any) => ({
				symbol: item.SECURITY_CODE,
				name: item.SECURITY_NAME_ABBR,
				close_price: item.CLOSE_PRICE,
				change_pct: item.CHANGE_RATE,
				turnover_rate: item.TURNOVER_RATE,
				net_amount: item.NET_AMT,
				net_rate: item.NET_RATE,
				reason: item.EXPLANATION,
				buy_amount: item.BUY,
				sell_amount: item.SELL,
				total_amount: item.ACCUM_AMOUNT
			}));
			
			return JSON.stringify({
				date,
				total: stocks.length,
				stocks: stocks
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取涨停板行情 - 东方财富
 * Get limit up stocks - Eastmoney
 */
export const getLimitUpPoolTool: BuiltInTool = {
	name: 'get_limit_up_pool',
	description: 'Get stocks that hit the daily limit up (涨停), including first limit up time, open count, reasons, etc.',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			pool_type: {
				type: 'string',
				description: 'Pool type: "today" for today\'s limit up, "strong" for strong stocks, "sub_new" for sub-new stocks, "broken" for broken limit up',
				enum: ['today', 'strong', 'sub_new', 'broken'],
				default: 'today'
			}
		},
		required: []
	},
	execute: async (args: { pool_type?: string }): Promise<string> => {
		try {
			const poolType = args.pool_type || 'today';
			
			const poolMap: Record<string, string> = {
				'today': 'ztgc', // 涨停股池
				'strong': 'qsgc', // 强势股池
				'sub_new': 'cxgc', // 次新股池
				'broken': 'zbgc'  // 炸板股池
			};
			
			const pool = poolMap[poolType] || 'ztgc';
			const url = `http://push2ex.eastmoney.com/getTopicZTPool?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=200&sort=fbt:asc&js=var%20data_tab_1=_content_&_=${Date.now()}`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			// 解析返回的JavaScript代码
			const text = response.text;
			const match = text.match(/var data_tab_1=({.+})/);
			if (!match) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const data = JSON.parse(match[1]);
			if (!data.data || !data.data.pool) {
				return JSON.stringify({ error: 'No limit up stocks today' }, null, 2);
			}
			
			const stocks = data.data.pool.map((item: any) => ({
				symbol: item.c,
				name: item.n,
				price: item.p,
				change_pct: item.zdp,
				first_limit_up_time: item.ztsj,
				last_limit_up_time: item.lbsj,
				open_count: item.zbc,
				turnover_rate: item.hs,
				reason: item.lzs,
				amount: item.je,
				market_cap: item.ltsz
			}));
			
			return JSON.stringify({
				pool_type: poolType,
				total: stocks.length,
				stocks: stocks
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取跌停板行情 - 东方财富
 * Get limit down stocks - Eastmoney
 */
export const getLimitDownPoolTool: BuiltInTool = {
	name: 'get_limit_down_pool',
	description: 'Get stocks that hit the daily limit down (跌停)',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
			const url = `http://push2ex.eastmoney.com/getTopicDTPool?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=200&sort=fbt:asc&js=var%20data_tab_1=_content_&_=${Date.now()}`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const text = response.text;
			const match = text.match(/var data_tab_1=({.+})/);
			if (!match) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const data = JSON.parse(match[1]);
			if (!data.data || !data.data.pool) {
				return JSON.stringify({ error: 'No limit down stocks today' }, null, 2);
			}
			
			const stocks = data.data.pool.map((item: any) => ({
				symbol: item.c,
				name: item.n,
				price: item.p,
				change_pct: item.zdp,
				first_limit_down_time: item.dtsj,
				open_count: item.dtbc,
				turnover_rate: item.hs,
				amount: item.je
			}));
			
			return JSON.stringify({
				total: stocks.length,
				stocks: stocks
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取新股申购数据 - 东方财富
 * Get IPO subscription data - Eastmoney
 */
export const getIPOSubscriptionDataTool: BuiltInTool = {
	name: 'get_ipo_subscription_data',
	description: 'Get IPO (new stock) subscription and listing data, including subscription date, issue price, winning rate, etc.',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			status: {
				type: 'string',
				description: 'IPO status: "upcoming" for upcoming IPOs, "current" for current subscription, "listed" for recently listed',
				enum: ['upcoming', 'current', 'listed'],
				default: 'current'
			}
		},
		required: []
	},
	execute: async (args: { status?: string }): Promise<string> => {
		try {
			const status = args.status || 'current';
			
			const url = 'http://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_IPO_INFO&columns=ALL&pageNumber=1&pageSize=100&sortColumns=APPLY_DATE&sortTypes=-1&filter=(APPLY_DATE>\'2024-01-01\')';
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.result || !data.result.data) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const ipos = data.result.data.map((item: any) => ({
				symbol: item.SECURITY_CODE,
				name: item.SECURITY_NAME,
				apply_code: item.APPLY_CODE,
				apply_date: item.APPLY_DATE,
				ballot_date: item.BALLOT_DATE,
				listing_date: item.LISTING_DATE,
				issue_price: item.ISSUE_PRICE,
				pe_ratio: item.PE_RATIO,
				success_rate: item.SUCCESS_RATE,
				issue_amount: item.ISSUE_NUM,
				online_issue_amount: item.ONLINE_ISSUE_NUM,
				funds_raised: item.RAISED_FUNDS,
				market: item.MARKET_TYPE
			}));
			
			return JSON.stringify({
				status,
				total: ipos.length,
				ipos: ipos
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取大宗交易明细 - 东方财富
 * Get block trade details - Eastmoney
 */
export const getBlockTradeDetailsTool: BuiltInTool = {
	name: 'get_block_trade_details',
	description: 'Get detailed block trade (大宗交易) data, including trade price, volume, discount rate, buyer/seller desks',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Date in format YYYY-MM-DD (e.g., "2024-01-15"). Leave empty for latest trading day.'
			},
			symbol: {
				type: 'string',
				description: 'Stock symbol (optional, leave empty to get all block trades)'
			}
		},
		required: []
	},
	execute: async (args: { date?: string; symbol?: string }): Promise<string> => {
		try {
			const date = args.date || new Date().toISOString().split('T')[0];
			const symbol = args.symbol || '';
			const dateParam = date.replace(/-/g, '');
			
			let filter = `(TRADE_DATE='${dateParam}')`;
			if (symbol) {
				filter = `(TRADE_DATE='${dateParam}')(SECURITY_CODE="${symbol}")`;
			}
			
			const url = `http://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DATA_BLOCKTRADE&columns=ALL&pageNumber=1&pageSize=200&sortColumns=TRADE_DATE,SECURITY_CODE&sortTypes=-1,-1&filter=${filter}`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.result || !data.result.data) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const trades = data.result.data.map((item: any) => ({
				symbol: item.SECURITY_CODE,
				name: item.SECURITY_NAME_ABBR,
				trade_price: item.DEAL_PRICE,
				close_price: item.CLOSE_PRICE,
				discount_rate: item.DISCOUNT_RATE,
				volume: item.DEAL_NUM,
				amount: item.DEAL_AMT,
				buyer_name: item.BUYER_NAME,
				seller_name: item.SELLER_NAME,
				trade_date: item.TRADE_DATE
			}));
			
			return JSON.stringify({
				date,
				symbol: symbol || 'all',
				total: trades.length,
				trades: trades,
				note: 'Negative discount_rate indicates trade below closing price (discount), positive indicates premium'
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};
