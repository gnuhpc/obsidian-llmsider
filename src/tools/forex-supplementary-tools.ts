// Forex Supplementary Tools - Additional FX Data
// 外汇补充数据工具

import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 外汇掉期报价
 */
export const getFXSwapQuoteTool: BuiltInTool = {
	name: 'fx_swap_quote',
	description: '获取外汇掉期(Swap)报价数据，包括远期点数和掉期价格',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '货币对代码，如"USDCNY"'
			},
			tenor: {
				type: 'string',
				description: '期限，如"1M"(1个月)、"3M"(3个月)、"6M"(6个月)、"1Y"(1年)',
				enum: ['ON', 'TN', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y']
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; tenor?: string }): Promise<string> => {
		try {
			const tenor = args.tenor || '3M';
			const apiUrl = `https://cn.investing.com/currencies/${args.symbol.toLowerCase()}`;
			
			let result = `## 外汇掉期报价 - ${args.symbol}\n\n`;
			result += `期限: ${tenor}\n`;
			result += `更新时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
			
			result += `### 掉期点数\n`;
			result += `- **买入点**: --\n`;
			result += `- **卖出点**: --\n`;
			result += `- **中间价点**: --\n\n`;
			
			result += `### 远期价格\n`;
			result += `- **买入价**: --\n`;
			result += `- **卖出价**: --\n`;
			result += `- **中间价**: --\n\n`;
			
			result += `### 说明\n`;
			result += `外汇掉期(FX Swap)是一种同时买入和卖出相同金额但交割日不同的两笔货币交易。\n`;
			result += `掉期点数反映了两种货币之间的利率差异。\n\n`;
			result += `**计算公式**: 远期价格 = 即期价格 + 掉期点数\n`;
			
			result += `\n注: 实时掉期报价需要专业外汇数据源，建议使用Bloomberg、Reuters等终端。`;
			
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取外汇掉期报价失败: ${errorMessage}`;
		}
	},
	};

/**
 * 外汇货币对报价
 */
export const getFXPairQuoteTool: BuiltInTool = {
	name: 'fx_pair_quote',
	description: '获取外汇货币对的详细报价，包括买卖价差、点值等信息',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '货币对代码，如"EURUSD"、"GBPUSD"、"USDJPY"等'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }): Promise<string> => {
		try {
			// 使用新浪财经获取外汇报价
			const sinaSymbol = `fx_s${args.symbol.toLowerCase()}`;
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
				return `未找到货币对 ${args.symbol} 的报价数据`;
			}

			const data = match[1].split(',');
			
			let result = `## 外汇货币对报价 - ${args.symbol}\n\n`;
			result += `更新时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
			
			// 解析数据字段
			const time = data[0] || '--';
			const bid = parseFloat(data[1]) || 0;
			const ask = parseFloat(data[2]) || 0;
			const high = parseFloat(data[3]) || 0;
			const low = parseFloat(data[4]) || 0;
			const prevClose = parseFloat(data[5]) || 0;
			
			const spread = (ask - bid).toFixed(5);
			const midPrice = ((bid + ask) / 2).toFixed(5);
			const change = (bid - prevClose).toFixed(5);
			const changePct = prevClose ? ((bid - prevClose) / prevClose * 100).toFixed(2) : '0.00';
			
			result += `### 实时报价\n`;
			result += `- **买入价(Bid)**: ${bid}\n`;
			result += `- **卖出价(Ask)**: ${ask}\n`;
			result += `- **中间价**: ${midPrice}\n`;
			result += `- **点差(Spread)**: ${spread}\n\n`;
			
			result += `### 涨跌情况\n`;
			result += `- **前收盘**: ${prevClose}\n`;
			result += `- **涨跌额**: ${change}\n`;
			result += `- **涨跌幅**: ${changePct}%\n\n`;
			
			result += `### 价格区间\n`;
			result += `- **最高价**: ${high}\n`;
			result += `- **最低价**: ${low}\n`;
			result += `- **波动幅度**: ${(high - low).toFixed(5)}\n\n`;
			
			result += `### 交易信息\n`;
			result += `- **报价时间**: ${time}\n`;
			result += `- **交易状态**: ${new Date().getHours() >= 9 && new Date().getHours() < 17 ? '交易中' : '休市'}\n\n`;
			
			// 计算点值
			result += `### 点值计算\n`;
			result += `- **最小变动单位**: 0.0001 (大部分货币对)\n`;
			result += `- **标准手**: 100,000 基础货币\n`;
			result += `- **迷你手**: 10,000 基础货币\n\n`;
			
			result += `### 货币对说明\n`;
			const baseCurrency = args.symbol.substring(0, 3);
			const quoteCurrency = args.symbol.substring(3, 6);
			result += `- **基础货币**: ${baseCurrency}\n`;
			result += `- **报价货币**: ${quoteCurrency}\n`;
			result += `- **含义**: 1 ${baseCurrency} = ${bid} ${quoteCurrency}\n`;

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取外汇货币对报价失败: ${errorMessage}`;
		}
	},
	};

/**
 * 主要货币对实时行情
 */
export const getMajorFXPairsTool: BuiltInTool = {
	name: 'fx_major_pairs_realtime',
	description: '获取主要外汇货币对的实时行情汇总',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
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

			let result = `## 主要外汇货币对实时行情\n\n`;
			result += `更新时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
			result += `| 货币对 | 买入价 | 卖出价 | 涨跌幅 | 最高 | 最低 |\n`;
			result += `|--------|--------|--------|--------|------|------|\n`;
			
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
					const changePct = prevClose ? ((bid - prevClose) / prevClose * 100).toFixed(2) : '0.00';
					
					result += `| ${pair} | ${bid.toFixed(5)} | ${ask.toFixed(5)} | ${changePct}% | ${high.toFixed(5)} | ${low.toFixed(5)} |\n`;
				}
			});
			
			result += `\n### 说明\n`;
			result += `以上为G7主要货币对行情，被称为"Majors":\n`;
			result += `- **EUR/USD**: 欧元/美元 - 交易量最大的货币对\n`;
			result += `- **GBP/USD**: 英镑/美元 - 又称"Cable"\n`;
			result += `- **USD/JPY**: 美元/日元 - 亚洲最活跃货币对\n`;
			result += `- **USD/CHF**: 美元/瑞郎 - 避险货币对\n`;
			result += `- **AUD/USD**: 澳元/美元 - 商品货币代表\n`;
			result += `- **USD/CAD**: 美元/加元 - 又称"Loonie"\n`;
			result += `- **NZD/USD**: 纽元/美元 - 又称"Kiwi"\n`;

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取主要货币对行情失败: ${errorMessage}`;
		}
	},
	};
