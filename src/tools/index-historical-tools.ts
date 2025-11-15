// Stock Index Historical Data Tools
// 股票指数历史数据工具

import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 上证系列指数日频数据
 */
export const getIndexSSEDailyTool: BuiltInTool = {
	name: 'stock_zh_index_daily',
	description: '获取上证系列指数的日频历史数据，如上证指数、上证50、沪深300等',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '指数代码，如"000001"(上证指数)、"000016"(上证50)、"000300"(沪深300)'
			},
			start_date: {
				type: 'string',
				description: '开始日期，格式YYYYMMDD'
			},
			end_date: {
				type: 'string',
				description: '结束日期，格式YYYYMMDD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }): Promise<string> => {
		try {
			const endDate = args.end_date || new Date().toISOString().split('T')[0].replace(/-/g, '');
			const startDate = args.start_date || new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().split('T')[0].replace(/-/g, '');
			
			// 使用东方财富获取指数历史数据
			const secid = args.symbol.startsWith('399') ? `0.${args.symbol}` : `1.${args.symbol}`;
			const apiUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get`;
			
			const params = new URLSearchParams();
			params.append('secid', secid);
			params.append('fields1', 'f1,f2,f3,f4,f5,f6');
			params.append('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');
			params.append('klt', '101');
			params.append('fqt', '0');
			params.append('beg', startDate);
			params.append('end', endDate);
			
			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET'
			});

			const jsonData = JSON.parse(response.text);
			
			if (!jsonData.data || !jsonData.data.klines) {
				return `未找到指数 ${args.symbol} 的历史数据`;
			}
			
			let result = `## 指数历史数据 - ${args.symbol}\n\n`;
			result += `数据来源: 东方财富\n`;
			result += `指数名称: ${jsonData.data.name || args.symbol}\n`;
			result += `日期范围: ${startDate} 至 ${endDate}\n\n`;
			
			const klines = jsonData.data.klines;
			result += `共 ${klines.length} 条记录\n\n`;
			result += `| 日期 | 开盘 | 收盘 | 最高 | 最低 | 成交量 | 成交额 |\n`;
			result += `|----------|----------|----------|----------|----------|------------|------------|\n`;
			
			// 显示最近10条记录
			const displayCount = Math.min(10, klines.length);
			for (let i = klines.length - displayCount; i < klines.length; i++) {
				const fields = klines[i].split(',');
				const date = fields[0];
				const open = parseFloat(fields[1]).toFixed(2);
				const close = parseFloat(fields[2]).toFixed(2);
				const high = parseFloat(fields[3]).toFixed(2);
				const low = parseFloat(fields[4]).toFixed(2);
				const volume = (parseFloat(fields[5]) / 100000000).toFixed(2); // 转换为亿手
				const amount = (parseFloat(fields[6]) / 100000000).toFixed(2); // 转换为亿元
				
				result += `| ${date} | ${open} | ${close} | ${high} | ${low} | ${volume}亿 | ${amount}亿 |\n`;
			}
			
			if (klines.length > displayCount) {
				result += `\n(仅显示最近${displayCount}条，共${klines.length}条记录)\n`;
			}

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取指数历史数据失败: ${errorMessage}`;
		}
	},
	};

/**
 * 深证系列指数日频数据
 */
export const getIndexSZSEDailyTool: BuiltInTool = {
	name: 'stock_sz_index_daily',
	description: '获取深证系列指数的日频历史数据，如深证成指、创业板指、中小板指等',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '指数代码，如"399001"(深证成指)、"399006"(创业板指)、"399005"(中小板指)'
			},
			start_date: {
				type: 'string',
				description: '开始日期，格式YYYYMMDD'
			},
			end_date: {
				type: 'string',
				description: '结束日期，格式YYYYMMDD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }): Promise<string> => {
		try {
			const endDate = args.end_date || new Date().toISOString().split('T')[0].replace(/-/g, '');
			const startDate = args.start_date || new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().split('T')[0].replace(/-/g, '');
			
			const secid = `0.${args.symbol}`;
			const apiUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get`;
			
			const params = new URLSearchParams();
			params.append('secid', secid);
			params.append('fields1', 'f1,f2,f3,f4,f5,f6');
			params.append('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');
			params.append('klt', '101');
			params.append('fqt', '0');
			params.append('beg', startDate);
			params.append('end', endDate);
			
			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET'
			});

			const jsonData = JSON.parse(response.text);
			
			if (!jsonData.data || !jsonData.data.klines) {
				return `未找到指数 ${args.symbol} 的历史数据`;
			}
			
			let result = `## 深证指数历史数据 - ${args.symbol}\n\n`;
			result += `指数名称: ${jsonData.data.name || args.symbol}\n`;
			result += `日期范围: ${startDate} 至 ${endDate}\n`;
			result += `数据条数: ${jsonData.data.klines.length}\n\n`;
			
			const klines = jsonData.data.klines;
			result += `| 日期 | 开盘 | 收盘 | 最高 | 最低 | 成交量 | 成交额 | 涨跌幅 |\n`;
			result += `|----------|-------|-------|-------|-------|---------|---------|--------|\n`;
			
			const displayCount = Math.min(10, klines.length);
			for (let i = klines.length - displayCount; i < klines.length; i++) {
				const fields = klines[i].split(',');
				const date = fields[0];
				const open = parseFloat(fields[1]).toFixed(2);
				const close = parseFloat(fields[2]).toFixed(2);
				const high = parseFloat(fields[3]).toFixed(2);
				const low = parseFloat(fields[4]).toFixed(2);
				const volume = (parseFloat(fields[5]) / 100000000).toFixed(2);
				const amount = (parseFloat(fields[6]) / 100000000).toFixed(2);
				const pctChange = parseFloat(fields[8]).toFixed(2);
				
				result += `| ${date} | ${open} | ${close} | ${high} | ${low} | ${volume}亿 | ${amount}亿 | ${pctChange}% |\n`;
			}
			
			if (klines.length > displayCount) {
				result += `\n(仅显示最近${displayCount}条，共${klines.length}条记录)\n`;
			}

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取深证指数历史数据失败: ${errorMessage}`;
		}
	},
	};

/**
 * 中证系列指数日频数据
 */
export const getIndexCSIDailyTool: BuiltInTool = {
	name: 'stock_csi_index_daily',
	description: '获取中证系列指数的日频历史数据，如中证500、中证1000等',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '指数代码，如"000905"(中证500)、"000852"(中证1000)'
			},
			start_date: {
				type: 'string',
				description: '开始日期，格式YYYYMMDD'
			},
			end_date: {
				type: 'string',
				description: '结束日期，格式YYYYMMDD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }): Promise<string> => {
		try {
			const endDate = args.end_date || new Date().toISOString().split('T')[0].replace(/-/g, '');
			const startDate = args.start_date || new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().split('T')[0].replace(/-/g, '');
			
			const secid = `1.${args.symbol}`;
			const apiUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get`;
			
			const params = new URLSearchParams();
			params.append('secid', secid);
			params.append('fields1', 'f1,f2,f3,f4,f5,f6');
			params.append('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');
			params.append('klt', '101');
			params.append('fqt', '0');
			params.append('beg', startDate);
			params.append('end', endDate);
			
			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET'
			});

			const jsonData = JSON.parse(response.text);
			
			if (!jsonData.data || !jsonData.data.klines) {
				return `未找到指数 ${args.symbol} 的历史数据`;
			}
			
			let result = `## 中证指数历史数据 - ${args.symbol}\n\n`;
			result += `指数名称: ${jsonData.data.name || args.symbol}\n`;
			result += `日期范围: ${startDate} 至 ${endDate}\n`;
			result += `记录总数: ${jsonData.data.klines.length}\n\n`;
			
			// 计算统计信息
			const klines = jsonData.data.klines;
			if (klines.length > 0) {
				const firstData = klines[0].split(',');
				const lastData = klines[klines.length - 1].split(',');
				const firstClose = parseFloat(firstData[2]);
				const lastClose = parseFloat(lastData[2]);
				const periodReturn = ((lastClose - firstClose) / firstClose * 100).toFixed(2);
				
				result += `### 统计摘要\n`;
				result += `- **期初点位**: ${firstClose.toFixed(2)}\n`;
				result += `- **期末点位**: ${lastClose.toFixed(2)}\n`;
				result += `- **区间涨跌**: ${(lastClose - firstClose).toFixed(2)} (${periodReturn}%)\n\n`;
			}
			
			result += `### 最近行情\n`;
			result += `| 日期 | 开盘 | 收盘 | 最高 | 最低 | 涨跌幅 |\n`;
			result += `|----------|----------|----------|----------|----------|--------|\n`;
			
			const displayCount = Math.min(10, klines.length);
			for (let i = klines.length - displayCount; i < klines.length; i++) {
				const fields = klines[i].split(',');
				result += `| ${fields[0]} | ${parseFloat(fields[1]).toFixed(2)} | ${parseFloat(fields[2]).toFixed(2)} | ${parseFloat(fields[3]).toFixed(2)} | ${parseFloat(fields[4]).toFixed(2)} | ${parseFloat(fields[8]).toFixed(2)}% |\n`;
			}

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取中证指数历史数据失败: ${errorMessage}`;
		}
	},
	};
