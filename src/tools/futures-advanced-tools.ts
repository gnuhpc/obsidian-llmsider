/**
 * Advanced Futures Market Data Tools
 * Implements detailed futures data including position rankings, warehouse receipts,
 * roll yields, spot prices, exchange daily data, inventory, and commodity options
 */

import { BuiltInTool } from './built-in-tools';

/**
 * Get futures position ranking by brokers/members
 * 获取期货持仓排名 - 按经纪商/会员排名
 */
export const getFuturesPositionRankSumTool: BuiltInTool = {
	name: 'getFuturesPositionRankSum',
	description: 'Get futures position ranking by brokers/members for a specific contract. Shows top holders and their positions.',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Futures contract symbol (e.g., "C2305" for corn May 2023)'
			},
			date: {
				type: 'string',
				description: 'Trading date in format YYYYMMDD (e.g., "20230515"), defaults to latest'
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
			const result = await akshare.get_rank_sum({
				symbol: args.symbol,
				date: args.date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch futures position ranking: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get futures warehouse receipt data
 * 获取期货仓单数据
 */
export const getFuturesWarehouseReceiptDataTool: BuiltInTool = {
	name: 'getFuturesWarehouseReceiptData',
	description: 'Get warehouse receipt data for futures contracts. Shows deliverable inventory registered at exchanges.',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Futures variety code (e.g., "C" for corn, "RB" for rebar)'
			},
			start_date: {
				type: 'string',
				description: 'Start date in format YYYYMMDD (e.g., "20230101")'
			},
			end_date: {
				type: 'string',
				description: 'End date in format YYYYMMDD (e.g., "20230531")'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.get_receipt({
				symbol: args.symbol,
				start_date: args.start_date,
				end_date: args.end_date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch warehouse receipt data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get futures roll yield data
 * 获取期货展期收益率
 */
export const getFuturesRollYieldTool: BuiltInTool = {
	name: 'getFuturesRollYield',
	description: 'Get futures roll yield data. Shows returns from rolling futures contracts from one month to another.',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Futures variety code (e.g., "C" for corn, "AL" for aluminum)'
			},
			start_date: {
				type: 'string',
				description: 'Start date in format YYYYMMDD'
			},
			end_date: {
				type: 'string',
				description: 'End date in format YYYYMMDD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.get_roll_yield({
				symbol: args.symbol,
				start_date: args.start_date,
				end_date: args.end_date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch roll yield data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get futures spot price data
 * 获取期货对应的现货价格
 */
export const getFuturesSpotPriceTool: BuiltInTool = {
	name: 'getFuturesSpotPrice',
	description: 'Get spot prices for commodities corresponding to futures contracts. Useful for calculating basis.',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Commodity symbol (e.g., "玉米" for corn, "螺纹钢" for rebar)'
			},
			market: {
				type: 'string',
				description: 'Market type: "spot" for spot market, "wholesale" for wholesale market',
				enum: ['spot', 'wholesale']
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; market?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.futures_spot_price({
				symbol: args.symbol,
				market: args.market || 'spot'
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch spot price: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get CFFEX (China Financial Futures Exchange) daily data
 * 获取中金所每日行情数据
 */
export const getCFFEXDailyTool: BuiltInTool = {
    name: 'getCFFEXDaily',
    description: '获取中金所(CFFEX)每日交易数据',
    category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Trading date in format YYYYMMDD (e.g., "20230515")'
			}
		},
		required: ['date']
	},
	execute: async (args: { date: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.get_cffex_daily({
				date: args.date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch CFFEX daily data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get CZCE (Zhengzhou Commodity Exchange) daily data
 * 获取郑商所每日行情数据
 */
export const getCZCEDailyTool: BuiltInTool = {
	name: 'getCZCEDaily',
	description: 'Get Zhengzhou Commodity Exchange (CZCE) daily trading data including agricultural products like cotton, sugar, wheat.',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Trading date in format YYYYMMDD (e.g., "20230515")'
			}
		},
		required: ['date']
	},
	execute: async (args: { date: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.get_czce_daily({
				date: args.date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch CZCE daily data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get DCE (Dalian Commodity Exchange) daily data
 * 获取大商所每日行情数据
 */
export const getDCEDailyTool: BuiltInTool = {
	name: 'getDCEDaily',
	description: 'Get Dalian Commodity Exchange (DCE) daily trading data including soybeans, corn, iron ore, etc.',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Trading date in format YYYYMMDD (e.g., "20230515")'
			}
		},
		required: ['date']
	},
	execute: async (args: { date: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.get_dce_daily({
				date: args.date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch DCE daily data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get SHFE (Shanghai Futures Exchange) daily data
 * 获取上期所每日行情数据
 */
export const getSHFEDailyTool: BuiltInTool = {
	name: 'getSHFEDaily',
	description: 'Get Shanghai Futures Exchange (SHFE) daily trading data including copper, aluminum, zinc, gold, silver, etc.',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Trading date in format YYYYMMDD (e.g., "20230515")'
			}
		},
		required: ['date']
	},
	execute: async (args: { date: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.get_shfe_daily({
				date: args.date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch SHFE daily data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get INE (Shanghai International Energy Exchange) daily data
 * 获取上海国际能源交易中心每日行情数据
 */
export const getINEDailyTool: BuiltInTool = {
	name: 'getINEDaily',
	description: 'Get Shanghai International Energy Exchange (INE) daily trading data including crude oil, fuel oil, etc.',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Trading date in format YYYYMMDD (e.g., "20230515")'
			}
		},
		required: ['date']
	},
	execute: async (args: { date: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.get_ine_daily({
				date: args.date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch INE daily data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get domestic futures inventory data
 * 获取期货库存数据
 */
export const getFuturesInventoryEMTool: BuiltInTool = {
	name: 'getFuturesInventoryEM',
	description: 'Get futures inventory data from exchanges. Shows warehouse inventory levels for various commodities.',
  category: 'futures',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Exchange code: "大商所" (DCE), "郑商所" (CZCE), "上期所" (SHFE)'
			},
			variety: {
				type: 'string',
				description: 'Commodity variety (optional, returns all if not specified)'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; variety?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.futures_inventory_em({
				symbol: args.symbol,
				variety: args.variety
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch futures inventory: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get DCE commodity options historical data
 * 获取大商所商品期权历史数据
 */
export const getDCECommodityOptionHistTool: BuiltInTool = {
	name: 'getDCECommodityOptionHist',
	description: 'Get Dalian Commodity Exchange (DCE) commodity options historical data.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Option symbol (e.g., "m2309" for soybean meal options)'
			},
			start_date: {
				type: 'string',
				description: 'Start date in format YYYYMMDD'
			},
			end_date: {
				type: 'string',
				description: 'End date in format YYYYMMDD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.option_hist_dce({
				symbol: args.symbol,
				start_date: args.start_date,
				end_date: args.end_date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch DCE commodity option history: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get CZCE commodity options historical data
 * 获取郑商所商品期权历史数据
 */
export const getCZCECommodityOptionHistTool: BuiltInTool = {
	name: 'getCZCECommodityOptionHist',
	description: 'Get Zhengzhou Commodity Exchange (CZCE) commodity options historical data.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Option symbol (e.g., "CF309" for cotton options)'
			},
			start_date: {
				type: 'string',
				description: 'Start date in format YYYYMMDD'
			},
			end_date: {
				type: 'string',
				description: 'End date in format YYYYMMDD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.option_hist_czce({
				symbol: args.symbol,
				start_date: args.start_date,
				end_date: args.end_date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch CZCE commodity option history: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get SHFE commodity options historical data
 * 获取上期所商品期权历史数据
 */
export const getSHFECommodityOptionHistTool: BuiltInTool = {
	name: 'getSHFECommodityOptionHist',
	description: 'Get Shanghai Futures Exchange (SHFE) commodity options historical data.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Option symbol (e.g., "cu_o2309" for copper options)'
			},
			start_date: {
				type: 'string',
				description: 'Start date in format YYYYMMDD'
			},
			end_date: {
				type: 'string',
				description: 'End date in format YYYYMMDD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.option_hist_shfe({
				symbol: args.symbol,
				start_date: args.start_date,
				end_date: args.end_date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch SHFE commodity option history: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get GFEX (Guangzhou Futures Exchange) commodity options historical data
 * 获取广期所商品期权历史数据
 */
export const getGFEXCommodityOptionHistTool: BuiltInTool = {
	name: 'getGFEXCommodityOptionHist',
	description: 'Get Guangzhou Futures Exchange (GFEX) commodity options historical data.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Option symbol (e.g., "SI_o2309" for silicon options)'
			},
			start_date: {
				type: 'string',
				description: 'Start date in format YYYYMMDD'
			},
			end_date: {
				type: 'string',
				description: 'End date in format YYYYMMDD'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }) => {
		const akshare = (window as any).akshare;
		if (!akshare) {
			throw new Error('akshare module not available');
		}

		try {
			const result = await akshare.option_hist_gfex({
				symbol: args.symbol,
				start_date: args.start_date,
				end_date: args.end_date
			});
			return result;
		} catch (error) {
			throw new Error(`Failed to fetch GFEX commodity option history: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};
