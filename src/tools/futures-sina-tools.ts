// Sina Futures Data Tools
// 新浪期货数据工具

import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 国内期货实时行情
 */
export const getFuturesZhSpotTool: BuiltInTool = {
	name: 'futures_zh_spot',
	description: '获取国内期货实时行情数据，包括所有交易所的期货品种',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '期货代码，如"RB0"(螺纹钢主力)、"CU0"(铜主力)等。主力合约用0表示'
			}
		},
		required: []
	},
	execute: async (args: { symbol?: string }): Promise<string> => {
		try {
			const apiUrl = 'https://hq.sinajs.cn/list=';
			const symbols = args.symbol ? [args.symbol] : [
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
			let result = `## 国内期货实时行情\n\n`;
			result += `| 代码 | 名称 | 最新价 | 涨跌 | 涨跌幅 | 开盘价 | 最高价 | 最低价 | 成交量 |\n`;
			result += `|------|------|--------|------|--------|--------|--------|--------|--------|\n`;

			lines.forEach(line => {
				const match = line.match(/var hq_str_nf_(.+?)="(.+)";/);
				if (match) {
					const code = match[1];
					const data = match[2].split(',');
					if (data.length >= 8) {
						const [name, , open, high, low, , current, , , change, changePercent, volume] = data;
						result += `| ${code} | ${name} | ${current} | ${change} | ${changePercent}% | ${open} | ${high} | ${low} | ${volume} |\n`;
					}
				}
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取国内期货实时行情失败: ${errorMessage}`;
		}
	},
	};

/**
 * 国内期货实时行情（按品种）
 */
export const getFuturesZhRealtimeTool: BuiltInTool = {
	name: 'futures_zh_realtime',
	description: '获取国内期货指定品种的实时行情数据',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '期货品种代码，如"RB"(螺纹钢)、"CU"(铜)、"AL"(铝)等'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }): Promise<string> => {
		try {
			const apiUrl = `https://hq.sinajs.cn/list=nf_${args.symbol}0`;
			
			const response = await requestUrl({
				url: apiUrl,
				method: 'GET',
				headers: {
					'Referer': 'https://finance.sina.com.cn'
				}
			});

			const match = response.text.match(/var hq_str_nf_.+?="(.+)";/);
			if (!match) {
				return `未找到品种 ${args.symbol} 的行情数据`;
			}

			const data = match[1].split(',');
			let result = `## 期货实时行情 - ${args.symbol}\n\n`;
			result += `- **名称**: ${data[0]}\n`;
			result += `- **最新价**: ${data[6]}\n`;
			result += `- **涨跌**: ${data[9]}\n`;
			result += `- **涨跌幅**: ${data[10]}%\n`;
			result += `- **开盘价**: ${data[2]}\n`;
			result += `- **最高价**: ${data[3]}\n`;
			result += `- **最低价**: ${data[4]}\n`;
			result += `- **昨收价**: ${data[5]}\n`;
			result += `- **成交量**: ${data[11]}\n`;
			result += `- **持仓量**: ${data[13]}\n`;
			result += `- **成交额**: ${data[12]}\n`;

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取期货实时行情失败: ${errorMessage}`;
		}
	},
	};

/**
 * 外盘期货实时行情
 */
export const getFuturesForeignRealtimeTool: BuiltInTool = {
	name: 'futures_foreign_commodity_realtime',
	description: '获取外盘期货实时行情数据，包括LME、COMEX、NYMEX等交易所品种',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '外盘期货代码，如"CL"(原油)、"GC"(黄金)、"SI"(白银)等'
			}
		},
		required: []
	},
	execute: async (args: { symbol?: string }): Promise<string> => {
		try {
			const symbols = args.symbol ? [args.symbol] : ['CL', 'GC', 'SI', 'HG'];
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
			let result = `## 外盘期货实时行情\n\n`;
			result += `| 代码 | 名称 | 最新价 | 涨跌 | 涨跌幅 | 开盘 | 最高 | 最低 |\n`;
			result += `|------|------|--------|------|--------|------|------|------|\n`;

			lines.forEach(line => {
				const match = line.match(/var hq_str_hf_(.+?)="(.+)";/);
				if (match) {
					const code = match[1];
					const data = match[2].split(',');
					if (data.length >= 8) {
						result += `| ${code} | ${data[0]} | ${data[1]} | ${data[2]} | ${data[3]}% | ${data[4]} | ${data[5]} | ${data[6]} |\n`;
					}
				}
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取外盘期货实时行情失败: ${errorMessage}`;
		}
	},
	};

/**
 * 内盘期货分时数据
 */
export const getFuturesZhMinuteSinaTool: BuiltInTool = {
	name: 'futures_zh_minute_sina',
	description: '获取国内期货分时数据（1分钟级别）',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '期货合约代码，如"RB2310"、"CU2309"等'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }): Promise<string> => {
		try {
			const apiUrl = `https://stock2.finance.sina.com.cn/futures/api/json.php/IndexService.getInnerFuturesMiniKLine5m?symbol=${args.symbol}`;
			
			const response = await requestUrl({
				url: apiUrl,
				method: 'GET',
				headers: {
					'Referer': 'https://finance.sina.com.cn'
				}
			});

			const data = JSON.parse(response.text);
			
			if (!data || data.length === 0) {
				return `未找到合约 ${args.symbol} 的分时数据`;
			}

			let result = `## 期货分时数据 - ${args.symbol}\n\n`;
			result += `| 时间 | 开盘 | 最高 | 最低 | 收盘 | 成交量 |\n`;
			result += `|------|------|------|------|------|--------|\n`;

			data.slice(-20).forEach((item: any) => {
				result += `| ${item.d} | ${item.o} | ${item.h} | ${item.l} | ${item.c} | ${item.v} |\n`;
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取期货分时数据失败: ${errorMessage}`;
		}
	},
	};
