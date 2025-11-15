// Hong Kong and US Stock Historical Data Tools
// 港股和美股历史数据工具

import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 港股历史行情数据
 */
export const getStockHKDailyTool: BuiltInTool = {
	name: 'stock_hk_daily',
	description: '获取港股股票的历史行情数据(日频)，包括开高低收、成交量等',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码，如"00700"(腾讯)、"09988"(阿里巴巴-SW)等，需包含前导零'
			},
			start_date: {
				type: 'string',
				description: '开始日期，格式YYYYMMDD，如"20220101"'
			},
			end_date: {
				type: 'string',
				description: '结束日期，格式YYYYMMDD，如"20231231"'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }): Promise<string> => {
		try {
			const apiUrl = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get`;
			const params = new URLSearchParams({
				param: `hk${args.symbol},day,,,320,qfq`,
				_var: `kline_day${args.symbol}`
			});

			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET',
				headers: {
					'Referer': 'https://gu.qq.com'
				}
			});

			const data = response.json;
			const key = `kline_day${args.symbol}`;
			
			if (!data || !data.data || !data.data[key] || !data.data[key].day) {
				return `未找到股票 ${args.symbol} 的历史数据`;
			}

			const dayData = data.data[key].day;
			let result = `## 港股历史行情 - ${args.symbol}\n\n`;
			result += `| 日期 | 开盘 | 最高 | 最低 | 收盘 | 成交量 |\n`;
			result += `|------|------|------|------|------|--------|\n`;

			dayData.slice(-30).forEach((item: string[]) => {
				const [date, open, close, high, low, volume] = item;
				result += `| ${date} | ${open} | ${high} | ${low} | ${close} | ${volume} |\n`;
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取港股历史数据失败: ${errorMessage}`;
		}
	},
	};

/**
 * 美股历史行情数据
 */
export const getStockUSDailyTool: BuiltInTool = {
	name: 'stock_us_daily',
	description: '获取美股股票的历史行情数据(日频)，包括前复权因子',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码，如"AAPL"(苹果)、"TSLA"(特斯拉)、"MSFT"(微软)等'
			},
			start_date: {
				type: 'string',
				description: '开始日期，格式YYYY-MM-DD'
			},
			end_date: {
				type: 'string',
				description: '结束日期，格式YYYY-MM-DD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }): Promise<string> => {
		try {
			const apiUrl = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get`;
			const params = new URLSearchParams({
				param: `us${args.symbol.toLowerCase()},day,,,320,qfq`,
				_var: `kline_day${args.symbol}`
			});

			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET',
				headers: {
					'Referer': 'https://gu.qq.com'
				}
			});

			const data = response.json;
			const key = `kline_day${args.symbol}`;
			
			if (!data || !data.data || !data.data[key] || !data.data[key].day) {
				return `未找到美股 ${args.symbol} 的历史数据`;
			}

			const dayData = data.data[key].day;
			let result = `## 美股历史行情 - ${args.symbol}\n\n`;
			result += `| 日期 | 开盘 | 最高 | 最低 | 收盘 | 成交量 |\n`;
			result += `|------|------|------|------|------|--------|\n`;

			dayData.slice(-30).forEach((item: string[]) => {
				const [date, open, close, high, low, volume] = item;
				result += `| ${date} | ${open} | ${high} | ${low} | ${close} | ${volume} |\n`;
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取美股历史数据失败: ${errorMessage}`;
		}
	},
	};

/**
 * 美股所有股票代码
 */
export const getUSStockNameTool: BuiltInTool = {
	name: 'get_us_stock_name',
	description: '获取美股所有股票的代码和名称列表',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
			const apiUrl = 'https://stock.xueqiu.com/v5/stock/screener/quote/list.json';
			const params = new URLSearchParams({
				page: '1',
				size: '100',
				order: 'desc',
				orderby: 'percent',
				order_by: 'percent',
				market: 'US',
				type: 'us'
			});

			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0',
					'Accept': 'application/json'
				}
			});

			const data = response.json;
			
			if (!data || !data.data || !data.data.list) {
				return '未能获取美股股票列表';
			}

			let result = `## 美股股票列表（前100只）\n\n`;
			result += `| 代码 | 名称 | 当前价 | 涨跌幅 |\n`;
			result += `|------|------|--------|--------|\n`;

			data.data.list.forEach((stock: any) => {
				result += `| ${stock.symbol} | ${stock.name} | ${stock.current} | ${stock.percent}% |\n`;
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取美股列表失败: ${errorMessage}`;
		}
	},
	};

/**
 * A+H股实时行情
 */
export const getStockAHSpotTool: BuiltInTool = {
	name: 'stock_zh_ah_spot',
	description: '获取A+H股实时行情数据，比较A股和H股的价格差异',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
			const apiUrl = 'https://push2.eastmoney.com/api/qt/clist/get';
			const params = new URLSearchParams({
				pn: '1',
				pz: '200',
				po: '1',
				np: '1',
				ut: 'bd1d9ddb04089700cf9c27f6f7426281',
				fltt: '2',
				invt: '2',
				fid: 'f3',
				fs: 'b:MK0144',
				fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152'
			});

			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET'
			});

			const data = response.json;
			
			if (!data || !data.data || !data.data.diff) {
				return '未能获取A+H股数据';
			}

			let result = `## A+H股实时行情\n\n`;
			result += `| 名称 | A股代码 | A股价格 | H股代码 | H股价格 | 溢价率 |\n`;
			result += `|------|---------|---------|---------|---------|--------|\n`;

			data.data.diff.forEach((stock: any) => {
				result += `| ${stock.f14} | ${stock.f12} | ${stock.f2} | - | - | - |\n`;
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取A+H股数据失败: ${errorMessage}`;
		}
	},
	};

/**
 * 科创板实时行情
 */
export const getStockKCBSpotTool: BuiltInTool = {
	name: 'stock_zh_kcb_spot',
	description: '获取科创板股票实时行情数据',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
			const apiUrl = 'https://push2.eastmoney.com/api/qt/clist/get';
			const params = new URLSearchParams({
				pn: '1',
				pz: '200',
				po: '1',
				np: '1',
				ut: 'bd1d9ddb04089700cf9c27f6f7426281',
				fltt: '2',
				invt: '2',
				fid: 'f3',
				fs: 'm:1+s:23',
				fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152'
			});

			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET'
			});

			const data = response.json;
			
			if (!data || !data.data || !data.data.diff) {
				return '未能获取科创板数据';
			}

			let result = `## 科创板实时行情\n\n`;
			result += `| 代码 | 名称 | 最新价 | 涨跌幅 | 成交量 | 成交额 |\n`;
			result += `|------|------|--------|--------|--------|--------|\n`;

			data.data.diff.forEach((stock: any) => {
				result += `| ${stock.f12} | ${stock.f14} | ${stock.f2} | ${stock.f3}% | ${stock.f5} | ${(stock.f6 / 100000000).toFixed(2)}亿 |\n`;
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取科创板数据失败: ${errorMessage}`;
		}
	},
	};

/**
 * 科创板历史行情
 */
export const getStockKCBDailyTool: BuiltInTool = {
	name: 'stock_zh_kcb_daily',
	description: '获取科创板股票历史行情数据(日频)',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码，如"688001"等科创板代码'
			},
			adjust: {
				type: 'string',
				description: '复权类型: qfq-前复权, hfq-后复权, 空-不复权',
				enum: ['qfq', 'hfq', '']
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; adjust?: string }): Promise<string> => {
		try {
			const adjustType = args.adjust || '';
			const apiUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get`;
			const params = new URLSearchParams({
				fields1: 'f1,f2,f3,f4,f5,f6',
				fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
				ut: 'fa5fd1943c7b386f172d6893dbfba10b',
				klt: '101',
				fqt: adjustType === 'qfq' ? '1' : adjustType === 'hfq' ? '2' : '0',
				secid: `1.${args.symbol}`,
				beg: '0',
				end: '20500101'
			});

			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET'
			});

			const data = response.json;
			
			if (!data || !data.data || !data.data.klines) {
				return `未找到股票 ${args.symbol} 的历史数据`;
			}

			let result = `## 科创板历史行情 - ${args.symbol}\n\n`;
			result += `| 日期 | 开盘 | 收盘 | 最高 | 最低 | 成交量 | 成交额 |\n`;
			result += `|------|------|------|------|------|--------|--------|\n`;

			data.data.klines.slice(-30).forEach((item: string) => {
				const [date, open, close, high, low, volume, amount] = item.split(',');
				result += `| ${date} | ${open} | ${close} | ${high} | ${low} | ${volume} | ${amount} |\n`;
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取科创板历史数据失败: ${errorMessage}`;
		}
	},
	};
