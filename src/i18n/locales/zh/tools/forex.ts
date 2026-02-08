/**
 * Forex market tools
 */

export const zhForexTools = {
	getFXSpotQuote: {
		name: '获取人民币外汇即期报价',
		description: '获取中国外汇交易中心（CFETS）的人民币外汇即期报价。'
	},
	getRealTimeExchangeRate: {
		name: '获取实时汇率',
		description: '获取主要货币对（美元、欧元、英镑、日元等）的实时汇率。'
	},
	fxSwapQuote: {
		name: '获取外汇掉期报价',
		description: '获取外汇掉期报价数据，包括远期点数和掉期价格。'
	},
	fxPairQuote: {
		name: '获取外汇货币对报价',
		description: '获取详细的外汇货币对报价，包括买卖价差、点值等。'
	}
};
