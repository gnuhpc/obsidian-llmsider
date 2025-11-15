// Forex (foreign exchange) data tools
// Provides FX spot, swap, currency pair quotes

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

/**
 * 获取人民币外汇即期报价
 */
export const getFXSpotQuoteTool: BuiltInTool = {
	name: 'get_fx_spot_quote',
	description: 'Get RMB foreign exchange spot quotes from China Foreign Exchange Trade System',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
			// 中国外汇交易中心接口
			const url = 'http://www.chinamoney.com.cn/ags/ms/cm-u-bk-ccpr/CcprHisNew?lang=CN&startDate=&endDate=&currency=&pageNum=1&pageSize=15';
			
			const response = await requestUrl({ url, method: 'GET' });
			const data = JSON.parse(response.text);
			
			return JSON.stringify({ data: data.records }, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取实时汇率
 */
export const getRealTimeExchangeRateTool: BuiltInTool = {
	name: 'get_realtime_exchange_rate',
	description: 'Get real-time exchange rates for major currency pairs (USD, EUR, GBP, JPY, etc.)',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			base_currency: {
				type: 'string',
				description: 'Base currency code (e.g., "USD", "EUR", "CNY")',
				default: 'USD'
			},
			target_currency: {
				type: 'string',
				description: 'Target currency code (e.g., "CNY", "EUR", "JPY")',
				default: 'CNY'
			}
		},
		required: []
	},
	execute: async (args: { base_currency?: string; target_currency?: string }): Promise<string> => {
		try {
			const base = args.base_currency || 'USD';
			const target = args.target_currency || 'CNY';
			
			// 使用新浪财经外汇接口
			const pair = `${base}${target}`;
			const url = `https://hq.sinajs.cn/list=fx_s${pair.toLowerCase()}`;
			
			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'Referer': 'https://finance.sina.com.cn'
				}
			});
			
			const text = response.text;
			const match = text.match(/="(.+)"/);
			if (!match) {
				return JSON.stringify({ error: 'Exchange rate not found' }, null, 2);
			}
			
			const parts = match[1].split(',');
			return JSON.stringify({
				pair: `${base}/${target}`,
				rate: parseFloat(parts[8]),
				time: parts[0],
				high: parseFloat(parts[4]),
				low: parseFloat(parts[5]),
				open: parseFloat(parts[6])
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};
