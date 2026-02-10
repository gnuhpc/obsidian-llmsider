/**
 * Options market tools
 */

export const zhOptionsTools = {
	getOptionGreeksDetail: {
		name: '获取期权希腊字母详情',
		description: '获取期权详细的希腊字母数据，包括Delta、Gamma、Theta、Vega和Rho。'
	},
	getOptionMinuteData: {
		name: '获取期权分时数据',
		description: '获取期权的分钟级Tick数据，包括OHLC价格和成交量。'
	},
	getOptionVolatilitySurface: {
		name: '获取期权波动率曲面',
		description: '获取展示不同行权价和到期日隐含波动率（IV）的波动率曲面。'
	},
	optionMargin: {
		name: '计算期权保证金',
		description: '根据上交所/深交所规则计算期权保证金。'
	},
	optionDailyStatsSzse: {
		name: '获取深交所期权日统计',
		description: '获取深圳证券交易所期权日统计数据。'
	}
};
