/**
 * 股票人气与技术分析工具集
 * Stock Popularity and Technical Analysis Tools
 */

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

// 东方财富-个股人气榜-人气榜
export const getStockHotRankEMTool: BuiltInTool = {
	name: 'stock_hot_rank_em',
	description: '获取东方财富网个股人气榜排名数据',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '市场类型: A股/港股/美股',
				enum: ['A股', '港股', '美股'],
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const marketMap: Record<string, string> = { 'A股': 'HA', '港股': 'HK', '美股': 'US' };
			const market = marketMap[symbol] || 'HA';
			
			const url = 'https://emappdata.eastmoney.com/stockrank/getAllCurrentList';
			const response = await requestUrl({
				url,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					appId: 'appId01',
					globalId: '786e4c21-70dc-435a-93bb-38',
					marketType: market,
					pageNo: 1,
					pageSize: 100,
				}),
			});
			
			const data = JSON.parse(response.text);
			if (!data.data) return '暂无数据';
			
			let result = `## 东方财富${symbol}人气榜\n\n`;
			result += '| 排名 | 股票代码 | 股票名称 | 最新价 | 涨跌幅 | 人气值 |\n';
			result += '|------|----------|----------|--------|--------|--------|\n';
			
			data.data.forEach((item: any, index: number) => {
				result += `| ${index + 1} | ${item.sc || '-'} | ${item.sn || '-'} | ${item.np || '-'} | ${item.zdf || '-'}% | ${item.pc || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取人气榜数据失败: ${error.message}`;
		}
	},
};

// 筹码分布
export const getStockCYQEMTool: BuiltInTool = {
	name: 'stock_cyq_em',
	description: '获取个股筹码分布数据',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码,如600000',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			// 根据股票代码判断市场
			const market = symbol.startsWith('6') ? '1' : '0';
			const url = `https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get`;
			const queryParams = {
				secid: `${market}.${symbol}`,
				fields1: 'f1,f2,f3,f7',
				fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63',
				lmt: '120',
			};			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.data?.klines) return '暂无数据';
			
			let result = `## ${symbol} 筹码分布数据\n\n`;
			result += '| 日期 | 收盘价 | 平均成本 | 获利盘比例 | 90%成本区间 |\n';
			result += '|------|--------|----------|------------|-------------|\n';
			
			data.data.klines.forEach((line: string) => {
				const items = line.split(',');
				result += `| ${items[0]} | ${items[1]} | ${items[7] || '-'} | ${items[8] || '-'}% | ${items[9] || '-'} - ${items[10] || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取筹码分布数据失败: ${error.message}`;
		}
	},
};

// 东财-日内分时数据
export const getStockIntradayEMTool: BuiltInTool = {
	name: 'stock_intraday_em',
	description: '获取个股日内分时数据-东方财富',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码,如600000',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const secid = `${symbol.startsWith('6') ? '1' : '0'}.${symbol}`;
			const url = `https://push2.eastmoney.com/api/qt/stock/trends2/get`;
			const queryParams = {
				secid,
				fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
				fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
				iscr: '0',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.data?.trends) return '暂无数据';
			
			let result = `## ${symbol} 日内分时数据\n\n`;
			result += '| 时间 | 价格 | 成交量 | 成交额 | 均价 |\n';
			result += '|------|------|--------|--------|------|\n';
			
			const lines = data.data.trends.slice(-50); // 最后50条
			lines.forEach((line: string) => {
				const items = line.split(',');
				result += `| ${items[0]} | ${items[1]} | ${items[2]} | ${items[3]} | ${items[4]} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取分时数据失败: ${error.message}`;
		}
	},
};

// 东方财富-行情报价(买卖五档)
export const getStockBidAskEMTool: BuiltInTool = {
	name: 'stock_bid_ask_em',
	description: '获取个股实时买卖五档报价数据',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码,如600000',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const secid = `${symbol.startsWith('6') ? '1' : '0'}.${symbol}`;
			const url = `https://push2.eastmoney.com/api/qt/stock/get`;
			const queryParams = {
				secid,
				fields: 'f57,f58,f59,f60,f61,f62,f63,f64,f65,f66,f67,f68,f69,f70,f71,f72,f73,f74,f75,f76',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.data) return '暂无数据';
			
			const d = data.data;
			let result = `## ${symbol} 实时买卖五档\n\n`;
			result += '### 卖盘\n';
			result += '| 档位 | 价格 | 数量 |\n';
			result += '|------|------|------|\n';
			result += `| 卖五 | ${d.f75 || '-'} | ${d.f76 || '-'} |\n`;
			result += `| 卖四 | ${d.f73 || '-'} | ${d.f74 || '-'} |\n`;
			result += `| 卖三 | ${d.f71 || '-'} | ${d.f72 || '-'} |\n`;
			result += `| 卖二 | ${d.f69 || '-'} | ${d.f70 || '-'} |\n`;
			result += `| 卖一 | ${d.f67 || '-'} | ${d.f68 || '-'} |\n`;
			result += '\n### 买盘\n';
			result += '| 档位 | 价格 | 数量 |\n';
			result += '|------|------|------|\n';
			result += `| 买一 | ${d.f57 || '-'} | ${d.f58 || '-'} |\n`;
			result += `| 买二 | ${d.f59 || '-'} | ${d.f60 || '-'} |\n`;
			result += `| 买三 | ${d.f61 || '-'} | ${d.f62 || '-'} |\n`;
			result += `| 买四 | ${d.f63 || '-'} | ${d.f64 || '-'} |\n`;
			result += `| 买五 | ${d.f65 || '-'} | ${d.f66 || '-'} |\n`;
			
			return result;
		} catch (error: any) {
			return `获取买卖五档数据失败: ${error.message}`;
		}
	},
};

// 盘口异动
export const getStockChangesEMTool: BuiltInTool = {
	name: 'stock_changes_em',
	description: '获取东方财富网盘口异动数据',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '异动类型: 火箭发射/快速反弹/大笔买入/封涨停板/打开跌停板/有大买盘/竞价上涨/高开5日线/向上缺口/60日新高/60日大幅上涨/加速下跌/高台跳水/大笔卖出/封跌停板/打开涨停板/有大卖盘/竞价下跌/低开5日线/向下缺口/60日新低/60日大幅下跌',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const url = 'https://push2.eastmoney.com/api/qt/clist/get';
			const queryParams = {
				pn: '1',
				pz: '100',
				po: '1',
				np: '1',
				fltt: '2',
				invt: '2',
				fid: 'f3',
				fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
				fields: 'f12,f14,f2,f3,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,f204,f205,f124,f1,f13',
				ut: 'fa5fd1943c7b386f172d6893dbfba10b',
				cb: 'jQuery',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const text = response.text.replace(/^jQuery\d+_\d+\(/, '').replace(/\);?$/, '');
			const data = JSON.parse(text);
			
			if (!data.data?.diff) return '暂无数据';
			
			let result = `## 盘口异动 - ${symbol}\n\n`;
			result += '| 代码 | 名称 | 最新价 | 涨跌幅 | 异动时间 | 异动类型 |\n';
			result += '|------|------|--------|--------|----------|----------|\n';
			
			data.data.diff.forEach((item: any) => {
				result += `| ${item.f12} | ${item.f14} | ${item.f2 || '-'} | ${item.f3 || '-'}% | ${item.f204 || '-'} | ${item.f205 || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取盘口异动数据失败: ${error.message}`;
		}
	},
};

// 板块异动
export const getStockBoardChangeEMTool: BuiltInTool = {
	name: 'stock_board_change_em',
	description: '获取东方财富网板块异动数据',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://push2.eastmoney.com/api/qt/clist/get';
			const queryParams = {
				pn: '1',
				pz: '100',
				po: '1',
				np: '1',
				fltt: '2',
				invt: '2',
				fid: 'f3',
				fs: 'm:90+t:2',
				fields: 'f12,f14,f2,f3,f62,f128,f136,f115,f152',
				ut: 'fa5fd1943c7b386f172d6893dbfba10b',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.data?.diff) return '暂无数据';
			
			let result = '## 板块异动\n\n';
			result += '| 板块名称 | 最新价 | 涨跌幅 | 领涨股 | 领涨股涨幅 |\n';
			result += '|----------|--------|--------|--------|------------|\n';
			
			data.data.diff.forEach((item: any) => {
				result += `| ${item.f14} | ${item.f2 || '-'} | ${item.f3 || '-'}% | ${item.f128 || '-'} | ${item.f136 || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取板块异动数据失败: ${error.message}`;
		}
	},
};

// 雪球-沪深股市-热度排行榜-关注排行榜
export const getStockHotFollowXQTool: BuiltInTool = {
	name: 'stock_hot_follow_xq',
	description: '获取雪球沪深股市关注排行榜',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://stock.xueqiu.com/v5/stock/hot_stock/list.json';
			const params = {
				size: '100',
				type: 'follow',
				_type: '12',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({
				url: `${url}?${queryString}`,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0',
				},
			});
			const data = JSON.parse(response.text);
			
			if (!data.data?.items) return '暂无数据';
			
			let result = '## 雪球关注排行榜\n\n';
			result += '| 排名 | 股票代码 | 股票名称 | 最新价 | 涨跌幅 | 关注人数 |\n';
			result += '|------|----------|----------|--------|--------|----------|\n';
			
			data.data.items.forEach((item: any, index: number) => {
				result += `| ${index + 1} | ${item.symbol || '-'} | ${item.name || '-'} | ${item.current || '-'} | ${item.percent || '-'}% | ${item.follow || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取雪球关注排行榜失败: ${error.message}`;
		}
	},
};

// 雪球-沪深股市-热度排行榜-讨论排行榜
export const getStockHotTweetXQTool: BuiltInTool = {
	name: 'stock_hot_tweet_xq',
	description: '获取雪球沪深股市讨论排行榜',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://stock.xueqiu.com/v5/stock/hot_stock/list.json';
			const params = {
				size: '100',
				type: 'tweet',
				_type: '12',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({
				url: `${url}?${queryString}`,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0',
				},
			});
			const data = JSON.parse(response.text);
			
			if (!data.data?.items) return '暂无数据';
			
			let result = '## 雪球讨论排行榜\n\n';
			result += '| 排名 | 股票代码 | 股票名称 | 最新价 | 涨跌幅 | 讨论数 |\n';
			result += '|------|----------|----------|--------|--------|--------|\n';
			
			data.data.items.forEach((item: any, index: number) => {
				result += `| ${index + 1} | ${item.symbol || '-'} | ${item.name || '-'} | ${item.current || '-'} | ${item.percent || '-'}% | ${item.tweet || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取雪球讨论排行榜失败: ${error.message}`;
		}
	},
};

// 雪球-内部交易
export const getStockInnerTradeXQTool: BuiltInTool = {
	name: 'stock_inner_trade_xq',
	description: '获取个股内部交易数据(高管增减持)',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码,如SH600000',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const url = `https://stock.xueqiu.com/v5/stock/f10/cn/skholderchg.json`;
			const queryParams = {
				symbol,
				count: '100',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({
				url: `${url}?${queryString}`,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0',
				},
			});
			const data = JSON.parse(response.text);
			
			if (!data.data?.items) return '暂无数据';
			
			let result = `## ${symbol} 内部交易(高管增减持)\n\n`;
			result += '| 日期 | 变动人 | 职位 | 变动股数 | 变动后持股 | 变动原因 |\n';
			result += '|------|--------|------|----------|------------|----------|\n';
			
			data.data.items.forEach((item: any) => {
				result += `| ${item.date || '-'} | ${item.holder_name || '-'} | ${item.position || '-'} | ${item.change_shares || '-'} | ${item.hold_shares || '-'} | ${item.change_reason || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取内部交易数据失败: ${error.message}`;
		}
	},
};

// 百度股市通-热搜股票
export const getStockHotSearchBaiduTool: BuiltInTool = {
	name: 'stock_hot_search_baidu',
	description: '获取百度股市通热搜股票排行',
  category: 'search-engines',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://gushitong.baidu.com/opendata';
			const params = {
				resource_id: '5352',
				query: '热搜股票',
				pn: '0',
				rn: '100',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.Result?.DisplayData?.resultData?.tplData?.result?.list) return '暂无数据';
			
			const list = data.Result.DisplayData.resultData.tplData.result.list;
			let result = '## 百度股市通热搜股票\n\n';
			result += '| 排名 | 股票代码 | 股票名称 | 最新价 | 涨跌幅 | 搜索热度 |\n';
			result += '|------|----------|----------|--------|--------|----------|\n';
			
			list.forEach((item: any, index: number) => {
				result += `| ${index + 1} | ${item.code || '-'} | ${item.name || '-'} | ${item.price || '-'} | ${item.ratio || '-'}% | ${item.heat || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取百度热搜股票失败: ${error.message}`;
		}
	},
};

// A股-等权重市盈率、中位数市盈率
export const getStockATTMLYRTool: BuiltInTool = {
	name: 'stock_a_ttm_lyr',
	description: '获取全部A股等权重市盈率和中位数市盈率',
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
				reportName: 'RPT_MARKETVALUE_ANALYSE',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '500',
				sortColumns: 'TRADE_DATE',
				sortTypes: '-1',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## 全部A股市盈率分析\n\n';
			result += '| 日期 | 等权重PE(TTM) | 中位数PE(TTM) | 等权重PE(LYR) | 中位数PE(LYR) |\n';
			result += '|------|---------------|---------------|---------------|---------------|\n';
			
			data.result.data.slice(0, 100).forEach((item: any) => {
				result += `| ${item.TRADE_DATE} | ${item.AVG_PE_TTM || '-'} | ${item.MEDIAN_PE_TTM || '-'} | ${item.AVG_PE_LYR || '-'} | ${item.MEDIAN_PE_LYR || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取A股市盈率数据失败: ${error.message}`;
		}
	},
};

// A股-等权重市净率、中位数市净率
export const getStockAAllPBTool: BuiltInTool = {
	name: 'stock_a_all_pb',
	description: '获取全部A股等权重市净率和中位数市净率',
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
				reportName: 'RPT_MARKETVALUE_PB_ANALYSE',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '500',
				sortColumns: 'TRADE_DATE',
				sortTypes: '-1',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## 全部A股市净率分析\n\n';
			result += '| 日期 | 等权重PB | 中位数PB | 破净股数量 | 破净股占比 |\n';
			result += '|------|----------|----------|------------|------------|\n';
			
			data.result.data.slice(0, 100).forEach((item: any) => {
				result += `| ${item.TRADE_DATE} | ${item.AVG_PB || '-'} | ${item.MEDIAN_PB || '-'} | ${item.BELOW_NET_COUNT || '-'} | ${item.BELOW_NET_RATIO || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取A股市净率数据失败: ${error.message}`;
		}
	},
};

// 股本结构
export const getStockZHAGBJGEMTool: BuiltInTool = {
	name: 'stock_zh_a_gbjg_em',
	description: '获取个股股本结构数据',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '股票代码,如600000',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const url = 'https://emweb.securities.eastmoney.com/PC_HSF10/CapitalStockStructure/CapitalStockStructureAjax';
			const queryParams = {
				code: `${symbol.startsWith('6') ? 'SH' : 'SZ'}${symbol}`,
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.gbjgList) return '暂无数据';
			
			let result = `## ${symbol} 股本结构\n\n`;
			result += '| 变动日期 | 总股本 | 流通A股 | 限售A股 | 流通比例 |\n';
			result += '|----------|--------|---------|---------|----------|\n';
			
			data.gbjgList.forEach((item: any) => {
				result += `| ${item.CHANGE_DATE} | ${item.TOTAL_SHARES} | ${item.FREE_A_SHARES} | ${item.LIMITED_A_SHARES} | ${item.FREE_RATIO}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取股本结构数据失败: ${error.message}`;
		}
	},
};
