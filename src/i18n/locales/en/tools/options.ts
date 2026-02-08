/**
 * Options market tools
 */

export const enOptionsTools = {
	getOptionGreeksDetail: {
		name: 'Get Option Greeks Detail',
		description: 'Get detailed Greeks data for options including Delta, Gamma, Theta, Vega, and Rho.'
	},
	getOptionMinuteData: {
		name: 'Get Option Minute Data',
		description: 'Get minute-level tick data for options including OHLC prices and volume.'
	},
	getOptionVolatilitySurface: {
		name: 'Get Option Volatility Surface',
		description: 'Get volatility surface showing implied volatility (IV) across different strike prices and expiration dates.'
	},
	optionMargin: {
		name: 'Calculate Option Margin',
		description: 'Calculate option margin based on SSE/SZSE rules.'
	},
	optionDailyStatsSzse: {
		name: 'Get SZSE Option Daily Stats',
		description: 'Get Shenzhen Stock Exchange option daily statistics.'
	}
};
