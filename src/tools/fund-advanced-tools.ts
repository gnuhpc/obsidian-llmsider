/**
 * Advanced Fund Market Data Tools
 * Implements detailed fund data including rankings, managers, ratings, holdings,
 * scale changes, dividends, and QDII funds
 */

import { BuiltInTool } from './built-in-tools';

/**
 * Get open-ended fund performance ranking
 * 获取开放式基金业绩排行
 */
export const getOpenFundRankingTool: BuiltInTool = {
	name: 'getOpenFundRanking',
	description: 'Get open-ended mutual fund performance ranking by return period and fund type.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			period: {
				type: 'string',
				description: 'Return period: "近1周", "近1月", "近3月", "近6月", "近1年", "近2年", "近3年", "今年来", "成立来"',
				enum: ['近1周', '近1月', '近3月', '近6月', '近1年', '近2年', '近3年', '今年来', '成立来']
			},
			fund_type: {
				type: 'string',
				description: 'Fund type: "全部", "股票型", "混合型", "债券型", "指数型", "QDII", "FOF"',
				enum: ['全部', '股票型', '混合型', '债券型', '指数型', 'QDII', 'FOF']
			}
		},
		required: ['period']
	},
	execute: async (args: { period: string; fund_type?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_open_fund_rank({
				period: args.period,
				fund_type: args.fund_type || '全部'
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch open fund ranking: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get exchange-traded fund (ETF/LOF) performance ranking
 * 获取场内基金业绩排行
 */
export const getExchangeFundRankingTool: BuiltInTool = {
	name: 'getExchangeFundRanking',
	description: 'Get exchange-traded fund (ETF/LOF) performance ranking including turnover and premium rate.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			period: {
				type: 'string',
				description: 'Return period: "近1周", "近1月", "近3月", "近6月", "近1年", "今年来", "成立来"',
				enum: ['近1周', '近1月', '近3月', '近6月', '近1年', '今年来', '成立来']
			},
			fund_type: {
				type: 'string',
				description: 'Fund type: "全部", "股票ETF", "债券ETF", "货币ETF", "LOF"',
				enum: ['全部', '股票ETF', '债券ETF', '货币ETF', 'LOF']
			}
		},
		required: ['period']
	},
	execute: async (args: { period: string; fund_type?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_exchange_rank({
				period: args.period,
				fund_type: args.fund_type || '全部'
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch exchange fund ranking: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get money market fund performance ranking
 * 获取货币基金业绩排行
 */
export const getMoneyFundRankingTool: BuiltInTool = {
	name: 'getMoneyFundRanking',
	description: 'Get money market fund performance ranking including 7-day annualized yield.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			period: {
				type: 'string',
				description: 'Return period: "近1周", "近1月", "近3月", "近6月", "近1年", "今年来", "成立来"',
				enum: ['近1周', '近1月', '近3月', '近6月', '近1年', '今年来', '成立来']
			}
		},
		required: ['period']
	},
	execute: async (args: { period: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_money_rank({
				period: args.period
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch money fund ranking: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get fund manager information
 * 获取基金经理信息
 */
export const getFundManagerInfoTool: BuiltInTool = {
	name: 'getFundManagerInfo',
	description: 'Get fund manager information including managed funds, tenure, and performance.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			manager_name: {
				type: 'string',
				description: 'Fund manager name (optional, returns all managers if not specified)'
			}
		},
		required: []
	},
	execute: async (args: { manager_name?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_manager_em({
				manager_name: args.manager_name
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch fund manager info: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get fund rating data
 * 获取基金评级数据
 */
export const getFundRatingTool: BuiltInTool = {
	name: 'getFundRating',
	description: 'Get fund rating data from rating agencies including star ratings and rankings.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			rating_agency: {
				type: 'string',
				description: 'Rating agency: "上海证券", "招商证券", "济安金信"',
				enum: ['上海证券', '招商证券', '济安金信']
			},
			fund_type: {
				type: 'string',
				description: 'Fund type: "股票型", "混合型", "债券型", "指数型", "QDII"',
				enum: ['股票型', '混合型', '债券型', '指数型', 'QDII']
			}
		},
		required: []
	},
	execute: async (args: { rating_agency?: string; fund_type?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_rating_all({
				rating_agency: args.rating_agency,
				fund_type: args.fund_type
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch fund rating: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get fund portfolio stock holdings
 * 获取基金持仓股票
 */
export const getFundStockHoldingsTool: BuiltInTool = {
	name: 'getFundStockHoldings',
	description: 'Get fund portfolio stock holdings including top holdings and allocation percentages.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Fund code (e.g., "000001")'
			},
			date: {
				type: 'string',
				description: 'Report date in format YYYYMMDD (e.g., "20231231" for year-end report)'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; date?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_portfolio_hold({
				symbol: args.symbol,
				date: args.date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch fund stock holdings: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get fund portfolio bond holdings
 * 获取基金持仓债券
 */
export const getFundBondHoldingsTool: BuiltInTool = {
	name: 'getFundBondHoldings',
	description: 'Get fund portfolio bond holdings including bond types and allocation percentages.',
  category: 'bonds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Fund code (e.g., "000001")'
			},
			date: {
				type: 'string',
				description: 'Report date in format YYYYMMDD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; date?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_portfolio_bond_hold({
				symbol: args.symbol,
				date: args.date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch fund bond holdings: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get fund scale change data
 * 获取基金规模变动数据
 */
export const getFundScaleChangeTool: BuiltInTool = {
	name: 'getFundScaleChange',
	description: 'Get fund scale change data including total net assets and share changes over time.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Fund code (e.g., "000001")'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_scale_change({
				symbol: args.symbol
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch fund scale change: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get fund holder structure
 * 获取基金持有人结构
 */
export const getFundHolderStructureTool: BuiltInTool = {
	name: 'getFundHolderStructure',
	description: 'Get fund holder structure including institutional vs retail investor proportions.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Fund code (e.g., "000001")'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_hold_structure({
				symbol: args.symbol
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch fund holder structure: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get fund dividend history ranking
 * 获取基金分红排行
 */
export const getFundDividendRankingTool: BuiltInTool = {
	name: 'getFundDividendRanking',
	description: 'Get fund dividend history ranking including dividend amount and frequency.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			year: {
				type: 'string',
				description: 'Year (e.g., "2023"), defaults to current year'
			}
		},
		required: []
	},
	execute: async (args: { year?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_fh_rank({
				year: args.year
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch fund dividend ranking: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get fund dividend detail data
 * 获取基金分红明细
 */
export const getFundDividendDetailTool: BuiltInTool = {
	name: 'getFundDividendDetail',
	description: 'Get detailed fund dividend data including ex-dividend date, dividend ratio, and record date.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Fund code (e.g., "000001")'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.fund_fh_em({
				symbol: args.symbol
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch fund dividend detail: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get QDII fund exchange rate index
 * 获取QDII基金汇率指数
 */
export const getQDIIExchangeRateIndexTool: BuiltInTool = {
	name: 'getQDIIExchangeRateIndex',
	description: 'Get QDII fund exchange rate index for evaluating currency impact on overseas investments.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Index type: "美元指数", "欧元指数", "日元指数", "港币指数"',
				enum: ['美元指数', '欧元指数', '日元指数', '港币指数']
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.qdii_e_index({
				symbol: args.symbol
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch QDII exchange rate index: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get QDII fund allocation index (JSL data)
 * 获取QDII基金配置指数
 */
export const getQDIIAllocationIndexTool: BuiltInTool = {
	name: 'getQDIIAllocationIndex',
	description: 'Get QDII fund allocation index from JSL showing regional and asset allocation.',
  category: 'funds',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Region/asset type: "美股", "港股", "欧洲", "亚太", "全球", "大宗商品", "房地产"',
				enum: ['美股', '港股', '欧洲', '亚太', '全球', '大宗商品', '房地产']
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.qdii_a_index_jsl({
				symbol: args.symbol
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch QDII allocation index: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};
