// Stock market data tools - A-shares historical data
// Provides historical stock data

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

/**
 * 获取A股历史行情数据 - 东方财富
 * Get A-share historical data - Eastmoney
 */
export const getStockAShareHistTool: BuiltInTool = {
	name: 'get_stock_a_share_hist',
	description: 'Get historical daily data for A-share stocks, including OHLCV data, adjustable for forward/backward adjustment',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Stock symbol (e.g., "000001" for Ping An Bank, "600000" for SPDB)'
			},
			period: {
				type: 'string',
				description: 'Time period: "daily", "weekly", "monthly"',
				enum: ['daily', 'weekly', 'monthly'],
				default: 'daily'
			},
			adjust: {
				type: 'string',
				description: 'Price adjustment: "qfq" for forward adjustment, "hfq" for backward adjustment, "" for no adjustment',
				enum: ['qfq', 'hfq', ''],
				default: ''
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
		required: ['symbol']
	},
	execute: async (args: { symbol: string; period?: string; adjust?: string; start_date?: string; end_date?: string }): Promise<string> => {
		try {
			const symbol = args.symbol;
			const period = args.period || 'daily';
			const adjust = args.adjust || '';
			const startDate = args.start_date || '19900101';
			const endDate = args.end_date || new Date().toISOString().split('T')[0].replace(/-/g, '');
			
			const periodMap: Record<string, string> = {
				'daily': '101',
				'weekly': '102',
				'monthly': '103'
			};
			
			const klt = periodMap[period] || '101';
			const fqt = adjust === 'qfq' ? '1' : adjust === 'hfq' ? '2' : '0';
			
			// 判断是上海还是深圳股票
			const secid = symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
			
			const url = `http://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=${fqt}&beg=${startDate}&end=${endDate}`;
			
			const response = await requestUrl({
				url,
				method: 'GET'
			});
			
			const data = JSON.parse(response.text);
			if (!data.data || !data.data.klines) {
				return JSON.stringify({ error: 'No data available for this symbol' }, null, 2);
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
					amplitude: parseFloat(parts[7]),
					change_pct: parseFloat(parts[8]),
					change: parseFloat(parts[9]),
					turnover_rate: parseFloat(parts[10])
				};
			});
			
			return JSON.stringify({
				symbol,
				name: data.data.name,
				period,
				adjust,
				data: history
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};
