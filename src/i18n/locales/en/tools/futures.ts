/**
 * Futures and commodities tools
 */

export const enFuturesTools = {
	getMetalFuturesSpreads: {
		name: 'Get Metal Futures Spreads',
		description: 'Get metal futures calendar spreads (near-far month price differences) for copper, aluminum, zinc, lead, nickel, tin.'
	},
	getEnergyFuturesSpreads: {
		name: 'Get Energy Futures Spreads',
		description: 'Get energy futures calendar spreads for crude oil, fuel oil, natural gas showing contango/backwardation.'
	},
	getAgriculturalFuturesBasis: {
		name: 'Get Agricultural Futures Basis',
		description: 'Get agricultural futures basis (spot price - futures price) for corn, soybean, wheat, cotton, sugar.'
	},
	getCotReports: {
		name: 'Get COT Reports',
		description: 'Get CFTC Commitment of Traders (COT) reports showing commercial, non-commercial, and retail positioning.'
	},
	getWarehouseStocksByLocation: {
		name: 'Get Warehouse Stocks By Location',
		description: 'Get warehouse stocks by storage location for metals, showing inventory distribution across warehouses.'
	},
	getFuturesPositionRankSum: {
		name: 'Get Futures Position Rank Sum',
		description: 'Get futures position ranking by brokers/members for a specific contract.'
	},
	getFuturesWarehouseReceiptData: {
		name: 'Get Futures Warehouse Receipt Data',
		description: 'Get warehouse receipt data for futures contracts. Shows deliverable inventory registered at exchanges.'
	},
	getFuturesRollYieldAdvanced: {
		name: 'Get Futures Roll Yield Advanced',
		description: 'Get futures roll yield data. Shows returns from rolling futures contracts from one month to another.'
	},
	getFuturesHoldingRankDetail: {
		name: 'Get Futures Holding Rank Detail',
		description: 'Get detailed futures holding ranking data, including volume ranking, long position ranking, short position ranking.'
	},
	getWarehouseReceiptDetail: {
		name: 'Get Warehouse Receipt Detail',
		description: 'Get detailed futures warehouse receipt daily data, used for analyzing spot supply.'
	},
	getFuturesSpotPriceAdvanced: {
		name: 'Get Futures Spot Price Advanced',
		description: 'Get advanced futures spot price data with detailed market information.'
	},
	getFuturesContractMultiplier: {
		name: 'Get Futures Contract Multiplier',
		description: 'Get futures contract multiplier and specifications.'
	},
	getFuturesExchangeList: {
		name: 'Get Futures Exchange List',
		description: 'Get list of futures exchanges and their details.'
	},
	getFuturesMarginRatio: {
		name: 'Get Futures Margin Ratio',
		description: 'Get futures margin ratio requirements.'
	},
	getFuturesTradingTime: {
		name: 'Get Futures Trading Time',
		description: 'Get futures trading hours and session information.'
	},
	getCFFEXRankTable: {
		name: 'Get CFFEX Rank Table',
		description: 'Get China Financial Futures Exchange ranking table data.'
	},
	getDCERankTable: {
		name: 'Get DCE Rank Table',
		description: 'Get Dalian Commodity Exchange ranking table data.'
	},
	getGFEXDaily: {
		name: 'Get GFEX Daily Data',
		description: 'Get Guangzhou Futures Exchange daily trading data.'
	},
	getRankTableCZCE: {
		name: 'Get CZCE Rank Table',
		description: 'Get Zhengzhou Commodity Exchange ranking table data.'
	},
	getRollYieldBar: {
		name: 'Get Roll Yield Bar',
		description: 'Get futures roll yield bar chart data.'
	},
	getSHFEVWAP: {
		name: 'Get SHFE VWAP',
		description: 'Get Shanghai Futures Exchange volume-weighted average price.'
	},
	getFuturesForeignRealtime: {
		name: 'Get Foreign Futures Realtime',
		description: 'Get real-time quotes for foreign futures markets.'
	},
	getFuturesZhMinuteSina: {
		name: 'Get China Futures Minute Data (Sina)',
		description: 'Get China futures minute-level data from Sina.'
	},
	getFuturesZhRealtime: {
		name: 'Get China Futures Realtime',
		description: 'Get real-time quotes for China futures markets.'
	},
	getFuturesZhSpot: {
		name: 'Get China Futures Spot',
		description: 'Get China futures spot price data.'
	},
};
