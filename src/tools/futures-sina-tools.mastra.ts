/**
 * Sina Futures Data Tools (Mastra Format)
 * 
 * 新浪期货数据工具
 * Provides domestic and foreign futures realtime quotes and minute data from Sina Finance
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

/**
 * Tool: Get Domestic Futures Spot Prices
 */
export const getFuturesZhSpotTool = createMastraTool({
  category: 'stock-china',
	id: 'futures_zh_spot',
	description: '获取国内期货实时行情数据，包括所有交易所的期货品种',
	
	inputSchema: z.object({
		symbol: z.string()
			.describe('Futures symbol, e.g., "RB0" (Rebar main), "CU0" (Copper main). Main contract uses 0')
			.optional()
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		update_time: z.string()
			.describe('Update time'),
		futures: z.array(z.object({
			code: z.string().describe('Futures code'),
			name: z.string().describe('Futures name'),
			current: z.string().describe('Current price'),
			change: z.string().describe('Change amount'),
			change_pct: z.string().describe('Change percentage'),
			open: z.string().describe('Open price'),
			high: z.string().describe('High price'),
			low: z.string().describe('Low price'),
			volume: z.string().describe('Volume')
		})).describe('Futures quotes list')
	}).describe('Domestic futures spot prices from Sina Finance'),
	
	execute: async ({ context }) => {
		const { symbol } = context;
		
		const apiUrl = 'https://hq.sinajs.cn/list=';
		const symbols = symbol ? [symbol] : [
			'RB0', 'CU0', 'AL0', 'ZN0', 'AU0', 'AG0', 'I0', 'J0', 'JM0', 'FG0'
		];
		
		const querySymbols = symbols.map(s => `nf_${s}`).join(',');
		
		const response = await requestUrl({
			url: `${apiUrl}${querySymbols}`,
			method: 'GET',
			headers: {
				'Referer': 'https://finance.sina.com.cn'
			}
		});

		const lines = response.text.split('\n').filter(line => line.trim());
		const futures: Array<{code: string; name: string; current: string; change: string; change_pct: string; open: string; high: string; low: string; volume: string}> = [];

		lines.forEach(line => {
			const match = line.match(/var hq_str_nf_(.+?)="(.+)";/);
			if (match) {
				const code = match[1];
				const data = match[2].split(',');
				if (data.length >= 8) {
					const [name, , open, high, low, , current, , , change, changePercent, volume] = data;
					futures.push({
						code,
						name,
						current,
						change,
						change_pct: changePercent,
						open,
						high,
						low,
						volume
					});
				}
			}
		});

		return {
			update_time: new Date().toLocaleString('zh-CN'),
			futures
		};
	}
});

/**
 * Tool: Get Domestic Futures Realtime by Symbol
 */
export const getFuturesZhRealtimeTool = createMastraTool({
  category: 'stock-china',
	id: 'futures_zh_realtime',
	description: 'Get real-time quotes for specific domestic futures symbol',
	
	inputSchema: z.object({
		symbol: z.string()
			.describe('Futures symbol, e.g., "RB" (Rebar), "CU" (Copper), "AL" (Aluminum)')
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		symbol: z.string()
			.describe('Futures symbol'),
		name: z.string()
			.describe('Futures name'),
		current: z.string()
			.describe('Current price'),
		change: z.string()
			.describe('Change amount'),
		change_pct: z.string()
			.describe('Change percentage (%)'),
		open: z.string()
			.describe('Open price'),
		high: z.string()
			.describe('High price'),
		low: z.string()
			.describe('Low price'),
		prev_close: z.string()
			.describe('Previous close'),
		volume: z.string()
			.describe('Volume'),
		position: z.string()
			.describe('Open interest'),
		turnover: z.string()
			.describe('Turnover')
	}).describe('Domestic futures realtime data for specific symbol from Sina Finance'),
	
	execute: async ({ context }) => {
		const { symbol } = context;
		
		const apiUrl = `https://hq.sinajs.cn/list=nf_${symbol}0`;
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'GET',
			headers: {
				'Referer': 'https://finance.sina.com.cn'
			}
		});

		const match = response.text.match(/var hq_str_nf_.+?="(.+)";/);
		if (!match) {
			throw new Error(`未找到品种 ${symbol} 的行情数据`);
		}

		const data = match[1].split(',');
		
		return {
			symbol,
			name: data[0],
			current: data[6],
			change: data[9],
			change_pct: data[10],
			open: data[2],
			high: data[3],
			low: data[4],
			prev_close: data[5],
			volume: data[11],
			position: data[13],
			turnover: data[12]
		};
	}
});

/**
 * Tool: Get Foreign Futures Realtime
 */
export const getFuturesForeignRealtimeTool = createMastraTool({
  category: 'stock-china',
	id: 'futures_foreign_commodity_realtime',
	description: 'Get real-time quotes for foreign futures, including LME, COMEX, NYMEX, etc.',
	
	inputSchema: z.object({
		symbol: z.string()
			.describe('Foreign futures symbol, e.g., "CL" (Crude Oil), "GC" (Gold), "SI" (Silver), etc.')
			.optional()
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		update_time: z.string()
			.describe('Update time'),
		futures: z.array(z.object({
			code: z.string().describe('Futures code'),
			name: z.string().describe('Futures name'),
			current: z.string().describe('Current price'),
			change: z.string().describe('Change amount'),
			change_pct: z.string().describe('Change percentage'),
			open: z.string().describe('Open price'),
			high: z.string().describe('High price'),
			low: z.string().describe('Low price')
		})).describe('Foreign futures quotes list')
	}).describe('Foreign futures realtime data from Sina Finance'),
	
	execute: async ({ context }) => {
		const { symbol } = context;
		
		const symbols = symbol ? [symbol] : ['CL', 'GC', 'SI', 'HG'];
		const querySymbols = symbols.map(s => `hf_${s}`).join(',');
		const apiUrl = `https://hq.sinajs.cn/list=${querySymbols}`;
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'GET',
			headers: {
				'Referer': 'https://finance.sina.com.cn'
			}
		});

		const lines = response.text.split('\n').filter(line => line.trim());
		const futures: Array<{code: string; name: string; current: string; change: string; change_pct: string; open: string; high: string; low: string}> = [];

		lines.forEach(line => {
			const match = line.match(/var hq_str_hf_(.+?)="(.+)";/);
			if (match) {
				const code = match[1];
				const data = match[2].split(',');
				if (data.length >= 8) {
					futures.push({
						code,
						name: data[0],
						current: data[1],
						change: data[2],
						change_pct: data[3],
						open: data[4],
						high: data[5],
						low: data[6]
					});
				}
			}
		});

		return {
			update_time: new Date().toLocaleString('zh-CN'),
			futures
		};
	}
});

/**
 * Tool: Get Futures Minute Data
 */
export const getFuturesZhMinuteSinaTool = createMastraTool({
  category: 'stock-china',
	id: 'futures_zh_minute_sina',
	description: 'Get domestic futures minute-level data (5-minute)',
	
	inputSchema: z.object({
		symbol: z.string()
			.describe('Futures contract symbol, e.g., "RB2310", "CU2309"')
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		symbol: z.string()
			.describe('Futures contract symbol'),
		total_records: z.number()
			.describe('Total records'),
		displayed_records: z.number()
			.describe('Displayed records (last 20)'),
		data: z.array(z.object({
			time: z.string().describe('Time'),
			open: z.string().describe('Open price'),
			high: z.string().describe('High price'),
			low: z.string().describe('Low price'),
			close: z.string().describe('Close price'),
			volume: z.string().describe('Volume')
		})).describe('Minute data list (last 20)')
	}).describe('Futures minute-level data from Sina Finance'),
	
	execute: async ({ context }) => {
		const { symbol } = context;
		
		const apiUrl = `https://stock2.finance.sina.com.cn/futures/api/json.php/IndexService.getInnerFuturesMiniKLine5m?symbol=${symbol}`;
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'GET',
			headers: {
				'Referer': 'https://finance.sina.com.cn'
			}
		});

		const data = JSON.parse(response.text);
		
		if (!data || data.length === 0) {
			throw new Error(`未找到合约 ${symbol} 的分时数据`);
		}

		const minuteData = data.slice(-20).map((item: any) => ({
			time: item.d,
			open: item.o,
			high: item.h,
			low: item.l,
			close: item.c,
			volume: item.v
		}));

		return {
			symbol,
			total_records: data.length,
			displayed_records: minuteData.length,
			data: minuteData
		};
	}
});
