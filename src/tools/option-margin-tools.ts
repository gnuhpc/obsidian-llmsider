/**
 * 期权与保证金工具集
 * Options and Margin Tools
 */

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

// 期权保证金计算
export const getOptionMarginTool: BuiltInTool = {
	name: 'option_margin',
	description: '计算期权保证金(上交所/深交所规则)',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			option_type: {
				type: 'string',
				description: '期权类型: call看涨/put看跌',
				enum: ['call', 'put'],
			},
			position_type: {
				type: 'string',
				description: '持仓类型: buy买入/sell卖出',
				enum: ['buy', 'sell'],
			},
			underlying_price: {
				type: 'number',
				description: '标的价格',
			},
			strike_price: {
				type: 'number',
				description: '行权价格',
			},
			option_price: {
				type: 'number',
				description: '期权价格',
			},
			contracts: {
				type: 'number',
				description: '合约数量',
			},
		},
		required: ['option_type', 'position_type', 'underlying_price', 'strike_price', 'option_price', 'contracts'],
	},
	execute: async (params: { option_type: string; position_type: string; underlying_price: number; strike_price: number; option_price: number; contracts: number }): Promise<string> => {
		try {
			const { option_type, position_type, underlying_price, strike_price, option_price, contracts } = params;
			
			// 买方保证金 = 权利金 × 合约单位 × 合约数
			// 卖方保证金 = (权利金 + Max(12% × 标的价格 - 虚值额, 7% × 标的价格)) × 合约单位 × 合约数
			const contractUnit = 10000; // ETF期权合约单位
			
			if (position_type === 'buy') {
				// 买方保证金就是权利金
				const margin = option_price * contractUnit * contracts;
				return `## 期权保证金计算\n\n` +
					   `类型: ${option_type === 'call' ? '看涨期权' : '看跌期权'} 买入\n` +
					   `标的价格: ${underlying_price}\n` +
					   `行权价: ${strike_price}\n` +
					   `期权价格: ${option_price}\n` +
					   `合约数: ${contracts}\n\n` +
					   `**买方保证金(权利金): ${margin.toFixed(2)} 元**`;
			} else {
				// 卖方保证金计算
				let outOfMoney = 0;
				if (option_type === 'call') {
					// 看涨期权虚值额 = Max(行权价 - 标的价格, 0)
					outOfMoney = Math.max(strike_price - underlying_price, 0);
				} else {
					// 看跌期权虚值额 = Max(标的价格 - 行权价, 0)
					outOfMoney = Math.max(underlying_price - strike_price, 0);
				}
				
				const margin1 = option_price + Math.max(0.12 * underlying_price - outOfMoney, 0.07 * underlying_price);
				const margin = margin1 * contractUnit * contracts;
				
				return `## 期权保证金计算\n\n` +
					   `类型: ${option_type === 'call' ? '看涨期权' : '看跌期权'} 卖出\n` +
					   `标的价格: ${underlying_price}\n` +
					   `行权价: ${strike_price}\n` +
					   `期权价格: ${option_price}\n` +
					   `合约数: ${contracts}\n` +
					   `虚值额: ${outOfMoney.toFixed(4)}\n\n` +
					   `**卖方保证金: ${margin.toFixed(2)} 元**\n\n` +
					   `计算公式: (权利金 + Max(12% × 标的价格 - 虚值额, 7% × 标的价格)) × 合约单位 × 合约数`;
			}
		} catch (error: any) {
			return `计算期权保证金失败: ${error.message}`;
		}
	},
};

// 期权每日统计-深交所
export const getOptionDailyStatsSZSETool: BuiltInTool = {
	name: 'option_daily_stats_szse',
	description: '获取深交所期权每日统计数据',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: '日期,格式YYYY-MM-DD',
			},
		},
		required: ['date'],
	},
	execute: async (params: { date: string }): Promise<string> => {
		try {
			const { date } = params;
			const url = 'http://www.szse.cn/api/report/ShowReport/data';
			const queryParams = {
				SHOWTYPE: 'JSON',
				CATALOGID: '1945_xxpl',
				TABKEY: 'tab1',
				txtDate: date,
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data || data.length === 0) return '暂无数据';
			
			let result = `## 深交所期权每日统计 (${date})\n\n`;
			result += '| 合约标的 | 成交量 | 成交额 | 持仓量 | 成交量占比 |\n';
			result += '|----------|--------|--------|--------|------------|\n';
			
			data.forEach((item: any) => {
				result += `| ${item.hbbz || '-'} | ${item.cjl || '-'} | ${item.cje || '-'} | ${item.ccl || '-'} | ${item.cjlzb || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取深交所期权每日统计失败: ${error.message}`;
		}
	},
};

// 商品期权手续费
export const getOptionCommInfoTool: BuiltInTool = {
	name: 'option_comm_info',
	description: '获取商品期权交易手续费标准',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			exchange: {
				type: 'string',
				description: '交易所: 大商所DCE/郑商所CZCE/上期所SHFE',
				enum: ['DCE', 'CZCE', 'SHFE'],
			},
		},
		required: ['exchange'],
	},
	execute: async (params: { exchange: string }): Promise<string> => {
		try {
			const { exchange } = params;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = {
				reportName: 'RPT_OPTION_COMM_FEE',
				columns: 'ALL',
				filter: `(EXCHANGE='${exchange}')`,
				pageNumber: '1',
				pageSize: '100',
				sortColumns: 'OPTION_CODE',
				sortTypes: '1',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = `## ${exchange}商品期权手续费标准\n\n`;
			result += '| 期权品种 | 开仓手续费 | 平今手续费 | 行权手续费 | 计费方式 |\n';
			result += '|----------|------------|------------|------------|----------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.OPTION_NAME || '-'} | ${item.OPEN_FEE || '-'} | ${item.CLOSE_TODAY_FEE || '-'} | ${item.EXERCISE_FEE || '-'} | ${item.FEE_TYPE || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取期权手续费数据失败: ${error.message}`;
		}
	},
};

// 新浪财经-商品期货-成交持仓
export const getFuturesHoldPosSinaTool: BuiltInTool = {
	name: 'futures_hold_pos_sina',
	description: '获取商品期货成交持仓排名数据',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '期货品种代码,如CU(铜)',
			},
			date: {
				type: 'string',
				description: '日期,格式YYYYMMDD',
			},
		},
		required: ['symbol', 'date'],
	},
	execute: async (params: { symbol: string; date: string }): Promise<string> => {
		try {
			const { symbol, date } = params;
			const url = `https://stock2.finance.sina.com.cn/futures/api/json.php/CffexFuturesService.getCffexFuturesBillData?symbol=${symbol}&date=${date}`;
			
			const response = await requestUrl({ url, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data || data.length === 0) return '暂无数据';
			
			let result = `## ${symbol} 成交持仓排名 (${date})\n\n`;
			result += '### 成交量排名\n';
			result += '| 排名 | 会员简称 | 成交量 | 增减 |\n';
			result += '|------|----------|--------|------|\n';
			
			data.slice(0, 20).forEach((item: any, index: number) => {
				result += `| ${index + 1} | ${item.vname || '-'} | ${item.volume || '-'} | ${item.volumechange || '-'} |\n`;
			});
			
			result += '\n### 持仓量排名\n';
			result += '| 排名 | 会员简称 | 持仓量 | 增减 |\n';
			result += '|------|----------|--------|------|\n';
			
			data.slice(0, 20).forEach((item: any, index: number) => {
				result += `| ${index + 1} | ${item.pname || '-'} | ${item.position || '-'} | ${item.positionchange || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取成交持仓数据失败: ${error.message}`;
		}
	},
};

// A+H 股比价-东财// 上海期货交易所指定交割仓库库存周报
export const getFuturesStockSHFEJSTool: BuiltInTool = {
	name: 'futures_stock_shfe_js',
	description: '获取上期所指定交割仓库库存周报',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '品种代码,如cu/al/zn等',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const today = new Date();
			const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
			const url = `https://www.shfe.com.cn/data/dailydata/kx/kx${dateStr}.dat`;
			
			const response = await requestUrl({ url, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.o_data) return '暂无数据';
			
			const filtered = data.o_data.filter((item: any) => item.VARNAME.toLowerCase() === symbol.toLowerCase());
			
			if (filtered.length === 0) return '暂无该品种数据';
			
			let result = `## ${symbol.toUpperCase()} 交割库库存周报\n\n`;
			result += '| 地区 | 仓库 | 库存 | 增减 |\n';
			result += '|------|------|------|------|\n';
			
			filtered.forEach((item: any) => {
				result += `| ${item.WHABBRNAME || '-'} | ${item.REGNAME || '-'} | ${item.STK || '-'} | ${item.STK_CHG || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取交割库库存数据失败: ${error.message}`;
		}
	},
};

// 全部AB股比价
export const getStockZHABComparisonEMTool: BuiltInTool = {
	name: 'stock_zh_ab_comparison_em',
	description: '获取A股和B股比价数据',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = {
				reportName: 'RPT_AB_COMPARISON',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '200',
				sortColumns: 'AB_RATIO',
				sortTypes: '-1',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## A股B股比价\n\n';
			result += '| A股代码 | A股名称 | A股价格 | B股代码 | B股名称 | B股价格 | AB比价 |\n';
			result += '|---------|---------|---------|---------|---------|---------|--------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.A_STOCK_CODE} | ${item.A_STOCK_NAME} | ${item.A_PRICE} | ${item.B_STOCK_CODE} | ${item.B_STOCK_NAME} | ${item.B_PRICE} | ${item.AB_RATIO} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取AB股比价数据失败: ${error.message}`;
		}
	},
};

// 东方财富-融资融券账户统计
export const getStockMarginAccountInfoTool: BuiltInTool = {
	name: 'stock_margin_account_info',
	description: '获取融资融券账户统计信息',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = {
				reportName: 'RPT_MARGIN_ACCOUNT',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '100',
				sortColumns: 'TRADE_DATE',
				sortTypes: '-1',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## 融资融券账户统计\n\n';
			result += '| 日期 | 融资账户数 | 融券账户数 | 融资融券账户数 | 环比变化 |\n';
			result += '|------|------------|------------|----------------|----------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.TRADE_DATE} | ${item.RZ_ACCOUNT || '-'} | ${item.RQ_ACCOUNT || '-'} | ${item.RZRQ_ACCOUNT || '-'} | ${item.CHANGE_RATE || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取融资融券账户统计失败: ${error.message}`;
		}
	},
};

// CME比特币成交量
export const getCryptoBitcoinCMETool: BuiltInTool = {
	name: 'crypto_bitcoin_cme',
	description: '获取CME比特币期货成交量数据',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = {
				reportName: 'RPT_CME_BITCOIN',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '100',
				sortColumns: 'TRADE_DATE',
				sortTypes: '-1',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## CME比特币期货成交量\n\n';
			result += '| 日期 | 成交量 | 未平仓合约 | 成交额 | 变化率 |\n';
			result += '|------|--------|------------|--------|--------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.TRADE_DATE} | ${item.VOLUME || '-'} | ${item.OPEN_INTEREST || '-'} | ${item.AMOUNT || '-'} | ${item.CHANGE_RATE || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取CME比特币数据失败: ${error.message}`;
		}
	},
};

// 比特币持仓报告
export const getCryptoBitcoinHoldReportTool: BuiltInTool = {
	name: 'crypto_bitcoin_hold_report',
	description: '获取比特币持仓报告(机构持仓分析)',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = {
				reportName: 'RPT_BITCOIN_HOLD',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '100',
				sortColumns: 'REPORT_DATE',
				sortTypes: '-1',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## 比特币机构持仓报告\n\n';
			result += '| 报告日期 | 机构名称 | 持仓数量 | 持仓市值(亿美元) | 占流通比例 |\n';
			result += '|----------|----------|----------|------------------|------------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.REPORT_DATE} | ${item.ORG_NAME || '-'} | ${item.HOLD_AMOUNT || '-'} | ${item.HOLD_VALUE || '-'} | ${item.HOLD_RATIO || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取比特币持仓报告失败: ${error.message}`;
		}
	},
};

