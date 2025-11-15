// Stock financial data tools - Financial reports, performance forecast, financial indicators
// Provides company financial statements and analysis data

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

/**
 * 获取财务摘要 - 东方财富
 * Get financial summary - Eastmoney
 */
export const getFinancialSummaryTool: BuiltInTool = {
	name: 'get_financial_summary',
	description: 'Get financial summary for a stock, including key metrics like revenue, profit, EPS, ROE, etc.',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Stock symbol (e.g., "000001", "600000")'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }): Promise<string> => {
		try {
			const symbol = args.symbol;
			const url = `http://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/ZYZBAjaxNew?type=0&code=${symbol}`;
			
			const response = await requestUrl({ url, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data || !data.data) {
				return JSON.stringify({ error: 'No financial data available' }, null, 2);
			}
			
			return JSON.stringify({
				symbol,
				data: data.data
			}, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};

/**
 * 获取财务报表 - 东方财富  
 * Get financial statements - Eastmoney
 */
export const getFinancialStatementsTool: BuiltInTool = {
	name: 'get_financial_statements',
	description: 'Get financial statements (balance sheet, income statement, cash flow) for a stock',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Stock symbol'
			},
			statement_type: {
				type: 'string',
				description: 'Statement type: "balance" for balance sheet, "income" for income statement, "cash" for cash flow',
				enum: ['balance', 'income', 'cash'],
				default: 'income'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; statement_type?: string }): Promise<string> => {
		try {
			const symbol = args.symbol;
			const type = args.statement_type || 'income';
			
			const typeMap: Record<string, string> = {
				'balance': 'ZCFZB',
				'income': 'LRB',
				'cash': 'XJLLB'
			};
			
			const reportType = typeMap[type];
			const url = `http://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/${reportType}AjaxNew?type=0&code=${symbol}`;
			
			const response = await requestUrl({ url, method: 'GET' });
			const data = JSON.parse(response.text);
			
			return JSON.stringify({ symbol, statement_type: type, data: data.data }, null, 2);
			
		} catch (error: any) {
			return JSON.stringify({ error: error?.message || String(error) }, null, 2);
		}
	}
};
