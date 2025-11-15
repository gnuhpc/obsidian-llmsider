// Margin trading (融资融券) data tools
// Provides margin trading and securities lending data

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

/**
 * 获取融资融券汇总数据 - 上交所
 */
export const getMarginTradingSummarySSETool: BuiltInTool = {
	name: 'get_margin_trading_summary_sse',
	description: 'Get margin trading summary data from Shanghai Stock Exchange, including total margin balance, securities lending balance',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'http://query.sse.com.cn/marketdata/tradedata/queryMargin.do?jsonCallBack=jsonpCallback&isPagination=false';
			
			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'Referer': 'http://www.sse.com.cn/'
				}
			});
			
			const text = response.text;
			const match = text.match(/jsonpCallback\((.+)\)/);
			if (!match) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const data = JSON.parse(match[1]);
			return JSON.stringify({ data: data.result }, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取融资融券明细数据 - 东方财富
 */
export const getMarginTradingDetailTool: BuiltInTool = {
	name: 'get_margin_trading_detail',
	description: 'Get detailed margin trading data for individual stocks, including margin balance, lending balance, etc.',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Date in format YYYY-MM-DD'
			}
		},
		required: []
	},
	execute: async (args: { date?: string }): Promise<string> => {
		try {
			const date = args.date || new Date().toISOString().split('T')[0];
			const dateParam = date.replace(/-/g, '');
			
			const url = `http://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_RZRQ_LSHJ&columns=ALL&pageNumber=1&pageSize=500&sortColumns=RZYE&sortTypes=-1&filter=(TRADE_DATE='${dateParam}')`;
			
			const response = await requestUrl({ url, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result || !data.result.data) {
				return JSON.stringify({ error: 'No data available' }, null, 2);
			}
			
			const stocks = data.result.data.map((item: any) => ({
				symbol: item.SECURITY_CODE,
				name: item.SECURITY_NAME_ABBR,
				margin_balance: item.RZYE,
				margin_buy_amount: item.RZMRE,
				lending_balance: item.RQYE,
				lending_sell_volume: item.RQMCL,
				total_balance: item.RZRQYE
			}));
			
			return JSON.stringify({ date, total: stocks.length, stocks }, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};
