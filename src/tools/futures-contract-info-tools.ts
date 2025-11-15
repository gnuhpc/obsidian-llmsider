// Futures Contract Information Tools
// 期货合约信息工具

import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * 获取所有期货交易所列表
 */
export const getFuturesExchangeListTool: BuiltInTool = {
	name: 'futures_exchange_list',
	description: '获取中国期货交易所列表和基本信息',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async (): Promise<string> => {
		try {
			let result = `## 中国期货交易所列表\n\n`;
			result += `| 交易所名称 | 交易所代码 | 合约后缀 | 官网地址 |\n`;
			result += `|-----------|-----------|---------|----------|\n`;
			result += `| 中国金融期货交易所 | CFFEX | .CFX | http://www.cffex.com.cn |\n`;
			result += `| 上海期货交易所 | SHFE | .SHF | https://www.shfe.com.cn |\n`;
			result += `| 上海国际能源交易中心 | INE | .INE | https://www.ine.cn |\n`;
			result += `| 郑州商品交易所 | CZCE | .ZCE | http://www.czce.com.cn |\n`;
			result += `| 大连商品交易所 | DCE | .DCE | http://www.dce.com.cn |\n`;
			result += `| 广州期货交易所 | GFEX | .GFEX | http://www.gfex.com.cn |\n\n`;
			
			result += `### 交易所特点\n\n`;
			result += `**CFFEX - 中国金融期货交易所**\n`;
			result += `- 成立时间: 2006年\n`;
			result += `- 主要品种: 股指期货(IF/IH/IC/IM)、国债期货(T/TF/TS)\n`;
			result += `- 特点: 金融衍生品交易平台\n\n`;
			
			result += `**SHFE - 上海期货交易所**\n`;
			result += `- 成立时间: 1990年\n`;
			result += `- 主要品种: 金属(铜、铝、锌等)、能源(燃料油)、化工(橡胶)\n`;
			result += `- 特点: 中国历史最悠久的期货交易所\n\n`;
			
			result += `**INE - 上海国际能源交易中心**\n`;
			result += `- 成立时间: 2013年\n`;
			result += `- 主要品种: 原油、20号胶、低硫燃料油\n`;
			result += `- 特点: 国际化期货市场,接受境外投资者\n\n`;
			
			result += `**DCE - 大连商品交易所**\n`;
			result += `- 成立时间: 1993年\n`;
			result += `- 主要品种: 农产品(豆粕、玉米)、化工品(聚乙烯、PVC)\n`;
			result += `- 特点: 全球最大的农产品期货市场之一\n\n`;
			
			result += `**CZCE - 郑州商品交易所**\n`;
			result += `- 成立时间: 1990年\n`;
			result += `- 主要品种: 农产品(棉花、白糖)、化工(PTA、甲醇)\n`;
			result += `- 特点: 中国第一家期货交易所\n\n`;
			
			result += `**GFEX - 广州期货交易所**\n`;
			result += `- 成立时间: 2021年\n`;
			result += `- 主要品种: 工业硅、碳酸锂、多晶硅\n`;
			result += `- 特点: 中国最新设立的期货交易所,聚焦绿色低碳\n`;
			
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取期货交易所列表失败: ${errorMessage}`;
		}
	},
	};

/**
 * 获取期货交易时间表
 */
export const getFuturesTradingTimeTool: BuiltInTool = {
	name: 'futures_trading_time',
	description: '获取期货品种的交易时间(包括日盘和夜盘)',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			exchange: {
				type: 'string',
				description: '交易所代码: SHFE/INE/DCE/CZCE/GFEX/CFFEX',
				enum: ['SHFE', 'INE', 'DCE', 'CZCE', 'GFEX', 'CFFEX']
			}
		},
		required: []
	},
	execute: async (args: { exchange?: string }): Promise<string> => {
		try {
			let result = `## 期货交易时间表\n\n`;
			
			if (!args.exchange || args.exchange === 'SHFE') {
				result += `### 上海期货交易所 (SHFE)\n\n`;
				result += `| 品种 | 代码 | 集合竞价 | 日盘交易时间 | 夜盘交易时间 |\n`;
				result += `|------|------|----------|--------------|-------------|\n`;
				result += `| 螺纹钢 | rb | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 热轧卷板 | hc | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 铜 | cu | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-01:00 |\n`;
				result += `| 铝 | al | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-01:00 |\n`;
				result += `| 黄金 | au | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-02:30 |\n`;
				result += `| 白银 | ag | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-02:30 |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'INE') {
				result += `### 上海国际能源交易中心 (INE)\n\n`;
				result += `| 品种 | 代码 | 集合竞价 | 日盘交易时间 | 夜盘交易时间 |\n`;
				result += `|------|------|----------|--------------|-------------|\n`;
				result += `| 原油 | sc | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-02:30 |\n`;
				result += `| 20号胶 | nr | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 低硫燃料油 | lu | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'DCE') {
				result += `### 大连商品交易所 (DCE)\n\n`;
				result += `| 品种 | 代码 | 集合竞价 | 日盘交易时间 | 夜盘交易时间 |\n`;
				result += `|------|------|----------|--------------|-------------|\n`;
				result += `| 豆粕 | m | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 豆油 | y | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 棕榈油 | p | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 铁矿石 | i | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 焦炭 | j | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 焦煤 | jm | 20:55-21:00, 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 鸡蛋 | jd | 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 无夜盘 |\n`;
				result += `| 生猪 | lh | 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 无夜盘 |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'CZCE') {
				result += `### 郑州商品交易所 (CZCE)\n\n`;
				result += `| 品种 | 代码 | 集合竞价 | 日盘交易时间 | 夜盘交易时间 |\n`;
				result += `|------|------|----------|--------------|-------------|\n`;
				result += `| 白糖 | SR | 20:55-21:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 棉花 | CF | 20:55-21:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| PTA | TA | 20:55-21:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 甲醇 | MA | 20:55-21:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 玻璃 | FG | 20:55-21:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 动力煤 | ZC | 20:55-21:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 21:00-23:00 |\n`;
				result += `| 苹果 | AP | 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 无夜盘 |\n`;
				result += `| 红枣 | CJ | 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 无夜盘 |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'GFEX') {
				result += `### 广州期货交易所 (GFEX)\n\n`;
				result += `| 品种 | 代码 | 集合竞价 | 日盘交易时间 | 夜盘交易时间 |\n`;
				result += `|------|------|----------|--------------|-------------|\n`;
				result += `| 工业硅 | SI | 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 无夜盘 |\n`;
				result += `| 碳酸锂 | LC | 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 无夜盘 |\n`;
				result += `| 多晶硅 | PS | 08:55-09:00 | 09:00-10:15, 10:30-11:30, 13:30-15:00 | 无夜盘 |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'CFFEX') {
				result += `### 中国金融期货交易所 (CFFEX)\n\n`;
				result += `| 品种 | 代码 | 集合竞价 | 交易时间 | 夜盘 |\n`;
				result += `|------|------|----------|----------|------|\n`;
				result += `| 沪深300 | IF | 09:25-09:30 | 09:30-11:30, 13:00-15:00 | 无 |\n`;
				result += `| 上证50 | IH | 09:25-09:30 | 09:30-11:30, 13:00-15:00 | 无 |\n`;
				result += `| 中证500 | IC | 09:25-09:30 | 09:30-11:30, 13:00-15:00 | 无 |\n`;
				result += `| 中证1000 | IM | 09:25-09:30 | 09:30-11:30, 13:00-15:00 | 无 |\n`;
				result += `| 2年期国债 | TS | 09:15-09:30 | 09:30-11:30, 13:00-15:15 | 无 |\n`;
				result += `| 5年期国债 | TF | 09:15-09:30 | 09:30-11:30, 13:00-15:15 | 无 |\n`;
				result += `| 10年期国债 | T | 09:15-09:30 | 09:30-11:30, 13:00-15:15 | 无 |\n\n`;
			}
			
			result += `### 说明\n`;
			result += `- 夜盘品种在交易日晚上开盘,次日凌晨收盘\n`;
			result += `- 集合竞价分为夜盘前和日盘前两个时段\n`;
			result += `- 国家法定节假日期间休市\n`;
			result += `- 部分品种可能根据市场情况调整交易时间\n`;
			
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取期货交易时间失败: ${errorMessage}`;
		}
	},
	};

/**
 * 获取期货品种合约乘数
 */
export const getFuturesContractMultiplierTool: BuiltInTool = {
	name: 'futures_contract_multiplier',
	description: '获取期货品种的合约乘数(每手吨数)和交易单位',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '品种代码,如"rb"(螺纹钢)、"cu"(铜)、"m"(豆粕)等'
			}
		},
		required: []
	},
	execute: async (args: { symbol?: string }): Promise<string> => {
		try {
			// 合约乘数数据库
			const multipliers: Record<string, {name: string; unit: string; multiplier: number; exchange: string}> = {
				// SHFE
				'rb': {name: '螺纹钢', unit: '吨', multiplier: 10, exchange: 'SHFE'},
				'hc': {name: '热轧卷板', unit: '吨', multiplier: 10, exchange: 'SHFE'},
				'cu': {name: '铜', unit: '吨', multiplier: 5, exchange: 'SHFE'},
				'al': {name: '铝', unit: '吨', multiplier: 5, exchange: 'SHFE'},
				'zn': {name: '锌', unit: '吨', multiplier: 5, exchange: 'SHFE'},
				'pb': {name: '铅', unit: '吨', multiplier: 5, exchange: 'SHFE'},
				'ni': {name: '镍', unit: '吨', multiplier: 1, exchange: 'SHFE'},
				'sn': {name: '锡', unit: '吨', multiplier: 1, exchange: 'SHFE'},
				'au': {name: '黄金', unit: '克', multiplier: 1000, exchange: 'SHFE'},
				'ag': {name: '白银', unit: '千克', multiplier: 15, exchange: 'SHFE'},
				'ru': {name: '天然橡胶', unit: '吨', multiplier: 10, exchange: 'SHFE'},
				'bu': {name: '石油沥青', unit: '吨', multiplier: 10, exchange: 'SHFE'},
				'fu': {name: '燃料油', unit: '吨', multiplier: 10, exchange: 'SHFE'},
				'sp': {name: '纸浆', unit: '吨', multiplier: 10, exchange: 'SHFE'},
				'ss': {name: '不锈钢', unit: '吨', multiplier: 5, exchange: 'SHFE'},
				// INE
				'sc': {name: '原油', unit: '桶', multiplier: 1000, exchange: 'INE'},
				'nr': {name: '20号胶', unit: '吨', multiplier: 10, exchange: 'INE'},
				'lu': {name: '低硫燃料油', unit: '吨', multiplier: 10, exchange: 'INE'},
				'bc': {name: '国际铜', unit: '吨', multiplier: 5, exchange: 'INE'},
				// DCE
				'm': {name: '豆粕', unit: '吨', multiplier: 10, exchange: 'DCE'},
				'y': {name: '豆油', unit: '吨', multiplier: 10, exchange: 'DCE'},
				'p': {name: '棕榈油', unit: '吨', multiplier: 10, exchange: 'DCE'},
				'a': {name: '豆一', unit: '吨', multiplier: 10, exchange: 'DCE'},
				'b': {name: '豆二', unit: '吨', multiplier: 10, exchange: 'DCE'},
				'c': {name: '玉米', unit: '吨', multiplier: 10, exchange: 'DCE'},
				'cs': {name: '玉米淀粉', unit: '吨', multiplier: 10, exchange: 'DCE'},
				'i': {name: '铁矿石', unit: '吨', multiplier: 100, exchange: 'DCE'},
				'j': {name: '焦炭', unit: '吨', multiplier: 100, exchange: 'DCE'},
				'jm': {name: '焦煤', unit: '吨', multiplier: 60, exchange: 'DCE'},
				'l': {name: '聚乙烯', unit: '吨', multiplier: 5, exchange: 'DCE'},
				'v': {name: '聚氯乙烯', unit: '吨', multiplier: 5, exchange: 'DCE'},
				'pp': {name: '聚丙烯', unit: '吨', multiplier: 5, exchange: 'DCE'},
				'eg': {name: '乙二醇', unit: '吨', multiplier: 10, exchange: 'DCE'},
				'eb': {name: '苯乙烯', unit: '吨', multiplier: 5, exchange: 'DCE'},
				'pg': {name: '液化石油气', unit: '吨', multiplier: 20, exchange: 'DCE'},
				'jd': {name: '鸡蛋', unit: '500千克', multiplier: 10, exchange: 'DCE'},
				'lh': {name: '生猪', unit: '吨', multiplier: 16, exchange: 'DCE'},
				// CZCE
				'SR': {name: '白糖', unit: '吨', multiplier: 10, exchange: 'CZCE'},
				'CF': {name: '棉花', unit: '吨', multiplier: 5, exchange: 'CZCE'},
				'TA': {name: 'PTA', unit: '吨', multiplier: 5, exchange: 'CZCE'},
				'MA': {name: '甲醇', unit: '吨', multiplier: 10, exchange: 'CZCE'},
				'FG': {name: '玻璃', unit: '吨', multiplier: 20, exchange: 'CZCE'},
				'ZC': {name: '动力煤', unit: '吨', multiplier: 100, exchange: 'CZCE'},
				'RM': {name: '菜粕', unit: '吨', multiplier: 10, exchange: 'CZCE'},
				'OI': {name: '菜油', unit: '吨', multiplier: 10, exchange: 'CZCE'},
				'SA': {name: '纯碱', unit: '吨', multiplier: 20, exchange: 'CZCE'},
				'UR': {name: '尿素', unit: '吨', multiplier: 20, exchange: 'CZCE'},
				'AP': {name: '苹果', unit: '吨', multiplier: 10, exchange: 'CZCE'},
				'CJ': {name: '红枣', unit: '吨', multiplier: 5, exchange: 'CZCE'},
				'PK': {name: '花生', unit: '吨', multiplier: 5, exchange: 'CZCE'},
				// GFEX
				'SI': {name: '工业硅', unit: '吨', multiplier: 5, exchange: 'GFEX'},
				'LC': {name: '碳酸锂', unit: '吨', multiplier: 1, exchange: 'GFEX'},
				'PS': {name: '多晶硅', unit: '吨', multiplier: 1, exchange: 'GFEX'},
				// CFFEX
				'IF': {name: '沪深300', unit: '点', multiplier: 300, exchange: 'CFFEX'},
				'IH': {name: '上证50', unit: '点', multiplier: 300, exchange: 'CFFEX'},
				'IC': {name: '中证500', unit: '点', multiplier: 200, exchange: 'CFFEX'},
				'IM': {name: '中证1000', unit: '点', multiplier: 200, exchange: 'CFFEX'},
				'T': {name: '10年国债', unit: '万元', multiplier: 10000, exchange: 'CFFEX'},
				'TF': {name: '5年国债', unit: '万元', multiplier: 10000, exchange: 'CFFEX'},
				'TS': {name: '2年国债', unit: '万元', multiplier: 20000, exchange: 'CFFEX'}
			};
			
			let result = `## 期货合约乘数\n\n`;
			
			if (args.symbol) {
				const info = multipliers[args.symbol.toUpperCase()] || multipliers[args.symbol.toLowerCase()];
				if (info) {
					result += `### ${info.name} (${args.symbol})\n\n`;
					result += `- **交易所**: ${info.exchange}\n`;
					result += `- **交易单位**: ${info.multiplier} ${info.unit}/手\n`;
					result += `- **最小变动价位**: 根据交易所规则\n`;
					result += `- **涨跌停板**: 根据交易所规则\n\n`;
					
					if (info.exchange === 'CFFEX' && ['IF', 'IH', 'IC', 'IM'].includes(args.symbol.toUpperCase())) {
						result += `#### 股指期货计算示例\n`;
						result += `假设${info.name}当前点位为 4000 点:\n`;
						result += `- 合约价值 = 4000 × ${info.multiplier} = ${4000 * info.multiplier} 元\n`;
						result += `- 涨跌1个点的盈亏 = ${info.multiplier} 元\n`;
					} else if (info.unit === '吨') {
						result += `#### 商品期货计算示例\n`;
						result += `假设${info.name}价格为 5000 元/吨:\n`;
						result += `- 1手合约价值 = 5000 × ${info.multiplier} = ${5000 * info.multiplier} 元\n`;
						result += `- 价格变动1元的盈亏 = ${info.multiplier} 元\n`;
					}
				} else {
					result += `未找到品种 "${args.symbol}" 的合约信息\n\n`;
					result += `请使用标准品种代码,如: rb, cu, m, SR, IF 等\n`;
				}
			} else {
				result += `### 主要品种合约乘数列表\n\n`;
				result += `| 品种代码 | 品种名称 | 交易所 | 合约乘数 | 单位 |\n`;
				result += `|---------|---------|--------|---------|------|\n`;
				
				// 分类显示
				const exchanges = ['SHFE', 'INE', 'DCE', 'CZCE', 'GFEX', 'CFFEX'];
				exchanges.forEach(ex => {
					Object.entries(multipliers).forEach(([code, info]) => {
						if (info.exchange === ex) {
							result += `| ${code} | ${info.name} | ${info.exchange} | ${info.multiplier} | ${info.unit} |\n`;
						}
					});
				});
			}
			
			result += `\n### 说明\n`;
			result += `- 合约价值 = 价格 × 合约乘数\n`;
			result += `- 保证金 = 合约价值 × 保证金比例\n`;
			result += `- 手续费根据交易所和期货公司规定收取\n`;
			
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取期货合约乘数失败: ${errorMessage}`;
		}
	},
	};

/**
 * 获取期货保证金比例
 */
export const getFuturesMarginRatioTool: BuiltInTool = {
	name: 'futures_margin_ratio',
	description: '获取期货品种的交易所保证金比例标准',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			exchange: {
				type: 'string',
				description: '交易所代码',
				enum: ['SHFE', 'INE', 'DCE', 'CZCE', 'GFEX', 'CFFEX']
			}
		},
		required: []
	},
	execute: async (args: { exchange?: string }): Promise<string> => {
		try {
			let result = `## 期货保证金比例\n\n`;
			result += `### 说明\n`;
			result += `- 以下为交易所最低保证金标准\n`;
			result += `- 期货公司实际收取保证金通常高于交易所标准\n`;
			result += `- 临近交割月或市场波动加剧时会提高保证金\n`;
			result += `- 不同合约月份保证金比例可能不同\n\n`;
			
			if (!args.exchange || args.exchange === 'SHFE') {
				result += `### 上海期货交易所 (SHFE)\n\n`;
				result += `| 品种 | 一般月份 | 交割月前1月 | 交割月 |\n`;
				result += `|------|---------|-----------|--------|\n`;
				result += `| 铜(cu) | 8% | 10% | 20% |\n`;
				result += `| 铝(al) | 7% | 9% | 18% |\n`;
				result += `| 锌(zn) | 8% | 10% | 20% |\n`;
				result += `| 铅(pb) | 9% | 11% | 22% |\n`;
				result += `| 镍(ni) | 10% | 12% | 24% |\n`;
				result += `| 锡(sn) | 10% | 12% | 24% |\n`;
				result += `| 黄金(au) | 6% | 8% | 16% |\n`;
				result += `| 白银(ag) | 8% | 10% | 20% |\n`;
				result += `| 螺纹钢(rb) | 9% | 11% | 22% |\n`;
				result += `| 热轧卷板(hc) | 10% | 12% | 24% |\n`;
				result += `| 天然橡胶(ru) | 9% | 11% | 22% |\n`;
				result += `| 燃料油(fu) | 10% | 12% | 24% |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'INE') {
				result += `### 上海国际能源交易中心 (INE)\n\n`;
				result += `| 品种 | 一般月份 | 交割月前1月 | 交割月 |\n`;
				result += `|------|---------|-----------|--------|\n`;
				result += `| 原油(sc) | 10% | 15% | 30% |\n`;
				result += `| 20号胶(nr) | 9% | 11% | 22% |\n`;
				result += `| 低硫燃料油(lu) | 10% | 12% | 24% |\n`;
				result += `| 国际铜(bc) | 8% | 10% | 20% |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'DCE') {
				result += `### 大连商品交易所 (DCE)\n\n`;
				result += `| 品种 | 一般月份 | 交割月前1月 | 交割月 |\n`;
				result += `|------|---------|-----------|--------|\n`;
				result += `| 豆粕(m) | 8% | 10% | 20% |\n`;
				result += `| 豆油(y) | 8% | 10% | 20% |\n`;
				result += `| 棕榈油(p) | 8% | 10% | 20% |\n`;
				result += `| 玉米(c) | 7% | 9% | 18% |\n`;
				result += `| 铁矿石(i) | 10% | 12% | 24% |\n`;
				result += `| 焦炭(j) | 12% | 15% | 30% |\n`;
				result += `| 焦煤(jm) | 12% | 15% | 30% |\n`;
				result += `| 聚乙烯(l) | 8% | 10% | 20% |\n`;
				result += `| 聚氯乙烯(v) | 8% | 10% | 20% |\n`;
				result += `| 聚丙烯(pp) | 8% | 10% | 20% |\n`;
				result += `| 鸡蛋(jd) | 9% | 11% | 22% |\n`;
				result += `| 生猪(lh) | 15% | 18% | 36% |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'CZCE') {
				result += `### 郑州商品交易所 (CZCE)\n\n`;
				result += `| 品种 | 一般月份 | 交割月前1月 | 交割月 |\n`;
				result += `|------|---------|-----------|--------|\n`;
				result += `| 白糖(SR) | 7% | 9% | 18% |\n`;
				result += `| 棉花(CF) | 8% | 10% | 20% |\n`;
				result += `| PTA(TA) | 8% | 10% | 20% |\n`;
				result += `| 甲醇(MA) | 8% | 10% | 20% |\n`;
				result += `| 玻璃(FG) | 9% | 11% | 22% |\n`;
				result += `| 动力煤(ZC) | 10% | 12% | 24% |\n`;
				result += `| 菜粕(RM) | 8% | 10% | 20% |\n`;
				result += `| 菜油(OI) | 8% | 10% | 20% |\n`;
				result += `| 纯碱(SA) | 10% | 12% | 24% |\n`;
				result += `| 尿素(UR) | 9% | 11% | 22% |\n`;
				result += `| 苹果(AP) | 10% | 12% | 24% |\n`;
				result += `| 红枣(CJ) | 12% | 15% | 30% |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'GFEX') {
				result += `### 广州期货交易所 (GFEX)\n\n`;
				result += `| 品种 | 一般月份 | 交割月前1月 | 交割月 |\n`;
				result += `|------|---------|-----------|--------|\n`;
				result += `| 工业硅(SI) | 12% | 15% | 30% |\n`;
				result += `| 碳酸锂(LC) | 15% | 20% | 40% |\n`;
				result += `| 多晶硅(PS) | 15% | 20% | 40% |\n\n`;
			}
			
			if (!args.exchange || args.exchange === 'CFFEX') {
				result += `### 中国金融期货交易所 (CFFEX)\n\n`;
				result += `#### 股指期货\n`;
				result += `| 品种 | 非套保(%) | 套保(%) |\n`;
				result += `|------|----------|--------|\n`;
				result += `| 沪深300(IF) | 12% | 10% |\n`;
				result += `| 上证50(IH) | 12% | 10% |\n`;
				result += `| 中证500(IC) | 15% | 12% |\n`;
				result += `| 中证1000(IM) | 15% | 12% |\n\n`;
				
				result += `#### 国债期货\n`;
				result += `| 品种 | 保证金比例 |\n`;
				result += `|------|----------|\n`;
				result += `| 2年国债(TS) | 0.5% |\n`;
				result += `| 5年国债(TF) | 1.2% |\n`;
				result += `| 10年国债(T) | 2% |\n\n`;
			}
			
			result += `### 保证金计算示例\n`;
			result += `假设螺纹钢(rb)价格为 4000 元/吨:\n`;
			result += `- 合约价值 = 4000 × 10(吨/手) = 40,000 元\n`;
			result += `- 交易所保证金 = 40,000 × 9% = 3,600 元\n`;
			result += `- 期货公司保证金(假设加收3%) = 40,000 × 12% = 4,800 元\n\n`;
			
			result += `### 特殊规定\n`;
			result += `- 当日开仓又平仓(平今)可能收取不同保证金\n`;
			result += `- 持仓量超过限仓标准需提高保证金\n`;
			result += `- 市场异常波动时交易所有权临时提高保证金\n`;
			result += `- 连续涨跌停板后保证金会逐级提高\n`;
			
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `获取期货保证金比例失败: ${errorMessage}`;
		}
	},
	};
