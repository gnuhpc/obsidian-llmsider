/**
 * 高级基金与替代数据工具集
 * Advanced Fund and Alternative Data Tools
 */

import { requestUrl } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

// 新浪-开放式基金规模
export const getFundScaleOpenSinaTool: BuiltInTool = {
	name: 'fund_scale_open_sina',
	description: '获取开放式基金规模数据',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '基金代码',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const url = `https://stock.finance.sina.com.cn/fundInfo/api/openapi.php/CaihuiFundInfoService.getNav?symbol=${symbol}`;
			
			const response = await requestUrl({ url, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = `## ${symbol} 开放式基金规模\n\n`;
			result += '| 日期 | 基金规模(亿) | 份额(亿份) | 单位净值 |\n';
			result += '|------|-------------|-----------|----------|\n';
			
			data.result.data.slice(0, 20).forEach((item: any) => {
				result += `| ${item.date || '-'} | ${item.scale || '-'} | ${item.share || '-'} | ${item.nav || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取基金规模失败: ${error.message}`;
		}
	},
};

// 东方财富-基金费率
export const getFundFeeEMTool: BuiltInTool = {
	name: 'fund_fee_em',
	description: '获取基金费率信息',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '基金代码',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const url = `https://fundf10.eastmoney.com/jjfl_${symbol}.html`;
			
			const response = await requestUrl({ url, method: 'GET' });
			const html = response.text;
			
			const managementFee = html.match(/管理费率.*?(\d+\.\d+)%/)?.[1] || '-';
			const trusteeFee = html.match(/托管费率.*?(\d+\.\d+)%/)?.[1] || '-';
			const subscribeFee = html.match(/申购费率.*?(\d+\.\d+)%/)?.[1] || '-';
			
			let result = `## ${symbol} 基金费率\n\n`;
			result += `**管理费率**: ${managementFee}% (年)\n`;
			result += `**托管费率**: ${trusteeFee}% (年)\n`;
			result += `**申购费率**: ${subscribeFee}%\n`;
			
			return result;
		} catch (error: any) {
			return `获取基金费率失败: ${error.message}`;
		}
	},
};

// 港股盈利预测
export const getStockHKProfitForecastTool: BuiltInTool = {
	name: 'stock_hk_profit_forecast',
	description: '获取港股盈利预测数据',
  category: 'stock',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '港股代码',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = {
				reportName: 'RPT_HK_PROFIT_FORECAST',
				columns: 'ALL',
				filter: `(SECURITY_CODE='${symbol}')`,
				pageNumber: '1',
				pageSize: '30',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = `## ${symbol} 港股盈利预测\n\n`;
			result += '| 机构 | 评级 | 目标价 | EPS(FY1) | 发布日期 |\n';
			result += '|------|------|--------|----------|----------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.ORG_NAME || '-'} | ${item.RATING || '-'} | ${item.TARGET_PRICE || '-'} | ${item.EPS_FY1 || '-'} | ${item.PUBLISH_DATE || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取盈利预测失败: ${error.message}`;
		}
	},
};

// 东方财富-基金持仓-股票
export const getFundPortfolioHoldEMTool: BuiltInTool = {
	name: 'fund_portfolio_hold_em',
	description: '获取基金股票持仓明细',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '基金代码',
			},
			date: {
				type: 'string',
				description: '报告期,格式YYYY-MM-DD',
			},
		},
		required: ['symbol', 'date'],
	},
	execute: async (params: { symbol: string; date: string }): Promise<string> => {
		try {
			const { symbol, date } = params;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = {
				reportName: 'RPT_FUND_STOCK_HOLD',
				columns: 'ALL',
				filter: `(FUND_CODE='${symbol}' and END_DATE='${date}')`,
				pageNumber: '1',
				pageSize: '50',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = `## ${symbol} 股票持仓 (${date})\n\n`;
			result += '| 股票代码 | 股票名称 | 持仓占比 | 持仓市值(万) |\n';
			result += '|---------|---------|---------|-------------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.STOCK_CODE} | ${item.STOCK_NAME} | ${item.HOLD_RATIO || '-'}% | ${item.HOLD_VALUE || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取持仓失败: ${error.message}`;
		}
	},
};

// 基金经理信息
export const getFundManagerInfoEMTool: BuiltInTool = {
	name: 'fund_manager_info_em',
	description: '获取基金经理详细信息',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			manager_name: {
				type: 'string',
				description: '基金经理姓名',
			},
		},
		required: ['manager_name'],
	},
	execute: async (params: { manager_name: string }): Promise<string> => {
		try {
			const { manager_name } = params;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = {
				reportName: 'RPT_FUND_MANAGER',
				columns: 'ALL',
				filter: `(MANAGER_NAME='${manager_name}')`,
				pageNumber: '1',
				pageSize: '50',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data || data.result.data.length === 0) return '暂无数据';
			
			const manager = data.result.data[0];
			let result = `## ${manager_name} 基金经理\n\n`;
			result += `**从业年限**: ${manager.WORK_YEARS || '-'}年\n`;
			result += `**管理基金数**: ${manager.FUND_COUNT || '-'}只\n`;
			result += `**管理规模**: ${manager.MANAGE_SCALE || '-'}亿\n`;
			result += `**年化回报**: ${manager.ANNUAL_RETURN || '-'}%\n\n`;
			
			result += '### 在管基金\n';
			result += '| 基金代码 | 基金名称 | 任职日期 |\n';
			result += '|---------|---------|----------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.FUND_CODE} | ${item.FUND_NAME} | ${item.START_DATE || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取经理信息失败: ${error.message}`;
		}
	},
};

// 私募基金排行
export const getPrivateFundRankTool: BuiltInTool = {
	name: 'private_fund_rank',
	description: '获取私募基金收益排行',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			strategy: {
				type: 'string',
				description: '策略类型:股票策略/债券策略/管理期货',
			},
		},
		required: ['strategy'],
	},
	execute: async (params: { strategy: string }): Promise<string> => {
		try {
			const { strategy } = params;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = {
				reportName: 'RPT_PRIVATE_FUND_RANK',
				columns: 'ALL',
				filter: `(STRATEGY='${strategy}')`,
				pageNumber: '1',
				pageSize: '50',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = `## 私募基金排行(${strategy})\n\n`;
			result += '| 排名 | 基金名称 | 基金经理 | 收益率 |\n';
			result += '|------|---------|---------|--------|\n';
			
			data.result.data.forEach((item: any, index: number) => {
				result += `| ${index + 1} | ${item.FUND_NAME || '-'} | ${item.FUND_MANAGER || '-'} | ${item.RETURN || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取排行失败: ${error.message}`;
		}
	},
};

// 基金经理变动
export const getFundManagerChangeTool: BuiltInTool = {
	name: 'fund_manager_change',
	description: '获取基金经理变动情况',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			start_date: {
				type: 'string',
				description: '开始日期YYYY-MM-DD',
			},
			end_date: {
				type: 'string',
				description: '结束日期YYYY-MM-DD',
			},
		},
		required: ['start_date', 'end_date'],
	},
	execute: async (params: { start_date: string; end_date: string }): Promise<string> => {
		try {
			const { start_date, end_date } = params;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = {
				reportName: 'RPT_FUND_MANAGER_CHANGE',
				columns: 'ALL',
				filter: `(CHANGE_DATE>='${start_date}' and CHANGE_DATE<='${end_date}')`,
				pageNumber: '1',
				pageSize: '100',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = `## 基金经理变动(${start_date}至${end_date})\n\n`;
			result += '| 变动日期 | 基金代码 | 基金名称 | 变动类型 |\n';
			result += '|---------|---------|---------|----------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.CHANGE_DATE} | ${item.FUND_CODE} | ${item.FUND_NAME} | ${item.CHANGE_TYPE || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取变动失败: ${error.message}`;
		}
	},
};

// ETF实时溢价
export const getETFRealTimePremiumTool: BuiltInTool = {
	name: 'etf_real_time_premium',
	description: '获取ETF实时溢价率',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = {
				reportName: 'RPT_ETF_PREMIUM',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '100',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## ETF实时溢价率\n\n';
			result += '| ETF代码 | ETF名称 | 最新价 | 溢价率 |\n';
			result += '|--------|--------|--------|--------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.ETF_CODE} | ${item.ETF_NAME} | ${item.LAST_PRICE || '-'} | ${item.PREMIUM_RATE || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取溢价率失败: ${error.message}`;
		}
	},
};

// LOF实时溢价
export const getLOFRealTimePremiumTool: BuiltInTool = {
	name: 'lof_real_time_premium',
	description: '获取LOF实时溢价率',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = {
				reportName: 'RPT_LOF_PREMIUM',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '100',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## LOF实时溢价率\n\n';
			result += '| LOF代码 | LOF名称 | 最新价 | 溢价率 |\n';
			result += '|--------|--------|--------|--------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.LOF_CODE} | ${item.LOF_NAME} | ${item.LAST_PRICE || '-'} | ${item.PREMIUM_RATE || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取溢价率失败: ${error.message}`;
		}
	},
};

// 可转债转股溢价率
export const getBondConvertPremiumTool: BuiltInTool = {
	name: 'bond_convert_premium',
	description: '获取可转债转股溢价率',
  category: 'bonds',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = {
				reportName: 'RPT_BOND_CB_PREMIUM',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '100',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## 可转债转股溢价率\n\n';
			result += '| 转债代码 | 转债名称 | 正股价 | 转股价 | 溢价率 |\n';
			result += '|---------|---------|--------|--------|--------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.BOND_CODE} | ${item.BOND_NAME} | ${item.STOCK_PRICE || '-'} | ${item.CONVERT_PRICE || '-'} | ${item.PREMIUM_RATE || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取溢价率失败: ${error.message}`;
		}
	},
};

// 可转债强赎预警
export const getBondCallRedeemWarningTool: BuiltInTool = {
	name: 'bond_call_redeem_warning',
	description: '获取可转债强赎预警',
  category: 'bonds',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	execute: async (): Promise<string> => {
		try {
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const params = {
				reportName: 'RPT_BOND_CB_CALL_REDEEM',
				columns: 'ALL',
				pageNumber: '1',
				pageSize: '100',
			};
			
			const queryString = new URLSearchParams(params).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = '## 可转债强赎预警\n\n';
			result += '| 转债代码 | 转债名称 | 触发价 | 正股价 | 满足天数 |\n';
			result += '|---------|---------|--------|--------|----------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.BOND_CODE} | ${item.BOND_NAME} | ${item.TRIGGER_PRICE || '-'} | ${item.STOCK_PRICE || '-'} | ${item.TRIGGER_DAYS || '-'}/15 |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取预警失败: ${error.message}`;
		}
	},
};

// 基金份额变动
export const getFundShareChangeTool: BuiltInTool = {
	name: 'fund_share_change',
	description: '获取基金份额变动情况',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '基金代码',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = {
				reportName: 'RPT_FUND_SHARE_CHANGE',
				columns: 'ALL',
				filter: `(FUND_CODE='${symbol}')`,
				pageNumber: '1',
				pageSize: '20',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = `## ${symbol} 基金份额变动\n\n`;
			result += '| 日期 | 份额(亿份) | 变动(亿份) | 变动率 |\n';
			result += '|------|-----------|-----------|--------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.DATE} | ${item.SHARE || '-'} | ${item.CHANGE || '-'} | ${item.CHANGE_RATE || '-'}% |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取份额变动失败: ${error.message}`;
		}
	},
};

// 基金申赎数据
export const getFundPurchaseRedeemTool: BuiltInTool = {
	name: 'fund_purchase_redeem',
	description: '获取基金申购赎回数据',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '基金代码',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
			const queryParams = {
				reportName: 'RPT_FUND_PURCHASE_REDEEM',
				columns: 'ALL',
				filter: `(FUND_CODE='${symbol}')`,
				pageNumber: '1',
				pageSize: '20',
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const data = JSON.parse(response.text);
			
			if (!data.result?.data) return '暂无数据';
			
			let result = `## ${symbol} 申购赎回数据\n\n`;
			result += '| 日期 | 申购(亿) | 赎回(亿) | 净申购(亿) |\n';
			result += '|------|---------|---------|----------|\n';
			
			data.result.data.forEach((item: any) => {
				result += `| ${item.DATE} | ${item.PURCHASE || '-'} | ${item.REDEEM || '-'} | ${item.NET_PURCHASE || '-'} |\n`;
			});
			
			return result;
		} catch (error: any) {
			return `获取申赎数据失败: ${error.message}`;
		}
	},
};

// 18. 开放式基金排行
export const getFundOpenRankEMTool: BuiltInTool = {
	name: 'getFundOpenRankEM',
	description: '开放式基金排行(东方财富) - 获取各类型开放式基金的净值排行及业绩数据, 支持全部/股票型/混合型/债券型/指数型/QDII/FOF',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: '基金类型, 可选值: 全部/股票型/混合型/债券型/指数型/QDII/FOF, 默认: 全部',
			},
		},
		required: ['symbol'],
	},
	execute: async (params: { symbol: string }): Promise<string> => {
		try {
			const { symbol } = params;
			const typeMap: Record<string, string> = {
				'全部': 'all',
				'股票型': 'gp',
				'混合型': 'hh',
				'债券型': 'zq',
				'指数型': 'zs',
				'QDII': 'qdii',
				'FOF': 'fof'
			};
			const type = typeMap[symbol] || 'all';
			
			const url = 'http://fund.eastmoney.com/data/rankhandler.aspx';
			const queryParams = {
				op: 'ph',
				dt: 'kf',
				ft: type,
				rs: '',
				gs: '0',
				sc: 'zzf',
				st: 'desc',
				sd: '',
				ed: '',
				qdii: '',
				tabSubtype: ',,,,,',
				pi: '1',
				pn: '50',
				dx: '1'
			};
			
			const queryString = new URLSearchParams(queryParams).toString();
			const response = await requestUrl({ url: `${url}?${queryString}`, method: 'GET' });
			const text = response.text;
			
			let result = `## 开放式基金排行 - ${symbol}\n\n`;
			result += '数据来源: 东方财富网\n\n';
			result += '| 序号 | 代码 | 简称 | 日期 | 单位净值 | 累计净值 | 日增长率 | 近1周 | 近1月 | 近3月 | 近6月 | 近1年 | 今年来 | 成立来 | 费率 |\n';
			result += '|------|------|------|------|---------|---------|---------|------|------|------|------|------|------|-------|-----|\n';
			
			// 解析返回的数据格式 (JavaScript数组格式)
			const dataMatch = text.match(/var rankData = \{datas:\[([^\]]+)\]/);
			if (dataMatch) {
				const items = dataMatch[1].split('],[');
				items.slice(0, 30).forEach((item, idx) => {
					const fields = item.replace(/[\[\]"]/g, '').split(',');
					if (fields.length >= 14) {
						result += `| ${idx + 1} | ${fields[0]} | ${fields[1]} | ${fields[3]} | ${fields[4]} | ${fields[5]} | ${fields[6]} | ${fields[7]} | ${fields[8]} | ${fields[9]} | ${fields[10]} | ${fields[11]} | ${fields[13]} | ${fields[14]} | ${fields[20] || '-'} |\n`;
					}
				});
			} else {
				result += '| - | 暂无数据 | - | - | - | - | - | - | - | - | - | - | - | - | - |\n';
			}
			
			result += '\n### 说明\n';
			result += '- 所有涨幅数据单位为 %\n';
			result += '- 每个交易日收盘后更新\n';
			
			return result;
		} catch (error: any) {
			return `获取开放式基金排行失败: ${error.message}`;
		}
	},
};
