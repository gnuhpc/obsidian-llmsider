/**
 * Forex Supplementary Tools (Mastra Format)
 * 
 * 外汇补充数据工具
 * Additional FX data including swap quotes, pair quotes, and major pairs realtime data
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

/**
 * Tool: Get FX Swap Quote
 */
export const getFXSwapQuoteTool = createMastraTool({
  category: 'commodity-forex',
	id: 'fx_swap_quote',
	description: 'Get FX swap quote data, including forward points and swap prices',
	
	inputSchema: z.object({
		symbol: z.string()
			.describe('Currency pair code, e.g., "USDCNY"'),
		tenor: z.enum(['ON', 'TN', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'])
			.describe('Tenor, e.g., "1M" (1 month), "3M" (3 months), "6M" (6 months), "1Y" (1 year)')
			.optional()
			.default('3M')
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		symbol: z.string()
			.describe('Currency pair code'),
		tenor: z.string()
			.describe('Tenor'),
		update_time: z.string()
			.describe('Update time'),
		swap_points: z.object({
			bid: z.string().describe('Bid points'),
			ask: z.string().describe('Ask points'),
			mid: z.string().describe('Mid points')
		}).describe('Swap points'),
		forward_prices: z.object({
			bid: z.string().describe('Bid price'),
			ask: z.string().describe('Ask price'),
			mid: z.string().describe('Mid price')
		}).describe('Forward prices'),
		note: z.string()
			.describe('Note')
	}).describe('FX swap quote data (requires professional data source)'),
	
	execute: async ({ context }) => {
		const { symbol, tenor = '3M' } = context;
		
		return {
			symbol,
			tenor,
			update_time: new Date().toLocaleString('zh-CN'),
			swap_points: {
				bid: '--',
				ask: '--',
				mid: '--'
			},
			forward_prices: {
				bid: '--',
				ask: '--',
				mid: '--'
			},
			note: '实时掉期报价需要专业外汇数据源（Bloomberg、Reuters等终端）。外汇掉期(FX Swap)是一种同时买入和卖出相同金额但交割日不同的两笔货币交易，掉期点数反映了两种货币之间的利率差异。计算公式: 远期价格 = 即期价格 + 掉期点数'
		};
	}
});

/**
 * Tool: Get FX Pair Quote
 */
export const getFXPairQuoteTool = createMastraTool({
  category: 'commodity-forex',
	id: 'fx_pair_quote',
	description: 'Get detailed FX pair quotes, including bid/ask spread, pip value, etc.',
	
	inputSchema: z.object({
		symbol: z.string()
			.describe('Currency pair code, e.g., "EURUSD", "GBPUSD", "USDJPY"')
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		symbol: z.string()
			.describe('Currency pair code'),
		update_time: z.string()
			.describe('Update time'),
		realtime_quote: z.object({
			bid: z.number().describe('Bid price'),
			ask: z.number().describe('Ask price'),
			mid_price: z.number().describe('Mid price'),
			spread: z.number().describe('Spread')
		}).describe('Real-time quote'),
		change_info: z.object({
			prev_close: z.number().describe('Previous close'),
			change: z.number().describe('Change amount'),
			change_pct: z.number().describe('Change percentage (%)')
		}).describe('Change info'),
		price_range: z.object({
			high: z.number().describe('High price'),
			low: z.number().describe('Low price'),
			range: z.number().describe('Price range')
		}).describe('Price range'),
		trading_info: z.object({
			time: z.string().describe('Quote time'),
			status: z.string().describe('Trading status')
		}).describe('Trading info'),
		pair_info: z.object({
			base_currency: z.string().describe('Base currency'),
			quote_currency: z.string().describe('Quote currency'),
			meaning: z.string().describe('Meaning')
		}).describe('Currency pair info')
	}).describe('FX pair detailed quote from Sina Finance'),
	
	execute: async ({ context }) => {
		const { symbol } = context;
		
		const sinaSymbol = `fx_s${symbol.toLowerCase()}`;
		const apiUrl = `http://hq.sinajs.cn/list=${sinaSymbol}`;
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'GET',
			headers: {
				'Referer': 'http://finance.sina.com.cn'
			}
		});

		const match = response.text.match(/"(.+?)"/);
		if (!match || !match[1]) {
			throw new Error(`未找到货币对 ${symbol} 的报价数据`);
		}

		const data = match[1].split(',');
		
		const time = data[0] || '--';
		const bid = parseFloat(data[1]) || 0;
		const ask = parseFloat(data[2]) || 0;
		const high = parseFloat(data[3]) || 0;
		const low = parseFloat(data[4]) || 0;
		const prevClose = parseFloat(data[5]) || 0;
		
		const spread = parseFloat((ask - bid).toFixed(5));
		const midPrice = parseFloat(((bid + ask) / 2).toFixed(5));
		const change = parseFloat((bid - prevClose).toFixed(5));
		const changePct = prevClose ? parseFloat(((bid - prevClose) / prevClose * 100).toFixed(2)) : 0;
		
		const baseCurrency = symbol.substring(0, 3);
		const quoteCurrency = symbol.substring(3, 6);
		
		return {
			symbol,
			update_time: new Date().toLocaleString('zh-CN'),
			realtime_quote: {
				bid,
				ask,
				mid_price: midPrice,
				spread
			},
			change_info: {
				prev_close: prevClose,
				change,
				change_pct: changePct
			},
			price_range: {
				high,
				low,
				range: parseFloat((high - low).toFixed(5))
			},
			trading_info: {
				time,
				status: new Date().getHours() >= 9 && new Date().getHours() < 17 ? '交易中' : '休市'
			},
			pair_info: {
				base_currency: baseCurrency,
				quote_currency: quoteCurrency,
				meaning: `1 ${baseCurrency} = ${bid} ${quoteCurrency}`
			}
		};
	}
});

/**
 * Tool: Get Major FX Pairs Realtime
 */
export const getMajorFXPairsTool = createMastraTool({
  category: 'commodity-forex',
	id: 'fx_major_pairs_realtime',
	description: 'Get real-time quotes for major FX pairs (G7 pairs)',
	
	inputSchema: z.object({}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		update_time: z.string()
			.describe('Update time'),
		pairs: z.array(z.object({
			symbol: z.string().describe('Currency pair symbol'),
			bid: z.number().describe('Bid price'),
			ask: z.number().describe('Ask price'),
			change_pct: z.number().describe('Change percentage (%)'),
			high: z.number().describe('High price'),
			low: z.number().describe('Low price')
		})).describe('Major FX pairs quotes list'),
		notes: z.array(z.object({
			pair: z.string().describe('Currency pair'),
			description: z.string().describe('Description')
		})).describe('Currency pair notes')
	}).describe('Major FX pairs realtime quotes from Sina Finance'),
	
	execute: async ({ context }) => {
		const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
		const symbols = majorPairs.map(pair => `fx_s${pair.toLowerCase()}`).join(',');
		const apiUrl = `http://hq.sinajs.cn/list=${symbols}`;
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'GET',
			headers: {
				'Referer': 'http://finance.sina.com.cn'
			}
		});

		const pairs: Array<{symbol: string; bid: number; ask: number; change_pct: number; high: number; low: number}> = [];
		const lines = response.text.split('\n');
		
		lines.forEach((line, index) => {
			const match = line.match(/"(.+?)"/);
			if (match && match[1]) {
				const data = match[1].split(',');
				const pair = majorPairs[index];
				const bid = parseFloat(data[1]) || 0;
				const ask = parseFloat(data[2]) || 0;
				const high = parseFloat(data[3]) || 0;
				const low = parseFloat(data[4]) || 0;
				const prevClose = parseFloat(data[5]) || 0;
				const changePct = prevClose ? parseFloat(((bid - prevClose) / prevClose * 100).toFixed(2)) : 0;
				
				pairs.push({
					symbol: pair,
					bid: parseFloat(bid.toFixed(5)),
					ask: parseFloat(ask.toFixed(5)),
					change_pct: changePct,
					high: parseFloat(high.toFixed(5)),
					low: parseFloat(low.toFixed(5))
				});
			}
		});
		
		return {
			update_time: new Date().toLocaleString('zh-CN'),
			pairs,
			notes: [
				{ pair: 'EUR/USD', description: '欧元/美元 - 交易量最大的货币对' },
				{ pair: 'GBP/USD', description: '英镑/美元 - 又称"Cable"' },
				{ pair: 'USD/JPY', description: '美元/日元 - 亚洲最活跃货币对' },
				{ pair: 'USD/CHF', description: '美元/瑞郎 - 避险货币对' },
				{ pair: 'AUD/USD', description: '澳元/美元 - 商品货币代表' },
				{ pair: 'USD/CAD', description: '美元/加元 - 又称"Loonie"' },
				{ pair: 'NZD/USD', description: '纽元/美元 - 又称"Kiwi"' }
			]
		};
	}
});
