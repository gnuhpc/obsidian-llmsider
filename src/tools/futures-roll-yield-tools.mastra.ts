/**
 * Futures Roll Yield and Advanced Position Tools (Mastra Format)
 * 
 * Futures Roll Yield and Advanced Position Tools
 * Provides roll yield, exchange member positions, VWAP data
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

/**
 * Tool: Get Roll Yield Bar
 */
export const getRollYieldBarTool = createMastraTool({
  category: 'stock-china',
	id: 'get_roll_yield_bar',
	description: 'Get futures roll yield data. Roll yield reflects the price difference between the dominant contract and the next dominant contract, used to judge the term structure of the futures market. type_method can be "date" (by date) or "var" (by variety).',
	
	inputSchema: z.object({
		type_method: z.enum(['date', 'var'])
			.describe('Query method: "date" (by date) or "var" (by variety)'),
		var: z.string()
			.describe('Variety code, e.g., "RB" (Rebar), "CU" (Copper), "AL" (Aluminum)'),
		start_day: z.string()
			.describe('Start date, format YYYYMMDD, e.g., "20180618"')
			.optional(),
		end_day: z.string()
			.describe('End date, format YYYYMMDD, e.g., "20180718"')
			.optional()
	}).describe('Tool input parameters'),
	
    outputSchema: z.object({
		variety: z.string().describe('Variety code'),
		total_records: z.number().describe('Total records'),
		data: z.array(z.object({
			date: z.string().describe('Trading date'),
			roll_yield: z.number().describe('Roll yield'),
			roll_yield_pct: z.string().describe('Roll yield percentage'),
			near_by: z.string().describe('Near-by contract code'),
			deferred: z.string().describe('Deferred contract code')
		})).describe('Roll yield data list')
	}).describe('Futures roll yield data response'),	execute: async ({ context }) => {
		const { type_method, var: variety, start_day, end_day } = context;
		
		const apiUrl = 'https://ft.10jqka.com.cn/api/roll_yield/get_roll_yield_bar/';
		const params = new URLSearchParams({
			type_method,
			var: variety
		});

		if (start_day) params.append('start_day', start_day);
		if (end_day) params.append('end_day', end_day);

		const response = await requestUrl({
			url: `${apiUrl}?${params.toString()}`,
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0',
				'Accept': 'application/json'
			}
		});

		const apiData = response.json;
		
		if (!apiData || !apiData.data || apiData.data.length === 0) {
			throw new Error(`Roll yield data not found for variety ${variety}`);
		}

		const data = apiData.data.map((item: any) => ({
			date: item.date || item[0],
			roll_yield: parseFloat(item.roll_yield || item[1]),
			roll_yield_pct: `${(parseFloat(item.roll_yield || item[1]) * 100).toFixed(4)}%`,
			near_by: item.near_by || item[2],
			deferred: item.deferred || item[3]
		}));

		return {
			variety,
			total_records: data.length,
			data
		};
	}
});

/**
 * Tool: Get CFFEX Rank Table
 */
export const getCFFEXRankTableTool = createMastraTool({
  category: 'stock-china',
	id: 'get_cffex_rank_table',
	description: 'Get detailed position data of top 20 members of China Financial Futures Exchange (CFFEX)',
	
	inputSchema: z.object({
		trade_date: z.string()
			.describe('Trading date, format YYYYMMDD'),
		symbol: z.string()
			.describe('Contract code, e.g., "IF", "IC", "IH"')
	}).describe('Tool input parameters'),
	
    outputSchema: z.object({
		exchange: z.literal('CFFEX').describe('Exchange name: CFFEX'),
		symbol: z.string().describe('Contract code'),
		trade_date: z.string().describe('Trading date'),
		xml_content: z.string().describe('Position rank data in XML format')
	}).describe('CFFEX rank table response'),	execute: async ({ context }) => {
		const { trade_date, symbol } = context;
		const apiUrl = `http://www.cffex.com.cn/sj/ccpm/${trade_date}/${symbol}.xml`;
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'GET'
		});

		return {
			exchange: 'CFFEX' as const,
			symbol,
			trade_date,
			xml_content: response.text
		};
	}
});

/**
 * Tool: Get CZCE Rank Table
 */
export const getRankTableCZCETool = createMastraTool({
  category: 'stock-china',
	id: 'get_rank_table_czce',
	description: 'Get detailed position data of top 20 members of Zhengzhou Commodity Exchange (CZCE)',
	
	inputSchema: z.object({
		trade_date: z.string()
			.describe('Trading date, format YYYYMMDD'),
		symbol: z.string()
			.describe('Contract code, e.g., "AP", "CF", "SR"')
	}).describe('Tool input parameters'),
	
    outputSchema: z.object({
		exchange: z.literal('CZCE').describe('Exchange name: CZCE'),
		symbol: z.string().describe('Contract code'),
		trade_date: z.string().describe('Trading date'),
		year: z.string().describe('Year'),
		txt_content: z.string().describe('Position rank data in TXT format')
	}).describe('CZCE rank table response'),	execute: async ({ context }) => {
		const { trade_date, symbol } = context;
		const year = trade_date.substring(0, 4);
		const apiUrl = `http://www.czce.com.cn/cn/DFSStaticFiles/Future/${year}/${trade_date}/FutureDataHolding.txt`;
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'GET'
		});

		return {
			exchange: 'CZCE' as const,
			symbol,
			trade_date,
			year,
			txt_content: response.text
		};
	}
});

/**
 * Tool: Get DCE Rank Table
 */
export const getDCERankTableTool = createMastraTool({
  category: 'stock-china',
	id: 'get_dce_rank_table',
	description: 'Get detailed position data of top 20 members of Dalian Commodity Exchange (DCE)',
	
	inputSchema: z.object({
		trade_date: z.string()
			.describe('Trading date, format YYYYMMDD'),
		symbol: z.string()
			.describe('Contract code, e.g., "i", "j", "m"')
	}).describe('Tool input parameters'),
	
    outputSchema: z.object({
		exchange: z.literal('DCE').describe('Exchange name: DCE'),
		symbol: z.string().describe('Contract code'),
		trade_date: z.string().describe('Trading date'),
		status: z.string().describe('Request status')
	}).describe('DCE rank table response'),	execute: async ({ context }) => {
		const { trade_date, symbol } = context;
		const apiUrl = 'http://www.dce.com.cn/publicweb/quotesdata/exportMemberDealPosiQuotesBatchData.html';
		
		const formData = new URLSearchParams();
		formData.append('memberDealPosiQuotes.variety', symbol);
		formData.append('memberDealPosiQuotes.trade_date', trade_date);
		formData.append('contract_id', '');
		formData.append('trade_date', trade_date);

		const response = await requestUrl({
			url: apiUrl,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: formData.toString()
		});

		return {
			exchange: 'DCE' as const,
			symbol,
			trade_date,
			status: 'Position rank data retrieved'
		};
	}
});

/**
 * Tool: Get SHFE VWAP
 */
export const getSHFEVWAPTool = createMastraTool({
  category: 'stock-china',
	id: 'get_shfe_v_wap',
	description: 'Get daily VWAP (Volume Weighted Average Price) data of Shanghai Futures Exchange (SHFE)',
	
	inputSchema: z.object({
		trade_date: z.string()
			.describe('Trading date, format YYYYMMDD')
	}).describe('Tool input parameters'),
	
    outputSchema: z.object({
		exchange: z.literal('SHFE').describe('Exchange name: SHFE'),
		trade_date: z.string().describe('Trading date'),
		total_records: z.number().describe('Total records'),
		data: z.array(z.object({
			INSTRUMENTID: z.string().describe('Contract code'),
			AVGPRICE: z.number().describe('Average price'),
			VOLUME: z.number().describe('Volume'),
			OPENINTEREST: z.number().describe('Open interest')
		})).describe('VWAP data list')
	}).describe('SHFE VWAP data response'),	execute: async ({ context }) => {
		const { trade_date } = context;
		const year = trade_date.substring(0, 4);
		const month = trade_date.substring(4, 6);
		const day = trade_date.substring(6, 8);
		
		const apiUrl = `https://www.shfe.com.cn/data/dailydata/kx/pm${year}${month}${day}.dat`;
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'GET'
		});

		const apiData = response.json;
		
		if (!apiData || !apiData.o_currefprice) {
			throw new Error('Failed to get SHFE VWAP data');
		}

		return {
			exchange: 'SHFE' as const,
			trade_date,
			total_records: apiData.o_currefprice.length,
			data: apiData.o_currefprice
		};
	}
});

/**
 * Tool: Get GFEX Daily
 */
export const getGFEXDailyTool = createMastraTool({
  category: 'stock-china',
	id: 'get_gfex_daily',
	description: 'Get daily trading data of Guangzhou Futures Exchange (GFEX)',
	
	inputSchema: z.object({
		trade_date: z.string()
			.describe('Trading date, format YYYY-MM-DD')
	}).describe('Tool input parameters'),
	
    outputSchema: z.object({
		exchange: z.literal('GFEX').describe('Exchange name: GFEX'),
		trade_date: z.string().describe('Trading date'),
		total_records: z.number().describe('Total records'),
		data: z.array(z.object({
			contractCode: z.string().describe('Contract code'),
			closePrice: z.number().describe('Closing price'),
			settlePrice: z.number().describe('Settlement price'),
			zd: z.number().describe('Change'),
			dealAmount: z.number().describe('Volume'),
			holdAmount: z.number().describe('Open interest')
		})).describe('Daily trading data list')
	}).describe('GFEX daily data response'),	execute: async ({ context }) => {
		const { trade_date } = context;
		const apiUrl = 'http://www.gfex.com.cn/u/interfacesWebTtQueryContractInfo/loadList';
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				trade_date
			})
		});

		const apiData = response.json;
		
		if (!apiData || !apiData.data) {
			throw new Error('Failed to get GFEX trading data');
		}

		return {
			exchange: 'GFEX' as const,
			trade_date,
			total_records: apiData.data.length,
			data: apiData.data
		};
	}
});
