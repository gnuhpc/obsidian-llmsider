/**
 * Forex (Foreign Exchange) Data Tools (Mastra Format)
 * 
 * 提供外汇即期、掉期、货币对报价数据
 * Provides FX spot, swap, currency pair quotes
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

/**
 * Tool: Get FX Spot Quote
 */
export const getFXSpotQuoteTool = createMastraTool({
  category: 'commodity-forex',
	id: 'get_fx_spot_quote',
	description: 'Get RMB foreign exchange spot quotes from China Foreign Exchange Trade System',
	
	inputSchema: z.object({}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		data: z.array(z.record(z.any()))
			.describe('List of foreign exchange spot quote records')
	}).describe('RMB foreign exchange spot quotes from China Foreign Exchange Trade System'),
	
	execute: async ({ context }) => {
		// 中国外汇交易中心接口
		const url = 'http://www.chinamoney.com.cn/ags/ms/cm-u-bk-ccpr/CcprHisNew?lang=CN&startDate=&endDate=&currency=&pageNum=1&pageSize=15';
		
		const response = await requestUrl({ url, method: 'GET' });
		const data = JSON.parse(response.text);
		
		return { data: data.records };
	}
});

/**
 * Tool: Get Real-Time Exchange Rate
 */
export const getRealTimeExchangeRateTool = createMastraTool({
  category: 'commodity-forex',
	id: 'get_realtime_exchange_rate',
	description: 'Get real-time exchange rates for major currency pairs (USD, EUR, GBP, JPY, etc.)',
	
	inputSchema: z.object({
		base_currency: z.string()
			.describe('Base currency code (e.g., "USD", "EUR", "CNY")')
			.optional()
			.default('USD'),
		target_currency: z.string()
			.describe('Target currency code (e.g., "CNY", "EUR", "JPY")')
			.optional()
			.default('CNY')
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		pair: z.string()
			.describe('Currency pair representation (e.g., "USD/CNY")'),
		rate: z.number()
			.describe('Current exchange rate'),
		time: z.string()
			.describe('Quote time'),
		high: z.number()
			.describe('Highest price'),
		low: z.number()
			.describe('Lowest price'),
		open: z.number()
			.describe('Opening price')
	}).describe('Real-time exchange rate data from Sina Finance'),
	
	execute: async ({ context }) => {
		const { base_currency = 'USD', target_currency = 'CNY' } = context;
		
		// 使用新浪财经外汇接口
		const pair = `${base_currency}${target_currency}`;
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
			throw new Error('Exchange rate not found');
		}
		
		const parts = match[1].split(',');
		return {
			pair: `${base_currency}/${target_currency}`,
			rate: parseFloat(parts[8]),
			time: parts[0],
			high: parseFloat(parts[4]),
			low: parseFloat(parts[5]),
			open: parseFloat(parts[6])
		};
	}
});
