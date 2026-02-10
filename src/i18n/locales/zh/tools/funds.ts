export const zhFundsTools = {
	getOpenFundRanking: {
		name: '获取开放式基金排行',
		description: '获取开放式基金的排名，基于业绩、净值和其他指标。'
	},
	getExchangeFundRanking: {
		name: '获取场内基金排行',
		description: '获取ETF和LOF等场内交易基金的市场表现排名。'
	},
	getMoneyFundRanking: {
		name: '获取货币基金排行',
		description: '获取货币市场基金的排名，基于7日年化收益率和其他回报指标。'
	},
	getFundManagerInfo: {
		name: '获取基金经理信息',
		description: '获取基金经理的详细信息，包括简介、管理基金列表和历史业绩。'
	},
	getFundRating: {
		name: '获取基金评级',
		description: '获取主要评级机构（如晨星、上海证券）的基金评级数据。'
	},
	getFundStockHoldings: {
		name: '获取基金持仓股票',
		description: '获取特定基金持有的股票列表，包括持仓权重和股数。'
	},
	getFundBondHoldings: {
		name: '获取基金持仓债券',
		description: '获取特定基金持有的债券列表，包括债券类型和配置比例。'
	},
	getFundScaleChange: {
		name: '获取基金规模变动',
		description: '获取基金资产净值（规模）随时间变化的历史数据。'
	},
	getFundHolderStructure: {
		name: '获取基金持有人结构',
		description: '获取基金持有人的结构，包括机构投资者与个人投资者的比例。'
	},
	getFundDividendRanking: {
		name: '获取基金分红排行',
		description: '基于分红历史和收益率的基金排名。'
	},
	getFundDividendDetail: {
		name: '获取基金分红详情',
		description: '获取特定基金的详细分红历史记录。'
	},
	getQdiiExchangeRateIndex: {
		name: '获取QDII汇率指数',
		description: '获取QDII（合格境内机构投资者）基金相关的汇率指数。'
	},
	getQdiiAllocationIndex: {
		name: '获取QDII配置指数',
		description: '获取QDII基金的资产配置指数，显示对不同全球市场的敞口。'
	},
	getFundManagerPerformance: {
		name: '获取基金经理业绩',
		description: '获取基金经理在不同时间段的详细业绩指标。'
	},
	getFundFlow: {
		name: '获取资金流向',
		description: '获取基金的资金流入流出数据，反映投资者情绪。'
	},
	getEtfTracking: {
		name: '获取ETF跟踪误差',
		description: '获取ETF相对于其基准指数的跟踪误差和跟踪偏离度。'
	},
	getETFTracking: {
		name: '获取ETF跟踪误差',
		description: '获取ETF相对于其基准指数的跟踪误差和跟踪偏离度。'
	},
	getFundAllocationIndex: {
		name: '获取基金配置指数',
		description: '获取基金的资产配置明细（股票、债券、现金等）。'
	},
	getFundComparison: {
		name: '获取基金对比',
		description: '基于业绩、风险、费用和持仓对比多只基金。'
	},
	getFundFees: {
		name: '获取基金费用',
		description: '获取基金费用的详细信息，包括管理费、托管费和销售服务费。'
	},
	getFundRiskMetrics: {
		name: '获取基金风险指标',
		description: '获取基金的风险指标，如波动率、夏普比率和最大回撤。'
	},
	getFundStyleAnalysis: {
		name: '获取基金风格分析',
		description: '分析基金的投资风格（如价值型vs成长型，大盘vs小盘）。'
	},
	getFundCompanyRanking: {
		name: '获取基金公司排行',
		description: '基于资产管理总规模（AUM）和业绩的基金管理公司排名。'
	},
	getEtfArbitrage: {
		name: '获取ETF套利信息',
		description: '获取ETF套利相关信息，如折溢价率和IOPV。'
	},
	getETFArbitrage: {
		name: '获取ETF套利信息',
		description: '获取ETF套利相关信息，如折溢价率和IOPV。'
	},
	getLofArbitrage: {
		name: '获取LOF套利信息',
		description: '获取LOF（上市开放式基金）套利相关信息。'
	},
	getLOFArbitrage: {
		name: '获取LOF套利信息',
		description: '获取LOF（上市开放式基金）套利相关信息。'
	},
	getFundTurnoverRate: {
		name: '获取基金换手率',
		description: '获取基金的投资组合换手率，反映资产买卖的频率。'
	},
	getFundManagerHistory: {
		name: '获取基金经理历史',
		description: '获取基金经理的职业生涯路径和过去管理的基金。'
	},
	getSectorFundRanking: {
		name: '获取行业基金排行',
		description: '获取专注于特定行业（如科技、医疗）的基金排名。'
	},
	getFundBenchmarkComparison: {
		name: '获取基金基准对比',
		description: '对比基金业绩与其基准指数的表现。'
	},
	getQdiiCurrencyExposure: {
		name: '获取QDII货币敞口',
		description: '获取QDII基金的货币敞口明细。'
	},
	getQDIICurrencyExposure: {
		name: '获取QDII货币敞口',
		description: '获取QDII基金的货币敞口明细。'
	},
	getFundHoldingsChange: {
		name: '获取基金持仓变动',
		description: '获取基金前十大持仓在报告期内的变动数据。'
	},
	getMoneyFundYieldRanking: {
		name: '获取货币基金收益排行',
		description: '基于收益率的货币市场基金排名。'
	},
	getFundShareholderConcentration: {
		name: '获取基金持有人集中度',
		description: '获取基金前十大持有人的持仓集中度数据。'
	},
	getSmartBetaEtfMetrics: {
		name: '获取Smart Beta ETF指标',
		description: '获取Smart Beta ETF的特定指标，如因子敞口和业绩。'
	},
	getSmartBetaETFMetrics: {
		name: '获取Smart Beta ETF指标',
		description: '获取Smart Beta ETF的特定指标，如因子敞口和业绩。'
	},
	getInstitutionalResearchCalendar: {
		name: '获取机构调研日历',
		description: '获取机构投资者对上市公司的调研访问日历。'
	},
	fundFeeEm: {
		name: '获取基金费率（东方财富）',
		description: '获取基金费率信息（东方财富），包括管理费率、托管费率、申购费率等。'
	},
	fundManagerChange: {
		name: '获取基金经理变更',
		description: '获取基金经理变更历史和记录。'
	},
	etfRealTimePremium: {
		name: '获取ETF实时溢价率',
		description: '获取ETF实时溢价/折价率，用于识别套利机会。'
	},
	lofRealTimePremium: {
		name: '获取LOF实时溢价率',
		description: '获取LOF（上市开放式基金）实时溢价/折价率。'
	},
	bondConvertPremium: {
		name: '获取可转债转股溢价率',
		description: '获取可转债转股溢价率数据。'
	},
	bondCallRedeemWarning: {
		name: '获取可转债强赎预警',
		description: '获取可转债提前强制赎回预警通知。'
	},
	getEtfRealTimePremium: {
		name: '获取ETF实时溢价率',
		description: '获取ETF实时溢价/折价率，用于识别套利机会。'
	},
	getLofRealTimePremium: {
		name: '获取LOF实时溢价率',
		description: '获取LOF（上市开放式基金）实时溢价/折价率。'
	},
	getEtfFund: {
		name: '获取ETF基金数据',
		description: '获取全面的ETF基金数据和信息。'
	}
};
