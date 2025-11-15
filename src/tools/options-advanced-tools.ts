/**
 * Options Advanced Data Tools
 * 期权高级数据工具
 * 
 * Provides advanced option market data analysis tools including:
 * - Greeks (Delta, Gamma, Theta, Vega, Rho) 希腊字母
 * - Minute-level option data 期权分钟数据
 * - Volatility surface 波动率曲面
 * - Option risk metrics 期权风险指标
 * - Option value analysis 期权价值分析
 * - Option leaderboard 期权龙虎榜
 */

import { BuiltInTool } from './built-in-tools';

/**
 * Get detailed Greeks data for stock options
 * 获取股票期权希腊字母详细数据
 * 
 * Greeks are risk measures that describe sensitivity of option prices to various factors:
 * - Delta: Price sensitivity to underlying asset price change (一阶导数)
 * - Gamma: Rate of change of Delta (二阶导数)
 * - Theta: Time decay (时间价值衰减)
 * - Vega: Sensitivity to volatility changes (波动率敏感度)
 * - Rho: Sensitivity to interest rate changes (利率敏感度)
 */
export const getOptionGreeksDetailTool: BuiltInTool = {
	name: 'get_option_greeks_detail',
	description: 'Get detailed Greeks (Delta, Gamma, Theta, Vega, Rho) data for stock options. Essential for option risk management and hedging strategies.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Option underlying symbol. Examples: "510050" (SSE 50 ETF), "510300" (CSI 300 ETF), "159919" (CSI 300 ETF), "000300" (CSI 300 Index)'
			},
			date: {
				type: 'string',
				description: 'Trading date in YYYYMMDD format. Example: "20231201". If not provided, returns latest data.'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; date?: string }) => {
		try {
			const { symbol, date } = args;
			const params: any = { symbol };
			if (date) params.date = date;

			const result = await (window as any).akshare.option_finance_board(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved Greeks data for ${symbol}${date ? ` on ${date}` : ''}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve option Greeks data'
			};
		}
	}
};

/**
 * Get minute-level tick data for stock options
 * 获取股票期权分钟级别数据
 */
export const getOptionMinuteDataTool: BuiltInTool = {
	name: 'get_option_minute_data',
	description: 'Get minute-level tick data for stock options including price, volume, and open interest changes. Useful for intraday trading and high-frequency analysis.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Option contract code. Example: "10004270" (SSE 50 ETF option contract)'
			},
			period: {
				type: 'string',
				description: 'Data frequency: "1" (1-minute), "5" (5-minute), "15" (15-minute), "30" (30-minute), "60" (60-minute). Default is "1".',
				enum: ['1', '5', '15', '30', '60']
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; period?: string }) => {
		try {
			const { symbol, period = '1' } = args;
			const result = await (window as any).akshare.option_current_em(symbol, period);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved ${period}-minute data for option ${symbol}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve option minute data'
			};
		}
	}
};

/**
 * Get implied volatility surface data
 * 获取隐含波动率曲面数据
 */
export const getOptionVolatilitySurfaceTool: BuiltInTool = {
	name: 'get_option_volatility_surface',
	description: 'Get implied volatility surface showing IV across different strikes and expirations. Critical for option pricing, arbitrage, and volatility trading strategies.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Underlying asset symbol. Examples: "510050" (SSE 50 ETF), "510300" (CSI 300 ETF)'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string }) => {
		try {
			const { symbol } = args;
			const result = await (window as any).akshare.option_volatility_surface_sina(symbol);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved volatility surface for ${symbol}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve volatility surface'
			};
		}
	}
};

/**
 * Get option risk metrics including position limit utilization
 * 获取期权风险指标，包括持仓限额使用率
 */
export const getOptionRiskMetricsTool: BuiltInTool = {
	name: 'get_option_risk_metrics',
	description: 'Get option market risk metrics including position limits, margin requirements, and risk warnings. Important for risk management and regulatory compliance.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Trading date in YYYY-MM-DD format. Example: "2023-12-01". If not provided, returns latest data.'
			}
		},
		required: []
	},
	execute: async (args: { date?: string }) => {
		try {
			const { date } = args;
			const params = date ? { date } : undefined;
			const result = await (window as any).akshare.option_risk_analysis_em(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved option risk metrics${date ? ` for ${date}` : ''}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve option risk metrics'
			};
		}
	}
};

/**
 * Get option value analysis including intrinsic value and time value
 * 获取期权价值分析，包括内在价值和时间价值
 */
export const getOptionValueAnalysisTool: BuiltInTool = {
	name: 'get_option_value_analysis',
	description: 'Get option value decomposition showing intrinsic value (内在价值) and time value (时间价值). Essential for understanding option pricing and identifying mispriced options.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Option underlying symbol. Examples: "510050" (SSE 50 ETF), "510300" (CSI 300 ETF)'
			},
			date: {
				type: 'string',
				description: 'Trading date in YYYYMMDD format. Example: "20231201". If not provided, returns latest data.'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; date?: string }) => {
		try {
			const { symbol, date } = args;
			const params: any = { symbol };
			if (date) params.date = date;

			const result = await (window as any).akshare.option_value_analysis_em(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved value analysis for ${symbol}${date ? ` on ${date}` : ''}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve option value analysis'
			};
		}
	}
};

/**
 * Get China Volatility Index (iVIX) data
 * 获取中国波动率指数数据
 */
export const getChinaVIXTool: BuiltInTool = {
	name: 'get_china_vix',
	description: 'Get China Volatility Index (iVIX/中国波指) showing market fear gauge. Similar to VIX in US markets. High values indicate high expected volatility and market uncertainty.',
  category: 'market-data',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'VIX type: "000188" (SSE 50 iVIX), "000300" (CSI 300 iVIX). Default is "000188".'
			},
			start_date: {
				type: 'string',
				description: 'Start date in YYYY-MM-DD format. Example: "2023-01-01"'
			},
			end_date: {
				type: 'string',
				description: 'End date in YYYY-MM-DD format. Example: "2023-12-31"'
			}
		},
		required: []
	},
	execute: async (args: { symbol?: string; start_date?: string; end_date?: string }) => {
		try {
			const { symbol = '000188', start_date, end_date } = args;
			const params: any = { symbol };
			if (start_date) params.start_date = start_date;
			if (end_date) params.end_date = end_date;

			const result = await (window as any).akshare.index_vix_sina(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved China VIX (${symbol}) data`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve China VIX data'
			};
		}
	}
};

/**
 * Get option leaderboard showing top traders and their positions
 * 获取期权龙虎榜数据，显示主力交易者及其持仓
 */
export const getOptionLeaderboardTool: BuiltInTool = {
	name: 'get_option_leaderboard',
	description: 'Get option leaderboard (龙虎榜) showing top traders, their positions, and trading activities. Useful for tracking smart money and institutional flows.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Trading date in YYYY-MM-DD format. Example: "2023-12-01". If not provided, returns latest data.'
			}
		},
		required: []
	},
	execute: async (args: { date?: string }) => {
		try {
			const { date } = args;
			const params = date ? { trade_date: date } : undefined;
			const result = await (window as any).akshare.option_lhb_em(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved option leaderboard${date ? ` for ${date}` : ''}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve option leaderboard'
			};
		}
	}
};

/**
 * Get PCR (Put-Call Ratio) data
 * 获取PCR（看跌看涨比率）数据
 */
export const getOptionPCRTool: BuiltInTool = {
	name: 'get_option_pcr',
	description: 'Get Put-Call Ratio (PCR) showing ratio of put to call option volume/open interest. PCR > 1 indicates bearish sentiment, PCR < 1 indicates bullish sentiment. Important contrarian indicator.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Underlying asset symbol. Examples: "510050" (SSE 50 ETF), "510300" (CSI 300 ETF)'
			},
			start_date: {
				type: 'string',
				description: 'Start date in YYYY-MM-DD format. Example: "2023-01-01"'
			},
			end_date: {
				type: 'string',
				description: 'End date in YYYY-MM-DD format. Example: "2023-12-31"'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }) => {
		try {
			const { symbol, start_date, end_date } = args;
			const params: any = { symbol };
			if (start_date) params.start_date = start_date;
			if (end_date) params.end_date = end_date;

			const result = await (window as any).akshare.option_pcr_em(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved PCR data for ${symbol}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve PCR data'
			};
		}
	}
};

/**
 * Get option arbitrage opportunities analysis
 * 获取期权套利机会分析
 */
export const getOptionArbitrageTool: BuiltInTool = {
	name: 'get_option_arbitrage',
	description: 'Get option arbitrage opportunities including box spread, conversion, reversal arbitrage. Shows potential risk-free profit opportunities based on put-call parity violations.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Underlying asset symbol. Examples: "510050" (SSE 50 ETF), "510300" (CSI 300 ETF)'
			},
			date: {
				type: 'string',
				description: 'Trading date in YYYY-MM-DD format. Example: "2023-12-01". If not provided, returns latest data.'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; date?: string }) => {
		try {
			const { symbol, date } = args;
			const params: any = { symbol };
			if (date) params.date = date;

			const result = await (window as any).akshare.option_arbitrage_analysis_em(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved arbitrage opportunities for ${symbol}${date ? ` on ${date}` : ''}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve option arbitrage data'
			};
		}
	}
};

/**
 * Get option moneyness distribution
 * 获取期权实值虚值分布
 */
export const getOptionMoneynessTool: BuiltInTool = {
	name: 'get_option_moneyness',
	description: 'Get option moneyness distribution showing ITM (实值), ATM (平值), and OTM (虚值) option counts and volumes. Helps understand market structure and sentiment.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Underlying asset symbol. Examples: "510050" (SSE 50 ETF), "510300" (CSI 300 ETF)'
			},
			date: {
				type: 'string',
				description: 'Trading date in YYYY-MM-DD format. Example: "2023-12-01". If not provided, returns latest data.'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; date?: string }) => {
		try {
			const { symbol, date } = args;
			const params: any = { symbol };
			if (date) params.date = date;

			const result = await (window as any).akshare.option_moneyness_em(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved moneyness distribution for ${symbol}${date ? ` on ${date}` : ''}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve option moneyness data'
			};
		}
	}
};

/**
 * Get option historical volatility vs implied volatility comparison
 * 获取期权历史波动率vs隐含波动率对比
 */
export const getOptionVolatilityComparisonTool: BuiltInTool = {
	name: 'get_option_volatility_comparison',
	description: 'Compare historical volatility (HV/实际波动率) with implied volatility (IV/隐含波动率). When IV > HV, options are expensive; when IV < HV, options are cheap. Essential for volatility trading.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			symbol: {
				type: 'string',
				description: 'Underlying asset symbol. Examples: "510050" (SSE 50 ETF), "510300" (CSI 300 ETF)'
			},
			start_date: {
				type: 'string',
				description: 'Start date in YYYY-MM-DD format. Example: "2023-01-01"'
			},
			end_date: {
				type: 'string',
				description: 'End date in YYYY-MM-DD format. Example: "2023-12-31"'
			}
		},
		required: ['symbol']
	},
	execute: async (args: { symbol: string; start_date?: string; end_date?: string }) => {
		try {
			const { symbol, start_date, end_date } = args;
			const params: any = { symbol };
			if (start_date) params.start_date = start_date;
			if (end_date) params.end_date = end_date;

			const result = await (window as any).akshare.option_volatility_comparison_em(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved volatility comparison for ${symbol}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve volatility comparison'
			};
		}
	}
};

/**
 * Get option turnover rate ranking
 * 获取期权换手率排行
 */
export const getOptionTurnoverRankTool: BuiltInTool = {
	name: 'get_option_turnover_rank',
	description: 'Get option contracts ranked by turnover rate (换手率). High turnover indicates active trading and good liquidity. Useful for identifying popular contracts and market focus.',
  category: 'options',
	inputSchema: {
		type: 'object',
		properties: {
			date: {
				type: 'string',
				description: 'Trading date in YYYY-MM-DD format. Example: "2023-12-01". If not provided, returns latest data.'
			}
		},
		required: []
	},
	execute: async (args: { date?: string }) => {
		try {
			const { date } = args;
			const params = date ? { trade_date: date } : undefined;
			const result = await (window as any).akshare.option_turnover_rate_em(params);
			return {
				success: true,
				data: result,
				message: `Successfully retrieved option turnover rankings${date ? ` for ${date}` : ''}`
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to retrieve option turnover rankings'
			};
		}
	}
};
