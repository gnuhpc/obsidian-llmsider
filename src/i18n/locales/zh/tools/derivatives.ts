/**
 * Derivatives tools
 */

export const zhDerivativesTools = {
	getInterestRateSwapRates: {
			name: '获取利率互换利率',
			description: '获取不同期限的利率互换(IRS)利率曲线'
		},
		getEquityIndexDerivatives: {
			name: '获取股指衍生品',
			description: '获取股指期货和期权的市场数据'
		},
		getVolatilitySurfaceAnalysis: {
			name: '获取波动率曲面分析',
			description: '分析期权隐含波动率曲面结构'
		},
		getOptionStrategyAnalysis: {
			name: '获取期权策略分析',
			description: '分析常见期权组合策略的损益和风险'
		},
		getSwaptionData: {
			name: '获取利率期权数据',
			description: '获取利率互换期权(Swaption)报价数据'
		},
		getVarianceSwapRates: {
			name: '获取方差互换利率',
			description: '获取方差互换和波动率互换报价'
		},
		getExoticOptionsData: {
			name: '获取奇异期权数据',
			description: '获取障碍期权、亚式期权等奇异期权数据'
		},
		getCDSSpreads: {
			name: '获取CDS利差',
			description: '获取信用违约互换(CDS)利差数据'
		},
		getForwardRateAgreements: {
			name: '获取远期利率协议',
			description: '获取远期利率协议(FRA)报价'
		},
		getInterestRateCapFloor: {
			name: '获取利率上下限',
			description: '获取利率上限(Cap)和下限(Floor)期权数据'
		},
		getEquityDerivativesOIDistribution: {
			name: '获取股票衍生品持仓分布',
			description: '获取股票期权未平仓合约分布情况'
		},
		getVolatilityArbitrageSignals: {
			name: '获取波动率套利信号',
			description: '识别波动率套利机会和信号'
		},
		getDividendSwapRates: {
			name: '获取股息互换利率',
			description: '获取股息互换合约报价'
		},
		getCorrelationSwapQuotes: {
			name: '获取相关性互换报价',
			description: '获取相关性互换产品报价'
		},
		getEquityDispersionTrading: {
			name: '获取股票离散度交易',
			description: '获取股指成分股离散度交易机会'
		},
		getOptionImpliedCorrelation: {
			name: '获取期权隐含相关性',
			description: '从期权价格中提取隐含相关系数'
		},
		getCrossCurrencyBasisSwaps: {
			name: '获取跨货币基差互换',
			description: '获取跨货币基差互换利差'
		},
		getTotalReturnSwaps: {
			name: '获取总回报互换',
			description: '获取总回报互换(TRS)合约数据'
		},
		getValueAtRisk: {
			name: '获取风险价值VaR',
			description: '计算投资组合的风险价值(VaR)指标'
		},
		getStressTestingResults: {
			name: '获取压力测试结果',
			description: '获取投资组合压力测试场景结果'
		},
		getScenarioAnalysis: {
			name: '获取情景分析',
			description: '进行多种市场情景下的投资组合分析'
		},
		getPortfolioRiskAttribution: {
			name: '获取组合风险归因',
			description: '分解投资组合风险来源和贡献度'
		},
		getCreditRiskMetrics: {
			name: '获取信用风险指标',
			description: '获取信用风险暴露和违约风险指标'
		},
		getLiquidityRiskIndicators: {
			name: '获取流动性风险指标',
			description: '评估投资组合流动性风险'
		},
		getOperationalRiskIndicators: {
			name: '获取操作风险指标',
			description: '监控操作风险事件和指标'
		},
		getMarginRequirements: {
			name: '获取保证金要求',
			description: '计算衍生品和融资交易的保证金要求'
		},
		getCounterpartyExposure: {
			name: '获取交易对手风险敞口',
			description: '监控对交易对手的信用风险敞口'
		},
		getConcentrationRiskAnalysis: {
			name: '获取集中度风险分析',
			description: '分析投资组合的集中度风险'
		},
		getTailRiskIndicators: {
			name: '获取尾部风险指标',
			description: '监控极端风险和尾部事件概率'
		},
		getRiskLimitMonitoring: {
			name: '获取风险限额监控',
			description: '监控投资组合是否超过风险限额'
		},
		getStockHotRankEM: {
			name: '获取股票人气排行',
			description: '获取东方财富网股票人气排行榜'
		},
		getStockHotUpEM: {
			name: '获取股票热度上升榜',
			description: '获取热度快速上升的股票列表'
		},
		getStockHotKeywordEM: {
			name: '获取股票热搜关键词',
			description: '获取股票市场热搜关键词'
		},
		getStockCYQEM: {
			name: '获取股票成本分布',
			description: '获取股票筹码分布和成本分布数据'
		},
		getStockIntradayEM: {
			name: '获取股票盘口数据-东财',
			description: '获取股票实时盘口数据(东方财富)'
		},
		getStockIntradaySina: {
			name: '获取股票盘口数据-新浪',
			description: '获取股票实时盘口数据(新浪财经)'
		},
		getStockBidAskEM: {
			name: '获取股票买卖盘数据',
			description: '获取股票五档买卖盘数据'
		},
		getStockChangesEM: {
			name: '获取股票涨跌统计',
			description: '获取市场涨跌股票数量统计'
		},
		getStockBoardChangeEM: {
			name: '获取板块涨跌统计',
			description: '获取行业和概念板块涨跌统计'
		},
		getStockHotFollowXQ: {
			name: '获取雪球关注排行',
			description: '获取雪球平台股票关注度排行'
		},
		getStockHotTweetXQ: {
			name: '获取雪球讨论热度',
			description: '获取雪球平台股票讨论热度排行'
		},
		getStockInnerTradeXQ: {
			name: '获取内部交易数据',
			description: '获取上市公司内部人交易数据'
		},
		getStockHotSearchBaidu: {
			name: '获取百度股票搜索',
			description: '获取百度股票搜索热度排行'
		},
		getStockATTMLYR: {
			name: '获取A股市场估值',
			description: '获取A股市场整体TTM市盈率'
		},
		getStockAAllPB: {
			name: '获取A股市盈率',
			description: '获取全部A股市净率分布'
		},
		getStockZHAGBJGEM: {
			name: '获取港股通(沪深)',
			description: '获取沪深港股通持股数据'
		},
		getOptionMargin: {
			name: '获取期权保证金',
			description: '计算期权交易所需保证金'
		},
		getStockMarginRatioPA: {
			name: '获取股票融资融券比例',
			description: '获取平安证券融资融券比例数据'
		},
		getOptionRiskIndicatorSSE: {
			name: '获取期权风险指标-上交所',
			description: '获取上交所期权市场风险指标'
		},
		getOptionDailyStatsSSE: {
			name: '获取期权每日统计-上交所',
			description: '获取上交所期权每日交易统计'
		},
		getOptionDailyStatsSZSE: {
			name: '获取期权每日统计-深交所',
			description: '获取深交所期权每日交易统计'
		},
		getOptionCommInfo: {
			name: '获取期权合约信息',
			description: '获取期权合约基本信息和参数'
		},
		getFuturesHoldPosSina: {
			name: '获取期货持仓-新浪',
			description: '获取新浪财经期货持仓数据'
		},
		getFuturesSpotSys: {
			name: '获取期货现货价格对比',
			description: '获取期货与现货价格对比数据'
		},
		getFuturesStockSHFEJS: {
			name: '获取上期所库存-金十',
			description: '获取上期所仓单库存(金十数据)'
		},
		getStockZHABComparisonEM: {
			name: '获取A股B股对比',
			description: '获取A股和B股价格对比数据'
		},
		getStockMarginAccountInfo: {
			name: '获取融资融券账户信息',
			description: '获取融资融券账户统计信息'
		},
		getCryptoBitcoinCME: {
			name: '获取CME比特币期货',
			description: '获取芝加哥商品交易所比特币期货数据'
		},
		getCryptoBitcoinHoldReport: {
			name: '获取比特币持仓报告',
			description: '获取机构比特币持仓报告'
		},
		getFuturesContractInfoSHFE: {
			name: '获取上期所合约信息',
			description: '获取上海期货交易所合约信息'
		},
		getFundIndividualBasicInfoXQ: {
			name: '获取基金基本信息-雪球',
			description: '获取雪球基金基本信息数据'
		},
		getFundScaleOpenSina: {
			name: '获取开放式基金规模-新浪',
			description: '获取新浪开放式基金规模数据'
		},
		getFundOverviewEM: {
			name: '获取基金概况-东财',
			description: '获取东方财富基金概况信息'
		},
		getFundFeeEM: {
			name: '获取基金费率-东财',
			description: '获取东方财富基金申赎费率信息'
		},
		getStockHKProfitForecast: {
			name: '获取港股盈利预测',
			description: '获取香港股票盈利预测数据'
		},
		getFundPortfolioHoldEM: {
			name: '获取基金持仓组合-东财',
			description: '获取东方财富基金投资组合持仓'
		},
		getFundManagerInfoEM: {
			name: '获取基金经理信息-东财',
			description: '获取东方财富基金经理详细信息'
		},
		getPrivateFundRank: {
			name: '获取私募基金排行',
			description: '获取私募基金业绩排行榜'
		},
		getFundManagerChange: {
			name: '获取基金经理变更',
			description: '获取基金经理变更历史记录'
		},
		getETFRealTimePremium: {
			name: '获取ETF实时溢价',
			description: '获取ETF实时溢价率数据'
		},
		getLOFRealTimePremium: {
			name: '获取LOF实时溢价',
			description: '获取LOF基金实时溢价率数据'
		},
		getBondConvertPremium: {
			name: '获取可转债转股溢价',
			description: '获取可转债转股溢价率数据'
		},
		getBondCallRedeemWarning: {
			name: '获取可转债强赎预警',
			description: '获取可转债强制赎回预警信息'
		},
		getFundShareChange: {
			name: '获取基金份额变动',
			description: '获取基金份额变动历史数据'
		},
		getFundPurchaseRedeem: {
			name: '获取基金申购赎回',
			description: '获取基金申购赎回状态信息'
		},
		getFundRatingAllEM: {
			name: '获取基金评级-东财全部',
			description: '获取东方财富全部基金评级数据'
		},
		getFundRatingSH: {
			name: '获取基金评级-上海',
			description: '获取上海证券基金评级数据'
		},
		getFundOpenRankEM: {
			name: '获取开放式基金排行-东财',
			description: '获取东方财富开放式基金排行'
		},
		getESGRatings: {
			name: '获取ESG评级',
			description: '获取企业环境、社会和治理(ESG)评级'
		},
		getCarbonEmissionsData: {
			name: '获取碳排放数据',
			description: '获取企业碳排放和碳足迹数据'
		},
		getGreenBondData: {
			name: '获取绿色债券数据',
			description: '获取绿色债券发行和市场数据'
		},
		getESGControversyScores: {
			name: '获取ESG争议评分',
			description: '获取企业ESG相关争议事件评分'
		},
		getClimateRiskAssessment: {
			name: '获取气候风险评估',
			description: '评估企业面临的气候变化风险'
		},
		getSustainabilityReports: {
			name: '获取可持续发展报告',
			description: '获取企业可持续发展报告摘要'
		},
		getWaterUsageData: {
			name: '获取用水数据',
			description: '获取企业用水量和水资源管理数据'
		},
		getRenewableEnergyUsage: {
			name: '获取可再生能源使用',
			description: '获取企业可再生能源使用比例'
		},
		getWasteManagementMetrics: {
			name: '获取废弃物管理指标',
			description: '获取企业废弃物处理和回收指标'
		},
		getSupplyChainESGMetrics: {
			name: '获取供应链ESG指标',
			description: '获取供应链环境和社会责任指标'
		},
		getBoardDiversityMetrics: {
			name: '获取董事会多元化指标',
			description: '获取董事会性别和背景多元化指标'
		},
		getEmployeeSatisfactionMetrics: {
			name: '获取员工满意度指标',
			description: '获取员工满意度和福利指标'
		},
		getESGFundScreening: {
			name: '获取ESG基金筛选',
			description: '筛选符合ESG标准的投资基金'
		},
		getGreenFinanceStats: {
			name: '获取绿色金融统计',
			description: '获取绿色金融市场统计数据'
		},
		getCarbonCreditPrices: {
			name: '获取碳信用价格',
			description: '获取碳信用额度交易价格'
		},
		getESGDisclosureQuality: {
			name: '获取ESG披露质量',
			description: '评估企业ESG信息披露质量'
		},
		getSocialResponsibilityMetrics: {
			name: '获取社会责任指标',
			description: '获取企业社会责任履行指标'
		},
		getGovernanceQualityMetrics: {
			name: '获取公司治理质量',
			description: '获取企业公司治理质量评分'
		},
		getOrderBookDepth: {
			name: '获取订单簿深度',
			description: '获取市场订单簿深度和买卖盘分布'
		},
		getMicrostructureMarketMakerDepth: {
			name: '获取做市商深度',
			description: '获取做市商报价深度和流动性'
		},
		getTickByTickData: {
			name: '获取逐笔成交数据',
			description: '获取市场逐笔成交明细数据'
		},
		getTradeExecutionQuality: {
			name: '获取交易执行质量',
			description: '评估交易执行质量和滑点'
		},
		getSlippageAnalysis: {
			name: '获取滑点分析',
			description: '分析交易滑点和市场冲击成本'
		},
		getMarketImpactAnalysis: {
			name: '获取市场冲击分析',
			description: '分析大额交易对市场价格的冲击'
		},
		getVWAPTWAPBenchmarks: {
			name: '获取VWAP/TWAP基准',
			description: '获取成交量加权和时间加权平均价格'
		},
		getLimitOrderBookAnalysis: {
			name: '获取限价订单簿分析',
			description: '分析限价订单簿结构和不平衡'
		},
		getQuoteStuffingDetection: {
			name: '获取报价填充检测',
			description: '检测市场报价填充和异常行为'
		},
		getHFTActivityIndicators: {
			name: '获取高频交易活动指标',
			description: '监控高频交易活动和市场质量'
		},
		getDarkPoolVolume: {
			name: '获取暗池交易量',
			description: '获取暗池交易成交量数据'
		},
		getAuctionImbalanceIndicators: {
			name: '获取集合竞价不平衡',
			description: '获取开盘和收盘集合竞价不平衡指标'
		},
		getBlockTradeAnalysis: {
			name: '获取大宗交易分析',
			description: '分析大宗交易对市场的影响'
		},
		getOrderFlowImbalance: {
			name: '获取订单流不平衡',
			description: '监控买卖订单流不平衡情况'
		},
		getBidAskBounceAnalysis: {
			name: '获取买卖价差跳动分析',
			description: '分析买卖价差的跳动模式'
		},
		getTradeClassification: {
			name: '获取交易分类',
			description: '将交易分类为主动买入或主动卖出'
		},
		getCreditRatingsHistory: {
			name: '获取信用评级历史',
			description: '获取债券和企业信用评级历史变化'
		},
		getRatingTransitionMatrix: {
			name: '获取评级转移矩阵',
			description: '获取信用评级转移概率矩阵'
		},
		getDefaultProbability: {
			name: '获取违约概率',
			description: '计算债券和企业违约概率'
		},
		getCreditSpreadAnalysis: {
			name: '获取信用利差分析',
			description: '分析信用利差走势和驱动因素'
		},
		getRecoveryRates: {
			name: '获取回收率',
			description: '获取违约债券的历史回收率数据'
		},
		getCovenantAnalysis: {
			name: '获取债券条款分析',
			description: '分析债券保护性条款和限制性条款'
		},
		getDebtStructureAnalysis: {
			name: '获取债务结构分析',
			description: '分析企业债务结构和偿债能力'
		},
		getCreditEventHistory: {
			name: '获取信用事件历史',
			description: '获取违约、降级等信用事件历史'
		},
		getBankruptcyPrediction: {
			name: '获取破产预测',
			description: '预测企业破产风险和概率'
		},
		getDistressedDebtAnalysis: {
			name: '获取困境债务分析',
			description: '分析困境企业债务重组机会'
		},
		getCreditPortfolioAnalytics: {
			name: '获取信用组合分析',
			description: '分析信用投资组合风险和回报'
		},
		getCounterpartyCreditRisk: {
			name: '获取交易对手信用风险',
			description: '评估交易对手的信用风险'
		},
		getSovereignCreditAnalysis: {
			name: '获取主权信用分析',
			description: '分析国家主权信用风险'
		},
		getCorporateBondAnalytics: {
			name: '获取公司债分析',
			description: '分析公司债券估值和风险'
		},
		getCreditCycleIndicators: {
			name: '获取信用周期指标',
			description: '监控信用周期阶段和趋势'
		},
		getDebtCapacityAnalysis: {
			name: '获取债务承载能力分析',
			description: '分析企业新增债务承载能力'
		},
		// 股票基本面数据工具 - 补充
		getExecutiveTrading: {
			name: '获取高管交易',
			description: '获取上市公司高管、董事、监事的增减持数据，包括交易时间、交易价格、交易数量等'
		},
		getInstitutionalHoldings: {
			name: '获取机构持仓',
			description: '获取机构持仓数据，包括基金、QFII、社保、券商、保险等机构的持股情况'
		},
		getShareholderCount: {
			name: '获取股东户数',
			description: '获取股东人数变化，包括总股东数、户均持股、较上期变化等，可分析筹码集中度'
		},
		getRestrictedShareRelease: {
			name: '获取限售股解禁',
			description: '获取限售股解禁数据，包括解禁时间、解禁数量、解禁市值、限售股类型等'
		},
		getSharePledge: {
			name: '获取股权质押',
			description: '获取股权质押数据，包括质押股东、质押数量、质押比例、质押开始结束日期等'
		},
		getEquityIncentive: {
			name: '获取股权激励',
			description: '获取股权激励数据，包括激励方案、授予价格、行权条件、解锁进度等'
		},
		getEarningsForecast: {
			name: '获取业绩预告',
			description: '获取业绩预告数据，包括预增、预减、扭亏、首亏等业绩变动情况'
		},
		getEarningsFlash: {
			name: '获取业绩快报',
			description: '获取业绩快报数据，比正式年报提前披露主要财务指标'
		},
		getTopList: {
			name: '获取龙虎榜',
			description: '获取龙虎榜数据，包括上榜原因、买卖前五席位、机构买卖情况等'
		},
		// 股票分析工具 - 补充
		getStockFinancialRatios: {
			name: '股票财务比率',
			description: '获取股票的主要财务指标和比率分析'
		},
		getStockDCFValuation: {
			name: 'DCF估值',
			description: '使用DCF(现金流折现)模型对股票进行估值'
		},
		getStockTechnicalIndicators: {
			name: '技术指标',
			description: '获取股票的技术分析指标(MA/MACD/RSI/KDJ等)'
		},
		getStockIndustryComparison: {
			name: '行业对比',
			description: '对比分析股票在行业中的地位和竞争力'
		},
		// 债券补充工具
		getConvertibleBondSpot: {
			name: '获取可转债行情',
			description: '获取沪深可转债实时行情数据，包括价格、涨跌、成交量、转股溢价率等信息'
		},
		getConvertibleBondIssuance: {
			name: '获取可转债发行',
			description: '获取可转债发行信息，包括发行规模、上市日期、转股起始日、转股价、到期日等'
		},
		getCorporateBondSpot: {
			name: '获取公司债行情',
			description: '获取公司债实时行情，包括价格、收益率、成交量等'
		},
		getCorporateBondIssuance: {
			name: '获取公司债发行',
			description: '获取公司债发行信息，包括发行人、规模、期限、利率、信用评级等'
		},
		getLocalGovBondIssuance: {
			name: '获取地方债发行',
			description: '获取地方政府债券发行数据，包括一般债券和专项债券'
		},
		getExchangeableBond: {
			name: '获取可交换债',
			description: '获取可交换债数据，可交换债持有人可将债券换成标的股票'
		},
		getABSSecurities: {
			name: '获取ABS证券',
			description: '获取资产支持证券(ABS)数据，包括企业ABS、信贷ABS等品种'
		},
		getBondCreditRating: {
			name: '获取债券信用评级',
			description: '获取债券信用评级，包括主体评级、债项评级、评级机构、评级展望等'
		},
		getBondRatingChanges: {
			name: '获取债券评级变动',
			description: '获取债券评级调整记录，包括上调、下调、展望调整等'
		},
		getBondDefaultEvents: {
			name: '获取债券违约事件',
			description: '获取债券违约事件，包括技术性违约、实质性违约、兑付延迟等'
		},
		getBondRepoRates: {
			name: '获取回购利率',
			description: '获取债券质押式回购利率，包括隔夜、7天、14天、28天等期限'
		},
		getBondDurationConvexity: {
			name: '获取久期凸性',
			description: '计算债券的麦考利久期、修正久期、凸性等风险指标'
		},
		getConversionPremiumHistory: {
			name: '获取转股溢价历史',
			description: '获取可转债转股溢价率历史数据，分析转债投资价值'
		},
		getShiborRate: {
			name: '获取Shibor利率',
			description: '获取Shibor利率数据，包括隔夜、1周、2周、1月、3月、6月、9月、1年等期限'
		},
		getLPRRate: {
			name: '获取LPR利率',
			description: '获取LPR(贷款市场报价利率)，包括1年期和5年期以上LPR'
		},
		// 商品详情工具
		getAgricultureInventory: {
			name: '获取农产品库存',
			description: '获取主要农产品库存数据，包括大豆、玉米、小麦、棉花等品种的库存水平'
		},
		getAgricultureProduction: {
			name: '获取农产品产量',
			description: '获取主要农产品产量数据，按省份、品种统计年度产量'
		},
		getMetalsInventory: {
			name: '获取金属库存',
			description: '获取有色金属库存数据，包括LME、SHFE交易所的铜铝锌铅镍锡等库存'
		},
		getMetalsProduction: {
			name: '获取金属产量',
			description: '获取有色金属产量数据，包括全国及分省统计'
		},
		getMetalsTradeData: {
			name: '获取金属贸易数据',
			description: '获取有色金属进出口数据，包括铜、铝等主要品种的进出口量'
		},
		getOilInventory: {
			name: '获取原油库存',
			description: '获取原油库存数据，包括美国EIA商业原油库存、战略石油储备、库欣库存等'
		},
		getRefinedOilInventory: {
			name: '获取成品油库存',
			description: '获取成品油库存数据，包括汽油、柴油、煤油、燃料油等'
		},
		getNaturalGasInventory: {
			name: '获取天然气库存',
			description: '获取天然气库存数据，包括美国EIA天然气地下储备'
		},
		getCoalInventory: {
			name: '获取煤炭库存',
			description: '获取煤炭库存数据，包括秦皇岛等主要港口库存、重点电厂库存'
		},
		getSteelInventory: {
			name: '获取钢材库存',
			description: '获取钢材社会库存数据，包括螺纹钢、热卷、冷板等主要品种'
		},
		getChemicalInventory: {
			name: '获取化工品库存',
			description: '获取化工品库存数据，包括PTA、乙二醇、甲醇、PVC、PP等'
		},
		getRubberInventory: {
			name: '获取橡胶库存',
			description: '获取橡胶库存数据，包括天然橡胶和合成橡胶的交易所及社会库存'
		},
		getSugarInventory: {
			name: '获取白糖库存',
			description: '获取白糖库存数据，包括工业库存和港口库存'
		},
		getOilseedInventory: {
			name: '获取油料库存',
			description: '获取油脂油料库存，包括豆油、棕榈油、菜油、大豆、菜籽等'
		},
		getGlassData: {
			name: '获取玻璃数据',
			description: '获取玻璃产量和库存数据，包括浮法玻璃产能利用率、厂家库存、贸易商库存'
		},
		getCementProduction: {
			name: '获取水泥产量',
			description: '获取水泥产量数据，按省份和时间统计'
		},
		// 外汇补充工具
		getMajorFXPairs: {
			name: '获取主要货币对',
			description: '获取主要外汇货币对的实时行情汇总'
		},
		getFXPairQuote: {
			name: '获取货币对报价',
			description: '获取外汇货币对的详细报价，包括买卖价差、点值等信息'
		},
		getFXSwapQuote: {
			name: '获取外汇掉期',
			description: '获取外汇掉期(Swap)报价数据，包括远期点数和掉期价格'
		},
		// 加密货币市场工具
		getBitcoinPriceTrend: {
			name: '比特币价格走势',
			description: '获取比特币(BTC)价格走势和统计数据'
		},
		getCryptoMarketCapRanking: {
			name: '加密货币市值排行',
			description: '获取加密货币市值排行榜(Top 100)'
		},
		getCryptoExchangeRanking: {
			name: '交易所排行',
			description: '获取加密货币交易所24小时交易量排行'
		},
		getDeFiTVL: {
			name: 'DeFi锁仓价值',
			description: '获取DeFi(去中心化金融)总锁仓价值(TVL)数据'
		},
		getNFTMarketData: {
			name: 'NFT市场数据',
			description: '获取NFT市场交易数据和热门系列排行'
		},
		// 宏观补充工具
		getMacroCPI: {
			name: '获取CPI',
			description: '获取中国居民消费价格指数(CPI)数据'
		},
		getMacroPPI: {
			name: '获取PPI',
			description: '获取中国工业生产者出厂价格指数(PPI)数据'
		},
		getMacroGDP: {
			name: '获取GDP',
			description: '获取国内生产总值(GDP)数据'
		},
		// 股票财务分析深度工具
		getIncomeStatementDetail: {
			name: '获取详细利润表',
			description: '获取详细利润表，包含营业收入、营业成本、销售/管理/财务费用、研发费用、净利润、每股收益及同比变化。对盈利能力分析至关重要。'
		},
		getBalanceSheetDetail: {
			name: '获取详细资产负债表',
			description: '获取详细资产负债表，包含资产、负债、股东权益、流动比率、资产负债率及结构分析。对偿债能力评估至关重要。'
		},
		getCashFlowDetail: {
			name: '获取详细现金流量表',
			description: '获取详细现金流量表，显示经营、投资和筹资活动现金流。经营现金流质量是企业健康的关键指标。'
		},
		getFinancialIndicators: {
			name: '获取综合财务指标',
			description: '获取综合财务指标，包括盈利能力(ROE、ROA、净利率)、偿债能力(负债比率)、运营效率(周转率)和成长性指标。一站式财务健康检查。'
		},
		getRoeDupont: {
			name: '获取ROE杜邦分析',
			description: '获取ROE杜邦分析，将ROE分解为净利率×资产周转率×权益乘数。识别利润驱动因素和杠杆影响。核心估值指标。'
		},
		getProfitabilityMetrics: {
			name: '获取盈利能力指标',
			description: '获取盈利能力指标，包括毛利率、营业利润率、净利率、ROE、ROA、ROIC及历史趋势。高且稳定的利润率表明竞争优势。'
		},
		getOperatingEfficiency: {
			name: '获取营运效率比率',
			description: '获取营运效率比率，包括存货周转率、应收账款周转率、应付账款周转率、现金循环周期。周转率越高=资本效率越好。'
		},
		getSolvencyRatios: {
			name: '获取偿债能力比率',
			description: '获取偿债能力比率，包括流动比率、速动比率、现金比率、资产负债率、利息保障倍数。衡量偿还短期和长期债务的能力。'
		},
		getGrowthMetrics: {
			name: '获取成长性指标',
			description: '获取成长性指标，包括营收增长率、净利润增长率、每股收益增长率、资产增长率。持续高增长获得估值溢价。'
		},
		getValuationMultiples: {
			name: '获取估值倍数',
			description: '获取估值倍数，包括市盈率、市净率、市销率、EV/EBITDA及行业对比和历史百分位。低倍数可能表明低估。'
		},
		getPePbBand: {
			name: '获取PE/PB估值区间',
			description: '获取历史PE/PB估值区间分析，显示随时间变化的估值范围。低于历史平均PE/PB可能意味着机会。'
		},
		getDividendAnalysis: {
			name: '获取股息分析',
			description: '获取股息分析，包括股息率、派息比率、股息增长率和派息历史。持续分红表明稳定现金流。'
		},
		getFreeCashFlow: {
			name: '获取自由现金流',
			description: '获取自由现金流(FCF)分析 = 经营现金流 - 资本支出。FCF是可用于分红、回购、还债的现金。巴菲特最喜欢的指标。'
		},
		getEarningsQuality: {
			name: '获取盈利质量',
			description: '获取盈利质量分析，对比净利润与经营现金流。如果现金流<利润，盈利质量可能较低(激进会计)。高质量=利润有现金支撑。'
		},
		getAssetQuality: {
			name: '获取资产质量',
			description: '获取资产质量分析，检查应收账款账龄、存货账龄、商誉、无形资产。高质量资产具有流动性和可变现性。警惕过多商誉。'
		},
		getRevenueBreakdown: {
			name: '获取收入分解',
			description: '获取按产品、地区、客户细分的收入分解。显示业务多元化和增长驱动力。如果某一产品/地区占主导则存在集中度风险。'
		},
		getCostStructure: {
			name: '获取成本结构',
			description: '获取成本结构分析，显示营业成本、营业费用、销售管理费用、研发费用占收入的百分比。识别成本控制效果和经营杠杆潜力。'
		},
		getRdInvestment: {
			name: '获取研发投入',
			description: '获取研发投入和研发强度(研发/收入)。高研发表明创新导向，对科技和制药行业很重要。推动长期竞争力。'
		},
		getCapexAnalysis: {
			name: '获取资本支出分析',
			description: '获取资本支出(CAPEX)分析，显示固定资产投资、增长型vs维护型资本支出。高资本支出可能表明增长阶段或资本密集型商业模式。'
		},
		getTaxRateAnalysis: {
			name: '获取税率分析',
			description: '获取实际税率分析，对比法定税率与实际税率。较低的实际税率提升净利润。突然变化可能表明税收优惠到期。'
		},
		getPeerComparison: {
			name: '获取同业对比',
			description: '获取同业对比，将财务指标与行业竞争对手进行基准比较。识别相对优势/劣势和估值差距。'
		},
		getFinancialForecast: {
			name: '获取财务预测',
			description: '获取财务预测和分析师一致预期，包括每股收益、营收、净利润。显示市场预期。超预期推动股价上涨。'
		},
		getEarningsSurprise: {
			name: '获取业绩超预期',
			description: '获取业绩超预期历史，显示实际结果与预期的对比。持续正向超预期=管理层低承诺高交付。'
		},
		getQuarterlyEarningsTrend: {
			name: '获取季度业绩趋势',
			description: '获取季度业绩趋势，显示环比和同比增长。识别业务动能加速/减速。对成长股至关重要。'
		},
		getSegmentPerformance: {
			name: '获取业务板块表现',
			description: '获取业务板块表现，按部门显示收入、利润、利润率。识别哪些业务单元推动增长vs拖累业绩。'
		},
		getMacroPMI: {
			name: '获取PMI',
			description: '获取中国制造业采购经理指数(PMI)数据'
		},
		getMacroMoneySupply: {
			name: '获取货币供应量',
			description: '获取中国货币供应量M0/M1/M2数据'
		},
		getMacroTrade: {
			name: '获取贸易数据',
			description: '获取中国进出口贸易数据和贸易差额'
		},
		getMacroSocialFinancing: {
			name: '获取社融数据',
			description: '获取中国社会融资规模数据'
		},
		getMacroForexReserve: {
			name: '获取外汇储备',
			description: '获取中国外汇储备数据'
		},
		// 另类数据工具
		getAnalystConsensus: {
			name: '分析师共识',
			description: '获取分析师共识评级，显示买入/持有/卖出分布、平均目标价、价格区间'
		},
		getAnalystRatingChanges: {
			name: '评级变动',
			description: '获取分析师评级变动(上调、下调、首次覆盖)及目标价修正'
		},
		getInsiderTradingSentiment: {
			name: '内部交易情绪',
			description: '汇总高管/董事交易，评估内部人士信心'
		},
		getFundHoldingsSentiment: {
			name: '基金持仓情绪',
			description: '显示有多少基金增仓/减仓，持仓集中度趋势'
		},
		getInstitutionalResearchCalendar: {
			name: '机构调研日历',
			description: '显示即将到来的公司访问、路演、调研活动'
		},
		getMediaCoverageAnalysis: {
			name: '媒体报道分析',
			description: '分析哪些媒体最多报道某股票，报道基调(正面/负面/中性)'
		},
		getSocialMediaBuzz: {
			name: '社交媒体热度',
			description: '获取股票论坛(东方财富股吧、雪球)的讨论量和情绪评分'
		},
		getNewsHeatRanking: {
			name: '新闻热度排行',
			description: '显示财经新闻中被提及最多的股票及热度评分'
		},
		getStockSentimentIndex: {
			name: '股票情绪指数',
			description: '汇总新闻、社交媒体、分析师观点。返回情绪评分(-100到100)'
		},
		getRegulatoryFilingsSentiment: {
			name: '监管文件情绪',
			description: '对监管文件进行情绪分析，显示披露正面/负面趋势'
		},
		getResearchReportStats: {
			name: '研报统计',
			description: '获取研报统计，包括报告数量、券商覆盖度、研究主题'
		},
		getShortInterestTrends: {
			name: '融券趋势',
			description: '获取融券余额变化趋势，显示卖空比例变化'
		},
};
