/**
 * Futures and commodities tools
 */

export const zhFuturesTools = {

	getMetalFuturesSpreads: {
		name: '获取金属期货跨期价差',
		description: '获取铜、铝、锌、铅、镍、锡等金属期货的跨期价差（近月-远月）。'
	},

	getEnergyFuturesSpreads: {
		name: '获取能源期货跨期价差',
		description: '获取原油、燃料油、天然气等能源期货的跨期价差，展示升贴水结构。'
	},

	getAgriculturalFuturesBasis: {
		name: '获取农产品期货基差',
		description: '获取玉米、大豆、小麦、棉花、白糖等农产品期货的基差（现货价格-期货价格）。'
	},

	getCOTReports: {
		name: '获取COT持仓报告',
		description: '获取CFTC持仓报告（COT），展示商业、非商业和散户的持仓情况。'
	},

	getWarehouseStocksByLocation: {
		name: '获取分地区库存数据',
		description: '获取金属期货的分地区仓库库存数据，展示库存分布。'
	},

	getFuturesPositionRankSum: {
		name: '获取期货持仓排名汇总',
		description: '获取特定合约的期货公司/会员持仓排名汇总。'
	},

	getFuturesWarehouseReceiptData: {
		name: '获取期货仓单数据',
		description: '获取期货合约的仓单数据，展示交易所注册的可交割库存。'
	},

	getFuturesRollYieldAdvanced: {
		name: '获取期货展期收益率',
		description: '获取期货展期收益率数据，展示期货合约换月的收益情况。'
	},

	getFuturesHoldingRankDetail: {
		name: '获取期货持仓排名详情',
		description: '获取详细的期货持仓排名数据，包括成交量排名、多头持仓排名、空头持仓排名。'
	},

	getWarehouseReceiptDetail: {
		name: '获取仓单日报详情',
		description: '获取详细的期货仓单日报数据，用于分析现货供应情况。'
	},

	getFuturesSpotPriceAdvanced: {
		name: '获取期货现货价格(高级)',
		description: '获取期货现货价格高级数据'
	},

	getFuturesExchangeList: {
		name: '获取期货交易所列表',
		description: '获取所有期货交易所列表'
	},

	getFuturesTradingTime: {
		name: '获取期货交易时间',
		description: '获取期货合约交易时间'
	},

	getFuturesContractMultiplier: {
		name: '获取期货合约乘数',
		description: '获取期货合约乘数信息'
	},

	getFuturesMarginRatio: {
		name: '获取期货保证金比率',
		description: '获取期货保证金比率数据'
	},

	getRollYieldBar: {
		name: '获取展期收益图表',
		description: '获取期货展期收益率图表数据'
	},

	getCFFEXRankTable: {
		name: '获取中金所持仓排名',
		description: '获取中国金融期货交易所持仓排名表'
	},

	getRankTableCZCE: {
		name: '获取郑商所持仓排名',
		description: '获取郑州商品交易所持仓排名表'
	},

	getDCERankTable: {
		name: '获取大商所持仓排名',
		description: '获取大连商品交易所持仓排名表'
	},

	getSHFEVWAP: {
		name: '获取上期所成交量加权均价',
		description: '获取上海期货交易所成交量加权平均价'
	},

	getGFEXDaily: {
		name: '获取广期所日线数据',
		description: '获取广州期货交易所日线数据'
	},

	getFuturesZhSpot: {
		name: '获取国内期货现货数据',
		description: '获取中国期货现货价格数据'
	},

	getFuturesZhRealtime: {
		name: '获取国内期货实时行情',
		description: '获取中国期货实时行情数据'
	},

	getFuturesForeignRealtime: {
		name: '获取外盘期货实时行情',
		description: '获取国际期货实时行情数据'
	},

	getFuturesZhMinuteSina: {
		name: '获取国内期货分钟数据',
		description: '获取中国期货分钟级行情数据(新浪)'
	}
};
