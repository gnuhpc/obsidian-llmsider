// Futures roll yield and advanced position data tools
// 期货展期收益率和高级持仓数据工具

import { requestUrl } from 'obsidian';
import { Logger } from './../utils/logger';
import type { BuiltInTool } from './built-in-tools';

/**
 * 期货展期收益率 - get_roll_yield_bar
 * 获取某品种的展期收益率数据
 */
export const getRollYieldBarTool: BuiltInTool = {
	name: 'get_roll_yield_bar',
	description: '获取期货展期收益率数据。展期收益率反映了主力合约和次主力合约之间的价差关系，用于判断期货市场的期限结构。type_method可选"date"(按日期)或"var"(按品种)。',
  category: 'bonds',
	inputSchema: {
		type: 'object',
		properties: {
			type_method: {
				type: 'string',
				description: '查询方式："date"(按日期查询)或"var"(按品种查询)',
				enum: ['date', 'var']
			},
			var: {
				type: 'string',
				description: '品种代码，如"RB"(螺纹钢)、"CU"(铜)、"AL"(铝)等'
			},
			start_day: {
				type: 'string',
				description: '开始日期，格式YYYYMMDD，如"20180618"'
			},
			end_day: {
				type: 'string',
				description: '结束日期，格式YYYYMMDD，如"20180718"'
			}
		},
		required: ['type_method', 'var']
	},
	execute: async (args: { type_method: string; var: string; start_day?: string; end_day?: string }): Promise<string> => {
		try {
			const apiUrl = 'https://ft.10jqka.com.cn/api/roll_yield/get_roll_yield_bar/';
			const params = new URLSearchParams({
				type_method: args.type_method,
				var: args.var
			});

			if (args.start_day) params.append('start_day', args.start_day);
			if (args.end_day) params.append('end_day', args.end_day);

			const response = await requestUrl({
				url: `${apiUrl}?${params.toString()}`,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0',
					'Accept': 'application/json'
				}
			});

			const data = response.json;
			
			if (!data || !data.data || data.data.length === 0) {
				return `未找到品种 ${args.var} 的展期收益率数据`;
			}

			let result = `## 期货展期收益率 - ${args.var}\n\n`;
			result += `| 日期 | 展期收益率 | 最近合约 | 下一期合约 |\n`;
			result += `|------|-----------|----------|----------|\n`;

			data.data.forEach((item: any) => {
				result += `| ${item.date || item[0]} | ${(parseFloat(item.roll_yield || item[1]) * 100).toFixed(4)}% | ${item.near_by || item[2]} | ${item.deferred || item[3]} |\n`;
			});

			return result;
		} catch (error) {
			Logger.error('Error fetching roll yield data:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取展期收益率数据失败: ${errorMessage}`;
		}
	},
	};

/**
 * 期货会员持仓排名 - 中金所
 */
export const getCFFEXRankTableTool: BuiltInTool = {
	name: 'get_cffex_rank_table',
	description: '获取中国金融期货交易所前20会员持仓数据明细',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			trade_date: {
				type: 'string',
				description: '交易日期，格式YYYYMMDD'
			},
			symbol: {
				type: 'string',
				description: '合约代码，如"IF"、"IC"、"IH"等'
			}
		},
		required: ['trade_date', 'symbol']
	},
	execute: async (args: { trade_date: string; symbol: string }): Promise<string> => {
		try {
			const apiUrl = `http://www.cffex.com.cn/sj/ccpm/${args.trade_date}/${args.symbol}.xml`;
			
			const response = await requestUrl({
				url: apiUrl,
				method: 'GET'
			});

			return `获取到 ${args.symbol} 的持仓数据\n\n${response.text.substring(0, 500)}...`;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取中金所持仓排名失败: ${errorMessage}`;
		}
	},
	};

/**
 * 期货会员持仓排名 - 郑商所
 */
export const getRankTableCZCETool: BuiltInTool = {
	name: 'get_rank_table_czce',
	description: '获取郑州商品交易所前20会员持仓数据明细',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			trade_date: {
				type: 'string',
				description: '交易日期，格式YYYYMMDD'
			},
			symbol: {
				type: 'string',
				description: '合约代码，如"AP"、"CF"、"SR"等'
			}
		},
		required: ['trade_date', 'symbol']
	},
	execute: async (args: { trade_date: string; symbol: string }): Promise<string> => {
		try {
			const year = args.trade_date.substring(0, 4);
			const apiUrl = `http://www.czce.com.cn/cn/DFSStaticFiles/Future/${year}/${args.trade_date}/FutureDataHolding.txt`;
			
			const response = await requestUrl({
				url: apiUrl,
				method: 'GET'
			});

			return `郑商所 ${args.symbol} 持仓排名数据:\n\n${response.text.substring(0, 800)}`;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取郑商所持仓排名失败: ${errorMessage}`;
		}
	},
	};

/**
 * 期货会员持仓排名 - 大商所
 */
export const getDCERankTableTool: BuiltInTool = {
	name: 'get_dce_rank_table',
	description: '获取大连商品交易所前20会员持仓数据明细',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			trade_date: {
				type: 'string',
				description: '交易日期，格式YYYYMMDD'
			},
			symbol: {
				type: 'string',
				description: '合约代码，如"i"、"j"、"m"等'
			}
		},
		required: ['trade_date', 'symbol']
	},
	execute: async (args: { trade_date: string; symbol: string }): Promise<string> => {
		try {
			const apiUrl = 'http://www.dce.com.cn/publicweb/quotesdata/exportMemberDealPosiQuotesBatchData.html';
			
			const formData = new URLSearchParams();
			formData.append('memberDealPosiQuotes.variety', args.symbol);
			formData.append('memberDealPosiQuotes.trade_date', args.trade_date);
			formData.append('contract_id', '');
			formData.append('trade_date', args.trade_date);

			const response = await requestUrl({
				url: apiUrl,
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: formData.toString()
			});

			return `大商所 ${args.symbol} 持仓排名数据已获取`;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取大商所持仓排名失败: ${errorMessage}`;
		}
	},
	};

/**
 * 上期所日成交均价
 */
export const getSHFEVWAPTool: BuiltInTool = {
	name: 'get_shfe_v_wap',
	description: '获取上海期货交易所日成交均价数据',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			trade_date: {
				type: 'string',
				description: '交易日期，格式YYYYMMDD'
			}
		},
		required: ['trade_date']
	},
	execute: async (args: { trade_date: string }): Promise<string> => {
		try {
			const year = args.trade_date.substring(0, 4);
			const month = args.trade_date.substring(4, 6);
			const day = args.trade_date.substring(6, 8);
			
			const apiUrl = `https://www.shfe.com.cn/data/dailydata/kx/pm${year}${month}${day}.dat`;
			
			const response = await requestUrl({
				url: apiUrl,
				method: 'GET'
			});

			const data = response.json;
			
			let result = `## 上期所成交均价 - ${args.trade_date}\n\n`;
			result += `| 合约 | 成交均价 | 成交量 | 持仓量 |\n`;
			result += `|------|---------|--------|--------|\n`;

			if (data && data.o_currefprice) {
				data.o_currefprice.forEach((item: any) => {
					result += `| ${item.INSTRUMENTID} | ${item.AVGPRICE} | ${item.VOLUME} | ${item.OPENINTEREST} |\n`;
				});
			}

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取上期所成交均价失败: ${errorMessage}`;
		}
	},
	};

/**
 * 广期所每日交易数据
 */
export const getGFEXDailyTool: BuiltInTool = {
	name: 'get_gfex_daily',
	description: '获取广州期货交易所每日交易数据',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			trade_date: {
				type: 'string',
				description: '交易日期，格式YYYY-MM-DD'
			}
		},
		required: ['trade_date']
	},
	execute: async (args: { trade_date: string }): Promise<string> => {
		try {
			const apiUrl = `http://www.gfex.com.cn/u/interfacesWebTtQueryContractInfo/loadList`;
			
			const response = await requestUrl({
				url: apiUrl,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					trade_date: args.trade_date
				})
			});

			const data = response.json;
			
			let result = `## 广期所每日交易数据 - ${args.trade_date}\n\n`;
			result += `| 合约 | 收盘价 | 结算价 | 涨跌 | 成交量 | 持仓量 |\n`;
			result += `|------|--------|--------|------|--------|--------|\n`;

			if (data && data.data) {
				data.data.forEach((item: any) => {
					result += `| ${item.contractCode} | ${item.closePrice} | ${item.settlePrice} | ${item.zd} | ${item.dealAmount} | ${item.holdAmount} |\n`;
				});
			}

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取广期所数据失败: ${errorMessage}`;
		}
	},
	};


